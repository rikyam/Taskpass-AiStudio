import React, { useState } from "react";
import { formatDate } from "../utils/timeHelpers";
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
  Activity
} from "lucide-react";

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
  favorPoints = 0,
  onOpenTaskPass,
}) => {
  const [activeSection, setActiveSection] = useState<string>("all");

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
