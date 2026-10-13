# Little City Stories 🏙️

> A cozy, gameplay-first isometric 3D city-building simulation inspired by the charm, compact layouts, and satisfying progression of classic Kairosoft simulation games. Built with Three.js, TypeScript, and Vite.

---

## 🎮 Overview

**Little City Stories** blends low-poly pastel aesthetics with deep management simulation. Players design a bustling town on a floating diorama island—laying down residential districts, commercial businesses, and road networks, balancing taxes, city happiness, and neighbor synergy.

### Current Milestone: Phase B (Construction Loop) ✅
- **Complete 12-Building Procedural Catalog:** 5 distinct categories (Residential, Commercial, Municipal, Nature, Transport) with custom procedural meshes (Houses, Apartments, Shops, Bakery, Bistro with patio, Schoolhouse with cupola, Clinic, Parks, Trees, Roads, Streetlights).
- **Zustand State Engine:** Centralized store managing city treasury ($10,000 starting funds), active tool states, and placed building registries without React dependencies (`zustand/vanilla`).
- **Interactive Ghost Preview:** Real-time semi-transparent preview meshes following cursor with dynamic 1×1 and 2×2 footprint snapping.
- **Strict Multi-Cell Validation:** Real-time green/red validity highlights validating grid boundaries, multi-cell overlap conflicts, and treasury affordability.
- **Bulldozer / Demolition Engine:** Instant structure demolition with cell restoration, 50% fund refunds, and clean GPU geometry disposal.
- **Glassmorphic Category Dock:** Intuitive bottom HUD with category filter tabs and shortcuts.
- **True Isometric 3D Diorama:** 20×20 diorama grid with ~35.264° elevation, discrete 90° rotation, and zero-allocation raycasting.
- **Automated Test Coverage:** 39 Vitest unit tests verifying placement math, overlap prevention, multi-cell footprints, demolition refunds, catalog schemas, and camera controls.

---

## ⌨️ Controls

| Input | Action |
|---|---|
| **Left Click** | Place selected building / Demolish target |
| **Right Mouse / Middle Mouse / Touch Drag** | Pan camera across the city |
| **Shift / Alt + Left Mouse Drag** | Alternative camera pan |
| **Mouse Wheel** | Zoom In / Zoom Out |
| **Q / E Keys** | Rotate view 90° counter-clockwise / clockwise |
| **R Key** | Rotate building orientation 90° during placement |
| **Number Keys (1–4)** | Quick-select primary buildings |
| **B Key** | Toggle Bulldoze mode |
| **Escape Key** | Cancel active tool (Idle mode) |
| **HUD Buttons (↺ / ↻ / + / −)** | On-screen camera rotation and zoom controls |
| **Mouse Move** | Interactive hover tile raycasting and ghost preview |

---

## 🏗️ Architecture & Project Structure

```text
src/
├── assets/
│   ├── MaterialLibrary.ts         # Shared palette cache & singleton material manager
│   └── procedural/
│       ├── houses.ts              # Procedural residential structure assembler & cleanup
│       ├── roofs.ts               # Gable & flat roof mesh generators
│       ├── walls.ts               # Foundation & wall block generators
│       └── windows.ts             # Doors, windows, chimneys, and planter boxes
├── game/
│   ├── Game.ts                    # Main orchestrator & game loop
│   ├── Lighting.ts                # Directional sunlight with shadows & hemisphere bounce
│   ├── Renderer.ts                # WebGLRenderer with ACESFilmic tone mapping
│   └── SceneManager.ts            # Three.js scene hierarchy & layer grouping
├── styles/
│   └── global.css                 # Glassmorphic HUD styling & responsive layout
├── ui/
│   └── HUD.ts                     # HUD presentation, button triggers, and keyboard bindings
├── state/
│   └── GameStore.ts               # Vanilla Zustand store for treasury, active tool & placed buildings
├── utils/
│   └── coordinates.ts             # Grid ↔ World conversion, footprints, and bounds
├── world/
│   ├── CameraController.ts        # Isometric orthographic camera controller
│   ├── GridRenderer.ts            # Diorama island slab, grass surface & hover tile
│   ├── GridSystem.ts              # Core grid data model & cell state management
│   ├── PlacementSystem.ts         # Ghost preview cursor, placement validation & bulldoze tool
│   └── RaycastSystem.ts           # Ground plane pointer raycaster
└── main.ts                        # Application bootstrap & lifecycle handling
tests/
├── buildingRegistry.test.ts       # Building catalog schemas, costs & categories
├── camera.test.ts                 # Camera isometric params, zoom clamping & rotation tests
├── coordinates.test.ts            # Math roundtrip, footprint centering, bounds tests
├── demolition.test.ts             # Bulldozer refund, cell freeing & cleanup tests
├── grid.test.ts                   # Cell availability, neighbor queries, corrupt save tests
├── houses.test.ts                 # Procedural building hierarchy, upgrades & disposal tests
├── materials.test.ts              # Material registration, singleton lifecycle & reset tests
├── placement.test.ts              # Footprint bounds, cost deduction & treasury tests
└── raycast.test.ts                # Raycast screen-to-grid mapping & zero-allocation tests
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `pnpm`

### Installation

```bash
# Clone or navigate to the repository
cd LittleCityStories

# Install dependencies
npm install
```

### Running Locally

```bash
# Start the local development server (with hot module replacement)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
# Run Vitest test suite once
npm test

# Run Vitest in watch mode
npm run test:watch
```

### Production Build

```bash
# Type-check with tsc and compile optimized bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 🗺️ Roadmap

- [x] **Phase A: Playable 3D Foundation** — Isometric rendering, 20×20 diorama slab, orthographic camera controls, grid math, procedural house meshes, and unit test suite.
- [x] **Phase B: Construction & Core Gameplay** — Building placement system, 12-building procedural catalog across 5 categories, interactive ghost cursor preview, multi-cell validation, bulldozer tool with 50% refund, Zustand state store, and glassmorphic HUD toolbar.
- [ ] **Phase C: Simulation Loop & People** — Citizen agents, pathfinding on road networks, work/shop schedules, and service synergy bonuses.
- [ ] **Phase D: Economy, Progression, Save/Load & Polish** — City finances, taxes, operating costs, city rank unlocks, LocalStorage save/load, and full game HUD.
- [ ] **Phase E: Juice, Audio, Effects & Release** — Day/night transitions, construction dust particles, bouncy placement juice, and sound effects.

---
