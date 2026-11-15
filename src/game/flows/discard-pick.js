// ---------------------------------------------------------------------------
// Smile Life — Étoile filante / Astronaute : prendre une carte de la défausse
// Étape 'pick' : le joueur du tour choisit une carte jouable de la défausse
// (DISCARD_PICK) ; elle devient la carte forcée du tour, en plus du jeu.
// data = { source } : 'Étoile filante' | 'Astronaute'. Public.
// ---------------------------------------------------------------------------
import { take, log } from '../primitives.js'
import { isPlayableFromDiscard } from '../rules.js'
import { setForced } from './turn.js'
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const discardPick = {
  start: (state, { source }) => ({ flow: 'discard-pick', step: 'pick', data: { source } }),
  actors: (state) => [state.current],
  legal: (state) => state.discard
    .filter((e) => isPlayableFromDiscard(state, state.current, e.card))
    .map((e) => ({ type: 'DISCARD_PICK', uid: e.card.uid })),
  apply(s, frame, action) {
    if (action.type !== 'DISCARD_PICK') return false
    const entry = s.discard.find((e) => e.card.uid === action.uid)
    if (!entry || !isPlayableFromDiscard(s, s.current, entry.card)) return false
    const card = take(s, 'discard', action.uid)
    setForced(s, card, false)
    log(s, `${s.players[s.current].name} récupère ${card.name} dans la défausse`)
    endFlow(s)
    return true
  },
  resume() {},
  // délai dépassé : la première carte jouable
  fallback: (state, frame) => discardPick.legal(state, frame)[0],
  view: (state, frame) => copy(frame),
}

export default discardPick
