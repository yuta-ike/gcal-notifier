import { serve } from "@hono/node-server"
import { app } from "./src/app.js"
import { config } from "./src/config.js"

const server = serve({ fetch: app.fetch, port: config.port })

console.info(`GCal Notifier listening on http://localhost:${config.port}`)

process.on("SIGINT", () => {
  server.close()
  process.exit(0)
})
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})
