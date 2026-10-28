// ---------------------------------------------------------------------------
// Smile Life — qui a le droit d'agir maintenant ?
// Chaque action de jeu porte `by` (index du joueur qui l'envoie) ; le reducer
// refuse toute action dont l'auteur n'est pas dans whoMustAct(state).
// ---------------------------------------------------------------------------

// Étapes où ce n'est PAS le joueur courant qui choisit.
// Chaque règle reçoit l'état et renvoie la liste des joueurs autorisés,
// ou null si elle ne s'applique pas. Pour ajouter un cas (ex. les donateurs
// de l'Anniversaire), il suffit d'ajouter une règle ici.
const RULES = [
  // Troc du Chef des achats/ventes : l'adversaire visé pioche à l'aveugle
  // une carte non protégée du Chef
  (s) => (s.pending?.type === 'chef-troc' && s.pending.step === 'opp-pick' ? [s.pending.target] : null),
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
