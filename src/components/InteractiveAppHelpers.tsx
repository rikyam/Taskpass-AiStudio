import React, { useState, useEffect, useRef, useMemo } from "react";
import { Auth } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { 
  Sparkles, BookOpen, Calendar, Clock, Users, Trash2, Edit3, Plus, X, Check, Copy,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Zap, RotateCcw, RotateCw, Undo, Coffee, Car, Mic, MicOff, Hourglass, Volume2, VolumeX,
  Save, Maximize2, Menu, Sun, Moon, MapPin, Search, Loader2, Play, Pause, Square, SkipForward,
  ArrowUpRight, Phone, Send, ShoppingBag, Link as LinkIcon, Unlink, ExternalLink,
  Globe, FileText, FilePlus, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, CheckCircle2, Circle,
  AlertCircle, Camera, CheckSquare, Trash, Download, Upload, RefreshCw,
  Lock, Unlock, Flag, Settings, CalendarPlus, CalendarRange, Eye, EyeOff, Mail, Key, GripVertical, Layout,
  Cloud, CloudSun, User, SlidersHorizontal, FolderClosed, Tag, ListTodo, Archive, AlertTriangle, Palette,
  History, UserPlus, Settings2, Coins, Database, ListOrdered, Terminal, BarChart3, Triangle, Store, ZoomIn, ZoomOut, Star
} from "lucide-react";
import { Task, Routine, Transfer, Wallet, AppContact, Interaction } from "../types";
import { recalibrationSchedule, DEFAULT_BURNOUT_PLAN } from "./RecalibrationData";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";


export const callGeminiProxy = async (prompt: string, jsonMode: boolean = false, googleSearch: boolean = false) => {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, jsonMode, googleSearch })
    });
    if (!response.ok) {
      console.warn("Gemini proxy call non-200 status:", response.status);
      return null;
    }
    const data = await response.json();
    return data.text;
  } catch (err) {
    console.warn("Gemini proxy call error:", err);
    return null;
  }
};

