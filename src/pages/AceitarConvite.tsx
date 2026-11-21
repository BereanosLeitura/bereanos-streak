import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { chamarConvite, limparTokenDaUrl } from '../lib/adminMembros'
import Logo from '../components/Logo'
import Icone from '../components/Icone'

// Página do convite: quem recebeu o link cria a própria senha e entra.
// Nada aqui depende de sessão; quem autoriza é o token, de uso único e com prazo.

type Estado =
  | { fase: 'checando' }
  | { fase: 'valido'; nome: string; email: string }
  | { fase: 'invalido'; motivo: string }

interface Props {
  token: string
  onEntrou: () => void
  onDesistir: () => void
}

export default function AceitarConvite({ token, onEntrou, onDesistir }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'checando' })
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
  const [vendo, setVendo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    chamarConvite<{ nome: string; email: string }>('convite_info', { token })
      .then((r) => setEstado({ fase: 'valido', nome: r.nome, email: r.email }))
      .catch((e) => setEstado({ fase: 'invalido', motivo: e instanceof Error ? e.message : 'Convite inválido' }))
  }, [token])

  const curta = senha.length > 0 && senha.length < 8
  const diferente = repetir.length > 0 && senha !== repetir
  const podeEnviar = senha.length >= 8 && senha === repetir && !enviando

  async function aceitar() {
    if (!podeEnviar || estado.fase !== 'valido') return
    setErro(null)
    setEnviando(true)
    try {
      await chamarConvite('aceitar', { token, senha })
      const { error } = await supabase.auth.signInWithPassword({ email: estado.email, password: senha })
      limparTokenDaUrl()
      if (error) {
        // conta criada, mas o login não foi: a pessoa entra pela tela normal
        setEstado({ fase: 'invalido', motivo: 'Sua conta foi criada. Entre com seu e-mail e a senha que você acabou de escolher.' })
        return
      }
      onEntrou()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível aceitar o convite')
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-bege dark:bg-noite">
      <div className="w-full max-w-sm">
        <Logo versao="vertical" className="h-24 mx-auto" />

        {estado.fase === 'checando' && (
          <p className="text-center text-sm text-texto/70 dark:text-bege/60 mt-8">Conferindo seu convite…</p>
        )}

        {estado.fase === 'invalido' && (
          <div className="cartao p-6 mt-8 text-center">
            <Icone nome="cadeado" className="w-8 h-8 text-dourado mx-auto" />
            <p className="text-[15px] text-texto dark:text-bege mt-3 leading-relaxed">{estado.motivo}</p>
            <button onClick={() => { limparTokenDaUrl(); onDesistir() }} className="botao-primario mt-5">
              Ir para a tela de entrada
            </button>
          </div>
        )}

        {estado.fase === 'valido' && (
          <>
            <p className="text-center text-[11px] tracking-[.22em] uppercase text-dourado-escuro dark:text-dourado font-semibold mt-7">Convite</p>
            <h1 className="font-serif text-[28px] leading-tight text-marinho dark:text-bege text-center mt-1">
              Boas-vindas, {estado.nome.split(/\s+/)[0]}
            </h1>
            <p className="text-sm text-texto/70 dark:text-bege/65 text-center mt-2 leading-relaxed">
              Este é o espaço onde os Bereanos acompanham juntos a leitura do livro do ciclo.
              Escolha uma senha para entrar.
            </p>

            <div className="cartao p-5 mt-6 space-y-4">
              <div>
                <label className="rotulo" htmlFor="convite-email">Seu e-mail</label>
                <input id="convite-email" value={estado.email} readOnly className="campo opacity-70" aria-describedby="convite-email-ajuda" />
                <p id="convite-email-ajuda" className="legenda mt-1">Foi o e-mail que o admin usou no convite.</p>
              </div>

              <div>
                <label className="rotulo" htmlFor="convite-senha">Crie sua senha</label>
                <div className="relative">
                  <input
                    id="convite-senha" type={vendo ? 'text' : 'password'} value={senha} autoComplete="new-password"
                    onChange={(e) => setSenha(e.target.value)} className="campo pr-12" placeholder="pelo menos 8 caracteres"
                    aria-invalid={curta || undefined}
                  />
                  <button type="button" onClick={() => setVendo((v) => !v)}
                    aria-label={vendo ? 'Esconder a senha' : 'Mostrar a senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-texto/55 dark:text-bege/55">
                    <Icone nome={vendo ? 'lua' : 'sol'} className="w-4 h-4" />
                  </button>
                </div>
                {curta && <p role="alert" className="text-xs text-red-700 dark:text-red-400 mt-1">Use pelo menos 8 caracteres.</p>}
              </div>

              <div>
                <label className="rotulo" htmlFor="convite-repetir">Repita a senha</label>
                <input
                  id="convite-repetir" type={vendo ? 'text' : 'password'} value={repetir} autoComplete="new-password"
                  onChange={(e) => setRepetir(e.target.value)} className="campo"
                  aria-invalid={diferente || undefined}
                  onKeyDown={(e) => { if (e.key === 'Enter' && podeEnviar) aceitar() }}
                />
                {diferente && <p role="alert" className="text-xs text-red-700 dark:text-red-400 mt-1">As duas senhas não são iguais.</p>}
              </div>

              {erro && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{erro}</p>}

              <button onClick={aceitar} disabled={!podeEnviar} className="botao-primario">
                {enviando ? 'Criando seu acesso…' : 'Criar meu acesso'}
              </button>
            </div>

            <p className="legenda text-center mt-4">
              Este link vale uma vez só e é seu. Não repasse para ninguém.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
