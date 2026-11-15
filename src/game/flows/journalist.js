// ---------------------------------------------------------------------------
// Smile Life — Journaliste (avantage instantané) : voir toutes les mains
// Étape 'look' : le Journaliste regarde, puis ferme (CLOSE_INFO).
// Secret : seul le Journaliste reçoit les autres mains (data.hands dans sa
// vue), et seulement tant que ce cadre est ouvert.
// ---------------------------------------------------------------------------
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const journalist = {
  start: () => ({ flow: 'journalist', step: 'look', data: {} }),
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
    if (viewer == null || viewer !== state.current) return { flow: 'journalist', step: frame.step, data: {} }
    return { flow: 'journalist', step: frame.step, data: { hands: state.players.map((q, i) => (i === viewer ? null : copy(q.hand))) } }
  },
}

export default journalist
