# Smile Life — roadmap from today to online play

This is the list of steps that takes the game from "base game on one phone" to "all six extensions, computer players, and friends playing online". Do the steps in order, one at a time. Each step is small enough for one Claude Code session and leaves the game working.

Written in November 2026. Background: [planning/AUDIT.md](planning/AUDIT.md) (where the code stood) and [planning/ARCHITECTURE.md](planning/ARCHITECTURE.md) (where it is going).

## How to use this roadmap

### Doing one step

1. Find the first step whose box is not ticked.
2. If it says **Who: you**, it is something only you can do (fill a table, make pictures, play with friends). Do it, then tick the box (see "Ticking a box yourself" below).
3. Otherwise, open Claude Code on the web, start a **new session** on the `smile-life` repository, choose the **model** the step names, and paste the line shown after "Paste:". It looks like this:

   `Read docs/prompts/07-primitives-events.md and follow it.`

   That is the whole message. The prompt file tells the session everything else.
4. Answer the session's questions if it asks any. Sessions for the extensions will ask you rules questions; your answers are written into the extension's spec so they are never asked twice.
5. When the session says it is finished, it will have opened a **pull request**: a proposed change waiting for your OK. Nothing has changed in the real game yet.

### Accepting the change (merging the pull request)

1. Open the pull request (the session gives you a link, or go to github.com → your repository → the **Pull requests** tab).
2. Wait for the green tick next to "tests" (it takes about a minute). A red cross means the automatic tests failed: do not merge; go back to the session and say "the tests failed on the pull request". (This check exists from step 00 onwards; step 00 is the one that sets it up.)
3. Click **Merge pull request**, then **Confirm merge**.
4. Wait about two minutes: GitHub rebuilds the game. You can watch it in the **Actions** tab; a green tick means it is live.
5. Open your game link on your phone (pull down to refresh) and do what the step says under "How you test it".

### If the test shows a problem

- Small problem: go back to the same session, describe what you saw, and let it fix it. It will open a new pull request.
- Game broken: open the merged pull request on github.com and click **Revert**, then merge the pull request that this creates. The game goes back to how it was. Then start the step again in a new session.

### If a session stops halfway

Sessions sometimes run out of room or get confused. Nothing is lost and nothing is broken, because nothing reaches the game until you merge.

- If it opened a pull request and wrote "Partly done" in the roadmap: merge it only if the session says the tests pass. Then start a new session with the same line; it will see the note and continue.
- If it opened nothing, or you are unsure: close the pull request without merging (button **Close pull request**), start a new session and paste the same line again.

### Getting the changes onto your computer

After merging, open **GitHub Desktop** and click **Fetch origin**, then **Pull origin**. Do this before you add files (tables, pictures), so your computer has the latest version.

### Adding your own files (tables, pictures)

1. Fetch and pull first (above).
2. Put the file in the folder the step names.
3. In GitHub Desktop: type a few words in the **Summary** box, click **Commit to main**, then **Push origin**.

Pictures and tables go straight to `main` like this. Only code goes through pull requests.

### Ticking a box yourself

On github.com, open `docs/ROADMAP.md`, click the pencil, change `- [ ]` to `- [x]` on the line of the step, and click **Commit changes**. Claude sessions tick their own step.

### Which model

- **Opus 5.5** for steps that need hard reasoning: the engine, rules, bots, networking.
- **Sonnet 5.5** for routine work: data entry from your tables, screens, clean-up.

If a Sonnet step goes badly twice, run it once with Opus.

### Three rules that protect you

1. **One step at a time, in order.** Do not start a step while another pull request is still open.
2. **Never merge with a red cross.**
3. **Rules questions are yours.** If a session decides a rule without asking you, tell it to undo that and ask.

### What is never published

The game link only shows the built game. Nothing in `docs/` is published. The one folder to be careful with is `public/`: everything in it is published, so never put rules text or leaflet photos there.


## Phase 0 — Housekeeping

- [x] **Step 00 — Housekeeping before the migration**
  - Goal: Remove leftovers so later sessions start from accurate docs and a single game mode.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/00-housekeeping.md and follow it.`
  - Done when: No Rivière checkbox on the setup screen; `npm test` passes; docs say 2–4 players; this pull request itself shows the test check.
  - How you test it: Open your game link. Start a 2-player game: the Rivière checkbox is gone and the game plays as before.
  - Prompt: [docs/prompts/00-housekeeping.md](prompts/00-housekeeping.md)


## Planning documents (written by Fable in November 2026)

These are ticked when the document exists. If one is unticked, run its prompt with Opus before the phase that needs it: P4 before step 13, P5 before Phase 10, P6 before the first illustrations.

- [x] **Step P4 — AI player design**
  - Goal: Write `docs/planning/AI-PLAYER.md`. (Fable does this during the planning session; skip the step if the file already exists.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/P4-ai-player-design.md and follow it.`
  - Done when: `docs/planning/AI-PLAYER.md` exists and the roadmap steps that depend on it can be followed.
  - How you test it: Read the document's summary: you should understand the recommendation and what it costs without reading the rest.
  - Prompt: [docs/prompts/P4-ai-player-design.md](prompts/P4-ai-player-design.md)

