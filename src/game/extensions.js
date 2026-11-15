// ---------------------------------------------------------------------------
// Smile Life — brancher une extension sur le moteur
// Une extension apporte, sous son id ('gp', 'luxe'…) :
//   defs       ses définitions de cartes (src/data/ext/<id>.js), id '<ext>.<slug>'
//   behaviours ses comportements par id de définition (modifiers, onPlace,
//              onAutoPlay, canPlay, on) — src/game/cards/<id>.js
//   flows      ses flux, par nom '<ext>.<nom>' (même forme que src/game/flows/)
//   setup      ses étapes de mise en place [{ id, run(state) }] (flows/setup.js)
//   bonus      ses règles bonus, sans carte [{ id, modifiers?, on? }] : en
//              vigueur dans toute partie qui choisit l'extension
// Une extension enregistrée n'agit que dans une partie qui la choisit
// (START_GAME { extensions }) : ses cartes ne sont dans la pioche que là.
// Les tests enregistrent une extension factice, 'test' (tests/ext/test-ext.mjs).
// ---------------------------------------------------------------------------
import { registerSet } from '../data/index.js'
import { registerBehaviours, registerBonusRules } from './cards/index.js'
import { registerFlow } from './flows/index.js'
import { registerSetupStep } from './flows/setup.js'

export function registerExtension({ id, defs = [], behaviours = {}, flows = {}, setup = [], bonus = [] }) {
  for (const name of Object.keys(flows))
    if (!name.startsWith(`${id}.`)) throw new Error(`Flux ${name} : le nom doit commencer par « ${id}. »`)
  registerSet(id, defs)
  registerBehaviours(behaviours)
  for (const [name, flow] of Object.entries(flows)) registerFlow(name, flow)
  for (const step of setup) registerSetupStep({ ...step, ext: id })
  if (bonus.length) registerBonusRules(id, bonus)
}