export const callGeminiLocation = async (query: string) => {
  if (!query) return null;
  const prompt = `Search for the location or business: "${query}". Find the official Business Name, full Address, and public Phone Number. 
  Return ONLY a raw JSON object matching this schema:
  {
    "businessName": "Official Name",
    "address": "Full Address",
    "phone": "Phone number"
  }`;

  try {
    const text = await callGeminiProxy(prompt, true, true);
    if (!text) return null;
    const cleanJson = text.replace(/\`\`\`json/gi, "").replace(/\`\`\`/gi, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Location Lookup Error:", e);
    return null;
  }
};

// ============================================
// SCHEDULER & CONVERSION UTILS
// ============================================

export const getPasswordStrength = (pass: string) => {
  if (!pass) {
    return { 
      score: 0, 
      label: "Empty", 
      color: "bg-slate-700/30", 
      text: "text-slate-500", 
      percent: 0, 
      feedback: [
        { text: "At least 6 characters", checked: false },
        { text: "An uppercase letter", checked: false },
        { text: "A lowercase letter", checked: false },
        { text: "A number", checked: false },
        { text: "A special character", checked: false }
      ]
    };
  }
  
  const hasMinLength = pass.length >= 6;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasUpper) score += 1;
  if (hasLower) score += 1;
  if (hasDigit) score += 1;
  if (hasSpecial) score += 1;

  // Pull score down if length requirement is not met
  if (!hasMinLength) {
    score = Math.min(score, 1);
  }

  let label = "Very Weak";
  let color = "bg-rose-500";
  let text = "text-rose-500";
  let percent = 20;

  if (score === 0) {
    label = "Empty";
    color = "bg-slate-700/30";
    text = "text-slate-500";
    percent = 0;
  } else if (score === 1) {
    label = "Very Weak";
    color = "bg-rose-500";
    text = "text-rose-500 border border-rose-500/10";
    percent = 20;
  } else if (score === 2) {
    label = "Weak";
    color = "bg-amber-500";
    text = "text-amber-500";
    percent = 40;
  } else if (score === 3) {
    label = "Medium";
    color = "bg-yellow-500";
    text = "text-yellow-500";
    percent = 60;
  } else if (score === 4) {
    label = "Strong";
    color = "bg-emerald-500";
    text = "text-emerald-500";
    percent = 80;
  } else if (score === 5) {
    label = "Excellent!";
    color = "bg-indigo-500 dark:bg-indigo-400";
    text = "text-indigo-600 dark:text-indigo-400";
    percent = 100;
  }

  const feedback = [
    { text: "At least 6 characters", checked: hasMinLength },
    { text: "An uppercase letter", checked: hasUpper },
    { text: "A lowercase letter", checked: hasLower },
    { text: "A number", checked: hasDigit },
    { text: "A special character", checked: hasSpecial }
  ];

  return { score, label, color, text, percent, feedback };
};

export const getGoogleMapsDirectionsUrl = (address: string) => {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
};

export const getDynamicTitleClass = (title: string, mode: "standard" | "simple" | "basic" | "report") => {
  const len = title ? title.length : 0;
  // To ensure the font is never reduced to less than 33% (or by more than 33% from its default base size),
  // we restrict the minimum font size to at least 67% of the base size for each respective mode.
  if (mode === "report") {
    if (len > 35) return "text-[7.5px] leading-tight"; // At least 68.1% of base 11px (max 33% reduction)
    if (len > 20) return "text-[9px] leading-tight";
    return "text-[11px] leading-tight";
  }
  if (mode === "basic") {
    if (len > 35) return "text-[9px] leading-tight"; // At least 69.2% of base 13px (max 33% reduction)
    if (len > 20) return "text-[10.5px] leading-tight";
    return "text-[13px] leading-tight";
  }
  if (mode === "simple") {
    if (len > 35) return "text-[10.5px] leading-tight"; // At least 70% of base 15px (max 33% reduction)
    if (len > 20) return "text-[12.5px] leading-tight";
    return "text-[15px] leading-tight";
  }
  // standard
  if (len > 35) return "text-[9px] leading-tight"; // At least 69.2% of base 13px (max 33% reduction)
  if (len > 20) return "text-[11px] leading-tight";
  return "text-[13px] leading-snug";
};

export const getLocalDateString = (date: Date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const formatDate = (dateStr: string) => {
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

export const formatTime = (timeStr: string) => {
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

export const buildNarrativeText = (currentFocus: any, tasks: any[], focusQueueTasks: any[]) => {
  if (!currentFocus) return "";
  const currentFocusTarget = tasks.find((t: any) => t.id === (currentFocus.isBuffer ? currentFocus.parentTaskId : currentFocus.id)) || currentFocus;

  const cleanStr = (str: string) => str ? str.trim().replace(/\s+/g, ' ') : "";
  const title = cleanStr(currentFocusTarget.title || currentFocus.title || "Untitled Task");
  const startTime = currentFocus.time || "12:00";
  const duration = currentFocus.duration || "30 min";
  
  let parts = "";
  if (currentFocus.isBuffer) {
    const bufferPurpose = currentFocus.title || (currentFocus.bufferType === "before" ? "preparation" : "wrap-up");
    if (currentFocus.bufferType === "before") {
      parts = `You are currently in the preparation buffer (Flex Time) for "${title}" (${bufferPurpose}), which is scheduled to start at ${formatTime(startTime)} for a duration of ${duration} before the core task begins.`;
    } else {
      parts = `You are currently in the wrap-up phase (Flex Time) for "${title}" (${bufferPurpose}), which is scheduled to start at ${formatTime(startTime)} for a duration of ${duration} after completing the core task.`;
    }
  } else {
    parts = `You are currently working on ${title}, which is scheduled to start at ${formatTime(startTime)} for a duration of ${duration}.`;
  }
  
  const prioVal = currentFocusTarget.priority || "none";
  if (prioVal && prioVal !== "none") {
    parts += ` The priority of this task is set to ${prioVal}.`;
  }
  
  const locVal = currentFocusTarget.location || "";
  const hasLoc = locVal && locVal.trim() !== "" && !locVal.toLowerCase().includes("no specified location") && !locVal.toLowerCase().includes("no location");
  const travelBeforeMins = typeof currentFocusTarget.travelBefore === "number" ? currentFocusTarget.travelBefore : 0;
  if (hasLoc) {
    if (travelBeforeMins > 0) {
      parts += ` This activity takes place at ${locVal}, and you have ${travelBeforeMins} minutes of buffer time to get there.`;
    } else {
      parts += ` This activity takes place at ${locVal}.`;
    }
  } else if (travelBeforeMins > 0) {
    parts += ` You have ${travelBeforeMins} minutes of buffer time to prepare.`;
  }
  
  const collabVal = currentFocusTarget.attendees || currentFocusTarget.collaborator || "";
  if (collabVal) {
    const list = collabVal.split(",").map((c: string) => c.trim()).filter(Boolean);
    if (list.length > 0) {
      parts += ` You will be collaborating with ${list.join(", ")}.`;
    }
  }
  
  // Check if there are intermediate buffers and a next task
  const idxInQueue = focusQueueTasks.findIndex(t => t.id === currentFocus.id);
  const intermediateBuffers = [];
  let nextActualTask = null;

  if (idxInQueue !== -1) {
    for (let i = idxInQueue + 1; i < focusQueueTasks.length; i++) {
      const card = focusQueueTasks[i];
      if (card.isBuffer) {
        intermediateBuffers.push(card);
      } else {
        nextActualTask = card;
        break;
      }
    }
  }

  if (nextActualTask) {
    const nextTitle = nextActualTask.title || "Untitled Task";
    const nextTime = nextActualTask.time ? formatTime(nextActualTask.time) : "12:00 PM";
    const nextLoc = nextActualTask.location || "";
    const hasNextLoc = nextLoc && nextLoc.trim() !== "" && !nextLoc.toLowerCase().includes("no specified location") && !nextLoc.toLowerCase().includes("no location");

    const currStartMins = timeToMinutes(currentFocusTarget.computedTime || currentFocusTarget.time || "08:00");
    const currDurMins = parseDurationToMinutes(currentFocusTarget.duration);
    const currBufferAfter = currentFocusTarget.travelAfter || 0;
    const currTotalEnd = currStartMins + currDurMins + currBufferAfter;

    const nextStartMins = timeToMinutes(nextActualTask.computedTime || nextActualTask.time || "08:00");
    const nextBufferBefore = nextActualTask.travelBefore || 0;
    const nextTotalStart = nextStartMins - nextBufferBefore;

    const freeTimeMins = nextTotalStart - currTotalEnd;
    const totalBufferMins = intermediateBuffers.reduce((sum, buf) => sum + (parseDurationToMinutes(buf.duration) || 0), 0);

    const details: string[] = [];
    intermediateBuffers.forEach((buf: any) => {
      const typeStr = buf.bufferType === "before" ? "preparation" : "wrap-up";
      details.push(`${buf.duration || "10 min"} for ${typeStr}`);
    });
    const bufferDetailStr = details.length > 0 ? ` (including ${details.join(" and ")})` : "";
    const bufferDesc = `${totalBufferMins} minutes of buffer time in between`;

    if (nextActualTask.id === currentFocus.parentTaskId) {
      parts += ` Afterward, you will transition directly to the core task of "${nextTitle}" scheduled at ${nextTime}`;
      if (hasNextLoc) {
        parts += ` at ${nextLoc}`;
      }
      parts += ".";
    } else {
      parts += ` Afterward, you will transition to ${nextTitle} scheduled at ${nextTime}`;
      if (hasNextLoc) {
        parts += ` at ${nextLoc}`;
      }

      if (totalBufferMins > 0 && freeTimeMins > 0) {
        parts += ` with ${bufferDesc} and ${formatFreeTimeInHoursMins(freeTimeMins)} of free time${bufferDetailStr}`;
      } else if (totalBufferMins > 0) {
        parts += ` with ${bufferDesc}${bufferDetailStr}`;
      } else if (freeTimeMins > 0) {
        parts += ` with ${formatFreeTimeInHoursMins(freeTimeMins)} of free time`;
      }
      parts += ".";
    }
  } else {
    if (intermediateBuffers.length > 0) {
      const bufferDescriptions = intermediateBuffers.map((buf: any) => {
        const typeStr = buf.bufferType === "before" ? "preparation" : "wrap-up";
        const bufDur = buf.duration || "10 min";
        const bufTime = buf.time ? formatTime(buf.time) : "";
        return `a ${bufDur} ${typeStr} buffer starting at ${bufTime}`;
      });
      parts += ` Afterward, you have ${bufferDescriptions.join(", and ")}. After that, there are no further tasks scheduled for today, so you are completely set for the evening!`;
    } else {
      parts += ` There are no further tasks scheduled for today, so you are completely set for the evening!`;
    }
  }
  return parts;
};

export const formatTitleWithPrepositions = (title: string, completed?: boolean) => {
  if (!title) return null;
  const prepositions = new Set([
    "in", "on", "at", "for", "to", "with", "by", "from", "of", "about", "into", "through", "over", 
    "under", "above", "below", "behind", "between", "during", "before", "after", "without", "and", "the", "a", "an", "is", "are"
  ]);
  const words = title.split(/\s+/);
  return (
    <>
      {words.map((word, idx) => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
        const isPrep = prepositions.has(cleanWord);
        return (
          <span
            key={idx}
            className={`${isPrep ? "font-normal text-slate-400" : "font-extrabold text-white"} mr-[0.25em] inline-block ${completed ? "line-through opacity-50" : ""}`}
          >
            {word}
          </span>
        );
      })}
    </>
  );
};

export const timeToMinutes = (timeStr: any) => {
  if (!timeStr) return 0;
  try {
    const stringified = String(timeStr);
    const parts = stringified.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  } catch {
    return 0;
  }
};

export const minutesToTimeString = (totalMinutes: number) => {
  let normalized = Math.floor(totalMinutes);
  if (normalized < 0) {
    while (normalized < 0) normalized += 1440;
  }
  const hours = Math.floor(normalized / 60);
  const mins = Math.floor(normalized % 60);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const parseDurationToMinutes = (durationStr: any) => {
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

export const formatDuration = (durationStr: any) => {
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

export const estimateTextWidth = (str: string, fontSize: number = 20) => {
  let totalScale = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === ' ' || char === ':' || char === '.' || char === ',' || char === 'i' || char === 'l' || char === '1' || char === 'I' || char === 't' || char === 'r') {
      totalScale += 0.28;
    } else if (char === 'M' || char === 'W' || char === 'm' || char === 'w') {
      totalScale += 0.85;
    } else if (char === char.toUpperCase() && char !== char.toLowerCase()) {
      totalScale += 0.65;
    } else {
      totalScale += 0.48;
    }
  }
  return `${totalScale + 0.95}em`;
};

export const getDynamicSelectWidth = (timeStr: string, fontSize: number = 20) => {
  const visibleStr = formatTime(timeStr) || "12:00 AM";
  return estimateTextWidth(visibleStr, fontSize);
};

export const getDynamicDurationWidth = (durationStr: string, fontSize: number = 20) => {
  const visibleStr = durationStr || "30 min";
  return estimateTextWidth(visibleStr, fontSize);
};

export const getDynamicLocationWidth = (locationStr: string, fontSize: number = 20) => {
  const visibleStr = locationStr && !locationStr.toLowerCase().includes("no specified location") ? locationStr : "no specified location";
  return estimateTextWidth(visibleStr, fontSize);
};

export const getPriorityWeight = (priority?: string, isLocked?: boolean) => {
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

export const scheduleDynamicTasks = (dateTasks: Task[] = [], isToday = false, currentNowMins = 0, dayStartMinutes = 0) => {
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
export const findAlternativeTimes = (proposedTask: Task, dailyTasks: Task[], limit = 3) => {
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

// ============================================
// SPECIALIZED UI COMPONENTS
// ============================================

export const Modal = ({ isOpen, onClose, title, headerActions, children, zIndex }: any) => {
  if (!isOpen) return null;
  const zClass = zIndex || "z-[600]";
  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className={`absolute inset-0 ${zClass} flex items-end justify-center p-0 backdrop-blur-md bg-black/75 animate-in fade-in duration-200 cursor-pointer`}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-slate-900 border-t border-white/10 rounded-t-[32px] overflow-hidden flex flex-col p-5 max-h-[92%] shadow-2xl relative animate-in slide-in-from-bottom-6 duration-300 cursor-default"
      >
         <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4 shrink-0">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-10 w-full max-w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

// Reusable Repeat Occurrence Field Component with clear styled selection choices
export const RepeatCycleInput = ({ value, onChange, isDark }: { value: string; onChange: (val: string) => void; isDark: boolean }) => {
  return (
    <div className="relative w-full">
      <select
        value={value || "None"}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-10 px-3 border outline-none font-bold text-xs rounded-xl focus:border-indigo-500 transition-colors uppercase tracking-tight text-left cursor-pointer appearance-none pr-8 ${
          isDark
            ? "bg-slate-950 border-white/5 text-slate-200 hover:bg-slate-900/40"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/50"
        }`}
        style={{ colorScheme: isDark ? "dark" : "light" }}
      >
        <option value="None">None (No Repeat)</option>
        <option value="Daily">Daily (Every Day)</option>
        <option value="Mon-Fri">Mon-Fri (Weekdays)</option>
        <option value="Weekly">Weekly (Every Week)</option>
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

// Reusable Duration Field Component with Single Tap to Cycle and Double Tap to Hour/Minute Picker
export const DurationCycleInput = ({ value, onChange, isDark, placeholder, compact }: { value: string; onChange: (val: string) => void; isDark: boolean; placeholder?: string; compact?: boolean }) => {
  const [isManual, setIsManual] = useState(false);
  const [pickerHours, setPickerHours] = useState(0);
  const [pickerMinutes, setPickerMinutes] = useState(15);
  const clickTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isManual) {
      const totalMins = parseDurationToMinutes(value);
      setPickerHours(Math.floor(totalMins / 60));
      setPickerMinutes(totalMins % 60);
    }
  }, [isManual, value]);

  const handlePickerChange = (h: number, m: number) => {
    let result = "";
    if (h > 0) {
      result = `${h}h ${m}m`;
    } else {
      result = `${m} min`;
    }
    onChange(result);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (clickTimeoutRef.current) {
      // Double click detected!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setIsManual(true);
    } else {
      // Start single click timeout
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        // Cycle increments: 15, 30, 45, 60, 120
        const increments = [15, 30, 45, 60, 120];
        const currentMins = parseDurationToMinutes(value);
        let nextIdx = increments.indexOf(currentMins);
        if (nextIdx === -1) {
          nextIdx = 0;
        } else {
          nextIdx = (nextIdx + 1) % increments.length;
        }
        onChange(`${increments[nextIdx]} min`);
      }, 250);
    }
  };

  if (isManual) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? "h-8 rounded-lg" : "h-10 rounded-xl"} w-full border p-1 ${
        isDark ? "bg-slate-955 border-white/5" : "bg-white border-slate-200"
      }`}>
        <div className="flex-1 flex gap-1 items-center bg-transparent px-1">
          {/* Hours dropdown */}
          <div className="flex items-center flex-1 min-w-0">
            <select
              value={pickerHours}
              onChange={(e) => {
                const h = parseInt(e.target.value, 10) || 0;
                setPickerHours(h);
                handlePickerChange(h, pickerMinutes);
              }}
              className="w-full text-center bg-transparent border-none outline-none font-black text-[11px] text-indigo-400 cursor-pointer appearance-none shrink-0"
              style={{ colorScheme: isDark ? "dark" : "light" }}
            >
              {Array.from({ length: 24 }).map((_, idx) => (
                <option key={idx} value={idx} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                  {idx}h
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-500 font-bold text-[10px] select-none shrink-0">:</span>

          {/* Minutes dropdown */}
          <div className="flex items-center flex-1 min-w-0">
            <select
              value={pickerMinutes}
              onChange={(e) => {
                const m = parseInt(e.target.value, 10) || 0;
                setPickerMinutes(m);
                handlePickerChange(pickerHours, m);
              }}
              className="w-full text-center bg-transparent border-none outline-none font-black text-[11px] text-indigo-400 cursor-pointer appearance-none shrink-0"
              style={{ colorScheme: isDark ? "dark" : "light" }}
            >
              {Array.from({ length: 12 }).map((_, idx) => {
                const minsVal = idx * 5;
                return (
                  <option key={minsVal} value={minsVal} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                    {minsVal}m
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Done / Check button */}
        <button
          type="button"
          onClick={() => setIsManual(false)}
          className="p-1 px-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-wider shrink-0 transition-all flex items-center gap-0.5"
          title="Confirm Duration"
        >
          <Check size={11} strokeWidth={3} />
          <span>Done</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={handleClick}
        className={`w-full ${compact ? "h-8 px-2.5 rounded-lg text-[11.5px]" : "h-10 px-3 rounded-xl text-xs"} outline-none font-bold text-left flex items-center justify-between border transition-all select-none ${
          isDark 
            ? "bg-slate-955 border-white/5 text-white focus:border-indigo-500 hover:bg-slate-900/40" 
            : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500 hover:bg-slate-50"
        }`}
        title="Single tap to cycle, Double tap to edit duration picker"
      >
        <span className="truncate">{value ? value : "15 min"}</span>
        <span className={`text-[8px] font-black uppercase tracking-wider ${isDark ? "bg-slate-900 border-white/5 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-500"} px-1.5 py-0.5 rounded border shrink-0 ml-1`}>
          Cycle
        </span>
      </button>
    </div>
  );
};

// Task Priority Traditional Control Menu
const TaskControlHub = ({ task, onStartTask, onMoveUp, onMoveDown, onMoveToNextDay, onMoveToBacklog }: any) => {
  if (!task || task.completed) return null;

  const showUp = onMoveUp && !task.isLocked;
  const showDown = onMoveDown && !task.isLocked;
  const showLeft = !!onMoveToBacklog;
  const showRight = !!onMoveToNextDay;
  const showCenter = !!onStartTask;

  return (
    <div className="flex flex-wrap gap-1.5 max-w-[130px] sm:max-w-[160px] md:max-w-[200px] justify-end items-center" onClick={(e) => e.stopPropagation()}>
      {/* Start Focus / Reset Action */}
      {showCenter && (
        <button 
          onClick={(e) => { e.stopPropagation(); onStartTask(task); }} 
          className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border ${
            task.isInProgress 
              ? "bg-sky-500 border-sky-400 text-white animate-pulse shadow-[0_0_12px_rgba(14,165,233,0.3)]" 
              : "bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white hover:shadow-md"
          }`}
          title={task.isInProgress ? "Pause" : "Start now"}
        >
          {task.isInProgress ? "Reset" : "Start"}
        </button>
      )}

      {/* Up Priority */}
      {showUp && (
        <button 
          onClick={(e) => { e.stopPropagation(); onMoveUp(task); }} 
          className="p-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center shrink-0"
          title="Move Priority Up"
        >
          <ChevronUp size={11} strokeWidth={3} />
        </button>
      )}

      {/* Down Priority */}
      {showDown && (
        <button 
          onClick={(e) => { e.stopPropagation(); onMoveDown(task); }} 
          className="p-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center shrink-0"
          title="Move Priority Down"
        >
          <ChevronDown size={11} strokeWidth={3} />
        </button>
      )}

      {/* Move to Backlog */}
      {showLeft && (
        <button 
          onClick={(e) => { e.stopPropagation(); onMoveToBacklog(task); }} 
          className="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-amber-500 hover:text-amber-450 transition-all"
          title="Send to Backlog"
        >
          Backlog
        </button>
      )}

      {/* Move to Next Day */}
      {showRight && (
        <button 
          onClick={(e) => { e.stopPropagation(); onMoveToNextDay(task); }} 
          className="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-sky-400 hover:text-sky-355 transition-all"
          title="Send to Next Day"
        >
          Tomorrow
        </button>
      )}
    </div>
  );
};

