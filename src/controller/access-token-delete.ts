import type { Db } from "mongodb"

import { deleteAccessToken as deleteStoredAccessToken } from "../infrastructure/db/access-token-delete.js"
import type { Provider } from "../libs/db.js"

export type AccessTokenDeleteDependencies = {
  db: Db
}

export const deleteAccessToken = (
  { db }: AccessTokenDeleteDependencies,
  userId: string,
  provider: Provider,
) => deleteStoredAccessToken(db, userId, provider)
