// ---------------------------------------------------------------------------
// Intention de jeu (swipe ou boutons de la carte agrandie).
// Le geste ne fait qu'annoncer l'intention : la carte quitte la main, puis
//  - sans choix à faire → toast « Annuler » 3 s, l'action n'est envoyée au
//    moteur qu'à l'expiration ;
//  - avec choix (cible, paiement, malus à renvoyer, Anniversaire) → étape de
//    choix « Annuler » / « Confirmer », envoi au moteur à la confirmation.
// Annuler ne touche jamais l'état du jeu : la carte revient simplement en main.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CARD_RATIO } from './PlayedStacks'
import { cardRect } from './flights'
import {
  needsPayment, purchaseCost, architectFree, cheapestPayment, vengeanceChoices,
  birthdayDonors, flirtStealVictims, canPlayMalus, lowestUnusedSalary,
} from '../game/rules'

export const TOAST_MS = 3000
export const GIFT_TIMEOUT_MS = 30000

const q = (sel) => document.querySelector(`.game-root ${sel}`)
const boxOf = (el) => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.width ? { left: r.left, top: r.top, width: r.width, height: r.height } : null
}

// emplacements à l'écran
export const spots = {
  hand: (uid) => cardRect(q(`[data-zone="hand"] [data-card-uid="${uid}"]`)),
  discard: () => {
    const r = boxOf(q('[data-pile="discard"]'))
    return r && { left: r.left, top: r.top, width: r.width }
  },
  dock: () => cardRect(q('[data-dock] .sl-card')),
  table: () => {
    const r = boxOf(q('[data-pile="table"]'))
    return r && { left: r.left + r.width / 2 - 20, top: r.top + r.height / 2 - 29, width: 40 }
  },
  // k-ième place libre au bout de mes cartes posées
  played: (viewer, k = 0) => {
    const panel = q(`[data-board="${viewer}"]`)
    const r = boxOf(panel)
    if (!r) return null
    const h = Math.max(40, r.height - 14)
    const w = h / CARD_RATIO
    let right = r.left
    panel.querySelectorAll('[data-card-uid]').forEach((el) => { right = Math.max(right, el.getBoundingClientRect().right) })
    const left = Math.min(right + 10 + k * (w * 0.35), r.left + r.width - w - 8)
    return { left, top: r.top + (r.height - h) / 2, width: w }
  },
}

// quel parcours pour cette carte ?
function flowFor(state, pIdx, card, dir, casino) {
  if (dir === 'discard') return 'discard'
  if (casino) return 'casino'
  if (card.type === 'malus') return 'malus'
  if (card.key === 'troc' && card.type === 'special') return 'troc'
  if (card.key === 'vengeance' && card.type === 'special') return 'vengeance'
  if (card.key === 'anniversaire' && card.type === 'special') return 'birthday'
  if (needsPayment(state.players[pIdx], card)) return 'purchase'
  return 'simple'
}

let nextId = 0

