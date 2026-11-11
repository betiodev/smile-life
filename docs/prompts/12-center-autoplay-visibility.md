# Step 12 — Shared zone, cards that play themselves, and visibility

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 12 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §3.1 (shared zones), §6.1 (`draw`), §8.1 View, §12 step 10
- docs/planning/AUDIT.md

## Goal

Add the last mechanisms the extensions need, proven with two fake cards before any real card depends on them.

## What to do

1. Add the `center`, `pot` and `spare` zones, and `meta.timer`, `meta.faceDown`, `meta.protectedBy` with the `isProtected` check inside `remove`.
2. Make `draw` handle `autoPlay` definitions: from the deck, from opening hands and from refills, with the per-definition option for Chance.
3. Add `canSee(state, viewer, uid)` and `state.sight` and make `viewFor` use them for every zone.
4. Add a set-up flow so extensions can add set-up steps.
5. Add two definitions that exist only in tests (`test.global-rule`: auto-played, sits in `center` for 2 rounds, forbids placing flirts; `test.shield`: protects one placed card). Write tests for them, including the leak scan and a nested case (auto-play card drawn during a purchase).
6. Extend the simulator to run with the test extension enabled.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

All mechanisms of ARCHITECTURE.md §9 exist and are tested; the base game is unchanged.

## How Teto tests it

Play one full game. Nothing should look different. This was the last engine step.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
