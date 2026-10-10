import React, { useState, memo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  Sparkles,
  BookOpen,
  Plus,
  Coffee,
  CheckSquare,
  FilePlus,
  FileText,
  Brain,
  Database,
  Users,
  Coins,
  RotateCcw,
  Sun,
  Moon,
  ShieldCheck,
  Settings2,
  Layers,
  Zap,
  CheckCircle2,
  Unlock,
  Flag,
  RefreshCw,
  ShoppingBag,
  ListOrdered,
  ArrowRight,
  Palette,
  FolderClosed,
  Activity,
  Type,
  Lock,
  Magnet,
  SlidersHorizontal,
  Bell,
  Volume2,
  HardDrive,
  Terminal,
  LogIn,
  LogOut,
  Layout,
  Cloud,
  Eye,
  EyeOff,
  Bot,
  Filter
} from "lucide-react";
import { formatDate } from "../utils/timeHelpers";
import { useAppStore } from "../store";
import { ScreenFunctionIcons } from "../store/settingsSlice";
import { isColorLight } from "../utils/themeHelpers";
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from "firebase/auth";
import { playTaskCompletionChime, setCompletionChimeEnabled } from "../utils/soundEffects";
import { DeveloperHub } from "./DeveloperHub";

export interface GraphicsModeHamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerHaptic?: (type?: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  currentUser?: FirebaseUser | null;
  auth?: Auth | null;

  // Search
  searchQuery: string;
  onSearchChange: (val: string) => void;

  // Views & Schedule
  currentView?: "focus" | "deck" | "timeline" | "passed" | "report";
  onSelectView?: (view: "focus" | "deck" | "timeline" | "passed" | "report") => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  activeDayStartHour: string;
  onStartHourChange: (time: string) => void;

  // Quick Create & Actions
  onAddTask: () => void;
  onDeployRoutine?: () => void;
  onSequenceBrainstorm?: () => void;
  onQuickNote?: () => void;

  // AI & Intelligence
  onOpenChatbot: () => void;
  onOpenNotebookLm?: () => void;
  onOpenAiPlans?: () => void;
  aiPlansEnabled?: boolean;
  setAiPlansEnabled?: (val: boolean) => void;
  aiSubtasksEnabled?: boolean;
  setAiSubtasksEnabled?: (val: boolean) => void;
  notebookLmEnabled?: boolean;
  setNotebookLmEnabled?: (val: boolean) => void;
  aiNarrativeEnabled?: boolean;
  setAiNarrativeEnabled?: (val: boolean) => void;

  // Bulk Operations
  onOpenBulkPrioritize?: () => void;
  onAdHocSequence?: () => void;
  onUnlockAll?: () => void;
  onClearFlags?: () => void;
  onReprocessRules?: () => void;
  onBulkToSaved?: () => void;
  onBulkToTomorrow?: () => void;
  onBulkToDone?: () => void;

  // Google Calendar Sync
  onGcalSync?: () => void;
  isGcalSyncActive?: boolean;
  setIsGcalSyncActive?: (val: boolean) => void;
  isGcalLoading?: boolean;
  onPullGcal?: () => void;
  onPushAllTasksToGcal?: () => void;

  // Workspace Data & Repositories
  notesCount?: number;
  onOpenNotesRepo?: () => void;
  onOpenDataWarehouse?: (tab?: "plans" | "directory" | "spending") => void;
  onOpenManageCollaborators?: () => void;
  setDataWarehouseTab?: (tab: any) => void;
  setShowDataWarehouse?: (val: boolean) => void;

  // Display & Style
  cardDensity?: "standard" | "simplified" | "very_simplified" | "report";
  setCardDensity?: (val: "standard" | "simplified" | "very_simplified" | "report") => void;
  fontSizeScale?: "normal" | "readable" | "large" | string;
  setFontSizeScale?: (val: "normal" | "readable" | "large") => void;
  focusCardDetailMode?: "detailed" | "simple";
  setFocusCardDetailMode?: (val: "detailed" | "simple") => void;
  showCompletedTasks?: boolean;
  setShowCompletedTasks?: (val: boolean) => void;
  sequenceGroupHeadersEnabled?: boolean;
  setSequenceGroupHeadersEnabled?: (val: boolean) => void;
  panelBgDayColor?: string;
  setPanelBgDayColor?: (val: string) => void;
  panelBgNightColor?: string;
  setPanelBgNightColor?: (val: string) => void;
  lockedSolidColorEnabled?: boolean;
  setLockedSolidColorEnabled?: (val: boolean) => void;
  lockedSolidBgColor?: string;
  setLockedSolidBgColor?: (val: string) => void;

  // Feature Toggles (14 Modules)
  tasksPanelEnabled?: boolean;
  setTasksPanelEnabled?: (val: boolean) => void;
  focusPanelEnabled?: boolean;
  setFocusPanelEnabled?: (val: boolean) => void;
  timelinePanelEnabled?: boolean;
  setTimelinePanelEnabled?: (val: boolean) => void;
  notesRepoEnabled?: boolean;
  setNotesRepoEnabled?: (val: boolean) => void;
  collaboratorsEnabled?: boolean;
  setCollaboratorsEnabled?: (val: boolean) => void;
  sequencesEnabled?: boolean;
  setSequencesEnabled?: (val: boolean) => void;
  bulkAddTasksEnabled?: boolean;
  setBulkAddTasksEnabled?: (val: boolean) => void;
  bulkOpsEnabled?: boolean;
  setBulkOpsEnabled?: (val: boolean) => void;
  expensesEnabled?: boolean;
  setExpensesEnabled?: (val: boolean) => void;
  workspaceDataEnabled?: boolean;
  setWorkspaceDataEnabled?: (val: boolean) => void;

  // System & Preferences
  canUndo?: boolean;
  onUndo?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  uiMode: "Text" | "Graphics";
  onSetUiMode: (mode: "Text" | "Graphics") => void;
  onOpenSettings: () => void;
  openSettingsModal?: (tab?: string, expandedId?: string) => void;
  saveSystemSettingsToCloud?: (patch: Record<string, any>) => void;
  defaultWeatherLocation?: string;
  setDefaultWeatherLocation?: (val: string) => void;
  isToastEnabled?: boolean;
  setIsToastEnabled?: (val: boolean) => void;
  completionSoundEnabled?: boolean;
  setCompletionSoundEnabled?: (val: boolean) => void;
  favorPoints?: number;
  onOpenTaskPass?: () => void;
  onOpenAdminPortal?: () => void;
  taskpassEnabled?: boolean;
  setTaskpassEnabled?: (val: boolean) => void;
  compressByDefault?: boolean;
  onToggleCompressByDefault?: () => void;
}

