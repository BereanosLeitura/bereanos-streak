import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import { MarcoLeitura, TelaTerminei } from './components/Celebracao'
import { supabase, buscarPerfilAtual, type Perfil as TPerfil } from './lib/supabase'
import { sincronizarTudo } from './lib/sync'
import { aplicarTema, temaSalvoLocal, type TemaPreferido } from './lib/tema'
import { ProvedorAvisos } from './components/Toast'
import Icone, { type NomeIcone } from './components/Icone'
import Login from './pages/Login'
import CompletarPerfil from './pages/CompletarPerfil'
import Inicio, { type LivroAtivo, type Destino } from './pages/Inicio'
import RegistrarLeitura from './pages/RegistrarLeitura'
import EstadoConexao from './components/EstadoConexao'
import GuiaBoasVindas from './components/GuiaBoasVindas'
import { ContagemContext, buscarPadraoClube, padraoClubeLocal, aplicarTamanhoLetra, tamanhoLetraSalvo, aplicarFonteNotas, fonteNotasSalva, aplicarEfeitos, efeitosAtivos } from './lib/preferencias'
import type { PreCarga } from './pages/Compartilhar'
import type { FiltroInicialNotas } from './pages/Notas'

// Telas carregadas sob demanda: o app abre mais rápido no celular.
// Depois de uma versão nova no ar, o arquivo antigo de uma tela pode não existir
// mais: nesse caso o app recarrega uma vez e já abre a versão nova.
function sobDemanda<T extends ComponentType<any>>(carregar: () => Promise<{ default: T }>) {
  return lazy(() => carregar().then((m) => {
    try { sessionStorage.removeItem('bereanos-streak-recarregou') } catch { /* ok */ }
    return m
  }).catch((erro) => {
    let jaRecarregou = true
    try { jaRecarregou = sessionStorage.getItem('bereanos-streak-recarregou') === '1' } catch { /* ok */ }
    if (!jaRecarregou && navigator.onLine) {
      try { sessionStorage.setItem('bereanos-streak-recarregou', '1') } catch { /* ok */ }
      location.reload()
      return new Promise<{ default: T }>(() => {})
    }
    throw erro
  }))
}
const Pomodoro = sobDemanda(() => import('./pages/Pomodoro'))
const Metas = sobDemanda(() => import('./pages/Metas'))
const Notas = sobDemanda(() => import('./pages/Notas'))
const Perfil = sobDemanda(() => import('./pages/Perfil'))
const AdminPainel = sobDemanda(() => import('./pages/AdminPainel'))
const Compartilhar = sobDemanda(() => import('./pages/Compartilhar'))
const LivroDetalhe = sobDemanda(() => import('./pages/LivroDetalhe'))
const Panorama = sobDemanda(() => import('./pages/Panorama'))
const Encontro = sobDemanda(() => import('./pages/Encontro'))
const Indicacoes = sobDemanda(() => import('./pages/Indicacoes'))
const Ano = sobDemanda(() => import('./pages/Ano'))
const Metricas = sobDemanda(() => import('./pages/Metricas'))

// Cópia local do perfil e do livro: o app abre mesmo sem internet.
const CACHE_PERFIL = 'bereanos-streak-cache-perfil'
const CACHE_LIVRO = 'bereanos-streak-cache-livro'
function lerCache<T>(chave: string): T | null {
  try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) as T : null } catch { return null }
}
function gravarCache(chave: string, valor: unknown) {
  try { if (valor == null) localStorage.removeItem(chave); else localStorage.setItem(chave, JSON.stringify(valor)) } catch { /* ok */ }
}

type Aba = 'inicio' | 'foco' | 'registrar' | 'notas' | 'compartilhar' | 'metas' | 'perfil' | 'admin' | 'livro' | 'panorama' | 'encontro' | 'indicacoes' | 'ano' | 'metricas'

export default function App() {
  return (
    <ProvedorAvisos>
      <Aplicativo />
    </ProvedorAvisos>
  )
}

