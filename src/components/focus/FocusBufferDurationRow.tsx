import React from "react";
import { Play, Pause, Check } from "lucide-react";
import { Task } from "../../types";

interface FocusBufferDurationRowProps {
  currentFocusTarget: Task;
  isDark: boolean;
  getState: (taskId: string, bufferType: "before" | "after") => string;
  updateTaskDurationOrBuffer: (targetId: string, minutes: number) => void;
  updateTaskBufferPurposeDirect: (taskId: string, bufferType: "before" | "after", purpose: string) => void;
  setCustomizerTaskId: (id: string) => void;
  setCustomizerBufferType: (type: "before" | "after") => void;
  setCustomizerHours: (h: number) => void;
  setCustomizerMinutes: (m: number) => void;
  setCustomizerReason: (r: string) => void;
  setShowBufferCustomizer: (show: boolean) => void;
  setShowManageFlexActivities: (show: boolean) => void;
  handleBufferBottomButtonClick: (task: Task, bufferType: "before" | "after") => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  flexActivities?: string[];
}

export const FocusBufferDurationRow: React.FC<FocusBufferDurationRowProps> = ({
  currentFocusTarget,
  isDark,
  getState,
  updateTaskDurationOrBuffer,
  updateTaskBufferPurposeDirect,
  setCustomizerTaskId,
  setCustomizerBufferType,
  setCustomizerHours,
  setCustomizerMinutes,
  setCustomizerReason,
  setShowBufferCustomizer,
  setShowManageFlexActivities,
  handleBufferBottomButtonClick,
  triggerHaptic,
  flexActivities,
}) => {
  return (
    <div className={`flex flex-row items-center justify-center gap-2 w-full max-w-[360px] pt-2.5 mt-1 border-t border-dashed ${
      isDark ? "border-slate-800" : "border-slate-200"
    }`}>
      {/* Pre-Task Buffer Duration Timer */}
      <div className={`flex items-center gap-1.5 p-1 px-1.5 rounded-xl transition-all border flex-1 min-w-0 ${
        getState(currentFocusTarget.id, "before") !== "idle"
          ? isDark ? "bg-indigo-950/40 border-indigo-500/40 text-white" : "bg-indigo-50 border-indigo-300 text-indigo-900"
          : isDark ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-md" : "bg-gray-50 border-slate-250 text-slate-900 shadow-sm"
      }`} style={{ maxWidth: "174px" }}>
        {/* Left part: trigger edit, label, current value */}
        <div className="flex flex-col items-start px-0.5 leading-tight select-none flex-1 min-w-0">
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-[8px] font-black uppercase tracking-wider text-indigo-400 truncate">
              Pre-Task
            </span>
            {currentFocusTarget.travelBefore > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTaskDurationOrBuffer(currentFocusTarget.id + "_before", 0);
                  triggerHaptic("medium");
                }}
                className="text-[7.5px] font-extrabold uppercase text-rose-500 hover:text-rose-400 cursor-pointer p-0 leading-none transition-colors"
                title="Clear Pre-Task Buffer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Touchable Duration Button with Pre-Task Type Selector that activates the Pre-Task Card Edit Window */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setCustomizerTaskId(currentFocusTarget.id);
              setCustomizerBufferType("before");
              const mins = currentFocusTarget.travelBefore || 0;
              setCustomizerHours(Math.floor(mins / 60));
              setCustomizerMinutes(mins % 60);
              setCustomizerReason(currentFocusTarget.beforeBufferPurpose || "Preparation");
              setShowBufferCustomizer(true);
              triggerHaptic("medium");
            }}
            className="relative group cursor-pointer w-full mt-0.5"
          >
            <div className="flex items-center gap-1 cursor-pointer">
              <span className={`text-xs font-mono font-black border-b border-dashed transition-all hover:border-indigo-500 hover:text-indigo-400 ${
                isDark ? "text-slate-100 border-slate-700" : "text-slate-900 border-slate-300"
              }`}>
                {currentFocusTarget.travelBefore || 0}m
              </span>
              <span className="text-[8.5px] font-sans font-bold text-indigo-400 hover:text-indigo-300 truncate max-w-[55px] flex items-center gap-0.5">
                {currentFocusTarget.beforeBufferPurpose || "Prep"} ▾
              </span>
            </div>
          </div>
        </div>

        {/* Middle part: - / + adjusters */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextVal = Math.max(0, (currentFocusTarget.travelBefore || 0) - 5);
              updateTaskDurationOrBuffer(currentFocusTarget.id + "_before", nextVal);
              triggerHaptic("light");
            }}
            className={`w-[22px] h-[22px] rounded-lg flex items-center justify-center text-[11px] font-black border select-none transition-colors cursor-pointer ${
              isDark 
                ? "bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700" 
                : "bg-white text-slate-900 hover:bg-slate-100 border-slate-200"
            }`}
            title="Decrease Pre-Task by 5m"
          >
            −
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextVal = (currentFocusTarget.travelBefore || 0) + 5;
              updateTaskDurationOrBuffer(currentFocusTarget.id + "_before", nextVal);
              triggerHaptic("light");
            }}
            className={`w-[22px] h-[22px] rounded-lg flex items-center justify-center text-[11px] font-black border select-none transition-colors cursor-pointer ${
              isDark 
                ? "bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700" 
                : "bg-white text-slate-900 hover:bg-slate-100 border-slate-200"
            }`}
            title="Increase Pre-Task by 5m"
          >
            +
          </button>
        </div>

        {/* Right part: Play/Pause/Check Action Button */}
        {(() => {
          const btnState = getState(currentFocusTarget.id, "before");
          let btnStyle = "bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-500 hover:from-emerald-450";
          let icon = <Play size={13} className="fill-current text-white text-center" />;

          if (btnState === "running") {
            btnStyle = "bg-gradient-to-b from-amber-500 to-amber-600 border-amber-550 animate-pulse";
            icon = <Pause size={13} className="fill-current text-white" />;
          } else if (btnState === "paused") {
            btnStyle = "bg-indigo-600 border-indigo-500";
            icon = <Check size={13} strokeWidth={3} className="text-white" />;
          } else if (btnState === "completed") {
            btnStyle = "bg-emerald-650 border-emerald-600 pointer-events-none";
            icon = <Check size={13} strokeWidth={3.5} className="text-white" />;
          }

          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBufferBottomButtonClick(currentFocusTarget, "before");
              }}
              className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center border border-white/10 shadow-sm transition-all cursor-pointer ${btnStyle}`}
              title="Start/Pause/Complete Pre-Task Buffer"
            >
              {icon}
            </button>
          );
        })()}
      </div>

      {/* After-Task Buffer Duration Timer */}
      <div className={`flex items-center gap-1.5 p-1 px-1.5 rounded-xl transition-all border flex-1 min-w-0 ${
        getState(currentFocusTarget.id, "after") !== "idle"
          ? isDark ? "bg-indigo-950/40 border-indigo-500/40 text-white" : "bg-indigo-50 border-indigo-300 text-indigo-900"
          : isDark ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-md" : "bg-gray-50 border-slate-250 text-slate-900 shadow-sm"
      }`} style={{ maxWidth: "174px" }}>
        {/* Left part: trigger edit, label, current value */}
        <div className="flex flex-col items-start px-0.5 leading-tight select-none flex-1 min-w-0">
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-[8px] font-black uppercase tracking-wider text-indigo-400 truncate">
              After-Task
            </span>
            {currentFocusTarget.travelAfter > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTaskDurationOrBuffer(currentFocusTarget.id + "_after", 0);
                  triggerHaptic("medium");
                }}
                className="text-[7.5px] font-extrabold uppercase text-rose-500 hover:text-rose-400 cursor-pointer p-0 leading-none transition-colors"
                title="Clear After-Task Buffer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Touchable Duration Button with Pull-down Menu of After-Task Activity Types */}
          {/* Touchable Duration Button with Post-Task Type Selector that activates the Post-Task Card Edit Window */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setCustomizerTaskId(currentFocusTarget.id);
              setCustomizerBufferType("after");
              const mins = currentFocusTarget.travelAfter || 0;
              setCustomizerHours(Math.floor(mins / 60));
              setCustomizerMinutes(mins % 60);
              setCustomizerReason(currentFocusTarget.afterBufferPurpose || "Wrap-up");
              setShowBufferCustomizer(true);
              triggerHaptic("medium");
            }}
            className="relative group cursor-pointer w-full mt-0.5"
          >
            <div className="flex items-center gap-1 cursor-pointer">
              <span className={`text-xs font-mono font-black border-b border-dashed transition-all hover:border-indigo-500 hover:text-indigo-400 ${
                isDark ? "text-slate-100 border-slate-700" : "text-slate-900 border-slate-300"
              }`}>
                {currentFocusTarget.travelAfter || 0}m
              </span>
              <span className="text-[8.5px] font-sans font-bold text-indigo-400 hover:text-indigo-300 truncate max-w-[55px] flex items-center gap-0.5">
                {currentFocusTarget.afterBufferPurpose || "Wrap-up"} ▾
              </span>
            </div>
          </div>
        </div>

        {/* Middle part: - / + adjusters */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextVal = Math.max(0, (currentFocusTarget.travelAfter || 0) - 5);
              updateTaskDurationOrBuffer(currentFocusTarget.id + "_after", nextVal);
              triggerHaptic("light");
            }}
            className={`w-[22px] h-[22px] rounded-lg flex items-center justify-center text-[11px] font-black border select-none transition-colors cursor-pointer ${
              isDark 
                ? "bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700" 
                : "bg-white text-slate-900 hover:bg-slate-100 border-slate-200"
            }`}
            title="Decrease After-Task by 5m"
          >
            −
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextVal = (currentFocusTarget.travelAfter || 0) + 5;
              updateTaskDurationOrBuffer(currentFocusTarget.id + "_after", nextVal);
              triggerHaptic("light");
            }}
            className={`w-[22px] h-[22px] rounded-lg flex items-center justify-center text-[11px] font-black border select-none transition-colors cursor-pointer ${
              isDark 
                ? "bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700" 
                : "bg-white text-slate-900 hover:bg-slate-100 border-slate-200"
            }`}
            title="Increase After-Task by 5m"
          >
            +
          </button>
        </div>

        {/* Right part: Play/Pause/Check Action Button */}
        {(() => {
          const btnState = getState(currentFocusTarget.id, "after");
          let btnStyle = "bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-500 hover:from-emerald-450";
          let icon = <Play size={13} className="fill-current text-white text-center" />;

          if (btnState === "running") {
            btnStyle = "bg-gradient-to-b from-amber-500 to-amber-600 border-amber-550 animate-pulse";
            icon = <Pause size={13} className="fill-current text-white" />;
          } else if (btnState === "paused") {
            btnStyle = "bg-indigo-600 border-indigo-500";
            icon = <Check size={13} strokeWidth={3} className="text-white" />;
          } else if (btnState === "completed") {
            btnStyle = "bg-emerald-650 border-emerald-600 pointer-events-none";
            icon = <Check size={13} strokeWidth={3.5} className="text-white" />;
          }

          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBufferBottomButtonClick(currentFocusTarget, "after");
              }}
              className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center border border-white/10 shadow-sm transition-all cursor-pointer ${btnStyle}`}
              title="Start/Pause/Complete After-Task Buffer"
            >
              {icon}
            </button>
          );
        })()}
      </div>
    </div>
  );
};
