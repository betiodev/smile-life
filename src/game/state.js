// ---------------------------------------------------------------------------
// Smile Life — accès aux zones du plateau (sélecteurs)
// Les règles, le reducer, le décompte, l'interface et les tests lisent les
// zones UNIQUEMENT par ces fonctions : changer la forme d'une zone ne touche
// alors que ce fichier. Elles marchent sur l'état complet comme sur une vue
// (viewFor), qui a la même forme de plateau.
//
// Les fonctions « écrivain » (add…, take…, set…, placeCard, liftCard…)
// modifient l'état en place et tiennent state.meta à jour : réservées au
// moteur (src/game/) et à la mise en place des tests. Elles prennent l'état
// en premier argument.
// Les limites (un seul métier, un seul mariage…) sont des RÈGLES (rules.js),
// pas des contraintes de forme.
// ---------------------------------------------------------------------------

const byUid = (uid) => (c) => c.uid === uid

// Toutes les zones sont des listes de cartes (ARCHITECTURE.md §3.1).

// --- méta des cartes posées (ARCHITECTURE.md §3.2) -------------------------
// state.meta[uid] = { seq, used?, on? } pour chaque carte posée sur un plateau :
//   seq  : ordre de pose, global (state.seqCounter) ; plus grand = plus récent
//   used : retournée après usage (salaire ou Héritage dépensé, Grand Prix sans
//          effet) ; elle compte toujours ses smiles
//   on   : uid de la carte sous laquelle elle est posée (salaires et Héritage
//          sous l'acquisition qu'ils ont payée)
// L'entrée naît quand la carte est posée et disparaît quand elle quitte la
// table. Toute pose / tout retrait passe donc par les écrivains ci-dessous.
export const metaOf = (s, uid) => s.meta?.[uid] ?? null
export const isUsed = (s, card) => !!metaOf(s, card.uid)?.used
export const onOf = (s, card) => metaOf(s, card.uid)?.on ?? null

// la carte arrive sur la table : nouveau numéro d'ordre
export function stamp(s, card) {
  s.seqCounter += 1
  s.meta[card.uid] = { seq: s.seqCounter }
}
// la carte quitte la table : son entrée disparaît, et les cartes posées sous
// elle n'y sont plus rattachées (elles restent retournées)
export function unstamp(s, uid) {
  delete s.meta[uid]
  for (const m of Object.values(s.meta)) if (m.on === uid) delete m.on
}
// retourne une carte posée (on : la carte sous laquelle elle passe)
export function markUsed(s, uid, on = null) {
  const m = s.meta[uid]
  if (!m) return
  m.used = true
  if (on) m.on = on
}

// zone de cartes simple (études, flirts, enfants, acquisitions, distinctions,
// spéciales) : poser une carte / en retirer une (→ la carte, ou null)
export function placeCard(s, zone, card) {
  zone.push(card)
  stamp(s, card)
}
export function liftCard(s, zone, uid) {
  const i = zone.findIndex(byUid(uid))
  if (i < 0) return null
  const [card] = zone.splice(i, 1)
  unstamp(s, card.uid)
  return card
}
// vide la zone → les cartes retirées
export function liftAll(s, zone) {
  const cards = zone.splice(0)
  for (const c of cards) unstamp(s, c.uid)
  return cards
}
// mise en place (tests) : remplace le contenu d'une zone
function setZone(s, zone, cards) {
  liftAll(s, zone)
  for (const c of cards) placeCard(s, zone, c)
}

// --- métiers ---------------------------------------------------------------
export const jobs = (p) => p.jobs
// le seul métier (ou le premier), null sans métier
export const jobOf = (p) => p.jobs[0] ?? null
export const addJob = (s, p, card) => placeCard(s, p.jobs, card)
export const removeJob = (s, p, uid) => liftCard(s, p.jobs, uid)
// mise en place (tests) : remplace tous les métiers
export const setJob = (s, p, card) => setZone(s, p.jobs, card ? [card] : [])

// --- mariages --------------------------------------------------------------
export const marriages = (p) => p.marriages
export const marriageOf = (p) => p.marriages[0] ?? null
export const isMarried = (p) => p.marriages.length > 0
export const addMarriage = (s, p, card) => placeCard(s, p.marriages, card)
export const removeMarriage = (s, p, uid) => liftCard(s, p.marriages, uid)
export const setMarriage = (s, p, card) => setZone(s, p.marriages, card ? [card] : [])

// --- adultère (liste d'au plus une carte) ---------------------------------
export const adulteries = (p) => p.adultery
export const adulteryOf = (p) => p.adultery[0] ?? null
export const addAdultery = (s, p, card) => placeCard(s, p.adultery, card)
export const removeAdultery = (s, p, uid) => liftCard(s, p.adultery, uid)
export const setAdultery = (s, p, card) => setZone(s, p.adultery, card ? [card] : [])

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
// pose une carte d'argent (used / on : déjà dépensée, mise en place des tests)
export function addMoney(s, p, card, { used = false, on = null } = {}) {
  placeCard(s, p.money, card)
  if (used) markUsed(s, card.uid, on)
}
// retire une carte d'argent NON dépensée → la carte, ou null
export function takeMoney(s, p, uid) {
  const card = p.money.find(byUid(uid))
  return card && !isUsed(s, card) ? liftCard(s, p.money, uid) : null
}
// la carte d'argent uid passe sous l'acquisition acqUid
export function investMoney(s, p, uid, acqUid) {
  const card = p.money.find(byUid(uid))
  if (card && !isUsed(s, card)) markUsed(s, uid, acqUid)
}
// mise en place (tests) : cartes d'argent, toutes non dépensées
export const setMoney = (s, p, cards) => setZone(s, p.money, cards)

// --- malus reçus -----------------------------------------------------------
export const malusOf = (p) => p.malus
export const addMalus = (s, p, card) => placeCard(s, p.malus, card)
export const takeMalus = (s, p, uid) => liftCard(s, p.malus, uid)
export const setMalus = (s, p, cards) => setZone(s, p.malus, cards)

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
  ...p.acquisitions, ...p.distinctions, ...p.specials, ...malusOf(p),
]
