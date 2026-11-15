// ---------------------------------------------------------------------------
// Smile Life — Casino ouvert : miser tout de suite un salaire de sa main ?
// Étape 'stake' : CASINO_STAKE avec un uid (mise, puis on repioche) ou
// uid null (ne pas miser). Le cadre est public ; la mise elle-même est cachée
// aux autres (state.casino, view.js).
// ---------------------------------------------------------------------------
import { take, draw, log } from '../primitives.js'
import { endFlow } from './index.js'
import { canStake } from '../state.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const casinoStake = {
  start: () => ({ flow: 'casino-stake', step: 'stake', data: {} }),
  actors: (state) => [state.current],
  legal: (state) => [
    ...state.players[state.current].hand.filter(canStake).map((c) => ({ type: 'CASINO_STAKE', uid: c.uid })),
    { type: 'CASINO_STAKE', uid: null },
  ],
  apply(s, frame, action) {
    if (action.type !== 'CASINO_STAKE') return false
    const p = s.players[s.current]
    if (action.uid) {
      const card = p.hand.find((c) => c.uid === action.uid)
      if (!card || !canStake(card)) return false
      take(s, { hand: s.current }, card.uid)
      s.casino.stake = { card, by: s.current }
      log(s, `🎰 ${p.name} mise immédiatement un salaire (et repioche)`)
      draw(s, s.current)
    }
    endFlow(s)
    return true
  },
  resume() {},
  // délai dépassé : ne pas miser
  fallback: () => ({ type: 'CASINO_STAKE', uid: null }),
  view: (state, frame) => copy(frame),
}

export default casinoStake
