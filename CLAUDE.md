# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

COA (Chart of Accounts) Migration System — a tool for mapping and migrating chart of accounts between ERP systems (SAP, Oracle NetSuite, Microsoft Dynamics, QuickBooks, Sage, Xero, Odoo, Syspro, Accpac). Users upload Excel/CSV files, the system fuzzy-matches source accounts to target ERP fields, and exports mapped data. No AI — custom fuzzy matching via Levenshtein distance / token-ratio.

## Architecture

Three-service architecture orchestrated via Docker Compose:

- **api-service** (`services/api-service/`) — FastAPI (Python 3.11, async). The main backend. Runs on port 8001.
- **ml-service** (`services/ml-service/`) — RabbitMQ worker for heavy matching jobs. Currently a **stub** — matching runs synchronously in api-service's `matching_service.py`. Disabled by default in docker-compose.
- **frontend** (`frontend/`) — Universal Expo app (TypeScript). Targets Web, Android, iOS, Desktop. Uses NativeWind + custom components.

Infrastructure: PostgreSQL 15 (async via asyncpg + SQLAlchemy), RabbitMQ 3.12 for future async job processing.

> **Legacy CRA app**: The original Create React App frontend is preserved at `frontend-legacy/` for rollback reference. Do not modify it.

### API Service Internals

Two API surfaces coexist:
- **`/api/v1/*`** — New versioned API with proper models (projects, files, jobs, mappings). Routes in `app/api/v1/`.
- **`/api/*`** (legacy) — Backward-compatible endpoints in `app/api/legacy.py` that use **in-memory storage** (dicts, not DB).

Key layers: `app/api/` (routes) → `app/services/` (business logic) → `app/models/` (SQLAlchemy models) → `app/core/database.py` (async engine/sessions).

SQLAlchemy models: User, Company, Project, ProjectAccess, File, Job, Mapping (see `app/models/__init__.py`).

Config is via pydantic-settings (`app/core/config.py`), reading from env vars / `.env`.

### Frontend (Expo + TypeScript)

#### Technology Stack

| Concern | Library |
|---|---|
| Framework | Expo SDK (managed workflow) |
| Language | TypeScript (`strict: true` in tsconfig, paths aliased to `src/`) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Navigation | React Navigation (typed stacks + tabs) |
| State | Zustand + actions pattern (one store per feature) |
| Server State | TanStack Query v5 |
| Forms | react-hook-form + zod (`@hookform/resolvers/zod`) |
| HTTP | axios (typed instance with interceptors) |
| Icons | lucide-react-native |
| Notifications | react-native-toast-message |
| Storage | expo-secure-store (native) / localStorage (web) |
| File Picking | expo-document-picker (native) / input element (web) |
| Fonts | expo-font (Chivo, Inter, JetBrains Mono) |
| Testing | Jest + React Native Testing Library |

#### Feature-Sliced Architecture

The frontend uses a vertical-slice architecture. Each domain gets its own `features/{name}/` folder containing `components/`, `screens/`, `hooks/`, `store/`, `services/`, `mappers/`, `types/`.

**Features:**
- `auth/` — Login, register, session management
- `projects/` — Project CRUD, multi-user access, member roles
- `migration/` — Core COA mapping engine (5-step wizard: Upload → ERP Select → Mapping → Validation → Preview)
- `erp-config/` — ERP schema registry and adapter management
- `export/` — Export migrated COA to Excel/CSV

**Shared infrastructure** (`shared/`):
- `components/` — UI primitives (`ui/`), layout (`layout/`), forms (`forms/`), feedback (`feedback/`)
- `hooks/` — useDebounce, usePlatform, useToast, useConfirm
- `services/` — HTTP client + interceptors (`http/`), storage abstraction (`storage/`), validation utils
- `store/` — Global app store (theme, locale, connectivity)
- `types/` — `Result<T, E>` type, pagination, branded IDs, common types
- `utils/` — date, string, array, platform utilities
- `constants/` — ERP systems master list, confidence thresholds (HIGH/MEDIUM/LOW)

