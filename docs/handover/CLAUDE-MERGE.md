# CLAUDE-MERGE.md · block to append to the repo's root CLAUDE.md

COA_Mapping_frontend_V0 already has a root `CLAUDE.md`. Do not replace it —
append everything below the line to it, keeping the repo's existing rules
above. The handover's own `CLAUDE.md` is the DOM-flavoured original; this block
is the same five rules re-expressed for this Expo / React Native repo, with
paths that match `docs/handover/`. Where the two files differ, this one is
correct for this repo.

---

## Master-data wizard (dp-kit) rules

These apply to everything under `src/features/master-data-wizard/`. Full
background: `docs/handover/README.md` and `docs/handover/INTEGRATION.md`.

### Scope

8 steps (Upload · Profile · Mapping · Values · Formats · Validation · Test ·
Import) × 8 objects (Customers · Vendors · Items · Locations · Contacts ·
Vehicles · Equipment · Fixed Assets) = 64 screens, built as **8 page
components** driven by a per-object `EntityPack`. `entityId` is a route
parameter.

**COA is excluded by design.** It is the existing `features/migration/` flow,
already in production. `'coa'` is deliberately absent from the `EntityId`
type. Never route COA through the wizard, never import the wizard's kit into
`features/migration/`, and never modify `features/migration/` from a wizard
task.

### 1. Never write a colour

This is a React Native app: the kit's CSS files cannot be imported. Colour
comes from `semantic()` in `docs/handover/app/native/dp-theme.ts`, which
carries the same palettes and state mapping as the web CSS.

```tsx
<Badge {...semantic('impact', 'blocker', mode)} />   // ✓ meaning
<Badge color="#D72222" />                            // ✗ never
<Badge className="text-red-600" />                   // ✗ NativeWind colour classes count as colours
```

The four semantic families and their values (source of truth:
`docs/handover/app/config/dp-taxonomies.json`):

| Family | Values |
|---|---|
| `impact` | `blocker` `review` `warning` `resolved` `clean` `na` |
| `find` | `dup` `warn` `info` `ok` |
| `metricTone` | `blocker` `warn` `neutral` `ok` `info` `muted` |
| `prov` | `fact` `ai` `action` |

`semantic()` throws on an unknown state — that is intended. A missing state
means the taxonomy needs extending (raise it); it never means adding a local
colour. `dp-theme.ts` is generated; treat it as read-only.

### 2. Never branch on the entity

```tsx
if (entityId === 'items') { … }        // ✗ forbidden
const label = pack.label.plural;        // ✓
```

If a page seems to need entity-specific behaviour, the pack is missing a
field. Stop, say so, and propose a schema addition. Do not add the conditional.

### 3. Never hardcode a step label or number

Steps live in `docs/handover/app/config/dp-taxonomies.json` and render in the
wizard's own step rail. Do not reuse `shared/constants/migration-steps.ts` —
those are the COA flow's steps, and the two lists must be free to diverge.

### 4. Provenance is a correctness requirement, not styling

- `fact` — deterministic profiling output, reproducible by the backend
  profiler. The UI promises this to the user.
- `ai` — model inference. Must pass through the approval modal before it
  writes anything.
- `action` — a control the user invokes, or a value a human has set.

If a number cannot be recomputed by the profiler, it must not render as `fact`.

### 5. Every write goes through one approval component

One enforcement point, including writes the **user** initiates. On Field
Mapping a user can override the proposed target field; Save raises an approval
request, it does not write. After confirmation the row renders `prov: action`,
never `ai`, and the override is stored separately from the pack
(`MappingOverrides`) so a re-profile cannot silently overwrite a human
decision. Overrides carry `previousTargetId` for audit.

**There is no write endpoint yet.** Keep decisions (accepted / excluded /
overrides) in the feature's zustand store and raise the endpoint question; do
not invent a route.

### Definition of done, every wizard page

```bash
npx tsc --noEmit
grep -rnE "#[0-9A-Fa-f]{3,6}" src/features/master-data-wizard/ | grep -v dp-theme   # empty
grep -rn "entityId ==="       src/features/master-data-wizard/                      # empty
grep -rn "Step [0-9] of"      src/features/master-data-wizard/                      # empty
```

Plus: renders with **both** fixtures (`docs/handover/fixtures/`), and dark mode
works via `dpTheme.dark`.

### When you disagree

If a rule here blocks something that seems genuinely necessary, say so and
stop. Do not work around it. A previous iteration of these pages produced four
different shells, three step-label sets and 656 distinct inline styles — every
one started as a reasonable local exception.
