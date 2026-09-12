import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Clock,
  Target,
  MapPin,
  ChevronDown,
  Plus,
  X,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Flag,
  Tag,
  ExternalLink,
  GripVertical,
  ChevronUp,
  FolderClosed,
  Calendar,
  Zap,
  Play,
  Pause,
  Repeat,
  Navigation,
  Building,
  Home,
  Pencil,
  Users,
} from "lucide-react";
import { Task, Subtask } from "../types";
import { SubtaskWindowModal } from "./SubtaskWindowModal";
import { LocationChoicesModal } from "./LocationChoicesModal";
import { TextModeTaskDeckCardBody } from "./TextModeTaskDeckCardBody";
import { formatTime as helperFormatTime, timeToMinutes, minutesToTimeString, formatDurationText } from "../utils/timeHelpers";
import {
  getStoredHomeLocation,
  setStoredHomeLocation,
  getStoredWorkLocation,
  setStoredWorkLocation,
} from "../utils/locationStorage";
import { useAppStore } from "../store";
import { isColorLight } from "../utils/themeHelpers";

export interface TaskDeckCardProps {
  task: Task;
  index?: number;
  isDraggingThis?: boolean;
  deckDragId?: string | null;
  selectedBacklogTaskIds?: string[];
  deckTab?: string;
  isSelectingForRoutine?: boolean;
  selectedRoutineItems?: any[];
  onToggleComplete: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onUpdateTask?: (task: Task, updates: Partial<Task>) => void;
  onMoveToBacklog?: (task: Task) => void;
  onMoveToNextDay?: (task: Task) => void;
  onMoveToCurrentDay?: (task: Task) => void;
  onToggleSelectBacklog?: (taskId: string) => void;
  onSelectRoutineItem?: (task: Task) => void;
  handleDeckDragStart?: (e: any, task: Task) => void;
  handleMoveTaskDirection?: (task: Task, dir: "up" | "down") => void;
  allCollaborators?: string[];
  favoriteLocations?: string[];
  onAddFavoriteLocation?: (location: string) => void;
  formatTime?: (timeStr?: string) => string;
  getGoogleMapsDirectionsUrl?: (loc: string) => string;
  triggerHaptic?: (type: string) => void;
  isHoveredTarget?: boolean;
  dragOriginIdx?: number;
  isGrouped?: boolean;
  isSeqLocked?: boolean;
  seqIndex?: number;
  seqTotal?: number;
  onToggleSequenceFlexible?: (groupId: string) => void;
  onOpenBufferCustomizer?: (taskId: string, type: "before" | "after") => void;
  taskCardRef?: (el: any) => void;
  tappedDeckTaskId?: string | null;
  highlightedTaskId?: string | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  headerBgColor?: string;
  expandedBgColor?: string;
  fontColor?: string;
  fontSize?: "small" | "medium" | "large" | "xl";
  uiMode?: "Text" | "Graphics";
  textCardBg?: string;
  textCardExpandedBg?: string;
  textCardFontColor?: string;
  textCardFontSize?: "small" | "medium" | "large" | "xl";
  lockedSolidColorEnabled?: boolean;
  lockedSolidBgColor?: string;
  lockedNoColor?: boolean;
  lockedHue?: number;
  lockedOpacity?: number;
  isDark?: boolean;
  categories?: string[];
  onFocusTask?: (task: Task) => void;
}

const DEFAULT_COLLABORATORS = [
  "Sarah Jenkins",
  "David Miller",
  "Alex Rivera",
  "Elena Rostova",
  "Marcus Vance",
];

const DEFAULT_FAVORITE_LOCATIONS = [
  "Emagine Novi",
  "Chick-fil-A",
  "Home",
  "Work Headquarters",
  "Starbucks Coffee",
  "Downtown Library",
];

