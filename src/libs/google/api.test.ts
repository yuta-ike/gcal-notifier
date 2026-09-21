import test from "node:test"
import assert from "node:assert/strict"

import type { FetchFunction } from "../api-client.js"
import { getGoogleServiceAccountAccessToken, listGoogleCalendarEvents } from "./api.js"

test("gets a Google access token from the Cloud Run metadata server", async () => {
  let request: { input: string | URL; init?: RequestInit } | undefined
  const fetcher: FetchFunction = async (input, init) => {
    request = { input, init }
    return Response.json({ access_token: "service-token", expires_in: 3600 })
  }

  const token = await getGoogleServiceAccountAccessToken(fetcher)

  assert.equal(token.access_token, "service-token")
  assert.equal(
    request?.input.toString(),
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
  )
  const headers = request?.init?.headers as Record<string, string> | undefined
  assert.equal(headers?.["Metadata-Flavor"], "Google")
})

test("preserves Google Meet conference data from calendar events", async () => {
  const fetcher: FetchFunction = async () =>
    Response.json({
      items: [
        {
          id: "event-1",
          summary: "チームミーティング",
          htmlLink: "https://calendar.google.com/calendar/event?eid=event-1",
          start: { dateTime: "2026-10-01T10:00:00+09:00" },
          end: { dateTime: "2026-10-01T11:00:00+09:00" },
          conferenceData: {
            entryPoints: [
              { entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" },
              { entryPointType: "phone", uri: "tel:+1-xxx-xxx-xxxx" },
            ],
          },
        },
      ],
    })

  const response = await listGoogleCalendarEvents(
    { accessToken: "token", fetch: fetcher },
    "calendar",
  )

  assert.equal(
    response.items?.[0]?.conferenceData?.entryPoints?.[0]?.uri,
    "https://meet.google.com/abc-defg-hij",
  )
  assert.equal(response.items?.[0]?.conferenceData?.entryPoints?.[1]?.entryPointType, "phone")
})
