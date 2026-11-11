# Step 51 — Same-wifi play 1 — rooms, host and joining

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 51 and the steps just before it
- docs/planning/NETWORKING.md (if it does not exist, stop and run `docs/prompts/P5-networking-design.md` first)
- docs/planning/ARCHITECTURE.md §8

## Goal

One phone hosts the game; friends join from the game link with a room code and each sees only their own view.

## What to do

1. Implement the transport and lobby exactly as NETWORKING.md recommends: `src/session/host.js`, `src/session/client.js`, room codes, seat choice, name and colour.
2. The host runs the driver and sends each client only its own view, slimmed as described in ARCHITECTURE.md §8.3. Clients send actions; the host sets `by` from the connection.
3. Home screen: "Jouer sur ce téléphone", "Créer une partie", "Rejoindre une partie".
4. Add a test with a fake in-memory transport: three clients play a full bot-driven game through the host and no client ever receives a card it may not see.
5. Respect the budget rule: no paid service, nothing that can start billing.

## Rules for this session

- Do not build reconnection yet beyond what NETWORKING.md puts in this step.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.
- If the work turns out too big for one session, stop at a point where `npm test` passes, and follow the "could not finish" path below. A half-migrated engine must never be merged.

## Done when

Two browser tabs can play a full game against each other through a room code.

## How Teto tests it

On your home wifi: create a game on your phone, join from a second phone with the code, play a full game. Each phone must show only its own hand.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
