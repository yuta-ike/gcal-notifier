export const promiseAllObject = async <Obj extends Record<PropertyKey, unknown>>(
  input: Obj,
): Promise<{ [Key in keyof Obj]: Awaited<Obj[Key]> }> => {
  const entries = Object.entries(input)
  const results = await Promise.all(entries.map(([, maybePromise]) => maybePromise))

  return Object.fromEntries(
    entries.map(([key], i) => {
      return [key, results[i]!]
    }),
  ) as { [Key in keyof Obj]: Awaited<Obj[Key]> }
}
