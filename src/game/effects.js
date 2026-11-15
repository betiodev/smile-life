// ---------------------------------------------------------------------------
// Smile Life — effets des cartes jouées (pose devant soi, malus, spéciales)
// Appelés par le flux du tour (src/game/flows/turn.js) et par d'autres flux
// (Piston, Vengeance, Anniversaire). Les zones ne changent que par les
// primitives ; un effet qui attend un joueur pose un flux sur la pile.
// ---------------------------------------------------------------------------
import { shuffle } from '../data/index.js'
import { isPlayableFromDiscard, hasJob, interimReplaced, handTarget, hasTag, isGrandProf, birthdayDonors } from './rules.js'
import { jobOf, marriageOf, adulteryOf, topFlirt, unspentMoney } from './state.js'
import { log, draw, takeAll, put, place, remove, removeAll, steal, loseJob, skip } from './primitives.js'
import { rngOf } from './rng.js'
import { startFlow } from './flows/index.js'
import { addPlays, startRainbow } from './flows/turn.js'
// ---------------------------------------------------------------------------
// Effets des malus (utilisé pour jeu direct ET Vengeance)
// ---------------------------------------------------------------------------
export function applyMalus(s, attackerIdx, card, targetIdx) {
  const a = s.players[attackerIdx]
  const t = s.players[targetIdx]
  switch (card.key) {
    case 'accident':
    case 'maladie':
    case 'burnout':
      skip(s, targetIdx, 1)
      place(s, targetIdx, card)
      log(s, `${a.name} inflige ${card.name} à ${t.name} : passe 1 tour`, 'malus')
      break
    case 'licenciement':
      log(s, `${a.name} licencie ${t.name} (${jobOf(t).name})`, 'malus')
      loseJob(s, targetIdx, { cause: 'licenciement', by: attackerIdx })
      place(s, targetIdx, card)
      break
    case 'impot': {
      // le dernier salaire non investi
      const last = unspentMoney(s, t).at(-1)
      if (last) {
        remove(s, last.uid, { cause: 'impot', by: attackerIdx })
        log(s, `${a.name} impose ${t.name} : salaire niveau ${last.level} défaussé`, 'malus')
      }
      place(s, targetIdx, card)
      break
    }
    case 'divorce': {
      const cause = { cause: 'divorce', by: attackerIdx }
      remove(s, marriageOf(t).uid, cause)
      if (adulteryOf(t)) {
        remove(s, adulteryOf(t).uid, cause)
        removeAll(s, targetIdx, 'children', cause)
        log(s, `${a.name} divorce ${t.name} en plein adultère : mariage, adultère et enfants perdus !`, 'malus')
      } else {
        log(s, `${a.name} inflige un Divorce à ${t.name} (enfants conservés)`, 'malus')
      }
      place(s, targetIdx, card)
      break
    }
    case 'redoublement': {
      const study = t.studies.at(-1)
      if (study) remove(s, study.uid, { cause: 'redoublement', by: attackerIdx })
      place(s, targetIdx, card)
      log(s, `${a.name} fait redoubler ${t.name} : 1 carte études défaussée`, 'malus')
      break
    }
    case 'prison':
      skip(s, targetIdx, 3)
      log(s, `${a.name} envoie ${t.name} en Prison : passe 3 tours, le Bandit est défaussé`, 'malus')
      loseJob(s, targetIdx, { cause: 'prison', by: attackerIdx })
      put(s, card, 'discard', { by: attackerIdx })
      break
    case 'attentat': {
      const na = a.children.length, nt = t.children.length
      const cause = { cause: 'attentat', by: attackerIdx, to: 'outOfGame' }
      removeAll(s, attackerIdx, 'children', cause)
      removeAll(s, targetIdx, 'children', cause)
      a.didAttentat = true
      put(s, card, 'outOfGame', cause)
      log(s, `💥 ${a.name} commet un Attentat contre ${t.name} : ${na + nt} enfant(s) retirés du jeu`, 'malus')
      break
    }
  }
}

// Policier (posé ou pistonné) : les Bandits et Gourous déjà posés sont défaussés
export function policeSweep(s, pIdx) {
  s.players.forEach((q, qi) => {
    if (qi !== pIdx && hasTag(jobOf(q), 'outlaw')) {
      log(s, `👮 Le Policier fait défausser le ${jobOf(q).name} de ${q.name}`, 'malus')
      loseJob(s, qi, { cause: 'policier', by: pIdx })
    }
  })
}

