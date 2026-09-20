# TaskPass — Master Technical Specification & Complete Reproduction Guide
> **Purpose**: This specification informs any coding agent or engineering team how to faithfully and completely reproduce every feature, function, data schema, layout decision, and UX/UI human interaction dynamic of the **TaskPass** application.

---

## 1. System Vision & Architecture Overview

**TaskPass** is an interactive, unified iOS & Android scheduling system, calendar orchestrator, and React Native mobile simulator. It combines deterministic constraint-based time math with a dual-view paradigm:
1. **Text Deck Mode**: High-density, fast-entry, card-deck-based scheduling with inline duration chips, rapid buffer controls, and natural keyboard flows.
2. **Graphics Mode**: Visual, spatial scheduling with proportional time rulers, active window narrative builders, buffer duration clusters, and real-time drag-and-drop choreography.
3. **Simulated Mobile Shell (Device Simulator)**: Realistic iPhone and Android device framing with device notches, home indicators, dynamic status bars, and viewport scalers.

### Core Architectural Stack
- **Web Frontend**: React 19, TypeScript (~5.8), Vite 6, Tailwind CSS (v4), Motion (`motion/react`), Lucide React icons, Recharts, jsPDF.
- **State Management**: Zustand 5 modular multi-slice architecture (`taskSlice`, `layoutSlice`, `settingsSlice`, `walletSlice`, `uxTemplateSlice`).
- **Backend**: Node.js / Express 4 on port 3000, Vite middleware for dev mode, bundled to CommonJS `dist/server.cjs` with `esbuild`.
- **Cloud & Persistence**: Firebase Firestore (`ai-studio-nativedrop-*`) + client `localStorage` cache fallback with conflict-free offline resilience.
- **AI Intelligence**: Google Gemini API (`@google/genai` TypeScript SDK via server-side `/api/generate` and `/api/science-plans`), enabling natural language task scheduling, grammar-preserving narrative adjustments, and AI science routines.

---

## 2. Core Data Models & Type System (`src/types.ts`)

To reproduce the application, the following TypeScript data structures form the absolute contract:

