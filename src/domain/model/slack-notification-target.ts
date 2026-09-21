import type { NotificationDirective } from "./notification-directive.js"
import type { SlackNotificationDirectory } from "./slack-directory.js"

export type SlackNotificationTarget = {
  channelId: string
  mentionText: string
  key: string
}

const normalized = (value: string): string => value.trim().replace(/^[@#]/, "").toLocaleLowerCase()

const sameName = (value: string | undefined, target: string): boolean =>
  value != null && normalized(value) === normalized(target)

const formatMention = (value: string): { text: string; key: string } | null => {
  const name = normalized(value)
  if (name === "here") {
    return { text: "<!here>", key: "special:here" }
  }
  if (name === "channel") {
    return { text: "<!channel>", key: "special:channel" }
  }
  if (name === "everyone") {
    return { text: "<!everyone>", key: "special:everyone" }
  }
  return null
}

type ResolvedMention = { text: string; key: string }

const resolveMention = (
  directory: SlackNotificationDirectory,
  mention: string,
): ResolvedMention | null => {
  const special = formatMention(mention)
  if (special != null) {
    return special
  }

  const usergroup = directory.usergroups.find(
    (item) => item.id === mention || sameName(item.name, mention) || sameName(item.handle, mention),
  )
  if (usergroup != null) {
    return { text: `<!subteam^${usergroup.id}>`, key: `group:${usergroup.id}` }
  }

  const user = directory.users.find(
    (item) =>
      item.id === mention ||
      sameName(item.label, mention) ||
      item.aliases.some((alias) => sameName(alias, mention)),
  )
  return user == null ? null : { text: `<@${user.id}>`, key: `user:${user.id}` }
}

const isResolvedMention = (mention: ResolvedMention | null): mention is ResolvedMention =>
  mention != null

export const resolveSlackNotificationTarget = (
  directory: SlackNotificationDirectory,
  directive: NotificationDirective,
): SlackNotificationTarget | null => {
  const channel = directory.channels.find(
    (item) => item.id === directive.channel || sameName(item.name, directive.channel),
  )
  if (channel == null) {
    return null
  }

  const resolvedMentions = directive.mentions
    .map((mention) => resolveMention(directory, mention))
    .filter(isResolvedMention)
  if (resolvedMentions.length !== directive.mentions.length) {
    return null
  }

  const uniqueMentions = [
    ...new Map(resolvedMentions.map((mention) => [mention.key, mention])).values(),
  ]
  return {
    channelId: channel.id,
    mentionText: uniqueMentions.map((mention) => mention.text).join(" "),
    key: `${channel.id}:${uniqueMentions
      .map((mention) => mention.key)
      .sort()
      .join(",")}`,
  }
}
