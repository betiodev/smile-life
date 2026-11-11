# Brief for Claude Fable — Smile Life: master plan from today to online play

You are the lead architect and planner for my project. This is a **planning session**, not a build session. Your job is to study the repo and the extension rules deeply, make the hard design decisions, and leave behind a **step-by-step roadmap** with a **ready-to-paste prompt for every future session**, so I can carry the project to the finish line with other models (Claude Opus 5.5 / Sonnet 5.5) after you're gone.

Read this whole brief before doing anything.

---

## 1. Who I am and how I work

- I'm Teto. I'm not a professional developer: this is my first game project. I build with **Claude Code (web, connected to GitHub)** and add files with **GitHub Desktop**. I'm still learning git vocabulary, so any instruction aimed at me must be in plain words, step by step.
- I generate card illustrations with **ChatGPT**. Claude Code builds frames, card text and everything else in code.
- I like to settle open questions up front rather than discover them halfway through.
- **I only have Fable for this session** (3 days, one session reset). Every later step will run on Opus 5.5 or Sonnet 5.5. So spend your effort where a strong model matters most: architecture, cross-extension rule design, AI player design, networking choices. Leave routine execution to the roadmap.
- Language: **roadmap, prompts, docs and code in English. Everything players see in the game stays in French**, with card names exactly as printed.

## 2. The project

A private digital adaptation of the French card game **Smile Life** (Alexandre Seba / Blackrock Games), so I can play with my friends, each on their own phone, from a link.

- Repo: `betiodev/smile-life` (private, GitHub Pro). The game is served with GitHub Pages.
- Read `CLAUDE.md` and the codebase to learn the current architecture. Don't rely on my description below if the code says otherwise.

