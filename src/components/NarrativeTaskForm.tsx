import React, { useState, useEffect } from "react";
import { 
  User, MapPin, Clock, Timer, Lock, Unlock, 
  X, Plus, Sparkles, Check, ChevronDown, Edit3, Type,
  Repeat, Flag
} from "lucide-react";
import { formatTime, parseDurationToMinutes, buildTaskNarrativeText } from "../utils/timeHelpers";

export interface NarrativeTaskFormProps {
  isDark: boolean;
  taskTitle: string;
  setTaskTitle: (val: string) => void;
  taskCollaborator: string;
  setTaskCollaborator: (val: string) => void;
  collaborators: string[];
  onAddCollaborator: (name: string) => void;
  taskDate?: string;
  setTaskDate?: (val: string) => void;
  taskTime: string; // "HH:MM"
  setTaskTime: (val: string) => void;
  taskDuration: string; // "X min"
  setTaskDuration: (val: string) => void;
  taskIsLocked: boolean;
  setTaskIsLocked: (val: boolean) => void;
  taskLocation: string;
  setTaskLocation: (val: string) => void;
  favoriteLocations: string[];
  onAddLocation: (loc: string) => void;
  taskTravelBefore: number;
  setTaskTravelBefore: (val: number) => void;
  taskTravelAfter: number;
  setTaskTravelAfter: (val: number) => void;
  beforeBufferPurpose?: string;
  setBeforeBufferPurpose?: (val: string) => void;
  afterBufferPurpose?: string;
  setAfterBufferPurpose?: (val: string) => void;
  taskPriority?: "none" | "low" | "medium" | "high";
  setTaskPriority?: (val: "none" | "low" | "medium" | "high") => void;
  taskNotes?: string;
  setTaskNotes?: (val: string) => void;
  taskIsRecurring?: boolean;
  setTaskIsRecurring?: (val: boolean) => void;
  taskRecurrenceFrequency?: "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
  setTaskRecurrenceFrequency?: (val: "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly") => void;
  dataFieldColor?: string;
  onSaveTask?: () => void;
}