// ============================================
// NATURAL LANGUAGE TASK PARSING SYSTEM
// ============================================

export const parseNaturalLanguageTask = (text: string, existingCollaborators: string[] = [], baseDate?: string) => {
  let location = "";
  let attendees = "";
  let duration = "";
  let timeStr = "";
  let isLocked = false;
  let category = "";
  let collaborator = "";
  let taskDate = "";

  let currentText = text;

  // parse baseDate for relative date keywords
  let referenceDate = new Date();
  if (baseDate) {
    const parts = baseDate.split("-").map(Number);
    if (parts.length === 3) {
      referenceDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }

  const formatDateLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const getNextAvailableWeekday = (ref: Date, targetDayIndex: number): Date => {
    const date = new Date(ref);
    for (let i = 1; i <= 7; i++) {
      const nextDate = addDays(date, i);
      if (nextDate.getDay() === targetDayIndex) {
        return nextDate;
      }
    }
    return date;
  };

  const weekdayMap: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };

  // Parse relative date designate on e.g. "on Sunday", "on today", "on tomorrow", "on this weekend", "on next week"
  const onDateRegex = /\bon\s+(today|tomorrow|this\s+weekend|next\s+week|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i;
  const onDateMatch = currentText.match(onDateRegex);
  if (onDateMatch) {
    const keyword = onDateMatch[1].toLowerCase().replace(/\s+/g, " ");
    let computedDateObj = referenceDate;
    if (keyword === "today") {
      computedDateObj = referenceDate;
    } else if (keyword === "tomorrow") {
      computedDateObj = addDays(referenceDate, 1);
    } else if (keyword === "this weekend") {
      computedDateObj = getNextAvailableWeekday(referenceDate, 6); // next Saturday available
    } else if (keyword === "next week") {
      computedDateObj = getNextAvailableWeekday(referenceDate, 1); // coming Monday
    } else if (weekdayMap[keyword] !== undefined) {
      computedDateObj = getNextAvailableWeekday(referenceDate, weekdayMap[keyword]);
    }
    taskDate = formatDateLocal(computedDateObj);
    currentText = currentText.replace(onDateMatch[0], "");
  }

  // 1. Parse start time: e.g. "2:00 pm" or "2pm"
  const timeRegex = /\b(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i;
  const timeMatch = currentText.match(timeRegex);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3].toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    isLocked = true; // start time specified creates an appointment
    // Replace the matched time snippet from the working text
    currentText = currentText.replace(timeMatch[0], "");
  }

  // 2. Parse duration: e.g. "60 min" or "60 minutes"
  const durationRegex = /\b(\d+)\s*(mins?|minutes?|min)\b/i;
  const durationMatch = currentText.match(durationRegex);
  if (durationMatch) {
    const minsNum = parseInt(durationMatch[1], 10);
    duration = `${minsNum} min`;
    currentText = currentText.replace(durationMatch[0], "");
  }

  // 3. Segment parsing for 'at', 'with', 'for'
  const findKeywordIndices = (str: string) => {
    const keywords = [
      { type: 'at', regex: /\bat\b/i },
      { type: 'with', regex: /\bwith\b/i },
      { type: 'for', regex: /\bfor\b/i }
    ];
    let found = [];
    for (const kw of keywords) {
      const match = str.match(kw.regex);
      if (match && match.index !== undefined) {
        found.push({ type: kw.type, index: match.index, length: match[0].length });
      }
    }
    return found.sort((a, b) => a.index - b.index);
  };

  let kws = findKeywordIndices(currentText);
  if (kws.length > 0) {
    const mainTitle = currentText.slice(0, kws[0].index).trim();
    
    for (let i = 0; i < kws.length; i++) {
      const curr = kws[i];
      const nextIndex = (i + 1 < kws.length) ? kws[i+1].index : currentText.length;
      const val = currentText.slice(curr.index + curr.length, nextIndex).trim();
      
      if (curr.type === 'at') {
        location = val;
      } else if (curr.type === 'with') {
        const trimmedVal = val.trim();
        const matched = existingCollaborators.find(c => 
          trimmedVal.toLowerCase() === c.toLowerCase() ||
          trimmedVal.toLowerCase().startsWith(c.toLowerCase()) || 
          c.toLowerCase().startsWith(trimmedVal.toLowerCase())
        );
        if (matched) {
          collaborator = matched;
        } else {
          collaborator = trimmedVal;
        }
        attendees = ""; // do not add as an attendee
      } else if (curr.type === 'for') {
        category = val;
      }
    }
    currentText = mainTitle;
  }

  // Clean title: reduce spacing / cleanup commas at ends
  const cleanTitle = currentText
    .replace(/\s+/g, " ")
    .replace(/,\s*$/, "")
    .trim();

  return {
    title: cleanTitle,
    time: timeStr,
    duration,
    isLocked,
    location,
    attendees,
    category,
    collaborator,
    date: taskDate || undefined
  };
};

