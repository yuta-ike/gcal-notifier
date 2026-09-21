import { Hono } from "hono"

import { config } from "../config.js"
import { deleteAccessToken } from "../controller/access-token-delete.js"
import { getAccessToken } from "../controller/access-token-get.js"
import { getGoogleCalendarForUser } from "../controller/google-calendars-list.js"
import { errorMessage, type User } from "../http.js"
import { db } from "../db.js"
import { tryCatchAsync } from "../libs/result.js"

export const apiApp = new Hono<{ Variables: { user: User } }>()
  .get("/api/me", (c) => c.json({ user: c.get("user") }))

  .get("/api/integrations", async (c) => {
    const user = c.get("user")
    const google = await getAccessToken({ db }, user.id, "google")
    return c.json({ google: google != null })
  })

  .get("/api/google/calendars", async (c) => {
    const user = c.get("user")
    const result = await tryCatchAsync(() =>
      getGoogleCalendarForUser(
        { db, googleConfig: config.google },
        config.notificationCalendarId,
        user.id,
      ),
    )
    if (!result.ok) {
      return c.json(
        { error: errorMessage(result.err, "Google Calendar の取得に失敗しました") },
        502,
      )
    }
    return c.json({ calendar: result.data })
  })

  .post("/api/integrations/google/disconnect", async (c) => {
    await deleteAccessToken({ db }, c.get("user").id, "google")
    return c.json({ disconnected: true })
  })
