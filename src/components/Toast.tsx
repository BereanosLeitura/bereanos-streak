import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icone from './Icone'

// Aviso curto no rodapé da tela, acima da navegação ("Leitura registrada", etc.).

type Tom = 'ok' | 'erro'
export interface AcaoAviso { rotulo: string; aoClicar: () => void }
interface Aviso { id: number; texto: string; tom: Tom; acao?: AcaoAviso }

const Contexto = createContext<(texto: string, tom?: Tom, acao?: AcaoAviso) => void>(() => {})

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = useCallback((texto: string, tom: Tom = 'ok', acao?: AcaoAviso) => {
    if (timer.current) clearTimeout(timer.current)
    setAviso({ id: Date.now(), texto, tom, acao })
    timer.current = setTimeout(() => setAviso(null), acao ? 5000 : 2800)
  }, [])

  return (
    <Contexto.Provider value={avisar}>
      {children}
      {aviso &&
        createPortal(
          <div
            key={aviso.id}
            role="status"
            className={`fixed left-1/2 bottom-24 z-50 animate-toast-entra flex items-center gap-2.5
                        rounded-full px-4 py-2.5 text-sm font-medium shadow-lg max-w-[90vw]
                        ${aviso.tom === 'ok'
                          ? 'bg-marinho text-bege dark:bg-bege dark:text-marinho'
                          : 'bg-red-800 text-white'}`}
          >
            {aviso.tom === 'ok' && <Icone nome="check" className="w-4 h-4 text-dourado shrink-0" traco={2.2} />}
            <span>{aviso.texto}</span>
            {aviso.acao && (
              <button
                onClick={() => { aviso.acao!.aoClicar(); setAviso(null) }}
                className="ml-1 -mr-1 rounded-full px-2.5 py-1 font-semibold text-dourado underline-offset-2 hover:underline dark:text-dourado-escuro"
              >
                {aviso.acao.rotulo}
              </button>
            )}
          </div>,
          document.body
        )}
    </Contexto.Provider>
  )
}

export function useAviso() {
  return useContext(Contexto)
}

/**
 * Apaga com "Desfazer": some da tela na hora e só apaga de verdade depois de
 * alguns segundos, se a pessoa não desfizer.
 */
export function apagarComDesfazer(opts: {
  avisar: (texto: string, tom?: Tom, acao?: AcaoAviso) => void
  texto: string
  esconder: () => void
  restaurar: () => void
  apagar: () => Promise<boolean>
}) {
  let desfeito = false
  opts.esconder()
  try { navigator.vibrate?.(10) } catch { /* ok */ }
  opts.avisar(opts.texto, 'ok', { rotulo: 'Desfazer', aoClicar: () => { desfeito = true; opts.restaurar() } })
  setTimeout(async () => {
    if (desfeito) return
    const ok = await opts.apagar()
    if (!ok) { opts.restaurar(); opts.avisar('Não foi possível apagar', 'erro') }
  }, 5200)
}
