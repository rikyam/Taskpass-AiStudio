import React from "react";
import { useAppStore } from "../../store";
import { Task } from "../../types";
import { 
  Check, Play, Pause, MapPin, ArrowUpRight, Lock, Unlock, Unlink,
  AlertTriangle, Link as LinkIcon, Trash2, Car, CheckCircle2, 
  AlertCircle, Flag, ChevronUp, ChevronDown, Archive, Trash, 
  ListTodo, CalendarRange, Calendar, ZoomIn, ZoomOut, Clock, Timer, X, Plus, Minus, MoreVertical, Columns,
  Navigation, GripVertical
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
import { getGoogleMapsDirectionsUrl, openGoogleMapsNavigation, computeProspectiveCascadeMap, ProspectiveCascadeResult } from "../InteractiveAppHelpers";
import {
  TimelineTaskCard,
  TimelineTaskBufferIllustration,
  TimelineTaskStraddleButton
} from "./TimelineTaskSubElements";

interface TimelineGridViewProps {
  uiMode?: "Text" | "Graphics";
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
  onOpenBufferCustomizer?: (taskId: string, type: "before" | "after") => void;
  onUpdateTaskDurationAndStart?: (taskId: string, newStartMins: number, newDurationMins: number) => void;
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  flexActivities?: string[];
  onOpenManageFlexActivities?: () => void;
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
  onInsertFlexibleTaskBetween?: (taskA: Task, taskB: Task) => void;
}

export const TimelineGridView: React.FC<TimelineGridViewProps> = React.memo(({
  uiMode,
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
  onOpenBufferCustomizer,
  onUpdateTaskDurationAndStart,
  triggerHaptic = () => {},
  flexActivities,
  onOpenManageFlexActivities,
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
  getTaskCardClassString,
  onInsertFlexibleTaskBetween
}) => {
  // 1. Consume layout parameters, tasks list, and active drag states directly from Zustand using isolated selectors
  const timelineDragId = useAppStore((state) => state.timelineDragId);
  const timelinePendingDragTaskId = useAppStore((state) => state.timelinePendingDragTaskId);
  const timelineDragY = useAppStore((state) => state.timelineDragY);
  const timelineDragX = useAppStore((state) => state.timelineDragX);
  const timelineDragOffset = useAppStore((state) => state.timelineDragOffset);
  const timelineDragWidth = useAppStore((state) => state.timelineDragWidth);
  const timelineDragLeft = useAppStore((state) => state.timelineDragLeft);
  const tasks = useAppStore((state) => state.tasks);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const deckTab = useAppStore((state) => state.deckTab);
  const dayStartHour = useAppStore((state) => state.dayStartHour);
  const dayStartMinutes = React.useMemo(() => timeToMinutes(dayStartHour || "08:00"), [dayStartHour]);
  const fontSizeScale = useAppStore((state) => state.fontSizeScale);
  const dayPlannerFont = useAppStore((state) => state.dayPlannerFont);
  const timelineColumns = useAppStore((state) => state.timelineColumns);
  const setTimelineColumns = useAppStore((state) => state.setTimelineColumns);
  const enableTimeStretch = useAppStore((state) => state.enableTimeStretch);
  const graphicsActiveWindowBg = useAppStore((state) => state.graphicsActiveWindowBg);
  const timelineBgColor = useAppStore((state) => state.timelineBgColor);
  const isGraphicsMode = uiMode === "Graphics";
  const effectiveTimelineBg = timelineBgColor || (isGraphicsMode ? (graphicsActiveWindowBg || "#FAF3E0") : undefined);

  const [openMenuTaskId, setOpenMenuTaskId] = React.useState<string | null>(null);
  const [tappedCardTaskId, setTappedCardTaskId] = React.useState<string | null>(null);
  const resizingTaskRef = React.useRef<{
    taskId: string;
    edge: "top" | "bottom";
    initialY: number;
    initialStartMins: number;
    initialDurMins: number;
    initialEndMins: number;
    currentStartMins: number;
    currentDurMins: number;
    currentEndMins: number;
  } | null>(null);
  const [resizingTask, setResizingTask] = React.useState<{
    taskId: string;
    edge: "top" | "bottom";
    initialY: number;
    initialStartMins: number;
    initialDurMins: number;
    initialEndMins: number;
    currentStartMins: number;
    currentDurMins: number;
    currentEndMins: number;
  } | null>(null);

  const handleEdgeResizeStart = React.useCallback((
    e: React.MouseEvent | React.TouchEvent,
    task: Task,
    edge: "top" | "bottom"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const isTouch = "touches" in e;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const startMins = timeToMinutes(task.computedTime || task.time || "08:00");
    const durMins = parseDurationToMinutes(task.duration) || 15;
    const endMins = startMins + durMins;

    const initialResizingState = {
      taskId: task.id,
      edge,
      initialY: clientY,
      initialStartMins: startMins,
      initialDurMins: durMins,
      initialEndMins: endMins,
      currentStartMins: startMins,
      currentDurMins: durMins,
      currentEndMins: endMins,
    };
    resizingTaskRef.current = initialResizingState;
    setResizingTask(initialResizingState);

    triggerHaptic("medium");

    const onPointerMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveY = "touches" in moveEvent ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;
      const deltaY = moveY - clientY;
      const deltaMins = (deltaY / HOUR_HEIGHT) * 60;
      const increment = timelineIncrement || 5;

      if (edge === "bottom") {
        // Bottom edge: Start time is LOCKED. Duration changes, end time changes.
        const targetDur = Math.max(5, durMins + deltaMins);
        const snappedDur = Math.max(5, Math.round(targetDur / increment) * increment);
        const newEndMins = startMins + snappedDur;

        const next = resizingTaskRef.current ? {
          ...resizingTaskRef.current,
          currentDurMins: snappedDur,
          currentEndMins: newEndMins
        } : null;
        resizingTaskRef.current = next;
        setResizingTask(next);
      } else {
        // Top edge: End time is LOCKED. Start time changes, duration changes.
        const targetStart = startMins + deltaMins;
        const snappedStart = Math.max(0, Math.min(endMins - 5, Math.round(targetStart / increment) * increment));
        const newDur = endMins - snappedStart;

        const next = resizingTaskRef.current ? {
          ...resizingTaskRef.current,
          currentStartMins: snappedStart,
          currentDurMins: newDur,
        } : null;
        resizingTaskRef.current = next;
        setResizingTask(next);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);

      const finalState = resizingTaskRef.current;
      resizingTaskRef.current = null;
      setResizingTask(null);

      if (finalState) {
        const { taskId, currentStartMins, currentDurMins, initialStartMins, initialDurMins } = finalState;
        if (currentStartMins !== initialStartMins || currentDurMins !== initialDurMins) {
          if (onUpdateTaskDurationAndStart) {
            onUpdateTaskDurationAndStart(taskId, currentStartMins, currentDurMins);
          } else {
            const currentTasks = useAppStore.getState().tasks;
            const updatedTasks = currentTasks.map(t => {
              if (t.id === taskId) {
                return {
                  ...t,
                  time: minutesToTimeString(currentStartMins),
                  startTime: minutesToTimeString(currentStartMins),
                  duration: `${currentDurMins}m`,
                };
              }
              return t;
            });
            useAppStore.getState().setTasks(updatedTasks);
          }
          triggerHaptic("success");
        }
      }
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
  }, [HOUR_HEIGHT, timelineIncrement, triggerHaptic, onUpdateTaskDurationAndStart]);

  // Memoized task action callbacks for stable reference equality during drag/drop operations
  const handleCardClick = React.useCallback((taskId: string) => {
    setTappedCardTaskId(prev => (prev === taskId ? null : taskId));
  }, []);

  const handleToggleMenu = React.useCallback((taskId: string) => {
    setOpenMenuTaskId(prev => (prev === taskId ? null : taskId));
  }, []);

  const handleCloseMenu = React.useCallback(() => {
    setOpenMenuTaskId(null);
  }, []);

  const handleSetPriority = React.useCallback((task: Task, priority: "high" | "medium" | "low" | "none") => {
    setPrioritySelectTask({ ...task, priority });
  }, [setPrioritySelectTask]);

  const handleToggleSubtasks = React.useCallback((taskId: string) => {
    setExpandedSubtaskTaskId(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  }, [setExpandedSubtaskTaskId]);

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

  // Track container scroll position reactively during dragging for smooth edge scrolling updates
  const [dragScrollY, setDragScrollY] = React.useState<number>(0);

  React.useEffect(() => {
    if (!timelineDragId || !timelineContainerRef.current) return;
    const container = timelineContainerRef.current;
    const handleContainerScroll = () => {
      setDragScrollY(container.scrollTop);
    };
    container.addEventListener("scroll", handleContainerScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleContainerScroll);
    };
  }, [timelineDragId, timelineContainerRef]);

  // Derive current snapped minutes for timeline drag with intelligent magnetic card snapping
  const currentDraggedSnappedMinutes = React.useMemo(() => {
    if (!timelineDragId) return null;
    const containerRect = timelineContainerRef.current?.getBoundingClientRect();
    const scrollY = timelineContainerRef.current?.scrollTop || dragScrollY || 0;
    const relativeY = (timelineDragY - timelineDragOffset) - (containerRect?.top || 0) + scrollY;
    const minutes = (relativeY / HOUR_HEIGHT) * 60;
    const maxMinutesLimit = timelineHours * 60 - 5;
    const inc = (timelineIncrement === 0) ? 1 : ((timelineIncrement === 5 || timelineIncrement === 10 || timelineIncrement === 15 || timelineIncrement === 30) ? timelineIncrement : 5);
    const standardSnapped = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / inc) * inc));

    const draggedTask = tasks.find(t => t.id === timelineDragId) || scheduledDailyTasks.find(t => t.id === timelineDragId);
    if (!draggedTask) return standardSnapped;

    const duration = parseDurationToMinutes(draggedTask.duration) || 30;

    // Check magnetic snap to adjacent card boundaries (±8 mins threshold), strictly aligned to snapIncrement
    const isSecondCol = isTwoColumnMode && containerRect && ((timelineDragX - containerRect.left - 64) > (containerRect.width - 80) / 2);
    const dayTasks = (isSecondCol ? scheduledNextDailyTasks : scheduledDailyTasks) || [];
    const activeTasks = dayTasks.filter(t => t.id !== timelineDragId && !t.completed);

    if (timelineIncrement !== 0) {
      for (const t of activeTasks) {
        const tStart = timeToMinutes(t.computedTime || t.time || "00:00");
        const tDur = parseDurationToMinutes(t.duration) || 30;
        const tEnd = tStart + tDur + (t.travelAfter || 0);
        const tBeforeStart = tStart - (t.travelBefore || 0);

        // Snap start flush to previous task's end (+ travel), aligned to snapIncrement
        const snappedTEnd = Math.ceil(tEnd / inc) * inc;
        if (Math.abs(standardSnapped - snappedTEnd) <= 8) {
          return Math.max(0, Math.min(maxMinutesLimit, snappedTEnd));
        }
        // Snap end flush to next task's start (- travel), aligned to snapIncrement
        const snappedTBeforeStart = Math.floor((tBeforeStart - duration) / inc) * inc;
        if (Math.abs((standardSnapped + duration) - tBeforeStart) <= 8) {
          return Math.max(0, Math.min(maxMinutesLimit, snappedTBeforeStart));
        }
      }
    }

    return standardSnapped;
  }, [timelineDragId, timelineDragY, timelineDragX, timelineDragOffset, dragScrollY, HOUR_HEIGHT, timelineHours, timelineIncrement, timelineContainerRef, tasks, scheduledDailyTasks, scheduledNextDailyTasks, isTwoColumnMode]);

  // Compute live cascade displacement map dynamically as the dragged card moves over timeline slots
  const prospectiveCascadeMap = React.useMemo(() => {
    if (!timelineDragId || currentDraggedSnappedMinutes === null) return {};

    const prospectiveTimeStr = minutesToTimeString(currentDraggedSnappedMinutes);
    const containerRect = timelineContainerRef.current?.getBoundingClientRect();
    const isSecondCol = isTwoColumnMode && containerRect && ((timelineDragX - containerRect.left - 64) > (containerRect.width - 80) / 2);
    const targetDate = isSecondCol ? getNextDateString(selectedDate || "2026-08-10", 1) : (selectedDate || "");
    const baseTasks = (isSecondCol ? scheduledNextDailyTasks : scheduledDailyTasks) || [];
    const draggedTask = tasks.find(t => t.id === timelineDragId) || baseTasks.find(t => t.id === timelineDragId);
    const targetTasks = baseTasks.some(t => t.id === timelineDragId)
      ? baseTasks
      : (draggedTask ? [...baseTasks, { ...draggedTask, date: targetDate }] : baseTasks);

    return computeProspectiveCascadeMap(
      timelineDragId,
      prospectiveTimeStr,
      targetDate,
      targetTasks,
      timelineHours,
      HOUR_HEIGHT,
      dayStartMinutes,
      timelineIncrement
    );
  }, [timelineDragId, currentDraggedSnappedMinutes, timelineDragX, isTwoColumnMode, selectedDate, scheduledDailyTasks, scheduledNextDailyTasks, tasks, timelineHours, HOUR_HEIGHT, dayStartMinutes, timelineIncrement, timelineContainerRef]);

  // Lock vertical scroll for an instant during drop settling to prevent scroll jitter / wild jumps
  const [isDropSettling, setIsDropSettling] = React.useState(false);
  const prevDragIdRef = React.useRef<string | null>(null);
  const dropScrollTopRef = React.useRef<number | null>(null);
  const prevCollidedTaskIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!timelineDragId) {
      prevCollidedTaskIdsRef.current.clear();
    }
  }, [timelineDragId]);

  React.useEffect(() => {
    if (prevDragIdRef.current && !timelineDragId) {
      setIsDropSettling(true);
      const timer = setTimeout(() => {
        setIsDropSettling(false);
      }, 150);
      return () => clearTimeout(timer);
    }
    prevDragIdRef.current = timelineDragId;
  }, [timelineDragId]);

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
              ? (isGraphicsMode ? "bg-[#2D6A4F] border-[#2D6A4F] text-white" : "bg-indigo-600 border-indigo-400 text-white") 
              : (isGraphicsMode ? "bg-[#FFF2DF] hover:bg-[#FAF3E0] border-[#EADDC7] text-[#594230] hover:text-[#1F1A16]" : "bg-slate-950/70 hover:bg-slate-900/90 border-white/10 text-slate-300 hover:text-white")
          }`}
          title={isTwoColumnMode ? "Switch to 1 Day View" : "Switch to 2 Days View"}
        >
          <Columns size={13} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (setTimelineHeightScale) {
              const next = Math.min(3.5, Number((timelineHeightScale + 0.1).toFixed(2)));
              localStorage.setItem("timeline_height_scale", next.toString());
              setTimelineHeightScale(next);
              if (triggerZoomFeedback) triggerZoomFeedback(`Zoom: ${Math.round(next * 100)}%`);
            }
          }}
          className={`p-2 rounded-xl backdrop-blur-md border hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer ${
            isGraphicsMode
              ? "bg-[#FFF2DF] hover:bg-[#FAF3E0] border-[#EADDC7] text-[#594230] hover:text-[#1F1A16]"
              : "bg-slate-950/70 hover:bg-slate-900/90 border-white/10 text-slate-300 hover:text-white"
          }`}
          title="Zoom In (Expand Height)"
        >
          <ZoomIn size={13} strokeWidth={2.5} />
        </button>
        <div className={`backdrop-blur-md border rounded-lg text-[8px] font-mono font-bold py-0.5 px-1 text-center select-none shadow ${
          isGraphicsMode
            ? "bg-[#FFF2DF] border-[#EADDC7] text-[#A25F37]"
            : "bg-slate-950/80 border-white/10 text-indigo-400"
        }`}>
          {Math.round(timelineHeightScale * 100)}%
        </div>
        <button
          type="button"
          onClick={() => {
            if (setTimelineHeightScale) {
              const next = Math.max(0.40, Number((timelineHeightScale - 0.1).toFixed(2)));
              localStorage.setItem("timeline_height_scale", next.toString());
              setTimelineHeightScale(next);
              if (triggerZoomFeedback) triggerZoomFeedback(`Zoom: ${Math.round(next * 100)}%`);
            }
          }}
          className={`p-2 rounded-xl backdrop-blur-md border hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer ${
            isGraphicsMode
              ? "bg-[#FFF2DF] hover:bg-[#FAF3E0] border-[#EADDC7] text-[#594230] hover:text-[#1F1A16]"
              : "bg-slate-950/70 hover:bg-slate-900/90 border-white/10 text-slate-300 hover:text-white"
          }`}
          title="Zoom Out (Compact Height)"
        >
          <ZoomOut size={13} strokeWidth={2.5} />
        </button>
      </div>

      <div 
        ref={timelineContainerRef}
        onScroll={(e) => setDragScrollY(e.currentTarget.scrollTop)}
        onMouseMove={handleTimelineContainerMouseMove}
        onTouchStart={handleTimelineTouchStart}
        onTouchMove={handleTimelineTouchMove}
        onMouseUp={handleTimelineDragEnd}
        onTouchEnd={handleTimelineTouchEnd}
        style={{ 
          overflowY: "auto",
          scrollBehavior: "auto",
          WebkitOverflowScrolling: "touch",
          backgroundColor: effectiveTimelineBg
        }}
        className={`border overflow-x-hidden flex-1 flex flex-col backdrop-blur-md shadow-2xl relative select-none timeline-scrollbar overscroll-contain pb-48 ${
          isGraphicsMode
            ? "border-[#EADDC7] rounded-[28px] sm:rounded-[32px]"
            : `border-white/10 rounded-[28px] sm:rounded-[32px] ${effectiveTimelineBg ? "" : (isDark ? "bg-slate-950/60" : "bg-white/80")}`
        } ${
          timelineDragId || isPinchActive || isDropSettling ? "touch-none" : "touch-pan-y"
        }`}
      >
        {/* Sticky Column Day Headers */}
        {isGraphicsMode ? (
          <div 
            className="sticky top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-[#EADDC7] backdrop-blur-xl px-4 py-2 select-none shadow-xs shrink-0"
            style={{ backgroundColor: effectiveTimelineBg || "#FAF3E0" }}
          >
            <div className="w-16 shrink-0 text-[11px] font-extrabold text-[#1F1A16]">Time</div>
            <div className="flex-1 flex items-center justify-center">
              {/* Date is centrally displayed in the persistent floating date bubble in graphics mode */}
            </div>
            <div className="w-16 shrink-0" />
          </div>
        ) : (
          <div className="sticky top-0 left-0 right-0 z-40 flex items-center border-b border-white/10 bg-slate-950/95 backdrop-blur-xl px-4 py-2.5 text-[11px] font-bold tracking-wider pointer-events-none shadow-md shrink-0 font-mono text-slate-200">
            <div className="w-14 shrink-0 text-[10px] uppercase font-black text-indigo-400 font-mono">Time</div>
            <div className="flex-1 flex items-center justify-center gap-2 border-r pr-2 text-indigo-300 border-white/10">
              <Calendar size={13} className="text-indigo-400" />
              <span className="font-semibold">{isTwoColumnMode ? "Day 1 • " : ""}{formatDate(selectedDate || "")}</span>
            </div>
            {isTwoColumnMode && (
              <div className="flex-1 flex items-center justify-center gap-2 pl-2 text-sky-300">
                <CalendarRange size={13} className="text-sky-400" />
                <span className="font-semibold">Day 2 • {formatDate(getNextDateString(selectedDate || "2026-08-10", 1))}</span>
              </div>
            )}
          </div>
        )}
      {/* Dynamic on-screen Zoom/Increment Scale Feedback Badge */}
      {zoomFeedback && (
        <div className="absolute right-6 top-6 z-45 bg-slate-950/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in text-[10px] uppercase font-black tracking-wider text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>{zoomFeedback}</span>
        </div>
      )}

      {/* Vertical hours rail on left */}
      <div 
        className={`${isGraphicsMode ? "w-16" : "w-14"} absolute left-0 top-10 z-30 pointer-events-none text-right pr-2 py-4 ${
          isGraphicsMode
            ? "shadow-[2px_0_12px_rgba(61,49,42,0.06)]"
            : `bg-slate-950/40 shadow-[4px_0_24px_rgba(0,0,0,0.35)] border-r ${isDark ? "border-white/10" : "border-slate-200"}`
        }`} 
        style={{ 
          height: timelineHours * HOUR_HEIGHT,
          backgroundColor: effectiveTimelineBg
        }}
      >
        {/* Continuous green line down the rail in Graphics Mode */}
        {isGraphicsMode && (
          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-[#1E4633] z-10" />
        )}
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
                className={`mr-2.5 text-[10.5px] font-bold tracking-tight flex items-baseline gap-0.5 select-none ${
                  isGraphicsMode ? "font-sans text-[#1F1A16]" : "font-mono"
                }`}
                style={{ color: isGraphicsMode ? undefined : timelineHourMarkerColor }}
              >
                <span>{adjustedHour}:00</span>
                <span className="text-[7.5px] font-bold uppercase opacity-85 ml-0.5">{displayAmpm}</span>
                {isNextDay && (
                  <span className={`text-[6.5px] font-black ml-0.5 uppercase ${isGraphicsMode ? "text-[#C53030]" : "text-rose-400/90"}`}>+1d</span>
                )}
              </div>
              {/* Node on the rail */}
              {isGraphicsMode ? (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1E4633] border-2 border-[#FAF3E0] absolute right-0 translate-x-[4.5px] z-20" />
              ) : (
                <div 
                  className="w-2.5 h-[1.5px] rounded-full absolute right-0 translate-x-[1px]"
                  style={{ backgroundColor: timelineHourMarkerColor }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic vertical grid panel */}
      <div 
        className={`flex-1 w-full relative min-h-[500px] ${
          isGraphicsMode ? "" : "bg-slate-900/10"
        }`} 
        style={{ 
          height: timelineHours * HOUR_HEIGHT + 250,
          backgroundColor: effectiveTimelineBg
        }}
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
          className={`absolute left-0 right-0 h-[2px] z-30 pointer-events-none flex items-center ${
            isGraphicsMode ? "bg-[#C84B31]" : "bg-rose-500"
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full -ml-1.5 border shrink-0 ${
            isGraphicsMode 
              ? "bg-[#C84B31] border-[#FAF3E0] shadow-[0_0_8px_rgba(200,75,49,0.7)]" 
              : "bg-rose-500 border-white shadow-[0_0_10px_rgba(244,63,94,0.9)]"
          }`} />
          <span className={`text-[7.5px] font-black px-1 py-0.5 rounded font-mono scale-[0.8] origin-left uppercase tracking-wider ml-1.5 shrink-0 ${
            isGraphicsMode
              ? "bg-[#C84B31] text-white shadow-sm"
              : "bg-rose-500 text-white shadow-[0_2px_5px_rgba(0,0,0,0.5)]"
          }`}>
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
              borderColor: isGraphicsMode ? "#EADDC7" : (timelineHourMarkerColor || "rgba(255,255,255,0.1)")
            }}
            className="absolute left-0 right-0 border-t pointer-events-none opacity-90"
          >
            {/* Intermediate dashed guide rule (30 minutes) */}
            <div 
              style={{ 
                top: HOUR_HEIGHT / 2,
                borderColor: isGraphicsMode ? "#F3E9D9" : (timelineSublineColor || "rgba(255,255,255,0.06)")
              }} 
              className="absolute left-0 right-0 border-t border-dashed"
            />

            {/* Quarter hour sub-ticks (15m and 45m) for architectural detail */}
            {HOUR_HEIGHT >= 120 && (
              <>
                <div 
                  style={{ 
                    top: HOUR_HEIGHT * 0.25,
                    borderColor: isGraphicsMode ? "#F3E9D9" : (timelineSublineColor || "rgba(255,255,255,0.05)")
                  }} 
                  className="absolute left-14 w-3 border-t border-dashed"
                />
                <div 
                  style={{ 
                    top: HOUR_HEIGHT * 0.75,
                    borderColor: isGraphicsMode ? "#F3E9D9" : (timelineSublineColor || "rgba(255,255,255,0.05)")
                  }} 
                  className="absolute left-14 w-3 border-t border-dashed"
                />
              </>
            )}
          </div>
        ))}

        {/* Render ghost draft slot for blank space long-pressing/holding */}
        {ghostTask && (() => {
          const containerRect = timelineContainerRef.current?.getBoundingClientRect();
          const isSecondCol = isTwoColumnMode && timelineDragX > 0 && containerRect && (timelineDragX > containerRect.left + 64 + (containerRect.width - 80) / 2);
          const gLeft = isTwoColumnMode ? (isSecondCol ? "calc(50% + 4px)" : "64px") : "64px";
          const gRight = isTwoColumnMode ? (isSecondCol ? "16px" : "calc(50% + 4px)") : "16px";

          const endMins = ghostTask.mins + ghostTask.durationMins;
          const startTimeStr = formatTime(ghostTask.time);
          const endTimeStr = formatTime(minutesToTimeString(endMins));
          const fullTimeRangeStr = `${startTimeStr} – ${endTimeStr}`;
          const gTop = (ghostTask.mins / 60) * HOUR_HEIGHT;
          const gHeight = Math.max((ghostTask.durationMins / 60) * HOUR_HEIGHT, 65);

          return (
            <div
              style={{
                position: "absolute",
                top: gTop,
                height: gHeight,
                left: gLeft,
                right: gRight,
                zIndex: 35,
              }}
              className={`border-2 border-dashed rounded-2xl flex items-center justify-center p-3 pointer-events-none relative overflow-visible transition-all duration-75 ${
                isGraphicsMode
                  ? "border-[#A25F37] bg-[#FFF2DF]/85 shadow-[0_4px_20px_rgba(162,95,55,0.2)]"
                  : "border-cyan-400/90 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.25)] backdrop-blur-xs"
              }`}
            >
              {/* Corner brackets */}
              <div className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 rounded-tl-sm ${isGraphicsMode ? "border-[#A25F37]" : "border-cyan-300"}`} />
              <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 rounded-tr-sm ${isGraphicsMode ? "border-[#A25F37]" : "border-cyan-300"}`} />
              <div className={`absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 rounded-bl-sm ${isGraphicsMode ? "border-[#A25F37]" : "border-cyan-300"}`} />
              <div className={`absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 rounded-br-sm ${isGraphicsMode ? "border-[#A25F37]" : "border-cyan-300"}`} />

              {/* Glowing Top Laser Guide Line */}
              <div className={`absolute top-0 left-0 right-0 h-[3.5px] rounded-full z-20 ${
                isGraphicsMode
                  ? "bg-gradient-to-r from-[#A25F37] via-[#D4A373] to-[#2D6A4F] shadow-[0_0_12px_rgba(162,95,55,0.6)]"
                  : "bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 shadow-[0_0_16px_rgba(34,211,238,1)]"
              }`} />
              
              {/* Center Info Badge */}
              <div className={`text-center font-bold text-xs flex flex-col items-center gap-1 py-2 px-3.5 rounded-xl border shadow-2xl z-10 scale-100 ${
                isGraphicsMode
                  ? "bg-[#FAF3E0] text-[#1F1A16] border-[#EADDC7]"
                  : "bg-slate-950/95 text-cyan-300 border-cyan-400/40"
              }`}>
                <div className={`flex items-center gap-1.5 text-[8.5px] uppercase font-black tracking-widest ${
                  isGraphicsMode ? "text-[#A25F37]" : "text-cyan-300"
                }`}>
                  <span className={`w-2 h-2 rounded-full animate-ping ${isGraphicsMode ? "bg-[#A25F37]" : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]"}`} />
                  <span>
                    {timelineIncrement === 0
                      ? "Exact (0m) Snap"
                      : `:${String(timelineIncrement).padStart(2, "0")}m Snap Aligned`}
                  </span>
                  <span className={isGraphicsMode ? "text-[#8C7A6B]" : "text-indigo-400"}>•</span>
                  <span className={isGraphicsMode ? "text-[#594230]" : "text-indigo-300"}>
                    {isTwoColumnMode ? (isSecondCol ? `Day 2 • ${formatDate(getNextDateString(selectedDate || "", 1))}` : `Day 1 • ${formatDate(selectedDate || "")}`) : "New Task"}
                  </span>
                </div>
                <span className={`text-xs uppercase font-black drop-shadow ${isGraphicsMode ? "text-[#1F1A16] font-sans" : "font-mono text-white"}`}>
                  {fullTimeRangeStr} ({ghostTask.durationMins}m)
                </span>
                <span className={`text-[8px] font-bold uppercase tracking-wider ${isGraphicsMode ? "text-[#8C7A6B]" : "text-slate-400"}`}>
                  Release to edit title & details
                </span>
              </div>
            </div>
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
          .filter(group => group.tasks.length > 0 && !group.tasks.every(t => t.completed))
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
              const gridInc = (timelineIncrement === 0) ? 1 : (timelineIncrement || 5);
              const snappedMinutes = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / gridInc) * gridInc));
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

                {/* Persistent Sequence Block Header - removed when all tasks in sequence are completed */}
                {isSeqLocked ? (
                  groupHeight >= 55 && !groupAllCompleted && (
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
                      <div className="bg-slate-955/95 border text-indigo-300 px-3 py-1 rounded-full shadow-[0_4px_16px_rgba(99,102,241,0.25)] flex items-center gap-2 backdrop-blur-md transition-all border-indigo-500/35 hover:border-indigo-400 text-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />
                        <span className="text-[8.5px] font-black tracking-widest uppercase flex items-center gap-1.5 leading-none">
                          <LinkIcon size={9} strokeWidth={3} className="shrink-0 text-indigo-400" />
                          <span className="max-w-[150px] truncate text-white">{group.name || "Sequence Block"}</span> 
                          <span className="opacity-70 text-[8px] font-mono">({group.tasks.length} STEPS)</span>
                          <span className="bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-[6.5px] px-1.5 py-0.5 rounded font-black tracking-normal">LOCKED</span>
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
                  groupHeight >= 25 && !groupAllCompleted && (
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
            const gridInc = (timelineIncrement === 0) ? 1 : (timelineIncrement || 5);
            const snappedMinutes = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / gridInc) * gridInc));
            const oldStart = timeToMinutes(draggedTask.computedTime || draggedTask.time);
            dragShiftMins = snappedMinutes - oldStart;
          }

          const day1Tasks = filteredScheduledDailyTasks.map(t => ({ ...t, columnKey: "col1" as const }));
          const day2Tasks = (isTwoColumnMode && scheduledNextDailyTasks ? scheduledNextDailyTasks : []).map(t => ({ ...t, columnKey: "col2" as const }));
          const allDisplayTasks = [...day1Tasks, ...day2Tasks];

          // Compute contextual neighbor references during active card dragging
          const containerRect = timelineContainerRef.current?.getBoundingClientRect();
          const isSecondCol = isTwoColumnMode && containerRect && ((timelineDragX - containerRect.left - 64) > (containerRect.width - 80) / 2);
          const activeColTasks = ((isSecondCol ? scheduledNextDailyTasks : scheduledDailyTasks) || [])
            .filter(t => t.id !== timelineDragId && !t.completed && !t.isOpenPlaceholder);

          const sortedColTasks = [...activeColTasks].sort((a, b) => {
            return timeToMinutes(a.computedTime || a.time || "00:00") - timeToMinutes(b.computedTime || b.time || "00:00");
          });

          let prevTask: Task | null = null;
          let nextTask: Task | null = null;
          const directOverlapTasks: Task[] = [];

          if (timelineDragId && currentDraggedSnappedMinutes !== null) {
            const dragDur = draggedTask ? parseDurationToMinutes(draggedTask.duration) : 30;
            const targetStart = currentDraggedSnappedMinutes;
            const targetEnd = targetStart + dragDur;

            sortedColTasks.forEach(t => {
              if (t.id === timelineDragId) return;
              const prospective = prospectiveCascadeMap[t.id];
              const tStart = (prospective && prospective.isDisplaced && !prospective.isOverflowed)
                ? prospective.prospectiveStartMins
                : timeToMinutes(t.computedTime || t.time || "00:00");
              const tDur = parseDurationToMinutes(t.duration) || 30;
              const tEnd = tStart + tDur + (t.travelAfter || 0);
              const tBefore = tStart - (t.travelBefore || 0);

              if (tEnd <= targetStart + 2) {
                prevTask = t;
              } else if (tBefore >= targetEnd - 2 && !nextTask) {
                nextTask = t;
              }

              // A true space constraint only occurs if cascade overflowed or cannot resolve the slot
              if (prospective?.isOverflowed || (tStart < targetEnd && tEnd > targetStart)) {
                directOverlapTasks.push(t);
              }
            });

            // Physical feedback: Trigger tactile micro-tap when entering space constraint collision
            const currentOverlapIds = new Set(directOverlapTasks.map(t => t.id));
            const hasNewCollision = directOverlapTasks.some(t => !prevCollidedTaskIdsRef.current.has(t.id));
            if (hasNewCollision) {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                try {
                  navigator.vibrate(18);
                } catch (_) {}
              }
            }
            prevCollidedTaskIdsRef.current = currentOverlapIds;
          }

          return allDisplayTasks.map((task, taskIndex) => {
            const isGroupCompanionOfDragged = isDraggingSeq && task.groupId === draggedTask?.groupId && !task.isUnlinked;
            const originalStartMins = timeToMinutes(task.computedTime || task.time);
            const startMins = isGroupCompanionOfDragged ? originalStartMins + dragShiftMins : originalStartMins;
            
            const duration = parseDurationToMinutes(task.duration);
            const isAppt = task.isLocked && !task.completed;
            const isTimelineBasicMagnified = cardDensity === "very_simplified" && (fontSizeScale === "readable" || fontSizeScale === "large" || timelineHeightScale <= 0.21);

            const isDraggingThis = timelineDragId === task.id;
            const isResizingThis = resizingTask?.taskId === task.id;
            const isMenuOpen = openMenuTaskId === task.id;

            const prospective = prospectiveCascadeMap[task.id];
            const isDisplaced = !isDraggingThis && (prospective?.isDisplaced || false);
            const displacedTimeStr = prospective?.prospectiveTimeStr;

            const isAdjacentAbove = !isDraggingThis && !task.completed && prevTask && (prevTask as Task).id === task.id;
            const isAdjacentBelow = !isDraggingThis && !task.completed && nextTask && (nextTask as Task).id === task.id;
            const isOverlappingThis = !isDraggingThis && !task.completed && directOverlapTasks.some(ot => ot.id === task.id);
            let collisionBumpDirection: "up" | "down" | null = null;
            if (isOverlappingThis && currentDraggedSnappedMinutes !== null) {
              const thisStart = timeToMinutes(task.computedTime || task.time || "00:00");
              collisionBumpDirection = currentDraggedSnappedMinutes <= thisStart ? "down" : "up";
            }

            const effectiveStartMins = isDraggingThis
              ? (prospective?.prospectiveStartMins !== undefined
                  ? prospective.prospectiveStartMins
                  : (currentDraggedSnappedMinutes !== null ? currentDraggedSnappedMinutes : startMins))
              : (isDisplaced && prospective?.prospectiveStartMins !== undefined
                ? prospective.prospectiveStartMins
                : startMins);

            const top = isResizingThis
              ? (resizingTask.currentStartMins / 60) * HOUR_HEIGHT
              : (effectiveStartMins / 60) * HOUR_HEIGHT;

            const height = isResizingThis
              ? Math.max(15, (resizingTask.currentDurMins / 60) * HOUR_HEIGHT)
              : Math.max(
                  (duration / 60) * HOUR_HEIGHT,
                  isTimelineBasicMagnified && expandedStandardFields[task.id]
                    ? (task.helpfulLinks || task.hyperlink ? 125 : 90)
                    : 26
                );

            const beforeVal = task.travelBefore || 0;
            const afterVal = task.travelAfter || 0;

            const beforeTop = ((effectiveStartMins - beforeVal) / 60) * HOUR_HEIGHT;
            const beforeHeight = (beforeVal / 60) * HOUR_HEIGHT;

            const afterTop = ((effectiveStartMins + (isResizingThis ? resizingTask.currentDurMins : duration)) / 60) * HOUR_HEIGHT;
            const afterHeight = (afterVal / 60) * HOUR_HEIGHT;

            const cardPaddingClass = "p-1 px-2";
            const cardRadiusClass = "rounded-xl";

            const colLeft = task.columnKey === "col2" ? "calc(50% + 4px)" : "64px";
            const colRight = task.columnKey === "col2" ? "16px" : isTwoColumnMode ? "calc(50% + 4px)" : "16px";

            const cardClassString = isDayPlannerActive
              ? "bg-white text-slate-800 border border-slate-200 shadow-sm"
              : task.groupId && !task.isUnlinked
                ? (isDark ? 'group-card-dark-glow text-white' : 'group-card-light-glow text-slate-900')
                : getTaskCardClassString(task.isLocked, task.priority || "none", task.completed, true, task.isInProgress, !!task.isOpenPlaceholder);

            const startTimeStr = (isDraggingThis && currentDraggedSnappedMinutes !== null)
              ? minutesToTimeString(currentDraggedSnappedMinutes)
              : (prospective?.prospectiveTimeStr || task.computedTime || task.time || "08:00");
            const taskStartMins = timeToMinutes(startTimeStr);
            const durMins = parseDurationToMinutes(task.duration) || 15;
            const endMins = taskStartMins + durMins;
            const endTimeStr = minutesToTimeString(endMins);
            const startFormatted = formatTime(startTimeStr);
            const endFormatted = formatTime(endTimeStr);

            // Straddle calculation for inserting flexible task between adjacent task cards
            const colTasks = task.columnKey === "col2" ? day2Tasks : day1Tasks;
            const taskIndexInCol = colTasks.findIndex(t => t.id === task.id);
            const nextTaskInCol = (taskIndexInCol !== -1 && taskIndexInCol < colTasks.length - 1) ? colTasks[taskIndexInCol + 1] : null;

            let straddleY = 0;
            let btnRight = "20px";
            if (nextTaskInCol) {
              const taskCardBottom = top + height + (afterVal > 0 ? afterHeight : 0);
              const nextStartMins = timeToMinutes(nextTaskInCol.computedTime || nextTaskInCol.time || "00:00");
              const nextProspective = prospectiveCascadeMap[nextTaskInCol.id];
              const nextEffectiveStartMins = nextProspective ? nextProspective.prospectiveStartMins : nextStartMins;
              const nextBeforeVal = nextTaskInCol.travelBefore || 0;
              const nextTop = nextProspective ? nextProspective.top : (nextEffectiveStartMins / 60) * HOUR_HEIGHT;
              const nextEffectiveTop = nextBeforeVal > 0 ? ((nextEffectiveStartMins - nextBeforeVal) / 60) * HOUR_HEIGHT : nextTop;
              straddleY = (taskCardBottom + nextEffectiveTop) / 2;
              btnRight = task.columnKey === "col2" ? "20px" : isTwoColumnMode ? "calc(50% + 12px)" : "20px";
            }

            return (
              <React.Fragment key={`${task.id}-${task.columnKey || "col1"}`}>
                {/* Before Buffer Illustration */}
                {beforeVal > 0 && (
                  <TimelineTaskBufferIllustration
                    type="before"
                    task={task}
                    bufferMins={beforeVal}
                    top={beforeTop}
                    height={beforeHeight}
                    colLeft={colLeft}
                    colRight={colRight}
                    isDark={isDark}
                    flexActivities={flexActivities}
                    onToggleCompleteBuffer={handleToggleCompleteBuffer}
                    onStartBufferCountdown={handleStartBufferCountdown}
                    onUpdateBufferPurpose={onUpdateBufferPurpose}
                    onOpenManageFlexActivities={onOpenManageFlexActivities}
                  />
                )}

                {/* Main Task Card */}
                <TimelineTaskCard
                  task={task}
                  top={top}
                  height={height}
                  colLeft={colLeft}
                  colRight={colRight}
                  cardRadiusClass={cardRadiusClass}
                  cardPaddingClass={cardPaddingClass}
                  cardClassString={cardClassString}
                  isDraggingThis={isDraggingThis}
                  isLongPressPending={timelinePendingDragTaskId === task.id}
                  isResizingThis={isResizingThis}
                  isHighlighted={highlightedCalendarTaskId === task.id}
                  isDisplaced={isDisplaced}
                  isTapped={tappedCardTaskId === task.id}
                  isOverlapping={isOverlappingThis}
                  collisionBumpDirection={collisionBumpDirection}
                  draggedTaskCollisionActive={isDraggingThis ? directOverlapTasks.length > 0 : false}
                  timelineCardBorderColor={timelineCardBorderColor}
                  isDark={isDark}
                  isMenuOpen={isMenuOpen}
                  isSubtasksExpanded={!!expandedSubtaskTaskId[task.id]}
                  enableTimeStretch={enableTimeStretch}
                  resizingTask={resizingTask}
                  startFormatted={startFormatted}
                  endFormatted={endFormatted}
                  onCardClick={handleCardClick}
                  onStartTimelineDrag={startTimelineDrag}
                  onOpenBufferCustomizer={onOpenBufferCustomizer}
                  onResizeStart={handleEdgeResizeStart}
                  onToggleComplete={handleToggleComplete}
                  onTriggerEditForm={triggerEditForm}
                  onToggleMenu={handleToggleMenu}
                  onCloseMenu={handleCloseMenu}
                  onPlayPress={handlePlayPress}
                  onRequestToggleLock={requestToggleLock}
                  onSetPriority={handleSetPriority}
                  onToggleSubtasks={handleToggleSubtasks}
                  onMoveToBacklog={handleMoveToBacklog}
                  onMoveToNextDay={handleMoveToNextDay}
                  onRequestDeleteTask={requestDeleteTask}
                  renderSubtaskDropdown={renderSubtaskDropdown}
                />

                {/* After Buffer Illustration */}
                {afterVal > 0 && (
                  <TimelineTaskBufferIllustration
                    type="after"
                    task={task}
                    bufferMins={afterVal}
                    top={afterTop}
                    height={afterHeight}
                    colLeft={colLeft}
                    colRight={colRight}
                    isDark={isDark}
                    flexActivities={flexActivities}
                    onToggleCompleteBuffer={handleToggleCompleteBuffer}
                    onStartBufferCountdown={handleStartBufferCountdown}
                    onUpdateBufferPurpose={onUpdateBufferPurpose}
                    onOpenManageFlexActivities={onOpenManageFlexActivities}
                  />
                )}

                {/* Straddling Insert Flexible Task Plus Button between adjacent task cards */}
                {nextTaskInCol && onInsertFlexibleTaskBetween && (
                  <TimelineTaskStraddleButton
                    straddleY={straddleY}
                    btnRight={btnRight}
                    isDark={isDark}
                    taskA={task}
                    taskB={nextTaskInCol}
                    onInsertFlexibleTaskBetween={onInsertFlexibleTaskBetween}
                  />
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
