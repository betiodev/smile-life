# Step F4 — A game that survives a reload, and a bug report you can copy

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

The game is played on one phone passed around ("hot-seat"). All state is in memory: a reload, a closed tab or a restarted phone loses the game. The driver records every accepted action and every game has a seed, so any game can be replayed exactly, but there is no way to get that information out of the phone. A review (`docs/planning/CODE-REVIEW.md`, findings C6, C3, B6, E1) asks for four small things.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/FIXES-GUIDE.md` — find step F4
- `docs/planning/ARCHITECTURE.md` §4 and §8.2
- `src/session/driver.js`, `src/session/hotseat.js`, `src/App.jsx`, `src/components/SetupScreen.jsx`, `src/components/MyView.jsx` (the `GameMenu` component)
- `tests/session.test.mjs`, `tests/golden.test.mjs` (how a game is replayed from a seed and actions), `.github/workflows/deploy.yml`

## Goal

1. A hot-seat game is saved after every action and can be resumed after a reload.
2. A menu button copies a bug report from which the game can be replayed exactly.
3. The driver starts games with extensions and never loses its timers.
4. Nothing is published without passing the tests.

## What to do

**Saving**

1. Add `src/session/storage.js`: `saveGame`, `loadGame`, `clearGame` over `localStorage`, under one key (for example `smile-life.save.v1`). What is saved: a save-format number, the seats, the full state, the action history, the hot-seat's own little state (who holds the screen), and the date. Every call is wrapped in `try/catch`: storage may be full, blocked or absent (Node tests), and the game must go on without it.
2. The storage is passed to `createHotseat` as an option, so tests give a fake one and the engine stays untouched. `src/game/` must not know about storage.
3. Save after every accepted action and after "Prêt". Clear the save when the game is over and when the player chooses "Quitter la partie".
4. Setup screen: when a save exists, show above the form "Reprendre la partie" with the players' names and the turn number, and "Nouvelle partie" (which clears the save after a confirmation). Resuming shows the "Passe l'écran à …" screen first, so nobody sees someone else's hand. Countdowns that were running restart from 30 seconds.
5. A save that cannot be used (other format number, or an error while building the first view) is deleted, with the message "La partie sauvegardée vient d'une ancienne version du jeu." Never crash on a bad save.
6. The full state is read through `driver.fullState()` **only** in `src/session/`. The screens still read only views.

**Bug report**

7. The driver gets `report()`: `{ seed, extensions, names, colors, river, history, turnCount, version }`. `version` is the short git commit of the build, injected at build time through Vite's `define` in `vite.config.js` (fall back to `'dev'`).
8. Menu: a button "Copier le rapport de bug" that copies the report as JSON text to the clipboard and confirms with a short message ("Rapport copié"). If the clipboard is refused, show the text in a box the player can select. Add one line under the button: "À copier après la partie : le rapport permet de reconstituer les mains."
9. Add `tests/replay.mjs`: `node tests/replay.mjs <file.json>` starts a game from the report's seed, names and extensions, applies the history and prints where the game stands (turn, who must act, scores), or the first action the engine refuses. Add a line about it in `CLAUDE.md`.

**Driver**

10. `createDriver` accepts `extensions` and passes it to `START_GAME`.
11. In `tick`, an exception thrown while applying a timed-out default must not stop the timers: catch it, log it to the console, and always reschedule.

**Deploy**

12. In `.github/workflows/deploy.yml`, add a `npm test` step before `npm run build`. A failing test must stop the deployment.

**Tests** (in `tests/session.test.mjs`)

13. Save, then resume from the saved text: the resumed game has the same views for every seat, and the same action applied to both gives the same state.
14. A report taken mid-game, replayed, reaches the same state.
15. A corrupted save is ignored and deleted.
16. A driver started with `extensions: ['test']` has that extension in its state.

## Rules for this session

- No change in `src/game/`. `tests/golden.json` must not be modified.
- The seed and the full state must never be put in a view.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If something is unclear, ask Teto.
- All player-facing text in French.

## Done when

A game reloaded mid-turn continues with the same hands and the same deck; `node tests/replay.mjs` replays a copied report; the deploy workflow runs the tests; `npm test` passes.

## How Teto tests it

Start a 2-player game, play three turns, reload the page: the first screen offers "Reprendre la partie". Tap it and check your hand is the same. Then open the menu (three lines, top right), tap "Copier le rapport de bug" and paste it into your Notes app: you should see a block of text starting with `{`. From now on, when something goes wrong in a game, paste that text to the Claude session you report it to.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. Update `CLAUDE.md`: `src/session/` (storage, resume, report), the replay script, and that the deploy runs the tests. Keep it short.
3. In `docs/FIXES-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test (the "How you test it" line of this step in the fixes guide).
