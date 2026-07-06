// ---------------------------------------------------------------------------
// Décompte final des smiles, par catégorie
// ---------------------------------------------------------------------------

export function licorneBonus(p) {
  const used = (k) => p.specials.some((c) => c.key === k)
  return used('arcenciel') && used('etoile')
}

export function computeScore(p) {
  const cat = {}
  cat['Études 📚'] = p.studies.reduce((s, c) => s + c.smiles, 0)
  cat['Métier 💼'] = p.job ? p.job.smiles : 0
  cat['Salaires 💰'] = p.salaries.reduce((s, c) => s + c.card.smiles, 0)
  cat['Flirts 💕'] = p.flirts.reduce((s, c) => s + c.smiles, 0)
  cat['Mariage 💒'] = p.marriage ? p.marriage.smiles : 0
  cat['Adultère 😏'] = p.adultery ? p.adultery.smiles : 0
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