export const NarrativeTaskForm: React.FC<NarrativeTaskFormProps> = React.memo(({
  isDark,
  dataFieldColor = "#818cf8",
  taskTitle,
  setTaskTitle,
  onSaveTask,
  taskCollaborator,
  setTaskCollaborator,
  collaborators,
  onAddCollaborator,
  taskDate,
  setTaskDate,
  taskTime,
  setTaskTime,
  taskDuration,
  setTaskDuration,
  taskIsLocked,
  setTaskIsLocked,
  taskLocation,
  setTaskLocation,
  favoriteLocations,
  onAddLocation,
  taskTravelBefore,
  setTaskTravelBefore,
  taskTravelAfter,
  setTaskTravelAfter,
  beforeBufferPurpose = "Travel",
  setBeforeBufferPurpose,
  afterBufferPurpose = "Buffer",
  setAfterBufferPurpose,
  taskPriority = "none",
  setTaskPriority,
  taskNotes = "",
  setTaskNotes,
  taskIsRecurring = false,
  setTaskIsRecurring,
  taskRecurrenceFrequency = "none",
  setTaskRecurrenceFrequency,
}) => {
  // Ad-hoc mode states for Collaborator & Location
  const [isAdHocCollaborator, setIsAdHocCollaborator] = useState(false);
  const [showManageCollaborators, setShowManageCollaborators] = useState(false);
  const [newColName, setNewColName] = useState("");

  const [isAdHocLocation, setIsAdHocLocation] = useState(false);
  const [showManageLocations, setShowManageLocations] = useState(false);
  const [newLocName, setNewLocName] = useState("");

  // Buffer type state
  const [bufferType, setBufferType] = useState<string>("Travel");

  // Time picker state breakdown
  const parseTime = (time24: string) => {
    if (!time24 || !time24.includes(":")) return { h12: 9, mins: 0, ampm: "AM" };
    const [hStr, mStr] = time24.split(":");
    const h24 = parseInt(hStr, 10) || 0;
    const mins = parseInt(mStr, 10) || 0;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { h12, mins, ampm };
  };

  const { h12, mins: startMins, ampm } = parseTime(taskTime);

  const handleTimeChange = (newH12: number, newMins: number, newAmPm: string) => {
    let h24 = newH12;
    if (newAmPm === "PM") {
      h24 = newH12 === 12 ? 12 : newH12 + 12;
    } else {
      h24 = newH12 === 12 ? 0 : newH12;
    }
    const formatted = `${String(h24).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
    setTaskTime(formatted);
  };

  // Duration picker state breakdown
  const totalDurationMins = parseDurationToMinutes(taskDuration) || 30;
  const durHours = Math.floor(totalDurationMins / 60);
  const durMins = totalDurationMins % 60;

  const handleDurationChange = (dh: number, dm: number) => {
    const total = dh * 60 + dm;
    if (total <= 0) {
      setTaskDuration("15 min");
      return;
    }
    if (total >= 60) {
      if (total % 60 === 0) {
        setTaskDuration(`${total / 60} hr`);
      } else {
        setTaskDuration(`${Math.floor(total / 60)} hr ${total % 60} min`);
      }
    } else {
      setTaskDuration(`${total} min`);
    }
  };

  // Styling helper classes - compressed padding and heights to fit within view
  const rowContainerClass = `py-1.5 px-2.5 rounded-xl border transition-all ${
    isDark 
      ? "bg-slate-900/80 border-slate-800 hover:border-slate-700/80" 
      : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
  }`;

  const rowLabelClass = "text-[11px] font-black uppercase tracking-wider w-14 text-emerald-400 shrink-0 select-none";

  const inputBaseClass = `h-8 px-2.5 rounded-lg font-bold text-xs outline-none border transition-all ${
    isDark 
      ? "bg-slate-950 border-slate-700/70 text-white placeholder-slate-500 focus:border-indigo-500" 
      : "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
  }`;

  const selectBaseClass = `h-8 px-2 rounded-lg font-bold text-xs outline-none border cursor-pointer transition-all ${
    isDark 
      ? "bg-slate-950 border-slate-700/70 text-white focus:border-indigo-500" 
      : "bg-slate-50 border-slate-300 text-slate-800 focus:border-indigo-500"
  }`;

  return (
    <div className="space-y-1.5 text-left font-sans">
      
      {/* isolated Row 1: Who */}
      <div className={rowContainerClass}>
        <div className="flex items-center gap-3">
          <span className={rowLabelClass}>Who:</span>
          <div className="flex-1 flex items-center gap-2">
            {!isAdHocCollaborator ? (
              <div className="flex-1 flex items-center gap-1.5">
                <select
                  value={taskCollaborator}
                  onDoubleClick={() => setIsAdHocCollaborator(true)}
                  onChange={(e) => {
                    if (e.target.value === "__manage__") {
                      setShowManageCollaborators(true);
                    } else {
                      setTaskCollaborator(e.target.value);
                    }
                  }}
                  className={`${selectBaseClass} flex-1`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                  title="Double-click to switch to ad-hoc text entry"
                >
                  <option value="">None (Unassigned)</option>
                  {collaborators.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__manage__">+ Add/Edit Collaborators...</option>
                </select>

                {taskCollaborator && (
                  <button
                    type="button"
                    onClick={() => setTaskCollaborator("")}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                    title="Reset to None"
                  >
                    <X size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAdHocCollaborator(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-white/5 transition-all shrink-0 cursor-pointer"
                  title="Enter ad-hoc collaborator name without saving to list"
                >
                  Ad-hoc
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={taskCollaborator}
                  onChange={(e) => setTaskCollaborator(e.target.value)}
                  placeholder="Ad-hoc collaborator name..."
                  className={`${inputBaseClass} flex-1`}
                  autoFocus
                />
                {taskCollaborator && (
                  <button
                    type="button"
                    onClick={() => setTaskCollaborator("")}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAdHocCollaborator(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 text-[10px] font-bold border border-indigo-500/30 transition-all shrink-0 cursor-pointer"
                  title="Return to Saved Dropdown List"
                >
                  List
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Manage Collaborator Popup Input */}
        {showManageCollaborators && (
          <div className="mt-1.5 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center gap-2 animate-in fade-in">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="New collaborator name..."
              className={`${inputBaseClass} flex-1`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = newColName.trim();
                if (trimmed) {
                  onAddCollaborator(trimmed);
                  setTaskCollaborator(trimmed);
                  setNewColName("");
                }
                setShowManageCollaborators(false);
              }}
              className="px-3 h-8 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase shrink-0 cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowManageCollaborators(false)}
              className="px-2.5 h-8 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* isolated Row 2: What */}
      <div className={rowContainerClass}>
        <div className="flex items-center gap-3">
          <span className={rowLabelClass}>What:</span>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSaveTask?.();
                }
              }}
              placeholder="Task title or activity..."
              className={`${inputBaseClass} flex-1 text-sm`}
            />
            {taskTitle && (
              <button
                type="button"
                onClick={() => setTaskTitle("")}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                title="Clear title"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* isolated Row 3: When */}
      <div className={rowContainerClass}>
        <div className="space-y-1">
          {/* Scheduling Pickers: Date, Start Time, Duration, Lock Status */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className={rowLabelClass}>When:</span>
            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
              {/* Date Picker */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-950/60 rounded-lg border border-white/10">
                <span className="text-[9.5px] font-bold text-slate-400 px-1 uppercase">Date:</span>
                <input
                  type="date"
                  value={taskDate || ""}
                  onChange={(e) => setTaskDate?.(e.target.value)}
                  className={`${selectBaseClass} h-7.5 text-xs font-mono px-1.5 cursor-pointer`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                  title="Select Date"
                />
              </div>

              {/* Start Time Pickers */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-950/60 rounded-lg border border-white/10">
                <span className="text-[9.5px] font-bold text-slate-400 px-1 uppercase">Start:</span>
                {/* Hour Picker */}
                <select
                  value={h12}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), startMins, ampm)}
                  className={`${selectBaseClass} h-7.5 text-xs font-mono`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>

                <span className="font-bold text-slate-400 text-xs">:</span>

                {/* Minute Picker */}
                <select
                  value={startMins}
                  onChange={(e) => handleTimeChange(h12, parseInt(e.target.value, 10), ampm)}
                  className={`${selectBaseClass} h-7.5 text-xs font-mono`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                  ))}
                </select>

                {/* AM/PM Picker */}
                <select
                  value={ampm}
                  onChange={(e) => handleTimeChange(h12, startMins, e.target.value)}
                  className={`${selectBaseClass} h-7.5 text-xs font-bold text-indigo-400`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>

              {/* Duration Pickers */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-950/60 rounded-lg border border-white/10">
                <span className="text-[9.5px] font-bold text-slate-400 px-1 uppercase">Duration:</span>
                <select
                  value={durHours}
                  onChange={(e) => handleDurationChange(parseInt(e.target.value, 10), durMins)}
                  className={`${selectBaseClass} h-7.5 text-xs font-mono`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{h} hr</option>
                  ))}
                </select>

                <select
                  value={durMins}
                  onChange={(e) => handleDurationChange(durHours, parseInt(e.target.value, 10))}
                  className={`${selectBaseClass} h-7.5 text-xs font-mono`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>

              {/* Locked / Flexible toggle */}
              <button
                type="button"
                onClick={() => setTaskIsLocked(!taskIsLocked)}
                className={`px-2.5 h-7.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  taskIsLocked
                    ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                    : "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                }`}
                title={taskIsLocked ? "Locked to exact time" : "Flexible scheduling"}
              >
                {taskIsLocked ? <Lock size={11} /> : <Unlock size={11} />}
                <span>{taskIsLocked ? "Locked" : "Flexible"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* isolated Row 4: Where */}
      <div className={rowContainerClass}>
        <div className="flex items-center gap-3">
          <span className={rowLabelClass}>Where:</span>
          <div className="flex-1 flex items-center gap-2">
            {!isAdHocLocation ? (
              <div className="flex-1 flex items-center gap-1.5">
                <select
                  value={taskLocation}
                  onDoubleClick={() => setIsAdHocLocation(true)}
                  onChange={(e) => {
                    if (e.target.value === "__manage__") {
                      setShowManageLocations(true);
                    } else {
                      setTaskLocation(e.target.value);
                    }
                  }}
                  className={`${selectBaseClass} flex-1`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                  title="Double-click to switch to ad-hoc text entry"
                >
                  <option value="">No Location (None)</option>
                  {favoriteLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value="__manage__">+ Add/Edit Locations...</option>
                </select>

                {taskLocation && (
                  <button
                    type="button"
                    onClick={() => setTaskLocation("")}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                    title="Reset to None"
                  >
                    <X size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAdHocLocation(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-white/5 transition-all shrink-0 cursor-pointer"
                  title="Enter ad-hoc location without saving to list"
                >
                  Ad-hoc
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={taskLocation}
                  onChange={(e) => setTaskLocation(e.target.value)}
                  placeholder="Ad-hoc location name..."
                  className={`${inputBaseClass} flex-1`}
                  autoFocus
                />
                {taskLocation && (
                  <button
                    type="button"
                    onClick={() => setTaskLocation("")}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAdHocLocation(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 text-[10px] font-bold border border-indigo-500/30 transition-all shrink-0 cursor-pointer"
                  title="Return to Saved Dropdown List"
                >
                  List
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Manage Location Popup Input */}
        {showManageLocations && (
          <div className="mt-1.5 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center gap-2 animate-in fade-in">
            <input
              type="text"
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              placeholder="New location name..."
              className={`${inputBaseClass} flex-1`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = newLocName.trim();
                if (trimmed) {
                  onAddLocation(trimmed);
                  setTaskLocation(trimmed);
                  setNewLocName("");
                }
                setShowManageLocations(false);
              }}
              className="px-3 h-8 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase shrink-0 cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowManageLocations(false)}
              className="px-2.5 h-8 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* isolated Row 5: How (Buffers & Purpose) */}
      <div className={rowContainerClass}>
        <div className="flex items-center gap-3">
          <span className={rowLabelClass}>How:</span>
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            {/* Pre-buffer Picker */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">Pre-task:</span>
              <select
                value={taskTravelBefore}
                onChange={(e) => setTaskTravelBefore(parseInt(e.target.value, 10))}
                className={`${selectBaseClass} h-8 text-xs font-mono`}
                style={{ colorScheme: isDark ? "dark" : "light" }}
              >
                {[0, 5, 10, 15, 20, 30, 45, 60].map((mins) => (
                  <option key={mins} value={mins}>{mins} min</option>
                ))}
              </select>
            </div>

            {/* Post-buffer Picker */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">Post-task:</span>
              <select
                value={taskTravelAfter}
                onChange={(e) => setTaskTravelAfter(parseInt(e.target.value, 10))}
                className={`${selectBaseClass} h-8 text-xs font-mono`}
                style={{ colorScheme: isDark ? "dark" : "light" }}
              >
                {[0, 5, 10, 15, 20, 30, 45, 60].map((mins) => (
                  <option key={mins} value={mins}>{mins} min</option>
                ))}
              </select>
            </div>

            {/* Buffer Type Purpose Dropdown */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10 flex-1 min-w-[130px]">
              <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">Type:</span>
              <select
                value={bufferType}
                onChange={(e) => {
                  setBufferType(e.target.value);
                  if (setBeforeBufferPurpose) setBeforeBufferPurpose(e.target.value);
                  if (setAfterBufferPurpose) setAfterBufferPurpose(e.target.value);
                }}
                className={`${selectBaseClass} h-8 text-xs font-bold text-indigo-300 flex-1`}
                style={{ colorScheme: isDark ? "dark" : "light" }}
              >
                <option value="Travel">Travel</option>
                <option value="Preparation">Preparation</option>
                <option value="Buffer">Buffer</option>
                <option value="Transition">Transition</option>
                <option value="Wrap-up">Wrap-up</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* isolated Row 6: Options (1-row Recurrence & Priority Flag Pull Down) */}
      <div className={rowContainerClass}>
        <div className="flex items-center gap-3">
          <span className={rowLabelClass}>Options:</span>
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            {/* Compact 1-row Recurrence Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10 flex-1 min-w-[145px]">
              <Repeat size={13} className="text-indigo-400 shrink-0 ml-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Repeat:</span>
              <select
                value={taskRecurrenceFrequency || "none"}
                onChange={(e) => {
                  const val = e.target.value as any;
                  if (setTaskRecurrenceFrequency) setTaskRecurrenceFrequency(val);
                  if (setTaskIsRecurring) setTaskIsRecurring(val !== "none");
                }}
                className={`${selectBaseClass} h-8 text-xs font-bold text-indigo-300 flex-1`}
                style={{ colorScheme: isDark ? "dark" : "light" }}
              >
                <option value="none">Never (One-time)</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Every Weekday (M-F)</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Priority Flag Pull Down Menu */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10 min-w-[130px]">
              <Flag size={13} className={
                taskPriority === "high" ? "text-red-400 shrink-0 ml-1" :
                taskPriority === "medium" ? "text-amber-400 shrink-0 ml-1" :
                taskPriority === "low" ? "text-emerald-400 shrink-0 ml-1" :
                "text-slate-400 shrink-0 ml-1"
              } />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Priority:</span>
              <select
                value={taskPriority || "none"}
                onChange={(e) => {
                  if (setTaskPriority) setTaskPriority(e.target.value as any);
                }}
                className={`${selectBaseClass} h-8 text-xs font-bold ${
                  taskPriority === "high" ? "text-red-400" :
                  taskPriority === "medium" ? "text-amber-300" :
                  taskPriority === "low" ? "text-emerald-300" :
                  "text-slate-300"
                }`}
                style={{ colorScheme: isDark ? "dark" : "light" }}
              >
                <option value="none">🏳️ None</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🚩 High</option>
              </select>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
});
