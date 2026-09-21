import {
  parseNotificationDirectives,
  textFromDescriptionHtml,
} from "../../domain/model/notification-directive.js"
import type { GoogleCalendarEvent } from "../../domain/model/calendar-event.js"
import type { GoogleCalendarListEntry } from "../../libs/google/api.js"
import { getMonthLabel, getNextMonth, getPrevMonth } from "../../libs/date.js"
import { formatEventClock, formatEventDate, JAPAN_TIME_ZONE, localDate } from "../../libs/time.js"
import { CalendarEventModal } from "../components/calendar-event-modal.js"
import { Layout } from "../components/layout.js"
import { BellIcon } from "../components/icons/Bell.js"
import { ArrowLeftIcon } from "../components/icons/ArrowLeft.js"
import { ArrowRightIcon } from "../components/icons/ArrowRight.js"

const calendarCells = (month: string, today: string) => {
  const date = new Date(`${month}-01T00:00:00Z`)
  const year = date.getUTCFullYear()
  const monthIndex = date.getUTCMonth()

  const firstDay = new Date(Date.UTC(year, monthIndex, 1))
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

  const cellCount = Math.ceil((firstDay.getUTCDay() + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, index - firstDay.getUTCDay() + 1))
    return {
      date: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
      isToday: date.toISOString().slice(0, 10) === today,
    }
  })
}

type Props = {
  userId: string
  month: string
  calendar?: GoogleCalendarListEntry
  events: GoogleCalendarEvent[]
  connected: boolean
  error?: string
}

export const CalendarPage = ({ userId, month, calendar, events, connected, error }: Props) => {
  const eventsByDate = Object.groupBy(events, (event) => formatEventDate(event))
  const today = localDate(new Date(), JAPAN_TIME_ZONE)

  return (
    <Layout title="カレンダー" userId={userId}>
      <div className="calendar-page-header">
        <div>
          <h1>カレンダー</h1>
          <p className="muted">{calendar == null ? "Google カレンダー" : calendar.summary}</p>
        </div>
        <div className="calendar-navigation actions">
          <a
            className="button secondary"
            href={`/calendar?month=${getPrevMonth(month)}`}
            aria-label="前の月"
          >
            <ArrowLeftIcon />
          </a>
          <strong>{getMonthLabel(month)}</strong>
          <a
            className="button secondary"
            href={`/calendar?month=${getNextMonth(month)}`}
            aria-label="次の月"
          >
            <ArrowRightIcon />
          </a>
        </div>
      </div>

      {!connected && (
        <div className="notice">
          Google アカウントが連携されていません。<a href="/integrations/google">連携する</a>
          と予定を表示できます。
        </div>
      )}

      {error != null && <div className="notice">予定を取得できませんでした: {error}</div>}

      <section className="card calendar-card">
        <div className="calendar-weekdays" aria-hidden="true">
          {["日", "月", "火", "水", "木", "金", "土"].map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {calendarCells(month, today).map((cell) => {
            const dayEvents = eventsByDate[cell.date] ?? []
            return (
              <div
                className={`calendar-day${cell.inMonth ? "" : " outside"}${cell.isToday ? " today" : ""}`}
                key={cell.date}
              >
                <div className="calendar-day-number">{cell.day}</div>
                <div className="calendar-events">
                  {dayEvents.map((event) => {
                    const modalId = `calendar-event-${event.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`
                    const directives = parseNotificationDirectives(
                      textFromDescriptionHtml(event.description),
                    )
                    return (
                      <div className="calendar-event-details" key={event.id}>
                        <button
                          className="calendar-event"
                          type="button"
                          data-dialog-target={modalId}
                          aria-haspopup="dialog"
                          title={event.summary}
                        >
                          <span className="calendar-event-time">
                            {formatEventClock(event, JAPAN_TIME_ZONE)}
                          </span>
                          <span>{event.summary}</span>
                          {directives.length > 0 && (
                            <span className="calendar-event-channel-row">
                              <span className="calendar-event-bell-icon">
                                <BellIcon />
                              </span>
                              <span className="calendar-event-channel">
                                {directives.map((directive) => `#${directive.channel}`).join(", ")}
                              </span>
                            </span>
                          )}
                        </button>
                        <CalendarEventModal event={event} directives={directives} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        {calendar != null && events.length === 0 && (
          <p className="muted calendar-empty">この月の予定はありません。</p>
        )}
      </section>
    </Layout>
  )
}
