import { CalendarClient, hasGroupAttendee, todayRange } from "./calendar.js"
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
  let sent = 0
  for (const event of events) {
    if (!hasGroupAttendee(event, config.GOOGLE_GROUP_EMAIL)) {
      continue
    }
    const notification = parseNotification(event.description)
    if (notification == null) {
      continue
    }
    const channelId = await findChannelId(slack, notification.channelName)
    await postMessage(
      slack,
      channelId,
      formatEvent(event, notification.mentions),
    )
    sent += 1
  }
  return sent
}
