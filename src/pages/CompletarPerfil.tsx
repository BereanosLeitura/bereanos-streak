import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import PaginaCentralizada from '../components/PaginaCentralizada'
import Marca from '../components/Marca'

// Tela do primeiro acesso: troca a senha temporária e preenche o perfil.
// Só é mostrada quando perfis.senha_temporaria = true (ver App.tsx).

interface Props {
  userId: string
  onConcluido: () => void
}

export default function CompletarPerfil({ userId, onConcluido }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [nomeExibicao, setNomeExibicao] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  // já preenche com o que existe (nome dado pelo admin, ou dados de antes de uma senha nova)
  useEffect(() => {
    supabase.from('perfis').select('nome_completo, nome_exibicao, data_nascimento').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        if (data.nome_completo && data.nome_completo.includes(' ')) setNomeCompleto((v) => v || data.nome_completo)
        if (data.nome_exibicao && !data.nome_exibicao.includes('@')) setNomeExibicao((v) => v || data.nome_exibicao)
        if (data.data_nascimento) setDataNascimento((v) => v || data.data_nascimento)
      })
  }, [userId])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (novaSenha.length < 8) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }

    setCarregando(true)

    const { error: erroSenha } = await supabase.auth.updateUser({ password: novaSenha })
    if (erroSenha) {
      setCarregando(false)
      setErro('Não foi possível trocar a senha: ' + erroSenha.message)
      return
    }

    const { error: erroPerfil } = await supabase
      .from('perfis')
      .update({
        nome_completo: nomeCompleto,
        nome_exibicao: nomeExibicao,
        data_nascimento: dataNascimento || null,
        senha_temporaria: false
      })
      .eq('id', userId)

    setCarregando(false)

    if (erroPerfil) {
      setErro('Não foi possível salvar o perfil: ' + erroPerfil.message)
      return
    }

    onConcluido()
  }

  return (
    <PaginaCentralizada>
      <Marca subtitulo="Primeiro acesso: complete seus dados" />

      <form onSubmit={salvar} className="cartao p-6 space-y-4">
        <div>
          <label className="rotulo">Nome completo</label>
          <input
            required
            autoFocus
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            className="campo"
          />
        </div>

        <div>
          <label className="rotulo">Nome que aparece para o grupo</label>
          <input
            required
            value={nomeExibicao}
            onChange={(e) => setNomeExibicao(e.target.value)}
            placeholder="ex: Felipe M."
            className="campo"
          />
        </div>

        <div>
          <label className="rotulo">Data de nascimento</label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="campo"
          />
          <p className="text-xs text-texto/50 dark:text-bege/50 mt-1.5">
            Usado só para um destaque discreto de aniversário dentro do app.
          </p>
        </div>

        <div className="pt-3 border-t border-dourado/15">
          <label className="rotulo">Nova senha (substitui a temporária)</label>
          <input
            type="password"
            required
            minLength={8}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="campo"
          />
        </div>

        {erro && (
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}

        <button type="submit" disabled={carregando} className="botao-primario">
          {carregando ? 'Salvando…' : 'Concluir e entrar'}
        </button>
      </form>
    </PaginaCentralizada>
  )
}
