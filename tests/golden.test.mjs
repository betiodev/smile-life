// Parties de référence (« golden ») : 50 parties simulées à graine fixe.
// Pour chacune on compare les scores finaux et une empreinte de l'état final
// avec tests/golden.json. Un changement qui se dit « sans effet sur les
// règles » doit les reproduire exactement.
// Un changement qui modifie volontairement l'ordre des tirages régénère le
// fichier avec `npm run golden:update` et le dit dans son message de commit.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { playGame } from './sim-lib.mjs'
import { computeScore } from '../src/game/scoring.js'

const FILE = fileURLToPath(new URL('./golden.json', import.meta.url))
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1)
const update = process.argv.includes('--update')

const hash = (state) => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16)

// la partie n° seed : 2 à 4 joueurs et rivière selon le numéro (comme sim.mjs)
const results = SEEDS.map((seed) => {
  const { state, steps } = playGame(seed, seed)
  return {
    seed,
    players: state.players.length,
    river: state.riverEnabled,
    steps,
    scores: state.players.map((p) => computeScore(p).total),
    hash: hash(state),
  }
})

if (update) {
  writeFileSync(FILE, JSON.stringify(results, null, 2).replace(/\[\n\s+([\d, \n]+?)\n\s+\]/g, (_, xs) => `[${xs.split(/,\s*/).join(', ')}]`) + '\n')
  console.log(`✅ ${results.length} parties de référence enregistrées dans tests/golden.json`)
  process.exit(0)
}

if (!existsSync(FILE)) throw new Error('tests/golden.json manquant : lancez `npm run golden:update`')
const expected = JSON.parse(readFileSync(FILE, 'utf8'))
const bySeed = new Map(expected.map((e) => [e.seed, e]))
const diffs = []
for (const r of results) {
  const e = bySeed.get(r.seed)
  if (!e) { diffs.push(`graine ${r.seed} : absente de golden.json`); continue }
  if (e.scores.join() !== r.scores.join()) diffs.push(`graine ${r.seed} : scores ${r.scores.join('/')} au lieu de ${e.scores.join('/')}`)
  else if (e.hash !== r.hash || e.steps !== r.steps) diffs.push(`graine ${r.seed} : état final différent (${r.steps} étapes au lieu de ${e.steps})`)
}
if (expected.length !== results.length) diffs.push(`golden.json contient ${expected.length} parties au lieu de ${results.length}`)
if (diffs.length) {
  throw new Error(`ÉCHEC : ${diffs.length} partie(s) de référence ne se rejouent plus à l'identique :\n  ` +
    diffs.join('\n  ') + '\n  (changement voulu ? `npm run golden:update`, et dites-le dans le commit)')
}
console.log(`✅ ${results.length} parties de référence rejouées à l'identique (scores et état final)`)
