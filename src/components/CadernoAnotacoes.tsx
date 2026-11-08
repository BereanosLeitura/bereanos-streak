import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, type Perfil } from '../lib/supabase'
import Icone from './Icone'

// "Baixar minhas anotações": monta um caderno com as anotações do livro,
// organizado por tipo e página, pronto para imprimir ou salvar em PDF
// (pelo "Imprimir" do celular ou do computador) e levar ao encontro.

type Tipo = 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'
interface Nota { tipo: Tipo; texto: string; pagina: number | null; referencia: string | null; favorita: boolean }

const SECOES: { tipo: Tipo; titulo: string; legenda: string }[] = [
  { tipo: 'pergunta', titulo: 'Perguntas para o encontro', legenda: 'Dúvidas para examinar nas Escrituras e levar à conversa' },
  { tipo: 'trecho', titulo: 'Trechos', legenda: 'Frases do livro que marcaram' },
  { tipo: 'reflexao', titulo: 'Reflexões', legenda: 'O que a leitura fez pensar' },
  { tipo: 'aplicacao', titulo: 'Aplicações', legenda: 'O que quero praticar' }
]

interface Props {
  perfil: Perfil
  livro: { id: string; titulo: string; autor: string | null; paginas_totais: number }
  paginaAtual: number
  onFechar: () => void
}

export default function CadernoAnotacoes({ perfil, livro, paginaAtual, onFechar }: Props) {
  const [notas, setNotas] = useState<Nota[] | null>(null)
  const [comLinhas, setComLinhas] = useState(true)

  useEffect(() => {
    supabase.from('anotacoes').select('tipo, texto, pagina, referencia, favorita')
      .eq('livro_id', livro.id).eq('membro_id', perfil.id)
      .then(({ data }) => setNotas(((data ?? []) as Nota[]).sort((a, b) => (a.pagina ?? 99999) - (b.pagina ?? 99999))))
    document.body.classList.add('imprimindo-caderno')
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => { document.body.classList.remove('imprimindo-caderno'); window.removeEventListener('keydown', esc) }
  }, [livro.id, perfil.id])

  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const pct = Math.min(100, Math.round((paginaAtual / livro.paginas_totais) * 100))
  const vazio = notas !== null && notas.length === 0

  return createPortal(
    <div className="caderno-impressao fixed inset-0 z-[80] overflow-y-auto bg-[#F4F1EA] dark:bg-noite" role="dialog" aria-modal="true" aria-label="Caderno de anotações">
      <div className="nao-imprimir sticky top-0 z-10 bg-marinho text-bege px-4 py-3 flex items-center gap-2 shadow-md">
        <button onClick={onFechar} className="p-1.5 -ml-1.5" aria-label="Fechar"><Icone nome="x" /></button>
        <p className="font-semibold text-sm flex-1">Minhas anotações</p>
        <button onClick={() => window.print()} disabled={!notas || vazio}
          className="flex items-center gap-1.5 rounded-full bg-dourado text-marinho px-3.5 py-1.5 text-sm font-semibold disabled:opacity-50">
          <Icone nome="baixar" className="w-4 h-4" /> Salvar PDF ou imprimir
        </button>
      </div>
      <div className="nao-imprimir max-w-[720px] mx-auto px-4 pt-3 text-xs text-texto/60 dark:text-bege/60 flex items-center justify-between gap-3">
        <span>No celular, escolha "Salvar como PDF" na tela de impressão.</span>
        <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
          <input type="checkbox" checked={comLinhas} onChange={(e) => setComLinhas(e.target.checked)} className="w-4 h-4 accent-[#B8912F]" />
          Página para o encontro
        </label>
      </div>

      <article className="folha-caderno max-w-[720px] mx-auto my-4 bg-white text-[#222] shadow-lg px-8 sm:px-14 py-12 font-serif">
        <header className="text-center">
          <p className="text-[11px] tracking-[.3em] text-[#8A6D2B] font-semibold">CLUBE DO LIVRO BEREANOS</p>
          <h1 className="text-[30px] leading-tight text-[#1B2A4A] mt-3">{livro.titulo}</h1>
          {livro.autor && <p className="italic text-[#8A6D2B] text-lg">{livro.autor}</p>}
          <p className="text-[#B8912F] text-sm my-3" aria-hidden="true">────────  ◆  ────────</p>
          <p className="text-[15px]">Anotações de <strong>{perfil.nome_exibicao}</strong></p>
          <p className="text-[13px] text-[#666]">{hoje}, na página {paginaAtual} de {livro.paginas_totais} ({pct}%)</p>
        </header>

        {notas === null && <p className="text-center mt-10 text-[#888]">Carregando…</p>}
        {vazio && <p className="text-center mt-10 text-[#666]">Você ainda não tem anotações neste livro.</p>}

        {notas && SECOES.map((s) => {
          const lista = notas.filter((n) => n.tipo === s.tipo)
          if (!lista.length) return null
          return (
            <section key={s.tipo} className="mt-9 secao-caderno">
              <h2 className="text-[13px] tracking-[.2em] font-semibold text-[#1B2A4A] border-b border-[#B8912F] pb-1">{s.titulo.toUpperCase()}</h2>
              <p className="text-[12px] italic text-[#888] mt-1">{s.legenda}</p>
              <ul className="mt-3 space-y-3.5">
                {lista.map((n, i) => (
                  <li key={i} className="grid grid-cols-[52px_1fr] gap-2 item-caderno">
                    <span className="text-[12px] text-[#8A6D2B] pt-1 tabular">{n.pagina ? `p. ${n.pagina}` : ''}</span>
                    <div>
                      <p className={`whitespace-pre-line leading-relaxed ${s.tipo === 'trecho' ? 'italic text-[16px]' : 'text-[15px]'}`}>
                        {s.tipo === 'trecho' ? `“${n.texto}”` : n.texto}
                        {n.favorita && <span className="text-[#B8912F]" title="Favorita"> ◆</span>}
                      </p>
                      {n.referencia && <p className="text-[12px] text-[#1B2A4A] mt-0.5 font-sans font-semibold">{n.referencia}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {notas && !vazio && comLinhas && (
          <section className="mt-10 secao-caderno quebra-antes">
            <h2 className="text-[13px] tracking-[.2em] font-semibold text-[#1B2A4A] border-b border-[#B8912F] pb-1">NO ENCONTRO</h2>
            <p className="text-[12px] italic text-[#888] mt-1">O que ouvi, o que examinei e o que vou aplicar</p>
            <div className="mt-2" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => <div key={i} className="h-8 border-b border-[#ddd]" />)}
            </div>
          </section>
        )}

        <footer className="mt-12 text-center text-[12px] text-[#8A6D2B] tracking-[.15em]">
          LER. EXAMINAR. DIALOGAR. APLICAR.
        </footer>
      </article>
    </div>,
    document.body
  )
}
