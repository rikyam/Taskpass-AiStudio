import { Task } from "../types";

export const getLocalDateString = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "No Date";
  if (dateStr === "2000-01-01") return "Backlog";
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

export const formatTime = (timeStr: string): string => {
  if (!timeStr) return "";
  try {
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, "0");
    const effectiveHour = hour % 24;
    const ampm = effectiveHour >= 12 ? "PM" : "AM";
    const displayHour = effectiveHour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return "";
  }
};

export const timeToMinutes = (timeStr: any): number => {
  if (!timeStr) return 0;
  try {
    const stringified = String(timeStr);
    const parts = stringified.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  } catch {
    return 0;
  }
};

export const minutesToTimeString = (totalMinutes: number): string => {
  let normalized = Math.floor(totalMinutes);
  if (normalized < 0) {
    while (normalized < 0) normalized += 1440;
  }
  const hours = Math.floor(normalized / 60);
  const mins = Math.floor(normalized % 60);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const parseDurationToMinutes = (durationStr: any): number => {
  if (!durationStr && durationStr !== 0) return 15;
  if (typeof durationStr === "number") return durationStr;
  const normalized = String(durationStr).toLowerCase();
  let totalMinutes = 0;
  try {
    const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(h|hour|hr)/);
    if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60;
    const minMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(m|min)/);
    if (minMatch) totalMinutes += parseFloat(minMatch[1]);
    if (totalMinutes === 0 && !isNaN(parseFloat(normalized))) totalMinutes = parseFloat(normalized);
  } catch {
    return 15;
  }
  return Math.floor(totalMinutes) || 15;
};

export const formatDuration = (durationStr: any): string => {
  const mins = parseDurationToMinutes(durationStr);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${String(remainingMins).padStart(2, '0')} min`;
  }
  return `${mins} min`;
};

export const formatFreeTimeInHoursMins = (mins: number): string => {
  if (!mins || mins <= 0) return "0 min";
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${String(remainingMins).padStart(2, '0')} min`;
  } else if (hours > 0) {
    return `${hours}h 00 min`;
  }
  return `${remainingMins} min`;
};

export const buildTaskNarrativeText = (props: {
  title: string;
  time: string;
  duration: string;
  collaborator?: string;
  location?: string;
  travelBefore?: number;
  travelAfter?: number;
}): string => {
  const { title, time, duration, collaborator, location, travelBefore, travelAfter } = props;

  const cleanVal = (val?: string) => {
    if (!val) return "";
    return val.replace(/\[Data\s*type[^\]]*\]/gi, "").replace(/\[Data[^\]]*\]/gi, "").replace(/\[type:[^\]]*\]/gi, "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  };

  const cleanTitle = cleanVal(title);
  const cleanCollab = cleanVal(collaborator);
  const cleanLoc = cleanVal(location);

  let timeStr = "";
  if (time && time.includes(":")) {
    const [hStr, mStr] = time.split(":");
    const startMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);
    const durMins = parseDurationToMinutes(duration || "30 min") || 30;
    const endMins = (startMins + durMins) % 1440;

    const formatMins12 = (totalMins: number) => {
      const h24 = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const ampm = h24 >= 12 ? "pm" : "am";
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const mPadded = String(m).padStart(2, "0");
      return `${h12}:${mPadded}${ampm}`;
    };

    timeStr = `From ${formatMins12(startMins)} to ${formatMins12(endMins)}`;
  }

  let mainText = cleanTitle || "Activity";
  let locPart = "";
  if (cleanLoc && !mainText.toLowerCase().includes(cleanLoc.toLowerCase())) {
    locPart = ` at ${cleanLoc}`;
  }
  let collabPart = "";
  if (cleanCollab && !mainText.toLowerCase().includes(cleanCollab.toLowerCase())) {
    collabPart = ` with ${cleanCollab}`;
  }

  let bufferStr = "";
  const tBefore = travelBefore || 0;
  const tAfter = travelAfter || 0;
  if (tBefore > 0 && tAfter > 0) {
    if (tBefore === tAfter) {
      bufferStr = ` and have ${tBefore} minutes of transit time before and after`;
    } else {
      bufferStr = ` and have ${tBefore} minutes of transit time before and ${tAfter} minutes after`;
    }
  } else if (tBefore > 0) {
    bufferStr = ` and have ${tBefore} minutes of transit time before`;
  } else if (tAfter > 0) {
    bufferStr = ` and have ${tAfter} minutes of transit time after`;
  }

  let fullNarrative = "";
  if (timeStr) {
    fullNarrative = `${timeStr} you will ${mainText}${locPart}${collabPart}${bufferStr}.`;
  } else {
    fullNarrative = `You will ${mainText}${locPart}${collabPart}${bufferStr}.`;
  }

  return fullNarrative.replace(/\s+/g, " ").trim();
};

