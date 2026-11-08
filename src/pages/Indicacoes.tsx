import { useEffect, useState, type ReactNode } from 'react'
import Vazio from '../components/Vazio'
import { supabase, type Perfil } from '../lib/supabase'
import { useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import Avatar from '../components/Avatar'
import { formatarData, tempoRelativo } from '../lib/estatisticas'
import TelaSorteio from '../components/TelaSorteio'

// Indicações de livros feitas pelos membros e o sorteio do próximo ciclo.
// Regra do clube: o livro sai por sorteio online, ou por uma obra específica
// se metade mais 1 do grupo decidir. O app só registra o sorteio.

interface Indicacao { id: string; membro_id: string; titulo: string; autor: string | null; motivo: string | null; status: 'aberta' | 'sorteada' | 'lida'; created_at: string; perfis: { nome_exibicao: string } | null }
interface Sorteio { id: string; indicacao_id: string | null; titulo: string; participantes: number; created_at: string; perfis: { nome_exibicao: string } | null }

export default function Indicacoes({ perfil, onVoltar, rotuloVoltar = 'Voltar' }: { perfil: Perfil; onVoltar: () => void
  rotuloVoltar?: string }) {
  const [lista, setLista] = useState<Indicacao[] | null>(null)
  const [sorteios, setSorteios] = useState<Sorteio[]>([])
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [abrindo, setAbrindo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [telaSorteio, setTelaSorteio] = useState(false)
  const [erro, setErro] = useState(false)
  const [apagandoSorteio, setApagandoSorteio] = useState<Sorteio | null>(null)
  const avisar = useAviso()
  const admin = perfil.role === 'admin'

  async function carregar() {
    const [i, s] = await Promise.all([
      supabase.from('indicacoes').select('id, membro_id, titulo, autor, motivo, status, created_at, perfis(nome_exibicao)').order('created_at', { ascending: false }),
      supabase.from('sorteios').select('id, indicacao_id, titulo, participantes, created_at, perfis(nome_exibicao)').order('created_at', { ascending: false }).limit(20)
    ])
    if (i.error) { setErro(true); setLista([]); return }
    setLista((i.data ?? []) as unknown as Indicacao[])
    setSorteios((s.data ?? []) as unknown as Sorteio[])
  }
  useEffect(() => { carregar() }, [])

  async function indicar() {
    if (!titulo.trim()) return
    setSalvando(true)
    const { error } = await supabase.from('indicacoes').insert({ membro_id: perfil.id, titulo: titulo.trim(), autor: autor.trim() || null, motivo: motivo.trim() || null })
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar a indicação', 'erro')
    setTitulo(''); setAutor(''); setMotivo(''); setAbrindo(false)
    avisar('Indicação adicionada')
    carregar()
  }

  async function remover(i: Indicacao) {
    const { error } = await supabase.from('indicacoes').delete().eq('id', i.id)
    if (error) return avisar('Não foi possível remover', 'erro')
    carregar()
  }

  async function apagarSorteio(s: Sorteio, tambemIndicacao: boolean) {
    setApagandoSorteio(null)
    const { error, count } = await supabase.from('sorteios').delete({ count: 'exact' }).eq('id', s.id)
    if (error || count === 0) {
      return avisar(count === 0 ? 'Sem permissão para apagar. Falta rodar a atualização 0012 no Supabase.' : 'Não foi possível apagar o registro', 'erro')
    }
    if (tambemIndicacao && s.indicacao_id) {
      const r = await supabase.from('indicacoes').delete().eq('id', s.indicacao_id)
      if (r.error) avisar('Registro apagado, mas a indicação não pôde ser removida', 'erro')
      else avisar('Registro e indicação apagados')
    } else {
      avisar('Registro do sorteio apagado')
    }
    carregar()
  }

  async function mudarStatus(i: Indicacao, status: Indicacao['status']) {
    const { error } = await supabase.from('indicacoes').update({ status }).eq('id', i.id)
    if (error) return avisar('Não foi possível alterar', 'erro')
    carregar()
  }

  const abertas = (lista ?? []).filter((x) => x.status === 'aberta')
  const outras = (lista ?? []).filter((x) => x.status !== 'aberta')

  return (
    <div className="min-h-screen px-5 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1">
          <Icone nome="seta-esquerda" className="w-4 h-4" /> {rotuloVoltar}
        </button>
        <h1 className="font-serif text-[30px] text-marinho dark:text-bege mt-3">Próximas leituras</h1>
        <p className="legenda mt-1">Indique um livro para o clube. O próximo ciclo sai por sorteio entre as indicações, ou por escolha de metade mais 1 do grupo.</p>

        {erro && <p className="cartao p-4 mt-4 text-sm text-red-700 dark:text-red-400">Não foi possível carregar as indicações.</p>}

        {abrindo ? (
          <div className="cartao p-5 mt-5 space-y-3 animate-subir-suave">
            <div>
              <label className="rotulo" htmlFor="ind-titulo">Título</label>
              <input id="ind-titulo" value={titulo} maxLength={200} onChange={(e) => setTitulo(e.target.value)} className="campo" autoFocus />
            </div>
            <div>
              <label className="rotulo" htmlFor="ind-autor">Autor</label>
              <input id="ind-autor" value={autor} maxLength={120} onChange={(e) => setAutor(e.target.value)} className="campo" />
            </div>
            <div>
              <label className="rotulo" htmlFor="ind-motivo">Por que esse livro? <span className="font-normal text-texto/45 dark:text-bege/45">(opcional)</span></label>
              <textarea id="ind-motivo" value={motivo} maxLength={500} rows={3} onChange={(e) => setMotivo(e.target.value)} className="campo resize-none" placeholder="O que o grupo ganharia lendo junto?" />
            </div>
            <div className="flex gap-2">
              <button onClick={indicar} disabled={salvando || !titulo.trim()} className="botao-primario">{salvando ? 'Salvando…' : 'Indicar'}</button>
              <button onClick={() => setAbrindo(false)} className="botao-secundario">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAbrindo(true)} className="botao-primario mt-5 flex items-center justify-center gap-2"><Icone nome="mais" className="w-4 h-4" /> Indicar um livro</button>
        )}

        {admin && abertas.length > 0 && (
          <section className="cartao p-5 mt-4 text-center">
            <h2 className="titulo-secao">Sorteio</h2>
            <p className="legenda mt-1">{abertas.length} {abertas.length === 1 ? 'indicação participa' : 'indicações participam'}. O sorteio é feito no servidor e fica registrado para todos verem.</p>
            <button onClick={() => setTelaSorteio(true)} className="botao-primario mt-4">Abrir o sorteio</button>
            <p className="text-xs text-texto/50 dark:text-bege/50 mt-2">Abre em tela cheia, com contagem regressiva. Bom para mostrar ao grupo no encontro.</p>
          </section>
        )}

        {telaSorteio && (
          <TelaSorteio
            candidatas={abertas.map((x) => ({ titulo: x.titulo, autor: x.autor, nome: x.perfis?.nome_exibicao ?? 'Membro' }))}
            onFechar={(sorteou) => { setTelaSorteio(false); if (sorteou) carregar() }}
          />
        )}

        <h2 className="titulo-secao mt-7 mb-3">Indicações abertas</h2>
        {lista === null && <div className="esqueleto h-20" />}
        {lista && abertas.length === 0 && <Vazio compacto texto="Nenhuma indicação aberta. Que tal a primeira?" />}
        <ul className="space-y-3">
          {abertas.map((i) => <ItemIndicacao key={i.id} i={i} perfil={perfil} onRemover={() => remover(i)} />)}
        </ul>

        {outras.length > 0 && (
          <>
            <h2 className="titulo-secao mt-7 mb-3">Já sorteadas ou lidas</h2>
            <ul className="space-y-3">
              {outras.map((i) => (
                <ItemIndicacao key={i.id} i={i} perfil={perfil} onRemover={() => remover(i)}
                  extra={admin ? (
                    <div className="flex gap-3 mt-2">
                      {i.status === 'sorteada' && <button onClick={() => mudarStatus(i, 'lida')} className="botao-texto text-xs">Marcar como lida</button>}
                      <button onClick={() => mudarStatus(i, 'aberta')} className="botao-texto text-xs">Voltar para o sorteio</button>
                    </div>
                  ) : undefined} />
              ))}
            </ul>
          </>
        )}

        {sorteios.length > 0 && (
          <section className="mt-7">
            <h2 className="titulo-secao mb-3">Histórico de sorteios</h2>
            <ul className="cartao divide-y divide-marinho/[0.07] dark:divide-bege/[0.07]">
              {sorteios.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-marinho dark:text-bege">{s.titulo}</p>
                      <p className="text-xs text-texto/45 dark:text-bege/45">{formatarData(s.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}, entre {s.participantes} {s.participantes === 1 ? 'indicação' : 'indicações'}{s.perfis ? `, por ${s.perfis.nome_exibicao}` : ''}</p>
                    </div>
                    {admin && (
                      <button onClick={() => setApagandoSorteio(apagandoSorteio?.id === s.id ? null : s)} aria-label={`Apagar registro do sorteio de ${s.titulo}`}
                        className="p-2.5 -mr-2 -mt-1 text-texto/40 dark:text-bege/45 hover:text-red-700 dark:hover:text-red-400">
                        <Icone nome="lixeira" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {apagandoSorteio?.id === s.id && (
                    <div className="mt-3 rounded-xl bg-marinho/[0.04] dark:bg-bege/[0.05] p-3 animate-subir-suave">
                      <p className="text-sm text-texto/80 dark:text-bege/80">O que você quer apagar?</p>
                      <div className="flex flex-col gap-2 mt-3">
                        <button onClick={() => apagarSorteio(s, false)} className="botao-secundario text-sm">Só o registro do sorteio</button>
                        {s.indicacao_id && (
                          <button onClick={() => apagarSorteio(s, true)} className="w-full rounded-xl bg-red-800 text-white py-2.5 text-sm font-semibold">O registro e a indicação do livro</button>
                        )}
                        <button onClick={() => setApagandoSorteio(null)} className="text-sm text-texto/55 dark:text-bege/55 py-1">Cancelar</button>
                      </div>
                      <p className="text-[11px] text-texto/50 dark:text-bege/50 mt-2">
                        {s.indicacao_id ? 'Ao apagar só o registro, a indicação continua na lista, como está.' : 'A indicação deste sorteio já foi removida.'}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function ItemIndicacao({ i, perfil, onRemover, extra }: { i: Indicacao; perfil: Perfil; onRemover: () => void; extra?: ReactNode }) {
  const [confirmar, setConfirmar] = useState(false)
  const pode = i.membro_id === perfil.id || perfil.role === 'admin'
  return (
    <li className="cartao p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-12 rounded border border-dourado/40 flex items-center justify-center shrink-0 text-dourado"><Icone nome="livro" className="w-4 h-4" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[17px] leading-snug text-marinho dark:text-bege">{i.titulo}</p>
          {i.autor && <p className="text-sm text-texto/60 dark:text-bege/60">{i.autor}</p>}
          {i.status !== 'aberta' && <span className="selo mt-1 inline-block">{i.status === 'sorteada' ? 'sorteado' : 'lido'}</span>}
        </div>
        {pode && (confirmar
          ? <button onClick={onRemover} className="text-xs font-semibold text-red-700 dark:text-red-400 px-2 py-1">Remover</button>
          : <button onClick={() => setConfirmar(true)} aria-label="Remover indicação" className="p-1.5 text-texto/35 dark:text-bege/35 hover:text-red-700"><Icone nome="lixeira" className="w-4 h-4" /></button>)}
      </div>
      {i.motivo && <p className="text-[15px] text-texto/80 dark:text-bege/80 mt-3 whitespace-pre-line">{i.motivo}</p>}
      <p className="flex items-center gap-2 text-xs text-texto/45 dark:text-bege/45 mt-3">
        <Avatar nome={i.perfis?.nome_exibicao ?? 'Membro'} tamanho={20} /> {i.perfis?.nome_exibicao ?? 'Membro'}, {tempoRelativo(i.created_at)}
      </p>
      {extra}
    </li>
  )
}
