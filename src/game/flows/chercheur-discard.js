// ---------------------------------------------------------------------------
// Smile Life — le Chercheur perd son métier : il défausse 1 carte en plus
// Posé par loseJob (primitives.js) quand un Chercheur qui a des cartes en main
// perd son métier (Licenciement, démission…), même pendant le tour d'un autre.
// Étape 'discard' : lui seul choisit la carte (CHERCHEUR_DISCARD ; uid null :
// au hasard, l'action par défaut). Ensuite le cadre en dessous reprend
// (resume) : le tour termine le jeu, ou finit le tour après une démission.
// data = { player }. Public (seul le Chercheur voit sa main, comme toujours).
// ---------------------------------------------------------------------------
import { move, log } from '../primitives.js'
import { pick } from '../rng.js'
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const chercheurDiscard = {
  start: (state, { player }) => ({ flow: 'chercheur-discard', step: 'discard', data: { player } }),
  actors: (state, frame) => [frame.data.player],
  legal: (state, frame) => [
    ...state.players[frame.data.player].hand.map((c) => ({ type: 'CHERCHEUR_DISCARD', uid: c.uid })),
    { type: 'CHERCHEUR_DISCARD', uid: null },
  ],
  apply(s, frame, action) {
    if (action.type !== 'CHERCHEUR_DISCARD') return false
    const { player } = frame.data
    const q = s.players[player]
    const card = action.uid == null ? pick(s, q.hand) : q.hand.find((c) => c.uid === action.uid)
    if (!card) return false
    move(s, card.uid, { hand: player }, 'discard', { by: player })
    log(s, `${q.name} (Chercheur) défausse 1 carte en plus`)
    endFlow(s)
    return true
  },
  resume() {},
  // délai dépassé : une carte au hasard
  fallback: () => ({ type: 'CHERCHEUR_DISCARD', uid: null }),
  view: (state, frame) => copy(frame),
}

export default chercheurDiscard
