# CLAUDE.md — project instructions for Claude

## Взаимная синхронизация правил и памяти (Cursor ↔ Claude)

Любой агент, который меняет **правила** или **память проекта**, обязан не оставлять один источник правды устаревшим.

### Канонические места

| Место                     | Назначение                                                                 |
| ------------------------- | -------------------------------------------------------------------------- |
| **`CLAUDE.md`**           | Инструкции для Claude и инструментов, которые читают этот файл             |
| **`.cursor/rules/*.mdc`** | Правила Cursor; **`memory.mdc`** — живая память и решения                  |
| **`AGENTS.md`**           | Если дублирует базовый контекст с `CLAUDE.md` — держать тем же содержанием |

### Обязательные действия при правках

1. Изменил **`.cursor/rules/`** (включая `memory.mdc`, `context.mdc`) — обнови соответствующий смысл в **`CLAUDE.md`** (разделы ниже или краткая пометка в конце с датой).
2. Изменил **`CLAUDE.md`** в части архитектуры, правил или памяти — обнови соответствующие **`.cursor/rules/*.mdc`**.
3. Новые архитектурные решения: запись в **`memory.mdc`** и то же по сути в **`CLAUDE.md`** (раздел с памятью / тот же changelog), без противоречий.
4. Если **`AGENTS.md`** повторяет общий блок с `CLAUDE.md` — обнови **в одной сессии** вместе с `CLAUDE.md`.

Считай задачу незавершённой, пока правила и память не согласованы между этими файлами.

### English summary

Whenever you edit agent rules or living memory, update **both** `CLAUDE.md` **and** the matching `.cursor/rules/*.mdc` in the same change. Keep `AGENTS.md` aligned if it mirrors the same content.

---

## Project configuration (this repo: **oryxel-ai**)

- **Language:** TypeScript
- **Package manager:** bun
- **Add-ons:** prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter, devtools-json, drizzle, better-auth, mdsvex, paraglide, mcp

Prefer **bun** for scripts:

- `bun run dev` — dev server
- `bun run check` — `svelte-kit sync` + `svelte-check`
- `bun run lint` — prettier check + eslint
- `bun run format` — prettier write
- DB (Drizzle): `bun run db:push`, `bun run db:generate`, `bun run db:migrate`, `bun run db:studio`

> **Note:** Sections below mirror **`.cursor/rules/`** for **oryxel-ai**. After editing those `.mdc` files, regenerate or update this file to keep Cursor and Claude in sync.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths. When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections. After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions. You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code. After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

---

## Cursor rules (mirrored from `.cursor/rules/`)

The following blocks are copies of workspace rules (YAML frontmatter removed). Edit **both** here and the corresponding `.mdc` file per the synchronization section above.

### `context.mdc`

# oryxel-ai — Full AI Context

> Canonical reference. Other `.mdc` files add detail per topic.

---

## 1. Stack

| Layer           | Technology                                                               |
| --------------- | ------------------------------------------------------------------------ |
| Framework       | SvelteKit 2                                                              |
| UI              | Svelte 5 (runes)                                                         |
| Language        | TypeScript (strict)                                                      |
| CSS             | Tailwind CSS v4                                                          |
| ORM             | Drizzle ORM                                                              |
| DB client       | `@neondatabase/serverless` (HTTP driver in `src/lib/server/db/index.ts`) |
| Auth            | Better Auth + `drizzleAdapter`                                           |
| i18n            | Paraglide.js (`project.inlang`, `messages/*.json`)                       |
| Tests           | Vitest, Playwright                                                       |
| Deploy          | `@sveltejs/adapter-vercel`                                               |
| Package manager | bun                                                                      |

---

## 2. Layout

```
src/
  routes/                 # SvelteKit routing
  lib/
    server/
      auth.ts             # betterAuth() config
      db/
        index.ts          # drizzle + neon
        schema.ts         # app tables; re-exports auth.schema
        auth.schema.ts    # Better Auth tables (regenerate via auth:schema)
    paraglide/            # generated by Paraglide (git may ignore; built on dev)
  hooks.server.ts         # paraglideMiddleware + Better Auth session → locals
  hooks.ts                # deLocalizeUrl
messages/                 # en, es, fr, jp, ru, zh
```

There is **no** `src/pages/` FSD tree in this starter — pages live under `src/routes/`.

---

## 3. Database (Drizzle)

- Schema: `src/lib/server/db/schema.ts`. Drizzle Kit: `drizzle.config.ts` → `schema: './src/lib/server/db/schema.ts'`.
- Use `import { db } from '$lib/server/db'` in server-only code.