**Navigation** (`navigation/`):
- `RootNavigator.tsx` — Auth gate → App or Auth stack
- `AuthStack.tsx` — Login, Register, ForgotPassword
- `AppStack.tsx` — Projects, Migration, Export, ERP Config
- `MigrationStack.tsx` — Upload → ERPSelect → Mapping → Validation → Preview
- `AppTabs.tsx` — Projects | Active Migration | Settings
- `types.ts` — RootStackParamList, typed useAppNavigation

**Config** (`config/`):
- `env.ts` — Typed env vars via expo-constants
- `erp-registry.ts` — All ERP adapters registered here
- `theme.ts` — Design tokens (colors, spacing, typography from `design_guidelines.json`)

#### Folder Structure

```
frontend/
├── app.json                          # Expo config
├── eas.json                          # EAS Build profiles (dev / staging / prod)
├── babel.config.js
├── tsconfig.json                     # strict: true, paths aliased to src/
├── tailwind.config.js                # NativeWind theme config
├── .env.development
├── .env.staging
├── .env.production
│
└── src/
    ├── app/                          # Bootstrap — providers, global config
    │   ├── App.tsx                   # Root component
    │   └── providers/
    │       └── AppProviders.tsx      # Auth, theme, query, toast providers
    │
    ├── features/
    │   ├── auth/
    │   │   ├── components/           # LoginForm, RegisterForm, OTPInput
    │   │   ├── screens/              # LoginScreen, RegisterScreen, ForgotPasswordScreen
    │   │   ├── hooks/                # useAuthViewModel, useSessionGuard
    │   │   ├── store/
    │   │   │   ├── auth.store.ts     # Zustand store + actions
    │   │   │   └── auth.selectors.ts
    │   │   ├── services/
    │   │   │   └── auth.service.ts   # login, register, refresh, logout
    │   │   └── types/
    │   │       └── auth.types.ts     # User, Session, AuthState, AuthActions
    │   │
    │   ├── projects/
    │   │   ├── components/           # ProjectCard, ProjectList, MemberBadge
    │   │   ├── screens/              # ProjectsScreen, ProjectDetailScreen, NewProjectScreen
    │   │   ├── hooks/                # useProjectsViewModel, useProjectDetail
    │   │   ├── store/
    │   │   │   ├── projects.store.ts
    │   │   │   └── projects.selectors.ts
    │   │   ├── services/
    │   │   │   └── projects.service.ts
    │   │   └── types/
    │   │       └── projects.types.ts # Project, ProjectMember, ProjectRole
    │   │
    │   ├── migration/                # Core domain — COA migration engine
    │   │   ├── components/
    │   │   │   ├── FileUploader/     # Excel drag-drop / file picker (web + native)
    │   │   │   ├── FieldMappingTable/# Source ↔ target column mapper UI
    │   │   │   ├── MappingRuleCard/  # Individual mapping rule display
    │   │   │   ├── FuzzyMatchBadge/  # Confidence score indicator
    │   │   │   ├── ConflictResolver/ # Manual resolution UI for low-confidence matches
    │   │   │   └── MigrationStepper/ # Step 1→5 progress UI
    │   │   ├── screens/
    │   │   │   ├── UploadScreen/     # Step 1: upload source Excel
    │   │   │   ├── ERPSelectScreen/  # Step 2: pick source + target ERP
    │   │   │   ├── MappingScreen/    # Step 3: review/edit field mappings
    │   │   │   ├── ValidationScreen/ # Step 4: errors, warnings, manual fixes
    │   │   │   └── PreviewScreen/    # Step 5: final preview before export
    │   │   ├── hooks/
    │   │   │   ├── useMigrationViewModel.ts
    │   │   │   ├── useFileUpload.ts  # Platform-aware: DocumentPicker (native) / input (web)
    │   │   │   ├── useFuzzyMapper.ts # Runs mapping engine, returns scored results
    │   │   │   └── useValidation.ts  # Validates mapped rows against target ERP rules
    │   │   ├── store/
    │   │   │   ├── migration.store.ts
    │   │   │   └── migration.selectors.ts
    │   │   ├── services/
    │   │   │   ├── excel.service.ts       # Parse Excel → MigrationRow[]
    │   │   │   ├── mapping.service.ts     # Orchestrates fuzzy + rule-based mapping
    │   │   │   ├── fuzzy.service.ts       # Levenshtein / token-ratio logic (no AI)
    │   │   │   ├── validation.service.ts  # Per-ERP validation rules
    │   │   │   └── migration.service.ts   # CRUD for migration jobs (API calls)
    │   │   ├── mappers/
    │   │   │   ├── source/           # One file per supported ERP
    │   │   │   │   ├── sap.mapper.ts
    │   │   │   │   ├── sage.mapper.ts
    │   │   │   │   ├── xero.mapper.ts
    │   │   │   │   ├── quickbooks.mapper.ts
    │   │   │   │   ├── netsuite.mapper.ts
    │   │   │   │   ├── dynamics365.mapper.ts
    │   │   │   │   ├── odoo.mapper.ts
    │   │   │   │   ├── syspro.mapper.ts
    │   │   │   │   ├── accpac.mapper.ts
    │   │   │   │   └── generic.mapper.ts  # Fallback for unknown ERPs
    │   │   │   └── target/           # Mirror of source/ — same ERP list
    │   │   │       └── ...
    │   │   └── types/
    │   │       ├── migration.types.ts     # MigrationJob, MigrationRow, MigrationStatus
    │   │       ├── mapping.types.ts       # FieldMapping, MappingRule, ConfidenceScore
    │   │       └── erp.types.ts           # ERPSystem, ERPFieldSchema, ERPAdapter
    │   │
    │   ├── erp-config/               # ERP schema registry + admin management
    │   │   ├── components/           # ERPCard, FieldSchemaTable, AdapterStatusBadge
    │   │   ├── screens/              # ERPListScreen, ERPDetailScreen
    │   │   ├── hooks/                # useERPConfig, useAdapterRegistry
    │   │   ├── store/
    │   │   │   ├── erp-config.store.ts
    │   │   │   └── erp-config.selectors.ts
    │   │   ├── services/
    │   │   │   └── erp-config.service.ts
    │   │   └── types/
    │   │       └── erp-config.types.ts
    │   │
    │   └── export/                   # Export migrated COA to target format
    │       ├── components/           # ExportFormatPicker, ExportProgressBar
    │       ├── screens/              # ExportScreen
    │       ├── hooks/                # useExportViewModel
    │       ├── store/
    │       │   ├── export.store.ts
    │       │   └── export.selectors.ts
    │       ├── services/
    │       │   ├── excel-writer.service.ts  # Write output Excel file
    │       │   ├── csv-writer.service.ts
    │       │   └── export.service.ts        # Orchestrates format + download
    │       └── types/
    │           └── export.types.ts   # ExportFormat, ExportJob, ExportResult
    │
    ├── shared/
    │   ├── components/
    │   │   ├── ui/                   # Button, Input, Select, Checkbox, Badge, Tooltip
    │   │   ├── layout/               # Screen, Card, Divider, Stack, Row
    │   │   ├── forms/                # FormField, FormError, FormLabel
    │   │   └── feedback/             # Toast, Spinner, EmptyState, ErrorBoundary
    │   ├── hooks/
    │   │   ├── useDebounce.ts
    │   │   ├── usePlatform.ts        # Platform.OS helpers, breakpoints
    │   │   ├── useToast.ts
    │   │   └── useConfirm.ts
    │   ├── services/
    │   │   ├── http/
    │   │   │   ├── http.client.ts    # Axios instance, interceptors (auth + error)
    │   │   │   └── http.types.ts
    │   │   ├── storage/
    │   │   │   ├── storage.service.ts  # expo-secure-store (native) / localStorage (web)
    │   │   │   └── storage.types.ts
    │   │   └── validation/
    │   │       └── validation.utils.ts # Zod schemas shared across features
    │   ├── store/
    │   │   └── app.store.ts          # Global: theme, locale, connectivity
    │   ├── types/
    │   │   ├── result.types.ts       # Result<T, E> — ok/err pattern
    │   │   ├── pagination.types.ts
    │   │   └── common.types.ts       # Branded IDs, DeepReadonly, etc.
    │   ├── utils/
    │   │   ├── date.utils.ts
    │   │   ├── string.utils.ts
    │   │   ├── array.utils.ts
    │   │   └── platform.utils.ts     # Web vs native conditionals
    │   └── constants/
    │       ├── erp-systems.ts        # Master list of supported ERPs + metadata
    │       └── mapping-confidence.ts # HIGH/MEDIUM/LOW thresholds
    │
    ├── navigation/
    │   ├── RootNavigator.tsx         # Auth gate → App or Auth stack
    │   ├── types.ts                  # RootStackParamList, typed useAppNavigation
    │   ├── stacks/
    │   │   ├── AuthStack.tsx
    │   │   ├── AppStack.tsx
    │   │   └── MigrationStack.tsx    # Upload → ERPSelect → Mapping → Validation → Preview
    │   └── tabs/
    │       └── AppTabs.tsx           # Projects | Active Migration | Settings
    │
    └── config/
        ├── env.ts                    # Typed env vars via expo-constants
        ├── erp-registry.ts           # All ERP adapters registered here
        └── theme.ts                  # Design tokens (colors, spacing, typography)
```

