import { supabase, buscarTodas } from './supabase'
import { terminouLivro } from './regras'
import { paginasEquivalentes } from './estatisticas'

// Memória do clube: a caminhada em ordem, livro a livro, com o encontro de cada
// ciclo. O clube guarda sua origem; a expansão não apaga o começo.

/** Fundação do Clube do Livro Bereanos, em Fortaleza. */
export const FUNDACAO = '2026-06-30'

/** Fundadores, na grafia oficial. Ordem alfabética, sem hierarquia. */
export const FUNDADORES = [
  'Esaú dos Santos Lima',
  'Francisco Danilo Silva Mariano',
  'Francisco Madson Ferreira de Sousa',
  'Isaias Rodrigues de Lima',
  'Lucas Marques Queiroz',
  'Luis Felipe Magalhães da Silva'
]

export interface EncontroDaMemoria {
  data: string
  local: string | null
  presentes: number
}

export interface CicloDaMemoria {
  id: string
  titulo: string
  autor: string | null
  capaUrl: string | null
  paginasTotais: number
  inicio: string | null
  fim: string | null
  ativo: boolean
  /** páginas lidas por todo o grupo neste livro */
  paginasDoGrupo: number
  leitores: number
  terminaram: number
  anotacoesNoMural: number
  encontros: EncontroDaMemoria[]
}

export interface Memoria {
  ciclos: CicloDaMemoria[]
  totalPaginas: number
  totalLivros: number
  totalEncontros: number
}

export async function carregarMemoria(): Promise<Memoria> {
  const [livrosR, regsR, statusR, notasR, encR, presR, perfisR] = await Promise.all([
    supabase.from('livros').select('id, titulo, autor, capa_url, paginas_totais, ciclo_inicio, ciclo_fim, status, created_at'),
    buscarTodas(() => supabase.from('registros_leitura').select('id, livro_id, membro_id, paginas_lidas, minutos_lidos, registrado_em').order('id')),
    supabase.from('leituras_status').select('livro_id, membro_id, status'),
    supabase.from('anotacoes').select('livro_id').eq('compartilhada', true),
    supabase.from('encontros').select('id, livro_id, data, local').order('data'),
    supabase.from('presencas').select('encontro_id'),
    supabase.from('perfis').select('id, ritmo_leitura_min_por_pagina')
  ])

  const ritmo = new Map(((perfisR.data ?? []) as { id: string; ritmo_leitura_min_por_pagina: number | null }[])
    .map((p) => [p.id, p.ritmo_leitura_min_por_pagina ?? 2]))

  // páginas de cada membro em cada livro ("livro:membro")
  const porLeitor = new Map<string, number>()
  const leitores = new Map<string, Set<string>>()
  for (const r of (regsR.data ?? []) as { livro_id: string; membro_id: string; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string }[]) {
    const k = `${r.livro_id}:${r.membro_id}`
    porLeitor.set(k, (porLeitor.get(k) ?? 0) + paginasEquivalentes(r, ritmo.get(r.membro_id) ?? 2))
    if (!leitores.has(r.livro_id)) leitores.set(r.livro_id, new Set())
    leitores.get(r.livro_id)!.add(r.membro_id)
  }
  const status = new Map(((statusR.data ?? []) as { livro_id: string; membro_id: string; status: string }[])
    .map((s) => [`${s.livro_id}:${s.membro_id}`, s.status]))
  const totalDoLivro = new Map(((livrosR.data ?? []) as { id: string; paginas_totais: number }[]).map((l) => [l.id, l.paginas_totais]))

  // Mesma conta das Métricas: cada pessoa conta no máximo o livro inteiro, e
  // "terminou" vale pela última página ou pela marcação "Terminei".
  const paginas = new Map<string, number>()
  const terminaram = new Map<string, number>()
  for (const k of new Set([...porLeitor.keys(), ...status.keys()])) {
    const livroId = k.split(':')[0]
    const total = totalDoLivro.get(livroId) ?? 0
    const lidas = porLeitor.get(k) ?? 0
    paginas.set(livroId, (paginas.get(livroId) ?? 0) + Math.min(lidas, total))
    if (terminouLivro(lidas, total, status.get(k))) {
      terminaram.set(livroId, (terminaram.get(livroId) ?? 0) + 1)
      // quem terminou fora do app também foi leitor daquele ciclo
      if (!leitores.has(livroId)) leitores.set(livroId, new Set())
      leitores.get(livroId)!.add(k.split(':')[1])
    }
  }

  const notas = new Map<string, number>()
  for (const n of (notasR.data ?? []) as { livro_id: string }[]) {
    notas.set(n.livro_id, (notas.get(n.livro_id) ?? 0) + 1)
  }

  const presentes = new Map<string, number>()
  for (const p of (presR.data ?? []) as { encontro_id: string }[]) {
    presentes.set(p.encontro_id, (presentes.get(p.encontro_id) ?? 0) + 1)
  }

  const encontrosPorLivro = new Map<string, EncontroDaMemoria[]>()
  let totalEncontros = 0
  const agora = Date.now()
  for (const e of (encR.data ?? []) as { id: string; livro_id: string; data: string; local: string | null }[]) {
    if (new Date(e.data).getTime() > agora) continue // encontro ainda por acontecer não é memória
    totalEncontros++
    const lista = encontrosPorLivro.get(e.livro_id) ?? []
    lista.push({ data: e.data, local: e.local, presentes: presentes.get(e.id) ?? 0 })
    encontrosPorLivro.set(e.livro_id, lista)
  }

  type LivroRow = { id: string; titulo: string; autor: string | null; capa_url: string | null; paginas_totais: number; ciclo_inicio: string | null; ciclo_fim: string | null; status: string; created_at: string }
  const ciclos: CicloDaMemoria[] = ((livrosR.data ?? []) as LivroRow[])
    .map((l) => ({
      id: l.id,
      titulo: l.titulo,
      autor: l.autor,
      capaUrl: l.capa_url,
      paginasTotais: l.paginas_totais,
      inicio: l.ciclo_inicio,
      fim: l.ciclo_fim,
      ativo: l.status === 'ativo',
      paginasDoGrupo: Math.round(paginas.get(l.id) ?? 0),
      leitores: leitores.get(l.id)?.size ?? 0,
      terminaram: terminaram.get(l.id) ?? 0,
      anotacoesNoMural: notas.get(l.id) ?? 0,
      encontros: encontrosPorLivro.get(l.id) ?? []
    }))
    .sort((a, b) => (a.inicio ?? '9999').localeCompare(b.inicio ?? '9999'))

  return {
    ciclos,
    totalPaginas: ciclos.reduce((s, c) => s + c.paginasDoGrupo, 0),
    totalLivros: ciclos.length,
    totalEncontros
  }
}
