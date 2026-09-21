export type GoogleCalendarEventTime =
  | {
      date: string
      dateTime?: undefined
      timeZone?: string | undefined
    }
  | {
      date?: undefined
      dateTime: string
      timeZone?: string | undefined
    }

type GoogleCalendarEventConferenceEntryPoint = {
  entryPointType?: string | undefined
  uri?: string | undefined
  label?: string | undefined
  pin?: string | undefined
}

type GoogleCalendarEventConferenceData = {
  entryPoints?: GoogleCalendarEventConferenceEntryPoint[] | undefined
}

export type GoogleCalendarEvent = {
  id: string
  status?: "confirmed" | "tentative" | "cancelled" | undefined
  htmlLink: string
  summary: string
  description?: string | undefined
  location?: string | undefined
  conferenceData?: GoogleCalendarEventConferenceData | undefined
  start: GoogleCalendarEventTime
  end: GoogleCalendarEventTime
}