export const TaskDeckCard: React.FC<TaskDeckCardProps> = ({
  task,
  index = 0,
  isDraggingThis = false,
  deckDragId = null,
  selectedBacklogTaskIds = [],
  deckTab = "active",
  isSelectingForRoutine = false,
  selectedRoutineItems = [],
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onUpdateTask,
  onMoveToBacklog,
  onMoveToNextDay,
  onMoveToCurrentDay,
  onToggleSelectBacklog,
  onSelectRoutineItem,
  handleDeckDragStart,
  handleMoveTaskDirection,
  allCollaborators = DEFAULT_COLLABORATORS,
  favoriteLocations = DEFAULT_FAVORITE_LOCATIONS,
  onAddFavoriteLocation,
  formatTime = (t) => t || "09:00",
  getGoogleMapsDirectionsUrl = (loc) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`,
  triggerHaptic = () => {},
  isHoveredTarget = false,
  dragOriginIdx,
  isGrouped = false,
  isSeqLocked = false,
  seqIndex = 1,
  seqTotal = 1,
  onToggleSequenceFlexible,
  onOpenBufferCustomizer,
  taskCardRef,
  tappedDeckTaskId,
  highlightedTaskId,
  isExpanded,
  onToggleExpand,
  headerBgColor,
  expandedBgColor,
  fontColor,
  fontSize = "medium",
  uiMode = "Text",
  textCardBg = "",
  textCardExpandedBg = "",
  textCardFontColor = "",
  textCardFontSize,
  lockedSolidColorEnabled = false,
  lockedSolidBgColor = "#e11d48",
  lockedNoColor = false,
  lockedHue = 0,
  lockedOpacity = 0.35,
  isDark = true,
  categories = [],
  onFocusTask,
}) => {
  const [localExpanded, setLocalExpanded] = useState<boolean>(true);
  const cardExpanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const recentlyCompletedTaskId = useAppStore((state) => state.recentlyCompletedTaskId);
  const graphicsLockedCardBg = useAppStore((state) => state.graphicsLockedCardBg);
  const graphicsLockedCardFontColor = useAppStore((state) => state.graphicsLockedCardFontColor);
  const [localSuccessToggled, setLocalSuccessToggled] = useState(false);
  const isRecentlyCompleted = recentlyCompletedTaskId === task.id || localSuccessToggled;

  type DropdownType = "collaborator" | "location" | "category" | "priority" | null;
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);
  const [customLocInput, setCustomLocInput] = useState("");
  const [customCollabInput, setCustomCollabInput] = useState("");
  const [isSubtaskWindowOpen, setIsSubtaskWindowOpen] = useState(false);
  const [isLocationChoicesModalOpen, setIsLocationChoicesModalOpen] = useState(false);

  // Home & Work locations from persistent storage
  const [homeLocation, setHomeLocation] = useState<string>(getStoredHomeLocation);
  const [workLocation, setWorkLocation] = useState<string>(getStoredWorkLocation);
  const [isEditingHome, setIsEditingHome] = useState(false);
  const [editHomeInput, setEditHomeInput] = useState("");
  const [isEditingWork, setIsEditingWork] = useState(false);
  const [editWorkInput, setEditWorkInput] = useState("");

  useEffect(() => {
    const handleLocationsUpdated = () => {
      setHomeLocation(getStoredHomeLocation());
      setWorkLocation(getStoredWorkLocation());
    };
    window.addEventListener("taskpass_locations_updated", handleLocationsUpdated);
    return () => {
      window.removeEventListener("taskpass_locations_updated", handleLocationsUpdated);
    };
  }, []);

  // Subtasks attached directly to task data
  const subtasks: Subtask[] = useMemo(() => {
    if (Array.isArray(task.subtasks)) {
      return task.subtasks;
    }
    return [];
  }, [task.subtasks]);

  const handleToggleSubtaskItem = (subtaskId: string) => {
    triggerHaptic("light");
    const updated = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    if (onUpdateTask) {
      onUpdateTask(task, { subtasks: updated });
    }
  };

  const handleModalAddSubtask = (title: string, priority?: "high" | "medium" | "low") => {
    triggerHaptic("medium");
    const newSt: Subtask = {
      id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      completed: false,
      priority,
    };
    const updated = [...subtasks, newSt];
    if (onUpdateTask) {
      onUpdateTask(task, { subtasks: updated });
    }
  };

  const handleDeleteSubtaskItem = (subtaskId: string) => {
    triggerHaptic("medium");
    const updated = subtasks.filter((st) => st.id !== subtaskId);
    if (onUpdateTask) {
      onUpdateTask(task, { subtasks: updated });
    }
  };

  const handleModalUpdateTitle = (subtaskId: string, newTitle: string) => {
    const updated = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, title: newTitle } : st
    );
    if (onUpdateTask) {
      onUpdateTask(task, { subtasks: updated });
    }
  };

  const handleUpdateSubtaskPriority = (subtaskId: string, priority?: "high" | "medium" | "low" | undefined) => {
    const updated = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, priority } : st
    );
    if (onUpdateTask) {
      onUpdateTask(task, { subtasks: updated });
    }
  };

  const handleReorderSubtasksList = (newSubtasks: Subtask[]) => {
    if (onUpdateTask) {
      onUpdateTask(task, { subtasks: newSubtasks });
    }
  };

  // Parse duration in minutes
  const parseDurationMinutes = (durStr?: string): number => {
    if (!durStr) return 30;
    const trimmed = durStr.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    const hourMatch = trimmed.match(/(\d+)\s*h/i);
    const minMatch = trimmed.match(/(\d+)\s*m/i);
    let total = 0;
    if (hourMatch) total += parseInt(hourMatch[1], 10) * 60;
    if (minMatch) total += parseInt(minMatch[1], 10);
    return total > 0 ? total : 30;
  };

  const durationMins = parseDurationMinutes(task.duration);

  // Format duration nicely (e.g. "2h 00 min", "30m")
  const formatDurationText = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0 && remainingMins === 0) return `${hours}h 00 min`;
    if (hours > 0) return `${hours}h ${remainingMins.toString().padStart(2, "0")} min`;
    return `${mins}m`;
  };

  // Session label (e.g. "2h session", "30m session")
  const sessionText = (() => {
    const hours = Math.floor(durationMins / 60);
    const remainingMins = durationMins % 60;
    if (hours > 0 && remainingMins === 0) return `${hours}h session`;
    if (hours > 0) return `${hours}h ${remainingMins}m session`;
    return `${durationMins}m session`;
  })();

  // Compute end time
  const computeEndTime = (startTimeStr?: string, durMins: number = 30): string => {
    if (!startTimeStr) return "10:00";
    const startMins = timeToMinutes(startTimeStr);
    const totalEndMins = (startMins + durMins) % 1440;
    return minutesToTimeString(totalEndMins);
  };

  const timeFormatter = formatTime || helperFormatTime;
  const startTimeFormatted = timeFormatter(task.computedTime || task.time || "09:00");
  const endTimeStr = computeEndTime(task.computedTime || task.time || "09:00", durationMins);
  const endTimeFormatted = timeFormatter(endTimeStr);

  // Duration adjustments
  const handleAdjustDuration = (deltaMins: number) => {
    triggerHaptic("light");
    const nextDuration = Math.max(5, durationMins + deltaMins);
    if (onUpdateTask) {
      onUpdateTask(task, { duration: `${nextDuration}` });
    }
  };

  // Collaborator selection
  const handleSelectCollaborator = (name: string) => {
    triggerHaptic("light");
    const val = name === "None" ? "" : name;
    if (onUpdateTask) {
      onUpdateTask(task, { collaborator: val });
    }
    setActiveDropdown(null);
  };

  // Location selection
  const locationTitle = task.location && task.location.trim() ? task.location.trim() : "Emagine Novi";

  const handleSelectLocation = (loc: string) => {
    triggerHaptic("light");
    if (onUpdateTask) {
      onUpdateTask(task, { location: loc });
    }
    setActiveDropdown(null);
  };

  // Center window modal for pull-down menu choices (Location, Collaborator, Category, Priority)
  const renderPulldownWindowModal = () => {
    if (!activeDropdown) return null;

    return createPortal(
      <div
        id={`task-pulldown-modal-${task.id}`}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150 text-left"
        onClick={() => setActiveDropdown(null)}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) {
            setActiveDropdown(null);
          }
        }}
      >
        <div
          id={`pulldown-window-${task.id}`}
          data-pulldown-window="true"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col bg-[#FFF2DF] text-[#1F1A16] border-2 border-[#EADDC7] rounded-3xl p-5 shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 duration-150 relative text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADDC7]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] flex items-center justify-center shrink-0">
                {activeDropdown === "location" && <MapPin size={16} className="text-[#2D6A4F]" />}
                {activeDropdown === "collaborator" && <Users size={16} className="text-[#A25F37]" />}
                {activeDropdown === "category" && <Tag size={16} className="text-[#A25F37]" />}
                {activeDropdown === "priority" && <Flag size={16} className="text-[#A25F37]" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#2D2319] truncate">
                  {activeDropdown === "location" && "Select Location"}
                  {activeDropdown === "collaborator" && "Assign Collaborator"}
                  {activeDropdown === "category" && "Select Category"}
                  {activeDropdown === "priority" && "Select Priority"}
                </h3>
                <p className="text-[10px] text-[#7A6B5C] font-semibold truncate">
                  {task.title || "Task Details"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveDropdown(null)}
              className="p-1.5 rounded-xl hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#1F1A16] transition-colors cursor-pointer shrink-0"
              title="Close window"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Modal Body with Scrollbar */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {/* LOCATION */}
            {activeDropdown === "location" && (
              <div className="space-y-2.5">
                {/* None / Clear Option */}
                <button
                  type="button"
                  onClick={() => handleSelectLocation("")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                    !task.location
                      ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0]"
                      : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#786C60] border-[#EADDC7]"
                  }`}
                >
                  <span>None (Clear Location)</span>
                  {!task.location && <Check size={13} className="text-[#2D6A4F]" />}
                </button>

                {/* Quick Preset: Home & Work with Editable Addresses */}
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B]">
                    Quick Presets
                  </span>

                  {/* Home */}
                  <div className="p-2.5 rounded-2xl bg-[#FFF9F0] border border-[#EADDC7]">
                    {isEditingHome ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editHomeInput.trim()) {
                            setStoredHomeLocation(editHomeInput.trim());
                            setHomeLocation(editHomeInput.trim());
                          }
                          setIsEditingHome(false);
                        }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-[#2D6A4F]">
                          <span className="flex items-center gap-1">
                            <Home size={11} />
                            <span>Edit Home Address</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingHome(false)}
                            className="text-[#8C7A6B] hover:text-[#2D2319]"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <input
                          type="text"
                          autoFocus
                          value={editHomeInput}
                          onChange={(e) => setEditHomeInput(e.target.value)}
                          placeholder="Enter home street address..."
                          className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsEditingHome(false)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#6B5A4B] bg-[#EADDC7]/60 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-[#2D6A4F] text-white cursor-pointer"
                          >
                            Save Home
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectLocation(homeLocation)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center shrink-0">
                            <Home size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-black text-[#2D2319]">Home</span>
                              {task.location === homeLocation && (
                                <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-[#2D6A4F] text-white">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-[#7A6B5C] truncate">
                              {homeLocation || "Set Home address..."}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditHomeInput(homeLocation === "Home" ? "" : homeLocation);
                            setIsEditingHome(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#2D2319] cursor-pointer"
                          title="Edit Home Address"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Work */}
                  <div className="p-2.5 rounded-2xl bg-[#FFF9F0] border border-[#EADDC7]">
                    {isEditingWork ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editWorkInput.trim()) {
                            setStoredWorkLocation(editWorkInput.trim());
                            setWorkLocation(editWorkInput.trim());
                          }
                          setIsEditingWork(false);
                        }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-[#3A86FF]">
                          <span className="flex items-center gap-1">
                            <Building size={11} />
                            <span>Edit Work Address</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingWork(false)}
                            className="text-[#8C7A6B] hover:text-[#2D2319]"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <input
                          type="text"
                          autoFocus
                          value={editWorkInput}
                          onChange={(e) => setEditWorkInput(e.target.value)}
                          placeholder="Enter work street address..."
                          className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#3A86FF]"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsEditingWork(false)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#6B5A4B] bg-[#EADDC7]/60 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-[#2D6A4F] text-white cursor-pointer"
                          >
                            Save Work
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectLocation(workLocation)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-xl bg-blue-100 text-[#3A86FF] flex items-center justify-center shrink-0">
                            <Building size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-black text-[#2D2319]">Work</span>
                              {task.location === workLocation && (
                                <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-[#2D6A4F] text-white">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-[#7A6B5C] truncate">
                              {workLocation || "Set Work address..."}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditWorkInput(workLocation === "Work" ? "" : workLocation);
                            setIsEditingWork(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#2D2319] cursor-pointer"
                          title="Edit Work Address"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Other Saved Locations */}
                {favoriteLocations.filter(
                  (l) => l.toLowerCase() !== homeLocation.toLowerCase() && l.toLowerCase() !== workLocation.toLowerCase()
                ).length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-[#EADDC7]">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B]">
                      Other Saved Locations
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {favoriteLocations
                        .filter(
                          (l) => l.toLowerCase() !== homeLocation.toLowerCase() && l.toLowerCase() !== workLocation.toLowerCase()
                        )
                        .map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => handleSelectLocation(loc)}
                            className="w-full text-left px-3 py-1.5 rounded-xl bg-[#FFF9F0] hover:bg-[#FAF3E0] border border-[#EADDC7] text-xs font-bold text-[#3D312A] flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <MapPin size={11} className="text-[#A25F37] shrink-0" />
                              <span className="truncate">{loc}</span>
                            </div>
                            {task.location === loc && <Check size={12} className="text-[#2D6A4F] ml-auto shrink-0" />}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Custom address form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customLocInput.trim()) {
                      handleSelectLocation(customLocInput.trim());
                      setCustomLocInput("");
                    }
                  }}
                  className="space-y-1.5 pt-2 border-t border-[#EADDC7]"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customLocInput}
                      onChange={(e) => setCustomLocInput(e.target.value)}
                      placeholder="Add custom address..."
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#A25F37]"
                    />
                    <button
                      type="submit"
                      disabled={!customLocInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase tracking-wider hover:bg-[#1B4332] disabled:opacity-40 cursor-pointer"
                    >
                      Set
                    </button>
                  </div>
                </form>

                {/* Directions & Search */}
                <div className="flex flex-col gap-1.5 pt-1">
                  {task.location && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = getGoogleMapsDirectionsUrl
                          ? getGoogleMapsDirectionsUrl(task.location || "")
                          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.location || "")}&travelmode=driving`;
                        if (typeof window !== "undefined") {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="w-full py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Navigation size={12} className="fill-current" />
                      <span>Launch Driving Directions</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDropdown(null);
                      setIsLocationChoicesModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[10px] font-black uppercase tracking-wider text-[#594B3E] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>Open Full Location Explorer</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* COLLABORATOR */}
            {activeDropdown === "collaborator" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Choose Collaborator
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => handleSelectCollaborator("None")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      !task.collaborator || task.collaborator === "None"
                        ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0]"
                        : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#786C60] border-[#EADDC7]"
                    }`}
                  >
                    <span>None (Unassigned)</span>
                    {(!task.collaborator || task.collaborator === "None") && <Check size={13} className="text-[#2D6A4F]" />}
                  </button>
                  {allCollaborators.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectCollaborator(name)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                        task.collaborator === name
                          ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0]"
                          : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#594B3E] border-[#EADDC7]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded-full bg-[#EADDC7] text-[#2D2319] text-[9px] font-black flex items-center justify-center shrink-0">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate">{name}</span>
                      </div>
                      {task.collaborator === name && <Check size={13} className="text-[#2D6A4F]" />}
                    </button>
                  ))}
                </div>

                {/* Add custom collaborator */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customCollabInput.trim()) {
                      handleSelectCollaborator(customCollabInput.trim());
                      setCustomCollabInput("");
                    }
                  }}
                  className="pt-2 border-t border-[#EADDC7] flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={customCollabInput}
                    onChange={(e) => setCustomCollabInput(e.target.value)}
                    placeholder="Add new member..."
                    className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#A25F37]"
                  />
                  <button
                    type="submit"
                    disabled={!customCollabInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}

            {/* CATEGORY */}
            {activeDropdown === "category" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Choose Category
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {(categories.length > 0 ? categories : ["Work", "Meeting", "Personal", "Study", "Creative", "Health"]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (onUpdateTask) onUpdateTask(task, { category: cat });
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                        task.category === cat
                          ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0]"
                          : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#594B3E] border-[#EADDC7]"
                      }`}
                    >
                      <span>{cat}</span>
                      {task.category === cat && <Check size={13} className="text-[#2D6A4F]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PRIORITY */}
            {activeDropdown === "priority" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Choose Priority
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "none", label: "None" },
                    { id: "low", label: "Low" },
                    { id: "medium", label: "Medium" },
                    { id: "high", label: "High" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (onUpdateTask) onUpdateTask(task, { priority: p.id as any });
                        setActiveDropdown(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                        (task.priority || "none") === p.id
                          ? "bg-[#A25F37] text-white border-[#A25F37] shadow-xs"
                          : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#594B3E] border-[#EADDC7]"
                      }`}
                    >
                      <span>{p.label}</span>
                      {(task.priority || "none") === p.id && <Check size={13} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Real-time ticking when task is currently in progress
  const [deckTick, setDeckTick] = useState<number>(Date.now());
  useEffect(() => {
    if (!task.isInProgress) return;
    const interval = setInterval(() => setDeckTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [task.isInProgress]);

  // Compute live remaining countdown seconds
  const remainingSecs = useMemo(() => {
    if (!task.isInProgress && !task.accumulatedElapsedMs) {
      return durationMins * 60;
    }
    const elapsedMs = (task.focusStartedAt ? (deckTick - task.focusStartedAt) : 0) + (task.accumulatedElapsedMs || 0);
    return Math.max(0, (durationMins * 60) - Math.floor(elapsedMs / 1000));
  }, [task.isInProgress, task.focusStartedAt, task.accumulatedElapsedMs, durationMins, deckTick]);

  const formatCountdown = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const hrs = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sc.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${sc.toString().padStart(2, "0")}`;
  };

  const handleToggleDurationTimer = () => {
    triggerHaptic("medium");
    if (onFocusTask) {
      onFocusTask(task);
    }
  };

  const isTextMode = uiMode !== "Graphics";

  const isRecurring = Boolean(
    task.isRecurring ||
    task.recurringParentId ||
    (task.recurrenceFrequency && task.recurrenceFrequency !== "none") ||
    (task.repeatConfig && task.repeatConfig !== "none" && task.repeatConfig !== "")
  );

  // Card Background, Border & Colors
  const cardStyling = useMemo(() => {
    if (isTextMode) {
      // Locked styling
      if (task.isLocked) {
        if (lockedSolidColorEnabled) {
          return {
            bg: lockedSolidBgColor || "#e11d48",
            border: "rgba(255, 255, 255, 0.28)",
            color: "#ffffff",
            expandedBg: textCardExpandedBg || "rgba(0, 0, 0, 0.28)",
            isSolidLocked: true,
          };
        } else if (lockedNoColor) {
          const defaultText = textCardFontColor || (isDark ? "#ffffff" : "#1e293b");
          return {
            bg: isDark ? "#1e293b" : "#ffffff",
            border: isDark ? "rgba(255, 255, 255, 0.15)" : "#e2e8f0",
            color: defaultText,
            expandedBg: textCardExpandedBg || (isDark ? "#0f172a" : "#f1f5f9"),
          };
        } else {
          // Locked glow hue
          const hue = lockedHue !== undefined ? lockedHue : 0;
          const opacity = lockedOpacity !== undefined ? lockedOpacity : 0.35;
          const defaultText = textCardFontColor || (isDark ? "#ffffff" : "#1e293b");
          return {
            bg: isDark
              ? `linear-gradient(to right, hsla(222, 25%, 11%, 0.75), hsla(${hue}, 70%, 25%, ${Math.max(0.35, opacity)}))`
              : `linear-gradient(to right, #ffffff, hsla(${hue}, 85%, 94%, 0.95))`,
            border: `hsla(${hue}, 80%, 60%, 0.7)`,
            color: defaultText,
            expandedBg: textCardExpandedBg || (isDark ? "#0f172a" : "#f1f5f9"),
          };
        }
      }

      // Non-locked text mode styling: responsive to textCardBg, textCardExpandedBg, textCardFontColor
      if (textCardBg) {
        const isLightBg = textCardBg === "#ffffff" || textCardBg === "#f8fafc" || textCardBg === "#f1f5f9" || textCardBg === "#FAF3E0";
        const defaultText = textCardFontColor || (isLightBg ? "#0f172a" : "#ffffff");
        return {
          bg: textCardBg,
          border: isLightBg ? "#cbd5e1" : "rgba(255, 255, 255, 0.18)",
          color: defaultText,
          expandedBg: textCardExpandedBg || (isLightBg ? "#e2e8f0" : "rgba(0, 0, 0, 0.28)"),
        };
      }

      const defaultText = textCardFontColor || (isDark ? "#f8fafc" : "#0f172a");
      return {
        bg: isDark ? "#1e293b" : "#ffffff",
        border: isDark ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
        color: defaultText,
        expandedBg: textCardExpandedBg || (isDark ? "#0f172a" : "#f1f5f9"),
      };
    }

    // Graphics mode styling
    if (task.isLocked) {
      const lockedBg = graphicsLockedCardBg || "#A25F37";
      const isLightLocked = isColorLight(lockedBg);
      const effectiveText = graphicsLockedCardFontColor || fontColor || (isLightLocked ? "#1F1A16" : "#FFFFFF");
      return {
        bg: lockedBg,
        border: isLightLocked ? "rgba(0, 0, 0, 0.18)" : "rgba(255, 255, 255, 0.25)",
        color: effectiveText,
        expandedBg: expandedBgColor || (isLightLocked ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.25)"),
        isSolidLocked: true,
      };
    }

    return {
      bg: headerBgColor || "#1C3B2B",
      border: headerBgColor ? "rgba(255, 255, 255, 0.22)" : "#2D5A40",
      color: fontColor || "#FFFFFF",
      expandedBg: expandedBgColor || "#152E21",
    };
  }, [
    isTextMode,
    task.isLocked,
    graphicsLockedCardBg,
    graphicsLockedCardFontColor,
    lockedSolidColorEnabled,
    lockedSolidBgColor,
    lockedNoColor,
    lockedHue,
    lockedOpacity,
    textCardBg,
    textCardExpandedBg,
    textCardFontColor,
    isDark,
    headerBgColor,
    expandedBgColor,
    fontColor,
  ]);

  const effectiveFontSize = isTextMode ? (textCardFontSize || fontSize || "medium") : (fontSize || "medium");
  const titleSizeClass =
    effectiveFontSize === "small"
      ? "text-lg sm:text-xl"
      : effectiveFontSize === "large"
      ? "text-3xl sm:text-4xl"
      : effectiveFontSize === "xl"
      ? "text-4xl sm:text-5xl"
      : "text-2xl sm:text-3xl";

  const subtitleSizeClass =
    effectiveFontSize === "small"
      ? "text-[11px] sm:text-xs"
      : effectiveFontSize === "large"
      ? "text-sm sm:text-base"
      : effectiveFontSize === "xl"
      ? "text-base sm:text-lg"
      : "text-xs sm:text-sm";

  // Toggle lock
  const handleToggleLock = () => {
    triggerHaptic("medium");
    if (onUpdateTask) {
      onUpdateTask(task, { isLocked: !task.isLocked });
    }
  };

  const isBacklog = deckTab === "backlog";
  const isBacklogSelected = selectedBacklogTaskIds.includes(task.id);

  return (
    <motion.div
      ref={taskCardRef}
      layout={deckDragId ? false : "position"}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDraggingThis ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full relative group"
    >
      {/* Top Discreet Triangle: Pre-Task Buffer Time Edit Trigger */}
      {onOpenBufferCustomizer && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBufferCustomizer(task.id, "before");
          }}
          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-35 px-2.5 py-0.5 rounded-full border border-[#2D5A40] shadow-md flex items-center justify-center gap-0.5 text-[8.5px] font-black uppercase transition-all duration-150 cursor-pointer ${
            tappedDeckTaskId === task.id
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto"
          } bg-[#152E21] text-[#FAF3E0] hover:bg-[#2D6A4F] hover:text-white`}
          title="Edit Pre-Task Buffer Time"
        >
          <span className="text-[7px] leading-none">▲</span>
          <span className="text-[7.5px] font-mono font-bold tracking-tight">
            {task.travelBefore ? `${task.travelBefore}m` : "Pre-Buffer"}
          </span>
        </button>
      )}

      {/* Bottom Discreet Triangle: Post-Task Buffer Time Edit Trigger */}
      {onOpenBufferCustomizer && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBufferCustomizer(task.id, "after");
          }}
          className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-35 px-2.5 py-0.5 rounded-full border border-[#2D5A40] shadow-md flex items-center justify-center gap-0.5 text-[8.5px] font-black uppercase transition-all duration-150 cursor-pointer ${
            tappedDeckTaskId === task.id
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto"
          } bg-[#152E21] text-[#FAF3E0] hover:bg-[#2D6A4F] hover:text-white`}
          title="Edit Post-Task Buffer Time"
        >
          <span className="text-[7px] leading-none">▼</span>
          <span className="text-[7.5px] font-mono font-bold tracking-tight">
            {task.travelAfter ? `${task.travelAfter}m` : "Post-Buffer"}
          </span>
        </button>
      )}

      {/* Sequence connectivity connector bubble */}
      {isGrouped && (
        <div 
          className={`absolute top-1/2 -translate-y-1/2 right-full mr-2.5 w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[9.5px] font-black tracking-tighter uppercase transition-all duration-300 z-20 shadow-md ${
            task.completed
              ? "bg-[#152E21] border-[#2D6A4F] text-emerald-400 shadow-[0_0_12px_rgba(45,106,79,0.35)] scale-100"
              : isSeqLocked
                ? "bg-[#152E21] border-[#FAF3E0] text-[#FAF3E0] shadow-md hover:scale-110 active:scale-95 cursor-pointer"
                : "bg-[#152E21] border-[#2D5A40] text-white/70 hover:border-[#FAF3E0] hover:text-white hover:scale-110 active:scale-95 cursor-pointer"
          }`}
          title={`Sequence Step ${seqIndex} of ${seqTotal}. Click to toggle flexibility.`}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSequenceFlexible && task.groupId) {
              onToggleSequenceFlexible(task.groupId);
            }
          }}
        >
          {task.completed ? "✓" : seqIndex}
        </div>
      )}

      {/* Drop Zone Indicator Line */}
      {isHoveredTarget && (
        <div
          className="absolute left-3 right-3 h-[4px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 rounded-full shadow-[0_0_14px_rgba(45,106,79,0.95)] z-40 animate-pulse pointer-events-none flex items-center justify-center"
          style={{
            top: (dragOriginIdx !== undefined && index <= dragOriginIdx) ? "-2px" : "auto",
            bottom: (dragOriginIdx !== undefined && index > dragOriginIdx) ? "-2px" : "auto",
          }}
        >
          <span className="absolute px-2.5 py-0.5 rounded-full bg-[#1C3B2B] border border-white/40 text-[7px] font-black uppercase text-white tracking-widest shadow-[0_4px_10px_rgba(0,0,0,0.5)] whitespace-nowrap">
            Place in Position {index + 1}
          </span>
        </div>
      )}

      {/* Selection interceptor if choosing for routine */}
      {isSelectingForRoutine && (
        <div
          className="absolute inset-0 z-50 rounded-3xl cursor-pointer"
          onClick={() => onSelectRoutineItem && onSelectRoutineItem(task)}
        />
      )}

      {/* Main Task Card Container with Configurable Background */}
      <div
        className={`w-full rounded-3xl border p-4 sm:p-5 shadow-xl transition-all relative overflow-hidden select-none ${
          isRecentlyCompleted ? "animate-task-success-border " : ""
        }${
          task.completed ? "opacity-90 ring-1 ring-emerald-400/40" : ""
        } ${isBacklogSelected ? "ring-2 ring-amber-400 shadow-amber-900/30" : ""} ${
          highlightedTaskId === task.id ? "ring-4 ring-emerald-400/60 animate-pulse" : ""
        } ${
          task.isInProgress ? "faint-pulsing-glow ring-2 ring-emerald-400/80" : ""
        }`}
        style={{
          background: cardStyling.bg,
          backgroundColor: !cardStyling.bg.includes("gradient") ? cardStyling.bg : undefined,
          borderColor: cardStyling.border,
          color: cardStyling.color,
        }}
      >
        {/* TOP ROW: Checkbox, Title & Time Subtitle */}
        <div className="flex items-start gap-3">
          {/* Backlog Multi-select Checkbox if in Backlog tab */}
          {isBacklog && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleSelectBacklog) onToggleSelectBacklog(task.id);
              }}
              className={`shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-all mt-1 ${
                isBacklogSelected
                  ? "bg-amber-500 border-amber-300 text-slate-950 font-black shadow-md"
                  : "border-white/40 bg-white/10 hover:border-amber-400 text-white/50"
              }`}
              title="Select for batch action"
            >
              {isBacklogSelected && <Check size={14} strokeWidth={3.5} />}
            </div>
          )}

          {/* Drag & Reorder Handle */}
          {handleDeckDragStart && (
            <div className="shrink-0 flex flex-col items-center justify-center gap-1 pr-1 border-r border-white/15 self-stretch select-none mt-0.5">
              <div
                className="text-white/40 hover:text-white cursor-grab active:cursor-grabbing p-0.5"
                onMouseDown={(e) => handleDeckDragStart(e, task)}
                onTouchStart={(e) => handleDeckDragStart(e, task)}
                title="Drag to reorder"
              >
                <GripVertical size={14} />
              </div>
              {handleMoveTaskDirection && (
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTaskDirection(task, "up");
                    }}
                    className="p-0.5 hover:bg-white/15 rounded text-white/50 hover:text-white cursor-pointer"
                    title="Move up"
                  >
                    <ChevronUp size={11} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTaskDirection(task, "down");
                    }}
                    className="p-0.5 hover:bg-white/15 rounded text-white/50 hover:text-white cursor-pointer"
                    title="Move down"
                  >
                    <ChevronDown size={11} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Main Task Completion Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("success");
              setLocalSuccessToggled(true);
              setTimeout(() => setLocalSuccessToggled(false), 1200);
              onToggleComplete(task);
            }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 ${
              task.completed
                ? "bg-emerald-600 border-white text-white shadow-sm"
                : isTextMode
                ? "border-current/40 hover:border-current bg-black/10 text-current"
                : "border-white/80 hover:border-white bg-[#152E21]"
            }`}
            title={task.completed ? "Mark incomplete" : "Done"}
          >
            {task.completed && <Check size={18} strokeWidth={3.5} className="text-white" />}
          </button>

          {/* Task Title & Subtitle in 3 Rows */}
          <div className="flex-1 min-w-0">
            {/* ROW 1: Full row task title */}
            <div className="w-full">
              <h2
                onClick={() => onEditTask(task)}
                className={`${titleSizeClass} font-bold tracking-tight cursor-pointer hover:underline truncate w-full ${
                  isRecentlyCompleted ? "animate-task-success-text " : ""
                }${
                  task.completed ? "line-through opacity-60" : ""
                }`}
                style={{ color: cardStyling.color }}
                title={`Click to edit "${task.title}"`}
              >
                {task.title || "Untitled Task"}
              </h2>
            </div>

            {/* ROW 2: Time and recurring icon */}
            <div
              className={`flex items-center gap-1.5 font-semibold mt-1 flex-wrap ${subtitleSizeClass}`}
              style={{ color: cardStyling.color, opacity: 0.85 }}
            >
              <Clock size={13} className="shrink-0" style={{ color: cardStyling.color }} />
              <span>
                {startTimeFormatted} – {endTimeFormatted} ({formatDurationText(durationMins)})
              </span>
              {isRecurring && (
                <span className="flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/15">
                  <Repeat size={8.5} />
                  <span className="capitalize">{task.recurrenceFrequency && task.recurrenceFrequency !== "none" ? task.recurrenceFrequency : "Recurring"}</span>
                </span>
              )}
            </div>

            {/* ROW 3: All icons for functions and collapse, expand in third row */}
            <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-1.5 border-t border-white/10 flex-wrap" onClick={(e) => e.stopPropagation()}>
              {/* Function Action Icons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Activate Driving Directions Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("medium");
                    const destination = task.location?.trim() || task.title?.trim() || "destination";
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
                    window.open(mapsUrl, "_blank", "noopener,noreferrer");
                  }}
                  className={`border transition-all cursor-pointer flex items-center justify-center ${
                    isTextMode
                      ? "p-1 rounded-lg bg-sky-600/30 hover:bg-sky-500 border-sky-400/40 text-sky-300 hover:text-white"
                      : "p-1.5 sm:p-2 rounded-xl bg-sky-600/40 hover:bg-sky-500 border-sky-400/50 text-sky-200 hover:text-white shadow-xs active:scale-95"
                  }`}
                  title={task.location ? `Activate driving directions to: ${task.location}` : `Activate driving directions for "${task.title}"`}
                >
                  <Navigation size={isTextMode ? 10.5 : 14} className="transform rotate-45" />
                </button>

                {/* Play / Pause Duration Countdown Timer icon */}
                {onFocusTask && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      onFocusTask(task);
                    }}
                    className={`border transition-all cursor-pointer flex items-center justify-center ${
                      task.isInProgress
                        ? "p-1.5 sm:p-2 rounded-xl bg-emerald-500 border-emerald-400 text-white animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : isTextMode
                        ? "p-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-500 border-emerald-400/40 text-emerald-300 hover:text-white"
                        : "p-1.5 sm:p-2 rounded-xl bg-emerald-600/40 hover:bg-emerald-500 border-emerald-400/50 text-emerald-200 hover:text-white shadow-xs active:scale-95"
                    }`}
                    title={task.isInProgress ? "Pause Countdown Timer" : "Start Focus Countdown Timer"}
                  >
                    {task.isInProgress ? (
                      <Pause size={isTextMode ? 10.5 : 14} strokeWidth={2.5} />
                    ) : (
                      <Play size={isTextMode ? 10.5 : 14} fill="currentColor" />
                    )}
                  </button>
                )}

                {/* Recurring icon */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    const isCurrentlyRecurring = isRecurring;
                    if (onUpdateTask) {
                      onUpdateTask(task, {
                        isRecurring: !isCurrentlyRecurring,
                        recurrenceFrequency: isCurrentlyRecurring ? 'none' : 'daily',
                      });
                    }
                  }}
                  className={`border transition-all cursor-pointer flex items-center justify-center ${
                    isTextMode
                      ? "p-1 rounded-lg " + (isRecurring ? "bg-indigo-600/40 border-indigo-400/50 text-indigo-200" : "bg-white/10 border-white/20 text-white/50 hover:text-white")
                      : "p-1.5 sm:p-2 rounded-xl shadow-xs active:scale-95 " + (isRecurring ? "bg-indigo-600/50 border-indigo-400/60 text-indigo-100" : "bg-white/15 border-white/25 text-white/70 hover:text-white hover:bg-white/25")
                  }`}
                  title={isRecurring ? `Recurring (${task.recurrenceFrequency || "Daily"}) - click to toggle` : "Make recurring"}
                >
                  <Repeat size={isTextMode ? 10.5 : 14} />
                </button>

                {/* Lock status pill */}
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className={`border transition-all cursor-pointer flex items-center justify-center ${
                    isTextMode
                      ? "p-1 rounded-lg text-[9px] font-bold " + (task.isLocked ? "bg-rose-900/40 border-rose-500/40 text-rose-300" : "bg-white/10 border-white/20 text-white/70 hover:text-white")
                      : "p-1.5 sm:p-2 rounded-xl shadow-xs active:scale-95 " + (task.isLocked ? "bg-rose-800/50 border-rose-400/60 text-rose-200" : "bg-white/15 border-white/25 text-white/70 hover:text-white hover:bg-white/25")
                  }`}
                  title={task.isLocked ? "Locked (Fixed time)" : "Flexible"}
                >
                  {task.isLocked ? <Lock size={isTextMode ? 10 : 14} strokeWidth={2.5} /> : <Unlock size={isTextMode ? 10 : 14} strokeWidth={2.5} />}
                </button>

                {/* Edit Task details */}
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className={`border transition-all cursor-pointer flex items-center justify-center ${
                    isTextMode
                      ? "p-1 rounded-lg bg-white/10 hover:bg-white/20 border-white/20 text-white/70 hover:text-white"
                      : "p-1.5 sm:p-2 rounded-xl shadow-xs bg-white/15 hover:bg-white/25 border-white/25 text-white/80 hover:text-white active:scale-95"
                  }`}
                  title="Edit task details"
                >
                  <Edit3 size={isTextMode ? 11 : 14} />
                </button>

                {/* Delete Task */}
                {onDeleteTask && (
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task)}
                    className={`border transition-all cursor-pointer flex items-center justify-center ${
                      isTextMode
                        ? "p-1 rounded-lg bg-white/10 hover:bg-rose-600/30 border-white/20 text-white/70 hover:text-rose-300"
                        : "p-1.5 sm:p-2 rounded-xl shadow-xs bg-white/15 hover:bg-rose-600/40 border-white/25 text-white/80 hover:text-rose-200 active:scale-95"
                    }`}
                    title="Delete task"
                  >
                    <Trash2 size={isTextMode ? 11 : 14} />
                  </button>
                )}
              </div>

              {/* Expand / Collapse Toggle in Third Row */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("light");
                  if (onToggleExpand) {
                    onToggleExpand();
                  } else {
                    setLocalExpanded((prev) => !prev);
                  }
                }}
                className="px-2 sm:px-2.5 py-1 rounded-full text-[8px] sm:text-[8.5px] font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer border shadow-2xs hover:scale-105 active:scale-95 shrink-0"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  color: cardStyling.color,
                }}
                title={cardExpanded ? "Collapse card" : "Expand card"}
              >
                <span>{cardExpanded ? "COLLAPSE" : "EXPAND"}</span>
                {cardExpanded ? <ChevronUp size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </div>

        {/* EXPANDABLE PORTION: COMBINED DURATION & COLLABORATOR (2x1), SUBTASKS, MAP & LOCATION, QUICK ACTIONS */}
        <AnimatePresence initial={false}>
          {cardExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              {isTextMode ? (
                <TextModeTaskDeckCardBody
                  task={task}
                  cardStyling={cardStyling}
                  isDark={isDark}
                  durationMins={durationMins}
                  sessionText={sessionText}
                  categories={categories}
                  allCollaborators={allCollaborators}
                  subtasks={subtasks}
                  onUpdateTask={onUpdateTask}
                  handleToggleLock={handleToggleLock}
                  handleAdjustDuration={handleAdjustDuration}
                  handleToggleSubtaskItem={handleToggleSubtaskItem}
                  handleDeleteSubtaskItem={handleDeleteSubtaskItem}
                  handleModalAddSubtask={handleModalAddSubtask}
                  setIsSubtaskWindowOpen={setIsSubtaskWindowOpen}
                  onFocusTask={onFocusTask}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onMoveToBacklog={onMoveToBacklog}
                  onMoveToCurrentDay={onMoveToCurrentDay}
                  deckTab={deckTab}
                  triggerHaptic={triggerHaptic}
                  getGoogleMapsDirectionsUrl={getGoogleMapsDirectionsUrl}
                />
              ) : (
                <>
                  {/* ROW 1: DURATION & COLLABORATOR HALF-SIZE ACTION CARDS SIDE-BY-SIDE */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-3 sm:my-3.5">
                    {/* DURATION ACTION CARD */}
                    <div
                      className={`relative p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between shadow-inner border min-h-[125px] sm:min-h-[135px] ${
                        task.isInProgress ? "faint-pulsing-glow border-emerald-400/80" : "border-white/15"
                      }`}
                      style={{ backgroundColor: (task.isLocked && !expandedBgColor) ? (cardStyling.expandedBg || "rgba(0, 0, 0, 0.2)") : (expandedBgColor || "#152E21") }}
                    >
                      <div className="flex items-start justify-between">
                        {/* Circular Progress Ring with icon inside, countdown numbers below */}
                        <div
                          className="flex flex-col items-center cursor-pointer group/circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDurationTimer();
                          }}
                          title={task.isInProgress ? "Click to Pause Countdown" : "Click to Start Countdown & Lock Task"}
                        >
                          <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 transition-transform group-hover/circle:scale-105 active:scale-95">
                            <svg className="w-11 h-11 sm:w-12 sm:h-12 -rotate-90" viewBox="0 0 48 48">
                              <circle cx="24" cy="24" r="19" stroke="rgba(255,255,255,0.15)" strokeWidth="4" fill="none" />
                              <circle
                                cx="24"
                                cy="24"
                                r="19"
                                stroke="#FAF3E0"
                                strokeWidth="4"
                                strokeDasharray={119.38}
                                strokeDashoffset={
                                  119.38 * (1 - (task.isInProgress || (task.accumulatedElapsedMs && task.accumulatedElapsedMs > 0)
                                    ? remainingSecs / Math.max(1, durationMins * 60)
                                    : 0.75))
                                }
                                strokeLinecap="round"
                                fill="none"
                                className="transition-all duration-300"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[#FAF3E0]">
                              {task.isInProgress ? (
                                <Pause size={14} strokeWidth={2.5} className="animate-pulse" />
                              ) : (
                                <Play size={14} fill="currentColor" className="ml-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Timer Countdown OUTSIDE of the circle and BELOW the circle */}
                          <span className="font-mono font-bold text-[11px] sm:text-xs text-white block text-center mt-1">
                            {task.isInProgress || (task.accumulatedElapsedMs && task.accumulatedElapsedMs > 0)
                              ? formatCountdown(remainingSecs)
                              : (durationMins >= 60 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 ? (durationMins % 60) + 'm' : ''}`.trim() : `${durationMins}m`)}
                          </span>
                        </div>

                        {/* Right Column: Start/Pause Action Button Pill & Target Icon */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={handleToggleDurationTimer}
                            className={`px-2.5 sm:px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border shadow-2xs active:scale-95 ${
                              task.isInProgress
                                ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
                                : "bg-white/15 hover:bg-white/25 border-white/25 text-[#FAF3E0]"
                            }`}
                            title={task.isInProgress ? "Pause Countdown Timer" : "Start Countdown Timer & Lock Task"}
                          >
                            {task.isInProgress ? (
                              <>
                                <Pause size={10} strokeWidth={2.5} />
                                <span>PAUSE</span>
                              </>
                            ) : (
                              <>
                                <Play size={10} fill="currentColor" />
                                <span>START</span>
                              </>
                            )}
                          </button>

                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white/30 flex items-center justify-center text-[#FAF3E0] shrink-0 opacity-80">
                            <Target size={13} strokeWidth={2.2} />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: sessionText + Stepper Pill "- 5m +" */}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/15 gap-1">
                        <span className="text-[10px] sm:text-[11px] font-semibold text-white/85 truncate">
                          {sessionText}
                        </span>

                        <div
                          className="flex items-center gap-0.5 sm:gap-1 border border-white/35 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white bg-white/5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleAdjustDuration(-5)}
                            className="hover:text-[#FAF3E0] cursor-pointer px-1 active:scale-90 transition-transform"
                            title="Subtract 5 mins"
                          >
                            −
                          </button>
                          <span className="text-[9px] sm:text-[9.5px] font-mono px-0.5 text-[#FAF3E0]">5m</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustDuration(5)}
                            className="hover:text-[#FAF3E0] cursor-pointer px-1 active:scale-90 transition-transform"
                            title="Add 5 mins"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* COLLABORATOR ACTION CARD */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === "collaborator" ? null : "collaborator");
                      }}
                      className="relative p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between text-center cursor-pointer hover:border-white/40 transition-all shadow-inner border border-white/15 group min-h-[115px] sm:min-h-[120px]"
                      style={{ backgroundColor: (task.isLocked && !expandedBgColor) ? (cardStyling.expandedBg || "rgba(0, 0, 0, 0.2)") : (expandedBgColor || "#152E21") }}
                    >
                      <div className="w-full flex items-center justify-between border-b border-white/15 pb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                          Collaborator
                        </span>
                      </div>

                      <div className="w-full flex-1 flex items-center justify-center px-1 py-1">
                        <span
                          className="text-xs sm:text-sm font-bold text-center tracking-tight truncate max-w-full"
                          style={{ color: fontColor || "#FFFFFF" }}
                        >
                          {task.collaborator && task.collaborator.trim()
                            ? task.collaborator.trim()
                            : "No Collaborator"}
                        </span>
                      </div>

                      <div className="w-full flex justify-center mt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveDropdown(activeDropdown === "collaborator" ? null : "collaborator")}
                          className="px-3 sm:px-3.5 py-0.5 sm:py-1 rounded-full border border-white/40 hover:bg-white/15 text-[10px] font-black uppercase tracking-wider text-[#FAF3E0] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs"
                        >
                          <span>{task.collaborator ? "Change" : "Assign"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: SUBTASKS ACTION CARD */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("medium");
                      setIsSubtaskWindowOpen(true);
                    }}
                    className="relative p-3 sm:p-4 rounded-2xl flex flex-col justify-between shadow-inner border border-white/15 min-h-[105px] hover:border-white/40 transition-all cursor-pointer group mb-3 sm:my-3.5"
                    style={{ backgroundColor: (task.isLocked && !expandedBgColor) ? (cardStyling.expandedBg || "rgba(0, 0, 0, 0.2)") : (expandedBgColor || "#152E21") }}
                  >
                      <div className="flex items-center justify-between pb-1 border-b border-white/15">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                          Subtasks
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/10 text-[#FAF3E0] border border-white/15">
                          {subtasks.filter((s) => s.completed).length} / {subtasks.length}
                        </span>
                      </div>

                      {/* Subtask Preview List */}
                      <div className="my-auto py-1 space-y-1">
                        {subtasks.length === 0 ? (
                          <div className="text-center py-1">
                            <p className="text-[11px] text-white/60 font-semibold">No subtasks</p>
                            <p className="text-[9.5px] text-[#FAF3E0] font-bold mt-0.5">+ Tap to manage</p>
                          </div>
                        ) : (
                          subtasks.slice(0, 2).map((st) => (
                            <div
                              key={st.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSubtaskItem(st.id);
                              }}
                              className="flex items-center gap-1.5 p-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  st.completed
                                    ? "bg-[#2D6A4F] border-white text-white"
                                    : "border-white/50 bg-white/5 hover:border-white"
                                }`}
                              >
                                {st.completed && <Check size={9.5} strokeWidth={3} />}
                              </span>
                              <span
                                className={`text-[11px] font-medium truncate flex-1 ${
                                  st.completed ? "line-through text-white/50" : "text-white"
                                }`}
                              >
                                {st.title}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="w-full flex justify-center mt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic("medium");
                            setIsSubtaskWindowOpen(true);
                          }}
                          className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FAF3E0] hover:bg-white text-[#1C3B2B] flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                          title="Open subtask window in center of screen"
                        >
                          <Plus size={10} strokeWidth={3} />
                          <span>Manage Subtasks</span>
                        </button>
                      </div>
                    </div>

              {/* BOTTOM SECTION: ACTION CARD TITLED WITH CORRESPONDING LOCATION DATAPOINT & MAP */}
              <div className="relative rounded-2xl overflow-hidden border border-[#2D5A40] h-32 sm:h-36 shadow-inner group/map">
                {/* Embedded Google Map */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <iframe
                    key={locationTitle}
                    title={`Google Map for ${locationTitle}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(locationTitle)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                    className="w-[110%] h-[110%] -m-[5%] border-0 opacity-85 scale-105 filter brightness-95 contrast-105"
                    loading="lazy"
                    tabIndex={-1}
                  />
                </div>

                {/* Map Click-through to Google Directions */}
                <a
                  href={getGoogleMapsDirectionsUrl(locationTitle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-10 cursor-pointer"
                  title={`Open directions to "${locationTitle}" in Google Maps`}
                />

                {/* Top Overlays on Map: Action Card Title (Location Datapoint) + EDIT ∨ Button */}
                <div className="relative z-20 p-2.5 flex items-center justify-between pointer-events-auto">
                  {/* Action Card Title Pill (Titled as the corresponding datapoint: Location) */}
                  <div className="px-3 py-1 rounded-full bg-[#FAF3E0] text-[#1C3B2B] font-bold text-xs flex items-center gap-1.5 shadow-md">
                    <MapPin size={12} className="text-[#1C3B2B] shrink-0" />
                    <span className="truncate max-w-[170px] sm:max-w-[260px]">{locationTitle}</span>
                  </div>

                  {/* EDIT ∨ Solid Cream Pill Button with Dark Text */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(activeDropdown === "location" ? null : "location")}
                      className="px-3.5 py-1 rounded-full bg-[#FAF3E0] hover:bg-white text-[#1C3B2B] text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                      title="Edit Location"
                    >
                      <span>EDIT</span>
                      <ChevronDown size={11} strokeWidth={3} className="text-[#1C3B2B]" />
                    </button>
                  </div>
                </div>

                {/* Center Pin Marker overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C3B2B]/95 text-white shadow-xl border border-white/30 backdrop-blur-xs">
                    <MapPin size={13} className="text-red-400 fill-red-400 shrink-0" />
                    <span className="text-xs font-bold truncate max-w-[200px]">{locationTitle}</span>
                    <ExternalLink size={10} className="text-white/60 shrink-0" />
                  </div>
                </div>

                {/* Map Brand / Watermark at bottom left */}
                <div className="absolute bottom-1.5 left-2.5 z-20 pointer-events-none">
                  <span className="text-[9.5px] font-bold text-white/80 drop-shadow-md">
                    Google Maps • {locationTitle}
                  </span>
                </div>
              </div>

              {/* BOTTOM QUICK ACTIONS: Send to Saved / Send to Tomorrow */}
              {!task.completed && (
                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveDropdown("category")}
                      className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Select Category"
                    >
                      <Tag size={10} />
                      <span>{task.category || "Category"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown("priority")}
                      className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 text-[10px] font-bold capitalize flex items-center gap-1 cursor-pointer transition-colors"
                      title="Select Priority"
                    >
                      <Flag size={10} />
                      <span>{task.priority && task.priority !== "none" ? task.priority : "Priority"}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {isBacklog ? (
                      onMoveToCurrentDay && (
                        <button
                          type="button"
                          onClick={() => onMoveToCurrentDay(task)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF3E0] text-[#1C3B2B] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm hover:bg-white active:scale-95 cursor-pointer"
                          title="Move task to selected day"
                        >
                          <Calendar size={11} />
                          <span>Move to Day</span>
                        </button>
                      )
                    ) : (
                      <>
                        {onMoveToBacklog && (
                          <button
                            type="button"
                            onClick={() => onMoveToBacklog(task)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title="Move to Saved Backlog"
                          >
                            <FolderClosed size={11} />
                            <span>Save</span>
                          </button>
                        )}
                        {onMoveToNextDay && (
                          <button
                            type="button"
                            onClick={() => onMoveToNextDay(task)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title="Move to Tomorrow"
                          >
                            <Calendar size={11} />
                            <span>Tomorrow</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subtask Window Modal (Opens in center of screen) */}
      <SubtaskWindowModal
        isOpen={isSubtaskWindowOpen}
        onClose={() => setIsSubtaskWindowOpen(false)}
        taskTitle={task.title}
        subtasks={subtasks}
        onAddSubtask={handleModalAddSubtask}
        onToggleSubtask={handleToggleSubtaskItem}
        onDeleteSubtask={handleDeleteSubtaskItem}
        onUpdateSubtaskTitle={handleModalUpdateTitle}
        onUpdateSubtaskPriority={handleUpdateSubtaskPriority}
        onReorderSubtasks={handleReorderSubtasksList}
      />

      {/* Centered Pull-Down Choice Window Modal (Location, Collaborator, Category, Priority) */}
      {renderPulldownWindowModal()}

      {/* Location Explorer Modal */}
      {isLocationChoicesModalOpen && (
        <LocationChoicesModal
          isOpen={isLocationChoicesModalOpen}
          onClose={() => setIsLocationChoicesModalOpen(false)}
          currentLocation={task.location || ""}
          onSelectLocation={(newLoc) => {
            handleSelectLocation(newLoc);
            setIsLocationChoicesModalOpen(false);
          }}
          favoriteLocations={favoriteLocations}
          onAddFavoriteLocation={onAddFavoriteLocation}
        />
      )}
    </motion.div>
  );
};

export default TaskDeckCard;
