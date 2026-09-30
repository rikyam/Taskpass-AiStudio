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

  updateTask: (id, updates) => set((state) => {
    const target = state.tasks.find((t) => t.id === id);
    if (!target) return state;

    const enhancedUpdates = { ...updates };
    if (updates.location !== undefined) {
      enhancedUpdates.location = (updates.location && typeof updates.location === "string" && updates.location.trim() !== "") ? updates.location.trim() : "no location";
    }

    const completionToggled = updates.completed !== undefined && updates.completed !== target.completed;
    if (completionToggled) {
      if (updates.completed) {
        // Snapshot original position & lock status before marking done
        if (target.originalTime === undefined) {
          enhancedUpdates.originalTime = target.time;
        }
        if (target.originalIsLocked === undefined) {
          enhancedUpdates.originalIsLocked = target.isLocked;
        }
        if (target.originalDate === undefined) {
          enhancedUpdates.originalDate = target.date;
        }
        if (target.originalDuration === undefined) {
          enhancedUpdates.originalDuration = target.duration;
        }
        enhancedUpdates.time = target.computedTime || target.time;
        enhancedUpdates.isInProgress = false;
      } else {
        // Unchecked / restored to active: return to original position in the same status of locked or flexible
        const restoredTime = target.originalTime ?? target.time;
        enhancedUpdates.time = restoredTime;
        enhancedUpdates.computedTime = restoredTime;
        if (target.originalIsLocked !== undefined) {
          enhancedUpdates.isLocked = target.originalIsLocked;
          enhancedUpdates.isFlexible = !target.originalIsLocked;
        }
        if (target.originalDate !== undefined) {
          enhancedUpdates.date = target.originalDate;
        }
        if (target.originalDuration !== undefined) {
          enhancedUpdates.duration = target.originalDuration;
        }
        enhancedUpdates.isInProgress = false;
      }
    }

    const updatedTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...enhancedUpdates } : t));

    if (completionToggled) {
      const targetDate = enhancedUpdates.date || target.date;
      if (targetDate) {
        const isToday = targetDate === getLocalDateString();
        const dayTasks = updatedTasks.filter((t) => t.date === targetDate && !t.isTransferred && !t.isAllDay);
        if (dayTasks.length > 0) {
          const currentNowMins = new Date().getHours() * 60 + new Date().getMinutes();
          const dayStartMinutes = state.dayStartHour ? (parseInt(state.dayStartHour.split(":")[0], 10) * 60 + (parseInt(state.dayStartHour.split(":")[1], 10) || 0)) : 480;
          const scheduled = scheduleDynamicTasks(dayTasks, isToday, currentNowMins, dayStartMinutes, state.timelineIncrement ?? 5);
          const scheduledIdMap = new Map(scheduled.map((t) => [t.id, t]));
          const cascadedTasks = updatedTasks.map((t) => {
            const s = scheduledIdMap.get(t.id);
            if (s) {
              return {
                ...t,
                computedTime: s.computedTime,
                time: t.isLocked ? t.time : s.computedTime,
                isFlexible: s.isFlexible,
                isOverflow: s.isOverflow
              };
            }
            return t;
          });
          return { tasks: cascadedTasks };
        }
      }
    }

    return { tasks: updatedTasks };
  }),

  deleteTask: (id) => set((state) => {
    const target = state.tasks.find(t => t.id === id);
    const targetDate = target?.date;
    const filtered = state.tasks.filter((t) => t.id !== id);
    // Also remove any child instances if recurring
    const cleaned = filtered.filter(t => !(target?.isRecurring && t.recurringParentId === target.id && t.date === targetDate));
    if (!targetDate) return { tasks: cleaned };
    
    // Recalibrate remaining tasks for targetDate to cascade flexible tasks into freed space
    const isToday = targetDate === getLocalDateString();
    const dayTasks = cleaned.filter((t) => t.date === targetDate && !t.isTransferred && !t.isAllDay);
    if (dayTasks.length === 0) return { tasks: cleaned };

    const currentNowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const dayStartMinutes = state.dayStartHour ? (parseInt(state.dayStartHour.split(":")[0], 10) * 60 + (parseInt(state.dayStartHour.split(":")[1], 10) || 0)) : 480;
    const scheduled = scheduleDynamicTasks(dayTasks, isToday, currentNowMins, dayStartMinutes, state.timelineIncrement ?? 5);

    const scheduledIdMap = new Map(scheduled.map((t) => [t.id, t]));
    const finalTasks = cleaned.map((t) => {
      const s = scheduledIdMap.get(t.id);
      if (s) {
        return {
          ...t,
          computedTime: s.computedTime,
          time: t.isLocked ? t.time : s.computedTime,
          isFlexible: s.isFlexible,
          isOverflow: s.isOverflow
        };
      }
      return t;
    });

    return { tasks: finalTasks };
  }),

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
