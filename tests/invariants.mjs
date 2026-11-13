// Vérifications d'intégrité, lancées après CHAQUE action des parties simulées
// (tests/sim.mjs) :
// - chaque carte (uid) est à un seul endroit, et le total est la taille du paquet ;
// - quelqu'un peut agir, sauf si la partie est finie ;
// - chaque action de legalActions change l'état ;
// - un échantillon d'actions hors de la liste est refusé par le reducer ;
// - legalActions donne la même liste sur la vue du joueur que sur l'état complet ;
// - l'état survit à JSON.parse(JSON.stringify(state)) et se rejoue à l'identique.
// (« la partie se termine » : garde-fou de playGame dans sim-lib.mjs)
// Le hasard utilisé ici est séparé de celui du simulateur : activer ces
// vérifications ne change pas les parties jouées.
import { gameReducer } from '../src/game/reducer.js'
import { legalActions, actionKey } from '../src/game/legal.js'
import { whoMustAct } from '../src/game/turn.js'
import { viewFor } from '../src/game/view.js'
import { makeRng } from '../src/game/rng.js'
import { buildDeck } from '../src/data/cards.js'

const DECK_SIZE = buildDeck().length
const random = makeRng('invariants')
const SAMPLE = 6 // actions hors liste essayées à chaque étape

const fail = (msg) => { throw new Error('INVARIANT : ' + msg) }

// --- 1. chaque carte à un seul endroit -----------------------------------------
export function cardPlaces(s) {
  const places = new Map()
  const put = (card, where) => {
    if (!card) return
    if (places.has(card.uid)) fail(`carte ${card.uid} (${card.name}) à deux endroits : ${places.get(card.uid)} et ${where}`)
    places.set(card.uid, where)
  }
  s.deck.forEach((c) => put(c, 'pioche'))
  s.discard.forEach((e) => put(e.card, 'défausse'))
  s.removed.forEach((c) => put(c, 'retirées'))
  s.river.forEach((c) => put(c, 'rivière'))
  put(s.forced, 'carte forcée')
  put(s.casino?.stake?.card, 'mise du casino')
  // cartes « en l'air » pendant un choix (le Médium ne fait que regarder la pioche,
  // l'Anniversaire est déjà posé)
  if (s.pending?.type === 'chance') s.pending.cards.forEach((c) => put(c, 'Chance'))
  if (s.pending?.type === 'purchase' && !s.pending.fromForced) put(s.pending.card, 'achat en cours')
  s.players.forEach((p, i) => {
    const at = (z) => `J${i + 1} ${z}`
    p.hand.forEach((c) => put(c, at('main')))
    p.studies.forEach((c) => put(c, at('études')))
    put(p.job, at('métier'))
    p.salaries.forEach((x) => put(x.card, at('salaires')))
    p.flirts.forEach((c) => put(c, at('flirts')))
    put(p.marriage, at('mariage'))
    put(p.adultery, at('adultère'))
    p.children.forEach((c) => put(c, at('enfants')))
    p.acquisitions.forEach((c) => put(c, at('acquisitions')))
    p.distinctions.forEach((d) => put(d.card, at('distinctions')))
    p.specials.forEach((c) => put(c, at('spéciales')))
    p.malusKept.forEach((c) => put(c, at('malus reçus')))
  })
  if (places.size !== DECK_SIZE) fail(`${places.size} cartes trouvées au lieu de ${DECK_SIZE}`)
  return places
}

