import assert from "node:assert/strict"
import test from "node:test"
import { formatEvent } from "./slack.js"

test("formatEvent displays Slack event times in the configured time zone", () => {
  assert.equal(
    formatEvent(
      {
        summary: "Sprint planning",
        start: { dateTime: "2026-11-12T01:00:00Z" },
      },
      [],
      "Asia/Tokyo",
    ),
    "Sprint planning は 2026/11/12 10:00 開始です。",
  )
})

test("formatEvent supports all-day events", () => {
  assert.equal(
    formatEvent(
      { summary: "Holiday", start: { date: "2026-11-12" } },
      [],
      "Asia/Tokyo",
    ),
    "Holiday は 2026/11/12 00:00 開始です。",
  )
})
