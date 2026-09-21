import type { Db } from "mongodb"

import type { GoogleCalendarEvent } from "../../domain/model/calendar-event.js"
import { ApiError } from "../api-client.js"
import type { GoogleOAuthConfig } from "./api.js"
import {
  getGoogleCalendar,
  listGoogleCalendarEvents,
  refreshGoogleAccessToken,
  type GoogleCalendarClientConfig,
  type GoogleCalendarListEntry,
} from "./api.js"
import { collectPages } from "../pagination.js"
import { getAccessToken } from "../../controller/access-token-get.js"
import { saveAccessToken } from "../../controller/access-token-save.js"
import { promiseAllObject } from "../promise.js"
import { tryCatchAsync } from "../result.js"

type GoogleClientDependencies = {
  googleConfig: GoogleOAuthConfig
  db: Db
}

type EventRange = {
  timeMin: string
  timeMax: string
}

const getGoogleClient = async (
  { googleConfig, db }: GoogleClientDependencies,
  userId: string,
): Promise<GoogleCalendarClientConfig | null> => {
  const current = await getAccessToken({ db }, userId, "google")
  if (current == null) {
    return null
  }

  if (
    current.stored.expiresAt == null ||
    current.stored.expiresAt > Date.now() + 60_000 ||
    current.refreshToken == null
  ) {
    return { accessToken: current.accessToken }
  }

  const refreshed = await refreshGoogleAccessToken(googleConfig, current.refreshToken)
  await saveAccessToken({ db }, userId, "google", refreshed, current)
  return { accessToken: refreshed.access_token }
}

export const getGoogleCalendarForUser = async (
  dependencies: GoogleClientDependencies,
  calendarId: string,
  userId: string,
): Promise<GoogleCalendarListEntry | null> => {
  const client = await getGoogleClient(dependencies, userId)
  if (client == null) {
    return null
  }
  return getGoogleCalendarForClient(client, calendarId)
}

export const getGoogleCalendarDataForUser = async (
  dependencies: GoogleClientDependencies,
  calendarId: string,
  userId: string,
  range: EventRange,
): Promise<{
  calendar: GoogleCalendarListEntry
  events: GoogleCalendarEvent[]
} | null> => {
  const client = await getGoogleClient(dependencies, userId)
  if (client == null) {
    return null
  }

  const { calendar, events } = await promiseAllObject({
    calendar: getGoogleCalendarForClient(client, calendarId),
    events: listGoogleCalendarEventsForClient(client, calendarId, range),
  })
  if (calendar == null) {
    throw new Error(`Google Calendar が見つかりません: ${calendarId}`)
  }
  return { calendar, events }
}

const getGoogleCalendarForClient = async (
  client: GoogleCalendarClientConfig,
  calendarId: string,
): Promise<GoogleCalendarListEntry | null> => {
  const calendar = await tryCatchAsync(() => getGoogleCalendar(client, calendarId))
  if (!calendar.ok) {
    if (calendar.err instanceof ApiError && calendar.err.status === 404) {
      return null
    }
    throw calendar.err
  }
  return calendar.data.deleted ? null : calendar.data
}

export const listGoogleCalendarEventsForClient = async (
  client: GoogleCalendarClientConfig,
  calendarId: string,
  range: EventRange,
): Promise<GoogleCalendarEvent[]> =>
  collectPages(
    (pageToken) =>
      listGoogleCalendarEvents(client, calendarId, {
        ...range,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
        ...(pageToken == null ? {} : { pageToken }),
      }),
    (page) => page.items,
    (page) => page.nextPageToken,
  )
