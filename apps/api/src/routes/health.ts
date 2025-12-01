import { db } from '@terminverwaltung/database'
import { Hono } from 'hono'

export const healthRouter = new Hono()

healthRouter.get('/', (c) =>
  c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  })
)

healthRouter.get('/ready', async (c) => {
  try {
    await db.$queryRaw`SELECT 1`
    return c.json({ status: 'ready', database: 'connected' })
  } catch {
    return c.json({ status: 'not ready', database: 'disconnected' }, 503)
  }
})
