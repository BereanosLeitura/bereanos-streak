import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icone from './Icone'
import { buscarTudo, type Resultado, type TipoResultado } from '../lib/busca'

// Uma caixa de busca que procura em tudo: livros do clube, suas anotações e o
// mural. O que está à frente da sua página continua protegido de spoiler.

const GRUPOS: { tipo: TipoResultado; titulo: string }[] = [
  { tipo: 'livro', titulo: 'Livros do clube' },
  { tipo: 'minha', titulo: 'Suas anotações' },
  { tipo: 'mural', titulo: 'Mural do grupo' }
]

interface Props {
  membroId: string
  onAbrirLivro: (livroId: string) => void
  onAbrirNotas: (vista: 'minhas' | 'mural', termo: string) => void
  onFechar: () => void
}

export default function BuscaGlobal({ membroId, onAbrirLivro, onAbrirNotas, onFechar }: Props) {
  const [termo, setTermo] = useState('')
  const [itens, setItens] = useState<Resultado[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    campo.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  // espera a pessoa parar de digitar antes de ir ao banco
  useEffect(() => {
    const t = termo.trim()
    if (t.length < 2) { setItens(null); setBuscando(false); return }
    setBuscando(true)
    let valeu = true
    const id = setTimeout(() => {
      buscarTudo(membroId, t)
        .then((r) => { if (valeu) setItens(r) })
        .catch(() => { if (valeu) setItens([]) })
        .finally(() => { if (valeu) setBuscando(false) })
    }, 280)
    return () => { valeu = false; clearTimeout(id) }
  }, [termo, membroId])

  function abrir(r: Resultado) {
    if (r.tipo === 'livro') onAbrirLivro(r.livroId)
    else onAbrirNotas(r.tipo === 'minha' ? 'minhas' : 'mural', termo.trim())
    onFechar()
  }

  const vazio = itens !== null && itens.length === 0 && !buscando

  return createPortal(
    <div className="fixed inset-0 z-[65] bg-bege dark:bg-noite flex flex-col" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3 border-b border-marinho/[0.08] dark:border-bege/[0.08]">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button onClick={onFechar} className="p-2 -ml-2 text-texto/70 dark:text-bege/70" aria-label="Fechar busca">
            <Icone nome="seta-esquerda" />
          </button>
          <input
            ref={campo} type="search" value={termo} onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar livro, trecho, pergunta…" aria-label="O que você procura"
            className="campo flex-1" autoComplete="off" enterKeyHint="search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto">
          {termo.trim().length < 2 && (
            <p className="text-sm text-texto/65 dark:text-bege/55 leading-relaxed mt-6 text-center">
              Procure por um livro, por uma frase que você anotou ou por algo que alguém pôs no mural.
              <br />Dois caracteres já bastam.
            </p>
          )}

          {buscando && itens === null && <div className="space-y-2 mt-2">{[0, 1, 2].map((i) => <div key={i} className="esqueleto h-16" />)}</div>}

          {vazio && (
            <p className="text-sm text-texto/65 dark:text-bege/55 mt-8 text-center">
              Nada encontrado para “{termo.trim()}”.
            </p>
          )}

          {itens && itens.length > 0 && GRUPOS.map((g) => {
            const lista = itens.filter((r) => r.tipo === g.tipo)
            if (!lista.length) return null
            return (
              <section key={g.tipo} className="mt-5 first:mt-1">
                <h2 className="text-[11px] tracking-[.18em] uppercase text-dourado-escuro dark:text-dourado font-semibold mb-2">{g.titulo}</h2>
                <ul className="cartao divide-y divide-marinho/[0.07] dark:divide-bege/[0.07] overflow-hidden">
                  {lista.map((r) => (
                    <li key={r.chave}>
                      <button onClick={() => abrir(r)} className="w-full text-left px-4 py-3 active:bg-marinho/[0.04] dark:active:bg-bege/[0.05]">
                        <p className="flex items-center gap-2 text-xs text-texto/65 dark:text-bege/55">
                          <span className="font-semibold text-marinho dark:text-bege">{r.titulo}</span>
                          {r.pagina && <span className="tabular">p. {r.pagina}</span>}
                          {r.tipo !== 'livro' && <span className="truncate">{r.livroTitulo}</span>}
                        </p>
                        {r.escondido ? (
                          <p className="flex items-center gap-1.5 text-sm text-texto/70 dark:text-bege/60 mt-1">
                            <Icone nome="cadeado" className="w-3.5 h-3.5 text-dourado shrink-0" />
                            Anotação de uma página que você ainda não leu
                          </p>
                        ) : (
                          <p className="text-sm text-texto dark:text-bege/85 mt-1 leading-snug">{r.trecho}</p>
                        )}
                        {r.tipo === 'mural' && r.autor && !r.escondido && <p className="text-xs text-texto/55 dark:text-bege/45 mt-1">{r.autor}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
