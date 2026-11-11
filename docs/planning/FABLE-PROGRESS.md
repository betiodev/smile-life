# Fable planning session — progress log

If the session resets: read `FABLE-BRIEF.md`, then this file, then continue from "Next".

## Done

- **Audit** → `docs/planning/AUDIT.md` (2026-11-11). Engine, tests, deploy and all six extension docs read in full; UI skimmed only.
- Confirmed `docs/` is never published (Pages uploads `dist/` only). Never put rules in `public/`.
- **P1** → `docs/planning/ARCHITECTURE.md` (2026-11-11).
- Teto exported the Girl Power table to `docs/extensions/girl-power/girl-power-card-data.xlsx` (the `.numbers` file is gone). Columns are recorded in ARCHITECTURE.md section 2.2.

## Next

1. P2 `docs/ROADMAP.md` + `docs/prompts/` — needs Teto's answers to questions 2, 3, 4, 6 below, or the defaults.
2. P3 extension specs + fill-in tables + `docs/extensions/INTERACTIONS.md`
3. P4 `docs/planning/AI-PLAYER.md`
4. P5 `docs/planning/NETWORKING.md`
5. P6 `docs/art/STYLE-GUIDE.md` + `docs/art/RISKY-CARD-PROMPTS.md`

## Questions asked (2026-11-11), with the default taken if unanswered

1. ~~Girl Power table format~~ — answered: exported to `.xlsx`.
2. Game length with many extensions → default: setup lets you pick extensions and a deck size; cards beyond it are set aside at random.
3. Extension order → default: Girl Power, Luxe, Trash, Politique, Fantastique, Apocalypse last.
4. Git workflow → default: one pull request per step, merged by Teto.
5. Physical/social cards (Bombardement, Grève, Référendum, negotiation) → default: simple digital stand-ins, each listed as a rules question (options are in ARCHITECTURE.md section 9).
6. Remove the standalone Rivière option and settle on 2–4 players in docs → default: yes to both, as a roadmap step.

## Things found in the Girl Power table, to raise with Teto in P3

- Sheet "Enfants jeu de base" is empty. The gender of the ten base children is needed by four Girl Power cards and by Fantastique's Sorcière.
- The Notes of the first two "Démontage de cliché" rows look swapped ("aucun accident" has the flirts text and the reverse).
- The Notes of Crapaud and Dragon look swapped. Check whether their smiles (1 and 3) are swapped too.
- Études sup': the level (1, 2, 3) is written in Notes; it needs its own column.
- Cléo's note "Voyage au Caire vaut triple" is an effect that `girl-power.md` does not mention.
- Flirt "À la bibliothèque" allows a child: confirm, since in the base game only Hôtel and Camping do.
- `girl-power.md` section 11 still has two open questions (Four Women timing, Ladies Night counts).

## Key decisions so far

- Engine design: card definitions + behaviour registry, queries with modifiers and one precedence function, primitives and events, a flow stack replacing `pending`, a driver owning state/timers. See ARCHITECTURE.md section 0.
- Behaviours are code, not a data language. Bots learn card effects by simulating, not by reading card data.
- Migration is 10 engine steps before the first extension card; Girl Power is the pilot; Apocalypse is last.
