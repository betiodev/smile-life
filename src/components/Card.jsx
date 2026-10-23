// ---------------------------------------------------------------------------
// Rendu d'une carte — 3 couches : fond teinté, illustration, cadre
// + titre, smiles et texte d'effet ajoutés par le code
// ---------------------------------------------------------------------------
import { useState, useLayoutEffect, useRef } from 'react'
import availableArt from 'virtual:card-art'
import CardBack from './CardBack'
import CardIcon from './CardIcons'
import { frameCategory, artKey, TINTS, categoryLabel, iconKey } from './cardArt'
import { LaurelBadge, JobText } from './CardJob'

const BASE = import.meta.env.BASE_URL
const frameUrl = (cat) => `${BASE}frames/${cat}_frame.webp`
const artUrl = (key) => `${BASE}cards/${key}.webp`

// largeur selon la taille (la hauteur suit le ratio du cadre)
const SIZES = {
  xs: 'w-11',
  sm: 'w-[76px]',
  md: 'w-28 sm:w-36',
  lg: 'w-44 sm:w-52',
  pile: 'w-16 sm:w-[84px]',
}
// style CSS appliqué (data-size) : la pile se comporte comme une petite carte
const STYLE_SIZE = { pile: 'sm' }

// Titre : taille maximale, réduite (mesure réelle) s'il ne tient pas dans la
// partie visible du bandeau. Tout est en cqw, donc le rapport ne dépend pas
// de la taille de la carte : une seule mesure suffit.
function FitTitle({ text, max, min }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current
      if (!el) return
      el.style.fontSize = `${max}cqw`
      const box = el.parentElement.clientWidth
      if (!box || el.scrollWidth <= box) return
      el.style.fontSize = `${Math.max(min, (max * box) / el.scrollWidth)}cqw`
    }
    fit()
    document.fonts?.ready.then(fit)
  }, [text, max, min])
  return <span ref={ref} style={{ fontSize: `${max}cqw` }}>{text}</span>
}

function Effect({ card }) {
  switch (card.type) {
    case 'study':
      return <p className="sl-strong">Niveau d’études +{card.levels}</p>
    case 'job':
      return <JobText card={card} />
    case 'salary':
      return (
        <>
          <p className="sl-strong">Niveau {card.level}</p>
          <p className="sl-bills" aria-label={`${card.level} liasse(s)`}>
            {Array.from({ length: card.level }, (_, i) => <span key={i} />)}
          </p>
        </>
      )
    case 'flirt':
      return card.allowsChild ? <p className="sl-strong">Permet 1 enfant</p> : null
    case 'child':
      return <p className="sl-flavor">{card.desc}</p>
    case 'malus':
      return (
        <>
          <p className="sl-strong">Cible : {card.cond}</p>
          <p>{card.desc}</p>
        </>
      )
    case 'special':
    case 'distinction':
      return <p>{card.desc}</p>
    case 'acquisition':
      return (
        <>
          <p className="sl-strong">
            {card.cost > 0 ? `Coût : ${card.cost} liasses${card.acqType === 'house' ? ' (÷2 si marié)' : ''}` : 'Gratuit'}
          </p>
          {card.key === 'licorne' && <p>Vaut 6 smiles avec Arc-en-ciel et Étoile filante</p>}
        </>
      )
    default:
      return null
  }
}

// résumé d'une ligne pour les petites cartes (plateau)
function shortInfo(card) {
  if (card.type === 'salary') return `Niveau ${card.level}`
  if (card.type === 'study') return `+${card.levels}`
  if (card.type === 'job') return `Salaire ${card.salaryLevel}`
  if (card.type === 'acquisition' && card.cost > 0) return `${card.cost} liasses`
  return categoryLabel(card)
}

// longueur approximative du texte d'effet → taille de police
function effectLength(card) {
  if (card.type === 'job') return 0 // mise en page dédiée (CardJob)
  let n = [card.flavor, card.desc, card.cond].filter(Boolean).join(' ').length
  if (card.key === 'licorne') n += 50
  return n
}
const textSize = (n) => (n > 85 ? 'is-xlong' : n > 50 ? 'is-long' : '')

function Artwork({ card, cat }) {
  const key = artKey(card)
  const [failed, setFailed] = useState(false)
  if (availableArt.has(key) && !failed) {
    return <img className="sl-card__img" src={artUrl(key)} alt="" draggable="false" loading="lazy" onError={() => setFailed(true)} />
  }
  return (
    <div className="sl-card__placeholder" style={{ color: TINTS[cat].accent }}>
      <CardIcon name={iconKey(card)} />
    </div>
  )
}

export default function Card({
  card, onClick, selected, disabled, small, size, faceDown, className = '', zoomable = false, style,
}) {
  const sz = STYLE_SIZE[size] ?? size ?? (small ? 'sm' : 'md')
  const width = SIZES[size ?? sz]
  const interactive = !!onClick && !disabled
  const cls = [
    'sl-card', width ?? '', 'shrink-0 select-none',
    interactive ? 'is-interactive' : '',
    selected ? 'is-selected' : '',
    disabled ? 'is-disabled' : '',
    zoomable ? 'is-zoomable' : '',
    className,
  ].join(' ')

  if (faceDown) {
    return (
      <div className={cls} data-size={sz} data-card-uid={card?.uid} onClick={interactive ? onClick : undefined} style={style}>
        <CardBack />
      </div>
    )
  }

  const cat = frameCategory(card)
  const tint = TINTS[cat]
  const long = effectLength(card)
  const big = sz === 'md' || sz === 'lg'
  const laurel = card.type === 'job' // à toutes les tailles (main, plateaux, table)
  return (
    <div
      className={cls}
      data-size={sz}
      data-card-uid={card.uid}
      onClick={interactive ? onClick : undefined}
      title={sz === 'md' || sz === 'lg' ? undefined : `${card.name} — ${card.smiles} smile${card.smiles > 1 ? 's' : ''}`}
      style={{ '--tint-light': tint.light, '--tint-deep': tint.deep, '--accent': tint.accent, ...style }}
    >
      <div className="sl-card__tint" />
      <div className="sl-card__art"><Artwork key={card.uid} card={card} cat={cat} /></div>
      <img className="sl-card__frame" src={frameUrl(cat)} alt="" draggable="false" />
      {laurel && <LaurelBadge card={card} />}
      <div className={`sl-card__title ${laurel ? 'has-laurel' : ''}`}>
        <FitTitle text={card.name} max={sz === 'sm' ? 9.5 : 8} min={sz === 'sm' ? 5 : 4.6} />
      </div>
      <div className="sl-card__badge" aria-label={`${card.smiles} smiles`}><span>{card.smiles}</span></div>
      <div className={`sl-card__text ${textSize(long)}`}>
        {big ? (
          <>
            {card.type !== 'job' && long <= 50 && <p className="sl-label">{categoryLabel(card)}</p>}
            <Effect card={card} />
          </>
        ) : sz === 'sm' ? (
          <p className="sl-short">{shortInfo(card)}</p>
        ) : null}
      </div>
    </div>
  )
}