// Avantages instantanés (API) déclenchés à la pose d'un métier
// (pose normale ou via Piston) — retourne true si un flux est posé
export function triggerJobApi(s, pIdx, card) {
  if (card.key === 'journaliste') {
    startFlow(s, 'journalist')
    return true
  }
  if (card.key === 'medium') {
    startFlow(s, 'medium')
    return true
  }
  if (card.key === 'astronaute') {
    if (s.discard.some((e) => isPlayableFromDiscard(s, pIdx, e.card))) {
      startFlow(s, 'discard-pick', { source: 'Astronaute' })
      return true
    }
    log(s, `L’avantage de l’Astronaute est perdu (rien de jouable dans la défausse)`)
  }
  if (card.key === 'chef_achats' || card.key === 'chef_ventes') {
    if (s.players.some((q, qi) => qi !== pIdx && q.hand.length > 0)) {
      startFlow(s, 'chef-troc')
      return true
    }
    log(s, `L’avantage du ${card.name} est perdu (aucun adversaire avec des cartes)`)
  }
  return false
}

// ---------------------------------------------------------------------------
// Pose d'une carte devant soi (placement + effets)
// Retourne true si la pose ouvre un choix (un flux posé sur la pile)
// ---------------------------------------------------------------------------
export function poseSelf(s, pIdx, card, { fromForced = false } = {}) {
  const p = s.players[pIdx]
  // Intérimaire : le métier part à la défausse, dans la même action
  // (les salaires déjà posés restent en place)
  const replaced = interimReplaced(p, card)
  if (replaced) {
    log(s, `${p.name} quitte son poste de ${replaced.name} (métier intérimaire défaussé)`)
    loseJob(s, pIdx, { cause: 'interim', by: pIdx })
  }
  switch (card.type) {
    case 'study':
      place(s, pIdx, card)
      log(s, `${p.name} pose ${card.name} (${p.studies.length} carte(s), niveau ${p.studies.reduce((t, c) => t + c.levels, 0)})`)
      break

    case 'job': {
      if (isGrandProf(card)) {
        // promotion : le Prof est défaussé
        const prof = jobOf(p)
        remove(s, prof.uid, { cause: 'promotion', by: pIdx })
        place(s, pIdx, card)
        log(s, `${p.name} est promu Grand Prof !`)
        break
      }
      place(s, pIdx, card)
      if (card.key === 'bandit') p.wasBandit = true
      log(s, `${p.name} devient ${card.name}`)
      // Policier : purge les Bandits et Gourous déjà posés
      if (card.key === 'policier') policeSweep(s, pIdx)
      // Avantages instantanés (API)
      return triggerJobApi(s, pIdx, card)
    }

    case 'salary':
      place(s, pIdx, card)
      log(s, `${p.name} pose un salaire niveau ${card.level}`)
      break

    case 'flirt': {
      place(s, pIdx, card)
      log(s, `${p.name} flirte ${card.name} ${card.emoji}`)
      // Vol de flirt : même lieu que le flirt du DESSUS d'un adversaire
      s.players.forEach((q, qi) => {
        if (qi === pIdx) return
        const top = topFlirt(q)
        if (top && top.place === card.place) {
          // le flirt volé est posé de nouveau, chez le voleur
          steal(s, top.uid, pIdx, { cause: 'vol' })
          log(s, `💘 ${p.name} vole le flirt ${top.name} de ${q.name} !`, 'malus')
        }
      })
      break
    }

    case 'marriage':
      place(s, pIdx, card)
      log(s, `💒 ${p.name} se marie à ${card.name} !`)
      break

    case 'adultery':
      place(s, pIdx, card)
      log(s, `😏 ${p.name} commence un adultère...`)
      break

    case 'child':
      place(s, pIdx, card)
      log(s, `👶 ${p.name} accueille ${card.name} !`)
      break

    case 'acquisition': {
      if (hasTag(card, 'animal')) {
        place(s, pIdx, card)
        log(s, `${p.name} adopte ${card.name} ${card.emoji || ''}`)
        break
      }
      if (hasTag(card, 'travel') && hasJob(p, 'pilote')) {
        place(s, pIdx, card)
        log(s, `✈️ ${p.name} voyage gratuitement à ${card.name} (Pilote)`)
        break
      }
      // achat à payer : le flux d'achat attend le paiement (flows/purchase.js)
      startFlow(s, 'purchase', { card, fromForced })
      return true
    }

    case 'distinction': {
      place(s, pIdx, card)
      log(s, `🏅 ${p.name} reçoit ${card.name} !`)
      break
    }

    case 'special':
      return applySpecial(s, pIdx, card)
  }
  return false
}

