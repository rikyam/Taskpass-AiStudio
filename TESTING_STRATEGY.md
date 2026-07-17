# Multi-Platform Testing Strategy & Quality Assurance Manual

This document details the comprehensive testing suite and QA guidelines designed to maximize standard correctness, stability, and pixel-perfect rendering of the interactive agenda, routing, and daily routine builder. 

The test strategy is fully automated using **Vitest** and covers key logic modules, Zustand state managers, custom positioning calculations, and collision-free greedy scheduling, guaranteeing robust behavior on standard web, mobile browsers, and WebView environments (such as iOS WKWebView or Android WebView).

---

## 🎯 Testing Objectives & Platform Resilience

Our target-oriented QA goals focus heavily on:
1. **Mathematical Accuracy**: Ensuring all duration matching, travel buffers, and AM/PM time conversions work consistently.
2. **Deterministic Scheduling**: Assuring the greedy constraint scheduler resolves overlapping sessions correctly, honors travel buffers, respects priority bindings, and guards locked time slots.
3. **State Machine Integrity**: Validating the Zustand store handles pointer offsets, drag-over bounds, and resets atomically to prevent state leakage or endless re-renders.
4. **Natural Language Generation**: Ensuring narrative builder engines generate sound, coherent progress alerts for active tasks, travelers, and collaborators.

---

## 🛠️ Testing Stack Architecture

Our testing stack is built from standard, light, performant tools:
* **Test Runner**: [Vitest](https://vitest.dev/) — A blazing fast Vite-native unit test framework.
* **Environment**: `jsdom` (injected inline where DOM bindings/timers are checked).
* **Language**: TypeScript (fully typed task objects, interfaces, and assertions).

---

## 📂 Codebase Testing Map

The automated suite consists of 36 comprehensive tests organized structurally as follows:

### 1. 🕒 Time Utilities & Time Math (`src/__tests__/timeUtils.test.ts`)
Validates input parsing, normalization limits, and hour string creations:
* **`timeToMinutes`**: Verifies conversion from `"HH:MM"` to minutes since midnight, with fallback for dirty values or single-digit hours.
* **`minutesToTimeString`**: Assures integer minutes format perfectly to `"HH:MM"`, successfully normalizing negative numbers or next-day rollovers.
* **`parseDurationToMinutes`**: Tests parsing flexibility for variety of user input types: `"15 min"`, `"45 minutes"`, `"1.5 hours"`, `"1 hr 30 m"`, returning safe defaults for broken descriptors.
* **`formatTime`**: Guards AM/PM conversion boundaries, morning limits, and late night crossovers.
* **`getPriorityWeight`**: Ensures priority rankings (high, medium, low, none) maps cleanly to logical scheduling levels.

### 2. 🗄️ Zustand State Management (`src/__tests__/store.test.ts`)
Guards state variables, active view states, and atomic drag offsets:
* **Initial Defaults**: Verifies starting conditions, e.g., view mode defaulting to `"deck"`, and empty search logs.
* **State Updates**: Assures setters modify store states cleanly.
* **Atomic Reset**: Confirms `resetDragState()` cleans all drag variables (offsets, widths, overlay time anchors) at once upon drop or release, preventing visual artifacts.

### 3. 📅 Dynamic Timeline Scheduling Engine (`src/__tests__/scheduling.test.ts`)
Validates greedy conflict-resolution scheduler with complex constraints:
* **Locked Tasks**: Verifies locked sessions occupy exactly their declared slots.
* **Overlap Sliding**: Confirms flexible/unlocked tasks slide dynamically into the closest empty slot after or before locked tasks.
* **Travel Buffers**: Validates that setting `travelBefore` blocks active workspace times prior to meetings, pushing sliding tasks to later slots.
* **Priority Sorting**: Assures high-priority items take precedence over low-priority items, securing earlier schedule slots.

### 4. 🪶 Dynamic Narrative Generation (`src/__tests__/narrative.test.ts`)
Guards text construction for voice output, accessibility, and notifications:
* **Basic Outlining**: Confirms narrative describes tasks, starting times, durations, and priorities accurately.
* **Locations & Travels**: Verifies location descriptors and required travel buffers appear dynamically inside the sentence.
* **Transition Analysis**: Evaluates calculations of free gaps and buffer durations when moving from a task to subsequent items.

### 5. 👆 Drag-and-Drop Interaction States (`src/__tests__/dragAndDrop.test.ts`)
Mimics pointers, finger touch boundaries, and hover tracking:
* **Touch Tracking**: Simulates start gestures (`draggedTaskId`).
* **Vertical Grids**: Evaluates pointer/touch coordinates (`timelineDragY`, `timelineDragOffset`) for dragging tasks along the calendar scroll.
* **Device Independence**: Confirms state changes align with touch interfaces on iOS Safari and Android Chrome WebView.

---

## 🚀 Execution Instructions

Tests are fully configured and can be run with standard commands:

### Run the entire test suite:
```bash
npm run test
```

### Run Vitest in interactive development mode:
```bash
npx vitest
```

---

## 📈 Quality Integration & Continuous Reliability

To maintain continuous platform stability on iOS, Android and desktop, keep to these development rules:
1. **Zero Compiler Warnings**: Always run the typescript compiler checking step (`npm run lint` or `tsc --noEmit`) before proposing or committing code changes.
2. **Regression Guards**: When adding features to the schedule solver or modifying time-blocks, run `npm run test` immediately to make sure pre-existing schedules, slide math, or transition narratives remain intact.
3. **Lazy SDK Initialization**: If introducing third-party analytics or services in the future, always initialize them lazily inside safe blocks to prevent the applet or tests from crashing during headless test phases or server-side pre-builds.
