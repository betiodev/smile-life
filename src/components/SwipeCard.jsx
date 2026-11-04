// ---------------------------------------------------------------------------
// Carte de la main qu'on fait glisser : à droite = jouer, à gauche = défausser.
// Événements pointeur (doigt et souris) avec capture du pointeur. Un mouvement
// de moins de 10 px est un simple toucher (agrandir la carte).
// Aucune contrainte d'angle : le pouce monte souvent avant d'aller sur le côté.
// La carte suit le doigt sur les deux axes ; au lâcher, seuls le déplacement
// et la vitesse HORIZONTAUX décident (jouer, défausser ou retour en main).
// Sert aussi pour la carte agrandie (même logique, seuil relatif à sa largeur).
// ---------------------------------------------------------------------------
import { useEffect, useRef } from 'react'
import { cardRect } from './flights'

const TAP = 10            // px : en dessous, c'est un toucher
const SHARE = 0.42        // part de la largeur de la carte à parcourir pour valider
const MIN_DISTANCE = 48   // px : plancher pour les petites cartes de la main
const FLICK = 0.6         // px/ms : un geste vif valide plus tôt…
const FLICK_SHARE = 0.4   // … mais seulement après 40 % de la distance
const SPRING = 'transform 380ms cubic-bezier(.34,1.56,.64,1)'

// distance (px) à parcourir horizontalement pour valider
const swipeDistance = (el) => Math.max(MIN_DISTANCE, el.offsetWidth * SHARE)

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

  // pendant un glissement, le navigateur ne doit ni défiler ni recharger
  // (tirer pour rafraîchir) : écouteur natif non passif
  useEffect(() => {
    const el = move.current
    const block = (e) => { if (g.current && e.cancelable) e.preventDefault() }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [])

  const setStamps = (dir, progress, locked) => {
    for (const [d, el] of [['play', playStamp.current], ['discard', discardStamp.current]]) {
      if (!el) continue
      el.style.opacity = d === dir ? progress : 0
      el.classList.toggle('is-locked', d === dir && locked)
    }
    move.current?.setAttribute('data-swipe', locked ? dir : '')
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

  // vitesse horizontale (px/ms) sur les ~90 dernières ms
  const velocity = (s) => {
    const first = s.samples[0]
    const last = s.samples[s.samples.length - 1]
    return first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0
  }

  // décision au lâcher : horizontal uniquement
  const decide = (s, dx) => {
    const dir = dx > 0 ? 'play' : 'discard'
    if (!s.check?.ok) return null
    if (Math.abs(dx) >= s.distance) return dir
    const v = velocity(s)
    const flick = Math.abs(v) > FLICK && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > s.distance * FLICK_SHARE
    return flick ? dir : null
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (g.current) return // un seul doigt à la fois
    g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dragging: false, samples: [], hinted: false, distance: swipeDistance(move.current) }
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
    if (!s.dragging) {
      if (Math.hypot(dx, dy) < TAP) return
      s.dragging = true // une fois lancé, c'est un glissement jusqu'au lâcher
    }
    e.preventDefault()
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
    const crossed = decide(s, dx) === dir
    const tilt = Math.max(-15, Math.min(15, eff * 0.08))
    move.current.style.transform = `translate(${eff}px, ${dy}px) rotate(${tilt}deg)`
    // tampon pâle tant que le seuil n'est pas franchi, plein dès qu'il l'est
    setStamps(dir, check.ok ? (crossed ? 1 : Math.min(0.35, Math.abs(dx) / s.distance * 0.35)) : 0, crossed)
  }

  const finish = (e, cancelled) => {
    const s = g.current
    if (!s || e.pointerId !== s.id) return
    g.current = null
    if (!s.dragging) {
      reset(false)
      if (!cancelled) onTap?.()
      return
    }
    const dir = cancelled ? null : decide(s, e.clientX - s.x0)
    if (dir) {
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
        onLostPointerCapture={(e) => finish(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
        <span ref={playStamp} className="swipe-stamp is-play" aria-hidden="true">JOUER</span>
        <span ref={discardStamp} className="swipe-stamp is-discard" aria-hidden="true">DÉFAUSSER</span>
      </div>
    </div>
  )
}
