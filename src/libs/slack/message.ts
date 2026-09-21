import type { GoogleCalendarEvent } from "../../domain/model/calendar-event.js"
import type { SlackApiClientConfig, SlackBlock } from "./api.js"
import { postSlackMessage } from "./api.js"
import type { SlackNotificationTarget } from "../../domain/model/slack-notification-target.js"
import { textFromDescriptionHtml } from "../../domain/model/notification-directive.js"
import { formatEventTime } from "../time.js"
import { tryCatch } from "../result.js"

const CARD_BODY_MAX_LENGTH = 200
const MEETING_URL_PATTERN =
  /https?:\/\/(?:[a-z0-9-]+\.)*(?:zoom\.us|meet\.google\.com)\/[^\s<>"']+/gi

type MeetingLink = {
  provider: "Zoom" | "Google Meet"
  url: string
}

const truncate = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`

const extractMeetingLinks = (event: GoogleCalendarEvent): MeetingLink[] => {
  const links = new Map<string, MeetingLink>()
  const addLink = (url: string, provider?: MeetingLink["provider"]): void => {
    const normalizedUrl = url.replace(/[.,!?;:)\]]+$/, "")
    if (links.has(normalizedUrl)) {
      return
    }
    const parsedUrl = tryCatch(() => new URL(normalizedUrl))
    if (!parsedUrl.ok) {
      return
    }
    const hostname = parsedUrl.data.hostname
    if (!/(?:^|\.)meet\.google\.com$/.test(hostname) && !/(?:^|\.)zoom\.us$/.test(hostname)) {
      return
    }
    links.set(normalizedUrl, {
      provider: provider ?? (normalizedUrl.includes("meet.google.com") ? "Google Meet" : "Zoom"),
      url: normalizedUrl,
    })
  }

  for (const entryPoint of event.conferenceData?.entryPoints ?? []) {
    if (entryPoint.entryPointType !== "video" || entryPoint.uri == null) {
      continue
    }
    addLink(entryPoint.uri, "Google Meet")
  }

  for (const source of [event.description, event.location]) {
    if (source == null) {
      continue
    }
    for (const match of source.matchAll(MEETING_URL_PATTERN)) {
      const url = match[0]
      if (url == null) {
        continue
      }
      addLink(url)
    }
  }
  return [...links.values()]
}

const buildReminderCard = (
  event: GoogleCalendarEvent,
  target: SlackNotificationTarget,
): SlackBlock[] => {
  const description = textFromDescriptionHtml(event.description).trim()
  const location = event.location?.trim() ?? ""
  const availableMeetingLinks = extractMeetingLinks(event)
  const meetingLinks = ["Zoom", "Google Meet"]
    .map((provider) => availableMeetingLinks.find((link) => link.provider === provider))
    .filter((link): link is MeetingLink => link != null)
  const actions = [
    {
      type: "button" as const,
      text: {
        type: "plain_text" as const,
        text: "Googleカレンダーを開く",
        emoji: false,
      },
      style: "primary" as const,
      action_id: "open_calendar_event",
      url: event.htmlLink,
    },
    ...meetingLinks.map(({ provider, url }) => ({
      type: "button" as const,
      text: {
        type: "plain_text" as const,
        text: `${provider}を開く`,
        emoji: false,
      },
      style: "primary" as const,
      action_id: provider === "Zoom" ? "open_zoom_link" : "open_google_meet_link",
      url,
    })),
  ].filter((action) => action != null)
  const body = description === "" ? "（詳細なし）" : description

  return [
    ...(target.mentionText === ""
      ? []
      : [
          {
            type: "section" as const,
            text: {
              type: "mrkdwn" as const,
              text: target.mentionText,
              verbatim: false,
            },
          },
        ]),
    {
      type: "card" as const,
      icon: {
        type: "image" as const,
        image_url: "http://yuta-ike.github.io/yuta-ike/gcal-notifier/gcal-notifier-icon.png",
        alt_text: "GCal Notifier",
      },
      title: {
        type: "mrkdwn" as const,
        text: truncate(event.summary, 150),
        verbatim: false,
      },
      subtitle: {
        type: "mrkdwn" as const,
        text: formatEventTime(event),
        verbatim: false,
      },
      body:
        body.length === 0
          ? undefined
          : {
              type: "mrkdwn" as const,
              text: truncate(body, CARD_BODY_MAX_LENGTH),
              verbatim: false,
            },
      subtext:
        location.length === 0
          ? undefined
          : {
              type: "mrkdwn" as const,
              text: truncate(location, CARD_BODY_MAX_LENGTH),
              verbatim: false,
            },
      actions: actions.length === 0 ? undefined : actions,
    },
  ]
}

export const sendReminderMessage = async (
  client: SlackApiClientConfig,
  event: GoogleCalendarEvent,
  target: SlackNotificationTarget,
) => {
  await postSlackMessage(client, {
    channel: target.channelId,
    blocks: [...buildReminderCard(event, target)],
    mrkdwn: true,
    username: "カレンダー通知",
  })
}