### 2.1 The `Task` Entity
```typescript
export interface Task {
  id: string;                         // UUID or nanoid
  userId?: string;                    // Owner UID
  title: string;                      // Task action/name
  date: string;                       // YYYY-MM-DD
  time: string;                       // HH:MM (24-hour format)
  duration: string;                   // Human readable, e.g. "45 min", "1 hr"
  isLocked: boolean;                  // true = fixed clock time; false = dynamic cascading slot
  isOpenPlaceholder?: boolean;        // true = empty draggable gap slot
  completed: boolean;                 // Completion status
  location?: string;                  // Location string (e.g. "Office", "Home")
  attendees?: string;                 // Attendee names or comma-separated list
  collaborator?: string;              // Primary collaborator name
  travelBefore?: number;              // Transit minutes before task start
  travelAfter?: number;               // Transit minutes after task end
  order?: number;                     // Explicit deck ordering index
  phone?: string;                     // Optional contact phone number
  notes?: string;                     // Freeform rich notes
  groupId?: string;                   // Sequence or batch group identifier
  isUnlinked?: boolean;               // Detached from automatic schedule cascade
  originalDuration?: string;          // Snapshot for reset/revert
  originalTravelBefore?: number;      // Snapshot for reset/revert
  originalTravelAfter?: number;       // Snapshot for reset/revert
  originalTime?: string;              // Snapshot for reset/revert
  originalDate?: string;              // Snapshot for reset/revert
  originalIsLocked?: boolean;         // Snapshot for reset/revert
  travelBeforeCompleted?: boolean;    // Travel checklist state
  travelAfterCompleted?: boolean;     // Travel checklist state
  beforeBufferPurpose?: string;       // Context (e.g. "Drive to venue", "Prep notes")
  afterBufferPurpose?: string;        // Context (e.g. "Cool down", "Commute home")
  travelBeforeLocation?: string;      // Origin of pre-transit
  travelAfterLocation?: string;       // Destination of post-transit
  travelBeforeSameLocation?: boolean; // Suppress transit if adjacent tasks share location
  travelAfterSameLocation?: boolean;  // Suppress transit if adjacent tasks share location
  transferId?: string;                // Link to active peer task transfer
  compensation?: Compensation;        // Favor points or financial bounty
  isTransferred?: boolean;            // Delegation flag
  computedTime?: string;              // Dynamically derived clock time after cascade
  isFlexible?: boolean;               // Floating flex task awaiting placement
  isOverflow?: boolean;               // Pushed beyond workday closing limits
  isInProgress?: boolean;             // Live focus/timer active
  gcalEventId?: string;               // Two-way Google Calendar synchronization ID
  isAllDay?: boolean;                 // All-day event banner
  repeatConfig?: string;              // Recurrence textual description
  isRecurring?: boolean;              // Master recurrence toggle
  recurringParentId?: string;         // Link to root series template
  recurrenceExclusions?: string[];    // Deleted/modified ISO instance dates
  recurrenceUntil?: string;           // Series end date
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'special_day_of_month' | 'none';
  recurrenceWeeklyDays?: number[];    // 0 = Sunday ... 6 = Saturday
  recurrenceWeeklyInterval?: number;  // Every N weeks
  recurrenceSpecialOccurrence?: 'First' | 'Second' | 'Third' | 'Fourth';
  recurrenceSpecialWeekday?: number;  // 0..6
  sequenceLocked?: boolean;           // Rigid grouping: tasks move together as an atomic cluster
  groupName?: string;                 // Name of the sequence group
  reminderTime?: string;              // Minutes before alert
  priority?: 'low' | 'medium' | 'high' | 'none';
  helpfulLinks?: string;              // URLs or reference paths
  hyperlink?: string;                 // Primary interactive link
  category?: string;                  // Work, Personal, Fitness, Health, Errands, etc.
  subtasks?: Subtask[];               // Ordered checklist items
  accumulatedElapsedMs?: number;      // Stop-watch accumulated focus time
  focusStartedAt?: number;            // Timestamp when active timer started
  priorLockedTime?: string;           // Lock recovery anchor
  isBuffer?: boolean;                 // Synthetic virtual buffer entity
  parentTaskId?: string;              // Parent reference if synthetic
  bufferType?: 'before' | 'after';    // Buffer orientation
  isVirtual?: boolean;                // Ephemeral preview item
  relativeToId?: string;              // Offset anchor
  interactions?: Interaction[];       // Logs of communication history
  lastModified?: number;              // Epoch timestamp for conflict resolution
  gcalUpdated?: string;               // Google Calendar last sync timestamp
}
```

### 2.2 Auxiliary Data Entities
- **`Subtask`**: `{ id, title, completed, time?, duration?, location?, category?, collaborator?, priority? }`
- **`Compensation`**: `{ type: 'favor' | 'money', amount: number }`
- **`Interaction`**: `{ id, type, direction: 'sent' | 'received', dateTime, description, notes }`
- **`Transfer`**: Peer task delegation with status lifecycle (`pending` -> `accepted` | `declined` -> `review` -> `completed`).
- **`Routine`**: Reusable task sequence template for batch insertion into the active schedule.
- **`AppContact` / `AppNote`**: Integrated local contact book and contextual scratchpad notes.

---

## 3. Mathematical Scheduling Engine & Time Cascading

The scheduler operates as a deterministic, greedy, constraint-propagation engine (`src/utils/timeHelpers.ts`).

### 3.1 Time Normalization Rules
1. **Clock Parsing**: `HH:MM` strings (24-hour) convert to integer **minutes from midnight** (`0` to `1439`):
   $$\text{mins} = (\text{hours} \times 60) + \text{minutes}$$
2. **Rollover & Normalization**: Minutes are wrapped with modulo 1440. If a task crosses midnight, negative or $>1440$ values normalize safely without breaking downstream tasks.
3. **Duration Parsing**: Strings like `"45 min"`, `"1.5 hours"`, `"1 hr 30 m"`, `"90m"` convert into exact integer minutes.

### 3.2 Dynamic Cascading Logic (Locked vs Unlocked Tasks)
- **Locked Tasks (`isLocked: true`)**: Have immutable start times. They act as rigid time anchor points in the schedule.
- **Unlocked Tasks (`isLocked: false`)**: Dynamically cascade. Their computed start time is calculated from the immediately preceding item:
  $$\text{Start}(T_n) = \text{End}(T_{n-1}) + \text{TravelAfter}(T_{n-1}) + \text{TravelBefore}(T_n)$$
