# Checkpoint code review — end of Phase 1

Written 2026-11-16 by Claude Fable, on the code of `main` after roadmap step 12 (commit `06f72a3`). No game code, test or asset was changed by this review. Fixes are in [`docs/FIXES-GUIDE.md`](../FIXES-GUIDE.md); the visual rework is in [`docs/VISUALS-GUIDE.md`](../VISUALS-GUIDE.md).

## Verdict

**The project is healthy. Phase 1 was built the way it was designed, and it is a good foundation. Do six small fix steps before going on.**

- All tests pass: 723 checks, 70 complete random games with integrity checks after every action, 50 reference games replayed identically, and a leak scan over about 20,000 views. The build works.
- I found **no rules bug in the base game** and no way for a player's screen to receive another hand or the deck order.
- Nothing has to be rewritten for network play or for computer players.
- The one real weakness: step 12 was ticked as "every mechanism the extensions need exists and is tested", but four parts of the engine still only know the base game's cards. The very first Girl Power malus would not be playable. This is a few days of work, not a redesign, and it is much cheaper to fix now than in the middle of an extension (fixes F2 and F3).
- Two things will hurt you personally before then: a page reload loses the game in progress, and there is no way to send me (or any session) the exact game where a bug happened. Fix F4 gives you both.

Nothing is rated critical. "Important" means: fix before the step named in the last column. "Minor" means: cheap to fix, or only worth knowing.

### How I checked

Read every file in `src/game/`, `src/session/`, `src/data/`, the tests' structure, and the screens. Ran `npm test` and `npm run build`. Confirmed eight suspicions with a throwaway script kept outside the repository (a fake extension with a malus, an acquisition, a flirt, a distinction, a new card type and a "no draw" rule). Not checked: I did not play the game by hand on a phone, and I compared rules against `CLAUDE.md` and the brief's appendix, not against the physical cards.

## Two rules questions for you

These are not in the list of verified rules, so I am asking instead of deciding. If the game is right as it is, nothing to do.

1. **Taking the top discard in a 2-player game.** The memo printed on the official base mat (your photo) says "dès 3 joueurs : possibilité de prendre la dernière carte de la défausse (sauf la vôtre)". The game allows it with 2 players too (`canTakeDiscardTop`, `src/game/rules.js:393`). Is that your choice, or should it be refused at 2 players?
2. **Attentat.** The game removes the children of the attacker and of the targeted player only (`src/game/effects.js:68`). Please check the physical card: is it those two players, or every player's children? With 2 players it makes no difference.

How to answer is step "Your two rules answers" in the fixes guide.

## A. Did Phase 1 follow the plan?

Yes, closely. Driver, seeded randomness, definitions with ids and tags, array zones behind selectors, the meta table, primitives and events, the flow stack, queries with one precedence function, money traits, the scoring pipeline, the centre, auto-play, sight and `canSee` are all there and match `ARCHITECTURE.md`, including its "As built" notes. The roadmap checkboxes match the code (steps 00–12, P4–P6, 20, 25, 31, 36, 42 ticked; Checkpoint A correctly open).

