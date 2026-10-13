import React from "react";
import {
  RefreshCw,
  CalendarRange,
  CalendarPlus,
  Check,
  Shield,
  Lock,
  Layers,
  Clock,
  Palette,
  ExternalLink,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";
import { GcalSyncMode } from "../../types";
import { useAppStore } from "../../store";

export interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  gcalAccessToken: string | null;
  setGcalAccessToken: (token: string | null) => void;
  selectedDate: string;
  isGcalLoading: boolean;
  gcalSyncMode: GcalSyncMode;
  setGcalSyncMode: (mode: GcalSyncMode) => void;
  handlePullGcalEvents: () => void;
  handlePushLocalTasks: () => void;
  handleManualFullSync?: () => void;
  gcalStatusMsg: string | null;
  setGcalStatusMsg: (msg: string | null) => void;
  isGcalSyncActive: boolean;
  setIsGcalSyncActive: (active: boolean) => void;
  handleLinkGcal: () => void;
  complementaryCalendarUrl: string;
  setComplementaryCalendarUrl: (url: string) => void;
  saveSystemSettingsToCloud: (settings: any) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  flexibleTasksCount?: number;
  lastSyncTimestamp?: number | null;
}

const GCAL_ORIGIN_COLORS = [
  { name: "Google Blue", hex: "#2563EB" },
  { name: "Peacock Teal", hex: "#0284C7" },
  { name: "Emerald", hex: "#059669" },
  { name: "Forest", hex: "#166534" },
  { name: "Amber Gold", hex: "#D97706" },
  { name: "Tangerine", hex: "#EA580C" },
  { name: "Crimson", hex: "#DC2626" },
  { name: "Flamingo", hex: "#E11D48" },
  { name: "Amethyst", hex: "#7C3AED" },
  { name: "Charcoal Slate", hex: "#334155" },
];

