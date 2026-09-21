import type { GoogleCalendarEvent } from "../model/calendar-event.js"
import { JAPAN_TIME_ZONE } from "../../libs/time.js"

type DateParts = {
  date: string
  hour: number
}

const dateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(value)) {
    return null
  }
  return value
}

const dateTimeDate = (value: string) => {
  if (Number.isNaN(new Date(value).getTime())) {
    return null
  }
  return dateOnly(value.slice(0, 10))
}

const japanDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: JAPAN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
})

const partsInJapanTime = (date: Date): DateParts | null => {
  if (Number.isNaN(date.getTime())) {
    return null
  }
  const fields = Object.fromEntries(
    japanDateTimeFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  )
  return {
    date: `${fields.year}-${fields.month}-${fields.day}`,
    hour: Number(fields.hour),
  }
}

const currentParts = (now: Date): DateParts | null => {
  if (Number.isNaN(now.getTime())) {
    return null
  }
  return partsInJapanTime(now)
}

const hasTimeZoneOffset = (value: string) => /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value)

const eventStartDate = (start: GoogleCalendarEvent["start"]): string | null => {
  if (start.date != null) {
    return dateOnly(start.date)
  }
  if (start.dateTime == null) {
    return null
  }
  if (!hasTimeZoneOffset(start.dateTime)) {
    return dateTimeDate(start.dateTime)
  }
  return partsInJapanTime(new Date(start.dateTime))?.date ?? null
}

type ReminderExclusionReason =
  | "invalid_current_time"
  | "invalid_start"
  | "outside_event_date"
  | "event_already_started"
  | "all_day_event"

type ReminderEligibility = { eligible: true } | { eligible: false; reason: ReminderExclusionReason }

export const evaluateReminderEligibility = (
  event: GoogleCalendarEvent,
  now: Date,
): ReminderEligibility => {
  const start = event.start
  if (start.date != null) {
    return { eligible: false, reason: "all_day_event" }
  }

  const current = currentParts(now)
  if (current == null) {
    return { eligible: false, reason: "invalid_current_time" }
  }

  const startDate = eventStartDate(start)
  if (startDate == null) {
    return { eligible: false, reason: "invalid_start" }
  }

  const startTime = new Date(start.dateTime ?? "")
  if (Number.isNaN(startTime.getTime())) {
    return { eligible: false, reason: "invalid_start" }
  }
  if (startDate !== current.date) {
    return { eligible: false, reason: "outside_event_date" }
  }
  if (startTime < now) {
    return { eligible: false, reason: "event_already_started" }
  }

  return { eligible: true }
}