- **Collision Avoidance**: If an unlocked task's duration or travel buffer overlaps a subsequent locked task $T_{locked}$, the engine marks the task with `isOverflow: true` or shifts non-rigid tasks into the next available gap.
- **Buffer Suppressions**: If $T_{n-1}.\text{location} == T_n.\text{location}$ and `travelAfterSameLocation` / `travelBeforeSameLocation` are enabled, travel transit buffers between them automatically collapse to `0`.

---

## 4. Design Language & Visual System

TaskPass rejects generic SaaS cliches in favor of an artisanal, warm, high-contrast palette calibrated for legibility and visual calm:

### 4.1 Color System
- **App Canvas Background**: `#FAF3E0` (Warm Cream) with subtle parchment warmth.
- **Card Surface Background**: `#FFF2DF` (Alabaster Warm Ivory), bordered by `#EADDC7` / `#CEBC98`.
- **Primary Text**: Deep Charcoal / Espresso `#1F1A16` and `#2C241D` (passing WCAG AAA contrast against cream).
- **Muted Subtitles**: `#7A6B5C` and `#6B5A4B`.
- **Domain Semantic Accents**:
  - **Time & Scheduled Action**: Deep Forest Green `#1E6B40` (borders, clock text, save buttons, active focus states).
  - **Location & Travel Destination**: Warm Amber / Terracotta `#DE771B` (location pills, map badges, location icons).
  - **Collaborators & Attendees**: Royal Violet / Purple `#7B24C7` (collaborator badges, avatar rings, participant pills).
  - **Transit & Travel Buffers**: Crisp Cobalt Blue `#2272EB` (car icons, buffer meters, transit chips).
  - **Priorities & Urgency**:
    - High Priority: Vivid Crimson `#C82A2A` / `#EF4444`.
    - Medium Priority: Warm Amber `#F59E0B`.
    - Low Priority: Emerald `#10B981`.

### 4.2 Typography & Sizing Rules
- **Display Typography**: Warm, structured display headings paired with high-legibility geometric sans-serif numbers.
- **Pill & Chip Labels**: Strictly single-line, `white-space: nowrap`, padding scaling with font size (`px-3 py-1.5 rounded-full`).
- **Corner Radii**: Container cards use `rounded-3xl` (24px) or `rounded-2xl` (16px). Inner nested chips mathematically scale down (`Inner Radius = Outer Radius - Padding`).
- **Green-Underline Editable Convention**: In narrative views, every dynamic, user-editable data element is highlighted with a distinct deep green underline (`underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer`).

---

## 5. Screen Modes & Layout Architectures

The user can toggle between two primary views via the top switcher or simulator controls:

### 5.1 Mode 1: Text Deck Mode (`src/components/TaskDeckCard.tsx`)
- High-efficiency, list-oriented card deck.
- **Header**: Date navigator, quick add task input field (`FastInput.tsx`), quick category filter chips.
- **Card Anatomy**:
  - Left: Time column showing start time, end time, and locked status indicator. Tapping the lock toggles `isLocked`.
  - Center: Task title, category badge, collaborator chip, location pill, and inline subtask counter.
  - Right: Duration chip (e.g. `45m`), priority flag, and quick menu trigger.
  - Bottom: Condensed travel buffer row showing `travelBefore` and `travelAfter` with car indicators.
- **Reordering**: Built-in drag handles on mobile and desktop allowing instantaneous up/down card reordering with haptic feedback.

### 5.2 Mode 2: Graphics Mode (`src/components/GraphicalTaskCard.tsx`)
- Rich spatial presentation featuring:
  - **Visual Time Ruler**: Chronological vertical axis with proportional height reflecting exact task durations.
  - **Buffer Duration Clusters (`BufferDurationCluster.tsx`)**: Visual transit blocks rendered above and below task cards with live ETA indicators.
  - **The Active Focus Card**: Enlarged, prominent card representing the current or selected task.
  - **Full Active Window Narrative View (`FullActiveWindowNarrativeView.tsx`)**: Converts structured task parameters into natural human language paragraphs with interactive green-underlined tokens.

---

## 6. The Active Window Narrative View & Screen-Centered Modals

A signature innovation of TaskPass is the **Full Active Window Narrative View**. It generates continuous natural-language sentences describing the active schedule, while maintaining strict two-way editing bindings.