- [x] **Step P5 — Networking plan**
  - Goal: Write `docs/planning/NETWORKING.md`. (Fable does this during the planning session; skip the step if the file already exists.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/P5-networking-design.md and follow it.`
  - Done when: `docs/planning/NETWORKING.md` exists and the roadmap steps that depend on it can be followed.
  - How you test it: Read the document's summary: you should understand the recommendation and what it costs without reading the rest.
  - Prompt: [docs/prompts/P5-networking-design.md](prompts/P5-networking-design.md)

- [x] **Step P6 — Illustration style guide and risky-card prompts**
  - Goal: Write `docs/art/STYLE-GUIDE.md and docs/art/RISKY-CARD-PROMPTS.md`. (Fable does this during the planning session; skip the step if the file already exists.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/P6-art-guides.md and follow it.`
  - Done when: `docs/art/STYLE-GUIDE.md and docs/art/RISKY-CARD-PROMPTS.md` exists and the roadmap steps that depend on it can be followed.
  - How you test it: Read the document's summary: you should understand the recommendation and what it costs without reading the rest.
  - Prompt: [docs/prompts/P6-art-guides.md](prompts/P6-art-guides.md)


## Phase 1 — Rebuild the engine so it can carry extensions

Twelve steps that change how the game works inside without changing how it plays. After each one the game must play exactly as before. Do them in order; never skip one.

- [x] **Step 01 — Repeatable randomness and golden games**
  - Goal: Make every game repeatable from a seed, and record reference games that later refactors must reproduce.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/01-seeded-rng-goldens.md and follow it.`
  - Done when: Two games started with the same seed and the same actions end in the same state; golden test in `npm test`.
  - How you test it: Play one full 2-player game on your game link. Nothing should look or feel different.
  - Prompt: [docs/prompts/01-seeded-rng-goldens.md](prompts/01-seeded-rng-goldens.md)

- [x] **Step 02 — One list of legal actions, and invariant checks**
  - Goal: Give the engine one function that lists every legal action, and make the simulator check the game's integrity after every action.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/02-legal-actions-invariants.md and follow it.`
  - Done when: `legalActions` exists, the simulator uses it, invariants run in `npm test`.
  - How you test it: Play one full game. Playable cards and valid targets are highlighted exactly as before.
  - Prompt: [docs/prompts/02-legal-actions-invariants.md](prompts/02-legal-actions-invariants.md)

- [x] **Step 03 — A driver that owns the game: screens and timers leave the engine**
  - Goal: Separate "the game" from "this device showing it", so the same engine can later serve a host phone, remote phones and bots.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/03-driver.md and follow it.`
  - Done when: The reducer has no screen or timer concept; hot-seat play is unchanged for the player.
  - How you test it: Play a 3-player game on one phone. The "pass the phone" screen still appears between turns; the Anniversaire and Chercheur countdowns still work.
  - Prompt: [docs/prompts/03-driver.md](prompts/03-driver.md)

- [x] **Step 04 — Card definitions with ids, extension tags and child gender**
  - Goal: Turn card data into definitions that extensions can add to, and stop rules from naming cards where a group is meant.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/04-card-definitions.md and follow it.`
  - Done when: All 200 cards come from definitions with ids; a test checks the 200 total and the per-type counts.
  - How you test it: Open the card gallery (add `#cartes` to your game link): all cards and illustrations are still there. Play a few turns.
  - Prompt: [docs/prompts/04-card-definitions.md](prompts/04-card-definitions.md)

- [x] **Step 05 — Selectors, then zones as arrays**
  - Goal: Let a player hold more than one job or marriage, and give money and malus their final zones, without breaking anything that reads the board.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/05-zones-selectors.md and follow it.`
  - Done when: Zones match §3.1; UI and tests read boards only through selectors.
  - How you test it: Play a full game with a job change, a marriage, a divorce and an Attentat if you can. Boards display as before.
  - Prompt: [docs/prompts/05-zones-selectors.md](prompts/05-zones-selectors.md)

- [ ] **Step 06 — Card meta: one table for the state of placed cards**
  - Goal: Give every placed card a placement order and a uniform place for "used", "on top of", "protected".
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/06-card-meta.md and follow it.`
  - Done when: No per-card state lives outside `state.meta`; goldens unchanged except where regenerated on purpose.
  - How you test it: Buy a house with salaries and an Héritage: the spent cards still show under the house and still count at the end.
  - Prompt: [docs/prompts/06-card-meta.md](prompts/06-card-meta.md)

- [ ] **Step 07 — Primitives and events**
  - Goal: Route every draw, placement and loss of a card through a few shared functions that announce what happened.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/07-primitives-events.md and follow it.`
  - Done when: No zone is edited outside `primitives.js`; goldens identical.
  - How you test it: Play one full game. Nothing should look different.
  - Prompt: [docs/prompts/07-primitives-events.md](prompts/07-primitives-events.md)

- [ ] **Step 08 — Flow stack, part 1: the turn and the purchase**
  - Goal: Replace the single "choice in progress" slot with a stack of step-by-step flows, starting with the turn itself.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/08-flow-stack-core.md and follow it.`
  - Done when: Turn and purchase run as flows; invariants and goldens pass (regenerate only with a reason).
  - How you test it: Play a full game with at least one house purchase and one card taken from the discard pile.
  - Prompt: [docs/prompts/08-flow-stack-core.md](prompts/08-flow-stack-core.md)

- [ ] **Step 09 — Flow stack, part 2: every remaining choice**
  - Goal: Finish the move to flows so the old `pending` slot disappears.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/09-flow-stack-port.md and follow it.`
  - Done when: No `pending` or `forced` left in `src/`; every waiting step has a fallback.
  - How you test it: Play a game using as many special cards as you can (Troc, Chance, Anniversaire, Casino, Piston). Each one behaves as before.
  - Prompt: [docs/prompts/09-flow-stack-port.md](prompts/09-flow-stack-port.md)

- [ ] **Step 10 — Queries, modifiers and one precedence function**
  - Goal: Move the base game's perks and immunities onto the mechanism the extensions will use, which proves the mechanism.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/10-queries-modifiers.md and follow it.`
  - Done when: No `hasJob(p, '…')` perk checks left in rules or reducer; goldens identical.
  - How you test it: Play a game and try a blocked move for each perk you can (Accident on a Garagiste, Licenciement on a Prof…). The refusal message is the same as before.
  - Prompt: [docs/prompts/10-queries-modifiers.md](prompts/10-queries-modifiers.md)

- [ ] **Step 11 — Money traits, prices and the scoring pipeline**
  - Goal: Generalise paying and scoring so extension money, discounts and score modifiers need no special code.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/11-money-price-scoring.md and follow it.`
  - Done when: Purchases and scoring go through queries; goldens identical.
  - How you test it: Finish a game and compare the final score screen with a hand count of one player's cards.
  - Prompt: [docs/prompts/11-money-price-scoring.md](prompts/11-money-price-scoring.md)

- [ ] **Step 12 — Shared zone, cards that play themselves, and visibility**
  - Goal: Add the last mechanisms the extensions need, proven with two fake cards before any real card depends on them.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/12-center-autoplay-visibility.md and follow it.`
  - Done when: All mechanisms of ARCHITECTURE.md §9 exist and are tested; the base game is unchanged.
  - How you test it: Play one full game. Nothing should look different. This was the last engine step.
  - Prompt: [docs/prompts/12-center-autoplay-visibility.md](prompts/12-center-autoplay-visibility.md)

- [ ] **Checkpoint A — play the base game with friends**
  - Who: you, no Claude session
  - What: Make sure the rebuilt engine plays exactly like the old one before anything is added.
  - How: Play two full games on one phone with 3 or 4 people. Note anything that behaves differently from before. If something is wrong, open a new Claude Code session and describe it; do not start Phase 2 until it is fixed.


## Phase 2 — Tools for building extensions

An easy computer player so you can test alone, the swipe-to-target gesture (most extension cards need a target), and screens ready to show new kinds of cards.

- [ ] **Step 13 — A first, easy bot and a solo mode**
  - Goal: Let Teto test alone against computer players, and let simulations play sensibly. (Moved earlier than in the original order: it makes testing every extension much easier. The stronger levels come in Phase 11.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/13-bot-easy-solo.md and follow it.`
  - Done when: A solo game against 3 bots runs to the end; bot simulations are part of `npm test`.
  - How you test it: Start a game with yourself and two "Ordinateur" players. Play it to the end. The bots should play legal, if not clever, moves at a readable pace.
  - Prompt: [docs/prompts/13-bot-easy-solo.md](prompts/13-bot-easy-solo.md)

- [ ] **Step 14 — UI step 3 — swipe to target**
  - Goal: Playing a card that needs a target opens the table view; players who cannot be targeted are greyed out; the targeted player's area glows and grows before release.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/14-ui-swipe-to-target.md and follow it.`
  - Done when: A malus can be played in one gesture from hand to target on a phone.
  - How you test it: On your phone, in a game against bots, play a malus by swiping it onto a player. Try releasing on a greyed-out player and outside any player.
  - Prompt: [docs/prompts/14-ui-swipe-to-target.md](prompts/14-ui-swipe-to-target.md)

- [ ] **Step 15 — UI ready for extensions**
  - Goal: Everything the screen needs so that a new extension shows up without redesign.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/15-ui-extension-ready.md and follow it.`
  - Done when: With the test extension from step 12 enabled in development, its two cards display correctly in hand, on a board and in the centre.
  - How you test it: Open the setup screen: the extension list is there, all marked "bientôt". Open the gallery: the base game section looks as before.
  - Prompt: [docs/prompts/15-ui-extension-ready.md](prompts/15-ui-extension-ready.md)


## Phase 3 — Girl Power

The pilot extension: its spec and table are already complete.

- [x] **Girl Power — you fill the card table (already done)**
  - Who: you, no Claude session
  - What: Copy what is printed on the physical cards into `docs/extensions/girl-power/girl-power-card-data.xlsx`: the yellow cells only. Put the exact card text in Notes. Done on 2026-11-11.
  - How: Open the file with Excel or Numbers (export back to .xlsx), fill it, save it in the same folder, then in GitHub Desktop: write a short summary, click Commit to main, then Push origin.

- [ ] **Step 16 — Girl Power — rulings and card data**
  - Goal: Settle the open rules questions with Teto, then turn the filled table into card definitions.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/16-gp-data.md and follow it.`
  - Done when: Every question has a recorded decision; definitions exist; count test passes.
  - How you test it: Open the card gallery: the new section lists every card of the extension with its text. Check five cards against the physical ones.
  - Prompt: [docs/prompts/16-gp-data.md](prompts/16-gp-data.md)

- [ ] **Step 17 — Girl Power — engine A: métiers, family cards, acquisitions, primes, bonus rules**
  - Goal: Make these Girl Power cards work: métiers, études sup', flirts, mariages, enfants, acquisitions (Dragon, Super bouclier…), primes de naissance, and the bonus rules Four Women and Ladies Night.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/17-gp-engine-a.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Girl Power switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/17-gp-engine-a.md](prompts/17-gp-engine-a.md)

- [ ] **Step 18 — Girl Power — engine B: cartes spéciales and malus**
  - Goal: Make these Girl Power cards work: the 11 cartes spéciales and the 11 malus.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/18-gp-engine-b.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Girl Power switched on. Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/18-gp-engine-b.md](prompts/18-gp-engine-b.md)

- [ ] **Step 19 — Girl Power — screens and interactions**
  - Goal: Make every Girl Power card pleasant to play on a phone.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/19-gp-ui.md and follow it.`
  - Done when: Every flow of the extension can be completed on a phone-sized screen without confusion.
  - How you test it: On your phone, play a full solo game with Girl Power on. Note any moment where you didn't know what to tap.
  - Prompt: [docs/prompts/19-gp-ui.md](prompts/19-gp-ui.md)

- [ ] **Girl Power — illustrations**
  - Who: you, no Claude session
  - What: Create the Girl Power illustrations in ChatGPT following `docs/art/STYLE-GUIDE.md`. For the cards listed in `docs/art/RISKY-CARD-PROMPTS.md`, paste the prompt given there. File names are listed in the card gallery.
  - How: Put the PNG files in `public/cards/` with GitHub Desktop (Commit to main, Push origin). Two minutes later they appear in the gallery of your game link.

- [ ] **Checkpoint — play Girl Power with friends**
  - Who: you, no Claude session
  - What: Play at least two games with Girl Power on, with the physical leaflet at hand.
  - How: Write down every surprise. Start a new Claude Code session, describe them, and get them fixed before starting the next extension.


## Phase 4 — Vie de luxe

- [x] **Step 20 — Vie de luxe — spec and fill-in table**
  - Goal: Turn the rules transcript into a structured spec and an empty card-data table for Teto to fill. (Fable does this during the planning session; skip the step if `docs/extensions/luxe/luxe.md` and `docs/extensions/luxe/luxe-card-data.xlsx` already exist.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/20-luxe-spec.md and follow it.`
  - Done when: Spec and table exist; counts add up to the leaflet's total.
  - How you test it: Open the spec on GitHub: you should be able to read every card's effect and every question without the leaflet.
  - Prompt: [docs/prompts/20-luxe-spec.md](prompts/20-luxe-spec.md)

- [ ] **Vie de luxe — you fill the card table**
  - Who: you, no Claude session
  - What: Copy what is printed on the physical cards into `docs/extensions/luxe/luxe-card-data.xlsx`: the yellow cells only. Put the exact card text in Notes.
  - How: Open the file with Excel or Numbers (export back to .xlsx), fill it, save it in the same folder, then in GitHub Desktop: write a short summary, click Commit to main, then Push origin.

- [ ] **Step 21 — Vie de luxe — rulings and card data**
  - Goal: Settle the open rules questions with Teto, then turn the filled table into card definitions.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/21-luxe-data.md and follow it.`
  - Done when: Every question has a recorded decision; definitions exist; count test passes.
  - How you test it: Open the card gallery: the new section lists every card of the extension with its text. Check five cards against the physical ones.
  - Prompt: [docs/prompts/21-luxe-data.md](prompts/21-luxe-data.md)

- [ ] **Step 22 — Vie de luxe — engine A: métiers, Star, bijoux, acquisitions, family cards**
  - Goal: Make these Vie de luxe cards work: métiers (incl. PDG, Influenceur), Star / Buzz / Bad buzz, bijoux de famille, the 17 acquisitions de luxe, enfants, Mariage d'argent, flirts.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/22-luxe-engine-a.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Vie de luxe switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/22-luxe-engine-a.md](prompts/22-luxe-engine-a.md)

- [ ] **Step 23 — Vie de luxe — engine B: malus and cartes spéciales**
  - Goal: Make these Vie de luxe cards work: malus (Dette, Blacklisté, Braquage, Cambriolage, Impôt sur la fortune) and the 12 cartes spéciales (Groloto, Paradis fiscal, Sugar daddy…).
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/23-luxe-engine-b.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Vie de luxe switched on. Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/23-luxe-engine-b.md](prompts/23-luxe-engine-b.md)

- [ ] **Step 24 — Vie de luxe — screens and interactions**
  - Goal: Make every Vie de luxe card pleasant to play on a phone.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/24-luxe-ui.md and follow it.`
  - Done when: Every flow of the extension can be completed on a phone-sized screen without confusion.
  - How you test it: On your phone, play a full solo game with Vie de luxe on. Note any moment where you didn't know what to tap.
  - Prompt: [docs/prompts/24-luxe-ui.md](prompts/24-luxe-ui.md)

- [ ] **Vie de luxe — illustrations**
  - Who: you, no Claude session
  - What: Create the Vie de luxe illustrations in ChatGPT following `docs/art/STYLE-GUIDE.md`. For the cards listed in `docs/art/RISKY-CARD-PROMPTS.md`, paste the prompt given there. File names are listed in the card gallery.
  - How: Put the PNG files in `public/cards/` with GitHub Desktop (Commit to main, Push origin). Two minutes later they appear in the gallery of your game link.

- [ ] **Checkpoint — play Vie de luxe with friends**
  - Who: you, no Claude session
  - What: Play at least two games with Vie de luxe on, with the physical leaflet at hand, then one game combined with: Girl Power.
  - How: Write down every surprise. Start a new Claude Code session, describe them, and get them fixed before starting the next extension.


## Phase 5 — Trash

- [x] **Step 25 — Trash — spec and fill-in table**
  - Goal: Turn the rules transcript into a structured spec and an empty card-data table for Teto to fill. (Fable does this during the planning session; skip the step if `docs/extensions/trash/trash.md` and `docs/extensions/trash/trash-card-data.xlsx` already exist.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/25-trash-spec.md and follow it.`
  - Done when: Spec and table exist; counts add up to the leaflet's total.
  - How you test it: Open the spec on GitHub: you should be able to read every card's effect and every question without the leaflet.
  - Prompt: [docs/prompts/25-trash-spec.md](prompts/25-trash-spec.md)

- [ ] **Trash — you fill the card table**
  - Who: you, no Claude session
  - What: Copy what is printed on the physical cards into `docs/extensions/trash/trash-card-data.xlsx`: the yellow cells only. Put the exact card text in Notes.
  - How: Open the file with Excel or Numbers (export back to .xlsx), fill it, save it in the same folder, then in GitHub Desktop: write a short summary, click Commit to main, then Push origin.

- [ ] **Step 26 — Trash — rulings and card data**
  - Goal: Settle the open rules questions with Teto, then turn the filled table into card definitions.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/26-trash-data.md and follow it.`
  - Done when: Every question has a recorded decision; definitions exist; count test passes.
  - How you test it: Open the card gallery: the new section lists every card of the extension with its text. Check five cards against the physical ones.
  - Prompt: [docs/prompts/26-trash-data.md](prompts/26-trash-data.md)

- [ ] **Step 27 — Trash — engine A: métiers, argent sale, acquisitions, Anarchie**
  - Goal: Make these Trash cards work: métiers, mariages forcés, argent sale, acquisitions (drogues, Maison close, Tourisme sexuel), flirts, enfants, the extended Policier rule and Anarchie.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/27-trash-engine-a.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Trash switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/27-trash-engine-a.md](prompts/27-trash-engine-a.md)

- [ ] **Step 28 — Trash — engine B: malus**
  - Goal: Make these Trash cards work: the 10 malus.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/28-trash-engine-b.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Trash switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/28-trash-engine-b.md](prompts/28-trash-engine-b.md)

