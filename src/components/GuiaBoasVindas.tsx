import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icone, { type NomeIcone } from './Icone'

// Guia curto para quem entra pela primeira vez. Abre sozinho uma vez por
// pessoa neste aparelho e fica disponível no Perfil, em "Como usar o app".

const PASSOS: { icone: NomeIcone; titulo: string; texto: string }[] = [
  {
    icone: 'livro',
    titulo: 'Que bom ter você aqui',
    texto: 'Este é o espaço onde os Bereanos acompanham juntos a leitura do livro do ciclo. Não é competição: o que importa é continuar lendo, cada um no seu ritmo.'
  },
  {
    icone: 'mais',
    titulo: 'Registre o que leu',
    texto: 'Toque no botão do meio para lançar páginas ou minutos, inclusive de ontem. No Início há atalhos de +5, +10 e +20. Lançou errado? Dá para apagar e registrar de novo.'
  },
  {
    icone: 'relogio',
    titulo: 'Leia com foco',
    texto: 'A aba Foco marca o tempo de leitura com pausas para descansar. No fim, informe a página em que parou e o app calcula o resto.'
  },
  {
    icone: 'nota',
    titulo: 'Anote e examine',
    texto: 'Guarde trechos, reflexões e perguntas com a página. Elas são só suas até você pôr no mural do grupo. As perguntas ajudam a preparar o encontro.'
  },
  {
    icone: 'compartilhar',
    titulo: 'Compartilhe, se quiser',
    texto: 'Transforme uma frase ou o seu progresso em imagem para o Instagram ou o WhatsApp, com a legenda pronta.'
  },
  {
    icone: 'grupo',
    titulo: 'O que o grupo vê',
    texto: 'Os outros membros veem seu progresso no livro, quando você leu por último e as anotações que você puser no mural. Anotações privadas e sessões de foco ficam só com você.'
  }
]

export default function GuiaBoasVindas({ nome, onFechar }: { nome: string; onFechar: () => void }) {
  const [i, setI] = useState(0)
  const p = PASSOS[i]
  const ultimo = i === PASSOS.length - 1

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="guia-titulo">
      <div className="cartao w-full max-w-md p-6 animate-subir-suave">
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5" aria-hidden>
            {PASSOS.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-dourado' : 'w-1.5 bg-marinho/15 dark:bg-bege/20'}`} />
            ))}
          </div>
          <button onClick={onFechar} className="text-sm text-texto/55 dark:text-bege/55 p-1">Pular</button>
        </div>
        <span className="w-14 h-14 rounded-full bg-dourado/15 text-dourado-escuro dark:text-dourado flex items-center justify-center mt-6">
          <Icone nome={p.icone} className="w-7 h-7" />
        </span>
        <h2 id="guia-titulo" className="font-serif text-[26px] leading-tight text-marinho dark:text-bege mt-4">
          {i === 0 ? `${p.titulo}, ${nome}` : p.titulo}
        </h2>
        <p className="text-[16px] leading-relaxed text-texto/80 dark:text-bege/80 mt-3 min-h-[120px]">{p.texto}</p>
        <div className="flex gap-2 mt-6">
          {i > 0 && <button onClick={() => setI(i - 1)} className="botao-secundario">Voltar</button>}
          <button onClick={() => (ultimo ? onFechar() : setI(i + 1))} className="botao-primario">
            {ultimo ? 'Começar a ler' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
