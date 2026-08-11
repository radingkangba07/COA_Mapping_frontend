# CLAUDE.md · DataPortation frontend

Place this file at the **root of the frontend repository**. Claude Code reads it
automatically on every session, so these rules apply without anyone having to
remember them.

---

## The product

DataPortation is a data-migration wizard. **8 steps** × **8 master-data objects**:

| Steps | Objects |
|---|---|
| Upload · Profile · Mapping · Values · Formats · Validation · Test · Import | Customers · Vendors · Items · Locations · Contacts · Vehicles · Equipment · Fixed Assets |

**COA is not on that list on purpose.** The Chart of Accounts flow is already
built and running; it is out of scope, `'coa'` is absent from the `EntityId`
type, and nothing in this wizard may reference it.

That is 64 screens. **We do not build 64 screens.** We build 8 page components,
each driven by a per-object JSON payload called an *entity pack*. `entityId` is a
route parameter.

This is not aspirational — it is verified. The Items and Customers builds of the
Upload page produce byte-identical markup, 37,642 bytes each. The only difference
is the pack.

---

## Five rules. Do not break these.

### 1. Never write a colour

Colour comes from `data-*` attributes defined in `dp-kit/css/dp-semantics.css`.

```tsx
<span data-impact="blocker">Blocker</span>              // ✓
<span style={{ color: 'var(--error)' }}>Blocker</span>   // ✗
<span style={{ color: '#D72222' }}>Blocker</span>        // ✗
<Pill variant="danger">Blocker</Pill>                    // ✗ reinvents the taxonomy
```

The five families:

| Attribute | Values |
|---|---|
| `data-impact` | `blocker` `review` `warning` `resolved` `clean` `na` |
| `data-find` | `dup` `warn` `info` `ok` |
| `data-metrictone` | `blocker` `warn` `neutral` `ok` `info` `muted` |
| `data-prov` | `fact` `ai` `action` |
| state | `data-hl` `data-dim` `data-sel` `data-active` `data-tab` `data-primary` `data-clickable` |

Import the two stylesheets once at app root and never edit them:

```ts
import './dp-kit/css/dp-tokens.css';
import './dp-kit/css/dp-semantics.css';
```

Light and dark mode both work with no extra CSS. If you find yourself writing a
colour, the answer is a data-attribute you have not used yet.

### 2. Never branch on the entity

```tsx
if (entityId === 'items') { … }                 // ✗ forbidden
const label = pack.label.plural;                 // ✓
```

If a page seems to need entity-specific behaviour, **the pack is missing a
field**. Stop, say so, and propose a schema addition. Do not add the conditional.

### 3. Never hardcode a step label or number

They live in `dp-kit/config/dp-taxonomies.json`. Four earlier prototypes each
invented their own list and ended up with three different label sets.

```tsx
const step = STEPS.find(s => s.id === 'upload');   // ✓
<div>Step 1 of 8</div>                              // ✗
```

### 4. Provenance is a correctness requirement, not styling

`data-prov` separates three things that must never blur:

- **`fact`** — deterministic profiling output. Must be reproducible by the
  backend profiler. The UI literally promises this to the user.
- **`ai`** — model inference. **Must** pass through the approval modal before it
  writes anything.
- **`action`** — a control the user invokes.

If a number cannot be recomputed by the profiler, it must not render under
`data-prov="fact"`.

### 5. Every write goes through one approval component

One enforcement point. If you add an inference anywhere, route it through the
approval modal. No exceptions, no shortcuts, no "just this once".

This includes writes the **user** initiates, not only ones the model proposes.
On Field Mapping a user can override the proposed target field. Saving that
override raises an approval request; it does not write:

```tsx
// ✓ Save asks; the parent writes only on confirm
onRequestChange({ fieldId, targetId: draft, previousTargetId: targetId })

// ✗ Save writes directly — breaks the invariant the product sells
onSave={() => mutate({ fieldId, targetId: draft })}
```

