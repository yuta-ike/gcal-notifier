import { MongoClient, type Db } from "mongodb"

import type { DatabaseConfig } from "../config.js"

export type Provider = "google"

export type StoredAccessToken = {
  userId: string
  provider: Provider
  encryptedAccessToken: string
  expiresAt?: number
  createdAt: string
  updatedAt: string
}

export type NotificationClaim = {
  key: string
  status: "processing" | "sent"
  claimedAt: Date
  leaseUntil: Date
  sentAt?: Date
}

export const connectDatabase = async ({ uri, name }: DatabaseConfig): Promise<Db> => {
  if (uri == null) {
    throw new Error("MONGODB_URI is required")
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2_000 })
  await client.connect()
  const db = client.db(name)
  await Promise.all([
    db
      .collection<StoredAccessToken>("access_tokens")
      .createIndex({ userId: 1, provider: 1 }, { unique: true }),
    db
      .collection<NotificationClaim>("notification_claims")
      .createIndex({ key: 1 }, { unique: true }),
    db
      .collection<NotificationClaim>("notification_claims")
      .createIndex({ sentAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),
  ])
  return db
}
