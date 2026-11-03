import { supabase } from './supabase'
import { chaveDia, maiorSequencia, paginasEquivalentes, type RegistroBasico } from './estatisticas'

// Cálculos dos infográficos: retrospectiva de um livro, panorama do grupo
// num ciclo e mapa de horários de leitura.

// ---------- horários ----------
export const BLOCOS = [
  { rotulo: 'Madrugada', frase: 'de madrugada', curto: '0h', de: 0, ate: 5 },
  { rotulo: 'Manhã cedo', frase: 'cedo, pela manhã', curto: '5h', de: 5, ate: 9 },
  { rotulo: 'Manhã', frase: 'pela manhã', curto: '9h', de: 9, ate: 12 },
  { rotulo: 'Início da tarde', frase: 'no início da tarde', curto: '12h', de: 12, ate: 15 },
  { rotulo: 'Fim da tarde', frase: 'no fim da tarde', curto: '15h', de: 15, ate: 18 },
  { rotulo: 'Começo da noite', frase: 'no começo da noite', curto: '18h', de: 18, ate: 21 },
  { rotulo: 'Noite', frase: 'à noite', curto: '21h', de: 21, ate: 24 }
]
export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export interface MapaHorarios {
  grade: number[][] // [diaDaSemana 0-6][bloco 0-6] = páginas
  melhorBloco: number | null
  melhorDia: number | null
  total: number
}

/**
 * Registros lançados para "ontem/anteontem" ficam às 20:00:00 em ponto: não
 * dizem a hora real da leitura, então ficam fora do mapa.
 */
function horaConfiavel(iso: string) {
  const d = new Date(iso)
  return !(d.getHours() === 20 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0)
}

export function mapaHorarios(registros: (RegistroBasico & { ritmo?: number })[], ritmoPadrao: number): MapaHorarios {
  const grade = Array.from({ length: 7 }, () => Array(BLOCOS.length).fill(0) as number[])
  let total = 0
  for (const r of registros) {
    if (!horaConfiavel(r.registrado_em)) continue
    const d = new Date(r.registrado_em)
    const b = BLOCOS.findIndex((x) => d.getHours() >= x.de && d.getHours() < x.ate)
    const p = paginasEquivalentes(r, r.ritmo ?? ritmoPadrao)
    grade[d.getDay()][b] += p
    total += p
  }
  let melhorBloco: number | null = null
  let melhorDia: number | null = null
  if (total > 0) {
    const porBloco = BLOCOS.map((_, b) => grade.reduce((a, l) => a + l[b], 0))
    const porDia = grade.map((l) => l.reduce((a, x) => a + x, 0))
    melhorBloco = porBloco.indexOf(Math.max(...porBloco))
    melhorDia = porDia.indexOf(Math.max(...porDia))
  }
  return { grade, melhorBloco, melhorDia, total }
}

// ---------- retrospectiva de um livro ----------
export interface Retrospectiva {
  paginas: number
  pct: number
  dias: number
  maiorSequencia: number
  sessoes: number
  minutos: number
  anotacoes: { trecho: number; reflexao: number; pergunta: number }
  melhorDia: { data: string; paginas: number } | null
  inicio: string | null
  fim: string | null
  trechoFavorito: { texto: string; pagina: number | null } | null
  horarioPreferido: string | null
}

export async function calcularRetrospectiva(
  membroId: string,
  ritmo: number,
  livro: { id: string; paginas_totais: number }
): Promise<Retrospectiva> {
  const [r, s, a] = await Promise.all([
    supabase.from('registros_leitura').select('paginas_lidas, minutos_lidos, registrado_em')
      .eq('membro_id', membroId).eq('livro_id', livro.id).order('registrado_em'),
    supabase.from('sessoes_pomodoro').select('duracao_minutos')
      .eq('membro_id', membroId).eq('livro_id', livro.id).eq('status', 'concluida'),
    supabase.from('anotacoes').select('tipo, texto, pagina, favorita, created_at')
      .eq('membro_id', membroId).eq('livro_id', livro.id).order('created_at')
  ])
  const regs = (r.data ?? []) as RegistroBasico[]
  const porDia = new Map<string, number>()
  for (const x of regs) {
    const k = chaveDia(x.registrado_em)
    porDia.set(k, (porDia.get(k) ?? 0) + paginasEquivalentes(x, ritmo))
  }
  let melhorDia: Retrospectiva['melhorDia'] = null
  for (const [data, p] of porDia) if (!melhorDia || p > melhorDia.paginas) melhorDia = { data, paginas: Math.round(p) }
  const paginas = Math.min(livro.paginas_totais, Math.round([...porDia.values()].reduce((x, y) => x + y, 0)))
  const notas = (a.data ?? []) as { tipo: 'trecho' | 'reflexao' | 'pergunta'; texto: string; pagina: number | null; favorita: boolean }[]
  const trechos = notas.filter((n) => n.tipo === 'trecho')
  const fav = trechos.find((n) => n.favorita) ?? trechos[0] ?? null
  const mh = mapaHorarios(regs, ritmo)
  const minutos = (s.data ?? []).reduce((x, y) => x + (y.duracao_minutos ?? 0), 0)
  return {
    paginas,
    pct: Math.min(100, Math.round((paginas / livro.paginas_totais) * 100)),
    dias: porDia.size,
    maiorSequencia: maiorSequencia(new Set(porDia.keys())),
    sessoes: (s.data ?? []).length,
    minutos,
    anotacoes: {
      trecho: trechos.length,
      reflexao: notas.filter((n) => n.tipo === 'reflexao').length,
      pergunta: notas.filter((n) => n.tipo === 'pergunta').length
    },
    melhorDia,
    inicio: regs[0]?.registrado_em ?? null,
    fim: regs[regs.length - 1]?.registrado_em ?? null,
    trechoFavorito: fav ? { texto: fav.texto, pagina: fav.pagina } : null,
    horarioPreferido: mh.melhorBloco !== null ? BLOCOS[mh.melhorBloco].frase : null
  }
}

