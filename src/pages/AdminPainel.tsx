import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import Avatar from '../components/Avatar'
import CadastrarLivro from './CadastrarLivro'
import CriarAcesso from './CriarAcesso'
import { formatarData, tempoRelativo } from '../lib/estatisticas'
import type { LivroAtivo } from './Inicio'

interface Props {
  adminId: string
  livro: LivroAtivo | null
  onLivroMudou: () => void
  onVoltar?: () => void
}

type Aba = 'ciclo' | 'acesso' | 'membros'

export default function AdminPainel({ adminId, livro, onLivroMudou, onVoltar }: Props) {
  const [aba, setAba] = useState<Aba>('ciclo')

  return (
    <div className="min-h-screen pt-6 pb-28">
      <div className="max-w-md mx-auto px-5">
        {onVoltar && (
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1">
            <Icone nome="seta-esquerda" className="w-4 h-4" /> Perfil
          </button>
        )}
        <h1 className="font-serif text-[30px] text-marinho dark:text-bege mt-3">Painel do admin</h1>

        <div className="grid grid-cols-3 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mt-4" role="tablist">
          {([['ciclo', 'Livro do ciclo'], ['acesso', 'Criar acesso'], ['membros', 'Membros']] as [Aba, string][]).map(([a, rotulo]) => (
            <button
              key={a}
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                aba === a ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {aba === 'ciclo' && (livro ? <CicloAtual livro={livro} onMudou={onLivroMudou} /> : <CadastrarLivro adminId={adminId} onCriado={onLivroMudou} />)}
      {aba === 'acesso' && <CriarAcesso />}
      {aba === 'membros' && <Membros livroId={livro?.id ?? null} />}
    </div>
  )
}

function CicloAtual({ livro, onMudou }: { livro: LivroAtivo; onMudou: () => void }) {
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [encontro, setEncontro] = useState(paraCampoLocal(livro.encontro_em ?? null))
  const [local, setLocal] = useState(livro.encontro_local ?? '')
  const avisar = useAviso()

  async function salvarEncontro(limpar = false) {
    const dados = limpar
      ? { encontro_em: null, encontro_local: null }
      : { encontro_em: encontro ? new Date(encontro).toISOString() : null, encontro_local: local.trim() || null }
    const { error } = await supabase.from('livros').update(dados).eq('id', livro.id)
    if (error) return avisar('Não foi possível salvar o encontro', 'erro')
    if (limpar) { setEncontro(''); setLocal('') }
    avisar(limpar ? 'Encontro removido do Início' : 'Encontro salvo: aparece no Início de todos')
    onMudou()
  }

  async function concluir() {
    const { error } = await supabase.from('livros').update({ status: 'concluido' }).eq('id', livro.id)
    if (error) return avisar('Não foi possível concluir o ciclo', 'erro')
    avisar('Ciclo concluído')
    onMudou()
  }

  return (
    <div className="max-w-md mx-auto px-5 mt-6 space-y-4">
      {editando ? (
        <EditarLivro livro={livro} onCancelar={() => setEditando(false)} onSalvo={() => { setEditando(false); onMudou() }} />
      ) : (
        <div className="cartao p-5">
          <div className="flex gap-4">
            {livro.capa_url
              ? <img src={livro.capa_url} alt="" className="w-16 h-24 object-cover rounded shadow" />
              : <div className="w-16 h-24 rounded border border-dourado/30 flex items-center justify-center"><Icone nome="livro" className="text-dourado" /></div>}
            <div className="min-w-0 flex-1">
              <p className="font-serif text-xl text-marinho dark:text-bege leading-snug">{livro.titulo}</p>
              {livro.autor && <p className="legenda">{livro.autor}</p>}
              <p className="text-xs text-texto/50 dark:text-bege/50 mt-1">
                {livro.paginas_totais} páginas
                {livro.ciclo_inicio || livro.ciclo_fim ? `, ciclo ${livro.ciclo_inicio ? `de ${formatarData(livro.ciclo_inicio)} ` : ''}${livro.ciclo_fim ? `até ${formatarData(livro.ciclo_fim)}` : ''}` : ', sem datas do ciclo'}
              </p>
            </div>
          </div>
          <button onClick={() => setEditando(true)} className="botao-secundario mt-4 flex items-center justify-center gap-2">
            <Icone nome="pena" className="w-4 h-4" /> Editar livro e capa
          </button>
        </div>
      )}

      <div className="cartao p-5">
        <h2 className="titulo-secao">Próximo encontro</h2>
        <p className="legenda mt-1 mb-3">Aparece no Início de todos, com contagem regressiva.</p>
        <label className="rotulo" htmlFor="encontro-em">Data e hora</label>
        <input id="encontro-em" type="datetime-local" value={encontro} onChange={(e) => setEncontro(e.target.value)} className="campo" />
        <label className="rotulo mt-3" htmlFor="encontro-local">Local</label>
        <input id="encontro-local" value={local} maxLength={120} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Igreja, Sala dos Jovens" className="campo" />
        <div className="flex gap-2 mt-4">
          <button onClick={() => salvarEncontro()} disabled={!encontro} className="botao-primario">Salvar encontro</button>
          {livro.encontro_em && <button onClick={() => salvarEncontro(true)} className="botao-secundario">Remover</button>}
        </div>
      </div>

      <div className="cartao p-5">
        <h2 className="titulo-secao">Encerrar este livro</h2>
        <p className="legenda mt-1">
          Marca o livro como concluído e libera o cadastro do próximo. Nada é apagado: registros, anotações, mural e conquistas ficam na Estante do clube, no Perfil de cada um.
        </p>
        {confirmando ? (
          <div className="flex gap-2 mt-4">
            <button onClick={concluir} className="w-full rounded-xl bg-red-800 text-white py-3 font-semibold">Sim, concluir ciclo</button>
            <button onClick={() => setConfirmando(false)} className="botao-secundario">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setConfirmando(true)} className="botao-secundario mt-4">Concluir ciclo</button>
        )}
      </div>
    </div>
  )
}

function EditarLivro({ livro, onCancelar, onSalvo }: { livro: LivroAtivo; onCancelar: () => void; onSalvo: () => void }) {
  const [titulo, setTitulo] = useState(livro.titulo)
  const [autor, setAutor] = useState(livro.autor ?? '')
  const [paginas, setPaginas] = useState(String(livro.paginas_totais))
  const [inicio, setInicio] = useState(livro.ciclo_inicio ?? '')
  const [fim, setFim] = useState(livro.ciclo_fim ?? '')
  const [capaUrl, setCapaUrl] = useState(livro.capa_url ?? '')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(livro.capa_url)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const avisar = useAviso()

  function escolherArquivo(f: File | null) {
    setArquivo(f)
    if (f) setPrevia(URL.createObjectURL(f))
  }

  async function salvar() {
    setErro(null)
    const n = parseInt(paginas, 10)
    if (!titulo.trim()) return setErro('O título não pode ficar vazio.')
    if (!n || n <= 0) return setErro('Informe o número de páginas.')
    if (inicio && fim && fim < inicio) return setErro('O fim do ciclo está antes do início.')
    setSalvando(true)
    try {
      let urlFinal: string | null = capaUrl.trim() || null
      let fonte: 'manual' | 'api' | undefined
      if (arquivo) {
        const { data: { user } } = await supabase.auth.getUser()
        const caminho = `${user?.id ?? 'admin'}/${crypto.randomUUID()}-${arquivo.name.replace(/[^\w.-]/g, '_')}`
        const { error: e1 } = await supabase.storage.from('capas-livros').upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })
        if (e1) throw new Error('Não foi possível enviar a imagem: ' + e1.message)
        urlFinal = supabase.storage.from('capas-livros').getPublicUrl(caminho).data.publicUrl
        fonte = 'manual'
      }
      const { error } = await supabase.from('livros').update({
        titulo: titulo.trim(),
        autor: autor.trim() || null,
        paginas_totais: n,
        ciclo_inicio: inicio || null,
        ciclo_fim: fim || null,
        capa_url: urlFinal,
        ...(fonte ? { fonte_capa: fonte } : {})
      }).eq('id', livro.id)
      if (error) throw new Error(error.message)
      avisar('Livro atualizado para todos')
      onSalvo()
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const mudouPaginas = parseInt(paginas, 10) !== livro.paginas_totais

  return (
    <div className="cartao p-5 space-y-4 animate-subir-suave">
      <div className="flex items-center justify-between">
        <h2 className="titulo-secao">Editar livro</h2>
        <button onClick={onCancelar} aria-label="Fechar" className="p-1 text-texto/50 dark:text-bege/50"><Icone nome="x" /></button>
      </div>

      {/* capa */}
      <div className="flex gap-4 items-start">
        {previa
          ? <img src={previa} alt="Capa" className="w-20 h-[120px] object-cover rounded shadow" onError={() => setPrevia(null)} />
          : <div className="w-20 h-[120px] rounded border border-dashed border-dourado/50 flex items-center justify-center text-center text-xs text-texto/45 dark:text-bege/45 p-2">sem capa</div>}
        <div className="flex-1 space-y-2">
          <label className="botao-secundario flex items-center justify-center gap-2 cursor-pointer py-2.5">
            <Icone nome="imagem" className="w-4 h-4" /> {previa ? 'Trocar imagem' : 'Enviar imagem'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)} />
          </label>
          {previa && (
            <button onClick={() => { setArquivo(null); setCapaUrl(''); setPrevia(null) }} className="w-full text-sm text-red-700 dark:text-red-400 py-1">
              Remover capa
            </button>
          )}
          <p className="text-xs text-texto/45 dark:text-bege/45">Foto da capa da edição que o grupo está lendo. Proporção de livro (em pé) fica melhor.</p>
        </div>
      </div>
      {!arquivo && (
        <div>
          <label className="rotulo" htmlFor="ed-capa">Ou link da imagem</label>
          <input id="ed-capa" value={capaUrl} onChange={(e) => { setCapaUrl(e.target.value); setPrevia(e.target.value || null) }} placeholder="https://…" className="campo" />
        </div>
      )}

      <div>
        <label className="rotulo" htmlFor="ed-titulo">Título</label>
        <input id="ed-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="ed-autor">Autor</label>
        <input id="ed-autor" value={autor} onChange={(e) => setAutor(e.target.value)} className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="ed-pag">Total de páginas</label>
        <input id="ed-pag" type="number" inputMode="numeric" min={1} value={paginas} onChange={(e) => setPaginas(e.target.value)} className="campo" />
        {mudouPaginas && (
          <p className="text-xs text-dourado-escuro dark:text-dourado mt-1.5">
            Isso muda o percentual de todos do grupo. Use para corrigir a edição (ex.: 208 para 160 páginas).
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo" htmlFor="ed-ini">Início do ciclo</label>
          <input id="ed-ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="ed-fim">Fim do ciclo</label>
          <input id="ed-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="campo" />
        </div>
      </div>

      {erro && <p className="text-sm text-red-700 dark:text-red-400">{erro}</p>}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="botao-primario">{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
        <button onClick={onCancelar} className="botao-secundario">Cancelar</button>
      </div>
    </div>
  )
}

/** Converte ISO para o formato do campo datetime-local (hora local). */
function paraCampoLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

interface Membro { id: string; nome_exibicao: string; nome_completo: string; role: string; senha_temporaria: boolean }

function Membros({ livroId }: { livroId: string | null }) {
  const [membros, setMembros] = useState<Membro[] | null>(null)
  const [ultima, setUltima] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('perfis').select('id, nome_exibicao, nome_completo, role, senha_temporaria').order('nome_exibicao')
      setMembros((data ?? []) as Membro[])
      if (livroId) {
        const { data: regs } = await supabase.from('registros_leitura').select('membro_id, registrado_em').eq('livro_id', livroId)
        const m = new Map<string, string>()
        for (const r of regs ?? []) if (!m.has(r.membro_id) || r.registrado_em > m.get(r.membro_id)!) m.set(r.membro_id, r.registrado_em)
        setUltima(m)
      }
    })()
  }, [livroId])

  return (
    <div className="max-w-md mx-auto px-5 mt-6">
      {membros === null && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="esqueleto h-14" />)}</div>}
      <ul className="cartao divide-y divide-marinho/[0.07] dark:divide-bege/[0.07]">
        {membros?.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar nome={m.nome_exibicao} tamanho={34} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-marinho dark:text-bege truncate">
                {m.nome_exibicao}{m.role === 'admin' && <span className="text-xs text-dourado-escuro dark:text-dourado"> admin</span>}
              </p>
              <p className="text-xs text-texto/45 dark:text-bege/45 truncate">
                {m.senha_temporaria ? 'ainda não fez o primeiro acesso' : ultima.has(m.id) ? `leu ${tempoRelativo(ultima.get(m.id)!)}` : 'sem leitura neste livro'}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {membros && <p className="legenda text-center mt-3">{membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'} com acesso</p>}
    </div>
  )
}
