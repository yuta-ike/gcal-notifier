import test from "node:test"
import assert from "node:assert/strict"

import { createOAuthState, decryptString, encryptString, verifyOAuthState } from "./crypto.js"

const secret = "test-secret-that-is-long-enough"

test("encrypts and authenticates token data", () => {
  const encrypted = encryptString("refresh-token:秘密", secret)
  assert.notEqual(encrypted, "refresh-token:秘密")
  assert.equal(decryptString(encrypted, secret), "refresh-token:秘密")
  assert.throws(() => decryptString(`${encrypted}x`, secret), /Invalid encrypted value/)
  assert.throws(() => decryptString(encrypted, "another-secret"), /Invalid encrypted value/)
})

test("signs OAuth state for one user and provider", () => {
  process.env.APP_ENCRYPTION_KEY = secret
  const state = createOAuthState({ userId: "user-1", provider: "google" })
  assert.equal(verifyOAuthState(state, { userId: "user-1", provider: "google" }).userId, "user-1")
  assert.throws(
    () => verifyOAuthState(state, { userId: "user-2", provider: "google" }),
    /Invalid OAuth state/,
  )
  assert.throws(
    () => verifyOAuthState(state, { userId: "user-1", provider: "other" }),
    /Invalid OAuth state/,
  )
})
