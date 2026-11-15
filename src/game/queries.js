// ---------------------------------------------------------------------------
// Smile Life — requêtes, modificateurs et précédence (ARCHITECTURE.md §5)
//
// Le moteur pose une liste FERMÉE de questions (QUERIES). Chacune a une
// réponse de base (la règle du jeu de base, dans rules.js) que les cartes en
// jeu peuvent modifier. Une carte déclare ses modificateurs dans son
// comportement (src/game/cards/) :
//
//   'base.garagiste': { modifiers: [{
//     query: 'canTarget', scope: 'target',
//     when: (q) => q.card.key === 'accident',
//     effect: { forbid: 'Le Garagiste ne subit aucun accident' },
//   }] }
//
// scope : à qui s'applique le modificateur, par rapport au propriétaire de
// la carte (owner) :
//   'owner'    la question porte sur le propriétaire (q.player === owner)
//   'target'   le propriétaire est la cible (q.target === owner)
//   'everyone' tout le monde
// when(q, self, state) : condition facultative ; self = { card, owner }.
// effect : un objet, ou une fonction (q, self, state) → objet (ou null) :
//   oui/non    allow | forbid: 'raison en français'
//   nombres    set, add, multiply, min (au moins), max (au plus)
//   ensembles  replace, include, exclude (listes)
//   optional: true — l'effet est un choix du joueur (Architecte : maison
//   offerte OU payée) ; ignoré sauf si on demande { withOptional: true }.
//
// Une carte est EN JEU (ses modificateurs comptent) quand elle est posée sur
// un plateau (malus reçus compris) et pas retournée (meta.used), ou au centre
// de la table sur le dessus de sa pile (source 'global', sans propriétaire :
// seule la portée 'everyone' la concerne). Les règles bonus d'une extension
// en jeu (source 'bonus', sans carte : registerBonusRules) comptent toujours,
// comme un effet personnel. Les personnages viendront avec Fantastique.
//
// Toutes les réponses sont combinées par UNE fonction, resolve() : c'est le
// seul endroit où la précédence est décidée (§5.3, INTERACTIONS.md G1–G4).
// Les questions marchent sur l'état complet comme sur une vue (viewFor).
// ---------------------------------------------------------------------------
import { BEHAVIOURS, behavioursVersion, bonusRulesOf } from './cards/index.js'
import { boardCards, malusOf, metaOf, centerInForce } from './state.js'

// --- la liste des questions (§5.1) -------------------------------------------
// kind : 'bool' (réponse { ok, reason }), 'number', 'set' (liste triée)
// bounds : bornes imprimées, appliquées en dernier
// Les questions marquées « plus tard » sont déclarées pour fermer la liste ;
// le moteur ne les pose pas encore (aucune carte du jeu de base n'en a besoin).
export const QUERIES = {
  canPlace: { kind: 'bool' },        // poser une carte devant soi { player, card }
  canTarget: { kind: 'bool' },       // jouer un malus { player: attaquant, card, target }
  isProtected: { kind: 'bool' },     // la carte posée est-elle protégée ? { player: propriétaire, card, cause, by } (remove, primitives.js) ; ok = protégée
  salaryLevels: { kind: 'set', bounds: { min: 1, max: 4 } }, // niveaux de salaire posables { player }
  studyLevel: { kind: 'number', bounds: { min: 0 } },        // niveau d'études { player }
  studyReq: { kind: 'number', bounds: { min: 0 } },          // études requises { player, card }
  jobSlots: { kind: 'number', bounds: { min: 0 } },          // { player }
  marriageSlots: { kind: 'number', bounds: { min: 0 } },     // { player }
  flirtLimit: { kind: 'number', bounds: { min: 0 } },        // { player }
  studyCardLimit: { kind: 'number', bounds: { min: 0 } },    // { player }
  canHaveChild: { kind: 'bool' },    // { player }
  price: { kind: 'number', bounds: { min: 0 }, round: 'up' }, // prix d'une acquisition { player, card }
  paymentRule: { kind: 'value' },    // règle de paiement { player } : 'necessary' | 'exact' (rules.js)
  handSize: { kind: 'number', bounds: { min: 0 } },          // taille de main { player }
  canDiscard: { kind: 'bool' },      // défausser une carte de sa main { player, card }
  drawMode: { kind: 'value' },       // plus tard
  skipLength: { kind: 'number', bounds: { min: 0 } },        // plus tard
  cardSmiles: { kind: 'number' },    // smiles d'une carte posée { player, card } (scoring.js)
  scoreBonus: { kind: 'number' },    // bonus de fin de partie { player, subtotals } (scoring.js)
  nextPlayer: { kind: 'value' },     // plus tard
}

