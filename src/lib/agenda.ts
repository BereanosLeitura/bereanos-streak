// Lembretes sem servidor: o próprio calendário do celular avisa.
// iPhone: arquivo .ics (abre no Calendário). Android: link do Google Agenda.

export interface EventoAgenda {
  titulo: string
  descricao?: string
  local?: string
  inicio: Date
  duracaoMin: number
  diario?: boolean
}

function doisDig(n: number) { return String(n).padStart(2, '0') }
function utc(d: Date) {
  return `${d.getUTCFullYear()}${doisDig(d.getUTCMonth() + 1)}${doisDig(d.getUTCDate())}T${doisDig(d.getUTCHours())}${doisDig(d.getUTCMinutes())}00Z`
}
function escapar(t: string) {
  return t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
}

export function linkGoogleAgenda(e: EventoAgenda): string {
  const fim = new Date(e.inicio.getTime() + e.duracaoMin * 60_000)
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titulo, dates: `${utc(e.inicio)}/${utc(fim)}` })
  if (e.descricao) p.set('details', e.descricao)
  if (e.local) p.set('location', e.local)
  if (e.diario) p.set('recur', 'RRULE:FREQ=DAILY')
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function baixarIcs(e: EventoAgenda, nomeArquivo: string) {
  const fim = new Date(e.inicio.getTime() + e.duracaoMin * 60_000)
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bereanos//Leitura//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@bereanos`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(e.inicio)}`,
    `DTEND:${utc(fim)}`,
    `SUMMARY:${escapar(e.titulo)}`,
    ...(e.descricao ? [`DESCRIPTION:${escapar(e.descricao)}`] : []),
    ...(e.local ? [`LOCATION:${escapar(e.local)}`] : []),
    ...(e.diario ? ['RRULE:FREQ=DAILY'] : []),
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(e.titulo)}`, `TRIGGER:${e.diario ? 'PT0M' : '-PT60M'}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ]
  const blob = new Blob([linhas.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Próximo horário (hoje ou amanhã) no formato "HH:MM". */
export function proximoHorario(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
  return d
}
