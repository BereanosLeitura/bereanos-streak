import { supabase } from './supabase'

// Busca global: livros do clube, suas anotações e o mural do grupo, de uma vez.
// A proteção de spoiler continua valendo: anotação de outro membro em página
// que você ainda não leu aparece sem o texto, só com a página.

export type TipoResultado = 'livro' | 'minha' | 'mural'

export interface Resultado {
  chave: string
  tipo: TipoResultado
  livroId: string
  livroTitulo: string
  titulo: string
  trecho: string
  pagina: number | null
  autor: string | null
  /** mural: está à frente da página em que a pessoa parou naquele livro */
  escondido: boolean
}

/** Tira acento e caixa, para "coracao" encontrar "coração". */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const CORTE = 110

function recortar(texto: string, termo: string): string {
  const t = texto.replace(/\s+/g, ' ').trim()
  if (t.length <= CORTE) return t
  const i = normalizar(t).indexOf(normalizar(termo))
  if (i < 0) return t.slice(0, CORTE) + '…'
  const de = Math.max(0, i - 35)
  return (de > 0 ? '…' : '') + t.slice(de, de + CORTE).trim() + '…'
}

interface NotaBruta {
  id: string
  tipo: string
  texto: string
  pagina: number | null
  referencia: string | null
  livro_id: string
  membro_id: string
  compartilhada: boolean
  perfis: { nome_exibicao: string } | null
}

const NOME_TIPO: Record<string, string> = {
  trecho: 'Trecho', reflexao: 'Reflexão', pergunta: 'Pergunta', aplicacao: 'Aplicação'
}

/**
 * Procura o termo em livros, nas anotações da pessoa e no mural.
 * Devolve no máximo `limite` resultados de cada grupo, já recortados.
 */
export async function buscarTudo(membroId: string, termo: string, limite = 8): Promise<Resultado[]> {
  const t = termo.trim()
  if (t.length < 2) return []
  const alvo = normalizar(t)

  const [livrosR, notasR, regsR] = await Promise.all([
    supabase.from('livros').select('id, titulo, autor, paginas_totais, status, ciclo_inicio'),
    supabase.from('anotacoes').select('id, tipo, texto, pagina, referencia, livro_id, membro_id, compartilhada, perfis(nome_exibicao)')
      .or(`membro_id.eq.${membroId},compartilhada.eq.true`),
    supabase.from('registros_leitura').select('livro_id, paginas_lidas').eq('membro_id', membroId)
  ])

  const livros = (livrosR.data ?? []) as { id: string; titulo: string; autor: string | null; paginas_totais: number; status: string; ciclo_inicio: string | null }[]
  const porId = new Map(livros.map((l) => [l.id, l]))

  // onde a pessoa parou em cada livro, para a proteção de spoiler
  const minhaPagina = new Map<string, number>()
  for (const r of (regsR.data ?? []) as { livro_id: string; paginas_lidas: number | null }[]) {
    minhaPagina.set(r.livro_id, (minhaPagina.get(r.livro_id) ?? 0) + (r.paginas_lidas ?? 0))
  }

  const achados: Resultado[] = []

  for (const l of livros) {
    if (!normalizar(`${l.titulo} ${l.autor ?? ''}`).includes(alvo)) continue
    achados.push({
      chave: 'livro:' + l.id,
      tipo: 'livro',
      livroId: l.id,
      livroTitulo: l.titulo,
      titulo: l.titulo,
      trecho: [l.autor, l.status === 'ativo' ? 'leitura atual' : 'ciclo concluído'].filter(Boolean).join(' · '),
      pagina: null,
      autor: l.autor,
      escondido: false
    })
    if (achados.length >= limite) break
  }

  const minhas: Resultado[] = []
  const mural: Resultado[] = []

  for (const n of (notasR.data ?? []) as unknown as NotaBruta[]) {
    const campo = `${n.texto} ${n.referencia ?? ''}`
    if (!normalizar(campo).includes(alvo)) continue
    const livro = porId.get(n.livro_id)
    const base = {
      chave: n.id,
      livroId: n.livro_id,
      livroTitulo: livro?.titulo ?? 'Livro do clube',
      titulo: NOME_TIPO[n.tipo] ?? 'Anotação',
      pagina: n.pagina
    }
    if (n.membro_id === membroId) {
      if (minhas.length < limite) {
        minhas.push({ ...base, tipo: 'minha', trecho: recortar(n.texto, t), autor: null, escondido: false })
      }
    } else if (n.compartilhada && mural.length < limite) {
      const paro = minhaPagina.get(n.livro_id) ?? 0
      const escondido = !!n.pagina && n.pagina > paro
      mural.push({
        ...base,
        tipo: 'mural',
        trecho: escondido ? '' : recortar(n.texto, t),
        autor: n.perfis?.nome_exibicao ?? null,
        escondido
      })
    }
  }

  return [...achados, ...minhas, ...mural]
}