// sources d'un effet ; 'global' = carte au centre (réforme, crise…), les
// autres sont des effets personnels
export const SOURCES = ['personal', 'malus', 'character', 'global', 'bonus']
const isGlobal = (c) => c.source === 'global'

const OK = { ok: true }
const NO = (reason) => ({ ok: false, reason })

// --- index : question → définitions qui la modifient (calculé une fois) ------
let INDEX = null
let INDEX_VERSION = -1
function index() {
  if (INDEX && INDEX_VERSION === behavioursVersion) return INDEX
  INDEX_VERSION = behavioursVersion
  INDEX = Object.fromEntries(Object.keys(QUERIES).map((q) => [q, new Set()]))
  for (const [id, b] of Object.entries(BEHAVIOURS)) {
    for (const m of b.modifiers ?? []) {
      if (!INDEX[m.query]) throw new Error(`${id} modifie une question inconnue : ${m.query}`)
      if (!['owner', 'target', 'everyone'].includes(m.scope)) throw new Error(`${id} : portée inconnue ${m.scope}`)
      INDEX[m.query].add(id)
    }
  }
  return INDEX
}

const inForce = (s, card) => {
  const m = metaOf(s, card.uid)
  return !!m && !m.used
}

const appliesTo = (m, q, owner) =>
  m.scope === 'everyone' || (m.scope === 'owner' && q.player === owner) || (m.scope === 'target' && q.target === owner)

// Contributions des cartes en jeu à la question `name` posée avec q :
// [{ source, seq, card, owner, effect }], dans l'ordre des plateaux
export function collect(s, name, q) {
  const defs = index()[name]
  if (!defs) throw new Error(`Question inconnue : ${name}`)
  const out = []
  if (defs.size === 0 && !bonusRulesOf(s).length) return out
  s.players.forEach((p, owner) => {
    const malus = new Set(malusOf(p).map((c) => c.uid))
    for (const card of boardCards(p)) {
      if (!defs.has(card.def) || !inForce(s, card)) continue
      const self = { card, owner }
      for (const m of BEHAVIOURS[card.def].modifiers) {
        if (m.query !== name || !appliesTo(m, q, owner)) continue
        if (m.when && !m.when(q, self, s)) continue
        const effect = typeof m.effect === 'function' ? m.effect(q, self, s) : m.effect
        if (!effect) continue
        out.push({ source: malus.has(card.uid) ? 'malus' : 'personal', seq: metaOf(s, card.uid).seq, card, owner, effect })
      }
    }
  })
  // cartes au centre de la table (réformes, crises…) : source 'global',
  // sans propriétaire ; seule la carte du dessus d'une pile compte
  for (const card of centerInForce(s)) {
    if (!defs.has(card.def)) continue
    const self = { card, owner: null }
    for (const m of BEHAVIOURS[card.def].modifiers) {
      if (m.query !== name || !appliesTo(m, q, null)) continue
      if (m.when && !m.when(q, self, s)) continue
      const effect = typeof m.effect === 'function' ? m.effect(q, self, s) : m.effect
      if (!effect) continue
      out.push({ source: 'global', seq: metaOf(s, card.uid).seq, card, owner: null, effect })
    }
  }
  // règles bonus des extensions en jeu : sans carte ni propriétaire (seq 0)
  for (const rule of bonusRulesOf(s)) {
    const self = { card: null, owner: null, rule }
    for (const m of rule.modifiers ?? []) {
      if (m.query !== name || !appliesTo(m, q, null)) continue
      if (m.when && !m.when(q, self, s)) continue
      const effect = typeof m.effect === 'function' ? m.effect(q, self, s) : m.effect
      if (!effect) continue
      out.push({ source: 'bonus', seq: 0, card: null, owner: null, rule: rule.id, effect })
    }
  }
  return out
}

// Le joueur ignore-t-il les cartes globales qui interdisent (ministres,
// président : Politique) ? Une carte le déclare par ignoresGlobal: true.
function exemptFromGlobal(s, player) {
  const p = s.players[player]
  if (!p) return false
  return boardCards(p).some((c) => BEHAVIOURS[c.def]?.ignoresGlobal && inForce(s, c))
}

// la contribution au plus grand seq (à égalité : la dernière de la liste)
const latest = (list) => list.reduce((best, c) => (!best || c.seq >= best.seq ? c : best), null)

