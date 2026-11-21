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

/**
 * Busca todas as linhas, de 1.000 em 1.000. O Supabase devolve no máximo 1.000
 * linhas por consulta; sem isto, a Memória do clube e o backup passariam a
 * contar menos do que existe, sem aviso, quando o histórico crescer.
 * `montar` precisa criar a consulta do zero a cada chamada e ter uma ordem fixa.
 */
export async function buscarTodas<T>(montar: () => any, passo = 1000): Promise<{ data: T[]; error: unknown }> {
  const todas: T[] = []
  for (let de = 0; ; de += passo) {
    const { data, error } = await montar().range(de, de + passo - 1)
    if (error) return { data: todas, error }
    todas.push(...((data ?? []) as T[]))
    if (!data || data.length < passo) return { data: todas, error: null }
  }
}
