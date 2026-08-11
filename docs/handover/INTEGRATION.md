# Integrating into COA_Mapping_frontend_V0 (develop)

This note is specific to the repo at `bhavna-linkedrp/COA_Mapping_frontend_V0`,
based on its file tree and `frontend/package.json` as of 2026-08-03. It amends
the general README where the repo's reality differs from the handover's
assumptions. Where the two disagree, this file wins.

---

## 1. The platform is Expo / React Native — this changes how you consume the kit

`frontend/` is Expo 55 / React Native 0.83 with NativeWind, shipping web,
Android and iOS (`e2e/mobile-responsive.spec.ts`, `eas.json`). The handover was
originally written for a DOM app. What changes:

| Handover file | On this repo |
|---|---|
| `app/css/dp-tokens.css`, `app/css/dp-semantics.css` | **Cannot be imported.** RN has no CSS cascade or attribute selectors. Use `app/native/dp-theme.ts` instead — same palettes, same semantic mapping, generated from the same source. Keep the CSS files: they remain the reference for what each state must look like. |
| `app/react/components.tsx` | **Pattern reference only.** It uses `<table>/<td>`, which do not exist in RN. Re-express with `src/shared/components/ui/Table.tsx` and friends. What must survive the translation: components receive taxonomy states (`impact="blocker"`), never colours. |
| `app/types/entity.d.ts` | Verbatim. Unchanged. |
| `app/config/dp-taxonomies.json` | Verbatim. Unchanged. |
| `fixtures/`, `spec/`, `reference/` | Verbatim. The specs are pictures; the platform doesn't matter. |

The one rule survives the platform change intact:

```tsx
import { semantic } from '@/dp-kit/native/dp-theme';

<Badge {...semantic('impact', 'blocker', mode)} />   // ✓ meaning
<Badge color="#D72222" />                            // ✗ never
```

`semantic()` throws on unknown states deliberately — an unstyled severity is a
bug, not a default. Missing state? Add it to the taxonomy and regenerate; never
add a one-off colour in a component.

## 2. Where the wizard lives

