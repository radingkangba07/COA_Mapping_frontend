# Frontend handoff · Step 1 of 8 — Upload

Page-by-page handoff. This covers **Upload only**. One document per page; do not
begin a later page until this one is accepted.

Design status: **final and locked**. The kit reproduces the approved design with
zero differences.

---

## 1. What the developer receives

Five things. Nothing else is needed to build this page.

| # | Artefact | Purpose |
|---|---|---|
| 1 | `preview/Items · Upload.html` | The approved design. Open in a browser. This is the acceptance reference. |
| 2 | `preview/Customers · Upload.html` | The same design with different data. Proves nothing is Items-specific. |
| 3 | `dp-kit/css/dp-tokens.css` | Colour tokens, light + dark. Use verbatim. |
| 4 | `dp-kit/css/dp-semantics.css` | The semantic style layer. Use verbatim. |
| 5 | `dp-kit/types/entity.d.ts` | The API contract. TypeScript, compiles under `--strict`. |

Reference only, not to be shipped: `dp-kit/pages/upload.page.html` is the exact
markup and logic of the approved design. Read it when a detail is ambiguous.

---

## 2. What this page must do

Step 1 runs **before** any profiling. There is no profile, no field list, no
metrics — only a file the user has just dropped, parsed in the browser.

Four regions, top to bottom:

1. **Page header** — title, "Step 1 of 8", file line, Back, and a primary
   *Continue to Source Data Profile* button that is **disabled until a file is
   present**.
2. **Panel: 1. Source {Object}: Master Data** — drag-and-drop CSV dropzone
   showing the expected column names. Once a file is present it is replaced by a
   file card (name, row count, `Source` chip, Preview toggle, Remove).
3. **Panel: 2. Target System Format** — read-only. Target system badge, name,
   target record, and a `Target` chip.
4. **Sample File row** — name, description, `Load` and `Download`.
5. **Source File Preview** — a table of the first 8 rows, headers taken from the
   uploaded CSV. Collapsed until Preview is pressed.

There are **no stat cards**. They were removed in the final design: the preview
table carries the same information more directly, and measured counts belong on
step 2.

The page has **no Copilot panel**. Step 1 is the only step without one.

---

## 3. Build sequence

### Step 3.1 · Wire the two stylesheets, once for the whole app

```ts
import './dp-kit/css/dp-tokens.css';
import './dp-kit/css/dp-semantics.css';
```

Then never write a colour again. Colour comes from data-attributes:

```tsx
<span data-impact="clean">CSV</span>          // ✓
<span style={{ color: '#15803D' }}>CSV</span>  // ✗
```

On this page you need `data-impact="clean"` (the CSV badge, the Target chip),
`data-metrictone="blocker"` (the required-field asterisk, the Remove button) and
`data-find="warn"` (the missing-columns notice). That is the complete list.

### Step 3.2 · Accept the pack as a prop

```ts
import type { EntityPack } from './dp-kit/types/entity';

interface UploadPageProps {
  pack: EntityPack;          // from the API, see §4
  onContinue(): void;
}
```

The page reads **only** `pack.label`, `pack.source`, `pack.target` and
`pack.spec`. It must never read `pack.fields` — at step 1 there is nothing there.

### Step 3.3 · Build the five regions

Copy the layout from `preview/Items · Upload.html`. Every string that varies
comes from the pack:

| On screen | From the pack |
|---|---|
| "1. Source **Items**: Master Data" | `pack.label.plural` |
| "expects: SKU, Item Name, Item Type, UOM …" | `pack.spec.expectedColumns` (first 4, then `…`) |
| Target name and badge | project target system, **not** the pack |
| "product.template" | `pack.spec.targetNote` |
| "Source Items Sample" + description | `pack.spec.sample.name` / `.description` |
| Sample CSV content for Load/Download | `pack.spec.sample.content` |

### Step 3.4 · Implement the four behaviours

1. **Parse CSV** — quoted fields may contain commas. First row is the header.
2. **Column check** — compare the uploaded header against
   `pack.spec.expectedColumns`, matching case- and punctuation-insensitively.
   Show a `data-find="warn"` notice listing anything missing. Do not block.
3. **Load / Download sample** — Load parses `spec.sample.content` as if uploaded.
   Download saves it as `<entityId>-sample.csv`.