// --- 4. actions candidates hors liste ------------------------------------------
// Toutes les formes d'action, avec des paramètres plausibles pris dans l'état.
// Les paiements d'achat ne sont pas essayés (le reducer accepte tout paiement
// valide, la liste n'en donne que le moins cher).
function candidates(s) {
  const n = s.players.length
  const uids = new Set()
  const add = (c) => c && uids.add(c.uid)
  s.players.forEach((p) => {
    p.hand.forEach(add)
    p.salaries.forEach((x) => add(x.card))
    p.malusKept.forEach(add)
  })
  add(s.forced)
  s.discard.slice(-4).forEach((e) => add(e.card))
  if (s.pending?.type === 'chance') s.pending.cards.forEach(add)
  const uidList = [...uids, null]
  const targets = [...Array(n).keys()]
  const indexes = [0, 1, 2, 5, 6, -1]

  const out = []
  for (const type of ['READY', 'DRAW_DECK', 'TAKE_DISCARD', 'RESIGN', 'DIVORCE_VOLUNTARY', 'STOP_ADULTERY',
    'END_PLAYS', 'PURCHASE_CANCEL', 'CLOSE_PENDING']) out.push({ type })
  out.push({ type: 'PURCHASE_CONFIRM', useArchitect: true })
  for (const index of indexes) {
    out.push({ type: 'TAKE_RIVER', index, playNow: false }, { type: 'TAKE_RIVER', index, playNow: true })
    out.push({ type: 'CHEF_TROC_OPP_PICK', index }, { type: 'CHEF_TROC_CHEF_PICK', index })
  }
  for (const target of targets) {
    out.push({ type: 'TROC_PICK', target }, { type: 'CHEF_TROC_TARGET', target })
  }
  for (const uid of uidList) {
    for (const type of ['PLAY_SELF', 'DISCARD_CARD', 'CASINO_BET', 'CHANCE_PICK', 'DISCARD_PICK', 'PISTON_PICK',
      'CHEF_TROC_PROTECT', 'CASINO_STAKE', 'BIRTHDAY_GIFT', 'CHERCHEUR_DISCARD']) out.push({ type, uid })
    for (const target of targets) out.push({ type: 'PLAY_MALUS', uid, target }, { type: 'VENGEANCE_PICK', uid, target })
  }
  return out
}

// k actions tirées au hasard parmi les candidates, signées par un joueur au
// hasard, et absentes de la liste
function sampleOutside(s, listed, k) {
  const pool = candidates(s)
  const out = []
  for (let tries = 0; out.length < k && tries < k * 10; tries++) {
    const a = { ...pool[Math.floor(random() * pool.length)], by: Math.floor(random() * s.players.length) }
    if (!listed.has(actionKey(a))) out.push(a)
  }
  return out
}

// s : état avant l'action ; action : l'action choisie ; next : l'état obtenu.
// Sur l'état final (partie finie), action et next valent null.
export function checkInvariants(s, action, next) {
  // 1. les cartes
  cardPlaces(s)

  const actors = whoMustAct(s)
  const legalBy = new Map(s.players.map((_, i) => [i, legalActions(s, i)]))

  // 2. quelqu'un peut agir, sauf si la partie est finie
  if (s.screen === 'gameover') {
    if ([...legalBy.values()].some((l) => l.length > 0)) fail('une action est proposée alors que la partie est finie')
    return
  }
  if (!actors.some((i) => legalBy.get(i).length > 0))
    fail(`personne ne peut agir (phase=${s.phase} pending=${s.pending?.type} forced=${s.forced?.name})`)
  for (const [i, l] of legalBy) if (!actors.includes(i) && l.length > 0) fail(`J${i + 1} a des actions alors que ce n'est pas à lui d'agir`)

  const listed = new Set()
  for (const i of actors) {
    const legal = legalBy.get(i)
    // 5. même liste sur la vue du joueur que sur l'état complet
    const fromView = legalActions(viewFor(s, i), i).map(actionKey).join('\n')
    if (fromView !== legal.map(actionKey).join('\n'))
      fail(`legalActions diffère sur la vue de J${i + 1} :\n  état : ${legal.map(actionKey).join(' ')}\n  vue  : ${fromView.replace(/\n/g, ' ')}`)
    // 3. chaque action de la liste change l'état
    for (const a of legal) {
      listed.add(actionKey(a))
      if (gameReducer(s, a) === s) fail(`action de la liste refusée par le reducer : ${actionKey(a)}`)
    }
  }

  // 4. un échantillon d'actions hors de la liste est refusé
  for (const a of sampleOutside(s, listed, SAMPLE)) {
    if (gameReducer(s, a) !== s) fail(`action hors de la liste acceptée par le reducer : ${actionKey(a)} (phase=${s.phase} pending=${s.pending?.type})`)
  }

  if (!action) return
  if (!listed.has(actionKey(action))) fail(`l'action jouée n'est pas dans la liste : ${actionKey(action)}`)

  // 6. copie JSON : se rejoue à l'identique, et l'action a bien changé l'état
  const before = JSON.stringify(s)
  const after = JSON.stringify(next)
  if (before === after) fail(`l'action ne change rien à l'état : ${actionKey(action)}`)
  const copy = JSON.parse(before)
  if (JSON.stringify(copy) !== before) fail('l’état ne survit pas à JSON.parse(JSON.stringify(state))')
  if (JSON.stringify(gameReducer(copy, action)) !== after) fail(`la copie JSON ne se rejoue pas à l'identique : ${actionKey(action)}`)
}
