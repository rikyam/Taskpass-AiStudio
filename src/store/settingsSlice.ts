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

  // Graphics Mode Active Window Background Color
  graphicsActiveWindowBg: string;
  setGraphicsActiveWindowBg: (color: string) => void;

  // Timeline Background & Card Fill Colors
  timelineBgColor: string;
  setTimelineBgColor: (color: string) => void;
  timelineCardBgColor: string;
  setTimelineCardBgColor: (color: string) => void;

  // Deck Task Card Appearance in Graphics Mode
  deckCardHeaderBg: string;
  deckCardExpandedBg: string;
  deckCardFontColor: string;
  deckCardFontSize: "small" | "medium" | "large" | "xl";
  setDeckCardHeaderBg: (color: string) => void;
  setDeckCardExpandedBg: (color: string) => void;
  setDeckCardFontColor: (color: string) => void;
  setDeckCardFontSize: (size: "small" | "medium" | "large" | "xl") => void;

  // Locked Task Card Color in Graphics Mode (Task Panel & Timeline Panel)
  graphicsLockedCardBg: string;
  graphicsLockedCardFontColor: string;
  setGraphicsLockedCardBg: (color: string) => void;
  setGraphicsLockedCardFontColor: (color: string) => void;

  // Action Boxes Styling in Focus Task Panel (Graphics Only Mode)
  graphicsActionBoxBg: string;
  graphicsActionBoxFontColor: string;
  graphicsTaskTitleFontSize: "small" | "medium" | "large" | "xl" | "2xl";
  graphicsTimeFontSize: "small" | "medium" | "large" | "xl" | "2xl";
  setGraphicsActionBoxBg: (color: string) => void;
  setGraphicsActionBoxFontColor: (color: string) => void;
  setGraphicsTaskTitleFontSize: (size: "small" | "medium" | "large" | "xl" | "2xl") => void;
  setGraphicsTimeFontSize: (size: "small" | "medium" | "large" | "xl" | "2xl") => void;

  // Task Card Appearance in Text Mode
  textCardBg: string;
  textCardExpandedBg: string;
  textCardFontColor: string;
  textCardFontSize: "small" | "medium" | "large" | "xl";
  setTextCardBg: (color: string) => void;
  setTextCardExpandedBg: (color: string) => void;
  setTextCardFontColor: (color: string) => void;
  setTextCardFontSize: (size: "small" | "medium" | "large" | "xl") => void;

  // Adjustable Countdown Mode Fluorescent Glow & Pulse
  countdownGlowBrightness: number;
  setCountdownGlowBrightness: (val: number) => void;
  countdownGlowColor: string;
  setCountdownGlowColor: (color: string) => void;

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
  graphicsActiveWindowBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_active_window_bg");
      if (saved) return saved;
    }
    return "#FAF3E0";
  })(),
  timelineBgColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("timeline_bg_color");
      if (saved) return saved;
    }
    return "";
  })(),
  timelineCardBgColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("timeline_card_bg_color");
      if (saved) return saved;
    }
    return "";
  })(),
  deckCardHeaderBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("deck_card_header_bg");
      if (saved) return saved;
    }
    return "#1C3B2B";
  })(),
  deckCardExpandedBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("deck_card_expanded_bg");
      if (saved) return saved;
    }
    return "#152E21";
  })(),
  deckCardFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("deck_card_font_color");
      if (saved) return saved;
    }
    return "#FFFFFF";
  })(),
  deckCardFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("deck_card_font_size");
      if (saved === "small" || saved === "medium" || saved === "large" || saved === "xl") {
        return saved;
      }
    }
    return "medium";
  })(),

  // Graphics Mode Locked Task Card Appearance
  graphicsLockedCardBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_locked_card_bg");
      if (saved) return saved;
    }
    return "#A25F37";
  })(),
  graphicsLockedCardFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_locked_card_font_color");
      if (saved) return saved;
    }
    return "#FFFFFF";
  })(),

  // Focus Task Panel Graphics Only Mode Action Boxes & Font Sizes
  graphicsActionBoxBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_action_box_bg");
      if (saved) return saved;
    }
    return "#FFF2DF";
  })(),
  graphicsActionBoxFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_action_box_font_color");
      if (saved) return saved;
    }
    return "#2D2319";
  })(),
  graphicsTaskTitleFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_task_title_font_size");
      if (saved === "small" || saved === "medium" || saved === "large" || saved === "xl" || saved === "2xl") {
        return saved;
      }
    }
    return "medium";
  })(),
  graphicsTimeFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_time_font_size");
      if (saved === "small" || saved === "medium" || saved === "large" || saved === "xl" || saved === "2xl") {
        return saved;
      }
    }
    return "medium";
  })(),

  // Text Mode Deck Task Card Appearance
  textCardBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("text_card_bg");
      if (saved) return saved;
    }
    return "";
  })(),
  textCardExpandedBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("text_card_expanded_bg");
      if (saved) return saved;
    }
    return "";
  })(),
  textCardFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("text_card_font_color");
      if (saved) return saved;
    }
    return "";
  })(),
  textCardFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("text_card_font_size");
      if (saved === "small" || saved === "medium" || saved === "large" || saved === "xl") {
        return saved;
      }
    }
    return "medium";
  })(),

  // Countdown Glow & Pulse default state
  countdownGlowBrightness: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("countdown_glow_brightness");
      if (saved) return parseInt(saved, 10) || 100;
    }
    return 100;
  })(),
  countdownGlowColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("countdown_glow_color");
      if (saved) return saved;
    }
    return "#10b981"; // fluorescent neon emerald
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
  setGraphicsActiveWindowBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_active_window_bg", color);
    }
    set({ graphicsActiveWindowBg: color });
  },
  setTimelineBgColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("timeline_bg_color", color);
    }
    set({ timelineBgColor: color });
  },
  setTimelineCardBgColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("timeline_card_bg_color", color);
    }
    set({ timelineCardBgColor: color });
  },
  setDeckCardHeaderBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("deck_card_header_bg", color);
    }
    set({ deckCardHeaderBg: color });
  },
  setDeckCardExpandedBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("deck_card_expanded_bg", color);
    }
    set({ deckCardExpandedBg: color });
  },
  setDeckCardFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("deck_card_font_color", color);
    }
    set({ deckCardFontColor: color });
  },
  setDeckCardFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("deck_card_font_size", size);
    }
    set({ deckCardFontSize: size });
  },
  setGraphicsLockedCardBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_locked_card_bg", color);
    }
    set({ graphicsLockedCardBg: color });
  },
  setGraphicsLockedCardFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_locked_card_font_color", color);
    }
    set({ graphicsLockedCardFontColor: color });
  },
  setGraphicsActionBoxBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_action_box_bg", color);
    }
    set({ graphicsActionBoxBg: color });
  },
  setGraphicsActionBoxFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_action_box_font_color", color);
    }
    set({ graphicsActionBoxFontColor: color });
  },
  setGraphicsTaskTitleFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_task_title_font_size", size);
    }
    set({ graphicsTaskTitleFontSize: size });
  },
  setGraphicsTimeFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_time_font_size", size);
    }
    set({ graphicsTimeFontSize: size });
  },
  setTextCardBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("text_card_bg", color);
    }
    set({ textCardBg: color });
  },
  setTextCardExpandedBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("text_card_expanded_bg", color);
    }
    set({ textCardExpandedBg: color });
  },
  setTextCardFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("text_card_font_color", color);
    }
    set({ textCardFontColor: color });
  },
  setTextCardFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("text_card_font_size", size);
    }
    set({ textCardFontSize: size });
  },
  setCountdownGlowBrightness: (val) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("countdown_glow_brightness", val.toString());
    }
    set({ countdownGlowBrightness: val });
  },
  setCountdownGlowColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("countdown_glow_color", color);
    }
    set({ countdownGlowColor: color });
  },
});
