import React, { useState, useRef, useEffect, memo, useMemo } from "react";
import { useAppStore } from "../../store";
import { Task } from "../../types";
import { 
  Check, Play, Pause, MapPin, ArrowUpRight, Lock, Unlock, 
  Link as LinkIcon, Flag, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Clock,
  Layers, Eye, SkipBack, SkipForward, Plus, Archive, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  formatTime, 
  timeToMinutes, 
  minutesToTimeString, 
  parseDurationToMinutes, 
  formatDuration 
} from "../../utils/timeHelpers";
import { getGoogleMapsDirectionsUrl, computeProspectiveCascadeMap } from "../InteractiveAppHelpers";

interface HorizontalTimelineViewProps {
  isDark: boolean;
  isDayPlannerActive: boolean;
  timelineHours: number;
  timelineIncrement: number;
  currentTimeMins: number;
  filteredScheduledDailyTasks: Task[];
  scheduledDailyTasks: Task[];
  cardDensity: "standard" | "simplified" | "very_simplified" | "report";
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
  timelineHeightScale: number;
  setTimelineHeightScale?: React.Dispatch<React.SetStateAction<number>>;
  triggerZoomFeedback?: (msg: string) => void;

  // Callbacks
  handleToggleComplete: (task: Task) => void;
  handlePlayPress: (task: Task) => void;
  triggerEditForm: (task: Task, field?: string) => void;
  requestToggleLock: (task: Task) => void;
  handleMoveToBacklog?: (task: Task) => void;
  handleMoveToNextDay?: (task: Task) => void;
  requestDeleteTask: (task: Task) => void;
  setPrioritySelectTask: (task: Task | null) => void;
  renderSubtaskDropdown: (task: Task) => React.ReactNode;
  isAcceptedPassedTask: (task: Task) => boolean;
  getTaskCardClassString: (isLocked: boolean, priority: string, completed: boolean, hoverable?: boolean, isInProgress?: boolean, isOpenPlaceholder?: boolean) => string;
  handleTimelineSnapDrop: (timeStr: string, specificTaskId?: string | null, bypassConflictCheck?: boolean) => void;
  triggerLongPressAdd?: (timeStr: string) => void;
  currentTimeScrollSignal?: number;
}

