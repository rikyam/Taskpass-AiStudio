import React from "react";
import { Task } from "../../types";
import { 
  Check, Play, Pause, Lock, Unlock, Flag, ChevronUp, ChevronDown, 
  Archive, Trash2, ListTodo, Calendar, Clock, Car, Navigation, X, Plus 
} from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "../../store";
import { formatTime, formatDuration, minutesToTimeString } from "../../utils/timeHelpers";
import { openGoogleMapsNavigation, ProspectiveCascadeResult } from "../InteractiveAppHelpers";

/* ==========================================================================
   1. TimelineTaskGrabBar (Memoized)
   Grab handle pill at the top of the timeline card for drag initialization
   ========================================================================== */
export interface TimelineTaskGrabBarProps {
  task: Task;
  onStartDrag: (e: React.MouseEvent<any> | React.TouchEvent<any>, task: Task, rect: DOMRect) => void;
}

export const TimelineTaskGrabBar = React.memo<TimelineTaskGrabBarProps>(({ task, onStartDrag }) => {
  return (
    <div
      className="absolute top-1 left-1/2 -translate-x-1/2 z-25 px-2.5 py-0.5 cursor-grab active:cursor-grabbing flex items-center justify-center pointer-events-auto select-none"
      title="Drag to reposition task on timeline"
      onMouseDown={(e) => {
        e.stopPropagation();
        const cardEl = e.currentTarget.closest('.timeline-card') as HTMLElement;
        const rect = cardEl ? cardEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
        onStartDrag(e, task, rect);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        const cardEl = e.currentTarget.closest('.timeline-card') as HTMLElement;
        const rect = cardEl ? cardEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
        onStartDrag(e, task, rect);
      }}
    >
      <div className="w-7 h-1 rounded-full bg-slate-400/40 hover:bg-indigo-400 hover:w-9 hover:h-1.5 transition-all flex items-center justify-center gap-0.5 shadow-sm">
        <div className="w-0.5 h-0.5 rounded-full bg-white/70" />
        <div className="w-0.5 h-0.5 rounded-full bg-white/70" />
        <div className="w-0.5 h-0.5 rounded-full bg-white/70" />
      </div>
    </div>
  );
});

TimelineTaskGrabBar.displayName = "TimelineTaskGrabBar";

/* ==========================================================================
   2. TimelineTaskBufferPill (Memoized)
   Discreet triangular buffer duration badges and customizer triggers
   ========================================================================== */
export interface TimelineTaskBufferPillProps {
  taskId: string;
  type: "before" | "after";
  bufferMinutes?: number;
  isTapped: boolean;
  isDark: boolean;
  onOpenBufferCustomizer: (taskId: string, type: "before" | "after") => void;
}

export const TimelineTaskBufferPill = React.memo<TimelineTaskBufferPillProps>(({
  taskId,
  type,
  bufferMinutes,
  isTapped,
  isDark,
  onOpenBufferCustomizer
}) => {
  const isBefore = type === "before";
  return (
    <button
      type="button"
      data-buffer-triangle="true"
      onClick={(e) => {
        e.stopPropagation();
        onOpenBufferCustomizer(taskId, type);
      }}
      className={`absolute ${isBefore ? "-top-2.5" : "-bottom-2.5"} left-1/2 -translate-x-1/2 z-35 px-2 py-0.5 rounded-full border shadow-md flex items-center justify-center gap-0.5 text-[8.5px] font-black uppercase transition-all duration-150 cursor-pointer ${
        isTapped
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto"
      } ${
        isDark
          ? isBefore 
            ? "bg-slate-900 border-teal-500/60 text-teal-300 hover:bg-teal-600 hover:text-white"
            : "bg-slate-900 border-indigo-500/60 text-indigo-300 hover:bg-indigo-600 hover:text-white"
          : isBefore
            ? "bg-white border-teal-500/80 text-teal-700 hover:bg-teal-600 hover:text-white"
            : "bg-white border-indigo-500/80 text-indigo-700 hover:bg-indigo-600 hover:text-white"
      }`}
      title={`Edit ${isBefore ? "Pre" : "Post"}-Task Buffer Time`}
    >
      <span className="text-[7px] leading-none">{isBefore ? "▲" : "▼"}</span>
      <span className="text-[7.5px] font-mono font-bold tracking-tight">
        {bufferMinutes ? `${bufferMinutes}m` : isBefore ? "Pre-Buffer" : "Post-Buffer"}
      </span>
    </button>
  );
});

TimelineTaskBufferPill.displayName = "TimelineTaskBufferPill";

/* ==========================================================================
   3. TimelineTaskResizeHandles (Memoized)
   Top and bottom edge resize handles + live floating tooltip
   ========================================================================== */
