// ---------------------------------------------------------------------------
// Smile Life — Piston : poser un métier de sa main sans condition d'études
// Étape 'pick' (PISTON_PICK). Le métier pistonné déclenche son avantage
// instantané (Journaliste, Médium, Astronaute, Chef…) : ce flux-là se pose
// au-dessus de celui-ci, qui attend alors (étape 'done') qu'il finisse.
// Grand Prof exclu (promotion seulement) ; Bandit / Gourou bloqués par un
// Policier en poste. Public.
// ---------------------------------------------------------------------------
import { take, place, refill, log } from '../primitives.js'
import { hasJob, hasTag, isGrandProf } from '../rules.js'
import { jobOf } from '../state.js'
import { policeSweep, triggerJobApi } from '../effects.js'
import { finishFlow, resumeDone } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const pistonable = (state, card) =>
  card.type === 'job' && !isGrandProf(card) &&
  !(hasTag(card, 'outlaw') && state.players.some((q) => hasJob(q, 'policier')))

const piston = {
  start: () => ({ flow: 'piston', step: 'pick', data: {} }),
  actors: (state) => [state.current],
  legal(state, frame) {
    const p = state.players[state.current]
    if (frame.step !== 'pick' || jobOf(p)) return []
    return p.hand.filter((c) => pistonable(state, c)).map((c) => ({ type: 'PISTON_PICK', uid: c.uid }))
  },
  apply(s, frame, action) {
    if (action.type !== 'PISTON_PICK' || frame.step !== 'pick') return false
    const p = s.players[s.current]
    const card = p.hand.find((c) => c.uid === action.uid)
    if (!card || !pistonable(s, card) || jobOf(p)) return false
    take(s, { hand: s.current }, card.uid)
    place(s, s.current, card)
    if (card.key === 'bandit') p.wasBandit = true
    log(s, `🤝 Grâce au Piston, ${p.name} devient ${card.name} sans les études !`)
    // "repiochez pour avoir 5 cartes"
    refill(s, s.current)
    // le métier pistonné déclenche aussi son avantage instantané
    triggerJobApi(s, s.current, card)
    // Policier pistonné : purge les Bandits et Gourous
    if (card.key === 'policier') policeSweep(s, s.current)
    finishFlow(s, frame)
    return true
  },
  resume: resumeDone,
  // délai dépassé : le premier métier permis
  fallback: (state, frame) => piston.legal(state, frame)[0],
  view: (state, frame) => copy(frame),
}

export default piston
