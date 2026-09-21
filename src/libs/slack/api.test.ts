import test from "node:test"
import assert from "node:assert/strict"

import type { FetchFunction } from "../api-client.js"
import { listSlackConversationMembers, listSlackUsers } from "./api.js"

test("loads Slack channel members and users with the expected parameters", async () => {
  const requests: URL[] = []
  const fetcher: FetchFunction = async (input) => {
    const url = new URL(String(input))
    requests.push(url)
    if (url.pathname.endsWith("/conversations.members")) {
      return Response.json({
        ok: true,
        members: ["U123"],
        response_metadata: { next_cursor: "" },
      })
    }
    return Response.json({ ok: true, members: [{ id: "U123", name: "alice" }] })
  }
  const client = { accessToken: "token", fetch: fetcher }

  const members = await listSlackConversationMembers(client, {
    channel: "C123",
    limit: 30,
    cursor: "cursor",
  })
  const users = await listSlackUsers(client, { limit: 30, cursor: "cursor" })

  assert.deepEqual(members.members, ["U123"])
  assert.equal(users.members?.[0]?.id, "U123")
  assert.equal(requests[0]?.searchParams.get("channel"), "C123")
  assert.equal(requests[0]?.searchParams.get("limit"), "30")
  assert.equal(requests[0]?.searchParams.get("cursor"), "cursor")
  assert.equal(requests[1]?.searchParams.get("limit"), "30")
  assert.equal(requests[1]?.searchParams.get("cursor"), "cursor")
})

test("rejects malformed successful provider responses", async () => {
  const fetcher: FetchFunction = async () =>
    Response.json({ ok: true, members: [{ name: "missing-id" }] })

  await assert.rejects(
    () => listSlackUsers({ accessToken: "token", fetch: fetcher }),
    /INVALID_RESPONSE/,
  )
})