export const HorizontalTimelineView: React.FC<HorizontalTimelineViewProps> = memo(({
  isDark,
  isDayPlannerActive,
  timelineHours,
  timelineIncrement,
  currentTimeMins,
  filteredScheduledDailyTasks,
  scheduledDailyTasks,
  cardDensity,
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
  timelineHeightScale,
  setTimelineHeightScale,
  triggerZoomFeedback,
  currentTimeScrollSignal,

  handleToggleComplete,
  handlePlayPress,
  triggerEditForm,
  requestToggleLock,
  handleMoveToBacklog,
  handleMoveToNextDay,
  requestDeleteTask,
  setPrioritySelectTask,
  renderSubtaskDropdown,
  isAcceptedPassedTask,
  getTaskCardClassString,
  handleTimelineSnapDrop,
  triggerLongPressAdd
}) => {
  const triggerHaptic = (type: "light" | "medium" | "heavy" | "double") => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      if (type === "light") window.navigator.vibrate(15);
      else if (type === "medium") window.navigator.vibrate(30);
      else if (type === "heavy") window.navigator.vibrate(60);
      else if (type === "double") window.navigator.vibrate([30, 40, 30]);
    }
  };

  // Scroll ratio state and refs for custom grab slider at the bottom
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const sliderThumbRef = useRef<HTMLDivElement | null>(null);
  const sliderPercentRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const updateSliderDOM = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      const ratio = maxScroll <= 0 ? 0 : Math.max(0, Math.min(1, container.scrollLeft / maxScroll));
      if (sliderThumbRef.current) {
        sliderThumbRef.current.style.left = `${ratio * 90}%`;
      }
      if (sliderPercentRef.current) {
        sliderPercentRef.current.textContent = `${Math.round(ratio * 100)}%`;
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateSliderDOM();
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    updateSliderDOM();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [timelineHours, filteredScheduledDailyTasks]);

  const handleSliderMove = (clientX: number) => {
    const track = sliderTrackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;

    const rect = track.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
    
    if (sliderThumbRef.current) {
      sliderThumbRef.current.style.left = `${ratio * 90}%`;
    }
    if (sliderPercentRef.current) {
      sliderPercentRef.current.textContent = `${Math.round(ratio * 100)}%`;
    }
    
    const maxScroll = container.scrollWidth - container.clientWidth;
    container.scrollLeft = ratio * maxScroll;
  };

  const handleSliderDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingSlider(true);
    triggerHaptic("light");
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    handleSliderMove(clientX);
  };

  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      handleSliderMove(clientX);
    };

    const handleGlobalUp = () => {
      setIsDraggingSlider(false);
    };

    window.addEventListener("mousemove", handleGlobalMove, { passive: true });
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove, { passive: true });
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [isDraggingSlider]);

  // HOUR_WIDTH config: horizontal scroll space per hour, dynamically scaled by timelineHeightScale
  const HOUR_WIDTH = Math.round(280 * (timelineHeightScale || 0.8));
  const selectedDate = useAppStore((state) => state.selectedDate);

  // Drag-and-drop state inside the horizontal timeline
  const [activeDrag, setActiveDrag] = useState<{
    taskId: string;
    startMins: number;
    startX: number;
    currentMins: number;
    durationMins: number;
    title: string;
  } | null>(null);

  // Derive snapped minutes for horizontal active drag
  const snappedActiveDragMins = useMemo(() => {
    if (!activeDrag) return null;
    return Math.round(activeDrag.currentMins / 5) * 5;
  }, [activeDrag]);

  // Compute live cascade displacement map when dragging in horizontal view (memoized on snapped mins)
  const prospectiveCascadeMap = useMemo(() => {
    if (!activeDrag || snappedActiveDragMins === null) return {};
    return computeProspectiveCascadeMap(
      activeDrag.taskId,
      minutesToTimeString(snappedActiveDragMins),
      selectedDate,
      scheduledDailyTasks,
      timelineHours,
      100
    );
  }, [activeDrag, snappedActiveDragMins, selectedDate, scheduledDailyTasks, timelineHours]);

  // 300ms press-and-hold card drag states & refs
  const [pressingTaskId, setPressingTaskId] = useState<string | null>(null);
  const pendingDragTimeoutRef = useRef<any>(null);
  const pendingDragTaskRef = useRef<Task | null>(null);
  const pendingDragDataRef = useRef<{
    clientX: number;
    clientY: number;
    startMins: number;
    durationMins: number;
    clickOffsetInsideCard: number;
  } | null>(null);

  // 250ms Long-press state for creating a new task on blank timeline area
  const blankLongPressTimerRef = useRef<any>(null);
  const blankPressStartCoordsRef = useRef<{ x: number; y: number; timeMins: number } | null>(null);
  const [blankLongPressTimeHint, setBlankLongPressTimeHint] = useState<string | null>(null);
  const [isPressingBlankSpace, setIsPressingBlankSpace] = useState<boolean>(false);

  // Helper to scroll to current time centered
  const scrollToCurrentTime = () => {
    const doScroll = (attempts = 0) => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        const scrollLeftPos = (currentTimeMins / 60) * HOUR_WIDTH - containerRef.current.clientWidth / 2;
        containerRef.current.scrollTo({
          left: Math.max(0, scrollLeftPos),
          behavior: "smooth"
        });
        triggerHaptic("medium");
      } else if (attempts < 6) {
        setTimeout(() => doScroll(attempts + 1), 80);
      }
    };
    setTimeout(() => doScroll(), 60);
  };

  // Auto-scroll to Current Time on mount or signal
  useEffect(() => {
    scrollToCurrentTime();
  }, [currentTimeScrollSignal]);

  const handleShiftPriority = (task: Task, direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    const priorities: Array<"none" | "low" | "medium" | "high"> = ["none", "low", "medium", "high"];
    const currentP = task.priority || "none";
    const curIdx = priorities.indexOf(currentP as any);
    let nextIdx = 0;

    if (direction === "left") {
      nextIdx = curIdx <= 0 ? priorities.length - 1 : curIdx - 1;
    } else {
      nextIdx = curIdx >= priorities.length - 1 ? 0 : curIdx + 1;
    }

    const nextPriority = priorities[nextIdx];
    triggerHaptic("medium");

    useAppStore.getState().updateTask(task.id, { priority: nextPriority });
  };

  // Interval packing algorithm to layout overlapping tasks into unlimited multiple rows/tracks
  const assignTracksToTasks = (tasksList: Task[]) => {
    const sorted = [...tasksList].sort((a, b) => {
      const aStart = timeToMinutes(a.computedTime || a.time || "00:00");
      const bStart = timeToMinutes(b.computedTime || b.time || "00:00");
      if (aStart !== bStart) return aStart - bStart;
      const aDur = parseDurationToMinutes(a.duration || "30m");
      const bDur = parseDurationToMinutes(b.duration || "30m");
      return bDur - aDur;
    });

    const tracks: Task[][] = [];

    sorted.forEach(task => {
      const startMins = timeToMinutes(task.computedTime || task.time || "00:00");
      const durationMins = Math.max(1, parseDurationToMinutes(task.duration || "30m"));
      const endMins = startMins + durationMins;

      let placed = false;

      for (let i = 0; i < tracks.length; i++) {
        const hasOverlapWithTrack = tracks[i].some(existingTask => {
          const existingStart = timeToMinutes(existingTask.computedTime || existingTask.time || "00:00");
          const existingDuration = Math.max(1, parseDurationToMinutes(existingTask.duration || "30m"));
          const existingEnd = existingStart + existingDuration;

          return startMins < existingEnd && endMins > existingStart;
        });

        if (!hasOverlapWithTrack) {
          tracks[i].push(task);
          placed = true;
          break;
        }
      }

      if (!placed) {
        tracks.push([task]);
      }
    });

    const taskTrackMap: Record<string, number> = {};
    tracks.forEach((trackTasks, trackIndex) => {
      trackTasks.forEach(task => {
        taskTrackMap[task.id] = trackIndex;
      });
    });

    const effectiveTrackCount = Math.max(1, tracks.length);

    return { taskTrackMap, trackCount: effectiveTrackCount };
  };

  const { taskTrackMap, trackCount } = useMemo(() => {
    return assignTracksToTasks(filteredScheduledDailyTasks);
  }, [filteredScheduledDailyTasks]);

  // Chronologically sorted tasks for arrow skipping between start times
  const sortedTasksChronological = useMemo(() => {
    return [...filteredScheduledDailyTasks].sort((a, b) => {
      const aStart = timeToMinutes(a.computedTime || a.time || "00:00");
      const bStart = timeToMinutes(b.computedTime || b.time || "00:00");
      return aStart - bStart;
    });
  }, [filteredScheduledDailyTasks]);

  const scrollToTaskTime = (targetTask: Task) => {
    if (!containerRef.current) return;
    const startMins = timeToMinutes(targetTask.computedTime || targetTask.time || "00:00");
    const scrollLeftPos = (startMins / 60) * HOUR_WIDTH - 60;
    containerRef.current.scrollTo({
      left: Math.max(0, scrollLeftPos),
      behavior: "smooth"
    });
    triggerHaptic("medium");
  };

  const handleJumpPrevTask = (currentTask: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentIdx = sortedTasksChronological.findIndex(t => t.id === currentTask.id);
    if (currentIdx > 0) {
      scrollToTaskTime(sortedTasksChronological[currentIdx - 1]);
    } else if (sortedTasksChronological.length > 0) {
      scrollToTaskTime(sortedTasksChronological[sortedTasksChronological.length - 1]);
    }
  };

  const handleJumpNextTask = (currentTask: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentIdx = sortedTasksChronological.findIndex(t => t.id === currentTask.id);
    if (currentIdx !== -1 && currentIdx < sortedTasksChronological.length - 1) {
      scrollToTaskTime(sortedTasksChronological[currentIdx + 1]);
    } else if (sortedTasksChronological.length > 0) {
      scrollToTaskTime(sortedTasksChronological[0]);
    }
  };

  // Precise horizontal drag state references
  const dragOffsetRef = useRef<number>(0);
  const dragXRef = useRef<number>(0);
  const dragYRef = useRef<number>(0);
  const dragHasMovedRef = useRef<boolean>(false);
  const dragStartCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Card drag handlers
  const handleCardDragStart = (
    e: React.MouseEvent<any> | React.TouchEvent<any>, 
    task: Task
  ) => {
    if (
      (e.target as HTMLElement).closest('button') || 
      (e.target as HTMLElement).closest('a') || 
      (e.target as HTMLElement).closest('input') ||
      (e.target as HTMLElement).closest('[data-task-title="true"]')
    ) {
      return;
    }
    
    const container = containerRef.current;
    if (!container) return;
    
    e.stopPropagation();

    const containerRect = container.getBoundingClientRect();
    const startMins = timeToMinutes(task.computedTime || task.time || "00:00");
    const durationMins = parseDurationToMinutes(task.duration || "30m");
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const cardViewportLeft = (startMins / 60) * HOUR_WIDTH - container.scrollLeft + containerRect.left;
    const clickOffsetInsideCard = clientX - cardViewportLeft;

    dragOffsetRef.current = clickOffsetInsideCard;
    dragXRef.current = clientX;
    dragYRef.current = clientY;
    dragHasMovedRef.current = false;
    dragStartCoordsRef.current = { x: clientX, y: clientY };

    if (pendingDragTimeoutRef.current) {
      clearTimeout(pendingDragTimeoutRef.current);
    }

    pendingDragTaskRef.current = task;
    pendingDragDataRef.current = {
      clientX,
      clientY,
      startMins,
      durationMins,
      clickOffsetInsideCard
    };

    setPressingTaskId(task.id);
    triggerHaptic("light");

    pendingDragTimeoutRef.current = setTimeout(() => {
      if (pendingDragTaskRef.current && pendingDragDataRef.current) {
        triggerHaptic("heavy");
        setActiveDrag({
          taskId: pendingDragTaskRef.current.id,
          startMins: pendingDragDataRef.current.startMins,
          startX: pendingDragDataRef.current.clientX,
          currentMins: pendingDragDataRef.current.startMins,
          durationMins: pendingDragDataRef.current.durationMins,
          title: pendingDragTaskRef.current.title
        });
        setPressingTaskId(null);
        pendingDragTaskRef.current = null;
        pendingDragTimeoutRef.current = null;
      }
    }, 250);
  };

  // Stage Blank Space 250ms Long-Press Task Creation Handler
  const handleBlankSpaceStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // If clicking on an existing task card or button/interactive element, skip
    if ((e.target as HTMLElement).closest('[data-task-card="true"]') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const relativeX = clientX - containerRect.left + container.scrollLeft;
    const mins = Math.max(0, Math.min(timelineHours * 60, (relativeX / HOUR_WIDTH) * 60));
    const snappedMins = Math.round(mins / timelineIncrement) * timelineIncrement;

    blankPressStartCoordsRef.current = {
      x: clientX,
      y: clientY,
      timeMins: snappedMins
    };
    setIsPressingBlankSpace(true);

    if (blankLongPressTimerRef.current) {
      clearTimeout(blankLongPressTimerRef.current);
    }

    blankLongPressTimerRef.current = setTimeout(() => {
      if (blankPressStartCoordsRef.current) {
        const timeStr = minutesToTimeString(blankPressStartCoordsRef.current.timeMins);
        triggerHaptic("heavy");
        setBlankLongPressTimeHint(timeStr);
        setTimeout(() => setBlankLongPressTimeHint(null), 1200);

        if (triggerLongPressAdd) {
          triggerLongPressAdd(timeStr);
        }
        blankPressStartCoordsRef.current = null;
        setIsPressingBlankSpace(false);
      }
    }, 250);
  };

  const handleBlankSpaceCancel = () => {
    if (blankLongPressTimerRef.current) {
      clearTimeout(blankLongPressTimerRef.current);
      blankLongPressTimerRef.current = null;
    }
    blankPressStartCoordsRef.current = null;
    setIsPressingBlankSpace(false);
  };

  // Edge scrolling loop when actively dragging
  useEffect(() => {
    let animationFrameId: number;
    const container = containerRef.current;
    if (!container) return;

    if (activeDrag) {
      const tick = () => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const currentX = dragXRef.current;
        const relativeHoverX = currentX - rect.left;
        const containerWidth = rect.width;
        const scrollThreshold = 120;

        let scrolled = false;
        let scrollSpeed = 0;

        if (relativeHoverX < scrollThreshold && relativeHoverX >= -50) {
          const intensity = Math.min(1, Math.max(0, (scrollThreshold - relativeHoverX) / scrollThreshold));
          scrollSpeed = -intensity * 28;
          container.scrollLeft = Math.max(0, container.scrollLeft + scrollSpeed);
          scrolled = true;
        } else if (relativeHoverX > containerWidth - scrollThreshold && relativeHoverX <= containerWidth + 50) {
          const intensity = Math.min(1, Math.max(0, (relativeHoverX - (containerWidth - scrollThreshold)) / scrollThreshold));
          scrollSpeed = intensity * 28;
          container.scrollLeft = Math.min(container.scrollWidth - containerWidth, container.scrollLeft + scrollSpeed);
          scrolled = true;
        }

        if (scrolled) {
          const relativeX = (currentX - dragOffsetRef.current) - rect.left + container.scrollLeft;
          const mins = (relativeX / HOUR_WIDTH) * 60;
          const maxMinutesLimit = timelineHours * 60 - activeDrag.durationMins;
          let snapped = Math.round(mins / timelineIncrement) * timelineIncrement;
          snapped = Math.max(0, Math.min(maxMinutesLimit, snapped));

          setActiveDrag(prev => {
            if (!prev) return null;
            if (prev.currentMins !== snapped) {
              triggerHaptic("light");
              return { ...prev, currentMins: snapped };
            }
            return prev;
          });
        }

        animationFrameId = requestAnimationFrame(tick);
      };

      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeDrag, timelineHours, timelineIncrement, HOUR_WIDTH]);

  // Global move and up listeners
  useEffect(() => {
    if (!activeDrag && !pressingTaskId && !isPressingBlankSpace) {
      return;
    }

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (blankPressStartCoordsRef.current) {
        const diffX = Math.abs(clientX - blankPressStartCoordsRef.current.x);
        const diffY = Math.abs(clientY - blankPressStartCoordsRef.current.y);
        if (diffX > 15 || diffY > 15) {
          handleBlankSpaceCancel();
        }
      }

      if (!activeDrag) {
        if (pressingTaskId) {
          const diffX = Math.abs(clientX - dragStartCoordsRef.current.x);
          const diffY = Math.abs(clientY - dragStartCoordsRef.current.y);
          if (diffX > 10 || diffY > 10) {
            if (pendingDragTimeoutRef.current) {
              clearTimeout(pendingDragTimeoutRef.current);
              pendingDragTimeoutRef.current = null;
            }
            pendingDragTaskRef.current = null;
            setPressingTaskId(null);
          }
        }
        return;
      }

      if ("touches" in e && e.cancelable) {
        e.preventDefault();
      }

      dragXRef.current = clientX;
      dragYRef.current = clientY;

      const diffX = Math.abs(clientX - dragStartCoordsRef.current.x);
      const diffY = Math.abs(clientY - dragStartCoordsRef.current.y);

      if (diffX > 10 || diffY > 10) {
        dragHasMovedRef.current = true;
      }

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const relativeX = (clientX - dragOffsetRef.current) - containerRect.left + container.scrollLeft;
      const mins = (relativeX / HOUR_WIDTH) * 60;

      const maxMinutesLimit = timelineHours * 60 - activeDrag.durationMins;
      
      let snapped = Math.round(mins / timelineIncrement) * timelineIncrement;
      snapped = Math.max(0, Math.min(maxMinutesLimit, snapped));

      if (snapped !== activeDrag.currentMins) {
        triggerHaptic("light");
        setActiveDrag(prev => prev ? { ...prev, currentMins: snapped } : null);
      }
    };

    const handleGlobalUp = () => {
      handleBlankSpaceCancel();

      if (!activeDrag) {
        if (pendingDragTimeoutRef.current) {
          clearTimeout(pendingDragTimeoutRef.current);
          pendingDragTimeoutRef.current = null;
        }
        pendingDragTaskRef.current = null;
        setPressingTaskId(null);
        return;
      }
      
      if (dragHasMovedRef.current) {
        const snappedTimeStr = minutesToTimeString(activeDrag.currentMins);
        handleTimelineSnapDrop(snappedTimeStr, activeDrag.taskId);
        triggerHaptic("double");
      }
      setActiveDrag(null);
    };

    window.addEventListener("mousemove", handleGlobalMove, { passive: false });
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove, { passive: false });
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [activeDrag, pressingTaskId, isPressingBlankSpace, timelineHours, timelineIncrement, HOUR_WIDTH]);

  useEffect(() => {
    return () => {
      if (pendingDragTimeoutRef.current) {
        clearTimeout(pendingDragTimeoutRef.current);
      }
      if (blankLongPressTimerRef.current) {
        clearTimeout(blankLongPressTimerRef.current);
      }
    };
  }, []);

  const toggleCollapsibleField = (taskId: string) => {
    setExpandedStandardFields(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
    triggerHaptic("light");
  };

  const toggleSubtasks = (taskId: string) => {
    setExpandedSubtaskTaskId(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
    triggerHaptic("light");
  };

  const formatMinsToClock = (mins: number) => {
    return formatTime(minutesToTimeString(mins));
  };

  const scrollHorizontal = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Chronologically sort tasks
    const sorted = [...filteredScheduledDailyTasks].sort((a, b) => {
      const aStart = timeToMinutes(a.computedTime || a.time || "00:00");
      const bStart = timeToMinutes(b.computedTime || b.time || "00:00");
      return aStart - bStart;
    });

    if (sorted.length === 0) {
      const scrollAmount = container.clientWidth * 0.45;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      triggerHaptic("light");
      return;
    }

    // 2. Group into contiguous task clusters (tasks with no blank space between them)
    const clusters: Task[][] = [];
    let currentCluster: Task[] = [];
    let maxEndMins = -1;

    sorted.forEach(task => {
      const startMins = timeToMinutes(task.computedTime || task.time || "00:00");
      const durMins = parseDurationToMinutes(task.duration || "30m");
      const endMins = startMins + durMins;

      if (currentCluster.length === 0) {
        currentCluster.push(task);
        maxEndMins = endMins;
      } else {
        // If task starts before or at maxEndMins + 1, it's contiguous
        if (startMins <= maxEndMins + 1) {
          currentCluster.push(task);
          if (endMins > maxEndMins) {
            maxEndMins = endMins;
          }
        } else {
          // Gap/blank space detected
          clusters.push(currentCluster);
          currentCluster = [task];
          maxEndMins = endMins;
        }
      }
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // 3. Create navigation stops: first task of cluster (after blank space) & last task of cluster (before blank space)
    interface NavigationStop {
      task: Task;
      type: "first" | "last";
      centerMins: number;
    }

    const navigationStops: NavigationStop[] = [];

    clusters.forEach(cluster => {
      const firstTask = cluster[0];
      const lastTask = cluster[cluster.length - 1];

      const firstStart = timeToMinutes(firstTask.computedTime || firstTask.time || "00:00");
      const firstDur = parseDurationToMinutes(firstTask.duration || "30m");
      const firstCenter = firstStart + firstDur / 2;

      navigationStops.push({
        task: firstTask,
        type: "first",
        centerMins: firstCenter
      });

      if (lastTask.id !== firstTask.id) {
        const lastStart = timeToMinutes(lastTask.computedTime || lastTask.time || "00:00");
        const lastDur = parseDurationToMinutes(lastTask.duration || "30m");
        const lastCenter = lastStart + lastDur / 2;

        navigationStops.push({
          task: lastTask,
          type: "last",
          centerMins: lastCenter
        });
      }
    });

    // 4. Determine current viewport center in minutes
    const currentScrollLeft = container.scrollLeft;
    const viewportWidth = container.clientWidth;
    const viewportCenterPx = currentScrollLeft + viewportWidth / 2;
    const viewportCenterMins = (viewportCenterPx / HOUR_WIDTH) * 60;

    // 5. Find target navigation stop
    let targetStop: NavigationStop | null = null;
    const bufferMins = 2; // small minute buffer threshold

    if (direction === "right") {
      targetStop = navigationStops.find(stop => stop.centerMins > viewportCenterMins + bufferMins) || null;
      if (!targetStop) {
        targetStop = navigationStops[0];
      }
    } else {
      for (let i = navigationStops.length - 1; i >= 0; i--) {
        if (navigationStops[i].centerMins < viewportCenterMins - bufferMins) {
          targetStop = navigationStops[i];
          break;
        }
      }
      if (!targetStop) {
        targetStop = navigationStops[navigationStops.length - 1];
      }
    }

    // 6. Scroll container to center target task
    if (targetStop) {
      const targetCenterPx = (targetStop.centerMins / 60) * HOUR_WIDTH;
      const targetScrollLeft = targetCenterPx - viewportWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: "smooth"
      });
      triggerHaptic("medium");
    }
  };

  const calculateStageHeight = () => {
    // Dynamic height based on track rows (each track row is ~155px to ensure cards fit comfortably with no vertical overlap)
    return Math.max(220, 52 + trackCount * 155);
  };

  return (
    <div className={`flex flex-col gap-3 border border-white/5 rounded-[32px] p-4 bg-slate-950/45 backdrop-blur shadow-3xl select-none ${isDark ? "text-slate-100" : "text-slate-900"}`}>
      
      {/* Horizontal Timeline Controls Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 z-10 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={scrollToCurrentTime}
            className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/10 px-2.5 py-1 rounded-xl transition-all active:scale-95"
            title="Jump to current time"
          >
            <Clock size={12} className="text-indigo-400" /> Horizontal Timeline
          </button>
          <span className="text-[9px] font-mono font-bold bg-slate-900/90 border border-white/10 px-2.5 py-0.5 rounded-full text-indigo-300">
            {trackCount} {trackCount === 1 ? "Row" : "Rows"}
          </span>
        </div>

        {/* Global Task Jump Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 px-2 py-1 rounded-xl">
          <span className="text-[8px] font-black uppercase text-slate-400 mr-1 hidden sm:inline">Tasks:</span>
          <button
            type="button"
            onClick={() => {
              if (sortedTasksChronological.length > 0) {
                scrollToTaskTime(sortedTasksChronological[0]);
              }
            }}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-indigo-300 transition-all cursor-pointer flex items-center gap-1 text-[8.5px] font-bold"
            title="Jump to first task of the day"
          >
            <SkipBack size={11} />
            <span>First</span>
          </button>
          <span className="text-slate-700">|</span>
          <button
            type="button"
            onClick={() => {
              if (sortedTasksChronological.length > 0) {
                scrollToTaskTime(sortedTasksChronological[sortedTasksChronological.length - 1]);
              }
            }}
            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-indigo-300 transition-all cursor-pointer flex items-center gap-1 text-[8.5px] font-bold"
            title="Jump to last task of the day"
          >
            <span>Last</span>
            <SkipForward size={11} />
          </button>
        </div>
      </div>

      {/* Main Horizontally Scrolling Timeline Stage Wrapper */}
      <div className="relative w-full group/stage">
        
        {/* Long Press 500ms creation notification banner */}
        {blankLongPressTimeHint && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 z-[70] bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-2xl border border-indigo-400 font-bold text-xs flex items-center gap-2 animate-bounce">
            <Plus size={14} strokeWidth={3} />
            <span>Starting New Task at {blankLongPressTimeHint}</span>
          </div>
        )}

        {/* Dynamic on-screen Zoom/Scale Feedback Badge */}
        {zoomFeedback && (
          <div className="absolute right-6 top-6 z-[60] bg-slate-950/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in text-[10px] uppercase font-black tracking-wider text-amber-400 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>{zoomFeedback}</span>
          </div>
        )}

        {/* Active dragging edge-scrolling zones */}
        {activeDrag && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-[120px] bg-gradient-to-r from-indigo-600/15 to-transparent pointer-events-none z-30 flex items-center justify-start pl-3">
              <div className="flex flex-col items-center gap-1 opacity-75 animate-pulse">
                <ChevronLeft className="text-indigo-400" size={24} strokeWidth={3} />
                <span className="text-[7px] font-black uppercase tracking-widest text-indigo-350">Scroll Left</span>
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-[120px] bg-gradient-to-l from-indigo-600/15 to-transparent pointer-events-none z-30 flex items-center justify-end pr-3">
              <div className="flex flex-col items-center gap-1 opacity-75 animate-pulse">
                <ChevronRight className="text-indigo-400" size={24} strokeWidth={3} />
                <span className="text-[7px] font-black uppercase tracking-widest text-indigo-350">Scroll Right</span>
              </div>
            </div>
          </>
        )}

        {/* Semi-transparent Left Arrow */}
        <button
          type="button"
          onClick={() => scrollHorizontal("left")}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-50 p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-lg pointer-events-auto opacity-40 sm:opacity-0 sm:group-hover/stage:opacity-100 hover:opacity-100 flex items-center justify-center cursor-pointer"
          title="Scroll Left"
        >
          <ChevronLeft size={20} strokeWidth={3} />
        </button>

        {/* Semi-transparent Right Arrow */}
        <button
          type="button"
          onClick={() => scrollHorizontal("right")}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-50 p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-lg pointer-events-auto opacity-40 sm:opacity-0 sm:group-hover/stage:opacity-100 hover:opacity-100 flex items-center justify-center cursor-pointer"
          title="Scroll Right"
        >
          <ChevronRight size={20} strokeWidth={3} />
        </button>

        {/* Main Horizontally & Vertically Scrolling Timeline Stage */}
        <div 
          ref={containerRef}
          onMouseDown={handleBlankSpaceStart}
          onTouchStart={handleBlankSpaceStart}
          className={`w-full overflow-x-auto overflow-y-auto overscroll-contain touch-pan-x touch-pan-y rounded-2xl relative border shadow-2xl ${
            isDark 
              ? "border-white/5 bg-slate-900/10 timeline-scrollbar" 
              : "border-slate-200 bg-slate-50/50"
          } ${activeDrag ? "cursor-grabbing" : ""}`}
          style={{ height: `${Math.min(540, calculateStageHeight())}px` }}
        >
          <div 
            className="relative"
            style={{ 
              width: `${timelineHours * HOUR_WIDTH}px`, 
              height: `${calculateStageHeight()}px` 
            }}
          >
            {/* RULER PANEL HEADER */}
            <div 
              className={`sticky top-0 left-0 right-0 h-9 border-b flex items-end z-30 pointer-events-none select-none ${
                isDark 
                  ? "bg-slate-950/95 border-white/10" 
                  : "bg-slate-100/95 border-slate-200"
              }`}
            >
              {Array.from({ length: timelineHours * 4 }).map((_, stepIdx) => {
                const stepMins = stepIdx * 15;
                const leftPos = (stepMins / 60) * HOUR_WIDTH;
                const isHour = stepIdx % 4 === 0;
                const isHalf = stepIdx % 4 === 2;
                const isFirst = stepIdx === 0;

                return (
                  <div 
                    key={stepIdx} 
                    className={`absolute bottom-0 flex flex-col pointer-events-none ${
                      isFirst ? "items-start pl-0" : "items-center -translate-x-1/2"
                    }`}
                    style={{ left: leftPos }}
                  >
                    {isHour ? (
                      <>
                        <span className="text-[7px] font-black font-mono uppercase text-slate-400 tracking-wider mb-0.5">
                          {formatMinsToClock(stepMins)}
                        </span>
                        <div className="w-0.5 h-2.5 bg-indigo-500/80 rounded-full" />
                      </>
                    ) : isHalf ? (
                      <div className="w-0.5 h-1.5 bg-slate-500/60 rounded-full" />
                    ) : (
                      <div className="w-0.5 h-1 bg-slate-600/30 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hour grid lines */}
            {Array.from({ length: timelineHours }).map((_, h) => (
              <div 
                key={h}
                className="absolute top-9 bottom-0 border-l border-white/[0.03] pointer-events-none"
                style={{ left: h * HOUR_WIDTH }}
              />
            ))}

            {/* NOW Vertical Indicator */}
            <div 
              className="absolute top-0 bottom-0 z-40 pointer-events-none flex flex-col items-center"
              style={{ left: (currentTimeMins / 60) * HOUR_WIDTH }}
            >
              <div className="bg-rose-500 px-1.5 py-0.5 rounded text-[7px] font-black font-mono text-white tracking-widest shadow-[0_2px_8px_rgba(244,63,94,0.5)] flex items-center gap-1 uppercase border border-rose-400 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                NOW
              </div>
              <div className="w-[1.5px] h-full bg-gradient-to-b from-rose-500 via-rose-500/50 to-rose-500/5 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </div>

            {/* Active Drag Preview Ghost Slot */}
            {activeDrag && (
              <div
                style={{
                  position: "absolute",
                  top: 44 + (taskTrackMap[activeDrag.taskId] ?? 0) * 155,
                  left: (activeDrag.currentMins / 60) * HOUR_WIDTH,
                  width: Math.max((activeDrag.durationMins / 60) * HOUR_WIDTH, 140),
                  height: activeDrag.durationMins <= 20 ? "68px" : "135px",
                  zIndex: 15,
                }}
                className="border-2 border-dashed border-indigo-400 bg-indigo-500/10 rounded-2xl flex flex-col items-center justify-center p-2 animate-pulse pointer-events-none shadow-[0_0_25px_rgba(99,102,241,0.25)]"
              >
                <div className="text-center font-bold text-indigo-400 text-[9px] flex flex-col items-center gap-0.5 bg-slate-950/95 py-1 px-3 rounded-xl border border-indigo-500/30 shadow-lg">
                  <span className="text-[7.5px] uppercase font-black tracking-widest text-indigo-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    Placement Target
                  </span>
                  <span className="font-mono text-[11px] uppercase text-white font-black whitespace-nowrap">
                    {formatMinsToClock(activeDrag.currentMins)} – {formatMinsToClock(activeDrag.currentMins + activeDrag.durationMins)}
                  </span>
                  <span className="text-[8px] font-mono text-indigo-300 font-bold">
                    ({formatDuration(minutesToTimeString(activeDrag.durationMins))})
                  </span>
                </div>
              </div>
            )}

            {/* Scheduled Task Cards */}
            {filteredScheduledDailyTasks.map(task => {
              const startMins = timeToMinutes(task.computedTime || task.time || "00:00");
              const durationMins = parseDurationToMinutes(task.duration || "30m");
              const trackIndex = taskTrackMap[task.id] ?? 0;
              const isDraggingThis = activeDrag?.taskId === task.id;
              const isShortTask = durationMins <= 20;

              const prospective = prospectiveCascadeMap[task.id];
              const isDisplaced = prospective?.isDisplaced || false;
              const displacedTimeStr = prospective?.prospectiveTimeStr;

              const leftPosition = isDraggingThis && activeDrag
                ? (activeDrag.currentMins / 60) * HOUR_WIDTH
                : prospective 
                  ? (prospective.prospectiveStartMins / 60) * HOUR_WIDTH
                  : (startMins / 60) * HOUR_WIDTH;

              const cardWidth = Math.max(
                (durationMins / 60) * HOUR_WIDTH,
                isShortTask ? 120 : 170
              );

              const isPassed = isAcceptedPassedTask(task);

              return (
                <div
                  key={task.id}
                  data-task-card="true"
                  style={{
                    position: "absolute",
                    top: 44 + trackIndex * 155,
                    left: leftPosition,
                    width: cardWidth,
                    zIndex: isDraggingThis ? 50 : isDisplaced ? 30 : 20,
                    transform: isDraggingThis 
                      ? "scale(1.05) translateY(-3px)" 
                      : pressingTaskId === task.id 
                        ? "scale(0.97)" 
                        : "none"
                  }}
                  className="transition-all duration-300 ease-out select-none"
                >
                  <div
                    onMouseDown={(e) => handleCardDragStart(e, task)}
                    onTouchStart={(e) => handleCardDragStart(e, task)}
                    className={`border cursor-grab active:cursor-grabbing rounded-2xl flex flex-col justify-between relative shadow-xl transition-all duration-150 ${
                      isShortTask ? "p-2 px-2.5 min-h-[68px]" : "p-3.5 min-h-[135px]"
                    } ${
                      isDraggingThis
                        ? "border-indigo-400 bg-indigo-950/90 shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(99,102,241,0.5)] ring-2 ring-indigo-500 scale-[1.04]"
                        : isDisplaced
                          ? "border-indigo-400 bg-indigo-950/90 ring-2 ring-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.45)]"
                          : pressingTaskId === task.id
                            ? "border-indigo-500/80 bg-slate-900/90 shadow-inner scale-[0.97] duration-75"
                            : highlightedCalendarTaskId === task.id
                              ? "border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.55)] animate-pulse"
                              : task.completed
                                ? "border-slate-700/80 bg-slate-900/35 opacity-40 hover:scale-[1.01] hover:opacity-70"
                                : "border-white/20 bg-slate-950/90 hover:border-white/40 hover:scale-[1.025] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.65),0_0_18px_rgba(99,102,241,0.3)] active:scale-[0.97] active:translate-y-0"
                    } ${isPassed ? "border-amber-500/50 bg-amber-500/5 shadow-md text-amber-200" : ""}`}
                  >
                    {/* Live Cascade Displacement Indicator Badge */}
                    {isDisplaced && (
                      <div className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-600 text-white border border-indigo-300/40 shadow-lg z-30 animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-ping" />
                        <span>Moves to {displacedTimeStr}</span>
                      </div>
                    )}
                    <div className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-slate-600/40 pointer-events-none" />
                    <div className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-slate-600/40 pointer-events-none" />
                    
                    <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        task.completed 
                          ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" 
                          : task.isInProgress 
                            ? "bg-rose-500 animate-ping shadow-[0_0_6px_#f43f5e]" 
                            : task.isLocked 
                              ? "bg-indigo-400 shadow-[0_0_6px_#818cf8]" 
                              : "bg-slate-500"
                      }`} />
                    </div>

                    <div className="sticky left-2 max-w-[250px] w-full flex flex-col justify-between h-full z-10 select-none">
                      
                      {/* Task Header: Time, Task Skip Navigation, and Action Controls */}
                      <div className={`flex items-center justify-between gap-1 z-10 select-none ${isShortTask ? "mb-0.5" : "mb-1"}`}>
                        <span className={`font-mono uppercase tracking-wider ${isShortTask ? "text-[7.5px] font-bold" : "text-[9px] font-black"}`}>
                          {isDraggingThis && activeDrag ? (
                            <span className="text-white font-black bg-indigo-900/90 px-1.5 py-0.5 rounded border border-indigo-400/40 shadow">
                              {formatMinsToClock(activeDrag.currentMins)} – {formatMinsToClock(activeDrag.currentMins + activeDrag.durationMins)}
                            </span>
                          ) : (
                            <span className="text-indigo-400">
                              {formatTime(task.computedTime || task.time)} ({formatDuration(task.duration)})
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Task Jump Arrows */}
                          <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-md">
                            <button
                              type="button"
                              onClick={(e) => handleJumpPrevTask(task, e)}
                              className="p-0.5 hover:bg-white/15 rounded text-slate-300 hover:text-indigo-300 transition-all cursor-pointer"
                              title="Skip timeline to previous task start time"
                            >
                              <ChevronLeft size={isShortTask ? 8 : 10} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleJumpNextTask(task, e)}
                              className="p-0.5 hover:bg-white/15 rounded text-slate-300 hover:text-indigo-300 transition-all cursor-pointer"
                              title="Skip timeline to next task start time"
                            >
                              <ChevronRight size={isShortTask ? 8 : 10} strokeWidth={2.5} />
                            </button>
                          </div>

                          {/* Complete Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComplete(task);
                            }}
                            className={`rounded-md border font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                              isShortTask ? "px-1 py-0.2 text-[7.5px]" : "px-1.5 py-0.5 text-[9px]"
                            } ${
                              task.completed 
                                ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                                : "bg-slate-900 border-white/10 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                            }`}
                            title={task.completed ? "Mark incomplete" : "Mark complete"}
                          >
                            <div className={`rounded-sm border flex items-center justify-center shrink-0 ${
                              isShortTask ? "w-2.5 h-2.5" : "w-3 h-3"
                            } ${
                              task.completed ? "border-white bg-emerald-600" : "border-slate-400 bg-slate-950"
                            }`}>
                              <Check size={isShortTask ? 7 : 8} strokeWidth={3} className={task.completed ? "opacity-100 text-white" : "opacity-0"} />
                            </div>
                            {!isShortTask && <span className="text-[8px] uppercase tracking-tight">{task.completed ? "Done" : "Check"}</span>}
                          </button>

                          {/* Play/Pause */}
                          {!task.completed && (
                            <button
                              onClick={() => handlePlayPress(task)}
                              className={`rounded-md border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                isShortTask ? "p-0.5" : "p-1"
                              } ${
                                task.isInProgress 
                                  ? "bg-rose-500 border-rose-400 text-white animate-pulse" 
                                  : "bg-slate-900 border-white/5 text-emerald-400 hover:text-white hover:bg-emerald-600/25"
                              }`}
                              title="Play Activity"
                            >
                              {task.isInProgress ? <Pause size={isShortTask ? 7 : 8} /> : <Play size={isShortTask ? 7 : 8} className="fill-current text-emerald-400 hover:text-white" />}
                            </button>
                          )}

                          {/* Lock Status */}
                          <button
                            onClick={() => requestToggleLock(task)}
                            className={`rounded-md border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                              isShortTask ? "p-0.5" : "p-1"
                            } ${
                              task.isLocked
                                ? "bg-rose-500/15 border-rose-500/25 text-rose-400"
                                : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                            }`}
                            title={task.isLocked ? "Unlock" : "Lock"}
                          >
                            {task.isLocked ? <Lock size={isShortTask ? 7 : 8} /> : <Unlock size={isShortTask ? 7 : 8} />}
                          </button>

                          {/* Send to Backlog */}
                          {handleMoveToBacklog && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToBacklog(task);
                              }}
                              className={`rounded-md border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                isShortTask ? "p-0.5" : "p-1"
                              } bg-slate-900 border-white/5 text-amber-400 hover:text-white hover:bg-amber-500/20`}
                              title="Send to Backlog"
                            >
                              <Archive size={isShortTask ? 7 : 8} />
                            </button>
                          )}

                          {/* Send to Tomorrow */}
                          {handleMoveToNextDay && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToNextDay(task);
                              }}
                              className={`rounded-md border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                isShortTask ? "p-0.5" : "p-1"
                              } bg-slate-900 border-white/5 text-sky-400 hover:text-white hover:bg-sky-500/20`}
                              title="Send to Tomorrow"
                            >
                              <Calendar size={isShortTask ? 7 : 8} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Task Title & Priority Control Bar */}
                      <div className="flex flex-col gap-0.5 z-10">
                        <p 
                          data-task-title="true"
                          onClick={() => triggerEditForm(task)}
                          className={`font-sans tracking-wide leading-tight truncate text-slate-100 hover:text-indigo-400 cursor-pointer select-none ${
                            isShortTask ? "text-[8.5px] font-extrabold pr-2" : "text-[11.5px] font-black pr-4"
                          } ${
                            task.completed ? "line-through opacity-40 text-slate-400" : ""
                          }`}
                        >
                          {task.title}
                        </p>

                        <div className={`flex items-center justify-between gap-1 bg-slate-900/90 border border-white/10 rounded-lg z-10 ${
                          isShortTask ? "my-0.2 px-1 py-0.2" : "my-0.5 px-1.5 py-0.5"
                        }`} onClick={(e) => e.stopPropagation()}>
                          <span className={`font-black uppercase tracking-wider text-slate-400 shrink-0 ${isShortTask ? "text-[6.5px]" : "text-[7.5px]"}`}>Pri:</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleShiftPriority(task, "left", e)}
                              className="p-0.5 hover:bg-white/10 active:scale-90 rounded text-slate-300 hover:text-indigo-300 transition-all cursor-pointer shrink-0"
                              title="Lower Priority / Shift Left"
                            >
                              <ChevronLeft size={isShortTask ? 9 : 11} strokeWidth={2.5} />
                            </button>

                            <span className={`font-black uppercase rounded tracking-wider ${
                              isShortTask ? "text-[6.5px] px-1 py-0.2" : "text-[8px] px-2 py-0.5"
                            } ${
                              task.priority === "high"
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.2)]"
                                : task.priority === "medium"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                                  : task.priority === "low"
                                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_8px_rgba(14,165,233,0.2)]"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}>
                              {task.priority ? task.priority.toUpperCase() : "NONE"}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => handleShiftPriority(task, "right", e)}
                              className="p-0.5 hover:bg-white/10 active:scale-90 rounded text-slate-300 hover:text-indigo-300 transition-all cursor-pointer shrink-0"
                              title="Higher Priority / Shift Right"
                            >
                              <ChevronRight size={isShortTask ? 9 : 11} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Location Map Link & Subtasks Toggle */}
                      <div className={`flex items-center justify-between gap-1 border-t border-white/[0.04] z-10 ${isShortTask ? "mt-0.5 pt-0.5" : "mt-1 pt-1"}`}>
                        <div className="flex items-center gap-1 min-w-0">
                          {task.location && task.location.toString().trim() !== "" && task.location.toString().trim() !== "0" && (
                            <a
                              href={getGoogleMapsDirectionsUrl(task.location)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`font-bold text-rose-300 hover:text-rose-200 flex items-center gap-1 transition-all rounded hover:bg-rose-500/15 border border-rose-500/25 hover:border-rose-400/50 group/map shrink-0 ${
                                isShortTask ? "text-[7px] px-1 py-0.2" : "text-[8px] px-1.5 py-0.5"
                              }`}
                              title={`Open "${task.location}" in Google Maps`}
                            >
                              <MapPin size={isShortTask ? 7 : 9} className="text-rose-400 group-hover/map:scale-110 transition-transform shrink-0" />
                              <span className="truncate max-w-[70px] underline decoration-rose-400/50 underline-offset-2">{task.location}</span>
                              <ArrowUpRight size={isShortTask ? 7 : 8} className="text-rose-400/70 shrink-0" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <button
                              onClick={() => toggleSubtasks(task.id)}
                              className={`text-[7.5px] px-1.5 py-0.5 rounded-md border font-bold uppercase transition-all flex items-center gap-0.5 cursor-pointer ${
                                expandedSubtaskTaskId[task.id]
                                  ? "bg-indigo-500/20 border-indigo-500/35 text-indigo-400"
                                  : "bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
                              {expandedSubtaskTaskId[task.id] ? <ChevronUp size={7} /> : <ChevronDown size={7} />}
                            </button>
                          )}

                          {(task.notes || task.helpfulLinks || task.hyperlink) && (
                            <button
                              onClick={() => toggleCollapsibleField(task.id)}
                              className={`p-1 rounded-md border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                expandedStandardFields[task.id]
                                  ? "bg-slate-800 border-white/10 text-white"
                                  : "bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              <Eye size={8} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedStandardFields[task.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden mt-2 border-t border-white/[0.04] pt-2 space-y-1.5 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.notes && (
                              <div className="bg-slate-900/40 p-1.5 rounded-lg border border-white/5">
                                <p className="text-[7.5px] uppercase font-black tracking-widest text-slate-500 mb-0.5">Notes</p>
                                <p className="text-[9px] text-slate-300 leading-normal line-clamp-3 select-text select-none">
                                  {task.notes}
                                </p>
                              </div>
                            )}
                            {task.helpfulLinks && (
                              <div className="bg-slate-900/40 p-1.5 rounded-lg border border-white/5 flex flex-col gap-1">
                                <p className="text-[7.5px] uppercase font-black tracking-widest text-indigo-400 mb-0.5">Helpful Resource</p>
                                <a 
                                  href={task.helpfulLinks}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-indigo-300 hover:underline flex items-center gap-1 select-none"
                                >
                                  <LinkIcon size={8} className="shrink-0" />
                                  Open Link
                                  <ArrowUpRight size={7} />
                                </a>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expanded Subtasks */}
                      <AnimatePresence>
                        {expandedSubtaskTaskId[task.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden mt-2 border-t border-white/[0.04] pt-2 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderSubtaskDropdown(task)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrolling Grab Bar Slider */}
        <div className="mt-3 px-4 py-2.5 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col gap-1.5 select-none w-full">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <Layers size={10} className="text-indigo-400" /> Timeline Position
            </span>
            <span ref={sliderPercentRef} className="text-[9px] font-bold font-mono text-indigo-300">
              0%
            </span>
          </div>
          
          <div 
            ref={sliderTrackRef}
            onMouseDown={handleSliderDown}
            onTouchStart={handleSliderDown}
            className="h-3 bg-slate-950 border border-white/10 rounded-full relative cursor-pointer group flex items-center px-1 shadow-inner"
          >
            <div className="absolute inset-x-1 h-1 bg-slate-900 rounded-full" />
            <div 
              ref={sliderThumbRef}
              className={`absolute h-2.5 rounded-full transition-shadow duration-150 flex items-center justify-center ${
                isDraggingSlider 
                  ? "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] cursor-grabbing scale-y-[1.1]" 
                  : "bg-slate-700 hover:bg-slate-600 cursor-grab"
              }`}
              style={{ 
                left: "0%",
                width: "10%" 
              }}
            >
              <div className="flex gap-0.5 pointer-events-none">
                <div className="w-0.5 h-1.5 bg-white/30 rounded-full" />
                <div className="w-0.5 h-1.5 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});
