// Simulation headless : joue des parties complètes au hasard via le reducer
import { step, newGame, stats } from './sim-lib.mjs'
import { computeScore } from '../src/game/scoring.js'
import { buildDeck } from '../src/data/cards.js'

const deck = buildDeck()
console.log('Total cartes :', deck.length)
const byType = {}
for (const c of deck) byType[c.type] = (byType[c.type] || 0) + 1
console.log(byType)
if (deck.length !== 200) throw new Error('Le paquet ne fait pas 200 cartes !')

let totalTurns = 0
for (let g = 0; g < 40; g++) {
  let s = newGame(g)
  const n = s.players.length
  const river = s.riverEnabled
  let guard = 0
  while (s.screen !== 'gameover') {
    const next = step(s)
    if (next === s) {
      throw new Error(`Partie ${g} : action sans effet ! phase=${s.phase} pending=${s.pending?.type} forced=${s.forced?.name}`)
    }
    s = next
    if (++guard > 20000) throw new Error('Partie infinie ?')
  }
  totalTurns += guard
  // vérifications d'intégrité : toutes les cartes comptabilisées
  let count = s.deck.length + s.discard.length + s.removed.length + s.river.length
  if (s.casino?.stake) count += 1
  for (const p of s.players) {
    count += p.hand.length + p.studies.length + (p.job ? 1 : 0) + p.salaries.length + p.flirts.length +
      (p.marriage ? 1 : 0) + (p.adultery ? 1 : 0) + p.children.length + p.acquisitions.length +
      p.distinctions.length + p.specials.length + p.malusKept.length
    const sc = computeScore(p)
    if (sc.total < 0 || isNaN(sc.total)) throw new Error('score invalide')
    if (p.hand.length !== 0) throw new Error('main non défaussée en fin de partie')
  }
  if (count !== 200) throw new Error(`Partie ${g} : ${count} cartes comptées au lieu de 200 !`)
  const scores = s.players.map((p) => computeScore(p).total)
  console.log(`Partie ${g} (${n}j${river ? ', rivière' : ''}) : ${guard} étapes — scores ${scores.join(' / ')}`)
}
console.log(`\n✅ 40 parties complètes sans erreur (${totalTurns} étapes au total, ${stats.birthdayGifts} cadeaux d’Anniversaire, ${stats.chercheurDiscards} défausses de Chercheur)`)
