import { MongoServerError, type Db } from "mongodb"

import type { NotificationClaim } from "../../libs/db.js"
import { err, gen, tryCatchAsync } from "../../libs/result.js"

export const claimNotification = (db: Db, key: string, leaseMs = 5 * 60 * 1000) =>
  gen(async function* () {
    const now = new Date()
    const leaseUntil = new Date(now.getTime() + leaseMs)

    const claims = db.collection<NotificationClaim>("notification_claims")
    const inserted = await tryCatchAsync(() =>
      claims.insertOne({ key, status: "processing", claimedAt: now, leaseUntil }),
    )
    if (inserted.ok) {
      return true
    }
    if (!(inserted.err instanceof MongoServerError && inserted.err.code === 11000)) {
      yield* err(inserted.err)
    }

    const existing = yield* await tryCatchAsync(() => claims.findOne({ key }))
    if (existing == null || existing.status === "sent" || existing.leaseUntil > now) {
      return false
    }

    const replaced = yield* await tryCatchAsync(() =>
      claims.findOneAndUpdate(
        { key, status: "processing", leaseUntil: { $lte: now } },
        { $set: { claimedAt: now, leaseUntil } },
        { returnDocument: "after" },
      ),
    )
    return replaced != null
  })
