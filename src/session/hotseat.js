// ---------------------------------------------------------------------------
// Smile Life — mode « un seul téléphone » (hot-seat), au-dessus du pilote
// Tous les sièges sont sur cet appareil. L'écran « Passe l'écran à … » n'est
// plus un état du jeu : il apparaît dès que le siège qui doit tenir l'écran
// change, jusqu'à ce que ce joueur dise « Prêt ».
//
// Qui doit tenir l'écran ?
//  - le Chercheur qui perd son métier pendant le tour d'un autre (le temps de
//    choisir sa carte), puis l'écran revient au joueur dont c'est le tour ;
//  - sinon le joueur dont c'est le tour. Les donateurs de l'Anniversaire et
//    l'adversaire du Troc du Chef agissent sur l'écran du joueur courant.
//
// screen() dit quoi afficher :
//  { kind: 'linger', seat } fin de tour : la table reste affichée du point de
//                           vue de ce joueur (animations), puis settled()
//  { kind: 'pass', seat, reason } « Passe l'écran à … » ; reason :
//                           'turn' (nouveau tour), 'chercheur', 'back'
//  { kind: 'play', seat }   la vue de ce joueur
//  { kind: 'over' }         fin de partie
// ---------------------------------------------------------------------------
import { createDriver } from './driver.js'

export function createHotseat({ seats, seed, state, now, timers = true } = {}) {
  const driver = createDriver({ seats, seed, state, now, timers, oneAtATime: true })
  let holder = null     // siège qui a l'écran (après « Prêt »)
  let holderTurn = null // n° du tour où il l'a reçu
  let linger = null     // siège dont la vue reste affichée en fin de tour
  let version = 0
  const listeners = new Set()
  const emit = () => { version++; for (const fn of listeners) fn() }

  const pub = () => driver.view(null)

  // le siège qui doit avoir l'écran maintenant
  function wanted(v) {
    const pend = v.pending
    if (pend?.type === 'chercheur-discard' && pend.player !== v.current) return pend.player
    return v.current
  }

  function screen() {
    const v = pub()
    if (linger != null) return { kind: 'linger', seat: linger }
    if (v.status !== 'playing') return { kind: 'over' }
    const seat = wanted(v)
    if (holder === seat && holderTurn === v.turnCount) return { kind: 'play', seat }
    const reason = seat !== v.current ? 'chercheur' : holderTurn === v.turnCount ? 'back' : 'turn'
    return { kind: 'pass', seat, reason }
  }

  // fin de tour (ou de partie) alors que le joueur du tour tenait l'écran :
  // on garde sa vue le temps des animations
  let last = pub()
  driver.subscribe(() => {
    const v = pub()
    const turnEnded = v.turnCount !== last.turnCount || (v.status !== 'playing' && last.status === 'playing')
    if (turnEnded && holder != null && holder === last.current && holderTurn === last.turnCount) linger = holder
    last = v
    emit()
  })

  return {
    driver,
    seats: driver.seats,
    screen,
    view: (seat) => driver.view(seat),
    // « Prêt, c'est moi » sur l'écran de passage
    ready() {
      const sc = screen()
      if (sc.kind !== 'pass') return
      holder = sc.seat
      holderTurn = pub().turnCount
      emit()
    },
    // animations de fin de tour terminées
    settled() {
      if (linger == null) return
      linger = null
      emit()
    },
    // action venant de l'écran partagé : par défaut au nom du joueur qui tient
    // l'écran ; `by` peut désigner un autre siège assis à la même table
    // (donateur de l'Anniversaire, adversaire du Troc du Chef).
    dispatch(action) {
      const sc = screen()
      if (sc.kind !== 'play') return false
      const { by, ...rest } = action
      return driver.dispatch(by ?? sc.seat, rest)
    },
    version: () => version,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    destroy() {
      listeners.clear()
      driver.destroy()
    },
  }
}
