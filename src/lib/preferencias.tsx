import { createContext, useContext } from 'react'
import { supabase } from './supabase'

// "Leitura sem contagem": esconde sequência de dias e conquistas.
// Vale o padrão do clube (definido pelo admin), a menos que a pessoa escolha
// outra coisa no Perfil (perfis.mostrar_contagem: null = seguir o clube).

const CACHE_PADRAO = 'bereanos-streak-contagem-padrao'

export const ContagemContext = createContext(false)
export function useContagem() {
  return useContext(ContagemContext)
}

export function padraoClubeLocal(): boolean {
  try { return localStorage.getItem(CACHE_PADRAO) === '1' } catch { return false }
}

export async function buscarPadraoClube(): Promise<boolean> {
  const { data, error } = await supabase.from('config_clube').select('contagem_padrao').eq('id', 1).maybeSingle()
  if (error || !data) return padraoClubeLocal()
  try { localStorage.setItem(CACHE_PADRAO, data.contagem_padrao ? '1' : '0') } catch { /* ok */ }
  return !!data.contagem_padrao
}

// Tamanho da letra (preferência deste aparelho).
export type TamanhoLetra = 'normal' | 'grande' | 'maior'
const CHAVE_LETRA = 'bereanos-streak-tamanho-letra'
const ZOOM: Record<TamanhoLetra, string> = { normal: '1', grande: '1.12', maior: '1.25' }

export function tamanhoLetraSalvo(): TamanhoLetra {
  try {
    const v = localStorage.getItem(CHAVE_LETRA) as TamanhoLetra | null
    return v && v in ZOOM ? v : 'normal'
  } catch { return 'normal' }
}

export function aplicarTamanhoLetra(t: TamanhoLetra) {
  const raiz = document.getElementById('root')
  if (raiz) (raiz.style as CSSStyleDeclaration & { zoom: string }).zoom = ZOOM[t]
  try { localStorage.setItem(CHAVE_LETRA, t) } catch { /* ok */ }
}

// Fonte de leitura das anotações (preferência deste aparelho).
export type FonteNotas = 'padrao' | 'garamond' | 'lora' | 'sans'
const CHAVE_FONTE_NOTAS = 'bereanos-streak-fonte-notas'
export const FONTES_NOTAS: { id: FonteNotas; nome: string; css?: string }[] = [
  { id: 'padrao', nome: 'Padrão' },
  { id: 'garamond', nome: 'Garamond', css: '"EB Garamond", Garamond, serif' },
  { id: 'lora', nome: 'Lora', css: 'Lora, serif' },
  { id: 'sans', nome: 'Moderna', css: '"Source Sans 3", system-ui, sans-serif' }
]

export function fonteNotasSalva(): FonteNotas {
  try {
    const v = localStorage.getItem(CHAVE_FONTE_NOTAS) as FonteNotas | null
    return v && FONTES_NOTAS.some((f) => f.id === v) ? v : 'padrao'
  } catch { return 'padrao' }
}

export function aplicarFonteNotas(f: FonteNotas) {
  document.documentElement.dataset.fonteNotas = f
  if (f === 'lora' && !document.querySelector('link[data-fonte="lora"]')) {
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap'
    l.dataset.fonte = 'lora'
    document.head.appendChild(l)
  }
  try { localStorage.setItem(CHAVE_FONTE_NOTAS, f) } catch { /* ok */ }
}
