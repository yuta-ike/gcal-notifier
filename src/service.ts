import { CalendarClient, dateRange, todayRange } from "./calendar.js"
import { Config } from "./config.js"
import { parseNotification } from "./notification.js"
import { formatEvent, findChannelId, postMessage } from "./slack.js"
import type { WebClient } from "@slack/web-api"

export async function notifyToday(
  config: Config,
  calendar: CalendarClient,
  slack: WebClient,
): Promise<number> {
  const range = todayRange(config.TIME_ZONE)
  return notifyForRange(config, calendar, slack, "today", range)
}

export async function notifyOnDate(
  config: Config,
  calendar: CalendarClient,
  slack: WebClient,
  date: string,
): Promise<number> {
  const range = dateRange(config.TIME_ZONE, date)
  return notifyForRange(config, calendar, slack, date, range)
}

async function notifyForRange(
  config: Config,
  calendar: CalendarClient,
  slack: WebClient,
  targetDate: string,
  range: { timeMin: string; timeMax: string },
): Promise<number> {
  const startedAt = Date.now()
  console.info("Notification started", {
    targetDate,
    timeMin: range.timeMin,
    timeMax: range.timeMax,
  })

  try {
    const events = await calendar.listEvents(range)
    console.info("Calendar events fetched", {
      targetDate,
      count: events.length,
    })

    const sent = await notifyEvents(config, slack, events)
    console.info("Notification completed", {
      targetDate,
      scanned: events.length,
      sent,
      durationMs: Date.now() - startedAt,
    })
    return sent
  } catch (error) {
    console.error("Notification failed", {
      targetDate,
      durationMs: Date.now() - startedAt,
      error: errorMessage(error),
    })
    throw error
  }
}

async function notifyEvents(
  config: Config,
  slack: WebClient,
  events: Awaited<ReturnType<CalendarClient["listEvents"]>>,
): Promise<number> {
  let sent = 0
  for (const [index, event] of events.entries()) {
    const eventId = event.id ?? `unknown-${index + 1}`
    const summary = event.summary?.trim() || "(untitled)"
    console.info("Calendar event evaluating", { eventId, summary })

    const notification = parseNotification(event.description)
    if (notification == null) {
      console.info("Calendar event skipped", {
        eventId,
        reason: "notification_marker_not_found",
      })
      continue
    }

    console.info("Calendar event matched", {
      eventId,
      channelName: notification.channelName,
      mentionCount: notification.mentions.length,
    })

    try {
      const channelId = await findChannelId(slack, notification.channelName)
      console.info("Slack channel resolved", {
        eventId,
        channelName: notification.channelName,
        channelId,
      })

      await postMessage(
        slack,
        channelId,
        formatEvent(event, notification.mentions, config.TIME_ZONE),
      )
      sent += 1
      console.info("Slack notification sent", { eventId, channelId })
    } catch (error) {
      console.error("Slack notification failed", {
        eventId,
        channelName: notification.channelName,
        error: errorMessage(error),
      })
      throw error
    }
  }
  return sent
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
