import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@terminverwaltung/database'
import { Hono } from 'hono'

function getVersion(): string {
  try {
    // Get directory of current file
    const currentDir = dirname(fileURLToPath(import.meta.url))

    // Try paths for both dev (src/routes/) and prod (dist/)
    const paths = [
      join(currentDir, '../../package.json'), // from src/routes/
      join(currentDir, '../package.json'), // from dist/
    ]

    for (const path of paths) {
      try {
        const content = readFileSync(path, 'utf-8')
        const pkg = JSON.parse(content) as { version: string }
        return pkg.version
      } catch {
        continue
      }
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

const VERSION = getVersion()

export const healthRouter = new Hono()

healthRouter.get('/', (c) =>
  c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: VERSION,
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
