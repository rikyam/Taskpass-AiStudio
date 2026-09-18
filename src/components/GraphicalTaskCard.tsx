import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Trash2,
  Edit3,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Menu,
  Brain,
  FileText,
  Bot,
  Sliders,
  CalendarDays,
  CalendarCheck,
  ListTodo,
  X,
  Navigation,
  Car,
  Coffee,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Lock,
  Unlock,
  Building,
  Home,
  Pencil,
  Target,
  Undo,
  Database,
  Save,
} from "lucide-react";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { Task, Subtask } from "../types";
import { openGoogleMapsNavigation, getGoogleMapsDirectionsUrl } from "./InteractiveAppHelpers";
import { formatDate, formatTime, timeToMinutes, minutesToTimeString } from "../utils/timeHelpers";
import { SubtaskWindowModal } from "./SubtaskWindowModal";
import { LocationChoicesModal } from "./LocationChoicesModal";
import {
  getStoredHomeLocation,
  setStoredHomeLocation,
  getStoredWorkLocation,
  setStoredWorkLocation,
} from "../utils/locationStorage";

export interface CollaboratorInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
  color: string;
}

export interface GraphicalTaskCardProps {
  task: Task;
  isStarted: boolean;
  remainingSecs: number;
  totalSecs?: number;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onStopTimer?: () => void;
  onResetTimer?: () => void;
  onToggleComplete: () => void;
  onDeleteTask: () => void;
  onEditTask: () => void;
  onPrevTask?: () => void;
  onNextTask?: () => void;
  currentIndex?: number;
  totalCount?: number;
  allCollaborators?: string[];
  onToggleSubtask?: (subtaskId: string) => void;
  onAddSubtask?: (title: string) => void;
  onSelectCollaborator?: (name: string) => void;
  onAddCollaborator?: (name: string) => void;
  onRenameCollaborator?: (oldVal: string, newVal: string) => void;
  onDeleteCollaborator?: (val: string) => void;
  onOpenManageCollaborators?: () => void;
  favoriteLocations?: string[];
  onUpdateFavoriteLocations?: (locations: string[]) => void;
  onAddFavoriteLocation?: (location: string) => void;
  onOpenLocation?: (location: string) => void;
  onSelectPresetDuration?: (minutes: number) => void;
  onOpenHamburger?: () => void;
  isFullScreen?: boolean;
  focusCardWholeBoxActivation?: boolean;

  // Date navigation controls
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onToday?: () => void;

  // Quick actions from hamburger menu
  onAddTask?: () => void;
  onDeployRoutine?: () => void;
  onSequenceBrainstorm?: () => void;
  onQuickNote?: () => void;
  onOpenChatbot?: () => void;
  onOpenBulkPrioritize?: () => void;

  // Update task attributes
  onUpdateTask?: (updatedFields: Partial<Task>) => void;
  onToggleLock?: () => void;
  animationDirection?: "forward" | "backward";
  dailyTasks?: Task[];
  onSelectTask?: (task: Task) => void;
  isChatbotOpen?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  onToggleNarrativeMode?: () => void;
  triggerHaptic?: (type: string) => void;
}

// Curated avatar palettes for warm aesthetic
const AVATAR_COLORS = [
  "from-amber-400 to-orange-500",
  "from-rose-400 to-red-500",
  "from-emerald-400 to-teal-500",
  "from-indigo-400 to-blue-500",
  "from-purple-400 to-pink-500",
  "from-yellow-400 to-amber-600",
];

const PRESET_CATEGORIES = [
  "Work",
  "Meeting",
  "Personal",
  "Study",
  "Creative",
  "Health",
  "Finance",
  "General",
  "Research",
  "Admin"
];

const PRESET_DURATIONS = [10, 15, 25, 45, 60, 90];

const PRESET_LOCATIONS = [
  "Office / Headquarters",
  "Home Office",
  "Meeting Room 1",
  "Remote / Zoom",
  "Coffee Shop",
  "Client Site"
];

const ROUTINE_PRESETS = [
  { name: "Morning Kickoff Sprint", desc: "4 steps • 15 min rapid alignment" },
  { name: "Deep Focus Flow", desc: "5 steps • 45 min uninterrupted focus" },
  { name: "Meeting Follow-up & Actions", desc: "3 steps • 20 min stakeholder wrap" },
  { name: "End-of-Day Review & Wrap", desc: "4 steps • 15 min daily closeout" },
];

const BRAINSTORM_MODES = [
  { label: "Deconstruct into 3 Subtasks", desc: "Automated breakdown into actionable milestones" },
  { label: "Estimate Time & Dependencies", desc: "Predict timeline and cross-functional blockers" },
  { label: "Identify Risks & Blockers", desc: "Proactive bottleneck and prerequisite analysis" },
  { label: "Generate Creative Approaches", desc: "Alternative strategies and outside-the-box angles" },
];

const NOTE_TEMPLATES = [
  { label: "Action Item / Decision", text: "Key decision: " },
  { label: "Blocker / Dependency", text: "Blocker: waiting on " },
  { label: "Meeting Notes", text: "Meeting notes: " },
  { label: "Reference Links & Docs", text: "Reference links: " },
];

const AI_PROMPT_PRESETS = [
  { label: "Plan & Structure Task", query: "Summarize task and suggest step-by-step plan" },
  { label: "Draft Team Update", query: "Draft a message update to collaborators" },
  { label: "Duration & Scheduling", query: "Analyze optimal duration and schedule slot" },
  { label: "Find Key Best Practices", query: "Find best practices and key references" },
];

const COMMON_SUBTASK_PRESETS = [
  "Define core deliverables",
  "Draft initial implementation",
  "Review with team / collaborator",
  "Run verification & tests",
  "Send follow-up summary",
];

const ADD_TASK_PRESETS = [
  { label: "Deep Focus Session", desc: "45 min solo deep work" },
  { label: "Client / Team Sync", desc: "30 min stakeholder meeting" },
  { label: "Quick Triage & Polish", desc: "15 min rapid actions" },
  { label: "Review Deliverables", desc: "20 min quality verification" },
];

type DropdownType =
  | "priority"
  | "category"
  | "duration"
  | "collaborator"
  | "datePicker"
  | "timePicker"
  | "location"
  | "buffer"
  | "routine"
  | "brainstorm"
  | "note"
  | "assistant"
  | "subtaskPreset"
  | "addTaskPreset"
  | null;

