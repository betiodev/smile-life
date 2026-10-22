// Dos de carte — dessin original : fond jaune, double bordure et grand sourire
// Même boîte que les faces (968×1417, le badge des faces dépasse en haut à
// droite) : le dos occupe exactement le corps de carte des faces.
const YELLOW = '#EF9F27'
const CHARCOAL = '#2C2C2A'

// petite marque d'angle (équerre), tournée selon l'angle
function Corner({ x, y, rot }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 70V0h70" fill="none" stroke={CHARCOAL} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="42" cy="42" r="11" fill={CHARCOAL} />
    </g>
  )
}

export default function CardBack({ className = '' }) {
  return (
    <svg viewBox="0 0 968 1417" className={`block w-full h-full ${className}`} aria-hidden="true">
      <g transform="translate(1 37)">
        <rect width="962" height="1380" rx="64" fill={YELLOW} />
        <rect x="38" y="38" width="886" height="1304" rx="44" fill="none" stroke={CHARCOAL} strokeWidth="16" />
        <rect x="72" y="72" width="818" height="1236" rx="26" fill="none" stroke={CHARCOAL} strokeWidth="6" />
        <Corner x={118} y={118} rot={0} />
        <Corner x={844} y={118} rot={90} />
        <Corner x={844} y={1262} rot={180} />
        <Corner x={118} y={1262} rot={270} />
        <circle cx="361" cy="560" r="52" fill={CHARCOAL} />
        <circle cx="601" cy="560" r="52" fill={CHARCOAL} />
        <path d="M266 770Q481 1010 696 770" fill="none" stroke={CHARCOAL} strokeWidth="64" strokeLinecap="round" />
      </g>
    </svg>
  )
}
