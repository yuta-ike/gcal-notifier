export type SlackChannel = {
  id: string
  name?: string | undefined
  is_channel?: boolean | undefined
  is_group?: boolean | undefined
  is_archived?: boolean | undefined
}

export type SlackUserOption = {
  id: string
  label: string
  aliases: string[]
}

export type SlackUsergroup = {
  id: string
  name?: string | undefined
  handle?: string | undefined
}

export type SlackNotificationDirectory = {
  channels: SlackChannel[]
  users: SlackUserOption[]
  usergroups: SlackUsergroup[]
}
