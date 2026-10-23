// ---------------------------------------------------------------------------
// Écran 1 — « Ma vue » : piles à gauche, mon jeu au centre, la table à droite
// ---------------------------------------------------------------------------
import { useState } from 'react'
import Card from './Card'
import PlayedStacks, { CARD_RATIO } from './PlayedStacks'
import useElementSize from './useElementSize'
import { playerColor, enterLandscapeFullscreen } from './theme'
import { computeScore } from '../game/scoring'
import { isPlayableFromDiscard, isInterim } from '../game/rules'

const Btn = ({ onClick, disabled, children, tone = 'light', title }) => {
  const tones = {
    light: 'bg-[#F4EFE6] text-[#1F2228]',
    accent: 'bg-[#FFC93C] text-[#1F2228]',
    red: 'bg-[#D9534F] text-white',
    ghost: 'bg-white/10 text-[#F4EFE6]',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-full rounded-xl ${tones[tone]} font-bold px-2 py-1.5 text-xs leading-tight shadow
        active:scale-95 transition-transform disabled:opacity-35`}
    >
      {children}
    </button>
  )
}

// ---- colonne gauche : pioche + défausse (+ rivière) ------------------------
function Piles({ game }) {
  const { state, act, drawPhase, takeDiscard } = game
  const [ref, { width, height }] = useElementSize()
  const discardTop = state.discard[state.discard.length - 1]
  const canTake = drawPhase && takeDiscard.ok
  // deux cartes côte à côte, sans dépasser ~40 % de la hauteur
  const w = Math.max(40, Math.min((width - 32) / 2, (height * 0.4) / CARD_RATIO))
  const empty = <div className="pile-empty" style={{ width: w }} />

  return (
    <div ref={ref} className="h-full flex flex-col items-center justify-center gap-3 px-2" data-snap>
      <div className="flex gap-2.5 items-start">
        <button
          type="button"
          className={`flex flex-col items-center gap-1 ${drawPhase ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={drawPhase ? () => act({ type: 'DRAW_DECK' }) : undefined}
          title={drawPhase ? 'Piocher' : 'Cartes restantes dans la pioche'}
        >
          <div className="relative">
            {state.deck.length > 1 && (
              <div className="absolute top-1 left-1 opacity-60"><Card faceDown card={{}} size="pile" style={{ width: w }} /></div>
            )}
            {state.deck.length > 0
              ? <div data-pile="deck"><Card faceDown card={{}} size="pile" style={{ width: w }} className={drawPhase ? 'pile-glow' : ''} /></div>
              : <div data-pile="deck">{empty}</div>}
          </div>
          <span className="ui-zoom font-title text-sm font-medium">{state.deck.length}</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center gap-1 ${canTake ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={canTake ? () => act({ type: 'TAKE_DISCARD' }) : undefined}
          title={drawPhase ? (takeDiscard.ok ? 'Prendre la défausse (à jouer aussitôt)' : takeDiscard.reason) : 'Dessus de la défausse'}
        >
          <div data-pile="discard">
            {discardTop
              ? <Card key={discardTop.card.uid} card={discardTop.card} size="pile" style={{ width: w }} className={canTake ? 'pile-glow' : ''} />
              : empty}
          </div>
          <span className="ui-zoom text-[11px] font-bold opacity-70">Défausse</span>
        </button>
      </div>

      {state.riverEnabled && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1 items-start">
            {state.river.map((c, i) => {
              const playable = isPlayableFromDiscard(state, state.current, c)
              return (
                <div key={c.uid} className="flex flex-col items-center gap-0.5">
                  <Card card={c} size="xs" style={{ width: Math.min(44, (width - 20) / 3) }} />
                  {drawPhase && !state.riverUsedThisTurn && (
                    <>
                      <button onClick={() => act({ type: 'TAKE_RIVER', index: i, playNow: false })}
                        className="text-[9px] font-bold bg-white/15 rounded px-1">Garder</button>
                      <button disabled={!playable} title={playable ? '' : 'Pas jouable immédiatement'}
                        onClick={() => act({ type: 'TAKE_RIVER', index: i, playNow: true })}
                        className="text-[9px] font-bold bg-[#FFC93C] text-[#1F2228] rounded px-1 disabled:opacity-35">Jouer</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <span className="ui-zoom text-[10px] font-bold opacity-70">Rivière</span>
        </div>
      )}
    </div>
  )
}

// ---- centre : barre du haut -------------------------------------------------
function TopBar({ game }) {
  const { state, viewer, p, locked } = game
  const score = computeScore(p)
  return (
    <div className="ui-zoom flex items-center gap-2 min-w-0 h-8 shrink-0">
      <span className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white/20" style={{ background: playerColor(p, viewer) }} />
      <span className="font-title text-lg font-semibold truncate">{p.name}</span>
      {locked ? (
        <span className="text-xs opacity-60 whitespace-nowrap">Fin du tour…</span>
      ) : (
        <span className="text-xs font-bold text-[#FFC93C] whitespace-nowrap truncate">
          c’est ton tour
          <span className="font-semibold text-[#F4EFE6]/60">
            {' · '}{state.phase === 'draw' ? 'pioche' : state.playsRemaining > 1 ? `joue (${state.playsRemaining} restantes)` : 'joue une carte'}
          </span>
        </span>
      )}
      <span className="ml-auto shrink-0 rounded-full bg-[#FFC93C] text-[#1F2228] px-3 py-0.5 font-title font-semibold text-base">
        😄 {score.total}
      </span>
    </div>
  )
}

// ---- centre : mes cartes posées ------------------------------------------------
function MyPlayed({ game }) {
  const { state, viewer, p, hit } = game
  const [ref, { height }] = useElementSize()
  return (
    <div
      data-board={viewer}
      data-snap
      className={`played-panel ${hit?.idx === viewer ? 'anim-hit' : ''}`}
      style={{ background: playerColor(p, viewer) }}
    >
      <div ref={ref} className="h-full flex gap-2 items-center overflow-x-auto overflow-y-hidden thin-scroll px-2">
        {height > 0 && <PlayedStacks player={p} state={state} cardHeight={height - 14} />}
      </div>
    </div>
  )
}

// ---- centre : la main en éventail ------------------------------------------------
function Hand({ game }) {
  const { state, p, myTurn, isForced, selectedCard, select } = game
  const [ref, { width, height }] = useElementSize()
  const cards = isForced ? [state.forced] : p.hand
  const n = cards.length
  const mid = (n - 1) / 2
  const drop = 4 // px : chute des cartes aux extrémités (× distance²)
  const maxDrop = drop * mid * mid
  // place réservée : chute des extrémités + la carte sélectionnée qui monte
  const w = Math.max(40, Math.min(200, (height - Math.max(maxDrop, 16) - 12) / (CARD_RATIO * 1.1)))
  // chevauchement si la main déborde
  const step = n > 1 ? Math.min(w * 0.9, (width - 24 - w) / (n - 1)) : 0
  const playable = myTurn && state.phase === 'play' && !isForced

  return (
    <div ref={ref} className="flex-1 min-h-0 flex justify-center items-start pt-3" data-zone="hand" data-snap>
      {width > 0 && cards.map((c, i) => (
        <Card
          key={c.uid}
          card={c}
          size={w >= 110 ? 'md' : 'sm'}
          selected={selectedCard?.uid === c.uid}
          onClick={playable ? () => select(c.uid) : undefined}
          style={{
            width: w,
            marginLeft: i === 0 ? 0 : step - w,
            rotate: `${(i - mid) * 4}deg`,
            translate: `0 ${drop * (i - mid) ** 2}px`,
            transformOrigin: '50% 100%',
            zIndex: selectedCard?.uid === c.uid ? 20 : i,
          }}
        />
      ))}
    </div>
  )
}

// ---- colonne droite : actions de la carte sélectionnée ----------------------
function Actions({ game }) {
  const {
    state, p, act, myTurn, isForced, selectedCard, setTargeting, drawPhase, takeDiscard,
    poseCheck, canAttack, canBetCasino, canDiscardSel, clearSelection,
  } = game
  if (!myTurn) return null
  const discardTop = state.discard[state.discard.length - 1]

  return (
    <div className="w-full flex flex-col gap-1.5 items-stretch">
      {drawPhase && (
        <>
          {!takeDiscard.ok && discardTop && (
            <p className="text-[10px] leading-tight opacity-60 text-center">♻️ {takeDiscard.reason}</p>
          )}
          {p.job && (
            <Btn tone="ghost" onClick={() => act({ type: 'RESIGN' })}
              title={isInterim(p) ? 'Intérimaire : vous jouez quand même ce tour' : 'Vous passez votre tour'}>
              📤 Démissionner
            </Btn>
          )}
          {p.marriage && (
            <Btn tone="ghost" onClick={() => act({ type: 'DIVORCE_VOLUNTARY' })} title="Vous passez votre tour, enfants conservés">
              💔 Divorcer
            </Btn>
          )}
        </>
      )}

      {state.phase === 'play' && (
        <>
          {isForced && (
            <p className="text-[10px] leading-tight font-bold text-[#FFC93C] text-center">⚠️ À jouer immédiatement</p>
          )}
          {selectedCard && (
            <>
              <p className="text-[11px] font-bold text-center truncate">{selectedCard.name}</p>
              {selectedCard.type !== 'malus' && (
                <Btn tone="accent" onClick={() => { act({ type: 'PLAY_SELF', uid: selectedCard.uid }); clearSelection() }}
                  disabled={!poseCheck.ok} title={poseCheck.reason}>✅ Poser</Btn>
              )}
              {selectedCard.type === 'malus' && (
                <Btn tone="red" disabled={!canAttack} title={canAttack ? '' : 'Aucune cible valide'} onClick={() => setTargeting(true)}>
                  ⚡ Attaquer
                </Btn>
              )}
              {canBetCasino && (
                <Btn tone="light" onClick={() => { act({ type: 'CASINO_BET', uid: selectedCard.uid }); clearSelection() }}>
                  🎰 Miser au Casino
                </Btn>
              )}
              <Btn tone="ghost" disabled={!canDiscardSel} title={canDiscardSel ? '' : 'Cette carte doit être jouée'}
                onClick={() => { act({ type: 'DISCARD_CARD', uid: selectedCard.uid }); clearSelection() }}>
                🗑️ Défausser
              </Btn>
              {!poseCheck.ok && selectedCard.type !== 'malus' && (
                <p className="text-[10px] leading-tight text-[#F2A79A] text-center">{poseCheck.reason}</p>
              )}
            </>
          )}
          {state.playsRemaining > 1 && !isForced && (
            <Btn tone="ghost" onClick={() => act({ type: 'END_PLAYS' })}>🌈 Terminer mon tour</Btn>
          )}
        </>
      )}

      {p.adultery && (
        <Btn tone="ghost" onClick={() => act({ type: 'STOP_ADULTERY' })} title="Défausse la carte Adultère, les flirts sont conservés">
          😇 Arrêter l’adultère
        </Btn>
      )}
    </div>
  )
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
)

// ---- menu (coin haut droit) -------------------------------------------------------
export function GameMenu({ game }) {
  const { state, act } = game
  const [open, setOpen] = useState(false)
  return (
    <div className="relative mt-1.5 mr-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        aria-label="Menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 max-w-[80vw] rounded-2xl bg-[#2A2E36] shadow-2xl p-3 text-sm">
          <div className="font-title font-semibold mb-1">Journal</div>
          <div className="text-[11px] space-y-0.5 max-h-40 overflow-y-auto thin-scroll opacity-85">
            {state.log.slice(-12).reverse().map((l) => (
              <div key={l.id} className={l.kind === 'malus' ? 'text-[#F2A79A] font-semibold' : ''}>{l.text}</div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 rounded-xl bg-white/10 py-1.5 text-xs font-bold" onClick={() => { enterLandscapeFullscreen(); setOpen(false) }}>
              ⛶ Plein écran
            </button>
            <button
              className="flex-1 rounded-xl bg-[#D9534F] py-1.5 text-xs font-bold"
              onClick={() => { if (window.confirm('Quitter la partie en cours ?')) act({ type: 'RESTART' }) }}
            >
              Quitter la partie
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyView({ game, onOpenTable }) {
  return (
    <div className="my-view relative">
      <Piles game={game} />

      <div className="min-w-0 min-h-0 flex flex-col gap-1.5 py-1.5">
        <TopBar game={game} />
        <MyPlayed game={game} />
        <p className="ui-zoom text-center text-[11px] font-bold tracking-wide shrink-0">
          <span className="text-[#E8836F]">← Défausser</span>
          <span className="opacity-50"> · Ma main · </span>
          <span className="text-[#8FCB6B]">Jouer →</span>
        </p>
        <Hand game={game} />
      </div>

      <div className="relative min-h-0 overflow-y-auto thin-scroll">
        <div className="ui-zoom flex flex-col items-center gap-3 px-2 pt-12 pb-2">
          <button type="button" onClick={onOpenTable} className="eyes-btn shrink-0" aria-label="Voir la table">
            <span className="eyes-btn__ring"><EyeIcon /></span>
            <span className="text-xs font-bold">Voir la table</span>
          </button>
          <Actions game={game} />
        </div>
      </div>

      {/* hors de la colonne qui défile, sinon le menu déroulé serait rogné */}
      <div className="ui-zoom absolute top-0 right-0 z-40">
        <GameMenu game={game} />
      </div>
    </div>
  )
}
