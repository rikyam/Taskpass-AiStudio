import React from "react";
import { useAppStore } from "../../store";
import { Task } from "../../types";
import { 
  Check, Play, Pause, MapPin, ArrowUpRight, Lock, Unlock, Unlink,
  AlertTriangle, Link as LinkIcon, Trash2, Car, CheckCircle2, 
  AlertCircle, Flag, ChevronUp, ChevronDown, Archive, Trash, 
  ListTodo, CalendarRange, Calendar, ZoomIn, ZoomOut, Clock, Timer, X, Plus, Minus, MoreVertical, Columns
} from "lucide-react";
import { motion } from "motion/react";
import { 
  formatTime, 
  timeToMinutes, 
  minutesToTimeString, 
  parseDurationToMinutes, 
  formatDuration,
  getNextDateString,
  formatDate
} from "../../utils/timeHelpers";
import { getGoogleMapsDirectionsUrl, computeProspectiveCascadeMap } from "../InteractiveAppHelpers";

interface TimelineGridViewProps {
  isDark: boolean;
  isDayPlannerActive: boolean;
  timelineHours: number;
  HOUR_HEIGHT: number;
  timelineIncrement: number;
  currentTimeMins: number;
  ghostTask: { mins: number; durationMins: number; time: string; } | null;
  overlapIntervals: Array<{ id: string; start: number; end: number; taskA: string; taskB: string }>;
  routineGroups: Array<{ id: string; name: string; startMins: number; endMins: number; tasks: Task[] }>;
  filteredScheduledDailyTasks: Task[];
  scheduledDailyTasks: Task[];
  selectedDate?: string;
  scheduledNextDailyTasks?: Task[];
  cardDensity: "standard" | "simplified" | "very_simplified" | "report";
  timelineHeightScale: number;
  expandedStandardFields: Record<string, boolean>;
  setExpandedStandardFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedSubtaskTaskId: Record<string, boolean>;
  setExpandedSubtaskTaskId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  dragToasts: Array<{ id: string; type: "success" | "warning" | "info"; message: string; taskId?: string }>;
  overlappingTaskIds: Set<string>;
  focusCardDetailMode: "simple" | "detailed";
  lockedNoColor: boolean;
  highlightedCalendarTaskId: string | null;
  zoomFeedback: string | null;
  isPinchActive?: boolean;
  timelineContainerRef: React.RefObject<HTMLDivElement | null>;
  setTimelineHeightScale?: React.Dispatch<React.SetStateAction<number>>;
  triggerZoomFeedback?: (msg: string) => void;

  timelineBorderColor?: string;
  timelineHourMarkerColor?: string;
  timelineSublineColor?: string;
  timelineCardBorderColor?: string;
  taskCardGlassStyle?: string;

  // Callbacks
  handleTimelineContainerMouseMove: (e: React.MouseEvent) => void;
  handleTimelineTouchStart: (e: React.TouchEvent) => void;
  handleTimelineTouchMove: (e: React.TouchEvent) => void;
  handleTimelineDragEnd: (e: React.MouseEvent) => void;
  handleTimelineTouchEnd: (e: React.TouchEvent) => void;
  handleBlankSpaceStart: (clientX: number, clientY: number, target: HTMLElement) => void;
  handleBlankSpaceMove: (clientX: number, clientY: number) => void;
  handleBlankSpaceEnd: () => void;
  handleBlankSpaceCancel: () => void;
  startTimelineDrag: (e: React.MouseEvent<any> | React.TouchEvent<any>, task: Task, rect: DOMRect) => void;
  handleToggleComplete: (task: Task) => void;
  handleToggleCompleteBuffer?: (taskId: string, bufferType: "before" | "after") => void;
  handleStartBufferCountdown?: (task: Task, bufferType: "before" | "after") => void;
  onUpdateBufferPurpose?: (taskId: string, bufferType: "before" | "after", purpose: string) => void;
  flexActivities?: string[];
  handlePlayPress: (task: Task) => void;
  triggerEditForm: (task: Task, field?: string) => void;
  requestToggleLock: (task: Task) => void;
  handleToggleSequenceFlexible: (groupId: string) => void;
  handleToggleSequenceUnhook: (groupId: string) => void;
  requestDeleteSequence: (groupId: string, name?: string) => void;
  handleMoveToBacklog: (task: Task) => void;
  handleMoveToNextDay?: (task: Task) => void;
  requestDeleteTask: (task: Task) => void;
  setPrioritySelectTask: (task: Task | null) => void;
  renderSubtaskDropdown: (task: Task) => React.ReactNode;
  isAcceptedPassedTask: (task: Task) => boolean;
  getTaskCardClassString: (isLocked: boolean, priority: string, completed: boolean, hoverable?: boolean, isInProgress?: boolean, isOpenPlaceholder?: boolean) => string;
}