#### Zustand + Actions Pattern

Each feature has its own independent Zustand store. No global mega-store.

```typescript
// features/migration/store/migration.store.ts
interface MigrationState {
  currentStep: number;
  sourceERP: ERPSystem | null;
  targetERP: ERPSystem | null;
  sourceData: MigrationRow[];
  groupedMappings: TypeGroupMapping[];
  isLoading: boolean;
  error: AppError | null;
}

interface MigrationActions {
  setStep: (step: number) => void;
  setSourceERP: (erp: ERPSystem) => void;
  setTargetERP: (erp: ERPSystem) => void;
  loadSourceData: (rows: MigrationRow[]) => void;
  updateMapping: (groupIndex: number, accountIndex: number, update: Partial<AccountMapping>) => void;
  reset: () => void;
}

export const useMigrationStore = create<MigrationState & MigrationActions>((set) => ({
  // state + actions collocated
}));
```

```typescript
// features/migration/store/migration.selectors.ts
export const selectHighConfidenceMappings = (state: MigrationState) =>
  state.groupedMappings.filter(g => g.confidence > 90);
```

#### Clean Architecture Layers (within each feature)

Dependencies flow one direction: **Screens → Hooks → Store → Services → HTTP Client**. Never skip layers.

| Layer | Folder | Responsibility | Imports from |
|---|---|---|---|
| Types | `types/` | Domain entities, value objects. Pure TS, zero framework imports. | Nothing |
| Services | `services/` | Business logic + API calls. Return `Result<T, E>`. | `types/`, `shared/services/http/` |
| Mappers | `mappers/` | Transform API responses ↔ domain types. One file per ERP. | `types/` |
| Store | `store/` | Zustand state + actions. Calls services, exposes state. | `services/`, `types/` |
| Hooks | `hooks/` | ViewModel hooks. Compose store selectors + TanStack Query. | `store/`, `types/` |
| Screens | `screens/` | Route-level components. Consume ViewModel hooks. Layout only. | `hooks/`, `components/` |
| Components | `components/` | Presentational. Props in, callbacks out. No store access. | `shared/components/`, `types/` |

