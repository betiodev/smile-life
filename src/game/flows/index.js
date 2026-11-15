// ---------------------------------------------------------------------------
// Smile Life — la pile des flux (ARCHITECTURE.md §6.3)
// state.stack est une liste de CADRES, de simples données :
//   { flow: 'turn' | 'purchase', step, data }
// Le cadre du dessus décide qui agit (actors) et ce qui est permis (legal).
// Le tour est toujours en bas. Jamais de fonction dans un cadre : la pile doit
// survivre à une sauvegarde et à un envoi.
//
// Un flux est un module :
//   start(state, data)            → le premier cadre
//   actors(state, frame)          → qui peut agir maintenant
//   legal(state, frame, actor)    → toutes les actions permises (marche sur une vue)
//   apply(state, frame, action)   → joue l'action (false : refusée) ; peut poser
//                                   un autre flux (startFlow) ou finir (endFlow)
//   resume(state, frame, result)  → le flux posé au-dessus est fini
//   fallback(state, frame, actor) → l'action par défaut (délai, bot, joueur parti),
//                                   toujours dans legal
//   view(state, frame, viewer)    → ce que ce joueur sait du cadre
//   held(state, frame)            → (facultatif) cartes tenues à part par le cadre
//
// Étape 08 : seuls le tour et l'achat sont des flux. Les autres choix sont
// encore dans state.pending (un seul à la fois, au-dessus du tour) ; le moteur
// regarde la pile d'abord, puis pending. L'étape 09 les porte en flux.
// ---------------------------------------------------------------------------
import turn from './turn.js'
import purchase from './purchase.js'
import { topFrame } from '../state.js'

// registre lu à l'appel (les modules de flux s'importent entre eux)
export function flowOf(name) {
  const flow = { turn, purchase }[name]
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
  const below = topFrame(s)
  if (below) flowOf(below.flow).resume(s, below, result, done)
}

// le cadre qui décide maintenant, s'il est au-dessus d'un choix pending :
// un flux posé sur le tour l'emporte ; le tour, lui, attend que pending soit
// résolu. → le cadre, ou null (c'est pending qui décide, ou partie finie)
export function activeFrame(s) {
  const top = topFrame(s)
  if (!top) return null
  if (top.flow !== 'turn') return top
  return s.pending ? null : top
}

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
