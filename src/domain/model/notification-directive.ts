import sanitizeHtml from "sanitize-html"

export type NotificationDirective = {
  channel: string
  mentions: string[]
}

export const notificationDirectiveKey = (directive: NotificationDirective): string =>
  `${directive.channel}:${directive.mentions.join(",")}`

const directivePattern = /notify#([^\s{}]+)(?:\{([^{}]*)\}|(?!\{))/gi

export const textFromDescriptionHtml = (description: string | null | undefined): string => {
  if (description == null) {
    return ""
  }

  // Preserve HTML line breaks before sanitize-html removes the tags.
  const withLineBreaks = description
    .replace(/<br\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)\s*>/gi, "\n")

  return sanitizeHtml(withLineBreaks, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  })
}

const MENTION_REGEXP = /^@[^@{},]+$/

export const parseNotificationDirectives = (
  description: string | null | undefined,
): NotificationDirective[] => {
  const plainText = textFromDescriptionHtml(description)
  if (plainText.trim() === "") {
    return []
  }

  const directives = plainText
    .matchAll(directivePattern)
    .map((match) => {
      const channel = match[1]?.trim()
      const body = match[2]?.trim() ?? ""
      return { channel, body }
    })
    .map(({ channel, body }) => {
      if (channel == null) {
        return null
      }

      const mentions = body === "" ? [] : body.split(",").map((mention) => mention.trim())
      if (mentions.some((mention) => !MENTION_REGEXP.test(mention))) {
        return null
      }

      return {
        channel,
        mentions: mentions.map((mention) => mention.slice(1).trim()),
      }
    })
    .filter((directive) => directive != null)
    .toArray()

  return directives
}
