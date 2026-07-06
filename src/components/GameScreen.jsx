import { useState, useEffect } from 'react'
import Card from './Card'
import PlayerBoard from './PlayerBoard'
import Modals from './Modals'
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

// ---------------------------------------------------------------------------
export default function GameScreen({ state, dispatch }) {
  const p = state.players[state.current]
  const [selected, setSelected] = useState(null) // uid de la carte sélectionnée
  const [targeting, setTargeting] = useState(false) // choix de la cible malus
  const [shake, setShake] = useState(false)

  // reset de la sélection à chaque changement de tour/phase/forcé
  useEffect(() => {
    setSelected(state.forced ? state.forced.uid : null)
    setTargeting(false)
  }, [state.current, state.phase, state.forced?.uid])

  // petite secousse à chaque malus dans le journal
  const lastLog = state.log[state.log.length - 1]
  useEffect(() => {
    if (lastLog?.kind === 'malus') {
      setShake(true)
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [lastLog?.id])

  const isForced = !!state.forced
  const selectedCard = isForced ? state.forced : p.hand.find((c) => c.uid === selected)
  const discardTop = state.discard[state.discard.length - 1]
  const takeDiscard = canTakeDiscardTop(state, state.current)

  const poseCheck = selectedCard ? canPoseSelf(state, state.current, selectedCard) : null
  const canAttack = selectedCard?.type === 'malus' && malusHasTarget(state, state.current, selectedCard)
  const canBetCasino =
    selectedCard?.type === 'salary' && state.casino &&
    (!state.casino.stake || state.casino.stake.by !== state.current)
  const canDiscardSel = selectedCard && !(isForced && state.forcedConsumesPlay)

  const doPlay = () => { dispatch({ type: 'PLAY_SELF', uid: selectedCard.uid }); setSelected(null) }
  const doAttack = (i) => { dispatch({ type: 'PLAY_MALUS', uid: selectedCard.uid, target: i }); setSelected(null); setTargeting(false) }

  return (
    <div className={`min-h-screen p-2 sm:p-4 pb-56 ${shake ? 'anim-shake' : ''}`}>
      <Modals state={state} dispatch={dispatch} />

      {/* ---- Barre supérieure : pioche, défausse, rivière ---- */}
      <div className="flex items-center gap-3 flex-wrap bg-white/80 backdrop-blur rounded-2xl p-2.5 shadow">
        <div className="font-black text-gray-700">
          Tour de <span className="text-pink-500">{p.name}</span>
          <span className="ml-2 text-xs font-bold text-gray-400 uppercase">
            {state.phase === 'draw' ? '① Piochez' : '② Jouez une carte'}
            {state.playsRemaining > 1 && ` (${state.playsRemaining} restantes 🌈)`}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-center" title="Cartes restantes dans la pioche">
            <Card faceDown small card={{}} />
            <div className="text-[10px] font-black text-gray-500">Pioche : {state.deck.length}</div>
          </div>
          <div className="text-center" title="Dessus de la défausse">
            {discardTop ? <Card card={discardTop.card} small /> : <div className="w-16 h-16 rounded-md border-2 border-dashed border-gray-300" />}
            <div className="text-[10px] font-black text-gray-500">Défausse : {state.discard.length}</div>
          </div>
          {state.riverEnabled && (
            <div className="text-center">
              <div className="flex gap-1">
                {state.river.map((c) => <Card key={c.uid} card={c} small />)}
                {state.river.length === 0 && <span className="text-xs text-gray-300 italic">vide</span>}
              </div>
              <div className="text-[10px] font-black text-teal-600">🌊 Rivière</div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Adversaires ---- */}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {state.players.map((q, i) => {
          if (i === state.current) return null
          const sc = computeScore(q)
          return (
            <div key={i} className="bg-white/60 rounded-2xl p-2 shadow-sm">
              <div className="flex items-center justify-between px-1">
                <span className="font-black text-gray-700 text-sm">
                  {q.name} {q.skipTurns > 0 && <span className="text-red-500">⏭️×{q.skipTurns}</span>}
                </span>
                <span className="text-xs text-gray-400">🂠 {q.hand.length} en main · <b className="text-amber-600">😄 {sc.total}</b></span>
              </div>
              <div className="mt-1">
                <PlayerBoard player={q} state={state} compact />
              </div>
            </div>
          )
        })}
      </div>

      {/* ---- Mon tableau de vie ---- */}
      <div className="mt-3 bg-white/80 rounded-2xl p-3 shadow anim-pop">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-black text-gray-800">🧬 Ma vie — {p.name}</h2>
          {p.adultery && (
            <button
              onClick={() => dispatch({ type: 'STOP_ADULTERY' })}
              className="text-xs font-bold text-rose-500 underline"
              title="Défausse la carte Adultère, les flirts sont conservés"
            >
              😇 Arrêter l’adultère
            </button>
          )}
        </div>
        <PlayerBoard player={p} state={state} />
      </div>

      {/* ---- Journal ---- */}
      <div className="mt-3 bg-white/60 rounded-2xl p-3 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">📜 Journal</div>
        <div className="text-xs text-gray-600 space-y-0.5 max-h-24 overflow-y-auto">
          {state.log.slice(-12).reverse().map((l) => (
            <div key={l.id} className={l.kind === 'malus' ? 'text-red-600 font-semibold' : ''}>{l.text}</div>
          ))}
        </div>
      </div>

      {/* ---- Panneau d'action fixe en bas : phase + main ---- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t-2 border-pink-100 p-2 sm:p-3 shadow-2xl z-30">
        {state.phase === 'draw' ? (
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-2 flex-wrap items-center justify-center">
              <Btn color="blue" onClick={() => dispatch({ type: 'DRAW_DECK' })}>🂠 Piocher ({state.deck.length})</Btn>
              <Btn
                color="teal"
                disabled={!takeDiscard.ok}
                title={takeDiscard.reason}
                onClick={() => dispatch({ type: 'TAKE_DISCARD' })}
              >
                ♻️ Prendre la défausse (jouer aussitôt)
              </Btn>
              {p.job && (
                <Btn
                  color="gray"
                  onClick={() => dispatch({ type: 'RESIGN' })}
                  title={isInterim(p) ? 'Intérimaire : vous jouez quand même ce tour' : 'Vous passez votre tour'}
                >
                  📤 Démissionner {isInterim(p) ? '(joue quand même)' : '(passe le tour)'}
                </Btn>
              )}
              {p.marriage && (
                <Btn color="red" onClick={() => dispatch({ type: 'DIVORCE_VOLUNTARY' })} title="Vous passez votre tour, enfants conservés">
                  💔 Divorcer (passe le tour)
                </Btn>
              )}
            </div>
            {!takeDiscard.ok && discardTop && (
              <div className="text-center text-[11px] text-gray-400 mt-1">♻️ {takeDiscard.reason}</div>
            )}
            {state.riverEnabled && state.river.length > 0 && (
              <div className="flex gap-2 items-center justify-center mt-2 flex-wrap">
                <span className="text-xs font-black text-teal-600">🌊 Rivière :</span>
                {state.river.map((c, i) => {
                  const playable = isPlayableFromDiscard(state, state.current, c)
                  return (
                    <div key={c.uid} className="flex flex-col items-center gap-1">
                      <Card card={c} small />
                      <div className="flex gap-1">
                        <button onClick={() => dispatch({ type: 'TAKE_RIVER', index: i, playNow: false })}
                          className="text-[9px] font-bold bg-teal-100 text-teal-700 rounded px-1.5 py-0.5">Garder</button>
                        <button disabled={!playable} title={playable ? '' : 'Pas jouable immédiatement'}
                          onClick={() => dispatch({ type: 'TAKE_RIVER', index: i, playNow: true })}
                          className="text-[9px] font-bold bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 disabled:opacity-40">Jouer</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
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
                  <Btn color="amber" onClick={() => { dispatch({ type: 'CASINO_BET', uid: selectedCard.uid }); setSelected(null) }}>
                    🎰 Miser au Casino
                  </Btn>
                )}
                <Btn color="gray" disabled={!canDiscardSel} title={canDiscardSel ? '' : 'Cette carte doit être jouée'}
                  onClick={() => { dispatch({ type: 'DISCARD_CARD', uid: selectedCard.uid }); setSelected(null) }}>
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
                <Btn color="gray" onClick={() => dispatch({ type: 'END_PLAYS' })}>🌈 Terminer mon tour</Btn>
              </div>
            )}

            {/* la main */}
            <div className="flex gap-2 justify-center overflow-x-auto pb-1">
              {isForced ? (
                <Card card={state.forced} selected className="anim-pop" />
              ) : (
                p.hand.map((c) => (
                  <Card
                    key={c.uid}
                    card={c}
                    selected={selected === c.uid}
                    onClick={() => { setSelected(selected === c.uid ? null : c.uid); setTargeting(false) }}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
