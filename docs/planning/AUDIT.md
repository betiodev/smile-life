# Audit — where the project stands (2026-11-11)

Written by Claude Fable at the start of the planning session. Scope: the engine (`src/data`, `src/game`), the tests, the deploy setup and all six extension documents were read in full. The UI components were only skimmed (imports, wiring in `App.jsx`, card art mapping), not reviewed line by line.

## 1. Is it safe to write rules into `docs/`? Yes.

The Pages workflow (`.github/workflows/deploy.yml`) builds with Vite and uploads **only the `dist/` folder**. `dist/` contains the compiled app plus a copy of `public/`. Nothing from `docs/` or the repo root is published.

The one rule to keep: **never put rules text or leaflet scans in `public/`**, because everything there is published as-is.

I could not check the Pages setting on github.com itself (no GitHub command-line tool on this machine). The workflow is what decides, and it is correct. To double-check: repo → Settings → Pages → "Source" should say **GitHub Actions**, not "Deploy from a branch".

## 2. Where the brief and the repo disagree

| Brief says | Repo says |
|---|---|
| Girl Power table is Excel (`.xlsx`) | It is an Apple Numbers file (`girl-power-card-data.numbers`). I cannot read its columns reliably. **Blocks P3** until exported to `.xlsx` or `.csv`. |
| Per-player view needed "before any network play" | Already built and tested (`src/game/view.js`, `tests/view.test.mjs`). |
| "tests (if any)" | 167 rule checks, 40 simulated full games with a card-count check, 35 view checks plus a leak scan over 108,000 views. All pass today. |
| Rivière as a standalone mode is removed | Still offered: checkbox in `SetupScreen.jsx`, `riverEnabled` in the reducer, used in half the simulated games. |
| Up to 4 players | Setup screen caps at 4; `CLAUDE.md`, `README.md` and the simulations say 2–5. |
| Folder `docs/extensions/luxe/` implied | Folder is `vie-de-luxe/`, file is `vie-de-luxe-rules-rules.md` (doubled suffix). Other transcripts are `<name>-rules.md`. |
| — | `girl-power.md` and the Politique transcript point to paths that don't exist (`girl-power-card-data.xlsx`, `extensions/girl-power.md`). |

## 3. Current architecture

**Stack.** React 18, Tailwind 4, Vite. No backend, no storage, no network code. Plain Node scripts as tests (no test framework).

**Card data (`src/data/cards.js`, 176 lines).** Small tables per category plus `buildDeck()`, which emits 200 card objects. A card is identified by `type` (study, job, salary, flirt, marriage, adultery, child, malus, special, acquisition, distinction) and, for cards with behaviour, a `key`. Cards carry display text and a few numbers (smiles, levels, cost, studyReq). They carry **no behaviour, no extension tag and no child gender**. Uids are `c1…c200` in build order, so a uid reveals the card type (the view layer already hides them).

**Rules (`src/game/rules.js`, 396 lines).** Pure validation functions returning `{ ok, reason }` with French reasons: `canPoseSelf`, `canPlayMalus`, `canPlaySpecial`, payment validation, discard/river takes. Every rule is a `switch` on card type or key, and job perks are `hasJob(p, 'garagiste')`-style checks spread across the file.

**State machine (`src/game/reducer.js`, 975 lines).** One reducer, about 30 action types. Effects live in three more switches (`applyMalus`, `poseSelf`, `applySpecial`). Notable shape:
- A player is a set of fixed slots: one `job`, one `marriage`, one `adultery`, lists for studies, salaries, flirts, children, acquisitions, distinctions, used specials, received malus.
- Zones: deck, discard (each entry remembers who discarded), `removed` (Attentat only), river.
- Turn: `phase` draw → play, `playsRemaining`, `cardPlayed`, a `forced` card that must be played, and **one** `pending` slot for any choice in progress.
- `screen` (setup / transition / game / gameover) is part of game state, including the hot-seat "pass the phone" step.
- State is copied by a hand-written `cloneState` that lists every field.
- Randomness is `Math.random()` called inside the reducer.

**Who may act (`src/game/turn.js`).** Every action carries `by`; the reducer rejects actions from a player who isn't expected to act. Three off-turn cases exist (Chef troc, Anniversaire, Chercheur discard).

**Per-player view (`src/game/view.js`).** `viewFor(state, viewer)` returns plain JSON with other hands replaced by placeholders, no deck, and per-pending secrecy rules. The UI reads only views; rule helpers are written to work on a view as well as on the full state.

**Scoring (`src/game/scoring.js`, 30 lines).** Sum of smiles per category, with the Licorne bonus hard-coded.

**UI (`src/components/`, about 3,300 lines).** Imports `rules.js` and `scoring.js` directly for hints and totals. Timers for off-turn choices (30 s) run in a UI hook. Card frames and tints are chosen by a fixed category switch in `cardArt.js` (12 frames).

**Deploy.** Push to `main` → build → Pages. The page has `noindex`.