#### SOLID Principles — Concrete Rules

**Single Responsibility (SRP):**
- One file = one export = one concern.
- Max 200 lines per component file. If it grows, extract sub-components or a ViewModel hook.
- Screens own layout only. ViewModel hooks own orchestration only. Services own logic only.

**Open/Closed (OCP):**
- ERP mappers are the extension point. Add a new ERP by creating a new `{erp}.mapper.ts` file in both `mappers/source/` and `mappers/target/`, then register it in `config/erp-registry.ts`. Never modify existing mappers to support a new ERP.
- Theme tokens in `config/theme.ts` are the extension point for visual changes. Components consume tokens, never hardcode colors/spacing.

**Liskov Substitution (LSP):**
- All ERP mappers implement the same `ERPAdapter` interface. Any mapper can be swapped without changing calling code.
- All services that return data use `Result<T, E>` consistently — never mix throwing and returning for the same operation.

**Interface Segregation (ISP):**
- One Zustand store per feature, not one mega-store. A feature's store exposes only the state and actions that feature needs.
- Services split by concern within a feature (e.g., `fuzzy.service.ts`, `validation.service.ts`, `excel.service.ts` are separate — not one monolithic service).

**Dependency Inversion (DIP):**
- Screens never import services directly — they go through ViewModel hooks.
- Components never import stores directly — they receive data via props.
- Services depend on the shared HTTP client abstraction (`http.client.ts`), not on axios directly.
- The `config/erp-registry.ts` is the only place that wires concrete ERP mapper implementations to the mapper interface.

