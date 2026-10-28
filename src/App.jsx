import { useReducer, useState, useEffect, useCallback, useMemo } from 'react'
import { gameReducer, initialState } from './game/reducer'
import { viewFor } from './game/view'
import SetupScreen from './components/SetupScreen'
import TransitionScreen from './components/TransitionScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'
import CardGallery from './components/CardGallery'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Fin de tour : on garde la table affichée (du point de vue du joueur qui
  // vient de jouer) le temps que les animations se terminent, puis on passe
  // à l'écran de transition / de fin.
  const [seen, setSeen] = useState({ screen: state.screen, current: state.current })
  const [hold, setHold] = useState(null)
  if (seen.screen !== state.screen || seen.current !== state.current) {
    setSeen({ screen: state.screen, current: state.current })
    if (seen.screen === 'game' && (state.screen === 'transition' || state.screen === 'gameover')) {
      setHold({ viewer: seen.current })
    }
  }
  const release = useCallback(() => setHold(null), [])
  useEffect(() => {
    if (!hold) return
    const t = setTimeout(release, 4000) // filet de sécurité
    return () => clearTimeout(t)
  }, [hold, release])

  if (window.location.hash === '#cartes') return <CardGallery />

  return (
    <>
      <Screen state={state} dispatch={dispatch} hold={hold} release={release} />
      {state.screen !== 'setup' && <RotateOverlay />}
    </>
  )
}

// téléphone tenu en portrait : le jeu se joue en paysage
function RotateOverlay() {
  return (
    <div className="rotate-overlay" role="alert">
      <svg viewBox="0 0 64 64" className="w-20 h-20" fill="none" stroke="#FFC93C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="22" y="8" width="20" height="34" rx="4" />
        <path d="M30 37h4" />
        <path d="M10 46a22 22 0 0 0 28 12" />
        <path d="M33 53l5 5-6 3" />
      </svg>
      Tourne ton téléphone
    </div>
  )
}

// L'interface ne lit que la vue d'un joueur (viewFor), jamais l'état complet ;
// les actions, elles, partent vers le reducer complet.
function Screen({ state, dispatch, hold, release }) {
  const held = hold && (state.screen === 'transition' || state.screen === 'gameover')
  // écran de transition / de fin : vue de spectateur (l'écran passe de main en main)
  const viewer = held ? hold.viewer : state.screen === 'game' ? state.current : null
  const view = useMemo(() => viewFor(state, viewer), [state, viewer])

  if (held) {
    return <GameScreen state={view} dispatch={dispatch} viewer={viewer} locked onSettled={release} />
  }

  switch (state.screen) {
    case 'setup':
      return <SetupScreen dispatch={dispatch} />
    case 'transition':
      return <TransitionScreen state={view} dispatch={dispatch} />
    case 'game':
      return <GameScreen state={view} dispatch={dispatch} viewer={viewer} />
    case 'gameover':
      return <GameOverScreen state={view} dispatch={dispatch} />
    default:
      return null
  }
}
