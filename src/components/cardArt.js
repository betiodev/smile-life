// ---------------------------------------------------------------------------
// Habillage des cartes : catégorie → cadre, teinte, icône, nom de fichier
// (affichage uniquement, aucune règle de jeu ici)
// ---------------------------------------------------------------------------

// Mesures du gabarit commun des cadres (PNG 1024×1536, mesurées sur
// metier_frame.png) : la partie opaque va de x 31→999 et y 49→1466 (badge
// compris). Les positions CSS (index.css, .sl-card) sont en % de cette boîte.

// catégorie de cadre : public/frames/<cat>_frame.png
export function frameCategory(card) {
  switch (card.type) {
    case 'study': return 'etudes'
    case 'job': return 'metier'
    case 'salary': return 'salaire'
    case 'flirt': return 'flirt'
    case 'marriage': return 'mariage'
    case 'adultery': return 'adultere'
    case 'child': return 'enfant'
    case 'malus': return 'malus'
    case 'special': return 'speciale'
    case 'distinction': return 'distinction'
    case 'acquisition': return card.acqType === 'animal' ? 'animal' : 'acquisition'
    default: return 'speciale'
  }
}

// « Prof d'anglais » → « prof-d-anglais »
export function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// nom de l'illustration : public/cards/<cat>-<nom>.png
// (sauf les études : etude-simple.png / etude-double.png)
export const artKey = (card) => {
  if (card.type === 'study') return card.levels === 2 ? 'etude-double' : 'etude-simple'
  return `${frameCategory(card)}-${slugify(card.name)}`
}

// teinte du fond (clair au centre, plus soutenu au bord) + couleur d'accent
export const TINTS = {
  metier: { light: '#e3f0fd', deep: '#9cc6f0', accent: '#1f5f9e' },
  etudes: { light: '#efe6fb', deep: '#c3a6ea', accent: '#5a2c96' },
  salaire: { light: '#e3f6e6', deep: '#9fd8ab', accent: '#1e7a38' },
  flirt: { light: '#fde7f1', deep: '#f2a9c9', accent: '#a83a6e' },
  mariage: { light: '#fdeae4', deep: '#f2b3a2', accent: '#a5301c' },
  adultere: { light: '#f9e4f5', deep: '#dc9ccf', accent: '#87196f' },
  enfant: { light: '#fdf7d9', deep: '#f0dc7c', accent: '#8a7414' },
  malus: { light: '#fde4e2', deep: '#ee9e98', accent: '#911414' },
  speciale: { light: '#e5e9fa', deep: '#a6b2e6', accent: '#1d2a7a' },
  animal: { light: '#f8eee2', deep: '#dcbc96', accent: '#6e4a26' },
  acquisition: { light: '#e0f6f6', deep: '#97d8d9', accent: '#1d7275' },
  distinction: { light: '#fbf1d8', deep: '#e9cb7e', accent: '#7f6114' },
}

export const LABELS = {
  study: 'Études', job: 'Métier', salary: 'Salaire', flirt: 'Flirt', marriage: 'Mariage',
  adultery: 'Adultère', child: 'Enfant', malus: 'Malus', special: 'Spéciale',
  distinction: 'Distinction', animal: 'Animal', travel: 'Voyage', house: 'Maison',
}

export const categoryLabel = (card) =>
  card.type === 'acquisition' ? LABELS[card.acqType] : LABELS[card.type]

// clé d'icône pour le visuel de remplacement
export function iconKey(card) {
  if (card.type === 'acquisition') return card.acqType === 'animal' ? 'paw' : card.acqType === 'travel' ? 'plane' : 'house'
  return {
    study: 'cap', job: 'briefcase', salary: 'bill', flirt: 'heart', marriage: 'rings',
    adultery: 'mask', child: 'baby', malus: 'bolt', special: 'star', distinction: 'medal',
  }[card.type] ?? 'star'
}
