// ---------------------------------------------------------------------------
// Smile Life — primitives (ARCHITECTURE.md §6.1)
// SEUL fichier qui modifie les zones de cartes : pioche, mains, plateaux,
// défausse, hors jeu, rivière. Le reducer et les comportements de cartes
// appellent ces fonctions et ne touchent jamais une zone à la main.
// Les primitives annoncent ce qui s'est passé (événements, src/game/events.js).
//
// Conventions :
//  - l'état d'abord, les joueurs par leur index ;
//  - une carte « à part » (aside) est tenue hors zone par l'appelant : carte
//    forcée, cartes de la Chance, mise du Casino, malus de la Vengeance…
//  - les primitives ne vérifient AUCUNE règle : le reducer valide avant.
// ---------------------------------------------------------------------------
import { handTarget } from './rules.js'
import { jobOf } from './state.js'
import { emit } from './events.js'
import { startFlow } from './flows/index.js'

const byUid = (uid) => (c) => c.uid === uid

// zone du plateau où va chaque type de carte posée
const ZONE_OF_TYPE = {
  study: 'studies', job: 'jobs', salary: 'money', flirt: 'flirts', marriage: 'marriages',
  adultery: 'adultery', child: 'children', acquisition: 'acquisitions',
  distinction: 'distinctions', special: 'specials', malus: 'malus',
}
const BOARD_ZONES = [...new Set(Object.values(ZONE_OF_TYPE))]

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
// la carte quitte la table : son entrée disparaît, et les cartes posées sous
// elle n'y sont plus rattachées (elles restent retournées)
function unstamp(s, uid) {
  delete s.meta[uid]
  for (const m of Object.values(s.meta)) if (m.on === uid) delete m.on
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

// SEULE façon dont une carte quitte la pioche. Pioche jusqu'à count cartes
// (moins si la pioche s'épuise) et les envoie :
//   to 'hand'  : dans la main du joueur
//   to 'river' : dans la rivière (at : position, sinon à la fin)
//   to 'aside' : à part, l'appelant les tient (Chance)
// → les cartes piochées. Événement cardDrawn pour chacune.
export function draw(s, player, { count = 1, to = 'hand', at = null } = {}) {
  const drawn = []
  for (let i = 0; i < count && s.deck.length > 0; i++) {
    const card = s.deck.pop()
    if (to === 'hand') s.players[player].hand.push(card)
    else if (to === 'river') {
      if (at == null) s.river.push(card)
      else s.river.splice(at + i, 0, card)
    }
    drawn.push(card)
    emit(s, 'cardDrawn', { player, card, to })
  }
  return drawn
}

// complète la main du joueur jusqu'à sa taille (handTarget). Événement handRefilled.
export function refill(s, player) {
  const p = s.players[player]
  const missing = Math.max(0, handTarget(p) - p.hand.length)
  const drawn = draw(s, player, { count: missing })
  emit(s, 'handRefilled', { player, count: drawn.length })
}

// --- cartes hors plateau : main, défausse, rivière, hors jeu ---------------
// Lieux : { hand: i } | 'discard' | 'river' | 'outOfGame'
function pileOf(s, where) {
  if (where === 'discard') return s.discard
  if (where === 'river') return s.river
  if (where === 'outOfGame') return s.outOfGame
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

// où est posée la carte uid ? → { player, zone } ou null
function findOnBoard(s, uid) {
  for (let player = 0; player < s.players.length; player++) {
    const p = s.players[player]
    for (const zone of BOARD_ZONES) if (p[zone].some(byUid(uid))) return { player, zone }
  }
  return null
}

// SEULE façon dont une carte posée quitte un plateau.
//   cause : ce qui l'a fait partir ('licenciement', 'attentat', 'vol'…)
//   by    : le joueur qui l'a causé (ou null)
//   to    : 'discard'   — défaussée au nom de son propriétaire
//           'outOfGame' — hors jeu, avec cause et by
//           'aside'     — rendue à l'appelant (Vengeance : le malus est rejoué)
//           { player }  — posée sur le plateau de ce joueur (vol, cadeau)
// Efface sa méta ; les cartes posées sous elle n'y sont plus rattachées.
// Les protections (isProtected) arriveront avec les requêtes (étape 10).
// Événement cardLeft. → la carte, ou null si elle n'est sur aucun plateau.
export function remove(s, uid, { cause, by = null, to = 'discard' }) {
  const where = findOnBoard(s, uid)
  if (!where) return null
  const card = liftCard(s, s.players[where.player][where.zone], uid)
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
// une acquisition)
export const attach = (s, uid, ontoUid) => markUsed(s, uid, ontoUid)

// --- métier perdu -------------------------------------------------------------
// Démission, licenciement, Policier, Prison, Intérimaire remplacé. Le métier
// est défaussé au nom de son propriétaire (il ne peut pas le reprendre).
// Événement jobLost (le Grand Prix s'y retourne, src/game/cards/base.js).
// → true si un choix reste à faire (Chercheur : carte à défausser, flux
// chercheur-discard posé sur la pile ; le cadre en dessous reprend ensuite).
export function loseJob(s, player, { cause, by = null }) {
  const p = s.players[player]
  const job = jobOf(p)
  if (!job) return false
  remove(s, job.uid, { cause, by })
  p.architectFreeUsed = false
  emit(s, 'jobLost', { player, card: job, cause, by })
  // Chercheur : défausse 1 carte en plus (main 6 → 5), choisie par le joueur
  // lui-même (action CHERCHEUR_DISCARD), même pendant le tour d'un autre
  if (job.key === 'chercheur' && p.hand.length > 0) {
    startFlow(s, 'chercheur-discard', { player })
    return true
  }
  return false
}

// --- tours passés --------------------------------------------------------------
export function skip(s, player, turns) {
  s.players[player].skipTurns += turns
}
