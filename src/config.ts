import { z } from "zod"

const environmentSchema = z.object({
  GOOGLE_CALENDAR_ID: z.string().min(1).default("primary"),
  SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
  PORT: z.coerce.number().int().positive().default(8080),
  TIME_ZONE: z.string().min(1).default("Asia/Tokyo"),
})

export type Config = z.infer<typeof environmentSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return environmentSchema.parse(env)
}
