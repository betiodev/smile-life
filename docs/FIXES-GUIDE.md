# Smile Life — fixes guide (after the Phase 1 review)

Six small steps that close the gaps found by the checkpoint review of November 2026. The reasons are in [planning/CODE-REVIEW.md](planning/CODE-REVIEW.md); you do not need to read it to follow this guide.

## How to use this guide

It works exactly like the main roadmap ([ROADMAP.md](ROADMAP.md), section "How to use this roadmap"): one step at a time, a new Claude Code session per step, paste the line shown after "Paste:", wait for the pull request, check the green tick, merge, test on your phone. Sessions tick their own box **in this file**, not in the roadmap.

### Where it fits in the main roadmap

```
main roadmap     steps 00–12   done
this guide       F1 → F6       now, in order
main roadmap     Checkpoint A  play the base game with friends
main roadmap     step 13       easy bot and solo mode
visuals guide    V1 → V6       docs/VISUALS-GUIDE.md
main roadmap     step 14, 15, then Phase 3 (Girl Power) and the rest
```

- **Do F1 to F6 now, before Checkpoint A.** Your friends then test the engine in its final shape, a reload no longer loses the game, and if something goes wrong you can send the exact game to a session.
- If you are in a hurry to try the bot: F5 is the only fix step 13 really needs. F2 and F3 are needed before step 16 (Girl Power). F1 must come before F2. F6 goes last because it writes down what the others changed.
- None of these steps changes a rule or how the game looks, except two new buttons (F4).

### Which model

Opus 5.5 for F2, F3 and F5 (engine and session logic). Sonnet 5.5 for F1, F4 and F6.


## Steps

- [ ] **Step F1 — Tests for the base rules that have none**
  - Goal: Write down, as tests, the base rules that today are only protected by the reference games, before the next step moves their code.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/fixes/F01-base-rule-tests.md and follow it.`
  - Done when: Each rule listed in the prompt has at least one test in `tests/regles.test.mjs`; no file in `src/` changed; `npm test` passes.
  - How you test it: Nothing to test on your phone: the game is unchanged. Read the session's summary: if it says a test "disagrees with the game", that is a rules question for you; answer it before merging.
  - Prompt: [docs/prompts/fixes/F01-base-rule-tests.md](prompts/fixes/F01-base-rule-tests.md)

- [ ] **Your two rules answers**
  - Who: you, no Claude session
  - What: The review found two places where the game may differ from the physical game. (1) With 2 players, may you take the top card of the discard pile? The memo on the official mat says "dès 3 joueurs". The game allows it at 2. (2) Attentat: does it remove the children of every player, or only of the attacker and the target? The game does the second.
  - How: Check the leaflet and the Attentat card. If the game is right, tick this box and move on. If the game is wrong, open a new Claude Code session (Opus 5.5) and paste: `Read CLAUDE.md. A base rule is wrong: <say which and what the card says>. Fix it, add a test in tests/regles.test.mjs, add the rule to the "Verified rules" list in CLAUDE.md, re-record the golden games and say so in the commit message.` Then tick this box (pencil icon on github.com, as explained in the roadmap).

- [ ] **Step F2 — Every base card goes through the card registry**
  - Goal: Malus, distinctions and "what a card does when played" work the same way for every kind of card, so an extension card never needs a line added to the base game's code.
  - Where: New Claude Code session · Model: Opus 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/fixes/F02-cards-on-the-registry.md and follow it.`
  - Done when: No `switch` on a card key is left in `src/game/effects.js` or in the malus rules; the test extension has a malus, an acquisition with an effect and a distinction, all tested; `tests/golden.json` unchanged.
  - How you test it: On your phone, play one full 2-player game and use as many malus as you can (Accident, Licenciement, Impôt, Divorce). Each must behave and read exactly as before.
  - Prompt: [docs/prompts/fixes/F02-cards-on-the-registry.md](prompts/fixes/F02-cards-on-the-registry.md)

- [ ] **Step F3 — New zones for extensions, a view that hides by default, and no dead end**
  - Goal: An extension can add a kind of card and a place on the board in one line; nothing an extension stores can reach another player's screen unless it says so; a player who can do nothing passes instead of freezing the game.
  - Where: New Claude Code session · Model: Opus 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/fixes/F03-zones-view-pass.md and follow it.`
  - Done when: The test extension adds its own zone through `registerExtension`; a made-up secret field never appears in a view (tested); a turn with nothing legal offers "pass" (tested); `tests/golden.json` unchanged.
  - How you test it: The session will ask you one question (what happens to a player who cannot do anything). Then play one full game on your phone: nothing should look different.
  - Prompt: [docs/prompts/fixes/F03-zones-view-pass.md](prompts/fixes/F03-zones-view-pass.md)

- [ ] **Step F4 — A game that survives a reload, and a bug report you can copy**
  - Goal: Reloading the page or closing it by mistake no longer loses the game; a button copies everything needed to replay a game exactly; nothing is published without passing the tests.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/fixes/F04-save-resume-report.md and follow it.`
  - Done when: A game reloaded mid-turn continues with the same hands and the same deck; `node tests/replay.mjs <file>` replays a copied report to the same final state; the deploy workflow runs `npm test`.
  - How you test it: Start a 2-player game, play three turns, reload the page: the first screen offers "Reprendre la partie". Tap it and check your hand is the same. Then open the menu, tap "Copier le rapport de bug" and paste it into your Notes app: you should see a block of text starting with `{`.
  - Prompt: [docs/prompts/fixes/F04-save-resume-report.md](prompts/fixes/F04-save-resume-report.md)

- [ ] **Step F5 — Hand-over and animations that work for any player's action**
  - Goal: The "pass the phone" screen works for any choice that needs another player's own hand, and animations show the right player being hit even when the action came from a bot or another phone.
  - Where: New Claude Code session · Model: Opus 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/fixes/F05-handover-last-action.md and follow it.`
  - Done when: The hot-seat no longer names the Chercheur's flow; the view carries a safe summary of the last action (tested: it never names a hidden card); the turn buttons are disabled while the "Annuler" toast is counting.
  - How you test it: 3-player game. (1) If you can, give a player the Chercheur and fire them: the phone must be passed to them, as before. (2) Play a malus on a player: their area shakes. (3) Play Arc-en-ciel, swipe a card and tap "Terminer mon tour" during the 3 seconds: the button must not react.
  - Prompt: [docs/prompts/fixes/F05-handover-last-action.md](prompts/fixes/F05-handover-last-action.md)

- [ ] **Step F6 — Clean-up, and documents that match the code**
  - Goal: Remove dead and duplicate code, and bring `CLAUDE.md`, `ARCHITECTURE.md`, the main roadmap and six later prompts in line with what the review found and what F1–F5 changed.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Inputs to attach: none
  - Paste: `Read docs/prompts/fixes/F06-cleanup-docs.md and follow it.`
  - Done when: `PlayerBoard.jsx` is gone; no second names for the same function in `rules.js`; `CLAUDE.md` points to this guide and to the visuals guide; the roadmap says where the two guides fit; prompts 13, 14, 15, 17, 45 and 51 end with a "Notes from the checkpoint review" section; `tests/golden.json` unchanged.
  - How you test it: Open your game link and play a few turns: nothing changed. On github.com, open `docs/ROADMAP.md` and check that Phase 2 now starts with two lines pointing to the fixes guide and the visuals guide.
  - Prompt: [docs/prompts/fixes/F06-cleanup-docs.md](prompts/fixes/F06-cleanup-docs.md)

When F6 is ticked, go back to the main roadmap: **Checkpoint A**.
