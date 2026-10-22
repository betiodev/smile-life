// ---------------------------------------------------------------------------
// Optimisation des images de cartes (cadres + illustrations)
//
// Les sources PNG restent dans public/frames et public/cards. On génère à côté
// une version .webp redimensionnée (ignorée par git) : c'est elle que le jeu
// charge. Au build, les PNG sont retirés de dist/ pour ne publier que les WebP.
//
// - plugin Vite : conversion au démarrage (dev + build), surveillance de
//   public/cards en dev, module virtuel « virtual:card-art » qui liste les
//   illustrations disponibles (pas de requête 404 pour les cartes sans image)
// - en ligne de commande : `npm run images`
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// largeur cible : suffisant pour l'aperçu géant (~280 px) sur écran 2x
const DIRS = [
  { dir: 'public/frames', width: 640, quality: 82 },
  { dir: 'public/cards', width: 640, quality: 80 },
]

const pngsIn = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')) : []

async function convertOne(dir, file, { width, quality }) {
  const src = path.join(dir, file)
  const out = src.replace(/\.png$/i, '.webp')
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) return false
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90, effort: 5 })
    .toFile(out)
  return true
}

export async function optimizeAll({ root = ROOT, verbose = true } = {}) {
  let n = 0
  for (const d of DIRS) {
    const dir = path.join(root, d.dir)
    for (const f of pngsIn(dir)) if (await convertOne(dir, f, d)) n++
  }
  if (verbose && n) console.log(`[card-images] ${n} image(s) convertie(s) en WebP`)
  return n
}

// noms (sans extension) des illustrations présentes dans public/cards
export function listArt(root = ROOT) {
  return pngsIn(path.join(root, 'public/cards')).map((f) => f.replace(/\.png$/i, '')).sort()
}

const VIRTUAL = 'virtual:card-art'
const RESOLVED = '\0' + VIRTUAL

export default function cardImages() {
  let root = ROOT
  let outDir = 'dist'
  return {
    name: 'card-images',
    configResolved(cfg) {
      root = cfg.root
      outDir = path.resolve(cfg.root, cfg.build.outDir)
    },
    async buildStart() {
      await optimizeAll({ root })
    },
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED
    },
    load(id) {
      if (id === RESOLVED) return `export default new Set(${JSON.stringify(listArt(root))})`
    },
    configureServer(server) {
      const cardsDir = path.join(root, 'public/cards')
      server.watcher.add(cardsDir)
      const onChange = async (file) => {
        if (!file.startsWith(cardsDir) || !file.toLowerCase().endsWith('.png')) return
        await optimizeAll({ root })
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', onChange)
      server.watcher.on('change', onChange)
    },
    closeBundle() {
      // ne publier que les WebP
      for (const d of ['frames', 'cards']) {
        const dir = path.join(outDir, d)
        for (const f of pngsIn(dir)) fs.rmSync(path.join(dir, f))
      }
    },
  }
}

// usage en ligne de commande
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const n = await optimizeAll()
  if (!n) console.log('[card-images] tout est déjà à jour')
}
