import test from "node:test"
import assert from "node:assert/strict"

import { collectPages } from "./pagination.js"

await test("collects all pages through one cursor abstraction", async () => {
  const pages: Array<{ values: number[]; cursor: string | undefined }> = [
    { values: [1, 2], cursor: "next" },
    { values: [3], cursor: undefined },
  ]
  const calls: Array<string | undefined> = []

  const values = await collectPages(
    async (cursor): Promise<{ values: number[]; cursor: string | undefined }> => {
      calls.push(cursor)
      return pages[calls.length - 1] ?? { values: [], cursor: undefined }
    },
    (page) => page.values,
    (page) => page.cursor,
  )

  assert.deepEqual(values, [1, 2, 3])
  assert.deepEqual(calls, [undefined, "next"])
})
