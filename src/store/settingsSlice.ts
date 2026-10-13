import { StateCreator } from "zustand";
import { AppStoreState } from "./index";

export interface ScreenFunctionIcons {
  expandCollapse: boolean;      // Floating Expand / Collapse All button (bottom left)
  aiBot: boolean;                // Floating Gemini AI Chatbot button (bottom right)
  interactionTracker: boolean;   // Floating Interaction Tracker button (bottom right)
  addTask: boolean;              // Floating / quick add task button
  workspaceData: boolean;        // Workspace Data Menu button (bottom capsule)
  narrativeModeToggle: boolean;  // Narrative Mode toggle button (top header)
  categoryFilters: boolean;      // Category Filter Bar (top header)
  dateNavigation: boolean;       // Date prev/next & calendar triggers
}

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
  compressByDefault: boolean;
  setCompressByDefault: (enabled: boolean) => void;
  fullBoxActivationEnabled: boolean;
  setFullBoxActivationEnabled: (enabled: boolean) => void;
  uiMode: "Text" | "Graphics";
  setUiMode: (mode: "Text" | "Graphics") => void;

  // Dedicated Narrative Mode (Replaces task edit screens and expanded card details with parsed title entry & AI narrative pill buttons)
  narrativeMode: boolean;
  setNarrativeMode: (enabled: boolean) => void;

  // AI Narrative Font Size on Cards (Controls the font size for the narrative portion of cards)
  cardNarrativeFontSize: number;
  setCardNarrativeFontSize: (size: number) => void;

  // Main Screen Function Icons Visibility (Toggle function icons on the main screen or menu-only)
  screenFunctionIcons: ScreenFunctionIcons;
  setScreenFunctionIcon: (key: keyof ScreenFunctionIcons, visible: boolean) => void;
  setAllScreenFunctionIcons: (icons: Partial<ScreenFunctionIcons>) => void;

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
  durationIndicatorGlow: boolean;
  setDurationIndicatorGlow: (enabled: boolean) => void;
  durationIndicatorFontSize: "small" | "medium" | "large" | "xl";
  setDurationIndicatorFontSize: (size: "small" | "medium" | "large" | "xl") => void;
  taskCardGlassStyle: string;
  setTaskCardGlassStyle: (style: string) => void;
  narrativeEditWindowBg: string;
  setNarrativeEditWindowBg: (color: string) => void;
  narrativeEditWindowFontColor: string;
  setNarrativeEditWindowFontColor: (color: string) => void;
  textNarrativeEditWindowBg: string;
  setTextNarrativeEditWindowBg: (color: string) => void;
  textNarrativeEditWindowFontColor: string;
  setTextNarrativeEditWindowFontColor: (color: string) => void;
  graphicsNarrativeEditWindowBg: string;
  setGraphicsNarrativeEditWindowBg: (color: string) => void;
  graphicsNarrativeEditWindowFontColor: string;
  setGraphicsNarrativeEditWindowFontColor: (color: string) => void;

  // Locked Task Card Color & Typography (Task Panel & Timeline Panel)
  graphicsLockedCardBg: string;
  graphicsLockedCardFontColor: string;
  lockedSolidColorEnabled: boolean;
  lockedSolidBgColor: string;
  lockedCardFontColor: string;
  lockedCardFontSize: "auto" | "small" | "medium" | "large" | "xl";
  setGraphicsLockedCardBg: (color: string) => void;
  setGraphicsLockedCardFontColor: (color: string) => void;
  setLockedSolidColorEnabled: (enabled: boolean) => void;
  setLockedSolidBgColor: (color: string) => void;
  setLockedCardFontColor: (color: string) => void;
  setLockedCardFontSize: (size: "auto" | "small" | "medium" | "large" | "xl") => void;

  // Google Calendar Tasks & Shared Calendar Styling
  gcalUserOriginatedColorEnabled: boolean;
  gcalUserOriginatedCardBg: string;
  gcalSharedCalendarColorEnabled: boolean;
  gcalSharedCalendarCardBg: string;
  setGcalUserOriginatedColorEnabled: (enabled: boolean) => void;
  setGcalUserOriginatedCardBg: (color: string) => void;
  setGcalSharedCalendarColorEnabled: (enabled: boolean) => void;
  setGcalSharedCalendarCardBg: (color: string) => void;

  // Action Boxes Styling in Focus Task Panel (Graphics Only Mode)
  graphicsActionBoxBg: string;
  graphicsActionBoxFontColor: string;
  graphicsTaskTitleFontSize: "small" | "medium" | "large" | "xl" | "2xl";
  graphicsTimeFontSize: "small" | "medium" | "large" | "xl" | "2xl";
  graphicsNarrativeFontSize: number;
  graphicsNarrativePillFontSize: number;
  graphicsNarrativeAiGrammar: boolean;
  setGraphicsActionBoxBg: (color: string) => void;
  setGraphicsActionBoxFontColor: (color: string) => void;
  setGraphicsTaskTitleFontSize: (size: "small" | "medium" | "large" | "xl" | "2xl") => void;
  setGraphicsTimeFontSize: (size: "small" | "medium" | "large" | "xl" | "2xl") => void;
  setGraphicsNarrativeFontSize: (size: number) => void;
  setGraphicsNarrativePillFontSize: (size: number) => void;
  setGraphicsNarrativeAiGrammar: (enabled: boolean) => void;

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

  // Timeline Drag Auto-Scroll Speed (1: Very Slow, 2: Slow/Smooth Default, 3: Normal, 4: Brisk, 5: Fast)
  timelineScrollSpeed: number;
  setTimelineScrollSpeed: (speed: number) => void;

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
> = (set, get) => ({
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
  compressByDefault: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("compress_by_default");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return false;
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
  narrativeMode: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("narrative_mode");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true; // Active by default for immediate convenience
  })(),
  cardNarrativeFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("card_narrative_font_size");
      if (saved && !isNaN(Number(saved))) {
        const val = Number(saved);
        if (val >= 8 && val <= 32) return val;
      }
    }
    return 12;
  })(),
  screenFunctionIcons: (() => {
    const defaultIcons: ScreenFunctionIcons = {
      expandCollapse: true,
      aiBot: true,
      interactionTracker: true,
      addTask: true,
      workspaceData: true,
      narrativeModeToggle: true,
      categoryFilters: true,
      dateNavigation: true,
    };
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("taskpass_screen_function_icons");
      if (saved) {
        try {
          return { ...defaultIcons, ...JSON.parse(saved) };
        } catch {}
      }
    }
    return defaultIcons;
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
  durationIndicatorGlow: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("duration_indicator_glow");
      if (saved !== null) return saved === "true";
    }
    return true; // Default to glowing highlight
  })(),
  durationIndicatorFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("duration_indicator_font_size");
      if (saved === "small" || saved === "medium" || saved === "large" || saved === "xl") {
        return saved;
      }
    }
    return "medium";
  })(),
  taskCardGlassStyle: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("task_card_glass_style");
      if (saved) return saved;
    }
    return "translucent";
  })(),
  narrativeEditWindowBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("narrative_edit_window_bg");
      if (saved) return saved;
    }
    return "#FFF2DF";
  })(),
  narrativeEditWindowFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("narrative_edit_window_font_color");
      if (saved) return saved;
    }
    return "#1F1A16";
  })(),
  textNarrativeEditWindowBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("text_narrative_edit_window_bg");
      if (saved) return saved;
    }
    return "#FFF2DF";
  })(),
  textNarrativeEditWindowFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("text_narrative_edit_window_font_color");
      if (saved) return saved;
    }
    return "#1F1A16";
  })(),
  graphicsNarrativeEditWindowBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_narrative_edit_window_bg");
      if (saved) return saved;
    }
    return "#0F172A";
  })(),
  graphicsNarrativeEditWindowFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_narrative_edit_window_font_color");
      if (saved) return saved;
    }
    return "#FFFFFF";
  })(),

  // Locked Task Card Styling
  graphicsLockedCardBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_locked_card_bg") || localStorage.getItem("status_locked_solid_bg_color");
      if (saved) return saved;
    }
    return "#A25F37";
  })(),
  graphicsLockedCardFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_locked_card_font_color") || localStorage.getItem("locked_card_font_color");
      if (saved) return saved;
    }
    return "#FFFFFF";
  })(),
  lockedSolidColorEnabled: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("status_locked_solid_color_enabled");
      if (saved !== null) return saved === "true";
    }
    return true; // Default to true so user-chosen solid colors apply immediately
  })(),
  lockedSolidBgColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("status_locked_solid_bg_color") || localStorage.getItem("graphics_locked_card_bg");
      if (saved) return saved;
    }
    return "#e11d48";
  })(),
  lockedCardFontColor: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("locked_card_font_color") || localStorage.getItem("graphics_locked_card_font_color");
      if (saved) return saved;
    }
    return "#FFFFFF";
  })(),
  lockedCardFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("locked_card_font_size");
      if (saved === "small" || saved === "medium" || saved === "large" || saved === "xl") {
        return saved;
      }
    }
    return "auto";
  })(),

  // Google Calendar Tasks & Shared Calendar Styling
  gcalUserOriginatedColorEnabled: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("gcal_user_originated_color_enabled");
      if (saved !== null) return saved === "true";
    }
    return false;
  })(),
  gcalUserOriginatedCardBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("gcal_user_originated_card_bg");
      if (saved) return saved;
    }
    return "#2563EB";
  })(),
  gcalSharedCalendarColorEnabled: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("gcal_shared_calendar_color_enabled");
      if (saved !== null) return saved === "true";
    }
    return false;
  })(),
  gcalSharedCalendarCardBg: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("gcal_shared_calendar_card_bg");
      if (saved) return saved;
    }
    return "#7C3AED";
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
  graphicsNarrativeFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_narrative_font_size");
      if (saved && !isNaN(Number(saved))) {
        const val = Number(saved);
        if (val >= 20 && val <= 120) return val;
      }
    }
    return 60;
  })(),
  graphicsNarrativePillFontSize: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_narrative_pill_font_size");
      if (saved && !isNaN(Number(saved))) {
        const val = Number(saved);
        if (val >= 8 && val <= 32) return val;
      }
    }
    return 12;
  })(),
  graphicsNarrativeAiGrammar: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("graphics_narrative_ai_grammar");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
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
  timelineScrollSpeed: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("timeline_scroll_speed");
      if (saved) {
        const val = parseInt(saved, 10);
        if (val >= 1 && val <= 5) return val;
      }
    }
    return 2; // Default to 2 (Slow / Smooth)
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
  setCompressByDefault: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("compress_by_default", enabled.toString());
    }
    set({ compressByDefault: enabled });
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
  setTimelineScrollSpeed: (speed) => {
    const val = Math.max(1, Math.min(5, speed));
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("timeline_scroll_speed", val.toString());
    }
    set({ timelineScrollSpeed: val });
  },
  setUiMode: (mode) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("app_ui_mode", mode);
    }
    set({ uiMode: mode });
  },
  setNarrativeMode: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("narrative_mode", enabled ? "true" : "false");
    }
    set({ narrativeMode: enabled });
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
  setDurationIndicatorGlow: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("duration_indicator_glow", enabled.toString());
    }
    set({ durationIndicatorGlow: enabled });
  },
  setDurationIndicatorFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("duration_indicator_font_size", size);
    }
    set({ durationIndicatorFontSize: size });
  },
  setTaskCardGlassStyle: (style) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("task_card_glass_style", style);
    }
    set({ taskCardGlassStyle: style });
  },
  setNarrativeEditWindowBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("narrative_edit_window_bg", color);
    }
    const currentMode = (get() as any)?.uiMode || "Text";
    if (currentMode === "Graphics") {
      if (typeof localStorage !== "undefined") localStorage.setItem("graphics_narrative_edit_window_bg", color);
      set({ narrativeEditWindowBg: color, graphicsNarrativeEditWindowBg: color });
    } else {
      if (typeof localStorage !== "undefined") localStorage.setItem("text_narrative_edit_window_bg", color);
      set({ narrativeEditWindowBg: color, textNarrativeEditWindowBg: color });
    }
  },
  setNarrativeEditWindowFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("narrative_edit_window_font_color", color);
    }
    const currentMode = (get() as any)?.uiMode || "Text";
    if (currentMode === "Graphics") {
      if (typeof localStorage !== "undefined") localStorage.setItem("graphics_narrative_edit_window_font_color", color);
      set({ narrativeEditWindowFontColor: color, graphicsNarrativeEditWindowFontColor: color });
    } else {
      if (typeof localStorage !== "undefined") localStorage.setItem("text_narrative_edit_window_font_color", color);
      set({ narrativeEditWindowFontColor: color, textNarrativeEditWindowFontColor: color });
    }
  },
  setTextNarrativeEditWindowBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("text_narrative_edit_window_bg", color);
    }
    set({ textNarrativeEditWindowBg: color });
  },
  setTextNarrativeEditWindowFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("text_narrative_edit_window_font_color", color);
    }
    set({ textNarrativeEditWindowFontColor: color });
  },
  setGraphicsNarrativeEditWindowBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_narrative_edit_window_bg", color);
    }
    set({ graphicsNarrativeEditWindowBg: color });
  },
  setGraphicsNarrativeEditWindowFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_narrative_edit_window_font_color", color);
    }
    set({ graphicsNarrativeEditWindowFontColor: color });
  },
  setGraphicsLockedCardBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_locked_card_bg", color);
      localStorage.setItem("status_locked_solid_bg_color", color);
    }
    set({ graphicsLockedCardBg: color, lockedSolidBgColor: color });
  },
  setGraphicsLockedCardFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_locked_card_font_color", color);
      localStorage.setItem("locked_card_font_color", color);
    }
    set({ graphicsLockedCardFontColor: color, lockedCardFontColor: color });
  },
  setLockedSolidColorEnabled: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("status_locked_solid_color_enabled", enabled ? "true" : "false");
    }
    set({ lockedSolidColorEnabled: enabled });
  },
  setLockedSolidBgColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("status_locked_solid_bg_color", color);
      localStorage.setItem("graphics_locked_card_bg", color);
    }
    set({ lockedSolidBgColor: color, graphicsLockedCardBg: color });
  },
  setLockedCardFontColor: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("locked_card_font_color", color);
      localStorage.setItem("graphics_locked_card_font_color", color);
    }
    set({ lockedCardFontColor: color, graphicsLockedCardFontColor: color });
  },
  setLockedCardFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("locked_card_font_size", size);
    }
    set({ lockedCardFontSize: size });
  },
  setGcalUserOriginatedColorEnabled: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("gcal_user_originated_color_enabled", String(enabled));
    }
    set({ gcalUserOriginatedColorEnabled: enabled });
  },
  setGcalUserOriginatedCardBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("gcal_user_originated_card_bg", color);
    }
    set({ gcalUserOriginatedCardBg: color });
  },
  setGcalSharedCalendarColorEnabled: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("gcal_shared_calendar_color_enabled", String(enabled));
    }
    set({ gcalSharedCalendarColorEnabled: enabled });
  },
  setGcalSharedCalendarCardBg: (color) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("gcal_shared_calendar_card_bg", color);
    }
    set({ gcalSharedCalendarCardBg: color });
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
  setGraphicsNarrativeFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_narrative_font_size", String(size));
    }
    set({ graphicsNarrativeFontSize: size });
  },
  setGraphicsNarrativePillFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_narrative_pill_font_size", String(size));
    }
    set({ graphicsNarrativePillFontSize: size });
  },
  setGraphicsNarrativeAiGrammar: (enabled) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("graphics_narrative_ai_grammar", String(enabled));
    }
    set({ graphicsNarrativeAiGrammar: enabled });
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
  setCardNarrativeFontSize: (size) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("card_narrative_font_size", String(size));
    }
    set({ cardNarrativeFontSize: size });
  },
  setScreenFunctionIcon: (key, visible) => {
    set((state) => {
      const next = { ...state.screenFunctionIcons, [key]: visible };
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("taskpass_screen_function_icons", JSON.stringify(next));
        } catch {}
      }
      return { screenFunctionIcons: next };
    });
  },
  setAllScreenFunctionIcons: (updates) => {
    set((state) => {
      const next = { ...state.screenFunctionIcons, ...updates };
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("taskpass_screen_function_icons", JSON.stringify(next));
        } catch {}
      }
      return { screenFunctionIcons: next };
    });
  },
});
