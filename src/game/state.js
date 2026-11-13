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

// --- métiers ---------------------------------------------------------------
export const jobs = (p) => (p.job ? [p.job] : [])
// le seul métier (ou le premier), null sans métier
export const jobOf = (p) => jobs(p)[0] ?? null
export function addJob(p, card) { p.job = card }
export function removeJob(p, uid) {
  if (p.job?.uid !== uid) return null
  const c = p.job
  p.job = null
  return c
}
// mise en place (tests) : remplace tous les métiers
export function setJob(p, card) { p.job = card ?? null }

// --- mariages --------------------------------------------------------------
export const marriages = (p) => (p.marriage ? [p.marriage] : [])
export const marriageOf = (p) => marriages(p)[0] ?? null
export const isMarried = (p) => marriages(p).length > 0
export function addMarriage(p, card) { p.marriage = card }
export function removeMarriage(p, uid) {
  if (p.marriage?.uid !== uid) return null
  const c = p.marriage
  p.marriage = null
  return c
}
export function setMarriage(p, card) { p.marriage = card ?? null }

// --- adultère (au plus une carte) -----------------------------------------
export const adulteries = (p) => (p.adultery ? [p.adultery] : [])
export const adulteryOf = (p) => adulteries(p)[0] ?? null
export function addAdultery(p, card) { p.adultery = card }
export function removeAdultery(p, uid) {
  if (p.adultery?.uid !== uid) return null
  const c = p.adultery
  p.adultery = null
  return c
}
export function setAdultery(p, card) { p.adultery = card ?? null }

// --- flirts ----------------------------------------------------------------
// le flirt du dessus (le plus récent), le seul qui peut être volé
export const topFlirt = (p) => p.flirts[p.flirts.length - 1] ?? null

// --- argent (salaires) -----------------------------------------------------
// Toutes les cartes d'argent du joueur, investies ou non
export const moneyOf = (p) => p.salaries.map((s) => s.card)
// non investies : peuvent payer, être offertes, être imposées
export const unspentMoney = (p) => p.salaries.filter((s) => !s.invested).map((s) => s.card)
// posées sous l'acquisition acqUid (elles l'ont payée)
export const moneyPaidFor = (p, acqUid) =>
  p.salaries.filter((s) => s.invested && s.paidFor === acqUid).map((s) => s.card)
// investies dans une acquisition qui a quitté le jeu
export const spentMoney = (p) =>
  p.salaries.filter((s) => s.invested && !p.acquisitions.some((a) => a.uid === s.paidFor)).map((s) => s.card)
export function addMoney(p, card, { invested = false, paidFor } = {}) {
  p.salaries.push(invested ? { card, invested, paidFor } : { card, invested })
}
// retire une carte d'argent NON investie → la carte, ou null
export function takeMoney(p, uid) {
  const i = p.salaries.findIndex((s) => s.card.uid === uid && !s.invested)
  return i >= 0 ? p.salaries.splice(i, 1)[0].card : null
}
export function investMoney(p, uid, acqUid) {
  const s = p.salaries.find((x) => x.card.uid === uid && !x.invested)
  if (s) { s.invested = true; s.paidFor = acqUid }
}
// mise en place (tests) : cartes d'argent, toutes non investies
export function setMoney(p, cards) { p.salaries = cards.map((card) => ({ card, invested: false })) }

// --- malus reçus -----------------------------------------------------------
export const malusOf = (p) => p.malusKept
export function addMalus(p, card) { p.malusKept.push(card) }
export function takeMalus(p, uid) {
  const i = p.malusKept.findIndex(byUid(uid))
  return i >= 0 ? p.malusKept.splice(i, 1)[0] : null
}
export function setMalus(p, cards) { p.malusKept = [...cards] }

// --- hors jeu (zone partagée, publique) -----------------------------------
// cause : ce qui a sorti la carte du jeu ('attentat'…), by : qui l'a causé
export const outOfGameCards = (s) => s.removed
export function putOutOfGame(s, card, cause, by = null) { s.removed.push(card) }

// --- tout le plateau -------------------------------------------------------
// Toutes les cartes posées devant le joueur (hors main), dans l'ordre du
// tableau de vie : pro, perso, acquisitions, distinctions, spéciales, malus
export const boardCards = (p) => [
  ...p.studies, ...jobs(p), ...moneyOf(p),
  ...p.flirts, ...marriages(p), ...adulteries(p), ...p.children,
  ...p.acquisitions, ...p.distinctions.map((d) => d.card), ...p.specials, ...malusOf(p),
]
