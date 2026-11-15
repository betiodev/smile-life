// ---------------------------------------------------------------------------
// Moteur de validation — toutes les règles de placement de Smile Life
// Chaque fonction retourne { ok: boolean, reason?: string }
//
// Les règles passent par les questions de src/game/queries.js : ce fichier
// donne la RÉPONSE DE BASE (le jeu sans avantage de métier) et les cartes en
// jeu la modifient (avantages et immunités : src/game/cards/base.js).
// canPlace / canTarget sont les questions ; canPoseSelf / canPlayMalus, leurs
// réponses de base. Une réponse de base marquée hard (condition préalable :
// « La cible doit avoir un métier »…) n'est levée par aucune carte.
// ---------------------------------------------------------------------------

import { hasTag } from '../data/index.js'
import {
  jobs, jobOf, marriages, isMarried, adulteryOf, topFlirt, moneyPaidFor, spentMoney, malusOf,
  isUsed, moneyTraits, moneyValue, looseMoney, lumpMoney, taxableMoney, giftableMoney, paidWith, spentPaying, phaseOf, choiceOf, forcedOf, mustPlayForced, cardPlayedThisTurn, isRainbow, playsLeft,
} from './state.js'
import { ask } from './queries.js'
import { BEHAVIOURS } from './cards/index.js'

const OK = { ok: true }
const NO = (reason) => ({ ok: false, reason })
// condition préalable : aucune carte ne la lève
const HARD = (reason) => ({ ok: false, reason, hard: true })

const indexOf = (s, p) => s.players.indexOf(p)

// niveau d'études imprimé (somme des cartes) ; studyLevelOf : la question
export const studyLevel = (p) => p.studies.reduce((s, c) => s + c.levels, 0)
export const studyLevelOf = (s, pIdx) => ask(s, 'studyLevel', { player: pIdx }, studyLevel(s.players[pIdx]))
export const studyReqOf = (s, pIdx, card) => ask(s, 'studyReq', { player: pIdx, card }, card.studyReq ?? 0)
// Jeu de base : un seul métier, un seul mariage (des extensions changeront ces limites)
export const jobSlots = (s, pIdx) => ask(s, 'jobSlots', { player: pIdx }, 1)
export const marriageSlots = (s, pIdx) => ask(s, 'marriageSlots', { player: pIdx }, 1)
export const flirtLimit = (s, pIdx) => ask(s, 'flirtLimit', { player: pIdx }, 5)
export const studyCardLimit = (s, pIdx) => ask(s, 'studyCardLimit', { player: pIdx }, 6)
// taille de main (Chercheur : 6) ; handDelta : changement durable propre au
// joueur (Roulette russe −1, Magicien ±1…), 0 dans le jeu de base
export const handSize = (s, pIdx) => ask(s, 'handSize', { player: pIdx }, 5 + (s.players[pIdx].handDelta ?? 0))
// nombre de tours passés par un malus (imprimé : Accident 1, Prison 3…)
export const skipLength = (s, pIdx, card, printed) => ask(s, 'skipLength', { player: pIdx, card }, printed)
// façon de piocher au début du tour : 'normal' (pioche, défausse, rivière),
// 'none' (pas de pioche ce tour), 'noDiscard' (pas de carte de la défausse).
// D'autres façons (piocher deux et en garder une, jouer puis piocher, pioche
// face visible) viendront avec les cartes qui les demandent.
export const DRAW_MODES = ['normal', 'none', 'noDiscard']
export const drawMode = (s, pIdx) => ask(s, 'drawMode', { player: pIdx }, 'normal')
// joueur suivant : dans le sens du jeu (state.direction, +1 = sens des
// aiguilles d'une montre), avant les tours passés
export const nextPlayer = (s, from) => {
  const n = s.players.length
  return ask(s, 'nextPlayer', { player: from }, (((from + (s.direction ?? 1)) % n) + n) % n)
}
// tous les emplacements de métier occupés ?
const jobsFull = (s, pIdx) => jobs(s.players[pIdx]).length >= jobSlots(s, pIdx)
// groupes de cartes : tags des définitions (src/data/base.js)
export { hasTag }
const anyJobTagged = (p, tag) => jobs(p).some((j) => hasTag(j, tag))
export const isProf = (p) => anyJobTagged(p, 'prof')
export const isInterim = (p) => anyJobTagged(p, 'interim')
// Grand Prof : promotion de Prof (carte unique)
export const isGrandProf = (card) => card?.key === 'grand_prof'

