# Step 49 — Combination testing across all extensions

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 49 and the steps just before it
- docs/extensions/INTERACTIONS.md
- docs/planning/ARCHITECTURE.md §5.3, §11
- tests/sim.mjs, tests/combos.test.mjs

## Goal

Prove that any mix of extensions plays to the end without breaking a rule or leaking a hidden card.

## What to do

1. Run bot-against-bot games over all 64 subsets of the six extensions at 2, 3 and 4 players with invariants and the leak scan on. Add this as `npm run test:combos` (it may be too slow for `npm test`; keep a smaller sample in `npm test`).
2. Check that every row of INTERACTIONS.md is marked ruled and has a test in `tests/combos.test.mjs`. For unruled rows, ask Teto (batches of at most 8, with recommendations), record, then test.
3. Fix every failure. A fix that changes a ruling needs Teto's agreement.
4. Measure game length (turns) per number of extensions and report it to Teto in a small table. If games with many extensions are too long, propose options; do not implement one without Teto's choice.

## Rules for this session

- Do not silence a failing invariant.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

`npm run test:combos` passes; INTERACTIONS.md has no unruled row.

## How Teto tests it

Play one solo game with all six extensions on. It should reach the end.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
