import { useEffect, useState } from 'react'
import { supabase, type Perfil } from '../lib/supabase'
import { tempoRelativo } from '../lib/estatisticas'
import { useAviso } from './Toast'
import Avatar from './Avatar'
import Icone from './Icone'

// Conversa curta embaixo de uma anotação do mural: o "Dialogar" entre os encontros.

interface Resposta { id: string; membro_id: string; texto: string; created_at: string; perfis: { nome_exibicao: string } | null }

export default function RespostasMural({ anotacaoId, perfil, autorNota }: { anotacaoId: string; perfil: Perfil; autorNota: string }) {
  const [qtd, setQtd] = useState<number | null>(null)
  const [aberto, setAberto] = useState(false)
  const [lista, setLista] = useState<Resposta[] | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const avisar = useAviso()

  useEffect(() => {
    supabase.from('respostas_mural').select('id', { count: 'exact', head: true }).eq('anotacao_id', anotacaoId)
      .then(({ count, error }) => setQtd(error ? null : count ?? 0))
  }, [anotacaoId])

  async function carregar() {
    const { data } = await supabase.from('respostas_mural').select('id, membro_id, texto, created_at, perfis(nome_exibicao)')
      .eq('anotacao_id', anotacaoId).order('created_at')
    const l = (data ?? []) as unknown as Resposta[]
    setLista(l)
    setQtd(l.length)
  }

  function alternar() {
    if (!aberto && lista === null) carregar()
    setAberto((v) => !v)
  }

  async function enviar() {
    const t = texto.trim()
    if (!t) return
    setEnviando(true)
    const { error } = await supabase.from('respostas_mural').insert({ anotacao_id: anotacaoId, membro_id: perfil.id, texto: t })
    setEnviando(false)
    if (error) return avisar('Não foi possível enviar', 'erro')
    setTexto('')
    carregar()
  }

  async function apagar(r: Resposta) {
    const { error } = await supabase.from('respostas_mural').delete().eq('id', r.id)
    if (error) return avisar('Não foi possível apagar', 'erro')
    carregar()
  }

  if (qtd === null) return null // tabela indisponível: não mostra nada

  return (
    <div className="mt-3 pt-3 border-t border-marinho/[0.07] dark:border-bege/[0.08]">
      <button onClick={alternar} aria-expanded={aberto} className="flex items-center gap-1.5 text-xs font-semibold text-texto/55 dark:text-bege/55 hover:text-dourado-escuro dark:hover:text-dourado">
        <Icone nome="grupo" className="w-3.5 h-3.5" />
        {qtd === 0 ? 'Responder' : `${qtd} ${qtd === 1 ? 'resposta' : 'respostas'}`}
      </button>
      {aberto && (
        <div className="mt-3 space-y-3 animate-subir-suave">
          {lista === null && <div className="esqueleto h-10" />}
          {lista?.map((r) => (
            <div key={r.id} className="flex gap-2">
              <Avatar nome={r.perfis?.nome_exibicao ?? 'Membro'} tamanho={24} />
              <div className="flex-1 min-w-0 rounded-xl bg-marinho/[0.04] dark:bg-bege/[0.05] px-3 py-2">
                <p className="text-xs text-texto/50 dark:text-bege/50">
                  <span className="font-semibold text-marinho/80 dark:text-bege/80">{r.perfis?.nome_exibicao ?? 'Membro'}</span>
                  {r.membro_id === autorNota && ' (autor)'}, {tempoRelativo(r.created_at)}
                </p>
                <p className="texto-nota text-[14px] text-texto dark:text-bege whitespace-pre-line mt-0.5">{r.texto}</p>
              </div>
              {(r.membro_id === perfil.id || perfil.role === 'admin') && (
                <button onClick={() => apagar(r)} aria-label="Apagar resposta" className="self-start p-1 text-texto/30 dark:text-bege/30 hover:text-red-700 dark:hover:text-red-400">
                  <Icone nome="lixeira" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={1000}
              placeholder="Escreva com respeito. Concordar e discordar são bem-vindos." className="campo text-sm resize-none flex-1" />
            <button onClick={enviar} disabled={enviando || !texto.trim()} className="self-end rounded-xl bg-marinho dark:bg-dourado text-bege dark:text-noite px-3 py-2 text-sm font-semibold disabled:opacity-40">
              {enviando ? '…' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