// Intérimaire : poser des Études, un nouveau métier ou un Piston défausse
// d'office le métier intérimaire (pas besoin de démissionner). → la carte
// métier remplacée, ou null. Le Grand Prof (promotion de Prof) n'est pas concerné.
// Piston : le métier part dès la pose du Piston (le choix du métier qui suit
// est obligatoire).
export function interimReplaced(p, card) {
  if (!isInterim(p)) return null
  const interim = jobs(p).find((j) => hasTag(j, 'interim'))
  if (card.type === 'study' || (card.type === 'job' && !isGrandProf(card))) return interim
  if (card.type === 'special' && card.key === 'piston') return interim
  return null
}

// Grand Prix d'excellence encore actif (il est retourné, sans effet, quand
// le métier est perdu)
export const activeGrandPrix = (s, p) => p.distinctions.find((c) => c.key === 'grandprix' && !isUsed(s, c)) ?? null

// Niveaux de salaire posables (un ENSEMBLE) : 1 au niveau du métier ;
// Grand Prix : 1 à 4 (cards/base.js)
export function salaryLevels(s, pIdx) {
  const job = jobOf(s.players[pIdx])
  const base = job ? Array.from({ length: job.salaryLevel }, (_, i) => i + 1) : []
  return ask(s, 'salaryLevels', { player: pIdx }, base)
}
// Niveau de salaire effectif : le plus haut niveau posable (0 sans métier)
export function effectiveSalaryLevel(s, p) {
  if (!jobOf(p)) return 0
  return Math.max(0, ...salaryLevels(s, indexOf(s, p)))
}

// --- argent et achats (ARCHITECTURE.md §7) ----------------------------------
// Ce qui peut payer est lu dans les traits `money` des définitions
// (src/data/base.js) ; les sélecteurs sont dans state.js.
const sumValues = (cards) => cards.reduce((t, c) => t + moneyValue(c), 0)

// Liasses disponibles à choisir une par une (salaires non investis), hors héritage
export const availableLiasses = (s, p) => sumValues(looseMoney(s, p))

// Salaires investis dans une acquisition (posés sous elle)
export const paidSalaries = moneyPaidFor

// Salaires dépensés dont l'acquisition a quitté le jeu : ils restent au joueur,
// retournés (comptent leurs smiles, ne peuvent plus payer ni être offerts)
export const spentSalaries = spentMoney

// Héritage (argent « tout ou rien ») : posé face visible tant qu'il n'a rien
// payé ; toutes ces cartes se dépensent ensemble
export const unusedHeritage = lumpMoney
export const heritageLiasses = (s, p) => sumValues(lumpMoney(s, p))

// Cartes posées sous une acquisition : l'argent qui l'a payée
export const paidCards = paidWith

// Argent dépensé dont l'acquisition a quitté le jeu, retourné
export const spentCards = spentPaying

// Prix d'une acquisition : la question price. Réponse de base : le prix
// imprimé. Maisons à moitié prix une fois marié (les cartes Mariage), Pilote
// (voyages) et Architecte (une maison, au choix) : cards/base.js.
// withOptional : avec les effets au choix du joueur (maison offerte).
export const price = (s, pIdx, card, { withOptional = false } = {}) =>
  ask(s, 'price', { player: pIdx, card }, card.cost ?? 0, { withOptional })

// Règle de paiement : la question paymentRule.
//   'necessary' (jeu de base) : le total doit couvrir le coût ET chaque
//     élément choisi doit être nécessaire — retirer n'importe quel salaire
//     (ou l'héritage) ferait repasser sous le coût. On peut donc surpayer
//     faute d'appoint, mais pas investir des salaires superflus (ce qui les
//     mettrait à l'abri de l'Impôt sur le revenu) ;
//   'exact' : le total doit être exactement le coût (plus tard : Salrapas).
export const PAYMENT_RULES = ['necessary', 'exact']
export const paymentRule = (s, pIdx) => ask(s, 'paymentRule', { player: pIdx }, 'necessary')

