import { AGENT_MEMORY_MAX_ROWS } from '@oryxel/ai'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => ({
  agentMemoryMaxRows: AGENT_MEMORY_MAX_ROWS,
})
