import { supabase } from './supabase'
import { chaveDia, paginasEquivalentes, diasAte } from './estatisticas'
import { buscarConclusoes } from './pendentes'
import { planoCiclo } from './infograficos'

// Números que o admin precisa ver de relance sobre o ciclo em andamento, e a
// mensagem pronta para o grupo. Sem ranking e sem cobrança: a lista é presença,
// não classificação, e os textos sempre lembram que o plano é referência.

export interface LivroDoCiclo {
  id: string
  titulo: string
  autor: string | null
  paginas_totais: number
  ciclo_inicio: string | null
  ciclo_fim: string | null
  encontro_em?: string | null
  encontro_local?: string | null
}

export interface MembroNoCiclo {
  id: string
  nome: string
  paginas: number
  pct: number
  ultima: string | null
  terminou: boolean
  semPrimeiroAcesso: boolean
}

export interface ResumoCiclo {
  membros: MembroNoCiclo[]
  comAcesso: number
  jaLeram: number
  terminaram: number
  leramNaSemana: number
  paradosSeteDias: number
  semPrimeiroAcesso: number
  mediaPct: number
  paginasGrupo: number
  anotacoesMural: number
  diasRestantes: number | null
  diasCorridos: number | null
  cicloVencido: boolean
  /** página que o plano do ciclo sugere para esta semana */
  metaDaSemana: number | null
}

/** Dias entre duas datas, pela chave AAAA-MM-DD (sem fuso para atrapalhar). */
function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86_400_000)
}

export async function resumoDoCiclo(livro: LivroDoCiclo): Promise<ResumoCiclo> {
  const [p, r, a, conc] = await Promise.all([
    supabase.from('perfis').select('id, nome_exibicao, senha_temporaria, ritmo_leitura_min_por_pagina').order('nome_exibicao'),
    supabase.from('registros_leitura').select('membro_id, paginas_lidas, minutos_lidos, registrado_em').eq('livro_id', livro.id),
    supabase.from('anotacoes').select('id', { count: 'exact', head: true }).eq('livro_id', livro.id).eq('compartilhada', true),
    buscarConclusoes({ livroId: livro.id })
  ])

  const perfis = (p.data ?? []) as { id: string; nome_exibicao: string; senha_temporaria: boolean | null; ritmo_leitura_min_por_pagina: number | null }[]
  const regs = (r.data ?? []) as { membro_id: string; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string }[]

  const paginas = new Map<string, number>()
  const ultima = new Map<string, string>()
  for (const x of regs) {
    const ritmo = perfis.find((q) => q.id === x.membro_id)?.ritmo_leitura_min_por_pagina ?? 2
    paginas.set(x.membro_id, (paginas.get(x.membro_id) ?? 0) + paginasEquivalentes(x, ritmo))
    if (!ultima.has(x.membro_id) || x.registrado_em > ultima.get(x.membro_id)!) ultima.set(x.membro_id, x.registrado_em)
  }

  const hoje = chaveDia(new Date())
  const membros: MembroNoCiclo[] = perfis.map((q) => {
    const lidas = Math.min(Math.round(paginas.get(q.id) ?? 0), livro.paginas_totais)
    const marcado = conc.get(`${livro.id}:${q.id}`) === 'terminou'
    return {
      id: q.id,
      nome: q.nome_exibicao,
      paginas: lidas,
      pct: livro.paginas_totais ? Math.round((lidas / livro.paginas_totais) * 100) : 0,
      ultima: ultima.get(q.id) ?? null,
      terminou: marcado || lidas >= livro.paginas_totais,
      semPrimeiroAcesso: !!q.senha_temporaria
    }
  })
  membros.sort((x, y) => y.pct - x.pct || x.nome.localeCompare(y.nome, 'pt-BR'))

  const comLeitura = membros.filter((m) => m.ultima)
  const mediaPct = comLeitura.length
    ? Math.round(comLeitura.reduce((s, m) => s + m.pct, 0) / comLeitura.length)
    : 0

  return {
    membros,
    comAcesso: membros.length,
    jaLeram: comLeitura.length,
    terminaram: membros.filter((m) => m.terminou).length,
    leramNaSemana: membros.filter((m) => m.ultima && diasEntre(chaveDia(m.ultima), hoje) <= 7).length,
    paradosSeteDias: membros.filter((m) => m.ultima && diasEntre(chaveDia(m.ultima), hoje) > 7).length,
    semPrimeiroAcesso: membros.filter((m) => m.semPrimeiroAcesso).length,
    mediaPct,
    paginasGrupo: membros.reduce((s, m) => s + m.paginas, 0),
    anotacoesMural: a.count ?? 0,
    diasRestantes: diasAte(livro.ciclo_fim),
    diasCorridos: livro.ciclo_inicio ? diasEntre(livro.ciclo_inicio, hoje) + 1 : null,
    cicloVencido: !!livro.ciclo_fim && livro.ciclo_fim < hoje,
    metaDaSemana: planoCiclo(livro)?.find((s) => s.atual)?.ate ?? null
  }
}

export { mensagemDaSemana } from './avisoSemana'
