import React, { memo, useState } from 'react';
import { Plus, Sparkles, EyeOff, Eye, Loader2 } from 'lucide-react';
import { parseDurationToMinutes } from '../utils/timeHelpers';
import { TimePickBoxTrigger } from './TimePickBox';
import { cleanDisplayText, cleanCollaboratorText, cleanLocationText } from './InteractiveAppHelpers';

interface InteractiveTaskNarrativeBannerProps {
  currentFocusTarget?: any;
  favoriteLocations: string[];
  collaborators: string[];
  saveWorkspace?: (tasks: any[]) => void;
  instantiateVirtualIfNeeded?: (id: string) => { updatedTasks: any[]; realTaskId: string };
  triggerEditForm?: (task: any, field?: string) => void;
  triggerHaptic: (type: string) => void;
  loadingNoteModeTaskId?: string | null;
  currentFocusId?: string;

  // Direct form state props for Task Edit Modal
  taskTitle?: string;
  setTaskTitle?: (val: string) => void;
  taskDate?: string;
  setTaskDate?: (val: string) => void;
  taskTime?: string;
  setTaskTime?: (val: string) => void;
  taskDuration?: string;
  setTaskDuration?: (val: string) => void;
  taskLocation?: string;
  setTaskLocation?: (val: string) => void;
  taskCollaborator?: string;
  setTaskCollaborator?: (val: string) => void;
  setTaskAttendees?: (val: string) => void;
  taskPriority?: string;
  setTaskPriority?: (val: any) => void;
  taskTravelBefore?: number;
  setTaskTravelBefore?: (val: number) => void;
  taskTravelAfter?: number;
  setTaskTravelAfter?: (val: number) => void;
  modeSelector?: React.ReactNode;
}

