// ---------------------------------------------------------------------------
// Smile Life — Troc : échanger une carte au hasard avec un adversaire
// Étape 'target' : le joueur du tour choisit l'adversaire (TROC_PICK). Public.
// ---------------------------------------------------------------------------
import { move, log } from '../primitives.js'
import { pick } from '../rng.js'
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))
const range = (n) => Array.from({ length: n }, (_, i) => i)

// adversaires qui ont au moins une carte en main
export const opponentsWithCards = (state) =>
  range(state.players.length).filter((i) => i !== state.current && state.players[i].hand.length > 0)

const troc = {
  start: () => ({ flow: 'troc', step: 'target', data: {} }),
  actors: (state) => [state.current],
  legal: (state) => opponentsWithCards(state).map((i) => ({ type: 'TROC_PICK', target: i })),
  apply(s, frame, action) {
    if (action.type !== 'TROC_PICK') return false
    const p = s.players[s.current]
    const t = s.players[action.target]
    if (!t || action.target === s.current || t.hand.length === 0) return false
    const mine = pick(s, p.hand)
    const theirs = pick(s, t.hand)
    if (mine) move(s, mine.uid, { hand: s.current }, { hand: action.target })
    if (theirs) move(s, theirs.uid, { hand: action.target }, { hand: s.current })
    log(s, `🔄 ${p.name} troque une carte au hasard avec ${t.name}`)
    endFlow(s)
    return true
  },
  resume() {},
  // délai dépassé : le premier adversaire possible
  fallback: (state, frame) => troc.legal(state, frame)[0],
  view: (state, frame) => copy(frame),
}

export default troc
