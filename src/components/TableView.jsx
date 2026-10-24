// ---------------------------------------------------------------------------
// Écran 2 — « La table » : un panneau par joueur (2 colonnes), avec ses piles
// de cartes aussi grandes que le panneau le permet.
// Mode ciblage (malus, Troc, Vengeance) : même vue, les joueurs non éligibles
// sont grisés ; on touche un joueur pour le choisir, puis « Confirmer ».
// Le ciblage est décrit par un objet indépendant (voir `targeting` plus bas)
// pour pouvoir le remplacer plus tard par un glisser-vers-la-cible.
// ---------------------------------------------------------------------------
import PlayedStacks from './PlayedStacks'
import useElementSize from './useElementSize'
import { playerColor } from './theme'
import { computeScore } from '../game/scoring'
import { Dock } from './PlayChoices'

function PlayerPanel({ game, player, index, target, onZoom }) {
  const { state, hit } = game
  const [ref, { width, height }] = useElementSize()
  const isCurrent = !target && index === state.current
  // target : null (vue normale) ou { ok, reason, selected, onPick }
  const pickable = target?.ok
  const greyed = target && !target.ok
  const cls = [
    'table-panel',
    isCurrent ? 'is-current' : '',
    pickable ? 'is-target' : '',
    target?.selected ? 'is-selected' : '',
    greyed ? 'is-greyed' : '',
    hit?.idx === index ? 'anim-hit' : '',
  ].join(' ')
  return (
    <div
      data-board={index}
      data-snap
      className={cls}
      style={{ background: playerColor(player, index) }}
      onClick={pickable ? target.onPick : undefined}
      role={pickable ? 'button' : undefined}
      aria-label={pickable ? `Choisir ${player.name}` : undefined}
      aria-pressed={pickable ? !!target.selected : undefined}
    >
      <div className="ui-zoom flex items-center gap-2 min-w-0 shrink-0 px-1">
        <span className="font-title text-base font-semibold truncate">{player.name}</span>
        {player.skipTurns > 0 && <span className="text-[11px] font-bold opacity-85">⏭️×{player.skipTurns}</span>}
        {greyed
          ? <span className="text-[11px] font-bold opacity-90 truncate">{target.reason}</span>
          : <span className="text-[11px] font-bold opacity-70 whitespace-nowrap">{player.hand.length} en main</span>}
        {pickable
          ? <span className="ml-auto shrink-0 rounded-full bg-[#FFC93C] text-[#1F2228] px-2 font-bold text-xs">{target.selected ? '✓ Choisi' : 'Choisir'}</span>
          : <span className="ml-auto shrink-0 rounded-full bg-black/25 px-2 font-title font-semibold text-sm">😄 {computeScore(player).total}</span>}
      </div>
      <div ref={ref} className="flex-1 min-h-0 flex flex-wrap gap-2 items-center content-center overflow-auto thin-scroll px-1">
        {height > 0 && <PlayedStacks player={player} state={state} boxWidth={width - 8} boxHeight={height - 10} onZoom={target ? null : onZoom} />}
      </div>
    </div>
  )
}

// targeting : null (vue normale) ou
//   { title, card, from, check(i) → { ok, reason }, selected, onSelect(i), onConfirm, onCancel }
export default function TableView({ game, onBack, targeting = null, onZoom }) {
  const { state, viewer } = game
  // la table ne montre que les adversaires : mes cartes sont déjà sur « Ma vue »
  const others = state.players.map((q, i) => ({ q, i })).filter(({ i }) => i !== viewer)
  const n = others.length
  const current = state.players[state.current]
  const targetFor = (i) => {
    if (!targeting) return null
    const check = targeting.check(i)
    return { ...check, selected: targeting.selected === i, onPick: () => targeting.onSelect(i) }
  }
  return (
    <div className="table-view">
      <div className="flex items-center gap-3 shrink-0">
        {targeting ? (
          <>
            <button type="button" onClick={targeting.onCancel} className="ui-zoom rounded-full bg-white/12 font-bold text-sm px-3 py-1.5 shrink-0">
              Annuler
            </button>
            <Dock card={targeting.card} from={targeting.from} width={34} />
            <h1 className="ui-zoom font-title text-lg font-semibold truncate">{targeting.title}</h1>
            <button type="button" onClick={targeting.onConfirm} disabled={targeting.selected == null}
              className="ui-zoom ml-auto rounded-full bg-[#FFC93C] text-[#1F2228] font-bold text-sm px-4 py-1.5 shrink-0 disabled:opacity-35">
              Confirmer
            </button>
          </>
        ) : (
          <div className="ui-zoom flex items-center gap-3 h-10 w-full min-w-0">
            <button type="button" onClick={onBack} className="rounded-full bg-[#FFC93C] text-[#1F2228] font-bold text-sm px-3 py-1.5 shrink-0">
              ← Ma main
            </button>
            <h1 className="font-title text-xl font-semibold truncate">La table</h1>
            <span className="ml-auto text-sm font-bold flex items-center gap-1.5 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: playerColor(current, state.current) }} />
              <span className="truncate">{state.current === viewer ? 'C’est ton tour' : `Tour de ${current.name}`}</span>
            </span>
          </div>
        )}
      </div>
      <div className={`flex-1 min-h-0 grid gap-2 ${n > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${n > 2 ? 'grid-rows-2' : 'grid-rows-1'}`}>
        {others.map(({ q, i }) => <PlayerPanel key={i} game={game} player={q} index={i} target={targetFor(i)} onZoom={onZoom} />)}
      </div>
    </div>
  )
}
