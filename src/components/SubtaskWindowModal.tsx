import React, { useState, useRef, useEffect } from "react";
import {
  Check,
  Trash2,
  Edit3,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Columns,
  Grid,
  CornerDownLeft,
  Flag,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Subtask } from "../types";

export interface SubtaskWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  subtasks: Subtask[];
  onAddSubtask: (title: string, priority?: "high" | "medium" | "low") => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onUpdateSubtaskTitle: (id: string, newTitle: string) => void;
  onUpdateSubtaskPriority: (id: string, priority: "high" | "medium" | "low" | undefined) => void;
  onReorderSubtasks: (newSubtasks: Subtask[]) => void;
}

const COMMON_PRESETS = [
  "Prepare tools & materials",
  "Initial setup & verification",
  "Execute primary task milestones",
  "Quality assurance check",
  "Document notes & takeaways",
  "Send recap to team / client",
];

export const SubtaskWindowModal: React.FC<SubtaskWindowModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtaskTitle,
  onUpdateSubtaskPriority,
  onReorderSubtasks,
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low" | undefined>(undefined);
  const [isExpandedWide, setIsExpandedWide] = useState(false);
  const [columnCount, setColumnCount] = useState<2 | 3 | 4>(3);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [activePriorityMenuId, setActivePriorityMenuId] = useState<string | null>(null);

  const newSubtaskInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auto focus new subtask input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        newSubtaskInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus edit input when entering edit mode
  useEffect(() => {
    if (editingId) {
      const timer = setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editingId]);

  // Handle ESC key to close modal or cancel editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activePriorityMenuId) {
          setActivePriorityMenuId(null);
        } else if (editingId) {
          setEditingId(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, editingId, activePriorityMenuId, onClose]);

  if (!isOpen) return null;

  const completedCount = subtasks.filter((s) => s.completed).length;
  const filteredSubtasks = subtasks.filter((s) => {
    if (priorityFilter === "all") return true;
    return s.priority === priorityFilter;
  });

  // Handle creating a new subtask and immediately placing cursor on the next row
  const handleAddNewSubtaskRow = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) {
      newSubtaskInputRef.current?.focus();
      return;
    }

    onAddSubtask(trimmed, newPriority);
    setNewTitle("");

    // Maintain focus on the input so cursor stays on next row for rapid entry
    requestAnimationFrame(() => {
      newSubtaskInputRef.current?.focus();
    });
  };

  // Handle pressing enter while editing an existing row - advances cursor to next row
  const handleEditKeyDown = (e: React.KeyboardEvent, index: number, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editingTitle.trim()) {
        onUpdateSubtaskTitle(id, editingTitle.trim());
      }
      // Advance to next row
      if (index + 1 < subtasks.length) {
        const nextSubtask = subtasks[index + 1];
        setEditingId(nextSubtask.id);
        setEditingTitle(nextSubtask.title);
      } else {
        // Last row reached - move cursor to the new subtask creation row
        setEditingId(null);
        setTimeout(() => {
          newSubtaskInputRef.current?.focus();
        }, 50);
      }
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (editingTitle.trim()) {
      onUpdateSubtaskTitle(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  // Re-prioritize cycle
  const handleCyclePriority = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const st = subtasks.find((s) => s.id === id);
    if (!st) return;
    let next: "high" | "medium" | "low" | undefined = undefined;
    if (!st.priority) next = "high";
    else if (st.priority === "high") next = "medium";
    else if (st.priority === "medium") next = "low";
    else if (st.priority === "low") next = undefined;
    onUpdateSubtaskPriority(id, next);
  };

  // Move up/down
  const handleMove = (index: number, direction: "up" | "down", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;
    const copy = [...subtasks];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onReorderSubtasks(copy);
  };

  // Sort by priority
  const handleSortByPriority = () => {
    const priorityWeight = { high: 3, medium: 2, low: 1, undefined: 0 };
    const sorted = [...subtasks].sort((a, b) => {
      const pA = priorityWeight[a.priority || "undefined"];
      const pB = priorityWeight[b.priority || "undefined"];
      return pB - pA;
    });
    onReorderSubtasks(sorted);
  };

  // Move completed to bottom
  const handleMoveCompletedToBottom = () => {
    const active = subtasks.filter((s) => !s.completed);
    const done = subtasks.filter((s) => s.completed);
    onReorderSubtasks([...active, ...done]);
  };

  // Helper for priority pill styling
  const getPriorityBadge = (priority?: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return {
          label: "High",
          badgeClass: "bg-[#FDE8E8] text-[#C53030] border-[#FEB2B2]",
          dotColor: "bg-[#E53E3E]",
        };
      case "medium":
        return {
          label: "Medium",
          badgeClass: "bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]",
          dotColor: "bg-[#F59E0B]",
        };
      case "low":
        return {
          label: "Low",
          badgeClass: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
          dotColor: "bg-[#0284C7]",
        };
      default:
        return {
          label: "Normal",
          badgeClass: "bg-[#FAF3E0] text-[#786C60] border-[#EADDC7]",
          dotColor: "bg-[#A89F91]",
        };
    }
  };

  // Responsive grid class based on columnCount
  const gridClass =
    columnCount === 2
      ? "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5"
      : columnCount === 4
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md transition-all"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => {
          e.stopPropagation();
          setActivePriorityMenuId(null);
        }}
        className={`w-full ${
          isExpandedWide ? "max-w-6xl" : "max-w-4xl"
        } max-h-[92vh] flex flex-col rounded-[22px] sm:rounded-[26px] bg-[#FFF2DF] text-[#3D312A] border-2 border-[#EADDC7] shadow-2xl overflow-hidden transition-all duration-300`}
        style={{ touchAction: "manipulation" }}
      >
        {/* ================= TOP BAR / HEADER ================= */}
        <div className="p-3 sm:p-4 bg-[#FAF0E1] border-b border-[#EADDC7] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#DDF3E8] text-[#2D6A4F] flex items-center justify-center shrink-0 shadow-xs border border-[#C8EAD8]">
              <CheckCircle2 size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#2D2319] truncate">
                  Subtasks Checklist
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#EAE0CE] text-[#594B3E] border border-[#D8C9B3] shrink-0">
                  {completedCount} / {subtasks.length} Completed
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#7A6B5C] truncate font-medium">
                Task: <span className="font-bold text-[#3D312A]">{taskTitle || "Active Focus Task"}</span>
              </p>
            </div>
          </div>

          {/* Right Action Icons: Layout Columns, Expand/Collapse Window, Close */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Column Count Selector to optimize horizontal space & avoid vertical scrolling */}
            <div className="hidden sm:flex items-center rounded-xl bg-[#EFE4D2] p-0.5 border border-[#E0D2BE]">
              <button
                type="button"
                onClick={() => setColumnCount(2)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  columnCount === 2
                    ? "bg-[#2D6A4F] text-white shadow-2xs"
                    : "text-[#6B5D4F] hover:text-[#2D2319]"
                }`}
                title="2 Columns Layout"
              >
                2 Cols
              </button>
              <button
                type="button"
                onClick={() => setColumnCount(3)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  columnCount === 3
                    ? "bg-[#2D6A4F] text-white shadow-2xs"
                    : "text-[#6B5D4F] hover:text-[#2D2319]"
                }`}
                title="3 Columns Layout (Fits 15-20 without scrolling)"
              >
                3 Cols
              </button>
              <button
                type="button"
                onClick={() => setColumnCount(4)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  columnCount === 4
                    ? "bg-[#2D6A4F] text-white shadow-2xs"
                    : "text-[#6B5D4F] hover:text-[#2D2319]"
                }`}
                title="4 Columns Layout"
              >
                4 Cols
              </button>
            </div>

            {/* Expand / Collapse Window Size */}
            <button
              type="button"
              onClick={() => setIsExpandedWide(!isExpandedWide)}
              className="p-1.5 sm:p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#594B3E] cursor-pointer transition-all shadow-2xs"
              title={isExpandedWide ? "Collapse to standard width" : "Expand to wide screen"}
            >
              {isExpandedWide ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-[#FAF3E0] hover:bg-[#FCE8E1] hover:text-[#E07A5F] border border-[#EADDC7] text-[#594B3E] cursor-pointer transition-all shadow-2xs"
              title="Close subtasks window (Esc)"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ================= SECONDARY CONTROLS / TOOLBAR ================= */}
        <div className="px-3 sm:px-4 py-2 bg-[#FFF8EC] border-b border-[#EADDC7] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Presets chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            <span className="text-[10px] font-black uppercase text-[#8C7A6B] shrink-0 mr-1 flex items-center gap-1">
              <Sparkles size={11} className="text-[#2D6A4F]" />
              Quick Presets:
            </span>
            {COMMON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAddSubtask(preset)}
                className="px-2 py-0.5 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border border-[#EADDC7] text-[10.5px] font-semibold whitespace-nowrap cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Quick Actions: Sort by priority, Move completed to bottom */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleSortByPriority}
              className="px-2 py-1 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#594B3E] font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition-all"
              title="Sort subtasks by priority (High to Low)"
            >
              <Flag size={11} className="text-rose-600" />
              <span>Sort Priority</span>
            </button>

            <button
              type="button"
              onClick={handleMoveCompletedToBottom}
              className="px-2 py-1 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#594B3E] font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition-all"
              title="Move checked items to bottom"
            >
              <RotateCcw size={11} className="text-[#2D6A4F]" />
              <span>Checked to Bottom</span>
            </button>
          </div>
        </div>

        {/* ================= SUBTASK MULTI-COLUMN CONTENT AREA ================= */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto max-h-[58vh] sm:max-h-[62vh] space-y-3 no-scrollbar">
          {filteredSubtasks.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center text-[#8C7A6B]">
              <div className="w-12 h-12 rounded-full bg-[#FAF3E0] border border-[#EADDC7] flex items-center justify-center text-[#B09F8C] mb-2">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold text-[#594B3E]">No subtasks on this list yet</p>
              <p className="text-xs text-[#8C7A6B] mt-0.5">
                Type below and press Enter to quickly add multiple subtasks row by row.
              </p>
            </div>
          ) : (
            <div className={gridClass}>
              {filteredSubtasks.map((st, index) => {
                const badge = getPriorityBadge(st.priority);
                const isEditing = editingId === st.id;

                return (
                  <div
                    key={st.id}
                    className={`relative group rounded-2xl p-2.5 sm:p-3 border transition-all duration-150 flex items-start gap-2 ${
                      st.completed
                        ? "bg-[#FAF3E0]/70 border-[#E5D7C2] opacity-75"
                        : "bg-[#FAF3E0] border-[#EADDC7] hover:border-[#D8C7AF] hover:shadow-xs"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleSubtask(st.id)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                        st.completed
                          ? "bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-2xs"
                          : "bg-white border-[#B09F8C] hover:border-[#2D6A4F]"
                      }`}
                      title={st.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {st.completed && <Check size={13} strokeWidth={3} />}
                    </button>

                    {/* Middle: Title & Inline Edit */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="w-full">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleSaveEdit(st.id)}
                            onKeyDown={(e) => handleEditKeyDown(e, index, st.id)}
                            // Enforce minimum 16px font-size to prevent iOS Safari auto zoom
                            style={{ fontSize: "16px", touchAction: "manipulation" }}
                            className="w-full px-2 py-1 rounded-xl bg-white border-2 border-[#2D6A4F] text-[#2D2319] font-medium focus:outline-none shadow-xs"
                          />
                          <p className="text-[9.5px] text-[#8C7A6B] mt-0.5 flex items-center gap-1 font-medium">
                            <CornerDownLeft size={9} /> Press Enter to save & go to next row
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p
                            onClick={() => {
                              setEditingId(st.id);
                              setEditingTitle(st.title);
                            }}
                            className={`text-xs sm:text-[13px] font-semibold leading-snug break-words cursor-pointer hover:text-[#2D6A4F] transition-colors ${
                              st.completed ? "line-through text-[#8C7A6B]" : "text-[#2D2319]"
                            }`}
                            title="Click to edit subtask text"
                          >
                            {st.title}
                          </p>

                          {/* Row metadata: Priority pill + Re-prioritize quick toggle */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {/* Clickable Priority Pill that cycles priority directly */}
                            <button
                              type="button"
                              onClick={(e) => handleCyclePriority(st.id, e)}
                              className={`px-1.5 py-0.5 rounded-md border text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97] ${badge.badgeClass}`}
                              title="Click to re-prioritize (High / Med / Low / Normal)"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                              <span>{badge.label}</span>
                            </button>

                            {/* Up / Down reordering buttons */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleMove(index, "up", e)}
                                disabled={index === 0}
                                className="p-0.5 rounded hover:bg-[#EADDC7] disabled:opacity-20 cursor-pointer text-[#7A6B5C]"
                                title="Move row up"
                              >
                                <ArrowUp size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleMove(index, "down", e)}
                                disabled={index === subtasks.length - 1}
                                className="p-0.5 rounded hover:bg-[#EADDC7] disabled:opacity-20 cursor-pointer text-[#7A6B5C]"
                                title="Move row down"
                              >
                                <ArrowDown size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Action Icons: Edit & Delete */}
                    {!isEditing && (
                      <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(st.id);
                            setEditingTitle(st.title);
                          }}
                          className="p-1 rounded-lg hover:bg-[#EADDC7] text-[#594B3E] cursor-pointer"
                          title="Edit subtask"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSubtask(st.id)}
                          className="p-1 rounded-lg hover:bg-[#FDE8E8] text-[#C53030] cursor-pointer"
                          title="Delete subtask"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= RAPID KEYBOARD ENTRY BOTTOM ROW ================= */}
        {/* At the end of a subtask entry, if the user presses Return/Enter, the cursor automatically goes to the next subtask row */}
        <div className="p-3 sm:p-4 bg-[#FAF0E1] border-t-2 border-[#EADDC7] shrink-0">
          <form onSubmit={handleAddNewSubtaskRow} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Input field with strict 16px font-size to prevent mobile auto-zoom */}
            <div className="relative flex-1">
              <input
                ref={newSubtaskInputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddNewSubtaskRow(e);
                  }
                }}
                placeholder="Type a subtask and press Return / Enter for next row..."
                // Strict 16px font size to prevent any auto-zooming on focus
                style={{ fontSize: "16px", touchAction: "manipulation" }}
                className="w-full pl-3 pr-20 py-2.5 rounded-2xl bg-white border-2 border-[#D8C7AF] focus:border-[#2D6A4F] text-[#2D2319] placeholder-[#9C8C7D] font-medium focus:outline-none shadow-xs transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-[#8C7A6B] bg-[#FAF3E0] px-1.5 py-0.5 rounded-md border border-[#EADDC7] pointer-events-none hidden sm:inline-flex items-center gap-1">
                <CornerDownLeft size={9} /> Return / Next Row
              </span>
            </div>

            {/* Optional Priority Tag for new row */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center rounded-xl bg-[#EFE4D2] p-0.5 border border-[#E0D2BE]">
                <button
                  type="button"
                  onClick={() => setNewPriority(newPriority === "high" ? undefined : "high")}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all ${
                    newPriority === "high"
                      ? "bg-[#C53030] text-white shadow-2xs"
                      : "text-[#6B5D4F] hover:text-[#C53030]"
                  }`}
                  title="Mark High Priority"
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => setNewPriority(newPriority === "medium" ? undefined : "medium")}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all ${
                    newPriority === "medium"
                      ? "bg-[#B45309] text-white shadow-2xs"
                      : "text-[#6B5D4F] hover:text-[#B45309]"
                  }`}
                  title="Mark Medium Priority"
                >
                  Med
                </button>
                <button
                  type="button"
                  onClick={() => setNewPriority(newPriority === "low" ? undefined : "low")}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all ${
                    newPriority === "low"
                      ? "bg-[#0369A1] text-white shadow-2xs"
                      : "text-[#6B5D4F] hover:text-[#0369A1]"
                  }`}
                  title="Mark Low Priority"
                >
                  Low
                </button>
              </div>

              {/* Add Button */}
              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98 transition-all shrink-0"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Add Row</span>
              </button>
            </div>
          </form>

          {/* Helper instructions */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#8C7A6B] font-medium">
            <span>💡 Tip: Press Return / Enter at the end of each subtask to rapidly create row after row without leaving your keyboard.</span>
            <button
              type="button"
              onClick={onClose}
              className="text-[#594B3E] hover:text-[#2D2319] underline font-bold cursor-pointer ml-2 shrink-0"
            >
              Done / Collapse Window
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
