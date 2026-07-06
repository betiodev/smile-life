export default function TransitionScreen({ state, dispatch }) {
  const p = state.players[state.current]
  const recent = state.log.slice(-4)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-10 w-full max-w-md text-center anim-slide-up">
        <div className="text-6xl mb-4">🙈</div>
        <h2 className="text-2xl font-black text-gray-800">
          Passez l’écran à <span className="text-pink-500">{p.name}</span>
        </h2>
        <p className="text-gray-500 mt-2">Les autres joueurs ne regardent pas !</p>

        {recent.length > 0 && (
          <div className="mt-5 bg-gray-50 rounded-xl p-3 text-left text-xs text-gray-600 space-y-1">
            {recent.map((l) => (
              <div key={l.id}>{l.text}</div>
            ))}
          </div>
        )}

        <button
          onClick={() => dispatch({ type: 'READY' })}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-teal-500 to-blue-500 text-white font-black text-xl py-4 shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
        >
          ✋ Prêt, c’est moi {p.name} !
        </button>
      </div>
    </div>
  )
}
