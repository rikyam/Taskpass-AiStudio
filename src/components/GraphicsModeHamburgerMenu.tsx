import React, { useState } from "react";
import { formatDate } from "../utils/timeHelpers";
import { useAppStore } from "../store";
import {
  X,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  BookOpen,
  Plus,
  Coffee,
  CheckSquare,
  FileText,
  FilePlus,
  Brain,
  Database,
  Users,
  Coins,
  RotateCcw,
  Sun,
  Moon,
  ShieldCheck,
  Settings,
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
  Lock
} from "lucide-react";
import { isColorLight } from "../utils/themeHelpers";

export interface GraphicsModeHamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerHaptic?: (type?: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;

  // Search
  searchQuery: string;
  onSearchChange: (val: string) => void;

  // Date & Navigation
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  activeDayStartHour: string;
  onStartHourChange: (time: string) => void;

  // Actions & Create
  onAddTask: () => void;
  onDeployRoutine?: () => void;
  onSequenceBrainstorm?: () => void;
  onQuickNote?: () => void;

  // AI & Intelligence
  onOpenChatbot: () => void;
  onOpenNotebookLm?: () => void;
  onOpenAiPlans?: () => void;

  // Bulk Operations
  onOpenBulkPrioritize?: () => void;
  onAdHocSequence?: () => void;
  onUnlockAll?: () => void;
  onClearFlags?: () => void;
  onReprocessRules?: () => void;
  onBulkToSaved?: () => void;
  onBulkToTomorrow?: () => void;
  onBulkToDone?: () => void;
  onGcalSync?: () => void;
  isGcalSyncActive?: boolean;

  // Workspace Data & Portals
  notesCount?: number;
  onOpenNotesRepo?: () => void;
  onOpenDataWarehouse?: (tab?: "plans" | "directory" | "spending") => void;
  onOpenManageCollaborators?: () => void;
  onOpenAdminPortal?: () => void;
  taskpassEnabled?: boolean;
  currentView?: "focus" | "deck" | "timeline" | "passed" | "report";
  onSelectView?: (view: "focus" | "deck" | "timeline" | "passed" | "report") => void;

  // System & Preferences
  canUndo?: boolean;
  onUndo?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  uiMode: "Text" | "Graphics";
  onSetUiMode: (mode: "Text" | "Graphics") => void;
  onOpenSettings: () => void;
  favorPoints?: number;
  onOpenTaskPass?: () => void;
}

