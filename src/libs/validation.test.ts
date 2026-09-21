import test from "node:test"
import assert from "node:assert/strict"

import { matchesBearerToken } from "./validation.js"

test("matches only the configured bearer token", () => {
  assert.equal(matchesBearerToken("Bearer secret", "secret"), true)
  assert.equal(matchesBearerToken("Bearer wrong", "secret"), false)
  assert.equal(matchesBearerToken(undefined, undefined), false)
})
