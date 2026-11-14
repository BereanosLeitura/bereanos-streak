// A extensão .ts fica explícita porque este módulo é puro e roda direto no
// Node pelos testes, sem passar pelo Vite.
import { contar } from './estatisticas.ts'

// Texto do aviso semanal no WhatsApp, no tom do clube: informa, convida e nunca
// cobra. Função pura (sem Supabase e sem React) para os testes conferirem o
// texto palavra por palavra.

export interface LivroDoAviso {
  titulo: string
  autor: string | null
  paginas_totais: number
  ciclo_fim?: string | null
  encontro_em?: string | null
  encontro_local?: string | null
}

export interface NumerosDoAviso {
  paginasGrupo: number
  mediaPct: number
  jaLeram: number
  comAcesso: number
  leramNaSemana: number
  metaDaSemana: number | null
  anotacoesMural: number
  diasRestantes: number | null
}

/**
 * Texto do aviso semanal no WhatsApp, no tom do clube: informa, convida e
 * nunca cobra. Função pura para os testes conferirem o texto.
 */
export function mensagemDaSemana(livro: LivroDoAviso, r: NumerosDoAviso): string {
  const l: string[] = []
  l.push('Clube do Livro Bereanos | Leitura')
  l.push('')
  l.push(`Estamos em ${livro.titulo}${livro.autor ? `, de ${livro.autor}` : ''}.`)

  const juntos = `Até agora o grupo já leu ${contar(r.paginasGrupo, 'página', 'páginas')} deste livro`
  l.push(r.jaLeram ? `${juntos}, e quem está registrando está em média em ${r.mediaPct}% da leitura.` : `${juntos}.`)
  if (r.leramNaSemana) l.push(`Nos últimos 7 dias, ${r.leramNaSemana} de ${r.comAcesso} registraram leitura.`)

  if (r.metaDaSemana) {
    l.push('')
    l.push(`O plano desta semana sugere chegar à página ${r.metaDaSemana}. É uma referência para quem quiser se guiar, não uma cobrança: quem estiver mais atrás participa do encontro do mesmo jeito.`)
  } else if (r.diasRestantes !== null) {
    l.push('')
    l.push(`Faltam ${contar(r.diasRestantes, 'dia', 'dias')} de ciclo.`)
  }

  if (r.anotacoesMural) {
    l.push('')
    l.push(`O mural já tem ${contar(r.anotacoesMural, 'anotação', 'anotações')} do grupo. Vale passar por lá e responder a de alguém.`)
  }

  if (livro.encontro_em) {
    const d = new Date(livro.encontro_em)
    const data = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    l.push('')
    l.push(`Próximo encontro: ${data}, às ${hora}${livro.encontro_local ? `, ${livro.encontro_local}` : ''}.`)
  }

  l.push('')
  l.push('Mais importante do que terminar rápido é aproveitar bem a leitura.')
  return l.join('\n')
}
