# Step 13 — A first, easy bot and a solo mode

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 13 and the steps just before it
- docs/planning/ARCHITECTURE.md §8.2 and §8.4
- docs/planning/AI-PLAYER.md (if it does not exist, stop and run `docs/prompts/P4-ai-player-design.md` first)

## Goal

Let Teto test alone against computer players, and let simulations play sensibly. (Moved earlier than in the original order: it makes testing every extension much easier. The stronger levels come in Phase 11.)

## What to do

1. Add `src/session/bot/` with the bot interface from AI-PLAYER.md: given its **view** and `legalActions`, return one action. The bot never receives the full state.
2. Implement the "Facile" level as specified in AI-PLAYER.md.
3. Seats can be `kind: 'bot'`. The driver asks the bot to act after a short delay so humans can follow.
4. Setup screen: each seat can be a person or "Ordinateur". A solo game (one person plus 1 to 3 bots) skips the "pass the phone" screen.
5. Add `tests/bots.mjs`: bot-against-bot games with all invariants on, and a check that a bot only ever returns an action from `legalActions`.

## Rules for this session

- Do not build the Moyen and Difficile levels yet.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

A solo game against 3 bots runs to the end; bot simulations are part of `npm test`.

## How Teto tests it

Start a game with yourself and two "Ordinateur" players. Play it to the end. The bots should play legal, if not clever, moves at a readable pace.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
