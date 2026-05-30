# C3 Desktop UI Foundation

Electron + React + TypeScript + Vite foundation for a process-monitoring desktop app.

This milestone intentionally focuses on shell architecture, typed contracts, and UI behavior with mock data. Real process discovery/control is out of scope for now.

## What Is Included

- Electron main process bootstrap with safe preload bridge.
- Shared domain and IPC contracts used across main, preload, and renderer.
- Feature-oriented renderer shell centered on a process list dashboard.
- Process list states: loading, populated, empty, error.
- Row selection and detail panel placeholder.
- Action affordances (start/stop) modeled and displayed, currently stubbed.
- Platform runtime seam in main for macOS/Windows future divergence.
- Typecheck, build, UI tests, and packaging smoke setup.

## Project Structure

- src/main/main.ts: Electron bootstrap, BrowserWindow lifecycle, IPC handler registration.
- src/main/services/processRuntime.ts: Runtime interface and platform selection seam.
- src/main/services/processRuntime.macos.ts: macOS runtime selector for real/test mode.
- src/main/services/processRuntime.windows.ts: Windows runtime selector for real/test mode.
- src/main/services/processRuntime.real.ts: Real environment runtime data providers.
- src/main/services/processRuntime.stub.ts: Fixture-only runtime for test mode.
- src/main/services/processRuntime.fixtures.ts: Mock process dataset + server-side filtering.
- src/main/services/processRuntime.mongodb.ts: Live MongoDB local monitor (port 27017 + PID lookup).
- src/preload/index.ts: Typed contextBridge API exposed to renderer.
- src/shared/process.ts: Domain model + IPC request/response contracts.
- src/renderer/main.tsx: Renderer bootstrap.
- src/renderer/app/App.tsx: App frame and top-level composition.
- src/renderer/features/process-list/ProcessListPage.tsx: Primary monitoring view.
- src/renderer/features/process-list/components: Row/badge/filter/detail/state components.
- src/renderer/features/process-list/services/processGateway.ts: Renderer service boundary.
- src/renderer/features/process-list/mocks/processFixtures.ts: Renderer-side fixture data.
- src/renderer/styles: Tokens, layout, and process-list styles.
- src/renderer/features/process-list/ProcessListPage.test.tsx: UI state and selection tests.
- src/renderer/features/process-list/services/processGateway.contract.test.ts: API/gateway shape tests.

## Shared Contracts

The shared process model in src/shared/process.ts currently includes:

- source: native, docker, database, custom.
- status: running, stopped, starting, stopping, degraded, unknown.
- health: healthy, warning, critical, unknown.
- pid and ports when available.
- action capabilities per process for start/stop.
- typed IPC payloads:
	- getProcessList(request?: GetProcessListRequest)
	- sendProcessCommand(request: ProcessCommandRequest)

This shape is UI-first by design so platform implementations can evolve later without forcing renderer schema churn.

## Runtime Boundaries

- Main process owns platform integration and IPC handlers.
- Preload exposes a minimal safe API on window.c3Desktop.
- Renderer consumes a ProcessGateway service abstraction.
- ProcessGateway routes to preload API in real mode and only uses fixture fallback in explicit test mode.

## Platform Abstraction Seam

src/main/services/processRuntime.ts selects runtime implementation by process.platform:

- darwin -> processRuntime.macos.ts
- win32 -> processRuntime.windows.ts
- default -> processRuntime.real.ts (or processRuntime.stub.ts in test mode)

Runtime mode is selected at startup:

- real mode (default): returns live environment data (currently MongoDB Local on port 27017).
- test mode: returns fixture data only.

Enable test mode with either C3_TEST_MODE=1 or the --test-mode runtime flag.

## Scripts

- npm run dev: Start Electron + Vite dev workflow.
- npm run dev:test: Start Electron + Vite with fixture-only runtime mode.
- npm run typecheck: TypeScript project-reference checks.
- npm run test: Run Vitest suite.
- npm run build: Build main, preload, and renderer bundles.
- npm run package:smoke: Build + electron-builder unpacked app output.
- npm run preview: Preview built Electron app.
- npm run preview:test: Preview build with fixture-only runtime mode.

## Local Setup

1. Install dependencies.
2. Run npm run dev.
3. If Electron binary is missing on first run, execute npx electron --version once and retry npm run dev.
4. For fixture-only mode, run npm run dev:test.

## Verification Status (Current)

- Dev startup path builds main/preload/renderer and launches Electron.
- Renderer supports loading, populated, empty, and error list states.
- Row selection updates the detail panel.
- Typecheck/build pass across all boundaries.
- UI tests and contract tests pass.
- Packaging smoke script completes and emits release output.

## Out Of Scope For This Milestone

- Real process enumeration.
- Real start/stop behavior.
- Docker integration and database health probes.
- Tray integration, notifications, autostart, and production packaging hardening.

## Next Milestone Guidance

1. Implement read-only process discovery first behind ProcessRuntime.
2. Keep control actions disabled until per-platform semantics are validated.
3. Introduce virtualization/grouping only when process scale demands it.