- [ ] **Step 29 — Trash — engine C: cartes spéciales and très spéciales**
  - Goal: Make these Trash cards work: the 10 cartes spéciales and the 5 cartes très spéciales.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/29-trash-engine-c.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Trash switched on. Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/29-trash-engine-c.md](prompts/29-trash-engine-c.md)

- [ ] **Step 30 — Trash — screens and interactions**
  - Goal: Make every Trash card pleasant to play on a phone.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/30-trash-ui.md and follow it.`
  - Done when: Every flow of the extension can be completed on a phone-sized screen without confusion.
  - How you test it: On your phone, play a full solo game with Trash on. Note any moment where you didn't know what to tap.
  - Prompt: [docs/prompts/30-trash-ui.md](prompts/30-trash-ui.md)

- [ ] **Trash — illustrations**
  - Who: you, no Claude session
  - What: Create the Trash illustrations in ChatGPT following `docs/art/STYLE-GUIDE.md`. For the cards listed in `docs/art/RISKY-CARD-PROMPTS.md`, paste the prompt given there. File names are listed in the card gallery.
  - How: Put the PNG files in `public/cards/` with GitHub Desktop (Commit to main, Push origin). Two minutes later they appear in the gallery of your game link.

- [ ] **Checkpoint — play Trash with friends**
  - Who: you, no Claude session
  - What: Play at least two games with Trash on, with the physical leaflet at hand, then one game combined with: Girl Power, Vie de luxe.
  - How: Write down every surprise. Start a new Claude Code session, describe them, and get them fixed before starting the next extension.


## Phase 6 — Politique

- [x] **Step 31 — Politique — spec and fill-in table**
  - Goal: Turn the rules transcript into a structured spec and an empty card-data table for Teto to fill. (Fable does this during the planning session; skip the step if `docs/extensions/politique/politique.md` and `docs/extensions/politique/politique-card-data.xlsx` already exist.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/31-pol-spec.md and follow it.`
  - Done when: Spec and table exist; counts add up to the leaflet's total.
  - How you test it: Open the spec on GitHub: you should be able to read every card's effect and every question without the leaflet.
  - Prompt: [docs/prompts/31-pol-spec.md](prompts/31-pol-spec.md)

