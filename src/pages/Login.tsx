import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import PaginaCentralizada from '../components/PaginaCentralizada'
import Marca from '../components/Marca'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [esqueci, setEsqueci] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    setCarregando(false)
    if (error) {
      setErro('E-mail ou senha incorretos. Confira e tente de novo.')
      return
    }
    // App.tsx redireciona sozinho ao detectar sessão ativa (onAuthStateChange)
  }

  return (
    <PaginaCentralizada>
      <Marca subtitulo="Entre com o acesso enviado pelo admin" />

      <form onSubmit={entrar} className="cartao p-6 space-y-4">
        <div>
          <label className="rotulo" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="campo"
          />
        </div>

        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="campo"
          />
        </div>

        {erro && (
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}

        <button type="submit" disabled={carregando} className="botao-primario">
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="text-xs text-center text-texto/50 dark:text-bege/50 mt-5">
        Se você recebeu uma senha temporária, vai trocá-la no próximo passo.
      </p>
      <div className="text-center mt-2">
        <button type="button" onClick={() => setEsqueci((v) => !v)} className="botao-texto text-sm" aria-expanded={esqueci}>Esqueci minha senha</button>
      </div>
      {esqueci && (
        <div className="cartao p-4 mt-3 text-sm text-texto/80 dark:text-bege/80 animate-subir-suave">
          Sem problema. Avise o admin do clube: ele gera uma senha temporária nova pelo próprio app e te manda no privado.
          Ao entrar com ela, você cria uma senha sua de novo. Seus registros e anotações continuam todos aqui.
        </div>
      )}

      <figure className="mt-10 text-center">
        <blockquote className="font-serif italic text-[17px] leading-relaxed text-marinho/80 dark:text-bege/75">
          “Examinavam as Escrituras todos os dias, para ver se as coisas eram assim.”
        </blockquote>
        <figcaption className="text-xs text-dourado-escuro dark:text-dourado mt-2">Atos 17:11</figcaption>
      </figure>
    </PaginaCentralizada>
  )
}
