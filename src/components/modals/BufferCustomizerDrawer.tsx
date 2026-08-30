import React, { useState } from "react";
import { motion } from "motion/react";
import { Timer, Check, Clock, MapPin, ChevronDown, CheckCircle2 } from "lucide-react";
import { DURATION_HOURS_0_TO_23, FIVE_MIN_INCREMENTS, QUARTER_MINUTES } from "../TimePickBox";

interface BufferCustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customizerBufferType: "before" | "after";
  setCustomizerBufferType?: (val: "before" | "after") => void;
  customizerReason: string;
  setCustomizerReason: (val: string) => void;
  customizerHours: number;
  setCustomizerHours: React.Dispatch<React.SetStateAction<number>>;
  customizerMinutes: number;
  setCustomizerMinutes: React.Dispatch<React.SetStateAction<number>>;
  customizerCompleted?: boolean;
  setCustomizerCompleted?: (val: boolean) => void;
  handleApplyBufferCustomizer: () => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  customizerLocation?: string;
  setCustomizerLocation?: (val: string) => void;
  customizerSameLocation?: boolean;
  setCustomizerSameLocation?: (val: boolean) => void;
  mainTaskLocation?: string;
  availableLocations?: string[];
  flexActivities?: string[];
}

export const BufferCustomizerDrawer: React.FC<BufferCustomizerDrawerProps> = ({
  isOpen,
  onClose,
  customizerBufferType,
  setCustomizerBufferType,
  customizerReason,
  setCustomizerReason,
  customizerHours,
  setCustomizerHours,
  customizerMinutes,
  setCustomizerMinutes,
  customizerCompleted = false,
  setCustomizerCompleted = () => {},
  handleApplyBufferCustomizer,
  triggerHaptic,
  customizerLocation = "",
  setCustomizerLocation = () => {},
  customizerSameLocation = true,
  setCustomizerSameLocation = () => {},
  mainTaskLocation = "",
  availableLocations = [],
  flexActivities = [],
}) => {
  if (!isOpen) return null;

  const totalMinutes = customizerHours * 60 + customizerMinutes;
  const isPre = customizerBufferType === "before";

  const defaultPreActivities = [
    "Preparation", "Warm-up", "Mindfulness", "Setup", "Travel", "Transit", "Driving", "Walking", "Review & Plan", "Buffer", "Transition"
  ];
  const defaultPostActivities = [
    "Wind down", "Wrap-up", "Debrief", "Follow-up", "Travel", "Transit", "Driving", "Walking", "Cooldown", "Cleanup", "Buffer", "Transition"
  ];

  const activityOptions = Array.from(new Set([
    ...(isPre ? defaultPreActivities : defaultPostActivities),
    ...(flexActivities || [])
  ]));

  return (
    <>
      {/* Backdrop Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99990] cursor-pointer"
        title="Touch outside to finish"
      />

      {/* Forefront Bottom / Centered Drawer Sheet */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-indigo-500/30 rounded-t-[28px] p-4 pb-6 z-[99991] shadow-[0_-15px_50px_rgba(0,0,0,0.85)] text-left font-sans text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Drag Grab Bar */}
        <div className="w-10 h-1 bg-slate-800 rounded-full mx-auto mb-3" />

        {/* Header with Type Selector and Completed Checkbox */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              {setCustomizerBufferType ? (
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomizerBufferType("before");
                      triggerHaptic("selection");
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                      isPre ? "bg-teal-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ▲ Pre-Task Buffer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomizerBufferType("after");
                      triggerHaptic("selection");
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                      !isPre ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ▼ Post-Task Buffer
                  </button>
                </div>
              ) : (
                <span className="text-[9.5px] font-black tracking-widest text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-2.5 py-0.5 rounded-full uppercase">
                  {isPre ? "▲ Pre-Task Buffer" : "▼ Post-Task Buffer"}
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-white">
              {isPre ? "Pre-Task Buffer Time & Details" : "Post-Task Buffer Time & Details"}
            </h3>
          </div>

          {/* Buffer Completed Checkbox */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => {
                setCustomizerCompleted(!customizerCompleted);
                triggerHaptic("selection");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all cursor-pointer text-xs font-bold ${
                customizerCompleted
                  ? "bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
              title="Toggle buffer completion status"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                customizerCompleted ? "bg-emerald-500 border-emerald-400 text-slate-950 font-black" : "border-slate-600"
              }`}>
                {customizerCompleted && <Check size={11} strokeWidth={3.5} />}
              </div>
              <span className="text-[10.5px]">Completed</span>
            </button>
            <span className="text-[10px] font-mono font-black text-indigo-400">
              {customizerHours > 0 ? `${customizerHours}h ` : ""}{customizerMinutes}m ({totalMinutes}m)
            </span>
          </div>
        </div>

        {/* Reason / Buffer Type Pulldown Menu & Quick Tags */}
        <div className="space-y-2 mb-3.5 p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[9.5px] font-black uppercase tracking-wider text-indigo-300">
              {isPre ? "Pre-Task Activity Type" : "Post-Task Activity Type"}
            </label>
            <span className="text-[9px] text-slate-400">Select or enter purpose</span>
          </div>

          {/* Activity Type Pulldown Menu */}
          <div className="relative">
            <select
              value={activityOptions.includes(customizerReason) ? customizerReason : "__CUSTOM__"}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "__CUSTOM__") {
                  setCustomizerReason(val);
                  triggerHaptic("selection");
                }
              }}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer"
            >
              <option value="" disabled>-- Select Buffer Type --</option>
              {activityOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
              <option value="__CUSTOM__" className="bg-slate-900 text-indigo-300 font-bold">
                ✏️ Custom activity / purpose...
              </option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>
          
          {/* Quick select tags */}
          <div className="flex flex-wrap gap-1">
            {activityOptions.slice(0, 6).map(reasonOpt => (
              <button
                key={reasonOpt}
                type="button"
                onClick={() => {
                  setCustomizerReason(reasonOpt);
                  triggerHaptic("light");
                }}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                  customizerReason.toLowerCase() === reasonOpt.toLowerCase()
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                }`}
              >
                {reasonOpt}
              </button>
            ))}
          </div>

          {/* Custom Edit Input */}
          <div className="relative">
            <input
              type="text"
              value={customizerReason}
              onChange={(e) => setCustomizerReason(e.target.value)}
              placeholder="Or type a custom buffer purpose..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-bold text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Destination Location Section */}
        <div className="mb-3.5 p-2.5 rounded-xl bg-slate-950/50 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[9.5px] font-black uppercase tracking-wider text-teal-300 flex items-center gap-1">
              <MapPin size={11} className="text-teal-400" />
              {isPre ? "Pre-Task Travel Destination" : "Post-Task Travel Destination"}
            </label>
            <span className="text-[9px] text-slate-400 font-mono">
              {customizerSameLocation ? "Same as Main Task" : "Custom Location"}
            </span>
          </div>

          {/* Same as main task: Yes (default) / No */}
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-slate-300">
              Same destination as main task?
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCustomizerSameLocation(true);
                  triggerHaptic("selection");
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                  customizerSameLocation
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomizerSameLocation(false);
                  triggerHaptic("selection");
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                  !customizerSameLocation
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {customizerSameLocation ? (
            <div className="text-[10.5px] text-slate-400 italic px-1">
              Destination defaults to main task location:{" "}
              <span className="text-teal-300 font-semibold not-italic">
                {mainTaskLocation ? `"${mainTaskLocation}"` : "(No main task location set)"}
              </span>
            </div>
          ) : (
            /* Custom Location Pull-down & Input */
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Select or Enter Destination Location:
              </label>

              {availableLocations.length > 0 && (
                <div className="relative">
                  <select
                    value={customizerLocation}
                    onChange={(e) => {
                      setCustomizerLocation(e.target.value);
                      triggerHaptic("selection");
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-teal-500 appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">-- Choose destination from saved/active locations --</option>
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc} className="bg-slate-900 text-white">
                        {loc}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              )}

              <input
                type="text"
                value={customizerLocation}
                onChange={(e) => setCustomizerLocation(e.target.value)}
                placeholder="Type destination address, venue, or room..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-teal-500 text-xs font-bold text-white placeholder-slate-500"
              />
            </div>
          )}
        </div>

        {/* Hours Pick Boxes (0-23 in 4-wide grid) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">
              Hours (0 - 23)
            </label>
            <span className="text-[9.5px] font-mono font-bold text-indigo-400">
              {customizerHours}h
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 max-h-[105px] overflow-y-auto p-0.5 bg-slate-950/60 rounded-lg border border-white/5 custom-scrollbar">
            {DURATION_HOURS_0_TO_23.map((h) => {
              const isSelected = customizerHours === h;
              return (
                <button
                  key={`customizer-hour-${h}`}
                  type="button"
                  onClick={() => {
                    setCustomizerHours(h);
                    triggerHaptic("selection");
                  }}
                  className={`py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center leading-5 ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/50"
                      : "bg-slate-950/80 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-950/30"
                  }`}
                >
                  {h}h
                </button>
              );
            })}
          </div>
        </div>

        {/* Minutes Pick Boxes (0-60 in 5m increments, 4-wide grid, 15/30/45/00 highlighted in green) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">
              Minutes (0 - 60 in 5m)
            </label>
            <span className="text-[9.5px] font-mono font-bold text-emerald-400">
              {customizerMinutes}m
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/60 rounded-lg border border-white/5">
            {FIVE_MIN_INCREMENTS.map((m) => {
              const isSelected = customizerMinutes === m;
              const isQuarter = QUARTER_MINUTES.includes(m);
              return (
                <button
                  key={`customizer-min-${m}`}
                  type="button"
                  onClick={() => {
                    setCustomizerMinutes(m);
                    triggerHaptic("selection");
                  }}
                  className={`relative py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center leading-5 ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400/50"
                      : isQuarter
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 shadow-[0_0_6px_rgba(16,185,129,0.15)] font-black"
                      : "bg-slate-950/80 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60"
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              triggerHaptic("light");
            }}
            className="py-2.5 px-3 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg font-bold uppercase text-[9.5px] tracking-wider hover:text-white transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              handleApplyBufferCustomizer();
              triggerHaptic("success");
            }}
            className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold uppercase text-[9.5px] tracking-wider transition-colors cursor-pointer text-center shadow-glow flex items-center justify-center gap-1"
          >
            <Check size={13} strokeWidth={3} />
            <span>Apply Buffer</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};
