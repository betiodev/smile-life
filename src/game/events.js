// ---------------------------------------------------------------------------
// Smile Life — événements (ARCHITECTURE.md §6.2)
// Les primitives (primitives.js) et le tour (reducer.js) annoncent ce qui
// s'est passé avec emit(). Les comportements de cartes s'y abonnent dans
// src/game/cards/ : { 'base.xxx': { on: { jobLost(s, ev, self) {…} } } }.
//
// Seules les cartes EN JEU réagissent : posées sur un plateau (malus reçus
// compris) et pas retournées (meta.used). self = { card, owner }.
// Un abonné peut changer l'état par les primitives ; il n'attend jamais un
// joueur (seuls les flux attendent, étape 08). Les événements ne sont pas
// rangés dans l'état : ils sont traités tout de suite, dans l'ordre.
// ---------------------------------------------------------------------------
import { BEHAVIOURS } from './cards/index.js'
import { boardCards, metaOf } from './state.js'

// La liste est fermée : un nom inconnu est une erreur.
//  gameSetup     { }                                   partie mise en place
//  turnStart     { player }                            début du tour de player
//  cardDrawn     { player, card, to }                  carte sortie de la pioche
//  cardPlaced    { player, card, zone }                carte posée sur un plateau
//  cardLeft      { player, zone, card, cause, by, to } carte posée qui quitte un plateau
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

// événement → définitions de cartes abonnées (calculé une fois)
const LISTENERS = Object.fromEntries(EVENTS.map((name) => [
  name,
  new Set(Object.keys(BEHAVIOURS).filter((id) => BEHAVIOURS[id].on?.[name])),
]))
for (const [id, b] of Object.entries(BEHAVIOURS)) {
  for (const name of Object.keys(b.on ?? {})) {
    if (!EVENTS.includes(name)) throw new Error(`${id} s'abonne à un événement inconnu : ${name}`)
  }
}

const inForce = (s, card) => {
  const m = metaOf(s, card.uid)
  return !!m && !m.used
}

export function emit(s, name, ev = {}) {
  const defs = LISTENERS[name]
  if (!defs) throw new Error(`Événement inconnu : ${name}`)
  if (defs.size === 0) return
  // cartes abonnées en jeu au moment de l'événement, joueur par joueur
  const subscribers = []
  s.players.forEach((p, owner) => {
    for (const card of boardCards(p)) if (defs.has(card.def) && inForce(s, card)) subscribers.push({ card, owner })
  })
  for (const self of subscribers) {
    // un abonné précédent a pu retirer ou retourner cette carte
    if (inForce(s, self.card)) BEHAVIOURS[self.card.def].on[name](s, ev, self)
  }
}
