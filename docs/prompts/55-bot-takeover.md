# Step 55 — A bot takes over a player who left

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 55 and the steps just before it
- docs/planning/AI-PLAYER.md (takeover section)
- docs/planning/NETWORKING.md (a player leaving)
- src/session/

## Goal

When a player leaves an online game for good, a bot plays their seat so the others can finish.

## What to do

1. Implement the takeover rule from the two documents: when it triggers, who decides, and how the player can take their seat back.
2. The bot receives the seat's view only, exactly as the player did.
3. Extend the fake-transport test: a client disappears mid-game, a bot finishes for it, the game ends normally.

## Rules for this session

- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

A three-phone game finishes after one phone leaves.

## How Teto tests it

In a three-phone game, close the page on one phone and wait. A bot should take the seat, and the game should finish.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
