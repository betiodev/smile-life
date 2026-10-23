// ---------------------------------------------------------------------------
// Cartes posées d'un joueur, regroupées en piles par type de carte
// (une rangée qui défile horizontalement si elle déborde)
// ---------------------------------------------------------------------------
import Card from './Card'

export const CARD_RATIO = 1417 / 968 // hauteur / largeur
// au-delà de cette largeur, la carte affiche son texte d'effet complet
const sizeFor = (width) => (width >= 120 ? 'md' : 'sm')

// ordre du tableau de vie : pro, perso, acquisitions, distinctions, spéciales, malus
function boardStacks(p) {
  const entries = [
    ...p.studies.map((card) => ({ card, group: 'study' })),
    p.job && { card: p.job, group: 'job' },
    ...p.salaries.map((s) => ({ card: s.card, group: 'salary', dim: s.invested })),
    ...p.flirts.map((card) => ({ card, group: 'flirt' })),
    p.marriage && { card: p.marriage, group: 'marriage' },
    p.adultery && { card: p.adultery, group: 'adultery' },
    ...p.children.map((card) => ({ card, group: 'child' })),
    ...p.acquisitions.map((card) => ({ card, group: 'acquisition' })),
    ...p.distinctions.map((d) => ({ card: d.card, group: 'distinction', dim: !d.active })),
    ...p.specials.map((card) => ({ card, group: 'special', faceDown: true })),
    ...p.malusKept.map((card) => ({ card, group: 'malus', faceDown: true })),
  ].filter(Boolean)
  const stacks = new Map()
  for (const e of entries) {
    if (!stacks.has(e.group)) stacks.set(e.group, [])
    stacks.get(e.group).push(e)
  }
  return [...stacks.entries()].map(([group, cards]) => ({ group, cards }))
}

const VISIBLE = 3 // cartes dessinées par pile (les autres sont cachées dessous)

// une pile : la carte la plus récente devant, les précédentes décalées derrière
function Stack({ cards, width }) {
  const shown = cards.slice(-VISIBLE)
  const off = Math.max(3, Math.round(width * 0.06))
  const size = sizeFor(width)
  return (
    <div className="relative shrink-0" style={{ width: width + off * (shown.length - 1), height: width * CARD_RATIO }}>
      {shown.map((e, i) => (
        <div key={e.card.uid} className="absolute top-0" style={{ left: off * (shown.length - 1 - i) }}>
          <Card
            card={e.card}
            size={size}
            faceDown={e.faceDown}
            className={e.dim ? 'opacity-45 saturate-50' : ''}
            style={{ width }}
          />
        </div>
      ))}
      {cards.length > 1 && (
        <span className="stack-count" style={{ fontSize: Math.max(11, width * 0.14) }}>×{cards.length}</span>
      )}
    </div>
  )
}

// rangée de piles ; cardHeight = hauteur disponible pour une carte
export default function PlayedStacks({ player, state, cardHeight, empty = 'Aucune carte posée' }) {
  const width = Math.max(28, Math.floor(cardHeight / CARD_RATIO))
  const stacks = boardStacks(player)
  const casinoHere = state.casino && state.players[state.casino.owner] === player
  const chip = 'shrink-0 self-center rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold whitespace-nowrap'
  return (
    <>
      {stacks.map((s) => <Stack key={s.group} cards={s.cards} width={width} />)}
      {player.heritage > 0 && <span className={chip}>💵 Héritage : {player.heritage}</span>}
      {casinoHere && (
        <span className={chip}>
          🎰 Casino {state.casino.stake ? `· mise de ${state.players[state.casino.stake.by].name}` : '· ouvert'}
        </span>
      )}
      {!stacks.length && !player.heritage && !casinoHere && (
        <span className="self-center text-sm italic opacity-60 px-2">{empty}</span>
      )}
    </>
  )
}
