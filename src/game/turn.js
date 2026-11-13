// ---------------------------------------------------------------------------
// Smile Life — qui a le droit d'agir maintenant ?
// Chaque action de jeu porte `by` (index du joueur qui l'envoie) ; le reducer
// refuse toute action dont l'auteur n'est pas dans whoMustAct(state).
// ---------------------------------------------------------------------------

// Étapes où ce n'est PAS le joueur courant qui choisit.
// Chaque règle reçoit l'état et renvoie la liste des joueurs autorisés,
// ou null si elle ne s'applique pas. Pour ajouter un cas, il suffit
// d'ajouter une règle ici.
const RULES = [
  // Troc du Chef des achats/ventes : l'adversaire visé pioche à l'aveugle
  // une carte non protégée du Chef
  (s) => (s.pending?.type === 'chef-troc' && s.pending.step === 'opp-pick' ? [s.pending.target] : null),
  // Anniversaire : les donateurs qui n'ont pas encore offert leur salaire
  // (dans n'importe quel ordre ; le joueur fêté attend)
  (s) => (s.pending?.type === 'birthday' ? s.pending.donors.filter((i) => !(i in s.pending.gifts)) : null),
  // Chercheur qui perd son métier (Licenciement, démission) : lui seul choisit
  // la carte qu'il défausse, même pendant le tour d'un autre joueur
  (s) => (s.pending?.type === 'chercheur-discard' ? [s.pending.player] : null),
]

export function whoMustAct(state) {
  for (const rule of RULES) {
    const who = rule(state)
    if (who) return who
  }
  return [state.current]
}

export function canAct(state, by) {
  return whoMustAct(state).includes(by)
}

// ---------------------------------------------------------------------------
// Action par défaut d'un joueur qui doit agir mais ne le fait pas à temps.
// Le moteur ne connaît pas le temps : c'est le pilote (src/session/driver.js)
// qui décide quand l'appliquer. null : pas d'action par défaut (on attend).
//  - Anniversaire : uid null → le moteur offre le plus petit salaire libre ;
//  - Chercheur qui perd son métier : uid null → une carte au hasard.
// ---------------------------------------------------------------------------
export function fallbackAction(state, seat) {
  if (state?.status !== 'playing' || !canAct(state, seat)) return null
  const pend = state.pending
  if (pend?.type === 'birthday') return { type: 'BIRTHDAY_GIFT', uid: null, by: seat }
  if (pend?.type === 'chercheur-discard') return { type: 'CHERCHEUR_DISCARD', uid: null, by: seat }
  return null
}
