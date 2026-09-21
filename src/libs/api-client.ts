import { z } from "zod"
import { toError, tryCatch, tryCatchAsync } from "./result.js"

export type FetchFunction = (input: string | URL, init?: RequestInit) => Promise<Response>

type ApiErrorOptions = {
  operation: string
  status?: number
  code?: string
  details?: unknown
  message?: string | undefined
}

const defaultFetch: FetchFunction = (input, init) => fetch(input, init)

export class ApiError extends Error {
  readonly operation: string
  readonly status: number | undefined
  readonly code: string | undefined
  readonly details: unknown

  constructor(options: ApiErrorOptions) {
    const status = options.status == null ? "" : ` (HTTP ${options.status})`
    const code = options.code == null ? "" : `: ${options.code}`
    const reason = options.message == null ? "" : ` — ${options.message}`

    super(`${options.operation} failed${status}${code}${reason}`)
    this.name = "IntegrationApiError"
    this.operation = options.operation
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }
}

const RecordSchema = z.record(z.string(), z.unknown())
const NonEmptyStringSchema = z.string().min(1)

const asString = (value: unknown): string | undefined => {
  const parsed = NonEmptyStringSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const readErrorParts = (body: unknown) => {
  const parsedBody = RecordSchema.safeParse(body)
  if (!parsedBody.success) {
    return {}
  }
  const record = parsedBody.data

  const error = record.error
  const errorMessage = asString(error)
  if (errorMessage != null) {
    return {
      code: errorMessage,
      message: asString(record.error_description) ?? asString(record.message),
    }
  }

  const errorRecord = RecordSchema.safeParse(error)
  if (errorRecord.success) {
    return {
      code:
        asString(errorRecord.data.status) ??
        asString(errorRecord.data.reason) ??
        asString(errorRecord.data.code),
      message: asString(errorRecord.data.message) ?? asString(record.error_description),
    }
  }

  return {
    code: asString(record.code) ?? asString(record.status),
    message: asString(record.message) ?? asString(record.error_description),
  }
}

const bodyAsText = (body: unknown): string | undefined => {
  if (typeof body === "string") {
    return body.slice(0, 500)
  }
  if (body == null) {
    return undefined
  }

  const serialized = tryCatch(() => JSON.stringify(body))
  if (!serialized.ok) {
    return undefined
  }
  return serialized.data.slice(0, 500)
}

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  const parsed = tryCatch(() => JSON.parse(text))
  return parsed.ok ? parsed.data : text
}

const invalidResponse = (operation: string, body: unknown): never => {
  throw new ApiError({
    operation,
    code: "INVALID_RESPONSE",
    message: bodyAsText(body),
    details: body,
  })
}

export const requestJson = async <T>({
  operation,
  url,
  init,
  schema,
  fetcher = defaultFetch,
}: {
  operation: string
  url: string
  init: RequestInit
  schema: z.ZodType<T>
  fetcher?: FetchFunction
}): Promise<T> => {
  const response = await tryCatchAsync(
    () => fetcher(url, init),
    (cause) =>
      new ApiError({
        operation,
        code: "NETWORK_ERROR",
        message: toError(cause).message,
        details: cause,
      }),
  )
  if (!response.ok) {
    throw response.err
  }

  const body = await readResponseBody(response.data)
  if (!response.data.ok) {
    const parts = readErrorParts(body)
    throw new ApiError({
      operation,
      status: response.data.status,
      code: parts.code ?? `HTTP_${response.data.status}`,
      message: parts.message ?? bodyAsText(body),
      details: body,
    })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return invalidResponse(operation, body)
  }
  return parsed.data
}

export const searchParams = (obj: Record<string, string | number | boolean | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(obj).forEach(([name, value]) => {
    if (value != null) {
      params.set(name, String(value))
    }
  })
  return params
}

export const withTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`)

export const pathUrl = (baseUrl: string, ...segments: string[]) =>
  new URL(
    segments.map((segment) => encodeURIComponent(segment)).join("/"),
    withTrailingSlash(baseUrl),
  ).toString()

export const bearerHeaders = (accessToken: string): HeadersInit => ({
  Accept: "application/json",
  Authorization: `Bearer ${accessToken}`,
})

export const formHeaders: HeadersInit = {
  Accept: "application/json",
  "Content-Type": "application/x-www-form-urlencoded",
}

export const jsonHeaders = (accessToken: string): HeadersInit => ({
  Accept: "application/json",
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
})

export { bodyAsText, invalidResponse, readErrorParts }
