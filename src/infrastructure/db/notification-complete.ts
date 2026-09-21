import type { Db } from "mongodb"

import type { NotificationClaim } from "../../libs/db.js"

export const completeNotification = (db: Db, key: string) =>
  db
    .collection<NotificationClaim>("notification_claims")
    .updateOne({ key, status: "processing" }, { $set: { status: "sent", sentAt: new Date() } })