// ---------- panorama do grupo num livro ----------
export interface Panorama {
  paginasGrupo: number
  leitores: number
  terminaram: number
  mediaPct: number
  diasComLeitura: number
  leramHoje: number
  ultimos14: { chave: string; paginas: number }[]
  mural: { trecho: number; reflexao: number; pergunta: number }
  horarios: MapaHorarios
}

export async function calcularPanorama(livro: { id: string; paginas_totais: number }): Promise<Panorama> {
  const [r, a] = await Promise.all([
    supabase.from('registros_leitura').select('membro_id, paginas_lidas, minutos_lidos, registrado_em, perfis(ritmo_leitura_min_por_pagina)')
      .eq('livro_id', livro.id),
    supabase.from('anotacoes').select('tipo').eq('livro_id', livro.id).eq('compartilhada', true)
  ])
  const regs = ((r.data ?? []) as any[]).map((x) => ({ ...x, ritmo: x.perfis?.ritmo_leitura_min_por_pagina ?? 2 }))
  const porMembro = new Map<string, number>()
  const porDia = new Map<string, number>()
  for (const x of regs) {
    const p = paginasEquivalentes(x, x.ritmo)
    porMembro.set(x.membro_id, (porMembro.get(x.membro_id) ?? 0) + p)
    const k = chaveDia(x.registrado_em)
    porDia.set(k, (porDia.get(k) ?? 0) + p)
  }
  const somas = [...porMembro.values()].map((p) => Math.min(p, livro.paginas_totais))
  const hoje = chaveDia(new Date())
  const ultimos14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const chave = chaveDia(d)
    return { chave, paginas: Math.round(porDia.get(chave) ?? 0) }
  })
  const notas = (a.data ?? []) as { tipo: 'trecho' | 'reflexao' | 'pergunta' }[]
  return {
    paginasGrupo: Math.round(somas.reduce((x, y) => x + y, 0)),
    leitores: porMembro.size,
    terminaram: somas.filter((p) => p >= livro.paginas_totais).length,
    mediaPct: somas.length ? Math.round((somas.reduce((x, y) => x + y, 0) / somas.length / livro.paginas_totais) * 100) : 0,
    diasComLeitura: porDia.size,
    leramHoje: new Set(regs.filter((x) => chaveDia(x.registrado_em) === hoje).map((x) => x.membro_id)).size,
    ultimos14,
    mural: {
      trecho: notas.filter((n) => n.tipo === 'trecho').length,
      reflexao: notas.filter((n) => n.tipo === 'reflexao').length,
      pergunta: notas.filter((n) => n.tipo === 'pergunta').length
    },
    horarios: mapaHorarios(regs, 2)
  }
}

// ---------- ritmo do ciclo ----------
export interface PontoRitmo { chave: string; acumulado: number | null; ideal: number | null }

/** Série diária do acumulado do membro contra a linha ideal até o fim do ciclo. */
export function serieRitmo(
  registros: RegistroBasico[],
  ritmo: number,
  livro: { paginas_totais: number; ciclo_inicio: string | null; ciclo_fim: string | null }
): { pontos: PontoRitmo[]; diferenca: number | null } {
  const hoje = chaveDia(new Date())
  const datas = registros.map((r) => chaveDia(r.registrado_em)).sort()
  const inicio = livro.ciclo_inicio ?? datas[0] ?? hoje
  const fim = livro.ciclo_fim && livro.ciclo_fim > hoje ? livro.ciclo_fim : livro.ciclo_fim ?? hoje
  const porDia = new Map<string, number>()
  for (const r of registros) {
    const k = chaveDia(r.registrado_em)
    porDia.set(k, (porDia.get(k) ?? 0) + paginasEquivalentes(r, ritmo))
  }
  const pontos: PontoRitmo[] = []
  const d0 = new Date(inicio + 'T12:00:00')
  const dFim = new Date((fim > hoje ? fim : hoje) + 'T12:00:00')
  const totalDias = livro.ciclo_fim ? Math.max(1, Math.round((new Date(livro.ciclo_fim + 'T12:00:00').getTime() - d0.getTime()) / 86_400_000)) : null
  // registros anteriores ao início do ciclo contam no primeiro dia
  let acumulado = [...porDia.entries()].filter(([k]) => k < inicio).reduce((a, [, p]) => a + p, 0)
  let idealHoje: number | null = null
  // ponto de partida, na véspera do primeiro dia: a curva sai do zero
  const vespera = new Date(d0)
  vespera.setDate(vespera.getDate() - 1)
  pontos.push({ chave: chaveDia(vespera), acumulado: Math.min(livro.paginas_totais, acumulado), ideal: totalDias ? 0 : null })
  for (let d = new Date(d0), i = 0; d <= dFim && i < 400; d.setDate(d.getDate() + 1), i++) {
    const k = chaveDia(d)
    acumulado += porDia.get(k) ?? 0
    const ideal = totalDias ? Math.min(livro.paginas_totais, (livro.paginas_totais * (i + 1)) / (totalDias + 1)) : null
    if (k === hoje) idealHoje = ideal
    pontos.push({ chave: k, acumulado: k <= hoje ? Math.min(livro.paginas_totais, acumulado) : null, ideal })
  }
  const atual = pontos.filter((p) => p.acumulado !== null).slice(-1)[0]?.acumulado ?? 0
  return { pontos, diferenca: idealHoje !== null ? Math.round(atual - idealHoje) : null }
}
