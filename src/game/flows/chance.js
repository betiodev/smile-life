// ---------------------------------------------------------------------------
// Smile Life — Chance : garder 1 des 3 cartes piochées, défausser les autres
// Posé par la carte Chance (effects.js). Étape 'pick' : le joueur du tour
// garde une carte (CHANCE_PICK) ; elle rejoint sa main.
// data = { cards } : les 3 cartes, tenues à part par ce cadre.
// Secret : les 3 cartes ne sont vues que du joueur courant, les autres n'en
// connaissent que le nombre.
// ---------------------------------------------------------------------------
import { put, log } from '../primitives.js'
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const chance = {
  start: (state, { cards }) => ({ flow: 'chance', step: 'pick', data: { cards } }),
  actors: (state) => [state.current],
  legal: (state, frame) => (frame.data.cards ?? []).map((c) => ({ type: 'CHANCE_PICK', uid: c.uid })),
  apply(s, frame, action) {
    if (action.type !== 'CHANCE_PICK') return false
    const { cards } = frame.data
    const kept = cards.find((c) => c.uid === action.uid)
    if (!kept) return false
    for (const c of cards) if (c.uid !== kept.uid) put(s, c, 'discard', { by: s.current })
    // la carte gardée rejoint la main : le joueur joue ensuite ce qu'il veut
    put(s, kept, { hand: s.current })
    log(s, `🍀 ${s.players[s.current].name} garde une carte en main et défausse les deux autres`)
    endFlow(s)
    return true
  },
  resume() {},
  // délai dépassé : la première des trois cartes est gardée
  fallback: (state, frame) => chance.legal(state, frame)[0],
  view(state, frame, viewer) {
    if (viewer != null && viewer === state.current) return copy(frame)
    return { flow: 'chance', step: frame.step, data: { count: frame.data.cards.length } }
  },
  held: (state, frame) => frame.data.cards,
}

export default chance