```typescript
import { db } from '$lib/server/db'
import { task } from '$lib/server/db/schema'
import { eq } from 'drizzle-orm'

const rows = await db.select().from(task).where(eq(task.id, 1))
```

**Workflow:** `bun run db:push` for quick iteration; use `bun run db:generate` + `bun run db:migrate` when you want versioned migrations.

---

## 4. Auth (Better Auth)

- Config: `src/lib/server/auth.ts` — `database: drizzleAdapter(db, { provider: 'pg' })`, plugins include `sveltekitCookies(getRequestEvent)`.
- `hooks.server.ts` attaches `locals.user` / `locals.session` from `auth.api.getSession`.
- After auth schema changes: `bun run auth:schema`.

Typical private env vars (see `$env/dynamic/private` in code): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ORIGIN`, social OAuth vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`), and AI router vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `AI_ROUTER_PROVIDER_ORDER`).

---

## 5. Svelte 5 — critical rules

- Runes: `$state`, `$derived`, `$props`, `$effect` as needed.
- Page/load data: `import { page } from '$app/state'` and use `page.data` with the route’s `PageData` from `./$types` (or the correct relative `$types` path).
- `{@const}` only inside `{#each}`, `{#if}`, `{#snippet}` — not bare inside arbitrary elements.
- Avoid dynamic Tailwind class strings that JIT cannot see; use `style="..."` for variable colours.

---

## 6. API routes

```typescript
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized')
  return json({ ok: true })
}
```

Keep handlers thin; move repeated DB logic to `src/lib/server/` modules or repositories if the app grows.

---

## 7. i18n (Paraglide)

- Locales: `en`, `es`, `fr`, `jp`, `ru`, `zh` (see `project.inlang/settings.json`).
- Add keys to **all** locale JSON files together.
- Runtime imports: `$lib/paraglide/runtime`, server middleware: `$lib/paraglide/server`. Message functions are generated under `$lib/paraglide` per Paraglide setup.

---

## 8. Environment variables

```
DATABASE_URL
BETTER_AUTH_SECRET
ORIGIN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID
APPLE_CLIENT_SECRET
YANDEX_CLIENT_ID
YANDEX_CLIENT_SECRET
OPENAI_API_KEY
OPENAI_MODEL
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
GEMINI_API_KEY
GEMINI_MODEL
AI_ROUTER_PROVIDER_ORDER
AI_ROUTER_TIMEOUT_MS
AI_ROUTER_MAX_RETRIES
AI_ROUTER_MAX_ATTEMPTS
REDIS_URL
JOB_STREAM_JWT_SECRET
PUBLIC_JOB_STREAM_URL
STREAM_CORS_ORIGIN
```

`REDIS_URL` — worker + job-stream-gateway (Railway Redis). `JOB_STREAM_JWT_SECRET` — shared by web (stream-token) and gateway. `PUBLIC_JOB_STREAM_URL` — base URL of the gateway for browser `EventSource` (no trailing slash). `STREAM_CORS_ORIGIN` — gateway CORS (production web origin, or `*` for local).

**Railway (monorepo):** no root `railway.toml`. Worker and job-stream-gateway each have `apps/<service>/railway.toml` with **RAILPACK**, `bun install --frozen-lockfile` from repo root, and a service-specific `startCommand`. In Railway UI: **Root directory** = repository root; **Config file** = that path per service.

Extend this list in **`memory.mdc`** and here when new features add secrets.

---

## 9. Mandatory workflow

**Before code changes (if using git):** `git pull --rebase`.

**After code changes:**

```bash
bunx eslint --fix <changed-files>
bun run check
```

---

## 10. Key decisions log

| Date       | Decision                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 2026-03-30 | Workspace rules retargeted to **oryxel-ai** (Drizzle + Better Auth + `src/routes/`).               |
| 2026-03-31 | Added AI router + critical-confirm baseline and mandatory social auth guard (Google/Apple/Yandex). |

### `memory.mdc`

# oryxel-ai — project memory

> **For AI:** After a new architectural decision or convention change, add a dated entry. Keep **`context.mdc`** aligned for stack-wide facts.

---

## 2026-03-30 — Rules aligned with oryxel-ai

### What changed

- `.cursor/rules/` describe **oryxel-ai**: SvelteKit, Drizzle, Better Auth, Paraglide, `src/routes/`, `src/lib/server/db/` (not a Prisma/media `src/pages/` FSD app).

### Why

- Single source of truth matches the repository the agents actually edit.

---

## 2026-03-31 — AI router and mandatory social auth baseline

### What changed

