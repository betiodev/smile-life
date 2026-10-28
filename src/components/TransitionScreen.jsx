import Card from './Card'
import { playerColor } from './theme'

// Passage de l'écran : tient sur un téléphone en paysage (390 px de haut ou moins)
export default function TransitionScreen({ state, dispatch }) {
  const p = state.players[state.current]
  const color = playerColor(p, state.current)
  const recent = state.log.slice(-3)
  return (
    <div className="h-dvh flex items-center justify-center p-3 overflow-hidden">
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-4 sm:p-6 w-full max-w-3xl max-h-full overflow-y-auto anim-slide-up text-gray-800 flex items-center gap-5">
        {/* la main reste cachée : dos de cartes */}
        <div className="hidden min-[560px]:flex flex-col items-center gap-3 shrink-0 w-[42%]">
          <div className="flex justify-center [&>.sl-card:not(:first-child)]:-ml-8 pt-2" title={`${p.hand.length} cartes en main`}>
            {p.hand.map((c, i) => (
              <Card key={c.uid} card={c} size="sm" faceDown style={{ rotate: `${(i - (p.hand.length - 1) / 2) * 6}deg` }} />
            ))}
          </div>
          {recent.length > 0 && (
            <div className="w-full bg-gray-50 rounded-xl px-3 py-2 text-left text-[11px] leading-snug text-gray-600 space-y-0.5">
              {recent.map((l) => (
                <div key={l.id} className="truncate">{l.text}</div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center">
          <div className="text-4xl mb-1">🙈</div>
          <h2 className="font-title text-2xl font-semibold leading-tight">
            Passe l’écran à <span style={{ color }}>{p.name}</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">Les autres joueurs ne regardent pas !</p>
          <button
            onClick={() => dispatch({ type: 'READY', by: state.current })}
            className="mt-4 w-full rounded-2xl text-white font-black text-lg py-3 shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
            style={{ background: color }}
          >
            ✋ Prêt, c’est moi {p.name} !
          </button>
        </div>
      </div>
    </div>
  )
}
