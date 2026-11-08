import { useEffect, useMemo, useState } from 'react'
import { tempoManual } from '../lib/tempo'
import { supabase, type Perfil as TPerfil } from '../lib/supabase'
import { useAviso } from '../components/Toast'
import Avatar from '../components/Avatar'
import { BarraBrilho } from '../components/BarraBrilho'
import InstalarApp from '../components/InstalarApp'
import { GRUPOS_CONQUISTA, ICONE_CONQUISTA } from '../lib/conquistas'
import Icone, { type NomeIcone } from '../components/Icone'
import type { TemaPreferido } from '../lib/tema'
import { useContagem, aplicarTamanhoLetra, tamanhoLetraSalvo, aplicarFonteNotas, fonteNotasSalva, FONTES_NOTAS, corDaCapaAtiva, definirCorDaCapa, efeitosAtivos, aplicarEfeitos, type FonteNotas, type TamanhoLetra } from '../lib/preferencias'
import { baixarIcs, linkGoogleAgenda, proximoHorario } from '../lib/agenda'
import { formatarData, maiorSequencia, paginasEquivalentes, paginasPorDia, sequenciaAtual } from '../lib/estatisticas'
import type { LivroAtivo } from './Inicio'
import { MapaDeHorarios } from '../components/Graficos'
import { BLOCOS, DIAS_SEMANA, mapaHorarios } from '../lib/infograficos'

interface Props {
  perfil: TPerfil
  livro: LivroAtivo
  tema: TemaPreferido
  onMudarTema: (t: TemaPreferido) => void
  onPerfilAtualizado: (p: TPerfil) => void
  onVoltar: () => void
  onAbrirAdmin: () => void
  onAbrirMetas: () => void
  onAbrirLivro: (id: string) => void
  onAbrirGuia: () => void
  onAbrirIndicacoes: () => void
  onAbrirAno: () => void
  onAbrirMetricas: () => void
}

interface Conquista { id: string; chave: string; nome: string; descricao: string | null; icone: string | null }
interface Registro { id: string; livro_id: string; origem: 'manual' | 'pomodoro'; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string }

