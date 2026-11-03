// Logo oficial do Clube do Livro Bereanos, usada como arquivo, sem redesenho,
// recoloração ou distorção (regra fixa do clube). Só existem as versões preta
// e branca: a preta vai no fundo claro, a branca nos fundos escuro e azul.

export type VersaoLogo = 'simbolo' | 'horizontal' | 'vertical' | 'texto'

interface Props {
  versao: VersaoLogo
  className?: string // controle o tamanho por largura OU altura, nunca as duas
  sempre?: 'preto' | 'branco' // força uma cor (ex.: sobre o painel azul do Início)
}

export default function Logo({ versao, className = 'h-10', sempre }: Props) {
  const alt = 'Clube do Livro Bereanos'
  if (sempre) {
    return <img src={`/logo/${versao}-${sempre}.png`} alt={alt} className={`${className} w-auto object-contain`} draggable={false} />
  }
  return (
    <>
      <img src={`/logo/${versao}-preto.png`} alt={alt} className={`${className} w-auto object-contain dark:hidden`} draggable={false} />
      <img src={`/logo/${versao}-branco.png`} alt={alt} className={`${className} w-auto object-contain hidden dark:block`} draggable={false} />
    </>
  )
}
