// ---------------------------------------------------------------------------
// Rendu d'une carte — bord coloré par type, smiles, icônes et détails
// ---------------------------------------------------------------------------

export const TYPE_STYLE = {
  study: { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-800', emoji: '📚', label: 'Études' },
  job: { border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-800', emoji: '💼', label: 'Métier' },
  salary: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800', emoji: '💰', label: 'Salaire' },
  flirt: { border: 'border-pink-400', bg: 'bg-pink-50', text: 'text-pink-700', emoji: '💕', label: 'Flirt' },
  marriage: { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700', emoji: '💒', label: 'Mariage' },
  adultery: { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', emoji: '😏', label: 'Adultère' },
  child: { border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', emoji: '👶', label: 'Enfant' },
  malus: { border: 'border-red-900', bg: 'bg-red-100', text: 'text-red-900', emoji: '⚡', label: 'Malus' },
  special: { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-800', emoji: '⭐', label: 'Spéciale' },
  acquisition: { border: 'border-teal-400', bg: 'bg-teal-50', text: 'text-teal-800', emoji: '🏠', label: 'Acquisition' },
  distinction: { border: 'border-slate-400', bg: 'bg-slate-50', text: 'text-slate-700', emoji: '🏅', label: 'Distinction' },
}

export function cardEmoji(card) {
  if (card.type === 'flirt') return card.emoji
  if (card.type === 'acquisition') {
    if (card.acqType === 'animal') return card.emoji
    if (card.acqType === 'travel') return '✈️'
    return '🏠'
  }
  return TYPE_STYLE[card.type].emoji
}

const liasses = (n) => '💵'.repeat(n)

function CardDetails({ card }) {
  switch (card.type) {
    case 'study':
      return <div className="text-[10px] leading-tight">Niveau{card.levels > 1 ? 'x' : ''} : {card.levels} 🎓{card.levels === 2 ? '🎓' : ''}</div>
    case 'job':
      return (
        <div className="text-[10px] leading-tight space-y-0.5">
          <div className="flex justify-between">
            <span title="Niveau d'études requis">🎓 {card.isGrandProf ? 'Prof' : card.studyReq}</span>
            <span title="Niveau de salaire max">{liasses(card.salaryLevel)}</span>
          </div>
          {card.trophy && <div title="Éligible au Grand Prix d'Excellence">🏆 Grand Prix</div>}
          {card.status && <div className="font-bold">{card.status === 'fonctionnaire' ? '🏛️ Fonctionnaire' : '⏳ Intérimaire'}</div>}
          {card.perk && <div className="uppercase font-bold text-[9px]">{card.perk === 'app' ? 'Avantage permanent' : 'Avantage instantané'}</div>}
          <div className="italic opacity-80">{card.flavor}</div>
        </div>
      )
    case 'salary':
      return <div className="text-sm">{liasses(card.level)}</div>
    case 'flirt':
      return card.allowsChild ? <div className="text-[10px]">👶 Permet 1 enfant</div> : null
    case 'child':
      return <div className="text-[10px] italic opacity-80 leading-tight">{card.desc}</div>
    case 'malus':
      return (
        <div className="text-[10px] leading-tight space-y-0.5">
          <div className="font-bold">Cible : {card.cond}</div>
          <div>{card.desc}</div>
        </div>
      )
    case 'special':
    case 'distinction':
      return <div className="text-[10px] leading-tight">{card.desc}</div>
    case 'acquisition':
      return (
        <div className="text-[10px] leading-tight">
          {card.cost > 0 ? <span>Coût : {card.cost} liasses{card.acqType === 'house' ? ' (÷2 si marié)' : ''}</span> : <span>Gratuit</span>}
          {card.key === 'licorne' && <div>Vaut 6 😄 avec Arc-en-ciel + Étoile filante</div>}
        </div>
      )
    default:
      return null
  }
}

export default function Card({ card, onClick, selected, disabled, small, faceDown, className = '' }) {
  if (faceDown) {
    return (
      <div className={`${small ? 'w-12 h-16' : 'w-24 h-36'} rounded-lg border-2 border-indigo-300 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow ${className}`}>
        <span className={small ? 'text-lg' : 'text-3xl'}>😄</span>
      </div>
    )
  }
  const st = TYPE_STYLE[card.type]
  if (small) {
    return (
      <div
        onClick={onClick}
        title={`${card.name} — ${card.smiles} 😄`}
        className={`w-16 min-h-16 rounded-md border-2 ${st.border} ${st.bg} p-1 text-center shadow-sm shrink-0 ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
      >
        <div className="text-base leading-none">{cardEmoji(card)}</div>
        <div className={`text-[9px] font-bold leading-tight ${st.text}`}>{card.name}</div>
        <div className="text-[9px]">😄{card.smiles}{card.type === 'salary' ? ` ${liasses(card.level)}` : ''}</div>
      </div>
    )
  }
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative w-28 sm:w-32 rounded-xl border-[3px] ${st.border} ${st.bg} p-2 shadow-md shrink-0 select-none transition-all
        ${onClick && !disabled ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : ''}
        ${selected ? 'ring-4 ring-yellow-400 -translate-y-2' : ''}
        ${disabled ? 'opacity-50 grayscale' : ''} ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-black bg-yellow-300 rounded-full px-1.5 py-0.5 shadow-sm" title="Smiles">
          😄{card.smiles}
        </span>
        <span className="text-xl">{cardEmoji(card)}</span>
      </div>
      <div className={`font-extrabold text-xs mt-1 leading-tight ${st.text}`}>{card.name}</div>
      <div className={`text-[9px] uppercase tracking-wide opacity-60 ${st.text}`}>{st.label}</div>
      <div className={`mt-1 ${st.text}`}>
        <CardDetails card={card} />
      </div>
    </div>
  )
}
