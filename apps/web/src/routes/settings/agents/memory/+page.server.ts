import { AGENT_MEMORY_MAX_ROWS } from '@oryxel/ai/server'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => ({
  agentMemoryMaxRows: AGENT_MEMORY_MAX_ROWS,
})
