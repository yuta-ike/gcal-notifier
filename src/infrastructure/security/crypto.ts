import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import { z } from "zod"
import { tryCatch } from "../../libs/result.js"

const AES_ALGORITHM = "aes-256-gcm"
const AES_IV_BYTES = 12
const AES_AUTH_TAG_BYTES = 16
const HMAC_ALGORITHM = "sha256"
const HMAC_BYTES = 32
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
const MAX_SERIALIZED_VALUE_LENGTH = 4096

export type OAuthStatePayload = {
  userId: string
  provider: string
  expiresAt: number
}

const Base64UrlSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]*$/)
  .refine((value) => value.length % 4 !== 1)
  .refine((value) => Buffer.from(value, "base64url").toString("base64url") === value)

const EncryptedPartsSchema = z
  .string()
  .min(1)
  .max(MAX_SERIALIZED_VALUE_LENGTH)
  .transform((value) => value.split("."))
  .pipe(z.tuple([Base64UrlSchema.min(1), Base64UrlSchema.min(1), Base64UrlSchema]))

const OAuthStatePayloadSchema = z.object({
  userId: z.string().min(1).max(512),
  provider: z.string().min(1).max(512),
  expiresAt: z.number().int().refine(Number.isSafeInteger),
})

const OAuthStatePartsSchema = z
  .string()
  .min(1)
  .max(MAX_SERIALIZED_VALUE_LENGTH)
  .transform((value) => value.split("."))
  .pipe(z.tuple([Base64UrlSchema.min(1), Base64UrlSchema.min(1)]))

const getAppEncryptionKey = (): string => {
  const secret = process.env.APP_ENCRYPTION_KEY

  if (!secret) {
    throw new Error("APP_ENCRYPTION_KEY is required")
  }

  return secret
}

const deriveEncryptionKey = (secret = getAppEncryptionKey()): Buffer => {
  if (secret.length === 0) {
    throw new Error("APP_ENCRYPTION_KEY must not be empty")
  }

  return createHash(HMAC_ALGORITHM).update(secret, "utf8").digest()
}

const encodeBase64Url = (value: Buffer): string => value.toString("base64url")

const decodeBase64Url = (value: string): Buffer => Buffer.from(value, "base64url")

const invalidEncryptedValue = (): Error => new Error("Invalid encrypted value")

export const encryptString = (plaintext: string, secret?: string): string => {
  const key = deriveEncryptionKey(secret)
  const iv = randomBytes(AES_IV_BYTES)
  const cipher = createCipheriv(AES_ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [encodeBase64Url(iv), encodeBase64Url(authTag), encodeBase64Url(ciphertext)].join(".")
}

const decryptStringUnsafe = (encrypted: string, secret?: string): string => {
  const [ivPart, authTagPart, ciphertextPart] = EncryptedPartsSchema.parse(encrypted)

  const iv = decodeBase64Url(ivPart)
  const authTag = decodeBase64Url(authTagPart)
  const ciphertext = decodeBase64Url(ciphertextPart)

  if (iv.length !== AES_IV_BYTES || authTag.length !== AES_AUTH_TAG_BYTES) {
    throw invalidEncryptedValue()
  }

  const decipher = createDecipheriv(AES_ALGORITHM, deriveEncryptionKey(secret), iv)

  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return plaintext.toString("utf8")
}

export const decryptString = (encrypted: string, secret?: string): string => {
  const result = tryCatch(() => decryptStringUnsafe(encrypted, secret))
  if (!result.ok) {
    // Do not expose whether parsing, key setup, or authentication failed.
    throw invalidEncryptedValue()
  }
  return result.data
}

const invalidOAuthState = (): Error => new Error("Invalid OAuth state")

const validatePayload = (payload: OAuthStatePayload): void => {
  if (!OAuthStatePayloadSchema.safeParse(payload).success) {
    throw invalidOAuthState()
  }
}

const validateExpiry = (expiresAt: number, now: number): void => {
  const schema = z.number().int().refine(Number.isSafeInteger).gt(now)
  if (!schema.safeParse(expiresAt).success) {
    throw invalidOAuthState()
  }
}

const oauthStateSigningInput = (encodedPayload: string): string =>
  `oauth-state.v1.${encodedPayload}`

const createOAuthStateToken = (payload: OAuthStatePayload): string => {
  validatePayload(payload)
  validateExpiry(payload.expiresAt, Date.now())

  const encodedPayload = encodeBase64Url(Buffer.from(JSON.stringify(payload), "utf8"))
  const signature = createHmac(HMAC_ALGORITHM, deriveEncryptionKey())
    .update(oauthStateSigningInput(encodedPayload), "ascii")
    .digest()

  return `${encodedPayload}.${encodeBase64Url(signature)}`
}

export const createOAuthState = ({
  userId,
  provider,
}: {
  userId: string
  provider: string
}): string => {
  return createOAuthStateToken({
    userId,
    provider,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  })
}

const parseOAuthState = (state: string): OAuthStatePayload => {
  const [encodedPayload, encodedSignature] = OAuthStatePartsSchema.parse(state)

  const signature = decodeBase64Url(encodedSignature)
  if (signature.length !== HMAC_BYTES) {
    throw invalidOAuthState()
  }

  const expectedSignature = createHmac(HMAC_ALGORITHM, deriveEncryptionKey())
    .update(oauthStateSigningInput(encodedPayload), "ascii")
    .digest()

  if (!timingSafeEqual(signature, expectedSignature)) {
    throw invalidOAuthState()
  }

  const decodedPayload = tryCatch(() =>
    JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")),
  )
  if (!decodedPayload.ok) {
    throw invalidOAuthState()
  }

  const parsed = OAuthStatePayloadSchema.safeParse(decodedPayload.data)
  if (!parsed.success) {
    throw invalidOAuthState()
  }

  return parsed.data
}

const verifyOAuthStateUnsafe = (
  state: string,
  { userId, provider }: { userId: string; provider: string },
): OAuthStatePayload => {
  const payload = parseOAuthState(state)
  validateExpiry(payload.expiresAt, Date.now())
  if (payload.userId !== userId || payload.provider !== provider) {
    throw invalidOAuthState()
  }
  return payload
}

export const verifyOAuthState = (
  state: string,
  { userId, provider }: { userId: string; provider: string },
): OAuthStatePayload => {
  const result = tryCatch(() => verifyOAuthStateUnsafe(state, { userId, provider }))
  if (!result.ok) {
    throw invalidOAuthState()
  }
  return result.data
}
