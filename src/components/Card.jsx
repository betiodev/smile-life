// ---------------------------------------------------------------------------
// Rendu d'une carte — 3 couches : fond teinté, illustration, cadre
// + titre, smiles et texte d'effet ajoutés par le code
// ---------------------------------------------------------------------------
import { useState } from 'react'
import availableArt from 'virtual:card-art'
import CardBack from './CardBack'
import CardIcon from './CardIcons'
import { frameCategory, artKey, TINTS, categoryLabel, iconKey } from './cardArt'

const BASE = import.meta.env.BASE_URL
const frameUrl = (cat) => `${BASE}frames/${cat}_frame.webp`
const artUrl = (key) => `${BASE}cards/${key}.webp`

// largeur selon la taille (la hauteur suit le ratio du cadre)
const SIZES = {
  xs: 'w-11',
  sm: 'w-[76px]',
  md: 'w-28 sm:w-36',
  lg: 'w-44 sm:w-52',
}

// titre plus petit quand il est long
const titleSize = (name) => (name.length <= 11 ? 'is-short' : name.length <= 16 ? '' : name.length <= 20 ? 'is-long' : 'is-xlong')

const STATUS = { fonctionnaire: 'Fonctionnaire', interim: 'Intérimaire' }
const PERK = { app: 'Avantage permanent', api: 'Avantage instantané' }

function Effect({ card }) {
  switch (card.type) {
    case 'study':
      return <p className="sl-strong">Niveau d’études +{card.levels}</p>
    case 'job':
      return (
        <>
          <p className="sl-strong">
            {card.isGrandProf ? 'Promotion' : `Études ${card.studyReq}`} · Salaire max {card.salaryLevel}
          </p>
          {(card.status || card.perk || card.trophy) && (
            <p className="sl-tags">
              {card.status && <span>{STATUS[card.status]}</span>}
              {card.perk && <span>{PERK[card.perk]}</span>}
              {card.trophy && <span>Grand Prix</span>}
            </p>
          )}
          <p className="sl-flavor">{card.flavor}</p>
        </>
      )
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
  let n = [card.flavor, card.desc, card.cond].filter(Boolean).join(' ').length
  if (card.type === 'job') n += 25 + (card.status ? 13 : 0) + (card.perk ? 19 : 0) + (card.trophy ? 10 : 0)
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
  const sz = size ?? (small ? 'sm' : 'md')
  const interactive = !!onClick && !disabled
  const cls = [
    'sl-card', SIZES[sz] ?? '', 'shrink-0 select-none',
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
      <div className={`sl-card__title ${titleSize(card.name)}`}><span>{card.name}</span></div>
      <div className="sl-card__badge" aria-label={`${card.smiles} smiles`}>{card.smiles}</div>
      <div className={`sl-card__text ${textSize(long)}`}>
        {sz === 'md' || sz === 'lg' ? (
          <>
            {long <= 50 && <p className="sl-label">{categoryLabel(card)}</p>}
            <Effect card={card} />
          </>
        ) : sz === 'sm' ? (
          <p className="sl-short">{shortInfo(card)}</p>
        ) : null}
      </div>
    </div>
  )
}
