import { supabase, type Perfil } from './supabase'
import { chaveDia, paginasEquivalentes, type RegistroBasico } from './estatisticas'
import { planoCiclo } from './infograficos'
import { buscarConclusoes } from './pendentes'

// Métricas do app: as suas (só você vê) e as do grupo (totais e distribuições,
// sem nomes e sem ranking: o clube não compara membros).

export interface LivroMetricas {
  id: string
  titulo: string
  paginas_totais: number
  ciclo_inicio: string | null
  ciclo_fim: string | null
}

interface Reg extends RegistroBasico {
  membro_id: string
  livro_id: string
  origem?: string
  tempo_minutos?: number | null
  ritmo: number
}

export interface Barra { rotulo: string; valor: number; detalhe?: string }
export type TipoNota = 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'

export interface MetricasVoce {
  ciclo: { paginas: number; pct: number; dias: number; mediaPorDia: number; minutos: number; registros: number }
  ritmoReal: number | null // min por página medidos nos registros com tempo
  ritmoInformado: number
  plano: { ate: number; fimSemana: string; atual: number } | null
  semanas: Barra[]
  calendario: { chave: string; paginas: number; futuro: boolean }[]
  notas: Record<TipoNota, number>
  livros: { titulo: string; pct: number; paginas: number }[]
  geral: { paginas: number; dias: number; terminados: number }
}

