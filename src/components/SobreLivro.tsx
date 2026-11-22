import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { formatarData } from '../lib/estatisticas'
import { useAviso } from './Toast'
import Icone from './Icone'
import Logo from './Logo'

// "Sobre o livro": sinopse, descrição e quem é o autor. O admin escreve ou
// busca no Google Books (sinopse) e na Wikipédia (autor), revisa e salva.
// O texto buscado leva a fonte, para ninguém tomar resumo de terceiro como
// texto do clube.

export interface LivroSobre {
  id: string
  titulo: string
  autor: string | null
  capa_url: string | null
  paginas_totais: number
  ciclo_inicio: string | null
  ciclo_fim: string | null
}

interface Info { sinopse: string | null; sobre_autor: string | null; fonte_info: string | null; link_livro: string | null }

function limparHtml(t: string) {
  const d = document.createElement('div')
  d.innerHTML = t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
  return (d.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

async function buscarSinopse(titulo: string, autor: string | null): Promise<{ texto: string; link: string; fonte: string } | null> {
  // 1) Google Books (tem limite diário compartilhado; quando estoura, segue para a Wikipédia)
  const consultas = [`intitle:${titulo}${autor ? `+inauthor:${autor}` : ''}`, `${titulo} ${autor ?? ''}`.trim()]
  for (const q of consultas) {
    for (const idioma of ['&langRestrict=pt', '']) {
      const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8${idioma}`).catch(() => null)
      if (!r || !r.ok) continue
      const j = await r.json()
      const item = (j.items ?? []).find((i: any) => (i.volumeInfo?.description ?? '').length > 120)
      if (item) return { texto: limparHtml(item.volumeInfo.description), link: item.volumeInfo.infoLink ?? 'https://books.google.com', fonte: 'Google Books' }
    }
  }
  // 2) Wikipédia: artigo do próprio livro (às vezes com o título original)
  const busca = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${titulo} livro`)}&srlimit=5&format=json&origin=*`).catch(() => null)
  if (!busca || !busca.ok) return null
  const titulos: string[] = ((await busca.json())?.query?.search ?? []).map((x: any) => x.title)
  for (const t of titulos) {
    if (autor && t.toLowerCase() === autor.toLowerCase()) continue
    const r = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`).catch(() => null)
    if (!r || !r.ok) continue
    const j = await r.json()
    if (j.type === 'disambiguation' || !j.extract) continue
    // só aceita se o artigo fala do autor (evita pegar outro livro com nome parecido)
    const sobrenome = (autor ?? '').split(/\s+/).pop()?.toLowerCase() ?? ''
    if (sobrenome && !(j.extract as string).toLowerCase().includes(sobrenome)) continue
    return { texto: j.extract, link: j.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(t)}`, fonte: 'Wikipédia' }
  }
  return null
}

async function buscarAutor(autor: string): Promise<{ texto: string; link: string } | null> {
  const resumo = async (titulo: string) => {
    const r = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, '_'))}`)
    if (!r.ok) return null
    const j = await r.json()
    if (j.type === 'disambiguation' || !j.extract) return null
    return { texto: j.extract as string, link: j.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo)}` }
  }
  const direto = await resumo(autor)
  if (direto) return direto
  const busca = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(autor + ' escritor')}&srlimit=1&format=json&origin=*`)
  if (!busca.ok) return null
  const primeiro = (await busca.json())?.query?.search?.[0]?.title
  return primeiro ? resumo(primeiro) : null
}

