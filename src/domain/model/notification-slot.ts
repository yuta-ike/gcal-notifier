import { z } from "zod"

export const NotificationSlotSchema = z.union([z.literal(10), z.literal(18)])
export type NotificationSlot = z.infer<typeof NotificationSlotSchema>
