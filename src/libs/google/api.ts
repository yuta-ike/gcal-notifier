import { config } from "../../config.js"
import type { GoogleCalendarEventTime } from "../../domain/model/calendar-event.js"
import {
  bearerHeaders,
  formHeaders,
  pathUrl,
  requestJson,
  searchParams,
  type FetchFunction,
} from "../api-client.js"
import { z } from "zod"

const GOOGLE_OAUTH_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const GOOGLE_METADATA_TOKEN_ENDPOINT =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
const GOOGLE_CALENDAR_API_BASE_URL = "https://www.googleapis.com/calendar/v3"
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"

export type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  fetch?: FetchFunction
}

export type GoogleCalendarClientConfig = {
  accessToken: string
  fetch?: FetchFunction
}

export const buildGoogleAuthorizationUrl = (state: string): string => {
  const url = new URL(GOOGLE_OAUTH_AUTHORIZATION_ENDPOINT)
  const params = url.searchParams
  params.set("client_id", config.google.clientId)
  params.set("redirect_uri", config.google.redirectUri)
  params.set("response_type", "code")
  params.set("scope", GOOGLE_CALENDAR_SCOPE)
  params.set("access_type", "offline")
  params.set("include_granted_scopes", "true")
  params.set("state", state)
  params.set("prompt", "consent")
  return url.toString()
}

const GoogleOAuthTokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    expires_in: z.number().optional(),
    refresh_token: z.string().min(1).optional(),
  })
  .loose()

export type GoogleOAuthTokenResponse = z.infer<typeof GoogleOAuthTokenResponseSchema>

export const exchangeGoogleCode = async (code: string): Promise<GoogleOAuthTokenResponse> => {
  const body = new URLSearchParams({
    client_id: config.google.clientId,
    code,
    grant_type: "authorization_code",
  })
  body.set("client_secret", config.google.clientSecret)
  body.set("redirect_uri", config.google.redirectUri)
  return requestJson({
    operation: "OAuth code exchange",
    url: GOOGLE_OAUTH_TOKEN_ENDPOINT,
    init: { method: "POST", headers: formHeaders, body },
    schema: GoogleOAuthTokenResponseSchema,
  })
}

export const refreshGoogleAccessToken = async (
  googleConfig: GoogleOAuthConfig,
  refreshToken: string,
): Promise<GoogleOAuthTokenResponse> => {
  const body = new URLSearchParams({
    client_id: googleConfig.clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
  body.set("client_secret", googleConfig.clientSecret)
  return requestJson({
    operation: "OAuth token refresh",
    url: GOOGLE_OAUTH_TOKEN_ENDPOINT,
    init: { method: "POST", headers: formHeaders, body },
    schema: GoogleOAuthTokenResponseSchema,
    fetcher: googleConfig.fetch,
  })
}

export const getGoogleServiceAccountAccessToken = async (
  fetcher?: FetchFunction,
): Promise<GoogleOAuthTokenResponse> =>
  requestJson({
    operation: "Service account token",
    url: GOOGLE_METADATA_TOKEN_ENDPOINT,
    init: {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Metadata-Flavor": "Google",
      },
    },
    schema: GoogleOAuthTokenResponseSchema,
    fetcher,
  })

const GoogleCalendarEventDateTimeSchema: z.ZodType<GoogleCalendarEventTime> = z.union([
  z
    .object({
      date: z.string().min(1),
      dateTime: z.never().optional(),
      timeZone: z.string().optional(),
    })
    .loose(),
  z
    .object({
      date: z.never().optional(),
      dateTime: z.string().min(1),
      timeZone: z.string().optional(),
    })
    .loose(),
])

const GoogleCalendarEventConferenceEntryPointSchema = z
  .object({
    entryPointType: z.string().optional(),
    uri: z.string().optional(),
    label: z.string().optional(),
    pin: z.string().optional(),
  })
  .loose()

const GoogleCalendarEventConferenceDataSchema = z
  .object({
    entryPoints: z.array(GoogleCalendarEventConferenceEntryPointSchema).optional(),
  })
  .loose()

const googleCalendarRequest = async <T>(
  client: GoogleCalendarClientConfig,
  operation: string,
  segments: string[],
  params: URLSearchParams,
  schema: z.ZodType<T>,
): Promise<T> => {
  const url = new URL(pathUrl(GOOGLE_CALENDAR_API_BASE_URL, ...segments))
  url.search = params.toString()
  return requestJson({
    operation,
    url: url.toString(),
    init: { method: "GET", headers: bearerHeaders(client.accessToken) },
    schema,
    fetcher: client.fetch,
  })
}

const GoogleCalendarListEntrySchema = z
  .object({
    id: z.string().min(1),
    summary: z.string().min(1),
    timeZone: z.string().optional(),
    deleted: z.boolean().optional(),
    accessRole: z.string().optional(),
  })
  .loose()

export type GoogleCalendarListEntry = z.infer<typeof GoogleCalendarListEntrySchema>

export const getGoogleCalendar = (
  client: GoogleCalendarClientConfig,
  calendarId: string,
): Promise<GoogleCalendarListEntry> =>
  googleCalendarRequest(
    client,
    "CalendarList get",
    ["users", "me", "calendarList", calendarId],
    new URLSearchParams(),
    GoogleCalendarListEntrySchema,
  )

const GoogleCalendarEventSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
    htmlLink: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().optional(),
    location: z.string().optional(),
    conferenceData: GoogleCalendarEventConferenceDataSchema.optional(),
    start: GoogleCalendarEventDateTimeSchema,
    end: GoogleCalendarEventDateTimeSchema,
  })
  .loose()

const GoogleCalendarEventsResponseSchema = z
  .object({
    nextPageToken: z.string().optional(),
    items: z.array(GoogleCalendarEventSchema).optional(),
  })
  .loose()

export type GoogleCalendarEventsResponse = z.infer<typeof GoogleCalendarEventsResponseSchema>

export type GoogleCalendarEventsListOptions = {
  maxResults?: number
  orderBy?: "startTime" | "updated"
  pageToken?: string
  singleEvents?: boolean
  timeMax?: string
  timeMin?: string
}

export const listGoogleCalendarEvents = (
  client: GoogleCalendarClientConfig,
  calendarId: string,
  options: GoogleCalendarEventsListOptions = {},
): Promise<GoogleCalendarEventsResponse> => {
  return googleCalendarRequest(
    client,
    "Events list",
    ["calendars", calendarId, "events"],
    searchParams({
      maxResults: options.maxResults,
      orderBy: options.orderBy,
      pageToken: options.pageToken,
      singleEvents: options.singleEvents,
      showDeleted: false,
      timeMax: options.timeMax,
      timeMin: options.timeMin,
    }),
    GoogleCalendarEventsResponseSchema,
  )
}
