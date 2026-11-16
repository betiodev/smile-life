// ---------------------------------------------------------------------------
// Smile Life — effets des cartes jouées (pose devant soi, malus, spéciales)
// Appelés par le flux du tour (src/game/flows/turn.js) et par d'autres flux
// (Piston, Vengeance, Anniversaire). Les zones ne changent que par les
// primitives ; un effet qui attend un joueur pose un flux sur la pile.
// ---------------------------------------------------------------------------
import { interimReplaced, hasTag, isGrandProf, needsPayment } from './rules.js'
import { setBy } from './queries.js'
import { jobOf, topFlirt, giftableMoney, moneyValue } from './state.js'
import { log, place, remove, steal, loseJob } from './primitives.js'
import { startFlow } from './flows/index.js'
import { BEHAVIOURS } from './cards/index.js'
// ---------------------------------------------------------------------------
// Effet d'un malus (jeu direct ET Vengeance) : le comportement du malus
// (onTarget, src/game/cards/)
// ---------------------------------------------------------------------------
export function applyMalus(s, attackerIdx, card, targetIdx) {
  const onTarget = BEHAVIOURS[card.def]?.onTarget
  if (!onTarget) throw new Error(`Malus sans effet (onTarget) : ${card.def}`)
  onTarget(s, { card, owner: attackerIdx, target: targetIdx })
}

// Ce que fait une carte quand son propriétaire la joue (déjà posée) :
// comportement onPlace (src/game/cards/) → true si un flux est posé.
// Pour tout type de carte : pose normale ou forcée, Piston, acquisition une
// fois payée (flows/purchase.js). Pas pour une carte volée ou offerte.
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
      // Policier (purge), Bandit, avantages instantanés : onPlace, plus bas
      break
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
        // le flirt volé est posé de nouveau, chez le voleur (un flirt
        // protégé reste en place : steal → null)
        if (top && top.place === card.place && steal(s, top.uid, pIdx, { cause: 'vol' })) {
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
        log(s, `✈️ ${p.name} voyage gratuitement à ${card.name} (${by?.effect.note ?? by?.card?.name})`)
        break
      }
      // achat à payer : le flux d'achat attend le paiement (flows/purchase.js),
      // qui joue onPlace une fois l'acquisition payée
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
      break

    default:
      // type que le jeu de base ne connaît pas (extension)
      place(s, pIdx, card)
  }
  // ce que fait la carte jouée, quel que soit son type (cards/)
  return runOnPlace(s, pIdx, card)
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
