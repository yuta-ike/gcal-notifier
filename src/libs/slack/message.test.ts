import test from "node:test"
import assert from "node:assert/strict"

import type { GoogleCalendarEvent } from "../../domain/model/calendar-event.js"
import type { SlackNotificationTarget } from "../../domain/model/slack-notification-target.js"
import type { FetchFunction } from "../api-client.js"
import { sendReminderMessage } from "./message.js"

test("includes calendar event details in a Slack reminder", async () => {
  let requestBody: Record<string, unknown> | undefined
  const fetcher: FetchFunction = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return Response.json({ ok: true })
  }
  const event: GoogleCalendarEvent = {
    id: "event-1",
    summary: "リリース会議",
    description: "<p>本番リリースの確認</p>",
    location: "会議室A",
    htmlLink: "https://calendar.google.com/event-1",
    start: { dateTime: "2026-09-20T10:00:00+09:00" },
    end: { dateTime: "2026-09-20T11:00:00+09:00" },
  }
  const target: SlackNotificationTarget = {
    key: "channel:C123",
    channelId: "C123",
    mentionText: "<!channel>",
  }

  await sendReminderMessage({ accessToken: "token", fetch: fetcher }, event, target)

  assert.equal(
    requestBody?.text,
    "<!channel>\n*リリース会議*\n2026/09/20 10:00 - 2026/09/20 11:00\n会議室A\n本番リリースの確認\nhttps://calendar.google.com/event-1",
  )
  assert.equal(requestBody?.channel, "C123")
  assert.equal(requestBody?.mrkdwn, true)
  assert.deepEqual(requestBody?.blocks, [
    {
      type: "card",
      icon: {
        type: "image",
        image_url: "http://yuta-ike.github.io/yuta-ike/gcal-notifier/gcal-notifier-icon.png",
        alt_text: "GCal Notifier",
      },
      title: { type: "mrkdwn", text: "リリース会議", verbatim: false },
      subtitle: {
        type: "mrkdwn",
        text: "2026/09/20 10:00 - 2026/09/20 11:00",
        verbatim: false,
      },
      body: {
        type: "mrkdwn",
        text: "本番リリースの確認",
        verbatim: false,
      },
      subtext: {
        type: "mrkdwn",
        text: "<!channel>\n会議室A",
        verbatim: false,
      },
      actions: [
        {
          type: "button",
          text: { type: "plain_text", text: "Googleカレンダーを開く", emoji: false },
          style: "primary",
          action_id: "open_calendar_event",
          url: "https://calendar.google.com/event-1",
        },
      ],
    },
  ])
})

test("adds Zoom links from text and Google Meet links from conference data", async () => {
  let requestBody: Record<string, unknown> | undefined
  const fetcher: FetchFunction = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return Response.json({ ok: true })
  }

  await sendReminderMessage(
    { accessToken: "token", fetch: fetcher },
    {
      id: "online-meeting",
      summary: "オンライン会議",
      htmlLink: "https://calendar.google.com/event/online-meeting",
      description: "Zoom: https://us02web.zoom.us/j/123456789?pwd=secret",
      conferenceData: {
        entryPoints: [
          { entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" },
          { entryPointType: "phone", uri: "tel:+1-xxx-xxx-xxxx" },
        ],
      },
      start: { dateTime: "2026-09-20T10:00:00+09:00" },
      end: { dateTime: "2026-09-20T11:00:00+09:00" },
    },
    { key: "channel:C123", channelId: "C123", mentionText: "<!channel>" },
  )

  assert.deepEqual((requestBody?.blocks as Array<Record<string, unknown>> | undefined)?.[0], {
    type: "card",
    icon: {
      type: "image",
      image_url: "http://yuta-ike.github.io/yuta-ike/gcal-notifier/gcal-notifier-icon.png",
      alt_text: "GCal Notifier",
    },
    title: { type: "mrkdwn", text: "オンライン会議", verbatim: false },
    subtitle: {
      type: "mrkdwn",
      text: "2026/09/20 10:00 - 2026/09/20 11:00",
      verbatim: false,
    },
    body: {
      type: "mrkdwn",
      text: "Zoom: https://us02web.zoom.us/j/123456789?pwd=secret",
      verbatim: false,
    },
    subtext: { type: "mrkdwn", text: "<!channel>", verbatim: false },
    actions: [
      {
        type: "button",
        text: { type: "plain_text", text: "Googleカレンダーを開く", emoji: false },
        style: "primary",
        action_id: "open_calendar_event",
        url: "https://calendar.google.com/event/online-meeting",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Zoomを開く", emoji: false },
        style: "primary",
        action_id: "open_zoom_link",
        url: "https://us02web.zoom.us/j/123456789?pwd=secret",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Google Meetを開く", emoji: false },
        style: "primary",
        action_id: "open_google_meet_link",
        url: "https://meet.google.com/abc-defg-hij",
      },
    ],
  })
})
