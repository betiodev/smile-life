// ---------------------------------------------------------------------------
// Moteur de validation — toutes les règles de placement de Smile Life
// Chaque fonction retourne { ok: boolean, reason?: string }
// ---------------------------------------------------------------------------

import { hasTag } from '../data/index.js'
import {
  jobs, jobOf, marriages, isMarried, adulteryOf, topFlirt, unspentMoney, moneyPaidFor, spentMoney, malusOf,
} from './state.js'

const OK = { ok: true }
const NO = (reason) => ({ ok: false, reason })

export const studyLevel = (p) => p.studies.reduce((s, c) => s + c.levels, 0)
export const hasJob = (p, key) => jobs(p).some((j) => j.key === key)
// Jeu de base : un seul métier, un seul mariage (des extensions changeront ces limites)
export const maxJobs = (p) => 1
export const maxMarriages = (p) => 1
// tous les emplacements de métier occupés ?
const jobsFull = (p) => jobs(p).length >= maxJobs(p)
// groupes de cartes : tags des définitions (src/data/base.js)
export { hasTag }
const anyJobTagged = (p, tag) => jobs(p).some((j) => hasTag(j, tag))
export const isProf = (p) => anyJobTagged(p, 'prof')
export const isFonctionnaire = (p) => anyJobTagged(p, 'fonctionnaire')
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

// Niveau de salaire effectif : niveau du métier, ou 4 si Grand Prix actif
export function effectiveSalaryLevel(p) {
  const job = jobOf(p)
  if (!job) return 0
  const gp = p.distinctions.find((d) => d.card.key === 'grandprix' && d.active)
  return gp ? 4 : job.salaryLevel
}

export const handTarget = (p) => (hasJob(p, 'chercheur') ? 6 : 5)

// Liasses disponibles (salaires non investis), hors héritage
export const availableLiasses = (p) => unspentMoney(p).reduce((t, c) => t + c.level, 0)

// Salaires investis dans une acquisition (posés sous elle)
export const paidSalaries = moneyPaidFor

// Salaires dépensés dont l'acquisition a quitté le jeu : ils restent au joueur,
// retournés (comptent leurs smiles, ne peuvent plus payer ni être offerts)
export const spentSalaries = spentMoney

// Héritage : posé face visible tant qu'il n'a rien payé
export const unusedHeritage = (p) => p.specials.filter((c) => c.key === 'heritage' && !p.heritageFor?.[c.uid])

// Cartes posées sous une acquisition : salaires et Héritage qui l'ont payée
export const paidCards = (p, acqUid) =>
  [...paidSalaries(p, acqUid), ...p.specials.filter((c) => c.key === 'heritage' && p.heritageFor?.[c.uid] === acqUid)]

// Argent dépensé dont l'acquisition a quitté le jeu (salaires + Héritage), retourné
export const spentCards = (p) => [
  ...spentSalaries(p),
  ...p.specials.filter((c) => c.key === 'heritage' && p.heritageFor?.[c.uid] && !p.acquisitions.some((a) => a.uid === p.heritageFor[c.uid])),
]

export function houseCost(p, card) {
  return isMarried(p) ? Math.ceil(card.cost / 2) : card.cost
}

// Validation d'un paiement (achat voyage/maison) : le total doit couvrir le
// coût ET chaque élément choisi doit être nécessaire — retirer n'importe quel
// salaire (ou l'héritage) ferait repasser sous le coût. On peut donc surpayer
// faute d'appoint, mais pas investir des salaires superflus (ce qui les
// mettrait à l'abri de l'Impôt sur le revenu).
export function validatePayment(cost, salaryLevels, heritage = 0) {
  const total = salaryLevels.reduce((a, b) => a + b, 0) + heritage
  if (total < cost) return NO(`Total insuffisant (${total}/${cost} liasses)`)
  for (const lvl of salaryLevels) {
    if (total - lvl >= cost) return NO('Retirez les salaires superflus : le coût est déjà couvert sans eux')
  }
  if (heritage > 0 && total - heritage >= cost) return NO('L’Héritage est superflu : le coût est déjà couvert sans lui')
  return OK
}

const anyPolicier = (state) => state.players.some((p) => hasJob(p, 'policier'))
const anyMilitaire = (state) => state.players.some((p) => hasJob(p, 'militaire'))

// Un enfant est-il posable ?
function canHaveChild(p) {
  if (isMarried(p)) return OK
  const top = topFlirt(p)
  if (top?.allowsChild) {
    if (p.children.length >= 1) return NO('1 seul enfant maximum sans mariage')
    return OK
  }
  return NO('Il faut être marié (ou un flirt Hôtel/Camping sur le dessus)')
}

