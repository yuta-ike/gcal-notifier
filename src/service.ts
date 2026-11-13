import { CalendarClient, dateRange, todayRange } from "./calendar.js"
import { Config } from "./config.js"
import { parseNotification } from "./notification.js"
import { formatEvent, findChannelId, postMessage } from "./slack.js"
import type { WebClient } from "@slack/web-api"

export async function notifyToday(
  config: Config,
  calendar: CalendarClient,
  slack: WebClient,
): Promise<number> {
  const events = await calendar.listEvents(todayRange(config.TIME_ZONE))
  return notifyEvents(config, slack, events)
}

export async function notifyOnDate(
  config: Config,
  calendar: CalendarClient,
  slack: WebClient,
  date: string,
): Promise<number> {
  const events = await calendar.listEvents(dateRange(config.TIME_ZONE, date))
  return notifyEvents(config, slack, events)
}

async function notifyEvents(
  config: Config,
  slack: WebClient,
  events: Awaited<ReturnType<CalendarClient["listEvents"]>>,
): Promise<number> {
  let sent = 0
  for (const event of events) {
    const notification = parseNotification(event.description)
    if (notification == null) {
      continue
    }
    const channelId = await findChannelId(slack, notification.channelName)
    await postMessage(
      slack,
      channelId,
      formatEvent(event, notification.mentions, config.TIME_ZONE),
    )
    sent += 1
  }
  return sent
}
