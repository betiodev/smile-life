# Step 57 — When the host leaves

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends, each on their own phone. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — find step 57 and the steps just before it
- docs/planning/NETWORKING.md (the host leaving)
- src/session/

## Goal

A game is not lost when the host's phone drops out.

## What to do

1. Implement choice A of NETWORKING.md section 9 (the host can always come back and resume; this may already exist from step 52: verify and harden it).
   Then explain choice B (a sealed backup on a friend's phone, with its trust trade-off) to Teto in plain words and ask whether to build it. Build it only on a clear yes, and record the answer in NETWORKING.md.
2. Test with the fake transport: host drops mid-flow (for example during an Anniversaire), game resumes with no card lost or revealed.

## Rules for this session

- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If the rules documents don't answer a question, ask Teto, give your recommended answer and why, and record the answer in the extension's spec under "Decisions".
- Keep game logic in `src/game/` and display in `src/components/`. The UI reads only `viewFor(state, viewer)`.

## Done when

Killing the host's page and reopening it resumes the game for everyone.

## How Teto tests it

In a three-phone game, close the host's page for a minute, then reopen the game link on the host. Everyone should be able to continue.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. If you introduced or changed a convention, update `CLAUDE.md` (keep it short).
3. In `docs/ROADMAP.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test and where to click (use the "How you test it" line of this step in the roadmap).
