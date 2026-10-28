import { useReducer, useState, useEffect, useCallback, useMemo } from 'react'
import { gameReducer, initialState } from './game/reducer'
import { viewFor } from './game/view'
import SetupScreen from './components/SetupScreen'
import TransitionScreen, { HandoffScreen } from './components/TransitionScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'
import CardGallery from './components/CardGallery'
import { useChercheurDiscard, CHERCHEUR_TIMEOUT_MS } from './components/usePlayIntent'
import { Countdown } from './components/PlayChoices'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  // vue publique (spectateur) : ce que l'écran partagé peut savoir sans rien révéler
  const pub = useMemo(() => viewFor(state, null), [state])

  // Chercheur licencié pendant le tour d'un autre : sur l'écran partagé, on le
  // lui passe pour qu'il choisisse sa carte (vue du Chercheur), puis on le rend
  // au joueur dont c'est le tour. step : 'ask' → 'ready' → 'back'
  const [handoff, setHandoff] = useState(null) // { to, step }
  const pend = pub.pending
  const chercheur = state.screen === 'game' && pend?.type === 'chercheur-discard' && pend.player !== state.current ? pend.player : null
  const chercheurSince = useChercheurDiscard({ state: pub, dispatch })

  // Fin de tour : on garde la table affichée (du point de vue du joueur qui
  // vient de jouer) le temps que les animations se terminent, puis on passe
  // à l'écran de transition / de fin.
  const [seen, setSeen] = useState({ screen: state.screen, current: state.current })
  const [hold, setHold] = useState(null)
  if (seen.screen !== state.screen || seen.current !== state.current) {
    setSeen({ screen: state.screen, current: state.current })
    // pas d'animation vue du joueur précédent si le Chercheur tient encore l'écran
    if (seen.screen === 'game' && (state.screen === 'transition' || state.screen === 'gameover') && handoff?.step !== 'ready') {
      setHold({ viewer: seen.current })
    }
  }
  if (chercheur != null && handoff?.to !== chercheur) setHandoff({ to: chercheur, step: 'ask' })
  else if (chercheur == null && handoff && handoff.step !== 'back') {
    // choix fait : on rend l'écran (sauf si le tour est fini → écran de transition)
    setHandoff(handoff.step === 'ready' && state.screen === 'game' ? { to: state.current, step: 'back' } : null)
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
      {handoff && handoff.step !== 'ready' ? (
        <HandoffScreen
          player={pub.players[handoff.to]}
          index={handoff.to}
          note={handoff.step === 'ask'
            ? <>Fin du métier de Chercheur : 1 carte de ta main à défausser, au choix · <Countdown since={chercheurSince} total={CHERCHEUR_TIMEOUT_MS} /></>
            : 'À toi de reprendre ton tour.'}
          onReady={() => setHandoff(handoff.step === 'ask' ? { ...handoff, step: 'ready' } : null)}
        />
      ) : (
        <Screen state={state} dispatch={dispatch} hold={hold} release={release}
          viewerOverride={handoff?.step === 'ready' ? handoff.to : null} chercheurSince={chercheurSince} />
      )}
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
function Screen({ state, dispatch, hold, release, viewerOverride, chercheurSince }) {
  const held = hold && (state.screen === 'transition' || state.screen === 'gameover')
  // écran de transition / de fin : vue de spectateur (l'écran passe de main en main)
  // viewerOverride : le Chercheur tient l'écran le temps de son choix
  const viewer = viewerOverride ?? (held ? hold.viewer : state.screen === 'game' ? state.current : null)
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
      return <GameScreen state={view} dispatch={dispatch} viewer={viewer} chercheurSince={chercheurSince} />
    case 'gameover':
      return <GameOverScreen state={view} dispatch={dispatch} />
    default:
      return null
  }
}
