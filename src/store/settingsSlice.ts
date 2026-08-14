import { StateCreator } from "zustand";
import { AppStoreState } from "./index";

export interface SettingsSlice {
  showSettingsModal: boolean;
  settingsCategory: "auth" | "display" | "time" | "backups";
  expandedSettingId: string | null;
  fontSizeScale: "normal" | "readable" | "large";
  dayPlannerFont: "Standard" | "Handwriting";
  dayStartHour: string;
  defaultDuration: number;
  defaultTaskFormMode: "basic" | "standard" | "narrative";
  taskCardAnimationMs: number;
  timelineColumns: 1 | 2;

  // Actions
  setShowSettingsModal: (show: boolean) => void;
  setSettingsCategory: (category: "auth" | "display" | "time" | "backups") => void;
  setExpandedSettingId: (id: string | null) => void;
  setFontSizeScale: (scale: "normal" | "readable" | "large") => void;
  setDayPlannerFont: (font: "Standard" | "Handwriting") => void;
  setDayStartHour: (hour: string) => void;
  setDefaultDuration: (duration: number) => void;
  setDefaultTaskFormMode: (mode: "basic" | "standard" | "narrative") => void;
  setTaskCardAnimationMs: (ms: number) => void;
  setTimelineColumns: (cols: 1 | 2) => void;
}

export const createSettingsSlice: StateCreator<
  AppStoreState,
  [],
  [],
  SettingsSlice
> = (set) => ({
  showSettingsModal: false,
  settingsCategory: "auth",
  expandedSettingId: "cloud_status",
  fontSizeScale: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("font_size_scale");
      return (saved as "normal" | "readable" | "large") || "normal";
    }
    return "normal";
  })(),
  dayPlannerFont: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("day_planner_font");
      return (saved as "Standard" | "Handwriting") || "Standard";
    }
    return "Standard";
  })(),
  dayStartHour: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("day_start_hour");
      return saved || "06:00";
    }
    return "06:00";
  })(),
  defaultDuration: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("default_duration");
      return saved ? Math.max(1, parseInt(saved, 10) || 30) : 30;
    }
    return 30;
  })(),
  defaultTaskFormMode: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("default_task_form_mode");
      if (saved === "basic" || saved === "standard" || saved === "narrative") {
        return saved;
      }
    }
    return "basic";
  })(),
  taskCardAnimationMs: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("task_card_animation_ms");
      return saved ? Math.max(100, Math.min(3000, parseInt(saved, 10) || 600)) : 600;
    }
    return 600;
  })(),
  timelineColumns: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("timeline_columns");
      if (saved === "1" || saved === "2") {
        return parseInt(saved, 10) as 1 | 2;
      }
    }
    return 2;
  })(),

  setShowSettingsModal: (show) => set({ showSettingsModal: show }),
  setSettingsCategory: (category) => set({ settingsCategory: category }),
  setExpandedSettingId: (id) => set({ expandedSettingId: id }),
  setFontSizeScale: (scale) => set({ fontSizeScale: scale }),
  setDayPlannerFont: (font) => set({ dayPlannerFont: font }),
  setDayStartHour: (hour) => set({ dayStartHour: hour }),
  setDefaultDuration: (duration) => set({ defaultDuration: duration }),
  setDefaultTaskFormMode: (mode) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("default_task_form_mode", mode);
    }
    set({ defaultTaskFormMode: mode });
  },
  setTaskCardAnimationMs: (ms) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("task_card_animation_ms", ms.toString());
    }
    set({ taskCardAnimationMs: ms });
  },
  setTimelineColumns: (cols) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("timeline_columns", cols.toString());
    }
    set({ timelineColumns: cols });
  },
});
