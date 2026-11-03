// Ícones em traço fino, desenhados à mão em SVG (sem dependência nova).
// Todos usam currentColor, então herdam a cor do texto ao redor.

export type NomeIcone =
  | 'casa' | 'relogio' | 'pena' | 'alvo' | 'nota' | 'pessoa' | 'engrenagem'
  | 'chama' | 'calendario' | 'livro' | 'mais' | 'lixeira' | 'compartilhar'
  | 'sair' | 'sol' | 'lua' | 'meia-lua' | 'check' | 'cadeado' | 'aspas'
  | 'interrogacao' | 'lampada' | 'seta-esquerda' | 'bolo' | 'grupo' | 'som' | 'pausa'
  | 'gota' | 'imagem' | 'baixar' | 'copiar' | 'whatsapp' | 'estante' | 'seta-direita' | 'camera' | 'x'

const CAMINHOS: Record<NomeIcone, JSX.Element> = {
  casa: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  relogio: (<><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 1.8M9.5 3h5M12 3v2.5" /></>),
  pena: (<><path d="M19.5 4.5c-6 .5-10.5 5-11.5 12l-1.5 3" /><path d="M8.5 15.5c3.5 0 7-1.5 9-5M11 11.5h4.5" /></>),
  alvo: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>),
  nota: (<><path d="M6 3.5h9l3.5 3.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" /><path d="M14.5 3.5V7.5h4M8.5 11.5h7M8.5 15h7M8.5 18h4" /></>),
  pessoa: (<><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>),
  engrenagem: (<><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></>),
  chama: <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.3 2.4-5.2 3.6-7.9.4 1.6 1.2 2.6 2.2 3.2.2-2.8 1.4-5.2 3.6-7.2-.3 3.2 2.6 5.5 2.6 9.5 0 3.7-2.6 8-6 8z" />,
  calendario: (<><rect x="4" y="5.5" width="16" height="14.5" rx="1.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>),
  livro: (<><path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2z" /><path d="M12 6.5v14" /></>),
  mais: <path d="M12 5v14M5 12h14" />,
  lixeira: (<><path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5a1 1 0 0 0 1 .9h6.4a1 1 0 0 0 1-.9L17 7" /></>),
  compartilhar: (<><path d="M12 15V4M8 7.5 12 3.5l4 4" /><path d="M7 11H5.5v9h13v-9H17" /></>),
  sair: (<><path d="M14 4.5H6v15h8" /><path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" /></>),
  sol: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>),
  lua: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  'meia-lua': (<><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></>),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  cadeado: (<><rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>),
  aspas: <path d="M10 7.5c-2.5.8-4 2.8-4 5.5v3.5h4v-4H8c0-1.6.8-2.6 2-3.2zM18 7.5c-2.5.8-4 2.8-4 5.5v3.5h4v-4h-2c0-1.6.8-2.6 2-3.2z" />,
  interrogacao: (<><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7M12 16.8v.2" /></>),
  lampada: (<><path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3v1.8h5.8v-1.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3.5z" /></>),
  'seta-esquerda': <path d="M19 12H5M11 6l-6 6 6 6" />,
  bolo: (<><path d="M4.5 20.5h15v-7a1.5 1.5 0 0 0-1.5-1.5H6a1.5 1.5 0 0 0-1.5 1.5zM4.5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M12 12V8.5" /><path d="M12 4c.8.9 1.2 1.6 1.2 2.2a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.3 1.2-2.2z" /></>),
  grupo: (<><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7" /><path d="M15.5 6.3a3 3 0 0 1 0 5.4M17 14.6c1.8.6 3 2.1 3.5 4.4" /></>),
  som: (<><path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>),
  pausa: <path d="M9 5.5v13M15 5.5v13" />,
  gota: <path d="M12 3.5c3.2 4 5.5 7.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 2.3-6.2 5.5-10.2z" />,
  imagem: (<><rect x="3.5" y="5" width="17" height="14" rx="1.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4" /></>),
  baixar: (<><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></>),
  copiar: (<><rect x="8.5" y="8.5" width="11" height="11" rx="1.5" /><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" /></>),
  whatsapp: (<><path d="M4.5 19.5l1.2-3.6A7.8 7.8 0 1 1 8.4 18.4z" /><path d="M9.3 8.8c.2-.4.6-.4.8 0l.6 1.4c.1.2 0 .5-.2.7l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.5-.3.7-.2l1.4.6c.4.2.4.6 0 .8-.6.5-1.4.8-2.2.5a7 7 0 0 1-3.9-3.9c-.3-.8 0-1.6.5-2.2z" /></>),
  estante: (<><path d="M4 20.5h16M5.5 20.5v-14h3v14M8.5 20.5v-11h3v11M13 20.5l1.8-12.5 3 .4-1.8 12.1" /></>),
  'seta-direita': <path d="M5 12h14M13 6l6 6-6 6" />,
  camera: (<><path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="12.8" r="3.3" /></>),
  x: <path d="M6 6l12 12M18 6 6 18" />
}

interface Props {
  nome: NomeIcone
  className?: string
  traco?: number
}

export default function Icone({ nome, className = 'w-5 h-5', traco = 1.6 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {CAMINHOS[nome]}
    </svg>
  )
}
