import type { GoogleCalendarEvent } from "../../domain/model/calendar-event.js"
import { type NotificationDirective } from "../../domain/model/notification-directive.js"
import { sanitizeDescriptionHtml } from "../../libs/html.js"
import { formatEventClock, JAPAN_TIME_ZONE } from "../../libs/time.js"
import { XIcon } from "./icons/X.js"

type Props = {
  event: GoogleCalendarEvent
  directives: NotificationDirective[]
}

export const CalendarEventModal = ({ event, directives }: Props) => {
  const modalId = `calendar-event-${event.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`
  const titleId = `${modalId}-title`

  return (
    <dialog id={modalId} className="calendar-modal" aria-labelledby={titleId}>
      <button
        className="calendar-modal-backdrop"
        type="button"
        data-dialog-close
        aria-label="閉じる"
      />
      <div className="calendar-modal-content">
        <div className="calendar-modal-header">
          <h2 id={titleId}>{event.summary}</h2>
          <button
            className="calendar-modal-close"
            type="button"
            data-dialog-close
            aria-label="閉じる"
          >
            <XIcon />
          </button>
        </div>
        <div className="calendar-modal-datetime muted">
          {formatEventClock(event, JAPAN_TIME_ZONE)}
        </div>
        {event.description?.trim() === "" || event.description == null ? (
          <p className="calendar-description-empty">(説明なし)</p>
        ) : (
          <div
            className="calendar-description"
            dangerouslySetInnerHTML={{
              __html: sanitizeDescriptionHtml(event.description.trim()),
            }}
          />
        )}
        {0 < directives.length && (
          <>
            <h3>通知設定</h3>
            <ul className="calendar-modal-notification">
              {directives.map((directive, index) => (
                <li key={`${event.id}-directive-${index}`}>
                  <strong>#{directive.channel}</strong>
                  {directive.mentions.length > 0
                    ? `：${directive.mentions.map((mention) => `@${mention}`).join(", ")}`
                    : "：メンションなし"}
                </li>
              ))}
            </ul>
          </>
        )}
        <a className="button secondary" href={event.htmlLink} target="_blank" rel="noreferrer">
          Google Calendarで開く
        </a>
      </div>
    </dialog>
  )
}
