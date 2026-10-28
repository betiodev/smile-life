// ---------------------------------------------------------------------------
// Smile Life — ce que chaque joueur a le droit de voir
// viewFor(state, viewer) construit la « vue » d'un joueur à partir de l'état
// complet : un objet JSON simple (il sera envoyé sur le réseau), sans aucune
// information cachée pour ce joueur. viewer = index du joueur, ou null pour un
// spectateur (aucune information privée).
//
// Les uid des cartes trahissent leur type (buildDeck les numérote dans
// l'ordre : c1–c25 = Études, puis métiers, salaires…) : une carte cachée ne
// doit JAMAIS apparaître avec son uid, ni ailleurs dans la vue.
// ---------------------------------------------------------------------------
import { whoMustAct } from './turn.js'

// copie profonde, sérialisable ; ne touche jamais à l'état d'origine
const copy = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))

// carte face cachée : aucun lien avec la carte réelle (ni uid, ni contenu)
const placeholder = (owner, i) => ({ uid: `hidden-${owner}-${i}`, hidden: true })

// étapes « regard unique » : seul le joueur courant voit, et seulement
// tant que l'étape est ouverte
function pendingFor(pending, state, viewer) {
  if (!pending) return null
  const me = viewer != null && viewer === state.current
  switch (pending.type) {
    case 'medium':
      // les 13 prochaines cartes : au Médium seulement
      return me ? copy(pending) : { type: 'medium' }
    case 'journalist':
      // le Journaliste voit toutes les autres mains, le temps de la modale
      return me
        ? { type: 'journalist', hands: state.players.map((q, i) => (i === viewer ? null : copy(q.hand))) }
        : { type: 'journalist' }
    case 'chance':
      // les 3 cartes piochées : au joueur courant seulement
      return me ? copy(pending) : { type: 'chance', count: pending.cards.length }
    case 'chef-troc': {
      // Troc du Chef : les uid (carte protégée, carte prise) restent au Chef ;
      // l'adversaire visé ne connaît que le nombre de cartes où piocher
      const chef = state.players[state.current]
      const pub = { type: 'chef-troc', step: pending.step }
      if ('target' in pending) pub.target = pending.target
      if (pending.step === 'opp-pick') {
        pub.protected = !!pending.protectedUid
        pub.pickCount = chef.hand.filter((c) => c.uid !== pending.protectedUid).length
      }
      if (me) {
        if ('protectedUid' in pending) pub.protectedUid = pending.protectedUid
        if ('oppPickedUid' in pending) pub.oppPickedUid = pending.oppPickedUid
      }
      return pub
    }
    default:
      // achat, anniversaire, Étoile filante, Piston, Troc, Vengeance, Casino,
      // défausse du Chercheur (seul son joueur voit sa main) : publics
      return copy(pending)
  }
}

export function viewFor(state, viewer) {
  if (!state.players) return { ...copy(state), viewer, mayAct: false }

  const { deck, players, pending, casino, ...rest } = state
  const view = copy(rest)
  view.deckCount = deck.length
  view.players = players.map((p, i) => {
    const { hand, ...board } = p
    const q = copy(board)
    q.hand = viewer != null && i === viewer ? copy(hand) : hand.map((_, k) => placeholder(i, k))
    return q
  })
  view.pending = pendingFor(pending, state, viewer)
  // mise du Casino : face cachée pour tous sauf celui qui a misé
  view.casino = casino && {
    owner: casino.owner,
    stake: casino.stake && (viewer != null && casino.stake.by === viewer
      ? copy(casino.stake)
      : { by: casino.stake.by, hidden: true }),
  }
  view.viewer = viewer
  view.mayAct = viewer != null && whoMustAct(state).includes(viewer)
  return view
}
