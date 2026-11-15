// Vérifications d'intégrité, lancées après CHAQUE action des parties simulées
// (tests/sim.mjs) :
// - chaque carte (uid) est à un seul endroit, et le total est la taille du paquet ;
// - méta des cartes posées (state.meta) : une entrée par carte sur la table, et
//   seulement pour elles ; chaque « on » désigne une carte sur la table ;
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
import { buildDeck } from '../src/data/index.js'
import { boardCards, moneyOf, malusOf, outOfGameCards, tableCards } from '../src/game/state.js'
import { heldCards, activeFrame } from '../src/game/flows/index.js'
import { defaultAction } from '../src/game/turn.js'

// taille du paquet de la partie (jeu de base + extensions en jeu)
const SIZES = new Map()
const deckSize = (s) => {
  const key = (s.extensions ?? []).join()
  if (!SIZES.has(key)) SIZES.set(key, buildDeck(s.extensions ?? []).length)
  return SIZES.get(key)
}
const random = makeRng('invariants')
const SAMPLE = 6 // actions hors liste essayées à chaque étape

const fail = (msg) => { throw new Error('INVARIANT : ' + msg) }
// où en est la partie (messages d'erreur)
export const where = (s) => `pile=${(s.stack ?? []).map((f) => `${f.flow}:${f.step}`).join('>')}`

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
  outOfGameCards(s).forEach((c) => put(c, 'hors jeu'))
  s.river.forEach((c) => put(c, 'rivière'))
  s.center.forEach((c) => put(c, 'centre'))
  s.pot.forEach((c) => put(c, 'cagnotte'))
  s.spare.forEach((c) => put(c, 'de côté'))
  put(s.casino?.stake?.card, 'mise du casino')
  // cartes tenues par les cadres de la pile (carte forcée du tour, achat en
  // cours, les 3 cartes de la Chance ; le Médium ne fait que regarder la
  // pioche, l'Anniversaire est déjà posé)
  heldCards(s).forEach((c) => put(c, 'pile des flux'))
  s.players.forEach((p, i) => {
    const at = (z) => `J${i + 1} ${z}`
    p.hand.forEach((c) => put(c, at('main')))
    boardCards(p).forEach((c) => put(c, at('plateau')))
  })
  if (places.size !== deckSize(s)) fail(`${places.size} cartes trouvées au lieu de ${deckSize(s)}`)
  return places
}

// --- 1 bis. méta des cartes posées ------------------------------------------
export function checkMeta(s) {
  const onTable = new Set(tableCards(s).map((c) => c.uid))
  const seqs = new Set()
  for (const [uid, m] of Object.entries(s.meta)) {
    if (!onTable.has(uid)) fail(`méta de la carte ${uid}, qui n'est pas sur la table`)
    if (!Number.isInteger(m.seq) || m.seq < 1 || m.seq > s.seqCounter) fail(`méta de ${uid} : seq ${m.seq} invalide`)
    if (seqs.has(m.seq)) fail(`seq ${m.seq} donné à deux cartes`)
    seqs.add(m.seq)
    if (m.on != null && !onTable.has(m.on)) fail(`la carte ${uid} est posée sur ${m.on}, qui n'est pas sur la table`)
    // protectedBy : un code de raison, ou l'uid d'une carte sur la table
    if (m.protectedBy != null && /^c\d+$/.test(m.protectedBy) && !onTable.has(m.protectedBy))
      fail(`la carte ${uid} est protégée par ${m.protectedBy}, qui n'est pas sur la table`)
    if (m.timer && !(Number.isInteger(m.timer.left) && m.timer.left > 0)) fail(`méta de ${uid} : timer ${JSON.stringify(m.timer)} invalide`)
  }
  for (const uid of onTable) if (!s.meta[uid]) fail(`carte ${uid} posée sans méta (seq)`)
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
    moneyOf(p).forEach(add)
    malusOf(p).forEach(add)
    boardCards(p).slice(-3).forEach(add)
  })
  s.center.forEach(add)
  heldCards(s).forEach(add)
  s.discard.slice(-4).forEach((e) => add(e.card))
  const uidList = [...uids, null]
  const targets = [...Array(n).keys()]
  const indexes = [0, 1, 2, 5, 6, -1]

  const out = []
  // READY n'existe plus (passage d'écran : src/session/hotseat.js) : toujours refusé
  for (const type of ['READY', 'DRAW_DECK', 'TAKE_DISCARD', 'RESIGN', 'DIVORCE_VOLUNTARY', 'STOP_ADULTERY',
    'END_PLAYS', 'PURCHASE_CANCEL', 'CLOSE_INFO']) out.push({ type })
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
  checkMeta(s)

  // 1 ter. la pile des flux : le tour en bas, des cadres de simples données
  // (avant le premier tour : la mise en place en bas de la pile)
  if (s.status === 'playing' && !['turn', 'setup'].includes(s.stack[0]?.flow)) fail(`ni tour ni mise en place en bas de la pile (${where(s)})`)
  if (s.status === 'over' && s.stack.length > 0) fail('pile non vide en fin de partie')
  if (s.stack.some((f, i) => i > 0 && (f.flow === 'turn' || f.flow === 'setup'))) fail(`un tour au-dessus du bas de la pile (${where(s)})`)

  const actors = whoMustAct(s)
  const legalBy = new Map(s.players.map((_, i) => [i, legalActions(s, i)]))

  // 2. quelqu'un peut agir, sauf si la partie est finie
  if (s.status === 'over') {
    if ([...legalBy.values()].some((l) => l.length > 0)) fail('une action est proposée alors que la partie est finie')
    return
  }
  if (!actors.some((i) => legalBy.get(i).length > 0))
    fail(`personne ne peut agir (${where(s)})`)
  for (const [i, l] of legalBy) if (!actors.includes(i) && l.length > 0) fail(`J${i + 1} a des actions alors que ce n'est pas à lui d'agir`)

  const listed = new Set()
  for (const i of actors) {
    const legal = legalBy.get(i)
    // 5. même liste sur la vue du joueur que sur l'état complet
    const fromView = legalActions(viewFor(s, i), i).map(actionKey).join('\n')
    if (fromView !== legal.map(actionKey).join('\n'))
      fail(`legalActions diffère sur la vue de J${i + 1} :\n  état : ${legal.map(actionKey).join(' ')}\n  vue  : ${fromView.replace(/\n/g, ' ')}`)
    // 2 bis. chaque attente d'un cadre a une action par défaut, permise
    if (activeFrame(s)) {
      const fb = defaultAction(s, i)
      if (!fb || !legal.some((a) => actionKey(a) === actionKey(fb))) fail(`fallback absent ou hors liste pour J${i + 1} : ${fb && actionKey(fb)} (${where(s)})`)
    }
    // 3. chaque action de la liste change l'état
    for (const a of legal) {
      listed.add(actionKey(a))
      if (gameReducer(s, a) === s) fail(`action de la liste refusée par le reducer : ${actionKey(a)}`)
    }
  }

  // 4. un échantillon d'actions hors de la liste est refusé
  for (const a of sampleOutside(s, listed, SAMPLE)) {
    if (gameReducer(s, a) !== s) fail(`action hors de la liste acceptée par le reducer : ${actionKey(a)} (${where(s)})`)
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
