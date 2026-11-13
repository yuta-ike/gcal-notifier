import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"
import { z } from "zod"
import { CalendarClient } from "./calendar.js"
import { Config } from "./config.js"
import { notifyOnDate, notifyToday } from "./service.js"
import type { WebClient } from "@slack/web-api"

const notifyRequestSchema = z
  .object({
    date: z.string().date().optional(),
  })
  .passthrough()

export function createApp(
  config: Config,
  calendar: CalendarClient,
  slack: WebClient,
) {
  const app = new Hono()

  app.use("*", logger())
  app.use("*", secureHeaders())

  app.get("/health", (context) => context.json({ ok: true }))
  app.post(
    "/notify",
    zValidator("json", notifyRequestSchema),
    async (context) => {
      try {
        const input = context.req.valid("json")
        const sent = input.date
          ? await notifyOnDate(config, calendar, slack, input.date)
          : await notifyToday(config, calendar, slack)
        return context.json({ ok: true, sent })
      } catch (error) {
        console.error("Notification failed", error)
        return context.json({ ok: false, error: "notification_failed" }, 500)
      }
    },
  )

  return app
}
