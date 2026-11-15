// Comportements des cartes du jeu de base.
// Pour l'instant, seulement les réactions aux événements nécessaires au jeu
// actuel ; les règles (requêtes, modificateurs) suivront à l'étape 10.
import { flip, log } from '../primitives.js'

export default {
  // Grand Prix d'excellence : retourné (sans effet, smiles conservés) quand
  // son propriétaire perd son métier
  'base.grandprix': {
    on: {
      jobLost(s, ev, self) {
        if (ev.player !== self.owner) return
        flip(s, self.card.uid)
        log(s, `Le Grand Prix de ${s.players[self.owner].name} est retourné (smiles conservés)`)
      },
    },
  },
}