// Validation d'un paiement : values = valeurs des cartes choisies une par une,
// heritage = valeur de l'argent « tout ou rien » utilisé (0 sinon)
export function validatePayment(cost, values, heritage = 0, rule = 'necessary') {
  const total = values.reduce((a, b) => a + b, 0) + heritage
  if (total < cost) return NO(`Total insuffisant (${total}/${cost} liasses)`)
  if (rule === 'exact') {
    if (total !== cost) return NO(`Il faut payer exactement ${cost} liasses (${total} choisies)`)
    return OK
  }
  for (const v of values) {
    if (total - v >= cost) return NO('Retirez les salaires superflus : le coût est déjà couvert sans eux')
  }
  if (heritage > 0 && total - heritage >= cost) return NO('L’Héritage est superflu : le coût est déjà couvert sans lui')
  return OK
}

// Le paiement choisi par le joueur pIdx : { salaryUids, useHeritage } →
// { ok, reason?, cards, total } (cards : ce qui passe sous l'acquisition)
export function checkPayment(s, pIdx, cost, { salaryUids = [], useHeritage = false } = {}) {
  const p = s.players[pIdx]
  const loose = looseMoney(s, p)
  const chosen = []
  for (const uid of salaryUids) {
    const c = loose.find((m) => m.uid === uid)
    if (c && !chosen.includes(c)) chosen.push(c)
  }
  const lump = useHeritage ? lumpMoney(s, p) : []
  const heritage = sumValues(lump)
  const total = sumValues(chosen) + heritage
  const v = validatePayment(cost, chosen.map(moneyValue), heritage, paymentRule(s, pIdx))
  return { ...v, cards: [...chosen, ...lump], total }
}

// Un enfant est-il posable ?
export const canHaveChild = (s, pIdx) => ask(s, 'canHaveChild', { player: pIdx }, () => baseChild(s.players[pIdx]))
function baseChild(p) {
  if (isMarried(p)) return OK
  const top = topFlirt(p)
  if (top?.allowsChild) {
    if (p.children.length >= 1) return NO('1 seul enfant maximum sans mariage')
    return OK
  }
  return NO('Il faut être marié (ou un flirt Hôtel/Camping sur le dessus)')
}

// ---------------------------------------------------------------------------
// Poser une carte devant soi : la question canPlace
// opts.ignoreStudies : sans condition d'études (Piston)
// ---------------------------------------------------------------------------
export const canPlace = (state, pIdx, card, opts = {}) =>
  ask(state, 'canPlace', { player: pIdx, card, ...opts }, () => canPoseSelf(state, pIdx, card, opts))

// réponse de base de canPlace
export function canPoseSelf(state, pIdx, card, { ignoreStudies = false } = {}) {
  const p = state.players[pIdx]
  switch (card.type) {
    case 'study': {
      // (Médecin/Chirurgien : études continues, cards/base.js)
      if (jobOf(p) && !isInterim(p)) return NO('Un métier bloque les études (démissionnez d’abord)')
      // le plafond porte sur le nombre de CARTES études, pas le nombre de niveaux
      const limit = studyCardLimit(state, pIdx)
      if (p.studies.length >= limit) return NO(`Maximum ${limit} cartes études`)
      return OK
    }
    case 'job': {
      if (isGrandProf(card)) {
        if (!isProf(p)) return NO('Promotion réservée : il faut déjà être Prof')
        return OK
      }
      if (jobsFull(state, pIdx) && !isInterim(p)) return HARD('Un seul métier à la fois (démissionnez d’abord)')
      // (Policier en poste : ni Bandit ni Gourou, cards/base.js)
      if (ignoreStudies) return OK
      const level = studyLevelOf(state, pIdx)
      const req = studyReqOf(state, pIdx, card)
      if (level < req) return NO(`Niveau d’études insuffisant (${level}/${req})`)
      return OK
    }
    case 'salary': {
      if (moneyTraits(card)?.needsJob && !jobOf(p)) return NO('Il faut un métier pour poser un salaire')
      if (!salaryLevels(state, pIdx).includes(card.level))
        return NO(`Votre métier autorise le niveau ${effectiveSalaryLevel(state, p)} maximum`)
      return OK
    }
    case 'flirt': {
      if (isMarried(p) && !adulteryOf(p)) return NO('Interdit de flirter une fois marié (sans Adultère)')
      // Adultère : flirts illimités (Barmaid célibataire : cards/base.js)
      const limit = adulteryOf(p) ? Infinity : flirtLimit(state, pIdx)
      if (p.flirts.length >= limit) return NO(`Maximum ${limit} flirts`)
      return OK
    }
    case 'marriage': {
      if (marriages(p).length >= marriageSlots(state, pIdx)) return NO('Déjà marié (divorcez d’abord)')
      if (p.flirts.length === 0) return NO('Il faut au moins 1 flirt pour se marier')
      return OK
    }
    case 'adultery': {
      if (!isMarried(p)) return NO('L’adultère nécessite d’être marié')
      if (adulteryOf(p)) return NO('Adultère déjà en cours')
      return OK
    }
    case 'child':
      return canHaveChild(state, pIdx)
    case 'acquisition': {
      if (hasTag(card, 'animal')) return OK
      // prix avec les effets au choix (Pilote : voyage gratuit ; Architecte : maison offerte)
      const cost = price(state, pIdx, card, { withOptional: true })
      const have = availableLiasses(state, p) + heritageLiasses(state, p)
      if (have >= cost) return OK
      if (hasTag(card, 'travel')) return NO(`Coût : ${cost} liasses (vous avez ${have})`)
      // maison
      return NO(`Coût : ${cost} liasses${isMarried(p) ? ' (prix marié)' : ''} — vous avez ${have}`)
    }
    case 'distinction': {
      if (card.key === 'legion') {
        // (Bandit en poste : cards/base.js)
        if (p.history.wasBandit) return NO('Interdite aux Bandits, présents ou passés')
        if (p.history.didAttentat) return NO('Interdite aux auteurs d’attentat')
        return OK
      }
      // grand prix
      if (!anyJobTagged(p, 'trophy')) return NO('Réservé aux métiers 🏆 : Écrivain, Chercheur, Journaliste')
      if (activeGrandPrix(state, p))
        return NO('Un seul Grand Prix par métier exercé')
      return OK
    }
    case 'special':
      return canPlaySpecial(state, pIdx, card)
    case 'malus':
      return NO('Un malus se joue sur un adversaire')
    default:
      return NO('Carte inconnue')
  }
}

