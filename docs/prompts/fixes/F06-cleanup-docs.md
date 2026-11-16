# Step F6 — Clean-up, and documents that match the code

Model: Sonnet 5.5 · Where: a new Claude Code session on the `smile-life` repository

## Context

Smile Life is a private web adaptation of the French card game, built by Teto to play with friends. Teto is not a professional developer and is new to git: anything you say to Teto must be in plain words, step by step, with no jargon. Everything players see is in French, with card names exactly as printed. Docs are in English.

A review of the code (`docs/planning/CODE-REVIEW.md`) was followed by fix steps F1–F5. This last step removes dead and duplicate code and brings the documents in line. Later sessions (weaker models, no memory) rely on `CLAUDE.md`, the roadmap and the prompts being exact.

## Read first

- `CLAUDE.md`
- `docs/ROADMAP.md`
- `docs/FIXES-GUIDE.md` — find step F6 (F1–F5 must be ticked; if one is not, stop and tell Teto)
- `docs/VISUALS-GUIDE.md` — the first two sections only
- `docs/planning/CODE-REVIEW.md` — sections A, B and D
- `docs/planning/ARCHITECTURE.md`

## Goal

No dead file, no second name for the same function, and every document says what the code does today.

## What to do

**Code (no behaviour change)**

1. Delete `src/components/PlayerBoard.jsx` (nothing imports it; check with a search first).
2. In `src/game/rules.js`, remove the second names and use the original everywhere (tests and components included): `paidSalaries`, `spentSalaries`, `unusedHeritage`, `paidCards`, `spentCards`, `purchaseCost`. In `src/game/state.js`, remove `moneyPaidFor` and `spentMoney` if `paidWith` and `spentPaying` now cover every use.
3. In `src/game/queries.js`, fix the comments that say `drawMode`, `skipLength` and `nextPlayer` are "plus tard": the engine asks them.
4. Rename `src/game/turn.js` (who may act, default actions) to `src/game/actors.js`, so that only one file is called `turn.js` (the turn flow, `src/game/flows/turn.js`). Update every import and every mention in the documents.

**`docs/planning/ARCHITECTURE.md`** — add one "As built (checkpoint review, November 2026)" paragraph in each place below. Check each sentence against the code before writing it.

5. §5: the behaviour hooks as they are after F2 (`canTarget`, `onTarget`, `canPlay` for any type, `onPlace` for any type).
6. §3.1 and §8.1: the zone registry, `state.ext` / `player.ext`, and the view that sends only listed fields (F3).
7. §6.2 and §6.3: events are handled at once and never stored; the trigger queue with priorities (rule 4) and the response step for reactions are **not built**. They are to be built with the first card that needs them (expected: Apocalypse, roadmap step 45), with a real card to test against.
8. §6.5: the reducer does not look actions up in `legalActions`; each flow validates in `apply`, and the simulator checks after every action that the two agree.
9. §8.2: saving, resume and the bug report (F4); `ownScreen`, `lastAction` (F5).
10. §10: the real file names (`reducer.js`, `actors.js`, `effects.js`, `events.js`, `extensions.js`, `zones.js` if F3 created it).
11. §11: the `scenario()` test helper is not built yet.

**`CLAUDE.md`**

12. Read it line by line against the code and correct anything F1–F5 left out of date.
13. In "Planning documents", add: `docs/FIXES-GUIDE.md` (fix steps after the Phase 1 review, prompts in `docs/prompts/fixes/`), `docs/VISUALS-GUIDE.md` (the visual rework, prompts in `docs/prompts/visuals/`), `docs/planning/CODE-REVIEW.md` (why).
14. Add a short section "Screens" (five lines at most): the two screens (`MyView.jsx`, `TableView.jsx`) and what `GameScreen.jsx` holds; play intents and the "Annuler" toast (`usePlayIntent.js`); the animations find cards through the attributes `data-card-uid`, `data-board`, `data-pile`, `data-zone` and `data-snap`, which must be kept on anything that replaces a card or a pile on screen; landscape only.

**`docs/ROADMAP.md`** — two additions, nothing else changes, no renumbering.