| # | Severity | Where | What differs from the plan | Why it matters | Handled by |
|---|---|---|---|---|---|
| A1 | important | `src/game/effects.js:16-79`, `src/game/rules.js:337-366` | Base **malus** are still a `switch` on the card key, in both the "may I target" rule and the effect. An unknown malus answers "Malus inconnu" as a *hard* refusal, which no card can lift, and has no effect code path. Jobs and specials moved to the behaviour registry; malus did not. | Girl Power has 11 malus, Trash 10. A session would add `case` lines to the base switch: exactly the per-card hacks the design forbids. | F2 |
| A2 | important | `src/game/effects.js:120,185`, `src/game/flows/purchase.js:57` | `onPlace` (what a card does when its owner plays it) runs only for métiers and cartes spéciales. A flirt, child, acquisition, study, marriage or distinction with an effect is placed and nothing happens. | Extension acquisitions (Dragon), children with small powers, flirts with effects. | F2 |
| A3 | important | `src/game/rules.js:249-261` | Any distinction that is not the Légion d'honneur is treated as the Grand Prix. Any card type the base game does not know answers "Carte inconnue"; only `special` consults the behaviour's `canPlay`. | New distinctions and new types (`money`, `party`, `character`…) cannot be placed. | F2 |
| A4 | important | `src/game/scoring.js:14-24` | The score sums a fixed list of nine zones. Cartes spéciales and malus are never counted (they score 0 in the base game, so nothing is wrong today), and a new zone would be ignored. | Extension cards with smiles in those zones; negative smiles. | F2 |
| A5 | important | `src/game/primitives.js:27-32`, `src/game/reducer.js:16-38`, `src/game/state.js:132-136` | The table "card type → board zone", the list of zones a player has, and `boardCards` are fixed lists in three files. `registerExtension` cannot add a type or a zone. | Politique (`party`), Fantastique (`character`), money that is not a salary. Each would need edits scattered over the engine. | F3 |
| A6 | minor | `src/game/events.js:58-79` | Events are handled at once. The design's rule "triggers queue, then stack by priority (monsters first)" and the "response step" for cards that answer another player's action are not built. | Only Apocalypse and a few Fantastique/Trash cards need them. Building them without a real card would be guessing. | Note added by F6; build in step 45 |
| A7 | minor | `src/game/reducer.js:84-96` | The reducer does not look the action up in `legalActions`; each flow validates in `apply` and lists in `legal` separately. The simulator proves both agree after every action. | Two places to keep in sync. The existing rule in `CLAUDE.md` ("update its flow's legal too") plus the simulator cover it. | No action needed |
| A8 | minor | `src/session/driver.js` | Saving the game after every action (ARCHITECTURE §8.2) is planned for step 52. Until then a reload loses the game. | See C6. | F4 |
| A9 | minor | `tests/` | The `scenario()` test helper of ARCHITECTURE §11 does not exist; tests build situations with the `set…` helpers. | Fine for the base game. Worth having before 400 extension cards are tested. | Note added by F6 for step 17 |
| A10 | minor | `src/game/turn.js` and `src/game/flows/turn.js` | Two files named `turn.js` (who may act / the turn flow); the entry file is `reducer.js`, not `engine.js` as in ARCHITECTURE §10. | A fresh session opens the wrong one. | F6 |

## B. Is the foundation ready for Phase 2 and later?

**Global placement order:** ready. Every placed card gets a unique `seq`, the invariant test checks it, and `resolve()` is the only place precedence is decided.

**Rule and effect hooks:** ready for jobs, specials, global cards, bonus rules, prices, money, hand size, turn order. Not ready for the four gaps A1–A5.

**Network:** ready. The state is plain JSON (tested by replaying a JSON copy after every action), actions are deterministic from the seed, only the driver holds the full state, and `by` is stamped by the driver.

**Computer players:** ready. `legalActions` gives the same list on a player's view as on the full state (tested after every action), every wait has a fallback, and the engine is fast enough: about 0.2 ms per action including choosing it, so thousands of simulated actions per second without any optimisation.

| # | Severity | Where | What is wrong | Why it matters | Handled by |
|---|---|---|---|---|---|
| B1 | important | `src/game/view.js:102-103,113-114` | The view is built by copying **everything except** a list of secret fields. Any new field an extension adds to the game or to a player is sent to everyone by default. Checked: a made-up `secretVotes` field and a made-up player field both reach another player's view. The leak scan only looks for hidden *cards*. | Today nothing leaks. But one forgotten line in an extension (a secret vote, a hidden choice) would leak with all tests green. It must be "nothing is sent unless listed" before network play and bots. | F3 |
| B2 | important | `src/game/flows/turn.js:194-218` | If a player reaches the play step with nothing legal to do, the game is stuck: there is no "pass". Checked with a "no draw this turn" rule and an empty hand. Impossible in the base game. | Trash (no draw, cards stuck in hand), Apocalypse (hand of 1). The simulator would catch it, but only once those cards exist. | F3 |
| B3 | important | `src/game/state.js:44`, `src/game/primitives.js:381-398`, `src/game/rules.js:83-87`, `src/game/reducer.js:36` | Zones can hold two métiers, but the logic assumes one: `jobOf` is "the first job", `loseJob` always removes it, salary levels come from it, `PLAY_MALUS` cannot name which job, and the Architecte's "free house used" flag is per player, not per card. | Girl Power allows two métiers (Proviseure, Démontage de cliché). Which job a Licenciement hits is a ruling, so it cannot be fixed blind. | Note added by F6 for step 17 |
| B4 | important | `src/session/hotseat.js:36-40` | "Who must hold the phone" knows one case by name: the Chercheur's discard. Any other choice made by a player who is not the current one is shown on the current player's screen. | Fine for Anniversaire and Chef troc (public choices). Wrong for extension choices that need the chooser's own hand. Hot-seat is how you will test every extension with friends until Phase 10. | F5 |
| B5 | important | `src/components/GameScreen.jsx:85-86,141` | The "who was hit" animation reads the last action *this screen sent*. When a bot or a remote player plays a malus, the screen shakes the wrong board or none. | Appears the day step 13 (bots) is merged. | F5 |
| B6 | minor | `src/session/driver.js:35-40` | `createDriver` does not pass `extensions` to `START_GAME`. | Needed by step 15's extension switches. | F4 |
| B7 | minor | `src/session/driver.js:100-104` | Deadlines are sent as times on the host's clock. | Another phone's clock differs. Send "milliseconds left" over the network. | Note added by F6 for step 51 |
| B8 | minor | `src/game/cards/index.js`, `src/data/index.js` | Cards, behaviours and flows are registered in the program, not in the state. | Host and clients must run the same version of the game. Step 51 needs a version check when joining. | Note added by F6 for step 51 |
| B9 | minor | `src/game/primitives.js:130-136` | An auto-played card of type `global` that stays in a hand (the Chance exception) can only be discarded. | Depends on each extension's ruling; the spec steps already ask. | No action needed |

