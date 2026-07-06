import { useReducer } from 'react'
import { gameReducer, initialState } from './game/reducer'
import SetupScreen from './components/SetupScreen'
import TransitionScreen from './components/TransitionScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

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
