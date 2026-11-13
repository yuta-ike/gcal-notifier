import assert from "node:assert/strict"
import test from "node:test"
import { parseNotification } from "./notification.js"

test("parses channel and mentions", () => {
  assert.deepEqual(parseNotification("notify#engineering{@alice,@bob}"), {
    channelName: "engineering",
    mentions: ["@alice", "@bob"],
  })
})

test("parses a notification without mentions", () => {
  assert.deepEqual(parseNotification("notify#general"), {
    channelName: "general",
    mentions: [],
  })
})

test("ignores descriptions without the marker", () => {
  assert.equal(parseNotification("ordinary event"), null)
})