const SHARED_CALENDAR_COLORS = [
  { name: "Royal Purple", hex: "#7C3AED" },
  { name: "Deep Indigo", hex: "#4F46E5" },
  { name: "Rose Crimson", hex: "#E11D48" },
  { name: "Sunset Orange", hex: "#EA580C" },
  { name: "Teal Turquoise", hex: "#0D9488" },
  { name: "Ocean Cyan", hex: "#0891B2" },
  { name: "Bronze Olive", hex: "#92400E" },
  { name: "Plum Berry", hex: "#831843" },
];

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  gcalAccessToken,
  setGcalAccessToken,
  selectedDate,
  isGcalLoading,
  gcalSyncMode = "sync_all",
  setGcalSyncMode,
  handlePullGcalEvents,
  handlePushLocalTasks,
  handleManualFullSync,
  gcalStatusMsg,
  setGcalStatusMsg,
  isGcalSyncActive,
  setIsGcalSyncActive,
  handleLinkGcal,
  complementaryCalendarUrl,
  setComplementaryCalendarUrl,
  saveSystemSettingsToCloud,
  triggerHaptic,
  flexibleTasksCount = 0,
  lastSyncTimestamp = null,
}) => {
  // Store values for custom card coloring
  const gcalUserOriginatedColorEnabled = useAppStore((state) => state.gcalUserOriginatedColorEnabled);
  const gcalUserOriginatedCardBg = useAppStore((state) => state.gcalUserOriginatedCardBg) || "#2563EB";
  const gcalSharedCalendarColorEnabled = useAppStore((state) => state.gcalSharedCalendarColorEnabled);
  const gcalSharedCalendarCardBg = useAppStore((state) => state.gcalSharedCalendarCardBg) || "#7C3AED";
  const setGcalUserOriginatedColorEnabled = useAppStore((state) => state.setGcalUserOriginatedColorEnabled);
  const setGcalUserOriginatedCardBg = useAppStore((state) => state.setGcalUserOriginatedCardBg);
  const setGcalSharedCalendarColorEnabled = useAppStore((state) => state.setGcalSharedCalendarColorEnabled);
  const setGcalSharedCalendarCardBg = useAppStore((state) => state.setGcalSharedCalendarCardBg);

  const syncModesConfig: { mode: GcalSyncMode; title: string; subtitle: string; icon: any; color: string; badge: string }[] = [
    {
      mode: "sync_all",
      title: "Sync All (Flexible + Fixed)",
      subtitle: "Bi-directional 5-minute synchronization. Flexible tasks retain their dynamic cascade in Taskpass while syncing to Google Calendar.",
      icon: Layers,
      color: "text-emerald-400 border-emerald-500/50 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      badge: "Recommended",
    },
    {
      mode: "fixed_only",
      title: "Sync Fixed Tasks Only",
      subtitle: "Synchronizes only fixed/locked appointments. Flexible tasks remain strictly local and internal to Taskpass.",
      icon: Lock,
      color: "text-blue-400 border-blue-500/50 bg-blue-500/15 shadow-[0_0_15px_rgba(59,130,246,0.2)]",
      badge: "Appointments Only",
    },
    {
      mode: "read_only",
      title: "Read Only (Import from Calendar)",
      subtitle: "Reads Google Calendar events into Taskpass. Never creates, modifies, or deletes events in your Google Calendar.",
      icon: Shield,
      color: "text-amber-400 border-amber-500/50 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
      badge: "Safe / No Push",
    },
  ];

  const formatLastSyncTime = () => {
    if (!lastSyncTimestamp) return "Not synced yet this session";
    const d = new Date(lastSyncTimestamp);
    return `Last synced at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
  };

  const getActiveModeConfig = () => {
    return syncModesConfig.find((c) => c.mode === gcalSyncMode) || syncModesConfig[0];
  };

  const currentMode = getActiveModeConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Calendar Synchronization Modes & Styling"
    >
      <div className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
        {/* Prominent Active Mode Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/25 border border-indigo-400/40 flex items-center justify-center shrink-0 text-indigo-300">
              <CalendarIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] font-black uppercase tracking-wider text-indigo-400">Current Sync Mode</span>
                <span className="px-2 py-0.2 rounded-full text-[8px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentMode.badge}
                </span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-wide text-white truncate mt-0.5">
                {currentMode.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {gcalAccessToken ? (
              <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Connected
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase bg-slate-500/15 text-slate-400 border border-white/10">
                Offline
              </span>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* SECTION 1: PROMINENT SYNCHRONIZATION MODES SELECTOR             */}
        {/* =============================================================== */}
        <div className="space-y-2 p-3.5 bg-slate-950/60 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <RefreshCw size={13} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                Choose Synchronization Mode
              </span>
            </div>
            <span className="text-[8.5px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              Instant Switch
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            Select how Taskpass coordinates schedules with your Google Calendar. You can switch modes at any time.
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {syncModesConfig.map((item) => {
              const isSelected = gcalSyncMode === item.mode;
              const Icon = item.icon;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setGcalSyncMode(item.mode);
                    localStorage.setItem("gcal_sync_mode", item.mode);
                    saveSystemSettingsToCloud({ gcalSyncMode: item.mode });
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative select-none ${
                    isSelected
                      ? `${item.color} ring-2 ring-white/30 scale-[1.01]`
                      : "bg-slate-900/40 border-white/5 hover:border-white/20 text-slate-300 hover:bg-slate-900/70"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${isSelected ? "bg-white/20" : "bg-white/5 text-slate-400"}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0 pr-7">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        {item.title}
                      </span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                      {item.subtitle}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-md">
                      <Check size={14} strokeWidth={3.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* =============================================================== */}
        {/* SECTION 2: TASK CARD COLOR CHOICES FOR CALENDAR TASKS            */}
        {/* =============================================================== */}
        <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Palette size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                Calendar Card Color Styling
              </span>
            </div>
            <span className="text-[8px] font-mono text-slate-400">Visual Differentiation</span>
          </div>

          {/* CHOICE 1: Tasks Originated by User in Google Calendar */}
          <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: gcalUserOriginatedColorEnabled ? gcalUserOriginatedCardBg : "#64748B" }}
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
                  Tasks Created Directly in Google Calendar
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  const next = !gcalUserOriginatedColorEnabled;
                  setGcalUserOriginatedColorEnabled(next);
                  saveSystemSettingsToCloud({ gcalUserOriginatedColorEnabled: next });
                }}
                className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  gcalUserOriginatedColorEnabled
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                {gcalUserOriginatedColorEnabled ? "Colored" : "Default"}
              </button>
            </div>

            <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed">
              Highlight cards for appointments and tasks originally created in your Google Calendar (not authored within Taskpass).
            </p>

            {gcalUserOriginatedColorEnabled && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Pick Background Color:</span>
                  <span className="font-mono">{gcalUserOriginatedCardBg}</span>
                </div>
                {/* Palette Grid */}
                <div className="grid grid-cols-5 gap-1.5">
                  {GCAL_ORIGIN_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setGcalUserOriginatedCardBg(c.hex);
                        saveSystemSettingsToCloud({ gcalUserOriginatedCardBg: c.hex });
                      }}
                      className={`h-7 rounded-lg transition-transform border cursor-pointer flex items-center justify-center relative ${
                        gcalUserOriginatedCardBg.toLowerCase() === c.hex.toLowerCase()
                          ? "ring-2 ring-white scale-105 border-white"
                          : "border-white/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {gcalUserOriginatedCardBg.toLowerCase() === c.hex.toLowerCase() && (
                        <Check size={12} strokeWidth={3.5} className="text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
                {/* Custom Hex input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[8.5px] text-slate-400 font-mono">Custom Hex:</span>
                  <input
                    type="color"
                    value={gcalUserOriginatedCardBg}
                    onChange={(e) => {
                      setGcalUserOriginatedCardBg(e.target.value);
                      saveSystemSettingsToCloud({ gcalUserOriginatedCardBg: e.target.value });
                    }}
                    className="w-7 h-7 rounded border border-white/20 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={gcalUserOriginatedCardBg}
                    onChange={(e) => {
                      setGcalUserOriginatedCardBg(e.target.value);
                      saveSystemSettingsToCloud({ gcalUserOriginatedCardBg: e.target.value });
                    }}
                    placeholder="#2563EB"
                    className="w-24 px-2 py-1 text-[10px] font-mono bg-slate-950 border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CHOICE 2: Cards from Shared Calendars */}
          <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: gcalSharedCalendarColorEnabled ? gcalSharedCalendarCardBg : "#64748B" }}
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Users size={12} className="text-indigo-400" />
                  Cards from Shared Calendars
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  const next = !gcalSharedCalendarColorEnabled;
                  setGcalSharedCalendarColorEnabled(next);
                  saveSystemSettingsToCloud({ gcalSharedCalendarColorEnabled: next });
                }}
                className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  gcalSharedCalendarColorEnabled
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                {gcalSharedCalendarColorEnabled ? "Colored" : "Default"}
              </button>
            </div>

            <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed">
              Color the background of task cards that originate from a shared calendar or group invitations.
            </p>

            {gcalSharedCalendarColorEnabled && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>Pick Shared Calendar Background:</span>
                  <span className="font-mono">{gcalSharedCalendarCardBg}</span>
                </div>
                {/* Palette Grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {SHARED_CALENDAR_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setGcalSharedCalendarCardBg(c.hex);
                        saveSystemSettingsToCloud({ gcalSharedCalendarCardBg: c.hex });
                      }}
                      className={`h-7 rounded-lg transition-transform border cursor-pointer flex items-center justify-center relative ${
                        gcalSharedCalendarCardBg.toLowerCase() === c.hex.toLowerCase()
                          ? "ring-2 ring-white scale-105 border-white"
                          : "border-white/20 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {gcalSharedCalendarCardBg.toLowerCase() === c.hex.toLowerCase() && (
                        <Check size={12} strokeWidth={3.5} className="text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
                {/* Custom Hex input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[8.5px] text-slate-400 font-mono">Custom Hex:</span>
                  <input
                    type="color"
                    value={gcalSharedCalendarCardBg}
                    onChange={(e) => {
                      setGcalSharedCalendarCardBg(e.target.value);
                      saveSystemSettingsToCloud({ gcalSharedCalendarCardBg: e.target.value });
                    }}
                    className="w-7 h-7 rounded border border-white/20 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={gcalSharedCalendarCardBg}
                    onChange={(e) => {
                      setGcalSharedCalendarCardBg(e.target.value);
                      saveSystemSettingsToCloud({ gcalSharedCalendarCardBg: e.target.value });
                    }}
                    placeholder="#7C3AED"
                    className="w-24 px-2 py-1 text-[10px] font-mono bg-slate-950 border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* SECTION 3: SYNC ACTIONS & CONNECTION STATUS                     */}
        {/* =============================================================== */}
        {gcalAccessToken ? (
          <div className="space-y-4">
            {/* Flexible Tasks Memory Safeguard Card */}
            <div className="p-3.5 bg-slate-950/40 border border-indigo-500/20 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  TaskPass Flexibility Memory
                </span>
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {flexibleTasksCount} flexible task{flexibleTasksCount !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed">
                Taskpass remembers which tasks are flexible. They are synchronized to Google Calendar, but <strong>remain dynamic flexible tasks in Taskpass</strong>. They will only fix in place if manually locked or moved in Google Calendar.
              </p>
            </div>

            {/* 5-Minute Auto-Sync & Manual Sync Actions */}
            <div className="p-3.5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-indigo-400" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-white">
                    5-Minute Automatic Sync
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isGcalSyncActive;
                    setIsGcalSyncActive(next);
                    localStorage.setItem("gcal_sync_enabled", next ? "true" : "false");
                    saveSystemSettingsToCloud({ gcalSyncEnabled: next });
                    triggerHaptic("medium");
                  }}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isGcalSyncActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-800 text-slate-400 hover:text-white border border-white/10"
                  }`}
                >
                  {isGcalSyncActive ? "Active" : "Paused"}
                </button>
              </div>

              <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 border-t border-white/5 pt-2">
                <span>{formatLastSyncTime()}</span>
                <span className="font-mono text-indigo-300">
                  Mode: {gcalSyncMode === "read_only" ? "Read Only" : gcalSyncMode === "fixed_only" ? "Fixed Only" : "Sync All"}
                </span>
              </div>

              {/* Sync Now / Directional Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isGcalLoading}
                  onClick={handleManualFullSync ? handleManualFullSync : handlePullGcalEvents}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-505 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <RefreshCw size={13} className={isGcalLoading ? "animate-spin" : ""} />
                  <span>Sync Now</span>
                </button>

                <button
                  type="button"
                  disabled={isGcalLoading || gcalSyncMode === "read_only"}
                  onClick={handlePushLocalTasks}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    gcalSyncMode === "read_only"
                      ? "bg-slate-900 border-white/5 text-slate-600 cursor-not-allowed"
                      : "bg-slate-950/60 hover:bg-slate-900 border-white/10 text-slate-200 hover:text-white"
                  }`}
                  title={gcalSyncMode === "read_only" ? "Push disabled in Read-Only mode" : "Push local tasks to Google Calendar"}
                >
                  <CalendarRange size={13} />
                  <span>Push {gcalSyncMode === "fixed_only" ? "Fixed Only" : "All"}</span>
                </button>
              </div>
            </div>

            {/* Status Message */}
            {gcalStatusMsg && (
              <div
                className={`p-3 rounded-xl text-[9.5px] leading-relaxed font-semibold border ${
                  gcalStatusMsg.startsWith("GCal") ||
                  gcalStatusMsg.startsWith("Sync error") ||
                  gcalStatusMsg.toLowerCase().includes("error") ||
                  gcalStatusMsg.toLowerCase().includes("failed")
                    ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                }`}
              >
                {gcalStatusMsg}
              </div>
            )}

            {/* Unlink Account */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setGcalAccessToken(null);
                  localStorage.removeItem("gcal_sync_enabled");
                  localStorage.removeItem("gcal_access_token");
                  setIsGcalSyncActive(false);
                  setGcalStatusMsg("Google Calendar account unlinked.");
                  triggerHaptic("heavy");
                }}
                className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-350 tracking-wider hover:underline transition-colors cursor-pointer"
              >
                Unlink Calendar Account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1 p-3.5 bg-slate-950/40 border border-white/5 rounded-2xl">
            <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
              Link your Google account to automatically synchronize real-world Google Calendar events with Taskpass on a 5-minute schedule.
            </p>

            <button
              type="button"
              onClick={handleLinkGcal}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CalendarPlus size={14} />
              <span>Link Google Calendar</span>
            </button>

            {gcalStatusMsg && (
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl text-[9.5px] leading-relaxed font-semibold text-slate-400 text-center">
                {gcalStatusMsg}
              </div>
            )}
          </div>
        )}

        {/* Section: Read-Only Complementary Calendar URL Input */}
        <div className="pt-3 border-t border-white/5 space-y-2.5">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500">Read-Only Complementary Calendar</span>
          <div className="bg-slate-950/30 border border-white/5 p-3 rounded-2xl space-y-2">
            <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed">
              Provide a public calendar embed link to view external calendars alongside your schedule.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., https://calendar.google.com/calendar/embed?src=..."
                value={complementaryCalendarUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setComplementaryCalendarUrl(val);
                  localStorage.setItem("complementary_calendar_url", val);
                  saveSystemSettingsToCloud({ complementaryCalendarUrl: val });
                }}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {complementaryCalendarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setComplementaryCalendarUrl("");
                    localStorage.setItem("complementary_calendar_url", "");
                    saveSystemSettingsToCloud({ complementaryCalendarUrl: "" });
                  }}
                  className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-950/60 border border-white/10 text-slate-300 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer"
          >
            Close Hub
          </button>
        </div>
      </div>
    </Modal>
  );
};
