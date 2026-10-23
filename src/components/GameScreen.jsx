import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import Modals from './Modals'
import MyView from './MyView'
import TableView from './TableView'
import { FlightLayer, locateCards, prefersReducedMotion, previewDuration } from './flights'
import { canPoseSelf, canTakeDiscardTop, malusHasTarget } from '../game/rules'

const rectOf = (el) => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width ? { left: r.left, top: r.top, width: r.width } : null
}

// ---------------------------------------------------------------------------
// Animations : à chaque nouvel état, on repère les cartes qui ont changé de
// place et on les fait voler (pioche → main, main → plateau avec aperçu géant,
// main → défausse). Un malus fait trembler le plateau de la victime.
// ---------------------------------------------------------------------------
function useCardAnimations({ state, viewer, rootRef, lastAction, locked, onSettled, layout }) {
  const [flights, setFlights] = useState([])
  const [hit, setHit] = useState(null)
  const prevLoc = useRef(null)
  const prevLogId = useRef(null)
  const snapshot = useRef(new Map()) // uid → position à l'écran au rendu précédent
  const nextId = useRef(0)
  const pending = useRef(0)
  const settledSent = useRef(false)

  const settle = useCallback(() => {
    if (locked && !settledSent.current) {
      settledSent.current = true
      onSettled?.()
    }
  }, [locked, onSettled])

  const strike = useCallback((idx) => {
    setHit({ idx })
    setTimeout(() => setHit((h) => (h?.idx === idx ? null : h)), 750)
  }, [])

  useLayoutEffect(() => {
    const root = rootRef.current
    const loc = locateCards(state)
    const prev = prevLoc.current
    const lastLog = state.log[state.log.length - 1]
    const malusLogged = prevLogId.current !== null && lastLog?.kind === 'malus' && lastLog.id !== prevLogId.current
    prevLoc.current = loc
    prevLogId.current = lastLog?.id ?? null

    const q = (sel) => root?.querySelector(sel)
    const inHand = (uid) => q(`[data-zone="hand"] [data-card-uid="${uid}"]`)
    const onBoard = (i, uid) => q(`[data-board="${i}"] [data-card-uid="${uid}"]`)
    const pile = (name) => rectOf(q(`[data-pile="${name}"]`))
    const from = (uid, where) => snapshot.current.get(uid) ?? (where === 'deck' ? pile('deck') : where === 'discard' ? pile('discard') : null)
    // rectangle d'une carte « sm » centrée dans un conteneur (quand la carte n'y est pas visible)
    const inside = (el) => {
      const r = rectOf(el)
      if (!r) return null
      const w = Math.min(76, r.width)
      return { left: r.left + r.width / 2 - w / 2, top: r.top + 12, width: w }
    }

    const out = []
    let victim = null
    if (prev && root && !prefersReducedMotion()) {
      const me = `hand:${viewer}`
      let drawDelay = 0
      let previewDelay = 0
      const malusUid = malusLogged && (lastAction?.type === 'PLAY_MALUS' || lastAction?.type === 'VENGEANCE_PICK') ? lastAction.uid : null
      if (malusLogged && lastAction?.target != null) victim = lastAction.target

      for (const [uid, { where, card }] of loc) {
        const was = prev.get(uid)?.where
        if (was === where) continue
        let f = null
        if (uid === malusUid) {
          // malus : vers le plateau de la victime, même s'il est défaussé ou retiré
          const el = onBoard(victim, uid)
          f = { kind: 'play', preview: true, card, from: from(uid, was), to: el ? rectOf(el) : inside(q(`[data-board="${victim}"]`)), el, hit: victim }
        } else if ((where === me || where === 'forced') && ['deck', 'discard', 'river'].includes(was)) {
          const el = inHand(uid)
          f = { kind: 'draw', flip: was === 'deck', card, from: from(uid, was), to: rectOf(el), el, delay: drawDelay }
          drawDelay += 140
        } else if (where.startsWith('board:') && !(was ?? '').startsWith('board:') && (was === me || was === 'forced' || !was || was === 'discard' || was === 'river')) {
          const i = where.slice(6)
          const el = onBoard(i, uid)
          f = { kind: 'play', preview: true, card, from: from(uid, was) ?? pile('deck'), to: rectOf(el), el }
        } else if (where === 'discard' && (was === me || was === 'forced')) {
          f = { kind: 'discard', card, from: from(uid, was), to: pile('discard'), el: q(`[data-pile="discard"] .sl-card`) }
        }
        if (!f || !f.from || !f.to) continue
        if (f.preview) {
          f.delay = previewDelay
          previewDelay += previewDuration() * 0.6
        }
        f.id = ++nextId.current
        out.push(f)
      }
      // malus sans carte visible (rare) : secousse immédiate
      if (victim != null && !out.some((f) => f.hit != null)) strike(victim)
    } else if (malusLogged && lastAction?.target != null) {
      strike(lastAction.target)
    }

    // les cartes d'arrivée restent cachées jusqu'à l'atterrissage de leur copie
    for (const f of out) if (f.el) f.el.style.visibility = 'hidden'
    if (out.length) {
      pending.current += out.length
      setFlights((fs) => [...fs, ...out])
    } else if (pending.current === 0) {
      settle()
    }

    // positions actuelles, pour le prochain changement
    const snap = new Map()
    root?.querySelectorAll('[data-snap] [data-card-uid]').forEach((el) => {
      const r = rectOf(el)
      if (r && !snap.has(el.dataset.cardUid)) snap.set(el.dataset.cardUid, r)
    })
    snapshot.current = snap
  }, [state, layout]) // layout : changement d'écran → nouvelles positions

  const onDone = useCallback((f) => {
    if (f.el) f.el.style.visibility = ''
    if (f.hit != null) strike(f.hit)
    setFlights((fs) => fs.filter((x) => x.id !== f.id))
    pending.current -= 1
    if (pending.current === 0) setTimeout(settle, f.hit != null ? 450 : 0)
  }, [strike, settle])

  return { flights, onDone, hit }
}

