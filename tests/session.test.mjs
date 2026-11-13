// Pilote (src/session/driver.js) et mode un seul téléphone (src/session/hotseat.js) :
// signature des actions, vues, délais avec action par défaut, écran de passage.
// Horloge factice : rien n'attend vraiment 30 s.
import { gameReducer } from '../src/game/reducer.js'
import { buildDeck } from '../src/data/index.js'
import { setJob, setMoney, moneyOf } from '../src/game/state.js'
import { createDriver, WAIT_MS } from '../src/session/driver.js'
import { createHotseat } from '../src/session/hotseat.js'

let passed = 0
function check(label, cond) {
  if (!cond) throw new Error('ÉCHEC : ' + label)
  console.log('✓', label)
  passed++
}

const deck = buildDeck()
const find = (pred) => deck.find(pred)
const seats3 = [{ name: 'Ana' }, { name: 'Ben' }, { name: 'Cléo' }]
const clock = () => {
  let t = 1000
  const now = () => t
  now.advance = (ms) => { t += ms }
  return now
}

// --- pilote : sièges, signature, vues ----------------------------------------
{
  const d = createDriver({ seats: seats3, seed: 7, timers: false })
  check('Sièges : nom, couleur, kind « human » par défaut',
    d.seats.length === 3 && d.seats.every((s) => s.kind === 'human' && 'color' in s) && d.seats[1].name === 'Ben')
  check('Le moteur ne connaît pas d’écran : seulement status', !('screen' in d.fullState()) && d.fullState().status === 'playing')
  check('Ben ne peut pas piocher pendant le tour d’Ana', d.dispatch(1, { type: 'DRAW_DECK' }) === false)
  check('Signer au nom d’un autre est impossible : `by` vient du siège',
    d.dispatch(1, { type: 'DRAW_DECK', by: 0 }) === false && d.fullState().phase === 'draw')
  check('Siège inconnu refusé', d.dispatch(7, { type: 'DRAW_DECK' }) === false && d.dispatch(null, { type: 'DRAW_DECK' }) === false)
  check('Ana pioche', d.dispatch(0, { type: 'DRAW_DECK' }) === true && d.fullState().phase === 'play')
  check('L’action enregistrée est signée par le siège', d.history().at(-1).by === 0 && d.history().length === 1)
  const v1 = d.view(1)
  check('Vue de Ben : sa main, pas celle d’Ana', v1.players[1].hand.every((c) => !c.hidden) && v1.players[0].hand.every((c) => c.hidden))
  check('Vue : ni pioche, ni rng, ni seed', !('deck' in v1) && !('rng' in v1) && !('seed' in v1))
  check('Vue : liste des délais (vide hors attente)', Array.isArray(v1.deadlines) && v1.deadlines.length === 0)
  let calls = 0
  const off = d.subscribe(() => calls++)
  const uid = d.fullState().players[0].hand[0].uid
  d.dispatch(0, { type: 'DISCARD_CARD', uid })
  check('Abonnés prévenus à chaque action acceptée', calls === 1)
  check('Fin du tour : turnCount avance, Ben joue', d.fullState().turnCount === 2 && d.fullState().current === 1)
  off()
  d.destroy()
}