- Added a provider-agnostic AI router skeleton (OpenAI, Anthropic, Gemini), strict Zod contracts, critical-confirm flow, pending patch/audit DB tables, and apply pipeline.
- Added mandatory auth gate for diary/profile routes and login route with Google/Apple/Yandex social flow.
- Expanded environment variable contract for social providers and AI router settings.

### Why

- Product now relies on AI-generated structured updates and explicit confirmation for critical changes.
- Diary/profile access must be protected behind authentication for MVP requirements.

---

## Template for new entries

```
## YYYY-MM-DD — Short title

### What changed
- ...

### Why
- ...
```

### `project-overview.mdc`

# oryxel-ai — project overview

## Stack

| Layer           | Technology                                                              |
| --------------- | ----------------------------------------------------------------------- |
| Framework       | SvelteKit 2 + Svelte 5 (runes)                                          |
| Language        | TypeScript                                                              |
| CSS             | Tailwind CSS v4                                                         |
| ORM             | Drizzle ORM                                                             |
| Database        | PostgreSQL via `@neondatabase/serverless`                               |
| Auth            | Better Auth + `drizzleAdapter` (GitHub + email/password in demo config) |
| i18n            | Paraglide.js (inlang)                                                   |
| Tests           | Vitest, Playwright                                                      |
| Adapter         | Vercel                                                                  |
| Package manager | bun                                                                     |

## Repository layout

- **Routes & pages:** `src/routes/` (`+page.svelte`, `+page.server.ts`, layouts, `+server.ts`).
- **Server:** `src/lib/server/auth.ts`, `src/lib/server/db/` (`index.ts`, `schema.ts`, `auth.schema.ts`).
- **Hooks:** `src/hooks.server.ts` (Paraglide + Better Auth), `src/hooks.ts` (URL de-localization).
- **Messages:** `messages/{en,es,fr,jp,ru,zh}.json` — see `project.inlang/settings.json` for locale list.

## Scripts (prefer bun)

See `package.json`: `dev`, `build`, `check`, `lint`, `format`, `test`, `db:push` / `db:generate` / `db:migrate` / `db:studio`, `auth:schema`.

### `workflow.mdc`

# Workflow — mandatory steps

## Before ANY code change

**Always pull first** so you work against the latest remote state:

```bash
git pull --rebase
```

Run this at the start of a session or before editing files. Avoids conflicts and ensures pushes don't get rejected.

---

## After EVERY code change

Execute **in this exact order**:

### 1. ESLint autofix

```bash
bunx eslint --fix <changed files>
```

Run only on changed files (not the whole project — too slow):

```bash
# Example
bunx eslint --fix src/routes/+page.svelte src/lib/server/db/schema.ts
```

### 2. Type-check

```bash
bun run check
# Equivalent: svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
```

Catches TypeScript errors in `.svelte` files that `tsc` alone cannot see.

## Fixing found errors

| Error type                      | Action                                          |
| ------------------------------- | ----------------------------------------------- |
| Prettier / formatting           | `bunx eslint --fix` will auto-fix               |
| Import order                    | `bunx eslint --fix` will auto-fix               |
| TypeScript type error           | Fix manually, then re-run `bun run check`       |
| Svelte `{@const}` outside block | Move inside `{#each}` / `{#if}`                 |
| Tailwind dynamic class purge    | Replace with `style="..."` using a CSS variable |

## Project commands

```bash
bun run dev          # dev server
bun run check        # svelte-check
bun run lint         # prettier + eslint
bun run build        # production build

bun run db:push      # Drizzle — push schema (dev)
bun run db:generate  # generate SQL migrations
bun run db:migrate   # apply migrations
bun run db:studio    # Drizzle Studio

bun run auth:schema  # regenerate Better Auth Drizzle schema
```

### `svelte-patterns.mdc`

# Svelte 5 — patterns and restrictions

## Runes — mandatory

```svelte
<script lang="ts">
  // ✅ Svelte 5 runes
  let count = $state(0)
  const double = $derived(count * 2)
  const { title, items = [] }: Props = $props()

  // ❌ Do NOT use Svelte 4 store syntax
  // import { writable } from 'svelte/store'
</script>
```

## Page data

```svelte
<script lang="ts">
  import { page } from '$app/state'
  import type { PageData } from './$types'

  const data = page.data as PageData
</script>
```

Use the correct relative import to `$types` for each route file (e.g. `../$types` from a nested component only if that file’s relative path resolves to the route’s generated types).

## {@const} — only inside block tags

```svelte
<!-- ✅ Correct — first child of {#each} -->
{#each items as item (item.id)}
  {@const label = item.title.toUpperCase()}
  <div>{label}</div>
{/each}

<!-- ❌ Wrong — inside an arbitrary element -->
<div>
  {@const label = item.title}
</div>
```

