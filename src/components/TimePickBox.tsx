import React, { useState, useEffect, useRef, useId } from "react";
import { Clock, Timer, Check, X, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatTime, parseDurationToMinutes, formatDuration } from "../utils/timeHelpers";

// Helper to parse "HH:MM" (24-hour) into { hour12: number, minute: number, ampm: "AM" | "PM" }
export function parseTimeTo12Hour(timeStr: string | undefined): { hour12: number; minute: number; ampm: "AM" | "PM" } {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) {
    return { hour12: 12, minute: 0, ampm: "PM" };
  }
  try {
    const [hStr, mStr] = timeStr.split(":");
    let h24 = parseInt(hStr, 10);
    if (isNaN(h24)) h24 = 12;
    let m = parseInt(mStr, 10);
    if (isNaN(m)) m = 0;
    // Snap to nearest 5 min
    m = Math.min(60, Math.max(0, Math.round(m / 5) * 5));

    const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    let hour12 = h24 % 12;
    if (hour12 === 0 && h24 !== 0) {
      hour12 = 12;
    } else if (h24 === 0) {
      hour12 = 0; // Support 0 or 12
    }
    return { hour12, minute: m, ampm };
  } catch {
    return { hour12: 12, minute: 0, ampm: "PM" };
  }
}

// Helper to convert { hour12, minute, ampm } to "HH:MM" (24-hour)
export function compose12HourToTime(hour12: number, minute: number, ampm: "AM" | "PM"): string {
  let h24: number;
  if (hour12 === 0) {
    h24 = ampm === "AM" ? 0 : 12;
  } else if (hour12 === 12) {
    h24 = ampm === "AM" ? 0 : 12;
  } else {
    h24 = ampm === "PM" ? hour12 + 12 : hour12;
  }

  // Minute handling: 60 min rolls into next hour or stays at 55
  let finalH24 = h24;
  let finalMin = minute;
  if (finalMin >= 60) {
    finalH24 = (finalH24 + 1) % 24;
    finalMin = 0;
  }

  return `${String(finalH24).padStart(2, "0")}:${String(finalMin).padStart(2, "0")}`;
}

// Quarter minute values highlighted in green
export const QUARTER_MINUTES = [0, 15, 30, 45, 60];

// All 5-minute increments from 0 to 60
export const FIVE_MIN_INCREMENTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

// Hours 0-12 for Time Selector
export const TIME_HOURS_0_TO_12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Hours 0-23 for Duration Selector
export const DURATION_HOURS_0_TO_23 = Array.from({ length: 24 }, (_, i) => i);

// ============================================================================
// 1. TimePickBoxModal / Popover
// ============================================================================

export interface TimePickBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // "HH:MM"
  onChange: (newTime: string) => void;
  isDark?: boolean;
  title?: string;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

