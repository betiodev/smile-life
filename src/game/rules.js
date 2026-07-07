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

// Niveau de salaire effectif : niveau du métier, ou 4 si Grand Prix actif
export function effectiveSalaryLevel(p) {
  if (!p.job) return 0
  const gp = p.distinctions.find((d) => d.card.key === 'grandprix' && d.active)
  return gp ? 4 : p.job.salaryLevel
}

export const handTarget = (p) => (hasJob(p, 'chercheur') ? 6 : 5)

// Liasses disponibles (salaires non investis), hors héritage
export const availableLiasses = (p) => p.salaries.filter((s) => !s.invested).reduce((t, s) => t + s.card.level, 0)

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
      if (p.job && !continues) return NO('Un métier bloque les études (démissionnez d’abord)')
      // le plafond porte sur le nombre de CARTES études, pas le nombre de niveaux
      if (!continues && p.studies.length >= 6) return NO('Maximum 6 cartes études')
      return OK
    }
    case 'job': {
      if (card.isGrandProf) {
        if (!isProf(p)) return NO('Promotion réservée : il faut déjà être Prof')
        return OK
      }
      if (p.job) return NO('Un seul métier à la fois (démissionnez d’abord)')
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
      if (p.job) return NO('Un seul métier à la fois (démissionnez d’abord)')
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
