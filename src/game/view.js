// ---------------------------------------------------------------------------
// Smile Life — ce que chaque joueur a le droit de voir
// viewFor(state, viewer) construit la « vue » d'un joueur à partir de l'état
// complet : un objet JSON simple (il sera envoyé sur le réseau), sans aucune
// information cachée pour ce joueur. viewer = index du joueur, ou null pour un
// spectateur (aucune information privée).
//
// Une seule règle de visibilité, canSee (ARCHITECTURE.md §8.1), pour toutes
// les zones :
//   main                      son propriétaire seulement
//   plateaux, centre          tout le monde, sauf carte face cachée (meta.faceDown)
//   défausse, hors jeu,
//   rivière, cagnotte         tout le monde
//   pioche, cartes de côté    personne (la pioche : seulement sa taille, deckCount)
//   mise du Casino            celui qui a misé
// puis les regards temporaires (state.sight : { viewer, uids, until }) qui
// montrent des cartes précises à un joueur (ou à tous : viewer 'all').
// Les cartes tenues par un flux (Chance, Médium…) : c'est la fonction view
// du flux qui dit qui les voit (src/game/flows/).
//
// Les uid sont numérotés au hasard (buildDeck) et ne révèlent plus le type,
// mais ils permettent de suivre une carte d'une zone à l'autre : une carte
// cachée ne doit JAMAIS apparaître avec son uid, ni ailleurs dans la vue.
// ---------------------------------------------------------------------------
import { whoMustAct } from './turn.js'
import { metaOf } from './state.js'
import { stackView, heldCards } from './flows/index.js'
import { BOARD_ZONES } from './primitives.js'

// copie profonde, sérialisable ; ne touche jamais à l'état d'origine
const copy = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))

// carte face cachée : aucun lien avec la carte réelle (ni uid, ni contenu)
const placeholder = (owner, i) => ({ uid: `hidden-${owner}-${i}`, hidden: true })
const faceDownCard = (where, i) => ({ uid: `facedown-${where}-${i}`, hidden: true, faceDown: true })

// --- visibilité ----------------------------------------------------------------
// regard temporaire : viewer voit-il la carte uid grâce à state.sight ?
const bySight = (state, viewer, uid) =>
  (state.sight ?? []).some((e) => (e.viewer === 'all' || (viewer != null && e.viewer === viewer)) && e.uids.includes(uid))

// Lieu d'une carte : { zone, player? } — zone 'hand' | 'board' | 'center' |
// 'discard' | 'outOfGame' | 'river' | 'pot' | 'deck' | 'spare' | 'casino' | 'flow'
export function locate(state, uid) {
  const has = (list, f = (c) => c) => (list ?? []).some((e) => f(e)?.uid === uid)
  for (let player = 0; player < state.players.length; player++) {
    const p = state.players[player]
    if (has(p.hand)) return { zone: 'hand', player }
    if (BOARD_ZONES.some((z) => has(p[z]))) return { zone: 'board', player }
  }
  if (has(state.center)) return { zone: 'center' }
  if (has(state.discard, (e) => e.card)) return { zone: 'discard' }
  if (has(state.outOfGame, (e) => e.card)) return { zone: 'outOfGame' }
  if (has(state.river)) return { zone: 'river' }
  if (has(state.pot)) return { zone: 'pot' }
  if (has(state.deck)) return { zone: 'deck' }
  if (has(state.spare)) return { zone: 'spare' }
  if (state.casino?.stake?.card.uid === uid) return { zone: 'casino', player: state.casino.stake.by }
  if (heldCards(state).some((c) => c.uid === uid)) return { zone: 'flow' }
  return null
}