export const TimelineGridView: React.FC<TimelineGridViewProps> = React.memo(({
  isDark,
  isDayPlannerActive,
  timelineHours,
  HOUR_HEIGHT,
  timelineIncrement,
  currentTimeMins,
  ghostTask,
  overlapIntervals,
  routineGroups,
  filteredScheduledDailyTasks,
  scheduledDailyTasks,
  selectedDate: propsSelectedDate,
  scheduledNextDailyTasks = [],
  cardDensity,
  timelineHeightScale,
  expandedStandardFields,
  setExpandedStandardFields,
  expandedSubtaskTaskId,
  setExpandedSubtaskTaskId,
  dragToasts,
  overlappingTaskIds,
  focusCardDetailMode,
  lockedNoColor,
  highlightedCalendarTaskId,
  zoomFeedback,
  isPinchActive = false,
  timelineContainerRef,
  setTimelineHeightScale,
  triggerZoomFeedback,

  timelineBorderColor = "#38bdf8",
  timelineHourMarkerColor = "#818cf8",
  timelineSublineColor = "rgba(255,255,255,0.12)",
  timelineCardBorderColor = "rgba(255,255,255,0.15)",
  taskCardGlassStyle = "translucent",

  handleTimelineContainerMouseMove,
  handleTimelineTouchStart,
  handleTimelineTouchMove,
  handleTimelineDragEnd,
  handleTimelineTouchEnd,
  handleBlankSpaceStart,
  handleBlankSpaceMove,
  handleBlankSpaceEnd,
  handleBlankSpaceCancel,
  startTimelineDrag,
  handleToggleComplete,
  handleToggleCompleteBuffer,
  handleStartBufferCountdown,
  onUpdateBufferPurpose,
  flexActivities,
  handlePlayPress,
  triggerEditForm,
  requestToggleLock,
  handleToggleSequenceFlexible,
  handleToggleSequenceUnhook,
  requestDeleteSequence,
  handleMoveToBacklog,
  handleMoveToNextDay,
  requestDeleteTask,
  setPrioritySelectTask,
  renderSubtaskDropdown,
  isAcceptedPassedTask,
  getTaskCardClassString
}) => {
  // 1. Consume layout parameters, tasks list, and active drag states directly from Zustand using isolated selectors
  const timelineDragId = useAppStore((state) => state.timelineDragId);
  const timelineDragY = useAppStore((state) => state.timelineDragY);
  const timelineDragX = useAppStore((state) => state.timelineDragX);
  const timelineDragOffset = useAppStore((state) => state.timelineDragOffset);
  const timelineDragWidth = useAppStore((state) => state.timelineDragWidth);
  const timelineDragLeft = useAppStore((state) => state.timelineDragLeft);
  const tasks = useAppStore((state) => state.tasks);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const deckTab = useAppStore((state) => state.deckTab);
  const fontSizeScale = useAppStore((state) => state.fontSizeScale);
  const dayPlannerFont = useAppStore((state) => state.dayPlannerFont);
  const timelineColumns = useAppStore((state) => state.timelineColumns);
  const setTimelineColumns = useAppStore((state) => state.setTimelineColumns);

  const [openMenuTaskId, setOpenMenuTaskId] = React.useState<string | null>(null);

  // Retract task option menus when clicking or touching outside
  React.useEffect(() => {
    if (!openMenuTaskId) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-task-menu="true"]')) {
        return;
      }
      setOpenMenuTaskId(null);
    };

    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("touchstart", handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [openMenuTaskId]);

  const isTwoColumnMode = timelineColumns === 2;
  const setIsTwoColumnMode = React.useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(timelineColumns === 2) : val;
    setTimelineColumns(nextVal ? 2 : 1);
  }, [timelineColumns, setTimelineColumns]);

  // Derive current snapped minutes for timeline drag
  const currentDraggedSnappedMinutes = React.useMemo(() => {
    if (!timelineDragId) return null;
    const containerRect = timelineContainerRef.current?.getBoundingClientRect();
    const scrollY = timelineContainerRef.current?.scrollTop || 0;
    const relativeY = (timelineDragY - timelineDragOffset) - (containerRect?.top || 0) + scrollY;
    const minutes = (relativeY / HOUR_HEIGHT) * 60;
    const maxMinutesLimit = timelineHours * 60 - 5;
    return Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / timelineIncrement) * timelineIncrement));
  }, [timelineDragId, timelineDragY, timelineDragOffset, HOUR_HEIGHT, timelineHours, timelineIncrement, timelineContainerRef]);

  // Compute live cascade displacement map when dragging a timeline card (memoized on snapped minutes)
  const prospectiveCascadeMap = React.useMemo(() => {
    if (!timelineDragId || currentDraggedSnappedMinutes === null) return {};

    const prospectiveTimeStr = minutesToTimeString(currentDraggedSnappedMinutes);

    return computeProspectiveCascadeMap(
      timelineDragId,
      prospectiveTimeStr,
      selectedDate,
      tasks,
      timelineHours,
      HOUR_HEIGHT
    );
  }, [timelineDragId, currentDraggedSnappedMinutes, selectedDate, tasks, timelineHours, HOUR_HEIGHT]);

  // Lock vertical scroll for an instant during drop settling to prevent scroll jitter / wild jumps
  const [isDropSettling, setIsDropSettling] = React.useState(false);
  const prevDragIdRef = React.useRef<string | null>(null);
  const dropScrollTopRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (prevDragIdRef.current && !timelineDragId) {
      setIsDropSettling(true);
      if (timelineContainerRef.current) {
        dropScrollTopRef.current = timelineContainerRef.current.scrollTop;
      }
      const timer = setTimeout(() => {
        setIsDropSettling(false);
        dropScrollTopRef.current = null;
      }, 220);
      return () => clearTimeout(timer);
    }
    prevDragIdRef.current = timelineDragId;
  }, [timelineDragId, timelineContainerRef]);

  React.useEffect(() => {
    if (!isDropSettling || !timelineContainerRef.current) return;
    const container = timelineContainerRef.current;
    const lockedTop = dropScrollTopRef.current;

    const handleScroll = () => {
      if (lockedTop !== null && container.scrollTop !== lockedTop) {
        container.scrollTop = lockedTop;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: false });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [isDropSettling, timelineContainerRef]);

  // Quick edit modal state for sequence/group task durations
  const [editingGroupDurationId, setEditingGroupDurationId] = React.useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = React.useState<string>("");
  const [tempStepDurations, setTempStepDurations] = React.useState<Record<string, number>>({});

  const openGroupDurationModal = (groupId: string, name?: string) => {
    const groupTasks = tasks.filter(t => t.groupId === groupId && !t.isUnlinked);
    const initialDurations: Record<string, number> = {};
    groupTasks.forEach(t => {
      initialDurations[t.id] = parseDurationToMinutes(t.duration) || 15;
    });
    setTempStepDurations(initialDurations);
    setEditingGroupDurationId(groupId);
    setEditingGroupName(name || "Sequence Block");
  };

  const handleSaveGroupDuration = () => {
    if (!editingGroupDurationId) return;
    
    const updatedTasks = tasks.map(t => {
      if (t.groupId === editingGroupDurationId && !t.isUnlinked && tempStepDurations[t.id] !== undefined) {
        const newMins = tempStepDurations[t.id];
        return {
          ...t,
          duration: `${newMins} min`,
          originalDuration: `${newMins} min`
        };
      }
      return t;
    });

    const groupInUpdated = updatedTasks.filter(t => t.groupId === editingGroupDurationId && !t.isUnlinked);
    const sortedGroupTasks = [...groupInUpdated].sort((a, b) => {
      const aStart = timeToMinutes(a.time || a.computedTime || "08:00");
      const bStart = timeToMinutes(b.time || b.computedTime || "08:00");
      return aStart - bStart;
    });

    if (sortedGroupTasks.length > 0 && sortedGroupTasks[0].time) {
      let currentStartMins = timeToMinutes(sortedGroupTasks[0].time || sortedGroupTasks[0].computedTime || "08:00");
      const timeMap: Record<string, string> = {};
      sortedGroupTasks.forEach((gt, idx) => {
        if (idx === 0) {
          timeMap[gt.id] = minutesToTimeString(currentStartMins);
        } else {
          const prevTask = sortedGroupTasks[idx - 1];
          const prevDur = tempStepDurations[prevTask.id] || parseDurationToMinutes(prevTask.duration) || 15;
          currentStartMins += prevDur;
          timeMap[gt.id] = minutesToTimeString(currentStartMins);
        }
      });

      const finalTasks = updatedTasks.map(t => {
        if (timeMap[t.id]) {
          return { ...t, time: timeMap[t.id], computedTime: timeMap[t.id] };
        }
        return t;
      });

      useAppStore.getState().setTasks(finalTasks);
    } else {
      useAppStore.getState().setTasks(updatedTasks);
    }

    setEditingGroupDurationId(null);
  };

  const renderTaskCardInner = (task: Task) => {
    const isMenuOpen = openMenuTaskId === task.id;
    const startTimeStr = task.computedTime || task.time || "08:00";
    const startMins = timeToMinutes(startTimeStr);
    const durMins = parseDurationToMinutes(task.duration) || 15;
    const endMins = startMins + durMins;
    const endTimeStr = minutesToTimeString(endMins);

    const startFormatted = formatTime(startTimeStr);
    const endFormatted = formatTime(endTimeStr);

    return (
      <div 
        className="relative z-10 w-full h-full flex flex-col justify-between px-2.5 py-1.5 pointer-events-none" 
      >
        {/* Top Section: Task Title (up to 2 rows of text) + Menu Trigger Button */}
        <div className="flex items-start justify-between gap-1.5 w-full">
          {/* Task Title (2 rows max, clickable for quick edit) */}
          <span 
            data-task-title="true" 
            onClick={(e) => {
              e.stopPropagation();
              triggerEditForm(task);
            }}
            className={`text-[12px] font-bold tracking-tight hover:text-indigo-300 transition-colors line-clamp-2 leading-snug text-left cursor-pointer flex-1 select-none pointer-events-auto ${
              task.completed ? "line-through opacity-50 text-slate-400" : isDark ? "text-white" : "text-slate-900"
            }`}
            title={task.title}
          >
            {task.title}
          </span>

          {/* Pull Down Menu Trigger Button */}
          <div className="relative shrink-0 pointer-events-auto" data-task-menu="true" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuTaskId(prev => prev === task.id ? null : task.id);
              }}
              className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
                isMenuOpen 
                  ? "bg-indigo-500 border-indigo-400 text-white" 
                  : isDark
                    ? "bg-slate-900/40 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white"
                    : "bg-white/70 hover:bg-slate-100 border-slate-300/80 text-slate-700 hover:text-slate-900"
              }`}
              title="Task options menu"
            >
              <MoreVertical size={13} strokeWidth={2.5} />
            </button>

            {/* Pull Down Menu Overlay */}
            {isMenuOpen && (
              <div 
                className="absolute right-0 top-7 z-[150] min-w-[190px] p-2 rounded-2xl border border-white/20 bg-slate-950/95 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col gap-1 text-[11px] animate-in fade-in zoom-in-95 duration-150 select-none"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-0.5">
                  <span className="font-extrabold truncate text-indigo-300 text-[10px] uppercase tracking-wider">{task.title}</span>
                  <button onClick={() => setOpenMenuTaskId(null)} className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10"><X size={12} /></button>
                </div>

                {/* Toggle Complete */}
                <button
                  onClick={() => { setOpenMenuTaskId(null); handleToggleComplete(task); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors cursor-pointer text-left font-semibold"
                >
                  <Check size={13} className={task.completed ? "text-emerald-400" : "text-slate-400"} />
                  <span>{task.completed ? "Mark Active" : "Mark Completed"}</span>
                </button>

                {/* Start Focus / Pause */}
                {!task.completed && (
                  <button
                    onClick={() => { setOpenMenuTaskId(null); handlePlayPress(task); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors cursor-pointer text-left font-semibold"
                  >
                    {task.isInProgress ? <Pause size={13} className="text-amber-400" /> : <Play size={13} className="text-emerald-400" />}
                    <span>{task.isInProgress ? "Pause Focus" : "Start Focus"}</span>
                  </button>
                )}

                {/* Lock / Unlock */}
                <button
                  onClick={() => { setOpenMenuTaskId(null); requestToggleLock(task); }}
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
                        onClick={() => {
                          setPrioritySelectTask({ ...task, priority: p });
                          setOpenMenuTaskId(null);
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
                    onClick={() => {
                      setExpandedSubtaskTaskId(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer text-left font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <ListTodo size={13} className="text-indigo-400" />
                      <span>Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})</span>
                    </div>
                    {expandedSubtaskTaskId[task.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}

                {/* Subtasks List */}
                {expandedSubtaskTaskId[task.id] && renderSubtaskDropdown(task)}

                {/* Move to Backlog */}
                <button
                  onClick={() => { setOpenMenuTaskId(null); handleMoveToBacklog(task); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/20 hover:text-amber-300 transition-colors cursor-pointer text-left font-semibold"
                >
                  <Archive size={13} className="text-amber-400" />
                  <span>Move to Backlog</span>
                </button>

                {/* Move to Tomorrow */}
                {handleMoveToNextDay && (
                  <button
                    onClick={() => { setOpenMenuTaskId(null); handleMoveToNextDay(task); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-sky-500/20 hover:text-sky-300 transition-colors cursor-pointer text-left font-semibold"
                  >
                    <Calendar size={13} className="text-sky-400" />
                    <span>Move to Tomorrow</span>
                  </button>
                )}

                {/* Delete Task */}
                <button
                  onClick={() => { setOpenMenuTaskId(null); requestDeleteTask(task); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-left font-semibold border-t border-white/10 mt-0.5 pt-1.5"
                >
                  <Trash2 size={13} className="text-rose-400" />
                  <span>Delete Task</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Third Row: Start and Stop Times */}
        <div className="flex items-center justify-between gap-1 text-[9.5px] font-mono tracking-tight select-none mt-1 pt-0.5 border-t border-white/[0.08] pointer-events-none">
          <div className={`flex items-center gap-1.5 font-bold truncate ${
            task.completed ? "text-slate-400 opacity-60" : isDark ? "text-indigo-300/90" : "text-indigo-700"
          }`}>
            <Clock size={10} className="shrink-0 opacity-70" />
            <span className="truncate">
              {startFormatted} – {endFormatted}
            </span>
          </div>

          {task.duration && (
            <span className={`text-[8.5px] font-mono shrink-0 ${
              isDark ? "text-slate-400/80" : "text-slate-500"
            }`}>
              ({formatDuration(task.duration)})
            </span>
          )}
        </div>
      </div>
    );
  };

  const scrollVertical = (direction: "up" | "down") => {
    if (timelineContainerRef.current) {
      const scrollAmount = timelineContainerRef.current.clientHeight * 0.45;
      timelineContainerRef.current.scrollBy({
        top: direction === "up" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(15);
      }
    }
  };

  return (
    <div className="relative w-full group/vertical-stage sticky top-0 z-30 flex flex-col h-[600px] sm:h-[650px] max-h-[78vh]">
      {/* Semi-transparent Floating Navigation Arrows overlaying the container */}
      <button
        type="button"
        onClick={() => scrollVertical("up")}
        className="absolute top-12 left-1/2 -translate-x-1/2 z-[60] p-2 rounded-full bg-slate-950/70 hover:bg-slate-900/90 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-xl pointer-events-auto opacity-60 sm:opacity-0 sm:group-hover/vertical-stage:opacity-100 hover:opacity-100 flex items-center justify-center cursor-pointer"
        title="Scroll Up"
      >
        <ChevronUp size={18} strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={() => scrollVertical("down")}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[60] p-2 rounded-full bg-slate-950/70 hover:bg-slate-900/90 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-xl pointer-events-auto opacity-60 sm:opacity-0 sm:group-hover/vertical-stage:opacity-100 hover:opacity-100 flex items-center justify-center cursor-pointer"
        title="Scroll Down"
      >
        <ChevronDown size={18} strokeWidth={2.5} />
      </button>

      {/* Floating Zoom Controls directly on the vertical grid for maximum accessibility */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-1.5 pointer-events-auto opacity-60 sm:opacity-0 sm:group-hover/vertical-stage:opacity-100 hover:opacity-100 transition-all duration-200">
        <button
          type="button"
          onClick={() => setIsTwoColumnMode(prev => !prev)}
          className={`p-2 rounded-xl backdrop-blur-md border hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer ${
            isTwoColumnMode 
              ? "bg-indigo-600 border-indigo-400 text-white" 
              : "bg-slate-950/70 hover:bg-slate-900/90 border-white/10 text-slate-300 hover:text-white"
          }`}
          title={isTwoColumnMode ? "Switch to 1 Day View" : "Switch to 2 Days View"}
        >
          <Columns size={13} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (setTimelineHeightScale) {
              setTimelineHeightScale(prev => {
                const next = Math.min(1.8, Number((prev + 0.1).toFixed(2)));
                localStorage.setItem("timeline_height_scale", next.toString());
                if (triggerZoomFeedback) triggerZoomFeedback(`Zoom: ${Math.round(next * 100)}%`);
                return next;
              });
            }
          }}
          className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-900/90 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
          title="Zoom In (Expand Height)"
        >
          <ZoomIn size={13} strokeWidth={2.5} />
        </button>
        <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 text-indigo-400 rounded-lg text-[8px] font-mono font-bold py-0.5 px-1 text-center select-none shadow">
          {Math.round(timelineHeightScale * 100)}%
        </div>
        <button
          type="button"
          onClick={() => {
            if (setTimelineHeightScale) {
              setTimelineHeightScale(prev => {
                const next = Math.max(0.40, Number((prev - 0.1).toFixed(2)));
                localStorage.setItem("timeline_height_scale", next.toString());
                if (triggerZoomFeedback) triggerZoomFeedback(`Zoom: ${Math.round(next * 100)}%`);
                return next;
              });
            }
          }}
          className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-900/90 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
          title="Zoom Out (Compact Height)"
        >
          <ZoomOut size={13} strokeWidth={2.5} />
        </button>
      </div>

      <div 
        ref={timelineContainerRef}
        onMouseMove={handleTimelineContainerMouseMove}
        onTouchStart={handleTimelineTouchStart}
        onTouchMove={handleTimelineTouchMove}
        onMouseUp={handleTimelineDragEnd}
        onTouchEnd={handleTimelineTouchEnd}
        style={{ 
          overflowY: isDropSettling ? "hidden" : "auto",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch"
        }}
        className={`border border-white/10 rounded-[28px] sm:rounded-[32px] overflow-x-hidden flex-1 flex flex-col bg-slate-950/60 backdrop-blur-md shadow-2xl relative select-none timeline-scrollbar scroll-smooth overscroll-contain pb-48 ${
          timelineDragId || isPinchActive || isDropSettling ? "touch-none" : "touch-pan-y"
        }`}
      >
        {/* Sticky Column Day Headers */}
        <div className="sticky top-0 left-0 right-0 z-40 flex items-center border-b border-white/10 bg-slate-950/95 backdrop-blur-xl px-4 py-2.5 font-mono text-[11px] font-bold tracking-wider text-slate-200 pointer-events-none shadow-md shrink-0">
          <div className="w-14 shrink-0 text-indigo-400 text-[10px] uppercase font-mono font-black">Time</div>
          <div className="flex-1 flex items-center justify-center gap-2 text-indigo-300 border-r border-white/10 pr-2">
            <Calendar size={13} className="text-indigo-400" />
            <span className="font-semibold">{isTwoColumnMode ? "Day 1 • " : ""}{formatDate(selectedDate || "")}</span>
          </div>
          {isTwoColumnMode && (
            <div className="flex-1 flex items-center justify-center gap-2 text-sky-300 pl-2">
              <CalendarRange size={13} className="text-sky-400" />
              <span className="font-semibold">Day 2 • {formatDate(getNextDateString(selectedDate || "2026-08-10", 1))}</span>
            </div>
          )}
        </div>
      {/* Dynamic on-screen Zoom/Increment Scale Feedback Badge */}
      {zoomFeedback && (
        <div className="absolute right-6 top-6 z-45 bg-slate-950/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in text-[10px] uppercase font-black tracking-wider text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>{zoomFeedback}</span>
        </div>
      )}

      {/* Vertical hours rail on left */}
      <div 
        className={`w-14 absolute left-0 top-10 z-30 pointer-events-none text-right pr-2 py-4 border-r bg-slate-950/40 shadow-[4px_0_24px_rgba(0,0,0,0.35)] ${
          isDark ? "border-white/10" : "border-slate-200"
        }`} 
        style={{ height: timelineHours * HOUR_HEIGHT }}
      >
        {Array.from({ length: timelineHours }).map((_, h) => {
          let displayHourVal = h;
          let displayAmpm = "AM";
          let isNextDay = false;
          if (h >= 12 && h < 24) {
            displayAmpm = "PM";
          } else if (h >= 24) {
            const nextDayHour = h % 24;
            displayAmpm = (nextDayHour >= 12) ? "PM" : "AM";
            displayHourVal = nextDayHour;
            isNextDay = true;
          }
          
          const adjustedHour = displayHourVal % 12 || 12;
          return (
            <div 
              key={h} 
              className="absolute right-0 left-0 pointer-events-none flex items-center justify-end"
              style={{ top: h * HOUR_HEIGHT, height: 0 }}
            >
              {/* Premium Hour Label */}
              <div 
                className="mr-2.5 text-[10px] font-extrabold font-mono tracking-wider flex items-baseline gap-0.5 select-none"
                style={{ color: timelineHourMarkerColor }}
              >
                <span>{adjustedHour}</span>
                <span className="text-[6.5px] font-black uppercase opacity-80">{displayAmpm}</span>
                {isNextDay && (
                  <span className="text-[6.5px] font-black text-rose-400/90 ml-0.5 uppercase">+1d</span>
                )}
              </div>
              {/* Precision Tick Mark */}
              <div 
                className="w-2.5 h-[1.5px] rounded-full absolute right-0 translate-x-[1px]"
                style={{ backgroundColor: timelineHourMarkerColor }}
              />
            </div>
          );
        })}
      </div>

      {/* Dynamic vertical grid panel */}
      <div 
        className="flex-1 w-full relative bg-slate-900/10 min-h-[500px]" 
        style={{ height: timelineHours * HOUR_HEIGHT + 250 }}
        onMouseDown={(e) => {
          if (e.button !== 0) return; // Left clicks only
          if ((e.target as HTMLElement).closest('.timeline-card')) return;
          handleBlankSpaceStart(e.clientX, e.clientY, e.currentTarget);
        }}
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).closest('.timeline-card')) return;
          if (e.touches.length > 0) {
            handleBlankSpaceStart(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
          }
        }}
        onMouseMove={(e) => {
          handleBlankSpaceMove(e.clientX, e.clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            handleBlankSpaceMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onMouseUp={handleBlankSpaceEnd}
        onMouseLeave={handleBlankSpaceCancel}
        onTouchEnd={handleBlankSpaceEnd}
        onTouchCancel={handleBlankSpaceCancel}
      >
        {/* Real-time indicator line */}
        <div 
          style={{ top: (currentTimeMins / 60) * HOUR_HEIGHT }}
          className="absolute left-0 right-0 h-[2px] bg-rose-500 z-30 pointer-events-none flex items-center"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow-[0_0_10px_rgba(244,63,94,0.9)] border border-white shrink-0" />
          <span className="text-[7.5px] font-black bg-rose-500 px-1 py-0.5 rounded text-white font-mono scale-[0.8] origin-left shadow-[0_2px_5px_rgba(0,0,0,0.5)] uppercase tracking-wider ml-1.5 shrink-0">
            NOW
          </span>
        </div>

        {/* Horizontal reference baseline grids */}
        {Array.from({ length: timelineHours }).map((_, h) => (
          <div 
            key={h} 
            style={{ 
              top: h * HOUR_HEIGHT, 
              height: HOUR_HEIGHT,
              borderColor: timelineHourMarkerColor || "rgba(255,255,255,0.1)"
            }}
            className="absolute left-0 right-0 border-t pointer-events-none opacity-90"
          >
            {/* Intermediate dashed guide rule (30 minutes) */}
            <div 
              style={{ 
                top: HOUR_HEIGHT / 2,
                borderColor: timelineSublineColor || "rgba(255,255,255,0.06)"
              }} 
              className="absolute left-0 right-0 border-t border-dashed"
            />

            {/* Quarter hour sub-ticks (15m and 45m) for architectural detail */}
            {HOUR_HEIGHT >= 120 && (
              <>
                <div 
                  style={{ 
                    top: HOUR_HEIGHT * 0.25,
                    borderColor: timelineSublineColor || "rgba(255,255,255,0.05)"
                  }} 
                  className="absolute left-14 w-3 border-t border-dashed"
                />
                <div 
                  style={{ 
                    top: HOUR_HEIGHT * 0.75,
                    borderColor: timelineSublineColor || "rgba(255,255,255,0.05)"
                  }} 
                  className="absolute left-14 w-3 border-t border-dashed"
                />
              </>
            )}
          </div>
        ))}

        {/* Render ghost draft slot for blank space long-pressing/holding */}
        {ghostTask && (() => {
          const isSecondCol = isTwoColumnMode && timelineDragX > 0 && timelineContainerRef.current && (timelineDragX > timelineContainerRef.current.getBoundingClientRect().left + timelineContainerRef.current.getBoundingClientRect().width / 2);
          const gLeft = isTwoColumnMode ? (isSecondCol ? "calc(50% + 4px)" : "64px") : "64px";
          const gRight = isTwoColumnMode ? (isSecondCol ? "16px" : "calc(50% + 4px)") : "16px";

          return (
            <div
              style={{
                position: "absolute",
                top: (ghostTask.mins / 60) * HOUR_HEIGHT,
                height: Math.max((ghostTask.durationMins / 60) * HOUR_HEIGHT, 65),
                left: gLeft,
                right: gRight,
                zIndex: 15,
              }}
              className="border-2 border-dashed border-indigo-400 bg-indigo-500/10 rounded-2xl flex items-center justify-center p-3 animate-pulse pointer-events-none relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 rounded-full shadow-[0_0_14px_rgba(99,102,241,0.95)] z-20" />
              <div className="text-center font-bold text-indigo-400 text-xs flex flex-col items-center gap-1 bg-slate-950/95 py-1.5 px-3 rounded-xl border border-indigo-500/25 z-10">
                <span className="text-[8px] uppercase font-black tracking-widest text-indigo-305">
                  New Task Slot
                </span>
                <span className="font-mono text-xs uppercase text-white font-black">
                  {formatTime(ghostTask.time)} ({ghostTask.durationMins}m)
                </span>
              </div>
            </div>
          );
        })()}

        {/* HIGH-PRECISION VISUAL SNAP-TO-GRID EFFECT & GHOST SLOT (5-Minute Magnetic Alignment) */}
        {(() => {
          if (!timelineDragId) return null;
          const draggedTask = tasks.find(t => t.id === timelineDragId) || scheduledDailyTasks.find(t => t.id === timelineDragId);
          if (!draggedTask) return null;

          const duration = parseDurationToMinutes(draggedTask.duration);
          const containerRect = timelineContainerRef.current?.getBoundingClientRect();
          const scrollY = timelineContainerRef.current?.scrollTop || 0;
          
          const relativeY = (timelineDragY - timelineDragOffset) - (containerRect?.top || 0) + scrollY;
          const minutes = (relativeY / HOUR_HEIGHT) * 60;
          const maxMinutesLimit = timelineHours * 60 - 5;
          const increment = timelineIncrement || 5;
          const snappedMinutes = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / increment) * increment));
          const dynamicTimeStr = formatTime(minutesToTimeString(snappedMinutes));
          const endMinutes = snappedMinutes + duration;
          const dynamicEndTimeStr = formatTime(minutesToTimeString(endMinutes));
          const fullTimeRangeStr = `${dynamicTimeStr} – ${dynamicEndTimeStr}`;

          const tempTop = (snappedMinutes / 60) * HOUR_HEIGHT;
          const tempHeight = Math.max((duration / 60) * HOUR_HEIGHT, 65);
          const tempEndTop = tempTop + (duration / 60) * HOUR_HEIGHT;

          const isSecondCol = isTwoColumnMode && containerRect && ((timelineDragX - containerRect.left - 64) > (containerRect.width - 80) / 2);
          const tLeft = isTwoColumnMode ? (isSecondCol ? "calc(50% + 4px)" : "64px") : "64px";
          const tRight = isTwoColumnMode ? (isSecondCol ? "16px" : "calc(50% + 4px)") : "16px";

          // Calculate surrounding 5-minute micro grid ticks for quantum snap visualization
          const currentHour = Math.floor(snappedMinutes / 60);
          const hourStartMins = currentHour * 60;
          const fiveMinTicks = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

          return (
            <React.Fragment key="timeline-snap-to-grid-overlay">
              {/* Dynamic Micro-Grid 5-minute Magnetic Quantum Notches */}
              <div 
                className="absolute pointer-events-none z-10 opacity-70 transition-opacity duration-150"
                style={{
                  left: tLeft,
                  right: tRight,
                  top: (hourStartMins / 60) * HOUR_HEIGHT,
                  height: HOUR_HEIGHT
                }}
              >
                {fiveMinTicks.map((m) => {
                  const tickMinutes = hourStartMins + m;
                  const tickTop = (m / 60) * HOUR_HEIGHT;
                  const isCurrentSnap = tickMinutes === snappedMinutes;
                  return (
                    <div
                      key={`five-min-tick-${m}`}
                      className="absolute left-0 right-0 flex items-center justify-between"
                      style={{ top: tickTop, height: 0 }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div 
                          className={`w-2.5 h-[1.5px] rounded-full transition-all duration-150 ${
                            isCurrentSnap 
                              ? "bg-cyan-400 w-5 shadow-[0_0_10px_rgba(34,211,238,1)] h-[2.5px]" 
                              : "bg-indigo-400/30"
                          }`} 
                        />
                        {isCurrentSnap && (
                          <span className="text-[7.5px] font-mono font-black text-cyan-300 uppercase tracking-widest px-1 py-0.2 bg-cyan-950/80 rounded border border-cyan-400/40 shadow-sm animate-pulse">
                            5m Snap Slot
                          </span>
                        )}
                      </div>
                      <div 
                        className={`w-2.5 h-[1.5px] rounded-full transition-all duration-150 ${
                          isCurrentSnap 
                            ? "bg-cyan-400 w-5 shadow-[0_0_10px_rgba(34,211,238,1)] h-[2.5px]" 
                            : "bg-indigo-400/30"
                        }`} 
                      />
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Magnetic Start-Time Laser Line */}
              <motion.div
                animate={{ top: tempTop }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 26,
                  mass: 0.8
                }}
                style={{
                  position: "absolute",
                  left: tLeft,
                  right: tRight,
                  zIndex: 25,
                  pointerEvents: "none"
                }}
                className="flex items-center -translate-y-1/2"
              >
                {/* Glowing Magnetic Start Pip */}
                <div className="w-3 h-3 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_14px_rgba(34,211,238,1)] -ml-1.5 shrink-0 z-30 animate-pulse" />
                
                {/* Laser Glowing Snap Guideline */}
                <div className="flex-1 h-[2.5px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 shadow-[0_0_14px_rgba(99,102,241,1)]" />

                {/* Magnetic Snap Badge on the Laser Line */}
                <div className="absolute left-6 -top-3.5 bg-slate-950/95 border border-cyan-400/60 text-cyan-300 px-2 py-0.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.8)] flex items-center gap-1.5 text-[8.5px] font-mono font-black uppercase tracking-wider backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>5m Snap: {dynamicTimeStr}</span>
                </div>

                {/* Glowing Magnetic End Pip */}
                <div className="w-3 h-3 rounded-full bg-purple-400 border-2 border-white shadow-[0_0_14px_rgba(168,85,247,1)] -mr-1.5 shrink-0 z-30" />
              </motion.div>

              {/* Dynamic Magnetic End-Time Guide Line */}
              <motion.div
                animate={{ top: tempEndTop }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 26,
                  mass: 0.8
                }}
                style={{
                  position: "absolute",
                  left: tLeft,
                  right: tRight,
                  zIndex: 22,
                  pointerEvents: "none"
                }}
                className="flex items-center -translate-y-1/2 opacity-75"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-400 border border-white shadow-[0_0_8px_rgba(99,102,241,0.8)] -ml-1 shrink-0" />
                <div className="flex-1 h-[1.5px] border-t-2 border-dashed border-indigo-400/70" />
                <div className="px-1.5 py-0.2 bg-slate-950/90 border border-indigo-500/30 rounded text-[7.5px] font-mono text-indigo-300 uppercase font-black tracking-wider ml-1">
                  End: {dynamicEndTimeStr}
                </div>
              </motion.div>

              {/* Snap-to-Grid Target Slot Frame with Spring-Physics Animation */}
              <motion.div
                animate={{ top: tempTop, height: tempHeight }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 25,
                  mass: 0.85
                }}
                style={{
                  position: "absolute",
                  left: tLeft,
                  right: tRight,
                  zIndex: 18,
                }}
                className="border-2 border-cyan-400/80 bg-gradient-to-b from-cyan-500/15 via-indigo-500/10 to-purple-500/15 rounded-2xl flex items-center justify-center p-3 pointer-events-none shadow-[0_0_30px_rgba(34,211,238,0.25),inset_0_0_20px_rgba(99,102,241,0.15)] relative overflow-hidden backdrop-blur-[2px]"
              >
                {/* Magnetic Crosshair Corner Brackets */}
                <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-300 rounded-tl-sm" />
                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-purple-300 rounded-tr-sm" />
                <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-300 rounded-bl-sm" />
                <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-300 rounded-br-sm" />

                {/* Animated Top Laser Edge */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 shadow-[0_0_16px_rgba(34,211,238,1)] z-20" />

                {/* Central Alignment Card Information */}
                <div className="text-center font-bold text-indigo-400 text-xs flex flex-col items-center gap-1 bg-slate-950/95 py-2 px-4 rounded-xl border border-cyan-400/40 shadow-2xl z-10 scale-100 transition-all">
                  <div className="flex items-center gap-1.5 text-[8.5px] uppercase font-black tracking-widest text-cyan-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-ping" />
                    <span>5m Grid Aligned</span>
                    <span className="text-indigo-400 font-normal">•</span>
                    <span className="text-indigo-300">
                      {isTwoColumnMode ? (isSecondCol ? `Day 2 • ${formatDate(getNextDateString(selectedDate || "", 1))}` : `Day 1 • ${formatDate(selectedDate || "")}`) : "Slot Locked"}
                    </span>
                  </div>
                  <span className="font-mono text-xs uppercase text-white font-black whitespace-nowrap drop-shadow">
                    {fullTimeRangeStr}
                  </span>
                  <div className="flex items-center gap-2 text-[8.5px] font-mono text-cyan-200/90 font-bold">
                    <span>{draggedTask.title}</span>
                    <span className="opacity-60">•</span>
                    <span className="text-indigo-300">({formatDuration(draggedTask.duration)})</span>
                  </div>
                </div>
              </motion.div>
            </React.Fragment>
          );
        })()}

        {/* Render red pulse overlapping warning highlights on the timeline grid */}
        {overlapIntervals.map(interval => {
          const oTop = (interval.start / 60) * HOUR_HEIGHT;
          const oHeight = Math.max(((interval.end - interval.start) / 60) * HOUR_HEIGHT, 36);
          return (
            <div
              key={interval.id}
              style={{
                position: "absolute",
                top: oTop,
                height: oHeight,
                left: "64px",
                right: "16px",
                zIndex: 14,
              }}
              className="bg-rose-600/[0.14] border-t-2 border-b-2 border-red-500/55 animate-pulse rounded-2xl flex items-center justify-center p-3 pointer-events-none select-none shadow-[inset_0_0_20px_rgba(239,68,68,0.22)]"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/95 border border-red-500/35 rounded-xl shadow-lg">
                <AlertTriangle size={11} className="text-red-400 shrink-0 animate-bounce" />
                <span className="text-[8.5px] font-black uppercase text-red-200 tracking-wider">
                  Overlap: "{interval.taskA.substring(0, 15)}{interval.taskA.length > 15 ? '...' : ''}" & "{interval.taskB.substring(0, 15)}{interval.taskB.length > 15 ? '...' : ''}"
                </span>
              </div>
            </div>
          );
        })}

        {/* Render the dynamic scheduled task cards absolute positioned */}
        {deckTab === "active" && routineGroups
          .filter(group => group.tasks.length > 0)
          .map(group => {
            const draggedTask = timelineDragId ? tasks.find(t => t.id === timelineDragId) : null;
            const isDraggingThisGroup = !!(draggedTask && !draggedTask.isUnlinked && draggedTask.groupId === group.id);
            
            let dragShiftMins = 0;
            if (isDraggingThisGroup && draggedTask) {
              const containerRect = timelineContainerRef.current?.getBoundingClientRect();
              const scrollY = timelineContainerRef.current?.scrollTop || 0;
              const relativeY = (timelineDragY - timelineDragOffset) - (containerRect?.top || 0) + scrollY;
              const minutes = (relativeY / HOUR_HEIGHT) * 60;
              const maxMinutesLimit = timelineHours * 60 - 5;
              const snappedMinutes = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / timelineIncrement) * timelineIncrement));
              const oldStart = timeToMinutes(draggedTask.computedTime || draggedTask.time);
              dragShiftMins = snappedMinutes - oldStart;
            }

            const originalStartMins = group.startMins;
            const originalEndMins = group.endMins;

            const groupTop = ((originalStartMins + dragShiftMins) / 60) * HOUR_HEIGHT;
            const groupHeight = (((originalEndMins - originalStartMins)) / 60) * HOUR_HEIGHT;
            const isSeqLocked = group.tasks.some(t => t.sequenceLocked);
            const groupAllCompleted = group.tasks.length > 0 && group.tasks.every(t => t.completed);
            
            // Center Y coordinates for each task inside the group cover space
            const sortedTasks = [...group.tasks].sort((a, b) => {
              return timeToMinutes(a.computedTime || a.time) - timeToMinutes(b.computedTime || b.time);
            });
            
            const nodes = sortedTasks.map(task => {
              const tMins = timeToMinutes(task.computedTime || task.time) + (isDraggingThisGroup ? dragShiftMins : 0);
              const taskTop = (tMins / 60) * HOUR_HEIGHT;
              const dur = parseDurationToMinutes(task.duration);
              const taskHeight = Math.max((dur / 60) * HOUR_HEIGHT, 65);
              const localY = (taskTop + taskHeight / 2) - groupTop;
              return {
                id: task.id,
                title: task.title,
                y: localY,
              };
            });

            return (
              <React.Fragment key={`group-meta-${group.id}`}>
                <div
                  key={`group-cover-${group.id}`}
                  style={{
                    position: "absolute",
                    top: groupTop - 4,
                    height: groupHeight + 8,
                    left: "4px",
                    right: "4px",
                    zIndex: 11,
                  }}
                  className={`rounded-[24px] pointer-events-none transition-all duration-300 ${
                    isSeqLocked 
                      ? "bg-gradient-to-br from-indigo-500/[0.04] to-indigo-600/[0.015] border border-indigo-500/10 shadow-[inset_0_1.5px_15px_rgba(99,102,241,0.08),0_12px_36px_-6px_rgba(0,0,0,0.55)]" 
                      : "bg-gradient-to-br from-slate-500/[0.012] to-slate-900/[0.005] border border-white/[0.03] border-dashed shadow-[inset_0_1px_10px_rgba(255,255,255,0.01)]"
                  } ${groupAllCompleted ? "opacity-25 filter grayscale-[50%] border-slate-800/30" : ""}`}
                >
                  {/* Shimmer / light reflection effect */}
                  <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                  
                  {/* Vector Connecting Flow Path (Clearly showing dependency flow) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    {nodes.length > 1 && (
                      <>
                        {/* Background track line */}
                        <path
                          d={`M 51 ${nodes[0].y} L 51 ${nodes[nodes.length - 1].y}`}
                          stroke={isDayPlannerActive ? (isSeqLocked ? "rgba(99, 102, 241, 0.45)" : "rgba(45, 41, 38, 0.12)") : (isSeqLocked ? "rgba(129, 140, 248, 0.15)" : "rgba(255, 255, 255, 0.05)")}
                          strokeWidth="3"
                          strokeLinecap="round"
                          fill="none"
                        />
                        {/* Glowing dependency flow vector path (animates downwards) */}
                        <path
                          d={`M 51 ${nodes[0].y} L 51 ${nodes[nodes.length - 1].y}`}
                          stroke={isDayPlannerActive ? (isSeqLocked ? "rgba(79, 70, 229, 0.75)" : "rgba(99, 102, 241, 0.4)") : (isSeqLocked ? "rgba(129, 140, 248, 0.35)" : "rgba(165, 180, 252, 0.2)")}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeDasharray="6 14"
                          fill="none"
                          className="animate-flow-line"
                        />
                        
                        {/* Connection branches linking from the main track to each card center */}
                        {nodes.map((node, idx) => (
                          <g key={`group-node-${group.id}-${node.id}`}>
                            {/* Branch connection horizontal line */}
                            <line
                              x1="51"
                              y1={node.y}
                              x2="64"
                              y2={node.y}
                              stroke={isDayPlannerActive ? (isSeqLocked ? "rgba(79, 70, 229, 0.5)" : "rgba(45, 41, 38, 0.15)") : (isSeqLocked ? "rgba(129, 140, 248, 0.25)" : "rgba(255, 255, 255, 0.08)")}
                              strokeWidth="1.5"
                              strokeDasharray={isSeqLocked ? "" : "2 2"}
                            />
                            {/* Small chevron node dot */}
                            <circle
                              cx="51"
                              cy={node.y}
                              r="2.5"
                              fill={isSeqLocked ? "#4f46e5" : "rgba(148, 163, 184, 0.4)"}
                              className={isSeqLocked ? "animate-pulse" : ""}
                              stroke={isDayPlannerActive ? "#f7f5ef" : "#020617"}
                              strokeWidth={1}
                            />
                            
                            {/* Flow indicator chevrons pointing downward (next-hop flow) */}
                            {idx < nodes.length - 1 && (
                              <path
                                d={`M 49.5 ${node.y + 12} L 51 ${node.y + 14} L 52.5 ${node.y + 12}`}
                                stroke={isDayPlannerActive ? (isSeqLocked ? "rgba(79, 70, 229, 0.6)" : "rgba(45, 41, 38, 0.2)") : (isSeqLocked ? "rgba(129, 140, 248, 0.5)" : "rgba(255, 255, 255, 0.15)")}
                                strokeWidth="1.2"
                                fill="none"
                              />
                            )}
                          </g>
                        ))}
                      </>
                    )}
                    
                    {/* Fallback for single-task sequence block so connection is still styled */}
                    {nodes.length === 1 && (
                      <circle
                        cx="51"
                        cy={nodes[0].y}
                        r="3"
                        fill={isSeqLocked ? "#818cf8" : "rgba(148, 163, 184, 0.3)"}
                        className={isSeqLocked ? "animate-pulse" : ""}
                        stroke="#020617"
                        strokeWidth={1.5}
                      />
                    )}
                  </svg>

                  {/* Left edge sequence accent status bar */}
                  <div className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full ${
                    isSeqLocked ? "bg-indigo-500/40" : "bg-white/10"
                  }`} />
                </div>

                {/* Persistent Sequence Block Header - elevated to z-index 25 to never lie behind task cards */}
                {isSeqLocked ? (
                  groupHeight >= 55 && (
                    <div 
                      style={{
                        position: "absolute",
                        left: "51px",
                        top: groupTop + groupHeight / 2,
                        transform: "translate(-50%, -50%) rotate(-90deg)",
                        transformOrigin: "center center",
                        zIndex: 25,
                      }}
                      className="pointer-events-auto whitespace-nowrap"
                    >
                      <div className={`bg-slate-955/95 border text-indigo-300 px-3 py-1 rounded-full shadow-[0_4px_16px_rgba(99,102,241,0.25)] flex items-center gap-2 backdrop-blur-md transition-all ${groupAllCompleted ? "border-slate-805/40 text-slate-550 opacity-40 shadow-none" : "border-indigo-500/35 hover:border-indigo-400 text-indigo-200"}`}>
                        {!groupAllCompleted && <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />}
                        <span className={`text-[8.5px] font-black tracking-widest uppercase flex items-center gap-1.5 leading-none ${groupAllCompleted ? "line-through text-slate-500" : ""}`}>
                          <LinkIcon size={9} strokeWidth={3} className={`shrink-0 ${groupAllCompleted ? "text-slate-600" : "text-indigo-400"}`} />
                          <span className="max-w-[150px] truncate text-white">{group.name || "Sequence Block"}</span> 
                          <span className="opacity-70 text-[8px] font-mono">({group.tasks.length} STEPS)</span>
                          {groupAllCompleted ? (
                            <span className="bg-slate-800/50 border border-slate-700/55 text-slate-400 text-[6.5px] px-1.5 py-0.5 rounded font-black tracking-normal">CLOSED</span>
                          ) : (
                            <span className="bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-[6.5px] px-1.5 py-0.5 rounded font-black tracking-normal">LOCKED</span>
                          )}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSequenceFlexible(group.id);
                          }}
                          className="ml-1 p-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/50 text-indigo-200 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-indigo-500/30 shrink-0"
                          title="Unfreeze/Unlock Sequence (make flexible)"
                        >
                          <Lock size={10} strokeWidth={2.5} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSequenceUnhook(group.id);
                          }}
                          className="ml-1 p-1 rounded-full bg-amber-500/20 hover:bg-amber-500/50 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-amber-500/30 shrink-0"
                          title="Unhook sequence tasks into independent timeline tasks"
                        >
                          <Unlink size={10} strokeWidth={2.5} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteSequence(group.id, group.name);
                          }}
                          className="ml-1 p-1 rounded-full bg-rose-500/20 hover:bg-rose-505 text-rose-200 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-rose-500/30 shrink-0"
                          title="Delete All Tasks in Sequence"
                        >
                          <Trash2 size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  groupHeight >= 25 && (
                    <div 
                      style={{
                        position: "absolute",
                        left: "12px", // Starts in the gutter for distinct separation and easy tapping
                        top: groupTop + 4,
                        zIndex: 25,
                      }}
                      className="pointer-events-auto flex items-center gap-1.5"
                    >
                      <div className={`px-2.5 py-1 rounded-full border border-indigo-500/20 bg-slate-950/90 text-slate-305 flex items-center gap-2 shadow-xl backdrop-blur-md hover:border-indigo-400 transition-all ${groupAllCompleted ? "bg-slate-950/45 text-slate-505 opacity-40 border-slate-800 shadow-none" : "text-slate-300"}`}>
                        {!groupAllCompleted && <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />}
                        <span className={`text-[9px] font-black tracking-wider uppercase flex items-center gap-1.5 leading-none ${groupAllCompleted ? "line-through text-slate-500" : ""}`}>
                          <LinkIcon size={9} strokeWidth={3} className={`shrink-0 ${groupAllCompleted ? "text-slate-600" : "text-indigo-400"}`} />
                          <span className="max-w-[120px] truncate text-white">{group.name || "Sequence Block"}</span> 
                          <span className="opacity-60 text-[8px] font-mono">({group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"})</span>
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSequenceFlexible(group.id);
                          }}
                          className="ml-1 p-1 rounded-full bg-slate-900 border border-white/5 hover:border-indigo-400/30 text-slate-400 hover:text-amber-400 transition-all flex items-center justify-center cursor-pointer shrink-0"
                          title="Freeze/Lock Sequence (fixed appointment times)"
                        >
                          <Unlock size={10} strokeWidth={2.5} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSequenceUnhook(group.id);
                          }}
                          className="ml-1 p-1 rounded-full bg-slate-900 border border-white/5 hover:border-amber-400/30 text-slate-400 hover:text-amber-300 transition-all flex items-center justify-center cursor-pointer shrink-0"
                          title="Unhook sequence tasks into independent timeline tasks"
                        >
                          <Unlink size={10} strokeWidth={2.5} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteSequence(group.id, group.name);
                          }}
                          className="ml-1 p-1 rounded-full bg-slate-900 border border-white/5 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer shrink-0"
                          title="Delete All Tasks in Sequence"
                        >
                          <Trash2 size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </React.Fragment>
            );
          })}

        {(() => {
          const draggedTask = timelineDragId ? tasks.find(t => t.id === timelineDragId) : null;
          const isDraggingSeq = !!(draggedTask && draggedTask.groupId && !draggedTask.isUnlinked);
          
          let dragShiftMins = 0;
          if (draggedTask && isDraggingSeq) {
            const containerRect = timelineContainerRef.current?.getBoundingClientRect();
            const scrollY = timelineContainerRef.current?.scrollTop || 0;
            const relativeY = (timelineDragY - timelineDragOffset) - (containerRect?.top || 0) + scrollY;
            const minutes = (relativeY / HOUR_HEIGHT) * 60;
            const maxMinutesLimit = timelineHours * 60 - 5;
            const snappedMinutes = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / timelineIncrement) * timelineIncrement));
            const oldStart = timeToMinutes(draggedTask.computedTime || draggedTask.time);
            dragShiftMins = snappedMinutes - oldStart;
          }

          const day1Tasks = filteredScheduledDailyTasks.map(t => ({ ...t, columnKey: "col1" as const }));
          const day2Tasks = (isTwoColumnMode && scheduledNextDailyTasks ? scheduledNextDailyTasks : []).map(t => ({ ...t, columnKey: "col2" as const }));
          const allDisplayTasks = [...day1Tasks, ...day2Tasks];

          return allDisplayTasks.map(task => {
            const isGroupCompanionOfDragged = isDraggingSeq && task.groupId === draggedTask?.groupId && !task.isUnlinked;
            const originalStartMins = timeToMinutes(task.computedTime || task.time);
            const startMins = isGroupCompanionOfDragged ? originalStartMins + dragShiftMins : originalStartMins;
            
            const duration = parseDurationToMinutes(task.duration);
            const isAppt = task.isLocked && !task.completed;
            const isTimelineBasicMagnified = cardDensity === "very_simplified" && (fontSizeScale === "readable" || fontSizeScale === "large" || timelineHeightScale <= 0.21);

            const prospective = prospectiveCascadeMap[task.id];
            const isDisplaced = prospective?.isDisplaced || false;
            const displacedTimeStr = prospective?.prospectiveTimeStr;

            const top = prospective ? prospective.top : (startMins / 60) * HOUR_HEIGHT;
            const height = prospective ? prospective.height : Math.max(
              (duration / 60) * HOUR_HEIGHT,
              isTimelineBasicMagnified && expandedStandardFields[task.id]
                ? (task.helpfulLinks || task.hyperlink ? 125 : 90)
                : 58
            ); // height accommodating 2 rows of title and 3rd row start/stop time

            const isDraggingThis = timelineDragId === task.id;
            const isMenuOpen = openMenuTaskId === task.id;

            const beforeVal = task.travelBefore || 0;
            const afterVal = task.travelAfter || 0;

            const beforeTop = ((startMins - beforeVal) / 60) * HOUR_HEIGHT;
            const beforeHeight = (beforeVal / 60) * HOUR_HEIGHT;

            const afterTop = ((startMins + duration) / 60) * HOUR_HEIGHT;
            const afterHeight = (afterVal / 60) * HOUR_HEIGHT;

            const cardPaddingClass = "p-1 px-2";
            const cardRadiusClass = "rounded-xl";

            const colLeft = task.columnKey === "col2" ? "calc(50% + 4px)" : "64px";
            const colRight = task.columnKey === "col2" ? "16px" : isTwoColumnMode ? "calc(50% + 4px)" : "16px";

            return (
              <React.Fragment key={`${task.id}-${task.columnKey}`}>
                {/* Before Buffer Illustration */}
                {beforeVal > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (handleToggleCompleteBuffer) handleToggleCompleteBuffer(task.id, "before");
                    }}
                    style={{
                      position: "absolute",
                      top: beforeTop,
                      height: beforeHeight,
                      left: colLeft,
                      right: colRight,
                      zIndex: 10,
                      pointerEvents: "auto",
                      cursor: "pointer",
                      opacity: task.travelBeforeCompleted ? 0.35 : 1,
                      filter: task.travelBeforeCompleted ? "brightness(0.55)" : "none"
                    }}
                    className={`border border-dashed rounded-t-xl flex items-center justify-center overflow-hidden buffer-diagonal-pattern select-none transition-all ${
                      task.travelBeforeCompleted 
                        ? (isDark ? "border-slate-800/40" : "border-slate-300/40") 
                        : "border-indigo-500/40 hover:border-indigo-400"
                    }`}
                  >
                    {beforeHeight >= 12 && (
                      <div className="flex items-center gap-1.5 text-indigo-350 px-2 justify-between w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (handleStartBufferCountdown) {
                              handleStartBufferCountdown(task, "before");
                            } else if (handleToggleCompleteBuffer) {
                              handleToggleCompleteBuffer(task.id, "before");
                            }
                          }}
                          className="flex items-center gap-1 cursor-pointer hover:text-white truncate"
                          title="Touch title to Start / Pause buffer countdown"
                        >
                          <Car size={9} className={`shrink-0 ${task.travelBeforeCompleted ? "text-slate-500" : "text-indigo-400"}`} />
                          <span className={`text-[8.5px] font-black uppercase tracking-wider font-mono truncate hover:underline ${task.travelBeforeCompleted ? "line-through text-slate-500" : ""}`}>
                            {task.beforeBufferPurpose || "Preparation Buffer"}: {beforeVal}m
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Task Card */}
                <motion.div
                  animate={{ top, height }}
                  whileHover={{ scale: 1.018, y: -2, transition: { duration: 0.08 } }}
                  whileTap={{ scale: 0.97, y: 0, transition: { duration: 0.05 } }}
                  transition={{
                    type: "spring",
                    stiffness: 115,
                    damping: 20,
                    mass: 0.9
                  }}
                  style={{
                    position: "absolute",
                    left: colLeft,
                    right: colRight,
                    opacity: isDraggingThis ? 0.85 : task.completed ? 0.5 : 1,
                    filter: task.completed ? "brightness(0.5)" : "none",
                    zIndex: isDraggingThis ? 5 : isMenuOpen ? 250 : 20,
                    pointerEvents: (timelineDragId || isDropSettling) && !isDraggingThis ? "none" : "auto",
                    touchAction: timelineDragId === task.id ? "none" : "auto",
                    borderColor: timelineCardBorderColor || undefined
                  }}
                  onMouseDown={(e) => {
                    if (
                      (e.target as HTMLElement).closest('button') || 
                      (e.target as HTMLElement).closest('a') || 
                      (e.target as HTMLElement).closest('input') ||
                      (e.target as HTMLElement).closest('[data-task-title="true"]')
                    ) {
                      return;
                    }
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    startTimelineDrag(e, task, rect);
                  }}
                  onTouchStart={(e) => {
                    if (
                      (e.target as HTMLElement).closest('button') || 
                      (e.target as HTMLElement).closest('a') || 
                      (e.target as HTMLElement).closest('input') ||
                      (e.target as HTMLElement).closest('[data-task-title="true"]')
                    ) {
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    startTimelineDrag(e, task, rect);
                  }}
                  className={`timeline-card ${cardRadiusClass} cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between select-none relative ${
                    isDraggingThis
                      ? `${cardPaddingClass} border-2 border-dashed border-indigo-400/90 bg-indigo-500/15 text-indigo-300 font-bold overflow-hidden shadow-inner`
                      : highlightedCalendarTaskId === task.id
                        ? `${cardPaddingClass} border-amber-500/80 bg-amber-500/25 ring-4 ring-amber-500/20 border-b-[4.5px] border-b-amber-705/100 animate-pulse overflow-visible`
                        : isDisplaced
                          ? `${cardPaddingClass} ring-2 ring-indigo-400 border-indigo-500/80 overflow-visible`
                          : task.isLocked && !task.completed
                            ? `${cardPaddingClass} ${getTaskCardClassString(true, task.priority || "none", task.completed, true, task.isInProgress, !!task.isOpenPlaceholder)} overflow-visible`
                            : task.groupId && !task.isUnlinked
                              ? isDayPlannerActive
                                ? `${cardPaddingClass} bg-white text-slate-800 border border-slate-200 shadow-sm overflow-visible`
                                : `${cardPaddingClass} ${isDark ? 'group-card-dark-glow text-white' : 'group-card-light-glow text-slate-900'} overflow-visible`
                              : isDayPlannerActive
                                ? `${cardPaddingClass} bg-white text-slate-800 border border-slate-200 shadow-sm overflow-visible`
                                : `${cardPaddingClass} ${getTaskCardClassString(task.isLocked, task.priority || "none", task.completed, true, task.isInProgress, !!task.isOpenPlaceholder)} overflow-visible`
                  }`}
                >
                  {/* 3D Glass Light Glare Highlight */}
                  <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-white/[0.06] to-transparent rounded-t-2xl pointer-events-none z-0" />
                  
                  {/* Overlap Indicator */}
                  {overlappingTaskIds.has(task.id) && (
                    <div className={`absolute inset-0 ${cardRadiusClass} border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.45)] animate-pulse pointer-events-none z-40`} />
                  )}

                  {renderTaskCardInner(task)}
                </motion.div>

                {/* After Buffer Illustration */}
                {afterVal > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (handleToggleCompleteBuffer) handleToggleCompleteBuffer(task.id, "after");
                    }}
                    style={{
                      position: "absolute",
                      top: afterTop,
                      height: afterHeight,
                      left: colLeft,
                      right: colRight,
                      zIndex: 10,
                      pointerEvents: "auto",
                      cursor: "pointer",
                      opacity: task.travelAfterCompleted ? 0.35 : 1,
                      filter: task.travelAfterCompleted ? "brightness(0.55)" : "none"
                    }}
                    className={`border border-dashed rounded-b-xl flex items-center justify-center overflow-hidden buffer-diagonal-pattern select-none transition-all ${
                      task.travelAfterCompleted 
                        ? (isDark ? "border-slate-800/40" : "border-slate-300/40") 
                        : "border-indigo-500/40 hover:border-indigo-400"
                    }`}
                  >
                    {afterHeight >= 12 && (
                      <div className="flex items-center gap-1.5 text-indigo-355 px-2 justify-between w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (handleStartBufferCountdown) {
                              handleStartBufferCountdown(task, "after");
                            } else if (handleToggleCompleteBuffer) {
                              handleToggleCompleteBuffer(task.id, "after");
                            }
                          }}
                          className="flex items-center gap-1 cursor-pointer hover:text-white truncate"
                          title="Touch title to Start / Pause buffer countdown"
                        >
                          <Car size={9} className={`shrink-0 ${task.travelAfterCompleted ? "text-slate-500" : "text-indigo-400"}`} />
                          <span className={`text-[8.5px] font-black uppercase tracking-wider font-mono truncate hover:underline ${task.travelAfterCompleted ? "line-through text-slate-500" : ""}`}>
                            {task.afterBufferPurpose || "Wind down Buffer"}: {afterVal}m
                          </span>
                        </div>

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
                          {(flexActivities && flexActivities.length > 0 ? flexActivities : [
                            "Preparation", "Warm-up", "Mindfulness", "Transit", "Travel", "Buffer", "Transition", "Wrap-up", "Wind down"
                          ]).map((act) => (
                            <option key={act} value={act} className="bg-slate-900 text-white font-sans font-bold">{act}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          });
        })()}

        {filteredScheduledDailyTasks.length === 0 && (
          <p className="text-center py-20 text-[9px] font-black uppercase text-slate-500 tracking-[3.5px] absolute top-10 left-0 right-0">
            "Empty schedule"
          </p>
        )}

        {/* HIGH-FIDELITY FLOATING DRAG COMPANION / GHOST TRAIL */}
        {timelineDragId && (() => {
          const draggedTask = tasks.find(t => t.id === timelineDragId);
          if (!draggedTask) return null;
          const isAppt = draggedTask.isLocked && !draggedTask.completed;
          
          // Dynamically compute snapped preview time so the floating companion is extremely interactive
          const containerRect = timelineContainerRef.current?.getBoundingClientRect();
          const scrollY = timelineContainerRef.current?.scrollTop || 0;
          const relativeY = (timelineDragY - timelineDragOffset) - (containerRect?.top || 0) + scrollY;
          const minutes = (relativeY / HOUR_HEIGHT) * 60;
          const maxMinutesLimit = timelineHours * 60 - 5;
          const snappedMinutes = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / timelineIncrement) * timelineIncrement));
          const durationMins = parseDurationToMinutes(draggedTask.duration);
          const endMinutes = snappedMinutes + durationMins;
          const dynamicTimeStr = formatTime(minutesToTimeString(snappedMinutes));
          const dynamicEndTimeStr = formatTime(minutesToTimeString(endMinutes));
          const fullTimeRangeStr = `${dynamicTimeStr} – ${dynamicEndTimeStr}`;

          return (
            <motion.div
              initial={{ 
                scale: 0.98, 
                opacity: 0,
                y: timelineDragY - timelineDragOffset,
                x: timelineDragLeft
              }}
              animate={{ 
                scale: 1.03, 
                opacity: 0.95,
                y: timelineDragY - timelineDragOffset,
                x: timelineDragLeft
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 24,
                x: { type: "tween", duration: 0.04 },
                y: { type: "tween", duration: 0.04 }
              }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: timelineDragWidth,
                zIndex: 99999,
                pointerEvents: "none",
                rotate: "1deg"
              }}
              className={`p-3 rounded-2xl border backdrop-blur-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),0_0_35px_rgba(99,102,241,0.25)] flex flex-col justify-between overflow-hidden select-none ${
                draggedTask.isLocked && !draggedTask.completed
                  ? getTaskCardClassString(true, draggedTask.priority || "none", draggedTask.completed, false, draggedTask.isInProgress, !!draggedTask.isOpenPlaceholder)
                  : draggedTask.groupId && !draggedTask.isUnlinked
                    ? isDark ? "group-card-dark-glow text-white" : "group-card-light-glow text-slate-900"
                    : getTaskCardClassString(draggedTask.isLocked, draggedTask.priority || "none", draggedTask.completed, false, draggedTask.isInProgress, !!draggedTask.isOpenPlaceholder)
              }`}
            >
              <div className="flex items-start justify-between gap-1.5 w-full">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
                  <span className="text-xs font-black truncate text-white">
                    {draggedTask.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {draggedTask.isLocked && (
                    <span className="p-0.5 rounded bg-rose-500/20 text-rose-400 text-[8px] border border-rose-500/30">
                      <Lock size={8} strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-[9.5px] bg-indigo-950/90 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/40 font-black shrink-0 font-mono shadow whitespace-nowrap">
                    {fullTimeRangeStr}
                  </span>
                </div>
              </div>

              {draggedTask.location && draggedTask.location.toString().trim() !== "0" && draggedTask.location.toString().trim() !== "null" && (
                <div className="text-[9px] text-slate-400 truncate mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                  <span className="truncate flex-1">{draggedTask.location}</span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between w-full">
                <div className="text-[8.5px] font-mono font-bold text-slate-450 uppercase tracking-widest">
                  {formatDuration(draggedTask.duration)}
                </div>
                <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/25 text-indigo-305 border border-indigo-500/20">
                  PLACING
                </span>
              </div>
            </motion.div>
          );
        })()}
      </div>
     </div> {/* Close of group/vertical-stage wrapper */}

     {/* Duration Quick-Edit Modal for Sequence / Group */}
     {editingGroupDurationId && (() => {
       const groupTasks = tasks.filter(t => t.groupId === editingGroupDurationId && !t.isUnlinked);
       const totalGroupMins = groupTasks.reduce((sum, t) => sum + (tempStepDurations[t.id] ?? parseDurationToMinutes(t.duration) ?? 15), 0);

       return (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
           <div className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl text-white space-y-4 relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
             {/* Header */}
             <div className="flex items-center justify-between border-b border-white/10 pb-3">
               <div className="flex items-center gap-2">
                 <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                   <Timer size={16} />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-white leading-tight">Edit Sequence Duration</h3>
                   <p className="text-[10px] text-slate-400 font-medium truncate max-w-[220px]">{editingGroupName}</p>
                 </div>
               </div>
               <button
                 onClick={() => setEditingGroupDurationId(null)}
                 className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
               >
                 <X size={16} />
               </button>
             </div>

             {/* Total Summary */}
             <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-between">
               <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider">{groupTasks.length} Steps</span>
               <span className="text-xs font-mono font-black text-emerald-400">Total: {totalGroupMins} min</span>
             </div>

             {/* Global Presets */}
             <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Set All Steps To:</label>
               <div className="grid grid-cols-4 gap-1.5">
                 {[15, 30, 45, 60].map((presetMins) => (
                   <button
                     key={`preset-${presetMins}`}
                     type="button"
                     onClick={() => {
                       const nextMap: Record<string, number> = {};
                       groupTasks.forEach(t => nextMap[t.id] = presetMins);
                       setTempStepDurations(nextMap);
                     }}
                     className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-xs font-mono font-bold text-slate-200 hover:text-white border border-white/10 transition-all cursor-pointer text-center"
                   >
                     {presetMins}m
                   </button>
                 ))}
               </div>
             </div>

             {/* Adjust All */}
             <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adjust All Steps:</label>
               <div className="grid grid-cols-4 gap-1.5">
                 {[-10, -5, 5, 10].map((delta) => (
                   <button
                     key={`adj-${delta}`}
                     type="button"
                     onClick={() => {
                       const nextMap: Record<string, number> = {};
                       groupTasks.forEach(t => {
                         const curr = tempStepDurations[t.id] ?? parseDurationToMinutes(t.duration) ?? 15;
                         nextMap[t.id] = Math.max(5, curr + delta);
                       });
                       setTempStepDurations(nextMap);
                     }}
                     className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 hover:text-white border border-white/10 transition-all cursor-pointer text-center"
                   >
                     {delta > 0 ? `+${delta}m` : `${delta}m`}
                   </button>
                 ))}
               </div>
             </div>

             {/* Per-step breakdown */}
             <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Individual Steps:</label>
               <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                 {groupTasks.map((stepTask, idx) => {
                   const durMins = tempStepDurations[stepTask.id] ?? (parseDurationToMinutes(stepTask.duration) || 15);
                   return (
                     <div key={stepTask.id} className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-2">
                       <div className="min-w-0 flex-1">
                         <div className="text-xs font-bold text-white truncate">{idx + 1}. {stepTask.title}</div>
                       </div>
                       <div className="flex items-center gap-1 shrink-0">
                         <button
                           type="button"
                           onClick={() => {
                             setTempStepDurations(prev => ({ ...prev, [stepTask.id]: Math.max(5, durMins - 5) }));
                           }}
                           className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 font-bold border border-white/10 cursor-pointer"
                         >
                           <Minus size={10} />
                         </button>
                         <span className="w-10 text-center font-mono text-xs font-bold text-indigo-300">{durMins}m</span>
                         <button
                           type="button"
                           onClick={() => {
                             setTempStepDurations(prev => ({ ...prev, [stepTask.id]: durMins + 5 }));
                           }}
                           className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 font-bold border border-white/10 cursor-pointer"
                         >
                           <Plus size={10} />
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>

             {/* Action buttons */}
             <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
               <button
                 type="button"
                 onClick={() => setEditingGroupDurationId(null)}
                 className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={handleSaveGroupDuration}
                 className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
               >
                 Save Durations
               </button>
             </div>
           </div>
         </div>
       );
     })()}
    </div>
  );
});

TimelineGridView.displayName = "TimelineGridView";