export const getDefaultSeeds = (uid: string, tdStr: string): Task[] => {
  return [];
};

export const MeditatingIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="5.5" r="2" />
    <path d="M12 7.5v6" />
    <path d="M12 8.5c-1.5 0-3 1.5-4 2.5c-0.8 0.8-1 1.5-0.5 2c0.5 0.5 1.2 0.2 2-0.5c1-1 2-2.5 2.5-3" />
    <path d="M12 8.5c1.5 0 3 1.5 4 2.5c0.8 0.8 1 1.5 0.5 2c-0.5 0.5-1.2 0.2-2-0.5c-1-1-2-2.5-2.5-3" />
    <path d="M8 13.5c-1.5 0.5-3 1.5-4 2.5c-0.6 0.6-0.5 1.5 0.5 1.5c2 0 5-0.5 7.5-1c1.5-0.3 2-0.7 2-1" />
    <path d="M16 13.5c1.5 0.5 3 1.5 4 2.5c0.6 0.6 0.5 1.5-0.5 1.5c-2 0-5-0.5-7.5-1c-1.5-0.3-2-0.7-2-1" />
    <path d="M8 3.5a4.5 4.5 0 0 1 8 0" className="opacity-40 animate-pulse" />
  </svg>
);

// Static data recalibrationSchedule and DEFAULT_BURNOUT_PLAN are imported from RecalibrationData.ts

