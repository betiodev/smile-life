# Step F1 — Tests for the base rules that have none

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

A review of the code after the engine migration (`docs/planning/CODE-REVIEW.md`, finding C1) found base rules with no direct test. They are only protected by the reference games (`tests/golden.json`), which say "nothing changed" but not "this is the rule". The next fix step moves the code of the malus, so the rules must be written as tests first.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md` — only the section "How to use this roadmap"
- `docs/FIXES-GUIDE.md` — find step F1
- `tests/regles.test.mjs` (how tests are written and set up), `src/game/effects.js`, `src/game/cards/base.js`, `src/game/flows/turn.js` (functions `endTurn` and `gameOver`)

## Goal

Each rule below has at least one test that states it. **This step changes tests only.**

## What to do

Add test cases to `tests/regles.test.mjs`, in the style already used there (French check names, set-up through the `set…` helpers of `primitives.js`, `setFlow`, `setStep`, `setPlays`; zones read through the selectors of `src/game/state.js`). The expected behaviour below is what the game does today.

1. **Accident, Maladie, Burn-out:** the target will skip 1 turn (`skipTurns`), the malus card is placed in the target's malus zone. Burn-out needs the target to have a métier.
2. **Skipped turns:** a player with `skipTurns` 1 is passed over once, then plays normally. With 3 players, the turn goes to the player after them.
3. **Prison:** playable only on a Bandit; the target skips 3 turns, the Bandit goes to the discard pile, and the Prison card itself goes to the discard pile (it is not kept by the target).
4. **Impôt sur le revenu:** the most recently placed *unspent* salary of the target goes to the discard pile in the target's name; salaries already spent on an acquisition are untouched; refused when the target has no unspent salary.
5. **Redoublement:** the last study card placed is discarded; refused on a player who has a métier or no study card.
6. **Divorce (malus), no adultery:** the marriage is discarded, the children and flirts stay.
7. **Divorce (malus) during an adultery:** the marriage, the Adultère card and every child are discarded; the flirts stay.
8. **Voluntary divorce:** only instead of drawing; the marriage (and the Adultère card if any) is discarded, children and flirts stay, and the turn passes to the next player.
9. **Attentat:** the children of the attacker and of the target leave the game (zone `outOfGame`, with cause and author); the card itself leaves the game; afterwards the attacker cannot place the Légion d'honneur. (Teto is checking with the physical card whether every player's children should go. Test what the game does today and add the comment `// à confirmer avec Teto : enfants de tous les joueurs ?` above the test.)
10. **Policier:** when a Policier is placed, every *other* player's Bandit or Gourou is discarded; the same when the Policier is obtained with a Piston.
11. **Astronaute:** when placed, the player picks a playable card from the discard pile; it becomes the card that must be played first, in addition to the play of the turn, and may be discarded. With nothing playable in the discard pile, the advantage is lost and the turn simply ends.
12. **Grand Prof:** playable only on a Prof; the Prof card is discarded, the Grand Prof takes its place, placed salaries stay.
13. **Casino:** opening it; a second bet of the **same** level gives both salaries to the second bettor; a **different** level gives both to the first bettor; the cards land, unspent, in the winner's money zone; the player who has a bet waiting cannot bet against themself.
14. **Tsunami:** all hands are pooled and dealt again; no card is lost or duplicated (count them); with no Chercheur in play, every player ends with 5 cards.
15. **End of the game:** when the deck is empty at the end of a turn, the status becomes `over`, every hand goes to the discard pile, the flow stack is empty, and an unresolved Casino bet goes back to the bettor's money zone (it scores).
16. **Almost empty deck:** Chance with 2 cards left offers 2 cards; Chance is refused with an empty deck.

If a test written from this list **fails**, do not change the test to match and do not change the engine. Stop, and tell Teto in plain words: what the list says, what the game does, and ask which is right. Leave that test out of the commit until Teto answers.

## Rules for this session

- Do not change any file in `src/`. Do not change `tests/golden.json`.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If something is unclear, ask Teto.

## Done when

Each of the 16 points has at least one test; `npm test` passes; `git diff --stat` shows only files under `tests/` and `docs/FIXES-GUIDE.md`.

## How Teto tests it

Nothing to test on the phone: the game is unchanged.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. `CLAUDE.md`: no change expected (the number of rule checks is not written there).
3. In `docs/FIXES-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: how many tests were added, and any rule where the game and the list disagree.
