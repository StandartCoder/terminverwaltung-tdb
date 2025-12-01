import { db } from '@terminverwaltung/database'
import { Hono } from 'hono'
import { formatDate, formatTime } from '../lib/utils'

export const exportRouter = new Hono()

exportRouter.get('/bookings/csv', async (c) => {
  const status = c.req.query('status')
  const dateFrom = c.req.query('dateFrom')
  const dateTo = c.req.query('dateTo')
  const departmentId = c.req.query('departmentId')

  const bookings = await db.booking.findMany({
    where: {
      ...(status && { status: status as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' }),
      ...(dateFrom && { timeSlot: { date: { gte: new Date(dateFrom) } } }),
      ...(dateTo && { timeSlot: { date: { lte: new Date(dateTo) } } }),
      ...(departmentId && { teacher: { departmentId } }),
    },
    orderBy: [{ timeSlot: { date: 'asc' } }, { timeSlot: { startTime: 'asc' } }],
    include: {
      teacher: { include: { department: true } },
      timeSlot: true,
    },
  })

  const headers = [
    'Datum',
    'Uhrzeit Start',
    'Uhrzeit Ende',
    'Fachbereich',
    'Lehrkraft',
    'Raum',
    'Firma',
    'Ansprechpartner',
    'E-Mail',
    'Telefon',
    'Auszubildende/r',
    'Klasse',
    'Anzahl Azubis',
    'Notizen',
    'Status',
    'Gebucht am',
  ]

  const rows = bookings.map((b) => [
    formatDate(b.timeSlot.date),
    formatTime(b.timeSlot.startTime),
    formatTime(b.timeSlot.endTime),
    b.teacher.department.name,
    `${b.teacher.lastName}, ${b.teacher.firstName}`,
    b.teacher.room || '',
    b.companyName,
    b.contactName || '',
    b.companyEmail,
    b.companyPhone || '',
    b.studentName || '',
    b.studentClass || '',
    b.studentCount,
    b.notes || '',
    b.status,
    b.bookedAt.toISOString(),
  ])

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\n')

  const bom = '\uFEFF'
  const csvWithBom = bom + csvContent

  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header(
    'Content-Disposition',
    `attachment; filename="buchungen_${new Date().toISOString().split('T')[0]}.csv"`
  )

  return c.body(csvWithBom)
})

exportRouter.get('/timeslots/csv', async (c) => {
  const date = c.req.query('date')
  const teacherId = c.req.query('teacherId')
  const departmentId = c.req.query('departmentId')

  const timeSlots = await db.timeSlot.findMany({
    where: {
      ...(date && { date: new Date(date) }),
      ...(teacherId && { teacherId }),
      ...(departmentId && { teacher: { departmentId } }),
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      teacher: { include: { department: true } },
      booking: true,
    },
  })

  const headers = [
    'Datum',
    'Uhrzeit Start',
    'Uhrzeit Ende',
    'Fachbereich',
    'Lehrkraft',
    'Raum',
    'Status',
    'Firma (wenn gebucht)',
  ]

  const rows = timeSlots.map((ts) => [
    formatDate(ts.date),
    formatTime(ts.startTime),
    formatTime(ts.endTime),
    ts.teacher.department.name,
    `${ts.teacher.lastName}, ${ts.teacher.firstName}`,
    ts.teacher.room || '',
    ts.status,
    ts.booking?.companyName || '',
  ])

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\n')

  const bom = '\uFEFF'
  const csvWithBom = bom + csvContent

  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header(
    'Content-Disposition',
    `attachment; filename="zeitslots_${new Date().toISOString().split('T')[0]}.csv"`
  )

  return c.body(csvWithBom)
})

exportRouter.get('/statistics', async (c) => {
  // Count unique companies by email (since companies are stored per-booking now)
  const uniqueCompanies = await db.booking.groupBy({
    by: ['companyEmail'],
    where: { status: 'CONFIRMED' },
  })

  const [
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    totalTimeSlots,
    availableTimeSlots,
    bookedTimeSlots,
    totalTeachers,
  ] = await Promise.all([
    db.booking.count(),
    db.booking.count({ where: { status: 'CONFIRMED' } }),
    db.booking.count({ where: { status: 'CANCELLED' } }),
    db.timeSlot.count(),
    db.timeSlot.count({ where: { status: 'AVAILABLE' } }),
    db.timeSlot.count({ where: { status: 'BOOKED' } }),
    db.teacher.count({ where: { isActive: true } }),
  ])

  return c.json({
    data: {
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
      },
      timeSlots: {
        total: totalTimeSlots,
        available: availableTimeSlots,
        booked: bookedTimeSlots,
        utilizationRate:
          totalTimeSlots > 0 ? ((bookedTimeSlots / totalTimeSlots) * 100).toFixed(1) : '0',
      },
      teachers: totalTeachers,
      companies: uniqueCompanies.length,
    },
  })
})