export const recalibrationCategoryColors: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  mindset: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500", glow: "shadow-[0_0_15px_rgba(16,185,129,0.25)]" },
  purpose: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400", glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]" },
  triathlon: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-500", glow: "shadow-[0_0_15px_rgba(59,130,246,0.25)]" },
  recovery: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", dot: "bg-purple-500", glow: "shadow-[0_0_15px_rgba(168,85,247,0.25)]" },
  founder: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", dot: "bg-rose-500", glow: "shadow-[0_0_15px_rgba(244,63,94,0.25)]" },
  work: { bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400", dot: "bg-slate-400", glow: "shadow-[0_0_15px_rgba(148,163,184,0.25)]" }
};

export const recalibrationWeeklyFocus = [
  { week: "Weeks 1-2", label: "STABILIZE", color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/5", desc: "Focus on sleep, morning hydration, and walking. Establish baseline calm." },
  { week: "Weeks 3-4", label: "ESTABLISH", color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/5", desc: "Lock in 5:30 PM hard stops and morning deep hour." },
  { week: "Months 2-3", label: "BUILD", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5", desc: "Zone 2 training compounds. Clear space for robust app builds." },
  { week: "Months 4-6", label: "MOMENTUM", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5", desc: "App reaches release stages. Shift to sustainable pace." },
  { week: "Months 7-8", label: "ARRIVE", color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/5", desc: "Triathlon race execution and product launch." }
];

export const getDayOfWeek = (dateStr: string) => {
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

export interface ProspectiveCascadeResult {
  prospectiveStartMins: number;
  prospectiveTimeStr: string;
  top: number;
  height: number;
  isDisplaced: boolean;
}

export const computeProspectiveCascadeMap = (
  draggedTaskId: string,
  prospectiveTimeStr: string,
  selectedDate: string,
  tasks: Task[],
  timelineHours: number = 24,
  HOUR_HEIGHT: number = 100
): Record<string, ProspectiveCascadeResult> => {
  const targetTask = tasks.find(t => t.id === draggedTaskId);
  if (!targetTask) return {};

  const isSequence = !!(targetTask.groupId && !targetTask.isUnlinked);
  const seqTasks = isSequence
    ? tasks.filter(t => t.groupId === targetTask.groupId && !t.isUnlinked && t.date === selectedDate)
    : [targetTask];

  const seqTaskIds = new Set(seqTasks.map(t => t.id));

  const oldStart = timeToMinutes(targetTask.computedTime || targetTask.time || "00:00");
  const newStart = timeToMinutes(prospectiveTimeStr);
  const diffMin = newStart - oldStart;

  const seqLockedTasks = seqTasks.filter(t => t.isLocked);
  const seqFlexibleTasks = seqTasks.filter(t => !t.isLocked);

  const otherTasks = tasks.filter(t => 
    t.date === selectedDate && 
    !t.completed && 
    !seqTaskIds.has(t.id)
  );

  const otherLockedTasks = otherTasks.filter(t => t.isLocked);
  const otherFlexibleTasks = otherTasks.filter(t => !t.isLocked);

  const placed: { [id: string]: { start: number; end: number; time: string } } = {};

  // 1. Immovable locked tasks
  otherLockedTasks.forEach(t => {
    const tStart = timeToMinutes(t.time || t.computedTime || "00:00");
    const tDur = parseDurationToMinutes(t.duration) || 30;
    const tBefore = t.travelBefore || 0;
    const tAfter = t.travelAfter || 0;
    placed[t.id] = {
      start: tStart - tBefore,
      end: tStart + tDur + tAfter,
      time: minutesToTimeString(tStart)
    };
  });

  // 2. Dragged sequence locked tasks
  seqLockedTasks.forEach(t => {
    let tStart = timeToMinutes(t.time || "00:00");
    tStart = isSequence ? tStart + diffMin : newStart;
    tStart = Math.max(0, Math.min(timelineHours * 60 - 5, tStart));
    const tDur = parseDurationToMinutes(t.duration) || 30;
    const tBefore = t.travelBefore || 0;
    const tAfter = t.travelAfter || 0;
    placed[t.id] = {
      start: tStart - tBefore,
      end: tStart + tDur + tAfter,
      time: minutesToTimeString(tStart)
    };
  });

  // 3. Collect flexible tasks to place
  const flexibleTasksToPlace: { task: Task; intendedStart: number }[] = [];

  seqFlexibleTasks.forEach(t => {
    let tIntended = timeToMinutes(t.time || "00:00");
    tIntended = isSequence ? tIntended + diffMin : newStart;
    tIntended = Math.max(0, Math.min(timelineHours * 60 - 5, tIntended));
    flexibleTasksToPlace.push({ task: t, intendedStart: tIntended });
  });

  otherFlexibleTasks.forEach(t => {
    const tIntended = timeToMinutes(t.time || t.computedTime || "00:00");
    flexibleTasksToPlace.push({ task: t, intendedStart: tIntended });
  });

  flexibleTasksToPlace.sort((a, b) => a.intendedStart - b.intendedStart);

  flexibleTasksToPlace.forEach(({ task: t, intendedStart }) => {
    let tStart = intendedStart;
    const tDur = parseDurationToMinutes(t.duration) || 30;
    const tBefore = t.travelBefore || 0;
    const tAfter = t.travelAfter || 0;

    let tSpanStart = tStart - tBefore;
    let tSpanEnd = tStart + tDur + tAfter;

    let stable = false;
    let loops = 0;
    while (!stable && loops < 200) {
      loops++;
      let conflictEnd = -1;
      for (const pid in placed) {
        const p = placed[pid];
        if (tSpanStart < p.end && tSpanEnd > p.start) {
          if (p.end > conflictEnd) {
            conflictEnd = p.end;
          }
        }
      }
      if (conflictEnd > -1) {
        tStart = conflictEnd + tBefore;
        tSpanStart = tStart - tBefore;
        tSpanEnd = tStart + tDur + tAfter;
      } else {
        stable = true;
      }
    }

    placed[t.id] = {
      start: tSpanStart,
      end: tSpanEnd,
      time: minutesToTimeString(tStart)
    };
  });

  const resultMap: Record<string, ProspectiveCascadeResult> = {};
  tasks.forEach(t => {
    if (t.date === selectedDate && !t.completed && placed[t.id]) {
      const origMins = timeToMinutes(t.computedTime || t.time || "00:00");
      const prospectiveStartMins = placed[t.id].start;
      const prospectiveTimeStr = placed[t.id].time;
      const dur = parseDurationToMinutes(t.duration) || 30;
      const top = (prospectiveStartMins / 60) * HOUR_HEIGHT;
      const height = Math.max((dur / 60) * HOUR_HEIGHT, 65);
      const isDisplaced = prospectiveStartMins !== origMins && t.id !== draggedTaskId;

      resultMap[t.id] = {
        prospectiveStartMins,
        prospectiveTimeStr,
        top,
        height,
        isDisplaced
      };
    }
  });

  return resultMap;
};