import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Clock, MapPin, User, Flag, Navigation, Lock, Unlock, 
  Save, Trash2, X, Plus, Check, ChevronDown, CheckSquare, Zap, Eye, EyeOff, Palette
} from "lucide-react";
import { Task } from "../types";
import { TimePickBoxTrigger, DurationPickBoxTrigger } from "./TimePickBox";
import { parseNaturalLanguageTask } from "./InteractiveAppHelpers";
import { parseDurationToMinutes } from "../utils/timeHelpers";
import { isColorLight } from "../utils/themeHelpers";
import { useAppStore } from "../store";
import { computeInitialConnectors } from "./FullActiveWindowNarrativeView";

export interface NarrativeTaskDetailViewProps {
  // Task entity (if editing an existing task)
  task?: Task | null;

  // Form states (controlled)
  taskTitle: string;
  setTaskTitle: (val: string) => void;
  taskDate?: string;
  setTaskDate?: (val: string) => void;
  taskTime: string;
  setTaskTime: (val: string) => void;
  taskDuration: string;
  setTaskDuration: (val: string) => void;
  taskLocation?: string;
  setTaskLocation?: (val: string) => void;
  taskCollaborator?: string;
  setTaskCollaborator?: (val: string) => void;
  taskPriority?: "none" | "low" | "medium" | "high" | "urgent" | string;
  setTaskPriority?: (val: any) => void;
  taskTravelBefore?: number;
  setTaskTravelBefore?: (val: number) => void;
  taskTravelAfter?: number;
  setTaskTravelAfter?: (val: number) => void;
  taskIsLocked?: boolean;
  setTaskIsLocked?: (val: boolean) => void;

  // Directory choices
  favoriteLocations?: string[];
  collaborators?: string[];
  onAddLocation?: (loc: string) => void;
  onAddCollaborator?: (name: string) => void;

  // Visual & environment
  isDark?: boolean;
  isCardEmbedded?: boolean; // true if inside a deck card, false if in full modal
  triggerHaptic?: (type: string) => void;

  // Action callbacks
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onFoTL?: () => void;
  onFocusTask?: () => void;
  onCollapseCard?: () => void;

  // Direct task field update for deck card live-sync
  onUpdateTaskFields?: (updates: Partial<Task>) => void;
}