4. **Preview** — first 8 rows, headers from the CSV.

Reference implementations are in `dp-kit/js/dp-base.js`: `parseCSV()`,
`DPBase.colIndex()`, and `columnCheck()` in `pages/upload.page.html`.

### Step 3.5 · Start empty

The page must open as an **empty dropzone**. Do not pre-load the sample: a real
user has no file yet, and pre-filled data reads as "already imported".

The previews you were given *do* show the sample loaded — that is a preview
convenience so the whole design is visible in a static file. It is not the
shipped behaviour.

---

## 4. How this covers all nine master-data objects

**The developer builds this page once.** It is not duplicated per object.

```
GET /api/projects/:projectId/entities/:entityId/profile   →  EntityPack
```

```tsx
const { data: pack } = useQuery<EntityPack>({
  queryKey: ['pack', projectId, entityId],
  queryFn: () => api.get(`/projects/${projectId}/entities/${entityId}/profile`),
});
return <UploadPage pack={pack} onContinue={goToProfile} />;
```

Route `entityId` over the nine objects — `coa`, `customers`, `vendors`, `items`,
`locations`, `contacts`, `vehicles`, `equipment`, `fixedAssets` — and you have
nine Upload pages from one component.

**There must be no `if (entityId === 'items')` anywhere.** If one becomes
necessary, the pack is missing a field: extend `entity.schema.json`, regenerate
types, and populate it for every object. Do not branch in the component.

Evidence this holds: the Items and Customers builds produce **byte-identical
markup, 37,642 bytes each**. The only difference is the injected pack.

### Backend obligation

For each object the backend must serve a pack whose `spec` contains:

```jsonc
"spec": {
  "expectedColumns": ["Account No", "Customer Name", "VAT No", "…"],
  "sample": { "name": "…", "description": "…", "content": "<csv text>" },
  "targetNote": "res.partner"
}
```

Two exist today (`items`, `customers`) and can be used as fixtures. **Seven are
outstanding** — that is backend/config work, not frontend work.

---

## 5. Acceptance checks

Reviewed against `preview/Items · Upload.html`:

- [ ] Opens as an empty dropzone. No stat cards anywhere.
- [ ] *Continue* is disabled until a file is present.
- [ ] Dropzone lists the first four expected columns.
- [ ] Drag-and-drop and browse both work; quoted CSV fields survive.
- [ ] File card shows name, row count, `Source` chip.
- [ ] A CSV missing an expected column shows the amber notice and still proceeds.
- [ ] `Load` populates from the sample; `Download` saves it.
- [ ] Preview shows 8 rows with headers from the CSV.
- [ ] Target panel is read-only and shows the project's target system.
- [ ] No Copilot panel.
- [ ] Dark mode works with no extra CSS (tokens handle it).
- [ ] Swapping `entityId` from `items` to `customers` changes only text and data.
- [ ] `grep -r "#" src/UploadPage` finds no hex colours.

---

## 6. Known gaps — state these to the developer

- **`customers.entity.json` numbers are illustrative.** Structure and prose are
  real; the figures need a profiler run before any client sees them.
- **No profiler exists.** Packs are hand-authored today. Seven objects still need
  theirs. This is the critical path and it is backend work.
- **Nothing has been verified in a browser by me.** Checks run were: assembly,
  binding lint, colour audit, logic executed in Node, and `tsc --strict` on the
  contract. The previews are correct HTML but were not visually reviewed by a
  person other than you.
- **The `preview/` and `design/` folders are generated output.** They are
  overwritten on every build. Never edit them; edit `dp-kit/`.

---

## 7. Ownership

| Change | Who | Where |
|---|---|---|
| Anything on the Upload page for all objects | designer → me | `dp-kit/pages/upload.page.html` |
| Header, nav, sidebar, step bar, a colour | designer → me | `dp-kit/shell/`, `dp-kit/css/` |
| Expected columns, sample CSV, target note | backend | that object's pack |
| Real profiling figures | backend | profiler output |
| React implementation | frontend | app repo |

After any design change I run `dp-kit/build/build_all.sh`, which rebuilds every
page for every object and regenerates the previews. It prints `ALL GREEN` or
fails. A failure blocks handoff.
