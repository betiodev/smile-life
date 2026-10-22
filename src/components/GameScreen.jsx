import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import Card from './Card'
import PlayerBoard from './PlayerBoard'
import Modals from './Modals'
import { FlightLayer, locateCards, prefersReducedMotion, previewDuration } from './flights'
import { computeScore } from '../game/scoring'
import {
  canPoseSelf, canPlayMalus, canTakeDiscardTop, isPlayableFromDiscard,
  malusHasTarget, isInterim,
} from '../game/rules'

const Btn = ({ onClick, disabled, children, color = 'pink', title }) => {
  const colors = {
    pink: 'from-pink-500 to-rose-500',
    teal: 'from-teal-500 to-emerald-500',
    blue: 'from-blue-500 to-indigo-500',
    gray: 'from-gray-400 to-gray-500',
    red: 'from-red-500 to-red-700',
    amber: 'from-amber-400 to-orange-500',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-xl bg-gradient-to-r ${colors[color]} text-white font-bold px-3 py-2 text-sm shadow
        hover:scale-[1.03] active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100`}
    >
      {children}
    </button>
  )
}

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
function useCardAnimations({ state, viewer, rootRef, lastAction, locked, onSettled }) {
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
  }, [state])

  const onDone = useCallback((f) => {
    if (f.el) f.el.style.visibility = ''
    if (f.hit != null) strike(f.hit)
    setFlights((fs) => fs.filter((x) => x.id !== f.id))
    pending.current -= 1
    if (pending.current === 0) setTimeout(settle, f.hit != null ? 450 : 0)
  }, [strike, settle])

  return { flights, onDone, hit }
}

// ---------------------------------------------------------------------------
export default function GameScreen({ state, dispatch, viewer = state.current, locked = false, onSettled }) {
  const p = state.players[viewer]
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
    state, viewer, rootRef, lastAction: lastAction.current, locked, onSettled,
  })

  // reset de la sélection à chaque changement de tour/phase/forcé
  useEffect(() => {
    setSelected(state.forced ? state.forced.uid : null)
    setTargeting(false)
  }, [state.current, state.phase, state.forced?.uid])

  const myTurn = !locked
  const isForced = myTurn && !!state.forced
  const selectedCard = !myTurn ? null : isForced ? state.forced : p.hand.find((c) => c.uid === selected)
  const discardTop = state.discard[state.discard.length - 1]
  const takeDiscard = canTakeDiscardTop(state, state.current)
  const drawPhase = myTurn && state.phase === 'draw'

  const poseCheck = selectedCard ? canPoseSelf(state, state.current, selectedCard) : null
  const canAttack = selectedCard?.type === 'malus' && malusHasTarget(state, state.current, selectedCard)
  const canBetCasino =
    selectedCard?.type === 'salary' && state.casino &&
    (!state.casino.stake || state.casino.stake.by !== state.current)
  const canDiscardSel = selectedCard && !(isForced && state.forcedConsumesPlay)

  const doPlay = () => { act({ type: 'PLAY_SELF', uid: selectedCard.uid }); setSelected(null) }
  const doAttack = (i) => { act({ type: 'PLAY_MALUS', uid: selectedCard.uid, target: i }); setSelected(null); setTargeting(false) }

  const opponents = state.players.map((q, i) => ({ q, i })).filter(({ i }) => i !== viewer)

  return (
    <div ref={rootRef} className="min-h-screen p-2 sm:p-3 pb-72 sm:pb-80 flex flex-col gap-3">
      {!locked && <Modals state={state} dispatch={act} />}
      <FlightLayer flights={flights} onDone={onDone} />

      {/* ---- Adversaires (en haut) ---- */}
      <div className="flex gap-2 overflow-x-auto pb-1" data-snap>
        {opponents.map(({ q, i }) => {
          const sc = computeScore(q)
          return (
            <div
              key={i}
              data-board={i}
              className={`flex-1 min-w-[250px] bg-white/60 rounded-2xl p-2 shadow-sm ${hit?.idx === i ? 'anim-hit' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="font-black text-gray-700 text-sm truncate">
                  {q.name} {q.skipTurns > 0 && <span className="text-red-500">⏭️×{q.skipTurns}</span>}
                </span>
                <b className="text-xs text-amber-600 shrink-0">😄 {sc.total}</b>
              </div>
              <div className="flex items-center gap-2 px-1 my-1" title={`${q.hand.length} cartes en main`}>
                <div className="flex [&>.sl-card:not(:first-child)]:-ml-7">
                  {q.hand.map((c) => <Card key={c.uid} card={c} size="xs" faceDown />)}
                </div>
                <span className="text-[10px] font-bold text-gray-400">{q.hand.length} en main</span>
              </div>
              <PlayerBoard player={q} state={state} compact />
            </div>
          )
        })}
      </div>

      {/* ---- Centre : pioche, défausse, rivière + tour et journal ---- */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6" data-snap>
          <button
            type="button"
            className={`flex flex-col items-center gap-1 ${drawPhase ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={drawPhase ? () => act({ type: 'DRAW_DECK' }) : undefined}
            title={drawPhase ? 'Piocher' : 'Cartes restantes dans la pioche'}
          >
            <div className="relative">
              {state.deck.length > 1 && (
                <div className="absolute top-1 left-1 opacity-70"><Card faceDown card={{}} size="pile" /></div>
              )}
              {state.deck.length > 0
                ? <div data-pile="deck"><Card faceDown card={{}} size="pile" className={drawPhase ? 'pile-glow' : ''} /></div>
                : <div data-pile="deck" className="pile-empty" />}
            </div>
            <span className="text-[11px] font-black text-gray-500">Pioche · {state.deck.length}</span>
          </button>

          <button
            type="button"
            className={`flex flex-col items-center gap-1 ${drawPhase && takeDiscard.ok ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={drawPhase && takeDiscard.ok ? () => act({ type: 'TAKE_DISCARD' }) : undefined}
            title={drawPhase ? (takeDiscard.ok ? 'Prendre la défausse (à jouer aussitôt)' : takeDiscard.reason) : 'Dessus de la défausse'}
          >
            <div data-pile="discard">
              {discardTop
                ? <Card key={discardTop.card.uid} card={discardTop.card} size="pile" className={drawPhase && takeDiscard.ok ? 'pile-glow' : ''} />
                : <div className="pile-empty" />}
            </div>
            <span className="text-[11px] font-black text-gray-500">Défausse · {state.discard.length}</span>
          </button>

          {state.riverEnabled && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1.5 items-start">
                {state.river.map((c, i) => {
                  const playable = isPlayableFromDiscard(state, state.current, c)
                  return (
                    <div key={c.uid} className="flex flex-col items-center gap-1">
                      <Card card={c} size="pile" zoomable={!drawPhase} />
                      {drawPhase && !state.riverUsedThisTurn && (
                        <div className="flex gap-1">
                          <button onClick={() => act({ type: 'TAKE_RIVER', index: i, playNow: false })}
                            className="text-[10px] font-bold bg-teal-100 text-teal-700 rounded px-1.5 py-0.5">Garder</button>
                          <button disabled={!playable} title={playable ? '' : 'Pas jouable immédiatement'}
                            onClick={() => act({ type: 'TAKE_RIVER', index: i, playNow: true })}
                            className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 disabled:opacity-40">Jouer</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {state.river.length === 0 && <div className="pile-empty" />}
              </div>
              <span className="text-[11px] font-black text-teal-600">Rivière</span>
            </div>
          )}
        </div>

        <div className="bg-white/70 rounded-2xl p-2.5 shadow-sm w-full sm:w-80">
          <div className="font-black text-gray-700 text-sm">
            {locked ? (
              <span className="text-gray-400">Fin du tour…</span>
            ) : (
              <>
                Tour de <span className="text-pink-500">{p.name}</span>
                <span className="ml-2 text-xs font-bold text-gray-400 uppercase">
                  {state.phase === 'draw' ? '① Piochez' : '② Jouez une carte'}
                  {state.playsRemaining > 1 && ` (${state.playsRemaining} restantes 🌈)`}
                </span>
              </>
            )}
          </div>
          <div className="text-[11px] text-gray-600 space-y-0.5 max-h-20 overflow-y-auto mt-1">
            {state.log.slice(-10).reverse().map((l) => (
              <div key={l.id} className={l.kind === 'malus' ? 'text-red-600 font-semibold' : ''}>{l.text}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Mon tableau de vie ---- */}
      <div
        data-board={viewer}
        data-snap
        className={`bg-white/80 rounded-2xl p-3 shadow ${hit?.idx === viewer ? 'anim-hit' : ''}`}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-black text-gray-800">🧬 Ma vie — {p.name}</h2>
          {myTurn && p.adultery && (
            <button
              onClick={() => act({ type: 'STOP_ADULTERY' })}
              className="text-xs font-bold text-rose-500 underline"
              title="Défausse la carte Adultère, les flirts sont conservés"
            >
              😇 Arrêter l’adultère
            </button>
          )}
        </div>
        <PlayerBoard player={p} state={state} />
      </div>

      {/* ---- Panneau fixe en bas : actions + main ---- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t-2 border-pink-100 px-2 pt-2 pb-3 shadow-2xl z-30">
        <div className="max-w-5xl mx-auto">
          {drawPhase && (
            <div className="mb-2">
              <div className="flex gap-2 flex-wrap items-center justify-center">
                <Btn color="blue" onClick={() => act({ type: 'DRAW_DECK' })}>🂠 Piocher ({state.deck.length})</Btn>
                <Btn color="teal" disabled={!takeDiscard.ok} title={takeDiscard.reason} onClick={() => act({ type: 'TAKE_DISCARD' })}>
                  ♻️ Prendre la défausse (jouer aussitôt)
                </Btn>
                {p.job && (
                  <Btn
                    color="gray"
                    onClick={() => act({ type: 'RESIGN' })}
                    title={isInterim(p) ? 'Intérimaire : vous jouez quand même ce tour' : 'Vous passez votre tour'}
                  >
                    📤 Démissionner {isInterim(p) ? '(joue quand même)' : '(passe le tour)'}
                  </Btn>
                )}
                {p.marriage && (
                  <Btn color="red" onClick={() => act({ type: 'DIVORCE_VOLUNTARY' })} title="Vous passez votre tour, enfants conservés">
                    💔 Divorcer (passe le tour)
                  </Btn>
                )}
              </div>
              {!takeDiscard.ok && discardTop && (
                <div className="text-center text-[11px] text-gray-400 mt-1">♻️ {takeDiscard.reason}</div>
              )}
            </div>
          )}

          {myTurn && state.phase === 'play' && (
            <>
              {/* actions sur la carte sélectionnée */}
              {selectedCard && !targeting && (
                <div className="flex gap-2 flex-wrap items-center justify-center mb-2">
                  <span className="text-sm font-black text-gray-700">{selectedCard.name} :</span>
                  {selectedCard.type !== 'malus' && (
                    <Btn onClick={doPlay} disabled={!poseCheck.ok} title={poseCheck.reason}>✅ Poser</Btn>
                  )}
                  {selectedCard.type === 'malus' && (
                    <Btn color="red" disabled={!canAttack} title={canAttack ? '' : 'Aucune cible valide'} onClick={() => setTargeting(true)}>
                      ⚡ Attaquer un adversaire
                    </Btn>
                  )}
                  {canBetCasino && (
                    <Btn color="amber" onClick={() => { act({ type: 'CASINO_BET', uid: selectedCard.uid }); setSelected(null) }}>
                      🎰 Miser au Casino
                    </Btn>
                  )}
                  <Btn color="gray" disabled={!canDiscardSel} title={canDiscardSel ? '' : 'Cette carte doit être jouée'}
                    onClick={() => { act({ type: 'DISCARD_CARD', uid: selectedCard.uid }); setSelected(null) }}>
                    🗑️ Défausser
                  </Btn>
                  {!poseCheck.ok && selectedCard.type !== 'malus' && (
                    <span className="text-[11px] text-red-400 w-full text-center">{poseCheck.reason}</span>
                  )}
                </div>
              )}
              {selectedCard && targeting && (
                <div className="flex gap-2 flex-wrap items-center justify-center mb-2">
                  <span className="text-sm font-black text-red-600">⚡ {selectedCard.name} sur :</span>
                  {state.players.map((q, i) => {
                    if (i === state.current) return null
                    const check = canPlayMalus(state, state.current, selectedCard, i)
                    return (
                      <Btn key={i} color="red" disabled={!check.ok} title={check.reason} onClick={() => doAttack(i)}>
                        {q.name}
                      </Btn>
                    )
                  })}
                  <Btn color="gray" onClick={() => setTargeting(false)}>↩️ Retour</Btn>
                </div>
              )}
              {isForced && (
                <div className="text-center text-xs font-bold text-amber-600 mb-1">
                  ⚠️ Carte à jouer immédiatement : {state.forced.name}
                </div>
              )}
              {state.playsRemaining > 1 && !isForced && (
                <div className="text-center mb-1">
                  <Btn color="gray" onClick={() => act({ type: 'END_PLAYS' })}>🌈 Terminer mon tour</Btn>
                </div>
              )}
            </>
          )}

          {/* la main */}
          <div className="flex gap-2 justify-center-safe overflow-x-auto pt-6 -mt-4 pb-1 px-2" data-zone="hand" data-snap>
            {isForced ? (
              <Card card={state.forced} selected />
            ) : (
              p.hand.map((c) => (
                <Card
                  key={c.uid}
                  card={c}
                  selected={selected === c.uid}
                  onClick={myTurn && state.phase === 'play' ? () => { setSelected(selected === c.uid ? null : c.uid); setTargeting(false) } : undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