export default function usePlayIntent({ state, viewer, act, remember, setView }) {
  const [intent, setIntent] = useState(null)
  const ref = useRef(intent)
  ref.current = intent
  const exchange = useRef(null) // Troc : on compare les mains avant / après
  const [banner, setBanner] = useState(null)

  // o : champs à modifier, ou fonction (intention courante) → champs
  const patch = useCallback((o) => setIntent((it) => (it ? { ...it, ...(typeof o === 'function' ? o(it) : o) } : it)), [])

  // nouveau tour / nouvelle phase : rien ne doit rester en attente
  useEffect(() => { setIntent(null) }, [state.current, state.screen])

  // ---- démarrer -------------------------------------------------------------
  const start = useCallback((card, dir, from, { casino = false } = {}) => {
    if (ref.current) return
    const me = state.current
    const p = state.players[me]
    const flow = flowFor(state, me, card, dir, casino)
    const base = { id: ++nextId, card, dir, flow, from }

    if (flow === 'discard' || flow === 'simple' || flow === 'casino') {
      const action =
        flow === 'discard' ? { type: 'DISCARD_CARD', uid: card.uid }
          : flow === 'casino' ? { type: 'CASINO_BET', uid: card.uid }
            : { type: 'PLAY_SELF', uid: card.uid }
      const ghosts = [{ card, from, to: flow === 'discard' ? spots.discard() : spots.played(viewer) }]
      // vol de flirt : montré tout de suite, annulable comme le reste
      const steals = flow === 'simple' ? flirtStealVictims(state, me, card) : []
      steals.forEach((vi, k) => {
        const victim = state.players[vi]
        ghosts.push({ card: victim.flirts[victim.flirts.length - 1], from: spots.table(), to: spots.played(viewer, k + 1), victim: vi })
      })
      const label = flow === 'discard' ? 'Carte défaussée' : flow === 'casino' ? 'Salaire misé au Casino' : 'Carte jouée'
      const note = steals.length ? `💘 Flirt volé à ${steals.map((i) => state.players[i].name).join(', ')}` : null
      setIntent({ ...base, stage: 'toast', action, ghosts, label, note, until: Date.now() + TOAST_MS })
      return
    }
    if (flow === 'malus' || flow === 'troc') {
      setIntent({ ...base, stage: 'target', target: null })
      return
    }
    if (flow === 'vengeance') {
      const choices = vengeanceChoices(state, me)
      if (choices.length === 1) setIntent({ ...base, stage: 'target', target: null, malusUid: choices[0].uid })
      else setIntent({ ...base, stage: 'malus-pick', malusUid: null })
      return
    }
    if (flow === 'purchase') {
      const cost = purchaseCost(p, card)
      const free = architectFree(p, card)
      const best = cheapestPayment(p, cost)
      const payment = free
        ? { architect: true, salaryUids: [], useHeritage: false }
        : { architect: false, salaryUids: best?.salaryUids ?? [], useHeritage: best?.useHeritage ?? false }
      setIntent({ ...base, stage: 'pay', cost, payment })
      return
    }
    if (flow === 'birthday') {
      setIntent({ ...base, stage: 'birthday', donors: birthdayDonors(state, me), gifts: {} })
    }
  }, [state, viewer])

  // ---- valider le toast (expiration) ----------------------------------------
  const commitToast = useCallback(() => {
    const it = ref.current
    if (!it || it.stage !== 'toast') return
    for (const g of it.ghosts) if (g.to) remember(g.card.uid, g.to)
    act({ ...it.action, quiet: true })
    setIntent(null)
  }, [act, remember])

  useEffect(() => {
    if (intent?.stage !== 'toast') return
    const t = setTimeout(commitToast, Math.max(0, intent.until - Date.now()))
    return () => clearTimeout(t)
  }, [intent?.id, intent?.stage, commitToast])

  // ---- annuler : la carte revient à sa place, rien n'est consommé ----------
  const cancel = useCallback(() => {
    const it = ref.current
    if (!it || it.stage === 'returning' || it.stage === 'gifts') return
    const uid = it.card.uid
    const ghosts = it.stage === 'toast'
      ? it.ghosts.map((g) => (g.victim != null
        ? { ...g, from: g.to, to: spots.table, fade: true }
        : { ...g, from: g.to, to: () => spots.hand(uid) }))
      : [{ card: it.card, from: spots.dock(), to: () => spots.hand(uid) }]
    setView('me')
    setIntent({ ...it, stage: 'returning', ghosts, id: ++nextId })
  }, [setView])

  const returned = useCallback(() => setIntent((it) => (it?.stage === 'returning' ? null : it)), [])

  // ---- confirmer une étape de choix -----------------------------------------
  const play = (it) => ({ type: 'PLAY_SELF', uid: it.card.uid })

  const confirm = useCallback(() => {
    const it = ref.current
    if (!it) return
    const dock = spots.dock()
    if (dock) remember(it.card.uid, dock)
    const me = state.current

    if (it.stage === 'malus-pick') {
      if (it.malusUid) patch({ stage: 'target', target: null })
      return
    }
    if (it.stage === 'target') {
      if (it.target == null) return
      if (it.flow === 'malus') act({ type: 'PLAY_MALUS', uid: it.card.uid, target: it.target })
      if (it.flow === 'troc') {
        exchange.current = { me, target: it.target, before: new Set(state.players[me].hand.map((c) => c.uid)), trocUid: it.card.uid }
        act(play(it))
        act({ type: 'TROC_PICK', target: it.target })
      }
      if (it.flow === 'vengeance') {
        act(play(it))
        act({ type: 'VENGEANCE_PICK', uid: it.malusUid, target: it.target })
      }
      // malus : on reste sur la table pour voir la cible encaisser ; Troc : retour
      // à ma main pour voir ce que j'ai reçu
      setView(it.flow === 'troc' ? 'me' : 'table')
      setIntent(null)
      return
    }
    if (it.stage === 'pay') {
      act(play(it))
      act(it.payment.architect
        ? { type: 'PURCHASE_CONFIRM', useArchitect: true }
        : { type: 'PURCHASE_CONFIRM', salaryUids: it.payment.salaryUids, useHeritage: it.payment.useHeritage })
      setIntent(null)
      return
    }
    if (it.stage === 'birthday') {
      if (it.donors.length === 0) {
        act(play(it))
        setIntent(null)
      } else {
        patch({ stage: 'gifts', asking: 0, askedAt: Date.now() })
      }
    }
  }, [act, remember, patch, setView, state])

  // ---- Anniversaire : chaque donateur choisit le salaire qu'il offre --------
  const give = useCallback((donor, salaryUid) => {
    const it = ref.current
    if (!it || it.stage !== 'gifts' || it.donors[it.asking] !== donor) return
    const gifts = { ...it.gifts, [donor]: salaryUid }
    const asking = it.asking + 1
    if (asking < it.donors.length) {
      setIntent({ ...it, gifts, asking, askedAt: Date.now() })
      return
    }
    const dock = spots.dock()
    if (dock) remember(it.card.uid, dock)
    act({ ...play(it), gifts })
    setIntent(null)
  }, [act, remember])

  // délai dépassé, ou joueur robot / déconnecté : son plus petit salaire libre
  useEffect(() => {
    if (intent?.stage !== 'gifts') return
    const donor = intent.donors[intent.asking]
    const q = state.players[donor]
    const auto = () => give(donor, lowestUnusedSalary(q)?.uid)
    if (q.bot || q.disconnected) {
      const t = setTimeout(auto, 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(auto, Math.max(0, intent.askedAt + GIFT_TIMEOUT_MS - Date.now()))
    return () => clearTimeout(t)
  }, [intent?.stage, intent?.asking, give])

  // ---- Troc : montrer ce qui a été échangé ----------------------------------
  // (effet de mise en page : le bandeau doit exister avant que la fin de tour
  // ne soit libérée par les animations)
  useLayoutEffect(() => {
    const ex = exchange.current
    if (!ex) return
    exchange.current = null
    // le tour a pu passer au joueur suivant : on regarde la main de celui qui a troqué
    const hand = state.players[ex.me].hand
    const received = hand.find((c) => !ex.before.has(c.uid))
    const givenUid = [...ex.before].find((u) => u !== ex.trocUid && !hand.some((c) => c.uid === u))
    const given = state.players[ex.target].hand.find((c) => c.uid === givenUid)
    setBanner({ id: ++nextId, name: state.players[ex.target].name, received, given })
  }, [state])
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 2800)
    return () => clearTimeout(t)
  }, [banner])

  // ---- cible (mode ciblage réutilisable) ------------------------------------
  const targetCheck = (i) => {
    const it = ref.current
    if (!it) return { ok: false }
    if (it.flow === 'malus') return canPlayMalus(state, state.current, it.card, i)
    if (it.flow === 'troc') return state.players[i].hand.length > 0 ? { ok: true } : { ok: false, reason: 'Aucune carte en main' }
    if (it.flow === 'vengeance') {
      const m = state.players[state.current].malusKept.find((c) => c.uid === it.malusUid)
      return m ? canPlayMalus(state, state.current, m, i) : { ok: false }
    }
    return { ok: false }
  }

  return { intent, start, cancel, confirm, returned, patch, give, banner, targetCheck, commitToast }
}
