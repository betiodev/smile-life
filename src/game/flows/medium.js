// ---------------------------------------------------------------------------
// Smile Life — Médium (avantage instantané) : voir les 13 prochaines cartes
// Étape 'look' : le Médium regarde, puis ferme (CLOSE_INFO).
// data = { cards } : copie des 13 cartes du dessus de la pioche (elles restent
// dans la pioche). Secret : seul le Médium les voit, tant que le cadre est ouvert.
// ---------------------------------------------------------------------------
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const medium = {
  start: (state) => ({ flow: 'medium', step: 'look', data: { cards: state.deck.slice(-13).reverse() } }),
  actors: (state) => [state.current],
  legal: () => [{ type: 'CLOSE_INFO' }],
  apply(s, frame, action) {
    if (action.type !== 'CLOSE_INFO') return false
    endFlow(s)
    return true
  },
  resume() {},
  fallback: () => ({ type: 'CLOSE_INFO' }),
  view(state, frame, viewer) {
    if (viewer != null && viewer === state.current) return copy(frame)
    return { flow: 'medium', step: frame.step, data: {} }
  },
}

export default medium