function Aplicativo() {
  const [sessaoChecada, setSessaoChecada] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<TPerfil | null>(null)
  const [livro, setLivro] = useState<LivroAtivo | null | undefined>(undefined) // undefined = ainda não checou
  const [aba, setAba] = useState<Aba>('inicio')
  const [tema, setTema] = useState<TemaPreferido>(() => temaSalvoLocal())
  const [versao, setVersao] = useState(0) // força recarregar o Início depois de um registro
  const [preCarga, setPreCarga] = useState<PreCarga | null>(null)
  const [focoAtivo, setFocoAtivo] = useState(false) // esconde a navegação durante a sessão de foco
  const [notasInicial, setNotasInicial] = useState<FiltroInicialNotas | null>(null)
  const [terminado, setTerminado] = useState<LivroAtivo | null>(null)
  const [marco, setMarco] = useState<{ valor: number; titulo: string } | null>(null)
  const [livroDetalhe, setLivroDetalhe] = useState<string | null>(null)
  const [livroCompartilhar, setLivroCompartilhar] = useState<LivroAtivo | null>(null) // livro da Estante, quando a imagem é de um ciclo passado
  const [verGuia, setVerGuia] = useState(false)
  const [livroEncontro, setLivroEncontro] = useState<LivroAtivo | null>(null) // encontro de um ciclo passado
  const [voltarDe, setVoltarDe] = useState<Aba>('inicio')
  const [metricasInicial, setMetricasInicial] = useState<'voce' | 'grupo'>('voce')
  const [pendenteInicial, setPendenteInicial] = useState<string | null>(null)
  useEffect(() => { if (aba !== 'registrar') setPendenteInicial(null) }, [aba])
  const [contagemPadrao, setContagemPadrao] = useState(() => padraoClubeLocal())
  const ultimaAtualizacao = useRef(Date.now())
  const chaveGuia = perfil ? `bereanos-streak-guia-visto-${perfil.id}` : null

  // primeira vez neste aparelho: abre o guia curto de boas-vindas
  useEffect(() => {
    if (!chaveGuia || !livro || perfil?.senha_temporaria) return
    let visto = true
    try { visto = localStorage.getItem(chaveGuia) === '1' } catch { /* ok */ }
    if (!visto) setVerGuia(true)
  }, [chaveGuia, !!livro])

  function fecharGuia() {
    setVerGuia(false)
    try { if (chaveGuia) localStorage.setItem(chaveGuia, '1') } catch { /* ok */ }
  }

  // Ao voltar para o app (depois de um tempo fora), sincroniza e atualiza o Início.
  useEffect(() => {
    const aoVoltar = async () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - ultimaAtualizacao.current < 60_000) return
      ultimaAtualizacao.current = Date.now()
      await sincronizarTudo()
      setVersao((v) => v + 1)
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null)
      setSessaoChecada(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === 'SIGNED_OUT') {
        gravarCache(CACHE_PERFIL, null)
        gravarCache(CACHE_LIVRO, null)
      }
      setUserId(session?.user.id ?? null)
    })

    sincronizarTudo()
    aplicarTema(temaSalvoLocal())

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudarSistema = () => {
      if (temaSalvoLocal() === 'sistema') aplicarTema('sistema')
    }
    media.addEventListener('change', aoMudarSistema)

    return () => {
      listener.subscription.unsubscribe()
      media.removeEventListener('change', aoMudarSistema)
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setPerfil(null)
      setLivro(undefined)
      setAba('inicio')
      return
    }
    buscarPerfilAtual().then((p) => {
      // sem internet, usa a última cópia do perfil desta mesma conta
      const cache = lerCache<TPerfil>(CACHE_PERFIL)
      const final = p ?? (cache?.id === userId ? cache : null)
      setPerfil(final)
      if (p) gravarCache(CACHE_PERFIL, p)
      if (final) {
        aplicarTema(final.tema_preferido)
        setTema(final.tema_preferido)
      }
    })
  }, [userId])

  useEffect(() => {
    if (!perfil || perfil.senha_temporaria) return
    carregarLivroAtivo()
    buscarPadraoClube().then(setContagemPadrao)
  }, [perfil?.id, perfil?.senha_temporaria])

  useEffect(() => { aplicarTamanhoLetra(tamanhoLetraSalvo()); aplicarFonteNotas(fonteNotasSalva()); aplicarEfeitos(efeitosAtivos()) }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [aba])

  async function carregarLivroAtivo() {
    const { data, error } = await supabase
      .from('livros')
      .select('id, titulo, autor, capa_url, paginas_totais, ciclo_inicio, ciclo_fim, encontro_em, encontro_local')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      // falha de rede: mantém o último livro conhecido
      setLivro(lerCache<LivroAtivo>(CACHE_LIVRO) ?? null)
      return
    }
    gravarCache(CACHE_LIVRO, data ?? null)
    setLivro(data ?? null)
  }

  async function mudarTema(novo: TemaPreferido) {
    aplicarTema(novo)
    setTema(novo)
    if (perfil) {
      await supabase.from('perfis').update({ tema_preferido: novo }).eq('id', perfil.id)
      setPerfil({ ...perfil, tema_preferido: novo })
    }
  }

  // tela de abertura (index.html): sai quando a primeira tela de verdade está pronta
  const pronto = sessaoChecada && (!userId || (!!perfil && (!!perfil.senha_temporaria || livro !== undefined)))
  useEffect(() => { if (pronto) fecharAbertura() }, [pronto])

  if (!sessaoChecada) return <TelaCarregando />
  if (!userId) return <Login />
  if (!perfil) return <TelaCarregando texto="Carregando seu perfil" />
  if (perfil.senha_temporaria) {
    return <CompletarPerfil userId={userId} onConcluido={() => buscarPerfilAtual().then(setPerfil)} />
  }
  if (livro === undefined) return <TelaCarregando texto="Abrindo o livro do ciclo" />

  if (!livro) {
    if (perfil.role === 'admin') {
      return (
        <div className="min-h-screen pb-6">
          <Suspense fallback={<TelaCarregando />}>
            <AdminPainel adminId={perfil.id} livro={null} onLivroMudou={carregarLivroAtivo} />
          </Suspense>
        </div>
      )
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <Icone nome="livro" className="w-10 h-10 text-dourado" />
        <h1 className="font-serif text-2xl text-marinho dark:text-bege mt-4">Entre um livro e outro</h1>
        <p className="legenda mt-2 max-w-xs">O próximo livro do ciclo aparece aqui assim que o admin cadastrar.</p>
        <button onClick={() => supabase.auth.signOut()} className="botao-texto mt-8">Sair da conta</button>
      </div>
    )
  }

  function ir(destino: Destino | Aba, carga: PreCarga | null = null) {
    if (destino === 'aplicar') {
      setNotasInicial({ vista: 'minhas', filtro: 'todas', novaTipo: 'aplicacao' })
      setAba('notas')
      return
    }
    if (destino === 'perguntas-encontro') {
      setNotasInicial({ vista: 'mural', filtro: 'pergunta' })
      setAba('notas')
      return
    }
    setNotasInicial(null)
    setLivroCompartilhar(null)
    if (destino === 'encontro' || destino === 'indicacoes' || destino === 'metas') { setLivroEncontro(null); setVoltarDe(aba) }
    setPreCarga(carga)
    setAba(destino as Aba)
  }

  const itens: { aba: Aba; rotulo: string; icone: NomeIcone }[] = [
    { aba: 'inicio', rotulo: 'Início', icone: 'casa' },
    { aba: 'foco', rotulo: 'Foco', icone: 'relogio' },
    { aba: 'registrar', rotulo: 'Registrar', icone: 'mais' },
    { aba: 'notas', rotulo: 'Anotações', icone: 'nota' },
    { aba: 'compartilhar', rotulo: 'Compartilhar', icone: 'compartilhar' }
  ]

  const contagem = perfil.mostrar_contagem ?? contagemPadrao
  const ROTULO_ABA: Partial<Record<Aba, string>> = { inicio: 'Início', perfil: 'Perfil', admin: 'Painel do admin', livro: 'Livro', panorama: 'Panorama', notas: 'Anotações', foco: 'Foco', compartilhar: 'Compartilhar', registrar: 'Registrar' }
  const rotuloVoltar = ROTULO_ABA[voltarDe] ?? 'Voltar'
  const indiceAtivo = itens.findIndex((i) => i.aba === aba && i.aba !== 'registrar')

  return (
    <ContagemContext.Provider value={contagem}>
    <div className="min-h-screen">
      <EstadoConexao />
      {verGuia && <GuiaBoasVindas nome={perfil.nome_exibicao} onFechar={fecharGuia} />}
      {marco && <MarcoLeitura marco={marco.valor} titulo={marco.titulo} onFechar={() => setMarco(null)} />}
      {terminado && (
        <TelaTerminei
          livro={terminado}
          doCiclo={terminado.id === livro.id}
          onFechar={() => setTerminado(null)}
          onImagem={() => {
            const t = terminado
            setTerminado(null)
            ir('compartilhar', { modo: 'leitura', modeloLeitura: 'terminei' })
            if (t.id !== livro.id) setLivroCompartilhar(t)
          }}
          onAplicacao={() => { setTerminado(null); ir('aplicar') }}
          onCaderno={() => { setTerminado(null); setNotasInicial({ vista: 'minhas', filtro: 'todas', abrirCaderno: true }); setAba('notas') }}
        />
      )}
      <Suspense fallback={<TelaCarregando />}>
      <div key={aba} className="animate-tela">
        {aba === 'inicio' && <Inicio key={versao} perfil={perfil} livro={livro} onIr={ir} onPerfilAtualizado={setPerfil} onContinuarPendente={(id) => { setPendenteInicial(id); setAba('registrar') }} />}
        {aba === 'foco' && <Pomodoro perfil={perfil} livro={livro} onFocoAtivo={setFocoAtivo} />}
        {aba === 'registrar' && (
          <RegistrarLeitura
            perfil={perfil}
            livro={livro}
            pendenteInicial={pendenteInicial}
            onRegistrado={(terminou, livroUsado, marco) => {
              setVersao((v) => v + 1)
              setPendenteInicial(null)
              setAba('inicio')
              if (terminou) setTerminado(livroUsado)
              else if (marco) setMarco({ valor: marco, titulo: livroUsado.titulo })
            }}
            onAnotar={() => setAba('notas')}
          />
        )}
        {aba === 'notas' && (
          <Notas key={JSON.stringify(notasInicial)} perfil={perfil} livro={livro} inicial={notasInicial} onCompartilhar={(n) => ir('compartilhar', { modo: 'texto', tipo: n.tipo, texto: n.texto, pagina: n.pagina, autor: n.autor })} />
        )}
        {aba === 'compartilhar' && (
          <Compartilhar key={JSON.stringify(preCarga) + (livroCompartilhar?.id ?? '')} perfil={perfil} livro={livroCompartilhar ?? livro} preCarga={preCarga} />
        )}
        {aba === 'encontro' && (
          <Encontro perfil={perfil} livro={livroEncontro ?? livro} onVoltar={() => setAba(voltarDe)} rotuloVoltar={rotuloVoltar} />
        )}
        {aba === 'ano' && <Ano perfil={perfil} onVoltar={() => setAba('perfil')} />}
        {aba === 'metricas' && <Metricas perfil={perfil} livro={livro} inicial={metricasInicial} onVoltar={() => setAba(voltarDe)} rotuloVoltar={rotuloVoltar} />}
        {aba === 'indicacoes' && <Indicacoes perfil={perfil} onVoltar={() => setAba(voltarDe)} rotuloVoltar={rotuloVoltar} />}
        {aba === 'panorama' && (
          <Panorama
            livro={livro}
            onVoltar={() => setAba('inicio')}
            onCompartilhar={() => ir('compartilhar', { modo: 'leitura', modeloLeitura: 'grupo' })}
            onMural={() => { setNotasInicial({ vista: 'mural', filtro: 'todas' }); setAba('notas') }}
            onMetricas={() => { setMetricasInicial('grupo'); setVoltarDe('panorama'); setAba('metricas') }}
          />
        )}
        {aba === 'metas' && <Metas perfil={perfil} livro={livro} onVoltar={() => setAba(voltarDe)} rotuloVoltar={rotuloVoltar} />}
        {aba === 'perfil' && (
          <Perfil
            perfil={perfil}
            livro={livro}
            tema={tema}
            onMudarTema={mudarTema}
            onPerfilAtualizado={setPerfil}
            onVoltar={() => setAba('inicio')}
            onAbrirAdmin={() => setAba('admin')}
            onAbrirMetas={() => { setVoltarDe('perfil'); setAba('metas') }}
            onAbrirLivro={(id) => { setLivroDetalhe(id); setAba('livro') }}
            onAbrirGuia={() => setVerGuia(true)}
            onAbrirIndicacoes={() => { setVoltarDe('perfil'); setAba('indicacoes') }}
            onAbrirAno={() => setAba('ano')}
            onAbrirMetricas={() => { setMetricasInicial('voce'); setVoltarDe('perfil'); setAba('metricas') }}
          />
        )}
        {aba === 'livro' && livroDetalhe && (
          <LivroDetalhe
            perfil={perfil}
            livroId={livroDetalhe}
            onVoltar={() => setAba('perfil')}
            onCompartilhar={(l, n) => {
              setPreCarga({ modo: 'texto', tipo: n.tipo, texto: n.texto, pagina: n.pagina, autor: n.autor })
              setLivroCompartilhar(l.id === livro.id ? null : l)
              setAba('compartilhar')
            }}
            onAbrirEncontro={(l) => { setLivroEncontro(l.id === livro.id ? null : l); setVoltarDe('livro'); setAba('encontro') }}
            onCompartilharRetrospectiva={(l) => {
              setPreCarga({ modo: 'leitura', modeloLeitura: 'retrospectiva' })
              setLivroCompartilhar(l.id === livro.id ? null : l)
              setAba('compartilhar')
            }}
          />
        )}
        {aba === 'admin' && perfil.role === 'admin' && (
          <AdminPainel
            adminId={perfil.id}
            livro={livro}
            onVoltar={() => setAba('perfil')}
            onLivroMudou={() => { carregarLivroAtivo(); setAba('inicio') }}
            onAbrirEncontro={() => { setLivroEncontro(null); setVoltarDe('admin'); setAba('encontro') }}
            onAbrirIndicacoes={() => { setVoltarDe('admin'); setAba('indicacoes') }}
          />
        )}
      </div>
      </Suspense>

      {!(focoAtivo && aba === 'foco') && <nav
        className="fixed bottom-0 inset-x-0 z-30 bg-folha/95 dark:bg-noite/95 backdrop-blur border-t border-marinho/10 dark:border-bege/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegação principal"
      >
        <ul className="relative max-w-md mx-auto grid grid-cols-5 items-end px-2 pt-1.5 pb-2">
          {indiceAtivo >= 0 && (
            <span aria-hidden="true" className="indicador-aba absolute top-0 h-[3px] w-7 rounded-b-full bg-dourado"
              style={{ left: `calc(0.5rem + (100% - 1rem) * ${(indiceAtivo + 0.5) / itens.length} - 14px)` }} />
          )}
          {itens.map((item) => {
            const ativo = aba === item.aba
            if (item.aba === 'registrar') {
              return (
                <li key={item.aba} className="flex justify-center">
                  <button
                    onClick={() => setAba('registrar')}
                    aria-label="Registrar leitura"
                    aria-current={ativo ? 'page' : undefined}
                    className={`-mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-marinho/20 transition-transform active:scale-95
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dourado focus-visible:ring-offset-2 focus-visible:ring-offset-folha
                                ${ativo ? 'bg-dourado text-marinho' : 'bg-marinho text-bege dark:bg-dourado dark:text-noite'}`}
                  >
                    <Icone nome="mais" className="w-6 h-6" traco={2} />
                  </button>
                </li>
              )
            }
            return (
              <li key={item.aba}>
                <button
                  onClick={() => ir(item.aba)}
                  aria-current={ativo ? 'page' : undefined}
                  className={`w-full flex flex-col items-center gap-1 py-1.5 rounded-lg transition-[color,transform] duration-150 active:scale-95
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dourado
                              ${ativo ? 'text-marinho dark:text-dourado' : 'text-texto/45 dark:text-bege/45 hover:text-texto/70 dark:hover:text-bege/70'}`}
                >
                  <Icone nome={item.icone} className="w-[22px] h-[22px]" traco={ativo ? 2 : 1.6} />
                  <span className={`text-[11px] ${ativo ? 'font-semibold' : ''}`}>{item.rotulo}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>}
    </div>
    </ContagemContext.Provider>
  )
}

function TelaCarregando({ texto }: { texto?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="w-10 h-10 rounded-full border-2 border-dourado/25 border-t-dourado animate-spin" />
      {texto && <p className="legenda">{texto}…</p>}
    </div>
  )
}

function fecharAbertura() {
  const el = document.getElementById('abertura')
  if (!el || el.dataset.saindo) return
  el.dataset.saindo = '1'
  const desde = Number(el.dataset.inicio || 0)
  const espera = Math.max(0, 700 - (performance.now() - desde))
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 450)
  }, espera)
}
