// ---------------------------------------------------------------------------
// Smile Life — événements (ARCHITECTURE.md §6.2)
// Les primitives (primitives.js) et le tour (reducer.js) annoncent ce qui
// s'est passé avec emit(). Les comportements de cartes s'y abonnent dans
// src/game/cards/ : { 'base.xxx': { on: { jobLost(s, ev, self) {…} } } }.
//
// Seules les cartes EN JEU réagissent : posées sur un plateau (malus reçus
// compris) et pas retournées (meta.used), ou sur le dessus du centre de la
// table (owner null). self = { card, owner }.
// Un abonné peut changer l'état par les primitives ; il n'attend jamais un
// joueur (seuls les flux attendent, étape 08). Les événements ne sont pas
// rangés dans l'état : ils sont traités tout de suite, dans l'ordre.
// ---------------------------------------------------------------------------
import { BEHAVIOURS, behavioursVersion, bonusRulesOf } from './cards/index.js'
import { boardCards, metaOf, centerInForce } from './state.js'

// La liste est fermée : un nom inconnu est une erreur.
//  gameSetup     { }                                   partie mise en place
//  turnStart     { player }                            début du tour de player
//  cardDrawn     { player, card, to }                  carte sortie de la pioche (to 'center' : jouée d'office)
//  cardPlaced    { player, card, zone }                carte posée sur un plateau (zone 'center' : player null, by = qui l'a piochée)
//  cardLeft      { player, zone, card, cause, by, to } carte posée qui quitte un plateau ou le centre (player null)
//  jobLost       { player, card, cause, by }           métier perdu
//  malusReceived { player, card }                      malus posé chez player
//  handRefilled  { player, count }                     main complétée
//  turnEnd       { player }                            fin du tour de player
//  roundEnd      { }                                   le tour de table est fini (on repasse par le premier joueur)
//  gameEnd       { }                                   fin de partie
export const EVENTS = [
  'gameSetup', 'turnStart', 'cardDrawn', 'cardPlaced', 'cardLeft', 'jobLost',
  'malusReceived', 'handRefilled', 'turnEnd', 'roundEnd', 'gameEnd',
]

// événement → définitions de cartes abonnées (calculé au premier emit : les
// comportements importent les primitives, qui importent ce fichier)
let LISTENERS = null
let VERSION = -1
function listeners() {
  if (LISTENERS && VERSION === behavioursVersion) return LISTENERS
  VERSION = behavioursVersion
  for (const [id, b] of Object.entries(BEHAVIOURS)) {
    for (const name of Object.keys(b.on ?? {})) {
      if (!EVENTS.includes(name)) throw new Error(`${id} s'abonne à un événement inconnu : ${name}`)
    }
  }
  LISTENERS = Object.fromEntries(EVENTS.map((name) => [
    name,
    new Set(Object.keys(BEHAVIOURS).filter((id) => BEHAVIOURS[id].on?.[name])),
  ]))
  return LISTENERS
}

const inForce = (s, card) => {
  const m = metaOf(s, card.uid)
  return !!m && !m.used
}

export function emit(s, name, ev = {}) {
  const defs = listeners()[name]
  if (!defs) throw new Error(`Événement inconnu : ${name}`)
  // règles bonus des extensions en jeu (sans carte)
  for (const rule of bonusRulesOf(s)) {
    if (!rule.on?.[name]) continue
    if (!EVENTS.includes(name)) throw new Error(`Événement inconnu : ${name}`)
    rule.on[name](s, ev, { card: null, owner: null, rule })
  }
  if (defs.size === 0) return
  // cartes abonnées en jeu au moment de l'événement, joueur par joueur
  const subscribers = []
  s.players.forEach((p, owner) => {
    for (const card of boardCards(p)) if (defs.has(card.def) && inForce(s, card)) subscribers.push({ card, owner })
  })
  // cartes au centre (sans propriétaire)
  for (const card of centerInForce(s)) if (defs.has(card.def)) subscribers.push({ card, owner: null })
  for (const self of subscribers) {
    // un abonné précédent a pu retirer ou retourner cette carte
    if (inForce(s, self.card)) BEHAVIOURS[self.card.def].on[name](s, ev, self)
  }
}
