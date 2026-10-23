import { useState } from 'react'
import { PLAYER_COLORS, enterLandscapeFullscreen } from './theme'

const MAX_PLAYERS = 4

export default function SetupScreen({ dispatch }) {
  const [players, setPlayers] = useState([
    { name: '', color: PLAYER_COLORS[0].hex },
    { name: '', color: PLAYER_COLORS[1].hex },
  ])
  const [river, setRiver] = useState(false)

  const setName = (i, v) => setPlayers(players.map((p, j) => (j === i ? { ...p, name: v } : p)))
  // une couleur par joueur : choisir celle d'un autre joueur les échange
  const setColor = (i, hex) => {
    const old = players[i].color
    setPlayers(players.map((p, j) => (j === i ? { ...p, color: hex } : p.color === hex ? { ...p, color: old } : p)))
  }
  const addPlayer = () => {
    const free = PLAYER_COLORS.find((c) => !players.some((p) => p.color === c.hex))
    setPlayers([...players, { name: '', color: free.hex }])
  }
  const canStart = players.every((p) => p.name.trim().length > 0)

  const start = () => {
    if (!canStart) return
    enterLandscapeFullscreen()
    dispatch({ type: 'START_GAME', names: players.map((p) => p.name.trim()), colors: players.map((p) => p.color), river })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 w-full max-w-md anim-slide-up text-gray-800">
        <h1 className="font-title text-5xl font-semibold text-center bg-gradient-to-r from-pink-500 via-amber-500 to-teal-500 bg-clip-text text-transparent">
          Smile Life
        </h1>
        <p className="text-center text-gray-500 mt-2 mb-6">
          😄 Construisez la vie la plus heureuse... ou sabotez celle des autres !
        </p>

        <div className="space-y-3">
          {players.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="w-3 h-10 rounded-full shrink-0" style={{ background: p.color }} />
              <input
                value={p.name}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={`Nom du joueur ${i + 1}`}
                maxLength={14}
                className="flex-1 min-w-0 rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:border-pink-400 focus:outline-none font-semibold"
              />
              <div className="flex gap-1" role="radiogroup" aria-label={`Couleur du joueur ${i + 1}`}>
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={p.color === c.hex}
                    title={c.label}
                    onClick={() => setColor(i, c.hex)}
                    className={`w-6 h-6 rounded-full transition-transform ${p.color === c.hex ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
              {players.length > 2 && (
                <button
                  onClick={() => setPlayers(players.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 font-black px-1"
                  title="Retirer ce joueur"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {players.length < MAX_PLAYERS && (
          <button
            onClick={addPlayer}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-300 py-2 text-gray-500 hover:border-pink-300 hover:text-pink-500 font-bold"
          >
            + Ajouter un joueur ({players.length}/{MAX_PLAYERS})
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
        <p className="text-center text-xs text-gray-400 mt-3">2 à {MAX_PLAYERS} joueurs · écran partagé · mains cachées</p>
      </div>
    </div>
  )
}
