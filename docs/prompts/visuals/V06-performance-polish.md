# Step V6 — Lighter pictures and loose ends

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends on phones, in landscape only. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French. Docs are in English.

Steps V3 to V5 replaced the layout of the two game screens: a player's board is now a mat of zones (`PlayerMat.jsx`), "La table" is a column of words per opponent, and "Ma main" gives its height to the hand. This step closes the rework. Two things were left on purpose:

- **Pictures.** `scripts/card-images.mjs` publishes every illustration and every frame at one size, 640 pixels wide. The same file is drawn on a 60-pixel picture in a zone and on a 300-pixel enlarged card. Once shown, each costs the phone about 1.6 MB of memory whatever its size on screen. A late game shows many small pictures at once; on an older iPhone that can make the page slow or make the browser reload it.
- **Leftovers.** The old layout code (`PlayedStacks.jsx` and its CSS), and animations written for the old positions.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/VISUALS-GUIDE.md` — "Design direction", and step V6 (V1–V5 must be ticked; if one is not, stop and tell Teto)
- `scripts/card-images.mjs`, `.gitignore`, `vite.config.js`, `src/components/Card.jsx`, `cardArt.js`, `layout.js`
- `src/components/useCardAnimations.js`, `flights.jsx`, `usePlayIntent.js`, `GameScreen.jsx`, `PlayerMat.jsx`, `ZoneSheet.jsx`, `MyView.jsx`, `TableView.jsx`, `src/index.css`

## Goal

Small pictures use small files; every card movement ends on something visible; no dead layout code; the documents describe the screens as they are.

## What to do

**Pictures**

1. In `scripts/card-images.mjs`, generate a second, small version of every illustration and every frame (about 240 px wide; the name of the large file plus a suffix, for example `metier-pilote.s.webp`). Some illustrations exist only as WebP with no PNG source (see the comments in `.gitignore`): generate their small version from the WebP. The small files are generated, never committed: add them to `.gitignore`. They must be produced by `npm run build` (the deploy runs it on a clean checkout) and by the dev server. The module `virtual:card-art` must keep listing each illustration once.
2. `Card.jsx` uses the small files when the card is drawn narrow (up to about 120 CSS px wide) and the large ones otherwise. Prefer letting the browser choose (`srcset` with widths and `sizes`) if you can make it reliable with the card's known width; otherwise choose in the component from the width it is given.
3. Check in the built `dist/` that both sizes are there and that no PNG source is published. Give in your summary the size of `dist/` before and after.

**Animations**

4. Go through every card movement and check, in the preview, that the card flies from a visible place to a visible place and that nothing appears or vanishes without moving: drawing (me, an opponent); playing a card to my board; a purchase with its salaries; discarding; taking the top discard; a malus on an opponent and on me; a stolen flirt (both ways); Anniversaire gifts; Troc; the intérimaire métier replaced; Casino bet. Fix what does not land, following the contract at the top of `useCardAnimations.js`. Do not redesign the animations: that is roadmap step 50.
5. Check with "reduce motion" switched on (the preview can emulate it): no animation, and nothing left hidden.

**Leftovers**

6. Delete `PlayedStacks.jsx` if nothing imports it, and the CSS classes that nothing uses any more (search each class name before removing it). Remove card size presets that nothing uses.
7. Search `src/components/` for hand-typed colour codes and pixel text sizes that crept back in during V3–V5 and replace them by the tokens of step V2.
8. Run the zone test (`tests/zones.test.mjs`) and the demo game once more; fix what the rework broke.

**Documents**

9. Rewrite the "Screens" section of `CLAUDE.md` so that it describes the screens as they are now, in at most eight lines: the two screens and the mat; `zones.js` as the one place that puts a card type in a zone on screen (an unknown type lands in "Autres"); the three depths (overview, mat, zone opened); where design values live; the animation contract; `#demo`; the two picture sizes.
10. In `docs/VISUALS-GUIDE.md`, under "What this asks of later steps", add a short "As built" paragraph: what differs from the sketches and why (sizes that did not fit, things moved).

## Rules for this session

- No change in `src/game/` or `src/session/`. No layout redesign: fix, do not restyle.
- Nothing under `docs/` may end up in `public/`. All visuals original.
- All player-facing text in French.

## Done when

A card drawn narrow loads a small file (check in the preview's network panel); every movement of point 4 lands; `PlayedStacks.jsx` is gone or its remaining use is explained; `npm test` and `npm run build` pass.

## How Teto tests it

Play a full game against the bot on your phone, from the home-screen icon. Watch a card being drawn, placed, a flirt stolen, and a malus: you should always see where the card went. The game should stay smooth to the last turn. If the page ever reloads by itself during a game, tell the next session: it means the phone ran out of memory.

## Finish

1. Run `npm test` and `npm run build`. Everything must pass.
2. `CLAUDE.md` is part of this step (point 9).
3. In `docs/VISUALS-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what got lighter, what was fixed, and that the next thing to do is step 14 of the main roadmap.
