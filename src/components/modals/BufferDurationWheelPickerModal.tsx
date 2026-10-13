import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock, Check, X, RotateCcw } from "lucide-react";

export interface BufferDurationWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bufferType: "before" | "after";
  labelPrefix?: string; // "Pre" or "Post"
  initialMinutes?: number;
  onConfirm: (minutes: number) => void;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  isDark?: boolean;
}

// 0 to 23 hours
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => i);
// 0 to 55 minutes in 5-minute increments
const MINUTES_LIST = Array.from({ length: 12 }, (_, i) => i * 5);

const ITEM_HEIGHT = 44; // height of each wheel item in px
const VISIBLE_ITEMS = 5; // visible items in the wheel

interface WheelColumnProps {
  items: number[];
  selectedValue: number;
  onSelect: (val: number) => void;
  unit: string;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  isDark?: boolean;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedValue,
  onSelect,
  unit,
  triggerHaptic,
  isDark = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to selected item on mount or when selection changes externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isUserScrollingRef.current) return;
    const index = items.indexOf(selectedValue);
    if (index >= 0) {
      el.scrollTop = index * ITEM_HEIGHT;
    }
  }, [selectedValue, items]);

  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      // Snap to exact position
      el.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: "smooth" });
      const newVal = items[clampedIndex];
      if (newVal !== selectedValue) {
        onSelect(newVal);
        if (triggerHaptic) triggerHaptic("selection");
      }
      isUserScrollingRef.current = false;
    }, 90);
  }, [items, onSelect, selectedValue, triggerHaptic]);

  // Click an item to center it
  const handleItemClick = (item: number) => {
    const el = scrollRef.current;
    const index = items.indexOf(item);
    if (index >= 0 && el) {
      el.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
      onSelect(item);
      if (triggerHaptic) triggerHaptic("light");
    }
  };

  return (
    <div className="relative flex-1 flex flex-col items-center select-none">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
        {unit}
      </div>

      <div className="relative w-full overflow-hidden" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
        {/* Selection Highlight Window */}
        <div
          className={`absolute left-2 right-2 rounded-xl pointer-events-none z-10 border transition-all ${
            isDark
              ? "bg-white/10 border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              : "bg-[#1E6B40]/10 border-[#1E6B40]/40 shadow-xs"
          }`}
          style={{
            top: ITEM_HEIGHT * 2,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Top Fade Gradient */}
        <div
          className={`absolute inset-x-0 top-0 pointer-events-none z-20 ${
            isDark
              ? "bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent"
              : "bg-gradient-to-b from-[#FFF2DF] via-[#FFF2DF]/80 to-transparent"
          }`}
          style={{ height: ITEM_HEIGHT * 1.5 }}
        />

        {/* Bottom Fade Gradient */}
        <div
          className={`absolute inset-x-0 bottom-0 pointer-events-none z-20 ${
            isDark
              ? "bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"
              : "bg-gradient-to-t from-[#FFF2DF] via-[#FFF2DF]/80 to-transparent"
          }`}
          style={{ height: ITEM_HEIGHT * 1.5 }}
        />

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto no-scrollbar snap-y snap-mandatory"
          style={{
            paddingTop: ITEM_HEIGHT * 2,
            paddingBottom: ITEM_HEIGHT * 2,
            scrollSnapType: "y mandatory",
          }}
        >
          {items.map((val) => {
            const isSelected = val === selectedValue;
            return (
              <div
                key={val}
                onClick={() => handleItemClick(val)}
                className={`snap-center flex items-center justify-center font-mono cursor-pointer transition-all ${
                  isSelected
                    ? isDark
                      ? "text-xl font-black text-indigo-300 scale-110"
                      : "text-xl font-black text-[#1E6B40] scale-110"
                    : isDark
                      ? "text-sm font-semibold text-slate-500 hover:text-slate-300"
                      : "text-sm font-semibold text-slate-400 hover:text-slate-700"
                }`}
                style={{ height: ITEM_HEIGHT }}
              >
                <span>
                  {unit === "Hours" ? `${val}h` : `${val.toString().padStart(2, "0")}m`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const BufferDurationWheelPickerModal: React.FC<BufferDurationWheelPickerModalProps> = ({
  isOpen,
  onClose,
  bufferType,
  labelPrefix = bufferType === "before" ? "Pre" : "Post",
  initialMinutes,
  onConfirm,
  triggerHaptic,
  isDark = true,
}) => {
  // Default to 0 hours and 30 minutes if unspecified, or parse initialMinutes
  const initHours = initialMinutes !== undefined && initialMinutes > 0
    ? Math.floor(initialMinutes / 60)
    : 0;
  const initMins = initialMinutes !== undefined && initialMinutes > 0
    ? Math.round((initialMinutes % 60) / 5) * 5
    : 30;

  const [hours, setHours] = useState<number>(initHours);
  const [minutes, setMinutes] = useState<number>(initMins);

  useEffect(() => {
    if (isOpen) {
      if (initialMinutes !== undefined && initialMinutes > 0) {
        setHours(Math.floor(initialMinutes / 60));
        setMinutes(Math.round((initialMinutes % 60) / 5) * 5);
      } else {
        // Defaults: 0 hours, 30 minutes
        setHours(0);
        setMinutes(30);
      }
    }
  }, [isOpen, initialMinutes]);

  if (!isOpen) return null;

  const totalMinutes = hours * 60 + minutes;
  const isPre = bufferType === "before";

  const handleApply = () => {
    if (triggerHaptic) triggerHaptic("success");
    onConfirm(totalMinutes);
    onClose();
  };

  const handleReset = () => {
    if (triggerHaptic) triggerHaptic("light");
    setHours(0);
    setMinutes(30);
  };

  return createPortal(
    <div
      id="buffer-duration-wheel-modal-backdrop"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="buffer-duration-wheel-modal-window"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`w-full max-w-xs sm:max-w-sm flex flex-col p-5 rounded-3xl border-2 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${
          isDark
            ? "bg-slate-900 border-white/20 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
            : "bg-[#FFF2DF] border-[#EADDC7] text-[#1F1A16] shadow-[0_20px_60px_rgba(61,49,42,0.25)]"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
          isDark ? "border-white/10" : "border-[#EADDC7]"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isPre ? "bg-emerald-500" : "bg-indigo-500"}`} />
            <h3 className="text-sm font-black tracking-tight">
              {labelPrefix}-Task Duration Wheel
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-[#7A6B5C] hover:text-[#1F1A16] hover:bg-[#EADDC7]"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Total Display Banner */}
        <div className={`py-2 px-3 rounded-2xl border flex items-center justify-between mb-4 ${
          isDark
            ? "bg-slate-950/80 border-white/10"
            : "bg-[#FAF3E0] border-[#EADDC7]"
        }`}>
          <div className="flex items-center gap-2">
            <Clock size={16} className={isPre ? "text-emerald-400" : "text-indigo-400"} />
            <span className="text-xs font-bold text-slate-400">Total Duration:</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-black font-mono tracking-tight ${
              isPre
                ? (isDark ? "text-emerald-300" : "text-[#1E6B40]")
                : (isDark ? "text-indigo-300" : "text-indigo-600")
            }`}>
              {hours > 0 ? `${hours}h ` : ""}{minutes}m
            </span>
            <span className="text-[10px] text-slate-500 font-mono">({totalMinutes} min)</span>
          </div>
        </div>

        {/* Dual Wheel Picker: Hours & Minutes in 5-min increments */}
        <div className={`p-3 rounded-2xl border flex items-center justify-center gap-2 relative ${
          isDark
            ? "bg-slate-950/60 border-white/5"
            : "bg-white/60 border-[#EADDC7]"
        }`}>
          <WheelColumn
            items={HOURS_LIST}
            selectedValue={hours}
            onSelect={setHours}
            unit="Hours"
            triggerHaptic={triggerHaptic}
            isDark={isDark}
          />

          {/* Center Colon Separator */}
          <div className="flex flex-col items-center justify-center pt-5">
            <span className={`text-xl font-black font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              :
            </span>
          </div>

          <WheelColumn
            items={MINUTES_LIST}
            selectedValue={minutes}
            onSelect={setMinutes}
            unit="Minutes (5m)"
            triggerHaptic={triggerHaptic}
            isDark={isDark}
          />
        </div>

        {/* Quick Presets / Reset Chips */}
        <div className="flex items-center justify-between mt-3 mb-4 px-1">
          <button
            type="button"
            onClick={handleReset}
            className={`text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isDark ? "text-slate-400 hover:text-white" : "text-[#7A6B5C] hover:text-[#1F1A16]"
            }`}
            title="Reset to 0h 30m default"
          >
            <RotateCcw size={11} />
            <span>Default (0h 30m)</span>
          </button>

          <div className="flex items-center gap-1">
            {[0, 15, 30, 45, 60].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setHours(Math.floor(preset / 60));
                  setMinutes(preset % 60);
                  if (triggerHaptic) triggerHaptic("light");
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                  totalMinutes === preset
                    ? isDark
                      ? "bg-indigo-600 text-white border-indigo-400"
                      : "bg-[#1E6B40] text-white border-[#1E6B40]"
                    : isDark
                      ? "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      : "bg-[#FAF3E0] border-[#EADDC7] text-[#594B3E] hover:bg-[#F2E5D0]"
                }`}
              >
                {preset === 0 ? "Off" : `${preset}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`py-2.5 px-3 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer text-center border ${
              isDark
                ? "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                : "bg-[#FAF3E0] border-[#EADDC7] text-[#7A6B5C] hover:text-[#1F1A16]"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={`py-2.5 px-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1 text-white shadow-md active:scale-95 ${
              isPre
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30"
            }`}
          >
            <Check size={13} strokeWidth={3} />
            <span>Set Duration</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