- [ ] **Politique — you fill the card table**
  - Who: you, no Claude session
  - What: Copy what is printed on the physical cards into `docs/extensions/politique/politique-card-data.xlsx`: the yellow cells only. Put the exact card text in Notes.
  - How: Open the file with Excel or Numbers (export back to .xlsx), fill it, save it in the same folder, then in GitHub Desktop: write a short summary, click Commit to main, then Push origin.

- [ ] **Step 32 — Politique — rulings and card data**
  - Goal: Settle the open rules questions with Teto, then turn the filled table into card definitions.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/32-pol-data.md and follow it.`
  - Done when: Every question has a recorded decision; definitions exist; count test passes.
  - How you test it: Open the card gallery: the new section lists every card of the extension with its text. Check five cards against the physical ones.
  - Prompt: [docs/prompts/32-pol-data.md](prompts/32-pol-data.md)

- [ ] **Step 33 — Politique — engine A: partis, political métiers, allocations, malus**
  - Goal: Make these Politique cards work: partis, political métiers (maires, ministres, Premier ministre, Président), allocations, appartements, flirts, and the 3 malus.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/33-pol-engine-a.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Politique switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/33-pol-engine-a.md](prompts/33-pol-engine-a.md)

- [ ] **Step 34 — Politique — engine B: réformes, taxes, événements, cartes spéciales**
  - Goal: Make these Politique cards work: réformes, taxes and the pot commun, the 3 événements (Élection, Grève, Révolution) and the 5 cartes spéciales.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/34-pol-engine-b.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Politique switched on. Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/34-pol-engine-b.md](prompts/34-pol-engine-b.md)

- [ ] **Step 35 — Politique — screens and interactions**
  - Goal: Make every Politique card pleasant to play on a phone.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/35-pol-ui.md and follow it.`
  - Done when: Every flow of the extension can be completed on a phone-sized screen without confusion.
  - How you test it: On your phone, play a full solo game with Politique on. Note any moment where you didn't know what to tap.
  - Prompt: [docs/prompts/35-pol-ui.md](prompts/35-pol-ui.md)