## C. Correctness and tests

`npm test` on 2026-11-16: 35 card checks, 285 rule checks, 35 precedence checks, 48 flow checks, 70 simulated games (28,438 actions), 63 view checks, 15 randomness checks, 18 primitive checks, 40 driver checks, 114 test-extension checks, 50 reference games. All pass.

I compared every verified rule in `CLAUDE.md` and the brief's appendix with the code. All are implemented as written, and all have a test.

| # | Severity | Where | What is wrong | Why it matters | Handled by |
|---|---|---|---|---|---|
| C1 | important | `tests/regles.test.mjs` | Base rules with **no direct test**: Tsunami; end of game (empty deck, hands discarded, an unresolved Casino stake returned); Casino won and lost; Divorce during an adultery (children lost); voluntary divorce; the Policier removing Bandit and Gourou; Astronaute; turns skipped by Accident, Maladie, Burn-out and Prison; Impôt taking the last unspent salary; Redoublement; Attentat's effect; the Grand Prof promotion. They are only frozen by the reference games, which say "nothing changed", not "this is the rule". | F2 moves the malus code. Tests that state the rule must exist first. | F1 |
| C2 | minor | `src/components/MyView.jsx:245-247` | During an Arc-en-ciel, "Terminer mon tour" stays active while the 3-second "Annuler" toast of a card is still counting. Tapping it ends the turn and the card is silently not played. | Rare, but a lost play. | F5 |
| C3 | minor | `src/session/driver.js:86-97` | If the engine throws while the driver applies a timed-out default, the timers are never rescheduled. | A bug in one extension card would freeze every countdown. | F4 |
| C4 | minor | `src/components/usePlayIntent.js` | Troc, Vengeance and purchases send two actions in a row (play, then choose). If the second were refused, the engine's own dialog (`Modals.jsx`) takes over, so nothing is lost. | No bug. Worth knowing for network play: both actions must arrive in order. | No action needed |
| C5 | — | engine | Looked for and not found: state changed outside the reducer's copy; a card in two places; a hand left undiscarded at the end; scoring errors; a deck running out mid-effect (Chance with fewer than 3 cards, Médium near the end, a refill that empties the deck). | — | No action needed |
| C6 | important | `src/session/` | A reload, a closed tab or a phone restart loses the game. The actions are recorded (`history`) but cannot be exported, so a bug seen with friends cannot be replayed. | You are about to play Checkpoint A and six extension checkpoints on one phone. | F4 |

## D. Code health

The engine is in good shape: small files, one job each, comments that say why. Only what will slow the next phases:

