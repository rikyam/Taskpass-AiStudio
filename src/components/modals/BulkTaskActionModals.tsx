import React, { useState } from "react";
import { Task } from "../../types";
import { Modal } from "../InteractiveAppHelpers";
import { getLocalDateString } from "../../utils/timeHelpers";

export interface BulkTaskActionModalsProps {
  tasks: Task[];
  tasksRef: React.MutableRefObject<Task[]>;
  selectedDate: string;
  saveWorkspace: (tasks: Task[]) => void;
  triggerHaptic: (type: string) => void;

  showUnlockAllModal: boolean;
  setShowUnlockAllModal: (val: boolean) => void;

  showClearPriorityModal: boolean;
  setShowClearPriorityModal: (val: boolean) => void;

  showBulkToBacklogModal: boolean;
  setShowBulkToBacklogModal: (val: boolean) => void;

  showBulkToTomorrowModal?: boolean;
  setShowBulkToTomorrowModal?: (val: boolean) => void;

  showBulkToDoneModal: boolean;
  setShowBulkToDoneModal: (val: boolean) => void;

  showBulkPrioritizeModal: boolean;
  setShowBulkPrioritizeModal: (val: boolean) => void;
  bulkRankedTaskIds: string[];
  setBulkRankedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleToggleBulkRank: (taskId: string) => void;
  handleApplyBulkRanks: () => void;
}

