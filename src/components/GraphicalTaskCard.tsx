import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, Subtask } from "../types";
import { openGoogleMapsNavigation, getGoogleMapsDirectionsUrl } from "./InteractiveAppHelpers";
import { formatDate, formatTime } from "../utils/timeHelpers";
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
}) => {
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

  const collaboratorValue = (task.collaborator && task.collaborator !== "None" ? task.collaborator : task.attendees) || "";

  // Google Maps queried location & driving directions
  const queryLocation = useMemo(() => {
    if (task.location && task.location.trim().length > 0) {
      return task.location.trim();
    }
    return "San Francisco, CA";
  }, [task.location]);

  const drivingDirectionsUrl = useMemo(() => {
    const dest = task.location && task.location.trim().length > 0 ? task.location.trim() : queryLocation;
    return getGoogleMapsDirectionsUrl(dest) || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }, [task.location, queryLocation]);

  const handleOpenDirections = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dest = task.location && task.location.trim().length > 0 ? task.location.trim() : "";
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
      if (!target.closest(".pulldown-container") && !target.closest(".pulldown-trigger")) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener("mousedown", handleGlobalClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
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
    const timePart = formatTime(task.time || "09:00");
    return `${datePart}, ${timePart}`;
  }, [task.date, task.time, selectedDate]);

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

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0.35, x: animationDirection === "backward" ? -45 : 45 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0.35, x: animationDirection === "backward" ? 45 : -45 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex flex-col justify-between select-none ${
        isFullScreen
          ? "w-full h-full min-h-screen overflow-y-auto no-scrollbar bg-[#FAF3E0]"
          : "w-full rounded-3xl overflow-hidden shadow-2xl border border-[#EADDC7] bg-[#FAF3E0]"
      }`}
      style={{
        backgroundColor: "#FAF3E0",
        color: "#3D312A",
      }}
    >
      {/* Left Center Border Button: Initiate swipe to previous task */}
      {onPrevTask && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrevTask();
          }}
          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#FAF3E0]/95 hover:bg-white text-[#3D312A] border-2 border-[#EADDC7] shadow-lg flex items-center justify-center transition-all duration-150 active:scale-90 hover:scale-105 cursor-pointer backdrop-blur-xs"
          title="Previous Task"
          aria-label="Previous Task"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Right Center Border Button: Initiate swipe to next task */}
      {onNextTask && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNextTask();
          }}
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#FAF3E0]/95 hover:bg-white text-[#3D312A] border-2 border-[#EADDC7] shadow-lg flex items-center justify-center transition-all duration-150 active:scale-90 hover:scale-105 cursor-pointer backdrop-blur-xs"
          title="Next Task"
          aria-label="Next Task"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* ==================================================================== */}
      {/* 1. TOP HEADER BAR: MENU + DATE SELECTOR + TASK NAVIGATION            */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 border-b border-[#EADDC7]/70 bg-[#FFF2DF]/80 backdrop-blur-xs shrink-0">
        {/* Left: 3-line Hamburger Menu Button & Previous Task */}
        <div className="flex items-center gap-1.5">
          {onOpenHamburger && (
            <button
              type="button"
              id="graphics-card-hamburger-btn"
              onClick={onOpenHamburger}
              className="p-1.5 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#3D312A] transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Open Workspace Menu"
            >
              <Menu size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider hidden xs:inline">Menu</span>
            </button>
          )}

          {/* Previous Task Arrow */}
          {onPrevTask && (
            <button
              type="button"
              onClick={onPrevTask}
              className="p-1.5 rounded-full hover:bg-[#EADDC7]/60 active:scale-95 text-[#6B5E51] transition-all cursor-pointer flex items-center justify-center border border-[#EADDC7]/40 bg-[#FAF3E0]/60"
              title="Previous task (or swipe right)"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Center: DATE SELECTOR + CONSTANT START TIME PULL-DOWN */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-center">
          <div className="flex items-center gap-1 bg-[#FAF3E0] px-2 py-0.5 rounded-2xl border border-[#EADDC7] shadow-2xs">
            <button
              type="button"
              onClick={onPrevDay}
              className="p-1 rounded-lg hover:bg-[#EADDC7] text-[#6B5E51] active:scale-90 transition-all cursor-pointer"
              title="Move day backward"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>

            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => datePickerRef.current?.showPicker ? datePickerRef.current.showPicker() : datePickerRef.current?.click()}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-[#EADDC7]/60 transition-colors cursor-pointer text-[#3D312A]"
                title="Click to select date with calendar"
              >
                <CalendarDays size={13} className="text-[#A25F37]" />
                <span className="text-xs font-black tracking-tight">{formattedSelectedDate}</span>
              </button>
              <input
                ref={datePickerRef}
                type="date"
                value={selectedDate || ""}
                onChange={(e) => onSelectDate && onSelectDate(e.target.value)}
                className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            <button
              type="button"
              onClick={onNextDay}
              className="p-1 rounded-lg hover:bg-[#EADDC7] text-[#6B5E51] active:scale-90 transition-all cursor-pointer"
              title="Move day forward"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>

            {!isSelectedDateToday && onToday && (
              <button
                type="button"
                onClick={onToday}
                className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#2D6A4F] text-white hover:bg-[#1B4332] active:scale-95 transition-all shadow-2xs cursor-pointer"
                title="Jump to today's date"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Right: Task Counter & Next Task Arrow */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8C7A6B] hidden sm:inline">
            Task <span className="text-[#3D312A] font-extrabold">{currentIndex + 1}</span> of{" "}
            <span className="text-[#8C7A6B]">{totalCount}</span>
          </span>

          {onNextTask && (
            <button
              type="button"
              onClick={onNextTask}
              className="p-1.5 rounded-full hover:bg-[#EADDC7]/60 active:scale-95 text-[#6B5E51] transition-all cursor-pointer flex items-center justify-center border border-[#EADDC7]/40 bg-[#FAF3E0]/60"
              title="Next task (or swipe left)"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. CARD CONTENT: SINGLE SCREEN WITH PANEL SELECTOR CLEARANCE         */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col justify-between p-1.5 sm:p-2.5 pb-16 sm:pb-20 gap-1 sm:gap-1.5 max-w-4xl mx-auto w-full min-h-0">
        
        {/* ================================================================== */}
        {/* 1. FOCUS TITLE OBJECT AT THE TOP                                   */}
        {/* ================================================================== */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xs space-y-1.5 shrink-0">
          {/* Top Attribute Badges: Category, Lock/Unlock, Start Time & Priority */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Category Pull-Down */}
              <div className="relative pulldown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("category")}
                  className="pulldown-trigger px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FAF3E0] text-[#594230] shadow-2xs border border-[#EADDC7] hover:bg-[#EADDC7] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  title="Change Category"
                >
                  <span>{task.category || "Category"}</span>
                  <ChevronDown size={10} className="text-[#A25F37]" />
                </button>

                <AnimatePresence>
                  {activeDropdown === "category" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1.5 w-52 p-2 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xl shadow-[#3D312A]/15 z-50 space-y-1"
                    >
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-2 py-1 border-b border-[#EADDC7]/60 flex items-center justify-between">
                        <span>Select Category</span>
                        <button type="button" onClick={() => setActiveDropdown(null)}>
                          <X size={12} />
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto no-scrollbar space-y-0.5">
                        {PRESET_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className={`w-full text-left px-2 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                              task.category === cat
                                ? "bg-[#EADDC7] text-[#2D2319]"
                                : "hover:bg-[#FAF3E0] text-[#594B3E]"
                            }`}
                          >
                            <span>{cat}</span>
                            {task.category === cat && <Check size={12} className="text-[#2D6A4F]" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Lock / Unlock Toggle Icon Button */}
              <button
                type="button"
                onClick={handleToggleLock}
                className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FAF3E0] text-[#594230] shadow-2xs border border-[#EADDC7] hover:bg-[#EADDC7] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title={task.isLocked ? "Task is Locked (Fixed Appointment Time)" : "Task is Flexible (Falls into place)"}
              >
                {task.isLocked ? (
                  <Lock size={10} className="text-[#A25F37]" />
                ) : (
                  <Unlock size={10} className="text-[#8C7A6B]" />
                )}
                <span>{task.isLocked ? "Locked" : "Flexible"}</span>
              </button>

              {/* Start Time Selector in Task Title Box */}
              <div className="relative pulldown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("timePicker")}
                  className="pulldown-trigger px-2 py-0.5 rounded-full text-[9px] font-black text-[#594B3E] bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                  title="Dedicated Start Time / Hour Editor (AM/PM)"
                >
                  <Clock size={10} className="text-[#A25F37]" />
                  <span className="font-mono tracking-tight font-extrabold">{formatTime(task.time || "09:00")}</span>
                  <ChevronDown size={9} className="text-[#8C7A6B]" />
                </button>

                <AnimatePresence>
                  {activeDropdown === "timePicker" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1.5 w-60 p-3 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xl shadow-[#3D312A]/15 z-50 space-y-2.5"
                    >
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] border-b border-[#EADDC7]/60 pb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-[#A25F37]" />
                          <span>Start Time Editor (AM/PM)</span>
                        </span>
                        <button type="button" onClick={() => setActiveDropdown(null)}>
                          <X size={12} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold text-[#6B5A4B] uppercase">Select Hour & Minute</label>
                          <span className="text-[10px] font-extrabold text-[#2D6A4F]">{formatTime(editTimeInput)}</span>
                        </div>
                        <input
                          type="time"
                          value={editTimeInput}
                          onChange={(e) => setEditTimeInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#A25F37]"
                        />
                      </div>
                      {/* Quick hour presets */}
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        {["09:00", "11:00", "14:00", "16:30"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditTimeInput(t)}
                            className="px-1 py-1 rounded-lg bg-[#FAF3E0] hover:bg-[#EADDC7] text-[8.5px] font-mono font-extrabold text-[#594B3E] border border-[#EADDC7] cursor-pointer text-center"
                          >
                            {formatTime(t)}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateTask) onUpdateTask({ time: editTimeInput });
                          setActiveDropdown(null);
                        }}
                        className="w-full py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#1B4332] shadow-2xs active:scale-98 transition-all"
                      >
                        Save Start Time
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Priority Pull-Down */}
              <div className="relative pulldown-container">
                <button
                  type="button"
                  onClick={() => toggleDropdown("priority")}
                  className={`pulldown-trigger px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-2xs border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
                  title="Change Priority"
                >
                  <span>{priorityConfig.label}</span>
                  <ChevronDown size={10} />
                </button>

                <AnimatePresence>
                  {activeDropdown === "priority" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1.5 w-44 p-2 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xl shadow-[#3D312A]/15 z-50 space-y-1"
                    >
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-2 py-1 border-b border-[#EADDC7]/60">
                        Select Priority
                      </div>
                      {["high", "medium", "low", "none"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSelectPriority(p)}
                          className={`w-full text-left px-2 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors flex items-center justify-between cursor-pointer ${
                            (task.priority || "none") === p
                              ? "bg-[#EADDC7] text-[#2D2319]"
                              : "hover:bg-[#FAF3E0] text-[#594B3E]"
                          }`}
                        >
                          <span>{p} Priority</span>
                          {(task.priority || "none") === p && <Check size={12} className="text-[#2D6A4F]" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              type="button"
              onClick={onEditTask}
              className="p-1 rounded-lg hover:bg-[#EADDC7]/80 text-[#7A6B5C] hover:text-[#2D2319] transition-all cursor-pointer shrink-0 border border-transparent hover:border-[#EADDC7]"
              title="Edit Task Details"
            >
              <Edit3 size={13} />
            </button>
          </div>

          {/* Task Title Row: Circular Checkbox + Serif Title */}
          <div className="flex items-center gap-3 py-2 min-h-[56px]">
            <button
              type="button"
              onClick={onToggleComplete}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                task.completed
                  ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-2xs"
                  : "border-[#A25F37] hover:border-[#2D6A4F] bg-[#FAF3E0]"
              }`}
              title={task.completed ? "Mark as in progress" : "Mark as completed"}
            >
              {task.completed && <Check size={16} strokeWidth={3} />}
            </button>

            <h2
              onClick={onEditTask}
              className={`text-2xl sm:text-3xl font-serif font-bold tracking-tight cursor-pointer hover:text-[#A25F37] transition-colors leading-snug line-clamp-2 flex-1 ${
                task.completed ? "line-through text-[#8C7A6B]" : "text-[#1F1A16]"
              }`}
              title="Click to edit task title"
            >
              {task.title || "Untitled Task"}
            </h2>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 2. FOCUS MAIN CONTENT: DURATION/COLLAB, SUBTASKS, LOCATION, ACTIONS */}
        {/* ================================================================== */}
        <div className="space-y-2.5 sm:space-y-3 flex-1 min-h-0 overflow-y-auto no-scrollbar">

          {/* ROW 1: DURATION & COLLABORATOR (2 COLUMNS) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* DURATION CARD */}
            <div
              onClick={isWholeBoxActivation ? handleToggleTimer : undefined}
              className={`relative p-2.5 sm:p-3 rounded-2xl bg-[#FFF2DF] text-[#3D312A] border border-[#EADDC7] shadow-xs flex flex-col justify-between transition-all hover:border-[#D8C7AF] hover:shadow-md ${
                isWholeBoxActivation ? "cursor-pointer" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-[#1F1A16] leading-tight">
                    Duration
                  </h3>
                </div>

                {/* Circular Progress Ring */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      stroke="#E5DDD0"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="19"
                      stroke="#2D6A4F"
                      strokeWidth="4"
                      strokeDasharray={119.38}
                      strokeDashoffset={119.38 * (1 - (isStarted || isLocalRunning ? displaySecs / Math.max(1, taskDurationMins * 60) : 0.75))}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono font-black text-xs sm:text-[13px] text-[#1F1A16]">
                      {isStarted || isLocalRunning ? formatHoursMinutesSeconds(displaySecs) : `${taskDurationMins}m`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-[9px] sm:text-[9.5px] font-medium text-[#7A6B5C]">
                  {isStarted || isLocalRunning ? "Focus session active" : `${taskDurationMins} min session`}
                </p>

                {/* Stepper Pill: - 5m + */}
                <div
                  className="flex items-center gap-1 bg-[#FAF3E0] px-2 py-0.5 rounded-full border border-[#EADDC7]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleAdjustDuration(-5)}
                    className="text-[10px] font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-1 active:scale-90 transition-transform"
                    title="Subtract 5 mins"
                  >
                    −
                  </button>
                  <span className="text-[9.5px] font-black text-[#A25F37] px-0.5 font-mono">
                    5m
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdjustDuration(5)}
                    className="text-[10px] font-black text-[#594B3E] hover:text-[#2D2319] cursor-pointer px-1 active:scale-90 transition-transform"
                    title="Add 5 mins"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* COLLABORATOR CARD */}
            <div
              onClick={() => toggleDropdown("collaborator")}
              className="relative p-2.5 sm:p-3 rounded-2xl bg-[#FFF2DF] text-[#3D312A] border border-[#EADDC7] shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#D8C7AF] hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="w-6 h-6 rounded-full bg-[#EAE2D6] text-[#594B3E] flex items-center justify-center shrink-0 shadow-2xs">
                  <Users size={12} strokeWidth={2.5} />
                </div>

                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("collaborator")}
                    className="px-2.5 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[8px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-0.5 cursor-pointer transition-all"
                  >
                    <span>Assign</span>
                  </button>

                  <AnimatePresence>
                    {activeDropdown === "collaborator" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1.5 w-48 p-2.5 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xl shadow-[#3D312A]/15 z-50 space-y-1"
                      >
                        <div className="text-[9px] font-black uppercase tracking-wider text-[#8C7A6B] pb-1 border-b border-[#EADDC7]/60 flex items-center justify-between">
                          <span>Assign Collaborator</span>
                          <button type="button" onClick={() => setActiveDropdown(null)}>
                            <X size={11} />
                          </button>
                        </div>
                        <div className="max-h-36 overflow-y-auto no-scrollbar space-y-0.5">
                          <button
                            type="button"
                            onClick={() => handleSelectCollab("None")}
                            className="w-full text-left px-2 py-1 rounded-xl text-xs font-bold text-[#786C60] hover:bg-[#FAF3E0] cursor-pointer"
                          >
                            None (Unassigned)
                          </button>
                          {allCollaborators.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleSelectCollab(name)}
                              className={`w-full text-left px-2 py-1 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer ${
                                collaboratorValue === name ? "bg-[#EADDC7] text-[#2D2319]" : "hover:bg-[#FAF3E0]"
                              }`}
                            >
                              <span>{name}</span>
                              {collaboratorValue === name && <Check size={11} className="text-[#2D6A4F]" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-2 space-y-0.5">
                <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-[#1F1A16] leading-tight">
                  Collaborator
                </h3>
                <p className="text-xs sm:text-[12.5px] font-bold text-[#1F1A16] leading-tight truncate">
                  {collaboratorValue && collaboratorValue !== "None"
                    ? collaboratorValue
                    : "No Collaborator Assigned"}
                </p>
                <p className="text-[8px] sm:text-[8.5px] font-bold text-[#7A6B5C] uppercase tracking-wider">
                  {collaboratorValue && collaboratorValue !== "None"
                    ? "Assigned Collaborator"
                    : "(TAP TO ASSIGN)"}
                </p>
              </div>
            </div>
          </div>

          {/* ROW 2: SUBTASKS FULL-WIDTH CARD */}
          <div
            onClick={() => setIsSubtaskWindowOpen(true)}
            className="relative p-2.5 sm:p-3 rounded-2xl bg-[#FFF2DF] text-[#3D312A] border border-[#EADDC7] shadow-xs flex flex-col justify-between cursor-pointer hover:border-[#D8C7AF] hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-[#1F1A16] leading-tight">
                  Subtasks
                </h3>
                <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-[#FAF3E0] text-[#594B3E] border border-[#EADDC7]">
                  {completedSubtasksCount}/{subtasks.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSubtaskWindowOpen(true);
                  }}
                  className="px-2 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[8px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-1 cursor-pointer transition-all"
                  title="Expand screen-centered subtask window"
                >
                  <Maximize2 size={8} />
                  <span>Open</span>
                </button>

                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("subtaskPreset")}
                    className="px-2 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[8px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-0.5 cursor-pointer transition-all"
                  >
                    <span>Presets</span>
                    <ChevronDown size={8} />
                  </button>

                <AnimatePresence>
                  {activeDropdown === "subtaskPreset" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 w-56 p-2 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xl z-50 space-y-1"
                    >
                      <div className="text-[9px] font-black uppercase tracking-wider text-[#8C7A6B] border-b border-[#EADDC7]/60 pb-1 flex items-center justify-between">
                        <span>Insert Subtask</span>
                        <button type="button" onClick={() => setActiveDropdown(null)}>
                          <X size={11} />
                        </button>
                      </div>
                      <div className="space-y-0.5 max-h-40 overflow-y-auto no-scrollbar">
                        {COMMON_SUBTASK_PRESETS.map((pst) => (
                          <button
                            key={pst}
                            type="button"
                            onClick={() => {
                              handleAddPresetSubtask(pst);
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-2 py-1 rounded-xl text-[10.5px] font-bold text-[#594B3E] hover:bg-[#FAF3E0] cursor-pointer truncate"
                          >
                            + {pst}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <p className="text-[9px] sm:text-[9.5px] text-[#7A6B5C] font-medium mt-0.5 mb-1.5">
              {completedSubtasksCount}/{subtasks.length} completed
            </p>

            {/* Subtask list preview */}
            <div className="space-y-1">
              {subtasks.length === 0 ? (
                <p className="text-[10px] text-[#8C7A6B] font-bold py-0.5">
                  No subtasks. Tap to open screen-centered editor.
                </p>
              ) : (
                subtasks.slice(0, 2).map((st) => (
                  <div
                    key={st.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSubtaskItem(st.id);
                    }}
                    className="flex items-center gap-2 text-xs font-semibold text-[#2D2319] hover:text-[#000] cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                        st.completed
                          ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                          : "border-[#B09F8C] bg-white hover:border-[#2D6A4F]"
                      }`}
                    >
                      {st.completed && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className={`truncate flex-1 ${st.completed ? "line-through text-[#8C7A6B]" : ""}`}>
                      {st.title}
                    </span>
                  </div>
                ))
              )}
              {subtasks.length > 2 && (
                <p className="text-[9px] text-[#8C7A6B] font-bold mt-1">
                  +{subtasks.length - 2} more (tap to view)
                </p>
              )}
            </div>
          </div>

          {/* ROW 3: LOCATION FULL-WIDTH CARD WITH MAP PREVIEW */}
          <div
            onClick={() => toggleDropdown("location")}
            className={`relative h-28 sm:h-32 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xs cursor-pointer group hover:shadow-md transition-all ${
              activeDropdown === "location" ? "z-40" : "z-10"
            }`}
          >
            {/* Google Maps embed with rounded clipping */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
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
            <div className="relative z-10 p-2.5 flex items-start justify-between">
              <div className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D2319] border border-white/60 shadow-xs">
                <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider">
                  Location
                </span>
              </div>

              {/* Only one Edit pill button on the Maps action box */}
              <div className="relative pulldown-container">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown("location");
                  }}
                  className="pulldown-trigger px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D2319] border border-white/60 text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1 hover:bg-white cursor-pointer active:scale-95 transition-all"
                  title="Edit Location"
                >
                  <span>Edit</span>
                  <ChevronDown size={9} className="text-[#8C7A6B]" />
                </button>

                {/* Pull down menu for locations - expands topmost over other objects */}
                <AnimatePresence>
                  {activeDropdown === "location" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1.5 w-72 sm:w-84 max-w-[calc(100vw-36px)] max-h-[380px] overflow-y-auto p-3 rounded-2xl bg-[#FFF2DF] border-2 border-[#D8C7AF] shadow-2xl shadow-[#3D312A]/30 z-[60] space-y-2.5 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 border-b border-[#EADDC7]/60 pb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-[#A25F37]" />
                          <span>Select Location</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveDropdown(null)}
                          className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2D2319]"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Primary Locations: Editable Home & Work at top of list */}
                      <div className="space-y-1.5">
                        {/* Editable Home Item */}
                        <div className="p-2 rounded-xl bg-[#FFF9F0] border border-[#EADDC7] hover:border-[#D8C7AF] transition-all">
                          {isEditingHome ? (
                            <form onSubmit={handleSaveHomeLocation} className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] font-bold text-[#2D6A4F]">
                                <span className="flex items-center gap-1">
                                  <Home size={10} />
                                  <span>Edit Home Address</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingHome(false)}
                                  className="text-[#8C7A6B] hover:text-[#2D2319]"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                              <input
                                type="text"
                                autoFocus
                                value={editHomeInput}
                                onChange={(e) => setEditHomeInput(e.target.value)}
                                placeholder="Enter home street address..."
                                className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingHome(false)}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold text-[#6B5A4B] bg-[#EADDC7]/60"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#2D6A4F] text-white"
                                >
                                  Save Home
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSelectLocation(homeLocation)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                title="Set task location to Home"
                              >
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#2D6A4F] flex items-center justify-center shrink-0">
                                  <Home size={12} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-black text-[#2D2319]">Home</span>
                                    {task.location === homeLocation && (
                                      <span className="px-1 py-0.2 rounded text-[7.5px] font-extrabold bg-[#2D6A4F] text-white">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[#7A6B5C] truncate">
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
                                className="p-1 rounded-lg hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#2D2319] cursor-pointer"
                                title="Edit Home Address"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Editable Work Item */}
                        <div className="p-2 rounded-xl bg-[#FFF9F0] border border-[#EADDC7] hover:border-[#D8C7AF] transition-all">
                          {isEditingWork ? (
                            <form onSubmit={handleSaveWorkLocation} className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] font-bold text-[#3A86FF]">
                                <span className="flex items-center gap-1">
                                  <Building size={10} />
                                  <span>Edit Work Address</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingWork(false)}
                                  className="text-[#8C7A6B] hover:text-[#2D2319]"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                              <input
                                type="text"
                                autoFocus
                                value={editWorkInput}
                                onChange={(e) => setEditWorkInput(e.target.value)}
                                placeholder="Enter work street address..."
                                className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#3A86FF]"
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingWork(false)}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold text-[#6B5A4B] bg-[#EADDC7]/60"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#2D6A4F] text-white"
                                >
                                  Save Work
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSelectLocation(workLocation)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                title="Set task location to Work"
                              >
                                <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#3A86FF] flex items-center justify-center shrink-0">
                                  <Building size={12} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-black text-[#2D2319]">Work</span>
                                    {task.location === workLocation && (
                                      <span className="px-1 py-0.2 rounded text-[7.5px] font-extrabold bg-[#2D6A4F] text-white">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[#7A6B5C] truncate">
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
                                className="p-1 rounded-lg hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#2D2319] cursor-pointer"
                                title="Edit Work Address"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Other Saved Locations */}
                      {favoriteLocations.filter(
                        (l) => l.toLowerCase() !== homeLocation.toLowerCase() && l.toLowerCase() !== workLocation.toLowerCase()
                      ).length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-[#EADDC7]/60">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-[#8C7A6B]">
                            Other Saved Locations
                          </span>
                          <div className="max-h-24 overflow-y-auto no-scrollbar space-y-1">
                            {favoriteLocations
                              .filter(
                                (l) => l.toLowerCase() !== homeLocation.toLowerCase() && l.toLowerCase() !== workLocation.toLowerCase()
                              )
                              .map((loc) => (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => handleSelectLocation(loc)}
                                  className="w-full text-left px-2 py-1 rounded-lg bg-[#FFF9F0] hover:bg-[#FAF3E0] border border-[#EADDC7] text-xs font-bold text-[#3D312A] flex items-center gap-1.5 cursor-pointer truncate"
                                >
                                  <MapPin size={10} className="text-[#A25F37] shrink-0" />
                                  <span className="truncate">{loc}</span>
                                  {task.location === loc && <Check size={10} className="text-[#2D6A4F] ml-auto shrink-0" />}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Custom address entry form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (customLocationInput.trim()) {
                            handleAddLocation(customLocationInput.trim());
                          }
                        }}
                        className="space-y-1 pt-1 border-t border-[#EADDC7]/60"
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={customLocationInput}
                            onChange={(e) => setCustomLocationInput(e.target.value)}
                            placeholder="Add / Search new address..."
                            className="flex-1 px-2 py-1 text-xs font-semibold rounded-lg border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#A25F37]"
                          />
                          <button
                            type="submit"
                            disabled={!customLocationInput.trim()}
                            className="px-2.5 py-1 rounded-lg bg-[#2D6A4F] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#1B4332] disabled:opacity-40 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </form>

                      {/* Footer: Open full search modal */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDropdown(null);
                          setIsLocationChoicesModalOpen(true);
                        }}
                        className="w-full py-1.5 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[9.5px] font-black uppercase tracking-wider text-[#594B3E] flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <span>Open Full Map Search</span>
                        <ExternalLink size={10} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Pin callout on map */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 shadow-md border border-[#EADDC7] text-[#2D2319]">
                <MapPin size={13} className="text-red-500 fill-red-500 shrink-0" />
                <span className="text-[11px] font-extrabold truncate max-w-[180px]">
                  {task.location && task.location.trim() ? task.location.trim() : "Add Location..."}
                </span>
              </div>
            </div>

            {/* Google watermark bottom-left */}
            <div className="absolute bottom-1.5 left-2 z-10 pointer-events-none">
              <span className="text-[10px] font-black text-[#5F6368]/70 tracking-tight">
                Google
              </span>
            </div>
          </div>

          {/* ROW 4: ACTION CARDS - DOUBLE HEIGHT DAILY TASKS BOX ON LEFT, BRAINSTORM & NOTES ON RIGHT */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {/* Card 1: DOUBLE HEIGHT BOX - TASKS FOR THE DAY (replaces Add Task & Routine) */}
            <div
              className="row-span-2 h-[152px] sm:h-[162px] p-2.5 sm:p-3 rounded-2xl bg-[#FFF2DF] text-[#2D2319] border border-[#EADDC7] shadow-xs flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[#EADDC7]/70 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5.5 h-5.5 rounded-full bg-[#DDF3E8] text-[#2D6A4F] flex items-center justify-center shadow-2xs shrink-0">
                    <CalendarCheck size={11} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-[12.5px] font-black uppercase tracking-wider text-[#2D2319] leading-tight truncate">
                      Tasks For Day
                    </h3>
                    <p className="text-[8px] sm:text-[8.5px] text-[#7A6B5C] font-bold leading-none truncate">
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
                    className="p-1 rounded-lg bg-[#FAF3E0] hover:bg-[#2D6A4F] hover:text-white border border-[#EADDC7] text-[#594B3E] transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Add New Task"
                  >
                    <Plus size={11} strokeWidth={3} />
                  </button>
                )}
              </div>

              {/* Scrollable list of tasks for the day */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 my-1">
                {displayDailyTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-2">
                    <p className="text-[10px] font-bold text-[#8C7A6B]">No tasks scheduled</p>
                    {onAddTask && (
                      <button
                        type="button"
                        onClick={onAddTask}
                        className="mt-1 text-[9px] font-black text-[#2D6A4F] hover:underline uppercase tracking-wider cursor-pointer"
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
                        className={`px-2 py-1 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                          isCurrentTask
                            ? "bg-[#2D6A4F] text-white shadow-2xs font-bold"
                            : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#2D2319]"
                        }`}
                        title={`Focus on "${t.title}"`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              t.completed
                                ? isCurrentTask ? "bg-white" : "bg-[#2D6A4F]"
                                : isCurrentTask ? "bg-emerald-300" : "bg-[#B09F8C]"
                            }`}
                          />
                          <span className={`text-[10.5px] truncate leading-tight ${t.completed ? "line-through opacity-70" : ""}`}>
                            {t.title}
                          </span>
                        </div>
                        <span className={`text-[8.5px] shrink-0 font-bold ${isCurrentTask ? "text-emerald-100" : "text-[#7A6B5C]"}`}>
                          {t.time ? formatTime(t.time) : (t.duration ? `${t.duration}m` : "")}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer hint */}
              <div className="pt-1 border-t border-[#EADDC7]/60 flex items-center justify-between text-[8px] text-[#8C7A6B] font-semibold shrink-0">
                <span>Tap task to focus</span>
                <span className="uppercase tracking-wider font-black text-[#2D6A4F]">Focus Card</span>
              </div>
            </div>

            {/* Card 2: BRAINSTORM (Top Right, h-[72px] sm:h-[76px]) */}
            <div
              onClick={onSequenceBrainstorm}
              className="relative p-2.5 sm:p-3 rounded-2xl bg-[#FFF2DF] text-[#2D2319] border border-[#EADDC7] shadow-xs flex flex-col justify-between cursor-pointer hover:bg-[#FBEBD2] transition-all h-[72px] sm:h-[76px] group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="w-5.5 h-5.5 rounded-full bg-[#EDE9FE] text-[#6B46C1] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Brain size={11} strokeWidth={2.5} />
                </div>

                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("brainstorm")}
                    className="px-2 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[8px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-0.5 cursor-pointer transition-all"
                  >
                    <span>Modes</span>
                    <ChevronDown size={8} />
                  </button>

                  <AnimatePresence>
                    {activeDropdown === "brainstorm" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1.5 w-56 p-2 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xl z-50 space-y-1"
                      >
                        <div className="text-[9px] font-black uppercase tracking-wider text-[#8C7A6B] border-b border-[#EADDC7]/60 pb-1 flex items-center justify-between">
                          <span>Brainstorm Modes</span>
                          <button type="button" onClick={() => setActiveDropdown(null)}>
                            <X size={11} />
                          </button>
                        </div>
                        <div className="space-y-0.5 max-h-40 overflow-y-auto no-scrollbar">
                          {BRAINSTORM_MODES.map((m) => (
                            <button
                              key={m.label}
                              type="button"
                              onClick={() => handleSelectBrainstormMode(m.label)}
                              className="w-full text-left px-2 py-1 rounded-xl text-[10.5px] font-bold text-[#594B3E] hover:bg-[#FAF3E0] flex flex-col cursor-pointer"
                            >
                              <span className="font-extrabold text-[#2D2319]">{m.label}</span>
                              <span className="text-[8.5px] text-[#8C7A6B]">{m.desc}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <h3 className="text-xs sm:text-[12.5px] font-black uppercase tracking-wider text-[#2D2319] leading-tight">
                  Brainstorm
                </h3>
                <p className="text-[8.5px] sm:text-[9px] text-[#7A6B5C] leading-tight mt-0.5">
                  Multi-item entry
                </p>
              </div>
            </div>

            {/* Card 4: NOTES & AI (Warm cream) */}
            <div
              onClick={onQuickNote}
              className="relative p-2.5 sm:p-3 rounded-2xl bg-[#FFF2DF] text-[#3D312A] border border-[#EADDC7] shadow-xs flex flex-col justify-between cursor-pointer hover:bg-[#FBEBD2] transition-all h-[72px] sm:h-[76px] group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="w-5.5 h-5.5 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <FileText size={11} strokeWidth={2.5} />
                </div>

                <div className="relative pulldown-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown("note")}
                    className="px-2 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[8px] font-black uppercase tracking-wider text-[#594B3E] flex items-center gap-0.5 cursor-pointer transition-all"
                  >
                    <span>Templates</span>
                    <ChevronDown size={8} />
                  </button>

                  <AnimatePresence>
                    {activeDropdown === "note" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1.5 w-56 p-2 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] shadow-xl z-50 space-y-1.5"
                      >
                        <div className="text-[9px] font-black uppercase tracking-wider text-[#8C7A6B] border-b border-[#EADDC7]/60 pb-1 flex items-center justify-between">
                          <span>Note Templates</span>
                          <button type="button" onClick={() => setActiveDropdown(null)}>
                            <X size={11} />
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {NOTE_TEMPLATES.map((t) => (
                            <button
                              key={t.label}
                              type="button"
                              onClick={() => handleAppendNoteTemplate(t.text)}
                              className="w-full text-left px-2 py-1 rounded-xl text-[10.5px] font-bold text-[#594B3E] hover:bg-[#FAF3E0] cursor-pointer"
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
                            className="w-full py-1.5 rounded-xl bg-[#FB5607] hover:bg-[#E04D06] text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Bot size={11} />
                            <span>Open Gemini Chat</span>
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <h3 className="text-xs sm:text-[12.5px] font-black uppercase tracking-wider text-[#2D2319] leading-tight">
                  Notes & AI
                </h3>
                <p className="text-[8.5px] sm:text-[9px] text-[#7A6B5C] leading-tight mt-0.5">
                  Capture thoughts
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ================================================================== */}
        {/* 3. BOTTOM ACTION BAR: COMPLETED, EDIT, DELETE, AIBOT IN SAME ROW   */}
        {/* ================================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pt-1">
          {/* Compressed Completed Button */}
          <button
            type="button"
            onClick={onToggleComplete}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 ${
              task.completed
                ? "bg-[#6A994E] hover:bg-[#58813F] text-white"
                : "bg-[#2D6A4F] hover:bg-[#1B4332] text-white"
            }`}
            title={task.completed ? "Task Completed" : "Mark Task Complete"}
          >
            <Check size={14} strokeWidth={3} />
            <span className="truncate">{task.completed ? "Done" : "Completed"}</span>
          </button>

          {/* Compressed Circular Cream Edit Button */}
          <button
            type="button"
            onClick={onEditTask}
            className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#2D2319] border border-[#EADDC7] transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-xs shrink-0"
            title="Edit Task Details"
            aria-label="Edit Task"
          >
            <Edit3 size={14} />
          </button>

          {/* Compressed Circular Pink Trash Button */}
          <button
            type="button"
            onClick={onDeleteTask}
            className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-[#FEECEB] hover:bg-[#FCDAD7] text-[#E07A5F] border border-[#F5C2C0] transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-xs shrink-0"
            title="Delete Task"
            aria-label="Delete Task"
          >
            <Trash2 size={14} />
          </button>

          {/* AI Bot Button on the Same Row */}
          {onOpenChatbot && (
            <button
              id="graphics-action-row-ai-chatbot-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChatbot();
              }}
              className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center justify-center shadow-md active:scale-95 cursor-pointer shrink-0 border border-white/30 relative transition-all group ${
                isChatbotOpen ? "ring-2 ring-purple-400 scale-[1.04]" : ""
              }`}
              title="Gemini A.I Chatbot"
              aria-label="Gemini A.I Chatbot"
            >
              <Sparkles size={15} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] animate-pulse shrink-0 transition-transform group-hover:scale-110" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
              </span>
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

      </div>
    </motion.div>
  );
};
