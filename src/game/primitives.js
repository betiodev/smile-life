// ---------------------------------------------------------------------------
// Smile Life — primitives (ARCHITECTURE.md §6.1)
// SEUL fichier qui modifie les zones de cartes : pioche, mains, plateaux,
// défausse, hors jeu, rivière, centre de la table, cagnotte, cartes mises de
// côté (spare), et les regards temporaires (state.sight). Le reducer et les comportements de cartes
// appellent ces fonctions et ne touchent jamais une zone à la main.
// Les primitives annoncent ce qui s'est passé (événements, src/game/events.js).
//
// Conventions :
//  - l'état d'abord, les joueurs par leur index ;
//  - une carte « à part » (aside) est tenue hors zone par l'appelant : carte
//    forcée, cartes de la Chance, mise du Casino, malus de la Vengeance…
//  - les primitives ne vérifient AUCUNE règle : le reducer valide avant.
// ---------------------------------------------------------------------------
import { handSize } from './rules.js'
import { jobOf, metaOf, tableCards } from './state.js'
import { emit } from './events.js'
import { ask } from './queries.js'
import { startFlow } from './flows/index.js'
import { BEHAVIOURS } from './cards/index.js'
import { CATALOGUE, hasTag, shuffle } from '../data/index.js'
import { rngOf } from './rng.js'

const byUid = (uid) => (c) => c.uid === uid

// zone du plateau où va chaque type de carte posée
const ZONE_OF_TYPE = {
  study: 'studies', job: 'jobs', salary: 'money', flirt: 'flirts', marriage: 'marriages',
  adultery: 'adultery', child: 'children', acquisition: 'acquisitions',
  distinction: 'distinctions', special: 'specials', malus: 'malus',
}
export const BOARD_ZONES = [...new Set(Object.values(ZONE_OF_TYPE))]

// ===========================================================================
// Écrivains bas niveau : zone + state.meta (ARCHITECTURE.md §3.2)
// Exportés pour la mise en place des tests ; le moteur passe par les
// primitives plus bas, qui annoncent les événements.
// ===========================================================================

// la carte arrive sur la table : nouveau numéro d'ordre
function stamp(s, card) {
  s.seqCounter += 1
  s.meta[card.uid] = { seq: s.seqCounter }
}
// la carte quitte la table : son entrée disparaît, les cartes posées sous
// elle n'y sont plus rattachées (elles restent retournées) et celles qu'elle
// protégeait ne le sont plus
function unstamp(s, uid) {
  delete s.meta[uid]
  for (const m of Object.values(s.meta)) {
    if (m.on === uid) delete m.on
    if (m.protectedBy === uid) delete m.protectedBy
  }
}
// retourne une carte posée (on : la carte sous laquelle elle passe)
function markUsed(s, uid, on = null) {
  const m = s.meta[uid]
  if (!m) return
  m.used = true
  if (on) m.on = on
}

export function placeCard(s, zone, card) {
  zone.push(card)
  stamp(s, card)
}
export function liftCard(s, zone, uid) {
  const i = zone.findIndex(byUid(uid))
  if (i < 0) return null
  const [card] = zone.splice(i, 1)
  unstamp(s, card.uid)
  return card
}
function setZone(s, zone, cards) {
  for (const c of zone.splice(0)) unstamp(s, c.uid)
  for (const c of cards) placeCard(s, zone, c)
}

// --- mise en place des tests (remplacent une zone, sans événement) ---------
export const setJob = (s, p, card) => setZone(s, p.jobs, card ? [card] : [])
export const setMarriage = (s, p, card) => setZone(s, p.marriages, card ? [card] : [])
export const setAdultery = (s, p, card) => setZone(s, p.adultery, card ? [card] : [])
export const setMoney = (s, p, cards) => setZone(s, p.money, cards)
export const setMalus = (s, p, cards) => setZone(s, p.malus, cards)
// pose une carte d'argent (used / on : déjà dépensée)
export function addMoney(s, p, card, { used = false, on = null } = {}) {
  placeCard(s, p.money, card)
  if (used) markUsed(s, card.uid, on)
}
export function putOutOfGame(s, card, cause, by = null) { s.outOfGame.push({ card, cause, by }) }

