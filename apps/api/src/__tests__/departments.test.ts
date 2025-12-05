import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { departmentsRouter } from '../routes/departments'
import { db } from '@terminverwaltung/database'
import { HTTP_STATUS, ERROR_CODES } from '@terminverwaltung/shared'

interface Department {
  id: string
  name: string
  shortCode: string
  color: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { teachers: number }
}

interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

const app = new Hono()
app.route('/api/departments', departmentsRouter)

const mockDepartments: Department[] = [
  {
    id: 'dept-1',
    name: 'Fachinformatiker/in',
    shortCode: 'IT',
    color: '#3B82F6',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { teachers: 5 },
  },
  {
    id: 'dept-2',
    name: 'KFZ-Mechatroniker/in',
    shortCode: 'KFZ',
    color: '#EF4444',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { teachers: 3 },
  },
]

describe('Departments Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/departments', () => {
    it('returns all departments ordered by name', async () => {
      vi.mocked(db.department.findMany).mockResolvedValueOnce(mockDepartments)

      const res = await app.request('/api/departments')

      expect(res.status).toBe(200)

      const body = (await res.json()) as ApiResponse<Department[]>
      expect(body.data).toHaveLength(2)
      expect(body.data![0].name).toBe('Fachinformatiker/in')
      expect(body.data![0]._count?.teachers).toBe(5)

      expect(db.department.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: { _count: { select: { teachers: true } } },
      })
    })

    it('returns empty array when no departments exist', async () => {
      vi.mocked(db.department.findMany).mockResolvedValueOnce([])

      const res = await app.request('/api/departments')

      expect(res.status).toBe(200)

      const body = (await res.json()) as ApiResponse<Department[]>
      expect(body.data).toEqual([])
    })
  })

  describe('GET /api/departments/:id', () => {
    it('returns department with teachers when found', async () => {
      const deptWithTeachers = {
        ...mockDepartments[0],
        teachers: [{ id: 't1', firstName: 'Max', lastName: 'Mustermann', room: 'A101' }],
      }
      vi.mocked(db.department.findUnique).mockResolvedValueOnce(deptWithTeachers)

      const res = await app.request('/api/departments/dept-1')

      expect(res.status).toBe(200)

      const body = (await res.json()) as ApiResponse<typeof deptWithTeachers>
      expect(body.data!.id).toBe('dept-1')
      expect(body.data!.teachers).toHaveLength(1)
    })

    it('returns 404 when department not found', async () => {
      vi.mocked(db.department.findUnique).mockResolvedValueOnce(null)

      const res = await app.request('/api/departments/nonexistent')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)

      const body = (await res.json()) as ApiResponse
      expect(body.error).toBe(ERROR_CODES.NOT_FOUND)
    })
  })

  describe('POST /api/departments', () => {
    it('creates department successfully', async () => {
      vi.mocked(db.department.findFirst).mockResolvedValueOnce(null)
      vi.mocked(db.department.create).mockResolvedValueOnce(mockDepartments[0])

      const res = await app.request('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Fachinformatiker/in',
          shortCode: 'IT',
          color: '#3B82F6',
        }),
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)

      const body = (await res.json()) as ApiResponse<Department>
      expect(body.data!.name).toBe('Fachinformatiker/in')
    })

    it('returns 409 when department name already exists', async () => {
      vi.mocked(db.department.findFirst).mockResolvedValueOnce(mockDepartments[0])

      const res = await app.request('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Fachinformatiker/in',
          shortCode: 'IT',
        }),
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)

      const body = (await res.json()) as ApiResponse
      expect(body.error).toBe(ERROR_CODES.CONFLICT)
    })

    it('returns 400 when name is missing', async () => {
      const res = await app.request('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode: 'IT' }),
      })

      expect(res.status).toBe(400)
    })

    it('returns 400 when color format is invalid', async () => {
      const res = await app.request('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          shortCode: 'TST',
          color: 'invalid-color',
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/departments/:id', () => {
    it('updates department successfully', async () => {
      vi.mocked(db.department.findUnique).mockResolvedValueOnce(mockDepartments[0])
      vi.mocked(db.department.findFirst).mockResolvedValueOnce(null)
      vi.mocked(db.department.update).mockResolvedValueOnce({
        ...mockDepartments[0],
        name: 'Updated Name',
      })

      const res = await app.request('/api/departments/dept-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      expect(res.status).toBe(200)

      const body = (await res.json()) as ApiResponse<Department>
      expect(body.data!.name).toBe('Updated Name')
    })

    it('returns 404 when department not found', async () => {
      vi.mocked(db.department.findUnique).mockResolvedValueOnce(null)

      const res = await app.request('/api/departments/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('returns 409 when updating to existing name', async () => {
      vi.mocked(db.department.findUnique).mockResolvedValueOnce(mockDepartments[0])
      vi.mocked(db.department.findFirst).mockResolvedValueOnce(mockDepartments[1])

      const res = await app.request('/api/departments/dept-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'KFZ-Mechatroniker/in' }),
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })
  })

  describe('DELETE /api/departments/:id', () => {
    it('deletes department successfully when no teachers assigned', async () => {
      vi.mocked(db.department.findUnique).mockResolvedValueOnce({
        ...mockDepartments[0],
        _count: { teachers: 0 },
      })
      vi.mocked(db.department.delete).mockResolvedValueOnce(mockDepartments[0])

      const res = await app.request('/api/departments/dept-1', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)

      const body = (await res.json()) as ApiResponse
      expect(body.message).toContain('gelöscht')
    })

    it('returns 404 when department not found', async () => {
      vi.mocked(db.department.findUnique).mockResolvedValueOnce(null)

      const res = await app.request('/api/departments/nonexistent', {
        method: 'DELETE',
      })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('returns 409 when department has teachers', async () => {
      vi.mocked(db.department.findUnique).mockResolvedValueOnce({
        ...mockDepartments[0],
        _count: { teachers: 5 },
      })

      const res = await app.request('/api/departments/dept-1', {
        method: 'DELETE',
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)

      const body = (await res.json()) as ApiResponse
      expect(body.error).toBe(ERROR_CODES.CONFLICT)
      expect(body.message).toContain('Lehrkräfte')
    })
  })
})
