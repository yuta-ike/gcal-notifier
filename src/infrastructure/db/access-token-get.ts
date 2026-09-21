import type { Db } from "mongodb"

import type { Provider, StoredAccessToken } from "../../libs/db.js"

export const getAccessToken = (db: Db, userId: string, provider: Provider) =>
  db.collection<StoredAccessToken>("access_tokens").findOne({ userId, provider })
