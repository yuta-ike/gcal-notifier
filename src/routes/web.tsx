import { Hono } from "hono"

import { config } from "../config.js"
import { getAccessToken } from "../controller/access-token-get.js"
import { getGoogleCalendarDataForUser } from "../controller/google-calendar-events-list.js"
import { errorMessage, type User } from "../http.js"
import { db } from "../db.js"
import { currentMonth, monthRange, normalizeMonth } from "../libs/date.js"
import { tryCatchAsync } from "../libs/result.js"
import { CalendarPage } from "../ui/views/calendar.js"
import { DashboardPage } from "../ui/views/dashboard.js"
import { GooglePage } from "../ui/views/google.js"

export const webApp = new Hono<{ Variables: { user: User } }>()
  .get("/", async (c) => {
    const user = c.get("user")
    const googleToken = await getAccessToken({ db }, user.id, "google")
    return c.html(<DashboardPage userId={user.email} googleConnected={googleToken != null} />)
  })

  .get("/calendar", async (c) => {
    const user = c.get("user")
    const requestedMonth = c.req.query("month")
    const month = requestedMonth == null ? currentMonth() : normalizeMonth(requestedMonth)
    const range = monthRange(month)
    const calendarId = config.notificationCalendarId

    const calendarResult = await tryCatchAsync(() =>
      getGoogleCalendarDataForUser({ db, googleConfig: config.google }, calendarId, user.id, {
        timeMin: range.timeMin,
        timeMax: range.timeMax,
      }),
    )

    if (!calendarResult.ok) {
      return c.html(
        <CalendarPage
          userId={user.email}
          month={month}
          events={[]}
          connected={false}
          error={errorMessage(calendarResult.err, "Google Calendar の予定取得に失敗しました")}
        />,
      )
    }

    return c.html(
      <CalendarPage
        userId={user.email}
        month={month}
        calendar={calendarResult.data?.calendar ?? undefined}
        events={calendarResult.data?.events ?? []}
        connected={calendarResult.data != null}
      />,
    )
  })

  .get("/integrations/google", async (c) => {
    const user = c.get("user")
    const accessToken = await getAccessToken({ db }, user.id, "google")
    return c.html(<GooglePage userId={user.email} connected={accessToken != null} />)
  })
