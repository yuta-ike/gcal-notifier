import { errorMessage, type User } from "../http.js"
import { deleteAccessToken } from "../controller/access-token-delete.js"
import { getAccessToken } from "../controller/access-token-get.js"
import { saveAccessToken } from "../controller/access-token-save.js"
import { buildGoogleAuthorizationUrl, exchangeGoogleCode } from "../libs/google/api.js"
import { createOAuthState, verifyOAuthState } from "../infrastructure/security/crypto.js"
import { ErrorPage } from "../ui/views/error.js"
import { Hono, type Context } from "hono"
import { db } from "../db.js"
import { promiseAllObject } from "../libs/promise.js"
import { gen, tryCatch, tryCatchAsync, when } from "../libs/result.js"

const renderOAuthError = (c: Context, message: string, status: 400 | 503) =>
  c.html(<ErrorPage userId={c.get("user").email} message={message} />, status)

const readOAuthCode = (c: Context): string => {
  const state = c.req.query("state")?.trim()
  if (state == null || state === "") {
    throw new Error("OAuth state がありません")
  }
  const code = c.req.query("code")?.trim()
  if (code == null || code === "") {
    throw new Error("認証コードがありません")
  }

  verifyOAuthState(state, { userId: c.get("user").id, provider: "google" })

  return code
}

export const authApp = new Hono<{ Variables: { user: User } }>()
  .get("/auth/google/start", async (c) => {
    const user = c.get("user")
    const result = await gen(async function* () {
      const state = yield* tryCatch(() => createOAuthState({ userId: user.id, provider: "google" }))
      const authorizationUrl = yield* tryCatch(() => buildGoogleAuthorizationUrl(state))
      return c.redirect(authorizationUrl)
    })

    return when(result, {
      ok: (data) => data,
      err: (err) => renderOAuthError(c, errorMessage(err, "Google連携に失敗しました"), 503),
    })
  })

  .get("/auth/google/callback", async (c) => {
    const user = c.get("user")
    const error = c.req.query("error")
    if (error != null) {
      return renderOAuthError(c, `Google OAuth エラー: ${error}`, 400)
    }

    const result = await gen(async function* () {
      const code = yield* tryCatch(() => readOAuthCode(c))
      const { old, token } = yield* await tryCatchAsync(() =>
        promiseAllObject({
          old: getAccessToken({ db }, user.id, "google"),
          token: exchangeGoogleCode(code),
        }),
      )

      yield* await tryCatchAsync(() => saveAccessToken({ db }, user.id, "google", token, old))
      return c.redirect("/integrations/google")
    })

    return when(result, {
      ok: (data) => data,
      err: (err) => renderOAuthError(c, errorMessage(err, "Google連携に失敗しました"), 400),
    })
  })

  .post("/integrations/google/disconnect", async (c) => {
    await deleteAccessToken({ db }, c.get("user").id, "google")
    return c.redirect(`/integrations/google`)
  })
