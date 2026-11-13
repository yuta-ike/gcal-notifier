import { z } from "zod"

const notificationSchema = z.object({
  channelName: z.string().min(1),
  mentions: z.array(z.string().regex(/^@[^,{}\s]+$/)).default([]),
})

type Notification = z.infer<typeof notificationSchema>

const notificationPattern = /(?:^|\s)notify#([^\s{@]+)(?:\{([^}]*)\})?/i

export function parseNotification(
  description: string | null | undefined,
): Notification | null {
  if (!description) {
    return null
  }
  const match = notificationPattern.exec(description)
  if (!match?.[1]) {
    return null
  }
  const mentions = match[2]
    ? match[2]
        .split(",")
        .map((mention) => mention.trim())
        .filter(Boolean)
    : []
  return notificationSchema.parse({ channelName: match[1], mentions })
}
