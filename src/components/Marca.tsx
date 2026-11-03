import Logo from './Logo'

// Cabeçalho das telas de entrada: logo oficial completa (emblema + nome) e o
// nome do app. "Streak" é só o nome deste app pessoal, não do clube.

export default function Marca({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center">
        <Logo versao="vertical" className="h-36" />
      </div>
      <p className="mt-4 text-sm font-semibold tracking-[0.3em] text-dourado-escuro dark:text-dourado">STREAK</p>
      <div className="ornamento w-24 mx-auto mt-4" />
      {subtitulo && <p className="legenda mt-4">{subtitulo}</p>}
    </div>
  )
}
