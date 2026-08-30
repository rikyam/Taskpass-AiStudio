import React, { useState, useRef, useEffect } from "react";
import { Plus, Minus, ChevronDown, Check, Edit3, Trash2, X, PlusCircle, Clock, Car } from "lucide-react";

export interface BufferDurationClusterProps {
  label: string;
  bufferType: "before" | "after";
  minutes: number;
  onMinutesChange: (mins: number) => void;
  selectedPurpose: string;
  onPurposeChange: (purpose: string) => void;
  flexActivities: string[];
  onAddNewFlexActivity: (name: string) => void;
  onRenameFlexActivity: (oldName: string, newName: string) => void;
  onDeleteFlexActivity: (name: string) => void;
  taskLocation?: string;
  onEstimateTravel?: () => Promise<void> | void;
  isEstimatingTravel?: boolean;
  isDark?: boolean;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

export const BufferDurationCluster: React.FC<BufferDurationClusterProps> = ({
  label,
  bufferType,
  minutes,
  onMinutesChange,
  selectedPurpose,
  onPurposeChange,
  flexActivities,
  onAddNewFlexActivity,
  onRenameFlexActivity,
  onDeleteFlexActivity,
  taskLocation,
  onEstimateTravel,
  isEstimatingTravel,
  isDark = true,
  triggerHaptic = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
        setEditingKey(null);
        setDeletingKey(null);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleIncrement = () => {
    triggerHaptic("light");
    onMinutesChange(minutes + 15);
  };

  const handleDecrement = () => {
    triggerHaptic("light");
    onMinutesChange(Math.max(0, minutes - 15));
  };

  const handleSelectPurpose = (act: string) => {
    triggerHaptic("selection");
    onPurposeChange(act);
    setIsOpen(false);
    setIsAddingNew(false);
    setEditingKey(null);
    setDeletingKey(null);
  };

  const handleSaveNewType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    triggerHaptic("success");
    onAddNewFlexActivity(trimmed);
    onPurposeChange(trimmed);
    setNewTypeName("");
    setIsAddingNew(false);
  };

  const handleSaveRename = (oldName: string) => {
    const trimmed = editingVal.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingKey(null);
      return;
    }
    triggerHaptic("success");
    onRenameFlexActivity(oldName, trimmed);
    if (selectedPurpose === oldName) {
      onPurposeChange(trimmed);
    }
    setEditingKey(null);
  };

  const handleDelete = (name: string) => {
    triggerHaptic("medium");
    onDeleteFlexActivity(name);
    if (selectedPurpose === name) {
      const remaining = flexActivities.filter((a) => a !== name);
      onPurposeChange(remaining.length > 0 ? remaining[0] : (bufferType === "before" ? "Preparation" : "Wrap-up"));
    }
    setDeletingKey(null);
  };

  // Format duration display
  const formatDurationText = (mins: number) => {
    if (mins === 0) return "0 min";
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hr`;
  };

  const isPre = bufferType === "before";
  const accentColor = isPre ? "emerald" : "indigo";
  const hasDuration = minutes > 0;

  return (
    <div className="space-y-1.5 flex-1 min-w-[200px]" ref={containerRef}>
      {/* Cluster Label & Duration Badge */}
      <div className="flex items-center justify-between px-0.5">
        <label className={`text-[10px] font-black uppercase tracking-wider ${
          isPre 
            ? (isDark ? "text-emerald-400" : "text-emerald-600") 
            : (isDark ? "text-indigo-400" : "text-indigo-600")
        }`}>
          {label}
        </label>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
          hasDuration
            ? isPre
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
            : isDark
              ? "bg-slate-800/40 border-white/5 text-slate-400"
              : "bg-slate-100 border-slate-200 text-slate-500"
        }`}>
          {formatDurationText(minutes)}
        </span>
      </div>

