import { StateCreator } from "zustand";
import { Task } from "../types";
import { AppStoreState } from "./index";

export interface LayoutSlice {
  // Drag and Drop State
  draggedTaskId: string | null;
  dragOverTime: string | null;
  timelineDragId: string | null;
  timelinePendingDragTaskId: string | null;
  timelineDragY: number;
  timelineDragX: number;
  timelineDragOffset: number;
  timelineDragWidth: number;
  timelineDragLeft: number;
  
  // Selection and App View States
  selectedTaskForTap: Task | null;
  selectedDate: string;
  viewMode: "deck" | "timeline" | "focus" | "passed" | "report";
  deckTab: "active" | "backlog" | "completed";
  deckSearchQuery: string;

  // Actions
  setDraggedTaskId: (id: string | null) => void;
  setDragOverTime: (time: string | null) => void;
  setTimelineDragId: (id: string | null) => void;
  setTimelinePendingDragTaskId: (id: string | null) => void;
  setTimelineDragY: (y: number) => void;
  setTimelineDragX: (x: number) => void;
  setTimelineDragOffset: (offset: number) => void;
  setTimelineDragWidth: (width: number) => void;
  setTimelineDragLeft: (left: number) => void;
  setSelectedTaskForTap: (task: Task | null) => void;
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: "deck" | "timeline" | "focus" | "passed" | "report") => void;
  setDeckTab: (tab: "active" | "backlog" | "completed") => void;
  setDeckSearchQuery: (query: string) => void;
  resetDragState: () => void;
}

export const createLayoutSlice: StateCreator<
  AppStoreState,
  [],
  [],
  LayoutSlice
> = (set) => ({
  // Drag and Drop State
  draggedTaskId: null,
  dragOverTime: null,
  timelineDragId: null,
  timelinePendingDragTaskId: null,
  timelineDragY: 0,
  timelineDragX: 0,
  timelineDragOffset: 0,
  timelineDragWidth: 0,
  timelineDragLeft: 0,

  // Selection and App View States
  selectedTaskForTap: null,
  selectedDate: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })(), // Fallback local default
  viewMode: "deck",
  deckTab: "active",
  deckSearchQuery: "",

  // Actions
  setDraggedTaskId: (id) => set({ draggedTaskId: id }),
  setDragOverTime: (time) => set({ dragOverTime: time }),
  setTimelineDragId: (id) => set({ timelineDragId: id }),
  setTimelinePendingDragTaskId: (id) => set({ timelinePendingDragTaskId: id }),
  setTimelineDragY: (y) => set({ timelineDragY: y }),
  setTimelineDragX: (x) => set({ timelineDragX: x }),
  setTimelineDragOffset: (offset) => set({ timelineDragOffset: offset }),
  setTimelineDragWidth: (width) => set({ timelineDragWidth: width }),
  setTimelineDragLeft: (left) => set({ timelineDragLeft: left }),
  setSelectedTaskForTap: (task) => set({ selectedTaskForTap: task }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setDeckTab: (tab) => set({ deckTab: tab }),
  setDeckSearchQuery: (query) => set({ deckSearchQuery: query }),

  // Full drag reset helper
  resetDragState: () => set({
    draggedTaskId: null,
    dragOverTime: null,
    timelineDragId: null,
    timelinePendingDragTaskId: null,
    timelineDragY: 0,
    timelineDragOffset: 0,
    timelineDragWidth: 0,
    timelineDragLeft: 0,
  }),
});
