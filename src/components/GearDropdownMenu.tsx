import React, { useState, memo } from "react";
import {
  ChevronLeft, ChevronRight, Zap, Terminal, Sparkles, SlidersHorizontal,
  FolderClosed, Cloud, CheckSquare, Settings2, Users, ListOrdered, Plus,
  Layers, Coins, Database, Check, ExternalLink, ShieldCheck, RefreshCw,
  LogOut, LogIn, Lock, Globe, Eye, EyeOff, Layout, Clock, Palette, HardDrive, Bell,
  Sun, Moon, Magnet
} from "lucide-react";
import { DeveloperHub } from "./DeveloperHub";
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from "firebase/auth";
import { useAppStore } from "../store";

export interface GearDropdownMenuProps {
  isDark: boolean;
  onClose: () => void;
  triggerHaptic: (intensity?: "light" | "medium" | "heavy") => void;
  currentUser: FirebaseUser | null;
  auth: Auth | null;
  isGcalSyncActive: boolean;
  setIsGcalSyncActive: (val: boolean) => void;
  isGcalLoading: boolean;
  onPullGcal: () => void;
  onPushAllTasksToGcal: () => void;
  cardDensity: "standard" | "simplified" | "very_simplified" | "report";
  setCardDensity: (val: "standard" | "simplified" | "very_simplified" | "report") => void;
  fontSizeScale: "normal" | "readable" | "large" | string;
  setFontSizeScale: (val: "normal" | "readable" | "large") => void;
  focusCardDetailMode: "detailed" | "simple";
  setFocusCardDetailMode: (val: "detailed" | "simple") => void;
  showCompletedTasks: boolean;
  setShowCompletedTasks: (val: boolean) => void;
  defaultWeatherLocation: string;
  setDefaultWeatherLocation: (val: string) => void;
  isToastEnabled: boolean;
  setIsToastEnabled: (val: boolean) => void;
  taskpassEnabled: boolean;
  setTaskpassEnabled: (val: boolean) => void;
  aiPlansEnabled: boolean;
  setAiPlansEnabled: (val: boolean) => void;
  aiSubtasksEnabled: boolean;
  setAiSubtasksEnabled: (val: boolean) => void;
  tasksPanelEnabled: boolean;
  setTasksPanelEnabled: (val: boolean) => void;
  focusPanelEnabled: boolean;
  setFocusPanelEnabled: (val: boolean) => void;
  timelinePanelEnabled: boolean;
  setTimelinePanelEnabled: (val: boolean) => void;
  notesRepoEnabled: boolean;
  setNotesRepoEnabled: (val: boolean) => void;
  collaboratorsEnabled: boolean;
  setCollaboratorsEnabled: (val: boolean) => void;
  sequencesEnabled: boolean;
  setSequencesEnabled: (val: boolean) => void;
  sequenceGroupHeadersEnabled: boolean;
  setSequenceGroupHeadersEnabled: (val: boolean) => void;
  bulkAddTasksEnabled: boolean;
  setBulkAddTasksEnabled: (val: boolean) => void;
  bulkOpsEnabled: boolean;
  setBulkOpsEnabled: (val: boolean) => void;
  expensesEnabled: boolean;
  setExpensesEnabled: (val: boolean) => void;
  workspaceDataEnabled: boolean;
  setWorkspaceDataEnabled: (val: boolean) => void;
  notebookLmEnabled: boolean;
  setNotebookLmEnabled: (val: boolean) => void;
  panelBgDayColor?: string;
  setPanelBgDayColor?: (val: string) => void;
  panelBgNightColor?: string;
  setPanelBgNightColor?: (val: string) => void;
  lockedSolidColorEnabled?: boolean;
  setLockedSolidColorEnabled?: (val: boolean) => void;
  lockedSolidBgColor?: string;
  setLockedSolidBgColor?: (val: string) => void;
  aiNarrativeEnabled?: boolean;
  setAiNarrativeEnabled?: (val: boolean) => void;
  saveSystemSettingsToCloud: (patch: Record<string, any>) => void;
  openSettingsModal: (tab?: string, expandedId?: string) => void;
  setShowAdminPortal: (val: boolean) => void;
  setDataWarehouseTab: (tab: any) => void;
  setShowDataWarehouse: (val: boolean) => void;
}

