import React, { useState } from "react";
import { Task, Routine } from "../../types";
import { Modal } from "../InteractiveAppHelpers";
import { timeToMinutes, minutesToTimeString, parseDurationToMinutes } from "../InteractiveAppHelpers";
import { Save } from "lucide-react";

export interface AdHocSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  selectedDate: string;
  defaultDuration?: number;
  saveWorkspace: (tasks: Task[]) => void;
  triggerHaptic: (type: string) => void;
  showDragToast?: (msg: string, type?: "success" | "warning" | "info") => void;
  routines?: any[];
  saveRoutinesWorkspace?: (routines: any[]) => void;
}

export const AdHocSequenceModal: React.FC<AdHocSequenceModalProps> = ({
  isOpen,
  onClose,
  tasks,
  selectedDate,
  defaultDuration = 30,
  saveWorkspace,
  triggerHaptic,
  showDragToast = () => {},
  routines = [],
  saveRoutinesWorkspace = () => {}
}) => {
  const [adHocSelectedTaskIds, setAdHocSelectedTaskIds] = useState<string[]>([]);
  const [adHocStartTime, setAdHocStartTime] = useState("");
  const [adHocLockedAll, setAdHocLockedAll] = useState(true);
  const [adHocSequenceTitle, setAdHocSequenceTitle] = useState("Ad Hoc Sequence");

  const handleToggleAdHocSelected = (taskId: string) => {
    setAdHocSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    triggerHaptic("light");
  };

  if (!isOpen) return null;

  const handleDeployAdHoc = (immediate: boolean) => {
    if (adHocSelectedTaskIds.length === 0) return;
    let timePointer = 0;
    if (immediate) {
      const d = new Date();
      timePointer = d.getHours() * 60 + d.getMinutes();
    } else {
      timePointer = timeToMinutes(adHocStartTime || "08:00");
    }
    const grpId = `sequence_adhoc_${Date.now()}`;
    const updatedTasks = tasks.map(t => {
      const rankIdx = adHocSelectedTaskIds.indexOf(t.id);
      if (rankIdx !== -1) {
        const dur = parseDurationToMinutes(t.duration) || defaultDuration;
        const taskMinutes = timePointer;
        timePointer += dur;
        const isFirst = rankIdx === 0;
        return {
          ...t,
          time: minutesToTimeString(taskMinutes),
          computedTime: minutesToTimeString(taskMinutes),
          isLocked: isFirst ? true : adHocLockedAll,
          sequenceLocked: isFirst ? true : adHocLockedAll,
          groupId: grpId,
          groupName: adHocSequenceTitle || "Ad Hoc Sequence",
          order: rankIdx + 1,
          completed: false,
          isInProgress: isFirst && immediate,
          focusStartedAt: isFirst && immediate ? Date.now() : undefined,
          originalTime: isFirst && immediate ? minutesToTimeString(taskMinutes) : undefined,
          originalIsLocked: isFirst && immediate ? true : undefined,
          originalDuration: isFirst && immediate ? (t.duration || `${defaultDuration} min`) : undefined
        };
      }
      return t;
    });
    saveWorkspace(updatedTasks);
    onClose();
    setAdHocSelectedTaskIds([]);
    triggerHaptic("success");
  };

  return (
<Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Ad Hoc Sequence Builder"
      >
        <div className="space-y-4 text-left">
          <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
            Select the active tasks below in the specific order you wish to complete them. 
            We will calculate start times sequentially, chain them together into an ad-hoc sequence group, and deploy them on your timeline.
          </p>

          {/* Task list selection */}
          <div className="space-y-2 mt-3 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
            {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length === 0 ? (
              <div className="p-8 text-center bg-slate-900/10 rounded-2xl border border-white/5">
                <p className="text-xs text-slate-405 font-bold">No uncompleted timeline tasks found on this date.</p>
                <p className="text-[10px] text-slate-500 mt-1">Add some active tasks first!</p>
              </div>
            ) : (
              tasks
                .filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay)
                .sort((a, b) => {
                  const rA = adHocSelectedTaskIds.indexOf(a.id);
                  const rB = adHocSelectedTaskIds.indexOf(b.id);
                  if (rA !== -1 && rB !== -1) return rA - rB;
                  if (rA !== -1) return -1;
                  if (rB !== -1) return 1;
                  return (a.time || "00:00").localeCompare(b.time || "00:00");
                })
                .map((t) => {
                  const rankIndex = adHocSelectedTaskIds.indexOf(t.id);
                  const isRanked = rankIndex !== -1;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleAdHocSelected(t.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isRanked 
                          ? "bg-pink-600/10 border-pink-500/30 text-white shadow-md shadow-pink-600/5" 
                          : "bg-slate-900/40 border-white/5 text-slate-350 hover:bg-slate-905"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox indicator */}
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                          isRanked 
                            ? "border-pink-500 bg-pink-500 text-white" 
                            : "border-slate-700 bg-slate-950/20 text-transparent"
                        }`}>
                          {isRanked && "✓"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black tracking-wide leading-tight truncate">{t.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>{t.time ? `At ${t.time}` : "Unscheduled"}</span>
                            <span className="w-1 h-1 bg-slate-800 rounded-full" />
                            <span>{t.duration || `${defaultDuration} min`}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isRanked ? (
                          <div className="w-5.5 h-5.5 rounded-full bg-pink-600 text-white flex items-center justify-center font-black text-[10.5px] shadow-sm border border-pink-400/20">
                            {rankIndex + 1}
                          </div>
                        ) : (
                          <div className="w-5.5 h-5.5 rounded-full border border-slate-755 bg-slate-900/50 flex items-center justify-center font-black text-[10px] text-slate-500">
                            ○
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          {/* Currently selected count feedback */}
          <div className="flex items-center justify-between text-[9.5px] text-slate-450 font-bold uppercase tracking-wider bg-slate-950/40 border border-white/5 p-2 rounded-xl">
            <span>Selected for Sequence</span>
            <span className="text-pink-400 font-black">
              {adHocSelectedTaskIds.length} / {tasks.filter(t => t.date === selectedDate && !t.completed && !t.isTransferred && !t.isAllDay).length}
            </span>
          </div>

          {/* Options: Title, Start Hour & Locks */}
          <div className="p-3 bg-slate-950/30 rounded-2xl border border-white/5 space-y-3.5">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Sequence Title / Group Name</span>
              <input 
                type="text" 
                value={adHocSequenceTitle}
                onChange={(e) => setAdHocSequenceTitle(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500/50 transition-colors"
                placeholder="e.g. Morning Focus Sequence"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center pt-1 border-t border-white/5">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Deploy Start Time</span>
                <input 
                  type="time" 
                  value={adHocStartTime}
                  onChange={(e) => setAdHocStartTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500/50 transition-colors"
                />
              </div>

              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Sequence Protection</span>
                <label className="relative mt-2.5 flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={adHocLockedAll}
                    onChange={(e) => setAdHocLockedAll(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-705 bg-slate-950 text-pink-500 focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-300 font-bold">Lock sequence steps</span>
                </label>
              </div>
            </div>
          </div>

          {/* Stored Conversion Block */}
          <button
            type="button"
            onClick={() => {
              const selectedTasks = adHocSelectedTaskIds
                .map(id => tasks.find(t => t.id === id))
                .filter(Boolean) as Task[];
              if (selectedTasks.length === 0) return;
              
              const newRoutine: Routine = {
                id: `routine_${Date.now()}`,
                name: adHocSequenceTitle || "Saved Sequence Template",
                tasks: selectedTasks.map(t => ({
                  title: t.title,
                  duration: t.duration || `${defaultDuration} min`,
                  travelBefore: t.travelBefore || 0,
                  travelAfter: t.travelAfter || 0,
                  location: t.location || "",
                  attendees: t.attendees || t.collaborator || ""
                }))
              };
              saveRoutinesWorkspace([...routines, newRoutine]);
              showDragToast(`Successfully converted and saved "${newRoutine.name}" to your sequences!`, "success");
              triggerHaptic("heavy");
              onClose();
            }}
            disabled={adHocSelectedTaskIds.length === 0}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-555 hover:to-teal-555 text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/10"
          >
            <Save size={12} />
            Convert to Saved Sequence
          </button>

          {/* Action triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-semibold">
            <button
              type="button"
              onClick={() => {
                setAdHocSelectedTaskIds([]);
                triggerHaptic("light");
              }}
              disabled={adHocSelectedTaskIds.length === 0}
              className="py-2.5 bg-slate-900 border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-30 cursor-pointer"
            >
              Reset Selected
            </button>
            <button
              type="button"
              onClick={() => handleDeployAdHoc(true)}
              disabled={adHocSelectedTaskIds.length === 0}
              className="py-2.5 bg-pink-700 hover:bg-pink-600 text-white rounded-xl font-black uppercase text-[9px] tracking-wider shadow-md shadow-pink-650/10 transition-all disabled:opacity-40 cursor-pointer"
            >
              Deploy NOW
            </button>
            <button
              type="button"
              onClick={() => handleDeployAdHoc(false)}
              disabled={adHocSelectedTaskIds.length === 0}
              className="py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl font-black uppercase text-[9px] tracking-wider shadow-md shadow-indigo-650/10 transition-all disabled:opacity-40 cursor-pointer"
            >
              Deploy to Hour
            </button>
          </div>
        </div>
      </Modal>
  );
};

export default AdHocSequenceModal;
