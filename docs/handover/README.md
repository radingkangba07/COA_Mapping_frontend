# DataPortation frontend handover · steps 1–3

Everything needed to build the Upload, Source Data Profile and Field Mapping
pages. Nothing else is required.

> **Integrating into COA_Mapping_frontend_V0?** Read `INTEGRATION.md` first.
> That repo is Expo / React Native: the CSS files below become reference-only
> and `app/native/dp-theme.ts` takes their place. Where INTEGRATION.md and this
> file disagree, INTEGRATION.md wins.

---

## These pages mount inside the existing app

The parent application already renders the **top header**, the
**Projects / Migration / Settings rail** and the **project aside** (L124, Project
ID, Created at, source → target). Do not rebuild any of those.

**You build only the wizard region:**

```
┌─ parent app ────────────────────────────────────────────────┐
│ header                                                      │
├────┬───────────┬────────────────────────────────────────────┤
│    │  project  │  ╔══ YOU BUILD THIS ══════════════════╗    │
│nav │  aside    │  ║ 8-step rail                        ║    │
│rail│           │  ║ page header + body    │ Copilot    ║    │
│    │           │  ╚════════════════════════════════════╝    │
└────┴───────────┴────────────────────────────────────────────┘
```

`spec/region/` shows exactly that — the same pages with the parent app's chrome
removed. **Start there.** The files in `spec/` include the chrome for context, but
it is not yours to build.

---

## Five folders

| Folder | What it is | Rule |
|---|---|---|
| `app/` | Ships in the product | **Use verbatim. Do not edit.** |
| `spec/region/` | **Your scope** — chrome removed | Start here |
| `spec/` | Full page, chrome included, for context | Read only. Never ship. |
| `fixtures/` | Two real entity packs | Test data / Storybook |
| `reference/` | Exact markup + logic of the design | Read when a preview is ambiguous |

Plus `CLAUDE.md` — the rules. If the frontend repo has no root CLAUDE.md, copy
it there; Claude Code reads it automatically, so the rules apply without anyone
remembering them. **COA_Mapping_frontend_V0 already has one — append
`CLAUDE-MERGE.md` to it instead** (the same rules, re-expressed for that repo).

And `HANDOFF-01-Upload.md` — the step-by-step build sheet for step 1, including
acceptance criteria. One of these per page.

---

## Day one, in order

1. Copy `CLAUDE.md` to the repo root.
2. Import the two stylesheets once, at app root:
   ```ts
   import './dp-kit/css/dp-tokens.css';
   import './dp-kit/css/dp-semantics.css';
   ```
   After this, **never write a colour again** — see the rule below.

   **Both stylesheets are scoped to `.dp-wizard`.** Every rule sits under that
   class, so nothing leaks into the parent app. Wrap the wizard region in it:

   ```tsx
   <div className="dp-wizard" data-theme={theme} data-density="comfortable">
     … step rail, page body, Copilot …
   </div>
   ```

   Without that wrapper **no styling applies at all** — that is the intended
   trade for not touching the parent app. Two consequences:

   - A table only gets frozen leading columns if it carries `data-dp-table`.
     Tables without it scroll normally, so the parent app's tables are unaffected.
   - `box-sizing: border-box` applies inside `.dp-wizard` only. If the parent app
     does not already set it globally, check nothing inside the wizard depends on
     the parent's box model.

   **Fonts:** the design uses **Chivo**, **Inter** and **JetBrains Mono**. Confirm
   the parent app loads them; the stylesheets do not.
3. Wire the contract:
   ```ts
   import type { EntityPack } from './dp-kit/types/entity';
   // GET /api/projects/:projectId/entities/:entityId/profile  ->  EntityPack
   ```
   The **write side is not specified** — accepted mappings, exclusions and manual
   target overrides have no agreed endpoint. Build against the pack plus local
   state and raise it; do not invent a route. See `CLAUDE.md` → The contract.
4. Open `spec/Items · Upload (empty state).html` and read
   `HANDOFF-01-Upload.md`. Build that page.
5. Render it with **both** fixtures. If Customers looks wrong, something leaked.

---

## The three rules that matter

**1. Colour comes from data-attributes, never from CSS or props.**

```tsx
<span data-impact="blocker">Blocker</span>   // ✓
<Pill variant="danger">Blocker</Pill>        // ✗ reinvents the taxonomy
```

Families: `data-impact` · `data-find` · `data-metrictone` · `data-prov` · plus
state attributes. Light and dark both work with no extra CSS.

**2. Never branch on the entity.** No `if (entityId === 'items')`. Eight page
components serve all eight objects; a conditional is the first step back to 64
pages. If one seems necessary, the **pack is missing a field** — say so.

**3. Nothing writes without passing through the approval modal.**
`data-prov="fact"` is a promise that a number is reproducible by the profiler.
Treat it as correctness, not styling.

This covers user-initiated writes too. On Field Mapping a user can override the
proposed target field; Save raises an approval request rather than writing, the
row then renders `data-prov="action"` instead of `"ai"`, and the override is
persisted **separately** from the pack (`MappingOverrides`) so a re-profile
cannot silently overwrite a human decision. `TargetCell` in
`app/react/components.tsx` shows the shape.

---

## Reading `spec/` — three traps

1. The black **"STATIC PREVIEW"** badge in the corner is not part of the design.
2. A preview is **one moment**. States that need a click have their own file in
   `spec/states/`:

   | State file | What it shows |
   |---|---|
   | `readiness expanded` | The banner opened, with its evidence |
   | `page 2 of 3` | Pagination mid-set |
   | `filter open` | The source-field filter dropdown |
   | `detail panel open` | The row drawer |
   | `target picker open` | The inline target dropdown on a row |
   | `target set manually` | A row after an override was approved |
   | `empty state` | Upload before a file is dropped |

   For Upload, **`(empty state)` is the real default**; the other shows a file
   already loaded, which is a preview convenience.
3. Nothing is clickable. Absence of interaction is not a design decision.

---

## Definition of done, per page

```bash
npx tsc --noEmit                          # must pass
grep -rnE "#[0-9A-Fa-f]{3,6}" src/        # must be empty
grep -rn "entityId ===" src/              # must be empty
```

Plus: renders correctly for **both** fixtures, and works in dark mode with no
extra CSS.

---

## Scope

8 steps × 8 master-data objects. COA is excluded — already built and running,
do not touch it.

| Step | Status |
|---|---|
| 1 Upload · 2 Source Data Profile · 3 Field Mapping | **In this handover** |
| 4 Values · 6 Validation · 7 Test · 8 Import | Design not final |
| 5 Formats | Not designed |

---

## Known gaps — read before estimating

- **Only 2 of 8 entity packs exist.** Vendors, Locations, Contacts, Vehicles,
  Equipment and Fixed Assets are outstanding. That is backend/config work, and it
  is the critical path — every page can be built against the two fixtures, but
  nothing runs on real data until those land.
- **`customers.entity.json` figures are illustrative.** Structure and prose are
  real; the numbers need a profiler run before a client sees them.
- **No profiler exists yet.** Packs are hand-authored today.
- **The designs have not been reviewed in a browser by the design team**, only
  verified by assembly, binding lint, colour audit, logic executed in Node, and
  `tsc --strict`. Raise anything that looks wrong rather than assuming it is
  intentional.
