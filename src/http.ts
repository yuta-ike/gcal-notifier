import type { Context } from "hono"

export type User = {
  id: string
  email: string
}

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback

export const validationError = (result: { success: boolean }, c: Context) => {
  if (result.success) {
    return
  }
  return c.json({ error: "入力が不正です" }, 400)
}
