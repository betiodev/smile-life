// ---------------------------------------------------------------------------
// Moteur de validation — toutes les règles de placement de Smile Life
// Chaque fonction retourne { ok: boolean, reason?: string }
// ---------------------------------------------------------------------------

const OK = { ok: true }
const NO = (reason) => ({ ok: false, reason })

export const studyLevel = (p) => p.studies.reduce((s, c) => s + c.levels, 0)
export const hasJob = (p, key) => p.job?.key === key
export const isProf = (p) => !!p.job?.isProf
export const isFonctionnaire = (p) => p.job?.status === 'fonctionnaire'
export const isInterim = (p) => p.job?.status === 'interim'

// Intérimaire : poser des Études, un nouveau métier ou un Piston défausse
// d'office le métier intérimaire (pas besoin de démissionner). → la carte
// métier remplacée, ou null. Le Grand Prof (promotion de Prof) n'est pas concerné.
// Piston : le métier part dès la pose du Piston (le choix du métier qui suit
// est obligatoire).
export function interimReplaced(p, card) {
  if (!isInterim(p)) return null
  if (card.type === 'study' || (card.type === 'job' && !card.isGrandProf)) return p.job
  if (card.type === 'special' && card.key === 'piston') return p.job
  return null
}

// Niveau de salaire effectif : niveau du métier, ou 4 si Grand Prix actif
export function effectiveSalaryLevel(p) {
  if (!p.job) return 0
  const gp = p.distinctions.find((d) => d.card.key === 'grandprix' && d.active)
  return gp ? 4 : p.job.salaryLevel
}

export const handTarget = (p) => (hasJob(p, 'chercheur') ? 6 : 5)

// Liasses disponibles (salaires non investis), hors héritage
export const availableLiasses = (p) => p.salaries.filter((s) => !s.invested).reduce((t, s) => t + s.card.level, 0)

// Salaires investis dans une acquisition (posés sous elle)
export const paidSalaries = (p, acqUid) =>
  p.salaries.filter((s) => s.invested && s.paidFor === acqUid).map((s) => s.card)

