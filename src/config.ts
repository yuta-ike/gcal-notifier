import { z } from "zod"

const OptionalStringSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.trim() || undefined
  }
  return value
}, z.string().min(1).optional())

const RequiredStringSchema = z.string().trim().min(1)

const PositiveIntegerSchema = z.coerce.number().int().positive()

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    PORT: PositiveIntegerSchema.optional().default(3000),
    BASE_URL: OptionalStringSchema,
    GOOGLE_CLIENT_ID: RequiredStringSchema,
    GOOGLE_CLIENT_SECRET: RequiredStringSchema,
    GOOGLE_REDIRECT_URI: OptionalStringSchema,
    GOOGLE_CALENDAR_ID: RequiredStringSchema,
    SLACK_BOT_TOKEN: OptionalStringSchema,
    LOCAL_USER_ID: OptionalStringSchema,
    LOCAL_USER_EMAIL: OptionalStringSchema,
    MONGODB_URI: OptionalStringSchema,
    MONGODB_DB_NAME: OptionalStringSchema,
    CRON_SECRET: RequiredStringSchema,
    APP_ENCRYPTION_KEY: OptionalStringSchema,
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === "production" && environment.APP_ENCRYPTION_KEY == null) {
      context.addIssue({
        code: "custom",
        path: ["APP_ENCRYPTION_KEY"],
        message: "APP_ENCRYPTION_KEY is required in production",
      })
    }
  })

const AppConfigSchema = EnvironmentSchema.transform((env) => {
  const baseUrl = (env.BASE_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, "")

  return {
    isProduction: env.NODE_ENV === "production",
    port: env.PORT,
    baseUrl,
    notificationCalendarId: env.GOOGLE_CALENDAR_ID,
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI ?? `${baseUrl}/auth/google/callback`,
    },
    slack: {
      botToken: env.SLACK_BOT_TOKEN,
    },
    localAuth: {
      userId: env.LOCAL_USER_ID,
      userEmail: env.LOCAL_USER_EMAIL,
    },
    database: {
      uri: env.MONGODB_URI,
      name: env.MONGODB_DB_NAME ?? "gcal-notifier",
    },
    cronSecret: env.CRON_SECRET,
  }
})

export type AppConfig = z.infer<typeof AppConfigSchema>
export type DatabaseConfig = AppConfig["database"]

export const config = AppConfigSchema.parse(process.env)
