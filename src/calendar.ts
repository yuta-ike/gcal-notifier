import { auth, calendar, calendar_v3 } from "@googleapis/calendar"
import { addDays, startOfDay } from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"

export type CalendarEvent = calendar_v3.Schema$Event

export interface CalendarClient {
  listEvents(options: {
    timeMin: string
    timeMax: string
  }): Promise<CalendarEvent[]>
}

export function createCalendarClient(
  accessToken: string,
  calendarId: string,
): CalendarClient {
  const credentials = new auth.OAuth2()
  credentials.setCredentials({ access_token: accessToken })
  const client = calendar({ version: "v3", auth: credentials })
  return {
    async listEvents(options) {
      const response = await client.events.list({
        calendarId,
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
      })
      return response.data.items ?? []
    },
  }
}

export function todayRange(
  timeZone: string,
  now = new Date(),
): { timeMin: string; timeMax: string } {
  const day = startOfDay(toZonedTime(now, timeZone))
  return {
    timeMin: fromZonedTime(day, timeZone).toISOString(),
    timeMax: fromZonedTime(addDays(day, 1), timeZone).toISOString(),
  }
}

export function hasGroupAttendee(event: CalendarEvent, groupEmail: string) {
  const expected = groupEmail.toLowerCase()
  return (event.attendees ?? []).some(
    (attendee) => attendee.email?.toLowerCase() === expected,
  )
}
