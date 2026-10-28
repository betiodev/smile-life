// ---------------------------------------------------------------------------
// Affichage de l'intention de jeu : toast d'annulation, carte « en attente »
// au centre, feuilles de choix (paiement, Vengeance, Anniversaire) et
// bandeau du Troc. Aucune règle ici : tout vient de usePlayIntent / rules.js.
// ---------------------------------------------------------------------------
import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import Card from './Card'
import { Ghost, cardRect, prefersReducedMotion } from './flights'
import { TOAST_MS, GIFT_TIMEOUT_MS } from './usePlayIntent'
import { playerColor } from './theme'
import { validatePayment, malusHasTarget } from '../game/rules'

// carte en attente : arrive en volant depuis l'endroit où on l'a lâchée
export function Dock({ card, from, width = 110 }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current?.firstChild
    const to = cardRect(el)
    if (!from || !to || prefersReducedMotion()) return
    const tf = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`
    const anim = el.animate([{ transform: tf }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.25,.75,.3,1)' })
    return () => anim.cancel()
  }, [])
  return (
    <div ref={ref} data-dock className="shrink-0" style={{ width }}>
      <Card card={card} size={width >= 110 ? 'md' : 'sm'} style={{ width, transformOrigin: '0 0' }} />
    </div>
  )
}

const BtnBar = ({ onCancel, onConfirm, ok, label = 'Confirmer', reason }) => (
  <div className="flex items-center gap-2 mt-auto pt-2">
    <button type="button" onClick={onCancel} className="rounded-xl bg-white/12 px-4 py-2 font-bold text-sm active:scale-95">Annuler</button>
    <button type="button" onClick={onConfirm} disabled={!ok}
      className="flex-1 rounded-xl bg-[#FFC93C] text-[#1F2228] px-4 py-2 font-bold text-sm shadow active:scale-95 disabled:opacity-35">
      {label}
    </button>
    {!ok && reason && <span className="text-[11px] text-[#F2A79A] max-w-40 leading-tight">{reason}</span>}
  </div>
)

function Sheet({ intent, title, children }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/55 flex items-center justify-center p-3 anim-fade">
      <div className="ui-zoom bg-[#2A2E36] rounded-2xl shadow-2xl p-3 flex gap-3 max-w-[min(640px,96vw)] w-full max-h-[94vh] anim-slide-up">
        <Dock card={intent.card} from={intent.from} />
        <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto thin-scroll">
          <h3 className="font-title text-lg font-semibold leading-tight">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  )
}

// ---- Paiement en salaires ------------------------------------------------------
const chip = (on) =>
  `rounded-full px-3 py-1.5 text-sm font-bold border-2 active:scale-95 transition-transform ${on
    ? 'bg-[#8FCB6B] text-[#1F2228] border-[#8FCB6B]' : 'bg-transparent text-[#F4EFE6] border-white/25'}`

export function PaymentSheet({ intent, player, patch, onCancel, onConfirm }) {
  const { cost, payment } = intent
  const free = payment.architect
  const unused = player.salaries.filter((s) => !s.invested)
  const levels = unused.filter((s) => payment.salaryUids.includes(s.card.uid)).map((s) => s.card.level)
  const heritage = payment.useHeritage ? player.heritage : 0
  const total = levels.reduce((a, b) => a + b, 0) + heritage
  const check = free ? { ok: true } : validatePayment(cost, levels, heritage)
  const toggle = (uid) => patch(({ payment: pay }) => ({
    payment: {
      ...pay, architect: false,
      salaryUids: pay.salaryUids.includes(uid) ? pay.salaryUids.filter((u) => u !== uid) : [...pay.salaryUids, uid],
    },
  }))
  const canArchitect = intent.card.acqType === 'house' && player.job?.key === 'architecte' && !player.architectFreeUsed
  return (
    <Sheet intent={intent} title={`Payer ${intent.card.name}`}>
      <p className="text-sm opacity-80">Prix : <b>{cost} liasses</b>{player.marriage && intent.card.acqType === 'house' ? ' (prix marié)' : ''}</p>
      <div className="flex flex-wrap gap-1.5">
        {canArchitect && (
          <button type="button" className={chip(free)}
            onClick={() => patch(({ payment: pay }) => ({ payment: { architect: !pay.architect, salaryUids: [], useHeritage: false } }))}>
            🏗️ Offerte (Architecte)
          </button>
        )}
        {unused.map((s) => (
          <button key={s.card.uid} type="button" className={chip(!free && payment.salaryUids.includes(s.card.uid))} onClick={() => toggle(s.card.uid)}>
            💰 {s.card.level}
          </button>
        ))}
        {player.heritage > 0 && (
          <button type="button" className={chip(!free && payment.useHeritage)}
            onClick={() => patch(({ payment: pay }) => ({ payment: { ...pay, architect: false, useHeritage: !pay.useHeritage } }))}>
            💵 Héritage {player.heritage}
          </button>
        )}
      </div>
      <div className={`font-title text-xl font-semibold ${check.ok ? 'text-[#8FCB6B]' : 'text-[#F2A79A]'}`}>
        {free ? 'Gratuit' : `${total} / ${cost}`}
        {!free && check.ok && total > cost && <span className="text-sm text-[#FFC93C]"> — pas de monnaie rendue</span>}
      </div>
      <BtnBar onCancel={onCancel} onConfirm={onConfirm} ok={check.ok} reason={total >= cost ? check.reason : null} label="Confirmer l’achat" />
    </Sheet>
  )
}

// ---- Vengeance, étape 1 : quel malus renvoyer ? --------------------------------
export function VengeanceSheet({ intent, state, patch, onCancel, onConfirm }) {
  const me = state.current
  const kept = state.players[me].malusKept
  return (
    <Sheet intent={intent} title="Vengeance : quel malus renvoyer ?">
      <div className="flex flex-wrap gap-2">
        {kept.map((m) => {
          const ok = malusHasTarget(state, me, m)
          const on = intent.malusUid === m.uid
          return (
            <button key={m.uid} type="button" disabled={!ok} onClick={() => patch({ malusUid: m.uid })}
              className={`rounded-xl transition-transform ${on ? 'ring-4 ring-[#FFC93C] scale-105' : ok ? 'ring-2 ring-[#FFC93C]/40' : 'opacity-35 grayscale'}`}
              title={ok ? m.name : 'Aucune cible valide'}>
              <Card card={m} size="sm" />
            </button>
          )
        })}
      </div>
      <BtnBar onCancel={onCancel} onConfirm={onConfirm} ok={!!intent.malusUid} label="Choisir la cible →" />
    </Sheet>
  )
}

// ---- Anniversaire : confirmation, puis cadeaux --------------------------------
export function BirthdaySheet({ intent, state, onCancel, onConfirm }) {
  const me = state.current
  const others = state.players.map((q, i) => ({ q, i })).filter(({ i }) => i !== me)
  return (
    <Sheet intent={intent} title="Anniversaire">
      <p className="text-sm opacity-80">Chaque joueur qui a un salaire non investi t’en offre un, de son choix.</p>
      <ul className="text-sm space-y-0.5">
        {others.map(({ q, i }) => (
          <li key={i} className={intent.donors.includes(i) ? '' : 'opacity-50'}>
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: playerColor(q, i) }} />
            {q.name} {intent.donors.includes(i) ? '🎁' : '— aucun salaire à offrir'}
          </li>
        ))}
      </ul>
      <BtnBar onCancel={onCancel} onConfirm={onConfirm} ok label="Confirmer" />
    </Sheet>
  )
}

function Countdown({ since, total }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  return <span className="tabular-nums">{Math.max(0, Math.ceil((since + total - now) / 1000))} s</span>
}

// gifts : { pending, asking, askedAt, give } (useBirthdayGifts)
export function GiftsOverlay({ gifts, state }) {
  const { pending, asking, askedAt, give } = gifts
  const me = state.players[state.current]
  const d = state.players[asking]
  const unused = d.salaries.filter((s) => !s.invested)
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3 anim-fade">
      <div className="ui-zoom bg-[#2A2E36] rounded-2xl shadow-2xl p-3 flex gap-3 max-w-[min(680px,96vw)] w-full max-h-[94vh]">
        <Dock card={pending.card} from={null} width={90} />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <h3 className="font-title text-lg font-semibold">🎂 Anniversaire de {me.name}</h3>
          <ul className="text-sm space-y-0.5">
            {pending.donors.map((i) => {
              const done = i in pending.gifts
              return (
                <li key={i} className={done ? 'text-[#8FCB6B]' : i === asking ? 'font-bold' : 'opacity-60'}>
                  {done ? `✓ ${state.players[i].name} a choisi` : `En attente de ${state.players[i].name}…`}
                </li>
              )
            })}
          </ul>
          <div className="rounded-xl p-2.5" style={{ background: playerColor(d, asking) }}>
            <p className="font-bold text-sm mb-1.5">
              {d.name}, choisis le salaire que tu offres à {me.name} <span className="opacity-75">· <Countdown key={asking} since={askedAt} total={GIFT_TIMEOUT_MS} /></span>
            </p>
            <div className="flex flex-wrap gap-2">
              {unused.map((s) => (
                <button key={s.card.uid} type="button" onClick={() => give(asking, s.card.uid)} className="active:scale-95 transition-transform">
                  <Card card={s.card} size="sm" />
                </button>
              ))}
            </div>
            <p className="text-[10px] opacity-75 mt-1">Sans choix à temps, le plus petit salaire est offert.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- toast « Annuler » --------------------------------------------------------
export function UndoToast({ intent, onUndo }) {
  return (
    <div className="fixed left-1/2 bottom-3 -translate-x-1/2 z-50 anim-slide-up" role="status">
      <div className="ui-zoom flex items-center gap-3 rounded-full bg-[#F4EFE6] text-[#1F2228] pl-4 pr-1.5 py-1.5 shadow-2xl overflow-hidden relative">
        <span className="font-bold text-sm whitespace-nowrap">{intent.label}</span>
        {intent.note && <span className="text-xs font-bold whitespace-nowrap text-[#A83A6E]">{intent.note}</span>}
        <button type="button" onClick={onUndo} className="rounded-full bg-[#1F2228] text-[#FFC93C] font-bold text-sm px-3 py-1 active:scale-95">
          Annuler
        </button>
        <span className="toast-progress" style={{ animationDuration: `${TOAST_MS}ms` }} />
      </div>
    </div>
  )
}

export function GhostLayer({ intent, onReturned }) {
  if (!intent || (intent.stage !== 'toast' && intent.stage !== 'returning')) return null
  const back = intent.stage === 'returning'
  return (
    <>
      {intent.ghosts.map((g, k) => (
        <Ghost
          key={`${intent.id}-${g.card.uid}`}
          card={g.card}
          from={g.from}
          to={g.to}
          fade={g.fade}
          onArrive={back && k === 0 ? onReturned : undefined}
        />
      ))}
    </>
  )
}

// ---- Troc : ce que j'ai donné et reçu ---------------------------------------------
export function ExchangeBanner({ banner }) {
  if (!banner) return null
  return (
    <div className="fixed left-1/2 top-3 -translate-x-1/2 z-50 anim-slide-up pointer-events-none" key={banner.id}>
      <div className="ui-zoom flex items-center gap-3 rounded-2xl bg-[#2A2E36] px-3 py-2 shadow-2xl">
        <span className="font-title font-semibold">🔄 Troc avec {banner.name}</span>
        {banner.given && <div className="flex flex-col items-center text-[10px] font-bold">Donnée<Card card={banner.given} size="xs" /></div>}
        <span className="text-xl">⇄</span>
        {banner.received && <div className="flex flex-col items-center text-[10px] font-bold">Reçue<Card card={banner.received} size="xs" /></div>}
      </div>
    </div>
  )
}

