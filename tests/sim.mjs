// Simulation headless : joue des parties complètes au hasard via le reducer,
// avec les vérifications d'intégrité (tests/invariants.mjs) après chaque action
import { playGame, stats } from './sim-lib.mjs'
import { computeScore } from '../src/game/scoring.js'
import { buildDeck } from '../src/data/index.js'

const deck = buildDeck()
console.log('Total cartes :', deck.length)
const byType = {}
for (const c of deck) byType[c.type] = (byType[c.type] || 0) + 1
console.log(byType)
if (deck.length !== 200) throw new Error('Le paquet ne fait pas 200 cartes !')

// SEED=… GAME=… node tests/sim.mjs : rejoue une seule partie (graine affichée en cas d'échec)
const only = process.env.SEED != null
const games = only ? [{ g: Number(process.env.GAME ?? 0), seed: Number(process.env.SEED) }]
  : Array.from({ length: 40 }, (_, g) => ({ g, seed: g }))

let totalTurns = 0
for (const { g, seed } of games) {
  const { state: s, steps: guard } = playGame(g, seed, { invariants: true })
  const n = s.players.length
  const river = s.riverEnabled
  totalTurns += guard
  // vérifications d'intégrité : toutes les cartes comptabilisées
  let count = s.deck.length + s.discard.length + s.removed.length + s.river.length
  if (s.casino?.stake) count += 1
  for (const p of s.players) {
    count += p.hand.length + p.studies.length + (p.job ? 1 : 0) + p.salaries.length + p.flirts.length +
      (p.marriage ? 1 : 0) + (p.adultery ? 1 : 0) + p.children.length + p.acquisitions.length +
      p.distinctions.length + p.specials.length + p.malusKept.length
    const sc = computeScore(p)
    if (sc.total < 0 || isNaN(sc.total)) throw new Error(`Partie ${g} (graine ${seed}) : score invalide`)
    if (p.hand.length !== 0) throw new Error(`Partie ${g} (graine ${seed}) : main non défaussée en fin de partie`)
  }
  if (count !== 200) throw new Error(`Partie ${g} (graine ${seed}) : ${count} cartes comptées au lieu de 200 !`)
  const scores = s.players.map((p) => computeScore(p).total)
  console.log(`Partie ${g} (graine ${seed}, ${n}j${river ? ', rivière' : ''}) : ${guard} étapes — scores ${scores.join(' / ')}`)
}
console.log(`\n✅ ${games.length} parties complètes sans erreur (${totalTurns} étapes au total, ${stats.birthdayGifts} cadeaux d’Anniversaire, ${stats.chercheurDiscards} défausses de Chercheur)`)
