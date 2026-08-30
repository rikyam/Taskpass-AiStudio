import React from "react";
import { AlertCircle } from "lucide-react";
import { Task } from "../../types";
import { Modal } from "../InteractiveAppHelpers";
import { formatTime } from "../../utils/timeHelpers";

export interface ConflictData {
  task: Task;
  newTime: string;
  conflictTask: Task;
}

interface ConflictResolutionModalProps {
  conflictData: ConflictData | null;
  tasks: Task[];
  findAlternativeTimes: (task: Task, allTasks: Task[]) => string[];
  resolveConflict: (resolution: "reschedule_moving" | "move_conflict" | "overlay", targetTime?: string) => void;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflictData,
  tasks,
  findAlternativeTimes,
  resolveConflict,
  onClose,
}) => {
  if (!conflictData) return null;

  const movingSugs = findAlternativeTimes(conflictData.task, tasks);
  const conflictSugs = findAlternativeTimes(conflictData.conflictTask, tasks);

  return (
    <Modal isOpen={true} onClose={onClose} title="Planner Conflict Overlay">
      <div className="space-y-5 text-center mt-4">
        <div className="flex justify-center">
          <AlertCircle size={32} className="text-amber-500 animate-pulse" />
        </div>

        <div className="text-xs text-slate-300 px-2 leading-relaxed text-left">
          Conflict detected: Placing <strong className="text-white">"{conflictData.task.title}"</strong>{" "}
          {conflictData.newTime ? `at ${formatTime(conflictData.newTime)}` : ""}{" "}
          overlaps with another locked task{" "}
          <strong className="text-rose-455">"{conflictData.conflictTask?.title || "Another Locked Task"}"</strong>.
        </div>

        <div className="space-y-4 text-left border-t border-b border-white/5 py-4 my-2 max-h-[420px] overflow-y-auto pr-1">
          {/* CHOICE 1: Reschedule the moving task */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-emerald-400 block tracking-wider">
              Option 1: Reschedule Moving Task ("{conflictData.task.title}")
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {movingSugs && movingSugs.length > 0 ? (
                movingSugs.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => resolveConflict("reschedule_moving", opt)}
                    className="w-full text-left p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-between border border-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>
                      Move "{conflictData.task.title}" to {formatTime(opt)}
                    </span>
                    <span className="text-[7.5px] bg-slate-900 border border-white/10 px-2 py-1 rounded uppercase tracking-widest text-emerald-410">
                      Verified Safe
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-[10px] text-slate-500 italic pl-1">
                  No safe alternative times found for the moving task.
                </p>
              )}
            </div>
          </div>

          {/* CHOICE 2: Move the existing locked task */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[10px] font-black uppercase text-indigo-400 block tracking-wider">
              Option 2: Move Conflicting Locked Task ("{conflictData.conflictTask?.title}")
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {conflictSugs && conflictSugs.length > 0 ? (
                conflictSugs.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => resolveConflict("move_conflict", opt)}
                    className="w-full text-left p-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-xs rounded-xl flex items-center justify-between border border-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>
                      Move "{conflictData.conflictTask?.title}" to {formatTime(opt)} (Moving task stays at {formatTime(conflictData.newTime)})
                    </span>
                    <span className="text-[7.5px] bg-slate-900 border border-white/10 px-2 py-1 rounded uppercase tracking-widest text-[#94a3b8]">
                      Verified Safe
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-[10px] text-slate-500 italic pl-1">
                  No safe alternative times found for the conflicting task.
                </p>
              )}
            </div>
          </div>

          {/* CHOICE 3: Overlay the two tasks */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[10px] font-black uppercase text-rose-400 block tracking-wider">
              Option 3: Overlay Both Tasks (Coexist in Same Slot)
            </span>
            <button
              onClick={() => resolveConflict("overlay")}
              className="w-full text-left p-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 font-bold text-xs rounded-xl flex items-center justify-between border border-rose-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>
                Allow overlay: Keep both scheduled at {formatTime(conflictData.newTime)}
              </span>
              <span className="text-[7.5px] bg-slate-900 border border-white/10 px-2 py-1 rounded uppercase tracking-widest text-rose-410">
                Overlap Allowed
              </span>
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-755 transition-colors cursor-pointer"
          >
            Cancel Action
          </button>
        </div>
      </div>
    </Modal>
  );
};
