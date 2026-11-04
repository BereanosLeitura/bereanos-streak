import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import Logo from './Logo'

// Tela cheia do sorteio da próxima leitura: as indicações giram, uma contagem
// regressiva de 5 segundos cria o suspense e só então o resultado aparece.
// Quem decide é o servidor (sortear_indicacao), chamado logo no início;
// a contagem é só a revelação.

interface Candidata { titulo: string; autor: string | null; nome: string }
interface Resultado { titulo: string; participantes: number }

type Fase = 'pronto' | 'contando' | 'revelado' | 'erro'

export default function TelaSorteio({ candidatas, onFechar }: { candidatas: Candidata[]; onFechar: (sorteou: boolean) => void }) {
  const [fase, setFase] = useState<Fase>('pronto')
  const [conta, setConta] = useState(5)
  const [girando, setGirando] = useState(0)
  const [res, setRes] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')
  const pedido = useRef<Promise<{ data: unknown; error: { message: string } | null }> | null>(null)
  const reduzido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // bloqueia a rolagem da página por baixo
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = antes }
  }, [])

  // títulos girando durante a contagem (desacelera no fim)
  useEffect(() => {
    if (fase !== 'contando' || reduzido) return
    const ms = conta > 2 ? 90 : conta > 1 ? 160 : 260
    const id = setInterval(() => setGirando((g) => g + 1), ms)
    return () => clearInterval(id)
  }, [fase, conta, reduzido])

  // contagem regressiva
  useEffect(() => {
    if (fase !== 'contando') return
    if (conta === 0) { revelar(); return }
    bip(conta === 1 ? 660 : 520, 0.08)
    try { navigator.vibrate?.(30) } catch { /* ok */ }
    const t = setTimeout(() => setConta((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [fase, conta])

  function comecar() {
    pedido.current = supabase.rpc('sortear_indicacao') as unknown as Promise<{ data: unknown; error: { message: string } | null }>
    setConta(5)
    setFase('contando')
  }

  async function revelar() {
    const r = await pedido.current
    if (!r || r.error) {
      setErro(r?.error?.message || 'Não foi possível sortear agora.')
      setFase('erro')
      return
    }
    setRes(r.data as Resultado)
    setFase('revelado')
    acorde()
    try { navigator.vibrate?.([60, 80, 160]) } catch { /* ok */ }
  }

  async function copiar() {
    if (!res) return
    const texto = `Sorteio da próxima leitura do Clube do Livro Bereanos: ${res.titulo}. Sorteado entre ${res.participantes} ${res.participantes === 1 ? 'indicação' : 'indicações'}. Vamos confirmar juntos?`
    try { await navigator.clipboard.writeText(texto) } catch { /* ok */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
  }

  const atual = candidatas.length ? candidatas[girando % candidatas.length] : null

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-marinho text-bege flex flex-col items-center justify-between px-6 py-10 overflow-hidden" role="dialog" aria-modal="true" aria-label="Sorteio da próxima leitura">
      {/* brilho ao fundo */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${fase === 'revelado' ? 'opacity-100' : 'opacity-40'}`}
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(184,145,47,0.28), rgba(27,42,74,0) 60%)' }} />

      <div className="relative text-center">
        <Logo versao="horizontal" sempre="branco" className="h-9 mx-auto" />
        <p className="text-sm text-dourado mt-4">Sorteio da próxima leitura</p>
      </div>

      <div className="relative w-full max-w-sm text-center" aria-live="polite">
        {fase === 'pronto' && (
          <>
            <p className="font-serif text-[30px] leading-tight">{candidatas.length} {candidatas.length === 1 ? 'livro participa' : 'livros participam'}</p>
            <ul className="mt-6 space-y-2 max-h-[38vh] overflow-y-auto">
              {candidatas.map((c, i) => (
                <li key={i} className="rounded-xl bg-bege/[0.06] px-4 py-2.5 text-left">
                  <p className="font-serif text-[17px] leading-snug">{c.titulo}</p>
                  <p className="text-xs text-bege/60">{c.autor ? `${c.autor}, ` : ''}indicado por {c.nome}</p>
                </li>
              ))}
            </ul>
          </>
        )}

        {fase === 'contando' && (
          <>
            <p key={conta} className="font-serif tabular text-[150px] leading-none text-dourado animate-contagem">{conta}</p>
            <div className="h-24 mt-6 flex items-center justify-center">
              {reduzido
                ? <p className="text-bege/70">Sorteando…</p>
                : <p className="font-serif text-[24px] leading-snug text-bege/85 px-2 line-clamp-2">{atual?.titulo}</p>}
            </div>
          </>
        )}

        {fase === 'revelado' && res && (
          <div className="animate-revelar">
            <p className="text-sm font-semibold text-dourado">A próxima leitura sorteada é</p>
            <div className="flex items-center justify-center gap-3 my-5" aria-hidden="true">
              <span className="h-px w-16 bg-dourado/70" /><span className="w-2.5 h-2.5 rotate-45 bg-dourado" /><span className="h-px w-16 bg-dourado/70" />
            </div>
            <p className="font-serif text-[38px] leading-[1.1]">{res.titulo}</p>
            <p className="text-sm text-bege/65 mt-4">Sorteado entre {res.participantes} {res.participantes === 1 ? 'indicação' : 'indicações'}.</p>
            <p className="text-sm text-bege/80 mt-5 rounded-xl bg-bege/[0.07] px-4 py-3">
              Confirme com o grupo antes de cadastrar como livro do ciclo.
            </p>
          </div>
        )}

        {fase === 'erro' && (
          <div>
            <p className="font-serif text-2xl">O sorteio não aconteceu</p>
            <p className="text-sm text-bege/70 mt-2">{erro}</p>
          </div>
        )}
      </div>

      <div className="relative w-full max-w-sm space-y-2">
        {fase === 'pronto' && (
          <>
            <button onClick={comecar} disabled={candidatas.length === 0} className="w-full rounded-xl bg-dourado text-marinho font-semibold py-3.5 text-lg active:scale-[0.98] transition-transform">
              Sortear
            </button>
            <button onClick={() => onFechar(false)} className="w-full py-3 text-bege/70">Cancelar</button>
          </>
        )}
        {fase === 'contando' && <p className="text-center text-sm text-bege/55">O resultado já está guardado no servidor.</p>}
        {fase === 'revelado' && (
          <>
            <button onClick={copiar} className="w-full rounded-xl bg-dourado text-marinho font-semibold py-3.5">Avisar o grupo no WhatsApp</button>
            <button onClick={() => onFechar(true)} className="w-full py-3 text-bege/80">Fechar</button>
          </>
        )}
        {fase === 'erro' && <button onClick={() => onFechar(false)} className="w-full rounded-xl border border-bege/30 py-3">Fechar</button>}
      </div>
    </div>,
    document.body
  )
}

// sons curtos gerados no navegador (sem arquivos)
function bip(freq: number, vol: number) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.2)
    setTimeout(() => ctx.close().catch(() => {}), 400)
  } catch { /* sem áudio */ }
}
function acorde() {
  ;[523, 659, 784].forEach((f, i) => setTimeout(() => bip(f, 0.12), i * 110))
}
