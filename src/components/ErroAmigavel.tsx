import { Component, type ErrorInfo, type ReactNode } from 'react'

// Se alguma tela quebrar, mostra uma saída clara em vez de uma página em branco.
// Os registros de leitura ficam salvos no aparelho e não se perdem.

interface Estado { erro: Error | null }

export default class ErroAmigavel extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro na tela:', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <img src="/logo/simbolo-preto.png" alt="" className="h-20 w-auto dark:hidden" />
        <img src="/logo/simbolo-branco.png" alt="" className="h-20 w-auto hidden dark:block" />
        <h1 className="font-serif text-2xl text-marinho dark:text-bege mt-5">Algo saiu do lugar</h1>
        <p className="legenda mt-2 max-w-xs">
          Seus registros continuam guardados no aparelho. Recarregue o app para continuar.
        </p>
        <button onClick={() => location.reload()} className="botao-primario mt-6 max-w-[220px]">Recarregar</button>
        <p className="text-xs text-texto/40 dark:text-bege/40 mt-6 max-w-xs break-words">{this.state.erro.message}</p>
      </div>
    )
  }
}
