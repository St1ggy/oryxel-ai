import { db, userAgentMemory } from '@oryxel/db'
import { desc, eq } from 'drizzle-orm'

/** Matches API / Zod caps for agent memory rows per user. */
export const AGENT_MEMORY_MAX_ROWS = 20

export type AgentMemoryEntryRow = { id: number; content: string }

export async function listAgentMemoryEntriesForUser(userId: string): Promise<AgentMemoryEntryRow[]> {
  return db
    .select({ id: userAgentMemory.id, content: userAgentMemory.content })
    .from(userAgentMemory)
    .where(eq(userAgentMemory.userId, userId))
    .orderBy(desc(userAgentMemory.updatedAt))
    .limit(AGENT_MEMORY_MAX_ROWS)
}
