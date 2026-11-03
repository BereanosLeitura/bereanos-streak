import { useState } from 'react'

// Gera o que o admin precisa pra dar acesso a um membro novo: uma senha
// temporária e a mensagem pronta pro WhatsApp. Desde a migração 0003, criar
// o usuário no painel do Supabase (Authentication → Add user) já basta — a
// linha em "perfis" é criada sozinha, e o membro completa nome/data de
// nascimento no primeiro login. Antes disso era um INSERT manual por pessoa.
//
// Isso NUNCA cria o usuário de fato: criar login exige a service_role key,
// que por regra do projeto nunca fica no app. Por isso o passo de criar
// continua no painel do Supabase, feito por você.

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789' // sem 0/O/1/l/I

function gerarSenha(): string {
  const valores = crypto.getRandomValues(new Uint32Array(10))
  let senha = ''
  for (let i = 0; i < 10; i++) senha += ALFABETO[valores[i] % ALFABETO.length]
  return senha
}

interface Props {
  linkApp?: string
}

export default function CriarAcesso({ linkApp }: Props) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState(gerarSenha())
  const [copiado, setCopiado] = useState<string | null>(null)

  const mensagem = montarMensagem(nome, email, senha, linkApp)

  async function copiar(texto: string, chave: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(chave)
      setTimeout(() => setCopiado(null), 1800)
    } catch {
      // alguns navegadores bloqueiam sem interação direta — o texto já está selecionável na tela
    }
  }

  return (
    <div className="px-5 py-6">
      <div className="max-w-sm mx-auto space-y-5">

        <div className="cartao p-5 space-y-4">
          <div>
            <label className="rotulo">Nome do membro</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="campo" placeholder="ex: Esaú" />
          </div>
          <div>
            <label className="rotulo">E-mail que ele vai usar</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="campo"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="rotulo mb-0">Senha temporária gerada</label>
              <button
                onClick={() => setSenha(gerarSenha())}
                className="text-xs text-dourado-escuro dark:text-dourado underline underline-offset-2"
              >
                gerar outra
              </button>
            </div>
            <p className="campo font-sans tabular font-semibold text-lg tracking-[0.15em] text-center select-all">{senha}</p>
          </div>
        </div>

        <ol className="cartao p-5 space-y-3 text-sm text-texto/75 dark:text-bege/75 list-decimal list-inside">
          <li>
            Abra o painel do Supabase, em Authentication → Users → Add user, e cadastre esse e-mail com essa senha
            (marque "Auto Confirm User").
          </li>
          <li>Isso já cria o acesso dele sozinho — não precisa mexer em SQL.</li>
          <li>Copie a mensagem abaixo e mande pelo WhatsApp.</li>
        </ol>

        <div className="cartao p-5 space-y-3">
          <p className="rotulo mb-0">Mensagem pronta pro WhatsApp</p>
          <p className="text-sm whitespace-pre-wrap text-texto dark:text-bege bg-marinho/[0.03] dark:bg-bege/[0.04] rounded-lg p-3 select-all">
            {mensagem}
          </p>
          <button onClick={() => copiar(mensagem, 'mensagem')} className="botao-secundario">
            {copiado === 'mensagem' ? 'Copiado ✓' : 'Copiar mensagem'}
          </button>
        </div>
      </div>
    </div>
  )
}

function montarMensagem(nome: string, email: string, senha: string, linkApp?: string): string {
  const nomePart = nome.trim() ? nome.trim() : 'você'
  const linkLinha = linkApp
    ? `Entre em ${linkApp}`
    : 'Entre no link do Bereanos | Streak (vou te mandar separado)'
  return (
    `Oi, ${nomePart}! Seu acesso ao Bereanos | Streak tá pronto.\n\n` +
    `${linkLinha}\n` +
    `E-mail: ${email || '(preencha o e-mail)'}\n` +
    `Senha temporária: ${senha}\n\n` +
    `No primeiro login, troca a senha e completa seu nome e data de nascimento. Qualquer coisa me chama.`
  )
}
