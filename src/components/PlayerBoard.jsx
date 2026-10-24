import Card from './Card'
import { computeScore } from '../game/scoring'
import { studyLevel, effectiveSalaryLevel } from '../game/rules'

function Zone({ title, children, empty, compact }) {
  return (
    <div className={`bg-white/70 rounded-xl border border-gray-100 ${compact ? 'p-1.5 min-h-16' : 'p-2 min-h-24'}`}>
      <div className={`font-black uppercase tracking-wider text-gray-400 mb-1 ${compact ? 'text-[9px] truncate' : 'text-[10px]'}`}>{title}</div>
      <div className={`flex flex-wrap items-start ${compact ? 'gap-y-1 [&>.sl-card:not(:first-child)]:-ml-4' : 'gap-1.5'}`}>
        {children}
        {empty && <span className="text-xs text-gray-300 italic py-2">{empty}</span>}
      </div>
    </div>
  )
}

// Tableau de vie d'un joueur : zones pro / perso / acquisitions / autres
export default function PlayerBoard({ player, state, compact = false }) {
  const p = player
  const score = computeScore(p)
  const casinoHere = state.casino && state.players[state.casino.owner] === p
  const size = compact ? 'xs' : 'sm'
  // appel de fonction (et non composant local) : les cartes ne sont pas recréées à chaque rendu
  const show = ({ card, className }) => <Card key={card.uid} card={card} size={size} zoomable className={className} />

  return (
    <div className="space-y-1.5">
      <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        <Zone compact={compact}
          title={compact
            ? `Vie pro · niv. ${studyLevel(p)}`
            : `📚💼 Vie pro — ${p.studies.length}/6 cartes études (niv. ${studyLevel(p)})${p.job ? ` · salaire max ${effectiveSalaryLevel(p)}` : ''}`}
          empty={!p.studies.length && !p.job && !p.salaries.length ? (compact ? '—' : 'Sans emploi ni diplôme') : null}>
          {p.studies.map((c) => show({ card: c }))}
          {p.job && show({ card: p.job })}
          {p.salaries.map((s) => (
            show({ card: s.card })
          ))}
        </Zone>

        <Zone compact={compact} title={compact ? 'Vie perso' : '💕 Vie perso'}
          empty={!p.flirts.length && !p.marriage && !p.children.length && !p.adultery ? (compact ? '—' : 'Célibataire sans histoire') : null}>
          {p.flirts.map((c, i) => (
            show({ card: c, className: i === p.flirts.length - 1 ? '' : 'opacity-60' })
          ))}
          {p.marriage && show({ card: p.marriage })}
          {p.adultery && show({ card: p.adultery })}
          {p.children.map((c) => show({ card: c }))}
        </Zone>

        <Zone compact={compact} title={compact ? 'Acquisitions' : '🏠 Acquisitions'}
          empty={!p.acquisitions.length && p.heritage === 0 ? (compact ? '—' : 'Aucun bien') : null}>
          {p.acquisitions.map((c) => show({ card: c }))}
          {p.heritage > 0 && (
            <span className="text-xs font-bold bg-green-100 text-green-700 rounded-lg px-2 py-1">💵 Héritage : {p.heritage} liasses</span>
          )}
        </Zone>

        <Zone compact={compact} title={compact ? 'Distinctions · malus' : '🏅⭐⚡ Distinctions · Spéciales · Malus'}
          empty={!p.distinctions.length && !p.specials.length && !p.malusKept.length && !casinoHere ? (compact ? '—' : 'Rien à signaler') : null}>
          {p.distinctions.map((d) => (
            show({ card: d.card })
          ))}
          {p.specials.map((c) => <Card key={c.uid} card={c} size={size} faceDown />)}
          {p.malusKept.map((c) => <Card key={c.uid} card={c} size={size} faceDown />)}
          {casinoHere && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded-lg px-2 py-1">
              🎰 Casino {state.casino.stake ? `— mise de ${state.players[state.casino.stake.by].name} 🂠` : '— ouvert'}
            </span>
          )}
        </Zone>
      </div>
      {!compact && (
        <div className="text-right text-sm font-black text-amber-600">😄 {score.total} smiles</div>
      )}
    </div>
  )
}
