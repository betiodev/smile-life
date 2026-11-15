// ---------------------------------------------------------------------------
// Smile Life — Piston : poser un métier de sa main sans condition d'études
// Étape 'pick' (PISTON_PICK). Le métier pistonné déclenche son avantage
// instantané (Journaliste, Médium, Astronaute, Chef…) : ce flux-là se pose
// au-dessus de celui-ci, qui attend alors (étape 'done') qu'il finisse.
// Grand Prof exclu (promotion seulement) ; Bandit / Gourou bloqués par un
// Policier en poste. Public.
// La carte Piston passe sous le métier obtenu (meta.on) : tout le monde voit
// pourquoi ce joueur a ce métier sans les études. Quand il perd ce métier
// (licenciement, démission…), le Piston rejoint les cartes spéciales utilisées.
// data = { pistonUid } : la carte Piston jouée (déjà posée).
// ---------------------------------------------------------------------------
import { take, place, refill, attach, log } from '../primitives.js'
import { pistonable } from '../rules.js'
import { jobOf } from '../state.js'
import { runOnPlace } from '../effects.js'
import { finishFlow, resumeDone } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const piston = {
  start: (state, { card }) => ({ flow: 'piston', step: 'pick', data: { pistonUid: card?.uid ?? null } }),
  actors: (state) => [state.current],
  legal(state, frame) {
    const p = state.players[state.current]
    if (frame.step !== 'pick' || jobOf(p)) return []
    return p.hand.filter((c) => pistonable(state, state.current, c)).map((c) => ({ type: 'PISTON_PICK', uid: c.uid }))
  },
  apply(s, frame, action) {
    if (action.type !== 'PISTON_PICK' || frame.step !== 'pick') return false
    const p = s.players[s.current]
    const card = p.hand.find((c) => c.uid === action.uid)
    if (!card || !pistonable(s, s.current, card) || jobOf(p)) return false
    take(s, { hand: s.current }, card.uid)
    place(s, s.current, card)
    // le Piston reste derrière le métier qu'il a donné
    if (frame.data.pistonUid) attach(s, frame.data.pistonUid, card.uid)
    log(s, `🤝 Grâce au Piston, ${p.name} devient ${card.name} sans les études !`)
    // "repiochez pour avoir 5 cartes"
    refill(s, s.current)
    // le métier pistonné déclenche aussi son avantage instantané (Journaliste,
    // Médium, Astronaute, Chefs ; Policier : purge ; Bandit) : cards/base.js
    runOnPlace(s, s.current, card)
    finishFlow(s, frame)
    return true
  },
  resume: resumeDone,
  // délai dépassé : le premier métier permis
  fallback: (state, frame) => piston.legal(state, frame)[0],
  view: (state, frame) => copy(frame),
}

export default piston
