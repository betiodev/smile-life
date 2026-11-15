// ---------------------------------------------------------------------------
// Smile Life — la liste de toutes les actions permises
// legalActions(state, actor) renvoie chaque action que le joueur `actor` peut
// envoyer maintenant (le cadre du dessus de la pile des flux les liste :
// src/game/flows/ ; les choix encore dans pending, ici), paramètres remplis (uid de carte, cible, index…) et
// signée (`by: actor`). Une seule source pour le simulateur, les indices de
// l'interface et, plus tard, les bots.
//
// Fonctionne sur l'état complet comme sur une vue (viewFor) : on n'y lit que
// ce que `actor` a le droit de voir (sa main, les plateaux, la défausse,
// deckCount…).
//
// Exceptions voulues :
// - Achat : on ne liste que le paiement valide le moins cher (et l'Architecte) ;
//   le reducer accepte tout paiement que validatePayment accepte.
// - Cadeau d'Anniversaire et défausse du Chercheur : `uid: null` (choix par
//   défaut quand le délai expire) fait partie de la liste.
// ---------------------------------------------------------------------------
import { whoMustAct } from './turn.js'
import { jobOf, unspentMoney, malusOf } from './state.js'
import { canPlayMalus, isPlayableFromDiscard, hasJob, hasTag, isGrandProf } from './rules.js'
import { flowOf, activeFrame } from './flows/index.js'

const range = (n) => Array.from({ length: n }, (_, i) => i)

// choix en attente (pending) : seul ce qui le résout est permis
function pendingActions(state, actor) {
  const pend = state.pending
  const me = state.current
  const p = state.players[me]
  const opponentsWithCards = () => range(state.players.length).filter((i) => i !== me && state.players[i].hand.length > 0)

  switch (pend.type) {
    case 'chance':
      return pend.cards.map((c) => ({ type: 'CHANCE_PICK', uid: c.uid }))
    case 'discard-pick':
      return state.discard
        .filter((e) => isPlayableFromDiscard(state, me, e.card))
        .map((e) => ({ type: 'DISCARD_PICK', uid: e.card.uid }))
    case 'piston': {
      if (jobOf(p)) return []
      const policier = state.players.some((q) => hasJob(q, 'policier'))
      return p.hand
        .filter((c) => c.type === 'job' && !isGrandProf(c) && !(policier && hasTag(c, 'outlaw')))
        .map((c) => ({ type: 'PISTON_PICK', uid: c.uid }))
    }
    case 'troc':
      return opponentsWithCards().map((i) => ({ type: 'TROC_PICK', target: i }))
    case 'chef-troc':
      switch (pend.step) {
        case 'target':
          return opponentsWithCards().map((i) => ({ type: 'CHEF_TROC_TARGET', target: i }))
        case 'protect':
          return p.hand.map((c) => ({ type: 'CHEF_TROC_PROTECT', uid: c.uid }))
        case 'opp-pick': {
          // l'adversaire visé choisit face cachée : il ne connaît que le nombre de cartes
          const n = pend.pickCount ?? p.hand.filter((c) => c.uid !== pend.protectedUid).length
          return range(n).map((index) => ({ type: 'CHEF_TROC_OPP_PICK', index }))
        }
        case 'chef-pick':
          return range(state.players[pend.target].hand.length).map((index) => ({ type: 'CHEF_TROC_CHEF_PICK', index }))
        default:
          return []
      }
    case 'vengeance':
      return malusOf(p).flatMap((m) =>
        range(state.players.length)
          .filter((i) => i !== me && canPlayMalus(state, me, m, i).ok)
          .map((i) => ({ type: 'VENGEANCE_PICK', uid: m.uid, target: i })))
    case 'casino-stake':
      return [
        ...p.hand.filter((c) => c.type === 'salary').map((c) => ({ type: 'CASINO_STAKE', uid: c.uid })),
        { type: 'CASINO_STAKE', uid: null },
      ]
    case 'journalist':
    case 'medium':
      return [{ type: 'CLOSE_PENDING' }]
    case 'birthday': {
      const donor = state.players[actor]
      return [
        ...unspentMoney(state, donor).map((c) => ({ type: 'BIRTHDAY_GIFT', uid: c.uid })),
        { type: 'BIRTHDAY_GIFT', uid: null },
      ]
    }
    case 'chercheur-discard':
      return [
        ...state.players[pend.player].hand.map((c) => ({ type: 'CHERCHEUR_DISCARD', uid: c.uid })),
        { type: 'CHERCHEUR_DISCARD', uid: null },
      ]
    default:
      return []
  }
}

export function legalActions(state, actor) {
  if (!state?.players || state.status !== 'playing') return []
  if (!whoMustAct(state).includes(actor)) return []
  // le cadre actif de la pile (tour, achat), sinon le choix pending
  const frame = activeFrame(state)
  const list = frame ? flowOf(frame.flow).legal(state, frame, actor) : pendingActions(state, actor)
  return list.map((a) => ({ ...a, by: actor }))
}
// clé stable d'une action (comparer deux listes, chercher une action dans la liste)
export const actionKey = (a) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]]))