15. Directly under the heading "## Phase 2 — Tools for building extensions", before its first paragraph, add:

    > **Before step 13:** finish every step of [FIXES-GUIDE.md](FIXES-GUIDE.md).
    > **After step 13 and before step 14:** do the steps of [VISUALS-GUIDE.md](VISUALS-GUIDE.md). Steps 14 and 15 build on the new layout.

16. In "How to use this roadmap", step 5 of "Accepting the change" says "pull down to refresh". Replace it with: "reload the page (if you added the game to your home screen: close it and open it again)".

**Later prompts** — append a section `## Notes from the checkpoint review (November 2026)` at the very end of each file below, with exactly these points. Do not change anything else in those files.

17. `docs/prompts/13-bot-easy-solo.md`:
    - Animations of a bot's action use `lastAction` from the view (`src/session/driver.js`), not the screen's own last action.
    - `unseenCards(view)` (ARCHITECTURE §8.4) does not exist yet: build it here if AI-PLAYER.md needs it.
    - A saved game (`src/session/storage.js`) must restore which seats are bots.
18. `docs/prompts/14-ui-swipe-to-target.md`:
    - Build on the layout of `docs/VISUALS-GUIDE.md`: the drop targets are the compact player panels of "La table"; choosing a specific placed card opens that player's full mat.
    - `usePlayIntent.js` decides which cards need a target or a choice from a list of base card names (`flowFor`). Replace that list by reading `legalActions`: several legal actions for one card that differ by `target` mean "choose a target".
19. `docs/prompts/15-ui-extension-ready.md`:
    - Board zones on screen come from the display table created by the visuals guide (`src/components/zones.js`); a new card type is given a zone there, and an unknown type lands in "Autres".
    - The centre, the discard pile and the out-of-game pile are the three chips at the top of "La table" described in `docs/VISUALS-GUIDE.md`.
20. `docs/prompts/17-gp-engine-a.md`:
    - Zones can hold two métiers, but the logic assumes one: `jobOf` returns the first job; `loseJob` always removes that one; salary levels come from it; `PLAY_MALUS` cannot say which job is hit; the Architecte's "free house used" flag is per player. Ask Teto which job a Licenciement, a démission and the Policier hit when a player has two, record the answers in `girl-power.md`, then generalise.
    - Build the `scenario()` test helper of ARCHITECTURE §11 before writing the card tests.
21. `docs/prompts/45-apo-engine-b.md`:
    - The trigger queue with priorities ("monsters first") and the response step (ARCHITECTURE §6.3) are not built. Build them in this step, with tests, before the monsters.
22. `docs/prompts/51-net-lobby-transport.md`:
    - Deadlines in a view are times on the host's clock: send the milliseconds left instead.
    - Cards, behaviours and flows are registered in the program, not in the state: refuse a client whose game version differs from the host's.
    - Some plays send two actions in a row (play the card, then choose): the transport must keep their order.

## Rules for this session

- No behaviour change. `tests/golden.json` must not be modified.
- Do not rewrite or reorder the roadmap or the existing prompts beyond the additions listed above.
- The verified rules in `CLAUDE.md` are settled. Do not "correct" them.
- Never invent a ruling. If something is unclear, ask Teto.

## Done when

Points 1–22 are done; a search for the removed names finds nothing in `src/` and `tests/`; `npm test` and `npm run build` pass.

## How Teto tests it

Open your game link and play a few turns: nothing changed. On github.com, open `docs/ROADMAP.md` and check that Phase 2 now starts with two lines pointing to the fixes guide and the visuals guide.

## Finish

1. Run `npm test`. Everything must pass. If something fails and you can't fix it, say so plainly; do not weaken or delete a test to get a pass.
2. `CLAUDE.md` is part of this step (points 12–14).
3. In `docs/FIXES-GUIDE.md`, tick this step's checkbox. If you could not finish, leave it unticked and add one line under the step: `Partly done: <what is left>`.
4. Commit with a clear French message, push your branch and open a pull request.
5. Give Teto a plain-language summary: what was removed, which documents changed, and that the next thing to do is Checkpoint A in the main roadmap.
