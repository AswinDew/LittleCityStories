# Little City Stories 🏙️

> A cozy, gameplay-first isometric 3D city-building simulation inspired by the charm, compact layouts, and satisfying progression of classic Kairosoft simulation games. Built with Three.js, TypeScript, and Vite.

---

## 🎮 Overview

**Little City Stories** blends low-poly pastel aesthetics with deep management simulation. Players design a bustling town on a floating diorama island—laying down residential districts, commercial businesses, and road networks, balancing taxes, city happiness, and neighbor synergy.

### Current Milestone: Phase A (Playable 3D Foundation) ✅
- **Isometric 3D Diorama:** 20×20 grid rendered on a floating earthen slab island with soft pastel lighting, shadow mapping, and hemisphere ambient bounce.
- **True Isometric Camera:** Orthographic projection with fixed ~35.264° elevation, smooth 4-direction 90° discrete rotation (Q/E), pan boundaries, and zoom limits.
- **Robust Grid Mathematics:** 2D cell coordinate system with multi-cell footprint math, bounds validation, orthogonal/Moore neighbor queries, and corrupt save rejection.
- **Procedural Architectural Engine:** Modular building generation including foundations, walls, gable roofs, doors, windows, chimneys, and progressive level upgrades.
- **Centralized Palette & Material Management:** `MaterialLibrary` singleton for warm pastel color palettes and memory leak prevention.
- **Zero Garbage Allocations on Hot Paths:** Pre-allocated scratch vectors for camera dragging and raycasting.
- **Automated Test Coverage:** 16 Vitest unit tests verifying coordinates, grid mutations, corrupt data rejection, and material lifecycles.

---

## ⌨️ Controls

| Input | Action |
|---|---|
| **Right Mouse / Middle Mouse Drag** | Pan camera across the city |
| **Shift / Alt + Left Mouse Drag** | Alternative camera pan |
| **Mouse Wheel** | Zoom In / Zoom Out |
| **Q / E Keys** | Rotate view 90° counter-clockwise / clockwise |
| **HUD Buttons (↺ / ↻ / + / −)** | On-screen camera rotation and zoom controls |
| **Mouse Move** | Interactive hover tile raycasting (green = valid, red = blocked) |

---

## 🏗️ Architecture & Project Structure

```text
src/
├── assets/
│   ├── MaterialLibrary.ts         # Shared palette cache & singleton material manager
│   └── procedural/
│       ├── houses.ts              # Procedural residential structure assembler
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
├── utils/
│   └── coordinates.ts             # Grid ↔ World conversion, footprints, and bounds
├── world/
│   ├── CameraController.ts        # Isometric orthographic camera controller
│   ├── GridRenderer.ts            # Diorama island slab, grass surface & hover tile
│   ├── GridSystem.ts              # Core grid data model & cell state management
│   └── RaycastSystem.ts           # Ground plane pointer raycaster
└── main.ts                        # Application bootstrap & UI HUD controls
tests/
├── coordinates.test.ts            # Math roundtrip, footprint centering, bounds tests
├── grid.test.ts                   # Cell availability, neighbor queries, corrupt save tests
└── materials.test.ts              # Material registration, singleton lifecycle & reset tests
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
- [ ] **Phase B: Construction & Core Gameplay** — Building placement system, category toolbar (Residential, Commercial, Municipal, Roads, Parks), bulldoze tool, and procedural variety.
- [ ] **Phase C: Simulation Loop & People** — Citizen agents, pathfinding on road networks, work/shop schedules, and service synergy bonuses.
- [ ] **Phase D: Economy, Progression, Save/Load & Polish** — City finances, taxes, operating costs, city rank unlocks, LocalStorage save/load, and full game HUD.
- [ ] **Phase E: Juice, Audio, Effects & Release** — Day/night transitions, construction dust particles, bouncy placement juice, and sound effects.

---

## 📄 License

MIT