// Anniversaire : applique tous les cadeaux d'un coup (gifts[qi] = uid du salaire
// offert par le joueur qi), dans l'ordre des joueurs
export function giveBirthdayGifts(s, pIdx, gifts) {
  const p = s.players[pIdx]
  let count = 0
  s.players.forEach((q, qi) => {
    if (qi === pIdx) return
    const gift = unspentMoney(s, q).find((c) => c.uid === gifts[qi])
    if (gift) {
      steal(s, gift.uid, pIdx, { cause: 'anniversaire', by: qi })
      count++
      log(s, `🎂 ${q.name} offre un salaire niveau ${gift.level} à ${p.name}`)
    } else {
      log(s, `🎂 ${q.name} n’a aucun salaire à offrir`)
    }
  })
  if (count === 0) log(s, `🎂 Triste anniversaire pour ${p.name}...`)
}

// ---------------------------------------------------------------------------
// Cartes spéciales — retourne true si un flux est posé
// ---------------------------------------------------------------------------
function applySpecial(s, pIdx, card) {
  const p = s.players[pIdx]
  switch (card.key) {
    case 'anniversaire': {
      place(s, pIdx, card)
      // chaque adversaire ayant un salaire non investi choisit celui qu'il offre
      // (action BIRTHDAY_GIFT) ; sans donateur, l'anniversaire est réglé tout de suite
      const donors = birthdayDonors(s, pIdx)
      if (donors.length === 0) {
        giveBirthdayGifts(s, pIdx, {})
        return false
      }
      startFlow(s, 'birthday', { card, donors })
      return true
    }
    case 'arcenciel':
      place(s, pIdx, card)
      // +3 jeux : après consommation de la pose de l'Arc-en-ciel, il en reste 3
      addPlays(s, 3)
      startRainbow(s) // le joueur peut s'arrêter quand il veut (END_PLAYS)
      log(s, `🌈 ${p.name} joue Arc-en-ciel : jusqu’à 3 cartes d’un coup !`)
      return false
    case 'chance': {
      place(s, pIdx, card)
      const cards = draw(s, pIdx, { count: 3, to: 'aside' })
      // Chance agit comme une pioche : elle ne consomme pas le jeu du tour
      addPlays(s, 1)
      log(s, `🍀 ${p.name} joue Chance : pioche ${cards.length} cartes, en garde une en main`)
      startFlow(s, 'chance', { cards })
      return true
    }
    case 'etoile':
      place(s, pIdx, card)
      log(s, `🌠 ${p.name} joue Étoile filante`)
      startFlow(s, 'discard-pick', { source: 'Étoile filante' })
      return true
    case 'heritage':
      place(s, pIdx, card)
      log(s, `💵 ${p.name} touche un Héritage : 3 liasses pour ses futurs achats`)
      return false
    case 'piston':
      place(s, pIdx, card)
      startFlow(s, 'piston', { card })
      return true
    case 'troc':
      place(s, pIdx, card)
      startFlow(s, 'troc')
      return true
    case 'tsunami': {
      place(s, pIdx, card)
      let pool = []
      s.players.forEach((q, qi) => { pool = pool.concat(takeAll(s, { hand: qi })) })
      pool = shuffle(pool, rngOf(s))
      // redistribution équitable : chacun vers sa taille de main cible
      const order = s.players.map((_, i) => (pIdx + i) % s.players.length)
      let active = true
      while (pool.length > 0 && active) {
        active = false
        for (const qi of order) {
          if (pool.length === 0) break
          if (s.players[qi].hand.length < handTarget(s.players[qi])) {
            put(s, pool.pop(), { hand: qi })
            active = true
          }
        }
      }
      // s'il reste des cartes (mains inégales), distribution round-robin
      let k = 0
      while (pool.length > 0) {
        put(s, pool.pop(), { hand: order[k % order.length] })
        k++
      }
      log(s, `🌊 ${p.name} déclenche un Tsunami : toutes les mains sont redistribuées !`)
      return false
    }
    case 'vengeance':
      place(s, pIdx, card)
      startFlow(s, 'vengeance')
      return true
    case 'casino':
      place(s, pIdx, card)
      s.casino = { owner: pIdx, stake: null }
      log(s, `🎰 ${p.name} ouvre un Casino !`)
      if (p.hand.some((c) => c.type === 'salary')) {
        startFlow(s, 'casino-stake')
        return true
      }
      return false
  }
  return false
}
