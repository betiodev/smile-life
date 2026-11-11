# Step 52 — Same-wifi play 2 — reconnecting, sleeping phones, leaving

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 52 and the steps just before it
- docs/planning/NETWORKING.md (reconnection, sleep, leaving sections)
- src/session/

## Goal

A game survives a phone that sleeps, reloads or leaves.

## What to do

1. Reconnection: a client that reloads or wakes up rejoins its seat with the room code and gets the current view.
2. The host saves the game after every action and can resume after a reload.
3. A player who is absent when they must act: the driver's deadline applies the fallback, as NETWORKING.md specifies. Show who is disconnected.
4. Keep the host's screen awake during a game where the browser allows it, and tell the host clearly that their phone must stay on.
5. Extend the fake-transport test with dropped and re-established connections.

## Rules for this session

- Bot takeover and host replacement come later; do not build them here.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

Locking and unlocking a client phone mid-game does not break the game.

## How Teto tests it

During a two-phone game: lock one phone for 30 seconds, then unlock; reload the page on the other. The game continues for both.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
