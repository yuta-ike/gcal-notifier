import { JAPAN_TIME_ZONE } from "./time.js"

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/

export const currentMonth = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: JAPAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(new Date())

export const normalizeMonth = (value: string): string =>
  monthPattern.test(value) ? value : currentMonth()

const shiftMonth = (month: string, offset: number): string => {
  const current = new Date(`${month}-01T00:00:00Z`)
  current.setUTCMonth(current.getUTCMonth() + offset)
  return current.toISOString().slice(0, 7)
}

export const getPrevMonth = (month: string): string => shiftMonth(month, -1)

export const getNextMonth = (month: string): string => shiftMonth(month, 1)

export const getMonthLabel = (month: string): string =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(new Date(`${month}-01T00:00:00Z`))

export const monthRange = (month: string) => ({
  timeMin: new Date(`${month}-01T00:00:00+09:00`).toISOString(),
  timeMax: new Date(`${getNextMonth(month)}-01T00:00:00+09:00`).toISOString(),
})
