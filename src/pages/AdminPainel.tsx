import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import Avatar from '../components/Avatar'
import CadastrarLivro from './CadastrarLivro'
import CriarAcesso from './CriarAcesso'
import { chamarAdmin, mensagemAcesso } from '../lib/adminMembros'
import { buscarPadraoClube } from '../lib/preferencias'
import { baixarCsv } from '../lib/exportar'
import { ROTEIRO_PADRAO } from '../lib/roteiro'
import { formatarData, paginasEquivalentes, tempoRelativo } from '../lib/estatisticas'
import { buscarConclusoes, marcarLeitura } from '../lib/pendentes'
import type { LivroAtivo } from './Inicio'

interface Props {
  adminId: string
  livro: LivroAtivo | null
  onLivroMudou: () => void
  onVoltar?: () => void
  onAbrirEncontro?: () => void
  onAbrirIndicacoes?: () => void
}

type Aba = 'ciclo' | 'membros' | 'clube'

export default function AdminPainel({ adminId, livro, onLivroMudou, onVoltar, onAbrirEncontro, onAbrirIndicacoes }: Props) {
  const [aba, setAba] = useState<Aba>('ciclo')

  return (
    <div className="min-h-screen pt-6 pb-28">
      <div className="max-w-md mx-auto px-5">
        {onVoltar && (
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/70 dark:text-bege/60 -ml-1 p-1">
            <Icone nome="seta-esquerda" className="w-4 h-4" /> Perfil
          </button>
        )}
        <h1 className="font-serif text-[30px] text-marinho dark:text-bege mt-3">Painel do admin</h1>

        <div className="grid grid-cols-3 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mt-4" role="tablist">
          {([['ciclo', 'Livro do ciclo'], ['membros', 'Membros'], ['clube', 'Clube']] as [Aba, string][]).map(([a, rotulo]) => (
            <button
              key={a}
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                aba === a ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/65 dark:text-bege/55'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {aba === 'ciclo' && (
        <>
          {livro ? <CicloAtual livro={livro} adminId={adminId} onMudou={onLivroMudou} onAbrirEncontro={onAbrirEncontro} /> : <CadastrarLivro adminId={adminId} onCriado={onLivroMudou} />}
          <GerenciarCiclos ativoId={livro?.id ?? null} onMudou={onLivroMudou} />
        </>
      )}
      {aba === 'membros' && <Membros livroId={livro?.id ?? null} adminId={adminId} />}
      {aba === 'clube' && <ConfigClube livro={livro} onAbrirIndicacoes={onAbrirIndicacoes} />}
    </div>
  )
}

function CicloAtual({ livro, adminId, onMudou, onAbrirEncontro }: { livro: LivroAtivo; adminId: string; onMudou: () => void; onAbrirEncontro?: () => void }) {
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
    if (!limpar && dados.encontro_em) {
      // mantém o Modo Encontro (roteiro e presença) com a mesma data e local
      const { data: atual } = await supabase.from('encontros').select('id').eq('livro_id', livro.id).order('data', { ascending: false }).limit(1).maybeSingle()
      if (atual) await supabase.from('encontros').update({ data: dados.encontro_em, local: dados.encontro_local, updated_at: new Date().toISOString() }).eq('id', atual.id)
      else await supabase.from('encontros').insert({ livro_id: livro.id, data: dados.encontro_em, local: dados.encontro_local, roteiro: ROTEIRO_PADRAO })
    }
    if (limpar) {
      // cancela o encontro marcado (o que já aconteceu fica no histórico)
      await supabase.from('encontros').delete().eq('livro_id', livro.id).gt('data', new Date().toISOString())
      setEncontro(''); setLocal('')
    }
    avisar(limpar ? 'Encontro removido do Início' : 'Encontro salvo: aparece no Início de todos')
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
              <p className="text-xs text-texto/65 dark:text-bege/55 mt-1">
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
        {onAbrirEncontro && (
          <button onClick={onAbrirEncontro} className="botao-texto mt-4 flex items-center gap-1.5">
            <Icone nome="calendario" className="w-4 h-4" /> Modo Encontro: mediação, roteiro e presença
          </button>
        )}
      </div>

      <div className="cartao p-5">
        <h2 className="titulo-secao">Encerrar este livro</h2>
        <p className="legenda mt-1">
          Você marca quem terminou e o livro vai para a Estante do clube. Quem ainda está lendo continua com ele como leitura pendente, no próprio ritmo. Nada é apagado.
        </p>
        <button onClick={() => setConfirmando(true)} className="botao-secundario mt-4">Concluir ciclo</button>
        {confirmando && (
          <EncerrarCiclo livro={livro} adminId={adminId} onFechar={() => setConfirmando(false)} onConcluido={() => { setConfirmando(false); onMudou() }} />
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
        <button onClick={onCancelar} aria-label="Fechar" className="p-1 text-texto/65 dark:text-bege/55"><Icone nome="x" /></button>
      </div>

      {/* capa */}
      <div className="flex gap-4 items-start">
        {previa
          ? <img src={previa} alt="Capa" className="w-20 h-[120px] object-cover rounded shadow" onError={() => setPrevia(null)} />
          : <div className="w-20 h-[120px] rounded border border-dashed border-dourado/50 flex items-center justify-center text-center text-xs text-texto/65 dark:text-bege/55 p-2">sem capa</div>}
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
          <p className="text-xs text-texto/65 dark:text-bege/55">Foto da capa da edição que o grupo está lendo. Proporção de livro (em pé) fica melhor.</p>
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

      {erro && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{erro}</p>}
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
interface StatusAuth { id: string; email: string; ultimo_acesso: string | null; suspenso: boolean }

function Membros({ livroId, adminId }: { livroId: string | null; adminId: string }) {
  const [membros, setMembros] = useState<Membro[] | null>(null)
  const [ultima, setUltima] = useState<Map<string, string>>(new Map())
  const [auth, setAuth] = useState<Map<string, StatusAuth>>(new Map())
  const [aberto, setAberto] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ id: string; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [criando, setCriando] = useState(false)
  const avisar = useAviso()

  async function carregar() {
    const { data } = await supabase.from('perfis').select('id, nome_exibicao, nome_completo, role, senha_temporaria').order('nome_exibicao')
    setMembros((data ?? []) as Membro[])
    if (livroId) {
      const { data: regs } = await supabase.from('registros_leitura').select('membro_id, registrado_em').eq('livro_id', livroId)
      const m = new Map<string, string>()
      for (const r of regs ?? []) if (!m.has(r.membro_id) || r.registrado_em > m.get(r.membro_id)!) m.set(r.membro_id, r.registrado_em)
      setUltima(m)
    }
    chamarAdmin<{ membros: StatusAuth[] }>('status')
      .then((r) => setAuth(new Map(r.membros.map((x) => [x.id, x]))))
      .catch(() => setAuth(new Map()))
  }
  useEffect(() => { carregar() }, [livroId])

  async function acao(m: Membro, tipo: 'nova_senha' | 'suspender' | 'reativar') {
    setOcupado(true)
    try {
      const r = await chamarAdmin<{ senha?: string }>(tipo, { membro_id: m.id })
      if (tipo === 'nova_senha' && r.senha) {
        setMensagem({ id: m.id, texto: mensagemAcesso(m.nome_exibicao, auth.get(m.id)?.email ?? '(e-mail)', r.senha, true) })
      } else {
        avisar(tipo === 'suspender' ? `Acesso de ${m.nome_exibicao} suspenso` : `Acesso de ${m.nome_exibicao} reativado`)
      }
      carregar()
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível concluir', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-6">
      <div className="px-5">
        <button onClick={() => setCriando((v) => !v)} className="botao-primario flex items-center justify-center gap-2">
          <Icone nome="mais" className="w-4 h-4" /> {criando ? 'Fechar' : 'Criar acesso para um membro'}
        </button>
      </div>
      {criando && <CriarAcesso onCriado={carregar} />}
      <div className="px-5 mt-4">
        {membros === null && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="esqueleto h-14" />)}</div>}
        <ul className="cartao divide-y divide-marinho/[0.07] dark:divide-bege/[0.07]">
          {membros?.map((m) => {
            const a = auth.get(m.id)
            return (
              <li key={m.id} className="px-4 py-3">
                <button onClick={() => { setAberto(aberto === m.id ? null : m.id); setMensagem(null) }} className="w-full flex items-center gap-3 text-left" aria-expanded={aberto === m.id}>
                  <Avatar nome={m.nome_exibicao} tamanho={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-marinho dark:text-bege truncate">
                      {m.nome_exibicao}{m.role === 'admin' && <span className="text-xs text-dourado-escuro dark:text-dourado"> admin</span>}
                      {a?.suspenso && <span className="text-xs text-red-700 dark:text-red-400"> suspenso</span>}
                    </p>
                    <p className="text-xs text-texto/65 dark:text-bege/55 truncate">
                      {m.senha_temporaria ? 'ainda não fez o primeiro acesso' : ultima.has(m.id) ? `leu ${tempoRelativo(ultima.get(m.id)!)}` : 'sem leitura neste livro'}
                    </p>
                  </div>
                  <Icone nome="seta-direita" className={`w-4 h-4 text-texto/30 dark:text-bege/30 transition-transform ${aberto === m.id ? 'rotate-90' : ''}`} />
                </button>
                {aberto === m.id && (
                  <div className="mt-3 pl-[46px] space-y-2">
                    {a?.email && <p className="text-xs text-texto/65 dark:text-bege/55 break-all">{a.email}{a.ultimo_acesso ? `, último login ${tempoRelativo(a.ultimo_acesso)}` : ''}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button disabled={ocupado} onClick={() => acao(m, 'nova_senha')} className="rounded-lg border border-marinho/15 dark:border-bege/15 px-3 py-1.5 text-sm font-semibold text-marinho dark:text-bege">Gerar nova senha</button>
                      {m.id !== adminId && (a?.suspenso
                        ? <button disabled={ocupado} onClick={() => acao(m, 'reativar')} className="rounded-lg border border-marinho/15 dark:border-bege/15 px-3 py-1.5 text-sm font-semibold text-marinho dark:text-bege">Reativar acesso</button>
                        : <button disabled={ocupado} onClick={() => acao(m, 'suspender')} className="rounded-lg border border-red-700/30 px-3 py-1.5 text-sm font-semibold text-red-700 dark:text-red-400">Suspender acesso</button>)}
                    </div>
                    {mensagem?.id === m.id && (
                      <div className="rounded-lg bg-marinho/[0.03] dark:bg-bege/[0.04] p-3 space-y-2">
                        <p className="text-sm whitespace-pre-wrap text-texto dark:text-bege select-all">{mensagem.texto}</p>
                        <a href={`https://wa.me/?text=${encodeURIComponent(mensagem.texto)}`} target="_blank" rel="noopener" className="botao-texto">Enviar pelo WhatsApp</a>
                      </div>
                    )}
                    <p className="text-[11px] text-texto/65 dark:text-bege/55">Suspender bloqueia o login sem apagar nada. Reavaliar a permanência de alguém é decisão do grupo (metade mais 1).</p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {membros && <p className="legenda text-center mt-3">{membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'} com acesso</p>}
      </div>
    </div>
  )
}

function ConfigClube({ livro, onAbrirIndicacoes }: { livro: LivroAtivo | null; onAbrirIndicacoes?: () => void }) {
  const [padrao, setPadrao] = useState<boolean | null>(null)
  const [baixando, setBaixando] = useState(false)
  const avisar = useAviso()

  useEffect(() => { buscarPadraoClube().then(setPadrao) }, [])

  async function salvarPadrao(v: boolean) {
    const { error } = await supabase.from('config_clube').update({ contagem_padrao: v, atualizado_em: new Date().toISOString() }).eq('id', 1)
    if (error) return avisar('Não foi possível salvar', 'erro')
    setPadrao(v)
    try { localStorage.setItem('bereanos-streak-contagem-padrao', v ? '1' : '0') } catch { /* ok */ }
    avisar(v ? 'Sequência e conquistas aparecem para quem segue o padrão' : 'Sequência e conquistas ficam escondidas para quem segue o padrão')
  }

  async function backup() {
    setBaixando(true)
    try {
      const [regs, notas, pres] = await Promise.all([
        supabase.from('registros_leitura').select('registrado_em, origem, paginas_lidas, minutos_lidos, perfis(nome_exibicao), livros(titulo)').order('registrado_em'),
        supabase.from('anotacoes').select('created_at, tipo, pagina, referencia, texto, compartilhada, perfis(nome_exibicao), livros(titulo)').eq('compartilhada', true).order('created_at'),
        supabase.from('presencas').select('perfis(nome_exibicao), encontros(data, livros(titulo))')
      ])
      const hoje = new Date().toISOString().slice(0, 10)
      baixarCsv(`bereanos-registros-${hoje}.csv`, ['data', 'membro', 'livro', 'origem', 'páginas', 'minutos'],
        ((regs.data ?? []) as any[]).map((r) => [r.registrado_em, r.perfis?.nome_exibicao, r.livros?.titulo, r.origem, r.paginas_lidas, r.minutos_lidos]))
      baixarCsv(`bereanos-mural-${hoje}.csv`, ['data', 'membro', 'livro', 'tipo', 'página', 'referência', 'texto'],
        ((notas.data ?? []) as any[]).map((n) => [n.created_at, n.perfis?.nome_exibicao, n.livros?.titulo, n.tipo, n.pagina, n.referencia, n.texto]))
      baixarCsv(`bereanos-presencas-${hoje}.csv`, ['encontro', 'livro', 'membro'],
        ((pres.data ?? []) as any[]).map((p) => [p.encontros?.data, p.encontros?.livros?.titulo, p.perfis?.nome_exibicao]))
      avisar('Três planilhas baixadas')
    } catch {
      avisar('Não foi possível gerar o backup', 'erro')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 mt-6 space-y-4">
      <div className="cartao p-5">
        <h2 className="titulo-secao">Sequência e conquistas</h2>
        <p className="legenda mt-1 mb-3">
          Padrão do clube para quem não escolheu no próprio Perfil. A gamificação foi desativada pelo grupo em setembro de 2026; mudar este padrão é decisão do grupo.
        </p>
        {padrao === null ? <div className="esqueleto h-11" /> : (
          <div className="grid grid-cols-2 gap-2">
            {([[false, 'Esconder'], [true, 'Mostrar']] as [boolean, string][]).map(([v, r]) => (
              <button key={r} onClick={() => salvarPadrao(v)} aria-pressed={padrao === v}
                className={`rounded-xl border py-2.5 text-sm font-medium ${padrao === v ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/70 dark:text-bege/60'}`}>
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="cartao p-5">
        <h2 className="titulo-secao">Backup</h2>
        <p className="legenda mt-1 mb-3">Baixa três planilhas (CSV, abre no Excel): registros de leitura, anotações do mural e presenças nos encontros. As anotações privadas de cada membro não entram.</p>
        <button onClick={backup} disabled={baixando} className="botao-secundario flex items-center justify-center gap-2">
          <Icone nome="baixar" className="w-4 h-4" /> {baixando ? 'Gerando…' : 'Baixar backup'}
        </button>
      </div>

      {onAbrirIndicacoes && (
        <div className="cartao p-5">
          <h2 className="titulo-secao">Próximas leituras</h2>
          <p className="legenda mt-1 mb-3">Indicações dos membros e o sorteio do próximo livro, registrado para todos verem.</p>
          <button onClick={onAbrirIndicacoes} className="botao-secundario">Abrir indicações e sorteio</button>
        </div>
      )}
      <p className="legenda text-center">{livro ? 'Destaques do clube: no mural, toque na estrela de uma anotação.' : ''}</p>
    </div>
  )
}

interface LivroCiclo { id: string; titulo: string; autor: string | null; capa_url: string | null; status: 'ativo' | 'concluido'; created_at: string }

/**
 * Todos os ciclos já cadastrados. Permite reabrir um ciclo concluído por engano
 * (quando não há livro ativo) e excluir de vez um ciclo lançado errado.
 */
function GerenciarCiclos({ ativoId, onMudou }: { ativoId: string | null; onMudou: () => void }) {
  const [livros, setLivros] = useState<LivroCiclo[] | null>(null)
  const [excluindo, setExcluindo] = useState<LivroCiclo | null>(null)
  const avisar = useAviso()

  async function carregar() {
    const { data } = await supabase.from('livros').select('id, titulo, autor, capa_url, status, created_at').order('created_at', { ascending: false })
    setLivros((data ?? []) as LivroCiclo[])
  }
  useEffect(() => { carregar() }, [ativoId])

  async function reabrir(l: LivroCiclo) {
    const { error } = await supabase.from('livros').update({ status: 'ativo' }).eq('id', l.id)
    if (error) return avisar('Não foi possível reabrir', 'erro')
    avisar(`${l.titulo} voltou a ser a leitura atual`)
    onMudou()
  }

  if (!livros || livros.length === 0) return null

  return (
    <div className="max-w-md mx-auto px-5 mt-4">
      <div className="cartao p-5">
        <h2 className="titulo-secao">Todos os ciclos</h2>
        <p className="legenda mt-1 mb-3">Reabra um ciclo concluído por engano ou exclua um livro cadastrado errado.</p>
        <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.08]">
          {livros.map((l) => (
            <li key={l.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-marinho dark:text-bege truncate">{l.titulo}</p>
                <p className="text-xs text-texto/65 dark:text-bege/55">{l.status === 'ativo' ? 'leitura atual' : 'concluído'}, cadastrado em {formatarData(l.created_at)}</p>
              </div>
              {l.status === 'concluido' && !ativoId && (
                <button onClick={() => reabrir(l)} className="text-xs font-semibold text-dourado-escuro dark:text-dourado px-2 py-1">Reabrir</button>
              )}
              <button onClick={() => setExcluindo(l)} aria-label={`Excluir ${l.titulo}`} className="p-2 text-texto/35 dark:text-bege/35 hover:text-red-700 dark:hover:text-red-400">
                <Icone nome="lixeira" className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {excluindo && <ExcluirCiclo livro={excluindo} onFechar={() => setExcluindo(null)} onExcluido={() => { setExcluindo(null); carregar(); onMudou() }} />}
    </div>
  )
}

interface MembroCiclo { id: string; nome: string; pct: number; marcado: boolean; noApp: boolean }

/** Encerrar o ciclo: o admin confirma quem terminou; quem não terminou fica com a leitura pendente. */
function EncerrarCiclo({ livro, adminId, onFechar, onConcluido }: { livro: LivroAtivo; adminId: string; onFechar: () => void; onConcluido: () => void }) {
  const [membros, setMembros] = useState<MembroCiclo[] | null>(null)
  const [salvando, setSalvando] = useState(false)
  const avisar = useAviso()

  useEffect(() => {
    ;(async () => {
      const [p, r, conclusoes] = await Promise.all([
        supabase.from('perfis').select('id, nome_exibicao, ritmo_leitura_min_por_pagina').order('nome_exibicao'),
        supabase.from('registros_leitura').select('membro_id, paginas_lidas, minutos_lidos, registrado_em').eq('livro_id', livro.id),
        buscarConclusoes({ livroId: livro.id })
      ])
      const perfis = (p.data ?? []) as { id: string; nome_exibicao: string; ritmo_leitura_min_por_pagina: number | null }[]
      const ritmo = new Map(perfis.map((x) => [x.id, x.ritmo_leitura_min_por_pagina || 2]))
      const soma = new Map<string, number>()
      for (const x of (r.data ?? []) as { membro_id: string; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string }[]) {
        soma.set(x.membro_id, (soma.get(x.membro_id) ?? 0) + paginasEquivalentes(x, ritmo.get(x.membro_id) ?? 2))
      }
      setMembros(perfis.map((m) => {
        const pct = Math.min(100, Math.round(((soma.get(m.id) ?? 0) / livro.paginas_totais) * 100))
        return { id: m.id, nome: m.nome_exibicao, pct, noApp: pct >= 100, marcado: pct >= 100 || conclusoes.get(`${livro.id}:${m.id}`) === 'terminou' }
      }).sort((a, b) => Number(b.marcado) - Number(a.marcado) || b.pct - a.pct))
    })()
  }, [livro.id])

  const terminaram = membros?.filter((m) => m.marcado).length ?? 0
  const continuam = membros?.filter((m) => !m.marcado && m.pct > 0).length ?? 0
  const naoComecaram = membros?.filter((m) => !m.marcado && m.pct === 0).length ?? 0

  async function concluir() {
    if (!membros) return
    setSalvando(true)
    // quem foi marcado à mão (terminou fora do app) fica registrado; desmarcados perdem a marca
    for (const m of membros) {
      if (m.noApp) continue
      const { error } = await marcarLeitura(livro.id, m.id, m.marcado ? 'terminou' : null, adminId)
      if (error && m.marcado) {
        setSalvando(false)
        return avisar('Não foi possível marcar quem terminou. Rode a atualização 0015 do banco e tente de novo.', 'erro')
      }
    }
    const { error } = await supabase.from('livros').update({ status: 'concluido' }).eq('id', livro.id)
    setSalvando(false)
    if (error) return avisar('Não foi possível concluir o ciclo', 'erro')
    avisar(continuam ? `Ciclo concluído. ${continuam} ${continuam === 1 ? 'pessoa continua' : 'pessoas continuam'} com a leitura pendente.` : 'Ciclo concluído')
    onConcluido()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onFechar}>
      <div className="cartao w-full max-w-md p-5 max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titulo-encerrar">
        <h2 id="titulo-encerrar" className="font-serif text-xl text-marinho dark:text-bege">Concluir {livro.titulo}</h2>
        <p className="text-sm text-texto/70 dark:text-bege/70 mt-1">
          Marque quem terminou o livro, inclusive quem leu fora do app. Quem chegou a 100% no app já vem marcado.
        </p>
        {!membros ? <div className="esqueleto h-40 mt-4" /> : (
          <ul className="mt-4 overflow-y-auto -mx-1 px-1 space-y-1.5">
            {membros.map((m) => (
              <li key={m.id}>
                <label className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${m.noApp ? '' : 'cursor-pointer'} ${m.marcado ? 'bg-dourado/10' : 'bg-marinho/[0.03] dark:bg-bege/[0.04]'}`}>
                  <input type="checkbox" checked={m.marcado} disabled={m.noApp}
                    onChange={() => setMembros((l) => l!.map((x) => (x.id === m.id ? { ...x, marcado: !x.marcado } : x)))}
                    className="w-5 h-5 accent-[#B8912F] shrink-0" />
                  <Avatar nome={m.nome} tamanho={30} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] text-marinho dark:text-bege truncate">{m.nome}</span>
                    <span className="block text-xs text-texto/65 dark:text-bege/55">
                      {m.noApp ? 'terminou no app' : m.marcado ? `terminou (marcado), ${m.pct}% no app` : m.pct > 0 ? `${m.pct}% no app: fica com a leitura pendente` : 'não registrou leitura deste livro'}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {membros && (
          <p className="text-sm text-marinho dark:text-bege mt-4">
            {terminaram} {terminaram === 1 ? 'terminou' : 'terminaram'}
            {continuam ? `, ${continuam} ${continuam === 1 ? 'continua' : 'continuam'} lendo` : ''}
            {naoComecaram ? `, ${naoComecaram} sem registro` : ''}.
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={concluir} disabled={!membros || salvando} className="botao-primario">{salvando ? 'Concluindo…' : 'Concluir ciclo'}</button>
          <button onClick={onFechar} className="botao-secundario">Cancelar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ExcluirCiclo({ livro, onFechar, onExcluido }: { livro: LivroCiclo; onFechar: () => void; onExcluido: () => void }) {
  const [contagem, setContagem] = useState<{ registros: number; leitores: number } | null>(null)
  const [texto, setTexto] = useState('')
  const [apagando, setApagando] = useState(false)
  const avisar = useAviso()

  useEffect(() => {
    ;(async () => {
      const r = await supabase.from('registros_leitura').select('membro_id').eq('livro_id', livro.id)
      setContagem({ registros: r.data?.length ?? 0, leitores: new Set((r.data ?? []).map((x) => x.membro_id)).size })
    })()
  }, [livro.id])

  async function excluir() {
    setApagando(true)
    const { error } = await supabase.from('livros').delete().eq('id', livro.id)
    if (error) {
      setApagando(false)
      return avisar('Não foi possível excluir o ciclo', 'erro')
    }
    // capa enviada pelo app: apaga o arquivo também
    const marca = '/capas-livros/'
    if (livro.capa_url?.includes(marca)) {
      const caminho = decodeURIComponent(livro.capa_url.split(marca)[1].split('?')[0])
      await supabase.storage.from('capas-livros').remove([caminho])
    }
    avisar('Ciclo excluído')
    onExcluido()
  }

  const confirmado = texto.trim().toUpperCase() === 'EXCLUIR'
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onFechar}>
      <div className="cartao w-full max-w-md p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titulo-excluir">
        <h2 id="titulo-excluir" className="font-serif text-xl text-marinho dark:text-bege">Excluir {livro.titulo}?</h2>
        <p className="text-[15px] text-texto/80 dark:text-bege/80 mt-2">
          Isso apaga o livro e tudo o que foi feito nele, para todos os membros, e não tem volta.
        </p>
        {contagem ? (
          <p className="text-sm text-red-800 dark:text-red-300 mt-3">
            Serão apagados {contagem.registros} {contagem.registros === 1 ? 'registro' : 'registros'} de leitura
            {contagem.leitores ? ` de ${contagem.leitores} ${contagem.leitores === 1 ? 'pessoa' : 'pessoas'}` : ''},
            {' '}todas as anotações (inclusive as privadas de cada membro), as sessões de foco, as metas e as conquistas deste livro.
          </p>
        ) : <div className="esqueleto h-10 mt-3" />}
        <p className="legenda mt-3">Se o livro só terminou, use “Concluir ciclo”: assim nada se perde e ele fica na Estante.</p>
        <label className="rotulo mt-4" htmlFor="confirmar-exclusao">Digite EXCLUIR para confirmar</label>
        <input id="confirmar-exclusao" value={texto} onChange={(e) => setTexto(e.target.value)} className="campo" autoComplete="off" autoCapitalize="characters" />
        <div className="flex gap-2 mt-4">
          <button onClick={excluir} disabled={!confirmado || apagando} className="w-full rounded-xl bg-red-800 text-white py-3 font-semibold disabled:opacity-40">
            {apagando ? 'Excluindo…' : 'Excluir de vez'}
          </button>
          <button onClick={onFechar} className="botao-secundario">Cancelar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
