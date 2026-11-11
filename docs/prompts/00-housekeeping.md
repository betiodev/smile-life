# Step 00 — Housekeeping before the migration

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 00 and the steps just before it
- docs/planning/AUDIT.md (section 2)

## Goal

Remove leftovers so later sessions start from accurate docs and a single game mode.

## What to do

1. Remove the standalone Rivière option from `src/components/SetupScreen.jsx` and from `START_GAME`. Keep the river zone and its rules in the engine (`river`, `TAKE_RIVER`, `canTakeRiverNow`): the Fantastique extension reuses them later. Add an internal way for tests to start a game with a river so the existing river tests and simulations still run.
2. Make every doc and test say 2 to 4 players (`CLAUDE.md`, `README.md`, `tests/sim-lib.mjs`). Do not add a hard limit in the engine.
3. In `README.md`, replace the "Variante Rivière" line and the outdated structure section with a pointer to `docs/ROADMAP.md` and `docs/planning/`.
4. Check that every path mentioned in `CLAUDE.md` and in `docs/` exists.
5. Add `.github/workflows/test.yml`: on every pull request, install with `npm ci` and run `npm test`. This is what gives Teto a green tick or a red cross on each pull request. Do not touch `deploy.yml`.

## Rules for this session

- Do not touch any rule.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

No Rivière checkbox on the setup screen; `npm test` passes; docs say 2–4 players; this pull request itself shows the test check.

## How Teto tests it

Open your game link. Start a 2-player game: the Rivière checkbox is gone and the game plays as before.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
