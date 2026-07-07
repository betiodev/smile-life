// ---------------------------------------------------------------------------
// Modales des effets interactifs (Chance, Étoile filante, Piston, Troc,
// Vengeance, Casino, achats, Journaliste, Médium)
// ---------------------------------------------------------------------------
import { useState } from 'react'
import Card from './Card'
import { isPlayableFromDiscard, canPlayMalus, hasJob, houseCost, validatePayment } from '../game/rules'

function Modal({ title, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-3">
      <div className={`bg-white rounded-2xl shadow-2xl p-5 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto anim-slide-up`}>
        <h3 className="text-lg font-black text-gray-800 mb-3">{title}</h3>
        {children}
      </div>
    </div>
  )
}

const Btn = ({ onClick, disabled, children, secondary, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`rounded-xl px-4 py-2 font-bold shadow transition-transform active:scale-95 disabled:opacity-40
      ${secondary ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gradient-to-r from-pink-500 to-amber-500 text-white hover:scale-[1.02]'}`}
  >
    {children}
  </button>
)

// --- Achat (voyage / maison) : choisir les salaires à investir ---------------
function PurchaseModal({ state, dispatch }) {
  const p = state.players[state.current]
  const card = state.pending.card
  const [chosen, setChosen] = useState([])
  const [useHeritage, setUseHeritage] = useState(false)
  const cost = card.acqType === 'house' ? houseCost(p, card) : card.cost
  const architectFree = card.acqType === 'house' && hasJob(p, 'architecte') && !p.architectFreeUsed

  const available = p.salaries.filter((s) => !s.invested)
  const levels = chosen.map((u) => available.find((s) => s.card.uid === u).card.level)
  const heritage = useHeritage ? p.heritage : 0
  const total = levels.reduce((a, b) => a + b, 0) + heritage
  const check = validatePayment(cost, levels, heritage)
  const toggle = (u) => setChosen(chosen.includes(u) ? chosen.filter((x) => x !== u) : [...chosen, u])

  return (
    <Modal title={`Acheter ${card.name} — coût ${cost} liasses${p.marriage && card.acqType === 'house' ? ' (prix marié ÷2)' : ''}`} wide>
      <div className="flex gap-3 flex-wrap items-start">
        <Card card={card} />
        <div className="flex-1 min-w-52">
          {architectFree && (
            <Btn onClick={() => dispatch({ type: 'PURCHASE_CONFIRM', useArchitect: true })}>
              🏗️ Offre Architecte : gratuit !
            </Btn>
          )}
          <div className="text-sm font-bold text-gray-600 mt-3 mb-1">Salaires à investir (retournés) :</div>
          <div className="flex flex-wrap gap-1.5">
            {available.map((s) => (
              <Card
                key={s.card.uid}
                card={s.card}
                small
                onClick={() => toggle(s.card.uid)}
                className={chosen.includes(s.card.uid) ? 'ring-4 ring-green-400' : ''}
              />
            ))}
            {available.length === 0 && <span className="text-xs text-gray-400 italic">Aucun salaire disponible</span>}
          </div>
          {p.heritage > 0 && (
            <label className="flex items-center gap-2 mt-2 text-sm font-semibold cursor-pointer">
              <input type="checkbox" checked={useHeritage} onChange={(e) => setUseHeritage(e.target.checked)} className="w-4 h-4 accent-green-500" />
              💵 Utiliser l’Héritage ({p.heritage} liasses, tout ou rien)
            </label>
          )}
          <div className={`mt-2 font-black ${check.ok ? 'text-green-600' : 'text-red-500'}`}>
            Total : {total}/{cost} liasses
            {check.ok && total > cost && <span className="text-amber-500"> — pas de monnaie rendue !</span>}
          </div>
          {!check.ok && <div className="text-xs text-red-500 font-semibold">{check.reason}</div>}
        </div>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <Btn secondary onClick={() => dispatch({ type: 'PURCHASE_CANCEL' })}>Annuler</Btn>
        <Btn disabled={!check.ok} title={check.reason} onClick={() => dispatch({ type: 'PURCHASE_CONFIRM', salaryUids: chosen, useHeritage })}>
          💸 Acheter
        </Btn>
      </div>
    </Modal>
  )
}

// --- Chance : garder 1 des 3 cartes -----------------------------------------
function ChanceModal({ state, dispatch }) {
  return (
    <Modal title="🍀 Chance — choisissez la carte à garder en main, les autres sont défaussées" wide>
      <div className="flex gap-3 flex-wrap justify-center">
        {state.pending.cards.map((c) => (
          <Card key={c.uid} card={c} onClick={() => dispatch({ type: 'CHANCE_PICK', uid: c.uid })} />
        ))}
      </div>
    </Modal>
  )
}