// ---------------------------------------------------------------------------
// Cartes spéciales
// ---------------------------------------------------------------------------
export function canPlaySpecial(state, pIdx, card) {
  const p = state.players[pIdx]
  switch (card.key) {
    case 'anniversaire':
    case 'arcenciel':
    case 'heritage':
    case 'tsunami':
    case 'casino':
      return OK
    case 'chance':
      // (la vue d'un joueur n'a que la taille de la pioche : voir view.js)
      if ((state.deck?.length ?? state.deckCount) === 0) return NO('La pioche est vide')
      return OK
    case 'etoile': {
      // exclut la carte elle-même du scan (une Étoile filante dans la défausse
      // ne doit pas s'évaluer récursivement)
      const others = state.discard.filter((e) => e.card.uid !== card.uid)
      if (others.length === 0) return NO('La défausse est vide')
      if (!others.some((e) => isPlayableFromDiscard(state, pIdx, e.card)))
        return NO('Aucune carte jouable dans la défausse')
      return OK
    }
    case 'piston': {
      if (jobsFull(state, pIdx) && !isInterim(p)) return NO('Un seul métier à la fois (démissionnez d’abord)')
      const inHand = p.hand.filter((c) => c.type === 'job' && !isGrandProf(c) && c.uid !== card.uid)
      if (inHand.length === 0) return NO('Aucun métier en main (Grand Prof exclu)')
      // (un Policier en poste bloque Bandit et Gourou)
      const answers = inHand.map((j) => canPlace(state, pIdx, j, { ignoreStudies: true }))
      if (!answers.some((a) => a.ok)) return NO(answers[0].reason)
      return OK
    }
    case 'troc': {
      if (!state.players.some((q, i) => i !== pIdx && q.hand.length > 0))
        return NO('Aucun adversaire avec des cartes en main')
      return OK
    }
    case 'vengeance': {
      if (malusOf(p).length === 0) return NO('Aucun malus reçu à renvoyer')
      const some = malusOf(p).some((m) =>
        state.players.some((_, ti) => ti !== pIdx && canTarget(state, pIdx, m, ti).ok)
      )
      if (!some) return NO('Aucune cible valide pour vos malus reçus')
      return OK
    }
    default: {
      // carte spéciale d'une extension : son comportement donne la réponse de
      // base (canPlay, src/game/cards/)
      const own = BEHAVIOURS[card.def]?.canPlay
      return own ? own(state, pIdx, card) : NO('Carte spéciale inconnue')
    }
  }
}