// ===========================================================================
// Primitives du moteur
// ===========================================================================

// --- journal ---------------------------------------------------------------
// les id du journal sont numérotés dans l'état (partie rejouable à l'identique)
export function log(s, text, kind = 'info') {
  s.nextLogId = (s.nextLogId ?? 0) + 1
  s.log.push({ id: s.nextLogId, text, kind })
  if (s.log.length > 60) s.log.shift()
}

// --- pioche ----------------------------------------------------------------
// mise en place : le paquet mélangé devient la pioche
export function fillDeck(s, cards) {
  s.deck = cards
}

// --- cartes jouées d'office (ARCHITECTURE.md §6.1) ----------------------------
// Une définition avec le tag 'autoPlay' est jouée dès qu'elle sort de la
// pioche, au lieu d'arriver dans une main : main de départ, pioche du tour,
// main complétée, rivière. Options de la définition (lues dans le catalogue,
// jamais copiées sur les cartes) :
//   autoPlay: { withChance, redraw }
//     withChance : jouée d'office aussi quand elle sort par la Chance
//                  (Politique : oui ; Apocalypse : non, elle reste une carte
//                  ordinaire parmi les trois)
//     redraw     : pioche du tour : le joueur pioche une autre carte à la place
//                  (par défaut oui). Une main que l'on complète (main de
//                  départ, fin de tour, Piston, rivière) est toujours complétée.
//   rounds : la carte reste au centre ce nombre de tours de table (meta.timer)
// Jouée d'office = posée au centre (placeCenter), puis le comportement
// onAutoPlay(s, { card, owner: null, drawer }) de la carte, qui peut poser un
// flux (il s'empile sur ce qui est en cours : un achat, la mise en place…).
export const autoPlayOptions = (card) => CATALOGUE[card?.def]?.autoPlay ?? {}
export const playsWhenDrawn = (card, { chance = false } = {}) =>
  hasTag(card, 'autoPlay') && (!chance || !!autoPlayOptions(card).withChance)

function autoPlay(s, drawer, card) {
  emit(s, 'cardDrawn', { player: drawer, card, to: 'center' })
  const who = s.players[drawer]?.name
  log(s, `⚡ ${card.name} est jouée d’office${who ? ` (piochée par ${who})` : ''}`)
  placeCenter(s, card, { by: drawer, rounds: CATALOGUE[card.def]?.rounds ?? null })
  BEHAVIOURS[card.def]?.onAutoPlay?.(s, { card, owner: null, drawer })
}

// SEULE façon dont une carte quitte la pioche. Pioche jusqu'à count cartes
// (moins si la pioche s'épuise) et les envoie :
//   to 'hand'  : dans la main du joueur
//   to 'river' : dans la rivière (at : position, sinon à la fin)
//   to 'aside' : à part, l'appelant les tient (Chance)
// fill : on complète une main (ou la rivière) : une carte jouée d'office est
//        remplacée. chance : pioche de la carte Chance (option withChance).
// → les cartes arrivées à destination (pas celles jouées d'office).
// Événement cardDrawn pour chacune (to 'center' : jouée d'office).
export function draw(s, player, { count = 1, to = 'hand', at = null, fill = false, chance = false } = {}) {
  const drawn = []
  let wanted = count
  while (drawn.length < wanted && s.deck.length > 0) {
    const card = s.deck.pop()
    if (playsWhenDrawn(card, { chance })) {
      autoPlay(s, player ?? s.current, card)
      const replaced = fill || (!chance && autoPlayOptions(card).redraw !== false)
      if (!replaced) wanted -= 1
      continue
    }
    if (to === 'hand') s.players[player].hand.push(card)
    else if (to === 'river') {
      if (at == null) s.river.push(card)
      else s.river.splice(at + drawn.length, 0, card)
    }
    drawn.push(card)
    emit(s, 'cardDrawn', { player, card, to })
  }
  return drawn
}

