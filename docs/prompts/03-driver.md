# Step 03 — A driver that owns the game: screens and timers leave the engine

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 03 and the steps just before it
- docs/planning/ARCHITECTURE.md — all of it once, then closely: §3.4, §8.2 Driver, §12 step 3
- docs/planning/AUDIT.md

## Goal

Separate "the game" from "this device showing it", so the same engine can later serve a host phone, remote phones and bots.

## What to do

1. Create `src/session/driver.js`: it holds the full state, exposes `dispatch(seat, action)` (it stamps `by` itself), gives each seat its view, and owns deadlines. When a deadline passes for a player who must act, it applies the default action (today: Anniversaire gift, Chercheur discard).
2. Create `src/session/hotseat.js`: today's shared-screen mode on top of the driver. The "pass the phone" screen becomes UI that appears whenever the acting seat changes; it is no longer game state.
3. Remove `screen: 'transition'` and the `READY` action from the reducer. The engine keeps only `status: 'playing' | 'over'` (plus the setup screen handled by the app).
4. Move the 30-second timers out of `src/components/usePlayIntent.js` into the driver. The UI only displays the countdown it is given.
5. Seats get `{ name, color, kind: 'human' }`. `kind` will later take `'bot'` and `'remote'`; do not build those now.
6. Update tests and the simulator for the removed `READY` step. Regenerate goldens only if needed, and say so.

## Rules for this session

- Do not add any extension card.
- Do not change any rule of the base game.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

The reducer has no screen or timer concept; hot-seat play is unchanged for the player.

## How Teto tests it

Play a 3-player game on one phone. The "pass the phone" screen still appears between turns; the Anniversaire and Chercheur countdowns still work.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
