// ---------------------------------------------------------------------------
// Smile Life — accès aux zones du plateau (sélecteurs)
// Les règles, le reducer, le décompte, l'interface et les tests lisent les
// zones UNIQUEMENT par ces fonctions : changer la forme d'une zone ne touche
// alors que ce fichier. Elles marchent sur l'état complet comme sur une vue
// (viewFor), qui a la même forme de plateau.
//
// Ce fichier ne modifie rien : les zones ne changent que par les primitives
// (src/game/primitives.js), qui tiennent aussi state.meta à jour.
// Les limites (un seul métier, un seul mariage…) sont des RÈGLES (rules.js),
// pas des contraintes de forme.
// ---------------------------------------------------------------------------

// Toutes les zones sont des listes de cartes (ARCHITECTURE.md §3.1).

// --- méta des cartes posées (ARCHITECTURE.md §3.2) -------------------------
// state.meta[uid] = { seq, used?, on? } pour chaque carte posée sur un plateau :
//   seq  : ordre de pose, global (state.seqCounter) ; plus grand = plus récent
//   used : retournée après usage (salaire ou Héritage dépensé, Grand Prix sans
//          effet) ; elle compte toujours ses smiles
//   on   : uid de la carte sous laquelle elle est posée (salaires et Héritage
//          sous l'acquisition qu'ils ont payée)
// L'entrée naît quand la carte est posée et disparaît quand elle quitte la
// table (primitives place / remove).
export const metaOf = (s, uid) => s.meta?.[uid] ?? null
export const isUsed = (s, card) => !!metaOf(s, card.uid)?.used
export const onOf = (s, card) => metaOf(s, card.uid)?.on ?? null

// --- métiers ---------------------------------------------------------------
export const jobs = (p) => p.jobs
// le seul métier (ou le premier), null sans métier
export const jobOf = (p) => p.jobs[0] ?? null

// --- mariages --------------------------------------------------------------
export const marriages = (p) => p.marriages
export const marriageOf = (p) => p.marriages[0] ?? null
export const isMarried = (p) => p.marriages.length > 0

// --- adultère (liste d'au plus une carte) ---------------------------------
export const adulteries = (p) => p.adultery
export const adulteryOf = (p) => p.adultery[0] ?? null

// --- flirts ----------------------------------------------------------------
// le flirt du dessus (le plus récent), le seul qui peut être volé
export const topFlirt = (p) => p.flirts[p.flirts.length - 1] ?? null

// --- argent (salaires) -----------------------------------------------------
// Toutes les cartes d'argent du joueur, dépensées ou non
export const moneyOf = (p) => p.money
// non dépensées : peuvent payer, être offertes, être imposées
export const unspentMoney = (s, p) => p.money.filter((c) => !isUsed(s, c))
// posées sous l'acquisition acqUid (elles l'ont payée)
export const moneyPaidFor = (s, p, acqUid) => p.money.filter((c) => isUsed(s, c) && onOf(s, c) === acqUid)
// dépensées pour une acquisition qui a quitté le jeu
export const spentMoney = (s, p) =>
  p.money.filter((c) => isUsed(s, c) && !p.acquisitions.some((a) => a.uid === onOf(s, c)))

// --- malus reçus -----------------------------------------------------------
export const malusOf = (p) => p.malus

// --- hors jeu (zone partagée, publique) -----------------------------------
// Chaque entrée : { card, cause, by } — cause : ce qui a sorti la carte du jeu
// ('attentat'…), by : le joueur qui l'a causé (ou null). Quelles cartes peuvent
// en revenir est une décision propre à chaque extension.
export const outOfGame = (s) => s.outOfGame
export const outOfGameCards = (s) => s.outOfGame.map((e) => e.card)

// --- tout le plateau -------------------------------------------------------
// Toutes les cartes posées devant le joueur (hors main), dans l'ordre du
// tableau de vie : pro, perso, acquisitions, distinctions, spéciales, malus
export const boardCards = (p) => [
  ...p.studies, ...jobs(p), ...moneyOf(p),
  ...p.flirts, ...marriages(p), ...adulteries(p), ...p.children,
  ...p.acquisitions, ...p.distinctions, ...p.specials, ...malusOf(p),
]