const InteractiveTaskNarrativeBanner = memo(({
  currentFocusTarget,
  favoriteLocations,
  collaborators,
  saveWorkspace,
  instantiateVirtualIfNeeded,
  triggerEditForm,
  triggerHaptic,
  loadingNoteModeTaskId,
  currentFocusId,
  taskTitle,
  setTaskTitle,
  taskTime,
  setTaskTime,
  taskDuration,
  setTaskDuration,
  taskLocation,
  setTaskLocation,
  taskCollaborator,
  setTaskCollaborator,
  setTaskAttendees,
  taskPriority,
  setTaskPriority,
  taskTravelBefore,
  setTaskTravelBefore,
  taskTravelAfter,
  setTaskTravelAfter,
  modeSelector
}: InteractiveTaskNarrativeBannerProps) => {
  const [showAddPills, setShowAddPills] = useState(true);

  if (!currentFocusTarget && taskTitle === undefined) return null;

  const updateFields = (fields: Record<string, any>) => {
    if (currentFocusTarget && instantiateVirtualIfNeeded && saveWorkspace) {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(currentFocusTarget.id);
      const updated = updatedTasks.map(t => {
        if (t.id === realTaskId) {
          return {
            ...t,
            ...fields,
            lastModified: Date.now()
          };
        }
        return t;
      });
      saveWorkspace(updated);
    } else {
      if (fields.title !== undefined && setTaskTitle) setTaskTitle(fields.title);
      if (fields.time !== undefined && setTaskTime) setTaskTime(fields.time);
      if (fields.duration !== undefined && setTaskDuration) setTaskDuration(fields.duration);
      if (fields.location !== undefined && setTaskLocation) setTaskLocation(fields.location);
      if (fields.collaborator !== undefined) {
        if (setTaskCollaborator) setTaskCollaborator(fields.collaborator);
        if (setTaskAttendees) setTaskAttendees(fields.collaborator);
      }
      if (fields.priority !== undefined && setTaskPriority) setTaskPriority(fields.priority);
      if (fields.travelBefore !== undefined && setTaskTravelBefore) setTaskTravelBefore(fields.travelBefore);
      if (fields.travelAfter !== undefined && setTaskTravelAfter) setTaskTravelAfter(fields.travelAfter);
    }
  };

  const rawTitle = currentFocusTarget ? (currentFocusTarget.title || "Untitled Task") : (taskTitle || "Untitled Task");
  const title = cleanDisplayText(rawTitle) || "Untitled Task";
  const startTime = currentFocusTarget ? (currentFocusTarget.computedTime || currentFocusTarget.time || "09:00") : (taskTime || "09:00");
  const duration = currentFocusTarget ? (currentFocusTarget.duration || "30 min") : (taskDuration || "30 min");

  // Calculate end time
  const [hStr, mStr] = startTime.split(":");
  const startMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);
  const durMins = parseDurationToMinutes(duration) || 30;
  const endMins = (startMins + durMins) % 1440;

  const formatMins12 = (totalMins: number) => {
    const h24 = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const ampm = h24 >= 12 ? "pm" : "am";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const mPadded = String(m).padStart(2, "0");
    return `${h12}:${mPadded}${ampm}`;
  };

  const startTimeStr = formatMins12(startMins);
  const endTimeStr = formatMins12(endMins);

  const locationRaw = currentFocusTarget ? (currentFocusTarget.location || "") : (taskLocation || "");
  const location = cleanLocationText(locationRaw);

  const collabRaw = currentFocusTarget ? (currentFocusTarget.attendees || currentFocusTarget.collaborator || "") : (taskCollaborator || "");
  const collaborator = cleanCollaboratorText(collabRaw);

  const tBefore = currentFocusTarget ? (currentFocusTarget.travelBefore || 0) : (taskTravelBefore || 0);
  const tAfter = currentFocusTarget ? (currentFocusTarget.travelAfter || 0) : (taskTravelAfter || 0);
  const hasTransit = tBefore > 0 || tAfter > 0;

  const priorityRaw = currentFocusTarget ? (currentFocusTarget.priority || "none") : (taskPriority || "none");
  const priority = (priorityRaw || "none").toLowerCase();
  const hasPriority = priority && priority !== "none";

  const hasMissingChoices = !location || !collaborator || !hasTransit || !hasPriority;

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900/95 to-purple-950/90 border border-indigo-500/40 shadow-xl flex flex-col gap-2.5 w-full text-left select-text relative mb-2">
      <div className="flex items-start gap-2 w-full">
        <Sparkles size={14} className="text-emerald-400 shrink-0 animate-pulse mt-0.5" />
        <div 
          className="font-medium text-slate-100 italic leading-relaxed w-full flex flex-wrap items-baseline gap-x-1 gap-y-1 break-words whitespace-normal text-[9pt]"
        >
          <span>"From</span>

          {/* TIME HYPERLINK */}
          <span className="relative inline-flex items-center group">
            <TimePickBoxTrigger
              value={startTime}
              onChange={(newTime) => {
                updateFields({ time: newTime, computedTime: newTime });
                triggerHaptic("medium");
              }}
              isDark={true}
              className="bg-transparent border-b border-dashed border-emerald-400/50 hover:border-emerald-300 p-0 text-emerald-400 italic font-semibold hover:text-emerald-200 cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-emerald-950/50"
              title="Pick start time (3 pick boxes: Hours 0-12, Minutes 0-60 in 5m, AM/PM)"
            >
              <span className="italic font-semibold text-emerald-400 hover:text-emerald-200 cursor-pointer transition-colors">
                {startTimeStr} to {endTimeStr}
              </span>
            </TimePickBoxTrigger>
          </span>

          <span>you will</span>

          {/* TITLE / ACTION HYPERLINK */}
          <span
            onClick={() => {
              if (triggerEditForm && currentFocusTarget) {
                triggerEditForm(currentFocusTarget, "title");
              } else {
                const newTitle = prompt("Edit Task Title:", title);
                if (newTitle && newTitle.trim()) {
                  updateFields({ title: newTitle.trim() });
                }
              }
            }}
            className="italic font-bold text-emerald-400 hover:text-emerald-200 cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-emerald-950/50"
            title="Click to edit task title"
          >
            {cleanDisplayText(title)}
          </span>

          {/* LOCATION HYPERLINK (ONLY IF SET) */}
          {location ? (
            <span className="relative inline-flex items-center group">
              <span className="italic font-semibold text-emerald-400 hover:text-emerald-200 cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-emerald-950/50">
                at {location}
              </span>
              <select
                value={location}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__REMOVE__") {
                    updateFields({ location: "" });
                  } else if (val === "__NEW_LOC__") {
                    const custom = prompt("Enter custom location:");
                    if (custom && custom.trim()) {
                      updateFields({ location: custom.trim() });
                    }
                  } else {
                    updateFields({ location: val });
                  }
                  triggerHaptic("medium");
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Click to edit location (or select Delete)"
              >
                <option value="__REMOVE__" className="bg-slate-900 text-red-400 font-bold">Delete location</option>
                {favoriteLocations.map((loc) => (
                  <option key={loc} value={loc} className="bg-slate-900 text-slate-100">{loc}</option>
                ))}
                <option value="__NEW_LOC__" className="bg-slate-900 text-amber-300 font-bold">+ Custom Location...</option>
              </select>
            </span>
          ) : null}

          {/* COLLABORATOR HYPERLINK (ONLY IF SET) */}
          {collaborator ? (
            <span className="relative inline-flex items-center group">
              <span className="italic font-semibold text-emerald-400 hover:text-emerald-200 cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-emerald-950/50">
                with {collaborator}
              </span>
              <select
                value={collaborator}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__REMOVE__") {
                    updateFields({ collaborator: "", attendees: "" });
                  } else if (val === "__NEW_COLLAB__") {
                    const custom = prompt("Enter collaborator name:");
                    if (custom && custom.trim()) {
                      updateFields({ collaborator: custom.trim(), attendees: custom.trim() });
                    }
                  } else {
                    updateFields({ collaborator: val, attendees: val });
                  }
                  triggerHaptic("medium");
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Click to edit collaborator (or select Delete)"
              >
                <option value="__REMOVE__" className="bg-slate-900 text-red-400 font-bold">Delete collaborator</option>
                {collaborators.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-slate-100">{c}</option>
                ))}
                <option value="__NEW_COLLAB__" className="bg-slate-900 text-purple-300 font-bold">+ Custom Collaborator...</option>
              </select>
            </span>
          ) : null}

          {/* PRIORITY HYPERLINK (ONLY IF SET) */}
          {hasPriority ? (
            <span className="relative inline-flex items-center group">
              <span className="italic font-semibold text-emerald-400 hover:text-emerald-200 cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-emerald-950/50 capitalize">
                ({priority} priority)
              </span>
              <select
                value={priority}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__REMOVE__") {
                    updateFields({ priority: "none" });
                  } else {
                    updateFields({ priority: val });
                  }
                  triggerHaptic("medium");
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Click to edit priority (or select Delete)"
              >
                <option value="__REMOVE__" className="bg-slate-900 text-red-400 font-bold">Delete priority</option>
                <option value="low" className="bg-slate-900 text-slate-100">Low Priority</option>
                <option value="medium" className="bg-slate-900 text-slate-100">Medium Priority</option>
                <option value="high" className="bg-slate-900 text-slate-100">High Priority</option>
                <option value="urgent" className="bg-slate-900 text-slate-100">Urgent Priority</option>
              </select>
            </span>
          ) : null}

          {/* TRANSIT/FLEX TIME HYPERLINK (ONLY IF SET) */}
          {hasTransit ? (
            <>
              <span>and have</span>
              <span className="relative inline-flex items-center group">
                <span className="italic font-semibold text-emerald-400 hover:text-emerald-200 cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-emerald-950/50">
                  {tBefore > 0 && tAfter > 0
                    ? tBefore === tAfter
                      ? `${tBefore} minutes of transit time before and after`
                      : `${tBefore} minutes of transit time before and ${tAfter} minutes after`
                    : tBefore > 0
                    ? `${tBefore} minutes of transit time before`
                    : `${tAfter} minutes of transit time after`}
                </span>
                <select
                  value={`${tBefore}_${tAfter}`}
                  onChange={(e) => {
                    if (e.target.value === "0_0") {
                      updateFields({ travelBefore: 0, travelAfter: 0 });
                    } else {
                      const [b, a] = e.target.value.split("_").map(v => parseInt(v, 10));
                      updateFields({ travelBefore: b, travelAfter: a });
                    }
                    triggerHaptic("medium");
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Click to edit transit time (or select Delete)"
                >
                  <option value="0_0" className="bg-slate-900 text-red-400 font-bold">Delete transit time</option>
                  <option value="15_15" className="bg-slate-900 text-slate-100">15 min transit before & after</option>
                  <option value="30_30" className="bg-slate-900 text-slate-100">30 min transit before & after</option>
                  <option value="45_45" className="bg-slate-900 text-slate-100">45 min transit before & after</option>
                  <option value="60_60" className="bg-slate-900 text-slate-100">60 min transit before & after</option>
                  <option value="15_0" className="bg-slate-900 text-slate-100">15 min transit before only</option>
                  <option value="30_0" className="bg-slate-900 text-slate-100">30 min transit before only</option>
                  <option value="0_15" className="bg-slate-900 text-slate-100">15 min transit after only</option>
                  <option value="0_30" className="bg-slate-900 text-slate-100">30 min transit after only</option>
                </select>
              </span>
            </>
          ) : null}

          <span>."</span>
        </div>
      </div>

      {/* CHOICES ROW BELOW THE NARRATIVE FOR UNUSED ATTRIBUTES */}
      {hasMissingChoices && (
        <div className="mt-1.5 pt-2 border-t border-indigo-500/20 flex flex-col gap-1.5 text-xs not-italic">
          <div className="flex items-center justify-between w-full">
            <span className="text-[9.5px] font-bold text-indigo-300/80 uppercase tracking-wider select-none">
              Add to narrative:
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAddPills(prev => !prev);
                triggerHaptic("light");
              }}
              className="px-1.5 py-0.5 text-[8.5px] font-bold text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-500/30 rounded-md transition-all flex items-center gap-1 cursor-pointer select-none"
              title={showAddPills ? "Turn off narrative pill buttons" : "Turn on narrative pill buttons"}
            >
              {showAddPills ? <EyeOff size={9.5} /> : <Eye size={9.5} />}
              <span>{showAddPills ? "Hide Pills" : "Show Pills"}</span>
            </button>
          </div>

          {showAddPills && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {/* LOCATION CHIP */}
              {!location && (
                <span className="relative inline-flex items-center">
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus size={9.5} className="text-amber-400" />
                    <span>Location</span>
                  </button>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__NEW_LOC__") {
                        const custom = prompt("Enter custom location:");
                        if (custom && custom.trim()) {
                          updateFields({ location: custom.trim() });
                        }
                      } else if (val) {
                        updateFields({ location: val });
                      }
                      triggerHaptic("medium");
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Select location to add to narrative"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">Select Location...</option>
                    {favoriteLocations.map((loc) => (
                      <option key={loc} value={loc} className="bg-slate-900 text-slate-100">{loc}</option>
                    ))}
                    <option value="__NEW_LOC__" className="bg-slate-900 text-amber-300 font-bold">+ Custom Location...</option>
                  </select>
                </span>
              )}

              {/* COLLABORATOR CHIP */}
              {!collaborator && (
                <span className="relative inline-flex items-center">
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus size={9.5} className="text-purple-400" />
                    <span>Collaborator</span>
                  </button>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__NEW_COLLAB__") {
                        const custom = prompt("Enter collaborator name:");
                        if (custom && custom.trim()) {
                          updateFields({ collaborator: custom.trim(), attendees: custom.trim() });
                        }
                      } else if (val) {
                        updateFields({ collaborator: val, attendees: val });
                      }
                      triggerHaptic("medium");
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Select collaborator to add to narrative"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">Select Collaborator...</option>
                    {collaborators.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-slate-100">{c}</option>
                    ))}
                    <option value="__NEW_COLLAB__" className="bg-slate-900 text-purple-300 font-bold">+ Custom Collaborator...</option>
                  </select>
                </span>
              )}

              {/* TRANSIT TIME CHIP */}
              {!hasTransit && (
                <span className="relative inline-flex items-center">
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-500/40 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus size={9.5} className="text-sky-400" />
                    <span>Transit Time</span>
                  </button>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const [b, a] = val.split("_").map(v => parseInt(v, 10));
                        updateFields({ travelBefore: b, travelAfter: a });
                      }
                      triggerHaptic("medium");
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Select transit time to add to narrative"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">Select Transit Time...</option>
                    <option value="15_15" className="bg-slate-900 text-slate-100">15 min before & after</option>
                    <option value="30_30" className="bg-slate-900 text-slate-100">30 min before & after</option>
                    <option value="45_45" className="bg-slate-900 text-slate-100">45 min before & after</option>
                    <option value="60_60" className="bg-slate-900 text-slate-100">60 min before & after</option>
                    <option value="15_0" className="bg-slate-900 text-slate-100">15 min before only</option>
                    <option value="30_0" className="bg-slate-900 text-slate-100">30 min before only</option>
                    <option value="0_15" className="bg-slate-900 text-slate-100">15 min after only</option>
                    <option value="0_30" className="bg-slate-900 text-slate-100">30 min after only</option>
                  </select>
                </span>
              )}

              {/* PRIORITY CHIP */}
              {!hasPriority && (
                <span className="relative inline-flex items-center">
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus size={9.5} className="text-rose-400" />
                    <span>Priority</span>
                  </button>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        updateFields({ priority: val });
                      }
                      triggerHaptic("medium");
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Select priority to add to narrative"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">Select Priority...</option>
                    <option value="low" className="bg-slate-900 text-slate-100">Low Priority</option>
                    <option value="medium" className="bg-slate-900 text-slate-100">Medium Priority</option>
                    <option value="high" className="bg-slate-900 text-slate-100">High Priority</option>
                    <option value="urgent" className="bg-slate-900 text-slate-100">Urgent Priority</option>
                  </select>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {loadingNoteModeTaskId === currentFocusId && (
        <div className="absolute top-2 right-3 flex items-center gap-1.5 text-[10px] font-bold text-indigo-400">
          <Loader2 className="w-3 h-3 animate-spin text-indigo-400 shadow-glow" />
          <span className="animate-pulse">Updating...</span>
        </div>
      )}
    </div>
  );
});

// ============================================
// MAIN COMPONENT EXPORTER
// ============================================


InteractiveTaskNarrativeBanner.displayName = 'InteractiveTaskNarrativeBanner';

export { InteractiveTaskNarrativeBanner };
export default InteractiveTaskNarrativeBanner;
