// ---------------------------------------------------------------------------
// Carte de la main qu'on fait glisser : à droite = jouer, à gauche = défausser.
// Événements pointeur (doigt et souris). Un mouvement de moins de 10 px est
// un simple toucher (agrandir la carte).
// Sert aussi pour la carte agrandie : même distance de validation en pixels.
// ---------------------------------------------------------------------------
import { useRef } from 'react'
import { cardRect } from './flights'

const TAP = 10            // px : en dessous, c'est un toucher
const FLICK = 0.9         // px/ms : un geste très vif valide plus tôt…
const FLICK_SHARE = 0.5   // … mais seulement après la moitié de la distance
const SPRING = 'transform 380ms cubic-bezier(.34,1.56,.64,1)'

// distance (px) à parcourir pour valider : la même pour toutes les cartes,
// quelle que soit leur taille (≈ un quart de la largeur d'écran)
export const swipeDistance = () => Math.min(260, Math.max(160, window.innerWidth * 0.24))

// élastique : la carte résiste et ne dépasse jamais ~34 px
const rubber = (dx) => Math.sign(dx) * 34 * (1 - Math.exp(-Math.abs(dx) / 90))

// gate(dir) → { ok, reason } : dir = 'play' | 'discard'
// onSwipe(dir, rect) : geste accepté (rect = position de la carte au lâcher)
// onTap : facultatif (rien ne se passe au toucher s'il est absent)
export default function SwipeCard({ gate, onTap, onSwipe, onHint, hidden, style, className = '', children }) {
  const move = useRef(null)
  const playStamp = useRef(null)
  const discardStamp = useRef(null)
  const g = useRef(null)

  const setStamps = (dir, progress, locked) => {
    for (const [d, el] of [['play', playStamp.current], ['discard', discardStamp.current]]) {
      if (!el) continue
      const on = d === dir ? progress : 0
      el.style.opacity = on
      el.classList.toggle('is-locked', d === dir && locked)
    }
  }

  const reset = (animated) => {
    const el = move.current
    if (!el) return
    el.style.transition = animated ? SPRING : 'none'
    el.style.transform = ''
    setStamps(null, 0, false)
    // reste au premier plan le temps de revenir à sa place
    const wrap = el.parentElement
    clearTimeout(wrap._lower)
    if (animated) wrap._lower = setTimeout(() => wrap.classList.remove('is-dragging'), 380)
    else wrap.classList.remove('is-dragging')
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, mode: 'pending', samples: [], hinted: false, distance: swipeDistance() }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointeur déjà relâché */ }
    move.current.style.transition = 'none'
    clearTimeout(move.current.parentElement._lower)
    move.current.parentElement.classList.add('is-dragging')
  }

  const onPointerMove = (e) => {
    const s = g.current
    if (!s || e.pointerId !== s.id) return
    const dx = e.clientX - s.x0
    const dy = e.clientY - s.y0
    if (s.mode === 'pending') {
      if (Math.hypot(dx, dy) < TAP) return
      // verrouillage de direction : seuls les gestes surtout horizontaux comptent
      s.mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v'
    }
    if (s.mode !== 'h') return
    const now = performance.now()
    s.samples.push({ x: e.clientX, t: now })
    while (s.samples.length > 2 && now - s.samples[0].t > 90) s.samples.shift()

    const dir = dx > 0 ? 'play' : 'discard'
    const check = gate(dir)
    s.check = check
    const eff = check.ok ? dx : rubber(dx)
    if (!check.ok && Math.abs(dx) > 22 && !s.hinted) {
      s.hinted = true
      if (check.reason) onHint?.(check.reason)
    }
    const crossed = check.ok && Math.abs(dx) >= s.distance
    const lift = -Math.min(Math.abs(eff) * 0.08, 14)
    const tilt = Math.max(-14, Math.min(14, eff * 0.06))
    move.current.style.transform = `translate(${eff}px, ${lift}px) rotate(${tilt}deg)`
    setStamps(dir, check.ok ? (crossed ? 1 : Math.min(0.85, Math.abs(dx) / s.distance)) : 0, crossed)
  }

  const finish = (e, cancelled) => {
    const s = g.current
    if (!s || e.pointerId !== s.id) return
    g.current = null
    if (s.mode === 'pending') {
      reset(false)
      if (!cancelled) onTap?.()
      return
    }
    if (s.mode !== 'h' || cancelled) return reset(true)
    const dx = e.clientX - s.x0
    const first = s.samples[0]
    const last = s.samples[s.samples.length - 1]
    const v = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0
    const flick = Math.abs(v) > FLICK && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > s.distance * FLICK_SHARE
    const dir = dx > 0 ? 'play' : 'discard'
    if (s.check?.ok && (Math.abs(dx) >= s.distance || flick)) {
      onSwipe(dir, cardRect(move.current.querySelector('.sl-card')))
      reset(false)
    } else {
      reset(true)
    }
  }

  return (
    <div className={`swipe-card ${className}`} style={{ ...style, visibility: hidden ? 'hidden' : undefined }}>
      <div
        ref={move}
        className="swipe-card__move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
        <span ref={playStamp} className="swipe-stamp is-play" aria-hidden="true">JOUER</span>
        <span ref={discardStamp} className="swipe-stamp is-discard" aria-hidden="true">DÉFAUSSER</span>
      </div>
    </div>
  )
}
