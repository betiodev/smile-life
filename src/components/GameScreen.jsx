import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import Modals from './Modals'
import MyView from './MyView'
import TableView from './TableView'
import CardZoom from './CardZoom'
import usePlayIntent, { spots } from './usePlayIntent'
import { PaymentSheet, VengeanceSheet, BirthdaySheet, GiftsOverlay, UndoToast, GhostLayer, ExchangeBanner } from './PlayChoices'
import { FlightLayer, Ghost, locateCards, prefersReducedMotion, previewDuration } from './flights'
import { canTakeDiscardTop, canPlayFromHand, canDiscardFromHand } from '../game/rules'

const rectOf = (el) => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width ? { left: r.left, top: r.top, width: r.width } : null
}

// ---------------------------------------------------------------------------
// Animations : à chaque nouvel état, on repère les cartes qui ont changé de
// place et on les fait voler (pioche → main, main → plateau avec aperçu géant,
// main → défausse). Un malus fait trembler le plateau de la victime.
// Action « quiet » (validée après le toast d'annulation) : la carte est déjà
// montrée à sa place par un fantôme, on la pose sans aperçu géant.
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
    let struck = false
    if (prev && root && !prefersReducedMotion()) {
      const me = `hand:${viewer}`
      const quiet = !!lastAction?.quiet
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
          f = quiet
            ? { kind: 'move', card, from: from(uid, was), to: rectOf(el), el }
            : { kind: 'play', preview: true, card, from: from(uid, was) ?? pile('deck'), to: rectOf(el), el }
        } else if (where === `board:${viewer}` && (was ?? '').startsWith('board:')) {
          // vol de flirt, cadeaux d'Anniversaire : d'un plateau adverse vers le mien
          const el = onBoard(viewer, uid)
          f = { kind: 'move', card, from: from(uid, was) ?? pile('table'), to: rectOf(el), el }
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
      // malus sans carte visible (Vengeance, rare) : secousse immédiate
      if (victim != null && !out.some((f) => f.hit != null)) { strike(victim); struck = true }
    } else if (malusLogged && lastAction?.target != null) {
      strike(lastAction.target)
      struck = true
    }

    // les cartes d'arrivée restent cachées jusqu'à l'atterrissage de leur copie
    for (const f of out) if (f.el) f.el.style.visibility = 'hidden'
    if (out.length) {
      pending.current += out.length
      setFlights((fs) => [...fs, ...out])
    } else if (pending.current === 0) {
      // on laisse la secousse se voir avant de passer la main
      if (struck) setTimeout(settle, 750)
      else settle()
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

  // position de départ imposée pour la prochaine animation (carte en attente)
  const remember = useCallback((uid, rect) => { snapshot.current.set(uid, rect) }, [])

  return { flights, onDone, hit, remember }
}

// conçu pour 390 px de haut ; au-delà on agrandit jusqu'à ×1,7
const zoomFor = () => Math.min(1.7, Math.max(1, window.innerHeight / 390))

