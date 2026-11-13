// ---------------------------------------------------------------------------
// Smile Life — le pilote (« driver ») d'une partie
// Seul code qui tient l'état complet. Il :
//  - reçoit les actions d'un siège : dispatch(seat, action) signe `by` lui-même
//    (un siège ne peut pas agir au nom d'un autre) ;
//  - donne à chaque siège sa vue : view(seat) = viewFor(state, seat) + délais ;
//  - tient les délais : un joueur qui doit agir et a une action par défaut
//    (Anniversaire, défausse du Chercheur) a 30 s ; passé ce délai, le pilote
//    joue pour lui l'action par défaut (fallbackAction, src/game/turn.js).
// Le moteur (src/game/) ne connaît ni écrans, ni temps, ni téléphones.
//
// Sièges : [{ name, color, kind: 'human' }]. `kind` prendra plus tard
// 'bot' et 'remote' (pas encore construits).
// ---------------------------------------------------------------------------
import { gameReducer } from '../game/reducer.js'
import { viewFor } from '../game/view.js'
import { whoMustAct, fallbackAction } from '../game/turn.js'

export const WAIT_MS = 30000

// options :
//  seats      : sièges de la partie (2 à 4)
//  seed       : graine du hasard (facultative)
//  oneAtATime : un seul délai à la fois (écran partagé : les donateurs de
//               l'Anniversaire sont sollicités l'un après l'autre)
//  now        : horloge (ms) ; tests : horloge factice
//  timers     : false → pas de minuterie réelle, appeler tick() à la main (tests)
//  state      : partie déjà commencée (reprise, tests) au lieu d'une nouvelle
export function createDriver({ seats, seed, state: initial, oneAtATime = false, waitMs = WAIT_MS, now = () => Date.now(), timers = true } = {}) {
  if (!Array.isArray(seats) || seats.length < 2) throw new Error('createDriver : au moins 2 sièges')
  const seatList = seats.map((s) => ({ name: s.name, color: s.color ?? null, kind: s.kind ?? 'human' }))

  let state = initial ?? gameReducer(null, {
    type: 'START_GAME',
    names: seatList.map((s) => s.name),
    colors: seatList.map((s) => s.color),
    seed,
  })
  const history = [] // actions acceptées, signées (pour rejouer une partie)
  let deadlines = [] // [{ seat, key, until, total }]
  let timer = null
  const listeners = new Set()

  const emit = () => { for (const fn of listeners) fn() }

  // délais en cours : un par joueur qui doit agir et a une action par défaut.
  // Un délai déjà lancé est conservé tant que le joueur attend la même étape.
  function refreshDeadlines() {
    const waiting = whoMustAct(state).filter((seat) => fallbackAction(state, seat))
    const chosen = oneAtATime ? waiting.slice(0, 1) : waiting
    const key = state.pending?.type ?? null
    deadlines = chosen.map((seat) => {
      const old = deadlines.find((d) => d.seat === seat && d.key === key)
      return old ?? { seat, key, until: now() + waitMs, total: waitMs }
    })
    schedule()
  }

  function schedule() {
    if (!timers) return
    if (timer) clearTimeout(timer)
    timer = null
    if (deadlines.length === 0) return
    const first = Math.min(...deadlines.map((d) => d.until))
    timer = setTimeout(tick, Math.max(0, first - now()))
  }

  // applique l'action reçue d'un siège ; true si le moteur l'a acceptée
  function dispatch(seat, action) {
    if (!Number.isInteger(seat) || seat < 0 || seat >= seatList.length) return false
    const signed = { ...action, by: seat }
    const next = gameReducer(state, signed)
    if (next === state) return false
    state = next
    history.push(signed)
    refreshDeadlines()
    emit()
    return true
  }

  // délai dépassé → action par défaut pour ce joueur
  function tick() {
    let acted = true
    while (acted) {
      acted = false
      for (const d of deadlines) {
        if (d.until > now()) continue
        const a = fallbackAction(state, d.seat)
        if (a && dispatch(d.seat, a)) { acted = true; break }
      }
    }
    schedule()
  }

  // ce que voit un siège (null : spectateur). Les délais sont publics.
  function view(seat) {
    const v = viewFor(state, seat)
    v.deadlines = deadlines.map(({ seat: s, until, total }) => ({ seat: s, until, total }))
    return v
  }

  refreshDeadlines()

  return {
    seats: seatList,
    dispatch,
    view,
    tick,
    deadlines: () => deadlines.map((d) => ({ ...d })),
    history: () => history.slice(),
    // état complet : pour les tests et la sauvegarde seulement, jamais pour l'interface
    fullState: () => state,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    destroy() {
      if (timer) clearTimeout(timer)
      timer = null
      listeners.clear()
    },
  }
}