export default function Perfil({ perfil, tema, onMudarTema, onPerfilAtualizado, onVoltar, onAbrirAdmin, onAbrirMetas, onAbrirLivro, onAbrirGuia, onAbrirIndicacoes, onAbrirAno, onAbrirMetricas }: Props) {
  const [registros, setRegistros] = useState<Registro[] | null>(null)
  const [sessoes, setSessoes] = useState(0)
  const [minutosFoco, setMinutosFoco] = useState(0)
  const [catalogo, setCatalogo] = useState<Conquista[]>([])
  const [minhas, setMinhas] = useState<Map<string, string>>(new Map())
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(perfil.nome_exibicao)
  const [nascimento, setNascimento] = useState(perfil.data_nascimento ?? '')
  const [ritmo, setRitmo] = useState(String(perfil.ritmo_leitura_min_por_pagina))
  const [livros, setLivros] = useState<{ id: string; titulo: string; autor: string | null; capa_url: string | null; paginas_totais: number; status: string }[]>([])
  const avisar = useAviso()
  const contagem = useContagem()
  const [letra, setLetra] = useState<TamanhoLetra>(() => tamanhoLetraSalvo())
  const [fonteNotas, setFonteNotas] = useState<FonteNotas>(() => fonteNotasSalva())
  const [corCapa, setCorCapa] = useState(() => corDaCapaAtiva())
  const [efeitos, setEfeitos] = useState(() => efeitosAtivos())
  const [horaLembrete, setHoraLembrete] = useState('21:00')
  const [abertas, setAbertas] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('bereanos-streak-perfil-secoes') ?? '{}') } catch { return {} }
  })
  function alternar(secao: string) {
    setAbertas((a) => {
      const novo = { ...a, [secao]: !a[secao] }
      try { localStorage.setItem('bereanos-streak-perfil-secoes', JSON.stringify(novo)) } catch { /* ok */ }
      return novo
    })
  }

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    supabase.from('livros').select('id, titulo, autor, capa_url, paginas_totais, status').order('created_at', { ascending: false })
      .then(({ data }) => setLivros(data ?? []))
    const [regs, sess, cat, mc] = await Promise.all([
      supabase
        .from('registros_leitura')
        .select('id, livro_id, origem, paginas_lidas, minutos_lidos, registrado_em')
        .eq('membro_id', perfil.id)
        .order('registrado_em', { ascending: false }),
      supabase
        .from('sessoes_pomodoro')
        .select('duracao_minutos')
        .eq('membro_id', perfil.id)
        .eq('status', 'concluida'),
      supabase.from('conquistas').select('id, chave, nome, descricao, icone'),
      supabase.from('membro_conquistas').select('conquista_id, conquistado_em').eq('membro_id', perfil.id)
    ])
    const manual = await tempoManual(perfil.id)
    setRegistros((regs.data ?? []) as Registro[])
    setSessoes(sess.data?.length ?? 0)
    setMinutosFoco((sess.data ?? []).reduce((a, x) => a + (x.duracao_minutos ?? 0), 0) + manual)
    setCatalogo((cat.data ?? []) as Conquista[])
    const m = new Map<string, string>()
    for (const r of mc.data ?? []) if (!m.has(r.conquista_id)) m.set(r.conquista_id, r.conquistado_em)
    setMinhas(m)
  }

  const ritmoNum = perfil.ritmo_leitura_min_por_pagina || 2
  const estat = useMemo(() => {
    const lista = registros ?? []
    const paginas = Math.round(lista.reduce((s, r) => s + paginasEquivalentes(r, ritmoNum), 0))
    const dias = new Set(paginasPorDia(lista, ritmoNum).keys())
    return { paginas, diasLidos: dias.size, atual: sequenciaAtual(dias).dias, maior: maiorSequencia(dias) }
  }, [registros, ritmoNum])

  async function salvarPerfil() {
    const r = parseFloat(ritmo.replace(',', '.'))
    if (!nome.trim()) return avisar('Informe um nome', 'erro')
    if (!r || r <= 0 || r > 30) return avisar('Ritmo entre 0,5 e 30 minutos por página', 'erro')
    const novo = { nome_exibicao: nome.trim(), data_nascimento: nascimento || null, ritmo_leitura_min_por_pagina: r }
    const { error } = await supabase.from('perfis').update(novo).eq('id', perfil.id)
    if (error) return avisar('Não foi possível salvar', 'erro')
    onPerfilAtualizado({ ...perfil, ...novo })
    setEditando(false)
    avisar('Perfil atualizado')
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  const horarios = useMemo(() => mapaHorarios(registros ?? [], ritmoNum), [registros, ritmoNum])
  const livrosTerminados = livros.filter((l) => (registros ?? []).filter((r) => r.livro_id === l.id)
    .reduce((a, r) => a + paginasEquivalentes(r, ritmoNum), 0) >= l.paginas_totais).length

  async function mudarContagem(v: boolean | null) {
    const { error } = await supabase.from('perfis').update({ mostrar_contagem: v }).eq('id', perfil.id)
    if (error) return avisar('Não foi possível salvar', 'erro')
    onPerfilAtualizado({ ...perfil, mostrar_contagem: v })
  }

  const conquistadas = catalogo.filter((c) => minhas.has(c.id)).length
  const recentes = catalogo.filter((c) => minhas.has(c.id))
    .sort((a, b) => minhas.get(b.id)!.localeCompare(minhas.get(a.id)!)).slice(0, 3)
  const proxima = catalogo.find((c) => !minhas.has(c.id) && GRUPOS_CONQUISTA.some((g) => g.chaves.includes(c.chave)))

  return (
    <div className="min-h-screen px-5 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 hover:text-marinho dark:hover:text-bege -ml-1 p-1">
          <Icone nome="seta-esquerda" className="w-4 h-4" /> Início
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mt-4">
          <Avatar nome={perfil.nome_exibicao} tamanho={64} />
          <div className="min-w-0">
            <h1 className="font-serif text-[28px] leading-tight text-marinho dark:text-bege truncate">{perfil.nome_exibicao}</h1>
            <p className="legenda truncate">{perfil.nome_completo}{perfil.role === 'admin' ? ', admin' : ''}</p>
          </div>
        </div>

        {/* Números */}
        <section className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden bg-dourado/15 mt-6 border border-dourado/15">
          {[
            [estat.paginas, 'páginas lidas'],
            [minutosFoco >= 60 ? Math.round(minutosFoco / 6) / 10 : minutosFoco, minutosFoco >= 60 ? 'horas de leitura' : 'min de leitura'],
            [sessoes, 'sessões'],
            [estat.diasLidos, 'dias com leitura'],
            ...(contagem
              ? [[estat.atual, 'sequência atual'], [estat.maior, 'maior sequência']]
              : [[livrosTerminados, livrosTerminados === 1 ? 'livro terminado' : 'livros terminados'], [livros.length, livros.length === 1 ? 'livro no clube' : 'livros no clube']])
          ].map(([v, rotulo]) => (
            <div key={rotulo as string} className="bg-folha dark:bg-noite-cartao py-4 text-center">
              {registros === null
                ? <div className="esqueleto h-7 w-10 mx-auto" />
                : <p className="font-serif tabular text-[26px] leading-none text-marinho dark:text-bege">{String(v).replace('.', ',')}</p>}
              <p className="text-xs text-texto/50 dark:text-bege/50 mt-1.5">{rotulo}</p>
            </div>
          ))}
        </section>

        {/* Atalhos: o que mais se usa fica no topo */}
        <nav className="cartao mt-4 divide-y divide-marinho/[0.07] dark:divide-bege/[0.08]" aria-label="Mais opções">
          <ItemMenu icone="calendario" rotulo={`Seu ano de leitura, ${new Date().getFullYear()}`} detalhe="retrospectiva com imagem para compartilhar" onClick={onAbrirAno} />
          <ItemMenu icone="grafico" rotulo="Métricas" detalhe="seus números e os do grupo" onClick={onAbrirMetricas} />
          <ItemMenu icone="alvo" rotulo="Minhas metas" onClick={onAbrirMetas} />
          <ItemMenu icone="estante" rotulo="Próximas leituras" detalhe="indicar livros e ver o sorteio" onClick={onAbrirIndicacoes} />
          <ItemMenu icone="lampada" rotulo="Como usar o app" onClick={onAbrirGuia} />
          {perfil.role === 'admin' && <ItemMenu icone="engrenagem" rotulo="Painel do admin" detalhe="ciclo, membros e clube" onClick={onAbrirAdmin} />}
        </nav>

        {/* Horários */}
        {registros !== null && (
          <section className="cartao p-5 mt-6">
            <CabecalhoRecolhivel titulo="Seus horários de leitura" aberto={!abertas.horariosFechado} onAlternar={() => alternar('horariosFechado')} semMargem />
            {abertas.horariosFechado ? null : horarios.total < 5 ? (
              <p className="legenda mt-2">Registre leituras em dias e horários diferentes e o mapa mostra quando você costuma ler.</p>
            ) : (
              <>
                <p className="text-[15px] text-texto/80 dark:text-bege/80 mt-3 mb-4">
                  Você lê mais {horarios.melhorBloco !== null && <strong className="text-marinho dark:text-bege">{BLOCOS[horarios.melhorBloco].frase}</strong>}
                  {horarios.melhorDia !== null && <>, e {horarios.melhorDia === 0 || horarios.melhorDia === 6 ? 'o' : 'a'} <strong className="text-marinho dark:text-bege">{DIAS_SEMANA[horarios.melhorDia]}</strong> é seu dia mais forte</>}.
                </p>
                <MapaDeHorarios mapa={horarios} />
                <p className="text-xs text-texto/45 dark:text-bege/45 mt-3">Cor mais forte, mais páginas. Leituras lançadas para dias anteriores ficam de fora, porque não dizem a hora.</p>
              </>
            )}
          </section>
        )}

        {/* Conquistas */}
        {contagem && <section className="mt-8">
          <CabecalhoRecolhivel titulo="Conquistas" detalhe={`${conquistadas} de ${catalogo.length}`} aberto={!!abertas.conquistas} onAlternar={() => alternar('conquistas')} />
          <div className="h-2 rounded-full bg-marinho/[0.07] dark:bg-bege/10 overflow-hidden mb-4">
            <div className="h-full barra-progresso rounded-full transition-all duration-700" style={{ width: `${catalogo.length ? (conquistadas / catalogo.length) * 100 : 0}%` }} />
          </div>
          {!abertas.conquistas && (
            <div className="cartao p-4">
              {recentes.length > 0 ? (
                <>
                  <p className="text-xs text-texto/50 dark:text-bege/50 mb-3">{recentes.length === 1 ? 'Sua conquista mais recente' : 'Suas conquistas mais recentes'}</p>
                  <ul className="space-y-2.5">
                    {recentes.map((c) => (
                      <li key={c.id} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-dourado text-marinho flex items-center justify-center shrink-0">
                          <Icone nome={ICONE_CONQUISTA[c.icone ?? ''] ?? 'check'} className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0 text-[15px] font-semibold text-marinho dark:text-bege truncate">{c.nome}</span>
                        <span className="text-xs text-dourado-escuro dark:text-dourado shrink-0">{formatarData(minhas.get(c.id)!)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="legenda">Nenhuma conquista ainda. Elas chegam com a leitura, sem pressa.</p>
              )}
              {proxima && (
                <p className="text-xs text-texto/55 dark:text-bege/55 mt-3 pt-3 border-t border-marinho/[0.07] dark:border-bege/[0.08]">
                  Próxima: <span className="font-semibold">{proxima.nome}</span>{proxima.descricao ? `, ${proxima.descricao.charAt(0).toLowerCase()}${proxima.descricao.slice(1)}` : ''}
                </p>
              )}
              <button onClick={() => alternar('conquistas')} className="botao-texto mt-3">Ver todas as {catalogo.length}</button>
            </div>
          )}
          {abertas.conquistas && GRUPOS_CONQUISTA.map((g) => {
            const itens = g.chaves.map((k) => catalogo.find((c) => c.chave === k)).filter(Boolean) as Conquista[]
            if (!itens.length) return null
            const feitas = itens.filter((c) => minhas.has(c.id)).length
            return (
              <div key={g.titulo} className="mb-5">
                <p className="text-sm font-semibold text-marinho/80 dark:text-bege/80 mb-2">
                  {g.titulo} <span className="font-normal text-texto/45 dark:text-bege/45">{feitas}/{itens.length}</span>
                </p>
                <ul className="grid grid-cols-3 gap-2.5">
                  {itens.map((c) => {
                    const quando = minhas.get(c.id)
                    return (
                      <li key={c.id} title={c.descricao ?? ''}
                        className={`rounded-2xl border p-3 text-center flex flex-col items-center ${quando ? 'border-dourado/50 bg-dourado/[0.08]' : 'border-marinho/10 dark:border-bege/10 opacity-55'}`}>
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center ${quando ? 'bg-dourado text-marinho' : 'bg-marinho/[0.06] dark:bg-bege/[0.08] text-texto/40 dark:text-bege/40'}`}>
                          <Icone nome={quando ? ICONE_CONQUISTA[c.icone ?? ''] ?? 'check' : 'cadeado'} className="w-5 h-5" />
                        </span>
                        <p className="text-[13px] font-semibold text-marinho dark:text-bege mt-2 leading-tight">{c.nome}</p>
                        <p className="text-[11px] text-texto/50 dark:text-bege/50 mt-1 leading-snug">{c.descricao}</p>
                        {quando && <p className="text-[11px] text-dourado-escuro dark:text-dourado mt-1">{formatarData(quando)}</p>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {abertas.conquistas && <button onClick={() => alternar('conquistas')} className="botao-texto">Recolher conquistas</button>}
        </section>}

        {/* Estante */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="titulo-secao">Estante do clube</h2>
            <span className="legenda">{livros.length} {livros.length === 1 ? 'livro' : 'livros'}</span>
          </div>
          <p className="legenda -mt-2 mb-3">Toque num livro para ver seu histórico, suas anotações e o mural daquele ciclo.</p>
          <ul className="space-y-2.5">
            {livros.map((l) => {
              const lidas = Math.min(l.paginas_totais, Math.round((registros ?? []).filter((r) => r.livro_id === l.id).reduce((s, r) => s + paginasEquivalentes(r, ritmoNum), 0)))
              const p = Math.round((lidas / l.paginas_totais) * 100)
              return (
                <li key={l.id}>
                  <button onClick={() => onAbrirLivro(l.id)} className="cartao w-full p-3 flex items-center gap-3 text-left hover:border-dourado/50 transition-colors">
                  {l.capa_url
                    ? <img src={l.capa_url} alt="" className="w-10 h-14 object-cover rounded shadow-sm" />
                    : <span className="w-10 h-14 rounded border border-dourado/30 flex items-center justify-center text-dourado"><Icone nome="livro" className="w-4 h-4" /></span>}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[17px] leading-snug text-marinho dark:text-bege truncate">{l.titulo}</p>
                    <p className="text-xs text-texto/50 dark:text-bege/50 truncate">
                      {l.autor ? `${l.autor}, ` : ''}{l.status === 'ativo' ? 'leitura atual' : 'ciclo concluído'}
                    </p>
                    <BarraBrilho pct={p} altura="h-1" className="mt-2" faiscas={false} />
                  </div>
                  <span className="text-sm tabular text-texto/60 dark:text-bege/60 w-11 text-right">{p >= 100 ? <Icone nome="check" className="w-5 h-5 inline text-dourado" /> : `${p}%`}</span>
                  <Icone nome="seta-direita" className="w-4 h-4 text-texto/30 dark:text-bege/30 shrink-0" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Dados */}
        <section className="cartao p-5 mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="titulo-secao">Seus dados</h2>
            {!editando && <button onClick={() => setEditando(true)} className="botao-texto">Editar</button>}
          </div>
          {!editando ? (
            <dl className="mt-3 space-y-2.5 text-[15px]">
              <Linha rotulo="Nome no grupo" valor={perfil.nome_exibicao} />
              <Linha rotulo="Aniversário" valor={perfil.data_nascimento ? formatarData(perfil.data_nascimento, { day: 'numeric', month: 'long' }) : 'não informado'} />
              <Linha rotulo="Ritmo de leitura" valor={`${String(perfil.ritmo_leitura_min_por_pagina).replace('.', ',')} min por página`} />
            </dl>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="rotulo" htmlFor="p-nome">Nome no grupo</label>
                <input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="p-nasc">Data de nascimento</label>
                <input id="p-nasc" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} className="campo" />
              </div>
              <div>
                <label className="rotulo" htmlFor="p-ritmo">Minutos por página</label>
                <input id="p-ritmo" inputMode="decimal" value={ritmo} onChange={(e) => setRitmo(e.target.value)} className="campo" />
                <p className="text-xs text-texto/50 dark:text-bege/50 mt-1.5">
                  Usado para converter sessões de foco sem páginas informadas em páginas.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={salvarPerfil} className="botao-primario">Salvar</button>
                <button onClick={() => setEditando(false)} className="botao-secundario">Cancelar</button>
              </div>
            </div>
          )}
        </section>

        {/* Ajustes do app */}
        <section className="cartao p-5 mt-4">
          <CabecalhoRecolhivel titulo="Ajustes do app" detalhe="tema, letra, fonte, lembrete" aberto={!!abertas.ajustes} onAlternar={() => alternar('ajustes')} semMargem />
          {abertas.ajustes && <div className="mt-5 animate-subir-suave">
          <h3 className="titulo-secao">Tema</h3>
          <p className="legenda mt-0.5 mb-3">Auto segue o claro ou escuro do seu celular.</p>
          <div className="grid grid-cols-4 gap-2">
            {([['claro', 'Claro', 'sol'], ['escuro', 'Escuro', 'lua'], ['azul', 'Azul', 'gota'], ['sistema', 'Auto', 'meia-lua']] as [TemaPreferido, string, NomeIcone][]).map(([t, rotulo, icone]) => (
              <button
                key={t}
                onClick={() => onMudarTema(t)}
                aria-pressed={tema === t}
                className={`rounded-xl border py-3 flex flex-col items-center gap-1.5 text-sm font-medium transition-colors ${
                  tema === t
                    ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado'
                    : 'border-marinho/15 dark:border-bege/15 text-texto/60 dark:text-bege/60'
                }`}
              >
                <Icone nome={icone} />
                {rotulo}
              </button>
            ))}
          </div>

          <h3 className="titulo-secao mt-6">Sequência e conquistas</h3>
          <p className="legenda mt-0.5 mb-3">
            Mostra ou esconde a contagem de dias seguidos e as conquistas. {perfil.mostrar_contagem == null ? `Hoje você segue o padrão do clube (${contagem ? 'mostrar' : 'esconder'}).` : ''}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([[null, 'Padrão do clube'], [true, 'Mostrar'], [false, 'Esconder']] as [boolean | null, string][]).map(([v, rotulo]) => (
              <button key={rotulo} onClick={() => mudarContagem(v)} aria-pressed={(perfil.mostrar_contagem ?? null) === v}
                className={`rounded-xl border py-2.5 text-sm font-medium ${(perfil.mostrar_contagem ?? null) === v ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/60 dark:text-bege/60'}`}>
                {rotulo}
              </button>
            ))}
          </div>

          <h3 className="titulo-secao mt-6">Tamanho da letra</h3>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {([['normal', 'Normal', 'text-sm'], ['grande', 'Grande', 'text-base'], ['maior', 'Maior', 'text-lg']] as [TamanhoLetra, string, string][]).map(([t, rotulo, cls]) => (
              <button key={t} onClick={() => { setLetra(t); aplicarTamanhoLetra(t) }} aria-pressed={letra === t}
                className={`rounded-xl border py-2.5 font-medium ${cls} ${letra === t ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/60 dark:text-bege/60'}`}>
                {rotulo}
              </button>
            ))}
          </div>

          <h3 className="titulo-secao mt-6">Fonte das anotações</h3>
          <p className="legenda mt-0.5 mb-3">Como suas anotações e o mural aparecem para você neste aparelho.</p>
          <div className="grid grid-cols-4 gap-2">
            {FONTES_NOTAS.map((f) => (
              <button key={f.id} onClick={() => { setFonteNotas(f.id); aplicarFonteNotas(f.id) }} aria-pressed={fonteNotas === f.id}
                className={`rounded-xl border py-2 ${fonteNotas === f.id ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/60 dark:text-bege/60'}`}>
                <span className="block text-lg leading-tight" style={f.css ? { fontFamily: f.css } : undefined}>Aa</span>
                <span className="block text-[11px] font-medium">{f.nome}</span>
              </button>
            ))}
          </div>

          <h3 className="titulo-secao mt-6">Aparência</h3>
          <div className="mt-2 divide-y divide-marinho/[0.07] dark:divide-bege/[0.08]">
            <Interruptor
              rotulo="Card do livro na cor da capa"
              legenda="O card do Início ganha um tom tirado da capa do livro do mês."
              ligado={corCapa} onMudar={(v) => { setCorCapa(v); definirCorDaCapa(v) }} />
            <Interruptor
              rotulo="Brilhos e efeitos"
              legenda="Reflexo nas barras, luz no card e faíscas nas comemorações."
              ligado={efeitos} onMudar={(v) => { setEfeitos(v); aplicarEfeitos(v) }} />
          </div>

          <h3 className="titulo-secao mt-6">Lembrete diário de leitura</h3>
          <p className="legenda mt-0.5 mb-3">O próprio calendário do celular avisa todo dia no horário escolhido.</p>
          <div className="flex items-center gap-2">
            <input type="time" value={horaLembrete} onChange={(e) => setHoraLembrete(e.target.value)} className="campo !w-32" aria-label="Horário do lembrete" />
          </div>
          {(() => {
            const evento = { titulo: 'Hora da leitura', descricao: 'Algumas páginas hoje. Depois registre no app Bereanos.', inicio: proximoHorario(horaLembrete || '21:00'), duracaoMin: 20, diario: true }
            return (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <a href={linkGoogleAgenda(evento)} target="_blank" rel="noopener" className="botao-secundario text-center text-sm">Google Agenda</a>
                <button onClick={() => baixarIcs(evento, 'lembrete-leitura.ics')} className="botao-secundario text-sm">iPhone / outro</button>
              </div>
            )
          })()}


          </div>}
        </section>

        <InstalarApp />

        <div className="mt-3"><TrocarSenha /></div>
        <button onClick={sair} className="mt-3 w-full py-3 text-sm font-semibold text-red-700 dark:text-red-400 flex items-center justify-center gap-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30">
          <Icone nome="sair" className="w-4 h-4" /> Sair da conta
        </button>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-texto/55 dark:text-bege/55">{rotulo}</dt>
      <dd className="text-marinho dark:text-bege text-right">{valor}</dd>
    </div>
  )
}

function CabecalhoRecolhivel({ titulo, detalhe, aberto, onAlternar, semMargem = false }: { titulo: string; detalhe?: string; aberto: boolean; onAlternar: () => void; semMargem?: boolean }) {
  return (
    <button onClick={onAlternar} aria-expanded={aberto} className={`w-full flex items-center justify-between gap-3 text-left ${semMargem ? '' : 'mb-3'}`}>
      <h2 className="titulo-secao">{titulo}</h2>
      <span className="flex items-center gap-2 shrink-0">
        {detalhe && <span className="legenda">{detalhe}</span>}
        <span className="text-xs font-semibold text-dourado-escuro dark:text-dourado">{aberto ? 'Recolher' : 'Mostrar'}</span>
        <Icone nome="seta-direita" className={`w-4 h-4 text-dourado-escuro dark:text-dourado transition-transform ${aberto ? '-rotate-90' : 'rotate-90'}`} />
      </span>
    </button>
  )
}

function TrocarSenha() {
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState('')
  const [repetir, setRepetir] = useState('')
  const [salvando, setSalvando] = useState(false)
  const avisar = useAviso()

  async function salvar() {
    if (nova.length < 8) return avisar('A senha precisa de pelo menos 8 caracteres', 'erro')
    if (nova !== repetir) return avisar('As duas senhas não são iguais', 'erro')
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: nova })
    setSalvando(false)
    if (error) return avisar(error.message.includes('different') ? 'Escolha uma senha diferente da atual' : 'Não foi possível trocar a senha', 'erro')
    setNova(''); setRepetir(''); setAberto(false)
    avisar('Senha trocada')
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="botao-secundario flex items-center justify-center gap-2">
        <Icone nome="cadeado" className="w-4 h-4" /> Trocar senha
      </button>
    )
  }
  return (
    <div className="cartao p-4">
      <label className="rotulo" htmlFor="nova-senha">Nova senha</label>
      <input id="nova-senha" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} className="campo" />
      <label className="rotulo mt-3" htmlFor="repetir-senha">Repita a nova senha</label>
      <input id="repetir-senha" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} className="campo" />
      <div className="flex gap-2 mt-4">
        <button onClick={salvar} disabled={salvando || !nova} className="botao-primario">{salvando ? 'Salvando…' : 'Salvar senha'}</button>
        <button onClick={() => { setAberto(false); setNova(''); setRepetir('') }} className="botao-secundario">Cancelar</button>
      </div>
    </div>
  )
}

function ItemMenu({ icone, rotulo, detalhe, onClick }: { icone: NomeIcone; rotulo: string; detalhe?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-marinho/[0.03] dark:hover:bg-bege/[0.04] first:rounded-t-2xl last:rounded-b-2xl">
      <span className="w-9 h-9 rounded-full bg-dourado/10 text-dourado-escuro dark:text-dourado flex items-center justify-center shrink-0"><Icone nome={icone} className="w-[18px] h-[18px]" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold text-marinho dark:text-bege">{rotulo}</span>
        {detalhe && <span className="block text-xs text-texto/50 dark:text-bege/50">{detalhe}</span>}
      </span>
      <Icone nome="seta-direita" className="w-4 h-4 text-texto/30 dark:text-bege/30" />
    </button>
  )
}

function Interruptor({ rotulo, legenda, ligado, onMudar }: { rotulo: string; legenda?: string; ligado: boolean; onMudar: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => onMudar(!ligado)}
      className="w-full flex items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dourado rounded-lg">
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] text-marinho dark:text-bege">{rotulo}</span>
        {legenda && <span className="block text-xs text-texto/55 dark:text-bege/55 mt-0.5">{legenda}</span>}
      </span>
      <span className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${ligado ? 'bg-dourado' : 'bg-marinho/20 dark:bg-bege/20'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}
