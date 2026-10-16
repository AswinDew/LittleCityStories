---
name: economy-simulation
description: Use when implementing or reviewing Civilization Town deterministic resource, production, consumption, construction-cost, or storage rules.
---

# Economy simulation

## Ownership

`src/simulation/` and `src/economy/`; construction/citizen systems consume their plain data contracts. At M2 only the clock/session and resource types exist: live multi-resource economy starts at M3–M4.

## Workflow

1. Read the current milestone and balancing proposals in the implementation plan; distinguish configuration from implemented gameplay.
2. Write headless tests through the actual session/domain API. Never implement a resource rule only in the HUD or ghost preview.
3. Use integer ticks, stable entity iteration, seeded randomness, and persisted counters. Do not read Date.now, Math.random, render delta or browser APIs in domain systems.
4. Validate an entire transaction before deducting any resource. Keep paid costs for refunds; preserve existing inventory when storage capacity falls. Work/production requires real eligible citizens after the population milestone.
5. Run `npm.cmd test -- tests/simulationClock.test.ts tests/simulationSession.test.ts`, plus the tests for any new domain system, then `npm.cmd test` and `npm.cmd run build`.

Do not invent inventory, assignments or production numbers to make UI look functional. This skill does not authorize activating a later milestone.