Two rules that follow from it:

- **A human-set target renders `data-prov="action"`, never `"ai"`.** Once a
  person owns the decision the UI must stop implying the model does.
- **Overrides are stored separately from the pack** (`MappingOverrides`). The
  pack is what the profiler produced; overrides are what a person decided. Never
  fold an override back into `proposals` — that destroys the audit trail and
  makes a re-profile silently overwrite human decisions.

See `TargetCell` in `app/react/components.tsx` for the shape of this.

---

## The contract

```
GET  /api/projects/:projectId/entities/:entityId/profile   →  EntityPack
```

Types: `dp-kit/types/entity.d.ts` — generated from the JSON schema, compiles
under `--strict`. Treat it as read-only; it is regenerated from
`dp-kit/config/entity.schema.json`.

**The write side is not specified yet.** The mapping page produces decisions —
accepted mappings, exclusions and manual target overrides — and there is no
agreed endpoint to persist them. The frontend can be built entirely against the
pack plus local state, but **raise this before wiring anything**; do not invent a
route. The payload the UI has available is:

```ts
import type { MappingOverrides, RetargetRequest } from '@/dp-kit/types/entity';
// accepted:  string[]            field ids the user accepted
// excluded:  string[]            field ids excluded from the migration
// overrides: MappingOverrides    fieldId -> targetField id ('' = deliberately unmapped)
```

Each entry in `overrides` must carry a `previousTargetId` in the audit record, so
"what did the model propose and what did the human change it to" is answerable
after the fact. That is a compliance question, not a UI one.

```ts
import type { EntityPack } from '@/dp-kit/types/entity';

const { data: pack } = useQuery<EntityPack>({
  queryKey: ['pack', projectId, entityId],
  queryFn: () => api.get(`/projects/${projectId}/entities/${entityId}/profile`),
});
```

The pack has two halves:

- **`spec`** — known *before* any file is uploaded. Step 1 uses only this.
- **`fields` / `readiness` / `metrics` / `mapping`** — produced *after* the
  profiler runs. Steps 2–8 use these. **Step 1 must never read `fields`** — at
  that point there is nothing there.

Fixtures for tests and Storybook: `dp-kit/config/entities/items.entity.json` and
`customers.entity.json`. Between them they exercise every optional branch in the
schema — sparse fields, `nearEmpty`, `range`, `dateProfile`, `invalidTable`,
missing `dist`. A component that renders both correctly will render the other
seven objects.

---

## Reading the previews — three traps

`preview/*.html` files are the visual specification. They are **statically
rendered**, which creates three hazards:

1. **The black "STATIC PREVIEW · … · not interactive" badge in the corner is not
   part of the design.** Do not build it.

2. **A preview shows one moment in time.** Anything behind a click is invisible.
   Where two states matter, two previews are supplied — e.g.
   `Items · Upload (empty state).html` and `Items · Upload.html`. **The
   `(empty state)` file is the page's real default.** The other shows a file
   already loaded, which is a preview convenience, not the landing state.

3. **Nothing in a preview is clickable.** Absence of interaction in the file is
   not a design decision.

When a detail is ambiguous, the authoritative source is
`dp-kit/pages/<step>.page.html` — the exact markup and logic of the approved
design. Read it. Do not guess.

---

## Definition of done, every page

```bash
npx tsc --noEmit                          # must pass under --strict
grep -rnE "#[0-9A-Fa-f]{3,6}" src/        # must return nothing
grep -rn "entityId ===" src/              # must return nothing
grep -rn "Step [0-9] of" src/             # must return nothing
```

Plus: renders correctly for **both** `items` and `customers` fixtures, and works
in dark mode with no additional CSS.

---

## When you disagree

If a rule here blocks something that seems genuinely necessary, **say so and stop**.
Do not work around it. These rules exist because a previous iteration produced
four different shells, three step-label sets and 656 distinct inline styles in a
few weeks. Every one of them started as a reasonable local exception.