#### Key Patterns

**Service returning Result<T,E>:**
```typescript
// features/projects/services/projects.service.ts
export async function getProjects(client: HttpClient): Promise<Result<Project[], AppError>> {
  try {
    const response = await client.get<ProjectDTO[]>('/api/v1/projects');
    return Result.ok(response.data.map(toProject));
  } catch (error) {
    return Result.err(toAppError(error));
  }
}
```

**ViewModel hook using store + TanStack Query:**
```typescript
// features/projects/hooks/useProjectsViewModel.ts
export function useProjectsViewModel() {
  const store = useProjectsStore();

  const query = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(httpClient),
  });

  return {
    projects: query.data?.value ?? [],
    isLoading: query.isLoading,
    error: query.data?.error ?? null,
    refetch: query.refetch,
  };
}
```

**HTTP client with interceptors:**
```typescript
// shared/services/http/http.client.ts
export function createHttpClient(getToken: () => string | null): AxiosInstance {
  const client = axios.create({
    baseURL: env.API_BASE_URL,  // from config/env.ts
    timeout: 30000,
  });

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) { /* trigger logout */ }
      return Promise.reject(error);
    }
  );

  return client;
}
```

#### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Feature folders | kebab-case | `erp-config/` |
| Store files | `{feature}.store.ts` | `migration.store.ts` |
| Selector files | `{feature}.selectors.ts` | `migration.selectors.ts` |
| Service files | `{name}.service.ts` | `fuzzy.service.ts` |
| Type files | `{name}.types.ts` | `mapping.types.ts` |
| Mapper files | `{erp}.mapper.ts` | `sap.mapper.ts` |
| Screen components | `{Name}Screen` in PascalCase | `MappingScreen.tsx` |
| Hook files | `use{Name}.ts` | `useFuzzyMapper.ts` |
| UI components | PascalCase.tsx | `FuzzyMatchBadge.tsx` |
| Utility files | `{name}.utils.ts` | `string.utils.ts` |
| Constant files | `{name}.ts` in kebab-case | `mapping-confidence.ts` |
| Boolean state/props | `is`/`has`/`should` prefix | `isLoading`, `hasError` |
| Event handler props | `on` prefix | `onPress`, `onSubmit` |

#### What NOT To Do

1. **No god components.** Max 200 lines per file. The legacy CRA `App.js` (3100 lines, preserved in `frontend-legacy/`) is the anti-pattern this architecture avoids.
2. **No direct API calls in screens or components.** All HTTP goes through services. A screen must never import axios.
3. **No business logic in the presentation layer.** Confidence scoring, type mapping, fuzzy matching, validation — these belong in services, not hooks or components.
4. **No `any` types.** Use `unknown` + type guards when the type is genuinely dynamic. Comment `// TODO: type properly` if temporarily unavoidable.
5. **No hardcoded colors or spacing.** Use theme tokens from `config/theme.ts`. Hardcoded hex values in components are a bug.
6. **No `useState` for server data.** Use TanStack Query for anything fetched from the API. Local UI state (modals, form inputs) is fine with `useState`.
7. **No cross-layer imports.** Screens never import services. Components never import stores. Follow the dependency chain: Screens → Hooks → Store → Services.
8. **No AsyncStorage for auth tokens.** Use expo-secure-store on native, localStorage on web (via `shared/services/storage/`).
9. **No hardcoded API URLs.** Base URL lives in `config/env.ts`, configured per environment (.env.development, .env.staging, .env.production).
10. **No barrel exports** (`index.ts` re-exporting everything). Import directly from source files to avoid circular dependencies and bundle bloat.
11. **No duplicate service functions for the same API endpoint.** Each backend endpoint must have exactly one service function that handles the HTTP call and response validation (zod schema). If multiple hooks need data from the same endpoint in different shapes, they must consume the single service function and map the result to their domain type — not create a second service with its own schema. Use shared TanStack Query cache keys so the endpoint is called once.