// --- délais : Anniversaire -----------------------------------------------------
const anniv = find((c) => c.key === 'anniversaire')
const lv = (n) => find((c) => c.type === 'salary' && c.level === n)
function birthdayState() {
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'], seed: 3 })
  s.phase = 'play'
  s.players[0].hand[0] = anniv
  setMoney(s.players[1], [lv(3), lv(1)])
  setMoney(s.players[2], [lv(2)])
  return s
}
{
  // un délai par donateur (plusieurs téléphones, plus tard)
  const now = clock()
  const d = createDriver({ seats: seats3, state: birthdayState(), now, timers: false })
  d.dispatch(0, { type: 'PLAY_SELF', uid: anniv.uid })
  const dl = d.deadlines()
  check('Anniversaire : un délai de 30 s par donateur', dl.map((x) => x.seat).join() === '1,2' &&
    dl.every((x) => x.until === now() + WAIT_MS && x.total === WAIT_MS))
  check('Anniversaire : les délais sont dans la vue', d.view(0).deadlines.map((x) => x.seat).join() === '1,2')
  now.advance(10000)
  d.dispatch(1, { type: 'BIRTHDAY_GIFT', uid: lv(3).uid })
  check('Anniversaire : Ben a choisi, le délai de Cléo n’est pas relancé',
    d.deadlines().length === 1 && d.deadlines()[0].seat === 2 && d.deadlines()[0].until === 1000 + WAIT_MS)
  now.advance(WAIT_MS - 10001)
  d.tick()
  check('Anniversaire : rien avant l’échéance', d.fullState().pending?.type === 'birthday')
  now.advance(1)
  d.tick()
  const s = d.fullState()
  check('Anniversaire : à l’échéance, le pilote offre pour Cléo (plus petit salaire)', s.pending === null &&
    moneyOf(s.players[0]).some((c) => c.uid === lv(2).uid) && moneyOf(s.players[0]).some((c) => c.uid === lv(3).uid))
  check('Anniversaire : l’action par défaut est signée par Cléo', d.history().at(-1).by === 2 && d.history().at(-1).uid === null)
  check('Anniversaire : plus aucun délai ensuite', d.deadlines().length === 0)
}
{
  // un seul téléphone : un donateur à la fois, chacun ses 30 s
  const now = clock()
  const d = createDriver({ seats: seats3, state: birthdayState(), now, timers: false, oneAtATime: true })
  d.dispatch(0, { type: 'PLAY_SELF', uid: anniv.uid })
  check('Un seul écran : seul Ben est sollicité', d.deadlines().map((x) => x.seat).join() === '1')
  now.advance(WAIT_MS)
  d.tick()
  check('Un seul écran : délai de Ben dépassé → son plus petit salaire est offert, Cléo a 30 s à son tour',
    d.fullState().pending?.gifts[1] === lv(1).uid && d.deadlines().map((x) => x.seat).join() === '2' &&
    d.deadlines()[0].until === now() + WAIT_MS)
}
{
  // vraie minuterie : le pilote déclenche seul l'action par défaut
  const d = createDriver({ seats: seats3, state: birthdayState(), waitMs: 20 })
  d.dispatch(0, { type: 'PLAY_SELF', uid: anniv.uid })
  await new Promise((r) => setTimeout(r, 120))
  check('Minuterie réelle : les cadeaux sont faits sans intervention', d.fullState().pending === null && d.fullState().current === 1)
  d.destroy()
}

// --- délais : Chercheur --------------------------------------------------------
const chercheur = find((c) => c.key === 'chercheur')
const licenciement = find((c) => c.key === 'licenciement')
function chercheurState() {
  const s = gameReducer(null, { type: 'START_GAME', names: ['Ana', 'Ben', 'Cléo'], seed: 5 })
  s.phase = 'play'
  setJob(s.players[1], chercheur)
  s.players[1].hand.push(s.deck.pop())
  s.players[0].hand[0] = licenciement
  return s
}
{
  const now = clock()
  const d = createDriver({ seats: seats3, state: chercheurState(), now, timers: false })
  d.dispatch(0, { type: 'PLAY_MALUS', uid: licenciement.uid, target: 1 })
  check('Chercheur licencié : délai de 30 s pour Ben', d.deadlines().map((x) => x.seat).join() === '1')
  now.advance(WAIT_MS)
  d.tick()
  const s = d.fullState()
  check('Chercheur : à l’échéance, une carte est défaussée pour lui, le tour passe',
    s.pending === null && s.players[1].hand.length === 5 && s.current === 1 && d.history().at(-1).by === 1)
}

