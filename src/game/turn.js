// ---------------------------------------------------------------------------
// Smile Life — qui a le droit d'agir maintenant ?
// Chaque action de jeu porte `by` (index du joueur qui l'envoie) ; le reducer
// refuse toute action dont l'auteur n'est pas dans whoMustAct(state).
// C'est le cadre du dessus de la pile des flux (src/game/flows/) qui le dit.
// ---------------------------------------------------------------------------

import { flowOf, activeFrame, frameFallback } from './flows/index.js'

export function whoMustAct(state) {
  const frame = activeFrame(state)
  if (frame) return flowOf(frame.flow).actors(state, frame)
  return [state.current]
}

export function canAct(state, by) {
  return whoMustAct(state).includes(by)
}

// ---------------------------------------------------------------------------
// Action par défaut d'un joueur qui doit agir mais ne le fait pas à temps.
// Le moteur ne connaît pas le temps : c'est le pilote (src/session/driver.js)
// qui décide quand l'appliquer. null : pas d'action par défaut minutée.
// Chaque flux posé sur le tour (achat, Chance, Piston, Troc, Anniversaire,
// défausse du Chercheur…) a la sienne : le fallback du cadre du dessus. Le
// tour lui-même n'est pas minuté (on prend le temps de réfléchir à son jeu).
// ---------------------------------------------------------------------------
export function fallbackAction(state, seat) {
  if (state?.status !== 'playing' || !canAct(state, seat)) return null
  if (activeFrame(state)?.flow === 'turn') return null
  const a = frameFallback(state, seat)
  return a && { ...a, by: seat }
}

// Action par défaut de n'importe quelle attente, tour compris : le fallback du
// cadre du dessus. Pour les bots et les joueurs partis (plus tard).
export function defaultAction(state, seat) {
  if (state?.status !== 'playing' || !canAct(state, seat)) return null
  const a = frameFallback(state, seat)
  return a && { ...a, by: seat }
}