// ---------------------------------------------------------------------------
// Poser une carte devant soi
// ---------------------------------------------------------------------------
export function canPoseSelf(state, pIdx, card) {
  const p = state.players[pIdx]
  switch (card.type) {
    case 'study': {
      // Médecin/Chirurgien : études continues, même au-delà des 6 cartes de base
      const continues = hasJob(p, 'medecin') || hasJob(p, 'chirurgien')
      if (jobOf(p) && !continues && !isInterim(p)) return NO('Un métier bloque les études (démissionnez d’abord)')
      // le plafond porte sur le nombre de CARTES études, pas le nombre de niveaux
      if (!continues && p.studies.length >= 6) return NO('Maximum 6 cartes études')
      return OK
    }
    case 'job': {
      if (isGrandProf(card)) {
        if (!isProf(p)) return NO('Promotion réservée : il faut déjà être Prof')
        return OK
      }
      if (jobsFull(p) && !isInterim(p)) return NO('Un seul métier à la fois (démissionnez d’abord)')
      if (hasTag(card, 'outlaw') && anyPolicier(state))
        return NO('Un Policier est en poste : ni Bandit ni Gourou')
      if (studyLevel(p) < card.studyReq)
        return NO(`Niveau d’études insuffisant (${studyLevel(p)}/${card.studyReq})`)
      return OK
    }
    case 'salary': {
      if (!jobOf(p)) return NO('Il faut un métier pour poser un salaire')
      const max = effectiveSalaryLevel(p)
      if (card.level > max) return NO(`Votre métier autorise le niveau ${max} maximum`)
      return OK
    }
    case 'flirt': {
      if (isMarried(p) && !adulteryOf(p)) return NO('Interdit de flirter une fois marié (sans Adultère)')
      const unlimited = adulteryOf(p) || (hasJob(p, 'barmaid') && !isMarried(p))
      if (!unlimited && p.flirts.length >= 5) return NO('Maximum 5 flirts')
      return OK
    }
    case 'marriage': {
      if (marriages(p).length >= maxMarriages(p)) return NO('Déjà marié (divorcez d’abord)')
      if (p.flirts.length === 0) return NO('Il faut au moins 1 flirt pour se marier')
      return OK
    }
    case 'adultery': {
      if (!isMarried(p)) return NO('L’adultère nécessite d’être marié')
      if (adulteryOf(p)) return NO('Adultère déjà en cours')
      return OK
    }
    case 'child':
      return canHaveChild(p)
    case 'acquisition': {
      if (hasTag(card, 'animal')) return OK
      if (hasTag(card, 'travel')) {
        if (hasJob(p, 'pilote')) return OK
        if (availableLiasses(p) + p.heritage < card.cost)
          return NO(`Coût : ${card.cost} liasses (vous avez ${availableLiasses(p) + p.heritage})`)
        return OK
      }
      // maison
      if (hasJob(p, 'architecte') && !p.architectFreeUsed) return OK
      const cost = houseCost(p, card)
      if (availableLiasses(p) + p.heritage < cost)
        return NO(`Coût : ${cost} liasses${isMarried(p) ? ' (prix marié)' : ''} — vous avez ${availableLiasses(p) + p.heritage}`)
      return OK
    }
    case 'distinction': {
      if (card.key === 'legion') {
        if (hasJob(p, 'bandit') || p.wasBandit) return NO('Interdite aux Bandits, présents ou passés')
        if (p.didAttentat) return NO('Interdite aux auteurs d’attentat')
        return OK
      }
      // grand prix
      if (!anyJobTagged(p, 'trophy')) return NO('Réservé aux métiers 🏆 : Écrivain, Chercheur, Journaliste')
      if (p.distinctions.some((d) => d.card.key === 'grandprix' && d.active))
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
      if (jobsFull(p) && !isInterim(p)) return NO('Un seul métier à la fois (démissionnez d’abord)')
      const inHand = p.hand.filter((c) => c.type === 'job' && !isGrandProf(c) && c.uid !== card.uid)
      if (inHand.length === 0) return NO('Aucun métier en main (Grand Prof exclu)')
      if (!inHand.some((j) => !(hasTag(j, 'outlaw') && anyPolicier(state))))
        return NO('Un Policier est en poste : ni Bandit ni Gourou')
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
        state.players.some((_, ti) => ti !== pIdx && canPlayMalus(state, pIdx, m, ti).ok)
      )
      if (!some) return NO('Aucune cible valide pour vos malus reçus')
      return OK
    }
    default:
      return NO('Carte spéciale inconnue')
  }
}