// --- un seul téléphone : écran de passage -------------------------------------
{
  const h = createHotseat({ seats: seats3, seed: 11, timers: false })
  check('Début : « Passe l’écran à Ana »', JSON.stringify(h.screen()) === '{"kind":"pass","seat":0,"reason":"turn"}')
  check('Avant « Prêt », aucune action', h.dispatch({ type: 'DRAW_DECK' }) === false)
  h.ready()
  check('Après « Prêt » : vue d’Ana', JSON.stringify(h.screen()) === '{"kind":"play","seat":0}')
  check('Ana pioche (signée par l’écran)', h.dispatch({ type: 'DRAW_DECK' }) === true)
  const uid = h.driver.fullState().players[0].hand[0].uid
  h.dispatch({ type: 'DISCARD_CARD', uid })
  check('Fin du tour : la table reste du point de vue d’Ana', JSON.stringify(h.screen()) === '{"kind":"linger","seat":0}')
  h.settled()
  check('Puis « Passe l’écran à Ben »', JSON.stringify(h.screen()) === '{"kind":"pass","seat":1,"reason":"turn"}')
  h.ready()
  check('Ben joue', h.screen().kind === 'play' && h.screen().seat === 1)
  h.destroy()
}
{
  // Chercheur licencié pendant le tour d'Ana : l'écran va à Ben, puis revient
  const now = clock()
  const h = createHotseat({ seats: seats3, state: chercheurState(), now, timers: false })
  h.ready()
  h.dispatch({ type: 'PLAY_MALUS', uid: licenciement.uid, target: 1 })
  check('Chercheur : « Passe l’écran à Ben »', JSON.stringify(h.screen()) === '{"kind":"pass","seat":1,"reason":"chercheur"}')
  check('Chercheur : le compte à rebours est dans la vue', h.view(null).deadlines[0]?.seat === 1)
  h.ready()
  check('Chercheur : Ben voit sa main', h.screen().seat === 1 && h.view(1).players[1].hand.every((c) => !c.hidden))
  const pick = h.driver.fullState().players[1].hand[0].uid
  h.dispatch({ type: 'CHERCHEUR_DISCARD', uid: pick })
  check('Chercheur : la carte choisie par Ben est défaussée', h.driver.fullState().discard.some((e) => e.card.uid === pick && e.by === 1))
  check('Chercheur : puis passage au tour de Ben, sans rester sur la vue de Ben',
    JSON.stringify(h.screen()) === '{"kind":"pass","seat":1,"reason":"turn"}')
}
{
  // le Chercheur ne choisit pas à temps pendant l'écran de passage
  const now = clock()
  const s = chercheurState()
  // Ana a 2 jeux (Arc-en-ciel) : son tour continue après la défausse du Chercheur
  s.playsRemaining = 2
  const h = createHotseat({ seats: seats3, state: s, now, timers: false })
  h.ready()
  h.dispatch({ type: 'PLAY_MALUS', uid: licenciement.uid, target: 1 })
  check('Chercheur (2 jeux) : l’écran va à Ben', h.screen().kind === 'pass' && h.screen().seat === 1)
  h.ready()
  h.dispatch({ type: 'CHERCHEUR_DISCARD', uid: h.driver.fullState().players[1].hand[0].uid })
  check('Chercheur (2 jeux) : « À toi de reprendre ton tour » pour Ana',
    JSON.stringify(h.screen()) === '{"kind":"pass","seat":0,"reason":"back"}')
  h.ready()
  check('Chercheur (2 jeux) : Ana reprend', JSON.stringify(h.screen()) === '{"kind":"play","seat":0}')

  const h2 = createHotseat({ seats: seats3, state: { ...s, playsRemaining: 2 }, now, timers: false })
  h2.ready()
  h2.dispatch({ type: 'PLAY_MALUS', uid: licenciement.uid, target: 1 })
  now.advance(WAIT_MS)
  h2.driver.tick()
  check('Délai dépassé pendant le passage d’écran : Ana retrouve directement son tour',
    JSON.stringify(h2.screen()) === '{"kind":"play","seat":0}' && h2.driver.fullState().players[1].hand.length === 5)
}

console.log(`\n✅ ${passed} vérifications du pilote et du mode un seul téléphone réussies`)
