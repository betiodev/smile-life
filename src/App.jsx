import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import { createHotseat } from './session/hotseat'
import SetupScreen from './components/SetupScreen'
import TransitionScreen, { HandoffScreen } from './components/TransitionScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'
import CardGallery from './components/CardGallery'
import { Countdown, deadlineOf } from './components/PlayChoices'

export default function App() {
  // partie en cours sur cet appareil (mode un seul téléphone) ; null : réglages
  const [game, setGame] = useState(null)
  // quitter : on arrête les minuteries de la partie
  const quit = useCallback(() => setGame((g) => { g?.destroy(); return null }), [])

  const start = useCallback(({ names, colors }) => {
    setGame(createHotseat({ seats: names.map((name, i) => ({ name, color: colors?.[i] ?? null, kind: 'human' })) }))
  }, [])

  if (window.location.hash === '#cartes') return <CardGallery />

  return (
    <>
      {game ? <Table game={game} onQuit={quit} /> : <SetupScreen onStart={start} />}
      {game && <RotateOverlay />}
    </>
  )
}

// L'interface ne lit que la vue d'un joueur (viewFor, via le pilote), jamais
// l'état complet ; les actions partent vers le pilote, qui signe `by`.
function Table({ game, onQuit }) {
  const version = useSyncExternalStore(game.subscribe, game.version)
  const screen = useMemo(() => game.screen(), [game, version])
  // passage d'écran et fin de partie : vue de spectateur (rien de caché)
  const viewer = screen.kind === 'linger' || screen.kind === 'play' ? screen.seat : null
  const view = useMemo(() => game.view(viewer), [game, version, viewer])

  const dispatch = useCallback((action) => {
    if (action.type === 'RESTART') onQuit()
    else game.dispatch(action)
  }, [game, onQuit])
  const settled = useCallback(() => game.settled(), [game])

  // fin de tour : filet de sécurité si les animations ne préviennent pas
  useEffect(() => {
    if (screen.kind !== 'linger') return
    const t = setTimeout(settled, 4000)
    return () => clearTimeout(t)
  }, [screen.kind, settled])

  switch (screen.kind) {
    case 'linger':
      return <GameScreen state={view} dispatch={dispatch} viewer={viewer} locked onSettled={settled} />
    case 'pass':
      if (screen.reason === 'turn') return <TransitionScreen state={view} onReady={game.ready} />
      return (
        <HandoffScreen
          player={view.players[screen.seat]}
          index={screen.seat}
          note={screen.reason === 'chercheur'
            ? <>Fin du métier de Chercheur : 1 carte de ta main à défausser, au choix · <Countdown until={deadlineOf(view, screen.seat)} /></>
            : 'À toi de reprendre ton tour.'}
          onReady={game.ready}
        />
      )
    case 'play':
      return <GameScreen state={view} dispatch={dispatch} viewer={viewer} />
    default:
      return <GameOverScreen state={view} dispatch={dispatch} />
  }
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