// ---------------------------------------------------------------------------
// Jouer un malus sur un adversaire (conditions cible + immunités)
// ---------------------------------------------------------------------------
export function canPlayMalus(state, attackerIdx, card, targetIdx) {
  if (attackerIdx === targetIdx) return NO('On ne joue pas un malus sur soi-même')
  const t = state.players[targetIdx]
  switch (card.key) {
    case 'accident':
      if (hasJob(t, 'garagiste')) return NO('Le Garagiste ne subit aucun accident')
      return OK
    case 'maladie':
      if (hasJob(t, 'pharmacien') || hasJob(t, 'medecin') || hasJob(t, 'chirurgien'))
        return NO(`${jobOf(t).name} : immunisé contre la maladie`)
      return OK
    case 'burnout':
      if (!jobOf(t)) return NO('La cible doit avoir un métier')
      return OK
    case 'licenciement':
      if (!jobOf(t)) return NO('La cible doit avoir un métier')
      if (isFonctionnaire(t)) return NO('Un fonctionnaire ne peut pas être licencié')
      if (hasJob(t, 'bandit')) return NO('Le Bandit : ni impôt, ni licenciement')
      return OK
    case 'impot':
      if (!jobOf(t)) return NO('La cible doit avoir un métier')
      if (hasJob(t, 'bandit')) return NO('Le Bandit : ni impôt, ni licenciement')
      if (unspentMoney(t).length === 0) return NO('Aucun salaire non-investi à imposer')
      return OK
    case 'divorce':
      if (!isMarried(t)) return NO('La cible doit être mariée')
      if (hasJob(t, 'avocat')) return NO('L’Avocat ne subit aucun divorce')
      return OK
    case 'redoublement':
      if (jobOf(t)) return NO('La cible ne doit pas avoir de métier (étudiant)')
      if (t.studies.length === 0) return NO('La cible doit avoir des études posées')
      return OK
    case 'prison':
      if (!hasJob(t, 'bandit')) return NO('La prison ne concerne que le Bandit')
      return OK
    case 'attentat':
      if (anyMilitaire(state)) return NO('Un Militaire est en poste : aucun attentat possible')
      return OK
    default:
      return NO('Malus inconnu')
  }
}

// Le malus a-t-il au moins une cible valide ?
export function malusHasTarget(state, attackerIdx, card) {
  return state.players.some((_, i) => i !== attackerIdx && canPlayMalus(state, attackerIdx, card, i).ok)
}

// ---------------------------------------------------------------------------
// Une carte de la défausse est-elle jouable immédiatement par ce joueur ?
// (pose devant soi ou malus sur un adversaire — pas de re-défausse)
// ---------------------------------------------------------------------------
export function isPlayableFromDiscard(state, pIdx, card) {
  if (card.type === 'malus') return malusHasTarget(state, pIdx, card)
  return canPoseSelf(state, pIdx, card).ok
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
  if (state.phase !== 'draw' && state.phase !== 'play') return NO('Seulement pendant votre tour')
  if (state.pending || state.forced) return NO('Terminez d’abord l’action en cours')
  if (state.cardPlayed) return NO('Trop tard : une carte a déjà été jouée ce tour')
  return OK
}

// Arc-en-ciel : « jouez JUSQU'À 3 cartes ». Après l'avoir joué, le joueur peut
// terminer son tour quand il veut (après 0, 1, 2 ou 3 cartes), tant qu'aucun
// choix n'est en attente ni aucune carte forcée.
export function canEndPlays(state) {
  return state.status === 'playing' && state.phase === 'play' && !!state.rainbow &&
    !state.pending && !state.forced && state.playsRemaining > 0
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
  return canPoseSelf(state, pIdx, card)
}

// Peut-on défausser cette carte ? (une carte prise dans la défausse ou la
// rivière doit être réellement jouée)
export function canDiscardFromHand(state, pIdx, card) {
  if (state.forced?.uid === card.uid && state.forcedConsumesPlay) return NO('Cette carte doit être jouée')
  return OK
}

// Poser ce flirt volera-t-il celui d'un adversaire ? → indices des victimes
export function flirtStealVictims(state, pIdx, card) {
  if (card.type !== 'flirt') return []
  return state.players
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => i !== pIdx && topFlirt(q)?.place === card.place)
    .map(({ i }) => i)
}

// Cette acquisition se paie-t-elle avec des salaires ?
export function needsPayment(p, card) {
  if (card.type !== 'acquisition' || hasTag(card, 'animal')) return false
  if (hasTag(card, 'travel') && hasJob(p, 'pilote')) return false
  return true
}

export const purchaseCost = (p, card) => (hasTag(card, 'house') ? houseCost(p, card) : card.cost)
export const architectFree = (p, card) => hasTag(card, 'house') && hasJob(p, 'architecte') && !p.architectFreeUsed

// Paiement valide le moins cher : moins de liasses dépensées, puis moins de
// salaires investis. → { salaryUids, useHeritage, total } ou null
export function cheapestPayment(p, cost) {
  const sal = unspentMoney(p).slice(0, 14)
  let best = null
  for (const h of p.heritage > 0 ? [false, true] : [false]) {
    const heritage = h ? p.heritage : 0
    for (let mask = 0; mask < 1 << sal.length; mask++) {
      const picked = sal.filter((_, i) => mask & (1 << i))
      const levels = picked.map((c) => c.level)
      if (!validatePayment(cost, levels, heritage).ok) continue
      const total = levels.reduce((a, b) => a + b, 0) + heritage
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

// Anniversaire : adversaires ayant au moins un salaire non investi
export const birthdayDonors = (state, pIdx) =>
  state.players.map((q, i) => i).filter((i) => i !== pIdx && unspentMoney(state.players[i]).length > 0)

// Salaire non investi le plus petit (cadeau par défaut)
export function lowestUnusedSalary(p) {
  let best = null
  for (const c of unspentMoney(p)) if (!best || c.level < best.level) best = c
  return best
}
