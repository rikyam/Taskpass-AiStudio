import { Task } from "../types";

export const getLocalDateString = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const getNextDateString = (dateStr: string, offsetDays: number = 1): string => {
  if (!dateStr || dateStr === "2000-01-01") return dateStr;
  try {
    const parts = dateStr.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + offsetDays);
    return getLocalDateString(d);
  } catch {
    return dateStr;
  }
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "No Date";
  if (dateStr === "2000-01-01") return "Saved";
  try {
    const cleanStr = dateStr.split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const yyyy = parts[0];
      const mm = parts[1].padStart(2, "0");
      const dd = parts[2].padStart(2, "0");
      const yy = yyyy.length === 4 ? yyyy.slice(2) : yyyy.padStart(2, "0");
      return `${mm}/${dd}/${yy}`;
    }
    const slashParts = cleanStr.split("/");
    if (slashParts.length === 3) {
      const mm = slashParts[0].padStart(2, "0");
      const dd = slashParts[1].padStart(2, "0");
      const yy = slashParts[2].length === 4 ? slashParts[2].slice(2) : slashParts[2].padStart(2, "0");
      return `${mm}/${dd}/${yy}`;
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yy = String(date.getFullYear()).slice(-2);
      return `${mm}/${dd}/${yy}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

/**
 * Business Rule for Saved Tasks Queue:
 * Tasks go into the saved tasks queue only when the start date has passed,
 * after 6 AM the next day.
 * Example: Tasks started on September 1 will only pass to the saved queue on September 2 at 6 AM.
 * Repeating recurring tasks do NOT go to the saved queue.
 */
export const isTaskInSavedQueue = (task: Task, now: Date = new Date()): boolean => {
  if (!task) return false;
  if (task.completed) return false;
  if (task.isTransferred) return false;
  if (task.isAllDay) return false;

  // Repeating recurring tasks never go to the saved queue
  if (
    task.isRecurring ||
    task.recurringParentId ||
    (task.recurrenceFrequency && task.recurrenceFrequency !== "none") ||
    (task.repeatConfig && task.repeatConfig !== "none")
  ) {
    return false;
  }

  // Explicitly moved to saved (sentinel date 2000-01-01 or missing date)
  if (!task.date || task.date === "2000-01-01") {
    return true;
  }

  // Check date string format YYYY-MM-DD
  const parts = task.date.split("-").map(p => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return false;
  }

  const [year, month, day] = parts;
  // Cutoff is strictly 6:00:00 AM on the day after the start date
  const cutoff = new Date(year, month - 1, day + 1, 6, 0, 0, 0);

  return now.getTime() >= cutoff.getTime();
};

export const formatTime = (timeStr: string): string => {
  if (!timeStr) return "";
  if (typeof timeStr !== "string") timeStr = String(timeStr);
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    const h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] || "00";
    const ap = ampmMatch[3].toUpperCase();
    return `${h}:${m} ${ap}`;
  }
  try {
    const parts = trimmed.split(":");
    const hour = parseInt(parts[0], 10);
    if (isNaN(hour)) return timeStr;
    const minutes = parts.length > 1 ? parts[1].slice(0, 2).padStart(2, "0") : "00";
    const effectiveHour = ((hour % 24) + 24) % 24;
    const ampm = effectiveHour >= 12 ? "PM" : "AM";
    const displayHour = effectiveHour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeStr || "";
  }
};

export const timeToMinutes = (timeStr: any): number => {
  if (!timeStr) return 0;
  try {
    const stringified = String(timeStr).trim();
    const ampmMatch = stringified.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = parseInt(ampmMatch[2] || "0", 10);
      const isPm = ampmMatch[3].toLowerCase() === "pm";
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return h * 60 + m;
    }
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

export const formatDurationText = formatDuration;

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
    let s = val.replace(/\[\s*(?:Data\s*type\s*:?|type\s*:?|Task\s*Title\s*:?|Title\s*:?|Collaborator\s*:?|Collaborators\s*:?|Location\s*:?)\s*([^\]]+)\]/gi, (_, inner) => {
      const sub = inner.match(/^(?:Task\s*Title|Title|Collaborator|Collaborators|Location)\s*[:=-]\s*(.+)$/i);
      if (sub) return sub[1].trim();
      if (/^(?:Task\s*Title|Title|Collaborator|Collaborators|Location|String|Text|None)$/i.test(inner.trim())) return "";
      return inner.trim();
    });
    s = s.replace(/\[\s*Data\s*type\s*:[^\]]*\]/gi, "")
         .replace(/\[\s*Data\s*type[^\]]*\]/gi, "")
         .replace(/\[\s*Data:[^\]]*\]/gi, "")
         .replace(/\[\s*type:[^\]]*\]/gi, "");
    s = s.replace(/\{(?:TITLE|COLLABORATORS?|ATTENDEES?|LOCATION)\}/gi, "");
    const low = s.trim().toLowerCase();
    if (low === "none" || low === "null" || low === "undefined" || low === "[none]" || low === "no collaborator" || low === "no location" || low === "syntaxerror" || low === "[object object]") {
      return "";
    }
    return s.replace(/^["'`\s,;:]+|["'`\s,;:]+$/g, "").replace(/\s+/g, " ").trim();
  };

  const cleanTitle = cleanVal(title);
  let cleanCollab = cleanVal(collaborator).replace(/^with\s*:?\s*/i, "");
  if (cleanCollab.toLowerCase() === "none" || cleanCollab.toLowerCase() === "no collaborator") cleanCollab = "";
  let cleanLoc = cleanVal(location).replace(/^(?:at|in)\s*:?\s*/i, "");
  if (cleanLoc.toLowerCase() === "none" || cleanLoc.toLowerCase().includes("no location")) cleanLoc = "";

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

