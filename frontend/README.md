# COA Migration Frontend

Universal Expo app for mapping and migrating Chart of Accounts between ERP systems. Targets Web, iOS, and Android.

## Tech Stack

| Concern | Library |
|---------|---------|
| Framework | Expo SDK (managed workflow) |
| Language | TypeScript (`strict: true`) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Navigation | React Navigation (typed stacks + tabs) |
| State | Zustand (one store per feature) |
| Server State | TanStack Query v5 |
| Forms | react-hook-form + zod |
| HTTP | axios (typed instance with interceptors) |
| Icons | lucide-react-native |
| Notifications | react-native-toast-message |
| Storage | expo-secure-store (native) / localStorage (web) |
| File Picking | expo-document-picker (native) / input element (web) |
| Fonts | expo-font (Chivo, Inter, JetBrains Mono) |
| Testing | Jest + React Native Testing Library |

## Getting Started

```bash
# Install dependencies
npx expo install

# Start dev server (Expo Go / dev client)
npx expo start

# Web target
npx expo start --web

# Native builds
npx expo run:android
npx expo run:ios

# Run tests
npm test
```

The web app runs at [http://localhost:8081](http://localhost:8081) by default.

## Environment Configuration

Create environment files for each target:

| File | Purpose |
|------|---------|
| `.env.development` | Local dev — `API_BASE_URL=http://localhost:8001` |
| `.env.staging` | Staging server |
| `.env.production` | Production server |

The API base URL is configured via `src/config/env.ts` and read through `expo-constants`.

## Project Structure

```
src/
├── app/                    # Bootstrap — providers, root component
├── features/
│   ├── auth/               # Login, session management
│   ├── projects/           # Project CRUD, member roles
│   ├── migration/          # Core 5-step COA mapping wizard
│   ├── erp-config/         # ERP schema registry and adapters
│   └── export/             # Export mapped COA to Excel/CSV
├── shared/
│   ├── components/         # UI primitives, layout, forms, feedback
│   ├── hooks/              # useDebounce, usePlatform, useToast
│   ├── services/           # HTTP client, storage, validation
│   ├── store/              # Global app store (theme, locale)
│   ├── types/              # Result<T,E>, pagination, common types
│   ├── utils/              # Date, string, array, platform utilities
│   └── constants/          # ERP systems list, confidence thresholds
├── navigation/             # React Navigation stacks, tabs, types
└── config/                 # env, theme tokens, ERP adapter registry
```

Each feature follows a vertical-slice architecture: `types/ → services/ → store/ → hooks/ → components/ → screens/`.

## Migration Wizard Flow

The core workflow is a 5-step wizard:

1. **ERP Select** — pick source and target ERP systems
2. **File Upload** — upload source COA, target COA, and optional type mapping Excel/CSV files
3. **Type Mapping** — review and edit auto-matched account type pairs (source type to target type)
4. **Account Mapping** — review grouped account mappings with confidence scores (High >= 90%, Medium 70-89%, Low < 70%)
5. **Export Preview** — final preview of all mappings, download as Excel

## Supported ERP Systems

SAP, Oracle NetSuite, Microsoft Dynamics 365, QuickBooks, Sage Intacct, Xero, Odoo (stub), Syspro (stub), Accpac (stub).

Adding a new ERP: create a mapper file in `src/features/migration/mappers/source/` and `mappers/target/`, then register it in `src/config/erp-registry.ts`.

## API

The frontend targets `/api/v1/*` endpoints exclusively, served by the FastAPI backend on port 8001. Key endpoint groups:

- `/api/v1/erp-systems` — ERP metadata, sample data, account types
- `/api/v1/projects` — Project CRUD
- `/api/v1/files` — File upload and data retrieval
- `/api/v1/mappings` — Hierarchical mapping, bulk operations, export
- `/api/v1/jobs` — Async job tracking
- `/api/v1/auth` — Authentication (currently mock)

## Design System

Defined in `design_guidelines.json` and implemented via NativeWind + `src/config/theme.ts`:

- **Fonts**: Chivo (headings), Inter (body), JetBrains Mono (account numbers, scores)
- **Confidence colors**: Green (#16A34A) >= 90%, Yellow (#D97706) 70-89%, Red (#DC2626) < 70%
- **Radius**: 8px (0.5rem) default
- **Container**: `max-w-7xl` centered with responsive padding

## Docker

Run the full stack from the repository root:

```bash
cd infrastructure/docker
docker-compose up    # api + postgres + rabbitmq + frontend
```