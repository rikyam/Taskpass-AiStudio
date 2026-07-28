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

  // Actions
  setShowSettingsModal: (show: boolean) => void;
  setSettingsCategory: (category: "auth" | "display" | "time" | "backups") => void;
  setExpandedSettingId: (id: string | null) => void;
  setFontSizeScale: (scale: "normal" | "readable" | "large") => void;
  setDayPlannerFont: (font: "Standard" | "Handwriting") => void;
  setDayStartHour: (hour: string) => void;
  setDefaultDuration: (duration: number) => void;
  setDefaultTaskFormMode: (mode: "basic" | "standard" | "narrative") => void;
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
});