export const scheduleDynamicTasks = (
  dateTasks: Task[] = [],
  isToday = false,
  currentNowMins = 0,
  dayStartMinutes = 0,
  snapIncrement = 5
): Task[] => {
  if (dateTasks.length === 0) return [];
  const inc = (snapIncrement === 0) ? 1 : ((snapIncrement === 5 || snapIncrement === 10 || snapIncrement === 15 || snapIncrement === 30) ? snapIncrement : 5);

  const todayStr = getLocalDateString();
  const effectiveIsToday = isToday || (dateTasks.length > 0 && dateTasks.some(t => t.date === todayStr));
  const effectiveNowMins = (currentNowMins !== undefined && currentNowMins > 0)
    ? currentNowMins
    : (new Date().getHours() * 60 + new Date().getMinutes());

  const locked = dateTasks
    .filter(t => (t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed)
    .map(t => ({
      ...t,
      computedTime: t.time || t.computedTime || "00:00"
    }))
    .sort((a, b) => timeToMinutes(a.computedTime) - timeToMinutes(b.computedTime));

  const flexible = dateTasks
    .filter(t => !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && !t.completed);

  const completedTasks = dateTasks
    .filter(t => t.completed)
    .map(t => ({
      ...t,
      computedTime: t.computedTime || t.time || "00:00"
    }))
    .sort((a, b) => timeToMinutes(a.computedTime) - timeToMinutes(b.computedTime));

  const scheduled: Task[] = [];

  // Initialize occupied slots with immovable locked tasks and completed tasks
  const occupied: Array<{ start: number; end: number; id?: string }> = [
    ...locked
      .filter(t => !t.isOpenPlaceholder)
      .map(t => {
        const start = timeToMinutes(t.computedTime || "00:00");
        const dur = parseDurationToMinutes(t.duration) || 30;
        const before = t.travelBefore || 0;
        const after = t.travelAfter || 0;
        return { start: start - before, end: start + dur + after, id: t.id };
      }),
    ...completedTasks
      .filter(t => !t.isOpenPlaceholder)
      .map(t => {
        const start = timeToMinutes(t.computedTime || "00:00");
        const dur = parseDurationToMinutes(t.duration) || 30;
        const before = t.travelBefore || 0;
        const after = t.travelAfter || 0;
        return { start: start - before, end: start + dur + after, id: t.id };
      })
  ];

  // Helper to find earliest conflict-free opening in [windowMin, windowMax]
  const findEarliestOpening = (
    totalNeeded: number,
    beforeOffset: number,
    windowMin: number,
    windowMax: number
  ): { slotStart: number; candidateStart: number } | null => {
    let seek = Math.max(0, windowMin);
    let attempts = 0;
    while (attempts < 1000 && seek + totalNeeded <= windowMax) {
      const candidateStart = Math.ceil((seek + beforeOffset) / inc) * inc;
      const candidateSlotStart = candidateStart - beforeOffset;
      const tEnd = candidateSlotStart + totalNeeded;
      if (tEnd > windowMax) {
        break;
      }
      const conflicts = occupied.filter(occ => candidateSlotStart < occ.end && tEnd > occ.start);
      if (conflicts.length > 0) {
        const maxEnd = Math.max(...conflicts.map(c => c.end));
        seek = Math.max(seek + 1, maxEnd);
      } else {
        return { slotStart: candidateSlotStart, candidateStart };
      }
      attempts++;
    }
    return null;
  };

  // Group flexible tasks into units (either a single task or contiguous sequence)
  type FlexibleUnit =
    | { type: "single"; task: Task; priority: "high" | "medium" | "low" | "none"; minOrder: number; origStart: number }
    | { type: "sequence"; groupId: string; tasks: Task[]; priority: "high" | "medium" | "low" | "none"; minOrder: number; origStart: number };

  const flexibleUnits: FlexibleUnit[] = [];
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
        const firstOrigStart = timeToMinutes(groupTasks[0]?.computedTime || groupTasks[0]?.time || "00:00");
        flexibleUnits.push({
          type: "sequence",
          groupId: task.groupId,
          tasks: groupTasks,
          priority: bestPriority,
          minOrder,
          origStart: firstOrigStart
        });
      }
    } else {
      flexibleUnits.push({
        type: "single",
        task,
        priority: task.priority || "none",
        minOrder: task.order ?? 999,
        origStart: timeToMinutes(task.computedTime || task.time || "00:00")
      });
    }
  });

  // Sort flexible units: by priority weight first, then minOrder (user arrangement in deck / task view), then original start
  flexibleUnits.sort((a, b) => {
    const wA = getPriorityWeight(a.priority);
    const wB = getPriorityWeight(b.priority);
    if (wA !== wB) return wA - wB;

    if (a.minOrder !== b.minOrder) return a.minOrder - b.minOrder;
    return (a.origStart || 0) - (b.origStart || 0);
  });

  // Greedily schedule each flexible unit: starting at current time/date, cascading downwards by priority and arrangement, greedily filling all open space upwards
  flexibleUnits.forEach(unit => {
    if (unit.type === "single") {
      const task = unit.task;
      const dur = parseDurationToMinutes(task.duration) || 30;
      const before = task.travelBefore || 0;
      const after = task.travelAfter || 0;
      const totalNeeded = Math.max(before + dur + after, 1);

      let slot: { slotStart: number; candidateStart: number } | null = null;
      const minAllowed = 0;

      if (effectiveIsToday) {
        // Today: Anchor at max of dayStartMinutes, effectiveNowMins, and minAllowed so flexible tasks respect dayStartHour
        const anchor = Math.max(dayStartMinutes, effectiveNowMins, minAllowed);
        // 1. Greedily fill upwards from earliest available opening
        slot = findEarliestOpening(totalNeeded, before, anchor, 1800);

        // 2. Overflow window without jumping into the past
        if (!slot) {
          slot = findEarliestOpening(totalNeeded, before, anchor, 2880);
        }
      } else {
        // Other dates: Greedily fill upwards starting from dayStartMinutes (or minAllowed for dependencies)
        const anchor = Math.max(dayStartMinutes, minAllowed, 0);
        slot = findEarliestOpening(totalNeeded, before, anchor, 1800);

        // Overflow window up to 2880
        if (!slot) {
          slot = findEarliestOpening(totalNeeded, before, anchor, 2880);
        }
      }

      if (slot) {
        scheduled.push({
          ...task,
          computedTime: minutesToTimeString(slot.candidateStart),
          isFlexible: true,
          isOverflow: false
        });
        occupied.push({ start: slot.slotStart, end: slot.slotStart + totalNeeded, id: task.id });
      } else {
        scheduled.push({ ...task, computedTime: "23:59", isFlexible: true, isOverflow: true });
      }
    } else {
      const groupTasks = unit.tasks;
      let totalNeeded = 0;
      groupTasks.forEach(gt => {
        const dur = parseDurationToMinutes(gt.duration) || 30;
        const before = gt.travelBefore || 0;
        const after = gt.travelAfter || 0;
        totalNeeded += before + dur + after;
      });

      // Check for any predecessor dependencies in this sequence
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
          const pDur = parseDurationToMinutes(p.duration) || 30;
          const pAfter = p.travelAfter || 0;
          const pEnd = pStart + pDur + pAfter;
          if (pEnd > maxPredecessorEnd) {
            maxPredecessorEnd = pEnd;
          }
        });
      }

      const minAllowed = maxPredecessorEnd;
      const firstBefore = groupTasks[0]?.travelBefore || 0;
      let slot: { slotStart: number; candidateStart: number } | null = null;

      if (effectiveIsToday) {
        // Today: Anchor at max of dayStartMinutes, effectiveNowMins, and minAllowed so flexible tasks respect dayStartHour
        const anchor = Math.max(dayStartMinutes, effectiveNowMins, minAllowed);
        // Greedily fill upwards starting from earliest available opening
        slot = findEarliestOpening(totalNeeded, firstBefore, anchor, 1800);

        // Overflow window without jumping into the past
        if (!slot) {
          slot = findEarliestOpening(totalNeeded, firstBefore, anchor, 2880);
        }
      } else {
        // Other dates: Greedily fill upwards starting from dayStartMinutes (or minAllowed)
        const anchor = Math.max(dayStartMinutes, minAllowed, 0);
        slot = findEarliestOpening(totalNeeded, firstBefore, anchor, 1800);

        // Overflow window up to 2880
        if (!slot) {
          slot = findEarliestOpening(totalNeeded, firstBefore, anchor, 2880);
        }
      }

      if (slot) {
        let currentGroupPointer = slot.slotStart;
        groupTasks.forEach(gTask => {
          const gDur = parseDurationToMinutes(gTask.duration) || 30;
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

        occupied.push({ start: slot.slotStart, end: slot.slotStart + totalNeeded });
      } else {
        groupTasks.forEach(gTask => {
          scheduled.push({
            ...gTask,
            computedTime: "23:59",
            isFlexible: true,
            isOverflow: true
          });
        });
      }
    }
  });

  const allScheduled = [...locked, ...completedTasks, ...scheduled];
  return allScheduled.sort((a, b) => {
    const timeA = timeToMinutes(a.computedTime || a.time || "00:00");
    const timeB = timeToMinutes(b.computedTime || b.time || "00:00");
    if (timeA !== timeB) return timeA - timeB;
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.isLocked !== b.isLocked) return a.isLocked ? -1 : 1;
    return (a.order ?? 999) - (b.order ?? 999);
  });
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
    .replace(/^[\s✅✓✔☑☐☒⏳•\-\*\.\:\#\@\(\[\{]+/g, "")
    .replace(/\s*\(\s*\d+\s*(\/|of)\s*\d+\s*\)/gi, "") // strip subtask counts like (1/2), (1 of 2)
    .replace(/\s*\[\s*\d+\s*(\/|of)\s*\d+\s*\]/gi, "")
    .replace(/\s*[\(\[]\s*gcal\s*event\s*[\)\]]/gi, "") // strip (gcal event) or [gcal event] anywhere
    .replace(/[✅✓✔☑☐☒]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const deduplicateTasks = (tasks: Task[]): Task[] => {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return [];

  const result: Task[] = [];
  const idMap = new Map<string, number>();
  const gcalMap = new Map<string, number>();

  tasks.forEach((t) => {
    if (!t || !t.id) return;

    let existingIdx = -1;

    if (idMap.has(t.id)) {
      existingIdx = idMap.get(t.id)!;
    } else if (t.gcalEventId && gcalMap.has(t.gcalEventId)) {
      existingIdx = gcalMap.get(t.gcalEventId)!;
    } else if (t.id.startsWith("gcal_") && gcalMap.has(t.id.replace("gcal_", ""))) {
      existingIdx = gcalMap.get(t.id.replace("gcal_", ""))!;
    }

    if (existingIdx !== -1) {
      const existing = result[existingIdx];
      
      const existingMod = existing.lastModified || 0;
      const tMod = t.lastModified || 0;
      const primary = tMod >= existingMod ? t : existing;
      const secondary = tMod >= existingMod ? existing : t;

      let bestId = primary.id;
      // Prefer stable non-gcal_ prefixed IDs if available so UI bindings remain intact
      if (primary.id.startsWith("gcal_") && !secondary.id.startsWith("gcal_")) {
        bestId = secondary.id;
      } else if (!primary.id.startsWith("gcal_")) {
        bestId = primary.id;
      }

      const bestGcalEventId = primary.gcalEventId || secondary.gcalEventId || (primary.id.startsWith("gcal_") ? primary.id.replace("gcal_", "") : (secondary.id.startsWith("gcal_") ? secondary.id.replace("gcal_", "") : undefined));

      const merged: Task = {
        ...secondary,
        ...primary,
        id: bestId,
        gcalEventId: bestGcalEventId,
        time: primary.time || secondary.time || primary.computedTime || secondary.computedTime,
        computedTime: primary.computedTime || secondary.computedTime || primary.time || secondary.time,
        isLocked: primary.isLocked ?? secondary.isLocked ?? true,
        isAllDay: primary.isAllDay !== undefined ? primary.isAllDay : secondary.isAllDay,
        location: primary.location || secondary.location || "",
        notes: primary.notes || secondary.notes || "",
        attendees: primary.attendees || secondary.attendees || "",
        groupId: primary.groupId || secondary.groupId,
        groupName: primary.groupName || secondary.groupName,
        subtasks: (primary.subtasks && primary.subtasks.length > 0) ? primary.subtasks : secondary.subtasks,
        lastModified: Math.max(existingMod, tMod, Date.now())
      };

      result[existingIdx] = merged;
      
      // Associate all alternative IDs to the merged index
      idMap.set(merged.id, existingIdx);
      idMap.set(primary.id, existingIdx);
      idMap.set(secondary.id, existingIdx);
      if (t.id) idMap.set(t.id, existingIdx);

      if (merged.gcalEventId) {
        gcalMap.set(merged.gcalEventId, existingIdx);
      }
    } else {
      const idx = result.length;
      const effectiveGcalId = t.gcalEventId || (t.id.startsWith("gcal_") ? t.id.replace("gcal_", "") : undefined);
      const taskWithGcal: Task = {
        ...t,
        gcalEventId: effectiveGcalId
      };
      result.push(taskWithGcal);
      idMap.set(t.id, idx);
      if (effectiveGcalId) gcalMap.set(effectiveGcalId, idx);
    }
  });

  return result;
};
