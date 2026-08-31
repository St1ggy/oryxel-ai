// SSE gateway on Railway: JWT auth, Redis SUBSCRIBE job:{id}, snapshots via getJob.

import { getJob } from '@oryxel/ai/server'
import { checkDatabaseConnection, closeDatabase } from '@oryxel/db'
import { logError, logEvent, parseHealthCheckTimeout, resolveRequestId, runReadinessChecks } from '@oryxel/runtime'
import Redis from 'ioredis'
import { jwtVerify } from 'jose'
import { createServer } from 'node:http'
import { URL } from 'node:url'

import type { LogLevel } from '@oryxel/runtime'
import type { IncomingMessage, ServerResponse } from 'node:http'

const PORT = Number.parseInt(process.env.PORT ?? '3333', 10)
const CORS_ORIGIN = process.env.STREAM_CORS_ORIGIN?.trim() || '*'
const HEALTHCHECK_TIMEOUT_MS = parseHealthCheckTimeout(process.env.HEALTHCHECK_TIMEOUT_MS)

function requiredEnv(name: 'JOB_STREAM_JWT_SECRET' | 'REDIS_URL') {
  const value = process.env[name]?.trim()

  if (!value) throw new Error(`${name} is required`)

  return value
}

const JWT_SECRET = requiredEnv('JOB_STREAM_JWT_SECRET')
const REDIS_URL = requiredEnv('REDIS_URL')
const secretKey = new TextEncoder().encode(JWT_SECRET)
const healthRedis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true, protocol: 2 })
const activeStreamCleanups = new Set<() => Promise<void>>()
let isShuttingDown = false

healthRedis.on('error', (error) => {
  logError('job-stream-gateway', 'redis.client.error', error, { component: 'health' })
})

