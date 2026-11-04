/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // paleta Bereanos (guia de estilo do clube)
        marinho: '#1B2A4A',
        dourado: '#B8912F',
        'dourado-escuro': '#8A6D2B',
        bege: '#F6F1E3',
        texto: '#222222',
        // tons de apoio só do app
        folha: '#FFFCF4', // cartão no modo claro
        // fundo e cartão dos modos escuro e azul: mudam por variável CSS
        noite: 'rgb(var(--c-noite) / <alpha-value>)',
        'noite-cartao': 'rgb(var(--c-noite-cartao) / <alpha-value>)'
      },
      fontFamily: {
        serif: ['"EB Garamond"', 'Garamond', '"Times New Roman"', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif']
      },
      keyframes: {
        'subir-suave': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fita-desce': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' }
        },
        'toast-entra': {
          '0%': { opacity: '0', transform: 'translate(-50%, 12px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' }
        },
        contagem: {
          '0%': { opacity: '0', transform: 'scale(1.6)' },
          '25%': { opacity: '1', transform: 'scale(1)' },
          '85%': { opacity: '1', transform: 'scale(.94)' },
          '100%': { opacity: '0', transform: 'scale(.85)' }
        },
        revelar: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(.96)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' }
        }
      },
      animation: {
        'subir-suave': 'subir-suave .35s ease-out both',
        'fita-desce': 'fita-desce 1.1s cubic-bezier(.2,.8,.2,1) both',
        'toast-entra': 'toast-entra .25s ease-out both',
        contagem: 'contagem 1s ease-out both',
        revelar: 'revelar .9s cubic-bezier(.2,.8,.2,1) both'
      }
    }
  },
  plugins: []
}
