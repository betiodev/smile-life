// ---------------------------------------------------------------------------
// Smile Life — le flux d'achat (voyage, maison : à payer avec ses salaires)
// Posé sur le tour quand une acquisition à payer est jouée (effects.js).
// Une seule étape, 'pay' : le joueur du tour paie (PURCHASE_CONFIRM) ou
// renonce (PURCHASE_CANCEL). En sortant, il rend au tour { bought, fromForced }
// (flows/turn.js, resume).
//
// data = { card, fromForced }
//   card       : l'acquisition, tenue par ce cadre tant qu'elle n'est pas payée
//                (sauf fromForced : elle reste aussi la carte forcée du tour)
//   fromForced : elle vient de la défausse / la rivière / l'Étoile filante
// ---------------------------------------------------------------------------
import { attach, place, put, log } from '../primitives.js'
import { checkPayment, architectFree, cheapestPayment, purchaseCost } from '../rules.js'
import { endFlow } from './index.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

const purchase = {
  start(state, { card, fromForced = false }) {
    return { flow: 'purchase', step: 'pay', data: { card, fromForced } }
  },
  actors: (state) => [state.current],
  // le paiement valide le moins cher (et l'Architecte) : le reducer accepte
  // tout paiement que checkPayment accepte (règle : la question paymentRule) (ARCHITECTURE.md §6.5)
  legal(state, frame) {
    const p = state.players[state.current]
    const { card } = frame.data
    const out = []
    if (architectFree(state, state.current, card)) out.push({ type: 'PURCHASE_CONFIRM', useArchitect: true })
    const best = cheapestPayment(state, p, purchaseCost(state, state.current, card))
    if (best) out.push({ type: 'PURCHASE_CONFIRM', salaryUids: best.salaryUids, useHeritage: best.useHeritage })
    out.push({ type: 'PURCHASE_CANCEL' })
    return out
  },
  apply(s, frame, action) {
    const p = s.players[s.current]
    const { card, fromForced } = frame.data
    switch (action.type) {
      case 'PURCHASE_CONFIRM': {
        // offerte au choix (Architecte : cards/base.js)
        const isFree = !!action.useArchitect && architectFree(s, s.current, card)
        const cost = purchaseCost(s, s.current, card)
        if (!isFree) {
          // pas de salaire superflu : impossible de sur-investir pour échapper à l'Impôt
          const pay = checkPayment(s, s.current, cost, action)
          if (!pay.ok) return false
          const paid = pay.total
          // l'argent choisi (salaires, et l'Héritage tout ou rien) passe sous
          // l'acquisition qu'il a payée
          for (const c of pay.cards) attach(s, c.uid, card.uid)
          log(s, `${p.name} achète ${card.name} pour ${cost} liasses (${paid} investies${paid > cost ? ' — pas de monnaie !' : ''})`)
        } else {
          p.architectFreeUsed = true
          log(s, `🏠 ${p.name} (Architecte) obtient ${card.name} gratuitement !`)
        }
        place(s, s.current, card)
        endFlow(s, { bought: true, fromForced })
        return true
      }
      case 'PURCHASE_CANCEL':
        // la carte revient en main (ou reste forcée)
        if (!fromForced) put(s, card, { hand: s.current })
        endFlow(s, { bought: false, fromForced })
        return true
      default:
        return false
    }
  },
  resume() {},
  // carte forcée (elle doit être jouée) : le paiement le moins cher ; sinon on
  // renonce, la carte revient en main
  fallback(state, frame, actor) {
    const legal = purchase.legal(state, frame, actor)
    if (frame.data.fromForced) return legal[0]
    return legal.find((a) => a.type === 'PURCHASE_CANCEL')
  },
  // public : l'acquisition est jouée face visible
  view: (state, frame) => copy(frame),
  // carte tenue par ce cadre (vérifications d'intégrité)
  held: (state, frame) => (frame.data.fromForced ? [] : [frame.data.card]),
}

export default purchase
