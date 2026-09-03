import { isProductionRuntime, parsePositiveInteger } from '@oryxel/runtime'

export function resolveGatewayRuntimeConfig(environment: Record<string, string | undefined> = process.env) {
  const configuredCorsOrigin = environment['STREAM_CORS_ORIGIN']?.trim()

  if (isProductionRuntime(environment) && (!configuredCorsOrigin || configuredCorsOrigin === '*')) {
    throw new Error('STREAM_CORS_ORIGIN must be an exact origin in production')
  }

  return {
    corsOrigin: configuredCorsOrigin || '*',
    maxActiveStreams: parsePositiveInteger(environment['MAX_ACTIVE_STREAMS'], 200, 'MAX_ACTIVE_STREAMS'),
    maxActiveStreamsPerUser: parsePositiveInteger(
      environment['MAX_ACTIVE_STREAMS_PER_USER'],
      5,
      'MAX_ACTIVE_STREAMS_PER_USER',
    ),
    reconcileIntervalMs: parsePositiveInteger(
      environment['STREAM_RECONCILE_INTERVAL_MS'],
      5000,
      'STREAM_RECONCILE_INTERVAL_MS',
    ),
  }
}
