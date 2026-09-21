import type { Db } from "mongodb"

import type { AppConfig } from "../config.js"
import type { GoogleCalendarEvent } from "../domain/model/calendar-event.js"
import {
  notificationDirectiveKey,
  parseNotificationDirectives,
} from "../domain/model/notification-directive.js"
import type { NotificationSlot } from "../domain/model/notification-slot.js"
import { evaluateReminderEligibility } from "../domain/usecase/event-timing.js"
import { claimNotification } from "../infrastructure/db/notification-claim.js"
import { completeNotification } from "../infrastructure/db/notification-complete.js"
import { releaseNotification } from "../infrastructure/db/notification-release.js"
import type { SlackApiClientConfig } from "../libs/slack/api.js"
import { getGoogleServiceAccountAccessToken } from "../libs/google/api.js"
import { listGoogleCalendarEventsForClient } from "../libs/google/calendar.js"
import { createSlackBotClient, loadSlackNotificationDirectory } from "../libs/slack/directory.js"
import { sendReminderMessage } from "../libs/slack/message.js"
import { localDateTimeToUtc, nextDate } from "../libs/time.js"
import { err, gen, tryCatchAsync, when, type Result } from "../libs/result.js"
import { promiseAllObject } from "../libs/promise.js"
import {
  resolveSlackNotificationTarget,
  type SlackNotificationTarget,
} from "../domain/model/slack-notification-target.js"
import { unique } from "../libs/unique.js"

const logCron = (kind: "skip" | "error", details: Record<string, unknown>) => {
  console.info(JSON.stringify({ source: "cron", kind: `cron_${kind}`, ...details }))
}

export type ReminderJobDependencies = {
  config: AppConfig
  db: Db
}

const releaseClaimOnError = async (
  error: Error,
  claimKey: string,
  db: Db,
): Promise<Result<never>> => {
  const released = await tryCatchAsync(() => releaseNotification(db, claimKey))
  return released.ok ? err(error) : err(released.err)
}

const sendReminder = (
  event: GoogleCalendarEvent,
  target: SlackNotificationTarget,
  date: string,
  timing: NotificationSlot,
  client: SlackApiClientConfig,
  db: Db,
) =>
  gen(async function* () {
    const claimKey = `${event.id}:${date}:${timing}:${target.key}`
    const claimed = yield* await claimNotification(db, claimKey)
    if (!claimed) {
      return "skipped" as const
    }
    const delivery = await gen(async function* () {
      yield* await tryCatchAsync(() => sendReminderMessage(client, event, target))
      yield* await tryCatchAsync(() => completeNotification(db, claimKey))
      return "sent" as const
    })

    return when(delivery, {
      ok: (data) => data,
      err: (err) => releaseClaimOnError(err, claimKey, db),
    })
  })

type ReminderJobResult = {
  sent: number
  skipped: number
  errors: string[]
}

const processReminderDirective = async (
  event: GoogleCalendarEvent,
  directive: ReturnType<typeof parseNotificationDirectives>[number],
  {
    date,
    timing,
    slackDirectory,
    slackClient,
    db,
  }: {
    date: string
    timing: NotificationSlot
    slackDirectory: Awaited<ReturnType<typeof loadSlackNotificationDirectory>>
    slackClient: SlackApiClientConfig
    db: Db
  },
): Promise<ReminderJobResult> => {
  const target = resolveSlackNotificationTarget(slackDirectory, directive)
  if (target == null) {
    logCron("error", {
      date,
      timing,
      eventId: event.id,
      summary: event.summary,
      reason: "slack_target_not_found",
      channel: directive.channel,
      mentions: directive.mentions,
    })
    return {
      sent: 0,
      skipped: 0,
      errors: [`${event.id}: Slack通知先を解決できません (${directive.channel})`],
    }
  }

  const delivery = await sendReminder(event, target, date, timing, slackClient, db)
  if (!delivery.ok) {
    logCron("error", {
      date,
      timing,
      eventId: event.id,
      summary: event.summary,
      reason: "slack_send_failed",
      error: delivery.err.message,
      target: target.key,
    })
    return { sent: 0, skipped: 0, errors: [`${event.id}: Slack送信失敗`] }
  }

  if (delivery.data === "sent") {
    return { sent: 1, skipped: 0, errors: [] }
  }

  logCron("skip", {
    date,
    timing,
    eventId: event.id,
    summary: event.summary,
    reason: "notification_already_claimed",
    target: target.key,
  })
  return { sent: 0, skipped: 1, errors: [] }
}

