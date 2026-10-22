import { useReducer, useState, useEffect, useCallback } from 'react'
import { gameReducer, initialState } from './game/reducer'
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

  if (hold && (state.screen === 'transition' || state.screen === 'gameover')) {
    return <GameScreen state={state} dispatch={dispatch} viewer={hold.viewer} locked onSettled={release} />
  }

  switch (state.screen) {
    case 'setup':
      return <SetupScreen dispatch={dispatch} />
    case 'transition':
      return <TransitionScreen state={state} dispatch={dispatch} />
    case 'game':
      return <GameScreen state={state} dispatch={dispatch} />
    case 'gameover':
      return <GameOverScreen state={state} dispatch={dispatch} />
    default:
      return null
  }
}
