import { serve } from "@hono/node-server"
import { WebClient } from "@slack/web-api"
import { createApp } from "./app.js"
import { createCalendarClient } from "./calendar.js"
import { loadConfig } from "./config.js"

const config = loadConfig()
const calendar = createCalendarClient(config.GOOGLE_CALENDAR_ID)
const slack = new WebClient(config.SLACK_BOT_TOKEN)
const app = createApp(config, calendar, slack)

serve({ fetch: app.fetch, port: config.PORT }, () =>
  console.log(`GCal Notifier listening on port ${config.PORT}`),
)
