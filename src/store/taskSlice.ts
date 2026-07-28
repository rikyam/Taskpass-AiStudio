import { StateCreator } from "zustand";
import { Task, Routine } from "../types";
import { AppStoreState } from "./index";

export interface TaskSlice {
  tasks: Task[];
  routines: Routine[];
  activeTaskId: string | null;
  
  // Basic State Setters
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setRoutines: (routines: Routine[] | ((prev: Routine[]) => Routine[])) => void;
  setActiveTaskId: (id: string | null) => void;
  
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

  setTasks: (tasksOrFn) => {
    set((state) => {
      const nextTasks = typeof tasksOrFn === "function" ? tasksOrFn(state.tasks) : tasksOrFn;
      return { tasks: nextTasks };
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
    tasks: [...state.tasks, task]
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),

  recalibrateTasks: (targetDate) => set((state) => {
    // Basic recalibration: sort all flexible tasks on this date sequentially
    // to avoid overlaps and keep locked ones in place.
    const dayTasks = state.tasks.filter((t) => t.date === targetDate);
    if (dayTasks.length === 0) return {};

    const timeToMinutes = (timeStr?: string): number => {
      if (!timeStr) return 480; // 08:00 default
      const [h, m] = timeStr.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const minutesToTime = (mins: number): string => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    // Sort tasks by locked vs flexible, then by current time or priority weight
    const lockedTasks = dayTasks.filter((t) => t.isLocked).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const unlockedTasks = dayTasks.filter((t) => !t.isLocked).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    let currentMinutes = 480; // 08:00 default day start

    const recalibratedDayTasks = dayTasks.map((task) => {
      if (task.isLocked) {
        return task;
      }
      // For flexible/unlocked task, assign a computed/assigned time sequence
      const durationMins = parseInt(task.duration, 10) || 30;
      
      // Try to find a slot that doesn't conflict with locked tasks
      while (lockedTasks.some(lt => {
        const ltStart = timeToMinutes(lt.time);
        const ltDur = parseInt(lt.duration, 10) || 30;
        const ltEnd = ltStart + ltDur;
        return (currentMinutes >= ltStart && currentMinutes < ltEnd) || 
               (currentMinutes + durationMins > ltStart && currentMinutes + durationMins <= ltEnd);
      })) {
        currentMinutes += 15; // advance by 15-min increments
      }

      const assignedTime = minutesToTime(currentMinutes);
      const updated = {
        ...task,
        time: assignedTime,
        computedTime: assignedTime
      };
      currentMinutes += durationMins;
      return updated;
    });

    const recalibratedIdMap = new Map(recalibratedDayTasks.map((t) => [t.id, t]));
    const finalTasks = state.tasks.map((t) => recalibratedIdMap.get(t.id) || t);

    return { tasks: finalTasks };
  }),
});
