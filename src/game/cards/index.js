// Comportements des cartes, par id de définition (ARCHITECTURE.md §0, §6.2).
// Une extension ajoute les siens par registerBehaviours (src/game/extensions.js).
// Les définitions (src/data/) restent des données sans fonction.
import base from './base.js'

export const BEHAVIOURS = { ...base }

// numéro de version du registre : les index calculés à partir des
// comportements (queries.js, events.js) se recalculent quand il change
export let behavioursVersion = 0

// règles bonus des extensions (Four Women, Ladies Night, Anarchie…) : des
// comportements sans carte, { id, ext, modifiers?, on? }, en vigueur dans
// toute partie où leur extension est choisie (state.extensions)
export const BONUS_RULES = []
export function registerBonusRules(ext, rules) {
  for (const r of rules) {
    if (BONUS_RULES.some((x) => x.id === r.id)) throw new Error(`Règle bonus en double : ${r.id}`)
    BONUS_RULES.push({ ...r, ext })
  }
  behavioursVersion += 1
}
// règles bonus en vigueur dans cette partie (marche sur une vue)
export const bonusRulesOf = (s) => BONUS_RULES.filter((r) => (s.extensions ?? []).includes(r.ext))

export function registerBehaviours(behaviours) {
  for (const id of Object.keys(behaviours)) {
    if (BEHAVIOURS[id]) throw new Error(`Comportement en double : ${id}`)
  }
  Object.assign(BEHAVIOURS, behaviours)
  behavioursVersion += 1
}