- [ ] **Politique — illustrations**
  - Who: you, no Claude session
  - What: Create the Politique illustrations in ChatGPT following `docs/art/STYLE-GUIDE.md`. For the cards listed in `docs/art/RISKY-CARD-PROMPTS.md`, paste the prompt given there. File names are listed in the card gallery.
  - How: Put the PNG files in `public/cards/` with GitHub Desktop (Commit to main, Push origin). Two minutes later they appear in the gallery of your game link.

- [ ] **Checkpoint — play Politique with friends**
  - Who: you, no Claude session
  - What: Play at least two games with Politique on, with the physical leaflet at hand, then one game combined with: Girl Power, Vie de luxe, Trash.
  - How: Write down every surprise. Start a new Claude Code session, describe them, and get them fixed before starting the next extension.


## Phase 7 — Fantastique

- [x] **Step 36 — Fantastique — spec and fill-in table**
  - Goal: Turn the rules transcript into a structured spec and an empty card-data table for Teto to fill. (Fable does this during the planning session; skip the step if `docs/extensions/fantastique/fantastique.md` and `docs/extensions/fantastique/fantastique-card-data.xlsx` already exist.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/36-fan-spec.md and follow it.`
  - Done when: Spec and table exist; counts add up to the leaflet's total.
  - How you test it: Open the spec on GitHub: you should be able to read every card's effect and every question without the leaflet.
  - Prompt: [docs/prompts/36-fan-spec.md](prompts/36-fan-spec.md)

- [ ] **Fantastique — you fill the card table**
  - Who: you, no Claude session
  - What: Copy what is printed on the physical cards into `docs/extensions/fantastique/fantastique-card-data.xlsx`: the yellow cells only. Put the exact card text in Notes.
  - How: Open the file with Excel or Numbers (export back to .xlsx), fill it, save it in the same folder, then in GitHub Desktop: write a short summary, click Commit to main, then Push origin.

- [ ] **Step 37 — Fantastique — rulings and card data**
  - Goal: Settle the open rules questions with Teto, then turn the filled table into card definitions.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/37-fan-data.md and follow it.`
  - Done when: Every question has a recorded decision; definitions exist; count test passes.
  - How you test it: Open the card gallery: the new section lists every card of the extension with its text. Check five cards against the physical ones.
  - Prompt: [docs/prompts/37-fan-data.md](prompts/37-fan-data.md)

- [ ] **Step 38 — Fantastique — engine A: personnages, objets magiques, animals, voyages, enfants**
  - Goal: Make these Fantastique cards work: the 10 personnages (set-up and permanent powers), animaux, voyages, enfants, and the 13 objets magiques.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/38-fan-engine-a.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Fantastique switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/38-fan-engine-a.md](prompts/38-fan-engine-a.md)

