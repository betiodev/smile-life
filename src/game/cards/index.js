// Comportements des cartes, par id de définition (ARCHITECTURE.md §0, §6.2).
// Une extension ajoute les siens par registerBehaviours (src/game/extensions.js).
// Les définitions (src/data/) restent des données sans fonction.
import base from './base.js'

export const BEHAVIOURS = { ...base }

// numéro de version du registre : les index calculés à partir des
// comportements (queries.js, events.js) se recalculent quand il change
export let behavioursVersion = 0

export function registerBehaviours(behaviours) {
  for (const id of Object.keys(behaviours)) {
    if (BEHAVIOURS[id]) throw new Error(`Comportement en double : ${id}`)
  }
  Object.assign(BEHAVIOURS, behaviours)
  behavioursVersion += 1
}
