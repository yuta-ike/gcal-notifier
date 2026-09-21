import type { SlackApiClientConfig, SlackUser } from "./api.js"
import { listSlackConversations, listSlackUsergroups, listSlackUsers } from "./api.js"
import type {
  SlackChannel,
  SlackNotificationDirectory,
  SlackUserOption,
} from "../../domain/model/slack-directory.js"
import type { SlackUsergroup } from "../../domain/model/slack-directory.js"
import { collectPages } from "../pagination.js"
import { promiseAllObject } from "../promise.js"

export const createSlackBotClient = (botToken: string | undefined): SlackApiClientConfig | null =>
  botToken == null ? null : { accessToken: botToken }

const listSlackChannelsForClient = (client: SlackApiClientConfig): Promise<SlackChannel[]> =>
  collectPages(
    (cursor) =>
      listSlackConversations(client, {
        limit: 200,
        ...(cursor == null ? {} : { cursor }),
      }),
    (page) =>
      page.channels?.filter(
        (channel) => !channel.is_archived && (channel.is_channel || channel.is_group),
      ),
    (page) => page.response_metadata?.next_cursor || undefined,
  )

const listSlackUsersForClient = (client: SlackApiClientConfig): Promise<SlackUserOption[]> =>
  collectPages(
    (cursor) => listSlackUsers(client, { limit: 200, ...(cursor == null ? {} : { cursor }) }),
    (page) =>
      page.members
        ?.filter((user) => !user.deleted && !user.is_bot && !user.is_app_user)
        .map((user) => ({ id: user.id, label: userLabel(user), aliases: userAliases(user) })),
    (page) => page.response_metadata?.next_cursor || undefined,
  )

const listSlackUsergroupsForClient = (client: SlackApiClientConfig): Promise<SlackUsergroup[]> =>
  listSlackUsergroups(client).then((response) => response.usergroups ?? [])

export const loadSlackNotificationDirectory = async (
  client: SlackApiClientConfig,
): Promise<SlackNotificationDirectory> => {
  const { channels, users, usergroups } = await promiseAllObject({
    channels: listSlackChannelsForClient(client),
    users: listSlackUsersForClient(client),
    usergroups: listSlackUsergroupsForClient(client),
  })
  return { channels, users, usergroups }
}

const userLabel = (user: SlackUser): string =>
  user.profile?.display_name ?? user.profile?.real_name ?? user.real_name ?? user.name ?? user.id

const userAliases = (user: SlackUser): string[] =>
  [user.name, user.real_name, user.profile?.display_name, user.profile?.real_name]
    .filter((value): value is string => value != null && value.trim() !== "")
    .filter((value, index, values) => values.indexOf(value) === index)
