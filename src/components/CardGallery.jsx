// Galerie de toutes les cartes (une par définition) — ouvrir l'app avec #cartes
import { BASE_DEFS } from '../data/base'
import { instanceOf } from '../data'
import Card from './Card'
import { artKey } from './cardArt'

export default function CardGallery() {
  // une carte par sorte (les mariages partagent une image mais affichent chacun leur lieu)
  const cards = BASE_DEFS.map((d) => instanceOf(d, d.id))
  return (
    <div className="p-4">
      <h1 className="font-black text-xl mb-1">Galerie des cartes ({cards.length})</h1>
      <p className="text-xs text-gray-500 mb-4">Sous chaque carte : le nom du fichier d’illustration attendu dans public/cards/.</p>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col items-center gap-1">
          <Card faceDown card={{}} size="lg" />
          <code className="text-[10px] text-gray-500">dos</code>
        </div>
        {cards.map((c) => (
          <div key={c.uid} className="flex flex-col items-center gap-1">
            <Card card={c} size="lg" />
            <code className="text-[10px] text-gray-500">{artKey(c)}.png</code>
          </div>
        ))}
      </div>
    </div>
  )
}