export const GraphicsModeHamburgerMenu: React.FC<GraphicsModeHamburgerMenuProps> = ({
  isOpen,
  onClose,
  triggerHaptic = () => {},
  searchQuery,
  onSearchChange,
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
  onOpenBulkPrioritize,
  onAdHocSequence,
  onUnlockAll,
  onClearFlags,
  onReprocessRules,
  onBulkToSaved,
  onBulkToTomorrow,
  onBulkToDone,
  onGcalSync,
  isGcalSyncActive,
  notesCount = 0,
  onOpenNotesRepo,
  onOpenDataWarehouse,
  onOpenAdminPortal,
  taskpassEnabled = true,
  currentView = "focus",
  onSelectView,
  canUndo = false,
  onUndo,
  isDark = false,
  onToggleTheme,
  uiMode,
  onSetUiMode,
  onOpenSettings,
  onOpenManageCollaborators,
  favorPoints = 0,
  onOpenTaskPass,
}) => {
  const [activeSection, setActiveSection] = useState<string>("all");

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

  if (!isOpen) return null;

  const formattedDate = formatDate(selectedDate);

  const handleActionClick = (fn?: () => void) => {
    if (fn) {
      triggerHaptic("light");
      fn();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex animate-fadeIn select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#2D2319]/50 backdrop-blur-sm transition-opacity"
        onClick={() => {
          triggerHaptic("light");
          onClose();
        }}
      />

      {/* Slide-out Drawer from Left */}
      <div
        id="graphics-mode-hamburger-drawer"
        className="relative z-10 w-full max-w-sm sm:max-w-md h-full flex flex-col shadow-2xl overflow-hidden border-r border-[#EADDC7]"
        style={{
          backgroundColor: "#FAF3E0", // Warm cream/beige background
          color: "#3D312A",
        }}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#EADDC7] flex items-center justify-between bg-[#FFF2DF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center font-black text-sm shadow-sm">
              ☰
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#3D312A] leading-tight font-sans">
                Workspace Menu
              </h2>
              <p className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                Graphics Mode Controls
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#EADDC7]/60 hover:bg-[#EADDC7] text-[#3D312A] flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Close menu"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:px-4 border-b border-[#EADDC7]/80 bg-[#FAF3E0]">
          <div className="relative flex items-center bg-[#FFF2DF] border border-[#EADDC7] rounded-xl px-3 py-2 shadow-inner focus-within:border-[#2D6A4F] transition-all">
            <Search size={14} className="text-[#A25F37] mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search tasks, sequence notes, tags..."
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
                className="p-1 text-[#8C7A6B] hover:text-[#3D312A] cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 space-y-4">
          {/* 0. WORKSPACE VIEWS NAVIGATION */}
          {onSelectView && (
            <div className="rounded-2xl p-3.5 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs space-y-2">
              <div className="text-[9.5px] font-black uppercase tracking-widest text-[#8C7A6B] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers size={12} className="text-[#2D6A4F]" /> Switch Workspace View
                </span>
                <span className="text-[9px] font-mono text-[#A25F37] font-bold uppercase">
                  Current: {currentView}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    onSelectView("focus");
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                    currentView === "focus"
                      ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                      : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                  }`}
                >
                  <Activity size={14} className={currentView === "focus" ? "text-emerald-200" : "text-[#2D6A4F]"} />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider leading-none">Focus Card</div>
                    <div className={`text-[8.5px] mt-0.5 ${currentView === "focus" ? "text-emerald-100" : "text-[#8C7A6B]"}`}>Full screen focus</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onSelectView("deck");
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                    currentView === "deck"
                      ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                      : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                  }`}
                >
                  <Layers size={14} className={currentView === "deck" ? "text-emerald-200" : "text-[#A25F37]"} />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider leading-none">Tasks Deck</div>
                    <div className={`text-[8.5px] mt-0.5 ${currentView === "deck" ? "text-emerald-100" : "text-[#8C7A6B]"}`}>All daily items</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onSelectView("timeline");
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                    currentView === "timeline"
                      ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                      : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                  }`}
                >
                  <Clock size={14} className={currentView === "timeline" ? "text-emerald-200" : "text-[#2563EB]"} />
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider leading-none">Timeline</div>
                    <div className={`text-[8.5px] mt-0.5 ${currentView === "timeline" ? "text-emerald-100" : "text-[#8C7A6B]"}`}>Schedule breakdown</div>
                  </div>
                </button>

                {taskpassEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onSelectView("passed");
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                      currentView === "passed"
                        ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs"
                        : "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7]"
                    }`}
                  >
                    <ShoppingBag size={14} className={currentView === "passed" ? "text-emerald-200" : "text-[#D97706]"} />
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider leading-none">TaskPass</div>
                      <div className={`text-[8.5px] mt-0.5 ${currentView === "passed" ? "text-emerald-100" : "text-[#8C7A6B]"}`}>Favors & rewards</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1. DATE & TIME SECTION */}
          <div className="rounded-2xl p-3.5 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-[#8C7A6B] flex items-center gap-1.5">
                <Calendar size={12} className="text-[#A25F37]" /> Date & Daily Schedule
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onToday();
                }}
                className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[#2D6A4F] hover:bg-[#1B4332] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center justify-between bg-[#FAF3E0] p-1.5 rounded-xl border border-[#EADDC7]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onPrevDay();
                }}
                className="p-1.5 rounded-lg hover:bg-[#EADDC7]/60 text-[#3D312A] transition-all active:scale-95 cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>

              <div className="relative flex items-center justify-center gap-1.5 flex-1 px-2 text-center cursor-pointer group">
                <span className="text-xs font-black text-[#3D312A] select-none truncate">
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
                  triggerHaptic("light");
                  onNextDay();
                }}
                className="p-1.5 rounded-lg hover:bg-[#EADDC7]/60 text-[#3D312A] transition-all active:scale-95 cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Daily Start Time */}
            <div className="relative flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] cursor-pointer group">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-[#A25F37]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8C7A6B]">
                  Daily Start Time:
                </span>
              </div>
              <span className="text-xs font-mono font-black text-[#3D312A]">
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
          </div>

          {/* 2. PRIMARY CREATION & ACTIONS */}
          <div className="space-y-1.5">
            <div className="text-[9.5px] font-black uppercase tracking-widest text-[#8C7A6B] px-1">
              Create & Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Quick Add Task */}
              <button
                type="button"
                onClick={() => handleActionClick(onAddTask)}
                className="p-3 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white flex flex-col items-start gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer text-left group"
              >
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                  <Plus size={16} strokeWidth={3} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider">Add Task</div>
                  <div className="text-[9px] text-emerald-100/80 font-medium">New schedule item</div>
                </div>
              </button>

              {/* Deploy Routine Sequence */}
              {onDeployRoutine && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onDeployRoutine)}
                  className="p-3 rounded-2xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex flex-col items-start gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer text-left group"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#A25F37]/15 text-[#A25F37] flex items-center justify-center">
                    <Coffee size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">Deploy Routine</div>
                    <div className="text-[9px] text-[#8C7A6B] font-medium">Preset sequences</div>
                  </div>
                </button>
              )}

              {/* Sequence Brainstorm */}
              {onSequenceBrainstorm && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onSequenceBrainstorm)}
                  className="p-3 rounded-2xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex flex-col items-start gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer text-left group"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center">
                    <CheckSquare size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">Brainstorm</div>
                    <div className="text-[9px] text-[#8C7A6B] font-medium">Multi-item entry</div>
                  </div>
                </button>
              )}

              {/* Quick Note+ */}
              {onQuickNote && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onQuickNote)}
                  className="p-3 rounded-2xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex flex-col items-start gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer text-left group"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                    <FilePlus size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">Quick Note+</div>
                    <div className="text-[9px] text-[#8C7A6B] font-medium">Capture thought</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* 3. AI & INTELLIGENCE */}
          <div className="space-y-1.5">
            <div className="text-[9.5px] font-black uppercase tracking-widest text-[#8C7A6B] px-1">
              AI & Intelligence
            </div>
            <div className="space-y-2">
              {/* Gemini Chatbot */}
              <button
                type="button"
                onClick={() => handleActionClick(onOpenChatbot)}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#5B21B6] to-[#7C3AED] text-white flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Sparkles size={16} className="text-amber-300 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black uppercase tracking-wider">Gemini A.I. Assistant</div>
                    <div className="text-[9.5px] text-purple-200">Interactive planner & deep helper</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                  a.i
                </span>
              </button>

              {/* NotebookLM Hub */}
              {onOpenNotebookLm && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenNotebookLm)}
                  className="w-full p-2.5 rounded-xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen size={15} className="text-[#8B5CF6]" />
                    <span className="text-xs font-black uppercase tracking-wider">NotebookLM Connector</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-[#8C7A6B]">Knowledge Hub</span>
                </button>
              )}

              {/* AI Science Plans */}
              {onOpenAiPlans && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenAiPlans)}
                  className="w-full p-2.5 rounded-xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Brain size={15} className="text-[#10B981]" />
                    <span className="text-xs font-black uppercase tracking-wider">AI Science Plans</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-[#10B981]">Plans Vault</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. BULK OPERATIONS */}
          <div className="rounded-2xl p-3.5 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs space-y-2">
            <div className="text-[9.5px] font-black uppercase tracking-widest text-[#8C7A6B] flex items-center gap-1.5">
              <Layers size={12} className="text-[#A25F37]" /> Bulk Operations
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {onOpenBulkPrioritize && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenBulkPrioritize)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <Sparkles size={13} className="text-[#A25F37] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Prioritize Pool</span>
                </button>
              )}

              {onAdHocSequence && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onAdHocSequence)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <ListOrdered size={13} className="text-[#2D6A4F] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Ad Hoc Sequence</span>
                </button>
              )}

              {onUnlockAll && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onUnlockAll)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <Unlock size={13} className="text-[#D97706] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Unlock All</span>
                </button>
              )}

              {onClearFlags && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onClearFlags)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <Flag size={13} className="text-[#EF4444] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Clear Flags</span>
                </button>
              )}

              {onReprocessRules && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onReprocessRules)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <RefreshCw size={13} className="text-[#3B82F6] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Reprocess Rules</span>
                </button>
              )}

              {onBulkToSaved && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onBulkToSaved)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <FolderClosed size={13} className="text-[#8B5CF6] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Move to Saved</span>
                </button>
              )}

              {onBulkToTomorrow && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onBulkToTomorrow)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <ArrowRight size={13} className="text-[#F59E0B] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">To Tomorrow</span>
                </button>
              )}

              {onBulkToDone && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onBulkToDone)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <CheckCircle2 size={13} className="text-[#10B981] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">All to Done</span>
                </button>
              )}
            </div>

            {onGcalSync && (
              <button
                type="button"
                onClick={() => handleActionClick(onGcalSync)}
                className="w-full mt-1 p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-[#2563EB]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Google Calendar Sync</span>
                </div>
                <span className="text-[9px] font-mono text-[#8C7A6B]">
                  {isGcalSyncActive ? "Active" : "Sync"}
                </span>
              </button>
            )}
          </div>

          {/* 5. WORKSPACE DATA & REPOSITORIES */}
          <div className="space-y-1.5">
            <div className="text-[9.5px] font-black uppercase tracking-widest text-[#8C7A6B] px-1">
              Workspace & Data
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Notes Repository */}
              {onOpenNotesRepo && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenNotesRepo)}
                  className="p-2.5 rounded-xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-[#6366F1]" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Notes Repo</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-[#8C7A6B]">({notesCount})</span>
                </button>
              )}

              {/* Data Warehouse Vault */}
              {onOpenDataWarehouse && (
                <button
                  type="button"
                  onClick={() => handleActionClick(() => onOpenDataWarehouse())}
                  className="p-2.5 rounded-xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Database size={14} className="text-[#10B981]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider">Data Warehouse</span>
                </button>
              )}

              {/* Directory Manager */}
              {onOpenDataWarehouse && (
                <button
                  type="button"
                  onClick={() => handleActionClick(() => onOpenDataWarehouse("directory"))}
                  className="p-2.5 rounded-xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Users size={14} className="text-[#4F46E5]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider">Directory</span>
                </button>
              )}

              {/* Spending & Expenses */}
              {onOpenDataWarehouse && (
                <button
                  type="button"
                  onClick={() => handleActionClick(() => onOpenDataWarehouse("spending"))}
                  className="p-2.5 rounded-xl bg-[#FFF2DF] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Coins size={14} className="text-[#059669]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider">Expenses</span>
                </button>
              )}

              {/* Collaborators Database Manager */}
              {onOpenManageCollaborators && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenManageCollaborators)}
                  className="col-span-2 p-2.5 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                  title="Edit, Delete, and Add Collaborators in Database"
                >
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#A25F37]" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider">Collaborators (Database)</span>
                  </div>
                  <span className="text-[9px] font-bold text-[#2D6A4F] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#C8E6C9]">
                    Manage Database
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 6. SYSTEM & PREFERENCES */}
          <div className="rounded-2xl p-3.5 bg-[#FFF2DF] border border-[#EADDC7] shadow-xs space-y-2.5">
            <div className="text-[9.5px] font-black uppercase tracking-widest text-[#8C7A6B]">
              Preferences & System
            </div>

            {/* UI Style Mode Switcher (Graphics vs Text) */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF3E0] border border-[#EADDC7]">
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-[#A25F37]" />
                <div>
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-[#3D312A]">
                    Interface Style
                  </div>
                  <div className="text-[9px] text-[#8C7A6B]">Current: {uiMode}</div>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#FFF2DF] p-0.5 rounded-lg border border-[#EADDC7]">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onSetUiMode("Graphics");
                  }}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    uiMode === "Graphics"
                      ? "bg-[#2D6A4F] text-white shadow-xs"
                      : "text-[#8C7A6B] hover:text-[#3D312A]"
                  }`}
                >
                  Graphics
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onSetUiMode("Text");
                    onClose();
                  }}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    uiMode === "Text"
                      ? "bg-[#2D6A4F] text-white shadow-xs"
                      : "text-[#8C7A6B] hover:text-[#3D312A]"
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Task Panel Task Card Appearance Customization (Graphics Mode) */}
            <div className="p-3 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Palette size={14} className="text-[#2D6A4F]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-[#3D312A]">
                    Task Panel Card Style
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setDeckCardHeaderBg("#1C3B2B");
                    setDeckCardExpandedBg("#152E21");
                    setDeckCardFontColor("#FFFFFF");
                    setDeckCardFontSize("medium");
                  }}
                  className="text-[9px] font-bold text-[#A25F37] hover:underline cursor-pointer"
                  title="Reset to default card theme"
                >
                  Reset Defaults
                </button>
              </div>

              {/* 1. Header Background Fill Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Header Background Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{deckCardHeaderBg}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#1C3B2B", name: "Forest Dark" },
                    { color: "#152E21", name: "Deep Green" },
                    { color: "#2D6A4F", name: "Emerald" },
                    { color: "#1E293B", name: "Slate Dark" },
                    { color: "#0F172A", name: "Midnight" },
                    { color: "#2E1065", name: "Deep Violet" },
                    { color: "#450A0A", name: "Crimson" },
                    { color: "#1F2937", name: "Charcoal" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setDeckCardHeaderBg(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        deckCardHeaderBg.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom header color"
                  >
                    <input
                      type="color"
                      value={deckCardHeaderBg}
                      onChange={(e) => setDeckCardHeaderBg(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
              </div>

              {/* 2. Expanded Portion Background Fill Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Expanded Portion Background</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{deckCardExpandedBg}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#152E21", name: "Deep Green" },
                    { color: "#0E2319", name: "Forest Midnight" },
                    { color: "#1C3B2B", name: "Forest Dark" },
                    { color: "#0F172A", name: "Midnight" },
                    { color: "#18181B", name: "Zinc Dark" },
                    { color: "#1E1B4B", name: "Indigo Night" },
                    { color: "#2A1215", name: "Dark Plum" },
                    { color: "#111827", name: "Gray Dark" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setDeckCardExpandedBg(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        deckCardExpandedBg.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom expanded background color"
                  >
                    <input
                      type="color"
                      value={deckCardExpandedBg}
                      onChange={(e) => setDeckCardExpandedBg(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
              </div>

              {/* 3. Font Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Font Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{deckCardFontColor}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#FFFFFF", name: "Bright White" },
                    { color: "#FAF3E0", name: "Soft Cream" },
                    { color: "#FDE047", name: "Warm Yellow" },
                    { color: "#6EE7B7", name: "Mint Emerald" },
                    { color: "#93C5FD", name: "Ice Blue" },
                    { color: "#E9D5FF", name: "Soft Lavender" },
                    { color: "#FCA5A5", name: "Rose Peach" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setDeckCardFontColor(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        deckCardFontColor.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom font color"
                  >
                    <input
                      type="color"
                      value={deckCardFontColor}
                      onChange={(e) => setDeckCardFontColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
              </div>

              {/* 4. Font Size */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[9.5px] font-bold text-[#5C4D42]">
                  <Type size={12} className="text-[#2D6A4F]" />
                  <span>Card Font Size</span>
                </div>
                <div className="grid grid-cols-4 gap-1 bg-[#FFF2DF] p-1 rounded-xl border border-[#EADDC7]">
                  {(
                    [
                      { id: "small", label: "Small" },
                      { id: "medium", label: "Medium" },
                      { id: "large", label: "Large" },
                      { id: "xl", label: "Extra" },
                    ] as const
                  ).map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setDeckCardFontSize(size.id);
                      }}
                      className={`py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                        deckCardFontSize === size.id
                          ? "bg-[#2D6A4F] text-white shadow-xs"
                          : "text-[#8C7A6B] hover:text-[#3D312A]"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Locked Task Cards Color (Task Panel & Timeline Panel) */}
            <div className="p-3 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock size={14} className="text-[#A25F37]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-[#3D312A]">
                    Locked Task Cards Color
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setGraphicsLockedCardBg("#A25F37");
                    setGraphicsLockedCardFontColor("#FFFFFF");
                  }}
                  className="text-[9px] font-bold text-[#A25F37] hover:underline cursor-pointer"
                  title="Reset to default locked card terracotta color"
                >
                  Reset Default
                </button>
              </div>

              <p className="text-[9px] text-[#7A6B5C] leading-snug">
                Customizes the color of locked (fixed appointment) task cards across both the Task Panel and Timeline Panel.
              </p>

              {/* Live Miniature Locked Task Card Preview */}
              <div
                className="p-2.5 rounded-xl border shadow-xs transition-all flex items-center justify-between gap-2"
                style={{
                  backgroundColor: graphicsLockedCardBg,
                  borderColor: isColorLight(graphicsLockedCardBg) ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.25)",
                  color: graphicsLockedCardFontColor || (isColorLight(graphicsLockedCardBg) ? "#1F1A16" : "#FFFFFF"),
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-black/20 flex items-center justify-center shrink-0">
                    <Lock size={11} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black truncate leading-tight">Fixed Appointment Task</div>
                    <div className="text-[8px] opacity-80 flex items-center gap-1">
                      <Clock size={8} /> 09:00 - 10:00
                    </div>
                  </div>
                </div>
                <span
                  className="text-[7.5px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md border shrink-0"
                  style={{
                    backgroundColor: isColorLight(graphicsLockedCardBg) ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.2)",
                    borderColor: isColorLight(graphicsLockedCardBg) ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.3)",
                  }}
                >
                  LOCKED
                </span>
              </div>

              {/* 1. Locked Card Fill Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Locked Card Fill Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{graphicsLockedCardBg}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#A25F37", name: "Terracotta Sienna (Default)" },
                    { color: "#C84B31", name: "Burnt Rust" },
                    { color: "#9A3412", name: "Warm Amber Red" },
                    { color: "#7C2D12", name: "Mahogany" },
                    { color: "#B45309", name: "Amber Ochre" },
                    { color: "#D97706", name: "Warm Marigold" },
                    { color: "#991B1B", name: "Rich Crimson" },
                    { color: "#581C87", name: "Royal Plum" },
                    { color: "#312E81", name: "Indigo Night" },
                    { color: "#1E3A8A", name: "Deep Navy" },
                    { color: "#064E3B", name: "Dark Spruce" },
                    { color: "#1C3B2B", name: "Forest Dark" },
                    { color: "#3F3F46", name: "Zinc Graphite" },
                    { color: "#18181B", name: "Obsidian" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setGraphicsLockedCardBg(item.color);
                        if (isColorLight(item.color) && graphicsLockedCardFontColor === "#FFFFFF") {
                          setGraphicsLockedCardFontColor("#1F1A16");
                        } else if (!isColorLight(item.color) && graphicsLockedCardFontColor === "#1F1A16") {
                          setGraphicsLockedCardFontColor("#FFFFFF");
                        }
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        graphicsLockedCardBg.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom locked card color"
                  >
                    <input
                      type="color"
                      value={graphicsLockedCardBg}
                      onChange={(e) => {
                        setGraphicsLockedCardBg(e.target.value);
                        if (isColorLight(e.target.value) && graphicsLockedCardFontColor === "#FFFFFF") {
                          setGraphicsLockedCardFontColor("#1F1A16");
                        } else if (!isColorLight(e.target.value) && graphicsLockedCardFontColor === "#1F1A16") {
                          setGraphicsLockedCardFontColor("#FFFFFF");
                        }
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
              </div>

              {/* 2. Locked Card Font Color */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Locked Card Font Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{graphicsLockedCardFontColor}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#FFFFFF", name: "Bright White" },
                    { color: "#FAF3E0", name: "Warm Cream" },
                    { color: "#1F1A16", name: "Deep Charcoal" },
                    { color: "#FDE047", name: "Sunlight Yellow" },
                    { color: "#FED7AA", name: "Soft Peach" },
                    { color: "#BAE6FD", name: "Ice Blue" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setGraphicsLockedCardFontColor(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        graphicsLockedCardFontColor.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom locked card font color"
                  >
                    <input
                      type="color"
                      value={graphicsLockedCardFontColor}
                      onChange={(e) => setGraphicsLockedCardFontColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Active Window Background Color (Graphics Mode Only) */}
            <div className="p-3 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Palette size={14} className="text-[#2D6A4F]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-[#3D312A]">
                    Active Window Background
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setGraphicsActiveWindowBg("#FAF3E0");
                  }}
                  className="text-[9px] font-bold text-[#A25F37] hover:underline cursor-pointer"
                  title="Reset to default warm cream background"
                >
                  Reset Default
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Active Window Background Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{graphicsActiveWindowBg}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#FAF3E0", name: "Warm Cream (Default)" },
                    { color: "#FFFFFF", name: "Clean White" },
                    { color: "#F8FAFC", name: "Slate Light" },
                    { color: "#F1F5F9", name: "Soft Gray" },
                    { color: "#E8F0EB", name: "Sage Mist" },
                    { color: "#FDF6EC", name: "Almond Peach" },
                    { color: "#F5EFEB", name: "Warm Sand" },
                    { color: "#152E21", name: "Forest Dark" },
                    { color: "#1E293B", name: "Slate Dark" },
                    { color: "#0F172A", name: "Midnight" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setGraphicsActiveWindowBg(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        graphicsActiveWindowBg.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom background color"
                  >
                    <input
                      type="color"
                      value={graphicsActiveWindowBg}
                      onChange={(e) => setGraphicsActiveWindowBg(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
                <p className="text-[8.5px] text-[#8C7A6B] italic">
                  Changes background color of the active window exclusively in Graphics Mode.
                </p>
              </div>
            </div>

            {/* Focus Task Panel Graphics Only Mode Styling (Action Boxes, Font Colors, Font Sizes) */}
            <div className="p-3 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers size={14} className="text-[#2D6A4F]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-[#3D312A]">
                    Focus Panel Action Boxes & Typography
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic?.("light");
                    setGraphicsActionBoxBg("#FFF2DF");
                    setGraphicsActionBoxFontColor("#2D2319");
                    setGraphicsTaskTitleFontSize("medium");
                    setGraphicsTimeFontSize("medium");
                    setGraphicsNarrativeFontSize(60);
                    setGraphicsNarrativePillFontSize(12);
                  }}
                  className="text-[9px] font-bold text-[#A25F37] hover:underline cursor-pointer"
                  title="Reset action box and narrative styling to defaults"
                >
                  Reset Defaults
                </button>
              </div>

              {/* 1. Action Boxes Background Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Action Boxes Background Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{graphicsActionBoxBg}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#FFF2DF", name: "Warm Apricot (Default)" },
                    { color: "#FAF3E0", name: "Warm Cream" },
                    { color: "#FFFFFF", name: "Pure White" },
                    { color: "#F8FAFC", name: "Slate Light" },
                    { color: "#E8F5E9", name: "Soft Mint" },
                    { color: "#FEF3C7", name: "Soft Amber" },
                    { color: "#F3E8FF", name: "Lavender" },
                    { color: "#1C3B2B", name: "Forest Dark" },
                    { color: "#1F2937", name: "Charcoal" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setGraphicsActionBoxBg(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        graphicsActionBoxBg.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom action box color"
                  >
                    <input
                      type="color"
                      value={graphicsActionBoxBg}
                      onChange={(e) => setGraphicsActionBoxBg(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
                <p className="text-[8.5px] text-[#8C7A6B] italic">
                  Changes color of the duration, collaborator, subtask, location, buffer, and brainstorm action boxes.
                </p>
              </div>

              {/* 2. Action Boxes Font Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Action Boxes Font Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{graphicsActionBoxFontColor}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#2D2319", name: "Espresso (Default)" },
                    { color: "#1F1A16", name: "Pitch Black" },
                    { color: "#594B3E", name: "Mocha Brown" },
                    { color: "#2D6A4F", name: "Forest Emerald" },
                    { color: "#A25F37", name: "Terracotta" },
                    { color: "#1E3A8A", name: "Deep Navy" },
                    { color: "#FFFFFF", name: "Pure White" },
                    { color: "#E5E7EB", name: "Light Smoke" },
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setGraphicsActionBoxFontColor(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        graphicsActionBoxFontColor.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-1 ring-[#2D6A4F]"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom font color for action boxes"
                  >
                    <input
                      type="color"
                      value={graphicsActionBoxFontColor}
                      onChange={(e) => setGraphicsActionBoxFontColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
              </div>

              {/* 3. Task Title Font Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Task Title Font Size</span>
                  <span className="font-mono text-[9px] text-[#2D6A4F] font-bold uppercase">{graphicsTaskTitleFontSize}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: "small" as const, label: "Small" },
                    { id: "medium" as const, label: "Medium" },
                    { id: "large" as const, label: "Large" },
                    { id: "xl" as const, label: "XL" },
                    { id: "2xl" as const, label: "2XL" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setGraphicsTaskTitleFontSize(opt.id);
                      }}
                      className={`py-1 rounded-lg text-[9px] font-black tracking-wide transition-all cursor-pointer border ${
                        graphicsTaskTitleFontSize === opt.id
                          ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs"
                          : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border-[#EADDC7]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Start & Stop Time Font Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Start & Stop Time Font Size</span>
                  <span className="font-mono text-[9px] text-[#2D6A4F] font-bold uppercase">{graphicsTimeFontSize}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: "small" as const, label: "Small" },
                    { id: "medium" as const, label: "Medium" },
                    { id: "large" as const, label: "Large" },
                    { id: "xl" as const, label: "XL" },
                    { id: "2xl" as const, label: "2XL" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setGraphicsTimeFontSize(opt.id);
                      }}
                      className={`py-1 rounded-lg text-[9px] font-black tracking-wide transition-all cursor-pointer border ${
                        graphicsTimeFontSize === opt.id
                          ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs"
                          : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border-[#EADDC7]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Full Active Window AI Narrative Font Size */}
              <div className="space-y-1.5 pt-2 border-t border-[#EADDC7]/60">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Full Active Window AI Narrative Font Size</span>
                  <span className="font-mono text-[9px] text-[#2D6A4F] font-bold uppercase">{graphicsNarrativeFontSize || 60}pt</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { val: 36, label: "36pt" },
                    { val: 48, label: "48pt" },
                    { val: 60, label: "60pt (Def)" },
                    { val: 72, label: "72pt" },
                    { val: 84, label: "84pt" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setGraphicsNarrativeFontSize(opt.val);
                      }}
                      className={`py-1 rounded-lg text-[8.5px] font-black tracking-wide transition-all cursor-pointer border ${
                        (graphicsNarrativeFontSize || 60) === opt.val
                          ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs"
                          : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border-[#EADDC7]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Stepper / Range slider for fine tuning */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic?.("light");
                      setGraphicsNarrativeFontSize(Math.max(20, (graphicsNarrativeFontSize || 60) - 4));
                    }}
                    className="w-6 h-6 rounded-md bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border border-[#EADDC7] flex items-center justify-center text-xs font-bold active:scale-95 cursor-pointer shrink-0"
                    title="Decrease font size"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={20}
                    max={96}
                    step={2}
                    value={graphicsNarrativeFontSize || 60}
                    onChange={(e) => setGraphicsNarrativeFontSize(Number(e.target.value))}
                    className="flex-1 accent-[#2D6A4F] h-1.5 bg-[#FAF3E0] rounded-lg cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic?.("light");
                      setGraphicsNarrativeFontSize(Math.min(96, (graphicsNarrativeFontSize || 60) + 4));
                    }}
                    className="w-6 h-6 rounded-md bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border border-[#EADDC7] flex items-center justify-center text-xs font-bold active:scale-95 cursor-pointer shrink-0"
                    title="Increase font size"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 6. Full Active Window Narrative Pillbox Text Size */}
              <div className="space-y-1.5 pt-2 border-t border-[#EADDC7]/60">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Narrative Pillbox Text Size</span>
                  <span className="font-mono text-[9px] text-[#2D6A4F] font-bold uppercase">{graphicsNarrativePillFontSize || 12}pt</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { val: 9, label: "9pt" },
                    { val: 11, label: "11pt" },
                    { val: 12, label: "12pt (Def)" },
                    { val: 14, label: "14pt" },
                    { val: 16, label: "16pt" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setGraphicsNarrativePillFontSize(opt.val);
                      }}
                      className={`py-1 rounded-lg text-[8.5px] font-black tracking-wide transition-all cursor-pointer border ${
                        (graphicsNarrativePillFontSize || 12) === opt.val
                          ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs"
                          : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border-[#EADDC7]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Stepper & Range Slider for Pillbox Text Size */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic?.("light");
                      setGraphicsNarrativePillFontSize(Math.max(8, (graphicsNarrativePillFontSize || 12) - 1));
                    }}
                    className="w-6 h-6 rounded-md bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border border-[#EADDC7] flex items-center justify-center text-xs font-bold active:scale-95 cursor-pointer shrink-0"
                    title="Decrease pillbox font size"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={8}
                    max={22}
                    step={1}
                    value={graphicsNarrativePillFontSize || 12}
                    onChange={(e) => setGraphicsNarrativePillFontSize(Number(e.target.value))}
                    className="flex-1 accent-[#2D6A4F] h-1.5 bg-[#FAF3E0] rounded-lg cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic?.("light");
                      setGraphicsNarrativePillFontSize(Math.min(22, (graphicsNarrativePillFontSize || 12) + 1));
                    }}
                    className="w-6 h-6 rounded-md bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#5C4D42] border border-[#EADDC7] flex items-center justify-center text-xs font-bold active:scale-95 cursor-pointer shrink-0"
                    title="Increase pillbox font size"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 7. Full Active Window AI Narrative Grammar Optimization */}
              <div className="pt-2 border-t border-[#EADDC7]/60 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[#2D6A4F]" />
                    <span className="font-bold text-[#5C4D42] text-[9.5px]">AI Narrative Grammar Adaptation</span>
                  </div>
                  <p className="text-[8.5px] text-[#7A664D] leading-tight">
                    Uses Gemini to read active narrative and dynamically adapt non-variable prepositions, verbs, and conjunctions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic?.("light");
                    setGraphicsNarrativeAiGrammar(!graphicsNarrativeAiGrammar);
                  }}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    graphicsNarrativeAiGrammar ? "bg-[#2D6A4F]" : "bg-[#C4B4A0]"
                  }`}
                  title="Toggle AI Narrative Grammar Optimization"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      graphicsNarrativeAiGrammar ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Countdown Mode Fluorescent Glow & Pulse Customization */}
            <div className="p-3 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-[#10b981]" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-[#3D312A]">
                    Countdown Fluorescent Glow
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic?.("light");
                    setCountdownGlowBrightness(100);
                    setCountdownGlowColor("#10b981");
                  }}
                  className="text-[9px] font-bold text-[#A25F37] hover:underline cursor-pointer"
                  title="Reset to default fluorescent emerald 100%"
                >
                  Reset Default
                </button>
              </div>

              {/* Live Pulsing Glow Preview */}
              <div className="p-2.5 rounded-xl bg-[#1C3B2B] text-white flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-black/40 text-emerald-300">
                    <Clock size={13} />
                  </div>
                  <div>
                    <p className="text-[9.5px] font-bold leading-none">Pulsing Task Preview</p>
                    <p className="text-[7.5px] text-white/60 mt-0.5">Active countdown task card</p>
                  </div>
                </div>
                <div 
                  className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider faint-pulsing-glow bg-black/40"
                  style={{ color: countdownGlowColor }}
                >
                  Running
                </div>
              </div>

              {/* 1. Glow Brightness Slider & Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42] flex items-center gap-1">
                    <Sun size={10} className="text-amber-500" />
                    Glow Brightness & Pulse Intensity
                  </span>
                  <span className="font-mono text-[9.5px] font-black text-[#2D6A4F]">{countdownGlowBrightness}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={countdownGlowBrightness}
                  onChange={(e) => {
                    setCountdownGlowBrightness(parseInt(e.target.value, 10));
                  }}
                  className="w-full h-1.5 bg-[#EADDC7] rounded-lg appearance-none cursor-pointer accent-[#2D6A4F]"
                />
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: "50%", val: 50 },
                    { label: "100%", val: 100 },
                    { label: "150%", val: 150 },
                    { label: "200%", val: 200 }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setCountdownGlowBrightness(p.val);
                      }}
                      className={`py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer ${
                        countdownGlowBrightness === p.val
                          ? "bg-[#2D6A4F] text-white"
                          : "bg-[#EADDC7]/60 text-[#5C4D42] hover:bg-[#EADDC7]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Fluorescent Color Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="font-bold text-[#5C4D42]">Fluorescent Glow Color</span>
                  <span className="font-mono text-[9px] text-[#8C7A6B]">{countdownGlowColor}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: "#10b981", name: "Neon Emerald" },
                    { color: "#06b6d4", name: "Fluorescent Cyan" },
                    { color: "#f59e0b", name: "Electric Amber" },
                    { color: "#ec4899", name: "Laser Pink" },
                    { color: "#8b5cf6", name: "Violet Ray" },
                    { color: "#84cc16", name: "Radioactive Lime" },
                    { color: "#3b82f6", name: "Cobalt Pulse" },
                    { color: "#ffffff", name: "Pure White Glow" }
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => {
                        triggerHaptic?.("light");
                        setCountdownGlowColor(item.color);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        countdownGlowColor.toLowerCase() === item.color.toLowerCase()
                          ? "border-[#2D6A4F] scale-110 shadow-sm ring-2 ring-[#2D6A4F]/40"
                          : "border-black/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={`${item.name} (${item.color})`}
                    />
                  ))}
                  <label 
                    className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-lg border border-black/20 bg-white overflow-hidden shadow-xs hover:scale-105"
                    title="Choose custom fluorescent color"
                  >
                    <input
                      type="color"
                      value={countdownGlowColor}
                      onChange={(e) => setCountdownGlowColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-[#5C4D42]">+</span>
                  </label>
                </div>
                <p className="text-[8.5px] text-[#8C7A6B] italic">
                  Adjusts the fluorescent glow and pulsing aura around tasks in countdown mode.
                </p>
              </div>
            </div>

            {/* Row of Utility Buttons: Undo, Theme, Admin, Settings */}
            <div className="grid grid-cols-2 gap-2">
              {/* Undo Button */}
              {onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    if (canUndo) {
                      triggerHaptic("medium");
                      onUndo();
                    }
                  }}
                  disabled={!canUndo}
                  className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                    canUndo
                      ? "bg-[#FAF3E0] border-[#EADDC7] text-[#3D312A] hover:bg-[#EADDC7] cursor-pointer"
                      : "bg-[#FAF3E0]/40 border-[#EADDC7]/40 text-[#8C7A6B]/50 cursor-not-allowed"
                  }`}
                  title="Undo last action (Ctrl+Z)"
                >
                  <RotateCcw size={13} />
                  <span className="text-[10px] font-black uppercase">Undo</span>
                </button>
              )}

              {/* Theme Toggle */}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onToggleTheme();
                  }}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs font-bold"
                  title="Toggle Light / Dark mode"
                >
                  {isDark ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} className="text-indigo-600" />}
                  <span className="text-[10px] font-black uppercase">{isDark ? "Light Mode" : "Dark Mode"}</span>
                </button>
              )}

              {/* TaskPass Points / Favors */}
              {onOpenTaskPass && taskpassEnabled && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenTaskPass)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs font-bold"
                >
                  <ShoppingBag size={13} className="text-amber-600" />
                  <span className="text-[10px] font-black uppercase">{favorPoints} Favors</span>
                </button>
              )}

              {/* Admin Portal */}
              {onOpenAdminPortal && taskpassEnabled && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenAdminPortal)}
                  className="p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs font-bold"
                >
                  <ShieldCheck size={13} className="text-indigo-600" />
                  <span className="text-[10px] font-black uppercase">Admin</span>
                </button>
              )}
            </div>

            {/* Full Settings Modal Button */}
            <button
              type="button"
              onClick={() => handleActionClick(onOpenSettings)}
              className="w-full p-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <Settings size={14} />
              <span className="text-xs font-black uppercase tracking-wider">All Workspace Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
