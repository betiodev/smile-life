# Step F2 — Every base card goes through the card registry

Model: Opus 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

The engine was rebuilt so that six extensions (about 400 cards) can plug in without touching base-game code: card definitions are data, and what a card does lives in a behaviour registry (`src/game/cards/`). A review (`docs/planning/CODE-REVIEW.md`, findings A1–A4) found four places where the base game still bypasses the registry, so an extension card of that kind cannot work:

1. **Malus.** `canPlayMalus` (`src/game/rules.js`) and `applyMalus` (`src/game/effects.js`) are `switch` statements on the card key. An unknown malus is refused with `HARD('Malus inconnu')`, and a hard refusal cannot be lifted by any modifier.
2. **`onPlace`** runs only for métiers and cartes spéciales (`poseSelf` in `effects.js`; `flows/purchase.js` places the acquisition and never calls it).
3. **Distinctions:** in `canPoseSelf`, anything that is not the Légion d'honneur is treated as the Grand Prix. A card type the base game does not know answers "Carte inconnue"; only `special` asks the behaviour's `canPlay`.
4. **Scoring** (`src/game/scoring.js`) sums a fixed list of nine zones: specials and malus are never asked `cardSmiles`.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/FIXES-GUIDE.md` — find step F2 (step F1 must be ticked; if it is not, stop and tell Teto)
- `docs/planning/ARCHITECTURE.md` §0, §5, §6.1, §6.2, §7
- `src/game/rules.js`, `effects.js`, `cards/base.js`, `cards/index.js`, `queries.js`, `scoring.js`, `flows/purchase.js`, `flows/vengeance.js`, `flows/turn.js`
- `tests/ext/test-ext.mjs` and `tests/ext/test-ext.test.mjs`

## Goal

Malus, distinctions, "what a card does when played" and scoring work through the registry for every kind of card. This is a **pure refactor of the base game**: `tests/golden.json` must pass unchanged.

## What to do

1. **Malus on the registry.** Add two behaviour hooks and document them in the header of `cards/base.js`:
   - `canTarget(state, attacker, card, target)` → `{ ok, reason, hard? }`: the base answer of the `canTarget` question for this malus;
   - `onTarget(s, { card, owner: attacker, target })`: the effect.
   Move the nine base malus (Accident, Maladie, Burn-out, Licenciement, Impôt, Divorce, Redoublement, Prison, Attentat) into `cards/base.js`, keeping every refusal reason, every log line and the **order of primitive calls** word for word (the golden games compare the final state, log included). `canPlayMalus` keeps only what is true for every malus ("On ne joue pas un malus sur soi-même", hard), then asks the behaviour. A malus with no `canTarget` hook answers a normal (not hard) refusal. `applyMalus` calls `onTarget`. The job immunities already declared as modifiers do not change.
2. **`onPlace` for every type.** A card's `onPlace` runs whenever its owner plays it, whatever its type: from hand, as the forced card, through Piston, and after an acquisition is paid for (in `flows/purchase.js`; if `onPlace` opens a flow there, the purchase frame must wait for it with the existing `finishFlow` / `resumeDone` pattern, and the turn must resume exactly once). Keep the existing rule: a stolen or gifted card does not run it. No base card of those types has an `onPlace`, so nothing changes for the base game.
3. **Distinctions and unknown types.** Move the conditions of the Légion d'honneur and of the Grand Prix into `canPlay` hooks on their behaviours (same reasons, same order: the Bandit modifier still speaks first). In `canPoseSelf`, a distinction or any type the base game does not know asks the behaviour's `canPlay`; without one, the answer stays "Carte inconnue".
4. **Scoring covers every board zone.** `computeScores` asks `cardSmiles` for every card on the player's board, including cartes spéciales and received malus. Add the two categories at the end of `CATEGORIES`. In `src/components/GameOverScreen.jsx`, do not show a category that is 0 for every player, so the base game's final screen looks as before.
5. **Prove it with the test extension** (`tests/ext/test-ext.mjs`). Add:
   - a malus with a condition on the target and a visible effect;
   - an acquisition (tag `animal`, so it is free) whose `onPlace` does something visible, and one paid acquisition whose `onPlace` runs after payment;
   - a distinction with its own `canPlay`;
   - a carte spéciale worth 2 smiles.
   Test each in `tests/ext/test-ext.test.mjs`, and check that the Vengeance flow can send the test malus back. Update the counts that the existing test-extension tests rely on. The 30 simulated games with the test extension must still pass with the invariants on.
6. Update the lists in `tests/invariants.mjs` only if you added an action type (you should not need one).

## Rules for this session

- No rule changes. No change to what a player sees. `tests/golden.json` must not be modified; if a golden game differs, your refactor changed behaviour: find it, do not re-record.
- Rules name groups of cards by tag, never by a list of keys; a rule about one single card may use its key (see `CLAUDE.md`).
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If something is unclear, ask Teto.
- Keep game logic in `src/game/` and display in `src/components/`.

## Done when

- No `switch` on a card key remains in `effects.js`, nor in the malus rules of `rules.js`.
- The four new test cards work and are tested.
- `npm test` passes with `tests/golden.json` untouched.

## How Teto tests it

On your phone, play one full 2-player game and use as many malus as you can (Accident, Licenciement, Impôt, Divorce). Each must behave and read exactly as before. Finish the game: the score screen looks as before.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. Update `CLAUDE.md`: the line about `cards/` (new hooks `canTarget`, `onTarget`, `canPlay` for any type, `onPlace` for any type), the line about `effects.js`, the line about scoring, and the description of the test extension. Keep it short.
3. In `docs/FIXES-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what changed, what did not, and exactly what to test (the "How you test it" line of this step in the fixes guide).
