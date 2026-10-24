// ---------------------------------------------------------------------------
// Carte agrandie (toucher une carte) : illustration en grand au centre + texte
// complet. Fermeture : toucher à côté de la carte, ou Échap.
// Carte de MA main : elle se glisse comme dans la main (droite = jouer,
// gauche = défausser) et retourne à sa place quand on ferme.
// ---------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Card from './Card'
import SwipeCard from './SwipeCard'
import { categoryLabel } from './cardArt'
import { cardRect, prefersReducedMotion } from './flights'

const STATUS = { fonctionnaire: 'Fonctionnaire', interim: 'Intérimaire' }

// lignes de texte lisibles pour chaque type de carte
function details(card) {
  const out = []
  switch (card.type) {
    case 'study':
      out.push(`Niveau d’études +${card.levels}`)
      break
    case 'job':
      if (card.flavor) out.push(card.flavor)
      out.push(card.isGrandProf ? 'Promotion réservée aux Profs' : `Études requises : ${card.studyReq}`)
      out.push(`Salaire maximum : niveau ${card.salaryLevel}`)
      if (STATUS[card.status]) out.push(STATUS[card.status])
      break
    case 'salary':
      out.push(`Niveau ${card.level} — ${card.level} liasse${card.level > 1 ? 's' : ''}`)
      break
    case 'flirt':
      out.push(card.allowsChild ? 'Permet 1 enfant sans être marié (si ce flirt est sur le dessus)' : 'Flirt')
      break
    case 'marriage':
      out.push(`Mariage à ${card.name}`)
      break
    case 'child':
      if (card.desc) out.push(card.desc)
      break
    case 'malus':
      out.push(`Cible : ${card.cond}`)
      out.push(card.desc)
      break
    case 'acquisition':
      out.push(card.cost > 0 ? `Coût : ${card.cost} liasses${card.acqType === 'house' ? ' (÷2 si marié)' : ''}` : 'Gratuit')
      if (card.key === 'licorne') out.push('Vaut 6 smiles avec Arc-en-ciel et Étoile filante')
      break
    default:
      if (card.desc) out.push(card.desc)
  }
  return out
}

// « 2 salaires + Héritage »
function paidLabel(cards) {
  const n = cards.filter((c) => c.type === 'salary').length
  const parts = n ? [`${n} salaire${n > 1 ? 's' : ''}`] : []
  if (cards.some((c) => c.key === 'heritage')) parts.push('Héritage')
  return parts.join(' + ')
}

// cards : la pile touchée (on peut passer d'une carte à l'autre)
// hand : null (lecture seule) ou { gate, onSwipe(dir, rect), onHint, hint, from }
// extras : { under: uid → salaires/Héritage posés sous l'acquisition, notes: uid → état }
// onClose(rect) : rect = position de la carte au moment de fermer
export default function CardZoom({ cards, index = cards.length - 1, hand = null, extras = null, onClose }) {
  const [i, setI] = useState(index)
  const [sub, setSub] = useState(null) // carte sous l'acquisition, montrée à sa place
  const base = cards[i] ?? cards[cards.length - 1]
  const card = sub ?? base
  const under = extras?.under?.[base.uid] ?? []
  const note = extras?.notes?.[card.uid]
  const cardBox = useRef(null)
  const close = () => onClose(cardRect(cardBox.current?.querySelector('.sl-card')))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // la carte de la main arrive en volant depuis sa place
  useLayoutEffect(() => {
    const el = cardBox.current
    const to = cardRect(el?.querySelector('.sl-card'))
    const from = hand?.from
    if (!from || !to || prefersReducedMotion()) return
    const tf = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`
    const anim = el.animate([{ transform: tf }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.25,.75,.3,1)' })
    return () => anim.cancel()
  }, [])

  const w = Math.min(300, (window.innerHeight * 0.8 * 968) / 1417, window.innerWidth * 0.42)
  const lines = details(card)
  const face = <Card card={card} size="lg" style={{ width: w }} />

  return (
    <div
      className="card-zoom fixed inset-0 z-[60] bg-black/70 anim-fade"
      onClick={(e) => { if (!cardBox.current?.contains(e.target)) close() }}
      role="dialog"
      aria-label={card.name}
    >
      <div ref={cardBox} className="absolute left-1/2 top-1/2" style={{ width: w, transform: 'translate(-50%, -50%)', transformOrigin: '0 0' }}>
        {hand
          ? <SwipeCard gate={hand.gate} onSwipe={hand.onSwipe} onHint={hand.onHint} className="is-zoomed">{face}</SwipeCard>
          : face}
      </div>
      <div
        className="ui-zoom absolute top-1/2 -translate-y-1/2 flex flex-col gap-2 text-[#F4EFE6]"
        style={{ left: `calc(50% + ${w / 2 + 20}px)`, width: `min(220px, calc(50% - ${w / 2 + 36}px))` }}
      >
        <div className="text-[11px] font-black uppercase tracking-widest opacity-60">{categoryLabel(card)}</div>
        <h2 className="font-title text-2xl font-semibold leading-tight">{card.name}</h2>
        <div className="self-start rounded-full bg-[#FFC93C] text-[#1F2228] px-3 py-0.5 font-title font-semibold">
          😄 {card.smiles} smile{card.smiles > 1 ? 's' : ''}
        </div>
        {note && <div className="self-start rounded-lg bg-[#1F2228] px-2.5 py-1 text-xs font-bold leading-snug">{note}</div>}
        {lines.map((l, k) => <p key={k} className="text-sm leading-snug">{l}</p>)}
        {cards.length > 1 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {cards.map((c, k) => (
              <button key={c.uid} type="button" onClick={(e) => { e.stopPropagation(); setI(k); setSub(null) }}
                className={`rounded-md ${k === i && !sub ? 'ring-2 ring-[#FFC93C]' : 'opacity-70'}`} aria-label={c.name}>
                <Card card={c} size="xs" />
              </button>
            ))}
          </div>
        )}
        {under.length > 0 && (
          <div className="mt-1">
            <p className="text-[11px] font-bold opacity-70">Payée avec {paidLabel(under)}</p>
            <div className="flex gap-1 flex-wrap mt-1">
              {under.map((c) => (
                <button key={c.uid} type="button" onClick={(e) => { e.stopPropagation(); setSub(sub?.uid === c.uid ? null : c) }}
                  className={`rounded-md ${sub?.uid === c.uid ? 'ring-2 ring-[#FFC93C]' : ''}`} aria-label={c.name}>
                  <Card card={c} size="xs" />
                </button>
              ))}
            </div>
          </div>
        )}
        {hand && <p className="text-[11px] font-bold mt-1"><span className="text-[#E8836F]">← Défausser</span> · <span className="text-[#8FCB6B]">Jouer →</span></p>}
      </div>
      {hand?.hint && <div key={hand.hint.id} className="ui-zoom swipe-hint" style={{ top: 10 }} role="status">{hand.hint.text}</div>}
    </div>
  )
}
