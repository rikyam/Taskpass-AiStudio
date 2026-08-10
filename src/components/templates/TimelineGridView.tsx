import React from "react";
import { useAppStore } from "../../store";
import { Task } from "../../types";
import { 
  Check, Play, Pause, MapPin, ArrowUpRight, Lock, Unlock, Unlink,
  AlertTriangle, Link as LinkIcon, Trash2, Car, CheckCircle2, 
  AlertCircle, Flag, ChevronUp, ChevronDown, Archive, Trash, 
  ListTodo, CalendarRange, Calendar, ZoomIn, ZoomOut, Clock, Timer, X, Plus, Minus
} from "lucide-react";
import { motion } from "motion/react";
import { 
  formatTime, 
  timeToMinutes, 
  minutesToTimeString, 
  parseDurationToMinutes, 
  formatDuration 
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
  const timelineDragOffset = useAppStore((state) => state.timelineDragOffset);
  const timelineDragWidth = useAppStore((state) => state.timelineDragWidth);
  const timelineDragLeft = useAppStore((state) => state.timelineDragLeft);
  const tasks = useAppStore((state) => state.tasks);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const deckTab = useAppStore((state) => state.deckTab);
  const fontSizeScale = useAppStore((state) => state.fontSizeScale);
  const dayPlannerFont = useAppStore((state) => state.dayPlannerFont);

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
    <div className="relative w-full group/vertical-stage">
      {/* Semi-transparent Floating Navigation Arrows overlaying the container */}
      <button
        onClick={() => scrollVertical("up")}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:scale-115 active:scale-95 transition-all shadow-lg pointer-events-auto opacity-40 sm:opacity-0 sm:group-hover/vertical-stage:opacity-100 hover:opacity-100 flex items-center justify-center cursor-pointer"
        title="Scroll Up"
      >
        <ChevronUp size={20} strokeWidth={3} />
      </button>

      <button
        onClick={() => scrollVertical("down")}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[60] p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:scale-115 active:scale-95 transition-all shadow-lg pointer-events-auto opacity-40 sm:opacity-0 sm:group-hover/vertical-stage:opacity-100 hover:opacity-100 flex items-center justify-center cursor-pointer"
        title="Scroll Down"
      >
        <ChevronDown size={20} strokeWidth={3} />
      </button>

      {/* Floating Zoom Controls directly on the vertical grid for maximum accessibility */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-2 pointer-events-auto opacity-40 sm:opacity-0 sm:group-hover/vertical-stage:opacity-100 hover:opacity-100 transition-all duration-200">
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
          className="p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
          title="Zoom In (Expand Height)"
        >
          <ZoomIn size={14} strokeWidth={3} />
        </button>
        <div className="bg-slate-950/60 backdrop-blur-md border border-white/10 text-indigo-400 rounded-lg text-[8px] font-mono font-bold py-1 px-1 text-center select-none shadow">
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
          className="p-2.5 rounded-full bg-slate-950/40 hover:bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
          title="Zoom Out (Compact Height)"
        >
          <ZoomOut size={14} strokeWidth={3} />
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
          borderColor: timelineBorderColor
        }}
        className={`border rounded-[32px] overflow-x-hidden flex bg-slate-900/35 backdrop-blur shadow-2xl relative h-[580px] select-none timeline-scrollbar pt-12 pb-48 ${
          timelineDragId || isPinchActive || isDropSettling ? "touch-none" : "touch-pan-y"
        }`}
      >
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
          if (h >= 12 && h < 24) {
            displayAmpm = "PM";
          } else if (h >= 24) {
            const nextDayHour = h % 24;
            displayAmpm = (nextDayHour >= 12) ? "PM" : "AM";
            displayHourVal = nextDayHour;
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
        {ghostTask && (
          <div
            style={{
              position: "absolute",
              top: (ghostTask.mins / 60) * HOUR_HEIGHT,
              height: Math.max((ghostTask.durationMins / 60) * HOUR_HEIGHT, 65),
              left: "64px",
              right: "16px",
              zIndex: 15,
            }}
            className="border-2 border-dashed border-indigo-400 bg-indigo-500/10 rounded-2xl flex items-center justify-center p-3 animate-pulse pointer-events-none"
          >
            <div className="text-center font-bold text-indigo-400 text-xs flex flex-col items-center gap-1 bg-slate-950/95 py-1.5 px-3 rounded-xl border border-indigo-500/25">
              <span className="text-[8px] uppercase font-black tracking-widest text-indigo-305">
                New Task Slot
              </span>
              <span className="font-mono text-xs uppercase text-white font-black">
                {formatTime(ghostTask.time)} ({ghostTask.durationMins}m)
              </span>
            </div>
          </div>
        )}

        {/* Render ghost hover preview matching the 5 minute snapping outline */}
        {(() => {
          if (!timelineDragId) return null;
          const draggedTask = scheduledDailyTasks.find(t => t.id === timelineDragId);
          if (!draggedTask) return null;

          const duration = parseDurationToMinutes(draggedTask.duration);
          const containerRect = timelineContainerRef.current?.getBoundingClientRect();
          const scrollY = timelineContainerRef.current?.scrollTop || 0;
          
          const relativeY = (timelineDragY - timelineDragOffset) - (containerRect?.top || 0) + scrollY;
          const minutes = (relativeY / HOUR_HEIGHT) * 60;
          const maxMinutesLimit = timelineHours * 60 - 5;
          const snappedMinutes = Math.max(0, Math.min(maxMinutesLimit, Math.round(minutes / timelineIncrement) * timelineIncrement));
          const dynamicTimeStr = formatTime(minutesToTimeString(snappedMinutes));
          const endMinutes = snappedMinutes + duration;
          const dynamicEndTimeStr = formatTime(minutesToTimeString(endMinutes));
          const fullTimeRangeStr = `${dynamicTimeStr} – ${dynamicEndTimeStr}`;

          const tempTop = (snappedMinutes / 60) * HOUR_HEIGHT;
          const tempHeight = Math.max((duration / 60) * HOUR_HEIGHT, 65);

          return (
            <motion.div
              animate={{ top: tempTop, height: tempHeight }}
              transition={{
                type: "spring",
                stiffness: 115,
                damping: 20,
                mass: 0.9
              }}
              style={{
                position: "absolute",
                left: "64px",
                right: "16px",
                zIndex: 15,
              }}
              className="border-2 border-dashed border-indigo-500/55 bg-indigo-500/10 rounded-2xl flex items-center justify-center p-3 animate-pulse pointer-events-none shadow-[0_0_20px_rgba(99,102,241,0.2)]"
            >
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 rounded-full shadow-[0_0_14px_rgba(99,102,241,0.95)]" />
              <div className="text-center font-bold text-indigo-400 text-xs flex flex-col items-center gap-1 bg-slate-900/95 py-1.5 px-3.5 rounded-xl border border-indigo-500/25 shadow-lg">
                <span className="text-[8px] uppercase font-black tracking-widest text-indigo-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  Placement Target
                </span>
                <span className="font-mono text-xs uppercase text-white font-black whitespace-nowrap">
                  {fullTimeRangeStr}
                </span>
                <span className="text-[8.5px] font-mono text-indigo-300 font-bold">
                  ({formatDuration(draggedTask.duration)})
                </span>
              </div>
            </motion.div>
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

          const allDisplayTasks = filteredScheduledDailyTasks;

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
                : 65
            ); // ensure content bounds fit nicely

            const isDraggingThis = timelineDragId === task.id;

            const beforeVal = task.travelBefore || 0;
            const afterVal = task.travelAfter || 0;

            const beforeTop = ((startMins - beforeVal) / 60) * HOUR_HEIGHT;
            const beforeHeight = (beforeVal / 60) * HOUR_HEIGHT;

            const afterTop = ((startMins + duration) / 60) * HOUR_HEIGHT;
            const afterHeight = (afterVal / 60) * HOUR_HEIGHT;

            const cardPaddingClass = cardDensity === "very_simplified" 
              ? "p-1 px-1.5" 
              : cardDensity === "simplified" 
                ? "p-1.5 px-2.5" 
                : "p-2.5";
            const cardRadiusClass = cardDensity === "very_simplified" ? "rounded-xl" : cardDensity === "simplified" ? "rounded-xl" : "rounded-2xl";

            return (
              <React.Fragment key={task.id}>
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
                      left: "64px",
                      right: "16px",
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

                        <select
                          value={task.beforeBufferPurpose || "Preparation"}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (onUpdateBufferPurpose) {
                              onUpdateBufferPurpose(task.id, "before", e.target.value);
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
                    left: "64px",
                    right: "16px",
                    opacity: isDraggingThis ? 0.22 : task.completed ? 0.5 : 1,
                    filter: task.completed ? "brightness(0.5)" : "none",
                    zIndex: isDraggingThis ? 5 : 20,
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
                    // Do not stop propagation of touch events to allow the browser 
                    // to natively scroll/pan the viewport when swipes occur!
                    const rect = e.currentTarget.getBoundingClientRect();
                    startTimelineDrag(e, task, rect);
                  }}
                  className={`timeline-card ${cardRadiusClass} cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between select-none relative ${
                    highlightedCalendarTaskId === task.id
                      ? `${cardPaddingClass} border-amber-500/80 bg-amber-500/25 ring-4 ring-amber-500/20 border-b-[4.5px] border-b-amber-705/100 shadow-[0_20px_40px_-8px_rgba(245,158,11,0.4),0_6px_18px_-4px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.25)] animate-pulse overflow-visible`
                      : isDisplaced
                        ? `${cardPaddingClass} ring-2 ring-indigo-400 border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.45)] overflow-visible`
                        : task.groupId && !task.isUnlinked
                          ? isDayPlannerActive
                            ? `${cardPaddingClass} group-card-dark-glow bg-white text-slate-800 border border-slate-200 shadow-sm overflow-visible`
                            : `${cardPaddingClass} group-card-dark-glow text-white overflow-visible`
                          : isAppt 
                            ? "border-none bg-transparent shadow-none overflow-visible p-0" 
                            : isDayPlannerActive
                              ? `${cardPaddingClass} bg-white text-slate-800 border border-slate-200 shadow-sm overflow-visible`
                              : `${cardPaddingClass} ${getTaskCardClassString(task.isLocked, task.priority || "none", task.completed, true, task.isInProgress, !!task.isOpenPlaceholder)} overflow-visible`
                  } ${
                    isAcceptedPassedTask(task) ? "golden-radiating-glow text-amber-105" : ""
                  } ${
                    dragToasts.find(toast => toast.taskId === task.id)?.type === 'success'
                      ? "ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.01]"
                      : dragToasts.find(toast => toast.taskId === task.id)?.type === 'warning' || dragToasts.find(toast => toast.taskId === task.id)?.type === 'info'
                        ? "ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        : ""
                  }`}
                >
                  {/* 3D Glass Light Glare Highlight */}
                  <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-white/[0.06] to-transparent rounded-t-2xl pointer-events-none z-0" />
                  
                  {/* Live Cascade Displacement Indicator Badge */}
                  {isDisplaced && (
                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-indigo-600 text-white border border-indigo-300/40 shadow-lg z-30 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-ping" />
                      <span>Shifted to {displacedTimeStr}</span>
                    </div>
                  )}
                  {dragToasts.find(toast => toast.taskId === task.id) && (() => {
                    const matchingToast = dragToasts.find(toast => toast.taskId === task.id)!;
                    return (
                      <div className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md z-[60] animate-bounce ${
                        matchingToast.type === 'success' 
                          ? "bg-emerald-500 text-white border border-emerald-400/20" 
                          : "bg-amber-500 text-white border border-amber-400/20"
                      }`}>
                        {matchingToast.type === 'success' ? <CheckCircle2 size={8} /> : <AlertCircle size={8} />}
                        <span>{matchingToast.type === 'success' ? "Time Saved" : "No Change"}</span>
                      </div>
                    );
                  })()}
                  {overlappingTaskIds.has(task.id) && (
                    <div className={`absolute inset-0 ${cardRadiusClass} border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.45)] animate-pulse pointer-events-none z-40`} />
                  )}
                  {task.groupId && !task.isUnlinked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        openGroupDurationModal(task.groupId!, task.groupName);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="absolute top-1.5 right-1.5 z-[55] px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 bg-indigo-500/25 hover:bg-indigo-500 text-indigo-200 hover:text-white border border-indigo-400/40 hover:border-indigo-300 shadow-sm transition-all cursor-pointer group/dur-badge"
                      title="Quick edit sequence duration"
                    >
                      <Clock size={9} className="shrink-0 text-indigo-300 group-hover/dur-badge:text-white" />
                      <span>{task.duration || "15m"}</span>
                    </button>
                  )}
                  {focusCardDetailMode === "simple" ? (
                    <div className="relative z-10 w-full h-full flex items-center justify-between gap-2 px-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {/* Completed Toggle */}
                        <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="shrink-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                            className={`w-5 h-5 rounded-lg border border-white/10 hover:border-emerald-500/70 hover:bg-emerald-500 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              task.completed ? "bg-emerald-500 border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "bg-slate-900/30"
                            }`}
                            title="Mark completed"
                          >
                            {task.completed ? (
                              <Check size={10} strokeWidth={3.5} className="text-white" />
                            ) : (
                              <Check size={10} strokeWidth={3} className="text-white opacity-0 hover:opacity-100" />
                            )}
                          </button>
                        </div>

                        {/* Task Title */}
                        <span 
                          data-task-title="true" 
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerEditForm(task);
                          }}
                          className={`text-[11px] font-black tracking-tight hover:text-indigo-400 transition-colors truncate text-left cursor-pointer ${task.completed ? "line-through opacity-45 text-slate-400" : "text-white"}`}
                          title={task.title}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* Actions (Play/Pause, Priority, Lock, Backlog, Delete) */}
                      <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                        {/* Play/Pause Button */}
                        {!task.completed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPress(task);
                            }}
                            className={`w-[26px] h-[26px] rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              task.isInProgress
                                ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
                                : "bg-slate-900/30 border-white/10 text-emerald-400 hover:text-white hover:bg-emerald-600/30"
                            }`}
                            title={task.isInProgress ? "Pause" : "Start"}
                          >
                            {task.isInProgress ? <Pause size={10} className="shrink-0" /> : <Play size={10} className="fill-current text-emerald-400 hover:text-white" />}
                          </button>
                        )}

                        {/* Status Flag */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrioritySelectTask(task);
                          }}
                          className={`w-[26px] h-[26px] rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm occasional-orange-glow ${
                            task.priority === "high"
                              ? "bg-orange-500/15 border-orange-400/50 hover:bg-orange-500/25 text-orange-400"
                              : task.priority === "medium"
                                ? "bg-amber-500/15 border-amber-400/50 hover:bg-amber-500/25 text-amber-400"
                                : task.priority === "low"
                                  ? "bg-sky-505/15 border-sky-400/50 hover:bg-sky-505/25 text-sky-450"
                                  : "bg-slate-900/30 border-white/10 text-slate-500 hover:text-white"
                          }`}
                          title={`Priority: ${task.priority || "none"} (Click to change)`}
                        >
                          {task.priority === "high" ? (
                            <Flag size={11} className="text-orange-405 fill-orange-400/30" />
                          ) : task.priority === "medium" ? (
                            <Flag size={11} className="text-amber-400 fill-amber-400/30" />
                          ) : task.priority === "low" ? (
                            <Flag size={11} className="text-sky-455 fill-sky-400/30" />
                          ) : (
                            <Flag size={11} className="text-slate-500" />
                          )}
                        </button>

                        {/* Lock/Unlock Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestToggleLock(task);
                          }}
                          className="w-[26px] h-[26px] rounded-lg border border-white/10 bg-slate-900/30 text-slate-350 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                          title={task.isLocked ? "Unlock Task" : "Lock Task"}
                        >
                          {task.isLocked ? <Lock size={11} strokeWidth={2.5} /> : <Unlock size={11} strokeWidth={2.5} />}
                        </button>

                        {/* Send to Backlog */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToBacklog(task);
                          }}
                          className="w-[26px] h-[26px] rounded-lg border border-white/10 bg-slate-900/30 text-amber-400 hover:text-white hover:bg-amber-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                          title="Send to Backlog"
                        >
                          <Archive size={11}/>
                        </button>

                        {/* Send to Tomorrow */}
                        {handleMoveToNextDay && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToNextDay(task);
                            }}
                            className="w-[26px] h-[26px] rounded-lg border border-white/10 bg-slate-900/30 text-sky-400 hover:text-white hover:bg-sky-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                            title="Send to Tomorrow"
                          >
                            <Calendar size={11}/>
                          </button>
                        )}

                        {/* Delete button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteTask(task);
                          }}
                          className="w-[26px] h-[26px] rounded-lg border border-white/10 bg-slate-900/30 text-rose-450 hover:text-white hover:bg-rose-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                          title="Delete Task"
                        >
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  ) : isAppt ? (
                    <>
                      {/* Premium 3D Glassmorphism background */}
                      <div className={`absolute inset-0 ${cardRadiusClass} pointer-events-none z-0 hover:brightness-105 transition-all ${
                        task.isOpenPlaceholder
                          ? isDark
                            ? "open-placeholder-gold-glow"
                            : "open-placeholder-gold-glow-light"
                          : lockedNoColor 
                            ? (isDark ? "bg-slate-900 border border-white/10" : "bg-slate-50 border border-slate-200 shadow-sm") 
                            : "appt-locked-card-glow text-white"
                      }`} />

                      <div className={`relative z-10 w-full h-full flex flex-col justify-between ${cardPaddingClass}`}>
                      {cardDensity === "very_simplified" ? (
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center py-0.5" onClick={(e) => e.stopPropagation()}>
                          {/* SINGLE ROW FOR "VERY SIMPLIFIED" */}
                          <div className="flex items-center justify-between gap-2 w-full flex-wrap gap-y-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Completed Button (Checkbox) */}
                              <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                    task.completed ? "bg-emerald-500 border-emerald-500 shadow-[0_3px_8px_rgba(16,185,129,0.3)]" : "bg-slate-900/30 border-white/10 hover:border-emerald-500/30"
                                  }`}
                                  title="Done"
                                >
                                  {task.completed ? (
                                    <Check size={8} strokeWidth={3.5} className="text-white" />
                                  ) : (
                                    <Check size={8} strokeWidth={3} className="text-white opacity-0 hover:opacity-100" />
                                  )}
                                </button>
                              </div>

                              {/* Task title */}
                              <span 
                                data-task-title="true" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerEditForm(task);
                                }}
                                className={`text-[13px] font-black tracking-tight flex-1 hover:text-indigo-400 transition-colors truncate text-left ${task.completed ? "line-through opacity-45" : "text-white"}`}
                                title={task.title}
                              >
                                {task.title}
                              </span>

                              {/* Subtask expander */}
                              <div className="relative shrink-0 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSubtaskTaskId(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                  }}
                                  className={`p-1 hover:bg-white/10 rounded transition-colors shrink-0 text-slate-400 hover:text-white ${expandedSubtaskTaskId[task.id] ? "text-white" : ""}`}
                                  title="Toggle Subtasks"
                                >
                                  <ListTodo size={11} />
                                </button>
                                {renderSubtaskDropdown(task)}
                              </div>
                            </div>

                            {/* Right actions on the same row: Focus -> Lock/Unlock -> Delete -> Start Time */}
                            <div className="flex items-center gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                              {/* Play/Focus Button */}
                              {!task.completed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPress(task);
                                  }}
                                  className={`p-1 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                    task.isInProgress
                                      ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
                                      : "bg-slate-900/30 border-white/10 text-emerald-400 hover:text-white hover:bg-emerald-600/30"
                                  }`}
                                  title={task.isInProgress ? "Pause" : "Start"}
                                >
                                  {task.isInProgress ? <Pause size={10} className="shrink-0" /> : <Play size={10} className="fill-current text-emerald-400 hover:text-white" />}
                                </button>
                              )}

                              {/* Lock/Unlock Toggle */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestToggleLock(task);
                                }}
                                className="w-[29px] h-[29px] rounded-xl border border-white/10 bg-slate-900/30 text-slate-350 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                title={task.isLocked ? "Unlock Task (Make Flexible)" : "Lock Task (Appointment)"}
                              >
                                {task.isLocked ? <Lock size={13.5} strokeWidth={2.5} /> : <Unlock size={13.5} strokeWidth={2.5} />}
                              </button>

                              {/* Collapsible Menu Trigger */}
                              {isTimelineBasicMagnified && !task.completed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedStandardFields(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                  }}
                                  className={`w-[29px] h-[29px] rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
                                    expandedStandardFields[task.id]
                                      ? "bg-indigo-600/30 border-indigo-505 text-indigo-400"
                                      : "bg-slate-900/30 border-white/10 text-slate-400 hover:text-white hover:bg-indigo-500/20"
                                  }`}
                                  title={expandedStandardFields[task.id] ? "Close options menu" : "Open options menu"}
                                >
                                  {expandedStandardFields[task.id] ? (
                                    <ChevronUp size={11} strokeWidth={2.5} />
                                  ) : (
                                    <ChevronDown size={11} strokeWidth={2.5} />
                                  )}
                                </button>
                              )}

                              {/* Send to Backlog (Only on top-level when NOT magnified/collapsed) */}
                              {!isTimelineBasicMagnified && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToBacklog(task);
                                  }}
                                  className="w-[29px] h-[29px] rounded-xl border border-white/10 bg-slate-900/30 text-amber-400 hover:text-white hover:bg-amber-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                  title="Send to Backlog"
                                >
                                  <Archive size={13.5}/>
                                </button>
                              )}

                              {/* Send to Tomorrow (Only on top-level when NOT magnified/collapsed) */}
                              {!isTimelineBasicMagnified && handleMoveToNextDay && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToNextDay(task);
                                  }}
                                  className="w-[29px] h-[29px] rounded-xl border border-white/10 bg-slate-900/30 text-sky-400 hover:text-white hover:bg-sky-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                  title="Send to Tomorrow"
                                >
                                  <Calendar size={13.5}/>
                                </button>
                              )}

                              {/* Delete button (Only on top-level when NOT magnified/collapsed) */}
                              {!isTimelineBasicMagnified && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestDeleteTask(task);
                                  }}
                                  className="w-[29px] h-[29px] rounded-xl border border-white/10 bg-slate-900/30 text-rose-450 hover:text-white hover:bg-rose-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                  title="Delete Task"
                                >
                                  <Trash2 size={13.5}/>
                                </button>
                              )}

                              {/* Start time */}
                              <span className="text-[9.5px] font-bold text-slate-350 shrink-0 select-none">
                                {formatTime(task.computedTime || task.time)}
                              </span>
                            </div>
                          </div>

                          {/* COLLAPSIBLE PRIORITY MENU CONTENT */}
                          {isTimelineBasicMagnified && expandedStandardFields[task.id] && (
                            <div 
                              className="mt-1.5 border-t border-white/5 pt-1.5 flex flex-col gap-1.5 w-full animate-fadeIn"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between gap-2 w-full">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">Priority:</span>
                                  {!task.completed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPrioritySelectTask(task);
                                      }}
                                      className={`px-2 py-0.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer text-[8px] font-bold ${
                                        task.priority === "high"
                                          ? "bg-orange-500/15 border-orange-400/50 text-orange-400"
                                          : task.priority === "medium"
                                            ? "bg-amber-500/15 border-amber-400/50 text-amber-400"
                                            : task.priority === "low"
                                              ? "bg-sky-505/15 border-sky-400/50 text-sky-455"
                                              : "bg-slate-900/30 border-white/10 text-slate-400 hover:text-white"
                                      }`}
                                      title={`Priority: ${task.priority || "none"} (Click to change)`}
                                    >
                                      {task.priority === "high" ? (
                                        <Flag size={9} className="text-orange-405 fill-orange-400/30" />
                                      ) : task.priority === "medium" ? (
                                        <Flag size={9} className="text-amber-400 fill-amber-400/30" />
                                      ) : task.priority === "low" ? (
                                        <Flag size={9} className="text-sky-455 fill-sky-400/30" />
                                      ) : (
                                        <Flag size={9} className="text-slate-500" />
                                      )}
                                      <span className="capitalize">{task.priority || "none"}</span>
                                    </button>
                                  )}
                                </div>

                                {/* Secondary Actions inside collapsible menu */}
                                <div className="flex items-center gap-1.5">
                                  {/* Send to Backlog */}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveToBacklog(task);
                                    }}
                                    className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg flex items-center gap-1 font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                                    title="Send to Backlog"
                                  >
                                    <Archive size={9}/>
                                    <span>Backlog</span>
                                  </button>

                                  {/* Send to Tomorrow */}
                                  {handleMoveToNextDay && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveToNextDay(task);
                                      }}
                                      className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-lg flex items-center gap-1 font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                                      title="Send to Tomorrow"
                                    >
                                      <Calendar size={9}/>
                                      <span>Tomorrow</span>
                                    </button>
                                  )}

                                  {/* Delete button */}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestDeleteTask(task);
                                    }}
                                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg flex items-center gap-1 font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                                    title="Delete Task"
                                  >
                                    <Trash2 size={9}/>
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>

                              {/* Hyperlinks or Helpful Links */}
                              {(task.helpfulLinks || task.hyperlink) && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">References:</span>
                                  {task.hyperlink && (
                                    <a 
                                      href={task.hyperlink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[8px] font-bold text-sky-400 hover:underline flex items-center gap-0.5"
                                    >
                                      <span>Link</span>
                                      <ArrowUpRight size={8} />
                                    </a>
                                  )}
                                  {task.helpfulLinks && (
                                    <span className="text-[8.5px] text-slate-300 italic truncate max-w-[200px]">
                                      {task.helpfulLinks}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Standard density layout */}
                          <div className="flex items-start justify-between gap-2.5 w-full">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              {/* Completed Button */}
                              <div className="pt-0.5" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                                  className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                    task.completed ? "bg-emerald-500 border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "bg-slate-900/30 border-white/10 hover:border-emerald-500/30"
                                  }`}
                                  title="Mark complete"
                                >
                                  {task.completed ? (
                                    <Check size={10} strokeWidth={3.5} className="text-white" />
                                  ) : (
                                    <Check size={10} strokeWidth={3} className="text-white opacity-0 hover:opacity-100" />
                                  )}
                                </button>
                              </div>

                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                  {/* Task Title */}
                                  <span 
                                    data-task-title="true" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerEditForm(task);
                                    }}
                                    className={`text-[13.5px] font-black tracking-tight hover:text-indigo-405 transition-colors cursor-pointer truncate ${task.completed ? "line-through opacity-45 text-slate-400" : "text-white"}`}
                                    title={task.title}
                                  >
                                    {task.title}
                                  </span>

                                  {/* Subtask expander */}
                                  <div className="relative shrink-0 flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedSubtaskTaskId(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                      }}
                                      className={`p-1 hover:bg-white/10 rounded transition-colors shrink-0 text-slate-400 hover:text-white ${expandedSubtaskTaskId[task.id] ? "text-white" : ""}`}
                                      title="Toggle Subtasks"
                                    >
                                      <ListTodo size={11} />
                                    </button>
                                    {renderSubtaskDropdown(task)}
                                  </div>
                                </div>

                                {/* Start time and optional travel duration info */}
                                <div className="flex items-center gap-2 mt-0.5 text-[9.5px] font-bold text-slate-400">
                                  <span className="font-mono text-slate-350">{formatTime(task.computedTime || task.time)}</span>
                                  <span>•</span>
                                  <span className="font-sans uppercase text-[8.5px] tracking-widest text-slate-500">{formatDuration(task.duration)}</span>
                                  {task.travelBefore && task.travelBefore > 0 ? (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-400 font-mono text-[8px] flex items-center gap-0.5" title="Travel buffer before this task">
                                        <Car size={8} />
                                        <span>-{task.travelBefore}m Buffer</span>
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Actions on top row */}
                            <div className="flex items-center gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                              {/* Play / Pause button */}
                              {!task.completed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPress(task);
                                  }}
                                  className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
                                    task.isInProgress
                                      ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
                                      : "bg-slate-900/30 border-white/10 text-emerald-450 hover:text-white hover:bg-emerald-600/30"
                                  }`}
                                  title={task.isInProgress ? "Pause" : "Start"}
                                >
                                  {task.isInProgress ? <Pause size={12} className="shrink-0" /> : <Play size={12} className="fill-current text-emerald-400 hover:text-white" />}
                                </button>
                              )}

                              {/* Flag (Priority) Selector Trigger */}
                              {!task.completed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrioritySelectTask(task);
                                  }}
                                  className={`w-[29px] h-[29px] rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm occasional-orange-glow ${
                                    task.priority === "high"
                                      ? "bg-orange-500/15 border-orange-400/50 text-orange-400"
                                      : task.priority === "medium"
                                        ? "bg-amber-500/15 border-amber-400/50 text-amber-400"
                                        : task.priority === "low"
                                          ? "bg-sky-505/15 border-sky-400/50 text-sky-455"
                                          : "bg-slate-900/30 border-white/10 text-slate-500 hover:text-white"
                                  }`}
                                  title={`Priority: ${task.priority || "none"} (Click to change)`}
                                >
                                  {task.priority === "high" ? (
                                    <Flag size={13.5} className="text-orange-405 fill-orange-400/30" />
                                  ) : task.priority === "medium" ? (
                                    <Flag size={13.5} className="text-amber-400 fill-amber-400/30" />
                                  ) : task.priority === "low" ? (
                                    <Flag size={13.5} className="text-sky-455 fill-sky-400/30" />
                                  ) : (
                                    <Flag size={13.5} className="text-slate-500" />
                                  )}
                                </button>
                              )}

                              {/* Lock / Unlock button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestToggleLock(task);
                                }}
                                className="w-[29px] h-[29px] rounded-xl border border-white/10 bg-slate-900/30 text-slate-350 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                title={task.isLocked ? "Unlock Task (Make Flexible)" : "Lock Task (Appointment)"}
                              >
                                {task.isLocked ? <Lock size={13.5} strokeWidth={2.5} /> : <Unlock size={13.5} strokeWidth={2.5} />}
                              </button>
                            </div>
                          </div>

                          {/* Secondary Bottom Row with Links, Backlog, Delete buttons */}
                          <div className="flex items-center justify-between gap-4 w-full mt-2 border-t border-white/5 pt-2" onClick={(e) => e.stopPropagation()}>
                            {/* Location */}
                            {task.location && task.location.toString().trim() !== "0" ? (
                              <a 
                                href={getGoogleMapsDirectionsUrl(task.location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-slate-400 hover:text-rose-450 flex items-center gap-1 transition-colors truncate max-w-[170px]"
                                title="Open Google Maps Directions"
                              >
                                <MapPin size={11} className="text-rose-400 shrink-0" />
                                <span className="truncate">{task.location}</span>
                                <ArrowUpRight size={10} className="text-slate-500 shrink-0" />
                              </a>
                            ) : (
                              <div />
                            )}

                            {/* Backlog, Delete button actions */}
                            <div className="flex items-center gap-2 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                              {/* Move to Backlog button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveToBacklog(task);
                                }}
                                className="px-2.5 h-[27px] rounded-lg border border-white/10 bg-slate-900/30 text-[9px] font-black uppercase tracking-wider text-amber-400 hover:text-white hover:bg-amber-600/35 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Move to Backlog"
                              >
                                <Archive size={11}/>
                                <span>Backlog</span>
                              </button>

                              {/* Move to Tomorrow button */}
                              {handleMoveToNextDay && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToNextDay(task);
                                  }}
                                  className="px-2.5 h-[27px] rounded-lg border border-white/10 bg-slate-900/30 text-[9px] font-black uppercase tracking-wider text-sky-400 hover:text-white hover:bg-sky-600/35 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Move to Tomorrow"
                                >
                                  <Calendar size={11}/>
                                  <span>Tomorrow</span>
                                </button>
                              )}

                              {/* Delete button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeleteTask(task);
                                }}
                                className="px-2.5 h-[27px] rounded-lg border border-white/10 bg-slate-900/30 text-[9px] font-black uppercase tracking-wider text-rose-450 hover:text-white hover:bg-rose-600/35 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Delete Task"
                              >
                                <Trash2 size={11}/>
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      </div>
                    </>
                  ) : (
                    <div className={`relative z-10 w-full h-full flex flex-col justify-between ${cardPaddingClass}`}>
                      {/* DEFAULT CARD CONTENT */}
                      {cardDensity === "very_simplified" ? (
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {/* Completed Checkbox */}
                            <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                  task.completed ? "bg-emerald-500 border-emerald-500 shadow-[0_3px_8px_rgba(16,185,129,0.3)]" : "bg-slate-900/30 border-white/10 hover:border-emerald-500/30"
                                }`}
                                title="Done"
                              >
                                {task.completed ? (
                                  <Check size={8} strokeWidth={3.5} className="text-white" />
                                ) : (
                                  <Check size={8} strokeWidth={3} className="text-white opacity-0 hover:opacity-100" />
                                )}
                              </button>
                            </div>

                            {/* Task title */}
                            <span 
                              data-task-title="true" 
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerEditForm(task);
                              }}
                              className={`text-[13px] font-black tracking-tight flex-1 hover:text-indigo-400 transition-colors truncate text-left ${task.completed ? "line-through opacity-45" : "text-slate-100"}`}
                              title={task.title}
                            >
                              {task.title}
                            </span>

                            {/* Subtask expander */}
                            <div className="relative shrink-0 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedSubtaskTaskId(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                }}
                                className={`p-1 hover:bg-white/10 rounded transition-colors shrink-0 text-slate-400 hover:text-white ${expandedSubtaskTaskId[task.id] ? "text-white" : ""}`}
                                title="Toggle Subtasks"
                              >
                                <ListTodo size={11} />
                              </button>
                              {renderSubtaskDropdown(task)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                            {/* Play button */}
                            {!task.completed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayPress(task);
                                }}
                                className={`p-1 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                  task.isInProgress
                                    ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
                                    : "bg-slate-900/30 border-white/10 text-emerald-455 hover:text-white hover:bg-emerald-600/30"
                                }`}
                                title={task.isInProgress ? "Pause" : "Start"}
                              >
                                {task.isInProgress ? <Pause size={10} className="shrink-0" /> : <Play size={10} className="fill-current text-emerald-400 hover:text-white" />}
                              </button>
                            )}

                            {/* Lock Toggle */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestToggleLock(task);
                              }}
                              className="w-[29px] h-[29px] rounded-xl border border-white/10 bg-slate-900/30 text-slate-350 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                              title={task.isLocked ? "Unlock Task (Make Flexible)" : "Lock Task (Appointment)"}
                            >
                              {task.isLocked ? <Lock size={13.5} strokeWidth={2.5} /> : <Unlock size={13.5} strokeWidth={2.5} />}
                            </button>

                            {/* Collapsible Menu Trigger */}
                            {isTimelineBasicMagnified && !task.completed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedStandardFields(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                }}
                                className={`w-[29px] h-[29px] rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
                                  expandedStandardFields[task.id]
                                    ? "bg-indigo-600/30 border-indigo-505 text-indigo-400"
                                    : "bg-slate-900/30 border-white/10 text-slate-400 hover:text-white hover:bg-indigo-500/20"
                                }`}
                                title={expandedStandardFields[task.id] ? "Close options menu" : "Open options menu"}
                              >
                                {expandedStandardFields[task.id] ? (
                                  <ChevronUp size={11} strokeWidth={2.5} />
                                ) : (
                                  <ChevronDown size={11} strokeWidth={2.5} />
                                )}
                              </button>
                            )}

                            {/* Start time */}
                            <span className="text-[9.5px] font-bold text-slate-400 shrink-0 select-none font-mono">
                              {formatTime(task.computedTime || task.time)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Standard/Simplified card view content */}
                          <div className="flex items-start justify-between gap-2.5 w-full">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              {/* Completed Checkbox */}
                              <div className="pt-0.5" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                                  className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                    task.completed ? "bg-emerald-500 border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "bg-slate-900/30 border-white/10 hover:border-emerald-500/30"
                                  }`}
                                  title="Mark complete"
                                >
                                  {task.completed ? (
                                    <Check size={10} strokeWidth={3.5} className="text-white" />
                                  ) : (
                                    <Check size={10} strokeWidth={3} className="text-white opacity-0 hover:opacity-100" />
                                  )}
                                </button>
                              </div>

                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                  {/* Title */}
                                  <span 
                                    data-task-title="true" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerEditForm(task);
                                    }}
                                    className={`text-[13.5px] font-black tracking-tight hover:text-indigo-405 transition-colors cursor-pointer truncate ${task.completed ? "line-through opacity-45 text-slate-400" : "text-slate-100"}`}
                                    title={task.title}
                                  >
                                    {task.title}
                                  </span>

                                  {/* Subtask expander */}
                                  <div className="relative shrink-0 flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedSubtaskTaskId(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                      }}
                                      className={`p-1 hover:bg-white/10 rounded transition-colors shrink-0 text-slate-400 hover:text-white ${expandedSubtaskTaskId[task.id] ? "text-white" : ""}`}
                                      title="Toggle Subtasks"
                                    >
                                      <ListTodo size={11} />
                                    </button>
                                    {renderSubtaskDropdown(task)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mt-0.5 text-[9.5px] font-bold text-slate-400">
                                  <span className="font-mono text-slate-350">{formatTime(task.computedTime || task.time)}</span>
                                  <span>•</span>
                                  <span className="font-sans uppercase text-[8.5px] tracking-widest text-slate-500">{formatDuration(task.duration)}</span>
                                  {task.travelBefore && task.travelBefore > 0 ? (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-400 font-mono text-[8px] flex items-center gap-0.5" title="Travel buffer before this task">
                                        <Car size={8} />
                                        <span>-{task.travelBefore}m Buffer</span>
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Right side controls */}
                            <div className="flex items-center gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                              {/* Focus button */}
                              {!task.completed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPress(task);
                                  }}
                                  className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
                                    task.isInProgress
                                      ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
                                      : "bg-slate-900/30 border-white/10 text-emerald-450 hover:text-white hover:bg-emerald-600/30"
                                  }`}
                                  title={task.isInProgress ? "Pause" : "Start"}
                                >
                                  {task.isInProgress ? <Pause size={12} className="shrink-0" /> : <Play size={12} className="fill-current text-emerald-400 hover:text-white" />}
                                </button>
                              )}

                              {/* Flag Selector Trigger */}
                              {!task.completed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrioritySelectTask(task);
                                  }}
                                  className={`w-[29px] h-[29px] rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm occasional-orange-glow ${
                                    task.priority === "high"
                                      ? "bg-orange-500/15 border-orange-400/50 text-orange-400"
                                      : task.priority === "medium"
                                        ? "bg-amber-500/15 border-amber-400/50 text-amber-400"
                                        : task.priority === "low"
                                          ? "bg-sky-505/15 border-sky-400/50 text-sky-455"
                                          : "bg-slate-900/30 border-white/10 text-slate-500 hover:text-white"
                                  }`}
                                  title={`Priority: ${task.priority || "none"} (Click to change)`}
                                >
                                  {task.priority === "high" ? (
                                    <Flag size={13.5} className="text-orange-450 fill-orange-450/30" />
                                  ) : task.priority === "medium" ? (
                                    <Flag size={13.5} className="text-amber-400 fill-amber-400/30" />
                                  ) : task.priority === "low" ? (
                                    <Flag size={13.5} className="text-sky-455 fill-sky-400/30" />
                                  ) : (
                                    <Flag size={13.5} className="text-slate-500" />
                                  )}
                                </button>
                              )}

                              {/* Lock/Unlock button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestToggleLock(task);
                                }}
                                className="w-[29px] h-[29px] rounded-xl border border-white/10 bg-slate-900/30 text-slate-350 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                title={task.isLocked ? "Unlock Task (Make Flexible)" : "Lock Task (Appointment)"}
                              >
                                {task.isLocked ? <Lock size={13.5} strokeWidth={2.5} /> : <Unlock size={13.5} strokeWidth={2.5} />}
                              </button>
                            </div>
                          </div>

                          {/* Secondary Bottom Row */}
                          <div className="flex items-center justify-between gap-4 w-full mt-2 border-t border-white/5 pt-2" onClick={(e) => e.stopPropagation()}>
                            {/* Location Link */}
                            {task.location && task.location.toString().trim() !== "0" ? (
                              <a 
                                href={getGoogleMapsDirectionsUrl(task.location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-slate-405 hover:text-rose-450 flex items-center gap-1 transition-colors truncate max-w-[170px]"
                                title="Open Google Maps Directions"
                              >
                                <MapPin size={11} className="text-rose-400 shrink-0" />
                                <span className="truncate">{task.location}</span>
                                <ArrowUpRight size={10} className="text-slate-500 shrink-0" />
                              </a>
                            ) : (
                              <div />
                            )}

                            {/* Backlog, Delete button actions */}
                            <div className="flex items-center gap-2 shrink-0" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                              {/* Move to Backlog button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveToBacklog(task);
                                }}
                                className="px-2.5 h-[27px] rounded-lg border border-white/10 bg-slate-900/30 text-[9px] font-black uppercase tracking-wider text-amber-400 hover:text-white hover:bg-amber-600/35 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Move to Backlog"
                              >
                                <Archive size={11}/>
                                <span>Backlog</span>
                              </button>

                              {/* Move to Tomorrow button */}
                              {handleMoveToNextDay && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToNextDay(task);
                                  }}
                                  className="px-2.5 h-[27px] rounded-lg border border-white/10 bg-slate-900/30 text-[9px] font-black uppercase tracking-wider text-sky-400 hover:text-white hover:bg-sky-600/35 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Move to Tomorrow"
                                >
                                  <Calendar size={11}/>
                                  <span>Tomorrow</span>
                                </button>
                              )}

                              {/* Delete button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeleteTask(task);
                                }}
                                className="px-2.5 h-[27px] rounded-lg border border-white/10 bg-slate-900/30 text-[9px] font-black uppercase tracking-wider text-rose-450 hover:text-white hover:bg-rose-600/35 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Delete Task"
                              >
                                <Trash2 size={11}/>
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
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
                      left: "64px",
                      right: "16px",
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
                draggedTask.groupId && !draggedTask.isUnlinked
                  ? "bg-slate-900/95 border-indigo-500/50 border-t-indigo-400/35 border-b-[3px] border-b-indigo-950 text-white"
                  : getTaskCardClassString(isAppt || draggedTask.isLocked, draggedTask.priority || "low", draggedTask.completed, false, draggedTask.isInProgress, !!draggedTask.isOpenPlaceholder)
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