function corsHeaders() {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
    'Access-Control-Expose-Headers': 'X-Request-ID',
  }

  if (CORS_ORIGIN !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

function httpLogLevel(status: number): LogLevel {
  if (status >= 500) return 'error'

  if (status >= 400) return 'warn'

  return 'info'
}

function observeRequest(request: IncomingMessage, serverResponse: ServerResponse, path: string) {
  const logPath = ['/health', '/healthz', '/readyz', '/stream'].includes(path) ? path : 'unmatched'
  const header = request.headers['x-request-id']
  const requestId = resolveRequestId(Array.isArray(header) ? header[0] : header)
  const startedAt = performance.now()
  let logged = false

  serverResponse.setHeader('x-request-id', requestId)

  const writeLog = (status: string) => {
    if (logged) return

    logged = true

    if (
      serverResponse.statusCode >= 400 ||
      (logPath !== '/health' && logPath !== '/healthz' && logPath !== '/readyz')
    ) {
      logEvent(
        'job-stream-gateway',
        'http.request.completed',
        {
          requestId,
          method: request.method ?? 'UNKNOWN',
          path: logPath,
          status: serverResponse.statusCode,
          outcome: status,
          durationMs: Math.round(performance.now() - startedAt),
        },
        httpLogLevel(serverResponse.statusCode),
      )
    }
  }

  serverResponse.once('finish', () => writeLog('completed'))
  serverResponse.once('close', () => writeLog(serverResponse.writableEnded ? 'completed' : 'disconnected'))

  return { requestId, startedAt }
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

async function authorizeStream(requestUrl: URL) {
  const token = requestUrl.searchParams.get('token')

  if (!token) return { ok: false, error: 'missing_token', status: 401 } as const

  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
    const userId = payload.sub
    const rawJobId = payload.jobId

    if (!userId || typeof userId !== 'string' || rawJobId === undefined || rawJobId === null) {
      return { ok: false, error: 'invalid_token', status: 401 } as const
    }

    const jobId = typeof rawJobId === 'number' ? rawJobId : Number.parseInt(String(rawJobId), 10)
    const requestedJobId = requestUrl.searchParams.get('jobId')

    if (!Number.isFinite(jobId)) return { ok: false, error: 'invalid_token', status: 401 } as const

    if (requestedJobId !== null && requestedJobId !== '') {
      const parsed = Number.parseInt(requestedJobId, 10)

      if (!Number.isFinite(parsed) || parsed !== jobId) {
        return { ok: false, error: 'job_mismatch', status: 403 } as const
      }
    }

    return { ok: true, userId, jobId } as const
  } catch {
    return { ok: false, error: 'invalid_token', status: 401 } as const
  }
}

async function handleStream(
  request: IncomingMessage,
  serverResponse: ServerResponse,
  requestId: string,
  startedAt: number,
) {
  let requestClosed = serverResponse.destroyed

  serverResponse.once('close', () => {
    requestClosed = true
  })

  if (isShuttingDown) {
    sendJson(serverResponse, 503, { error: 'shutting_down' })

    return
  }

  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const authorization = await authorizeStream(requestUrl)

  if (requestClosed) return

  if (!authorization.ok) {
    sendJson(serverResponse, authorization.status, { error: authorization.error })

    return
  }

  const { userId, jobId } = authorization

  const snapshot = await getJob(jobId, userId)

  if (requestClosed) return

  if (isShuttingDown) {
    sendJson(serverResponse, 503, { error: 'shutting_down' })

    return
  }

  if (!snapshot) {
    sendJson(serverResponse, 403, { error: 'forbidden' })

    return
  }

  if (isTerminal(snapshot.status)) {
    serverResponse.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
      ...corsHeaders(),
    })
    sendSse(serverResponse, snapshot)
    logEvent('job-stream-gateway', 'stream.opened', { requestId, jobId })
    logEvent('job-stream-gateway', 'stream.closed', {
      requestId,
      jobId,
      status: snapshot.status,
      durationMs: Math.round(performance.now() - startedAt),
    })
    serverResponse.end()

    return
  }

  const redisSub = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, protocol: 2 })
  const channel = `job:${jobId}`
  let cleanupPromise: Promise<void> | undefined
  let streamClosed = false
  let initialized = false
  let snapshotRequested = false
  let snapshotRunner: Promise<void> | undefined

  const cleanup = () => {
    cleanupPromise ??= (async () => {
      try {
        redisSub.removeAllListeners()
        redisSub.disconnect()
      } catch {
        // The Redis connection may already be closed.
      } finally {
        activeStreamCleanups.delete(cleanup)
      }
    })()

    return cleanupPromise
  }

  activeStreamCleanups.add(cleanup)

  const logStreamClosed = (status: string, level: LogLevel = 'info') => {
    if (streamClosed) return

    streamClosed = true
    logEvent(
      'job-stream-gateway',
      'stream.closed',
      { requestId, jobId, status, durationMs: Math.round(performance.now() - startedAt) },
      level,
    )
  }

  serverResponse.once('close', () => {
    void cleanup()

    if (!serverResponse.writableEnded) logStreamClosed('disconnected', 'warn')
  })

  redisSub.on('error', (error) => {
    logError('job-stream-gateway', 'stream.redis.failed', error, { requestId, jobId })
    logStreamClosed('redis_error', 'error')
    void cleanup()

    if (serverResponse.headersSent && !serverResponse.writableEnded && !serverResponse.destroyed) {
      serverResponse.end()
    }
  })

  serverResponse.on('error', (error) => {
    logError('job-stream-gateway', 'stream.response.failed', error, { requestId, jobId })
    logStreamClosed('response_error', 'error')
    void cleanup()
  })

  const publishSnapshot = async () => {
    const next = await getJob(jobId, userId)

    if (!next) {
      await cleanup()
      logStreamClosed('missing', 'warn')

      if (!serverResponse.writableEnded && !serverResponse.destroyed) serverResponse.end()

      return
    }

    if (streamClosed || serverResponse.writableEnded || serverResponse.destroyed) return

    sendSse(serverResponse, next)

    if (isTerminal(next.status)) {
      await cleanup()
      logStreamClosed(next.status)

      if (!serverResponse.writableEnded && !serverResponse.destroyed) serverResponse.end()
    }
  }

  const handleSnapshotFailure = async (error: unknown) => {
    logError('job-stream-gateway', 'stream.snapshot.failed', error, { requestId, jobId })
    logStreamClosed('snapshot_error', 'error')
    await cleanup()

    if (!serverResponse.writableEnded && !serverResponse.destroyed) serverResponse.end()
  }

  const scheduleSnapshot = () => {
    snapshotRequested = true

    if (!initialized || snapshotRunner || streamClosed) return

    snapshotRunner = (async () => {
      while (snapshotRequested && !streamClosed) {
        snapshotRequested = false
        await publishSnapshot()
      }
    })()
      .catch(handleSnapshotFailure)
      .finally(() => {
        snapshotRunner = undefined

        if (snapshotRequested && !streamClosed) scheduleSnapshot()
      })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ioredis (channel, message) arity
  redisSub.on('message', (ch, _payload) => {
    if (ch !== channel) {
      return
    }

    scheduleSnapshot()
  })

  try {
    await redisSub.subscribe(channel)
  } catch (error) {
    await cleanup()
    throw error
  }

  if (streamClosed || serverResponse.destroyed) {
    await cleanup()

    return
  }

  let currentSnapshot: Awaited<ReturnType<typeof getJob>>

  try {
    currentSnapshot = await getJob(jobId, userId)
  } catch (error) {
    await cleanup()
    throw error
  }

  if (streamClosed || serverResponse.writableEnded || serverResponse.destroyed) {
    await cleanup()

    return
  }

  if (!currentSnapshot) {
    await cleanup()
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

  sendSse(serverResponse, currentSnapshot)
  logEvent('job-stream-gateway', 'stream.opened', { requestId, jobId })

  if (isTerminal(currentSnapshot.status)) {
    logStreamClosed(currentSnapshot.status)
    await cleanup()
    serverResponse.end()

    return
  }

  initialized = true

  if (snapshotRequested) scheduleSnapshot()
}

const server = createServer((request, serverResponse) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const requestContext = observeRequest(request, serverResponse, requestUrl.pathname)

  if (request.method === 'OPTIONS') {
    serverResponse.writeHead(204, corsHeaders())
    serverResponse.end()

    return
  }

  if (request.method === 'GET' && (requestUrl.pathname === '/health' || requestUrl.pathname === '/healthz')) {
    sendJson(serverResponse, 200, { status: 'ok', service: 'job-stream-gateway' })

    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/readyz') {
    void runReadinessChecks(
      [
        { name: 'database', check: checkDatabaseConnection },
        { name: 'redis', check: () => healthRedis.ping() },
      ],
      HEALTHCHECK_TIMEOUT_MS,
    )
      .then((result) => {
        sendJson(serverResponse, result.ready ? 200 : 503, {
          status: result.ready ? 'ready' : 'unavailable',
          service: 'job-stream-gateway',
          checks: result.checks,
        })
      })
      .catch((error) => {
        logError('job-stream-gateway', 'readiness.failed', error, { requestId: requestContext.requestId })

        if (!serverResponse.writableEnded && !serverResponse.destroyed) {
          sendJson(serverResponse, 503, { status: 'unavailable', service: 'job-stream-gateway' })
        }
      })

    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/stream') {
    void handleStream(request, serverResponse, requestContext.requestId, requestContext.startedAt).catch((error) => {
      logError('job-stream-gateway', 'stream.handler.failed', error, {
        requestId: requestContext.requestId,
      })

      if (!serverResponse.headersSent && !serverResponse.destroyed) {
        sendJson(serverResponse, 500, { error: 'stream_unavailable', requestId: requestContext.requestId })
      } else if (!serverResponse.writableEnded && !serverResponse.destroyed) {
        serverResponse.end()
      }
    })

    return
  }

  serverResponse.writeHead(404)
  serverResponse.end()
})

server.listen(PORT, () => {
  logEvent('job-stream-gateway', 'http.server.started', { port: PORT })
})

server.on('clientError', (error, socket) => {
  logError('job-stream-gateway', 'http.client.error', error)
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

let shutdownPromise: Promise<void> | null = null

function startShutdown(signal: string) {
  isShuttingDown = true
  shutdownPromise ??= (async () => {
    logEvent('job-stream-gateway', 'runtime.shutdown.started', { signal })
    const closeServer = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
      server.closeAllConnections()
    })
    const streamCleanups = [...activeStreamCleanups].map((cleanup) => cleanup())

    await Promise.all([closeServer, healthRedis.quit(), closeDatabase(), ...streamCleanups])
    logEvent('job-stream-gateway', 'runtime.shutdown.completed')
  })()

  return shutdownPromise
}

function handleShutdown(signal: string) {
  void startShutdown(signal).catch((error) => {
    logError('job-stream-gateway', 'runtime.shutdown.failed', error, { signal })
    process.exitCode = 1
  })
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('uncaughtExceptionMonitor', (error) => {
  logError('job-stream-gateway', 'runtime.uncaught_exception', error)
})
