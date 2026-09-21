import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { errorMessage, validationError } from "../http.js"
import { config } from "../config.js"
import { runReminderJob } from "../controller/reminder-job.js"
import { NotificationSlotSchema } from "../domain/model/notification-slot.js"
import { JAPAN_TIME_ZONE, localDate } from "../libs/time.js"
import { Hono } from "hono"
import { db } from "../db.js"
import { matchesBearerToken } from "../libs/validation.js"
import { tryCatchAsync } from "../libs/result.js"

const cronSchema = z.object({
  slot: z
    .enum(["10:00", "18:00"])
    .transform((slot) => parseInt(slot.slice(0, 2), 10))
    .pipe(NotificationSlotSchema),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date)
    .optional(),
})

export const cronApp = new Hono().post(
  "/reminders",
  zValidator("query", cronSchema, validationError),
  async (c) => {
    const authorization = c.req.header("authorization")
    const valid = matchesBearerToken(authorization, config.cronSecret)
    if (!valid) {
      return c.json({ error: "cron認証に失敗しました" }, 401)
    }

    const { slot: timing, date: requestedDate } = c.req.valid("query")
    const dateStr = requestedDate ?? localDate(new Date(), JAPAN_TIME_ZONE)

    const job = await tryCatchAsync(() =>
      runReminderJob({ config, db }, new Date(), timing, dateStr),
    )
    if (!job.ok) {
      return c.json({ error: errorMessage(job.err, "リマインド処理に失敗しました") }, 500)
    }

    return c.json({
      ok: true,
      date: dateStr,
      timing,
      ...job.data,
    })
  },
)
