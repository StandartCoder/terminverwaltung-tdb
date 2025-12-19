import { db } from '@terminverwaltung/database'
import { formatDate, formatTime, formatStudents } from '@terminverwaltung/shared'
import { Hono } from 'hono'
import { requireAdmin } from '../middleware/auth'

export const exportRouter = new Hono()

// All export routes require admin access
exportRouter.use('/*', requireAdmin)

const PRINT_STYLES = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; padding: 15mm; }
    h1 { font-size: 18pt; margin-bottom: 5mm; border-bottom: 2px solid #333; padding-bottom: 2mm; }
    h2 { font-size: 14pt; margin: 8mm 0 4mm 0; color: #333; page-break-after: avoid; }
    h3 { font-size: 12pt; margin: 5mm 0 3mm 0; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
    th, td { border: 1px solid #666; padding: 2mm 3mm; text-align: left; vertical-align: top; }
    th { background-color: #f0f0f0; font-weight: bold; font-size: 10pt; }
    td { font-size: 10pt; }
    .meta { color: #666; font-size: 9pt; margin-bottom: 5mm; }
    .teacher-block { page-break-inside: avoid; margin-bottom: 10mm; }
    .teacher-header { background: #e8e8e8; padding: 3mm; margin-bottom: 2mm; }
    .teacher-name { font-weight: bold; font-size: 12pt; }
    .teacher-info { font-size: 10pt; color: #555; }
    .no-bookings { color: #888; font-style: italic; padding: 3mm; }
    .status-confirmed { color: #2e7d32; }
    .status-cancelled { color: #c62828; text-decoration: line-through; }
    .status-completed { color: #1565c0; }
    .status-no-show { color: #ef6c00; }
    .print-btn { 
      display: block; margin: 10mm auto; padding: 3mm 8mm; 
      font-size: 12pt; cursor: pointer; background: #1976d2; 
      color: white; border: none; border-radius: 4px;
    }
    .print-btn:hover { background: #1565c0; }
    @media print {
      .print-btn { display: none; }
      body { padding: 10mm; }
      .teacher-block { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
    @page { margin: 15mm; size: A4; }
  </style>
`

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    CONFIRMED: 'Bestätigt',
    CANCELLED: 'Storniert',
    COMPLETED: 'Abgeschlossen',
    NO_SHOW: 'Nicht erschienen',
  }
  return labels[status] || status
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

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

  const rows = bookings.map((b) => {
    const { names, classes } = formatStudents(b.students)
    return [
      formatDate(b.timeSlot.date),
      formatTime(b.timeSlot.startTime),
      formatTime(b.timeSlot.endTime),
      b.teacher.department?.name || '',
      `${b.teacher.lastName}, ${b.teacher.firstName}`,
      b.teacher.room || '',
      b.companyName,
      b.contactName || '',
      b.companyEmail,
      b.companyPhone || '',
      names,
      classes,
      b.studentCount,
      b.notes || '',
      b.status,
      b.bookedAt.toISOString(),
    ]
  })

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
    ts.teacher.department?.name || '',
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

// =============================================================================
// PRINTABLE HTML EXPORTS
// =============================================================================

// Printable schedule per teacher - each teacher gets their own section
exportRouter.get('/bookings/print', async (c) => {
  const dateFrom = c.req.query('dateFrom')
  const dateTo = c.req.query('dateTo')
  const departmentId = c.req.query('departmentId')
  const teacherId = c.req.query('teacherId')
  const includeEmpty = c.req.query('includeEmpty') === 'true'

  const teachers = await db.teacher.findMany({
    where: {
      isActive: true,
      ...(teacherId && { id: teacherId }),
      ...(departmentId && { departmentId }),
    },
    orderBy: [{ department: { name: 'asc' } }, { lastName: 'asc' }],
    include: {
      department: true,
      bookings: {
        where: {
          status: 'CONFIRMED',
          ...(dateFrom && { timeSlot: { date: { gte: new Date(dateFrom) } } }),
          ...(dateTo && { timeSlot: { date: { lte: new Date(dateTo) } } }),
        },
        orderBy: [{ timeSlot: { date: 'asc' } }, { timeSlot: { startTime: 'asc' } }],
        include: { timeSlot: true },
      },
    },
  })

  const filteredTeachers = includeEmpty ? teachers : teachers.filter((t) => t.bookings.length > 0)

  const generatedAt = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terminlisten - Tag der Betriebe</title>
  ${PRINT_STYLES}
</head>
<body>
  <h1>Terminlisten - Tag der Betriebe</h1>
  <p class="meta">Erstellt am: ${escapeHtml(generatedAt)}</p>
  <button class="print-btn" onclick="window.print()">Drucken / Als PDF speichern</button>
`

  for (const teacher of filteredTeachers) {
    html += `
  <div class="teacher-block">
    <div class="teacher-header">
      <div class="teacher-name">${escapeHtml(teacher.lastName)}, ${escapeHtml(teacher.firstName)}</div>
      <div class="teacher-info">
        ${teacher.department ? escapeHtml(teacher.department.name) : 'Kein Fachbereich'}
        ${teacher.room ? ` | Raum: ${escapeHtml(teacher.room)}` : ''}
      </div>
    </div>
`
    if (teacher.bookings.length === 0) {
      html += `    <p class="no-bookings">Keine Termine gebucht</p>\n`
    } else {
      html += `    <table>
      <thead>
        <tr>
          <th style="width:15%">Datum</th>
          <th style="width:12%">Uhrzeit</th>
          <th style="width:20%">Firma</th>
          <th style="width:18%">Ansprechpartner</th>
          <th style="width:15%">Auszubildende/r</th>
          <th style="width:20%">Kontakt</th>
        </tr>
      </thead>
      <tbody>
`
      for (const booking of teacher.bookings) {
        const { names, classes } = formatStudents(booking.students)
        const studentDisplay = names || '-'
        const classDisplay = classes ? ` (${escapeHtml(classes)})` : ''
        html += `        <tr>
          <td>${escapeHtml(formatShortDate(booking.timeSlot.date))}</td>
          <td>${escapeHtml(formatTime(booking.timeSlot.startTime))} - ${escapeHtml(formatTime(booking.timeSlot.endTime))}</td>
          <td>${escapeHtml(booking.companyName)}</td>
          <td>${escapeHtml(booking.contactName || '-')}</td>
          <td>${escapeHtml(studentDisplay)}${classDisplay}</td>
          <td>${escapeHtml(booking.companyEmail)}${booking.companyPhone ? `<br>${escapeHtml(booking.companyPhone)}` : ''}</td>
        </tr>
`
      }
      html += `      </tbody>
    </table>
`
    }
    html += `  </div>
`
  }

  html += `</body>
</html>`

  c.header('Content-Type', 'text/html; charset=utf-8')
  return c.body(html)
})

// Printable overview of all bookings in a single table
exportRouter.get('/bookings/print/overview', async (c) => {
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

  const generatedAt = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusFilter = status ? ` (${getStatusLabel(status)})` : ''

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buchungsübersicht - Tag der Betriebe</title>
  ${PRINT_STYLES}
</head>
<body>
  <h1>Buchungsübersicht${escapeHtml(statusFilter)}</h1>
  <p class="meta">Erstellt am: ${escapeHtml(generatedAt)} | Anzahl Buchungen: ${bookings.length}</p>
  <button class="print-btn" onclick="window.print()">Drucken / Als PDF speichern</button>

  <table>
    <thead>
      <tr>
        <th style="width:10%">Datum</th>
        <th style="width:10%">Uhrzeit</th>
        <th style="width:15%">Lehrkraft</th>
        <th style="width:8%">Raum</th>
        <th style="width:15%">Firma</th>
        <th style="width:12%">Ansprechpartner</th>
        <th style="width:12%">Auszubildende/r</th>
        <th style="width:10%">Status</th>
        <th style="width:8%">Notizen</th>
      </tr>
    </thead>
    <tbody>
`

  for (const b of bookings) {
    const statusClass = `status-${b.status.toLowerCase()}`
    const { names, classes } = formatStudents(b.students)
    const studentDisplay = names || '-'
    const classDisplay = classes ? ` (${escapeHtml(classes)})` : ''
    html += `      <tr>
        <td>${escapeHtml(formatShortDate(b.timeSlot.date))}</td>
        <td>${escapeHtml(formatTime(b.timeSlot.startTime))}</td>
        <td>${escapeHtml(b.teacher.lastName)}, ${escapeHtml(b.teacher.firstName)}</td>
        <td>${escapeHtml(b.teacher.room || '-')}</td>
        <td>${escapeHtml(b.companyName)}</td>
        <td>${escapeHtml(b.contactName || '-')}</td>
        <td>${escapeHtml(studentDisplay)}${classDisplay}</td>
        <td class="${statusClass}">${escapeHtml(getStatusLabel(b.status))}</td>
        <td>${escapeHtml(b.notes || '-')}</td>
      </tr>
`
  }

  html += `    </tbody>
  </table>
</body>
</html>`

  c.header('Content-Type', 'text/html; charset=utf-8')
  return c.body(html)
})

// Printable timeslot availability overview
exportRouter.get('/timeslots/print', async (c) => {
  const date = c.req.query('date')
  const departmentId = c.req.query('departmentId')

  const teachers = await db.teacher.findMany({
    where: {
      isActive: true,
      ...(departmentId && { departmentId }),
    },
    orderBy: [{ department: { name: 'asc' } }, { lastName: 'asc' }],
    include: {
      department: true,
      timeSlots: {
        where: {
          ...(date && { date: new Date(date) }),
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: { booking: true },
      },
    },
  })

  const filteredTeachers = teachers.filter((t) => t.timeSlots.length > 0)

  const generatedAt = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zeitslot-Übersicht - Tag der Betriebe</title>
  ${PRINT_STYLES}
  <style>
    .slot-available { background-color: #e8f5e9; }
    .slot-booked { background-color: #fff3e0; }
    .slot-blocked { background-color: #ffebee; }
  </style>
</head>
<body>
  <h1>Zeitslot-Übersicht</h1>
  <p class="meta">Erstellt am: ${escapeHtml(generatedAt)}</p>
  <button class="print-btn" onclick="window.print()">Drucken / Als PDF speichern</button>
`

  for (const teacher of filteredTeachers) {
    html += `
  <div class="teacher-block">
    <div class="teacher-header">
      <div class="teacher-name">${escapeHtml(teacher.lastName)}, ${escapeHtml(teacher.firstName)}</div>
      <div class="teacher-info">
        ${teacher.department ? escapeHtml(teacher.department.name) : 'Kein Fachbereich'}
        ${teacher.room ? ` | Raum: ${escapeHtml(teacher.room)}` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:15%">Datum</th>
          <th style="width:15%">Uhrzeit</th>
          <th style="width:15%">Status</th>
          <th style="width:55%">Buchung</th>
        </tr>
      </thead>
      <tbody>
`
    for (const slot of teacher.timeSlots) {
      const slotClass = `slot-${slot.status.toLowerCase()}`
      const statusLabels: Record<string, string> = {
        AVAILABLE: 'Verfügbar',
        BOOKED: 'Gebucht',
        BLOCKED: 'Blockiert',
      }
      html += `        <tr class="${slotClass}">
          <td>${escapeHtml(formatShortDate(slot.date))}</td>
          <td>${escapeHtml(formatTime(slot.startTime))} - ${escapeHtml(formatTime(slot.endTime))}</td>
          <td>${statusLabels[slot.status] || slot.status}</td>
          <td>${slot.booking ? `${escapeHtml(slot.booking.companyName)} (${escapeHtml(slot.booking.contactName || slot.booking.companyEmail)})` : '-'}</td>
        </tr>
`
    }
    html += `      </tbody>
    </table>
  </div>
`
  }

  html += `</body>
</html>`

  c.header('Content-Type', 'text/html; charset=utf-8')
  return c.body(html)
})
