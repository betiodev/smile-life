// ---------------------------------------------------------------------------
// Smile Life — la mise en place (ARCHITECTURE.md §2.3)
// Premier cadre de la partie, tout en bas de la pile, avant le premier tour.
// Il joue une liste d'ÉTAPES, dans l'ordre : celles du jeu de base (donner
// 5 cartes à chacun, remplir la rivière), puis celles des extensions en jeu
// (registerSetupStep, src/game/extensions.js : personnages de Fantastique…).
// Une étape est { id, ext, run(state) } ; run peut poser un flux (une carte
// jouée d'office dans une main de départ, un choix) : la mise en place attend
// alors qu'il soit fini, puis passe à l'étape suivante. À la fin : message de
// début, événement gameSetup, premier tour (beginTurn remplace ce cadre).
//
// data = { steps: [id…], next } — des noms, jamais de fonctions.
// Le cadre lui-même n'attend personne : quand il est en haut de la pile, il
// avance tout de suite.
// ---------------------------------------------------------------------------
import { draw, log } from '../primitives.js'
import { emit } from '../events.js'
import { topFrame } from '../state.js'
import { beginTurn } from './turn.js'

const copy = (x) => JSON.parse(JSON.stringify(x))

// étapes du jeu de base
const STEPS = [
  { id: 'base.deal', ext: 'base', run(s) { s.players.forEach((_, i) => draw(s, i, { count: 5, fill: true })) } },
  { id: 'base.river', ext: 'base', run(s) { if (s.riverEnabled) draw(s, null, { count: 3, to: 'river', fill: true }) } },
]

// une extension ajoute une étape (après celles du jeu de base et des
// extensions enregistrées avant elle)
export function registerSetupStep(step) {
  if (STEPS.some((x) => x.id === step.id)) throw new Error(`Étape de mise en place en double : ${step.id}`)
  if (typeof step.run !== 'function') throw new Error(`Étape ${step.id} : run manquant`)
  STEPS.push(step)
}

// étapes de la partie : le jeu de base et les extensions en jeu
const stepsFor = (s) => STEPS.filter((x) => x.ext === 'base' || s.extensions.includes(x.ext)).map((x) => x.id)

// joue les étapes jusqu'à la fin, ou jusqu'à ce qu'une étape attende un joueur
function advance(s, frame) {
  while (topFrame(s) === frame) {
    const id = frame.data.steps[frame.data.next]
    if (id == null) return finish(s)
    frame.data.next += 1
    STEPS.find((x) => x.id === id).run(s)
  }
}

function finish(s) {
  log(s, `🎉 La partie commence ! ${s.players.map((p) => p.name).join(', ')}`)
  emit(s, 'gameSetup')
  beginTurn(s)
}

const setup = {
  start: (s) => ({ flow: 'setup', step: 'run', data: { steps: stepsFor(s), next: 0 } }),
  // personne : le cadre avance tout seul (seuls les flux posés dessus attendent)
  actors: () => [],
  legal: () => [],
  apply: () => false,
  // le flux posé au-dessus est fini : étape suivante
  resume(s, frame) { advance(s, frame) },
  fallback: () => null,
  view: (state, frame) => copy(frame),
}

export default setup

// lance la mise en place d'une partie neuve (reducer.js)
export function runSetup(s) {
  const frame = setup.start(s)
  s.stack.push(frame)
  advance(s, frame)
}
