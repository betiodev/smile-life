// ---------------------------------------------------------------------------
// Animations de cartes (pioche, pose, aperçu géant) — sans bibliothèque :
// on compare l'emplacement de chaque carte avant/après une action, puis on
// fait voler une copie de la carte entre les deux positions (Web Animations).
// ---------------------------------------------------------------------------
import { useLayoutEffect, useRef, useState } from 'react'
import Card from './Card'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// uid → { where, card } : 'deck' | 'discard' | 'river' | 'forced' | 'hand:i' | 'board:i'
export function locateCards(state) {
  const m = new Map()
  const put = (c, where) => c && m.set(c.uid, { where, card: c })
  state.deck.forEach((c) => put(c, 'deck'))
  state.discard.forEach((e) => put(e.card, 'discard'))
  state.river.forEach((c) => put(c, 'river'))
  put(state.forced, 'forced')
  state.players.forEach((p, i) => {
    p.hand.forEach((c) => put(c, `hand:${i}`))
    const b = `board:${i}`
    ;[
      ...p.studies, p.job, ...p.salaries.map((s) => s.card), ...p.flirts, p.marriage, p.adultery,
      ...p.children, ...p.acquisitions, ...p.distinctions.map((d) => d.card), ...p.specials, ...p.malusKept,
    ].forEach((c) => put(c, b))
  })
  // Anniversaire en attente des cadeaux : la carte reste « dans le dock »,
  // elle ne s'envole vers le plateau qu'une fois les cadeaux reçus (comme avant)
  if (state.pending?.type === 'birthday') put(state.pending.card, 'birthday')
  return m
}

// durées (ms)
export const DUR = { draw: 480, discard: 380, previewIn: 360, previewHold: 950, previewOut: 420 }
export const previewDuration = () => DUR.previewIn + DUR.previewHold + DUR.previewOut

function previewRect() {
  const w = Math.min(260, window.innerWidth * 0.55, (window.innerHeight * 0.6 * 968) / 1417)
  const h = (w * 1417) / 968
  return { left: window.innerWidth / 2 - w / 2, top: window.innerHeight / 2 - h / 2, width: w }
}

function Flight({ f, onDone }) {
  const outer = useRef(null)
  const inner = useRef(null)
  // la copie est dessinée à la taille de « base » (aperçu ou destination) puis
  // déplacée/réduite par transform : le texte reste net pendant l'aperçu
  const base = f.preview ? previewRect() : f.to
  const tf = (r) => `translate(${r.left - base.left}px, ${r.top - base.top}px) scale(${r.width / base.width})`

  useLayoutEffect(() => {
    let frames
    let duration
    if (f.preview) {
      duration = previewDuration()
      const a = DUR.previewIn / duration
      const b = (DUR.previewIn + DUR.previewHold) / duration
      frames = [
        { transform: tf(f.from), offset: 0 },
        { transform: tf(base), offset: a, easing: 'linear' },
        { transform: tf(base), offset: b },
        { transform: tf(f.to), offset: 1 },
      ]
    } else {
      duration = f.kind === 'draw' ? DUR.draw : DUR.discard
      frames = [{ transform: tf(f.from) }, { transform: tf(f.to) }]
    }
    const opts = { duration, delay: f.delay ?? 0, easing: 'cubic-bezier(.25,.75,.3,1)', fill: 'both' }
    const anim = outer.current.animate(frames, opts)
    let flip
    if (f.flip) {
      flip = inner.current.animate(
        [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(180deg)', offset: 0.3 }, { transform: 'rotateY(0deg)' }],
        { ...opts, easing: 'ease-in-out' },
      )
    }
    anim.onfinish = () => onDone(f)
    return () => { anim.cancel(); flip?.cancel() }
    // une seule animation par vol
  }, [])

  return (
    <div
      ref={outer}
      style={{ position: 'fixed', left: base.left, top: base.top, width: base.width, transformOrigin: '0 0', perspective: 800 }}
    >
      <div ref={inner} style={{ position: 'relative', transformStyle: 'preserve-3d' }}>
        <div style={{ backfaceVisibility: 'hidden' }}>
          <Card card={f.card} size="lg" style={{ width: base.width }} />
        </div>
        {f.flip && (
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <Card faceDown card={{}} size="lg" style={{ width: base.width }} />
          </div>
        )}
      </div>
    </div>
  )
}

export function FlightLayer({ flights, onDone }) {
  if (!flights.length) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {flights.map((f) => <Flight key={f.id} f={f} onDone={onDone} />)}
    </div>
  )
}

// rectangle « à plat » d'une carte, même tournée (éventail, inclinaison) :
// largeur réelle de l'élément, centrée sur sa boîte englobante
export function cardRect(el) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  const w = el.offsetWidth || r.width
  if (!w) return null
  const h = (w * 1417) / 968
  return { left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w }
}

// Carte « fantôme » posée par-dessus l'écran (choix en attente, toast
// d'annulation) : elle vole de `from` à `to` puis reste en place.
// from / to peuvent être des fonctions, évaluées une fois l'écran à jour.
export function Ghost({ card, from, to, fade = false, duration = DUR.discard, onArrive }) {
  const ref = useRef(null)
  const [rects, setRects] = useState(null)
  useLayoutEffect(() => {
    const f = typeof from === 'function' ? from() : from
    const t = typeof to === 'function' ? to() : to
    if (!t) { onArrive?.(); return }
    setRects({ from: f ?? t, to: t })
  }, [])
  useLayoutEffect(() => {
    if (!rects || !ref.current) return
    const { from: f, to: t } = rects
    const tf = `translate(${f.left - t.left}px, ${f.top - t.top}px) scale(${f.width / t.width})`
    if (prefersReducedMotion()) { onArrive?.(); return }
    const frames = [{ transform: tf, opacity: 1 }, { transform: 'none', opacity: fade ? 0 : 1 }]
    const anim = ref.current.animate(frames, { duration, easing: 'cubic-bezier(.25,.75,.3,1)', fill: 'both' })
    // filet de sécurité : si l'animation est suspendue (onglet en arrière-plan),
    // la carte ne doit pas rester cachée
    let done = false
    const arrive = () => { if (!done) { done = true; onArrive?.() } }
    anim.onfinish = arrive
    const timer = setTimeout(arrive, duration + 400)
    return () => { anim.cancel(); clearTimeout(timer) }
  }, [rects])
  if (!rects) return null
  const t = rects.to
  return (
    <div ref={ref} className="pointer-events-none" style={{ position: 'fixed', left: t.left, top: t.top, width: t.width, transformOrigin: '0 0', zIndex: 45 }}>
      <Card card={card} size={t.width >= 110 ? 'md' : 'sm'} style={{ width: t.width }} />
    </div>
  )
}
