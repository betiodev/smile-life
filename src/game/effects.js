// ---------------------------------------------------------------------------
// Smile Life — effets des cartes jouées (pose devant soi, malus, spéciales)
// Appelés par le flux du tour (src/game/flows/turn.js) et par d'autres flux
// (Piston, Vengeance, Anniversaire). Les zones ne changent que par les
// primitives ; un effet qui attend un joueur pose un flux sur la pile.
// ---------------------------------------------------------------------------
import { interimReplaced, hasTag, isGrandProf, needsPayment } from './rules.js'
import { setBy } from './queries.js'
import { jobOf, marriageOf, adulteryOf, topFlirt, taxableMoney, giftableMoney, moneyValue } from './state.js'
import { log, put, place, remove, removeAll, steal, loseJob, skip } from './primitives.js'
import { startFlow } from './flows/index.js'
import { BEHAVIOURS } from './cards/index.js'
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
      // le dernier salaire non investi (argent imposable)
      const last = taxableMoney(s, t).at(-1)
      if (last) {
        remove(s, last.uid, { cause: 'impot', by: attackerIdx })
        log(s, `${a.name} impose ${t.name} : salaire niveau ${moneyValue(last)} défaussé`, 'malus')
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

// Ce que fait une carte quand son propriétaire la joue (déjà posée) :
// comportement onPlace (src/game/cards/) → true si un flux est posé.
// Avantages instantanés des métiers (pose normale ou Piston), cartes spéciales.
export function runOnPlace(s, pIdx, card) {
  const onPlace = BEHAVIOURS[card.def]?.onPlace
  return onPlace ? !!onPlace(s, { card, owner: pIdx }) : false
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
      log(s, `${p.name} devient ${card.name}`)
      // Policier (purge), Bandit, avantages instantanés : cards/base.js
      return runOnPlace(s, pIdx, card)
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
      if (!needsPayment(s, pIdx, card)) {
        // gratuite (Pilote : voyages) : posée sans passer par l'achat
        const by = setBy(s, 'price', { player: pIdx, card })
        place(s, pIdx, card)
        log(s, `✈️ ${p.name} voyage gratuitement à ${card.name} (${by?.effect.note ?? by?.card.name})`)
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
      place(s, pIdx, card)
      return runOnPlace(s, pIdx, card)
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
    const gift = giftableMoney(s, q).find((c) => c.uid === gifts[qi])
    if (gift) {
      steal(s, gift.uid, pIdx, { cause: 'anniversaire', by: qi })
      count++
      log(s, `🎂 ${q.name} offre un salaire niveau ${moneyValue(gift)} à ${p.name}`)
    } else {
      log(s, `🎂 ${q.name} n’a aucun salaire à offrir`)
    }
  })
  if (count === 0) log(s, `🎂 Triste anniversaire pour ${p.name}...`)
}
