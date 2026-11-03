import { useEffect, useState } from 'react'
import { contarPendentes, sincronizarTudo } from '../lib/sync'

// Faixa discreta no topo: avisa quando está sem internet ou quando há
// registros guardados no aparelho esperando para subir. Some sozinha.

export default function EstadoConexao() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendentes, setPendentes] = useState(0)

  useEffect(() => {
    let vivo = true
    const contar = () => contarPendentes().then((n) => vivo && setPendentes(n)).catch(() => {})
    const aoOnline = async () => {
      setOnline(true)
      await sincronizarTudo()
      contar()
    }
    const aoOffline = () => setOnline(false)
    window.addEventListener('online', aoOnline)
    window.addEventListener('offline', aoOffline)
    contar()
    const id = setInterval(contar, 15_000)
    return () => {
      vivo = false
      window.removeEventListener('online', aoOnline)
      window.removeEventListener('offline', aoOffline)
      clearInterval(id)
    }
  }, [])

  if (online && pendentes === 0) return null

  return (
    <div role="status" className="sticky top-0 z-40 flex justify-center px-4 pt-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-marinho text-bege dark:bg-bege dark:text-marinho px-4 py-1.5 text-xs font-semibold shadow-md">
        <span className={`w-2 h-2 rounded-full ${online ? 'bg-dourado animate-pulse' : 'bg-red-400'}`} />
        {!online
          ? `Sem internet. ${pendentes > 0 ? `${pendentes} ${pendentes === 1 ? 'registro guardado' : 'registros guardados'} no aparelho` : 'O que você registrar fica guardado no aparelho'}`
          : `Enviando ${pendentes} ${pendentes === 1 ? 'registro' : 'registros'}…`}
        {online && pendentes > 0 && (
          <button onClick={() => sincronizarTudo().then(() => contarPendentes().then(setPendentes))} className="underline underline-offset-2 ml-1">
            tentar agora
          </button>
        )}
      </div>
    </div>
  )
}