export interface TimelineTaskResizeHandlesProps {
  task: Task;
  enableTimeStretch: boolean;
  isResizingThis: boolean;
  resizingTask: { edge: "top" | "bottom"; currentStartMins: number; currentDurMins: number } | null;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, task: Task, edge: "top" | "bottom") => void;
}

export const TimelineTaskResizeHandles = React.memo<TimelineTaskResizeHandlesProps>(({
  task,
  enableTimeStretch,
  isResizingThis,
  resizingTask,
  onResizeStart
}) => {
  if (!enableTimeStretch) return null;

  return (
    <>
      {/* Top Edge Stretch Handle: Adjust start time (End time locked) */}
      <div
        data-resize-handle="true"
        className="absolute top-0 inset-x-0 h-3 cursor-ns-resize z-30 group/top-edge flex items-center justify-center select-none"
        title="Press & hold / drag top edge to stretch start time (End time locked)"
        onMouseDown={(e) => onResizeStart(e, task, "top")}
        onTouchStart={(e) => onResizeStart(e, task, "top")}
      >
        <div className="w-12 h-1 rounded-full bg-transparent group-hover/top-edge:bg-indigo-400/80 group-active/top-edge:bg-indigo-300 transition-all shadow-sm flex items-center justify-center">
          <div className="w-4 h-0.5 rounded-full bg-white/60" />
        </div>
      </div>

      {/* Bottom Edge Stretch Handle: Adjust duration/end time (Start time locked) */}
      <div
        data-resize-handle="true"
        className="absolute bottom-0 inset-x-0 h-3 cursor-ns-resize z-30 group/bottom-edge flex items-center justify-center select-none"
        title="Press & hold / drag bottom edge to stretch duration (Start time locked)"
        onMouseDown={(e) => onResizeStart(e, task, "bottom")}
        onTouchStart={(e) => onResizeStart(e, task, "bottom")}
      >
        <div className="w-12 h-1 rounded-full bg-transparent group-hover/bottom-edge:bg-indigo-400/80 group-active/bottom-edge:bg-indigo-300 transition-all shadow-sm flex items-center justify-center">
          <div className="w-4 h-0.5 rounded-full bg-white/60" />
        </div>
      </div>

      {/* Live Floating Resize Tooltip */}
      {isResizingThis && resizingTask && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 px-2 py-0.5 rounded-md bg-indigo-900 border border-indigo-400 text-white text-[10px] font-mono font-bold whitespace-nowrap shadow-xl flex items-center gap-1.5 animate-in fade-in pointer-events-none select-none">
          <span>{resizingTask.edge === "top" ? "▲ Start Stretch (End Locked)" : "▼ Duration Stretch (Start Locked)"}:</span>
          <span className="bg-indigo-950/80 px-1 rounded text-teal-300">
            {minutesToTimeString(resizingTask.currentStartMins)} – {minutesToTimeString(resizingTask.currentStartMins + resizingTask.currentDurMins)} ({resizingTask.currentDurMins}m)
          </span>
        </div>
      )}
    </>
  );
});

TimelineTaskResizeHandles.displayName = "TimelineTaskResizeHandles";

/* ==========================================================================
   4. TimelineTaskActionMenu (Memoized)
   Pull down action menu with full task state modifiers
   ========================================================================== */
export interface TimelineTaskActionMenuProps {
  task: Task;
  isDark: boolean;
  isSubtasksExpanded: boolean;
  onCloseMenu: () => void;
  onToggleComplete: (task: Task) => void;
  onPlayPress: (task: Task) => void;
  onRequestToggleLock: (task: Task) => void;
  onSetPriority: (task: Task, priority: "high" | "medium" | "low" | "none") => void;
  onToggleSubtasks: (taskId: string) => void;
  onMoveToBacklog: (task: Task) => void;
  onMoveToNextDay?: (task: Task) => void;
  onRequestDeleteTask: (task: Task) => void;
  renderSubtaskDropdown?: (task: Task) => React.ReactNode;
}

