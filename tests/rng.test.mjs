// Hasard à graine : une partie se rejoue à l'identique à partir de sa graine
// et de ses actions, et le hasard du navigateur est banni de src/game/.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gameReducer, newGameState } from '../src/game/reducer.js'
import { makeRng, seedFrom } from '../src/game/rng.js'
import { playGame, recorder } from './sim-lib.mjs'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}

// --- Math.random interdit dans src/game/ ------------------------------------
{
  const root = fileURLToPath(new URL('../src/game/', import.meta.url))
  const files = []
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(m?js|jsx)$/.test(f)) files.push(p)
    }
  }
  walk(root)
  const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('Math.random'))
  check(`aucun Math.random dans src/game/ (${files.length} fichiers lus)` +
    (offenders.length ? ' — trouvé dans : ' + offenders.join(', ') : ''), offenders.length === 0)
}

// --- le générateur ------------------------------------------------------------
{
  const a = makeRng(42), b = makeRng(42), c = makeRng(43)
  const xa = Array.from({ length: 20 }, a), xb = Array.from({ length: 20 }, b), xc = Array.from({ length: 20 }, c)
  check('générateur : même graine → même suite', xa.join() === xb.join())
  check('générateur : autre graine → autre suite', xa.join() !== xc.join())
  check('générateur : nombres dans [0, 1[', xa.every((x) => x >= 0 && x < 1))
  check('graine texte acceptée et stable', seedFrom('bonjour') === seedFrom('bonjour') && seedFrom('bonjour') !== seedFrom('bonsoir'))
}

// --- START_GAME avec et sans graine ---------------------------------------------
{
  const start = (seed) => gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben'], seed })
  check('même graine → même partie au départ', JSON.stringify(start(7)) === JSON.stringify(start(7)))
  check('autre graine → autre pioche', start(7).deck.map((c) => c.uid).join() !== start(8).deck.map((c) => c.uid).join())
  check('graine texte : même partie', JSON.stringify(start('soirée')) === JSON.stringify(start('soirée')))
  const r1 = start(), r2 = start()
  check('sans graine : graine tirée au hasard', typeof r1.seed === 'number' && r1.deck.map((c) => c.uid).join() !== r2.deck.map((c) => c.uid).join())
  check('journal numéroté dans l’état (repart de 1 à chaque partie)', start(7).log[0].id === 1 && start(7).nextLogId === 1)
}

// --- rejouer une partie complète : même graine + mêmes actions → même état ---------
for (const g of [0, 1, 2, 5]) {
  recorder.actions = []
  const { state: played } = playGame(g, 1000 + g)
  const actions = recorder.actions
  recorder.actions = null
  // une partie neuve avec la même graine (mêmes joueurs, même rivière), puis les mêmes actions
  let s = newGameState(played.players.map((p) => p.name), null, { river: played.riverEnabled, seed: 1000 + g })
  for (const a of actions) s = gameReducer(s, a)
  check(`partie ${g} rejouée depuis sa graine et ses ${actions.length} actions : état final identique`,
    JSON.stringify(s) === JSON.stringify(played))
}

// --- deux simulations de la même graine sont identiques ---------------------------
{
  const a = playGame(3, 99).state, b = playGame(3, 99).state
  check('simulateur : même graine → même partie', JSON.stringify(a) === JSON.stringify(b))
}

console.log(`\n✅ ${passed} vérifications du hasard à graine réussies`)
