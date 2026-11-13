// ---------------------------------------------------------------------------
// Décompte final des smiles, par catégorie
// ---------------------------------------------------------------------------

import { jobs, moneyOf, marriages, adulteries } from './state.js'

const sum = (cards) => cards.reduce((s, c) => s + c.smiles, 0)

export function licorneBonus(p) {
  const used = (k) => p.specials.some((c) => c.key === k)
  return used('arcenciel') && used('etoile')
}

export function computeScore(p) {
  const cat = {}
  cat['Études 📚'] = p.studies.reduce((s, c) => s + c.smiles, 0)
  cat['Métier 💼'] = sum(jobs(p))
  cat['Salaires 💰'] = sum(moneyOf(p))
  cat['Flirts 💕'] = p.flirts.reduce((s, c) => s + c.smiles, 0)
  cat['Mariage 💒'] = sum(marriages(p))
  cat['Adultère 😏'] = sum(adulteries(p))
  cat['Enfants 👶'] = p.children.reduce((s, c) => s + c.smiles, 0)

  let acq = 0
  for (const c of p.acquisitions) {
    if (c.key === 'licorne' && licorneBonus(p)) acq += 6
    else acq += c.smiles
  }
  cat['Acquisitions 🏠'] = acq
  cat['Distinctions 🏅'] = p.distinctions.reduce((s, d) => s + d.card.smiles, 0)

  const total = Object.values(cat).reduce((a, b) => a + b, 0)
  return { cat, total }
}
