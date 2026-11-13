import assert from "node:assert/strict"
import test from "node:test"
import { WebClient } from "@slack/web-api"
import { createApp } from "./app.js"
import { CalendarEvent, CalendarClient } from "./calendar.js"
import { Config } from "./config.js"

const config: Config = {
  GOOGLE_CALENDAR_ID: "primary",
  SLACK_BOT_TOKEN: "xoxb-test-token",
  PORT: 8080,
  TIME_ZONE: "Asia/Tokyo",
}

class FakeCalendar implements CalendarClient {
  constructor(private readonly events: CalendarEvent[]) {}

  async listEvents() {
    return this.events
  }
}

function createFakeSlack() {
  const messages: { channel: string; text: string }[] = []
  const client = Object.assign(new WebClient("xoxb-test-token"), {
    conversations: {
      list: async () => ({
        ok: true as const,
        channels: [
          { id: "C_ENGINEERING", name: "engineering" },
          { id: "C_GENERAL", name: "general" },
        ],
      }),
    },
    chat: {
      postMessage: async ({
        channel,
        text,
      }: {
        channel: string
        text: string
      }) => {
        messages.push({ channel, text })
      },
    },
  })
  return { slack: client, messages }
}

test("POST /notify sends matching calendar events to Slack", async () => {
  const calendar = new FakeCalendar([
    {
      id: "matching",
      summary: "Sprint planning",
      description: "notify#engineering{@alice,@Bob}",
      attendees: [{ email: "TEAM@example.com" }],
      // The UTC instant is 2026-11-12 01:00Z; Slack must display JST.
      start: { dateTime: "2026-11-12T01:00:00Z" },
      end: { dateTime: "2026-11-12T02:00:00Z" },
      htmlLink: "https://calendar.google.com/event/matching",
    },
    {
      id: "other-attendee",
      summary: "External team event",
      description: "notify#general",
      attendees: [{ email: "other@example.com" }],
      start: { dateTime: "2026-11-12T03:00:00Z" },
    },
    {
      id: "not-marked",
      summary: "Team event without notification",
      attendees: [{ email: "team@example.com" }],
    },
  ])
  const fakeSlack = createFakeSlack()
  const app = createApp(config, calendar, fakeSlack.slack)

  const response = await app.request("/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, sent: 2 })
  assert.deepEqual(fakeSlack.messages, [
    {
      channel: "C_ENGINEERING",
      text: "@alice @Bob\nSprint planning は 2026/11/12 10:00 開始です。",
    },
    {
      channel: "C_GENERAL",
      text: "External team event は 2026/11/12 12:00 開始です。",
    },
  ])
})

test("POST /notify validates the JSON request with Zod", async () => {
  const app = createApp(config, new FakeCalendar([]), createFakeSlack().slack)

  const response = await app.request("/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "[]",
  })

  assert.equal(response.status, 400)
})

test("POST /notify validates the requested calendar date", async () => {
  const app = createApp(config, new FakeCalendar([]), createFakeSlack().slack)

  const response = await app.request("/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: "2026-02-30" }),
  })

  assert.equal(response.status, 400)
})

test("adds security headers to responses", async () => {
  const app = createApp(config, new FakeCalendar([]), createFakeSlack().slack)

  const response = await app.request("/health")

  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN")
})
