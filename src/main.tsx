import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErroAmigavel from './components/ErroAmigavel'
import './styles/index.css'

// Guarda o convite de instalação do navegador (Android/Chrome) para o botão
// "Instalar no celular" usar quando a pessoa quiser.
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
