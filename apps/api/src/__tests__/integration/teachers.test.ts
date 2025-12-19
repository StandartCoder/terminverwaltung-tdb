/**
 * Teachers Integration Tests
 *
 * Tests teacher management and authentication:
 * - CRUD operations
 * - Login/logout/refresh
 * - Password change
 * - Permission checks
 */
import { describe, it, expect } from 'vitest'
import { HTTP_STATUS } from '@terminverwaltung/shared'
import { testDb } from './setup'
import {
  createDepartment,
  createTeacher,
  createTeacherWithAuth,
  createAdmin,
  createTimeSlot,
  createBooking,
  setSetting,
} from './factories'
import { post, get, patch, del, getData, getError, parseCookies } from './helpers'

describe('Teachers API', () => {
  describe('POST /api/teachers/login - Authentication', () => {
    it('logs in with valid credentials', async () => {
      const password = 'securepassword123'
      await createTeacher({ email: 'login@test.de', password })

      const res = await post('/api/teachers/login', {
        email: 'login@test.de',
        password,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ teacher: { email: string } }>(res.body)
      expect(data?.teacher.email).toBe('login@test.de')

      // Check cookies are set
      const cookies = parseCookies(res.headers)
      expect(cookies.access_token).toBeDefined()
      expect(cookies.refresh_token).toBeDefined()
    })

    it('rejects invalid password', async () => {
      await createTeacher({ email: 'wrong@test.de', password: 'correctpassword' })

      const res = await post('/api/teachers/login', {
        email: 'wrong@test.de',
        password: 'wrongpassword',
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('rejects non-existent email', async () => {
      const res = await post('/api/teachers/login', {
        email: 'nonexistent@test.de',
        password: 'anypassword',
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('rejects inactive account', async () => {
      const password = 'testpassword'
      await createTeacher({ email: 'inactive@test.de', password, isActive: false })

      const res = await post('/api/teachers/login', {
        email: 'inactive@test.de',
        password,
      })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
      const error = getError(res.body)
      expect(error?.message).toContain('deaktiviert')
    })

    it('does not return password hash in response', async () => {
      const password = 'testpassword'
      await createTeacher({ email: 'nohash@test.de', password })

      const res = await post('/api/teachers/login', {
        email: 'nohash@test.de',
        password,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = res.body as { data: { teacher: Record<string, unknown> } }
      expect(body.data.teacher.passwordHash).toBeUndefined()
    })
  })

  describe('POST /api/teachers/refresh - Token Refresh', () => {
    it('refreshes tokens with valid refresh token', async () => {
      const { refreshToken } = await createTeacherWithAuth()

      const res = await post('/api/teachers/refresh', undefined, {
        cookies: { refresh_token: refreshToken },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const cookies = parseCookies(res.headers)
      expect(cookies.access_token).toBeDefined()
      expect(cookies.refresh_token).toBeDefined()
    })

    it('rejects request without refresh token', async () => {
      const res = await post('/api/teachers/refresh')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('rejects invalid refresh token', async () => {
      const res = await post('/api/teachers/refresh', undefined, {
        cookies: { refresh_token: 'invalid-token' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('rejects refresh for inactive user', async () => {
      const { teacher, refreshToken } = await createTeacherWithAuth()

      // Deactivate the teacher
      await testDb.teacher.update({
        where: { id: teacher.id },
        data: { isActive: false },
      })

      const res = await post('/api/teachers/refresh', undefined, {
        cookies: { refresh_token: refreshToken },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('POST /api/teachers/logout - Logout', () => {
    it('clears auth cookies', async () => {
      const res = await post('/api/teachers/logout')

      expect(res.status).toBe(HTTP_STATUS.OK)
      // Cookies should be cleared (set with empty value or past expiry)
    })
  })

  describe('GET /api/teachers/me - Current User', () => {
    it('returns current authenticated user', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth()

      const res = await get('/api/teachers/me', { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ id: string; email: string }>(res.body)
      expect(data?.id).toBe(teacher.id)
      expect(data?.email).toBe(teacher.email)
    })

    it('requires authentication', async () => {
      const res = await get('/api/teachers/me')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /api/teachers - List Teachers', () => {
    it('requires authentication', async () => {
      const res = await get('/api/teachers')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('returns all teachers for authenticated user', async () => {
      const { accessToken } = await createTeacherWithAuth()
      await createTeacher()
      await createTeacher()

      const res = await get('/api/teachers', { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<unknown[]>(res.body)
      expect(data?.length).toBeGreaterThanOrEqual(3) // At least the auth user + 2 created
    })

    it('filters by department', async () => {
      const dept = await createDepartment()
      const { accessToken } = await createTeacherWithAuth({ departmentId: dept.id })
      await createTeacher() // No department

      const res = await get(`/api/teachers?departmentId=${dept.id}`, { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ departmentId: string }[]>(res.body)
      expect(data?.every((t) => t.departmentId === dept.id)).toBe(true)
    })

    it('filters by active status', async () => {
      const { accessToken } = await createTeacherWithAuth()
      await createTeacher({ isActive: false })

      const res = await get('/api/teachers?active=true', { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ isActive: boolean }[]>(res.body)
      expect(data?.every((t) => t.isActive)).toBe(true)
    })
  })

  describe('GET /api/teachers/:id - Get Single Teacher', () => {
    it('returns teacher with timeslots', async () => {
      const { accessToken } = await createTeacherWithAuth()
      const teacher = await createTeacher()
      await createTimeSlot({ teacherId: teacher.id })

      const res = await get(`/api/teachers/${teacher.id}`, { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ id: string; timeSlots: unknown[] }>(res.body)
      expect(data?.id).toBe(teacher.id)
      expect(data?.timeSlots.length).toBe(1)
    })

    it('returns 404 for non-existent teacher', async () => {
      const { accessToken } = await createTeacherWithAuth()

      const res = await get('/api/teachers/non-existent-id', { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('POST /api/teachers - Create Teacher', () => {
    it('requires admin authentication', async () => {
      const { accessToken } = await createTeacherWithAuth({ isAdmin: false })

      const res = await post(
        '/api/teachers',
        {
          email: 'new@test.de',
          password: 'password123',
          firstName: 'New',
          lastName: 'Teacher',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('allows admin to create teacher', async () => {
      const admin = await createAdmin()

      const res = await post(
        '/api/teachers',
        {
          email: 'created@test.de',
          password: 'password123',
          firstName: 'Created',
          lastName: 'Teacher',
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = getData<{ email: string }>(res.body)
      expect(data?.email).toBe('created@test.de')
    })

    it('rejects duplicate email', async () => {
      const admin = await createAdmin()
      await createTeacher({ email: 'duplicate@test.de' })

      const res = await post(
        '/api/teachers',
        {
          email: 'duplicate@test.de',
          password: 'password123',
          firstName: 'Dup',
          lastName: 'Teacher',
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })

    it('enforces minimum password length', async () => {
      await setSetting('min_password_length', '8')
      const admin = await createAdmin()

      const res = await post(
        '/api/teachers',
        {
          email: 'short@test.de',
          password: '12345', // Too short
          firstName: 'Short',
          lastName: 'Pass',
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const error = getError(res.body)
      expect(error?.message).toContain('8')

      // Reset
      await setSetting('min_password_length', '6')
    })

    it('validates department exists', async () => {
      const admin = await createAdmin()

      const res = await post(
        '/api/teachers',
        {
          email: 'nodept@test.de',
          password: 'password123',
          firstName: 'No',
          lastName: 'Dept',
          departmentId: 'non-existent-dept',
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('PATCH /api/teachers/:id - Update Teacher', () => {
    it('allows teacher to update own profile', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth()

      const res = await patch(
        `/api/teachers/${teacher.id}`,
        {
          firstName: 'Updated',
          room: 'R999',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ firstName: string; room: string }>(res.body)
      expect(data?.firstName).toBe('Updated')
      expect(data?.room).toBe('R999')
    })

    it('prevents teacher from updating other teacher', async () => {
      const { accessToken } = await createTeacherWithAuth()
      const otherTeacher = await createTeacher()

      const res = await patch(
        `/api/teachers/${otherTeacher.id}`,
        {
          firstName: 'Hacked',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('allows admin to update any teacher', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()

      const res = await patch(
        `/api/teachers/${teacher.id}`,
        {
          firstName: 'AdminUpdated',
          isAdmin: true,
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ firstName: string; isAdmin: boolean }>(res.body)
      expect(data?.firstName).toBe('AdminUpdated')
      expect(data?.isAdmin).toBe(true)
    })

    it('prevents non-admin from changing isAdmin', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth({ isAdmin: false })

      const res = await patch(
        `/api/teachers/${teacher.id}`,
        {
          isAdmin: true,
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      // isAdmin should not be changed
      const updated = await testDb.teacher.findUnique({ where: { id: teacher.id } })
      expect(updated?.isAdmin).toBe(false)
    })

    it('rejects duplicate email on update', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth()
      await createTeacher({ email: 'taken@test.de' })

      const res = await patch(
        `/api/teachers/${teacher.id}`,
        {
          email: 'taken@test.de',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })
  })

  describe('POST /api/teachers/:id/change-password - Change Password', () => {
    it('changes password with correct current password', async () => {
      const password = 'oldpassword123'
      const { teacher, accessToken } = await createTeacherWithAuth({ password })

      const res = await post(
        `/api/teachers/${teacher.id}/change-password`,
        {
          currentPassword: password,
          newPassword: 'newpassword456',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)

      // Verify can login with new password
      const loginRes = await post('/api/teachers/login', {
        email: teacher.email,
        password: 'newpassword456',
      })
      expect(loginRes.status).toBe(HTTP_STATUS.OK)
    })

    it('rejects incorrect current password', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth({ password: 'correctpassword' })

      const res = await post(
        `/api/teachers/${teacher.id}/change-password`,
        {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('clears mustChangePassword flag', async () => {
      // This test is incomplete - the correct implementation would need
      // to use the actual teacher's token to change their password
    })
  })

  describe('POST /api/teachers/:id/set-password - Admin Set Password', () => {
    it('allows admin to set password for any teacher', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()

      const res = await post(
        `/api/teachers/${teacher.id}/set-password`,
        {
          newPassword: 'adminsetpassword',
        },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)

      // Verify teacher can login with new password
      const loginRes = await post('/api/teachers/login', {
        email: teacher.email,
        password: 'adminsetpassword',
      })
      expect(loginRes.status).toBe(HTTP_STATUS.OK)
    })

    it('sets mustChangePassword flag', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher({ mustChangePassword: false })

      await post(
        `/api/teachers/${teacher.id}/set-password`,
        {
          newPassword: 'newpassword123',
        },
        { auth: admin }
      )

      const updated = await testDb.teacher.findUnique({ where: { id: teacher.id } })
      expect(updated?.mustChangePassword).toBe(true)
    })

    it('rejects non-admin', async () => {
      const { accessToken } = await createTeacherWithAuth({ isAdmin: false })
      const teacher = await createTeacher()

      const res = await post(
        `/api/teachers/${teacher.id}/set-password`,
        {
          newPassword: 'hackpassword',
        },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })

  describe('DELETE /api/teachers/:id - Delete Teacher', () => {
    it('requires admin authentication', async () => {
      const { accessToken } = await createTeacherWithAuth({ isAdmin: false })
      const teacher = await createTeacher()

      const res = await del(`/api/teachers/${teacher.id}`, { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('allows admin to delete teacher without bookings', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()

      const res = await del(`/api/teachers/${teacher.id}`, { auth: admin })

      expect(res.status).toBe(HTTP_STATUS.OK)

      const deleted = await testDb.teacher.findUnique({ where: { id: teacher.id } })
      expect(deleted).toBeNull()
    })

    it('prevents deletion of teacher with bookings', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()
      const slot = await createTimeSlot({ teacherId: teacher.id })
      await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await del(`/api/teachers/${teacher.id}`, { auth: admin })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const error = getError(res.body)
      expect(error?.message).toContain('Buchungen')
    })

    it('returns 404 for non-existent teacher', async () => {
      const admin = await createAdmin()

      const res = await del('/api/teachers/non-existent-id', { auth: admin })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('GET /api/teachers/:id/bookings - Teacher Bookings', () => {
    it('allows teacher to view own bookings', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth()
      const slot = await createTimeSlot({ teacherId: teacher.id })
      await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await get(`/api/teachers/${teacher.id}/bookings`, { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<unknown[]>(res.body)
      expect(data?.length).toBe(1)
    })

    it('prevents teacher from viewing other teacher bookings', async () => {
      const { accessToken } = await createTeacherWithAuth()
      const otherTeacher = await createTeacher()
      const slot = await createTimeSlot({ teacherId: otherTeacher.id })
      await createBooking({ timeSlotId: slot.id, teacherId: otherTeacher.id })

      const res = await get(`/api/teachers/${otherTeacher.id}/bookings`, { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('allows admin to view any teacher bookings', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()
      const slot = await createTimeSlot({ teacherId: teacher.id })
      await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await get(`/api/teachers/${teacher.id}/bookings`, { auth: admin })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<unknown[]>(res.body)
      expect(data?.length).toBe(1)
    })
  })
})
