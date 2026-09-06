import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FileText,
  Sparkles,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Edit3,
  Copy,
  Check,
  User,
  MapPin,
  Clock,
  ShoppingBag,
  CheckSquare,
  RefreshCw,
  Tag,
  ArrowUpDown,
  Bot,
  Columns,
  Eye,
  EyeOff,
  GripVertical,
  ArrowRightCircle,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  ArrowLeft,
  Target,
  Maximize2,
  Minimize2,
  BookOpen,
  Magnet,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  MoveVertical,
  Zap,
  Crosshair
} from "lucide-react";
import { AppNote, Task, Routine } from "../types";
import { getLocalDateString } from "../utils/timeHelpers";

export type ScrollSnapMode = "ratchet" | "soft" | "free";

export type NoteColumnId =
  | "actions"
  | "detail"
  | "collaborator"
  | "project"
  | "location"
  | "timeDate"
  | "linkedTask"
  | "title";

export interface ColumnConfig {
  id: NoteColumnId;
  label: string;
  minWidth: string;
  defaultWidth?: string;
  sortField?: "createdAt" | "title" | "project" | "collaborator" | "location";
  canHide?: boolean;
}

const ALL_COLUMNS: ColumnConfig[] = [
  { id: "actions", label: "Actions", minWidth: "115px", defaultWidth: "120px", canHide: true },
  { id: "detail", label: "Note Detail", minWidth: "260px", defaultWidth: "45%", canHide: false },
  { id: "collaborator", label: "Collaborator", minWidth: "115px", defaultWidth: "125px", sortField: "collaborator", canHide: true },
  { id: "project", label: "Project", minWidth: "105px", defaultWidth: "115px", sortField: "project", canHide: true },
  { id: "location", label: "Location", minWidth: "100px", defaultWidth: "110px", sortField: "location", canHide: true },
  { id: "timeDate", label: "Time & Date", minWidth: "110px", defaultWidth: "120px", sortField: "createdAt", canHide: true },
  { id: "linkedTask", label: "Linked Task", minWidth: "115px", defaultWidth: "125px", canHide: true },
  { id: "title", label: "Summary / Title", minWidth: "140px", defaultWidth: "160px", sortField: "title", canHide: true },
];

const DEFAULT_COLUMN_ORDER: NoteColumnId[] = [
  "actions",
  "detail",
  "collaborator",
  "project",
  "location",
  "timeDate",
  "linkedTask",
  "title"
];

interface NotesRepositoryProps {
  notes: AppNote[];
  onSaveNotes: (updatedNotes: AppNote[]) => void;
  tasks: Task[];
  onAddTask?: (task: Task) => void;
  onSaveTasks?: (tasks: Task[]) => void;
  selectedDate?: string;
  routines: Routine[];
  categories: string[];
  collaborators: string[];
  favoriteLocations: string[];
  spendingVendors: string[];
  onAddNewCategory?: (name: string) => void;
  onAddNewCollaborator?: (name: string) => void;
  onAddLocation?: (name: string) => void;
  onAddSpendingVendor?: (name: string) => void;
  isDark: boolean;
  onClose?: () => void;
  onNavigateToView?: (view: "deck" | "timeline" | "focus") => void;
  triggerHaptic: (style?: "light" | "medium" | "heavy") => void;
  showDragToast: (msg: string, type?: "success" | "warning" | "info") => void;
  onExportNotesPDF?: () => void;
  renderTextWithLinks?: (text: string) => React.ReactNode;
}

// Helper to strip time/date data from raw note text so the detail column displays pure content
const cleanNoteDetailText = (text: string | undefined): string => {
  if (!text) return "";
  let cleaned = text;
  // Remove bracketed timestamp prefixes like [8/31/2026 5:30 PM] or [2026-08-31 18:00] or [Mon, Aug 31, 2026, 14:00]
  cleaned = cleaned.replace(/^\[\s*\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[^\]]*\]\s*/i, "");
  cleaned = cleaned.replace(/^\[\s*(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)[^\]]*\]\s*/i, "");
  cleaned = cleaned.replace(/^\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?[^\]]*\]\s*/i, "");
  // Remove non-bracketed timestamps like "2026-08-31 18:00 - " or "8/31/2026, 6:00 PM: "
  cleaned = cleaned.replace(/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,\s]+(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?\s*[-:]\s*/i, "");
  return cleaned.trim() || text;
};