// conçu pour 390 px de haut ; au-delà on agrandit jusqu'à ×1,7
const zoomFor = () => Math.min(1.7, Math.max(1, window.innerHeight / 390))

// ---------------------------------------------------------------------------
// Écran de jeu : « Ma vue » (main + mes cartes) ou « La table » (tous les
// plateaux). L'état de sélection vit ici : changer d'écran ne réinitialise rien.
// ---------------------------------------------------------------------------
export default function GameScreen({ state, dispatch, viewer = state.current, locked = false, onSettled }) {
  const [view, setView] = useState('me') // 'me' | 'table'
  const [selected, setSelected] = useState(null) // uid de la carte sélectionnée
  const [targeting, setTargeting] = useState(false) // choix de la cible malus
  const rootRef = useRef(null)
  const lastAction = useRef(null)

  // toutes les actions passent par ici pour que les animations sachent qui est visé
  const act = useCallback((action) => {
    lastAction.current = action
    dispatch(action)
  }, [dispatch])

  const { flights, onDone, hit } = useCardAnimations({
    state, viewer, rootRef, lastAction: lastAction.current, locked, onSettled, layout: targeting ? 'target' : view,
  })

  // reset de la sélection à chaque changement de tour/phase/forcé
  useEffect(() => {
    setSelected(state.forced ? state.forced.uid : null)
    setTargeting(false)
  }, [state.current, state.phase, state.forced?.uid])

  // l'interface (textes, boutons) grandit avec la hauteur d'écran, comme les cartes
  const [uiZoom, setUiZoom] = useState(zoomFor)
  useEffect(() => {
    const onResize = () => setUiZoom(zoomFor())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const p = state.players[viewer]
  const myTurn = !locked
  const isForced = myTurn && !!state.forced
  const selectedCard = !myTurn ? null : isForced ? state.forced : p.hand.find((c) => c.uid === selected)

  const game = {
    state, viewer, p, act, locked, myTurn, isForced, selectedCard, targeting, hit,
    drawPhase: myTurn && state.phase === 'draw',
    takeDiscard: canTakeDiscardTop(state, state.current),
    poseCheck: selectedCard ? canPoseSelf(state, state.current, selectedCard) : null,
    canAttack: selectedCard?.type === 'malus' && malusHasTarget(state, state.current, selectedCard),
    canBetCasino:
      selectedCard?.type === 'salary' && !!state.casino &&
      (!state.casino.stake || state.casino.stake.by !== state.current),
    canDiscardSel: !!selectedCard && !(isForced && state.forcedConsumesPlay),
    select: (uid) => { setSelected(selected === uid ? null : uid); setTargeting(false) },
    clearSelection: () => { setSelected(null); setTargeting(false) },
    setTargeting,
  }

  return (
    <div ref={rootRef} className="game-root" style={{ '--ui': uiZoom }}>
      {!locked && <Modals state={state} dispatch={act} />}
      <FlightLayer flights={flights} onDone={onDone} />
      {targeting && selectedCard
        ? <TableView game={game} malus={selectedCard} onBack={() => setTargeting(false)} />
        : view === 'me'
          ? <MyView game={game} onOpenTable={() => setView('table')} />
          : <TableView game={game} onBack={() => setView('me')} />}
    </div>
  )
}
