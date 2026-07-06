import Card from './Card'
import { computeScore } from '../game/scoring'
import { studyLevel, effectiveSalaryLevel } from '../game/rules'

function Zone({ title, children, empty }) {
  return (
    <div className="bg-white/70 rounded-xl p-2 border border-gray-100 min-h-20">
      <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{title}</div>
      <div className="flex flex-wrap gap-1.5 items-start">
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

  return (
    <div className="space-y-1.5">
      <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        <Zone title={`📚💼 Vie pro — études ${studyLevel(p)}/6${p.job ? ` · salaire max ${effectiveSalaryLevel(p)}` : ''}`}
          empty={!p.studies.length && !p.job && !p.salaries.length ? 'Sans emploi ni diplôme' : null}>
          {p.studies.map((c) => <Card key={c.uid} card={c} small />)}
          {p.job && <Card card={p.job} small />}
          {p.salaries.map((s) => (
            <Card key={s.card.uid} card={s.card} small className={s.invested ? 'opacity-40 saturate-50' : ''} />
          ))}
        </Zone>

        <Zone title="💕 Vie perso" empty={!p.flirts.length && !p.marriage && !p.children.length && !p.adultery ? 'Célibataire sans histoire' : null}>
          {p.flirts.map((c, i) => (
            <Card key={c.uid} card={c} small className={i === p.flirts.length - 1 ? 'ring-2 ring-pink-300' : 'opacity-60'} />
          ))}
          {p.marriage && <Card card={p.marriage} small />}
          {p.adultery && <Card card={p.adultery} small />}
          {p.children.map((c) => <Card key={c.uid} card={c} small />)}
        </Zone>

        <Zone title="🏠 Acquisitions" empty={!p.acquisitions.length && p.heritage === 0 ? 'Aucun bien' : null}>
          {p.acquisitions.map((c) => <Card key={c.uid} card={c} small />)}
          {p.heritage > 0 && (
            <span className="text-xs font-bold bg-green-100 text-green-700 rounded-lg px-2 py-1">💵 Héritage : {p.heritage} liasses</span>
          )}
        </Zone>

        <Zone title="🏅⭐⚡ Distinctions · Spéciales · Malus"
          empty={!p.distinctions.length && !p.specials.length && !p.malusKept.length && !casinoHere ? 'Rien à signaler' : null}>
          {p.distinctions.map((d) => (
            <Card key={d.card.uid} card={d.card} small className={d.active ? '' : 'opacity-40 saturate-50'} />
          ))}
          {p.specials.map((c) => <Card key={c.uid} card={c} small faceDown />)}
          {p.malusKept.map((c) => <Card key={c.uid} card={c} small faceDown />)}
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
