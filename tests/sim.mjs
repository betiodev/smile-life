// Simulation headless : joue des parties complètes au hasard via le reducer,
// avec les vérifications d'intégrité (tests/invariants.mjs) après chaque action.
// 40 parties du jeu de base, puis 30 avec l'extension factice 'test'
// (tests/ext/test-ext.mjs : carte jouée d'office au centre, protection, cartes
// mises de côté).
import { playGame, stats } from './sim-lib.mjs'
import { computeScore } from '../src/game/scoring.js'
import { buildDeck } from '../src/data/index.js'
import { boardCards, outOfGameCards } from '../src/game/state.js'

const deck = buildDeck()
console.log('Total cartes :', deck.length)
const byType = {}
for (const c of deck) byType[c.type] = (byType[c.type] || 0) + 1
console.log(byType)
if (deck.length !== 200) throw new Error('Le paquet ne fait pas 200 cartes !')

// SEED=… GAME=… [EXT=test] node tests/sim.mjs : rejoue une seule partie (graine affichée en cas d'échec)
const only = process.env.SEED != null
const games = only
  ? [{ g: Number(process.env.GAME ?? 0), seed: Number(process.env.SEED), extensions: process.env.EXT ? process.env.EXT.split(',') : [] }]
  : [
    ...Array.from({ length: 40 }, (_, g) => ({ g, seed: g, extensions: [] })),
    ...Array.from({ length: 30 }, (_, g) => ({ g, seed: 1000 + g, extensions: ['test'] })),
  ]

let totalTurns = 0
const seenExt = { center: 0, timers: 0, protectedCards: 0 }
for (const { g, seed, extensions } of games) {
  let maxCenter = 0
  const { state: s, steps: guard } = playGame(g, seed, {
    invariants: true, extensions,
    onStep(st) {
      maxCenter = Math.max(maxCenter, st.center.length)
      for (const m of Object.values(st.meta)) {
        if (m.timer) seenExt.timers++
        if (m.protectedBy) seenExt.protectedCards++
      }
    },
  })
  seenExt.center += maxCenter > 0 ? 1 : 0
  const n = s.players.length
  const river = s.riverEnabled
  totalTurns += guard
  const size = buildDeck(extensions).length
  // vérifications d'intégrité : toutes les cartes comptabilisées
  let count = s.deck.length + s.discard.length + outOfGameCards(s).length + s.river.length + s.center.length + s.pot.length + s.spare.length
  if (s.casino?.stake) count += 1
  for (const p of s.players) {
    count += p.hand.length + boardCards(p).length
    const sc = computeScore(s, p)
    if (sc.total < 0 || isNaN(sc.total)) throw new Error(`Partie ${g} (graine ${seed}) : score invalide`)
    if (p.hand.length !== 0) throw new Error(`Partie ${g} (graine ${seed}) : main non défaussée en fin de partie`)
  }
  if (count !== size) throw new Error(`Partie ${g} (graine ${seed}) : ${count} cartes comptées au lieu de ${size} !`)
  const scores = s.players.map((p) => computeScore(s, p).total)
  const ext = extensions.length ? `, ${extensions.join('+')}` : ''
  console.log(`Partie ${g} (graine ${seed}, ${n}j${river ? ', rivière' : ''}${ext}) : ${guard} étapes — scores ${scores.join(' / ')}`)
}
if (!only) {
  // l'extension factice a bien servi : carte au centre, durée, protection
  if (seenExt.center === 0 || seenExt.timers === 0 || seenExt.protectedCards === 0)
    throw new Error(`Extension test peu jouée : ${JSON.stringify(seenExt)}`)
  console.log(`Extension test : ${seenExt.center} parties avec une carte au centre`)
}
console.log(`\n✅ ${games.length} parties complètes sans erreur (${totalTurns} étapes au total, ${stats.birthdayGifts} cadeaux d’Anniversaire, ${stats.chercheurDiscards} défausses de Chercheur)`)
