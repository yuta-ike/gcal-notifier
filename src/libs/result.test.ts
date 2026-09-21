import test from "node:test"
import assert from "node:assert/strict"

import {
  err,
  gen,
  ok,
  tryCatch,
  tryCatchAsync,
  unwrap,
  type Err,
  type Ok,
  type Result,
} from "./result.js"

test("unwraps successful and failed results", () => {
  const success: Result<number> = ok(42)
  const value: Ok<typeof success> = unwrap(success)
  assert.equal(value, 42)

  const failure = err(new Error("failed"))
  assert.ok(failure.err)
  const error: Err<typeof failure> = failure.err
  assert.equal(error.message, "failed")
  assert.throws(() => unwrap(failure), /failed/)
})

test("propagates results through an async generator", async () => {
  const success = await gen(async function* () {
    const one = yield* ok(1)
    const two = yield* ok(2)
    return one + two
  })
  assert.equal(success.ok, true)
  if (success.ok) {
    assert.equal(success.data, 3)
  }

  const failure = await gen(async function* () {
    yield* err(new Error("failed"))
    return 0
  })
  assert.equal(failure.ok, false)
  if (!failure.ok) {
    assert.equal(failure.err.message, "failed")
  }
})

test("converts synchronous exceptions into errors", () => {
  const success = tryCatch(
    () => 42,
    (error) => new Error(String(error)),
  )
  assert.equal(success.ok, true)
  if (success.ok) {
    assert.equal(success.data, 42)
  }

  const failure = tryCatch(
    () => {
      throw new Error("failed")
    },
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )
  assert.equal(failure.ok, false)
})

test("converts asynchronous exceptions into errors", async () => {
  const success = await tryCatchAsync(async () => 42)
  assert.equal(success.ok, true)
  if (success.ok) {
    assert.equal(success.data, 42)
  }

  const failure = await tryCatchAsync(async () => {
    throw new Error("failed")
  })
  assert.equal(failure.ok, false)
})