**Current state (Nov 2026):**
- The base game works, with no known rules bugs. Card illustrations for the base game are done (`public/cards/`, frames in `public/frames/`).
- UI redesign in 4 steps: step 1 (two screens: "my view" + full-screen table view) and step 2 (Tinder-style swipe in hand: right = play, left = discard, 3-second "Annuler" undo toast, tap-to-enlarge) are **done**. Still to do: **step 3, swipe-to-target** (playing a malus opens the table view, untargetable players are greyed out, the targeted player's area glows/grows before release) and **step 4, animation polish**.
- No extensions, no network play, no AI player yet.

## 3. Confirmed decisions (don't reopen these)

**Product**
- Landscape UI only. Up to 4 players for now (more later; don't block that).
- Visibility: the discard pile is public and browsable anytime. Players waiting for their turn can browse other players' tables and the discard pile.
- Before any network play: a **per-player view function** so a client never receives other hands or the deck order.
- First multi-device version: **peer-to-peer (WebRTC, e.g. PeerJS)**. One host device runs the engine, and friends join by room code from the GitHub Pages link. No server of my own.
- **Budget: GitHub Pro is the only acceptable cost.** Anything else must be free with no credit card risk (free tiers are fine if they can't silently start billing me). If fully free online play turns out to be impossible, tell me plainly and propose the best free alternative.
- Rivière as a standalone mode is removed. Some extensions bring rivière in at specific moments.

**AI player**
- Rule-based bot, **not an LLM** (zero running cost).
- Uses: solo games against bots, and taking over fully when a player leaves an online game.
- **Several difficulty levels.**
- Must play through the per-player view (no cheating) and must handle every extension.

**Build order (mine; you may propose changes with reasons):**
1. All 6 extensions (Apocalypse, Trash, Fantastique, Politique, Luxe, Girl Power), including combination testing.
2. Same-wifi play between phones.
3. AI player.
4. Fully online play (friends in different places).

The unfinished UI steps (3 and 4) must fit somewhere sensible in that sequence. You decide where, e.g. swipe-to-target probably belongs before the extensions that add many new targeted cards.

**Privacy / content**
- I don't want photos of the rule leaflets in the repo. Rules exist as text transcripts only.
- **GitHub Pages sites are public even when the repo is private.** Rules docs must never end up in a served folder. Check how Pages is deployed (workflow / Pages source). If `docs/` or the repo root could be published, **stop and tell me before writing anything into `docs/`**, and propose a safe location.

## 4. Inputs to study

Everything is in the repo:

- `CLAUDE.md` and the whole codebase: card data format, engine, rule handling, UI, tests (if any), build/deploy setup.
- `docs/extensions/` contains:
  - **Girl Power** — a finished spec (`girl-power.md`) **and** my filled-in card-data table (Excel). **This pair is the gold standard** for what each extension's spec and fill-in table should look like. Match its structure and columns.
  - **Apocalypse, Trash, Fantastique, Politique, Luxe** — faithful French transcripts of each rules leaflet, each ending with an "Ambiguities" section.
- `public/cards/` — the existing illustrations. Look at a sample to understand the art style.

**Rules authority:**
- The transcripts are the source of truth for each extension.
- Girl Power's "Decisions" section is settled.
- The verified base rules in the appendix are settled.
- **Never invent a ruling.** When something is ambiguous, contradictory, or depends on combining extensions, write it down as a question for me (see deliverables), with your recommended answer and why.
- Known global rule (from the Girl Power leaflet, applies to all extensions): **when two cards' effects conflict, the most recently placed one wins.**

## 5. How to run this session

1. **Audit first.** Read the repo and all extension docs. Write a short audit of the current architecture: how cards and rules are modelled, whether there are tests, how deployment works, and what will have to change to support extensions, networking and bots.
2. **Ask me once.** Before writing deliverables, send me **one batch** of questions that would change your plan (rules questions go in the files instead, see below). Keep it short. If I'm not answering, take your best reading, state it, and continue.
3. **Write the deliverables in priority order (section 6). Commit and push after each one** so nothing is lost if the session resets.
4. Keep a progress log in `docs/planning/FABLE-PROGRESS.md`: what's done, what's left, key decisions. If the session resets, the next run starts by reading it.
5. At the end, give me a plain-language summary: what you made, what I must do first, and where to click.

Don't change game code in this session, except trivially if needed to verify an assumption (and say so). Documents only.

## 6. Deliverables (in priority order)

If you run low on budget, finish the higher items properly rather than all of them badly. For anything you can't finish, the roadmap must contain a step and a prompt that lets Opus do it later.

### P1 — `docs/planning/ARCHITECTURE.md`: the engine design for extensions
This is the most important thing you'll do. Design how the engine supports all 6 extensions, **individually and combined**, without becoming spaghetti. Cover at least:
- Rule/effect model: hooks (e.g. canPlace, canTarget, onPlace, endScoring, turn actions, salary level…), permanent vs one-time effects, the "most recent placement wins" conflict rule (global placement order).
- New zones and states the extensions need (out-of-game zone, skip-turn, protection flags, flipped/used flags, rivière moments, permanent maluses such as "show drawn cards" or "no drawing from the défausse", etc.), gathered across **all** extensions, not one at a time.
- Card data schema: how the fill-in tables map to code, extension origin tags, child gender for base cards too.
- Game setup: choosing which extensions to include; deck building.
- How the per-player view, network sync and bots plug into the same engine (designing them in now avoids rewrites later).
- Testing strategy: a rules test suite for the base game (regression net), one per extension, and combination tests.
- A migration plan from the current code, in small safe steps.

### P2 — `docs/ROADMAP.md` + `docs/prompts/`
The guide I follow. Requirements:
- Ordered phases and steps with **checkboxes**. Each step states: goal; **where it happens** (new Claude Code session / claude.ai chat in my "Smile" Project / ChatGPT / me filling a file or testing on my phone); **which model** (Opus 5.5 for hard reasoning, Sonnet 5.5 for routine work); inputs to attach; what "done" looks like; how I test it myself (on my phone or computer); and a link to its prompt file.
- One prompt per step in `docs/prompts/NN-short-name.md`, **fully self-contained** (the session starts with zero memory). Each prompt must:
  - tell the session to read `CLAUDE.md`, `docs/ROADMAP.md` and the relevant docs first;
  - be scoped to fit comfortably in one session (split large work into several steps);
  - end with: run the tests → update `CLAUDE.md` if conventions changed → tick the step in `docs/ROADMAP.md` → commit and push → give Teto a plain-language summary and exactly what to test.
- A short **"How to use this roadmap"** section at the top, written for a git beginner: how to start a step, what to paste, how to get updates on my computer (Fetch / Pull in GitHub Desktop), what to do if a session fails halfway, and a simple git workflow suited to me (decide: push to main directly, or one pull request per step that I merge; explain the click path).
- Include checkpoints where I play-test with friends before moving on.
- Cover the full path: architecture migration → base-game rules test suite → each extension (fill-in → implementation → tests → illustrations) → combination testing → unfinished UI steps → same-wifi play → AI player (with difficulty levels) → full online play.

### P3 — Extension fill-in files (for the 5 extensions without a spec)
For each of Apocalypse, Trash, Fantastique, Politique and Luxe, in `docs/extensions/<name>/`:
- **`<name>.md`** — a spec in the same structure as `girl-power.md` (overview, card list, new engine concepts, cards by category with effect/type/hook, bonus rules, decisions, remaining questions). Mark every unresolved point clearly as a question for me, with your recommendation.
- **`<name>-card-data.xlsx`** — a fill-in table using **exactly the same columns as the Girl Power table**, pre-filled with everything the transcript gives (card names, counts, categories), with the blanks I must fill from the physical cards (smiles, levels, salaries, prices, genders, locations…) left empty and visibly marked.

Also write **`docs/extensions/INTERACTIONS.md`**: a cross-extension matrix of rule clashes and combo edge cases (e.g. Girl Power already refers to Trash's Polygamie and argent sale), each with your recommended ruling for me to confirm.

### P4 — AI player design: `docs/planning/AI-PLAYER.md`
Rule-based bot architecture, difficulty levels (what makes each harder: heuristics, card evaluation, targeting logic, lookahead…), how it handles extension cards (ideally driven by the same card/effect data, not hand-coded per card), how it takes over a departed player, and how it's tested (e.g. bot-vs-bot simulations to catch engine bugs and illegal moves).

### P5 — Networking plan: `docs/planning/NETWORKING.md`
- Same-wifi first, then fully online, on a static GitHub Pages site with **no cost beyond GitHub Pro**.
- Evaluate realistic free options (PeerJS's public broker, free STUN/TURN for phones on mobile data, free backend tiers…). Research current free-tier terms: they change.
- Cover: room codes, host authority, per-player view, reconnection, a player leaving (bot takeover), **the host leaving**, phones going to sleep mid-game.
- Recommend one path and a fallback, with what each would cost if a free tier disappeared.

### P6 — Illustrations: `docs/art/STYLE-GUIDE.md` + `docs/art/RISKY-CARD-PROMPTS.md`
- **Style guide**, derived from the existing illustrations (look at them): playful/cartoony, square, no text in the image; métiers as character-only images, other categories can be fuller scenes; kids each carry a pop-culture easter egg in their name and look **without copying copyrighted characters**; flirts that allow a child hint at it visually; file naming `category-cardname.png` (lowercase, no accents, hyphens) in `public/cards/`. Note anything new the extensions need (new categories → new frames?).
- **Risky prompts:** go through **only the new extension cards** and flag those likely to trip ChatGPT's image filters (violence, weapons, sexual or suggestive themes, harassment, drugs, death/disaster, political figures, real people, brands…). For each one, write a ready-to-paste ChatGPT prompt that keeps the card's meaning and humour while staying clearly within the filters (metaphor, symbolism, cartoon exaggeration, off-screen action), plus one fallback prompt. Don't write prompts for the safe cards; I handle those myself.

## 7. Quality bar

- Prefer fewer, well-scoped steps that each leave the game working over big-bang changes.
- Every prompt you write should work for a model that has never seen this brief.
- Be honest about risks, uncertainties and anything I've asked for that is a bad idea.

---

## Appendix — verified base-game rules (settled)

- Flirts are never flipped; only the most recent flirt can be stolen. Each flirt exists in one copy, so a steal is automatic (no player choice).
- Piston can't be used for the Grand Prof promotion.
- Licorne doubling requires both Arc-en-ciel AND Étoile filante.
- Anniversaire: each giving player chooses which salary to give; only unspent salaries can be given.
- Intérimaire jobs don't need Démission: the player can discard the intérim job to play Études or a new métier.
- Fonctionnaire métiers can't be hit by Licenciement.
- Prix d'excellence takes effect only with the métier it was played on, but the card stays until the end and its smiles count.
- Buying an acquisition: the salaries spent go underneath the acquisition card. If the acquisition is destroyed by a malus, only the acquisition is lost; the spent salaries stay face down and still score.
- Adultère can only be discarded (ending the affair) during the player's own turn, before or after drawing.
- Médium and Journaliste are one-time looks when placed; a Casino stake is seen only by the staker until resolution.
- On losing the Chercheur job, the player chooses which extra card to discard from their hand.