export default function SobreLivro({ livro, admin, onFechar }: { livro: LivroSobre; admin: boolean; onFechar: () => void }) {
  const [info, setInfo] = useState<Info | null | 'sem-coluna'>(null)
  const [editando, setEditando] = useState(false)
  const [sinopse, setSinopse] = useState('')
  const [sobreAutor, setSobreAutor] = useState('')
  const [fonte, setFonte] = useState('')
  const [link, setLink] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const avisar = useAviso()

  useEffect(() => {
    supabase.from('livros').select('sinopse, sobre_autor, fonte_info, link_livro').eq('id', livro.id).single()
      .then(({ data, error }) => {
        if (error) { setInfo('sem-coluna'); return }
        const i = data as Info
        setInfo(i)
        setSinopse(i.sinopse ?? ''); setSobreAutor(i.sobre_autor ?? ''); setFonte(i.fonte_info ?? ''); setLink(i.link_livro ?? '')
      })
  }, [livro.id])

  // fecha com Esc e trava a rolagem do fundo
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', aoTeclar)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', aoTeclar); document.body.style.overflow = antes }
  }, [])

  async function preencher() {
    setBuscando(true)
    try {
      const [s, a] = await Promise.all([
        buscarSinopse(livro.titulo, livro.autor).catch(() => null),
        livro.autor ? buscarAutor(livro.autor).catch(() => null) : Promise.resolve(null)
      ])
      const fontes: string[] = []
      if (s) { setSinopse(s.texto); fontes.push(`Sinopse: ${s.fonte} (${s.link})`) }
      if (a) { setSobreAutor(a.texto); fontes.push(`Autor: Wikipédia (${a.link})`) }
      if (fontes.length) setFonte(fontes.join(' | '))
      avisar(s || a ? 'Textos encontrados. Revise antes de salvar.' : 'Não encontrei nada. Escreva à mão.', s || a ? 'ok' : 'erro')
    } finally {
      setBuscando(false)
    }
  }

  async function salvar() {
    const l = link.trim()
    if (l && !/^https:\/\/[^\s]+\.[^\s]+/i.test(l)) return avisar('O link precisa começar com https://', 'erro')
    setSalvando(true)
    const novo = { sinopse: sinopse.trim() || null, sobre_autor: sobreAutor.trim() || null, fonte_info: fonte.trim() || null, link_livro: l || null }
    const { error } = await supabase.from('livros').update(novo).eq('id', livro.id)
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar', 'erro')
    setInfo(novo)
    setEditando(false)
    avisar('Sobre o livro atualizado para todos')
  }

  const vazio = info && info !== 'sem-coluna' && !info.sinopse && !info.sobre_autor && !info.link_livro
  const lojaDoLink = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return 'site' } }
  const fontes = (info && info !== 'sem-coluna' ? info.fonte_info ?? '' : '').split(' | ').filter(Boolean)
    .map((f) => { const m = f.match(/^(.*?)\s*\((https?:\/\/[^)]+)\)$/); return m ? { rotulo: m[1], link: m[2] } : { rotulo: f, link: null } })

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center" onClick={onFechar}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-sobre" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-folha dark:bg-noite-cartao shadow-2xl animate-subir-suave">
        {/* topo com a capa */}
        <div className="relative bg-marinho text-bege px-5 pt-5 pb-6 rounded-t-3xl">
          <button onClick={onFechar} aria-label="Fechar" className="absolute top-3 right-3 p-2 rounded-full text-bege/80 hover:bg-bege/10"><Icone nome="x" /></button>
          <div className="flex gap-4 pr-8">
            {livro.capa_url
              ? <img src={livro.capa_url} alt="" className="w-[84px] h-[126px] object-cover rounded shadow-lg shadow-black/40 shrink-0" />
              : <div className="w-[84px] h-[126px] rounded border border-dourado/40 flex items-center justify-center shrink-0"><Logo versao="simbolo" sempre="branco" className="h-[80px]" /></div>}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[.18em] text-dourado">Sobre o livro</p>
              <h2 id="titulo-sobre" className="font-serif text-[23px] leading-snug mt-1">{livro.titulo}</h2>
              {livro.autor && <p className="text-sm text-bege/70 mt-0.5">{livro.autor}</p>}
              <p className="text-xs text-bege/55 mt-2">
                {livro.paginas_totais} páginas
                {livro.ciclo_inicio && livro.ciclo_fim ? ` · ciclo de ${formatarData(livro.ciclo_inicio)} a ${formatarData(livro.ciclo_fim)}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {info === null && <div className="space-y-3"><div className="esqueleto h-5 w-32" /><div className="esqueleto h-24" /></div>}

          {info === 'sem-coluna' && (
            <p className="legenda">{admin ? 'Falta rodar a atualização 0021 no Supabase para guardar a sinopse e o autor.' : 'As informações deste livro ainda não foram preenchidas.'}</p>
          )}

          {info && info !== 'sem-coluna' && !editando && (
            <>
              {vazio && (
                <p className="legenda">{admin ? 'Ainda sem sinopse e sem texto sobre o autor. Toque em Editar para escrever ou buscar.' : 'O admin ainda não preencheu as informações deste livro.'}</p>
              )}
              {info.sinopse && (
                <section>
                  <h3 className="titulo-secao">Sinopse</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-texto/85 dark:text-bege/80 whitespace-pre-line">{info.sinopse}</p>
                </section>
              )}
              {info.sobre_autor && (
                <section>
                  <h3 className="titulo-secao">Sobre {livro.autor ?? 'o autor'}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-texto/85 dark:text-bege/80 whitespace-pre-line">{info.sobre_autor}</p>
                </section>
              )}
              {info.link_livro && (
                <a href={info.link_livro} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-dourado/50 bg-dourado/[0.07] px-4 py-3 text-sm font-semibold text-dourado-escuro dark:text-dourado hover:bg-dourado/[0.12] transition-colors">
                  <span className="flex items-center gap-2"><Icone nome="livro" className="w-4 h-4" /> Ver o livro</span>
                  <span className="text-xs font-normal text-texto/60 dark:text-bege/55">{lojaDoLink(info.link_livro)} ↗</span>
                </a>
              )}
              {fontes.length > 0 && (
                <p className="text-xs text-texto/60 dark:text-bege/50 border-t border-marinho/[0.07] dark:border-bege/[0.08] pt-3">
                  Fontes:{' '}
                  {fontes.map((f, i) => (
                    <span key={i}>{i > 0 && ' · '}{f.link ? <a href={f.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{f.rotulo}</a> : f.rotulo}</span>
                  ))}
                </p>
              )}
              {admin && <button onClick={() => setEditando(true)} className="botao-secundario">Editar</button>}
            </>
          )}

          {info && info !== 'sem-coluna' && editando && (
            <div className="space-y-4">
              <button onClick={preencher} disabled={buscando} className="w-full rounded-xl border border-dourado/60 bg-dourado/[0.08] py-2.5 text-sm font-semibold text-dourado-escuro dark:text-dourado flex items-center justify-center gap-2 disabled:opacity-60">
                <Icone nome="busca" className="w-4 h-4" /> {buscando ? 'Buscando…' : 'Buscar no Google Books e na Wikipédia'}
              </button>
              <label className="block">
                <span className="rotulo">Sinopse e descrição</span>
                <textarea value={sinopse} onChange={(e) => setSinopse(e.target.value)} rows={7} maxLength={6000} className="campo text-[15px]" placeholder="Do que trata o livro." />
              </label>
              <label className="block">
                <span className="rotulo">Sobre o autor</span>
                <textarea value={sobreAutor} onChange={(e) => setSobreAutor(e.target.value)} rows={5} maxLength={6000} className="campo text-[15px]" placeholder="Quem é, quando viveu, o que escreveu." />
              </label>
              <label className="block">
                <span className="rotulo">Link do livro <span className="font-normal text-texto/60 dark:text-bege/50">(opcional: Amazon, editora…)</span></span>
                <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} inputMode="url" placeholder="https://" className="campo text-sm" />
              </label>
              <label className="block">
                <span className="rotulo">Fontes <span className="font-normal text-texto/60 dark:text-bege/50">(preenchidas pela busca; apague se escrever do zero)</span></span>
                <input value={fonte} onChange={(e) => setFonte(e.target.value)} maxLength={500} className="campo text-sm" />
              </label>
              <div className="flex gap-2">
                <button onClick={salvar} disabled={salvando} className="botao-primario">{salvando ? 'Salvando…' : 'Salvar'}</button>
                <button onClick={() => { setEditando(false); setSinopse(info.sinopse ?? ''); setSobreAutor(info.sobre_autor ?? ''); setFonte(info.fonte_info ?? ''); setLink(info.link_livro ?? '') }} className="botao-secundario">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