      {/* Button Cluster Container */}
      <div className="relative">
        <div className={`flex items-stretch rounded-xl border shadow-sm transition-all overflow-hidden ${
          hasDuration
            ? isPre
              ? "border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.12)]"
              : "border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.12)]"
            : isDark
              ? "border-white/10 bg-slate-950/60 hover:border-white/20"
              : "border-slate-300 bg-white hover:border-slate-400"
        } ${isDark ? "bg-slate-950/80" : "bg-slate-50/90"}`}>
          
          {/* Left Minus Button (-15m) */}
          <button
            type="button"
            id={`${bufferType}-buffer-minus-btn`}
            onClick={handleDecrement}
            disabled={minutes <= 0}
            title="Decrease 15 min"
            className={`w-10 sm:w-11 flex items-center justify-center shrink-0 border-r transition-all cursor-pointer select-none active:scale-95 ${
              isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-700"
            } ${
              minutes <= 0
                ? "opacity-30 cursor-not-allowed"
                : isPre
                  ? "hover:bg-emerald-500/15 hover:text-emerald-300"
                  : "hover:bg-indigo-500/15 hover:text-indigo-300"
            }`}
          >
            <Minus size={15} strokeWidth={2.5} />
          </button>

          {/* Center Pull Down Menu Button */}
          <button
            type="button"
            id={`${bufferType}-buffer-pulldown-btn`}
            onClick={() => {
              triggerHaptic("light");
              setIsOpen(!isOpen);
            }}
            title="Select, Add, Edit, or Delete Buffer Type"
            className={`flex-1 flex items-center justify-between px-2.5 py-2 min-w-0 transition-all cursor-pointer select-none text-left ${
              isDark ? "text-slate-100 hover:bg-white/5" : "text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <Clock size={13} className={`shrink-0 ${
                hasDuration 
                  ? (isPre ? "text-emerald-400" : "text-indigo-400") 
                  : (isDark ? "text-slate-400" : "text-slate-500")
              }`} />
              <span className="text-xs font-bold truncate">
                {selectedPurpose || (isPre ? "Preparation" : "Wrap-up")}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              <span className={`text-[10px] font-black tracking-tight ${
                hasDuration 
                  ? (isPre ? "text-emerald-400 font-extrabold" : "text-indigo-400 font-extrabold") 
                  : (isDark ? "text-slate-400" : "text-slate-500")
              }`}>
                {minutes > 0 ? `+${minutes}m` : "Off"}
              </span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`} 
              />
            </div>
          </button>