| # | Severity | Where | What | Handled by |
|---|---|---|---|---|
| D1 | minor | `src/components/PlayerBoard.jsx` | Dead file: nothing imports it. A session asked to "change the board" may edit it and see no effect. | F6 |
| D2 | minor | `src/game/rules.js:103-118,457`, `src/game/state.js:64-67` | Seven second names for the same functions (`paidSalaries`, `spentSalaries`, `unusedHeritage`, `paidCards`, `spentCards`, `purchaseCost`, and two salary-only selectors next to their general versions). | F6 |
| D3 | minor | `src/game/queries.js:63-67` | Comments say `drawMode`, `skipLength` and `nextPlayer` are "plus tard"; they are asked since step 12. | F6 |
| D4 | important | `src/components/usePlayIntent.js:59-75` | The screen decides which cards need a target or a choice by naming base cards (Troc, Vengeance, Anniversaire) and even one card's grammar (Barmaid). Extension cards with a target would each need new screen code. | Roadmap step 14 already asks for targets to come from `legalActions`. F6 adds a note so it is not missed. |
| D5 | minor | `src/components/GameScreen.jsx` (340 lines) | One file holds the animation engine, the screen switch and the glue for every choice. Visual sessions will all touch it. | V2 splits it |
| D6 | minor | `CLAUDE.md` | Accurate. Checked line by line against the code. It says nothing about how the screens are organised, which the visual rework and steps 14, 15, 19… need. | F6, then V2 |

## E. Safety, privacy, cost

- **What is published:** only `dist/`, built from `src/` and `public/`. `public/` holds `cards/` and `frames/` and nothing else. The build removes the PNG sources and publishes only the WebP files. `docs/` cannot reach the site. Confirmed by listing `dist/` after a build: `index.html`, one JS file, one CSS file, 92 illustrations, 12 frames.
- **Cost:** nothing in the repository can create a charge. No key, no paid service. The only outside request is Google Fonts (free; it does mean Google sees a visit each time the game loads).
- **Phones:** first load is about 110 kB of code plus fonts; illustrations load only when shown. That is light.

| # | Severity | Where | What | Handled by |
|---|---|---|---|---|
| E1 | important | `.github/workflows/deploy.yml` | The tests run on pull requests only. A push straight to `main` is published without tests. It already happened once by accident (step 04). | F4 |
| E2 | minor | `scripts/card-images.mjs:23-26` | Every illustration is published at one size, 640 px wide, and the same file is drawn on cards that are 45–70 px wide on a board. Each one costs about 1.6 MB of phone memory once shown. With the new layout showing more cards at once, a late game could hold 150–250 MB of pictures. Unmeasured, but it is the most likely cause of a slow or reloading page on an older iPhone. | V6 |
| E3 | minor | `public/cards/*.png` | The repository is 124 MB with 59 PNG sources in it. Roughly 450 more illustrations at 1–3 MB each would take it near GitHub's 1 GB recommendation. | No action now. When it passes about 500 MB, keep the PNG originals on your computer and commit only the WebP (five categories already work that way). |

## F. Readiness for the visual rework

**Can visual work break the rules? No.** The screens read only the player's view and send actions through the driver; the engine checks every action again. A visual mistake can make a card hard to play, never illegal to play.

**What a visual session can break:** three things that are not rules but live in the screens.
1. The "intent" logic (`usePlayIntent.js`): the Annuler toast, payments, targets.
2. The animations (`flights.jsx`, `GameScreen.jsx`): they find cards on screen through attributes (`data-card-uid`, `data-board`, `data-pile`, `data-zone`, `data-snap`). Remove one and cards stop flying, silently.
3. The hot-seat hand-over.

**How styling is organised today:**
- Tailwind classes written inline in the components, plus hand-written classes in `src/index.css` (487 lines; the card itself is well done there: every measure is a percentage of the card, so a card draws correctly at any width).
- Shared values are **not** in one place: 35 different colour codes typed by hand across the components and the stylesheet (`#FFC93C` 27 times, `#1F2228` 21 times); the card's proportions written in four places; text sizes of 9, 10 and 11 px typed 26 times; card widths in `Card.jsx:18-24`; layout numbers inside components (the played strip is "34 %" in `index.css:36`, the side columns "17vw").
- Board layout is computed in JavaScript (`PlayedStacks.jsx:59-77`): it measures the panel and picks one card width for one or two rows. This is where your "tiny cards in one row with empty space above and below" comes from: with ten stacks the width runs out first, and the two-row option is penalised by the room it reserves for salaries peeking above acquisitions.

**Clean up first (step V2):** put colours, text sizes, spacing and card proportions in one place; split `GameScreen.jsx`; write down the attribute contract of the animations. Then the layout steps change layout only.

The design itself, and what will and will not fit on a phone, is in [`docs/VISUALS-GUIDE.md`](../VISUALS-GUIDE.md).