// Salaires dépensés dont l'acquisition a quitté le jeu : ils restent au joueur,
// retournés (comptent leurs smiles, ne peuvent plus payer ni être offerts)
export const spentSalaries = (p) =>
  p.salaries.filter((s) => s.invested && !p.acquisitions.some((a) => a.uid === s.paidFor)).map((s) => s.card)

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
  return p.marriage ? Math.ceil(card.cost / 2) : card.cost
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
  if (p.marriage) return OK
  const top = p.flirts[p.flirts.length - 1]
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
      if (p.job && !continues && !isInterim(p)) return NO('Un métier bloque les études (démissionnez d’abord)')
      // le plafond porte sur le nombre de CARTES études, pas le nombre de niveaux
      if (!continues && p.studies.length >= 6) return NO('Maximum 6 cartes études')
      return OK
    }
    case 'job': {
      if (card.isGrandProf) {
        if (!isProf(p)) return NO('Promotion réservée : il faut déjà être Prof')
        return OK
      }
      if (p.job && !isInterim(p)) return NO('Un seul métier à la fois (démissionnez d’abord)')
      if ((card.key === 'bandit' || card.key === 'gourou') && anyPolicier(state))
        return NO('Un Policier est en poste : ni Bandit ni Gourou')
      if (studyLevel(p) < card.studyReq)
        return NO(`Niveau d’études insuffisant (${studyLevel(p)}/${card.studyReq})`)
      return OK
    }
    case 'salary': {
      if (!p.job) return NO('Il faut un métier pour poser un salaire')
      const max = effectiveSalaryLevel(p)
      if (card.level > max) return NO(`Votre métier autorise le niveau ${max} maximum`)
      return OK
    }
    case 'flirt': {
      if (p.marriage && !p.adultery) return NO('Interdit de flirter une fois marié (sans Adultère)')
      const unlimited = p.adultery || (hasJob(p, 'barmaid') && !p.marriage)
      if (!unlimited && p.flirts.length >= 5) return NO('Maximum 5 flirts')
      return OK
    }
    case 'marriage': {
      if (p.marriage) return NO('Déjà marié (divorcez d’abord)')
      if (p.flirts.length === 0) return NO('Il faut au moins 1 flirt pour se marier')
      return OK
    }
    case 'adultery': {
      if (!p.marriage) return NO('L’adultère nécessite d’être marié')
      if (p.adultery) return NO('Adultère déjà en cours')
      return OK
    }
    case 'child':
      return canHaveChild(p)
    case 'acquisition': {
      if (card.acqType === 'animal') return OK
      if (card.acqType === 'travel') {
        if (hasJob(p, 'pilote')) return OK
        if (availableLiasses(p) + p.heritage < card.cost)
          return NO(`Coût : ${card.cost} liasses (vous avez ${availableLiasses(p) + p.heritage})`)
        return OK
      }
      // maison
      if (hasJob(p, 'architecte') && !p.architectFreeUsed) return OK
      const cost = houseCost(p, card)
      if (availableLiasses(p) + p.heritage < cost)
        return NO(`Coût : ${cost} liasses${p.marriage ? ' (prix marié)' : ''} — vous avez ${availableLiasses(p) + p.heritage}`)
      return OK
    }
    case 'distinction': {
      if (card.key === 'legion') {
        if (hasJob(p, 'bandit') || p.wasBandit) return NO('Interdite aux Bandits, présents ou passés')
        if (p.didAttentat) return NO('Interdite aux auteurs d’attentat')
        return OK
      }
      // grand prix
      if (!p.job?.trophy) return NO('Réservé aux métiers 🏆 : Écrivain, Chercheur, Journaliste')
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
      if (state.deck.length === 0) return NO('La pioche est vide')
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
      if (p.job && !isInterim(p)) return NO('Un seul métier à la fois (démissionnez d’abord)')
      const jobs = p.hand.filter((c) => c.type === 'job' && !c.isGrandProf && c.uid !== card.uid)
      if (jobs.length === 0) return NO('Aucun métier en main (Grand Prof exclu)')
      if (!jobs.some((j) => !((j.key === 'bandit' || j.key === 'gourou') && anyPolicier(state))))
        return NO('Un Policier est en poste : ni Bandit ni Gourou')
      return OK
    }
    case 'troc': {
      if (!state.players.some((q, i) => i !== pIdx && q.hand.length > 0))
        return NO('Aucun adversaire avec des cartes en main')
      return OK
    }
    case 'vengeance': {
      if (p.malusKept.length === 0) return NO('Aucun malus reçu à renvoyer')
      const some = p.malusKept.some((m) =>
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
        return NO(`${t.job.name} : immunisé contre la maladie`)
      return OK
    case 'burnout':
      if (!t.job) return NO('La cible doit avoir un métier')
      return OK
    case 'licenciement':
      if (!t.job) return NO('La cible doit avoir un métier')
      if (isFonctionnaire(t)) return NO('Un fonctionnaire ne peut pas être licencié')
      if (hasJob(t, 'bandit')) return NO('Le Bandit : ni impôt, ni licenciement')
      return OK
    case 'impot':
      if (!t.job) return NO('La cible doit avoir un métier')
      if (hasJob(t, 'bandit')) return NO('Le Bandit : ni impôt, ni licenciement')
      if (!t.salaries.some((s) => !s.invested)) return NO('Aucun salaire non-investi à imposer')
      return OK
    case 'divorce':
      if (!t.marriage) return NO('La cible doit être mariée')
      if (hasJob(t, 'avocat')) return NO('L’Avocat ne subit aucun divorce')
      return OK
    case 'redoublement':
      if (t.job) return NO('La cible ne doit pas avoir de métier (étudiant)')
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

// Peut-on prendre le dessus de la défausse en phase de pioche ?
export function canTakeDiscardTop(state, pIdx) {
  const top = state.discard[state.discard.length - 1]
  if (!top) return NO('La défausse est vide')
  if (top.by === pIdx) return NO('On ne reprend jamais sa propre défausse')
  if (!isPlayableFromDiscard(state, pIdx, top.card))
    return NO('La carte du dessus n’est pas jouable immédiatement')
  return OK
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
    .filter(({ q, i }) => i !== pIdx && q.flirts[q.flirts.length - 1]?.place === card.place)
    .map(({ i }) => i)
}

// Cette acquisition se paie-t-elle avec des salaires ?
export function needsPayment(p, card) {
  if (card.type !== 'acquisition' || card.acqType === 'animal') return false
  if (card.acqType === 'travel' && hasJob(p, 'pilote')) return false
  return true
}

export const purchaseCost = (p, card) => (card.acqType === 'house' ? houseCost(p, card) : card.cost)
export const architectFree = (p, card) => card.acqType === 'house' && hasJob(p, 'architecte') && !p.architectFreeUsed

// Paiement valide le moins cher : moins de liasses dépensées, puis moins de
// salaires investis. → { salaryUids, useHeritage, total } ou null
export function cheapestPayment(p, cost) {
  const sal = p.salaries.filter((s) => !s.invested).map((s) => s.card).slice(0, 14)
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
  state.players[pIdx].malusKept.filter((m) => malusHasTarget(state, pIdx, m))

// Anniversaire : adversaires ayant au moins un salaire non investi
export const birthdayDonors = (state, pIdx) =>
  state.players.map((q, i) => i).filter((i) => i !== pIdx && state.players[i].salaries.some((s) => !s.invested))

// Salaire non investi le plus petit (cadeau par défaut)
export function lowestUnusedSalary(p) {
  let best = null
  for (const s of p.salaries) if (!s.invested && (!best || s.card.level < best.card.level)) best = s
  return best?.card ?? null
}
