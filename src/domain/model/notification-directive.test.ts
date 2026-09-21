import test from "node:test"
import assert from "node:assert/strict"

import { parseNotificationDirectives } from "./notification-directive.js"

test("parses notification directives from an event description", () => {
  assert.deepEqual(
    parseNotificationDirectives("議題\nnotify#release-alerts{@alice, @platform}\nその他のメモ"),
    [{ channel: "release-alerts", mentions: ["alice", "platform"] }],
  )
})

test("parses multiple directives and allows optional mentions", () => {
  assert.deepEqual(parseNotificationDirectives("notify#general notify#ops{@here}"), [
    { channel: "general", mentions: [] },
    { channel: "ops", mentions: ["here"] },
  ])
})

test("parses directives from an HTML description", () => {
  assert.deepEqual(parseNotificationDirectives("<p>notify#general{@alice}</p>"), [
    { channel: "general", mentions: ["alice"] },
  ])
})

test("ignores malformed directives", () => {
  assert.deepEqual(parseNotificationDirectives("notify#general{alice} notify#ops{@}"), [])
})
