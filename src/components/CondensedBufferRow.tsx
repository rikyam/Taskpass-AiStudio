import React, { useState, useRef, useEffect } from "react";
import { Plus, Minus, ChevronDown, Check, Edit3, Trash2, X, PlusCircle, Clock, Car } from "lucide-react";

export interface CondensedBufferRowProps {
  preMinutes: number;
  onPreMinutesChange: (mins: number) => void;
  prePurpose: string;
  onPrePurposeChange: (purpose: string) => void;
  postMinutes: number;
  onPostMinutesChange: (mins: number) => void;
  postPurpose: string;
  onPostPurposeChange: (purpose: string) => void;
  flexActivities: string[];
  onAddNewFlexActivity: (name: string) => void;
  onRenameFlexActivity: (oldName: string, newName: string) => void;
  onDeleteFlexActivity: (name: string) => void;
  taskLocation?: string;
  onEstimateTravel?: () => Promise<void> | void;
  isEstimatingTravel?: boolean;
  isDark?: boolean;
  onOpenBufferEditWindow?: (type: "before" | "after") => void;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

interface SingleClusterProps {
  bufferType: "before" | "after";
  labelPrefix: "Pre" | "Post";
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
  isDark: boolean;
  onOpenBufferEditWindow?: (type: "before" | "after") => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

const CondensedCluster: React.FC<SingleClusterProps> = ({
  bufferType,
  labelPrefix,
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
  isDark,
  onOpenBufferEditWindow,
  triggerHaptic,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isPre = bufferType === "before";
  const hasDuration = minutes > 0;

  // Close dropdown on click outside
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

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    onMinutesChange(minutes + 15);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      onPurposeChange(remaining.length > 0 ? remaining[0] : (isPre ? "Preparation" : "Wrap-up"));
    }
    setDeletingKey(null);
  };

  const displayPurpose = selectedPurpose || (isPre ? "Prep" : "Wrap-up");

