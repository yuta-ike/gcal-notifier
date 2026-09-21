import type { Db } from "mongodb"

import type { Provider, StoredAccessToken } from "../../libs/db.js"

export const deleteAccessToken = (db: Db, userId: string, provider: Provider) =>
  db.collection<StoredAccessToken>("access_tokens").deleteOne({ userId, provider })
