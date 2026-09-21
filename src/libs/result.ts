const __result: unique symbol = Symbol()
export type Result<TData = unknown, TErr extends Error = Error> =
  | {
      ok: true
      data: TData
      err?: undefined
      [__result]: undefined
      [Symbol.asyncIterator]: () => Generator<Result<unknown, TErr>, TData>
    }
  | {
      ok: false
      data?: undefined
      err: TErr
      [__result]: undefined
      [Symbol.asyncIterator]: () => Generator<Result<unknown, TErr>, TData>
    }

export type Ok<TResult extends Result> = (TResult & { ok: true })["data"]
export type Err<TResult extends Result> = (TResult & { ok: false })["err"]

export const ok = <TData>(value: TData): Result<TData, never> => {
  const res: Result<TData, never> = {
    ok: true,
    data: value,
    [__result]: undefined,
    // oxlint-disable-next-line require-yield
    [Symbol.asyncIterator]: function* () {
      return value
    },
  }
  return res
}

export const err = <TErr extends Error>(err: TErr): Result<never, TErr> => {
  const res: Result<never, TErr> = {
    ok: false,
    err,
    [__result]: undefined,
    [Symbol.asyncIterator]: function* () {
      yield res
      throw new Error("Panic")
    },
  }
  return res
}

export const unwrap = <TResult extends Result>(result: TResult): Ok<TResult> => {
  if (result.ok) {
    return result.data
  }
  throw result.err
}

export const gen = async <TReturn, TErr extends Error>(
  callback: () => AsyncGenerator<Result<unknown, TErr>, TReturn>,
): Promise<Result<TReturn, TErr>> => {
  let generator = callback()
  let value: any
  while (true) {
    const iterRes = await generator.next(value)
    if (iterRes.done === true) {
      return ok(iterRes.value)
    }

    if (iterRes.value != null && typeof iterRes.value === "object" && __result in iterRes.value) {
      const result = iterRes.value as Result<unknown, TErr>
      if (result.ok) {
        value = result.data
      } else {
        return err(result.err)
      }
    } else {
      value = iterRes.value
    }
  }
}

// Utilities
export function tryCatch<TReturn>(tryCallback: () => TReturn): Result<TReturn, Error>
export function tryCatch<TReturn, TErr extends Error>(
  tryCallback: () => TReturn,
  catchCallback: (err: unknown) => TErr,
): Result<TReturn, TErr>
export function tryCatch(
  tryCallback: () => any,
  catchCallback?: (err: unknown) => any,
): Result<any, any> {
  try {
    return ok(tryCallback())
  } catch (e) {
    return err((catchCallback ?? toError)(e))
  }
}

export async function tryCatchAsync<TReturn>(
  tryCallback: () => Promise<TReturn>,
): Promise<Result<TReturn, Error>>
export async function tryCatchAsync<TReturn, TErr extends Error>(
  tryCallback: () => Promise<TReturn>,
  catchCallback: (err: unknown) => TErr,
): Promise<Result<TReturn, TErr>>
export async function tryCatchAsync(
  tryCallback: () => Promise<any>,
  catchCallback?: (err: unknown) => any,
): Promise<Result<any, any>> {
  try {
    return ok(await tryCallback())
  } catch (e) {
    return err((catchCallback ?? toError)(e))
  }
}

export const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

export const when = <TData, TErr extends Error, TDataMapped, TErrMapped>(
  result: Result<TData, TErr>,
  mapFn: {
    ok: (data: TData) => TDataMapped
    err: (err: TErr) => TErrMapped
  },
): TDataMapped | TErrMapped => {
  if (result.ok) {
    return mapFn.ok(result.data)
  } else {
    return mapFn.err(result.err)
  }
}
