# Step P4 — AI player design

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step P4 and the steps just before it
- docs/planning/FABLE-BRIEF.md (sections 3 and 6)
- docs/planning/ARCHITECTURE.md
- docs/planning/AUDIT.md
- docs/extensions/ (all specs)

## Goal

Write `docs/planning/AI-PLAYER.md`. (Fable does this during the planning session; skip the step if the file already exists.)

## What to do

1. Design the rule-based bot: architecture, difficulty levels "Facile", "Moyen", "Difficile" (what makes each stronger: heuristics, card evaluation, targeting, guessing hidden cards, lookahead), how it handles extension cards without per-card code (it tries actions on a guessed state through the pure reducer, see ARCHITECTURE.md §8.4), how it takes over a departed player, the time budget per move on a phone, and how it is tested (bot-against-bot games with invariants, tournaments between levels). Zero running cost: no LLM, no server.
2. Write for a reader who has never seen the brief. State uncertainties and risks honestly.
3. If the design changes a later step, update that step's prompt in `docs/prompts/` and its line in the roadmap.

## Rules for this session

- Documents only: no game code.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

`docs/planning/AI-PLAYER.md` exists and the roadmap steps that depend on it can be followed.

## How Teto tests it

Read the document's summary: you should understand the recommendation and what it costs without reading the rest.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
