import { StateCreator } from "zustand";
import { Task, Routine } from "../types";
import { AppStoreState } from "./index";
import { scheduleDynamicTasks, getLocalDateString } from "../utils/timeHelpers";

export interface TaskSlice {
  tasks: Task[];
  routines: Routine[];
  activeTaskId: string | null;
  recentlyCompletedTaskId: string | null;
  
  // Basic State Setters
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setRoutines: (routines: Routine[] | ((prev: Routine[]) => Routine[])) => void;
  setActiveTaskId: (id: string | null) => void;
  setRecentlyCompletedTaskId: (id: string | null) => void;
  
  // Task CRUD and Helper Actions
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Recalibrate tasks for a specific date (e.g. resolve scheduling offsets/conflicts)
  recalibrateTasks: (targetDate: string) => void;
}

export const createTaskSlice: StateCreator<
  AppStoreState,
  [],
  [],
  TaskSlice
> = (set, get) => ({
  tasks: [],
  routines: [],
  activeTaskId: null,
  recentlyCompletedTaskId: null,

  setRecentlyCompletedTaskId: (id) => set({ recentlyCompletedTaskId: id }),

  setTasks: (tasksOrFn) => {
    set((state) => {
      const nextTasks = typeof tasksOrFn === "function" ? tasksOrFn(state.tasks) : tasksOrFn;
      const normalized = nextTasks.map((t) => {
        const loc = (t.location && typeof t.location === "string" && t.location.trim() !== "") ? t.location.trim() : "no location";
        return t.location === loc ? t : { ...t, location: loc };
      });
      return { tasks: normalized };
    });
  },

  setRoutines: (routinesOrFn) => {
    set((state) => {
      const nextRoutines = typeof routinesOrFn === "function" ? routinesOrFn(state.routines) : routinesOrFn;
      // Sort routines alphabetically by name
      const sortedRoutines = [...nextRoutines].sort((a, b) => a.name.localeCompare(b.name));
      return { routines: sortedRoutines };
    });
  },

  setActiveTaskId: (activeTaskId) => set({ activeTaskId }),

  addTask: (task) => set((state) => ({
    tasks: [
      ...state.tasks,
      {
        ...task,
        location: (task.location && typeof task.location === "string" && task.location.trim() !== "") ? task.location.trim() : "no location"
      }
    ]
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      if (updates.location !== undefined) {
        updated.location = (updates.location && typeof updates.location === "string" && updates.location.trim() !== "") ? updates.location.trim() : "no location";
      }
      return updated;
    })
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),

  recalibrateTasks: (targetDate) => set((state) => {
    const isToday = targetDate === getLocalDateString();
    const dayTasks = state.tasks.filter((t) => t.date === targetDate && !t.isTransferred && !t.isAllDay);
    if (dayTasks.length === 0) return {};

    const currentNowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const dayStartMinutes = state.dayStartHour ? (parseInt(state.dayStartHour.split(":")[0], 10) * 60 + (parseInt(state.dayStartHour.split(":")[1], 10) || 0)) : 480;
    const scheduled = scheduleDynamicTasks(dayTasks, isToday, currentNowMins, dayStartMinutes, state.timelineIncrement ?? 5);

    const scheduledIdMap = new Map(scheduled.map((t) => [t.id, t]));
    const finalTasks = state.tasks.map((t) => {
      const s = scheduledIdMap.get(t.id);
      if (s) {
        return {
          ...t,
          computedTime: s.computedTime,
          isFlexible: s.isFlexible,
          isOverflow: s.isOverflow
        };
      }
      return t;
    });

    return { tasks: finalTasks };
  }),
});