#### Platform Notes

This is a universal app — code must work on Web, Android, iOS, and Desktop. Platform-specific logic is isolated in:
- `shared/hooks/usePlatform.ts` — Platform.OS helpers, breakpoints
- `shared/utils/platform.utils.ts` — Web vs native conditionals
- `shared/services/storage/storage.service.ts` — expo-secure-store (native) / localStorage (web)
- `features/migration/hooks/useFileUpload.ts` — expo-document-picker (native) / input element (web)

#### Migration Engine Notes

- No AI — custom fuzzy matching via Levenshtein distance / token-ratio in `features/migration/services/fuzzy.service.ts`.
- One mapper file per supported ERP under `features/migration/mappers/source/` and `mappers/target/`.
- Adding a new ERP = new mapper file + register in `config/erp-registry.ts`. Existing code does not change.
- The frontend targets **`/api/v1/*` endpoints exclusively**. Do not use legacy `/api/*` endpoints.

### Object Storage

Pluggable storage via `storage_service.py` — supports Emergent (default), Cloudflare R2, DigitalOcean Spaces. See `docs/STORAGE.md`.

## Commands

### Docker (full stack)
```bash
cd infrastructure/docker
docker-compose up                    # api + postgres + rabbitmq + frontend
docker-compose --profile ml up      # include ml-service worker
```

### API Service (standalone)
```bash
cd services/api-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
npx expo install              # install dependencies
npx expo start                # dev server (Expo Go / dev client)
npx expo start --web          # web target
npx expo run:android          # native Android build
npx expo run:ios              # native iOS build
npm test                      # jest + React Native Testing Library
```

### Backend Integration Tests
```bash
python backend_test.py   # runs against a live API instance
```

### CI
Each service has its own GitHub Actions workflow (`.github/workflows/`), triggered by changes to its directory:
- `frontend.yml` — triggered by `frontend/**` changes: runs TypeScript check + Jest tests
- `api-service.yml` — triggered by `services/api-service/**` changes: runs `pytest tests/ -v --tb=short` with a Postgres service container

## Design Guidelines

The frontend follows a strict design system defined in `design_guidelines.json`:
- Fonts: Chivo (headings), Inter (body), JetBrains Mono (account numbers, scores) — loaded via expo-font
- Icon library: lucide-react-native
- Notifications: react-native-toast-message
- Confidence scores color-coded: Green (#16A34A) >90%, Yellow (#D97706) 70-89%, Red (#DC2626) <70% — defined in `shared/constants/mapping-confidence.ts`
- UI built with NativeWind + custom components in `shared/components/ui/`

## Key Technical Details

- Database uses **async** SQLAlchemy throughout (asyncpg driver). The `get_db` dependency yields `AsyncSession`.
- Fuzzy matching uses `rapidfuzz` (fuzz.WRatio scorer) on the backend. Core logic is in `matching_service.py` — both column-level matching and hierarchical account-type grouping.
- ERP system configs (fields, account types, type mappings) are hardcoded in `erp_service.py`, not in the database.
- The frontend targets `/api/v1/*` endpoints exclusively. Legacy `/api/*` endpoints are not used by the frontend.
- Tables are auto-created via `Base.metadata.create_all` on startup (no Alembic migrations running yet, though alembic is in requirements).
