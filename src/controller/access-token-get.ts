import { z } from "zod"
import type { Db } from "mongodb"

import { decryptString } from "../infrastructure/security/crypto.js"
import { getAccessToken as getStoredAccessToken } from "../infrastructure/db/access-token-get.js"
import type { Provider, StoredAccessToken } from "../libs/db.js"
import { tryCatch } from "../libs/result.js"

const AccessTokenPayloadSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
})

export type AccessTokenGetDependencies = {
  db: Db
}

export type AccessToken = {
  stored: StoredAccessToken
  accessToken: string
  refreshToken?: string
}

export const getAccessToken = async (
  { db }: AccessTokenGetDependencies,
  userId: string,
  provider: Provider,
): Promise<AccessToken | null> => {
  const stored = await getStoredAccessToken(db, userId, provider)
  if (stored == null) {
    return null
  }

  const payload = tryCatch(() => JSON.parse(decryptString(stored.encryptedAccessToken)))
  if (!payload.ok) {
    return null
  }
  const parsed = AccessTokenPayloadSchema.safeParse(payload.data)
  if (!parsed.success) {
    return null
  }
  return {
    stored,
    accessToken: parsed.data.accessToken,
    refreshToken: parsed.data.refreshToken ?? undefined,
  }
}
