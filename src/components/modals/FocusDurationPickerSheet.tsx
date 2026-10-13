import React from "react";
import { createPortal } from "react-dom";
import { Clock, Check, X, Plus, Minus, RotateCcw } from "lucide-react";

export interface FocusDurationPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hours: number;
  setHours: (hours: number) => void;
  minutes: number;
  setMinutes: (minutes: number) => void;
  onConfirm: () => void;
  taskTitle?: string;
  isDark?: boolean;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

const PRESET_MINUTES = [15, 30, 45, 60, 90, 120, 180, 240];

export const FocusDurationPickerSheet: React.FC<FocusDurationPickerSheetProps> = ({
  isOpen,
  onClose,
  hours,
  setHours,
  minutes,
  setMinutes,
  onConfirm,
  taskTitle,
  isDark = true,
  triggerHaptic,
}) => {
  const openTimeRef = React.useRef(Date.now());
  React.useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalMinutes = Math.max(5, hours * 60 + minutes);

  const handleAdjustDelta = (deltaMins: number) => {
    if (triggerHaptic) triggerHaptic("light");
    const nextTotal = Math.max(5, Math.min(1440, totalMinutes + deltaMins));
    setHours(Math.floor(nextTotal / 60));
    setMinutes(nextTotal % 60);
  };

  const handleSelectPreset = (presetMins: number) => {
    if (triggerHaptic) triggerHaptic("selection");
    setHours(Math.floor(presetMins / 60));
    setMinutes(presetMins % 60);
  };

  const handleConfirm = () => {
    if (triggerHaptic) triggerHaptic("success");
    onConfirm();
  };

  const formatDisplayDuration = () => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h} hr ${m} min`;
    if (h > 0) return `${h} hr${h > 1 ? "s" : ""}`;
    return `${m} min`;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (Date.now() - openTimeRef.current < 450) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      id="focus-duration-picker-modal-backdrop"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150 text-left"
      onClick={handleBackdropClick}
    >
      <div
        id="focus-duration-picker-modal-window"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col p-5 sm:p-6 rounded-3xl border-2 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative ${
          isDark
            ? "bg-slate-900 border-white/20 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
            : "bg-[#FFF2DF] border-[#EADDC7] text-[#1F1A16] shadow-[0_20px_60px_rgba(61,49,42,0.25)]"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 mb-3.5 border-b ${
            isDark ? "border-white/10" : "border-[#EADDC7]"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                isDark
                  ? "bg-indigo-500/15 border-indigo-400/30 text-indigo-300"
                  : "bg-[#FAF3E0] border-[#EADDC7] text-[#1E6B40]"
              }`}
            >
              <Clock size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider truncate">
                Adjust Task Duration
              </h3>
              {taskTitle && (
                <p
                  className={`text-[10.5px] font-semibold truncate ${
                    isDark ? "text-slate-400" : "text-[#7A6B5C]"
                  }`}
                >
                  {taskTitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isDark
                ? "text-slate-400 hover:text-white hover:bg-white/10"
                : "text-[#7A6B5C] hover:text-[#1F1A16] hover:bg-[#EADDC7]"
            }`}
            title="Close duration picker"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {/* Main Large Duration Display Badge */}
          <div
            className={`py-3.5 px-4 rounded-2xl border text-center flex flex-col items-center justify-center shadow-inner ${
              isDark
                ? "bg-slate-950/80 border-indigo-500/30 text-indigo-300"
                : "bg-[#FAF3E0] border-[#1E6B40]/30 text-[#1E6B40]"
            }`}
          >
            <span
              className={`text-[9.5px] font-black uppercase tracking-widest ${
                isDark ? "text-slate-400" : "text-[#7A6B5C]"
              }`}
            >
              Total Duration
            </span>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
              {formatDisplayDuration()}
            </div>
            <span className="text-[10px] font-mono font-bold opacity-75 mt-0.5">
              ({totalMinutes} minutes)
            </span>
          </div>

          {/* Stepper Buttons for Quick Increments: -15m, -5m, +5m, +15m */}
          <div className="space-y-1.5">
            <span
              className={`text-[9.5px] font-black uppercase tracking-wider px-0.5 ${
                isDark ? "text-slate-400" : "text-[#7A6B5C]"
              }`}
            >
              Fine Adjustments
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleAdjustDelta(-15)}
                className={`py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 ${
                  isDark
                    ? "bg-slate-800/80 border-white/10 hover:bg-slate-700 text-slate-200"
                    : "bg-[#FAF3E0] border-[#EADDC7] hover:bg-white text-[#3D312A]"
                }`}
                title="Subtract 15 minutes"
              >
                <Minus size={11} strokeWidth={3} /> 15m
              </button>
              <button
                type="button"
                onClick={() => handleAdjustDelta(-5)}
                className={`py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 ${
                  isDark
                    ? "bg-slate-800/80 border-white/10 hover:bg-slate-700 text-slate-200"
                    : "bg-[#FAF3E0] border-[#EADDC7] hover:bg-white text-[#3D312A]"
                }`}
                title="Subtract 5 minutes"
              >
                <Minus size={11} strokeWidth={3} /> 5m
              </button>
              <button
                type="button"
                onClick={() => handleAdjustDelta(5)}
                className={`py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 ${
                  isDark
                    ? "bg-slate-800/80 border-white/10 hover:bg-slate-700 text-slate-200"
                    : "bg-[#FAF3E0] border-[#EADDC7] hover:bg-white text-[#3D312A]"
                }`}
                title="Add 5 minutes"
              >
                <Plus size={11} strokeWidth={3} /> 5m
              </button>
              <button
                type="button"
                onClick={() => handleAdjustDelta(15)}
                className={`py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 ${
                  isDark
                    ? "bg-slate-800/80 border-white/10 hover:bg-slate-700 text-slate-200"
                    : "bg-[#FAF3E0] border-[#EADDC7] hover:bg-white text-[#3D312A]"
                }`}
                title="Add 15 minutes"
              >
                <Plus size={11} strokeWidth={3} /> 15m
              </button>
            </div>
          </div>

          {/* Preset Buttons Grid */}
          <div className="space-y-1.5">
            <span
              className={`text-[9.5px] font-black uppercase tracking-wider px-0.5 ${
                isDark ? "text-slate-400" : "text-[#7A6B5C]"
              }`}
            >
              Preset Durations
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_MINUTES.map((preset) => {
                const isSelected = totalMinutes === preset;
                const label = preset >= 60 ? (preset % 60 === 0 ? `${preset / 60}h` : `${Math.floor(preset / 60)}h ${preset % 60}m`) : `${preset}m`;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center active:scale-95 ${
                      isSelected
                        ? isDark
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-md ring-2 ring-indigo-400/50"
                          : "bg-[#1E6B40] border-[#1E6B40] text-white shadow-md ring-2 ring-[#1E6B40]/40"
                        : isDark
                        ? "bg-slate-800/50 border-white/10 hover:bg-slate-800 text-slate-300"
                        : "bg-[#FAF3E0] border-[#EADDC7] hover:bg-white text-[#594B3E]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hour & Minute Pickers */}
          <div className="space-y-1.5">
            <span
              className={`text-[9.5px] font-black uppercase tracking-wider px-0.5 ${
                isDark ? "text-slate-400" : "text-[#7A6B5C]"
              }`}
            >
              Custom Hours & Minutes
            </span>
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-center gap-3 ${
                isDark ? "bg-slate-950/60 border-white/10" : "bg-[#FAF3E0] border-[#EADDC7]"
              }`}
            >
              {/* Hours Dropdown */}
              <div className="flex-1 flex flex-col items-center">
                <span
                  className={`text-[8.5px] font-black uppercase tracking-wider mb-1 ${
                    isDark ? "text-slate-400" : "text-[#7A6B5C]"
                  }`}
                >
                  Hours
                </span>
                <select
                  value={hours}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10) || 0;
                    setHours(h);
                    if (triggerHaptic) triggerHaptic("light");
                  }}
                  className={`w-full text-center py-2 px-2.5 rounded-xl border text-sm font-black cursor-pointer appearance-none outline-none transition-colors ${
                    isDark
                      ? "bg-slate-900 border-white/15 text-indigo-300 focus:border-indigo-400"
                      : "bg-[#FFF2DF] border-[#EADDC7] text-[#1E6B40] focus:border-[#1E6B40]"
                  }`}
                >
                  {Array.from({ length: 13 }).map((_, idx) => (
                    <option key={idx} value={idx} className={isDark ? "bg-slate-900 text-white" : "bg-[#FFF2DF] text-[#1F1A16]"}>
                      {idx} hour{idx !== 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <span className={`text-lg font-black pt-4 ${isDark ? "text-slate-500" : "text-[#7A6B5C]"}`}>
                :
              </span>

              {/* Minutes Dropdown in 5-minute increments */}
              <div className="flex-1 flex flex-col items-center">
                <span
                  className={`text-[8.5px] font-black uppercase tracking-wider mb-1 ${
                    isDark ? "text-slate-400" : "text-[#7A6B5C]"
                  }`}
                >
                  Minutes
                </span>
                <select
                  value={minutes}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10) || 0;
                    setMinutes(m);
                    if (triggerHaptic) triggerHaptic("light");
                  }}
                  className={`w-full text-center py-2 px-2.5 rounded-xl border text-sm font-black cursor-pointer appearance-none outline-none transition-colors ${
                    isDark
                      ? "bg-slate-900 border-white/15 text-indigo-300 focus:border-indigo-400"
                      : "bg-[#FFF2DF] border-[#EADDC7] text-[#1E6B40] focus:border-[#1E6B40]"
                  }`}
                >
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const mVal = idx * 5;
                    return (
                      <option key={mVal} value={mVal} className={isDark ? "bg-slate-900 text-white" : "bg-[#FFF2DF] text-[#1F1A16]"}>
                        {mVal} min{mVal !== 1 ? "s" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`grid grid-cols-2 gap-3 pt-3.5 mt-3.5 border-t shrink-0 ${
            isDark ? "border-white/10" : "border-[#EADDC7]"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`py-3 rounded-2xl font-bold uppercase text-[10.5px] tracking-wider transition-all border cursor-pointer text-center ${
              isDark
                ? "bg-slate-800 hover:bg-slate-750 text-slate-300 border-white/10"
                : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border-[#EADDC7]"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`py-3 rounded-2xl font-black uppercase text-[10.5px] tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 ${
              isDark
                ? "bg-indigo-600 hover:bg-indigo-550 text-white shadow-indigo-950/40"
                : "bg-[#1E6B40] hover:bg-[#165633] text-white shadow-[#1E6B40]/25"
            }`}
          >
            <Check size={14} strokeWidth={3} />
            Confirm &amp; Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