export const GraphicsModeHamburgerMenu: React.FC<GraphicsModeHamburgerMenuProps> = memo(function GraphicsModeHamburgerMenu({
  isOpen,
  onClose,
  triggerHaptic = () => {},
  currentUser,
  auth,
  searchQuery,
  onSearchChange,
  currentView = "focus",
  onSelectView,
  selectedDate,
  onSelectDate,
  onPrevDay,
  onNextDay,
  onToday,
  activeDayStartHour,
  onStartHourChange,
  onAddTask,
  onDeployRoutine,
  onSequenceBrainstorm,
  onQuickNote,
  onOpenChatbot,
  onOpenNotebookLm,
  onOpenAiPlans,
  aiPlansEnabled = true,
  setAiPlansEnabled,
  aiSubtasksEnabled = true,
  setAiSubtasksEnabled,
  notebookLmEnabled = true,
  setNotebookLmEnabled,
  aiNarrativeEnabled = true,
  setAiNarrativeEnabled,
  onOpenBulkPrioritize,
  onAdHocSequence,
  onUnlockAll,
  onClearFlags,
  onReprocessRules,
  onBulkToSaved,
  onBulkToTomorrow,
  onBulkToDone,
  onGcalSync,
  isGcalSyncActive = false,
  setIsGcalSyncActive,
  isGcalLoading = false,
  onPullGcal,
  onPushAllTasksToGcal,
  notesCount = 0,
  onOpenNotesRepo,
  onOpenDataWarehouse,
  onOpenManageCollaborators,
  cardDensity = "standard",
  setCardDensity,
  fontSizeScale = "normal",
  setFontSizeScale,
  focusCardDetailMode = "detailed",
  setFocusCardDetailMode,
  showCompletedTasks = false,
  setShowCompletedTasks,
  sequenceGroupHeadersEnabled = true,
  setSequenceGroupHeadersEnabled,
  tasksPanelEnabled = true,
  setTasksPanelEnabled,
  focusPanelEnabled = true,
  setFocusPanelEnabled,
  timelinePanelEnabled = true,
  setTimelinePanelEnabled,
  notesRepoEnabled = true,
  setNotesRepoEnabled,
  collaboratorsEnabled = true,
  setCollaboratorsEnabled,
  sequencesEnabled = true,
  setSequencesEnabled,
  bulkAddTasksEnabled = true,
  setBulkAddTasksEnabled,
  bulkOpsEnabled = true,
  setBulkOpsEnabled,
  expensesEnabled = true,
  setExpensesEnabled,
  workspaceDataEnabled = true,
  setWorkspaceDataEnabled,
  canUndo = false,
  onUndo,
  isDark = false,
  onToggleTheme,
  uiMode,
  onSetUiMode,
  onOpenSettings,
  openSettingsModal,
  saveSystemSettingsToCloud = () => {},
  defaultWeatherLocation = "",
  setDefaultWeatherLocation,
  isToastEnabled = true,
  setIsToastEnabled,
  completionSoundEnabled = true,
  setCompletionSoundEnabled = () => {},
  favorPoints = 0,
  onOpenTaskPass,
  onOpenAdminPortal,
  setShowAdminPortal,
  taskpassEnabled = true,
  setTaskpassEnabled,
  compressByDefault = false,
  onToggleCompressByDefault
}) {
  const [activeSection, setActiveSection] = useState<string>("all");
  const [currentSubmenu, setCurrentSubmenu] = useState<"main" | "features" | "dev" | "screenIcons">("main");
  const [showInlineScreenIcons, setShowInlineScreenIcons] = useState<boolean>(true);

  // Remembered collapsed sections state (1 through 7) across menu opens/closes
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem("taskpass_hamburger_menu_collapsed_sections");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const toggleSectionCollapse = (sectionNum: number) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [sectionNum]: !prev[sectionNum] };
      try {
        localStorage.setItem("taskpass_hamburger_menu_collapsed_sections", JSON.stringify(next));
      } catch {}
      return next;
    });
    if (triggerHaptic) triggerHaptic("light");
  };

  const areAllCollapsed = [1, 2, 3, 4, 5, 6, 7].every(num => !!collapsedSections[num]);

  const toggleCollapseAll = () => {
    const shouldCollapseAll = !areAllCollapsed;
    const next: Record<number, boolean> = {};
    [1, 2, 3, 4, 5, 6, 7].forEach(num => {
      next[num] = shouldCollapseAll;
    });
    setCollapsedSections(next);
    try {
      localStorage.setItem("taskpass_hamburger_menu_collapsed_sections", JSON.stringify(next));
    } catch {}
    if (triggerHaptic) triggerHaptic("medium");
  };

  const isSectionCollapsed = (num: number) => {
    if (searchQuery.trim() !== "") return false;
    return !!collapsedSections[num];
  };

  const deckCardHeaderBg = useAppStore((state) => state.deckCardHeaderBg);
  const deckCardExpandedBg = useAppStore((state) => state.deckCardExpandedBg);
  const deckCardFontColor = useAppStore((state) => state.deckCardFontColor);
  const deckCardFontSize = useAppStore((state) => state.deckCardFontSize);
  const graphicsActiveWindowBg = useAppStore((state) => state.graphicsActiveWindowBg);
  const graphicsLockedCardBg = useAppStore((state) => state.graphicsLockedCardBg);
  const graphicsLockedCardFontColor = useAppStore((state) => state.graphicsLockedCardFontColor);
  const graphicsActionBoxBg = useAppStore((state) => state.graphicsActionBoxBg);
  const graphicsActionBoxFontColor = useAppStore((state) => state.graphicsActionBoxFontColor);
  const graphicsTaskTitleFontSize = useAppStore((state) => state.graphicsTaskTitleFontSize);
  const graphicsTimeFontSize = useAppStore((state) => state.graphicsTimeFontSize);
  const graphicsNarrativeFontSize = useAppStore((state) => state.graphicsNarrativeFontSize);
  const graphicsNarrativePillFontSize = useAppStore((state) => state.graphicsNarrativePillFontSize);
  const graphicsNarrativeAiGrammar = useAppStore((state) => state.graphicsNarrativeAiGrammar) ?? true;
  const countdownGlowBrightness = useAppStore((state) => state.countdownGlowBrightness);
  const countdownGlowColor = useAppStore((state) => state.countdownGlowColor);
  const timelineIncrement = useAppStore((state) => state.timelineIncrement);
  const setTimelineIncrement = useAppStore((state) => state.setTimelineIncrement);
  const enableTimeStretch = useAppStore((state) => state.enableTimeStretch);
  const setEnableTimeStretch = useAppStore((state) => state.setEnableTimeStretch);

  // Additional font & background card controls
  const cardNarrativeFontSize = useAppStore((state) => state.cardNarrativeFontSize);
  const setCardNarrativeFontSize = useAppStore((state) => state.setCardNarrativeFontSize);
  const screenFunctionIcons = useAppStore((state) => state.screenFunctionIcons);
  const setScreenFunctionIcon = useAppStore((state) => state.setScreenFunctionIcon);
  const setAllScreenFunctionIcons = useAppStore((state) => state.setAllScreenFunctionIcons);
  const dayPlannerFont = useAppStore((state) => state.dayPlannerFont);
  const setDayPlannerFont = useAppStore((state) => state.setDayPlannerFont);
  const timelineCardBgColor = useAppStore((state) => state.timelineCardBgColor);
  const setTimelineCardBgColor = useAppStore((state) => state.setTimelineCardBgColor);
  const taskCardGlassStyle = useAppStore((state) => state.taskCardGlassStyle);
  const setTaskCardGlassStyle = useAppStore((state) => state.setTaskCardGlassStyle);
  const lockedCardFontSize = useAppStore((state) => state.lockedCardFontSize);
  const setLockedCardFontSize = useAppStore((state) => state.setLockedCardFontSize);
  const textNarrativeEditWindowBg = useAppStore((state) => state.textNarrativeEditWindowBg);
  const setTextNarrativeEditWindowBg = useAppStore((state) => state.setTextNarrativeEditWindowBg);
  const textNarrativeEditWindowFontColor = useAppStore((state) => state.textNarrativeEditWindowFontColor);
  const setTextNarrativeEditWindowFontColor = useAppStore((state) => state.setTextNarrativeEditWindowFontColor);
  const graphicsNarrativeEditWindowBg = useAppStore((state) => state.graphicsNarrativeEditWindowBg);
  const setGraphicsNarrativeEditWindowBg = useAppStore((state) => state.setGraphicsNarrativeEditWindowBg);
  const graphicsNarrativeEditWindowFontColor = useAppStore((state) => state.graphicsNarrativeEditWindowFontColor);
  const setGraphicsNarrativeEditWindowFontColor = useAppStore((state) => state.setGraphicsNarrativeEditWindowFontColor);

  const setDeckCardHeaderBg = useAppStore((state) => state.setDeckCardHeaderBg);
  const setDeckCardExpandedBg = useAppStore((state) => state.setDeckCardExpandedBg);
  const setDeckCardFontColor = useAppStore((state) => state.setDeckCardFontColor);
  const setDeckCardFontSize = useAppStore((state) => state.setDeckCardFontSize);
  const setGraphicsActiveWindowBg = useAppStore((state) => state.setGraphicsActiveWindowBg);
  const setGraphicsLockedCardBg = useAppStore((state) => state.setGraphicsLockedCardBg);
  const setGraphicsLockedCardFontColor = useAppStore((state) => state.setGraphicsLockedCardFontColor);
  const setGraphicsActionBoxBg = useAppStore((state) => state.setGraphicsActionBoxBg);
  const setGraphicsActionBoxFontColor = useAppStore((state) => state.setGraphicsActionBoxFontColor);
  const setGraphicsTaskTitleFontSize = useAppStore((state) => state.setGraphicsTaskTitleFontSize);
  const setGraphicsTimeFontSize = useAppStore((state) => state.setGraphicsTimeFontSize);
  const setGraphicsNarrativeFontSize = useAppStore((state) => state.setGraphicsNarrativeFontSize);
  const setGraphicsNarrativePillFontSize = useAppStore((state) => state.setGraphicsNarrativePillFontSize);
  const setGraphicsNarrativeAiGrammar = useAppStore((state) => state.setGraphicsNarrativeAiGrammar);
  const setCountdownGlowBrightness = useAppStore((state) => state.setCountdownGlowBrightness);
  const setCountdownGlowColor = useAppStore((state) => state.setCountdownGlowColor);
  const narrativeMode = useAppStore((state) => state.narrativeMode);
  const setNarrativeMode = useAppStore((state) => state.setNarrativeMode);

  if (!isOpen) return null;

  const formattedDate = formatDate(selectedDate);

  const handleAction = (fn?: () => void) => {
    if (fn) {
      triggerHaptic("light");
      fn();
      onClose();
    }
  };

  const searchLower = (searchQuery || "").toLowerCase().trim();
  const searchWords = searchLower.split(/\s+/).filter(Boolean);
  const isSearching = searchWords.length > 0;

  const matchesSearch = (...candidates: (string | undefined | null | false)[]) => {
    if (!isSearching) return true;
    const combined = candidates
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // Direct substring match
    if (combined.includes(searchLower)) return true;

    // Check individual candidate inclusion or searchLower inclusion
    for (const c of candidates) {
      if (!c) continue;
      const cl = c.toLowerCase();
      if (cl.includes(searchLower) || searchLower.includes(cl)) return true;
    }

    // Word-by-word match: all words in search query found in combined candidate text
    if (searchWords.every((word) => combined.includes(word))) return true;

    // Partial word match for tokens of 3+ letters
    if (searchWords.some((word) => word.length >= 3 && combined.includes(word))) return true;

    return false;
  };

  const ToggleRow = ({
    icon: Icon,
    iconColor,
    title,
    subtitle,
    checked,
    onChange
  }: {
    icon: any;
    iconColor: string;
    title: string;
    subtitle?: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onChange();
        triggerHaptic("light");
      }}
      className="w-full p-2.5 rounded-xl border border-[#EADDC7] bg-[#FFF2DF] hover:bg-[#FAF3E0] flex items-center justify-between text-left transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <Icon size={13} className={checked ? iconColor : "text-[#8C7A6B] shrink-0"} />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#3D312A] truncate">{title}</div>
          {subtitle && <div className="text-[8.5px] text-[#8C7A6B] font-sans leading-tight truncate">{subtitle}</div>}
        </div>
      </div>
      <div
        className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
          checked ? "bg-[#2D6A4F]" : "bg-[#C4B4A0]"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-sm ${
            checked ? "translate-x-3" : ""
          }`}
        />
      </div>
    </button>
  );

  return createPortal(
    <div
      id="graphics-hamburger-backdrop"
      className="fixed inset-0 z-[99999] flex select-none animate-in fade-in duration-150"
      onClick={onClose}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#2D2319]/50 backdrop-blur-xs transition-opacity" />

      {/* Slide-out Drawer from Left (Identical layout to Gear Menu, retaining Graphics palette) */}
      <div
        id="graphics-mode-hamburger-drawer"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm sm:max-w-md h-full flex flex-col shadow-2xl overflow-hidden border-r border-[#EADDC7] text-left animate-in slide-in-from-left duration-200"
        style={{
          backgroundColor: "#FAF3E0", // Warm cream canvas
          color: "#3D312A",
        }}
      >
        {/* SUBMENU 1: DEV & API HUB */}
        {currentSubmenu === "dev" ? (
          <div className="p-5 flex flex-col gap-3.5 h-full overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200 bg-[#FAF3E0]">
            <div className="flex items-center gap-2 border-b border-[#EADDC7] pb-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentSubmenu("main");
                  triggerHaptic("light");
                }}
                className="p-1 hover:bg-[#EADDC7] rounded-lg text-[#3D312A] transition-colors cursor-pointer flex items-center justify-center"
                title="Go back"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]">Dev & API Hub</h4>
                <p className="text-[9px] text-[#8C7A6B] font-bold">ReactNative integration & specs.</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto rounded-xl">
              <DeveloperHub darkMode={isDark} />
            </div>
          </div>
        ) : currentSubmenu === "features" ? (
          /* SUBMENU 2: FEATURE TOGGLES */
          <div className="p-5 flex flex-col gap-3.5 h-full overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200 bg-[#FAF3E0]">
            <div className="flex items-center gap-2 border-b border-[#EADDC7] pb-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentSubmenu("main");
                  triggerHaptic("light");
                }}
                className="p-1 hover:bg-[#EADDC7] rounded-lg text-[#3D312A] transition-colors cursor-pointer flex items-center justify-center"
                title="Go back"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]">Feature Modules</h4>
                <p className="text-[9px] text-[#8C7A6B] font-bold font-sans">Turn workspace components on/off.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {/* Group 1: AI */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5 px-1">
                  <Sparkles size={11} /> AI & Smart Automation
                </div>
                <ToggleRow
                  icon={Sparkles}
                  iconColor="text-[#2D6A4F]"
                  title="AI Generated Plans"
                  subtitle="Auto-generate structured recovery plans"
                  checked={aiPlansEnabled}
                  onChange={() => {
                    const next = !aiPlansEnabled;
                    setAiPlansEnabled?.(next);
                    localStorage.setItem("ai_plans_enabled", next.toString());
                    saveSystemSettingsToCloud({ aiPlansEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Sparkles}
                  iconColor="text-[#2D6A4F]"
                  title="AI Subtasks Generator"
                  subtitle="One-click step breakdown on tasks"
                  checked={aiSubtasksEnabled}
                  onChange={() => {
                    const next = !aiSubtasksEnabled;
                    setAiSubtasksEnabled?.(next);
                    localStorage.setItem("ai_subtasks_enabled", next.toString());
                    saveSystemSettingsToCloud({ aiSubtasksEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Sparkles}
                  iconColor="text-[#8B5CF6]"
                  title="Notebook LM Connect"
                  subtitle="Contextual intelligence bridge"
                  checked={notebookLmEnabled}
                  onChange={() => {
                    const next = !notebookLmEnabled;
                    setNotebookLmEnabled?.(next);
                    localStorage.setItem("notebooklm_enabled", next.toString());
                    saveSystemSettingsToCloud({ notebookLmEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Sparkles}
                  iconColor="text-[#8B5CF6]"
                  title="AI Narrative Function"
                  subtitle="Narrative banner & audio on focus cards"
                  checked={aiNarrativeEnabled}
                  onChange={() => {
                    const next = !aiNarrativeEnabled;
                    setAiNarrativeEnabled?.(next);
                    localStorage.setItem("taskpass_ai_narrative_enabled", JSON.stringify(next));
                    saveSystemSettingsToCloud({ aiNarrativeEnabled: next });
                  }}
                />
              </div>

              {/* Group 2: Panels */}
              <div className="space-y-1.5 pt-2 border-t border-[#EADDC7]">
                <div className="text-[9px] font-black uppercase tracking-wider text-[#A25F37] flex items-center gap-1.5 px-1">
                  <Layout size={11} /> Panels & Views
                </div>
                <ToggleRow
                  icon={CheckSquare}
                  iconColor="text-[#2D6A4F]"
                  title="Tasks Panel"
                  subtitle="Main task list card view"
                  checked={tasksPanelEnabled}
                  onChange={() => {
                    const next = !tasksPanelEnabled;
                    setTasksPanelEnabled?.(next);
                    localStorage.setItem("tasks_panel_enabled", next.toString());
                    saveSystemSettingsToCloud({ tasksPanelEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Clock}
                  iconColor="text-[#2D6A4F]"
                  title="Focus Panel"
                  subtitle="Deep single-task execution zone"
                  checked={focusPanelEnabled}
                  onChange={() => {
                    const next = !focusPanelEnabled;
                    setFocusPanelEnabled?.(next);
                    localStorage.setItem("focus_panel_enabled", next.toString());
                    saveSystemSettingsToCloud({ focusPanelEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Clock}
                  iconColor="text-[#2D6A4F]"
                  title="Timeline Panel"
                  subtitle="Dynamic hourly timeline schedule"
                  checked={timelinePanelEnabled}
                  onChange={() => {
                    const next = !timelinePanelEnabled;
                    setTimelinePanelEnabled?.(next);
                    localStorage.setItem("timeline_panel_enabled", next.toString());
                    saveSystemSettingsToCloud({ timelinePanelEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={FolderClosed}
                  iconColor="text-[#A25F37]"
                  title="Notes Repository"
                  subtitle="Workspace notebook and documentation"
                  checked={notesRepoEnabled}
                  onChange={() => {
                    const next = !notesRepoEnabled;
                    setNotesRepoEnabled?.(next);
                    localStorage.setItem("notes_repo_enabled", next.toString());
                    saveSystemSettingsToCloud({ notesRepoEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Database}
                  iconColor="text-[#2D6A4F]"
                  title="Workspace Data Menu"
                  subtitle="Data warehouse & analytics access"
                  checked={workspaceDataEnabled}
                  onChange={() => {
                    const next = !workspaceDataEnabled;
                    setWorkspaceDataEnabled?.(next);
                    localStorage.setItem("workspace_data_enabled", next.toString());
                    saveSystemSettingsToCloud({ workspaceDataEnabled: next });
                  }}
                />
              </div>

              {/* Group 3: Productivity */}
              <div className="space-y-1.5 pt-2 border-t border-[#EADDC7]">
                <div className="text-[9px] font-black uppercase tracking-wider text-[#A25F37] flex items-center gap-1.5 px-1">
                  <Zap size={11} /> Productivity & Workflows
                </div>
                <ToggleRow
                  icon={Zap}
                  iconColor="text-[#A25F37]"
                  title="TaskPass Function"
                  subtitle="Handoffs & token delegation"
                  checked={taskpassEnabled}
                  onChange={() => {
                    const next = !taskpassEnabled;
                    setTaskpassEnabled?.(next);
                    localStorage.setItem("taskpass_enabled", next.toString());
                    saveSystemSettingsToCloud({ taskpassEnabled: next });
                    if (!next && setShowAdminPortal) setShowAdminPortal(false);
                  }}
                />
                <ToggleRow
                  icon={Users}
                  iconColor="text-[#2D6A4F]"
                  title="Collaborators"
                  subtitle="Team members and shared items"
                  checked={collaboratorsEnabled}
                  onChange={() => {
                    const next = !collaboratorsEnabled;
                    setCollaboratorsEnabled?.(next);
                    localStorage.setItem("collaborators_enabled", next.toString());
                    saveSystemSettingsToCloud({ collaboratorsEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={ListOrdered}
                  iconColor="text-[#8B5CF6]"
                  title="Sequences"
                  subtitle="Sequential chains and routines"
                  checked={sequencesEnabled}
                  onChange={() => {
                    const next = !sequencesEnabled;
                    setSequencesEnabled?.(next);
                    localStorage.setItem("sequences_enabled", next.toString());
                    saveSystemSettingsToCloud({ sequencesEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Layers}
                  iconColor="text-[#2D6A4F]"
                  title="Sequence Group Headers"
                  subtitle="Show header bar & controls above sequences"
                  checked={sequenceGroupHeadersEnabled}
                  onChange={() => {
                    const next = !sequenceGroupHeadersEnabled;
                    setSequenceGroupHeadersEnabled?.(next);
                    localStorage.setItem("sequence_group_headers_enabled", next.toString());
                    saveSystemSettingsToCloud({ sequenceGroupHeadersEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Plus}
                  iconColor="text-[#2D6A4F]"
                  title="Bulk Add Tasks"
                  subtitle="Quick batch task input modal"
                  checked={bulkAddTasksEnabled}
                  onChange={() => {
                    const next = !bulkAddTasksEnabled;
                    setBulkAddTasksEnabled?.(next);
                    localStorage.setItem("bulk_add_tasks_enabled", next.toString());
                    saveSystemSettingsToCloud({ bulkAddTasksEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Layers}
                  iconColor="text-[#2D6A4F]"
                  title="Bulk Ops Menu"
                  subtitle="Batch edit, complete, and move"
                  checked={bulkOpsEnabled}
                  onChange={() => {
                    const next = !bulkOpsEnabled;
                    setBulkOpsEnabled?.(next);
                    localStorage.setItem("bulk_ops_enabled", next.toString());
                    saveSystemSettingsToCloud({ bulkOpsEnabled: next });
                  }}
                />
                <ToggleRow
                  icon={Coins}
                  iconColor="text-[#2D6A4F]"
                  title="Expenses Module"
                  subtitle="Budgeting and expenditure tracking"
                  checked={expensesEnabled}
                  onChange={() => {
                    const next = !expensesEnabled;
                    setExpensesEnabled?.(next);
                    localStorage.setItem("expenses_enabled", next.toString());
                    saveSystemSettingsToCloud({ expensesEnabled: next });
                  }}
                />
              </div>
            </div>
          </div>
        ) : currentSubmenu === "screenIcons" ? (
          /* SUBMENU 3: MAIN SCREEN FUNCTION ICONS VISIBILITY */
          <div className="p-5 flex flex-col gap-3.5 h-full overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200 bg-[#FAF3E0]">
            <div className="flex items-center gap-2 border-b border-[#EADDC7] pb-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentSubmenu("main");
                  triggerHaptic("light");
                }}
                className="p-1 hover:bg-[#EADDC7] rounded-lg text-[#3D312A] transition-colors cursor-pointer flex items-center justify-center"
                title="Go back"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5">
                  <Eye size={13} /> Main Screen Function Icons
                </h4>
                <p className="text-[9px] text-[#8C7A6B] font-bold font-sans">Toggle visibility on main screen vs menu-only.</p>
              </div>
            </div>

            {/* Master Quick Actions */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAllScreenFunctionIcons({
                    expandCollapse: true,
                    aiBot: true,
                    interactionTracker: true,
                    addTask: true,
                    workspaceData: true,
                    narrativeModeToggle: true,
                    categoryFilters: true,
                    dateNavigation: true,
                  });
                  if (triggerHaptic) triggerHaptic("medium");
                }}
                className="p-2 rounded-xl border border-[#2D6A4F] bg-[#2D6A4F]/10 hover:bg-[#2D6A4F]/20 text-[#2D6A4F] font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Eye size={12} /> Show All On Screen
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllScreenFunctionIcons({
                    expandCollapse: false,
                    aiBot: false,
                    interactionTracker: false,
                    addTask: false,
                    workspaceData: false,
                    narrativeModeToggle: false,
                    categoryFilters: false,
                    dateNavigation: false,
                  });
                  if (triggerHaptic) triggerHaptic("medium");
                }}
                className="p-2 rounded-xl border border-[#A25F37] bg-[#A25F37]/10 hover:bg-[#A25F37]/20 text-[#A25F37] font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <EyeOff size={12} /> Hide All (Menu Only)
              </button>
            </div>

            <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FFF2DF] text-[8.5px] text-[#8C7A6B] leading-relaxed shrink-0">
              💡 When icons are hidden from the main screen, every single function remains fully accessible anytime directly from this hamburger menu.
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <ToggleRow
                icon={ChevronsUpDown}
                iconColor="text-[#2D6A4F]"
                title="Expand / Collapse All Cards Floating Button"
                subtitle="Floating pill button at bottom-left corner"
                checked={screenFunctionIcons.expandCollapse !== false}
                onChange={() => {
                  setScreenFunctionIcon("expandCollapse", screenFunctionIcons.expandCollapse === false);
                }}
              />
              <ToggleRow
                icon={Sparkles}
                iconColor="text-purple-600"
                title="AI Assistant (Gemini) Floating Button"
                subtitle="Floating quick assistant bubble at bottom-right"
                checked={screenFunctionIcons.aiBot !== false}
                onChange={() => {
                  setScreenFunctionIcon("aiBot", screenFunctionIcons.aiBot === false);
                }}
              />
              <ToggleRow
                icon={Activity}
                iconColor="text-[#2D6A4F]"
                title="Interaction Tracker Floating Button"
                subtitle="Call & message logger button at bottom-right"
                checked={screenFunctionIcons.interactionTracker !== false}
                onChange={() => {
                  setScreenFunctionIcon("interactionTracker", screenFunctionIcons.interactionTracker === false);
                }}
              />
              <ToggleRow
                icon={Plus}
                iconColor="text-[#A25F37]"
                title="Floating Add Task (+) Button"
                subtitle="Floating action button to quick create tasks"
                checked={screenFunctionIcons.addTask !== false}
                onChange={() => {
                  setScreenFunctionIcon("addTask", screenFunctionIcons.addTask === false);
                }}
              />
              <ToggleRow
                icon={Database}
                iconColor="text-indigo-600"
                title="Workspace Data Menu Capsule"
                subtitle="Quick access capsule for data warehouse & notes"
                checked={screenFunctionIcons.workspaceData !== false}
                onChange={() => {
                  setScreenFunctionIcon("workspaceData", screenFunctionIcons.workspaceData === false);
                }}
              />
              <ToggleRow
                icon={Sparkles}
                iconColor="text-[#2D6A4F]"
                title="Narrative Mode Quick Switcher"
                subtitle="Banner toggle to switch between Narrative & standard cards"
                checked={screenFunctionIcons.narrativeModeToggle !== false}
                onChange={() => {
                  setScreenFunctionIcon("narrativeModeToggle", screenFunctionIcons.narrativeModeToggle === false);
                }}
              />
              <ToggleRow
                icon={Filter}
                iconColor="text-[#A25F37]"
                title="Top Category Filter Bar"
                subtitle="Category filter pills (All, Work, Personal, etc.)"
                checked={screenFunctionIcons.categoryFilters !== false}
                onChange={() => {
                  setScreenFunctionIcon("categoryFilters", screenFunctionIcons.categoryFilters === false);
                }}
              />
              <ToggleRow
                icon={Calendar}
                iconColor="text-[#2D6A4F]"
                title="Date Navigation & Arrows"
                subtitle="Previous, next, today arrows & date picker on main screen"
                checked={screenFunctionIcons.dateNavigation !== false}
                onChange={() => {
                  setScreenFunctionIcon("dateNavigation", screenFunctionIcons.dateNavigation === false);
                }}
              />
            </div>
          </div>
        ) : (
          /* ========================================================
             MAIN WORKSPACE MENU: 6 UNIFIED, ORGANIZED GROUPS
             ======================================================== */
          <>
            {/* 1. TOP HEADER */}
            <div className="p-4 border-b border-[#EADDC7] flex items-center justify-between bg-[#FFF2DF] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center font-black text-sm shadow-sm">
                  ☰
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#3D312A] leading-tight font-sans">
                    Workspace Menu
                  </h2>
                  <p className="text-[9.5px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Graphics Mode Controls
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#2D6A4F] border border-emerald-500/20">
                  {currentUser ? "Cloud Synced" : "Local Mode"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="w-7.5 h-7.5 rounded-full bg-[#EADDC7]/60 hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Close menu"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="p-3 border-b border-[#EADDC7] bg-[#FAF3E0] shrink-0">
              <div className="relative flex items-center bg-[#FFF2DF] border border-[#EADDC7] rounded-xl px-3 py-1.5 shadow-inner focus-within:border-[#2D6A4F]">
                <Search size={13} className="text-[#A25F37] mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search actions, controls, settings (font, card, color...)"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none text-[#3D312A] placeholder-[#8C7A6B] font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange("");
                      triggerHaptic("light");
                    }}
                    className="p-0.5 text-[#8C7A6B] hover:text-[#3D312A] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {searchQuery.trim() !== "" && (
                <div className="mt-2 p-2 rounded-xl border border-[#2D6A4F]/30 bg-[#2D6A4F]/10 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[9px] font-bold text-[#2D6A4F]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={11} className="text-[#2D6A4F] animate-pulse" />
                      Searching for: <span className="font-mono font-black underline">"{searchQuery.trim()}"</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="text-[8px] uppercase tracking-wider text-[#A25F37] hover:underline cursor-pointer font-black"
                    >
                      Clear Search
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[8px] font-bold">
                    <span className="text-[#8C7A6B]">Quick Jump:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("display");
                        triggerHaptic?.("light");
                      }}
                      className="px-2 py-0.5 rounded-full bg-[#2D6A4F] text-white hover:bg-[#1B4332] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Palette size={9} />
                      <span>Section 6: Display & Styling (Font, Card Colors, Screen Icons)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. CATEGORY FILTER PILLS */}
            <div className="px-3 py-2 border-b border-[#EADDC7] bg-[#FFF2DF] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: "all", label: "All" },
                { id: "views", label: "Views & Sched" },
                { id: "actions", label: "Actions & AI" },
                { id: "bulk", label: "Bulk & Sync" },
                { id: "data", label: "Data & Vaults" },
                { id: "display", label: "Display & Style" },
                { id: "system", label: "System & Cloud" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(tab.id);
                    triggerHaptic("light");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    activeSection === tab.id
                      ? "bg-[#2D6A4F] text-white shadow-xs"
                      : "text-[#8C7A6B] hover:text-[#3D312A] hover:bg-[#EADDC7]/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* COLLAPSE / EXPAND ALL TOOLBAR */}
            <div className="px-4 py-2 border-b border-[#EADDC7] flex items-center justify-between text-[9px] font-bold bg-[#FAF3E0] text-[#7A6B5C]">
              <span className="uppercase tracking-wider font-black flex items-center gap-1.5">
                <span>7 Menu Sections</span>
                <span className="text-[8px] font-mono font-bold opacity-75">
                  ({Object.values(collapsedSections).filter(Boolean).length} collapsed)
                </span>
              </span>
              <button
                type="button"
                id="hamburger-menu-collapse-all-toggle-btn"
                onClick={toggleCollapseAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[8.5px] transition-all cursor-pointer shadow-2xs active:scale-95 bg-[#FFF2DF] hover:bg-white text-[#1F1A16] border border-[#EADDC7]"
                title={areAllCollapsed ? "Expand all 7 sections" : "Collapse all 7 sections"}
              >
                <ChevronsUpDown size={11} className="text-[#2D6A4F]" />
                <span>{areAllCollapsed ? "Expand All" : "Collapse All"}</span>
              </button>
            </div>

            {/* 4. SCROLLABLE UNIFIED CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 space-y-3.5">
              {/* SECTION 1: VIEWS & DAILY SCHEDULE */}
              {(isSearching || activeSection === "all" || activeSection === "views") && matchesSearch("views", "schedule", "focus", "deck", "timeline", "date", "calendar", "day", "start time") && (
                <div className={`rounded-2xl p-3 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs transition-all ${isSectionCollapsed(1) ? "space-y-0" : "space-y-2.5"}`}>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(1)}
                    className="w-full flex items-center justify-between cursor-pointer select-none text-left py-0.5 group focus:outline-hidden"
                    title={isSectionCollapsed(1) ? "Expand Section 1" : "Collapse Section 1"}
                    aria-expanded={!isSectionCollapsed(1)}
                  >
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#2D6A4F] flex items-center gap-1.5 group-hover:text-[#1B4332] transition-colors">
                      <Layout size={12} /> 1. Views & Daily Schedule
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8.5px] font-mono text-[#A25F37] font-bold uppercase">
                        Current: {currentView}
                      </span>
                      <div className="p-1 rounded-md hover:bg-black/5 text-[#8C7A6B] group-hover:text-[#3D312A] transition-colors">
                        {isSectionCollapsed(1) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                      </div>
                    </div>
                  </button>

                  {!isSectionCollapsed(1) && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {/* View Mode Grid */}
                  {onSelectView && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAction(() => onSelectView("focus"))}
                        className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                          currentView === "focus"
                            ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                            : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                        }`}
                      >
                        <Activity size={13} className={currentView === "focus" ? "text-emerald-200" : "text-[#2D6A4F]"} />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider leading-none">Focus Card</div>
                          <div className="text-[8px] opacity-70 mt-0.5">Deep execution</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(() => onSelectView("deck"))}
                        className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                          currentView === "deck"
                            ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                            : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                        }`}
                      >
                        <Layers size={13} className={currentView === "deck" ? "text-emerald-200" : "text-[#A25F37]"} />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider leading-none">Tasks Deck</div>
                          <div className="text-[8px] opacity-70 mt-0.5">High-density cards</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(() => onSelectView("timeline"))}
                        className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                          currentView === "timeline"
                            ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                            : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                        }`}
                      >
                        <Clock size={13} className={currentView === "timeline" ? "text-emerald-200" : "text-[#2563EB]"} />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider leading-none">Timeline</div>
                          <div className="text-[8px] opacity-70 mt-0.5">Hour rulers</div>
                        </div>
                      </button>

                      {taskpassEnabled && (
                        <button
                          type="button"
                          onClick={() => handleAction(() => onSelectView("passed"))}
                          className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                            currentView === "passed"
                              ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                              : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                          }`}
                        >
                          <ShoppingBag size={13} className={currentView === "passed" ? "text-emerald-200" : "text-[#D97706]"} />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider leading-none">TaskPass</div>
                            <div className="text-[8px] opacity-70 mt-0.5">Favors & rewards</div>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Date Navigator */}
                  <div className="flex items-center justify-between p-1.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0]">
                    <button
                      type="button"
                      onClick={() => {
                        onPrevDay();
                        triggerHaptic("light");
                      }}
                      className="p-1 rounded-lg hover:bg-[#EADDC7] text-[#3D312A] transition-all cursor-pointer"
                      title="Previous Day"
                    >
                      <ChevronLeft size={15} />
                    </button>

                    <div className="relative flex items-center justify-center gap-1.5 flex-1 px-2 text-center cursor-pointer group">
                      <Calendar size={12} className="text-[#A25F37] shrink-0" />
                      <span className="text-[11px] font-black font-sans truncate text-[#3D312A]">
                        {formattedDate}
                      </span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            onSelectDate(e.target.value);
                            triggerHaptic("light");
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onNextDay();
                        triggerHaptic("light");
                      }}
                      className="p-1 rounded-lg hover:bg-[#EADDC7] text-[#3D312A] transition-all cursor-pointer"
                      title="Next Day"
                    >
                      <ChevronRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onToday();
                        triggerHaptic("light");
                      }}
                      className="ml-1 px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider bg-[#2D6A4F] hover:bg-[#1B4332] text-white cursor-pointer"
                    >
                      Today
                    </button>
                  </div>

                  {/* Daily Start Time */}
                  <div className="relative flex items-center justify-between px-3 py-1.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-[#A25F37]" />
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B]">
                        Daily Start Time:
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-black text-[#3D312A]">
                      {activeDayStartHour}
                    </span>
                    <input
                      type="time"
                      value={activeDayStartHour}
                      onChange={(e) => {
                        if (e.target.value) {
                          onStartHourChange(e.target.value);
                          triggerHaptic("light");
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  {/* Dedicated Narrative Mode Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] transition-all">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${narrativeMode ? "bg-purple-600 text-white" : "bg-purple-500/10 text-purple-600"}`}>
                        <Sparkles size={13} className={narrativeMode ? "animate-pulse" : ""} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#3D312A] flex items-center gap-1.5">
                          <span>Narrative Mode</span>
                          {narrativeMode && (
                            <span className="text-[8px] px-1.5 py-0.2 bg-purple-600 text-white rounded-full font-bold">ACTIVE</span>
                          )}
                        </div>
                        <div className="text-[8px] text-[#8C7A6B]">
                          Title parser & AI narrative pill buttons
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !narrativeMode;
                        setNarrativeMode(next);
                        triggerHaptic("medium");
                      }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                        narrativeMode ? "bg-purple-600" : "bg-stone-300"
                      }`}
                      title={narrativeMode ? "Turn OFF Narrative Mode" : "Turn ON Narrative Mode"}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        narrativeMode ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: CREATE & QUICK ACTIONS */}
              {(isSearching || activeSection === "all" || activeSection === "actions") && matchesSearch("create", "add", "new task", "routine", "brainstorm", "note", "quick note") && (
                <div className={`rounded-2xl p-3 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs transition-all ${isSectionCollapsed(2) ? "space-y-0" : "space-y-2"}`}>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(2)}
                    className="w-full flex items-center justify-between cursor-pointer select-none text-left py-0.5 group focus:outline-hidden"
                    title={isSectionCollapsed(2) ? "Expand Section 2" : "Collapse Section 2"}
                    aria-expanded={!isSectionCollapsed(2)}
                  >
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#2D6A4F] flex items-center gap-1.5 px-0.5 group-hover:text-[#1B4332] transition-colors">
                      <Plus size={12} /> 2. Create & Quick Actions
                    </span>
                    <div className="p-1 rounded-md hover:bg-black/5 text-[#8C7A6B] group-hover:text-[#3D312A] transition-colors">
                      {isSectionCollapsed(2) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </div>
                  </button>

                  {!isSectionCollapsed(2) && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAction(onAddTask)}
                      className="p-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white flex flex-col items-start gap-1 shadow-xs transition-all cursor-pointer text-left active:scale-98"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                        <Plus size={14} strokeWidth={3} className="text-white" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider">Add Task</div>
                        <div className="text-[8px] text-emerald-100/80">New schedule item</div>
                      </div>
                    </button>

                    {onDeployRoutine && (
                      <button
                        type="button"
                        onClick={() => handleAction(onDeployRoutine)}
                        className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex flex-col items-start gap-1 transition-all cursor-pointer text-left active:scale-98"
                      >
                        <div className="w-6 h-6 rounded-lg bg-[#A25F37]/15 text-[#A25F37] flex items-center justify-center">
                          <Coffee size={13} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider">Deploy Routine</div>
                          <div className="text-[8px] opacity-70">Preset sequences</div>
                        </div>
                      </button>
                    )}

                    {onSequenceBrainstorm && (
                      <button
                        type="button"
                        onClick={() => handleAction(onSequenceBrainstorm)}
                        className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex flex-col items-start gap-1 transition-all cursor-pointer text-left active:scale-98"
                      >
                        <div className="w-6 h-6 rounded-lg bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center">
                          <CheckSquare size={13} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider">Brainstorm</div>
                          <div className="text-[8px] opacity-70">Multi-item entry</div>
                        </div>
                      </button>
                    )}

                    {onQuickNote && (
                      <button
                        type="button"
                        onClick={() => handleAction(onQuickNote)}
                        className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex flex-col items-start gap-1 transition-all cursor-pointer text-left active:scale-98"
                      >
                        <div className="w-6 h-6 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                          <FilePlus size={13} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider">Quick Note+</div>
                          <div className="text-[8px] opacity-70">Capture thought</div>
                        </div>
                      </button>
                    )}
                  </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: AI & SMART INTELLIGENCE */}
              {(isSearching || activeSection === "all" || activeSection === "actions") && matchesSearch("ai", "gemini", "notebook", "plans", "intelligence", "subtasks", "assistant") && (
                <div className={`rounded-2xl p-3 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs transition-all ${isSectionCollapsed(3) ? "space-y-0" : "space-y-2"}`}>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(3)}
                    className="w-full flex items-center justify-between cursor-pointer select-none text-left py-0.5 group focus:outline-hidden"
                    title={isSectionCollapsed(3) ? "Expand Section 3" : "Collapse Section 3"}
                    aria-expanded={!isSectionCollapsed(3)}
                  >
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#7C3AED] flex items-center gap-1.5 px-0.5 group-hover:text-[#5B21B6] transition-colors">
                      <Sparkles size={12} /> 3. AI & Smart Intelligence
                    </span>
                    <div className="p-1 rounded-md hover:bg-black/5 text-[#8C7A6B] group-hover:text-[#3D312A] transition-colors">
                      {isSectionCollapsed(3) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </div>
                  </button>

                  {!isSectionCollapsed(3) && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  
                  {/* Gemini Assistant Banner */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenChatbot)}
                    className="w-full p-2.5 rounded-xl bg-gradient-to-r from-[#5B21B6] to-[#7C3AED] text-white flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <Sparkles size={14} className="text-amber-300 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <div className="text-[10.5px] font-black uppercase tracking-wider">Gemini A.I. Assistant</div>
                        <div className="text-[8px] text-purple-200">Interactive planner & deep helper</div>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-white/20 text-white">
                      AI
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    {onOpenNotebookLm && (
                      <button
                        type="button"
                        onClick={() => handleAction(onOpenNotebookLm)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <BookOpen size={13} className="text-[#8B5CF6] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[9.5px] font-black uppercase tracking-wider truncate">NotebookLM</div>
                          <div className="text-[7.5px] opacity-70 truncate">Knowledge Hub</div>
                        </div>
                      </button>
                    )}

                    {onOpenAiPlans && (
                      <button
                        type="button"
                        onClick={() => handleAction(onOpenAiPlans)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <Brain size={13} className="text-[#10B981] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[9.5px] font-black uppercase tracking-wider truncate">AI Science Plans</div>
                          <div className="text-[7.5px] opacity-70 truncate">Plans Vault</div>
                        </div>
                      </button>
                    )}
                  </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: BULK OPERATIONS & CALENDAR SYNC */}
              {(isSearching || activeSection === "all" || activeSection === "bulk") && matchesSearch("bulk", "calendar", "sync", "gcal", "unlock", "flags", "prioritize", "rules", "saved", "tomorrow", "done") && (
                <div className={`rounded-2xl p-3 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs transition-all ${isSectionCollapsed(4) ? "space-y-0" : "space-y-2"}`}>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(4)}
                    className="w-full flex items-center justify-between cursor-pointer select-none text-left py-0.5 group focus:outline-hidden"
                    title={isSectionCollapsed(4) ? "Expand Section 4" : "Collapse Section 4"}
                    aria-expanded={!isSectionCollapsed(4)}
                  >
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#A25F37] flex items-center gap-1.5 px-0.5 group-hover:text-[#7A4020] transition-colors">
                      <Layers size={12} /> 4. Bulk Operations & Calendar Sync
                    </span>
                    <div className="p-1 rounded-md hover:bg-black/5 text-[#8C7A6B] group-hover:text-[#3D312A] transition-colors">
                      {isSectionCollapsed(4) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </div>
                  </button>

                  {!isSectionCollapsed(4) && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">

                  <div className="grid grid-cols-2 gap-1.5">
                    {onOpenBulkPrioritize && (
                      <button
                        type="button"
                        onClick={() => handleAction(onOpenBulkPrioritize)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <Sparkles size={12} className="text-[#A25F37] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">Prioritize Pool</span>
                      </button>
                    )}

                    {onAdHocSequence && (
                      <button
                        type="button"
                        onClick={() => handleAction(onAdHocSequence)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <ListOrdered size={12} className="text-[#2D6A4F] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">Ad Hoc Sequence</span>
                      </button>
                    )}

                    {onUnlockAll && (
                      <button
                        type="button"
                        onClick={() => handleAction(onUnlockAll)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <Unlock size={12} className="text-[#D97706] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">Unlock All</span>
                      </button>
                    )}

                    {onClearFlags && (
                      <button
                        type="button"
                        onClick={() => handleAction(onClearFlags)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <Flag size={12} className="text-[#EF4444] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">Clear Flags</span>
                      </button>
                    )}

                    {onReprocessRules && (
                      <button
                        type="button"
                        onClick={() => handleAction(onReprocessRules)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <RefreshCw size={12} className="text-[#3B82F6] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">Reprocess Rules</span>
                      </button>
                    )}

                    {onBulkToSaved && (
                      <button
                        type="button"
                        onClick={() => handleAction(onBulkToSaved)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <FolderClosed size={12} className="text-[#8B5CF6] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">Move to Saved</span>
                      </button>
                    )}

                    {onBulkToTomorrow && (
                      <button
                        type="button"
                        onClick={() => handleAction(onBulkToTomorrow)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <ArrowRight size={12} className="text-[#F59E0B] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">To Tomorrow</span>
                      </button>
                    )}

                    {onBulkToDone && (
                      <button
                        type="button"
                        onClick={() => handleAction(onBulkToDone)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                      >
                        <CheckCircle2 size={12} className="text-[#10B981] shrink-0" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider truncate">All to Done</span>
                      </button>
                    )}
                  </div>

                  {/* Google Calendar Sync Panel */}
                  <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] mt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="flex items-center gap-1.5 opacity-80 text-[#3D312A]">
                        <Calendar size={11} className="text-[#2563EB]" /> Google Calendar 2-Way Sync:
                      </span>
                      <span className={isGcalSyncActive ? "text-[#2D6A4F] font-bold" : "opacity-60"}>
                        {isGcalSyncActive ? "Active" : "Off"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onGcalSync && (
                        <button
                          type="button"
                          onClick={() => handleAction(onGcalSync)}
                          className="flex-1 py-1.5 px-2 rounded-lg text-[8.5px] font-black uppercase tracking-wider border border-[#EADDC7] bg-[#FFF2DF] hover:bg-white text-[#3D312A] transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <RefreshCw size={9} className={isGcalSyncActive ? "animate-spin" : ""} />
                          <span>{isGcalSyncActive ? "Pause" : "2-Way Sync"}</span>
                        </button>
                      )}

                      {onPullGcal && (
                        <button
                          type="button"
                          onClick={() => {
                            onPullGcal();
                            triggerHaptic("light");
                          }}
                          disabled={isGcalLoading}
                          className="px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase bg-[#2D6A4F]/15 border border-[#2D6A4F]/30 text-[#2D6A4F] hover:bg-[#2D6A4F]/25 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isGcalLoading ? "Pulling..." : "Pull"}
                        </button>
                      )}

                      {onPushAllTasksToGcal && (
                        <button
                          type="button"
                          onClick={() => {
                            onPushAllTasksToGcal();
                            triggerHaptic("light");
                          }}
                          disabled={isGcalLoading}
                          className="px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase bg-[#2D6A4F]/15 border border-[#2D6A4F]/30 text-[#2D6A4F] hover:bg-[#2D6A4F]/25 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isGcalLoading ? "Pushing..." : "Push"}
                        </button>
                      )}
                    </div>
                  </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 5: WORKSPACE DATA & REPOSITORIES */}
              {(isSearching || activeSection === "all" || activeSection === "data") && matchesSearch("data", "notes", "directory", "contacts", "expenses", "collaborators", "warehouse", "vault") && (
                <div className={`rounded-2xl p-3 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs transition-all ${isSectionCollapsed(5) ? "space-y-0" : "space-y-2"}`}>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(5)}
                    className="w-full flex items-center justify-between cursor-pointer select-none text-left py-0.5 group focus:outline-hidden"
                    title={isSectionCollapsed(5) ? "Expand Section 5" : "Collapse Section 5"}
                    aria-expanded={!isSectionCollapsed(5)}
                  >
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#2D6A4F] flex items-center gap-1.5 px-0.5 group-hover:text-[#1B4332] transition-colors">
                      <Database size={12} /> 5. Workspace Data & Vaults
                    </span>
                    <div className="p-1 rounded-md hover:bg-black/5 text-[#8C7A6B] group-hover:text-[#3D312A] transition-colors">
                      {isSectionCollapsed(5) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </div>
                  </button>

                  {!isSectionCollapsed(5) && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">

                  <div className="grid grid-cols-2 gap-1.5">
                    {onOpenNotesRepo && (
                      <button
                        type="button"
                        onClick={() => handleAction(onOpenNotesRepo)}
                        className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-[#6366F1]" />
                          <span className="text-[9.5px] font-black uppercase tracking-wider">Notes Repo</span>
                        </div>
                        <span className="text-[8.5px] font-mono font-bold opacity-70">({notesCount})</span>
                      </button>
                    )}

                    {onOpenDataWarehouse && (
                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenDataWarehouse())}
                        className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Database size={13} className="text-[#10B981]" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">Data Warehouse</span>
                      </button>
                    )}

                    {onOpenDataWarehouse && (
                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenDataWarehouse("directory"))}
                        className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Users size={13} className="text-[#4F46E5]" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">Directory</span>
                      </button>
                    )}

                    {onOpenDataWarehouse && (
                      <button
                        type="button"
                        onClick={() => handleAction(() => onOpenDataWarehouse("spending"))}
                        className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Coins size={13} className="text-[#059669]" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">Expenses</span>
                      </button>
                    )}

                    {onOpenManageCollaborators && (
                      <button
                        type="button"
                        onClick={() => handleAction(onOpenManageCollaborators)}
                        className="col-span-2 p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Users size={13} className="text-[#A25F37]" />
                          <span className="text-[9.5px] font-black uppercase tracking-wider">Collaborators Database</span>
                        </div>
                        <span className="text-[8px] font-bold text-[#2D6A4F] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#C8E6C9]">
                          Manage
                        </span>
                      </button>
                    )}
                  </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: DISPLAY & INTERFACE STYLING */}
              {(isSearching || activeSection === "all" || activeSection === "display") && matchesSearch(
                "display", "style", "styling", "theme", "mode", "color", "density", "snap", "glow",
                "font", "fonts", "typography", "type", "font adjustment", "font size", "text size", "overall text scale",
                "card title font", "day planner font", "script", "handwriting", "sans",
                "ai narrative", "narrative", "card narrative", "ai narrative font size",
                "focus window", "focus window font", "pt", "px",
                "card text color", "card font color", "font color",
                "background card", "card background", "color adjustment", "colors", "swatches", "picker", "hex",
                "card header", "expanded card", "timeline card bg", "locked card",
                "glass", "glass style", "translucent", "frosted", "crystal",
                "fluorescent", "countdown glow", "brightness", "neon",
                "function icons", "screen icons", "main screen icons", "icons", "button", "buttons",
                "floating buttons", "hide icons", "show icons", "toolbar", "toggles"
              ) && (
                <div className={`rounded-2xl p-3 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs transition-all ${isSectionCollapsed(6) ? "space-y-0" : "space-y-3"}`}>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(6)}
                    className="w-full flex items-center justify-between cursor-pointer select-none text-left py-0.5 group focus:outline-hidden"
                    title={isSectionCollapsed(6) ? "Expand Section 6" : "Collapse Section 6"}
                    aria-expanded={!isSectionCollapsed(6)}
                  >
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#2D6A4F] flex items-center gap-1.5 px-0.5 group-hover:text-[#1B4332] transition-colors">
                      <Palette size={12} /> 6. Display & Interface Styling
                    </span>
                    <div className="p-1 rounded-md hover:bg-black/5 text-[#8C7A6B] group-hover:text-[#3D312A] transition-colors">
                      {isSectionCollapsed(6) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </div>
                  </button>

                  {!isSectionCollapsed(6) && (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-200">

                  {/* 1. SUBMENU LAUNCHER: MAIN SCREEN FUNCTION ICONS */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSubmenu("screenIcons");
                        triggerHaptic?.("medium");
                      }}
                      className="w-full p-2.5 rounded-xl border border-[#2D6A4F]/40 bg-[#2D6A4F]/10 hover:bg-[#2D6A4F]/20 text-[#3D312A] flex items-center justify-between transition-all cursor-pointer shadow-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Eye size={13} />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="text-[10px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5 truncate">
                            <span>Main Screen Function Icons</span>
                            <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-[#2D6A4F] text-white font-mono">
                              {Object.values(screenFunctionIcons || {}).filter(Boolean).length}/8 Visible
                            </span>
                          </div>
                          <div className="text-[8.5px] text-[#8C7A6B] truncate">
                            Toggle floating buttons & toolbars visible on main screen vs menu-only
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-[#2D6A4F] group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>

                    {/* Quick Inline Expand Toggle */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowInlineScreenIcons(!showInlineScreenIcons)}
                        className="text-[8px] font-bold uppercase tracking-wider text-[#2D6A4F] hover:underline flex items-center gap-1 cursor-pointer px-1 py-0.5"
                      >
                        <span>{showInlineScreenIcons ? "Hide Quick Toggles" : "Quick Toggle Icons Here"}</span>
                        {showInlineScreenIcons ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>

                    {showInlineScreenIcons && (
                      <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[8.5px] font-bold">
                          <span className="text-[#3D312A]">Quick Toggle On/Off Screen:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAllScreenFunctionIcons({
                                  expandCollapse: true,
                                  aiBot: true,
                                  interactionTracker: true,
                                  addTask: true,
                                  workspaceData: true,
                                  narrativeModeToggle: true,
                                  categoryFilters: true,
                                  dateNavigation: true,
                                });
                                triggerHaptic?.("light");
                              }}
                              className="text-[7.5px] font-bold uppercase text-[#2D6A4F] hover:underline"
                            >
                              All On
                            </button>
                            <span className="text-[#8C7A6B]">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAllScreenFunctionIcons({
                                  expandCollapse: false,
                                  aiBot: false,
                                  interactionTracker: false,
                                  addTask: false,
                                  workspaceData: false,
                                  narrativeModeToggle: false,
                                  categoryFilters: false,
                                  dateNavigation: false,
                                });
                                triggerHaptic?.("light");
                              }}
                              className="text-[7.5px] font-bold uppercase text-[#A25F37] hover:underline"
                            >
                              All Off
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <ToggleRow
                            icon={ChevronsUpDown}
                            iconColor="text-[#2D6A4F]"
                            title="Expand / Collapse Floating Button"
                            subtitle="Bottom-left floating action pill"
                            checked={screenFunctionIcons.expandCollapse !== false}
                            onChange={() => setScreenFunctionIcon("expandCollapse", screenFunctionIcons.expandCollapse === false)}
                          />
                          <ToggleRow
                            icon={Sparkles}
                            iconColor="text-purple-600"
                            title="AI Bot Floating Button"
                            subtitle="Gemini AI floating bubble"
                            checked={screenFunctionIcons.aiBot !== false}
                            onChange={() => setScreenFunctionIcon("aiBot", screenFunctionIcons.aiBot === false)}
                          />
                          <ToggleRow
                            icon={Activity}
                            iconColor="text-[#2D6A4F]"
                            title="Interaction Tracker Button"
                            subtitle="Call & message logger bubble"
                            checked={screenFunctionIcons.interactionTracker !== false}
                            onChange={() => setScreenFunctionIcon("interactionTracker", screenFunctionIcons.interactionTracker === false)}
                          />
                          <ToggleRow
                            icon={Plus}
                            iconColor="text-[#A25F37]"
                            title="Floating Add Task (+) Button"
                            subtitle="Quick add task floating button"
                            checked={screenFunctionIcons.addTask !== false}
                            onChange={() => setScreenFunctionIcon("addTask", screenFunctionIcons.addTask === false)}
                          />
                          <ToggleRow
                            icon={Database}
                            iconColor="text-indigo-600"
                            title="Data Warehouse Capsule"
                            subtitle="Bottom quick data warehouse button"
                            checked={screenFunctionIcons.workspaceData !== false}
                            onChange={() => setScreenFunctionIcon("workspaceData", screenFunctionIcons.workspaceData === false)}
                          />
                          <ToggleRow
                            icon={Sparkles}
                            iconColor="text-[#2D6A4F]"
                            title="Narrative Mode Switcher"
                            subtitle="Top banner narrative mode toggle"
                            checked={screenFunctionIcons.narrativeModeToggle !== false}
                            onChange={() => setScreenFunctionIcon("narrativeModeToggle", screenFunctionIcons.narrativeModeToggle === false)}
                          />
                          <ToggleRow
                            icon={Filter}
                            iconColor="text-[#A25F37]"
                            title="Category Filter Bar"
                            subtitle="Schedule category filter pills"
                            checked={screenFunctionIcons.categoryFilters !== false}
                            onChange={() => setScreenFunctionIcon("categoryFilters", screenFunctionIcons.categoryFilters === false)}
                          />
                          <ToggleRow
                            icon={Calendar}
                            iconColor="text-[#2D6A4F]"
                            title="Date Navigation Controls"
                            subtitle="Prev/Next arrows & date triggers"
                            checked={screenFunctionIcons.dateNavigation !== false}
                            onChange={() => setScreenFunctionIcon("dateNavigation", screenFunctionIcons.dateNavigation === false)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* UI Mode (Text vs Graphics) & Theme Switcher */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1 opacity-70">
                          <Palette size={11} /> Style:
                        </span>
                        <span className="text-[#2D6A4F] uppercase font-black">{uiMode}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-black/5 p-0.5 rounded-lg border border-[#EADDC7]">
                        <button
                          type="button"
                          onClick={() => {
                            onSetUiMode("Graphics");
                            triggerHaptic?.("light");
                          }}
                          className={`py-1 text-[8px] font-black uppercase rounded ${
                            uiMode === "Graphics" ? "bg-[#2D6A4F] text-white shadow-xs" : "opacity-60"
                          }`}
                        >
                          Graphics
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSetUiMode("Text");
                            triggerHaptic?.("medium");
                            onClose();
                          }}
                          className={`py-1 text-[8px] font-black uppercase rounded ${
                            uiMode === "Text" ? "bg-[#2D6A4F] text-white shadow-xs" : "opacity-60"
                          }`}
                        >
                          Text
                        </button>
                      </div>
                    </div>

                    {/* Theme Mode Toggle */}
                    {onToggleTheme && (
                      <div className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <span className="flex items-center gap-1 opacity-70">Theme:</span>
                          <span className="text-[#A25F37] uppercase font-black">{isDark ? "Dark" : "Light"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onToggleTheme();
                            triggerHaptic?.("light");
                          }}
                          className="w-full py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg bg-[#FFF2DF] border border-[#EADDC7] text-[#3D312A] flex items-center justify-center gap-1 hover:bg-[#FAF3E0] cursor-pointer"
                        >
                          {isDark ? <Sun size={11} className="text-amber-500" /> : <Moon size={11} className="text-indigo-600" />}
                          <span>Toggle {isDark ? "Light" : "Dark"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ========================================================
                      SUB-SECTION A: FONT & TYPOGRAPHY ADJUSTMENTS
                      ======================================================== */}
                  <div className="pt-2 border-t border-[#EADDC7] space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5">
                        <Type size={12} /> Font & Typography Adjustments
                      </span>
                      <span className="text-[8px] font-bold text-[#8C7A6B] uppercase font-mono">Size & Styling</span>
                    </div>

                    {/* Text Size Scale */}
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-1">
                        <div className="font-bold opacity-70 text-[#3D312A]">Overall Text Scale:</div>
                        <div className="grid grid-cols-3 gap-0.5 bg-[#FFF2DF] p-0.5 rounded-lg border border-[#EADDC7]">
                          {(["normal", "readable", "large"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setFontSizeScale?.(option);
                                localStorage.setItem("font_size_scale", option);
                                triggerHaptic?.("light");
                              }}
                              className={`py-0.5 text-[7.5px] font-black uppercase rounded ${
                                fontSizeScale === option ? "bg-[#2D6A4F] text-white shadow-xs" : "opacity-60 text-[#3D312A]"
                              }`}
                            >
                              {option === "normal" ? "100%" : option === "readable" ? "+10%" : "+20%"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Day Planner Font Style */}
                      <div className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-1">
                        <div className="flex items-center justify-between font-bold opacity-70 text-[#3D312A]">
                          <span>Font Style:</span>
                          <span className="text-[#2D6A4F] font-black uppercase text-[8px]">{dayPlannerFont || "Standard"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-0.5 bg-[#FFF2DF] p-0.5 rounded-lg border border-[#EADDC7]">
                          {(["Standard", "Handwriting"] as const).map((font) => (
                            <button
                              key={font}
                              type="button"
                              onClick={() => {
                                setDayPlannerFont(font);
                                localStorage.setItem("day_planner_font", font);
                                triggerHaptic?.("medium");
                              }}
                              className={`py-0.5 text-[7.5px] font-black uppercase rounded ${
                                (dayPlannerFont || "Standard") === font ? "bg-[#2D6A4F] text-white shadow-xs" : "opacity-60 text-[#3D312A]"
                              }`}
                            >
                              {font === "Standard" ? "Sans" : "Script"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI Narrative Font Size on Cards */}
                    <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#3D312A]">
                          <Sparkles size={12} className="text-purple-600 animate-pulse" />
                          <span className="font-black text-purple-900 uppercase">AI Narrative Font Size (Cards):</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-700 text-white font-mono font-black text-[9px]">
                          {cardNarrativeFontSize || 12}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-[#8C7A6B]">9px</span>
                        <input
                          type="range"
                          min={9}
                          max={28}
                          step={1}
                          value={cardNarrativeFontSize || 12}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCardNarrativeFontSize(val);
                            triggerHaptic?.("light");
                          }}
                          className="flex-1 accent-purple-600 h-1.5 bg-[#EADDC7] rounded-lg cursor-pointer"
                        />
                        <span className="text-[8px] font-bold text-[#8C7A6B]">28px</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {[
                          { label: "10px", val: 10 },
                          { label: "12px", val: 12 },
                          { label: "14px", val: 14 },
                          { label: "16px", val: 16 },
                          { label: "18px", val: 18 },
                          { label: "20px", val: 20 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => {
                              setCardNarrativeFontSize(preset.val);
                              triggerHaptic?.("light");
                            }}
                            className={`py-1 text-[8px] font-mono font-bold rounded transition-all cursor-pointer ${
                              (cardNarrativeFontSize || 12) === preset.val
                                ? "bg-purple-700 text-white font-black shadow-xs ring-1 ring-purple-400"
                                : "bg-[#FFF2DF] border border-[#EADDC7] text-[#3D312A] hover:bg-white"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Live Card Narrative Preview Box */}
                      <div className="p-2 rounded-lg bg-[#FAF3E0] border border-purple-500/20 text-slate-800 italic leading-snug">
                        <div className="text-[7.5px] font-bold uppercase tracking-wider text-purple-700 not-italic mb-0.5">Live Card Preview:</div>
                        <div style={{ fontSize: `${cardNarrativeFontSize || 12}px` }} className="font-medium text-[#1F1A16] truncate">
                          "From <span className="underline decoration-emerald-600 font-bold not-italic">09:00 AM</span> you will <span className="underline decoration-emerald-600 font-bold not-italic">Team Standup</span> at <span className="underline decoration-[#DE771B] font-bold not-italic">Room 4B</span>..."
                        </div>
                      </div>

                      <p className="text-[7.5px] text-[#8C7A6B] leading-tight">
                        Adjusts narrative text size for the AI narrative portion of task cards, interactive banners, and expanded narrative task detail views.
                      </p>
                    </div>

                    {/* Focus Window Full AI Narrative Font Size */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#3D312A]">
                          <Sparkles size={12} className="text-purple-600" /> Focus Window AI Narrative Font:
                        </span>
                        <span className="text-purple-700 font-mono font-black">{graphicsNarrativeFontSize || 48}pt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-[#8C7A6B]">24pt</span>
                        <input
                          type="range"
                          min={24}
                          max={72}
                          step={2}
                          value={graphicsNarrativeFontSize || 48}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setGraphicsNarrativeFontSize(val);
                            triggerHaptic?.("light");
                          }}
                          className="flex-1 accent-purple-600 h-1.5 bg-[#EADDC7] rounded-lg cursor-pointer"
                        />
                        <span className="text-[8px] font-bold text-[#8C7A6B]">72pt</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { label: "24pt", val: 24 },
                          { label: "36pt", val: 36 },
                          { label: "48pt", val: 48 },
                          { label: "60pt", val: 60 },
                          { label: "72pt", val: 72 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => {
                              setGraphicsNarrativeFontSize(preset.val);
                              triggerHaptic?.("light");
                            }}
                            className={`py-1 text-[8px] font-mono font-bold rounded transition-all cursor-pointer ${
                              (graphicsNarrativeFontSize || 48) === preset.val
                                ? "bg-purple-700 text-white font-black shadow-xs"
                                : "bg-[#FFF2DF] border border-[#EADDC7] text-[#3D312A] hover:bg-white"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Task Card Text & Font Color */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#3D312A]">
                          <Type size={11} className="text-[#2D6A4F]" /> Card Text & Font Color:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#8C7A6B] text-[8.5px]">{deckCardFontColor || "#FFFFFF"}</span>
                          <div
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: deckCardFontColor || "#FFFFFF" }}
                          />
                          <input
                            type="color"
                            value={deckCardFontColor?.startsWith("#") ? deckCardFontColor : "#FFFFFF"}
                            onChange={(e) => {
                              setDeckCardFontColor(e.target.value);
                              triggerHaptic?.("light");
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                            title="Pick Card Text Color"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: "#FFFFFF", name: "White" },
                          { color: "#FAF3E0", name: "Cream" },
                          { color: "#6EE7B7", name: "Emerald" },
                          { color: "#2D2319", name: "Dark Cocoa" },
                          { color: "#FBBF24", name: "Amber" },
                          { color: "#93C5FD", name: "Soft Blue" },
                        ].map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => {
                              setDeckCardFontColor(item.color);
                              triggerHaptic?.("light");
                            }}
                            className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              (deckCardFontColor || "#FFFFFF").toLowerCase() === item.color.toLowerCase()
                                ? "border-[#2D6A4F] bg-[#2D6A4F]/20 text-[#2D6A4F] shadow-xs ring-1 ring-[#2D6A4F]"
                                : "border-black/10 bg-[#FFF2DF] hover:bg-white text-[#3D312A]"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDeckCardFontColor("#FFFFFF");
                            triggerHaptic?.("light");
                          }}
                          className="px-2 py-1 text-[7.5px] font-bold uppercase rounded-lg border border-[#EADDC7] bg-[#FFF2DF] text-[#8C7A6B] hover:text-[#3D312A] transition-all ml-auto cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Task Deck Card Font Size */}
                    <div className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-[#3D312A]">
                        <span className="opacity-70">Task Title Font Size:</span>
                        <span className="text-[#2D6A4F] uppercase font-black">{deckCardFontSize || "medium"}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {(["small", "medium", "large", "xl"] as const).map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setDeckCardFontSize(size);
                              triggerHaptic?.("light");
                            }}
                            className={`py-1 text-[8px] font-black uppercase rounded transition-all cursor-pointer ${
                              (deckCardFontSize || "medium") === size
                                ? "bg-[#2D6A4F] text-white shadow-xs"
                                : "bg-[#FFF2DF] border border-[#EADDC7] text-[#3D312A] hover:bg-white"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ========================================================
                      SUB-SECTION B: BACKGROUND CARD & COLOR ADJUSTMENTS
                      ======================================================== */}
                  <div className="pt-2 border-t border-[#EADDC7] space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-[#A25F37] flex items-center gap-1.5">
                        <Palette size={12} /> Background Card & Color Adjustments
                      </span>
                      <span className="text-[8px] font-bold text-[#8C7A6B] uppercase font-mono">Fills & Styles</span>
                    </div>

                    {/* 1. Card Header & Background Fill */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#3D312A]">
                          <Palette size={11} className="text-[#2D6A4F]" /> Card Header & Background Fill:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#8C7A6B] text-[8.5px]">{deckCardHeaderBg || "#1C3B2B"}</span>
                          <div
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: deckCardHeaderBg || "#1C3B2B" }}
                          />
                          <input
                            type="color"
                            value={deckCardHeaderBg?.startsWith("#") ? deckCardHeaderBg : "#1C3B2B"}
                            onChange={(e) => {
                              setDeckCardHeaderBg(e.target.value);
                              triggerHaptic?.("light");
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                            title="Pick Card Header / Background Color"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: "#1C3B2B", name: "Forest Dark" },
                          { color: "#152E21", name: "Deep Green" },
                          { color: "#2D6A4F", name: "Emerald" },
                          { color: "#A25F37", name: "Terracotta" },
                          { color: "#1E293B", name: "Slate Dark" },
                          { color: "#0F172A", name: "Midnight" },
                          { color: "#2E1065", name: "Deep Violet" },
                          { color: "#FFF2DF", name: "Warm Ivory" },
                          { color: "#78350F", name: "Amber Dark" },
                        ].map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => {
                              triggerHaptic?.("light");
                              setDeckCardHeaderBg(item.color);
                            }}
                            className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              (deckCardHeaderBg || "#1C3B2B").toLowerCase() === item.color.toLowerCase()
                                ? "border-[#2D6A4F] bg-[#2D6A4F]/20 text-[#2D6A4F] shadow-xs ring-1 ring-[#2D6A4F]"
                                : "border-black/10 bg-[#FFF2DF] hover:bg-white text-[#3D312A]"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDeckCardHeaderBg("#1C3B2B");
                            triggerHaptic?.("light");
                          }}
                          className="px-2 py-1 text-[7.5px] font-bold uppercase rounded-lg border border-[#EADDC7] bg-[#FFF2DF] text-[#8C7A6B] hover:text-[#3D312A] transition-all ml-auto cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* 2. Expanded Card Body Fill */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#3D312A]">
                          <Palette size={11} className="text-[#A25F37]" /> Expanded Card Body Fill:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#8C7A6B] text-[8.5px]">{deckCardExpandedBg || "#152E21"}</span>
                          <div
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: deckCardExpandedBg || "#152E21" }}
                          />
                          <input
                            type="color"
                            value={deckCardExpandedBg?.startsWith("#") ? deckCardExpandedBg : "#152E21"}
                            onChange={(e) => {
                              setDeckCardExpandedBg(e.target.value);
                              triggerHaptic?.("light");
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                            title="Pick Expanded Card Fill"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: "#152E21", name: "Dark Green" },
                          { color: "#0B1D15", name: "Forest Dark" },
                          { color: "#FAF3E0", name: "Warm Cream" },
                          { color: "#020617", name: "Obsidian" },
                          { color: "#1E293B", name: "Slate Dark" },
                        ].map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => {
                              setDeckCardExpandedBg(item.color);
                              triggerHaptic?.("light");
                            }}
                            className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              (deckCardExpandedBg || "#152E21").toLowerCase() === item.color.toLowerCase()
                                ? "border-[#2D6A4F] bg-[#2D6A4F]/20 text-[#2D6A4F] shadow-xs ring-1 ring-[#2D6A4F]"
                                : "border-black/10 bg-[#FFF2DF] hover:bg-white text-[#3D312A]"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setDeckCardExpandedBg("#152E21");
                            triggerHaptic?.("light");
                          }}
                          className="px-2 py-1 text-[7.5px] font-bold uppercase rounded-lg border border-[#EADDC7] bg-[#FFF2DF] text-[#8C7A6B] hover:text-[#3D312A] transition-all ml-auto cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* 3. Timeline Card Background Color */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#3D312A]">
                          <Palette size={11} className="text-[#2D6A4F]" /> Timeline Card Background:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#8C7A6B] text-[8.5px]">{timelineCardBgColor || "Default"}</span>
                          {timelineCardBgColor && (
                            <div
                              className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                              style={{ backgroundColor: timelineCardBgColor }}
                            />
                          )}
                          <input
                            type="color"
                            value={timelineCardBgColor?.startsWith("#") ? timelineCardBgColor : "#1C3B2B"}
                            onChange={(e) => {
                              setTimelineCardBgColor(e.target.value);
                              triggerHaptic?.("light");
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                            title="Pick Timeline Card Background"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: "#1C3B2B", name: "Forest" },
                          { color: "#2D6A4F", name: "Emerald" },
                          { color: "#A25F37", name: "Terracotta" },
                          { color: "#0F172A", name: "Midnight" },
                          { color: "#FFF2DF", name: "Ivory" },
                        ].map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => {
                              setTimelineCardBgColor(item.color);
                              triggerHaptic?.("light");
                            }}
                            className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              (timelineCardBgColor || "").toLowerCase() === item.color.toLowerCase()
                                ? "border-[#2D6A4F] bg-[#2D6A4F]/20 text-[#2D6A4F] shadow-xs ring-1 ring-[#2D6A4F]"
                                : "border-black/10 bg-[#FFF2DF] hover:bg-white text-[#3D312A]"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setTimelineCardBgColor("");
                            triggerHaptic?.("light");
                          }}
                          className="px-2 py-1 text-[7.5px] font-bold uppercase rounded-lg border border-[#EADDC7] bg-[#FFF2DF] text-[#8C7A6B] hover:text-[#3D312A] transition-all ml-auto cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* 4. Locked Card Color Swatches */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1 text-[#3D312A]">
                          <Lock size={11} className="text-[#A25F37]" /> Locked Card Fill:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#8C7A6B] text-[8.5px]">{graphicsLockedCardBg}</span>
                          <div
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: graphicsLockedCardBg }}
                          />
                          <input
                            type="color"
                            value={graphicsLockedCardBg?.startsWith("#") ? graphicsLockedCardBg : "#A25F37"}
                            onChange={(e) => {
                              setGraphicsLockedCardBg(e.target.value);
                              triggerHaptic?.("light");
                            }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                            title="Pick Locked Card Fill"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: "#A25F37", name: "Terracotta" },
                          { color: "#C84B31", name: "Burnt Rust" },
                          { color: "#9A3412", name: "Amber Red" },
                          { color: "#B45309", name: "Amber Ochre" },
                          { color: "#D97706", name: "Marigold" },
                          { color: "#991B1B", name: "Crimson" },
                          { color: "#1C3B2B", name: "Forest" },
                        ].map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => {
                              triggerHaptic?.("light");
                              setGraphicsLockedCardBg(item.color);
                            }}
                            className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              graphicsLockedCardBg.toLowerCase() === item.color.toLowerCase()
                                ? "border-[#2D6A4F] bg-[#2D6A4F]/20 text-[#2D6A4F] shadow-xs ring-1 ring-[#2D6A4F]"
                                : "border-black/10 bg-[#FFF2DF] hover:bg-white text-[#3D312A]"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setGraphicsLockedCardBg("#A25F37");
                            triggerHaptic?.("light");
                          }}
                          className="px-2 py-1 text-[7.5px] font-bold uppercase rounded-lg border border-[#EADDC7] bg-[#FFF2DF] text-[#8C7A6B] hover:text-[#3D312A] transition-all ml-auto cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* 5. Glass-Like Task Card Background Styles */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1 text-[#3D312A]">
                          <Sparkles size={11} className="text-[#2D6A4F]" /> Glass Card Background Styles:
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "translucent", label: "Translucent Slate", desc: "Balanced dark glass" },
                          { id: "frosted", label: "Frosted Light", desc: "High blur white frost" },
                          { id: "clear", label: "Crystal Clear", desc: "Ultra-minimal sheer" },
                          { id: "emerald-glass", label: "Emerald Glass", desc: "Luminous green tint" },
                          { id: "sapphire-glass", label: "Sapphire Glass", desc: "Deep indigo glow" },
                          { id: "tinted-violet", label: "Violet Glass", desc: "Neon purple aura" },
                          { id: "obsidian", label: "Obsidian Mirror", desc: "Deep dark glass" },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setTaskCardGlassStyle(preset.id);
                              triggerHaptic?.("medium");
                            }}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              taskCardGlassStyle === preset.id
                                ? "bg-[#2D6A4F]/20 border-[#2D6A4F] text-[#1B4332] shadow-xs ring-1 ring-[#2D6A4F]"
                                : "bg-[#FFF2DF] border-[#EADDC7] text-[#3D312A] hover:bg-white"
                            }`}
                          >
                            <div className="text-[10px] font-black">{preset.label}</div>
                            <div className="text-[8px] text-[#8C7A6B]">{preset.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 6. Narrative Mode Task Details Window Colors (Backing & Font) */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2.5">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#3D312A]">
                          <Palette size={11} className="text-[#DE771B]" /> Narrative Mode Details Window Colors:
                        </span>
                        <span className="text-[7.5px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          Text & Graphics
                        </span>
                      </div>
                      
                      {/* Text Mode Narrative Window */}
                      <div className="p-2 rounded-lg bg-[#FFF2DF] border border-[#EADDC7] space-y-1.5">
                        <div className="flex items-center justify-between text-[8.5px] font-black text-[#DE771B] uppercase">
                          <span>Text Mode Backing Window & Font:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTextNarrativeEditWindowBg("#FFF2DF");
                              setTextNarrativeEditWindowFontColor("#1F1A16");
                              triggerHaptic?.("light");
                            }}
                            className="text-[7px] text-rose-500 underline cursor-pointer"
                          >
                            Reset Text Defaults
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-bold text-[#3D312A]">Window Backing:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[8px] text-[#8C7A6B]">{textNarrativeEditWindowBg || "#FFF2DF"}</span>
                              <input
                                type="color"
                                value={(textNarrativeEditWindowBg || "#FFF2DF").startsWith("#") ? (textNarrativeEditWindowBg || "#FFF2DF") : "#FFF2DF"}
                                onChange={(e) => {
                                  setTextNarrativeEditWindowBg(e.target.value);
                                  triggerHaptic?.("light");
                                }}
                                className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                                title="Pick Text Mode Narrative Window Backing Color"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-bold text-[#3D312A]">Window Font:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[8px] text-[#8C7A6B]">{textNarrativeEditWindowFontColor || "#1F1A16"}</span>
                              <input
                                type="color"
                                value={(textNarrativeEditWindowFontColor || "#1F1A16").startsWith("#") ? (textNarrativeEditWindowFontColor || "#1F1A16") : "#1F1A16"}
                                onChange={(e) => {
                                  setTextNarrativeEditWindowFontColor(e.target.value);
                                  triggerHaptic?.("light");
                                }}
                                className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                                title="Pick Text Mode Narrative Window Font Color"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[
                            { color: "#FFF2DF", font: "#1F1A16", name: "Warm Ivory" },
                            { color: "#FAF3E0", font: "#1F1A16", name: "Warm Cream" },
                            { color: "#FFFFFF", font: "#1F1A16", name: "Crisp White" },
                            { color: "#F5EBE1", font: "#2D2319", name: "Sand" },
                            { color: "#F0FDF4", font: "#14532D", name: "Sage Tint" },
                            { color: "#1C3B2B", font: "#FFFFFF", name: "Forest Dark" },
                          ].map((item) => (
                            <button
                              key={item.color}
                              type="button"
                              onClick={() => {
                                setTextNarrativeEditWindowBg(item.color);
                                setTextNarrativeEditWindowFontColor(item.font);
                                triggerHaptic?.("light");
                              }}
                              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded border transition-all cursor-pointer flex items-center gap-1 ${
                                (textNarrativeEditWindowBg || "#FFF2DF").toLowerCase() === item.color.toLowerCase()
                                  ? "border-[#DE771B] ring-1 ring-[#DE771B] font-black"
                                  : "border-black/10 hover:opacity-100 opacity-80"
                              }`}
                              style={{ backgroundColor: item.color, color: item.font }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full border border-black/20" style={{ backgroundColor: item.font }} />
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Graphics Mode Narrative Window */}
                      <div className="p-2 rounded-lg bg-[#FFF2DF] border border-[#EADDC7] space-y-1.5">
                        <div className="flex items-center justify-between text-[8.5px] font-black text-[#1E6B40] uppercase">
                          <span>Graphics Mode Backing Window & Font:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setGraphicsNarrativeEditWindowBg("#0F172A");
                              setGraphicsNarrativeEditWindowFontColor("#FFFFFF");
                              triggerHaptic?.("light");
                            }}
                            className="text-[7px] text-rose-500 underline cursor-pointer"
                          >
                            Reset Graphics Defaults
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-bold text-[#3D312A]">Window Backing:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[8px] text-[#8C7A6B]">{graphicsNarrativeEditWindowBg || "#0F172A"}</span>
                              <input
                                type="color"
                                value={(graphicsNarrativeEditWindowBg || "#0F172A").startsWith("#") ? (graphicsNarrativeEditWindowBg || "#0F172A") : "#0F172A"}
                                onChange={(e) => {
                                  setGraphicsNarrativeEditWindowBg(e.target.value);
                                  triggerHaptic?.("light");
                                }}
                                className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                                title="Pick Graphics Mode Narrative Window Backing Color"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="font-bold text-[#3D312A]">Window Font:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[8px] text-[#8C7A6B]">{graphicsNarrativeEditWindowFontColor || "#FFFFFF"}</span>
                              <input
                                type="color"
                                value={(graphicsNarrativeEditWindowFontColor || "#FFFFFF").startsWith("#") ? (graphicsNarrativeEditWindowFontColor || "#FFFFFF") : "#FFFFFF"}
                                onChange={(e) => {
                                  setGraphicsNarrativeEditWindowFontColor(e.target.value);
                                  triggerHaptic?.("light");
                                }}
                                className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                                title="Pick Graphics Mode Narrative Window Font Color"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[
                            { color: "#0F172A", font: "#FFFFFF", name: "Midnight" },
                            { color: "#1A202C", font: "#F8FAFC", name: "Slate Dark" },
                            { color: "#1C3B2B", font: "#FFFFFF", name: "Forest Dark" },
                            { color: "#2E1065", font: "#F5F3FF", name: "Deep Violet" },
                            { color: "#FFF2DF", font: "#1F1A16", name: "Warm Ivory" },
                          ].map((item) => (
                            <button
                              key={item.color}
                              type="button"
                              onClick={() => {
                                setGraphicsNarrativeEditWindowBg(item.color);
                                setGraphicsNarrativeEditWindowFontColor(item.font);
                                triggerHaptic?.("light");
                              }}
                              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded border transition-all cursor-pointer flex items-center gap-1 ${
                                (graphicsNarrativeEditWindowBg || "#0F172A").toLowerCase() === item.color.toLowerCase()
                                  ? "border-[#1E6B40] ring-1 ring-[#1E6B40] font-black"
                                  : "border-black/10 hover:opacity-100 opacity-80"
                              }`}
                              style={{ backgroundColor: item.color, color: item.font }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full border border-black/20" style={{ backgroundColor: item.font }} />
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 7. Card Density */}
                    <div className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-1">
                      <div className="font-bold opacity-70 text-[9px] text-[#3D312A]">Card Density:</div>
                      <div className="grid grid-cols-3 gap-0.5 bg-[#FFF2DF] p-0.5 rounded-lg border border-[#EADDC7]">
                        {(["standard", "simplified", "report"] as const).map((density) => (
                          <button
                            key={density}
                            type="button"
                            onClick={() => {
                              setCardDensity?.(density);
                              localStorage.setItem("card_density", density);
                              triggerHaptic?.("light");
                            }}
                            className={`py-0.5 text-[7.5px] font-black uppercase rounded ${
                              cardDensity === density ? "bg-[#2D6A4F] text-white shadow-xs" : "opacity-60 text-[#3D312A]"
                            }`}
                          >
                            {density === "standard" ? "Std" : density === "simplified" ? "Simp" : "Rep"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 7. Countdown Fluorescent Glow */}
                    <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 opacity-80 text-[#3D312A]">
                          <Zap size={11} className="text-[#10b981]" /> Countdown Fluorescent Glow:
                        </span>
                        <span className="text-[#2D6A4F] font-mono font-black">{countdownGlowBrightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="5"
                        value={countdownGlowBrightness}
                        onChange={(e) => setCountdownGlowBrightness(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-[#EADDC7] rounded-lg cursor-pointer accent-[#2D6A4F]"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: "#10b981", name: "Emerald" },
                          { color: "#06b6d4", name: "Cyan" },
                          { color: "#f59e0b", name: "Amber" },
                          { color: "#ec4899", name: "Pink" },
                          { color: "#8b5cf6", name: "Violet" },
                          { color: "#84cc16", name: "Lime" },
                          { color: "#3b82f6", name: "Blue" },
                          { color: "#ffffff", name: "White" },
                        ].map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => {
                              setCountdownGlowColor(item.color);
                              triggerHaptic?.("light");
                            }}
                            className={`w-5 h-5 rounded-md border transition-all cursor-pointer ${
                              countdownGlowColor.toLowerCase() === item.color.toLowerCase()
                                ? "border-[#2D6A4F] scale-110 shadow-xs ring-1 ring-[#2D6A4F]"
                                : "border-black/20 hover:scale-105"
                            }`}
                            style={{ backgroundColor: item.color }}
                            title={item.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Motion & Interaction Settings */}
                  <div className="pt-2 border-t border-[#EADDC7] space-y-2">
                    <ToggleRow
                      icon={SlidersHorizontal}
                      iconColor="text-[#2D6A4F]"
                      title="Stretch Start & End Time"
                      subtitle="Drag top & bottom card edges on timeline"
                      checked={enableTimeStretch}
                      onChange={() => setEnableTimeStretch(!enableTimeStretch)}
                    />

                    {/* Compress Default Toggle */}
                    <ToggleRow
                      icon={ChevronsUpDown}
                      iconColor="text-[#2563EB]"
                      title="Compress (Flexible Tasks)"
                      subtitle="Shrink duration as current time passes, spring back & ripple when passed"
                      checked={!!compressByDefault}
                      onChange={() => {
                        onToggleCompressByDefault?.();
                        triggerHaptic?.("medium");
                      }}
                    />

                    {/* Snap Increment */}
                    <div className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="flex items-center gap-1.5 opacity-80 text-[#3D312A]">
                          <Magnet size={11} className="text-[#A25F37]" /> Snap Flexible Tasks:
                        </span>
                        <span className="text-[#2D6A4F] font-mono font-black">
                          {timelineIncrement === 0 ? "Off" : `${timelineIncrement} min`}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { label: "Off", val: 0 },
                          { label: "5m", val: 5 },
                          { label: "10m", val: 10 },
                          { label: "15m", val: 15 },
                          { label: "30m", val: 30 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => {
                              setTimelineIncrement(preset.val);
                              saveSystemSettingsToCloud({ timelineIncrement: preset.val });
                              triggerHaptic?.("medium");
                            }}
                            className={`py-1 text-[8.5px] font-mono font-bold rounded transition-all cursor-pointer ${
                              timelineIncrement === preset.val
                                ? "bg-[#2D6A4F] text-white font-black shadow-xs"
                                : "bg-[#FFF2DF] border border-[#EADDC7] text-[#3D312A] hover:bg-white"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 7: SYSTEM, CLOUD & DEVELOPER */}
              {(isSearching || activeSection === "all" || activeSection === "system") && matchesSearch("system", "cloud", "auth", "dev", "backup", "admin", "settings", "weather", "sound", "haptic") && (
                <div className={`rounded-2xl p-3 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs transition-all ${isSectionCollapsed(7) ? "space-y-0" : "space-y-2.5"}`}>
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(7)}
                    className="w-full flex items-center justify-between cursor-pointer select-none text-left py-0.5 group focus:outline-hidden"
                    title={isSectionCollapsed(7) ? "Expand Section 7" : "Collapse Section 7"}
                    aria-expanded={!isSectionCollapsed(7)}
                  >
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#2D6A4F] flex items-center gap-1.5 px-0.5 group-hover:text-[#1B4332] transition-colors">
                      <Cloud size={12} /> 7. System, Cloud & Developer
                    </span>
                    <div className="p-1 rounded-md hover:bg-black/5 text-[#8C7A6B] group-hover:text-[#3D312A] transition-colors">
                      {isSectionCollapsed(7) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </div>
                  </button>

                  {!isSectionCollapsed(7) && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">

                  {/* Cloud Account Status */}
                  <div className="p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {currentUser?.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt="Profile"
                          className="w-6 h-6 rounded-full object-cover border border-[#2D6A4F]/40"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#2D6A4F]/20 border border-[#2D6A4F]/30 flex items-center justify-center text-[10px] font-black text-[#2D6A4F]">
                          {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] font-black truncate text-[#3D312A]">
                          {currentUser ? currentUser.displayName || currentUser.email : "Local Browser Profile"}
                        </div>
                        <div className="text-[8px] opacity-60 truncate">
                          {currentUser ? currentUser.email : "Not signed into cloud"}
                        </div>
                      </div>
                    </div>

                    {currentUser ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (auth) {
                            await signOut(auth);
                            triggerHaptic("medium");
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-[8.5px] font-black bg-rose-500/20 text-rose-700 border border-rose-500/30 hover:bg-rose-500/30 transition-all cursor-pointer"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (auth) {
                            try {
                              const provider = new GoogleAuthProvider();
                              await signInWithPopup(auth, provider);
                              triggerHaptic("medium");
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        }}
                        className="px-2 py-1 rounded-lg text-[8.5px] font-black bg-[#2D6A4F] hover:bg-[#1B4332] text-white flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <LogIn size={10} />
                        <span>Sign In</span>
                      </button>
                    )}
                  </div>

                  {/* Feature Modules Submenu Launcher */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSubmenu("features");
                      triggerHaptic("medium");
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal size={13} className="text-[#2D6A4F]" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider">Feature Modules (14 Toggles)</div>
                        <div className="text-[8px] opacity-70">Customize active tools and panels</div>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-[#2D6A4F]" />
                  </button>

                  {/* Audio Chime & Notifications */}
                  <div className="space-y-1.5">
                    <ToggleRow
                      icon={Volume2}
                      iconColor="text-[#2D6A4F]"
                      title="Completion Chime"
                      subtitle="Audio chime on task complete"
                      checked={completionSoundEnabled}
                      onChange={() => {
                        const next = !completionSoundEnabled;
                        setCompletionSoundEnabled(next);
                        setCompletionChimeEnabled(next);
                        saveSystemSettingsToCloud({ completionSoundEnabled: next });
                        if (next) playTaskCompletionChime({ force: true });
                      }}
                    />
                    <ToggleRow
                      icon={Bell}
                      iconColor="text-[#A25F37]"
                      title="Toast Notifications"
                      subtitle="Popup alerts for schedule actions"
                      checked={isToastEnabled}
                      onChange={() => {
                        const next = !isToastEnabled;
                        setIsToastEnabled?.(next);
                        localStorage.setItem("toast_notifications_enabled", next.toString());
                        saveSystemSettingsToCloud({ toastNotificationsEnabled: next });
                      }}
                    />
                  </div>

                  {/* Utility Grid: Undo, Dev Hub, Backups, Admin, Favors */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {onUndo && (
                      <button
                        type="button"
                        onClick={() => {
                          if (canUndo) {
                            onUndo();
                            triggerHaptic("medium");
                          }
                        }}
                        disabled={!canUndo}
                        className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                          canUndo
                            ? "bg-[#FAF3E0] hover:bg-[#EADDC7] border-[#EADDC7] text-[#3D312A] cursor-pointer"
                            : "opacity-40 cursor-not-allowed border-transparent bg-black/5"
                        }`}
                      >
                        <RotateCcw size={12} />
                        <span className="text-[9.5px] font-black uppercase">Undo</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSubmenu("dev");
                        triggerHaptic("medium");
                      }}
                      className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
                    >
                      <Terminal size={12} className="text-[#2D6A4F]" />
                      <span className="text-[9.5px] font-black uppercase">Dev & API Hub</span>
                    </button>

                    {openSettingsModal && (
                      <button
                        type="button"
                        onClick={() => {
                          openSettingsModal("backups");
                          onClose();
                        }}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
                      >
                        <HardDrive size={12} className="text-[#8B5CF6]" />
                        <span className="text-[9.5px] font-black uppercase">Backups</span>
                      </button>
                    )}

                    {onOpenAdminPortal && (
                      <button
                        type="button"
                        onClick={() => handleAction(onOpenAdminPortal)}
                        className="p-2 rounded-xl border border-[#EADDC7] bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
                      >
                        <ShieldCheck size={12} className="text-[#A25F37]" />
                        <span className="text-[9.5px] font-black uppercase">Admin</span>
                      </button>
                    )}
                  </div>

                  {/* All Workspace Settings Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      if (openSettingsModal) {
                        openSettingsModal();
                      } else if (onOpenSettings) {
                        onOpenSettings();
                      }
                      onClose();
                      triggerHaptic("medium");
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer font-black text-xs uppercase tracking-wider"
                  >
                    <Settings2 size={14} />
                    <span>All Workspace Settings</span>
                  </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
});
