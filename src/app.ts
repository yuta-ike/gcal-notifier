import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { authMiddleware } from "./middleware/auth.js"
import { logger } from "hono/logger"
import { healthApp } from "./routes/health.js"
import { webApp } from "./routes/web.js"
import { authApp } from "./routes/auth.js"
import { cronApp } from "./routes/cron.js"
import { apiApp } from "./routes/api.js"

export const app = new Hono()
  // Logger
  .use(logger())
  // Asset
  .use("/assets/*", serveStatic({ root: "./public" }))
  // Health
  .route("/", healthApp)
  // Auth middleware
  .use("*", authMiddleware)
  // Web
  .route("/", webApp)
  // Auth
  .route("/", authApp)
  // API
  .route("/", apiApp)
  // Cron
  .route("/api/cron", cronApp)
  // Error
  .onError((error, c) => {
    console.error(error instanceof Error ? error.message : error)
    return c.json({ error: "内部エラーが発生しました" }, 500)
  })