// complète la main du joueur jusqu'à sa taille (handSize). Événement handRefilled.
export function refill(s, player) {
  const p = s.players[player]
  const missing = Math.max(0, handSize(s, player) - p.hand.length)
  const drawn = draw(s, player, { count: missing, fill: true })
  emit(s, 'handRefilled', { player, count: drawn.length })
}

// mise en place : count cartes du DESSOUS de la pioche mises de côté (spare,
// jamais visibles) → les cartes
export function setAsideFromDeck(s, count) {
  const out = s.deck.splice(0, Math.min(count, s.deck.length))
  s.spare.push(...out)
  return out
}

// --- cartes hors plateau : main, défausse, rivière, hors jeu, cagnotte, spare
// Lieux : { hand: i } | 'discard' | 'river' | 'outOfGame' | 'pot' | 'spare'
function pileOf(s, where) {
  if (where === 'discard') return s.discard
  if (where === 'river') return s.river
  if (where === 'outOfGame') return s.outOfGame
  if (where === 'pot') return s.pot
  if (where === 'spare') return s.spare
  if (where && Number.isInteger(where.hand)) return s.players[where.hand].hand
  throw new Error(`Lieu inconnu : ${JSON.stringify(where)}`)
}
// la défausse et le hors jeu rangent des entrées { card, … }
const cardOfEntry = (where, e) => (where === 'discard' || where === 'outOfGame' ? e.card : e)

// retire la carte uid d'une main, de la défausse ou de la rivière, et la met
// à part → la carte, ou null
export function take(s, from, uid) {
  const pile = pileOf(s, from)
  const i = pile.findIndex((e) => cardOfEntry(from, e).uid === uid)
  if (i < 0) return null
  return cardOfEntry(from, pile.splice(i, 1)[0])
}
// vide une main ou la rivière → les cartes, dans l'ordre
export function takeAll(s, from) {
  const pile = pileOf(s, from)
  return pile.splice(0).map((e) => cardOfEntry(from, e))
}
// range une carte tenue à part :
//   { hand: i }  : à la fin de la main
//   'discard'    : sur la défausse, au nom de by (qui l'a défaussée)
//   'outOfGame'  : hors jeu, avec cause et by (qui l'a causé)
//   'river'      : dans la rivière (at : position)
export function put(s, card, to, { by = null, cause = null, at = null } = {}) {
  if (to === 'discard') s.discard.push({ card, by })
  else if (to === 'outOfGame') s.outOfGame.push({ card, cause, by })
  else if (to === 'river' && at != null) s.river.splice(at, 0, card)
  else pileOf(s, to).push(card)
}
// déplace une carte d'un lieu à un autre (troc de mains…) → la carte, ou null
export function move(s, uid, from, to, opts) {
  const card = take(s, from, uid)
  if (card) put(s, card, to, opts)
  return card
}

// --- plateaux ----------------------------------------------------------------
// Pose une carte sur le plateau du joueur, dans la zone de son type (ou zone),
// avec un nouveau numéro d'ordre. Ne vérifie aucune règle : le reducer l'a
// fait avant (cartes volées, offertes, gagnées : même chemin).
// Événements cardPlaced, et malusReceived pour un malus.
export function place(s, player, card, { zone = ZONE_OF_TYPE[card.type] } = {}) {
  placeCard(s, s.players[player][zone], card)
  emit(s, 'cardPlaced', { player, card, zone })
  if (zone === 'malus') emit(s, 'malusReceived', { player, card })
  return card
}

// où est posée la carte uid ? → { player, zone } ou null ; au centre de la
// table : { player: null, zone: 'center' }
function findOnBoard(s, uid) {
  for (let player = 0; player < s.players.length; player++) {
    const p = s.players[player]
    for (const zone of BOARD_ZONES) if (p[zone].some(byUid(uid))) return { player, zone }
  }
  if (s.center.some(byUid(uid))) return { player: null, zone: 'center' }
  return null
}
const zoneArray = (s, where) => (where.zone === 'center' ? s.center : s.players[where.player][where.zone])

