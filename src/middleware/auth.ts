import type { MiddlewareHandler } from "hono"
import type { User } from "../http.js"
import { config } from "../config.js"

const AUTH_EXEMPT_PATHS = new Set(["/health", "/ready"])

const forwardedUser = (context: Parameters<MiddlewareHandler>[0]): User | null => {
  const header = (name: string, localFallback: string | undefined) => {
    const fallback = config.isProduction ? undefined : localFallback
    return context.req.header(name) || fallback
  }

  const id = header("x-forwarded-user", config.localAuth.userId)
  const email = header("x-forwarded-email", config.localAuth.userEmail)
  return id != null && email != null ? { id, email } : null
}

export const authMiddleware: MiddlewareHandler<{ Variables: { user: User } }> = async (
  context,
  next,
) => {
  if (AUTH_EXEMPT_PATHS.has(context.req.path) || context.req.path.startsWith("/api/cron/")) {
    return next()
  }

  const user = forwardedUser(context)
  if (user == null) {
    return context.json({ error: "Unauthorized" }, 401)
  }

  context.set("user", user)

  return next()
}