// ---------------------------------------------------------------------------
// Jouer un malus sur un adversaire : la question canTarget
// (immunités : Garagiste, Pharmacien, Médecin, Chirurgien, Avocat, Bandit,
// fonctionnaires, Militaire — cards/base.js)
// ---------------------------------------------------------------------------
export const canTarget = (state, attackerIdx, card, targetIdx) =>
  ask(state, 'canTarget', { player: attackerIdx, card, target: targetIdx },
    () => canPlayMalus(state, attackerIdx, card, targetIdx))

// réponse de base de canTarget
export function canPlayMalus(state, attackerIdx, card, targetIdx) {
  if (attackerIdx === targetIdx) return HARD('On ne joue pas un malus sur soi-même')
  const t = state.players[targetIdx]
  switch (card.key) {
    case 'accident':
    case 'maladie':
    case 'attentat':
      return OK
    case 'burnout':
    case 'licenciement':
      if (!jobOf(t)) return HARD('La cible doit avoir un métier')
      return OK
    case 'impot':
      if (!jobOf(t)) return HARD('La cible doit avoir un métier')
      if (taxableMoney(state, t).length === 0) return NO('Aucun salaire non-investi à imposer')
      return OK
    case 'divorce':
      if (!isMarried(t)) return HARD('La cible doit être mariée')
      return OK
    case 'redoublement':
      if (jobOf(t)) return NO('La cible ne doit pas avoir de métier (étudiant)')
      if (t.studies.length === 0) return NO('La cible doit avoir des études posées')
      return OK
    case 'prison':
      // seul le Bandit peut y aller (cards/base.js l'autorise)
      return NO('La prison ne concerne que le Bandit')
    default:
      return HARD('Malus inconnu')
  }
}

// Le malus a-t-il au moins une cible valide ?
export function malusHasTarget(state, attackerIdx, card) {
  return state.players.some((_, i) => i !== attackerIdx && canTarget(state, attackerIdx, card, i).ok)
}

// ---------------------------------------------------------------------------
// Une carte de la défausse est-elle jouable immédiatement par ce joueur ?
// (pose devant soi ou malus sur un adversaire — pas de re-défausse)
// ---------------------------------------------------------------------------
export function isPlayableFromDiscard(state, pIdx, card) {
  if (card.type === 'malus') return malusHasTarget(state, pIdx, card)
  return canPlace(state, pIdx, card).ok
}

// Peut-on prendre cette carte de la rivière pour la jouer immédiatement ?
// La carte de remplacement est piochée AVANT que la carte prise soit jouée :
// la pioche a alors une carte de moins (une Chance n'est plus jouable si
// le remplacement prend la dernière carte de la pioche).
export function canTakeRiverNow(state, pIdx, card) {
  const deckSize = state.deck?.length ?? state.deckCount
  const after = { ...state, deck: undefined, deckCount: Math.max(0, deckSize - 1) }
  return isPlayableFromDiscard(after, pIdx, card)
}

// Peut-on prendre le dessus de la défausse en phase de pioche ?
export function canTakeDiscardTop(state, pIdx) {
  const top = state.discard[state.discard.length - 1]
  if (!top) return NO('La défausse est vide')
  if (top.by === pIdx) return NO('On ne reprend jamais sa propre défausse')
  if (!isPlayableFromDiscard(state, pIdx, top.card))
    return NO('La carte du dessus n’est pas jouable immédiatement')
  return OK
}

// Arrêter l'adultère : pendant son propre tour, avant ou après la pioche mais
// avant d'avoir joué une carte (donc pas entre les jeux d'un Arc-en-ciel), tant
// qu'aucun choix n'est en attente ni aucune carte forcée. Ne consomme pas le jeu.
export function canStopAdultery(state, pIdx) {
  const p = state.players[pIdx]
  if (!p || !adulteryOf(p)) return NO('Pas d’adultère en cours')
  if (state.status !== 'playing' || state.current !== pIdx) return NO('Seulement pendant votre tour')
  if (phaseOf(state) !== 'draw' && phaseOf(state) !== 'play') return NO('Seulement pendant votre tour')
  if (choiceOf(state) || forcedOf(state)) return NO('Terminez d’abord l’action en cours')
  if (cardPlayedThisTurn(state)) return NO('Trop tard : une carte a déjà été jouée ce tour')
  return OK
}

