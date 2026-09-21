import type { Db } from "mongodb"

import type { NotificationClaim } from "../../libs/db.js"

export const releaseNotification = (db: Db, key: string) =>
  db.collection<NotificationClaim>("notification_claims").deleteOne({
    key,
    status: "processing",
  })
