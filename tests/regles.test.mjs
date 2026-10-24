// Tests ciblés des 5 corrections signalées
import { gameReducer } from '../src/game/reducer.js'
import {
  canPoseSelf, canTakeDiscardTop, validatePayment, canPlayFromHand, canDiscardFromHand,
  flirtStealVictims, cheapestPayment, birthdayDonors,
} from '../src/game/rules.js'
import { buildDeck } from '../src/data/cards.js'

const deck = buildDeck()
const find = (pred) => deck.find(pred)
const findAll = (pred) => deck.filter(pred)

function freshState() {
  return gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], river: false })
}
let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}

// --- 1 & 5 : plafond = 6 CARTES études ; Médecin/Chirurgien au-delà ---------
{
  const s = freshState()
  const p = s.players[0]
  const singles = findAll((c) => c.type === 'study' && c.levels === 1)
  const double = find((c) => c.type === 'study' && c.levels === 2)
  // 5 cartes dont 1 double = 6 niveaux → une 6e carte doit être autorisée
  p.studies = [...singles.slice(0, 4), double]
  check('5 cartes (dont 1 double, niv. 6) → 6e carte autorisée', canPoseSelf(s, 0, singles[10]).ok)
  // 6 cartes → 7e refusée
  p.studies = singles.slice(0, 6)
  check('6 cartes études → 7e refusée', !canPoseSelf(s, 0, singles[10]).ok)
  // Médecin : études continues même au-delà de 6 cartes
  p.job = find((c) => c.key === 'medecin')
  check('Médecin avec 6 cartes → 7e autorisée', canPoseSelf(s, 0, singles[10]).ok)
  p.job = find((c) => c.key === 'chirurgien')
  check('Chirurgien avec 6 cartes → 7e autorisée', canPoseSelf(s, 0, singles[10]).ok)
  // un autre métier bloque toujours les études
  p.job = find((c) => c.key === 'pizzaiolo')
  p.studies = singles.slice(0, 2)
  check('Pizzaïolo → études bloquées', !canPoseSelf(s, 0, singles[10]).ok)
}

// --- 2 : la victime d'un malus ne reprend pas sa carte défaussée ------------
{
  let s = freshState()
  const study = find((c) => c.type === 'study' && c.levels === 1)
  const redoublement = find((c) => c.key === 'redoublement')
  s.players[1].studies = [study]
  s.players[0].hand[0] = redoublement
  s.phase = 'play'
  s = gameReducer(s, { type: 'PLAY_MALUS', uid: redoublement.uid, target: 1 })
  const top = s.discard[s.discard.length - 1]
  check('Redoublement : l’étude défaussée est au nom de la victime', top.card.uid === study.uid && top.by === 1)
  s.screen = 'game'; s.current = 1; s.phase = 'draw'
  check('La victime ne peut pas reprendre son étude de la défausse', !canTakeDiscardTop(s, 1).ok)
  check('Un autre joueur peut la reprendre', canTakeDiscardTop(s, 0).ok)

  // Divorce : le mariage défaussé est au nom de la victime
  let s2 = freshState()
  const marriage = find((c) => c.type === 'marriage')
  const flirt = find((c) => c.type === 'flirt')
  const divorce = find((c) => c.key === 'divorce')
  s2.players[1].marriage = marriage
  s2.players[1].flirts = [flirt]
  s2.players[0].hand[0] = divorce
  s2.phase = 'play'
  s2 = gameReducer(s2, { type: 'PLAY_MALUS', uid: divorce.uid, target: 1 })
  const top2 = s2.discard[s2.discard.length - 1]
  check('Divorce : le mariage défaussé est au nom de la victime', top2.card.uid === marriage.uid && top2.by === 1)
  s2.current = 1; s2.phase = 'draw'
  check('La victime ne peut pas reprendre son mariage', !canTakeDiscardTop(s2, 1).ok)
}

