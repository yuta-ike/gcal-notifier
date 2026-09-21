import { config } from "./config.js"
import { connectDatabase } from "./libs/db.js"

export const db = await connectDatabase(config.database)
