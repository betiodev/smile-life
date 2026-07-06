import { useState } from 'react'

export default function SetupScreen({ dispatch }) {
  const [names, setNames] = useState(['', ''])
  const [river, setRiver] = useState(false)

  const setName = (i, v) => setNames(names.map((n, j) => (j === i ? v : n)))
  const canStart = names.every((n) => n.trim().length > 0)

  const start = () => {
    if (!canStart) return
    dispatch({ type: 'START_GAME', names: names.map((n) => n.trim()), river })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 w-full max-w-md anim-slide-up">
        <h1 className="text-5xl font-black text-center bg-gradient-to-r from-pink-500 via-amber-500 to-teal-500 bg-clip-text text-transparent">
          Smile Life
        </h1>
        <p className="text-center text-gray-500 mt-2 mb-6">
          😄 Construisez la vie la plus heureuse... ou sabotez celle des autres !
        </p>

        <div className="space-y-3">
          {names.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={n}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={`Nom du joueur ${i + 1}`}
                maxLength={14}
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:border-pink-400 focus:outline-none font-semibold"
              />
              {names.length > 2 && (
                <button
                  onClick={() => setNames(names.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 font-black px-2"
                  title="Retirer ce joueur"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {names.length < 5 && (
          <button
            onClick={() => setNames([...names, ''])}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-300 py-2 text-gray-500 hover:border-pink-300 hover:text-pink-500 font-bold"
          >
            + Ajouter un joueur ({names.length}/5)
          </button>
        )}

        <label className="flex items-center gap-3 mt-5 cursor-pointer bg-teal-50 rounded-xl p-3 border-2 border-teal-100">
          <input type="checkbox" checked={river} onChange={(e) => setRiver(e.target.checked)} className="w-5 h-5 accent-teal-500" />
          <div>
            <div className="font-bold text-teal-800">🌊 Variante Rivière</div>
            <div className="text-xs text-teal-600">3 cartes face visible à côté de la pioche, prenables à la place de piocher</div>
          </div>
        </label>

        <button
          onClick={start}
          disabled={!canStart}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 text-white font-black text-xl py-3.5 shadow-lg hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          🎉 Lancer la partie !
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">2 à 5 joueurs · écran partagé · mains cachées</p>
      </div>
    </div>
  )
}
