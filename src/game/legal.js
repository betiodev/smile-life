// ---------------------------------------------------------------------------
// Smile Life — la liste de toutes les actions permises
// legalActions(state, actor) renvoie chaque action que le joueur `actor` peut
// envoyer maintenant : c'est le cadre du dessus de la pile des flux qui les
// liste (src/game/flows/), paramètres remplis (uid de carte, cible, index…) et
// signées (`by: actor`). Une seule source pour le simulateur, les indices de
// l'interface et, plus tard, les bots.
//
// Fonctionne sur l'état complet comme sur une vue (viewFor) : on n'y lit que
// ce que `actor` a le droit de voir (sa main, les plateaux, la défausse,
// deckCount, le cadre tel que son flux le montre…).
//
// Exceptions voulues :
// - Achat : on ne liste que le paiement valide le moins cher (et l'Architecte) ;
//   le reducer accepte tout paiement que validatePayment accepte.
// - Cadeau d'Anniversaire et défausse du Chercheur : `uid: null` (choix par
//   défaut quand le délai expire) fait partie de la liste.
// ---------------------------------------------------------------------------
import { whoMustAct } from './turn.js'
import { flowOf, activeFrame } from './flows/index.js'

export function legalActions(state, actor) {
  if (!state?.players || state.status !== 'playing') return []
  if (!whoMustAct(state).includes(actor)) return []
  const frame = activeFrame(state)
  if (!frame) return []
  return flowOf(frame.flow).legal(state, frame, actor).map((a) => ({ ...a, by: actor }))
}
// clé stable d'une action (comparer deux listes, chercher une action dans la liste)
export const actionKey = (a) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]]))
