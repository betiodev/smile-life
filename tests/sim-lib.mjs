// Logique de simulation partagée (sim.mjs, view.test.mjs, golden.test.mjs) :
// choisit au hasard une action dans legalActions (src/game/legal.js).
// Tout est à graine : newGame(g, seed) fixe à la fois le hasard de la partie
// (state.rng) et celui des choix du simulateur. Même graine → même partie.
// Une seule partie simulée à la fois (le générateur du simulateur est partagé).
import { gameReducer as rawReducer, newGameState } from '../src/game/reducer.js'
import { whoMustAct } from '../src/game/turn.js'
import { makeRng } from '../src/game/rng.js'
import { legalActions } from '../src/game/legal.js'
import { checkInvariants } from './invariants.mjs'

export const stats = { birthdayGifts: 0, chercheurDiscards: 0 }

// hasard des choix du simulateur, distinct de celui de la partie
let random = makeRng('sim')
const randInt = (n) => Math.floor(random() * n)
const rand = (arr) => arr[randInt(arr.length)]

// chaque action est signée par un joueur autorisé à agir (whoMustAct),
// sauf si elle précise déjà son auteur
// recorder.actions = [] : enregistre chaque action acceptée (pour rejouer une partie)
export const recorder = { actions: null }

export function gameReducer(s, action) {
  if (action.type === 'START_GAME') return rawReducer(s, action)
  const signed = { ...action, by: action.by ?? rand(whoMustAct(s)) }
  const r = rawReducer(s, signed)
  if (recorder.actions && r !== s) recorder.actions.push(signed)
  return r
}

// actions rares : gardées chacune avec 2 % de chance (sinon le simulateur
// démissionnerait ou annulerait ses achats à tout bout de champ)
const RARE = new Set(['RESIGN', 'DIVORCE_VOLUNTARY', 'STOP_ADULTERY', 'PURCHASE_CANCEL'])

// choisit au hasard l'action à jouer parmi legalActions (sans l'appliquer)
export function chooseAction(s) {
  const by = rand(whoMustAct(s))
  const legal = legalActions(s, by)
  if (legal.length === 0)
    throw new Error(`aucune action possible pour J${by + 1} (phase=${s.phase} pending=${s.pending?.type} forced=${s.forced?.name})`)
  const common = legal.filter((a) => !RARE.has(a.type) || random() < 0.02)
  const a = rand(common.length > 0 ? common : legal)
  if (a.type === 'BIRTHDAY_GIFT') stats.birthdayGifts++
  if (a.type === 'CHERCHEUR_DISCARD') stats.chercheurDiscards++
  return a
}

// résout un état en jouant une action valide choisie au hasard
export function step(s) {
  return gameReducer(s, chooseAction(s))
}

// nouvelle partie n° g : 2 à 4 joueurs, rivière une partie sur deux.
// seed : graine de la partie et des choix du simulateur (par défaut g)
export function newGame(g, seed = g) {
  const n = 2 + (g % 3)
  const river = g % 2 === 0
  random = makeRng('sim-' + seed)
  return newGameState(Array.from({ length: n }, (_, i) => `J${i + 1}`), null, { river, seed })
}

// joue une partie complète ; renvoie l'état final et le nombre d'étapes.
// En cas d'erreur, le message donne la graine pour rejouer la partie.
export function playGame(g, seed = g, { onStep, invariants = false } = {}) {
  let s = newGame(g, seed)
  let steps = 0
  try {
    while (s.screen !== 'gameover') {
      onStep?.(s, steps)
      const action = chooseAction(s)
      const next = gameReducer(s, action)
      if (next === s)
        throw new Error(`action sans effet ! ${JSON.stringify(action)} phase=${s.phase} pending=${s.pending?.type} forced=${s.forced?.name}`)
      // vérifications d'intégrité après chaque action (tests/invariants.mjs)
      if (invariants) checkInvariants(s, action, next)
      s = next
      if (++steps > 20000) throw new Error('Partie infinie ?')
    }
    onStep?.(s, steps)
    if (invariants) checkInvariants(s, null, null)
  } catch (e) {
    e.message = `Partie ${g} (graine ${seed}, étape ${steps}) : ${e.message}\n  → rejouer : SEED=${seed} GAME=${g} node tests/sim.mjs`
    throw e
  }
  return { state: s, steps }
}
