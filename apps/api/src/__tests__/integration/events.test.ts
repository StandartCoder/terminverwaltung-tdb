/**
 * Events Integration Tests
 *
 * Tests event management:
 * - CRUD operations
 * - Active event handling
 * - Permission checks
 */
import { describe, it, expect } from 'vitest'
import { HTTP_STATUS } from '@terminverwaltung/shared'
import { testDb } from './setup'
import { createEvent, createAdmin, createTeacherWithAuth } from './factories'
import { post, get, patch, del, getData } from './helpers'

describe('Events API', () => {
  describe('GET /api/events - List Events', () => {
    it('returns all events without authentication', async () => {
      await createEvent({ name: 'Event 1' })
      await createEvent({ name: 'Event 2' })

      const res = await get('/api/events')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<unknown[]>(res.body)
      expect(data?.length).toBe(2)
    })

    it('orders events by startDate descending', async () => {
      await createEvent({ name: 'Earlier', startDate: '2025-01-01' })
      await createEvent({ name: 'Later', startDate: '2025-12-01' })

      const res = await get('/api/events')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ name: string }[]>(res.body)
      expect(data?.[0].name).toBe('Later')
      expect(data?.[1].name).toBe('Earlier')
    })
  })

  describe('GET /api/events/active - Get Active Event', () => {
    it('returns the active event', async () => {
      await createEvent({ name: 'Inactive', isActive: false })
      await createEvent({ name: 'Active', isActive: true })

      const res = await get('/api/events/active')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ name: string; isActive: boolean }>(res.body)
      expect(data?.name).toBe('Active')
      expect(data?.isActive).toBe(true)
    })

    it('returns 404 when no active event', async () => {
      await createEvent({ name: 'Inactive', isActive: false })

      const res = await get('/api/events/active')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('GET /api/events/:id - Get Single Event', () => {
    it('returns event details', async () => {
      const event = await createEvent({ name: 'Test Event' })

      const res = await get(`/api/events/${event.id}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ id: string; name: string }>(res.body)
      expect(data?.id).toBe(event.id)
      expect(data?.name).toBe('Test Event')
    })

    it('returns 404 for non-existent event', async () => {
      const res = await get('/api/events/non-existent-id')
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('POST /api/events - Create Event', () => {
    it('requires admin authentication', async () => {
      const res = await post('/api/events', {
        name: 'New Event',
        startDate: '2025-06-15',
        endDate: '2025-06-15',
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('rejects non-admin user', async () => {
      const { accessToken } = await createTeacherWithAuth({ isAdmin: false })

      const res = await post(
        '/api/events',
        {
          name: 'New Event',
          startDate: '2025-06-15',
          endDate: '2025-06-15',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('allows admin to create event', async () => {
      const admin = await createAdmin()

      const res = await post(
        '/api/events',
        {
          name: 'Tag der Betriebe 2025',
          description: 'Jährliche Veranstaltung',
          startDate: '2025-06-15',
          endDate: '2025-06-16',
          defaultSlotLength: 25,
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = getData<{ name: string; defaultSlotLength: number }>(res.body)
      expect(data?.name).toBe('Tag der Betriebe 2025')
      expect(data?.defaultSlotLength).toBe(25)
    })

    it('deactivates other events when creating active event', async () => {
      const admin = await createAdmin()
      const existingActive = await createEvent({ name: 'Old Active', isActive: true })

      await post(
        '/api/events',
        {
          name: 'New Active',
          startDate: '2025-07-01',
          endDate: '2025-07-01',
          isActive: true,
        },
        { auth: admin }
      )

      // Old event should now be inactive
      const oldEvent = await testDb.event.findUnique({ where: { id: existingActive.id } })
      expect(oldEvent?.isActive).toBe(false)

      // Verify only one active event
      const activeEvents = await testDb.event.findMany({ where: { isActive: true } })
      expect(activeEvents.length).toBe(1)
      expect(activeEvents[0].name).toBe('New Active')
    })

    it('validates required fields', async () => {
      const admin = await createAdmin()

      const res = await post(
        '/api/events',
        {
          // Missing name, startDate, endDate
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('validates date format', async () => {
      const admin = await createAdmin()

      const res = await post(
        '/api/events',
        {
          name: 'Bad Date Event',
          startDate: '15-06-2025', // Wrong format
          endDate: '2025-06-15',
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /api/events/:id - Update Event', () => {
    it('requires admin authentication', async () => {
      const event = await createEvent()

      const res = await patch(`/api/events/${event.id}`, {
        name: 'Updated Name',
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('allows admin to update event', async () => {
      const admin = await createAdmin()
      const event = await createEvent({ name: 'Original' })

      const res = await patch(
        `/api/events/${event.id}`,
        {
          name: 'Updated',
          description: 'New description',
          defaultSlotLength: 30,
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ name: string; description: string; defaultSlotLength: number }>(
        res.body
      )
      expect(data?.name).toBe('Updated')
      expect(data?.description).toBe('New description')
      expect(data?.defaultSlotLength).toBe(30)
    })

    it('returns 404 for non-existent event', async () => {
      const admin = await createAdmin()

      const res = await patch(
        '/api/events/non-existent-id',
        {
          name: 'Updated',
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('deactivates other events when setting active', async () => {
      const admin = await createAdmin()
      const activeEvent = await createEvent({ name: 'Active', isActive: true })
      const inactiveEvent = await createEvent({ name: 'Inactive', isActive: false })

      await patch(
        `/api/events/${inactiveEvent.id}`,
        {
          isActive: true,
        },
        { auth: admin }
      )

      // Previously active event should now be inactive
      const oldActive = await testDb.event.findUnique({ where: { id: activeEvent.id } })
      expect(oldActive?.isActive).toBe(false)

      // New event should be active
      const newActive = await testDb.event.findUnique({ where: { id: inactiveEvent.id } })
      expect(newActive?.isActive).toBe(true)
    })

    it('allows setting description to null', async () => {
      const admin = await createAdmin()
      const event = await createEvent({ description: 'Some description' })

      const res = await patch(
        `/api/events/${event.id}`,
        {
          description: null,
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ description: string | null }>(res.body)
      expect(data?.description).toBeNull()
    })
  })

  describe('DELETE /api/events/:id - Delete Event', () => {
    it('requires admin authentication', async () => {
      const event = await createEvent()

      const res = await del(`/api/events/${event.id}`)

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('allows admin to delete event', async () => {
      const admin = await createAdmin()
      const event = await createEvent()

      const res = await del(`/api/events/${event.id}`, { auth: admin })

      expect(res.status).toBe(HTTP_STATUS.OK)

      const deleted = await testDb.event.findUnique({ where: { id: event.id } })
      expect(deleted).toBeNull()
    })

    it('returns 404 for non-existent event', async () => {
      const admin = await createAdmin()

      const res = await del('/api/events/non-existent-id', { auth: admin })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })
})
