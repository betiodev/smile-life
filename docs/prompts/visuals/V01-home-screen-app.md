# Step V1 — The game as a home-screen app

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends on phones, in landscape only. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French. Docs are in English.

**The problem.** On Teto's iPhone the visible height in landscape is about 330 CSS pixels out of 400: the browser's bar takes the rest, and the cards are too small to read. A site opened from the iPhone's home screen runs without any browser bar. Facts checked in November 2026 (re-check anything you rely on):

- Since iOS 26, every site added to the home screen opens as a web app by default. Before iOS 26 the page must ask for it (`apple-mobile-web-app-capable`).
- iPhone ignores the manifest's `orientation`, and a page cannot lock the orientation. The existing "Tourne ton téléphone" overlay stays.
- The Fullscreen API does not exist on iPhone (iPad and Android have it), so the menu's "Plein écran" button does nothing there.
- The home-screen app has its own storage, separate from Safari.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/VISUALS-GUIDE.md` — "How to use this guide", "iPhone facts", and step V1
- `index.html`, `vite.config.js`, `scripts/card-images.mjs`, `src/index.css` (the `.game-root`, `.my-view`, `.table-view` rules), `src/components/theme.js`, `src/components/SetupScreen.jsx`, `src/components/MyView.jsx` (the `GameMenu` component), `src/components/CardBack.jsx`

## Goal

Opened from the home screen, the game uses the whole screen; players are told how to do it; nothing else changes.

## What to do

1. **Manifest.** Add a web app manifest in `public/`: name and short name "Smile Life", `display: "standalone"`, `orientation: "landscape"` (Android honours it), background and theme colour `#1F2228`, icons. `start_url` and `scope` must be relative, so that it works both locally and under `/smile-life/` on GitHub Pages (`vite.config.js` uses `base: './'`). Link it from `index.html`.
2. **Icon.** An original icon: the yellow card back with its smile (see `CardBack.jsx`), on the dark background. Do not use any Smile Life logo or official artwork. Write it as an SVG in the repository and generate the PNG sizes (180 for `apple-touch-icon`, 192 and 512 for the manifest, one maskable) with a small script using `sharp`, which is already a dev dependency. Commit the generated PNGs under `public/icons/`. Check that the build still publishes them (`scripts/card-images.mjs` removes PNGs from `dist/cards` and `dist/frames` only).
3. **Older iPhones.** In `index.html`: `apple-mobile-web-app-capable`, `mobile-web-app-capable`, a status-bar style that lets the page use the whole screen, `apple-mobile-web-app-title`, and the `apple-touch-icon` link. Keep `viewport-fit=cover` and the `noindex` line.
4. **Safe areas.** Opened as an app in landscape, the screen has insets on the left and right (notch) and at the bottom (home bar). Check both game screens, the setup screen, the hand-over screen and the final screen: nothing important under an inset, and the hand's cards are not under the home bar. Use `env(safe-area-inset-*)`.
5. **Tell the player.** On the setup screen, when the page is **not** opened from the home screen (check `display-mode: standalone` and `navigator.standalone`) and the device has a touch screen, show a short tip that can be dismissed:
   - iPhone / iPad: "Pour jouer en plein écran : ouvre cette page dans Safari, touche Partager, puis « Sur l'écran d'accueil »."
   - other phones: "Pour jouer en plein écran : menu du navigateur, puis « Ajouter à l'écran d'accueil »."
6. **The "Plein écran" button.** Show it only where it can work (`document.fullscreenEnabled` or the webkit equivalent) and when the page is not already a home-screen app.
7. **No service worker.** It is not needed, and a cached old version of the game would be a new kind of problem for Teto.

## How to check your work

Run the dev server and look at the pages in the preview at 844×390, 667×375 and 932×430 (landscape). You cannot test "add to home screen" yourself: check the manifest and the tags by reading the built `dist/index.html` after `npm run build`, and say plainly in your summary that the iPhone test is Teto's.

## Rules for this session

- No change in `src/game/` or `src/session/`. No change to the layout of the game screens beyond the safe-area padding.
- All visuals must be original. No official Blackrock Games artwork or logo.
- All player-facing text in French.
- Nothing under `docs/` may end up in `public/`.

## Done when

`npm run build` produces a `dist/` with the manifest and the icons; the tip appears in a normal browser tab and not in standalone mode; `npm test` passes.

## How Teto tests it

On your iPhone, open the game link **in Safari** (not another browser). Tap Share, then "Sur l'écran d'accueil", then "Ajouter". Open the game from the new icon and turn the phone: no address bar, no buttons at the bottom. Start a game: the cards are already a little bigger. If a game was saved in Safari, it will not be in the app: the two keep their saves apart.

## Finish

1. Run `npm test` and `npm run build`. Everything must pass.
2. Update `CLAUDE.md` with one line: the game can be installed on the home screen (manifest in `public/`, icons generated by the script, no service worker).
3. In `docs/VISUALS-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary and the exact steps to add the game to the home screen (the "How you test it" line of this step).
