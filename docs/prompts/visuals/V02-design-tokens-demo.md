# Step V2 — One place for colours and sizes, and a demo game

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends on phones, in landscape only. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French. Docs are in English.

The layout of the two game screens is about to be reworked (`docs/VISUALS-GUIDE.md`) because cards are too small to read on a phone. This step prepares the ground and changes nothing on screen. The review (`docs/planning/CODE-REVIEW.md`, section F) found:

- 35 different colour codes typed by hand across the components and `src/index.css` (`#FFC93C` 27 times, `#1F2228` 21 times…);
- the card's proportions (968 × 1417) written in four places: `PlayedStacks.jsx`, `CardZoom.jsx` and twice in `index.css`;
- text sizes of 9, 10 and 11 px typed 26 times as `text-[10px]` and similar;
- `GameScreen.jsx` (340 lines) holding the animation engine, the screen switch and the glue of every choice;
- the animations find cards on screen through attributes (`data-card-uid`, `data-board`, `data-pile`, `data-zone`, `data-snap`) that are documented nowhere;
- no way to look at a crowded, late-game table without playing for half an hour.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/VISUALS-GUIDE.md` — everything down to "Steps", and step V2
- `src/index.css`, every file in `src/components/`, `src/session/hotseat.js`, `src/session/driver.js`, `src/App.jsx`
- `src/game/legal.js`, `src/game/rng.js` (for the demo game)

## Goal

Shared design values live in one place; the animation code is in its own file with its contract written down; a demo link opens a late game. **The game must look and behave exactly as before.**

## What to do

**Before you start:** run the dev server and take reference screenshots in the preview at 844×390 (landscape) of: the setup screen, "Ma main" at the start of a turn, "La table", a card enlarged, the hand-over screen. You will compare at the end.

1. **Colours.** Define the interface colours once, as Tailwind theme variables in the `@theme` block of `src/index.css` (Tailwind 4 turns `--color-ink` into `bg-ink`, `text-ink`…). Give them names by role, not by look: background, raised surface, text, accent, danger, "play" green, "discard" red, and the few others really in use. Replace every hand-typed colour code in the components and in `index.css` by the variable or its utility. Merge near-duplicates only when they are visibly the same colour; when in doubt keep both as two names. The card frame tints (`TINTS` in `src/components/cardArt.js`) and the player colours (`theme.js`) stay where they are: they are already single tables.
2. **Text sizes.** Define the small sizes once (for example `--text-2xs`, `--text-xs`…) and replace the hand-typed pixel sizes. Same pixel values as today.
3. **Card proportions.** One constant in a new `src/components/layout.js` (`CARD_RATIO`, and the named card widths now in `Card.jsx`), and one CSS variable for the stylesheet. Every other copy imports or uses them.
4. **Animations in their own file.** Move the hook `useCardAnimations` out of `GameScreen.jsx` into `src/components/useCardAnimations.js`, unchanged. At the top of that file, write the contract in plain words: which attribute means what, where each must be placed, and what happens when one is missing (the card appears without flying).
5. **Demo game.** Add `src/session/demo.js` and the route `#demo` in `App.jsx`: a hot-seat game with four players (French first names), started from a fixed seed, on which a fixed number of actions (around 250, or until about 60 cards are left in the deck, whichever comes first) are played automatically, each chosen from `legalActions` of the acting seat's **view** with a seeded generator from `src/game/rng.js`. The result must be the same game every time. It then shows the normal "Passe l'écran" screen. If the game has saving (`src/session/storage.js`), the demo must not save and must not erase a saved game.
6. Add a test in `tests/session.test.mjs`: the demo game builds without error, is still in progress, and has at least 40 cards placed on the boards.

**At the end:** take the same five screenshots and compare them with the reference ones. Any visible difference is a bug of this step: fix it.

## Rules for this session

- No visual change, no behaviour change. No change in `src/game/`.
- Do not start the layout rework: no new component for boards, no change to `PlayedStacks.jsx` beyond imports.
- Keep every `data-…` attribute exactly where it is.
- All player-facing text in French.

## Done when

- A search for `#[0-9A-Fa-f]{6}` in `src/components/*.jsx` finds only `cardArt.js`-style tables and SVG drawings (list in your summary what is left and why).
- `968` and `1417` appear in one JavaScript file and one CSS rule.
- `GameScreen.jsx` no longer contains the animation hook.
- `<game link>#demo` opens a late 4-player game.
- `npm test` and `npm run build` pass.

## How Teto tests it

Play a few turns: the game looks exactly as before. Then add `#demo` at the end of your game link: after "Prêt", a game with four players and many cards on the table opens. Tap "Voir la table" to see it.

## Finish

1. Run `npm test` and `npm run build`. Everything must pass.
2. Update `CLAUDE.md`: in the "Screens" section (create it if fix step F6 did not), say where colours, text sizes and card proportions are defined, where the animation contract is written, and what `#demo` is. Keep it short.
3. In `docs/VISUALS-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: nothing should look different, and how to open the demo game.