// --- Étoile filante / Astronaute : piocher dans la défausse ------------------
function DiscardPickModal({ state, dispatch }) {
  const playable = state.discard.filter((e) => isPlayableFromDiscard(state, state.current, e.card))
  return (
    <Modal title={`🌠 ${state.pending.source} — choisissez une carte de la défausse à jouer immédiatement`} wide>
      <div className="flex gap-2 flex-wrap justify-center">
        {playable.map((e) => (
          <Card key={e.card.uid} card={e.card} onClick={() => dispatch({ type: 'DISCARD_PICK', uid: e.card.uid })} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">Seules les cartes jouables immédiatement sont proposées.</p>
    </Modal>
  )
}

// --- Piston : choisir un métier en main --------------------------------------
function PistonModal({ state, dispatch }) {
  const p = state.players[state.current]
  const policier = state.players.some((q) => hasJob(q, 'policier'))
  const jobs = p.hand.filter((c) => c.type === 'job' && !c.isGrandProf)
  return (
    <Modal title="🤝 Piston — posez le métier de votre choix, sans condition d’études" wide>
      <div className="flex gap-2 flex-wrap justify-center">
        {jobs.map((c) => {
          const blocked = (c.key === 'bandit' || c.key === 'gourou') && policier
          return (
            <Card
              key={c.uid}
              card={c}
              disabled={blocked}
              onClick={blocked ? undefined : () => dispatch({ type: 'PISTON_PICK', uid: c.uid })}
            />
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">Grand Prof exclu (promotion uniquement). Bandit/Gourou restent bloqués par un Policier en poste.</p>
    </Modal>
  )
}

// --- Troc : choisir l'adversaire ----------------------------------------------
function TrocModal({ state, dispatch }) {
  return (
    <Modal title="🔄 Troc — échangez une carte au hasard avec qui ?">
      <div className="space-y-2">
        {state.players.map((q, i) => {
          if (i === state.current) return null
          const ok = q.hand.length > 0
          return (
            <button
              key={i}
              disabled={!ok}
              onClick={() => dispatch({ type: 'TROC_PICK', target: i })}
              className="w-full rounded-xl bg-teal-50 border-2 border-teal-200 p-3 font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-40 text-left"
            >
              {q.name} — {q.hand.length} carte(s) en main
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

// --- Troc du Chef des achats/ventes : échange avec picks face cachée -----------
function ChefTrocModal({ state, dispatch }) {
  const p = state.players[state.current]
  const pend = state.pending

  if (pend.step === 'target') {
    return (
      <Modal title={`🛡️ ${p.job.name} — troquez en protégeant 1 carte. Avec qui ?`}>
        <div className="space-y-2">
          {state.players.map((q, i) => {
            if (i === state.current) return null
            const ok = q.hand.length > 0
            return (
              <button
                key={i}
                disabled={!ok}
                onClick={() => dispatch({ type: 'CHEF_TROC_TARGET', target: i })}
                className="w-full rounded-xl bg-teal-50 border-2 border-teal-200 p-3 font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-40 text-left"
              >
                {q.name} — {q.hand.length} carte(s) en main
              </button>
            )
          })}
        </div>
      </Modal>
    )
  }

  if (pend.step === 'protect') {
    return (
      <Modal title={`🛡️ ${p.name}, choisissez la carte de votre main à protéger`} wide>
        <div className="flex gap-2 flex-wrap justify-center">
          {p.hand.map((c) => (
            <Card key={c.uid} card={c} onClick={() => dispatch({ type: 'CHEF_TROC_PROTECT', uid: c.uid })} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">La carte protégée ne pourra pas être prise par l’adversaire.</p>
      </Modal>
    )
  }

  if (pend.step === 'opp-pick') {
    const t = state.players[pend.target]
    const count = p.hand.filter((c) => c.uid !== pend.protectedUid).length
    return (
      <Modal title={`🂠 ${t.name}, choisissez une carte face cachée de ${p.name}`} wide>
        <div className="flex gap-2 flex-wrap justify-center">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} onClick={() => dispatch({ type: 'CHEF_TROC_OPP_PICK', index: i })} className="cursor-pointer hover:-translate-y-1 transition-transform">
              <Card faceDown card={{}} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Les cartes sont retournées : le choix se fait à l’aveugle{pend.protectedUid ? ` (1 carte est protégée par ${p.name})` : ''}.</p>
      </Modal>
    )
  }

  // chef-pick
  const t = state.players[pend.target]
  return (
    <Modal title={`🂠 ${p.name}, choisissez une carte face cachée de ${t.name}`} wide>
      <div className="flex gap-2 flex-wrap justify-center">
        {t.hand.map((c, i) => (
          <div key={c.uid} onClick={() => dispatch({ type: 'CHEF_TROC_CHEF_PICK', index: i })} className="cursor-pointer hover:-translate-y-1 transition-transform">
            <Card faceDown card={{}} />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">L’échange est effectué dès votre choix.</p>
    </Modal>
  )
}

// --- Vengeance : choisir un malus reçu + une cible -----------------------------
function VengeanceModal({ state, dispatch }) {
  const p = state.players[state.current]
  const [malusUid, setMalusUid] = useState(null)
  const malus = p.malusKept.find((c) => c.uid === malusUid)
  return (
    <Modal title="😈 Vengeance — renvoyez un de vos malus reçus" wide>
      <div className="text-sm font-bold text-gray-600 mb-1">1. Choisissez le malus :</div>
      <div className="flex gap-2 flex-wrap">
        {p.malusKept.map((c) => (
          <Card key={c.uid} card={c} small onClick={() => setMalusUid(c.uid)} className={malusUid === c.uid ? 'ring-4 ring-red-400' : ''} />
        ))}
      </div>
      {malus && (
        <>
          <div className="text-sm font-bold text-gray-600 mt-3 mb-1">2. Choisissez la victime :</div>
          <div className="space-y-2">
            {state.players.map((q, i) => {
              if (i === state.current) return null
              const check = canPlayMalus(state, state.current, malus, i)
              return (
                <button
                  key={i}
                  disabled={!check.ok}
                  title={check.reason}
                  onClick={() => dispatch({ type: 'VENGEANCE_PICK', uid: malusUid, target: i })}
                  className="w-full rounded-xl bg-red-50 border-2 border-red-200 p-2.5 font-bold text-red-800 hover:bg-red-100 disabled:opacity-40 text-left"
                >
                  ⚡ {q.name} {!check.ok && <span className="text-xs font-normal">— {check.reason}</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </Modal>
  )
}

// --- Casino : mise immédiate ---------------------------------------------------
function CasinoStakeModal({ state, dispatch }) {
  const p = state.players[state.current]
  const salaries = p.hand.filter((c) => c.type === 'salary')
  return (
    <Modal title="🎰 Casino ouvert ! Misez un salaire de votre main (face cachée) ?">
      <div className="flex gap-2 flex-wrap justify-center">
        {salaries.map((c) => (
          <Card key={c.uid} card={c} onClick={() => dispatch({ type: 'CASINO_STAKE', uid: c.uid })} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">Si vous misez maintenant, vous repiochez une carte. Un adversaire pourra miser contre : même niveau, il gagne tout ; niveau différent, vous gagnez tout.</p>
      <div className="flex justify-end mt-3">
        <Btn secondary onClick={() => dispatch({ type: 'CASINO_STAKE', uid: null })}>Ne pas miser</Btn>
      </div>
    </Modal>
  )
}

// --- Journaliste : voir toutes les mains -----------------------------------------
function JournalistModal({ state, dispatch }) {
  return (
    <Modal title="📰 Journaliste — vous voyez la main de chaque joueur" wide>
      {state.players.map((q, i) => {
        if (i === state.current) return null
        return (
          <div key={i} className="mb-3">
            <div className="font-bold text-gray-700 text-sm mb-1">{q.name} :</div>
            <div className="flex gap-1.5 flex-wrap">
              {q.hand.map((c) => <Card key={c.uid} card={c} small />)}
            </div>
          </div>
        )
      })}
      <div className="flex justify-end">
        <Btn onClick={() => dispatch({ type: 'CLOSE_PENDING' })}>J’ai tout vu 👀</Btn>
      </div>
    </Modal>
  )
}

// --- Médium : voir les 13 prochaines cartes ---------------------------------------
function MediumModal({ state, dispatch }) {
  return (
    <Modal title="🔮 Médium — les 13 prochaines cartes de la pioche (dans l’ordre)" wide>
      <div className="flex gap-1.5 flex-wrap">
        {state.pending.cards.map((c, i) => (
          <div key={c.uid} className="relative">
            <span className="absolute -top-1.5 -left-1.5 z-10 bg-purple-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{i + 1}</span>
            <Card card={c} small />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-3">
        <Btn onClick={() => dispatch({ type: 'CLOSE_PENDING' })}>Vision terminée 🔮</Btn>
      </div>
    </Modal>
  )
}

export default function Modals({ state, dispatch }) {
  if (!state.pending) return null
  switch (state.pending.type) {
    case 'purchase': return <PurchaseModal state={state} dispatch={dispatch} />
    case 'chance': return <ChanceModal state={state} dispatch={dispatch} />
    case 'discard-pick': return <DiscardPickModal state={state} dispatch={dispatch} />
    case 'piston': return <PistonModal state={state} dispatch={dispatch} />
    case 'troc': return <TrocModal state={state} dispatch={dispatch} />
    case 'chef-troc': return <ChefTrocModal state={state} dispatch={dispatch} />
    case 'vengeance': return <VengeanceModal state={state} dispatch={dispatch} />
    case 'casino-stake': return <CasinoStakeModal state={state} dispatch={dispatch} />
    case 'journalist': return <JournalistModal state={state} dispatch={dispatch} />
    case 'medium': return <MediumModal state={state} dispatch={dispatch} />
    default: return null
  }
}
