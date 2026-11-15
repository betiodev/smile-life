// ---------------------------------------------------------------------------
// Smile Life — Vengeance : renvoyer un de ses malus reçus à un adversaire
// Étape 'pick' (VENGEANCE_PICK : le malus et la cible). Un Licenciement
// renvoyé à un Chercheur pose sa défausse (chercheur-discard) au-dessus :
// ce flux attend alors (étape 'done') qu'elle finisse. Public.
// ---------------------------------------------------------------------------
import { remove, log } from '../primitives.js'
import { canTarget } from '../rules.js'
import { malusOf } from '../state.js'
import { applyMalus } from '../effects.js'
import { finishFlow, resumeDone } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))
const range = (n) => Array.from({ length: n }, (_, i) => i)

const vengeance = {
  start: () => ({ flow: 'vengeance', step: 'pick', data: {} }),
  actors: (state) => [state.current],
  legal(state, frame) {
    if (frame.step !== 'pick') return []
    const me = state.current
    return malusOf(state.players[me]).flatMap((m) =>
      range(state.players.length)
        .filter((i) => i !== me && canTarget(state, me, m, i).ok)
        .map((i) => ({ type: 'VENGEANCE_PICK', uid: m.uid, target: i })))
  },
  apply(s, frame, action) {
    if (action.type !== 'VENGEANCE_PICK' || frame.step !== 'pick') return false
    const p = s.players[s.current]
    const malus = malusOf(p).find((c) => c.uid === action.uid)
    if (!malus || !canTarget(s, s.current, malus, action.target).ok) return false
    remove(s, malus.uid, { cause: 'vengeance', by: s.current, to: 'aside' })
    log(s, `😈 ${p.name} se venge avec ${malus.name} !`)
    applyMalus(s, s.current, malus, action.target)
    finishFlow(s, frame)
    return true
  },
  resume: resumeDone,
  // délai dépassé : le premier malus renvoyable, sur la première cible permise
  fallback: (state, frame) => vengeance.legal(state, frame)[0],
  view: (state, frame) => copy(frame),
}

export default vengeance