// --- centre de la table ------------------------------------------------------
// Pose une carte au centre (en vigueur pour tout le monde), avec un nouveau
// numéro d'ordre. by : le joueur qui l'a fait venir (rangé dans le timer et
// l'événement). on : la carte du centre qu'elle recouvre (réformes du même
// domaine : celle du dessous reprend quand celle du dessus part). rounds :
// nombre de tours de table (meta.timer). Événement cardPlaced (zone 'center').
export function placeCenter(s, card, { by = null, on = null, rounds = null } = {}) {
  placeCard(s, s.center, card)
  const m = s.meta[card.uid]
  if (on) m.on = on
  if (rounds) m.timer = { left: rounds, by: by ?? s.current }
  emit(s, 'cardPlaced', { player: null, card, zone: 'center', by })
  return card
}

// Le tour passe par le siège `seat` (qu'il y joue ou qu'il passe son tour) :
// chaque carte à durée lancée depuis ce siège perd un tour de table ; à zéro
// elle quitte la table (défausse, cause 'timer'). Appelé par le tour (next).
export function tickTimers(s, seat) {
  for (const card of tableCards(s)) {
    const t = metaOf(s, card.uid)?.timer
    if (!t || t.by !== seat) continue
    t.left -= 1
    if (t.left <= 0) {
      remove(s, card.uid, { cause: 'timer' })
      log(s, `⌛ ${card.name} n’est plus en vigueur`)
    }
  }
}

// --- protection (meta.protectedBy) ---------------------------------------------
// protège une carte posée (by : uid de la carte protectrice, ou un code de
// raison). remove pose la question isProtected avant de la retirer.
export function protect(s, uid, by) {
  const m = s.meta[uid]
  if (m) m.protectedBy = by
}
export function unprotect(s, uid) {
  if (s.meta[uid]) delete s.meta[uid].protectedBy
}
// Réponse de base : protégée si meta.protectedBy est posé. Les comportements
// la modifient (question isProtected : ok = protégée), par exemple pour ne
// protéger que contre les autres joueurs.
export const isProtected = (s, card, owner, { cause = null, by = null } = {}) =>
  ask(s, 'isProtected', { player: owner, card, cause, by },
    () => (metaOf(s, card.uid)?.protectedBy ? { ok: true } : { ok: false })).ok

// --- face cachée (meta.faceDown) -------------------------------------------------
// une carte posée face cachée n'est vue de personne (canSee, view.js)
export function setFaceDown(s, uid, down = true) {
  const m = s.meta[uid]
  if (!m) return
  if (down) m.faceDown = true
  else delete m.faceDown
}
// mélange l'ordre d'une zone d'un plateau (cartes face cachée : on ne sait
// plus laquelle est laquelle)
export function shuffleZone(s, player, zone) {
  const z = s.players[player][zone]
  const mixed = shuffle(z, rngOf(s))
  z.splice(0, z.length, ...mixed)
}

// --- regards temporaires (state.sight, ARCHITECTURE.md §8.1) ----------------------
// viewer (index d'un joueur, ou 'all') voit les cartes uids, où qu'elles soient,
// jusqu'à : 'turn' (fin du tour) ou 'flow' (fin du flux du dessus de la pile
// au moment du regard).
export function addSight(s, viewer, uids, until = 'turn') {
  const entry = { viewer, uids: [...uids], until }
  if (until === 'flow') entry.depth = s.stack.length
  s.sight.push(entry)
  return entry
}
// retire les regards finis : tous ceux « jusqu'à la fin du tour » (turn), ou
// ceux dont le flux a quitté la pile (flow)
export function clearSight(s, until) {
  if (!s.sight?.length) return
  const keep = s.sight.filter((e) =>
    until === 'turn' ? e.until !== 'turn' : !(e.until === 'flow' && e.depth > s.stack.length))
  if (keep.length !== s.sight.length) s.sight.splice(0, s.sight.length, ...keep)
}

