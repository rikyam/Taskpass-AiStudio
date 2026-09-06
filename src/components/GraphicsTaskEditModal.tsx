import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Save,
  Trash2,
  Clock,
  MapPin,
  Users,
  Check,
  Plus,
  CalendarDays,
  ExternalLink,
  Tag,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Task, Subtask } from "../types";

export interface GraphicsTaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  // State bindings from InteractiveApp or local defaults
  taskTitle: string;
  setTaskTitle: (v: string) => void;
  taskDate: string;
  setTaskDate: (v: string) => void;
  taskTime: string;
  setTaskTime: (v: string) => void;
  taskDuration: string;
  setTaskDuration: (v: string) => void;
  taskPriority: string;
  setTaskPriority: (v: any) => void;
  taskCategory: string;
  setTaskCategory: (v: string) => void;
  taskCollaborator: string;
  setTaskCollaborator: (v: string) => void;
  taskLocation: string;
  setTaskLocation: (v: string) => void;
  taskNotes: string;
  setTaskNotes: (v: string) => void;
  taskIsLocked?: boolean;
  setTaskIsLocked?: (v: boolean) => void;
  taskIsAllDay?: boolean;
  setTaskIsAllDay?: (v: boolean) => void;
  taskTravelBefore?: number;
  setTaskTravelBefore?: (v: number) => void;
  taskTravelAfter?: number;
  setTaskTravelAfter?: (v: number) => void;
  collaborators?: string[];
  favoriteLocations?: string[];
  onSave: () => void;
  onDelete?: () => void;
  onFoTL?: () => void;
  triggerHaptic?: (type: string) => void;
  onUpdateSubtasks?: (subtasks: Subtask[]) => void;
}

const PRESET_CATEGORIES = [
  "Work",
  "Personal",
  "Meeting",
  "Study",
  "Health & Wellness",
  "Design",
  "Development",
  "Errand",
];

const PRESET_DURATIONS = [15, 25, 45, 60, 90];

const PRESET_PRIORITIES = [
  { id: "none", label: "None", color: "text-[#786C60] bg-[#FAF3E0] border-[#EADDC7]" },
  { id: "low", label: "Low", color: "text-sky-700 bg-sky-50 border-sky-200" },
  { id: "medium", label: "Medium", color: "text-amber-800 bg-amber-50 border-amber-200" },
  { id: "high", label: "High", color: "text-rose-700 bg-rose-50 border-rose-200" },
];

