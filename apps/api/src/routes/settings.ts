import { zValidator } from '@hono/zod-validator'
import { db } from '@terminverwaltung/database'
import { Hono } from 'hono'
import { z } from 'zod'
import { HTTP_STATUS, ERROR_CODES } from '../lib/constants'

export const settingsRouter = new Hono()

settingsRouter.get('/', async (c) => {
  const settings = await db.setting.findMany({
    orderBy: { key: 'asc' },
  })

  // Convert to key-value object for easier frontend use
  const settingsMap = settings.reduce(
    (acc, s) => {
      acc[s.key] = s.value
      return acc
    },
    {} as Record<string, string>
  )

  return c.json({ data: settings, map: settingsMap })
})

settingsRouter.get('/:key', async (c) => {
  const key = c.req.param('key')

  const setting = await db.setting.findUnique({ where: { key } })

  if (!setting) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Einstellung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: setting })
})

const upsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional(),
})

settingsRouter.put('/', zValidator('json', upsertSettingSchema), async (c) => {
  const body = c.req.valid('json')

  const setting = await db.setting.upsert({
    where: { key: body.key },
    update: {
      value: body.value,
      ...(body.description && { description: body.description }),
    },
    create: {
      key: body.key,
      value: body.value,
      description: body.description,
    },
  })

  return c.json({ data: setting })
})

const bulkUpdateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    })
  ),
})

settingsRouter.put('/bulk', zValidator('json', bulkUpdateSchema), async (c) => {
  const { settings } = c.req.valid('json')

  const results = await Promise.all(
    settings.map((s) =>
      db.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value },
      })
    )
  )

  return c.json({ data: results })
})

settingsRouter.delete('/:key', async (c) => {
  const key = c.req.param('key')

  const existing = await db.setting.findUnique({ where: { key } })
  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Einstellung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  await db.setting.delete({ where: { key } })
  return c.json({ message: 'Einstellung erfolgreich gelöscht' })
})