// --- 3 : Chance → la carte gardée va en main, le tour se joue normalement ---
{
  let s = freshState()
  const chance = find((c) => c.key === 'chance')
  s.players[0].hand[0] = chance
  s.screen = 'game'
  s.phase = 'play'
  const before = s.players[0].hand.length // 5
  s = gameReducer(s, { type: 'PLAY_SELF', uid: chance.uid })
  check('Chance ouvre le choix des 3 cartes', s.pending?.type === 'chance' && s.pending.cards.length === 3)
  const kept = s.pending.cards[1]
  s = gameReducer(s, { type: 'CHANCE_PICK', uid: kept.uid })
  const p = s.players[0]
  check('La carte gardée est en main', p.hand.some((c) => c.uid === kept.uid))
  check('Pas de carte forcée après Chance', !s.forced)
  check('Le joueur doit encore jouer sa carte du tour', s.phase === 'play' && s.playsRemaining === 1 && s.screen === 'game')
  check('Main = 5 (a joué Chance, gardé 1)', p.hand.length === before)
  check('Les 2 autres cartes sont défaussées à son nom', s.discard.slice(-2).every((e) => e.by === 0))
}

// --- 4 : Barmaid — flirts illimités sans mariage, plafond au départ du métier
{
  const s = freshState()
  const p = s.players[0]
  const flirts = findAll((c) => c.type === 'flirt')
  const barmaid = find((c) => c.key === 'barmaid')
  check('La carte s’appelle Barmaid', barmaid.name === 'Barmaid')
  p.flirts = flirts.slice(0, 5)
  check('Sans métier : 6e flirt refusé', !canPoseSelf(s, 0, flirts[6]).ok)
  p.job = barmaid
  check('Barmaid célibataire : 6e flirt autorisé', canPoseSelf(s, 0, flirts[6]).ok)
  p.flirts = flirts.slice(0, 7)
  check('Barmaid : 8e flirt autorisé (illimité)', canPoseSelf(s, 0, flirts[8]).ok)
  p.marriage = find((c) => c.type === 'marriage')
  check('Barmaid mariée : flirt interdit', !canPoseSelf(s, 0, flirts[8]).ok)
  p.marriage = null
  p.job = null // démission/licenciement
  check('Après le métier : flirts conservés (7) mais plus de pose', !canPoseSelf(s, 0, flirts[8]).ok && p.flirts.length === 7)
}

// --- Achat : pas de salaire superflu (anti-évasion fiscale) ------------------
{
  // coût 3 : [2,1] exact → OK ; [2,2] surpaie inévitable → OK ; [2,2,1] superflu → refusé
  check('Paiement exact accepté', validatePayment(3, [2, 1]).ok)
  check('Surpaie inévitable acceptée (manque 1, paie avec un salaire de 2)', validatePayment(3, [2, 2]).ok)
  check('Salaire superflu refusé', !validatePayment(3, [2, 2, 1]).ok)
  check('Total insuffisant refusé', !validatePayment(3, [1, 1]).ok)
  // héritage (3 liasses, tout ou rien)
  check('Héritage nécessaire accepté', validatePayment(3, [], 3).ok)
  check('Héritage superflu refusé', !validatePayment(3, [3], 3).ok)
  check('Salaire superflu en plus de l’héritage refusé', !validatePayment(3, [1], 3).ok)

  // et côté reducer : PURCHASE_CONFIRM applique la même règle
  const s = freshState()
  const travel = find((c) => c.acqType === 'travel')
  const sal2 = findAll((c) => c.type === 'salary' && c.level === 2)
  const sal1 = find((c) => c.type === 'salary' && c.level === 1)
  s.screen = 'game'
  s.phase = 'play'
  s.players[0].salaries = [sal2[0], sal2[1], sal1].map((card) => ({ card, invested: false }))
  s.pending = { type: 'purchase', cardUid: travel.uid, card: travel, fromForced: false }
  const refus = gameReducer(s, { type: 'PURCHASE_CONFIRM', salaryUids: [sal2[0].uid, sal2[1].uid, sal1.uid], useHeritage: false })
  check('Reducer : achat avec salaire superflu refusé', refus === s)
  const okBuy = gameReducer(s, { type: 'PURCHASE_CONFIRM', salaryUids: [sal2[0].uid, sal2[1].uid], useHeritage: false })
  check('Reducer : surpaie inévitable acceptée (4/3)', okBuy !== s && okBuy.players[0].acquisitions.some((c) => c.uid === travel.uid))
  check('Reducer : les 2 salaires choisis sont investis, le 3e non',
    okBuy.players[0].salaries.filter((x) => x.invested).length === 2 &&
    !okBuy.players[0].salaries.find((x) => x.card.uid === sal1.uid).invested)
}

