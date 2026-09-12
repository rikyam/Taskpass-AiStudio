import React from "react";
import { Task, Subtask } from "../types";

export interface TextModeTaskDeckCardBodyProps {
  task: Task;
  cardStyling: {
    bg: string;
    expandedBg: string;
    border: string;
    color: string;
  };
  isDark?: boolean;
  durationMins: number;
  sessionText: string;
  categories?: string[];
  allCollaborators: string[];
  subtasks: Subtask[];
  onUpdateTask?: (task: Task, updates: Partial<Task>) => void;
  handleToggleLock: () => void;
  handleAdjustDuration: (delta: number) => void;
  handleToggleSubtaskItem: (id: string) => void;
  handleDeleteSubtaskItem: (id: string) => void;
  handleModalAddSubtask: (title: string) => void;
  setIsSubtaskWindowOpen: (open: boolean) => void;
  onFocusTask?: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onMoveToBacklog?: (task: Task) => void;
  onMoveToCurrentDay?: (task: Task) => void;
  deckTab?: string;
  triggerHaptic?: (type: string) => void;
  getGoogleMapsDirectionsUrl?: (loc: string) => string;
}

export const TextModeTaskDeckCardBody: React.FC<TextModeTaskDeckCardBodyProps> = ({
  task,
  cardStyling,
  isDark = true,
  durationMins,
  sessionText,
  categories,
  allCollaborators,
  subtasks,
  onUpdateTask,
  handleToggleLock,
  handleAdjustDuration,
  handleToggleSubtaskItem,
  handleDeleteSubtaskItem,
  handleModalAddSubtask,
  setIsSubtaskWindowOpen,
  onFocusTask,
  onEditTask,
  onDeleteTask,
  onMoveToBacklog,
  onMoveToCurrentDay,
  deckTab = "active",
  triggerHaptic = () => {},
  getGoogleMapsDirectionsUrl = (loc) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`,
}) => {
  return (
    <div
      className="rounded-2xl p-3.5 sm:p-4 my-3 border space-y-3.5 text-xs select-text"
      style={{
        backgroundColor: cardStyling.expandedBg,
        borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
        color: cardStyling.color,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ATTRIBUTE ROW 1: START TIME, DURATION & PRIORITY */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="space-y-1 sm:col-span-3">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            Start Time
          </label>
          <input
            type="time"
            value={task.time || "09:00"}
            onChange={(e) => {
              if (onUpdateTask) onUpdateTask(task, { time: e.target.value });
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold bg-black/15 border-white/20 focus:border-indigo-400 focus:outline-none"
            style={{ color: cardStyling.color }}
          />
        </div>

        <div className="space-y-1 sm:col-span-6">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
              Duration: {durationMins}m ({sessionText})
            </label>
            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => handleAdjustDuration(-5)}
                className="px-1.5 py-0.5 rounded border border-white/20 hover:bg-white/10 font-mono font-bold cursor-pointer"
                title="Subtract 5m"
              >
                -5m
              </button>
              <button
                type="button"
                onClick={() => handleAdjustDuration(5)}
                className="px-1.5 py-0.5 rounded border border-white/20 hover:bg-white/10 font-mono font-bold cursor-pointer"
                title="Add 5m"
              >
                +5m
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[15, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  if (onUpdateTask) onUpdateTask(task, { duration: `${mins}` });
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  durationMins === mins
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-xs"
                    : "bg-white/5 border-white/15 hover:bg-white/10 opacity-80"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 sm:col-span-3">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            Priority
          </label>
          <div className="flex items-center gap-1">
            {(["none", "low", "medium", "high"] as const).map((p) => {
              const isSelected = (task.priority || "none") === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    if (onUpdateTask) onUpdateTask(task, { priority: p });
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                    isSelected
                      ? p === "high"
                        ? "bg-rose-500 border-rose-400 text-white"
                        : p === "medium"
                        ? "bg-amber-500 border-amber-400 text-white"
                        : p === "low"
                        ? "bg-blue-500 border-blue-400 text-white"
                        : "bg-slate-500 border-slate-400 text-white"
                      : "bg-white/5 border-white/15 hover:bg-white/10 opacity-70"
                  }`}
                >
                  {p === "none" ? "—" : p[0].toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ATTRIBUTE ROW 2: TASK TYPE & CATEGORY SHARE THE SAME ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            Task Type
          </label>
          <button
            type="button"
            onClick={handleToggleLock}
            className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
              task.isLocked
                ? "bg-rose-600/30 border-rose-400/50 text-rose-200"
                : "bg-white/5 border-white/15 hover:bg-white/10 opacity-90"
            }`}
          >
            <span>{task.isLocked ? "Locked Time" : "Flexible"}</span>
            <span className="text-[9.5px] opacity-70">Toggle</span>
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            Category
          </label>
          <select
            value={task.category || ""}
            onChange={(e) => {
              triggerHaptic("light");
              if (onUpdateTask) onUpdateTask(task, { category: e.target.value });
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-black/15 border-white/20 focus:border-indigo-400 focus:outline-none cursor-pointer"
            style={{ color: cardStyling.color }}
          >
            <option value="" className="text-slate-900">None</option>
            {(categories && categories.length > 0 ? categories : [
              "Work", "Personal", "Health", "Errands", "Focus", "Creative"
            ]).map((cat) => (
              <option key={cat} value={cat} className="text-slate-900">
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ATTRIBUTE ROW 2B: CATEGORY & COLLABORATOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            Collaborator
          </label>
          <select
            value={task.collaborator || ""}
            onChange={(e) => {
              triggerHaptic("light");
              if (onUpdateTask) onUpdateTask(task, { collaborator: e.target.value });
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-black/15 border-white/20 focus:border-indigo-400 focus:outline-none cursor-pointer"
            style={{ color: cardStyling.color }}
          >
            <option value="" className="text-slate-900">Unassigned (None)</option>
            {allCollaborators.map((c) => (
              <option key={c} value={c} className="text-slate-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ATTRIBUTE ROW 3: PRE-TASK BUFFER, LOCATION & POST-TASK BUFFER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* PRE-TASK BUFFER */}
        <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
              Pre-Buffer: {task.travelBefore || 0}m
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(0, (task.travelBefore || 0) - 5);
                  if (onUpdateTask) onUpdateTask(task, { travelBefore: next });
                }}
                className="px-1.5 py-0.5 rounded border border-white/20 text-[9px] font-mono hover:bg-white/10 cursor-pointer"
                title="Subtract 5m"
              >
                -5m
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = (task.travelBefore || 0) + 5;
                  if (onUpdateTask) onUpdateTask(task, { travelBefore: next });
                }}
                className="px-1.5 py-0.5 rounded border border-white/20 text-[9px] font-mono hover:bg-white/10 cursor-pointer"
                title="Add 5m"
              >
                +5m
              </button>
            </div>
          </div>
          <input
            type="text"
            value={task.beforeBufferPurpose || "Preparation"}
            placeholder="Purpose (e.g. Travel, Prep)"
            onChange={(e) => {
              if (onUpdateTask) onUpdateTask(task, { beforeBufferPurpose: e.target.value });
            }}
            className="w-full px-2 py-1 rounded border text-[11px] bg-black/15 border-white/15 focus:outline-none"
            style={{ color: cardStyling.color }}
          />
        </div>

        {/* LOCATION / VENUE */}
        <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
              Location / Venue
            </label>
            {task.location && (
              <a
                href={getGoogleMapsDirectionsUrl(task.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9.5px] font-bold text-indigo-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Directions ↗
              </a>
            )}
          </div>
          <input
            type="text"
            value={task.location || ""}
            placeholder="e.g. Office, Zoom, Coffee Shop"
            onChange={(e) => {
              if (onUpdateTask) onUpdateTask(task, { location: e.target.value });
            }}
            className="w-full px-2 py-1 rounded border text-[11px] bg-black/15 border-white/15 focus:outline-none"
            style={{ color: cardStyling.color }}
          />
        </div>

        {/* POST-TASK BUFFER */}
        <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
              Post-Buffer: {task.travelAfter || 0}m
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(0, (task.travelAfter || 0) - 5);
                  if (onUpdateTask) onUpdateTask(task, { travelAfter: next });
                }}
                className="px-1.5 py-0.5 rounded border border-white/20 text-[9px] font-mono hover:bg-white/10 cursor-pointer"
                title="Subtract 5m"
              >
                -5m
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = (task.travelAfter || 0) + 5;
                  if (onUpdateTask) onUpdateTask(task, { travelAfter: next });
                }}
                className="px-1.5 py-0.5 rounded border border-white/20 text-[9px] font-mono hover:bg-white/10 cursor-pointer"
                title="Add 5m"
              >
                +5m
              </button>
            </div>
          </div>
          <input
            type="text"
            value={task.afterBufferPurpose || "Wrap-up"}
            placeholder="Purpose (e.g. Wrap-up, Rest)"
            onChange={(e) => {
              if (onUpdateTask) onUpdateTask(task, { afterBufferPurpose: e.target.value });
            }}
            className="w-full px-2 py-1 rounded border text-[11px] bg-black/15 border-white/15 focus:outline-none"
            style={{ color: cardStyling.color }}
          />
        </div>
      </div>

      {/* ATTRIBUTE ROW 5: SUBTASKS CHECKLIST */}
      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            Subtasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})
          </span>
          <button
            type="button"
            onClick={() => setIsSubtaskWindowOpen(true)}
            className="text-[10px] font-bold text-indigo-400 hover:underline cursor-pointer"
          >
            Open Subtasks Modal ↗
          </button>
        </div>

        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {subtasks.map((st) => (
            <div
              key={st.id}
              className="flex items-center justify-between p-1.5 rounded-lg bg-black/10 border border-white/10 text-xs"
            >
              <div
                className="flex items-center gap-2 flex-1 cursor-pointer"
                onClick={() => handleToggleSubtaskItem(st.id)}
              >
                <input
                  type="checkbox"
                  checked={st.completed}
                  readOnly
                  className="rounded cursor-pointer"
                />
                <span className={st.completed ? "line-through opacity-50" : ""}>
                  {st.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteSubtaskItem(st.id)}
                className="text-[10px] text-rose-400 hover:text-rose-300 px-1 cursor-pointer"
                title="Delete Subtask"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.elements.namedItem("newSubtask") as HTMLInputElement;
            if (input && input.value.trim()) {
              handleModalAddSubtask(input.value.trim());
              input.value = "";
            }
          }}
          className="flex items-center gap-1.5 pt-1"
        >
          <input
            name="newSubtask"
            type="text"
            placeholder="+ Add a subtask (press Enter)..."
            className="flex-1 px-2.5 py-1 rounded-lg border text-xs bg-black/15 border-white/15 focus:outline-none"
            style={{ color: cardStyling.color }}
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold cursor-pointer"
          >
            Add
          </button>
        </form>
      </div>

      {/* ATTRIBUTE ROW 6: NOTES & HELPFUL LINKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            Notes
          </label>
          <textarea
            rows={2}
            value={task.notes || ""}
            placeholder="Task notes / details..."
            onChange={(e) => {
              if (onUpdateTask) onUpdateTask(task, { notes: e.target.value });
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-black/15 border-white/20 focus:outline-none resize-none"
            style={{ color: cardStyling.color }}
          />
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
              Helpful Link
            </label>
            <input
              type="text"
              value={task.hyperlink || task.helpfulLinks || ""}
              placeholder="https://..."
              onChange={(e) => {
                if (onUpdateTask) onUpdateTask(task, { hyperlink: e.target.value });
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-black/15 border-white/20 focus:outline-none"
              style={{ color: cardStyling.color }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">
              Contact / Phone
            </label>
            <input
              type="text"
              value={task.phone || ""}
              placeholder="Phone or contact info"
              onChange={(e) => {
                if (onUpdateTask) onUpdateTask(task, { phone: e.target.value });
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-black/15 border-white/20 focus:outline-none"
              style={{ color: cardStyling.color }}
            />
          </div>
        </div>
      </div>

      {/* ATTRIBUTE ROW 7: ACTION BUTTONS ROW (TEXT ONLY) */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
        {onFocusTask && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              onFocusTask(task);
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Start Focus
          </button>
        )}

        <button
          type="button"
          onClick={() => onEditTask(task)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold cursor-pointer transition-colors"
        >
          Edit Full Form
        </button>

        {onMoveToBacklog && deckTab !== "backlog" && (
          <button
            type="button"
            onClick={() => onMoveToBacklog(task)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold opacity-80 cursor-pointer"
          >
            Send to Saved
          </button>
        )}

        {onMoveToCurrentDay && deckTab === "backlog" && (
          <button
            type="button"
            onClick={() => onMoveToCurrentDay(task)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 text-xs font-semibold cursor-pointer"
          >
            Move to Today
          </button>
        )}

        {onDeleteTask && (
          <button
            type="button"
            onClick={() => onDeleteTask(task)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 ml-auto cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