export interface MetricasGrupo {
  membros: number
  ativos7: number
  ativosCiclo: number
  paginasCiclo: number
  mediaPct: number
  terminaram: number
  faixas: Barra[]
  semanas: Barra[]
  diasSemana: Barra[]
  melhorDia: string | null
  mural: Record<TipoNota, number>
  encontros: { data: string; titulo: string; presentes: number }[]
  livros: { titulo: string; paginas: number; leitores: number; terminaram: number; atual: boolean }[]
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function inicioDaSemana(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}
const rotuloDia = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`

async function buscarRegistros(): Promise<Reg[]> {
  const consulta = (campos: string) => supabase.from('registros_leitura').select(campos)
  let r = await consulta('membro_id, livro_id, origem, paginas_lidas, minutos_lidos, tempo_minutos, registrado_em, perfis(ritmo_leitura_min_por_pagina)')
  if (r.error) r = await consulta('membro_id, livro_id, origem, paginas_lidas, minutos_lidos, registrado_em, perfis(ritmo_leitura_min_por_pagina)')
  return ((r.data ?? []) as any[]).map((x) => ({ ...x, ritmo: x.perfis?.ritmo_leitura_min_por_pagina ?? 2 }))
}

export async function calcularMetricas(perfil: Perfil, livro: LivroMetricas): Promise<{ voce: MetricasVoce; grupo: MetricasGrupo }> {
  const [regs, livrosR, perfisR, sessR, minhasR, muralR, encR, presR, conclusoes] = await Promise.all([
    buscarRegistros(),
    supabase.from('livros').select('id, titulo, paginas_totais, status, created_at').order('created_at', { ascending: false }),
    supabase.from('perfis').select('id'),
    supabase.from('sessoes_pomodoro').select('livro_id, duracao_minutos').eq('membro_id', perfil.id).eq('status', 'concluida'),
    supabase.from('anotacoes').select('tipo, livro_id').eq('membro_id', perfil.id),
    supabase.from('anotacoes').select('tipo').eq('livro_id', livro.id).eq('compartilhada', true),
    supabase.from('encontros').select('id, data, livro_id').lte('data', new Date().toISOString()).order('data', { ascending: false }).limit(12),
    supabase.from('presencas').select('encontro_id'),
    buscarConclusoes()
  ])
  const terminouMarcado = (livroId: string, membroId: string) => conclusoes.get(`${livroId}:${membroId}`) === 'terminou'
  const livros = (livrosR.data ?? []) as { id: string; titulo: string; paginas_totais: number; status: string }[]
  const totalPaginas = new Map(livros.map((l) => [l.id, l.paginas_totais]))
  const pe = (r: Reg) => paginasEquivalentes(r, r.ritmo)
  const hoje = new Date()
  const chaveHoje = chaveDia(hoje)

  // ---------------- você ----------------
  const meus = regs.filter((r) => r.membro_id === perfil.id)
  const meusCiclo = meus.filter((r) => r.livro_id === livro.id)
  const pagCiclo = Math.min(livro.paginas_totais, meusCiclo.reduce((s, r) => s + pe(r), 0))
  const diasCiclo = new Set(meusCiclo.map((r) => chaveDia(r.registrado_em)))
  const sessoes = (sessR.data ?? []) as { livro_id: string; duracao_minutos: number | null }[]
  const minutosCiclo = sessoes.filter((s) => s.livro_id === livro.id).reduce((s, x) => s + (x.duracao_minutos ?? 0), 0)
    + meusCiclo.reduce((s, r) => s + (r.origem === 'manual' ? r.tempo_minutos ?? 0 : 0), 0)

  const comTempo = meus.filter((r) => r.paginas_lidas && r.tempo_minutos)
  const ritmoReal = comTempo.length >= 3
    ? comTempo.reduce((s, r) => s + (r.tempo_minutos ?? 0), 0) / comTempo.reduce((s, r) => s + (r.paginas_lidas ?? 0), 0)
    : null

  const plano = planoCiclo(livro)
  const semanaAtual = plano?.find((s) => s.atual)

  // últimas 8 semanas (domingo a sábado)
  const semana0 = inicioDaSemana(hoje)
  const semanasIni = Array.from({ length: 8 }, (_, i) => { const d = new Date(semana0); d.setDate(d.getDate() - 7 * (7 - i)); return d })
  const indiceSemana = (iso: string) => {
    const d = new Date(iso)
    for (let i = 7; i >= 0; i--) if (d >= semanasIni[i]) return i
    return -1
  }
  const minhasSemanas = Array(8).fill(0)
  for (const r of meus) { const i = indiceSemana(r.registrado_em); if (i >= 0) minhasSemanas[i] += pe(r) }

  // calendário: 4 semanas terminando no sábado desta semana
  const porDiaMeu = new Map<string, number>()
  for (const r of meus) { const k = chaveDia(r.registrado_em); porDiaMeu.set(k, (porDiaMeu.get(k) ?? 0) + pe(r)) }
  const cal0 = new Date(semana0); cal0.setDate(cal0.getDate() - 21)
  const calendario = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(cal0); d.setDate(d.getDate() + i)
    const chave = chaveDia(d)
    return { chave, paginas: Math.round(porDiaMeu.get(chave) ?? 0), futuro: chave > chaveHoje }
  })

  const notas: Record<TipoNota, number> = { trecho: 0, reflexao: 0, pergunta: 0, aplicacao: 0 }
  for (const n of (minhasR.data ?? []) as { tipo: TipoNota; livro_id: string }[]) if (n.livro_id === livro.id && n.tipo in notas) notas[n.tipo]++

  const porLivroMeu = new Map<string, number>()
  for (const r of meus) porLivroMeu.set(r.livro_id, (porLivroMeu.get(r.livro_id) ?? 0) + pe(r))
  const meusLivros = livros
    .filter((l) => porLivroMeu.has(l.id))
    .map((l) => {
      const p = Math.min(l.paginas_totais, porLivroMeu.get(l.id) ?? 0)
      return { titulo: l.titulo, paginas: Math.round(p), pct: terminouMarcado(l.id, perfil.id) ? 100 : Math.round((p / l.paginas_totais) * 100) }
    })

  const voce: MetricasVoce = {
    ciclo: {
      paginas: Math.round(pagCiclo),
      pct: Math.round((pagCiclo / livro.paginas_totais) * 100),
      dias: diasCiclo.size,
      mediaPorDia: diasCiclo.size ? Math.round(pagCiclo / diasCiclo.size) : 0,
      minutos: Math.round(minutosCiclo),
      registros: meusCiclo.length
    },
    ritmoReal: ritmoReal ? Math.round(ritmoReal * 10) / 10 : null,
    ritmoInformado: perfil.ritmo_leitura_min_por_pagina || 2,
    plano: semanaAtual ? { ate: semanaAtual.ate, fimSemana: semanaAtual.fim, atual: Math.round(pagCiclo) } : null,
    semanas: semanasIni.map((d, i) => ({ rotulo: rotuloDia(d), valor: Math.round(minhasSemanas[i]) })),
    calendario,
    notas,
    livros: meusLivros,
    geral: {
      paginas: Math.round([...porLivroMeu.entries()].reduce((s, [id, p]) => s + Math.min(totalPaginas.get(id) ?? p, p), 0)),
      dias: new Set(meus.map((r) => chaveDia(r.registrado_em))).size,
      terminados: meusLivros.filter((l) => l.pct >= 100).length
    }
  }

  // ---------------- grupo ----------------
  const membros = Math.max(1, (perfisR.data ?? []).length)
  const sete = new Date(hoje); sete.setDate(sete.getDate() - 6); sete.setHours(0, 0, 0, 0)
  const ativos7 = new Set(regs.filter((r) => new Date(r.registrado_em) >= sete).map((r) => r.membro_id)).size
  const doCiclo = regs.filter((r) => r.livro_id === livro.id)
  const porMembro = new Map<string, number>()
  for (const r of doCiclo) porMembro.set(r.membro_id, (porMembro.get(r.membro_id) ?? 0) + pe(r))
  const progresso = (perfisR.data ?? []).map((p: { id: string }) => terminouMarcado(livro.id, p.id) ? 100 : Math.min(livro.paginas_totais, porMembro.get(p.id) ?? 0) / livro.paginas_totais * 100)
  const somaCiclo = [...porMembro.values()].reduce((s, p) => s + Math.min(livro.paginas_totais, p), 0)
  const faixasDef: [string, (p: number) => boolean][] = [
    ['Ainda não começou', (p) => p === 0],
    ['Até 24%', (p) => p > 0 && p < 25],
    ['25% a 49%', (p) => p >= 25 && p < 50],
    ['50% a 74%', (p) => p >= 50 && p < 75],
    ['75% a 99%', (p) => p >= 75 && p < 100],
    ['Terminou', (p) => p >= 100]
  ]
  const semanasGrupo = Array(8).fill(0)
  const leitoresSemana = Array.from({ length: 8 }, () => new Set<string>())
  for (const r of regs) {
    const i = indiceSemana(r.registrado_em)
    if (i >= 0) { semanasGrupo[i] += pe(r); leitoresSemana[i].add(r.membro_id) }
  }
  const porDiaSemana = Array(7).fill(0)
  for (const r of regs) if (new Date(r.registrado_em) >= semanasIni[0]) porDiaSemana[new Date(r.registrado_em).getDay()] += pe(r)
  const maxDia = Math.max(...porDiaSemana)
  const mural: Record<TipoNota, number> = { trecho: 0, reflexao: 0, pergunta: 0, aplicacao: 0 }
  for (const n of (muralR.data ?? []) as { tipo: TipoNota }[]) if (n.tipo in mural) mural[n.tipo]++
  const presencas = new Map<string, number>()
  for (const p of (presR.data ?? []) as { encontro_id: string }[]) presencas.set(p.encontro_id, (presencas.get(p.encontro_id) ?? 0) + 1)
  const tituloLivro = new Map(livros.map((l) => [l.id, l.titulo]))
  const encontros = ((encR.data ?? []) as { id: string; data: string; livro_id: string }[])
    .map((e) => ({ data: e.data, titulo: tituloLivro.get(e.livro_id) ?? '', presentes: presencas.get(e.id) ?? 0 }))

  const livrosClube = livros.map((l) => {
    const pm = new Map<string, number>()
    for (const r of regs) if (r.livro_id === l.id) pm.set(r.membro_id, (pm.get(r.membro_id) ?? 0) + pe(r))
    const somas = [...pm.values()].map((p) => Math.min(l.paginas_totais, p))
    const terminaramAqui = new Set([...pm.entries()].filter(([, p]) => p >= l.paginas_totais).map(([m]) => m))
    for (const k of conclusoes.keys()) if (k.startsWith(l.id + ':') && conclusoes.get(k) === 'terminou') terminaramAqui.add(k.split(':')[1])
    return {
      titulo: l.titulo,
      paginas: Math.round(somas.reduce((s, p) => s + p, 0)),
      leitores: new Set([...pm.keys(), ...terminaramAqui]).size,
      terminaram: terminaramAqui.size,
      atual: l.id === livro.id
    }
  }).filter((l) => l.leitores > 0 || l.atual)

  const grupo: MetricasGrupo = {
    membros,
    ativos7,
    ativosCiclo: porMembro.size,
    paginasCiclo: Math.round(somaCiclo),
    mediaPct: Math.round(progresso.reduce((s, p) => s + p, 0) / membros),
    terminaram: progresso.filter((p) => p >= 100).length,
    faixas: faixasDef.map(([rotulo, f]) => ({ rotulo, valor: progresso.filter(f).length })),
    semanas: semanasIni.map((d, i) => ({ rotulo: rotuloDia(d), valor: Math.round(semanasGrupo[i]), detalhe: `${leitoresSemana[i].size} ${leitoresSemana[i].size === 1 ? 'leitor' : 'leitores'}` })),
    diasSemana: porDiaSemana.map((v, i) => ({ rotulo: LETRAS[i], valor: Math.round(v) })),
    melhorDia: maxDia > 0 ? DIAS[porDiaSemana.indexOf(maxDia)] : null,
    mural,
    encontros,
    livros: livrosClube
  }

  return { voce, grupo }
}