export const NotesRepository: React.FC<NotesRepositoryProps> = ({
  notes,
  onSaveNotes,
  tasks,
  onAddTask,
  onSaveTasks,
  selectedDate,
  routines,
  categories,
  collaborators,
  favoriteLocations,
  spendingVendors,
  onAddNewCategory,
  onAddNewCollaborator,
  onAddLocation,
  onAddSpendingVendor,
  isDark,
  onClose,
  onNavigateToView,
  triggerHaptic,
  showDragToast,
  onExportNotesPDF,
  renderTextWithLinks
}) => {
  // Search & Filter states (Filter pull-downs at top, search bar above results)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollab, setSelectedCollab] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Column Customization: Order & Visibility state persisted to localStorage
  const [columnOrder, setColumnOrder] = useState<NoteColumnId[]>(() => {
    try {
      const saved = localStorage.getItem("taskpass_notes_col_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all default columns exist in parsed order
          const existingIds = new Set(parsed);
          const completeOrder = [...parsed];
          DEFAULT_COLUMN_ORDER.forEach((id) => {
            if (!existingIds.has(id)) {
              completeOrder.push(id);
            }
          });
          return completeOrder;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMN_ORDER;
  });

  const [hiddenColumns, setHiddenColumns] = useState<NoteColumnId[]>(() => {
    try {
      const saved = localStorage.getItem("taskpass_notes_hidden_cols");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Scroll Snap & Ratchet State (persisted to localStorage)
  const [scrollSnapMode, setScrollSnapMode] = useState<ScrollSnapMode>(() => {
    try {
      const saved = localStorage.getItem("taskpass_notes_scroll_snap_mode");
      if (saved === "ratchet" || saved === "soft" || saved === "free") return saved;
    } catch {
      // ignore
    }
    return "ratchet"; // Default to crisp ratchet snap
  });

  const [showScrollSnapMenu, setShowScrollSnapMenu] = useState(false);
  const [enableWheelRatchet, setEnableWheelRatchet] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("taskpass_notes_wheel_ratchet");
      if (saved !== null) return saved !== "false";
    } catch {
      // ignore
    }
    return true;
  });

  // Table Scroll Container Ref
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Save scroll snap settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("taskpass_notes_scroll_snap_mode", scrollSnapMode);
    } catch {
      // ignore
    }
  }, [scrollSnapMode]);

  useEffect(() => {
    try {
      localStorage.setItem("taskpass_notes_wheel_ratchet", String(enableWheelRatchet));
    } catch {
      // ignore
    }
  }, [enableWheelRatchet]);

  // Ratchet scroll navigation helper for discrete stepped jumps
  const ratchetScroll = (direction: "left" | "right" | "up" | "down" | "detail" | "home" | "end") => {
    const container = tableContainerRef.current;
    if (!container) return;

    if (direction === "home") {
      container.scrollTo({ left: 0, top: 0, behavior: "smooth" });
      triggerHaptic("light");
      return;
    }
    if (direction === "end") {
      container.scrollTo({ left: container.scrollWidth, top: container.scrollHeight, behavior: "smooth" });
      triggerHaptic("light");
      return;
    }

    if (direction === "detail") {
      const detailTh = container.querySelector<HTMLElement>('th[data-col-id="detail"]');
      if (detailTh) {
        container.scrollTo({ left: Math.max(0, detailTh.offsetLeft - 10), behavior: "smooth" });
      } else {
        container.scrollTo({ left: 120, behavior: "smooth" });
      }
      triggerHaptic("medium");
      return;
    }

    if (direction === "left" || direction === "right") {
      const thElements = Array.from(container.querySelectorAll<HTMLElement>("thead th"));
      if (thElements.length === 0) {
        const step = 200;
        container.scrollBy({ left: direction === "right" ? step : -step, behavior: "smooth" });
      } else {
        const currentLeft = container.scrollLeft;
        const colOffsets = thElements.map((th) => th.offsetLeft);
        if (direction === "right") {
          const nextOffset = colOffsets.find((off) => off > currentLeft + 8);
          container.scrollTo({ left: nextOffset !== undefined ? nextOffset : container.scrollWidth, behavior: "smooth" });
        } else {
          const prevOffsets = colOffsets.filter((off) => off < currentLeft - 8);
          const prevOffset = prevOffsets.length > 0 ? prevOffsets[prevOffsets.length - 1] : 0;
          container.scrollTo({ left: Math.max(0, prevOffset), behavior: "smooth" });
        }
      }
      triggerHaptic("light");
      return;
    }

    if (direction === "up" || direction === "down") {
      const trElements = Array.from(container.querySelectorAll<HTMLElement>("tbody tr"));
      if (trElements.length === 0) {
        const step = 55;
        container.scrollBy({ top: direction === "down" ? step : -step, behavior: "smooth" });
      } else {
        const currentTop = container.scrollTop;
        const rowOffsets = trElements.map((tr) => tr.offsetTop - 36);
        if (direction === "down") {
          const nextOffset = rowOffsets.find((off) => off > currentTop + 6);
          container.scrollTo({ top: nextOffset !== undefined ? nextOffset : container.scrollHeight, behavior: "smooth" });
        } else {
          const prevOffsets = rowOffsets.filter((off) => off < currentTop - 6);
          const prevOffset = prevOffsets.length > 0 ? prevOffsets[prevOffsets.length - 1] : 0;
          container.scrollTo({ top: Math.max(0, prevOffset), behavior: "smooth" });
        }
      }
      triggerHaptic("light");
      return;
    }
  };

  // Wheel Ratchet Stepper effect: Stepped quantization on mouse wheel / touchpad for crisp notched ratchet feel
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container || scrollSnapMode !== "ratchet" || !enableWheelRatchet) return;

    let wheelTimeout: NodeJS.Timeout | null = null;
    let accumulatedDeltaY = 0;
    let accumulatedDeltaX = 0;
    const ROW_STEP_THRESHOLD = 35;
    const COL_STEP_THRESHOLD = 40;

    const handleWheel = (e: WheelEvent) => {
      // Don't intercept if modifier key is pressed (e.g. zooming)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      accumulatedDeltaY += e.deltaY;
      accumulatedDeltaX += e.deltaX;

      if (wheelTimeout) clearTimeout(wheelTimeout);

      if (Math.abs(accumulatedDeltaY) >= ROW_STEP_THRESHOLD) {
        if (accumulatedDeltaY > 0) {
          ratchetScroll("down");
        } else {
          ratchetScroll("up");
        }
        accumulatedDeltaY = 0;
        accumulatedDeltaX = 0;
      } else if (Math.abs(accumulatedDeltaX) >= COL_STEP_THRESHOLD) {
        if (accumulatedDeltaX > 0) {
          ratchetScroll("right");
        } else {
          ratchetScroll("left");
        }
        accumulatedDeltaY = 0;
        accumulatedDeltaX = 0;
      }

      wheelTimeout = setTimeout(() => {
        accumulatedDeltaY = 0;
        accumulatedDeltaX = 0;
      }, 140);
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [scrollSnapMode, enableWheelRatchet]);

  // Note to delete for confirmation dialog
  const [noteToDelete, setNoteToDelete] = useState<AppNote | null>(null);

  // Drag & Drop Column Repositioning state
  const [draggedColId, setDraggedColId] = useState<NoteColumnId | null>(null);
  const [dragOverColId, setDragOverColId] = useState<NoteColumnId | null>(null);
  const [dragDropSide, setDragDropSide] = useState<"before" | "after">("before");

  // Save column configuration changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("taskpass_notes_col_order", JSON.stringify(columnOrder));
    } catch {
      // ignore
    }
  }, [columnOrder]);

  useEffect(() => {
    try {
      localStorage.setItem("taskpass_notes_hidden_cols", JSON.stringify(hiddenColumns));
    } catch {
      // ignore
    }
  }, [hiddenColumns]);

  // Sorting state
  const [sortField, setSortField] = useState<"createdAt" | "title" | "project" | "collaborator" | "location">("createdAt");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Editing note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editRawText, setEditRawText] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editCollaborator, setEditCollaborator] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editTaskId, setEditTaskId] = useState("");
  const [editRoutineId, setEditRoutineId] = useState("");
  const [editCreatedAt, setEditCreatedAt] = useState("");
  const [isEditContentExpanded, setIsEditContentExpanded] = useState<boolean>(false);

  // Large-scale Reading Expansion State (takes ~80% of screen while maintaining border banners)
  const [expandedNoteForReading, setExpandedNoteForReading] = useState<AppNote | null>(null);
  const [copiedReadingContent, setCopiedReadingContent] = useState<boolean>(false);

  // Quick Add Note modal/form in repository
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteProject, setNewNoteProject] = useState("");
  const [newNoteCollab, setNewNoteCollab] = useState("");
  const [newNoteLoc, setNewNoteLoc] = useState("");
  const [newNoteTime, setNewNoteTime] = useState("");
  const [newNoteTaskId, setNewNoteTaskId] = useState("");

  // Convert Note to Task Modal State
  const [convertingNote, setConvertingNote] = useState<AppNote | null>(null);
  const [convertTaskTitle, setConvertTaskTitle] = useState("");
  const [convertTaskDate, setConvertTaskDate] = useState("");
  const [convertTaskDuration, setConvertTaskDuration] = useState("30 min");
  const [convertTaskTime, setConvertTaskTime] = useState("");
  const [convertTaskIsLocked, setConvertTaskIsLocked] = useState(false);
  const [convertTaskProject, setConvertTaskProject] = useState("");
  const [convertTaskCollaborator, setConvertTaskCollaborator] = useState("");
  const [convertTaskLocation, setConvertTaskLocation] = useState("");
  const [convertTaskPriority, setConvertTaskPriority] = useState<"none" | "low" | "medium" | "high">("none");
  const [convertTaskNotes, setConvertTaskNotes] = useState("");

  // Open Convert Note to Task prompt
  const handleOpenConvertToTask = (note: AppNote) => {
    setConvertingNote(note);
    const detailClean = cleanNoteDetailText(note.rawText);
    setConvertTaskTitle(note.title || (detailClean.length > 50 ? detailClean.substring(0, 47) + "..." : detailClean) || "Task from Note");
    setConvertTaskDate(selectedDate || getLocalDateString());
    setConvertTaskDuration("30 min");
    setConvertTaskTime(note.time || "");
    setConvertTaskIsLocked(Boolean(note.time));
    setConvertTaskProject(note.project && note.project !== "General" ? note.project : "General");
    setConvertTaskCollaborator(note.collaborator && note.collaborator !== "None" ? note.collaborator : "");
    setConvertTaskLocation(note.location || "");
    setConvertTaskPriority("none");
    setConvertTaskNotes(detailClean);
    triggerHaptic("light");
  };

  // Execute Convert Note to Task
  const handleExecuteConvertToTask = (mode: "move" | "copy") => {
    if (!convertingNote) return;

    const targetDate = convertTaskDate || selectedDate || getLocalDateString();
    const isLocked = convertTaskIsLocked && Boolean(convertTaskTime.trim());

    const newTask: Task = {
      id: "task_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title: convertTaskTitle.trim() || convertingNote.title || "Task from Note",
      date: targetDate,
      time: isLocked ? convertTaskTime.trim() : "",
      duration: convertTaskDuration || "30 min",
      isLocked: isLocked,
      completed: false,
      category: convertTaskProject && convertTaskProject !== "General" ? convertTaskProject.trim() : undefined,
      collaborator: convertTaskCollaborator && convertTaskCollaborator !== "None" ? convertTaskCollaborator.trim() : undefined,
      location: convertTaskLocation.trim() || undefined,
      priority: convertTaskPriority !== "none" ? convertTaskPriority : undefined,
      notes: convertTaskNotes.trim() || undefined,
      computedTime: isLocked ? convertTaskTime.trim() : undefined,
      isFlexible: !isLocked,
      lastModified: Date.now()
    };

    // 1. Dispatch new Task
    if (onAddTask) {
      onAddTask(newTask);
    } else if (onSaveTasks) {
      onSaveTasks([newTask, ...tasks]);
    }

    // 2. Handle Note according to conversion mode:
    if (mode === "move") {
      // Send note fully to tasks (Remove note from repository)
      const updatedNotes = notes.filter((n) => n.id !== convertingNote.id);
      onSaveNotes(updatedNotes);
      showDragToast(`Note moved & converted to task for ${targetDate}`, "success");
    } else {
      // Duplicate and send to tasks (Keep note in repository, link taskId)
      const updatedNotes = notes.map((n) => {
        if (n.id === convertingNote.id) {
          return {
            ...n,
            associatedTaskId: newTask.id,
            updatedAt: Date.now()
          };
        }
        return n;
      });
      onSaveNotes(updatedNotes);
      showDragToast(`Note duplicated & added to tasks for ${targetDate}`, "success");
    }

    triggerHaptic("medium");
    setConvertingNote(null);
  };

  // Copy note content helper
  const handleCopyNote = (note: AppNote) => {
    const detailCleaned = cleanNoteDetailText(note.rawText);
    const textToCopy = `[${note.title || "Note"}]\n${detailCleaned}\nProject: ${note.project || "General"} | Collaborator: ${note.collaborator || "None"} | Location: ${note.location || "None"}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedNoteId(note.id);
      triggerHaptic("light");
      showDragToast("Copied note to clipboard", "success");
      setTimeout(() => setCopiedNoteId(null), 2000);
    }
  };

  // Start editing a note
  const handleStartEdit = (note: AppNote) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title || "");
    setEditRawText(note.rawText || "");
    setEditProject(note.project || "");
    setEditCollaborator(note.collaborator || "");
    setEditLocation(note.location || "");
    setEditVendor(note.vendor || "");
    setEditTime(note.time || "");
    setEditTaskId(note.associatedTaskId || "");
    setEditRoutineId(note.associatedRoutineId || "");

    const d = new Date(note.createdAt || Date.now());
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEditCreatedAt(localIso);
    triggerHaptic("light");
  };

  // Save edited note
  const handleSaveEdit = () => {
    if (!editingNoteId) return;
    const parsedTime = editCreatedAt ? new Date(editCreatedAt).getTime() : Date.now();

    const updated = notes.map((n) => {
      if (n.id === editingNoteId) {
        return {
          ...n,
          title: editTitle.trim() || n.title || "Note",
          rawText: editRawText.trim() || n.rawText,
          project: editProject.trim() || "General",
          collaborator: editCollaborator.trim() || "None",
          location: editLocation.trim(),
          vendor: editVendor.trim(),
          time: editTime.trim(),
          associatedTaskId: editTaskId,
          associatedRoutineId: editRoutineId,
          createdAt: parsedTime,
          updatedAt: Date.now()
        };
      }
      return n;
    });

    onSaveNotes(updated);
    setEditingNoteId(null);
    triggerHaptic("medium");
    showDragToast("Note attributes updated in repository", "success");
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    onSaveNotes(updated);
    triggerHaptic("medium");
    showDragToast("Note removed from repository", "info");
  };

  // Create new note
  const handleCreateNote = () => {
    if (!newNoteText.trim() && !newNoteTitle.trim()) {
      showDragToast("Please enter some text for the note", "warning");
      return;
    }

    const rawContent = newNoteText.trim();
    const title = newNoteTitle.trim() || (rawContent.length > 40 ? rawContent.substring(0, 37) + "..." : rawContent) || "Note";

    const newNote: AppNote = {
      id: "note_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title: title.startsWith("Log:") ? title : title,
      rawText: rawContent,
      project: newNoteProject.trim() || "General",
      collaborator: newNoteCollab.trim() || "None",
      location: newNoteLoc.trim(),
      time: newNoteTime.trim(),
      associatedTaskId: newNoteTaskId,
      createdAt: Date.now(),
      source: "manual"
    };

    onSaveNotes([newNote, ...notes]);
    setNewNoteTitle("");
    setNewNoteText("");
    setNewNoteProject("");
    setNewNoteCollab("");
    setNewNoteLoc("");
    setNewNoteTime("");
    setNewNoteTaskId("");
    setShowAddForm(false);
    triggerHaptic("medium");
    showDragToast("Created new note in repository", "success");
  };

  // Column Visibility Toggle
  const toggleColumnVisibility = (colId: NoteColumnId) => {
    if (hiddenColumns.includes(colId)) {
      setHiddenColumns(hiddenColumns.filter((id) => id !== colId));
      triggerHaptic("light");
    } else {
      // Ensure at least one column remains visible
      const visibleCols = columnOrder.filter((id) => !hiddenColumns.includes(id));
      if (visibleCols.length <= 1) {
        showDragToast("At least one column must remain visible", "warning");
        return;
      }
      setHiddenColumns([...hiddenColumns, colId]);
      triggerHaptic("light");
    }
  };

  // Column Drag & Drop Reorder Handlers
  const handleColumnDragStart = (e: React.DragEvent, colId: NoteColumnId) => {
    e.dataTransfer.setData("text/plain", colId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedColId(colId);
    triggerHaptic("light");
  };

  const handleColumnDragOver = (e: React.DragEvent, colId: NoteColumnId) => {
    e.preventDefault();
    if (draggedColId && draggedColId !== colId) {
      const targetRect = e.currentTarget.getBoundingClientRect();
      const relativeX = e.clientX - targetRect.left;
      const isAfter = relativeX > targetRect.width / 2;
      setDragOverColId(colId);
      setDragDropSide(isAfter ? "after" : "before");
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColId(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColId: NoteColumnId) => {
    e.preventDefault();
    const sourceColId = (e.dataTransfer.getData("text/plain") as NoteColumnId) || draggedColId;
    if (!sourceColId || sourceColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const currentOrder = [...columnOrder];
    const sourceIdx = currentOrder.indexOf(sourceColId);
    if (sourceIdx === -1) return;

    // Remove source
    currentOrder.splice(sourceIdx, 1);

    // Insert target
    let targetIdx = currentOrder.indexOf(targetColId);
    if (dragDropSide === "after") {
      targetIdx += 1;
    }
    currentOrder.splice(targetIdx, 0, sourceColId);

    setColumnOrder(currentOrder);
    setDraggedColId(null);
    setDragOverColId(null);
    triggerHaptic("medium");
    showDragToast("Column order updated", "info");
  };

  // Move Column Up/Down in Menu
  const moveColumnInMenu = (colId: NoteColumnId, direction: "up" | "down") => {
    const idx = columnOrder.indexOf(colId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columnOrder.length) return;

    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(newIdx, 0, moved);
    setColumnOrder(newOrder);
    triggerHaptic("light");
  };

  // Reset Columns to Default
  const handleResetColumns = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setHiddenColumns([]);
    triggerHaptic("medium");
    showDragToast("Reset columns to default layout", "info");
  };

  // Active Visible Columns in Order
  const visibleColumns = useMemo(() => {
    const colMap = new Map(ALL_COLUMNS.map((c) => [c.id, c]));
    return columnOrder
      .filter((id) => !hiddenColumns.includes(id))
      .map((id) => colMap.get(id))
      .filter((c): c is ColumnConfig => Boolean(c));
  }, [columnOrder, hiddenColumns]);

  // Filtered notes calculation
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // 1. Keyword search across all columns
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (n.title || "").toLowerCase().includes(q);
        const matchesText = (n.rawText || "").toLowerCase().includes(q);
        const matchesProject = (n.project || "").toLowerCase().includes(q);
        const matchesCollab = (n.collaborator || "").toLowerCase().includes(q);
        const matchesLoc = (n.location || "").toLowerCase().includes(q);
        const matchesVen = (n.vendor || "").toLowerCase().includes(q);
        const matchesTime = (n.time || "").toLowerCase().includes(q);

        let matchesTask = false;
        if (n.associatedTaskId) {
          const t = tasks.find((item) => item.id === n.associatedTaskId);
          if (t && t.title.toLowerCase().includes(q)) matchesTask = true;
        }

        let matchesRoutine = false;
        if (n.associatedRoutineId) {
          const r = routines.find((item) => item.id === n.associatedRoutineId);
          if (r && r.name.toLowerCase().includes(q)) matchesRoutine = true;
        }

        if (!matchesTitle && !matchesText && !matchesProject && !matchesCollab && !matchesLoc && !matchesVen && !matchesTime && !matchesTask && !matchesRoutine) {
          return false;
        }
      }

      // 2. Collaborator Dropdown Filter
      if (selectedCollab !== "all") {
        if (selectedCollab === "none") {
          if (n.collaborator && n.collaborator !== "None" && n.collaborator !== "No Collaborator") return false;
        } else {
          if (n.collaborator !== selectedCollab) return false;
        }
      }

      // 3. Project Dropdown Filter
      if (selectedProject !== "all") {
        if (selectedProject === "General") {
          if (n.project && n.project !== "General") return false;
        } else {
          if (n.project !== selectedProject) return false;
        }
      }

      return true;
    });
  }, [notes, searchQuery, selectedCollab, selectedProject, tasks, routines]);

  // Sorted notes (Flat Table)
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdAt") {
        comparison = (b.createdAt || 0) - (a.createdAt || 0);
      } else if (sortField === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortField === "project") {
        comparison = (a.project || "").localeCompare(b.project || "");
      } else if (sortField === "collaborator") {
        comparison = (a.collaborator || "").localeCompare(b.collaborator || "");
      } else if (sortField === "location") {
        comparison = (a.location || "").localeCompare(b.location || "");
      }
      return sortAsc ? -comparison : comparison;
    });
  }, [filteredNotes, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    triggerHaptic("light");
  };

  // Distinct collaborators and projects for dropdown options
  const distinctCollaborators = useMemo(() => {
    const set = new Set<string>();
    collaborators.forEach((c) => {
      if (c && c !== "None" && c !== "No Collaborator") set.add(c);
    });
    notes.forEach((n) => {
      if (n.collaborator && n.collaborator !== "None" && n.collaborator !== "No Collaborator") set.add(n.collaborator);
    });
    return Array.from(set).sort();
  }, [collaborators, notes]);

  const distinctProjects = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((cat) => {
      if (cat) set.add(cat);
    });
    notes.forEach((n) => {
      if (n.project) set.add(n.project);
    });
    return Array.from(set).sort();
  }, [categories, notes]);

  // Helper to render cell content according to column ID
  const renderCellContent = (colId: NoteColumnId, note: AppNote) => {
    const detailCleaned = cleanNoteDetailText(note.rawText);
    const createdDateFormatted = new Date(note.createdAt || Date.now()).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const createdTimeFormatted = new Date(note.createdAt || Date.now()).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
    const linkedTask = tasks.find((t) => t.id === note.associatedTaskId);
    const linkedRoutine = routines.find((r) => r.id === note.associatedRoutineId);
    const isAICaptured =
      note.source === "chatbot" ||
      (note.title || "").toLowerCase().includes("chatbot") ||
      (note.rawText || "").toLowerCase().includes("chatbot");

    switch (colId) {
      case "actions":
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => handleCopyNote(note)}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                copiedNoteId === note.id
                  ? "text-emerald-400 bg-emerald-500/20"
                  : isDark
                  ? "text-slate-400 hover:text-white hover:bg-white/10"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title="Copy Note Content"
            >
              {copiedNoteId === note.id ? <Check size={12.5} /> : <Copy size={12.5} />}
            </button>

            <button
              type="button"
              onClick={() => handleOpenConvertToTask(note)}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                isDark
                  ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              }`}
              title="Convert Note to Task"
            >
              <CheckSquare size={12.5} />
            </button>

            <button
              type="button"
              onClick={() => handleStartEdit(note)}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                isDark ? "text-indigo-400 hover:bg-indigo-500/20" : "text-indigo-600 hover:bg-indigo-50"
              }`}
              title="Edit Note Attributes"
            >
              <Edit3 size={12.5} />
            </button>

            <button
              type="button"
              onClick={() => setNoteToDelete(note)}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                isDark ? "text-rose-400 hover:bg-rose-500/20" : "text-rose-600 hover:bg-rose-50"
              }`}
              title="Delete Note"
            >
              <Trash2 size={12.5} />
            </button>
          </div>
        );

      case "detail":
        return (
          <div className="space-y-1 max-w-full group/detail">
            <div className="flex items-start justify-between gap-1.5">
              <p className="text-[11.5px] leading-snug break-words font-medium flex-1 line-clamp-3">
                {renderTextWithLinks ? renderTextWithLinks(detailCleaned) : detailCleaned}
              </p>
              <button
                type="button"
                onClick={() => {
                  setExpandedNoteForReading(note);
                  if (triggerHaptic) triggerHaptic("light");
                }}
                className={`shrink-0 p-1 rounded-md transition-all cursor-pointer opacity-70 group-hover/detail:opacity-100 hover:scale-105 ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-white/10"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                }`}
                title="Expand Note Content for Easy Reading"
              >
                <Maximize2 size={11} />
              </button>
            </div>
            {note.vendor && (
              <div className="flex items-center gap-1 text-[9px] text-amber-400 font-bold">
                <ShoppingBag size={9.5} />
                <span>Vendor: {note.vendor}</span>
              </div>
            )}
          </div>
        );

      case "collaborator":
        return note.collaborator && note.collaborator !== "None" && note.collaborator !== "No Collaborator" ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold ${
            isDark ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20" : "bg-indigo-100 text-indigo-800"
          }`}>
            <User size={9.5} />
            <span className="truncate max-w-[100px]">{note.collaborator}</span>
          </span>
        ) : (
          <span className="text-[9.5px] text-slate-500 italic">— None —</span>
        );

      case "project":
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase ${
            isDark ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-emerald-100 text-emerald-800"
          }`}>
            <Tag size={8.5} />
            <span className="truncate max-w-[95px]">{note.project || "General"}</span>
          </span>
        );

      case "location":
        return note.location ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold ${
            isDark ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" : "bg-rose-100 text-rose-800"
          }`}>
            <MapPin size={9.5} />
            <span className="truncate max-w-[85px]" title={note.location}>{note.location}</span>
          </span>
        ) : (
          <span className="text-[9.5px] text-slate-500 italic">—</span>
        );

      case "timeDate":
        return (
          <div className="space-y-0.2 leading-tight">
            {note.time && (
              <div className="flex items-center gap-1 text-[9.5px] font-bold text-amber-400">
                <Clock size={9} />
                <span>{note.time}</span>
              </div>
            )}
            <div className="text-[9px] text-slate-400 font-mono">
              {createdDateFormatted}
            </div>
            <div className="text-[8px] text-slate-500 font-mono">
              {createdTimeFormatted}
            </div>
          </div>
        );

      case "linkedTask":
        return (
          <div className="space-y-0.5">
            {linkedTask ? (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                isDark ? "bg-amber-500/15 text-amber-300 border border-amber-500/20" : "bg-amber-100 text-amber-900"
              }`} title={`Linked Task: ${linkedTask.title} (${linkedTask.date})`}>
                <CheckSquare size={9.5} className="shrink-0" />
                <span className="truncate max-w-[95px]">{linkedTask.title}</span>
              </div>
            ) : linkedRoutine ? (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                isDark ? "bg-purple-500/15 text-purple-300 border border-purple-500/20" : "bg-purple-100 text-purple-900"
              }`} title={`Linked Routine: ${linkedRoutine.name}`}>
                <RefreshCw size={9.5} className="shrink-0" />
                <span className="truncate max-w-[95px]">{linkedRoutine.name}</span>
              </div>
            ) : (
              <span className="text-[9px] text-slate-500 italic">— Unlinked —</span>
            )}
          </div>
        );

      case "title":
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              {isAICaptured ? (
                <span title="Captured from AI Chatbot"><Sparkles size={11} className="text-purple-400 shrink-0" /></span>
              ) : (
                <FileText size={11} className="text-indigo-400 shrink-0" />
              )}
              <span className="font-extrabold tracking-tight line-clamp-2 text-[11px]">
                {note.title || "Note"}
              </span>
            </div>
            {isAICaptured && (
              <span className={`inline-flex items-center gap-0.5 text-[7px] font-black uppercase px-1 py-0.2 rounded-full ${
                isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-800"
              }`}>
                <Bot size={7.5} /> AI
              </span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2.5 text-left w-full max-w-full overflow-x-hidden font-sans flex flex-col h-full">
      {/* Return to Workspace / Panel Navigation Bar */}
      {(onNavigateToView || onClose) && (
        <div className={`p-2 px-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 shadow-xs shrink-0 ${
          isDark ? "bg-slate-900/95 border-indigo-500/25 text-slate-100" : "bg-indigo-50/80 border-indigo-200 text-slate-800"
        }`}>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  triggerHaptic("medium");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10 hover:border-indigo-400/50"
                    : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                }`}
                title="Exit Notes Repository and return to workspace"
              >
                <ArrowLeft size={13} className="text-indigo-400" />
                <span>Return to Workspace</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-white/10 text-[11px] font-bold text-slate-400">
              <span>Switch Panel:</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onNavigateToView && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToView("deck");
                    triggerHaptic("medium");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Go directly to Tasks Deck Panel"
                >
                  <CheckSquare size={13} />
                  <span>Tasks Panel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToView("timeline");
                    triggerHaptic("medium");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Go directly to Timeline Panel"
                >
                  <Clock size={13} />
                  <span>Timeline Panel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToView("focus");
                    triggerHaptic("heavy");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Go directly to Focus Mode"
                >
                  <Target size={13} />
                  <span className="hidden sm:inline">Focus Panel</span>
                </button>
              </>
            )}
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  triggerHaptic("light");
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Notes Repository"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Header: Filters, Column Customization, & Actions */}
      <div className={`p-2 sm:p-2.5 rounded-2xl border shadow-xs ${
        isDark ? "bg-slate-900/90 border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Filter Pull-Down Menus */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Filter by Collaborator Pull-Down Menu */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                <User size={11} /> Collab:
              </span>
              <div className="relative min-w-[125px]">
                <select
                  value={selectedCollab}
                  onChange={(e) => {
                    setSelectedCollab(e.target.value);
                    triggerHaptic("light");
                  }}
                  className={`w-full pl-2.5 pr-6 py-1 rounded-lg text-xs font-bold border outline-none appearance-none cursor-pointer ${
                    isDark
                      ? "bg-slate-950 border-white/10 text-slate-200 focus:border-indigo-400"
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                  }`}
                >
                  <option value="all">All Collaborators</option>
                  <option value="none">No Collaborator</option>
                  {distinctCollaborators.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={11} />
                </div>
              </div>
            </div>

            {/* Filter by Project Pull-Down Menu */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                <Tag size={11} /> Project:
              </span>
              <div className="relative min-w-[125px]">
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    triggerHaptic("light");
                  }}
                  className={`w-full pl-2.5 pr-6 py-1 rounded-lg text-xs font-bold border outline-none appearance-none cursor-pointer ${
                    isDark
                      ? "bg-slate-950 border-white/10 text-slate-200 focus:border-indigo-400"
                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                  }`}
                >
                  <option value="all">All Projects</option>
                  <option value="General">General</option>
                  {distinctProjects.filter((p) => p !== "General").map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={11} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions, Column Settings, & Add Note */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* When a note is being edited: Show Save, Cancel, and Delete buttons in the top toolbar */}
            {editingNoteId && (
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border animate-in fade-in zoom-in-95 duration-150 ${
                isDark ? "bg-indigo-950/50 border-indigo-500/30" : "bg-indigo-50 border-indigo-200"
              }`}>
                <span className="text-[10px] font-black uppercase text-indigo-400 px-1.5 hidden md:inline flex items-center gap-1">
                  <Edit3 size={11} /> Editing Note:
                </span>
                
                {/* Save Edit Button */}
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Save changes to note attributes"
                >
                  <Check size={12} />
                  <span>Save</span>
                </button>

                {/* Cancel Edit Button */}
                <button
                  type="button"
                  onClick={() => setEditingNoteId(null)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                  }`}
                  title="Cancel editing"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>

                {/* Delete Note Button in Top Header */}
                <button
                  type="button"
                  onClick={() => {
                    const noteBeingEdited = notes.find((n) => n.id === editingNoteId);
                    if (noteBeingEdited) {
                      setNoteToDelete(noteBeingEdited);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Delete note (with confirmation)"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            )}

            {/* Columns Customization Button (Opens Centered Screen Modal) */}
            <button
              type="button"
              onClick={() => {
                setShowColumnMenu(!showColumnMenu);
                triggerHaptic("light");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showColumnMenu
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-200"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
              }`}
              title="Customize table columns (reorder, hide/unhide)"
            >
              <Columns size={12} />
              <span className="hidden sm:inline">Columns</span>
              <span className="text-[10px] px-1 py-0.2 rounded-md bg-black/20 font-mono">
                {visibleColumns.length}/{ALL_COLUMNS.length}
              </span>
              <SlidersHorizontal size={11} className="text-slate-400" />
            </button>

            {/* Scroll Snap & Ratchet Configuration Button */}
            <button
              type="button"
              onClick={() => {
                setShowScrollSnapMenu(true);
                triggerHaptic("light");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showScrollSnapMenu || scrollSnapMode === "ratchet"
                  ? isDark
                    ? "bg-purple-950/60 border-purple-500/40 text-purple-200 hover:bg-purple-900/60"
                    : "bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100"
                  : isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-200"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
              }`}
              title={`Scroll Physics: ${
                scrollSnapMode === "ratchet"
                  ? "Ratchet Snap (Zero Elasticity, Step-locked)"
                  : scrollSnapMode === "soft"
                  ? "Soft Proximity Snap"
                  : "Fluid Free Scroll"
              }`}
            >
              <Magnet size={12} className={scrollSnapMode === "ratchet" ? "text-purple-400 animate-pulse" : "text-slate-400"} />
              <span className="hidden sm:inline">
                {scrollSnapMode === "ratchet" ? "Ratchet Snap" : scrollSnapMode === "soft" ? "Soft Snap" : "Free Scroll"}
              </span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-black tracking-wider uppercase ${
                scrollSnapMode === "ratchet"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : scrollSnapMode === "soft"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-slate-500/20 text-slate-400"
              }`}>
                {scrollSnapMode === "ratchet" ? "Ratchet" : scrollSnapMode === "soft" ? "Soft" : "Free"}
              </span>
            </button>

            {/* New Note Button */}
            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                triggerHaptic("light");
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Add New Note"
            >
              <Plus size={12} />
              <span>New Note</span>
            </button>

            {/* Export PDF Button */}
            {onExportNotesPDF && (
              <button
                type="button"
                onClick={onExportNotesPDF}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                  isDark ? "bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-200" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
                title="Export filtered notes as formatted PDF"
              >
                <Download size={11} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Note Form (Collapsible) */}
      {showAddForm && (
        <div className={`p-3.5 rounded-2xl border shadow-lg space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 ${
          isDark ? "bg-slate-900 border-indigo-500/30 text-slate-100" : "bg-white border-indigo-200 text-slate-900"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Plus size={13} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Create New Note</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Note Title / Summary
              </label>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="e.g. Project Plan Overview"
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                  isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                }`}
              />
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Project / Category
              </label>
              <select
                value={newNoteProject}
                onChange={(e) => setNewNoteProject(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                  isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                <option value="">General</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Note Detail / Content
            </label>
            <textarea
              rows={2}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Type note details, action items, or meeting logs..."
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none resize-none ${
                isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
              }`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User size={8.5} /> Collaborator
                </label>
                {newNoteCollab && newNoteCollab !== "None" && (
                  <button
                    type="button"
                    onClick={() => setNewNoteCollab("")}
                    className="text-[7.5px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  list="quick-add-collabs-list"
                  value={newNoteCollab === "None" ? "" : newNoteCollab}
                  onChange={(e) => setNewNoteCollab(e.target.value)}
                  placeholder="Type or select..."
                  className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                    isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-400" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                  }`}
                />
                <datalist id="quick-add-collabs-list">
                  {collaborators.filter(c => c && c.toLowerCase() !== "none").map((col) => (
                    <option key={col} value={col} />
                  ))}
                </datalist>
                <select
                  value={collaborators.includes(newNoteCollab) ? newNoteCollab : (newNoteCollab ? "custom" : "")}
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      setNewNoteCollab(e.target.value);
                    }
                  }}
                  className={`w-20 px-1 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer shrink-0 ${
                    isDark ? "bg-slate-900 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                  title="Pick collaborator"
                >
                  <option value="">None</option>
                  {collaborators.filter(c => c && c.toLowerCase() !== "none").map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                  {newNoteCollab && !collaborators.includes(newNoteCollab) && (
                    <option value="custom">Custom</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin size={8.5} /> Location
                </label>
                {newNoteLoc && (
                  <button
                    type="button"
                    onClick={() => setNewNoteLoc("")}
                    className="text-[7.5px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  list="quick-add-locs-list"
                  value={newNoteLoc}
                  onChange={(e) => setNewNoteLoc(e.target.value)}
                  placeholder="Type or select..."
                  className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                    isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-400" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                  }`}
                />
                <datalist id="quick-add-locs-list">
                  {favoriteLocations.filter(l => l && l.toLowerCase() !== "none").map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
                <select
                  value={favoriteLocations.includes(newNoteLoc) ? newNoteLoc : (newNoteLoc ? "custom" : "")}
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      setNewNoteLoc(e.target.value);
                    }
                  }}
                  className={`w-20 px-1 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer shrink-0 ${
                    isDark ? "bg-slate-900 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                  title="Pick location"
                >
                  <option value="">None</option>
                  {favoriteLocations.filter(l => l && l.toLowerCase() !== "none").map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                  {newNoteLoc && !favoriteLocations.includes(newNoteLoc) && (
                    <option value="custom">Custom</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Time (HH:MM)
              </label>
              <input
                type="text"
                value={newNoteTime}
                onChange={(e) => setNewNoteTime(e.target.value)}
                placeholder="e.g. 14:00"
                className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                  isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Link Task
              </label>
              <select
                value={newNoteTaskId}
                onChange={(e) => setNewNoteTaskId(e.target.value)}
                className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                  isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} ({t.date})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateNote}
              className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Save to Repository
            </button>
          </div>
        </div>
      )}

      {/* Search Bar Placed Above Note Results */}
      <div className="relative w-full">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes by keywords, content, title, collaborator, project, location, vendor, or task..."
          className={`w-full pl-8 pr-8 py-1.5 rounded-xl text-xs sm:text-sm font-medium border outline-none transition-all ${
            isDark
              ? "bg-slate-900/90 border-white/10 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
              : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 shadow-xs"
          }`}
        />
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
          <Search size={14} />
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              triggerHaptic("light");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Clear Search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Main Full-Screen Table View with Drag & Drop Columns, Condensed Rows, and Stepped Ratchet Physics */}
      <div className="flex-1 w-full overflow-hidden rounded-2xl border shadow-xs flex flex-col min-h-[380px]">
        {/* Ratchet Navigation & Elasticity Control Stepper Bar */}
        <div className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 select-none text-[11px] ${
          isDark ? "bg-slate-950/90 border-white/10 text-slate-300" : "bg-slate-100/90 border-slate-200 text-slate-700"
        }`}>
          {/* Left: Snap Mode & Status */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowScrollSnapMenu(true);
                triggerHaptic("light");
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold border transition-all cursor-pointer ${
                scrollSnapMode === "ratchet"
                  ? isDark
                    ? "bg-purple-950/80 border-purple-500/40 text-purple-200"
                    : "bg-purple-100 border-purple-300 text-purple-900"
                  : scrollSnapMode === "soft"
                  ? isDark
                    ? "bg-indigo-950/80 border-indigo-500/40 text-indigo-200"
                    : "bg-indigo-100 border-indigo-300 text-indigo-900"
                  : isDark
                  ? "bg-slate-900 border-white/10 text-slate-400"
                  : "bg-white border-slate-300 text-slate-600"
              }`}
              title="Click to configure snap scrolling physics"
            >
              <Magnet size={11} className={scrollSnapMode === "ratchet" ? "text-purple-400" : "text-slate-400"} />
              <span className="font-extrabold uppercase text-[9.5px] tracking-wider">
                {scrollSnapMode === "ratchet"
                  ? "Ratchet (Zero Elasticity)"
                  : scrollSnapMode === "soft"
                  ? "Soft Snap"
                  : "Fluid Free"}
              </span>
            </button>

            <span className="hidden md:inline-block text-[10px] text-slate-400 opacity-80">
              {scrollSnapMode === "ratchet"
                ? "Locked stepped ratchet • No elastic bounce"
                : scrollSnapMode === "soft"
                ? "Proximity alignment near cell edges"
                : "Continuous free scrolling"}
            </span>
          </div>

          {/* Right: Quick Ratchet Steppers & Note Detail Align */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Quick Snap to Note Detail Column */}
            <button
              type="button"
              onClick={() => ratchetScroll("detail")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? "bg-indigo-950/50 hover:bg-indigo-900/60 border-indigo-500/30 text-indigo-300"
                  : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
              }`}
              title="Snap & align horizontal view directly to Note Detail column (Shortcut: D)"
            >
              <Crosshair size={10} />
              <span>Snap Detail</span>
            </button>

            {/* Horizontal Column Steppers */}
            <div className={`flex items-center rounded-lg border overflow-hidden ${
              isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => ratchetScroll("left")}
                className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Ratchet Left 1 Column (Shortcut: Left Arrow)"
              >
                <ChevronLeft size={12} />
                <span className="text-[9px] font-black hidden sm:inline uppercase">Col</span>
              </button>
              <div className="w-px h-3.5 bg-white/10"></div>
              <button
                type="button"
                onClick={() => ratchetScroll("right")}
                className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Ratchet Right 1 Column (Shortcut: Right Arrow)"
              >
                <span className="text-[9px] font-black hidden sm:inline uppercase">Col</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Vertical Row Steppers */}
            <div className={`flex items-center rounded-lg border overflow-hidden ${
              isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => ratchetScroll("up")}
                className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Ratchet Up 1 Note Row (Shortcut: Up Arrow)"
              >
                <ChevronUp size={12} />
                <span className="text-[9px] font-black hidden sm:inline uppercase">Row</span>
              </button>
              <div className="w-px h-3.5 bg-white/10"></div>
              <button
                type="button"
                onClick={() => ratchetScroll("down")}
                className="px-2 py-0.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Ratchet Down 1 Note Row (Shortcut: Down Arrow)"
              >
                <span className="text-[9px] font-black hidden sm:inline uppercase">Row</span>
                <ChevronDown size={12} />
              </button>
            </div>
          </div>
        </div>

        {sortedNotes.length === 0 ? (
          <div className={`flex-1 py-14 text-center flex flex-col items-center justify-center opacity-60 ${
            isDark ? "bg-slate-900/40 text-slate-400 border-white/10" : "bg-white text-slate-500 border-slate-200"
          }`}>
            <FileText size={32} className="text-indigo-400 mb-2" />
            <p className="text-xs font-black uppercase tracking-widest">No Notes Found</p>
            <p className="text-[11px] mt-1 max-w-md">
              {notes.length === 0
                ? "Your repository is currently empty. Ask the AI Chatbot or use the New Note button above to capture notes!"
                : "No notes match your current search, collaborator, or project filter."}
            </p>
            {(searchQuery || selectedCollab !== "all" || selectedProject !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCollab("all");
                  setSelectedProject("all");
                  triggerHaptic("light");
                }}
                className="mt-3 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            tabIndex={0}
            onKeyDown={(e) => {
              const target = e.target as HTMLElement;
              if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
                return;
              }
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                ratchetScroll("left");
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                ratchetScroll("right");
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                ratchetScroll("up");
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                ratchetScroll("down");
              } else if (e.key === "d" || e.key === "D") {
                e.preventDefault();
                ratchetScroll("detail");
              } else if (e.key === "Home") {
                e.preventDefault();
                ratchetScroll("home");
              } else if (e.key === "End") {
                e.preventDefault();
                ratchetScroll("end");
              }
            }}
            className={`flex-1 overflow-auto w-full outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all ${
              scrollSnapMode === "ratchet" ? "overscroll-none scroll-smooth" : (scrollSnapMode === "soft" ? "overscroll-contain scroll-smooth" : "overscroll-auto")
            } ${isDark ? "bg-slate-900/60" : "bg-white"}`}
            style={{
              scrollSnapType:
                scrollSnapMode === "ratchet"
                  ? "both mandatory"
                  : scrollSnapMode === "soft"
                  ? "both proximity"
                  : "none",
              overscrollBehavior: scrollSnapMode === "ratchet" ? "none" : (scrollSnapMode !== "free" ? "contain" : "auto"),
              overscrollBehaviorX: scrollSnapMode === "ratchet" ? "none" : (scrollSnapMode !== "free" ? "contain" : "auto"),
              overscrollBehaviorY: scrollSnapMode === "ratchet" ? "none" : (scrollSnapMode !== "free" ? "contain" : "auto"),
              scrollPaddingTop: "38px",
              scrollBehavior: "smooth",
            }}
          >
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="sticky top-0 z-10 shadow-xs">
                <tr className={`text-[9px] font-black uppercase tracking-wider border-b select-none ${
                  isDark ? "bg-slate-950 border-white/10 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700"
                }`}>
                  {visibleColumns.map((col) => {
                    const isDragging = draggedColId === col.id;
                    const isOver = dragOverColId === col.id;

                    return (
                      <th
                        key={col.id}
                        data-col-id={col.id}
                        draggable={true}
                        onDragStart={(e) => handleColumnDragStart(e, col.id)}
                        onDragOver={(e) => handleColumnDragOver(e, col.id)}
                        onDragLeave={handleColumnDragLeave}
                        onDrop={(e) => handleColumnDrop(e, col.id)}
                        style={{
                          minWidth: col.minWidth,
                          scrollSnapAlign: scrollSnapMode !== "free" ? "start" : "none",
                          scrollSnapStop: scrollSnapMode === "ratchet" ? "always" : "normal",
                        }}
                        className={`py-2 px-2.5 relative transition-all group/col cursor-grab active:cursor-grabbing ${
                          col.id === "actions" ? "text-center w-[115px] shrink-0" : ""
                        } ${col.id === "detail" ? "w-[50%] lg:w-[60%]" : ""} ${
                          isDragging ? "opacity-30 bg-indigo-500/20" : ""
                        } ${
                          isOver
                            ? dragDropSide === "before"
                              ? "border-l-2 border-indigo-400 bg-indigo-500/10"
                              : "border-r-2 border-indigo-400 bg-indigo-500/10"
                            : ""
                        }`}
                      >
                        <div className={`flex items-center gap-1 ${col.id === "actions" ? "justify-center" : "justify-between"}`}>
                          <div
                            className="flex items-center gap-1 cursor-pointer hover:text-indigo-400 transition-colors"
                            onClick={() => col.sortField && handleSort(col.sortField)}
                          >
                            <GripVertical size={11} className="text-slate-400 opacity-40 group-hover/col:opacity-100 shrink-0" />
                            <span>{col.label}</span>
                            {col.sortField && (
                              <ArrowUpDown
                                size={10}
                                className={`shrink-0 ${sortField === col.sortField ? "text-indigo-400" : "opacity-40"}`}
                              />
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedNotes.map((note) => {
                  const isEditing = editingNoteId === note.id;

                  if (isEditing) {
                    return (
                      <tr
                        key={note.id}
                        style={{
                          scrollSnapAlign: scrollSnapMode !== "free" ? "start" : "none",
                          scrollSnapStop: scrollSnapMode === "ratchet" ? "always" : "normal",
                        }}
                        className={`border-b ${
                          isDark ? "bg-indigo-950/30 border-indigo-500/30" : "bg-indigo-50/60 border-indigo-200"
                        }`}
                      >
                        <td colSpan={visibleColumns.length} className="p-3">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                                <Edit3 size={11} /> Editing Note Attributes
                              </span>
                              <span className="text-[8.5px] text-slate-400 font-mono">ID: {note.id}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">Title / Summary</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className={`w-full px-2 py-1 rounded-lg text-xs font-bold border outline-none ${
                                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                  }`}
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="text-[7.5px] font-black uppercase text-slate-400 block">Note Detail / Content</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsEditContentExpanded(!isEditContentExpanded);
                                      if (triggerHaptic) triggerHaptic("light");
                                    }}
                                    className="flex items-center gap-1 text-[8px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                                    title={isEditContentExpanded ? "Collapse Note Editor" : "Expand Note Editor for easier reading/writing"}
                                  >
                                    {isEditContentExpanded ? (
                                      <>
                                        <Minimize2 size={9.5} />
                                        <span>Collapse</span>
                                      </>
                                    ) : (
                                      <>
                                        <Maximize2 size={9.5} />
                                        <span>Expand Box</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <textarea
                                  rows={isEditContentExpanded ? 8 : 3}
                                  value={editRawText}
                                  onChange={(e) => setEditRawText(e.target.value)}
                                  className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none transition-all ${
                                    isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-400" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">Project / Category</label>
                                <select
                                  value={editProject}
                                  onChange={(e) => setEditProject(e.target.value)}
                                  className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                  }`}
                                >
                                  <option value="">General</option>
                                  {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="text-[7.5px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <User size={8.5} /> Collaborator
                                  </label>
                                  {editCollaborator && editCollaborator !== "None" && (
                                    <button
                                      type="button"
                                      onClick={() => setEditCollaborator("None")}
                                      className="text-[7px] text-rose-400 hover:underline cursor-pointer"
                                    >
                                      Clear (None)
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    list="edit-collabs-list"
                                    value={editCollaborator === "None" ? "" : editCollaborator}
                                    onChange={(e) => setEditCollaborator(e.target.value || "None")}
                                    placeholder="Type or pick..."
                                    className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                                      isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-400" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
                                    }`}
                                  />
                                  <datalist id="edit-collabs-list">
                                    <option value="None" />
                                    {collaborators.filter(c => c && c.toLowerCase() !== "none").map((col) => (
                                      <option key={col} value={col} />
                                    ))}
                                  </datalist>
                                  <select
                                    value={collaborators.includes(editCollaborator) ? editCollaborator : (editCollaborator === "None" || !editCollaborator ? "None" : "custom")}
                                    onChange={(e) => {
                                      if (e.target.value !== "custom") {
                                        setEditCollaborator(e.target.value);
                                      }
                                    }}
                                    className={`w-20 px-1 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer shrink-0 ${
                                      isDark ? "bg-slate-900 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                                    }`}
                                    title="Quick select collaborator"
                                  >
                                    <option value="None">None</option>
                                    {collaborators.filter(c => c && c.toLowerCase() !== "none").map((col) => (
                                      <option key={col} value={col}>{col}</option>
                                    ))}
                                    {editCollaborator && editCollaborator !== "None" && !collaborators.includes(editCollaborator) && (
                                      <option value="custom">Custom</option>
                                    )}
                                  </select>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="text-[7.5px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <MapPin size={8.5} /> Location
                                  </label>
                                  {editLocation && (
                                    <button
                                      type="button"
                                      onClick={() => setEditLocation("")}
                                      className="text-[7px] text-rose-400 hover:underline cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    list="edit-locs-list"
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                    placeholder="Type or pick..."
                                    className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                                      isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-400" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
                                    }`}
                                  />
                                  <datalist id="edit-locs-list">
                                    {favoriteLocations.filter(l => l && l.toLowerCase() !== "none").map((loc) => (
                                      <option key={loc} value={loc} />
                                    ))}
                                  </datalist>
                                  <select
                                    value={favoriteLocations.includes(editLocation) ? editLocation : (editLocation ? "custom" : "")}
                                    onChange={(e) => {
                                      if (e.target.value !== "custom") {
                                        setEditLocation(e.target.value);
                                      }
                                    }}
                                    className={`w-20 px-1 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer shrink-0 ${
                                      isDark ? "bg-slate-900 border-white/10 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                                    }`}
                                    title="Quick select location"
                                  >
                                    <option value="">None</option>
                                    {favoriteLocations.filter(l => l && l.toLowerCase() !== "none").map((loc) => (
                                      <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                    {editLocation && !favoriteLocations.includes(editLocation) && (
                                      <option value="custom">Custom</option>
                                    )}
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">Time (HH:MM)</label>
                                <input
                                  type="text"
                                  value={editTime}
                                  onChange={(e) => setEditTime(e.target.value)}
                                  className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">Link to Task</label>
                                <select
                                  value={editTaskId}
                                  onChange={(e) => setEditTaskId(e.target.value)}
                                  className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                  }`}
                                >
                                  <option value="">-- No Linked Task --</option>
                                  {tasks.map((t) => (
                                    <option key={t.id} value={t.id}>{t.title} ({t.date})</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[7.5px] font-black uppercase text-slate-400 block mb-0.5">Link to Routine</label>
                                <select
                                  value={editRoutineId}
                                  onChange={(e) => setEditRoutineId(e.target.value)}
                                  className={`w-full px-2 py-1 rounded-lg text-xs font-medium border outline-none ${
                                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                  }`}
                                >
                                  <option value="">-- No Linked Routine --</option>
                                  {routines.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-1">
                              <button
                                type="button"
                                onClick={() => setNoteToDelete(note)}
                                className="px-2.5 py-1 bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Delete this note (with confirmation)"
                              >
                                <Trash2 size={12} />
                                <span>Delete Note</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteId(null)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                    isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                  }`}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveEdit}
                                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Check size={12} />
                                  <span>Save Changes</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={note.id}
                      style={{
                        scrollSnapAlign: scrollSnapMode !== "free" ? "start" : "none",
                        scrollSnapStop: scrollSnapMode === "ratchet" ? "always" : "normal",
                      }}
                      className={`text-xs transition-colors hover:bg-white/5 group ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
                      {visibleColumns.map((col) => (
                        <td
                          key={col.id}
                          style={{
                            scrollSnapAlign: scrollSnapMode !== "free" ? "start" : "none",
                            scrollSnapStop: scrollSnapMode === "ratchet" ? "always" : "normal",
                          }}
                          className={`py-1.5 px-2.5 align-top ${col.id === "actions" ? "text-center" : ""}`}
                        >
                          {renderCellContent(col.id, note)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Convert Note to Task Modal with Prompt (Send Fully vs Duplicate & Convert) */}
      {convertingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${
            isDark ? "bg-slate-900 border-white/15 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs">
                  <CheckSquare size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 dark:text-white">
                    Convert Note to Task
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    Transform this note into a scheduled or flexible daily task.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConvertingNote(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Task Configuration Fields */}
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={convertTaskTitle}
                  onChange={(e) => setConvertTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none ${
                    isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={convertTaskDate}
                    onChange={(e) => setConvertTaskDate(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                      isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={convertTaskDuration}
                    onChange={(e) => setConvertTaskDuration(e.target.value)}
                    placeholder="e.g. 30 min, 1 hr"
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                      isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Fixed Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={convertTaskTime}
                    onChange={(e) => {
                      setConvertTaskTime(e.target.value);
                      if (e.target.value.trim()) {
                        setConvertTaskIsLocked(true);
                      }
                    }}
                    placeholder="HH:MM (leave blank for flex)"
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none ${
                      isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Priority
                  </label>
                  <select
                    value={convertTaskPriority}
                    onChange={(e) => setConvertTaskPriority(e.target.value as any)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none ${
                      isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="none">Normal</option>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Project
                  </label>
                  <select
                    value={convertTaskProject}
                    onChange={(e) => setConvertTaskProject(e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-medium border outline-none ${
                      isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="General">General</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Collaborator
                  </label>
                  <select
                    value={convertTaskCollaborator}
                    onChange={(e) => setConvertTaskCollaborator(e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-medium border outline-none ${
                      isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="">None</option>
                    {collaborators.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={convertTaskLocation}
                    onChange={(e) => setConvertTaskLocation(e.target.value)}
                    placeholder="Location..."
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-medium border outline-none ${
                      isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Task Notes (Detail)
                </label>
                <textarea
                  rows={2}
                  value={convertTaskNotes}
                  onChange={(e) => setConvertTaskNotes(e.target.value)}
                  placeholder="Task details..."
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none resize-none ${
                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* Conversion Mode Selection Prompt */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? "bg-slate-950/80 border-indigo-500/20" : "bg-indigo-50/50 border-indigo-200/60"
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  Choose Conversion Mode
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  {/* Option 1: Send Note Fully to Tasks (Move) */}
                  <button
                    type="button"
                    onClick={() => handleExecuteConvertToTask("move")}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.01] active:scale-98 cursor-pointer group ${
                      isDark
                        ? "bg-slate-900/90 hover:bg-slate-800 border-indigo-500/30 hover:border-indigo-400"
                        : "bg-white hover:bg-indigo-50/80 border-indigo-200 hover:border-indigo-400 shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-indigo-400 group-hover:text-indigo-300">
                        <ArrowRightCircle size={14} />
                        <span>Send Fully to Tasks</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        <strong>Move:</strong> Creates task in schedule and <span className="text-rose-400">removes</span> note from repository.
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        Move Note →
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Duplicate & Convert (Copy) */}
                  <button
                    type="button"
                    onClick={() => handleExecuteConvertToTask("copy")}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.01] active:scale-98 cursor-pointer group ${
                      isDark
                        ? "bg-slate-900/90 hover:bg-slate-800 border-emerald-500/30 hover:border-emerald-400"
                        : "bg-white hover:bg-emerald-50/80 border-emerald-200 hover:border-emerald-400 shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 group-hover:text-emerald-300">
                        <Copy size={14} />
                        <span>Duplicate & Convert</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        <strong>Copy:</strong> Creates task in schedule and <span className="text-emerald-400">keeps original note</span> in repository.
                      </p>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        Copy & Convert →
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-3 border-t flex justify-end gap-2 ${
              isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => setConvertingNote(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Columns Customization Modal */}
      {showColumnMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${
            isDark ? "bg-slate-900 border-white/15 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 dark:text-white">
                    Customize Columns
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    Toggle visibility and reorder table columns.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 font-bold transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
                  title="Reset columns to default order and visibility"
                >
                  <RotateCcw size={11} /> Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowColumnMenu(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Column List */}
            <div className="p-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
              <p className="text-[10.5px] text-slate-400 mb-2 leading-relaxed">
                Check to display or hide columns. Use the up/down arrows to change column order.
              </p>

              {columnOrder.map((colId, index) => {
                const colConfig = ALL_COLUMNS.find((c) => c.id === colId);
                if (!colConfig) return null;
                const isVisible = !hiddenColumns.includes(colId);

                return (
                  <div
                    key={colId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      isVisible
                        ? isDark ? "bg-slate-950/60 border-white/5" : "bg-slate-50 border-slate-200"
                        : isDark ? "bg-slate-950/20 border-transparent opacity-50" : "bg-slate-100/50 border-transparent opacity-50"
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleColumnVisibility(colId)}
                        className="accent-indigo-600 rounded cursor-pointer w-4 h-4"
                      />
                      <span className={`text-xs font-bold ${isVisible ? "" : "line-through text-slate-400"}`}>
                        {colConfig.label}
                      </span>
                    </label>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveColumnInMenu(colId, "up")}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 cursor-pointer ${
                          index === 0 ? "cursor-not-allowed" : ""
                        }`}
                        title="Move Column Up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === columnOrder.length - 1}
                        onClick={() => moveColumnInMenu(colId, "down")}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 cursor-pointer ${
                          index === columnOrder.length - 1 ? "cursor-not-allowed" : ""
                        }`}
                        title="Move Column Down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className={`p-3 border-t flex justify-between items-center text-[10.5px] text-slate-400 ${
              isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <span>💡 You can also drag headers in the table.</span>
              <button
                type="button"
                onClick={() => setShowColumnMenu(false)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snap & Ratchet Scroll Physics Modal */}
      {showScrollSnapMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${
            isDark ? "bg-slate-900 border-white/15 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                  <Magnet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 dark:text-white">
                    Scroll Physics & Snap Ratchet
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    Control table elasticity, snap lock, and stepped scrolling behavior.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScrollSnapMenu(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Select Scrolling Mode
                </label>

                {/* 1. Ratchet Snap (Mandatory) */}
                <div
                  onClick={() => {
                    setScrollSnapMode("ratchet");
                    triggerHaptic("medium");
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    scrollSnapMode === "ratchet"
                      ? isDark
                        ? "bg-purple-950/40 border-purple-500 shadow-xs"
                        : "bg-purple-50 border-purple-400 shadow-xs"
                      : isDark
                      ? "bg-slate-950/40 border-white/5 hover:border-white/20"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg ${
                    scrollSnapMode === "ratchet" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
                    <Zap size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wide">
                        Ratchet Snap (Zero Elasticity)
                      </span>
                      {scrollSnapMode === "ratchet" && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Locks scrolling strictly to column and row boundaries. Completely removes rubber-band elasticity, momentum overshoot, and loose sliding.
                    </p>
                  </div>
                </div>

                {/* 2. Soft Snap (Proximity) */}
                <div
                  onClick={() => {
                    setScrollSnapMode("soft");
                    triggerHaptic("medium");
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    scrollSnapMode === "soft"
                      ? isDark
                        ? "bg-indigo-950/40 border-indigo-500 shadow-xs"
                        : "bg-indigo-50 border-indigo-400 shadow-xs"
                      : isDark
                      ? "bg-slate-950/40 border-white/5 hover:border-white/20"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg ${
                    scrollSnapMode === "soft" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
                    <Target size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wide">
                        Proximity Snap (Soft)
                      </span>
                      {scrollSnapMode === "soft" && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Gentle magnetic alignment that pulls columns and rows into neat alignment when scrolling slows down.
                    </p>
                  </div>
                </div>

                {/* 3. Fluid Free */}
                <div
                  onClick={() => {
                    setScrollSnapMode("free");
                    triggerHaptic("medium");
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    scrollSnapMode === "free"
                      ? isDark
                        ? "bg-slate-800 border-slate-500 shadow-xs"
                        : "bg-slate-200 border-slate-400 shadow-xs"
                      : isDark
                      ? "bg-slate-950/40 border-white/5 hover:border-white/20"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg ${
                    scrollSnapMode === "free" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
                    <MoveHorizontal size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wide">
                        Fluid Free Scroll
                      </span>
                      {scrollSnapMode === "free" && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-300 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Standard unrestricted continuous momentum scrolling without snapping.
                    </p>
                  </div>
                </div>
              </div>

              {/* Wheel Ratchet Stepper Toggle */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
              }`}>
                <div>
                  <span className="text-xs font-bold block">Mouse Wheel Stepper Assist</span>
                  <span className="text-[10.5px] text-slate-400 block">
                    Quantizes wheel ticks into discrete stepped row and column notches.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableWheelRatchet}
                    onChange={(e) => {
                      setEnableWheelRatchet(e.target.checked);
                      triggerHaptic("light");
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                isDark ? "bg-slate-950/30 border-white/5 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}>
                <span className="font-bold text-slate-300 block mb-1">⌨️ Ratchet Navigation Shortcuts:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div><kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10 text-[9.5px]">◄ Left</kbd> / <kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10 text-[9.5px]">Right ►</kbd> : Step column</div>
                  <div><kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10 text-[9.5px]">▲ Up</kbd> / <kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10 text-[9.5px]">Down ▼</kbd> : Step row</div>
                  <div><kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10 text-[9.5px]">D</kbd> : Snap to Note Detail</div>
                  <div><kbd className="px-1 py-0.5 rounded bg-black/30 border border-white/10 text-[9.5px]">Home</kbd> : Snap top-left</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-3 border-t flex justify-end ${
              isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => setShowScrollSnapMenu(false)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${
            isDark ? "bg-slate-900 border-white/15 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? "bg-rose-950/40 border-white/10" : "bg-rose-50 border-rose-200"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">
                    Confirm Delete Note
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-300">
                Are you sure you want to permanently remove this note from your repository?
              </p>

              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="font-bold text-slate-100 dark:text-white line-clamp-1 flex items-center gap-1.5">
                  <FileText size={12} className="text-indigo-400 shrink-0" />
                  <span>{noteToDelete.title || "Untitled Note"}</span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {cleanNoteDetailText(noteToDelete.rawText) || "No additional content"}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[9.5px] text-slate-500 border-t border-white/5">
                  {noteToDelete.project && <span>Project: <strong className="text-slate-300">{noteToDelete.project}</strong></span>}
                  {noteToDelete.collaborator && noteToDelete.collaborator !== "None" && (
                    <span>• Collab: <strong className="text-slate-300">{noteToDelete.collaborator}</strong></span>
                  )}
                  {noteToDelete.location && <span>• Location: <strong className="text-slate-300">{noteToDelete.location}</strong></span>}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-3 border-t flex justify-end gap-2 ${
              isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = noteToDelete.id;
                  if (editingNoteId === idToDelete) {
                    setEditingNoteId(null);
                  }
                  handleDeleteNote(idToDelete);
                  setNoteToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Delete Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Expanded Note Detail / Content Reader Dialog (Takes ~80% of screen to maintain visible border banners) */}
      {expandedNoteForReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-4xl max-h-[84vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${
            isDark ? "bg-slate-900 border-white/15 text-slate-100 shadow-purple-950/30" : "bg-white border-slate-200 text-slate-900 shadow-slate-400/20"
          }`}>
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0 ${
              isDark ? "bg-slate-950/80 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                      {expandedNoteForReading.title || "Note Detail & Content"}
                    </h3>
                    {expandedNoteForReading.source === "chatbot" && (
                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                        <Sparkles size={9} /> AI Captured
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(expandedNoteForReading.createdAt).toLocaleDateString()} {new Date(expandedNoteForReading.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                    {expandedNoteForReading.project && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {expandedNoteForReading.project}
                      </span>
                    )}
                    {expandedNoteForReading.collaborator && expandedNoteForReading.collaborator !== "None" && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 flex items-center gap-1">
                        <User size={9} /> {expandedNoteForReading.collaborator}
                      </span>
                    )}
                    {expandedNoteForReading.location && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 flex items-center gap-1">
                        <MapPin size={9} /> {expandedNoteForReading.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const text = cleanNoteDetailText(expandedNoteForReading.rawText);
                    navigator.clipboard.writeText(text);
                    setCopiedReadingContent(true);
                    if (triggerHaptic) triggerHaptic("medium");
                    setTimeout(() => setCopiedReadingContent(false), 2000);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    copiedReadingContent
                      ? "bg-emerald-600 text-white"
                      : isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                  title="Copy Note Text"
                >
                  {copiedReadingContent ? <Check size={13} /> : <Copy size={13} />}
                  <span className="hidden sm:inline">{copiedReadingContent ? "Copied" : "Copy"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedNoteForReading(null)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isDark ? "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  title="Collapse Reader (Return to Table)"
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>

            {/* Note Body Area with Enhanced Typography */}
            <div
              className={`p-5 sm:p-8 overflow-y-auto flex-1 space-y-4 ${
                scrollSnapMode === "ratchet"
                  ? "overscroll-none scroll-smooth"
                  : scrollSnapMode === "soft"
                  ? "overscroll-contain scroll-smooth"
                  : "overscroll-auto"
              }`}
              style={{
                overscrollBehavior: scrollSnapMode === "ratchet" ? "none" : (scrollSnapMode !== "free" ? "contain" : "auto"),
                overscrollBehaviorY: scrollSnapMode === "ratchet" ? "none" : (scrollSnapMode !== "free" ? "contain" : "auto"),
              }}
            >
              <div className={`p-4 sm:p-6 rounded-2xl border text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium select-text ${
                isDark ? "bg-slate-950/60 border-white/10 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
              }`}>
                {renderTextWithLinks
                  ? renderTextWithLinks(cleanNoteDetailText(expandedNoteForReading.rawText))
                  : cleanNoteDetailText(expandedNoteForReading.rawText)}
              </div>

              {expandedNoteForReading.vendor && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                  <ShoppingBag size={14} />
                  <span>Vendor: {expandedNoteForReading.vendor}</span>
                </div>
              )}
            </div>

            {/* Modal Footer with Action Buttons */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${
              isDark ? "bg-slate-950/80 border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const note = expandedNoteForReading;
                    setExpandedNoteForReading(null);
                    handleOpenConvertToTask(note);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare size={13} />
                  <span>Convert to Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const note = expandedNoteForReading;
                    setExpandedNoteForReading(null);
                    handleStartEdit(note);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit Note</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const note = expandedNoteForReading;
                    setExpandedNoteForReading(null);
                    setNoteToDelete(note);
                  }}
                  className="px-3 py-1.5 text-rose-400 hover:text-white hover:bg-rose-600/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedNoteForReading(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Minimize2 size={13} />
                  <span>Collapse</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
