import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Falha cedo e com mensagem clara em vez de um erro genérico de rede mais tarde.
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos no .env (veja .env.example).'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true, // mantém login entre sessões, inclusive offline
    autoRefreshToken: true
  }
})

export interface Perfil {
  id: string
  nome_completo: string
  nome_exibicao: string
  data_nascimento: string | null
  avatar_url: string | null
  role: 'admin' | 'membro'
  tema_preferido: 'claro' | 'escuro' | 'azul' | 'sistema'
  ritmo_leitura_min_por_pagina: number
  meta_diaria_paginas?: number
  senha_temporaria: boolean
  mostrar_contagem?: boolean | null
}

export async function buscarPerfilAtual(): Promise<Perfil | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Erro ao buscar perfil:', error.message)
    return null
  }
  return data as Perfil
}