- [ ] **Step 39 — Fantastique — engine B: potions and maléfices**
  - Goal: Make these Fantastique cards work: the 11 potions and the 10 maléfices.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/39-fan-engine-b.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Fantastique switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/39-fan-engine-b.md](prompts/39-fan-engine-b.md)

- [ ] **Step 40 — Fantastique — engine C: éphémérides, pouvoirs éphémères, Messe noire**
  - Goal: Make these Fantastique cards work: the 5 éphémérides, the 10 pouvoirs éphémères and Messe noire.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/40-fan-engine-c.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Fantastique switched on. Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/40-fan-engine-c.md](prompts/40-fan-engine-c.md)

- [ ] **Step 41 — Fantastique — screens and interactions**
  - Goal: Make every Fantastique card pleasant to play on a phone.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/41-fan-ui.md and follow it.`
  - Done when: Every flow of the extension can be completed on a phone-sized screen without confusion.
  - How you test it: On your phone, play a full solo game with Fantastique on. Note any moment where you didn't know what to tap.
  - Prompt: [docs/prompts/41-fan-ui.md](prompts/41-fan-ui.md)

- [ ] **Fantastique — illustrations**
  - Who: you, no Claude session
  - What: Create the Fantastique illustrations in ChatGPT following `docs/art/STYLE-GUIDE.md`. For the cards listed in `docs/art/RISKY-CARD-PROMPTS.md`, paste the prompt given there. File names are listed in the card gallery.
  - How: Put the PNG files in `public/cards/` with GitHub Desktop (Commit to main, Push origin). Two minutes later they appear in the gallery of your game link.

- [ ] **Checkpoint — play Fantastique with friends**
  - Who: you, no Claude session
  - What: Play at least two games with Fantastique on, with the physical leaflet at hand, then one game combined with: Girl Power, Vie de luxe, Trash, Politique.
  - How: Write down every surprise. Start a new Claude Code session, describe them, and get them fixed before starting the next extension.


## Phase 8 — Apocalypse

The heaviest extension by far: four engine steps.

- [x] **Step 42 — Apocalypse — spec and fill-in table**
  - Goal: Turn the rules transcript into a structured spec and an empty card-data table for Teto to fill. (Fable does this during the planning session; skip the step if `docs/extensions/apocalypse/apocalypse.md` and `docs/extensions/apocalypse/apocalypse-card-data.xlsx` already exist.)
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/42-apo-spec.md and follow it.`
  - Done when: Spec and table exist; counts add up to the leaflet's total.
  - How you test it: Open the spec on GitHub: you should be able to read every card's effect and every question without the leaflet.
  - Prompt: [docs/prompts/42-apo-spec.md](prompts/42-apo-spec.md)

