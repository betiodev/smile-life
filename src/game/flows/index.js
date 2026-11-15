// ---------------------------------------------------------------------------
// Smile Life — la pile des flux (ARCHITECTURE.md §6.3)
// state.stack est une liste de CADRES, de simples données :
//   { flow, step, data }
// Le cadre du dessus décide qui agit (actors), ce qui est permis (legal) et
// joue l'action (apply). Le tour est toujours en bas. Jamais de fonction dans
// un cadre : la pile doit survivre à une sauvegarde et à un envoi.
//
// Un flux est un module :
//   start(state, data)            → le premier cadre
//   actors(state, frame)          → qui peut agir maintenant
//   legal(state, frame, actor)    → toutes les actions permises (marche sur une vue)
//   apply(state, frame, action)   → joue l'action (false : refusée) ; peut poser
//                                   un autre flux (startFlow) ou finir (endFlow)
//   resume(state, frame, result, done) → le flux `done` posé au-dessus est fini
//   fallback(state, frame, actor) → l'action par défaut (délai, bot, joueur parti),
//                                   toujours dans legal
//   view(state, frame, viewer)    → ce que ce joueur sait du cadre (ses secrets)
//   held(state, frame)            → (facultatif) cartes tenues à part par le cadre
//
// Les flux s'emboîtent : un Chercheur licencié par une Vengeance pendant un
// Arc-en-ciel, c'est trois cadres (tour > vengeance > chercheur-discard).
// Avant le premier tour, le bas de la pile est la mise en place (setup.js).
// ---------------------------------------------------------------------------
import turn from './turn.js'
import purchase from './purchase.js'
import chance from './chance.js'
import discardPick from './discard-pick.js'
import piston from './piston.js'
import troc from './troc.js'
import chefTroc from './chef-troc.js'
import vengeance from './vengeance.js'
import casinoStake from './casino-stake.js'
import birthday from './birthday.js'
import chercheurDiscard from './chercheur-discard.js'
import journalist from './journalist.js'
import medium from './medium.js'
import setup from './setup.js'
import { topFrame } from '../state.js'
import { clearSight } from '../primitives.js'

// flux ajoutés par les extensions (registerFlow), nommés '<ext>.<nom>'
const EXTRA = {}
export function registerFlow(name, flow) {
  if (EXTRA[name] || BUILT_IN().includes(name)) throw new Error(`Flux en double : ${name}`)
  for (const f of ['start', 'actors', 'legal', 'apply', 'resume', 'fallback', 'view'])
    if (typeof flow[f] !== 'function') throw new Error(`Flux ${name} : ${f} manquant`)
  EXTRA[name] = flow
}
const BUILT_IN = () => Object.keys(builtIn())
const builtIn = () => ({
  setup, turn, purchase, chance, 'discard-pick': discardPick, piston, troc, 'chef-troc': chefTroc,
  vengeance, 'casino-stake': casinoStake, birthday, 'chercheur-discard': chercheurDiscard,
  journalist, medium,
})

// registre lu à l'appel (les modules de flux s'importent entre eux)
export function flowOf(name) {
  const flow = builtIn()[name] ?? EXTRA[name]
  if (!flow) throw new Error(`Flux inconnu : ${name}`)
  return flow
}

// pose un nouveau flux sur la pile → son cadre
export function startFlow(s, name, data = {}) {
  const frame = flowOf(name).start(s, data)
  s.stack.push(frame)
  return frame
}

// le flux du dessus est fini : on le retire et le cadre en dessous reprend
export function endFlow(s, result = null) {
  const done = s.stack.pop()
  // les regards « jusqu'à la fin du flux » (state.sight) de ce cadre sont finis
  clearSight(s, 'flow')
  const below = topFrame(s)
  if (below) flowOf(below.flow).resume(s, below, result, done)
}

// un flux a fini son travail, mais il a peut-être posé un autre flux au-dessus
// de lui (Piston → Journaliste, Vengeance → défausse du Chercheur) : il ne
// sort alors qu'une fois celui-ci fini (étape 'done', puis resumeDone)
export function finishFlow(s, frame, result = null) {
  if (topFrame(s) === frame) endFlow(s, result)
  else frame.step = 'done'
}
export function resumeDone(s, frame) {
  if (frame.step === 'done') endFlow(s)
}

// le cadre qui décide maintenant : celui du dessus (null : partie finie)
export const activeFrame = (s) => topFrame(s)

// action par défaut du joueur actor pour le cadre actif (null : pas de cadre)
export function frameFallback(s, actor) {
  const frame = activeFrame(s)
  if (!frame || !flowOf(frame.flow).actors(s, frame).includes(actor)) return null
  return flowOf(frame.flow).fallback(s, frame, actor) ?? null
}

// cartes tenues à part par les cadres de la pile
export const heldCards = (s) => (s.stack ?? []).flatMap((f) => flowOf(f.flow).held?.(s, f) ?? [])
// la pile vue par un joueur
export const stackView = (s, viewer) => (s.stack ?? []).map((f) => flowOf(f.flow).view(s, f, viewer))

// --- mise en place des tests (comme les set… de primitives.js) -------------
// pose directement un cadre (flux à l'étape step, avec ces données)
export function setFlow(s, flow, step, data = {}) {
  flowOf(flow)
  const frame = { flow, step, data }
  s.stack.push(frame)
  return frame
}