// ---------------------------------------------------------------------------
// Écran de jeu : « Ma vue » (main + mes cartes) ou « La table » (tous les
// plateaux). On joue en faisant glisser les cartes de la main (SwipeCard) ;
// l'intention de jeu (toast, choix) vit dans usePlayIntent.
// ---------------------------------------------------------------------------
export default function GameScreen({ state, dispatch, viewer = state.current, locked = false, onSettled }) {
  const [view, setView] = useState('me') // 'me' | 'table'
  const [zoom, setZoom] = useState(null) // { cards, fromHand, from }
  const [zoomBack, setZoomBack] = useState(null) // carte agrandie qui rentre dans la main
  const [hint, setHint] = useState(null)
  const rootRef = useRef(null)
  const lastAction = useRef(null)
  const rememberRef = useRef(null)

  // toutes les actions passent par ici pour que les animations sachent qui est visé
  const act = useCallback((action) => {
    lastAction.current = action
    dispatch(action)
  }, [dispatch])
  const remember = useCallback((uid, rect) => rememberRef.current?.(uid, rect), [])

  const pi = usePlayIntent({ state, viewer, act, remember, setView })
  const it = pi.intent
  const targetingNow = it?.stage === 'target'

  // fin de tour : on attend aussi la fin du bandeau du Troc avant de passer la main
  const [animSettled, setAnimSettled] = useState(false)
  const onAnimSettled = useCallback(() => setAnimSettled(true), [])
  useEffect(() => { if (animSettled && !pi.banner) onSettled?.() }, [animSettled, pi.banner, onSettled])

  const { flights, onDone, hit, remember: rememberAnim } = useCardAnimations({
    state, viewer, rootRef, lastAction: lastAction.current, locked, onSettled: onAnimSettled, layout: targetingNow ? 'target' : view,
  })
  rememberRef.current = rememberAnim

  useEffect(() => { setZoom(null) }, [state.current, state.phase, state.forced?.uid])

  // petite bulle d'explication au-dessus de la main
  const showHint = useCallback((text) => setHint({ text, id: Date.now() }), [])
  useEffect(() => {
    if (!hint) return
    const t = setTimeout(() => setHint(null), 1800)
    return () => clearTimeout(t)
  }, [hint])

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

  // le geste est-il permis ? (base commune au swipe et aux boutons)
  const baseGate = () => {
    if (!myTurn) return { ok: false, reason: 'Ce n’est pas ton tour' }
    if (it || state.pending) return { ok: false }
    if (state.phase === 'draw') return { ok: false, reason: 'Pioche d’abord' }
    return { ok: true }
  }
  const gateFor = (card) => (dir) => {
    const b = baseGate()
    if (!b.ok) return b
    return dir === 'play' ? canPlayFromHand(state, state.current, card) : canDiscardFromHand(state, state.current, card)
  }
  const game = {
    state, viewer, p, act, locked, myTurn, isForced, hit,
    drawPhase: myTurn && state.phase === 'draw' && !it,
    takeDiscard: canTakeDiscardTop(state, state.current),
    // carte sortie de la main : en attente, agrandie, ou qui y retourne
    hiddenUid: it ? it.card.uid : zoom?.fromHand ? zoom.cards[0].uid : zoomBack?.card.uid ?? null,
    // métier intérimaire en partance (toast) ou qui revient (Annuler)
    boardHiddenUid: it?.leavingUid ?? null,
    hint,
    gateFor,
    onSwipe: (card, dir, rect) => pi.start(card, dir, rect),
    onHint: showHint,
    // Casino : miser un salaire de sa main (même toast d'annulation)
    casinoSalaries: baseGate().ok && state.casino && (!state.casino.stake || state.casino.stake.by !== state.current)
      ? (isForced ? [state.forced] : p.hand).filter((c) => c.type === 'salary') : [],
    onCasinoBet: (card) => pi.start(card, 'play', spots.hand(card.uid), { casino: true }),
    onTapHand: (card) => { if (!zoomBack) setZoom({ cards: [card], fromHand: true, from: spots.hand(card.uid) }) },
    onZoom: (cards, extras) => setZoom({ cards, extras, fromHand: false }),
  }

  const vengeanceMalus = it?.flow === 'vengeance' && state.players[state.current].malusKept.find((m) => m.uid === it.malusUid)
  const targeting = targetingNow ? {
    title: it.flow === 'malus' ? `${it.card.name} : sur qui ?`
      : it.flow === 'troc' ? 'Troc : avec qui ?'
        : `Vengeance (${vengeanceMalus?.name ?? 'malus'}) : sur qui ?`,
    card: it.card,
    from: it.from,
    check: pi.targetCheck,
    selected: it.target,
    onSelect: (i) => pi.patch({ target: i }),
    onConfirm: pi.confirm,
    onCancel: pi.cancel,
  } : null

  const sheetProps = { intent: it, state, patch: pi.patch, onCancel: pi.cancel, onConfirm: pi.confirm }

  return (
    <div ref={rootRef} className="game-root" style={{ '--ui': uiZoom }}>
      {!locked && <Modals state={state} dispatch={act} />}
      <FlightLayer flights={flights} onDone={onDone} />
      {targeting
        ? <TableView game={game} targeting={targeting} />
        : view === 'me'
          ? <MyView game={game} onOpenTable={() => setView('table')} />
          : <TableView game={game} onBack={() => setView('me')} onZoom={game.onZoom} />}

      <GhostLayer intent={it} onReturned={pi.returned} />
      {it?.stage === 'toast' && <UndoToast intent={it} onUndo={pi.cancel} />}
      {it?.stage === 'pay' && <PaymentSheet {...sheetProps} player={state.players[state.current]} />}
      {it?.stage === 'malus-pick' && <VengeanceSheet {...sheetProps} />}
      {it?.stage === 'birthday' && <BirthdaySheet {...sheetProps} />}
      {it?.stage === 'gifts' && <GiftsOverlay intent={it} state={state} give={pi.give} />}
      <ExchangeBanner banner={pi.banner} />

      {zoom && (
        <CardZoom
          cards={zoom.cards}
          extras={zoom.extras}
          hand={zoom.fromHand ? {
            gate: gateFor(zoom.cards[0]),
            onSwipe: (dir, rect) => { setZoom(null); pi.start(zoom.cards[0], dir, rect) },
            onHint: showHint,
            hint,
            from: zoom.from,
          } : null}
          onClose={(rect) => {
            if (zoom.fromHand && rect) setZoomBack({ card: zoom.cards[0], from: rect })
            setZoom(null)
          }}
        />
      )}
      {zoomBack && (
        <Ghost card={zoomBack.card} from={zoomBack.from} to={() => spots.hand(zoomBack.card.uid)} duration={300} onArrive={() => setZoomBack(null)} />
      )}
    </div>
  )
}
