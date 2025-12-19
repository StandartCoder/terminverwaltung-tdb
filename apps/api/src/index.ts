import { serve } from '@hono/node-server'
import { ERROR_CODES, HTTP_STATUS, isAppError } from '@terminverwaltung/shared'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { bookingsRouter } from './routes/bookings'
import { cronRouter } from './routes/cron'
import { departmentsRouter } from './routes/departments'
import { eventsRouter } from './routes/events'
import { exportRouter } from './routes/export'
import { healthRouter } from './routes/health'
import { settingsRouter } from './routes/settings'
import { teachersRouter } from './routes/teachers'
import { timeslotsRouter } from './routes/timeslots'

const app = new Hono()

app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
)

app.route('/health', healthRouter)
app.route('/api/cron', cronRouter)
app.route('/api/departments', departmentsRouter)
app.route('/api/teachers', teachersRouter)
app.route('/api/timeslots', timeslotsRouter)
app.route('/api/bookings', bookingsRouter)
app.route('/api/export', exportRouter)
app.route('/api/events', eventsRouter)
app.route('/api/settings', settingsRouter)

app.notFound((c) =>
  c.json(
    { error: ERROR_CODES.NOT_FOUND, message: 'Die angeforderte Ressource wurde nicht gefunden' },
    HTTP_STATUS.NOT_FOUND
  )
)

app.onError((err, c) => {
  console.error('Unhandled error:', err)

  if (isAppError(err)) {
    return c.json(err.toJSON(), err.statusCode as ContentfulStatusCode)
  }

  return c.json(
    { error: ERROR_CODES.INTERNAL_ERROR, message: 'Ein interner Fehler ist aufgetreten' },
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
})

const port = Number(process.env.PORT) || 3001

if (process.env.NODE_ENV !== 'test') {
  console.log(`API server starting on port ${port}`)
  serve({ fetch: app.fetch, port })
}

export default app
export type AppType = typeof app
