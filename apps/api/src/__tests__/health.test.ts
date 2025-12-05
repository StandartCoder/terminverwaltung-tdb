import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { healthRouter } from '../routes/health'
import { db } from '@terminverwaltung/database'

interface HealthResponse {
  status: string
  timestamp?: string
  version?: string
  database?: string
}

const app = new Hono()
app.route('/health', healthRouter)

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('returns healthy status with timestamp and version', async () => {
      const res = await app.request('/health')

      expect(res.status).toBe(200)

      const body = (await res.json()) as HealthResponse
      expect(body.status).toBe('healthy')
      expect(body.version).toBe('0.1.0')
      expect(body.timestamp).toBeDefined()
      expect(new Date(body.timestamp!).getTime()).not.toBeNaN()
    })
  })

  describe('GET /health/ready', () => {
    it('returns ready when database is connected', async () => {
      vi.mocked(db.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }])

      const res = await app.request('/health/ready')

      expect(res.status).toBe(200)

      const body = (await res.json()) as HealthResponse
      expect(body.status).toBe('ready')
      expect(body.database).toBe('connected')
    })

    it('returns 503 when database is disconnected', async () => {
      vi.mocked(db.$queryRaw).mockRejectedValueOnce(new Error('Connection failed'))

      const res = await app.request('/health/ready')

      expect(res.status).toBe(503)

      const body = (await res.json()) as HealthResponse
      expect(body.status).toBe('not ready')
      expect(body.database).toBe('disconnected')
    })
  })
})
