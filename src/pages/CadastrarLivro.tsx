import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface CandidatoGoogleBooks {
  titulo: string
  autor: string
  capaUrl: string | null
  paginas: number | null
}

interface Props {
  adminId: string
  onCriado: () => void
}

// Admin cadastra o livro do ciclo, com duas formas (seção 5 da especificação):
// busca na API pública do Google Books, ou preenchimento manual quando a
// edição específica não aparece certo na busca.

export default function CadastrarLivro({ adminId, onCriado }: Props) {
  const [modo, setModo] = useState<'busca' | 'manual'>('busca')
  const [termoBusca, setTermoBusca] = useState('')
  const [candidatos, setCandidatos] = useState<CandidatoGoogleBooks[]>([])
  const [buscando, setBuscando] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [capaUrl, setCapaUrl] = useState('')
  const [paginas, setPaginas] = useState('')
  const [fonteCapa, setFonteCapa] = useState<'manual' | 'api'>('manual')
  const [cicloInicio, setCicloInicio] = useState('')
  const [cicloFim, setCicloFim] = useState('')
  const [arquivoCapa, setArquivoCapa] = useState<File | null>(null)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function buscarGoogleBooks() {
    if (!termoBusca.trim()) return
    setBuscando(true)
    setErro(null)
    try {
      const resp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termoBusca)}&maxResults=5`
      )
      const json = await resp.json()
      const lista: CandidatoGoogleBooks[] = (json.items ?? []).map((item: any) => ({
        titulo: item.volumeInfo?.title ?? 'Sem título',
        autor: (item.volumeInfo?.authors ?? []).join(', '),
        capaUrl: item.volumeInfo?.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
        paginas: item.volumeInfo?.pageCount ?? null
      }))
      setCandidatos(lista)
      if (lista.length === 0) {
        setErro('Nenhum resultado. Tente outro termo ou use o cadastro manual.')
      }
    } catch {
      setErro('Não consegui buscar agora. Tente de novo ou use o cadastro manual.')
    } finally {
      setBuscando(false)
    }
  }

  function escolherCandidato(c: CandidatoGoogleBooks) {
    setTitulo(c.titulo)
    setAutor(c.autor)
    setCapaUrl(c.capaUrl ?? '')
    setPaginas(c.paginas ? String(c.paginas) : '')
    setFonteCapa('api')
    setModo('manual') // abre o formulário para revisar/confirmar antes de salvar
  }

  async function subirCapaSeHouver(): Promise<string | null> {
    if (!arquivoCapa) return capaUrl || null

    const caminho = `${adminId}/${crypto.randomUUID()}-${arquivoCapa.name}`
    const { error } = await supabase.storage.from('capas-livros').upload(caminho, arquivoCapa, {
      upsert: true
    })
    if (error) {
      throw new Error('Falha ao subir a capa: ' + error.message)
    }
    const { data } = supabase.storage.from('capas-livros').getPublicUrl(caminho)
    return data.publicUrl
  }

  async function salvar() {
    setErro(null)
    const paginasNum = parseInt(paginas, 10)
    if (!titulo.trim() || !paginasNum || paginasNum <= 0) {
      setErro('Preencha pelo menos o título e o número de páginas.')
      return
    }

    setSalvando(true)
    try {
      const urlFinal = await subirCapaSeHouver()

      const { error } = await supabase.from('livros').insert({
        titulo: titulo.trim(),
        autor: autor.trim() || null,
        capa_url: urlFinal,
        paginas_totais: paginasNum,
        fonte_capa: arquivoCapa ? 'manual' : fonteCapa,
        ciclo_inicio: cicloInicio || null,
        ciclo_fim: cicloFim || null,
        status: 'ativo',
        created_by: adminId
      })

      if (error) throw error

      onCriado()
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao salvar o livro.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="px-5 py-6">
      <div className="max-w-sm mx-auto">

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setModo('busca'); setErro(null) }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              modo === 'busca'
                ? 'bg-marinho text-bege dark:bg-dourado dark:text-noite'
                : 'border border-dourado/30 text-marinho dark:text-bege hover:bg-dourado/10'
            }`}
          >
            Buscar na internet
          </button>
          <button
            onClick={() => { setModo('manual'); setErro(null) }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              modo === 'manual'
                ? 'bg-marinho text-bege dark:bg-dourado dark:text-noite'
                : 'border border-dourado/30 text-marinho dark:text-bege hover:bg-dourado/10'
            }`}
          >
            Preencher manual
          </button>
        </div>

        {modo === 'busca' && (
          <div className="cartao p-5 space-y-3">
            <div className="flex gap-2">
              <input aria-label="Buscar livro por título ou autor"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarGoogleBooks()}
                placeholder="título do livro"
                className="campo"
              />
              <button
                onClick={buscarGoogleBooks}
                disabled={buscando}
                className="rounded-lg bg-marinho text-bege px-4 text-sm font-medium disabled:opacity-50 shrink-0"
              >
                {buscando ? '…' : 'Buscar'}
              </button>
            </div>

            {erro && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{erro}</p>}

            <ul className="space-y-2">
              {candidatos.map((c, i) => (
                <li key={i}>
                  <button
                    onClick={() => escolherCandidato(c)}
                    className="w-full flex gap-3 items-center text-left p-2.5 rounded-lg border border-dourado/15 hover:border-dourado/40 hover:bg-dourado/5 transition-colors"
                  >
                    {c.capaUrl ? (
                      <img src={c.capaUrl} alt="" className="w-10 h-14 object-cover rounded shadow-sm shrink-0" />
                    ) : (
                      <div className="w-10 h-14 rounded bg-marinho/5 dark:bg-bege/5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-marinho dark:text-bege truncate">{c.titulo}</p>
                      <p className="text-xs text-texto/65 dark:text-bege/55 truncate">
                        {c.autor}{c.paginas ? ` · ${c.paginas} pág.` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-texto/65 dark:text-bege/55 text-center pt-1">
              Não achou a edição certa? Use "Preencher manual".
            </p>
          </div>
        )}

        {modo === 'manual' && (
          <div className="cartao p-5 space-y-4">
            <div>
              <label className="rotulo">Título</label>
              <input aria-label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="campo" />
            </div>
            <div>
              <label className="rotulo">Autor</label>
              <input aria-label="Autor" value={autor} onChange={(e) => setAutor(e.target.value)} className="campo" />
            </div>
            <div>
              <label className="rotulo">Páginas totais</label>
              <input aria-label="Páginas totais"
                type="number"
                min={1}
                value={paginas}
                onChange={(e) => setPaginas(e.target.value)}
                className="campo"
              />
            </div>
            <div>
              <label className="rotulo">Capa (enviar um arquivo substitui a da busca)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArquivoCapa(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-texto/70 dark:text-bege/70 file:mr-3 file:rounded-lg file:border-0 file:bg-dourado/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-dourado-escuro dark:file:text-dourado"
              />
              {capaUrl && !arquivoCapa && (
                <img src={capaUrl} alt="capa" className="w-14 h-20 object-cover rounded mt-2 shadow-sm" />
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="rotulo">Início do ciclo</label>
                <input aria-label="Início do ciclo"
                  type="date"
                  value={cicloInicio}
                  onChange={(e) => setCicloInicio(e.target.value)}
                  className="campo"
                />
              </div>
              <div className="flex-1">
                <label className="rotulo">Fim do ciclo</label>
                <input aria-label="Fim do ciclo"
                  type="date"
                  value={cicloFim}
                  onChange={(e) => setCicloFim(e.target.value)}
                  className="campo"
                />
              </div>
            </div>

            {erro && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button onClick={salvar} disabled={salvando} className="botao-primario">
              {salvando ? 'Salvando…' : 'Salvar livro do ciclo'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
