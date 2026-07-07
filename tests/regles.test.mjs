// Tests ciblés des 5 corrections signalées
import { gameReducer } from '../src/game/reducer.js'
import { canPoseSelf, canTakeDiscardTop } from '../src/game/rules.js'
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

console.log(`\n✅ ${passed} vérifications OK`)
