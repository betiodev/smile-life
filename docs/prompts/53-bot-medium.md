# Step 53 — Bot level "Moyen"

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 53 and the steps just before it
- docs/planning/AI-PLAYER.md
- src/session/bot/
- tests/bots.mjs

## Goal

A bot that plays like a careful beginner.

## What to do

1. Implement the "Moyen" level as specified in AI-PLAYER.md.
2. Add the tournament script from AI-PLAYER.md and check that Moyen beats Facile clearly over a few hundred games, with and without extensions.
3. Setup screen: choose the level per bot.

## Rules for this session

- The bot only sees its view.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

Moyen wins clearly more often than Facile in the tournament.

## How Teto tests it

Play solo against two "Moyen" bots. They should build a life (studies, job, salaries) and not waste good cards.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