// ===========================================================================
// resolve(query, base, contributions, { exempt, withOptional })
// → la réponse. SEUL endroit où la précédence est décidée.
//
// Oui/non (base = { ok, reason } ; base.hard : condition préalable qu'aucun
// effet ne lève, ex. « La cible doit avoir un métier ») :
//   §5.3-4  une carte globale qui interdit l'emporte, sauf pour un joueur
//           exempté (exempt) ;
//   §5.3-2  sinon, entre effets personnels qui se contredisent, le plus
//           récent (seq) l'emporte ;
//   §5.3-5  une interdiction personnelle tient même si une carte globale
//           autorise (les effets personnels passent avant) ;
//   sinon une carte globale qui autorise, sinon la réponse de base.
// Nombres :
//   §5.3-1  « devient X » (set) d'abord, le plus récent l'emporte ; puis les
//           + / −, puis les ×, puis l'arrondi de la question (prix : au-dessus),
//           puis min / max, puis les bornes imprimées ;
//   §5.3-3  un effet personnel « illimité » (set: Infinity) l'emporte sur une
//           limite fixée par une carte globale.
// Ensembles (niveaux de salaire) : replace (le plus récent), puis include,
// puis exclude, puis les bornes.
// ===========================================================================
export function resolve(query, base, contributions, { exempt = false, withOptional = false } = {}) {
  const def = QUERIES[query]
  if (!def) throw new Error(`Question inconnue : ${query}`)
  const list = contributions.filter((c) => withOptional || !c.effect.optional)
  if (def.kind === 'bool') return resolveBool(base, list, exempt)
  if (def.kind === 'number') return resolveNumber(base, list, def)
  if (def.kind === 'set') return resolveSet(base, list, def.bounds)
  // 'value' : seul « devient X » a un sens, le plus récent l'emporte
  const set = latest(list.filter((c) => 'set' in c.effect))
  return set ? set.effect.set : base
}

const strip = (a) => (a.ok ? OK : NO(a.reason))
const verdict = (c) => ('forbid' in c.effect ? NO(c.effect.forbid) : OK)
const speaks = (c) => 'allow' in c.effect || 'forbid' in c.effect

function resolveBool(base, list, exempt) {
  if (base.hard) return strip(base)
  const votes = list.filter(speaks)
  const globals = votes.filter(isGlobal)
  const personal = votes.filter((c) => !isGlobal(c))
  if (!exempt) {
    const ban = latest(globals.filter((c) => 'forbid' in c.effect))
    if (ban) return verdict(ban)
  }
  if (personal.length) return verdict(latest(personal))
  if (globals.some((c) => 'allow' in c.effect)) return OK
  return strip(base)
}

function bound(n, bounds = {}) {
  if (bounds.min != null && n < bounds.min) n = bounds.min
  if (bounds.max != null && n > bounds.max) n = bounds.max
  return n
}

function resolveNumber(base, list, { bounds, round }) {
  let n = base
  const sets = list.filter((c) => 'set' in c.effect)
  const unlimited = sets.find((c) => !isGlobal(c) && c.effect.set === Infinity)
  const set = unlimited && sets.some(isGlobal) ? unlimited : latest(sets)
  if (set) n = set.effect.set
  for (const c of list) if ('add' in c.effect) n += c.effect.add
  for (const c of list) if ('multiply' in c.effect) n *= c.effect.multiply
  // prix : une moitié de prix s'arrondit au-dessus (maison à 5 → 3)
  if (round === 'up') n = Math.ceil(n)
  for (const c of list) if ('min' in c.effect) n = Math.max(n, c.effect.min)
  for (const c of list) if ('max' in c.effect) n = Math.min(n, c.effect.max)
  return bound(n, bounds)
}

function resolveSet(base, list, bounds = {}) {
  const replace = latest(list.filter((c) => 'replace' in c.effect))
  const out = new Set(replace ? replace.effect.replace : base)
  for (const c of list) for (const v of c.effect.include ?? []) out.add(v)
  for (const c of list) for (const v of c.effect.exclude ?? []) out.delete(v)
  return [...out].filter((v) => bound(v, bounds) === v).sort((a, b) => a - b)
}

// ===========================================================================
// ask(state, query, q, base, opts) : pose la question. base = la réponse du
// jeu de base (valeur, ou fonction qui la calcule). opts.withOptional : compte
// aussi les effets au choix du joueur.
// ===========================================================================
export function ask(s, query, q, base, { withOptional = false } = {}) {
  const b = typeof base === 'function' ? base() : base
  if (QUERIES[query]?.kind === 'bool' && b.hard) return strip(b)
  return resolve(query, b, collect(s, query, q), { exempt: exemptFromGlobal(s, q.player), withOptional })
}

// la contribution décisive d'une question numérique « devient X » (pour le
// journal : « voyage gratuit (Pilote) ») → la contribution, ou null
export function setBy(s, query, q) {
  return latest(collect(s, query, q).filter((c) => 'set' in c.effect && !c.effect.optional))
}
