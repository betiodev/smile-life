// ---------------------------------------------------------------------------
// Cartes posées d'un joueur, regroupées en piles par type de carte.
// Les piles tiennent toujours dans le panneau : les cartes rétrécissent, ou
// passent sur 2 rangées si c'est plus lisible.
// ---------------------------------------------------------------------------
import { Fragment } from 'react'
import Card from './Card'
import { paidCards, spentCards, unusedHeritage } from '../game/rules'

export const CARD_RATIO = 1417 / 968 // hauteur / largeur
// au-delà de cette largeur, la carte affiche son texte d'effet complet
const sizeFor = (width) => (width >= 120 ? 'md' : 'sm')

const VISIBLE = 3 // cartes dessinées par pile (les autres sont cachées dessous)
const GAP = 8 // px, = gap-2 du conteneur
const OFF = 0.06 // décalage entre les cartes d'une pile (× largeur)
const PEEK = 0.08 // bord visible d'un salaire sous une acquisition (× hauteur)
const PEEK_MAX = 4 // salaires dessinés sous une acquisition (tous visibles en grand)
const CHIP_W = 130 // largeur estimée d'une pastille (Casino)

const offFor = (w) => Math.max(3, Math.round(w * OFF))
const peekFor = (w) => Math.max(3, Math.round(w * CARD_RATIO * PEEK))

// ordre du tableau de vie : pro, perso, acquisitions, distinctions, spéciales, malus
// (seuls les salaires non investis restent dans la pile des salaires ; l'Héritage
// reste face visible jusqu'à l'achat qu'il paie, puis passe sous l'acquisition)
function boardStacks(p) {
  const entries = [
    ...p.studies.map((card) => ({ card, group: 'study' })),
    p.job && { card: p.job, group: 'job' },
    ...p.salaries.filter((s) => !s.invested).map((s) => ({ card: s.card, group: 'salary' })),
    ...p.flirts.map((card) => ({ card, group: 'flirt' })),
    p.marriage && { card: p.marriage, group: 'marriage' },
    p.adultery && { card: p.adultery, group: 'adultery' },
    ...p.children.map((card) => ({ card, group: 'child' })),
    ...unusedHeritage(p).map((card) => ({ card, group: 'heritage', note: `${p.heritage} liasses pour un futur achat` })),
    ...p.acquisitions.map((card) => ({ card, group: 'acquisition', under: paidCards(p, card.uid) })),
    ...spentCards(p).map((card) => ({ card, group: 'spent', faceDown: true, note: card.type === 'salary' ? 'Salaire dépensé : compte ses smiles, ne peut plus servir' : 'Héritage dépensé' })),
    ...p.distinctions.map((d) => ({ card: d.card, group: 'distinction', badge: d.active ? null : 'Sans effet', note: d.active ? null : 'Sans effet : métier perdu (smiles conservés)' })),
    ...p.specials.filter((c) => c.key !== 'heritage').map((card) => ({ card, group: 'special', faceDown: true })),
    ...p.malusKept.map((card) => ({ card, group: 'malus', faceDown: true })),
  ].filter(Boolean)
  const stacks = new Map()
  for (const e of entries) {
    if (!stacks.has(e.group)) stacks.set(e.group, [])
    stacks.get(e.group).push(e)
  }
  return [...stacks.entries()].map(([group, cards]) => ({ group, cards }))
}

// largeur d'une pile, en largeurs de carte
const factor = (s) => 1 + (OFF + 0.01) * (Math.min(VISIBLE, s.cards.length) - 1)
// salaires visibles au-dessus des acquisitions (même hauteur pour toute la rangée)
const peekCount = (stacks) => Math.max(0, ...stacks.flatMap((s) => s.cards.slice(-VISIBLE).map((e) => Math.min(PEEK_MAX, e.under?.length ?? 0))))