// SEULE façon dont une carte posée quitte un plateau.
//   cause : ce qui l'a fait partir ('licenciement', 'attentat', 'vol'…)
//   by    : le joueur qui l'a causé (ou null)
//   to    : 'discard'   — défaussée au nom de son propriétaire
//           'outOfGame' — hors jeu, avec cause et by
//           'aside'     — rendue à l'appelant (Vengeance : le malus est rejoué)
//           { player }  — posée sur le plateau de ce joueur (vol, cadeau)
// Efface sa méta ; les cartes posées sous elle n'y sont plus rattachées.
// Marche aussi pour le centre de la table (défaussée au nom de personne).
// Carte protégée (question isProtected) : elle reste, remove rend null ; le
// reste de l'effet qui l'a visée a lieu quand même.
// Événement cardLeft. → la carte, ou null si elle n'est sur aucun plateau
// ou si elle est protégée.
export function remove(s, uid, { cause, by = null, to = 'discard' }) {
  const where = findOnBoard(s, uid)
  if (!where) return null
  const zone = zoneArray(s, where)
  if (isProtected(s, zone.find(byUid(uid)), where.player, { cause, by })) return null
  const card = liftCard(s, zone, uid)
  if (to === 'discard') put(s, card, 'discard', { by: where.player })
  else if (to === 'outOfGame') put(s, card, 'outOfGame', { cause, by })
  emit(s, 'cardLeft', { player: where.player, zone: where.zone, card, cause, by, to })
  if (to && Number.isInteger(to.player)) place(s, to.player, card)
  return card
}
// retire toutes les cartes d'une zone d'un joueur, dans l'ordre → les cartes
export function removeAll(s, player, zone, opts) {
  return [...s.players[player][zone]].map((c) => remove(s, c.uid, opts))
}
// prend une carte posée chez un autre joueur et la pose chez player
export const steal = (s, uid, player, { cause, by = player }) => remove(s, uid, { cause, by, to: { player } })

// retourne une carte posée : elle compte ses smiles mais n'agit plus
export const flip = (s, uid) => markUsed(s, uid)
// retourne la carte uid et la glisse sous la carte ontoUid (argent qui a payé
// une acquisition, Piston sous le métier qu'il a donné)
export const attach = (s, uid, ontoUid) => markUsed(s, uid, ontoUid)

// --- métier perdu -------------------------------------------------------------
// Démission, licenciement, Policier, Prison, Intérimaire remplacé. Le métier
// est défaussé au nom de son propriétaire (il ne peut pas le reprendre).
// Événement jobLost (le Grand Prix s'y retourne, src/game/cards/base.js).
// → true si un choix reste à faire (Chercheur : carte à défausser, flux
// chercheur-discard posé sur la pile ; le cadre en dessous reprend ensuite).
// Métier protégé (isProtected) : rien ne se passe, → false.
export function loseJob(s, player, { cause, by = null }) {
  const p = s.players[player]
  const job = jobOf(p)
  if (!job) return false
  const handBefore = handSize(s, player)
  // métier protégé : il reste en place
  if (!remove(s, job.uid, { cause, by })) return false
  p.architectFreeUsed = false
  emit(s, 'jobLost', { player, card: job, cause, by })
  // la main rétrécit (Chercheur : 6 → 5) : défausse 1 carte en plus, choisie
  // par le joueur lui-même (action CHERCHEUR_DISCARD), même pendant le tour
  // d'un autre
  if (handSize(s, player) < handBefore && p.hand.length > 0) {
    startFlow(s, 'chercheur-discard', { player })
    return true
  }
  return false
}

// --- tours passés --------------------------------------------------------------
export function skip(s, player, turns) {
  s.players[player].skipTurns += turns
}