- [ ] **Apocalypse — you fill the card table**
  - Who: you, no Claude session
  - What: Copy what is printed on the physical cards into `docs/extensions/apocalypse/apocalypse-card-data.xlsx`: the yellow cells only. Put the exact card text in Notes.
  - How: Open the file with Excel or Numbers (export back to .xlsx), fill it, save it in the same folder, then in GitHub Desktop: write a short summary, click Commit to main, then Push origin.

- [ ] **Step 43 — Apocalypse — rulings and card data**
  - Goal: Settle the open rules questions with Teto, then turn the filled table into card definitions.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/43-apo-data.md and follow it.`
  - Done when: Every question has a recorded decision; definitions exist; count test passes.
  - How you test it: Open the card gallery: the new section lists every card of the extension with its text. Check five cards against the physical ones.
  - Prompt: [docs/prompts/43-apo-data.md](prompts/43-apo-data.md)

- [ ] **Step 44 — Apocalypse — engine A: armes, véhicules, survies, animaux, métiers**
  - Goal: Make these Apocalypse cards work: armes (attack and defence), véhicules, survies, animaux and the 5 métiers.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/44-apo-engine-a.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Apocalypse switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/44-apo-engine-a.md](prompts/44-apo-engine-a.md)

- [ ] **Step 45 — Apocalypse — engine B: monstres and malus**
  - Goal: Make these Apocalypse cards work: the 6 monstres (round the table, damage, alliance, flight) and the 5 malus.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/45-apo-engine-b.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Apocalypse switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/45-apo-engine-b.md](prompts/45-apo-engine-b.md)

- [ ] **Step 46 — Apocalypse — engine C: crises and timers**
  - Goal: Make these Apocalypse cards work: the 5 crises and their timers.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/46-apo-engine-c.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Apocalypse switched on (still marked "en cours": only the cards of the steps done so far have their effect). Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/46-apo-engine-c.md](prompts/46-apo-engine-c.md)

- [ ] **Step 47 — Apocalypse — engine D: événements and cataclysmes**
  - Goal: Make these Apocalypse cards work: the 4 événements (Armageddon, Liquidation totale, Purge, Invasion extraterrestre) and the 4 cataclysmes.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/47-apo-engine-d.md and follow it.`
  - Done when: Listed cards implemented and tested; simulations with invariants pass alone and combined.
  - How you test it: Start a solo game against bots with Apocalypse switched on. Play until you have seen several of these cards. Compare what happens with the physical card.
  - Prompt: [docs/prompts/47-apo-engine-d.md](prompts/47-apo-engine-d.md)

- [ ] **Step 48 — Apocalypse — screens and interactions**
  - Goal: Make every Apocalypse card pleasant to play on a phone.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/48-apo-ui.md and follow it.`
  - Done when: Every flow of the extension can be completed on a phone-sized screen without confusion.
  - How you test it: On your phone, play a full solo game with Apocalypse on. Note any moment where you didn't know what to tap.
  - Prompt: [docs/prompts/48-apo-ui.md](prompts/48-apo-ui.md)

- [ ] **Apocalypse — illustrations**
  - Who: you, no Claude session
  - What: Create the Apocalypse illustrations in ChatGPT following `docs/art/STYLE-GUIDE.md`. For the cards listed in `docs/art/RISKY-CARD-PROMPTS.md`, paste the prompt given there. File names are listed in the card gallery.
  - How: Put the PNG files in `public/cards/` with GitHub Desktop (Commit to main, Push origin). Two minutes later they appear in the gallery of your game link.

- [ ] **Checkpoint — play Apocalypse with friends**
  - Who: you, no Claude session
  - What: Play at least two games with Apocalypse on, with the physical leaflet at hand, then one game combined with: Girl Power, Vie de luxe, Trash, Politique, Fantastique.
  - How: Write down every surprise. Start a new Claude Code session, describe them, and get them fixed before starting the next extension.


## Phase 9 — All extensions together, and polish

- [ ] **Step 49 — Combination testing across all extensions**
  - Goal: Prove that any mix of extensions plays to the end without breaking a rule or leaking a hidden card.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/49-combos-sweep.md and follow it.`
  - Done when: `npm run test:combos` passes; INTERACTIONS.md has no unruled row.
  - How you test it: Play one solo game with all six extensions on. It should reach the end.
  - Prompt: [docs/prompts/49-combos-sweep.md](prompts/49-combos-sweep.md)

