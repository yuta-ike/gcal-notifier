import {
  ApiError,
  bearerHeaders,
  bodyAsText,
  invalidResponse,
  jsonHeaders,
  readErrorParts,
  requestJson,
  searchParams,
  withTrailingSlash,
  type FetchFunction,
} from "../api-client.js"
import { z } from "zod"

const SLACK_API_BASE_URL = "https://slack.com/api"

export type SlackApiClientConfig = {
  accessToken: string
  fetch?: FetchFunction
}

const SlackSuccessResponseSchema = z.object({ ok: z.literal(true) }).loose()
const SlackResponseMetadataSchema = z.object({ next_cursor: z.string().optional() }).loose()
const SlackConversationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    is_channel: z.boolean().optional(),
    is_group: z.boolean().optional(),
    is_archived: z.boolean().optional(),
  })
  .loose()

const SlackUserProfileSchema = z
  .object({
    display_name: z.string().optional(),
    real_name: z.string().optional(),
  })
  .loose()

const SlackUserSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    real_name: z.string().optional(),
    deleted: z.boolean().optional(),
    profile: SlackUserProfileSchema.optional(),
    is_bot: z.boolean().optional(),
    is_app_user: z.boolean().optional(),
  })
  .loose()

export type SlackUser = z.infer<typeof SlackUserSchema>

type SlackTextObject = {
  type: "mrkdwn" | "plain_text"
  text: string
  verbatim?: boolean
  emoji?: boolean
}

export type SlackCardBlock = {
  type: "card" | "context"
  icon?: {
    type: "image"
    image_url: string
    alt_text: string
  }
  title?: SlackTextObject
  subtitle?: SlackTextObject
  body?: SlackTextObject
  subtext?: SlackTextObject
  actions?: Array<{
    type: "button"
    text: SlackTextObject & { type: "plain_text" }
    action_id?: string
    url?: string
    style?: "primary"
  }>
}

type SlackSectionBlock = {
  type: "section"
  text: SlackTextObject
}

export type SlackBlock = SlackCardBlock | SlackSectionBlock

const slackResponse = <T extends { ok?: boolean }>(
  operation: string,
  value: unknown,
  schema: z.ZodType<T>,
): T => {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    if (SlackSuccessResponseSchema.safeParse(value).success) {
      return invalidResponse(operation, value)
    }
    const parts = readErrorParts(value)
    throw new ApiError({
      operation,
      code: parts.code ?? "SLACK_API_ERROR",
      message: parts.message ?? bodyAsText(value),
      details: value,
    })
  }
  return parsed.data
}

const slackRequest = async <T extends { ok?: boolean }>(
  client: SlackApiClientConfig,
  operation: string,
  method: string,
  params: URLSearchParams,
  schema: z.ZodType<T>,
  init: Omit<RequestInit, "headers"> & { headers?: HeadersInit } = {},
): Promise<T> => {
  const url = new URL(method, withTrailingSlash(SLACK_API_BASE_URL))
  url.search = params.toString()
  const raw = await requestJson<unknown>({
    operation,
    url: url.toString(),
    init: {
      ...init,
      // oxlint-disable-next-line typescript/no-misused-spread
      headers: { ...bearerHeaders(client.accessToken), ...init.headers },
    },
    schema: z.unknown(),
    fetcher: client.fetch,
  })
  return slackResponse(operation, raw, schema)
}

const SlackConversationsListResponseSchema = SlackSuccessResponseSchema.extend({
  channels: z.array(SlackConversationSchema).optional(),
  response_metadata: SlackResponseMetadataSchema.optional(),
})

export const listSlackConversations = (
  client: SlackApiClientConfig,
  options: {
    cursor?: string
    limit?: number
  } = {},
) => {
  return slackRequest(
    client,
    "conversations.list",
    "conversations.list",
    searchParams({
      cursor: options.cursor,
      exclude_archived: true,
      limit: options.limit,
      types: "public_channel,private_channel",
    }),
    SlackConversationsListResponseSchema,
  )
}

const SlackUsersListResponseSchema = SlackSuccessResponseSchema.extend({
  members: z.array(SlackUserSchema).optional(),
  response_metadata: SlackResponseMetadataSchema.optional(),
})

export const listSlackUsers = (
  client: SlackApiClientConfig,
  options: {
    cursor?: string
    limit?: number
  } = {},
) => {
  return slackRequest(
    client,
    "users.list",
    "users.list",
    searchParams({
      cursor: options.cursor,
      limit: options.limit,
    }),
    SlackUsersListResponseSchema,
  )
}

const SlackConversationsMembersResponseSchema = SlackSuccessResponseSchema.extend({
  members: z.array(z.string().min(1)).optional(),
  response_metadata: SlackResponseMetadataSchema.optional(),
})

export const listSlackConversationMembers = (
  client: SlackApiClientConfig,
  options: {
    channel: string
    cursor?: string
    limit?: number
  },
) => {
  return slackRequest(
    client,
    "conversations.members",
    "conversations.members",
    searchParams({
      channel: options.channel,
      cursor: options.cursor,
      limit: options.limit,
    }),
    SlackConversationsMembersResponseSchema,
  )
}

const SlackUsergroupSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    handle: z.string().optional(),
  })
  .loose()

const SlackUsergroupsListResponseSchema = SlackSuccessResponseSchema.extend({
  usergroups: z.array(SlackUsergroupSchema).optional(),
})

export const listSlackUsergroups = (client: SlackApiClientConfig) =>
  slackRequest(
    client,
    "usergroups.list",
    "usergroups.list",
    new URLSearchParams(),
    SlackUsergroupsListResponseSchema,
  )

type SlackPostMessageInput = {
  channel: string
  blocks?: SlackBlock[]
  text?: string
  mrkdwn?: boolean
  username?: string
}

export const postSlackMessage = async (
  client: SlackApiClientConfig,
  input: SlackPostMessageInput,
) => {
  const body: Record<string, unknown> = { channel: input.channel }
  if (input.blocks !== undefined) {
    body.blocks = input.blocks
  }
  if (input.text !== undefined) {
    body.text = input.text
  }
  if (input.mrkdwn !== undefined) {
    body.mrkdwn = input.mrkdwn
  }
  if (input.username !== undefined) {
    body.username = input.username
  }

  const url = new URL("chat.postMessage", withTrailingSlash(SLACK_API_BASE_URL))
  const raw = await requestJson<unknown>({
    operation: "chat.postMessage",
    url: url.toString(),
    init: {
      method: "POST",
      headers: jsonHeaders(client.accessToken),
      body: JSON.stringify(body),
    },
    schema: z.unknown(),
    fetcher: client.fetch,
  })
  return slackResponse("chat.postMessage", raw, SlackSuccessResponseSchema)
}
