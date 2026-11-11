# Step 01 — Repeatable randomness and golden games

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 01 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §4 Randomness, §11 Testing strategy, §12 step 1
- docs/planning/AUDIT.md

## Goal

Make every game repeatable from a seed, and record reference games that later refactors must reproduce.

## What to do

1. Add `src/game/rng.js`: a small seeded generator whose state is a plain value stored in `state.rng`. `START_GAME` takes an optional `seed` (random when absent). Replace every `Math.random()` in `src/game/` and the `shuffle` default. Move the log id counter into state.
2. Never include `rng` in a view (`src/game/view.js`); add a view test for it.
3. Add a test that fails if `Math.random` appears anywhere under `src/game/`.
4. Make the simulator (`tests/sim-lib.mjs`) seeded too, so a failing game prints its seed and can be replayed.
5. Add `tests/golden.test.mjs`: for 50 seeds, play a full simulated game and compare final scores and a hash of the final state with a recorded file `tests/golden.json`. Provide `npm run golden:update` to regenerate it on purpose.
6. Go through the verified rules in `CLAUDE.md`. For each one with no check in `tests/regles.test.mjs`, add one.
7. Add the golden test to `npm test`.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

Two games started with the same seed and the same actions end in the same state; golden test in `npm test`.

## How Teto tests it

Play one full 2-player game on your game link. Nothing should look or feel different.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
