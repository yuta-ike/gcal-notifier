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

for (const channelName of ["開発チーム", "engineering-team", "開発-team"]) {
  test(`parses channel "${channelName}" with mentions`, () => {
    assert.deepEqual(parseNotification(`notify#${channelName}{@alice,@bob}`), {
      channelName,
      mentions: ["@alice", "@bob"],
    })
  })

  test(`parses channel "${channelName}" without mentions`, () => {
    assert.deepEqual(parseNotification(`notify#${channelName}`), {
      channelName,
      mentions: [],
    })
  })

  test(`parses channel "${channelName}" with body`, () => {
    assert.deepEqual(parseNotification(`議事録 notify#${channelName} 定例`), {
      channelName,
      mentions: [],
    })
  })
}

test("ignores descriptions without the marker", () => {
  assert.equal(parseNotification("ordinary event"), null)
})
