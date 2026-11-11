# Step 56 — Online play — friends in different places

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 56 and the steps just before it
- docs/planning/NETWORKING.md (online section, recommended path and fallback)

## Goal

The same game works when players are on different networks, including mobile data.

## What to do

1. Implement the recommended path of NETWORKING.md for connecting across networks, and its fallback.
2. Detect a failed connection within a few seconds and tell the player in plain French what to try.
3. Nothing here may cost money or require a card number. If the free option needs an account, write the exact sign-up steps for Teto in the summary and in `docs/planning/NETWORKING.md`.

## Rules for this session

- No paid service.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

Two phones on different networks (one on mobile data) complete a game.

## How Teto tests it

Ask a friend at their home to join your game with the code, you on wifi and one phone on mobile data. Play a full game.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
