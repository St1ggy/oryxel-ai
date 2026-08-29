import { configureDatabase } from '@oryxel/db'

import { env } from '$env/dynamic/private'

configureDatabase(env.DATABASE_URL)

export { db, withUserDataLock } from '@oryxel/db'
