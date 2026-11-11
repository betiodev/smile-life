# Step 08 — Flow stack, part 1: the turn and the purchase

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 08 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §6.3 Flows, §6.4 The turn flow, §12 step 8
- docs/planning/AUDIT.md

## Goal

Replace the single "choice in progress" slot with a stack of step-by-step flows, starting with the turn itself.

## What to do

1. Add `state.stack` and the flow interface of §6.3 (`start, actors, legal, apply, resume, fallback, view`) in `src/game/flows/`.
2. Implement the `turn` flow (start, draw, play, end, next) and the `purchase` flow. Port `forced` cards (taken from the discard, Étoile filante) as a flow or a turn step.
3. During this step the old `pending` slot may still exist for the flows not yet ported; the engine checks the stack first, then `pending`. Step 09 removes it.
4. `whoMustAct` and `legalActions` ask the top frame. Frames are plain data: never store a function in state.
5. Every step that waits for a player must define `fallback`.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

Turn and purchase run as flows; invariants and goldens pass (regenerate only with a reason).

## How Teto tests it

Play a full game with at least one house purchase and one card taken from the discard pile.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