### 6.1 Sentence Construction Matrix
The narrative text is synthesized from task fields with fallback grammatical connectors:
```
"[leadIn] [startTime] to [endTime], [title] [locationConnector] [location] [collaboratorConnector] [collaborator] [transitConnector] [transit] [priorityConnector] [priority]."
```
- **Example Generated Sentence**:
  *"From **09:00 AM** to **09:45 AM**, work on **Design Sprint Review** at **Conference Room B** with **Sarah Chen** with **15 min before & after transit** as **high priority**."*

### 6.2 Centered Screen Pulldown Modal Architecture
When the user taps any green-underlined data token in the narrative—or taps the quick-action pills (`+ Location`, `+ Collaborator`, `+ Transit Time`, `+ Priority`)—the app does **not** open awkward inline cut-off dropdowns. Instead, it renders a **screen-centered modal window** using React Portals (`createPortal` into `document.body`):
- **Backdrop**: `fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4`.
- **Window**: `w-full max-w-sm sm:max-w-md max-h-[85vh] bg-[#FFF2DF] text-[#1F1A16] border-2 border-[#EADDC7] rounded-3xl p-5 shadow-2xl overflow-hidden`.
- **Modal Modalities**:
  1. **Time & Duration Modal**:
     - Live time-picker input with dynamic 12-hour AM/PM badge.
     - Quick hour presets (`07:00`, `08:00`, `09:00`, `10:30`, `12:00`, `14:00`, `16:00`, `18:00`).
     - Duration grid (`15m`, `30m`, `45m`, `60m`, `90m`, `120m`, `180m`, `240m`).
     - "Save Start Time & Duration" button.
  2. **Title & Action Modal**:
     - Action title text input field.
     - Quick verb chips (`+Meeting with`, `+Review`, `+Work on`, `+Draft`, `+Workout`, `+Call`, `+Lunch`).
     - Direct jump button to "Open Full Task Edit Form".
  3. **Location Modal**:
     - Curated list of favorite and frequent locations with checkmarks.
     - Inline "+ Add Custom Location..." input with persistence to favorites.
     - "Remove Location from Narrative" button.
  4. **Collaborator Modal**:
     - Collaborator roster with participant badges.
     - Custom collaborator input field with auto-assignment to attendees.
     - "Remove Collaborator from Narrative" button.
  5. **Transit Buffer Modal**:
     - Preset chips: `15 min before & after`, `30 min before & after`, `45 min before & after`, `15 min before only`, `30 min before only`, etc.
     - "Remove Transit from Narrative" button.
  6. **Priority Modal**:
     - High, Medium, Low selectors with color-coded dot badges.
     - "Remove Priority from Narrative" button.

### 6.3 AI Grammar Polish Engine (Non-Destructive)
- When clicking "AI Polish", the app invokes Gemini to rewrite the grammatical transition connectors (`leadIn`, `locationConnector`, `collaboratorConnector`, etc.) without altering the underlying user variable values.
- If offline or unconfigured, it defaults gracefully to clean deterministic fallback grammar rules.

---

## 7. UX Dynamics & Human Interaction Mechanics

To reproduce the exact feel and tactile responsiveness:

### 7.1 Haptic Feedback Engine (`src/utils/soundEffects.ts`)
- The app uses `navigator.vibrate` patterns mapped to user actions:
  - `light`: 10ms tap feedback for chip presses and toggles.
  - `medium`: 25ms impact for drag grabs, drops, and lock state switches.
  - `success`: `[15, 50, 15]` ms double-tap confirmation on save and completion.
  - `warning`: `[40, 80, 40]` ms pulse for conflict alerts and deletions.

### 7.2 Drag-and-Drop Interaction States
- **Touch / Pointer Capture**: Custom pointer event listeners capture `pointerdown`, `pointermove`, `pointerup`.
- **Drag Threshold**: 6px movement deadzone prevents accidental drags when the user simply intends to tap.
- **Ghost Preview**: Dragging generates a semi-transparent floating preview card with an active shadow (`shadow-2xl opacity-90 scale-102`).
- **Placeholder Snapping**: Empty gaps between tasks expand interactively to indicate valid drop insertion targets.
- **Atomic Reset**: `resetDragState()` cleans all drag variables immediately upon release to eliminate lingering ghost states.

### 7.3 Swipe & Gesture Behaviors
- **Card Swiping**:
  - Swipe Right: Toggle task completion with green checkmark fill.
  - Swipe Left: Reveal quick delete and quick reschedule actions.