## 4. What is already in good shape

- Logic is cleanly separated from display, and the engine runs headless in Node.
- The action/`by`/`viewFor` design is already the right shape for a host device running the engine and phones receiving views.
- The random-game simulator is a ready-made base for bot-vs-bot testing.
- The rule tests are a real regression net for the base game.

## 5. What has to change

### For extensions (the big one)

The engine knows each card by name inside five switch statements. Six extensions add roughly 355 cards, and many of them change rules for everyone rather than doing one thing. Adding them as more `case` lines would not hold. Concretely, the current engine has no way to express:

1. **Cards that play themselves when drawn**, including from the starting hand and hand refills: Apocalypse crises, events and monsters; Politique réformes, taxes and events; Fantastique éphémérides; Trash's Mine antipersonnel. Drawing is currently a bare `deck.pop()` in six places.
2. **A shared table zone with lasting effects**: réformes stacked by domain, the current éphéméride, crises on timers, the tax pot, the election card.
3. **More than one thing waiting at once.** There is one `pending` slot. Extensions nest (a monster arriving during a crisis during someone's purchase) and run whole sub-rounds where each player acts in turn (Armageddon, Purge, Inondation, Roulette russe, the co-op Invasion, monster fights, votes).
4. **Per-card state on placed cards**: used/flipped, protected (Bunker, Cape, Super bouclier, Partouze flirts), upside-down "fraudulent" acquisitions, cards stacked on another card (Paradis fiscal, Sugar daddy, Première classe, Dette), and a global placement order for the "most recent wins" rule. Today only salaries and distinctions have any per-card state.
5. **More than one job or marriage**, and attachments: two métiers (Girl Power), Proviseure + Prof, Star on a job, Polygamie, political party.
6. **Money that isn't a salary**: argent sale, bijoux, primes de naissance, allocations, lingot, amulette. Each differs on taxable / casino / gift / tax-payment. Prices also get modifiers (free for a job, half price, −1, free for everyone, exact change only).
7. **A salary level computed from several stacked effects** (Grand prix, Égalité de salaire, Promotion canapé, réforme ±1, Star, Infirmière, Mariage d'argent, Minus/Maxus).
8. **Turn-flow changes**: reversed direction of play, play-then-draw, no draw, draw two keep one, "rejouez", actions instead of drawing, and reactions on another player's turn (Menace nucléaire, Chasseur, alliances).
9. **Hand rules**: cards that can't leave the hand (Virus, Sextape), hand sizes of 1, 4, 6 or ±1, "redraw to the size you had".
10. **A browsable out-of-game zone** that cards can be recovered from (Vautour, Exhumation, Potion de résurrection).
11. **Scoring modifiers**: doubles, conditional bonuses, penalties, end-of-game comparisons between players.
12. **Other ways to end** (failed Invasion, optional restart) and **setup steps** (dealing Fantastique characters, choosing extensions).
13. **New secrecy cases**: face-up deck, shown draws, looking at every hand, and Purge, where *placed* cards become hidden. `view.js` currently assumes every board is public.

Four cards rely on things a phone can't do as written and need a digital stand-in that you approve: Bombardement (dropping a card), Grève (waiting real minutes), Référendum (show of hands), and the "negotiate" clauses (Dictateur, Ange, alliances).

### For networking

- Move the "pass the phone" screens and the 30-second timers out of the UI/game state so the host device owns them.
- Make randomness seedable and held in state, so games can be replayed from a log for debugging.
- The host must stamp `by` from the connection, never trust the sender.
- Nothing else in the engine blocks the host-authoritative plan.

### For bots

- There is no single "list every legal action" function; the simulator rebuilds that list by hand. Bots, the simulator and the UI should share one.
- Bots must decide from a view only. The rule helpers mostly allow this already.

## 6. Risks I want you to know about now

1. **Game length.** The game ends when the deck is empty. Base is 200 cards; all six extensions make about 545. A four-player game would last between two and a half and three times longer than today. The Trash leaflet itself suggests playing with "a random part" of the cards.
2. **Apocalypse is far heavier than the others.** Timed crises, monsters that travel around the table, a co-op mini-game and face-down boards. I'd budget it at about three ordinary extensions and build it last.
3. **Card data is missing for about 300 cards.** Smiles, prices, levels, weapon power, monster damage, crisis durations, réforme texts and the names of whole groups (Politique's 10 réformes, 6 partis and 12 métiers; Trash and Luxe flirts) are only on the physical cards. Implementation of each extension waits on your fill-in table.
4. **The leaflets leave about 200 open rule questions**, already listed at the end of each transcript. They need your rulings before each extension is built.
5. **Two base-rule points the leaflets contradict.** I have changed nothing; these go into the rules questions:
   - Taking the top discard: the Fantastique leaflet recalls it as "from three players". The game allows it with two.
   - Attentat: the game removes the children from play (and Trash's Exhumation agrees), but Trash's Fin précoce line says Attentat sends them to the discard.