export const BulkTaskActionModals: React.FC<BulkTaskActionModalsProps> = ({
  tasks,
  tasksRef,
  selectedDate,
  saveWorkspace,
  triggerHaptic,
  showUnlockAllModal,
  setShowUnlockAllModal,
  showClearPriorityModal,
  setShowClearPriorityModal,
  showBulkToBacklogModal,
  setShowBulkToBacklogModal,
  showBulkToTomorrowModal = false,
  setShowBulkToTomorrowModal,
  showBulkToDoneModal,
  setShowBulkToDoneModal,
  showBulkPrioritizeModal,
  setShowBulkPrioritizeModal,
  bulkRankedTaskIds,
  setBulkRankedTaskIds,
  handleToggleBulkRank,
  handleApplyBulkRanks
}) => {
  const [unlockTasksSelection, setUnlockTasksSelection] = useState<Record<string, boolean>>({});
  const [clearPriorityTasksSelection, setClearPriorityTasksSelection] = useState<Record<string, boolean>>({});
  const [bulkToBacklogSelection, setBulkToBacklogSelection] = useState<Record<string, boolean>>({});
  const [bulkToTomorrowSelection, setBulkToTomorrowSelection] = useState<Record<string, boolean>>({});
  const [bulkToDoneSelection, setBulkToDoneSelection] = useState<Record<string, boolean>>({});

  const getTomorrowDateString = () => {
    const parts = (selectedDate || getLocalDateString()).split("-").map(Number);
    const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  };
  const tomorrowDateStr = getTomorrowDateString();

  const activeSortCandidates = React.useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter(t => {
      if (!t || !t.id) return false;
      if (seen.has(t.id)) return false;
      seen.add(t.id);

      if (t.date !== selectedDate) return false;

      // Ensure completed tasks are strictly excluded
      if (t.completed || (t as any).isCompleted || (t as any).status === "completed") return false;

      // Ensure deleted/archived markers are strictly excluded
      if ((t as any).isDeleted || (t as any).deleted || (t as any).archived) return false;

      // Exclude buffers and placeholders
      if (t.isOpenPlaceholder || t.isBuffer || t.bufferType) return false;
      if (t.id.endsWith("_before") || t.id.endsWith("_after")) return false;
      if (!t.title || !t.title.trim()) return false;

      // Exclude transferred or all-day tasks
      if (t.isTransferred || t.isAllDay) return false;

      // Repeating recurring master templates do not participate as candidate items
      if (t.isRecurring && !t.recurringParentId) return false;

      // For recurring instances, make sure parent exists, has not excluded this date, and is within recurrenceUntil
      if (t.recurringParentId) {
        const parent = tasks.find(p => p.id === t.recurringParentId);
        if (!parent) return false; // Parent deleted
        if (parent.recurrenceExclusions?.includes(selectedDate)) return false;
        if (parent.recurrenceUntil && selectedDate > parent.recurrenceUntil) return false;
      }

      // If this instance itself is marked as excluded for this date
      if (t.recurrenceExclusions?.includes(selectedDate)) return false;

      // Exclude locked tasks or locked sequence tasks
      if (t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) return false;

      return true;
    });
  }, [tasks, selectedDate]);

  return (

    <>
      {showUnlockAllModal && (
        <Modal 
        isOpen={showUnlockAllModal} 
        onClose={() => setShowUnlockAllModal(false)} 
        title="Checklist: Bulk Unlock Tasks"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-350 leading-relaxed">
            Unlocking converts static timeline task locks to dynamic multi-scheduled flexible entries for <strong>{selectedDate}</strong>.
          </p>

          {/* Headings and master checklist toggle */}
          {tasks.filter(t => t.date === selectedDate && t.isLocked && !t.isTransferred && !t.isAllDay && !t.completed).length > 0 && (
            <div className="flex bg-slate-900/65 border border-white/5 p-3 rounded-2xl items-center justify-between select-none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select all locked tasks</span>
              <input 
                type="checkbox" 
                checked={
                  tasks.filter(t => t.date === selectedDate && t.isLocked && !t.isTransferred && !t.isAllDay && !t.completed)
                    .every(t => unlockTasksSelection[t.id])
                }
                onChange={(e) => {
                  const val = e.target.checked;
                  const updated: Record<string, boolean> = {};
                  tasks.filter(t => t.date === selectedDate && t.isLocked && !t.isTransferred && !t.isAllDay && !t.completed).forEach(t => {
                    updated[t.id] = val;
                  });
                  setUnlockTasksSelection(updated);
                  triggerHaptic("light");
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          )}

          <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
            {tasks.filter(t => t.date === selectedDate && t.isLocked && !t.isTransferred && !t.isAllDay && !t.completed).map(t => (
              <label 
                key={t.id} 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-white/10 rounded-2xl hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-black text-white truncate leading-tight">{t.title}</span>
                  <span className="text-[8.5px] font-mono text-slate-400 uppercase mt-0.5">
                    Locked at {t.time || "N/A"} • {t.duration} mins
                  </span>
                </div>
                <input 
                  type="checkbox"
                  checked={!!unlockTasksSelection[t.id]}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setUnlockTasksSelection({
                      ...unlockTasksSelection,
                      [t.id]: e.target.checked
                    });
                    triggerHaptic("light");
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            ))}

            {tasks.filter(t => t.date === selectedDate && t.isLocked && !t.isTransferred && !t.isAllDay && !t.completed).length === 0 && (
              <p className="text-center py-8 text-xs text-slate-500 italic">No remaining locked tasks found for this day.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-2">
            <button 
              onClick={() => setShowUnlockAllModal(false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-xl font-black uppercase text-xs"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const updated = tasksRef.current.map(t => {
                  if (t.date === selectedDate && unlockTasksSelection[t.id]) {
                    return { ...t, isLocked: false, time: "" }; // Unlock and convert code to flexible!
                  }
                  return t;
                });
                saveWorkspace(updated);
                setShowUnlockAllModal(false);
                triggerHaptic("success");
              }}
              disabled={tasks.filter(t => t.date === selectedDate && t.isLocked && !t.isTransferred && !t.isAllDay && !t.completed).length === 0}
              className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-450 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all disabled:opacity-40"
            >
              Apply Unlock-All
            </button>
          </div>
        </div>
      </Modal>
      )}

      {/* NEW MODAL 5C: BULK CLEAR PRIORITY FLAGS CHECKLIST */}
      {showClearPriorityModal && (
        <Modal 
        isOpen={showClearPriorityModal} 
        onClose={() => setShowClearPriorityModal(false)} 
        title="Checklist: Clear Priorities"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-350 leading-relaxed font-sans">
            Clearing priority flags resets active task ranks back to regular ranks for <strong>{selectedDate}</strong>.
          </p>

          {tasks.filter(t => t.date === selectedDate && t.priority && t.priority !== "none" && !t.isTransferred && !t.isAllDay && !t.completed).length > 0 && (
            <div className="flex bg-slate-900/65 border border-white/5 p-3 rounded-2xl items-center justify-between select-none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select all prioritized tasks</span>
              <input 
                type="checkbox" 
                checked={
                  tasks.filter(t => t.date === selectedDate && t.priority && t.priority !== "none" && !t.isTransferred && !t.isAllDay && !t.completed)
                    .every(t => clearPriorityTasksSelection[t.id])
                }
                onChange={(e) => {
                  const val = e.target.checked;
                  const updated: Record<string, boolean> = {};
                  tasks.filter(t => t.date === selectedDate && t.priority && t.priority !== "none" && !t.isTransferred && !t.isAllDay && !t.completed).forEach(t => {
                    updated[t.id] = val;
                  });
                  setClearPriorityTasksSelection(updated);
                  triggerHaptic("light");
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          )}

          <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
            {tasks.filter(t => t.date === selectedDate && t.priority && t.priority !== "none" && !t.isTransferred && !t.isAllDay && !t.completed).map(t => (
              <label 
                key={t.id} 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-white/10 rounded-2xl hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-black text-white truncate leading-tight">{t.title}</span>
                  <span className="text-[8.5px] font-mono text-slate-400 uppercase mt-0.5">
                    Flag: {t.priority} • {t.duration} mins
                  </span>
                </div>
                <input 
                  type="checkbox"
                  checked={!!clearPriorityTasksSelection[t.id]}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setClearPriorityTasksSelection({
                      ...clearPriorityTasksSelection,
                      [t.id]: e.target.checked
                    });
                    triggerHaptic("light");
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            ))}

            {tasks.filter(t => t.date === selectedDate && t.priority && t.priority !== "none" && !t.isTransferred && !t.isAllDay && !t.completed).length === 0 && (
              <p className="text-center py-8 text-xs text-slate-500 italic">No remaining prioritized tasks found for this day.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-2">
            <button 
              onClick={() => setShowClearPriorityModal(false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-xl font-black uppercase text-xs"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const updated = tasksRef.current.map(t => {
                  if (t.date === selectedDate && clearPriorityTasksSelection[t.id]) {
                    return { ...t, priority: "none" as const }; // Clear priority!
                  }
                  return t;
                });
                saveWorkspace(updated);
                setShowClearPriorityModal(false);
                triggerHaptic("success");
              }}
              disabled={tasks.filter(t => t.date === selectedDate && t.priority && t.priority !== "none" && !t.isTransferred && !t.isAllDay && !t.completed).length === 0}
              className="flex-[2] py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all disabled:opacity-40"
            >
              Apply Clear priority
            </button>
          </div>
        </div>
      </Modal>
      )}

      {/* NEW MODAL: BULK TO BACKLOG CHECKLIST FOR CURRENT DATE */}
      {showBulkToBacklogModal && (
        <Modal 
        isOpen={showBulkToBacklogModal} 
        onClose={() => setShowBulkToBacklogModal(false)} 
        title="Checklist: Bulk Send to Saved"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-355 leading-relaxed font-sans">
            Moving tasks to saved converts them to saved queue items. They will be removed from your active schedule for <strong>{selectedDate}</strong> and placed in the saved tab. Repeating recurring tasks do not go to the saved queue.
          </p>

          {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay && !t.isRecurring && !t.recurringParentId && (!t.recurrenceFrequency || t.recurrenceFrequency === "none") && (!t.repeatConfig || t.repeatConfig === "none")).length > 0 && (
            <div className="flex bg-slate-900/65 border border-white/5 p-3 rounded-2xl items-center justify-between select-none">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Select all active tasks</span>
              <input 
                type="checkbox" 
                checked={
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay && !t.isRecurring && !t.recurringParentId && (!t.recurrenceFrequency || t.recurrenceFrequency === "none") && (!t.repeatConfig || t.repeatConfig === "none"))
                    .every(t => bulkToBacklogSelection[t.id])
                }
                onChange={(e) => {
                  const val = e.target.checked;
                  const updated: Record<string, boolean> = {};
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay && !t.isRecurring && !t.recurringParentId && (!t.recurrenceFrequency || t.recurrenceFrequency === "none") && (!t.repeatConfig || t.repeatConfig === "none")).forEach(t => {
                    updated[t.id] = val;
                  });
                  setBulkToBacklogSelection(updated);
                  triggerHaptic("light");
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          )}

          <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay && !t.isRecurring && !t.recurringParentId && (!t.recurrenceFrequency || t.recurrenceFrequency === "none") && (!t.repeatConfig || t.repeatConfig === "none")).map(t => (
              <label 
                key={t.id} 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-white/10 rounded-2xl hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-black text-white truncate leading-tight">{t.title}</span>
                  <span className="text-[8.5px] font-mono text-slate-450 uppercase mt-0.5">
                    {t.time ? `Scheduled at ${t.time}` : "Flexible"} • {t.duration} mins
                  </span>
                </div>
                <input 
                  type="checkbox"
                  checked={!!bulkToBacklogSelection[t.id]}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setBulkToBacklogSelection({
                      ...bulkToBacklogSelection,
                      [t.id]: e.target.checked
                    });
                    triggerHaptic("light");
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            ))}

            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay && !t.isRecurring && !t.recurringParentId && (!t.recurrenceFrequency || t.recurrenceFrequency === "none") && (!t.repeatConfig || t.repeatConfig === "none")).length === 0 && (
              <p className="text-center py-8 text-xs text-slate-505 italic">No active/incomplete non-recurring tasks found for this day.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-2">
            <button 
              onClick={() => setShowBulkToBacklogModal(false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-xl font-black uppercase text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const updated = tasksRef.current.map(t => {
                  if (t.date === selectedDate && bulkToBacklogSelection[t.id]) {
                    return { ...t, date: "2000-01-01", isLocked: false, time: "" }; // Move to backlog/saved!
                  }
                  return t;
                });
                saveWorkspace(updated);
                setShowBulkToBacklogModal(false);
                triggerHaptic("success");
              }}
              disabled={tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay && !t.isRecurring && !t.recurringParentId && (!t.recurrenceFrequency || t.recurrenceFrequency === "none") && (!t.repeatConfig || t.repeatConfig === "none")).filter(t => bulkToBacklogSelection[t.id]).length === 0}
              className="flex-[2] py-3 bg-amber-500 hover:bg-amber-450 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all disabled:opacity-40 cursor-pointer"
            >
              Apply Saved Move ({tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay && !t.isRecurring && !t.recurringParentId && (!t.recurrenceFrequency || t.recurrenceFrequency === "none") && (!t.repeatConfig || t.repeatConfig === "none")).filter(t => bulkToBacklogSelection[t.id]).length})
            </button>
          </div>
        </div>
      </Modal>
      )}

      {/* NEW MODAL: BULK TO TOMORROW CHECKLIST FOR CURRENT DATE */}
      {showBulkToTomorrowModal && setShowBulkToTomorrowModal && (
        <Modal 
        isOpen={showBulkToTomorrowModal} 
        onClose={() => setShowBulkToTomorrowModal(false)} 
        title="Checklist: Bulk Send to Tomorrow"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Moving tasks to tomorrow transfers them to <strong>{tomorrowDateStr}</strong> and resets their active in-progress state.
          </p>

          {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length > 0 && (
            <div className="flex bg-slate-900/65 border border-white/5 p-3 rounded-2xl items-center justify-between select-none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select all active tasks</span>
              <input 
                type="checkbox" 
                checked={
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay)
                    .every(t => bulkToTomorrowSelection[t.id])
                }
                onChange={(e) => {
                  const val = e.target.checked;
                  const updated: Record<string, boolean> = {};
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).forEach(t => {
                    updated[t.id] = val;
                  });
                  setBulkToTomorrowSelection(updated);
                  triggerHaptic("light");
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          )}

          <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).map(t => (
              <label 
                key={t.id} 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-white/10 rounded-2xl hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-black text-white truncate leading-tight">{t.title}</span>
                  <span className="text-[8.5px] font-mono text-slate-400 uppercase mt-0.5">
                    {t.time ? `Scheduled at ${t.time}` : "Flexible"} • {t.duration} mins
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={!!bulkToTomorrowSelection[t.id]}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setBulkToTomorrowSelection({
                      ...bulkToTomorrowSelection,
                      [t.id]: e.target.checked
                    });
                    triggerHaptic("light");
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            ))}

            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length === 0 && (
              <p className="text-center py-8 text-xs text-slate-500 italic">No active/incomplete tasks found for this day.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-2">
            <button 
              onClick={() => setShowBulkToTomorrowModal(false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-black uppercase text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const updated = tasksRef.current.map(t => {
                  if (t.date === selectedDate && bulkToTomorrowSelection[t.id]) {
                    return { ...t, date: tomorrowDateStr, isLocked: false, isInProgress: false };
                  }
                  return t;
                });
                saveWorkspace(updated);
                setShowBulkToTomorrowModal(false);
                triggerHaptic("success");
              }}
              disabled={tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).filter(t => bulkToTomorrowSelection[t.id]).length === 0}
              className="flex-[2] py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all disabled:opacity-40 cursor-pointer"
            >
              Apply Tomorrow Move ({tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).filter(t => bulkToTomorrowSelection[t.id]).length})
            </button>
          </div>
        </div>
      </Modal>
      )}

      {/* NEW MODAL: BULK TO DONE CHECKLIST FOR CURRENT DATE */}
      {showBulkToDoneModal && (
        <Modal 
        isOpen={showBulkToDoneModal} 
        onClose={() => setShowBulkToDoneModal(false)} 
        title="Checklist: Bulk Send to Done"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-355 leading-relaxed font-sans">
            Completing tasks marks them as done. They will be checked off in your active schedule and moved to the completed view.
          </p>

          {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length > 0 && (
            <div className="flex bg-slate-900/65 border border-white/5 p-3 rounded-2xl items-center justify-between select-none">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Select all active tasks</span>
              <input 
                type="checkbox" 
                checked={
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay)
                    .every(t => bulkToDoneSelection[t.id])
                }
                onChange={(e) => {
                  const val = e.target.checked;
                  const updated: Record<string, boolean> = {};
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).forEach(t => {
                    updated[t.id] = val;
                  });
                  setBulkToDoneSelection(updated);
                  triggerHaptic("light");
                }}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          )}

          <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).map(t => (
              <label 
                key={t.id} 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-white/10 rounded-2xl hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-black text-white truncate leading-tight">{t.title}</span>
                  <span className="text-[8.5px] font-mono text-slate-455 uppercase mt-0.5">
                    {t.time ? `Scheduled at ${t.time}` : "Flexible"} • {t.duration} mins
                  </span>
                </div>
                <input 
                  type="checkbox"
                  checked={!!bulkToDoneSelection[t.id]}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setBulkToDoneSelection({
                      ...bulkToDoneSelection,
                      [t.id]: e.target.checked
                    });
                    triggerHaptic("light");
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            ))}

            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length === 0 && (
              <p className="text-center py-8 text-xs text-slate-505 italic">No active/incomplete tasks found for this day.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-2">
            <button 
              onClick={() => setShowBulkToDoneModal(false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-xl font-black uppercase text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const updated = tasksRef.current.map(t => {
                  if (t.date === selectedDate && bulkToDoneSelection[t.id]) {
                    const updates: any = { completed: true };
                    updates.time = t.computedTime || t.time;
                    updates.isInProgress = false;
                    return { ...t, ...updates };
                  }
                  return t;
                });
                saveWorkspace(updated);
                setShowBulkToDoneModal(false);
                triggerHaptic("success");
              }}
              disabled={tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).filter(t => bulkToDoneSelection[t.id]).length === 0}
              className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-450 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all disabled:opacity-40 cursor-pointer"
            >
              Apply Completion ({tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).filter(t => bulkToDoneSelection[t.id]).length})
            </button>
          </div>
        </div>
      </Modal>
      )}

      {/* MODAL 5D: BULK PRIORITIZE/RANK TIMELINE */}
      {showBulkPrioritizeModal && (
        <Modal
          isOpen={showBulkPrioritizeModal}
          onClose={() => setShowBulkPrioritizeModal(false)}
          title="Dynamic Bulk Prioritizer (Sort)"
          containerClassName="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl w-[96vw] max-h-[96vh] sm:max-h-[92vh] h-[88vh] flex flex-col"
        >
          <div className="space-y-3.5 text-left flex flex-col h-full overflow-hidden">
            <p className="text-xs text-slate-400 leading-relaxed font-semibold shrink-0">
              Tap active flexible tasks below in the sequence you wish to complete them.
              We will assign sequential queue order (1, 2, 3...) to immediately re-schedule them on your timeline under greedy placement and cascading rules.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-1 flex-1 overflow-y-auto pr-1.5 no-scrollbar">
              {activeSortCandidates.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-slate-950/40 rounded-2xl border border-white/5">
                  <p className="text-xs text-slate-400 font-bold">No active flexible tasks found on this date.</p>
                  <p className="text-[11px] text-slate-500 mt-1.5">Completed or locked tasks are excluded. Unlock tasks or add flexible items first!</p>
                </div>
              ) : (
                activeSortCandidates
                  .slice()
                  .sort((a, b) => {
                    const rA = bulkRankedTaskIds.indexOf(a.id);
                    const rB = bulkRankedTaskIds.indexOf(b.id);
                    if (rA !== -1 && rB !== -1) return rA - rB;
                    if (rA !== -1) return -1;
                    if (rB !== -1) return 1;
                    return a.title.localeCompare(b.title);
                  })
                  .map((t) => {
                    const rankIndex = bulkRankedTaskIds.indexOf(t.id);
                    const isRanked = rankIndex !== -1;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToggleBulkRank(t.id)}
                        className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isRanked 
                            ? "bg-indigo-600/15 border-indigo-500/40 text-white shadow-md shadow-indigo-600/10" 
                            : "bg-slate-950/50 border-white/5 text-slate-300 hover:bg-slate-900/80 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="min-w-0">
                            <p className="text-xs font-black tracking-wide leading-tight truncate text-slate-100">{t.title}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              <span className="text-slate-400">{t.duration || "30 min"}</span>
                              {t.groupName && (
                                <>
                                  <span className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
                                  <span className="text-indigo-300 max-w-[130px] truncate">{t.groupName}</span>
                                </>
                              )}
                              {t.category && (
                                <>
                                  <span className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
                                  <span className="text-slate-400 max-w-[110px] truncate">{t.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isRanked ? (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md border border-indigo-400/30">
                              {rankIndex + 1}
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-900/60 flex items-center justify-center font-black text-[11px] text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors">
                              ○
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950/50 border border-white/5 p-3 rounded-xl">
              <span>Active Tasks Ranked</span>
              <span className="text-indigo-400 font-black">
                {bulkRankedTaskIds.filter(id => activeSortCandidates.some(c => c.id === id)).length} / {activeSortCandidates.length}
              </span>
            </div>

            <div className="flex gap-2.5 pt-1 pb-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBulkRankedTaskIds([]);
                  triggerHaptic("light");
                }}
                disabled={bulkRankedTaskIds.length === 0}
                className="flex-1 py-3 border border-white/10 hover:bg-white/5 bg-slate-950/40 text-slate-300 hover:text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all disabled:opacity-30 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyBulkRanks}
                disabled={activeSortCandidates.length === 0}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-40 cursor-pointer"
              >
                Apply Sequence & Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}


    </>
  );
};

export default BulkTaskActionModals;
