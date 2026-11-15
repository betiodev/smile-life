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

// --- cartes spéciales ------------------------------------------------------
// posées sous une autre carte (le Piston sous le métier qu'il a donné)
export const specialsUnder = (s, p, uid) => p.specials.filter((c) => onOf(s, c) === uid)
// les autres (pile des spéciales utilisées) ; un Piston dont le métier est
// perdu y revient (sa méta « on » disparaît avec le métier)
export const looseSpecials = (s, p) => p.specials.filter((c) => !onOf(s, c))

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

// --- pile des flux (ARCHITECTURE.md §6.3, src/game/flows/) ----------------
// state.stack = [cadre du tour, …cadres posés dessus]. Un cadre est une simple
// donnée : { flow, step, data } (flow : 'turn', 'purchase', 'chance'…). Le cadre du dessus
// décide qui agit et ce qui est permis. Le tour est toujours tout en bas
// (pile vide : partie finie). Le joueur du tour est state.current.
export const topFrame = (s) => s.stack?.[s.stack.length - 1] ?? null
export const turnFrame = (s) => (s.stack?.[0]?.flow === 'turn' ? s.stack[0] : null)
// étape du tour : 'draw' (piocher, ou démission / divorce à la place) | 'play'
export const phaseOf = (s) => turnFrame(s)?.step ?? null
// jeux restant ce tour (1 ; Arc-en-ciel : jusqu'à 3 de plus)
export const playsLeft = (s) => turnFrame(s)?.data.plays ?? 0
// Arc-en-ciel joué ce tour : « jusqu'à 3 cartes », on peut s'arrêter
export const isRainbow = (s) => !!turnFrame(s)?.data.rainbow
// une carte a-t-elle déjà été jouée ce tour ?
export const cardPlayedThisTurn = (s) => !!turnFrame(s)?.data.cardPlayed
// carte forcée (prise dans la défausse / la rivière, Étoile filante,
// Astronaute) : elle seule peut être jouée
export const forcedOf = (s) => turnFrame(s)?.data.forced?.card ?? null
// la carte forcée doit-elle vraiment être jouée ? (prise dans la défausse ou
// la rivière : c'est le jeu du tour, pas de défausse ; Étoile filante,
// Astronaute : en plus du jeu, défaussable)
export const mustPlayForced = (s) => !!turnFrame(s)?.data.forced?.consumesPlay
// choix en cours au-dessus du tour (achat, Chance, Piston, Anniversaire…) :
// le cadre du dessus sous la forme { type: flow, step, …data } (tel que le
// flux le montre dans une vue), sinon null
export function choiceOf(s) {
  const top = topFrame(s)
  if (!top || top.flow === 'turn') return null
  return { type: top.flow, step: top.step, ...top.data }
}
