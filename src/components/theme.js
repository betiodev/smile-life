// Couleurs de l'interface de jeu et des joueurs
export const UI = {
  bg: '#1F2228',
  text: '#F4EFE6',
  accent: '#FFC93C',
}

export const PLAYER_COLORS = [
  { key: 'coral', label: 'Corail', hex: '#B8503A' },
  { key: 'teal', label: 'Sarcelle', hex: '#1F7069' },
  { key: 'violet', label: 'Violet', hex: '#4E3FA0' },
  { key: 'olive', label: 'Olive', hex: '#55701F' },
]

// couleur d'un joueur (repli sur l'ordre des joueurs si aucune n'a été choisie)
export const playerColor = (player, index) =>
  player?.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length].hex

// Plein écran + paysage au lancement de la partie (doit être appelé pendant un
// geste de l'utilisateur). Échoue silencieusement si le navigateur refuse.
export async function enterLandscapeFullscreen() {
  try {
    const el = document.documentElement
    if (!document.fullscreenElement) await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)
  } catch { /* non supporté */ }
  try {
    await screen.orientation?.lock?.('landscape')
  } catch { /* non supporté (iOS, ordinateur…) */ }
}
