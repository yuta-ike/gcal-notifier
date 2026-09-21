import { Hono } from "hono"

export const healthApp = new Hono()
  .get("/health", (c) => {
    return c.json({ ok: true })
  })
  .get("/ready", (c) => {
    return c.json({ ok: true })
  })