- [ ] **Step 50 — UI step 4 — animation polish**
  - Goal: Make card movement readable and pleasant: drawing, placing, stealing, losing, cards arriving in the centre, turn changes.
  - Where: New Claude Code session · Model: Sonnet 5.5
  - Paste: `Read docs/prompts/50-ui-animation-polish.md and follow it.`
  - Done when: No card appears or disappears without a movement that shows where it went.
  - How you test it: On your phone, play a solo game. Watch a steal, a malus and a purchase: you should always see where each card went.
  - Prompt: [docs/prompts/50-ui-animation-polish.md](prompts/50-ui-animation-polish.md)

- [ ] **Checkpoint C — the complete game on one phone**
  - Who: you, no Claude session
  - What: Play two evenings with friends on one shared phone, mixing extensions.
  - How: Collect problems and get them fixed in a Claude Code session before starting network play.


## Phase 10 — Several phones on the same wifi

- [ ] **Step 51 — Same-wifi play 1 — rooms, host and joining**
  - Goal: One phone hosts the game; friends join from the game link with a room code and each sees only their own view.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/51-net-lobby-transport.md and follow it.`
  - Done when: Two browser tabs can play a full game against each other through a room code.
  - How you test it: On your home wifi: create a game on your phone, join from a second phone with the code, play a full game. Each phone must show only its own hand.
  - Prompt: [docs/prompts/51-net-lobby-transport.md](prompts/51-net-lobby-transport.md)

- [ ] **Step 52 — Same-wifi play 2 — reconnecting, sleeping phones, leaving**
  - Goal: A game survives a phone that sleeps, reloads or leaves.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/52-net-resilience.md and follow it.`
  - Done when: Locking and unlocking a client phone mid-game does not break the game.
  - How you test it: During a two-phone game: lock one phone for 30 seconds, then unlock; reload the page on the other. The game continues for both.
  - Prompt: [docs/prompts/52-net-resilience.md](prompts/52-net-resilience.md)

- [ ] **Checkpoint D — an evening on several phones**
  - Who: you, no Claude session
  - What: Play a real game with friends in the same room, each on their own phone.
  - How: Note every disconnection and every moment someone was stuck. Get them fixed before moving on.


## Phase 11 — Stronger computer players

- [ ] **Step 53 — Bot level "Moyen"**
  - Goal: A bot that plays like a careful beginner.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/53-bot-medium.md and follow it.`
  - Done when: Moyen wins clearly more often than Facile in the tournament.
  - How you test it: Play solo against two "Moyen" bots. They should build a life (studies, job, salaries) and not waste good cards.
  - Prompt: [docs/prompts/53-bot-medium.md](prompts/53-bot-medium.md)

- [ ] **Step 54 — Bot level "Difficile"**
  - Goal: A bot that is a real opponent for an experienced player.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/54-bot-hard.md and follow it.`
  - Done when: Difficile beats Moyen clearly; a move never takes longer than the budget.
  - How you test it: Play solo against one bot of each level. The "Difficile" one should target the leader and be hard to beat.
  - Prompt: [docs/prompts/54-bot-hard.md](prompts/54-bot-hard.md)

- [ ] **Step 55 — A bot takes over a player who left**
  - Goal: When a player leaves an online game for good, a bot plays their seat so the others can finish.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/55-bot-takeover.md and follow it.`
  - Done when: A three-phone game finishes after one phone leaves.
  - How you test it: In a three-phone game, close the page on one phone and wait. A bot should take the seat, and the game should finish.
  - Prompt: [docs/prompts/55-bot-takeover.md](prompts/55-bot-takeover.md)


## Phase 12 — Online play

- [ ] **Step 56 — Online play — friends in different places**
  - Goal: The same game works when players are on different networks, including mobile data.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/56-online-play.md and follow it.`
  - Done when: Two phones on different networks (one on mobile data) complete a game.
  - How you test it: Ask a friend at their home to join your game with the code, you on wifi and one phone on mobile data. Play a full game.
  - Prompt: [docs/prompts/56-online-play.md](prompts/56-online-play.md)

- [ ] **Step 57 — When the host leaves**
  - Goal: A game is not lost when the host's phone drops out.
  - Where: New Claude Code session · Model: Opus 5.5
  - Paste: `Read docs/prompts/57-host-loss.md and follow it.`
  - Done when: Killing the host's page and reopening it resumes the game for everyone.
  - How you test it: In a three-phone game, close the host's page for a minute, then reopen the game link on the host. Everyone should be able to continue.
  - Prompt: [docs/prompts/57-host-loss.md](prompts/57-host-loss.md)

- [ ] **Final checkpoint — play online**
  - Who: you, no Claude session
  - What: A full evening with friends in different places.
  - How: If it works, you are done. Keep `docs/ROADMAP.md`: new ideas go at the bottom as new steps.

