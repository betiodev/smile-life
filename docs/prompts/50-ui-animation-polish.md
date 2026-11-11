# Step 50 — UI step 4 — animation polish

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 50 and the steps just before it
- src/components/flights.jsx, SwipeCard.jsx, GameScreen.jsx, index.css

## Goal

Make card movement readable and pleasant: drawing, placing, stealing, losing, cards arriving in the centre, turn changes.

## What to do

1. Review every card movement in the base game and the extensions and give each a short, consistent animation driven by the difference between two views (never by the full state).
2. Hidden cards animate as card backs. An animation must never reveal a card the player may not see.
3. Keep animations under about 600 ms, skippable by tapping, and disabled when the system asks for reduced motion.
4. Check performance on a mid-range phone size in the preview with a long discard pile.

## Rules for this session

- No rule changes.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

No card appears or disappears without a movement that shows where it went.

## How Teto tests it

On your phone, play a solo game. Watch a steal, a malus and a purchase: you should always see where each card went.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