export const TimelineTaskActionMenu = React.memo<TimelineTaskActionMenuProps>(({
  task,
  isDark,
  isSubtasksExpanded,
  onCloseMenu,
  onToggleComplete,
  onPlayPress,
  onRequestToggleLock,
  onSetPriority,
  onToggleSubtasks,
  onMoveToBacklog,
  onMoveToNextDay,
  onRequestDeleteTask,
  renderSubtaskDropdown
}) => {
  return (
    <div 
      className="absolute right-0 top-7 z-[150] min-w-[190px] p-2 rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-xl shadow-2xl space-y-1 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Quick Actions</span>
        <button type="button" onClick={onCloseMenu} className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10">
          <X size={12} />
        </button>
      </div>

      {/* Toggle Complete */}
      <button
        type="button"
        onClick={() => { onCloseMenu(); onToggleComplete(task); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors cursor-pointer text-left font-semibold"
      >
        <Check size={13} className={task.completed ? "text-emerald-400" : "text-slate-400"} />
        <span>{task.completed ? "Mark Active" : "Mark Completed"}</span>
      </button>

      {/* Start Focus / Pause */}
      {!task.completed && (
        <button
          type="button"
          onClick={() => { onCloseMenu(); onPlayPress(task); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors cursor-pointer text-left font-semibold"
        >
          {task.isInProgress ? <Pause size={13} className="text-amber-400" /> : <Play size={13} className="text-emerald-400" />}
          <span>{task.isInProgress ? "Pause Focus" : "Start Focus"}</span>
        </button>
      )}

      {/* Lock / Unlock */}
      <button
        type="button"
        onClick={() => { onCloseMenu(); onRequestToggleLock(task); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer text-left font-semibold"
      >
        {task.isLocked ? <Lock size={13} className="text-rose-400" /> : <Unlock size={13} className="text-indigo-400" />}
        <span>{task.isLocked ? "Unlock (Flexible)" : "Lock (Appointment)"}</span>
      </button>

      {/* Priority Selector */}
      <div className="px-2 py-1 border-t border-white/10 mt-0.5 pt-1.5">
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Priority</span>
        <div className="grid grid-cols-4 gap-1">
          {(["high", "medium", "low", "none"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onSetPriority(task, p);
                onCloseMenu();
              }}
              className={`py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 border ${
                task.priority === p 
                  ? p === "high" ? "bg-orange-500/30 border-orange-400 text-orange-300" : p === "medium" ? "bg-amber-500/30 border-amber-400 text-amber-300" : p === "low" ? "bg-sky-500/30 border-sky-400 text-sky-300" : "bg-slate-800 border-white/20 text-white"
                  : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <Flag size={9} />
              <span>{p[0].toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subtasks Expander */}
      {task.subtasks && task.subtasks.length > 0 && (
        <button
          type="button"
          onClick={() => onToggleSubtasks(task.id)}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer text-left font-semibold"
        >
          <div className="flex items-center gap-2">
            <ListTodo size={13} className="text-indigo-400" />
            <span>Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})</span>
          </div>
          {isSubtasksExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {/* Subtasks List */}
      {isSubtasksExpanded && renderSubtaskDropdown && renderSubtaskDropdown(task)}

      {/* Move to Saved */}
      <button
        type="button"
        onClick={() => { onCloseMenu(); onMoveToBacklog(task); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/20 hover:text-amber-300 transition-colors cursor-pointer text-left font-semibold"
      >
        <Archive size={13} className="text-amber-400" />
        <span>Move to Saved</span>
      </button>

      {/* Move to Tomorrow */}
      {onMoveToNextDay && (
        <button
          type="button"
          onClick={() => { onCloseMenu(); onMoveToNextDay(task); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-sky-500/20 hover:text-sky-300 transition-colors cursor-pointer text-left font-semibold"
        >
          <Calendar size={13} className="text-sky-400" />
          <span>Move to Tomorrow</span>
        </button>
      )}

      {/* Delete Task */}
      <button
        type="button"
        onClick={() => { onCloseMenu(); onRequestDeleteTask(task); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-left font-semibold border-t border-white/10 mt-0.5 pt-1.5"
      >
        <Trash2 size={13} className="text-rose-400" />
        <span>Delete Task</span>
      </button>
    </div>
  );
});

TimelineTaskActionMenu.displayName = "TimelineTaskActionMenu";

/* ==========================================================================
   5. TimelineTaskHeader (Memoized)
   Checkbox, clickable title row, and action menu trigger
   ========================================================================== */
export interface TimelineTaskHeaderProps {
  task: Task;
  isMenuOpen: boolean;
  isDark: boolean;
  isSubtasksExpanded: boolean;
  onToggleComplete: (task: Task) => void;
  onTriggerEditForm: (task: Task, field?: string) => void;
  onToggleMenu: (taskId: string) => void;
  onCloseMenu: () => void;
  onPlayPress: (task: Task) => void;
  onRequestToggleLock: (task: Task) => void;
  onSetPriority: (task: Task, priority: "high" | "medium" | "low" | "none") => void;
  onToggleSubtasks: (taskId: string) => void;
  onMoveToBacklog: (task: Task) => void;
  onMoveToNextDay?: (task: Task) => void;
  onRequestDeleteTask: (task: Task) => void;
  renderSubtaskDropdown?: (task: Task) => React.ReactNode;
}

export const TimelineTaskHeader = React.memo<TimelineTaskHeaderProps>(({
  task,
  isMenuOpen,
  isDark,
  isSubtasksExpanded,
  onToggleComplete,
  onTriggerEditForm,
  onToggleMenu,
  onCloseMenu,
  onPlayPress,
  onRequestToggleLock,
  onSetPriority,
  onToggleSubtasks,
  onMoveToBacklog,
  onMoveToNextDay,
  onRequestDeleteTask,
  renderSubtaskDropdown
}) => {
  return (
    <div className="flex items-start justify-between gap-1.5 w-full">
      {/* Completed Checkbox */}
      <button
        type="button"
        data-task-checkbox="true"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task);
        }}
        className={`shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer select-none mt-0.5 ${
          task.completed
            ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
            : isDark
              ? "border-slate-500/80 hover:border-emerald-400 bg-slate-800/80 hover:bg-emerald-500/20 text-transparent"
              : "border-slate-400/80 hover:border-emerald-500 bg-white/90 hover:bg-emerald-50 text-transparent"
        }`}
        title={task.completed ? "Mark as Active" : "Mark as Completed"}
      >
        <Check size={11} strokeWidth={3} className={task.completed ? "text-white" : "opacity-0 hover:opacity-40"} />
      </button>

      {/* Task Title (2 rows max, clickable for quick edit) */}
      <span 
        data-task-title="true" 
        onClick={(e) => {
          e.stopPropagation();
          onTriggerEditForm(task);
        }}
        className={`flex-1 font-semibold text-xs leading-[1.25] line-clamp-2 select-none cursor-pointer hover:underline text-left ${
          task.completed 
            ? "line-through text-slate-400 opacity-60" 
            : isDark ? "text-white/95" : "text-slate-900"
        }`}
        title={`Click to edit "${task.title}"`}
      >
        {task.title}
      </span>

      {/* Pull Down Menu Trigger Button */}
      <div className="relative shrink-0 pointer-events-auto" data-task-menu="true" onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(task.id);
          }}
          className="w-5 h-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Task Quick Actions Menu"
        >
          <ChevronDown size={13} className={`transition-transform duration-150 ${isMenuOpen ? "rotate-180 text-indigo-400" : ""}`} />
        </button>

        {/* Pull Down Menu Overlay */}
        {isMenuOpen && (
          <TimelineTaskActionMenu
            task={task}
            isDark={isDark}
            isSubtasksExpanded={isSubtasksExpanded}
            onCloseMenu={onCloseMenu}
            onToggleComplete={onToggleComplete}
            onPlayPress={onPlayPress}
            onRequestToggleLock={onRequestToggleLock}
            onSetPriority={onSetPriority}
            onToggleSubtasks={onToggleSubtasks}
            onMoveToBacklog={onMoveToBacklog}
            onMoveToNextDay={onMoveToNextDay}
            onRequestDeleteTask={onRequestDeleteTask}
            renderSubtaskDropdown={renderSubtaskDropdown}
          />
        )}
      </div>
    </div>
  );
});

TimelineTaskHeader.displayName = "TimelineTaskHeader";

/* ==========================================================================
   6. TimelineTaskTimeFooter (Memoized)
   Start time, end time, duration tag, cascading displacement status
   ========================================================================== */
export interface TimelineTaskTimeFooterProps {
  task: Task;
  startFormatted: string;
  endFormatted: string;
  isDark: boolean;
  isCascading?: boolean;
}

export const TimelineTaskTimeFooter = React.memo<TimelineTaskTimeFooterProps>(({
  task,
  startFormatted,
  endFormatted,
  isDark,
  isCascading
}) => {
  return (
    <div className="flex items-center justify-between gap-1 text-[9.5px] font-mono tracking-tight select-none mt-1 pt-0.5 border-t border-white/[0.08] pointer-events-none">
      <div className={`flex items-center gap-1.5 font-bold truncate ${
        task.completed ? "text-slate-400 opacity-60" : isDark ? "text-indigo-300/90" : "text-indigo-700"
      }`}>
        <Clock size={10} className="shrink-0 opacity-70" />
        <span className="truncate">
          {startFormatted} – {endFormatted}
        </span>
        {isCascading && (
          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 animate-pulse">
            Cascading
          </span>
        )}
      </div>

      {task.duration && (
        <span className={`text-[8.5px] font-mono shrink-0 ${
          isDark ? "text-slate-400/80" : "text-slate-500"
        }`}>
          ({formatDuration(task.duration)})
        </span>
      )}
    </div>
  );
});

TimelineTaskTimeFooter.displayName = "TimelineTaskTimeFooter";

/* ==========================================================================
   7. TimelineTaskCardInner (Memoized)
   Inner wrapper combining header, title, and time footer
   ========================================================================== */
export interface TimelineTaskCardInnerProps {
  task: Task;
  startFormatted: string;
  endFormatted: string;
  isMenuOpen: boolean;
  isDark: boolean;
  isSubtasksExpanded: boolean;
  isCascading?: boolean;
  onToggleComplete: (task: Task) => void;
  onTriggerEditForm: (task: Task, field?: string) => void;
  onToggleMenu: (taskId: string) => void;
  onCloseMenu: () => void;
  onPlayPress: (task: Task) => void;
  onRequestToggleLock: (task: Task) => void;
  onSetPriority: (task: Task, priority: "high" | "medium" | "low" | "none") => void;
  onToggleSubtasks: (taskId: string) => void;
  onMoveToBacklog: (task: Task) => void;
  onMoveToNextDay?: (task: Task) => void;
  onRequestDeleteTask: (task: Task) => void;
  renderSubtaskDropdown?: (task: Task) => React.ReactNode;
}

export const TimelineTaskCardInner = React.memo<TimelineTaskCardInnerProps>(({
  task,
  startFormatted,
  endFormatted,
  isMenuOpen,
  isDark,
  isSubtasksExpanded,
  isCascading,
  onToggleComplete,
  onTriggerEditForm,
  onToggleMenu,
  onCloseMenu,
  onPlayPress,
  onRequestToggleLock,
  onSetPriority,
  onToggleSubtasks,
  onMoveToBacklog,
  onMoveToNextDay,
  onRequestDeleteTask,
  renderSubtaskDropdown
}) => {
  return (
    <div className="relative z-10 w-full h-full flex flex-col justify-between px-2.5 py-1.5 pointer-events-auto">
      {/* Top Section: Completed Checkbox + Task Title + Menu Trigger */}
      <TimelineTaskHeader
        task={task}
        isMenuOpen={isMenuOpen}
        isDark={isDark}
        isSubtasksExpanded={isSubtasksExpanded}
        onToggleComplete={onToggleComplete}
        onTriggerEditForm={onTriggerEditForm}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
        onPlayPress={onPlayPress}
        onRequestToggleLock={onRequestToggleLock}
        onSetPriority={onSetPriority}
        onToggleSubtasks={onToggleSubtasks}
        onMoveToBacklog={onMoveToBacklog}
        onMoveToNextDay={onMoveToNextDay}
        onRequestDeleteTask={onRequestDeleteTask}
        renderSubtaskDropdown={renderSubtaskDropdown}
      />

      {/* Bottom Section: Start and Stop Times */}
      <TimelineTaskTimeFooter
        task={task}
        startFormatted={startFormatted}
        endFormatted={endFormatted}
        isDark={isDark}
        isCascading={isCascading}
      />
    </div>
  );
});

TimelineTaskCardInner.displayName = "TimelineTaskCardInner";

/* ==========================================================================
   8. TimelineTaskBufferIllustration (Memoized)
   Pre- and Post-Buffer graphic blocks with countdown timer and map shortcuts
   ========================================================================== */
export interface TimelineTaskBufferIllustrationProps {
  type: "before" | "after";
  task: Task;
  bufferMins: number;
  top: number;
  height: number;
  colLeft: string;
  colRight: string;
  isDark: boolean;
  flexActivities?: string[];
  onToggleCompleteBuffer?: (taskId: string, bufferType: "before" | "after") => void;
  onStartBufferCountdown?: (task: Task, bufferType: "before" | "after") => void;
  onUpdateBufferPurpose?: (taskId: string, bufferType: "before" | "after", purpose: string) => void;
}

export const TimelineTaskBufferIllustration = React.memo<TimelineTaskBufferIllustrationProps>(({
  type,
  task,
  bufferMins,
  top,
  height,
  colLeft,
  colRight,
  isDark,
  flexActivities,
  onToggleCompleteBuffer,
  onStartBufferCountdown,
  onUpdateBufferPurpose
}) => {
  const isBefore = type === "before";
  const isCompleted = isBefore ? task.travelBeforeCompleted : task.travelAfterCompleted;
  const purpose = isBefore 
    ? (task.beforeBufferPurpose || "Preparation Buffer") 
    : (task.afterBufferPurpose || "Wind down Buffer");

  const hasValidLoc = Boolean(task.location && task.location.trim() && task.location.trim() !== "0" && task.location.trim() !== "null");
  const taskCardAnimationMs = useAppStore((state) => state.taskCardAnimationMs) || 600;

  return (
    <motion.div
      animate={{ top, height }}
      transition={{
        top: { duration: taskCardAnimationMs / 1000, ease: [0.16, 1, 0.3, 1] },
        height: { duration: taskCardAnimationMs / 1000, ease: [0.16, 1, 0.3, 1] }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onToggleCompleteBuffer) onToggleCompleteBuffer(task.id, type);
      }}
      style={{
        position: "absolute",
        left: colLeft,
        right: colRight,
        zIndex: 10,
        pointerEvents: "auto",
        cursor: "pointer",
        opacity: isCompleted ? 0.35 : 1,
        filter: isCompleted ? "brightness(0.55)" : "none"
      }}
      className={`border border-dashed ${isBefore ? "rounded-t-xl" : "rounded-b-xl"} flex items-center justify-center overflow-hidden buffer-diagonal-pattern select-none transition-all ${
        isCompleted 
          ? (isDark ? "border-slate-800/40" : "border-slate-300/40") 
          : "border-indigo-500/40 hover:border-indigo-400"
      }`}
    >
      {height >= 12 && (
        <div className="flex items-center gap-1.5 text-indigo-350 px-2 justify-between w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (onStartBufferCountdown) {
                onStartBufferCountdown(task, type);
              } else if (onToggleCompleteBuffer) {
                onToggleCompleteBuffer(task.id, type);
              }
            }}
            className="flex items-center gap-1 cursor-pointer hover:text-white truncate"
            title="Touch to Start / Pause buffer countdown"
          >
            <Car size={9} className={`shrink-0 ${isCompleted ? "text-slate-500" : "text-indigo-400"}`} />
            <span className={`text-[8.5px] font-black uppercase tracking-wider font-mono truncate hover:underline ${isCompleted ? "line-through text-slate-500" : ""}`}>
              {purpose}: {bufferMins}m
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onStartBufferCountdown && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartBufferCountdown(task, type);
                }}
                className="p-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 hover:text-white transition-all cursor-pointer"
                title="Start / Pause Buffer Timer"
              >
                <Play size={8} className="fill-current" />
              </button>
            )}

            {hasValidLoc && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGoogleMapsNavigation(task.location!.trim());
                }}
                className="p-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white transition-all cursor-pointer"
                title={`Directions to "${task.location!.trim()}" in Google Maps`}
              >
                <Navigation size={8} className="fill-current" />
              </button>
            )}

            {!isBefore && (
              <select
                value={task.afterBufferPurpose || "Wind down"}
                onChange={(e) => {
                  e.stopPropagation();
                  if (onUpdateBufferPurpose) {
                    onUpdateBufferPurpose(task.id, "after", e.target.value);
                  }
                }}
                className="bg-slate-900/90 text-[8px] font-black uppercase text-indigo-300 rounded px-1 py-0.5 border border-indigo-500/40 focus:outline-none cursor-pointer shrink-0"
                title="Select Buffer Type"
              >
                {Array.from(new Set(flexActivities && flexActivities.length > 0 ? flexActivities : [
                  "Preparation", "Warm-up", "Mindfulness", "Transit", "Travel", "Buffer", "Transition", "Wrap-up", "Wind down"
                ])).map((act, actIdx) => (
                  <option key={`${act}-${actIdx}`} value={act} className="bg-slate-900 text-white font-sans font-bold">{act}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
});

TimelineTaskBufferIllustration.displayName = "TimelineTaskBufferIllustration";

/* ==========================================================================
   9. TimelineTaskStraddleButton (Memoized)
   Insert flexible task quick plus button between adjacent timeline task items
   ========================================================================== */
export interface TimelineTaskStraddleButtonProps {
  straddleY: number;
  btnRight: string;
  isDark: boolean;
  taskA: Task;
  taskB: Task;
  onInsertFlexibleTaskBetween: (taskA: Task, taskB: Task) => void;
}

export const TimelineTaskStraddleButton = React.memo<TimelineTaskStraddleButtonProps>(({
  straddleY,
  btnRight,
  isDark,
  taskA,
  taskB,
  onInsertFlexibleTaskBetween
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: straddleY,
        right: btnRight,
        transform: "translateY(-50%)",
        zIndex: 45,
        pointerEvents: "auto"
      }}
      className="opacity-0 group-hover/timeline-col:opacity-100 hover:opacity-100 transition-opacity duration-150"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInsertFlexibleTaskBetween(taskA, taskB);
        }}
        className={`px-2 py-0.5 rounded-full border shadow-lg flex items-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all duration-150 hover:scale-105 cursor-pointer ${
          isDark 
            ? "bg-slate-900/90 hover:bg-indigo-600 border-indigo-500/50 text-indigo-300 hover:text-white"
            : "bg-white/95 hover:bg-indigo-600 border-indigo-400 text-indigo-700 hover:text-white"
        }`}
        title={`Insert flexible task between "${taskA.title}" and "${taskB.title}"`}
      >
        <Plus size={10} strokeWidth={3} />
        <span>Insert</span>
      </button>
    </div>
  );
});

TimelineTaskStraddleButton.displayName = "TimelineTaskStraddleButton";

/* ==========================================================================
   10. TimelineTaskCard (Memoized Container)
   Complete task card on timeline grid with motion animations and sub-elements
   ========================================================================== */
export interface TimelineTaskCardProps {
  task: Task;
  top: number;
  height: number;
  colLeft: string;
  colRight: string;
  cardRadiusClass: string;
  cardPaddingClass: string;
  cardClassString: string;
  isDraggingThis: boolean;
  isLongPressPending?: boolean;
  isResizingThis: boolean;
  isHighlighted: boolean;
  isDisplaced?: boolean;
  isTapped: boolean;
  isOverlapping: boolean;
  timelineCardBorderColor?: string;
  isDark: boolean;
  isMenuOpen: boolean;
  isSubtasksExpanded: boolean;
  enableTimeStretch: boolean;
  resizingTask: { edge: "top" | "bottom"; currentStartMins: number; currentDurMins: number } | null;
  startFormatted: string;
  endFormatted: string;
  
  // Stable callback handlers
  onCardClick: (taskId: string) => void;
  onStartTimelineDrag: (e: React.MouseEvent<any> | React.TouchEvent<any>, task: Task, rect: DOMRect) => void;
  onOpenBufferCustomizer?: (taskId: string, type: "before" | "after") => void;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, task: Task, edge: "top" | "bottom") => void;
  onToggleComplete: (task: Task) => void;
  onTriggerEditForm: (task: Task, field?: string) => void;
  onToggleMenu: (taskId: string) => void;
  onCloseMenu: () => void;
  onPlayPress: (task: Task) => void;
  onRequestToggleLock: (task: Task) => void;
  onSetPriority: (task: Task, priority: "high" | "medium" | "low" | "none") => void;
  onToggleSubtasks: (taskId: string) => void;
  onMoveToBacklog: (task: Task) => void;
  onMoveToNextDay?: (task: Task) => void;
  onRequestDeleteTask: (task: Task) => void;
  renderSubtaskDropdown?: (task: Task) => React.ReactNode;
}

export const TimelineTaskCard = React.memo<TimelineTaskCardProps>(({
  task,
  top,
  height,
  colLeft,
  colRight,
  cardRadiusClass,
  cardPaddingClass,
  cardClassString,
  isDraggingThis,
  isLongPressPending = false,
  isResizingThis,
  isHighlighted,
  isDisplaced,
  isTapped,
  isOverlapping,
  timelineCardBorderColor,
  isDark,
  isMenuOpen,
  isSubtasksExpanded,
  enableTimeStretch,
  resizingTask,
  startFormatted,
  endFormatted,
  onCardClick,
  onStartTimelineDrag,
  onOpenBufferCustomizer,
  onResizeStart,
  onToggleComplete,
  onTriggerEditForm,
  onToggleMenu,
  onCloseMenu,
  onPlayPress,
  onRequestToggleLock,
  onSetPriority,
  onToggleSubtasks,
  onMoveToBacklog,
  onMoveToNextDay,
  onRequestDeleteTask,
  renderSubtaskDropdown
}) => {
  const taskCardAnimationMs = useAppStore((state) => state.taskCardAnimationMs) || 600;

  return (
    <motion.div
      animate={{ 
        top, 
        height,
        scale: isDraggingThis ? 0.98 : isLongPressPending ? 1.02 : 1
      }}
      whileHover={!isDraggingThis && !isLongPressPending ? { scale: 1.018, y: -2, transition: { duration: 0.08 } } : undefined}
      whileTap={!isDraggingThis && !isLongPressPending ? { scale: 0.97, y: 0, transition: { duration: 0.05 } } : undefined}
      transition={{
        top: {
          duration: isDraggingThis ? 0.08 : (taskCardAnimationMs / 1000),
          ease: [0.16, 1, 0.3, 1]
        },
        height: {
          duration: isDraggingThis ? 0.08 : (taskCardAnimationMs / 1000),
          ease: [0.16, 1, 0.3, 1]
        },
        scale: { type: "spring", stiffness: 300, damping: 20 }
      }}
      style={{
        position: "absolute",
        left: colLeft,
        right: colRight,
        zIndex: isDraggingThis || isLongPressPending ? 80 : isResizingThis ? 70 : isMenuOpen ? 60 : isHighlighted ? 50 : 20,
        pointerEvents: "auto",
        touchAction: isResizingThis ? "none" : "pan-y",
        borderColor: isResizingThis ? "#818cf8" : (isDraggingThis || isLongPressPending) ? "#3b82f6" : timelineCardBorderColor || undefined
      }}
      onClick={() => onCardClick(task.id)}
      onMouseDown={(e) => {
        if (
          (e.target as HTMLElement).closest('button') || 
          (e.target as HTMLElement).closest('a') || 
          (e.target as HTMLElement).closest('input') ||
          (e.target as HTMLElement).closest('[data-task-title="true"]') ||
          (e.target as HTMLElement).closest('[data-resize-handle="true"]') ||
          (e.target as HTMLElement).closest('[data-buffer-triangle="true"]') ||
          (e.target as HTMLElement).closest('[data-task-menu="true"]')
        ) {
          return;
        }
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        onStartTimelineDrag(e, task, rect);
      }}
      onTouchStart={(e) => {
        if (
          (e.target as HTMLElement).closest('button') || 
          (e.target as HTMLElement).closest('a') || 
          (e.target as HTMLElement).closest('input') ||
          (e.target as HTMLElement).closest('[data-task-title="true"]') ||
          (e.target as HTMLElement).closest('[data-resize-handle="true"]') ||
          (e.target as HTMLElement).closest('[data-buffer-triangle="true"]') ||
          (e.target as HTMLElement).closest('[data-task-menu="true"]')
        ) {
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        onStartTimelineDrag(e, task, rect);
      }}
      className={`timeline-card ${cardRadiusClass} group cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between select-none relative ${
        isDraggingThis || isLongPressPending
          ? `${cardPaddingClass} border-2 border-dashed border-blue-500 bg-blue-500/10 text-blue-300 font-medium overflow-hidden shadow-[0_0_18px_rgba(59,130,246,0.4)] ring-2 ring-blue-400/30`
          : isResizingThis
            ? `${cardPaddingClass} ring-4 ring-indigo-500/40 border-2 border-indigo-400 bg-indigo-500/20 shadow-2xl overflow-visible`
            : isHighlighted
              ? `${cardPaddingClass} border-amber-500/80 bg-amber-500/25 ring-4 ring-amber-500/20 border-b-[4.5px] border-b-amber-705/100 animate-pulse overflow-visible`
              : isDisplaced
                ? `${cardPaddingClass} ring-2 ring-indigo-400 border-indigo-500/80 bg-indigo-500/10 overflow-visible shadow-md`
                : `${cardPaddingClass} ${cardClassString} overflow-visible`
      }`}
    >
      {/* 3D Glass Light Glare Highlight */}
      <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-white/[0.06] to-transparent rounded-t-2xl pointer-events-none z-0" />
      
      {/* Grab Bar for Drag and Drop Initiation */}
      <TimelineTaskGrabBar task={task} onStartDrag={onStartTimelineDrag} />

      {/* Top Discreet Triangle: Buffer Time Edit Trigger */}
      {onOpenBufferCustomizer && (
        <TimelineTaskBufferPill
          taskId={task.id}
          type="before"
          bufferMinutes={task.travelBefore}
          isTapped={isTapped}
          isDark={isDark}
          onOpenBufferCustomizer={onOpenBufferCustomizer}
        />
      )}

      {/* Bottom Discreet Triangle: Buffer Time Edit Trigger */}
      {onOpenBufferCustomizer && (
        <TimelineTaskBufferPill
          taskId={task.id}
          type="after"
          bufferMinutes={task.travelAfter}
          isTapped={isTapped}
          isDark={isDark}
          onOpenBufferCustomizer={onOpenBufferCustomizer}
        />
      )}

      {/* Edge Stretch Handles for Duration & Start Time */}
      <TimelineTaskResizeHandles
        task={task}
        enableTimeStretch={enableTimeStretch}
        isResizingThis={isResizingThis}
        resizingTask={resizingTask}
        onResizeStart={onResizeStart}
      />

      {/* Overlap Indicator */}
      {isOverlapping && (
        <div className={`absolute inset-0 ${cardRadiusClass} border-2 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)] pointer-events-none z-20 animate-pulse`} />
      )}

      {/* Main Inner Content */}
      <TimelineTaskCardInner
        task={task}
        startFormatted={startFormatted}
        endFormatted={endFormatted}
        isMenuOpen={isMenuOpen}
        isDark={isDark}
        isSubtasksExpanded={isSubtasksExpanded}
        isCascading={isDisplaced}
        onToggleComplete={onToggleComplete}
        onTriggerEditForm={onTriggerEditForm}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
        onPlayPress={onPlayPress}
        onRequestToggleLock={onRequestToggleLock}
        onSetPriority={onSetPriority}
        onToggleSubtasks={onToggleSubtasks}
        onMoveToBacklog={onMoveToBacklog}
        onMoveToNextDay={onMoveToNextDay}
        onRequestDeleteTask={onRequestDeleteTask}
        renderSubtaskDropdown={renderSubtaskDropdown}
      />
    </motion.div>
  );
});

TimelineTaskCard.displayName = "TimelineTaskCard";