export const getPriorityWeight = (priority?: string, isLocked?: boolean): number => {
  if (isLocked) return 0; // Locked tasks always have highest priority, regardless of the flag status
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  if (priority === "low") return 3;
  if (priority === "none") return 4;
  return 3; // Default low/lowest
};

// ============================================
// DYNAMIC TIMELINE SCHEDULING ENGINE
// ============================================

export const scheduleDynamicTasks = (dateTasks: Task[] = [], isToday = false, currentNowMins = 0, dayStartMinutes = 0): Task[] => {
  if (dateTasks.length === 0) return [];
  const locked = dateTasks
    .filter(t => (t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const flexible = dateTasks
    .filter(t => !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed)
    .sort((a, b) => {
      const wA = getPriorityWeight(a.priority);
      const wB = getPriorityWeight(b.priority);
      if (wA !== wB) return wA - wB;
      return (a.order ?? 999) - (b.order ?? 999);
    });

  const completedTasks = dateTasks
    .filter(t => t.completed)
    .sort((a, b) => timeToMinutes(a.computedTime || a.time) - timeToMinutes(b.computedTime || b.time));

  const scheduled: Task[] = [];
  let currentPointer = Math.floor(isToday ? Math.max(currentNowMins, dayStartMinutes) : dayStartMinutes);

  const occupied = [
    ...locked
      .filter(t => !t.isOpenPlaceholder)
      .map(t => {
        const start = timeToMinutes(t.time);
        const dur = parseDurationToMinutes(t.duration);
        const before = t.travelBefore || 0;
        const after = t.travelAfter || 0;
        return { start: start - before, end: start + dur + after };
      }),
    ...completedTasks
      .filter(t => !t.isOpenPlaceholder)
      .map(t => {
        const start = timeToMinutes(t.computedTime || t.time || "00:00");
        const dur = parseDurationToMinutes(t.duration);
        const before = t.travelBefore || 0;
        const after = t.travelAfter || 0;
        return { start: start - before, end: start + dur + after };
      })
  ];

  // Schedule each unlocked/flexible task individually to allow dynamic greedy scheduling around conflicts,
  // keeping tasks that belong to the same flexible sequence contiguous with no other tasks in between.
  const flexibleUnits: Array<{ type: "single"; task: Task } | { type: "sequence"; groupId: string; tasks: Task[]; priority: "high" | "medium" | "low" | "none"; minOrder: number }> = [];
  const processedGroupIds = new Set<string>();

  flexible.forEach(task => {
    if (task.groupId && !task.isUnlinked) {
      if (!processedGroupIds.has(task.groupId)) {
        processedGroupIds.add(task.groupId);
        const groupTasks = flexible
          .filter(t => t.groupId === task.groupId && !t.isUnlinked)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        
        const priorities: ("high" | "medium" | "low" | "none")[] = ["high", "medium", "low", "none"];
        let bestPriority: "high" | "medium" | "low" | "none" = "none";
        groupTasks.forEach(gt => {
          const idxVal = priorities.indexOf(gt.priority || "none");
          const curIdx = priorities.indexOf(bestPriority);
          if (idxVal !== -1 && idxVal < curIdx) {
            bestPriority = gt.priority || "none";
          }
        });

        const minOrder = Math.min(...groupTasks.map(t => t.order ?? 999));
        flexibleUnits.push({
          type: "sequence",
          groupId: task.groupId,
          tasks: groupTasks,
          priority: bestPriority,
          minOrder
        });
      }
    } else {
      flexibleUnits.push({
        type: "single",
        task
      });
    }
  });

  flexibleUnits.sort((a, b) => {
    const pA = a.type === "single" ? (a.task.priority || "none") : a.priority;
    const pB = b.type === "single" ? (b.task.priority || "none") : b.priority;
    const wA = getPriorityWeight(pA);
    const wB = getPriorityWeight(pB);
    if (wA !== wB) return wA - wB;

    const ordA = a.type === "single" ? (a.task.order ?? 999) : a.minOrder;
    const ordB = b.type === "single" ? (b.task.order ?? 999) : b.minOrder;
    return ordA - ordB;
  });

  flexibleUnits.forEach(unit => {
    if (unit.type === "single") {
      const task = unit.task;
      const dur = parseDurationToMinutes(task.duration);
      const before = task.travelBefore || 0;
      const after = task.travelAfter || 0;
      const needed = Math.max(before + dur + after, 1);
      let foundSlot = false;
      
      let seek = currentPointer;
      if (isToday) {
        seek = Math.max(seek, currentNowMins);
      }

      let attempts = 0;
      while (!foundSlot && attempts < 1000 && seek < 2880) {
        const tEnd = seek + needed;
        const conflict = occupied.find(occ => seek < occ.end && tEnd > occ.start);
        if (conflict) {
          seek = Math.max(seek + 1, conflict.end);
        } else {
          scheduled.push({
            ...task,
            computedTime: minutesToTimeString(seek + before),
            isFlexible: true,
            isOverflow: false
          });
          occupied.push({ start: seek, end: tEnd });
          currentPointer = Math.max(currentPointer, seek + needed);
          foundSlot = true;
        }
        attempts++;
      }

      if (!foundSlot) {
        scheduled.push({ ...task, computedTime: "23:59", isFlexible: true, isOverflow: true });
      }
    } else {
      const groupTasks = unit.tasks;
      let totalNeeded = 0;
      groupTasks.forEach(gt => {
        const dur = parseDurationToMinutes(gt.duration);
        const before = gt.travelBefore || 0;
        const after = gt.travelAfter || 0;
        totalNeeded += before + dur + after;
      });

      // Find the predecessor end time if any predecessor task is locked or completed
      let maxPredecessorEnd = 0;
      if (unit.groupId) {
        const firstFlexibleOrder = groupTasks[0]?.order ?? 999;
        const predecessors = dateTasks.filter(t => 
          t.groupId === unit.groupId && 
          !t.isUnlinked && 
          (t.order ?? 999) < firstFlexibleOrder
        );
        predecessors.forEach(p => {
          const pStart = p.completed 
            ? timeToMinutes(p.computedTime || p.time || "00:00") 
            : timeToMinutes(p.time || "00:00");
          const pDur = parseDurationToMinutes(p.duration);
          const pAfter = p.travelAfter || 0;
          const pEnd = pStart + pDur + pAfter;
          if (pEnd > maxPredecessorEnd) {
            maxPredecessorEnd = pEnd;
          }
        });
      }

      let foundSlot = false;
      let seek = currentPointer;
      if (isToday) {
        seek = Math.max(seek, currentNowMins);
      }
      if (maxPredecessorEnd > 0) {
        seek = Math.max(seek, maxPredecessorEnd);
      }

      let attempts = 0;
      while (!foundSlot && attempts < 1000 && seek < 2880) {
        const tEnd = seek + totalNeeded;
        const conflict = occupied.find(occ => seek < occ.end && tEnd > occ.start);
        if (conflict) {
          seek = Math.max(seek + 1, conflict.end);
        } else {
          let currentGroupPointer = seek;
          groupTasks.forEach(gTask => {
            const gDur = parseDurationToMinutes(gTask.duration);
            const gBefore = gTask.travelBefore || 0;
            const gAfter = gTask.travelAfter || 0;
            
            scheduled.push({
              ...gTask,
              computedTime: minutesToTimeString(currentGroupPointer + gBefore),
              isFlexible: true,
              isOverflow: false
            });
            currentGroupPointer += gBefore + gDur + gAfter;
          });

          occupied.push({ start: seek, end: seek + totalNeeded });
          currentPointer = Math.max(currentPointer, seek + totalNeeded);
          foundSlot = true;
        }
        attempts++;
      }

      if (!foundSlot) {
        groupTasks.forEach(gTask => {
          scheduled.push({ ...gTask, computedTime: "23:59", isFlexible: true, isOverflow: true });
        });
      }
    }
  });

  const processedCompleted = completedTasks.map(t => ({
    ...t,
    computedTime: t.computedTime || t.time || "00:00",
    isFlexible: !t.isLocked,
    isOverflow: false
  }));

  const finalSchedule = [
    ...locked.map(t => ({ ...t, computedTime: t.time || "00:00", isFlexible: !t.isLocked, isOverflow: false })),
    ...scheduled,
    ...processedCompleted
  ].sort((a, b) => {
    const timeA = timeToMinutes(a.computedTime);
    const timeB = timeToMinutes(b.computedTime);
    if (timeA !== timeB) return timeA - timeB;
    return (a.order || 0) - (b.order || 0);
  });

  return finalSchedule;
};

// FIND ALTERNATIVES IN GRID
export const findAlternativeTimes = (proposedTask: Task, dailyTasks: Task[], limit = 3): string[] => {
  const lockedOnDay = dailyTasks.filter(t => 
    t.isLocked && 
    !t.isFlexible &&
    !t.isOpenPlaceholder &&
    !t.completed &&
    t.id !== proposedTask.id && 
    (!proposedTask.groupId || t.groupId !== proposedTask.groupId)
  );

  const intervals = lockedOnDay.map(t => {
    const start = timeToMinutes(t.computedTime || t.time);
    const dur = parseDurationToMinutes(t.duration);
    const before = t.travelBefore || 0;
    const after = t.travelAfter || 0;
    return { start: start - before, end: start + dur + after };
  }).sort((a, b) => a.start - b.start);

  const duration = parseDurationToMinutes(proposedTask.duration);
  const pBefore = proposedTask.travelBefore || 0;
  const pAfter = proposedTask.travelAfter || 0;
  
  const suggestions: string[] = [];
  let pointer = timeToMinutes(proposedTask.time) || 480; 
  let attempts = 0;

  const isSlotFree = (pt: number) => {
    const start = pt - pBefore;
    const end = pt + duration + pAfter;
    if (start < 0 || end > 1440) return false;
    return !intervals.some(inv => start < inv.end && end > inv.start);
  };

  while (suggestions.length < limit && pointer < 1440 && attempts < 500) {
    if (isSlotFree(pointer)) {
      suggestions.push(minutesToTimeString(pointer));
      pointer += duration + 30; 
    } else {
      const start = pointer - pBefore;
      const end = pointer + duration + pAfter;
      const conflict = intervals.find(inv => start < inv.end && end > inv.start);
      if (conflict) {
        pointer = conflict.end + pBefore + 15;
      } else {
        pointer += 15;
      }
    }
    attempts++;
  }
  return suggestions;
};

export const getDayOfWeek = (dateStr: string): string => {
  const parts = dateStr.split("-").map(Number);
  const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(dateStr);
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
};

export const matchesRecurrencePattern = (task: Task, targetDateStr: string): boolean => {
  if (!task.isRecurring || task.recurrenceFrequency === 'none' || !task.date) return false;
  if (task.date > targetDateStr) return false;
  if (task.recurrenceUntil && targetDateStr >= task.recurrenceUntil) return false;

  const targetParts = targetDateStr.split("-").map(Number);
  const taskParts = task.date.split("-").map(Number);
  if (targetParts.length !== 3 || taskParts.length !== 3) return false;

  const targetDateObj = new Date(targetParts[0], targetParts[1] - 1, targetParts[2]);
  const freq = task.recurrenceFrequency;
  
  if (freq === 'daily') {
    const dayOfWeek = targetDateObj.getDay();
    const days = task.recurrenceWeeklyDays || [];
    if (days.length > 0 && !days.includes(dayOfWeek)) return false;
    return true;
  }
  
  if (freq === 'weekly') {
    const dayOfWeek = targetDateObj.getDay(); // 0 = Sunday, 1 = Monday...
    const days = task.recurrenceWeeklyDays || [];
    if (!days.includes(dayOfWeek)) return false;

    const interval = task.recurrenceWeeklyInterval || 1;
    if (interval <= 1) return true;

    // Calculate difference in weeks between start week and target week
    const startDateObj = new Date(taskParts[0], taskParts[1] - 1, taskParts[2]);
    const startWeekSunday = new Date(startDateObj);
    startWeekSunday.setDate(startDateObj.getDate() - startDateObj.getDay());
    startWeekSunday.setHours(0, 0, 0, 0);

    const targetWeekSunday = new Date(targetDateObj);
    targetWeekSunday.setDate(targetDateObj.getDate() - targetDateObj.getDay());
    targetWeekSunday.setHours(0, 0, 0, 0);

    const diffMs = targetWeekSunday.getTime() - startWeekSunday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    if (diffWeeks < 0) return false;

    return diffWeeks % interval === 0;
  }
  
  if (freq === 'monthly') {
    return targetParts[2] === taskParts[2];
  }
  
  if (freq === 'yearly') {
    return targetParts[1] === taskParts[1] && targetParts[2] === taskParts[2];
  }
  
  if (freq === 'special_day_of_month') {
    const dayOfWeek = targetDateObj.getDay();
    if (dayOfWeek !== task.recurrenceSpecialWeekday) return false;
    
    const occurrenceIndex = Math.floor((targetParts[2] - 1) / 7); // 0 = First, 1 = Second...
    const occurrenceStrings = ['First', 'Second', 'Third', 'Fourth'];
    const targetOccurrence = occurrenceStrings[occurrenceIndex];
    
    return targetOccurrence === task.recurrenceSpecialOccurrence;
  }
  
  return false;
};

// ============================================
// DEDUPLICATION & TASK NORMALIZATION UTILITIES
// ============================================

export const normalizeTimeStringForDedup = (timeStr?: string): string => {
  if (!timeStr) return "";
  const cleaned = String(timeStr).trim();
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":").map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const h = String(parts[0]).padStart(2, "0");
      const m = String(parts[1]).padStart(2, "0");
      return `${h}:${m}`;
    }
  }
  return cleaned;
};

