# Smile Life 😄

Version digitale complète et jouable du jeu de cartes **Smile Life** (par Alexandre Seba) — application web React pour **2 à 5 joueurs** en multijoueur local (écran partagé, mains cachées).

Piochez et jouez des cartes pour construire votre vie professionnelle et personnelle, accumulez des **smiles** (points de bonheur)… ou sabotez la vie des adversaires avec des cartes malus. Quand la pioche est vide, le joueur avec le plus de smiles gagne !

## Lancer le jeu

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production (dossier dist/)
```

## Contenu

- **Les 200 cartes du jeu** : 25 études, 30 métiers (statuts Fonctionnaire/Intérimaire, avantages permanents et instantanés), 40 salaires, 20 flirts, 7 mariages, 3 adultères, 10 enfants, 37 malus, 10 cartes spéciales, 15 acquisitions, 3 distinctions.
- **Moteur de règles complet** : conditions de pose, immunités professionnelles (Garagiste, Avocat, Bandit, Fonctionnaires…), vol de flirt, Policier qui bloque Bandit/Gourou, Militaire qui empêche l'Attentat, promotion Grand Prof, Grand Prix d'excellence, Légion d'honneur, bonus Licorne, Casino persistant, achats par investissement de salaires (héritage, prix marié ÷2, offre Architecte, voyages gratuits du Pilote)…
- **Actions spéciales** : démission et divorce volontaire (à la place de la pioche), arrêt d'adultère.
- **Variante Rivière** (optionnelle) : 3 cartes face visible prenables à la place de la pioche.
- **Écran partagé** : transition « Passez à [joueur] » qui cache les mains, résumé public des adversaires, journal d'actions, décompte final détaillé par catégorie avec confettis.

## Structure du code

```
src/
  data/cards.js        # données des 200 cartes + construction du paquet
  game/rules.js        # moteur de validation (toutes les règles de placement)
  game/reducer.js      # machine à états du jeu (useReducer)
  game/scoring.js      # décompte des smiles par catégorie
  components/          # écrans (Setup, Transition, Game, GameOver), cartes, modales
```

Stack : React 18 (hooks, `useReducer`), Tailwind CSS 4, Vite. Tout l'état vit en mémoire React — aucun stockage externe.