export const GearDropdownMenu = memo(function GearDropdownMenu({
  isDark,
  onClose,
  triggerHaptic,
  currentUser,
  auth,
  isGcalSyncActive,
  setIsGcalSyncActive,
  isGcalLoading,
  onPullGcal,
  onPushAllTasksToGcal,
  cardDensity,
  setCardDensity,
  fontSizeScale,
  setFontSizeScale,
  focusCardDetailMode,
  setFocusCardDetailMode,
  showCompletedTasks,
  setShowCompletedTasks,
  defaultWeatherLocation,
  setDefaultWeatherLocation,
  isToastEnabled,
  setIsToastEnabled,
  taskpassEnabled,
  setTaskpassEnabled,
  aiPlansEnabled,
  setAiPlansEnabled,
  aiSubtasksEnabled,
  setAiSubtasksEnabled,
  tasksPanelEnabled,
  setTasksPanelEnabled,
  focusPanelEnabled,
  setFocusPanelEnabled,
  timelinePanelEnabled,
  setTimelinePanelEnabled,
  notesRepoEnabled,
  setNotesRepoEnabled,
  collaboratorsEnabled,
  setCollaboratorsEnabled,
  sequencesEnabled,
  setSequencesEnabled,
  sequenceGroupHeadersEnabled,
  setSequenceGroupHeadersEnabled,
  bulkAddTasksEnabled,
  setBulkAddTasksEnabled,
  bulkOpsEnabled,
  setBulkOpsEnabled,
  expensesEnabled,
  setExpensesEnabled,
  workspaceDataEnabled,
  setWorkspaceDataEnabled,
  notebookLmEnabled,
  setNotebookLmEnabled,
  panelBgDayColor = "#f8fafc",
  setPanelBgDayColor,
  panelBgNightColor = "#0f172a",
  setPanelBgNightColor,
  lockedSolidColorEnabled = false,
  setLockedSolidColorEnabled,
  lockedSolidBgColor = "#e11d48",
  setLockedSolidBgColor,
  aiNarrativeEnabled = true,
  setAiNarrativeEnabled,
  saveSystemSettingsToCloud,
  openSettingsModal,
  setShowAdminPortal,
  setDataWarehouseTab,
  setShowDataWarehouse
}: GearDropdownMenuProps) {
  const [currentSubmenu, setCurrentSubmenu] = useState<"main" | "features" | "dev">("main");
  const dragLongPressMs = useAppStore((state) => state.dragLongPressMs);
  const setDragLongPressMs = useAppStore((state) => state.setDragLongPressMs);
  const taskCardAnimationMs = useAppStore((state) => state.taskCardAnimationMs);
  const setTaskCardAnimationMs = useAppStore((state) => state.setTaskCardAnimationMs);
  const timelineIncrement = useAppStore((state) => state.timelineIncrement);
  const setTimelineIncrement = useAppStore((state) => state.setTimelineIncrement);
  const enableTimeStretch = useAppStore((state) => state.enableTimeStretch);
  const setEnableTimeStretch = useAppStore((state) => state.setEnableTimeStretch);

  // Helper toggle row component
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
      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
        isDark
          ? "bg-slate-900/40 border-white/5 hover:bg-slate-900/80"
          : "bg-slate-50 hover:bg-slate-100 border-slate-200/80"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <Icon size={13} className={checked ? iconColor : "text-slate-400 shrink-0"} />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider truncate">{title}</div>
          {subtitle && <div className="text-[8.5px] text-slate-400 font-sans leading-tight truncate">{subtitle}</div>}
        </div>
      </div>
      <div
        className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
          checked ? "bg-indigo-600" : "bg-slate-400/40"
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

  return (
    <>
      {/* Overlay Backdrop to close on click outside */}
      <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />

      {/* Main Gear Dropdown Container */}
      <div
        id="gear-pull-down-menu"
        onClick={(e) => e.stopPropagation()}
        className={`absolute right-0 top-full mt-2 w-80 sm:w-84 rounded-2xl border p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left max-h-[min(540px,85vh)] overflow-y-auto scrollbar-thin ${
          isDark
            ? "bg-slate-950/98 backdrop-blur-xl border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
            : "bg-white/98 backdrop-blur-xl border-slate-200 text-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
        }`}
      >
        {/* SUBMENU 1: DEV & API HUB */}
        {currentSubmenu === "dev" ? (
          <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentSubmenu("main");
                  triggerHaptic("light");
                }}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title="Go back to Workspace Settings"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Dev & API Hub</h4>
                <p className="text-[9px] text-slate-400 font-bold">ReactNative integration & specs.</p>
              </div>
            </div>
            <div className="max-h-[380px] overflow-y-auto rounded-xl">
              <DeveloperHub darkMode={isDark} />
            </div>
          </div>
        ) : currentSubmenu === "features" ? (
          /* SUBMENU 2: FEATURE TOGGLES ORGANIZED BY FAMILY GROUPS */
          <div className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentSubmenu("main");
                  triggerHaptic("light");
                }}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title="Go back to Workspace Settings"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Feature Modules</h4>
                <p className="text-[9px] text-slate-400 font-bold font-sans">Turn workspace components on/off.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-1">
              {/* Family Group 1: AI & Automation */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 text-[9px] font-black uppercase tracking-wider text-indigo-400">
                  <Sparkles size={11} />
                  <span>AI & Smart Automation</span>
                </div>
                <div className="space-y-1.5">
                  <ToggleRow
                    icon={Sparkles}
                    iconColor="text-indigo-400"
                    title="AI Generated Plans"
                    subtitle="Auto-generate structured recovery plans"
                    checked={aiPlansEnabled}
                    onChange={() => {
                      const next = !aiPlansEnabled;
                      setAiPlansEnabled(next);
                      localStorage.setItem("ai_plans_enabled", next.toString());
                      saveSystemSettingsToCloud({ aiPlansEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Sparkles}
                    iconColor="text-indigo-400"
                    title="AI Subtasks Generator"
                    subtitle="One-click step breakdown on tasks"
                    checked={aiSubtasksEnabled}
                    onChange={() => {
                      const next = !aiSubtasksEnabled;
                      setAiSubtasksEnabled(next);
                      localStorage.setItem("ai_subtasks_enabled", next.toString());
                      saveSystemSettingsToCloud({ aiSubtasksEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Sparkles}
                    iconColor="text-purple-400"
                    title="Notebook LM Connect"
                    subtitle="Contextual intelligence bridge"
                    checked={notebookLmEnabled}
                    onChange={() => {
                      const next = !notebookLmEnabled;
                      setNotebookLmEnabled(next);
                      localStorage.setItem("notebooklm_enabled", next.toString());
                      saveSystemSettingsToCloud({ notebookLmEnabled: next });
                    }}
                  />
                  {setAiNarrativeEnabled && (
                    <ToggleRow
                      icon={Sparkles}
                      iconColor="text-purple-400"
                      title="AI Narrative Function"
                      subtitle="Narrative banner & audio on focus cards"
                      checked={aiNarrativeEnabled}
                      onChange={() => {
                        const next = !aiNarrativeEnabled;
                        setAiNarrativeEnabled(next);
                        localStorage.setItem("taskpass_ai_narrative_enabled", JSON.stringify(next));
                        saveSystemSettingsToCloud({ aiNarrativeEnabled: next });
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Family Group 2: Workspace Panels & Views */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 px-1 text-[9px] font-black uppercase tracking-wider text-sky-400">
                  <Layout size={11} />
                  <span>Panels & Views</span>
                </div>
                <div className="space-y-1.5">
                  <ToggleRow
                    icon={CheckSquare}
                    iconColor="text-sky-400"
                    title="Tasks Panel"
                    subtitle="Main task list card view"
                    checked={tasksPanelEnabled}
                    onChange={() => {
                      const next = !tasksPanelEnabled;
                      setTasksPanelEnabled(next);
                      localStorage.setItem("tasks_panel_enabled", next.toString());
                      saveSystemSettingsToCloud({ tasksPanelEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Clock}
                    iconColor="text-sky-400"
                    title="Focus Panel"
                    subtitle="Deep single-task execution zone"
                    checked={focusPanelEnabled}
                    onChange={() => {
                      const next = !focusPanelEnabled;
                      setFocusPanelEnabled(next);
                      localStorage.setItem("focus_panel_enabled", next.toString());
                      saveSystemSettingsToCloud({ focusPanelEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Clock}
                    iconColor="text-sky-400"
                    title="Timeline Panel"
                    subtitle="Dynamic hourly timeline schedule"
                    checked={timelinePanelEnabled}
                    onChange={() => {
                      const next = !timelinePanelEnabled;
                      setTimelinePanelEnabled(next);
                      localStorage.setItem("timeline_panel_enabled", next.toString());
                      saveSystemSettingsToCloud({ timelinePanelEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={SlidersHorizontal}
                    iconColor="text-indigo-400"
                    title="Stretch Start & End Time"
                    subtitle="Drag top & bottom edges to stretch card times"
                    checked={enableTimeStretch}
                    onChange={() => {
                      setEnableTimeStretch(!enableTimeStretch);
                    }}
                  />
                  <ToggleRow
                    icon={FolderClosed}
                    iconColor="text-amber-400"
                    title="Notes Repository"
                    subtitle="Workspace notebook and documentation"
                    checked={notesRepoEnabled}
                    onChange={() => {
                      const next = !notesRepoEnabled;
                      setNotesRepoEnabled(next);
                      localStorage.setItem("notes_repo_enabled", next.toString());
                      saveSystemSettingsToCloud({ notesRepoEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Database}
                    iconColor="text-emerald-400"
                    title="Workspace Data Menu"
                    subtitle="Data warehouse & analytics access"
                    checked={workspaceDataEnabled}
                    onChange={() => {
                      const next = !workspaceDataEnabled;
                      setWorkspaceDataEnabled(next);
                      localStorage.setItem("workspace_data_enabled", next.toString());
                      saveSystemSettingsToCloud({ workspaceDataEnabled: next });
                    }}
                  />
                </div>
              </div>

              {/* Family Group 3: Productivity & Workflows */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 px-1 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                  <Zap size={11} />
                  <span>Productivity & Workflows</span>
                </div>
                <div className="space-y-1.5">
                  <ToggleRow
                    icon={Zap}
                    iconColor="text-amber-400"
                    title="TaskPass Function"
                    subtitle="Handoffs & token delegation"
                    checked={taskpassEnabled}
                    onChange={() => {
                      const next = !taskpassEnabled;
                      setTaskpassEnabled(next);
                      localStorage.setItem("taskpass_enabled", next.toString());
                      saveSystemSettingsToCloud({ taskpassEnabled: next });
                      if (!next) setShowAdminPortal(false);
                    }}
                  />
                  <ToggleRow
                    icon={Users}
                    iconColor="text-teal-400"
                    title="Collaborators"
                    subtitle="Team members and shared items"
                    checked={collaboratorsEnabled}
                    onChange={() => {
                      const next = !collaboratorsEnabled;
                      setCollaboratorsEnabled(next);
                      localStorage.setItem("collaborators_enabled", next.toString());
                      saveSystemSettingsToCloud({ collaboratorsEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={ListOrdered}
                    iconColor="text-purple-400"
                    title="Sequences"
                    subtitle="Sequential chains and routines"
                    checked={sequencesEnabled}
                    onChange={() => {
                      const next = !sequencesEnabled;
                      setSequencesEnabled(next);
                      localStorage.setItem("sequences_enabled", next.toString());
                      saveSystemSettingsToCloud({ sequencesEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Layers}
                    iconColor="text-indigo-400"
                    title="Sequence Group Headers"
                    subtitle="Show header bar & controls above sequences"
                    checked={sequenceGroupHeadersEnabled}
                    onChange={() => {
                      const next = !sequenceGroupHeadersEnabled;
                      setSequenceGroupHeadersEnabled(next);
                      localStorage.setItem("sequence_group_headers_enabled", next.toString());
                      saveSystemSettingsToCloud({ sequenceGroupHeadersEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Plus}
                    iconColor="text-indigo-400"
                    title="Bulk Add Tasks"
                    subtitle="Quick batch task input modal"
                    checked={bulkAddTasksEnabled}
                    onChange={() => {
                      const next = !bulkAddTasksEnabled;
                      setBulkAddTasksEnabled(next);
                      localStorage.setItem("bulk_add_tasks_enabled", next.toString());
                      saveSystemSettingsToCloud({ bulkAddTasksEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Layers}
                    iconColor="text-indigo-400"
                    title="Bulk Ops Menu"
                    subtitle="Batch edit, complete, and move"
                    checked={bulkOpsEnabled}
                    onChange={() => {
                      const next = !bulkOpsEnabled;
                      setBulkOpsEnabled(next);
                      localStorage.setItem("bulk_ops_enabled", next.toString());
                      saveSystemSettingsToCloud({ bulkOpsEnabled: next });
                    }}
                  />
                  <ToggleRow
                    icon={Coins}
                    iconColor="text-emerald-400"
                    title="Expenses Module"
                    subtitle="Budgeting and expenditure tracking"
                    checked={expensesEnabled}
                    onChange={() => {
                      const next = !expensesEnabled;
                      setExpensesEnabled(next);
                      localStorage.setItem("expenses_enabled", next.toString());
                      saveSystemSettingsToCloud({ expensesEnabled: next });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN MENU: ORGANIZED WITH FAMILY GROUP HEADERS */
          <div className="flex flex-col gap-4">
            {/* Top Workspace Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <Settings2 size={15} className="text-indigo-400" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-100">
                  Workspace Settings
                </h4>
              </div>
              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentUser ? "Cloud Synced" : "Local Mode"}
              </span>
            </div>

            {/* FAMILY GROUP 1: CLOUD & CALENDAR SYNC */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1 text-[9.5px] font-black uppercase tracking-wider text-indigo-400">
                <Cloud size={12} />
                <span>Cloud & Synchronization</span>
              </div>

              {/* Account Status Card */}
              <div
                className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                  isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        className="w-5 h-5 rounded-full object-cover border border-indigo-400/40"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-[9px] font-black text-indigo-300">
                        {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[10px] font-black truncate">
                        {currentUser ? currentUser.displayName || currentUser.email : "Offline Profile"}
                      </div>
                      <div className="text-[8px] text-slate-400 truncate">
                        {currentUser ? currentUser.email : "Local browser storage"}
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
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                      title="Sign Out"
                    >
                      <LogOut size={12} />
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
                      className="px-2 py-1 rounded-lg text-[9px] font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-all"
                    >
                      <LogIn size={10} />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>

                {/* Google Calendar 2-Way Sync Controls */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span>Google Calendar Sync:</span>
                    <span className={isGcalSyncActive ? "text-emerald-400 font-bold" : "text-slate-500"}>
                      {isGcalSyncActive ? "2-Way Live" : "Off"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsGcalSyncActive(!isGcalSyncActive);
                        triggerHaptic("medium");
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isGcalSyncActive
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800/50 text-slate-400 border-white/5 hover:text-white"
                      }`}
                    >
                      <RefreshCw size={10} className={isGcalSyncActive ? "animate-spin" : ""} />
                      <span>{isGcalSyncActive ? "Pause Sync" : "2-Way Sync"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onPullGcal();
                        triggerHaptic("light");
                      }}
                      disabled={isGcalLoading}
                      className="px-2 py-1.5 rounded-lg text-[8.5px] font-black bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/50 transition-all disabled:opacity-50"
                      title="Pull latest events from Google Calendar"
                    >
                      {isGcalLoading ? "Pulling..." : "Pull"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onPushAllTasksToGcal();
                        triggerHaptic("light");
                      }}
                      disabled={isGcalLoading}
                      className="px-2 py-1.5 rounded-lg text-[8.5px] font-black bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/50 transition-all disabled:opacity-50"
                      title="Push timeline tasks to Google Calendar"
                    >
                      {isGcalLoading ? "Pushing..." : "Push"}
                    </button>
                  </div>
                </div>

                {/* Submenu link to Cloud Settings */}
                <button
                  type="button"
                  onClick={() => {
                    openSettingsModal("auth");
                    onClose();
                  }}
                  className="w-full pt-1.5 text-[8.5px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Open Full Cloud & Sync Settings...</span>
                  <ExternalLink size={9} />
                </button>
              </div>
            </div>

            {/* FAMILY GROUP 2: DISPLAY & LAYOUT */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5 px-1 text-[9.5px] font-black uppercase tracking-wider text-sky-400">
                <Palette size={12} />
                <span>Display & Layout</span>
              </div>

              {/* Card Density */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-400">Card Density:</span>
                <div className="flex p-0.5 rounded-xl bg-slate-900 border border-white/5">
                  {(["standard", "simplified", "report"] as const).map((density) => (
                    <button
                      key={density}
                      type="button"
                      onClick={() => {
                        setCardDensity(density);
                        localStorage.setItem("card_density", density);
                        triggerHaptic("light");
                      }}
                      className={`px-2 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        cardDensity === density
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Size Scale */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-400">Text Size:</span>
                <div className="flex p-0.5 rounded-xl bg-slate-900 border border-white/5">
                  {(["normal", "readable", "large"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setFontSizeScale(option);
                        localStorage.setItem("font_size_scale", option);
                        triggerHaptic("light");
                      }}
                      className={`px-2 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        fontSizeScale === option
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {option === "normal" ? "Normal" : option === "readable" ? "+10%" : "+20%"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stretch Start & End Time Toggle */}
              <ToggleRow
                icon={SlidersHorizontal}
                iconColor="text-indigo-400"
                title="Stretch Start & End Time"
                subtitle="Drag top & bottom card edges on timeline"
                checked={enableTimeStretch}
                onChange={() => {
                  setEnableTimeStretch(!enableTimeStretch);
                }}
              />

              {/* Drag & Drop Long-Press Delay */}
              <div className={`p-2.5 rounded-xl border ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200/80"} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-300">Drag Long-Press:</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shadow-xs">
                    {dragLongPressMs} ms
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(50, dragLongPressMs - 50);
                      setDragLongPressMs(next);
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px] border border-white/5 transition-all cursor-pointer text-center active:scale-95 shadow-xs"
                    title="Decrease long press delay by 50ms"
                  >
                    - 50 ms
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(1500, dragLongPressMs + 50);
                      setDragLongPressMs(next);
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px] border border-white/5 transition-all cursor-pointer text-center active:scale-95 shadow-xs"
                    title="Increase long press delay by 50ms"
                  >
                    + 50 ms
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[250, 350, 400, 500].map((msVal) => (
                    <button
                      key={msVal}
                      type="button"
                      onClick={() => {
                        setDragLongPressMs(msVal);
                        triggerHaptic("light");
                      }}
                      className={`py-0.5 text-[8px] font-mono font-bold rounded transition-all cursor-pointer border ${
                        dragLongPressMs === msVal
                          ? "bg-amber-500 text-white border-amber-400 shadow-sm"
                          : "bg-slate-900/60 text-slate-400 hover:text-white border-white/5"
                      }`}
                    >
                      {msVal}ms{msVal === 400 ? " *" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Cards Slide Animation Speed Sliding Value Bar */}
              <div className={`p-2.5 rounded-xl border ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200/80"} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal size={12} className="text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-300">Timeline Slide Speed:</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md shadow-xs">
                    {taskCardAnimationMs} ms
                  </span>
                </div>
                
                {/* Interactive Slider Bar */}
                <div className="flex items-center gap-2 px-0.5">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight shrink-0">Fast</span>
                  <input
                    type="range"
                    min={100}
                    max={2000}
                    step={50}
                    value={taskCardAnimationMs}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTaskCardAnimationMs(val);
                      triggerHaptic("light");
                    }}
                    className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    title="Slide to adjust timeline card movement animation speed"
                  />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight shrink-0">Slow</span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: "Fast", ms: 200 },
                    { label: "Normal", ms: 400 },
                    { label: "Smooth", ms: 600 },
                    { label: "Slow", ms: 1200 },
                  ].map((preset) => (
                    <button
                      key={preset.ms}
                      type="button"
                      onClick={() => {
                        setTaskCardAnimationMs(preset.ms);
                        triggerHaptic("medium");
                      }}
                      className={`py-0.5 text-[8px] font-mono font-bold rounded transition-all cursor-pointer border ${
                        taskCardAnimationMs === preset.ms
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                          : "bg-slate-900/60 text-slate-400 hover:text-white border-white/5"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flexible Tasks Snap Increment Setting */}
              <div className={`p-2.5 rounded-xl border ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200/80"} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Magnet size={12} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-300">Snap Flexible Tasks:</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shadow-xs">
                    {timelineIncrement} min
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 leading-tight">
                  Snaps flexible tasks to the nearest interval without overlap.
                </div>
                {/* 5, 10, 15, 30 min buttons */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[5, 10, 15, 30].map((incVal) => (
                    <button
                      key={incVal}
                      type="button"
                      onClick={() => {
                        setTimelineIncrement(incVal);
                        saveSystemSettingsToCloud({ timelineIncrement: incVal });
                        triggerHaptic("medium");
                      }}
                      className={`py-1 text-[9px] font-mono font-bold rounded transition-all cursor-pointer border flex flex-col items-center justify-center ${
                        timelineIncrement === incVal
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black"
                          : "bg-slate-900/60 text-slate-400 hover:text-white border-white/5"
                      }`}
                      title={`Snap flexible tasks strictly to ${incVal} minute grid increments`}
                    >
                      <span>{incVal}m</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Mode Toggle */}
              <ToggleRow
                icon={Eye}
                iconColor="text-sky-400"
                title="Detailed Focus Mode"
                subtitle="Rich breakdown cards in focus view"
                checked={focusCardDetailMode === "detailed"}
                onChange={() => {
                  const next = focusCardDetailMode === "detailed" ? "simple" : "detailed";
                  setFocusCardDetailMode(next);
                  localStorage.setItem("focus_card_detail_mode", next);
                  saveSystemSettingsToCloud({ focusCardDetailMode: next });
                }}
              />

              {/* Show Completed Toggle */}
              <ToggleRow
                icon={CheckSquare}
                iconColor="text-emerald-400"
                title="Show Completed Tasks"
                subtitle="Keep finished tasks visible"
                checked={showCompletedTasks}
                onChange={() => {
                  const next = !showCompletedTasks;
                  setShowCompletedTasks(next);
                  localStorage.setItem("show_completed_tasks", next.toString());
                  saveSystemSettingsToCloud({ showCompletedTasks: next });
                }}
              />

              {/* Sequence Group Headers Toggle */}
              <ToggleRow
                icon={Layers}
                iconColor="text-indigo-400"
                title="Sequence Group Headers"
                subtitle="Header bar & batch controls above sequence blocks"
                checked={sequenceGroupHeadersEnabled}
                onChange={() => {
                  const next = !sequenceGroupHeadersEnabled;
                  setSequenceGroupHeadersEnabled(next);
                  localStorage.setItem("sequence_group_headers_enabled", next.toString());
                  saveSystemSettingsToCloud({ sequenceGroupHeadersEnabled: next });
                }}
              />

              {/* AI Narrative (Focus Cards) Toggle */}
              {setAiNarrativeEnabled && (
                <ToggleRow
                  icon={Sparkles}
                  iconColor="text-purple-400"
                  title="AI Narrative (Focus Cards)"
                  subtitle="Turn on/off narrative banner on focus cards"
                  checked={aiNarrativeEnabled}
                  onChange={() => {
                    const next = !aiNarrativeEnabled;
                    setAiNarrativeEnabled(next);
                    localStorage.setItem("taskpass_ai_narrative_enabled", JSON.stringify(next));
                    saveSystemSettingsToCloud({ aiNarrativeEnabled: next });
                  }}
                />
              )}

              {/* Quick Panel Background Color Settings */}
              <div className={`p-2 rounded-xl border ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"} space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Palette size={12} className="text-indigo-400" />
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-300">
                      Panel Background Colors
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      openSettingsModal("display", "visual_theme");
                      onClose();
                    }}
                    className="text-[8px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-tight cursor-pointer"
                  >
                    Customize
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {/* Day Panel BG */}
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-1">
                      <Sun size={11} className="text-amber-400" />
                      <span className="text-[8.5px] font-bold text-slate-400">Day:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner shrink-0" style={{ backgroundColor: panelBgDayColor }} />
                      <input
                        type="color"
                        value={panelBgDayColor.startsWith("#") ? panelBgDayColor : "#f8fafc"}
                        onChange={(e) => {
                          if (setPanelBgDayColor) {
                            setPanelBgDayColor(e.target.value);
                            triggerHaptic("light");
                          }
                        }}
                        className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                        title="Day Mode Panel Background Color"
                      />
                    </div>
                  </div>

                  {/* Night Panel BG */}
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-1">
                      <Moon size={11} className="text-indigo-400" />
                      <span className="text-[8.5px] font-bold text-slate-400">Night:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner shrink-0" style={{ backgroundColor: panelBgNightColor }} />
                      <input
                        type="color"
                        value={panelBgNightColor.startsWith("#") ? panelBgNightColor : "#0f172a"}
                        onChange={(e) => {
                          if (setPanelBgNightColor) {
                            setPanelBgNightColor(e.target.value);
                            triggerHaptic("light");
                          }
                        }}
                        className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                        title="Night Mode Panel Background Color"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Solid Locked Card Background */}
              <div className={`p-2 rounded-xl border ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"} space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={lockedSolidColorEnabled}
                      onChange={(e) => {
                        if (setLockedSolidColorEnabled) {
                          setLockedSolidColorEnabled(e.target.checked);
                          triggerHaptic("medium");
                        }
                      }}
                      className="rounded accent-rose-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <Lock size={11} className="text-rose-400" />
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-300">
                        Solid Color Locked Cards
                      </span>
                    </div>
                  </label>
                  {lockedSolidColorEnabled && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner shrink-0" style={{ backgroundColor: lockedSolidBgColor }} />
                      <input
                        type="color"
                        value={lockedSolidBgColor.startsWith("#") ? lockedSolidBgColor : "#e11d48"}
                        onChange={(e) => {
                          if (setLockedSolidBgColor) {
                            setLockedSolidBgColor(e.target.value);
                            triggerHaptic("light");
                          }
                        }}
                        className="w-4 h-4 rounded cursor-pointer bg-transparent border-none p-0"
                        title="Locked Card Solid Background Color"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submenu Link to Display Drawer */}
              <button
                type="button"
                onClick={() => {
                  openSettingsModal("display");
                  onClose();
                }}
                className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                  isDark
                    ? "bg-slate-900/30 border-white/5 text-slate-200 hover:bg-slate-900/60"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Palette size={12} className="text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider">
                    Themes, Colors & Glass Cards...
                  </span>
                </div>
                <ChevronRight size={11} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* FAMILY GROUP 3: FEATURES & MODULES */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5 px-1 text-[9.5px] font-black uppercase tracking-wider text-emerald-400">
                <Zap size={12} />
                <span>Feature Modules & Vaults</span>
              </div>

              {/* Submenu Button: Feature Toggles */}
              <button
                type="button"
                onClick={() => {
                  setCurrentSubmenu("features");
                  triggerHaptic("medium");
                }}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                  isDark
                    ? "bg-indigo-950/30 border-indigo-500/20 text-indigo-200 hover:bg-indigo-900/40"
                    : "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={13} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider">Feature Toggles (14 Modules)</div>
                    <div className="text-[8px] text-slate-400 font-sans">Configure active tools & views</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* AI Science Plans Vault */}
              <button
                type="button"
                onClick={() => {
                  setDataWarehouseTab("plans");
                  setShowDataWarehouse(true);
                  onClose();
                  triggerHaptic("medium");
                }}
                className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                  isDark
                    ? "bg-slate-900/30 border-white/5 text-slate-200 hover:bg-slate-900/60"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider">AI Science Plans Vault</span>
                </div>
                <ChevronRight size={11} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Admin Portal (if taskpass enabled) */}
              {taskpassEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPortal(true);
                    onClose();
                    triggerHaptic("medium");
                  }}
                  className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                    isDark
                      ? "bg-amber-950/20 border-amber-500/20 text-amber-200 hover:bg-amber-900/30"
                      : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9.5px] font-black uppercase tracking-wider">Admin Portal Dashboard</span>
                  </div>
                  <ChevronRight size={11} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>

            {/* FAMILY GROUP 4: RULES & SCHEDULES */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5 px-1 text-[9.5px] font-black uppercase tracking-wider text-amber-400">
                <Clock size={12} />
                <span>Rules & Schedules</span>
              </div>

              {/* Default Location Input */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400">Default Weather Location:</span>
                <input
                  type="text"
                  value={defaultWeatherLocation}
                  placeholder="e.g. San Francisco, CA"
                  onChange={(e) => {
                    const next = e.target.value;
                    setDefaultWeatherLocation(next);
                    localStorage.setItem("taskpass_default_weather_location", next);
                    saveSystemSettingsToCloud({ defaultWeatherLocation: next });
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-[10px] font-mono outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark
                      ? "bg-slate-900/60 border-white/10 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Toast Notifications Toggle */}
              <ToggleRow
                icon={Bell}
                iconColor="text-amber-400"
                title="Toast Notifications"
                subtitle="Popups for timeline events"
                checked={isToastEnabled}
                onChange={() => {
                  const next = !isToastEnabled;
                  setIsToastEnabled(next);
                  localStorage.setItem("toast_notifications_enabled", next.toString());
                  saveSystemSettingsToCloud({ toastNotificationsEnabled: next });
                }}
              />

              {/* Submenu Link to Rules Drawer */}
              <button
                type="button"
                onClick={() => {
                  openSettingsModal("time");
                  onClose();
                }}
                className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                  isDark
                    ? "bg-slate-900/30 border-white/5 text-slate-200 hover:bg-slate-900/60"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider">
                    Time Rules & Hour Controls...
                  </span>
                </div>
                <ChevronRight size={11} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* FAMILY GROUP 5: DATA, BACKUPS & DEVELOPER */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5 px-1 text-[9.5px] font-black uppercase tracking-wider text-purple-400">
                <HardDrive size={12} />
                <span>Data, Backups & Developer</span>
              </div>

              {/* Manual Backups Launcher */}
              <button
                type="button"
                onClick={() => {
                  openSettingsModal("backups");
                  onClose();
                }}
                className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                  isDark
                    ? "bg-slate-900/30 border-white/5 text-slate-200 hover:bg-slate-900/60"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <HardDrive size={12} className="text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider">Manual Backups & JSON Files...</span>
                </div>
                <ChevronRight size={11} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Dev & API Hub Submenu Launcher */}
              <button
                type="button"
                onClick={() => {
                  setCurrentSubmenu("dev");
                  triggerHaptic("medium");
                }}
                className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all group cursor-pointer ${
                  isDark
                    ? "bg-slate-900/30 border-white/5 text-slate-200 hover:bg-slate-900/60"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Terminal size={12} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider">Dev & API Hub...</span>
                </div>
                <ChevronRight size={11} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
});
