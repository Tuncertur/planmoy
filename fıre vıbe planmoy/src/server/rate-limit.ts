import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

/**
 * Small edge-local guard for expensive server functions. It intentionally fails
 * closed for a single worker instance; a shared edge limiter should be added
 * when the deployment exposes one.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()
const MAX_BUCKETS = 5_000

const getClientKey = createServerOnlyFn(() => {
  const request = getRequest()
  // Cloudflare's connecting-IP header is the trusted boundary header. We do
  // not accept arbitrary forwarded headers because they are client-spoofable.
  return request.headers.get('cf-connecting-ip') || 'anonymous'
})

export function requestClientKey() {
  return getClientKey()
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey)
    if (buckets.size > MAX_BUCKETS) throw new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } })
  }
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  if (current.count >= limit) {
    throw new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)) } })
  }
  current.count += 1
}

export function enforceUserRateLimit(userId: string, action: string, limit: number, windowMs: number) {
  enforceRateLimit(`user:${userId}:${action}`, limit, windowMs)
}