const processReminderEvent = async (
  event: GoogleCalendarEvent,
  {
    now,
    timing,
    date,
    slackDirectory,
    slackClient,
    db,
  }: {
    now: Date
    timing: NotificationSlot
    date: string
    slackDirectory: Awaited<ReturnType<typeof loadSlackNotificationDirectory>>
    slackClient: SlackApiClientConfig
    db: Db
  },
): Promise<ReminderJobResult> => {
  if (event.status === "cancelled") {
    logCron("skip", {
      date,
      timing,
      eventId: event.id,
      summary: event.summary,
      reason: "cancelled_event",
    })
    return { sent: 0, skipped: 0, errors: [] }
  }

  const eligibility = evaluateReminderEligibility(event, now)
  if (!eligibility.eligible) {
    logCron("skip", {
      date,
      timing,
      eventId: event.id,
      summary: event.summary,
      reason: eligibility.reason,
    })
    return { sent: 0, skipped: 0, errors: [] }
  }

  const directives = parseNotificationDirectives(event.description)
  if (directives.length === 0) {
    logCron("skip", {
      date,
      timing,
      eventId: event.id,
      summary: event.summary,
      reason: "no_notification_directive",
    })
    return { sent: 0, skipped: 0, errors: [] }
  }

  const uniqified = unique(directives, (d) => notificationDirectiveKey(d))
  const results = await Promise.all(
    uniqified.map((directive) =>
      processReminderDirective(event, directive, {
        timing,
        date,
        slackDirectory,
        slackClient,
        db,
      }),
    ),
  )

  const statistics = { sent: 0, skipped: 0, errors: [] as string[] }
  for (const result of results) {
    statistics.sent += result.sent
    statistics.skipped += result.skipped
    statistics.errors.push(...result.errors)
  }

  return statistics
}

export const runReminderJob = async (
  { config, db }: ReminderJobDependencies,
  now: Date,
  timing: NotificationSlot,
  date: string,
) => {
  const slackClient = createSlackBotClient(config.slack.botToken)
  if (slackClient == null) {
    throw new Error("SLACK_BOT_TOKEN is required")
  }

  const googleToken = await getGoogleServiceAccountAccessToken()
  const googleClient = { accessToken: googleToken.access_token }

  const { slackDirectory, events } = await promiseAllObject({
    slackDirectory: loadSlackNotificationDirectory(slackClient),
    events: listGoogleCalendarEventsForClient(googleClient, config.notificationCalendarId, {
      timeMin: localDateTimeToUtc(date, 0).toISOString(),
      timeMax: localDateTimeToUtc(nextDate(date), 0).toISOString(),
    }),
  })

  const results = await Promise.all(
    events.map((event) =>
      processReminderEvent(event, {
        now,
        timing,
        date,
        slackDirectory,
        slackClient,
        db,
      }),
    ),
  )

  const statistics = { sent: 0, skipped: 0, errors: [] as string[] }
  for (const result of results) {
    statistics.sent += result.sent
    statistics.skipped += result.skipped
    statistics.errors.push(...result.errors)
  }

  console.info(
    JSON.stringify({
      source: "cron",
      kind: "cron_result",
      date,
      timing,
      eventCount: events.length,
      ...statistics,
    }),
  )

  return statistics
}