export const NarrativeTaskDetailView: React.FC<NarrativeTaskDetailViewProps> = React.memo(({
  task,
  taskTitle,
  setTaskTitle,
  taskDate,
  setTaskDate,
  taskTime,
  setTaskTime,
  taskDuration,
  setTaskDuration,
  taskLocation = "",
  setTaskLocation,
  taskCollaborator = "",
  setTaskCollaborator,
  taskPriority = "none",
  setTaskPriority,
  taskTravelBefore = 0,
  setTaskTravelBefore,
  taskTravelAfter = 0,
  setTaskTravelAfter,
  taskIsLocked = false,
  setTaskIsLocked,
  favoriteLocations = ["Office", "Home", "Coffee Shop", "Gym", "Library", "Conference Room A"],
  collaborators = ["Alex", "Sarah", "Manager", "Team", "Client"],
  onAddLocation,
  onAddCollaborator,
  isDark = true,
  isCardEmbedded = false,
  triggerHaptic = () => {},
  onSave,
  onCancel,
  onDelete,
  onFoTL,
  onFocusTask,
  onCollapseCard,
  onUpdateTaskFields,
}) => {
  const graphicsNarrativeAiGrammar = useAppStore((state) => state.graphicsNarrativeAiGrammar) ?? true;
  const setGraphicsNarrativeAiGrammar = useAppStore((state) => state.setGraphicsNarrativeAiGrammar);
  const cardNarrativeFontSize = useAppStore((state) => state.cardNarrativeFontSize) || 12;
  const uiMode = useAppStore((state) => state.uiMode);
  const narrativeEditWindowBg = useAppStore((state) => state.narrativeEditWindowBg);
  const setNarrativeEditWindowBg = useAppStore((state) => state.setNarrativeEditWindowBg);
  const narrativeEditWindowFontColor = useAppStore((state) => state.narrativeEditWindowFontColor);
  const setNarrativeEditWindowFontColor = useAppStore((state) => state.setNarrativeEditWindowFontColor);
  const textNarrativeEditWindowBg = useAppStore((state) => state.textNarrativeEditWindowBg);
  const setTextNarrativeEditWindowBg = useAppStore((state) => state.setTextNarrativeEditWindowBg);
  const textNarrativeEditWindowFontColor = useAppStore((state) => state.textNarrativeEditWindowFontColor);
  const setTextNarrativeEditWindowFontColor = useAppStore((state) => state.setTextNarrativeEditWindowFontColor);
  const graphicsNarrativeEditWindowBg = useAppStore((state) => state.graphicsNarrativeEditWindowBg);
  const setGraphicsNarrativeEditWindowBg = useAppStore((state) => state.setGraphicsNarrativeEditWindowBg);
  const graphicsNarrativeEditWindowFontColor = useAppStore((state) => state.graphicsNarrativeEditWindowFontColor);
  const setGraphicsNarrativeEditWindowFontColor = useAppStore((state) => state.setGraphicsNarrativeEditWindowFontColor);

  const isTextMode = uiMode === "Text";
  const effectiveBg = isTextMode
    ? (textNarrativeEditWindowBg || "#FFF2DF")
    : (graphicsNarrativeEditWindowBg || "#0F172A");
  const effectiveFontColor = isTextMode
    ? (textNarrativeEditWindowFontColor || "#1F1A16")
    : (graphicsNarrativeEditWindowFontColor || "#FFFFFF");
  const isLightWindow = isColorLight(effectiveBg);

  const updateWindowBg = (color: string) => {
    if (isTextMode) {
      setTextNarrativeEditWindowBg(color);
    } else {
      setGraphicsNarrativeEditWindowBg(color);
    }
    setNarrativeEditWindowBg(color);
  };

  const updateWindowFontColor = (color: string) => {
    if (isTextMode) {
      setTextNarrativeEditWindowFontColor(color);
    } else {
      setGraphicsNarrativeEditWindowFontColor(color);
    }
    setNarrativeEditWindowFontColor(color);
  };

  const titleInputRef = useRef<HTMLInputElement>(null);

  const [showColorCustomizer, setShowColorCustomizer] = useState(false);
  const [colorEditorTargetMode, setColorEditorTargetMode] = useState<"Text" | "Graphics">(uiMode === "Graphics" ? "Graphics" : "Text");

  useEffect(() => {
    setColorEditorTargetMode(uiMode === "Graphics" ? "Graphics" : "Text");
  }, [uiMode]);
  const [showPillControls, setShowPillControls] = useState(true);
  const [isParsingActive, setIsParsingActive] = useState(false);
  const [lastParsedSummary, setLastParsedSummary] = useState<string | null>(null);

  // Quick pulldown states for modal interactions
  const [activePicker, setActivePicker] = useState<"location" | "collaborator" | "priority" | "transit" | "duration" | null>(null);
  const [customInputVal, setCustomInputVal] = useState("");

  const focusTitleInput = () => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    } else {
      const el = document.getElementById("narrative-task-title-input") as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Sync field update helper to update both parent state and task store if embedded
  const handleFieldChange = (fields: Partial<Task>) => {
    if (onUpdateTaskFields) {
      onUpdateTaskFields(fields);
    } else {
      if (fields.title !== undefined) setTaskTitle(fields.title);
      if (fields.time !== undefined) setTaskTime(fields.time);
      if (fields.duration !== undefined) setTaskDuration(fields.duration);
      if (fields.date !== undefined && setTaskDate) setTaskDate(fields.date);
      if (fields.location !== undefined && setTaskLocation) setTaskLocation(fields.location);
      if (fields.collaborator !== undefined && setTaskCollaborator) setTaskCollaborator(fields.collaborator);
      if (fields.priority !== undefined && setTaskPriority) setTaskPriority(fields.priority);
      if (fields.travelBefore !== undefined && setTaskTravelBefore) setTaskTravelBefore(fields.travelBefore);
      if (fields.travelAfter !== undefined && setTaskTravelAfter) setTaskTravelAfter(fields.travelAfter);
      if (fields.isLocked !== undefined && setTaskIsLocked) setTaskIsLocked(fields.isLocked);
    }
  };

  // Run the natural language title parser
  const runParser = (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    setIsParsingActive(true);
    triggerHaptic("light");

    const parsed = parseNaturalLanguageTask(rawText, collaborators, taskDate);
    const updates: Partial<Task> = {};
    const detected: string[] = [];

    if (parsed.title && parsed.title !== rawText) {
      updates.title = parsed.title;
      setTaskTitle(parsed.title);
    }
    if (parsed.time) {
      updates.time = parsed.time;
      updates.isLocked = true;
      setTaskTime(parsed.time);
      if (setTaskIsLocked) setTaskIsLocked(true);
      detected.push(`🕒 ${parsed.time}`);
    }
    if (parsed.duration) {
      updates.duration = parsed.duration;
      setTaskDuration(parsed.duration);
      detected.push(`⏳ ${parsed.duration}`);
    }
    if (parsed.date && setTaskDate) {
      updates.date = parsed.date;
      setTaskDate(parsed.date);
      detected.push(`📅 ${parsed.date}`);
    }
    if (parsed.location && setTaskLocation) {
      updates.location = parsed.location;
      setTaskLocation(parsed.location);
      detected.push(`📍 ${parsed.location}`);
    }
    if (parsed.collaborator && setTaskCollaborator) {
      updates.collaborator = parsed.collaborator;
      setTaskCollaborator(parsed.collaborator);
      detected.push(`👤 ${parsed.collaborator}`);
    }
    if (parsed.priority && setTaskPriority) {
      updates.priority = parsed.priority as any;
      setTaskPriority(parsed.priority);
      detected.push(`🚩 ${parsed.priority}`);
    }
    if (parsed.travelBefore !== undefined && setTaskTravelBefore) {
      updates.travelBefore = parsed.travelBefore;
      setTaskTravelBefore(parsed.travelBefore);
      detected.push(`🚗 ${parsed.travelBefore}m before`);
    }
    if (parsed.travelAfter !== undefined && setTaskTravelAfter) {
      updates.travelAfter = parsed.travelAfter;
      setTaskTravelAfter(parsed.travelAfter);
      detected.push(`🚗 ${parsed.travelAfter}m after`);
    }

    if (onUpdateTaskFields && Object.keys(updates).length > 0) {
      onUpdateTaskFields(updates);
    }

    if (detected.length > 0) {
      setLastParsedSummary(`Detected: ${detected.join(" • ")}`);
    } else {
      setLastParsedSummary("Title parsed: ready");
    }

    setTimeout(() => setIsParsingActive(false), 300);
  };

  // Compute 12-hour formatted time strings
  const formatMins12 = (totalMins: number) => {
    const h24 = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const ampm = h24 >= 12 ? "pm" : "am";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const mPadded = String(m).padStart(2, "0");
    return `${h12}:${mPadded}${ampm}`;
  };

  const startTimeParts = (taskTime || "09:00").split(":");
  const startMins = (parseInt(startTimeParts[0], 10) || 0) * 60 + (parseInt(startTimeParts[1], 10) || 0);
  const durMins = parseDurationToMinutes(taskDuration || "30 min") || 30;
  const endMins = (startMins + durMins) % 1440;

  const startTime12 = formatMins12(startMins);
  const endTime12 = formatMins12(endMins);

  const hasLocation = Boolean(taskLocation && taskLocation.trim() && taskLocation !== "no location");
  const hasCollaborator = Boolean(taskCollaborator && taskCollaborator.trim() && taskCollaborator !== "None");
  const hasTransit = (taskTravelBefore || 0) > 0 || (taskTravelAfter || 0) > 0;
  const hasPriority = Boolean(taskPriority && taskPriority !== "none");

  const transitSummary = hasTransit ? "transit" : "";
  const connectors = graphicsNarrativeAiGrammar
    ? computeInitialConnectors(
        taskTitle || "",
        taskLocation || "",
        taskCollaborator || "",
        transitSummary,
        hasPriority
      )
    : {
        leadIn: "From ",
        timeSeparator: " to ",
        actionConnector: " you will ",
        locationConnector: " at ",
        collaboratorConnector: " with ",
        transitConnector: " with ",
        priorityConnector: " as ",
        prioritySuffix: " priority",
      };

  return (
    <div 
      className={`w-full flex flex-col gap-2.5 text-left font-sans select-text transition-colors duration-200 ${
        isCardEmbedded 
          ? "p-2.5 sm:p-3 rounded-2xl border h-auto overflow-visible" 
          : "p-2.5 sm:p-3.5 rounded-2xl border shadow-sm flex-1 min-h-0 overflow-y-auto no-scrollbar"
      }`}
      style={{
        backgroundColor: effectiveBg,
        color: effectiveFontColor,
        borderColor: isLightWindow ? "#EADDC7" : "rgba(255,255,255,0.12)"
      }}
    >
      
      {/* 1. NARRATIVE MODE HEADER - CONDENSED UPWARD WITH CLEAN ICONS */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b shrink-0" style={{ borderColor: isLightWindow ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-xl bg-purple-600/25 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-2xs" title="Narrative Mode Active">
            <Sparkles size={13} className="animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Backing Window & Font Color Customizer Toggle */}
          <button
            type="button"
            id="narrative-detail-colors-toggle-btn"
            onClick={() => {
              setShowColorCustomizer(!showColorCustomizer);
              triggerHaptic("light");
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border select-none ${
              showColorCustomizer
                ? "bg-purple-600 text-white border-purple-500 shadow-xs"
                : isLightWindow
                  ? "bg-black/5 hover:bg-black/10 text-[#3D312A] border-black/15"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            }`}
            title="Fix backing window color and font color"
          >
            <Palette size={10} />
            <span>Theme Colors</span>
          </button>

          {/* AI Grammar Toggle Button */}
          <button
            type="button"
            id="narrative-detail-ai-grammar-toggle-btn"
            onClick={() => {
              const next = !graphicsNarrativeAiGrammar;
              setGraphicsNarrativeAiGrammar(next);
              triggerHaptic("light");
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border select-none ${
              graphicsNarrativeAiGrammar
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/20"
            }`}
            title={
              graphicsNarrativeAiGrammar
                ? "AI Grammar correction is ACTIVE. Click to turn OFF."
                : "AI Grammar correction is PAUSED. Click to turn ON."
            }
          >
            <Sparkles size={10} className={graphicsNarrativeAiGrammar ? "text-amber-500 animate-pulse" : "opacity-40"} />
            <span>{graphicsNarrativeAiGrammar ? "AI Grammar: ON" : "AI Grammar: OFF"}</span>
          </button>

          {/* Lock indicator */}
          <button
            type="button"
            onClick={() => {
              const next = !taskIsLocked;
              handleFieldChange({ isLocked: next });
              triggerHaptic("medium");
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
              taskIsLocked
                ? "bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20"
            }`}
            title={taskIsLocked ? "Start time is Locked (Clock Anchor)" : "Start time is Dynamic (Cascading slot)"}
          >
            {taskIsLocked ? <Lock size={10} /> : <Unlock size={10} />}
            <span>{taskIsLocked ? "Locked" : "Cascade"}</span>
          </button>
        </div>
      </div>

      {/* INLINE COLOR CUSTOMIZER BAR (When user clicks Theme Colors) */}
      {showColorCustomizer && (
        <div className={`p-2.5 rounded-2xl border space-y-2.5 text-xs animate-in fade-in duration-150 ${
          isLightWindow
            ? "bg-white/95 border-slate-300 shadow-md text-slate-900"
            : "bg-slate-900/95 border-slate-700 shadow-md text-slate-100"
        }`}>
          <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <Palette size={13} />
              <span>Fix Backing Window Color & Font Color</span>
            </div>
            
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 p-0.5 rounded-lg border border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setColorEditorTargetMode("Text");
                  triggerHaptic("light");
                }}
                className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  colorEditorTargetMode === "Text"
                    ? "bg-[#DE771B] text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Text Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setColorEditorTargetMode("Graphics");
                  triggerHaptic("light");
                }}
                className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  colorEditorTargetMode === "Graphics"
                    ? "bg-[#1E6B40] text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Graphics Mode
              </button>
              <button
                type="button"
                onClick={() => setShowColorCustomizer(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer ml-1"
                title="Close Theme Colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="text-[8px] font-bold text-slate-500 dark:text-slate-400 px-0.5 flex items-center justify-between">
            <span>
              Configuring <span className="font-black text-purple-600 dark:text-purple-300 uppercase">{colorEditorTargetMode} Mode</span> Details Window (Active App View: <span className="underline font-black">{uiMode}</span>)
            </span>
            <button
              type="button"
              onClick={() => {
                if (colorEditorTargetMode === "Text") {
                  setTextNarrativeEditWindowBg("#FFF2DF");
                  setTextNarrativeEditWindowFontColor("#1F1A16");
                  if (isTextMode) {
                    setNarrativeEditWindowBg("#FFF2DF");
                    setNarrativeEditWindowFontColor("#1F1A16");
                  }
                } else {
                  setGraphicsNarrativeEditWindowBg("#0F172A");
                  setGraphicsNarrativeEditWindowFontColor("#FFFFFF");
                  if (!isTextMode) {
                    setNarrativeEditWindowBg("#0F172A");
                    setNarrativeEditWindowFontColor("#FFFFFF");
                  }
                }
                triggerHaptic("medium");
              }}
              className="text-[7.5px] font-bold uppercase underline text-rose-500 hover:text-rose-600 cursor-pointer"
            >
              Reset {colorEditorTargetMode} Mode Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px]">
            {/* Backing Window Color */}
            <div className="p-2 rounded-xl border border-black/10 dark:border-white/10 space-y-1.5 bg-black/5 dark:bg-white/5">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1">
                  <Palette size={10} className="text-purple-500" />
                  <span>{colorEditorTargetMode} Backing Window:</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[8.5px] opacity-75">
                    {colorEditorTargetMode === "Text" ? (textNarrativeEditWindowBg || "#FFF2DF") : (graphicsNarrativeEditWindowBg || "#0F172A")}
                  </span>
                  <input
                    type="color"
                    value={
                      (colorEditorTargetMode === "Text" ? (textNarrativeEditWindowBg || "#FFF2DF") : (graphicsNarrativeEditWindowBg || "#0F172A")).startsWith("#")
                        ? (colorEditorTargetMode === "Text" ? (textNarrativeEditWindowBg || "#FFF2DF") : (graphicsNarrativeEditWindowBg || "#0F172A"))
                        : colorEditorTargetMode === "Text" ? "#FFF2DF" : "#0F172A"
                    }
                    onChange={(e) => {
                      const color = e.target.value;
                      if (colorEditorTargetMode === "Text") {
                        setTextNarrativeEditWindowBg(color);
                        if (isTextMode) setNarrativeEditWindowBg(color);
                      } else {
                        setGraphicsNarrativeEditWindowBg(color);
                        if (!isTextMode) setNarrativeEditWindowBg(color);
                      }
                      triggerHaptic("light");
                    }}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                    title={`Choose custom ${colorEditorTargetMode} backing window color`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {(colorEditorTargetMode === "Text"
                  ? [
                      { color: "#FFF2DF", name: "Warm Ivory" },
                      { color: "#FAF3E0", name: "Warm Cream" },
                      { color: "#FFFFFF", name: "Pure White" },
                      { color: "#F5EBE1", name: "Sand Parchment" },
                      { color: "#F0FDF4", name: "Sage Tint" },
                      { color: "#FFF5EB", name: "Terracotta Tint" },
                      { color: "#1C3B2B", name: "Forest Dark" },
                      { color: "#1F1A16", name: "Espresso" },
                    ]
                  : [
                      { color: "#0F172A", name: "Midnight" },
                      { color: "#1A202C", name: "Slate Dark" },
                      { color: "#1C3B2B", name: "Forest Dark" },
                      { color: "#152E21", name: "Deep Green" },
                      { color: "#2E1065", name: "Deep Violet" },
                      { color: "#FAF3E0", name: "Warm Cream" },
                      { color: "#FFF2DF", name: "Warm Ivory" },
                    ]
                ).map((preset) => {
                  const activeTargetBg = colorEditorTargetMode === "Text" ? (textNarrativeEditWindowBg || "#FFF2DF") : (graphicsNarrativeEditWindowBg || "#0F172A");
                  return (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => {
                        if (colorEditorTargetMode === "Text") {
                          setTextNarrativeEditWindowBg(preset.color);
                          if (isTextMode) setNarrativeEditWindowBg(preset.color);
                        } else {
                          setGraphicsNarrativeEditWindowBg(preset.color);
                          if (!isTextMode) setNarrativeEditWindowBg(preset.color);
                        }
                        triggerHaptic("light");
                      }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        activeTargetBg.toLowerCase() === preset.color.toLowerCase()
                          ? "ring-1 ring-purple-500 border-purple-500 font-black shadow-2xs"
                          : "border-black/15 dark:border-white/15 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: preset.color, color: isColorLight(preset.color) ? "#1F1A16" : "#FFFFFF" }}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Color */}
            <div className="p-2 rounded-xl border border-black/10 dark:border-white/10 space-y-1.5 bg-black/5 dark:bg-white/5">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1">
                  <Palette size={10} className="text-purple-500" />
                  <span>{colorEditorTargetMode} Window Font:</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[8.5px] opacity-75">
                    {colorEditorTargetMode === "Text" ? (textNarrativeEditWindowFontColor || "#1F1A16") : (graphicsNarrativeEditWindowFontColor || "#FFFFFF")}
                  </span>
                  <input
                    type="color"
                    value={
                      (colorEditorTargetMode === "Text" ? (textNarrativeEditWindowFontColor || "#1F1A16") : (graphicsNarrativeEditWindowFontColor || "#FFFFFF")).startsWith("#")
                        ? (colorEditorTargetMode === "Text" ? (textNarrativeEditWindowFontColor || "#1F1A16") : (graphicsNarrativeEditWindowFontColor || "#FFFFFF"))
                        : colorEditorTargetMode === "Text" ? "#1F1A16" : "#FFFFFF"
                    }
                    onChange={(e) => {
                      const color = e.target.value;
                      if (colorEditorTargetMode === "Text") {
                        setTextNarrativeEditWindowFontColor(color);
                        if (isTextMode) setNarrativeEditWindowFontColor(color);
                      } else {
                        setGraphicsNarrativeEditWindowFontColor(color);
                        if (!isTextMode) setNarrativeEditWindowFontColor(color);
                      }
                      triggerHaptic("light");
                    }}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                    title={`Choose custom ${colorEditorTargetMode} window font color`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {(colorEditorTargetMode === "Text"
                  ? [
                      { color: "#1F1A16", name: "Charcoal" },
                      { color: "#2D2319", name: "Dark Cocoa" },
                      { color: "#1E6B40", name: "Deep Green" },
                      { color: "#DE771B", name: "Amber" },
                      { color: "#7B24C7", name: "Royal Purple" },
                      { color: "#2563EB", name: "Cobalt" },
                      { color: "#FFFFFF", name: "White" },
                    ]
                  : [
                      { color: "#FFFFFF", name: "White" },
                      { color: "#F8FAFC", name: "Ice White" },
                      { color: "#10B981", name: "Emerald" },
                      { color: "#F59E0B", name: "Amber" },
                      { color: "#A78BFA", name: "Violet" },
                      { color: "#38BDF8", name: "Sky Blue" },
                      { color: "#1F1A16", name: "Charcoal" },
                    ]
                ).map((preset) => {
                  const activeTargetFont = colorEditorTargetMode === "Text" ? (textNarrativeEditWindowFontColor || "#1F1A16") : (graphicsNarrativeEditWindowFontColor || "#FFFFFF");
                  return (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => {
                        if (colorEditorTargetMode === "Text") {
                          setTextNarrativeEditWindowFontColor(preset.color);
                          if (isTextMode) setNarrativeEditWindowFontColor(preset.color);
                        } else {
                          setGraphicsNarrativeEditWindowFontColor(preset.color);
                          if (!isTextMode) setNarrativeEditWindowFontColor(preset.color);
                        }
                        triggerHaptic("light");
                      }}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        activeTargetFont.toLowerCase() === preset.color.toLowerCase()
                          ? "ring-1 ring-purple-500 border-purple-500 font-black shadow-2xs"
                          : "border-black/15 dark:border-white/15 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: preset.color }} />
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TASK TITLE ENTRY - CONDENSED UPWARD */}
      <div className="w-full shrink-0">
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1">
            <input
              id="narrative-task-title-input"
              ref={titleInputRef}
              type="text"
              value={taskTitle}
              onChange={(e) => {
                const val = e.target.value;
                setTaskTitle(val);
                if (onUpdateTaskFields) onUpdateTaskFields({ title: val });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.keyCode === 13) {
                  e.preventDefault();
                  const currentVal = (e.currentTarget.value || taskTitle || "").trim();
                  if (!currentVal) return;
                  setTaskTitle(currentVal);
                  if (onUpdateTaskFields) onUpdateTaskFields({ title: currentVal });
                  runParser(currentVal);
                  triggerHaptic("success");
                  if (onSave) {
                    setTimeout(() => {
                      onSave();
                    }, 50);
                  } else if (isCardEmbedded && onCollapseCard) {
                    onCollapseCard();
                  }
                }
              }}
              placeholder="Task title..."
              className={`w-full h-10 px-3.5 rounded-xl font-bold text-sm outline-none border transition-all shadow-xs pr-8 ${
                isLightWindow
                  ? "bg-white border-slate-300 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
                  : "bg-slate-900/90 border-slate-700 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              }`}
              style={{
                color: effectiveFontColor,
              }}
            />
            {taskTitle ? (
              <button
                type="button"
                onClick={() => {
                  setTaskTitle("");
                  if (onUpdateTaskFields) onUpdateTaskFields({ title: "" });
                  titleInputRef.current?.focus();
                  triggerHaptic("light");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                title="Clear title input"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          {/* Explicit Parse Button */}
          <button
            type="button"
            onClick={() => runParser(taskTitle)}
            disabled={!taskTitle || !taskTitle.trim() || isParsingActive}
            className={`h-10 px-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 shrink-0 ${
              isParsingActive
                ? "bg-indigo-400 text-white"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border border-indigo-400/30"
            }`}
            title="Parse title"
          >
            <Sparkles size={12} className={isParsingActive ? "animate-spin" : ""} />
            <span>Parse</span>
          </button>
        </div>
      </div>

      {/* 3. AI NARRATIVE WITH INTERACTIVE GREEN-UNDERLINED TOKENS */}
      <div 
        className={`w-full flex flex-col justify-start rounded-2xl sm:rounded-3xl border transition-all duration-200 ${
          isCardEmbedded
            ? "h-auto min-h-0 overflow-visible p-3 sm:p-4"
            : "flex-1 min-h-[90px] max-h-[38vh] overflow-y-auto p-3 sm:p-4 shadow-inner"
        }`}
        style={{
          backgroundColor: isLightWindow ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.3)",
          color: effectiveFontColor,
          borderColor: isLightWindow ? "#EADDC7" : "rgba(255, 255, 255, 0.15)"
        }}
      >
        <div className={`flex items-start gap-2.5 ${isCardEmbedded ? "w-full h-auto" : "flex-1"}`}>
          <Sparkles size={16} className="text-[#1E6B40] shrink-0 mt-1" />
          
          <div 
            className="font-normal leading-relaxed flex flex-wrap items-baseline gap-x-2 gap-y-2 text-base sm:text-xl not-italic"
            style={{ fontSize: `${Math.max(cardNarrativeFontSize, 16)}px`, color: effectiveFontColor }}
          >
            <span>{connectors.leadIn.trim()}</span>

            {/* TIME TOKEN */}
            <span className="relative inline-flex items-center">
              <TimePickBoxTrigger
                value={taskTime || "09:00"}
                onChange={(newTime) => {
                  handleFieldChange({ time: newTime, isLocked: true });
                  triggerHaptic("medium");
                }}
                isDark={isDark}
                className="bg-transparent underline decoration-[#1E6B40] underline-offset-4 decoration-2 px-1 py-0.5 rounded hover:bg-[#1E6B40]/10 font-bold not-italic cursor-pointer transition-colors text-current"
                title="Change start time"
              >
                <span style={{ color: effectiveFontColor }}>{startTime12} to {endTime12}</span>
              </TimePickBoxTrigger>
            </span>

            {/* DURATION TOKEN */}
            <span className="relative inline-flex items-center">
              <span>(for </span>
              <span
                onClick={() => setActivePicker(activePicker === "duration" ? null : "duration")}
                className="underline decoration-[#1E6B40] underline-offset-4 decoration-2 px-1 py-0.5 rounded hover:bg-[#1E6B40]/10 font-bold not-italic cursor-pointer transition-colors text-current"
                title="Change duration"
                style={{ color: effectiveFontColor }}
              >
                {taskDuration || "30 min"}
              </span>
              <span>)</span>
            </span>

            <span>{connectors.actionConnector.trim()}</span>

            {/* TITLE TOKEN */}
            <span
              onClick={() => {
                titleInputRef.current?.focus();
                titleInputRef.current?.select();
                triggerHaptic("light");
              }}
              className="underline decoration-[#1E6B40] underline-offset-4 decoration-2 px-1 py-0.5 rounded hover:bg-[#1E6B40]/10 font-bold not-italic cursor-pointer transition-colors text-current"
              title="Click to edit task title"
              style={{ color: effectiveFontColor }}
            >
              {taskTitle && taskTitle.trim() ? taskTitle.trim() : "Untitled Task"}
            </span>

            {/* LOCATION TOKEN (IF SET) */}
            {hasLocation ? (
              <span className="relative inline-flex items-center group">
                <span>{connectors.locationConnector.trim() || "at"}</span>
                <span 
                  onClick={() => setActivePicker(activePicker === "location" ? null : "location")}
                  className="underline decoration-[#1E6B40] underline-offset-4 decoration-2 px-1 py-0.5 rounded hover:bg-[#1E6B40]/10 font-bold not-italic cursor-pointer transition-colors ml-1 text-current"
                  title="Click to change location"
                  style={{ color: effectiveFontColor }}
                >
                  {taskLocation}
                </span>
              </span>
            ) : null}

            {/* COLLABORATOR TOKEN (IF SET) */}
            {hasCollaborator ? (
              <span className="relative inline-flex items-center group">
                <span>{connectors.collaboratorConnector.trim() || "with"}</span>
                <span 
                  onClick={() => setActivePicker(activePicker === "collaborator" ? null : "collaborator")}
                  className="underline decoration-[#1E6B40] underline-offset-4 decoration-2 px-1 py-0.5 rounded hover:bg-[#1E6B40]/10 font-bold not-italic cursor-pointer transition-colors ml-1 text-current"
                  title="Click to change collaborator"
                  style={{ color: effectiveFontColor }}
                >
                  {taskCollaborator}
                </span>
              </span>
            ) : null}

            {/* TRANSIT BUFFER TOKEN (IF SET) */}
            {hasTransit ? (
              <span className="relative inline-flex items-center group">
                <span>{connectors.transitConnector.trim() || "with"}</span>
                <span 
                  onClick={() => setActivePicker(activePicker === "transit" ? null : "transit")}
                  className="underline decoration-[#1E6B40] underline-offset-4 decoration-2 px-1 py-0.5 rounded hover:bg-[#1E6B40]/10 font-bold not-italic cursor-pointer transition-colors ml-1 text-current"
                  title="Click to change transit buffers"
                  style={{ color: effectiveFontColor }}
                >
                  {(taskTravelBefore || 0) > 0 && (taskTravelAfter || 0) > 0
                    ? taskTravelBefore === taskTravelAfter
                      ? `${taskTravelBefore} min transit before & after`
                      : `${taskTravelBefore} min before and ${taskTravelAfter} min after`
                    : (taskTravelBefore || 0) > 0
                    ? `${taskTravelBefore} min transit before`
                    : `${taskTravelAfter} min transit after`}
                </span>
              </span>
            ) : null}

            {/* PRIORITY TOKEN (IF SET) */}
            {hasPriority ? (
              <span className="relative inline-flex items-center group">
                <span>{connectors.priorityConnector.trim() || "as"}</span>
                <span 
                  onClick={() => setActivePicker(activePicker === "priority" ? null : "priority")}
                  className="underline decoration-[#1E6B40] underline-offset-4 decoration-2 px-1 py-0.5 rounded hover:bg-[#1E6B40]/10 font-bold not-italic cursor-pointer transition-colors ml-1 text-current uppercase"
                  title="Click to change priority"
                  style={{ color: effectiveFontColor }}
                >
                  {taskPriority}{connectors.prioritySuffix || " priority"}
                </span>
              </span>
            ) : null}

            <span>.</span>
          </div>
        </div>

        {/* INLINE PICKER PULLEYS (When clicking tokens or pills) */}
        {activePicker && (
          <div className="mt-2.5 pt-2 border-t border-indigo-500/20 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* LOCATION PICKER */}
            {activePicker === "location" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-amber-500 tracking-wider">
                  <span>Select or add location:</span>
                  <button type="button" onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {favoriteLocations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        handleFieldChange({ location: loc });
                        setActivePicker(null);
                        triggerHaptic("light");
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        taskLocation === loc
                          ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                  {hasLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        handleFieldChange({ location: "" });
                        setActivePicker(null);
                        triggerHaptic("light");
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                    >
                      Remove Location
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    value={customInputVal}
                    onChange={(e) => setCustomInputVal(e.target.value)}
                    placeholder="Add custom location..."
                    className="h-7 px-2 text-xs rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customInputVal.trim()) {
                        const trimmed = customInputVal.trim();
                        handleFieldChange({ location: trimmed });
                        if (onAddLocation) onAddLocation(trimmed);
                        setCustomInputVal("");
                        setActivePicker(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customInputVal.trim()) {
                        const trimmed = customInputVal.trim();
                        handleFieldChange({ location: trimmed });
                        if (onAddLocation) onAddLocation(trimmed);
                        setCustomInputVal("");
                        setActivePicker(null);
                      }
                    }}
                    className="h-7 px-2.5 rounded-lg bg-amber-600 text-white font-black text-[9px] uppercase tracking-wider cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* COLLABORATOR PICKER */}
            {activePicker === "collaborator" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-purple-500 tracking-wider">
                  <span>Select or add collaborator:</span>
                  <button type="button" onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {collaborators.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        handleFieldChange({ collaborator: c });
                        setActivePicker(null);
                        triggerHaptic("light");
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        taskCollaborator === c
                          ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                  {hasCollaborator && (
                    <button
                      type="button"
                      onClick={() => {
                        handleFieldChange({ collaborator: "" });
                        setActivePicker(null);
                        triggerHaptic("light");
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                    >
                      Remove Collaborator
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    value={customInputVal}
                    onChange={(e) => setCustomInputVal(e.target.value)}
                    placeholder="Add custom collaborator..."
                    className="h-7 px-2 text-xs rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customInputVal.trim()) {
                        const trimmed = customInputVal.trim();
                        handleFieldChange({ collaborator: trimmed });
                        if (onAddCollaborator) onAddCollaborator(trimmed);
                        setCustomInputVal("");
                        setActivePicker(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customInputVal.trim()) {
                        const trimmed = customInputVal.trim();
                        handleFieldChange({ collaborator: trimmed });
                        if (onAddCollaborator) onAddCollaborator(trimmed);
                        setCustomInputVal("");
                        setActivePicker(null);
                      }
                    }}
                    className="h-7 px-2.5 rounded-lg bg-purple-600 text-white font-black text-[9px] uppercase tracking-wider cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* PRIORITY PICKER */}
            {activePicker === "priority" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-rose-500 tracking-wider">
                  <span>Select priority:</span>
                  <button type="button" onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: "🚩 High", val: "high", color: "bg-red-500/20 text-red-400 border-red-500/40" },
                    { label: "🟡 Medium", val: "medium", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
                    { label: "🟢 Low", val: "low", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
                    { label: "⚪ None", val: "none", color: "bg-slate-500/20 text-slate-400 border-slate-500/40" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        handleFieldChange({ priority: p.val as any });
                        setActivePicker(null);
                        triggerHaptic("light");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${p.color} ${
                        taskPriority === p.val ? "ring-2 ring-white shadow-xs font-black scale-105" : ""
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TRANSIT BUFFER PICKER */}
            {activePicker === "transit" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-blue-500 tracking-wider">
                  <span>Transit buffer presets:</span>
                  <button type="button" onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: "15m before & after", b: 15, a: 15 },
                    { label: "30m before & after", b: 30, a: 30 },
                    { label: "45m before & after", b: 45, a: 45 },
                    { label: "60m before & after", b: 60, a: 60 },
                    { label: "15m before only", b: 15, a: 0 },
                    { label: "30m before only", b: 30, a: 0 },
                    { label: "45m before only", b: 45, a: 0 },
                    { label: "60m before only", b: 60, a: 0 },
                    { label: "15m after only", b: 0, a: 15 },
                    { label: "30m after only", b: 0, a: 30 },
                    { label: "45m after only", b: 0, a: 45 },
                    { label: "60m after only", b: 0, a: 60 },
                    { label: "No Transit", b: 0, a: 0 },
                  ].map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        handleFieldChange({ travelBefore: t.b, travelAfter: t.a });
                        setActivePicker(null);
                        triggerHaptic("light");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        taskTravelBefore === t.b && taskTravelAfter === t.a
                          ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DURATION PICKER */}
            {activePicker === "duration" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-emerald-500 tracking-wider">
                  <span>Choose duration:</span>
                  <button type="button" onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {["15 min", "30 min", "45 min", "60 min", "90 min", "120 min"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        handleFieldChange({ duration: d });
                        setActivePicker(null);
                        triggerHaptic("light");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        taskDuration === d
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. PILL BUTTONS FOR ADDING / ADJUSTING ATTRIBUTES */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
            Add to narrative:
          </span>
          <button
            type="button"
            onClick={() => setShowPillControls(!showPillControls)}
            className="text-[8.5px] font-bold text-indigo-500 dark:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            {showPillControls ? <EyeOff size={10} /> : <Eye size={10} />}
            <span>{showPillControls ? "Hide Pills" : "Show Pills"}</span>
          </button>
        </div>

        {showPillControls && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* LOCATION PILL */}
            <button
              type="button"
              onClick={() => {
                setActivePicker(activePicker === "location" ? null : "location");
                triggerHaptic("light");
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                hasLocation
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-dashed border-amber-500/40 hover:bg-amber-500/20"
              }`}
            >
              <MapPin size={11} className="shrink-0" />
              <span>{hasLocation ? taskLocation : "+ Location"}</span>
            </button>

            {/* COLLABORATOR PILL */}
            <button
              type="button"
              onClick={() => {
                setActivePicker(activePicker === "collaborator" ? null : "collaborator");
                triggerHaptic("light");
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                hasCollaborator
                  ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-dashed border-purple-500/40 hover:bg-purple-500/20"
              }`}
            >
              <User size={11} className="shrink-0" />
              <span>{hasCollaborator ? taskCollaborator : "+ Collaborator"}</span>
            </button>

            {/* TRANSIT PILL */}
            <button
              type="button"
              onClick={() => {
                setActivePicker(activePicker === "transit" ? null : "transit");
                triggerHaptic("light");
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                hasTransit
                  ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 hover:bg-blue-500/30"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-dashed border-blue-500/40 hover:bg-blue-500/20"
              }`}
            >
              <Navigation size={11} className="shrink-0" />
              <span>{hasTransit ? `${taskTravelBefore || 0}m/${taskTravelAfter || 0}m` : "+ Transit Time"}</span>
            </button>

            {/* PRIORITY PILL */}
            <button
              type="button"
              onClick={() => {
                setActivePicker(activePicker === "priority" ? null : "priority");
                triggerHaptic("light");
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                hasPriority
                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/30 uppercase"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-dashed border-rose-500/40 hover:bg-rose-500/20"
              }`}
            >
              <Flag size={11} className="shrink-0" />
              <span>{hasPriority ? taskPriority : "+ Priority"}</span>
            </button>

            {/* DURATION PILL */}
            <button
              type="button"
              onClick={() => {
                setActivePicker(activePicker === "duration" ? null : "duration");
                triggerHaptic("light");
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Clock size={11} className="shrink-0" />
              <span>{taskDuration || "30 min"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. ACTION BUTTONS - ALWAYS ANCHORED & VISIBLE */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-indigo-500/15 shrink-0 mt-auto">
        <div className="flex items-center gap-1.5">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              title="Delete task"
            >
              <Trash2 size={12} />
              <span>Delete</span>
            </button>
          )}

          {onFoTL && (
            <button
              type="button"
              onClick={onFoTL}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              title="Lock start to now and save (FoTL)"
            >
              <Clock size={12} />
              <span>FoTL</span>
            </button>
          )}

          {isCardEmbedded && onFocusTask && (
            <button
              type="button"
              onClick={onFocusTask}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              title="Focus on this task"
            >
              <Zap size={12} />
              <span>Focus</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isCardEmbedded ? (
            <button
              type="button"
              onClick={onCollapseCard}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
              title="Collapse task card"
            >
              <Check size={12} />
              <span>Done</span>
            </button>
          ) : (
            <>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 rounded-xl bg-slate-600/30 hover:bg-slate-600/40 text-slate-300 border border-slate-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
                >
                  <Save size={13} />
                  <span>{task ? "Update Task" : "Save Task"}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