Create a **new feature folder**: `frontend/src/features/master-data-wizard/`
(matching the repo's feature-slice layout: `components/ hooks/ screens/
services/ store/ types/`). Put the kit under `frontend/src/features/
master-data-wizard/dp-kit/` — taxonomies, types, theme, fixtures.

**Do not build inside `features/migration/`.** That folder is the running COA
flow (`mcp.fetchCoa`, `sample_data/*_coa.csv`). The confirmed scope decision is
that COA is finished and untouched. Concretely:

- `EntityId` in `entity.d.ts` no longer includes `'coa'`. That is deliberate;
  do not re-add it.
- Do not extend `shared/constants/migration-steps.ts` — those are the COA
  flow's steps. The wizard's 8 steps come from `dp-taxonomies.json` and render
  in the wizard's own StepRail, not in `MigrationStepper`.
- Do not reuse `shared/constants/mapping-confidence.ts` — the wizard's
  confidence bands come from each entity pack (`mapping.autoAcceptAt`), not a
  shared constant.

## 3. What the repo already gives you (do not rebuild)

| Repo asset | Covers |
|---|---|
| `MigrationTopBar`, `AppDrawer` / `SideNav`, `ProjectSidebar` + `ProjectInfoPanel` | The parent chrome — header, nav rail, project aside. This is exactly the region stripped from `spec/region/`. The wizard mounts to the right of it. |
| `assets/fonts/` — Chivo, Inter, JetBrains Mono | The three families the design needs. Already loaded via `expo-font`. One gap: **no Chivo SemiBold and no JetBrains Mono Bold** are in the folder; the design uses 600/700 weights in places. Check how `theme.ts` resolves them before assuming. |
| zustand + immer, @tanstack/react-query, axios, zod | State, data fetching, validation. Follow the repo's existing `store/ selectors/ service/` split, as `features/migration` does. |
| `MigrationScope.config.ts`, `ScopeSectionCard`, `MasterDataTable` | The scope picker (the 23-selection screen). The wizard needs only to receive `entityId` from it. |
| Playwright e2e + jest conventions | Copy the test layout from `features/migration/__tests__`. |

Suggested contract wiring, matching the repo's conventions:

```
services/entity-pack.service.ts    GET .../entities/:entityId/profile -> EntityPack (zod-validated)
store/wizard.store.ts              accepted / excluded / overrides (MappingOverrides)
hooks/useEntityPack.ts             react-query around the service
```

The write side (persisting accepted / excluded / overrides) has **no agreed
endpoint** — see CLAUDE.md → The contract. Keep decisions in the zustand store
and raise the endpoint question; do not invent a route.

## 4. CLAUDE.md

The repo already has a root `CLAUDE.md`. **Merge, don't overwrite.** The exact
block to append is in `CLAUDE-MERGE.md` — the five rules already re-expressed
for this repo (RN colour rule via `semantic()`, wizard paths under
`docs/handover/`, the COA exclusion stated). Paste it below the repo's existing
rules. The handover's own `CLAUDE.md` stays as the DOM-flavoured original for
reference; where the two differ, `CLAUDE-MERGE.md` is correct for this repo.

## 5. Definition of done, adjusted for this repo

```bash
npx tsc --noEmit                                   # repo's own lint script
grep -rnE "#[0-9A-Fa-f]{3,6}" src/features/master-data-wizard/  \
  --include='*.tsx' --include='*.ts' | grep -v dp-theme          # must be empty
grep -rn "entityId ===" src/features/master-data-wizard/        # must be empty
```

Plus: renders with both fixtures, works in dark mode via `dp-theme.dark`, and
passes on web **and** at least one native target — the design was specified on
desktop web, so treat mobile layout as a consequence of the repo's responsive
patterns (`useResponsiveValue`), not something the spec answers.

## 6. Kickoff prompt for Claude Code

Prerequisites: this handover committed as `docs/handover/`, and the rules from
`CLAUDE.md` merged into the repo's root CLAUDE.md (§4 above). Then paste this
into Claude Code, one page per session:

```
Read docs/handover/INTEGRATION.md, then docs/handover/README.md, then
docs/handover/HANDOFF-01-Upload.md.

Build step 1 (Upload) of the master-data wizard as a new feature folder
src/features/master-data-wizard/, following the repo's existing feature-slice
conventions (look at src/features/migration/ for the folder shape, but do NOT
modify anything in it — that is the running COA flow).

Visual spec: docs/handover/spec/region/"Items · Upload (empty state) (wizard
region only).html" — that file shows exactly my scope; the header, nav and
project aside already exist in this repo (MigrationTopBar, SideNav,
ProjectSidebar) and must not be rebuilt.

Data: build against docs/handover/fixtures/items.entity.json AND
customers.entity.json, typed by docs/handover/app/types/entity.d.ts. There is
no backend endpoint yet — put pack loading behind a service that currently
reads the fixture.

Colour: only via semantic() from docs/handover/app/native/dp-theme.ts. The CSS
files in app/css/ are reference, not imports — this is React Native.

Done means: npx tsc --noEmit passes; no hex colours and no "entityId ===" in
the feature folder; renders with both fixtures; dark mode works via
dpTheme.dark. Show me the plan before writing code.
```

For steps 2 and 3, reuse the prompt with that step's region spec file. There is
no HANDOFF sheet for those yet; the region preview, its `spec/states/` files
and `reference/` are the specification. Keep "Show me the plan before writing
code" — reviewing the plan is where you catch a misread spec cheaply.

Before accepting any page as done, remind whoever reviews it: the previews were
never browser-reviewed by the design team, so anything that looks wrong should
be raised, not faithfully reproduced.

## 7. Known mismatches to raise, not solve silently

1. The design assumes a desktop-density table with three frozen columns.
   RN tables (`shared/components/ui/Table.tsx`) will not give this for free;
   agree the mobile behaviour before building step 2 and 3.
2. Confidence pills use a continuous oklch ramp on the web. RN colour support
   for `oklch()` is inconsistent across targets; `dp-theme.ts` does not include
   the ramp yet. Options: precompute bands, or gate the ramp to web. Raise it.
3. React 19 / RN 0.83: the reference components were type-checked against
   React 18 types. `tsc` in-repo is the authority.

These are also the three questions to expect back from Claude Code during the
step 2 and 3 sessions. Decide them once, record the decision here, and the
remaining pages inherit it.
