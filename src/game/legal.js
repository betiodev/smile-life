// ---------------------------------------------------------------------------
// Smile Life — la liste de toutes les actions permises
// legalActions(state, actor) renvoie chaque action que le joueur `actor` peut
// envoyer maintenant, paramètres remplis (uid de carte, cible, index…) et
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
import {
  canPoseSelf, canPlayMalus, canTakeDiscardTop, canTakeRiverNow, canStopAdultery,
  isPlayableFromDiscard, cheapestPayment, purchaseCost, architectFree, hasJob,
} from './rules.js'

const range = (n) => Array.from({ length: n }, (_, i) => i)

// une carte jouée (main ou carte forcée) : pose devant soi, ou malus sur chaque cible valide
function playsOf(state, me, card) {
  if (card.type === 'malus')
    return range(state.players.length)
      .filter((i) => i !== me && canPlayMalus(state, me, card, i).ok)
      .map((i) => ({ type: 'PLAY_MALUS', uid: card.uid, target: i }))
  return canPoseSelf(state, me, card).ok ? [{ type: 'PLAY_SELF', uid: card.uid }] : []
}

// choix en attente (pending) : seul ce qui le résout est permis
function pendingActions(state, actor) {
  const pend = state.pending
  const me = state.current
  const p = state.players[me]
  const opponentsWithCards = () => range(state.players.length).filter((i) => i !== me && state.players[i].hand.length > 0)

  switch (pend.type) {
    case 'purchase': {
      const out = []
      if (architectFree(p, pend.card)) out.push({ type: 'PURCHASE_CONFIRM', useArchitect: true })
      const best = cheapestPayment(p, purchaseCost(p, pend.card))
      if (best) out.push({ type: 'PURCHASE_CONFIRM', salaryUids: best.salaryUids, useHeritage: best.useHeritage })
      out.push({ type: 'PURCHASE_CANCEL' })
      return out
    }
    case 'chance':
      return pend.cards.map((c) => ({ type: 'CHANCE_PICK', uid: c.uid }))
    case 'discard-pick':
      return state.discard
        .filter((e) => isPlayableFromDiscard(state, me, e.card))
        .map((e) => ({ type: 'DISCARD_PICK', uid: e.card.uid }))
    case 'piston': {
      if (p.job) return []
      const policier = state.players.some((q) => hasJob(q, 'policier'))
      return p.hand
        .filter((c) => c.type === 'job' && !c.isGrandProf && !(policier && (c.key === 'bandit' || c.key === 'gourou')))
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
      return p.malusKept.flatMap((m) =>
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
        ...donor.salaries.filter((x) => !x.invested).map((x) => ({ type: 'BIRTHDAY_GIFT', uid: x.card.uid })),
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

function drawActions(state) {
  const me = state.current
  const p = state.players[me]
  const out = [{ type: 'DRAW_DECK' }]
  if (canTakeDiscardTop(state, me).ok) out.push({ type: 'TAKE_DISCARD' })
  if (state.riverEnabled)
    state.river.forEach((c, index) => {
      out.push({ type: 'TAKE_RIVER', index, playNow: false })
      if (canTakeRiverNow(state, me, c)) out.push({ type: 'TAKE_RIVER', index, playNow: true })
    })
  if (p.job) out.push({ type: 'RESIGN' })
  if (p.marriage) out.push({ type: 'DIVORCE_VOLUNTARY' })
  return out
}

function playActions(state) {
  const me = state.current
  const p = state.players[me]
  // carte forcée (prise dans la défausse / la rivière, Étoile filante, Astronaute) :
  // elle seule peut être jouée ; défaussable seulement si elle ne consomme pas le jeu
  // (un salaire forcé peut aussi être misé au Casino)
  const casinoOpen = state.casino && (!state.casino.stake || state.casino.stake.by !== me)
  if (state.forced) {
    const c = state.forced
    const out = playsOf(state, me, c)
    if (c.type === 'salary' && casinoOpen) out.push({ type: 'CASINO_BET', uid: c.uid })
    if (!state.forcedConsumesPlay) out.push({ type: 'DISCARD_CARD', uid: c.uid })
    return out
  }
  const out = []
  for (const c of p.hand) {
    out.push(...playsOf(state, me, c))
    if (c.type === 'salary' && casinoOpen) out.push({ type: 'CASINO_BET', uid: c.uid })
    out.push({ type: 'DISCARD_CARD', uid: c.uid })
  }
  // Arc-en-ciel : on peut s'arrêter avant d'avoir joué toutes ses cartes
  if (state.playsRemaining > 1) out.push({ type: 'END_PLAYS' })
  return out
}

export function legalActions(state, actor) {
  if (!state?.players || state.screen === 'gameover' || state.screen === 'setup') return []
  if (!whoMustAct(state).includes(actor)) return []
  let list
  if (state.screen === 'transition') list = [{ type: 'READY' }]
  else if (state.pending) list = pendingActions(state, actor)
  else {
    list = state.phase === 'draw' ? drawActions(state) : playActions(state)
    if (canStopAdultery(state, actor).ok) list.push({ type: 'STOP_ADULTERY' })
  }
  return list.map((a) => ({ ...a, by: actor }))
}

// clé stable d'une action (comparer deux listes, chercher une action dans la liste)
export const actionKey = (a) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]]))

