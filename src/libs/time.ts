import type { GoogleCalendarEvent } from "../domain/model/calendar-event.js"

export const JAPAN_TIME_ZONE = "Asia/Tokyo"

export const localDate = (now: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)

// This conversion assumes the application time zone is Asia/Tokyo (UTC+09:00).
export const localDateTimeToUtc = (date: string, hour: number): Date => {
  const value = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+09:00`)
  if (Number.isNaN(value.getTime())) {
    throw new Error("date is invalid")
  }
  return value
}

export const nextDate = (date: string): string => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

type CalendarEvent = Pick<GoogleCalendarEvent, "start" | "end">

const parseDateTime = (value: string | undefined): Date | null => {
  if (value == null) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

const dateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

export const formatEventDate = (event: CalendarEvent): string => {
  if (event.start.date != null) {
    return event.start.date
  }
  const start = parseDateTime(event.start.dateTime)
  return start == null ? "" : dateFormatter(JAPAN_TIME_ZONE).format(start)
}

const clockFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  })

export const formatEventClock = (event: CalendarEvent, timeZone: string): string => {
  if (event.start.date != null) {
    return "終日"
  }
  const start = parseDateTime(event.start.dateTime)
  if (start == null) {
    return ""
  }
  const formatter = clockFormatter(timeZone)
  const startLabel = formatter.format(start)
  const end = parseDateTime(event.end.dateTime)
  return end == null ? startLabel : `${startLabel} - ${formatter.format(end)}`
}

const formatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: JAPAN_TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
})

export const formatEventTime = (event: CalendarEvent): string => {
  if (event.start.date != null) {
    return event.start.date
  }

  const start = parseDateTime(event.start.dateTime)
  if (start == null) {
    return event.start.dateTime
  }

  const end = parseDateTime(event.end.dateTime)
  if (end == null) {
    return `${formatter.format(start)}`
  } else {
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }
}
