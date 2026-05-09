# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev             # Vite frontend only (:5173)
npm run dev:server      # Express (:8791) + Vite (:5173) concurrently — traditional local dev
npm run dev:functions   # EdgeOne Pages dev server (cloud functions + Vite, port :8088)
npm run server          # Express backend only
npm run client          # Vite frontend only
npm run build           # Production frontend build (vite build → dist/)
npm run start           # Production Express server
```

Default admin: `admin` / `Physics@2026`. Override via `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars.

There are no tests, linters, or type-checking in this project.

## Architecture

**Physics Club Points System** (物理社积分系统) — a double-entry ledger-based points system for a four-group student club, with MUI-styled React frontend and Express backend.

### Data model

The core is a **double-entry ledger**: every point adjustment creates at least two offsetting entries (e.g., +100 to a member account and -100 to the shared pool). This guarantees the books balance. Three operation types:
- `member_adjustment`: member ↔ shared pool
- `pool_adjustment`: shared pool ↔ external calibration
- All operations are recorded in both `ledger_*` and `operation_*` KV keys

**Entities**: users (4 roles: public/member/planner/admin), invites (single-use or multi-use codes tied to a group), settings (per-view visibility), and statistics (manually recalculated snapshots).

**Four fixed groups** with color-coded identities: 奇点 (Singularity), 星云 (Nebula), 脉冲星 (Pulsar), 磁陀星 (Magnetar). Registration requires a valid invite code and auto-assigns the member to the invite's group.

### Backend (`server/`)

- **Entry point**: `server/index.js` — Express app with all routes. Uses an `asyncRoute()` wrapper to catch async errors. In production, serves `dist/` as static files.
- **Auth**: `server/auth.js` — JWT-based. Three middlewares: `authMiddleware` (required), `optionalAuthMiddleware` (populates `req.user` if token present), `requireAdmin`. Tokens signed with `JWT_SECRET` env var (default: `dev-only-change-this-secret`).
- **Business logic**: `server/services/database.js` — the entire application logic lives here (~670 lines). Contains user CRUD, invite system, ledger operations, leaderboard computation, statistics recalculation, and visibility/permission checks. No external database — everything goes through the KV store.
- **Storage abstraction**: `server/storage/kvStore.js` — `put/get/delete/list` interface matching EdgeOne Pages KV API. Two implementations: `FileKVStore` (local files in `data/kv/`, default) and `EdgeOneKVStore` (production). Switch via `KV_DRIVER=edgeone` env var. Use `getJSON()`/`setJSON()` helpers for structured data.

**Route convention**: All API routes are under `/api/`. Auth routes at `/api/auth/*`, admin routes at `/api/admin/*`. The `/api/app` endpoint is the bootstrap — it returns the current user, groups, settings, and capabilities in one call.

### Frontend (`src/`)

- **Entry**: `src/main.jsx` → renders `<App />`
- **App component** (`src/App.jsx`): Central state management. Holds `appState`, `activePage` (client-side routing), and all data (leaderboard, ledger entries, statistics). On mount, calls `/api/app` to determine what the user can see, then conditionally fetches data. Passes data and callbacks down to page components.
- **API client** (`src/api.js`): Thin wrapper around `fetch`. Stores JWT in `localStorage` under `physics_points_token`. Every request auto-attaches the `Authorization: Bearer` header.
- **Layout** (`src/layout/AppShell.jsx`): Responsive sidebar + topbar layout. Sidebar nav items are conditionally shown based on `capabilities.views`. Desktop shows a persistent drawer; mobile uses a temporary drawer. User menu with profile/logout in the topbar.
- **Feature pages** are organized under `src/features/`:
  - `auth/AuthPanel.jsx` — login/register forms
  - `dashboard/` — overview (group rankings + top members), member directory, statistics viewer
  - `logs/PublicPoolPage.jsx` — public pool ledger + personal ledger (`MyLedgerPage`)
  - `admin/AdminPage.jsx` — user management, invite codes, point adjustments (single + batch), pool adjustments, visibility settings, statistics recalculation
  - `profile/ProfileMenu.jsx` — change display name, change password
- `src/components/Surface.jsx` — reusable MUI Paper wrapper
- `src/utils/format.js` — date/time formatting, role labels, signed number display
- `src/styles.css` — layout grid CSS (sidebar, topbar, responsive breakpoints)

### Visibility system

Each "view" (publicPool, overview, members, myLedger, statistics) has a configurable minimum role. Admins can change these in the admin panel. The `canView()` function in `server/services/database.js` enforces this. The frontend receives `capabilities.views` from `/api/app` and hides/show navigation and pages accordingly.

### KV key naming

All keys follow predictable prefixes: `user_<id>`, `username_<sha256>`, `invite_<CODE>`, `ledger_<timestamp>_<id>`, `operation_<timestamp>_<id>`, `settings_app`, `stats_current`. The `listJSONByPrefix()` helper paginates through keys with a given prefix to reconstruct collections.