export const GraphicalTaskCard: React.FC<GraphicalTaskCardProps> = ({
  task,
  isStarted,
  remainingSecs,
  totalSecs,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onResetTimer,
  onToggleComplete,
  onDeleteTask,
  onEditTask,
  onPrevTask,
  onNextTask,
  currentIndex = 0,
  totalCount = 1,
  allCollaborators = [],
  onToggleSubtask,
  onAddSubtask,
  onSelectCollaborator,
  onAddCollaborator,
  onRenameCollaborator,
  onDeleteCollaborator,
  onOpenManageCollaborators,
  favoriteLocations = [],
  onUpdateFavoriteLocations,
  onAddFavoriteLocation,
  onOpenLocation,
  onSelectPresetDuration,
  onOpenHamburger,
  isFullScreen = true,
  focusCardWholeBoxActivation = false,
  selectedDate,
  onSelectDate,
  onPrevDay,
  onNextDay,
  onToday,
  onAddTask,
  onDeployRoutine,
  onSequenceBrainstorm,
  onQuickNote,
  onOpenChatbot,
  onOpenBulkPrioritize,
  onUpdateTask,
  onToggleLock,
  animationDirection = "forward",
  dailyTasks = [],
  onSelectTask,
  isChatbotOpen = false,
  onUndo,
  canUndo = false,
  onToggleNarrativeMode,
  triggerHaptic = () => {},
}) => {
  const graphicsActiveWindowBg = useAppStore((state) => state.graphicsActiveWindowBg);
  const graphicsActionBoxBg = useAppStore((state) => state.graphicsActionBoxBg);
  const graphicsActionBoxFontColor = useAppStore((state) => state.graphicsActionBoxFontColor);
  const graphicsTaskTitleFontSize = useAppStore((state) => state.graphicsTaskTitleFontSize);
  const graphicsTimeFontSize = useAppStore((state) => state.graphicsTimeFontSize);
  const updateTask = useAppStore((state) => state.updateTask);

  const formattedCardDate = useMemo(() => {
    if (!selectedDate) return "Today";
    try {
      const parts = selectedDate.split("-").map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      // ignore
    }
    return formatDate(selectedDate);
  }, [selectedDate]);

  const [dropdownNewCollab, setDropdownNewCollab] = useState("");
  const [editingCollabKey, setEditingCollabKey] = useState<string | null>(null);
  const [editingCollabValue, setEditingCollabValue] = useState("");
  const [deletingCollabKey, setDeletingCollabKey] = useState<string | null>(null);

  const handleUpdateTask = (updates: Partial<Task>) => {
    if (onUpdateTask) {
      onUpdateTask(updates);
    }
    if (task.id) {
      updateTask(task.id, updates);
    }
  };

  const handleToggleLock = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onToggleLock) {
      onToggleLock();
    } else if (onUpdateTask) {
      onUpdateTask({ isLocked: !task.isLocked });
    }
  };
  const isWholeBoxActivation = focusCardWholeBoxActivation ?? (() => {
    try {
      return localStorage.getItem("focus_card_whole_box_activation") === "true";
    } catch {
      return false;
    }
  })();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isSubtaskExpanded, setIsSubtaskExpanded] = useState(false);
  const [isSubtaskWindowOpen, setIsSubtaskWindowOpen] = useState(false);
  const [isLocationChoicesModalOpen, setIsLocationChoicesModalOpen] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState<string>("");
  const [localTimerSecs, setLocalTimerSecs] = useState<number>(25 * 60);
  const [isLocalRunning, setIsLocalRunning] = useState<boolean>(false);
  const recentlyCompletedTaskId = useAppStore((state) => state.recentlyCompletedTaskId);
  const [localSuccessToggled, setLocalSuccessToggled] = useState(false);
  const isRecentlyCompleted = recentlyCompletedTaskId === task.id || localSuccessToggled;

  const collaboratorValue = (task.collaborator && task.collaborator !== "None" ? task.collaborator : task.attendees) || "";

  const hasRealLocation = useMemo(() => {
    if (!task.location) return false;
    const trimmed = task.location.trim().toLowerCase();
    return trimmed.length > 0 && trimmed !== "no location" && !trimmed.includes("no specified location");
  }, [task.location]);

  // Google Maps queried location & driving directions
  const queryLocation = useMemo(() => {
    if (hasRealLocation) {
      return task.location!.trim();
    }
    return "San Francisco, CA";
  }, [task.location, hasRealLocation]);

  const drivingDirectionsUrl = useMemo(() => {
    const dest = hasRealLocation ? task.location!.trim() : "San Francisco, CA";
    return getGoogleMapsDirectionsUrl(dest) || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }, [task.location, hasRealLocation]);

  const handleOpenDirections = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dest = hasRealLocation ? task.location!.trim() : "";
    if (dest) {
      openGoogleMapsNavigation(dest);
      if (onOpenLocation) {
        onOpenLocation(dest);
      }
    } else {
      setIsLocationChoicesModalOpen(true);
    }
  };

  // Pull-down dropdown state
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [customCollabInput, setCustomCollabInput] = useState("");
  const [customLocationInput, setCustomLocationInput] = useState(task.location || "");
  const [editDateInput, setEditDateInput] = useState(task.date || "");
  const [editTimeInput, setEditTimeInput] = useState(task.time || "09:00");
  const datePickerRef = useRef<HTMLInputElement>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('[data-pulldown-window="true"]')) {
        return;
      }
      if (!target.closest(".pulldown-container") && !target.closest(".pulldown-trigger")) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener("mousedown", handleGlobalClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdown]);

  // Duration in minutes
  const taskDurationMins = useMemo(() => {
    const d = parseInt(task.duration || "25", 10);
    return isNaN(d) || d <= 0 ? 25 : d;
  }, [task.duration]);

  // Keep local timer synced when task duration changes
  useEffect(() => {
    if (!isStarted && !isLocalRunning) {
      setLocalTimerSecs(taskDurationMins * 60);
    }
  }, [taskDurationMins, isStarted, isLocalRunning]);

  const effectiveTotalSecs = totalSecs || taskDurationMins * 60;
  const displaySecs = isStarted ? remainingSecs : (isLocalRunning ? localTimerSecs : (remainingSecs > 0 ? remainingSecs : taskDurationMins * 60));

  // Local fallback timer
  useEffect(() => {
    let interval: any = null;
    if (isLocalRunning && !isStarted) {
      interval = setInterval(() => {
        setLocalTimerSecs((prev) => {
          if (prev <= 1) {
            setIsLocalRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocalRunning, isStarted]);

  // Format time readout (MM:SS)
  const formatTimerSecs = (seconds: number) => {
    const safeSecs = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSecs / 60);
    const secs = safeSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Format hours, minutes, and seconds countdown (HH:MM:SS)
  const formatHoursMinutesSeconds = (seconds: number) => {
    const safeSecs = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(safeSecs / 3600);
    const mins = Math.floor((safeSecs % 3600) / 60);
    const secs = safeSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Circular progress calculation for 50% size ring
  const progressRatio = useMemo(() => {
    if (effectiveTotalSecs <= 0) return 0;
    const elapsed = effectiveTotalSecs - displaySecs;
    return Math.min(1, Math.max(0, elapsed / effectiveTotalSecs));
  }, [effectiveTotalSecs, displaySecs]);

  // 50% compact radius (was 58, now 24)
  const circleRadius = 24;
  const strokeWidth = 4.5;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Priority styling and labels
  const priorityConfig = useMemo(() => {
    const p = (task.priority || "none").toLowerCase();
    switch (p) {
      case "high":
        return { label: "High Priority", bg: "bg-[#C53030]", text: "text-white", border: "border-[#9B2C2C]" };
      case "medium":
        return { label: "Medium Priority", bg: "bg-[#DD6B20]", text: "text-white", border: "border-[#C05621]" };
      case "low":
        return { label: "Low Priority", bg: "bg-[#3182CE]", text: "text-white", border: "border-[#2B6CB0]" };
      default:
        return { label: "Priority: Normal", bg: "bg-[#FAF3E0]", text: "text-[#594B3E]", border: "border-[#EADDC7]" };
    }
  }, [task.priority]);

  // Formatted date and time strings (mm/dd/yy and am/pm)
  const formattedDateTime = useMemo(() => {
    const datePart = formatDate(task.date || selectedDate);
    const timePart = formatTime(task.computedTime || task.time || "09:00");
    return `${datePart}, ${timePart}`;
  }, [task.date, task.time, task.computedTime, selectedDate]);

  // Compute end time string and formatted duration text for graphics mode
  const taskEndFormatted = useMemo(() => {
    const rawTime = task.computedTime || task.time || "09:00";
    const startMins = timeToMinutes(rawTime);
    const endMins = (startMins + taskDurationMins) % 1440;
    const endStr = minutesToTimeString(endMins);
    return formatTime(endStr);
  }, [task.time, task.computedTime, taskDurationMins]);

  const durationText = useMemo(() => {
    const hours = Math.floor(taskDurationMins / 60);
    const mins = taskDurationMins % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${String(mins).padStart(2, "0")} min`;
    if (hours > 0) return `${hours}h 00 min`;
    return `${mins}m`;
  }, [taskDurationMins]);

  // Daily Tasks list for the day
  const displayDailyTasks = useMemo(() => {
    if (Array.isArray(dailyTasks) && dailyTasks.length > 0) {
      return dailyTasks.filter((t) => !t.isBuffer);
    }
    return [task];
  }, [dailyTasks, task]);

  // Subtasks list - directly pulled from task.subtasks (from canonical text mode tasks)
  const subtasks: Subtask[] = useMemo(() => {
    if (Array.isArray(task.subtasks)) {
      return task.subtasks;
    }
    return [];
  }, [task.subtasks]);

  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  // Collaborators with mock avatars
  const collaboratorsList: CollaboratorInfo[] = useMemo(() => {
    const unique = new Set<string>();
    if (task.collaborator && task.collaborator !== "None" && task.collaborator.trim() !== "") {
      unique.add(task.collaborator.trim());
    }
    allCollaborators.forEach((c) => {
      if (c && c !== "None" && c.trim() !== "") unique.add(c.trim());
    });
    if (unique.size === 0) {
      unique.add("Self");
    }

    return Array.from(unique).map((name, idx) => {
      const parts = name.split(" ");
      const initials = parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      return {
        id: `collab-${idx}`,
        name,
        initials,
        color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      };
    });
  }, [task.collaborator, allCollaborators]);

  // Subtask addition handler
  const handleSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    if (onAddSubtask) {
      onAddSubtask(newSubtaskTitle.trim());
    } else if (onUpdateTask) {
      const newSub: Subtask = {
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      };
      onUpdateTask({
        subtasks: [...subtasks, newSub],
      });
    }
    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
  };

  const handleToggleSubtaskItem = (id: string) => {
    if (onToggleSubtask) {
      onToggleSubtask(id);
    } else if (onUpdateTask) {
      onUpdateTask({
        subtasks: subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),
      });
    }
  };

  const handleDeleteSubtaskItem = (id: string) => {
    if (onUpdateTask) {
      onUpdateTask({
        subtasks: subtasks.filter((s) => s.id !== id),
      });
    }
  };

  const handleReorderSubtaskItem = (idx: number, direction: "up" | "down") => {
    if (!onUpdateTask) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= subtasks.length) return;
    const updated = [...subtasks];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    onUpdateTask({ subtasks: updated });
  };

  const handleSaveSubtaskTitle = (id: string) => {
    if (!editingSubtaskTitle.trim() || !onUpdateTask) {
      setEditingSubtaskId(null);
      return;
    }
    onUpdateTask({
      subtasks: subtasks.map((s) => (s.id === id ? { ...s, title: editingSubtaskTitle.trim() } : s)),
    });
    setEditingSubtaskId(null);
  };

  const handleUpdateSubtaskPriority = (id: string, priority: "high" | "medium" | "low" | undefined) => {
    if (!onUpdateTask) return;
    onUpdateTask({
      subtasks: subtasks.map((s) => (s.id === id ? { ...s, priority } : s)),
    });
  };

  const handleReorderSubtasksList = (newSubtasks: Subtask[]) => {
    if (!onUpdateTask) return;
    onUpdateTask({
      subtasks: newSubtasks,
    });
  };

  const handleModalAddSubtask = (title: string, priority?: "high" | "medium" | "low") => {
    if (!title.trim()) return;
    const newSub: Subtask = {
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      completed: false,
      priority,
    };
    if (onUpdateTask) {
      onUpdateTask({
        subtasks: [...subtasks, newSub],
      });
    } else if (onAddSubtask) {
      onAddSubtask(title.trim());
    }
  };

  const handleModalUpdateTitle = (id: string, newTitle: string) => {
    if (!onUpdateTask || !newTitle.trim()) return;
    onUpdateTask({
      subtasks: subtasks.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s)),
    });
  };

  // Timer controls
  const handleToggleTimer = () => {
    if (isStarted) {
      onPauseTimer();
    } else if (isLocalRunning) {
      setIsLocalRunning(false);
    } else {
      // Lock task in place and set duration when activating timer
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${hh}:${mm}`;

      if (onUpdateTask) {
        onUpdateTask({
          isLocked: true,
          time: currentTimeStr,
          computedTime: currentTimeStr,
          duration: String(taskDurationMins),
        });
      }

      if (onStartTimer) {
        onStartTimer();
      }
      setIsLocalRunning(true);
    }
  };

  const handleStopOrReset = () => {
    if (isStarted) {
      if (onStopTimer) onStopTimer();
      else if (onResetTimer) onResetTimer();
    }
    setIsLocalRunning(false);
    setLocalTimerSecs(taskDurationMins * 60);
  };

  // Pull-down toggle helper
  const toggleDropdown = (type: DropdownType) => {
    setActiveDropdown((prev) => (prev === type ? null : type));
  };

  // Pull-down selection handlers
  const handleSelectPriority = (p: string) => {
    if (onUpdateTask) {
      onUpdateTask({ priority: p as any });
    }
    setActiveDropdown(null);
  };

  const handleSelectCategory = (c: string) => {
    if (onUpdateTask) {
      onUpdateTask({ category: c });
    }
    setActiveDropdown(null);
  };

  const handleSelectDuration = (mins: number) => {
    if (onSelectPresetDuration) {
      onSelectPresetDuration(mins);
    }
    if (onUpdateTask) {
      onUpdateTask({ duration: String(mins) });
    }
    setLocalTimerSecs(mins * 60);
    if (isLocalRunning) {
      setIsLocalRunning(false);
    }
    setActiveDropdown(null);
  };

  const handleAdjustDuration = (deltaMins: number) => {
    const newMins = Math.max(5, Math.min(240, taskDurationMins + deltaMins));
    handleSelectDuration(newMins);
  };

  const handleSelectCollab = (name: string) => {
    const val = name === "None" ? "" : name;
    if (onSelectCollaborator) {
      onSelectCollaborator(val);
    }
    if (onUpdateTask) {
      onUpdateTask({ collaborator: val, attendees: val });
    }
    setActiveDropdown(null);
  };

  const handleAddCollab = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      if (onAddCollaborator) {
        onAddCollaborator(trimmed);
      }
      handleSelectCollab(trimmed);
      setCustomCollabInput("");
    }
  };

  const handleSelectLocation = (loc: string) => {
    // Note: Do not initiate driving directions when editing/selecting the location!
    if (onUpdateTask) {
      onUpdateTask({ location: loc });
    }
    setActiveDropdown(null);
    setIsLocationChoicesModalOpen(false);
  };

  const handleAddLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (trimmed) {
      if (onAddFavoriteLocation) {
        onAddFavoriteLocation(trimmed);
      }
      handleSelectLocation(trimmed);
      setCustomLocationInput("");
    }
  };

  const handleSaveHomeLocation = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = editHomeInput.trim();
    if (trimmed) {
      setStoredHomeLocation(trimmed);
      setHomeLocation(trimmed);
    }
    setIsEditingHome(false);
  };

  const handleSaveWorkLocation = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = editWorkInput.trim();
    if (trimmed) {
      setStoredWorkLocation(trimmed);
      setWorkLocation(trimmed);
    }
    setIsEditingWork(false);
  };

  const handleSaveDateTime = () => {
    if (onUpdateTask) {
      onUpdateTask({
        date: editDateInput || task.date,
        time: editTimeInput || task.time,
      });
    }
    setActiveDropdown(null);
  };

  // Date formatted display for top bar (mm/dd/yy)
  const formattedSelectedDate = useMemo(() => {
    return formatDate(selectedDate || "");
  }, [selectedDate]);

  const isSelectedDateToday = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return selectedDate === today;
  }, [selectedDate]);

  // Due date tag (Due mm/dd/yy)
  const dueTagText = useMemo(() => {
    if (!task.date) return "Due Today";
    const today = new Date().toISOString().split("T")[0];
    if (task.date === today) return "Due Today";
    return `Due ${formatDate(task.date)}`;
  }, [task.date]);

  const [noteDraft, setNoteDraft] = useState(task.notes || "");
  useEffect(() => {
    setNoteDraft(task.notes || "");
  }, [task.notes]);

  const handleSaveNoteDraft = (text: string) => {
    setNoteDraft(text);
    if (onUpdateTask) {
      onUpdateTask({ notes: text });
    }
  };

  const handleSelectAddTaskPreset = (_presetLabel: string) => {
    setActiveDropdown(null);
    if (onAddTask) {
      onAddTask();
    }
  };

  const handleSelectRoutinePreset = (_routineName: string) => {
    setActiveDropdown(null);
    if (onDeployRoutine) {
      onDeployRoutine();
    }
  };

  const handleSelectBrainstormMode = (_modeLabel: string) => {
    setActiveDropdown(null);
    if (onSequenceBrainstorm) {
      onSequenceBrainstorm();
    }
  };

  const handleAppendNoteTemplate = (templateText: string) => {
    const current = task.notes ? task.notes + "\n" + templateText : templateText;
    handleSaveNoteDraft(current);
    setActiveDropdown(null);
  };

  const handleAddPresetSubtask = (title: string) => {
    if (onAddSubtask) {
      onAddSubtask(title);
    } else if (onUpdateTask) {
      const newSub: Subtask = {
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title,
        completed: false,
      };
      onUpdateTask({
        subtasks: [...subtasks, newSub],
      });
    }
    setActiveDropdown(null);
  };

  const renderPulldownWindowModal = () => {
    if (!activeDropdown) return null;

    return createPortal(
      <div
        id="task-pulldown-modal-backdrop"
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150 text-left"
        onClick={() => setActiveDropdown(null)}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) {
            setActiveDropdown(null);
          }
        }}
      >
        <div
          id="pulldown-modal-window"
          data-pulldown-window="true"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col bg-[#FFF2DF] text-[#1F1A16] border-2 border-[#EADDC7] rounded-3xl p-5 shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 duration-150 relative text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADDC7]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] flex items-center justify-center shrink-0">
                {activeDropdown === "category" && <Target size={16} className="text-[#A25F37]" />}
                {activeDropdown === "timePicker" && <Clock size={16} className="text-[#A25F37]" />}
                {activeDropdown === "priority" && <AlertCircle size={16} className="text-[#A25F37]" />}
                {activeDropdown === "collaborator" && <Users size={16} className="text-[#A25F37]" />}
                {activeDropdown === "location" && <MapPin size={16} className="text-[#2D6A4F]" />}
                {activeDropdown === "buffer" && <Car size={16} className="text-[#2D6A4F]" />}
                {activeDropdown === "brainstorm" && <Brain size={16} className="text-[#6B46C1]" />}
                {activeDropdown === "note" && <FileText size={16} className="text-[#059669]" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#2D2319] truncate">
                  {activeDropdown === "category" && "Select Category"}
                  {activeDropdown === "timePicker" && "Start Time Editor (AM/PM)"}
                  {activeDropdown === "priority" && "Select Priority"}
                  {activeDropdown === "collaborator" && "Assign Collaborator"}
                  {activeDropdown === "location" && "Select Location"}
                  {activeDropdown === "buffer" && "Pre & Post Buffer Settings"}
                  {activeDropdown === "brainstorm" && "Brainstorm Modes"}
                  {activeDropdown === "note" && "Note Templates"}
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
            {/* 1. Category */}
            {activeDropdown === "category" && (
              <div className="space-y-1">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Preset Categories
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                        task.category === cat
                          ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0] shadow-2xs"
                          : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#594B3E] border-[#EADDC7]"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {task.category === cat && <Check size={13} className="text-[#2D6A4F] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. TimePicker */}
            {activeDropdown === "timePicker" && (
              <div className="space-y-3">
                <div className="space-y-1.5 p-3 rounded-2xl bg-[#FAF3E0] border border-[#EADDC7]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B5A4B]">
                      Hour & Minute
                    </label>
                    <span className="text-xs font-mono font-black text-[#2D6A4F] bg-white px-2 py-0.5 rounded-full border border-[#EADDC7]">
                      {formatTime(editTimeInput)}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={editTimeInput}
                    onChange={(e) => setEditTimeInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#C4B4A0] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#A25F37]"
                  />
                </div>

                {/* Quick hour presets */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#8C7A6B]">Quick Hour Presets</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["09:00", "11:00", "14:00", "16:30"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditTimeInput(t)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-mono font-extrabold border transition-all cursor-pointer text-center ${
                          editTimeInput === t
                            ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                            : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border-[#EADDC7]"
                        }`}
                      >
                        {formatTime(t)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateTask) onUpdateTask({ time: editTimeInput });
                    setActiveDropdown(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#1B4332] shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save size={13} />
                  <span>Save Start Time</span>
                </button>
              </div>
            )}

            {/* 3. Priority */}
            {activeDropdown === "priority" && (
              <div className="space-y-1.5">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Select Priority Level
                </div>
                <div className="space-y-1.5 pt-1">
                  {["high", "medium", "low", "none"].map((p) => {
                    const isSelected = (task.priority || "none") === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectPriority(p)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-black capitalize transition-all flex items-center justify-between cursor-pointer border ${
                          isSelected
                            ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0] shadow-xs"
                            : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#594B3E] border-[#EADDC7]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              p === "high"
                                ? "bg-rose-500"
                                : p === "medium"
                                ? "bg-amber-500"
                                : p === "low"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span>{p} Priority</span>
                        </div>
                        {isSelected && <Check size={14} className="text-[#2D6A4F]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Collaborator */}
            {activeDropdown === "collaborator" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  <span>Collaborators (Database)</span>
                  {onOpenManageCollaborators && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null);
                        onOpenManageCollaborators();
                      }}
                      className="text-[9px] text-[#2D6A4F] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      title="Open Full Database Manager"
                    >
                      <Database size={10} />
                      <span>Manage All</span>
                    </button>
                  )}
                </div>

                {/* Add New Collaborator to Database Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = dropdownNewCollab.trim();
                    if (trimmed && onAddCollaborator) {
                      onAddCollaborator(trimmed);
                      setDropdownNewCollab("");
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={dropdownNewCollab}
                    onChange={(e) => setDropdownNewCollab(e.target.value)}
                    placeholder="Add collaborator to DB..."
                    className="flex-1 h-8 px-2.5 rounded-xl bg-white border border-[#C4B4A0] text-[#2D2319] text-xs font-semibold placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#2D6A4F]"
                  />
                  <button
                    type="submit"
                    disabled={!dropdownNewCollab.trim()}
                    className="h-8 px-3 rounded-xl bg-[#2D6A4F] disabled:opacity-40 hover:bg-[#1B4332] text-white text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shadow-2xs shrink-0"
                  >
                    Add
                  </button>
                </form>

                {/* Collaborators list with Edit / Delete actions */}
                <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectCollab("None")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      !collaboratorValue || collaboratorValue === "None"
                        ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0]"
                        : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#786C60] border-[#EADDC7]"
                    }`}
                  >
                    <span>None (Unassigned)</span>
                    {(!collaboratorValue || collaboratorValue === "None") && <Check size={13} className="text-[#2D6A4F]" />}
                  </button>
                  {allCollaborators.map((name) => {
                    const isEditing = editingCollabKey === name;
                    const isDeleting = deletingCollabKey === name;

                    if (isEditing) {
                      return (
                        <div
                          key={name}
                          className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-[#2D6A4F] shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingCollabValue}
                            onChange={(e) => setEditingCollabValue(e.target.value)}
                            className="flex-1 h-7 px-2 text-xs font-bold text-[#2D2319] bg-transparent outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (editingCollabValue.trim() && editingCollabValue.trim() !== name && onRenameCollaborator) {
                                  onRenameCollaborator(name, editingCollabValue.trim());
                                }
                                setEditingCollabKey(null);
                              } else if (e.key === "Escape") {
                                setEditingCollabKey(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editingCollabValue.trim() && editingCollabValue.trim() !== name && onRenameCollaborator) {
                                onRenameCollaborator(name, editingCollabValue.trim());
                              }
                              setEditingCollabKey(null);
                            }}
                            className="p-1 rounded-lg bg-[#2D6A4F] text-white hover:bg-[#1B4332] cursor-pointer"
                            title="Save"
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCollabKey(null)}
                            className="p-1 rounded-lg bg-[#EADDC7] text-[#594B3E] hover:bg-[#D8C7AF] cursor-pointer"
                            title="Cancel"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    }

                    if (isDeleting) {
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-bold text-rose-700">Delete "{name}"?</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onDeleteCollaborator) {
                                  onDeleteCollaborator(name);
                                }
                                setDeletingCollabKey(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCollabKey(null)}
                              className="px-2 py-0.5 rounded bg-white border border-rose-200 text-slate-700 text-[9px] font-bold cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={name}
                        className={`group/collab w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                          collaboratorValue === name
                            ? "bg-[#EADDC7] text-[#2D2319] border-[#C4B4A0]"
                            : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#594B3E] border-[#EADDC7]"
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 truncate flex-1 cursor-pointer"
                          onClick={() => handleSelectCollab(name)}
                        >
                          <div className="w-5 h-5 rounded-full bg-[#EADDC7] text-[#2D2319] text-[9px] font-black flex items-center justify-center shrink-0">
                            {name.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="truncate">{name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {collaboratorValue === name && <Check size={13} className="text-[#2D6A4F] mr-1" />}
                          {onRenameCollaborator && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCollabKey(name);
                                setEditingCollabValue(name);
                                setDeletingCollabKey(null);
                              }}
                              className="opacity-60 hover:opacity-100 p-1 hover:bg-[#EADDC7] rounded text-[#594B3E] transition-opacity cursor-pointer"
                              title="Edit Collaborator Name"
                            >
                              <Edit3 size={11} />
                            </button>
                          )}
                          {onDeleteCollaborator && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingCollabKey(name);
                                setEditingCollabKey(null);
                              }}
                              className="opacity-60 hover:opacity-100 p-1 hover:bg-rose-100 rounded text-rose-600 transition-opacity cursor-pointer"
                              title="Delete from Database"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Location */}
            {activeDropdown === "location" && (
              <div className="space-y-3">
                {/* Default "no location" Option */}
                <div className="p-2.5 rounded-2xl bg-[#FFF9F0] border border-[#EADDC7]">
                  <button
                    type="button"
                    onClick={() => handleSelectLocation("no location")}
                    className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <MapPin size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-[#2D2319]">no location</span>
                          {(!task.location || task.location.trim().toLowerCase() === "no location") && (
                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-[#2D6A4F] text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#786C60] truncate">Default (no physical venue)</div>
                      </div>
                    </div>
                    {(!task.location || task.location.trim().toLowerCase() === "no location") && (
                      <Check size={14} className="text-[#2D6A4F] shrink-0" />
                    )}
                  </button>
                </div>

                {/* Primary Locations: Editable Home & Work */}
                <div className="space-y-2">
                  {/* Home */}
                  <div className="p-2.5 rounded-2xl bg-[#FFF9F0] border border-[#EADDC7]">
                    {isEditingHome ? (
                      <form onSubmit={handleSaveHomeLocation} className="space-y-2">
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
                            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-[#2D6A4F] text-white cursor-pointer flex items-center gap-1"
                          >
                            <Save size={11} />
                            <span>Save Home</span>
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
                      <form onSubmit={handleSaveWorkLocation} className="space-y-2">
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
                            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-[#2D6A4F] text-white cursor-pointer flex items-center gap-1"
                          >
                            <Save size={11} />
                            <span>Save Work</span>
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
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#8C7A6B]">
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
                    if (customLocationInput.trim()) {
                      handleAddLocation(customLocationInput.trim());
                    }
                  }}
                  className="space-y-1.5 pt-2 border-t border-[#EADDC7]"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customLocationInput}
                      onChange={(e) => setCustomLocationInput(e.target.value)}
                      placeholder="Add custom address..."
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#A25F37]"
                    />
                    <button
                      type="submit"
                      disabled={!customLocationInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase tracking-wider hover:bg-[#1B4332] disabled:opacity-40 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    setIsLocationChoicesModalOpen(true);
                  }}
                  className="w-full py-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[10px] font-black uppercase tracking-wider text-[#594B3E] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>Open Full Map Search</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}

            {/* 6. Buffer */}
            {activeDropdown === "buffer" && (
              <div className="space-y-3">
                {/* Pre-Task Buffer Section */}
                <div className="space-y-2 p-3 rounded-2xl bg-[#FAF3E0]/90 border border-[#EADDC7]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2D6A4F]" />
                      Pre-Task Buffer
                    </span>
                    <span className="text-xs font-mono font-black text-[#1F1A16] bg-white px-2 py-0.5 rounded-full border border-[#EADDC7]">
                      {task.travelBefore || 0}m
                    </span>
                  </div>

                  {/* Mode pills */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B] block mb-1">
                      Transit Mode
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Driving", "Transit", "Travel", "Walking", "Prep"].map((type) => {
                        const isSelected = (task.beforeBufferPurpose || "Driving").toLowerCase() === type.toLowerCase();
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleUpdateTask({ beforeBufferPurpose: type })}
                            className={`text-[9.5px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-2xs"
                                : "bg-white text-[#594B3E] border-[#EADDC7] hover:border-[#2D6A4F]"
                            }`}
                          >
                            {type === "Driving" && "🚗 "}
                            {type === "Transit" && "🚆 "}
                            {type === "Travel" && "✈️ "}
                            {type === "Walking" && "🚶 "}
                            {type === "Prep" && "📋 "}
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration Presets & Stepper */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B] block mb-1">
                      Duration (mins)
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[0, 5, 10, 15, 20, 30, 45].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleUpdateTask({ travelBefore: mins })}
                          className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            (task.travelBefore || 0) === mins
                              ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                              : "bg-white text-[#594B3E] border-[#EADDC7] hover:bg-[#FAF3E0]"
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto bg-white px-2 py-0.5 rounded-lg border border-[#EADDC7]">
                        <button
                          type="button"
                          onClick={() => handleUpdateTask({ travelBefore: Math.max(0, (task.travelBefore || 0) - 5) })}
                          className="text-xs font-black text-[#594B3E] hover:text-[#1F1A16] px-1 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-[10px] font-mono font-bold text-[#A25F37] px-0.5">5m</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateTask({ travelBefore: (task.travelBefore || 0) + 5 })}
                          className="text-xs font-black text-[#594B3E] hover:text-[#1F1A16] px-1 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Origin */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B] block mb-1">
                      Origin Location
                    </label>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {["Home", "Work", "Current Location"].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleUpdateTask({ travelBeforeLocation: loc })}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            task.travelBeforeLocation === loc
                              ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                              : "bg-white text-[#594B3E] border-[#EADDC7] hover:border-[#2D6A4F]"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#EADDC7]">
                      <MapPin size={11} className="text-[#2D6A4F] shrink-0" />
                      <input
                        type="text"
                        placeholder="Custom departure location..."
                        value={task.travelBeforeLocation || ""}
                        onChange={(e) => handleUpdateTask({ travelBeforeLocation: e.target.value })}
                        className="w-full text-xs font-medium text-[#2D2319] bg-transparent outline-none placeholder-[#8C7A6B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Post-Task Buffer Section */}
                <div className="space-y-2 p-3 rounded-2xl bg-[#FAF3E0]/90 border border-[#EADDC7]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#A25F37] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A25F37]" />
                      Post-Task Buffer
                    </span>
                    <span className="text-xs font-mono font-black text-[#1F1A16] bg-white px-2 py-0.5 rounded-full border border-[#EADDC7]">
                      {task.travelAfter || 0}m
                    </span>
                  </div>

                  {/* Mode pills */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B] block mb-1">
                      Transit Mode
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Driving", "Transit", "Travel", "Walking", "Wrap-up"].map((type) => {
                        const isSelected = (task.afterBufferPurpose || "Transit").toLowerCase() === type.toLowerCase();
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleUpdateTask({ afterBufferPurpose: type })}
                            className={`text-[9.5px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#A25F37] text-white border-[#A25F37] shadow-2xs"
                                : "bg-white text-[#594B3E] border-[#EADDC7] hover:border-[#A25F37]"
                            }`}
                          >
                            {type === "Driving" && "🚗 "}
                            {type === "Transit" && "🚆 "}
                            {type === "Travel" && "✈️ "}
                            {type === "Walking" && "🚶 "}
                            {type === "Wrap-up" && "📝 "}
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration Presets & Stepper */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B] block mb-1">
                      Duration (mins)
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[0, 5, 10, 15, 20, 30, 45].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleUpdateTask({ travelAfter: mins })}
                          className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            (task.travelAfter || 0) === mins
                              ? "bg-[#A25F37] text-white border-[#A25F37]"
                              : "bg-white text-[#594B3E] border-[#EADDC7] hover:bg-[#FAF3E0]"
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto bg-white px-2 py-0.5 rounded-lg border border-[#EADDC7]">
                        <button
                          type="button"
                          onClick={() => handleUpdateTask({ travelAfter: Math.max(0, (task.travelAfter || 0) - 5) })}
                          className="text-xs font-black text-[#594B3E] hover:text-[#1F1A16] px-1 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-[10px] font-mono font-bold text-[#A25F37] px-0.5">5m</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateTask({ travelAfter: (task.travelAfter || 0) + 5 })}
                          className="text-xs font-black text-[#594B3E] hover:text-[#1F1A16] px-1 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B] block mb-1">
                      Destination Location
                    </label>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {["Home", "Work", "Next Task"].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleUpdateTask({ travelAfterLocation: loc })}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            task.travelAfterLocation === loc
                              ? "bg-[#A25F37] text-white border-[#A25F37]"
                              : "bg-white text-[#594B3E] border-[#EADDC7] hover:border-[#A25F37]"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#EADDC7]">
                      <MapPin size={11} className="text-[#A25F37] shrink-0" />
                      <input
                        type="text"
                        placeholder="Custom destination..."
                        value={task.travelAfterLocation || ""}
                        onChange={(e) => handleUpdateTask({ travelAfterLocation: e.target.value })}
                        className="w-full text-xs font-medium text-[#2D2319] bg-transparent outline-none placeholder-[#8C7A6B]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Brainstorm */}
            {activeDropdown === "brainstorm" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Select Brainstorm Framework
                </div>
                <div className="space-y-1.5">
                  {BRAINSTORM_MODES.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => handleSelectBrainstormMode(m.label)}
                      className="w-full text-left p-3 rounded-2xl text-xs font-bold text-[#594B3E] bg-[#FAF3E0] hover:bg-[#F2E5D0] border border-[#EADDC7] flex flex-col cursor-pointer transition-all"
                    >
                      <span className="font-black text-[#2D2319]">{m.label}</span>
                      <span className="text-[10px] text-[#8C7A6B] mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Note */}
            {activeDropdown === "note" && (
              <div className="space-y-3">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Insert Note Template
                </div>
                <div className="space-y-1.5">
                  {NOTE_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => handleAppendNoteTemplate(t.text)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-[#594B3E] bg-[#FAF3E0] hover:bg-[#F2E5D0] border border-[#EADDC7] cursor-pointer transition-all"
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
                {onOpenChatbot && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDropdown(null);
                      onOpenChatbot();
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FB5607] to-indigo-600 hover:opacity-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Bot size={13} />
                    <span>Open Gemini Chat</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0.35, x: animationDirection === "backward" ? -45 : 45 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0.35, x: animationDirection === "backward" ? 45 : -45 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex flex-col justify-between select-none ${
        isFullScreen
          ? "w-full max-w-4xl mx-auto rounded-2xl sm:rounded-3xl border border-[#D8C7AF] shadow-md overflow-hidden min-h-[calc(100vh-10px)]"
          : "w-full rounded-3xl overflow-hidden shadow-2xl border border-[#EADDC7]"
      } ${isRecentlyCompleted ? "animate-task-success-border " : ""}${isStarted || isLocalRunning ? "faint-pulsing-glow" : ""}`}
      style={{
        backgroundColor: graphicsActiveWindowBg || "#FAF3E0",
        color: "#3D312A",
      }}
    >
      {/* ==================================================================== */}
      {/* 1. TOP HEADER BAR: MENU + UNDO + DATE SELECTOR + TASK NAVIGATION     */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between px-2.5 sm:px-4 py-1.5 border-b border-[#EADDC7]/70 bg-[#FFF2DF]/80 backdrop-blur-xs shrink-0">
        {/* Left: 3-line Hamburger Menu Button, Undo Button & Previous Task */}
        <div className="flex items-center gap-1.5">
          {onOpenHamburger && (
            <button
              type="button"
              id="graphics-card-hamburger-btn"
              onClick={onOpenHamburger}
              className="p-1.5 rounded-lg bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-2xs"
              title="Open Workspace Menu"
              aria-label="Open Workspace Menu"
            >
              <Menu size={14} strokeWidth={2.5} />
            </button>
          )}

          {/* Persistent Undo Button in Graphics Mode - Icon Only */}
          {onUndo && (
            <button
              type="button"
              id="graphics-card-undo-btn"
              onClick={() => {
                triggerHaptic("medium");
                onUndo();
              }}
              disabled={!canUndo}
              className={`p-1.5 rounded-lg border flex items-center justify-center transition-all active:scale-95 shadow-2xs ${
                canUndo
                  ? "bg-[#FAF3E0] hover:bg-[#EADDC7] border-[#EADDC7] text-[#3D312A] cursor-pointer"
                  : "bg-[#FAF3E0]/40 border-[#EADDC7]/40 text-[#8C7A6B]/50 cursor-not-allowed"
              }`}
              title={canUndo ? "Undo last action" : "Nothing to undo"}
              aria-label="Undo last action"
            >
              <Undo size={14} strokeWidth={2.5} />
            </button>
          )}

          {/* Toggle Full Active Window AI Narrative */}
          {onToggleNarrativeMode && (
            <button
              type="button"
              id="graphics-card-narrative-toggle-btn"
              onClick={() => {
                triggerHaptic("medium");
                onToggleNarrativeMode();
              }}
              className="p-1.5 rounded-lg bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-2xs"
              title="Switch to Full Active Window AI Narrative"
              aria-label="Switch to Full Active Window AI Narrative"
            >
              <Sparkles size={14} strokeWidth={2.5} className="text-purple-600" />
            </button>
          )}

          {/* Previous Task Arrow */}
          {onPrevTask && (
            <button
              type="button"
              onClick={onPrevTask}
              className="p-1 rounded-full hover:bg-[#EADDC7]/60 active:scale-95 text-[#6B5E51] transition-all cursor-pointer flex items-center justify-center border border-[#EADDC7]/40 bg-[#FAF3E0]/60"
              title="Previous task"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Center: Date Selector with day advance and reverse buttons */}
        <div className="flex items-center justify-center flex-1 mx-1.5 sm:mx-3">
          {selectedDate && (
            <div className="flex items-center bg-[#FAF3E0] border border-[#EADDC7] rounded-xl px-1 py-0.5 shadow-2xs">
              {onPrevDay && (
                <button
                  type="button"
                  id="graphical-card-date-prev-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onPrevDay();
                  }}
                  className="p-1 rounded-lg hover:bg-[#EADDC7]/70 text-[#3D312A] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Previous Day"
                  aria-label="Previous Day"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
              )}

              <div className="relative flex items-center gap-1.5 px-2 py-0.5 text-center cursor-pointer group select-none">
                <CalendarDays size={13} className="text-[#8C7A6B] shrink-0 group-hover:text-[#3D312A] transition-colors" />
                <span className="text-[11px] sm:text-xs font-black text-[#3D312A] whitespace-nowrap">
                  {formattedCardDate}
                </span>
                {onSelectDate && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        triggerHaptic("light");
                        onSelectDate(e.target.value);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Click to select date"
                  />
                )}
              </div>

              {onNextDay && (
                <button
                  type="button"
                  id="graphical-card-date-next-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onNextDay();
                  }}
                  className="p-1 rounded-lg hover:bg-[#EADDC7]/70 text-[#3D312A] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Next Day"
                  aria-label="Next Day"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Task Counter & Next Task Arrow */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#8C7A6B] hidden sm:inline">
            Task <span className="text-[#3D312A] font-extrabold">{currentIndex + 1}</span> of{" "}
            <span className="text-[#8C7A6B]">{totalCount}</span>
          </span>

          {onNextTask && (
            <button
              type="button"
              onClick={onNextTask}
              className="p-1 rounded-full hover:bg-[#EADDC7]/60 active:scale-95 text-[#6B5E51] transition-all cursor-pointer flex items-center justify-center border border-[#EADDC7]/40 bg-[#FAF3E0]/60"
              title="Next task"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. CARD CONTENT: SINGLE SCREEN WITH PANEL SELECTOR CLEARANCE         */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 md:p-5 pb-20 sm:pb-24 gap-3 sm:gap-4 max-w-4xl mx-auto w-full min-h-0">
        
        {/* ================================================================== */}
        {/* 1. FOCUS TITLE OBJECT AT THE TOP                                   */}
        {/* ================================================================== */}
        <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xs space-y-1.5 shrink-0 transition-all ${
          isRecentlyCompleted ? "animate-task-success-border " : ""
        }${
          isStarted || isLocalRunning ? "faint-pulsing-glow" : ""
        }`}>
          {/* Top Attribute Badges: Category, Lock/Unlock, Start Time & Priority */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Category Pull-Down */}
              <div className="relative pulldown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("category")}
                  className="pulldown-trigger px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-[#FAF3E0] text-[#594230] shadow-2xs border border-[#EADDC7] hover:bg-[#EADDC7] active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
                  title="Change Category"
                >
                  <span>{task.category || "Category"}</span>
                  <ChevronDown size={9} className="text-[#A25F37]" />
                </button>
              </div>

              {/* Lock / Unlock Toggle Icon Button */}
              <button
                type="button"
                onClick={handleToggleLock}
                className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-[#FAF3E0] text-[#594230] shadow-2xs border border-[#EADDC7] hover:bg-[#EADDC7] active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
                title={task.isLocked ? "Task is Locked (Fixed Appointment Time)" : "Task is Flexible (Falls into place)"}
              >
                {task.isLocked ? (
                  <Lock size={9} className="text-[#A25F37]" />
                ) : (
                  <Unlock size={9} className="text-[#8C7A6B]" />
                )}
                <span>{task.isLocked ? "Locked" : "Flexible"}</span>
              </button>

              {/* Start Time Selector in Task Title Box */}
              <div className="relative pulldown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("timePicker")}
                  className="pulldown-trigger px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black text-[#594B3E] bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] transition-all flex items-center gap-0.5 cursor-pointer shadow-2xs active:scale-95"
                  title="Dedicated Start Time / Hour Editor (AM/PM)"
                >
                  <Clock size={9} className="text-[#A25F37]" />
                  <span className={`font-mono tracking-tight font-extrabold ${
                    graphicsTimeFontSize === "small"
                      ? "text-[8px]"
                      : graphicsTimeFontSize === "large"
                      ? "text-[10px] sm:text-[11px]"
                      : graphicsTimeFontSize === "xl"
                      ? "text-xs sm:text-sm"
                      : graphicsTimeFontSize === "2xl"
                      ? "text-sm sm:text-base"
                      : "text-[8.5px] sm:text-[9px]"
                  }`}>{formatTime(task.computedTime || task.time || "09:00")}</span>
                  <ChevronDown size={8} className="text-[#8C7A6B]" />
                </button>
              </div>

              {/* Priority Pull-Down */}
              <div className="relative pulldown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("priority")}
                  className={`pulldown-trigger px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider shadow-2xs border transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
                  title="Change Priority"
                >
                  <span>{priorityConfig.label}</span>
                  <ChevronDown size={9} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onEditTask}
              className="p-1 rounded-lg hover:bg-[#EADDC7]/80 text-[#7A6B5C] hover:text-[#2D2319] transition-all cursor-pointer shrink-0 border border-transparent hover:border-[#EADDC7]"
              title="Edit Task Details"
            >
              <Edit3 size={12} />
            </button>
          </div>

          {/* Task Title & Time Row (Square Checkbox + Bold Title + Subtitle) */}
          <div className="flex items-start gap-2.5 py-0.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("success");
                setLocalSuccessToggled(true);
                setTimeout(() => setLocalSuccessToggled(false), 1200);
                onToggleComplete();
              }}
              className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 ${
                task.completed
                  ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-2xs"
                  : "border-[#2D6A4F] hover:border-[#1B4332] bg-[#FAF3E0]"
              }`}
              title={task.completed ? "Mark as in progress" : "Mark as completed"}
            >
              {task.completed && <Check size={16} strokeWidth={3} className="text-white" />}
            </button>

            <div className="flex-1 min-w-0">
              <h2
                onClick={onEditTask}
                className={`font-serif font-bold tracking-tight cursor-pointer hover:text-[#A25F37] transition-colors leading-snug line-clamp-2 ${
                  graphicsTaskTitleFontSize === "small"
                    ? "text-base sm:text-lg"
                    : graphicsTaskTitleFontSize === "large"
                    ? "text-2xl sm:text-3xl"
                    : graphicsTaskTitleFontSize === "xl"
                    ? "text-3xl sm:text-4xl"
                    : graphicsTaskTitleFontSize === "2xl"
                    ? "text-4xl sm:text-5xl"
                    : "text-xl sm:text-2xl"
                } ${
                  isRecentlyCompleted ? "animate-task-success-text " : ""
                }${
                  task.completed ? "line-through text-[#8C7A6B]" : "text-[#1F1A16]"
                }`}
                title="Click to edit task title"
              >
                {task.title || "Coding"}
              </h2>

              {/* Subtitle: 🕒 1:25 PM – 3:25 PM (2h 00 min) */}
              <div className={`flex items-center gap-1.5 font-bold text-[#2D6A4F] mt-0.5 ${
                graphicsTimeFontSize === "small"
                  ? "text-[9.5px] sm:text-[10px]"
                  : graphicsTimeFontSize === "large"
                  ? "text-xs sm:text-sm"
                  : graphicsTimeFontSize === "xl"
                  ? "text-sm sm:text-base"
                  : graphicsTimeFontSize === "2xl"
                  ? "text-base sm:text-lg"
                  : "text-[11px] sm:text-xs"
              }`}>
                <Clock size={graphicsTimeFontSize === "xl" || graphicsTimeFontSize === "2xl" ? 14 : 11} className="text-[#2D6A4F] shrink-0" />
                <span>{formatTime(task.computedTime || task.time || "09:00")} – {taskEndFormatted} ({durationText})</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 2. FOCUS MAIN CONTENT: DURATION, COLLAB & SUBTASKS, LOCATION, ACTIONS */}
        {/* ================================================================== */}
        <div className="space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto no-scrollbar">

          {/* ROW 1: DURATION & COLLABORATOR HALF-SIZE ACTION CARDS SIDE-BY-SIDE */}
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {/* DURATION ACTION CARD */}
            <div
              className={`relative p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between transition-all hover:border-[#D8C7AF] hover:shadow-md min-h-[155px] sm:min-h-[170px] ${
                isStarted || isLocalRunning ? "faint-pulsing-glow" : ""
              }`}
              style={{
                backgroundColor: graphicsActionBoxBg || "#FFF2DF",
                color: graphicsActionBoxFontColor || "#3D312A",
                borderColor: "#EADDC7"
              }}
            >
              <div className="flex items-start justify-between">
                {/* Play/Pause Button (without green circle ring) and countdown text below */}
                <div
                  className="flex flex-col items-center cursor-pointer group/timer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTimer();
                  }}
                  title={isStarted || isLocalRunning ? "Click to Pause Timer" : "Click to Start Timer & Lock Task"}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] flex items-center justify-center text-[#2D6A4F] shrink-0 transition-transform group-hover/timer:scale-105 active:scale-95 shadow-2xs">
                    {isStarted || isLocalRunning ? (
                      <Pause size={22} strokeWidth={2.5} className="animate-pulse" />
                    ) : (
                      <Play size={22} fill="currentColor" className="ml-0.5" />
                    )}
                  </div>

                  {/* Timer Countdown numbers BELOW - DOUBLED FONT SIZE */}
                  <span
                    className="font-mono font-black text-xl sm:text-2xl mt-1 tracking-tight text-center"
                    style={{ color: graphicsActionBoxFontColor || "#1F1A16" }}
                  >
                    {isStarted || isLocalRunning ? formatHoursMinutesSeconds(displaySecs) : `${taskDurationMins}m`}
                  </span>
                </div>

                {/* Right Column: Start/Pause Action Button - Converted to Icon */}
                <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center cursor-pointer transition-all border shadow-2xs active:scale-95 ${
                      isStarted || isLocalRunning
                        ? "bg-[#2D6A4F] text-white border-[#1B4332] animate-pulse"
                        : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#2D6A4F] border-[#EADDC7]"
                    }`}
                    title={isStarted || isLocalRunning ? "Pause Timer" : "Start Timer & Lock Task"}
                    aria-label={isStarted || isLocalRunning ? "Pause Timer" : "Start Timer"}
                  >
                    {isStarted || isLocalRunning ? (
                      <Pause size={13} strokeWidth={2.5} />
                    ) : (
                      <Play size={13} fill="currentColor" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom row: Duration text (DOUBLED) and Stepper Pill */}
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#EADDC7]/60 gap-1.5">
                <span
                  className="text-base sm:text-lg font-black tracking-tight truncate"
                  style={{ color: graphicsActionBoxFontColor || "#594B3E" }}
                >
                  {durationText}
                </span>

                {/* Stepper Pill: - 5m + */}
                <div
                  className="flex items-center gap-1 bg-[#FAF3E0] px-2 py-1 rounded-full border border-[#EADDC7] shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleAdjustDuration(-5)}
                    className="text-sm font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-1 active:scale-90 transition-transform"
                    title="Subtract 5 mins"
                  >
                    −
                  </button>
                  <span className="text-xs sm:text-sm font-black text-[#A25F37] px-1 font-mono">
                    5m
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdjustDuration(5)}
                    className="text-sm font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-1 active:scale-90 transition-transform"
                    title="Add 5 mins"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* COLLABORATOR ACTION CARD */}
            <div
              onClick={() => toggleDropdown("collaborator")}
              className="relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between text-center cursor-pointer hover:border-[#D8C7AF] hover:shadow-md transition-all group min-h-[155px] sm:min-h-[170px]"
              style={{
                backgroundColor: graphicsActionBoxBg || "#FFF2DF",
                color: graphicsActionBoxFontColor || "#3D312A",
                borderColor: "#EADDC7"
              }}
            >
              <div className="flex items-center justify-between w-full border-b border-[#EADDC7]/60 pb-1">
                <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B]">
                  Collaborator
                </span>
              </div>

              <div className="my-auto py-1 px-1 w-full text-center">
                <p className="text-[11px] sm:text-xs font-bold text-[#2D2319] truncate">
                  {collaboratorValue && collaboratorValue !== "None"
                    ? collaboratorValue
                    : "No Collaborator"}
                </p>
              </div>

              <div className="relative pulldown-container w-full flex justify-center mt-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => toggleDropdown("collaborator")}
                  className="px-2.5 sm:px-3 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[9px] font-black uppercase tracking-wider text-[#594B3E] flex items-center justify-center cursor-pointer transition-all shadow-2xs active:scale-95"
                >
                  <span>{collaboratorValue && collaboratorValue !== "None" ? "Change" : "Assign"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ROW 2: SUBTASKS ACTION CARD */}
          <div
            onClick={() => setIsSubtaskWindowOpen(true)}
            className="relative p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#D8C7AF] hover:shadow-md transition-all group min-h-[96px] sm:min-h-[102px]"
            style={{
              backgroundColor: graphicsActionBoxBg || "#FFF2DF",
              color: graphicsActionBoxFontColor || "#3D312A",
              borderColor: "#EADDC7"
            }}
          >
            <div className="flex items-center justify-between w-full border-b border-[#EADDC7]/60 pb-1">
              <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B]">
                Subtasks
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold bg-[#FAF3E0] text-[#2D6A4F] border border-[#EADDC7]">
                {subtasks.filter((s) => s.completed).length} / {subtasks.length}
              </span>
            </div>

            {/* Connected Subtasks Checklist */}
            <div className="my-auto py-0.5 space-y-1">
              {subtasks.length === 0 ? (
                <div className="text-center py-0.5">
                  <p className="text-[10px] text-[#8C7A6B] font-semibold">No subtasks</p>
                  <p className="text-[9px] text-[#2D6A4F] font-bold mt-0.5">+ Tap to manage</p>
                </div>
              ) : (
                subtasks.slice(0, 2).map((st, idx) => (
                  <React.Fragment key={st.id}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSubtaskItem(st.id);
                      }}
                      className="flex items-center gap-1.5 cursor-pointer group/st"
                    >
                      <span
                        className={`w-3 h-3 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                          st.completed
                            ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                            : "border-[#B09F8C] bg-white hover:border-[#2D6A4F]"
                        }`}
                      >
                        {st.completed && <Check size={8.5} strokeWidth={3} />}
                      </span>
                      <span className={`text-[10px] sm:text-[10.5px] font-semibold truncate flex-1 ${st.completed ? "line-through text-[#8C7A6B]" : "text-[#2D2319]"}`}>
                        {st.title}
                      </span>
                    </div>
                    {idx === 0 && subtasks.length > 1 && (
                      <div className="w-[1.5px] h-1.5 bg-[#C4B4A0] ml-1.5" />
                    )}
                  </React.Fragment>
                ))
              )}
            </div>

            {/* + ADD SUBTASK Solid Pill Button */}
            <div className="w-full flex justify-center mt-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic("medium");
                  setIsSubtaskWindowOpen(true);
                }}
                className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-black text-[9px] tracking-wider uppercase rounded-full py-1 px-2.5 flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                + ADD SUBTASK
              </button>
            </div>
          </div>

          {/* ROW 3: LOCATION & BUFFERS HALF-SIZE ACTION CARDS SIDE-BY-SIDE */}
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {/* LOCATION ACTION CARD */}
            <div
              onClick={() => toggleDropdown("location")}
              className={`relative min-h-[138px] sm:min-h-[146px] rounded-xl sm:rounded-2xl border border-[#EADDC7] shadow-xs cursor-pointer group hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                activeDropdown === "location" ? "z-40" : "z-10"
              }`}
              style={{
                backgroundColor: graphicsActionBoxBg || "#FFF2DF",
                borderColor: "#EADDC7"
              }}
            >
              {/* Google Maps embed with rounded clipping */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden pointer-events-none z-0">
                <iframe
                  key={queryLocation}
                  title={`Google Map for ${queryLocation}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(queryLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  className="w-[110%] h-[110%] -m-[5%] border-0 opacity-90 scale-105"
                  loading="lazy"
                  tabIndex={-1}
                />
              </div>

              {/* Overlays on top of map */}
              <div className="relative z-10 p-1.5 sm:p-2 flex items-start justify-between">
                <div className="px-1.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#2D2319] border border-white/60 shadow-xs flex items-center gap-1 min-w-0 max-w-[62%]">
                  <MapPin size={9} className="text-[#2D6A4F] shrink-0" />
                  <span className="text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider truncate">
                    {task.location && task.location.trim() ? task.location.trim() : "no location"}
                  </span>
                </div>

                {/* EDIT ∨ Solid Cream Pill Button */}
                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("location")}
                    className="pulldown-trigger px-1.5 sm:px-2 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-white text-[#1F1A16] border border-[#EADDC7] text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider shadow-xs flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Edit Location"
                  >
                    <span>EDIT</span>
                    <ChevronDown size={8} strokeWidth={3} className="text-[#A25F37]" />
                  </button>
                </div>
              </div>

              {/* Pin callout on map */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-1">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 shadow-md border border-[#EADDC7] text-[#2D2319] max-w-[90%]">
                  <MapPin size={10} className="text-red-500 fill-red-500 shrink-0" />
                  <span className="text-[9px] sm:text-[9.5px] font-extrabold truncate">
                    {task.location && task.location.trim() ? task.location.trim() : "no location"}
                  </span>
                </div>
              </div>

              {/* Google watermark bottom-left */}
              <div className="absolute bottom-1 left-2 z-10 pointer-events-none">
                <span className="text-[8px] font-black text-[#5F6368]/70 tracking-tight">
                  Google
                </span>
              </div>
            </div>

            {/* BUFFERS (PRE & POST) ACTION CARD */}
            <div
              className={`relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between hover:border-[#D8C7AF] hover:shadow-md transition-all group min-h-[138px] sm:min-h-[146px] ${
                activeDropdown === "buffer" ? "z-40" : "z-10"
              }`}
              style={{
                backgroundColor: graphicsActionBoxBg || "#FFF2DF",
                color: graphicsActionBoxFontColor || "#3D312A",
                borderColor: "#EADDC7"
              }}
            >
              {/* Header row: Icon + BUFFERS label + EDIT ∨ Pill Button */}
              <div className="flex items-center justify-between w-full border-b border-[#EADDC7]/60 pb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <div className="w-4.5 h-4.5 rounded-full bg-[#E8F5E9] text-[#2D6A4F] flex items-center justify-center shrink-0">
                    <Car size={10} strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] truncate">
                    Buffers
                  </span>
                </div>

                {/* EDIT ∨ Solid Cream Pill Button with Dropdown Trigger */}
                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("buffer")}
                    className="pulldown-trigger px-1.5 sm:px-2 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-white text-[#1F1A16] border border-[#EADDC7] text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider shadow-xs flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Edit Pre and Post Buffers"
                  >
                    <span>EDIT</span>
                    <ChevronDown size={8} strokeWidth={3} className="text-[#A25F37]" />
                  </button>
                </div>
              </div>

              {/* Card Face Content (Direct Surface Controls) */}
              <div className="space-y-1 my-auto py-0.5">
                {/* PRE-BUFFER ROW */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[7.5px] font-black tracking-wider uppercase px-1 py-0.5 rounded bg-[#E8F5E9] text-[#2D6A4F] border border-[#C8E6C9] shrink-0">
                      Pre
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] font-bold text-[#2D2319] truncate">
                      {task.beforeBufferPurpose || "Driving"}
                    </span>
                  </div>
                  {/* Stepper Pill: - 5m + */}
                  <div
                    className="flex items-center gap-0.5 bg-[#FAF3E0] px-1 py-0.5 rounded-full border border-[#EADDC7] shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateTask({ travelBefore: Math.max(0, (task.travelBefore || 0) - 5) })}
                      className="text-[9px] font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-0.5 active:scale-90"
                      title="Subtract 5 mins"
                    >
                      −
                    </button>
                    <span className="text-[8.5px] font-mono font-black text-[#2D6A4F] px-0.5 min-w-[18px] text-center">
                      {task.travelBefore || 0}m
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTask({ travelBefore: (task.travelBefore || 0) + 5 })}
                      className="text-[9px] font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-0.5 active:scale-90"
                      title="Add 5 mins"
                    >
                      +
                    </button>
                  </div>
                </div>
                {/* Pre-buffer Location line */}
                <div className="flex items-center gap-1 pl-1 text-[8px] sm:text-[8.5px] text-[#8C7A6B]">
                  <MapPin size={8} className="text-[#2D6A4F] shrink-0" />
                  <span className="truncate">
                    {task.travelBeforeLocation && task.travelBeforeLocation.trim()
                      ? task.travelBeforeLocation
                      : "From Home"}
                  </span>
                </div>

                {/* Subtle divider */}
                <div className="border-t border-[#EADDC7]/60" />

                {/* POST-BUFFER ROW */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[7.5px] font-black tracking-wider uppercase px-1 py-0.5 rounded bg-[#FFF3E0] text-[#A25F37] border border-[#FFE0B2] shrink-0">
                      Post
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] font-bold text-[#2D2319] truncate">
                      {task.afterBufferPurpose || "Transit"}
                    </span>
                  </div>
                  {/* Stepper Pill: - 5m + */}
                  <div
                    className="flex items-center gap-0.5 bg-[#FAF3E0] px-1 py-0.5 rounded-full border border-[#EADDC7] shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateTask({ travelAfter: Math.max(0, (task.travelAfter || 0) - 5) })}
                      className="text-[9px] font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-0.5 active:scale-90"
                      title="Subtract 5 mins"
                    >
                      −
                    </button>
                    <span className="text-[8.5px] font-mono font-black text-[#A25F37] px-0.5 min-w-[18px] text-center">
                      {task.travelAfter || 0}m
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTask({ travelAfter: (task.travelAfter || 0) + 5 })}
                      className="text-[9px] font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-0.5 active:scale-90"
                      title="Add 5 mins"
                    >
                      +
                    </button>
                  </div>
                </div>
                {/* Post-buffer Location line */}
                <div className="flex items-center gap-1 pl-1 text-[8px] sm:text-[8.5px] text-[#8C7A6B]">
                  <MapPin size={8} className="text-[#A25F37] shrink-0" />
                  <span className="truncate">
                    {task.travelAfterLocation && task.travelAfterLocation.trim()
                      ? task.travelAfterLocation
                      : "To Next task"}
                  </span>
                </div>
              </div>

              {/* Quick Configure Pill Button at card bottom */}
              <div className="w-full flex justify-center mt-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => toggleDropdown("buffer")}
                  className="px-2.5 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[8.5px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
                >
                  <Sliders size={8} />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          </div>

          {/* ROW 4: ACTION CARDS - DOUBLE HEIGHT DAILY TASKS BOX ON LEFT, BRAINSTORM & NOTES ON RIGHT */}
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {/* Card 1: DOUBLE HEIGHT BOX - TASKS FOR THE DAY (replaces Add Task & Routine) */}
            <div
              className="row-span-2 h-[138px] sm:h-[148px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between overflow-hidden"
              style={{
                backgroundColor: graphicsActionBoxBg || "#FFF2DF",
                color: graphicsActionBoxFontColor || "#2D2319",
                borderColor: "#EADDC7"
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-1 border-b border-[#EADDC7]/70 shrink-0">
                <div className="flex items-center gap-1 min-w-0">
                  <div className="w-4.5 h-4.5 rounded-full bg-[#DDF3E8] text-[#2D6A4F] flex items-center justify-center shadow-2xs shrink-0">
                    <CalendarCheck size={10} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#2D2319] leading-tight truncate">
                      Tasks For Day
                    </h3>
                    <p className="text-[7.5px] sm:text-[8px] text-[#7A6B5C] font-bold leading-none truncate">
                      {displayDailyTasks.length} {displayDailyTasks.length === 1 ? "task" : "tasks"}
                    </p>
                  </div>
                </div>

                {onAddTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTask();
                    }}
                    className="p-0.5 sm:p-1 rounded-md bg-[#FAF3E0] hover:bg-[#2D6A4F] hover:text-white border border-[#EADDC7] text-[#594B3E] transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Add New Task"
                  >
                    <Plus size={10} strokeWidth={3} />
                  </button>
                )}
              </div>

              {/* Scrollable list of tasks for the day */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5 sm:space-y-1 my-0.5">
                {displayDailyTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-1">
                    <p className="text-[9.5px] font-bold text-[#8C7A6B]">No tasks scheduled</p>
                    {onAddTask && (
                      <button
                        type="button"
                        onClick={onAddTask}
                        className="mt-0.5 text-[8.5px] font-black text-[#2D6A4F] hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        + Add task
                      </button>
                    )}
                  </div>
                ) : (
                  displayDailyTasks.map((t, idx) => {
                    const isCurrentTask = t.id === task.id || t.id === (task as any).parentTaskId;
                    return (
                      <div
                        key={t.id || idx}
                        onClick={() => {
                          if (onSelectTask) {
                            onSelectTask(t);
                          }
                        }}
                        className={`px-1.5 py-0.5 sm:py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between gap-1 ${
                          isCurrentTask
                            ? "bg-[#2D6A4F] text-white shadow-2xs font-bold"
                            : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#2D2319]"
                        }`}
                        title={`Focus on "${t.title}"`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              t.completed
                                ? isCurrentTask ? "bg-white" : "bg-[#2D6A4F]"
                                : isCurrentTask ? "bg-emerald-300" : "bg-[#B09F8C]"
                            }`}
                          />
                          <span className={`text-[9.5px] sm:text-[10px] truncate leading-tight ${t.completed ? "line-through opacity-70" : ""}`}>
                            {t.title}
                          </span>
                        </div>
                        <span className={`text-[8px] shrink-0 font-bold ${isCurrentTask ? "text-emerald-100" : "text-[#7A6B5C]"}`}>
                          {(t.computedTime || t.time) ? formatTime(t.computedTime || t.time) : (t.duration ? `${t.duration}m` : "")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer hint */}
              <div className="pt-0.5 border-t border-[#EADDC7]/60 flex items-center justify-between text-[7.5px] text-[#8C7A6B] font-semibold shrink-0">
                <span>Tap task to focus</span>
                <span className="uppercase tracking-wider font-black text-[#2D6A4F]">Focus Card</span>
              </div>
            </div>

            {/* Card 2: BRAINSTORM (Top Right) */}
            <div
              onClick={onSequenceBrainstorm}
              className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer hover:bg-[#FBEBD2] transition-all h-[65px] sm:h-[70px] group active:scale-[0.98]"
              style={{
                backgroundColor: graphicsActionBoxBg || "#FFF2DF",
                color: graphicsActionBoxFontColor || "#2D2319",
                borderColor: "#EADDC7"
              }}
            >
              <div className="flex items-center justify-between">
                <div className="w-4.5 h-4.5 rounded-full bg-[#EDE9FE] text-[#6B46C1] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Brain size={10} strokeWidth={2.5} />
                </div>

                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("brainstorm")}
                    className="px-1.5 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[7.5px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-0.5 cursor-pointer transition-all"
                  >
                    <span>Modes</span>
                    <ChevronDown size={7} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider leading-tight" style={{ color: graphicsActionBoxFontColor || "#2D2319" }}>
                  Brainstorm
                </h3>
                <p className="text-[8px] sm:text-[8.5px] text-[#7A6B5C] leading-tight mt-0.5">
                  Multi-item entry
                </p>
              </div>
            </div>

            {/* Card 4: NOTES & AI (Warm cream) */}
            <div
              onClick={onQuickNote}
              className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer hover:bg-[#FBEBD2] transition-all h-[65px] sm:h-[70px] group active:scale-[0.98]"
              style={{
                backgroundColor: graphicsActionBoxBg || "#FFF2DF",
                color: graphicsActionBoxFontColor || "#3D312A",
                borderColor: "#EADDC7"
              }}
            >
              <div className="flex items-center justify-between">
                <div className="w-4.5 h-4.5 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <FileText size={10} strokeWidth={2.5} />
                </div>

                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("note")}
                    className="px-1.5 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[7.5px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-0.5 cursor-pointer transition-all"
                  >
                    <span>Templates</span>
                    <ChevronDown size={7} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider leading-tight" style={{ color: graphicsActionBoxFontColor || "#3D312A" }}>
                  Notes & AI
                </h3>
                <p className="text-[8px] sm:text-[8.5px] text-[#7A6B5C] leading-tight mt-0.5">
                  Capture thoughts
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ================================================================== */}
        {/* 3. BOTTOM ACTION BAR: COMPLETED, EDIT, DELETE, AIBOT IN SAME ROW   */}
        {/* ================================================================== */}
        {/* COMPACT BOTTOM ACTION ROW - All converted to crisp icon buttons */}
        {/* ================================================================== */}
        <div className="flex items-center justify-between gap-2 shrink-0 pt-0.5">
          <div className="flex items-center gap-2">
            {/* Completed Icon Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("success");
                setLocalSuccessToggled(true);
                setTimeout(() => setLocalSuccessToggled(false), 1200);
                onToggleComplete();
              }}
              className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full font-black flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95 shrink-0 ${
                task.completed
                  ? "bg-[#6A994E] hover:bg-[#58813F] text-white ring-2 ring-[#6A994E]/40"
                  : "bg-[#2D6A4F] hover:bg-[#1B4332] text-white"
              }`}
              title={task.completed ? "Task Completed (Click to mark incomplete)" : "Mark Task Complete"}
              aria-label={task.completed ? "Task Completed" : "Mark Task Complete"}
            >
              <Check size={15} strokeWidth={3} />
            </button>

            {/* Edit Icon Button */}
            <button
              type="button"
              onClick={onEditTask}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#2D2319] border border-[#EADDC7] transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-xs shrink-0"
              title="Edit Task Details"
              aria-label="Edit Task"
            >
              <Edit3 size={13} />
            </button>

            {/* Delete Icon Button */}
            <button
              type="button"
              onClick={onDeleteTask}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-[#FEECEB] hover:bg-[#FCDAD7] text-[#E07A5F] border border-[#F5C2C0] transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-xs shrink-0"
              title="Delete Task"
              aria-label="Delete Task"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* AI Bot Button on the Same Row */}
          {onOpenChatbot && (
            <button
              id="graphics-action-row-ai-chatbot-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("medium");
                onOpenChatbot();
              }}
              className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-[#E8EDF5] hover:bg-[#D5E0F2] text-[#2B4C7E] border border-[#C2D4EE] transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-xs shrink-0 ${
                isChatbotOpen ? "ring-2 ring-purple-400 scale-[1.04]" : ""
              }`}
              title="Gemini A.I Chatbot"
              aria-label="Gemini A.I Chatbot"
            >
              <Bot size={13} />
            </button>
          )}
        </div>

        {/* Screen-centered expanding/collapsing Subtask Window Modal */}
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

        {/* Screen-centered Location Choices & Directions Modal */}
        <LocationChoicesModal
          isOpen={isLocationChoicesModalOpen}
          onClose={() => setIsLocationChoicesModalOpen(false)}
          currentLocation={task.location || ""}
          onSelectLocation={handleSelectLocation}
          favoriteLocations={favoriteLocations}
          onAddFavoriteLocation={onAddFavoriteLocation}
        />

        {/* Centered Window Modal for all Pulldown Choices */}
        {renderPulldownWindowModal()}

        {/* Screen Border Navigation Arrows (Fixed at Left & Right Screen Edges to Advance/Reverse Focus Card) */}
        {typeof document !== "undefined" && createPortal(
          <>
            {onPrevTask && (
              <button
                type="button"
                id="graphical-screen-prev-arrow-btn"
                onClick={() => {
                  triggerHaptic("light");
                  onPrevTask();
                }}
                className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[600] p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 hover:scale-110 shadow-xl backdrop-blur-md select-none bg-[#FAF3E0]/95 hover:bg-white text-[#3D312A] hover:text-[#1C3B2B] border-2 border-[#D8C7AF] hover:border-[#1C3B2B]/40 shadow-[0_4px_16px_rgba(45,35,25,0.22)] group"
                title="Previous Task (Card Backward)"
                aria-label="Previous Task (Card Backward)"
              >
                <ChevronLeft size={24} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            {onNextTask && (
              <button
                type="button"
                id="graphical-screen-next-arrow-btn"
                onClick={() => {
                  triggerHaptic("light");
                  onNextTask();
                }}
                className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[600] p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 hover:scale-110 shadow-xl backdrop-blur-md select-none bg-[#FAF3E0]/95 hover:bg-white text-[#3D312A] hover:text-[#1C3B2B] border-2 border-[#D8C7AF] hover:border-[#1C3B2B]/40 shadow-[0_4px_16px_rgba(45,35,25,0.22)] group"
                title="Next Task (Card Forward)"
                aria-label="Next Task (Card Forward)"
              >
                <ChevronRight size={24} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </>,
          document.body
        )}

      </div>
    </motion.div>
  );
};
