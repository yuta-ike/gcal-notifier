import { z } from "zod"

const BearerTokenInputSchema = z.object({
  authorization: z.string().optional(),
  expectedToken: z.string().min(1).optional(),
})

export const matchesBearerToken = (
  authorization: string | undefined,
  expectedToken: string | undefined,
) => {
  const parsed = BearerTokenInputSchema.safeParse({ authorization, expectedToken })
  return parsed.success && parsed.data.authorization === `Bearer ${parsed.data.expectedToken}`
}