- **Edge Navigation**: Fixed arrow buttons at the viewport edges allow step-by-step cycling through tasks in active focus mode.

---

## 8. State Architecture & Slices (`src/store/`)

All state is combined in a single Zustand hook `useAppStore` created from modular slices:

```typescript
// src/store/index.ts
export interface AppStoreState extends 
  LayoutSlice, 
  TaskSlice, 
  WalletSlice, 
  SettingsSlice, 
  UXTemplateSlice {}
```

### Slice Responsibilities:
1. **`taskSlice.ts`**:
   - `tasks: Task[]`
   - `selectedTaskId: string | null`
   - `reorderTasks(startIndex: number, endIndex: number)`
   - `updateTask(id: string, updates: Partial<Task>)`
   - `addTask(taskData: Partial<Task>)`
   - `deleteTask(id: string)`
   - `cascadeUnlockedTasks(date?: string)`
   - `resolveConflict(conflictId: string, resolutionMode: 'push' | 'pull' | 'overlap')`
2. **`layoutSlice.ts`**:
   - `viewMode: 'deck' | 'graphics' | 'split'`
   - `activeTab: 'schedule' | 'directory' | 'spending' | 'analytics' | 'ai-plans'`
   - `deviceFrame: 'none' | 'iphone-15' | 'pixel-8'`
   - `zoomLevel: number`
3. **`settingsSlice.ts`**:
   - `hapticEnabled: boolean`
   - `soundEnabled: boolean`
   - `workdayStart: string` (default `"08:00"`)
   - `workdayEnd: string` (default `"18:00"`)
   - `defaultBuffer: number` (default `15`)
   - `favoriteLocations: string[]`
   - `favoriteCollaborators: string[]`
4. **`walletSlice.ts`**:
   - `favorPoints: number`
   - `transfers: Transfer[]`
   - `sendTaskTransfer(...)`
   - `respondToTransfer(...)`
5. **`uxTemplateSlice.ts`**:
   - Manages custom aesthetic presets (e.g. "Warm Parchment", "Modern Slate", "High-Contrast Forest") and typography scales.

---

## 9. Auxiliary Modules & Capabilities

### 9.1 Directory Manager Tab (`src/components/tabs/DirectoryManagerTab.tsx`)
- Roster of all frequent contacts, locations, and vendors.
- Allows tagging contacts with default locations, phone numbers, and categories.

### 9.2 Spending Tracker & Trends (`src/components/tabs/SpendingTrackerTab.tsx`)
- Pairs financial and favor-point transactions with scheduled tasks.
- Visual charts rendered with Recharts (monthly spend by category, vendor frequency, favor-point balance history).

### 9.3 Task Analytics Tab (`src/components/tabs/TaskAnalyticsTab.tsx`)
- Metrics: Time in Focus vs. Time in Transit, schedule density score, on-time completion percentage, daily workload distribution.

### 9.4 Google Calendar Integration (`src/components/modals/GoogleCalendarSyncModal.tsx`)
- Client-side OAuth via Google Identity Services (`initTokenClient`).
- Pulls Google Calendar events, converts them to locked TaskPass tasks, and exports TaskPass tasks back to Google Calendar.

### 9.5 React Native Code Exporter (`src/components/TaskPassRNCode.ts`)
- Developer Hub feature that exports pure React Native / TypeScript code corresponding to the user's active schedule and card configuration.

---

## 10. File Structure & Component Map

To reproduce the codebase cleanly, organize files matching this exact hierarchy:

```
src/
├── App.tsx                                  # Root app simulator & layout wrapper
├── main.tsx                                 # Vite React root
├── index.css                                # Tailwind CSS entrypoint (@import "tailwindcss";)
├── types.ts                                 # Universal TypeScript interfaces
├── firebase.ts                              # Firebase client SDK initialization
├── store/
│   ├── index.ts                             # Zustand root store
│   ├── taskSlice.ts                         # Task data, mutations, cascading logic
│   ├── layoutSlice.ts                       # View modes, tabs, simulator frame
│   ├── settingsSlice.ts                     # User preferences, work hours, favorites
│   ├── walletSlice.ts                       # Transfers, favor points
│   └── uxTemplateSlice.ts                   # Layout styles and custom themes
├── components/
│   ├── InteractiveApp.tsx                   # Master interactive container
│   ├── InteractiveAppHelpers.tsx            # Sanitation, formatting, string cleaners
│   ├── DeviceSimulator.tsx                  # iOS & Android device hardware shell
│   ├── TaskDeckCard.tsx                     # Text Deck Mode individual card component
│   ├── GraphicalTaskCard.tsx                # Graphics Mode proportional card component
│   ├── FullActiveWindowNarrativeView.tsx    # Narrative view with centered modal portals
│   ├── BufferDurationCluster.tsx            # Visual transit buffer badge cluster
│   ├── CondensedBufferRow.tsx               # Text mode compact buffer display
│   ├── FastInput.tsx                        # High-speed one-line task entry
│   ├── TimePickBox.tsx                      # Modular 24h & 12h time selector
│   ├── SubtaskWindowModal.tsx               # Checklist manager modal
│   ├── DeveloperHub.tsx                     # React Native code viewer & export tools
│   ├── modals/                              # Specialized dialogs & drawers
│   │   ├── ConflictResolutionModal.tsx      # Collision resolution wizard
│   │   ├── GoogleCalendarSyncModal.tsx      # Google Calendar sync dialog
│   │   ├── RecurringEditModal.tsx           # Recurrence rule builder
│   │   ├── BufferCustomizerDrawer.tsx       # Pre/post transit drawer
│   │   └── AdHocSequenceModal.tsx           # Multi-task sequence grouper
│   └── tabs/
│       ├── DirectoryManagerTab.tsx          # People & place directory
│       ├── SpendingTrackerTab.tsx           # Expense tracker
│       ├── SpendingTrendsTab.tsx            # Financial analytics
│       ├── TaskAnalyticsTab.tsx             # Productivity metrics
│       └── AISciencePlansTab.tsx            # AI schedule generator
└── utils/
    ├── timeHelpers.ts                       # Core mathematical scheduling algorithms
    ├── soundEffects.ts                      # Audio and haptic vibration engine
    ├── locationStorage.ts                   # Local directory caching
    ├── themeHelpers.ts                      # Color scale calculations
    └── gcalClient.ts                        # Google Calendar REST proxy
```

---

## 11. Step-by-Step Reproduction Checklist for Coding Agents

When tasked with rebuilding or extending TaskPass from scratch, execute in this sequence:

1. **Step 1: Install Dependencies**
   - Ensure `@tailwindcss/vite`, `tailwindcss`, `motion`, `lucide-react`, `zustand`, `recharts`, `jspdf`, `react-markdown`, `firebase`, `@google/genai`, and `express` are installed in `package.json`.
2. **Step 2: Type System Initialization**
   - Implement `src/types.ts` verbatim as specified in Section 2.
3. **Step 3: Core Time Algorithms**
   - Implement `src/utils/timeHelpers.ts`: `timeToMinutes`, `minutesToTimeString`, `parseDurationToMinutes`, and `formatMins12`. Ensure midnight boundaries and dirty strings are handled gracefully.
4. **Step 4: Zustand Store Setup**
   - Scaffold the store slices in `src/store/`. Test that adding, updating, and reordering tasks works without memory leaks or unnecessary re-renders.
5. **Step 5: Full-Stack Express Server & Gemini Integration**
   - Configure `server.ts` on port `3000` with Vite middleware in development mode and `/api/generate` proxy endpoints for Gemini AI calls.
6. **Step 6: Build Text Deck Mode**
   - Create `TaskDeckCard.tsx` with start/end time indicators, lock toggle, drag handles, duration chips, and subtask counters.
7. **Step 7: Build Graphics Mode & Narrative View**
   - Create `GraphicalTaskCard.tsx` and `FullActiveWindowNarrativeView.tsx`. Connect the green-underlined text tokens to the React Portal-based centered modal window (`renderPulldownWindowModal`).
8. **Step 8: Implement Conflict Detection & Cascading**
   - Implement `cascadeUnlockedTasks` to automatically shift unlocked tasks while locking down immutable slots.
9. **Step 9: Haptics & Visual Finishing**
   - Apply warm palette variables (`#FAF3E0`, `#FFF2DF`, `#1E6B40`, `#DE771B`, `#7B24C7`, `#2272EB`, `#C82A2A`). Add `navigator.vibrate` hooks to all taps and drops.
10. **Step 10: Verification**
    - Run `tsc --noEmit` and Vitest test suites to verify zero TypeScript errors and ensure mathematical scheduling correctness.