## Dynamic CSS classes — prefer inline style for variable colours

Tailwind JIT may omit dynamically built class names. Use `style=` when the value comes from a variable.

```svelte
<!-- ❌ Risky — dynamic fragment may be purged -->
<div class="rounded-full {dynamicClass}">

<!-- ✅ Inline style for variable colour -->
<div class="rounded-full" style="background-color: {bg}">
```

## Lucide icons (if using `@lucide/svelte`)

Prefer current icon paths (e.g. `circle-check`, `circle-play`) over deprecated names that lack proper typings.

## Navigation

```svelte
import {(onNavigate, beforeNavigate, afterNavigate)} from '$app/navigation'
```

Use the View Transitions API only if the app layout enables it.

## HTML from untrusted sources

If you render HTML from users or external APIs, sanitize before `{@html ...}` (e.g. DOMPurify in a shared utility) and strip tags for plain previews.

### `ui-conventions.mdc`

# UI — conventions

> **oryxel-ai** is a starter: `$lib/components/ui` may not exist yet. When you add shadcn-svelte (or similar), follow these patterns.

## Select — prefer shadcn Select over native `<select>`

```svelte
import * as Select from '$lib/components/ui/select'

<Select.Root type="single" {value} onValueChange={(v) => (value = v)}>
  <Select.Trigger class="h-9 text-sm">
    {value ? labelFor(value) : 'Placeholder'}
  </Select.Trigger>
  <Select.Content>
    <Select.Item value="opt1" label="Option 1" />
  </Select.Content>
</Select.Root>
```

For a filter “all / none” option, use a sentinel such as `'__all__'`, not an ambiguous empty string:

```svelte
value={value || '__all__'}
onValueChange={(v) => (value = v === '__all__' ? '' : v)}
```

## Buttons — include hover states

```svelte
<!-- outline -->
<button class="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">

<!-- primary -->
<button class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">

<!-- destructive -->
<button class="rounded-md border border-destructive text-destructive hover:bg-destructive/10">
```

## Dynamic colours

Use `style="background-color: ..."` (or CSS variables) when the colour comes from data, not a dynamic Tailwind class string.

## Cards and links

For media-style cards: prefer a single interactive root (`<a>` or `<button>`) with `group`, predictable hover/focus styles, and accessible labels.

## Global CSS

Keep shared motion and focus styles in `src/routes/layout.css` (or your global stylesheet): short transitions on interactive elements, visible `:focus-visible` outlines.

### `i18n.mdc`

# Localisation (Paraglide.js)

## Supported languages (oryxel-ai)

Per `project.inlang/settings.json`: **`en`**, **`es`**, **`fr`**, **`jp`**, **`ru`**, **`zh`**.

## Rule: user-facing strings go through Paraglide

```svelte
<!-- ✅ Use generated message functions (path/name from your Paraglide build) -->
<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'
</script>

<!-- ❌ Never hardcode user-visible copy --><p>Welcome</p><p>{m.hello_world({ name: 'Ada' })}</p>
```

Adjust the import path if your compiler outputs a different module id (see `$lib/paraglide` after `bun run dev` / build).

## Adding a new key

Add the key to **all six** locale files at once:

```
messages/en.json
messages/es.json
messages/fr.json
messages/jp.json
messages/ru.json
messages/zh.json
```

`en` is the base locale. Keys are typically `snake_case`.

## Parameterised messages

```json
"greeting": "Hello, {name}!"
```

```svelte
{m.greeting({ name: userName })}
```

### `backend-patterns.mdc`

# Backend — patterns

## Database (Drizzle)

Use the shared client and schema:

```typescript
import { db } from '$lib/server/db'
import { task } from '$lib/server/db/schema'
```

Prefer typed queries. If routes grow, add modules under `src/lib/server/` (e.g. `repositories/`) and keep `+server.ts` / `+page.server.ts` thin.

## API routes — structure

```typescript
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized')

  const body = bodySchema.parse(await request.json())
  // use db ...
  return json({ ok: true })
}
```

## Zod — validation

Validate request bodies and search params where inputs are non-trivial. In Zod v4, `z.record` needs key and value schemas, e.g. `z.record(z.string(), z.string())`.

## Auth

Rely on `event.locals.user` / `event.locals.session` populated in `hooks.server.ts`. Do not skip session checks on protected endpoints.

## Schema and migrations

1. Edit `src/lib/server/db/schema.ts` (and run `bun run auth:schema` when Better Auth tables change).
2. `bun run db:generate` then `bun run db:migrate`, or `bun run db:push` during early prototyping.

Drizzle config: `drizzle.config.ts`. Connection: `DATABASE_URL`.