// Arc-en-ciel : « jouez JUSQU'À 3 cartes ». Après l'avoir joué, le joueur peut
// terminer son tour quand il veut (après 0, 1, 2 ou 3 cartes), tant qu'aucun
// choix n'est en attente ni aucune carte forcée.
export function canEndPlays(state) {
  return state.status === 'playing' && phaseOf(state) === 'play' && isRainbow(state) &&
    !choiceOf(state) && !forcedOf(state) && playsLeft(state) > 0
}

// ---------------------------------------------------------------------------
// Aides pour l'interface (aucune règle nouvelle : on réutilise celles du dessus)
// ---------------------------------------------------------------------------

// Une carte de la main peut-elle être jouée maintenant ? (pose ou malus)
export function canPlayFromHand(state, pIdx, card) {
  if (card.type === 'malus') {
    if (malusHasTarget(state, pIdx, card)) return OK
    return NO(card.key === 'licenciement' ? 'Aucun joueur ne peut être licencié' : 'Aucune cible valide pour ce malus')
  }
  return canPlace(state, pIdx, card)
}

// Peut-on défausser cette carte ? (une carte prise dans la défausse ou la
// rivière doit être réellement jouée)
export const canDiscardFromHand = (state, pIdx, card) =>
  ask(state, 'canDiscard', { player: pIdx, card }, () =>
    (forcedOf(state)?.uid === card.uid && mustPlayForced(state) ? NO('Cette carte doit être jouée') : OK))

// Poser ce flirt volera-t-il celui d'un adversaire ? → indices des victimes
export function flirtStealVictims(state, pIdx, card) {
  if (card.type !== 'flirt') return []
  return state.players
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => i !== pIdx && topFlirt(q)?.place === card.place)
    .map(({ i }) => i)
}

// Cette acquisition se paie-t-elle avec des salaires ? (gratuite : Pilote)
export function needsPayment(s, pIdx, card) {
  if (card.type !== 'acquisition' || hasTag(card, 'animal')) return false
  return price(s, pIdx, card) > 0
}

export const purchaseCost = (s, pIdx, card) => price(s, pIdx, card)
// gratuite au choix du joueur (Architecte : maison offerte au lieu de la payer)
export const architectFree = (s, pIdx, card) =>
  card.type === 'acquisition' && price(s, pIdx, card) > 0 && price(s, pIdx, card, { withOptional: true }) === 0

// Piston : métiers de la main qu'il peut poser (sans condition d'études ;
// Grand Prof exclu ; Bandit / Gourou bloqués par un Policier en poste)
export const pistonable = (s, pIdx, card) =>
  card.type === 'job' && !isGrandProf(card) && canPlace(s, pIdx, card, { ignoreStudies: true }).ok

// Paiement valide le moins cher : moins de liasses dépensées, puis moins de
// salaires investis. → { salaryUids, useHeritage, total } ou null
export function cheapestPayment(s, p, cost) {
  const rule = paymentRule(s, indexOf(s, p))
  const sal = looseMoney(s, p).slice(0, 14)
  const liasses = heritageLiasses(s, p)
  let best = null
  for (const h of liasses > 0 ? [false, true] : [false]) {
    const heritage = h ? liasses : 0
    for (let mask = 0; mask < 1 << sal.length; mask++) {
      const picked = sal.filter((_, i) => mask & (1 << i))
      const values = picked.map(moneyValue)
      if (!validatePayment(cost, values, heritage, rule).ok) continue
      const total = values.reduce((a, b) => a + b, 0) + heritage
      if (!best || total < best.total || (total === best.total && picked.length < best.salaryUids.length)) {
        best = { salaryUids: picked.map((c) => c.uid), useHeritage: h, total }
      }
    }
  }
  return best
}

// Vengeance : malus reçus qui ont au moins une cible valide
export const vengeanceChoices = (state, pIdx) =>
  malusOf(state.players[pIdx]).filter((m) => malusHasTarget(state, pIdx, m))

// Anniversaire : adversaires ayant au moins un salaire (argent à offrir) non investi
export const birthdayDonors = (state, pIdx) =>
  state.players.map((q, i) => i).filter((i) => i !== pIdx && giftableMoney(state, state.players[i]).length > 0)

// Salaire non investi le plus petit (cadeau par défaut)
export function lowestUnusedSalary(s, p) {
  let best = null
  for (const c of giftableMoney(s, p)) if (!best || moneyValue(c) < moneyValue(best)) best = c
  return best
}
