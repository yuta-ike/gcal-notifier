import type { WebClient } from "@slack/web-api"
import { formatInTimeZone } from "date-fns-tz"

export async function findChannelId(client: WebClient, name: string) {
  let cursor: string | undefined
  do {
    const page = await client.conversations.list({
      types: "public_channel,private_channel",
      limit: 200,
      exclude_archived: true,
      cursor,
    })
    const channel = page.channels?.find((item) => item.name === name)
    if (channel?.id) {
      return channel.id
    }
    cursor = page.response_metadata?.next_cursor || undefined
  } while (cursor)
  throw new Error(`Slack channel not found: #${name}`)
}

export async function postMessage(
  client: WebClient,
  channelId: string,
  text: string,
) {
  await client.chat.postMessage({
    channel: channelId,
    text,
    unfurl_links: false,
    link_names: true,
  })
}

export function formatEvent(
  event: {
    summary?: string | null
    start?: { dateTime?: string | null; date?: string | null }
    end?: { dateTime?: string | null; date?: string | null }
    htmlLink?: string | null
  },
  mentions: string[],
  timeZone: string,
) {
  const title = event.summary?.trim() || "(無題の予定)"
  const start = event.start?.dateTime ?? event.start?.date
  const date = start
    ? formatInTimeZone(start, timeZone, "yyyy/M/d HH:mm")
    : "日時未定"
  const prefix = mentions.length > 0 ? `${mentions.join(" ")}\n` : ""
  return `${prefix}${title} は ${date} 開始です。`
}
