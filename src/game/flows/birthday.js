// ---------------------------------------------------------------------------
// Smile Life — Anniversaire : chaque adversaire offre un salaire non investi
// Étape 'gifts' : les donateurs qui n'ont pas encore choisi agissent, dans
// n'importe quel ordre (BIRTHDAY_GIFT) ; le joueur fêté attend. Les cadeaux
// sont donnés d'un coup quand le dernier a choisi.
// data = { card, donors, gifts } : la carte Anniversaire (déjà posée), les
// donateurs, gifts[donateur] = uid du salaire choisi. Public.
// uid null : le plus petit salaire libre (l'action par défaut).
// ---------------------------------------------------------------------------
import { lowestUnusedSalary } from '../rules.js'
import { unspentMoney } from '../state.js'
import { giveBirthdayGifts } from '../effects.js'
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const birthday = {
  start: (state, { card, donors }) => ({ flow: 'birthday', step: 'gifts', data: { card, donors, gifts: {} } }),
  actors: (state, frame) => frame.data.donors.filter((i) => !(i in frame.data.gifts)),
  legal: (state, frame, actor) => [
    ...unspentMoney(state, state.players[actor]).map((c) => ({ type: 'BIRTHDAY_GIFT', uid: c.uid })),
    { type: 'BIRTHDAY_GIFT', uid: null },
  ],
  apply(s, frame, action) {
    const d = frame.data
    if (action.type !== 'BIRTHDAY_GIFT' || !d.donors.includes(action.by) || action.by in d.gifts) return false
    const donor = s.players[action.by]
    const gift = action.uid == null
      ? lowestUnusedSalary(s, donor)
      : unspentMoney(s, donor).find((c) => c.uid === action.uid)
    if (!gift) return false
    d.gifts = { ...d.gifts, [action.by]: gift.uid }
    if (d.donors.some((i) => !(i in d.gifts))) return true
    giveBirthdayGifts(s, s.current, d.gifts)
    endFlow(s)
    return true
  },
  resume() {},
  // délai dépassé : le plus petit salaire libre
  fallback: () => ({ type: 'BIRTHDAY_GIFT', uid: null }),
  view: (state, frame) => copy(frame),
}

export default birthday
