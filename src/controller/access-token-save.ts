import { encryptString } from "../infrastructure/security/crypto.js"
import { saveAccessToken as saveStoredAccessToken } from "../infrastructure/db/access-token-save.js"
import type { Db } from "mongodb"
import type { Provider } from "../libs/db.js"
import type { GoogleOAuthTokenResponse } from "../libs/google/api.js"
import type { AccessToken } from "./access-token-get.js"

export type AccessTokenSaveDependencies = {
  db: Db
}

export const saveAccessToken = async (
  { db }: AccessTokenSaveDependencies,
  userId: string,
  provider: Provider,
  token: GoogleOAuthTokenResponse,
  previous?: AccessToken | null,
): Promise<void> => {
  const now = new Date().toISOString()

  const refreshToken = token.refresh_token ?? previous?.refreshToken ?? undefined

  await saveStoredAccessToken(db, {
    userId,
    provider,
    encryptedAccessToken: encryptString(
      JSON.stringify({
        accessToken: token.access_token,
        refreshToken,
      }),
    ),
    expiresAt:
      typeof token.expires_in === "number"
        ? Date.now() + token.expires_in * 1000
        : (previous?.stored.expiresAt ?? undefined),
    createdAt: previous?.stored.createdAt ?? now,
    updatedAt: now,
  })
}
