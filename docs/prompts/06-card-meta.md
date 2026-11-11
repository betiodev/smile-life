# Step 06 — Card meta: one table for the state of placed cards

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 06 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §3.2 Card meta, §3.5, §12 step 6
- docs/planning/AUDIT.md

## Goal

Give every placed card a placement order and a uniform place for "used", "on top of", "protected".

## What to do

1. Add `state.meta` and `state.seqCounter`. Every card placed on a board gets `{ seq }`; the entry is deleted when the card leaves the table.
2. Fold existing per-card state into meta: salary `invested` / `paidFor` → `used` + `on`; distinction `active` → `used`; the `heritage` counter and `heritageFor` map → the Héritage card with `used` + `on`. Money and distinctions become plain arrays of cards.
3. Replace the hand-written `cloneState` with `structuredClone`.
4. Add invariants to the simulator: every meta entry belongs to a card on the table; every `on` points to a card on the table.
5. `viewFor` sends meta only for cards the viewer can see.
6. The "last salary", "last flirt", "last study" rules keep using array order for now; do not change behaviour.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

No per-card state lives outside `state.meta`; goldens unchanged except where regenerated on purpose.

## How Teto tests it

Buy a house with salaries and an Héritage: the spent cards still show under the house and still count at the end.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