export const normalizeTitleForDedup = (title?: string): string => {
  if (!title) return "";
  return title
    .replace(/^[✅\s]+/, "")
    .replace(/[✓☐]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const deduplicateTasks = (tasks: Task[]): Task[] => {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return [];

  const result: Task[] = [];
  const idMap = new Map<string, number>();
  const gcalMap = new Map<string, number>();
  const contentMap = new Map<string, number>();

  tasks.forEach((t) => {
    if (!t || !t.id) return;

    const normTitle = normalizeTitleForDedup(t.title);
    const normTime = normalizeTimeStringForDedup(t.time || t.computedTime);
    const contentKey = t.date && normTitle ? `${t.date}__${normTitle}__${t.isAllDay ? 'allday' : normTime}` : null;

    let existingIdx = -1;

    if (idMap.has(t.id)) {
      existingIdx = idMap.get(t.id)!;
    } else if (t.gcalEventId && gcalMap.has(t.gcalEventId)) {
      existingIdx = gcalMap.get(t.gcalEventId)!;
    } else if (contentKey && contentMap.has(contentKey)) {
      existingIdx = contentMap.get(contentKey)!;
    }

    if (existingIdx !== -1) {
      const existing = result[existingIdx];
      
      const existingMod = existing.lastModified || 0;
      const tMod = t.lastModified || 0;
      const primary = tMod >= existingMod ? t : existing;
      const secondary = tMod >= existingMod ? existing : t;

      let bestId = primary.id;
      if (primary.id.startsWith("gcal_") && !secondary.id.startsWith("gcal_")) {
        bestId = secondary.id;
      }

      const merged: Task = {
        ...secondary,
        ...primary,
        id: bestId,
        gcalEventId: primary.gcalEventId || secondary.gcalEventId,
        location: primary.location || secondary.location || "",
        notes: primary.notes || secondary.notes || "",
        attendees: primary.attendees || secondary.attendees || "",
        groupId: primary.groupId || secondary.groupId,
        groupName: primary.groupName || secondary.groupName,
        subtasks: (primary.subtasks && primary.subtasks.length > 0) ? primary.subtasks : secondary.subtasks,
        lastModified: Math.max(existingMod, tMod, Date.now())
      };

      result[existingIdx] = merged;
      idMap.set(merged.id, existingIdx);
      if (merged.gcalEventId) gcalMap.set(merged.gcalEventId, existingIdx);
      if (contentKey) contentMap.set(contentKey, existingIdx);
    } else {
      const idx = result.length;
      result.push({ ...t });
      idMap.set(t.id, idx);
      if (t.gcalEventId) gcalMap.set(t.gcalEventId, idx);
      if (contentKey) contentMap.set(contentKey, idx);
    }
  });

  return result;
};
