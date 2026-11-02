# Store Planner 3D — Specification

This spec was written before implementation and used to drive AI-assisted development:
each section was implemented and verified against its acceptance criteria.

## Problem
Store teams need a fast, visual way to sketch a sales-floor layout — place fixtures,
see them in 3D, and catch obvious mistakes — before handing off to detailed planning tools.

## Users
Store/visual-merchandising staff. Not CAD experts. Some use keyboard or assistive tech.

## Scope (v0.1)
| # | Feature | Acceptance criteria |
|---|---------|---------------------|
| 1 | 3D room | Room of configurable size (default 12×9 m), floor grid at 25 cm / 1 m, entrance marker. |
| 2 | Fixture catalogue | 6 fixture types with real-world dimensions. Click adds the fixture at the nearest free spot to the centre. |
| 3 | Drag to move | Pointer drag moves a fixture on the floor plane, snaps to 25 cm grid, never leaves the room. Camera orbit is disabled while dragging. |
| 4 | Rotate / delete | 90° steps; footprint swaps and is re-clamped to the room. |
| 5 | Conflict detection | Overlapping fixtures turn red and are counted in the Layout panel. Touching edges are not a conflict. |
| 6 | Views | Toggle between perspective 3D and top-down plan view with a smooth camera transition. |
| 7 | Undo / redo | Every edit is undoable. A whole drag is one undo step. History capped at 50. |
| 8 | Import / export | Layout serialises to versioned JSON. Import validates schema and shows an error without changing state on invalid input. |
| 9 | Accessibility | All actions available without a pointer: fixture list, arrow-key nudging, R / Delete / Esc, Ctrl+Z. Changes announced via `aria-live`. Visible focus, semantic regions, reduced-motion respected. |
| 10 | Quality | Domain logic is framework-free and unit tested. CI runs typecheck, tests, build, and deploys to Pages. |

## Data contract
```ts
interface LayoutDoc {
  version: 1;
  room: { width: number; depth: number };           // metres
  fixtures: { id: string; type: string; x: number; z: number; rotation: 0 | 90 | 180 | 270 }[];
}
```
This is the shape a `GET/PUT /layouts/{id}` REST endpoint would expose (OpenAPI-ready).

## Out of scope / next
- Persist layouts via a REST API (OpenAPI spec + typed client generation).
- Load fixture catalogue from a headless CMS.
- Aisle-width rule (min. clearance between fixtures) and customer-flow heatmap.
- Load real store shells (GLTF / Autodesk Platform Services).
