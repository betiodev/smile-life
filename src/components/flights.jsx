// ---------------------------------------------------------------------------
// Animations de cartes (pioche, pose, aperçu géant) — sans bibliothèque :
// on compare l'emplacement de chaque carte avant/après une action, puis on
// fait voler une copie de la carte entre les deux positions (Web Animations).
// ---------------------------------------------------------------------------
import { useLayoutEffect, useRef } from 'react'
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