  return (
    <div className="relative flex-1 min-w-0" ref={containerRef}>
      {/* Compact Cluster Capsule */}
      <div
        className={`flex items-stretch h-7 sm:h-7.5 rounded-lg border transition-all select-none overflow-hidden ${
          hasDuration
            ? isPre
              ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_6px_rgba(16,185,129,0.15)] text-emerald-300"
              : "border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_6px_rgba(99,102,241,0.15)] text-indigo-300"
            : isDark
              ? "border-white/10 bg-slate-900/80 hover:border-white/20 text-slate-300"
              : "border-slate-300 bg-white hover:border-slate-400 text-slate-700"
        }`}
      >
        {/* Left Minus Button (-15m) */}
        <button
          type="button"
          id={`${bufferType}-buffer-condensed-minus`}
          onClick={handleDecrement}
          disabled={minutes <= 0}
          title={`Decrease ${labelPrefix}-Buffer (-15 min)`}
          className={`w-5.5 sm:w-6 flex items-center justify-center shrink-0 border-r transition-all cursor-pointer select-none active:scale-90 ${
            isDark ? "border-white/10" : "border-slate-200"
          } ${
            minutes <= 0
              ? "opacity-25 cursor-not-allowed text-slate-500"
              : isPre
                ? "hover:bg-emerald-500/20 hover:text-emerald-200 text-emerald-400"
                : "hover:bg-indigo-500/20 hover:text-indigo-200 text-indigo-400"
          }`}
        >
          <Minus size={10} strokeWidth={2.5} />
        </button>

        {/* Center Pull-Down Trigger */}
        <button
          type="button"
          id={`${bufferType}-buffer-condensed-pulldown`}
          onClick={() => {
            triggerHaptic("light");
            setIsOpen(!isOpen);
          }}
          title={`Click to choose ${labelPrefix}-Buffer Type or quick presets`}
          className={`flex-1 flex items-center justify-between px-1 min-w-0 cursor-pointer text-left transition-colors ${
            isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
          }`}
        >
          {/* Prefix Badge + Name */}
          <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 truncate mr-0.5">
            <span
              className={`text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider px-0.5 sm:px-1 py-0.2 rounded shrink-0 leading-none ${
                isPre
                  ? hasDuration
                    ? "bg-emerald-500/25 text-emerald-300 font-extrabold"
                    : "bg-emerald-500/15 text-emerald-400"
                  : hasDuration
                    ? "bg-indigo-500/25 text-indigo-300 font-extrabold"
                    : "bg-indigo-500/15 text-indigo-400"
              }`}
            >
              {labelPrefix}
            </span>
            <span className="text-[9.5px] sm:text-[10px] font-bold truncate max-w-[42px] sm:max-w-[56px]">
              {displayPurpose}
            </span>
          </div>

          {/* Duration Badge & Chevron */}
          <div className="flex items-center gap-0.5 shrink-0">
            <span
              className={`text-[8.5px] sm:text-[9px] font-black tracking-tight ${
                hasDuration
                  ? isPre
                    ? "text-emerald-400"
                    : "text-indigo-400"
                  : isDark
                    ? "text-slate-400"
                    : "text-slate-500"
              }`}
            >
              {minutes > 0 ? `${minutes}m` : "Off"}
            </span>
            <ChevronDown
              size={9}
              className={`transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""} ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            />
          </div>
        </button>

        {/* Right Plus Button (+15m) */}
        <button
          type="button"
          id={`${bufferType}-buffer-condensed-plus`}
          onClick={handleIncrement}
          title={`Add ${labelPrefix}-Buffer (+15 min)`}
          className={`w-5.5 sm:w-6 flex items-center justify-center shrink-0 border-l transition-all cursor-pointer select-none active:scale-90 ${
            isDark ? "border-white/10" : "border-slate-200"
          } ${
            isPre
              ? "hover:bg-emerald-500/20 hover:text-emerald-200 text-emerald-400"
              : "hover:bg-indigo-500/20 hover:text-indigo-200 text-indigo-400"
          }`}
        >
          <Plus size={10} strokeWidth={2.5} />
        </button>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 w-56 sm:w-60 mt-1.5 z-50 rounded-xl border shadow-2xl backdrop-blur-xl p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150 ${
            isPre ? "origin-top-left" : "right-0 left-auto origin-top-right"
          } ${
            isDark
              ? "bg-slate-900/95 border-white/15 text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
              : "bg-white/95 border-slate-200 text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-black uppercase tracking-wider ${isPre ? "text-emerald-400" : "text-indigo-400"}`}>
                {labelPrefix}-Buffer Types
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-bold">
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
              className={`text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
                isAddingNew
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300"
              }`}
            >
              {isAddingNew ? <X size={10} /> : <PlusCircle size={10} />}
              <span>{isAddingNew ? "Cancel" : "New"}</span>
            </button>
          </div>

          {/* Pre-Trip Commute Auto-Estimate Button */}
          {isPre && onEstimateTravel && (
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
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all cursor-pointer select-none active:scale-98 ${
                isEstimatingTravel
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 animate-pulse cursor-wait"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Car size={12} className={`shrink-0 ${isEstimatingTravel ? "animate-spin" : "text-emerald-400"}`} />
                <span className="text-[10px] font-black truncate">
                  {isEstimatingTravel
                    ? "Calculating Travel..."
                    : taskLocation
                      ? `Estimate (${taskLocation.split(",")[0].slice(0, 16)})`
                      : "Estimate Travel Duration"}
                </span>
              </div>
              <span className="text-[8.5px] font-extrabold uppercase px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-200 tracking-wider shrink-0">
                ⚡ Auto Flex
              </span>
            </button>
          )}

          {/* Inline Add New Form */}
          {isAddingNew && (
            <div
              className={`p-1.5 rounded-xl border flex items-center gap-1.5 ${
                isDark ? "bg-slate-950/60 border-indigo-500/30" : "bg-indigo-50/50 border-indigo-200"
              }`}
            >
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. Transit, Prep, Wrap-up..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveNewType();
                  } else if (e.key === "Escape") {
                    setIsAddingNew(false);
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
                onClick={handleSaveNewType}
                disabled={!newTypeName.trim()}
                className="h-6 px-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer shrink-0 shadow-sm"
              >
                Add
              </button>
            </div>
          )}

          {/* List of Types */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
            {flexActivities.map((act) => {
              const isSelected = selectedPurpose === act;
              const isEditing = editingKey === act;
              const isDeleting = deletingKey === act;

              if (isEditing) {
                return (
                  <div
                    key={act}
                    className={`p-1 rounded-xl border flex items-center gap-1 ${
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
                      className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      title="Save"
                    >
                      <Check size={11} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="p-1 rounded-md bg-slate-700 text-slate-300 cursor-pointer"
                      title="Cancel"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={act}
                  onClick={() => handleSelectPurpose(act)}
                  className={`group flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? isPre
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : isDark
                        ? "hover:bg-white/5 text-slate-300 hover:text-white"
                        : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    {isSelected && (
                      <Check
                        size={12}
                        className={`shrink-0 ${isPre ? "text-emerald-400" : "text-indigo-400"}`}
                        strokeWidth={3}
                      />
                    )}
                    <span className="truncate">{act}</span>
                  </div>

                  {/* Edit/Delete Actions */}
                  <div
                    className="flex items-center gap-0.5 shrink-0 opacity-75 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[8.5px] text-rose-400 font-bold">Del?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(act)}
                          className="p-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                        >
                          <Check size={10} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingKey(null)}
                          className="p-0.5 rounded bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          <X size={10} />
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
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-indigo-300 cursor-pointer"
                          title="Rename"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingKey(act);
                            setEditingKey(null);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Preset shortcuts footer */}
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
                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold transition-all cursor-pointer ${
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

            {/* Open Full Buffer Edit Window */}
            {onOpenBufferEditWindow && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setIsOpen(false);
                  onOpenBufferEditWindow(bufferType);
                }}
                className={`w-full mt-1 py-1 px-2 rounded-lg text-[9.5px] font-bold text-center border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  isDark
                    ? "bg-slate-800/80 hover:bg-slate-700 border-white/10 text-indigo-300 hover:text-white"
                    : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
                }`}
              >
                <span>Edit {labelPrefix}-Task Details & Location</span>
                <span>↗</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CondensedBufferRow: React.FC<CondensedBufferRowProps> = ({
  preMinutes,
  onPreMinutesChange,
  prePurpose,
  onPrePurposeChange,
  postMinutes,
  onPostMinutesChange,
  postPurpose,
  onPostPurposeChange,
  flexActivities,
  onAddNewFlexActivity,
  onRenameFlexActivity,
  onDeleteFlexActivity,
  taskLocation,
  onEstimateTravel,
  isEstimatingTravel,
  isDark = true,
  onOpenBufferEditWindow,
  triggerHaptic = () => {},
}) => {
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[340px]">
      <CondensedCluster
        bufferType="before"
        labelPrefix="Pre"
        minutes={preMinutes}
        onMinutesChange={onPreMinutesChange}
        selectedPurpose={prePurpose}
        onPurposeChange={onPrePurposeChange}
        flexActivities={flexActivities}
        onAddNewFlexActivity={onAddNewFlexActivity}
        onRenameFlexActivity={onRenameFlexActivity}
        onDeleteFlexActivity={onDeleteFlexActivity}
        taskLocation={taskLocation}
        onEstimateTravel={onEstimateTravel}
        isEstimatingTravel={isEstimatingTravel}
        isDark={isDark}
        onOpenBufferEditWindow={onOpenBufferEditWindow}
        triggerHaptic={triggerHaptic}
      />
      <CondensedCluster
        bufferType="after"
        labelPrefix="Post"
        minutes={postMinutes}
        onMinutesChange={onPostMinutesChange}
        selectedPurpose={postPurpose}
        onPurposeChange={onPostPurposeChange}
        flexActivities={flexActivities}
        onAddNewFlexActivity={onAddNewFlexActivity}
        onRenameFlexActivity={onRenameFlexActivity}
        onDeleteFlexActivity={onDeleteFlexActivity}
        isDark={isDark}
        onOpenBufferEditWindow={onOpenBufferEditWindow}
        triggerHaptic={triggerHaptic}
      />
    </div>
  );
};