          {/* Right Plus Button (+15m) */}
          <button
            type="button"
            id={`${bufferType}-buffer-plus-btn`}
            onClick={handleIncrement}
            title="Add 15 min"
            className={`w-10 sm:w-11 flex items-center justify-center shrink-0 border-l transition-all cursor-pointer select-none active:scale-95 ${
              isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-700"
            } ${
              isPre
                ? "hover:bg-emerald-500/15 hover:text-emerald-300"
                : "hover:bg-indigo-500/15 hover:text-indigo-300"
            }`}
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Dropdown Menu (Center Pull-Down) with Add, Edit, Delete */}
        {isOpen && (
          <div className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl backdrop-blur-xl p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150 ${
            isDark 
              ? "bg-slate-900/95 border-white/15 text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.8)]" 
              : "bg-white/95 border-slate-200 text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
          }`}>
            {/* Header & Quick Action */}
            <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Buffer Types
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400 font-bold">
                  {flexActivities.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(!isAddingNew);
                  setEditingKey(null);
                  setDeletingKey(null);
                }}
                className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  isAddingNew
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300"
                }`}
              >
                {isAddingNew ? <X size={11} /> : <PlusCircle size={11} />}
                <span>{isAddingNew ? "Cancel" : "New Type"}</span>
              </button>
            </div>

            {/* Pre-Trip Commute Auto-Estimate Button */}
            {bufferType === "before" && onEstimateTravel && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  triggerHaptic("selection");
                  await onEstimateTravel();
                  setIsOpen(false);
                }}
                disabled={isEstimatingTravel}
                title="Estimate real-world driving/transit commute duration and set Pre-Trip Flex duration"
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none active:scale-98 ${
                  isEstimatingTravel
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 animate-pulse cursor-wait"
                    : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Car size={13} className={`shrink-0 ${isEstimatingTravel ? "animate-spin" : "text-emerald-400"}`} />
                  <span className="text-xs font-black truncate">
                    {isEstimatingTravel
                      ? "Calculating Commute..."
                      : taskLocation
                        ? `Estimate Commute to ${taskLocation.split(",")[0]}`
                        : "Estimate Travel Commute"}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 tracking-wider shrink-0">
                  ⚡ Auto Flex
                </span>
              </button>
            )}

            {/* Inline Add New Form */}
            {isAddingNew && (
              <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                isDark ? "bg-slate-950/60 border-indigo-500/30" : "bg-indigo-50/50 border-indigo-200"
              }`}>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Travel, Setup, Mindfulness..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveNewType();
                    } else if (e.key === "Escape") {
                      setIsAddingNew(false);
                    }
                  }}
                  className={`flex-1 h-7 px-2 rounded-lg text-xs font-bold outline-none border ${
                    isDark
                      ? "bg-slate-900 border-white/10 text-white focus:border-indigo-400"
                      : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSaveNewType}
                  disabled={!newTypeName.trim()}
                  className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shrink-0 shadow-sm"
                >
                  Add
                </button>
              </div>
            )}

            {/* List of Buffer Types with Inline Edit & Delete */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
              {flexActivities.map((act) => {
                const isSelected = selectedPurpose === act;
                const isEditing = editingKey === act;
                const isDeleting = deletingKey === act;

                if (isEditing) {
                  return (
                    <div
                      key={act}
                      className={`p-1.5 rounded-xl border flex items-center gap-1.5 ${
                        isDark ? "bg-slate-950 border-indigo-500/40" : "bg-slate-100 border-indigo-300"
                      }`}
                    >
                      <input
                        type="text"
                        value={editingVal}
                        onChange={(e) => setEditingVal(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveRename(act);
                          } else if (e.key === "Escape") {
                            setEditingKey(null);
                          }
                        }}
                        className={`flex-1 h-6 px-2 rounded-lg text-xs font-bold outline-none border ${
                          isDark
                            ? "bg-slate-900 border-white/10 text-white focus:border-indigo-400"
                            : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(act)}
                        className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                        title="Save Rename"
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingKey(null)}
                        className="p-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={act}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? isPre
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : isDark
                          ? "hover:bg-white/5 text-slate-300 hover:text-white"
                          : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                    }`}
                    onClick={() => handleSelectPurpose(act)}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      {isSelected && (
                        <Check size={13} className={`shrink-0 ${isPre ? "text-emerald-400" : "text-indigo-400"}`} strokeWidth={3} />
                      )}
                      <span className="truncate">{act}</span>
                    </div>

                    {/* Action buttons: Edit & Delete */}
                    <div 
                      className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-rose-400 font-bold">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(act)}
                            className="p-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                            title="Confirm Delete"
                          >
                            <Check size={11} strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingKey(null)}
                            className="p-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingKey(act);
                              setEditingVal(act);
                              setDeletingKey(null);
                            }}
                            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                            title="Edit / Rename"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingKey(act);
                              setEditingKey(null);
                            }}
                            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Type"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Duration Preset Shortcuts Footer */}
            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold text-slate-400">Quick set:</span>
              <div className="flex items-center gap-1">
                {[0, 15, 30, 45, 60].map((presetMins) => (
                  <button
                    key={presetMins}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onMinutesChange(presetMins);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                      minutes === presetMins
                        ? isPre
                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                          : "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
                        : isDark
                          ? "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white"
                          : "bg-slate-200/80 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {presetMins === 0 ? "Off" : `${presetMins}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { CondensedBufferRow } from "./CondensedBufferRow";
export type { CondensedBufferRowProps } from "./CondensedBufferRow";
