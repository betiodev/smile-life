// ---------------------------------------------------------------------------
// Smile Life — accès aux zones du plateau (sélecteurs)
// Les règles, le reducer, le décompte, l'interface et les tests lisent les
// zones UNIQUEMENT par ces fonctions : changer la forme d'une zone ne touche
// alors que ce fichier. Elles marchent sur l'état complet comme sur une vue
// (viewFor), qui a la même forme de plateau.
//
// Les fonctions « écrivain » (add…, take…, set…) modifient le joueur en place :
// réservées au moteur (src/game/) et à la mise en place des tests.
// Les limites (un seul métier, un seul mariage…) sont des RÈGLES (rules.js),
// pas des contraintes de forme.
// ---------------------------------------------------------------------------

const byUid = (uid) => (c) => c.uid === uid

// Toutes les zones sont des listes de cartes (ARCHITECTURE.md §3.1).
// Entrées de money : { card, invested, paidFor } jusqu'à l'étape 06 (state.meta).

// petits outils communs aux zones « liste de cartes »
function take(zone, uid) {
  const i = zone.findIndex(byUid(uid))
  return i >= 0 ? zone.splice(i, 1)[0] : null
}

// --- métiers ---------------------------------------------------------------
export const jobs = (p) => p.jobs
// le seul métier (ou le premier), null sans métier
export const jobOf = (p) => p.jobs[0] ?? null
export function addJob(p, card) { p.jobs.push(card) }
export const removeJob = (p, uid) => take(p.jobs, uid)
// mise en place (tests) : remplace tous les métiers
export function setJob(p, card) { p.jobs = card ? [card] : [] }

// --- mariages --------------------------------------------------------------
export const marriages = (p) => p.marriages
export const marriageOf = (p) => p.marriages[0] ?? null
export const isMarried = (p) => p.marriages.length > 0
export function addMarriage(p, card) { p.marriages.push(card) }
export const removeMarriage = (p, uid) => take(p.marriages, uid)
export function setMarriage(p, card) { p.marriages = card ? [card] : [] }

// --- adultère (liste d'au plus une carte) ---------------------------------
export const adulteries = (p) => p.adultery
export const adulteryOf = (p) => p.adultery[0] ?? null
export function addAdultery(p, card) { p.adultery.push(card) }
export const removeAdultery = (p, uid) => take(p.adultery, uid)
export function setAdultery(p, card) { p.adultery = card ? [card] : [] }

// --- flirts ----------------------------------------------------------------
// le flirt du dessus (le plus récent), le seul qui peut être volé
export const topFlirt = (p) => p.flirts[p.flirts.length - 1] ?? null

// --- argent (salaires) -----------------------------------------------------
// Toutes les cartes d'argent du joueur, investies ou non
export const moneyOf = (p) => p.money.map((m) => m.card)
// non investies : peuvent payer, être offertes, être imposées
export const unspentMoney = (p) => p.money.filter((m) => !m.invested).map((m) => m.card)
// posées sous l'acquisition acqUid (elles l'ont payée)
export const moneyPaidFor = (p, acqUid) =>
  p.money.filter((m) => m.invested && m.paidFor === acqUid).map((m) => m.card)
// investies dans une acquisition qui a quitté le jeu
export const spentMoney = (p) =>
  p.money.filter((m) => m.invested && !p.acquisitions.some((a) => a.uid === m.paidFor)).map((m) => m.card)
export function addMoney(p, card, { invested = false, paidFor } = {}) {
  p.money.push(invested ? { card, invested, paidFor } : { card, invested })
}
// retire une carte d'argent NON investie → la carte, ou null
export function takeMoney(p, uid) {
  const i = p.money.findIndex((m) => m.card.uid === uid && !m.invested)
  return i >= 0 ? p.money.splice(i, 1)[0].card : null
}
export function investMoney(p, uid, acqUid) {
  const m = p.money.find((x) => x.card.uid === uid && !x.invested)
  if (m) { m.invested = true; m.paidFor = acqUid }
}
// mise en place (tests) : cartes d'argent, toutes non investies
export function setMoney(p, cards) { p.money = cards.map((card) => ({ card, invested: false })) }

// --- malus reçus -----------------------------------------------------------
export const malusOf = (p) => p.malus
export function addMalus(p, card) { p.malus.push(card) }
export const takeMalus = (p, uid) => take(p.malus, uid)
export function setMalus(p, cards) { p.malus = [...cards] }

// --- hors jeu (zone partagée, publique) -----------------------------------
// Chaque entrée : { card, cause, by } — cause : ce qui a sorti la carte du jeu
// ('attentat'…), by : le joueur qui l'a causé (ou null). Quelles cartes peuvent
// en revenir est une décision propre à chaque extension.
export const outOfGame = (s) => s.outOfGame
export const outOfGameCards = (s) => s.outOfGame.map((e) => e.card)
export function putOutOfGame(s, card, cause, by = null) { s.outOfGame.push({ card, cause, by }) }

// --- tout le plateau -------------------------------------------------------
// Toutes les cartes posées devant le joueur (hors main), dans l'ordre du
// tableau de vie : pro, perso, acquisitions, distinctions, spéciales, malus
export const boardCards = (p) => [
  ...p.studies, ...jobs(p), ...moneyOf(p),
  ...p.flirts, ...marriages(p), ...adulteries(p), ...p.children,
  ...p.acquisitions, ...p.distinctions.map((d) => d.card), ...p.specials, ...malusOf(p),
]
