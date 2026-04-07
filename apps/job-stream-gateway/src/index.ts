// SSE gateway on Railway: JWT auth, Redis SUBSCRIBE job:{id}, snapshots via getJob.

import { getJob } from '@oryxel/ai'
import Redis from 'ioredis'
import { jwtVerify } from 'jose'
import { createServer } from 'node:http'
import { URL } from 'node:url'

import type { IncomingMessage, ServerResponse } from 'node:http'

const PORT = Number.parseInt(process.env.PORT ?? '3333', 10)
const JWT_SECRET = process.env.JOB_STREAM_JWT_SECRET
const REDIS_URL = process.env.REDIS_URL
const CORS_ORIGIN = process.env.STREAM_CORS_ORIGIN?.trim() || '*'

if (!JWT_SECRET || !REDIS_URL) {
  console.error('[job-stream-gateway] JOB_STREAM_JWT_SECRET and REDIS_URL are required')
  // eslint-disable-next-line unicorn/no-process-exit -- fail fast before listen(); not a CLI tool
  process.exit(1)
}

const secretKey = new TextEncoder().encode(JWT_SECRET)

function corsHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (CORS_ORIGIN !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

function sendJson(serverResponse: ServerResponse, status: number, body: object) {
  serverResponse.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders(),
  })
  serverResponse.end(JSON.stringify(body))
}

function sendSse(serverResponse: ServerResponse, data: unknown) {
  serverResponse.write(`data: ${JSON.stringify(data)}\n\n`)
}

function isTerminal(status: string) {
  return status === 'done' || status === 'failed' || status === 'cancelled'
}

async function handleStream(request: IncomingMessage, serverResponse: ServerResponse): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const token = requestUrl.searchParams.get('token')

  if (!token) {
    sendJson(serverResponse, 401, { error: 'missing_token' })

    return
  }

  let userId: string
  let jobId: number

  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
    const subject = payload.sub

    if (!subject || typeof subject !== 'string') {
      sendJson(serverResponse, 401, { error: 'invalid_token' })

      return
    }

    userId = subject
    const rawId = payload.jobId

    if (rawId === undefined || rawId === null) {
      sendJson(serverResponse, 401, { error: 'invalid_token' })

      return
    }

    jobId = typeof rawId === 'number' ? rawId : Number.parseInt(String(rawId), 10)

    if (!Number.isFinite(jobId)) {
      sendJson(serverResponse, 401, { error: 'invalid_token' })

      return
    }
  } catch {
    sendJson(serverResponse, 401, { error: 'invalid_token' })

    return
  }

  const jobIdParameter = requestUrl.searchParams.get('jobId')

  if (jobIdParameter !== null && jobIdParameter !== '') {
    const parsed = Number.parseInt(jobIdParameter, 10)

    if (!Number.isFinite(parsed) || parsed !== jobId) {
      sendJson(serverResponse, 403, { error: 'job_mismatch' })

      return
    }
  }

  const snapshot = await getJob(jobId, userId)

  if (!snapshot) {
    sendJson(serverResponse, 403, { error: 'forbidden' })

    return
  }

  serverResponse.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
    ...corsHeaders(),
  })

  if (typeof (serverResponse as { flushHeaders?: () => void }).flushHeaders === 'function') {
    ;(serverResponse as { flushHeaders: () => void }).flushHeaders()
  }

  sendSse(serverResponse, snapshot)

  if (isTerminal(snapshot.status)) {
    serverResponse.end()

    return
  }

  const redisSub = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 })
  const channel = `job:${jobId}`

  const cleanup = async () => {
    try {
      await redisSub.unsubscribe(channel)
    } catch {
      /* ignore */
    }

    try {
      redisSub.disconnect()
    } catch {
      /* ignore */
    }
  }

  request.on('close', () => {
    void cleanup()
  })

  redisSub.on('error', (error) => {
    console.error('[job-stream-gateway] redis sub error:', error instanceof Error ? error.message : error)
    void cleanup()

    try {
      serverResponse.end()
    } catch {
      /* ignore */
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ioredis (channel, message) arity
  redisSub.on('message', (ch, _payload) => {
    if (ch !== channel) {
      return
    }

    void (async () => {
      const next = await getJob(jobId, userId)

      if (!next) {
        await cleanup()

        try {
          serverResponse.end()
        } catch {
          /* ignore */
        }

        return
      }

      sendSse(serverResponse, next)

      if (isTerminal(next.status)) {
        await cleanup()

        try {
          serverResponse.end()
        } catch {
          /* ignore */
        }
      }
    })()
  })

  await redisSub.subscribe(channel)
}

const server = createServer((request, serverResponse) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'OPTIONS') {
    serverResponse.writeHead(204, corsHeaders())
    serverResponse.end()

    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/health') {
    serverResponse.writeHead(200, { 'content-type': 'text/plain' })
    serverResponse.end('ok')

    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/stream') {
    void handleStream(request, serverResponse)

    return
  }

  serverResponse.writeHead(404)
  serverResponse.end()
})

server.listen(PORT, () => {
  console.log(`[job-stream-gateway] listening on :${PORT}`)
})
