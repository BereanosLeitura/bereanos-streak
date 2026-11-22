import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErroAmigavel from './components/ErroAmigavel'
import './styles/index.css'

// Guarda o convite de instalação do navegador (Android/Chrome) para o botão
// "Instalar no celular" usar quando a pessoa quiser.
// Versão nova publicada: o service worker novo assume, mas a tela aberta
// continua com o código antigo até recarregar. Avisa o App para oferecer a
// atualização (só quando já havia uma versão rodando, não na primeira visita).
if ('serviceWorker' in navigator) {
  const tinhaVersao = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (tinhaVersao) window.dispatchEvent(new Event('app-versao-nova'))
  })
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as any).__conviteInstalar = e
  window.dispatchEvent(new Event('convite-instalar'))
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErroAmigavel>
      <App />
    </ErroAmigavel>
  </React.StrictMode>
)
