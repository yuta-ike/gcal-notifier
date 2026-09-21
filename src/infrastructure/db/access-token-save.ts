import type { Db } from "mongodb"

import type { StoredAccessToken } from "../../libs/db.js"

export const saveAccessToken = async (db: Db, token: StoredAccessToken): Promise<void> => {
  await db
    .collection<StoredAccessToken>("access_tokens")
    .updateOne(
      { userId: token.userId, provider: token.provider },
      { $set: token },
      { upsert: true },
    )
}
