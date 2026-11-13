import { calendar, calendar_v3 } from "@googleapis/calendar"
import { GoogleAuth } from "google-auth-library"
import { addDays, isValid, parseISO, startOfDay } from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"

export type CalendarEvent = calendar_v3.Schema$Event

export interface CalendarClient {
  listEvents(options: {
    timeMin: string
    timeMax: string
  }): Promise<CalendarEvent[]>
}

export function createCalendarClient(calendarId: string): CalendarClient {
  const credentials = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  })
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
  return rangeFromZonedDay(day, timeZone)
}

export function dateRange(
  timeZone: string,
  date: string,
): { timeMin: string; timeMax: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date must be in YYYY-MM-DD format")
  }

  const parsed = parseISO(date)
  if (!isValid(parsed)) {
    throw new Error("date must be a valid calendar date")
  }

  const day = startOfDay(
    toZonedTime(fromZonedTime(`${date}T00:00:00`, timeZone), timeZone),
  )
  return rangeFromZonedDay(day, timeZone)
}

function rangeFromZonedDay(day: Date, timeZone: string) {
  return {
    timeMin: fromZonedTime(day, timeZone).toISOString(),
    timeMax: fromZonedTime(addDays(day, 1), timeZone).toISOString(),
  }
}