// largeur de carte : 1 rangée, ou 2 si les cartes y sont nettement plus grandes
// → { width, split } (split : indice de la 1re pile de la 2e rangée, ou null)
function layout(stacks, chips, boxW, boxH) {
  const k = peekCount(stacks)
  const fromH = (h) => h / (CARD_RATIO * (1 + PEEK * k))
  const fromW = (row, withChips) => {
    const items = row.length + (withChips ? chips : 0)
    const room = boxW - (withChips ? chips * CHIP_W : 0) - GAP * Math.max(0, items - 1)
    return row.length ? room / row.reduce((t, s) => t + factor(s), 0) : Infinity
  }
  const one = Math.min(fromH(boxH), fromW(stacks, true))
  let two = 0, split = null
  for (let i = 1; i < stacks.length; i++) {
    const w = Math.min(fromW(stacks.slice(0, i), false), fromW(stacks.slice(i), true))
    if (w > two) { two = w; split = i }
  }
  // la coupure de ligne compte pour une rangée vide : 2 espacements
  two = Math.min(two, fromH((boxH - 2 * GAP) / 2))
  const useTwo = two > one * 1.15
  return { width: Math.max(20, Math.floor(useTwo ? two : one) - 1), split: useTwo ? split : null }
}

// une pile : la carte la plus récente devant, les précédentes décalées derrière ;
// les salaires qui ont payé une acquisition dépassent au-dessus d'elle
function Stack({ group, cards, width, peekK, onZoom, hiddenUid }) {
  const shown = cards.slice(-VISIBLE)
  const off = offFor(width)
  const step = peekFor(width)
  const top = peekK * step
  const size = sizeFor(width)
  const zoom = onZoom && ((e) => {
    e.stopPropagation()
    const under = {}, notes = {}
    for (const x of cards) {
      if (x.under?.length) under[x.card.uid] = x.under
      if (x.note) notes[x.card.uid] = x.note
    }
    onZoom(cards.map((x) => x.card), { under, notes })
  })
  return (
    <div
      className={`relative shrink-0 ${onZoom ? 'cursor-zoom-in' : ''}`}
      style={{ width: width + off * (shown.length - 1), height: top + width * CARD_RATIO }}
      onClick={zoom || undefined}
    >
      {shown.map((e, i) => {
        const left = off * (shown.length - 1 - i)
        const under = (e.under ?? []).slice(0, PEEK_MAX)
        return (
          <Fragment key={e.card.uid}>
            {under.map((c, k) => (
              <div key={c.uid} className="absolute" style={{ left, top: top - (under.length - k) * step }}>
                <Card card={c} size={size} style={{ width }} />
              </div>
            ))}
            <div className="absolute" style={{ left, top, visibility: e.card.uid === hiddenUid ? 'hidden' : undefined }}>
              <Card card={e.card} size={size} faceDown={e.faceDown} style={{ width }} />
              {e.badge && <span className="card-badge" style={{ fontSize: Math.max(7, width * 0.12) }}>{e.badge}</span>}
            </div>
          </Fragment>
        )
      })}
      {(cards.length > 1 || group === 'spent') && (
        <span className="stack-count" style={{ fontSize: Math.max(11, width * 0.14) }}>
          {group === 'spent' ? `💰×${cards.length}` : `×${cards.length}`}
        </span>
      )}
    </div>
  )
}

// piles d'un joueur, à placer dans un conteneur flex qui passe à la ligne
// (flex-wrap, gap-2) de taille boxWidth × boxHeight
// onZoom(cartes, { under, notes }) : toucher une pile l'agrandit (lecture seule)
// hiddenUid : carte montrée ailleurs par un fantôme (métier intérimaire en partance)
export default function PlayedStacks({ player, state, boxWidth, boxHeight, empty = 'Aucune carte posée', onZoom = null, hiddenUid = null }) {
  const stacks = boardStacks(player)
  const casinoHere = state.casino && state.players[state.casino.owner] === player
  const chips = casinoHere ? 1 : 0
  const { width, split } = layout(stacks, chips, boxWidth, boxHeight)
  const peekK = peekCount(stacks)
  const chip = 'shrink-0 self-center rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold whitespace-nowrap'
  return (
    <>
      {stacks.map((s, i) => (
        <Fragment key={s.group}>
          {i === split && <div className="basis-full h-0" />}
          <Stack {...s} width={width} peekK={peekK} onZoom={onZoom} hiddenUid={hiddenUid} />
        </Fragment>
      ))}
      {casinoHere && (
        <span className={chip}>
          🎰 Casino {state.casino.stake ? `· mise de ${state.players[state.casino.stake.by].name}` : '· ouvert'}
        </span>
      )}
      {!stacks.length && !casinoHere && (
        <span className="self-center text-sm italic opacity-60 px-2">{empty}</span>
      )}
    </>
  )
}