// viewer voit-il cette carte, à ce lieu ? (règle par zone, puis face cachée,
// puis regards temporaires)
export function seesAt(state, viewer, where, card) {
  if (bySight(state, viewer, card.uid)) return true
  switch (where.zone) {
    case 'hand':
    case 'casino':
      return viewer != null && viewer === where.player
    case 'board':
    case 'center':
      return !metaOf(state, card.uid)?.faceDown
    case 'deck':
    case 'spare':
      return false
    case 'flow':
      // le flux qui tient la carte le dit dans sa vue
      return JSON.stringify(stackView(state, viewer)).includes(`"${card.uid}"`)
    default:
      return true
  }
}

// canSee(state, viewer, uid) : viewer (index, ou null : spectateur) a-t-il le
// droit de voir la carte uid, là où elle est ? Carte introuvable : non.
export function canSee(state, viewer, uid) {
  const where = locate(state, uid)
  if (!where) return false
  return seesAt(state, viewer, where, { uid })
}

// --- la vue -----------------------------------------------------------------------
export function viewFor(state, viewer) {
  if (!state.players) {
    const { rng, seed, ...rest } = state
    return { ...copy(rest), viewer, mayAct: false }
  }

  // rng et seed : jamais dans une vue (ils permettraient de prédire la pioche).
  // spare : jamais visible. sight : seulement les regards de ce joueur.
  const { deck, players, casino, rng, seed, meta, stack, spare, sight, center, ...rest } = state
  const view = copy(rest)
  view.deckCount = deck.length
  // cartes de la table que ce joueur voit (pour la méta)
  const visible = new Set()
  const show = (where, hide) => (c, k) => {
    if (!seesAt(state, viewer, where, c)) return hide(k)
    if (where.zone !== 'hand') visible.add(c.uid)
    return copy(c)
  }
  view.players = players.map((p, i) => {
    const { hand, ...board } = p
    const q = copy(board)
    q.hand = hand.map(show({ zone: 'hand', player: i }, (k) => placeholder(i, k)))
    for (const z of BOARD_ZONES) q[z] = p[z].map(show({ zone: 'board', player: i }, (k) => faceDownCard(`${i}-${z}`, k)))
    return q
  })
  view.center = (center ?? []).map(show({ zone: 'center' }, (k) => faceDownCard('center', k)))
  // cartes de la pioche montrées à ce joueur par un regard (0 = le dessus)
  const seen = deck.map((card, i) => ({ card, index: deck.length - 1 - i }))
    .filter((e) => bySight(state, viewer, e.card.uid))
    .map((e) => ({ zone: 'deck', index: e.index, card: copy(e.card) }))
  if (seen.length) view.seen = seen
  view.sight = (sight ?? []).filter((e) => e.viewer === 'all' || (viewer != null && e.viewer === viewer)).map(copy)
  // méta des cartes sur la table : seulement celles que le joueur voit ; un
  // lien (on, protectedBy) vers une carte cachée n'est pas envoyé
  view.meta = {}
  for (const [uid, m] of Object.entries(meta ?? {})) {
    if (!visible.has(uid)) continue
    const out = { ...m }
    if (m.timer) out.timer = { ...m.timer }
    if (out.on && !visible.has(out.on)) delete out.on
    if (out.protectedBy && meta[out.protectedBy] && !visible.has(out.protectedBy)) out.protectedBy = 'hidden'
    view.meta[uid] = out
  }
  // pile des flux : chaque flux dit ce que ce joueur en sait (sa fonction
  // view, src/game/flows/) : les 13 cartes au Médium, les mains au
  // Journaliste, les 3 cartes de la Chance au joueur courant, les uid du Troc
  // du Chef au Chef ; le reste est public
  view.stack = stackView(state, viewer)
  // mise du Casino : face cachée pour tous sauf celui qui a misé
  view.casino = casino && {
    owner: casino.owner,
    stake: casino.stake && (seesAt(state, viewer, { zone: 'casino', player: casino.stake.by }, casino.stake.card)
      ? copy(casino.stake)
      : { by: casino.stake.by, hidden: true }),
  }
  view.viewer = viewer
  view.mayAct = viewer != null && whoMustAct(state).includes(viewer)
  return view
}
