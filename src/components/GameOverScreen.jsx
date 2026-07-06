import { computeScore, licorneBonus } from '../game/scoring'

const CONFETTI_COLORS = ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f87171']

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    left: `${(i * 137.5) % 100}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDuration: `${2.5 + (i % 10) * 0.35}s`,
    animationDelay: `${(i % 20) * 0.15}s`,
  }))
  return (
    <>
      {pieces.map((style, i) => (
        <div key={i} className="confetti" style={style} />
      ))}
    </>
  )
}

export default function GameOverScreen({ state, dispatch }) {
  const scores = state.players.map((p, i) => ({ p, i, ...computeScore(p) }))
  scores.sort((a, b) => b.total - a.total)
  const categories = Object.keys(scores[0].cat)
  const medals = ['🥇', '🥈', '🥉', '4e', '5e']

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Confetti />
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl anim-slide-up">
        <h1 className="text-4xl font-black text-center bg-gradient-to-r from-pink-500 to-amber-500 bg-clip-text text-transparent">
          🏁 Fin de partie !
        </h1>
        <p className="text-center text-2xl font-black text-gray-800 mt-3">
          🎉 {scores[0].p.name} gagne avec {scores[0].total} smiles !
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b-2 border-gray-200">
                <th className="py-2 pr-2">Catégorie</th>
                {scores.map((s) => (
                  <th key={s.i} className="py-2 px-2 text-center">
                    <div className="font-black">{medals[scores.indexOf(s)]} {s.p.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2 font-semibold text-gray-600">{c}</td>
                  {scores.map((s) => (
                    <td key={s.i} className="py-1.5 px-2 text-center font-bold">
                      {s.cat[c] || <span className="text-gray-300">–</span>}
                      {c === 'Acquisitions 🏠' && licorneBonus(s.p) && s.p.acquisitions.some((a) => a.key === 'licorne') && (
                        <span title="Licorne doublée !"> 🦄✨</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-amber-50">
                <td className="py-2 pr-2 font-black text-gray-800">TOTAL 😄</td>
                {scores.map((s) => (
                  <td key={s.i} className="py-2 px-2 text-center font-black text-lg text-amber-600">
                    {s.total}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <button
          onClick={() => dispatch({ type: 'RESTART' })}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 text-white font-black text-xl py-3.5 shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
        >
          🔄 Rejouer
        </button>
      </div>
    </div>
  )
}
