// ---------------------------------------------------------------------------
// Smile Life — ce que chaque joueur a le droit de voir
// viewFor(state, viewer) construit la « vue » d'un joueur à partir de l'état
// complet : un objet JSON simple (il sera envoyé sur le réseau), sans aucune
// information cachée pour ce joueur. viewer = index du joueur, ou null pour un
// spectateur (aucune information privée).
//
// Les uid sont numérotés au hasard (buildDeck) et ne révèlent plus le type,
// mais ils permettent de suivre une carte d'une zone à l'autre : une carte
// cachée ne doit JAMAIS apparaître avec son uid, ni ailleurs dans la vue.
// ---------------------------------------------------------------------------
import { whoMustAct } from './turn.js'
import { boardCards } from './state.js'
import { stackView } from './flows/index.js'

// copie profonde, sérialisable ; ne touche jamais à l'état d'origine
const copy = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))

// carte face cachée : aucun lien avec la carte réelle (ni uid, ni contenu)
const placeholder = (owner, i) => ({ uid: `hidden-${owner}-${i}`, hidden: true })

export function viewFor(state, viewer) {
  if (!state.players) {
    const { rng, seed, ...rest } = state
    return { ...copy(rest), viewer, mayAct: false }
  }

  // rng et seed : jamais dans une vue (ils permettraient de prédire la pioche)
  const { deck, players, casino, rng, seed, meta, stack, ...rest } = state
  const view = copy(rest)
  view.deckCount = deck.length
  view.players = players.map((p, i) => {
    const { hand, ...board } = p
    const q = copy(board)
    q.hand = viewer != null && i === viewer ? copy(hand) : hand.map((_, k) => placeholder(i, k))
    return q
  })
  // méta des cartes posées : seulement celles que le joueur voit (les plateaux,
  // publics dans le jeu de base)
  const seen = new Set(players.flatMap((p) => boardCards(p).map((c) => c.uid)))
  view.meta = Object.fromEntries(Object.entries(meta ?? {}).filter(([uid]) => seen.has(uid)).map(([uid, m]) => [uid, { ...m }]))
  // pile des flux : chaque flux dit ce que ce joueur en sait (sa fonction
  // view, src/game/flows/) : les 13 cartes au Médium, les mains au
  // Journaliste, les 3 cartes de la Chance au joueur courant, les uid du Troc
  // du Chef au Chef ; le reste est public
  view.stack = stackView(state, viewer)
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
