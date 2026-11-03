import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icone from './Icone'

// Aviso curto no rodapé da tela, acima da navegação ("Leitura registrada", etc.).

type Tom = 'ok' | 'erro'
interface Aviso { id: number; texto: string; tom: Tom }

const Contexto = createContext<(texto: string, tom?: Tom) => void>(() => {})

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = useCallback((texto: string, tom: Tom = 'ok') => {
    if (timer.current) clearTimeout(timer.current)
    setAviso({ id: Date.now(), texto, tom })
    timer.current = setTimeout(() => setAviso(null), 2800)
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
          </div>,
          document.body
        )}
    </Contexto.Provider>
  )
}

export function useAviso() {
  return useContext(Contexto)
}