// --- Anniversaire : chaque donateur choisit le salaire offert ---------------
{
  let s = freshState()
  s.screen = 'game'
  s.phase = 'play'
  const anniv = find((c) => c.key === 'anniversaire')
  const [s1, s3] = [find((c) => c.type === 'salary' && c.level === 1), find((c) => c.type === 'salary' && c.level === 3)]
  s.players[0].hand[0] = anniv
  s.players[1].salaries = [s1, s3].map((card) => ({ card, invested: false }))
  check('Anniversaire : Ben est donateur', birthdayDonors(s, 0).join() === '1')
  const choisi = gameReducer(s, { type: 'PLAY_SELF', uid: anniv.uid, gifts: { 1: s3.uid } })
  check('Anniversaire : le salaire choisi (niveau 3) est offert',
    choisi.players[0].salaries.some((x) => x.card.uid === s3.uid) && choisi.players[1].salaries.some((x) => x.card.uid === s1.uid))
  const auto = gameReducer(s, { type: 'PLAY_SELF', uid: anniv.uid })
  check('Anniversaire sans choix : le plus petit est offert', auto.players[0].salaries.some((x) => x.card.uid === s1.uid))
  // un salaire investi ne peut pas être offert, même s'il est « choisi »
  s.players[1].salaries[1].invested = true
  const triche = gameReducer(s, { type: 'PLAY_SELF', uid: anniv.uid, gifts: { 1: s3.uid } })
  check('Anniversaire : un salaire investi n’est jamais offert', triche.players[1].salaries.some((x) => x.card.uid === s3.uid))
  s.players[1].salaries = [{ card: s3, invested: true }]
  check('Anniversaire : sans salaire non investi, pas de donateur', birthdayDonors(s, 0).length === 0)
}

// --- Aides d'interface : jouabilité, défausse forcée, vol de flirt, paiement --
{
  const s = freshState()
  s.screen = 'game'
  s.phase = 'play'
  const sal = find((c) => c.type === 'salary' && c.level === 1)
  check('Salaire sans métier : injouable, avec la raison du moteur', canPlayFromHand(s, 0, sal).reason === 'Il faut un métier pour poser un salaire')
  const prison = find((c) => c.key === 'prison')
  check('Prison sans Bandit en jeu : injouable', !canPlayFromHand(s, 0, prison).ok)
  s.forced = sal
  s.forcedConsumesPlay = true
  check('Carte prise dans la défausse : défausse interdite', !canDiscardFromHand(s, 0, sal).ok)
  s.forcedConsumesPlay = false
  check('Carte d’Étoile filante : défausse permise', canDiscardFromHand(s, 0, sal).ok)

  const bars = findAll((c) => c.type === 'flirt' && c.place === 'Au bar')
  const zoo = find((c) => c.type === 'flirt' && c.place === 'Au zoo')
  s.players[1].flirts = [bars[0], zoo]
  check('Flirt sous le dessus : pas de vol', flirtStealVictims(s, 0, bars[1]).length === 0)
  s.players[1].flirts = [zoo, bars[0]]
  check('Flirt du dessus, même lieu : vol chez Ben', flirtStealVictims(s, 0, bars[1]).join() === '1')

  const p = s.players[0]
  const lv = (n, k = 0) => findAll((c) => c.type === 'salary' && c.level === n)[k]
  p.salaries = [lv(4), lv(2), lv(1), lv(2, 1)].map((card) => ({ card, invested: false }))
  const pay = cheapestPayment(p, 3)
  check('Paiement le moins cher pour 3 : 2+1', pay.total === 3 && pay.salaryUids.length === 2)
  check('Paiement le moins cher pour 6 : 4+2', cheapestPayment(p, 6).total === 6 && cheapestPayment(p, 6).salaryUids.length === 2)
  check('Paiement impossible → null', cheapestPayment(p, 20) === null)
  p.heritage = 3
  check('Héritage seul quand il suffit pour 3 (aucun salaire investi)', cheapestPayment(p, 3).useHeritage && cheapestPayment(p, 3).salaryUids.length === 0)
}

console.log(`\n✅ ${passed} vérifications OK`)
