// ---------------------------------------------------------------------------
// Éléments propres aux cartes Métier, dessinés par le code par-dessus le cadre :
// couronne de laurier (études requises) et pile de billets (salaire max)
// ---------------------------------------------------------------------------
import CardIcon from './CardIcons'

const GREEN = '#3f7d34'
const GOLD_DARK = '#6b4e0f'

// feuilles le long de l'anneau, du bas vers le haut de chaque côté
const LEAVES = []
for (const side of [-1, 1]) {
  for (let k = 0; k < 7; k++) {
    const deg = 90 + side * (18 + k * 21) // 90° = bas (y vers le bas)
    const a = (deg * Math.PI) / 180
    LEAVES.push({ x: 38.5 * Math.cos(a), y: 38.5 * Math.sin(a), rot: deg + 90 - side * 32 })
  }
}

export function LaurelBadge({ card }) {
  return (
    <div className="sl-laurel" aria-label={card.isGrandProf ? 'Promotion réservée aux profs' : `${card.studyReq} niveau(x) d’études requis`}>
      <svg viewBox="-50 -50 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="sl-gold" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0" stopColor="#f7d66b" />
            <stop offset="1" stopColor="#d49b1f" />
          </linearGradient>
        </defs>
        <circle r="47" fill="url(#sl-gold)" stroke={GOLD_DARK} strokeWidth="3" />
        <path d="M-27.2 27.2A38.5 38.5 0 0 1-33.3-19.3M27.2 27.2A38.5 38.5 0 0 0 33.3-19.3" fill="none" stroke={GREEN} strokeWidth="2" />
        {LEAVES.map((l, i) => (
          <ellipse key={i} cx={l.x} cy={l.y} rx="7.5" ry="3.3" transform={`rotate(${l.rot} ${l.x} ${l.y})`} fill={GREEN} />
        ))}
        <circle r="30" fill="#fdf6e3" stroke={GOLD_DARK} strokeWidth="2" />
      </svg>
      {card.isGrandProf
        ? <CardIcon name="cap" className="sl-laurel__icon" />
        : <span className="sl-laurel__num">{card.studyReq}</span>}
    </div>
  )
}

function Bill({ style }) {
  return (
    <svg viewBox="0 0 60 32" className="sl-bill" style={style} aria-hidden="true">
      <rect x="1.5" y="1.5" width="57" height="29" rx="4" fill="#9ed8a9" stroke="#1e6b33" strokeWidth="2.5" />
      <rect x="6" y="6" width="48" height="20" rx="2" fill="none" stroke="#1e6b33" strokeWidth="1" opacity="0.55" />
      <circle cx="30" cy="16" r="6.5" fill="#dff4e3" stroke="#1e6b33" strokeWidth="1.8" />
    </svg>
  )
}

// un billet par niveau de salaire max, empilés vers le haut : la pile grandit.
// La pile est ancrée à un point fixe de l'encadré (celui du Serveur) : le
// premier billet est au même endroit sur tous les métiers, les suivants aussi.
export function BillPile({ level }) {
  return (
    <div className="sl-billpile" aria-label={`Salaire max ${level}`}>
      {Array.from({ length: level }, (_, i) => (
        <Bill key={i} style={{ left: `${i * 0.5}cqw`, bottom: `${i * 3.1}cqw` }} />
      ))}
    </div>
  )
}

const STATUS = { fonctionnaire: 'Fonctionnaire', interim: 'Intérimaire' }
const PERK = { app: 'Avantage permanent', api: 'Avantage instantané' }

// zone de texte : pastilles en haut, phrase au centre, billets à droite
export function JobText({ card }) {
  return (
    <div className="sl-job">
      {(card.status || card.perk || card.trophy) && (
        <p className="sl-tags">
          {card.status && <span>{STATUS[card.status]}</span>}
          {card.perk && <span>{PERK[card.perk]}</span>}
          {card.trophy && <span>Grand Prix</span>}
        </p>
      )}
      <div className="sl-job__row">
        <span />
        <p className={`sl-flavor ${card.flavor.length > 24 ? 'is-long' : ''}`}>{card.flavor}</p>
        <span />
      </div>
      <BillPile level={card.salaryLevel} />
    </div>
  )
}