export const GraphicsTaskEditModal: React.FC<GraphicsTaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  taskTitle,
  setTaskTitle,
  taskDate,
  setTaskDate,
  taskTime,
  setTaskTime,
  taskDuration,
  setTaskDuration,
  taskPriority,
  setTaskPriority,
  taskCategory,
  setTaskCategory,
  taskCollaborator,
  setTaskCollaborator,
  taskLocation,
  setTaskLocation,
  taskNotes,
  setTaskNotes,
  taskIsLocked = false,
  setTaskIsLocked,
  taskIsAllDay = false,
  setTaskIsAllDay,
  taskTravelBefore = 0,
  setTaskTravelBefore,
  taskTravelAfter = 0,
  setTaskTravelAfter,
  collaborators = [],
  favoriteLocations = ["Office", "Home Desk", "Conference Room", "Studio", "Remote"],
  onSave,
  onDelete,
  onFoTL,
  triggerHaptic = () => {},
  onUpdateSubtasks,
}) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCollab, setShowCustomCollab] = useState(false);
  const [customCollab, setCustomCollab] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "schedule" | "subtasks" | "notes">("general");

  // Keep subtasks in sync when task changes
  useEffect(() => {
    if (task?.subtasks) {
      setSubtasks(task.subtasks);
    }
  }, [task]);

  if (!isOpen) return null;

  // Numeric duration parsing
  const durationNum = parseInt(taskDuration || "25", 10) || 25;

  const handleToggleSubtask = (id: string) => {
    const updated = subtasks.map((st) =>
      st.id === id ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updated);
    if (onUpdateSubtasks) onUpdateSubtasks(updated);
    triggerHaptic("light");
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSt: Subtask = {
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const updated = [...subtasks, newSt];
    setSubtasks(updated);
    if (onUpdateSubtasks) onUpdateSubtasks(updated);
    setNewSubtaskTitle("");
    triggerHaptic("light");
  };

  const handleDeleteSubtask = (id: string) => {
    const updated = subtasks.filter((st) => st.id !== id);
    setSubtasks(updated);
    if (onUpdateSubtasks) onUpdateSubtasks(updated);
    triggerHaptic("light");
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setTaskDate(today);
    triggerHaptic("light");
  };

  const handleSetTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setTaskDate(d.toISOString().split("T")[0]);
    triggerHaptic("light");
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[650] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-[#EADDC7] bg-[#FAF3E0] text-[#3D312A] cursor-default"
        style={{
          backgroundColor: "#FAF3E0",
          color: "#3D312A",
        }}
      >
        {/* ================================================================= */}
        {/* TOP HEADER: TITLE, FOTL, DELETE, CLOSE                            */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#EADDC7] bg-[#FFF2DF] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#A25F37]/15 border border-[#A25F37]/30 flex items-center justify-center text-[#A25F37]">
              <Tag size={14} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#2D2319]">
                {task ? "Task Edit" : "New Task"}
              </h2>
              <div className="text-[9.5px] font-bold text-[#8C7A6B]">
                Graphics Mode • Task Card Look
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* FoTL Button */}
            {onFoTL && (
              <button
                type="button"
                onClick={() => {
                  onFoTL();
                  triggerHaptic("medium");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Focus on The Line: Set start to now, lock, and save"
              >
                <Clock size={11} />
                <span>FoTL</span>
              </button>
            )}

            {/* Delete Button */}
            {task && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  triggerHaptic("heavy");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FEECEB] hover:bg-[#FCDAD7] text-[#C53030] border border-[#F5C2C0] rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Delete this task"
              >
                <Trash2 size={11} />
                <span className="hidden xs:inline">Delete</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#EADDC7] text-[#786C60] hover:text-[#2D2319] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={17} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB NAVIGATION PILLS                                              */}
        {/* ================================================================= */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 pb-1 border-b border-[#EADDC7]/60 bg-[#FFF2DF]/60 shrink-0">
          {[
            { id: "general", label: "Details" },
            { id: "schedule", label: "Schedule & Timer" },
            { id: "subtasks", label: `Subtasks (${subtasks.length})` },
            { id: "notes", label: "Notes" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id as any);
                triggerHaptic("light");
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === t.id
                  ? "bg-[#FAF3E0] text-[#A25F37] border border-[#EADDC7] shadow-2xs"
                  : "text-[#786C60] hover:text-[#2D2319] hover:bg-[#FAF3E0]/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ================================================================= */}
        {/* MODAL BODY (SCROLLABLE CONTENT)                                   */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-4">
          {/* ------------------------------------------------------------- */}
          {/* TAB 1: GENERAL DETAILS                                        */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "general" && (
            <div className="space-y-3.5">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6B5A4B] block">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FFF2DF] border border-[#C4B4A0] text-[#2D2319] font-black text-sm sm:text-base placeholder-[#8C7A6B] focus:outline-none focus:border-[#A25F37] focus:ring-1 focus:ring-[#A25F37]/30 shadow-inner transition-all"
                  autoFocus
                />
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#6B5A4B]">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomCategory(!showCustomCategory)}
                      className="text-[9.5px] font-bold text-[#A25F37] hover:underline cursor-pointer"
                    >
                      {showCustomCategory ? "Choose from list" : "+ Custom"}
                    </button>
                  </div>

                  {showCustomCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter category name..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#FFF2DF] border border-[#C4B4A0] text-[#2D2319] text-xs font-bold focus:outline-none focus:border-[#A25F37]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customCategory.trim()) {
                            setTaskCategory(customCategory.trim());
                            setShowCustomCategory(false);
                          }
                        }}
                        className="px-2.5 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  ) : (
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFF2DF] border border-[#C4B4A0] text-[#2D2319] font-bold text-xs focus:outline-none focus:border-[#A25F37] cursor-pointer"
                    >
                      <option value="">Select Category...</option>
                      {PRESET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      {taskCategory && !PRESET_CATEGORIES.includes(taskCategory) && (
                        <option value={taskCategory}>{taskCategory} (Current)</option>
                      )}
                    </select>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#6B5A4B] block">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {PRESET_PRIORITIES.map((p) => {
                      const isSelected = (taskPriority || "none") === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setTaskPriority(p.id);
                            triggerHaptic("light");
                          }}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all text-center cursor-pointer ${
                            isSelected
                              ? "bg-[#A25F37] text-white border-[#A25F37] shadow-sm font-black"
                              : "bg-[#FFF2DF] text-[#594B3E] border-[#EADDC7] hover:bg-[#EADDC7]"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Collaborator Section */}
              <div className="p-3 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#6B5A4B]">
                    <Users size={13} className="text-[#A25F37]" />
                    <span>Collaborator / Assigned</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomCollab(!showCustomCollab)}
                    className="text-[9.5px] font-bold text-[#A25F37] hover:underline cursor-pointer"
                  >
                    {showCustomCollab ? "Choose from list" : "+ Add Member"}
                  </button>
                </div>

                {showCustomCollab ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customCollab}
                      onChange={(e) => setCustomCollab(e.target.value)}
                      placeholder="Collaborator name..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[#FAF3E0] border border-[#C4B4A0] text-[#2D2319] text-xs font-bold focus:outline-none focus:border-[#A25F37]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCollab.trim()) {
                          setTaskCollaborator(customCollab.trim());
                          setShowCustomCollab(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase cursor-pointer"
                    >
                      Assign
                    </button>
                  </div>
                ) : (
                  <select
                    value={taskCollaborator}
                    onChange={(e) => setTaskCollaborator(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF3E0] border border-[#C4B4A0] text-[#2D2319] font-bold text-xs focus:outline-none focus:border-[#A25F37] cursor-pointer"
                  >
                    <option value="">None (Unassigned)</option>
                    {collaborators.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    {taskCollaborator && !collaborators.includes(taskCollaborator) && (
                      <option value={taskCollaborator}>{taskCollaborator} (Assigned)</option>
                    )}
                  </select>
                )}
              </div>

              {/* Location Section */}
              <div className="p-3 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#6B5A4B]">
                    <MapPin size={13} className="text-[#A25F37]" />
                    <span>Location</span>
                  </div>
                  {taskLocation && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        taskLocation
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9.5px] font-bold text-[#A25F37] flex items-center gap-1 hover:underline"
                    >
                      <span>View Map</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                <input
                  type="text"
                  value={taskLocation}
                  onChange={(e) => setTaskLocation(e.target.value)}
                  placeholder="Address, office room, or venue..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF3E0] border border-[#C4B4A0] text-[#2D2319] text-xs font-bold focus:outline-none focus:border-[#A25F37]"
                />

                {/* Quick Location Pills */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {favoriteLocations.slice(0, 4).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setTaskLocation(loc)}
                      className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer ${
                        taskLocation === loc
                          ? "bg-[#A25F37] text-white"
                          : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#6B5A4B] border border-[#EADDC7]"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: SCHEDULE & POMODORO TIMER DURATION                     */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              {/* Date & Time Row */}
              <div className="p-3.5 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#6B5A4B] flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-[#A25F37]" />
                  <span>Scheduled Date & Time</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Date Input */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-[#786C60] uppercase">
                      Date
                    </label>
                    <input
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF3E0] border border-[#C4B4A0] text-[#2D2319] font-bold text-xs focus:outline-none focus:border-[#A25F37]"
                    />
                    {/* Quick Date Presets */}
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={handleSetToday}
                        className="flex-1 py-1 rounded-lg text-[9.5px] font-bold bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border border-[#EADDC7] cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={handleSetTomorrow}
                        className="flex-1 py-1 rounded-lg text-[9.5px] font-bold bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border border-[#EADDC7] cursor-pointer"
                      >
                        Tomorrow
                      </button>
                    </div>
                  </div>

                  {/* Time Input */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-[#786C60] uppercase">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF3E0] border border-[#C4B4A0] text-[#2D2319] font-bold text-xs focus:outline-none focus:border-[#A25F37]"
                    />

                    {/* Quick Lock Start Time Checkbox */}
                    {setTaskIsLocked && (
                      <div className="flex items-center gap-2 pt-1.5">
                        <input
                          type="checkbox"
                          id="edit-lock-time"
                          checked={!!taskIsLocked}
                          onChange={(e) => setTaskIsLocked(e.target.checked)}
                          className="w-4 h-4 rounded border-[#C4B4A0] text-[#A25F37] cursor-pointer"
                        />
                        <label
                          htmlFor="edit-lock-time"
                          className="text-[10px] font-bold text-[#594B3E] cursor-pointer flex items-center gap-1"
                        >
                          {taskIsLocked ? <Lock size={11} className="text-[#A25F37]" /> : <Unlock size={11} />}
                          <span>Lock start on timeline</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DURATION & POMODORO TIMER ASSOCIATION */}
              <div className="p-3.5 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#6B5A4B]">
                    <Clock size={14} className="text-[#A25F37]" />
                    <span>Pomodoro Timer & Duration</span>
                  </div>
                  <span className="text-xs font-black text-[#A25F37]">
                    {durationNum} min session
                  </span>
                </div>

                {/* Preset Duration Pills */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-bold text-[#786C60] uppercase">
                    Quick Duration Presets
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PRESET_DURATIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setTaskDuration(String(mins));
                          triggerHaptic("light");
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                          durationNum === mins
                            ? "bg-[#A25F37] text-white shadow-sm font-black"
                            : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border border-[#EADDC7]"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Minutes Input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-[#786C60]">Custom Duration:</span>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={durationNum}
                    onChange={(e) => setTaskDuration(e.target.value)}
                    className="w-20 px-2.5 py-1 text-xs font-bold rounded-lg border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none"
                  />
                  <span className="text-xs font-bold text-[#594B3E]">minutes</span>
                </div>
              </div>

              {/* Travel Buffers (Optional) */}
              {(setTaskTravelBefore || setTaskTravelAfter) && (
                <div className="p-3 rounded-2xl bg-[#FFF2DF] border border-[#EADDC7] space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#6B5A4B]">
                    Travel / Preparation Buffers
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {setTaskTravelBefore && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#786C60]">
                          Before Buffer (mins)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          step="5"
                          value={taskTravelBefore}
                          onChange={(e) => setTaskTravelBefore(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319]"
                        />
                      </div>
                    )}
                    {setTaskTravelAfter && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#786C60]">
                          After Buffer (mins)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          step="5"
                          value={taskTravelAfter}
                          onChange={(e) => setTaskTravelAfter(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: SUBTASKS CHECKLIST                                     */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "subtasks" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6B5A4B]">
                  Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                </label>
              </div>

              {/* Subtasks List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
                {subtasks.length === 0 ? (
                  <div className="py-6 text-center text-xs font-bold text-[#8C7A6B] bg-[#FFF2DF]/70 rounded-2xl border border-dashed border-[#EADDC7]">
                    No subtasks yet. Add smaller steps below!
                  </div>
                ) : (
                  subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-[#FFF2DF] border border-[#EADDC7] transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          st.completed
                            ? "bg-[#A25F37] border-[#A25F37] text-white"
                            : "border-[#B09F8C] bg-white hover:border-[#A25F37]"
                        }`}
                      >
                        {st.completed && <Check size={11} strokeWidth={3} />}
                      </button>

                      <span
                        onClick={() => handleToggleSubtask(st.id)}
                        className={`text-xs font-bold flex-1 cursor-pointer truncate ${
                          st.completed ? "line-through text-[#8C7A6B]" : "text-[#2D2319]"
                        }`}
                      >
                        {st.title}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#C53030] hover:bg-[#FEECEB] transition-colors cursor-pointer"
                        title="Delete subtask"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Subtask Input Form */}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="New subtask step..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FFF2DF] border border-[#C4B4A0] text-[#2D2319] text-xs font-bold focus:outline-none focus:border-[#A25F37]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>Add</span>
                </button>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 4: NOTES & INSTRUCTIONS                                   */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "notes" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6B5A4B] block">
                Task Notes & Instructions
              </label>
              <textarea
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Add context, helpful links, checklist, or reflection notes here..."
                rows={6}
                className="w-full p-3 rounded-2xl bg-[#FFF2DF] border border-[#C4B4A0] text-[#2D2319] text-xs font-bold focus:outline-none focus:border-[#A25F37] resize-none placeholder-[#8C7A6B]"
              />
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTIONS: CANCEL, SAVE CHANGES                              */}
        {/* ================================================================= */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#EADDC7] bg-[#FFF2DF] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-[#594B3E] hover:bg-[#EADDC7] border border-[#EADDC7] transition-all cursor-pointer active:scale-95"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onSave();
              triggerHaptic("success");
            }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#2D6A4F] hover:bg-[#1B4332] shadow-md transition-all active:scale-95 cursor-pointer border border-[#2D6A4F]"
          >
            <Save size={13} />
            <span>Save Task</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
