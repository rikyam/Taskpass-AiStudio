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
  timelineIncrement: 0 | 5 | 10 | 15 | 30;
  dragLongPressMs: number;
  enableTimeStretch: boolean;
  setEnableTimeStretch: (enabled: boolean) => void;
  fullBoxActivationEnabled: boolean;
  setFullBoxActivationEnabled: (enabled: boolean) => void;
  uiMode: "Text" | "Graphics";
  setUiMode: (mode: "Text" | "Graphics") => void;

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
  setTimelineIncrement: (inc: number) => void;
  setDragLongPressMs: (ms: number) => void;
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
  timelineIncrement: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("timeline_increment");
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (val === 0 || val === 5 || val === 10 || val === 15 || val === 30) {
          return val as 0 | 5 | 10 | 15 | 30;
        }
      }
    }
    return 5;
  })(),
  enableTimeStretch: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("enable_time_stretch");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
  })(),
  fullBoxActivationEnabled: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("focus_card_whole_box_activation");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return false;
  })(),
  dragLongPressMs: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("drag_long_press_ms");
      return saved ? Math.max(50, Math.min(2000, parseInt(saved, 10) || 400)) : 400;
    }
    return 400;
  })(),
  uiMode: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("app_ui_mode");
      if (saved === "Text" || saved === "Graphics") {
        return saved;
      }
    }
    return "Text";
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
  setTimelineIncrement: (inc) => {
    const validInc = (inc === 0 || inc === 5 || inc === 10 || inc === 15 || inc === 30) ? (inc as 0 | 5 | 10 | 15 | 30) : 5;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("timeline_increment", validInc.toString());
    }
    set({ timelineIncrement: validInc });
  },
  setEnableTimeStretch: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("enable_time_stretch", enabled.toString());
    }
    set({ enableTimeStretch: enabled });
  },
  setFullBoxActivationEnabled: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("focus_card_whole_box_activation", enabled.toString());
    }
    set({ fullBoxActivationEnabled: enabled });
  },
  setDragLongPressMs: (ms) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("drag_long_press_ms", ms.toString());
    }
    set({ dragLongPressMs: ms });
  },
  setUiMode: (mode) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("app_ui_mode", mode);
    }
    set({ uiMode: mode });
  },
});