export const TimePickBoxModal: React.FC<TimePickBoxModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  isDark = true,
  title = "Select Time",
  triggerHaptic = () => {},
}) => {
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external value when modal opens
  useEffect(() => {
    if (isOpen) {
      const parsed = parseTimeTo12Hour(value);
      setHour(parsed.hour12);
      setMinute(parsed.minute);
      setAmpm(parsed.ampm);
    }
  }, [isOpen, value]);

  const handleHourSelect = (h: number) => {
    triggerHaptic("selection");
    setHour(h);
    const newTime = compose12HourToTime(h, minute, ampm);
    onChange(newTime);
  };

  const handleMinuteSelect = (m: number) => {
    triggerHaptic("selection");
    setMinute(m);
    const newTime = compose12HourToTime(hour, m, ampm);
    onChange(newTime);
  };

  const handleAmpmSelect = (period: "AM" | "PM") => {
    triggerHaptic("selection");
    setAmpm(period);
    const newTime = compose12HourToTime(hour, minute, period);
    onChange(newTime);
  };

  const handleDone = () => {
    triggerHaptic("success");
    const newTime = compose12HourToTime(hour, minute, ampm);
    onChange(newTime);
    onClose();
  };

  if (!isOpen) return null;

  const currentFormatted = formatTime(compose12HourToTime(hour, minute, ampm));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop - Touching anywhere outside acts as done */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDone}
            className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
            title="Touch outside to finish"
          />

          {/* Forefront Pick Boxes Window */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-[300px] rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 sm:p-3.5 my-auto text-left font-sans select-none overflow-hidden ${
              isDark
                ? "bg-slate-900/98 border-indigo-500/30 text-slate-100 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                : "bg-white border-slate-200 text-slate-900 shadow-xl"
            }`}
          >
            {/* Header: Title + Current Time Badge + Discreet Done Button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-lg ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                  <Clock size={14} />
                </div>
                <div>
                  <h3 className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">{title}</h3>
                  <div className="text-sm font-black text-indigo-400 font-mono flex items-center gap-1">
                    <span>{currentFormatted || "12:00 PM"}</span>
                  </div>
                </div>
              </div>

              {/* Discreet Done Button */}
              <button
                type="button"
                onClick={handleDone}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                title="Save time selection"
              >
                <Check size={12} strokeWidth={3} />
                <span>Done</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-0.5 custom-scrollbar">
              {/* SECTION 1: AM / PM Choice (2 Boxes) */}
              <div>
                <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Period
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["AM", "PM"] as const).map((period) => {
                    const isSelected = ampm === period;
                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => handleAmpmSelect(period)}
                        className={`py-1.5 rounded-lg font-mono text-xs font-black tracking-wider border transition-all cursor-pointer active:scale-95 text-center ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                            : isDark
                            ? "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700"
                            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {period}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: Hours (0-12, 4 Boxes Wide) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                    Hours (0 - 12)
                  </label>
                  <span className="text-[9.5px] font-mono font-bold text-indigo-400">
                    {hour}
                  </span>
                </div>
                {/* 4 Boxes Wide Grid */}
                <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/40 rounded-lg border border-white/5">
                  {TIME_HOURS_0_TO_12.map((h) => {
                    const isSelected = hour === h;
                    return (
                      <button
                        key={`hour-${h}`}
                        type="button"
                        onClick={() => handleHourSelect(h)}
                        className={`py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center leading-5 ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/50"
                            : isDark
                            ? "bg-slate-950/70 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-950/30"
                            : "bg-slate-100 border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: Minutes (0-60 in 5 min increments, 4 Boxes Wide, 15/30/45/00 highlighted in green) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                    Minutes (0 - 60 in 5m)
                  </label>
                  <span className="text-[9.5px] font-mono font-bold text-emerald-400">
                    {String(minute).padStart(2, "0")}m
                  </span>
                </div>
                {/* 4 Boxes Wide Grid */}
                <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/40 rounded-lg border border-white/5">
                  {FIVE_MIN_INCREMENTS.map((m) => {
                    const isSelected = minute === m;
                    const isQuarter = QUARTER_MINUTES.includes(m);
                    return (
                      <button
                        key={`min-${m}`}
                        type="button"
                        onClick={() => handleMinuteSelect(m)}
                        className={`relative py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center leading-5 ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400/50"
                            : isQuarter
                            ? isDark
                              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 shadow-[0_0_6px_rgba(16,185,129,0.15)] font-black"
                              : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-black"
                            : isDark
                            ? "bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60"
                            : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
                        }`}
                      >
                        <span>{String(m).padStart(2, "0")}</span>
                        {isQuarter && !isSelected && (
                          <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Subtle Dismiss Bar */}
            <div className="mt-2.5 pt-2 border-t border-white/10 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-[9.5px] text-slate-500 italic">Tap outside to finish</span>
              <button
                type="button"
                onClick={handleDone}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10.5px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Component trigger for TimePickBox
export interface TimePickBoxTriggerProps {
  value: string; // "HH:MM"
  onChange: (newTime: string) => void;
  isDark?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  placeholder?: string;
  children?: React.ReactNode;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  id?: string;
}

export const TimePickBoxTrigger: React.FC<TimePickBoxTriggerProps> = ({
  value,
  onChange,
  isDark = true,
  disabled = false,
  className = "",
  style,
  title = "Select Start Time",
  placeholder = "12:00 PM",
  children,
  triggerHaptic = () => {},
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const displayTime = value ? formatTime(value) : placeholder;

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          triggerHaptic("light");
          setIsOpen(true);
        }}
        title={title}
        style={style}
        className={children ? className : `inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all select-none cursor-pointer ${
          disabled
            ? "opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500"
            : isDark
            ? "bg-slate-950/80 hover:bg-slate-900 border-white/10 hover:border-indigo-500/50 text-indigo-300 shadow-sm"
            : "bg-white hover:bg-slate-50 border-slate-300 hover:border-indigo-400 text-indigo-700 shadow-sm"
        } ${className}`}
      >
        {children ? (
          children
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 truncate">
              <Clock size={13} className="shrink-0 text-indigo-400 opacity-80" />
              <span className="truncate">{displayTime || placeholder}</span>
            </div>
            <ChevronDown size={12} className="shrink-0 text-slate-400 opacity-60" />
          </>
        )}
      </button>

      <TimePickBoxModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        value={value || "12:00"}
        onChange={onChange}
        isDark={isDark}
        title={title}
        triggerHaptic={triggerHaptic}
      />
    </>
  );
};

// ============================================================================
// 2. DurationPickBoxModal / Popover
// ============================================================================

export interface DurationPickBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string | number; // e.g. "30 min" or 30 or "1h 15m"
  onChange: (newDuration: string, minutesNum: number) => void;
  isDark?: boolean;
  title?: string;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

export const DurationPickBoxModal: React.FC<DurationPickBoxModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  isDark = true,
  title = "Select Duration",
  triggerHaptic = () => {},
}) => {
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(30);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external value when modal opens
  useEffect(() => {
    if (isOpen) {
      const totalMins = parseDurationToMinutes(value);
      const h = Math.floor(totalMins / 60);
      let m = totalMins % 60;
      m = Math.min(60, Math.max(0, Math.round(m / 5) * 5));
      setHours(Math.min(23, h));
      setMinutes(m);
    }
  }, [isOpen, value]);

  const handleHoursSelect = (h: number) => {
    triggerHaptic("selection");
    setHours(h);
    const totalMins = h * 60 + minutes;
    const durStr = formatDuration(totalMins);
    onChange(durStr, totalMins);
  };

  const handleMinutesSelect = (m: number) => {
    triggerHaptic("selection");
    setMinutes(m);
    const totalMins = hours * 60 + m;
    const durStr = formatDuration(totalMins);
    onChange(durStr, totalMins);
  };

  const handleDone = () => {
    triggerHaptic("success");
    const totalMins = hours * 60 + minutes;
    const durStr = formatDuration(totalMins);
    onChange(durStr, totalMins);
    onClose();
  };

  if (!isOpen) return null;

  const currentTotalMins = hours * 60 + minutes;
  const currentFormatted = formatDuration(currentTotalMins);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop - Touching anywhere outside acts as done */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDone}
            className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
            title="Touch outside to finish"
          />

          {/* Forefront Pick Boxes Window */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-[300px] rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 sm:p-3.5 my-auto text-left font-sans select-none overflow-hidden ${
              isDark
                ? "bg-slate-900/98 border-indigo-500/30 text-slate-100 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                : "bg-white border-slate-200 text-slate-900 shadow-xl"
            }`}
          >
            {/* Header: Title + Current Duration Badge + Discreet Done Button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-lg ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                  <Timer size={14} />
                </div>
                <div>
                  <h3 className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">{title}</h3>
                  <div className="text-sm font-black text-indigo-400 font-mono flex items-center gap-1">
                    <span>{currentFormatted}</span>
                    <span className="text-[9px] text-slate-400 font-normal">({currentTotalMins}m)</span>
                  </div>
                </div>
              </div>

              {/* Discreet Done Button */}
              <button
                type="button"
                onClick={handleDone}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                title="Save duration"
              >
                <Check size={12} strokeWidth={3} />
                <span>Done</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-0.5 custom-scrollbar">
              {/* SECTION 1: Hours (0-23, 4 Boxes Wide) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                    Hours (0 - 23)
                  </label>
                  <span className="text-[9.5px] font-mono font-bold text-indigo-400">
                    {hours}h
                  </span>
                </div>
                {/* 4 Boxes Wide Grid */}
                <div className="grid grid-cols-4 gap-1 max-h-[110px] overflow-y-auto p-0.5 bg-slate-950/40 rounded-lg border border-white/5 custom-scrollbar">
                  {DURATION_HOURS_0_TO_23.map((h) => {
                    const isSelected = hours === h;
                    return (
                      <button
                        key={`dur-hour-${h}`}
                        type="button"
                        onClick={() => handleHoursSelect(h)}
                        className={`py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center leading-5 ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/50"
                            : isDark
                            ? "bg-slate-950/80 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-950/30"
                            : "bg-slate-100 border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                      >
                        {h}h
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: Minutes (0-60 in 5 min increments, 4 Boxes Wide, 15/30/45/00 highlighted in green) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                    Minutes (0 - 60 in 5m)
                  </label>
                  <span className="text-[9.5px] font-mono font-bold text-emerald-400">
                    {minutes}m
                  </span>
                </div>
                {/* 4 Boxes Wide Grid */}
                <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/40 rounded-lg border border-white/5">
                  {FIVE_MIN_INCREMENTS.map((m) => {
                    const isSelected = minutes === m;
                    const isQuarter = QUARTER_MINUTES.includes(m);
                    return (
                      <button
                        key={`dur-min-${m}`}
                        type="button"
                        onClick={() => handleMinutesSelect(m)}
                        className={`relative py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center leading-5 ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400/50"
                            : isQuarter
                            ? isDark
                              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 shadow-[0_0_6px_rgba(16,185,129,0.15)] font-black"
                              : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-black"
                            : isDark
                            ? "bg-slate-950/80 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60"
                            : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
                        }`}
                      >
                        <span>{m}m</span>
                        {isQuarter && !isSelected && (
                          <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Subtle Dismiss Bar */}
            <div className="mt-2.5 pt-2 border-t border-white/10 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-[9.5px] text-slate-500 italic">Tap outside to finish</span>
              <button
                type="button"
                onClick={handleDone}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10.5px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Component trigger for DurationPickBox
export interface DurationPickBoxTriggerProps {
  value: string | number; // e.g. "30 min" or 30 or "1h 15m"
  onChange: (newDuration: string, minutesNum: number) => void;
  isDark?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  placeholder?: string;
  children?: React.ReactNode;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  id?: string;
}

export const DurationPickBoxTrigger: React.FC<DurationPickBoxTriggerProps> = ({
  value,
  onChange,
  isDark = true,
  disabled = false,
  className = "",
  style,
  title = "Select Duration",
  placeholder = "30 min",
  children,
  triggerHaptic = () => {},
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const displayDuration = value !== undefined && value !== null && value !== "" ? formatDuration(value) : placeholder;

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          triggerHaptic("light");
          setIsOpen(true);
        }}
        title={title}
        style={style}
        className={children ? className : `inline-flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-all select-none cursor-pointer ${
          disabled
            ? "opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500"
            : isDark
            ? "bg-slate-950/80 hover:bg-slate-900 border-white/10 hover:border-indigo-500/50 text-indigo-300 shadow-sm"
            : "bg-white hover:bg-slate-50 border-slate-300 hover:border-indigo-400 text-indigo-700 shadow-sm"
        } ${className}`}
      >
        {children ? (
          children
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 truncate">
              <Timer size={13} className="shrink-0 text-indigo-400 opacity-80" />
              <span className="truncate">{displayDuration || placeholder}</span>
            </div>
            <ChevronDown size={12} className="shrink-0 text-slate-400 opacity-60" />
          </>
        )}
      </button>

      <DurationPickBoxModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        value={value || "30 min"}
        onChange={onChange}
        isDark={isDark}
        title={title}
        triggerHaptic={triggerHaptic}
      />
    </>
  );
};
