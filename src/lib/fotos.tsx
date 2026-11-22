import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

// Fotos de perfil do clube, carregadas uma vez (o clube é pequeno). Assim o
// Avatar mostra a foto em qualquer tela sem cada tela buscar de novo.

interface Fotos {
  porId: Map<string, string>
  porNome: Map<string, string>
  recarregar: () => void
}
const FotosContext = createContext<Fotos>({ porId: new Map(), porNome: new Map(), recarregar: () => {} })

export function ProvedorFotos({ children }: { children: ReactNode }) {
  const [mapas, setMapas] = useState<{ porId: Map<string, string>; porNome: Map<string, string> }>({ porId: new Map(), porNome: new Map() })
  const recarregar = useCallback(() => {
    supabase.from('perfis').select('id, nome_exibicao, avatar_url').not('avatar_url', 'is', null)
      .then(({ data }) => {
        const porId = new Map<string, string>()
        const porNome = new Map<string, string>()
        for (const p of (data ?? []) as { id: string; nome_exibicao: string; avatar_url: string }[]) {
          porId.set(p.id, p.avatar_url)
          porNome.set(p.nome_exibicao, p.avatar_url)
        }
        setMapas({ porId, porNome })
      })
  }, [])
  useEffect(() => {
    recarregar()
    // depois de entrar na conta as fotos ficam visíveis (RLS): carrega de novo
    const { data } = supabase.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_IN') recarregar() })
    return () => data.subscription.unsubscribe()
  }, [recarregar])
  return <FotosContext.Provider value={{ ...mapas, recarregar }}>{children}</FotosContext.Provider>
}

export function useFotos() {
  return useContext(FotosContext)
}

/**
 * Recorta a foto no centro, em quadrado de 320 px, e devolve um JPEG leve.
 * Foto de celular tem vários MB; a do perfil só precisa de alguns KB.
 */
export async function prepararFoto(arquivo: File): Promise<Blob> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => erro(new Error('Não deu para abrir essa imagem'))
      i.src = url
    })
    const lado = Math.min(img.naturalWidth, img.naturalHeight)
    const c = document.createElement('canvas')
    c.width = c.height = 320
    c.getContext('2d')!.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 320, 320)
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.86))
    if (!blob) throw new Error('Não deu para preparar a foto')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
