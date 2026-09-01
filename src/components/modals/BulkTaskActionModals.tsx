import React, { useState } from "react";
import { Task } from "../../types";
import { Modal } from "../InteractiveAppHelpers";

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
  const [bulkToDoneSelection, setBulkToDoneSelection] = useState<Record<string, boolean>>({});

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
            Moving tasks to saved converts them to saved queue items. They will be removed from your active schedule for <strong>{selectedDate}</strong> and placed in the saved tab.
          </p>

          {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length > 0 && (
            <div className="flex bg-slate-900/65 border border-white/5 p-3 rounded-2xl items-center justify-between select-none">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Select all active tasks</span>
              <input 
                type="checkbox" 
                checked={
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay)
                    .every(t => bulkToBacklogSelection[t.id])
                }
                onChange={(e) => {
                  const val = e.target.checked;
                  const updated: Record<string, boolean> = {};
                  tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).forEach(t => {
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
            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).map(t => (
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

            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length === 0 && (
              <p className="text-center py-8 text-xs text-slate-505 italic">No active/incomplete tasks found for this day.</p>
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
              disabled={tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).filter(t => bulkToBacklogSelection[t.id]).length === 0}
              className="flex-[2] py-3 bg-amber-500 hover:bg-amber-450 text-white rounded-xl font-black uppercase text-xs shadow-lg transition-all disabled:opacity-40 cursor-pointer"
            >
              Apply Saved Move ({tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).filter(t => bulkToBacklogSelection[t.id]).length})
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
        title="Dynamic Bulk Prioritizer"
      >
        <div className="space-y-4 text-left">
          <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
            Tap the flexible tasks below in the sequence you wish to complete them.
            We will assign sequential queue order (1, 2, 3...) to immediately re-schedule them on your timeline under greedy placement and cascading rules.
          </p>

          <div className="space-y-2 mt-3 max-h-[290px] overflow-y-auto pr-1 no-scrollbar">
            {tasks.filter(t => t.date === selectedDate && !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed).length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-white/5">
                <p className="text-xs text-slate-450 font-bold">No flexible uncompleted tasks found on this date.</p>
                <p className="text-[10px] text-slate-500 mt-1">Unlock tasks or add flexible items first!</p>
              </div>
            ) : (
              tasks
                .filter(t => t.date === selectedDate && !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed)
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
                          ? "bg-indigo-600/10 border-indigo-500/30 text-white shadow-md shadow-indigo-600/5" 
                          : "bg-slate-900/40 border-white/5 text-slate-350 hover:bg-slate-905"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-black tracking-wide leading-tight truncate">{t.title}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>{t.duration || "30 min"}</span>
                            {t.groupName && (
                              <>
                                <span className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                                <span className="text-indigo-400 max-w-[110px] truncate">{t.groupName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isRanked ? (
                          <div className="w-5.5 h-5.5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10.5px] shadow-sm border border-indigo-400/20">
                            {rankIndex + 1}
                          </div>
                        ) : (
                          <div className="w-5.5 h-5.5 rounded-full border border-slate-750 bg-slate-900/50 flex items-center justify-center font-black text-[10px] text-slate-500">
                            ○
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          <div className="flex items-center justify-between text-[8px] sm:text-[9.5px] text-slate-450 font-bold uppercase tracking-wider bg-slate-950/40 border border-white/5 p-3 rounded-xl">
            <span>Currently Ranked</span>
            <span className="text-indigo-400 font-black">
              {bulkRankedTaskIds.length} / {tasks.filter(t => t.date === selectedDate && !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed).length}
            </span>
          </div>

          <div className="flex gap-2 pt-1 pb-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBulkRankedTaskIds([]);
                triggerHaptic("light");
              }}
              disabled={bulkRankedTaskIds.length === 0}
              className="flex-1 py-2.5 border border-white/5 hover:bg-white/5 bg-slate-950/40 text-slate-400 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-30 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApplyBulkRanks}
              disabled={tasks.filter(t => t.date === selectedDate && !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed).length === 0}
              className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-md shadow-indigo-650/10 transition-all disabled:opacity-40 cursor-pointer"
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
