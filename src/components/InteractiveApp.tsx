
// RE-EXPORTS FOR TESTS
export {
  buildNarrativeText,
  scheduleDynamicTasks,
  timeToMinutes,
  minutesToTimeString,
  parseDurationToMinutes,
  formatDuration,
  formatTime,
  getPriorityWeight
} from "./InteractiveAppHelpers";

import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition, memo } from "react";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  Auth,
  User as FirebaseUser
} from "firebase/auth";
import {
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  collection, 
  onSnapshot,
  getDocFromServer,
  getDoc,
  Firestore,
  query,
  where,
  or
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import {
  Sparkles, BookOpen, Calendar, Clock, Users, Trash2, Edit3, Plus, X, Check, Copy,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Zap, RotateCcw, RotateCw, Undo, Coffee, Car, Mic, MicOff, Hourglass, Volume2, VolumeX,
  Save, Maximize2, Minimize2, Menu, Sun, Moon, MapPin, Navigation, Search, Loader2, Play, Pause, Square, SkipForward,
  ArrowUpRight, Phone, Send, ShoppingBag, Link as LinkIcon, Unlink, ExternalLink,
  Globe, FileText, FilePlus, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, CheckCircle2, Circle,
  AlertCircle, Camera, CheckSquare, Trash, Download, Upload, RefreshCw,
  Lock, Unlock, Flag, Settings, CalendarPlus, CalendarRange, Eye, EyeOff, Mail, Key, GripVertical, Layout,
  Cloud, CloudSun, User, SlidersHorizontal, Sliders, FolderClosed, Tag, ListTodo, Archive, AlertTriangle, Palette, LayoutList,
  History, UserPlus, Settings2, Coins, Database, ListOrdered, Terminal, BarChart3, Triangle, Store, ZoomIn, ZoomOut, Star,
  Brain, Activity, Dna, ShieldCheck, Layers, Utensils, FileCode, Target, HelpCircle
} from "lucide-react";
import { Task, Routine, Transfer, Wallet, AppContact, Interaction } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TaskSolutionView } from "./TaskSolutionView";
import { recalibrationSchedule, DEFAULT_BURNOUT_PLAN } from "./RecalibrationData";
import { DeveloperHub } from "./DeveloperHub";
import { AdminPortal } from "./admin/AdminPortal";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import firebaseConfig from "../../firebase-applet-config.json";
import { jsPDF } from "jspdf";
import { FastInput, FastTextarea } from "./FastInput";
import { gcalFetchQueue } from "../utils/gcalClient";
import { ManageSpendingVendorsModal } from "./modals/ManageSpendingVendorsModal";
import { ManageSpendingCategoriesModal } from "./modals/ManageSpendingCategoriesModal";
import { ManageCategoriesModal } from "./modals/ManageCategoriesModal";
import { 
  TimePickBoxTrigger, 
  DurationPickBoxTrigger, 
  TimePickBoxModal, 
  DurationPickBoxModal,
  DURATION_HOURS_0_TO_23,
  FIVE_MIN_INCREMENTS,
  QUARTER_MINUTES
} from "./TimePickBox";
import { ManageCollaboratorsModal } from "./modals/ManageCollaboratorsModal";
import { ManageFlexActivitiesModal } from "./modals/ManageFlexActivitiesModal";
import { BufferCustomizerDrawer } from "./modals/BufferCustomizerDrawer";
import { FlexTaskEditModal } from "./modals/FlexTaskEditModal";
import { SaveSequenceTemplateModal } from "./modals/SaveSequenceTemplateModal";
import { GoogleCalendarSyncModal } from "./modals/GoogleCalendarSyncModal";
import { PriorityBottomSheet } from "./modals/PriorityBottomSheet";
import { FocusDurationPickerSheet } from "./modals/FocusDurationPickerSheet";
import { GlobalDeleteConfirmModal } from "./modals/GlobalDeleteConfirmModal";
import { RecurringEditModal } from "./modals/RecurringEditModal";
import { DiagnosticsConsoleModal } from "./modals/DiagnosticsConsoleModal";
import { ConflictResolutionModal } from "./modals/ConflictResolutionModal";
import { FocusBufferDurationRow } from "./focus/FocusBufferDurationRow";
import { BufferDurationCluster } from "./BufferDurationCluster";
import { CondensedBufferRow } from "./CondensedBufferRow";

export interface GeneratedPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: number;
  blocks: Array<{
    time: string;
    label: string;
    icon: string;
    duration: string;
    category: string;
    title: string;
    description: string;
    why: string;
    baseChecks: string[];
    triathlete?: boolean;
    founder?: boolean;
    recovery?: boolean;
  }>;
}

// ============================================
// FIREBASE CONFIG & LAZY INIT
// ============================================
import { app as defaultApp, auth as defaultAuth, db as defaultDb, storage as defaultStorage } from "../firebase";

let app: FirebaseApp | undefined = defaultApp;
let auth: Auth | undefined = defaultAuth;
let db: Firestore | undefined = defaultDb;
let storage: any = defaultStorage;
const appId = "taskpass-v10";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

let onSyncError: ((source: string, error: string, reason?: string, suggestions?: string[]) => void) | null = null;

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (onSyncError) {
    onSyncError("Cloud Database Sync", errMsg);
  }

  throw new Error(JSON.stringify(errInfo));
}

function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(cleanForFirestore) as any;
  }
  if (typeof data === "object") {
    const proto = Object.getPrototypeOf(data);
    if (proto === null || proto === Object.prototype) {
      const copy: any = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const val = data[key];
          if (val !== undefined) {
            copy[key] = cleanForFirestore(val);
          }
        }
      }
      return copy;
    }
  }
  return data;
}

// ============================================
// SYSTEM PROXY SERVICES (GEMINI AI API)
// ============================================




import {
  callGeminiProxy,
  callGeminiLocation,
  getPasswordStrength,
  getGoogleMapsDirectionsUrl,
  openGoogleMapsNavigation,
  estimateTravelDuration,
  getDynamicTitleClass,
  buildNarrativeText,
  formatTitleWithPrepositions,
  estimateTextWidth,
  getDynamicSelectWidth,
  getDynamicDurationWidth,
  getDynamicLocationWidth,
  parseNaturalLanguageTask,
  Modal,
  getDefaultSeeds,
  MeditatingIcon,
  DurationCycleInput,
  RepeatCycleInput,
  recalibrationCategoryColors,
  recalibrationWeeklyFocus,
  calculateGreedyCascadeSchedule
} from "./InteractiveAppHelpers";

import { SettingsDrawer } from "./SettingsDrawer";
import { GearDropdownMenu } from "./GearDropdownMenu";
import { NarrativeTaskForm } from "./NarrativeTaskForm";
import { TimelineGridView } from "./templates/TimelineGridView";
import { HorizontalTimelineView } from "./templates/HorizontalTimelineView";

import {
  getLocalDateString,
  formatDate,
  formatTime,
  timeToMinutes,
  minutesToTimeString,
  parseDurationToMinutes,
  formatDuration,
  formatFreeTimeInHoursMins,
  getPriorityWeight,
  buildTaskNarrativeText,
  scheduleDynamicTasks,
  findAlternativeTimes,
  getDayOfWeek,
  matchesRecurrencePattern,
  deduplicateTasks,
  normalizeTitleForDedup,
  normalizeTimeStringForDedup,
  getNextDateString
} from "../utils/timeHelpers";

import {
  exportBackupJSON,
  parseBackupJSON,
  exportNotesPDF,
  exportWorkspacePDF,
  exportAIPlanPDF
} from "../utils/fileSystem";
import {
  generateComprehensiveAIPlan,
  getSampleAIPlans,
  AIPlanGeneratedResult,
  SavedAIPlan,
  ScienceTask
} from "../utils/aiPlanGenerator";


// ============================================
// INTERACTIVE AI NARRATIVE BANNER COMPONENT
// ============================================

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
  const title = rawTitle.replace(/\[Data\s*type[^\]]*\]/gi, "").replace(/\[Data[^\]]*\]/gi, "").replace(/\[type:[^\]]*\]/gi, "").replace(/\[[^\]]*\]/g, "").trim() || "Untitled Task";
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
  const location = locationRaw.replace(/\[Data\s*type[^\]]*\]/gi, "").replace(/\[Data[^\]]*\]/gi, "").replace(/\[type:[^\]]*\]/gi, "").replace(/\[[^\]]*\]/g, "").trim();

  const collabRaw = currentFocusTarget ? (currentFocusTarget.attendees || currentFocusTarget.collaborator || "") : (taskCollaborator || "");
  const collaborator = collabRaw.replace(/\[Data\s*type[^\]]*\]/gi, "").replace(/\[Data[^\]]*\]/gi, "").replace(/\[type:[^\]]*\]/gi, "").replace(/\[[^\]]*\]/g, "").trim();

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
            {title}
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

export default function InteractiveApp({ darkMode = true, setDarkMode }: { darkMode?: boolean; setDarkMode?: (val: boolean) => void } = {}) {
  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    if (parts.length <= 1) {
      return text;
    }
    return (
      <>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            let href = part;
            if (part.toLowerCase().startsWith("www.")) {
              href = "https://" + part;
            }
            return (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="text-indigo-400 hover:text-indigo-300 underline font-semibold break-all inline-flex items-center gap-0.5 cursor-pointer"
              >
                {part}
                <ExternalLink size={10} className="inline shrink-0 text-indigo-400" />
              </a>
            );
          }
          return part;
        })}
      </>
    );
  };

  const draggedTaskId = useAppStore((state) => state.draggedTaskId);
  const setDraggedTaskId = useAppStore((state) => state.setDraggedTaskId);
  const dragOverTime = useAppStore((state) => state.dragOverTime);
  const setDragOverTime = useAppStore((state) => state.setDragOverTime);
  const timelineDragId = useAppStore((state) => state.timelineDragId);
  const setTimelineDragId = useAppStore((state) => state.setTimelineDragId);
  const setTimelinePendingDragTaskId = useAppStore((state) => state.setTimelinePendingDragTaskId);
  const timelineDragY = useAppStore((state) => state.timelineDragY);
  const setTimelineDragY = useAppStore((state) => state.setTimelineDragY);
  const timelineDragX = useAppStore((state) => state.timelineDragX);
  const setTimelineDragX = useAppStore((state) => state.setTimelineDragX);
  const timelineDragOffset = useAppStore((state) => state.timelineDragOffset);
  const setTimelineDragOffset = useAppStore((state) => state.setTimelineDragOffset);
  const timelineDragWidth = useAppStore((state) => state.timelineDragWidth);
  const setTimelineDragWidth = useAppStore((state) => state.setTimelineDragWidth);
  const timelineDragLeft = useAppStore((state) => state.timelineDragLeft);
  const setTimelineDragLeft = useAppStore((state) => state.setTimelineDragLeft);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const deckTab = useAppStore((state) => state.deckTab);
  const setDeckTab = useAppStore((state) => state.setDeckTab);
  const deckSearchQuery = useAppStore((state) => state.deckSearchQuery);
  const setDeckSearchQuery = useAppStore((state) => state.setDeckSearchQuery);
  const activeTemplateId = useAppStore((state) => state.activeTemplateId);
  const activeConfig = useAppStore((state) => state.activeConfig);
  const dragLongPressMs = useAppStore((state) => state.dragLongPressMs);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? window.navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  const tasks = useAppStore((state) => state.tasks);
  const setTasks = useAppStore((state) => state.setTasks);
  const timelineColumns = useAppStore((state) => state.timelineColumns);

  // Gemini Chatbot state variables
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotMessages, setChatbotMessages] = useState<Array<{
    id: string;
    role: "user" | "model";
    text: string;
    timestamp: Date;
    actionsExecuted?: string[];
    suggestions?: Array<{
      type: "collaborator" | "location";
      value: string;
      originalQuery?: string;
    }>;
  }>>(() => {
    return [
      {
        id: "welcome",
        role: "model",
        text: "Hi! Ask me to analyze your schedule, add tasks, or find conflicts.",
        timestamp: new Date()
      }
    ];
  });
  const [chatbotInput, setChatbotInput] = useState("");
  const [isChatbotLoading, setIsChatbotLoading] = useState(false);

  // Chatbot voice states and functions
  const [isChatbotVoiceListening, setIsChatbotVoiceListening] = useState(false);
  const [chatbotVoiceError, setChatbotVoiceError] = useState("");
  const [chatbotVoiceRecognitionRef, setChatbotVoiceRecognitionRef] = useState<any>(null);

  // Chatbot sliding drawer drag/pull-to-resize state and functions
  const [chatbotHeight, setChatbotHeight] = useState<number>(85); // Height in % of viewport height (vh), starts at 85% to stay fully on-screen
  const [isDraggingChatbot, setIsDraggingChatbot] = useState(false);
  const [chatbotDragMoved, setChatbotDragMoved] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(85);

  const handleChatbotDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsDraggingChatbot(true);
    setChatbotDragMoved(false);
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
    setStartHeight(chatbotHeight);
    
    // Prevent text selection during drag
    document.body.style.userSelect = "none";
  };

  const handleChatbotDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDraggingChatbot) return;
    
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY;
    if (Math.abs(deltaY) > 6) {
      setChatbotDragMoved(true);
    }
    const deltaYPercent = (deltaY / window.innerHeight) * 100;
    
    // pulling down means positive deltaY, which decreases height
    const newHeight = Math.max(20, Math.min(85, startHeight - deltaYPercent));
    setChatbotHeight(newHeight);
  };

  const handleChatbotDragEnd = () => {
    if (!isDraggingChatbot) return;
    setIsDraggingChatbot(false);
    document.body.style.userSelect = "";
    
    // Snap to positions: If they drag down even slightly (below 75%), collapse/close it instantly for a much friendlier, less frustrating experience!
    if (chatbotHeight < 75) {
      setIsChatbotOpen(false);
      setChatbotHeight(85); // Reset height for next open
      stopChatbotVoiceCapture();
      triggerHaptic("medium");
    } else {
      // Snap back to default screen height (85vh)
      setChatbotHeight(85);
      triggerHaptic("light");
    }
  };

  useEffect(() => {
    if (isDraggingChatbot) {
      const onMove = (e: MouseEvent) => handleChatbotDragMove(e);
      const onTouchMove = (e: TouchEvent) => handleChatbotDragMove(e);
      const onEnd = () => handleChatbotDragEnd();

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onEnd);

      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onEnd);
      };
    }
  }, [isDraggingChatbot, startY, startHeight, chatbotHeight]);

  const startChatbotVoiceCapture = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setChatbotVoiceError("Speech recognition is not supported in this browser. You can type your request directly.");
      return;
    }

    setChatbotVoiceError("");
    setIsChatbotVoiceListening(true);

    // Request microphone permission gracefully in iframe context if mediaDevices is available
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr: any) {
        if (permErr?.name === "NotAllowedError" || permErr?.name === "PermissionDeniedError") {
          setChatbotVoiceError("Microphone permission denied. Please allow mic access or type below.");
          setIsChatbotVoiceListening(false);
          return;
        }
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsChatbotVoiceListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const currentText = final || interim;
        setChatbotInput(currentText);
      };

      recognition.onerror = (e: any) => {
        const errCode = e?.error || "unknown";
        if (errCode === "no-speech") {
          setChatbotVoiceError("No voice detected. Speak closer to the microphone or type below.");
        } else if (errCode === "aborted") {
          // User or programmatic stop - benign
        } else if (errCode === "not-allowed" || errCode === "service-not-allowed") {
          setChatbotVoiceError("Microphone permission denied. Please grant microphone access or type below.");
        } else if (errCode === "audio-capture") {
          setChatbotVoiceError("No microphone detected or audio capture is unavailable.");
        } else if (errCode === "network") {
          setChatbotVoiceError("Network issue during voice recognition. You can type directly below.");
        } else {
          setChatbotVoiceError(`Voice recognition note: ${errCode}`);
        }
        console.warn("Chatbot voice recognition notice:", errCode);
        setIsChatbotVoiceListening(false);
      };

      recognition.onend = () => {
        setIsChatbotVoiceListening(false);
      };

      recognition.start();
      setChatbotVoiceRecognitionRef(recognition);
    } catch (err: any) {
      console.warn("Chatbot voice capture notice:", err?.message || err);
      setChatbotVoiceError("Could not start microphone. You can type your request directly below.");
      setIsChatbotVoiceListening(false);
    }
  };

  const stopChatbotVoiceCapture = () => {
    if (chatbotVoiceRecognitionRef) {
      try {
        chatbotVoiceRecognitionRef.stop();
      } catch (e) {
        console.warn("Error stopping chatbot voice recognition:", e);
      }
    }
    setIsChatbotVoiceListening(false);
  };

  useEffect(() => {
    if (!isChatbotOpen) {
      stopChatbotVoiceCapture();
    }
  }, [isChatbotOpen]);

  // Quick Collaborator Interaction Capture States
  const [showCollaboratorQuickSelect, setShowCollaboratorQuickSelect] = useState(false);
  const [selectedCollabForQuickNote, setSelectedCollabForQuickNote] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState("");

  // Favorite Collaborators States
  const [favoriteCollaborators, setFavoriteCollaborators] = useState<string[]>(() => {
    const saved = localStorage.getItem("favorite_collaborators_v1");
    if (saved) return JSON.parse(saved);
    const savedCols = localStorage.getItem("task_collaborators_v1");
    const arr = savedCols ? JSON.parse(savedCols) : ["Sarah", "Alex", "Mom", "John"];
    return arr.slice(0, 6);
  });
  const [isEditingFavorites, setIsEditingFavorites] = useState(false);
  const [showAllCollabsInQuickSelect, setShowAllCollabsInQuickSelect] = useState(false);

  const saveFavoriteCollaborators = (updated: string[]) => {
    setFavoriteCollaborators(updated);
    localStorage.setItem("favorite_collaborators_v1", JSON.stringify(updated));
  };

  const longPressTimerRef = useRef<any>(null);
  const isLongPressActiveRef = useRef(false);

  const startPlusButtonLongPress = () => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      triggerHaptic("heavy");
      setIsEditingFavorites(false);
      setShowAllCollabsInQuickSelect(false);
      setShowCollaboratorQuickSelect(true);
    }, 400); // 400ms for haptic long press for quick interaction
  };

  const cancelPlusButtonLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePlusButtonClick = () => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }
    clearTaskForm();
    setShowAdd(true);
    setFocusFieldName("title");
    triggerHaptic("medium");
  };

  // Helper for "Did you mean..." entity fuzzy matching for collaborators and locations
  const findSimilarEntities = (query: string, choices: string[], type: "collaborator" | "location") => {
    if (!query || !query.trim() || !Array.isArray(choices) || choices.length === 0) return [];
    const qNorm = query.trim().toLowerCase();
    if (choices.some(c => c.toLowerCase() === qNorm)) return [];

    const getLevenshteinDist = (a: string, b: string) => {
      const matrix: number[][] = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    };

    const candidates: { value: string; score: number }[] = [];
    choices.forEach(choice => {
      if (!choice || !choice.trim()) return;
      const cNorm = choice.trim().toLowerCase();
      let score = 0;

      if (cNorm.includes(qNorm) || qNorm.includes(cNorm)) {
        score += 60;
      }
      const qWords = qNorm.split(/[\s,._-]+/).filter(Boolean);
      const cWords = cNorm.split(/[\s,._-]+/).filter(Boolean);
      const commonWords = qWords.filter(w => w.length > 1 && cWords.some(cw => cw.includes(w) || w.includes(cw)));
      if (commonWords.length > 0) {
        score += commonWords.length * 35;
      }
      if (cNorm.startsWith(qNorm) || qNorm.startsWith(cNorm)) {
        score += 30;
      }
      const dist = getLevenshteinDist(qNorm, cNorm);
      const maxLen = Math.max(qNorm.length, cNorm.length);
      if (dist <= 3 && maxLen > 2) {
        score += (1 - dist / maxLen) * 50;
      }

      if (score >= 25) {
        candidates.push({ value: choice, score });
      }
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 4).map(c => ({
      type,
      value: c.value,
      originalQuery: query.trim()
    }));
  };

  const handleSelectChatSuggestion = (suggestion: { type: "collaborator" | "location"; value: string; originalQuery?: string }, msgId?: string) => {
    triggerHaptic("medium");
    const { type, value, originalQuery } = suggestion;

    // 1. Update recent note if applicable
    if (notes && notes.length > 0) {
      let updatedNote = false;
      const updatedNotes = notes.map((n, idx) => {
        if (idx === 0 || (originalQuery && (n.collaborator === originalQuery || n.location === originalQuery))) {
          if (type === "collaborator" && (n.collaborator === originalQuery || n.collaborator === "None" || !n.collaborator || idx === 0)) {
            updatedNote = true;
            return { ...n, collaborator: value };
          }
          if (type === "location" && (n.location === originalQuery || !n.location || idx === 0)) {
            updatedNote = true;
            return { ...n, location: value };
          }
        }
        return n;
      });
      if (updatedNote) {
        saveNotes(updatedNotes);
      }
    }

    // 2. Update task in workspace
    let updatedTask = false;
    const updatedTasks = tasks.map((t, idx) => {
      if (idx === tasks.length - 1 || (originalQuery && (t.collaborator === originalQuery || t.location === originalQuery))) {
        if (type === "collaborator" && (t.collaborator === originalQuery || !t.collaborator || idx === tasks.length - 1)) {
          updatedTask = true;
          return { ...t, collaborator: value };
        }
        if (type === "location" && (t.location === originalQuery || !t.location || idx === tasks.length - 1)) {
          updatedTask = true;
          return { ...t, location: value };
        }
      }
      return t;
    });
    if (updatedTask) {
      saveWorkspace(updatedTasks);
    }

    // 3. Append user confirmation & AI acknowledgment
    const userSelectMsg = {
      id: "user_sel_" + Date.now(),
      role: "user" as const,
      text: "Selected " + (type === "collaborator" ? "collaborator" : "location") + ": \"" + value + "\"",
      timestamp: new Date()
    };

    const modelConfirmMsg = {
      id: "model_conf_" + Date.now(),
      role: "model" as const,
      text: "Got it! Linked " + (type === "collaborator" ? "collaborator" : "location") + " to \"" + value + "\" from your saved pulldown menu choices.",
      timestamp: new Date(),
      actionsExecuted: ["Selected " + type + ": \"" + value + "\""]
    };

    setChatbotMessages(prev => [...prev, userSelectMsg, modelConfirmMsg]);
    showDragToast("Applied \"" + value + "\" (" + type + ")", "success");
  };

  const handleSendChatbotMessage = async (textToSend?: string) => {
    // Clean up/turn off microphone capture when sending messages
    stopChatbotVoiceCapture();

    const rawMsg = textToSend !== undefined ? textToSend : chatbotInput;
    const msgText = rawMsg.trim();
    if (!msgText) return;

    const userMsg = {
      id: "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      role: "user" as const,
      text: msgText,
      timestamp: new Date()
    };

    setChatbotMessages(prev => [...prev, userMsg]);
    if (textToSend === undefined) {
      setChatbotInput("");
    }
    setIsChatbotLoading(true);

    // Check if prompt starts with "Make note of" in any form
    const makeNoteMatch = msgText.match(/^\s*(?:please\s+|can\s+you\s+)?make\s+(?:a\s+)?notes?(?:\s+of|\s+that|\s+about|:)?\s+([\s\S]+)$/i);
    let clientCreatedNote: any = null;

    if (makeNoteMatch) {
      const noteBody = makeNoteMatch[1].trim();
      if (noteBody) {
        // Parse collaborators, locations, vendors, projects, time from note body
        let extractedCollab = "";
        let extractedLocation = "";
        let extractedVendor = "";
        let extractedProject = "General";
        let extractedTime = "";

        // 1. Explicit labeled fields
        const cMatch = noteBody.match(/(?:collaborator|collab|contact|attendee|person)s?:\s*([^,;\n]+)/i);
        if (cMatch) extractedCollab = cMatch[1].trim();

        const lMatch = noteBody.match(/(?:location|venue|place|room):\s*([^,;\n]+)/i);
        if (lMatch) extractedLocation = lMatch[1].trim();

        const vMatch = noteBody.match(/(?:vendor|merchant|store|shop):\s*([^,;\n]+)/i);
        if (vMatch) extractedVendor = vMatch[1].trim();

        const pMatch = noteBody.match(/(?:project|category):\s*([^,;\n]+)/i);
        if (pMatch) extractedProject = pMatch[1].trim();

        const tMatch = noteBody.match(/(?:time|date):\s*([^,;\n]+)/i);
        if (tMatch) extractedTime = tMatch[1].trim();

        // 2. Collaborators match from registered or natural syntax ("with [Name]")
        if (!extractedCollab) {
          for (const c of (collaborators || [])) {
            if (c && new RegExp("\\b" + c.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "i").test(noteBody)) {
              extractedCollab = c;
              break;
            }
          }
          if (!extractedCollab) {
            const naturalCollab = noteBody.match(/\bwith\s+([A-Z][a-zA-Z0-9_\s]{1,25})(?=\s+(?:at|in|on|about|for|from|regarding|to|by|tomorrow|today|yesterday)|$|[,\.])/i);
            if (naturalCollab) extractedCollab = naturalCollab[1].trim();
          }
        }

        // 3. Location match from registered or natural syntax ("at [Location]", "in [Location]")
        if (!extractedLocation) {
          for (const loc of (favoriteLocations || [])) {
            if (loc && new RegExp("\\b" + loc.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "i").test(noteBody)) {
              extractedLocation = loc;
              break;
            }
          }
          if (!extractedLocation) {
            const naturalLoc = noteBody.match(/\b(?:at|in|on)\s+([A-Z0-9][a-zA-Z0-9_\s]{1,30})(?=\s+(?:with|about|for|from|regarding|to|by|tomorrow|today|yesterday)|$|[,\.])/i);
            if (naturalLoc) {
              const candidate = naturalLoc[1].trim();
              if (!/^(?:[0-9]|am|pm|the\s+morning|the\s+afternoon|the\s+evening|noon|midnight)/i.test(candidate)) {
                extractedLocation = candidate;
              }
            }
          }
        }

        // 4. Vendor match from registered
        if (!extractedVendor) {
          for (const v of (spendingVendors || [])) {
            if (v && new RegExp("\\b" + v.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "i").test(noteBody)) {
              extractedVendor = v;
              break;
            }
          }
        }

        // 5. Time extraction
        if (!extractedTime) {
          const naturalTime = noteBody.match(/\b(?:at\s+)?([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?|\bnoon\b|\bmidnight\b)/i);
          if (naturalTime) extractedTime = naturalTime[1].trim();
        }

        // 6. Title formulation
        let cleanTitle = noteBody.replace(/(?:collaborator|collab|location|venue|vendor|project|category|time|date):\s*[^,;\n]+/gi, "").trim();
        if (cleanTitle.length > 50) cleanTitle = cleanTitle.substring(0, 47) + "...";
        if (!cleanTitle) cleanTitle = "Chatbot Note";

        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const timestamp = "[" + dateStr + " " + timeStr + "] ";

        clientCreatedNote = {
          id: "note_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          rawText: timestamp + noteBody,
          title: cleanTitle.startsWith("Log:") ? cleanTitle : "Log: " + cleanTitle,
          project: extractedProject || "General",
          collaborator: extractedCollab || "None",
          location: extractedLocation || "",
          vendor: extractedVendor || "",
          time: extractedTime || "",
          associatedTaskId: "",
          associatedRoutineId: "",
          createdAt: Date.now()
        };

        // Add to Notes depository and persist
        const updatedNotesList = [clientCreatedNote, ...notes];
        saveNotes(updatedNotesList);

        // Auto-register any new collaborator, location, or vendor in Data Warehouse Directory
        if (clientCreatedNote.collaborator && clientCreatedNote.collaborator !== "None") {
          const collabs = clientCreatedNote.collaborator.split(",").map((c: string) => c.trim()).filter(Boolean);
          collabs.forEach((c: string) => {
            if (typeof handleAddNewCollaborator === "function" && !collaborators.includes(c)) {
              handleAddNewCollaborator(c);
            }
            const noteKey = "collaborator:" + c;
            if (!entityNotes[noteKey]) {
              saveEntityNotes({ ...entityNotes, [noteKey]: clientCreatedNote.rawText });
            }
          });
        }

        if (clientCreatedNote.location && clientCreatedNote.location.trim()) {
          const loc = clientCreatedNote.location.trim();
          if (typeof handleAddLocation === "function" && !favoriteLocations.includes(loc)) {
            handleAddLocation(loc);
          }
          const noteKey = "location:" + loc;
          if (!entityNotes[noteKey]) {
            saveEntityNotes({ ...entityNotes, [noteKey]: clientCreatedNote.rawText });
          }
        }

        if (clientCreatedNote.vendor && clientCreatedNote.vendor.trim()) {
          const ven = clientCreatedNote.vendor.trim();
          if (typeof handleAddSpendingVendor === "function" && !spendingVendors.includes(ven)) {
            handleAddSpendingVendor(ven);
          }
          const noteKey = "vendor:" + ven;
          if (!entityNotes[noteKey]) {
            saveEntityNotes({ ...entityNotes, [noteKey]: clientCreatedNote.rawText });
          }
        }

        triggerHaptic("medium");
        showDragToast("Added note \"" + clientCreatedNote.title + "\" to Notes Depository in Data Warehouse", "success");
      }
    }

    try {
      // Build chat history for API payload
      const historyPayload = [...chatbotMessages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      // Current local HH:MM
      const now = new Date();
      const currentHrs = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const timeStr = currentHrs + ":" + currentMins;

      const res = await fetch("/api/calendar-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          tasks,
          notes,
          collaborators,
          favoriteLocations,
          currentDate: selectedDate,
          currentTime: timeStr
        })
      });

      if (!res.ok) {
        throw new Error("Failed to communicate with Scheduler Gemini server.");
      }

      const json = await res.json();
      if (json && json.success && json.data) {
        const { text, actions } = json.data;
        const actionsExecuted: string[] = [];
        let updatedTasks = [...tasks];
        let hasChanges = false;

        if (clientCreatedNote) {
          actionsExecuted.push("Added note \"" + clientCreatedNote.title + "\" to Data Warehouse");
        }

        if (Array.isArray(actions) && actions.length > 0) {
          // Helper for 100% deterministic task matching by ID, exact title, or unquoted title
          const resolveTaskIdx = (act: any, taskList: Task[]): number => {
            if (act.id) {
              const directIdx = taskList.findIndex(t => t.id === act.id);
              if (directIdx !== -1) return directIdx;
            }
            const targetTitle = (act.targetTaskTitle || act.taskTitle || act.title || act.updates?.title || act.id || "").trim().toLowerCase();
            if (!targetTitle) return -1;

            // 1. Exact title match (case-insensitive)
            const exactIdx = taskList.findIndex(t => t.title.trim().toLowerCase() === targetTitle);
            if (exactIdx !== -1) return exactIdx;

            // 2. Exact match ignoring surrounding quotes
            const unquoted = targetTitle.replace(/^["']|["']$/g, "").trim();
            if (unquoted) {
              const unquotedIdx = taskList.findIndex(t => t.title.trim().toLowerCase() === unquoted);
              if (unquotedIdx !== -1) return unquotedIdx;
            }

            // 3. Substring matching (case-insensitive)
            const subIdx = taskList.findIndex(t => {
              const tLower = t.title.trim().toLowerCase();
              return tLower.includes(targetTitle) || (unquoted && tLower.includes(unquoted)) || targetTitle.includes(tLower);
            });
            return subIdx;
          };

          actions.forEach(act => {
            if (act.type === "ADD_NOTE" && act.note) {
              const noteData = act.note;
              if (clientCreatedNote) {
                // Refine fields if AI provided richer extractions
                const refinedNote = {
                  ...clientCreatedNote,
                  title: noteData.title ? (noteData.title.startsWith("Log:") ? noteData.title : "Log: " + noteData.title) : clientCreatedNote.title,
                  collaborator: (noteData.collaborator && noteData.collaborator !== "None") ? noteData.collaborator : clientCreatedNote.collaborator,
                  location: noteData.location || clientCreatedNote.location,
                  vendor: noteData.vendor || clientCreatedNote.vendor,
                  project: noteData.project || clientCreatedNote.project,
                  time: noteData.time || clientCreatedNote.time,
                  associatedTaskId: noteData.associatedTaskId || clientCreatedNote.associatedTaskId
                };
                const updatedNotesList = notes.map(n => n.id === clientCreatedNote.id ? refinedNote : n);
                saveNotes(updatedNotesList);
              } else {
                const now = new Date();
                const dateStr = now.toLocaleDateString();
                const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                const timestamp = "[" + dateStr + " " + timeStr + "] ";
                const rawContent = (noteData.rawText || noteData.text || noteData.title || "").trim();
                const noteTitle = (noteData.title || (rawContent ? rawContent.substring(0, 40) : "Note")).trim();

                const newNote = {
                  id: "note_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                  rawText: rawContent.startsWith("[") ? rawContent : timestamp + rawContent,
                  title: noteTitle.startsWith("Log:") ? noteTitle : "Log: " + noteTitle,
                  project: noteData.project || "General",
                  collaborator: noteData.collaborator || "None",
                  location: noteData.location || "",
                  vendor: noteData.vendor || "",
                  time: noteData.time || "",
                  associatedTaskId: noteData.associatedTaskId || "",
                  associatedRoutineId: "",
                  createdAt: Date.now()
                };
                saveNotes([newNote, ...notes]);
                actionsExecuted.push("Added note \"" + newNote.title + "\" to Data Warehouse");
              }
            } else if (act.type === "ADD_TASK" && act.task) {
              let cleanTitle = (act.task.title || "Untitled AI Task").trim();
              cleanTitle = cleanTitle.replace(/^(add task:?|new task:?|task:?|schedule:?)\s*/i, "").trim();
              cleanTitle = cleanTitle.replace(/^["']|["']$/g, "").trim();
              if (!cleanTitle) cleanTitle = act.task.title || "Untitled AI Task";

              const tId = "ai_" + Math.random().toString(36).substring(2, 11);
              const newTask: Task = {
                id: tId,
                title: cleanTitle,
                date: act.task.date || selectedDate,
                time: act.task.time || "12:00",
                duration: act.task.duration || "1 hour",
                isLocked: act.task.isLocked || false,
                completed: act.task.completed || false,
                location: act.task.location || "",
                category: act.task.category || "Personal",
                notes: act.task.notes || "",
                collaborator: act.task.collaborator || "",
                priority: act.task.priority || "none",
                isAllDay: act.task.isAllDay || false,
                subtasks: []
              };
              updatedTasks.push(newTask);
              hasChanges = true;
              actionsExecuted.push("Added task \"" + newTask.title + "\"");
            } else if (act.type === "UPDATE_TASK") {
              const idx = resolveTaskIdx(act, updatedTasks);
              if (idx !== -1) {
                const oldT = updatedTasks[idx];
                const updatedT = {
                  ...oldT,
                  ...act.updates
                };
                updatedTasks[idx] = updatedT;
                hasChanges = true;
                actionsExecuted.push("Updated task \"" + oldT.title + "\"");
              }
            } else if (act.type === "DELETE_TASK") {
              const idx = resolveTaskIdx(act, updatedTasks);
              if (idx !== -1) {
                const title = updatedTasks[idx].title;
                updatedTasks = updatedTasks.filter((_, i) => i !== idx);
                hasChanges = true;
                actionsExecuted.push("Deleted task \"" + title + "\"");
              }
            } else if (act.type === "COMPLETE_TASK") {
              const idx = resolveTaskIdx(act, updatedTasks);
              if (idx !== -1) {
                const oldT = updatedTasks[idx];
                const updatedT = {
                  ...oldT,
                  completed: act.completed !== undefined ? !!act.completed : true
                };
                updatedTasks[idx] = updatedT;
                hasChanges = true;
                actionsExecuted.push("Marked task \"" + oldT.title + "\" as " + (updatedT.completed ? "completed" : "incomplete"));
              }
            }
          });
        }

        if (hasChanges) {
          saveWorkspace(updatedTasks);
          triggerHaptic("medium");
          showDragToast("AI scheduler executed " + actionsExecuted.length + " change(s).", "success");
        }

        // Collect "Did you mean..." suggestions for collaborator or location
        const detectedSuggestions: Array<{ type: "collaborator" | "location"; value: string; originalQuery?: string }> = [];
        if (Array.isArray(json.data?.suggestions)) {
          detectedSuggestions.push(...json.data.suggestions);
        }

        // Client-side fuzzy matching on notes or extracted entities
        if (clientCreatedNote) {
          if (clientCreatedNote.collaborator && clientCreatedNote.collaborator !== "None" && !collaborators.includes(clientCreatedNote.collaborator)) {
            const matched = findSimilarEntities(clientCreatedNote.collaborator, collaborators, "collaborator");
            matched.forEach(m => {
              if (!detectedSuggestions.some(s => s.type === m.type && s.value.toLowerCase() === m.value.toLowerCase())) {
                detectedSuggestions.push(m);
              }
            });
          }
          if (clientCreatedNote.location && !favoriteLocations.includes(clientCreatedNote.location)) {
            const matched = findSimilarEntities(clientCreatedNote.location, favoriteLocations, "location");
            matched.forEach(m => {
              if (!detectedSuggestions.some(s => s.type === m.type && s.value.toLowerCase() === m.value.toLowerCase())) {
                detectedSuggestions.push(m);
              }
            });
          }
        }

        // Also check if any task action references an unlisted collaborator or location
        if (Array.isArray(actions)) {
          actions.forEach(act => {
            const col = act.task?.collaborator || act.updates?.collaborator;
            if (col && col !== "None" && !collaborators.includes(col)) {
              const matched = findSimilarEntities(col, collaborators, "collaborator");
              matched.forEach(m => {
                if (!detectedSuggestions.some(s => s.type === m.type && s.value.toLowerCase() === m.value.toLowerCase())) {
                  detectedSuggestions.push(m);
                }
              });
            }
            const loc = act.task?.location || act.updates?.location;
            if (loc && !favoriteLocations.includes(loc)) {
              const matched = findSimilarEntities(loc, favoriteLocations, "location");
              matched.forEach(m => {
                if (!detectedSuggestions.some(s => s.type === m.type && s.value.toLowerCase() === m.value.toLowerCase())) {
                  detectedSuggestions.push(m);
                }
              });
            }
          });
        }

        let responseDisplayMsg = text || "I've processed your request successfully.";
        if (detectedSuggestions.length > 0 && !responseDisplayMsg.toLowerCase().includes("did you mean")) {
          const sugNames = detectedSuggestions.map(s => `"${s.value}"`).join(" or ");
          responseDisplayMsg += "\n\nDid you mean " + sugNames + "?";
        }

        setChatbotMessages(prev => [
          ...prev,
          {
            id: "model_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            role: "model",
            text: responseDisplayMsg,
            timestamp: new Date(),
            actionsExecuted: actionsExecuted.length > 0 ? actionsExecuted : undefined,
            suggestions: detectedSuggestions.length > 0 ? detectedSuggestions : undefined
          }
        ]);
      } else {
        throw new Error("Invalid response format received from chatbot server.");
      }
    } catch (err: any) {
      console.error("Chatbot response error:", err);
      setChatbotMessages(prev => [
        ...prev,
        {
          id: "error_" + Date.now(),
          role: "model",
          text: "Error: " + (err.message || "An error occurred while communicating with Scheduler Gemini. Please try again."),
          timestamp: new Date()
        }
      ]);
      showDragToast("Chatbot error", "warning");
    } finally {
      setIsChatbotLoading(false);
    }
  };

  const chatbotScrollRef = useRef<HTMLDivElement | null>(null);
  const chatbotInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (chatbotScrollRef.current) {
      chatbotScrollRef.current.scrollTop = chatbotScrollRef.current.scrollHeight;
    }
  }, [chatbotMessages, isChatbotLoading, isChatbotOpen]);

  useEffect(() => {
    if (isChatbotOpen) {
      const timer = setTimeout(() => {
        chatbotInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isChatbotOpen]);

  const [hasSeeded, setHasSeeded] = useState<boolean>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("taskpass_seeded_v10") === "true";
    }
    return false;
  });
  const [undoState, setUndoState] = useState<{
    deletedTasks: Task[];
    description: string;
    show: boolean;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusCircleLastClickRef = useRef<{ time: number; taskId: string } | null>(null);
  const focusCircleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const hasSeededRef = useRef<boolean>(hasSeeded);
  useEffect(() => {
    hasSeededRef.current = hasSeeded;
  }, [hasSeeded]);
  const routines = useAppStore((state) => state.routines);
  const setRoutines = useAppStore((state) => state.setRoutines);
  const transfers = useAppStore((state) => state.transfers);
  const setTransfers = useAppStore((state) => state.setTransfers);
  const wallet = useAppStore((state) => state.wallet);
  const setWallet = useAppStore((state) => state.setWallet);

  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showUnlockAllModal, setShowUnlockAllModal] = useState(false);
  const [showClearPriorityModal, setShowClearPriorityModal] = useState(false);
  const [showBulkPrioritizeModal, setShowBulkPrioritizeModal] = useState(false);
  const [showBulkToBacklogModal, setShowBulkToBacklogModal] = useState(false);
  const [showBulkToDoneModal, setShowBulkToDoneModal] = useState(false);
  const [bulkToBacklogSelection, setBulkToBacklogSelection] = useState<Record<string, boolean>>({});
  const [bulkToDoneSelection, setBulkToDoneSelection] = useState<Record<string, boolean>>({});
  const [bulkRankedTaskIds, setBulkRankedTaskIds] = useState<string[]>([]);
  const [showAdHocSequenceModal, setShowAdHocSequenceModal] = useState(false);
  const [adHocSelectedTaskIds, setAdHocSelectedTaskIds] = useState<string[]>([]);
  const [adHocStartTime, setAdHocStartTime] = useState("");
  const [adHocLockedAll, setAdHocLockedAll] = useState(true);
  const [adHocSequenceTitle, setAdHocSequenceTitle] = useState("Ad Hoc Sequence");

  const [showSaveSequenceModal, setShowSaveSequenceModal] = useState(false);
  const [saveSequenceName, setSaveSequenceName] = useState("");
  const [saveSequenceGroupId, setSaveSequenceGroupId] = useState<string | null>(null);

  useEffect(() => {
    setDefaultDuration(30);
    localStorage.setItem("default_duration", "30");
  }, []);

  const [showCalendarSyncModal, setShowCalendarSyncModal] = useState(false);
  const [showNotebookLmModal, setShowNotebookLmModal] = useState(false);
  const [notebookLmTab, setNotebookLmTab] = useState<"export" | "import">("export");
  const [notebookLmImportText, setNotebookLmImportText] = useState("");
  const [isNotebookLmImporting, setIsNotebookLmImporting] = useState(false);
  const [notebookLmImportSuccessMsg, setNotebookLmImportSuccessMsg] = useState("");
  const [bufferSelectionTask, setBufferSelectionTask] = useState<Task | null>(null);
  const [syncErrorDetail, setSyncErrorDetail] = useState<{
    source: string;
    error: string;
    reason: string;
    suggestions: string[];
  } | null>(null);
  const [unlockTasksSelection, setUnlockTasksSelection] = useState<Record<string, boolean>>({});
  const [clearPriorityTasksSelection, setClearPriorityTasksSelection] = useState<Record<string, boolean>>({});
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [standardsMet1, setStandardsMet1] = useState(false);
  const [standardsMet2, setStandardsMet2] = useState(false);
  const [standardsMet3, setStandardsMet3] = useState(false);
  const [editingHistoryNotesId, setEditingHistoryNotesId] = useState<string | null>(null);
  const [historyNotesText, setHistoryNotesText] = useState("");

  const [activeFlasher, setActiveFlasher] = useState<{ text: string; type: "plus" | "minus" } | null>(null);
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward">("forward");

  const [taskpassSubTab, setTaskpassSubTab] = useState<"incoming" | "sent" | "completed_declined" | "hub">("incoming");

  const [readTransferIds, setReadTransferIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("taskpass_read_transfers_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markTransferAsRead = (id: string) => {
    if (!readTransferIds.includes(id)) {
      const updated = [...readTransferIds, id];
      setReadTransferIds(updated);
      localStorage.setItem("taskpass_read_transfers_v1", JSON.stringify(updated));
    }
  };

  const [incomingSortField, setIncomingSortField] = useState<"date" | "requester" | "favors" | "status">("date");
  const [incomingSortAsc, setIncomingSortAsc] = useState<boolean>(false);

  const [sentSortField, setSentSortField] = useState<"date" | "recipient" | "favors" | "status">("date");
  const [sentSortAsc, setSentSortAsc] = useState<boolean>(false);

  const [historySortField, setHistorySortField] = useState<"date" | "party" | "favors" | "status">("date");
  const [historySortAsc, setHistorySortAsc] = useState<boolean>(false);

  const getSortedIncoming = () => {
    const items = transfers.filter(tr => tr.toUserId === "simulation_dev" && tr.status !== "completed" && tr.status !== "declined");
    return [...items].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      if (incomingSortField === "date") {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else if (incomingSortField === "requester") {
        valA = (a.fromUserId || "").toLowerCase();
        valB = (b.fromUserId || "").toLowerCase();
      } else if (incomingSortField === "favors") {
        valA = a.compensation?.amount || 0;
        valB = b.compensation?.amount || 0;
      } else if (incomingSortField === "status") {
        valA = (a.status || "").toLowerCase();
        valB = (b.status || "").toLowerCase();
      }

      if (valA < valB) return incomingSortAsc ? -1 : 1;
      if (valA > valB) return incomingSortAsc ? 1 : -1;
      return 0;
    });
  };

  const getSortedSent = () => {
    const items = transfers.filter(tr => tr.fromUserId === "simulation_dev" && tr.status !== "completed" && tr.status !== "declined");
    return [...items].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      if (sentSortField === "date") {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else if (sentSortField === "recipient") {
        valA = (a.toUserId || "").toLowerCase();
        valB = (b.toUserId || "").toLowerCase();
      } else if (sentSortField === "favors") {
        valA = a.compensation?.amount || 0;
        valB = b.compensation?.amount || 0;
      } else if (sentSortField === "status") {
        valA = (a.status || "").toLowerCase();
        valB = (b.status || "").toLowerCase();
      }

      if (valA < valB) return sentSortAsc ? -1 : 1;
      if (valA > valB) return sentSortAsc ? 1 : -1;
      return 0;
    });
  };

  const getSortedHistory = () => {
    const items = transfers.filter(tr => tr.status === "completed" || tr.status === "declined");
    return [...items].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      if (historySortField === "date") {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else if (historySortField === "party") {
        const partyA = a.toUserId === "simulation_dev" ? (a.fromUserId || "") : (a.toUserId || "");
        const partyB = b.toUserId === "simulation_dev" ? (b.fromUserId || "") : (b.toUserId || "");
        valA = partyA.toLowerCase();
        valB = partyB.toLowerCase();
      } else if (historySortField === "favors") {
        valA = a.compensation?.amount || 0;
        valB = b.compensation?.amount || 0;
      } else if (historySortField === "status") {
        valA = (a.status || "").toLowerCase();
        valB = (b.status || "").toLowerCase();
      }

      if (valA < valB) return historySortAsc ? -1 : 1;
      if (valA > valB) return historySortAsc ? 1 : -1;
      return 0;
    });
  };

  const [favoriteLocations, _setFavoriteLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem("taskpass_favorite_locations_v1");
    const arr = saved ? JSON.parse(saved) : ["Office HQ", "State Library", "Powerhouse Gym", "Stanford Campus", "Philz Coffee"];
    return [...arr].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  });
  const setFavoriteLocations = React.useCallback((newLocs: string[] | ((prev: string[]) => string[])) => {
    if (typeof newLocs === "function") {
      _setFavoriteLocations((prev) => {
        const res = newLocs(prev);
        return [...res].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      });
    } else {
      _setFavoriteLocations([...newLocs].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })));
    }
  }, []);

  const [taskpassHistory, setTaskpassHistory] = useState<Array<{
    id: string;
    type: 'earned' | 'spent' | 'performed_task' | 'received_task';
    title: string;
    amount?: number;
    date: string;
    details?: string;
    notesAfter?: string;
    reactivated?: boolean;
    recipient?: string;
  }>>(() => {
    const saved = localStorage.getItem("taskpass_history_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: "h1",
        type: "earned",
        title: "Completed 'Prepare Sprint Presentation' for Alex",
        amount: 35,
        date: "2026-06-11T10:15:00Z",
        details: "Agile roadmap was approved and checked."
      },
      {
        id: "h2",
        type: "spent",
        title: "Passed 'Collect Parcel Delivery' to Sarah",
        amount: -20,
        date: "2026-06-11T12:00:00Z",
        details: "Assigned via standard TaskPass favor routing."
      },
      {
        id: "h3",
        type: "performed_task",
        title: "Performed 'Sanity Run Checklist'",
        date: "2026-06-10T08:30:00Z",
        details: "All system parameters checked out successfully."
      },
      {
        id: "h4",
        type: "earned",
        title: "Sign-up incentive reward",
        amount: 105,
        date: "2026-06-01T09:00:00Z",
        details: "Welcome developer favor points allocation grant."
      }
    ];
  });

  const isAcceptedPassedTask = (t: Task) => {
    if (t.isTransferred) return true;
    if (t.transferId) {
      const tr = transfers.find(x => x.id === t.transferId);
      if (tr && (tr.status === "accepted" || tr.status === "completed")) {
        return true;
      }
    }
    return false;
  };

  const [newCollabInput, setNewCollabInput] = useState("");
  const [newLocationInput, setNewLocationInput] = useState("");

  const [notes, setNotes] = useState<any[]>(() => {
    const saved = localStorage.getItem("taskpass_notes_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });
  const [showNotesRepo, setShowNotesRepo] = useState(false);
  const [notesGroupBy, setNotesGroupBy] = useState<"project" | "collaborator" | "timeDate" | "task" | "routine">("project");
  const [noteText, setNoteText] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState("");

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteRawText, setEditNoteRawText] = useState("");
  const [editNoteProject, setEditNoteProject] = useState("");
  const [editNoteCollaborator, setEditNoteCollaborator] = useState("");
  const [editNoteTime, setEditNoteTime] = useState("");
  const [editNoteLocation, setEditNoteLocation] = useState("");
  const [editNoteTaskId, setEditNoteTaskId] = useState("");
  const [editNoteRoutineId, setEditNoteRoutineId] = useState("");
  const [editNoteCreatedAt, setEditNoteCreatedAt] = useState("");

  const saveNotes = (updatedNotes: any[]) => {
    const prevNotes = notes;
    setNotes(updatedNotes);
    localStorage.setItem("taskpass_notes_v1", JSON.stringify(updatedNotes));

    if (db && currentUser) {
      const uid = currentUser.uid;
      // 1. Find deleted notes and delete them from Firestore
      const deleted = prevNotes.filter(p => !updatedNotes.some(u => u.id === p.id));
      deleted.forEach(note => {
        deleteDoc(doc(db!, "notes", note.id)).catch(err => {
          handleFirestoreError(err, OperationType.DELETE, `notes/${note.id}`);
        });
      });

      // 2. Find newly added or updated notes and set them in Firestore
      updatedNotes.forEach(note => {
        const prev = prevNotes.find(p => p.id === note.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(note)) {
          setDoc(doc(db!, "notes", note.id), cleanForFirestore({ ...note, userId: uid })).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `notes/${note.id}`);
          });
        }
      });
    }
  };


  const [expandedSubtaskTaskId, setExpandedSubtaskTaskId] = useState<Record<string, boolean>>({});
  const [expandedStandardFields, setExpandedStandardFields] = useState<Record<string, boolean>>({});
  const [focusLocationPickerTaskId, setFocusLocationPickerTaskId] = useState<string | null>(null);
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});
  const [bulkSubtaskTaskId, setBulkSubtaskTaskId] = useState<string | null>(null);
  const [bulkSubtaskText, setBulkSubtaskText] = useState<string>("");
  const [subtaskNoteAddedState, setSubtaskNoteAddedState] = useState<Record<string, boolean>>({});

  // States for focus card before/after buffer pull-down menus
  const [focusCardBfOpen, setFocusCardBfOpen] = useState(false);
  const [focusCardAfOpen, setFocusCardAfOpen] = useState(false);

  // Buffer bottom button interactive state flow: "idle" | "running" | "paused"
  const [bufferBtnStates, setBufferBtnStates] = useState<Record<string, "idle" | "running" | "paused">>({});

  // Modal selector and choosing/editing reasons for buffer
  const [showBufferCustomizer, setShowBufferCustomizer] = useState(false);
  const [customizerTaskId, setCustomizerTaskId] = useState<string | null>(null);
  const [customizerBufferType, setCustomizerBufferType] = useState<"before" | "after" | null>(null);
  const [customizerReason, setCustomizerReason] = useState("");
  const [customizerHours, setCustomizerHours] = useState(0);
  const [customizerMinutes, setCustomizerMinutes] = useState(15);
  const [customizerLocation, setCustomizerLocation] = useState("");
  const [customizerSameLocation, setCustomizerSameLocation] = useState(true);
  const [customizerCompleted, setCustomizerCompleted] = useState(false);
  const [tappedDeckTaskId, setTappedDeckTaskId] = useState<string | null>(null);
  const [editingFlexTask, setEditingFlexTask] = useState<Task | null>(null);

  const openBufferCustomizerForTask = (taskId: string, type: "before" | "after") => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;
    setCustomizerTaskId(taskId);
    setCustomizerBufferType(type);
    const mins = type === "before" ? (targetTask.travelBefore || 0) : (targetTask.travelAfter || 0);
    setCustomizerHours(Math.floor(mins / 60));
    setCustomizerMinutes(mins % 60 === 0 && mins === 0 ? 15 : mins % 60);
    const purpose = type === "before" 
      ? (targetTask.beforeBufferPurpose || "Preparation") 
      : (targetTask.afterBufferPurpose || "Wrap-up");
    setCustomizerReason(purpose);
    const sameLoc = type === "before" 
      ? (targetTask.travelBeforeSameLocation !== false) 
      : (targetTask.travelAfterSameLocation !== false);
    setCustomizerSameLocation(sameLoc);
    const loc = type === "before" 
      ? (targetTask.travelBeforeLocation || "") 
      : (targetTask.travelAfterLocation || "");
    setCustomizerLocation(loc);
    const completed = type === "before" ? !!targetTask.travelBeforeCompleted : !!targetTask.travelAfterCompleted;
    setCustomizerCompleted(completed);
    setShowBufferCustomizer(true);
    triggerHaptic("selection");
  };

  const handleChangeCustomizerBufferType = (nextType: "before" | "after") => {
    if (!customizerTaskId) return;
    const targetTask = tasks.find(t => t.id === customizerTaskId);
    if (!targetTask) return;
    setCustomizerBufferType(nextType);
    const mins = nextType === "before" ? (targetTask.travelBefore || 0) : (targetTask.travelAfter || 0);
    setCustomizerHours(Math.floor(mins / 60));
    setCustomizerMinutes(mins % 60 === 0 && mins === 0 ? 15 : mins % 60);
    const purpose = nextType === "before" 
      ? (targetTask.beforeBufferPurpose || "Preparation") 
      : (targetTask.afterBufferPurpose || "Wrap-up");
    setCustomizerReason(purpose);
    const sameLoc = nextType === "before" 
      ? (targetTask.travelBeforeSameLocation !== false) 
      : (targetTask.travelAfterSameLocation !== false);
    setCustomizerSameLocation(sameLoc);
    const loc = nextType === "before" 
      ? (targetTask.travelBeforeLocation || "") 
      : (targetTask.travelAfterLocation || "");
    setCustomizerLocation(loc);
    const completed = nextType === "before" ? !!targetTask.travelBeforeCompleted : !!targetTask.travelAfterCompleted;
    setCustomizerCompleted(completed);
  };

  const getState = (taskId: string, type: 'before' | 'after') => {
    const resolvedTask = tasks.find(t => t.id === taskId);
    if (!resolvedTask) return "idle";
    const isCompleted = type === 'before' ? resolvedTask.travelBeforeCompleted : resolvedTask.travelAfterCompleted;
    if (isCompleted) return "completed";
    
    const key = `${taskId}_${type}`;
    const savedState = bufferBtnStates[key] || "idle";
    
    const isCurrentlyRunning = activeBufferTaskId === taskId && activeBufferType === type;
    if (isCurrentlyRunning) {
      return "running";
    }
    
    if (savedState === "running" && !isCurrentlyRunning) {
      return "idle";
    }
    
    return savedState;
  };

  const handleBufferBottomButtonClick = (task: Task, type: 'before' | 'after') => {
    const currentState = getState(task.id, type);
    const key = `${task.id}_${type}`;
    
    if (currentState === "idle") {
      handleStartBufferCountdown(task, type);
      setBufferBtnStates(prev => ({ ...prev, [key]: "running" }));
      triggerHaptic("medium");
    } else if (currentState === "running") {
      handleStartBufferCountdown(task, type);
      setBufferBtnStates(prev => ({ ...prev, [key]: "paused" }));
      triggerHaptic("medium");
    } else if (currentState === "paused") {
      handleToggleCompleteBuffer(task.id, type);
      setBufferBtnStates(prev => ({ ...prev, [key]: "idle" }));
      triggerHaptic("success");
    } else if (currentState === "completed") {
      handleToggleCompleteBuffer(task.id, type);
      setBufferBtnStates(prev => ({ ...prev, [key]: "idle" }));
      triggerHaptic("light");
    }
  };

  const [bfMenuTaskId, setBfMenuTaskId] = useState<string | null>(null);
  const [afMenuTaskId, setAfMenuTaskId] = useState<string | null>(null);

  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const handleStartLongPress = (taskId: string, type: 'before' | 'after') => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    isLongPressActive.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      if (type === 'before') {
        setBfMenuTaskId(taskId);
        setAfMenuTaskId(null);
      } else {
        setAfMenuTaskId(taskId);
        setBfMenuTaskId(null);
      }
    }, 600); // 600ms long press threshold
  };

  const handleReleaseLongPress = (onClickAction: () => void) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (isLongPressActive.current) {
      // It was a long press, clear the flag but do not execute normal single click
      isLongPressActive.current = false;
    } else {
      // Normal single click
      onClickAction();
    }
  };

  const handleCancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // Theme support & synchronization
  const [localDarkMode, setLocalDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_mode");
    if (saved !== null) {
      return saved === "dark";
    }
    return darkMode;
  });
  useEffect(() => {
    const saved = localStorage.getItem("theme_mode");
    if (saved !== null) {
      setLocalDarkMode(saved === "dark");
    } else {
      setLocalDarkMode(darkMode);
    }
  }, [darkMode]);

  const isDark = localDarkMode;

  const handleUpdateSubtasks = (taskId: string, newSubtasks: any[]) => {
    const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
    if (realTaskId !== taskId) {
      setExpandedSubtaskTaskId(prev => {
        const next = { ...prev };
        delete next[taskId];
        next[realTaskId] = true;
        return next;
      });
    }
    const finalized = updatedTasks.map(t => {
      if (t.id === realTaskId) {
        return { ...t, subtasks: newSubtasks };
      }
      return t;
    });
    saveWorkspace(finalized);
  };

  const handleConvertToTask = (taskId: string, subId: string) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return;
    const subtasksList = task.subtasks || [];
    const sub = subtasksList.find(s => s.id === subId);
    if (!sub) return;

    if (!window.confirm(`Are you sure you want to convert the subtask "${sub.title}" to a full parent task?`)) {
      return;
    }

    // Instantiate virtual task if needed
    const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
    
    // Remove subtask from parent
    const nextSubtasks = subtasksList.filter(s => s.id !== subId);
    
    // Build new converted standalone Task
    const newConvertedTask: Task = {
      id: "task_" + Math.random().toString(36).substr(2, 9),
      userId: currentUser?.uid || task.userId,
      title: sub.title,
      date: task.date || selectedDate,
      time: sub.time || "",
      duration: sub.duration || "15 min",
      isLocked: !!sub.time,
      completed: sub.completed,
      location: sub.location || task.location || "",
      category: sub.category || task.category || "General",
      collaborator: sub.collaborator || task.collaborator || "None",
      order: (task.order || 0) + 1,
      subtasks: [],
      priority: "none"
    };

    const finalized = updatedTasks.map(t => {
      if (t.id === realTaskId) {
        return { ...t, subtasks: nextSubtasks };
      }
      return t;
    });

    // Add the new task
    finalized.push(newConvertedTask);
    saveWorkspace(finalized);
    triggerHaptic("success");
  };

  const renderSubtaskDropdown = (task: Task, isFocusPanel = false) => {
    const subtasksList = task.subtasks || [];
    const newText = newSubtaskTexts[task.id] || "";

    const addInlineSubtask = () => {
      if (!newText.trim()) return;
      const parsed = parseNaturalLanguageTask(newText.trim(), collaborators);
      const newSub = {
        id: "sub_" + Math.random().toString(36).substr(2, 9),
        title: parsed.title || newText.trim(),
        completed: false,
        time: parsed.time || undefined,
        duration: parsed.duration || undefined,
        location: parsed.location || undefined,
        category: parsed.category || undefined,
        collaborator: parsed.collaborator || undefined,
      };
      const updated = [...subtasksList, newSub];
      handleUpdateSubtasks(task.id, updated);
      setNewSubtaskTexts(prev => ({ ...prev, [task.id]: "" }));
    };

    return (
      <div className="space-y-1.5 p-2 bg-slate-950/80 border border-white/10 rounded-xl my-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">
            Subtasks ({subtasksList.filter(s => s.completed).length}/{subtasksList.length})
          </span>
          <button
            type="button"
            onClick={() => setExpandedSubtaskTaskId(prev => ({ ...prev, [task.id]: true }))}
            className="text-[8px] font-bold text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            title="Open Subtasks Manager"
          >
            <Maximize2 size={9} /> Full View
          </button>
        </div>
        {subtasksList.map((sub, sIdx) => (
          <div key={sub.id || sIdx} className="flex items-center gap-1.5 text-[10px] text-slate-200">
            <button
              type="button"
              onClick={() => {
                const updated = subtasksList.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s);
                handleUpdateSubtasks(task.id, updated);
              }}
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                sub.completed ? "bg-teal-500 border-teal-500 text-slate-950" : "border-white/20 bg-slate-900 hover:border-teal-400"
              }`}
            >
              {sub.completed && <Check size={8} strokeWidth={4} />}
            </button>
            <span className={`flex-1 truncate ${sub.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
              {sub.title}
            </span>
            <button
              type="button"
              onClick={() => {
                const updated = subtasksList.filter(s => s.id !== sub.id);
                handleUpdateSubtasks(task.id, updated);
              }}
              className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
              title="Delete subtask"
            >
              <Trash2 size={9} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1 pt-1">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewSubtaskTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInlineSubtask();
              }
            }}
            placeholder="Add subtask..."
            className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={addInlineSubtask}
            className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded shrink-0 cursor-pointer"
            title="Add Subtask"
          >
            <Plus size={10} strokeWidth={3} />
          </button>
        </div>
      </div>
    );
  };

  const renderFocusLocationPicker = (task: Task) => {
    return (
      <div 
        className="mt-3 p-3 bg-slate-950/95 border border-white/10 rounded-2xl space-y-2.5 text-left z-50 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Select Location</span>
          <button 
            type="button" 
            onClick={() => setFocusLocationPickerTaskId(null)}
            className="text-slate-500 hover:text-white p-0.5 transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>

        {/* Existing user locations */}
        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pt-0.5">
          {favoriteLocations.map((loc) => (
            <span 
              key={loc}
              className="inline-flex items-center gap-1 bg-slate-900 border border-white/5 rounded-lg text-[11px] text-slate-300 overflow-hidden pr-1"
            >
              <button
                type="button"
                onClick={() => {
                  const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, location: loc } : t);
                  saveWorkspace(updatedTasks);
                  setFocusLocationPickerTaskId(null);
                  triggerHaptic("medium");
                }}
                className="px-2.5 py-1 font-bold hover:bg-indigo-600 hover:text-white transition-all text-left truncate max-w-[120px] cursor-pointer"
              >
                {loc}
              </button>
              <button
                type="button"
                onClick={() => {
                  const updatedLocs = favoriteLocations.filter(l => l !== loc);
                  setFavoriteLocations(updatedLocs);
                  localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updatedLocs));
                  saveSystemSettingsToCloud({ favoriteLocations: updatedLocs });
                  triggerHaptic("light");
                }}
                className="p-0.5 text-slate-500 hover:text-rose-450 hover:bg-rose-500/10 rounded transition-colors cursor-pointer shrink-0"
                title={`Delete ${loc} from list`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {favoriteLocations.length === 0 && (
            <p className="text-[10px] text-slate-500 italic py-1">No saved locations yet.</p>
          )}
        </div>

        {/* Add/Edit Location inline field */}
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wide">Or Add New Location:</span>
          <div className="flex gap-1.5">
            <input 
              type="text"
              id={`inline-new-location-${task.id}`}
              placeholder="Type new location..."
              className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans h-7"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = (e.currentTarget as HTMLInputElement).value.trim();
                  if (val) {
                    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, location: val } : t);
                    saveWorkspace(updatedTasks);
                    if (!favoriteLocations.includes(val)) {
                      const updatedLocs = [...favoriteLocations, val];
                      setFavoriteLocations(updatedLocs);
                      localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updatedLocs));
                      saveSystemSettingsToCloud({ favoriteLocations: updatedLocs });
                    }
                    setFocusLocationPickerTaskId(null);
                    triggerHaptic("medium");
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const inputEl = document.getElementById(`inline-new-location-${task.id}`) as HTMLInputElement;
                const val = inputEl ? inputEl.value.trim() : "";
                if (val) {
                  const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, location: val } : t);
                  saveWorkspace(updatedTasks);
                  if (!favoriteLocations.includes(val)) {
                    const updatedLocs = [...favoriteLocations, val];
                    setFavoriteLocations(updatedLocs);
                    localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updatedLocs));
                    saveSystemSettingsToCloud({ favoriteLocations: updatedLocs });
                  }
                  setFocusLocationPickerTaskId(null);
                  triggerHaptic("medium");
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-2.5 rounded-lg h-7 transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Uniform form styling for complete size and visual consistency across all task edit windows
  const uniformLabelClass = "text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 select-none";
  const uniformInputClass = `w-full h-10 px-3.5 rounded-xl font-bold text-[16px] md:text-xs outline-none border transition-all ${
    isDark 
      ? "bg-slate-950 border-white/5 text-blue-400 placeholder-slate-500 focus:border-indigo-500 hover:bg-slate-900/40" 
      : "bg-white border-slate-200 text-blue-600 placeholder-slate-455 focus:border-indigo-500 hover:bg-slate-50/50"
  }`;
  const uniformSelectClass = `w-full h-10 px-3 rounded-xl font-bold text-[16px] md:text-xs outline-none border cursor-pointer transition-all ${
    isDark 
      ? "bg-slate-950 border-white/5 text-blue-400 focus:border-indigo-500 hover:bg-slate-900/40" 
      : "bg-white border-slate-200 text-blue-600 focus:border-indigo-500 hover:bg-slate-50/50"
  }`;
  const uniformTextareaClass = `w-full p-3.5 rounded-xl font-bold text-[16px] md:text-xs outline-none border resize-none transition-all ${
    isDark 
      ? "bg-slate-950 border-white/5 text-blue-400 placeholder-slate-500 focus:border-indigo-500 hover:bg-slate-900/40" 
      : "bg-white border-slate-200 text-blue-600 placeholder-slate-455 focus:border-indigo-500 hover:bg-slate-50/50"
  }`;

  const saveSystemSettingsToCloud = (updatedSettings: Partial<{
    isDark: boolean;
    liteMode: boolean;
    cardDensity: string;
    hapticsEnabled: boolean;
    defaultDuration: number;
    timelineIncrement: number;
    fontSizeScale: string;
    lockedNoColor: boolean;
    highNoColor: boolean;
    medNoColor: boolean;
    lowNoColor: boolean;
    lockedHue: number;
    lockedOpacity: number;
    highHue: number;
    highOpacity: number;
    medHue: number;
    medOpacity: number;
    lowHue: number;
    lowOpacity: number;
    cardBgOpacity?: number;
    cardBgHue?: number;
    underlightingBrightness?: number;
    cardGradientPercent?: number;
    cardGradientDirection?: "left" | "right";
    cardOutlineThickness?: number;
    templateStyle?: string;
    dayPlannerFont?: string;
    categories?: string[];
    collaborators?: string[];
    favoriteLocations?: string[];
    showCompletedTasks?: boolean;
    dayStartHour?: string;
    toastNotificationsEnabled?: boolean;
    complementaryCalendarUrl?: string;
    defaultWeatherLocation?: string;
    taskpassEnabled?: boolean;
    notebookLmEnabled?: boolean;
    aiPlansEnabled?: boolean;
    aiSubtasksEnabled?: boolean;
    collaboratorsEnabled?: boolean;
    sequencesEnabled?: boolean;
    sequenceGroupHeadersEnabled?: boolean;
    bulkAddTasksEnabled?: boolean;
    workspaceDataEnabled?: boolean;
    bulkOpsEnabled?: boolean;
    expensesEnabled?: boolean;
    dayStartHoursByDate?: Record<string, string>;
    flexActivities?: string[];
    notesRepoEnabled?: boolean;
    tasksPanelEnabled?: boolean;
    focusPanelEnabled?: boolean;
    timelinePanelEnabled?: boolean;
    panelBgDayColor?: string;
    panelBgNightColor?: string;
    lockedSolidColorEnabled?: boolean;
    lockedSolidBgColor?: string;
  }>) => {
    if (db && currentUser) {
      const uid = currentUser.uid;
      const userDocRef = doc(db, "users", uid);
      setDoc(userDocRef, cleanForFirestore(updatedSettings), { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      });
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    if (setDarkMode) {
      setDarkMode(nextDark);
    } else {
      setLocalDarkMode(nextDark);
    }
    localStorage.setItem("theme_mode", nextDark ? "dark" : "light");
    window.dispatchEvent(new Event("theme_mode_changed"));
    saveSystemSettingsToCloud({ isDark: nextDark });
  };

  // Focus and local Settings system states
  const [focusBrowseIndex, setFocusBrowseIndex] = useState(0);
  const [focusTimerMode, setFocusTimerMode] = useState<"before" | "task" | "after">("task");
  const [focusTick, setFocusTick] = useState(Date.now());
  const activeFocusTaskIdRef = useRef<string | null>(null);
  const pendingFocusCardSwitchRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [aiNarrativeEnabled, setAiNarrativeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("taskpass_ai_narrative_enabled");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("taskpass_ai_narrative_enabled", JSON.stringify(aiNarrativeEnabled));
  }, [aiNarrativeEnabled]);
  const [focusCardPage, setFocusCardPage] = useState<"task" | "solution">("task");
  const [focusCardDetailModeEnabled, setFocusCardDetailModeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("taskpass_focus_detail_mode_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [focusCardDetailMode, setFocusCardDetailMode] = useState<"detailed" | "simple">(() => (localStorage.getItem("taskpass_focus_detail_mode") as "detailed" | "simple") || "detailed");
  const effectiveFocusCardDetailMode = focusCardDetailModeEnabled ? focusCardDetailMode : "simple";
  const [focusViewExpandState, setFocusViewExpandState] = useState<"split" | "narrative" | "timer">("split");
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  
  // Task Solution Page states
  const [solutionWeather, setSolutionWeather] = useState<{ temp: string; climate: string; description: string; wind: string; humidity: string } | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherFetchedTaskId, setWeatherFetchedTaskId] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<string>("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailTone, setEmailTone] = useState<string>("Professional");
  const [solutionMarkdown, setSolutionMarkdown] = useState<string>("");
  const [isSearchingSolutions, setIsSearchingSolutions] = useState(false);
  const [solutionCustomQuery, setSolutionCustomQuery] = useState<string>("");
  const [solutionQueryTaskLoaded, setSolutionQueryTaskLoaded] = useState<string | null>(null);

  const focusTouchStartY = useRef<number>(0);
  const focusTouchStartX = useRef<number>(0);
  const [skippedTaskIds, setSkippedTaskIds] = useState<string[]>([]);
  const [noteModeTexts, setNoteModeTexts] = useState<Record<string, string>>({});
  const [loadingNoteModeTaskId, setLoadingNoteModeTaskId] = useState<string | null>(null);
  const [dataFieldColor, setDataFieldColor] = useState<string>(() => {
    return localStorage.getItem("data_field_color") || "#39ff14";
  });
  const [showFocusControlsMenu, setShowFocusControlsMenu] = useState(false);

  const [timelineBorderColor, setTimelineBorderColor] = useState<string>(() => {
    return localStorage.getItem("timeline_border_color") || "#38bdf8";
  });
  const [timelineHourMarkerColor, setTimelineHourMarkerColor] = useState<string>(() => {
    return localStorage.getItem("timeline_hour_marker_color") || "#818cf8";
  });
  const [timelineSublineColor, setTimelineSublineColor] = useState<string>(() => {
    return localStorage.getItem("timeline_subline_color") || "rgba(255,255,255,0.12)";
  });
  const [timelineCardBorderColor, setTimelineCardBorderColor] = useState<string>(() => {
    return localStorage.getItem("timeline_card_border_color") || "rgba(255,255,255,0.15)";
  });
  const [taskCardGlassStyle, setTaskCardGlassStyle] = useState<string>(() => {
    return localStorage.getItem("task_card_glass_style") || "translucent";
  });

  useEffect(() => {
    localStorage.setItem("timeline_border_color", timelineBorderColor);
  }, [timelineBorderColor]);

  useEffect(() => {
    localStorage.setItem("timeline_hour_marker_color", timelineHourMarkerColor);
  }, [timelineHourMarkerColor]);

  useEffect(() => {
    localStorage.setItem("timeline_subline_color", timelineSublineColor);
  }, [timelineSublineColor]);

  useEffect(() => {
    localStorage.setItem("timeline_card_border_color", timelineCardBorderColor);
  }, [timelineCardBorderColor]);

  useEffect(() => {
    localStorage.setItem("task_card_glass_style", taskCardGlassStyle);
  }, [taskCardGlassStyle]);
  const [focusFieldName, setFocusFieldName] = useState<string | null>(null);
  const [openCollabDropdownTaskId, setOpenCollabDropdownTaskId] = useState<string | null>(null);
  const [newCollabInputVal, setNewCollabInputVal] = useState("");

  // Voice Input & Read Aloud Speech Synthesis State Variables
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [narrativeVoiceTranscript, setNarrativeVoiceTranscript] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [narrativeVoiceError, setNarrativeVoiceError] = useState("");
  const [showVoiceFallbackInput, setShowVoiceFallbackInput] = useState(false);
  const [voiceFallbackText, setVoiceFallbackText] = useState("");

  useEffect(() => {
    localStorage.setItem("data_field_color", dataFieldColor);
  }, [dataFieldColor]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [focusBrowseIndex]);
  const [activeBufferTaskId, setActiveBufferTaskId] = useState<string | null>(null);
  const [activeBufferType, setActiveBufferType] = useState<"before" | "after" | null>(null);
  const [bufferStartedAt, setBufferStartedAt] = useState<number | null>(null);
  const showSettingsModal = useAppStore((state) => state.showSettingsModal);
  const setShowSettingsModal = useAppStore((state) => state.setShowSettingsModal);
  const [showGearDropdown, setShowGearDropdown] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [showDevApiSubmenu, setShowDevApiSubmenu] = useState(false);
  const settingsCategory = useAppStore((state) => state.settingsCategory);
  const setSettingsCategory = useAppStore((state) => state.setSettingsCategory);
  const expandedSettingId = useAppStore((state) => state.expandedSettingId);
  const setExpandedSettingId = useAppStore((state) => state.setExpandedSettingId);
  const [defaultWeatherLocation, setDefaultWeatherLocation] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("taskpass_default_weather_location") || "";
    }
    return "";
  });
  const [copiedUid, setCopiedUid] = useState(false);
  const timelineIncrement = useAppStore((state) => state.timelineIncrement);
  const setTimelineIncrement = useAppStore((state) => state.setTimelineIncrement);
  const fontSizeScale = useAppStore((state) => state.fontSizeScale);
  const setFontSizeScale = useAppStore((state) => state.setFontSizeScale);
  const taskCardAnimationMs = useAppStore((state) => state.taskCardAnimationMs);
  const [liteMode, setLiteMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("lite_mode");
    return saved === "true";
  });
  const [cardDensity, setCardDensity] = useState<"standard" | "simplified" | "very_simplified" | "report">(( ) => {
    const saved = localStorage.getItem("card_density");
    if (saved === "standard" || saved === "very_simplified" || saved === "report") {
      return saved as "standard" | "very_simplified" | "report";
    }
    if (saved === "simplified") {
      return "very_simplified";
    }
    const legacyLite = localStorage.getItem("lite_mode");
    return legacyLite === "true" ? "very_simplified" : "standard";
  });
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("haptics_enabled");
    return saved !== "false"; // Default to true for physical feedback out-of-the-box
  });
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(() => {
    const saved = localStorage.getItem("show_completed_tasks");
    return saved !== "false"; // Default to true
  });
  const [isToastEnabled, setIsToastEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("toast_notifications_enabled");
    return saved !== "false"; // Default to true
  });
  const [taskpassEnabled, setTaskpassEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("taskpass_enabled");
    return saved !== "false";
  });
  const [notebookLmEnabled, setNotebookLmEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("notebook_lm_enabled");
    return saved !== "false";
  });
  const [aiPlansEnabled, setAiPlansEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("ai_plans_enabled");
    return saved !== "false";
  });
  const [aiSubtasksEnabled, setAiSubtasksEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("ai_subtasks_enabled");
    return saved !== "false";
  });
  const [collaboratorsEnabled, setCollaboratorsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("collaborators_enabled");
    return saved !== "false";
  });
  const [sequencesEnabled, setSequencesEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("sequences_enabled");
    return saved !== "false";
  });
  const [sequenceGroupHeadersEnabled, setSequenceGroupHeadersEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("sequence_group_headers_enabled");
    return saved !== "false";
  });
  const [bulkAddTasksEnabled, setBulkAddTasksEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("bulk_add_tasks_enabled");
    return saved !== "false";
  });
  const [workspaceDataEnabled, setWorkspaceDataEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("workspace_data_enabled");
    return saved !== "false";
  });
  const [bulkOpsEnabled, setBulkOpsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("bulk_ops_enabled");
    return saved !== "false";
  });
  const [expensesEnabled, setExpensesEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("expenses_enabled");
    return saved !== "false";
  });
  const [notesRepoEnabled, setNotesRepoEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("notes_repo_enabled");
    return saved !== "false";
  });
  const [focusPanelEnabled, setFocusPanelEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("focus_panel_enabled");
    return saved !== "false";
  });
  const [timelinePanelEnabled, setTimelinePanelEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("timeline_panel_enabled");
    return saved !== "false";
  });
  const [tasksPanelEnabled, setTasksPanelEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("tasks_panel_enabled");
    return saved !== "false";
  });
  const [panelBgDayColor, setPanelBgDayColor] = useState<string>(() => {
    return localStorage.getItem("panel_bg_day_color") || "#f8fafc";
  });
  const [panelBgNightColor, setPanelBgNightColor] = useState<string>(() => {
    return localStorage.getItem("panel_bg_night_color") || "#0f172a";
  });
  const activePanelBgColor = isDark ? panelBgNightColor : panelBgDayColor;

  const handleUpdatePanelBgDayColor = (color: string) => {
    setPanelBgDayColor(color);
    localStorage.setItem("panel_bg_day_color", color);
    saveSystemSettingsToCloud({ panelBgDayColor: color });
  };

  const handleUpdatePanelBgNightColor = (color: string) => {
    setPanelBgNightColor(color);
    localStorage.setItem("panel_bg_night_color", color);
    saveSystemSettingsToCloud({ panelBgNightColor: color });
  };

  const [lockedSolidColorEnabled, setLockedSolidColorEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("status_locked_solid_color_enabled");
    return saved === "true";
  });
  const [lockedSolidBgColor, setLockedSolidBgColor] = useState<string>(() => {
    return localStorage.getItem("status_locked_solid_bg_color") || "#e11d48";
  });

  const handleUpdateLockedSolidColorEnabled = (val: boolean) => {
    setLockedSolidColorEnabled(val);
    localStorage.setItem("status_locked_solid_color_enabled", val ? "true" : "false");
    saveSystemSettingsToCloud({ lockedSolidColorEnabled: val });
  };

  const handleUpdateLockedSolidBgColor = (color: string) => {
    setLockedSolidBgColor(color);
    localStorage.setItem("status_locked_solid_bg_color", color);
    saveSystemSettingsToCloud({ lockedSolidBgColor: color });
  };
  const [showFeaturesSubmenu, setShowFeaturesSubmenu] = useState(false);
  const dayStartHour = useAppStore((state) => state.dayStartHour);
  const setDayStartHour = useAppStore((state) => state.setDayStartHour);
  const [dayStartHoursByDate, setDayStartHoursByDate] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("day_start_hours_by_date");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const activeDayStartHour = useMemo(() => {
    return dayStartHoursByDate[selectedDate] || dayStartHour || "06:00";
  }, [dayStartHoursByDate, selectedDate, dayStartHour]);
  const [complementaryCalendarUrl, setComplementaryCalendarUrl] = useState<string>(() => {
    return localStorage.getItem("complementary_calendar_url") || "";
  });
  const [isComplementaryCalendarExpanded, setIsComplementaryCalendarExpanded] = useState<boolean>(() => {
    return localStorage.getItem("is_comp_calendar_expanded") !== "false";
  });
  const dayStartMinutes = useMemo(() => {
    return timeToMinutes(activeDayStartHour);
  }, [activeDayStartHour]);

  // Sync view settings between Focus Card Detail Mode and Card Density layout
  useEffect(() => {
    if (focusCardDetailMode === "simple") {
      if (cardDensity !== "very_simplified") {
        setCardDensity("very_simplified");
        localStorage.setItem("card_density", "very_simplified");
        setLiteMode(true);
        localStorage.setItem("lite_mode", "true");
        saveSystemSettingsToCloud({ cardDensity: "very_simplified", liteMode: true });
      }
    }
  }, [focusCardDetailMode]);

  useEffect(() => {
    if (cardDensity === "very_simplified" || cardDensity === "simplified") {
      if (focusCardDetailMode !== "simple") {
        setFocusCardDetailMode("simple");
        localStorage.setItem("taskpass_focus_detail_mode", "simple");
      }
    }
  }, [cardDensity]);

  const [dragToasts, setDragToasts] = useState<Array<{
    id: string;
    type: 'success' | 'warning' | 'info';
    message: string;
    taskId?: string;
  }>>([]);

  const showDragToast = (message: string, type: 'success' | 'warning' | 'info', taskId?: string) => {
    if (!isToastEnabled) return;
    const toastId = Math.random().toString(36).substring(2, 9);
    setDragToasts(prev => [...prev, { id: toastId, type, message, taskId }]);
    setTimeout(() => {
      setDragToasts(prev => prev.filter(t => t.id !== toastId));
    }, 4500);
  };

  // Priority and Locked dynamic style customisations
  const [cardBgOpacity, setCardBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("status_card_bg_opacity");
    return saved !== null ? parseFloat(saved) : 0.45;
  });
  const [cardBgHue, setCardBgHue] = useState<number>(() => {
    const saved = localStorage.getItem("status_card_bg_hue");
    return saved !== null ? parseInt(saved, 10) : 222;
  });
  const [underlightingBrightness, setUnderlightingBrightness] = useState<number>(() => {
    const saved = localStorage.getItem("status_underlighting_brightness");
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [cardGradientPercent, setCardGradientPercent] = useState<number>(() => {
    const saved = localStorage.getItem("status_card_gradient_percent");
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const [cardGradientDirection, setCardGradientDirection] = useState<"left" | "right">(() => {
    const saved = localStorage.getItem("status_card_gradient_direction");
    return saved === "left" || saved === "right" ? saved : "right";
  });
  const [cardOutlineThickness, setCardOutlineThickness] = useState<number>(() => {
    const saved = localStorage.getItem("status_card_outline_thickness");
    return saved !== null ? parseInt(saved, 10) : 1;
  });

  const updateCardBgOpacity = (val: number) => {
    setCardBgOpacity(val);
    localStorage.setItem("status_card_bg_opacity", val.toString());
    saveSystemSettingsToCloud({ cardBgOpacity: val });
  };
  const updateCardBgHue = (val: number) => {
    setCardBgHue(val);
    localStorage.setItem("status_card_bg_hue", val.toString());
    saveSystemSettingsToCloud({ cardBgHue: val });
  };
  const updateUnderlightingBrightness = (val: number) => {
    setUnderlightingBrightness(val);
    localStorage.setItem("status_underlighting_brightness", val.toString());
    saveSystemSettingsToCloud({ underlightingBrightness: val });
  };
  const updateCardGradientPercent = (val: number) => {
    setCardGradientPercent(val);
    localStorage.setItem("status_card_gradient_percent", val.toString());
    saveSystemSettingsToCloud({ cardGradientPercent: val });
  };
  const updateCardGradientDirection = (val: "left" | "right") => {
    setCardGradientDirection(val);
    localStorage.setItem("status_card_gradient_direction", val);
    saveSystemSettingsToCloud({ cardGradientDirection: val });
  };
  const updateCardOutlineThickness = (val: number) => {
    setCardOutlineThickness(val);
    localStorage.setItem("status_card_outline_thickness", val.toString());
    saveSystemSettingsToCloud({ cardOutlineThickness: val });
  };

  const [lockedHue, setLockedHue] = useState<number>(() => {
    const saved = localStorage.getItem("status_locked_hue");
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const [lockedOpacity, setLockedOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("status_locked_opacity");
    return saved !== null ? parseFloat(saved) : 0.22;
  });

  const [highHue, setHighHue] = useState<number>(() => {
    const saved = localStorage.getItem("status_high_hue");
    return saved !== null ? parseInt(saved, 10) : 38;
  });
  const [highOpacity, setHighOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("status_high_opacity");
    return saved !== null ? parseFloat(saved) : 0.17;
  });

  const [medHue, setMedHue] = useState<number>(() => {
    const saved = localStorage.getItem("status_med_hue");
    return saved !== null ? parseInt(saved, 10) : 45;
  });
  const [medOpacity, setMedOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("status_med_opacity");
    return saved !== null ? parseFloat(saved) : 0.25;
  });

  const [lowHue, setLowHue] = useState<number>(() => {
    const saved = localStorage.getItem("status_low_hue");
    return saved !== null ? parseInt(saved, 10) : 217;
  });
  const [lowOpacity, setLowOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("status_low_opacity");
    return saved !== null ? parseFloat(saved) : 0.18;
  });

  const updateLockedHue = (val: number) => {
    setLockedHue(val);
    localStorage.setItem("status_locked_hue", val.toString());
    saveSystemSettingsToCloud({ lockedHue: val });
  };
  const updateLockedOpacity = (val: number) => {
    setLockedOpacity(val);
    localStorage.setItem("status_locked_opacity", val.toString());
    saveSystemSettingsToCloud({ lockedOpacity: val });
  };

  const updateHighHue = (val: number) => {
    setHighHue(val);
    localStorage.setItem("status_high_hue", val.toString());
    saveSystemSettingsToCloud({ highHue: val });
  };
  const updateHighOpacity = (val: number) => {
    setHighOpacity(val);
    localStorage.setItem("status_high_opacity", val.toString());
    saveSystemSettingsToCloud({ highOpacity: val });
  };

  const updateMedHue = (val: number) => {
    setMedHue(val);
    localStorage.setItem("status_med_hue", val.toString());
    saveSystemSettingsToCloud({ medHue: val });
  };
  const updateMedOpacity = (val: number) => {
    setMedOpacity(val);
    localStorage.setItem("status_med_opacity", val.toString());
    saveSystemSettingsToCloud({ medOpacity: val });
  };

  const updateLowHue = (val: number) => {
    setLowHue(val);
    localStorage.setItem("status_low_hue", val.toString());
    saveSystemSettingsToCloud({ lowHue: val });
  };
  const updateLowOpacity = (val: number) => {
    setLowOpacity(val);
    localStorage.setItem("status_low_opacity", val.toString());
    saveSystemSettingsToCloud({ lowOpacity: val });
  };

  // No Color flags for each card layout category
  const [lockedNoColor, setLockedNoColor] = useState<boolean>(() => {
    const saved = localStorage.getItem("status_locked_nocolor");
    return saved === "true";
  });
  const [highNoColor, setHighNoColor] = useState<boolean>(() => {
    const saved = localStorage.getItem("status_high_nocolor");
    return saved === "true";
  });
  const [medNoColor, setMedNoColor] = useState<boolean>(() => {
    const saved = localStorage.getItem("status_med_nocolor");
    return saved === "true";
  });
  const [lowNoColor, setLowNoColor] = useState<boolean>(() => {
    const saved = localStorage.getItem("status_low_nocolor");
    return saved === "true";
  });

  const updateLockedNoColor = (val: boolean) => {
    setLockedNoColor(val);
    localStorage.setItem("status_locked_nocolor", val ? "true" : "false");
    saveSystemSettingsToCloud({ lockedNoColor: val });
  };
  const updateHighNoColor = (val: boolean) => {
    setHighNoColor(val);
    localStorage.setItem("status_high_nocolor", val ? "true" : "false");
    saveSystemSettingsToCloud({ highNoColor: val });
  };
  const updateMedNoColor = (val: boolean) => {
    setMedNoColor(val);
    localStorage.setItem("status_med_nocolor", val ? "true" : "false");
    saveSystemSettingsToCloud({ medNoColor: val });
  };
  const updateLowNoColor = (val: boolean) => {
    setLowNoColor(val);
    localStorage.setItem("status_low_nocolor", val ? "true" : "false");
    saveSystemSettingsToCloud({ lowNoColor: val });
  };

  const getTaskCardClassString = (isLocked: boolean, priority: string, completed: boolean, hoverable = true, isInProgress = false, isOpenPlaceholder = false) => {
    if (isDayPlannerActive) {
      if (completed) {
        return "bg-white border-none text-slate-400 line-through opacity-50 shadow-none transition-all";
      }
      return "bg-white text-slate-800 border-none shadow-[0_6px_14px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.08),0_2px_5px_rgba(0,0,0,0.03)] hover:translate-y-[-1.5px] transition-all duration-250";
    }

    if (isInProgress && !completed) {
      return "focus-card-active-glow text-white";
    }

    if (completed) {
      return "bg-slate-900/40 border-slate-800/50 border-t-slate-700/30 border-b-[3px] border-b-slate-950/70 opacity-50 [filter:brightness(0.5)] shadow-[0_6px_16px_-4px_rgba(0,0,0,0.4)] text-white/50 transition-all";
    }

    if (isOpenPlaceholder && !completed) {
      return isDark
        ? "open-placeholder-gold-glow text-amber-150"
        : "open-placeholder-gold-glow-light text-amber-950";
    }

    if (isLocked) {
      if (lockedSolidColorEnabled) {
        return isDark
          ? "appt-locked-solid-card-glow text-white"
          : "appt-locked-solid-card-glow-light text-white";
      }
      if (lockedNoColor) {
        return isDark 
          ? `plain-card-dark-glow text-slate-100` 
          : `plain-card-light-glow bg-white border border-slate-200 hover:border-slate-350 text-slate-850 shadow-[0_4px_12px_rgba(0,0,0,0.05)]`;
      }
      return isDark
        ? "appt-locked-card-glow text-white"
        : "appt-locked-card-glow-light text-slate-900";
    }

    if (priority === "none") {
      return isDark 
        ? `plain-card-dark-glow text-slate-300`
        : `plain-card-light-glow bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.01)]`;
    }

    if (priority === "high") {
      if (highNoColor) {
        return isDark 
          ? `plain-card-dark-glow text-slate-100` 
          : `plain-card-light-glow bg-white/80 border border-slate-200 hover:border-slate-350 text-slate-850 shadow-[0_4px_12px_rgba(0,0,0,0.05)]`;
      }
      return `high-priority-amber-glow ${hoverable ? "hover:border-amber-400/50" : ""} text-white`;
    }

    if (priority === "medium") {
      if (medNoColor) {
        return isDark 
          ? `plain-card-dark-glow text-slate-100` 
          : `plain-card-light-glow bg-white/80 border border-slate-200 hover:border-slate-350 text-slate-850 shadow-[0_4px_12px_rgba(0,0,0,0.05)]`;
      }
      return `med-priority-yellow-glow ${hoverable ? "hover:border-yellow-400/50" : ""} text-white`;
    }

    // Low Priority
    if (lowNoColor) {
      return isDark 
        ? `plain-card-dark-glow text-slate-100` 
        : `plain-card-light-glow bg-white/80 border border-slate-200 hover:border-slate-350 text-slate-850 shadow-[0_4px_12px_rgba(0,0,0,0.05)]`;
    }
    return `low-priority-blue-glow ${hoverable ? "hover:border-blue-400/50" : ""} text-white`;
  };

  // Timeline zoom height scale factor
  const [timelineHeightScale, setTimelineHeightScale] = useState<number>(() => {
    const saved = localStorage.getItem("timeline_height_scale");
    return saved ? parseFloat(saved) : 1.0;
  });
  const [zoomFeedback, setZoomFeedback] = useState<string | null>(null);
  const zoomFeedbackTimeoutRef = useRef<any>(null);

  const triggerZoomFeedback = (msg: string) => {
    setZoomFeedback(msg);
    if (zoomFeedbackTimeoutRef.current) {
      clearTimeout(zoomFeedbackTimeoutRef.current);
    }
    zoomFeedbackTimeoutRef.current = setTimeout(() => {
      setZoomFeedback(null);
    }, 2000);
  };

  const BASE_HOUR_HEIGHT = fontSizeScale === "large" ? 112 : fontSizeScale === "readable" ? 104 : 96;
  const HOUR_HEIGHT = Math.round(BASE_HOUR_HEIGHT * timelineHeightScale);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Every second, tick the focus clock for real-time countdown ONLY when a task or buffer is active
  const hasActiveTaskRunning = useMemo(() => tasks.some(t => t.isInProgress), [tasks]);
  useEffect(() => {
    if (!hasActiveTaskRunning && !activeBufferTaskId) {
      return;
    }
    const timer = setInterval(() => {
      setFocusTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [hasActiveTaskRunning, activeBufferTaskId]);

  // Monitor active buffer countdown to trigger completion
  useEffect(() => {
    if (activeBufferTaskId && activeBufferType && bufferStartedAt) {
      const task = tasks.find(t => t.id === activeBufferTaskId);
      if (task) {
        const durationMins = activeBufferType === "before" ? (task.travelBefore || 0) : (task.travelAfter || 0);
        const elapsedMs = focusTick - bufferStartedAt;
        const remainingSecs = (durationMins * 60) - Math.floor(elapsedMs / 1000);
        if (remainingSecs <= 0) {
          // Clear active buffer state
          setActiveBufferTaskId(null);
          setActiveBufferType(null);
          setBufferStartedAt(null);

          const updatedTasks = tasks.map(t => {
            if (t.id === task.id) {
              return {
                ...t,
                ...(activeBufferType === "before" ? { travelBeforeCompleted: true } : { travelAfterCompleted: true })
              };
            }
            return t;
          });
          saveWorkspace(updatedTasks);

          // If before-task travel buffer hits 0, auto-focus active task
          if (activeBufferType === "before" && !task.isInProgress) {
            const freshTask = updatedTasks.find(t => t.id === task.id);
            if (freshTask) {
              handleStartTask(freshTask);
            }
          }
        }
      }
    }
  }, [focusTick, activeBufferTaskId, activeBufferType, bufferStartedAt, tasks]);



  // Snap the deck content container to top when turning pages or switching modes, providing a pure top-aligned page turn experience
  useEffect(() => {
    if (viewMode === "focus" && deckScrollContainerRef.current) {
      deckScrollContainerRef.current.scrollTop = 0;
    }
  }, [focusCardPage, isNoteMode, viewMode]);

  const [lastNonDeckView, setLastNonDeckView] = useState<string>("timeline");
  const [isInitialFocusLoad, setIsInitialFocusLoad] = useState(true);

  useEffect(() => {
    if (viewMode === "focus") {
      setIsInitialFocusLoad(true);
      const timer = setTimeout(() => {
        setIsInitialFocusLoad(false);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setIsInitialFocusLoad(true);
    }
  }, [viewMode]);

  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [highlightedCalendarTaskId, setHighlightedCalendarTaskId] = useState<string | null>(null);

  // Deck drag and drop variables
  const [deckDragId, setDeckDragId] = useState<string | null>(null);
  const [deckDragY, setDeckDragY] = useState<number>(0);
  const [deckDragX, setDeckDragX] = useState<number>(0);
  const [deckHoveredIndex, setDeckHoveredIndex] = useState<number | null>(null);

  const deckDragIdRef = useRef<string | null>(null);
  const deckDragYRef = useRef<number>(0);
  const deckDragXRef = useRef<number>(0);
  const deckHoveredIndexRef = useRef<number | null>(null);
  const deckCardRectsRef = useRef<Array<{ id: string; topInContainer: number; height: number; centerInContainer: number }>>([]);
  const deckRafRef = useRef<number | null>(null);
  const deckScrollContainerRef = useRef<HTMLDivElement>(null);
  const deckTaskRefs = useRef<{ [id: string]: HTMLElement | null }>({});

  // SWIPE GESTURE DETECTORS FOR DATE DECREMENT/INCREMENT
  const [swipeFeedback, setSwipeFeedback] = useState<{
    visible: boolean;
    dateText: string;
    direction: "left" | "right";
  } | null>(null);

  const [activeSwipeDelta, setActiveSwipeDelta] = useState<number>(0);
  const [prioritySelectTask, setPrioritySelectTask] = useState<Task | null>(null);

  const feedbackTimeoutRef = useRef<any>(null);
  const panelTouchStartXRef = useRef<number | null>(null);
  const panelTouchStartYRef = useRef<number | null>(null);
  const panelTouchStartTimeRef = useRef<number>(0);

  const handlePanelTouchStart = (e: React.TouchEvent) => {
    if (deckDragId || timelineDragId || isSelectingForRoutine) return;
    if (viewMode === "timeline" && timelineLayoutMode !== "vertical") return;
    if (e.touches.length === 1) {
      panelTouchStartXRef.current = e.touches[0].clientX;
      panelTouchStartYRef.current = e.touches[0].clientY;
      panelTouchStartTimeRef.current = Date.now();
      setActiveSwipeDelta(0);
    }
  };

  const handlePanelTouchMove = (e: React.TouchEvent) => {
    if (panelTouchStartXRef.current === null) return;
    if (deckDragId || timelineDragId || isSelectingForRoutine) return;
    if (viewMode === "timeline" && timelineLayoutMode !== "vertical") return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - panelTouchStartXRef.current;
    const dy = currentY - panelTouchStartYRef.current;

    // Primarily horizontal movement begins hint arrow appearance
    if (Math.abs(dx) > 15 && Math.abs(dy) < 60) {
      setActiveSwipeDelta(dx);
    } else {
      setActiveSwipeDelta(0);
    }
  };

  const handlePanelTouchEnd = (e: React.TouchEvent) => {
    setActiveSwipeDelta(0);
    if (panelTouchStartXRef.current === null || panelTouchStartYRef.current === null) return;
    if (deckDragId || timelineDragId || isSelectingForRoutine || (viewMode === "timeline" && timelineLayoutMode !== "vertical")) {
      panelTouchStartXRef.current = null;
      panelTouchStartYRef.current = null;
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - panelTouchStartXRef.current;
    const dy = endY - panelTouchStartYRef.current;
    const duration = Date.now() - panelTouchStartTimeRef.current;

    panelTouchStartXRef.current = null;
    panelTouchStartYRef.current = null;

    // "widened swipe" -> requires substantial horizontal distance (e.g. >= 115px) 
    // and must be heavily horizontal relative to vertical shift to prevent trigger on normal list scrolls
    const minHorizontalDistance = 115;
    const maxVerticalDistance = 75;

    if (duration < 650 && Math.abs(dx) > minHorizontalDistance && Math.abs(dy) < maxVerticalDistance) {
      if (dx < 0) {
        handleDayForward();
      } else {
        handleDayBackward();
      }
    }
  };

  const handleDayBackward = () => {
    triggerHaptic("light");
    const parts = selectedDate.split("-").map(Number);
    const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const targetDateString = getLocalDateString(d);
    setSelectedDate(targetDateString);
    setSwipeFeedback({
      visible: true,
      dateText: formatDate(targetDateString),
      direction: "right"
    });
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setSwipeFeedback(null);
    }, 1000);
  };

  const handleDayForward = () => {
    triggerHaptic("light");
    const parts = selectedDate.split("-").map(Number);
    const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const targetDateString = getLocalDateString(d);
    setSelectedDate(targetDateString);
    setSwipeFeedback({
      visible: true,
      dateText: formatDate(targetDateString),
      direction: "left"
    });
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setSwipeFeedback(null);
    }, 1000);
  };

  const triggerHaptic = (type: "light" | "medium" | "heavy" | "success" | "double" | "selection" | string) => {
    if (!hapticsEnabled) return;
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        if (type === "light" || type === "selection") {
          navigator.vibrate(15);
        } else if (type === "medium") {
          navigator.vibrate(30);
        } else if (type === "heavy") {
          navigator.vibrate(60);
        } else if (type === "success") {
          navigator.vibrate([40, 30, 40]);
        } else if (type === "double") {
          navigator.vibrate([15, 50, 15]);
        }
      } catch (err) {
        console.warn("Haptic vibration blocked or failed in sandboxed context:", err);
      }
    }
  };

  const handleDeckDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    task: Task
  ) => {
    e.stopPropagation();
    if (isSelectingForRoutine) return;

    const posY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const posX = "touches" in e ? e.touches[0].clientX : e.clientX;

    deckDragStartPos.current = { x: posX, y: posY };
    pendingDeckDragTaskRef.current = task;

    if (deckLongPressTimer.current) {
      clearTimeout(deckLongPressTimer.current);
    }

    // Require 225ms long-press to activate dragging (25% faster activation)
    deckLongPressTimer.current = setTimeout(() => {
      deckLongPressTimer.current = null;
      if (pendingDeckDragTaskRef.current) {
        triggerHaptic("heavy"); // Solid vibration warning active lift!
        setDeckDragId(task.id);
        setDeckDragY(posY);
        setDeckDragX(posX);
        deckDragIdRef.current = task.id;
        deckDragYRef.current = posY;
        deckDragXRef.current = posX;

        const listTasks = (deckTab === "active" ? filteredActiveTasks : deckTab === "completed" ? filteredCompletedTasks : filteredBacklogTasks) as Task[];
        const generalTasks = listTasks;
        const idx = generalTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          deckHoveredIndexRef.current = idx;
          setDeckHoveredIndex(idx);
        }

        // Cache task card bounding rects in container-content coordinate space
        const container = deckScrollContainerRef.current;
        const containerRect = container ? container.getBoundingClientRect() : { top: 0, height: 0 };
        const initialScrollTop = container ? container.scrollTop : 0;

        deckCardRectsRef.current = generalTasks.map((t) => {
          const el = deckTaskRefs.current[t.id];
          if (el) {
            const rect = el.getBoundingClientRect();
            const topInContainer = rect.top - containerRect.top + initialScrollTop;
            return {
              id: t.id,
              topInContainer,
              height: rect.height,
              centerInContainer: topInContainer + rect.height / 2
            };
          }
          return null;
        }).filter(Boolean) as Array<{ id: string; topInContainer: number; height: number; centerInContainer: number }>;
      }
    }, dragLongPressMs);
  };

  const handleDeckDragMove = (clientX: number, clientY: number) => {
    deckDragYRef.current = clientY;
    deckDragXRef.current = clientX;

    if (!deckRafRef.current) {
      deckRafRef.current = requestAnimationFrame(() => {
        deckRafRef.current = null;

        // Throttle coordinate updates to 60/120fps display refresh cycles
        setDeckDragX(deckDragXRef.current);
        setDeckDragY(deckDragYRef.current);

        const container = deckScrollContainerRef.current;
        const containerRect = container ? container.getBoundingClientRect() : { top: 0, height: 0 };
        const currentScrollTop = container ? container.scrollTop : 0;
        const dragYInContainer = clientY - containerRect.top + currentScrollTop;

        const listTasks = (deckTab === "active" ? filteredActiveTasks : deckTab === "completed" ? filteredCompletedTasks : filteredBacklogTasks) as Task[];
        let foundIndex: number | null = null;
        let closestDist = Infinity;

        for (let i = 0; i < listTasks.length; i++) {
          const t = listTasks[i];
          const el = deckTaskRefs.current[t.id];
          let topInContainer: number;
          let bottomInContainer: number;
          let centerInContainer: number;

          if (el) {
            const rect = el.getBoundingClientRect();
            topInContainer = rect.top - containerRect.top + currentScrollTop;
            bottomInContainer = topInContainer + rect.height;
            centerInContainer = topInContainer + rect.height / 2;
          } else {
            const cached = deckCardRectsRef.current.find(c => c.id === t.id);
            if (cached) {
              topInContainer = cached.topInContainer;
              bottomInContainer = topInContainer + cached.height;
              centerInContainer = cached.centerInContainer;
            } else {
              continue;
            }
          }

          if (dragYInContainer >= topInContainer && dragYInContainer <= bottomInContainer) {
            foundIndex = i;
            break;
          }
          const dist = Math.abs(dragYInContainer - centerInContainer);
          if (dist < closestDist) {
            closestDist = dist;
            foundIndex = i;
          }
        }

        if (foundIndex !== null && foundIndex !== deckHoveredIndexRef.current) {
          deckHoveredIndexRef.current = foundIndex;
          setDeckHoveredIndex(foundIndex);
        }
      });
    }
  };

  const handleDeckDragEnd = () => {
    if (deckLongPressTimer.current) {
      clearTimeout(deckLongPressTimer.current);
      deckLongPressTimer.current = null;
    }
    if (deckRafRef.current) {
      cancelAnimationFrame(deckRafRef.current);
      deckRafRef.current = null;
    }
    pendingDeckDragTaskRef.current = null;
    deckDragStartPos.current = null;
    deckCardRectsRef.current = [];

    const targetId = deckDragIdRef.current;
    const targetHoveredIndex = deckHoveredIndexRef.current;

    setDeckDragId(null);
    setDeckHoveredIndex(null);
    deckDragIdRef.current = null;
    deckHoveredIndexRef.current = null;

    if (!targetId || targetHoveredIndex === null) {
      triggerHaptic("light"); // standard release
      if (targetId) {
        const listTasks = (deckTab === "active" ? filteredActiveTasks : deckTab === "completed" ? filteredCompletedTasks : filteredBacklogTasks) as Task[];
        const tObj = listTasks.find(x => x.id === targetId);
        if (tObj) {
          showDragToast(
            `No change: "${tObj.title}" was released without any position movement.`,
            'info',
            tObj.id
          );
        }
      }
      return;
    }

    const listTasks = (deckTab === "active" ? filteredActiveTasks : deckTab === "completed" ? filteredCompletedTasks : filteredBacklogTasks) as Task[];
    const generalTasks = [...listTasks];
    const taskIndex = generalTasks.findIndex(t => t.id === targetId);

    if (taskIndex !== -1) {
      const draggedTask = generalTasks[taskIndex];
      if (targetHoveredIndex === taskIndex) {
        showDragToast(
          `No change: "${draggedTask.title}" was dropped back in its original position in the deck.`,
          'info',
          draggedTask.id
        );
      } else {
        triggerHaptic("success"); // satisfy the physical feel of rearrangement!
        
        // Group tasks into contiguous connected units so that sequence tasks are treated as a single connected block/object
        const units: Array<{
          id: string; // groupId or taskId
          isGroup: boolean;
          groupId?: string;
          tasks: Task[];
          isLocked: boolean;
        }> = [];
        const processedGroups = new Set<string>();

        generalTasks.forEach(task => {
          if (task.groupId && !task.isUnlinked) {
            if (!processedGroups.has(task.groupId)) {
              processedGroups.add(task.groupId);
              // Get all tasks in this group from list, preserving current deck order
              const groupTasks = generalTasks.filter(t => t.groupId === task.groupId && !t.isUnlinked);
              const groupIsLocked = groupTasks.some(t => t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked));
              units.push({
                id: task.groupId,
                isGroup: true,
                groupId: task.groupId,
                tasks: groupTasks,
                isLocked: groupIsLocked
              });
            }
          } else {
            units.push({
              id: task.id,
              isGroup: false,
              tasks: [task],
              isLocked: !!task.isLocked
            });
          }
        });

        const draggedUnitIndex = units.findIndex(u => u.tasks.some(t => t.id === targetId));
        const hoveredTask = generalTasks[targetHoveredIndex];
        const hoveredUnitIndex = hoveredTask ? units.findIndex(u => u.tasks.some(t => t.id === hoveredTask.id)) : -1;

        if (draggedUnitIndex !== -1 && hoveredUnitIndex !== -1 && draggedUnitIndex !== hoveredUnitIndex) {
          const reorderedUnits = [...units];
          const [draggedUnit] = reorderedUnits.splice(draggedUnitIndex, 1);
          reorderedUnits.splice(hoveredUnitIndex, 0, draggedUnit);

          // Flatten units back down to a single array of tasks
          const reorderedTasks: Task[] = [];
          reorderedUnits.forEach(u => {
            reorderedTasks.push(...u.tasks);
          });

          const draggedNewFlatIndex = reorderedTasks.findIndex(t => t.id === draggedTask.id);
          const taskBefore = draggedNewFlatIndex > 0 ? reorderedTasks[draggedNewFlatIndex - 1] : null;
          const taskAfter = draggedNewFlatIndex < reorderedTasks.length - 1 ? reorderedTasks[draggedNewFlatIndex + 1] : null;

          let updatedTimeStr = draggedTask.time;
          let displacedStr = "";

          const isTaskLocked = (t: Task) => !!(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked));

          if (isTaskLocked(draggedTask) && deckTab === "active") {
            const beforeFlexible = taskBefore && !isTaskLocked(taskBefore);
            const afterFlexible = taskAfter && !isTaskLocked(taskAfter);

            if (beforeFlexible && afterFlexible) {
              const startMins = timeToMinutes(taskBefore.computedTime || taskBefore.time || "08:00");
              const durationMins = parseDurationToMinutes(taskBefore.duration) || 30;
              const endMins = startMins + durationMins + (taskBefore.travelAfter || 0);
              const newStartTimeMins = endMins + (draggedTask.travelBefore || 0);
              updatedTimeStr = minutesToTimeString(newStartTimeMins);
              displacedStr = ` Placed between flexible tasks; scheduled at ${formatTime(updatedTimeStr)} and rippling other flexible tasks.`;
            }
          }

          const updatedGeneral = reorderedTasks.map((t, idx) => {
            if (t.id === draggedTask.id) {
              return {
                ...t,
                time: updatedTimeStr,
                order: idx + 1
              };
            }
            return {
              ...t,
              order: idx + 1
            };
          });

          const updatedAllTasks = tasks.map(t => {
            const updatedItem = updatedGeneral.find(g => g.id === t.id);
            if (updatedItem) {
              return { ...t, order: updatedItem.order, time: updatedItem.time };
            }
            return t;
          });

          saveWorkspace(updatedAllTasks);

          const toastMsg = draggedUnit.isGroup
            ? `Saved: Moved sequence block "${draggedTask.groupName || 'Sequence Block'}" to its new position contiguous and as one connected object.`
            : `Saved: Reordered "${draggedTask.title}" to position ${draggedNewFlatIndex + 1}.${displacedStr}`;

          showDragToast(
            toastMsg,
            'success',
            draggedTask.id
          );
        } else {
          showDragToast(
            `No change: "${draggedTask.title}" was dropped within similar sequence group boundaries.`,
            'info',
            draggedTask.id
          );
        }
      }
    }
  };

  useEffect(() => {
    if (!deckDragId) return;

    let animationFrameId: number;

    const tick = () => {
      if (!deckDragIdRef.current) return;

      const container = deckScrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const clientY = deckDragYRef.current;
        const clientX = deckDragXRef.current;

        const threshold = 100; // 100px zone at top and bottom to start scrolling
        const topBoundary = rect.top + threshold;
        const bottomBoundary = rect.bottom - threshold;

        let scrolled = false;

        if (clientY < topBoundary && clientY > rect.top - 60) {
          const intensity = Math.min(1, Math.max(0, (topBoundary - clientY) / threshold));
          const speed = intensity * 20; // fast responsive scrolling up to 20px per frame
          container.scrollTop = Math.max(0, container.scrollTop - speed);
          scrolled = true;
        } else if (clientY > bottomBoundary && clientY < rect.bottom + 60) {
          const intensity = Math.min(1, Math.max(0, (clientY - bottomBoundary) / threshold));
          const speed = intensity * 20; // fast responsive scrolling down to 20px per frame
          container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + speed);
          scrolled = true;
        }

        if (scrolled) {
          handleDeckDragMove(clientX, clientY);
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleDeckDragMove(e.clientX, e.clientY);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches && e.touches[0]) {
        handleDeckDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleWindowMouseUp = () => {
      handleDeckDragEnd();
    };

    const handleWindowTouchEnd = () => {
      handleDeckDragEnd();
    };

    window.addEventListener("mousemove", handleWindowMouseMove, { passive: true });
    window.addEventListener("mouseup", handleWindowMouseUp, { passive: true });
    window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
    window.addEventListener("touchend", handleWindowTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleWindowTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
      window.removeEventListener("touchcancel", handleWindowTouchEnd);
    };
  }, [deckDragId]);

  // Automatically track last viewMode that isn't tasks list / deck
  useEffect(() => {
    if (viewMode && viewMode !== "deck") {
      setLastNonDeckView(viewMode);
    }
  }, [viewMode]);

  // Reset focus browse index when queue tab switches
  useEffect(() => {
    setFocusBrowseIndex(0);
  }, [deckTab]);

  // Dynamic system states
  const [showAdd, setShowAdd] = useState(false);
  const [reportIncludeCompleted, setReportIncludeCompleted] = useState<boolean>(true);
  const [taskFormPage, setTaskFormPage] = useState<1 | 2 | 3 | 4>(1);
  const [taskInteractions, setTaskInteractions] = useState<Interaction[]>([]);
  const [taskOrder, setTaskOrder] = useState<number | undefined>(undefined);
  const [showFlexHoursDropdown, setShowFlexHoursDropdown] = useState(false);
  const [flexibleStartDefaultTime, setFlexibleStartDefaultTime] = useState<string>(() => {
    return localStorage.getItem("taskpass_flex_start_time") || "09:00";
  });
  const [flexibleEndDefaultTime, setFlexibleEndDefaultTime] = useState<string>(() => {
    return localStorage.getItem("taskpass_flex_end_time") || "17:00";
  });
  const [interactionTypes, setInteractionTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem("taskpass_interaction_types_v1");
    return saved ? JSON.parse(saved) : ["Email", "Phone Call", "Text Message"];
  });
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [newInteractionType, setNewInteractionType] = useState("Email");
  const [newInteractionDirection, setNewInteractionDirection] = useState<"sent" | "received">("sent");
  const [newInteractionDateTime, setNewInteractionDateTime] = useState("");
  const [newInteractionDesc, setNewInteractionDesc] = useState("");
  const [newInteractionNotes, setNewInteractionNotes] = useState("");
  const [isAddingCustomInteractionType, setIsAddingCustomInteractionType] = useState(false);
  const [customInteractionTypeVal, setCustomInteractionTypeVal] = useState("");

  const saveFlexibleDefaultTimes = (start: string, end: string) => {
    setFlexibleStartDefaultTime(start);
    setFlexibleEndDefaultTime(end);
    localStorage.setItem("taskpass_flex_start_time", start);
    localStorage.setItem("taskpass_flex_end_time", end);
    saveSystemSettingsToCloud({ flexibleStartDefaultTime: start, flexibleEndDefaultTime: end } as any);
  };

  const handleAddNewInteractionType = () => {
    if (!customInteractionTypeVal.trim()) return;
    const updated = [...interactionTypes, customInteractionTypeVal.trim()];
    setInteractionTypes(updated);
    localStorage.setItem("taskpass_interaction_types_v1", JSON.stringify(updated));
    setNewInteractionType(customInteractionTypeVal.trim());
    setCustomInteractionTypeVal("");
    setIsAddingCustomInteractionType(false);
    triggerHaptic("success");
  };

  const handleSaveNewInteraction = () => {
    if (!newInteractionDesc.trim()) {
      alert("Please enter a description for the interaction.");
      return;
    }
    const newI: Interaction = {
      id: `interaction_${Date.now()}`,
      type: newInteractionType,
      direction: newInteractionDirection,
      dateTime: newInteractionDateTime || new Date().toISOString().substring(0, 16),
      description: newInteractionDesc.trim(),
      notes: newInteractionNotes.trim()
    };
    const updated = [newI, ...taskInteractions];
    setTaskInteractions(updated);
    
    // Clear form
    setNewInteractionDesc("");
    setNewInteractionNotes("");
    setIsAddingInteraction(false);
    triggerHaptic("success");
  };

  const handleDeleteInteraction = (id: string) => {
    const updated = taskInteractions.filter(i => i.id !== id);
    setTaskInteractions(updated);
    triggerHaptic("medium");
  };

  const handleAddInteractionAsTask = (i: Interaction) => {
    const tDate = i.dateTime.split("T")[0] || selectedDate;
    const tTime = i.dateTime.split("T")[1]?.substring(0, 5) || "09:00";
    const newT: Task = {
      id: `task_${Date.now()}`,
      title: `${i.type}: ${i.description}`,
      date: tDate,
      time: tTime,
      duration: "30 min",
      isLocked: false,
      completed: false,
      notes: i.notes ? `Interaction Notes:\n${i.notes}` : `Created from past interaction tracking.`,
      priority: "none"
    };
    const updatedTasks = [...tasks, newT];
    setTasks(updatedTasks);
    saveWorkspace(updatedTasks);
    triggerHaptic("success");
    alert(`Successfully added a new flexible task "${newT.title}" on ${tDate}!`);
  };

  const handleSameTimeNextDay = () => {
    const parts = taskDate.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + 1);
      const nextDayStr = getLocalDateString(d);
      setTaskDate(nextDayStr);
      alert(`Rescheduled to next day: ${nextDayStr} at ${taskTime}`);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const nextDayStr = getLocalDateString(d);
      setTaskDate(nextDayStr);
      alert(`Rescheduled to next day: ${nextDayStr} at ${taskTime}`);
    }
  };

  const handleRescheduleFlexible = (mode: "same_priority" | "before_start" | "before_stop" | "last_of_day") => {
    // Make sure the task is flexible
    setTaskIsLocked(false);
    
    // Get other tasks for the same day (excluding current editing task if exists)
    const sameDayTasks = tasksRef.current.filter(t => t.date === taskDate && t.id !== editingTask?.id);
    
    // Filter for flexible, incomplete tasks
    const otherFlexTasks = sameDayTasks.filter(t => 
      !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && 
      !t.completed
    );

    if (mode === "same_priority") {
      const samePriorityTasks = otherFlexTasks.filter(t => (t.priority || "none") === (taskPriority || "none"));
      const maxOrder = samePriorityTasks.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
      setTaskOrder(maxOrder + 1);
      alert(`Rescheduled to be the last of same priority (${taskPriority}) for the day.`);
    } else if (mode === "last_of_day") {
      const nonePriorityTasks = otherFlexTasks.filter(t => (t.priority || "none") === "none");
      const maxOrder = nonePriorityTasks.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
      setTaskPriority("none");
      setTaskOrder(maxOrder + 1);
      alert(`Rescheduled to be the last of all flexible tasks for the day.`);
    } else {
      const targetTimeStr = mode === "before_start" ? flexibleStartDefaultTime : flexibleEndDefaultTime;
      const targetMins = timeToMinutes(targetTimeStr);
      
      const scheduledOther = scheduleDynamicTasks(
        sameDayTasks, 
        taskDate === getLocalDateString(new Date()), 
        timeToMinutes(new Date().toTimeString().substring(0, 5)), 
        timeToMinutes(activeDayStartHour)
      );
      
      const flexBeforeTarget = scheduledOther.filter(t => 
        !(t.isLocked || (t.sequenceLocked && t.groupId && !t.isUnlinked)) && 
        !t.completed &&
        timeToMinutes(t.computedTime || t.time || "00:00") < targetMins
      );

      if (flexBeforeTarget.length === 0) {
        setTaskPriority("high");
        setTaskOrder(1);
      } else {
        flexBeforeTarget.sort((a, b) => timeToMinutes(a.computedTime || a.time || "00:00") - timeToMinutes(b.computedTime || b.time || "00:00"));
        const lastFlexBefore = flexBeforeTarget[flexBeforeTarget.length - 1];
        const targetPriority = lastFlexBefore.priority || "none";
        setTaskPriority(targetPriority);
        setTaskOrder((lastFlexBefore.order ?? 0) + 1);
      }
      alert(`Rescheduled to be the last of flexible tasks before ${targetTimeStr}.`);
    }
  };

  // Autofocus title field when task creation or edit modal is shown
  useEffect(() => {
    if (showAdd) {
      const focusTitle = () => {
        const targetElement = document.getElementById("task-form-title-input");
        if (targetElement) {
          targetElement.focus();
          if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
            const val = targetElement.value;
            targetElement.value = "";
            targetElement.value = val;
            if (typeof targetElement.setSelectionRange === "function") {
              targetElement.setSelectionRange(val.length, val.length);
            }
          }
        }
      };
      
      focusTitle();
      const t1 = setTimeout(focusTitle, 60);
      const t2 = setTimeout(focusTitle, 180);
      const t3 = setTimeout(focusTitle, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [showAdd]);

  const [showDeploy, setShowDeploy] = useState(false);
  const [conflictSequenceId, setConflictSequenceId] = useState<string | null>(null);
  const [conflictsToResolve, setConflictsToResolve] = useState<Task[]>([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState<number>(0);
  const [conflictRescheduleTimes, setConflictRescheduleTimes] = useState<Record<string, string>>({});
  const [conflictRescheduleDates, setConflictRescheduleDates] = useState<Record<string, string>>({});
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, "reschedule_top_bottom" | "custom" | "override">>({});
  const [showMagicDay, setShowMagicDay] = useState(false);
  const [showRoutines, setShowRoutines] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Form entries
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("09:00");
  const [taskDuration, setTaskDuration] = useState(() => `${localStorage.getItem("default_duration") || "30"} min`);
  const [taskIsLocked, setTaskIsLocked] = useState(false);
  const [taskIsOpenPlaceholder, setTaskIsOpenPlaceholder] = useState(false);
  const [taskIsAllDay, setTaskIsAllDay] = useState(false);
  const [taskLocation, setTaskLocation] = useState("");
  const [taskAttendees, setTaskAttendees] = useState("");
  const [taskTravelBefore, setTaskTravelBefore] = useState(0);
  const [taskTravelAfter, setTaskTravelAfter] = useState(0);
  const [taskBeforeBufferPurpose, setTaskBeforeBufferPurpose] = useState("Preparation");
  const [taskAfterBufferPurpose, setTaskAfterBufferPurpose] = useState("Wrap-up");
  const [isEstimatingTravel, setIsEstimatingTravel] = useState(false);

  // Autofocus chosen field in Narrative Mode
  useEffect(() => {
    if (showAdd && focusFieldName) {
      const triggerFocus = () => {
        let targetElement: HTMLElement | null = null;
        if (focusFieldName === "title") {
          targetElement = document.getElementById("task-form-title-input");
        } else if (focusFieldName === "collaborators" || focusFieldName === "attendees") {
          targetElement = document.getElementById("task-form-attendees-input");
        } else if (focusFieldName === "location") {
          targetElement = document.getElementById("task-form-location-input");
        } else if (focusFieldName === "priority") {
          targetElement = document.getElementById("task-form-priority-container");
          if (targetElement) {
            const firstButton = targetElement.querySelector("button");
            if (firstButton) {
              (firstButton as HTMLElement).focus();
            }
          }
          setFocusFieldName(null);
          return;
        } else if (focusFieldName === "time") {
          targetElement = document.getElementById("task-form-time-select");
        }
        
        if (targetElement) {
          targetElement.focus();
          if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
            const val = targetElement.value;
            targetElement.value = "";
            targetElement.value = val;
          }
        }
      };

      const t1 = setTimeout(triggerFocus, 50);
      const t2 = setTimeout(() => {
        triggerFocus();
        setFocusFieldName(null);
      }, 350);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [showAdd, focusFieldName]);
  const [taskPhone, setTaskPhone] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskHelpfulLinks, setTaskHelpfulLinks] = useState("");
  const [taskHyperlink, setTaskHyperlink] = useState("");
  const [taskReminderTime, setTaskReminderTime] = useState("");
  const [taskPriority, setTaskPriority] = useState<"none" | "low" | "medium" | "high">("none");
  
  // Recurrence states
  const [taskIsRecurring, setTaskIsRecurring] = useState(false);
  const [taskRecurrenceFrequency, setTaskRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'special_day_of_month' | 'none'>('none');
  const [taskRecurrenceWeeklyDays, setTaskRecurrenceWeeklyDays] = useState<number[]>([]);
  const [taskRecurrenceWeeklyInterval, setTaskRecurrenceWeeklyInterval] = useState<number>(1);
  const [taskRecurrenceSpecialOccurrence, setTaskRecurrenceSpecialOccurrence] = useState<'First' | 'Second' | 'Third' | 'Fourth'>('First');
  const [taskRecurrenceSpecialWeekday, setTaskRecurrenceSpecialWeekday] = useState<number>(1);
  const defaultTaskFormMode = useAppStore((state) => state.defaultTaskFormMode);
  const [taskFormMode, setTaskFormMode] = useState<"basic" | "standard" | "narrative">(() => {
    return defaultTaskFormMode || "basic";
  });
  const [isBasicMode, setIsBasicMode] = useState<boolean>(() => {
    return localStorage.getItem("taskpass_is_basic_mode") === "true";
  });

  useEffect(() => {
    if (showAdd) {
      setTaskFormMode(defaultTaskFormMode || "basic");
    }
  }, [showAdd, defaultTaskFormMode]);
  
  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<Task[][]>([]);
  const [redoStack, setRedoStack] = useState<Task[][]>([]);
  
  const [categories, _setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("task_categories_v1");
    const arr = saved ? JSON.parse(saved) : ["Work", "Personal", "Errand"];
    return [...arr].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  });
  const setCategories = React.useCallback((newCats: string[] | ((prev: string[]) => string[])) => {
    if (typeof newCats === "function") {
      _setCategories((prev) => {
        const res = newCats(prev);
        return [...res].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      });
    } else {
      _setCategories([...newCats].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })));
    }
  }, []);
  const [collaborators, _setCollaborators] = useState<string[]>(() => {
    const saved = localStorage.getItem("task_collaborators_v1");
    const arr = saved ? JSON.parse(saved) : ["Sarah", "Alex", "Mom", "John"];
    return [...arr].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  });
  const setCollaborators = React.useCallback((newCols: string[] | ((prev: string[]) => string[])) => {
    if (typeof newCols === "function") {
      _setCollaborators((prev) => {
        const res = newCols(prev);
        return [...res].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      });
    } else {
      _setCollaborators([...newCols].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })));
    }
  }, []);
  const [taskCategory, setTaskCategory] = useState("");
  const [taskCollaborator, setTaskCollaborator] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryVal, setNewCategoryVal] = useState("");
  const [showNewCollaboratorInput, setShowNewCollaboratorInput] = useState(false);
  const [newCollaboratorVal, setNewCollaboratorVal] = useState("");
  const [showNewLocationInput, setShowNewLocationInput] = useState(false);
  const [newLocationVal, setNewLocationVal] = useState("");

  const [showNoteNewCategoryInput, setShowNoteNewCategoryInput] = useState(false);
  const [noteNewCategoryVal, setNoteNewCategoryVal] = useState("");
  const [showNoteNewCollaboratorInput, setShowNoteNewCollaboratorInput] = useState(false);
  const [noteNewCollaboratorVal, setNoteNewCollaboratorVal] = useState("");

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageCollaborators, setShowManageCollaborators] = useState(false);

  const [flexActivities, _setFlexActivities] = useState<string[]>(() => {
    const saved = localStorage.getItem("task_flex_activities_v1");
    const arr = saved ? JSON.parse(saved) : ["Preparation", "Warm-up", "Mindfulness", "Review", "Transit", "Wrap-up", "Wind down", "Documentation"];
    return [...arr].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  });
  const setFlexActivities = React.useCallback((newActs: string[] | ((prev: string[]) => string[])) => {
    if (typeof newActs === "function") {
      _setFlexActivities((prev) => {
        const res = newActs(prev);
        return [...res].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      });
    } else {
      _setFlexActivities([...newActs].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })));
    }
  }, []);

  const [showManageFlexActivities, setShowManageFlexActivities] = useState(false);
  const [editingFlexActivityKey, setEditingFlexActivityKey] = useState<string | null>(null);
  const [editingFlexActivityValue, setEditingFlexActivityValue] = useState("");
  const [deletingFlexActivityKey, setDeletingFlexActivityKey] = useState<string | null>(null);
  const [newFlexActivityVal, setNewFlexActivityVal] = useState("");

  const handleRenameFlexActivity = (oldName: string, newName: string) => {
    if (!newName || newName.trim() === "" || oldName === newName) return;
    const trimmed = newName.trim();
    const updated = flexActivities.map((act) => (act === oldName ? trimmed : act));
    setFlexActivities(updated);
    localStorage.setItem("task_flex_activities_v1", JSON.stringify(updated));
    saveSystemSettingsToCloud({ flexActivities: updated });

    // Also update all tasks that used this oldName!
    const updatedTasks = tasks.map(t => {
      let changed = false;
      const updates: any = {};
      if (t.beforeBufferPurpose === oldName) {
        updates.beforeBufferPurpose = trimmed;
        changed = true;
      }
      if (t.afterBufferPurpose === oldName) {
        updates.afterBufferPurpose = trimmed;
        changed = true;
      }
      return changed ? { ...t, ...updates } : t;
    });
    saveWorkspace(updatedTasks);
  };

  const handleDeleteFlexActivity = (name: string) => {
    const updated = flexActivities.filter((act) => act !== name);
    setFlexActivities(updated);
    localStorage.setItem("task_flex_activities_v1", JSON.stringify(updated));
    saveSystemSettingsToCloud({ flexActivities: updated });
  };

  const handleAddNewFlexActivity = (name: string) => {
    if (!name || name.trim() === "") return;
    const trimmed = name.trim();
    if (!flexActivities.includes(trimmed)) {
      const updated = [...flexActivities, trimmed];
      setFlexActivities(updated);
      localStorage.setItem("task_flex_activities_v1", JSON.stringify(updated));
      saveSystemSettingsToCloud({ flexActivities: updated });
    }
  };

  const updateTaskBufferPurposeDirect = (taskId: string, bufferType: "before" | "after", purpose: string) => {
    activeFocusTaskIdRef.current = taskId;
    const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
    const updated = updatedTasks.map(t => {
      if (t.id === realTaskId) {
        if (bufferType === "before") {
          return { ...t, beforeBufferPurpose: purpose };
        } else {
          return { ...t, afterBufferPurpose: purpose };
        }
      }
      return t;
    });
    saveWorkspace(updated);
  };

  const handleEstimateTravelForTask = async (destinationOverride?: string) => {
    const dest = (destinationOverride || taskLocation || "").trim();
    if (!dest) {
      showDragToast("Please enter or select a location first to estimate travel", "warning");
      return;
    }
    setIsEstimatingTravel(true);
    try {
      const res = await estimateTravelDuration(dest);
      if (res && (res.suggestedBuffer || res.durationMinutes)) {
        const mins = Number(res.suggestedBuffer || res.durationMinutes);
        setTaskTravelBefore(mins);
        if (!taskBeforeBufferPurpose || taskBeforeBufferPurpose === "Preparation") {
          setTaskBeforeBufferPurpose("Transit");
        }
        const distInfo = res.distanceText ? ` (${res.distanceText})` : "";
        showDragToast(`üöó Commute to "${dest.split(',')[0]}": ~${res.durationMinutes}m${distInfo}. Pre-Trip Flex set to ${mins}m`, "success");
        triggerHaptic("success");
      } else {
        showDragToast(`Could not estimate commute for "${dest}". Set duration manually.`, "warning");
      }
    } catch (e) {
      console.error("Travel estimate error:", e);
      showDragToast("Error calculating travel duration", "warning");
    } finally {
      setIsEstimatingTravel(false);
    }
  };

  // --- Data Warehouse & Spending Tracker States ---
  const [showDataWarehouse, setShowDataWarehouse] = useState(false);
  const [showAIPlanCreatorModal, setShowAIPlanCreatorModal] = useState(false);
  const [aiPlanStep, setAiPlanStep] = useState<1 | 2 | 3 | 4>(1);
  const [aiPlanGoal, setAiPlanGoal] = useState("");
  const [aiPlanTime, setAiPlanTime] = useState("");
  const [aiPlanConstraints, setAiPlanConstraints] = useState("");
  const [aiPlanError, setAiPlanError] = useState("");
  const [aiPlanGenerating, setAiPlanGenerating] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<AIPlanGeneratedResult | null>(null);
  const [expandedTaskIdx, setExpandedTaskIdx] = useState<number | null>(0);
  const [dataWarehouseTab, setDataWarehouseTab] = useState<"plans" | "tasks" | "spending" | "directory" | "notes">("plans");
  const [savedAiPlans, setSavedAiPlans] = useState<SavedAIPlan[]>(() => {
    const saved = localStorage.getItem("taskpass_saved_ai_plans_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error parsing savedAiPlans from localStorage:", e);
      }
    }
    return getSampleAIPlans();
  });
  const [editingPlan, setEditingPlan] = useState<SavedAIPlan | null>(null);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const saveAiPlansToStore = (updated: SavedAIPlan[]) => {
    setSavedAiPlans(updated);
    localStorage.setItem("taskpass_saved_ai_plans_v1", JSON.stringify(updated));
    if (db && currentUser) {
      const uid = currentUser.uid;
      const userDocRef = doc(db, "users", uid);
      setDoc(userDocRef, { savedAiPlans: updated }, { merge: true }).catch(err => {
        console.error("Error updating user saved AI plans:", err);
      });
    }
  };
  const [directorySubTab, setDirectorySubTab] = useState<"collaborator" | "vendor" | "location">("collaborator");
  const [entityNotes, setEntityNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("entity_quick_notes_v1");
    return saved ? JSON.parse(saved) : {};
  });
  const [editingEntityKey, setEditingEntityKey] = useState<string | null>(null);
  const [editingEntityValue, setEditingEntityValue] = useState("");
  const [deletingEntityKey, setDeletingEntityKey] = useState<string | null>(null);
  const [newEntityName, setNewEntityName] = useState("");

  const saveEntityNotes = (updated: Record<string, string>) => {
    setEntityNotes(updated);
    localStorage.setItem("entity_quick_notes_v1", JSON.stringify(updated));
    if (db && currentUser) {
      const uid = currentUser.uid;
      const userDocRef = doc(db, "users", uid);
      setDoc(userDocRef, { entityQuickNotes: updated }, { merge: true }).catch(err => {
        console.error("Error updating user entity quick notes:", err);
      });
    }
  };

  const handleAddLocation = (name: string) => {
    const val = name.trim();
    if (!val) return;
    if (!favoriteLocations.includes(val)) {
      const updated = [...favoriteLocations, val];
      setFavoriteLocations(updated);
      localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updated));
      saveSystemSettingsToCloud({ favoriteLocations: updated });
    }
  };

  const handleRenameLocation = (oldVal: string, newVal: string) => {
    const val = newVal.trim();
    if (!val || oldVal === val) return;
    const updated = favoriteLocations.map(l => l === oldVal ? val : l);
    setFavoriteLocations(updated);
    localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updated));
    saveSystemSettingsToCloud({ favoriteLocations: updated });

    // Also update any tasks that used this location!
    const updatedTasks = tasks.map(t => {
      if (t.location === oldVal) {
        return { ...t, location: val };
      }
      return t;
    });
    saveWorkspace(updatedTasks);
  };

  const handleAddTimestampedNoteForEntity = (type: "collaborator" | "vendor" | "location", name: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const timestamp = `[${dateStr} ${timeStr}] `;
    const title = `Log: ${name}`;

    const newNote = {
      id: "note_" + Date.now(),
      rawText: timestamp,
      title: title,
      project: "General",
      collaborator: type === "collaborator" ? name : "None",
      location: type === "location" ? name : "",
      vendor: type === "vendor" ? name : "",
      associatedTaskId: "",
      associatedRoutineId: "",
      createdAt: Date.now()
    };

    const updated = [newNote, ...notes];
    saveNotes(updated);

    // Close warehouse to prevent overlapping overlays
    setShowDataWarehouse(false);

    // Open the Notes Repository
    setShowNotesRepo(true);

    // Set to edit mode
    setEditingNoteId(newNote.id);
    setEditNoteRawText(newNote.rawText || "");
    setEditNoteProject(newNote.project || "");
    setEditNoteCollaborator(newNote.collaborator || "");
    setEditNoteTime("");
    setEditNoteLocation(newNote.location || "");
    setEditNoteTaskId(newNote.associatedTaskId || "");
    setEditNoteRoutineId(newNote.associatedRoutineId || "");

    triggerHaptic("success");
  };

  const renderAISciencePlansTab = () => {
    const filteredPlans = savedAiPlans.filter(p => {
      if (!planSearchQuery.trim()) return true;
      const q = planSearchQuery.toLowerCase();
      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.goal || "").toLowerCase().includes(q) ||
        (p.constraints || "").toLowerCase().includes(q) ||
        (p.result?.summary?.scheduleType || "").toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-5 text-left">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                AI Science Plan Repository & Vault
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Save, edit, download as PDF, and deploy science-backed neuro-cognitive master plans.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search saved plans..."
                value={planSearchQuery}
                onChange={(e) => setPlanSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-950/80 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              {planSearchQuery && (
                <button
                  onClick={() => setPlanSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  √ó
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setAiPlanStep(1);
                setAiPlanGoal("");
                setAiPlanTime("");
                setAiPlanConstraints("");
                setAiPlanError("");
                setAiPlanResult(null);
                setShowAIPlanCreatorModal(true);
                triggerHaptic("light");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40 shrink-0"
            >
              <Sparkles size={13} />
              <span>Generate New Plan</span>
            </button>
          </div>
        </div>

        {/* Saved Plans List */}
        {savedAiPlans.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3 bg-slate-950/30">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Brain size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                No Science Plans Saved Yet
              </h4>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Generate your first custom neuro-cognitive protocol with ultradian focus blocks, fasting windows, and caffeine/macronutrient strategies.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setAiPlanStep(1);
                  setShowAIPlanCreatorModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Sparkles size={14} />
                <span>Create AI Plan Now</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const samples = getSampleAIPlans();
                  saveAiPlansToStore(samples);
                  triggerHaptic("success");
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Load Sample Plans</span>
              </button>
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-6 rounded-2xl border border-white/5 text-center text-xs text-slate-400">
            No saved plans matching "{planSearchQuery}".
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map((plan) => {
              const isExpanded = expandedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isDark ? "bg-slate-900/80 border-white/10" : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-100">{plan.title || "Science AI Plan"}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {plan.result?.summary?.scheduleType || "Science Plan"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-1 font-medium">
                          üéØ Goal: {plan.goal}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (plan.result?.tasks) {
                              const todayStr = getLocalDateString();
                              const newTasksList = plan.result.tasks.map((p, idx) => ({
                                id: `plan_task_${Date.now()}_${idx}`,
                                title: p.title,
                                date: todayStr,
                                time: p.time,
                                duration: p.duration,
                                collaborator: "Neuro Co-Pilot",
                                location: p.location || "Workspace",
                                notes: `[SCIENCE & NEUROBIOLOGY]\n${p.scienceNote}\n\n[PHYSIOLOGY & FUELING]\n${plan.result.summary.macronutrientStrategy}\nFasting: ${plan.result.summary.fastingProtocol}`,
                                category: "AI Plan",
                                completed: false,
                                isLocked: false,
                                subtasks: (p.subtasks || []).map((st) => ({
                                  id: st.id,
                                  title: `${st.title} ‚Äî [Science: ${st.scienceNote}]`,
                                  completed: false
                                }))
                              }));
                              if (setTasks) {
                                setTasks((prev: any) => [...prev, ...newTasksList]);
                              }
                              triggerHaptic("success");
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                          title="Deploy all tasks in this plan to active workspace"
                        >
                          <Check size={12} />
                          <span className="hidden xs:inline">Deploy</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlan(JSON.parse(JSON.stringify(plan)));
                            setShowEditPlanModal(true);
                            triggerHaptic("light");
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs cursor-pointer transition-colors"
                          title="Edit Plan"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            exportAIPlanPDF(plan);
                            triggerHaptic("success");
                          }}
                          className="p-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs cursor-pointer transition-colors"
                          title="Download PDF Report"
                        >
                          <Download size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            exportBackupJSON(plan, `${(plan.title || "AI_Plan").replace(/[^a-z0-9]/gi, '_')}_ai_plan.json`);
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-white/10 text-xs cursor-pointer transition-colors"
                          title="Download JSON File"
                        >
                          <FileCode size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingPlanId(plan.id);
                          }}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs cursor-pointer transition-colors"
                          title="Delete Plan"
                        >
                          <Trash2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs cursor-pointer transition-colors ml-1"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Protocol Quick Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px]">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center gap-1.5">
                        <Utensils size={12} className="text-amber-400 shrink-0" />
                        <span className="text-slate-300 truncate">{plan.result?.summary?.fastingProtocol || "Standard Fasting"}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center gap-1.5">
                        <Zap size={12} className="text-cyan-400 shrink-0" />
                        <span className="text-slate-300 truncate">{plan.result?.summary?.neuroProtocol || "Standard Neuro Protocol"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Plan Details */}
                  {isExpanded && (
                    <div className="p-3.5 border-t border-white/10 bg-slate-950/50 space-y-3">
                      <p className="text-[11px] text-slate-300 leading-relaxed italic bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20">
                        üî¨ {plan.result?.summary?.scienceOverview}
                      </p>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Step-by-Step Execution Plan ({plan.result?.tasks?.length || 0} Steps)
                        </span>

                        {plan.result?.tasks?.map((t, tIdx) => (
                          <div key={tIdx} className="p-2.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                              <span>{t.title}</span>
                              <span className="text-emerald-400 font-mono text-[11px]">{t.time} ({t.duration})</span>
                            </div>

                            <p className="text-[10px] text-indigo-300 leading-snug">
                              üß† {t.scienceNote}
                            </p>

                            {t.subtasks && t.subtasks.length > 0 && (
                              <div className="pl-3 border-l-2 border-emerald-500/40 space-y-1 pt-1">
                                {t.subtasks.map((st, sIdx) => (
                                  <div key={sIdx} className="text-[10px]">
                                    <span className="font-bold text-slate-200">‚Ä¢ {st.title}</span>
                                    <p className="text-[9.5px] text-slate-400 italic pl-3">
                                      Note: {st.scienceNote}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

    const renderNotesDepositoryTabContent = () => {
    return (
<div className="space-y-4 text-left w-full max-w-full overflow-x-hidden">
          {/* Controls: Pull-down Selector for Grouping & Live Keyword Search */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Group Notes By:</span>
              <div className="relative flex-1">
                <select
                  value={notesGroupBy}
                  onChange={(e) => { setNotesGroupBy(e.target.value as any); triggerHaptic("light"); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none appearance-none cursor-pointer transition-all ${
                    isDark 
                      ? "bg-slate-950/80 border-indigo-505/20 text-slate-100 focus:border-indigo-500/50" 
                      : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500/50"
                  }`}
                >
                  <option value="project">Project / Category</option>
                  <option value="collaborator">Collaborator</option>
                  <option value="timeDate">Time & Date</option>
                  <option value="task">Associated Task</option>
                  <option value="routine">Repeating Task (Routine)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <FastInput
                  type="text"
                  value={notesSearchQuery}
                  onChange={(val) => setNotesSearchQuery(val)}
                  placeholder="Search keywords, projects or collaborators..."
                  className={`w-full pl-8 pr-7 py-2 rounded-xl text-xs border outline-none font-semibold transition-all ${
                    isDark 
                      ? "bg-slate-950/80 border-white/5 text-slate-200 placeholder-slate-500 focus:border-indigo-500/50"
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500/50"
                  }`}
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
                  <Search size={12} />
                </div>
                {notesSearchQuery && (
                  <button
                    onClick={() => { setNotesSearchQuery(""); triggerHaptic("light"); }}
                    className="absolute right-2.5 top-1/2 -translate-[#50%] text-slate-400 hover:text-slate-100 flex items-center justify-center p-0.5 rounded-full"
                    style={{ transform: "translateY(-50%)" }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* PDF Summary Export Action */}
              <button
                onClick={handleExportNotesPDF}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 whitespace-nowrap text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98] cursor-pointer"
                title="Export currently filtered notes list as formatted PDF summary document"
              >
                <Download size={13} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Notes Content List */}
          <div className="max-h-[380px] overflow-y-auto overflow-x-hidden space-y-4 pr-1 scrollbar-thin scrollbar-thumb-indigo-505/20 w-full max-w-full">
            {notes.length === 0 ? (
              <div className={`py-12 text-center border-2 border-dashed rounded-2xl opacity-40 ${
                isDark ? "border-white/5 text-slate-400" : "border-slate-200 text-slate-500"
              }`}>
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2"/>
                <p className="text-[10px] uppercase font-black tracking-widest">No Notes In Repository</p>
                <p className="text-[8px] mt-1">Use the entry window in Focus view to capture natural language notes.</p>
              </div>
            ) : getFilteredNotes().length === 0 ? (
              <div className={`py-12 text-center border border-dashed rounded-2xl opacity-60 ${
                isDark ? "border-white/5 text-slate-400" : "border-slate-200 text-slate-500"
              }`}>
                <Search size={22} className="text-indigo-400 mx-auto mb-2"/>
                <p className="text-[10px] uppercase font-black tracking-widest">No matching results</p>
                <p className="text-[8px] mt-1">Try clarifying keywords or clear search filter query.</p>
                <button
                  onClick={() => { setNotesSearchQuery(""); triggerHaptic("light"); }}
                  className="mt-2 text-[9px] uppercase font-bold text-indigo-400 hover:underline"
                >
                  Clear search filters
                </button>
              </div>
            ) : (() => {
              // Group calculation based on selected grouping tab and active filter matches
              let groupedNotes: { [key: string]: any[] } = {};
              const filteredList = getFilteredNotes();
              
              if (notesGroupBy === "project") {
                filteredList.forEach(note => {
                  const key = note.project || "General";
                  if (!groupedNotes[key]) groupedNotes[key] = [];
                  groupedNotes[key].push(note);
                });
              } else if (notesGroupBy === "collaborator") {
                filteredList.forEach(note => {
                  const key = note.collaborator || "No Collaborator";
                  if (!groupedNotes[key]) groupedNotes[key] = [];
                  groupedNotes[key].push(note);
                });
              } else if (notesGroupBy === "timeDate") {
                filteredList.forEach(note => {
                  const date = new Date(note.createdAt);
                  const key = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                  if (!groupedNotes[key]) groupedNotes[key] = [];
                  groupedNotes[key].push(note);
                });
              } else if (notesGroupBy === "task") {
                filteredList.forEach(note => {
                  let key = "Unassociated Notes";
                  if (note.associatedTaskId) {
                    const t = tasks.find(item => item.id === note.associatedTaskId);
                    if (t) {
                      key = `Task: ${t.title}`;
                    } else {
                      key = "Linked Task (Archived/Completed)";
                    }
                  } else {
                    // Smart match task title
                    const t = tasks.find(item => 
                      note.rawText.toLowerCase().includes(item.title.toLowerCase()) ||
                      note.title.toLowerCase().includes(item.title.toLowerCase())
                    );
                    if (t) {
                      key = `Task: ${t.title}`;
                    }
                  }
                  if (!groupedNotes[key]) groupedNotes[key] = [];
                  groupedNotes[key].push(note);
                });
              } else if (notesGroupBy === "routine") {
                filteredList.forEach(note => {
                  let key = "No Repeating Task";
                  if (note.associatedRoutineId) {
                    const r = routines.find(item => item.id === note.associatedRoutineId);
                    if (r) {
                      key = `Routine: ${r.name}`;
                    }
                  } else {
                    // Smart match routine name
                    const r = routines.find(item => 
                      note.rawText.toLowerCase().includes(item.name.toLowerCase()) ||
                      note.title.toLowerCase().includes(item.name.toLowerCase())
                    );
                    if (r) {
                      key = `Routine: ${r.name}`;
                    }
                  }
                  if (!groupedNotes[key]) groupedNotes[key] = [];
                  groupedNotes[key].push(note);
                });
              }

              const groupKeys = Object.keys(groupedNotes).sort();

              return (
                <div className="space-y-4">
                  {groupKeys.map(groupKey => {
                    const items = groupedNotes[groupKey];
                    return (
                      <div key={groupKey} className="space-y-1.5">
                        <div className="flex items-center justify-between px-1 border-b border-white/5 pb-1 select-none">
                          <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">
                            {groupKey}
                          </span>
                          <span className={`text-[7.5px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                            isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-600"
                          }`}>
                            {items.length} {items.length === 1 ? "note" : "notes"}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {items.map(note => {
                            const dateStr = new Date(note.createdAt).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true
                            });

                            if (editingNoteId === note.id) {
                              return (
                                <div 
                                  key={note.id}
                                  className={`p-4 rounded-xl border transition-all space-y-3.5 shadow-lg w-full max-w-full overflow-hidden box-border ${
                                    isDark 
                                      ? "bg-indigo-950/20 border-indigo-500/30 text-slate-100" 
                                      : "bg-indigo-5/50 border-indigo-200 text-slate-900"
                                  }`}
                                >
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                                      Raw Text / Natural Language Query
                                    </label>
                                    <FastTextarea
                                      value={editNoteRawText}
                                      onChange={(val) => {
                                        setEditNoteRawText(val);
                                        // Live updating fields from raw text
                                        const parsed = parseNaturalLanguageTask(val, collaborators);
                                        if (parsed.category) setEditNoteProject(parsed.category);
                                        if (parsed.collaborator) setEditNoteCollaborator(parsed.collaborator);
                                        if (parsed.time) setEditNoteTime(parsed.time);
                                        if (parsed.location) setEditNoteLocation(parsed.location);
                                      }}
                                      className={`w-full text-xs font-semibold p-2.5 rounded-lg border outline-none ${
                                        isDark 
                                          ? "bg-slate-950/60 border-white/10 text-slate-100 focus:border-indigo-500/50" 
                                          : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500/50"
                                      }`}
                                      rows={2}
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 text-left w-full max-w-full overflow-hidden">
                                    <div>
                                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                                        Project / Category
                                      </label>
                                      <select
                                        value={editNoteProject || ""}
                                        onChange={(e) => {
                                          if (e.target.value === "__NEW__") {
                                            setShowNoteNewCategoryInput(true);
                                            setEditNoteProject("");
                                          } else if (e.target.value === "__MANAGE__") {
                                            setShowManageCategories(true);
                                            e.target.value = editNoteProject || "";
                                          } else {
                                            setEditNoteProject(e.target.value);
                                            setShowNoteNewCategoryInput(false);
                                          }
                                        }}
                                        className={`w-full text-xs font-medium p-2 rounded-lg border outline-none cursor-pointer ${
                                          isDark ? "bg-slate-950 text-slate-200 border-white/5 focus:border-indigo-500/30" : "bg-white border-slate-200 focus:border-indigo-500/30"
                                        }`}
                                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                                      >
                                        <option value="">No Category</option>
                                        {categories.map(cat => (
                                          <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__NEW__" className="text-indigo-405 font-black">+ Create Brand New...</option>
                                        <option value="__MANAGE__" className="text-emerald-500 font-black">‚öôÔ∏è Edit/Delete Categories...</option>
                                      </select>

                                      {showNoteNewCategoryInput && (
                                        <div className="mt-1.5 flex gap-1 items-center">
                                          <FastInput
                                            type="text"
                                            placeholder="Category Name"
                                            value={noteNewCategoryVal}
                                            onChange={(val) => setNoteNewCategoryVal(val)}
                                            className={`flex-1 text-[10px] font-medium p-1 rounded border outline-none ${
                                              isDark ? "bg-slate-950/60 border-white/5 focus:border-indigo-500/30 text-white" : "bg-white border-slate-200 focus:border-indigo-500/30 text-slate-950"
                                            }`}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddNoteNewCategory();
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddNoteNewCategory()}
                                            className="px-2 h-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                          >
                                            Add
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setShowNoteNewCategoryInput(false)}
                                            className="p-1 h-7 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded border border-white/5 cursor-pointer flex items-center justify-center"
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                                        Collaborator
                                      </label>
                                      <select
                                        value={editNoteCollaborator || ""}
                                        onChange={(e) => {
                                          if (e.target.value === "__NEW__") {
                                            setShowNoteNewCollaboratorInput(true);
                                            setEditNoteCollaborator("");
                                          } else if (e.target.value === "__MANAGE__") {
                                            setShowManageCollaborators(true);
                                            e.target.value = editNoteCollaborator || "";
                                          } else {
                                            setEditNoteCollaborator(e.target.value);
                                            setShowNoteNewCollaboratorInput(false);
                                          }
                                        }}
                                        className={`w-full text-xs font-medium p-2 rounded-lg border outline-none cursor-pointer ${
                                          isDark ? "bg-slate-950 text-slate-200 border-white/5 focus:border-indigo-500/30" : "bg-white border-slate-200 focus:border-indigo-500/30"
                                        }`}
                                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                                      >
                                        <option value="">No Collaborator</option>
                                        {collaborators.map(col => (
                                          <option key={col} value={col}>{col}</option>
                                        ))}
                                        <option value="__NEW__" className="text-indigo-405 font-black">+ Create Brand New...</option>
                                        <option value="__MANAGE__" className="text-emerald-500 font-black">‚öôÔ∏è Edit/Delete Collaborators...</option>
                                      </select>

                                      {showNoteNewCollaboratorInput && (
                                        <div className="mt-1.5 flex gap-1 items-center">
                                          <FastInput
                                            type="text"
                                            placeholder="Collaborator Name"
                                            value={noteNewCollaboratorVal}
                                            onChange={(val) => setNoteNewCollaboratorVal(val)}
                                            className={`flex-1 text-[10px] font-medium p-1 rounded border outline-none ${
                                              isDark ? "bg-slate-950/60 border-white/5 focus:border-indigo-500/30 text-white" : "bg-white border-slate-200 focus:border-indigo-500/30 text-slate-950"
                                            }`}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddNoteNewCollaborator();
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddNoteNewCollaborator()}
                                            className="px-2 h-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                          >
                                            Add
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setShowNoteNewCollaboratorInput(false)}
                                            className="p-1 h-7 bg-slate-800 hover:bg-slate-755 text-slate-400 hover:text-white rounded border border-white/5 cursor-pointer flex items-center justify-center"
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                                        Time
                                      </label>
                                      <input
                                        type="text"
                                        value={editNoteTime}
                                        onChange={(e) => setEditNoteTime(e.target.value)}
                                        placeholder="e.g. 14:00"
                                        className={`w-full text-xs font-medium p-2 rounded-lg border outline-none ${
                                          isDark ? "bg-slate-950/60 border-white/5 focus:border-indigo-500/30" : "bg-white border-slate-200 focus:border-indigo-500/30"
                                        }`}
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                                        Location
                                      </label>
                                      <input
                                        type="text"
                                        value={editNoteLocation}
                                        onChange={(e) => setEditNoteLocation(e.target.value)}
                                        className={`w-full text-xs font-medium p-2 rounded-lg border outline-none ${
                                          isDark ? "bg-slate-950/60 border-white/5 focus:border-indigo-500/30" : "bg-white border-slate-200 focus:border-indigo-500/30"
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                                      Note Date &amp; Time
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={editNoteCreatedAt}
                                      onChange={(e) => setEditNoteCreatedAt(e.target.value)}
                                      className={`w-full text-xs font-semibold p-2.5 rounded-lg border outline-none ${
                                        isDark 
                                          ? "bg-slate-950/60 border-white/10 text-slate-100 focus:border-indigo-500/50" 
                                          : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500/50"
                                      }`}
                                    />
                                  </div>

                                  {/* Link with active Task & Routine dropdowns */}
                                  <div className="grid grid-cols-2 gap-3 w-full max-w-full overflow-hidden">
                                    <div>
                                      <label className="text-[8px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                                        Link task
                                      </label>
                                      <select
                                        value={editNoteTaskId}
                                        onChange={(e) => setEditNoteTaskId(e.target.value)}
                                        className={`w-full text-[10px] font-medium p-2 rounded-lg border outline-none cursor-pointer ${
                                          isDark ? "bg-slate-950/80 border-white/5 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                                        }`}
                                      >
                                        <option value="">-- No linked task --</option>
                                        {tasks
                                          .filter(t => !t.isRecurring && !t.groupId)
                                          .sort((a, b) => {
                                            const dateTimeA = `${a.date || "0000-00-00"} ${a.time || "00:00"}`;
                                            const dateTimeB = `${b.date || "0000-00-00"} ${b.time || "00:00"}`;
                                            return dateTimeB.localeCompare(dateTimeA);
                                          })
                                          .map(t => (
                                            <option key={t.id} value={t.id}>{t.title} ({t.date})</option>
                                          ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[8px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                                        Link Repeating Task
                                      </label>
                                      <select
                                        value={editNoteRoutineId}
                                        onChange={(e) => setEditNoteRoutineId(e.target.value)}
                                        className={`w-full text-[10px] font-medium p-2 rounded-lg border outline-none cursor-pointer ${
                                          isDark ? "bg-slate-950/80 border-white/5 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                                        }`}
                                      >
                                        <option value="">-- No repeating task --</option>
                                        {routines.map(r => (
                                          <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 justify-end pt-1">
                                    <button
                                      onClick={() => { setEditingNoteId(null); triggerHaptic("light"); }}
                                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                                        isDark ? "bg-white/5 hover:bg-white/10 text-slate-400" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                      }`}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleSaveEditNote}
                                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                                    >
                                      Save changes
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={note.id}
                                className={`w-full max-w-full overflow-hidden p-4 rounded-xl border transition-all relative group flex flex-col justify-between gap-3 shadow-md ${
                                  isDark 
                                    ? "bg-slate-950/45 border-white/5 text-slate-205" 
                                    : "bg-white border-slate-200 text-slate-900"
                                }`}
                              >
                                {/* Note text content */}
                                <p className="text-[11px] font-semibold leading-relaxed break-words pr-12">
                                  {renderTextWithLinks(note.rawText)}
                                </p>

                                {/* Badges and timestamp footer */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-dashed border-white/5 text-[8px]">
                                  {/* Project badge */}
                                  <span className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                    isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-55 text-emerald-800"
                                  }`}>
                                    Project: {note.project || "General"}
                                  </span>

                                  {/* Collab badge */}
                                  <span className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                    isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-55 text-indigo-800"
                                  }`}>
                                    With: {note.collaborator || "None"}
                                  </span>

                                  {/* Location badge */}
                                  {note.location && (
                                    <span className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                      isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-55 text-rose-800"
                                    }`}>
                                      Loc: {note.location}
                                    </span>
                                  )}

                                  {/* Time badge */}
                                  {note.time && (
                                    <span className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                      isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-55 text-amber-800"
                                    }`}>
                                      Time: {note.time}
                                    </span>
                                  )}

                                  {/* Smart Connection Task badge indicator */}
                                  {(() => {
                                    const linkedTask = tasks.find(t => t.id === note.associatedTaskId);
                                    if (linkedTask) {
                                      return (
                                        <span className={`px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1 ${
                                          isDark ? "bg-amber-500/10 text-amber-305 border border-amber-500/10" : "bg-amber-50 text-amber-800 border border-amber-200"
                                        }`}>
                                          <CheckSquare size={8} /> Linked Task: {linkedTask.title}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* Smart Connection Routine badge indicator */}
                                  {(() => {
                                    const linkedRoutine = routines.find(r => r.id === note.associatedRoutineId);
                                    if (linkedRoutine) {
                                      return (
                                        <span className={`px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1 ${
                                          isDark ? "bg-purple-500/10 text-purple-305 border border-purple-500/10" : "bg-purple-50 text-purple-800 border border-purple-200"
                                        }`}>
                                          <RefreshCw size={8} className="animate-spin-slow" /> Routine: {linkedRoutine.name}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* Timestamp */}
                                  <span className="text-[7.5px] text-slate-500 font-mono ml-auto select-none">
                                    {dateStr}
                                  </span>
                                </div>

                                {/* Actions on Corner Hover */}
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                                  {/* Edit Button */}
                                  <button
                                    onClick={() => {
                                      handleStartEditNote(note);
                                      triggerHaptic("light");
                                    }}
                                    className={`p-1 rounded transition-all ${
                                      isDark 
                                        ? "hover:bg-indigo-500/15 text-slate-400 hover:text-indigo-400" 
                                        : "hover:bg-indigo-50 text-slate-500 hover:text-indigo-650"
                                    }`}
                                    title="Edit Note"
                                  >
                                    <Edit3 size={11} />
                                  </button>

                                  {/* Trash Delete Button */}
                                  <button
                                    onClick={() => {
                                      const updated = notes.filter(n => n.id !== note.id);
                                      saveNotes(updated);
                                      triggerHaptic("light");
                                    }}
                                    className={`p-1 rounded transition-all ${
                                      isDark 
                                        ? "hover:bg-rose-500/10 text-slate-400 hover:text-rose-450" 
                                        : "hover:bg-rose-50 text-slate-500 hover:text-rose-650"
                                    }`}
                                    title="Delete Note"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
    );
  };

const renderDirectoryManagerTab = () => {
    // Current list based on directorySubTab
    let list: string[] = [];
    if (directorySubTab === "collaborator") {
      list = collaborators;
    } else if (directorySubTab === "vendor") {
      list = spendingVendors;
    } else if (directorySubTab === "location") {
      list = favoriteLocations;
    }

    const handleAddEntity = (e: React.FormEvent) => {
      e.preventDefault();
      const val = newEntityName.trim();
      if (!val) return;

      if (directorySubTab === "collaborator") {
        if (!collaborators.includes(val)) {
          handleAddNewCollaborator(val);
        }
      } else if (directorySubTab === "vendor") {
        if (!spendingVendors.includes(val)) {
          handleAddSpendingVendor(val);
        }
      } else if (directorySubTab === "location") {
        if (!favoriteLocations.includes(val)) {
          handleAddLocation(val);
        }
      }
      setNewEntityName("");
      triggerHaptic("medium");
    };

    const handleRenameEntity = (oldVal: string, newVal: string) => {
      const val = newVal.trim();
      if (!val || oldVal === val) {
        setEditingEntityKey(null);
        return;
      }

      if (directorySubTab === "collaborator") {
        handleRenameCollaborator(oldVal, val);
        // Rename key in notes
        const oldNoteKey = `collaborator:${oldVal}`;
        const newNoteKey = `collaborator:${val}`;
        if (entityNotes[oldNoteKey]) {
          const updatedNotes = { ...entityNotes };
          updatedNotes[newNoteKey] = updatedNotes[oldNoteKey];
          delete updatedNotes[oldNoteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "vendor") {
        handleRenameSpendingVendor(oldVal, val);
        // Rename key in notes
        const oldNoteKey = `vendor:${oldVal}`;
        const newNoteKey = `vendor:${val}`;
        if (entityNotes[oldNoteKey]) {
          const updatedNotes = { ...entityNotes };
          updatedNotes[newNoteKey] = updatedNotes[oldNoteKey];
          delete updatedNotes[oldNoteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "location") {
        handleRenameLocation(oldVal, val);
        // Rename key in notes
        const oldNoteKey = `location:${oldVal}`;
        const newNoteKey = `location:${val}`;
        if (entityNotes[oldNoteKey]) {
          const updatedNotes = { ...entityNotes };
          updatedNotes[newNoteKey] = updatedNotes[oldNoteKey];
          delete updatedNotes[oldNoteKey];
          saveEntityNotes(updatedNotes);
        }
      }

      setEditingEntityKey(null);
      triggerHaptic("success");
    };

    const handleDeleteEntity = (val: string) => {
      if (directorySubTab === "collaborator") {
        handleDeleteCollaborator(val);
        const noteKey = `collaborator:${val}`;
        if (entityNotes[noteKey]) {
          const updatedNotes = { ...entityNotes };
          delete updatedNotes[noteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "vendor") {
        handleDeleteSpendingVendor(val);
        const noteKey = `vendor:${val}`;
        if (entityNotes[noteKey]) {
          const updatedNotes = { ...entityNotes };
          delete updatedNotes[noteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "location") {
        const updatedLocs = favoriteLocations.filter(l => l !== val);
        setFavoriteLocations(updatedLocs);
        localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updatedLocs));
        saveSystemSettingsToCloud({ favoriteLocations: updatedLocs });

        const noteKey = `location:${val}`;
        if (entityNotes[noteKey]) {
          const updatedNotes = { ...entityNotes };
          delete updatedNotes[noteKey];
          saveEntityNotes(updatedNotes);
        }
      }

      setDeletingEntityKey(null);
      triggerHaptic("medium");
    };

    return (
      <div className="space-y-6">
        {/* Subtabs Selector */}
        <div className="flex bg-slate-950/40 p-1 border border-white/5 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => { setDirectorySubTab("collaborator"); triggerHaptic("light"); setNewEntityName(""); setEditingEntityKey(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              directorySubTab === "collaborator" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users size={14} />
            Contacts / Collab
          </button>
          <button
            type="button"
            onClick={() => { setDirectorySubTab("vendor"); triggerHaptic("light"); setNewEntityName(""); setEditingEntityKey(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              directorySubTab === "vendor" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Store size={14} />
            Spending Vendors
          </button>
          <button
            type="button"
            onClick={() => { setDirectorySubTab("location"); triggerHaptic("light"); setNewEntityName(""); setEditingEntityKey(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              directorySubTab === "location" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MapPin size={14} />
            Favorite Locations
          </button>
        </div>

        {/* Add New Entity Form */}
        <form onSubmit={handleAddEntity} className="flex gap-2">
          <input
            type="text"
            required
            placeholder={
              directorySubTab === "collaborator"
                ? "Register a new collaborator / contact..."
                : directorySubTab === "vendor"
                ? "Register a new spending vendor..."
                : "Register a new favorite location..."
            }
            className={`flex-1 text-xs font-semibold p-3 rounded-xl border outline-none ${
              isDark 
                ? "bg-slate-950/60 border-white/10 text-slate-100 focus:border-indigo-500/50 placeholder-slate-500" 
                : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500/50 placeholder-slate-400"
            }`}
            value={newEntityName}
            onChange={(e) => setNewEntityName(e.target.value)}
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-550 active:scale-95 text-white px-5 py-3 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 font-sans uppercase tracking-wider shrink-0"
          >
            <Plus size={14} strokeWidth={3} />
            Add Entry
          </button>
        </form>

        {/* Directory List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {list.map((item) => {
            const noteKey = `${directorySubTab}:${item}`;
            const currentNote = entityNotes[noteKey] || "";
            const isEditing = editingEntityKey === item;
            const isConfirmingDelete = deletingEntityKey === item;

            return (
              <div
                key={item}
                className={`p-3.5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isDark
                    ? "bg-slate-900/90 border-white/5 hover:border-indigo-500/10"
                    : "bg-slate-50 border-slate-200 hover:border-indigo-550/10"
                }`}
              >
                {/* Left side: Edit Input or Name */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2 max-w-full">
                      <input
                        type="text"
                        className={`flex-1 text-xs font-bold p-1.5 rounded-lg border outline-none ${
                          isDark ? "bg-slate-950 text-white border-white/10" : "bg-white text-slate-900 border-slate-200"
                        }`}
                        value={editingEntityValue}
                        onChange={(e) => setEditingEntityValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameEntity(item, editingEntityValue);
                          } else if (e.key === "Escape") {
                            setEditingEntityKey(null);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameEntity(item, editingEntityValue)}
                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-lg transition-all"
                        title="Save Name"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingEntityKey(null)}
                        className="p-1.5 bg-slate-850 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide shrink-0">
                        {directorySubTab === "collaborator" ? "Collab:" : directorySubTab === "vendor" ? "Vendor:" : "Location:"}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-100 truncate flex-1 select-all animate-fade-in" title={item}>
                        {item}
                      </h4>
                    </div>
                  )}

                  {/* Quick Notes Input field */}
                  <div className="mt-2.5">
                    <textarea
                      placeholder="Add an inline quick note or reminder for this contact..."
                      className={`w-full text-[11px] font-semibold p-2 rounded-xl border outline-none transition-all resize-none ${
                        isDark
                          ? "bg-slate-950/40 border-white/5 text-slate-200 placeholder-slate-600 focus:border-indigo-500/30"
                          : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500/30"
                      }`}
                      rows={1}
                      value={currentNote}
                      onChange={(e) => {
                        const updated = { ...entityNotes, [noteKey]: e.target.value };
                        saveEntityNotes(updated);
                      }}
                    />
                  </div>
                </div>

                {/* Right side: Action Controls */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 border-t border-white/5 md:border-0 pt-2 md:pt-0">
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1 bg-rose-500/10 p-1 rounded-xl border border-rose-500/25">
                      <span className="text-[9px] font-black uppercase text-rose-455 px-1.5 py-0.5">Are you sure?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntity(item)}
                        className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntityKey(null)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* One Press Log Note */}
                      <button
                        type="button"
                        onClick={() => handleAddTimestampedNoteForEntity(directorySubTab, item)}
                        className="px-2.5 py-1.5 bg-indigo-505/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-indigo-500/15 cursor-pointer"
                        title="Create a new timestamped log entry in Notes depository"
                      >
                        <Plus size={10} strokeWidth={3} />
                        <span>Log Note</span>
                      </button>

                      {/* Rename Button */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntityKey(item);
                            setEditingEntityValue(item);
                            setDeletingEntityKey(null);
                            triggerHaptic("light");
                          }}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Rename Entry"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingEntityKey(item);
                          setEditingEntityKey(null);
                          triggerHaptic("medium");
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-455 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {list.length === 0 && (
            <div className="text-center py-8 bg-slate-900/10 rounded-2xl border border-dashed border-white/5">
              <BookOpen className="text-slate-600 mx-auto mb-2 opacity-50" size={24} />
              <p className="text-xs text-slate-455 font-bold italic">No entries registered in this list yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  const [spendings, setSpendings] = useState<any[]>(() => {
    const saved = localStorage.getItem("spending_tracker_items_v1");
    return saved ? JSON.parse(saved) : [];
  });
  const [spendingCategories, _setSpendingCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("spending_tracker_categories_v1");
    const arr = saved ? JSON.parse(saved) : ["Food", "Travel", "Software", "Rent", "Marketing", "Utilities", "Other"];
    return [...arr].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  });
  const setSpendingCategories = React.useCallback((newCats: string[] | ((prev: string[]) => string[])) => {
    if (typeof newCats === "function") {
      _setSpendingCategories((prev) => {
        const res = newCats(prev);
        return [...res].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      });
    } else {
      _setSpendingCategories([...newCats].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })));
    }
  }, []);

  const [spendingVendors, _setSpendingVendors] = useState<string[]>(() => {
    const saved = localStorage.getItem("spending_tracker_vendors_v1");
    const arr = saved ? JSON.parse(saved) : ["Amazon", "Uber", "Starbucks", "GitHub", "Google Cloud", "Target", "Other"];
    return [...arr].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  });
  const setSpendingVendors = React.useCallback((newVendors: string[] | ((prev: string[]) => string[])) => {
    if (typeof newVendors === "function") {
      _setSpendingVendors((prev) => {
        const res = newVendors(prev);
        return [...res].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      });
    } else {
      _setSpendingVendors([...newVendors].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })));
    }
  }, []);

  // Manage Dropdowns States
  const [showManageSpendingCategories, setShowManageSpendingCategories] = useState(false);
  const [showManageSpendingVendors, setShowManageSpendingVendors] = useState(false);
  const [newSpendingCategoryVal, setNewSpendingCategoryVal] = useState("");
  const [newSpendingVendorVal, setNewSpendingVendorVal] = useState("");
  const [editingSpendingCategoryKey, setEditingSpendingCategoryKey] = useState<string | null>(null);
  const [editingSpendingCategoryValue, setEditingSpendingCategoryValue] = useState("");
  const [deletingSpendingCategoryKey, setDeletingSpendingCategoryKey] = useState<string | null>(null);
  const [editingSpendingVendorKey, setEditingSpendingVendorKey] = useState<string | null>(null);
  const [editingSpendingVendorValue, setEditingSpendingVendorValue] = useState("");
  const [deletingSpendingVendorKey, setDeletingSpendingVendorKey] = useState<string | null>(null);

  // New Spending Form States
  const [spendingAmount, setSpendingAmount] = useState("");
  const [spendingCategory, setSpendingCategory] = useState("Food");
  const [spendingVendor, setSpendingVendor] = useState("Amazon");
  const [spendingDate, setSpendingDate] = useState(() => getLocalDateString());
  const [spendingNotes, setSpendingNotes] = useState("");
  const [spendingReceipt, setSpendingReceipt] = useState<string | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [aiParsedReceipt, setAiParsedReceipt] = useState<any | null>(null);

  // Real Camera capture states & references
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      triggerHaptic("light");
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      alert("Could not access the camera. Please upload an image file instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    triggerHaptic("light");
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setSpendingReceipt(dataUrl);
        stopCamera();
        handleScanReceipt(dataUrl);
      }
    }
  };

  const handleScanReceipt = async (base64Image: string) => {
    if (!base64Image) return;
    setIsScanningReceipt(true);
    triggerHaptic("medium");
    try {
      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        setAiParsedReceipt(resData.data);
        triggerHaptic("success");
      } else {
        alert(resData.error || "Failed to scan receipt image.");
        triggerHaptic("heavy");
      }
    } catch (error: any) {
      console.error("Receipt parsing error:", error);
      alert("Error scanning receipt: " + (error.message || error));
      triggerHaptic("heavy");
    } finally {
      setIsScanningReceipt(false);
    }
  };

  // Spending Filters States
  const [spendingFilterCategory, setSpendingFilterCategory] = useState("All");
  const [spendingFilterVendor, setSpendingFilterVendor] = useState("All");
  const [spendingFilterDateMode, setSpendingFilterDateMode] = useState<"all" | "week" | "month" | "range">("all");
  const [spendingFilterStartDate, setSpendingFilterStartDate] = useState(() => getLocalDateString());
  const [spendingFilterEndDate, setSpendingFilterEndDate] = useState(() => getLocalDateString());

  // Receipt Modal State
  const [activeReceiptPreview, setActiveReceiptPreview] = useState<string | null>(null);

  // Expense Tracker Tab & Ledger States
  const [spendingActiveTab, setSpendingActiveTab] = useState<"entry" | "ledger" | "trends">("entry");
  const [ledgerGroupBy, setLedgerGroupBy] = useState<"date" | "vendor" | "category">("date");
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Record<string, boolean>>({});
  const [trendViewType, setTrendViewType] = useState<"category" | "vendor">("category");

  const saveSpendings = (newSpendings: any[]) => {
    setSpendings(newSpendings);
    localStorage.setItem("spending_tracker_items_v1", JSON.stringify(newSpendings));
    if (db && currentUser) {
      const uid = currentUser.uid;
      const newIds = new Set(newSpendings.map(s => s.id));
      spendings.forEach((s) => {
        if (!newIds.has(s.id)) {
          deleteDoc(doc(db!, "spendings", s.id)).catch(err => {
            console.error("Error deleting spending item:", err);
          });
        }
      });
      newSpendings.forEach((s) => {
        const docRef = doc(db!, "spendings", s.id);
        setDoc(docRef, cleanForFirestore({ ...s, userId: uid })).catch(err => {
          console.error("Error writing spending item:", err);
        });
      });
    }
  };

  const pushSpendingToGoogleCalendar = async (accessToken: string, s: any): Promise<string | null> => {
    try {
      const summary = `Expense: ${s.vendor} - $${s.amount} (${s.category})`;
      const finalDescription = `Category: ${s.category}\nVendor: ${s.vendor}\nAmount: $${s.amount}\nNotes: ${s.notes || "None"}\nSynced from TaskPass Expenses.`;

      let body: any = {
        summary: summary,
        description: finalDescription,
      };

      body.start = {
        date: s.date
      };
      
      const dateParts = s.date.split("-").map(Number);
      if (dateParts.length === 3 && !dateParts.some(isNaN)) {
        const [year, month, day] = dateParts;
        const startLocalDate = new Date(year, month - 1, day);
        const endLocalDate = new Date(startLocalDate.getTime() + 24 * 60 * 60 * 1000);
        const formatYYYYMMDD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dayOfMonth = d.getDate();
          return `${y}-${m}-${String(dayOfMonth).padStart(2, "0")}`;
        };
        body.end = {
          date: formatYYYYMMDD(endLocalDate)
        };
      } else {
        body.end = {
          date: s.date
        };
      }

      let res;
      if (s.gcalEventId) {
        res = await gcalFetchQueue.fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${s.gcalEventId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(body)
        });
      } else {
        res = await gcalFetchQueue.fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        const responseData = await res.json();
        return responseData.id as string;
      } else {
        const txt = await res.text();
        console.error("Google Calendar Expense Sync Error:", res.status, txt);
        return null;
      }
    } catch (err) {
      console.error("pushSpendingToGoogleCalendar failed:", err);
      return null;
    }
  };

  const handleSyncAllExpensesToGCal = async () => {
    if (!gcalAccessToken) {
      alert("Please connect your Google Calendar account first in the Settings menu.");
      return;
    }
    setGcalStatusMsg("Syncing expenses to Google Calendar...");
    let syncedCount = 0;
    const updatedSpendings = [...spendings];
    
    for (let i = 0; i < updatedSpendings.length; i++) {
      const s = updatedSpendings[i];
      const eventId = await pushSpendingToGoogleCalendar(gcalAccessToken, s);
      if (eventId) {
        updatedSpendings[i] = { ...s, gcalEventId: eventId };
        syncedCount++;
      }
    }
    
    saveSpendings(updatedSpendings);
    setGcalStatusMsg(`Successfully synced ${syncedCount} expenses to Google Calendar!`);
    alert(`Successfully synced ${syncedCount} expenses to Google Calendar!`);
  };

  const saveSpendingCategories = (newCats: string[]) => {
    const sorted = [...newCats].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    setSpendingCategories(sorted);
    localStorage.setItem("spending_tracker_categories_v1", JSON.stringify(sorted));
    if (db && currentUser) {
      const uid = currentUser.uid;
      const userDocRef = doc(db, "users", uid);
      setDoc(userDocRef, { spendingCategories: sorted }, { merge: true }).catch(err => {
        console.error("Error updating user spending categories:", err);
      });
    }
  };

  const saveSpendingVendors = (newVendors: string[]) => {
    const sorted = [...newVendors].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    setSpendingVendors(sorted);
    localStorage.setItem("spending_tracker_vendors_v1", JSON.stringify(sorted));
    if (db && currentUser) {
      const uid = currentUser.uid;
      const userDocRef = doc(db, "users", uid);
      setDoc(userDocRef, { spendingVendors: sorted }, { merge: true }).catch(err => {
        console.error("Error updating user spending vendors:", err);
      });
    }
  };

  const handleAddSpendingCategory = (customVal?: string) => {
    const val = (customVal || newSpendingCategoryVal).trim();
    if (!val) return;
    if (!spendingCategories.includes(val)) {
      const updated = [...spendingCategories, val];
      saveSpendingCategories(updated);
    }
  };

  const handleRenameSpendingCategory = (oldVal: string, newVal: string) => {
    const updatedCats = spendingCategories.map(c => c === oldVal ? newVal : c);
    saveSpendingCategories(updatedCats);

    // Update all spendings that used this category
    const updatedSpendings = spendings.map(s => {
      if (s.category === oldVal) {
        return { ...s, category: newVal };
      }
      return s;
    });
    saveSpendings(updatedSpendings);
  };

  const handleDeleteSpendingCategory = (val: string) => {
    const updatedCats = spendingCategories.filter(c => c !== val);
    saveSpendingCategories(updatedCats);

    // Update all spendings that used this category to "Other"
    const updatedSpendings = spendings.map(s => {
      if (s.category === val) {
        return { ...s, category: "Other" };
      }
      return s;
    });
    saveSpendings(updatedSpendings);
  };

  const handleAddSpendingVendor = (customVal?: string) => {
    const val = (customVal || newSpendingVendorVal).trim();
    if (!val) return;
    if (!spendingVendors.includes(val)) {
      const updated = [...spendingVendors, val];
      saveSpendingVendors(updated);
    }
  };

  const handleRenameSpendingVendor = (oldVal: string, newVal: string) => {
    const updatedVendors = spendingVendors.map(v => v === oldVal ? newVal : v);
    saveSpendingVendors(updatedVendors);

    // Update all spendings that used this vendor
    const updatedSpendings = spendings.map(s => {
      if (s.vendor === oldVal) {
        return { ...s, vendor: newVal };
      }
      return s;
    });
    saveSpendings(updatedSpendings);
  };

  const handleDeleteSpendingVendor = (val: string) => {
    const updatedVendors = spendingVendors.filter(v => v !== val);
    saveSpendingVendors(updatedVendors);

    // Update all spendings that used this vendor to "Other"
    const updatedSpendings = spendings.map(s => {
      if (s.vendor === val) {
        return { ...s, vendor: "Other" };
      }
      return s;
    });
    saveSpendings(updatedSpendings);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-xl border text-xs shadow-xl ${isDark ? "bg-slate-950/95 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
          <p className="font-bold mb-1 uppercase tracking-wider">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.name} className="flex items-center gap-2 mt-0.5 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pld.fill }} />
              <span className="opacity-75">{pld.name}:</span>
              <span>{pld.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderTaskAnalyticsTab = () => {
    // Aggregate tasks by Category and Priority
    const allCats = Array.from(new Set([
      ...categories,
      ...tasks.map(t => t.category?.trim()).filter(Boolean) as string[]
    ])).sort();

    const chartData = allCats.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      return {
        category: cat,
        High: catTasks.filter(t => t.priority === "high").length,
        Medium: catTasks.filter(t => t.priority === "medium").length,
        Low: catTasks.filter(t => t.priority === "low").length,
        None: catTasks.filter(t => !t.priority || t.priority === "none").length,
        total: catTasks.length
      };
    });

    // Also handle uncategorized tasks
    const uncategorizedTasks = tasks.filter(t => !t.category);
    if (uncategorizedTasks.length > 0) {
      chartData.push({
        category: "Uncategorized",
        High: uncategorizedTasks.filter(t => t.priority === "high").length,
        Medium: uncategorizedTasks.filter(t => t.priority === "medium").length,
        Low: uncategorizedTasks.filter(t => t.priority === "low").length,
        None: uncategorizedTasks.filter(t => !t.priority || t.priority === "none").length,
        total: uncategorizedTasks.length
      });
    }

    // Aggregate by priority for a summary Pie Chart
    const highCount = tasks.filter(t => t.priority === "high").length;
    const mediumCount = tasks.filter(t => t.priority === "medium").length;
    const lowCount = tasks.filter(t => t.priority === "low").length;
    const noneCount = tasks.filter(t => !t.priority || t.priority === "none").length;

    const priorityPieData = [
      { name: "High", value: highCount, color: "#f43f5e" },
      { name: "Medium", value: mediumCount, color: "#f59e0b" },
      { name: "Low", value: lowCount, color: "#10b981" },
      { name: "None", value: noneCount, color: "#64748b" }
    ].filter(p => p.value > 0);

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Active Tasks</p>
            <p className="text-3xl font-black text-indigo-400 mt-1">{tasks.filter(t => !t.completed).length}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">High Priority</p>
            <p className="text-3xl font-black text-rose-550 mt-1">{highCount}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Medium Priority</p>
            <p className="text-3xl font-black text-amber-500 mt-1">{mediumCount}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Completed Tasks</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">{tasks.filter(t => t.completed).length}</p>
          </div>
        </div>

        {/* Recharts Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Category & Priority Bar Chart */}
          <div className={`col-span-1 lg:col-span-2 p-5 rounded-3xl border flex flex-col ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="mb-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Tasks by Category & Priority</h3>
              <p className="text-[9px] text-slate-450 uppercase tracking-widest font-mono">Distribution Matrix</p>
            </div>
            <div className="w-full h-80 min-h-[300px] text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff10" : "#00000010"} vertical={false} />
                  <XAxis dataKey="category" stroke={isDark ? "#94a3b8" : "#475569"} tickLine={false} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#475569"} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "#ffffff05" : "#00000005" }} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="High" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Medium" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Low" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="None" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Pie Chart */}
          <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Priority Composition</h3>
              <p className="text-[9px] text-slate-450 uppercase tracking-widest font-mono">Composition breakdown</p>
            </div>
            {priorityPieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono py-12 uppercase">
                No tasks to analyze
              </div>
            ) : (
              <div className="relative w-full h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {priorityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-indigo-400">{tasks.length}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-black">Total Tasks</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2 text-left">
              {priorityPieData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate opacity-75">{item.name}:</span>
                  <span className="font-black">{item.value} ({Math.round(item.value / tasks.length * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSpendingTrendsTab = () => {
    // Helper to get month key (YYYY-MM)
    const getYearMonth = (dateStr: string) => {
      if (!dateStr || dateStr.length < 7) return "Unknown";
      return dateStr.substring(0, 7);
    };

    const formatYearMonth = (ymStr: string) => {
      if (!ymStr || ymStr === "Unknown") return ymStr;
      const [year, month] = ymStr.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIndex = parseInt(month, 10) - 1;
      if (mIndex >= 0 && mIndex < 12) {
        return `${monthNames[mIndex]} ${year}`;
      }
      return ymStr;
    };

    // Calculate unique months sorted chronologically
    const uniqueMonths = Array.from(new Set(spendings.map(s => getYearMonth(s.date))))
      .filter(m => m !== "Unknown")
      .sort();

    // Compute line chart data
    const chartData = uniqueMonths.map(mKey => {
      const monthSpendings = spendings.filter(s => getYearMonth(s.date) === mKey);
      const dataPoint: any = {
        monthKey: mKey,
        monthDisplay: formatYearMonth(mKey),
        Total: Number(monthSpendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0).toFixed(2))
      };

      if (trendViewType === "category") {
        spendingCategories.forEach(cat => {
          const amount = monthSpendings
            .filter(s => s.category === cat)
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          dataPoint[cat] = Number(amount.toFixed(2));
        });
      } else {
        spendingVendors.forEach(v => {
          const amount = monthSpendings
            .filter(s => s.vendor === v)
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          dataPoint[v] = Number(amount.toFixed(2));
        });
      }

      return dataPoint;
    });

    // Active lines (only those that have spending in any month, to avoid legend clutter)
    const activeKeys = trendViewType === "category" 
      ? spendingCategories.filter(cat => spendings.some(s => s.category === cat))
      : spendingVendors.filter(v => spendings.some(s => s.vendor === v));

    const totalAllTime = spendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const averageMonthly = uniqueMonths.length > 0 ? (totalAllTime / uniqueMonths.length) : 0;

    // Find top spending category/vendor of all time
    let topEntityName = "None";
    let topEntityAmount = 0;
    const entityTotals: Record<string, number> = {};
    spendings.forEach(s => {
      const key = trendViewType === "category" ? s.category : s.vendor;
      entityTotals[key] = (entityTotals[key] || 0) + (Number(s.amount) || 0);
    });
    Object.entries(entityTotals).forEach(([name, amt]) => {
      if (amt > topEntityAmount) {
        topEntityAmount = amt;
        topEntityName = name;
      }
    });

    const colors = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#14b8a6", "#22c55e", "#a855f7", "#3b82f6", "#eab308"];

    return (
      <div className="space-y-6 text-left">
        {/* Header Summary & Google Calendar Sync */}
        <div className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Monthly Spending Trends</h3>
            <p className="text-[10px] text-slate-455 uppercase tracking-widest font-mono">Analyze categories and vendors over time</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Type Toggle */}
            <div className={`p-0.5 rounded-xl border flex items-center ${isDark ? "bg-slate-950 border-white/5" : "bg-slate-100 border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setTrendViewType("category")}
                className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  trendViewType === "category"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-250"
                }`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setTrendViewType("vendor")}
                className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  trendViewType === "vendor"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-250"
                }`}
              >
                By Vendor
              </button>
            </div>

            {/* Google Sync button for Expenses */}
            <button
              type="button"
              onClick={handleSyncAllExpensesToGCal}
              className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              title="Sync expenses with Google Calendar"
            >
              <RefreshCw size={11} className={gcalStatusMsg?.includes("Syncing") ? "animate-spin" : ""} />
              <span>Google Calendar Sync</span>
            </button>
          </div>
        </div>

        {/* High Level Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-3xl border ${isDark ? "bg-slate-900/15 border-white/5" : "bg-white border-slate-200 shadow-2xs"}`}>
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">All-Time Spending</span>
            <div className="text-xl font-black text-white mt-1 font-mono">${totalAllTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-[8.5px] text-slate-500 mt-1 uppercase tracking-widest font-mono">Over {uniqueMonths.length || 1} months</p>
          </div>
          <div className={`p-4 rounded-3xl border ${isDark ? "bg-slate-900/15 border-white/5" : "bg-white border-slate-200 shadow-2xs"}`}>
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Average Monthly Burn</span>
            <div className="text-xl font-black text-indigo-400 mt-1 font-mono">${averageMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-[8.5px] text-slate-500 mt-1 uppercase tracking-widest font-mono">Calculated average</p>
          </div>
          <div className={`p-4 rounded-3xl border ${isDark ? "bg-slate-900/15 border-white/5" : "bg-white border-slate-200 shadow-2xs"}`}>
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Top {trendViewType === "category" ? "Category" : "Vendor"}</span>
            <div className="text-xl font-black text-rose-400 mt-1 truncate">{topEntityName}</div>
            <p className="text-[8.5px] text-slate-500 mt-1 uppercase tracking-widest font-mono">Spent: ${topEntityAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Recharts Line Chart for spending trends */}
        <div className={`p-5 rounded-3xl border ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className="mb-4">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Monthly Spending Curve</h4>
            <p className="text-[8.5px] text-slate-550 uppercase tracking-widest font-mono">Continuous spend vector graph</p>
          </div>

          {uniqueMonths.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 font-mono uppercase">
              Add spending entries to render the trends graph.
            </div>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff08" : "#00000008"} />
                  <XAxis 
                    dataKey="monthDisplay" 
                    stroke={isDark ? "#ffffff35" : "#00000035"} 
                    style={{ fontSize: "9px", fontFamily: "monospace" }} 
                  />
                  <YAxis 
                    stroke={isDark ? "#ffffff35" : "#00000035"} 
                    style={{ fontSize: "9px", fontFamily: "monospace" }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? "#020617" : "#ffffff", 
                      borderRadius: "12px", 
                      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
                      fontSize: "10.5px"
                    }}
                    labelStyle={{ fontWeight: "bold", color: "#6366f1", marginBottom: "4px" }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: "9.5px", marginTop: "10px" }} 
                  />
                  
                  {/* Highlighted Total spending line */}
                  <Line 
                    type="monotone" 
                    dataKey="Total" 
                    stroke="#818cf8" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />

                  {/* Individual categories / vendors lines */}
                  {activeKeys.map((key, idx) => (
                    <Line 
                      key={key} 
                      type="monotone" 
                      dataKey={key} 
                      stroke={colors[idx % colors.length]} 
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Month by Month Breakdown Table */}
        <div className={`p-5 rounded-3xl border overflow-hidden ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className="mb-4">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Monthly Breakdown Log</h4>
            <p className="text-[8.5px] text-slate-550 uppercase tracking-widest font-mono">Detailed financial values grid</p>
          </div>

          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono uppercase">
              No breakdown logs available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Total Spent</th>
                    {activeKeys.slice(0, 4).map(key => (
                      <th key={key} className="py-2.5 px-3">{key}</th>
                    ))}
                    {activeKeys.length > 4 && (
                      <th className="py-2.5 px-3">Other Keys</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice().reverse().map(data => {
                    // Sum up the rest of active keys if more than 4
                    let otherSum = 0;
                    if (activeKeys.length > 4) {
                      activeKeys.slice(4).forEach(k => {
                        otherSum += data[k] || 0;
                      });
                    }

                    return (
                      <tr key={data.monthKey} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors text-xs font-medium">
                        <td className="py-2.5 px-3 font-bold text-white">{data.monthDisplay}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">${data.Total.toFixed(2)}</td>
                        {activeKeys.slice(0, 4).map(key => (
                          <td key={key} className="py-2.5 px-3 font-mono text-slate-300">
                            {data[key] ? `$${data[key].toFixed(2)}` : "-"}
                          </td>
                        ))}
                        {activeKeys.length > 4 && (
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {otherSum > 0 ? `$${otherSum.toFixed(2)}` : "-"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

   const renderSpendingTrackerTab = () => {
    // Filter spending data
    const filteredSpendings = spendings.filter(item => {
      // Category filter
      if (spendingFilterCategory !== "All" && item.category !== spendingFilterCategory) return false;
      // Vendor filter
      if (spendingFilterVendor !== "All" && item.vendor !== spendingFilterVendor) return false;
      // Date filter
      if (spendingFilterDateMode === "week") {
        const itemDateObj = new Date(item.date);
        const today = new Date();
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (itemDateObj < oneWeekAgo) return false;
      } else if (spendingFilterDateMode === "month") {
        const itemDateObj = new Date(item.date);
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        if (itemDateObj < oneMonthAgo) return false;
      } else if (spendingFilterDateMode === "range") {
        if (item.date < spendingFilterStartDate || item.date > spendingFilterEndDate) return false;
      }
      return true;
    });

    // Calculate stats
    const totalSpent = filteredSpendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const avgSpent = filteredSpendings.length > 0 ? (totalSpent / filteredSpendings.length) : 0;

    // Chart data for spending by category
    const spendingByCategoryData = spendingCategories.map(cat => {
      const amount = spendings
        .filter(s => s.category === cat)
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      return { name: cat, value: Number(amount.toFixed(2)) };
    }).filter(c => c.value > 0);

    const colors = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#14b8a6"];

    const handleAddSpending = (e: React.FormEvent) => {
      e.preventDefault();
      if (!spendingAmount || isNaN(Number(spendingAmount)) || Number(spendingAmount) <= 0) {
        alert("Please enter a valid numeric amount.");
        return;
      }
      const newSpending = {
        id: "spend_" + Date.now(),
        amount: Number(spendingAmount),
        vendor: spendingVendor,
        category: spendingCategory,
        date: spendingDate,
        notes: spendingNotes.trim() || undefined,
        receiptPhoto: spendingReceipt || undefined,
        createdAt: Date.now()
      };
      saveSpendings([newSpending, ...spendings]);

      // Reset Form
      setSpendingAmount("");
      setSpendingNotes("");
      setSpendingReceipt(null);
      triggerHaptic("success");
    };

    // Helper to format date as mm-dd-yy
    const formatDateToMMDDYY = (dateStr: string) => {
      if (!dateStr) return "";
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const yyyy = parts[0];
        const mm = parts[1];
        const dd = parts[2];
        const yy = yyyy.length === 4 ? yyyy.substring(2) : yyyy;
        return `${mm}-${dd}-${yy}`;
      }
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const yy = String(d.getFullYear()).slice(-2);
          return `${mm}-${dd}-${yy}`;
        }
      } catch (e) {}
      return dateStr;
    };

    // Grouping calculations for the ledger tab
    const groupedSpendings = (() => {
      const groups: Record<string, any[]> = {};
      filteredSpendings.forEach(item => {
        let key = "Other";
        if (ledgerGroupBy === "date") {
          key = item.date || "Unknown Date";
        } else if (ledgerGroupBy === "vendor") {
          key = item.vendor || "Unknown Vendor";
        } else if (ledgerGroupBy === "category") {
          key = item.category || "Uncategorized";
        }
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
      });
      return groups;
    })();

    const sortedGroupKeys = (() => {
      const keys = Object.keys(groupedSpendings);
      if (ledgerGroupBy === "date") {
        // Sort dates descending
        return keys.sort((a, b) => b.localeCompare(a));
      } else {
        // Sort alphabetically
        return keys.sort((a, b) => a.localeCompare(b));
      }
    })();

    const toggleRowExpansion = (id: string) => {
      setExpandedLedgerRows(prev => ({
        ...prev,
        [id]: !prev[id]
      }));
    };

    return (
      <div className="space-y-6">
        {/* Sub-tabs Navigation */}
        <div className="flex border-b border-white/5 pb-2 mb-4 gap-6">
          <button
            type="button"
            onClick={() => setSpendingActiveTab("entry")}
            className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
              spendingActiveTab === "entry" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            New Expense & Analytics
            {spendingActiveTab === "entry" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSpendingActiveTab("ledger")}
            className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
              spendingActiveTab === "ledger" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Expense Ledger ({filteredSpendings.length})
            {spendingActiveTab === "ledger" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSpendingActiveTab("trends")}
            className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
              spendingActiveTab === "trends" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Trends Summary
            {spendingActiveTab === "trends" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {spendingActiveTab === "entry" ? (
          /* ADD NEW EXPENSE ENTRY & ANALYTICS TAB */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Container */}
              {aiParsedReceipt ? (
                /* AI PARSED RECEIPT REVIEW FORM */
                <div className={`p-5 rounded-3xl border space-y-4 text-left ${isDark ? "bg-slate-900/20 border-indigo-500/30" : "bg-indigo-50/40 border-indigo-200/60 shadow-xs"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Review Parsed Receipt</h3>
                      </div>
                      <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">Verify and edit Gemini AI&apos;s extraction</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAiParsedReceipt(null);
                        setSpendingReceipt(null);
                      }}
                      className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>

                  {/* Thumbnail Reference */}
                  {spendingReceipt && (
                    <div className={`flex items-center gap-2.5 p-2 rounded-2xl border ${isDark ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"}`}>
                      <img
                        src={spendingReceipt}
                        alt="Receipt thumbnail"
                        className="w-12 h-12 rounded-lg object-cover border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">Receipt Reference Image</p>
                        <p className="text-[9px] text-slate-455 truncate">Active multimodal document context</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3.5 text-left">
                    {/* Vendor & Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Vendor</label>
                        <input
                          type="text"
                          required
                          value={aiParsedReceipt.vendor || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, vendor: e.target.value })}
                          className={`w-full h-10 px-3 rounded-xl text-xs border outline-none transition-all ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date</label>
                        <input
                          type="date"
                          required
                          value={aiParsedReceipt.date || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, date: e.target.value })}
                          className={`w-full h-10 px-3 rounded-xl font-mono text-xs border outline-none transition-all ${
                            isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark] focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Category & Receipt Number */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Category</label>
                        <select
                          value={spendingCategory}
                          onChange={(e) => setSpendingCategory(e.target.value)}
                          className={`w-full h-10 px-2 rounded-xl text-xs border outline-none transition-all cursor-pointer ${
                            isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{ colorScheme: isDark ? "dark" : "light" }}
                        >
                          {spendingCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Receipt #</label>
                        <input
                          type="text"
                          placeholder="N/A"
                          value={aiParsedReceipt.receiptNumber || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, receiptNumber: e.target.value })}
                          className={`w-full h-10 px-3 rounded-xl text-xs border outline-none transition-all ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Line Items List */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Line Items</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...(aiParsedReceipt.items || [])];
                            newItems.push({ name: "New Item", cost: 0 });
                            setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                          }}
                          className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>
                      <div className={`max-h-28 overflow-y-auto space-y-2 border p-2 rounded-xl ${isDark ? "border-white/5 bg-slate-950/20" : "border-slate-100 bg-slate-50/50"}`}>
                        {aiParsedReceipt.items && aiParsedReceipt.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              required
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...aiParsedReceipt.items];
                                newItems[idx].name = e.target.value;
                                setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                              }}
                              placeholder="Item Name"
                              className={`flex-1 h-8 px-2 rounded-lg text-[10.5px] border outline-none ${
                                isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                              }`}
                            />
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={item.cost || ""}
                              onChange={(e) => {
                                const newItems = [...aiParsedReceipt.items];
                                newItems[idx].cost = Number(e.target.value) || 0;
                                setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                              }}
                              placeholder="0.00"
                              className={`w-16 h-8 px-2 rounded-lg font-mono text-[10.5px] border outline-none text-right ${
                                      isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = aiParsedReceipt.items.filter((_: any, i: number) => i !== idx);
                                setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                              }}
                              className="text-rose-500 hover:text-rose-400 text-xs px-1 cursor-pointer"
                            >
                              √ó
                            </button>
                          </div>
                        ))}
                        {(!aiParsedReceipt.items || aiParsedReceipt.items.length === 0) && (
                          <p className="text-[10px] text-slate-500 italic p-2 text-center">No line items parsed.</p>
                        )}
                      </div>
                    </div>

                    {/* Financial Subtotals */}
                    <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Subtotal ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={aiParsedReceipt.subtotal || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, subtotal: Number(e.target.value) || 0 })}
                          className={`w-full h-8 px-2 rounded-lg font-mono text-xs border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Tax ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={aiParsedReceipt.tax || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, tax: Number(e.target.value) || 0 })}
                          className={`w-full h-8 px-2 rounded-lg font-mono text-xs border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Tip ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={aiParsedReceipt.tip || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, tip: Number(e.target.value) || 0 })}
                          className={`w-full h-8 px-2 rounded-lg font-mono text-xs border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Total Charge */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-indigo-400 tracking-wider block mb-1">Total Charge ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={aiParsedReceipt.totalCharge || ""}
                        onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, totalCharge: Number(e.target.value) || 0 })}
                        className={`w-full max-w-[180px] h-10 px-3 rounded-xl font-mono text-sm border outline-none transition-all ${
                          isDark ? "bg-indigo-950/25 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-805"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAiParsedReceipt(null);
                        setSpendingReceipt(null);
                        triggerHaptic("medium");
                      }}
                      className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black uppercase text-xs tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const itemsSummary = aiParsedReceipt.items && aiParsedReceipt.items.length > 0
                          ? "Items:\n" + aiParsedReceipt.items.map((it: any) => `- ${it.name}: $${Number(it.cost).toFixed(2)}`).join("\n") + "\n\n"
                          : "";
                        const financialSummary = `Subtotal: $${Number(aiParsedReceipt.subtotal || 0).toFixed(2)}\nTax: $${Number(aiParsedReceipt.tax || 0).toFixed(2)}\nTip: $${Number(aiParsedReceipt.tip || 0).toFixed(2)}\nTotal Charge: $${Number(aiParsedReceipt.totalCharge || 0).toFixed(2)}\nReceipt #: ${aiParsedReceipt.receiptNumber || "N/A"}`;
                        
                        const newSpending = {
                          id: "spend_" + Date.now(),
                          amount: Number(aiParsedReceipt.totalCharge) || 0,
                          vendor: aiParsedReceipt.vendor || "Unknown Vendor",
                          category: spendingCategory,
                          date: aiParsedReceipt.date || spendingDate,
                          notes: (itemsSummary + financialSummary).trim(),
                          receiptPhoto: spendingReceipt || undefined,
                          createdAt: Date.now()
                        };
                        saveSpendings([newSpending, ...spendings]);
                        
                        // Clear form and reset
                        setAiParsedReceipt(null);
                        setSpendingAmount("");
                        setSpendingNotes("");
                        setSpendingReceipt(null);
                        triggerHaptic("success");
                      }}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md active:scale-95"
                    >
                      Accept & Save
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddSpending} className={`p-5 rounded-3xl border space-y-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Add New Expense</h3>
                    <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">Record real-time transactions</p>
                  </div>

                  <div className="space-y-3.5 text-left">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Amount ($)</label>
                      <FastInput
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={spendingAmount}
                        onChange={(val) => setSpendingAmount(val)}
                        className={`w-full max-w-[180px] h-10 px-3 rounded-xl font-mono text-sm border outline-none transition-all ${
                          isDark ? "bg-slate-955 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Vendor</label>
                          <button
                            type="button"
                            onClick={() => setShowManageSpendingVendors(true)}
                            className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <select
                          value={spendingVendor}
                          onChange={(e) => setSpendingVendor(e.target.value)}
                          className={`w-full h-10 px-2 rounded-xl text-xs border outline-none transition-all cursor-pointer ${
                            isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{ colorScheme: isDark ? "dark" : "light" }}
                        >
                          {spendingVendors.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Category</label>
                          <button
                            type="button"
                            onClick={() => setShowManageSpendingCategories(true)}
                            className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <select
                          value={spendingCategory}
                          onChange={(e) => setSpendingCategory(e.target.value)}
                          className={`w-full h-10 px-2 rounded-xl text-xs border outline-none transition-all cursor-pointer ${
                            isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{ colorScheme: isDark ? "dark" : "light" }}
                        >
                          {spendingCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={spendingDate}
                        onChange={(e) => setSpendingDate(e.target.value)}
                        className={`w-full h-10 px-3 rounded-xl font-mono text-xs border outline-none transition-all ${
                          isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Notes (Optional)</label>
                      <FastInput
                        type="text"
                        placeholder="Payment description..."
                        value={spendingNotes}
                        onChange={(val) => setSpendingNotes(val)}
                        className={`w-full h-10 px-3 rounded-xl text-xs border outline-none transition-all ${
                          isDark ? "bg-slate-955 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">Receipt Attachment</label>
                      <div className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-all ${
                        isCameraOpen
                          ? "h-64 border-indigo-500/50 bg-slate-950/90"
                          : spendingReceipt
                            ? "h-24 border-emerald-500/50 bg-emerald-500/5"
                            : isDark
                              ? "border-white/10 bg-slate-950/40 hover:border-indigo-500/40 h-24"
                              : "border-slate-200 bg-slate-50 hover:border-indigo-500/40 h-24"
                      }`}>
                        {isCameraOpen ? (
                          <div className="relative w-full h-full flex flex-col items-center justify-between">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="w-full h-[180px] object-cover rounded-xl bg-black border border-white/5"
                            />
                            <div className="flex gap-2 w-full justify-center mt-2 z-20">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[9.5px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
                              >
                                üì∏ Capture Receipt
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                              >
                                ‚ùå Cancel
                              </button>
                            </div>
                          </div>
                        ) : spendingReceipt ? (
                          <div className="flex items-center gap-3 w-full">
                            <img
                              src={spendingReceipt}
                              alt="Receipt Thumbnail"
                              className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[9px] font-black uppercase text-emerald-400">Photo Attached</p>
                              <div className="flex items-center gap-2 mt-1">
                                {isScanningReceipt ? (
                                  <span className="text-[9.5px] font-black uppercase text-indigo-400 animate-pulse">
                                    Scanning...
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleScanReceipt(spendingReceipt)}
                                    className="text-[9.5px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                                  >
                                    Scan with AI ‚ú®
                                  </button>
                                )}
                                <span className="text-slate-600 text-xs">‚Ä¢</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSpendingReceipt(null);
                                    setAiParsedReceipt(null);
                                  }}
                                  disabled={isScanningReceipt}
                                  className="text-[9.5px] font-black uppercase text-rose-500 hover:text-rose-400 cursor-pointer disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 w-full h-full relative">
                            <Camera size={18} className="text-indigo-400 mb-0.5" />
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Drag & drop or Click to Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    setSpendingReceipt(base64);
                                    handleScanReceipt(base64);
                                  };
                                  r.readAsDataURL(file);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full max-w-[150px] h-[1px] bg-slate-500/10 my-1 z-20" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startCamera();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[8.5px] font-black uppercase tracking-widest z-20 transition-all active:scale-95 shadow-md cursor-pointer"
                            >
                              Use Live Camera üì∏
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>Record Transaction</span>
                  </button>
                </form>
              )}

              {/* Dashboard Analytics & Filters */}
              <div className="col-span-1 lg:col-span-2 space-y-6 flex flex-col justify-between">
                {/* Quick Filters */}
                <div className={`p-4 rounded-3xl border flex flex-wrap items-center gap-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Filter Vendor</label>
                    <select
                      value={spendingFilterVendor}
                      onChange={(e) => setSpendingFilterVendor(e.target.value)}
                      className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                        isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                    >
                      <option value="All">All Vendors</option>
                      {spendingVendors.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Filter Category</label>
                    <select
                      value={spendingFilterCategory}
                      onChange={(e) => setSpendingFilterCategory(e.target.value)}
                      className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                        isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                    >
                      <option value="All">All Categories</option>
                      {spendingCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date Range Preset</label>
                    <select
                      value={spendingFilterDateMode}
                      onChange={(e) => setSpendingFilterDateMode(e.target.value as any)}
                      className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                        isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                    >
                      <option value="all">All Dates</option>
                      <option value="week">Past 7 Days</option>
                      <option value="month">Past 30 Days</option>
                      <option value="range">Custom Range</option>
                    </select>
                  </div>

                  {spendingFilterDateMode === "range" && (
                    <div className="w-full flex gap-3 mt-1.5">
                      <div className="flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={spendingFilterStartDate}
                          onChange={(e) => setSpendingFilterStartDate(e.target.value)}
                          className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={spendingFilterEndDate}
                          onChange={(e) => setSpendingFilterEndDate(e.target.value)}
                          className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Statistics Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Filtered Spent</p>
                    <p className="text-2xl font-black text-rose-500 mt-1">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Average Transaction</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">${avgSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Category Breakdown Chart */}
                <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Expense Breakdown by Category</h3>
                    <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">Relative spending ratios</p>
                  </div>
                  {spendingByCategoryData.length === 0 ? (
                    <div className="py-12 flex items-center justify-center text-xs text-slate-500 font-mono uppercase">
                      No transactions recorded
                    </div>
                  ) : (
                    <div className="relative w-full h-52 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={spendingByCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {spendingByCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${value}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-rose-500">${totalSpent.toFixed(0)}</span>
                        <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-black">Filtered Total</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center mt-2 max-h-24 overflow-y-auto">
                    {spendingByCategoryData.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-[9.5px] font-semibold bg-white/5 px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                        <span className="truncate opacity-75">{item.name}:</span>
                        <span className="font-black">${item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : spendingActiveTab === "ledger" ? (
          /* EXPENSE LEDGER TAB WITH GROUPING & COLLAPSIBILITY */
          <div className="space-y-6 text-left">
            {/* Quick Filters */}
            <div className={`p-4 rounded-3xl border flex flex-wrap items-center gap-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
              <div className="flex-1 min-w-[140px]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Filter Vendor</label>
                  <button
                    type="button"
                    onClick={() => setShowManageSpendingVendors(true)}
                    className="text-[8.5px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Edit List
                  </button>
                </div>
                <select
                  value={spendingFilterVendor}
                  onChange={(e) => setSpendingFilterVendor(e.target.value)}
                  className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="All">All Vendors</option>
                  {spendingVendors.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Filter Category</label>
                  <button
                    type="button"
                    onClick={() => setShowManageSpendingCategories(true)}
                    className="text-[8.5px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Edit List
                  </button>
                </div>
                <select
                  value={spendingFilterCategory}
                  onChange={(e) => setSpendingFilterCategory(e.target.value)}
                  className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="All">All Categories</option>
                  {spendingCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date Range Preset</label>
                <select
                  value={spendingFilterDateMode}
                  onChange={(e) => setSpendingFilterDateMode(e.target.value as any)}
                  className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="all">All Dates</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                  <option value="range">Custom Range</option>
                </select>
              </div>

              {spendingFilterDateMode === "range" && (
                <div className="w-full flex gap-3 mt-1.5">
                  <div className="flex-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Start Date</label>
                    <input
                      type="date"
                      value={spendingFilterStartDate}
                      onChange={(e) => setSpendingFilterStartDate(e.target.value)}
                      className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                        isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">End Date</label>
                    <input
                      type="date"
                      value={spendingFilterEndDate}
                      onChange={(e) => setSpendingFilterEndDate(e.target.value)}
                      className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                        isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grouping Selectors & Statistics */}
            <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Group Rows By:</span>
                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 gap-1">
                  {(["date", "vendor", "category"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLedgerGroupBy(mode)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        ledgerGroupBy === mode
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-500 block">Total Cost</span>
                    <span className="font-mono text-sm font-black text-rose-500">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-500 block">Transaction Count</span>
                    <span className="font-mono text-sm font-black text-indigo-400">{filteredSpendings.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* List Table Container */}
            <div className={`p-5 rounded-3xl border flex flex-col text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Ledger Records</h3>
                <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">
                  Grouped by {ledgerGroupBy} ({filteredSpendings.length} records matched)
                </p>
              </div>

              {filteredSpendings.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono uppercase tracking-wider border border-dashed border-white/5 rounded-2xl mt-4">
                  No matching transactions found
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 font-black uppercase text-[8.5px] tracking-wider">
                        <th className="py-2 text-center w-8"></th>
                        <th className="py-2 text-left">Date</th>
                        <th className="py-2 text-left">Vendor</th>
                        <th className="py-2 text-left">Category</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold">
                      {sortedGroupKeys.map((groupKey) => {
                        const items = groupedSpendings[groupKey] || [];
                        const groupSum = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                        const displayedGroupKey = ledgerGroupBy === "date" ? formatDateToMMDDYY(groupKey) : groupKey;

                        return (
                          <React.Fragment key={groupKey}>
                            {/* Group Header Row */}
                            <tr className={`${isDark ? "bg-indigo-950/20" : "bg-slate-100/60"} border-t border-b border-white/5`}>
                              <td colSpan={5} className="py-2.5 px-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">
                                      {displayedGroupKey}
                                    </span>
                                    <span className="text-[9px] text-slate-455 font-mono">
                                      ({items.length} {items.length === 1 ? "transaction" : "transactions"})
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[8px] uppercase font-black text-slate-500 mr-1.5">Group Total:</span>
                                    <span className="font-mono text-[11px] font-black text-rose-500">
                                      ${groupSum.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {/* Group Member Rows */}
                            {items.map((item) => {
                              const isExpanded = !!expandedLedgerRows[item.id];
                              return (
                                <React.Fragment key={item.id}>
                                  <tr
                                    onClick={() => toggleRowExpansion(item.id)}
                                    className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${
                                      isExpanded ? (isDark ? "bg-indigo-950/5" : "bg-indigo-50/20") : ""
                                    }`}
                                  >
                                    <td className="py-3 text-center">
                                      <button
                                        type="button"
                                        className="text-slate-400 hover:text-slate-200"
                                      >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </button>
                                    </td>
                                    <td className="py-3 font-mono text-[10px] text-slate-400">
                                      {formatDateToMMDDYY(item.date)}
                                    </td>
                                    <td className="py-3 font-black text-indigo-300">{item.vendor}</td>
                                    <td className="py-3">
                                      <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                                        {item.category}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right font-mono font-black text-rose-450 text-sm">
                                      ${Number(item.amount).toFixed(2)}
                                    </td>
                                  </tr>

                                  {/* Collapsible details pane row */}
                                  {isExpanded && (
                                    <tr className={isDark ? "bg-slate-950/40" : "bg-slate-50/50"}>
                                      <td></td>
                                      <td colSpan={4} className="p-4 text-left border-t border-b border-white/5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                          <div className="space-y-3">
                                            <div>
                                              <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Description / Notes</span>
                                              <p className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"} bg-black/10 p-2 rounded-xl border border-white/5`}>
                                                {item.notes || "No additional notes provided for this transaction."}
                                              </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                              <div>
                                                <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block">Recorded At</span>
                                                <span className="font-mono text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                                              </div>
                                              <div>
                                                <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block">ID</span>
                                                <span className="font-mono text-[9px] text-slate-500">{item.id}</span>
                                              </div>
                                            </div>

                                            <div className="pt-2">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (confirm("Delete this transaction?")) {
                                                    saveSpendings(spendings.filter(s => s.id !== item.id));
                                                    triggerHaptic("medium");
                                                  }
                                                }}
                                                className="px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all font-black uppercase text-[9px] tracking-wider cursor-pointer inline-flex items-center gap-1"
                                              >
                                                <Trash size={10} />
                                                <span>Delete Record</span>
                                              </button>
                                            </div>
                                          </div>

                                          <div>
                                            <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">Receipt Image</span>
                                            {item.receiptPhoto ? (
                                              <div className="relative group w-48 h-32 rounded-xl overflow-hidden border border-white/10 shadow-md">
                                                <img
                                                  src={item.receiptPhoto}
                                                  alt="Receipt Preview"
                                                  className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveReceiptPreview(item.receiptPhoto);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-indigo-600 text-white rounded text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                                  >
                                                    View Full Image
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="h-32 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] text-slate-500 italic">
                                                No receipt attached
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          renderSpendingTrendsTab()
        )}
      </div>
    );
  };

  // States for the AI Dynamic Task Auto-Fill with Grounded Search
  const [showAiAutofillModal, setShowAiAutofillModal] = useState(false);
  const [aiAutofillText, setAiAutofillText] = useState("");
  const [isAiAutofillProcessing, setIsAiAutofillProcessing] = useState(false);
  const [aiAutofillError, setAiAutofillError] = useState("");
  const [aiAutofillResponseSummary, setAiAutofillResponseSummary] = useState("");

  const handleAiAutofillTask = async () => {
    if (!aiAutofillText.trim()) {
      setAiAutofillError("Please enter or paste some descriptive text first.");
      return;
    }

    setIsAiAutofillProcessing(true);
    setAiAutofillError("");
    setAiAutofillResponseSummary("");

    try {
      // Collect unique locations from active tasks to pass as reference
      const existingLocations = Array.from(new Set(tasks.map(t => t.location).filter(Boolean)));

      const response = await fetch("/api/ai-autofill-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: aiAutofillText,
          notes,
          collaborators,
          existingLocations,
          generatedPlans,
          currentDate: taskDate || new Date().toISOString().split("T")[0]
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        const payload = resData.data;

        // Auto-fill individual fields if returned
        if (payload.title) setTaskTitle(payload.title);
        if (payload.date) setTaskDate(payload.date);
        if (payload.time) setTaskTime(payload.time);
        if (payload.duration) setTaskDuration(payload.duration);
        if (payload.location) setTaskLocation(payload.location);
        if (payload.attendees) setTaskAttendees(payload.attendees);
        if (payload.phone) setTaskPhone(payload.phone);
        if (payload.notes) setTaskNotes(payload.notes);
        if (typeof payload.isLocked === "boolean") setTaskIsLocked(payload.isLocked);
        if (typeof payload.isAllDay === "boolean") setTaskIsAllDay(payload.isAllDay);
        
        // Handle priority mapping safely
        if (payload.priority && ["none", "low", "medium", "high"].includes(payload.priority)) {
          setTaskPriority(payload.priority as any);
        }

        // Handle category matching or adding
        if (payload.category) {
          const matchedCat = categories.find(c => c.toLowerCase() === payload.category.toLowerCase());
          if (matchedCat) {
            setTaskCategory(matchedCat);
          } else {
            const updatedCategories = [...categories, payload.category];
            setCategories(updatedCategories);
            localStorage.setItem("task_categories_v1", JSON.stringify(updatedCategories));
            setTaskCategory(payload.category);
          }
        }

        // Handle collaborator mapping
        if (payload.collaborator) {
          const matchedCol = collaborators.find(c => c.toLowerCase() === payload.collaborator.toLowerCase());
          if (matchedCol) {
            setTaskCollaborator(matchedCol);
          }
        }

        // Show the summary
        setAiAutofillResponseSummary(payload.aiSummary || "Completed parsing! Fields have been auto-filled on this task sheet.");
        triggerHaptic("light");
      } else {
        setAiAutofillError(resData.error || "Failed to analyze and auto-fill details.");
      }
    } catch (err: any) {
      console.error("AI Auto-fill fetch error:", err);
      setAiAutofillError(err.message || "Network error. Failed to execute AI auto-fill extraction.");
    } finally {
      setIsAiAutofillProcessing(false);
    }
  };

  // States for the AI Recalibration Program Generator
  const [showProgramGenerator, setShowProgramGenerator] = useState(false);
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(null);
  const [blockFilter, setBlockFilter] = useState<string>("all");

  // Dynamic Generated Performance OS Plans States
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("default_burnout");
  
  // Custom generation inputs
  const [coachProfile, setCoachProfile] = useState<"performance" | "oa">("performance");
  const [planPromptInput, setPlanPromptInput] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [generationStepsLogs, setGenerationStepsLogs] = useState<string[]>([]);
  
  // Editing individual selected plan
  const [isEditingPlan, setIsEditingPlan] = useState<boolean>(false);
  const [editPlanTitle, setEditPlanTitle] = useState<string>("");
  const [editPlanDesc, setEditPlanDesc] = useState<string>("");
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  
  // Temporary state for block editor
  const [editBlockTime, setEditBlockTime] = useState<string>("");
  const [editBlockLabel, setEditBlockLabel] = useState<string>("");
  const [editBlockIcon, setEditBlockIcon] = useState<string>("");
  const [editBlockDuration, setEditBlockDuration] = useState<string>("");
  const [editBlockTitle, setEditBlockTitle] = useState<string>("");
  const [editBlockDescription, setEditBlockDescription] = useState<string>("");
  const [editBlockWhy, setEditBlockWhy] = useState<string>("");
  const [editBlockBaseChecksStr, setEditBlockBaseChecksStr] = useState<string>("");

  // Dynamic Plan Regeneration & Versioning States
  const [regenerationPromptInput, setRegenerationPromptInput] = useState<string>("");
  const [isRegeneratingPlan, setIsRegeneratingPlan] = useState<boolean>(false);
  const [regenerationStepsLogs, setRegenerationStepsLogs] = useState<string[]>([]);
  const [lastRegeneratedPlan, setLastRegeneratedPlan] = useState<GeneratedPlan | null>(null);

  const getActivePlan = (): GeneratedPlan => {
    const custom = generatedPlans.find(p => p.id === selectedPlanId);
    if (custom) return custom;
    return DEFAULT_BURNOUT_PLAN;
  };

  // ============================================
  // TASK REPORT FILTER & SELECTOR STATES
  // ============================================
  // Task Report Filter States
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<"date" | "collaborator" | "location" | "export" | "groupby" | null>(null);
  const [reportDateMode, setReportDateMode] = useState<"none" | "single" | "range">("none");
  const [reportSingleDate, setReportSingleDate] = useState<string>(selectedDate || "");
  const [reportStartDate, setReportStartDate] = useState<string>(selectedDate || "");
  const [reportEndDate, setReportEndDate] = useState<string>(selectedDate || "");

  const [reportCollaboratorMode, setReportCollaboratorMode] = useState<"all" | "single" | "multiple" | "none">("all");
  const [reportSelectedCollaborators, setReportSelectedCollaborators] = useState<string[]>([]);

  const [reportLocationMode, setReportLocationMode] = useState<"all" | "single" | "multiple" | "none">("all");
  const [reportSelectedLocations, setReportSelectedLocations] = useState<string[]>([]);

  // Task Report Grouping States
  const [reportGroupByDate, setReportGroupByDate] = useState<boolean>(false);
  const [reportGroupByCollaborator, setReportGroupByCollaborator] = useState<boolean>(false);
  const [reportGroupByLocation, setReportGroupByLocation] = useState<boolean>(false);

  const [reportFiltersCollapsed, setReportFiltersCollapsed] = useState<boolean>(false);
  const [reportSortBy, setReportSortBy] = useState<"date" | "title" | "priority">("date");
  const [reportSortBy1, setReportSortBy1] = useState<"date" | "title" | "priority" | "category" | "collaborator" | "duration">("date");
  const [reportSortBy2, setReportSortBy2] = useState<"date" | "title" | "priority" | "category" | "collaborator" | "duration">("priority");
  const [reportSortBy3, setReportSortBy3] = useState<"date" | "title" | "priority" | "category" | "collaborator" | "duration">("title");

  const getActivePlanBlocks = () => {
    return getActivePlan().blocks;
  };

  const [checksState, setChecksState] = useState<Record<string, Record<number, boolean>>>({});
  const [aiSuggestionsState, setAiSuggestionsState] = useState<Record<string, { suggestions: { action1: string, action2: string } | null, checks: Record<string, boolean> }>>({});
  const [generatingBlockLabel, setGeneratingBlockLabel] = useState<string | null>(null);

  const saveBlueprintStateToCloud = (
    nextChecks: Record<string, Record<number, boolean>>,
    nextAi: Record<string, { suggestions: any, checks: Record<string, boolean> }>
  ) => {
    if (db && currentUser) {
      const bId = `${currentUser.uid}_${selectedDate}_${selectedPlanId}`;
      const docRef = doc(db, "blueprints", bId);
      setDoc(docRef, cleanForFirestore({
        id: bId,
        userId: currentUser.uid,
        date: selectedDate,
        planId: selectedPlanId,
        checksState: nextChecks,
        aiSuggestionsState: nextAi
      })).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `blueprints/${bId}`);
      });
    }
  };

  const savePlanToCloudAndLocal = (planId: string, updatedPlan: GeneratedPlan) => {
    setGeneratedPlans(prev => {
      const index = prev.findIndex(p => p.id === planId);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedPlan;
        return next;
      } else {
        return [...prev, updatedPlan];
      }
    });

    const localKey = "taskpass_generated_plans_v10";
    try {
      const stored = localStorage.getItem(localKey);
      let localPlans: GeneratedPlan[] = [];
      if (stored) {
        localPlans = JSON.parse(stored);
      }
      const index = localPlans.findIndex(p => p.id === planId);
      if (index >= 0) {
        localPlans[index] = updatedPlan;
      } else {
        localPlans.push(updatedPlan);
      }
      localStorage.setItem(localKey, JSON.stringify(localPlans));
    } catch (e) {
      console.error("Local storage plan save error:", e);
    }

    if (db && currentUser) {
      setDoc(doc(db, "generated_plans", planId), cleanForFirestore(updatedPlan)).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `generated_plans/${planId}`);
      });
    }
  };

  const deletePlanFromCloudAndLocal = (planId: string) => {
    setGeneratedPlans(prev => prev.filter(p => p.id !== planId));

    const localKey = "taskpass_generated_plans_v10";
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        let localPlans: GeneratedPlan[] = JSON.parse(stored);
        localPlans = localPlans.filter(p => p.id !== planId);
        localStorage.setItem(localKey, JSON.stringify(localPlans));
      }
    } catch (e) {
      console.error("Local storage plan delete error:", e);
    }

    if (db && currentUser) {
      deleteDoc(doc(db, "generated_plans", planId)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `generated_plans/${planId}`);
      });
    }

    if (selectedPlanId === planId) {
      setSelectedPlanId("default_burnout");
    }
  };

  const [generatorModalTab, setGeneratorModalTab] = useState<"library" | "checklist">("checklist");

  const handleGenerateNewPlan = async () => {
    const inputToUse = planPromptInput.trim() || (coachProfile === "oa" ? "Overcoming Procrastination" : "Daily High Performance Routine");
    if (!planPromptInput.trim()) {
      setPlanPromptInput(inputToUse);
    }
    setIsGeneratingPlan(true);
    setGenerationStepsLogs([
      "Connecting to performance agent system...",
      coachProfile === "oa" 
        ? "Contacting Behavioral Psychologist & Productivity Coach..." 
        : "Fetching Burnout Recovery Model blocks as layout template..."
    ]);
    
    try {
      let promptText = "";
      if (coachProfile === "oa") {
        promptText = `You are a behavioral psychologist and productivity system designer. The user wants to learn "${inputToUse}" but keeps procrastinating. Your job is to generate a structured daily plan in the following exact JSON format so it can be inserted into a calendar/timeline:
{
  "title": "OA Overcoming Procrastination Plan: ${inputToUse}",
  "description": "Custom psychological system and daily plan to overcome procrastination and learn ${planPromptInput}.",
  "blocks": [
    {
      "time": "09:00",
      "label": "üß† Diagnosis",
      "icon": "üß†",
      "duration": "10 min",
      "category": "mindset",
      "title": "üß† Diagnosis: [resistance type] ‚Äî [one-line explanation]",
      "description": "Identifying whether the root cause of procrastination is fear (of failure, judgment, or difficulty), confusion, or low motivation.",
      "why": "Understanding the emotional block is the first step to overriding avoidant habits.",
      "baseChecks": [],
      "triathlete": true,
      "founder": true,
      "recovery": true
    },
    {
      "time": "09:10",
      "label": "‚ö° Starter",
      "icon": "‚ö°",
      "duration": "5 min",
      "category": "mindset",
      "title": "‚ö° Starter: [action]",
      "description": "5-Minute Starter Ritual ‚Äî one micro-task so small it cannot be refused.",
      "why": "Action precedes motivation. Lowering the barrier to start breaks avoidant inertia.",
      "baseChecks": [
        "‚Ä¢ Why it works: [one sentence describing why this specific starter task works for the user]"
      ],
      "triathlete": true,
      "founder": true,
      "recovery": true
    },
    {
      "time": "12:00",
      "label": "üë• Accountability",
      "icon": "üë•",
      "duration": "10 min",
      "category": "mindset",
      "title": "üë• Accountability: [action]",
      "description": "Accountability Structure ‚Äî one concrete accountability action for today.",
      "why": "Designated check-ins leverage social commitment to maximize compliance.",
      "baseChecks": [
        "‚Ä¢ Who/what: [person, app, or system]",
        "‚Ä¢ Check-in time: [time]"
      ],
      "triathlete": true,
      "founder": true,
      "recovery": true
    },
    {
      "time": "17:00",
      "label": "üìä Progress Check",
      "icon": "üìä",
      "duration": "10 min",
      "category": "mindset",
      "title": "üìä Progress Check: [action]",
      "description": "Progress Visualization ‚Äî one tracking action to make wins visible.",
      "why": "Explicit win tracking creates immediate reward feedback loops to hardwire the new habit.",
      "baseChecks": [
        "‚Ä¢ Method: [habit tracker / journal / chart]",
        "‚Ä¢ Milestone to mark: [specific win]"
      ],
      "triathlete": true,
      "founder": true,
      "recovery": true
    },
    {
      "time": "20:00",
      "label": "üéâ Reward",
      "icon": "üéâ",
      "duration": "15 min",
      "category": "mindset",
      "title": "üéâ Reward: [reward]",
      "description": "Reward System ‚Äî one micro-reward tied to today‚Äôs completion.",
      "why": "Immediate, healthy rewards help reinforce the dopamine loops of completing learning blocks.",
      "baseChecks": [
        "‚Ä¢ Trigger: [what must be done first]",
        "‚Ä¢ Celebration: [the reward action]"
      ],
      "triathlete": true,
      "founder": true,
      "recovery": true
    }
  ]
}

Fill in the square brackets (e.g. [resistance type], [one-line explanation], [action], [reward], [person, app, or system], [time], [habit tracker / journal / chart], [specific win], [what must be done first], [the reward action], etc.) with specific, concrete ideas suited to learning "${inputToUse}" and preventing procrastination. Keep the blocks in this exact order and keep the subtasks prefixed with "‚Ä¢ ". Do NOT include any markdown backticks, prefix, or explanation. Return ONLY this parseable JSON object.`;
      } else {
        promptText = `You are an elite productivity, lifestyle, identity alignment and high-performance coach.
The user wants you to generate a new customized, complete, step-by-step Performance Operating System (OS) routine based on this prompt: "${inputToUse}".

To guarantee compatibility, you MUST structured your outcome in the EXACT JSON schema of the Burnout Recovery blueprint program:
{
  "title": "A short beautiful name for this blueprint",
  "description": "Engaging 1-2 sentence statement explaining the philosophy or design target of this routine",
  "blocks": [
    {
      "time": "08:30",
      "label": "LABEL (a short 1-2 word capital uppercase stage key, e.g. AM COGNITIVE or HEAVY FOCUS)",
      "icon": "‚öôÔ∏è (specify one valid beautiful emoji representing this block)",
      "duration": "E.g. 45 min",
      "category": "mindset",
      "title": "Enter a premium action title",
      "description": "Powerful 1-2 sentence summary of block's focal objective",
      "why": "The psychological, behavioral, or neurological reasoning for this activity block",
      "baseChecks": [
        "First specific micro-action checkbox description",
        "Second specific micro-action checkbox description"
      ],
      "triathlete": true,
      "founder": true,
      "recovery": true
    }
  ]
}

Provide between 4 and 8 chronological blocks covering the relevant day/routine. Keep the baseChecks to 2-3 clean key action checklists.
Return ONLY this parseable JSON object, without any markdown backticks, prefix, or explanation.`;
      }

      setGenerationStepsLogs(prev => [...prev, "Transmitting instruction vector to Gemini-3.5-Flash...", "Assembling performance OS daily blocks checklist..."]);

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          jsonMode: true
        })
      });

      if (!res.ok) throw new Error("Connection failed or model congested");
      const data = await res.json();
      
      const jsonStr = data.text?.trim() || "{}";
      const cleaned = jsonStr.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.title || !parsed.blocks || !Array.isArray(parsed.blocks)) {
        throw new Error("Returned blueprint does not match required OS schema");
      }

      setGenerationStepsLogs(prev => [...prev, "Formulating plan object...", "Saving and syncing routine structure..."]);

      const newPlanId = "plan_" + Date.now();
      const newPlan: GeneratedPlan = {
        id: newPlanId,
        userId: currentUser?.uid || "anonymous",
        title: parsed.title,
        description: parsed.description || "Custom AI-generated lifestyle / performance agenda roadmap.",
        createdAt: Date.now(),
        blocks: parsed.blocks.map((b: any, index: number) => ({
          time: b.time || dayStartHour || "08:00",
          label: (b.label || `BLOCK ${index + 1}`).toUpperCase(),
          icon: b.icon || "‚öôÔ∏è",
          duration: b.duration || "30 min",
          category: b.category || "recovery",
          title: b.title || "Untitled Activity Block",
          description: b.description || "",
          why: b.why || "",
          baseChecks: Array.isArray(b.baseChecks) ? b.baseChecks : ["Commence block activity"],
          triathlete: b.triathlete !== undefined ? !!b.triathlete : true,
          founder: b.founder !== undefined ? !!b.founder : true,
          recovery: b.recovery !== undefined ? !!b.recovery : true
        }))
      };

      savePlanToCloudAndLocal(newPlanId, newPlan);
      setSelectedPlanId(newPlanId);
      setPlanPromptInput("");
      setGeneratorModalTab("checklist");
      setGenerationStepsLogs([]);
      triggerHaptic("success");
    } catch (err: any) {
      console.error("Plan creation generator error:", err);
      setGenerationStepsLogs(prev => [...prev, `‚ùå Error: ${err.message || "Failed to generate. Please try again with different inputs."}`]);
      setTimeout(() => {
        setGenerationStepsLogs([]);
      }, 6000);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleRegeneratePlan = async () => {
    if (!regenerationPromptInput.trim()) return;
    const activePlan = getActivePlan();
    setIsRegeneratingPlan(true);
    setRegenerationStepsLogs([
      "Analyzing current plan structure...",
      "Injecting alignment and custom refinement inputs..."
    ]);

    try {
      const originalPlanJson = JSON.stringify(activePlan, null, 2);
      const promptText = `You are an elite productivity, lifestyle, identity alignment and high-performance coach.
The user wants you to REGENERATE/REBUILD their existing Performance Operating System (OS) plan with specific instructions.

IMPORTANT CONTEXT:
Here is their absolute CURRENT active plan structure:
${originalPlanJson}

Here are their feedback/regeneration refinement instructions: "${regenerationPromptInput}".

Please apply their instructions to create an optimized version of this plan. Keep what is good and works, and adjust or replace parts based on their directive.
To guarantee compatibility, you MUST structure your outcome in the EXACT same JSON schema as the input plan:
{
  "title": "A short beautiful, possibly updated version/name for this blueprint",
  "description": "Engaging 1-2 sentence statement explaining the updated philosophy/design of this routine",
  "blocks": [
    {
      "time": "08:30",
      "label": "LABEL (short 1-2 word uppercase stage key. E.g. AM COGNITIVE or HEAVY FOCUS)",
      "icon": "‚öôÔ∏è (one beautiful emoji)",
      "duration": "E.g. 45 min",
      "category": "mindset",
      "title": "Enter a premium action title",
      "description": "Powerful 1-2 sentence summary of block's focal objective",
      "why": "The psychological, behavioral, or neurological reasoning for this activity block",
      "baseChecks": [
        "First specific micro-action checkbox description",
        "Second specific micro-action checkbox description"
      ],
      "triathlete": true,
      "founder": true,
      "recovery": true
    }
  ]
}

Provide between 4 and 8 chronological blocks covering the relevant day/routine. Keep the baseChecks to 2-3 clean key action checklists.
Return ONLY this parseable JSON object, without any markdown backtick annotations, prefix text, or explanations.`;

      setRegenerationStepsLogs(prev => [
        ...prev,
        "Transmitting instruction vectors to Gemini-3.5-Flash...",
        "Assembling revised performance OS daily blocks checklist..."
      ]);

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          jsonMode: true
        })
      });

      if (!res.ok) throw new Error("Connection failed or model congested");
      const data = await res.json();
      
      const jsonStr = data.text?.trim() || "{}";
      const cleaned = jsonStr.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.title || !parsed.blocks || !Array.isArray(parsed.blocks)) {
        throw new Error("Returned blueprint does not match required OS schema");
      }

      setRegenerationStepsLogs(prev => [...prev, "Formulating temporary preview object...", "Ready for review!"]);

      const tempPlan: GeneratedPlan = {
        id: "plan_regen_" + Date.now(),
        userId: currentUser?.uid || "anonymous",
        title: parsed.title,
        description: parsed.description || "Regenerated lifestyle active agenda.",
        createdAt: Date.now(),
        blocks: parsed.blocks.map((b: any, index: number) => ({
          time: b.time || dayStartHour || "08:00",
          label: (b.label || `BLOCK ${index + 1}`).toUpperCase(),
          icon: b.icon || "‚öôÔ∏è",
          duration: b.duration || "30 min",
          category: b.category || "recovery",
          title: b.title || "Untitled Activity Block",
          description: b.description || "",
          why: b.why || "",
          baseChecks: Array.isArray(b.baseChecks) ? b.baseChecks : ["Commence block activity"],
          triathlete: b.triathlete !== undefined ? !!b.triathlete : true,
          founder: b.founder !== undefined ? !!b.founder : true,
          recovery: b.recovery !== undefined ? !!b.recovery : true
        }))
      };

      setLastRegeneratedPlan(tempPlan);
      setRegenerationStepsLogs([]);
      triggerHaptic("success");
    } catch (err: any) {
      console.error("Plan regeneration error:", err);
      setRegenerationStepsLogs(prev => [...prev, `‚ùå Refinement Error: ${err.message || "Failed to regenerate. Please try again."}`]);
      setTimeout(() => {
        setRegenerationStepsLogs([]);
      }, 6000);
    } finally {
      setIsRegeneratingPlan(false);
    }
  };

  const handleSaveAsNewVersion = () => {
    if (!lastRegeneratedPlan) return;
    const newId = "plan_" + Date.now();
    const finalPlan: GeneratedPlan = {
      ...lastRegeneratedPlan,
      id: newId,
      createdAt: Date.now()
    };
    savePlanToCloudAndLocal(newId, finalPlan);
    setSelectedPlanId(newId);
    setLastRegeneratedPlan(null);
    setRegenerationPromptInput("");
    triggerHaptic("success");
  };

  const handleOverwriteCurrent = () => {
    if (!lastRegeneratedPlan) return;
    const activePlan = getActivePlan();
    if (activePlan.id === "default_burnout") {
      // Cannot overwrite built-in burnout recovery plan template, automatically fork as custom draft
      handleSaveAsNewVersion();
      return;
    }
    const finalPlan: GeneratedPlan = {
      ...lastRegeneratedPlan,
      id: activePlan.id,
      createdAt: Date.now()
    };
    savePlanToCloudAndLocal(activePlan.id, finalPlan);
    setLastRegeneratedPlan(null);
    setRegenerationPromptInput("");
    triggerHaptic("success");
  };

  useEffect(() => {
    const localKey = "taskpass_generated_plans_v10";
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        setGeneratedPlans(JSON.parse(stored));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!showProgramGenerator) return;

    const newChecks: Record<string, Record<number, boolean>> = {};
    const newAi: Record<string, { suggestions: any, checks: any }> = {};
    const activeBlocks = getActivePlanBlocks();

    activeBlocks.forEach(block => {
      // Load standard base checks (isolated by plan context)
      const baseKey = `checks_${selectedDate}_${selectedPlanId}_${block.label}`;
      const baseRaw = localStorage.getItem(baseKey);
      if (baseRaw) {
        try {
          newChecks[block.label] = JSON.parse(baseRaw);
        } catch {}
      } else {
        newChecks[block.label] = {};
      }

      // Load AI suggestions
      const aiKey = `ai_${selectedDate}_${selectedPlanId}_${block.label}`;
      const aiRaw = localStorage.getItem(aiKey);
      if (aiRaw) {
        try {
          const parsed = JSON.parse(aiRaw);
          newAi[block.label] = {
            suggestions: parsed.suggestions || null,
            checks: parsed.checks || {}
          };
        } catch {}
      } else {
        newAi[block.label] = { suggestions: null, checks: {} };
      }
    });

    if (db && currentUser) {
      const bId = `${currentUser.uid}_${selectedDate}_${selectedPlanId}`;
      const docRef = doc(db, "blueprints", bId);
      getDoc(docRef).then((snap) => {
        if (snap.exists()) {
          const udata = snap.data();
          const dbChecks = udata.checksState || {};
          const dbAi = udata.aiSuggestionsState || {};
          
          activeBlocks.forEach(block => {
            if (!dbChecks[block.label]) dbChecks[block.label] = {};
            if (!dbAi[block.label]) dbAi[block.label] = { suggestions: null, checks: {} };
          });

          setChecksState(dbChecks);
          setAiSuggestionsState(dbAi);

          activeBlocks.forEach(block => {
            localStorage.setItem(`checks_${selectedDate}_${selectedPlanId}_${block.label}`, JSON.stringify(dbChecks[block.label]));
            localStorage.setItem(`ai_${selectedDate}_${selectedPlanId}_${block.label}`, JSON.stringify(dbAi[block.label]));
          });
        } else {
          setChecksState(newChecks);
          setAiSuggestionsState(newAi);
          // Sync initial local values to database
          saveBlueprintStateToCloud(newChecks, newAi);
        }
      }).catch(err => {
        console.error("Error fetching blueprint state from firestore:", err);
        setChecksState(newChecks);
        setAiSuggestionsState(newAi);
      });
    } else {
      setChecksState(newChecks);
      setAiSuggestionsState(newAi);
    }
  }, [selectedDate, showProgramGenerator, selectedPlanId, currentUser]);

  const handleToggleBaseCheck = (blockLabel: string, idx: number) => {
    const nextChecks = {
      ...checksState,
      [blockLabel]: {
        ...(checksState[blockLabel] || {}),
        [idx]: !(checksState[blockLabel]?.[idx])
      }
    };
    setChecksState(nextChecks);
    
    const baseKey = `checks_${selectedDate}_${selectedPlanId}_${blockLabel}`;
    localStorage.setItem(baseKey, JSON.stringify(nextChecks[blockLabel]));
    saveBlueprintStateToCloud(nextChecks, aiSuggestionsState);
  };

  const handleToggleAiCheck = (blockLabel: string, key: string) => {
    const blockAi = aiSuggestionsState[blockLabel] || { suggestions: null, checks: {} };
    const nextAi = {
      ...aiSuggestionsState,
      [blockLabel]: {
        ...blockAi,
        checks: {
          ...blockAi.checks,
          [key]: !blockAi.checks[key]
        }
      }
    };
    setAiSuggestionsState(nextAi);

    const aiKey = `ai_${selectedDate}_${selectedPlanId}_${blockLabel}`;
    localStorage.setItem(aiKey, JSON.stringify({
      suggestions: nextAi[blockLabel].suggestions,
      checks: nextAi[blockLabel].checks
    }));
    saveBlueprintStateToCloud(checksState, nextAi);
  };

  const generateAiSuggestions = async (block: any) => {
    setGeneratingBlockLabel(block.label);
    try {
      const dayOfWeek = getDayOfWeek(selectedDate);
      const promptText = `You are a burnout recovery and performance coach. The user is a burned-out triathlete, founder, or busy human rebuilding their identity and physical/cognitive stamina.
Today is ${dayOfWeek}. Write exactly 2 specific, concrete action suggestions for their daily schedule block: "${block.label}" ("${block.title}").
Details of this schedule block: "${block.description}"
The psychological why for this block is: "${block.why}"

Your suggestions must be highly actionable, realistic, and immediate.
Provide your response as a valid parseable JSON object matching this schema exactly:
{
  "action1": "Short concrete action 1 (max 10 words)",
  "action2": "Short concrete action 2 (max 10 words)"
}
Return ONLY this raw JSON object, without any markdown backticks or explanation.`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          jsonMode: true
        })
      });

      if (!res.ok) throw new Error("Failed to contact Gemini");
      const resultData = await res.json();
      
      const jsonStr = resultData.text?.trim() || "{}";
      const cleaned = jsonStr.replace(/\`\`\`json|\`\`\`/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.action1 && parsed.action2) {
        const nextAi = {
          ...aiSuggestionsState,
          [block.label]: {
            suggestions: parsed,
            checks: {}
          }
        };
        setAiSuggestionsState(nextAi);

        const aiKey = `ai_${selectedDate}_${selectedPlanId}_${block.label}`;
        localStorage.setItem(aiKey, JSON.stringify({
          suggestions: parsed,
          checks: {}
        }));
        saveBlueprintStateToCloud(checksState, nextAi);
      } else {
        throw new Error("Invalid structure returned");
      }
    } catch (err) {
      console.error("Failed to generate suggestions:", err);
      const fallback = {
        action1: `Reflect on ${block.title} for a moment today.`,
        action2: "Take one deliberate slow breath before commencing."
      };
      const nextAi = {
        ...aiSuggestionsState,
        [block.label]: {
          suggestions: fallback,
          checks: {}
        }
      };
      setAiSuggestionsState(nextAi);
      const aiKey = `ai_${selectedDate}_${selectedPlanId}_${block.label}`;
      localStorage.setItem(aiKey, JSON.stringify({
        suggestions: fallback,
        checks: {}
      }));
      saveBlueprintStateToCloud(checksState, nextAi);
    } finally {
      setGeneratingBlockLabel(null);
    }
  };

  const getOverallProgress = () => {
    let total = 0;
    let completed = 0;
    const activeBlocks = getActivePlanBlocks();

    activeBlocks.forEach(block => {
      const numBase = block.baseChecks.length;
      total += numBase;
      const bChecks = checksState[block.label] || {};
      for (let i = 0; i < numBase; i++) {
        if (bChecks[i]) completed++;
      }

      const ai = aiSuggestionsState[block.label] || { suggestions: null, checks: {} };
      if (ai.suggestions) {
        total += 2;
        if (ai.checks["ai_0"]) completed++;
        if (ai.checks["ai_1"]) completed++;
      }
    });

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [deletingCategoryKey, setDeletingCategoryKey] = useState<string | null>(null);

  const [editingCollaboratorKey, setEditingCollaboratorKey] = useState<string | null>(null);
  const [editingCollaboratorValue, setEditingCollaboratorValue] = useState("");
  const [deletingCollaboratorKey, setDeletingCollaboratorKey] = useState<string | null>(null);

  const handleAddNewCategory = (customName?: string) => {
    const val = (customName || newCategoryVal).trim();
    if (!val) return;
    if (!categories.includes(val)) {
      const updated = [...categories, val];
      setCategories(updated);
      localStorage.setItem("task_categories_v1", JSON.stringify(updated));
      saveSystemSettingsToCloud({ categories: updated });
    }
    setTaskCategory(val);
    setNewCategoryVal("");
    setShowNewCategoryInput(false);
  };

  const handleAddNewCollaborator = (customName?: string) => {
    const val = (customName || newCollaboratorVal).trim();
    if (!val) return;
    if (!collaborators.includes(val)) {
      const updated = [...collaborators, val];
      setCollaborators(updated);
      localStorage.setItem("task_collaborators_v1", JSON.stringify(updated));
      saveSystemSettingsToCloud({ collaborators: updated });
    }
    setTaskCollaborator(val);
    setNewCollaboratorVal("");
    setShowNewCollaboratorInput(false);
  };

  const handleAddNoteNewCategory = () => {
    const val = noteNewCategoryVal.trim();
    if (!val) return;
    if (!categories.includes(val)) {
      const updated = [...categories, val];
      setCategories(updated);
      localStorage.setItem("task_categories_v1", JSON.stringify(updated));
      saveSystemSettingsToCloud({ categories: updated });
    }
    setEditNoteProject(val);
    setNoteNewCategoryVal("");
    setShowNoteNewCategoryInput(false);
  };

  const handleAddNoteNewCollaborator = () => {
    const val = noteNewCollaboratorVal.trim();
    if (!val) return;
    if (!collaborators.includes(val)) {
      const updated = [...collaborators, val];
      setCollaborators(updated);
      localStorage.setItem("task_collaborators_v1", JSON.stringify(updated));
      saveSystemSettingsToCloud({ collaborators: updated });
    }
    setEditNoteCollaborator(val);
    setNoteNewCollaboratorVal("");
    setShowNoteNewCollaboratorInput(false);
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const updatedCats = categories.map(cat => cat === oldName ? newName : cat);
    const uniqueCats = Array.from(new Set(updatedCats)) as string[];
    setCategories(uniqueCats);
    localStorage.setItem("task_categories_v1", JSON.stringify(uniqueCats));
    saveSystemSettingsToCloud({ categories: uniqueCats });
    
    // Switch any active selected categories in state
    if (taskCategory === oldName) {
      setTaskCategory(newName);
    }

    const updatedTasks = tasks.map(task => {
      if (task.category === oldName) {
        return { ...task, category: newName };
      }
      return task;
    });
    saveWorkspace(updatedTasks);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const updatedCats = categories.filter(cat => cat !== catToDelete);
    setCategories(updatedCats);
    localStorage.setItem("task_categories_v1", JSON.stringify(updatedCats));
    saveSystemSettingsToCloud({ categories: updatedCats });

    if (taskCategory === catToDelete) {
      setTaskCategory("");
    }

    const updatedTasks = tasks.map(task => {
      if (task.category === catToDelete) {
        const { category, ...rest } = task;
        return { ...rest, category: undefined };
      }
      return task;
    });
    saveWorkspace(updatedTasks);
  };

  const handleRenameCollaborator = (oldName: string, newName: string) => {
    const updatedCols = collaborators.map(col => col === oldName ? newName : col);
    const uniqueCols = Array.from(new Set(updatedCols)) as string[];
    setCollaborators(uniqueCols);
    localStorage.setItem("task_collaborators_v1", JSON.stringify(uniqueCols));
    saveSystemSettingsToCloud({ collaborators: uniqueCols });

    if (taskCollaborator === oldName) {
      setTaskCollaborator(newName);
    }

    const updatedTasks = tasks.map(task => {
      if (task.collaborator === oldName) {
        return { ...task, collaborator: newName };
      }
      return task;
    });
    saveWorkspace(updatedTasks);
  };

  const handleDeleteCollaborator = (colToDelete: string) => {
    const updatedCols = collaborators.filter(col => col !== colToDelete);
    setCollaborators(updatedCols);
    localStorage.setItem("task_collaborators_v1", JSON.stringify(updatedCols));
    saveSystemSettingsToCloud({ collaborators: updatedCols });

    if (taskCollaborator === colToDelete) {
      setTaskCollaborator("");
    }

    const updatedTasks = tasks.map(task => {
      if (task.collaborator === colToDelete) {
        const { collaborator, ...rest } = task;
        return { ...rest, collaborator: undefined };
      }
      return task;
    });
    saveWorkspace(updatedTasks);
  };

  const getAutocompleteSuggestion = (titleText: string) => {
    if (!titleText) return null;
    
    const defaultLocations = ["Office HQ", "State Library", "Powerhouse Gym", "Stanford Campus", "Philz Coffee", "Home Studio", "Downtown Hub"];
    const defaultCollaborators = ["Sarah Jenkins", "Alex Rivera", "David Chen", "Emma Watson", "Michael Brown"];

    const locationPool = Array.from(new Set([
      ...(favoriteLocations || []),
      ...(tasks || []).map(t => t.location).filter((l): l is string => Boolean(l && l.trim())),
      ...defaultLocations
    ]));

    const collaboratorPool = Array.from(new Set([
      ...(collaborators || []),
      ...(tasks || []).map(t => t.collaborator).filter((c): c is string => Boolean(c && c.trim())),
      ...defaultCollaborators
    ]));

    // 1. Check for "with", "with ", "with@", "with @"
    const withMatch = titleText.match(/\b(with)[\s@]*([A-Za-z0-9\s_-]*)$/i);
    // 2. Check for "at", "at ", "at@", "at @", "in", "in ", "in@", "in @"
    const atMatch = titleText.match(/\b(at|in)[\s@]*([A-Za-z0-9\s_-]*)$/i);
    // 3. Check for standalone "@" or "@query"
    const atDirect = titleText.match(/@([A-Za-z0-9\s_-]*)$/i);
    // 4. Check for "for", "for ", "for@"
    const forMatch = titleText.match(/\b(for)[\s@]*([A-Za-z0-9\s_-]*)$/i);

    if (withMatch) {
      const kw = withMatch[1];
      const keywordIndex = titleText.toLowerCase().lastIndexOf(kw.toLowerCase());
      if (keywordIndex !== -1) {
        const query = withMatch[2] || "";
        const matchStart = keywordIndex + kw.length;
        const matches = query.trim()
          ? collaboratorPool.filter(col => col.toLowerCase().includes(query.toLowerCase().trim()))
          : collaboratorPool;
        return {
          type: "collaborator" as const,
          query,
          suggestions: matches,
          matchStart,
          keyword: kw
        };
      }
    }

    if (atMatch) {
      const kw = atMatch[1];
      const keywordIndex = titleText.toLowerCase().lastIndexOf(kw.toLowerCase());
      if (keywordIndex !== -1) {
        const query = atMatch[2] || "";
        const matchStart = keywordIndex + kw.length;
        const matches = query.trim()
          ? locationPool.filter(loc => loc.toLowerCase().includes(query.toLowerCase().trim()))
          : locationPool;
        return {
          type: "location" as const,
          query,
          suggestions: matches,
          matchStart,
          keyword: kw
        };
      }
    }

    if (atDirect) {
      const keywordIndex = titleText.lastIndexOf("@");
      if (keywordIndex !== -1) {
        const query = atDirect[1] || "";
        const matchStart = keywordIndex;
        const locMatches = query.trim()
          ? locationPool.filter(l => l.toLowerCase().includes(query.toLowerCase().trim()))
          : locationPool;
        const colMatches = query.trim()
          ? collaboratorPool.filter(c => c.toLowerCase().includes(query.toLowerCase().trim()))
          : collaboratorPool;

        if (query.trim() && colMatches.length > 0 && locMatches.length === 0) {
          return {
            type: "collaborator" as const,
            query,
            suggestions: colMatches,
            matchStart,
            keyword: "@"
          };
        }
        return {
          type: "location" as const,
          query,
          suggestions: locMatches,
          matchStart,
          keyword: "@"
        };
      }
    }

    if (forMatch) {
      const keywordIndex = titleText.toLowerCase().lastIndexOf("for");
      if (keywordIndex !== -1) {
        const query = forMatch[2] || "";
        const matchStart = keywordIndex + 3;
        const catMatches = query.trim()
          ? categories.filter(c => c.toLowerCase().includes(query.toLowerCase().trim()))
          : categories;
        return {
          type: "category" as const,
          query,
          suggestions: catMatches,
          matchStart,
          keyword: "for"
        };
      }
    }

    return null;
  };
  const [isResolvingMapsUrl, setIsResolvingMapsUrl] = useState(false);
  const [focusResolvingTaskId, setFocusResolvingTaskId] = useState<string | null>(null);
  const [isEditingDurationId, setIsEditingDurationId] = useState<string | null>(null);
  const [manualDurationVal, setManualDurationVal] = useState("");
  const durationClickTimeoutRef = useRef<any>(null);

  const triggeredRemindersRef = useRef<Set<string>>(new Set());
  const [activeAlerts, setActiveAlerts] = useState<Task[]>([]);
  
  // Voice-to-Text Speech Recognition State Variables
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceRecognitionRef, setVoiceRecognitionRef] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reportInlineEdit, setReportInlineEdit] = useState<{
    taskId: string;
    type: "status" | "date" | "collaborator" | "category";
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteInEditModal, setConfirmDeleteInEditModal] = useState(false);
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isRecurringTask?: boolean;
    onConfirmRecurring?: (option: "this" | "all" | "forward") => void;
    isSequenceChoice?: boolean;
    onConfirmSequenceChoice?: (applyToAll: boolean) => void;
  } | null>(null);
  const [editRecurringModal, setEditRecurringModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: (option: "this" | "all" | "forward") => void;
  } | null>(null);

  const requestDeleteTask = (task: Task, onConfirmedExtra?: () => void) => {
    const isRecurring = task.isRecurring || !!task.recurringParentId || task.id.startsWith("virtual__");
    if (isRecurring) {
      setDeleteConfirmationModal({
        isOpen: true,
        title: "Delete Repeating Task",
        description: `"${task.title}" is a repeating task. How would you like to delete it?`,
        isRecurringTask: true,
        onConfirm: () => {
          handleDeleteTask(task.id, "this");
          if (onConfirmedExtra) onConfirmedExtra();
        },
        onConfirmRecurring: (option: "this" | "all" | "forward") => {
          handleDeleteTask(task.id, option);
          if (onConfirmedExtra) onConfirmedExtra();
        }
      });
      return;
    }

    const isSeq = !!(task.groupId && !task.isUnlinked);
    const desc = isSeq 
      ? `Are you sure you want to delete "${task.title}"? The remaining tasks in this sequence will stay grouped together.`
      : `Are you sure you want to permanently delete the task "${task.title}"?`;
    setDeleteConfirmationModal({
      isOpen: true,
      title: "Delete Task",
      description: desc,
      onConfirm: () => {
        handleDeleteTask(task.id);
        if (onConfirmedExtra) {
          onConfirmedExtra();
        }
      }
    });
  };

  // Google Calendar Integration state variables
  const [gcalAccessToken, setGcalAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("gcal_access_token");
  });
  const [isGcalSyncActive, setIsGcalSyncActive] = useState<boolean>(() => {
    return localStorage.getItem("gcal_sync_enabled") === "true";
  });
  const [gcalStatusMsg, setGcalStatusMsg] = useState("");
  const [isGcalLoading, setIsGcalLoading] = useState(false);

  // Google Contacts Integration state variables
  const [contactsAccessToken, setContactsAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("contacts_access_token");
  });
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [contactsStatusMsg, setContactsStatusMsg] = useState("");
  const [contacts, setContacts] = useState<AppContact[]>(() => {
    try {
      const saved = localStorage.getItem("taskpass_contacts_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Contact Edit Modal state variables
  const [editingContact, setEditingContact] = useState<AppContact | null>(null);
  const [showContactEditModal, setShowContactEditModal] = useState(false);
  const [contactGivenName, setContactGivenName] = useState("");
  const [contactFamilyName, setContactFamilyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactOrganization, setContactOrganization] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactIsLocation, setContactIsLocation] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Email/Password Authentication state variables
  const [authTab, setAuthTab] = useState<"google" | "signin" | "signup" | "forgot">("signin");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authActionLoading, setAuthActionLoading] = useState(false);

  // ============================================
  // EMAIL / PASSWORD AUTHENTICATION METHODS
  // ============================================
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Auth service is not initialized.");
      return;
    }
    if (!emailInput || !passwordInput || !nameInput) {
      setAuthError("Please fill in all registration fields.");
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setAuthActionLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      await updateProfile(userCredential.user, {
        displayName: nameInput
      });
      setAuthSuccess(`Account created! Welcome ${nameInput}.`);
      setEmailInput("");
      setPasswordInput("");
      setNameInput("");
      setAuthTab("signin");
    } catch (err: any) {
      console.error("Sign Up Error:", err);
      let friendlyMessage = "Failed to create account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "This email address is already registered.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "The password is too weak.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Auth service is not initialized.");
      return;
    }
    if (!emailInput || !passwordInput) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setAuthActionLoading(true);

    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      setAuthSuccess("Successfully logged in!");
      setEmailInput("");
      setPasswordInput("");
      setAuthTab("signin");
    } catch (err: any) {
      console.error("Sign In Error:", err);
      let friendlyMessage = "Error signing in. Verify email or password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-email") {
        friendlyMessage = "Invalid email or password. Please try again.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Auth service is not initialized.");
      return;
    }
    if (!emailInput) {
      setAuthError("Please enter your registered email address.");
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setAuthActionLoading(true);

    try {
      await sendPasswordResetEmail(auth, emailInput);
      setAuthSuccess("Password reset email sent! Check your inbox.");
      setEmailInput("");
    } catch (err: any) {
      console.error("Password reset error:", err);
      let friendlyMessage = "Could not send reset link. Ensure email is correct.";
      if (err.code === "auth/user-not-found") {
        friendlyMessage = "No user found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Invalid email format.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthActionLoading(false);
    }
  };

  useEffect(() => {
    if (gcalAccessToken) {
      localStorage.setItem("gcal_access_token", gcalAccessToken);
    } else {
      localStorage.removeItem("gcal_access_token");
    }
  }, [gcalAccessToken]);

  useEffect(() => {
    if (!gcalAccessToken || !isGcalSyncActive) return;

    const runSync = () => {
      setIsGcalLoading(true);
      setGcalStatusMsg("Auto-syncing calendar events...");
      syncFromGoogleCalendar(gcalAccessToken)
        .then((res) => {
          if (res.added > 0 || res.updated > 0) {
            setGcalStatusMsg(`Auto-synced! Pulled ${res.added} event(s) and aligned ${res.updated} existing.`);
          } else {
            setGcalStatusMsg("Calendar up to date.");
          }
        })
        .catch((err) => {
          const errMsg = err.message || String(err);
          console.error("Auto-sync calendar failed:", err);
          setGcalStatusMsg(`Auto-sync failed: ${errMsg}`);
        })
        .finally(() => {
          setIsGcalLoading(false);
        });
    };

    // Run immediately on date or token change
    runSync();

    // Set up periodic background sync every 60 seconds when the browser tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        runSync();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [gcalAccessToken, isGcalSyncActive, selectedDate]);

  useEffect(() => {
    const isContactsSyncActive = localStorage.getItem("contacts_sync_enabled") === "true";
    if (contactsAccessToken && isContactsSyncActive) {
      pullGoogleContacts(contactsAccessToken).catch((err) => {
        console.error("Auto-sync contacts failed:", err);
      });
    }
  }, [contactsAccessToken]);

  const [magicQuery, setMagicQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [compType, setCompType] = useState<"favor" | "money">("favor");
  const [compAmount, setCompAmount] = useState(15);
  const [passNotes, setPassNotes] = useState("");

  const [templateStyle, setTemplateStyle] = useState<"Techno" | "Day Planner">(() => {
    const saved = localStorage.getItem("template_style");
    return (saved === "Techno") ? "Techno" : "Day Planner";
  });
  const [timelineLayoutMode, setTimelineLayoutMode] = useState<"vertical" | "sliding-ruler" | "mechanical-track">(() => {
    const saved = localStorage.getItem("taskpass_timeline_layout_mode");
    return (saved === "sliding-ruler" || saved === "mechanical-track") ? saved : "vertical";
  });
  const [horizontalTimelineScrollSignal, setHorizontalTimelineScrollSignal] = useState<number>(0);
  const dayPlannerFont = useAppStore((state) => state.dayPlannerFont);
  const setDayPlannerFont = useAppStore((state) => state.setDayPlannerFont);

  const isDayPlannerActive = templateStyle === "Day Planner" && !isDark;

  const handleUpdateTemplateStyle = (style: "Techno" | "Day Planner") => {
    setTemplateStyle(style);
    localStorage.setItem("template_style", style);
    saveSystemSettingsToCloud({ templateStyle: style });
  };

  const handleUpdateDayPlannerFont = (font: "Standard" | "Handwriting") => {
    setDayPlannerFont(font);
    localStorage.setItem("day_planner_font", font);
    saveSystemSettingsToCloud({ dayPlannerFont: font });
  };

  const [showBrainstorm, setShowBrainstorm] = useState(false);
  const [brainstormTab, setBrainstormTab] = useState<"plain" | "narrative">("plain");
  const [narrativeText, setNarrativeText] = useState("");
  const [narrativeParsing, setNarrativeParsing] = useState(false);
  const [narrativeError, setNarrativeError] = useState("");
  const [parsedNarrativeTasks, setParsedNarrativeTasks] = useState<Array<{
    id: string;
    title: string;
    time: string;
    duration: string;
    location: string;
    attendees: string;
    isLocked: boolean;
    confirmed: boolean;
  }>>([]);
  const [brainstormText, setBrainstormText] = useState("");
  const [isManualDurationBrainstorm, setIsManualDurationBrainstorm] = useState(false);
  const [brainstormDefaultCategory, setBrainstormDefaultCategory] = useState("");
  const [brainstormDefaultCollaborator, setBrainstormDefaultCollaborator] = useState("");
  const [brainstormShowNewCategoryInput, setBrainstormShowNewCategoryInput] = useState(false);
  const [brainstormNewCategoryVal, setBrainstormNewCategoryVal] = useState("");
  const [brainstormShowNewCollaboratorInput, setBrainstormShowNewCollaboratorInput] = useState(false);
  const [brainstormNewCollaboratorVal, setBrainstormNewCollaboratorVal] = useState("");
  const lastTouchTimeRef = useRef<number>(0);

  // ============================================
  // NAVIGATION HISTORY PLATFORM SYSTEM
  // ============================================
  const [navHistory, setNavHistory] = useState<any[]>([]);
  const isPoppingRef = useRef(false);
  const prevNavStateRef = useRef<any>(null);

  useEffect(() => {
    const currentState = {
      viewMode,
      deckTab,
      showSettingsModal,
      showRoutines,
      showMagicDay,
      showCalendarSyncModal,
      showBrainstorm,
      selectedDate
    };

    if (!prevNavStateRef.current) {
      prevNavStateRef.current = currentState;
      return;
    }

    const p = prevNavStateRef.current;
    const changed = p.viewMode !== currentState.viewMode ||
                    p.deckTab !== currentState.deckTab ||
                    p.showSettingsModal !== currentState.showSettingsModal ||
                    p.showRoutines !== currentState.showRoutines ||
                    p.showMagicDay !== currentState.showMagicDay ||
                    p.showCalendarSyncModal !== currentState.showCalendarSyncModal ||
                    p.showBrainstorm !== currentState.showBrainstorm ||
                    p.selectedDate !== currentState.selectedDate;

    if (changed) {
      if (isPoppingRef.current) {
        isPoppingRef.current = false;
      } else {
        setNavHistory(prev => {
          const updated = [...prev, p];
          if (updated.length > 50) {
            updated.shift();
          }
          return updated;
        });
      }
      prevNavStateRef.current = currentState;
    }
  }, [
    viewMode,
    deckTab,
    showSettingsModal,
    showRoutines,
    showMagicDay,
    showCalendarSyncModal,
    showBrainstorm,
    selectedDate
  ]);

  const handleScrollNavigation = (direction: "up" | "down") => {
    triggerHaptic("light");
    if (viewMode !== "timeline") {
      const container = deckScrollContainerRef.current;
      if (container) {
        const scrollAmount = container.clientHeight * 0.5;
        container.scrollBy({
          top: direction === "up" ? -scrollAmount : scrollAmount,
          behavior: "smooth"
        });
      }
      return;
    }

    // Timeline-specific scroll logic over empty spaces of time to the next chronological task item
    const container = timelineContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    const currentCenterY = scrollTop + clientHeight / 2;

    const timelineTasks = filteredScheduledDailyTasks.filter(task => {
      if (task.isAllDay) return false;
      if (task.date !== selectedDate) return false;
      const timeStr = task.computedTime || task.time;
      return !!timeStr;
    });

    if (timelineTasks.length === 0) return;

    const targets = timelineTasks.map(task => {
      const taskMins = timeToMinutes(task.computedTime || task.time);
      const topY = (taskMins / 60) * HOUR_HEIGHT;
      const durationMins = parseDurationToMinutes(task.duration);
      const heightY = Math.max((durationMins / 60) * HOUR_HEIGHT, 65);
      const centerY = topY + heightY / 2;
      return {
        id: task.id,
        title: task.title,
        centerY
      };
    });

    targets.sort((a, b) => a.centerY - b.centerY);

    if (direction === "down") {
      const candidates = targets.filter(t => t.centerY > currentCenterY + 5);
      if (candidates.length > 0) {
        const nextTarget = candidates[0];
        const targetScrollTop = nextTarget.centerY - clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth"
        });
        setHighlightedCalendarTaskId(nextTarget.id);
        setTimeout(() => setHighlightedCalendarTaskId(null), 3500);
      } else {
        // Wrap around to first task of the day
        const firstTarget = targets[0];
        const targetScrollTop = firstTarget.centerY - clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth"
        });
        setHighlightedCalendarTaskId(firstTarget.id);
        setTimeout(() => setHighlightedCalendarTaskId(null), 3500);
      }
    } else {
      const candidates = targets.filter(t => t.centerY < currentCenterY - 5);
      if (candidates.length > 0) {
        const prevTarget = candidates[candidates.length - 1];
        const targetScrollTop = prevTarget.centerY - clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth"
        });
        setHighlightedCalendarTaskId(prevTarget.id);
        setTimeout(() => setHighlightedCalendarTaskId(null), 3500);
      } else {
        // Wrap around to last task of the day
        const lastTarget = targets[targets.length - 1];
        const targetScrollTop = lastTarget.centerY - clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth"
        });
        setHighlightedCalendarTaskId(lastTarget.id);
        setTimeout(() => setHighlightedCalendarTaskId(null), 3500);
      }
    }
  };

  const handleGoBack = () => {
    if (navHistory.length === 0) return;
    triggerHaptic("medium");
    const targetState = navHistory[navHistory.length - 1];
    
    isPoppingRef.current = true;
    
    setViewMode(targetState.viewMode);
    setDeckTab(targetState.deckTab);
    setShowSettingsModal(targetState.showSettingsModal);
    setShowRoutines(targetState.showRoutines);
    setShowMagicDay(targetState.showMagicDay);
    setShowCalendarSyncModal(targetState.showCalendarSyncModal);
    setShowBrainstorm(targetState.showBrainstorm);
    setSelectedDate(targetState.selectedDate);
    
    setNavHistory(prev => prev.slice(0, -1));
  };

  const defaultDuration = useAppStore((state) => state.defaultDuration);
  const setDefaultDuration = useAppStore((state) => state.setDefaultDuration);
  const [brainstormResults, setBrainstormResults] = useState<Task[]>([]);

  const [routineName, setRoutineName] = useState("");
  const [aiRoutinePrompt, setAiRoutinePrompt] = useState("");
  const [routineTasks, setRoutineTasks] = useState<Array<{title: string; duration: string; repeatConfig?: string; location?: string; attendees?: string}>>([]);
  const [deployRoutineId, setDeployRoutineId] = useState("");
  const [deployStartTime, setDeployStartTime] = useState(() => localStorage.getItem("day_start_hour") || "08:00");
  useEffect(() => {
    if (dayStartHour) {
      setDeployStartTime(dayStartHour);
    }
  }, [dayStartHour]);
  const [deployLockedAll, setDeployLockedAll] = useState(true);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [isRoutinesComposerOpen, setIsRoutinesComposerOpen] = useState(false);
  const [showFocusDurationPicker, setShowFocusDurationPicker] = useState(false);
  const [focusDurationPickerHours, setFocusDurationPickerHours] = useState(0);
  const [focusDurationPickerMinutes, setFocusDurationPickerMinutes] = useState(15);
  const [focusDurationPickerTaskId, setFocusDurationPickerTaskId] = useState<string | null>(null);

  const [conflictData, setConflictData] = useState<any>(null);

  const checkConflicts = (targetTask: Task, newTime: string, newDate: string): Task | null => {
    if (!newTime) return null;
    if (targetTask.isOpenPlaceholder) return null;
    const startMins = timeToMinutes(newTime);
    const duration = parseDurationToMinutes(targetTask.duration);
    const before = targetTask.travelBefore || 0;
    const after = targetTask.travelAfter || 0;
    const proposedStart = startMins - before;
    const proposedEnd = startMins + duration + after;

    const lockedOnDay = tasks.filter(t => 
      t.date === newDate && 
      t.isLocked && 
      !t.isFlexible &&
      !t.isOpenPlaceholder &&
      !t.completed && 
      t.id !== targetTask.id &&
      (!targetTask.groupId || t.groupId !== targetTask.groupId)
    );

    for (const other of lockedOnDay) {
      const otherTime = other.computedTime || other.time;
      if (!otherTime) continue;
      const otherStartMins = timeToMinutes(otherTime);
      const otherDuration = parseDurationToMinutes(other.duration);
      const otherBefore = other.travelBefore || 0;
      const otherAfter = other.travelAfter || 0;
      const otherStart = otherStartMins - otherBefore;
      const otherEnd = otherStartMins + otherDuration + otherAfter;

      // Check if they overlap
      if (proposedStart < otherEnd && proposedEnd > otherStart) {
        return other;
      }
    }
    return null;
  };
  const [travelCompleteTask, setTravelCompleteTask] = useState<string | null>(null);

  // Advanced timeline dragging gestural engines
  const timelineDragIdRef = useRef<string | null>(null);
  const timelineDragYRef = useRef<number>(0);
  const timelineDragXRef = useRef<number>(0);
  const timelineRafRef = useRef<number | null>(null);
  const timelineLongPressTimer = useRef<any>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const dragHasMoved = useRef<boolean>(false);
  const timelineSelectedTaskForTap = useRef<Task | null>(null);
  const timelineDragStartOnTextRef = useRef<boolean>(false);
  const pendingTimelineDragTaskRef = useRef<Task | null>(null);
  const pendingTimelineDragRectRef = useRef<DOMRect | null>(null);
  const pendingTimelineDragOffsetRef = useRef<number>(0);
  const pendingTimelineDragIsImmediateRef = useRef<boolean>(false);

  // Deck drag and drop long press gestural engine refs
  const deckLongPressTimer = useRef<any>(null);
  const pendingDeckDragTaskRef = useRef<Task | null>(null);
  const deckDragStartPos = useRef<{ x: number, y: number } | null>(null);

  // Debounced NLP parser refs for zero-lag input typing
  const nlpTimerRef = useRef<any>(null);
  const editNoteNlpTimerRef = useRef<any>(null);

  // Blank space long press state/refs
  const blankSpaceLongPressTimer = useRef<any>(null);
  const blankSpaceStartPos = useRef<{ x: number, y: number } | null>(null);
  const blankSpaceRectRef = useRef<DOMRect | null>(null);
  const longPressActiveRef = useRef<boolean>(false);
  const [ghostTask, setGhostTask] = useState<{ time: string; mins: number; durationMins: number } | null>(null);
  const ghostTaskRef = useRef<{ time: string; mins: number; durationMins: number } | null>(null);
  const handleBlankSpaceMoveRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  const handleBlankSpaceEndRef = useRef<() => void>(() => {});

  // Continuously adjusting start time for unlocked tasks
  const [currentTimeMins, setCurrentTimeMins] = useState(
    new Date().getHours() * 60 + new Date().getMinutes()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMins(new Date().getHours() * 60 + new Date().getMinutes());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Global cancellation listener for pending deck drag long press
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (pendingDeckDragTaskRef.current && deckDragStartPos.current) {
        const diffX = Math.abs(e.clientX - deckDragStartPos.current.x);
        const diffY = Math.abs(e.clientY - deckDragStartPos.current.y);
        if (diffX > 10 || diffY > 10) {
          if (deckLongPressTimer.current) {
            clearTimeout(deckLongPressTimer.current);
            deckLongPressTimer.current = null;
          }
          pendingDeckDragTaskRef.current = null;
          deckDragStartPos.current = null;
        }
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (pendingDeckDragTaskRef.current && deckDragStartPos.current && e.touches && e.touches[0]) {
        const diffX = Math.abs(e.touches[0].clientX - deckDragStartPos.current.x);
        const diffY = Math.abs(e.touches[0].clientY - deckDragStartPos.current.y);
        if (diffX > 10 || diffY > 10) {
          if (deckLongPressTimer.current) {
            clearTimeout(deckLongPressTimer.current);
            deckLongPressTimer.current = null;
          }
          pendingDeckDragTaskRef.current = null;
          deckDragStartPos.current = null;
        }
      }
    };

    const handleWindowUp = () => {
      if (deckLongPressTimer.current) {
        clearTimeout(deckLongPressTimer.current);
        deckLongPressTimer.current = null;
      }
      pendingDeckDragTaskRef.current = null;
      deckDragStartPos.current = null;
    };

    window.addEventListener("mousemove", handleWindowMouseMove, { passive: true });
    window.addEventListener("mouseup", handleWindowUp, { passive: true });
    window.addEventListener("touchmove", handleWindowTouchMove, { passive: true });
    window.addEventListener("touchend", handleWindowUp, { passive: true });
    window.addEventListener("touchcancel", handleWindowUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowUp);
      window.removeEventListener("touchcancel", handleWindowUp);
    };
  }, []);

  // Helper to format Date target as local ISO datetime up to the minute (YYYY-MM-DDTHH:MM)
  const getLocalDatetimeString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // Sound Synthesizer via Web Audio API 
  const playAlertChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // First Note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // Second Note slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.6);
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.warn("AudioContext chime not allowed/supported:", e);
    }
  };

  // Local Task Reminder Tick Loop
  useEffect(() => {
    const checkReminders = () => {
      if (!tasks || tasks.length === 0) return;
      
      const nowStr = getLocalDatetimeString(new Date()); // Format: YYYY-MM-DDTHH:MM
      
      tasks.forEach((task) => {
        if (task.completed) return;
        
        // Match reminderTime string
        if (task.reminderTime && task.reminderTime === nowStr) {
          if (!triggeredRemindersRef.current.has(task.id)) {
            triggeredRemindersRef.current.add(task.id);
            
            // Trigger browser alerts & custom visual signals
            playAlertChime();
            
            // Add task info to standard state for beautiful in-app overlay
            setActiveAlerts((prev) => {
              if (prev.some(p => p.id === task.id)) return prev;
              return [...prev, task];
            });

            // Dispatch alert (satisfying: "triggers a browser alert when the current time matches")
            setTimeout(() => {
              alert(`‚è∞ TASK REMINDER: "${task.title}" is starting soon!\nTime: ${task.time}\nLocation: ${task.location || 'N/A'}`);
            }, 50);
          }
        }
      });
    };

    const reminderTimer = setInterval(checkReminders, 5000); // Check every 5 seconds for precision
    return () => clearInterval(reminderTimer);
  }, [tasks]);

  // Automatic Google Maps directions URL resolver effect in active focus mode
  useEffect(() => {
    if (viewMode !== "focus") return;
    const queue = tasks.filter(t => !t.completed && t.date === selectedDate);
    if (queue.length === 0) return;
    
    const totalFocusCount = queue.length;
    const currentFocusIndex = Math.min(Math.max(0, focusBrowseIndex), totalFocusCount - 1);
    const currentFocus = queue[currentFocusIndex];
    if (!currentFocus) return;

    const loc = currentFocus.location || "";
    const isUrl = loc.startsWith("http://") || loc.startsWith("https://");
    if (isUrl && focusResolvingTaskId !== currentFocus.id) {
      setFocusResolvingTaskId(currentFocus.id);
      
      fetch("/api/resolve-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: loc })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.resolvedLocation) {
          const updatedTasks = tasks.map(t => {
            if (t.id === currentFocus.id) {
              return { ...t, location: data.resolvedLocation };
            }
            return t;
          });
          saveWorkspace(updatedTasks);
        }
      })
      .catch(e => console.warn("Failed automatic focused task location resolution:", e))
      .finally(() => {
        setFocusResolvingTaskId(null);
      });
    }
  }, [viewMode, focusBrowseIndex, tasks, selectedDate]);

  // Narrative Mode direct start-time modification with routining preservation
  const updateTaskStartTimeDirect = (taskId: string, newTimeStr: string) => {
    activeFocusTaskIdRef.current = taskId;
    if (taskId.endsWith("_before") || taskId.endsWith("_after")) {
      const parentTaskId = taskId.endsWith("_before") ? taskId.slice(0, -7) : taskId.slice(0, -6);
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(parentTaskId);
      const targetTask = updatedTasks.find(t => t.id === realTaskId);
      if (!targetTask) return;

      const isBefore = taskId.endsWith("_before");
      let newParentStartMins = 0;
      if (isBefore) {
        const beforeVal = targetTask.travelBefore || 0;
        newParentStartMins = timeToMinutes(newTimeStr) + beforeVal;
      } else {
        const durMins = parseDurationToMinutes(targetTask.duration) || 30;
        newParentStartMins = timeToMinutes(newTimeStr) - durMins;
      }
      
      const newParentTimeStr = minutesToTimeString(Math.max(0, Math.min(1435, newParentStartMins)));
      
      const updated = updatedTasks.map(t => {
        if (t.id === realTaskId) {
          return {
            ...t,
            time: newParentTimeStr,
            computedTime: newParentTimeStr,
            isLocked: t.isLocked,
            originalTime: t.originalTime !== undefined ? t.originalTime : (t.computedTime || t.time)
          };
        }
        return t;
      });
      saveWorkspace(updated);
    } else {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      const targetTask = updatedTasks.find(t => t.id === realTaskId);
      if (!targetTask) return;

      let updated: Task[];
      if (targetTask.groupId && !targetTask.isUnlinked) {
        const oldTime = targetTask.computedTime || targetTask.time || "08:00";
        const diffMins = timeToMinutes(newTimeStr) - timeToMinutes(oldTime);
        updated = updatedTasks.map(t => {
          if (t.groupId === targetTask.groupId && !t.isUnlinked) {
            const origTime = t.computedTime || t.time || "08:00";
            const currentMins = timeToMinutes(origTime);
            const newMins = Math.max(0, Math.min(1435, currentMins + diffMins));
            const adjustedStr = minutesToTimeString(newMins);
            return { 
              ...t, 
              time: adjustedStr,
              computedTime: adjustedStr,
              originalTime: t.originalTime !== undefined ? t.originalTime : (t.computedTime || t.time)
            };
          }
          return t;
        });
      } else {
        updated = updatedTasks.map(t => {
          if (t.id === realTaskId) {
            return { 
              ...t, 
              time: newTimeStr,
              computedTime: newTimeStr,
              isLocked: t.isLocked,
              originalTime: t.originalTime !== undefined ? t.originalTime : (t.computedTime || t.time)
            };
          }
          return t;
        });
      }
      saveWorkspace(updated);
    }
  };

  // Narrative Mode direct duration modification with routining preservation
  const updateTaskDurationDirect = (taskId: string, newDurStr: string) => {
    activeFocusTaskIdRef.current = taskId;
    const mins = parseDurationToMinutes(newDurStr) || 30;
    if (taskId.endsWith("_before") || taskId.endsWith("_after")) {
      updateTaskDurationOrBuffer(taskId, mins);
    } else {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      const targetTask = updatedTasks.find(t => t.id === realTaskId);
      if (!targetTask) return;

      updateTaskDuration(realTaskId, mins, updatedTasks);
    }
  };

  const updateTaskLocationDirect = (taskId: string, newLocation: string) => {
    activeFocusTaskIdRef.current = taskId;
    const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
    const updated = updatedTasks.map(t => {
      if (t.id === realTaskId) {
        return { ...t, location: newLocation };
      }
      return t;
    });
    saveWorkspace(updated);
  };

  const updateTaskCollaboratorDirect = (taskId: string, newCollaboratorsStr: string) => {
    activeFocusTaskIdRef.current = taskId;
    const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
    const updated = updatedTasks.map(t => {
      if (t.id === realTaskId) {
        return { 
          ...t, 
          collaborator: newCollaboratorsStr ? newCollaboratorsStr.split(",")[0].trim() : "",
          attendees: newCollaboratorsStr 
        };
      }
      return t;
    });
    saveWorkspace(updated);
  };

  // Narrative Mode Gemini fetching effect has been moved below focusQueueTasks definition to avoid use-before-define ReferenceErrors.


  const getNoteModeText = (currentFocus: any) => {
    const currentFocusTarget = tasks.find((t) => t.id === (currentFocus.isBuffer ? currentFocus.parentTaskId : currentFocus.id)) || currentFocus;

    const taskId = currentFocusTarget.id;
    const title = currentFocusTarget.title || "Untitled";
    const time = currentFocusTarget.computedTime || currentFocusTarget.time || "12:00";
    const duration = currentFocusTarget.duration || "30 min";
    
    // Check blank fields
    const isCollabsBlank = !currentFocusTarget.attendees && !currentFocusTarget.collaborator;
    const isPrioBlank = !currentFocusTarget.priority || currentFocusTarget.priority === "none";
    const isLocBlank = !currentFocusTarget.location || currentFocusTarget.location.trim() === "";

    const collaboratorsVal = isCollabsBlank ? "" : (currentFocusTarget.attendees || currentFocusTarget.collaborator);
    const priorityVal = isPrioBlank ? "" : currentFocusTarget.priority;
    const locationVal = isLocBlank ? "" : currentFocusTarget.location;

    const cacheKey = `${taskId}_${title}_${time}_${duration}_${collaboratorsVal}_${priorityVal}_${locationVal}`;
    
    if (noteModeTexts[cacheKey]) {
      // Programmatically filter out any blank data field sentences from Gemini output
      return cleanAndFilterProse(noteModeTexts[cacheKey], currentFocusTarget);
    }

    // Default natural fallback template
    let fallback = `You have {TITLE} at {START_TIME} for {DURATION}.`;
    if (!isCollabsBlank) {
      fallback += ` You will be working with {COLLABORATORS}.`;
    }
    if (!isPrioBlank) {
      fallback += ` This task has {PRIORITY} priority.`;
    }
    if (!isLocBlank) {
      fallback += ` You will be working at {LOCATION}.`;
    }
    return fallback;
  };

  const cleanAndFilterProse = (text: string, currentFocus: any) => {
    if (!text) return "";
    
    const isCollabsBlank = !currentFocus.attendees && !currentFocus.collaborator;
    const isPrioBlank = !currentFocus.priority || currentFocus.priority === "none";
    const isLocBlank = !currentFocus.location || currentFocus.location.trim() === "";

    // Split text into individual sentences ending in . ! or ?
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    const filteredSentences = sentences.filter(sentence => {
      // If blank, throw out any sentences matching placeholders or clear indicators of empty state
      if (sentence.includes("{COLLABORATORS}") && isCollabsBlank) return false;
      if (sentence.includes("{LOCATION}") && isLocBlank) return false;
      if (sentence.includes("{PRIORITY}") && isPrioBlank) return false;

      const lower = sentence.toLowerCase();
      if (isCollabsBlank && (lower.includes("no collaborators") || lower.includes("collaborator") || lower.includes("with no one") || lower.includes("without collaborators"))) {
        return false;
      }
      if (isLocBlank && (lower.includes("no location") || lower.includes("no specified location") || lower.includes("location") || lower.includes("working at no"))) {
        return false;
      }
      return true;
    });

    return filteredSentences.join(" ").trim().replace(/\s+/g, " ");
  };

  const parseNoteModeText = (text: string, currentFocus: any, currentFocusTarget: any) => {
    const parts = text.split(/({TITLE}|{START_TIME}|{DURATION}|{COLLABORATORS}|{PRIORITY}|{LOCATION})/g);
    
    // Base styles: narrative is 18px, data style is 20px (2 pts larger) with customized color
    const narrativeStyle = { fontSize: "18px", fontWeight: 500, fontFamily: "inherit" };
    const dataStyle = { fontSize: "20px", color: dataFieldColor, fontWeight: 500, fontFamily: "inherit" };

    const parsedElements = parts.map((part, i) => {
      if (part === "{TITLE}") {
        return (
          <span 
            key={i} 
            onClick={() => triggerEditForm(currentFocusTarget, "title")}
            className="hover:underline cursor-pointer inline font-extrabold"
            style={dataStyle}
            title="Click to edit task title"
          >
            {currentFocusTarget.title || "Untitled Task"}
          </span>
        );
      }
      if (part === "{START_TIME}") {
        const timeVal = currentFocusTarget.computedTime || currentFocusTarget.time || "12:00";
        return (
          <span key={i} className="inline-block relative">
            <TimePickBoxTrigger
              value={timeVal}
              onChange={(newTime) => {
                updateTaskStartTimeDirect(currentFocusTarget.id, newTime);
                triggerHaptic("medium");
              }}
              isDark={isDark}
              className="bg-transparent border-b border-dashed border-indigo-400/50 hover:border-indigo-400 p-0 text-inherit font-extrabold"
              title="Touch to pick start time (3 pick boxes: Hours 0-12, Minutes 0-60 in 5m, AM/PM)"
            />
          </span>
        );
      }
      if (part === "{DURATION}") {
        const currentDuration = currentFocusTarget.duration || "30 min";
        return (
          <span key={i} className="inline-block relative">
            <DurationPickBoxTrigger
              value={currentDuration}
              onChange={(newDuration) => {
                updateTaskDurationDirect(currentFocusTarget.id, newDuration);
                triggerHaptic("medium");
              }}
              isDark={isDark}
              className="bg-transparent border-b border-dashed border-indigo-400/50 hover:border-indigo-400 p-0 text-inherit font-extrabold"
              title="Touch to pick duration (4-wide pick boxes: 0-23 hours, 0-60 minutes in 5m)"
            />
          </span>
        );
      }
      if (part === "{COLLABORATORS}") {
        const selectedCollabsList = (currentFocus.attendees || currentFocus.collaborator || "")
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean);

        const isOpen = openCollabDropdownTaskId === currentFocus.id;

        return (
          <span key={i} className="relative inline-block select-none">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setOpenCollabDropdownTaskId(isOpen ? null : currentFocus.id);
                triggerHaptic("light");
              }}
              className="hover:underline cursor-pointer font-bold inline-block border-b border-dashed"
              style={{ ...dataStyle, borderBottomColor: dataFieldColor }}
              title="Click to toggle collaborators panel"
            >
              {selectedCollabsList.length > 0 ? selectedCollabsList.join(", ") : "no collaborators"}
            </span>

            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[600]" 
                  onClick={() => setOpenCollabDropdownTaskId(null)}
                />
                <div className={`absolute left-0 mt-2 w-56 rounded-2xl border p-3.5 shadow-2xl z-[610] text-left flex flex-col gap-2 ${
                  isDark 
                    ? "bg-slate-950 border-indigo-500/20 text-white" 
                    : "bg-white border-slate-200 text-slate-800"
                }`}>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Select Collaborators:
                  </p>
                  
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1 timeline-scrollbar">
                    {collaborators.map((colName) => {
                      const isChecked = selectedCollabsList.includes(colName);
                      return (
                        <label 
                          key={colName} 
                          className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-indigo-500/10 cursor-pointer text-[11px] font-extrabold"
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              let updatedList;
                              if (isChecked) {
                                updatedList = selectedCollabsList.filter(c => c !== colName);
                              } else {
                                updatedList = [...selectedCollabsList, colName];
                              }
                              updateTaskCollaboratorDirect(currentFocus.id, updatedList.join(", "));
                              triggerHaptic("light");
                            }}
                            className="rounded text-indigo-600 focus:ring-0 border-white/10 bg-slate-900 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>{colName}</span>
                        </label>
                      );
                    })}
                    {collaborators.length === 0 && (
                      <p className="text-[10px] text-slate-500 italic px-1">No collaborators saved.</p>
                    )}
                  </div>

                  <div className="border-t border-white/5 my-1" />

                  {/* Inline Form to add a brand new collaborator */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = newCollabInputVal.trim();
                      if (name) {
                        const updatedCols = [...collaborators, name];
                        setCollaborators(updatedCols);
                        localStorage.setItem("task_collaborators_v1", JSON.stringify(updatedCols));
                        saveSystemSettingsToCloud({ collaborators: updatedCols });
                        
                        const newList = [...selectedCollabsList, name];
                        updateTaskCollaboratorDirect(currentFocus.id, newList.join(", "));
                        
                        setNewCollabInputVal("");
                        triggerHaptic("medium");
                      }
                    }}
                    className="flex gap-1"
                  >
                    <input 
                      type="text"
                      value={newCollabInputVal}
                      onChange={(e) => setNewCollabInputVal(e.target.value)}
                      placeholder="+ New Collab..."
                      className={`flex-1 text-[11px] h-[30px] px-2 rounded-xl border outline-none font-bold placeholder:opacity-50 ${
                        isDark 
                          ? "bg-slate-900 border-white/10 text-white" 
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                    <button 
                      type="submit"
                      className="h-[30px] w-[30px] shrink-0 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl flex items-center justify-center font-black transition-all cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </span>
        );
      }
      if (part === "{PRIORITY}") {
        const priority = currentFocus.priority || "none";
        const label = priority === "none" ? "none" : `${priority}`;
        return (
          <span 
            key={i} 
            onClick={() => triggerEditForm(currentFocusTarget, "priority")}
            className="hover:underline cursor-pointer inline"
            style={dataStyle}
            title="Click to change priority"
          >
            {label}
          </span>
        );
      }
      if (part === "{LOCATION}") {
        const currentLocation = currentFocusTarget.location || "";
        const rawOptions = favoriteLocations.includes(currentLocation)
          ? favoriteLocations
          : currentLocation && currentLocation.trim() !== "" && !currentLocation.toLowerCase().includes("no specified location")
            ? [currentLocation, ...favoriteLocations]
            : favoriteLocations;
        const selectOptions = [...rawOptions].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        const locDisplayStr = currentLocation && !currentLocation.toLowerCase().includes("no specified location") ? currentLocation : "no specified location";

        return (
          <span key={i} className="inline-block relative">
            <select
              value={currentLocation && !currentLocation.toLowerCase().includes("no specified location") ? currentLocation : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__ADD_NEW__") {
                  const newLocPrompt = window.prompt("Enter new location name:");
                  if (newLocPrompt && newLocPrompt.trim() !== "") {
                    const trimmed = newLocPrompt.trim();
                    const updated = [...favoriteLocations, trimmed];
                    setFavoriteLocations(updated);
                    localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updated));
                    saveSystemSettingsToCloud({ favoriteLocations: updated });
                    updateTaskLocationDirect(currentFocusTarget.id, trimmed);
                    triggerHaptic("medium");
                  }
                } else {
                  updateTaskLocationDirect(currentFocusTarget.id, val);
                  triggerHaptic("medium");
                }
              }}
              className="bg-transparent border-none focus:outline-none cursor-pointer leading-none appearance-none p-0 inline-block focus:ring-0 font-extrabold"
              style={{
                WebkitAppearance: "none",
                MozAppearance: "none",
                width: getDynamicLocationWidth(locDisplayStr),
                ...dataStyle
              }}
            >
              <option value="" className="bg-slate-900 text-slate-400">no specified location</option>
              {selectOptions.map(locVal => (
                <option key={locVal} value={locVal} className="bg-slate-900 text-white font-extrabold leading-normal">
                  {locVal}
                </option>
              ))}
              <option value="__ADD_NEW__" className="bg-slate-900 text-amber-400 font-bold leading-normal">+ New Location...</option>
            </select>
          </span>
        );
      }
      return <span key={i} className="leading-relaxed text-slate-200" style={narrativeStyle}>{part}</span>;
    });

    // Append the custom next task statement to the rendered prose list
    const nextTaskStatementElement = (() => {
      const index = focusQueueTasks.findIndex(t => t.id === currentFocus.id);
      let nextFocusCard = null;
      if (index !== -1 && index < focusQueueTasks.length - 1) {
        nextFocusCard = focusQueueTasks[index + 1];
      }

      if (!nextFocusCard) {
        return (
          <span className="leading-relaxed text-slate-400" style={narrativeStyle}>
            {"  "}You have no further tasks scheduled for the rest of the day.
          </span>
        );
      }

      const nextTitle = nextFocusCard.title || "Untitled Task";
      const nextTime = nextFocusCard.time ? formatTime(nextFocusCard.time) : "12:00 PM";
      const nextLoc = nextFocusCard.location || "";
      const hasLoc = nextLoc && nextLoc.trim() !== "" && !nextLoc.toLowerCase().includes("no location") && !nextLoc.toLowerCase().includes("no specified location");

      return (
        <>
          <span className="leading-relaxed text-slate-200 animate-none" style={narrativeStyle}>
            {" "}Your next task is{" "}
          </span>
          <span 
            onClick={() => triggerEditForm(nextFocusCard, "title")}
            className="hover:underline cursor-pointer inline"
            style={dataStyle}
            title="Click to edit next task title"
          >
            {nextTitle}
          </span>
          <span className="leading-relaxed text-slate-200" style={narrativeStyle}>
            {" "}at{" "}
          </span>
          <span 
            onClick={() => triggerEditForm(nextFocusCard, "time")}
            className="hover:underline cursor-pointer inline"
            style={dataStyle}
            title="Click to edit next task time"
          >
            {nextTime}
          </span>
          {hasLoc && (
            <>
              <span className="leading-relaxed text-slate-200" style={narrativeStyle}>
                {" "}at{" "}
              </span>
              <span 
                onClick={() => triggerEditForm(nextFocusCard, "location")}
                className="hover:underline cursor-pointer inline"
                style={dataStyle}
                title="Click to edit next task location"
              >
                {nextLoc}
              </span>
            </>
          )}
          <span className="leading-relaxed text-slate-200" style={narrativeStyle}>
            .
          </span>
        </>
      );
    })();

    return (
      <>
        {parsedElements}
        {nextTaskStatementElement}
      </>
    );
  };

  const lastViewModeRef = useRef<string>("");

  useEffect(() => {
    if (viewMode === "timeline" && lastViewModeRef.current !== "timeline") {
      const todayStr = getLocalDateString();
      setSelectedDate(todayStr);
      setHorizontalTimelineScrollSignal(Date.now());

      const scrollVerticalToCurrentTime = (attempt = 0) => {
        if (timelineContainerRef.current && timelineContainerRef.current.clientHeight > 0) {
          const container = timelineContainerRef.current;
          const targetY = (currentTimeMins / 60) * HOUR_HEIGHT - container.clientHeight / 2;
          container.scrollTo({
            top: Math.max(0, targetY),
            behavior: attempt === 0 ? "auto" : "smooth"
          });
        } else if (attempt < 10) {
          setTimeout(() => scrollVerticalToCurrentTime(attempt + 1), 60);
        }
      };

      requestAnimationFrame(() => scrollVerticalToCurrentTime(0));
      setTimeout(() => scrollVerticalToCurrentTime(0), 60);
      setTimeout(() => scrollVerticalToCurrentTime(0), 180);
      setTimeout(() => scrollVerticalToCurrentTime(0), 350);
    }
    if (viewMode === "deck" && lastViewModeRef.current !== "deck" && cardDensity === "report") {
      setReportFiltersCollapsed(true);
    }
    lastViewModeRef.current = viewMode;
  }, [viewMode, currentTimeMins, HOUR_HEIGHT, cardDensity]);

  const getFocusCardTargetIndex = (
    todayStr: string,
    nowMins: number,
    allTasks: Task[],
    showCompleted: boolean,
    dayStartMins: number
  ) => {
    const datePool = allTasks.filter(t => t.date === todayStr && !t.isTransferred && !t.isAllDay);
    const scheduledDateTasks = scheduleDynamicTasks(datePool, true, nowMins, dayStartMins, timelineIncrement);
    
    const queueItems: Task[] = [];
    scheduledDateTasks.forEach(task => {
      if (typeof task.travelBefore === "number" && task.travelBefore > 0) {
        const completed = !!task.travelBeforeCompleted;
        if (showCompleted || !completed) {
          const mainStart = timeToMinutes(task.computedTime || task.time || "00:00");
          const bStart = Math.max(0, mainStart - task.travelBefore);
          queueItems.push({
            id: `${task.id}_before`,
            parentTaskId: task.id,
            isBuffer: true,
            bufferType: "before",
            title: task.beforeBufferPurpose || "Preparation Buffer",
            duration: `${task.travelBefore} min`,
            time: minutesToTimeString(bStart),
            computedTime: minutesToTimeString(bStart),
            completed,
            priority: task.priority,
            location: task.location,
            date: task.date,
            isLocked: true
          });
        }
      }

      if (showCompleted || !task.completed) {
        queueItems.push(task);
      }

      if (typeof task.travelAfter === "number" && task.travelAfter > 0) {
        const completed = !!task.travelAfterCompleted;
        if (showCompleted || !completed) {
          const mainStart = timeToMinutes(task.computedTime || task.time || "00:00");
          const mainDur = parseDurationToMinutes(task.duration) || 30;
          queueItems.push({
            id: `${task.id}_after`,
            parentTaskId: task.id,
            isBuffer: true,
            bufferType: "after",
            title: task.afterBufferPurpose || "Wind down Buffer",
            duration: `${task.travelAfter} min`,
            time: minutesToTimeString(mainStart + mainDur),
            computedTime: minutesToTimeString(mainStart + mainDur),
            completed,
            priority: task.priority,
            location: task.location,
            date: task.date,
            isLocked: true
          });
        }
      }
    });

    if (queueItems.length === 0) return { index: 0, targetTask: null };

    // 1. Check if any card is marked isInProgress
    let inProgressIdx = queueItems.findIndex(card => card.isInProgress);
    if (inProgressIdx !== -1) {
      return { index: inProgressIdx, targetTask: queueItems[inProgressIdx] };
    }

    // 2. Check if any focus card encompasses current time
    let encompassIdx = queueItems.findIndex(card => {
      const startMins = timeToMinutes(card.computedTime || card.time || "00:00");
      const durMins = parseDurationToMinutes(card.duration) || 30;
      const endMins = startMins + durMins;
      return nowMins >= startMins && nowMins < endMins;
    });

    if (encompassIdx !== -1) {
      return { index: encompassIdx, targetTask: queueItems[encompassIdx] };
    }

    // 3. Go to the next focus card that is not completed
    let nextIncompleteUpcomingIdx = queueItems.findIndex(card => {
      if (card.completed) return false;
      const startMins = timeToMinutes(card.computedTime || card.time || "00:00");
      const durMins = parseDurationToMinutes(card.duration) || 30;
      const endMins = startMins + durMins;
      return endMins > nowMins;
    });

    if (nextIncompleteUpcomingIdx !== -1) {
      return { index: nextIncompleteUpcomingIdx, targetTask: queueItems[nextIncompleteUpcomingIdx] };
    }

    // 4. Fallback: find any uncompleted focus card today
    let anyIncompleteIdx = queueItems.findIndex(card => !card.completed);
    if (anyIncompleteIdx !== -1) {
      return { index: anyIncompleteIdx, targetTask: queueItems[anyIncompleteIdx] };
    }

    // 5. Default to 0
    return { index: 0, targetTask: queueItems[0] };
  };

  const jumpAndCenterCurrentTimeAndDate = React.useCallback((targetView?: string) => {
    const todayStr = getLocalDateString(new Date());
    setSelectedDate(todayStr);

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const target = targetView || viewMode;

    const performCenter = (attempt = 0) => {
      if (timelineContainerRef.current) {
        const container = timelineContainerRef.current;
        const targetY = (currentMins / 60) * HOUR_HEIGHT - container.clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetY),
          behavior: "smooth"
        });
      }
      setHorizontalTimelineScrollSignal(Date.now());

      if (target === "focus") {
        const { index: targetIdx, targetTask } = getFocusCardTargetIndex(
          todayStr,
          currentMins,
          tasks,
          showCompletedTasks,
          dayStartMinutes
        );
        setFocusBrowseIndex(targetIdx);
        if (targetTask) {
          activeFocusTaskIdRef.current = targetTask.id;
        }
      }

      if (deckScrollContainerRef.current) {
        deckScrollContainerRef.current.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }

      if (attempt < 6) {
        setTimeout(() => performCenter(attempt + 1), 60);
      }
    };

    requestAnimationFrame(() => performCenter(0));
    setTimeout(() => performCenter(0), 100);
    setTimeout(() => performCenter(0), 250);
  }, [viewMode, HOUR_HEIGHT, tasks, showCompletedTasks, dayStartMinutes]);

  const handlePaneSelectorClick = (targetView: string) => {
    const todayStr = getLocalDateString();
    
    // Set appropriate deckTab depending on in-progress task
    let currentInProg = tasks.find(t => t.isInProgress);
    if (!currentInProg && activeBufferTaskId) {
      currentInProg = tasks.find(t => t.id === activeBufferTaskId);
    }

    if (currentInProg) {
      let targetTab: "active" | "backlog" | "completed" = "active";
      if (currentInProg.completed) {
        targetTab = "completed";
      } else if (currentInProg.date && currentInProg.date < selectedDate && !currentInProg.isTransferred && !currentInProg.isAllDay) {
        targetTab = "backlog";
      } else {
        targetTab = "active";
      }
      if (deckTab !== targetTab) {
        setDeckTab(targetTab);
      }
    } else {
      if (targetView !== "focus") {
        setDeckTab("active");
      }
    }

    const focusOnActiveOrFirstIncomplete = () => {
      setSelectedDate(todayStr);

      const { index: targetIdx, targetTask } = getFocusCardTargetIndex(
        todayStr,
        currentTimeMins,
        tasks,
        showCompletedTasks,
        dayStartMinutes
      );

      setFocusBrowseIndex(targetIdx);
      if (targetTask) {
        activeFocusTaskIdRef.current = targetTask.id;
      }
    };

    if (targetView === "timeline") {
      setSelectedDate(todayStr);
      setHorizontalTimelineScrollSignal(Date.now());

      const scrollVerticalToCurrentTime = (attempt = 0) => {
        if (timelineContainerRef.current && timelineContainerRef.current.clientHeight > 0) {
          const container = timelineContainerRef.current;
          const targetY = (currentTimeMins / 60) * HOUR_HEIGHT - container.clientHeight / 2;
          container.scrollTo({
            top: Math.max(0, targetY),
            behavior: attempt === 0 ? "auto" : "smooth"
          });
        } else if (attempt < 10) {
          setTimeout(() => scrollVerticalToCurrentTime(attempt + 1), 60);
        }
      };

      requestAnimationFrame(() => scrollVerticalToCurrentTime(0));
      setTimeout(() => scrollVerticalToCurrentTime(0), 60);
      setTimeout(() => scrollVerticalToCurrentTime(0), 180);
      setTimeout(() => scrollVerticalToCurrentTime(0), 350);
    }

    if (viewMode === targetView) {
      if (viewMode === "focus") {
        focusOnActiveOrFirstIncomplete();
        return;
      }

      startTransition(() => {
        setSelectedDate(todayStr);
      });

      if (viewMode === "timeline") {
        setHorizontalTimelineScrollSignal(Date.now());
        const scrollVerticalToCurrentTime = (attempt = 0) => {
          if (timelineContainerRef.current && timelineContainerRef.current.clientHeight > 0) {
            const container = timelineContainerRef.current;
            const targetY = (currentTimeMins / 60) * HOUR_HEIGHT - container.clientHeight / 2;
            container.scrollTo({
              top: Math.max(0, targetY),
              behavior: "smooth"
            });
          } else if (attempt < 10) {
            setTimeout(() => scrollVerticalToCurrentTime(attempt + 1), 60);
          }
        };

        requestAnimationFrame(() => scrollVerticalToCurrentTime(0));
        setTimeout(() => scrollVerticalToCurrentTime(0), 60);
        setTimeout(() => scrollVerticalToCurrentTime(0), 180);
        setTimeout(() => scrollVerticalToCurrentTime(0), 350);
        return;
      }

      return;
    } else {
      startTransition(() => {
        if (targetView === "focus") {
          setDeckTab("active");
          focusOnActiveOrFirstIncomplete();
        }
        setViewMode(targetView as any);
      });
    }
  };

  // Routine selection mode
  const [isSelectingForRoutine, setIsSelectingForRoutine] = useState(false);
  const [selectedRoutineItems, setSelectedRoutineItems] = useState<Task[]>([]);
  const [selectedBacklogTaskIds, setSelectedBacklogTaskIds] = useState<string[]>([]);

  const undoStackRef = useRef<Task[][]>([]);
  const redoStackRef = useRef<Task[][]>([]);
  const tasksRef = useRef<Task[]>([]);
  const tasksStorageDebounceRef = useRef<any>(null);
  const inFlightGcalPushesRef = useRef<Map<string, Promise<string | null>>>(new Map());
  const recentlyPushedGcalHashesRef = useRef<Map<string, { eventId: string; timestamp: number }>>(new Map());
  const recentlyDeletedTaskIdsRef = useRef<Map<string, number>>(new Map());
  const recentlyDeletedGcalEventIdsRef = useRef<Map<string, number>>((() => {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("taskpass_deleted_gcal_ids");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return new Map<string, number>(parsed);
          }
        }
      }
    } catch (_) {}
    return new Map<string, number>();
  })());

  const recordGcalDeletion = (idOrGcalEventId?: string) => {
    if (!idOrGcalEventId) return;
    const now = Date.now();
    recentlyDeletedGcalEventIdsRef.current.set(idOrGcalEventId, now);
    try {
      if (recentlyDeletedGcalEventIdsRef.current.size > 200) {
        const entries = Array.from(recentlyDeletedGcalEventIdsRef.current.entries());
        entries.sort((a, b) => b[1] - a[1]);
        recentlyDeletedGcalEventIdsRef.current = new Map(entries.slice(0, 150));
      }
      const arr = Array.from(recentlyDeletedGcalEventIdsRef.current.entries());
      localStorage.setItem("taskpass_deleted_gcal_ids", JSON.stringify(arr));
    } catch (_) {}
  };

  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    redoStackRef.current = redoStack;
  }, [redoStack]);

  useEffect(() => {
    if (!taskpassEnabled && viewMode === "passed") {
      setViewMode("deck");
    }
  }, [taskpassEnabled, viewMode]);

  useEffect(() => {
    if (aiSubtasksEnabled) {
      document.body.classList.remove("hide-subtasks");
    } else {
      document.body.classList.add("hide-subtasks");
    }
  }, [aiSubtasksEnabled]);

  useEffect(() => {
    if (collaboratorsEnabled) {
      document.body.classList.remove("hide-collaborators");
    } else {
      document.body.classList.add("hide-collaborators");
    }
  }, [collaboratorsEnabled]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);


  const handleGlobalUndo = () => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const previousTasks = stack[stack.length - 1];
    const newUndoStack = stack.slice(0, -1);
    
    setRedoStack(prev => [...prev, tasksRef.current]);
    setUndoStack(newUndoStack);
    saveWorkspace(previousTasks, true);
    triggerHaptic("medium");
  };

  const handleGlobalRedo = () => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const nextTasks = stack[stack.length - 1];
    const newRedoStack = stack.slice(0, -1);
    
    setUndoStack(prev => [...prev, tasksRef.current]);
    setRedoStack(newRedoStack);
    saveWorkspace(nextTasks, true);
    triggerHaptic("medium");
  };

  // Validate Connection to Firestore on startup
  useEffect(() => {
    async function testConnection() {
      if (!db) return;
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("offline")) {
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            console.warn("Firestore is offline because the client has no network connection.");
          } else {
            const isLocalOrSandbox = typeof window !== "undefined" && (
              window.location.hostname === "localhost" ||
              window.location.hostname.includes("run.app") ||
              window.location.hostname.includes("ais-dev") ||
              (navigator as any).webdriver
            );
            if (isLocalOrSandbox) {
              console.warn("Please check your Firebase configuration (offline/connection timeout in development/test environment).");
            } else {
              console.error("Please check your Firebase configuration.");
            }
          }
        }
      }
    }
    testConnection();

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
      if (message.includes("operationType") && message.includes("authInfo")) {
        event.preventDefault();
        console.warn("Caught Firestore error safely at global level to prevent crash in preview:", message);
      }
    };

    window.addEventListener("unhandledrejection", rejectionHandler);

    const keydownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.hasAttribute("contenteditable") ||
        (target as any).isContentEditable
      );

      if (!isInput) {
        e.stopPropagation();
      }

      // Global Undo/Redo Shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleGlobalRedo();
        } else {
          handleGlobalUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleGlobalRedo();
      }

      // 1. Prevent backspace navigation when outside standard input fields
      if (e.key === "Backspace") {
        const active = document.activeElement;
        const isEditable = active && (
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.hasAttribute("contenteditable") ||
          (active as any).isContentEditable
        );
        if (!isEditable) {
          e.preventDefault();
        }
      }
    };

    const stopPropagationHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.hasAttribute("contenteditable") ||
        (target as any).isContentEditable
      );
      if (!isInput) {
        e.stopPropagation();
      }
    };

    // Keep focus inside the iframe when active elements (such as "Save" / "Complete" buttons in modals) are unmounted
    const focusoutHandler = () => {
      setTimeout(() => {
        if (!document.activeElement || document.activeElement === document.body) {
          mainContainerRef.current?.focus();
        }
      }, 30);
    };

    window.addEventListener("keydown", keydownHandler, true);
    window.addEventListener("keyup", stopPropagationHandler, true);
    window.addEventListener("keypress", stopPropagationHandler, true);
    window.addEventListener("focusout", focusoutHandler);

    return () => {
      window.removeEventListener("unhandledrejection", rejectionHandler);
      window.removeEventListener("keydown", keydownHandler, true);
      window.removeEventListener("keyup", stopPropagationHandler, true);
      window.removeEventListener("keypress", stopPropagationHandler, true);
      window.removeEventListener("focusout", focusoutHandler);
    };
  }, []);

  // Register global synchronization error callbacks
  const triggerSyncError = (source: string, error: string, defaultReason?: string, suggestionsList?: string[]) => {
    let reason = defaultReason || "A synchronization connection error occurred.";
    let suggestions = suggestionsList || [
      "Verify that your local internet connection is active.",
      "The service might be down. Please wait a few moments and try again."
    ];

    const errLower = error.toLowerCase();
    
    if (source.includes("Calendar") || source.includes("GCal") || source.includes("Google")) {
      if (errLower.includes("401") || errLower.includes("auth") || errLower.includes("expired") || errLower.includes("credentials")) {
        reason = "Session Expired: Google security credentials have expired.";
        suggestions = ["Unlink and link your Google Calendar again under settings.", "Check if you blocked pop-ups or cookies."];
      } else if (errLower.includes("403") || errLower.includes("permission") || errLower.includes("scope")) {
        reason = "Permissions Restricted: Proper Google Calendar permissions were not approved.";
        suggestions = ["Link Google Calendar again and make sure to check all permission boxes."];
      } else if (errLower.includes("404") || errLower.includes("not found")) {
        reason = "Calendar Event Missing: Event was deleted in your external Google Calendar.";
        suggestions = ["Recreate this task to generate a fresh external event."];
      } else if (errLower.includes("network") || errLower.includes("fetch") || errLower.includes("failed to fetch")) {
        reason = "Network Failure: Connection to googleapis.com failed.";
        suggestions = ["Check your internet connection, adblockers, or retry shortly."];
      } else if (errLower.includes("rate") || errLower.includes("429") || errLower.includes("quota")) {
        reason = "Rate Limit: Too many requests made within a brief period.";
        suggestions = ["Please wait 15 seconds to allow the quota limit to refresh."];
      }
    } else if (source.includes("Cloud Database") || source.includes("Firestore") || source.includes("Sync")) {
      if (errLower.includes("permission") || errLower.includes("denied")) {
        reason = "Database Rejection: Secure database rules rejected this operation.";
        suggestions = ["Confirm you are still logged in.", "Try signing out and logging back in."];
      } else if (errLower.includes("offline") || errLower.includes("network") || errLower.includes("unavailable")) {
        reason = "Database Link Loss: Cloud connection was dropped.";
        suggestions = ["Check your Wi-Fi, VPNs, or system proxy settings."];
      }
    }

    setSyncErrorDetail({
      source,
      error,
      reason,
      suggestions
    });
    triggerHaptic("heavy");
  };

  useEffect(() => {
    onSyncError = (source: string, error: string, reason?: string, suggestions?: string[]) => {
      triggerSyncError(source, error, reason, suggestions);
    };
    return () => {
      onSyncError = null;
    };
  }, []);

  // Auth Status connection
  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);

  const restoreMondaySeedsIfWiped = (taskList: Task[]): { updated: Task[]; changed: boolean } => {
    const nextList = taskList.filter(t => !t.id.startsWith("seed_task_"));
    const changed = nextList.length !== taskList.length;
    return { updated: nextList, changed };
  };

  // Firebase Real-time Sync & Offline Fallbacks
  useEffect(() => {
    if (!db || !currentUser) {
      // Offline / Signed Out mode: read from localStorage
      const savedTasks = localStorage.getItem("taskpass_tasks_v10");
      const savedRoutines = localStorage.getItem("taskpass_routines_v10");
      const savedTransfers = localStorage.getItem("taskpass_transfers_v10");
      const savedWallet = localStorage.getItem("taskpass_wallet_v10");

      if (savedTasks) try { 
        const parsed = JSON.parse(savedTasks);
        const { updated, changed } = restoreMondaySeedsIfWiped(parsed);
        const deduped = deduplicateTasks(updated);
        setTasks(deduped); 
        tasksRef.current = deduped;
        if (changed || deduped.length !== updated.length) {
          localStorage.setItem("taskpass_tasks_v10", JSON.stringify(deduped));
        }
      } catch {}
      else { loadSeeds(); }

      if (savedRoutines) try { 
        const parsed = JSON.parse(savedRoutines).filter((r: any) => r.id !== "routine_morning");
        setRoutines(parsed); 
      } catch {}
      else { loadSeedRoutines(); }

      if (savedTransfers) try { 
        const parsed = JSON.parse(savedTransfers).filter((t: any) => t.id !== "transfer_1");
        setTransfers(parsed); 
      } catch {}
      else { loadSeedTransfers(); }

      if (savedWallet) try { setWallet(JSON.parse(savedWallet)); } catch {}
      return;
    }

    const uid = currentUser.uid;

    // 1. Listen to user profile for Wallet points and system settings
    const userDocRef = doc(db, "users", uid);
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const udata = snap.data();
        if (udata.isSeeded === true) {
          setHasSeeded(true);
          localStorage.setItem("taskpass_seeded_v10", "true");
        }
        if (udata.isRoutinesSeeded === true) {
          localStorage.setItem("taskpass_routines_seeded_v10", "true");
        }
        if (typeof udata.favorPoints === "number") {
          setWallet({ favorPoints: udata.favorPoints });
        }
        if (Array.isArray(udata.categories)) {
          setCategories(udata.categories as string[]);
          localStorage.setItem("task_categories_v1", JSON.stringify(udata.categories));
        }
        if (Array.isArray(udata.collaborators)) {
          setCollaborators(udata.collaborators as string[]);
          localStorage.setItem("task_collaborators_v1", JSON.stringify(udata.collaborators));
        }
        if (Array.isArray(udata.flexActivities)) {
          setFlexActivities(udata.flexActivities as string[]);
          localStorage.setItem("task_flex_activities_v1", JSON.stringify(udata.flexActivities));
        }
        if (Array.isArray(udata.favoriteLocations)) {
          setFavoriteLocations(udata.favoriteLocations as string[]);
          localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(udata.favoriteLocations));
        }
        if (Array.isArray(udata.spendingCategories)) {
          setSpendingCategories(udata.spendingCategories as string[]);
          localStorage.setItem("spending_tracker_categories_v1", JSON.stringify(udata.spendingCategories));
        }
        if (Array.isArray(udata.spendingVendors)) {
          setSpendingVendors(udata.spendingVendors as string[]);
          localStorage.setItem("spending_tracker_vendors_v1", JSON.stringify(udata.spendingVendors));
        }
        if (udata.entityQuickNotes) {
          setEntityNotes(udata.entityQuickNotes);
          localStorage.setItem("entity_quick_notes_v1", JSON.stringify(udata.entityQuickNotes));
        }
        if (Array.isArray(udata.savedAiPlans)) {
          setSavedAiPlans(udata.savedAiPlans as SavedAIPlan[]);
          localStorage.setItem("taskpass_saved_ai_plans_v1", JSON.stringify(udata.savedAiPlans));
        }
        // Load settings from Firebase Firestore
        if (typeof udata.isDark === "boolean") {
          if (setDarkMode) {
            setDarkMode(udata.isDark);
          } else {
            setLocalDarkMode(udata.isDark);
          }
          localStorage.setItem("theme_mode", udata.isDark ? "dark" : "light");
          window.dispatchEvent(new Event("theme_mode_changed"));
        }
        if (typeof udata.cardDensity === "string") {
          const cd = udata.cardDensity as any;
          if (cd === "standard" || cd === "simplified" || cd === "very_simplified") {
            setCardDensity(cd);
            localStorage.setItem("card_density", cd);
          }
        } else if (typeof udata.liteMode === "boolean") {
          const cd = udata.liteMode ? "simplified" : "standard";
          setCardDensity(cd);
          localStorage.setItem("card_density", cd);
        }
        if (typeof udata.liteMode === "boolean") {
          setLiteMode(udata.liteMode);
          localStorage.setItem("lite_mode", udata.liteMode ? "true" : "false");
        }
        if (typeof udata.hapticsEnabled === "boolean") {
          setHapticsEnabled(udata.hapticsEnabled);
          localStorage.setItem("haptics_enabled", udata.hapticsEnabled ? "true" : "false");
        }
        if (typeof udata.taskpassEnabled === "boolean") {
          setTaskpassEnabled(udata.taskpassEnabled);
          localStorage.setItem("taskpass_enabled", udata.taskpassEnabled ? "true" : "false");
        }
        if (typeof udata.notebookLmEnabled === "boolean") {
          setNotebookLmEnabled(udata.notebookLmEnabled);
          localStorage.setItem("notebook_lm_enabled", udata.notebookLmEnabled ? "true" : "false");
        }
        if (typeof udata.aiPlansEnabled === "boolean") {
          setAiPlansEnabled(udata.aiPlansEnabled);
          localStorage.setItem("ai_plans_enabled", udata.aiPlansEnabled ? "true" : "false");
        }
        if (typeof udata.aiSubtasksEnabled === "boolean") {
          setAiSubtasksEnabled(udata.aiSubtasksEnabled);
          localStorage.setItem("ai_subtasks_enabled", udata.aiSubtasksEnabled ? "true" : "false");
        }
        if (typeof udata.collaboratorsEnabled === "boolean") {
          setCollaboratorsEnabled(udata.collaboratorsEnabled);
          localStorage.setItem("collaborators_enabled", udata.collaboratorsEnabled ? "true" : "false");
        }
        if (typeof udata.sequencesEnabled === "boolean") {
          setSequencesEnabled(udata.sequencesEnabled);
          localStorage.setItem("sequences_enabled", udata.sequencesEnabled ? "true" : "false");
        }
        if (typeof udata.sequenceGroupHeadersEnabled === "boolean") {
          setSequenceGroupHeadersEnabled(udata.sequenceGroupHeadersEnabled);
          localStorage.setItem("sequence_group_headers_enabled", udata.sequenceGroupHeadersEnabled ? "true" : "false");
        }
        if (typeof udata.bulkAddTasksEnabled === "boolean") {
          setBulkAddTasksEnabled(udata.bulkAddTasksEnabled);
          localStorage.setItem("bulk_add_tasks_enabled", udata.bulkAddTasksEnabled ? "true" : "false");
        }
        if (typeof udata.workspaceDataEnabled === "boolean") {
          setWorkspaceDataEnabled(udata.workspaceDataEnabled);
          localStorage.setItem("workspace_data_enabled", udata.workspaceDataEnabled ? "true" : "false");
        }
        if (typeof udata.notesRepoEnabled === "boolean") {
          setNotesRepoEnabled(udata.notesRepoEnabled);
          localStorage.setItem("notes_repo_enabled", udata.notesRepoEnabled ? "true" : "false");
        }
        if (typeof udata.focusPanelEnabled === "boolean") {
          setFocusPanelEnabled(udata.focusPanelEnabled);
          localStorage.setItem("focus_panel_enabled", udata.focusPanelEnabled ? "true" : "false");
        }
        if (typeof udata.timelinePanelEnabled === "boolean") {
          setTimelinePanelEnabled(udata.timelinePanelEnabled);
          localStorage.setItem("timeline_panel_enabled", udata.timelinePanelEnabled ? "true" : "false");
        }
        if (typeof udata.tasksPanelEnabled === "boolean") {
          setTasksPanelEnabled(udata.tasksPanelEnabled);
          localStorage.setItem("tasks_panel_enabled", udata.tasksPanelEnabled ? "true" : "false");
        }
        if (typeof udata.bulkOpsEnabled === "boolean") {
          setBulkOpsEnabled(udata.bulkOpsEnabled);
          localStorage.setItem("bulk_ops_enabled", udata.bulkOpsEnabled ? "true" : "false");
        }
        if (typeof udata.expensesEnabled === "boolean") {
          setExpensesEnabled(udata.expensesEnabled);
          localStorage.setItem("expenses_enabled", udata.expensesEnabled ? "true" : "false");
        }
        if (typeof udata.showCompletedTasks === "boolean") {
          setShowCompletedTasks(udata.showCompletedTasks);
          localStorage.setItem("show_completed_tasks", udata.showCompletedTasks ? "true" : "false");
        }
        if (typeof udata.dayStartHour === "string") {
          setDayStartHour(udata.dayStartHour);
          localStorage.setItem("day_start_hour", udata.dayStartHour);
        }
        if (udata.dayStartHoursByDate && typeof udata.dayStartHoursByDate === "object") {
          setDayStartHoursByDate(udata.dayStartHoursByDate);
          localStorage.setItem("day_start_hours_by_date", JSON.stringify(udata.dayStartHoursByDate));
        }
        if (typeof udata.complementaryCalendarUrl === "string") {
          setComplementaryCalendarUrl(udata.complementaryCalendarUrl);
          localStorage.setItem("complementary_calendar_url", udata.complementaryCalendarUrl);
        }
        if (typeof udata.defaultDuration === "number") {
          setDefaultDuration(udata.defaultDuration);
          localStorage.setItem("default_duration", udata.defaultDuration.toString());
        }
        if (typeof udata.timelineIncrement === "number") {
          setTimelineIncrement(udata.timelineIncrement);
          localStorage.setItem("timeline_increment", udata.timelineIncrement.toString());
        }
        if (typeof udata.fontSizeScale === "string") {
          const fss = udata.fontSizeScale as "readable" | "normal" | "large";
          if (fss === "readable" || fss === "normal" || fss === "large") {
            setFontSizeScale(fss);
            localStorage.setItem("font_size_scale", fss);
          }
        }
        if (typeof udata.lockedNoColor === "boolean") {
          setLockedNoColor(udata.lockedNoColor);
          localStorage.setItem("status_locked_nocolor", udata.lockedNoColor ? "true" : "false");
        }
        if (typeof udata.highNoColor === "boolean") {
          setHighNoColor(udata.highNoColor);
          localStorage.setItem("status_high_nocolor", udata.highNoColor ? "true" : "false");
        }
        if (typeof udata.medNoColor === "boolean") {
          setMedNoColor(udata.medNoColor);
          localStorage.setItem("status_med_nocolor", udata.medNoColor ? "true" : "false");
        }
        if (typeof udata.lowNoColor === "boolean") {
          setLowNoColor(udata.lowNoColor);
          localStorage.setItem("status_low_nocolor", udata.lowNoColor ? "true" : "false");
        }
        if (typeof udata.lockedHue === "number") {
          setLockedHue(udata.lockedHue);
          localStorage.setItem("status_locked_hue", udata.lockedHue.toString());
        }
        if (typeof udata.lockedOpacity === "number") {
          setLockedOpacity(udata.lockedOpacity);
          localStorage.setItem("status_locked_opacity", udata.lockedOpacity.toString());
        }
        if (typeof udata.highHue === "number") {
          setHighHue(udata.highHue);
          localStorage.setItem("status_high_hue", udata.highHue.toString());
        }
        if (typeof udata.highOpacity === "number") {
          setHighOpacity(udata.highOpacity);
          localStorage.setItem("status_high_opacity", udata.highOpacity.toString());
        }
        if (typeof udata.medHue === "number") {
          setMedHue(udata.medHue);
          localStorage.setItem("status_med_hue", udata.medHue.toString());
        }
        if (typeof udata.medOpacity === "number") {
          setMedOpacity(udata.medOpacity);
          localStorage.setItem("status_med_opacity", udata.medOpacity.toString());
        }
        if (typeof udata.lowHue === "number") {
          setLowHue(udata.lowHue);
          localStorage.setItem("status_low_hue", udata.lowHue.toString());
        }
        if (typeof udata.lowOpacity === "number") {
          setLowOpacity(udata.lowOpacity);
          localStorage.setItem("status_low_opacity", udata.lowOpacity.toString());
        }
        if (typeof udata.cardBgOpacity === "number") {
          setCardBgOpacity(udata.cardBgOpacity);
          localStorage.setItem("status_card_bg_opacity", udata.cardBgOpacity.toString());
        }
        if (typeof udata.cardBgHue === "number") {
          setCardBgHue(udata.cardBgHue);
          localStorage.setItem("status_card_bg_hue", udata.cardBgHue.toString());
        }
        if (typeof udata.underlightingBrightness === "number") {
          setUnderlightingBrightness(udata.underlightingBrightness);
          localStorage.setItem("status_underlighting_brightness", udata.underlightingBrightness.toString());
        }
        if (typeof udata.cardGradientPercent === "number") {
          setCardGradientPercent(udata.cardGradientPercent);
          localStorage.setItem("status_card_gradient_percent", udata.cardGradientPercent.toString());
        }
        if (udata.cardGradientDirection === "left" || udata.cardGradientDirection === "right") {
          setCardGradientDirection(udata.cardGradientDirection as "left" | "right");
          localStorage.setItem("status_card_gradient_direction", udata.cardGradientDirection);
        }
        if (typeof udata.cardOutlineThickness === "number") {
          setCardOutlineThickness(udata.cardOutlineThickness);
          localStorage.setItem("status_card_outline_thickness", udata.cardOutlineThickness.toString());
        }
        if (typeof udata.defaultWeatherLocation === "string") {
          setDefaultWeatherLocation(udata.defaultWeatherLocation);
          localStorage.setItem("taskpass_default_weather_location", udata.defaultWeatherLocation);
        }
        if (typeof udata.panelBgDayColor === "string") {
          setPanelBgDayColor(udata.panelBgDayColor);
          localStorage.setItem("panel_bg_day_color", udata.panelBgDayColor);
        }
        if (typeof udata.panelBgNightColor === "string") {
          setPanelBgNightColor(udata.panelBgNightColor);
          localStorage.setItem("panel_bg_night_color", udata.panelBgNightColor);
        }
        if (typeof udata.lockedSolidColorEnabled === "boolean") {
          setLockedSolidColorEnabled(udata.lockedSolidColorEnabled);
          localStorage.setItem("status_locked_solid_color_enabled", udata.lockedSolidColorEnabled ? "true" : "false");
        }
        if (typeof udata.lockedSolidBgColor === "string") {
          setLockedSolidBgColor(udata.lockedSolidBgColor);
          localStorage.setItem("status_locked_solid_bg_color", udata.lockedSolidBgColor);
        }
      } else {
        const defaultWallet = { favorPoints: 120 };
        setWallet(defaultWallet);
        setDoc(userDocRef, cleanForFirestore({ uid, favorPoints: 120, categories, collaborators })).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    });

    // 2. Listen to schedule tasks
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", uid));
    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      // Clean up old recently deleted task IDs (> 15 seconds old)
      const now = Date.now();
      recentlyDeletedTaskIdsRef.current.forEach((timestamp, deletedId) => {
        if (now - timestamp > 15000) {
          recentlyDeletedTaskIdsRef.current.delete(deletedId);
        }
      });

      const dbTasks: Task[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as Task;
        if (item.userId === uid && !docSnap.id.startsWith("seed_task_")) {
          // Skip if the task was recently deleted locally
          if (!recentlyDeletedTaskIdsRef.current.has(docSnap.id)) {
            dbTasks.push({ ...item, id: docSnap.id });
          }
        }
      });

      // Merge database tasks with current local tasks based on lastModified timestamp,
      // and keep recently added local tasks that haven't synced to Firestore yet.
      const currentLocal = tasksRef.current || [];
      const localMap = new Map(currentLocal.map(t => [t.id, t]));
      const dbTaskIds = new Set(dbTasks.map(t => t.id));

      const mergedTasks = dbTasks.map(dbT => {
        const localT = localMap.get(dbT.id);
        if (localT && localT.lastModified && (!dbT.lastModified || localT.lastModified > dbT.lastModified)) {
          return localT; // Keep the newer local task!
        }
        return dbT;
      });

      // Retain any local tasks not in the DB snapshot if they were modified recently (< 10 minutes) and not deleted
      currentLocal.forEach(localT => {
        if (!dbTaskIds.has(localT.id) && !recentlyDeletedTaskIdsRef.current.has(localT.id)) {
          if (localT.lastModified && now - localT.lastModified < 600000) {
            mergedTasks.push(localT);
          }
        }
      });

      // Completely deduplicate mergedTasks across ID, gcalEventId, or content
      const finalMergedTasks = deduplicateTasks(mergedTasks);

      // Only update state and localStorage if task list has actually changed
      const currentTasksJson = JSON.stringify(tasksRef.current || []);
      const nextTasksJson = JSON.stringify(finalMergedTasks);
      if (currentTasksJson !== nextTasksJson) {
        setTasks(finalMergedTasks);
        tasksRef.current = finalMergedTasks; // Synchronous update!
        localStorage.setItem("taskpass_tasks_v10", nextTasksJson);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "tasks");
    });

    // 3. Listen to reusable custom routines
    const routinesQuery = query(collection(db, "routines"), where("userId", "==", uid));
    const unsubRoutines = onSnapshot(routinesQuery, (snap) => {
      const dbRoutines: Routine[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as Routine & { userId?: string };
        if (item.userId === uid && docSnap.id !== "routine_morning") {
          dbRoutines.push({ ...item, id: docSnap.id });
        }
      });
      setRoutines(dbRoutines);
      localStorage.setItem("taskpass_routines_v10", JSON.stringify(dbRoutines));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "routines");
    });

    // 4. Listen to delegated peer transfers
    const transfersQuery = query(collection(db, "transfers"), or(where("fromUserId", "==", uid), where("toUserId", "==", uid)));
    const unsubTransfers = onSnapshot(transfersQuery, (snap) => {
      const dbTransfers: Transfer[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as Transfer;
        if ((item.fromUserId === uid || item.toUserId === uid) && docSnap.id !== "transfer_1") {
          dbTransfers.push({ ...item, id: docSnap.id });
        }
      });
      setTransfers(dbTransfers);
      localStorage.setItem("taskpass_transfers_v10", JSON.stringify(dbTransfers));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "transfers");
    });

    // 5. Listen to dynamic Generated Plans
    const plansQuery = query(collection(db, "generated_plans"), where("userId", "==", uid));
    const unsubPlans = onSnapshot(plansQuery, (snap) => {
      const dbPlans: GeneratedPlan[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as GeneratedPlan;
        if (item.userId === uid) {
          dbPlans.push({ ...item, id: docSnap.id });
        }
      });
      if (dbPlans.length > 0) {
        setGeneratedPlans(dbPlans);
        localStorage.setItem("taskpass_generated_plans_v10", JSON.stringify(dbPlans));
      }
    }, (err) => {
      console.warn("Could not load dynamic plans from cloud, falling back to local:", err);
    });

    // 6. Listen to dynamic General Notes
    const notesQuery = query(collection(db, "notes"), where("userId", "==", uid));
    const unsubNotes = onSnapshot(notesQuery, (snap) => {
      const dbNotes: any[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.userId === uid) {
          dbNotes.push({ ...item, id: docSnap.id });
        }
      });
      if (dbNotes.length > 0) {
        setNotes(dbNotes);
        localStorage.setItem("taskpass_notes_v1", JSON.stringify(dbNotes));
      }
    }, (err) => {
      console.warn("Could not load notes from cloud, falling back to local:", err);
    });

    // 7. Listen to dynamic Contacts
    const contactsQuery = query(collection(db, "contacts"), where("userId", "==", uid));
    const unsubContacts = onSnapshot(contactsQuery, (snap) => {
      const dbContacts: AppContact[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data() as AppContact;
        if (item.userId === uid) {
          dbContacts.push({ ...item, id: docSnap.id });
        }
      });
      if (dbContacts.length > 0) {
        setContacts(dbContacts);
        localStorage.setItem("taskpass_contacts_v1", JSON.stringify(dbContacts));
      }
    }, (err) => {
      console.warn("Could not load contacts from cloud, falling back to local:", err);
      handleFirestoreError(err, OperationType.GET, "contacts");
    });

    // 8. Listen to Spendings
    const spendingsQuery = query(collection(db, "spendings"), where("userId", "==", uid));
    const unsubSpendings = onSnapshot(spendingsQuery, (snap) => {
      const dbSpendings: any[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.userId === uid) {
          dbSpendings.push({ ...item, id: docSnap.id });
        }
      });
      if (dbSpendings.length > 0) {
        setSpendings(dbSpendings);
        localStorage.setItem("spending_tracker_items_v1", JSON.stringify(dbSpendings));
      }
    }, (err) => {
      console.warn("Could not load spendings from cloud, falling back to local:", err);
    });

    return () => {
      unsubUser();
      unsubTasks();
      unsubRoutines();
      unsubTransfers();
      unsubPlans();
      unsubNotes();
      unsubContacts();
      unsubSpendings();
    };
  }, [currentUser]);

  const saveWorkspace = (newTasks: Task[], skipHistory = false, skipGcalAutoPush = false) => {
    // Run global deduplication across ID, gcalEventId, and content
    const uniqueNewTasks = deduplicateTasks(newTasks);

    if (!skipHistory) {
      setUndoStack(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === tasks) return prev;
        const nextStack = [...prev, tasks];
        if (nextStack.length > 50) {
          return nextStack.slice(nextStack.length - 50);
        }
        return nextStack;
      });
      setRedoStack([]); // Clear redo stack on new action
    }

    const previousTasks = tasksRef.current || [];
    const oldMap = new Map(previousTasks.map(t => [t.id, t]));

    // Fast property check ignoring lastModified to avoid expensive JSON.stringify loops
    const finalNewTasks = uniqueNewTasks.map(newT => {
      const oldT = oldMap.get(newT.id);
      const hasChanged = !oldT || (
        oldT.title !== newT.title ||
        oldT.completed !== newT.completed ||
        oldT.time !== newT.time ||
        oldT.duration !== newT.duration ||
        oldT.date !== newT.date ||
        oldT.location !== newT.location ||
        oldT.collaborator !== newT.collaborator ||
        oldT.notes !== newT.notes ||
        oldT.priority !== newT.priority ||
        oldT.travelBefore !== newT.travelBefore ||
        oldT.travelAfter !== newT.travelAfter ||
        oldT.isLocked !== newT.isLocked ||
        oldT.category !== newT.category ||
        oldT.isInProgress !== newT.isInProgress ||
        oldT.focusStartedAt !== newT.focusStartedAt ||
        oldT.accumulatedElapsedMs !== newT.accumulatedElapsedMs ||
        oldT.isTransferred !== newT.isTransferred
      );
      if (hasChanged) {
        return { ...newT, lastModified: Date.now() };
      }
      return newT;
    });

    setTasks(finalNewTasks);
    tasksRef.current = finalNewTasks; // Update synchronously in memory

    // Debounce localStorage writes to prevent main-thread I/O blocking
    if (tasksStorageDebounceRef.current) {
      clearTimeout(tasksStorageDebounceRef.current);
    }
    tasksStorageDebounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem("taskpass_tasks_v10", JSON.stringify(finalNewTasks));
      } catch (e) {
        console.warn("Storage write error:", e);
      }
    }, 150);

    const newMap = new Map(finalNewTasks.map(t => [t.id, t]));

    // Identify deletions
    const toDelete: string[] = [];
    oldMap.forEach((oldT, id) => {
      if (!newMap.has(id)) {
        recentlyDeletedTaskIdsRef.current.set(id, Date.now());
        recordGcalDeletion(id);
        if (oldT.gcalEventId) {
          recordGcalDeletion(oldT.gcalEventId);
          if (gcalAccessToken && isGcalSyncActive) {
            deleteTaskFromGoogleCalendar(gcalAccessToken, oldT.gcalEventId);
          }
        }
        toDelete.push(id);
      }
    });

    // Identify writes/updates
    const toWrite: { id: string; data: Task }[] = [];
    newMap.forEach((newT, id) => {
      const oldT = oldMap.get(id);
      const hasChanged = !oldT || JSON.stringify(newT) !== JSON.stringify(oldT);
      if (hasChanged) {
        toWrite.push({ id, data: newT });

        // Auto-push modified/new task to Google Calendar if sync is active and not skipped
        if (!skipGcalAutoPush && gcalAccessToken && isGcalSyncActive && newT.date && !newT.isTransferred && !(newT.isRecurring && !newT.recurringParentId)) {
          pushTaskToGoogleCalendar(gcalAccessToken, newT, true).then(eventId => {
            if (eventId && eventId !== newT.gcalEventId) {
              setTasks(prev => prev.map(t => t.id === newT.id ? { ...t, gcalEventId: eventId } : t));
              if (tasksRef.current) {
                tasksRef.current = tasksRef.current.map(t => t.id === newT.id ? { ...t, gcalEventId: eventId } : t);
                localStorage.setItem("taskpass_tasks_v10", JSON.stringify(tasksRef.current));
              }
              if (db && currentUser) {
                const docRef = doc(db, "tasks", newT.id);
                setDoc(docRef, cleanForFirestore({ ...newT, gcalEventId: eventId, userId: currentUser.uid }), { merge: true }).catch(() => {});
              }
            }
          }).catch(err => console.error("Auto GCal push error:", err));
        }
      }
    });

    if (db && currentUser) {
      const uid = currentUser.uid;

      if (toDelete.length > 0 || toWrite.length > 0) {
        type BatchOp = { type: 'delete'; id: string } | { type: 'write'; id: string; data: Task };
        const totalOps: BatchOp[] = [
          ...toDelete.map(id => ({ type: 'delete' as const, id })),
          ...toWrite.map(item => ({ type: 'write' as const, id: item.id, data: item.data }))
        ];

        // Execute in atomic batches of 450
        const CHUNK_SIZE = 450;
        for (let i = 0; i < totalOps.length; i += CHUNK_SIZE) {
          const chunk = totalOps.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);

          chunk.forEach(op => {
            if (op.type === 'delete') {
              batch.delete(doc(db, "tasks", op.id));
            } else if (op.type === 'write') {
              const docRef = doc(db, "tasks", op.id);
              const sanitizedTask = {
                ...op.data,
                id: op.id,
                userId: uid,
                title: op.data.title || "Untitled Task",
                date: op.data.date || new Date().toISOString().split("T")[0],
                time: op.data.time !== undefined && op.data.time !== null ? String(op.data.time) : "",
                duration: op.data.duration || "30 min",
                isLocked: Boolean(op.data.isLocked),
                completed: Boolean(op.data.completed),
              };
              batch.set(docRef, cleanForFirestore(sanitizedTask));
            }
          });

          batch.commit().catch(err => {
            console.error("Firestore batch commit failed:", err);
            handleFirestoreError(err, OperationType.WRITE, "tasks");
          });
        }
      }
    }
  };

  const instantiateVirtualIfNeeded = (taskId: string, currentTasks: Task[] = tasksRef.current): { updatedTasks: Task[]; realTaskId: string } => {
    if (!taskId || !taskId.startsWith("virtual__")) {
      return { updatedTasks: currentTasks, realTaskId: taskId };
    }

    // Format: virtual__${templateId}__${date}
    const parts = taskId.split("__");
    const templateId = parts[1];
    const itemDate = parts[2];

    // Check if there is already a real instance for this date
    const existingReal = currentTasks.find(t => t.date === itemDate && t.recurringParentId === templateId);
    if (existingReal) {
      return { updatedTasks: currentTasks, realTaskId: existingReal.id };
    }

    // Find the template
    const template = currentTasks.find(t => t.id === templateId);
    if (!template) {
      return { updatedTasks: currentTasks, realTaskId: taskId };
    }

    const newClones: Task[] = [];
    let mainCloneId = "";

    // If template has a groupId and is not unlinked, instantiate all of them in that group together
    if (template.groupId && !template.isUnlinked) {
      const groupTemplates = currentTasks.filter(t => t.groupId === template.groupId && t.isRecurring && !t.recurringParentId && !t.isUnlinked && t.date <= itemDate);
      groupTemplates.forEach(gt => {
        // Check if there is already a real instance for gt on itemDate
        const gtReal = currentTasks.find(t => t.date === itemDate && t.recurringParentId === gt.id);
        if (!gtReal) {
          const cloneId = `task_${Date.now()}_rec_${Math.random().toString(36).substr(2, 4)}_${gt.id}`;
          const clone: Task = {
            ...gt,
            id: cloneId,
            date: itemDate,
            recurringParentId: gt.id,
            completed: false,
            isInProgress: false,
            travelBeforeCompleted: false,
            travelAfterCompleted: false,
            gcalEventId: undefined
          };
          if (gt.subtasks) {
            clone.subtasks = gt.subtasks.map(st => ({
              ...st,
              id: "sub_" + Math.random().toString(36).substr(2, 9),
              completed: false
            }));
          }
          newClones.push(clone);
          if (gt.id === templateId) {
            mainCloneId = cloneId;
          }
        } else {
          if (gt.id === templateId) {
            mainCloneId = gtReal.id;
          }
        }
      });
    } else {
      const cloneId = `task_${Date.now()}_rec_${Math.random().toString(36).substr(2, 4)}`;
      const clone: Task = {
        ...template,
        id: cloneId,
        date: itemDate,
        recurringParentId: templateId,
        completed: false,
        isInProgress: false,
        travelBeforeCompleted: false,
        travelAfterCompleted: false,
        gcalEventId: undefined
      };
      if (template.subtasks) {
        clone.subtasks = template.subtasks.map(st => ({
          ...st,
          id: "sub_" + Math.random().toString(36).substr(2, 9),
          completed: false
        }));
      }
      newClones.push(clone);
      mainCloneId = cloneId;
    }

    // Fallback if mainCloneId is still empty
    if (!mainCloneId) {
      const cloneId = `task_${Date.now()}_rec_${Math.random().toString(36).substr(2, 4)}`;
      const clone: Task = {
        ...template,
        id: cloneId,
        date: itemDate,
        recurringParentId: templateId,
        completed: false,
        isInProgress: false,
        travelBeforeCompleted: false,
        travelAfterCompleted: false,
        gcalEventId: undefined
      };
      if (template.subtasks) {
        clone.subtasks = template.subtasks.map(st => ({
          ...st,
          id: "sub_" + Math.random().toString(36).substr(2, 9),
          completed: false
        }));
      }
      newClones.push(clone);
      mainCloneId = cloneId;
    }

    const updatedTasks = [...currentTasks, ...newClones];
    return { updatedTasks, realTaskId: mainCloneId };
  };

  const handleToggleCompleteBuffer = (parentTaskId: string, bufferType: "before" | "after") => {
    const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(parentTaskId);
    const parentTask = updatedTasks.find(t => t.id === realTaskId);
    if (!parentTask) return;

    const nextCompleted = bufferType === "before" ? !parentTask.travelBeforeCompleted : !parentTask.travelAfterCompleted;
    if (nextCompleted) {
      triggerHaptic("success");
    } else {
      triggerHaptic("light");
    }

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const updated = updatedTasks.map(t => {
      if (t.id === realTaskId) {
        const updates: any = {};
        if (bufferType === "before") {
          updates.travelBeforeCompleted = nextCompleted;
          if (nextCompleted) {
            if (t.originalTravelBefore === undefined) {
              updates.originalTravelBefore = t.travelBefore;
            }
            if (t.originalTime === undefined) {
              updates.originalTime = t.time;
            }
            let startMins = timeToMinutes(t.computedTime || t.time || "08:00") - (t.travelBefore || 0);
            if (activeBufferTaskId === realTaskId && activeBufferType === "before" && bufferStartedAt) {
              const bDate = new Date(bufferStartedAt);
              startMins = bDate.getHours() * 60 + bDate.getMinutes();
            }
            let elapsedBuffer = nowMins - startMins;
            if (elapsedBuffer <= 0) elapsedBuffer = 1;
            
            updates.travelBefore = elapsedBuffer;
            updates.time = minutesToTimeString(nowMins);
            updates.computedTime = minutesToTimeString(nowMins);
            updates.isLocked = true;
          } else {
            updates.travelBefore = t.originalTravelBefore !== undefined ? t.originalTravelBefore : t.travelBefore;
            updates.time = t.originalTime || t.time;
            updates.computedTime = t.originalTime || t.time;
          }
        } else {
          updates.travelAfterCompleted = nextCompleted;
          if (nextCompleted) {
            if (t.originalTravelAfter === undefined) {
              updates.originalTravelAfter = t.travelAfter;
            }
            const taskStartMins = timeToMinutes(t.computedTime || t.time || "08:00");
            const taskDur = parseDurationToMinutes(t.duration);
            let startMins = taskStartMins + taskDur;
            if (activeBufferTaskId === realTaskId && activeBufferType === "after" && bufferStartedAt) {
              const bDate = new Date(bufferStartedAt);
              startMins = bDate.getHours() * 60 + bDate.getMinutes();
            }
            let elapsedBuffer = nowMins - startMins;
            if (elapsedBuffer <= 0) elapsedBuffer = 1;

            updates.travelAfter = elapsedBuffer;
          } else {
            updates.travelAfter = t.originalTravelAfter !== undefined ? t.originalTravelAfter : t.travelAfter;
          }
        }
        return { ...t, ...updates };
      }
      return t;
    });

    if (nextCompleted && activeBufferTaskId === realTaskId && activeBufferType === bufferType) {
      setActiveBufferTaskId(null);
      setActiveBufferType(null);
      setBufferStartedAt(null);
    }

    saveWorkspace(updated);
  };

  const updateTaskDurationOrBuffer = (taskId: string, mins: number) => {
    activeFocusTaskIdRef.current = taskId;
    if (taskId.endsWith("_before") || taskId.endsWith("_after")) {
      const parentTaskId = taskId.endsWith("_before") ? taskId.slice(0, -7) : taskId.slice(0, -6);
      const bufferType = taskId.endsWith("_before") ? "before" : "after";
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(parentTaskId);
      const updated = updatedTasks.map(t => {
        if (t.id === realTaskId) {
          const updates: any = {};
          if (bufferType === "before") {
            if (t.originalTravelBefore === undefined) {
              updates.originalTravelBefore = t.travelBefore;
            }
            updates.travelBefore = mins;
          } else {
            if (t.originalTravelAfter === undefined) {
              updates.originalTravelAfter = t.travelAfter;
            }
            updates.travelAfter = mins;
          }
          return { ...t, ...updates };
        }
        return t;
      });
      saveWorkspace(updated);

      if (editingTask && editingTask.id === realTaskId) {
        if (bufferType === "before") {
          setTaskTravelBefore(mins);
        } else {
          setTaskTravelAfter(mins);
        }
        setEditingTask(prev => prev ? {
          ...prev,
          travelBefore: bufferType === "before" ? mins : (prev.travelBefore || 0),
          travelAfter: bufferType === "after" ? mins : (prev.travelAfter || 0)
        } : null);
      }
    } else {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      updateTaskDuration(realTaskId, mins, updatedTasks);
    }
  };

  const handleSwitchStage = (stage: "before" | "during" | "after") => {
    const currentFocus = focusQueueTasks[focusBrowseIndex];
    if (!currentFocus) return;
    const currentFocusTarget = tasks.find(t => t.id === (currentFocus.isBuffer ? currentFocus.parentTaskId : currentFocus.id)) || currentFocus;
    if (!currentFocusTarget) return;
    const mainTaskId = currentFocusTarget.id;
    const parentTask = tasks.find(t => t.id === mainTaskId) || currentFocusTarget;

    // Ensure target buffer is initialized if it's 0 or empty
    if (stage === "before" && (!parentTask.travelBefore || parentTask.travelBefore <= 0)) {
      updateTaskDurationOrBuffer(mainTaskId + "_before", 15);
    } else if (stage === "after" && (!parentTask.travelAfter || parentTask.travelAfter <= 0)) {
      updateTaskDurationOrBuffer(mainTaskId + "_after", 15);
    }

    setFocusTimerMode(stage === "during" ? "task" : stage);

    const targetCardId = stage === "before" ? `${mainTaskId}_before` : (stage === "after" ? `${mainTaskId}_after` : mainTaskId);

    const idx = focusQueueTasks.findIndex(t => t.id === targetCardId);
    if (idx !== -1) {
      isCardToCardNavigationRef.current = true;
      setFocusBrowseIndex(idx);
      activeFocusTaskIdRef.current = targetCardId;
    } else {
      pendingFocusCardSwitchRef.current = targetCardId;
    }
    triggerHaptic("medium");
  };

  const updateTaskStartTimeOrBuffer = (taskId: string, adjustMins: number) => {
    activeFocusTaskIdRef.current = taskId;
    if (taskId.endsWith("_before") || taskId.endsWith("_after")) {
      const parentTaskId = taskId.endsWith("_before") ? taskId.slice(0, -7) : taskId.slice(0, -6);
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(parentTaskId);
      updateTaskStartTime(realTaskId, adjustMins, updatedTasks);
    } else {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      updateTaskStartTime(realTaskId, adjustMins, updatedTasks);
    }
  };

  const updateTaskStartTimeAndDuration = (taskId: string, adjustMins: number) => {
    activeFocusTaskIdRef.current = taskId;
    const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
    const updated = updatedTasks.map(t => {
      if (t.id === realTaskId) {
        const origTime = t.computedTime || t.time || dayStartHour || "08:00";
        const currentMins = timeToMinutes(origTime);
        const newMins = Math.max(0, Math.min(1435, currentMins + adjustMins));
        const newTimeStr = minutesToTimeString(newMins);
        
        const currentDur = parseDurationToMinutes(t.duration);
        const newDur = Math.max(5, currentDur - adjustMins);
        
        return { 
          ...t, 
          time: newTimeStr,
          computedTime: newTimeStr,
          duration: `${newDur} min`,
          isLocked: t.isLocked 
        };
      }
      return t;
    });
    saveWorkspace(updated);
  };

  const updateTaskDuration = (taskId: string, mins: number, currentTasks: Task[] = tasks) => {
    const targetTask = currentTasks.find(t => t.id === taskId);
    if (!targetTask) return;

    let updated: Task[];
    if (targetTask.groupId && !targetTask.isUnlinked) {
      const oldMins = parseDurationToMinutes(targetTask.duration) || 15;
      const diffMins = mins - oldMins;
      const targetTime = timeToMinutes(targetTask.computedTime || targetTask.time || dayStartHour || "08:00");

      updated = currentTasks.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            duration: `${mins} min`,
            originalDuration: t.originalDuration !== undefined ? t.originalDuration : t.duration
          };
        }
        if (t.groupId === targetTask.groupId && !t.isUnlinked) {
          const tTime = timeToMinutes(t.computedTime || t.time || dayStartHour || "08:00");
          if (tTime > targetTime) {
            const newTMin = tTime + diffMins;
            const newTimeStr = minutesToTimeString(Math.max(0, Math.min(1435, newTMin)));
            return {
              ...t,
              time: newTimeStr,
              computedTime: newTimeStr,
              originalTime: t.originalTime !== undefined ? t.originalTime : (t.computedTime || t.time)
            };
          }
        }
        return t;
      });
    } else {
      updated = currentTasks.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            duration: `${mins} min`,
            originalDuration: t.originalDuration !== undefined ? t.originalDuration : t.duration
          };
        }
        return t;
      });
    }
    saveWorkspace(updated);

    if (editingTask && editingTask.id === taskId) {
      setTaskDuration(`${mins} min`);
    }
  };

  const updateTaskStartTime = (taskId: string, adjustMins: number, currentTasks: Task[] = tasks) => {
    const targetTask = currentTasks.find(t => t.id === taskId);
    if (!targetTask) return;

    let updated: Task[];
    if (targetTask.groupId && !targetTask.isUnlinked) {
      updated = currentTasks.map(t => {
        if (t.groupId === targetTask.groupId && !t.isUnlinked) {
          const origTime = t.computedTime || t.time || dayStartHour || "08:00";
          const currentMins = timeToMinutes(origTime);
          const newMins = Math.max(0, Math.min(1435, currentMins + adjustMins));
          const newTimeStr = minutesToTimeString(newMins);
          return { 
            ...t, 
            time: newTimeStr,
            computedTime: newTimeStr
          };
        }
        return t;
      });
    } else {
      updated = currentTasks.map(t => {
        if (t.id === taskId) {
          const origTime = t.computedTime || t.time || dayStartHour || "08:00";
          const currentMins = timeToMinutes(origTime);
          const newMins = Math.max(0, Math.min(1435, currentMins + adjustMins));
          const newTimeStr = minutesToTimeString(newMins);
          return { 
            ...t, 
            time: newTimeStr,
            computedTime: newTimeStr,
            isLocked: t.isLocked 
          };
        }
        return t;
      });
    }
    saveWorkspace(updated);
  };

  const getDriveTimeLeft = (task: Task) => {
    const travelBefore = task.travelBefore || 0;
    if (!travelBefore) return 15;
    
    const taskStartTimeStr = task.computedTime || task.time;
    if (!taskStartTimeStr) return travelBefore;
    
    const taskStartTimeMins = timeToMinutes(taskStartTimeStr);
    const driveStartMins = taskStartTimeMins - travelBefore;
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    if (currentMins >= driveStartMins && currentMins < taskStartTimeMins) {
      return Math.max(1, taskStartTimeMins - currentMins);
    }
    
    return travelBefore;
  };

  // Google Calendar Integration Operations (Read & Write)
  const syncFromGoogleCalendar = async (accessToken: string) => {
    try {
      const syncStartTime = Date.now();
      const timeMin = new Date(selectedDate + "T00:00:00").toISOString();
      const nextDay = new Date(selectedDate + "T23:59:59");
      const timeMax = nextDay.toISOString();
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
      const response = await gcalFetchQueue.fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setGcalAccessToken(null);
          setGcalStatusMsg("GCal Auth Error: Google Calendar session expired (401). Please re-link Google Calendar under settings.");
        }
        const errTxt = await response.text();
        let detailedError = errTxt;
        try {
          const parsed = JSON.parse(errTxt);
          if (parsed && parsed.error) {
            const errorObj = parsed.error;
            detailedError = `${errorObj.message || "Unknown error"} (Code: ${errorObj.code || response.status})`;
            if (errorObj.errors && Array.isArray(errorObj.errors)) {
              const details = errorObj.errors.map((e: any) => `[${e.domain || "global"}/${e.reason || "unknown"}]: ${e.message || ""}`).join("; ");
              if (details) {
                detailedError += ` - Details: ${details}`;
              }
            }
          }
        } catch (_) {}
        throw new Error(`Failed to retrieve calendar events (Status: ${response.status}): ${detailedError}`);
      }
      
      const data = await response.json();
      const items = data.items || [];
      
      const fetchedTasks: Task[] = items.map((item: any) => {
        const isAllDay = !item.start?.dateTime && !!item.start?.date;
        
        let dateString = "";
        let timeString = "00:00";
        let durationMins = 1440;

        if (isAllDay) {
          dateString = item.start.date;
        } else {
          const startDateTime = item.start?.dateTime || item.start?.date;
          const endDateTime = item.end?.dateTime || item.end?.date;
          const startDate = new Date(startDateTime);
          const year = startDate.getFullYear();
          const month = String(startDate.getMonth() + 1).padStart(2, "0");
          const day = String(startDate.getDate()).padStart(2, "0");
          dateString = `${year}-${month}-${day}`;
          
          const hours = String(startDate.getHours()).padStart(2, "0");
          const mins = String(startDate.getMinutes()).padStart(2, "0");
          timeString = `${hours}:${mins}`;
          
          if (endDateTime) {
            const endDate = new Date(endDateTime);
            const diffMs = endDate.getTime() - startDate.getTime();
            durationMins = Math.max(15, Math.round(diffMs / 60000));
          }
        }
        
        let isGcalCompleted = false;
        let summaryText = item.summary || "Untitled Calendar (GCal Event)";
        if (summaryText.startsWith("‚úÖ ")) {
          isGcalCompleted = true;
          summaryText = summaryText.substring(2);
        }

        let parsedNotes = item.description || "";
        let groupId: string | undefined = undefined;
        let groupName: string | undefined = undefined;

        if (item.description) {
          const matchId = item.description.match(/SequenceID:\s*([^\n\r]+)/);
          const matchName = item.description.match(/SequenceName:\s*([^\n\r]+)/);
          if (matchId) {
            groupId = matchId[1].trim();
            const separatorIdx = parsedNotes.indexOf("\n\n---\nSequenceID:");
            if (separatorIdx !== -1) {
              parsedNotes = parsedNotes.substring(0, separatorIdx).trim();
            } else {
              const simplerSeparatorIdx = parsedNotes.indexOf("SequenceID:");
              if (simplerSeparatorIdx !== -1) {
                parsedNotes = parsedNotes.substring(0, simplerSeparatorIdx).trim();
              }
            }
          }
          if (matchName) {
            groupName = matchName[1].trim();
          }
        }
        
        return {
          id: "gcal_" + item.id,
          title: summaryText,
          date: dateString,
          time: timeString,
          duration: `${durationMins} min`,
          completed: isGcalCompleted,
          isLocked: !isAllDay,
          location: item.location || "",
          attendees: item.attendees?.map((a: any) => a.email || a.displayName).filter(Boolean).join(", ") || "",
          gcalEventId: item.id,
          isAllDay: isAllDay,
          notes: parsedNotes,
          groupxúÏΩ[{€Hí(¯Ó_s}∆‡ò§.∂´´hÀ:≤‰ãflKc…]U„ˆ± íP&	6 JV©∏ﬂæÏ˚~ﬂæúáÛ¥?m~…FDﬁ"/ I€5›=ßÿ]	dFfFFF∆-#˜á˝Ëº»g”˝aÁV§?ÙËM2N˚Ê´ı~êåﬁMáIïB˝¨J«Ωô¯˝ˆ[‘jÈíÛGÚÎº≠æ…?£¥ä∆iqU∂¢˜Ω^/ÆíÚS˘6=ÎfEëN*ı˛C˚√#V#”·n>É∑[—:#€˜ﬁÚIYEìÙ*-^Â–ÎclÂ8?úï˝ºˇÄ¯‡tOT¶ :æÄzØì)î+“ÙltΩg^<ªÑ'˚CﬁÛG∑$î≥¥\§Cj≥wñœí¡EüUÌhÎIt£±¥∂Ì^§ÉOQv!¢´§TmG#ÏıËZ÷=;Œ∆È”Î}ƒü›œﬁyZA#Ωl®ëÓU√¢T ùõQD€5∞Xôv‘èfìazñM“aM¢O∫á∑∑∂L—Ü~◊w;•±ß`ûU/πIË≤KÚ!ÄÑéˆ‡{løi„ ∞Nå›^g∞◊±Í≠›ø˙ß@ìèıà⁄lÊhÓék¶,J&√Ë≈n2äRƒ\tE&yù¶ÈD—kîODë2õRQS¿…ÚIœngˇ|í)A'ü“®ú¡Ø¨∫kV¿`l”º,≥”Q a‡êù˘Ü±&ÉAZ¬í¯îNÏ°E.éÔyëè_‰˘˘(¯Èdò1´◊q»à—,}ˆΩH´Y11oÁÓ\ßü≥≤ &Á˚√œ0ÀÇAÙ`ZÜ˚0=ü„ ^8bHﬁà¸1⁄∂∂\∫oÀûEU1Ky3]'´/jO÷ÛŸØø^w«	0Ä>B¡ŸéËgZv¢*´F˙g√ºéìQˆ+–k«ÅÉ≥ùf’EZDßyu%H£Qwò\w¢ºàLU :`‘5/«Äﬂ›ôÿå“dr|Lù€2†È¡ÛºÿKá≥) £ﬁ[slx^-ÄpÅ=Â=Äy≥:ΩÁ›!h˙Œ ù—h/πØ~’Œõ3wf0ï‰5l„Ù®*Ä<-d@!ÿ™™ﬁ Ogí_¥›+[Êôz∂ *é¯∂3‰€®E˝E–Ä‡cµô7.ﬂË,ï¨ÓÌ[ÂãYkw√û+Å‚u«zïøgµ><
ó~ù≥≥LoBoîîïzÉH[Ø_ï˚gí≈Ímv¨*æ>x˚,z˚l˜Ÿõ„W?G’Eºî^§8û`„‚¥HÀ¥∏L9\X`âX∏ìøŒ“Y*ô}TÂ.Hó;˚£|ÿãÓEÎÎÎ.˝–8r◊HZmÁ„Ü}óÉR%ÆŸSõbl
 [Ω)¸#ÜxlÔQ
Âtp+ˆ≤R@Cfó˛uñå˙
ù|&ÅCä‚”"ü¶Eï•Â∑D±+B}s_cw˙äµ˙u«™ÍÿØ9+‹ÍEm˘√-îïÄ O©òı√™¯ªæö/ıƒâ\ÖdÜæ‚1Ùk¢pãbÉz$ÍG®ì˙ùÓ§z‚ÇL™
VIöñSˇb‰®ü˘(P¢L≤√  ‰;Ü2Òƒ	¢õÏ	}/4$˙È°Th[ù‚{îz•Å¥4Nhj™˛™I/m†ÆrG≥…xj?¿Ç`
P⁄Ü!^≈Ì&N¿ı≤{˜¬ra`˝√ÍZ Eπûñ¯H†¥ƒY))_±◊2¨‰≥ ‘óinÒ*£ÅÚ—®±xj.å„%cîíñl$ıa™$(í$≤;€ÃUz∫ñLßñ&*5IÆp¢»9BçÎô„Eî‰ËQïÒ”<G1™≠˚™ıp-oS9Gÿv…F2Ä° Œ<;¥ﬂgÂs—MTﬂ¸·Ù@=äÎµít4à∞¯jÌû–J’,ÿÅ$kB…‡4=Cu´ºû¢≤Jä™shÈy˛‹ı,ﬁé=&pGçhÆK;π∑ï£§5»¬œûTcG°o(WáCQ!$¬q∂øõoiëI~erô˛òü i2HcAHÊ- zG~Q‰ì|VJ›∏Ñ˝zôë≤åãXÓÙfc/igœg∞ F9 qr¥ıg„¨R;<¢ô)£Håa˘ÊË‰Ñ'ëÖ8°)é€Æn	”
	óUÛ≥0dw˛™‚⁄õ—‰*Ú¡Qb≈„ºIõñB·⁄ô¡y4@ÑÏ¢…{ãªwïì∏lj4$ìç–E.…£(3Å‹ÅòùŒF£~Kµ.%ù€YäP⁄±.ß’zI37Çmˆ˜Ï®ù°om…Éπ}≈ô‰û¬«∞&◊j‡&/‚é◊7Y ’g#h±eè™™º¬'≤ï[¥â›R\•n Ä¡H as◊VÅ»ÑπÊ≈NTBõ¯u*ÿ.r?\|Ì~t=Ã Ù±®˝M`û2‰d$˙B =î=B&8	.w=MÅ0KıhyM¯#!‡ÆñÓÇ(EÊï∑'lôåπ“ﬁ!Ã}ÍñmO&Ìj†ªßÂj™PáïÎıy€*¨yqxπ¡@µ¯∂´÷Ú6€úˆm™?˙îMßàO° [ŒH˘dó¯ÇöÄ≈Mí9ÉoéêtÀÆ(›6§C`Ê%· ı È(´‚V∑’¶ù¯Õl|öZ#´£™§N”}≥ySÊ„4Œ 7…õ/i6πLF0ã4“3¥5Tb†d˚YjúbÄÔØ”§ÄEôO™ãÄªFµIwSœùR®!bé˚GP0ä—ú,Ó**\K`h§}}¯ã=£5–e$L$±*¸˚4·voöiGç7;QkΩÂΩ˝˙d)n/Æz·W}ôœärô∫„lËx6¬_™~È◊>Ç›~2\P€ìüùï‘.√5.¢_ÛIz@Ô8∆ë>Y LG8ësrÁÊzﬁΩs3∆ÜÛ„;7Û>¸Ã&¯ßúˇ˚â/ÎÅeÁÿ”l»¿ö`… Øi›kπàHNK—Q®Ù:©.z¿t“√õxÛ“`èÍ†¸ ª¨µ}∑æƒ$»f0·ø!Ñ Kb
˛|¿Ÿo|*[ùk$ŒùïñéÅ}øMœS¥íØ˝è˜ˇ„/ÂˇpÔøÀøÈ…/w÷^7aSïZ…˙8{2Ô{$ˆñ?Ç∑˛„˝ﬂQÀfFØ5;;ZºŸsïr6'≈µﬁ8Ñ8Ωù`#wn¨˘	êÑ˘©±Ä„Äm•ﬁrPdS⁄ö–¿…	…«TaßÑ@I™ä˙U#™^äB«ÈÁäÄÎZ»ÿKRè`vK{Ä®ˇó˘?˛Áˇ”öGÙûp,økÛ7^Ÿ∑œ€8‰Vk~“Ó˝íg¿Âˇ2·Tı…ëÏWˇ/Ä≈z=ˇÀ‰/ì7d∑¿Wn]F_Æ˘hîúÊ i√&I¯≤û‡v’zÏ£≈qÍÿ.Ø∂Ì◊NéÿI˝\æŸ‘S E‰|Ú'çs Íyµj„‹f4µÔÔ‹d¥a"ªúàË'ÈÌËõ´Úw”iZÏ&%Ï$szâíÿº/ ±Q‡oAó0ÂQ,Ê#“Oød∆∏BÓõÅDØÚsötwƒuHU∏hN_i;Œ¢&€’fP≥€∫ç!‘n∑˚ó…©äÉtO¥+ÃÕa”Ô»ŒE| ‹á€n{∆›:Q8ô°Pn>L ≤◊2†g:Õá◊§üX&f…Ù˙Íã±N1bÈ{mwÃ ægÕ∂˜Ò±`gL12ä»=`“„Ä“ÜC®~≈1ø;ﬁ’#¥uZ±öä§—Kê„±4ﬂ®∑'óÀs„vO9†¡ÄËBz¡ø˜∞Ö
V4li;›O∫øÆwX˚K˜#ne=X++◊∆ÇÊ',»W˘ïZêÇIiÑ¥l!ÜFg™ÏxJ”¸Á∑lÓ£äﬁÜÅ€%âød€2A	LäFõI“û¨Ze∞≤ñ4‹ã6Dˇbà˙á‹B.X!ïˇü◊Ø˜ˆH*ä‰ñP^'ëádÚr£7]úQŒb¡ºF∞“ Á\Ú|d/¬§„˜*ä‘;◊÷"DT˜ıÎÓﬁ^-ò® ”1üœ6Ç~ÉÙ4J?F≥2ªL˝&<[8Æ∆–9†≈@Ü–*÷›I˛€ÍL‘ﬂun¨6á∞„∂œ¿&8N∑˙∂ò™;µÆnUï*{?¨≤ÎˆU}-`lEõdô =›ºø˛°|æÒ°ÌöÏ‰ÃÚ∫∂±MÃ7áQ„C	Ò¢eÿPá˙@ÑÂkŒ≥B*¨ eöe∫']î«π“dç€≤ç3wﬂ#MXAéÊ13÷Ú3õó-∑êèÖØ’≤Cò÷⁄‹!§∂!X˚øÆ∏“É≠»aÆ–ÜcQªãˆhz{∏Ò‚‘øıv$ıíjHKÔIﬂM±©ßrœèÊmÌJ±§Q(≈6õˆËI;,¿÷ikW5ÆüÇ:+,ﬂXÑº7ˇÜ!=Ú ≈'U5-˚kkWWWΩs2Ø&”¨D~∞6êv÷µÀ˚˙{π6Ö˛É¥F±Â…{¶Ò˘I«ö≠qZ]‰∞›µﬂ∑¯Ã\§…0-@∑ócUÄ‘=ﬁŸÇz…∞+ƒ•µ_ |“≤}ä;3Ä_døJâ¯‰),∞¥ )îôÑÁ'|¡Ú˙BN¸ó£É7=°0gg◊1>4ÓG„PÙ6Üﬂπµ∏<8˙áG¶etLˆÚOúp•Dä|¶öï¥Á=Xw¢ò î\»;¶s1Óá÷æ!Àò◊Ây‹"S-é4zÜÆäæÁ˝-JÍÈÁ)Ëö√(∆Ü{—!LLëvGŸ‰ìW˜r¨[atË%¨ÓŒê≈1)æÇtpò&Æ›ïyS‹∆v˜EÔ#Å4-lud!ÊçÃcòV‰Ü∂diSÿuûI/Ó>»åiÜÈWÏµ#&NÖX|√ªåÈ’¡È/jìÖÌ=ÿÌ1Hû™^o”ïúUÛ›‰”$øö†≠yÔÊC“IuÈ<¿¢[†˝€çQ ù*O_»∆±S…5Í¯◊-‡â&{^
,Û¥Uƒ©Ù¢IkG⁄Ê¿ı'4òÛQ~öåZÛ5|^ ÒÂ‚˘L≤5ˇ@#≥¿lè"[hWCì=Ú;Ï¢’RˆDylKVùü∏pÁ∑Í~Ò¶—±™õåFßâøGg©pù ù±5d»ìºÖ( P?„ì–ÍéFñ&y»ù6Èf8r∏Ä8è7I
E^ºáÖ|≈"˚4+VjD∫(àÁ´zLkΩúÙﬁuôJ"UìøÕ§ÔÎZÌ∆Äe;8ÉÅàpêå◊©:v∏ôâ^bRôÈrnt›Ñ„IWT±¿Ò€˝æ¿˘kD<l7˘uˇ3•Z1IoÏ{œ^=;~∆vÂ‡∆æ‚6ÌáF˝o∞ÁÜN:‘åÛ6çÛÅ4fYO7÷CzÏ˚wÄK=© %YG+™πoÒ'≤˜8Ôç2.≈&÷„4µL¶qEÖÇ3‹%yA±tá0Â:t¨4Kë-1¢±sõT⁄÷§¿ºÌóÂUû``QÃXÑOB“uAŒvüﬂ˜R≥ﬂº∂√q)±€QÖdØ'2˛ÌvÙ/9±F1kV33√ﬁä¡U∞âùõ2∆fÆÿÄZ]Ì©	]∞Q’AÑ ¡˜|iº„õÉﬂkZÄ8kjA¡+FP Á¸<-–Ã˛,,v |/H™ÎŒì—|d0ÔMÆπi&™Ú¬ƒu¢Ã *”√√<mÎSÉøiŸií£"(ldE	;¨ÉªeîAÛ	¿U)π.≥¢öÈ–∑ò¸†a(gîé˝¥1≠∫Hu¶àÚ(s|xMÑ¶¿¥aöÒ–VÈMDÕ*@'9ç¡Œ¯|Y”) ≤Êv‰V‚¶@Ú1ãÉê¶ ûûŒÑ˙G†åY7∂È®y 6û	ï3)∆#±&„ÒˆN∑¢˜í  X¿¬Ÿ1o≤È”Sz¯¡äÇE´ˇüÂ‰êy2ZŒqŸÖè[mÙ»¢/1é†æõÓRªQqÇÁ0F(≤˚go“p_bg:∆ı∫Zf*x{zë(ä}õMf#:¡d$§´∞YF3ä©¬7ÍL#“õ§·)¥»¶Jñ†êùq˚Á‡Ω6ﬁò¬√éãdRû3˙û2FﬁË?4Å}%
ı˚0)ÑljQOõ™+PÉ›ªû$„l`!Mè•Ar≤®™1¡“}SGvVrgH˚fáV5È˛dP§c(Îˆa«–„∑F“◊a…Ó¶Í†GR∏|=Tv"ÒîÓÉZ/ƒ>DibosÜÓÏ)orIb»äÙ˘]!Ç≤Ô‹p<ÃQËA^ﬁ;q&ã“WíNﬁMG¢XDæ'ﬁÈ9ı∑·¿yØûÓ≤…¸˙rh73N€¬ó,¢”%Ç¶<∆π”Æπß~ÄqÒ!’]É‹êk7Uge.;;ê∂∑L⁄b√¡ :Îkôù˘≠u@πvü¨Ê∏a‰¿~ü…”_tJƒÂ®o
÷¡nd»?YGA¸√,0Ω¡√"ZÊr$.ØF`z”êVo¬3‚?Öâ"Ö≤»W†@G9Vã¬äÍ∑q%kHSÄn#Oã∞(–¨ÑËxÇ¬õ9z&Ã#¬Ö"a˛iNÎıuÁR'ËEØe´√Ç.:åE»[®VVí5KR÷d∫”åñΩÍù\Áº{ ‚Ó¶ñW-Òπµ^ŒhU›éØIák*€Å@ï‚2¿Æ—ãË≤ö&Ó6Jƒæ,||ïˇºè™»Ëöî,6¨£ã¸Jı°ΩÜÌq[‹AN≈ÀdZeÉ∏≤n6∑æîQ;–@∫®ZµJm…$º\Â›+ÿióËı`=•”hôÂfü‘,$†y¸º•60ŒEAl0Dı`]k©‡Ÿã∑_Æ( G:¥ÚDÙ`mSØ8—" Ÿû“'ÈUáiåÍ≠“{ıÏDîñÕŒ≈∞75ÍJt˝[zj7Eu≤z†|ëS†	À¯{Ñz˜lTa˝‰2á}$ËQJg≥ïGH†:§˛≈
Ï4J‡hﬂŒtäbj.õúÂÿ∂OåR~üÜ’"óÙŸlTáŒië^˙«Ó)3±rˆéu@&oˆ
™^§”2ÒñÕ\Äøµ¬·5«lQh∫≈ÇÜ˙5D‰èV~ãD÷,¢ªg˘?º√fÿsΩ1˝¶
gó¥Ü>,‰/ÄP•Â™&ôGBÜç∏[øÕg¿““RÔ⁄®„√Ã®Á˝H~5⁄4£
¬JTÕiƒyàÏaè@ã[∏Ê¶IY~,dÈèóÎ0«À¡1ëaxJ˘=ÑH˚ÆLwg(ÍÒΩY6¥˘Ä∂œ¡≤∂»¡EA äfCQÔu:¶¢Ì/∏€4ùIıÌ ≤cÓÂÉxàˇùﬁÜE§ £/îjÙàLI6r‚Ï"…sûg¿£ ≠©†(Ÿâ¶©å∞πû¶=aëDA_ªsÉ–-C¨}DŸ∑∑s¨‘éZjt˘‡mzÜ˙\Ì∏LK@	Pß#s≥‰ÖUL6åi≥Gò“ybñEÀèo˜bÖ9˚ñã“çΩı¢_Ù#ı’]1∫àU~π5S©‚µã∆ \e’ÑñÑÜDkBŸ≥ÿö–ù1‰·¶(sEµ‹¢–êI◊¯Ê´BÉß8†’ó≈Ò‚Å◊Æoh+,åÍ[.ÇF$,∑
~L`KØ‹% ûˆ#Ò◊¶}ÒÃîZéÍØ®l-…KPﬂxóÃ2$ú∑õ∂%∏Ÿ≠g Máy6©Ä5ËN˜ÿ„&∑Í‰ROabg÷º÷Õ•Äæÿ?ííqr@„X°êîl˜á±ƒC@îv £I2›+rÃÅmGƒŒó∑ <MòEAÄ›VoÂ—fYËÙâa7üúç≤A%2 C—≤s/º  J˚\ÑΩ^Ô¢i:†€ÄWlÑtÜÅ ëÀÓµÂ„7w[Ur<7îb≤Lç=÷Í ˘á§‡‘∫	ç˛≤°Àﬁ.p Ë+Í`˝‰05∑7h1çX∂q!	MDÉÎ›Cò·Ï¶%ÀOÚ§X~vÜGß`œ’Ûß#±Âd*<ÍC‡‹éÀ‰Y˘:øÑIﬂyYÓ%◊"®[’D+`†9ni!≈îï4…ù£LóG¿*Í∑fu‘™ËÑZ∑‚(æâ¬∫Tè1å« iC&;˙óG=dÒczk†Ú2∏—Qƒ≤Íù˝nèŒ.:ÃÀe%2å>Yv˘s\FG÷‚Í;ã-∞π—ñ…ë'C•Eä¸√d
Y£”]⁄ñ ]ΩHã2ò…ÍˆmöùLI§†~7¡òéTëÆ‹”ø™ï√‡»^nÛ•¿Ω/
∫Xns¨-•ù5q-©∑ïÖ¢Ω«B¨ÖîèÜäΩ„å≤P|ÑÁ•¿á*Ck}ΩøÆè”hë±úLµ`y¶≤≥3qñ\WÎÍ/7(˜0ú¬+ Säkçºÿ◊—Ev3÷ùY^d’µ`3˘Dx¥Ò–ê©Ú®H≤2ç–∞©ä≤n¿¥ ßGÃ“ÿúnv:i?!|∑∞ÈñN{xˇë_BôUôÕ@ôQ~e
lÿÜ h˝ø5¡”±òbB±	∑ÊQçÌ|z%~Aw:ùAÈÀN√™˙Ü_±¯W4„ñ ‡·î˚∫ó»#Øég”îí-ÑÀmòrÿº3n—ïGÅQ^$√ÉQ„¡‰Êwè¬ÈoÖyµÙT*‚}†s4%‘∆∂Y'˝hì ®Êq∏Ñ£ú2´&‘8Êaùtµ{¢-ôå§M±QQ¨Ô÷géZèEP0Ej˜•∏Åﬁf(å÷~ø 5≤mYZ˜ôû∑ôÃ2N>©Âßh¨+â÷Íª÷ÄLèÌÕO<Gw∂œ(L/,Œ#áyèËpYÕ∂Ï§TH}Åyµ"≠⁄1Î·∆üêÈö7è]Ú©?`±¯ëV5pLTŒÉÀƒ_p<®r]˚Sj´·°ß™]X,WN/dπVΩRÎTuà/B©rI5‚®vHº>˝^>	Å4Cs;Ê1O§…¢ƒl≤ÇcƒEŸÒ„lt§ÀãÑÎÎ›§$√T1ƒé≠!GÆj•{‡5QΩ¢§2Í·ÀÉwo?æ|∂ˇ‚•ŒCÍƒèXÀ‹ä¨qd~cÒ·;Ñ/ø[«äD .FRúÕ~+‹˜ÌY1Ùev&u‹#õ‡(∏®k¢ãÚbòí∫à!g£Ù3&0W\¯ÃÊ¬◊—iRäpxû"Q$f¿Ê“Jr˝¿8⁄P]L›.ƒÚ™äüfã∞Ñ«º Òçöî!ºzX"éìNtJäÕDè&ƒ:€ `Ÿ%OΩíß¢§°c<ˆl¯AöpFπZÿVÈÚ8ú=ë√›BÎ8£ï5î…[ÇÖtËºr‚‹ N_7z/⁄‡—ÛÂ®±.÷ÅQÎ±p·ÄxäˇI^Èåë.ŒëÀÕ)h√uﬁd¯a¯bé∫·VñƒmS|}iÑõ(¸Vy`U †UKH‚¥≤´S3_˛E~Ö|˘kÃb÷‡"ôúÉƒ⁄∫s#•5Ãu”,„Q"(“Qﬁ#l˛87âœc’çˆ<äáE>ùBa–1Ä©úì#ï$àrîWÌﬁâ·Cw—„z◊¸ñxïø√°roñöù•záGc<∫ ≠ˆmjFR*’t+F›J<rWÎèO±–]@I©‚˛åÕEZ–P‚˜mGwQ ›∏“-}€º;Áÿ¸HÔ]ÎD≤Ö$ç¶ÄÙSãüNÿKTìO‡= …%–ÈæblQ£◊tÇ<d_ô∑k€;±˙ÿŒ™€a
'XH±4¨`ì_1éAÑ‚¶ ãÏ¨“±:„π^„µÅ8Üï!?‰‰–ÎMà}“‚óc—ºÜO€eZ~ıs[ã˛Êâù˘—#ÌT—VTw´ÇΩAË˛˜≤∫Ä;Ü÷úôxı®∆&ˇUmÃ]ÈŒüJΩÍF–¥7x≠Lîmø◊á†Í-¯X&≈¸è2@∆O ÃÄﬁ|≥∂;∞≥j¨˙œ<KUz‰ï˚)TÓ'∂Ò¬˚CV⁄µ∏¢πÈßà•˝ì∞P& gÉZÑ?È⁄èº ?˚ï∂*ˇÏU&øµ˚$z@ÆÇ?8Ì†iÚeR´ccµ≤#€ôMÂòﬂ&g¡⁄%»L;IYÌL≤1	œÿcb?aq- ;Oãp^ÛyçÎfŸ=X«k˝◊Õyÿˇ»˜c2ß¡J^ A"5ë#uèiﬂQâπÆØèÀhîOŒªx	GI√/t§®wŸ-Z∞5åÆ)Qˆ˘$˚	ÿ∑F#PUÀj&ØS$∞OèhNˇÆ»Ô{N~ﬂªá%˙_
à "DY"WcÅÔÛYµ®‚£ IÖãz§e∏œÆW9PÂ-lÚMUIä⁄™!Œ˘iπ&“¬ﬁ.ÚëèÚ|*ííÚ eSÇ∆	≠@òÍ Ñ
X§í"wìb(&k™	¿r∫±©BÍÆ“ xªj~uãåœHåâΩ†ZõA|ëâ≈–Î"8∑e®2Ú¨∆û=¸v∂ö2ë‹
[+ªÍôuÛùiD◊	ù˝.4U” =Õg4Åª¥Jp‚˝L¿jm’nK·?95~
]÷G4q`OÏ 'ˆ<Õ«)»}§ºªmêÉ¬	“F≈.ôë©jiäVù6-4ª›dﬁh[˙≤˝≠ºáïÜ	#∏mô√œ‹ƒJπ9ú0πóü…	±Ò2≈òj≈÷∆…Á¯·Ép,’8Â’ç˛ô±|yQeÛ¨xë\◊9Ú∑˘¿!Ê	ﬁ1E%Ê*†7Tx*VÂñ‰†M;bÂj~ ñ0[ßHºIë·en…`ÄôÏïYAâ+ÒZßè˛œ˚ﬂM?∑ù˛	êb,∏<zıË˛wÓ@DA=*+¯å[ (É≈É/z‡Õ¨ ‡ññçt©ÇÆÅÏG0In¥∑v¶ÿ¡Ï„-ﬁòP5[èÌé=\ßÃÜ/àvÂ75[¨˚îì∏$ÃÀâπÆ„¡6Äa°´U§)|Ω√ªﬂuË∆⁄/:ÀÏ§Üj%õƒ±∑Ÿ±Z[ã<l ï”î∞¨k¬b3–ˇ9⁄¸.P	£¶èƒ6∂B¶S√√µ=ÙPâÆËòw+Tµ1”#˜h£$˜:ÔÇ R˙ºu¸dÀ!_F_O<R~∏2…M|5JBgD›H⁄e/DÎYå”«¶Åp^£zJˆÿµÒÁ§Ì˘v˝Ö4˝%T›L◊–uçæ0}ﬂ–˜óRx#ç◊¶+≤™Ç‡ùıê}fÂÌd‰à)Ì}kâä-{"¬Ü•‹hk@0◊á¸‚ üµZ*Ó| x!wâUÎ2âVÙ¸GZsØApOïE#ÌGÙõÜm…ª5ÉM{z∏ÍÎœN?˝&èë9∞&È∑ﬂ$âÏ	•29≈õJ”“:7”≥d6b¢≠(´∏l~˙•5”];Sú…{˙≥´
5#ˆ›‘”¸<	u9§=£Dö_ OW<bDx~Ei-“"nç±ó ¶ß≠Nò,:ËÏ\Zƒ≠icD3ÃŸ4Ò›Ù‡—$˙®È»ÇIí‘í@Ap¡~i7πÆî†Joö=µò≥ú›uØ	Rv¨†È\uöóáR7±KAX8ïÀC©üªÂa4ŒñYBò#3zo´°+¿@(õ2√¿§ÊÀR}ßË0¡ßgxÌ„dr˝$˙M>7ëû´xmåM=÷ë´®≤Ù£ΩÉ◊®‰ãGYπØluJ•∏e≈s´‡N” ¶8êLÆÖﬁB+DÃ
¨*€A∆∫Æﬁ| ?-‰'‰'DÎ∫FAUÍ/vï):Ω£¸Ì(=´‘K¸Óõ‹ø÷4èÂ<˚Æ|k9¿1O¢vº0CàL4ÑcEöEWwt6íˆ‘Ä±‘m<`u«QcrgQcj§G“õà4˜</éì)7—√C1‘Ù¡3üŸ(‚˙-∫‚“Jô-®CÍ¿?Ω_ Ëi⁄_ ‡âì^[‹∑ñlYˆè@ï}≥‘Ïzl\5ãåÃ_b`^¡∏<7=b˝¥œ>cöL”$_,£QKá9ú¶=Àúäy3ßàúe±?åeÅvMâücW‚r
»k∑ƒD’˙ô@L¨†Æ»+`1ÚÉÂ≤)8.~¥Ä£∆KŒì.†´{ëèÜ}:Rêùœ
î\π{Ö^°€IåœG$óÀN™“âÎ¬Z—€∞™)Ä°ã4πº∂œøØ@Àë«R$≤4ô,I*KëSÏ:4õÒØM∞&ß≤ˆ∏ ò+&∞â^U![¢uW/sÖ«Ω≤Ñæı≠¥-À·Ù4ø¨Ke£Ûo fäRpöM‰6∏ü8∑8Ñ/èÖÉG›jº[n≈#Ñ®˘$ﬁË≠ª5^Ê"æ∫∞*†ÏÊ6êïáXAò¬≠“Úb”',7Å2@´=}Ö“™Eâ˛ﬂDüM¬µ˙Õü<âﬂ[B©=!«rÕå?~y¸˙’^v˘lD¢»ì:
Pwy»ì´ijÎÉ›à∂,J∞Ω¡’¶ız√yM°í’Üñ&ªP¡'u…k^Úg^Úgª$ûx»íí2}ï-™⁄˙Áà¬$áhnö@s˘«#B.%†èº‚äÙ8«TŒd€§⁄Ù·PTMEÄäX…˜öï)91<±ÀD…Mª‰¶))~xƒ8ºÂ⁄_,)®æÜmââ¸•∏‹v©¬¶>[˛∏ıﬁ∆z'óÿƒq ˇ0ÁÎΩÔ∂Åügü”aºŸÊˆ¡ö3‹Œ«Ùë¯Ëüÿ: íqq€}X„1V`•‰“˛=œ«œ”tàâ⁄„8“˘ÀËË¢òM>E±hS∞J
¥€S´‚Ç¨ˆ¸øµŸIÍ∆ë¥E!	È˜öˆÊ	]∆€∞T¨C3M+ó”MªÍ¢ÕÙãX+Ó¥µÉ¿õj;N¡|3nV_≈º˙wŒ¢’ëóeX¥U±T®B/zÓú^eggº!
IbÌw–∂≈˘t≈'—∆C7i©ıÒ+d˘5N»(TV¢-…kfê6v<1GèìwWÔ{√W6Ω{Q,öÓ‚°Id∂ﬂŸº÷•Nƒ£nüé˙|”9&Ê¨ƒWr Ãœõq◊ΩR;é‡º'Œ÷Á0‹E‚}‹ú¬€‚`æ«aIr]ëTó#S1‹Âÿ¯rLº¡{“Ï##:ÆíÚﬂfŸ‡”q2uå^GV†»È¶Á^WÎ‚lÉÆâöJnk≠SÜ≤@sò:Îc^˙VI◊˛ ⁄”c’Ìÿõ„Ìê•‘‚«uh‰›M¢Il6(Únµ.≥”¬ú|≤B4ö≠xgªùa>ÉÕ\6tå÷&`”ãÎ2√‰ë:is^`"«I2ΩÌ¡”÷Ä´°>,m(|Á?/Ç@PQé£:B®ç∞ñß˚lõOõáº5—`≤GnCc}&,6mÆY!xt£"añ=~]&EÜBî2˘,√_e„ÃR‰®™∏p∂=Ùps3Âß‘xË	èæ‡–Â±g®¡¨r§C≥˛CﬁDêç»+H'xÏé∂Y õv5]Âª˘h6ûº∆Kª8‡CqÄn≥nŒõ"NΩ…%˜N7˙Œãr¨Ú*˝(]Cv·0ÍFﬂ{±|xææw)q∏;∫fFıÒ	oaÕçùúgÀΩçáΩÒF[˘öê NquP¯È;|4¸pv©ÿû∫éa§ïJ'‘ËÿΩÛtjﬂ.À‚¡ø¸¬€î.…´aó√ª|AB+∏ˆ{UxÌà7≠[jÈ˙ï0{¨å/^6 }≈ò˚‚Ìıé√áÇG´;‹X©z?œEOõ¬≥aV·‚Ò‚⁄\X »∆$ËÈ(ô|:¬søéSÛÙ’ŒõçéwvüEØﬁºàﬂ>;:äéﬂÓøxÒÏm¥sÏø9éûGªoéwvèç˝SåE6;√°⁄
¨‘i*xsKls®°ÔPf!jâ·È[‹MÊ±=À=ÜEÈËdÂf§“	¬È$\&≈!/Û]TÃªJáSÑ¬≠ÇÀ˘¿™M˘
3ECÌ9rc•»"˚Ú‡πÃ‰çX'ü`yVQÇ*Ã'uj.©DzgL≥áqòq+ìÇÖÈ∆«	¡ôªá…≤‘EdbÆ6òØ≥å"õß+pb.81ıÿ£I7U¯*3<L◊F=O¢≥"°Ï‚ÙÚÚ»„∂9_≈ÿüîiQ=óY∞õO”Í
èK»LW;2Ñ∫ˆT˝¿)^–èÓ”¡ßª—o—]µÜÔBMÒ4≤'≤ Í¥ã≤úfG†?©Ï±¨#Wƒ6^Eâ|ÏTdu·º-x.≤C§√yæ´˜#´∞N|¿ÀÔ™á™äzÒ4ÂQ~.í	»ÊÕ[}Cäπñ®%•ÃxhüÁ±ÁJÉŸ√∑æj-˚GJüW∑E∑⁄⁄˛eNﬂä|É[—	ˇxÁÜÆËû‰Wq{˛Q)ˆ0Ÿ˘ò¿Jò˜ø®≥S±:‚ÕNÙß∂∫êAmoªEä˝≤Rz»€∆SÃÜ'Æ1·öŒLh=•é≤…tVŸ]UY5EÊénÃw©áb“¨ ¸~‘jô|*òÛÆÚÚ≥ Èı%jCâ‘vX6£0õë(ó,4ró¨~£≤j»¯>ıÿ‰P©≥‘sMZN˘¨‹ü˘9Ó#Œ+4Ú»∂5}=8X…e:zJŒ˚~¥n?ﬁ9´0áÜ~*|¸Ogggiq8+¶yâæ8MƒPM[X”-¯cëLªqß∆{A˜†õŒLÚ Ó›E:öûÕFØ≤…'˚˘ı4-0Å≤Ü◊/”Ñµ∂ıEFñƒÖFòê·y!23 ÓÔ"ÓÔ˙E~L”O£kÃm–èT⁄Qˇ˝>û‚2ı£›>>B^íO®™ÿ`M¯ê‡íÄ\¡â¶(täò"∆±)1Örö √F∆h_&qy%πòcF39k9g√œ;—/ŒrØ∏Y<ë∞3û≈ìjªâW8,d#ÉTîª√«[åÿ≤Gúp xÚ>‘‡ôÅ0‡Ù|B<^ú”dy ~ÿÄÈ˜kí∞ë˘¡∑«j√V˛oŸÜÖù˜πÉ(≥l
"NcqÀZ&≤À®Œ øl=™ÑQX™ÚπL¬M©mo[ÿÖ˝C‚pˆÑj˜oû@z £+ùòôÇ5}jÿÈ$?TÇõ'ÇŸ~tÔÇπº√Ÿu¨Qù€Kgz"´î”Ÿ^ô£0dë¢AîGv∫Z3ÂÿY|ú∫ãÂ7Ô…âX∞∞ÌÕK-`ô3dG$°º/ÿf{¡U-_?ı_ütXN6nC †üE–µ
∑ƒ±ø]“ïê≥*?À∞2`∫Kÿ9ÕZ]OEV‰®ﬁÖÏ*[´ò·õ1ÆÿÖéh*ˇå.Ñ.ç••M∫	ü^ÉÆJô¿ª8ú.Ó“Œﬁ"yΩä˚¯SV I°¢∏£2O˝0Ÿ∞Ë%ˆ=ˆÂ∏¨Æm°+«~ãôå‹„;µ—¢µngÓ∏Â~#˜≤"–çœF’A-ãrt∞+QäÈ∂$ñßámQvéxcÅS›¸J˛Ö’∏~Iˇú⁄„<ÃK¶ñSXè…–|cSg«˘‡õ-∫¶—¶Ë⁄ë÷“õΩ3»’√Ì€ˆ»˜ó\fÁIï=aUÙ≈˜ó}◊≤"6-6ƒ
¨iΩ–ÈÚ∂mv(xù6MÆn£ﬂÆõRÑk&-dj7^˜%LË+–ÌZÀŸ»7⁄’åÂ˘+Ì„Ëåˇg¸◊I<¢œo,c˝.ù “ÃSo÷—ÑQkﬁv"˚ó?®¿#ö^\‰$·2wâ˙|p&¢kL¶6*Û ∂÷¿/µàTõÁÿR¿N™:¡ˆø™h¨ﬂÊ~s]ÿb‡À∏ƒ≥SûÊ9jòi∏i¯ÇLM"≠}-Éµo?g!-&û•ærÔ≥UÌ⁄Zf’Æm;¿˛·BÑú£˜ÈÕ¡±:H}ùùÀD<Â˙¡D{ ˇSé≈I5∫VaÁH,œù˜ú¥>mÉíz~h{MuP™O¢çM§zÛZ<ÙèdöI€•ﬁY√ä]Áï¡ƒ˛ë¬B˜âà™ß‡{¢Lu`˚∂—2˙∂ãÛÔw+®›€ÌˆÄ˜ËÉXV€€Å]¢Ôv7ºΩ†ˇ≈∑{Í4yÑÁ#∂†n≥@≠çb˜PıÂ;êü!˚Àv∞ˆ∞Ê≠¶y≥i‹nÍ7úàÁ§]v”Y∞Ì¯y≠¬€â‡LÅx®ﬂWÚ_JPvÉ§uS∏I™7•ñïÍÎÊC≤ß°>›¢ÂJtn- Euı´®ô◊≥ã±EËô2wIWÅãŒF9à„w^@¡≤?ø_®Œ2iæÏ<P√H@øO\¢≠>Ë¬1[â[aaq≥\úœ1ßÚdt,Íq÷≈˝œñ"ﬂ$ıàıfÌu*Ò(P÷PsE(¿ñ`V“8d∫.ºˇGØ.ÑB◊ãQ~öåÑy„yfπ∏∫H'Rﬁ"˚^&œ;¶$v™†ås∫a£!oü’Å‡-X˘Dta•Ï%µ®\ê∆ƒov•&N øìÇkq◊æ<3Iæjìí‘QLºıâIñÄIó P‚M˚WfÒÊÛ´≤ù8H^!âãÀ∆¨ ÀÊ˘êµrÜ=+f		#dÈ‹¨h*ƒÑõê«)∑ ®ºRl•ã Q∑àüçßU&ÚHÀS. ’–e–∞±cy£πyÄWßt®⁄ˆã–ŸJ[|Q’U¡Å˙ﬁ›“MpÙ›™@˛≠ª!HòucH∑EY—(ë¿æDóµ≥ùQcQ‹Ïdé‘™„:º"¢3®Øac_:SW"j_Z›m!Vü‘5!j`Ejn€ç0á=˛D∑ôqPÀÖ˙}ò»`Ó∂ıëéß£Dﬁ˘Ë—Ÿçèkz.zi∑,Ø´$t®+8—È,Õ∫c&≠º|‚ﬂuë@/ì—˛Ø±§z(∆Ëπp"y≤e˚ÏàævA™zˆy0öE:6U¡∏ˆÈmâ˛˚Ì^6°í•%vŸá£nª#WiË6‡Áçı©ú%l‚£3äâFW«π¸œôÂDàÿ}âËù6ﬁ9˛Ê`TNp:Ω∞¸†∑Wıà=∆à›K—• K"eoΩÍÛÈ±Ô∞áºP„ıa/DÇ,¢e∑qi*∆Ó	Ë≥Hc´?Ú˙U˜*Ã9n&üõk9;≠DP«5õ]Ç”£zFÓ˚íàu(ÕVi› $fÍj~T$A7B{§a◊s'ÄΩú∑-CÂ¨Ax‰ŸWûsÑZ—l∂É·–>®M≤Øy«≠å 	q¨Â8∫‰¡ﬂÇ•ˇÉÙEL]º˙É´ˇ¡’ˇ‡ÍpuªˇÇ7|)[µ9_Oº˚Ôl^rµY˜G˛Hä„DﬂŸâs3∑m∆ºz¨{ Íû˙uÈ<ãƒªz™o∑Ö']¯≠
)E6ëë}€€—?¸ÄÙ ºıËë∆ r˚◊)ØŸ¿œ‘Q@ ÅΩÎqhÁ“”ˇ≠ï’ëöŸ¸∫˘¸∫]rNWü’UÊµÙ˙õßWUÿªû$cqm∫…Ã†atî>lø≤q*,µŒı†ù¿)I’˚o◊˘ƒÿ™õGºú]ª[ãeŸWf9<7 ~ºÔÅ≈Z?ÀK~·∞ñ¬t≥ òöh«Ü£OP~Íq!-·$Ï®Mx∏$îahÆ} ∆lø>ÿ‚≥f‹båø˝F˜ûÜƒíGØß)&˚Áƒ˘{”B+K&r¨#≈‡äµÄÂkÑlπaÍ¨◊éˇ™˘8¥óï}ài)⁄´√µ{QnMüBÀZﬂ¸∑Y:[H°s\öı3“zÆasÈJ6ÒAÛ][JÇÎ∆:êéU”3E(/©RfÀŸ®
®m¡…P
ifã∆mÜC)>´®™S:¿ÉË»†©:øLíØ$ZmõÈ÷+·¯çB#7ùWIì®Ωµ˚‘ã´Ìv"‚H"K»±∂òM2µºÓ%iÅGÄû&"¬„Ú˚*ıß#õó‚‹ì´7‡G Ù÷èZ¢Åñ]BK#»Å„VtÃå∏äƒ[à9y¶ƒÒ(éè∫ÕblK(®∆∫Ò&„◊‡–â8sGµ€tªÌÎ#™ˆﬂ®y¢gíı9<Ç†≈K´ê9aGÖ‘Og"‰ôBºMÀ—ö˘)@$KπÌÖä)K∑Ùûõcã'/Ω◊¨ôÜÖ£ÒÍ≠æv*[˘r:∏:©ŸT›´±{+ˇ¢"Ú≤âg¸õ∑–Ê£ ∏ΩY!Å’\Œ&Ë»æïÌ—Ò6öôo«⁄,∂F∞∏ö4îò^WÛ´YÕÎjÕû∫{˜+≥ß’`˝√˛F
9Ç∏æLé¨èéë˘Fû£∏Éô«èÆ≤jp—p˚Ø@"˚Ë¬∫N\E∂;ÇU√X—éeBÓ	Xƒ≠∏ıˇ}#ŒË‡y∞⁄368HΩ~Z‰We*ö«ì¶¶Ñê©êXënŒq—;Sa!2¢P—πúN+ñ(˙>+ÒÆq-’æ˜¯ÉSè0Kçó¯˘˝ER˛À¨¨∞R:¥AΩæjWãÙ®>µQ´°°ã"«´ukP/°;π„3ı®%ìkW·‘oCá'ƒºàSƒÜe{äsbn˝ês\Ã˛`Jç^r€ÇI€à˘›£h‰≥ìƒ-Ì.hµù0≥‡lÒ¨µs¿qg¢9¬¯´≤x≥≈ÿ√˜⁄°õJy«˘!‡·)ã[}WÚÀaÌsq2í;àiÜ/P•bZ∑Ø¶î¬iæJ≤
ÌM{Ä†9÷BY∂ó~Œ ™å€!`x*Q†
cÃM¨”t}Y%4Ë“Ÿêπ,ÃæJ Íuée5¢∑{#Ò0;ÀÑçb›!Üß¶¶l1PãU√Ûƒì—µ∏âÜç8MJyöñkîP~õû≥ô§W	;ê‹xU…Dtêä{Ω… Ω”7TgãıÏâ5D´7"éXV
]`ãvæÛ∏u§WØ∏Oè:SóÈf^:≠Ü“Øß
”Uy \)⁄µ$≠OÕ)V∂:ˇJÍò√≤ÆúFe¬û2ÊÌ:eº.lYΩ¥◊$tÖÇ¸˜ë`}º‹X\¸À—¡õûHÅêù]€=XtlŸ>`j≠.úxúqÎ˛AiÕô"≤≥"5‡¨ w/j‡UÜ˝71+õ£Öè⁄.fu‘ôN¥πæÓÕ∆hª?gÈÜπ[õç@Íì∏’Z$Ú\ ÍB√!ëÇ„Ä∂í]ÀbÆ0$ã–|ŸFÏÍL∆–…´YûP™k%Ïçva_Ñàj;ø©·*…Q˝Ó∏›ïx°r°‰≈NÛ-!§Yi”ˇæ0¨Ö4÷òáA¬◊-bÏŒ≥AÖWiôâõ∏.ÈôHDC'Ë˛–B”6z`í¢†#	G”4\ãk¨ŒπBë≤ÅŒ≤—PW«äV-yßú◊Âö3≤˘¸¸|î.ÍÄ ®ë|¢lx7l
§qAﬁÕM+I;˚i—…‡›í⁄”Ë‚≥.!SÕ˚Á:˚íù±XJm]1…˛5ˇyù7!Hü´„úz/Oö¯Ù¶T
°ÎáD¶√»† Ã«sdwÎùzm¡·ªí–À'i HÒ™kA“ﬁıÄ⁄ÖŸÆ§ˇ~ã⁄â+f¨˚\Øªª€îv&√ùÈttMºÙÙq2aZœ@<8¶ƒ{*K.⁄É”_Ño¡’ÑXe/Sø{P’ê√"«7 û˙±TnA˘ˆö{+û}∆É:@TìÏØ≥îÃ+…Éπl˛≠À‰Xt√PÂ∫˘(≠bçBÈ%’k7?íàôµ~,gã¯–*ËÄ±&ß êÅP÷¶*“hjΩQHÚÎÎLmÌà˝Py˙:≠∂v„∞ó¶ÅÅÇiï,zîÒ3§s¥—n+›S°0ªqt2kA™Uß≥¡∏µñL≥5⁄T∫rÍAÆ3ß’E>ƒ¸pG«Ãöwë&√¥ 6~µ|í.ö[h;úb1⁄ö◊~)ÛIã_—söØ˚ÆÀgËí6ﬁYß…—äASIb06N“∑£ff®Ï€ƒÀënùx%çq¥vâ∆ªT?b»VUYî"-"Ö‹^n±Ã
Ñ+bíœÑ\-6t:°≤⁄øw˜#‚XΩ€Ö‹ô√c#jﬁt[àZ˚∫ii:ñŸßDFhzB'I<ú¯â∏§[ór7ìKeÈËS†*Õ#º4
√(+ÃË(Ìˆœﬁ§È0óÂ¡¨ÿ˜Â9–œ≤QÌe˘…Õ‘µ⁄fz“3-Ö'I´≥<ÎéÜ.vkÅô€ã$|A´Bƒg/5ã¥{Ò÷òPEª;ÛÖ˝7tgºlo∆Vg∆·æÿï,/»™ïïŸ⁄≥†.3fÂ2®∑zø‘ÿ∞öÍ´ıMôÎ˙¶ﬁ/’7¨¶˙j}S>à∫æ©˜µ}ì<¬t«‘»_ÂWi±õîîÖ68ˇ‰êÓ?ÃÇä≤Ö¸= Ø¯O) ∞' R∑¸ŸË2„ã¶n„Ûï0≈˜ä:lÖv¸∆Ÿ¥Å6ÄiZ8ZhX¬¢—Rv÷∫a“À•∆'¡Ñ*6ıG
1Rÿ^ÂÊõ§∑mfj¥O=ö}ÑµæËBÿíiF¥1S‡†»¶U|Ç26⁄[òˆâ]œ6J5jµ⁄ùËÅ2B—0l1–),º»sTú_`B‹ƒµ—à"çz—!]T@¢4»F3∫Æª(DCKåÕãüT∫π˘…˝∏-Ø¶KP§7…"9ﬁﬁ›|6R‹l∆–Üo‡Ì§≈ej§öπÿÎGF˙Íñı.hTV6•ˆ0mVeMŸƒô^œ¿ ∏ÀœÒ˙À≥ìÎ¬†”Å —ÊSæ Ú}M1ïì∏uµ0•'áäXÖÅíëµVAîH‘£r4⁄@v™§˙(\H${Oèü√|"EíAÅø≈åÛV	JˇiıÆ“Ì⁄÷ªVÀÚR	„¬[ÜPÏ•-]0«=ø∆i:ÖÆ“”OYÂe:Ôùu…B!¢ä5mYIÎaí»Âl:Õ)Õ,F˙\¿ÎS≤˝ΩËÁ|Üi—¢T$¨@\,Á—uﬂJŒZÉNÀ"ŒDˆîÎÙlÜÀ‘k‰xÕeÏé¶i1Œ í:ˇ?√Î≤»†—Xë{áNZ2`ôåñî€}/ΩÑÆñî‹˝ÄØÒa≥36¢4k'–ÇﬂD…lòÂNFB√“«ò§å€,t[x~ƒ:e,Y.Sƒ…3èO™ z∑›õ$J
ìW;#g“!Ñêa¸bá”{∞LUaõ#‘ëÿÎ‡Ñ	N/z6°tr0´Q"t>ë8çNSËWœ6G-IJ.9˘|gÓ€rî™ ™±≤U3í’{ì	‹±‡ÛR§8g„∑§Æñé:¡é`”Ü◊w”I˜›—]-6"ÿ_ôê◊1:<’¡ÕB≥ﬂ72˙Æ`ˆ]d◊‘ìWÉm`à)	Öªu‚3OIÏõC≤k^Fbn	]”W«ﬁPc=—8πB¡„«÷cï°ÊQtÔ^÷ˆlV—˜Ÿ–4üc\—’Ì’=ªq¨äIkÃûd	•ÆºF≠{∏X&õá*À«°€`3^8ÖÜ∑VÚr¢∞WÕ∞Õz“¯ZrCÖrª"7‹Ç(Iñ≥…ßI~5iŸÀJWjeW,çÂ9© ≈y:ÉM&óÆ¥aZ—âÑ^t¸¨îãØ%ƒJ™<∫Œg€8-¶ Æ≥:á*ö8x¿ªÜóNS9üD∏-ÇD7˚m-÷KîØ—hÀ}€-Eí;2∞ÙΩs^≠acâNúH—	ıFºZVm~`[û∏ÏK]LXÄlu≠^D^zS¨•ı†kAõÃ¯i<8¡ek”øUv˛;®µ◊zå,Pù»◊üñ›>º§Î∂dm£ãv\ùeKÎF5j©5€ºh»ôÍmÆå¶ãîWN˜v(eø
ògI6B⁄óäıöˇ≈≤ßeHØ#N-E5FÅ≈{OQ•ã•7 Méq\¬4ÖQ˙}+Ó∆Xk¢É nÒ‡7.’
rQó¶∏]h´Æ˛köN√@∫£jîÍì‚_§)G‰Ÿ√;‹Ëb'°‰†Î§!j8‹Q+d∆Î£¶íEµ˝∫è}˝>1!‚}y5ñÚ¬á©M=Ü˛‹Bæ]…ƒÔ/d…
3k’öV]!˙©¡=˛&li•àÕ£P»°‘•cŸ‰©ñ¡ØÃ≠ÑzxG∆ùñÂÍ ≤£ÑèÍzº˝=ƒ)¨J6ﬁHÖMsfg^]-Ùº.'&ÎÖ£cNı=ÿÖœ/–uôäÌÅÿ(^YÉ!x
YÄÊÜícÔˆâP>à.”¢Lúùá∞v,sWPåsSoMZïF%sßŸvsEÈÍ∆ZÔ7>∞z˝∆zla,Érw)Ï√naU±∏W´ªòÑMŸx(›óˆ]ì	'X‘ÎòS™›vzcÂö	'ôYLõÃöEvS^ë/jY7Î≈c5€`oÍ7ŒˆÍèk,≥©@çêÑä9ëGwM
fFï~∆Xo±û5A3;Ÿ≥`Cq7-Ë‹ûK…Áﬁ<P3êÅ#r&Â¨H•xQ§x™Ñ_›SL÷\"æ©ãQyQ‡}~çº’„ÿO¸≈,S–¢4~cùMbMΩÆπÕ-åY∞6bêÒ‘ìàƒ–‹í4H˙°]2∞QWLi¯¥K·E¨ì°X©:x⁄¥Ÿà.SlsSúF™?\\]Îvi˙áÂµq™0è⁄QÜVáb˙∂Ãç¸DØ∑Ó:^{f2ñíæº¶?0CΩ-}21˚⁄K∆∫è6K>ñΩ	˛‹9Á„sƒã≠áŒØÚ0ëﬂ7Ω`eI,(®ØökΩõ–˜aÀÆ9Æ©Ëûa¬ñ∑ünl‚Ìß.öT≤[‘©å¸éÿºùó≤˙É∆öéÜ¸û√=⁄%%e∆ÛæÅ6åS±hº‚è,Ëòf®	¥#£≈é¢†H˛´|–^uÑ¡;¢€fE≤˝9¡´úmC »Äî!.‹æ‚»¶∆≠4hî≠5‡ä√QTp4∫Í¡®*6í¡E˙Ø)F{»ì√˚î&çñÅ¯2¶øäÒªã:|∆Ü?Yˇ¨´çÈÚ6`˛»é—Ω	,Iˆ‡É˚J$m~£ SÔ‚ :"ß–
+±í˘'ñπ!ù9Kœ0ª»EJ˚;fá8/íÈ ì⁄$¢gcÜ&èÍ"˜G&ï8†Ûñ¬ÕàÕ˜ou£cyC≤¬Uûâ´≈ŸÍñƒ>ﬂ3w3L∂n›π	ì‹I7⁄µ-[¨∑NÊ¡£!®~h.K∂ÁFUr	Íº2∑"€àunΩEÙomÙ¢√ô∏T>üb¿]RNa€˝”ÍtGw¢£A∑Â•»œëvH¬£π"ÆÉ]ÄÊ2ó∞'ìË4≈πE;)∆å`¸ÌË∫ÌÂt∞ﬂ”lB◊µèç0£'≈µ<X%°"·–∑‡¿{∑6{—˛Î√É∑«;oé˚x”V"ÿ(˙öW]/gU•4Cèq¬»E?°Ìº˘Ÿ451gr((ùôn›Í»ûÈ]ÙhÎÖLp”!¡DG∑ÄŸJ*^®EŸ+≤q6J
›Vª‡≠GD∏∫ÿxëéÆoﬂ∫ﬂãjÈË2Õ“R∏À”Òî≤/µg Ó
≠ísòcXV]Qáp(∂G®wsº¸ÍŸ‹}_j™ßBG«;oè?ÔøˆKÍ=ç˙B•˜ﬁΩ›9ﬁ?x√ÀZîN•v^Ω⁄yz EﬁÒ¢z¡Ráo˜ﬁÓˇÃh¸bÅWª≤±@∆EJ±4Bá@H·5b∞ª#9¢≈íLæ•ƒ£;}âıe™Œï=aÔ#
⁄FœÄMÜ£kïÙ®C‹EÚüﬁ≠áΩË≠Õ:xÛÍg™V$WåYaCHI…√ìäOîB0™äå<h+≠≤™ H∏Hdd÷L&"ﬁ∫w"y&èP?'ëõÖ¶á”ø0,=î.Ÿuü≥mp/ˇÙ†Ûì∏@i≤êÒÿ¸Tªóo‡≥∆X¥m¡æ€êm‘K"⁄Îı9è_7€R?“ê•4a‘‘∂£P´ﬁì>¶Ùø∂—˝9ƒ—≤téW †A6Ë
Xã∑ëá¢î$PÁÂÿoì˙∆%ûâ1+U©N‰5l≤?ÍÛiµ…E^¿¸t6˙$ˆkÍ¯p–‹«éîáyéÚ&B•>ÿÓsÃz¢Ãq÷u“eî’=¢Ç"ã∑r˛0AA{.a©ÎºèVZ6âjL^(ÉÒQ^ñOERCàçRUO‹πéx—CJMw^‰≥ÈæI#˙n25?E˝Ü¡b	‡ËQ€∆«æ±p`2Ô‘PÈ–@uºŒ•u t a—!ÑKqªª;óz=&Ÿ?¢≠OQô¡À“hPö•üçê#ìDN-Ô´ßPó&a≤È∂ŒA∏}
_Ùﬁî›¸[L5ü„–Ú6_≤’òl82ˆ;)≈8y!y˜¸?¸`¯îkˆ´πs~AÏ/Ã.Ó∑	FpôR›B¢=wˆÚ˛íå±…5≠öÉÆ"U5™≤`&±õKRBùS‹ûœ/>3ñw©L&Ç I.Äˆå'¸{{k+“˙áƒ©Îb…ùiWë>∏[E!Ï‘´èÚ6´Q∫∑ƒ≥5T·3?K:óm0Ç}rBú∫≥÷#È¡Ÿ˚ù¯/UÕ∑WêøÑñ\Dz©ÔE¸=;Óp˛.=Å]◊É/Y›ÅÙ+ÿé0^}	Ô_Êï¢t—:∂
ˇ] {†B‰◊4RDG6¶à\åŸëyô\oj '5j-h°Fv(ØÌ€R9q»Ø£Zs3fep)2i√b0›´ãªxam–3ïá/|dﬂbÁÉS7«í¡s˝{¥ñj?„pÁ≈T‹ˇ†X“«dxë>ﬁπ¡^˜&˘U‹V&ßUx¢ÀóÇ≤¶f∆≤Õ!™é˙`lt≠cByÉËŒº€˜Ù÷%@¥≥:ê‹()Ï∆k}›2õûGºÎGŸôMI ]a&!î√P «‰‹ëöXœ©âø„’ÓmaÁπQôXZ–Ÿsç˘≠-+”rQ}2C6»∂}åyQÍ¬∫ö&U†Í˙∂ïÔäowF#^…ﬁ=W™*7Ÿæ†{ÔÕõ iU4r¨Ω;√˘ãz—
àâ5˚õw	Û`
Î≈⁄lb´*Üd`¬¶†;®ÎJ–>TënHLΩwöçÆÖ@OË∞à«ΩÛD·D]õwôTVb"Ä√*\nòDTsµ	l|Á$˙m‘ÄYD2ãÄÔ{d‰4 	£à1+◊ âm7“…ùá)à‘†VoøRk®ó+v8ë˙bE›∆Øå’‰é∑©¥ì›⁄ëïÅJ7z—ãÑLd®s
=R±4€¶ ∏´»LP£cb!©‚*_Ë∑∏˛∞mˆk’Ç≥·+ñòå“¢ä[or9ÿE
5˙®†·„»ryN
&&-pæi	#çe†A=„ñâ…µâ°2∂öQu≠ñ:Ÿ¯≥] xI˚”¢$C∏o≥w.g±qL5∑›ƒ˙Ãâ*v≥;Àk"f«p∏©	1µºæ2ºX≠IôÉ;d°˙ëJ˝_ˆ
ì•.Ú¸Ú+*xpÎ.0\<[T´d72Ö¶|êúÅèHõñJK®Ú¿æßãò03LÈªœK„.W›GAì	ÑÎÒ)c◊*97æâπÀ(-6J¯.3˙eLWwu0|ΩDë9˙∫–Õñù]´√1(ù]¶¢/a_u∏^≠aÌõr@Ißâ+ñuÈÎ¨º6¢ò=ƒ˙˚Pƒ%w¶gq’fHø{∂™0Ó`„O‰dUŸäb’Á2∫ë	ñÌ6Îö™¸À˜E™¶«Zª…≈EµVÙcëBü¢	9˛m•skÌ˚¢Æ«x§◊≠6MP“Ñ®ÛI®LV‹FÑíÑôD<{| ;˜Åê7˘ª˘ô  ‚C“Ÿ˚Bt∑T«”J'ëT6ìU{o∫0≠Ç5˚"wä& 'ÍÒ∂◊áﬁERZ`‹” ^Öd8¥+`H•«¬µÇÃPlõëΩê‘ ∂§È¢û¶m(ŒΩcK‹·≈3B8°+ÓÒb≤hã¸_¢`GóÎàbY JÜÇ«iZVá+P_¥Âê°¶uπt%eú{IèXÊsEc®ı¸s;êIéÏQ 
@a7@·cr*À0[ÏÄ0ê/<ñ@˝Ñ! ¶"ı“nág ôáfór#,É:4ë¥ŸÊ˜9õ:¥}æpo÷Çd<ÖMÑ.≠9äS%ÿ{ËSq[|5t;Ñ‚≠!-öÈÁ|A:w-k˙VgÊ”jóëÚj<8”ÎNªgŸtÒæhÜœsLﬂÕ≤È√€[óe÷x£∂?Ñ˝`‘üˆy· ÍÏ-â`p1ÿÛ‹˚fo–ãéÄ≠ö=ùˆqì¸Ù∫Øä¬gßßÉ°"q1cøÑ?î±&—kbnÚ«´¸J~{ci3(O)hE*!ò#7ÂÁŸÄÚ‘à…Q81»S›R§#:±g4õ3`†Ïn/:êa∫ÂO€◊]Dj‰‰ÂÆ™¥L´óS≤RIO3>Uøﬁ S≤k ’ÿ:®¨a6≤Ç~‡ª±)äßõî%Fñk
Õï6@<	‘Å*3•f8«‘•ÖıqˇCs™‚l\4E2}'¥ ◊…‘SœnîEOHXB∏∫QGKÌ…T{"í,üM¸›´∑MªäÒo±ÊuˇôáJ?ºwO#∫Ì#Ôª0Û)!á&ìBnh}RLx
ıöÀ∆ﬂ‘ÕÔå—”Œñ∞HÁÜµ∏ê´ÒÕ◊≠ñÉÄq^$≈pê’ä&ƒ'qF¶¡°∞DÉ§P¯èuÁÌ7Û˘7›"∫“fØHŒèÛ§‘©b[⁄ÙÜg6F#›UeÚê6)	ã≤Ë‹6Ï—(+)ƒtú˝äqëHMªNG†vïÌCiHIK.TπÆ(í$1Ω#Ë–Ô€·+¢_H&îy∞‹‰æ…¨∫pœ≥"•"-6-#Ka/£ë‘“Á°Å5√¢rå°£J˛íú„˝eˇ$:Âgú£Ω¶º]gµ£©¿ìÒ;ôåsr˝ø†+íjVæ.œ„÷>ù“∆†¡Ë`˙™†‚ñûw7îπÃ_BÖL$Q√⁄áÚÖq™¢®Úi
ÍBUMÀ˛⁄⁄’’UÔú™&SÃπíè◊[k–¡t2Läe¨([ﬂVÀŸvú|Ø»¢˜'x9Ãa>ùMc¨€—Ì9u∞(˜Ü˙˛ÿ{Ê˝Û"óâtd⁄XRïJÈ»áÆ±›ô éÒﬂ˘®®ŒàSπcäÀ2Ü’ÜØª¿›?")L)Ê"n!ç8y˚ˆK"((ljníüñéÿ*éÑˆ)BbeñΩ]9ò.Æâ∞Ê,jñ.”Ç._iﬂÊ›hf9Y÷À¸&èä"¬Qt\VLëqWI‰'3ál˜&â†0LhÏNët∫2õÅJ&‚ï•(Û…∞{z›≈£¸
wsRè¯ÿóHFRÓª†™4\›Cd)¢a+£àùájŒ(î›VÚ&Oø¿zLœ›˚Iº^ùò(W 8¡|jI î$V~â¢`ŸIörK÷§:4LoqíC‰Ïæú(Õ’ÓÆ¥á'Gê*ˇ∑d˜≤ˇ%Y¥¬ÔÍlZ°Â£hÌ#’¬KöV´Ω£–ÃBN.´¨ƒ¨Å: ûÄ† 8»¯ﬂöüÊ·˜ÂÈö˚-√◊˝ﬁÖxª,Ù∑„Ì>âﬁŒ÷m8⁄pøTï‹’Áã≥ŸÀâbp”4÷ÓÚ∏À˘bmúÆI<·	úmtoÁìÁdÿ¬Dñe3åvÜCårÅüîGÈÈe'—èÛ‚<ô»¥JÂâ«4C7P@O˘ÖÏ≤EP∂~UW∆>Eù≥ÄÈc»öü„°eé©ªìAﬁì ^ïD0¥¨ox˘"BíùW	0π"≈å3M\“™€∏≤4ëî©H—ñ~û¬Ê>d;w˘üÃÃ∞p#u2≤’r+∂Bh\ˆâÀƒ¡MbÎdnÕÆ8Î‘|GÖ:—¨	Mx/ìD˜Ù©VEÍg:4=‹ôNÂr‚0(dLâÒA}˙A§ÎÉ”_dE ◊Zn˜ﬁØìÒ¯ÜôÖd∂B\ ¨ºΩ ∂ejÅ‘¥óã©ﬂvOˆIBµkõ•Ö∆öÂO5:5çNõµÎ÷6	ãò5h-ÈÜZ»Xµ§qlMF™åÆ}P?üÉÉ{Ú0c‹ZCQ·cÀäv‰%ï≠_™‰\¡ØV§"híB“FO?¬®á√¨Ñæ\´«≠w2Y•Êóå≥—µÃ<£jVy¢áæ&≤û8yÍ£Ïk¢®+∆Á¨/ÁS$$ˆä yÍ´˘Î…£öÈœ
∂zÉôï1˙ç*¯ê(¿@6I€`¿»g|ZV™∂*ÆiÛåqZúS<Fw9ï4≥p¯É6ÀÁ¡§Ú˛ïﬂD¥√2Lç±÷ÿ¢&⁄.$L˚†d¨íä®ﬁŸª…'Và~Dﬁ[≈»tÕ ê%W∂∏"\NBRœî@?íõe öèåH¸êwL∂r„Èg
ü¸¢+4Â 9äÌêãjÜXñ–P∏Ç9ÆWöUÄ•ØI`gc±I#VÆ(ñíÿ˜{ §Æ∏ÿ,ôññd⁄(òvTø˘‹ÓG†¬é≥2}|„cUK∞^Òã?ˆô∞¨>L•r[∂`≠/ÓfÚ≠Æ"æΩÑƒã*|ÿÛæp›»—lã_áﬂFñΩÎ/-è˜)›©ÍÃâ%)Üà«ﬂ9
∂£÷·ŒÒÓKÃí!≈ãj¨sﬂ—Äú±Y?zØ2_ÚlWTà”èÍv<U–<ÛxÑH8g}Wtà—ò’ß˙LªµŸË'7=i∫ NTé5Å∏•‹à<¶€T$ö‡9höÙ hNA¿"˚l=`I@–â›a{ì6»bkˆjÔ}C8Â˙a∂ËÀƒör^Ä5√®p=Pê∑ü’Aì—r∫°°œ≈Ÿ ‘ﬁ’òB·AeÅê;TΩ¬9PôŒÛB¶˝q4$Lÿ¿Œ∞πZö‹œÙ5ÅQÏ©eÛ∂‹>Dz◊"}o°öÊH‰6+Á`Ç"∂‡ÒV1|d;ﬂvÜ)ÜßÆ≤ÒÑ6ˇpÒí∂¬$€Dwl¶ª*…eÌ={ıÏ¯Y(%…J%D˝Ó¥•0/Ü/ìaØDgˆ¨2˘.b”˙É7oÀêáWΩl˜f*9a‡µ√S	*Ó¬ËΩ2ßB‡(ô\Ò®åEûnõh3®´` a÷2SΩ/4	BKFZ'·R≠Ï§ûê∞y„#¶IY~‘ˆ£Àê-F§`58c∏QP˙)“j/ƒC¸Ô¥hÌﬁËp‘tD´ÁyÅæ§˙ó∆t}¶,”°ﬂKàÛ°ìÀp	z	·©D£~Î∂\AZxƒÙk}Y':ò¶Úl)Ùﬁèo˜èüu¢5(&Ëe√ZbU«úŸ ßc+ÂöS‡6⁄∞!ic4ä·?˝ì¶2fK¨ªILVÄ9∆ voò∑"4Û!Wøö #&w'ƒ∫Ë˜Xπ2ö‹,≈€f)≤ıø´•%–∑`uÌ3†ˇ £_qUá®Ë´W∂ÿPÉK{ø~eKïY"ÈŸ0´Ä£·%cjm◊lFL∂#@í≥ÚB©GZ®÷
S†Ùs≠#È‚Fm
îÜ â≠Â[\†Ï!Í∂⁄R[ˆÄ	ÓAm†∂¶‘2\-¶∂¸æ∂@È*Ã(µ,SÖmÑÚÁ¡r»Ñ&!ÿÜı‡{ÅÂ§.∆a#Æ!∆µ÷Ë„…åûù¨E˛∂víƒRå…Eú„rxvI)ﬂ5Ìßî@œväÿJzâóÃzWŒòÈ^¡xtRì€™)pDçpøÑ>≥…≠ÒqÍ´∆(≈FjƒvOÏ5'ƒÉ˘6Ä∑ña◊ÂõüX›g¬"·÷ñ	ãÕKÃÁ8#úÌXv]t|»Q≈’÷xº>õÇBÛ“3/|é;É¶l¿àcVäWZ:-l…xe§«b¿÷éW∆vW¸µ‰’H√Ü\V^9n∏ãL…3VÄ~£úÊ_;ê'v-]òÊÇŒÍ
·¿3ØÜ9ãJ‹EÊç„åàB4ÍWíÊ3c63Cæ›DıÓ©.*…}Õ~:ﬁª˜N…Á°˚6çÓÂ˛u›’–Ç≤ö¸ËD≠5T9ÜB8¬ì/≥JÈ∫ Ø¡¢¢ã–∏AÔ'”W¯I%ãª7Ç3Z«…Ìk¬Ö,ŸAÌ-{êV–:Nƒª;é∏û&Â qÕa›nÅk£∆yaÔMÆ∫i¿$Jƒ{:õŒ(-IùHÏr5∫∑Lb¢{xÙ¢*` £ß"ut|›zæsÜ	ÉËq'˜{ÏcNÃÖ˙‚q›A†P7⁄¯·)ô—»,N¬ôFj≤ºX'Âti/ôÅyS—9§ZÏòÇKm›√[t0ÊmJë(óIëaPü„§ÛÑ•¸^ì“dú∞YôæN«yÏÁ—nˆ˛Sz≠‘Ï¯ ” ¯#i~VøJôL¢‘g∏#Ëî˝¿:J8g…"‘·è!œÿÒ-OmãQΩÁı>ÿ¨/T¬ÛˇfçG9NÃ{s†Ú⁄DO1Œœ9# p∑Ò‡¡∫˝Rc—yÆN?ÚÎùIˇ¥qP^∫kìg¢L}~ìÒ‹¡È≈,u´ <(Ú`∫∑¿›‚…ôLgJõeo
;µŒãÈëßoW∂ÎÇáÇœËÚGQÏçÏûhïù˛QDOœ?[‹\≤£{∆¨"g[ÉN>áAÀr9íE`≈°=ä¿Øm6F{1)´YäπY€!Á≈ÎH÷uñFhOßmó»¡È/)ËM"AΩƒá–º:—˚ „0˜Ìa¢büÊ¿Á/Ú¸ìº3h6?⁄"¡SM `Ió£ë˚*úTéŒÂßñbß›àl˛j‰‡P:î∑_“t~HÛ
∫ºk“µ9ØUH4;:Ú∑|À¥UV≤9Õ,ëJ«øm%Ãp¢ôóbÒK0¯&ˆ˛%Ã]si;`KMñdOV]4◊≠ÜÖÊ/uÉ°oπŒW_ÂŒ!˘‡™6ã˘Ùü˜ `∏"˘ôT /_V‚»d”À¥∏VtÏÊ˝“›[Ü˜T~.√{ã¥K>†qL÷_Rñ0d1ÒF*%(#”®‰”kôv™âπ 4q¯Êu2u”p)˚Å”Hç'Å”˘ïºÁŒÕ§W$W‰—$‚<¬G”"GG¸˛˛ú_∫œNzU˛*øJã›§dÈbÈäü^Rñ˘ S∞ˆ)†U¯F&SÃ ¨FmnáEÀ`—Q≈W·∞j∑oÖ‡¸]d5óË•.Ω\Gù= *™§9∑n_†Ãì®w¶Âë ;"¨]yÅr¨≤eu¢ø÷x’nˇUgW@”‡#FáxzÒo ÒØ°˘÷dÁcuùÌÙ’Æf6¿‚Ç7S[0y-Ña@à’Hı≈˙X•≤u'˚π·  ‚n˚U*[ú˝\	†-=œπ´_´Å‡l@ÄaOÅ"8fIyƒ57I$ìR^ª-9©‰ùåë¿ﬂ‰¬aqPZì,≥⁄ﬂhP?Éµ˙d™ƒf§R√nÍáõÓã÷ºÙàˇ^‘)Ü(˘úDã®.XAsÈp«X@7õø‚âëtI∞èõ•H+dÛ}‚Ã∞bq)np±‰IóA≈¢∂ﬁhYΩé€èé_;8T-
|Û—,»÷ÄÌW+çŸÆ˙≈√~
~îüÛAü2∏÷ê˘ãïÃ+~Òpè|u[é:†mZÉö±V¿A†˛£‚Ì“øë`ô≠·[oDä5JpÈ	ù™èjÇ®X/†h6‡ãµKaR££T.ªÖπíÓt›/ﬁ2ª˘XMà5¢ïß"UcîLß P	&‹<tw‡Vc+«…©<$LºØmôv?≤
k¶¡À;ú’—6f¬·FÑÅÃuXìPSãr®øƒËâÕ"Ã√S∑’=∆QvÔûª1b‡+ñyüiã3JÓxV…ƒ3I&∂=R[#IˆCCÿNΩ]2ÒçíRzüwî	pGÿ <UT˛—√∆sv¶√_ù°ˇ¬áÆüjøpse$ì¡éß(ûê€zÏô*©{O=ùz8:≠µŸÍQ=≠«“iΩÈÙT·È©Éßß[,N"ı±®R!˚â“vl."!jbüŸ2/NÌé≠êÛ®°n`±tjVDG≠°–⁄›«Î)@˝ˇ{_π™õÆõÜ0n9eláÃé)ä?üöÉB"AÎá?ˇãˇw\¸änC©UëéOÓ‹ ≤Ê›;7ßPùıç∑D¥›Qmyæ¥æÒŸ`Ø:‘«∂ÔZÉeëÛÑˇ÷»©x«^”™8îÔ7„S9˜‡Õ.ﬁª#/œR“õ’äá—ûù•≤°”æ·PøE-)}”w√ã Äîkﬁ™‘;"(¿?Dà1Á(Ë‡%BûƒG<µ
MVU^"è≈¡·‰x¸–iHáÅëød%yrxkKëByë±T§\nª≈1GÀrº€Ø±©eå•∑ŸhuSÖ@†È1zˇª∂∑Fúå◊±úﬂñ≠å?ËUπ∫B
˙Ì‹Zo-]„p§vC}mÊ¥:∂£çf≤g∂Õz≤Dﬂñµ:g⁄™È›1˜FoQ∆aº›¿sT„4‹+ÈÆÓãUBÑò¯œM@I∞ÈÂÌˆZñoÍºv≈c%¢ê2ƒ>ñ¡®@Rtã…ßÙzÎFÆ“˘Õ n‹U*Æ4∞;<ä'|<Ã.£¡()K¥Jnµ∆◊›çﬁ√Ë¢{˛=
Êbÿ˝<äNœ—?íùÁ›áÎÎkﬂØGß"!Æ¯£ﬁ=Äw?¨GÂE2ÃØ∫Ô◊?Æ‹¯~˙˘cq~öƒ?¸–ŸXﬂÏl>ÿË¨˜æÿ˛%ìlúTiw:√ËÂ©∏]¨+≤Fv'tœ6ﬁﬁêUÈ∏ÏR∫{ÏóYâ_tO”Í*M'—Ùs˜>πE∫Wòé◊ÓÊzÑ£à*ÙkfHÈ›(Ïâµ5∏„ˆ:O¶à
ß‘,ß…ÑWΩÍnæ65∂0ûå·ks}›eµÚ¡ß.,ëµÖ∞i`Ôò~˛ ÇÕ§ÍûéÄE≥È4-ò›∆8¯@ªWŸ0ï˛!Åà÷ìΩ"üFáπ@AÙ‹ÎEÅh˛x€q≤qÖ{ÛΩÓÕ8ü‰≤_˘h»∆¸√C¢ÉZy∞éÛ∂MØªÎåŒ∆C1 Yr0W≥	º#ê∫@R÷°yoRh¨/ÅÚù1π„tFŸ6ë7D¨dëûm›ƒÈHlû¬™boM …=æ¸Ù6=+U ì_}+JGè0vägÏœ'ª£l	Å;w#Œwã{≥`^üÁÖ¥πNtS<N{ïXÓ∞3Ω<~˝ÍŸH‹	‘£ºbeﬂ}èπn∫ÿØ."xKdë˚p∑ÌÆÍàJuƒˆKãèuˇ ˇQV◊£tÎ∆ôOìÂww—v¥ﬁ€‹∂∑·m˘lp±3·»a¡èÒã#˙îó-wb¥hÂ„ÈÔ~ á|ƒH¨∫,˙Ó < e;¥\Qp¶Ûﬂ≠Øœ«e4òùf‡;øfiØ˜6æÎ@◊a˜·oª£∆πf•:	cJÊ†∂ÓÂWì y0◊ú¯,1ıß≥™ 'wô7hÈ™…’ˆ/™öM@O˙¢öÇ¿'y≈ICﬁåKÈ˛j‚î¨N<
Í£h∞8DÆ:©;F∫•íÃ›?÷‹ôÓÊdj	>Ô77q≥ì˚˜2/∫ÁhBÂË≥Gßî∑›í9ÑΩ8ßÉsG©L¶®–îEDÍ≤íîãRkí⁄K¥˜ŸáÎ-©Ì·⁄¶⁄ëªﬂåÔÎ«ß›˜0z3bx À}¿åT∑X˘∏˘ ˛È~ß§ªı˝Ø˜]ªìM ¥B—a¡_zø˘aG˝Ãƒøñ’ˇ>^"q,9Á.ŒªâSﬂ	÷	‹"Æ ¢ÁZ≠ÎêœU>Âwèv¢€*˙¯`öNÒ∆/ia–9wg†LÍaÇy±ìb[D§ücÂI∑HÜ"Go˜˙#ƒòu îbhüj’¡™Û	r∫+¸NÍ$~!oáΩ˝µ∑{®|MCûY∏Î‚ÖR¸+ÆHFC›-Ÿ|s]Õlfﬂ?Ïll˛ ìseÛ”<Éº’[ﬂfÍÎz|ïË’]∫qÊ´ eì≥‹∏7t1ıﬂ| £~¯}gïí˚.QFÓƒôXpÇGÈYu¢¯S√V©e±∑i®‡±jpÅbì ÛHªÕy•£[äè£›ú$ße>¬À4´|J»<ø®∫õ¿CÇ;©<R;d±∂Rî;“π‘LÅ6k˜æQûN°±AjØ¸XË	¨å»)/x•Ω*òi+-™2 MX»¨>¡2dVIëply˙dÓÍ37µ=ﬁΩ@;bVFÈfTfø¬¥˝0•˙Ùxèâw¸’‹iáTº'À¥÷“ö$vK{ìGª∞€ûß≠ÂTJæ˝∂c¶|Ö∂a–\®ÊZ/¨&ô≤™	Wi˜æ§‡˚†™ø@[‹9n€√ÛUy∑†s¯|ÛºÃΩM>ÑâÕ’ØÔ‡óE˘ñΩ„A–ﬁÒÚ‘_a˙ø Ë!~⁄‘T∫PçöˆÖµ5zºÂ f≥[xù˙Ñiù@´˙OV´n©Ñ,
zíê´ s	#ƒÄ’hSËOı¸«¨M◊pb¶ÁoCÔ˙°ÛßıŒ&Ìã8ÖTõÓ◊Åπ∫*í©gä ëo–ÜY^V6O%R#86ôÛ4~I&ÎÆ	2‚‚mkÅISÂS†¶…π8wÔÿ‰9zÍì^}”¡|ŒM^|tÊ8qÍwÜ˚—QÑÖÚõÄ√ ∞µ9ìƒöRÊ8¿œ∫òœ|.ZÉH∞h(ÌéG¿ñ¶ho¥≠•D(kÔ◊{Î˜?D»‹˙∂§q©DÿœÔK:.G»%Ä≤emnªÔ-R<¶	]{-[ÛV@^]Ö!sLw\ñ∫%gZ*“p÷∞Ú4™UÙπt≈(r¿mµ^`ªá…”`bÚ<—É“7eECäTå…«Ö≤ê4È{Ó~T”ó‡Ÿk_ŸÙœ∞”“≈}bü›x8Á‰EÍ“î(4ıÖlΩ±±Œë≠Qû]ÿﬂGŸ Ò◊é&ËiÖÃ‘5|£Çª <\ˆU«˘9” ñ\Á6ﬂ∑ŸÕ…U˜;ÿyø≥âºRo—J”„q(”#G	»yéTgÎƒ˘7√*h∏›ÅôÍã∂±#®ÌπD:?i¶ößõ¿±Ñ,ß(Ë¡„:ÚOÈèŸ∞∫ÿ∫π?˜¨¬∆Ô
tè◊ƒÏˆîÇ¡ ˛5Œ&›+@3M=‰£7»b˜âÎßA8õ!N‡¶æ`4Y˚≈ö˜.ÒY—®.>K¬Ò„QΩM˜Çïèπ<¢EèäÓ’9>∑∞n—>ÃJ^î“ŒlS;^	⁄≈Ü≥ÛeêÜÕÇHóëçK†>â*"%æÌ)kSoóußÔW†…E;πlÀ"%íõ‰>[Ôî[∑Ô|
p¸‘ã+˝íÌÈ#wBÉr¨‹ˇµKÕÂ,Í
iP1!5UTØäºL≠>—É:=íÂ.’•3æ™·3∫F∑^f‘Y|nö¬AZ;Úk¬∞ú—i˜–_‰ØÈê¥.>ûå°(4Ã¿|∫˝˛˜°[ÀnäÅ3a≥ß$m¿X€XÁ÷K÷L…M¡X,¢Z_Ü®®j;D3Î´–åkGi†ìõ∞Åè0˚TE££/‘◊Á¿”îQG7Ê`m8ÎE-[éóFã©e)õµ I"ÚUøÄ‘W≥ë◊0W\aåèÔÑÇoã·ò	•\(5iJ©Qóò“R«≈ÑírsráMùwnº5ÔGÑ2‘Y*ÑM÷}Å8&NΩ]V}“ô˛!Ñj’Ãs	… ùr;¿kû ò"º"qÄ*	ñﬂ7 ïFŒ∂g,ßb” ül'\„{≠@Ë]5“ªA€aCJÆ˘^|æc&gI	àÍãû®	”Ï†ıÍ`˜_üÌ—ä˛ÍŸO≠yªÆ;ùm|'$ÛÖQ/≈äœBkˇp BZ®b’«NóuÚ:ôÃ(Ì‘L±¨÷.∂DÓ“¨*ıËùt¢˙eZµÕ$fÒasåÎ€el]ãÌe}ù≥5mc±6#Wln^˚-¡õ◊é“iR W©Ç#ˆG
$.∞YKŒ¢âöπŸ{8Ø[n!ÂŒºÛ¢∑‡ﬁ∂¥ÏÆ‘@øÀRÔ
¥‚âÔ(˜ã√√ jhåSXù0Â
CÆÌŒ7B3âËaùÒçÀT˜mbÈﬂ}[t¨'“ÏQé√‰´ˆ¬]”F<@¶·°ï–
míåß∑zfó,“.V5+á·ÊôVi—Óì5k`ÒÍ©›—¥@[ª°’ng≠'Ô‘Ë„· våzˆ_øtkWh%≥ÚÏ◊Ø»•¥/hs%%„5É˚÷ä:KÄª(!Ç#¬îÎõ*ı@ˇ=ô ˇì5ø∂+çıÌzgŸhdπˇM‘mÑ©Ïœ1è«◊Èyı>ô’Éy˛∆≥ÃòcJ|√Ï¶ıƒ2]˙&`[‡(/V÷†ËX“N6ﬁ°* 3h;
ñp¬|/‹ãz'Oˇƒ<i£Ûv[/yH©CsJÃ1”*…FÅÚAŒÇCºØ«æ°8ËFf¿œQ(8‹3+˚ö´ Jt¶~§96nëfùïí}]Æ⁄Rm4Å≈Q˙∆Óx#ÓÖ¬”xãr*ŒÅ›ã“Íûì9±éÈª˜ÃOp±{}Æ€‚π¸Pc√lVKM9q¿¢o=˘èˇÎˇkÿøí cæ† yÿ≈EB‡◊…¥‹À
yªÏªb;√ÆQ_EÄËVÎ#0≠âÁÚü"mµ&y>M'ÄÜI-c∆∫"\z´∆"±˘ÆrÿÄ;3h±ÑπI&jFFÖ°z5[$‘<Ã&&‘ßV
“™ìV’ZU$“2íäØFg∆ÁOº'çJÚNQ‰WÔ¶o…3"ô⁄z√h?¨ïÈØ%ÀÚ8€©äüÔ@‹7X∂ÂßkBˇ∆™≈Kf FöO{ÉÏ·§v>ó∆r:Ÿá±°ﬁ©ª!…w’Õ¿êÿˆí”A∑°ÒëQ®5èV:ÄUÑçœ_9ãªIañàSOgg¿˚˙ö<-ºm„Ï¿ã˘8_N(§uÆçaw˛YG@÷Z‘
÷S‹FÈ9¥IeìÀSà]»ó3nƒ.,R√©[_‹Bø.“—Ùl6B£ó)rq”Ü˙cêêº£êPL¿ÆCn‘ÍÛ„-‰"ôGhÔ5˛n•‰È‰vA…⁄ ÃeU;\D_(5FÁ˙(•Klª§¸9÷iSAjJf–ΩÆl»
Ó≠U+∆jò≠/'7Ï ∏Á‡1}ÂèYuA≥ƒÊ4∏9ºŒÍ≥N⁄˜5Á+·ì{∞ò®ªe^ˇ~„~Èm=˙X¶d\¢)6duOéˆ„Uçä÷ö[ıF≤W≤>≠=>#_Ô©Zä‚Wô g„Ù¯hÈèÃ™xÌ˝_&ùGÓ≠µ)ÔVå<©çˆáüÌßug◊xLIr±öï˚ÀˇàdÃ¢ÜŒ	fŒ∑˚Lù¢D∂‰4≈;˛dı∫Óm/>< d2|W,ÃÓ±» ^"èà[xUim≠’Œ‘ö%ÒœµÚÔè©›[‹π:◊ªUı‡ÙôñÎ›€W±n™¡Î‚†[¿Ë]‰e5±.ãπ∫∫Í·5%Æ˚"∫∫ﬁ6L=]`Ò¥´≈SıªOÔÀ*”‰âòÍ<˘¬?5zÆ¯P“\£ıD†Tb›Û¶¢À®Ω™ﬂ´(ø‚≥ºG?+y\x¯±ù,õæëQ⁄íÎ√¥]çãﬂÆCﬂ0ÌöËj«·Q∑…/£™„ßﬁ©t¥◊˙Ã©ºª#)ezSÿ <uãx√G9~ˆƒ˜ ÚíºÁjÚÎ◊(Œ‚SÁr´ë⁄Vî!îà˛˜/@|Ωà˜R∂Yä‰W*∞Ò∏@>¯cªˇcªˇcª}˛ÿ…vr'h≥)F≥v/W≈j6s ?‡næπ˛èºõá]$ÀÓÁÅrÆÈ˜Ê∂wÄaëIn…c&rˇá?¬˛Ê»î‚ÏKÂÅÂO:ËF√¶˝9,Ò	àÂ–±9·Õ∫≤£•Ã‡|1Øf‡ÊogEJPsÜ"ÚSq‘ÌKÍ§zJÿô-Â8a·	v¸?Ö≠ìŒm<Ël|˜∞≥yˇæ:≈U€™G7ˇÔ÷]o(∂K≤ßöS;!º´ÖôîF?Mv&∑˛ZRü«l‚méqÀªÉ´†”H°ªúfìfvCåÌy>òï@9¬{k‡`»˝óWI∞˜$S¥-€˚/Ïzòq™∞¿À¿!v:%åÜeäyÙwúÀêæΩ‰:ûëUü%‰ˇ?m◊“”0Éˇ ƒâ;¨SëÜ∏q· Ò∏3¡¥M*+ÍÜ8ÏœìwÌƒv»Zz⁄÷««qÏÙ˚æ“ı˝eéé@É*ô—ïB%„QcRY4ã$"IC∞Ω≥lVªèpn!d	÷•¥˘5 GY^FëÛ8_~TàÛâËN›VúUNÒ"íäã`ß˜pCNk‡D¢¯øﬁ`œ™ÔugZÊXôÁòæ7'ûÏ‘”‘ÙA©˘˝œ	Àg35r$Å ≥óe"ôçyX§ï˙∞_ùJò≈ˆ≤]à	«7J˛HπöÛÔAC€wué⁄∑l¶mßev,|ñÕ∞&ë8öôG6€ıF™.=¬˝ÉAıÆ˝7D,á‘ë¬/”Z\Ãf*€™å–Ω ◊´jÈvÆ®6®‚˚Õ ’„v p2
5F)Kç ä`®Á/ﬂŸ
âz∑¢œC E•∂ˇ≠NP©12æ¡3ÑF
Èv,ev≤vBô5≤ìøo%:π’[àÆáâæe¡ı»çm€[ÛAÚ1}‘Ω•s]®yÍ≥wÌ…ŒÜoæ$ÃTÑ£Ql:M«ÿ;LÖu):f	5Z:sFDƒ1Â=ÏÜ'¢L	«		yìïS
¢•)sXÏ—j¿@iº÷ü Üí‚ôi•∏◊]ì?∞∏¢)Yﬁpé®Iˆ›“R]ëc≥”,@÷¯OùÃO·Ÿeê»ÓK∑‹o*ÌçúÓ!V‚®e7¢d °n_v…åC∑ïIº§Knc.∏y`ß—Ø∑îÚOwõ•ãYk°b“ìÚÔ∂[°7å/∑BµîzRø•ç7zc&ç<=uˇärX
/íñaDÊ»Ô¬‚¢êÆÕñNƒAX≠aŒ™_:[O\«ü'|KÌ–Ô_   ˇˇÏΩÎz€∆í(˙ﬂOqÁ,ìcäñsõYt}≤,«ö±dè$gÌl«€ÇHH¬2Ip P≤∆—˜ÌgŸèvû‰‘•/’Äî,geÊD3+&ÄÓÍ[uu›∫*
∞Â‹˛=ÒÇS˜|b∏ÓM^Õ∑¨WCÓª?*Ç8úã"¸)zp9*ƒ’K54´ä¡_
múÃ%D™§Ò,{çÊ8ﬂ‚∆xc~˜èCú∆M~êùñYuæ}√õ/™Æifúnœ6˝¡ô&{97Ë{î'ZÅsjZç∏]≤ÒªÛ(~xËfd¬∑úÜV${√sÙ_ã≤)#%:aL”è{9Ê{Ù/ﬂo<∆,Íﬂ‡53¨4ŒNSŒ‰6¬Y≠íØøU_0ı‘yñå”´d>YT	,L6C˜ÿ(®ó¸~ã∂µó<L˛Y˝Çß≈dR\b!¨◊}œÁ|
F3!ÂNä9|1˙Eêò‹;0Ø`êÔp…ï ÊÃêÕ)›;ó.Ñoò¸úN¥„ìL©oô$USv nûDx‘ uUÙ|—T´%YÃ˙©B∫û (ÿ”9Ωú|Àzzœ‰‹bKgÉï⁄2≈ZCPu*:w	1‡Íü8—dÿ]ﬁ…lÁÅîS$‡Ö…5ı7/≤®ﬁú·so¶–|yêçÍƒvg€æ?’yò6gY˝i <PNxÖµ∫–jT¬æ¯e)8.wTÃƒ≤©95¿/î’QL”/…∫3mØNO´¨Ó¡€Æ3úÕA≠@˜ 	Uß¸V¶<[ÿÜmaÚ‚’õÉ˜/vvzq‘K˛)˘>Ë]5K·¸ÔôÍ&	ÁFüuÓj¯Mówg£íS∂ ‡e$ÈÎÇ6ò€¢›e”Yl«
êjÁ!¿ÿfp∑îjŒÍiˆƒ:⁄π8Íu‹î¿ƒ£ÿq˚B
è:4ı±°áNø∏D◊˜≥lL^ú¥&£,ütÑá∞™jjîcõY¬oıeÌù![5^∏Ê0ÅS!E˙ØpãÇ=´X°ﬂ´èÁê∏◊íÍﬁK∑Óí˜˘ó~dÙ%⁄ˆC‹Í€ôWITaXZ+úûÁßx√∑ KF}'c´ó_u¨oVìŒbNŸS«≈Â¨$H5q‹û$#m-T—¶º_´=ìòµáıUQ÷›n⁄?!¯›t¿Ï“ÊfÚ◊ø˛ïˆˇâ˚™Ád\•t®∫'ç©Fu¸ê«√©"•K∞·m\vV‰d´fBXΩçs≤IØ'è@é¡_ò@Ÿ(¶Ó…üÎ˙≈è¢Øúfπ•uuÊË
o'MˆºÃ.^—¸®aÚdA≥ö˙Jò∂§n¡ñﬂp˙∞òè1ˆãÇZ—¨⁄?Ü√ -j◊}JÉ‡&:ç_?é0jc«jÄ®Çıc˜`ØÄZ˛≠(?PÇÆK¿{Íò¸∆ÍÔmÿjÛ»o÷¢í*·ødÒ¯Uµ%h7ËI|læÍµLÃ‘I¸°ésE^÷ãtÚ˛ΩÙÊA|“K•	NñNé8ªÕ5f˜Ü2È¨Œ°ƒœd˜î)`◊›âﬂe	V˝∂Ì®πè"èÑπá∂<<<0Ü¶k˜àà·A;4ŸæÒ÷_ûl_ç,Ât1%†çjÿØı˙:π∏]‰ﬁúÅ\bHr:Ç=îˇ¡ ò¿9Éáú≥1Y^ÊGËÑûQ|1TŸ¿‘+¯=4µıK~‘hØﬂ‚√P⁄hØÉQêõø3ö∑z.ﬁ©Ω˘ÁÓ¯¬ªc®ñ‚≥7I∏»
z˚Ãûâ7ÊpÖÅ-œ.R5Ú°J∞ﬁæÛW∫⁄öLû•WvÿNU®í“˜êÎ¸¶€«∂√Ö®	I2të5m„D¿Æ√î=√«∏Kèˆ˚9RÒË l‹‹·X¬tßMª¡êñ&e)ﬁENvçí{ ∏ 	Ë›vo¿S	K9+’Tî∑≤pò√≤œ1>ã≥79ú'dÚe∏T¥ÈºŒG]M{NóUÆ⁄±oa´9`ﬂIUB⁄Ã⁄‚Ëœa^JCk¬ FK‰åòòÊÂCñÕÒ˝4A>zprÖèy©IgürH’÷8„Ù’w£ò.õeu∆ `!hæ=9iH»|ÒV2}ƒZ52•í“:0ûÆ„ƒá°»udù`	—W/±Zã	˘í-Íƒf$Âu°@û∏2ìº™ùy÷{ÏeN	ñ∏≤O˜&”Îtj;ùå0õP¶–Z%≥Ÿ”Ÿπ	ï¨≤≤}ìI’Ü‹6∞Â–:√üÛYWéRm!∑ÏI3ÎNaå‚ äËK?Å∆`YµvéF<÷µ®‚¿§@p‘Â*D◊‚ùÅÊIIJ8”Á`Ø°=8cV$<ãΩ
´“2¶ª¨$mÂô°ì.Z"ù@\MM\Ï≈ï¥v-ŸÁjsÍ€¡Fèx=Ë^ÙQê«ip˚≠°≈Ô¨¶Ò^-∏)“ò)ePà–[Z,ú?Q·À°Ç·˝ÄÌS¯•ƒ˛ïï«nç«¯ôì¥™äQÆy‚›ÒÊù§ÚŸô8Ëz,F/¬†FÍ“µõ^H)5ËÜ∞VÉÔß=ùºLggãÙå≠xHjL&ÈIQ¶uQz˝>úbJ<Ù’^7]K.ayíÏ#êRÏ$√íbI%¿y‰Ü‰∂éÂ=÷Diº2?ôL~D%µªüNQ¨;µg>0´g'®xY\fÂvZe›ﬁ üç&ã1Zz8≤º˚ìä[Íé5ƒé…Áõ¡u≤ïp£u,»Êf{öópÃ#f~zÓzò˜Fº^a°ïÓıaôÕ≥4æ‚:ˆ06"XU•E’øó≠´m¸ƒ÷†’-o¥∫ÂÄn∏ã˚ykÖ⁄º&ıó?GÚ´øZp©HÇëc«§4®≥˜xQ≈®¡¨∏Ïˆ4â.”Kúê°ô˝ÅF4t∆áXÓõó≈ﬂÅ¡1ÒÒYQ≤≤Â'ºDûNåCí[Cº§Z‰∫lª1ïΩP·ÃÖÖÉvö"˙Ö[Ã')Câ·%ÕÃΩÖp è åà8ÃÄ?πéÇ∆Íﬁ™E"nå¢…Ω≥∫ "¯°≤l_Õz◊ƒZd'ïπ”§fEÖb÷∂„ö]â⁄¡"∞U±‘Óò
ŸSS}∆oå4\@aOKXˆ5#óUÿ“Tv[†Wê#Rã¸Ê®¥≈è∞îÔ %]4â¿$‘‡≤ÒÛ(2+C¸jÍ®ööÑn≥`“ig›Ø,B°åÒ¸≠ÔÌ≠?{vÙ‚≈poH@â°÷3È:bÚ∆|QL´hàéjHhﬂbiœ=ı«Ñ®xÑˇú`,S¿åC‚"uo E8ıË◊˝§≥—q™≥##8Ü⁄DÀˆÛ≈dÚKññ›ﬁı˙Wü†vó^Ô≥˙º€#Ÿ≈˘@ÓıÆèƒ;ÚL¡óC	A‰·ıqàCz∞]”ß¶M˚MÓ	üW ‰fàqJvO”6&nuÊ+göı¿ÖöD¡Ä"eê9´ïŒ‹(ÀJúπ;/JâCjúEˆ`Hé-IŒƒÓì_-EŒºù'KÖ9sv^º¨ …ôøÈúëY¢ú˘h‚∑Ÿ¡«¢—Úíú5nÀ˜7Ëyg°û∑Å∂{4W€@V'Ò∏’îúŒÚÇãÀ\Ë?YyªY#+Á±¸w|Î±-2Ì]’FgD é°üÒ_È^ú-†¥xÈÂB„ùM\ìiˆ±J°π Á*7'7ÅÄ9wnXÔ‘;tn∑ù &Œ∫ï	-2„y‰>vhñø?C©⁄ï¢XYÒ#©4≈ãÄqz)∆¬—eˇÒÇB(â_áÉV¢¡J„6Ñ%zHÀFoÅπPíàñéﬂJ˚®]jv!†ç≥ç‡9‹“≈a‘ÒT.ìÊAˆGíæÿ›˘8/J"ª’Îgœ=b’h∞≥oÙÆO ◊*r˙IFJèãªÓ$EΩÜIøI :å Ù"É„ÂSÚˆCv•µ(ÔàU~˚éÃñüÆ-m$∫G-=U0’ºvÏjÈ˛á Ò°NT‘Ÿ!i˙Ëv1gMuª˘Æó»'a √?˘i0_T‹Éà˙Ñ∏pT;>shq/ë<«?túàﬂx ﬂfåd±ldΩ7Dû¨D;ïZV7˙°e…∆}@≈)rÃ ∆WÁ∞q:}ÙzC°~1Õ |œWpñãf®ˇ†9≤p≥˘√ù«”—y3≥Dìµü>D%2ó4Æ~>EaI+˜
y∆„#2¥ıIW◊î3‡%g$$•bw™¸"?4·ûËºß‚_⁄QQéıVömj:(hd IòñïïÀ>›≤º°ÊÃÓ=5}·‘≈‘Ê_Q?·Å†N®[°%–®£«ƒ·¥ceîw∏!˜–1DOJo°
‡43?· ®˙∫
:6wÔvπD°z{Ñl—©FÒ±4¯ô´ﬂ#ôA…&®´*˜IN˚Å§÷∑hk≠¡“”π<óP-÷iΩ®2ﬂÄƒÅ4µ“N.ª®Ojp≠˚<è.Çlä⁄¡£*&ÊñáÑªﬁa[î"™‚9ô¿4Ïû¬÷∫_%i2áıpÃπë%¨Sæ‡LL'Úƒ≈iR-N¶yÖam|	ﬁÀ{È4-ºöÃŒ	ü3ŒËy&öSK&•íÈ:ÓÏÃPªﬂöò¨Ä]A75sPXÈìÂ7Y“ì¬öT8Ìò$üp2’D¡∆I?å¿‡qkmƒ»É<¡|[
.FE^dÀπ´àâG>1z”pΩÚ»L√ü(ˇ6ÁB}z©‚ÑAÙ§–à!Y[°·ø
¬Á:
¥‚¸ﬁÊ[yﬂ…⁄(…€«¡0¥;Ÿ¨ÊmÇè[ÑG≈áL‹?AJâé
Œ0ßc÷uΩ}	]≈$Ppiå-Ú„ú°(ªùÁ)`!ÖB´Æf#« ^¥´…£Á'h|¸4´ÈvLñç]sˆΩ2K.≥•naìì:óŒ‚zKØˇeä‰⁄’˘Ã'ºìﬂr”CØÀn!ãº
ÜE›;CK’Å2ÙÑtÍ¢zE<¥î‡?/5 ¶ó7D«lV-KÙ6{ñç>•'œã2ƒ« Îê∆J/[5ß$Œì∏bÁõ":A;=¨¡ä»
Œ1([± ƒÄ§:Ùÿ◊î\h…ìŸÑ˝’
ã;»ú´B^Á"G±Åú<ë0ô∂ap?Ñsw?ñØ}jßzLÆ∞+ÈåÒ⁄åtÃ+MÛn ;ìÆp°kø∂—≥≠˘|r≈È˚∂Äé”¸?…Û+∞ççÃWk/ƒ—’<ãŸÕÍ¢N'Íñ≥≠√ó–ÒjhÚ@ºV∆>Æ'¨®ﬂwáΩC>ãƒ¶DÖœ•ÑÜù∏„ô#˘4ô#õqhß”-ƒp≥ØÂº®†¨ÌœAñV Ò∫ÃÊ)ﬂÌ47tÇ“Kc‹≥Ä‰˚Ê⁄Àjb¯£⁄∑ê$≤ÙÚ6∂Ì·f´ôónΩ¯KÃúp‰NÂ ˆû∂ó—»—mÜh1¨/˚#îûÇ!≥{£eß{»ç´N°VYÙøïÈ|}1è.85q€ı¶ _vπ©â€Ø∂û¡A‰ı“µÊRv©Èπa•WbáZy"˙GÁyqÈìÂÆ
§sèÁÂ∆Ó@
^±ò’xK»g[k†TCC¶‘%‘
Ø"∫ıΩ.>‘(é9W¡ÿèƒBæ~ˇ’'ÏíV’∞X?Ms‚ìÀ¥JNU<w-+Ä‘üßß._ XK|≈ºê|éE]ç‡+JÆ‹#-ä«æSB”˙öŒA›Ùú/ÿ∑‰a2OÜáV°2R?ÏL“9{‚û<ÍùraËZ_Ñd›ˇé…ƒW ÏŸ
∫-›¬"–›†¿S∑	˝›ÈwÛë<‘WfÄ Mnq˝ÔFG≥w8;-ﬂÍ∏MG£≈înÉå’öÏÅÏ-ƒ>ÿ¯Œ*∂Sà∏◊∏ö¸“‡ù%µ0≠VrTÊÛﬂsôúÙÀ‘yﬁ‚(´≤ºâÛ∑Ûl∆±pP˜>/≥u†usÖÚ˝dí.f£s'==N‰˙…’:{¶§πRˆVò'Ø©%/Á3fÃ˚õãÒ¶f¸µÒß∑∏Ñ)î∏[ÿ´}”ènKuãP|DqT§U›=÷’—ç∫H:@Å\w>õúêøÿ˘£πC≈T	h~‹O‹ìÇQ≤ïp∏÷FAàÍµP«Òè±—·Mú"∂˜S,ˆY#hYbÂáò∏ÃaïQæ˘·	“ïÕ‰—wmå¶ZDøá√∂N˚Ï‘í>+ˆ…vŸD∆q_D;Ï≥K™øΩ/DõŸ©âõ<Zt*∂ñ#<ﬁ©yd	w‰_r«Àû©\Ãf∏”ô@Vx_§x"ÕQ∂ÛK8Ç%¸¿¥X Á∆∆
…«=ˆJ
Wki E‘˝¯>fµB%ù;"˜eœ—K˚Kó“{π¡uZ÷ûNÉ⁄÷ÕyÖ˙:öêvˆÚÓ˘¸›¶ßS‰ôEmá ¥∞LÂ·ﬂ3[åÑ±àmàsofFèShŒôSrMøÑmôtÈ«iâöŒıqA◊e{¯FÃ“ÁE´EEó‹’ëéduÛrÖ9≠‰nÛÃÜÇ´√ó‘gKÇ?ÒZsôeˇô=‰»Æƒàë©Noº–õ∂ø8óÒ€•√Í–ÚDz©,NÓÇ7-ò±H≠R!”Á¯ä∆cß\Ë™800
:¿ÇùÂ£!QmÕ"Ciñt÷˝hí•e‚‚fÄÌÅÑT˚ÿÏãH~GFí#åÚÙOn»Ì« €ÕMr3ªü?¡0ΩØfì+†ˆ⁄ﬁöŒíìåÁg∂NRB2üuäJ√_t¢W‰≈"Ü&∑Ä€Ãê¶Û ∑9∫ùVS˚k2@)_WÒKë›∂Õ¡oça2å{zÊ‰ 0NXÀƒ„∞¡CK/±Q7ü]Õ“i>¢3ºt´ÀuTå”´æ$3§ùDo≈C è≥H=ﬂ?›ÌÑÒ–™"ÃUKìûã¡´€™zâÂNOêµﬁ[Î›òßfù≠À∏˘@>´¥≥[G¬UV=¡î°(∆4ˇ!”ªˆ>âLÒ<w"ÿ˛ˇÜ—J`Øó€·ëãÅ¶º"Øp œ
`7(”î¢'…∫‡Œ Gß˜"œ.˜ä1k¿;‘Âéè£nP*ÛÔãlëYôø)Ççfx˘Hmr4Œ¨©7v}Ä!%F˘iY\Vôjœ÷Ëyª3*òÏ•ç”eÅÀˇﬁN/N˝ìÿ‘∑Ë+[úàÚj/Õgé˜I†}Ïî*åHJ≤xí4ËA≈xõT°Z®v[Ÿ≤Fã;iÑ5’b2ÉÅ∆≈G¬˛ƒ‘∑§∏}‡SæÛé!lÄ¬rƒu´‡ÊK<Æ™ú‚uvË¸%&é-ì±f#âSÊ=%Ê%ßyYQ§
]∂∂Uésó&Wb“œSg¯	k©ëT•&‚≠R<pb)∫⁄1qßƒè…ÜµyGYDkú˜é¢¥göPâå…4¶o‹á.o|;ó‘NT≥⁄∫à7î‘ó(%û©≈z^S  8<Nè¨Ng>´Ne≈ï(÷í—}aè?70§ü·Îj¢gæ O{Ã	Oˇyß–ÔqÿÙìÔ6ñ€·V{%;‹ó¿É¯:›œEÆ€∑Æ•o	ù¸Ó®S)íIwÁ©"=üÍ¡Iƒ¯pÕ;üN&ÍˆÖ
P‚ ˚Ô±S+∆Õ.›)Æ´˙ÓåöhWﬂ⁄®àƒe U3oÌ‚¯\-Ø´	É ≈ù≈V∂*Õƒ l>A)Ô·˚.o÷ﬂh£ˆæzÿ∑AíËx∏k]›f?ﬁ√8œ ˜‚9Á¸?às}‡oWŒÃùk∑ø§ìzª«yª˜àkâk©"MËÇ"j¬U{¸z”xÁ‡ñ*:ÈVín∂E√≤~Æ€˛ù9Ó◊˝ªuﬁó∫ì6—ˇ ´ÿñ˛™4‚≈q$êﬁR9¬≤≥Få6B}ƒÃ8*|ˆ{„™œÁ´‚ı,5’∞‚ÁïÊC⁄⁄Ÿ‘+äπ—O÷ˇπß#˝ ∑ﬂ{Çñ‰d⁄0‹Í– ‚“ÌO*9Ãªqä”‰&™ÏhøòäzCjˇ$Ö‚û;Ü1«_±Áı0∏•$´>éı¨FÕUÆ˚eLe≠}3-é€Ãm´µhl|+ÕFﬁf&tÙZ<âk≥ß›Q£‹±wq|˘öt¡	9|}(Ï∆ˆ˚3e€:Ì∫°D˚,~ØpØÊ?“‚ÿÈ’&mcLÜX…Ìr«À6WwÑm^0gsû•W˙Tâ∆˛LY‚w°Õ›ñ§Ê[b¡wò‹mì∫Ó5≤◊ò˛ÏÿsYßpiMÓnYI|W≠cØÌ-Ûy¯ù¨ß◊Á˙r-¡‚(c«±Ü˛ı’~äÜvØ≈¸’…ﬂ≈—éI,9Öb2^Ò»‹í‡{˚j>å3–†.v_)ÔZÎWCuC_KÍû˛–¸“_.”	–Ω°˙Wø≠Êú3*òü˛∑ÌîBÆÊô(dﬂ˘•ÜäRU/lå÷^‹Ü˙ó˛rö^`äsáÉ∞∆{•ÀR‰*À>,
x˛û“º„≤tÕÙìc3·¸Ú˝WüŒ≤öB„à»8v÷{◊ÉøW≈Ï∏Ae¥;ïküabLà∫_œ2íp~xq¥˜íÙ;2DˇÊYÀQ:H9˛96˝‹ºË:ö,E≤kÁ–:üUõÉ∑"© æt/ƒY¯Éb6)8gvA…]¨À´@a‡∆ÈSJ’U?6hüö‘òD	2Æˆ@AÅ√m´,”+Ù¿MúcDﬁ^å˙ÊSﬁ	D…u/TIRïdUuù
’uw}s9€ﬂÅâw·—jhME˜®Ç¢.ÔA¡SÎ¢Lœ≤T√∞Ó]ªÁu-ÿ¸ U‚ƒxÛ”´ ¥kØèwô7v§√£^± ÇÅy®øÖÖWô]˙=e≤Œ ˜îΩöa√TX¯^tMıLâ»o*)Ω∫Hµ»Ef&,8X‰„«^QøE„ “≠¸ê∆ﬁ¨<+F›1˛Ôd]ﬂ5 TÖz¬>9üÕûÂÛ\›∆Ó	˙I†6 {x›ku±zå¸'π,)÷ßŸ<ÜSÏüP}a0 xÁøπ^_ÏŸ–Ç8∂PKı[°“»‘_üDk7ŸÍPk†*—TÒVCª‡ ´åK∑≥ †ÙAÕ∂˙Ω±”µ⁄:n ˇ^˚[7h∑˜ËF€[◊áçZw˜ËãÌn’Ö/ºØ&Ãü˝˜hìÛ5◊æÍËÍÔı-§V$
[ˇâãå ?«¸t
›®ÔT•≠ªÛ˜BxDYc˚ÏFÿNïa ≥VTü}1TßÑ_ œ”IV÷›≥∑‚‹d’)à§Wkéç&Tk)ª≥ãtÉf·ÇV\Ö≠_ãyÆöôß∆∑÷ŸÈpá´Z‚)¬U•ã8≤=`˜ÚÆ˝7J¯g´¢$2ƒ∂!£hÔ˚å§∆„®ÿöLîkæóR	÷C'%°tÜX-å∂nêÁÔÁI{‚@xB1z}N^|¯0y4H~JÎs±lF>ÃsPüÁïˆöUä/ˇﬁE^—-
Â*,:5VY)M0•oi—Ÿï}•ù7⁄Mπ…UZw§ÔŒ”Á¯IãN`RÊm°3™L˙Z¶e}%ÙQZùèƒÌ∏uØñ  ¸9dåyXëŒ*ã\Ô=QLáçnlË®5Æ{,eﬁ‹egOÂÜ™U5^dì9‡ @âπoÙÌ¥çRB\¯ˆ™‹50Ö|íÎπà¶®ÓQ±µ^P•Ôî ∞[Ûec‰”?|˛ö*hB‡w6˛jG¶€y{E˙…˛ã3•ÍP“5†
CªÔqr∆{%7ÔŒÍ.W~¥·î‚±9Â¶~96Óß˚]ÇŸcV|Vµ{M›∆p.’tPﬁ¡QñOt≈‰aÚ]/˘ß‰;Ÿî≠ ˚G∑ §˘˛‡â≠x„ì‰˚YïÁÍ=zÇ{b˛?P/ôÎÿØø¡
cøgõ?˛Íì¢L<Å¡u;ºFg‘O‹áH!ÂØvm—˜ÎAÚ:+Òê·,ñÄ›3}%åÏ÷ÊN&ô!,›÷~∂+e4µ^,ºÅk¶ﬂkﬁ∂‚“K„Ãi-¸Íπ3ùÛVØ±Ëãœ¡‹º‰ΩÔÚk
ïÌ±”yÏ|Ê^Q¶eÜçÂBŒK@J{Láà˘ÂÍ⁄…uœ◊¶/i™Ÿ∂µµy	4° Ö¥∑&⁄K˙ˇxòI&∂Œﬁét1NªnZ¯≤¿Ë&L¿dÙï©C∑áOˆãl6 d)◊†ù∫V:â‡á>Ù`I&OY;˙MZt™«∆¶5∏NGÂ˙∂854=
GLuΩ!¨f≥Eƒõûïwnså»6bΩ˚Án˛s7«ws∑ˇ‹Œjƒ6Ê¥Ü¡Wqﬁeñ§eñ,Ù§<‘|´˝óø∞ÿ√Óˆxı'´Ω^PÓiÍ
I	N,4ÖiÃO≤]∫Ü◊W‘Ê¨ .dÜ¡ÆIt&ñÑ@ÇLr.s¨íQù∑’-ôoyñNÙ
¥“∞]ﬂp˙˝YÓ´[h∆ÉëÛ{nµBÑ´≤Ú¬HòÁe1+ËÆ:^◊§løÛ¢ Qiµf¯5!√¯ÃàBœ'ŸG-Ñ.π¥C’bÛ£çΩp„Ωúª˛wzÚ&\vÓ]s6˘ë…;µ•ƒÎVn–To–tô<(àím‚È
MúË&Nn–Ñ∆∆:∑%q'8[ıZ5úÆﬁÍ¥≠‚çñ-rHü¬"Ìéq’úU◊6N±ß9Æ’ï$vY£)’µÆÛ yÙÃKªß3}s¢\Iï¿fr¸FÔP
wÖó‘ÖÍˇ˜ˇ¸ﬂÁ!?ô‡5Ájîí	çΩ≥0Ì≈ÒÀñä˘Gº
=ü˘¨FMaD$VK**©ã+ërUuì2.r!Â&2£îf—q˝lôàëü-˝–K@ÅÛ∂ãŸié:NÃ‚Ö◊ÀD¶ˆºz5œfÍ¥7oUﬁﬂc5u≤µ7∂5|ŸπNŸ.O„¨ï˘\πG=+í´bë\¶3 gJ.üp:ÑçÌö‰a
RîlΩ|Èùg˙ ’ÀIÛ∑ü2∏Ø˚pˇ∫C`˘-¸≈ﬂ}Ã+]i˚º»Gô?≈LÕõ_LHË±8Ó¸Ákg’›9[Ujõ#çµßRpŸ?v'’kß’JïLkD“;Eo∏/ç‡Có)¯‹òÒÕ£‘KgåXmºàO?◊ßÔmzc…Ï4Ú9èÕn∑t˙r¨∏·∫ âˆÔ>π2˛…BUL3›è#‰¯	ZÆëZÍi˙AŒÄ◊@–G˚o€~ªÒÓÀô˛Tÿˇ◊PÿØHV⁄"K%±‘eP§ÏhÇı	±1æo
å|~öCøN5öüêÇµ>Ok≈dïé—í¢Ã”5Bíz[aà‘†ç	
 ÷ëd¥≤/(≥ÆË|ïö\Ç#ç‡ÎºmÇ%Û◊jfµZ g°h1`F·0ß˚±Ëâò&®\kÈ”Áï£Œ‹æëOq:Òp◊ñ?=ù¸EÙ¢UÈ¥í iUÖ”g™õVR6Eı)¢Ê›)óbW+nàà.EÛ]5sµKX∂î7heÃ9ß/Æa=>Ç6XxpO¿F∂py[KÅ¨L‚¢ˆ ŸÂHíËóƒÅâŒzHtÇ_5¢âzÁõ∆cÖ°’«£˜*:6«‰•jïÓ≠¿ùΩôù≈á/≈õ›Ñã±a/†oÕlXåÎ”QÛj√‡>Ò¡›—°∫"∑-ªr'wì≈jÓ¯|¢ÉUΩŒª¢GÀ˜"„á—“Â3G4m]w…ñqaEÁ%îgËnâHãzWC¡{ï±[J”lõMMT?ØØ∏ÌÍ|œ“Á≥”‚vÚ [˜FÖ◊õõ∆u‰å	¶∆…´%K„çd≈ÕyS«!‡Ö^–≠J˘ŸØ≤walw(UihﬁFéœ:¶n≠Ílé.EËAB:ä˛ÓÊN?È\¶%Ü˙≤∫√0–˝#-c+™§0HƒädV#Á"Ncﬁez˙Wrp}˜Æ%ÃÕIÏCÑ$h Î∫F	p4Øi¿;∞N∑ßÙß∂‰IPíU≥=è§(!/;M8kñø‘D»`⁄8Òà:oƒ¬]	±-ˆ#T◊=TNYê’c‰-w# kZa$ &ëºYUÿ≥XÜ¨lòƒ[lÁ¸ˇ!fŒ≤Kìÿ63` m«Í≤œ˚Ø>Ÿx∑◊Ü–b·°≥»úe”9^ôÏx˜Õ¨@ËjïVV⁄Vs’ﬁh•FøŸ@ﬂ,!‰y9√Çl~Qì%…Ú/
NLñ'?óì-ì÷5¡®È®ÊAK(ìIzR@∑V?ËCÍZ•ræâæ◊e94eôkîb	ﬂy¶oàÉI‡Ø8ÿ6b-¡Å√wJÆæÏZxô‘jÖhQCfÕ›ô+pl—Mﬂ»ΩôéE–Ès¥•˙>];˝ìI•(©L‡f)9dVcò0 Kñ∆
H5ŸJ;›~mπ%F‹˚È^që±Sƒ≥Ù™QÀçZ≠œì´)"π<6EÄI•È∂‰TΩP‘M	ÂÇoƒøﬂÈ˘ÊúœªVÔ‰⁄q{/¡>6t≈Ù;Ç2öØGÇçß[eò"UèÖÑ]8*ﬁTôQˇ59ê„Û2ïß@∞⁄ìvΩ”£m∑O1Iù:3ZxR_õã¬xå>C|˚ËèÙ”◊öZË™xQÑÍôJ·‹≈Ë‡è¢Õq ÖËme.–§JuÊ{ôïEOΩG0÷Pv•ª€oi«M-,7‰Ñx>Â‘¶Ó¿v‡ó@áŒ◊Îè‡ˇ;≠ﬁOˇHT˘˜E>˙¿Úq»ÍÆßG∂˚â∫1zë/ˇD£;C£FÜƒNø˛Ö‘€2˝_¿ÑÎ#Ü‰}‰ﬂ˛DêÇ8K‡3ı_Q\m≤
≈±ƒ|≠TﬂlﬁpIó(åæ/ö%%W2™«ÿuóvRÈQÜÚµË„*¡ÎdHQ9º ƒ\#‹HDπ∏ïÈq¥“≤®û≠1…ñVøoÏvÿËjk˝⁄ù=o†ÂD«ﬁÆÇç)l›z&πPÓ,dÁ
)Q⁄#u∫nœ#ª3?3VÁõŸ∏`ﬂ∂ò~àM°Ó(ÑZ5µ#w«ï≥∫€º_…õ“ŸÂx;Ï®8‡’	È∑∏µ¡òzd"#€u_≥çŒ”™+ÅbèêZ)˜££œvu~ó	¡@Z¶π÷r¸›S)Ωc˚8]@ß¶„“—”
ÎeãNdPﬁ¯öÚz*¥õí]f~æ"è¬MÀuûW2°a∑\¶Â∏„ù˙rI^ÊU≠o;£Ù;{Ê{w°≈WÓ!{ï*ôr5÷LÓÍÏÇñu±πXÍ±SFÎIvU–'e›"<f’Y-ﬂíñ‘å‚±ﬂ.ÚZc’Õ°‰oZ∑>”æ€Y!éã©÷Ë7å§Ì|ñƒà8.Tg≤#ç€ïM÷tíV õg©—‹	∑ÖÓC˘‹åÖwÃàû(-´{ÜÒ|eGì∆á#Fr¿£C2∑c?@óﬂæs+m≤u˘~é≥™k¨Áw(8≈bç…üﬂBÓxÁÏÕ1|n7:C{LæÂQ≥Í#á(7(å„]ﬂ˘ÊxsIì\KØ’uáé Ø>ŸA_;—Q?…Œ'—°µ¿õæ“‰ûâ1¶=ÿÿ¿‰…Â¯E˜íAâ;>›k∞!Çô7”ƒkì ¡ﬂ¸fÃﬁÓ‡Øπ…-*ÑøáØyAT‡Ô¨úGª º ?¯Ö‘êÓ˚›fÍKœUîs^qtÀÜ!Ó∏¸¯DÃ √[Î~F#Ω8M_ô™∑—7 ~É(p¶Ö\∆à§KKº\&±†∫µıçn8dÖÿœWç®Ügûïycn¿˚èìÖπÜñÜÏ¿Ó‹U¨®Z] }Fı?ÔâPÉ	q°ç#Q∫òxE∂ApcáRe¥BÚBbBΩq¿d˙‰6ÚjÕp;aFè’y+Ãñ√j·±|∫SzLtUãóu4D˛’≥ï(^ ∑ÖÓ≈Àj“ÈC˚	rGg»l÷ˇÛﬁ†«YiûœäÁb•”jŸyı≈:—xöyÁY@"ÅŸnÆ˘'[¸lÛC¥…õüÊßPTùë¢ _‰02ÃŸMŒ,ã7´û[gÒ3ÀÅ˙7íF[…ÆòIìÔÉÃäŸ∫A¬ó6V˚-£Åêˇƒa`UpŸe˚<üåïu =TÒ^JC„+nu¿«’x®ï∫àü%	;Û1V47*ã2Ÿ¯ñ“± à«˛æ∏!ˇ'ÆÉP∞ŒÊƒ!ë6Ø´lr⁄ON5'dù ãPQ √lr’iY˛¨≤ÊéñU–ú¶UmUx‹Ω „N÷Ù”-ˆ\£`∞Çã=:CœÊ	*
Ú≠˙˙Z'Â÷jñ'a3aÏó!Â∆+ÎJµ›ëU÷…j?â´n’∆´*Ü"¥öÛGj"6≠⁄»ò"8(JG_=ˇ…∫Ÿ']≠D
`^ÛJ˜é‡ò> Œ«uÁÿ∫ÿÖz/WÁÂ∑ÿ7•ÑˆLWüÂ9±÷º‘1≠ì1&4òÆ%T£6Kµ∑≈Ú¨HÔÁ¿kVx≥ÌÆÄ5uµ”7ø4‡ÇmsÄ&>•â+	!Èπgëh!?ë◊>õ≥	¬¥]0Ú53+M„*¶–/Hú‘ûoŸœÒ´l…Sº€qüwwòÌΩ˙∂@˝W⁄∑ -∫Ykπ¯Ûπ;{Öp$±`$ ÈΩ£ÃΩÓ≤nv¢≥~|Ñ<”e>ô$ÛZö—Õ;µÄ"∂»IÜq∞à©.‹<´"’ °¶RJ∏ùå“Ÿ¨®lí•UNÒ•∆Öºâ5‚°cPg“/Ë±Æ∆µ5ôò±åê”õ®B˚E?˘∑,õCCŸ‘	„ÑJ£√z©ƒ˘vˆVGŒmF¢6oÍœäı^îv÷Ô≈€;*∆Gª≈i™'≈ô?Ó€éñ$ú\ªÒ
±°Zú≠n9AwÁr≈IÊÌTE‹0tÔÙdí?ösÂàè!ßÑ˛Ódw>åBÍæ5ﬁçÀ∆—£ÆqD˙®PäÂÆçF°z´ÕƒFÃSe%ÏjÄmh‘2L≤C¯¢x¥¬jÚ§ÉÛÛ´›Ìùı£WÎG;ˇÛ(9|Ω≥≥˝"Ÿ⁄ñÏoΩ9ÿzôº‹⁄ˇÈÕ÷O;…÷——¡Ó”7G;…Î≠É√ùÉdgˇß›˝{~-fœ”…Cø»%ﬁˇΩVq˘q˘àŒ60¢3€å∂•èı†.^óYπùVY$z˝gß€Ù⁄˙í˙wGäÌbuÍbZîeq)}C,s)Aºä]KZ>“ß\º…ÁµÙu|ÁëÓ*}¿ê2OÂ2À¥Æ D¯Aù¬€NGczÖ7nßÖ˛Uõ°~^f„ôy®œ•˛}ZÊÍWïÚ·o£Ö E$N{û`úo¯Áá‰ü·ü|JwZ∞SoÛw—g5Fˇ·{˛\\uˇ-ÿ‘öãÁÚ#˘"Âßß$µrâu[$
¸Å®˝|áìã7öhNÔSNQmı•CàNøO ,˝–¨©êkßÔ∏–N“CÂ∂tˇË~œ(TÍ7j_A*éØ≈∆Q7ÕÊ·å(œlb‡Œ#äÛÔ®Ù}«=∫º˜Ñ6ÏÄnÚu>¸Z=Ë˛:~–˚µ˙'œ˛7¯Á7Ò˛€yŸ´6äÕË¿Úù≥.¥‡w æ}ÙŒ	∆ØË7ÜÛx‚ˆÌ◊[YV k«;;∆i¿√Oe«¡–`zéø˙ùºNŒÀcC®}›Uc%LY˙8≤Ùz˘TçÆ@¨‰7v%∑ÙOo)Õ˚ƒ∆‰Q˛u˙Kl/a¯∏éo”ıˇ‹Zˇ_øVÔlˆ∫õ√¥˛ñ≤ò˝Î¸õ¶gø—¶˙Ì´û\Xºø≤¿nèÛ1”h∑$¨Î P{j7z8S[˚Ï%Íb⁄%û%óÉ—yZn’›Ã˙f>◊ÁÏƒKïf˝QØ7¯{ëœ®Íc1˜6˚ëi∞ßƒº	Jÿ%˘÷.âŒµ‰≠à~,àæ»[=ı=\îÕ!»M£∑©◊gc˝ØfâpÈbÀì÷PÂ◊±∑LN£m´‰	ÜæuQ‰ä6Rï†’~í¢ÕÛrZâM∏fóPç…xH<ÒÕû¢È¥”¸qÆ>⁄˛≤{Ä>o£ﬂ˜∂Xù/ÇeÓN∑ÿ¶€5»¶_¯ﬂ-™}gQÕƒ∂∞h¶„p…àSVÎ—àcåVøé?=Í}çË4ƒ¯Ÿ€DzûNõO{7‡ÏdÍ4+íxõbq¬¥P©K4ÕN6cïøÊ …–&Q‰l:ü:æ1T_‡ıÍG8Ê%Ë·?i	/ ZPπ	ƒ@8 yÙuèbïØ}Œ¬÷JE-|aÍâ)“R‚,$XpÕú¸2 ˝ç˚î-Ê±µ»±mH!¬Ô⁄¶<µËˆù¡∑Élä1~JBºƒp¯…ÅNeÒ–ı…]Ië?˛FyΩ~+àﬂT†˙æ•ÂT—√©"á∑√`—áÀãíq4.˜èe9ì›/∏\n12À¬ﬂ8L˜L#2?E1ô@Ö®¨Z∏¨`RÚÔ(6ãä©¨®ÒYOYBå §V¸Èı—Wü®Ó2«æ!ÜÎ¶ÎWçÿ˛˝ Ÿ∆kj	ó¨p©Lo(úrUÛ∆îKíAôQ†´ÓC}=<ÀA|ÍÙ"‡j¸ éçEWbºõ*∑≥{¿14Uº_≤AP˚∑/Ô^gÛ∂‘ˇ\ qªÜ°Í√3¯îÿoö?e-£ :à”¬LwÕPh|5ƒ>*»Mä9Q∞∂AŸ6ÁtY[˘œp€™jR∫S÷≠QEjï˝1C√n≈UÀmg∏9EH'¯N_w¯ ZGÍrÑ–ˇÍ‰Ô•çQc†ùUáFï±gTGVïÒ7© 8™åÁFïqË©2úõjœ∏-î$U´ouˇå"^œàÎ∫x´∞Æ©ç“ysﬁTf°U><¿0Lê1´≠(·¥à4-hQΩTM.NVw£ü|Á¿Êe1ù£¿|¸K±†Pw)Ü6ùÊãi2√	ÇﬁL“ŸŸ"=S3:πÊ¥†XŒ®˛A¸zùV’ÄóÛË<c_öÛ¥J™9⁄P*U£A≤Û≥7◊î{‰ÑÏC’è≥:Õ':2 –:Å1˜“:XîŸ.f§B§áu3}¨Ó|ı…]éÎé*á6Ö‚4˘[ñ}pã]±3Çé„Ò⁄rjZU9˙œÓlæ®ìDÌı∫X«N%vØpˇ–OAnYˇÄµπ:?M Ùí”ïr<^bá»RÜˆÆÏ#Œ÷—’<;$H8G∞iÅ¸p3z«wàtÙ&}úò?@¥Ω¯e9√LüDÉ`J(à!ZÜ¯‘√+€≥QéöËqÅ)f≥îıQ’Cé
|ûïŸ@7äbmígﬂ/∑æ∑∑˛ÏYGe~µ¢ã/ãr\%ì¸C&$∑æñ‘0”.NÆ⁄¿B≤,úÂè≠˛ ±S3mÓÂã√ΩΩPÎƒîsGìn68êıÕy'v}GâN(◊Õ¨‡›
ÎÉ!ZaZ≥q_á€£d,ŸyRZú†–ÉÁ‘"`‹*ª„è§z£F†â?&Áeáª‘7™πæ:ñtæ5ÔaY¯˜k¸z˚LtJ’ƒc	∑ög#äÂm∫©πwÃ}˝«¶õGòLjéxbn‡I¯ ÃÏÂu‰Y2Ùï¿~´I©»kâiG4¡6è∂&-÷9ÌÂò∏8„Uƒﬁt>ØÕÿ*ì¢…¥¢’±˘÷»ﬂ(9Ù™≈4˘v„[:0ÄÀ<Yå>`≤ÁŒˇ¬hŒ»IÊW7h¥Y~ã¢Aå∑ÖªnFÁ¸‡dRÛ¨ò√vTm¶ezém=-N(Í6∞-©hi~ÿ÷∞œuKT&ôQº&ÜIâ—ìq~ñ[óü
ÁöIµÅŒy≠„–∑”9íeÚêDM+–3l’–p
?.f˜—À≠&∂‰“°•‡Àùñúµ°D˘C–yì&∫"w[/ûö7˛òáAîˇebkè˜ÒÑ¯Å—}0nﬁzíR)r¿G2ú·jøtÈÉHê^`$”tˆÿ¬Å–Ï–û1ÌTä*†ÁÂáqq9J{¶(›Ø«¯Ø@Tgzõ‚s÷l:HhI1¬5O“@;Õ‘Âïß≥na?2te@˛Ì2ÕQë7ô¸ÑÛí{ˆÒ™ÀÁæ
4‡»ï¢vx±ÜíõˇkU∞àkK
>ÿåG≥ ˛7Ûﬁ’äÓ#ëz¬â·i‹]”¨(m~†‚qGÔºò/»±óºF≥®Á§,wecjk†¯ráSv>=é’‚)““"?D´pºL©vë‚≠h•`D´k2ÓU¿v’gøx0–º	ˆã«ÅJf¥ü^Ò80›2Õ*Ó˝
qxL5„∞^„7ß`—œ˚¯Õ)á!	d/™Õàålí®x&#N‚üˆ, ö‡iE
Eí`,◊DÄQHP§Óv∂vçhp ÒHÄ‚~»Æà í÷2Ú@Â≥ób˜ `#µˆêˆk9p‚ì∏·üü7U¬h–#êòÒ0≈ˆ°-:ë¶9ç{¬Êá«W»µÇk˚Ã©Y3Qq§PM¶D™¨OL#P^áÛ,ùcNö≥YÆ#)]¬™b÷dÆÆzÉ∞ÃoøÖ.≥ìyµÍŒµ‡õ„˘#Ât.â∑Lã¿È“!∏òœ)5û	Ï}¸:.0oW…ˆ9ú0Ÿ√√Ù4-sZàt∂@—ñFöM·æ€Ù˙ıëY)ÁõZ)ÙÕfB°—Á'`)2Œø	Ïtsöè Çw;:-"≤(!õ6 kóvëüQP-≤ôÌL⁄OÛqÄ˜“gŸt†⁄D-¡òç=|)t>‚∏∂HRfÈ‘’qÄºÓß$]åÛBÁuñ1ñÜ)^‰Ì$›≠{*áU]Ãª=´˘‘ªg Êõ¢V˘jdıms0#µŒ18-äÀlLãDQG"≈^õy}k¢ªioµ˜b´l%V$;3bÑ`È@ê≈IÇ,,ï
jãR¨É«ü¯˘¡Æèƒ¯-πc)∏ëøΩ∫”ÕÀ≤‚ Êã ®ñ,EB~>= :OWÉyñQMÉ6ñl∂˛Ê∞cÓ1À"ÿ_ Hûﬂ‡íΩ£&°†a◊∫$¶)‹q`ìsè"qÛ·óSÃæ„Ωw|äÓÄ€°‘õÏc$_k∑æ«…ÉyhÎpäæÕﬂgÚ[ıØAqW∏Mbìoœâ3—˚∂z∞7É‡ùØËc~û;	[Mµ‚;|⁄(™.]I
&F[DuG≠,∑ã1ûbŸ&G£CãŸáà5bi⁄ua§≥bΩ¢m—æÛ1g9 Dí«"'2•WtëarÂlp·zÁ¥â±Ç◊"O¡œf	“¡•@‡¨[OôÃÖs>b‚b‘¸…BwJŸ‡lU«*B¬HLUlËÕ-”oáH!ø9Læ˙§Fr}π—‚sw> ¿`fNf÷êyh	¡mƒ¬ŸxEÚ‰˙wQ¨Íüq´GbSôØJıÈA‘$"`.%wÅ‹—ÄQ¶bÂñL-Q~{ÈÆâSÍ ;Ìä∆údyè3pQÑm§¯\;6Åï©*4!
z±„2Ã±È$ˇœL∞hÉç£tñdH˚Ïqo4NÃd:3∏u|;èc˜ùÏ/¬âk‚"E˚p_ôØn±SK”C=õ#ö\¯[ö¶9Í_‘>z„˜≠•Ìá;«4ı≈á≈<Y‘9Ã?ßR+/P;YsÚ/îÓ˘∫ÍKÆìoT@+‘õ˝&Y.ÍÍV˛≤†¸mí˚CæFÀ®
déwVÙ;ÿ¯Ä^UÔ!dÔÃÜhKv@
@√öÉÒ„†Ü∫1(OÆÍ¨Û!ƒŸm]ÍUVÌ4’#«"]Àz¬ÈNê7´~∞üMè÷π”·ˆ†ı∞q+ı)2ÙÎ~bﬁ+ò“G£1$D[ßpx±u¢T&ÓFp‹øÃ®™…|å ÎzVP≈€]Vêƒ˘œWñ$«|759ÑÉÅŒ_7L¢3M√ç ÷Œı °äíÃv`ë}¸AYπ7lüü≥Ãd-ã¨èóÇN7X¢G¿†rû7Mó9≤ı*7∏ûÛÎŒq,ˇW4îóó^ÃùE¥XıK*v#2R¯˙’À›√ª˚?%Ø^ÌΩ>⁄9Hûø:H^o&˚ØéÏ&ØãI^ù„≈ø3iˆö©‡<Öï*(åÛ-H†µ÷dóeéA,Œq!ëÛDB=6›êñ<OO2k{ø»˙…∫ç˜é ‚iFLh:ÈìëâxêA≤_(K∫È1›Ø∑})yò-÷ó”∆y≠Å·=—±GVfk79xıÊhw'˘igÁ`Îh˜’æ∑?e « s¥ï€\RM
7“ ±ÎD™ãø¶û´û—éÂ˜L¬Ö¡ÇVSC∏Ì*nó,RÈË†¥∑b—8Ogq˚ú,Ú	B••—ÕwÉ3AqÚ˜ÃX9Ø∞6ï˛‘!∏ùaÚˆìÒË÷xÌïû˙éµZXõŸÄ.√ûuÜLO:◊Ôxã—ΩYzz1´+Ró…w∆dµ*˛8÷)ÉEmö4eÔqlGàh∑∑Ny'.7¿a†9O°]ptJíœx∑ '´πn]’"Ü«ˆ¯ΩiÇÀ·%å∂ô«*/ıò^!ß∏\,™"_ò„@Ü∑πÓ…q€Ûô’OŸºkÕR„©Ö-NÚ)ãÿeà®§s¡øüHØ1∞4¸ÃﬁèTyz/ 	πÅËÀóhÍà]yÁ€™Ó≥¥Nc◊<?Üíóï;¢ßYvâPÈáæóâ'N?√ŸÏ;…$d3^∂÷AÈM‡w¬Pπ‡ê!úˇÜs2ï°∞ÒqMÚ)‹Yâó*UÉJNz8KÁœ@ñÍZp—ë©SÉ|Ïà@G.Ÿ¬œê!“ıWœ==Uw∑ì7Ö‡’¢-≈/π´•–˜kÂD»t
Ó7ô∂ËËˆ°åx8ò†˚Ènz’‰¥Ê§ì≥◊NG+öª√’ì'…u[N›Íâd_¢)‹4	®wàë5…j˙;”•C˛ÆL'4ûÁE)H[twﬁùTñ$*Ê°7/Bÿ/1b%ö≈¢íèÎ&ú 	ê!¥+Pü~EŸˇv¥»ÃâªTÍıÔCuñı·N_n2Iø%1vÿJ™ﬂŒTsÿ·¬æç¶]-¡q" Ë§WîÜpõEv∂ëIÕúπ˘qæ5¯sˇÛﬂü˚ˇ≥ˇ„a&≥z[6ròQg†«ir∏8QF@_ØN¡È†ï ôâ‡‚V+ÛqVÅËÛâ&e”:ŒÍ#|”xT'◊,¶Û˘‰Í®ÿöLtt*[ÜK‹$ﬂTp≤∑]9˚ûT˝§Aî\˚d§u˙±œ∑M^™À&8¸Æ‰f∫´¨®”ŸC—˚6ù£ﬁ∑ÒÓjí)]«“‘ª¿M€^ØÛjïú≥3ï=™Æ≠u3~Gh˚óø$‚±-s°ÓéÒÉ††˚«ÿ¥óÏ<(i£cÀ∆6c1˛≈“à¢æÉè?ÆÿÓ‘πí¸·ÖyìœÔßü8…îiı{ºŸKÎÛA	õ¢ò“Ú™µ˝Ê{}µ	o~~Î‹˚åP?€í€˚ÿ>v—é®¢b‚¿ÿí'rÓ0f√y‹Y°cL‰çW±üÿgò|¶Ûtí'¿òÄàtŒÓ~NËxó&õˆ;rÿ8ÌÂãŸ766J2T¯=Õz—îˆ^≠Gﬂ~ÀLTEÌÑlÎZÈAÙ1Ó0ÏÙ”	˚ qugî/±l„íµ„ºòå≥RóÙ^À€ü˝.í4 ˝ºÈ`åçßcu	¯2°o3'üb Â¥-*∫—åF⁄‡∏%íôb-çSÚãÔL“9 ⁄^kﬂbÂ„êµG6œ¶6Ëàñµã50.ÿßK‡&OÈ∆0·ú‚LÛ≈“¬o¯ï∂Nt§Ω˜´-èßã””¨|Ω(q7süûÜÿÑVf∞)YÒ-Ñ∞#P∂Ç˜‰oe:__HÂÌúrµ∂⁄/‰Œ_»<bøúgì˘ÈbÚ2ü}P^à7¢‹’xpxß
ÈG[B∫às!ÈHÓ‰ãµïä“l¨W¯3ÿ…ˆÀ–9^<¥*T“É úè*∆Q≥≠ößŒ—¶√iZ∆S±2öÚ8•›èl4Áƒ†„{±^e^îy≠Ë≈kı$ËE™”3„wìC;>ìn™^™–îÆWR»^-ÛBÆ¨é’˛º‰Q_•’RÑEaUÓœ Ô« ‚MŸ…P…*Ñàπ6@¢ÿsˇíÍﬁZ∂07˘úﬂÏ.z˘\§ìœi∫k[∆YÑ·7≈:Aíh:y5“/nﬁèäAºßWÔã”˜”bVüá4'∏Aœp0„4≤÷w⁄-’J[üª9tŸ>Å 8Á¨4–∏$ﬁh÷´âŸ∂cs¯7©uópœX'ñ)≥∂&KE[≈·5rÒ™∏Ø	:é±´ZrrÇ¿àULy7H3É0P3˛È`ÕX=±;±€é)–ç÷‹˘Íì_Õ!ÙÒvÚÈ:ˇâVee‹ZÚ¢∏L.ã≈dåŒw|É±.X∫dwº•éØ6Ø8πPX)õ¨˛ãâƒ]√Dˆ#‚m?)‰-Ö^ñ◊Æ=Y◊ì•À∏$≥js^[ãÿë\kb5÷ñ£˛mÜu¨$Çñ(ÍŒkqƒ˜†YåvÕê*≤Í]˜˜k∑øNQú–U2≥˘‡±∑≠´æÆïcÃj9I&i…Ê&á;;≥ÏÚÓ%Y¸ÎÛ´*Å®©”DƒQ˛RlÌ{üQf•ﬁ˙Ç¿ƒ~E…èxrˇEyüøêEù≥√ﬂnOÍÖjéf˜'Ê∆…æ>37OKb;À—|<üïf©!#èÎK{^%ôôyV"G2ÊÏ√•˘Æ8RÌ÷§Ã“ÒU¬a–O‰(nŒ&hZO˛æ0¡ªì√ ¯zrµv∑„S»»∫ôUã¨®ø-ceÚÒ–o&Z.≤{⁄ß7ﬁZ∏°õãÓÍ∞¯›$Ωã›ß‡à∑< ìzñìw]fΩHM«PP,Ü∆í?Iˆü$˚OíΩ…ˆÈ7HÖ{ÙìaÙMûª{UÂ€K0 }GªÓŸåº√ßÚdëUíjﬂenà0zÕÇâß5ﬁ*iKÓUûbEßa…i§†Uº;Ö«Åñ›—h€ù
˙uX¡*kù
ì@k´ˇÑˆ÷©ëÜj\3\GùÎ[|j™®T∫ëzÙ%¨¶‘©NÖπ´W’JøÍùπäV˝Á™IùÚS§;F[Ëˆ(PÍ?´>t*Ë◊ë
é
—≠$>≈–Eú∆DÙâv*"É7#Aâ60Rõÿ «iQÕ5¿JÆ ÷Ë’⁄a™b>¿œÀeøÑﬁZâGsQí&íj˚)…®aHùCåÔ—¥⁄·h˛hT8H∫,ìÈ‡t‘≈\Ÿ}ƒßõ¨ 9»÷’˘ïŒÆ¨¯°˘…*·ä*>oºûÜìZ;Ÿ´≥q7≥Â∞m&‹	
ª¯∏5õævRÓíÚÖyÙ¯§®⁄`yW„mÊöÛˆq∂sŒÆÈ≈SπFß4¢∑%&ù,uŸkÜUì”‡∏ôü≠È!i0ÀºØpÀ‡-©té”YÊ∏Z?mÉàM,Ç≈!ÉkA5îìñ\w87Q÷›ƒiÀˆ·VéÚÂs‹–ì	ÓkEk˚	›ãp≥âœ›“÷[P9Å:àM9Ì0`•ú4ƒ∏”Û¯yuI ©ƒÍsÈB∫Õ|∫T"ö≤ûsê*æºÀå˘…ŒãK !…›º∂fˇ±‘ˇJÊVu-D^≤Z≠ÚG†P8¥)–™â`næÔ©:µØ
∫<≈∏sﬂ ÇˇÃ˘é|â!PƒcÏSÃH∫®∂…ﬁÇm˘≠Ø=Ò\ùö«ö°`‚∑∑Îöéÿ}¿˜í—Óô‰¡QpÉãÔyıº8z…khÏ9ÿ®Á…‰ºÅ
Œ
Ó(1<åöCFìé—A@y^#Û∞Iëd?†Tg1£ü°∏éËÆFu∂»2FOuaÚ®"îc¶X∂ÒR∑ÒÜ€∏6ué√ÊÑAœ4ÍlIÃƒ]ê•ÓckKıßÀ±†“:q‚[ˇåâ©"0∂ﬂ√:6u´éÙVY#[…∑M1¶p‘†∏yÏÙhÿ–#´”y”p'hÒŸ¶Èä∏%Îµœ {ˇ∫≥RóffÖ∫
Ï≥Jg‡1vÌ|æC˜v˚„vƒ‡{™_¥kâñqÔçòSobPı©|COLJ\ÁX1æöC’qf^§’£ :=„_®pqCcàlPPï”πô ›PÚGíæmá⁄˙πÀΩôº†™ΩtÆ¢¿¡Øtéféø¸c◊9i÷¢ßˆÀNÅìüJgá™'…#ü¢R_ûO≤èG)ﬂW6ôà\,èí<à3q¥P)gŒE˝$∫Ó'9~Œáí;Ï±)“TEYwªi?9·[“©ÊÊfÚ◊ø˛µó¨'›˜U,÷©;"¸a?AıÕ«`C∏ÀáπIrU≈EÊMßOv¡±_„*ún»*àÎ?x⁄`O}_†r∞µo<u˚é◊∞tˆÓYH‡¡-uÁVÇKjí≥öÂ)Á≤¥ÛE›ø∞^≈¡ÁgÅ€s‹œô∆@áîµ¢ëú¥pç+–œIK÷Êø™cáπlª»$◊¡»[≈µñªHÚVπh£Ô,ûËõP+-„oâıè∞G≈Ñ”,©kG≈ß(Ë∂±}161dÖ»o"`à#ï1≈*6À˘∑®u”qÁP7czfÛ{ißˆ¯–"q∂Eø[¡Dï˙CÄ⁄ft]u“È˝mµqZÚqOäHµåV∂Ü!c8
™;Jø˝∑è°í+Ù^—6"¸çÎ–…ÿ+≈û√uÃ]XÃRªyÊ&Û»2DA«I¢«û…∞hQ≥6€≤6Ô8Ω¢çC	›h„˛K∞q˘OCDn√∏aU ˘'aèRï<ı™ÃœT‘ã/—oÖœ¶ï±à˜*)$ÿ_¿ÿ´Ë¥IúT‚ó#ô¬â|¶ÈGÃﬂƒøÛeƒƒ[¥8 *˘ß‰˚†ﬂıu{æzˇñl«:∫Ì≈K’•h©>¶.)Ãö◊ÄÀlPëa	VŸˆæ`Ö-” ‚_£rΩIΩÆÁ®”â}sg&^¶iBZÁ#ÍÃÅ˛Ñ¯|î;ÕqüpüxlÚyZ—QqÖ‹ ‘%Ø˛ôb≥{kwf2[∆€0üÿ¿P› ∞µÏlﬁqÀèøõ~—%ã≠r–≈è9W⁄VÏÆòçZπVA˚•˝˛c#πÏÉ'¡xû¥‡˛0Óê∑˜ŒõœbÈo«‘ﬂ[wå˝çY˚œÒë˚¸wcøùßXç…ø)õ?Òõ@Øƒ⁄ﬂÑπø{9lc¸‡üå˙üå:ˇ˝g‘[ÖÌ€≤Îí∑˙a˝Ÿ«ız±ﬂÂ-Ñ?§ﬁ•nº|-Z¯ïÀWdπ˛jÚÏQÂ‚1∞N“ä¬˝ﬂTKÃµ-zj8q¥º…ú~÷|FÚ_àytí_µœñ1⁄≈Q
Ì…ÔÿFehÄÛ&fX	Ìdt\ÆÅ&yÍ)àU=Nö≤¢üü√'u˛åqÈúÈˆzÉy G$ﬁPπøqﬂ©5ùzµÙyΩ§^êt¸¯´OÁÁ◊√Ø>Mß◊⁄n.\∫l¨Ô#a/ì!≤°KggY˘"ù◊˘®€¡hã©f	¢VÎOÍ‡s[jàç*'ﬁAo÷UÒÀÎÙ,Î>r{Œ9BeÊπ#eŸÍ~Vd*9sÆùƒœ˛	ÛÆíLÎW◊»í7Ã∞DhÛÕî/§ÑFæôº	˛<ÿlõ˛ÿ•ª˚Fæ˛˛ßHúñÆ§≈k?»“5—X‹íúƒ¡Ô%G®˜ﬂ ∏+·Go%¯‚dÎÙ?Íò"›^∑Ú>ÍÄ"A-8ƒ˘à‰k?ª‘)7Ωør∫åÄ—VN/r¥åhÎÁt‚t≈k"ÚYCˆ?ÌXÓ∆FÕ3¶Îºú≤7ŒÓ∏ıÎ¡∞óN≠çsoÏs$pFó/ƒ5ï≥◊∫oﬂµ“¡G|ö“§{ˇy^VucÎÓÖ∞å≥ÙééﬂÆujÙâ§Ÿ	ÙéPÄ]ÈêZR`ñ ˙∫r$>/ã&6‰{∏˙bn]$”4ü’ød∆Ò˛êlWpt¬.Â¥bóÁ˘$√té 7$π&ÌñnÌYvR,P¡´NTAìéV∂z:Y ˝˝∆ÈºRm–]¥bQìóØÓvôùeìtÅ#OıRwÛÔãÈúÉï ˚3õÃq[óÇπ/ÄGKjvÄ˛â†`“µÜ‡¶D[5Ç‚¶ı∏€ÿâ"Çvíèk*‚©qAûë¢º‡Œ⁄ÛS>j∫.OTVî˜}*§õNò∏⁄0ØN∂ ∆¨_ôqõÑ›·ÿı·Ì’mk“§…∂M:ô≥kqGö4g¥W∑≠IõL⁄§LºÀÛ”´†Hè:·™%–ãÙ 2ºñ~Èãqb*Ã+=˙8ä4jéSØnkì2DóhVæ6Mãó±ÊÂ°Å„u„∫ü|˝›F»≥Ú!∑3´Åk@*åyo1ò‡:—1	[AØ6=»∆¯Öö pG´ mæ—:5qPoBxè ıD ⁄ÀóAp A⁄xy@§¯IÚ◊ìÓ£∑Î_ø˚ÌÌ£ıøæÎu7á√.º¯Ó›Ø pn˛Z˝S7ù˛6üˆ~=yò?v‡LIÄ{"G6†w]”ÇCﬁË[êYPﬂ©n	Èiïx$Í%ﬁ‰ÀÎD5‘9 »î¶∆Ck
µ3k0¬ü]˝AŒØ„=úI‡Y´Õﬂîéì~‹hZ–+OÌ8B:W'ûw=ãÓd}»Æ.ãrL˘\L3üﬁ~˜ıFªﬂO>\¬sZﬂÔ31ƒiMkú<È;mj ≠°k#G‚‘«Õ‘6÷µO	ê≠œ\WU5
ıÖ∆¸l√d´,”´4dU°ö”Ë;T˛Ãèéﬁ®üìÎüHJ„¨¶Ô#äÈI˝aßQ4˙p9(R8Ñ§x:`Ô‹µ¶;9â pß"ùÛò "˛‡©Çáó}=&∞o5≈dÕ*>e,Ú˘ı=ŸåÁªú™Ó≠''¸À˜Á´î–∆Œ0íΩÈû"å”ÅŸ≈¯√ŸG≤:N¡˙£¯}$˚≠®®¸f0Â∫'‰…£‰’9ûâÊıbπwj¿CgU^nØΩ*;õ2É+ÀVì|ƒ
#Ω¶_17oó Ÿ£.dî¢Ùd)g‘@N›c4ŒD\ôhjX◊˛'ﬁ‡2Ü«Ωù∑îd™UãQLôÿÂûôé™.‡®"·Zı‡·@KLê8˚≠á–W©©‡€ˇÜo}˜õŒÃ
å∂7ÀåFkk2!^+ßlu°^ˆˆ1Ïc
EÉ^}o‰<ñq-«µ9<xW;t@·é[m∑ÄBƒ^©C@—my≥-yCúÛ,Ω∏
ÒFïBÌìV+ìÃâ∫æ8ÄÈ&≤…¯®xé·ªcÏDÆ˘bà©k±°N€ì
xåÀ''Ô2ÈÑÉ3ÿq0É/|´[ªß˚Y6FåÒÆ%4Á˘R≥®´ùÚ¯ £ã≠ë¥8Œ}€7Á¨Û!IjßÊ…/‚”'±ËÅNõêK‚†	Ωyé_—ÚËñ{c√:*∑¶ÉLûûG#u™/ªE,µ6«˚∑i>ÀÏP{Y>%®#æN≠q\“óX÷÷TqÔCÉ!¬WW´‚&	*c%î∫…FAE≠Œ#R÷±Z¸à7læŸî! ”ãHÒòyÉ™E◊ÒÈóö>x|Ì1ÍcV™gsFGm$TÜØSF 8**£ŸGk3
◊è±≤éaÖäó^<˚FkM=Q…6Ûï6ö¶\Á·“^h˜/b§°ˇ†æùÚŸõÿ·ﬁûÆ‹Ωc≠f˚òWÀMjr√`‚x∑zU≥àDÅß(|+⁄L¢P‹pÓ+U<Xavﬁç/qà:Ä˙Ê¶ﬂ;«2√Î"ﬁƒ&ÜÕ5Tîú(œ´}ÃQlSöcÓÚ£W…¡ŒˆŒÓœ;…·õß{ªG˜\èÕaéY∫£æ§BáÒÂÛúúÅDûlZ√À˜=PâÆÅ.Œ* A…⁄O—∫"ÂÜÇ<VTJtS€öbiˇhC™—kA-D£˛◊ÍΩóFI´ONÀb˙¶ Jt@ÍT9%<ÅÅøgÊ~F]ËbƒÊ#¬Èê}Zƒ‡˚ iŒ9êçﬁáïÕ*ãOk%Ì©%RÚê'√‘™l*˜U;ùC›|•ê0ÄåYòÕF4ÎîD¶â`ñD#RzB+ÀÈëë~›7ìˇŒ#C{i˘Ai5ò+K´DW√ƒÊhc√yO¥C§XP/≈^ùFsÎµ:¡y.Fyud€ˆSö∫^DZ∑”ö«NèÚY6^`.u‡6«i9NN”≤^ÊòÈúÜwôNÄÅw∞ıc˝ö<I§ã(óU`ùV^và ÿn}JDÒ°Ñ}-zI—∑ä‰<Ø‡‰∏rwŒxπ[gSÀú7Ïea® ªÍ.*A2_9Ê1“XdZ¯˚±∞˜±C_}{…6°±~Ø_Ú6jB\S*´”|3q¸ Ú{–	π…úk|PÔOÍ/≈ô$ç∏ÈTëwA∫.(µàÿ©…!º ëC X	T’˜jâﬁ_<ÍÙ};öœ£ı8„1æ¡˜_ãxªôì¡ú[€GªØˆì[˚œ^ÓzGÉﬁJY5/f®ÓË¢ìé0"~6fÎS6¬ùÕ˘Ï¥x?#Y≤Ér'÷≠2T5em7πìU{ﬁA‚“
Mëê^ËﬂKhÜﬂÛûıH—ˆ|Ëå¡RìÎ•T%BT˝QH´7¨ÏÍÈµµÁÈx¬‹»D÷S1q˙j•q ®	£ÉÊEo"}í “@$í»©Á‰Ï"∏xòF÷¿Õ¿fè«†®¸K='o|ôÂq…z‹!VÕŒ;_I'óK¶!ô@Î≤¸"ø«C“iâÁñZ‰!íŒ∆≈–Ñ4òÙe4RRIEßOÆS1H’N÷ò68ˆgÛÂÍ§Úéâ%ÔMCΩiçdd}}Í’s≈'œ_$€Øˆ^ÔÏnÌ<KûÌº‹˘i©§OëÒy]≈È3îïü¿:cº@ºVú*û-NÓX+∞≠"È∏ú≥ùw°	å*Õ"Pã6B~‹Ê=/Ä…-çW"rêq∫‚î 8Ÿ…bsûæ9ÿ≠‡ÊO\P/"Cv≈˙)EU=•û∫ﬂøop¬®s·¸V÷∏íØ√áÀË€óNÆju%ó£.N∫:˜hœ/:5∑wLÜ“çw∫√˚òFG?=æè*3@z¢\≥…x *ñÆÌÄ6õ˘’ÚTU{å…øP›nz"äëÒó*áÇè·üí ,º~¿ÀwìæÕ14ç(;:OÀÌbúm’›<j.◊S	›¡uÏæMOﬁıçt"¶H?2^Òæ›1äáóá|≈UN`ôë<Åñ–1^Ù(≤§◊éÑ¬ß#ëJ˝E(˙<ÁåΩ]Å∞‹K=9™rÏ¬∞”Îı5Ônıf>)Rüh+ª.‚‚¢`Áá4Y∞i∏‘mΩm’cß∆)º°ÄtOíc*R=¸ÍS∏wØ›Ce0üù{aMûµ˚V¿ìÅ7òAıH]”Ë™sÎÙÎÑ)ÉC)∏∏5õƒä±HDxt£o$„<hîËõ9p|oT≠Y:Ø†A§óiéÁ.¯”+‘c"»>ı4Rs\\Œ∞(PJSCÎ◊/ª¯†ÃNù≈Y∞∞¸ÜpﬂLä≥nÁpA°YOùÆT/1ÈŒ∆ºáÄˇûóﬁœI‘iπ€Í%^4-ƒ|¢óYÇç˚∏ÖåDHnYÎ}dΩ&∏√O“—⁄›ı˚o—sv\¶ß0€eÓ^É¡æ–ÏL‰ﬁämE7∫Wƒ‚|ÌAÛ—+/ÕyW-E~`Ô∆±õ˘◊æ`q˝LÇã>´ıö	ïucæ8ô¿*∆î0Kb∫oH©∂M(Ê‹7J%î≤J˜B¡+Õ¸6AÉÙn'íñ…ªçh§L”w¡FªEiñá·ïGõ˙Aqc¡Ö«πaÉú•ÒÔ#jïOµç¡˙&¿gì∑ÊÂ^V?Í'ÚÒk˜Òõw@R±.Q–πùΩñè◊-Gy]ö˝‚ÿoóH¢V˛Ñ⁄ùç å¸tî SﬁØî:Ö5WJ´≤&7X™"Eh1m”˙0u®n'ÙSJß⁄—‘©:`µÃ|ˆIu⁄®’"™¥◊÷[AôÊub⁄∑ãÉKB#fi9sêXQ“‡ï1:EòÓ˚◊j“¿ZwÉuí}Æ(JŸp€ƒÙ$ôÕ<9c@»j%#!:8¯πR‚M‰ƒ/ )z'ˆ%8#ºGØaè}@é {(©E†ªì¥£Ì„7‚£ë]üΩy˝rw$U¥ˆ%;ˇ˛fÁ»UüiÖë’Ë˝«"„HªuiÕ)Åü”h≤Ì8™A"∫håÿ
ì˙ŸEÍz˙yÁ»Á¨’Ë\õπêé∂_vÆ¨äO$m«!;¨gÎ±ï∂ï	kDË÷U‰À©¬&™∞í%]èæx°M7XAub&bRÔÆv1÷ ¡”É≠›˝√£W{…!"¿˛ˆNÚÙÂ´ÌKˆﬁº<⁄}˝r'9⁄:¸∑dgˇË‡5ûñ):—Âtk<ˆiDç—>Lë±éπ+1îÚEqP'®{U∞g<ˆPQÅ7ªÌΩUfwÃ=lb1c…VE›x∑µ˙ÿ/©à⁄6üÇ˚·Õ$ÂΩÿFQzŒQ{xUÄ√¨Fd≠éäÌI±√ëcaô«“∆9»Æ∆3æÂkºÏ8ßXÀUL[hâÎAxÔ/@
È◊pwà·^]9§?Âç√ΩÁ£à¸z#,ëÔ Q$∏·äÙGi¡óñ˚π!Œ¥∏¢ÑxÛS6À†®¿üò'ÅEÚ3ÊUè©@—öÅ\ûWAπ≤˝:ÎÙH$ô ¸âÜ£„ú´∑Ju¯£qæíº$Kâ∏Œ‘ ¡Ï‚œ>gouˇík«#·ÌËÃ§1Rﬁó@Qùp¨*°p∆≠EMöB≠fNq'nW“9$*€ºÑﬁmG(ÿÅ fòQ’√∞@˛QoøàåÖﬁµGØì2S°Å—+Íf(‹?®Ñ‚ΩJ1(a(yRæR·L|≥íFπà=xEB€…‰πUË–»»æˆá&í	zW#£êo6W	q£Y’Ù}M≠zàm˝Cò…÷m‚’ÛÙÑ£åÖ€üƒrjÛ®ÄsHÏ”ÌŸì⁄ÓX„Ë˛IΩÑ=}œªOm55Q%L‹é/ΩŒæsπ:;3>áˇ‘°mƒX/Ér3åﬂO;{ª˚ª…˛÷¡¡÷—Óœ(ÓÓˇÑ&≠£W€Ø^˙Ç¿k&X%n‹ãLqÙ pÂìÈô)÷D•1†É.Ùöo›K÷U~ﬁacG2≈àRN_DòI™K (™ˇR,(€s:K≤èÛ¨¨ì
3Û-&Y	É®rÚ‹#»	0¸uD∂ßøRdÿ	ÛŒîÈebâ*K!I
∆Ò&˜ÓaN∞,ùS≈>4Y£ãﬁﬁ£Arƒ4ò\ÁNÅØÉ˘ΩJr‘pöí{_ígÜíbÇ≥»$ùˇâÙï¢É≥A?È|≥°û;èæ”ø˛ ÔHù:∆åyÜ£Xû£C)—uæ*fÈ	å‰πú≥‘í›”d1´–Ò4∫õ,*Jï#‹ù¡Ωo»”…¡·`ı”DUqﬁæ‰ºXî˘^(–w€ãæUZ%ù/Ü{{ù§˚ı∑ÎXû≥¯w≠NÄc˝v¯Õ‡…+åuôcrÏ%Æ-,˜ïb+˜æ$/Õô`ze2ÿ& sO˚…evRÂ5g&J«cT»‚8ÏlqÃ*l«Åﬂ‹˚nêlŸ≥‰å‰b¥à¨‡{òo7ËPli2.aö–Y∞x¸púMaS‚Z–D˜Óô}·d{™&Û√{∞òŒ˛ºÓ‹ª˜Œy±®ÅKÏG{(L'rπò”ÑÍû oö`›+ºõYú¸XÑ ¶fŒ>¶#ﬁX”Wı$õó√{oaG2qP˜‡,$˙¡OL`Ì•c¯™±Qj—øKà-°zO◊£k‡CÖA∏Üräu!s◊oh”J5U0Aáº$ÀJïØö*hF•c≤(!µΩ˜ÓﬁΩùYµ¿ú¢Á0Lc5.ê#H.ÀtÆ≤Ø≤ã6-?†9ÜâTI∑Z Å©¸ıˇÔÔÿç¨ ˘ü1%√PæQ†lìtFÉ´–C•.t=ƒ±ñÇÆ…ÅÂdyëÂ…3óúÈ
˚4é0 é jì;∆˝íNcÛ˙9˘	]ÏÛ◊eÒÒ™ÀÙÿπ˚;óuÂEå∞¨FX#4YsJJj^kL9H^√¡§èãå“È »Ú"#ÛÛ,£yt<ﬁ€ÒëF^
ÉÄÀ˛ØÂV„ﬁ:r©Jµ£âTQ«««ÆTs1eUÔéÒé≠¨5Œ>æ:ÌvﬁvzÍo≤ŸÙ}˚@≠˘ZÿI6EÔt≠wÒÊÇ2xxÿT¿köÔQ©A*‡˘ãÈKxK9qÊÿ6R-N∏æÜ3i∫.[Ã°íCE¢"ì–+ªTŒRAºMD¢rlâp’V‚„íÃs‚Å?ƒça=«iw%œàx€
x«Ã1¡QùÕìˇAµpù¸öS[1îÏ§lGÖn&ŸIÒå™7	géxF%Ö3'ÇÏ’<É3â*ò∞ dCR‰∏hÎ~&kkf∏™∫…k≠∂ËΩ®ãuä™Ôä»L&W√dhﬁ&N’ Ö∞k{Q9#¥Ì@Í0D~  ‡zà äÑ
Ë ‰»õït◊±‰ì†Ñ¡+¨Åü–±1dÂæKDz≠lÙ¿ó¿Åa3Ëﬁê}xëh?^Öf3–ãºZ§r˛$⁄hòy∏˝bgoÎ˝ﬁÓ·ﬁ÷—ˆ‡§aò¿+Â®(ÖØÄÒ¬À4yÅ2;wßÛ¢¨›µâﬁÿ6Ë†ãÃ#´™uGƒ≈ B,SSh&]h-í¨ËêãπìEÃB‰dao§ R¥cTúÙìÕ
!F≥vvê%A?X#éﬁ∞£0Êsìj«R®dÿ˜{µÄØÊ…t1Æ¿â´oÂçV›(˙yëßä°0%n™…±Zó%*;)RÒ≥ÇÜ«’A4k©T1 ]≈ƒ6∫‘öãÄO‘mπΩ9ÍÕ—Ó˛Œa≤∑µøı”ŒﬁŒæüå}‘@…gYÀu2.ÄÜqùLΩm€UÑ∫k¢ZjtcA6éãã¯ØîﬁÂ¢H¸ãÊ%^ı≈≠„Ûí¬≤ŒYéT|osÓhÌPΩ];4·å≈5öeó™ﬁ0Q?BOw’«F˜Üñë6èÚ∫ΩÔ®`”Î’›|géçØ∂]èDõN‹Àou=+˝n•{ÉﬁƒºôﬁjÔ‡†£v˛∫8m:˘+⁄∆2¶{≈¢ (êz?9πBG¥41πâNfõÿ‡sµÊ)_Àt„>ó¶1É’‰Nhm9óáïﬁkë=¥Êt«Àñ'?é'>VÁOáÎk‰í÷´–¿; U£@M‚µLÚ˙4ù¡úMÆ†
¡r2?◊*k=Íµ‘ Ÿëµ≥)P4LT,6[dª®+1>Ô^Ä!|¥Iîç‰Gqv©÷‰R≠≤ó)AG6üWãızÛö9üÙ∂à Æv∏[zÙ 08D`â©Ìà⁄NaV†/L]éΩ’M∫€≈¸™gŸ&4∫˜¨úWW®≠3®¿ZÖü{$9û⁄ëäåVVê„9qÑWgXZ>Sç˝¬AxÀ˘‘´X≥j_V28gÆÌ6£K;˘åòmP7âÑÒK BåÊÍu «≈&J.ªÅ¶«ñzo«?€y˝Ú’/ö°Òg:/ˆU3O„ÌÃòMk5ÚÌZJÀ¯YIi†ícM$Ωù≈`(Ã∞˙‰ÔHWË›‘=‹8!∆ëç£Ô˝\9Ó÷M˘≈ERÒH¬jõÆ‚ ù}†KWÀ˜c≤Çæπ38mJò-]´å‡WïdŒ\§„qhﬂw0áÆ≤n≤Úc!5'jé‘å=väç€2Öïu∞RŒ=¶)ô¿‚Æ∞öÔ#6À&«Ä2$mKùbYçƒ¯{12Y.£ìVLdî‚ß≠âp±nˆ0âb©Ì{?ÈL#hëCF“î¿|o–0bØ∑îª\âtóÌn:5 ¶c√Âíç3ÚäVhãıûö)XÃÉ£ı &«L⁄K-áÖÊ6^Õæ®YG+˛(shmÜìÙA˘WÜnûÕ&p&√`ó Èò°}ÅH˙rˆlœƒçÖ*÷†+N	hæR¨zJ¥Tﬂæü≈º¢[uÙä#ŒwuiTYSÅíÔD“3åÊŒ∫ÉA—Ù£y:©—¨&∆*î'¶Á.ÂùÑπ“&µTXÉhÕP8â–[uáÓÚÎ^<``∂òW&õ+8≥˛¿,†≠àßjÅ\:„«$ùo:rˆZ◊Ò„’ßj‰”-Ô6Ä~≈ —qùËÿZrxûüz» hL0EUYËÛc˘=Ç.¸wRfÈá«ÿ6˝¢Eßçí±•…ÿL—ﬂ^XyÅ ÈöL¸›°v˜=˘/ˇW—~Ÿ[üeÀ>f#X^ﬁÀ6√m“e ö]∞"®\ì©çü“!ä%≤–øt¡RÆÔÅó{R‘u1Âp·‰¿I?’¶œ:?ˆ5dU	—µ:ˇT¬Éhi%îpÇÖÓjúTyS
◊§)ÁíZÿdHF†§»ªƒ˛Ë∑&ØíΩ®uõîãŸåÓÀ—Ö·
];N1l †’ŸŸƒhÈ∂F®Ç„[≈<?û≤¬)Ä˛ÎÓg˛@HÑ˜åÙW›ï›1∫5ú^!ù'ß˘G@Qâ©Ñ’¿Íó∞;0hÂ“ò-Ë÷û∆8∆…á,õã¬oó%ﬁnöΩ©πàÌ»»%ñ]Ê3j6Œ˙x˝/˙ü^RÌe˝UØÿ¶«˘ÿ’Så}dR_5`=∑Õ/ë
HB“§9Ù≤€Lé±‘åa«∞îT⁄Kºfƒj/«Ü»üT.œ[QB°ÿWOöv∫ÑÇÀÎâ≤]nõ®¶RÃ€ﬂ`t'2é¸àºé)ë\Æ_\˛ºôN–™ÆaÛ˝¡‰8r`ƒQ≥ìÖ6éóÕ*¢!“ù™áFèëf÷`ﬁˇ(øbìÑ/ªÖÎ¨ª«xw≈W‚π˚h*Ï…7ìÇ[ƒYÚ¢¢`ä≠]Sû<1+‹ Í
õŒ‚ˇ∑ÑÌ–»OãJ∆´∑ı_TT∂§BÈ¥SEŸ-
éJR26ÑVÑŸbâ‰M~5u∂gÿ)9∑aÜ≠·@L]~FÆ·ÏòcÍ-C¥vhªÕ’RKx#õZ›Ïu:–†î¿ÿI):Ìíˇjíœ÷Áj
EÛ|˘9\A€˘”¡A¨P(RWF∞"_Õ©Óö·P≈Z≠‘—cq0‡D|>§5˙Cà3»É;R£—Çn•fc’Ì=4d¿æà|‡„∂ú;PÀS∏Ó@çLE®GÚW¶Aè§|Ωë»ueís@Lux[Ω÷≤i4Y# º?@ˆ˝"s,¥€Ã¥ËRúe#¨~`YˇÓßÎËw…ø.)C‹)ó±£D©gûŒÄ˘C¸+ÊŸLà®”åàG
âKCAäƒ⁄Í¨∫sëÉHâ!Tò0ç LA‘3fŸ°*ª›˚–Ì˛ttê”…àC”7Õa`X
õK±*âCw˝Û¸Ï|í◊zÒ‹Ç:Ç˝”≤∏¨2wÓØ˚…£çÉD8ezvT§U›U’èÒ$ûÿÉ¶sÅÅ÷“Â˝WòÉ˚æ
6p_ø«?Ωi5‡ ®‰/…·—÷¡Qr¥ª∑s`‘&Œ>I˘›@e“‡•Ú9∂úh Fè’nGÚE5∂~]‘ˆxh‰ïKÇõuª’b⁄ácô&~Ï‰æS%#ﬂôçU∑Â ∏]≤Ùfòk•Ö9HP≠‚b&ø}º:ÑŒñn@=æik9ï∆k¨¥%ÄÓö(Bh%¯lo⁄r⁄èªÁìÏc~21H‚*†5o≠ùdÎâGA—ÍÅÀbWÎÅ‚UøÛÍÕ√Ïgnﬁç5ì¬!⁄≤”Å*™»ıÿû{·*¢¡VZPRFWVÌu…7©gï⁄=◊ÿÅ g°õÎ†&ˆºT{Ü+œP(J≤r“ŸIqñèH≠V)Õ9bi…g„òTl–_Z¿|∆|∏;ˇ≤€M®∆∑ﬁcﬂ˘ôÀé
ßi+X⁄4X⁄4n°†˙OÉ˙'A˝øæZ)’ÅuI:øŸ…=∆3£9”√¨÷íóY}ø“é›˘⁄oBg»úÀ¿û}ﬁ≈'›M,L€"8U€ÿâøØÀl˝8ï;æÏ6∞˜£äÀ˚.a‡¡FÈ≥u˛§â‹–äd∑ZU˘ﬁ`Qq•t‚ä:Ho4 ÚI◊ﬂ©ìo6\˚∆0ÏmK å~πìb÷Oœı3ò#•öl‘GldHm°ìFeOPÀ¸◊@S Jútíí±∏Nl¿õ·w˙ºÀIT]úgK4™HóÂÑõn«Ñ ËÏˆ‚#±°ø¥®LCÚâ"azQ É√$ˆ™Úˆ>E∫!qO‡Å…Ø,)Ä”˜… \ﬂÿ>ˆeÖ¯˚˛~ ÷âÏ´Uí´¨∆k®¿˝sÇ2Õü°<‰<…Gâ·eˆªƒTwîŒTÍtrzD∏e-j˘≥Ù©ˇÁ2»,O–•·b,êÓdëc¢%k¨WÆ`T\;q¨3RI∞U"¨≤(^¡6Õ.|NﬂE√ßú¿¡™†‰πîá§.Í.ùmX©OﬁŸs:ÊÁÜ{4◊cy\{âE‹∏™»–ñ∆*`?¸ƒ≤áNmTiTÆ#¢“QV˛5£¢©⁄µäVﬂV5È€Ñ∂≠ä;^À‰éèù^J;…ÉÈ8€)õù=/JÌBÎ«0ã° [œ?E;ÌEı^–R ◊9.—K£pÉﬁì|Ì≠˘ë˙v5	óô(6…zcêhœ¯»àÀ{uÍG‰vÓ	iﬂ=åï˘j⁄Cz˘Ò‹S
0m¢ê,8°|ÑÅ«◊O[√≤ÒWL∆q_™pÈ©JG8≤±Åwı∆$–ê<øAÖq~z
eXxÂ™Î¶c"ÿ¢ıòn∞˛öŸ1s`(I£`„Ÿ≠=ó{‰À-ıˇ  ˇˇÏ}[sG≤Ê˚¸ä2∆a6A )K¥.Aë¥ÃI‘äÙÃziÜ’ öép4(íC#‚ºÏÛyÿà›óÛ¥a_˜◊¯óle÷Ω∫™ª^$Ùƒ»DwUuu]2≥2´æ…6øu˛—ìYEÉ]*W'{aw˙e1RqUŒ÷‰U≤π"ÍR—jR.ljÅ”
i"b¬Œ–±q∆R≠ç4˝ıÌo”ìàO˝g]}(fâ›ç˛YcuöN–—A<IˆΩ|¿≠Ë„phﬁ7AjÁg	3¡¿k„pÌÍUw–ºŸ~µøC∂˜…ÓˆØ‰›ÎÌ∑oSæ)Åõı&¢´¡]<¡ÏeÈAäˇzèÆ}à,˚…vÁ5√Q¬TìaÕÄBÎZ+âj≠Ø¸÷?Yc!—&º∑icjΩdßpm?ág¢Êù‘°ºaK“qÚoÉ&UF_ﬂXhºRï…*í:àAƒ‡
‘lvˆﬁ ˛†;ﬂ(Täˇ2h2|Ä—)8– ‰dí¬;(vê⁄V‚·7`qÌ$:Õ§± K,àµÛí€œ‰}ﬁ	∂XÂ4_ZÑ[@z©›Õ√±:õ.∂RzŒ®Gù†ÿ™¬KEW≥„´BH	=õ¬À•¶h_Ã#ﬂæò©aÚ∏•6Áı≥ﬁaõly√ühRêæVm
éJ:íù/‚s{èœ—qYx≈˚jÆΩ$!ãÓy∑òrZå˛,!{Ìgo§ú4èS—.~V‡b9ﬁÌΩ<8¯€Î7dˇÌ—ﬁ´˜»,qã_ﬂÓêù™véﬁOUºÿxÕT	 Ã6ÉèØ{oçπ‘¥á{j˛äcÄgÂA≠o»ªxÑ2åáD∂?¢ﬂ˙øı˘Œ#Z]°¨EW ·j¿oÍ
„®2!eºañC.}LN*ˆ; œóP±lêöw>‹~±˜¢2Åñf2 ì5rpvÜÀû≠4±eÿ‡t∂æπ@ˇ˙Üãø0ê≈_º µ	ywt»?_/ÊØ%ıU¬vemá‚®ó–&kY–$¢øZÔ∫ ∑OÌWÛé”´l%˛- 2-Yªøää¿«A:*.Î¢•˛nWù–¸N¶◊ém∫sâ±Éü…w[F",Ç·!…Í‚O€0‰•U…wﬂ}ÉI–(üúıj˛›w§,Ó—4Å¿æ8Åø%3à„˙fΩ%€MqŸæÆàWZ∆w,L˚K•c˜;UMÍ/v»`{“æÁŸ¿•}6æ˚% Ä∞V+¬ï*T4Á)4•,á¿ÅäÀäâ&aS=®ΩJÇÕöˆ=O~+Ùw˛E'<µlá8v9c…u<^’ƒƒû'çUr(u,PÒŸ‚:">–ò(,j¬¡Ó¶TÀÙ‰Â5ì)ñ'ö)[”=ŒÙ2-^‚1ãûTà„¶∂øYl¶∞7Éj¡åb[˝s“dû≥¬‚4YAàÙLr!H!ë9Jı ∞™xæXãﬂ !—‚õ‰)˝˘üˇÉH∆Ä°÷¿üˇÒ©»c¥?zßÚXM„±1Ö«ÊÙºtT‡_Æ…¶<^∆¨U8ÅP™H‚.@»£ ]tå3≈∆XÒàc`U˛á%ß◊K‰¨dë@Íá√x¥C;UåÓäjÿ Fë€I“9d¬\kÆ›qóäò(Fqú≤≤„Cwæ‰¢©&¢¸&ÿEﬁS…§íínZôb|“ˆ’FÈEÛPT˙∑9TèØNpÄìì“èVvMPVa¨âr&Ï°‚Ô^LÀ˚ £U¸ûT>@—%ªôL…:Gâkoq‡¨ü-.+3EÓ˙*˘]$–lÁT?Éz°'¬è∂©íO@€8™äTGÌò6¡Ñp¢ÀådHüiøÈ¥˙ùÛˆò™´ht:à∫ÿﬁ‘Ë™˛£›°r
Ïj™§ÕÆ*·–7‰∞;v^Ö„è∫a»¿Àñ.Ö[\∏cÁbî∞`ÿë2w˙ÙZÓ√∆ïf3Cñ Ä«µRf°‰Ó'vπ®\+ß{ìú+tì2”}∂F¬Á‚~∞ÍP≥R÷Õ|tÅó]·ÈBÁ≥≥@Ì(Å‚>uZ∏5†'1ÏJ¢÷ßŒ)¬pj%å®ÍÌı zóÛ∏E¡w_Á›ò»~√‡LÌ)QM≈F6<R{Ï˙_1É®^‹$—'ö`ÉΩD¸ç© ®|%"§≈¬zÉÄ≥r≠9¨X¿ò∞ÕBÚ T“\t[r‚≠˛Ö{ß"Ââj1ÉReì÷ç©2«"}“≈üÅÙ)qBçÉÖÆ@∂61îO÷Ç„htùÜˆ¥ =Ÿ€∑˛Ω_“∫¡;ÜBø°yàZEÆËÅ“ì¸JØÍõ7’›]¬!Ô =<ÂàæçZ„Qµˆ®⁄ÿ\°Ù1f@.¿ G•åÿ…v{F!eEΩ¡Ñ|-76⁄&Tp}c´V√F‡¿∆±BC_a◊˙*p&ƒaµs⁄˘—ÅÅæ«ﬁ`‘GÎãƒ[äÔ ?∏.”¡hÅ∏ê÷
ö˜P˙•ú-à†Û!Rx?÷o◊kﬂBùø}T˚VïÉ

ié:ÒôÈã≠<HWl‰ *`rAg:¬Q7Øµ©¢ ÷	(_∏[ÉV¨Ee	˛u°\¸ìÒSLS√èvu«mUî0G∞Ó%+â…LN•˛—ó‘A´ù¸ÖÍô7zóÛmKÑÌ≈]ÜAÜ‹Å≠Ë˙€üÿÚyï –ˆUö{zá#Ãléæú–—2†Ω8¢u£	‡>¨7ò˙ªÊ˚*R•Óê$I¢kÃNÍyqrvØùπ˙VOÁZÏ≈A:{+”ﬂ‚x®9ºaD`ÈÄÓà>◊§⁄ÈWŸ@IÓ78®76·ﬂGµ)”˜ñıõ6G	vå$%lÜäƒÁ’<÷äêºÄÎöy}òp HTtC\Nc^5ΩŸ*m ó-kêÚÉ2<’=ìjRwâ"&Î≈∂-∞‰Kÿœ≈•§⁄ﬁŒ}¶êç≥^ÅºÍ?Ê~©|i˙Ñ'(ŸÄ U˛Z’D∞ˇâ«pñÅF¶
”gŸ<•È>-%›ﬁÔ_ﬂ`prDu‚†áé:Ó¢[T·`ºÂ∆
ybS⁄ô˛~G(km_J;ûá|3-ÕóÌÉéµXtÅ†¡∫ô0À˝úÂµVÃcÉUC	V=˘P.Ü⁄j!5ı§Çöí/¥0ëËhf!iÕ…ı }U•®ù|nΩâGÁ1C$àØ®©%7öZÉ™È!&@Áπ=÷tz>√˝ŒÚkÛ∆≤I˘~}€@∂q˚¡‡ΩUÎÙ!u‚ìe¬Ã∫2]æzî‰W|5òé¢DπUdıCv›L`LÆoÜ±N◊j
˙_ô√Ã∂£îvòïÕXJàæG”NŸHE1=÷/Cﬁ2Dv}TAπ6/oN7q\w:Q ÍVY4Û*µø`ÂÜ1¸Kˇc$˘‘√.M>»u≠Õ˙Î]ÈıwÑÏyøÙë◊‚l˙à[át>û∂9"™¸˜üp6ôéñRüct‚Rx`î∑Ò´ZLÛ·ÛﬂIÍ[*f“ÉŒàı√nÏNKíÆùDWlq3pHπÁ‰ÈÏ[»!…_0I˚¬¨¨Çûˇ'bß:é†|—
‘∏ã∆ıÍqÜ≈‚E¡@∑
∑ä'ˆ¶®Ü£)¥ØÜ=MZµ!ª˛j>∆*v˜6∂∏cZr˛˙{ôy ƒÜ˚Ë4&ç˛U^ﬂ≤PöË>c<1ﬁØ≈œUÂ&?Ã+~egWπô™¡¨¯gh>y6X;@¬@{Ω˘1≥πÌÑ∑ïÙãÊ:5n,[,’b/©π‹úãˆjj?ó≠eÃŸı-≤#¸>bÁß÷ä§¢a•›±K’õ„p÷≤}k[d∑¶É¸Üµ+)Û∏w˝qÑ[ŸˇN€)6¡›&¢2I≈%4ÜDî:µ'Ô lûfT¯«t¡º–≥Cö‚wD°∏ª˘S±BÂó ‹'¯Xﬁ≥x'≥
÷JnGâlUe¡∏ZG«T°„ ¸N˜CU7ıÿ~˚v_{Ø´6™8iœ∏ﬂ¶)BwS˙ª”ËÚŒSä>s˝¶N4(ŒkNk‰£ºFìÙÔù¯‚Â c«-e|c L„ïF( ãX'µ≥xH
R·g`iª‚E= ⁄∆Èâ™ŒÆiµ™u…ƒˇΩ¥a¥oï8‡úDsãîòâÇ=ÆNÿô/”µõÍp5iQM}±†Z
LÎí˛»[k|˙3ûF?oèÂ¶Y˚Ñá˜å∫<⁄Â=˚ÿ≥DÏ;ÊEiÎW‰
Ëöq…∏ªöúéËÙ⁄Ôè!Â∫kGü:@*%Ω¡ §Ã)Eoú…®dƒ&zwö’u~$Ó^!Îµö:Ú7Y!˘”ﬂ•bÃª∫’?Ä≈Ç◊h¸CÕÂ¬⁄Ω• ùäuû>ù»E';ÀW‰ÅU¬8ù«„_·´{Ïﬂ#<¸˜Û¡/Ôˇyoˇ’œG„g/oTTÙø#m°9>≤RÚës40úk˛m)¨´⁄ä¨x5ª∏”.ê÷ˇcuç4*Êﬁ˝Ù∞‘O5≠~„r”óõˆ∏‰ã-¯¥’˘DNª¿mOÌâg%ÙUØ´è–ªPÌ∆gö√»Mı,j≈’Nüõ’˙£“sY”õµÔk‰Á8∞ó0&ﬂ≠©œ±_4¨nêÊ9-Æ’9T7kõkıi21ˆı¨∂÷®A¯x´«ç∆ÍÑúu„+Êé©≤yM˛Ì"Å‡aµè/„∏OŒ£auù$Ì®5∏¨&=≠¬È⁄§KÉ‹ç’M#Õ«ø3°∂“≥õ˙£â^∂ØÙF≠F_=ÍÙ?Vk%≤fïBﬂnﬁ°˜⁄©≤Æ`€}\mv¡ﬂ~õLN!Óoø\OpÏ¥zŸi!lÕìPçTzŒù+⁄.MˆO◊⁄©S8Æ◊†≠ÒÔT767Io\≠≠nÚ™∫-9@ÜtU_z.åSüÛ
4Ø≤É≠Rô7ƒ®cZê>ùÁàÒ0†˜≈x≥˙tmh5ﬁö’zÈÕãÒòöËF∂AYû›»…‰ë#ã>ZØËP^WÎÙªÈ®emÒò6}r[Ú÷–™µ÷e
ºyâ€)XÀ>¡AÏÏ]Ω7B	¸´.s@!<LïŸ`À1¶’‹l/ÜıÉüh4k$ïñ7£1´Â¢!µ* ﬂ®%]@ºﬂ?xø¥ˇﬂ˜v…O˚Ôè*∆‹øqô§‘»*gÃH!à÷Ì6s	Ì±z)5ƒi©}=˜%ˆhˇÌ>lË‰∏è¢nãOeî"«µﬂkø?^˝>:oFÂ˙£ï˙„Õïz„…JmıqÂ$5œaVo˙&UPﬂcΩ"⁄‹VπÃﬁ°S}3g•[ı|‘i¯∆YR≠ì^kK˝lx§#ÌiÁ¢"Z4#∆≤¨¸’©ªÑ|åØü›|HpÇ¬k´_ﬂ–'&é¥Ü^Y◊ÁËìö≠UDkrµ¬'p˙Ÿ¶R9sÍ!pMQı√$a)Uyª]ΩA-¶ÍeµÜ/uåjû…€l∞=ˆé5mà√˜÷7”£-≥Â`Ü—¶¶R±¶Õû^K£Œö1`…ﬂˆË˛†5¯"œ«∂9Ê’∫ı≠ö$Æ”Ø°z´ÅÙ>Kœq8—ŸÒ»˝äÿ50æF?˚ÒÉ˚çèƒ[Ü5“¶®ºYÖ†zu:§"™¶JœKØüîR Q\◊,qÃ{˛ÄÈgI†ØüïXÇÙËÖKi÷8EŒ§_^ÜôÙ≈ñM€-\V–uxèö–?F{ÿ,Âíﬁ"tçGzJõ∏ö¬VÓ6êπz7¶Ö¶„µ˚Èπ¢Èy.z4	§à⁄ÂÀê/u©ˇaóV2U«CÊÃU‘›Â‡}V¢Õœˆf±ˆ«àå+ÉgÜæÎ∂≥ìkÿN3¯ˇ£”∑ü›¨O“™íg√9ˇz¿ù~ê∂_‘«(ØT&Ò®*·|%ı)Óœ†§hn™§ËøK%ı9()60ÓF5¡ 
UMü∞û[|‰›¢R≤^¸E´#÷T—?ñäh©àHqE§=†ä∫É”TÕMU˝w©ä>U$Ü∆›(#F° H"ZÒ—wãÍ(ıÍ/Z!â÷(!%€R%-U…PIôâ¨∫SNb}3•·˚Õ⁄wpÔ}¿ß◊QﬂÔ ^ﬂXi‘Î+çı«ãu ãZîûÀ&.˚⁄uRô ·+ö∫·uÈ™!§€h
ÎdxÍ.ëcg¸?`É≈¨Fa÷6MKõD¿∫i∆X¢cV´fëˆL–§®;úˆ≤Ñ),"Ÿn¬í3∆ltôÆ±È5Ñº£ÉPÓ«qk¨l+(‰” é©)®M™†‰áÊT,{3—R⁄Ô7W‰= A&c<\}*.∆•i>«kß∏Ì=3äúcÎ•7¨ÛS¯7?îeö‘g∑˛XºπÆL@e˝ôØöüµ∑”é?ç˝˜∏óÉkÈçt§üîZ:æÔ-~>™÷±±›–∏Â[ÿÀW	÷›È=∑¶Ω’∑˛~Úd•^k¨46Íã’ﬂ⁄Vm≠«˙P*rGo}ü›QﬂgÙQ†0£M†◊è-éqã¢ƒºõŒy¡ˆ6Vøæ·õ—&UäW‘tê{(yΩƒÆ…≈ò⁄v•ákDLahﬂ-å m¿gmÈö¡#¬Fﬁ›¯C¯GÄñÒ)¬ªR.ûyjà˘MTæÛx3Ulj^ÃTí¯Àõ®Ú´≈4≈`aôM&”Õ6EëJl9Cµ+cÜZ~~sTûXƒ,’é,dûÍæπ/j™NhÿúuŒÓ˙∑†T7Ë‚v“W«mZªÛˆCöøôâÇño˙Góß‘w6Í˛{K#@…Ò/∑õ+ıÕ«+ı/∑T5¥/õºú’Œ∑≥l2ﬂ<GYugóÚÊ1%∆x≤·.ªi¡¢=+§sÀﬁ◊Ùêê˘ßP™Î5}‰ßO¢zÉ˛ Àﬂ…‡› Óòw Ïñ<µ∫ß∂Á»√sËº=è«àjÁÍ8åí¬@ØÄ+˜1»»ëÔù7_wäÔ÷≥œ£7Ω¥ûËCFW<}ﬂu˙ZX‘~Ø\ÆàÛFM⁄ŸÄ{©ù≥≤æÃﬂ9üµ´¯+ÛLxé·@%AcÉGob-BN«ˇ£%m8ƒeJsy"oc∆√ÄÍΩŒ¯öˆê6Ìq{¸duèP‹«òó §Øy˙v¿ù
ÄÈﬁúŸ©˚)J9&»ﬁ« XÑ»≥œHπ5Œ¢ÉáP®T~KmÂJI`∫¶[£û∆«\úúßT5¢cùïn=ç◊“È¢&nø?f9èk'ïb›´ü ˛v=uøq¢≥qèhI^M‚Aßûu.ÒÜP˘9noëoì6m¶oW ™ë˛Í_–GÁî˛PPÌFä~I¡\—Oc∑ƒª°aÏN°¯'D`à[¨g¥GπìÏ(∏&ß0R=$0ÑÃÄàµ9ôÖŒb¯“ Ù≠ïls%Ûå»XEfhë&µ#©ÂuIÁÉ64˚47µ¿ÓÆÃ'+ÉÆh∞4∆ä‰ˇ[!Ò¯tµ¢’”tU±ŒB#®=áÒ`©π!È…ÓÊÇûhﬂâ3Å}Ï–;Úƒ0àjàù«Z%GrÚ¿Yu˛Ñƒ%ª¶JœBì≥åáòÒÒ›ıbòmæ7amR/˙JΩIX#¯„©x)’Ì¶?Áè˜˙≠å
i•üpìˆ©÷^=*};C¸≥Ø÷Í{Ù2‘wq‹yG˚È£G2	7∏˛-+ ®I›Upt"GjGÃﬁíÑ¿8ÎGeí	⁄ 9ºUM “aÜzäN5WF≠ıWYI%‚K∫˙»ø0°Åê e¿˚9˘ÕJjdàA£BºA63ø¡g=°"˝ÊBÉAnbŒ¢ ≈A∫nÅ¿Ö°„Ë|ïÃÍx84∑”Ö*]ƒ
öŒTs†Ä¢úæº˛[ΩÂH º4≈Tálqo waêﬂóƒzFÃÅ!Õ `¥cqpC¢_[ÊÃGx)4!o”Ø¿M†çè§$-IÚïà·õé®¿∞Ë_L)€Ô£}Œ¯|i3îY
0ÑjQV	[Jß`5HßêêÇΩ‘À0õAˇh4álZªI.€™Dç¡ÚºYé$X¨ı,”Kg¶f:Ø∂xUU‰˜÷ñ	UUÅÓi{wJ´ö∆CoŸr\πä∑¶DÍ÷sˇKÙÒj79}»ÜÄ≠¯"ü÷£KtÎŸVj‹–«lÿÿ•63Jm˙KÂçïµöﬁ‰ˇtmfZìÔb¥-‡°Í"_6r≠Ñ®tµÌl/ÕlÕÏlbF¬Î™ò]Ø+Z≥e0Y∂9…◊¿√±≠”vπ¿)ÜT'å©QIglàß⁄Úu¸â™â˙PÌÙ":|'k|Ë(NÍv“¢X‚äPHÙˇ/ØÎ∆z3~•≥cY∫ùœ*–ÿ"á1}Y+£
ç¿*4Ï*4“Uh§´∞N3¶/N◊@é∑¸wØW|O◊Ñw£Íz™%a√Ÿ3{»‹Ê^;J0ËÎ#a*‡Fb√—∏πcôX∆C°û5Ä_≠¸îî:æ!¥¨∏sï—Àá∫˙Ñâ`õ◊ª∞]h∫rå⁄óπN‡/å›˘Q»—‹'ÙäèLΩEtYãQÕK  <6π«X
|k:I b‘ZU∑ÖXvŒX&W;/RﬁEÑwnò»˙„T9∫pWÿU©JÈΩö6#ƒ±@»Y‡–èH?÷Â≤˘Òñ¯Æºœ”°ºü$∆¢„s¢±¸C	zÍEìø¿LπıäÏÏù®Sx⁄t˙Â“0a_∫ËW9S…1∞h.^ñç¸˘Ôˇáú“¡•µ¡Wl~¿‹8—?]ª”Ä*'ÃªEµúÎXé-MhÈ:ÑsÎ}ä∫‘0g˘SrçE≤î\Bvåuy˜2˘ò¯√ΩVgÃÿ™~ÈóÓ!ë“Œ·ﬂôªjÔÍ€ó°€¢î.0Ñ‹u˚º uµj»…§—Ñ∞<Q∑+“q∫ ÒfF∑+ä<QH±TÛ°…P€åÀHH (›V4˜
¡Ë\t  † #ˆî√ë^4§„MGäÖú*\í‘ﬁ {ø¬PAx¿
‹z≠N∞ïΩ∞&c‡â0™Y*±Ö˛Du7ná?ˆµ:óN~¥j¯~pâﬂ™ÕÿYó¥‹çqÁ`J=:s®Êƒ|	f¸ à•›üˇ˘?©í’	6≈>$%k-°∑∑|Ø—	⁄ª;¯Í„Øo:(©èk#˝â∞Q¥XÁ-ƒápöq≤≈“iT±ŒZ	5+ÖÄŒ%¢±\å5]a‹]˛Çpœ3c2ﬂ~˘-2ÓîU™
ÉåDÌd#ÉX©§¥Iñ*±ı}5P’˜[1'˜(UÙ≤r†[2_¨uˆØt‰A•ﬂ¥4⁄¯—3**-≠’Ô¸˛â%$ÅË4˘3Œñ–O´V´‰h˚oáÑ˛ı[øDæ◊ß!Ô–*Ïø'%ıÊ é <‡5b∞(bw}(}}ÉÛ5ü$Â)≠ùØêoK•o+ìí*¥dÒ'-Ωíñ/‘»¶"3Ó'1¿Årà]Ê;fèu¡±›£√'æp¨¡ﬂËRû∞oÃp^ü‰Qö}lﬂ'F2ç…jÑ/ì˝ûX
]›gËˆ›Ù∞OÙ∆{ÇË\Î∫ÔüA¸÷á˛€˚oÔˆﬁÓB—øv˜ﬂæ“∫”lWèjﬂ|;ù∫Æ∞“∏°√°ﬁ•Ø: ª°HË∏ü¢^ß{-Ó#8 ˘62ê“¡Ë<Íw˛%U√v´5Æ˙Áï^füÛ◊Ò>
ä“È]~∫zµ@àu£«NWœ∞BÆ'ä≠\ª9lc–ƒº9–Íl?ãX˝Ì€Hj$‰£“Ö Iﬁ—ñáÕs∆œŒ¡€£Ìù£CÚŸ›è¥Ùø™ÒcvÜk¸hÌw;„gcã±∏P¶t«f}·O€Ë…=Ú˙`g˚hˇ‡≠6?“Óà¨!™›Õ©¨ªÜõ[‰2∑w€Æ6⁄`r;≠^q!†»Œ(é¿L1∆*‰Êïë@e˚˙(Ìªlıî7ã}õΩd÷2Ç¨›Æ∏ÇøLøÜ≠W{o˜ﬁoøBÃ=≠Õµ6p(ÒëM¨5õ›AìáŒ_“?À«Í3N ∞ñ˝Tÿî∞F˝x⁄øŸ¯Ÿ≈¯¨˙¯GŒJªÅ)ˇÀ˚◊º˘ÿZÑ˛ ¯¶ë¥€È√Z£58ΩË!24fÿÎ∆´\äÑÈV€£¯å&¶≈k7i5∂«¥;öc¿e\ˆÅîà˘¢‚#ãƒçÜø≥eÈÔ1<Y•_Ç"¬~å¯ãeÕöÉ÷ı*òÍ˝÷Nª”mï·ÌzÌNa›Tvf≈Ω¡ß8ï-ãGÃ∑b•4„”rë¥\$-IÀE“\I„‚ã§ﬂ∆VINıı€ÙWâh
kº\XçÁ∂>2;3Å4∑˛\.çÓfi‰:S,çÃ°ìø6ö€–ÒØä<7Â™®õYÕÂr(£≈ÉóCÊ  YÕ6Ç<+°±s%DÕQjÓ„àX˚‘ßF]R≈5≈ÉX•<W›‰æ.xﬁÌ˛d-w“€«ã-}ä/~ú/l1œR€ "âÔÖYe˚µhs"¯Ù˛ﬁ>∑:E íN≈å«4°Ω´òf†Î
k€Ô(fƒ]æ€wÚ!µC»®ó{Û)]9´ó±´íCj≤ù$ùÛ>y2ó{*˜s§ñ9‘û7jòﬁÈ´ùggi@Õîæ’äÌªO∂Aíƒ-^¡l“’/ªM™œQˆ¬JåÄ	!cKuèy?∞ßÚıÑ?tØAåSKÚ—9¶éºX„[≠Ï·´û§?E=c3◊7Ûy2…ò≠hæΩﬂ ŒQâ¢JÂ‰‹≥∑õBõù»á∑
U–˚}$Om«›!pB]Ù˘˙wßi>∆dx—ÌVAÑ*‡˚Á‘Í÷0hbõü¯ºy≥ª˚+2∏µòÇõRhÔ»3#∞’®»Ïs_Ò<Í¸Ã€kWÇ<6√íœppÊö^bSÑ±ôS⁄ı‰√zÍa´%6R±X(}5°Í".W’/πﬁßrß◊É∏-<á{}≠Dåÿ °ÌáÂa‹‰ÅøqñD ã]˚-—˙+†ŸŸÑJù[%›ê,•≈ùZ–ÕGX
n[Í–4Q‹°)˛ﬁç/¢Ó˛Ÿ€8n≈-˛.kûÛ¬@=k≈¶›@|ì˙jáA„©∑ö<}º%n¿◊6^¡Ÿ•6éË‹xb{ØlSEn}ä•(ÛÍ…ßô[=≤ﬂpÆπ;Å&˘\˙¿‡õ·ﬂ∆¥Öï@A˜¶èÑ˚¡”?—¯≥È˛•[¸ªÃæQ“X>ø/]Ñ«ƒ››è>ó˛„∑èÇúÍíªÍâ≈S¥L|ª·~_xx÷FN°ZM»Œˆ'j7EÕnº#\“∂G£Ëzıl4Ë·Q˛√x\˛Ì®≥ôÍÊÿ	cÈ÷|!ŒQä¶/≈9‘(ëtπ≥†¬vπ[{=¥´7ÄUúß^øÍ
¸<Fè¿∞sé–?R«§©wUΩdË+ ¨q÷\VØ™ÌN´˜!<ëÏF£è ´õÁ’„ø÷û‘ZıG'Ê)nÅÅø–ÖF”2ûJûéù]oòƒñè∆K“+M>L‘·k ∫·4∞Ë!c+_Ú2 fÖ˜6Å>ñU∞ô:ó˛Ó'∂7Õπ˙¥›H‘ÔÖ–õ áÀìpK¸ú>]k7¨◊9Äû§–nk‡6†Ö‚s›ÓG›k:˘ÅÛë72,Ì,ÄÉzÄ’2!¯@¢Y…øË7[GÙ°”—B“zØAE ÷)V~GÉs8´w<æÿI´`A”‹Xèëôµ4/^º∑UÊ«˘Ï˚ÚKn"ßr)ï.Eè`ÃXÉ¡ 7p!çÓ@ü‹.ÑnÚ∆ƒ·Ô*°s<ıeÓ&H%#T,p˘‡xF∏–‡C¸…&bÙ80<”xü’øª∞ŒólÈ/Ÿ¥_ Eˇ˝ÉN∑ÀÔ’k5Ì¬V¿∑I¨¢µG5[ÇX–&6ÖoÊÁ(dñ,˙h”¡äÒ8˝5i¯&∆@q„Óg¯∂√ˆ‡RN=F(◊ÂÙ4ô≈ß´ºØq@T9RˆÆcåR∑ò.ËÙ1†Rº|Ÿº(ƒ”—øŒ±Û4ï¸¯j|pv6◊JˇL¯ï∂`≠«ú§(√–e’⁄Ü‡*Géõlu¡<l∞æ )~gAÚTNJfZíëã¬^Àñë~CÇˇtàŒ‹OwJQMÑ=™Ÿ2ÏQÕ∞ØfUn€-%}C˘Ê<Ú|‰≤Oíï 'ñŸ`ºp#Í`»∂eJßßòïO‘u◊DµÊîg
›‰zBñCz§L©Œñtiè´5f79àËùÛΩ®N*†‘⁄!j&ÉÓµÿG0Õ™Ï≤∫ÒÿÄ’„ùâƒ›¥.õ5«Í¢.fd0[g‘òﬂÔªf!∆Cq;	,®∫oÃJ•hÆ9˘|ÎèÙd2ñ!Z{Ö÷À√ÀV »àÂYÉÙËcàº“Ç5≥}óG,…OËS˜Í‚öûY,dπ‚û]÷A5+Üh_ôC”ù)óPÏÊC¸Ë:X”ç41X ($Ë∆gc[38G+\jƒZ¬Úâ9ƒ÷ùÜﬂV*€¶ëÎá⁄¶õ8Ãç√È¡ î„ÑÀ∂ÜRÓ„5.sÏaÅpÈ%Ñˆ{uÿ‚ Ó˚ıs‹-Gﬂ=}ãzöà?∆ Ñâó#!é@	Zx¯—>üw¢Ωh3ñlV˛”pîJcÛM‹ø¿¸A?&á˚o_Ωﬁ#ÔÈJ∑wÈø„6Ú#ÿè_0bLb‘¥4√=ÓØ¸g6<¯˘®”"Ö	éΩ÷ñ˙π¡F+8æ_√¿‘ù*>ËUÓY¯Â¯-yºì–JıU≤ª}¥G~⁄}¥˜ûÏæ?x∑{è∑ñC—˛ß¯◊À∑K≠ñ–÷B÷ <†\íŒ•≥&Khü:êÖΩ˛Ó0∑|=«oYh…ç≠ÂYp[~»Mb∫*7LØ‰∫äUÙZ3.¡7ëÁ:{Ec¢úk–øKÓ¸àÀÓÇ7Ú⁄πê˛~?4á>w†6?ï0Ò∞wH[É€rZ[7eJÍÙ*MBZ;⁄Ì∆øaêJª€≥›øvÚ+:3ãmÑ4˚áØoR8)ƒR∑>sÕÄJsJ˚+∞_»ìHÄì∫ﬁÌViûªÓÒ≈˘⁄Î˛ØˇÁ*†∏Öâ¬·C]T≠Ø5HÖN≤+º2SªUÉòö;\ÙÆÊoπ¨>⁄ IoÎ≤˙C√ÁvYü…Ì¢Bª˜ Ì“ﬁ(FÂaIãåË'€ë ∞äY∞≥Ω¬‰‡wyÈpo «L†¨HŸ∞"¶Ú	a∏ÔÄù#Ï·Tw—vzd,Z‡B(ƒWº∂ÅK∆GÖ¬˙yW9pÖô ÍÚ,s‡2\¯◊b]ì‚¿%K`ú¥∞U°.á8Ü∆»»·pÈ´ıO⁄ªÔ^ÏàkK+û»¢m2ßódkè2ﬁ·VBpeP^Ù“;øˇ¸ﬂˇA∂i”BC·AÃûc{=¶bê&DºÖ”ÕÄ6cﬂ™
.õÍ@‰1óK⁄‰Ëo˜4»a·ßh)∫W%ãÏ"C˚•£≤%üøD3⁄Ÿd*˘¢á‡Òüg%ñ,k4ê@öRS9õ\%S>óPô2än˘ºñPÚ∑£øßAnOfŒ°LN˙∞”^åΩe≥1‡[r±q˜ƒæ’≠ô*–3-5(‚Uj¯“ë¡`˝ºúAA°a}AÜ·À‚L·
`˘¨'¶é©º†]ùú∂„^ºEó@O
múõFú˚\[æ>OM¬ï≥:ôVn6ê‹T ÍûJN¥¢Ä·WdãÕl©©fúX^ñE…°9˘ö34ﬂó ß„ÒBeµkæd≥«π3QÉ∆a‰d2á˘ı”h–ÀõYπÍÆïó©ñ‰)œÃ<öIŒì`≈W†r“óø®†™$Hi¡UXqÕII¡ÂWTpyî\ôˇ˛å‚£¡›çaq&y ,‰ır¸f\ãøY¨é≈µQÓlﬂß≥ù€t,∏@´zÂëcOﬂ¶È
ÒO$>LÙ0∂u|B9tp %jŸ›Æp>[P+9}sèÊZ°…∆*Ÿ9x˝z˚Â¡˚Ì£É˜,Di≤©P•… ≤YÍW`k.Có˜6t˘KáhÓ&bô%ÅK<Bæ›µèe°ÇüX.\à≈b$|äáÎ±âÿª≤‚°9Ï}ÅÔÌ-˙iJŸetùg‘ ¶(MmÙ àÇú2‚°r
Øp	Ù@B£∂@ ë*ÅK4ïèOÓ,¿ö∑∏-P’â¿Ç´NŸæ≤¶Ä∏@´˚"´uò≈ÊS•ÈÛ7É‰zÙ:\	≥ÊZ
ã
∑ŒÍƒŸiÙ6”â‰MX…Ÿnùß	ŒÌ¿XñI‰Ì¢LÁ£[≤òûúìá#[x<,√C3¿ìÉºØJ•Á ı F@U´O◊Xäå…k∞¥+D\ü”_ã˙Ít"Ü È‰9˝˛+›s^cÉrû¿ s¸æNj%Å± &mÿúiù[…öÌj„±¬SπÆFàÈÌ;ÁÏÿ¥gGˆîÕèU…{”3N≥¶2«ıi«ß_'à˝¸4”∂±†m‹◊SF7(¶G–~æ¿◊P[hxó…¬ÃÍÃ¿ ÷$ﬂoÛ›cC5WŸ\ºIÈ◊±?≤Ópiä  .ÃÆ]1≈ühQ…
”qπ¢—‘‰
aˇO4»0‡˘
9=	(6':WfºóWMÛê≤iö◊˛.{v±C@(ãÛ; Uq¥f% ≤›3d˘2@•÷W…Œˆ—ﬁ+@óX¡ÅÆ÷WÅyo0ÆÄV\Óm@‡(:ø´xÄ∏˝¯ Wö°yÀ¸yqÄtF ä∞}Úà;‹ˇü~ãÂ˚œ|œCı˚+˙˙¸%÷wˇ„*iHWÒ" á=^zˇ√ºˇ∫8ö¬Û/”ÏıOIÙ•«ø®«?ﬂSè¶Mp_É¶∑_àƒ¯˚SÊœLæ~Mñ,˝¸Èk:?ø–áAŒ~7r¯gËıœ1¬ÔÎƒ^z¸µûÙVç	ßÊƒÊ’ö& ÜyùqDÌ*Ç[Ìﬂà g)]ò\«ce‹º‹òªÍ õx!Á§|ÅµvbÜ1ÓS #8îQ<ò1M8c∫ÄF¶y]$ú±†ÄFPH#(®1MX# ∞Q0¥‹»˘ËI≈?Áó°èeË.}l¨íWÔ~yG^>¥–≤Œ4Øı»á∏µ|W~.„˜6ÓqÿÖ¡ë¸LØôu˜÷£ »ªπEnéùÌ l:LÛÚOÓø‡ˆ@lF'ÃJ~6c{Ù<Q ∑N4Œ6ê”ëÒƒÊÑ,©•ä$yX)óÒãe¸bÒúd‰}ú–µ}B^^{c!‘Y5/u÷H'w'ËÎY∫∫ÌRmH”·¢€I ôﬂπ≤¨8QºQæòÄáf´»uaç¶çõ#
SUà LÅùCèîvßãa(!°ç—WO3ìxàõ2˝A F˘ã\π¥M©ó G.32’≤UÀ/»¥[ï}ÊaX¥ßù¬0–%ﬁ˜@A⁄Ùˇaê&ﬁÖ§G´¯g8—¡è§S,k’)◊öÀ—øGøn%Õ2Ùr¨Ÿ†?˙,gÖai.g«g4;ƒ*`ñô! ∞fÖ∏˝yŒà+4\è|Î•30ue9E?‹é;–˙)ÉoP˝áÇ¯A˘∆åˆÂ(±ã¯KaW÷~)∆‡–˜‚{loeØÆkÀïﬂ1„ B—hà”ì∑§µG†ÓW¿æ˙πè¢—i˚zÀÌcHçï¸6)–¶lºé?QÕXﬂ"ÔFtâMÂ÷Ã¶Óók,è3˜T¯ñü•ÁıdÏlV∂o◊âπﬂÑ˛ˇÂu›%ôR€J‹Z[E÷XQ&Ï’ã˙◊ûPO¯ﬁ5ß~≤ôíY¯3t”Z˜‹c∫.∆›N?.bªd˘Öß%ÿ¥\”∑p(#∞ãGìÁŸtZBÓ˝2…¯àÅo™äCÜ…¶n œÜ∂ÎKWø9ïØπ—ÜQ9h›ÎaÄÙm≤ºP∂ò¸Üuzq÷é´√Qá
«Òı\´ÚéZ†»a:◊JAâj¿=YÛm	µ.º Õ<Î¢\†>≠ãﬂ}?œ¡ ı◊√∑sÀm√*m÷ÿ"áÒÈ (uÓ°>kÙ[Û—gç˘È≥∆Rü•Ø•>”Ø•>[Í≥•>ª}∂æEé‚—∏s/’Ÿ˙hNÍl}~Íl}©Œ“◊RùÈ◊Rù-’ŸRù-RùeﬁJ´ºTåŒ£√ƒqÕpø´!ÿ6mﬁ=Ñg{ù]Å∞ÏóÙ⁄g'&vΩa7ß∑˛®7©⁄Ï≤îé„/]ƒv⁄“eu}uì¥Ò_À“ƒ9ú^$[@Ø£áq¨f7¬ö∆˚-œ;€ìœøû»œO€©®óc‘©_˙éx0µéﬁë√Ωù£˝É∑[dˇÌŒ¡õwØ˜éˆ»—ˆ·ﬂ3É(¥ßqıZP3¶∏√l3j74ùQ—Ñõ58eµÕt˝·?/¢QqpxçŸÔO€Îô±˙{DES∑ï3œ‰´J–eº≥»Qî|${˝1n+ﬂt˙ßpG¢QTûÆµ◊≥≈√n†å[™PÛ§÷êrfí:ÏºL•8Æù–Y§™¬J´§~Ÿ}Hmº«Ê—Ë∫M“ﬁäí∂=YLíw˝ú∏udLoˇê≠x÷~; Ωh|⁄í˚éÍ¸“l¡ú>iÊÓÈxR∫‡Ìó·
È¥Æ<Æs]7tˆ?IÅÂ¥tÀ8fÜï∆ÉeP2S-∞u¯¢_Âï,ëÔ°N◊ße`7®‚ºÁ<=˚<ü¨nÜi,‡,≥lqsC£¶ùn®À!’É¬∏fhv¥xˇp}èˇ¥ë{#©˜ÄR:F]Hªn∆I◊5`¡_Ÿß‡ÿ∆NrÿÅÅGû1¥çZªÒ8ÍtıÛ˜ê¢‰?îpx>1„1€ÄZØvré˚È´GqTáÌÜ˛˙F~5‚0∞;\Ê«Ëa◊5£
Fœ:`,üMÚa-P5çsxJ^¢µ∫uæw3[ﬂ~ïÃBFî}NOoÓ‹ì´G	µ>?S¬"˜Ÿ\\≤¶‘\9G„ãÑÏp;‘·rV*óàQ]jœOñÁ%}≈´…x0|7£s∂M+Ëÿ'\‘nuc∂≠\z8˘ÉK∞ﬁ^‹Í\Ù≤I’tÚ‘>l∆Ò¶.É˘\Ú„?Ö)6'∑ÒÈ nÑ‚m˘¸4ÈãÕŒ∏è¢nç>˚Ù[|˛◊~oØ~Dˇ?:oFÂ˙£ï˙„Õïz„…JmuΩr‚u•ØÏSf˛™Íí¡sl”Ä≠Åp~øïªjÊk÷ΩgÕàX?áúœOÍBWW ™G Lt(7ÒûLïÅ†¢Æ∞c‡ˆ˚©¡√÷b•Qõêd<|åˇ—iç€œnË1Ωˆ‡æÜµÁAÚ…}Æ S?XµAKëüÈö|D-üèÉ(ôàb+rX√`0T≈Eàf~}CóÛª◊˝®◊9Â”tX*éâRbéÖRe‚3â8%®iÍ¥/w#Ω"ÁëB!M+x^Ä€ï°„6äÁm+tÄCVªÂ›†l_asß»»∆≈U¡/}¸ªÖÎ‘†î«J´ßÙm∏µÍDGÛ6‚±$[Bªˇ‘çŒ…7‰5µÊ◊~È£Qœœ\ÖåÛ‡MìöW¿V˙eûÅ©b~ç˛üÖyíƒc·7g 0\äÿ'Sè®ÅÒ»/öóÅ¡U{“#ÉS*Mh™®[ ïyıºKW≈ÅW∞’Vªsﬁõﬂp1SÑø{”X)õTÇ¿âsπ2—“6¯1wï2¸≈[Æ∫s„±†}rŒ]`fıπ[Ã™ΩJ)*/”y≠≥ˆ¥Áäî!„ÉØ·ƒÉVu∏cW\§’∆4Ó^VµÕe·zÊ›M3$π8´ÎÉò„ £k6,Ë
åLH•xE~eÓÍ…1ëV¶‚zäbójı¥Y&g…&9Îtª˙¸Zw£∏ÆJÊÃôcuÂº`µU”iˆ ¬DôcMŸT‡≠*ÊN¡ZŒ≠.
l#ÙÌ±“ß4`ÓΩA0äˇy'cˆIë5J~[¿ñõ∂\µ∂Ôÿrt˛∂Dòd÷◊πùê≠ƒPk‘ƒk˘kﬁBV{ÎS|ãöL∆“∂K€µÁ¥2OyÂ≤.dëó(á,@∞¯5Òƒµ
ÎrïÚ_ÖCÑÊú„Ú§ë∫cW´®O4L∫ó+SIîY|üSz=s%–ΩÛt˜qﬁ∫w≥ò_s·Õ¯2ÛÌÈ≈˘/Û‰”≠˙,Ì†i¸îEE”\|ìüâWr—˛»ºÒ6FßÛ>rªù√wN»õh¯Æ”'ØCF´ù‡[Å	d‹X«∞µ´\Y•ˇÌ—ëx∞•ZµV˝(_é‚≥g0‚^T“™'ÍK~uÀFu÷+lì‹≥“Ôt4˜?Ê¶£∏˚åÆÚ√∏Oá_@ÎèF~îuÈ;IÑ Éò;¨£AÛ-\l ‚ççöΩià•cÆ#M”J«ã|ﬁHMî4¿AûbŒˇ"·9†çAZj@ç§Ùµ9R&%*ÿ	Î4pIÄC$ƒ€úSHÄÒÃG?S O““^tE¿"˘ÈZîcd;qv’SZ…Õ®uûø∂ºA!≥Ã:“qÛAY`∏ÈÔF$ÔP”¡oí`©ÎÚYijÏœë@ãlFÁn ≠[≥úµVupÿÃÌ/5Àıô~Éñ2˜ô(¯‚2Yﬁ§A«Œúπ˘A1±Ãll~l¬¿Ñ˙F1SH£*…ôJE3Æ8ìõÈM|ÆÉQ˛Õ‰Æƒ/+`z†ùçm˘§Ω)º[∞µ◊6≈≤∑˙≤3bΩÏZÇ/Ò≥ﬁË”+¿F%Æ¢$QÍ“vŸCSÓµ:„Ú»∫Òw$Ó∑PÄÕ} éÈhó21√ŒIËÎ¬äÿ˘W<¡ñH8ô7ÈÔÕê·0ºb“äOÏLGµ5Éi,üUgg -€ÿ‰jàL≥;	ø>‹ÏjO†}’x.U¨{äL#_¨ÊØR§‚Ÿ`‘ã∆GÉ7ovw˝µ,?$◊,	vëÉ`CáI@‰›`›‡Fªôﬂ 0,ÇÑ”ÇßÊü∏8˜ï6îqâuàõ∫FÏ-Ì2(‚ÀÍ∆ÜèˆIF¬=GØÊ¬i£_Aö›—:aºA>‹·TÒÇCw±¬Ö£∆}ÿgÑ∏¡y“P:∏ÿë.úÅ9¯Òe%ÿr»ÀÃ+P≥Îb.û_ÜRp TÆ‘%Ê©Á‡0V`$ K≥`CPQ)~à•nZL∆¡fKù„ µö∞Ωpå˜$|˚Iﬁh◊t(Z”QÖve3Ñª–ùÅ¡^ßAÏ√	Q @◊Fù∏≤á>ıÄˇŸÖª‹A’è/Q∂î+ï‡© óWÖ<£à›˛Ç›*%¢Õ£wj&8Él‡ÃGZ‡Wì‰⁄$ıìñÜ«–AB»—†]á©‡∞(O_Ü`)Ùúª»0Coã=»‰Õu€UsGlßG.f&◊UlÄ1:
çƒ`∏∞r.v≠<ÓØ´£u◊˛ê9ˆjhüÓRÛ ∞É¬ª3∞3Û∂R‰Óì
ŸÙÌﬁaù 9ù—«Rz˛Áøˇ·\…u*~≤œ¬πDøhÈ[J/€Mí ìô·3ˆ5ùÆ‚o71fâ<RŒ'5Õ¶oA‹ôˆ\Áºphlwñ!áÓ¬≠e˜•{+€ΩEz—Uµ]›(ƒﬁ¨__¥◊´1xöPıÒöå√*«mh«£Œ8xEΩçs“ò=˜ NùﬁWe⁄®U ®ãûô◊MSπª‘Æ%„O˜oaP9√Z.‡À˙*-≥ˇ¯√!»üI9_ÿÌ•A6=S√.±◊±@|wX¬ZÅ>Hî¶ΩY∞ã-t:+%;˜≈Uì˙H–ËﬁÉœètùp¶ˆªpµ∏ÖGΩy›ï«Â§áÀIqZt™ŒCLL)(!*Ê+,¬≈E_V¯+&-*Åáªæ IjÔ–ÉvèD~ÇÎı_î{D¢≈Ü∏Fd‚œŸ-"ÜΩtàﬁˆeÊ£-x e¡b| ‚]w‚ˇêczÈ˚X˙>ÇÔÉ°™»YÛπ¯=¯Á,}y◊W¶Äñ˛qcÈÎ∏◊æMõ.ƒŸ¡ Óƒ‹”çÔÎà∆w„ÌHâZì•Ø√w••˝±Ùt< OG¯¸˙|S'W¿á¡Ì+œ1˝'EÀ<H”JXß±Ê5NØıÀÉ££É7äîAP2Ï:8<|ˆ 'Ä∫ñ6¥˝á√Ngt⁄ç$∞(Lº4Û#r–^;pDÉZLpÃ>õ ¡ÌÈT≤`/õÉ3ÖNÊ Ñr9<86ìœA!§Èúì”¸NÍ‡Í´Váxr0¯≈Ì Ó0/~9√ˆä¯9gÜáéá,ñáÂ6¶á)∏Ê ˆƒ˜¿¯PÑÛ·a≥>ËDÍå©ƒcπu
à9‡≥ Çò÷m:?2àYË ¶wâ=∑6»‚<h!f$Üò˙à‹=ÄLì0%=ƒùDLGqk$§â(≤ÿ^4UD¯r˛Ë"
B—ŒB1cÙ`>¥üDõ∏ná:b˛ûÓŸ	$¶:∑êr˛4wK$1-ïƒ1mf¶îò⁄4y8¥s ñ∏CjâπëK‹Ωƒº&ÓÄb‚ˆH&¶∞ŸI4QTïÕF6q[ts$ú∏ âyëN,ûv¢Òƒ"®'…'¶≤˘ß6}à1≈T&ƒÁGF±(:ä¢¢¯.))Ó
M!HÙyZÁFO1oÇäi˝¥≈˜ÏáKû)eŒl˛ÿ©=±w›ﬂÔÎ4~◊;∏ıµﬁÇóu!˛’+}ë>’pÄá[Ú£:÷P‹w:Âë£Ÿ˝•üçßtÒ>“˘ù√ô÷#ZhNIl±`jã rã–['∏òÖ‚‚s$πX8Õ≈\à.¬ñÛ$ª†ª»'ºòäÚb“ã;¢Ωòç¯b—‘sq>/û˛b±¡«Êäë`Ñ—`ÃÂ¸»0Ó∆TÑÛ:ñ˜§E¸åSù3ö˛|˛É"«Ùeﬁ≥”˘wDë∂íúSerÁœHñq˚tÅNÀ;9WœH3nÔ}ÅcÙ˜ò:£(yF°ìÚ	4¶°–òïDc&çiL}fˆ>íiLCß±PBçÖPjŸ∑»û±FÒÎ3@øEzçπúM/4”4…FëÛ‘≈à6äSm‹≥AYêp„Aºª§›(6‰äPoL¡ÓR»hôç
ff
éC¬Q§áÉâ8∆¨íøÅ$œÀ∂~pì3qr‹sˇV8/«Èﬁ∫~éÌÓ∫Ø,stã›W«¥µY¯:Óé±„ã˜∞Õå]πtºÕ¡rz˛é€5uÁ≈_”Ú√®[(ü«¿.ˇZÄ]Avè‚ÀﬂY>¶Òÿe˘ò≥ègLwÎÍπ˘2∆è9
í©E…bÑ…º≈IÅRÃ°VdÓï'a∏ò∑Íõ!˜¿=Sú‰æªfÇ9AæL◊Ã‚∏A∂KÊû1ÑÃ›s<!S˚_¶‰
π∂ê•ﬂeÈwπW~ói∏Cêœevë/”ﬂ2_.ë•ü%ˇZÑü•(≥»4éñôÿE¶˜≥aô∑ßefñë/ÿœ2€»“À^ﬁ‚º,EfﬁgÂgô)IVE¸HÒ˛RùÇ¬«IíY“l§'.‚=çı\>”Ó„{&?¬™œ ïGìö'«„ﬂΩ®”ﬂ°¢â˛'ΩèœDY„®πOe‘’≥õj]‹sÆbƒÚ…\óhßÌ‘¢§›iµ‚>⁄·‹IêúF›®Ÿç´—pXcsπ&A∞¸   ˇˇÏ}y€»±‡ˇ˚)⁄JfL&$ÕSñÀ^[≤«ﬁÁÎYöô∑QÙ≥!±	 -i}˜≠Ín }íÚ5Fﬁã8˙¨™ÆªÆﬁÜﬁÜâIE?âé`T¯üŒ)NèΩ´9{MƒÙ-”35 œÚDá‚ÕÚtÓ7bœ„ºﬂgc÷û√ÒuBTH’GGSÊcªÒUË◊ÿæy¸·¿zp!8DØˇZ~ƒ£-¬.ùÁÿõ¯≈ÊË<ˆÊì+Ì„¶ºD˘ä˚mﬁ∏¥"Ü1ƒæ7∆ÌQ|„Â∂,/Ì,3ÓdÍÖ°4nΩ?ˆéÚä∏∞9ïN“+å•øc‹ùbÒO@J<ßGÚ‚!&Æ∂∏;ˆ˝y˚"ä?∂ß^ówÂÖçΩq‡ÖÌs¸◊ü•çSZ@á €∆![$>?iÙF-“¥»∞ﬂ$›üÿΩÌÈ¡≠˛fì¿—ÙSSÜQÛ`N=`¡i„(Ó™;cÃV˜'“Á={ç˛pÿ"õ–˘6¸€Ìt∑ÿ®hVÉπ√ßd#Ç∑ùf∑’"8øn1∑~ã@Î[ÜôŸÁ6floê§mZG„Æ	éãΩ˜Ó√Ä∂ä¡¯‡NØoë}LAﬂ∫ï`•	L~Ø©„b#É>6a=°èM≠u
¢Nc˜Ω.,¥÷À«Ô5xpÙÆ4áhY 3Ä^Ò#;P,xx˝!–%¥"£ŸnœΩô∂ÅOjá9@ÈÔ'ÁÄ7{πsÛÛ€3‘†Ôø∆ﬂ•_∞5∆Oÿ_oŸá¶oBö{ÆÁL0ÜOÒvÎ Ôî~3Y¯≈Îœæ˘-^>§xÛª°ºMÄ∑àÎÌ—7Ñ÷∑π-& d≠MMÉ„ØÕMm#£áj6’”</‰I^ò€9ıb\·¨-¸˘‰\o.{MhíΩjnï€ "Pw„_3?I;ÈŸì¸ë©√[⁄®ÊÉ≥n·˜ﬂ≤€7?ï};bıª<◊?Î®1à≤·?vËÍ6L#Àxïtrp63|ÚÜ=8ÃÓﬂÃ/Âœ”`Í”OŸí2U$çë£	x˘S¨"ÙÑ>£†éº¿]FªGHkÛˇt;@‘Ó2nOËcÌ ﬂpqä∂%≤T~@„˜èÈÁåÚåowqç˛“Îûloı`âVhCFXkg√¡Ÿ»_≠5öÎÉ77⁄ˆª'´5G˘F÷‹Ê˛pÎÑÇ√_6õõg=ë∫+êÅ≈Ωﬁßã0-»Ôıë‹)®:`ÔøÇ◊Éy¯Ëc€ÎtïVO¬E‹˝O~XoÒªó¯õr’8ßª›˘Â›:À£¥ìLi+√’ZôRX∫ªµZ+·9m•∑πZ3ó!m¶œÊÌıÁü'làêg(€ﬂJé⁄˛ ¥Ü	F‡Ú;ºB^—W»ﬁ"I£)9¿Ûs¶Øw†Ò`∆®r},mΩ2aåƒpôd'∂(ó◊5…ù`äJ2oñ˛√Ù=R«P2ÿ˚´«Ã: y[Ïe≥¨¯tGÛˆY«≥Cpüº∏!y”ﬁ@˚¬?˘§Ìï:â.€Ã¿∂C®¥i~Qº;›6Ø∂~õNÎ'm◊ xæaÈm\≈˚ï{Ñ:°¸ëeø˚∑5}ê˝ß3u®¿∑º∏‡t{[›±ﬁ≤≥€◊Ö ﬂ:
0Èä
|MÚ6¡ÄÙ”IMÅπc∂)4©‚ît@rãkJ1ÿ“èUóQ ù°ÓAÈjÌ}úú[∑gı	}@
y◊Å*¬™N˜≤5@Øü*rnoÀ%∫k§í!˛ßMˇ4∂Úq˛◊œ_ Êˇ◊)ÎÈ+°ÇKÏ®&¢Î{˙*Ö£Ê™ªZ@.¥{Óó,+uïœ®·◊ø9fpVYˇnÈ1Qõ∆√ˆ=«¥≤z$†	ÅíOA≤ÄŒ¬≈Ÿ”-Ä@ŸMˆ`CÊ*ÂÈP8BÂIQWås_%~„ 0∏r§™HFÑ—cô™©Œí≈€¡B≈'Ë¬≈V8fÇY⁄¢ÁÑ$ÜäS©K(’3èm¥&á∂H&`ÒòÄò!æ»Ñpÿ‹~øâ[ábØˇë_…gp<¯9ı¬”ò§MLΩr…ﬁˇ©YŸÈêv∫ıSã5[÷3˘à*AŸimF‰Øm_î#PŸóôW¶£ﬁ◊Bì’[»<U4CUg;ú√*}S>Q≠“}ÀÜƒ[V*†J#8hÙP⁄49¿3≤âAæ¸7>(õ6ïâÕ
êÿFêç2ê@}É[ª-µ·	cÈ⁄iXÒb[xSòZœº@7Â(ªC¿2‚:UﬂlÓåNﬁ@ æ,(≤âı7Ò–ÉØ?§´∏]Ü§´ì3Ûjnè÷L¢(,l /•>˛ÄtOê~h‡’µ0¬ñ”äÓﬂÛë@a‰˘_Á∂— ‘•(◊√ÖX4˛1zöJåj[¿ΩË£†\¬´fŒ¨Q
Ãè‘∆Ê} ÿà˚›~©("∑¿◊M›x€‚˝ù ÷sú[Üø•#jkÈ#ä©‚wÿﬂò£èôQBN' ü¯~å√Fõ]KXF◊˜Ä‰_¯»¸.A€gg>x>ˇo£M1íZÁΩN∑ªYm•¿^ı±ÿUå≥rLˆqákÌ-ì¯û¡$™Ñ≠®Ì=6Ω´yæbÜB];i˙∫¯	÷–`ﬁóZñwPW¢k°±≈£ŒüU{!y|*∞Ú˝ªóûzL≈ ÖK∫íµ2g_Ú‘ˆﬂ¬ﬁÀLÓ¿Í!›•¢u]ôzó‚+BèΩ˚ÕäÒTÌı≈.˚‰∑r·´€©b%d‚hos◊r≥˚Sµ¸∂yÉíÈkÚÏ÷∫ôÖ*r?ı«._˘!∫j|ß»\¯º†taAÁi·è√ÃÔõµŸØüµVˇl≠/¿ó«iƒ·ßAVıøWåÊ~g–=uM¯,∏û}_¯¨Ã}-ÿ¨¥˘g√eu˙_ìΩ˘<ÕºDR|ØàúπÀ¬Cx¥I1πØ`≤Ë,Kµ„˝œàÃX÷ÈV—Y^Å-˜Í©" ≈e›Â˙Í5c4[¢øì~˘Z}v¨ñÅR5≠˚£Ø≠ô∫Âê˚6å!F»r∂Ñ|ΩhwT†›˝µ¢›Ë∂Œ—%∞Q˝TôY3Amq§£J¶*L‚ãUm©Åû≈RTùhp(-Úø◊Ì∆ãáŸ
ÌT˚˚|q®∂XêM.b#,8ö|æÕCBmHR£”ÅZâ|ﬂÍ— Ú/gÙZ)JœÉ®Q5DŸjH1Xøs	¨@[ı˜4Òûh'ÏïA≤ï¨…‘	ìMê9l~YÖ∫dÙÜŸYªîyFˆ≠|ÌÏåi–ıxSﬂñ|–∑yFªõF+{–≈ÌiÖ™≤3ã“F«îv‡oMˆÃ(mî=c'è·ÂÑ™~Cj…f7‰èmñ˛ÿ¨‘‰Mn˙£¬ûÕüôi{xD›wˇ∂+˙ﬁ8V≤-{…ƒkO±(\ª∑øCïÕgÒÿ]+^≠Ë€Îˇç]’7ˆØ4Á(∆ˇÇ(B1X8«Y%©?V£8dZ◊2;◊∂Ã~C-ã¢•ewahŸ¢-õ]•Âƒ˚ÿ¸—©ßI/]ƒX»Ø∑e«Ü*áƒZM) ãÄ:ÿ¥ÅÏ¶¬KˆÚ√÷ùõî„&l`päïÛ˛t@0¥”Æ™M/˝‘&0{<tî¨ŒÖnÃÉ˜am‡˛ün£{+Ït˘∑&|Ó[è çk¶Óõ[#ÃÍ≤Õ‘yFh°üYØØç%Z?W`H`«&AÏˇÄÜØTü¬˛»ö”ÏäÄq∞üÇ(Ù”‡µÄCosç∏À˜K¡aSB—(üQ‡ù$¡8f:H¿•_ö,˝÷ìú•£äü≤êdŸqΩ[Í∏æmgã©
'*(/Z%4IXR…%¸	Õ\ÃÆh∫J≤HÉ0H?Aù√<ˆ?°?¯I]$~|Ô–¬ã`6&'ã cÚŸCúÊ¥¸◊øéÓœ/ˇıØcrÕ3[¯;‰æúèD“keü˝Î_®!‘?•&ôäè∑n9|fÈsÀ•œm√á€üY˙‹vÈsAh_“ïZ∫Ìuù˙Ìô>Ìπ|hÎ∑Á‘oﬂÙiﬂÂC[ø}ß~¶O.⁄˙8ı;4}:t˘–÷Ô–©_„ß˙áÇNß4c´rt∂V‡n«éΩïÌYÃæéUmqΩc«ˆ ˆñ¡∆™FÕƒ¡é§’ÌŸqws˘Vç§§ﬂYaúF"1Ëÿ…DeãFÙvÏ†≤E#bèV I3 n.?ó…∫÷/ôÆkñ4qä‹÷˝e!/<WZ⁄^ñƒ\ÜrK˝%◊©Ø5¥πÏB‘¶KBÍPkhªd¡?–Ã◊7Âáœˆm?ËÂ«AŸ  ≥”Y◊]SZ4ù–ö+,©≠Ÿ)¨+((-öÅ%'k?˙ÀÓàô¸ªµ9#Ì.ΩzF¬?Zz≤F™øπ,¥òI˛V«Œˇ€õ”Ë˝rk¶˚Â&g†Ù€KÅÑJÊ˚Ó¨ä¥:*i^fmtÔŒ÷äÌË‘}ô)i§}XÜt*iïXÅ%XÚh:&òyñ`ÊY¬2œí{ï+ÑgÆGùB‚Àπ0≈Ò“Í
ÂGAâ&°§°etˆÊLg@â∂°§°eÙˆÊå¥øD%Q÷“2ZäíˆåTøDoQ“îë‚ó®"Jö2R˚ÌBISFJ_¢0(i ,∆◊nJ£ıó[£Óı◊∆@ŸÎOEcﬁÌ–∫°zl÷nBßÁıóC£Â˝˙„–ôt˚äÊ¸Ôè˛’YÏM˝Ñ`9§óXiWJÆ)
Í$ç£è>urcówHªﬂ5+ïEﬂvL¡ô˙Ì3Ê®Ù¬û“TD˘(zùQ¬ù·H0;fAÍãnD¶)úG·ÿüΩ]Ñâ‹>ıF«6EŸ.Y0X(˜EÎ˜3BÎ6œ.∆©öﬂÎçö™çƒ‡ú+3êøœÏQÂà{[∂°lI#∂æ6\bƒ€∂ãôÉËN–ƒ„u4”l¬ûã€÷«mœˆõ¶âj3ÙÒ+ıyñ∆ËÊA®)ö+`ÎÃfÈ/0“•¡´ÿò-sÍw›%6Øø
¥um3,9É^˝	8 ›™6BU)ÿ);:®Çª¨á7Ó±F¸ˇÁZH¶Ù‹˜0u˚4+
E Lÿ}±j]2âÉŸ«vó÷€N¶;OgD“¡?¯˚ÓÁ%¢M•∂·%˙ºÉü&m “~z:!òe>8ªÇﬂ^úíÿ=ZhÏè6pr›ÓqVÀ{:≤¡µÒD£€ ˛tªbmèOÅÒ*sµhäeGîR›˜∂Ûj›ºîÁ®€Ω7´yfC8Íæá”Í}pÚ=∑”ˇa›Ü„¬*J3T'Sπ$YiælPÊÚ‡%Â¯∞Â;∆“°5¶L¡{D yzÄ¬«Ü∫qeœKVOk~$4/9GX}®—€!/£Ûà¸LﬁDí∑XÚ5ië=Z˙Àì}Ør‹œ‰0{W@
ÿ#Ä20dƒr(<Ò”ﬂüëãˆŸ"d∞€œ`ó’êoœ¢ê•≤Ê¶ˆÊe<òÆ^ 
… üañR&Ωzƒõ¥‚Í∂∆ ÚB+Ï°^b-Ôn0¨o£oÀ∫≈§„ë˛¶CÒbV¢Îìe{B?il`≥˛ÿ\Ô$ÓÛs?~ÓÕ”‡¥ÅÉ˘tez”PfX+&¨?ÏX¡¬SvS´yü’∏Oi‘"´wKø)» Ø{≥√¯ÿÌëJÅÃõr¥… ›Ÿë™r*%ã©ß) KW≥‚z$VÊ4øb£jR#6T⁄ó©‹o§! ‡kÔSpéË
<;ñØfç•Ï‘fÙ"∞íπ7{ò}«˛‘ﬂ˙ß7'([Ï^˜Ü7"
âõ;ÑÕ=¬P¸ùüqÃáA€˙^_⁄˚"©teÚ√èÍ¢Ÿ5 6≠ΩŒêÈc,¡§V1ß´°Mı;«9Ùã¥¸”€ytê	ÄÛÿú¶Ì.;Ÿ·Øû–{’bÜU¥52„;òDÛ9©ÛŒ≥˝ËI˚ëSæ{@G. ü¸∏¢OQÃ¸yÜ?mı}7˘Ó‡9¬ãÀYÒÑÓãtd8ì`∂LÏ†»H;ûCTF˙ßómo†/T˘UñéÚg“9 ⁄¯¥^0±[±«j¬Ófı‘A*á≤_®,‡áv@ÛÚy‰ÑﬁÊòPÌFW6>i°Ç±F“ú»Ÿ£2ﬁbd*jßkb[8Vï2ë∏
ﬁF˛D‚X¯∂04':,=ÑéVÂî§RÊÛÙ4ö%)ôáëê]æ'˛!´ìÃ√ ml¥7öù©7oº^ 9(id–Ü:°?;O'tÔ∞≤3ˇÇ¬jÉ>=Í∑ÿ{GΩc“∆‰ ÏWˇ∏	Köø,é≈ÿÎ∏ì¯)}u‹9Á5±A„€îã:Ãis√æxÆüΩ7†ıóÄ1˛8H1¯±1nZäô◊fE∏–√(ÑÃHtUF"√º\er‘[w¿ÄO;Å·al:ªë	&<√´±)wƒŒ†º£R$dù≠a‘%‹»€ÿˇDã Û Åˇÿõ¯ü‚hˆô5~¢ıÂm∫s—0j;¡?Jô ıÅJÃsQx~Iah~ïQr∏—Á]—Gv¯±ù‹˘ë•@"cJ’ Û¸–0¿†#
‚ËΩë&,*õÿì$‘ûçHób©¯´ ‡»&À2ºÿı:'c8@÷ÄPÃ∆^lfùTVV‚<M¸kØkÊ_sLTù≈‰‚ïÃc^&Úc(Èb`âWüÀœ$yüSF°îi®g*≤ œ-»B%˝·_„r{©~ﬁXNnˆ£ãáÇm2ñ•Å@
€N5ñI≈û≥˘"’Yóåy#∑oz¸…0Dqn:›•LŒƒõù√õø‰§ŒH√Ô§Ëêvh”MÀõó/ü"c:…Ò™√3–˜æ7r	xô8zﬂƒUXVà≥Åeî∆W÷Á+G<¨Íy’Ï$ìË‚-4Í«€»qß¯6éa©ùGKuÃª◊◊,˘Œ¡)÷ƒ‹1b+V·f(á»Ö±-¥04„aÕç¿Óù$Q∏ x¶ˆ"‡á∏Çn¬˛·…‡ær˛˝ü‡£.ê-9¥*?“ª?x˙ıÛÙˇ¡”Î√˙¡”Øƒ”ø∆`∞Z¸¸;™ ^C/ﬂ’©”Ì·9†™ˇ√`*Ëy*ï;y†W%ZùÀ∞¶lÄM≠$‘Pˆ¨O2®V›äT∞Nô@ÖnŸË4P¯å∞5Wd1˛Ω`Æåæ'˘i&A À÷î{–`xè⁄Äùdç25πEÃ0açY}MΩˆ6˚Ì"a(T≈]‡0(ØÈ"Ô8hûk
IX^ùO&
«µD wA{≤≥ãËS)¯[^4]„Á—"VIπeù-Ç	„ø0∏⁄ ñp°§∫OG¡Ñ1O¿ˆP¸s7Pê·Ô€$÷Ëbéx:~rEµˇªVÊæ”ÈåÖâ$ÏÉñÂÌ#ë3;ﬁ…ÜnÃíe‹¥“x-BEàåÿnﬁπè‡8k¿˙_Ωßﬁ˚	∂˜˛‰Í=ï*[‰ˇºy›I(”ú])]X˙HºO˛¡U-¯)zq%áP≥≈∏qMµ£,¥M\sÁ uP*e"oOíπ5QÏûk#ô“@‚å””E™≥5FÖ2)™RÜr›´ˇ∑òŒœ∆Ã∏∑àc¯±Ó1±û/ïˆ©∂"íL Ïóù3kËcc9’¨ÃÁ≤lNP»¬(#Õ]U`Y¨yÃ9:QÿUµøúá ˘·^øÃÁäﬂà<YÒ≠&.,´Œ{VÜí;HÒﬂ˜„(Q+~∆ôÍRÁâ®‚c9ﬂG_Qê[ófÃu&6 á”ú ¿QúËâz≥S`–&>°∆t%"î£Ï)6 ∞ÓÄV\   •KfcÊ6∑´UöÍ∞3w≤˛9∏öù∂»Î(ıO¢ËcÑ0/ñ˘â∑»Ø≥1∫öeß…ä~d™ã ¸…ÈΩÏÈÿÎ[ΩÀp‡t wDáÄü…^4õQ˘1YŒ{Aˆ,Æhÿ}∂T/_=íÁãr»hØFÊØgŸ”2'ñ•º’îj®öD˘∞ß@•º∞ë∆3Ø‚zÑTÎá8ıœ›a3ÃfDÄe
£˙z+°ØA·ﬂÿ\*≥É§u€ç«@’·±≤Ó™p±ê=Rá]’„„ıZπ:@QpY¥vç◊®“j®¯ï‹∆§À‘bˇê¿«s_@Âü	˜M¶§—Awˆ⁄z3˜g◊.™7„Z36O˘0Q'[c¶peõ^Öüó…N0£ë<9W≥Ò∞X
ã§iTË9¯òßiìgA
R·›≠¶Gè€â7ı.·XCˇwú/L"ª1ËÚı»nl—”qv£?do0j–Cá3äÎS óö|å◊ﬂÑéøÚhÍ¡†„≥˙Qß0ú“e4åo[Ã‚2Q)€º√Äô⁄‘ùœY≥ã ù≥ù˝-•6¥˚ê˚cO⁄”Û2ÆUûŸP£	8¯¶q uRıMcô/0®ÒûyI˙536≈4©œuÿÎO0¢*ﬁ›`#Ít:˙{\3ˆO?≤∑˛{·«W• ¥Õ"WÄj˘3˙®¸¸ÜÂß0:˜P6$¢-Á⁄n›“èBzr> i‹Aá'¨^v˙ò@ØUóg¯xhÒY(◊ …S∂≈ƒ‡ŸYº*&œâÕ#¶mﬁ0ÎijÈt*¨—Ã{÷n«Bm4˜ôÖ”'Æüç∞àˇì!l˜∆xzè,Â–2∏ö€Œ1.˙¸Çq≠øO|?$Hs»€8:BüºÄëü«&ü‰§2©s¥A˙»ù°ê9^Öäh¿}∞!®íè~∞˘ó¿©$~Çu"€˘fj’ìyÃcﬂb‡iê4“Éïﬁ¥tùO¥2cº™Œ'G∑ÊOj√aAñALYƒ+Ú õy(ÍŸD>x”gP9ﬂKΩπÔ≥ê¬Ô@«'—"ÒΩì∆∆8õäç@p©Q˙“.3Æì†L⁄˜∑|ªÖÒ@çsW˙qøµV!Ú®˚æ˚~+Œ€ﬁnaBmÃßMCÀèÎJòùQ•)*·∫íôT∏›óue√LCâ4xpyá &:Ï6ˆ˘O1|7 )Hè&Ë/B	I”ëˇö¯ËG«(Ú†åÖ2 :iGìWå—<é‚Oí÷∆çá˘"XÌááÅ<e¥®Äá˛d‰^v'!ˇΩ º,#˛Í(C„BKÏ7E:#Ö4d•*nõ6Ù6[XzìÈﬂ&mß#Ò~F≤{µ»√[¿‚hÊÖ‰Äo‘?@˝Œ«‹éÑañ≠å0à√¨ä§:˘-E≤	Æá*Pé, 82ÓØ®Èe1≈øÑ—âb_ÂbúÜ4˘Y∫FúH¶§D%¢ÄΩ=ÄÇdJ‡P˙(˙bv-≤‡áÃ><e„öE)é9∫ äjÏÄ]ú4˘nÕkå$5®këÖ£+xv©gOhmõÍaµ´MqzÛ¡¯¿l‹.UˆÊå≈Ë^o$1˝Æj©J©∫Bbâ9 ˝31.Ég£JÂ
W†Ë6@jƒ^•IAÏä‰r≈∂n‚Tö˙L&Ny∏G›Œˆ˝„eá¨òF)Mˇ\ µ12∂1Ã€XÁnôÙÒ„ °ÃœÓµÔ≠|Jb1u–◊∆^áˇß∆Ø»¯ª(Ï⁄;Ωé%ñÎwÃ1¥{-S˙†í.Bìy∆,”‚*>±™¬†Ñ§r÷As◊cnµ@ŸÓëó‘&M)¬Ôô(J£ÛsTZúﬁ∆¡T‚◊Oª=D/s–≈⁄mé¢ÔIüT∫éh‡]CW£âU·[ïﬁ•˙|!kÅD™
≠¶ÄªÏΩAπáFYbÕ√—»g∑æ]ŒVÜŸ§ë ´çäÙUz_mœ‡Nô∑¸‡`1+…{ëØrö–ﬂÉWQTˆ~±¯Å>1õ;s	x—(K8·n∏3¯‚äì‹x…\‘`Ωé∂@VÁQ[–≠K¶ç2ëïåﬁ›PhÜ∂∞ùe—a∏ΩäîäÁcl˙-mπÜ∏iMûS)n ‘d≈iâÊKerì“cCõïûï*ô∞Vü±OÛ—› l; Kì…I‰≈)”(…L?ÔM¸¬œæ<=ç9û≥¶B	÷€ÑéjZ;:“9Ø.#Z√ÁÅno»∞¶Ω∫„Z.ˆ„h[<k‹Iî;F‘@OmÌ≈rÙ‹˜?=ûãì©?[4Œ<‰◊·"¸µa°ÒDWó™‰l∑„Í»î(n:f†	bœ¶«…rÍŸZïØ–≠ÈŒqhy#Vq∑ö´‡BÓhmL#NõõYÌdÇ‹¿g“T](œtÖ‚#M=-RB}ézõ\!5…˛˛Îµ
∞wc*ã¥{[#a€Ô¬‚›ekí?ÔﬁÖy;π	≠ãŒeKR#m±zÓπ<ø|˚£n’"u’E2/äë∑—[÷õ‚„W@¿îvveº´
ÖHä£ƒ∑ìb!6SHçJÏÃÓµÙSÛƒgn¸hëŸΩ~®ÔyîuÒøÍì ˘£TÆfß,/'ŒXæ£~Åë,⁄GÜõÊû^F4Ë+ÎÜˇ‘◊˜Ì"ÒuÇfo€B„πuÔ=>=ıì‰{À±Â]x`,¥ı,é¶øDàßôe]k¡ ÜVm9ô<CL—Õ¨uË7ﬁ`ëR)âŒh	÷ƒv<≥ôŒa48IÈ\[$m+wm8ª´ÀgÓ˚à¸W ì≈ÌâØ ø’∑•˙Dªrπ"CÀœ‰◊’;zÎßãÑıûzAà‚'ˆ°›4ˆd¯‘|_˚(ƒ^4ùá~Íè)ÿÏ^Î˜}ò>4›Vø˚gﬁ"L˜Ωt‚«ôÂ]ÃL˜=Ô[∞>“©¿a‰%)8ëàøç¥F˛@ª•—OY¶›UÖ\CáÍ'˙=ç¢Ë2\|!ˇ6ÙÒX˘@ª•˜ ¨5Et°Âñ±Ì3”]”™%4©¥n“-À )üôÓÒM˛Lªe√5≠7ÌÆƒj+”3‹5Õ–¯±ÂÅ˙=ÜÅ$hCÕ?TÔz|≠}d∏©Q›(A\ ˛*äãù7›5—a„«ñ˙˜ˇ^¯≥S_¸Pæc¢`Üè¥õ∂û~A› KﬂÆwjxX“ø•©≤Ájk'ã„„1£∑yÜõÜQ<1}jæoÍıÕ\Ó∞¯mÈK¸@ª•~£∏´Ï™˛+Ü>û™üË˜‘ØL>sªFO:Cø?∂<0·¶¢µ´GmY∞S˘ÃtW˝réT‚…˘æwµáé∞ª◊ COo’Oò¿Ø4Ç˚m˘Áºı◊®0ñ;,nŸª?3tjoÇïh?à¬`LüÁKdy`¬K[‚@,/ïÁ…9üè~Ø|˘áñ˛-çx¡k/é©1O8æ’{∆Û[ˇ–x[˚÷ñ
 æ∑=“Ñ¿’Ï3nÍù¥êx®}{1.e‡Õ&#Æ¨Ö=X©Û(æ¬Y26]»†…ÓÑÊÕ†?yC/∆‚zúıïn3¨ òÎVâúÎÓôòf≈„é±À MKo“ky“]˘KICb
€r˘˘‡≥‰‰Z=ºH—9ìÂlBC<553iü∆}ˆe‡Î˘k≥ÛgQú}*©aT„∑PeÖz˜ôTß''âÍ0‰ÃŸ,òëPñ÷ç9ã£i;ç∞ÆÖò∆^+l°Ò'CÕj·îT–f°∫çq‰…"«ta≈áJWs›ıçYøëçáyﬁIæŒòi$Àmw√X{2ıb Yha\H}ponàÖêÁÓîˇ]´„∂≈yÂ“ Ù≥duè>T…4øÑ›‡©#‰ÿTD∑µöqë\”ûo<‹èfæ≈OCù ◊ﬁ0a‘ ’˝ìÒâ—8:Üá7ÚL≥9“ﬂÎã*a)íp„a˝2ºπ˜∞$CÅÒgaå¢IJº¨ÿñ§$°w_åπæcE⁄‹”Ïé∏ÂÜÃnX,	M¿Ø%§∫A”±‚‘õ+ƒ‰¸SÑ,Ã†¿ﬁµÏ«Î≠êG™Ê◊‰A√Û∂Ùv»ãŸi4’≥3àê°õ$÷∞üÈ@NßNŸáS¡òÔ}¥jÿÏ
«9¿ø<≤ÎË>èæÂø‘‘d
Œ	Xi´2Éüg˜fò8Ã≥Ä±B4KÊw9Íu∫˝c›coÎX©BTÊ•J'&Y
≥ìvœíÆ2ïvç^æsfs≥Ãùc›=Ëé ,Üáëhåräg4ÚjRó@ÍînåõR?À¿™sS∫Ë\Ç€y›ÈÕ#KÛım∆®Îíå®LGûÌ¿ eJvTùÅﬂ9Bÿ^`±Å4Ó§öK^åŸŒ%¡tRÄ{?ˆ?Q
Ô$©ó.F˙N3ı™È·ÿ?EÖ–x£…œ^{⁄≈,∏ˇR„√gwp áº„„§ã.∆~ùwÇq≥l±ü.‚ô¡U»¥›4GTèÂÔœ≠¯BB@Å⁄‰‘Ö&>p˜/"ÀRL∑ŸkCIa)[37å…¸84J¿fÚ¶°oâéN•FO+€Y”(«ä4∫#Ω§^`ñ v¥∆Q‚KÈU(nπƒZ‡eß£±‡!|`8pö≠ªˇYqÚbZ":ˇ¬ßnc¯q‚~k'.›µöß-Cv÷“øO⁄˛pÿ⁄¥∂áÊÉñ6ıM≥ànÀ±∏‰’«ÆÙÁ>`?œ·Tq‰0àºç„&_¯/H¨;$≥3ì{düÔ ó¶›9Ëº/‡‰%ˇ∂(πak“ı<>ñëˆÏß#u◊É{ÕA∆_Ögﬁ~Rmaõ‚
î	{J°µ)Ífåò¥è˙˛ÙXÀp/⁄?8âÅìÃp˘Éd$û_}ñÉ`W9%˛Ûı·∑sJò†˝6Œqçø‡±1‹!ø”Bß4sß‡Y•Oé…‚‰«QÒ≠∏i5œ^˙óùÏá3◊á¬h´’≥Ë◊Ú ≥?Â©êa5;j[}…ÀéÑØÇ*S¿∫2l¨Ú¸ˆ∂È±|W≤√T*l#V2|•Ωx’∂];úæéfòŸÓ∑¿ø¿#~#Û÷€XC≈,lò“}F»J“ﬁ¸∆-Jπ¢úk=≠Í§˚¨›ïNî~ñÂ√b-?2xıò€9\R·È˝òÌ√GæK∑oMö,|Ö÷îáÃÈ¬Æc§îE›$¶:π‹fÒK∆X3MT3hvÄ`Lu∆˙˚c6KÍô%dÿ·–&ﬁ¨-ﬂ_#ÕCg&ŸXéì‹(â§|);{ºå¡∫ŒdvY2â6˙0*Kñ”I>]˜ÇÉ?®G≤lëoWç=4©±Ó´±xüÏJÖ5ì∑|Â?;}{¬zV‹â~˜+¢p∑On
ÂŒ:Rüé™±œ†8ßÇÚÂß‹ÂÔ≥êa>;Që# ≤rj∫ør
ô%ıtò¯‚Ññ‹h∫§ÌyD1†‘~˚$]NØ«¸L1- ∆µºÕ4•ü™¢°‰ä∫ÔÇT`x©º<‘[˛[≠ú
6kÈ˝‘¨8ZfkÆÈ~eAgaÙl|RO˜Ó[:Í”Ù_µí`Ï_ÕºipJpKI±ß1i Vπ$»;@¯8y_˛Å…°C°6Ü-≈√Í?ÓŒÄ<∞%î∏*ˇ3ä¶ò¶:6√[D·KÔ
≥o`&˚8
¬	i ú~º"@∞[$)¿mSÙpñ=Ñsùıá[%b!sIÓìÈ	Ö2<é.‹*§Qˇh1GÎQøèÙ∆úNÀ«—-†Ò@YY	µóﬁâ.W∫¿^'M.¢‹/MÓ$9§Ÿ¨XÚˇ∫˚˚GÍ@®›¨•Y;|ÒÍÈÀØü*@´∏#°,1Ø	à—{l.≥ É≤ZtofÌÉ”ÿœÛªSD)˙kL`! ÕúÑ~≥™∂z…^À˚£ëòXõ˙ôΩı≠}kÈ&≥“ƒó®?~Â•ìŒ‘ªlt;Ωnãº^†q¶—»–˝πè˚DÛ@ê6Åwöù4z\˙„Føi.¥k.Âõ5¯~B[|OœÈç4y@K˘6Ã-
‰¬x¯©ã%rÍèÉ≈¥‘hâpÒÃ˜«(N6>dùÌ _@◊án#Ìè¸çÙ∫›ÊÕOÍ¶ﬂƒ0ñ <Rº(¸ê¬…ºÑbÎULè3¸Ä§»Òf°e07úl¯ÍLÍîüj¢X«DØˆƒÂB9˜BÄË"µg	ÑçFè˝<ÍKux./‰.Ó¥	˙≥ç◊¶e<⁄?#Ó≥FØ≥Ué∫ˇÅ∫ﬂ?Íæ–@ Çπ/f´#Æ≠¥˜ÆpŸ˜„ñ3täú$√¿%ŒXÊ«ˇMúÆƒ≥©3]ˇ'ŒúõaŸÇx‹‡˛>«¿ê∂¯∞¢Qg\™J1â¨6w«ëñ\†æÇz«Uæ◊j%ÿ*c—πhK ƒí|J§ÚB65ßê¥’÷j±%™∑í¬Z.Í∑ﬂûæ;|±˜¯•ÎÈ˘ô¡C¬qG„E‰hù∞Ï–Úü†Âe†õñ7ß˛ÈÑCXÏ6◊wÉœﬂº{Òœ7Øë¿V™–¯S÷õPÔ´9ï¸∏ì˛Œ/æ*Í¬¡àŒ,Ç^‰T|1{Ô◊8¨På»Íj˙≈›µhYöÂ ¶C9aY¸Ö¸ªô≤‡Ã˚¿îÂ(êÍK[4%b$πÍ“Vd¢’Ânñä◊5–è{#Õ*£XïÙ™`ãÛB‡åaˆL€î%K1Ê:yQ˛MÉ7o†7fí$ÔVﬁüÚÜﬁgâY8ÔåCE˝kº`ˆö¡DŒ‹Ãàzr…b≥≥à¶ Ï\ãƒqêóﬁÌ.ZçRä!ÍÀ ™ïj«ñìV•o”‰òÈîΩ§ Òzuf˝Æ^n/3Yq∂$iIU¨£ﬁr¥j:3ä(≈ÑYN8‹≤ZÖ”î,¶1Z-§◊1	Œbò…Øjƒ£rtÜ`açÙ12ó™¬≠·*»d“>∞2È%Ñï˜¡Fn‚§‚”]Î°arRJ“+Ã√zÕá+‡k,«pA•∂k2”L^∑?ãÈ	„≥d2úhLXn#CÖO3àÎ$Kºùì0…9◊Úbµ·òI◊E∫sQØL!!o0ˆœx≈” z/∫w˛ô`Ûåfá—‚trÄYÜö‹≠∏}£æ¸*¬DœÍªxW{ıÈl¨ø	7ãx <>ß;E”®Ò⁄^WòFÕsK=‚Íûéæ	Xä€{F#HR(pªWúÚW¥¬2ôEÌÑ.Œ	P‹<…¿Ö¶Â‡ßÅîäwSl ÓTü<}ı‚›„◊oø{˙˙êºxΩœ·õw‰Òªwo~'O~=<|Û˙Ä<>$/ü>;$?ìw/~y~Hˆ‡ÂßÔ»¡ﬁªßO_ìß˚ø<=ê®ÉŒV†·|Ï]µgﬁßˆ<ˆ?µΩ8Ü©)Fs„°$eÇÖF§/ñ2¡Iû3®\#x≤:ÇÙ/jèÊÌﬁΩ>aÈ›)yπ¢7˛hG›cJy∞veËdë§ Ñ]√jÆÍù§ öÖa,<◊3—#e•åVf≠∞¬»PëÈûî„-æönÕ¬ûÚ∂4Ù®´ò‘˚ylJ∑Eˇ◊5èU%yòtUﬁg[r:πo¥ìojútnOCs§i∏C”p±0Ç<‹^_Ø,Fq:¸@<à	P%¸O∞íq€ãØ¢Y”ÒIä‡≈®Öîq`}Ÿ~…ÙâÌ#Ä‰c©2ç ¸<¶ÀPˆ@‚”‹B9í#WΩ*íÉÿVç„,°≈YˆÁ,ˇÅÂüÀ_£)#GW≠VØz€Ñ€Ã4_πW¿ÌÏÂ„'0I—Â‡"ò˚¿ÿçÉS=¸ı¡c∆ñK0G§‰«¡Ä~øÔá©Gíﬁ»P‹d·0;¿*†Ã`ò∏ÙöR∫;§€"ó;§›µ≈(∏”Ÿ÷ôs..HüÊ÷∫ng>oh„k√¯ö‰ŸÍ6i/›ºèûﬁÉ§Àå¨ÿ¸…"`D2Gﬁ|	4ÁlÊ'…pnë±7ù√ì“ÔñÍŒgXNªH•j˚üÄ∏%Ã [K] ëõmµ∏π°ºõ¡D«ß(I„W“*)À¢[U2Zi∆3àèV(T¿	ˆ¯®›oë˛±Y$î˜7ˆÁæób¢∆3ÑÊ´øs»ˆN?NP˝û(5õ¶ñÕEÃuf†B√È«‡ÿ¨êπW,ÉÉ∞h{]rö”Hƒí‘„‚÷z»«:®˝Ìù$iÆÖé|I2¬8™t‰÷Èêëˆ◊DG$∆„{!$	bfÊ†≤˙ˇÆ_ƒŒëÈ—okÏØW’ü39 9H$Ü¶LôYÍq ^(·2#õ_A@;Yñóª/–*ô†"˘}{§Ü≠r¬‡FXŒh˜Î±òëB∑ H0†Ûˆ‘F≥¬ j™hæ†:K ◊å¨oŒ~ù¿äûöÛob&ÜP^C8é—2¬6¥«røÀÉá ç5˝FÈB <V≠ÉH“>◊B¨ç¿eè¨ÑézuÌnÃ£9sN–È{ÒÙwLæˇtÔø»ﬁs¯ÔÀáäQÁ⁄dØA(?˙WªÏ+7
ZP2‰§ê2∏Õh'£•nTÎØmÍP&°‚9⁄ﬂj—2™pbw;ΩÕˆﬁÌ‡_√Ÿ-
Îh˝ ñ	»˛?–N¯ÔI˚~üÎÔU“(€ŸÑjÑÔ},Ö`x-‘Éwº)f”Ã-óôA•MÌ:ˆÅ¨∆É˜évnJ›¢õê¥L-Ü\-e¡Å&|f#˘uú˛ò∫¬ä+¯Ò;?YÑi“hÒ”HÃIo_∞4&˜Â%/ŒYGº*Ö˚|h(•5l…âKJÒÈ©m∞7Mﬁ¿A@A*…‹3x°ñ"›–jé˚º,ã»∂§kñÌnŸ%)ñË`yëë?⁄ÉÆÏÌâg±z,3∞ÓduQÚ$3È∂©ß=ìÂ¨[4vDf‹˚®CDÕ\õ˛)ù“˜õ≤òñG¸…À¬√}Í¥‚wò‹[òÄwN˜Af[È'°8p}Ω-¥Ú$˘˜Ôh°·Ω”ãÏ$È'Yû’´‹Á¬4û‹áƒ“?1ñí)≠Ÿ\åàXñK8c∆hø9Ù7ÆK†˙¶©Wú∆f®=≥ù!rl†Q8∆‡∑..6MﬁœRDF1≠I5f€Bkÿ‚á1(˛ÈÇ|Ja &/ë“ya≤ò÷æây£ñxWü9ê¥_H:ËJAÙ—gÓIΩúÈœï§Ì%ÈÄKf}CÄe√Jeñ5∂Ê3ÖÖÎæÒÙæ	%ä‘ß)ÍY-”æYƒIJﬁE;º∏yL”÷è1'¸ò˛–3Dñ˜~{s4L—≥à˛d‰ƒl?=ùXΩ±hªdv)66d$ﬂ[ π–wIÎK1 ›Æ¡Ã§Ü1jF&Õ≈óy{Y¡U¨†$€‡,Ê*˙„Äx:IŸ 72')Fº˙ë x-˘ÙÑ/;‘ëç}?…Åç:}∞ß9~q∞∞x¨/4Ë7SÄÃaƒs√Ì{ZÂk¯dÈL2±\´ñ¶Ö†À¡˘Îò¬›ZÖfpAfΩ†ëç4"|]√+íïÊB”aÌ›µë?Œñ˙ßt…	¸E….Ø∏vØËôB éÍ0£˝Ú-l‹fo:Òãë≥ëË°ª|4_ÑÏçÉ$ØGYÖz]+nœ2dãt—ƒàÁ¥ß‚ç7Û/}÷lZ*ïT$˝‹
‡ÎÄ^≤À”u∞´í≥±~ô92‰…|D⁄ê'¸ë#(J]/,°Ï⁄Qù&ÃN¯j™õ¨«Yî‚“FÄ\◊Äâ,ö≤b‡eei)N¸{Å"ßQyU…„ÁÈ/rg96WbM;øUí_á]´0∑UhÌéìŸ á5>«xBU1…Í∂Ÿ’Á[‰É‘√L¡â’PﬁéBÃÊ˙∞”¿˛z-.ΩÚÌ∞O Dô«å‹êÆﬂ· S Á4oæ jm ›aµÕe`”ï7Jﬂ.>˙≤∏±˙^å}"'≈O£¿É….;Óy≥Sﬂúl ËLüïÊ£cæ¶aÊ´çòÚxN# r0Ò√3™¿¿$Ö‰%PµÍÔ®∫EK‚CﬂL’<ÙÆ†[Ïu◊1ÛÒ#“¿L^r™7tìßÕ∞_;‚Øºöé‰N⁄…ì¡5õzÎˆ/≈’X-L}+ÕF‚õYnw¥Ó®üZ”æ€¥˝ı(U°™zÕru\mï$Õ‘ac¢Wã¿¬DËäÕûüÊàE|€Á¿5ŸçY¯ ;ovÓ/ë°	¢1ûR;4ú$¶Ω∂ú(•úOIËó¬'⁄Fa›x¯Î≠ãÙ‘úD@%Ì]€Uå%@óÖãÿˆæƒkBºî≈õzÛF"îPî‘Ö,ıÑ….£â–Ïì]FÀ`˘'∫U∞¸}@œ–é'~ïŸ;›ﬁ˜ˇp¯¸–õw;€˜m6KÒ≤[!Gôrˇ¡4AÂ-°UññåË„≤˜T;â]¥√	g√Ô%ûæz˘îEü5;ßaî Qh‹={©◊∆ﬁ€àª,»ˆ¯n”ñ\\\l˚t§œÄ?`†fNÊù]e”+]#))’r™Ìá£jÉd6(ÀRC¥KƒdºŒYqü=/”¨-\u¿ˆ,y!G›¢∂«O9zEÀK ˝‰˜Û~√
ÛªAÚbˆ6éŒ±ìπsáﬂƒt£Tã3≤‰«6ÜöÆöïm/côTbî˚Ò˙Ø‘è®K.⁄˝!ô‡‰2íaŒL43ÜÁFß"ª‘[z@“,œ∆¥ÜÉbˇh˜Laπ5:»,	Y≠ ¶‹)mì1t˚±wéÒv>ª=XΩÈå\¿ò@ÀT¬ZÃ©≠a]Ãç¥1§*ØúÓ»©´}4èE[ØûÎœLuW1Yã≤8>ı∞èa°|9èÅÈ‰bÜpÎÑñMŒ≤ç‚R¬¡≥µ¨åËó8òg9<Œ£‘¯á∂√πlæ∫Ì©kµˇJÌTàû≈•vì	¸Çâ—~ÊbE…Pãl,ÊR)Õ.)aWWO_P$¥Pô%MF’#[À≤ò/83Ju™?´ﬁÄ¬∑Ï◊yù4^ÜvJÖHÈÕœºÈH]æõmßìYÎ∆Ô#Ò˝,[Ô@Z\^qüZ†sHSÀd2=g“™·Ed∏.⁄˜XËôGÜ®j‚úW•I"?Ã¶¨Ç˜¬KÊ†Î√(è2în)!Ñ}sIÅÊ1µ—ûcRÑ6ÔFEﬂäqï±^xUÅÃµ2≠üÊÊ¡wHÖXıÊ9ˇÔ=¨`,ú†XÀùTá+¢Ó=FaBÇ•ø^3Õå"†5c•)A¿g©áäÖÒFÛF“ÅJ)…IÏ{€∞ÛâHÆzVûDßYU∑  ãV*L' ‡Áì‹`4ËR0°ÂÆã±ﬁX=çÏãZ¢vIyíojou·0®í£jÕ3’áê&ñj;‘Â©ì∑û;Q™XÄ`UM+ß√C¥FÔ{We*Òbké…£®S9÷poπU3ÁT™/Ìº£W⁄%áM°≠yÊ˙5°ôU %~â" ”ØºyíüÒ…ØqÿêÊYbÇê/&ıÔnºÃôYÚ›ÈWåq–≥(È&<ã`l~ªÊxï¬ÀAXbÛ`≈°FV≈§3nEÀæ%óYëô63˜®’A
AgEØ(ÏªŒx	◊U€≈π!˝	Ç–@
ppîÑåBÎoÉå;⁄÷èñ¨XWµó™°qM˝/f √>˜s?Ía†œÒ∆C±≠·%ñ^£X˝Î\Ÿ“'R∞±µgÚ‡ûÁ¯¢3ﬂèWyŒQÛÂ»Ùôîr-‘D±vñRÚ:kÿñ/,ûñÑwFT◊´yÛVòa.yôÕ}Ω¯Ém2V≠Î$L–ÔúeIG}Ö≈äY≥ù W™_pÃTËD4+4pwt÷πÍîw≈–zZvvô0—·3ûÀ,ÙÆ–≤ì∏(–Òr¿_õÙ∂F±MA\)éË:o'å©˜Ü≤´ôZ&ìªÔ∑åB†!˜ç˘=—∂ƒ¬9≤ö8,Mq¢˘…mR◊§ÍTIõt}ôßè∂Ã∏ÑoΩœBIÒY|ëãÀï)W˙y@˚1Gøà«/‰Bæ˘Õ≥ €ôkHÂ¢VÀøÆd∑Çí.©û©\…•ËG‚ßº6◊ÛYB°YZ˚s{Ù#:±ûya;ä—£Ä™`úïCπŸçz∏`µ"îfîÖ˜G˘ò‹f¬oÚ|T9÷
ÔˆGm)4L˝·v´◊µ˙} .õòØÇÇj—¢À–vLÛ‚y‹kPÕ<≤KòZ&Õ¨x≥db@2G[09iby{ÆT‘03uõ<±‰„ï2-º£N*{À:•ﬁ∞’€Ñ≠§)Ò∂\á‰x0‘)@*_’ƒ?sÚÃH¬N¶‹í“‘${Cî@°—„ü˚Õµh28hâñØœBÔº$^≤@Bœ5]B]≈ÕÒ˘jΩYäwkôM˝I'S c≈\‘[i.àikô«6ç˘J'!!õ˚$÷0‘<â∑Cèk—§MåBåAÚI AË¨Úm0	Fª¢3CêπÂ∏(bŸâR®ˇ
«âÏVVbôÎ(ÀiÒ »RWVæV>*é‰k;=‰ïÉe˘uFÀo"gââ‘>˙‰l%≠ˇHEâó≈S¡µπY!\∏'¬8ºåÏV±~gt√
>‹Úø;¸\"µ∞vﬂ\`Ÿ+ãn(é@s\Ç§ïó⁄HÀöè*‹·äD;¸ÕáP˛M•AuÍ€CÃ± ´'”7òò^wﬂª˙BÄôKe`ô14@)¥˜≈AÚ0öFhY*’j1ﬂ%DrVhﬂGµÒ≠ËK‹‡Q05∫XD RlÒãÅ$[W Ä≠çá±óL˙ÎÖ≈
FÈ„≤4ôÏ≤Eèódã´Ï€x[Å÷õf√qˆ⁄Ωê1gò°,!°1¿¨<éÃ?˝∏œÇJX¯◊.ic…Âi1Xqï,XLz9∑◊àÔ+—f;∆¸M`¿øééˇ°Üâ⁄√ºlâaÚ¨a4=YûÂÎ	?/z:'—œ™[‡_X‹∂ØﬁmÖµë<ù—dhê,:ﬂpL§˙`±“uRA9˜fô£é$åeG=•^^üNKf˛™⁄∆Únö£ÎÄdÕOpX%Ó5ŒnTÂ/Ω+ÿ%¡%¥N¥ZY√ñx3—È °BZá^·i§Çp„⁄n÷pl:Ï
ã*íπØ)˛¿›_¬°^´xÈãv≈OΩ”I„‹ç¡(´sUüG géõíœm÷ÚØ≥	<≈◊ÙVı∫©
†*ÁDäd*wÙ©%—‘gÛF\ﬁûÿ.∏T	>“ÔªC∫*(Í‚£hW0Êdê)^—⁄@„c≤Ÿ)\9ã{ÜÄ•já“Â ÿ!∂ÒÑ&v·[ëh6Çˇå˝9&®DÛ&Ød rWñ5\¡˝äâ.3Ì«˝é”DëüèÚqV{_9±Yﬂ<Bﬂ˘ˆ0˙ŒGi—wX–è÷…¥RöﬂÎAÎw~;«ÎÖ‘„dr ≥qù˚È§\p™@ŒóÄÃ/ÄØç–Ÿ¯÷Ñ—rë-É}ÍÏ˚.‰<¶’ÅDòÃ+*≤`R˚ ÏÜø≥2]•—Ôlî•ÀJ¥iS⁄≤M$≠3gy)ß’4í-I›0>@N*	ùTãÛw-àWQß\Ωvølw–5”≈	_Ÿlπ˝¢^LãÕπú«∫T:¯_ÀÀÏfIUPy´c∞Q∫ñbñ/G˚®ƒª◊ì◊íËX*}∞™Ö$∏{,<EıÔ1èÒ …ÚöA’Na.ÓÊñaﬂ/B¢Y§®Ò∆Ÿ‡M•¸…kq9MÊÔ8ieÎ¯©VõÇô„zΩñm3ì4
™ à	∂Yû≥¬¡‡]ìÚ}√åó$ì’¬‹‹6Ï°b‚.é"3s8,=ìJø8g3∏F‚3I.gÚ™Ñ8ú]∆Ü…!˚4oË÷´öÀó9íú¬dâ“1ƒAî*]„y¨Î†s† Y◊öﬂ÷5ŒluáÑ
5ù=±m…á÷Ghm0.∂WÉı•∑R¨EÜ´E∆ÀäÉáŸ4Ç3éúe>ú	Oéá∑^å©ôÇgb≤"‹4_ºâhÁ≈¯2kE‹Èé*Kr∞ˆãÓJ™l®4µ⁄Fh'i¨?ˇLÒ7hO¥}∫öïDmöÊø9Hc≤[D◊/–
Ñ]Eyê3˚±—ÌÓ OS5\⁄Ê´`ÜãäüFMYoï3/bﬁ¿‹ãüß’*Z¢„ ≤m5qpÉnı∏¢9õÍîµr·4y»p1Íøg›7+ó/HxihÙŒ6*JÜŸ∆dâú5§5‘ÜËˇ;3∞M?2ïò61Î1[ibˇ@=—tV9F“ ≤±Y!öcL∞G∞hS5\”⁄/f¿¡Iù¡∏≥ﬁé∫«èî™õ}ÈUµöOÜ„⁄§∑D?–wN≥Ù√Ts|ô≤”û}‚è√0∑ãZª¿RíW¶ö÷ˆ≠¶“‚¢T\ Hg¶ÈπîXA‹≥´ Z*ÅÑK8ü±NízIå<≥|“ΩüN™ÌÀ<@‹ZC9cß@7BﬁŒrŒ‘nèÑD÷≤^µ~úöî1ù€[è∫ùÓ Kô◊{…§ ßØõgŸ õßE≠d∏¯'˜Ùé⁄™¬b¸Æ +"Ç√÷TÜw»Ü"¸◊a(]å∆ä(©To 22)˙í’óHÆΩÙx¿ÆË°û€êü0!ƒ-~Ÿ•%óπ;G˙ó©_L©\Q„òßóK«¡QÔ–s°G° ΩöËfSØRUSoñ
Ãπ‰,1,ÕJ%£ÿ∫n‚∫Œyâãnßüá˝€‡N¨ s’Â√óoˆ˛ÎÈæ˚∏	x∂Ygnv#ßÚ√µœˆŸÀßˇScÆ’‚¢ƒ£Ô9Í∑ã°∫ÄmçlÀƒÀ„µdÃ<^‹ã}±3 Û8y-“`ÊK¨¯«&3b‘0ù∫p€v… ,ƒæﬂcı≈;ô©"m¨—¢ÎŸÙ‰iÂ±∫Ö√ˇ+˚îq.nLJÊ≈Ïaˆ?ƒeù:¸y∞”j”Ã´>π^uƒ$^é	9Ë#´)hƒù0—íâ5N∑Ú- À_7^ötÛYº–Á¡Kõ∫~ÌàπÜdx’ïz§*Œ’√}T™JuÖ*S¸/°ÇŒ@HàÔ˛¨IKÜ¥ò∑!∏‰∆¿ãÛ¬
{ˇÎÏ,ˆ˝?|"≥±∆Ä∑gÙÕ{4m	Æ◊ë≈^ÜtT~ÛWÖÄ:Õ≥fötÔÑpuj&ˆrÏ≈ùg¨∑:R°„˙dÙQmªπ–1]§ó∑∑^níŸ˜}"qkÒ˜»'
6ÿëÊf[n·≠Ê•"—u∏√Ãà
§5›ìñôSiQq´1ñY\'^JŒ˙¬Î) Ê¶⁄5rê∫ÁÌä<d=ÎÈ˜Ö≥Rå^Ü¥2∫∂à¨Ñ˙N–7è·cÿ´	Ê9Â8¬j‘ÕZ™ãπÙªïóGJà+I{kƒB)fpX»øVøÈRà¢˙%[—ƒº	Y;t-öı>‰uTÊa˚hD´ËÃ„¨Ç¯†0ã¸ıZ4¨√ú·¡â\|ß}¬™§π_hû•>Êi)ó∫-˙øŒ&œΩæqC{êÕ?w ÃE¬Re)ôß8±eâŸ§9BÍÔ—J$„ ∞±±›˚Á-:∏ÌÌVØ€oıáògß€Î7ﬂwj	Éﬂ˜∫›üö«&„L.ı¿jò
?ø!ñÀa©ƒ+∆—çZŸˇ√@∫ÉäÅÜù˛H±Ï√Í+√b"Ÿ˝.zÈ“≈RMè∞`πÉ}∂¶ÿ?ï^Ií—rMÆ;,z”õÜòlp(R0[D˙Á≥$œŒ…!“`Ú}±ºS `<ÓËme˘gjÎÚ
Jh˜Çï¶H¿– ê∞≤ç/∏EÈy¥!	Ê˜ŸΩµJ‘IzÖµÎxÅ'ÿëMΩXs≤’{õÛK:ëQ˜ßî¯6∫p£Âÿ„Iy∫CÜm’mÍÍ˚∞Czeï±ãÀâ€p:èÍ_úëYî“rÓg∏zîõh°“Ò»IåœˆÍÅ >Qa1ø†Åﬂ'WëÊ{C∂Ä∂RòÚk‚«ıù∫∂zvπ„’äòÂå=¯”7‡Oﬂ‹1®6q,⁄hSƒp^êÖ}Lìæ√ ˝ªö`ÔÃf;Åæì∆Ò„yÄt˜»ÍÈ=if,m>Cä≥8öR˘GˆPÅ"ÈÇ·aqÇ∂Ü/qLÙÜ¯«‰ãû√ÆÔ√5k`ó9/(±vÖ◊©ü≥Cé!_û∫ªÇ/‡fHÀ∞å≥ﬂ"ü{ÈÑ÷àŸÆÅƒé‘Z‹rwZÌ¨y¨A‘%…∫î™fLq;ç@Æ@Ù=p>^˚Sì ƒ⁄H¥áò∞G÷…:∏6i˛,^kds ë°WoóTˆ√Iólœ°KU£¶˚˙;ó™pV≤/ÀΩ‡UÿkÅªËb™¢Z£”%@vYéØeπ
ºñÉ≤€Ä≥êV÷úkˇ–ÑMú‡ü0Üq-À”}º÷Núe.• €·◊Auk1
x-Õ,‡µπiÑ›Õ/H#›åâN.l+GS÷»KOQçıƒt…ì≈ŸÜSj$xÅgË9œvFÀàV#»µ9âŸ˛cÀW÷§%ÁÆÊ~t∆#cbÔìÚ!—óg4sm‰µÈ§7≤î_nILX¿…”ŸòE≠d—3UV˛›A⁄cäwyegÍ]6∫-!bß≠è∫YiV…¬!ÿ˚Ô≥R∞]Œ√≤ùBgZ9≤ä&GﬂÄuekxB€)â3ªùx…o^å≥ÚN–ÔìXBo&ÕS∑.øOªLË¢lJ
≤:Ç∂˚B}A˚ÛŸ"7*W—!*É]ÆÙ|9£›“&;SùY∂≥æ„≠|kùö¨YÃ¯˙√sk∞‹x4I^‡—/íêÀJÒ<FÅõÚhv—bgµÍπFA‰2bÆΩïcΩÒ“0µPÿ;rÚö(0ÀlõÁ+v˜zß¸ÊxÌ®$¡˘,”‚`¶8òëÓª.U˜e¶&ÈLÌªñybSPR$ÖóÛ+™®jvù·»b_6ﬂ˜G≤YG˝,çÂK˚ì˚J Ô&e›é–N∫CÕr¯ßµq—Ú8J›J≈e!=ÆàççcmÇÕ»;L¯g@ôù´(Xö#6Ø∞b∆Dó"’Lﬂfr{ƒB√Æ¬C… ‘í“ÜÍòŒ¥¯Í∫ï$4lDuËﬂÁ<î…q√iÚÍÿò”SH¬TµY*≠”àò	6∞GÇÙ 7r˘≤©◊Ú®Æ™·Ke´ıπl‘Å(í1Ÿ¨ürˇ¿<ëâl‰ÏeÛòFÈ	cX·~CÏn≤K»]áﬁèŒ ÈQSpãLM´µÃ.îy∞2ﬁ=VIóvÇ:ñ8À˛_†≠3l≠‡ñÒöåÓAO·ËüeïnÎ0öÏ‚%sü{Û48md≈ûúX¢úÓıáI{ì•Ö”3¬1~t{µºBΩuE(ê•y9¢Yò…{è5sÅ6E-rº¨NIèäﬁÍöÚ	ë◊yrj{xBeNÀı[ãÛÌpbÙÇìnJ6ärüÚm∑æú},5tÍÓáëããn[+Ü÷Úπ7ƒìNÇÒƒ8%Éı~H˚≠ÁìÔÓï_/é°ˆíEV?ÁäQ®ª≈sÂVk¯E≥£7W'Ì«¡'ÑÊ˝ fûI›S¯ZSQ’Ê©uÇ/wÜØräØxéC◊sˆKùá˛+o`Ù)‡≠HÍ¥;\üV´iÂ@ßvı:A[êàˆ#]qÊ6è3ïú3xöΩ¡≈TüÅÉpá±¨2iÜO„ü“àlp¡F›õtg BBú»‰¶Ä∫J
Y')´–C5°,»K›ò/WgsºjE }“ìeÎ^?™ŸﬂHë®yŒ…’1Ö£∆,JS¢…3∑Èë§ˇ≠ã5Ø#Ç9'ÇÉRo<¶u÷ìπú4OEÃ*™ã.◊˙P‰∂∞Ê˝òÕıV±¢"|¬:`û®·&€ËÕQ"S¿Õ’#° QRò¥1ºHS)Û’πL
ö¡Hiù»'%â”kUıÙzTÍuÌö≈êFÇ(˘]sÉâ5îXÊ/YåÜ!I€≤Áò≈‰Ëíx∫eO∑F™|jÙä®6 —e¬Å˛GªØ∆n9ËF◊S2)oM≈Å†øÅ3ïzæ§}Q=äÁ~MRa¡9GZù§¬˙!¬DsÚ6bÀG˛rÕ†ÎÔ§w„û«’ÉJ(Eë+º ≤ë…VÀk»Œ≤¨éÄ)5≥GÉ¸îL`C«ÃÈÑ–uzòË∞N©”◊¬Vﬁ´≤?Ç§-“]ëº<¬` é≤1Á€_©˝fûÓ^_gƒ}át´ÖÏ¯YÂÍÂÌ*ƒÌÈv˙}≠ÉOé™‚• 1˚óAZwûrö*€îrM˘D¥ê â€hÂÏ¿ò"Ô≤Á≈cñÓΩJ–8¥&πG ¶ª-‚éÔê£nß∑ŸÇÂÅÖ¿ø«‰¶z•ÚŸ]ùb≤Ø™©VÆEÏü°ÏÓ¿Ó_1	öª%ﬂ˘gIáKG‹‚òÏ?¸Gu√ıs,\Ñæﬁ!ãÉ{≈<#Vì;òTÀøâüz@O«˚|
/∆çyÏ¬∞'ûGΩ[ T≥ÏØ’Ì„~'e…åΩÑ<?|ıÚiË”ö·ùS,àú§çªGc/ı⁄ÿlI––x·oﬂm6ùÙ\˙:RXÑ©[ÖW≤:,8{-¶—‚tÚ¯îÅ°9˘4™s©ºÄÑ‚TÊ∂Ø®W—"Ò˜£ãYM†rXráMel˘]ÃÿºûΩ5∂≈$¥56ÃÊãu∂«Pbµ1ÎxÅïçªaå+}®÷¿0Û‹>ái™n¯,[√ÍU908`m’Ü+`wm0ªX]åÆ6o&Àa±
Ì¿±ÃYa‰Ö–ß¬(27…©”—Ît{#€7¢U˜Ø◊XiyﬂG˛Ëä˘óbéÓ˜I0ùáT_Éïè7–µ	E<ÅçÔ_Üî÷œ€√¸ﬁfN8ﬁ∏…dÇrﬂAVÍÃj◊ùdf¨–≤|‹X◊ˆëÓû4íƒÊÍ©—É«çˇ»ÊQYŒr4àbM·‡w¢¶M8…ﬁ€ÍéÃI%6ıú≠`l Ëÿ¸kHß–ïπ*E´OXÍñzqP*M˝bútÇŸi∏g≈	Ä*ÅÛbEã‰Lõ]9Y”à-eü˝S‹ÔãZ\Ä¬”±?µz£≠VØW9?Êüi`≈Ú[/P[@Û˛7öh>—í˛óm7¯˘6‡Ç≠‹9Ú»(≠¸   ˇˇ ©ÏxúÏ}›r€HíÓ˝>Eô·ô!◊$≈Qñ¥≤;d…v+F∂µí<Ω≥>7DñHåAÇÄñ‘jEÏÏ≈Fúà›8W˚Áj/Œ”ÙÏ+úÃ*P¯ØAôv3mI X®üÃ¨Ã¨Ã¸ú—Åe∏ÓôÁò≥q›3‹œm”=∂áüÈ®Iÿüs«¥”ª!ø˛Jjñ}UÛÔÌÈ‹¢{ŒYPˇÆÈÕN{ÏP◊míGè¸õÔÊtvbC:±≠uGRÆ;‚PÀÃ/îxÙ⁄kYÙ“˚˘.Â—Á©_ø›¯{rnœ…°ÈJ=rÓò∆ll—]ÚbqyIrnN)y92ŸG„1‹1g‰zHNåµ»ﬂo§ΩçêΩãÖÁŸ≥‘œÒnÊÙYç?RÀx∆ûXÊÛ≥€:mêgœ…m∆sÑ–∂ÎŸsò¬π1Üπ∞gı∆?d>l√¥Ú±,‡kSÛÍº≤íøñ∞:µzi;¥ñŸŒ]˙®	"iº5¶ÙŸÌœ∆Ök[èítØ’k.O´ª—É;é1saÂhÎö›¯•’ê˘u´GÊ7≠<ÍÿãŸàéZóÀ"∂$@‹â1≤ØZ”π¥Ë51=:u[C:Û‡≥ø¡hÃÀÒÁÿò≥fU|ÿnÊ◊…•=ÛZ@Sü…b>ßŒ–pÅn∞'&N[ÀÄWçõ√Vw–!√Ö„⁄Nknõ¨—«Ÿk‡–‡Ëê?„Lç»≥gœ|Úe~âêHVmº“Ív:ƒeø˘Øl—/0∑e,<;ãP⁄€Èê1Ã›º5±øPg7Ÿ˙NÙÅÃWŒÏç<©—•ªº©2›C√˘ú?)„ßéË_˝ñG´5Ët6∂:|YŸç><¿˚ﬂaw∂Ç;Ï©´	–I¡‹¡WŸcâWmÀØz∫‘´ÓRÂ^ûÈY òî9qhãâI˛§∑ò.—@Ú∏sc&Òaç≥¿Sd ã#⁄lmkœ˚ﬂˇwoü÷mJ‚¶©=≥}æ1çÃ4¸åoÃÒƒ´e5íóÒ<˛ÖZ/ò∞Åeˇ˘qÚˆ›Ùg\!ú>%µ¨iÃÀﬁ∂œˇ.sxa√”á≠ æó¿ÙïÌlñ6É¥Îa3Hüî¥Õ¿úçÃ±Ÿ¸[ë¡øW¡ñ Ωp;˙¬ßKæPqc∞]ÔwÜˇ∑;√> ûƒ∆¿Óä}ß•íç!µ/∞/ú—Y–Ÿêí°=õ—!ÿhŸ¯ÿπX\\X4S˙ﬂöÓk‰:"¸#©guqd~!ôSí*JQßéIœv√¡	Ê¢rÍ¥>t7qIÆZ[dˇ•I“B˘Æ'_ÊùÑçÆ.|•X§"ü˛“ÍuÑ ˇ–˘=˝‘Ì¡?Œ¯¬®wöÏÌ≠A„cû!1„2Á¡ò8‚ÑN©cX#do>Fqc≥#w∞#uØª’Ïnö›ﬁÙ±è}§gûhA·b∫@T‹bŒ}Rt◊*RCiîê}ÈΩ›Ÿiv;Ωfo≥+zë¯›1ê¥©cg€ÓÚá$$fBLÛOE7˘üõ°¿ååÓo"r3!“óÔn∂¥ÚˆˆÁÄÂœ<:“sÈø◊\ﬂ˚íˇâÇÿm[t6ˆ&wm¬‘3‡H¯ˇTF∆QÊÖiÅ§hÁºO]Ø”‘Ïô≥ëEœYwƒp^±^Yî+wl7?= i&S∑+íﬁ/"ˇˆ˛ΩÙLb¶îòﬁp„.[mÔÃØ…è/è^ˇxNé˜ˇ˙Ó˝yÎÏ|ˇ≈ÒKÚ˙¯›OGo_ì√”w'‰üﬂΩ}Iéè‡ü£∑áG˚ÁÔNÛ$ˆèHlttn8c∞
‰∂ÇÿÆRõ)Ω}_F˜A$`‚xgÏ¿Ú∂ÂŸ-πh…ó»”êÿË,–4Äc"B=¬ˇõ©¸øÉ¸ˇ4Dåô9Eñú/,’iJ_—ÊêÕiÆwÉ‹î+∏Ì9HC§
≤˜ååc¸f∆úçÆërZ æêtjLΩlÊ4ƒÕ
—÷ÛÚMï ˘Ñ.,6ö0`v§1U—ﬂàì‚p”ú\IK7Y3‹ÖØÃuΩ¯Œ⁄ƒtß˘¥”Ï±ùI!¢B|Ë0}ÑÅ)ê¡ïcÃs46BòüÕaP«ÿVLƒV‚	Èfãø≥ú<8£*i–Ö#$œ!ù#Õ"?[∆Mœ˚_úç¡>µ-‘ÿR3sÊRØÖ ∞Ê„€°·Ä)à*–≥k–ïõOÆ	“º4È®Ü‰)h„⁄bD*˛¸–≤˝XÉ=kU> æO±˚£>fg[DéÕO6ÙV&eæò`QúY˛∞	‚7\œpº⁄≥Ô˚?ﬂÂÏJa¿ñt0√¸¬ævr»‡ÀKdìE"¨ù≥È/xO/¯wkyd=W“Q“TÉ$Ç sòÜg∞#Û_˝9‡æ
∑mŒÜ÷‰á6‰~ñ⁄T}Ó–/0ûÇÔπ[?¸R˚“¥`≠ÎÊß˛}zP@ ⁄Ì6>'éêFﬁQ0àL±œ/ôn›âcŒ>_µ∞ár›+T1WRÃD µuR]∏|¢√ã€∆Ù∂ùA®∂ÛQ€ßŸBzõ`˙∂õ]‘'6që|4 ÀøV‹4‚ˆBƒöàXaÁ§W4=<˘Ü ^æÛÖ&ìÜ7ú0√#€UãW>Ωﬂ*ØﬁπRØ=&Ààk˛îŸÌﬁÅŒÂÿüÈOÊ»õ<ªÌ∑w	M`˙÷≤d∏∏êœ
;ïÍµ´V∑ç\—ïÙwäã…h|n8¿ Gb∞Œ®Iå0¥-€qã;ô∑à9*Ñˇ›‹„îHÚGrJ9W¿ˆ>ùë+”õ¿<hΩÉ*Ùà ãÃà·8ˆïõªƒß+ê%Lb‡?8ÓB_6ŒÓ‹a?|ûtGF¯ó∞?:IñSúÔ€[j£Jß¶ÛIvä/Ë¿∂πªtÎ¥≠|&µgoÏÖKa~ÉÕë´,Ë]«:C†Ó«‰R∂vn/Üˆï
öÛ%#∞˝N'Â%√ﬁk«úˇÖ:û94,¡‘ΩL]ÀˇR>ç'i.Jj˛—H.Yaâ+°≈§Í)˛ÑøzA—wh:\ÒbrØIjãy*ÿê#î»wq¬Y†ò≈E€DRÍh˙æ|:¿1≤©êˇï"Ö≈˙«ûΩügäˆ™(rlO›„¬¢ê¸Êóñ¢í≈Eô∂⁄Â-˛«π[‡)˙©`ÁÉπöyb‘Ÿ·ò†Èí©9k]µ:πbF…ÃWHÚﬂ€ec+˜“‘ƒûBÍ9ñ¶4uÔ~"]ÚÍ›)©˝ÂÂÈ_…Ÿ—õì„£WG/kπ3ò=í®^ÄíªÌ ?πhudπËﬂA‡£}¡(â‘Öa‹PË_∂.£˙@ÓõxiâÓÚÉÛ˝≈2á_≤ù?1”0Ôµ.fÿ©GDØ§Od°|dïrä5‹∂”O≠ô7eÏPäíΩ ;;∆†M•ŒYQ¡|]	UPÖ/®–P⁄aCëΩ"Æ®·‘CC©ÿt‚Feëdóä˘§‹ùåŒê0Œ#·°ﬁQïTS'¯ì˘€ä∏XÏ-n©å4‘DŒ\E`åœh!e¥p¢`∫úUpBË{·¯e^íz™˜∏Å∑pfEÓ3~y<¶c=†â¨|)â6Y∞=æSÔffLÕ·9Œ=ÁÊn∂†´±Mó÷wŸá¸¬=ÇÊïa˙%U/7~úrFh¡|µº	»⁄Ò$ Í˛ÄI'I«C≤Vì8˛Qn8®‚/©pãVÉ{sE>8[\0Ìí^œaÉ≠°ÃD¬GΩ
ygw[µ+3FØr<W ..óz/˘<è¸yÁ.8·≠&ı[∏ó?ˇÚ.yÑwÇø…]CÒç%tè9∞Ié—ì‡¨P·Hã≤êˆã«∑4mË·®~˘Mb‰®Éﬂz∆îäl0bÒkO) OÇÀ^√*ºßÚNµ]oÔÿtΩs{dK6ò“ÜπöùL+Àòªû¡âÃ„Ïz0z∞ä»ì¬ìZ£|cje¶’eŸr[ö]efı'„õÜ’p´ˆfzúw´t8”W»ππDƒ;»!ı”rã)Ai∑,Ç¢´¶Ï7QŸò’XXçÅÖ±ﬂ[°±/ˆÌÍ]Å≠ò˚ÛèÕ≠÷ñ¢’L/=27CŸPÃÙv	Ûyì?dQ†ã)u·ßIÃŸ•≠&s“cÇªù0tÖ«∂óÄ#TO)Ç·ÄÑú∆A◊Y$¿ôÁÄ¬⁄ä}`œ˘˝∫˚–Wx≈0wÈ	Üë˙Ò*JÕ=g±ô>±åõ&9Ò”#õc@EÃ‡Å˜P&æk§å
òÂ%“ÚÕ‹>äÈÁ·Rw4T≈Ú™ﬂR üàx¡ï8¡åSuC/E].ÓI˙–€A&òà_¬püØÊS"…‰[ÂoíbTp<œw≥hú°¢òÓô4>™Ÿ¸í£è∑yJHÏ<4‘ùÿpÉ]\ÏÂ™›P’á£¶©<˝8©'∆¬•l?„±MJm™iº¬zçΩsèΩSÏ®q«W 9¸M˘&ÎŸK”≤Z@èÏåøp¬kJ[5^Íw˛ôæ4∏ÇÏ›x?≥P˚Zêä»’ìr_¡ºu0⁄MRG¬ïÚìØ°tãT%P;e¿ãã5«v)Á˛0æB‹Í˘bç›ÿHô_·#≠‡'q) ∞ì!P≥=P^ö¶|tna °´˛∆¯Lâ»4h0Qv~∫?gK9ÖUoThÃ'˙¥«ﬁ)À©àù¿<Ï\†˘ù/zTœGÆ(ÇÇ#róLç9ôõ3ÂO˙œ5u–”"7⁄ûÌÈh¥·Á¥ﬁ`aîµãXE=ÉQüaˇ¿°∆»ÄeÀ˙‹¬|à¬pWiBEÍü8ÙÚ∫•_€6H≠7∆‹ÁÊΩc’#„R:∞¿Àc˘œjü.,cˆYu'w®ı¨6≥1;DŒÃÜæQÿ”
cƒ•rÄ¨≠E÷íbV»úùKQA¥§ëUâ4YÃI"ª"Y≠:["Á
ÀΩ»·Ÿ§ˆ8J‡w5L1‡$BêFÂñ™z¥mûòÅs!Â–MÃ§ÚŸ⁄ﬁÜQ≠÷¢o#.{ÿ~oZP}`UK:'Eˆ›‰ûﬁÕsÿ∫@îøƒ∂	^ñ[¨ûÈà=.|fX-ZV?«ÁÛúºp™;¶ﬂ;ww“ì˜ÿ’x⁄ï*ÚÊ˘,ïvø∏cfÍa1¸GTòâf»nÛ\/ûpuè	É˘“—£ÛÖÆ™	Rb£≈£V¸Éà3á@ùò‹Ã©c’ÒÁà‡AMmH¶ˆà≤Øu;`œı‡'vî≠∂⁄at£’6ûEµë_%)üsm§°°éhªY—{∂âëa=ÃÂÎGípΩ“^u[ˆÅJ§/gH`‘VO…5ß6
"Ætk;’Ö
=?˝?Ø|JòÄË‘ûÉæõüÂóºñRjïù-,´8ñ∞‘¨óòs÷∫™¢,Æ)Ã‚*ß8ãkYZ\*“‚RX¡® ﬂÊ˚ÉN,$&v¿'2ÉËòÿç¢•*â:¥˝ZÅV–Ñ¥ÏÀKÃ$ÌÈŒõP©£⁄t\ôVˆWÚKè† t'’´õl±È]Ä ™G⁄I/M»/±
S„ñÂC∑áí∏ˆ<6∫2 €>‘øüÛ£ÖÅÅÍ⁄CS¥#§/h≈àK?~'º£t”‚‹öX%î/ÖRÇ@¸ä$tÉ”˜ò?LËÒ	ñÕ÷ÏìôLÇçïˆrÃÀk>ãIY-ß‚ª˙˝j”¶∫{>¸éÇ¬^:±¥¨yµ›ZwóŒ—éÃÙ‡ øZôãiÌ˘[{FÀHó˛}‡_≈Î[‡_UäPôÛü÷díÚK∆,È„¬KÉ©î‹∞2K"éz∫Ré¥=…ΩNÜ∑´ıvI
thQfôëqóW~ÂØ–SV⁄ÜW9^÷v‘/÷≠¿ﬂÃöeªÔπﬁ÷£'	îeÄ∫w˚î≤Ë˜ qb;Ê/@,ÜE¶‘30≥Vf¯Y1BKuNÁ5RF¶;∑å!º…3roâËã0òSM@D:æÔy8ç‘=7Ç¢?¡Öæ>È|¯ÆíΩ?óKB?cç}Ií’¢—¯ßŸkÅ¸)Ëk‰âÁ§#zπøK∞«•ª∆kí¶ıÃˇ$ªc¸ÅDø¯m—-ç~qV¯—pEÇÓ3RèSÔ2'ΩÙº&®*ºY´¯m6*µY∆™GÒ¡4î∑gûf•±™JÚ(hW9â/ftH[[\M)ãã[]äV*|π,w
Î∞&ë%µ›¡”Åna˘∫≠íJ‘˛<≈Õ(5O‹∫xVcS˜‡[W·äÜ•¢˛‘óiIåH¡Rp¡äÌ±àÁs;#†2ﬂıπœÁÄy>Ös8F≈wœw™ÛâÊO¡ÉSÙú*R˝—∑ä⁄q´lÛ(¿{´Ë1ùöi≈Ø€Ñ&∑öç;@⁄p?ﬂ∞∞ò∏|◊‹¬+WVÚ¸∏[ áûˇˆØˇÂ/Ñ”ÌΩw)Ê¯ÂJ=]Ÿû)Ÿkœ+ZBhØî‚Í ÜÇFáﬂÔÿ¥¯eS©ÒÒ-áâßLˆ;RÖÅ∞sÌN)FˆQ˙y^⁄Ù9ZΩ…÷X-’éDÛö‰}õF"ö¥¿zßáÑ·PXpbsêPIXB≠Ó÷ë>™ª)·øËé¨Ñ"¶©ºg-Bä„CP“ÛçRƒrõﬁdï´Õ˝zãÌ£”ˆs›ñ∫Ñ¥WmX˘@H-øQ◊v¿BémÁfÉS∏¿‡€!#PµY}Vû_åö≠y)*≠åTC®ïÉÓBGçñWáqb">éË.Uä)ˆ2EYä¬ò3∆YæñDﬁcÏàG˛∞◊¡Û#^Ë7R˛:5Ö≤óàY.D4àˇƒ3	cÓÂ”çscÏÔS[…£ñ(‡OòÙ®⁄x|‚}≥{õG~
c<aC«m«≥Q ∫Æ†≈LQ]	∞«ôFπá_k!§q§ü ˝c6Ûƒòçi©cZt%”6˜±µYox∞ßO˚ááüﬁæ¸È”ßö∫gô_Xﬂ~b_Ω1f∆ò˙nb°ngAµÅÒ9⁄5í2S:-ﬁä	’Ÿ£~≥ˇvˇıÀÔr–z„·iˇˇ∏0áü9y·ôÆ‡ﬂ·Ì®÷(’…ª‹A~]$¨¸s¡¯•A&¸ìm◊ OçSf{ŒåŒÒµö‹Ÿ¬Z‘ç$"¢¯∑5Dﬂ0 ¡ˆ‘ò◊·OV¸GG˜Ò{¸ôﬁ<√ÊÓÑ¥bøÁv?ÿ∫0 ˆº˛äZlre·ïﬂQ·ôÎ  œüê∑Ù™›nÎw:—ë@û(Oò‹ëﬂ˛Û?˛ÁøˇçÅËn ÖΩÇåmJ™Q
äE[ –¬duROcµ(á“˜[sh^‘§,ßßÖ®`I5-R®≠HKì™FIÀÙ´ÎhËAÀV“R ≠©é&ì””§Î®´≈˚˚˝Ëk“»™‘^∂éj€èΩ
ÌMÍ«ÉÁ_k¨¡…‘»ï8€ZNâ≥≠Pâ√ﬂït£Œ u8x¸AáSúØoNÖÛÏë·Õ–“,ñçT±"F…KèÎ«îó≠e◊›ˆã'_DXA≈•û§Ëm ÒY ∑v}ªπ ∂±NÃÒD'jÄ◊ÉÚﬂ≠Âﬂå`VGüÌ¢XºvﬁN≥€4{=ÅnŒ¯-lQØÙ] 8˝Ï#≠-6(5 ‹ãå4|2g†H`8–†=Ω¶éT+®_('Dá…¬bÉdOrÜÿ›lv∑`)˚˝»yË√@∑kK◊ [Yµ¬üÖ¥Ÿâƒ¡:†»å§;RÄ–áLKkT\°Á6ãßµ≤˘˜^Y¡I¿v“»˘ê∞äÜß˜uÃÕF.oVŸ„ìu8‰◊*˙ãVeg}6„]<ß›—Í∫S"¸PQ‘	 SO|c%[ﬁÔüú!Œ˝Ò—€?üë«Ô˛¨ú√ñyB≠9X«∞≥†~~S}Y∂ÆJaêU#I´~√≈⁄áNª”ˇ»Î„\IV´u£'"É“
,»;Õ√àBQWUá'ËDjêNzÊ Q Õúõ:ò‰Ã&CªK⁄å∂›πezıçˇk÷¸áèO6Ãå´#Ω4âu4∫÷ˆˇ©,é9ù2TjlÃœ/“sV,ﬁNC?)D\`“)`∆µ–Î¡’k«sn4gÇø{n8.ΩwJø8:mV›˝…Ù&ı⁄ƒÛÊªºhRÊ.{D◊ÛÑó‹˜∞)Ú§Ï@¥cû--Î›≈ﬂ†3zEﬁü◊ÉniRâoπ=±]oÏŸv(|:§ı⁄’’Uª÷$µöÊ`?b†“uÍ80·z„’&ÎKÃ©zYñ¥æa…˝^û¨4XÒ“Ãóv‚·>-î¢∫d/≤ñÇy“o`π¨§ÍÚíñK“◊í…˙¸“Œ∏àÊ\\c—8Ü)CP*8¥ã@€ä‰h‘≤¨$OÛ“BÆ≤éóÀ¥“ï‹C5‚ƒt®êkß:e‰ÒÍN$ œ‰w…å&ÃπÜ…÷¬ŒßZ¬ïˇT?â©Dìﬁ±ÜéÀZß™árª∑Q√‚ª— Âà¡2j˘èbF ®ÊZuƒWµ£SJÈ~–ñ¥Â‡z–ñ#◊É∂¨|ï–ñTﬁ»µ~*ØN>A∂“+Ã–zÛ3~joØÛ†ˆ∆/û?§ﬁóÍ_ùÚXï¥U–Nax¨b≥º¡íÓ˘>iZyX¸ö$ P$ƒ‚ ∏†(pÔlÕÓ.9ò–·Á˚∫Ih9+6øÔó7.:˜PNﬂ*<m‡XΩ"∑è,©ãæ5JÄ}j`3j y(û‡qu+LÀè"—«¬Ωjmë	¸'≈/¢ÓëîœG'∞ bqûﬂü_g¿ˆYVËÿ°Îb∞`ﬂTã	jaÒ‚!z·„Í0ıÚÑ(û‰1B	{	0¨8‚_ÕOE÷)›v%£#RX%Wƒﬂ]Â#^%Å\%Çﬁºò•Y&.k«*2
øVFµDª≈tyXô9ø≤ùS{øQq™¶≤ßï¥Qÿ¡Ñé,rc•Æ√0/Õ!€C~æÕ∏
¨LTRk‹≈Íˆsáå«Í˘˚WzâõdeFh´eÜò¬πp®ÒπuR∆€—a”ò“qÃ˜8…çÈÈ}©K@ö-!
»œ·ÑnOÛB¢éÌ`AÓJ ≈ã‰Ω˙^ßBiﬂÇ˝‚C5èFø# {yÿ9¯ı?∆–¥WxÈ)EÓ˜àˇÑÀ^¬ó(ºW¸F•®ûcëXG∂T„Wa“‹]
Rd$=6*√D%YHf†&◊*8HsˇπÓ…¿!K∞œ@ù[|Ö”á= -Rœ0≠¬TÖ˝¶∏Û®ﬂ}qÏŸ˚πƒqèC¥˙O≤"9œomäl•\ÏC√v[o¨VEˇÎJ`ß ¯aóÛΩVV¸4≠®•ü•[ÕZ∆:≈ì"í•P”R[ÇUÉ∞*&˙D*ßÓ,]_…≈®bÌ1«ku^ót€ˆïw§”úÔsè†I∆
}>hëñ
Â¯˚HıO±<ÁHmQ‘†"U8≥¬∑SS!‘4-ﬂ∏Çû•bËW-ö,⁄-,:ı:´ÑE?È[Í¢π+2G6X ˛Åúíg…ç(aô°sv?D-•8vµ]∫á‡öj@OÈQ<î#ΩB“QAøRf‘O`trøRÛ“Yá⁄hÕﬂP∆·“˘ÜkümXQÆ·ögVìg(gT≤±
À}dﬁSé°jÜ·=‰*V`¨ ∑P5≥p∞LfaeyÖ˜êUXMN°JF·`P:£P'ü∞ÚlB%KS+ì0GçâqvO34ÊΩÚÍóIıÀe≤¢™J£±8Ù˜ÅBˇ=`–ØÅ˛Î„œØ#˙¸*±Á5/Wä;øL@f5¡òï£"˝ÊWÄ6Ø	êqˇHÛ˜â3o(Ûöôe¿î C)}5 •ÔõzY%M≤]
ïZ;I/ÑWØÇ»
–‰ÔK˛ÅO¯4ÁZo>’
µW{ˆ[®Ó∑$Z|â ~´Aä|HÒ™ÃU^†dxe—‡KØ*zL–g(:π“ﬂ(¸∑åˇæ∂ËÔÎâ˝ŒíäS•°{> ¿u{î¿®∂∑˘	æE`ÁqMµW8F»√uAÁMêMì\,./©„6∞πÕ%ãR‡≥ ‰ie'3xÓi ©÷Õ˝¡±WÌl\ä˝˜Ënºˆjÿóqﬁ¯˙z@Øﬂ˙Éü0Ì˙û‡÷ø¢BhΩåBáΩ‘ØóX/Ø>X^=MwXRÙ
–—Wäçæ22Y*∫*&zw≠1—oÄË˜iæ†y5pÊâÅÂ£¬iq|Z˚øo∞Ùr:
^Âıº÷¶Ïì¿◊:√
d/ò˝} ⁄ãáàB5∫`´°[±ç_æ∂ı£1˜Ãa]D*ﬁw}*Ã÷î≥¸hp†ô‚g>É<ÛòπÑ¸îë'Äzxô?π%ﬁ(ç√¥i"eë —ƒAÖìùùf∑”kˆ6Y¨t„cπ◊ØgïûçÍ¨˙ÕÎãÀ∑≠ñ\ úÃc[ŸâC[ÿ ·OíssäïEa‘åI2>◊Ìw	Yπ¸ukÛ·µ«g%-ÓïE›Û8∞!ï(¶{/˜	ˆåuIw!ıç˛-›ÕJ´cY∫HäK[(Sœ7JËK∑È~;*ÎÚ◊”xÿÎA·a?Ùù‹ÎﬁÙ„A›…Ω ÓE|n¥v}máœø§ÏÿÆóØÌ§?∞∆ÍN0ƒmß∏KﬂÅ∂£Ì¨SkTµÑ´Ba!•Ç¥JÒ1À†øUã˝∂»oÀ·æ≠æƒaæ›‚[Exoï†ΩUÉ^°è]Q	r≈WÇ®µBÛêµZƒä’‚U,ÅV°I¬K"U|B™•B£¢BÖ6>Ei,∑%a-ñµ®
“byKø;_€z˛]°∑iªå*Ä∞∏W‹∂ï¬Wh∆@i–Æ:^õF&çbõK µ≠≠˝ıP⁄ `¥Ué–ˆ†·>h∏ÓÉÜ[xik∏ä*ª÷KQ˝N1◊÷IY]	⁄⁄7´¨™g®T≠Æ™'ù.›éˆâÍ%‡Õzª‰îéC:jM(K‡∏∞=QmæÜá µçmÁ¶I∞^ÓÛ±VÏÃ¡Ô¥xÏø	,ç§ÔÀUx¿ XZ◊¢ÑïÚ&Ü˚ˆå0≈‹pA«†(Ja®E}˝ËÈÔäí¬—B√’(˚Â™ßı$CÑ2®‘Îá•9¶óòJ3¢ªÏ¿ì∏ãÈ‘ U¯I∞¯´º#F∏8Ô“VW–8ö<(óvì
˜≈íI ï?éYK“ÅD{p{â¯GŒNùiMgû”∏#-˝¿û≥˚Í≤Q·\†61Á¨¸_∞0ue®Ç…ó:˛ ÷(?Iw€ù#“€±{2im¶•
ÂÔ∞|—∑T√fpê€íú0∑í
“ﬁ£ºaemπO#;.Ò˚€¢_`\øR•¢Ñˆ±∏ï`AÀ∑¨†•‚Å∞FŒèä˝˙bXîÈùrê»WV∑Ñ.ãÊmsçºÕz¬É(>}⁄?<¸ÙˆÂOü>’Ù¨ózg˚Íç13∆‘ÁIì∫uD≠”“è„›")3§°ØjÉdè˜Õ˛€˝◊/ø≥·ÍåÑ∆˝„vjNNt#Ñ™Ì§é∫®¯dô˙5∆Ök[•51ÏH8ê±P7?Œ`"Ö\+f$+]±Á,qâsu≠&w4¨ﬂ:à√@â_¸€ "m;úá?(ñ∫„‘Ô-;≥Çoﬂ	iƒ~œÌz Óª®‡Û∫Ωo®—IïÖS~'ÖÊ“ï¨Ÿ⁄Û'‰-Ωj∑€∫Nt#ê S%w„∑ˇ¸èˇ˘Ô#òª¡´Ùh˜	v%∂’®ïÍ·;XyKVwK*YÀt(5‘ö√{¶i9,8@—©(`Rk’Ë_)⁄sIı≥h≥ıØ4-}˝‘/ôÜ÷Sã˜{P√§1Ußö$&j›¥±5ıÚJô‘á≈l=3ôˆ∏nf[ÀËf∂Íf¯ªí⁄”†jf[Î¨ö!" ◊SÕ“{Òï4≥‚Á‘äù2ﬂ≤_=ò˚¨Ù1—5‹‰czå=õxJËhLõÃ3<Gó3”˙Ä9mäÅ1B	ΩôcPp(2È~QvA ®;ÅéP•ØSÚt
«.ùç»‘jœV“:òk7ØÏ·¬%/8nàö∂z˚(Ü‹ÆÛMTôÂ€
NŒâC]wÂ5fñ[o”«r„øàZØ÷∏j87çå6ûM‰Õ`"«8{3OHì∂q∑Ôf4IMãÃ†Ë¡í)·v…ØM†Jß8ò—\RÌÜz™öü†ñòÿ Á,L.S‘¨ı,åÿ;#	]±¬∫≤ôÑh”RûUÏI9—™x≤k
à‘¸“IßR⁄íŸŸï=¸ºÒ~f¡‚„|+öËÎAÈó∆ÊC¬AÆ~ru"K[“tqº∞)K.údlÈî:‹—z›)%Ωe≠H˝›K„∆+Ám´"jBFÁ¶LpÊª÷ﬂü)yl^X¥¡ƒ÷q¯È˛úm7SXÊÜí ”…iì˙¥«ﬁJ%◊sÏœÙ's‰Mû›ˆxÕ<^~◊Û‘CúSî7/å·gÀìÚñMhõ´÷≥Ft¯˘‹∏Kú.h!jBX&^l…H1Æ≠·‰û€|:4nÙî6≠X3ı<êâËSç§JlßJƒù≠[ù&ÄîÂüêqgß$î}˜¨zù∫|=“Ø*‡j@‹˙ı3# V)_-∞ñ∏5>2nTõ”Ä?0,ä%Û%4è4˛WoêY§8Ω®6Ω¸p-¯MçŒ˚ë,∂\4Ë“ë†2á˚‚TóΩë¡uF\é«S6ı¯ﬁad	¿9¬ !¬l™*â^3∏¸=¿Âg∆:RˇæVô”W†zQÁ¿ïlTsˆf˝÷Øç™]t˜õf«∑@o%v€ıdG7gF89ì≈∑÷ûœÌ©çµ–WƒãUo≤ÇE∑WÕä{™¿‘jﬁEÛ‡0€¨hD·ñE·ò¡FH˘ú√1k;jUôÙ˜ÉñÙ{ƒ%M“S–Õê≤áa†"°‰%aSëkxmÒæT„4™ı*%R(<T¯H¡Ev@⁄ôQàzMRÚ
àòõÙËÌK“›%¢˙#9ò–·Á˚∫IŒq˘……c4¶JQ¸Â“T†~‘ŒÀzë…P*í…ÍI≈«.N…f¿∑∞£n¿Øx8Ë¬´Ÿ<.˚õÒá⁄qü∫îU‡ ˜ã˛˚BQM‹E}º[ Ê∂æÇg7Ê˜*<L∞∏.QÊ∞?øv∑ö›ÌA≥€€iv⁄˝∆GÊ™;@e-ˇÿ∑±•¶©˘PÖÑƒ≠¬«ïNk¢∏ç3“íî©`•¨Éõà”®»Qe'EaW2:"≈≈ΩP¸›UFËQˆ ~›Ωπ
ø≤XN\µEƒpñat•Ÿ≈`1”=c~40*^ŸŒ©ΩÄﬂ®®¶¶•·ˇ(©S⁄≤≈œ–Í∆Ï£¿*ÚX F\ÈojÈË?I–†«IÜIØ]‹ÔÑ®\=C≤R·ru∂e“@ÖÁ
Q.±/ànëhVKz”ˇÎ?˛
«£.ı^^É˝€ÿŸ‚óÖWM≠cî=ª%Ìvˇjí~’èª‰ﬁ	˛&wç’ù®Œ˙ÜΩé´ˇ›NZôbü∆”PÀRœﬂ“¥°á£äA›`#Ò“K~IoΩƒ‚◊ûRdxè¯O∏Ï5|°¬{’ùÓõxD>≤•ì@•D›¥® jPèË ñY¨–◊0Î ±S%eµÜ3+L%rZ”ëöÚ?‚≠˚76Ò´≤Lò”◊◊	#éòÛ<jPÀŒˆö
ü∞–3åq),†÷øÀmMƒΩ‰%ªã…;5l®ƒÅxŒl1‹…˝˘‹c£gø∞±‡!æè©˙ﬂ Åô{Iù#ÂCk5b¨-Eã%	¶°‚K√Ñ∑éa^ô’êQÿ££Tª˜œ∆<5q%'˜≠t˛â÷Bœlêt§$Ÿ‘ñUAáæMU@q˝≈˘ÆÎ'´}	L›e9yÆáEÀ•ÊÍïñÔáj§£xicïâ"õ"ÜœV¬ÍÅı‚≥f;ÆüóÍ¸
ÈÜÅ‚1N‘Í\LmË;›ÏƒCõû"ú;I®D*⁄ßoö≥A„©E0œı”R¯æíÆ¡ÌLZµŸööí9´F$Í~I5W`oó¸h;Ê/¿:ÜEﬁ®rfV¢»◊•ZÚ/-¿˙R¡í†8#7⁄û}Ù9◊~%@~Ê—©)?ä≤kÅ>x—ÆBS§À!¬©ﬂgCÜ<çﬁQËu·≥ënáÔ“Ów	È≥ËÏKí ?d˙O≥Ó:
zy‚9Èà˛DÓÔ*’ OÈáMJÎìˇIvó¯âÒ€¢C=RÆ◊÷˘é≥/s+∑)o:Y¬"ÖmÑ#[¯/∂;XWh´\%õ≤ıj¿XÊ∑ﬂ!ÿÙé¸øwçj+⁄§`Ò*˙5°É‰Û“ÿ¡–´™-™ ‰•«‘„ËÚ.bÀøw¨8Ä¨F˝Æ≤e	ó/H®RKπ1%RàŒˆIÇ(]∂œ◊?ò1∆óâ‡:ëp°V 	o81g”1÷«Ë_C™É?ùâ>MD]ÎfŒ◊Ñõ(Fïwœw¥c?ˆ1b‰˝\‰˘[¬ÆS©r˝@ıÓ+éîT/¶æf±ZºÙïa•WæÍ+¡GW∆F/çåæ≥B\ÙPW‰‹áv€U¸˛Ú@Á´D¸\ÄÛ™¿ÕıÎ ñ˘,πl%Â
Í(ØƒºDOÕ2œ˜Ü‰yﬂ†Â_¬sEù∫–ùﬂHπ¶¨ªpÚUAuñÅÈ\DßVıÈâ´@ŒºÒ•Å«øñ
rØÄ„’Äç?ËÖ◊ @≈‘èÍ@ƒ¥èo4¸û‘è“`·⁄G¨Î°}hy§äSàa+ê≈'%ˇË8^£òÀ¢a0îé(6ﬂ;~Û¡1*¬Â+Ég±$ÜE&ƒ˙A‡)LÎCØ´+§°ë|ﬁ˚~ ¥'c»AQÎU≥¯6"∏`#`#≤ØáÍƒ‰6‚6‚´¡F|[XE:ö
VÑ¶ä&—}? +◊–‚E˘eö[/MÌ]"~=†K<†K<ËoËyΩ|@óàuhù–%éè…@T˝ÂN`óåA]ö3p	Ö¸÷≈t`""bÂ–Zu√B™÷ûΩ>ÉjŸ¡x•Ûû®¯◊vø8C≤öø≤p„'}ºlaP¯<RÂ0ë!r∏‘÷Ÿlv∑Õ^ø/jÎ(˜"5â:›!\øÀ,˜œÀïE_ªAØ‰y6n√∂*lCˆÈWu®⁄ı—O”v@1!7Cãñ¬°	“ﬂø/–€ƒ‰·{)p∏¶ÚŒóxsA-ÃVô¿F´¿%hÜ†Ã«Ä¸õ@˙2ÿÉÙloëÅà-œÖ`osßŸÌÇÏa ƒ†·'¸Ö-Í°Ÿ§å”l—:üNî«DÎƒG*ï«»Ë†Ÿl√`#⁄”Î`ÍH´∞%T·çÔhëA~≥ÜŸ–¬!≤∂ö¨ Íce D?…≤+JeÎÄÜ5√.Ω#ı K~»‡Ü‚kÙ¸S)<≠r≤˜ 
Œ]S“ÌC>‰53$NÔwò3∂%”B?ï≠®€(Gà4rŸ∏ ¡ÖµK§z 
Cìπí°!ﬂV9.°é≤Q	NŒSÑsı«T]œK$*áÔh’∑UT¿ ±RÆíÄXkß6=‡c!>÷J¡ok[+„πıC«Z‰™¨»‰WËT	o}ñ/o~›ÍÖÚ‰ª@ë
$‹RµÁ´Äê“»é [lk¿XîCä“⁄Ë’0+wZí&á9"xMò/eò√?_¯Ü·óñdéÂ∞ó4Ç”Spót∏b	à%›H˙ÚäÏm‡L≈◊}∞Í:A3-Õ§_ôIèSÔÜIŸÆ÷
>ÛÄq√±|\õ˚8ˆºoc∏Pí∂1\K⁄¬ïÄ$%JÙÆ-HR9à$’4i[È˛ò´(¶ÒòñÅ5«¸µÙ‚+≠îL‰∫á4.?L#+>Y¿{%∫|	U^fËDä\2(,M¬C˛ñÄUÀ/áÄé2gß¯õ‚5‹ìfmC!£Ã{ø©Ì,¡ì0›·)J¥‹2VπÇFTÜÆ^/óº=Oôo«_!‚ìW].ÁÈcìLi„N”êΩ@SÒ+Qﬂ•aπ’ìü‰`È&,È©Î˙D(5˜≠íaƒù%D˛ëRez÷î¡)*ÖÍìÂ¬DÓãx#äã‚Mên,Œ*3è∂0“™àzÂ◊à|ï÷)Ωt®;9∏J•ﬁCzi,,œ]≈q]qsj®•0¡f	z»^µî¬˛•AQKÎ˚”D9ñ .Na4e¥w%%\_sW%"Ö<o!ã0H≥æõÛΩÃèˆ6¶6+∆üE–hêˇhx√	®,ºzï_)3Ê\ºΩ∞‡£1÷î6,v»ôaßﬂ÷#áDºÃIçMïÔÓ¡´úöWkæ∆kÕ◊2kÕ£É1/ûô◊∏7Œ¸*Î‰ÒÎ™ß„˛„/g#˛‘ú-<Íû€®√˘† ¨b˚sÊí'd¥p¸ﬂ‚ΩÀ∞ˆ˘Ló=s∫òÕ†Exœr5cÚ^51‹øñ9í^ÿ∂Eøå|ÁAZâ‡>{èÀÜûÜ¿Ò≤Óg#Cƒq2Ê´ ÄôÖô|§„˙—t˜§!øÚ≈Ò1°F*Ö∂rî9ÿaäˆÙº’IÔNwÁ≠~ y{◊VLhè@Êa≤ uã^˙¡∆∫ùË˛üY§
DÎ∑πZJ6fL!mva∫\9˚â$ª`ÑbÀP7Òh°‹6wcZ∞Däya˙ùÛ"ñà”è`Ëv>u©•æz≈•æv„ØHdciê0ñ‡[0IŸpZc«ô∞⁄ıÕ¡àéõ…~t6üzÉ?4ŸäŒ<N¸=Ë¸!„õŸü<çµ˚ª¡|ôpﬂÌˆ`Üüú…*…ﬁmWÄjk√ï˙,Åª/AÙ1€A5T)ÎT‰q~A«BgéÕób◊
1Òrﬁåµ4eÆî»=•<áb0wÂÍN—’S≠¨/’'GÙJyIUó Y;3∂˚'
ºw¢…@ârÔõ3∑Ë\)Yk>»ã/Ër§hjÌœ‚öÒæ…ﬂç € XÚ∆◊ª‰MºÉw∏Ç˘û≥‚√≤z*2˙‘©-ÃZ÷˝§Ú$$VΩPÌ¥L≈ü¢^ÈT˜≠ƒÒYeïKKU*-p …|4imÒCˆdÃi	Ü¥#¸%Rµ‘óîj§—a3ª>)€ìSî∆dXa‰@TåTÿŒÙ˘Fº›Ã8;‘¬‚rU/„£(B’èLMäsŒ™IïÀêÏæâ◊ˇ)¯?‰L«ùÂ w&J¥LÃ—¨∞`xmú⁄sˆ6UÑ≈
Œ?U& L‡\˝¯AT4˛|5J!PÿœN‡Fˇ°c~A™
q≤‘ˆú€Ñª°à.’º˛:πı>JÖz »Zà¸ˆ÷¯bé%t>·Ëx‰{:åÌZ÷5(ﬁÎ
œ-d
Ãﬁ∑äœ{S≥“]√õë≥·ÃêÁoìEt"íÛ≠èBZ˜lRÛu‰¯Bﬁ’à¡í+ÿ$
;§úBπ£S'KA¸ÑÃ≠"ÉT|„≈R∏zvôÆqaûq*≥A®ÇlÊÂ¬‡‘ÀS±O∂3€C*∂Ø¿ıÉ˜öE◊ﬁ⁄dD]œúq™2F#V»¿ù”°yi“sÏ{”e>∑¸Fó%ﬂj)F∂œGS≈Ê∆,¶û}ÿ∆K¥5HÉòù°UkI¥ Sñ8*ˆéHÉx0ˇµåˇ'¯î†AT4¸\C7Á√‘ÌÜ◊œû%µ”R˘ò…◊Å7»kúZrfyÂPnﬁ”]·k∆C:\∞íäH≠nÊ—Sﬁ)ñ_GPè§£©Ü8_»ÜKÊß(3XñKˆåe˙X&ÿ°∞&¿◊OH˜cz¯ÚG¢Ö7¶ﬁ¥®áxû/g£ 7∫ì˛udÓ:>˛7ˆ¸ÿ{FX·˜'O≤ÀÃÒëziC¸[∆–Ç/q”Ê¡ ßs˚?5´{,`Å∏Æø˛J<≈≤ﬁ;ù›N'[øÒ>\‡1‹‹p\*‡èÂˆdl≤ü1#Ac0{ÿGﬁŸ'ºÒ'öëO°°NfØbK∆&m∏WóÔ7Ÿã2ö»7!ï•œ§ üƒÑƒÁï¥H¯-/Üaô5@ﬁÿï†agZëak-R>6ÿ)K¯Aó§#‹¥SYπãE£À=ﬁ∆ù—Jı«îÊ¥P‰π÷ìã-T|ı”Ây!b!%æ[‰+ÿ~~2Ω…âCQÅ¨KÛ◊ƒ»ëÁi≈lß7x˛¡¬ÙZ}"Âz|Ë¥;˝è…ºø˝1v4È◊ı¿Û©D∫…¶Øo¡ˆ…™\X„J‰ÉŒ‚ì…¸„G.Ùw›°a—ÙpgÁc
‘ÉüÂK|ÈwºêﬂÏ]h8p]#zî©ßfo“,%÷_Lw˙hQÏ–6œ é{°É‚ì¯M®áÈCÕTü)¸r≈£“bﬁ‚ã$W!–ãA3ŒU‹“G‡∞ä|•Ü¿æ™='gN—î;9∑ÄˆÁ¸ìqB`óƒÈRÁ¨0Î¯±Ë†Íˆ»œuSO´¢e>bßKö«Hæº£YLZ,ÕNßˆ<Pıñ>±©l˙§⁄n'sÓ6û[2YNZ
Ï∑©=≥‰2Ié'NœÇççùüÒp¶Ò√£Ÿè6»FåU™3ÒøÏIZÊ0ür∫àÊ¶Ïë Ê1C(€Ç∆IÉ◊8õC&ê[ëÕg”uàŒŒÚÚ
À≈üYv~-Ì™µ?Ã1Õ“Ï!ñeÁÄÌo°oÎ¨(–‰DÖ^„ƒ
Îçä‘˝Õ≤Ö¯ƒ–pFô∑{ˆ÷B€¢≥±7ÍÏ*ÜÁ›ßu•†©e.ùÎ›†«0œ°<∑9ŸÌí`S´5sûÁ[<›⁄ö_Á>…∂Fxè‹rd¥èÏèa¯;∫˛Zt˛–»˝ﬁ/G8’ª§?»{ ◊≠^≤ä˙8 ÖgÁƒ„î«)Ù™zı¥¯q5Á,¡XHÑ/8+˘g÷Ç4õ§Ü¥ùÔ–œuÊG6Y8—f<ú®0é(_CÊt´u<Jgæx‡T§Ì4Ÿˇÿy/√\πÓÇéh€;íZ%3-î:&Ûñ\¯Ù}yw)‰ìfB∆	◊>{¯Æ˙–ÔI¶4ªücwÂä&VCM"R›ß’,¬Ÿò6≤©9∂«]Ü· Ù
jù9=´q˛e¥íh·.Ò›Ωç}Æ~b5i:“x+YæDÊ?<z˝cÎ’—·À„£ÛøíW«Ôˆœèﬁæ&áß˚Ø…¡ª7'˚oèﬁΩE∑‚èÔŒŒ…˘È˛—qÍÓ≈ä:∆¯hT∞EÒjèéy⁄P ’æ"Æ3‹"£µ1b:|AÍ¨≤]Kjµp„ ›∂ˆ¬ˇåU7g@fÜ{W∂Ω√8uóÄ]<hÊƒTs∑7<óΩK¿ßb¸5†ﬂÀ~ˆõ¿â÷›j˙ò =y,˙L≠}≈ù∂(Á`™ÈÀNÒ⁄ÊlF∆\¯¢¡Ÿ% Jö¡˚ˇ	’êßùFñæõ)q}#Ie∆∫ÌN_i∆pføÎIZûñÑΩÕ¡ù≥úÇÏa‚∆u9£.®†÷g?72¶shióÙ6sÁÏVºôÂÕ@®‚“t6…]Ó‚~[w≤
µIIóº4Øa≥˚öK.G¢k(˜Å+§xQ≥ì´^
%qØÏ«‚Z";ΩÃ~úÔs®É58¢ŸDë9ô©ÿËnƒt	)@LÚıØ-2om z∆„∞Tq+r˙Œˆ†—dıP3Çˆ±î±§ä±å!ÊáË'=úí÷∏”UúÃ-=Ê	"ìYmáx‰péÍ⁄1ÁΩ…π&4òÕú8„|S6ΩbÉáÕÉ±/¶®ÑCIê·|«€<ÈÂô¶&∆xÃ°DOKÒÉœo•M‹W˜6ÊπØÕıõ®¯”Rù&HJâ¨˘x¸cN	√IdúrŒ˝˘‹c—çhÂ∆3.ufù$Åà2>–îyúª¨å|:a›ñ=mÚ\ƒ‰¢ÙÄÂgú8¿å|?8¡ºk¨ÍP?öö¸<ECM”˙„!àëØ•8¢nÎÈÈ†?`ùiòz:⁄gwòMv≥rD•Á#˘˚¯ÒÅ_˜ê›n√e˛≠¬ÖM≤\—ÿêRÉpE√ßˆ¬ÂÈ5⁄dn§µFZmªƒë¡M´∑…â”'7üız±tΩXúë‡Èõõr®	X’È|VˇÅ}Ñ≈f
y3ËåŒpÚèÍ‹àÑL‡Ë∑6ôbú˙y»≈%vô¸g¯Ïqf%ÿöÀ
 ÜKyÁˇ∑˝/Xë9yí0©S®6Bw2ÕdÙÅ,≤óÈç øΩ¸âv…˘˛Ÿü…ÈÀìwßÁ¸ûl9ﬁ~1È’{‰Á›:tn;^-NYÜ"õâÔD>êÏ2…∞íL±m∞≈‡»ÚòÍ#Ÿ'¡7ª¡7ªÏ[â/—k”+|W+˘≤à^Q|{€MBÅw…áNmxsßÊP˜cºYCÅ˜”÷Mkãp‹NÊªBè«•⁄◊uÀè|Bçu–d.@w%•§V£pÎP`ñ@} &ª#¶4ÇH%áﬁ.9;9>:'Go_º˚ßçwÔœ·9|y¸Úı˛˘ª”≥<⁄ò√0ëth√ˇŒm»¥·/?gı£Àègããñ≤©ªKéf∞â†ã{Äò˜g‰òÈ?ùX7∂vq€Ô#˘∆¢ í¢6UwïP‚"˙H™&íÁWDuÛÎ¯É<w\1b>GÍ†∑ª:∆ƒ`I€≥∫◊/BPsÕÈ¬b´˙iDød~ßFç∑p˘Œ)Ì÷…a3∞ò¢ ÷ÀπÁˆ√Aõ‘QÜ)ÙÃ˛¥ˇ  ˇˇÏ}›R€íÊ´îuˆ9≥ëê¬ò{0`õn¿>Ä˜Óá√.§),©4U%áÕ˝‹uƒƒDGÃ\Ã;Ã\ı≈<ÕyÅ~Ö…\?U´V≠øí∆{´NúmT?Î7WÆ\ô_fÍJôåª>∫1n{;Q‰ﬂ‘/¢pXWﬁiêT?÷Îı(ªg¨Á›xŸÉ{i’üÙ@˝8HNÚüVY]⁄O;>8MB˜Ç:| ]≠pÍ˚å-˘úN¬ÁoÕ ≤˜èßÔéÎ4⁄êGZÉ∂
…i ût:AÎÜZs|%ƒEèohÜÍ∞*˘œáÅ]M±–y#∑ˆ£@^KHÎúaBuVÀ∫Ñ~v`7¡πR-%≠z\ßwñóoNΩ–ñ’	ÆE%8æ∑—ùMΩ •äÑ˝ê¶òLµ1?Aº">UÇ5í‰l«zÁÁ≠§√g8â¿záD¬„A»fXkõOY XO†%”W‚rcL‰$Åù∏SÌø_˜Éco∏¬P|}“œøèÁ¨\U§Ë*-∂¨´™ì”è≥ßjeLîtSê‚DI√Ç+èh&$wËÊ8
1®…VW^2Õ—Ø=TŸ‹ZÊæ*œ=úf˛˛oˇó(6˛˛oˇØ≤D›ﬁÕ-v@Ü$Ω«πX02tTU.ßú‚ÍuêΩX˙v>–b8·ì°]9Jx<ÀbŒÛXúÛ»ÀÔ™w»Â}·C‹¸79VbeÎ€˘@+˚5ô	Ì≤Œ(‡Ò¨ÈÔ≥Ë—t˛˚+w±ÙÌ|†•pJï∫•ê¿„Y
ﬂy{£ô‡¶Ó<çÙv)„Yr+9ª7bˇ·]™›xÏvò4Ù¿Ï˚I/™≤NÇ.™aPˇu$ßÙ#3‚1[Bí5»Ã†,®„l4¥„(æ‘ÖÓNÅÏ∂o◊Ô${S≥ï≥798k‰‚{	Ê£U—Ù¥f3”Î8Ã‘ÆL÷¥áo1Ë“w,Cc÷û±πßUé’$rÿyx<◊#‘ÊQ=ëÙãu‡1ÉIΩUç⁄À\[Ëƒq∑§R{LÈíª-^C?˙ ˚π£∫Õ©áÙÇ-Ùî•‰e‡x€?u”.FÍ¢.{©ˆí+¶Ù(hf›)Âk:Îr¸¨ï∂‰©B£ÊŸ;gMâÍ»‘ªI≥!Ä%òÊ∂≠ÿ,J¯&·uã⁄u‘≤‡¸w`@`Rwí•zb†AÄèòom
F\ˆn=®Ä@Œ‚öEó1ï‰&	¯D˝¸ÓÖìn¥j0¨}|ÅzÎ
∑b≈Ä8pÛ∞5•Ak©vXÅπ:çö´¥S7´MÖiH…£o •S ûú€%Ô=ê«
Çn…ê€†ΩÖè‹Rÿ∫Â7õˇ$6°Û‘¯¸Êì'æ´ÏL ¿$Z4M]’—ÊÎ¿g±ä{Nô†¬ocbË>Å…t[±Qôlòv≥ü¯¿Ûioi∏í ãäT¯]Ö6ÎaóYö3„D¢ÏRV∫ÕÜÌî¡(¶!»˝!ÜóºÛ^øø˜Œ]«S6∫∞éπ}NB˛1ÎõAÃªGl†8¬Ùpıòñ˛Ùc_"ÕwH28ì¸Ö◊‘2^Â≥"ÂR‘j≥ú/X!ô®âÃç…DÁó»)π‰U*ì
˛èA¶\Ü(OP-”uRbxVö¥’{öÚ∂
ò˚-|°Ö~ N‡ûòÌ¸{∞É6PO&ô}7XkÊ“≥ÄÙ, =HOy≤|nﬂâŸﬂ*(OúΩW∆¬y*πÄ<ÉÖÊª*Œ˜Ô≈ûi°ı(ËÙ«}"ÿﬁ’å)—{V‰ÇËıÌ|(+&J∑g°íÓssˇ8à–)^ˆE, sÊ≥e- 9èe˝r@éq÷«⁄}Xö 8sŸµ¿õ«BÚxcúÙ«AÚ¿Õ˜‹‡
^ÄmÊ ∂y7I.C€Pèx◊G°g6<[¿mn3ÃÃ|@2©iwÅëY`d¨˛N12‹Ω˙1ô…Ñå®±_`eÓ•ss√ ‹~QÅe2Å´®Ô¥ÕyÇyîF¬ ·$‰}ØŸ'n≠Äº…ﬁlµaOú¶Ó‘4À*ßú¨ù’MÛ,]Bf?◊ö•„i¸^±‚€-ôç:‘Èê{ö^?iÊ,—iΩ%0KeíÏ—K[i ÏΩ…n¬rÈî·˛Q†ü
$Dl’tVç`∞ŒXûò§Ö[%Â’Urµ|¬-Î‰¸@E[ª·¯FàΩÚ¬€Ñ#ìF;˝tÅ2“Yˇ≠7M(£’MèùÛVº=∆W›@G)zÊs∆è«$ﬁ]I‹®Ä&á”Ïb% FB# £»h2ZÄå €ØﬁˆA¯än∏	´ó˝TAçzπ∑ÀònﬂJ/ Gè≈êEGÊâØJˇ{±ﬁ:Qˇÿèí5˘ªZqã‘O]êøæùD˛Ôq"tÙüN˝£Y ﬂŸñ{Œ:ZÄßäó++ TÛ‹ä@™«¬ç8ê 6˝èÜ}èU Ä™Ê∏#/†Uèephïmˆ¡"¯—¡Il,Is¿'•;º0 ‘ß¨Ù(4’Ügs¡)•¡ê∂≠a’Õ‹íHdoú]ëû˛RrÔ‹+s)wnÄ™9—˝m5¥ïhk]‡≠x+[ÖøGºU 3;
Ä)ÍÉaü,œ˘A^≤¯0⁄}ﬂ„í€sàE„ÎM.û˛∆$É»[d˚}ﬁ.?_®Gæa¸o“ë∂HΩÙZ†Ì¶C€E$
“<ÉQù∞Ba≈:8ªπtÓ¡pvÓ—z¶C⁄	 ßœ=ÖpƒŸì+lÕπ™MÄ'‘„ ¿õ+¸nP∏îàCâ÷6Ω∑ìsÔ/ﬁØ˛ »’C‘õúó≠Kê°ÃÜØ 	≠k÷Ω◊;ﬁ/Ô>úxÔﬂüùzßg;ﬂ›ùìΩBU5cí6†À»Ô¢Cz-	kÁëááQi˜ŸÔur—b^Ç»+QÄá‰oÅåÖ‡πöI2s'`ÑáÉ	FC˝$¥;	«¿∏∏V£©ïj∑vAÄà2o}ÌÆ∞ªehCö…∫÷lU‘iìµª™"±®Ï$©lÛUiÿhSM´zØ¸Å?ÍöÑƒ[Ω’Bï≠ÎA!±(≠±:CÃ'-ú	Œ°r‘ËSÅjr{EhøNîˆÔQﬂi"_«∫û∑Wû¡L´ÄGÀ–3¨≠ïﬁ™Îh7
ªÃ;6∫˝…–¿y	≥≤´ª˙JgÈOì–ãN≥¢«uoß”	∆	,U∏4‚é◊¡%†•ﬂ~Î∑ü(;¶òS	z˙/ÔNŒˆΩ›wáá;ØﬁùSY¶%ô¿KkÚﬁX/ëïK™3∆¥j•é“)æup&Ì‘⁄Eê8aBÀüûØ˘´Áüt`√	x’nÔŒ/ö-øh„AiÂ5p°bÒU0¶~Fj˝®6∑∏&´∏äÉdπ‡M·A’2ù∂◊∑±ÌL~Á£ÓÍ@â¶e´&dxBVã≤∏p;ÁìòZÇpıq|ÉŸ‹.¸…¿‡âLµ£#™pWtÇF„I¬&ÎæD˚ ~g≤‡;OÚ„ñ*[…∑fCÇå[EêjÆ¥e“ÚO&˘*í—Y°©xÈ·©üsıOáL%ÕÚøß71î{$	|üÖªÉp“≠ﬁzπ*6”˛õ$≈ÇÅírrìÖR/'CáèsîP≠ËRcá”∂Éú¶Âa›ÍcktÍÌÅ@w≤¯Ê&¿ØÚdÆáp¥€ÛGóA∫ÿä√‘?∫Ñ›û¨’«¿êÉpß ⁄ÆÏtªπ	&t≠k≥4d9¯qª±ÚLΩS53!‰‡t´‹ÁÑãÇe¯"ÏL‚Õpí†§CƒÙVAvm7Ñ-NŸ`•HòbÕSÊÊ0
ôÙ2}öÊ~ì‰vÜQ%tü¡·`qz÷ØêqòrhkŸ»Æﬂ¡ŸOÀhÈˆö˝—†´„ò¸`∂VpÔPÔ**ŸÉQÃrÒsëÎ$€<GK!‹¡Ö°3w—[ÀfàÅä∏”ø"4∏?"‘©ïV<1˙r^æ&*Æ›íëÄ˚Ç¢'g√í4k¶7]p˙x¨¸84⁄ßv78WÁ∑R∂CyGŒ”sÑÈ`9Cû[äSÌœ±Cﬂ√=å»hl}"R‰%÷•…ÙËü˜KYÀªReÖCHFŸ1 «&˙a*˜/'¡
Ù~"tk0©a7ˇús‘Sø≈–§ﬂ[“Ï”J˘û¬]T˙©¥*ós6ÓSLˇ¸©ï7á∞≠ƒI8Ãïó}LStÎ⁄Cë≤/füÚÏº
gÁì˝ø~ÿ?>;¸Ô√È˛ûw¯nwÁÏ‡›Ò‚¯<Ô„Ûë?~ﬂπûI¬⁄Q2∏Ò‡‡›ı–æè+ÙG;?_0%@⁄˛Ù=∞ÙË«8DC/Ëöw–ıöŒ¡™Spa,ó±z√A∂»◊Ú7[≠≈Oì7„s:É”Ó∑¶Ω∂–Y∑˝ñû◊rìa:»ñ>Bˇò'ﬂ‹xî<˚Ê«r⁄”ÔE∆œ&»œ8Ì,¡ãC∞xÌå:Ω0zdá‡‚&Üa¬˙g;CãÉ∞Ú"CÛÿ¬E∫`áa¢!ê√0ÓÛ÷√4ª4^∂SìvŒ∑∆Îèp:Fb˛O«:È˝ÅN»Ñº≥É¬Éé◊Íﬁ€É”≥w'ªﬁŸŒÈ?Ωﬂ9=ı˜˜ﬁÏü<ö≥Òw=”n1á¢rˆ`Ô0Ë¬j˜˛"¯–Ë¸f»;ÏËih!Ç4Ì¡`∂π(#74b»8“oÒúg≤Në√ ®S¥HπdS¿ØÍ∏˝P®¬ÇÆ÷&_∆^–ùtU1à¥H¥•hn[=S»HIÑT◊ÔÊ=≠ñ∫	‘&±–X¿EfKjí.Ù”Ò02ç·(í∞CUIEÖà$Åñ9&!˚ëH«è"åÕ-q !“¬(fñ»©/áâ„Í˙z˚EÌbö·}AvlRŸQB∫¶N
÷¸2ò’©±∞l‰∏êÓ∞Tá⁄*∫xO∞'Hknﬁ_¿˛˙“˚ÚÛO‚›ª/ﬁ¶'˛∂#™]ŒË⁄cÃ—∂wÉƒÔb;Ò:√◊‘9û≈ MØë“>õ ≤ªsA\L{Ï_ù"ºU’ﬂ~Hø{iÎqv⁄tÆ»q[Ü∆R∫„V#ß˚«œ‹'¥´‡2ïs≤ì]k?>K'IP#üÉ‰ˆ’ûq˘Öj87›0Ÿ∑	G|Âˇ⁄Ozá¿î‚™4‘˜4+£˘h2X…‚}'5<¢	°/	C†p‘(¿¿X®ƒ¢ë(»`-¶û‡êHR§e6±—Fù^ ì±‚Ì‚øÁ·5B1£Ä¥URo‘4˜ ˙0œÉÅìSù¨:bÿÈ–®Õ.z‹Ô∞æ9∏1êWÉÓˆÌBGŸHt
~4•.,ú$≠ºTì nπ$®^Y¡@~|ŒV`//‚‰°7ÑK`U⁄újÁ,|Î6ï:-!s≤∆çhz´ä˝∫õﬁ” ≤W©,ï¸~∫ØˆâpÕ »∞DS÷é®fF˙ÂJà«É~≠«’TY˙ÿ0¢˘Uj~ÄÛ]£ü=.À:HÅ]rßöê†tÆàˇÔUÌCÆ.1„97H3¨|—)5:ö¨≤Ê†PZk⁄B‰;√ÙA4£5hë>9ôó˚¸c⁄íOP“≠´”‘®)eŸµàt•mzOÿ∫u˛kﬁd‹/ËíX|˘ıú & ä0A"€U∫˛ç
%_ºÓ‹UxøÜ—WrbÆäÉ·D∆Ωë_–ß§`Ø«	uÖÑ”¥õéKû˘Ìpç•k˘∏ﬁsÂƒîö{p‹%kÑ}]©9=V;”°ºû3ùx‚	tÊ¸9Å≥OÒ\î—„sÑıuΩs<˚Ω§?$n/u‚_ºõ<4ﬂı#8¢!£eau—ë˝Fkæì/GusgS–s¢Z'⁄éÉ‰,OT’<’9ïbQ»≥a“¬Û⁄ú™ÀÎŒÖŸÊÅèq&ù¬VëÅ*‚£rE¥C=Ú_vÍ‡r)=®=√#ÄhwœÎ≈‡U‘Úä√Q≥ûßäpziÄ/FØ›¸âﬁıº.,VyùUâ«>YFKd*ò_[Vﬂ}ó„—÷
≈ïöR·-ÈÃ—#ßä´⁄¯⁄K√≥4âû÷\&ˆª˝D}:fÙh?>‹PÃ4£vRÿAé[èŒ≈>±¯Œ\åG‚⁄óS≈Ø7<<dÁdµfﬁ£æ–§®¡Öœ3hFOË>ûn]òü
¶ÒV*«¶!^9»9‰2⁄Ìá#èú≥óQçç0≈0Ä©Óƒ˛*ú$bê‚•â«ÕÙ.vjAAâ3YŒë©NlÑ¸ÖWÒˆmÀ>äV∂d—o£7eôP4pI˛ö91 -í⁄æj·VQs≤Ù:[ÆÀŒÇW>æ†ì‚ºd¸Z≠ª_wùçL#6ø|&ªË|<pôÁÏ%>ìŒ«ù<‡aF±/µËùä‘TRŒ‘zõûÃ#]Iº àâxπâäxÈ≈EÁ"fó›ÑD÷\”¬u,•\v˘z&ê3/,P\NMK¬Ûb‘R{ÑÔ8Ö8ùÊ >úb9ºÑ:p´–Â ® 1©)îñ¶9Wq<ˆÑ'ŸàÛ€oûB,ÙyäÄ¡xï;y9eKå@⁄Ï.F#îûj~#C±œ:Å>U»ÑCø€•Ã‹Û…P^¿)!Œ¥h∂ÚHkZeîÁw+/®}ÜL¶uA∏¨/≥ùpæ´4Áú;@Bt.‘a+Œjíq[ôe÷eÈU…Ù÷—Qÿ˘∫ÈÒP£®§u—1w7Ω/<‘ÁÊà˚¸”-*Ja5^UóÓæ∏Ë¿≤Ä±õÖ`¥.ﬂÛ ≥Ã–ù˛C 60My,˛‹¶´níå˙4ñÔ;[õeÌ8≥[r¶µÂÃ√
3?ãê ¢„6ÓEÂæ„wìàê–Íj√Æ:—ú÷£>"3IW4§∫}’èCT≤Æ$5ƒXÖéURáãÇ÷•d1û ,%¬∆6Yûòaäá…ÅcºóﬁëüÙÍ˛9–€(‰4€nï
iêY—y± o!bÇS©$d›fñL◊©ˇ<⁄Ô¶ó∆¿øßÔXƒ_;â;úú¨…Oë≥[%´<S^ö…|\aÜ≈∫YÜI2ö=9·˛ª x–àWÀøÙ˚ñM’*¶ŸRâ<Cr•z;ÒWãÿ.ÃË='”74Zsn[ï’0É
˙1ã<)!”u9á≤~JBY?e°¨ü≤P÷Oy(Îß,nı”,îuzÀ ⁄¶s7û£tâ&uRdw|è¯˙µ\“kO’&1_¿J
p˚Ñ°ü+‘ﬁz3WÊ÷ 0$NÇπ◊ƒ±D©˘óÉ˝_1£ÌÈ¡—áCå˝ÊùÌÔ{øúΩıˆNﬁΩ˜NèwﬁÁù⁄oøıÉ´£∞À ÷‹˙YàKπïµ!◊RÑMg_ÂıG0~˛`˚ˆñGa‹ÙÀÒ ÉøÍœ7⁄À‹k6dN…¨π/õÈóMÚU·£‡õ-u’äïe<øŒ$ëFΩµ±Ï>Ü(˛ÿ®7◊ó±ÊF}˛˝$"Pa“›∆	:äü◊ûµ<™Áá(?Á∑›†Ûı4£NÔØì ∞-@¯a‘øË›7Ë”tÈá'A<$±¥	™[Íà°˚®ÑÜù¡†∂Áﬂxoa1¸÷à?N`{'¢‰õÌbêSÿs‡#Ç§‡K¯ÖzÀÁ≈·9ç4*¿:eú≤(Gtç∫å¨ÊlU∂io®¿a{–≤¡Ü´ùOvÅ¿F]?:Acwiù@5D!÷Ω™\Mƒ˜pÀR≠ï|Jw∆‰X@1U≈ú›-Èòøé´iëú‹ÒAÌôê´õ$t∆3è÷ôîT£Ÿh∆¯‹ê3$;∆€‡ä®ùOçáà÷y{vtK«l©GÚ•¿ßaØˆ	∂Ü£MÇ±ïOO-°˝òzU6ØaÁ!Ωû"XùV∫îÇwØRØ2∂òDog[2u´ÃÔUÇ)Hí¶¡5¢◊øÏ`–ÂãgúŸπŸúÜΩ$?t/ó} π“˝˝'{ GIF¯c„s„s÷ŒÁËÚ‹Ø∂÷⁄ÀÕˆ∆r≥πÚY{Èì¥&≠Ÿ rÆ@©…<Á ,0≠U-úCÁ©ubîôgTª™5<@ÕÀLŒA:≥¬‚ÒÇ:àJ„˜Ï∑ódÀ¨.˝;8ù@.«w0wuXΩ˝rSŸ√ÈÃ·iÏŒˆ©£é;q‚EH0úvû9]µÄ®68aÅê–I£ŸzÑ’¬"xóÀìÄ#®]¬+ëMÎ%{+uÛ5§ª‡<'Q¯5¯µﬂMz€∑´≈çäêq≈îÄ≈~»±\…˛XÕfaK;á3˛W2qi	)NQëØvQ˛Iêóàµ§¥uŸK£ÉØ“§&ãÉ-Œ‚ﬂf∏1ö‹DíVJÂï¬öT¨HCwnü©≈dˆ≤G(≥≈“K≈C,üPÛ~‡ﬂºèÇ8∂Ìûx9'£Ñ˝¯ßÄ¨ôïÛHõ¶’ÅêÓÜÒ¡Ü‰ªg’TYπ’˜“£÷\Áçé^πÌÆ—PGÀ´*òèFÊu„^H/[^2ûÎF.é˜˛≈jh˘)z∆—ÖÕå™¸-Ræ¿PEÏtiÆºÄl!ï™ﬂºËÉ4ŒaÓ÷A¥%ƒ≤sdÉÆáˆíá@.êªQOBÆYÂ'RÙ{®4î©+r≠r;cŸúñ≠H¬^\lﬂÇ§˛&AÏ8Ú«Ò^?
:$Z¬áhPÕı«ä§RˇvÂ3ÏF£Ø∂%ß˝Ì («¡:4
°-Ãjd˚Œ®˙eπla9⁄]∏≈^X }py5/…üπI1cüP©:M”
RvŸ•‹î–Ô`ê=:…Œ≤óMÛå⁄Ê\X¬ÁE°(É"Æp[°Ö#<ófX&∞&âœPyë_ÄwnŒ†[;Q^}ü‡…ä5|£ÿLÍ‹Ú≠ﬂÚÇÉ 0≠Å›x∏PúóA¢c#Á±Ãy7ã´"0≤ªVë~I
ÇhŸ aÈ‘∏-Ç*·±hf$|7b	≠Cﬁw∑ØËªù∞ …ó••Kf÷¢«W¥€•KÁCÌ%K∑ú±Lx°¶n€˙2ü…,u∑œn≠ Q$äÒŒVÌô”ú‰IÂ˙¢Ç–îáfYbdÉΩ˛0"Ó˘®ëÚ™G˛◊¿{S“?0_ï√Ï©†8]2Hïˆ§Pˇ)_s:o’€wLídÕ4ø8”ëùÏV∂Sªh	uQBÁÇ#T¸ Ä,s%jmoœø1Ôöû§}§
6u™8n!;Ùo¬IíŸ€Äºì~«Tfû-nhyıªøÙÉ´Bs˙Òû7§ˇõã˜o‡ÇI‘®”}7Ø¯oÌ€{˚6˜≥¯ˆ€wN>ø›?xÛˆl˚V¯°/˜`‘°NîYŸÈ≠‚WÏòÑ£q‘A{§≈/.{aLÄÈp,‡ﬂaJ€∑‚/≈ªù^–ùÇÓ1ûﬂP´|¶~P,9Ÿ¿ ’~Û©|ß¯–|BÊ?úå·É‹œ‚€4Íb–=ÂM€ixhË≠≤ß¶/;~‘›p£¬Ÿç(¡û¢°V†¥ÏfÒÀ‡V:∞8ﬁ£1°˚∫∫–@ı}’º'˚ö"¥è≠òúìƒ§!4BºmnCæ ›ìb›»ø<˝8ÅÜgk)olôï—ûpOAOË4∂KÊ°]»¥†·ØãOãE»>wÓ¢ƒBΩf?ãok-EË"®yT,Âoa8|]tÈﬁæ©$˚:Ωå7
?OÇã:„4zÍ›E€8¸ù†BuW9˜g*‚WﬂW‘MèAˇ%◊O≈MÿÜ7ŸoŸ¨(nö∑Ñ#ÿl
_KÙ% U”1 }.ﬁ57–õ≤Ì“E	@-¯“îeNì.ÊÔ)ÜåY¥‰ô=
'qp"’ÿﬁPzÓã≥p“È]•\Vˆƒ©Us“∂ˆÄÉÏè∫Ú˜Ï∂S˝äœ˘}›˜ØP«väÆ πên€øªûøkˇVhvÓ¶˝KÍY¸òﬁW¨|Ïå8≤∞ËÂ[⁄ëŒŸT”qŒ›u˚ˆ’xx§.Å>”ïC&Éæ≤ã ‚nx5‚Â®û)ˆ¢çäB_|?â∆px‹æ•û|»—s®~OU
™Ye
=
w_áëZ¸„M¡ß{ıµ3Í2:§a~∫À3&∑P“$ø¯ªxC´Ñ† ∑πx=À—d¿∞wf
ﬁÒGIﬁ¯•%ppqÃ;Ë≤⁄ïöŸU¨Ç¢hÙöøàªùf≠—„U∏G™ˆ‹àÒãÙ¿m
ößÿ”¯,D:g∆qXóÙdpº/?›JÉ74xÉÑ∞ˆG˛`/- ©À˜§®¢/UØ‡wºˆ⁄ŒH≥b∑°ÚxìƒØÍ\4huıYüMW¢˙FÌ’´åÖ§|Sv{%Á%™v-º≠–ä°¶k'’¬Å$˜[«qR;/g3È≠\ƒ’√©Lƒo(ŒW≤æŒXÚ-3O=%˘<:WÂπ™¸‘≠¨£^~UóDüi{≤ Á/ßΩ…ﬂ÷µwÀ≥HéÉíWüªi˛íûÄoÚ_≤õñ”≥z·ñRv~œ|~N	“/ï∑Uu"pñ´ˆ¢pL70Âm’aÅ;ÖQ-ZµÍÆB#AÂQ⁄‹•“&rAbµT‹WmV£8àNId´§(=>ﬁ⁄‰“$øú·~πlÚàP•V˙±,5	Ωjíô’$”ÎÍN◊°kÛ˜SÃp`{ºbœBHxºBB^ır:Ú«ÿNY%√Ôk)È0]Z€ÈvSjo˜“”Nß˝À∫~ı
rÑ¯¸aÂÒ˘ñP≤Û©›ÌDõû‰3G6ÄrsÙì‹˝?®∑u≤äáõm'µzÀ5Ìﬁr[Ú∏ÊJMÉ¶êãULÉ(÷ï∫È•˘qz˝n7±öMÈdBL˜Ü¢íw¶K“ÇMØ˘]òﬂ⁄%˛k•⁄ÈGùA‡˘âG°Àq!XÖâh¡ˇü5»µóº∆üŸ£÷≤√⁄¬!]:h¸yInâ4ŒíóÛ-!ªøNÇIP—{ÈU’—MX,ìñ0ïeHPÅmO]ñ¨
XYÒˆGÒ$
Äæ1d6„>»÷Àã–cNY„&§:¯õƒ0ˆGU˙á]ÖÒ!mxÖq	Úﬁ“r°°5+πQ≈Zä˝˘Xhƒßêw˙b9g‘cl[%‡ì®Â<`9S¡U≈èÎ˝ò*/a2r˜) ì)7Ûœ˙›•%åπê‹‚MÕXtaOé`ñ‹—_K≥√¢†ÉzIq44^£®kR–™EÁ–m]]˝xóÌw!sƒŒ]o/æ!]TËœÆ˘åHMÖëΩŒ7D˜í‚{e+ÕCD*v÷¡h£	zÀ}ƒ Ú!ËÂ9π£}ø”´VØóΩ~˜Z´˛∆˘TçRıZÎYl]}<â{U¨F©Œ,*Ô—ûª⁄r–ΩŒËC¨/«S>SØ◊ãÔ.I‘B\W=ez0∂»6Y™Ãk…'∫!+åúÎºT4Ì¡bÂ¶¢âÒ z\-é·œ¿Z)«ô¶ıb•jö»µåNÑQÃ∫û•Ç çHâXº.
oÜT<OÎ¿∆±¯ÜBﬂmjVö∏}&PµY›ÈX≠`	·ìÜ2vî	¶Á¨WfÚe~S†õV$ªo¡‡˘˘M£IgSYâißBföÍIÉ)™¡ä™¿„ÄõaŒ¬#jCR»GÇlR´ç%ÕÄıcbp
∫•GÎ…ì*ÕDA7óf≠ÈG∫‹˚i˙BVæpN±Ì$sÎπµí÷·‘Hl&‘´™@ÙöÇ¢Øê˛eÖk¶ƒÙ1úòè¶ Úl∆ã}¡Á¨∏ŒWXxrW°csY ÛoYπb≠c+WdüR5px’‘˙ùŒÑƒˇ∫˚È‰êï¨ô¬îœùù8ïÂ)¨Ê¯ÿÚ÷°⁄}eaTÕÊœ<ç%]-›~<ÜBx˘ÙÎ|’+Xº˙4Ä_√;¶Øˇl˛ö'ÃµØÆ7L%@Î	[ƒíÚZBJ‚˝Q3ıˆÌ——Î("π∆â?£ê:L•>çÙ∆⁄ÉéJ€Yêµ°*7}µíá«Ã˙¯Y´∆¡®.-Å`Kxx≠4T∂b&¢ãÖpûÔT€_ø¸t€Î›m˛t;ﬁ}±Ô•YÍ°¿;ƒˇêZVˆG]Ê&ñÛe©»ã–`˘®Å˛‘ƒc†m_:5;ø|ì≠*”w|Ádè*ççÕF£êWj£l˚[Æ£úíD{ó≤õëù≤ä¨N)ÚøƒpBCü‘UU—kUÊàÍ‡~õJ6U`Å∂ Ï\qâl i)π¡T¥Mˇ≤nØã†ºG9Ù∏X5¸á≤‰Ô;/ñ∂ÂÁAF Øôüs≤ıíufÀóXò~mäjMróTyâ°_zµÜ◊£πΩS]Ê∑~å⁄qtûQ;Xc∞Ø_ÉÛ1∫Ô–éTçâ™π∏ﬂ-˜bÌ!/¡Ó0∫¢pnNÉ‰ M˘"	U¬ü?˜í·`”˚¢$âˇ¸5∏πà†+±G"ºÅ∆j—e®¯D5ßwÎùá◊5suŸoc|Mu¢Õ÷⁄≤◊ﬁ@µË3TòÆµ—TS`[YV´•+Ïπ∂,ı]çÄRipÂE€7™¥'™Ûl öıˇ¥Dô^É˘'J<óÆ¬cﬁ`ôiÜx5‘Â£E √⁄PùtŸ!nÆÈ
€¿¬òíù¯5n™ﬂ[◊WÍ4ˇ¶$µt0jîáa£ºfsÊqê”çÉ¸ﬁ¨„pGÜôa¶c}É˛÷1»ó•Ç¸k≥é¿´¡$òi⁄Ñ4°M≠µŸ«@.L7Ú{≥å¬Ï'=ÿ•ﬁÃ¬¥+zFµöõﬁyÑÿé∆Èiñ§ıYô∆Ü¶)ıÊúFozÆ¢e˜0|”Úö{æ)ôëéÅ‹«–M≈¢Ó}‡à9z¶±{˛ﬂi!Cπ/∫ì´–ç^·Ωπ_ùáªB∆_CM~Ì“»±¨»%õıˆÏ‚ô¢I7f.¢i„=˜’®»∞65-¬Â|_ÕÈõ)^”"∂NÊ–®/wö‡([;¥≠éBtΩ7D heé©ØÖØ∂o”6¶aã4—˘Ëê1ﬁ≠d÷-SC˝ö/æ˘Qﬂ!`÷#ó‚ï‡åﬂÌGòÇ"åÆ¸®[Ò~Û*à{!?¨AZ®°¯ÄñE:r˙÷$‘VØ$z]#™…ÚéÄ≤ºô°£÷åo”KËF/ß^Aü`º9å˘Kou≠·mz5¯«‹◊Ófù]7ı∆µX_>[‹ÊL@∂πênÜ∑8nöf"BnA›Úı]®ªF…˚Q∑Êâ6GwVÿ∫@FÀYaËﬁ#Õ
˛W˜Ü®ŸÊ@Õ
˛s0záªî∂È›òçnµ`H»>IU÷ò∏ „ˆ¿ÍsUNR∆tÊ*"A9VìePhëÁ‰%!à9‹‰øZ◊9˛*ÔvmS‡r•i>>ΩÙ£ÛıjÅD:U¢øıjÕı∆¯zÈS¶]Ω°⁄÷QXã	ö˘‹7∆vÌ«ò;âÿã‰ˆ“´PmÓG†s∞]c7÷H§@∆€T∆fZFkC*cu=-Û*Îÿ‹ù9"◊¢úØ°oRçZ÷¨ÒÆ7)SÌF·∏v>òDµa∑êÆ\ì;ƒ›ƒH‹òÇÜ‚n,ìˇ’1∫ªUfÙû¬∞ﬂ~Òœ„p0¡p’–èÊJÀ√‰‰Hì4‡ZæqCn\’÷1Ë˘zıú°êq4vô∆ª™ﬂ0oÕÍ≠#v¥{8Õc1z0I“HÉ¥â©8C¶ç®πçÜáCπíÑVCê("Øé˝o}©œªÍ'=Ô0DÇ@Ö>ÎcaÏiù®9ı^∞–®t$Ë≠åzå1¬KE“waÿ'æcg!˛7!4Zx£I`ék…NA¯Ø
Çå˘ÛO≤wSdÔ÷6¡L*¿◊*ú$ﬁ∑6XFs§û•≠
$ÒGˆÂ'õ‡Â1@≥4"~*?“∫Çï(\Ò2	Fe"H
{a†·âtSks§›a7ûìZH≤ea2X5RHaá0éa"•à¨ÕFÆ‘ı|©ÈN1kÄ»
„øı√ILÛoV∏“  ∆ÛûTª».cd‘›^-
G»˛X(«÷Ü:î£û¡X#9jà˘ùnÑ¡…√æ<iá«!%'oÃ±{¶|ªÊƒ?∆∞¶ƒèncˆ(‡r(Â4yDC
Dô?I¢§§I˘¥	û˛ˇ4ó∫—x
Ñòª∑ﬁn<µ‰àËñVlr°≤≤*R~zW»Á˛ÖõOPÒmëô˛Ï5yÃhúNuÊ®l-í¢·V‰c⁄Bå>ùg⁄ÒßÌo@WOoFòâ‘ˇŸ-ﬁúvQ!Ñ®.∫&()PE>Ç5F2ûŸÉ®•åŒãä«<·òêrÀ#úíyX¨£måü~€Û„Ñ≈áU›{ö1yÅ>ÈË‹fDÃi£à÷.¥∆qåGöß¿˚˜!JreÕÃí‰ãm•˘“k(%…üí§l!IÆi%IÌë/'I] ÔSä3?Ã]å4'IFIÚ{Ir>≥òÙ2Ù™ØëöH+ñΩ‰™ﬂ	0‚yˇíÏKqÚ6§Úﬁø‰Èh°\UhÏ¥ôº]˘óËmfJv%(·ÙÂï(QãÕL”éz©:¶%©†ıâD’E∫•h‰ﬁÚTÙæä¸1Í˝»èQà?Õ¬µT'o5IN3
≤É∂L=ΩU€j,µa·ÖLX	t∂s`ºÙ°)®‚Â<Vˇ<uã≤Ê$√K
èGS¯ÿˆCºÓº ÑßÓ»	Pä}p©œÚFâ*Ï÷¢zxÚ7Í*á]˙˜«’5IXÑ∑ÅﬂE…/!Ï^ÕﬂH%C˙S⁄g‘˘VsI	:≥H<µ .Ny#ÃVÛ9…¿¿9ÀÂc…S&XO‡%;˛ÈÇ\‰ ¯ßf–zæz˛‘>¯,èÖŒªΩBÓ“∑@êbÓ,4e%h‚’¶ÙnÄye'ÔíXU±1uö=πÃ-«»C˘øˆìﬁ˚(‡ÍÖº'Õ®∏\Ù£!f%Kv®≠ïﬁ™C:”		v≥›(` ˇÔz;Ép“]ˆ»FDc"yÒ~	q7;ç'âwÄí,∆Ó`ÑS7Dê1ç˙í2yß”ƒ/Ç™ƒ¬Ä±#§…MoÖ˛—‚≠EœÊ∆›oj'Géü®‡ƒÇ
±∑`R$gr◊Œˇ¯âÄYÂu9Nâ…ìPkv_ä£j—¨'Õº•ìq9ù—ßUL<≈lcÒ0/Œ7⁄í8ﬂ÷ßë£Y«]”ΩXÛ[Ú£Ä√^˜R4B—úëä`<k˘î2Yrÿ¸∑Ìr©Ñ¯%¬§˙[ç|Âä ÊF~Ÿr]¶<ﬂ¥NØ˙	ÚÚê≠˚MÔT\“„Ê&QRŒ»ﬂ∑˝õ äyR"E.·R∫∞ÇæâLïFπk⁄5“_:ß\zŸQ» \≥ΩÅl èÜ´21wùe¯π˝’ö_QÇa<◊qb–+ˇ´MGJ/ 2xÄ≠Z÷"Ô"
ábÍYXµ$‰os™‹\Ó¯ñ2≈˜Zô‘Ò¸⁄tgÇºOb√ò3-«ˇË≠çíi‘ƒvV∏êÏÂ¨‡≠ºÂY±“ˆ¸∏^FÑœ%·XXÜd±´íﬂıé˝("`üYeÿ\ıfÖ9^[ø €ˇú◊–tˆ9›4j°ÚîcÁê™HÕ⁄&¥¥M(≈ï≠“∑3Ûî≈ÁG∆=IÛÃìù´dzÿèì`4#%Y„…D`†i:b˜lsÓŸZ[[^_]~æÜ»¨ˆ“'W~˘>
;AC»<ïfùÈç%îÙÀl"Æ|=∞≤ÿ8gf˛]Ÿ˘„aË)=‚p§?Íı∫G÷%ä©ò∏ï0wëkÏ¿9}8ÑÂ:;W€‡¿SeŸ4è%E÷ä,÷Äx∞5ï’§;64ÖˆGH∑∆™&˙( áºÃÚV3ÏnÌYªÚ¬-¡4iœQø£›F(•Ò∑Z”e?q1¶‚µ§Zˆns≈ÌıäÜœhÆw‹ÄM£v?õØÈ£ıŸ¶#ñT	Ú|”¯¬;Ì£nŒ√î∆Ì;;Æe—ÔÈ°-&%Ç&+hÑQ-#~tnnê¨Í∂”¶∂\b?q∂π8¨Îº≤ñg+ów•ÍI‘ÇdÇa+&„óµ;EÖéÇ“|«•a⁄CêèﬁÑ!NG˛8NAÒáhPUˆ–*LÒ+!≤◊vÂÛ9¶Vs›ÊÄ%mWF!4-Ä ïÅŸTó(¡âV°Cùîóò‡àí,tMˆÙèÕz£ıâ› ¡±<AÂÊ ‹ÒÀÕ¬.^EAÔúIzYvn∏…~¥+œ€ÇLá0{Xgük≠"ﬁ~˘s	 }à»OEøv{ôˇøQo¨√—YÖÈoÁ¯‰j√ûS\º6µΩ¢€U⁄#<e›YÖFÆcwörwn˝yﬁ.ÙGí≠XèûŸ5Ç¸≤ãT¸bêÃäÁ—•Ë·ZÙ≤≈ËVß{¿-Œøá-T¡˙¯ßùgØ^Ô|JÌN≤+ΩÄ<c÷6‚õ÷l7èWsV'≠_Z◊äÔ¯¢”1î_eé£¸ é•Å£≠Ñ_AÂeñ∆>EuUùL÷¨©V£Ú≤W·cÎb–¶ó’Ë¡Ø|2Ä‘[8Ä–¸Ò[%’ÿ ,ƒ“˘Z´`¬zπeáCó
Hs^hXˆ*W±7åòû‹w¢aˆÆQD‰óõ;wQ§‘≤+mm‰7
ÚY|•∫ EKZ}M
°◊k»EviR˚¢ Ω0©c£ﬁŒL}(≈‰7¥Æ˜çh#/‘{ó]ƒ=v#Øøh∑êæµ)$	±é’Ü	åòV|o{{¶!x op?¸&∑±o äp˛[˚ã„0mæèÉNˇ¢tÀÌ⁄ÓÏm±u/∂n≈–˝°∂nEí:˘BMœÈ˙ŒAf>ÜCCÃ·gˆ
—¸–$ja‰uzD9ó’f÷!Õ/çÜrS£ñXÔÂW˚î2:NÙ”q›˘ÁÉ†[}‚Ó9/”È¿HÙr\‚Û–â(D3äHí/$¿Dg˘¢8¿ŒÏï™H∆ìh<$ªπF±E§ãÏVŒf#|ªÊ,p-F*€X¨DJø7*pB≥dXBë?∏‘„»ˆN« b bÖR·∂8ã8;‚∏ØÍõûË¸ÿFﬂ}g&Ï F«a””4Ò›1i«ª◊Ø›–H¨z7≥:ΩTZvﬁ´~=≠Òe§í"RÜ•ˆU∆›ºU∆ùBòäa˜›+#öURÂm(!¢°Ù58Ö]“øQ/HÄsV	fm¥ıôtÂ3mÏgåWYˆ¶®eñ≠`:yœa7(ú2ß‹Ävn¸a∂ksMo¢√ê'ÈÅç¸ Î{EH¬Í⁄r´Ÿ\n≠n†wiü∂‘OQgÕ4˘BQ≠ñ‚Â&-hU]–$Ìk˘]Ø§À83À»r®æÚ„~«[Òˆÿ:08õâó≥p{:¿πâ≥<Òz]p:eÒNieÃòˆ˚~_ÁH!öä—,≤+¿â5Â^Ö÷n?&¬ˆÌì'Jﬂ70%ó›~çi"›¿ä‰”y‹´kA”;	ÛÎè#OóÇ;q⁄«|C\¿òtvè√∞ËùUQÄ_*+?ÛoÛ¶€˝πQ¨Õ≥OØí‚Û)˙
°Oñˇ‰í˘	ŒØ√&±ÑËæ§Â¬¥on∏V∞€%}π/π±'·0å–≠j¡KŸı ºK⁄ÛoºÙQÚ“¯ÎçƒI˘ùŒ
øs\4{°¥Ç|)VîŸA‡«Ü\À}ÛNŒÊ»>w˝ÓGz÷âõ7„‰ôÜw⁄ﬂt–
;ΩDU*£®*5j‡7Pä¬ñZ∆#…⁄6ì,^Ñ,˘cÔ∞?˙J¢U0Aq9%•eo%óatÖÉÅƒÓ£Z˚ƒ‚Õ´D7>qF7ﬁ≤ÒÅPç˜çh${ƒ·‡∞^k&['T∞42≥Ìœ%3˘•Äì[óï≥n6%jπUoy=ÚﬂëÀ§
¬i“a≈lÉ «Ù„:©◊ÎÆ¨»âs8B•Áàq≠ﬁ+du¿ÍTp’¨ZÓÒ{™˛é`™%π!™éò;<ïÛ’sXù†<§Â·∞™éH’á2~ó∫Ã sπêKÈ3Ê£∏î˜7üÏ‚∏¶∫Ã˘8£Œ@ú>uêFÊ'ã∏/¡©t@˜ÄUùßÍ¥í~X|j9aÂæq©˜àIu€∆g∆¢∫yùﬁu¯”åÀôî›àß€ÜßﬁÑÔa.…6ÕˆÎ2;”m∑N‰;≈VÎJØ€¨Õ˛–“{¿è∫ÆŸr+vä}~æx—iBÀÙ∑√Lâ˝.ÿ–á¿Ö∫”„Aÿ’£¡Å~G®≥ù|fÏÁC»(%Dî÷≥™2≤¯1F;n∞4G‹Á|0ü˜è˜úÎYVÊZ`<ø;∆sû¯N'Û°pù.Ãï˜≠¨”U‹u3AﬁAa˜P˝ÿ€Ÿ,aUûK|ËÃ¶Î∫$’!Ô^3£†fà='‰”£≥†ùÓÓlcÏñ÷í˝$¬uØˆ,ÂƒÉK∆áü	|8Õ¸e»∆$	◊yæãôxYB—¯±âU∞È´Ù.'ïMÖdÂÙcë£0¡ ¬+XÓŒa§]Ùfπà{ÌvA`N€™TŸ≠ÊUv)àRÖPÕ≤—∆C'ïû(Œ +fèkÀMì¥}R‚⁄ég™¶	Õ≤ë§cø2XVß∏œÓ@“GÀÇGˇòúoJ¥ÁÇÛ˝°8√@1•ﬂóÎa+ûõuèœÅÍ∆Ù Ä@K=.yz{Q8∆dGvŒG§Òk2˚©=#JkTP  +UëpßÙ¬ùy•:¨<mŒaq+“¥MÑïÔ!wÜò÷=]V‚Õñ∞ÿ¯˝îàAÒ”’ïÀﬂv_exmJçZi∑⁄çbã÷‰=SµH8˚;-z˜Le‘¬¶∞ùÕò=„Ãø‰&Nc
”2&Œ¬©öÅê)MZ•¢R∫‘bX,•#öv8ª˘Ì7Ø¬yè%B≥k‡[µÑÂ®€§Êi⁄¸Ê&rV≠\∑¨›¡h´À†§Ys‹u
≠ìñP≠ÊÁœ;{{üè˜˝¸π‚ñÓ/êÀN{·’ë?Ú/6˝ ÆbjWgÃï‹œ02éÄ+öÂNﬂ◊£ù„ù7˚ø£Æ∫ˆÇ ‚ù ∑°‰ÉHæårR˘≤‘XW¨€=®ÜÖX‰0µ,¿x¡†Œ\z9≈0""Á£Ø«≈Ap•"∂QDÂ ˘«¿Û∂VË◊.›vR˙™˝q~‚
wÆ¡Z˘5∏Ÿ∆ÇÓRÜÉõ,Ê≤~Aﬁ/”Í%'‹∫4à"ﬂ17NÃ¬Œ1Yï?{«¡Ò'poh°	);p±	ˇ_ˇÛ?˛˝_=DK¨ÏòF∞T{`o";«Ã:d∫≈ŸvQAº⁄ˇ»Bªêù$ïŒ≈å%Ç».§ùìW£úÜnzy=-`•òˇNî÷Ö %7UNºLTˇë^VÁ]o∑ø®.2"Æ7~"ª‹ΩUl˙1_q∂0@èEz§=ûMàÍ^ÚÊÎyë‘®,¶ïÂ√A&À„ﬂé‚2äÚ˙Bî∑∂‡qIÚ¶7\Ú,È?xúc{t0oÔûúìÒdçÅCÆx¡ı+t`“"XIÁ~˜2 °aÁÎ≤◊%≥∂L3Àü√	‡ è∫ÏÁE·/Ü˜éç	‘g∑0{XÑaÇ˛¸¸d	í é¥ìA—üËtBì)¥Å∫È
Ÿ,ÁNR⁄ç6ñ}B#AósVG¡7¬yo=X’¯kŸ˚(˚ßMÔ	>)‹˜ÓñåıwBM∆ue¨áy°“uX.~h`ﬁTT∆∑ú,’xÜ»¬Ù^∫NG”ñå∆û≠j¯y™∞π£g≥°©L·≤^≤&Á‰ùR⁄NS<ÄY∞˜¢iºÿÌ‘Q_
1"õƒy+MıôÕﬁy‘)£1ÉæqcƒLõga7‰^KÕÚƒS≥˘≠ı„¨ΩÖuôu œŸ<~—√_
3Ga*6o4Úqa«@ê˙µR¨tö∏Tîùò5˘e˝¢? ÊQçës‚7ø$Ë.’¡Ë2È·)ßqw#ÈUÓteàØ•ÛËÿ¿∂føk≤-kÁ[Ôlñ!o_m¢É{L»xOˆÑ46€yÇl±-Õ:©◊fˆ√ÏŸ}"iùÖ¯ﬂcˇ[ü~u\‘E¡AèÈ÷ùáÄ√·€4–Gµ¬•@õ€Çå{âô Œº≠mØÎ<	@Ω7`i%^ÕkÂ_á˚÷OâjC›ëPˇ:	&‰¯d_~≤+E®~õ9‘"7Àè¥Æ``sÊVôè5S∏˝;KUWµg≤—ÄmgV≥ÉYå≤HFn¯86.’YÁÎ
*vaw∑U©ﬁ‹‡[NñÅ6InŒ≠Ü Öy˚<2Ø~8âIÿº)w˘›^-
Gá¡E¬7˙µ;Ù“
øøˆªIo˚v’ËuÁÄoC^€™SÓæ‡µÚ•·µÏà=;´}±≠d≥/Å´XÌœV+^Vª`µ¿kÔöùÕû†”ÁΩÚŸ’:ë¨W>åPãWÇ›öÊ∆ïﬂŒ‰aqœÃ:
˛Î$¿-ûçqà‹'fY–jœÎ˙ñÙú˝§π¡—Äèú¯A∆A^ïî›‚$rcM\û¬+L`ÂéÃ†ÓM´#«]º_]Œ≠z™†ÎlÅìà…’#ˇk‡Ω¢ÍE,}…aˆtgLË√≈.,Î&¶m«©áq¥ñƒ—ZjÂ4gã5◊¸¢ÅIπqøµ∫w˘qÔÅ˘^)«∞π:Ö1ÆF’(8€íΩ⁄ÕSmzëÓÓëKBaß„«Ã‘"(˜ÿ„HG*Œ'≈xIπ£»1S°Jb¨MÆ95≥"’¨7äçV¥¶eéJÁ$KQbùEö"kºï1'±I˜\kP5<R⁄g’°ê-ÏÌÓ{;ªgøÏ{øÔΩ˚’;{˜Ê‹|ı·ÏÏ›±˜˙›â˜jÁÙ`◊;z∑∑Ø`\∑PŸ»îFOiOµ+O•Ö5º!Ê5˘QjHUÍUM«v;#ud°úSaDjõ<MÄ§´ƒ$i·ux¸§ñK2X„A?©,AüíI4Ú*£4íû£ÂK»æ»JI˙√ 2î¿ﬂ£µÎﬁ”s’R«Q˚£Û]◊÷àU.üöP„!eõçqaƒ(Ÿ,H6è
„}Î˚P¬Ñp7öùÜ$°'{9ªá±∂Òãµåπµr1e$&˜ºù*”jîéÛLRf’PP;}÷~æ‹\m,∑÷÷I‰öOA—Ö„
ˆ"™ªˆùç"Ã˚õÚΩ	,ú·≠ÈçÁmó†√y£!-¿ªÇ≥3lïﬂ`ômzßH¨ﬁi'B\≈ﬂˇ˜ˇ^#âdq”[gH˝‰ß¯â™Z5[•PimãÀ’F›2lRl2î?ïQqZrT7d∞⁄‘HJl7ƒıí_%ï;t¥%£Õ˚o5‡˘◊˝!t¶e0œ¶]Jë
√A≠iË…ñÊâédòÆå7ﬁ„îÈ"«ïò4y$ ÆÓèà˜ÏzgP·“\fEhı√œ›ü¶ùì]Èß¡Ã}B(_I'√a˙#Î<p§{õΩË©î,ãvs‚bÙÓË=»çﬁ_º˜ÔNﬂÓÔyg(GÇ‰∏
Ì√+«g'Ô˜Oº”}x“dÕ;⁄9€}{p¸ƒ…›˙ﬁ€€?=xs¨ê+ÌÈåäÆÂç"&∞-ó{Ò‡›ÖÛFñÔ¶t*2ÌvLŒ∞T
)≥pÉÑã!‘±◊á-¬øÅÆ˜˙›.lT ¨ıG^ à<R<nhJ≠¿mUπhûHÃÏ∑ﬂîY¨E8„ínuπ¨JáŸÍÖ„∞|∏sÚ‰ıá√C˘∞Ñr‚ÌÓúÏAÔ’ß§Ÿ‰¡•ƒ’Î
yˇ‘Ë4Œõkü0{ã,ñâ>Qo\k£$9Üc~û∆®Ç˙ÿ@ïP ˝ª?Ü◊5íÑ^¶‘$>"Ô≠7‰Ñ+òHÖ3'†èøK˛˝["g2ìÓL'7®êª%í‹%8t£Cû•¬nµπ⁄ÓóÀﬁüö≠f£y·5˛76‡úÀˇºT—âÂ&TÍY8∆¥fõÑ÷ΩtTH	˛™üÙ<¬#"jÃ†Qˇ}¸ÜÁµ’‘oL∂ôê6˝Q‡ ı ≈G	ÈÅ9ÛóŒß≈ËØˇ€¯Ñ8≠’<ÙZD€Jœ˝—Ö0£fe´?Ol~MÙxã´ÿ¶UVx?±|hàõ$Aóå∞≈+	{TillÆµ≠>RS¯GM∆]üÍ”π¢&iEË¯zø[⁄∆ÍÂé^¡Òàk0kÅx™>àVØäpÙO¡Õ^x5*—}Í'ı5∏°<wüé_26cÊÁ}+»i$_¥il-√+≤É¯FÓ\ﬁ"ÁÚpí˜`ÇCf$O˛◊tcŸƒÿª!Õ"è%Ûn|œ‚8È£-ß(rw uúﬂY&r⁄ æeb¶Q¡Ù:6Y“õáeo∫®dfã{µtdû_á≠g[≤óê◊Ó¡ÆKèötúßJ“c·e6q∫YäZ§£s$ŒA`´L©%!Aì÷‘Ê‡êtS¢ÑláyS∆ÕòÍë®!S$…«FΩ±ˆI∆ó‡›uF?x‘¸$n˚lZ	2]K7W&;dœiÊÿ≥mÈûßTÂ~pÈQX∏w·∏è†)µf≥ë?˝˝_ˇœ¸˚ø:Eõ£@˚òSËi›Ö‹m'˚£.øÁ‚g[–6'5É<{G¥A@E⁄ΩID3˙Ïtëp¸@=“b*⁄\d◊Ob‚°∆˝ŒJä∫‰»ÅæjFœ1.Ù"Q¢ƒÇ"?Íè&ÒÔ◊»qz‰dùùAœÉã0
\≈3˜/˛¿€ˆé¸§Wású¬<ï$	|‰[0xEä'æKpåo[k&≠rzQúëZ\ı~ˆ*üY'ñyÛl|8Û†WâAEƒ˚ë,˝æÑv°‰xÿ˙[∂%ÀŸà¥óΩ.˚ñVL:nkîôÕóñ€qï´Z#Ï¿Äü√èu¸∑áˇÚÕ’÷:Ûôc	i‰»+ÎTÉ¬ÉÈ‰Ó?”xŸ±å¬!B∂ëG-™T!£N'o¨0XûƒÕûÌ∑ÉK”bÄ¶~Lƒ'
b:%zWz8!õm‰UkmÃõNAL˚~4Ëced7£î2≤◊¶√3˝˝ø˝w»ÄëÔÔ¬‰E∞ò”˝Mà #Z„F`Pµ·UJ4ÂqﬁÍM˛6ÑŸ™í5u1√®ö[R+ﬁz√∂¶‘Â‚fóqæ∏?cq”î∆‹âUå˝›P€©Ê[õJ¶…Z˛õ/“°ØË^®h°ãÑ/Òó^‡ªôq◊ìíóàübÀ$Ü£⁄rl_§ïΩprÚY‚èW:<g$¶Ç01L◊·t û0áÔ0ò£XYQ0Ù˚#<ñùΩVﬂd+óî≠îœ€G|ÜZÊ.˝{#œÅﬂ≈„f’·I–‹`Ã'èˇÛ	ŒõÖ‰ÊÇvö⁄Ïùb£ ◊!K˛ÆÁ›ûíKUºÀì»¯l©>ˆªdÿ´≠eØ“®,›!µèíSÙ(óLΩø∑á—Ω€á(P1 Ûakò/Â‡^«Èÿ∆CA;§B%¿A∫’Üüä1â∞Ï0Î‰…˛—Œ¡Ò¡Ò[Îùb©õû€I–ŒLr˚íuGN2UÍ§Èâ?£ˆ¸:(‚a	«Øâ0°èÕzcıSÓÅ¨Xt]8NKF’(áà,´ UL…≥\◊î~Z¶_6Y˙≤häÈm#Ô8†{Nv–Œ?«q0/-º\8¸ˇ  ˇˇÏ}˝r€HíÁ´¿úÓmjLJ$%∫eçÂYñ;¥cÀZI›}ZùëêÑ5IpA–íZ£à{É˝„6.‚.6Ó9ÓØ{òyÅ{ÖÀÃ™™UU )Àn÷L[$TÍ#+?~ô9”Nxˆÿ	Ú
7äˆ-/„w˚øúÏ?Ï*÷+=a T ÛŒ°ƒx8X*
’íVã*ü:›oX7h¶\‘<u†¬
<’Í>ó¿ØT∏waÇ&E¯T“ æu£|˝ﬂ”ôÙO¥EøÎå[ØÇU$d‹B€¢%›Ü´ÿ®«Ò‹	*9ßì≤HÉZä˝NÒu] DËˇiô⁄∆∏Áﬁ f•›â Ãœñ”Ó:˜£«:Úc„«6‰«6åk_%OÅWºPŒ(öl}Ï⁄Sík¬a €*°B∫è’08TÅ·é@y’(…7E¥•VÈÕµy—,ÚÅ€ÒX¨y,3ÛXf;ÒìY3ËÔú˛ ΩgtïN/¢S∂=—ﬁQ	2c∂cÈ)cï˘pkÃ‹%Ié U|6
2@ÿ˜íÉíü‘Ã?«3â÷ÇE–ÉπSb~>k•ì?ƒâ“xÈ÷áˆ3!ÿ>ﬁh∑:çŒF§[L«fÊ	(‘N˜,Æì2≥hüˆôuÃ]RH≠˙œîäö†›JVÎ˝–‡(ö÷·ÿóƒâ§hÇûâÎqUËT∞@ˆ6	~Xè˚»nå£2^‡0b óﬂöΩå÷∫Zûáñuy,∞gÖY/éÿ‘Ç'˚Ël¥¥ylÄ42ﬂ‰íôún‰=‚˜öı≠ÏÏÁ]
'õÎia∫a“u„,=+i†∞ˆ`)¨¨‘›àÕ„ˆabÄ¯ƒÍ>fÁëI©òS¢”9ôª>§``RT´–“õ’E†NÈEMöÿs∞Ø§‚º‰)`^:-√å0Fº+Üã=Sä•cäe6æRå•"«É≈6uHí§$ÂWï$'X»zñ«AÉ¥ÅVUõL-áÏBMaBÛŸhœ'_	Um†G÷üÔX¥⁄‰R¿;Ê›5Ì]a,Ø‰ça,ùC†AMJ+\$#B‹†›:'∞w `∞º)‚'D ~z*·Ë¬k@ÚÃR>ª<±M¬f˜péaië{ºÊÿÂ¯˝⁄Æî™"5`“ˇgR”™ÆO&O£º7Ø“˘6˘ÕèÆÍµ^ˇrÙ°∂böâı`H F	√5ET+ú1^\%pµïÜ”6•@≥—9ÏëµJdgGñáj˜ó„ì˜Ô,ÚPMºhó†H˛Ô1é,∑õÜoØ‘«^˜V=Ê“Ã™Q¶«ƒòQ°wlﬂ–”ó[ùÄÙ°|πïyÓ6Q≈Mnﬁ"¬ÙX]I€Êi«Ú◊ûu4%F›„‰ÿ*á±U¢≤do*YÓõYã7Ág≠á˜…‰àÆ ®∞)e˘Õ‘4fÖŸŒ~o
©˝lÙ<C˝é‡DM\“Hé\Wπ»Æ ¶]VÎ`±ìòT€µøˇ«Éˇ˜Ïg3ú⁄N∫∑´P©>ÚÆùc/™_(+ñ¢(WDíâó¢?u˜ñSf!Hä≤øa-˛ÊÜ√ÊtåÅ‡Ùa—’	øBóÿı¢ç¸Úé¯Ò»£êˇ‡\™à3É…]SÄÂleÖ©˘a"8õ‹∞b˙∏èﬂ›A˜M˙ı`≤SŒÊ‡ı¸|i™‚-A)JI”åzìJçòrTHÂ‡T¸˝?ˇ;Kêk≤—ë}]xö;Méπúππ«≥Õ1äú⁄.ñyÁƒ^¨æmaA'åºÕ^=m5ú.rl¸Ì¿ﬂ¸]áø˜Yã™à◊™∫tÅl}¯Ó´êVÌG∆3&◊mV∞Ò∫enåkô$Ω∫/1&èrı∆\Îå´˜?ˇ«eWÖ÷/h›&ôu7f€Ql#‰’õv5fÎ%`óUº,sr5aØÔá∆–±|yòÓuj'ﬁ–'Jú˛ôÎâƒßÕ6ø%Î\ªw˛˛?˛Ø¡∫0y{=Öˆ NÇ¿°ØÏ5´S`ÆDùÿH!˘≠„‰M˚0ò9,Uiwk9Ò§ıÅ§≥6ﬁtÅ#e˜Le≈ó;˘Å
⁄™ÌU≤eî"≠tÎ0é´‹=Tﬁ∆r√˘≠”Œ¯£ÃQãô¶ÙõŸ{Û®.∑€Wæ›ˆGÿn≈∏D,Av4Áeô2£chDÛ¥Á—à«54∑óØƒÅ«kΩ`≠µTdÈsYZ¯™Òx“‚´ÑëÔê¢L«Nn›VIÿn—ﬁ:Ò‚]ºyh—uEZ∫É¶»J%{ß$Äå/˙órÓ5î…P¢öKÙq5–QÍÀû√Ä°b_§Å‚øvS1\5£„$c„"ê’fpÿÄî’-)n’acc}˚Q)ƒG¡®øÈÓïóÑ√]œfsJ≥ælú2÷˛}„—ÕlN˘öﬁgòô	ã:4üQ¿ƒ.U«°|è!hÕqv(Ñ*Ñä6«+ó\
d–rFµ©9ƒ’ò≤b±R cûñ”ı
ƒW‚ÉÑó‘{9‰ü—TºÄ.´ùX‘:ú~Jì´¡—§µ]ælëz˘˝7É÷?€àU.wKY©Î}–
˛ZÄq?Ωƒ≈-qq’qq	:VØù	«ºÚñ¿8+◊Ö%.Æ2.NÇ}/ëq'ç…∑Åç£}íU˝cZ_z	åÀÌ¡£∆	:˜Õ‚‚8ì6OX\‚ﬁ˛Õ£‚¥€{	â”îjê8±-óà∏‚◊— ‚§£ˆ`‚ä˙ØólpƒƒÖ C1Ï€kÔ<ÙΩ¸¯&¿$ﬁÕL‹n L)Øπ∂ªwâå+A∆Â‹%0n	å˚˙ÄqåIZ‚‚ñ∏∏lœ4∏∏Ñø˛™aqEº3?Mó¿∏%0nûI$éñ%Ng±∞8ItX„§≤``úe–¬Âv˚∫∑[ãõÔv˚#„åT´K\‹∑ƒ≈-qqô≤ƒ≈‚‚åmV÷∞∏M8Ë7øN0útNSpµ?Ngè3≈ó∆Õ˘ Çáıav˙^fO¡7[ºΩ¬òz˘1ıl¢ËÖ˛$ÂÒƒyÎNGΩ+VG—¬¨˙∂È–F¢¸põáï≠È˚8´3zlº4®©E•˝5#PàS0ˆF?¡Â¿√a>p?˚¸…íA¯“IÑ«∑ÆÒ˛Q‚ñÁ"ÙDéj©gîÜq•Ú©€j≠u∫â@#_ﬂHG5ó’8¨π∏÷…&#.â¡™ÜAﬂöãYõÒ5…|˜Ò=L¥√föÌ®Q<◊h/˝.Oy)&ºújkî–ÿ°?ºE'!ßnoW”¶hO´zØ¸~ﬁ»ê?¬ÏÕµó¯ñsJ\J®ﬁπz(L∞√ °¸R©3ËÚ§O‚∏ˆz.Ôœ•©&x∆¯P[˜[6BÉp.◊S@¢ıöS4Ü‘‰"r:°oÀÑÒ_Í\µúƒŸ7Ü)3Ó>EŒ&Rî€‚$ít+á“$2;ï:È√"s@Háá&ZwL4ì£8-‡ë÷Qç¢ùVqV5jw7?j7ÜÌNgÈ …EÃ√jo•U9ıw67⁄8&“Í¥ä‚çóu®Ï‡|®ú£™.Áô^√!ŸHçè„<€kÏ˝@x)ùü¡Pàï0èQ†	ù√(î	ëFπ†I0\s~ıÁ$∏DÜÒ2+"Ö…Ap-î }g€y¢úi±N≠¸î¡3W≠…Ä˘ô†l|‡øâtt‰]¨
Ë6"¥»qˆ¸ô}8*nˆGˇ4ı¶®€£¥ÙOœ…ÍÏ@∫•· ëŸeTï_–É¢%Ci]’ömF#1úÌ˜o$√ôR›SÍ˙>ÛÇ®W_âl€Ø¬‡q¯ﬁºEÂ;˝8ßÅ rujRù:Âü˝Ñc˙∑ø9£È` ¸û¶ü©©ùIß:k…9Fƒ&)œ•Rç∑4¥ºÓÏè®-•?ÛÃ∑∂‰Mπ«|lƒJ ÍëNôÓ§õ“ù¨+%e8ç¡¥ü5⁄õ›FªÛ≥éÃQ 5Æ∑Ã8HŸ≤íWQAßôH•Øã‚"Ûgh,%ôãv˝∞7:Ïî:ãÛ`™êóyú%ç¢¡Ë‰ô–ƒp¥€pò∞òEø⁄1
*}`VÅkı—:qƒH§j∞»o≠˝ì}'%ö[˚ÙO≠^ÎºΩq∂ˆ<Ω∑ô¡¢ÀC`˙-†£y>Ô˘tWDútùﬁ4›i‰”
 ⁄ºûI›¸¨òLL–∏∂}wÁú√°pIØdı†n£ÍÌınﬂªl8jy≠~˚ô”˙?ˇˇ;w`~øR+:⁄äÊõ˘ΩéôÂ	ß∆9B/NÁµ?£®Uﬂ«!`á™ô·pçxÇLÃüπbkt2ÁÒ9Ö≤?|
œ3YΩZÎe†^¿˜†´pº2≠æY9Ÿ4EZ≥•÷Öˇmû±∞¿¥§dnÉKçπ’çºPìıG„©Œ•ó	l8∫#±ÿıOï)*4B¿PÁ!Î¯Oµ÷Ê÷FW¸Ø‡	úÄ‚Ÿ*w≠SΩ~g«—£WÉi($Zêhˆ3Àß~·À´uQFın_◊#ã◊GÜﬂ[˝‰›2KÊﬁ»<£cYWê≥éõÍqA‹ÚÿM£ÆüÁ_G*8·”ˆ~¶R;9o!˚å1H
‹BG¸å«°nÂ#ë¶’SzüŒX≈Õ¢CIEÅ¢ªŸJãÇe∂©Æ
@’ΩF~¥ï¥«Mæ€…òÀOH=‚≥ÃÜÈD÷J√S√:ã~÷Ò°ãB≠†¸ıc‰/Ω`<Äô5?„—t⁄Ó‰íxÕ∞XE©ÿIŸÖ∏ëµÊÀ2tJ‹V»TBÿ¯"∆Õ@	õ“…√P'iJ≥|Õ∆ôÃJX°0X˜Ñe6Gf≠GÁ∞ƒÆï’aiÆÁCﬁ¶ 6˛Ä@f!é8f⁄h∂ë€IF±ˆí9â6ÃØl"VËqﬁ;ˇﬂˇ·‹yìho‘◊ÊÑ(zTáÿzÁ˜˚ .ﬂÉ±v˙∏pa(z∞2¬`0qÍMá[FSDÙ:O≠9ÊÚ¥®©8YljÄY≤”◊ÉõLx"k‘Ã)Ω(Í˘CaûS∫áqw{ ÔCUµ}ÚxD∫çX1¸Ω§Ò≈Á©—6‡’⁄5‘_¥DHÕ?=„8õ9jì»ä_|©Êy'ﬁfÆ◊Pª¿màüëπyª%—B’~∑ôà}ªÕ¡ze$å„d√~Ìòî~L<°6ÇﬂE_˘ríﬂs√ÅèM–	,Ö,In´¶.Û4¥"Ô¬ÃÖ∞µ$1åù”ÁzmŒÎyŸáÖıPt„ûÃâØ§l0ì8K˘ıä@KJuóÚk„ØÚ»l?’`â‰S±≠\ …[˛U´4xWåáî”Cˆ>EmÆ<˜ÛÌ|®çπä5±•µ ∏oä≠†ﬂ§µ◊¡√¯EÓx≠áKë4óTCOÔP\◊C°{ÓBoË˙ËUvÏı&ŒÀmg-V∫z©Ó|ûºÛLëäôódßtÄ»å¥îéå”F¨ô(∑Q≠ΩëVm# LıT3
∏Ä‰Üˆ˙˝ïs\=Ù§é◊`_+Åø≠¨é›>çwΩ”pj≠⁄
E-—èQ–ΩÈ®l®7’°Ó<Ú°ÜaΩﬂí«÷\ŒŒkhµ^9˘£˙„j«1Q…ÇøDÙ8ˆÜg™uey4”zÑNˆﬂÌ9G{Ôvˆˆ~÷u¸1X,ÔîC«3C≤a≤\ÊB[$«[eÌ£Áπ íao2ˆé1sßmb$ÂRÍC√ÄGw•\ÑLw2<AE¬c∫?J∆Ÿ~0&Y⁄ ôò>Ÿ±åk√°|˝À—Œ…˛˚É9é@˘.¡bH†gY‘VT¸q,jy±EÕ˙6W‰ª˝É_NˆévAÍÇMWÜfîáåà7-5wRY\Œ¥ØXY7∑¯8_≥~N9œüjïëKï‹7°í€ªâºQ_U…=ïTro›(_!˜t&Ö\qƒ Cƒ]â©â≈õ`¶¶C0òÒ¡®çÛoSTqåCo‚EÒMúzª;ƒ–•Cå[
ˇ¥ØÊl{Rå≥p∆∑π™Ã¸Tπ¯éEpÖIÇû≥∞ŸSoÀiwù˚Ü—c˘±éÒcÚc∆èµØíß@Ù*^7<^Ï¶N{Ñ
wôÜ∏€V©
Xç>ŸÅQ\≥®,∞ñZ•7◊qõè0|‹ÃLñŸÿÅd÷L`YÛ·
*˜Z‡U:ΩàNŸˆD{G≈ ˙p8ñÔ,Å7)gw:-Uí˚ß»ﬂ§ìÕı#´…˘q-Ö7”˘~`T∆`∆2ƒÌúê]ôΩäÁp'◊ˇ∂SÓ9!
sÈêÒÖy∞YÏÏvÛ8ûò2˜G÷E<“™ÈLIß	˛¨dâﬁœ f—ÜBVç(IÜ‚¨fâ8Ñ@©$‘Â d*ÜZFÒ()ºÄÀ(î(◊Õˆ9a¥•s∂‘ÛÙ9Sf&»—ñÇµq»l/√yîñÑÛ@N¢ÄùXò'Ê¬‚ytñÒ<,Übœ#©|œcœcœ#˚Î2û«2ûá\˛x|‰2∞áM`ïùT{|q=ÿ™?N\èÙ`,„zîƒı»\Àã§K˙√˝ÊÒ/ááÔèNˆ^;˚'{G;ª'˚øÓ9;GÉOáGÔè˜úWoﬂÔ˛’©ˇ∫ºˇjˇÌ˛…?;ªÔNéﬁø}æ˙g®Hz‰‰˝œ?ø›À7Zﬁπ˛ÅÜî<}oÑI€˚⁄õ¯ã_}ÔzÔªœÚ6<!D>ÖõG√ÉC19˝ëë|ÌEÆ? ›;ÒqK÷Vä¢ÖÁ∂B∂ôëË"/mi[j©pÎ√‡Óº›9˙∆ÁÕ/oﬂ:|`€?x˝˛7uºÿ‡ñUQ`RP°"öelìGJ˘—ës)Æ=è¥Òa<·D®lqrÆCùú»bı¥±ﬁE$2º‡ÑﬁÄF+ÜÎ˙#Á¬Ì”ﬂﬂÉ`õœã˝ÕCå?…Ò9Ù{xûDµ?œyãı2]s>>Ófb‡¡>·®oﬁî"ñç2“)ÖøΩ8ª·ßÅ7Dm#K¬§&T$t9{ÉkÇ€û1{ppMKL,ÍÚSF€ ì#§Ê0N≥UÉKgÿg;∆ò¬ôâÀË∆Î´£≠åuªR¯BärÉ“@¸¬Ø\å’R∆\f∏º(+eÏÈÖ˚9aºÂ±⁄'€wôK•Ïm0∏∞Ü]ƒÉ@„Ú◊≤Á&ÓgÔ∑ ¸◊ÉE§|-{Œ	‘E>,©_˝0ö∫É˝ãœÉ-ø}W¸[Yçú·«–oÇp∏}ó∫`,‚'Ÿ◊≤Á≠úÉ Úê3p˚.˜rÈËKsç§‰∆‚G∑·‚"p…;Ÿy5ÄPU9,rŒä|√]ﬂù\¡¶‰ﬂÿÚ£îO°4(¶˜˜È¨ªt∂=ZmáV€üÛﬁù’˜fµù9ü}YqWÏ…‚mWîYÇ¥∫˚G{ª'±œ9;G¿µΩy¸^ÛdÁ¯ØŒŒ¡kgÁ∞ÃÏÎ˛ÅÛjÁx-{';˚»ˇ∫ø˜€q°2¯”÷ë™G‡iéÇÎÇwúm+¯ì◊¿z ‰ˇ›%rnﬂâOEw#Å∂Ôä”◊¶$lf°ƒ‰
s~.™s‚E,%8∞Z°Xé9çûÎ„Ru$?’C.ì©*ò•…”‹	:ı<øjT√ëÁNÇQ™v±‰yÙQÊÜÚ¯!™#ÔM=Ô‹ë{ÈΩÓô∏U?Ú˘˝XT_ib∑Ìª“üãÍ¨B˙.RØra–˚\zU@≠^¨¡¸Ù¢’7°{9ÑÕûæ#ÀBCxoÓIzQÔ*≥ÆöCﬂÜ º]5O;Åj6È¬¯c'b(î3oöœ(#≤BWpY
lÈ\˚—«5a“s≤∑âúÁ<±ZtÂ9x∫8$ö˜Ï“©Å<πëıÂjå’òSf≠ÑË ¬?ß≈VìG‚m∑¶ìi_&Ã·q∑È¿sC ê[:ÕUqΩf151(´§›éUn•:Tòﬂ§√8”RæA≥å∫_4€yîjKÛ˚bC–›}ë\€r5∂ß7ã˜¥nÁZvRF(-R◊§≠bm∫Óë±Aõπ õıBdê∆ÀÃ7
7?Ns }4„bîÎ Tﬁ˛,,¿?Fé»* ®e Ç±0∞BjnÚ—˚ºö∏`Ω∑ˆY‘k£z^ªÙ–c{Ú)‰=÷ÈÛ¯è®yB}™Å}Ê˜˘2Äüy@~Ù3+ÏÁAÄ?´M9ñy¬¥ †πp{ãY3|3Åñl_Y7´†x¨q<Î98ûäúØò√´»1c{Ú@9Ïè\≤‡Lë&«ı© úÙãÁp‚ïÒe^‹åÔ+æ£Ã⁄]Íãók'3Yëé´⁄r1∏á. œ›≤{GAs“É¡‡‹ùq»"ñü7;õœ:ÊIG{TfñY›ú√–˚Ï{◊•¨l^ßl§SÉ1nÆ≥ÎN*ıè»è”åÇ&ê„êp#$;<πv≥Â|ˆ]¬$/¿ ~GÆTÃÈ#óäá˝JøŒ %≤
ÎZrÙ≈˘”e{I#::e“PíBﬁ⁄≠å≥aù6S÷D…!©¯˘~‰Ç/&£È•>Í_u”Lå·çà/K1c1ìc Såê¢ê8Ùf∂˘eDü˚µï’–√qÔ’◊˛ÂÙÙø˛ÀŸŸüˇÂlÌ≤·‘‡'`FÜ&ÒDÀC/ø˜69w⁄ù- É¶m∆˛ππÌ∆øb≈∞∞á˛»∏fƒ»n=y5pGü“b o¿ç0¯äÎˆvﬁ≤Ì€ºÂ√– ö√Ô°›åe¸3CË°1¡ºÌ∑AØ¨È7ˇ4-~ÊKáı¿∏u)¿";•¶òΩZA4·d.Úª&W>«U/[t7ô;ﬁ◊í	2mCå™h#û£‚&‚âò€ãˆ‹ﬁï˜WÃŸ‰|¸Óé´˚			˚0§øb◊·ÁÙå‚5iƒ´Ùr˜M;∫◊Ï0¶ ﬁ€p‘s†|ùúäÆû·R8ü˙Éæû¡õÍ&äzµ‹·ÕRRõ®ïE“IjÊWjïöÏ9íIìÊƒt‰6ôG!M*ïÁµ‡]íL*´†t1çÆ˚.Í§Ã+§8r%ı—Ôzué˘néc§,qe…ómÎ‰ß…S∫ÊXÏuGÈcˆÆ⁄Ö˚övwﬁØ‘µ¡"«≥§õ*—;ÂC¶Ú¥ò∂|8>¡`äÒOÃÕFIöEHf¥Ìf,„È&•·◊∞Æo·mº∞£ÇAvtÆË_¡O∆˛(ciÁ¸˚%àBz9çÓN≈ë>éBœ™pπ∫∫jíÅ®˙¸pÀ“÷`1åëœÈzEl¯jÖÓ^+]«ù€‡ë¢=˜√b{e∂ﬁŒÂ~|)S§&;¯5ú†û”c^πƒ§@Ö¢jÿ‚„âe‘÷tπ8˛¶Ã)÷fï3‚ûÎÌÒÜ°ﬂÏì`7©˜‰âÚD¸ºÆΩp◊ùx0?˛®7òˆΩI^—ôåΩû·√—-∫ `M0•EHç2ç96ß∞ƒ/˙·NÈiAÚÀ_úµµ8∞úÛ7¨Õ§ÙL‹À∏√˛r√R‹:}è˝	ù√Fï≤é%¶´¿”‰ÑK÷˝1≤kX∫æK~ÇÒ}ÌAWÅ3ÿVˇvπG˙.ÓGWnDøM'≤˛ƒπBTÿ;•¶‘Åqª–q‰^zo1dó£ì◊!ﬁyP *˘âôIÂ≈†3Âu˘®ãÀYY>ÂtÉÜ∏s
Àp±˙©=óz…¡¥4—RÎ:SMŒ–Å4≈{pœ)E9˝ÓNYxÂ≤ëAQŸU∆˝†ÃËª¿ëtì. IM#¨k∆a$1©Í ⁄èw √få+ß˜J7K;YF∞Ã¢†Ê)›o&±Nt2îÿ÷Bè3ñ‘Â∏√OM†6}†9h∫"wçÊ(áp>+J|˙´ËoöW~øÔçjI&xäëø≈!˜ŒOŒÚ:ﬁÊEÎg>∑ΩŒÛıÛú˚{≠π£îÂ.uôd1Lª ∏j˚7{K÷<sÅh«Ë÷&Âÿí§¨—Òbí!á˙™˙dN¥bÑòOVc+N2P–:JÀNÜΩIèﬂç‹7æ7ËÔ‚w}tSQxí≠›8≥mXÈ6ÎìŸ¨b∫ãÖ0Î™˝“±_¢Ü.∑oJZ±≈ŒQr·sÚÕK≠%ùÆ·∏Ωê≥¡Ω
nNÿ7|⁄a—≠Û¸É≤)LÌ; KÔC5lC≥PRfã≈LMö@öD©.8)∆[À‘√*[§Âî)˜<ﬂ-3!#“Ö„.2q¯P—√©ŒïvjqöR†$O5èXﬂ‰^ÜÉ˘nèÒÜÛ‡∆õl9≠fgz≤üüëV]ï`ª8›·äi„H,A4ú‡¬™£õ(?2»0:Co4≈f:¡§üscè"4˝éA≠Ãƒ¢d∏Ïj2ä˘Fé≠-Ô«,…¬v q+—ã^eÉ®óüRïY<∫ÂúÚŒÍÍ™Zœô˘qÃjy¡Ê⁄‚â¯`ä’≥“˘aö5@-l?ì¶Œ[çÿ:—fT»+(_R=®@˘·›Œ¡Œœ{>∆ÊWKâÔ¢I◊l±»ØñR?Ÿ"»i->^?kS˛‰Ù’Ú˛ôOdj‘ÆUÌ	K»¬9o”àhc^€3Ôé«¢QèﬂçG-£¨º.‘†}%ï) ÌNòëZÕe,Ò!f9øyÁü¸h'~â-Æ.oÿVÙ.¯=ßÀJpêé˝ﬂÒyŒ©XWë+ŸVrç‡∆-tÑÕ$¡ßÍ1>l´∫7ø±ökÌVÎ{ª∂ZÓ¶g6+w…âHπnÄÕ@¬lsä`yPAµ·úªΩOóÑ‹Mq\µ?µ.⁄?v\JıÙß*5xsñƒ∫u/é˙úñœ)oô˛«òóë∆∆-.P8kl$ÏZ[1÷KV7‹lêÂ#± Xˇ˝˝œˇ˜˛›aG¢ƒªíÌ’~ÑÄ„&N≈¸„EoÈó:¡ÿ˛k%nÉ©ßí†-!ú:∑§FªH¨≠i†ö≤wÖ6í	w˙Ó£Ná9Úª—cUl &hÓJ{\f%≠«»ª∆f–z0Ok®£ú'-u_\◊¡ˆ≠û˙∫¢›†∏-N´ŸÓ4ÉÖi9Hª—pvﬁ≠æ˚ï¯ò§;˙ª–Eµg/MKEAYö(f‡"ÇkdRá?r	W.–èÛòØ™î0®ÖP±t>‰«™#SﬂÂÅUe≥•ètCt$èÍ™í≠·¥[+÷¢•∆g©Ò…+_â∆'Eë`õêo¡∑£:m5ú.nm¯˛vZòz∫·¨∑0˚t√yü„oùOá~õñ;´âÿó—±¶‡ﬂG®,z\™ì{óñŸG¿áïZfµò«•Y6.K≥¨MYöe≥¨`∆óVŸ%èæ‰—óVŸ««o/≠≤j+K´¨nDøR—Ç¯|2EÅ§>w‡X¢∏‰◊ÇÛ]ÄÂ‰XJ˛ô[§_º¥6ziG˘*Ï(H &±ÑIHe	ìX¬$R˜VfÄ ªâå•Ú[p&Àã∫Tïd@'Á‡N¶%ÿÃí^|qzÒÛ[5GèíÕAD√ô`@¶Qœsö®eÌ∑	Ã&¸pÖ	É√ùì£âø‚Ç©Ê	àq¥¥¶\oFú)Úh^Ñ‹Ÿ£í'Dgø∏HQ«¸QäÒ†ÕW–‡—ùè|1oâˇﬁêBàÏ•Û¢éÍQ¿2Å> ‡ ©[ üÄÓS¿≠ô•5ÖØäπ≠y0Xñ;ŒP±\ï¯%{·j>F∫îÅnÁıÎ{øU∞–â‘(◊∞CêK12‰5%._”˜zmèh"‹á)sF0ë[∂Ü)Ï¥“úÑÚw5ËöΩ≠Q@˝·êÚÏ‰‘mk¿cU2ˆ´<Et:qqC¥iaèfS∆§k´Û÷¨˚äì38éÇ–ΩÙV°Ê˝»÷kx¢èaÎ}›˛ &qÚ·sª÷p˛Ò¯˝¡*wË_‹∆≠[7è˘ïèo'–Ë1ÛòôúªÉ`⁄Øﬂe”?o≈cj¡T-â∞!™+6¯‰|!¿§≈›ï€∂£ao∆û√8òèÇÖîˆ◊’‚t∂—B˚¥E3õ¶g4KœlíŒò£≈`ÊhvÆõïå◊ûπ•Õ˜ïè≈J”œée˚íX~ Vhı¸ñs öeò¨t]V« {[∆∏%/åÁl2g´∞_£z›m8Á4ú.Éeô≥`À◊œ r∞IÅƒ›9£ÈVcoã2€5ê7GiY‡rœAr◊ÓÑ´Ä3f—ìrßåaUã«bƒ¡‡aê€oPq`è9x‘A¬Ê€yÍò´Ω|Í G/6mEÏÅô4-ç´Öæ÷{`Å¯ıP?&x4UKÏ i2Ê¢õxíä:˝¿ZÃÁÓ˙˘&Êg?nlr-b"Æ˝¡¿9˜§àéXTTA9KUJoÆß∞Pï  R{uHÇQ0xÏ≤ÃØv20àëÔ«ﬁàÕ¸k®—5,B=(¯!7E¬O¥|S©eÃ2¿&%%â0bÏÇL@“2–ËäL;Uç3⁄ÛÉZyDQ0‹ùMaúUGîèTMõ‰¿Zı¶/¨Ò¿üD9lr6Ò<Vß›Íd<£z≠a˚ylıîº=Æì≤¨È¬¿≤´ø
åà]Öâ≈Ò[˝WXæé’˛±;í-¬¥¿r∞"'ÜßÔäöÉY€©P%VÃ«ê÷˛»f≥Â¸ﬁ<}÷jù’Ï™Kô∆ (0íT+F’äWKÖıæ˚Á≠¡Ñå~√®ŸqÆõ›gj:Iñí%õ‰ôc:éFªuñ§tdpN ø	€íí›tÙI}’¬9K^ùe¯Â˘,ª≠ú§ïnjß‰ñ®dÒu≥∆:¬£Å}›47bπˇ®UÆñº|ïœãì2´)ÖS9öáÁÕ∂µÿvLºí çnYä•˘ù≤≈ÆˆT‰˙ÏäƒÙKn˛™π˛,ìv6€Ñµ"ˆ0IõHd’%^5”??Çˆ≥ísÿ#8<Y©zÑÚßÁvêÚ˙f8NYâsÚ`íj2—˘+Ëƒ§Ÿ◊\IÁƒ ã•í®§√Ù;º◊˜’™Ho©LV≥¶!∆ΩïŒÁ-óàqªï¡g)k∑ïåhvnC¨T—C¡Ë˙£Ò4™64π-o◊z∏\ŒÉÎ√Eî[oàR„Kœ^=∆ädœÆHZD¡\>‹∞˜6Å˝íÖÂù·ÔU≈Î4)Rƒﬁ‰{æGƒÉÃÕ’7©(ïΩRãzä*pÏmCtŒ⁄∫,uÆÚìâyQ>ƒsLåd\îﬁ@0f’Y%~µXz∆&EV
1Z•ÄΩÄÀWmÉúÈ#…W¬m¬ù◊ƒ_—ø*]´B¡,ô˙§êÍeLËm4e©ä÷Ë∞±‘ﬁù⁄Z+ü‚¢ﬁË2∫"â≤e'Cäí«R∑[xIÏs7…Ûé«\ÌÂAê“© X¢øjÕ‹2`öMwy˛Ãô∏bæö#uY_g7ÀjW˝EmOΩ`t<=˙QÂ‡®
áﬁg†WØΩw:àÏ—@1\ •ƒÙ#Ôö≈}dí¨ëˆ’2ä8˚*ÁáRÇ	™≤‰‘ÎJg»ƒã	Æ.5Uâ#ï>(}.(Q„ïZ/*)Õo)cjT¬Ry:ø∏ú6´§6Ym“öåxLÛYï7àìƒõûïA™∂ë“4´^´∆OÕá≈ˆH∑f‚“¬(©uÏX-€S∫™Ä»DC‰$ÏYA«»Jˆ<oﬂúªnT≤5gÊ00˘Ó^∏]ch÷lH˚◊ó’§¡k+ZÇ´ÊÈ:±i¿êubÖC¢ÆV Ç	hBÍ„V0v{~t‹ù≠ñöïj∫jVçu++`Ã†¨feKj†õ®ƒs’÷œÌ‘÷¨‹¥]!÷rÕãÛiÜuQÿ∂õÉ9À ´≈´ÏZ|ò\¡—˜©I"†$-f‘\]yÂıô’ü˝Ît#$æJ∫¸î€“l¬•Ω<˜‚p0—∆ˇˆ`ªsè«~…#,Êˆ›˙}Ö	]c3jãHB√.ÇäQÜ◊‰v”{øDî§Ã§¶">9öªÙt àÂLˆG∏ò´
aû"ˇr¿‚ƒ(1ﬁ¿ªtGëSoØuhµ“rÆ˝	úvz,TZ:FÕgÉI6¡„«è ﬂù∂WüùÿÇÃ¡‹¸–øŸ˝”‘õ¢\J™(˙ÇÉ1¶y‘ﬂzrSßUf:«®n¿ªÒ∆êú √áã§GßÎå˙·ÀN/ö∫ö™m˝E7ø\%úº&jmõm3Å‘±möìÍxÍ¥ˇ◊^dFåÈâ‡∑ßOMEr64=7Ïgg‡‘7+±äUbñn]z4;)´„È‰äÍ3dÀ-uÿôôƒ¶L JÙmÿ-ÉªÙ˜îÊ9gáˇâ˙Vf@k3g∏æÒ•”2ùHKõ_ö1§¢Ö±π2í"q_√ÑWÃÅÄÂ.oÃHip>Ωh8œ~ˇ¶"Hy∫„(ÑU	’¨≤,π'pçπLÚ\ã»Wè•<¶»_á N«¡sEì–»Î©hQ	…—f!9*UIAÇXù÷Â'áùmxΩ.Æ">∏fU5áZ-d ∆ñ˝˛Ω÷Ø◊¯¿¶7™Ë+/P<Í˘Ç¥∆Ú?XHπM˚h√¨p¡ü≠æ*Æô≥RÜ-ïF ›π¢onzßäÊ¿GÂuX≈`X5".+sããÀJæbµ∫Ê$óïπÑ eE0óÌŸÜ”ﬁ¨¢Ø∞~+˘]U j'Ö˚˜E@éÅYØOCEc|≠Kái#>VÒS|≠_Îƒ◊÷„kÎÒµç¯⁄F|≠_ÎÚkUªÿ¶∞I‘3˙‰$}fﬂ•ÆÛÈ;:È;:È;÷”w¨ßÔÿHﬂ±ëæ£õæc÷7Ô∞ÄQ4Ï£Ùj‚J“sq%ÈÿzR¡zÊˆ˛c•ﬁU–∞,¯πƒG5≥¶Ã€◊+¿üd˛ñs*∂˝ÍÍjÊ˜äù‰Ï\™óƒL√5 ·U≈çîïE;ì≤∆•‚k⁄«qå¶cAﬁΩIYmUòäÓ•¨T≥˚Ÿ8a$≈>Ht¸\XPe¶˝éãm˜ìÿX<KtÁ≥:îÓÀ◊«Ãg¢ƒ∆`ï∞∞Iô;∑üªd˜óÏ~AôK2Væ
nü˘øƒºæ…ñ~Ï¬¿N∫∑´a0¨ﬂ9LøπÂt67·\b™ªT±œ,1\áıŒçÆV/A¢ÊﬂYs⁄ùädÑ’9D@÷Ù=÷‰¸ŸÈŒR˝,7Í«ÔÓé	·TøZYª}"àı∞´≠⁄ ˝V¸Î0Á◊è3±{èï°cC3t‚ÎC0tírî5[ÅY‚É4sWç∑{‹úù˝3Vﬁ≈Ê/_Ÿ
ŒÏNtÂFÃûzîR÷·≈4ƒÔWNRÄ∆√(Ëª∑gê≠@J>"ÉhxªÈ s_[˝â›@Y‡å∆” égkq“çºÌ-iÓ-WÔjNÌ˛da3c<%Êh6'Û0P
ÏÍMDÈ=É.[+W)†qøåËsü ñ!πj28’SUßyóLÀhÖRåSU*ÿ‚|ês¯Œ™”773q∏RAõVwÂNîÒÖ*•èjîR¸·I¸K6∏ˆ¬]8ÃÍ+â6ÿ\g2ˆz˛ÖÛ!:U[1}6y¬ &¡q”0$F„ùO∫*‹ìÄß}»√î€§$im"£j¡™^OCﬁ i.¥]•]∫,´Üòô˘9e≠O*?	"w∞7ÍÛöì~™º‰”tOåßCÒ¥ŸÔß*”Ö’∞æø"#yë°!‰ø⁄å!QCzG^qÚæÕL€∆wzé∑TCMeˆL{·˝¨7º⁄<∏BáQœ´◊'”!!`z:ÑUP/XÎ2<`Öp•ˇº¨≈YmÙ‰Nπóvnq(‹ysÉ˛8ølzC/t}r·Ó
ú5◊ö»øµ[2ﬁ5ÑnpYQWïI¥`oüÇÅ“—≠¿	.à{1Ô°%?Mod—ΩT,;yú´ﬁv˙}Ã…õ]ÜﬁÖ?‘yêì nÂÀY^Vv°Çm$†‚¥rƒ*€à◊ÜlmÈZ8BÙ˙,Ö°s)z:ÚØÊ5€,C.ıæ·Éæ?¢dO8ˆue"Ó)[∫Ë€bóÈb7Ì3Ü‚BŒ?$í/…"q¡ÍÇ^“Fd≥IF?;è¢!J…1ø`ïox≤Ã	…Jn¢ZøKŸCwIN©cÒÒy'»;˜±ÊÇ¥«¡p>íiâ+rÔÃ*`~ÇV–W±VrÕÆΩÉ·ÃÊ«b√cä‹Ã√9üv#Ùõ´ÁffúãÅq¶≈πKÕâëu‘´ehgX®Upæˆ¿yYø§∞≤ıÔ[¥˚Õ≈‚W9OÄÂI`’5{ÀûqwÃAdÇ3”&I∫s=“¯+U¿è=,rl.å€òõO&;,©lv#Ô:NRV!•]“7‡j¢ IΩö…é_MXÁ±KHrÕÒ:‚Ñë»÷+ãëµlˆàPÛO[áeÆ©Î∞|·ÙuÙNï¬Ka‚∂<1¶j;,_.RO’êòVCcü–Àú≈nH˛xÇ‡º‰¿•XòÂé˛èG¨Ë.fóˆÆ“[cô5˜ñ≠Ö¬B*ê¯üúSﬁXAFæ
une™öå¸Ës˚a©.RWíY≥y˛Pv]©Ó§ı íΩ,÷ﬂg¢‡Œ	¡KïWÅ‡∫ˆÈ˛®≈H˘óíÖ3ÏOù]&æHŸ ´åGÂ∞K"à≈ZÒbÁ4gØz±5€éÕ/i∞í-íÁ40÷	˘Ë≈"fÆÒZOe·éäè"‘J5O…ÉûÃ≈	Ú!ûÃOx∑§ØX˛ƒ2ãÁ„\˝Á‰dNNèssy4
ob/–XØU{écñ†&ÛiÚËö¸Q√ô<ﬁ`&ïTˆ_A ìÜ1˘VÉòÃ¬d6°πR!xI5◊ØﬁU°⁄<
Å˝ësÓE◊û7Zò®π»◊ôw¸i›dô¨4ì–“Z†wIO ˙PRo·O≈⁄ ˝k‡˜Ä†x^IQ˚`‡9kŒ;w4 yr;ˆEÙÊn-éu˝bg‰A∂9ΩâLkÒ˚ﬂ’˝	f3!ÁZ¬±∫aHR+uÁÖÜ^Ëè#¸ÕüÜAœõL‡^÷€Ã{a»í÷LÆÇk∫Ú∆≈§™ΩOîxbEß‘x1HÅ•Õ‚Ïè¸»w∏Üybá-ß’p‡ﬂv∑·LPVüwu‹®ÀÜJ©®Mµ‚z⁄∫JºLmïÌJÀ™+π…öœ)U|¯Ø≥Á57–±ä}‹Ÿk#/y3fºΩnNÜò« öÔ’€≠÷ÁÎÊ˙≥ÒÕ
≈6«¸û‡@ º—í“;kìdò&ƒH%øX{ﬁ-…ÿÃnkcéX4˝07œ”∞9ÏãÆ∆yüReHôú•fãí9kö\◊πîÁ»('äπ©åsÛFS3:w¥\G%ßºKrG´I(íº—àëQú-∫9	-xûeì∞¯2±â5VJÃHû$xπòËãññèÔ÷Êj¿‹u˙COiñb¸”‘8[9DnJ.ÒªjÏß]Fîµ.Çfá•q¬ì
~ÄòÛßÄîõ¶å TAƒ›‚È„‹3†~·&f⁄4Ñ%≥gÒ "∞BØ\é»âË»ªXÂæ‰+N˛uÄÇ±IÓ?ÂFzª%IŸô€ì≤•@¬´9îÌ|ıªÓ≈ô%©ãYV,ar¢Ñ≠Ë˚ìÒ¿Ω’&Ó∏+dLÃ$J÷œªè4˛7Rv˜X≈â*˚Øg_"5JSà' È“è∆Ô£ÅÔc≠ÓuS¨Õ3™33•ÈÓìπfMå%œó™Æ˜⁄À„±Á~1öÜ∞ño—]nÙ·s¢+¬Úm‘Ω’ÀUß÷#ç~¨;¿[Ω›ˇø∆«á>nk+≥è¨…ì+Ñ'ûÉ[≤«ºjócˆÿ0:Ì!œí´#É£™{∏¿œt‰*ÂÏƒ‚∞ú¿i©ú„ I:¢Z3IÓT K${)ïHWiGb9>#¨ΩÑ£ı¬øú¢ÒÄ˘Q^†RgÁØ·a™˜Ë5YLÄ¡w∞%IÏ… à˛∆|Áƒ˙4§ÜÎ!ØCzNe;HúÔ¿`ﬂÄA‚*z≈‚\jG1_R4H≥LƒïrWÀ6LHx˘]N`VE TCcEŸıw∆„¡-Ãn0ÑAÌgkn‰D»ôW4++6'NÃI¥k}<ãqNªúõ\ªõIÂY^^Õ_”U…´©d“§$7=6„|/nSj%—ÚÇy3·Hﬂ¢®ˆP	4ÌRf*zÇnYíLnhŒhåìg*È2µŸ2sõ3<`í7”‰ÏeL∏Ò~0OÜ	∏{>˙€9,Õﬂ˛Ê<)"g&[¢∞˛÷íhäﬁ»ã-?±¶ ƒìÍBõks∆õ& o¢⁄˙È4Ãåií≥t&^¨%
’‚jJ¥‹Mrâ˚Õ pÈÃg/7q˙eí¬D˜— Bàd4å 8!Å$B‡Ù'¯ïnE^!Sˇãµ#œÌE´oB˜rO§_Ω¥≤ú¬ä0Ä*Tx˚_}Ô:è4»ßÁˆù¸-o@≤g≠˙ª¶{í29™“•ºÁRy∑ÔRÚûa4wõ∞ywåÇ»É∫ËnÒ”≥ºª"÷bT‘NüÒEøy.˜»”Ìª¸Îy5£C ¯"Âä≠µ5gß'DBt&[õ|Ú«bP©£πœ˘ì]/O¸˜¿˝Ï_∫)ùFËã‹ì∞Åp'Õ–¢2tR÷»úvt)2)›°“Ñàù⁄'!GiÏı±ã˚}	êÓUcäZ<•ö:≤≈¯íËÄüÈ∑<+‰@ã®L]—å€˘£Ò‘Å°¯æ(’gAÕF „ª˚ØŒ~:œ'Ô¬ŸO8Åh€¢‘¶Ö#Cıæ
ÉÎâ«fü?_8 Vh¿º— Â É—/Ñd)áoZ`S˚OΩöˇ$H›pG'€ÜÏAÂbYã–{8« ∑nﬂ%ÄJÂÜ™Ã•op`Ô∞H_>í$ı{ˆâ£T$ú‚itläﬁ:4KÇÇº‚'”+¬‚6ù#É#´çÀ‹Å”b@mä≠iŒ5≥Q0ã€Èzóî!√õ¶;EU»Ì»r∑Vπ›ÑòÚ^0`≤R°Hè›\7«ap·<©[Ñ!ﬁJwªX∆÷„‰:'ùc<'l∏⁄∆c≥-I«û-Fy ÿ˛»ÿK˘©RûK∑ÑÀ˘…QâZQ∫P∑ï™&áU—Õ9t*“Áÿµ	˛¯];P¯¯=¬»>Ô¢Ù<é+™ÈÍñaWY†‹™=•ß5-Î©æóØ%ÿ~¡≠qÑuã€—ÜaããGr…Yy%-®U[¢Oûº°€ÎMáSî6˚{w<Ò˙Ôà1cß´ö_≈;Ô/_3ëõ•∞∂∏däûHÜS7˚¢>Úi1¨ﬁ§¸Eä2^Ω∏®‡6¬c=……L5˙ÓXOk≈ÍàY°»C^'ö°"êÙ/A§õîE-6pâIùÜLÎT[@Eî3éËLî)≥A¢Çí<dv⁄ÍÃmf ¶(a∑Ídk<c§hM„òøÁ·ƒ3º∑^Y[—ÉD´øMÙ>OƒÓ”=R>—ë-‹Le#È\l81Q∆]B•†P≠∑Ñ∆DWT‡◊ûbn˙ëõg”¡Du6x-∞«Dç«£Ç≤^3ûÈáF≠§U t|∑w-l¯Ìîø≥⁄5±‚ì	ç:gbNKÙSè}£Õ&‰ÀÂ·~•ˇÖˇtãV»eÆJπÈî¶,êKE≈º©!Æ…Zw ó ^Ö∫÷ûZB€à‹Êú
v xNmI˙•…0àŒÆ•ëX€õÄbqœÉ⁄buvƒ∂Ïûr~° ≠¬^åÿRd√UÙ•Ô3Bíz~AØœOå»îÍÿû•ö`Û¿ü—üÒ+W-\‚≥óπTî∑_¢;}¬*Üò>¨F“^ß˙Z+Çóe
Ωí>b0F÷D®©ŒL¨ì"r…[S”ø∏ôò—.Oö‘L›yûM4…Ó,P1Ò¸Dg¡n0%‚%Ω#å˛ võ8≈‚[WJI%´∞›¯òŸŒ4≥≠6$ÍÀ≠P#iº(ıêπ“ag0…ö∏S÷?!õ=ä}ıëZ] gŸºÚ˚}odäáW£t∑ˇdhW≠·]»+fÍÕVkm£ÂƒÃqVø{KﬁÕ”nÎ˚3≠∫KgUC+R’XuiÕ¬ù»Í·eÚ‹⁄]Å¡?ıGpl~h}hèo>l¬·Âπ[˛º—nuùçv£µ⁄ÍÆú)8∑vWÀÿÀ?∂Úz–ä{–˙–Åv€ù¸∆ü•^÷x±<Q‚´≥ˆgÁÿ˚∑)⁄a\ˇ  ˇˇÏ}˝rIíﬂˇ˜%‹‹å!@ $(í&5AQ“é|˙‡â‘ŒÆµ≤‘$öDü 4Æ≈·2¬O`ˇÂ?·G¯)¸<˜ˆ#8≥>∫´™Î´AP‘Ï≤7vD ›U’UôYYôøÃ$O¢…{ç¸#ê¿%Éò÷Àc'‘äù¨Ö¬A2eˇ˘:1O\¡Uøµ∫'Ä-â=éìIÎ¢Ân≠äUº˙4˝ ∆ç÷x-¿Äô!µ˚%êë‚	l`E à6æV &\.‡%≥ƒñ
CÈwÙL≈ôw≠F(å∫>jÉ%∞e≠◊ØWd# ˝ñÌ˙{T¢ µ©≤ƒl∑Âu§ÄT±x3åö≤∞‡)qr
SZsQaÕ(pj6ö:Ív,!D7;"«"óQæΩÑ…æz†å—jsAŸa®¿¡D∏MπÏ|W~HËÕ”ú&ØÑQà.Í{ÛÑ–¯	¿ã˜µ—«VA4ñ;Ñﬂ∏“ó\]Âr	m3Áè∏R®Îµ´™˙tMû¶Á¯¶Õ¶Aèeöû°ñ7ã®√ànÂõK.ñ±Œ∂£:ç[{(o
‘q:lΩÔnR#p°}]2Í4∆d)ô[˘iñ"
-sä~e÷h¢)}Ä1â)µI~Pöç®±‹hÿqü¥sIπ’Zq—‰|(◊˛€ï-èB>•»".Ô˝õ<uO£Å^UôÉ`ü≈ŸípÀ”Tá>ë7™>ÍÄ4•Pè˝£çäÕqXé∂™Ø=Ta-ˆN%≠R°0˜CsÇ™ ˆÅlh0Ÿ‡ûuıÕpXÛ´œ!ñÒ tkh\”˝àåm∆≥YPÚç‡hKº4;4sÁßÁÁ,±)“,,âóÃñpFJÅ€„Åü1˘«BÒ\Ñ1ÒR©üììTÕ”P‡Sb1§ôÛDã7Å˝üÉºVI5»ı@J¡Gá&à∫“ﬁ’ûÉ!Kπ5Ø£«?¢5Oè≈·JYHlq8êóﬁ´ó[U®90Åå)îÒ}∑[’yπ2+"ôÓª(ù‘ëO°⁄pAUÓ ¡ëBKì¨ŒZJ∫:≠Ut˜BJÍ˙˚VhE¬†∞Qv1 ¶FÔ–≤/û∞Æ‚∆j0ö§!Î}»Ÿ[U=ñtÈ1uÎáW‰ìJˇ'õ=gEa˘k“‰w{¢ ¨\á•©úó¿Ú†!QœÙæ0ÎFyº
„U…?Ê‘™e£H°)
{àfQî29(√zlRO@°TA†‹Ä∏¶°ôâÃ°¶ÎAu+	Œ≈™√Æyfg¶}2oh®£ö(j• C_KŸWuyô<üEõı
Mﬂ[#•Õ`Ë„+p≈ÆL°:YS^5Oxißsdùê˝*Üßà‘™π√âK2≤;cÌ6Uq9`m ›:”0Ò
œ6˜Á„i®8®°!ÇÑ
ëb˛˜	⁄øB"Ê]È ¢Ál€Ò£±CÊƒ∂x±›ÒmalJZâ""áXã;öQá
À√≈ípÅ‡Õ–Òíû—üÚS<YbïΩ?¡#<´hÓTq©Ω~kΩﬂﬁÓ|êS|ŸŒ¬äÔlªØ≥H@kpÕ¨cŒÕ	R:π∫”Ø◊˚¬À’Y•ˇkoıWV;;1oò¡ˇµæÚ¡ê?K¬njGV6^ÊTÏvlJ£{3Añï€´/¯?¶9Äa¸[WÃ?ldå≤ä¥·¯@g Ò#.0éé`™Ñí›=“°Mã–ØôOΩE∫ü›ﬂ;∫ ÷˜z»…ΩÁﬂr .gj"°¨™Ä¨≥@enO´D)k{πjM’ΩËä:ÆaÛa3ÀYf€∫rhº/Iä(T+0 *üÜÒó,ùºDÿ3ùÙ¬SGπ7<[ôÆ’+£Õ-û?πj¶HºãÕò=¨™ :?ë.ºØøQ≤ö2e?h¸ﬁ’√π›LN=ﬁ3 ®üAzô‰‘O˜rÍ^NïS¬‰÷æÅåzKı±•
)ãzj¸Z[A‘T6ÜJò*{≤ÃJZO¸1àÚ!ËâbÅﬁolP©ë∫VCoNó•-SıÈ˘€Ë…Õq`ÎWbF´&3√$ŸÈ(ÓÒ’ZÔUmÔ¬ÌÄ˛söﬂ‘∞|&ãex>”∆„}†m<Äcy6A√ZÎ'ö,lüG¥û
=úéxë¬|’Ñ∫Ω3L[9éßà·∏,ÿ∏0ïENêÒ.Åch⁄ïìQL¢‡YJâÇG+Î'˝L1lı∂g‘ÕZï≥äB:˘WﬁÀ|~*ﬂ’p~RZ˙ár2éÿ)Ë"‚6<q¶‚‚Oº˜Iäÿ4ÿO„ë¸Çª¸W.‰Aß_KdDÓ–4»¬´B0±Ò(i”	ˇÑs◊ûª$V©¢4u¿‚VﬂlH·$ÈId∏UMCLMÍFÇ¬Lt’ìËlN(˙Ø—Ω€f#…ß#·§â bñá≤Érµâ_£í’+BŸmu™pÂ“Ò	ä<çfyOÊ‰ öÊÛëπ∫H≥œî)ŒgÄVµ≠Í‰] F¨ˆqõˆ`[Âyjq@8ÚÊÉ\˙d‹†µΩ|ÑDh⁄ õ∏L’√V∑KhZ$6Ÿ2h©÷v7l‚˝¬Q´”∫≤#øÔ¥∑∑>Ë€ª—ÈB*ˇ,„	ëz&Ù¨$\Ø⁄Ú≈∞Ÿ∑¯‚T–¢F÷ŸÏ(lu™öP◊Çd0πRÚf
í¨†f˝Q√ûÑ˜“Ç ‹”¨˙ïK∑ΩíÑ≥êÑSÁ7Ê¡¥7:q≠fM≥^≥,î@JäªÒ¯W¡∆wöyãÆåCıMkª7v€xåÛjÏƒ¶§qµ›Tä‡—«"Ωp±2„u]Vó¿
âíÔ)Ï3¿r&Ùﬁ ›ôs_…B≈ÏL2ñp¥Cƒ*E
èoÒ≠¨oCˇkQ~,√∂Èa‘£+z≠æSw◊≈V}—⁄0ñ*†{ê\É‡=àçcúE8íßt˝ëÓ8}7ﬂﬁÕÂÀ·ŸË[ˆt˘≤B Tb1Ûó‚•˝,]Üﬂi≠8¢ o5ñ]Ê∞˜P!h9AY<È∆/Y∂±∑Ò4µÓ˙R”jè)'◊¢˜&∆;Ωfñp=™àÀ·èTabB„â;{rLì√Yu3∆2ïá√b'‡B§wmˇ^vîK –MÚ<≈ò´RJ|oﬂ<…Ø“^;}¿ç«î˙í_ >ªÊP∂U€©≤z‹då'„+Ó∏M∑f‹UîéÄ“º|ÌÊÍ`ûÊ¸IòD„?ƒp¬îÌ>∆ÆÀ÷ıò:¿^wgΩ,v∂1≥ïònÃ»ªGS˘x«Œ∆_ítzèèçoŒƒoé•sπ¸ﬁÊAP∏]…¥“pè˜_8ù~µpkÿ	ºË¿˙*K›¢q,øFY<LÁy|ù4SújwFâ£ãgÔ∑˜øãÌ˝I%áPêÃ»∑æπÔø Gß	çà
êãnÒTF®P˝‚Ñ"ÕÕ†µ†i^Â—óx∞œ∂Û⁄√7”ÂÔ˛Ôè·uÛö«uTß∂ÕÕ% µ˘ªÂˇ?Óø{y|Cnßq
ò¢;‡îÇîÆÖçÊúæ?'ì√4õE#øtXD>T$ƒ0éæ\∫ï'˘[I	’^ø·zSÑähõÜ%™¢•¥ƒªpª.§ÓÕìG¯*(Ìiq9`Ï&vÉõã›u “6y*‹ß∑%Ø…CÖV…ï„¢üH¢_ü=!˚áá~IÍFV[_’8.Öõ-ÌG%ç:KGµ
Ω_∂∫î§æ©&(ÛÏsìNÀ«˘	Õ√q{í^∏ÀcO£%û˜àñ¡Îi’y[]†âƒL√}#ıÈ¡mØ„Ç‹>Õ“çO±]f\yÓ1;ä`-—
ÖΩ†áÃ7†qÏˆàóŒﬂ	§ïû&—L‰c¨ÛOÀÚ–iG4˜é¥Ï.qÓTÀ·¨AÌ¢Õ˜ú.VIª›¶¸ÊN	ƒ˚å’ñ√ß^öîVB¡˚ﬂ2™ÒU±ïû8dÙ–,»!Ù¡â0öå.B•!ë·CUVj<¬(•∆°¯ûÒ î ∞fîàB‰∆4¬'öì˘‰¬||gT¿Ò<ÓÕJn°ô±õΩU“Ë∏««e¡§,u›ßÆÌÛxˆ4Ø?«Q÷\πn˝pm6È◊Ø`œÇP≈§¢ ÏVÆè•Ô~IÁYé_Ó»-ƒ~ıßP‚Ã÷,FÍ ’ΩàßK”bÛ9E°›∆IW+9gC∂∏t◊ IßÓëW=9©Íi˘€íœæËá:Õev}#ıvpb≤∆„ôÉ
@wπün‚Í±ÍH’˙•˛¥Úúˆ˛&ﬂå®äwìì!ü∆ü…¨í>åPI3^—E«\\â4Eéì®E°ÚÎQB}äß£Ù“ gÅf§*O’â¿·Wa±Në±Oáπ c€˝&#á\ò8–ÅπX.`L|[i`√íZ¬%@îı´ï
-à2Éà‡x2F*%Òrj÷Z®‹ÓAzv[@e:ñ¨ƒﬂ˚¨_9S#¢£™VRg@1˛ûFQdî@&qp@	X∏ÄØ?ıú§ws≤?P\∑.
*π»ƒ<Qﬁq±å¿ùÍÜ[&°tÚ
-ÄO”ã…ﬁUé˙ ~&†^¶ìsƒPW´Zaî˘ÈêÍ/µ£ùΩõÓ]ù"Ê|T„°ó1hﬂıû£c|6‘{äKRñ>©|Ñ~Ìî{≠.MN®Â&Ù°HÚIGΩnm}–Â∞Ùy∑fiÎ$#gY:ñÀ§I"9¢nöŒ≥Èà≈™€%†E JA∂_ªé°¥≠æ1û∂ø≤˙±C›v7ÒÆ"Âmwsku´w=Çª6‡.ëwCNå€Î√-¸ˇùvØ/›◊Rn·Ωò<óÂñ˘n1◊-Üû∞á™£‹d√Dìnm«Y6Œ2¶QIéÄ6≥5§gVƒvîƒ±ı6î>’àd6∂Më≥◊2ÖÎaS∏·ù¡^œ0É]ºmΩgü¡ö3≥^g€a⁄†åﬁ›F“T{’P*c¢,BC-‘…˙Ã`l8ÓJ∂-…∏EQﬂûcæ±wEEºÉtÁ`9)QÑhRY©©ÜMŸ÷¯¡Dâ—≈ÄE	™$º÷®ÖWN“ò©ªÇ7U÷∑ä,µÔZ˙.ı∏Á†oè÷Âæ∑1¨∆,oæ7ZsÙ¡
≈˘ú6;ñQ◊.€Ω]}˚á´'Û—g`"&xê§˘‡Èπ±qM.P/ß y°á2ÊCÌ‘∫¶ñ·’±ıD/∫•Y◊ﬁÙ0Qó-Cù-π\ƒvŸØ®Ó}WæNª+3T@^È$∞ìgìYvÈW§—´sÙoÛ(+¥ÈÕkªRøg1Nì<%X‡t gŒ—gÚf3 Õ©§a cÑ˜W‡ˇWHRo¶Nß®7Ê©JY&ñí…‰Ò8ô$‰`ÕN“#5ñÿÑãÇdbLk¬bq–$ùÊñó2∫ÄˇÉ2"t´<Dè˚{Ã>8ßk#ﬁŒ¯+µŒÈ+µNŸ+µNf∂p˙Äà˚PáIÑµ∏»yê‰|R1P»j/ŸıBæ±Y¥a∑±a@{yõÀS"$#,Sà«j∫´ön3Ü*ÔA¡À5µxMfﬁP©/8èïï±€}â∏Óı˝õÍ˚Ï∫◊˙MZ?gG†OE!’…Ÿ≤9a”X7∆B›vg„◊cl6mæÒÚdø˝Bl"∆aXlÃ∏Òé.«'¿Û÷îÒ§˜÷2é’∫≤‰†¢sÖ1zKIH’u†;Ïo˚+¨â⁄â„E!!Æ∞≠ö≥±±"gF`)ZÂK„¡{Xﬁ¡ÂX∞OœÎ…Ñ%çéÁé:ïπR’|çW/D}ıakTÛu˚KU€tÇ
S—A2°¡’ºM∫{qßñ^*CvI	ˇ£~„±ºRG±Î»]+ùÒw”PÄFUKπG‡¯—·≤Êª≈ı=Ñ5IÁ3Ú∂Óhr™˘E2¢©õ"®nôÉÓ|Çy.˛êE”arj^}M§Ÿ076»™•VeŒ7€ÔlQ–eAz<WRI|Õ≠õT8ˆ37Òw˚cöú∆†vÕ3∑º¢G˙T=CŸökæP˚÷ïn∫Ç≠Aç“sÎî∏¬Ç{≈π ‰÷˙:ï~_Û¸¿
Å‰c˙aõ~¿!	$Ûi≥€È|. I∑ÚAŸÍ|~(‚=ö*ßà/VÍw° “ÔË"rõe6\ÔUÖn÷H]_`≤µ¨$!—Àπ¸◊˛ØˆËeæ·Û4è“°ﬁ’úú†§“‘∫öÛgª,	 Ôem÷™[Xe"
.Ò)‚fPŒ¢dƒr€–D2)9”ì 8
—∏(€B¢-A£úD7IYØaF£™ã˘)§Óâ-í≤W[Q„rzíﬁÇ—À%t<Î¿›⁄·àtπé”©®=ÁY-ú}a!ÎïÚqEËΩË\®t™cÿô;=(ÏKaØ7s—zÚH)9©ûAg¸ZÆ¶|ÌÛ3(æ˛êjM¥éTé∞ªæΩ∫çåMÆı’ ø^Q¡7•1ú≥„M+ºÎONº;\ØÙ˛5˜MÀey`-NG…¥Ö?Ë£⁄÷˘∫»ÇèØÖ_ª«Lƒig?œìt O§›µ·∫o¬À"ñ^p÷Å”ÙYE˝îe/Ú›‘ëdP≠.·Ä6˘:$§HKCìêçF…9µ≥Éá˜Ò†2ƒÌπ√[3"xÕ=B*§AH^R~’-S J+WY_≈yù#“◊øÑAâ ﬁ∏àGßÈÿµÊWñR¯8ƒ>87øfZ˛KÚ ÿ˘3«®zDìht˘[L.”9·”a<òè‚UDçºf‹>oü…√c¥£<ƒ‚Î”Ò *I≥¢NÚ%∆îúÙ¡ìKfsié.« a∆”	IÎ–õ8ﬁçºf]◊åéd{z6Ê∫—£ÂJvˆ"Ûí3 Scû'”Ÿ“%íØòC≠Çk‹íˆ6~@'å3ß>Ás)D[s°Ä¢!"\@‘îãúÉŸÉ5√‚E [’jDÀ°ŒJΩ≈ÛR£’®πßú©z¶dΩˆBµAtΩ]≥FâÆÇs%”aı`À¸`îBÀ¬’xài=]œyÁ˛ò¶˜“]õvÁÂ˜˛ÌŸΩiN8j!O“ØÃ ˆd˙#ûWË*’:(1sü©‹cı»R<ÍÍTbπgY√ÒU62ﬁ∫4£™*>ÈáA√É∫’tO¬vÎ®ùåÈ”¿\ıSJÀ#Ìk·∆\ºõN”v1Iÿ¨õ;UGFçY˚ˇÎø˛èˇ˚˛)ﬂ4ò/¯V‰ﬂÊqvŸn∑…—4é>ìIzÒ‡∂&t=,Æ∆”…—¸dúÃÚﬁ”+nO3ö‚ò„áº;ü≈ìÅ™èztˇ ˝‹ﬁÄ{_N&”πÁÏò≈g{Ç-^‡Ìo„3èé≈∂r$ è Ú%ÕcµuO”∞˜√,ü«≈ñ ?}‘‚Yîù«≥6m€W¿h
AzƒŸ^…ê/SÍCC?g'9◊»·k†fÍ”Deùˇ¬ﬂyßPπAe˚!˘+·∫7˚åèzF4Hr
›©«Û ÊN®dßë˙ÅÌÖ|dì`G6:—8ö2@ÿK$mBöT© ß!ô0˚JÌk£∏ï:ïªÚáÚ¨!¨A3J?£k‹[ºÎ7‹p©§&îi∞…Uõú‹‚Ÿÿ∂{¸l”wÅd)‚ﬂ”më§ä‘Ÿ"C¯?'∞†Lf£¶Çä—ÌüËz?† ùe˙¸[f<ßÍOU LÙ¸+M?Q-£˛ˆwÃ∆y5S¨Q)•oúë}uÍò¶Ì†±∆âo
yxr…xƒ-Â|JòΩﬂ›W…Èõ≥3°≥”™–7~≠|Á—⁄<πeÿ(∞– ’`èôñœÔ9m‹≥Tvﬁ√™µ‰ù≥œq”∑„)ˆXŒí^|+ÉÿJQø<6÷ä¥U– &6/æ3§áJ,«˛í63'åÆêÄ√¬ˇ™∞7±°Ï“fdÚº°AewU›õúè/R ÓÛÛ8g∞båj√˜ƒ0á('G√4õù¬&˜bBΩÑF]ë_Än3<cVÎÑ»›Wœ'Î<¡3¸WÑõv¬ÏkHd5wª_:øù∏BÒé“#S©?Ì9Ò	çÂ¸Ò9u-•«ê∞kŒâÕØ!jÁç§ß¨ñ0∑®™ö'nM» ∑»ähuùœÜ£WÌÉ‘Bñ_ÎÈ´±œçÈ≥t]>Ã{:%˚”tr/3C@RËq°4K/<=€™uÁ(9`+GcÑmîª»ãq˘W+=;CÑQØ 5¿BñÌ£IáuQ˝y›hƒ∂˚ Mf@äF° «Öè£∫cÿPQAFô
)aDUò^èrEhdÛ…)à´∆„P*˙ë—éü±◊¢Â∞="ßYíf4JÌ<ﬂ˚[‚˘_·3¡úÒ%B[1¶wa≥t…=aåﬂ1ì]2éë¥s∂∂?ﬂ3˛˜»¯»Îw¿ˆ2!·°G#¢	…‘s#÷Pﬁéh…7‘|7y3ü°ab?ã#Ø~&[ıX{h÷3XáX¡ÆRx…kt!ˆ°Ö∏*åÏ10%à¸‘Ìu
#¥OO£æ˚ˆ8ö6õ„¸‹/eX∏TíøÀÅ˜<”F˜;Ÿ€€#ç9|ŸpÚqœÊŸƒml˜˚ÿı9æ‹ª¬ÓìÅ◊Ò]	.‘[1©]C›Ó¸”uA_É|‚—Yå7ÒØÒàÆ=Å”ü©ëáﬂ@ˇ∂«^àÀè∞	òıÕ–ü$:À¢PÑ q—<ãÇ¶¸ñºÿåÑ‹)6é0≠MÂÄ˚»|¿ù!([:Ss∫lÙÀTπ“`Ô¡kGç•-˜ô≠?Ï∆Æõöç
,e∑ |Üè&®ÇhµÉË(√ﬁﬂ∫»¢i„1eŸµµåèr˘Ô†Â0ø∆pº⁄a%	aeÊ'-4G˘Ï3º	¥hÍ«â·kûùú<&ØgÆòÌ<∆≠y:c¿7c‘:UÓõJu≠µõNF)‹=>a@ø}>«bJvÇkÆπf2æ\ïÙ+ÙA[L.∏he«2k-∆‚5ï¸˝Å/Da®2ªm,ƒ`î⁄•{3s]kíC‡ÇÂµ‚3÷k“ﬂZXK62.ñ-á£ãé‰Ï€ëú!zePpÀ¯s:ß[*s5Æ…øˇóˇMÆ
j∑“û•òsDìiÚdëÔ?¨í+PªÁŸyÿk¡˛êÃÆ¢Ç }EÆC¶o)xQ◊©Ê⁄úïXÃöá\2J}(|ŸÑ/¨’uQ!™ëYﬂ©	F˜a6Õπ-‘ÕXÆpéÍé∫1[≥PÜ˙›ót÷{Êt·‚çs8$ÕLrµ+*NÆ*Ìüxai∑€ﬂ›lg˜ä∆˛∞Toc|üY#SˆúÑ∂Sv®i»fª„ÿÍ≠â6*±'ﬁ¬U¡∞˝È»€©ÇLX∂tÔ∑É Wê∏Üu√¢^ˇ^®3ø^¡â≈0¨!XÎ‚KN4j§+3ÀV5ÔÊ£“˙U¯ˇ|V…Y7ómIbÂ!ÀF†≈Ïâá‰Y^ ÃÍd7^éSBJæ∆õ±oÿ’Á±t±î˝7cb‡™–∑2dÈâmhEvÒ…LÚ¡‹ab
cæ]5c5'±≈2ÿîeŸ›Iwãúr%+Ÿ=Ô,9Zˆ.Z∂dÿŒ»ÊTa7Ãv˚Y¬,Fπn;ÕŒ≈Û√ö ∑õ8vI)qã≥ÒòÁ≥◊ÉS0µÖXeaˇv˚Ìçp<˘/iñ¸„éFı*°€$ê>CWü™É{äÃÂ‰´í›Võ/j^)Ú˛®˙f•Ób≠ÏŒ^À∫<FhG)]…R r∞2'¨∞y_¥ ª•Ãªñ*Ã®Xf)†–{ô—°ﬂìí1tîd=öVSIÊ¥ﬁ””1lâÑaï‡eÏâñxa<∞⁄Æ›’·´	,†?wy¯õ÷á∑àˇ*ƒ3AKÛd⁄‘à©Ì¿Á—ÿk‰S©óO∏ß®Siîå.È¯…s∂œí†Ê{ùµ4›ﬂﬁﬂŒ„öôê∑Ã⁄I~Lôqñ135˝n4z]˙˚GS.≠=¢D@íød7≤ˆê›YÌÜ˚ﬂ&†XD£#:pZEË-∫ôª9µÑ≠5¶∞‘ì«Xé…U©áç¥}ñfœ¢”!ò;ŸÖ÷Û{xç¡|’l;ç]Ó8Ô&8:KE€MΩ3OH*¨X®W0ı˛Å5^ˆS◊mWH	»+Æ•U≠ü‰eóMøC'ë3ÑÿÎ+~¶-9QàSßYÕ£∆®%¯˚ =π]i¶>˛¯RõCÁ∏‚ß
Á
Á„î<jINF±k Ó„ûz˝˜.¨éÎ∑ â] Q†È”É=Z5ÊEπÙﬂÅ<?Ä1gá|Çn.÷ïÊÓE˚]àv‡±|ËêÏÔˇÒlc˝¨¯=»uJO Z£Û¸n;KQbHˇˆ§;√â¢Õü9,§ì√Ä~œÉÙ≤B f≥Ü—á6y∑|Xí=ozJ∑≈åòP*c6XDÇ£uéƒÈ∞ÚóQ®^'∑w+u‘√˘ò=≥?¯%==‚∫+/j´˛!]uKÇJ]!¨ÄJ˝Ù√«w(%8ï™†;iMN˘∆≤,gı÷Oae„˘K≥’
”:»-:ÛÓ\Ùë%J?rÉäû˙ÕmÒ†z›Á~´/
…r•·˛Ä ¡ÖΩËÕ€íáº†!C€'BMõ>ŸÏq‚˚Àπ€‰È“+£◊ê}LâyO≥ÀÁæùèP¢|ó5tÎÒÚ∏x°¬πuúX_8˛Œ¬˘x.^&¥B(±‹ëFÛ6é`ﬂôê¡Â$'ß4‹jDkuﬁöZsß|*ôíXB–EmIÖÂÊÜ∂•e[w*ÔV√∆≥∞ë«mÂ°·`âé”'¿£Ù|1èº⁄ESÅ V]UÎ^<óC<ßyÑ(…•_E„ì8£`ﬂÖ`¶˛ÃYJé¢/Ò‡éƒ2ÕJÅ±|8L‘6øó»˜˘$ÚS†πeàclÁ^ﬂ°,6=π‹™ø;iåvG¬¯Æ´8E¡€ì«wgäN¥h˚Oî]NNÔ}hwaøüeq><∏XöZu◊~4NRiÍn<iáÛ|H~$áHStæπ+≠∆É»ºΩ4=™ﬁ£ﬂ°~∆‘c$U»ßzΩˇ«ÿ?~ÒÊ59~ÒÏ-9ﬁrDé˛|t¸ÏïLe-·ÀÅùõπß’Q˘v>Zƒ'Ô¿øõ-—Jp√À<9EõM<ç¶ù–‹( Õhói}IŒŸOøQpñé·~–¿ÄV.y9OÔß&6´Vﬂ°¬Çá Æ?b)/æ≤îòˆÇPçe_‰*1X˜•Ñv¶ o„*àDíªMïﬂ*f…TbÔ{=	´&,ËÛDﬂZ}/6ªQ≠b÷geÃzc…QZ®îJN≠¨›»à†ΩπBÕ|
/juKYäÃcä#NP∞-—å©~≥wìcW a⁄jö—öl1ò6ü¿«◊◊˙∏ı¥ òzÛ´–Ïﬁrh©\∫SJ™¸¡?“ÂçuR"A)Y-◊Jâ‰ÌÕ5BU;·ó$æÄÌüá_Ûy5aúi<*≈ñ≠i*KÇﬁ≈z´TKÀõÛz–¸«∆a¡&m/b¨ÜßÔ‘∫»Æƒá®õÓ*áõ9ö‡ <ü¿<¶jLXã©RfTJÖ{öR¨¨¿‹Éô€Ë¿Ãm≠vW>4*)WM˚ó≤œËºû”ÿ∑%p˚íY} Gû{F_6£”YΩgs7õáÒ8õ Ôú√i˜ep8mhπNõ`Òa}πºÁ@g≥˙}≤xy¨˚>òùñmbv>´ﬂ9∑ÔBø8#ãnÔ∑Îe3s1≥ﬂ'?\|\¿πú—ÔéóÉèöKM.{5.©Éß~ΩˇÍ≈y˛ÚÕ˛Òã◊ Øﬁ<›Iûæÿ˘ÊG“çÏ˚Œ9z˜‰xˇËüè»·õ√7Ôé…Ø/^?}Û+i<{}¸ÏÌ≥ß‰Gr¸Ê∞ıüV$õÕUSóÃ—∆¯„h~Ç'Ü%{‰Õ…øÇ¸hé/Ûf¸÷ ÊZπg•}SﬁLÿ¶Òé˜…@∆ùZzÉæL#¯π?B'"s@	ƒp˚
êÙ°Ï-9#Õï;WDbSıfmå3À∞Ùw…ŸO9¬π√¥-æ√Ô?ËO>“†^|FnB¯Zs,.≈&Ò<ãzc”,=«⁄á 5„jkRr∆ü…´h6lSñi6µA¨ô¬!›NÁµ£˜;â/é1)ãÈÅ/Ú˜t–?
/ﬂh¸á–ﬂë
GbÇˆHuÀ„Ÿ3)5ØdÍu•Âh Ó76KâÅõóî Ôr|Z£,ß!fÙè◊‹ç^FìÛytN»Mµ•UxScˆË4ÀW™-≤iB?µ"kh]ò˚èÚ_ xÛölœRéê^ﬂ\Aí gb¢∑W‘∫¥4ﬂ∆qõ~¬©◊∆ß<R,˛°Ó(Ω¡±‹ﬁò6árÿ0®˜äm∏∏_|·xfîû™œà/œ†?·<Õ.ãgƒÆg§)üìæ¥>{]]æ˘aHÔ€Ì∂Ã,´|i?»1Ï}H{ìs∆™hL°†˙◊*'51A<M˝yE†O¸¥J
ˆ≤iêÎ•µ9‹o”˘¨"ÒÀóé°ïq‡≠†8èAÄ ˇŸ(∆?ü\œ}£Ô±w∂¯K∑hyØ÷W|$|>2öhy•¢üä_⁄TU◊·πÚF|ΩJ˙'«œ“ÛÛQ,1=Ò≈ Îx!ﬂT^[_IE‰a∆’Tü*|¯Al<¥ãÍkÒ-ÖÆ‹≤*Ûÿ|ºD∆\€_πhûêÔRÅ$uâ´:q¨Ëﬁr&NlXlÓ¯L=(fjπ?•˘‹g«Èq–¿YáÚCe˙¯™ΩÒÍ	l§ˇ_“‹a–iå8$–⁄›IeÉgX»a˜ó„W/)mszºJ@qâø¢ZÇ~b„ñ£z≈tﬁg¥ñ®N[æBb{˘:‰e√üt∏∞uÅ©Q:.Y*É¨ÚO˘÷W“gr%@Z◊—ê¬æö„Mh‚5¶x$o·AhiE≠\Ä∂Ò˙‡ØÒÖŸS—S€⁄ „¸≥âßz(∆bJïå9"„N2!òtˇ-æ]Ì‡+@¬®çUˇ§∑·‡å^’c˙]uQà™≠Uc)TŸ• J‘Ûù)±Ru⁄OÅïÙCß4ÎòüÜ˝)~Ê—9N%˚˚Îà2©iÈÇJ◊Ô:‹_Tn&ÉA¨g5ö∂˙b°x!á≠≠/√“¡≤◊ás%w¯+RÒØ|ê◊∑îû˙iπ6É˝b¿‹ûß^_·∏çy/Åb"Ê¿◊´€UŸp>˝%∂§'ˆgA”ìØNOhvæEÍ`á•\Îï)◊å ô* ÅUÏìÛûÀŒ¸Æû£R˙m›ïoV‘Ë≥EÌöa*4¯Ì8§BÙË∑™Ùs¸k2ò˜Æ‡-ıÓ¨‡óz ¢›·z5!€X1∆	;€a%≤Ì…≤&V∏KâYúÌ®u”ù3 Ø2f¢/QF"πVGph∆^uT´¯ÈZv˛ÍJ='_Ø]Œ…◊i{E«ÏÆ◊-øa_R}w9iò(≈c¡´háVrä‡T,Å5y∞j!Ï‡˜°* ”´rLÈg©¶e!R[ÇÈdÃNæra3˝ŸÖ!™Ïmft†ñ÷ç# â∫÷TÕïºrN_‹Ô5¯‚ñî$v5[Vı
≤R5õﬂögÂΩ±¥}°Àì©-µÆô¨xCFö∞#ÛÓfÂ ºÑéµ—•]e)n4Á46'|fwˇ$6ãMÎ÷`õa#?öπë¢πÒOìB`íuˆ:/0†NÛä‘“•£øH◊√‹¿ößSÄh®:]f1c(=∞9‡w »Õûœ.±,Ùπ¿›}á|˙·J≥œ^ˇ”'3⁄∞–∆≈¨Ü^”Öd‡Hz(Ü”.≠u  tÄñß÷sËªÍ9»ﬁº"Eˇã‹Â'LöûyèﬂVΩ}&Ö˘¨¢s—‚;F≤`Ò=t≥iﬁáwáï¡a%+Óñ‘t•R^ﬂV>ôÉ®Œ‚ËsÎÊ+7åùä©<®.>hÅ
2=ó`›(g£ö0µ'*£«ˆ‰&ïU,µ3M√Æ™^Ë
f[ß§∂Ÿ≤û]!ª¬bÖK5R⁄RË¬Æx`ìPòØúà"†òˆMË4îœªfAÍﬂæ0ƒáø=º≥T7\º¥Té3‰≠ï „ñc>]f›f∏nVF—~yMëÌwSÌEó8wÖC¢÷‹ïäüV,'d⁄D$åõNƒ¿ñÆ5’ã‚$xú¶#≥ä±ÄÕ·“w@*√Û«Î∞{q	”˘*iOÖ+·{êÈÉóO+
D„ë¶™7ïj-b⁄#0#ÕÜ9òÃ®Œ8gø8*Ωˇ«ﬁ”ßOûê’Ò‚K‘-'DÒúD59.ÉLVÇ Å™x†g8SUß⁄®Ü>OFÒ·h.ßxC√%üMfŸ•ÅÃ™ªÉâ b∂bêûï|ÂÁßB1C5õW¢›¢K°W¨ùfX<ÏíŒméh“úvålÀa]ºvÌñEÊ™<@RGı)XK⁄5yZ¬êπì*†3v’í¬ú»˛´Ω o_?™oóµ2|«Û'ø∫6Qæ2ˆ–ìS ¨ì&bß+˜å:JÙ©¡§p–⁄–∑3Ø’µ8lh«≥:°·™÷q£ Ïï¬â/q˘Ö¥Al+%R‹ÌÓ∏ÍºÙ4Ç*z[$F]ÿÆ‘∑Ü£q‘…D|G£hÈw≈]ç˙ÅÔZ7àÿ£°B,v4´˜∆usW^æ‰c∂«Ã√Öñ‡î¬≠„™˜< ô“±î… à9ÃôÍÆ#Ã……ïzÔK4öÛµ¥!ÀòuMŒ·ˆ&<êb“ä`H¥˛Ä˛Ãë´~ùëk ¶‹ôvb`å~9Û/¶Ó¶/|d&~3€Rh.Ga(T9§∏TŒµ4‘9ùœ∫ KÍ†„z«hç`œ¥–\a\`.Oñ«íç 6:êŸÑ˘P´Î`:h∏G#¿ÒeÏ†a˘r1É#˝™A/&4lô„ÚÑ—zùÁk'—‡<6)CRtüí±i¯Y∆ù±IT±aå·˛≠Ypä∑µÊp6õÊ?Ô¸eÌ/kÔˇÛ_Ú?˝ı‚‚‚/mˆ˜ ⁄y“û≈˘¨|jee≈W‚’cÒaä/´7•5„€_ãÇDrVÌﬁùäÚ™x≥Ää›ï„TBó¢U›µ´ın$Ôù©Úçl‘”çHSI–i%åÍÀ"Òíﬁ˙¡!Y=ç\)Ùu∑≥ZÊ§–RŒ©¸nﬂj.˝¶(©œõÃ%Ø€´÷~$≥ñaÍÑY*`
UK‘&:˝´˘˜m=yæˇ!® z’∆°ô∆¯)MôÀ¿íÈÀZBEú~√eî´÷¿:JŸññ∞êÔr<èÿóQÍ|˘)œË7\L#Ç∏z1M§/ñ∫~óçr¶M≤˝ÔÁ6˝°∞sz4Hé‰ó˙±tò/~´Ù8≥UÃ≥Ëü/_Éﬁµ@àfÒº&<Lk‹_ƒŸ»·ÊJõVZœMf√fﬁØ›X’Î}˜ùµµÆ‡âÎO†N¡øæPgdê‰”Qt˘2:âG¨Gˇs≥Ï2‡Mä3@6zsÚØ<˝˚ª∑/õ¯rﬁ≈¿´:6h®=LÛŸh∫ù≈ÎiÃ'bïXâÍuçòˇ”!i∆Y∂BÆ|˚éÍiªv£Äõ∏
I¬ﬂ9^8]{W¯ﬂ∞˚sØÒvÒ…góﬁ\^Y<⁄kL“tO@MRËS+Z ˙U?hª“•·◊-¢[õ¸}œÊŒ°DÜ~q+…'Z¨ñ3e»¯Â:^ª/ì…Á¿\ÚÜ∞'–g©ÿæí9+P‚”ß◊"ˇm^&tßØƒﬂ›Ù‚…2o}÷ÒúYFCó˘0õ!ﬁ7ÿÍ‹‰
Q#íû~ﬂ˘‡{Êv∑≤ ÈÏë °‚µéX]LúﬁXåö¡i≤Pî¸a‚ÎıéE2Z°jy∞©›=rçÔ·%ú>a@≥29…“ã‹=û*œæ¬0&—eß∞Ø£¶ãf\– u.Åv+æ%ú©é/E¶six	SPçja	%˚€Ä#{öØªƒ„+Ÿuÿﬂ˜3 °w”∑‘Úπ–˙˚∑≤íJD›¢+YÿaÂÖÃ“\Ü¨¬2“oñΩàOÈﬂÚGKˆ§%[pÅÏÅÊV”\˘¬eEÜÃZ’&Ñ@[®dç∞d~+bº.[èTØrO˜*`™
ˇg·cV≤•''·‡ø¿î^ßj≥`≈ƒ#„j±-SJ_ßÖìà\∆≥6Ÿÿ	h©ÈI32œc	Ò¿Æπ⁄µl∞$∞w·†^8ò«ãÖ†F,sÒtÜàXé©“‰rJ.Cg‘§Id∏ΩÑ‹;»„˝Mœ|Çı£Õ©Éœƒk&ßõYs
w-/_‡kyïôl˜òÜmt$RK≈ê÷‘ÿk»§#?oìî¨˚¿ÒË≈ÀH∑?&—åÙ¶„ò3”Íÿ=“√≥FÆÈØ∏eÄ
äQ¢T (%JYzIh1ü]y[ø	ïn›=É°jÂry†cbä6Ã}õf›F~ˇÍƒz5‡L≠nßE”®9¯ÉuÂS€}”ΩÈ ∫—•§2€–¥!€V[1-ã»äÒ3⁄`ªÅìX©FÂ}åÚû\¿j‡F¿¬®M°%':ë .n¬Lä¸ÿ"[a
9∆£x√Ñc=ÎóéseÅÊ+çª≥'¶C≥CB7:Ø«±u–ÑV©ùı>Ã»ŸÇ}\®YßQ¬ñÏ™‚+ÊIwi£=D∑~fUù!§vÏ,ª±døM”ÁçêY4Ω¨X¿àxπ’Ecÿ»ö˙∫ˆøˇœˇæ\’∫V¿i!	ÀÙnŸ8≤É™ﬁL§(C,J ¢ßMûgqåŒzû∫#'Qƒ.¥8∆˜WtﬂØ|µJ√ÛÒ¿ÚzñZT3C-˙∞ô∞kög“Ú;W≥NTP¥ÌÑgVπtD5˛dkAVDÆòÆT™›Mä˚‡sâ™«_&T=y2øQbîí£Ë,æà.˘/XÚƒ2úz≤‰sB'wΩÉb«
˜´ÜÚâÙé†á(,v¨£OG¡ç›Äò™Heí≈∏'ä{`(9ÏŸ ≥ô¡nuo;=ågT°ÛÂpö B¡hòqßç‘˘∂ÛÈ(ô5ô4V®tÑççDz4ë€á[FÄ:Ï÷r˛4Ë	;•ù≥Ê√ÂqØÜ&`√∂\i◊ÙKdhröoûéMø,ÈŸËË›Fbgí∂j7·I€Ùkë$n˙µHR∑ /ê‰≠“∆¬IﬂÙÀQNŒÂÛßã√”u¡∑ÃM°≤v&¯Gÿª”ãÀä›≠ìÈŸO=ˆÈ·BÚWk€ñØ«Ì¬vö]∏æ◊ƒxƒD√[ øM[záôlVƒ¯Xßñ∑ÏÕ≈°˚óìﬂãYF>j°5è™¡êz`·Ö¨∑—‰4’^ wNıKm+˜h_|≈U¸√∑K:‹›!òqòºx}ÙÏ--gı#yˆÙ≈1y˛Ê≠\…Í*¶h‰PŒÒª¥å]yzJrÙÓâõ•s“_ö«Ör#j‚¡]¢~êXeHãœ·—Ñ/‰‘‰◊“h§A”"¸LÙﬂgçz·åˆ:æ`Æ™r)Ü4C÷>≠{ïÔ…
CpMÔ3≥§ãΩ˙L…~Ú: 2öç'ëo>à*ﬂ˘ìΩ[*VÑµ1•"˙πÄˇK>(-ß†Â'á‚Ñià|®æ†ÅYGn≤‹^j¨9&FÔ´—Í=YIœñ¶öG|´»#æπµ∫’_Ìm<ZÌ¥◊Wår^˘‚	På'°≈ì∞ó ¶˝§òöò∫ÍL·ººyM©ˇÕÛÁçk“§DÜé[’∑‚À~öÀÁQ\ÿ"{≤7…“£û@œ¶s‡‰ÜRÇfËä=”,no¿TLµzûøÑMmúTéÒA9™–v/¬—%H∆¶ß°Ü˜…`È,,Ìë¶$SÓ∏ıR—∏Ã†î®Ák3jCÂ…“å‘◊8ägÑÖêòxZInæyôû~f¶¨ÊMö8Ì+7ù`éâ»*áuÊäƒ¶LÊA3¡(˚Å¡ƒlSú‹*S¿I<ãˇmÁ3ÊbßáWi$´Ü\ÂÂU›˘å∑Èª°…›e¯÷†è/B˙ê∞…@ö*JÅÀﬁ»∞n 7Ù*È˘
Ñ√zÁ˚`âÍ≤´∞âŸ0…â…ücPU†Ñâ∏y≥∆Õˆo3âÎ
Âçıé@’k	Ú≥‘˛µ¡Ê˜/"ãÅ⁄$;Mîâ˜<O~·«Z7&∂käÖg;g0∑»⁄á;tø«’WìâZˆG‹˙N©O GÄL¬NUëQUπI/1‡]°§†ù*≈ñﬂò –‹éå@Ù\a≤G‰LnˆpDE”Q◊Éfr„†#9§µQ≠øêf8u]#∫µ…1·/œŒ)&ØîõÍ1BQql!+æ~û–Å= ˙¶îh∆Sh«^¥\[ßü’Ïh∞R§HæµG6CÍY
Ô  [÷˙—π≠´ù•DGÍ<ácMÀKâ£MØÁ˛ˇNª≥Ö’åi•c=¡5{Ùïœ<˝Í{ÆßqCá•‘{ııéñ¿”Ù⁄ı^€˛÷ùMı¥w˝©J∞I]R-≥"-D©À§A:åì—úg¨É!≤.ñ$$?tZNƒf’÷õàÔèjô∂ëÌ¢D´Ìûw@√∆EÍˇMSÎ^˘˚£ÀoËîY…ÊUá,eÙ¿Ω\Ωó´K§ﬂ™‚Áã¬8 +ÁùÃì— èS Mï‡8~ÄzﬁOS≠6ˆ„8∂’f√ﬂü
ïrèÍ.«˚§olu€æó¸ì6ûŒ!£'àÏ„íæ1›ª[Ç|+˝B©∆∂¢Ãß1í–é¨,ä©ê¢|åñjºÇ——>≤ÙC0(vJ,çÏ‰I4¡∏¡çûSÃÃXxòÖ˙#NktI–¡5AÙªl°IBbÓ°1d∂t3*VöBKlpC‡YÙ%ÕÄ)ƒ
Ê{WïØå¿lj≥w•|4Ü-»^¶Ω+Â£Ò~A‚{W≈ü¶˚∞¥]y´¸…÷ÍS‡w÷(˛Âhì›(}∞ès\sÏÂX§˘^ô?˘8Èvƒä¥/l=à≈e=ºt§@Êñh_ÿzêeÎE˛∆—ì˙†·K«≥˚≥Yªúﬂÿ∆yò%HÓólå‚ì£èÚÌ+}HRè”âÙçã^î_∫{§¬SÓê~·Ìè?V˝Æ˙d≈˛dÆH*J&¨¡dFˆAs€ëDñy^Èô'ßÙo¬ÄQi∆„G≥9åŒì	ÖP˝1âM·\Ù—Y÷åûà†ê$eπÕÚG”¬ÙªΩ+ˆØi‚—,zûƒ£¡¶w›ªR?/O∞qk+~`f/j<¸>XØÓVêNˆµß&¶ÜÒã=Pn'ì”—|ÁÏQ{‡ò	Çß¥¥J∞+ÙÓ#ÃÇ<ÿºÈ€Â¿0Gó˘,≈3tÏÂ«È¡(ùöWÍ\Ì√≤aÉ#’Ó76—√ã]ÃÒÄı >9z(–æ∏õ≠sQÖårUŸStCU⁄-ô
üÆ«Sï∆VÒå‡d´Á˙#7b≠  ñÃ^ªª¯∑“É^ß3TÃä?mÛ[ÂOvÜ#∆®A|ÒÖìÌ•«™ﬂŸzc7ƒì”¯9rLN˘Ñ~¿‚µ—ƒ5Ö∆÷Ïø9L'ËÙ√ÁÍ9hM:a'pUü:AÕ¢KYŒ€E03=qó!9¥l/ ∞ﬁ±VmAÕÒ◊aj…Â´wzû%Çˇ¡(…ºıûVaÌûe¬ãVÓRá¶!Ù≠ª∞S≥¨ﬁj√ÓòG≥Fás£Í "o§cñÈL?@´ƒÎ¯BVtX˝e”z◊zı=•	hcÃ€‡∏£ªQhÀKäæs©òÂ%óFn”.|¸'Ò≈«èéDÂ≈¡2¶imŒ≤πΩU^◊$çı§+Í⁄¯˚r˛ÓL≥Æ`Å%üë˚ô¢<-åqt:å—x…-Í?ìáp˚¸$—C
H~ËÇ'çT:•¡Gå|ç«Ø—»ﬂ|7ÅA&Á–7v◊ÿ-ûLŸ:·°NˇéáÀô~"êå∞Û˛l;–XZÙ¶ØæjïS<Wû¡ôB≈kP≠a§u4ãæ≥Í¨–t¨ß÷ä1J˜¸›i¶Œ”k1ß!/m¥A*çáΩõÁÂ4Jî% „ühÚå@Pø›Èzwç1ûÎûÔû|}π∏ÿñëã]¡Å±‚‚FÒòûl,/„œXãõàh∆5YÏ«Y´::ß-É7Ëà$,Ø˙¶˘Z¢ôCΩjÜ*cÇ˝ˆiùßQ>kRú›Ä¸•ÅÒªb1~"çø4óÆº9&"ŒÁßßqûÂ#ˆÌ¶æ*)ﬂ‘ò≈i)/¢T‰<êvÄ˛F0≠ÑÈ◊ÀjÉ’OÕûèyP
√=ÚÂ–Öãe]‹ÈMx.„%7º˘v}…Òr'πê`·Ú´yÈ÷'kÊU†∂
Z_˙zΩZ¡’Åw].π•≈MsçπYU Y\]ƒ¥˛Zé%O~QŸ8ì„y˚[≤O1´–*Tr¶9y⁄ˇçjû∆XÚ9≠˝Ù‚nSI”¶öqﬁúã≠º§”Kâ”t˜ËÀÉóõdnSPÑ’f(ïúÍ™9íí¢¿∏º8˜äê~˘Sœõé˝bovﬁ'∂(÷‡⁄•\Ak≈¿¬w1ÜùF<™5‚à	J_ñ›lkrÔ.∞_›h+πcŸÒ;°A÷í⁄NEÂóﬂëGÇ]7U&Ã”‰À£l5øG≥Ôﬂ˛.Eá,`~èfK∞ø;˚ÜªΩøûh2Ä∑°ﬁ¬tx-™„≤º¿víÛ+#!:ùd1¥bRÿeHggÜß8S⁄2àOÄ	O„W˘ﬁ’f«’_XFav’Ã+ÃÆÏ¬Ï2˚÷úÖJ≠ø9õ¢ÿR8)K∆“?<HœŒ‚ò%Ú€«c0Î˙tL÷;„á+ˆïñÙ]=êŒ6[
E•J<˘˛• ΩzÒ‰÷‹z≈aèñÕ«;Ù√$•π$⁄∞Uf/óë?‰àöçıRCÈ(	≠ﬂw{}W˜'Q&≥P]vm∂ËO2c⁄qIÇçæÒ_ˇJN≥íÈà*êRu¶µœïKuâqÛïOù≥Ë(Õ`ØØƒHËà&˘@¿◊≠R◊I«òAz?ˆI˙ıòYé√à¡SóDòN?+ƒ@ã äÔ]Õ¯1§‚™ÔEÂkåo//EÛóÙV“iu{´‰U2ôœb¸¥Ÿ¡¢<˝Ò*Ÿµv¯ ±C‹Ä"<Ô÷Ë°„,bã–Ñ\(.ï.ƒä†‡ﬂ)ø4R,N≥”Í≠ì!í…*£å1'J!∑Cœa!ìP_÷Xícög E#∑Qù«•
j–ÊDÍT¬“®ïóCx+©’J#á!€EhÆ[º8?Ê⁄XœÍr°óßÃ©E≥@I’ŸPÒ”›ÅÓx(˚Œä¬;äèÃ‡Q≥7Ï*9+A˝‚ÌÒ˘_≥îƒ_£SñãÊ9+ÿøYÒyVÕƒ.ÒÙ.w_ÍÈ≤†ª›wìJ-˚ªÇìÊwQFﬂ¢ºYy'˚"≥âçø°D?»@Å™˛æQÅ.`}y}à@e:o(∫∏Gñó	Hƒ<ë&BõÍ@ã'9XJ|ñ0TÆ√#ãb¸
∫ƒ˜˜cl_u6(æOƒ™‘B¯¡C∆ˇxuºm9Ôπú_±¯K∆¯›	]~ß‡=ÌEÍ˜\ucüµ!h™Æﬂ∫~ï|-9†JΩæêØﬂ=àÔ@|Ö∞1¨«=xœ ﬁ3®~Ô¿Ωíb◊Ï^E”√d≤<»ûa/Ω„ê9üÂ3ö1ùEt>OiÓ]_çyBINÛ∆†ëë7Å)ßi#7ïs=ãú[Ø%ÁñMÑ7îsüˆ±¸\Ãg0ç±º$»∑4≥¯{ì√,ng…î:ãÑKã^^!xeQÀ>• :¢âF‰”œß…Ñj™	Ù+]‹Lp~7ÿV?∏Ø˙¯V±“u∞≠jie©&/—w‡"RÖ¨∫áΩö.ÏUZò[Ñºﬁ!<BC`[◊r·Ø2ﬂ÷Ç8™:ﬁ=Ïıoˆ˙›“√=‹5∑_Èó‘î\å>W”´ƒ™ﬂ‹ïSâLgÜ∫cÂÔ˘m1ØûrÀä«öÏÖ]f%´»≥$Ãiy9àgQ2¢Â&ÿëSø “Ë†‰‚W≤ ÊìQ4˘LﬁS;Mÿ¬èl3Ò«  á∞èkÃ8TK∑"?«¡LÜ·˜Í∆Ôº~”¶`£8qFÏy üÕ˜1ªı√UÚpî^‡?Ã"ãìÛ·√ò_àÍò¨˛ssTN:…a=ππΩXbÙèNÌ[ú1oØˆ˙˚=uM›[ÂmÍr÷+ò-üBP#ÑW∏√ı/°≥túê¶8¡?xQÇ™Ó?ì)•F{ïƒÙÍ`≤˙[îˆÒŸz⁄„‡‹àK4>ÅHÉa_‹d4“xêIÉû√ëãVl7í@SIáN´vÛ¬—º˛eIÁ†⁄ôrˆ˚0jhy‚ïÒ=U©ﬁ¨ˆ–ıı‡Bè˘i∑îÛk—ˆ*‹ÀU°À¨u56˜2A;*ÆMÉ≠∞MùΩM·ét"ÕûY_hv›çÚ
¡YI∫î&ò“ñ¸pá0u£V®Ö{ka˙∆tÍÜ»b©›{)Z„ÿ”(_ÈË¸Ü∑jn»†º+«cì˜ÌŸ˘√ _ÜÒ·…√√9ÚŒÒ´Se©è[">Ãi_R1;¥Ù‹cñÇ|Ñ˘‚Ë)∞˘:ïò4,¶µ;ÄS‰e„ÒS¸gÅ«/‚¯3>ˇ+˝ó4Ê˘,√ò¶q4#O£À|ëAçA†±ŸWÏèö∏å£[¯3˝wÅÚi|öD£èÉËÚczˆë©Ò¯0 @Wûè¢å‡+√èXZÉ”ﬂá1Â0-π¬(ôÕø¥›	Å-ö°":9:À$;©|bK˝–Âyﬁß‹cµNB2M>!•∞œ‚YîtV…0FnÅ?]¸¬Ωâ ≥›ÚŸ:Ña°Â&è?[ÎÚ1ÂD≠\d*Äñ7¡ñæÖªô•SPûÍ'îQä©ﬁ!œ@âª$˙¡˘∂/^Åÿj¢yMäÖtF+
Vïˆ[a¢m<Ê/pVºÄœ∫¨¢.	í9≠)Ûeëƒ>«é÷öØÁxX“—…¡Xò´O?(∂af·é0p{ÔwÜ:æÍ^?f4◊•$Ü8’⁄Ëâ6zúlõO&/ÃZ{Î¢Ωu÷ﬁBçlàF6n–H_4“øA#õ¢ëÕ4≤%Ÿ
oƒè—u«…Ò∞Z;ô1Vá=ØûXí÷Z±à ¢UzA/™å0DôƒÁøÇìú]∂N‚ÃÚƒÿÒúåﬂ7é˘˘
ˇsåˇ˘µ¯Î9˛Á®ÒÅô3aòÿÒ*I_k ®9ﬁ∂¿Î"µÆ“•èç˚tÔ Û'ü≤ P^‘
}˚}Êı@hx’Fb„Öá≠rÍ¬ xYˆú‰&fÈ¿‡øÌ≥d4“‡öúß>≥P#ö&|Pà∆¿ø)}}hÁi6k'‡.//yÉºhm)Å££ÛJ!ÏØπnÏ≠Í4ÇC˘GsWØQò]%A‘≤l
√cﬂàu]ö1í]5LíÚK√§°Ó¶j…íÖjø0$ñc©jÆ¨ö#ùL≠„:“π€í….<»n.í˝≠Ö DÚô-‹p‘¿ÛÛÓZy3ﬂS≠ç∆.Íµsó∞4ù¥ˇˆéôwt»Ùò£{!GD'“;Ã∫€∂Uu€ æ~¸ÊTÑ_W;5ZŒçGå¿ ˛|¸Ì?<Vö‘rô˝◊ãÉ_$@’ã—VYœì,ü5”¬ï&ébP=®f„ø6r<L2hÉ˛≥`œ”yÜV8ˆo‡)* L—#hoè∏p˝6Ùœ;[ÒÛˆ≥ú|“á>ÅŸœw©zÒÁAÆœ„|Ò÷ëDìõ4±Å, Ò‚-ÙÅ·`√X¯˘MXÖò¡-,ÅeoÆY€4¸Ç*”A:>I&•ã•eÒ$áøüÃœŒ`Sâér¯Òª˘-!Õ–_›´ÎØæ◊2õó|Z1π¨òHKpˆÂ…∆¬ #‚ïNãß
)8N&πíkMjà˝hkÜp8œ¶iŒE2{Üúˇ‡	øß…TÜ°1∏¡:î4ü¶√ZÇëè°| 3¥!œl@c t–gBg£|ÿ<’∆≥ÅVÖ},Káúı≥}˚É¡Î¯‚yy˜•®Ö\˝≈ﬁ €#¢L≠T±∑Úd‰ÃÿJı[+ıÍ«≤~’àœEÉVcÎƒÉÜ•©S@ééÚGÛ3Fp≥eC1~mé2‹55ã;«q:%GÒ˘9-.ì£ãdv:Q∂G\¥ŒÊÉJwÕB»Ù§‹	NB.]}2#|	˛_u™;´Âç˚≤¨[∂f∂Z{§GÁä—€õÿëöË¬—yKo¢∞<ô“◊ü¨i[Ó*ı&tFíhvÔ$›5\|ï|tN§ìM>ﬁ©ãÈuÉyik\•ë…Ÿkf§ÈM(¶ìZû∫vJ¬Kœh¥‚äø§T]èÕ2–†›!§“ó=ı)ÿ√”Ïé“Ï¶©Y≈hÃö›Z(°‡áﬁ?ƒT"CSˆ}Ø¨ŸªgM?k⁄Ìõ}¡CÔ;;7·xìùüDÕÌÌ’nß∑⁄€ËÆv⁄›ï5ôªWãπ˚°Ã›3∏w÷6ñÀÒºeçÂ•Ã)∫”©€e0„K≠⁄˙V˝÷gˇÁÈh≥;ü˛ﬁ¿˙Ω ®+ ‰T+=Ul		–›\ÌnıWªΩmê Ω⁄`=D»A*.‡œ‹ªd! €W$>ïì◊T≤‹‘íÚõ:ÿZ†É≈E¡˛‡Üf~Ôí`„^|áí`„^ò«ÒJÇ“ÕtôºÅbí	Õs L4Kˆ≥8‚%ç»∂_bÚ≈ê'»kQñƒ6(Ñn•…b8]a8óg®˘|IrörãI[Ô◊˚ŒÆ‚'Ö¨›±¶Oÿ›ghÖ√,Œ)ú–$%fÛª<AÅ{2ô“ÇØ¯∫c:fˇLZΩ 7¯èE§Y _Hç¯k2Ìûˆﬁ≤w_ä;lQ‰JÉ&€›≠UÉÄ^¡ﬁÃgV‰« ãŒ˜_ÕLÅ? ~3ã@ÜÊÿzHË®3&ü}tDò ˇ˙Ê€“	¶(}6†ÁvVË,uÓ_	7µ”≥3ÿ«⁄_….imÙ^GùD`2¸<ÃaéuzÓ’ÈŸÆà/–ÛzùûÌøµÁ«ƒ“Ò∆-ø≤µ„Zoº¿*[;Æµ»vK®ô/,\e im`ƒÜ1#£Yˆ^Öç∂≈r‰…·ÓZs»G∞=Na˜≠ˇø&ÿ•“3Bù>1ÏeW-õÍx`-‹qa$Rpî∆ﬂS¨$RéÎGY}¶¡“K†Q∂N.[¯Øs@H>ü9ïëÉoç@’õƒVÏi«Óﬂv;«Ì%@i¿ü‡é.ÎŒç«t˛<Ò‘≈∞‰,FnÂØ™xä+$«"ªºIÜƒ^⁄S\À*Ò).%ù-^˘4ŒìÛ	Ÿü≤∏Ú≠7_%^j¯W•z%ê¶JÂπKöÁ3 ≠\Ø»®∏å≈Fi⁄¯∏ùì≥4˘P∑©∏Í◊"óVº!û‘≤òu®^ˆ˛|ˆúä±=rœ0Ô)<t∞ø5ZÃËˇ@j˜ØïzióÊÌQ<9ëékŸYA:êı˛N¸‹ÚcG'y:¬Ï√®¡∂:L≈H«t —cöÔç¸÷*“¢ñâﬁ◊a‚úßÒãë¿xS¶Û} ¡·<<Rıo˜6˙u˘Tﬂê#™˜k°	ÅπZﬁcÁÑ‚vı(4j‹q∏Ù#~‚Åq◊OÊ‹"∞ñD≈hgc2ËT™ÆNE—Óª<Œ§∫_˙÷*Y;Œ¢`a˝è8ûÖı≠fe7ÙŒ2&-©oË9>O≥K÷˜qtÓËx:œ@®‘Ô9 lÚˇ  ˇˇ  ›ÊxúÏ}€v€»ñÿ{æ¢ÃÙjS”‚E∫m[µÏ>Ìå-{,ıÈôÒÒjC$b< hôGÕá|@Víóde≠yÕ'‰{Ê2üêΩÎÄ∞ã§|;‚Í∂D®*TÌ˚5p∆Ôÿ|6Û‚±ìx,ç·ª^ˆÆ|◊ãYÍ}H{I‡§^oo8Ï˛F˛úzÅ7NŸu2øºÙí‘è¬~∫òyÀ¬ïøÃΩx¡~`o/¢òuæ©¸iŸyÀXß≥$O¸pêÃúê∫–á◊OæGf„¿IígÍ=Í›y}ø?ö}x√.¢0ÌùGÅ´o⁄˛p»¸‘	¸qÁ˛}«∆o¸nÍƒÔX±ÑÔëÕíÂÇi˜¬≠˙r/Ô√z„(`óŒ¨∑√¶Œáﬁ§∑üEÔΩ¯"àÆzãû3á•Õb¯Îxû§—¥óå„(Œùò ˙AÊø&˝©3Îv˝‘õn±GáÏö|™cx8ï€ıgèX◊r∆/e±sı2ˆ.¸0BÍ$ÔŒ¸4˙	ç◊n3mŸS'ONS'N∑˛`1â>Aˆ{?ˆfÅS^ˇ9˘Ooæ˚f∞@m5ÆÿÅYehDûoÆ≥ØK&∆~Ë–ª‚õÉÀYæcxR6#˘¨[¬wˆË—#÷2\FÒ¢≥eubé<=Éc:ñœÿ±Y“íy–µ⁄ï¨.≠∫≤gÚ˘ïW∂⁄~ >:ÁQÏ§Qº¬Ã˜Nú–<O√Ÿ<=Üó^WAã’ºiÏ√	ƒ?;≥‘w;Å9Im∞`˘·√OÏ•Û8d]ãÂ!Ω¥:åwﬁ‚—5ÓæÕÜ2Öú<∫ŒÈô› 9Mø~Àâ:Æ!ÈçΩ0û˝/@¥˝ãEÔ‹KØ</d≥ﬁ.ã£yËznÔC 4=N¢∏7ã|~70¸0ÒÇ{N \Óú±oÏÄ?yå,ÕÚ)ƒ´s~)yÂÉ·pp»&»â‡™∫˛e‘ªó˜ÜÄÒ£w5ÅWå‘Õ‚¢| xÓ`4‘πÓPÀ/Úá;ˆã=–;™.tT^dyÚ‚2Aû“◊xƒ+´-ﬂ⁄ çç‰V#9Ä•á] ûyà§•Ö]+È–0Àı[H§óˆP»òô˘hƒ≤#AŒõz±∏ph√¡Æ<u ®√63w∆^‰ºŒÙ@@üU\YqNr6ègÅWS^⁄∑Ö)U∂«»*2æi€ø˝ñ=¸%»I¸ø¬YÔÏ.Ÿ‡–éÏ’OïÔ2NÛ‹ôΩÙ√ô(ìc¯DgŒÂZ≥XiŸCF-‰C¢+ -;áÇ;ŸÈDÖµŸ=s>O”(¥|!‹›GÒ®-∏f¨¥ÎY´‚¬Õ^∆—ÃπÇúïH#>9#∑zi5⁄—_ıÓıÅ	Ú5¬Y•oØ“ØÔóñF Òè¢àÏ™^÷ê_ìIÏáÔzC]™‡øÇz?≤EO,%;@†vÜ£í<b )
°¿:§µ·V¨—ñ9ú£ØPo…í4éﬁyø˙n:ytΩá§¿◊Ù€<eI;»`π‹¢Ìy~‚ç≠\nu[ñFò©˘yì‘#ÿ≠2Œı‡ÔÿÈÃsﬁ±˘ë≤ÓÈ®Ò;ÊFW·˚ªA€ÓRi®’ÃË§ü¸)Ú«ﬁ3?IΩ–/A,A˙«/É^6è=ês4{Ë◊⁄a¬ıÁ<‹l
 ©c/I`éˆáu!p“ªœÆ‡çûËé˚€õ∫eu∆ß˛{ORõ£ú@	ä›£–£…ôïç#aâ˙‚(ÒPè……0ø2R WHò˙S‘fÛ °™'RÛ""∑Xé¶XÌ‘òQ.GÊUâSd*ﬁK•Ÿ˙ÏjgXúˆ^›¥;πñ¬$˜0 EÁ∞ÇÍJ/≠ÜlÊƒ ≠ zI´i∫ùÙôÊßÿ-*í‡Uoóãªö8p14Ä=.¡'õ⁄Ç'≠Âπ?Vqüƒ [˘LŒ	4˜è^r
";;z™hÔ'ß∂tu‚•ßìËÍ»?öß—Öœ#◊	∫ …”Ll´ö÷“ß`ü6{TÏ‚lê/c«ıaË^ıŒcvG”ﬁ{?
ºîå˜æ£”∏I~˚>£ø˙#£‹4iTMßÀE$ü€'R>Aa: ìßS‡©ç∑Lù1˚ñùzN<û¥ç”éMOÅ$ΩºDCBÌ‡¢˜NçîÆõ»h‹æ≤2ïrŒì(ò√∆¬	¢≈ß#∞¬/@æêxï‘ó%3Xÿ¿M%ÊŸ∫pö»›*Q∂k…HúßßûÀûÑ >“èN‹BùÆª‚!ΩBNú¿Ëèƒ/'HlNÃ	/ÁŒ•á◊Õ\]€L7À$-B?qí3äé°;wƒT˝æ}<èπ^≠?Ó kƒ!îèEBô|àC(í>Ñ2ÊPá–6Æ0åvù8‘QàQ˚˙˚ÔÖ}_≥w_≥ıÀØÖ9'Eœ◊1ÁñÚäÑÄJ-è˝'.JMÍÓ~êÅ±◊[†’)L‡]§÷^8Æ‘ó"âKOCŸqpOâäkG úÍ⁄`wdº≠Mı§E€mÊ%«…^N≥ƒÔÙGDÎ˚√vfäEÏ,+fƒlWÚ'Ì´-}ï≥ô#&‰ÒA)¸§∏àb4JÁPí6¶h;JAJ$UY∫±ìn¬∞∞k⁄[33i»√ÖOèÇ@Ò	ö)¶9"•yá5∑XÊà®Hf%¡mˆêx∂ é]phÏîµµÇØCKH3H§	oOÑC›`wﬂdØc«bÛA$;< ZŒ-I@Dµ›¡m5B√√zÆb@nzp≠X–∑ﬂ=Âv&˛UL˚%ÂI"«àE∑ÉÇGáh¢,⁄ï¸0C`5uTkÅE;√ÈvË%H.ö∂wÀxc·œ¥˜ßbÊä.jF£NΩ˚‹ =^2Ï*”Ôñ,;ﬂç÷úój¶&õ¯•&¢Ô“Hp4Ñú)¨ÇÎê‚>⁄Ù‰Ä¡cêR3?¡–¬/ÄHy¿Æ5i{Ye¶HTÄΩ{Ú`-Ë~Áµ$xoÏ¢Èé
í^ÎÇÔCÑî˙rKàüB4^8aÅÒ"§ÆÆFÇ‰$É“¥˘·ﬂÓÎƒá_˘Iœœ—<æD®[Ö¸(îÃIê˘Øóe
˜CÜÚ–’[2T˘‘ê!M'ï‚ØäÑ(ªº% ,Â©wáÖyƒH\˙©Q1$ÀÜ)¥ÃIë˚Øó,ç_9*ƒ˚›í§ÍßÜ$BµFïP‘"Y“C¥V"L˘lÉÍ2AI](ê'uÒk$Pzh™y˙’O'9i“Q‡+&O ÒÂê¶,˝Ëñ,U>E≤î9HÙ∞ÚQ9¨ºHîÚÎ´—§l*ç$…kEíﬂI^˚ÈëZnCé~äbçI®ˇ)…òN∏©—.BN[ú˚«—63eÇJ0…≈^y„Ë2‰Ãé/N÷}ˆﬁO¸Û¿cW/î~ñ∂®–În%>Ï˜ﬂY% /æ«KO‚8ä∑⁄âsŸè†¥ÁA5dçƒ SJg±Ó»}0*yëT®§ÓD“‹…HÀndaÎ4:˙+–â’]Æ•†¶*†˙_´1{;<Ë•ØóEàn»Û*ÊŸ3œ≥?*Õ√^ãØ»Ä\ÿ¡≈¡∞øìºYw˙˝ ÙZ»UÎv…†{vgÔ¥ ÖzÈÉQû≈Oz˝kéàg»ƒ«±?K1IªÛM˘™,nê·Pøﬂg∆SFW}RÑáÉŸÜë≠4∏Á}s4†n¨SÅ÷ËCæ_"42,Çª„›Üh	Õì¶fHf0<HÇ# √Áπ]u•::áGOŸK`¸x°åìTúÑì≈I êQŸˆÜ‡$gJk'U °ÊQ<-<¢6mwW>ÌË¨ÄÉ3ıc?/7Hñ1≤>0dáﬂ9‘6ìú’∑âcl£·yZå§H‡Ú\¶¥Àm¶õ¡∂ŸØ/ˆ∂1‚«ÉÛıímˆrÖp≈qêHSê¶ˆ≥Ãê?áÏò¡Ûi[ xù ¥€*q˘Oi√è„hÜY>≠aÁµÇW+Ë=Ñ˝]9ÂéÒ˚ÚP≠‰·Ä_m¨¥%)‡°—&¿ı{'ò√2S≠ÜÖèÅ:œÎLX&vb¨£◊Où¯“K˚|jë∂˚€o'O~˝Ì7ã2ˇƒªRÀÊ’/Ë˘rêBÒr…≠hâ˘uûù˝Ò…*oÙ‹	Å!»%˘^b˜FÂ’0˝`≠ﬁÕbŸÖ=,Æ¿Ê(åÁy·¿b®ßB∏ãîÕ´·Ø@$Å¿Ñ'ìtÅ	K◊≈≈ß„âáq"YLÏ]~ﬁ°Ú.O πKYâ;E3Æ 
lÓtO"ñSÒGRºŸ8É;^

æ"rçàrºÍ
<πTƒ?‰ˇ⁄¨eãd,Ωπ"$ı¢‡H≥°tøc«±á2~åëM¯q˘ãæ  ¸ÊWñ†ÁLËk¯∑ˇı?ˇﬂˇ˝oÏâÎßÉ« n∞ö˝≠ñ◊1^'l§îÀúkör3@ñØã_t±è™õˇ‰$)_àï°7üj|‰U¿&  yÒ£N&9‡[PGê0Ê[˜''†Z45∂
„p∆
ÑÒ§0ˇÀ
früWá¢2±öø˜èAbZ°|É`ç@
8Gº˚è˘Æ]	/Ø?ãΩ˜  èΩg§v•D]¨#◊’vœfÍ&ÀCPÌ2€cﬁ&{ÍÃ>ÙˆÊòEò
π{ö„•5ı†®No‘úÔøq#˘'8Ãf!jïCÂ˜sÎO¡Ω#.}?ï+jñky¸k≈:avŒ¸c°Íœ∆OñZ1£=Å∫uJï·‰–"R2E∑ÅVJ~WüNÔ’˜πÍæz`¿¶ˇjK_C÷V~Fz∞ûª	UòúZzE[uXﬂŒıU‚ ﬂ™≈+´≈bd°ó¡ï°Úµ~˚”ÓñÈOÏbƒIzº6›ùBöwﬂ«¡‹EkèyDÇªÿ¸“UÍvXΩƒ∫øÑâÛﬁs∑¨tR<RÒ=πQ!
V5*DAnTÄﬂ˘ø”FM¨n≥)‚Sôæ,j2`4÷Ú’¢0å*¯çD—\L√¯¥E°∞Í™°
U˜x°8 Ç«‘s˝˘4ØãÂÂØzØwÓcD\Á∞S•F<√8Å‡ó¨¬ä>∂d[≥!c ãs‘ ›dÄbêÆ	8≈-[v÷±⁄˘ÃuRæ⁄◊Ä¬Ö	∂’´º±1ì¸RFQ»íSX[6N	`∆©ó¶†§'g—qÕ›Óu±û…AˆÀu*ì0∂+–èÕ«±sy9I⁄Ìúrp˛sß√æÀ`‡;÷˘s#	;“Ÿfùd>∆ 
´bËõ5 ïç-<†u(Ô
ÕÔô¢¡ÕJXa±’HMxÌäıAee7~Í ¥æÊ8h˚E6¨ ……Ô!>}Sañõ≤3ÿò˚Àö∆ﬂö…_áøÕ˛⁄1˝«ª5ˇì>ª∂Æåﬂ∫ ] Ö≠∫uò?_é†∆ptÎ
hzÊÀv8<÷Uyπ[—`[a ÍıŒ>◊<€çç.ÜÚK›òºëjM¢˙º∞vÇIÉ›Œ$MgÉAg37ÔJ¯mtÎ¬çñ+”}øÚí(x‘Úπ3K~ââ¬HFNúdé-πÒyZô◊Œrü∆k5+>:Wéü≤/√πúô?à˘:ºﬁñjúU˜â©óN"˜Äu^æ8=Îl€<:Ò02î›k÷¡»W¨Ü{ŸÅ—úŸ6ó√—‡_lâ≤¥˚<rÏ?üæ80åaãü@Àû«¡AHA¡¶:Bëÿn7€Ó∏èoak&q˚R£Fúq˚Úú‹úhŸUπ”õaº˙ÿ2çÌÄ5
ºæá‚›é¿èÒØ °t$Y≤?tÇ¿UÃ∏i„K¢ÓQ$ÆVF§Z#Ãï“Ù´òT8± "àß;¬‡:Ãk∞∑¥\´´ÉΩπÚáJçYø2[§ﬂÔÛ:©ˇˆøˇì CÃ5¢ 1õOÍ}ˆUÀÖ›gä?%]ŸwÄÄÙ∞BvO ÈqùórLöØLëÀ( Mg/–"™∂^∞BpiÜ≤n=˛]≈«Üo˜E—…B>5A2ææpﬁG1ú¢zµ§x·e:aál∏™ï(+5.JåÔååûäH5’Å‡UÔ∂ajÕG#˜»£GôàèrAìX1¬D|™ÎvO]1ÜA|÷Ì+j”’¢]ó	˝ﬁº7d*òÅNâIte:Á›| Ñ˙®*ì(J∞‡Å˜ó9Ä2Àäè¢∑™*GUd«aØ«~ûüg%°÷ÎŸ∏Ω≈«@hxWjx°-z‹@q©<z »¢wª`¸õ©≠_úõ ∆¶:‰Â˝%≤x’√.4M˛l˘µÕò£IJ∞&—£«-∑	Ôb—wÎ@øè£≠Œv›j‘∆êõÆmº?⁄Fd®Ç¢ 2ªCqßä$Ö‡á“#D”Ñ…âÛY=‹X»C&ı≠ÓëÍ–€dLa%†r‚rÄCÆ‰`
q®L±Jò9¸ThÖ@á¶0á BWuX;–¡&Ã![ÎJ!7e	¯|É¨Tˇ⁄áåºŒÅ≤YD˛∂Z\√*Qn±@+u@ÉD¨õU#ÿb¬ò©r J´°¶AXXAä6GME5Çh&êlôÌ–Xo…!ö@
êÏ·ˆuØ‚–ÇT„.òˇIãØ·¿IÉ>≈:∞¿XdŸŒ±∫›ÁY”@^sèQtxy›ìâ®{“%ÿcà?`i\+CWëo ıxtâ≠‚Z›±]Uóá1V?ôﬂ—yø∏$|/kºÑ∞nT(Ü^R≠]özÄUbk:,V ˆ⁄ *≠3kíF5M*ôUÍê6ª;¥’wÀ &
ÎêÍã’-ÁA©¨⁄~QÖÍ˛√Ùèû∞=0áIXE	fÕÊ¯Lfv⁄fäm≥(ŒnuΩ‘ÒÉ§O\'Q˜¶ﬁVgŒ:õ^â∫w ’†!ÓÓi°	v÷`+K V`°K…mä⁄T—ÇKÚ≈8â*˛ÙàeÍ¬›ÓòÛÌ˚.èÛÀ¶≥“(’‡6™‚∫eÒZxÿ
ZoøπVÎË_LÑx}…¥´Œ‘¸Ú€ïR≤ë¸d3~nµ¸5¬‡ﬂæîàÎfJªÚÅÔtæπV√/;oWåÄ∑Kù‘^17˚éŸ∏|…’``Ü"—J«/Ñ©“@7æ^o
tõ}P"<â∞RafÏ)ﬁeôÿ"_ãŸ≈ê_$)¸Áàï¯€Úœ·˘@«G>◊+tæ≠˝„Mƒ}‹å’£ÏøïúHó&Ω˚h6E«n…,·Äÿ‡ƒN
o ≠ó'V”æQ)gÈˆzπ0≠4 [OR.HÛîS«Q1Âx[ûsä_,<Ycùï¿7çÖ‡◊ú`¥«øˇÎˇØZ#˘ Ê∫ÿzõàY∞^¶«˛√V‚‹Í_ıïDN™<mpQc|7)VRjò7∑$Uﬂ|Ö€(´e0DOwíæÿWEjªö◊oµ"öJ+@˘Ü£Bî˜p÷c≥wdøfΩ∑˚.Xk˚eﬁcµP‹µ≈N1àñ7RdNRQn{m¿”l¿œ(¨yÌhf|5r3›ÈdÎrZ…·$›MëÎ,NSå Ω+~V›≠~==}q £V·[2¸¥€9ÎlΩù9RV‡√©)à<~uç¡≤6≠áv∫∏o
]≠µÀÆı+d[R»·Ó$Å“¨¸4™È”¨êd—ç÷˛™˘‚«^{
èf⁄‰D‰˜ﬂIú∂¢ãÎ–Xäèjm≈‘ºçÀi≤~j‘\–‰#»Õ§3_âÄn0fï√””‰(;8
Îpã@E¢ÌÚáQäÅ…—h¥Ö∫¸Y‰EèS‡®	&òÆµfÙ≠béß7í6÷->R=|´'(µ±ÓIƒx
√∆«Ìi4Ø ≠}Ñ =:Ù!≈K‡g?FŒ3∞∞◊Ò”Â‡ç‘b¯‡ Â[∞B¬6üÊLNù=oc]ÀÊ¥J8„∞ »;œµKﬁŸ®~,Ë⁄#)ênRßFÀΩ`œâ7ı±x?QQñ·ñH:—Îb?ﬂÑ{;ª€Ïπb+¯voà±D£È6;z>x˘|ã"vTòu~∏S Y2⁄åø-\ÏÛí<uL!W∞+√:=∆∂d⁄€J∞{π-]±ôÑ&1VsfK)*:â'ˆ¢(EDjΩÊ˝ñ‘Bsúhûl•Ü%h3Ô3U5S>ı©ÔUßﬁ-Nù±J Ù¥FtY:œâ°»$7#©ÛY6&©Ø€SÑf∫PΩ I87#™%êDB[9ÓKë‚‡Ö@o”Û(Ê,Ç§ˆPmπ•¿•´f
nP‡⁄≤©⁄)i*Â:S‘‰à¸/†p[˘„e]Ó»∂¶;ÏÌÓÅõc˘/.mL•Ë¡•éV™”"jl¿p©4,Ñà)–Ï,∫º`ÅßæÎıŒ=¸iI.cﬂe¯ZF`ü…Ù ˇ∫´"PΩÅ$NHΩÊÙ OA°nè“©†<•“¡}¯.Y∏^Ûƒ≤õ¨fü54ÜUÖ4$Ôë±£m„≠›˙P¸f≥óXRqõ≈bhèbP=v/tù¯b?≠'úUPAn%¢î–Y™¯l'<Ø :ì-(ärˆà¥ä$ú…–‚ëÆâ$DKo∑ìÚWÿµg_Ãºehh#ı∑ﬁC`+:È∏Í}_mº9„¡Ô%≤ÕSﬁÁöã UÙ!…˝%Ÿ¶S®“Ñ£k†-˜á√NAG˙—nˆióü≠C∂pªˆåmRïK&é]UÈi˘µ˘¸U@à‚Ô¶_·≠vö@≥©TŒ+˜-ÔAå∞∫∫áKr%AU@U9O)’˙˛ó…äƒ9PΩ	íí∂ﬂûW“—·á$Éñ qUÕivDB$Ú√}üﬁtÖ,óu≠4"Q\ƒµúÔc∂éA˚…u#bo˙πâ3VF≠(ùñ8$G/ôjÕ<©„fÓ≤Åµ∏+¶ÃZÚ‰‹BR⁄‚™¡0≤dŸ°ÿ@6A¡≈éf≥v©âË`¸º—ùÇH´1kã0ñ‚…óLy Vïö‰ñVÕ8SºáLèÓ‹AÇΩæ%H˘g©"bà°Œ£y¬Â%~µõ¨‰ø÷ZÏ(àÓB ‘ê^SZ$√Îl∂zvV0n`m–™lπ∂8)1Éw[Õ+¡2ª®OÂµõ∂u‰$O£Éç≈ ˆ‰Ø∆B1y¸p¶4[áj¢>õõ <ûÜòH*¢!f¯˚rÃ µlSÓ“eKÒ¸SË•Kî—˚>∫6üŸ®ù ¨x!¶∂Y:ÒLC‚√£~œWs‡øê˘êùŒ\Ú-‘ì@˚ÏEä6Y9⁄ë/îÇå;ë∞1åÉº$pf"≠√O˘Oÿkıáë≤N∏@K◊ÄE*Ô_$˝6H˙»&
√©~|[E˝Ä-|ÍeÏcå;ı.ß‘.PçqÍ*.,j3ØﬂåPê.π8zhX1©~&üÔÒ‰¿„∏SÂî3≠¨Õá  aghâ‰ç6ï”J&Dïn€úïÂ∫˚∫]∂ÇÉıpõ˝6„õ| €5mãà≈Ç§I(à+'
¢+mûgÄW›h´<’y0ØÃƒØ·ÆXL&≥`Û˘ûpwÔTÊ[xh◊(œ(ØZŒ9Ò/'⁄å?√Wò≤:ßÉ˘ÒeY[\‹Á3∂L¯È1˜lâjkÍDuV∏¸‰à◊IïÜ2:Äy°8Xﬂw€ï”ÿKÁq∏Ò"⁄<ìG.ÇÂµnu&ï¨'∑°+g'ñx3j‡˜m>ûéu∆6z%U√Ö?ƒ◊∆ï® ©àÖ÷i—$V«Û·`8.-ﬂZ<[§c˜àJn+VZÏ1éø"'!.‹Ü–ÀE≠ÙÁÜ?nIÚO¿‘_:ó¢[ÌnC¨OùL≤ﬂ ì†4Ùæ#‹7gŸœº:|£Tûo¶)X†√®ICMcñíÀùG°4äTõŒ{zH…ôÏW¥ÿ…*¡;á˙Ê?ã.&˚≠”™bå U1¯¡≤E4è·:gÚÛY¬ïq‡£æ3é¶”y(ã˛'≠•/(Ω@HÃœÜâY±y-˘#◊Ö–6∫{«Ø^$X•1¿Ù(œ8Ω+Ì¶€–#⁄&˚GaôíÒ<éUq‹ÄaZ— £3È1 aÍmãΩLà˚Îããÿ3|<∫Í_Çx ˇXú∏€˛wÿ»pHìø≈””<ﬁÙ§Î“fËbˇ5˘V%o~.öHtá€lÁ’qb<êÆæä'¢›û∞RŒ^´á£‹Æ
C∞Ûn ®¥Ÿ5°≤ÎuïªK‰{[ï8é°ã\ô¸Îú´≈Nëh6Ó“ºŸsõmªÜfXô∏ÅΩÓœﬂ§jÔãa∫£a∆Q˜2ô’Ÿpw¸ô>ˇ•áı¿zòˇæ«\∏…A€º„Rÿ£às‹#äqoyÏ%—cûûû0Õün¥∆‰"X9ŸπF*Yß√§U!ˇºÕ£ˆ
¯+¥y\≠ß¢ûf Â÷¨=πuŸ≈øèAåã¶•≤À˙ZµÿœIe#WÔ4pÉwea´ˆô7TÚüZ~‰⁄/Ó´(Ñí⁄U–/îBI≥:(ÈÚ˛∑≠poQﬂæXFxΩk§±ÈŒ·wL@¥Uì{>ØM≈´"$˝ÿèe®ﬂgC®≥%≠A°ç|kß†≠ñçÊfS7Ò?AªÕí@¨6≠€IÄuVi◊˚V
•míËY˘'4/_∞˛
VVµZõüÕ0Gïﬁ3{©tÏ¥=@|>ˇ6±µpøx˛{œ˝¬a7{ç[¯Õ?Ø‰¶lÜo†¨Võ:\SzVV)àıﬁ5“(Ø÷8E‘:≥Q(5mr◊§Mfö„ŒàV!≠¬◊m¥F£aπ—ˆ!jÁ|Gp¥)lTñû’-∑¢é¯BT$S˛L0'áÿ8∑Æ∫≤`Trw@¸
£{˝À>@xÔ•' œ=€ëP_v≈⁄C¯˘¸öÿÎÌÎWT À¡Zü%›D∏Ÿ6Êÿè„+9öçkµß/î®(1_="g%>LnAˆèˆçÀ>ìmÁ¬7˙S/IùÈåaÚ9!=z=ï¥Ω4"˚ñ^‡ãèËYG^mΩBºèl`—>÷Ïß≤l$Î’»Ê …b]hnr&,B§"U{Ï%„ÿüër#o$O'QúÍ´°¶ç\c'”òA÷∏z_„ì X´u7Ê≤*—Ã”8rÁhÈZ∞øÃ#@m7v.H/∏"Po˛x≈ÚO
y∫Œ√Wcyg KNÏ9´ÇürS$ÍøØPO∏≥tÖ¿◊Q„&9QJ∂1Ê~„çHf^ËÚhp±k‹aÑ÷	sbe‚G◊ªñ7ïõ¸Ò·ì7Ä˚Q‰J⁄C)W”TÄlö®™¬fƒÆ>7_N»˝¯íE@≤¨÷ˇæ(®dÂ≈'G$…‚˝ö¸ô>ñ¨^7Q€óÅ∂;¡qce~7êN,∫dœ¸d’≤aºïÛ°7Q›|x‚«∆h-zŒ≈≠,R3Ú-Ãzs°âqH©V€˙©V∆ø ÿ …{Ö∂~Í ‡wO"¶πˆtûÀïäEæ.πΩ…•íWÂÂyx∏o.r|RœE)VT˜˚Æîh˚±«©9VﬂfF©‹h'†AR¬∏è”'GàÏ›Z∂OnÏ+vQS!
%úœ
[aW≥CÜ√¡Ωrºg13d4¥ÃQüMF"ﬂD%}Í»Ù.rrƒRŒ'ú≤÷ó∂ê€%≥·i—b∑Á9(ÉXﬂ„∞f=Á\…Ω!˚ˇïìEã÷Íb∆≠’dÂ§ƒl6Ω_}oBõ˘)L˙ÁZ€KzO$zS\yø9s∏“¯ØT˝øsÀC…hi7!π©}√⁄rìÊ4
£⁄¢	∞ƒ2Y∑Z,50ÇﬂkÛVìQ}9¶ó‰B‹‡¡(√E§√<óoºõ´ÚJì=‰¶rùê‰3 LëM∞°fyΩYÎñ,_´π;√´Jl∞Cçê™⁄…w†∂ù$T•V#“¡ÉWrD{îRbf¯∂‹(+ÀZŒ¨òa5g~<YIA2∏Zô‡W3¬WÃôÀDÏéÃW¡é~Í∞µ)Säﬂ¢6A)u>´´û@ﬂOYæôR!<Ú5dŒ:L1+:áÆÆUòQ<vbrpÅ◊8ûx„wßô;Ò
-‹˘ú√	c^Áiæh<c[ñb„Q˙§ ˝ÿº‘”≥Q|z %~  m¨`Gâ†«m¿iÑb˝®Ûﬁ Hù≈N2±mî∆ü¥s)R%‚çÑ√fóP¬∏ÂœµÁçŸ@V‡Õÿ≤rçÌ≈o4ªoO^ëÚ˚Z8Ã∆„ªìÌö`_Ãd>\[^ﬁJYyºW5®◊ŸÒ$S,∆?u∆Ä¿¢NHVŒ¡πBBã>?,ŒÇMÊ∏»¡¶]JY©v5°rµÿ<∂s¿N`xÎ÷˙†7ó4®l±Sn—¡*Áµ[PÚjÈôœ§ŸfJ—¶Èµ—*%‰ uMÀÈ›x”˝Ãt\’ûG§*jMµRÀ3égk#ù-¶€•a,ãµlwüKá6ıøÌXúêìpE◊ÖLƒ“U§HF
ıÇs,kvjˆ2J“pâîPAÏƒ|÷4öF1Í<äÆÛ>`Ø‹_õ¥[ÄsÊN•8ªåoWV‡„IË~J“£Ä93VE¸∫‹åﬂ•ogæ%JÊœ-Q*%RÓ√#DN˚≈Ç*=síîEEt˚‹”s8ËÑì" ?Æx	L‡2ñ "mxáJ¿W…∞‡€Ï&Ë‘ﬁ˚—ªà@Æ”ö2}∆tÍú/ˆ7ﬁ2ÍñL›í©èI¶éı:¢÷$Í\G≥Óµ™Œ»øÀ⁄<rÎs£]≤ç:–/%>Å(#	UVcí(ıéº»ã#Íúπ†râo7%jÌk$,ö}9,ö›∞[ˆ0@≤ú~Å^ÛS/ƒ“>qSƒkt¿î ã]÷
Mm⁄£f?!C!ˆ∑Ë‚7†Ôˆd,ôå£†áê“€Ω%jÚsK‘>>Q3‚›ÁF√^y™¶2º%W#±#¨˛.∆F›Õ’D¯ÀÂ‹DI=†]π¡IΩÛC'»©ûò"ÖÄ∆6‰mÂ]Ÿh- Ω®E˘„¸¬ã6`GOŸsG4∫<é¶hUÖ¸UK‡ÑùcO‘¶í®l¶ﬁyíYÏº˜%ÔﬁPÖçá6ßg¿é√ñÀw"¶f`„gëå=¯º⁄∞û˘∂≥”≈âÿÚ∏íó=Ô∞‰'r@b1êeÿ~[2ª)X€ß_ñ‚sˆ£_ﬂ+E)Ó5F)Ó’w3mÊÌzãS Òâ0Å£yı<y
"XßTO`,7«KCÚ⁄}≠√í|ı«π_e®∑1ú# ™~A2ÛCÜ‹!∆˛U3j~vpX‹	Œ·:‰–√è’=+,◊&iØ≈´
r—Ü¶å—≥“›ì9VÄ/ßå⁄µuœ6ú,⁄Jz5¬ÆáKLåóZÙ´≤ÈÏêy≈Ÿ◊Xu¥Õˆ‡Á>¸º7|”˜√q0wΩ§[~jãH¶ãÆ¯aı{˛Ù‰îu≈u∑®o÷zƒ•≈Ïåñá;#>uä“{p @◊a÷∞ø÷Ó¡ÓŸ¨ÅRÔçV∫TR©£ã¥5?˛f˙õHYÉ/Ä÷ﬁdEÚƒgXè:Ò!nâì’_$Ünø@g9J√oSñâ«Jçπ!Ñ£ı]#`JΩ»≥(z7ü-€f“≈Á#ˇYƒkˆ˚Ô¢˚§¨uòbØ*û¡ƒõÈ&*zÌÎz%™d1—åa¬yêåù √õ§ëÏ_ıªA3ä©†#cbˆè´ú9‹]0êÌU⁄Üímby¬Ò`gT…9æ«ç^Ü<¨ΩjŒñ]Ïq{VüT6N='O2}Çh<û'∏’å"l>{I4è«¬|É9µ>ú°„∫—!"0õ‡aÜúÊØ_¬<;ÓÿC¸’ãwÕmö»‡v˝·)·;4õgóôÔ±¥Ãëz#*^Ú#èÌ7¢‹ƒQÏ9VÜµk.ƒ‘ÊáIœ«2l∑U»(ôh¶JöòA®*aÆ'q¶&Të(‘è¯5F√ÙÂË“ùÎDËØ⁄ZbµrÑzJ3d~ˆÇ–wˆÃﬂ}"–).°ã÷
˜óZ'‡"*6ÏóWœí≠)πæÜU!K√¿x≈õIöŒíÉ¡‡íSî>Ïƒv~HÕ¸Ø›†^‘Vä¿◊≤ú„©¥»ZG·Ç√ „2 àuP`Ã{@í^≈&u(@°ƒ& x≈á+ë…,‡¸∏—?ÀÕJ˙çDπ¡-@¡/û”≥Z˚…˜ÇÊXÿõ¿∞‚"®8$™£6û	µ‡îéhj+cô`-Û>8”ô¿12>—äH≠IêüÒæCGÅOØº©è`ÕNΩ4ÂæŸS‘Ç–ÎlL2¶YïY6v!›`ëâñ|˝M∫bãy‘y*∏no≥ñîrÂã:ç,4Uh˜%Y˙{)oaOÁÇS@◊˛p´Ö€‚Ï(IOmçl}û;·Á±,–(œèRˇoılï: ⁄+T…rî$ﬂ∫ﬂNxÒ≥Z)Jç´ì¶ï†¨3ÿÈ£ÿóû\±Fﬂ∆ÀN∂bR{≠—€⁄ÉmIÿú?ƒqÁüXãxS7jP©+©$˜Gs8”J„àSÓK≈Õáyëÿﬂ◊ıï˚ﬁÕ?≈ÇS[ØáohÜd?mè≥tÜÄæ”Ü1·’€oÆ˘Íógﬂ\Û	ñoImèHÉtY¡‹C8Áõ»Õ…«≠eJFø⁄”£ÿSädk	c+Ñ∆
;‘âlb◊vä”|O≥R*lQúÁG©à¡ﬂò¸”◊¡Ù4^êª°â)y•ŸÃ3{°*qÄ%–Ë~dc’Á§õü˜›≤È'kîK_ßat÷c#ﬁ’˛‘ZÙrs-‡sËS‚Ë?ÕÉ‡ü<'¶ı_’úNa8	ÂQü	ú¿¢øc;[˝ô„r\ÍÓn≥ª√ª÷πn˝DN◊üc2©ü„Áˆ&&Åa∂ÃÁho]kûéàgøÏ}s=ù‚øÆã?ô,‡ä$~h’_ñlåæDÜ“Ô5Âë[ﬁ{À{µœh*√<oôÔ-ÛÕ>üò˘Ó‹rﬂ[Ó€ÚπÂæ∑‹∑ÊÛÂpﬂù/ö˝öP∞Ckº©ŸÛ¬-C∑‡Ùx1CÈ∞»é4ª∏+U]P(T Ö(‹ø1ÏŸLÍ¬q ¨jcP±â¶≠7TÃ˜ÌÒÂ∂Œ≤‹wØEêiî∞‡À±ô1óµñ@Dw©újW|âìÇkç«'Ê¬Ö™†Æ∂<$tLµPπˇ+M ª˚U,w](ƒ]>çjøÇ%Äœaü‰è#tƒXÈŸñ√MÁ û´±'Í˘å1)º/eR¬b^qQ8∂œπ_s’ÇòóvΩCªπF¶eêàAöÁEæ∆Ù≥∫JÏﬂ._Â[ÒSÏ˝eø-ÿÛ»•‰˝ë\3mE!o<cæ]ñëåÏi"6eV—œ±]ZÃx†⁄≈lª"∏Ω¨U™˛¢H—¨*õANó˜$†⁄gÛêemﬂå≠“¶∫BéıvEyœ°¸iQ 6¬is¨H9£‹á”P{ÄVπ^P§“{≈Is∫*Ãﬁt°ÅRIÓ¶AN>O¸O„9˝—PíöÒüÁ√K@≤ó4ë◊ÒÉE=n#&_4µ˘‹âÕ-≠)|÷•5ŸA3U2hmr≥n:C	€úá”1†èrR„⁄˝P≈	0vH¶Ù∞·6ÉA5i¡Y©Uû›·œ∂>jî†ûhètÀ…ü¨íŒN9ÊGÌ›ó◊<jå3÷$‹óÿı'¶ˆπïô¶≠ËU^´Ôubÿ™ú† ÜqÂN∏∞ãh≥»>ΩÅê6Ç˝™êºŸ·¨Øs¯PÛ?+É\yﬁ;ÂW˛ìu•(ø>v	9EΩ2ˆ= 8¯sÒÀ -<'∆q˛âˇ\yòdÊçÅñ`0,∆ó◊9D'ê?ûNÃﬂã@Få/ôúUK»ä•%ÚeuÚD(dÔ◊ˆbk◊Õ≤óö–◊xõÄçª§jdÇéü¢>ÒU‘?5ƒ]ç—¡º≈e a›c3fØ[,J¥ãY˜oá€:äY8jO≤uöUÛÁifîJ¿Ã¯HÔ‚˜ õyNö≥ ⁄©-≤˘ÕD÷%>F&í7%ÇøS{µÛ≤‚∏´VSPüU˘ö¯lúªâ •ñáO@∆^∞Ü¿Og ∆—v’hª|¥ÑuÙNY∞:„»{j‰=1Úö√Ì´·ˆ72‹H7⁄»p˜‘p˜62‹}5‹˝UÜ£q`u/≠OUc+k9T]ójmml–Æ:Í>üœèb7s*)g Ω∫éb@∫BR«∫BrÇ≠NJ‰=í	‡≠w©≠%-8 äX¢ïîL∫†
UŸl¶cì≈·¨‹µüwK…˛ÑÁ“Â’¥∂ŸÓ6€€f˚€jΩY≠-ﬂÏw˚ïƒ-Ω®_}ÕåR{…™≥zÛ=¯éÇÄzÑ_B”≈∆#/ú˜ﬂ‚aKÌ0˘õ9Ò·ﬂ(V„x°{3m€NÛ&‰ŸRó»/_wNÁ!F<è¯è≥πá?~ı\˛m2«?≈>˛8u“Œõ˛‘ôuªÄ*∏úmÊª,ÇíU†§üy¿se‘∞	FÛé8	5Ñ1ˆ“y⁄4Ù∂DM∆ﬁyãG◊∞&:Ú¨ä–+∆~´˙ÈÚ≠∂â_ü&2ãΩ˜∏"¸Ÿø¨Ë‚ó›ÒèÃ"Æ?KÊ F›ƒ"_˜˚}¸ù√Îõ>ò¥kΩ<ãªâ≥¯º=`¯?ô\aë7¯…ãΩi∆*MˆTû…	m€[Ÿ©r¿≤<∞¢wrTeTèe@nº¨>V.ÀÍös˜e’Ÿ‡—<ö∂+/∫2·ºïêﬂ˙®P„÷˛˙á¸õD9:¡]∞3á`0Ú7‡1â¸¯Lò}n´ﬂÅÂ»ﬂÄÎÃc¸˝ÕkD^˙*Ë2A…–˙	P[ØãêÖld+)œí¥¢ÃAΩÕT:™?*è 
<”Oÿ5ÒwCX˝,%ä#{1ÿ†[+T^xôN¯ê√™ìƒ|„˜dH :!L	f(≈ﬁv¨+êÄıòÇÂ-:Ê∞∑jDæ  ©Æ]6ägú[KvØ›7[˝f–≈K[À∑Õ≠⁄Û“6€f≈JbaÑT‹^‘(CÌL¬»2+m†8ÛÊ)”<;d;∞Ñ∑Õw-ÖÛ-Re¸≠≥¸òÁ“NZ[®‡-πWØ˘ﬁ6c)/∂bt¥bq7ÓlÕ‚"Zùõç4¿‰‰%˘ æ.&*ﬂü‘á˘ëå–2¥ÄΩg±,Ø⁄‚°¯Ú®&cR(w[©+Ò·Ω‘Úuûík]ôWbÌ»m™BîØã⁄wCπ∂7ıT‡k>ˇÊ™ï°WüØ»•⁄˘…èì¥s»¨ÁπÎúz„˚Aâükv6ÒcãˇXs®ü¢yå>‚Áç˚â@±æœ
˚^¸+wÆ
Ùóª≤q‹ó„ﬁS‰h1LÂ ∆öËµ√„˙÷g∞]h˚k¥áQå“V∞ÊP˚HÅÑ•aÕëF@∏ùbÕqÓ¡©IÕìGFPo+Q,Ω™kŸ√Cn∏)çh0Ëg}R≥Kye *EU&aõ∂S5Q¡7K$∆BÂ˙ÀfNd≥⁄‹È|:u`Å?:Ó%°ây%‘‘ \û¢Î$ìºIG°],+òÄ≈R¡∫EIñ<∫P7°Ω0ÊøˇÎˇ¯/ÜÃÿôñ
Œ0óy°:0ÛRÂpœˆNÛv¥ßîSŒ™ñ5%õûiûÓ·‡H®™<`v†|ãa∫áÖ$Ó*@qÉÄc ÏærÍº˜GB˙)äTıÏT,lU†)ÌÌ5hÌ˛)“n+TCÿ„—ï2â˝]œD9x≠oÔÙr^{˘âÎßº:){â˘Ï"àà}«¬h/aqË\Û‡FÃá1!-«∑iYZ’z}I3XRœçÆB6≈2,∏Äßa‚≈)øuÄªçIÛGæ∏o•—°çÀÎƒ∆ø¢Âx”¬⁄ƒCMƒUcf5∑‡tB'é˘¯ÓSq‹—ZÍ‚çup_ëÎ˝U¬Àå÷ºG¨™™igùÑ'vÇRRoëO∞RœYÊaÎ∂;b•º™ﬁá◊∆ØŸ∑T¨˛Ÿô`‹Ìp≤S{≠h©wÿåçô«≤_”,¿Ä¯∏˜=ÜspÆõ—`L ø_ıŒa•≈0é›JøUçÆÔ◊y/Kﬂ37CQ0»≥m®^˚ºilEEã$…'Ò¯Dﬁâ—Zbê˘©⁄≤E±NÇô∂˚á°∆Øvt€*µ8˜∞_†M",Á¡(à^cﬁS9FÛ‘Õ¬Á√„â˜>é¬«H®Ú*˘eëQùÛ$
∞7nå`Œâ~Õz;É]&öyÒ%/¯y®=^I-ıKÃ•EÍ¯kIæ9Å≠µ!”kµ¥L÷ﬁ°é$b¬≠ÁI*ÿo¸¨ΩÛ6£ƒî 1;ùDWGÆK™1∆>ä˙5◊úk"|Zr1mW¢I ≈K…Óly)§˝aπZR°S[µ.“àJ±ÙäÿZ∫ÅR)íó4tCëTKl.ò÷=–ê˚ú-ôÏÍ›’§îS+}6˚∫o»¢Ë%À¨
$…ªE°È~ﬂØp0u◊gg{ÍÖn·dq˜V:◊Zù√†q‘Q‹»hÉ	cg{EeNÁÁS?5∑¥/¬¡^¥h#C®™oÙi‰r´Œƒ‘Jb{öTŸ+#Ô‰∫DKãŸ^g¶?†5E¸÷—Tì˙∂Ôu¿g‘=Kó4.≤‹ °‡· do'ÛÊJ*ÔLÛ‚Ò—3∂Û„;~qÚß'ØŒÿ—„ﬁœ/éŸÈì¯Â……ÒvˆÇù˝È…cˆÍ≈/gOOûh⁄”utﬂÔT¯¶=>QQÇx®ˇ˝ÃõŒPv·˜e∑¯…ãô>2èñ√2Ç>0&∑ó$±Ú∞ÅQ„≠⁄màû=uª!®í˙˛Â”&⁄›“6^∫¢›[\ô“+Õ£Àµ'êÛ'êª%B°‘LÛÿlÁ,íïU·Ø˙◊¸.A.é±‰Pm’ÿ◊'m]É9ÙØ˘]Û–Gç·YÊwyt]πTπ˚i÷e'ª˚i•ÒŒ†	Ñwÿ„'/üΩ¯ßr|ˆ‚¯ÔÀ‡˙ÿõ—¢£n"S]ñ¡MÇòx\¬’2ó>¯†jÀÿ+ _~°ê`m¡∫º&\AZ÷~•fﬂµÀÁ%;QE<Ø3TOÓPÂØâWdøFÒ;æ¢öPÉZ^Gﬁaœüb*g´"j·fy.ë6ﬂÖt8Èæ~Sw€”DﬁòG”@Bå–Q_Jàz®ı∆$UÔ3àtu·àıúX´=©EΩ*MsTH9·^ª§NPÎBd%«÷SwxUÔXÇ≈EMY2é—.W~≤ ıæc'¨‹∫
Á3qD?¨KX¨¶©Jì](•µŒÂgì]ı(LûŸ«≈á⁄ªéÈAC∏XáøQw™˘_+Ò∆±°h˙ËO" Yµ•˝~øﬁÇq-œLDÊ≈¯6&ÄöÇÁ|ƒ}ﬂ]™›‚_·Gà¨≠~¢™#∫ŒpR∂¢óŒÉSÔ:≤!,û*<ÚÇWÔwê/^óÃÕ∞•ëàÿêFSü"€ni—…¶Ãl…^∂9±≈DN≥GaCm%Úö?ááN|Rê‹¸Q.√`Ëq÷F∞•∆⁄£4™\z†Ö:´OùﬁM1@£s∞PÓºîÀ˝pT°‚z1>È6gªîØcZç»±©’âƒG|ÓÇ…“÷î¨cg∆1ˆîBµø¨©Ö‹¢äoÖ≈òœ\G§·iÙÇ'sÂ„âb®äÒ
21©+ÁizÆ Kj§¸¨jYÖÙJ°¡¢’≥ <i‰[Ùävæï`Ø∆T9#]Øy≤j#"sªMr:ﬁÒ%
hÚù.]*d5l)NâzqjàñêvIÈ°)€•‡Ëm£3m(´ÆÓáÏ¬q˘OW÷ıÊùRSπéª´ÔS2èD¬v°ŒE¶ˇΩåΩ˜>H¥›kÛé-ŸiÍÕ∞Ê\ç»$XpÒ*vfçO+3Ú,Â$›Äó 5Óæ5H√Ö>`YwGuÖr«˘˙?ÓxªˆŒﬂ‘ßÆ:	ö©K)ıYI÷©Á˙Ûp¬_'iüê%ûG⁄W@±4gı‘GÜö)çî¿p±ÄnÇ,4®¯ÊË{¥Ÿ¶ÜÉß«Ãí|eÃ@o?√é@uö}MGha¬FTıú
˙ü¡‹Êπ^ø ≤“ØjmJÍ3hU/©∂Ù4ÃŒ{Øw ˙´∞û5§F
ÆóR?™Q‚JÙº‡lΩ¿∂”êÖ≥[ïri–ıﬁ'ÕÁTSIu ¥[*äÇ+w%)Kÿs't.Ωrœ¢˘¢*√¶ê(|¿»ïˇΩú¸DÎ~R&(FÃx=ûx„wÁ—áÚV˘Ó£é@Îg—¯ùÁï∂Ô¸QœUËü›W™z‰œ…ë_ZAˇ\ÓPfù9
‡vè«}åÁ…÷s÷Ω^yYn˜FëCk 4EﬂI:~ä‚ÍnUX(÷3»Y#÷È÷C?9
$ﬁ‘Á!ü•uîgÅß•xÇ	A ¬·e‡1|„˜~‚ü√Ô"WÄÀO%p≠pÄvÄ^U]V<?€™‹ÃL"çéœÇöt]uÀBn*\?q‡MÔ¥ÿ¯™t0lø›_
ß§&)63ÀÆ ,»ﬁ»ËY›mt≠äØÍÉëu-ÖŸ–nˆœ åfzT!∏Nu:ö%[4o‰VQπ îìø≤oùÈÏR·(ZI#]mÿß˘Ü•†»òl;F0yPâΩ0â»√—ä¿íT⁄Ÿ∂<¢4 ıÔ\Dl=ö√+|mwP‰NΩ„'?={z|v ^=9}ÒÏó≥ß/NtˆsÇ≥Nì≥ËïóD¡{Oi©álht˚eﬂïˇØqMjvHÀQLõ|W⁄m˘deüﬁƒcÚ≥{ü¬·ËÎÜ‚„Ãyñy˜zŸpóÏ™Ä“4ÌNÏAZ∫s©mH¡:≈Äw5@O aF¡X
Ñ´ÓØ0}äßÊ‡èXu∏◊c√ˆ⁄˙rÎGu¥íI£2ˇÃ¡aï¸◊l~W¿°∞›≤}pî:¡c©ü¬Ä›¬?Ê˝édÏÅn?ün≥8í“| æ√u%û&Ë∆πÓªµÕÜÜ˘√ËJÔŒk∏Cn%ô‡ù—ï÷6V4Ì˝N]Õ⁄ºVGô≈j/Óì–ï#È„~W‹√2Å∫!– gü;È§?ˆ¸†[w¿ˆÜ∏¨Ωa˝ ß)6¨≈≈ûEÚˆ “ßŸ2ø\sénÙi8¯∫
X oxkË8C≠ﬂ“hˆ€yts⁄©.6ô_^˝ˆ‹"÷'‘—πaRÌ≈kœWdmfä  'p√cg¡qò£EÓ=`	ﬂyÉ
Ã1Tﬁñ°eßî¨êaeä`!ÔVÕº{ù-n9≤[¶']¯˘0Øáo∂≈ÄØwﬁ`gjım∑Ï±r˚âÏ—ÏÊ›öyWh£-tõRcøb	xnccÈŒ∞SπŸ‘öﬂ˜∂`w*Ü—*kßÇﬁXQQ]ˆ2é.¨d÷;ÊŒ/çD«ÉnﬂÇfò›<}Úú“U±∆$,2ÔHÅ§‚«_º6Ò&<sûYøMÊÙ∂:ÀeΩ£∫f}¶âπ!˘∑º–ecoŒöøi%#Îo)ˆøÆÙT-…∞ôçm«çï˚`V¡äM[˛Ò˝+hr<lÛ*ãñV¬|}¨ˆÚmÌk’xôÃ…˘5˛%„es“·ØNbŒ€èNz&4•™¬K:HÖU®l≥Àˇ¥;,j 
öˆ$:ÚD1ìøÂ(0ÉÃw∏ÈAjé˜´π0b*ƒ&Âd”∆‘ñZ˚∑pôòa‹Pﬁ≠ÿŸN[fu’ÿ±∂»PÖ∏© ™¶Êî©¢‹ŒN©†Bq‡9.NÄà0xé
193Ï<˛ÖóáùÎí‡àA»òÔf~ËªÀ–qª»Ï√ëP º¬íc®Æ†›_˘@íç”/@Ëc∑^âd±|rÉ` 0˙îRîpôT–¯ƒ‘[ˆç»aÿ›&?LªR'Íâ„	;vbóÜ,ö0Fu™{S¨B2m+¢‘/rkıRi√Ç£∆1g|Ìò÷Œ∫÷°l≤_èÆY ª∞§Õbå¯´¬áÉ…>Äj™;¥ºÊ /„s£á®IëQ ‚Öuî‡·17‹fN	 íı(Eg7uµ-Ù∞”Ã ]IÆk(ódŸ∆U*ÜŒ$‡B†öu÷eíıî@”ﬁÍ+Û’Ü`_ë‰eUö˘Ù œ√Ó].jk∂U.Jk/πÏËÄ°N≈Œ¢hΩ?r=R’Dıº>3ﬂ∞≥§»©:ÉSç¸”Ô˜∫ÒvÕ›5∫ÂAù∆l∆úViåó*tΩ’ävÏÊ~≥F”©éºúôJyHwÿ‘»¶+ñ0øgùtYÆ$ùKo∫c"Û‘és†UwFÆ∂?™m	Cv±§ÑiˇMeí)4¶ërîn∆2·»â'Öê\Kêß÷Íı®’ÏŒ†∞ﬂ˚C°>™Qﬂ´Sñıe ØÌ™syGÖc–§rêŸ^s(a={†ÚE/á≤|I≠ﬁi_Í8=˜Wvsªõ9<"Nä√¸ÔMïﬁå˘∞A"±.@Põ◊~4á3 Ê5v∞^N~Bñ≤qq∫çV4¶™0_ïÂÌ™¡Æk¨ÇÀl§-Ê\ ê„hŸÆ\¯°üLºƒ$[◊H◊mÃ∂â3aj°®-ƒÕâ/Å±“/ìç˘´}Ö¸Gæÿ-√˘‘Gƒ«Á0jÊœö•Ïd,ÖI˜;¬ÀE `7Ò]◊®R´ÒjCƒW·BHÿ•”8ΩÊb£õfB#—Êú…47áÒr·˛XXz ß@# æ¬DØÕ
ä(ü°ŸtÃ,¢ñI4	 Z*JÂ~ª«ŒB∏ÌäÆ§,µø‘&L®∆KÚA≠ˇR’—≈ﬁué.\~æö∫ÈZ€0’AˆF˚Óv4ˆ'¢·º>lÿÏeÕúKÆ(w∑kà	[ ÷E˚?ZÏo€≠2∏‚plpàèEı3ıi
{h}∏,,Ëè◊	˙ßVx(0∑é‘T%Hﬁ—VQ∑X¶ﬁêj ¶Œáﬁ–ü'@w&Ω˚¨B¸Z˙ﬂ‘x:ƒßµ$§- s⁄?éÇ,Ô≤¶fj≥]2õ¬⁄|Z4{Yv>=‰ÎRÛ ó“Ù’ºFBÈÍ¶Ã‘÷UQ˚¿Ÿur[°[S·ÒƒÂP∑uuFC©uIù“
ZB°òìí¡ÇKVµ—∂ô¸R/¥;UnJ⁄ﬂ¢ÅÖyˆùœZπå¯¥s4fk‹Â~ì„W}⁄{Éµ!J¢‡bU†Y≤n∂Ω∞’mMâ®Ω∏n—]}j—=óÚnë› 9ﬂ‚∫˘cáÎ9ê!¶so
vƒmxœ}7Dø„f–ûPöªÒÜ∆?◊ @5∫q,ÇmÒ¯ÄΩÄ”ç¥Y˜Ô=oñV}À^˘≥Y ¬◊bjå‰õ~Ö∆∆Ï’nÕçü⁄‹ò≈«78Ês÷&«õÒb…WWPØ‹kÉ{£õÊjklÿ§»◊vÒ]€‹
Ä,^W¡B™Ä≥wO∞X√FÅΩXlã√!`¿7E‘¸EkÏ«ùZ∆ã•´<‘“ˇ+˙ÁNú˜æ∞«©÷§é˚µ)íy˝2#π0GWíú¥…õ Âî_]ŒëqŒ^mã‡í¢∑√s„Z3„
ŸnÜ¢˘à@Âö≥ºk•]Y™¶Ωæ~ÑqçT'lôöÀÜ2Ô¸:xπ|'€iò$îˆy„Y<4‰?©Ázuëıv∞Q«Pˆ[}9	SÑúE1†ÛÖ3Rˆh»6¢y»¶w‹îxk≥î±l•¨’Â¨&˝Œ
k™©!Ÿ≠»$+8Î¢LèÓSrI˜MÖü>.∫Â}'1b±âÃ©∫:QŒ% ‡ºh8"3˛‚Ë¡ﬂó±œBçE•\Pœfq4ˆ<ë]ãÃ´‡ÍóåG&„ØwﬂdÑº6˛ˇ  ˇˇÏ}În…∂ﬁ´îπ'3T∂DëíËë5ñö¢<ƒË6$µÁÃ1ªE∂»ﬁ&Ÿ‹›MÀ‹:Ú+Œè8?…;‰yˆ$èêµÍ“]]]U›§.ˆÃàÿ{,6˚R]µj]æuc*˘“µ√µÑï$πØP|åE—Æ ¯˘∫lt µ_6Ç¿øÓ∞ ‡úí‡f˙¬v·w\^˜≥€üG<ù]$ññ≥ô¶œ÷uyâÎ¶ƒ>›E{"èÃÁ»õ:c†NJÉe9ézÍ√‘|?Ô¥œ:ÌV >n5Yê÷YØwvB∫?∂Z=âÉΩnÁ^¥`≈›ëÎ&≠ê˝õ?ÉÅÅ(Fç€ÅùgŒfIÒÚ5Ï7q&\≠ìYFÛ`ï∫…-Èi4fúˆ¿—sﬂ<êß·Ë¨y—%áùùÇÛvÛßV';GXzBD¨≥ËµÙ<»ÂÎ5'€¶£´øDîèØƒxçpˇÊ*{*MΩN†ˇëùiÓ¨ú>ı‚5wŒè„în”›3ó¿31©”•îwû»mz?ëXn•öÃü‹ïDöKë˙⁄µd.+œâøâ≥œÇ◊Û´+\”=÷ì∑PT:•mŸ»u>-“•<ÂMüKöñà˙Á c“<;>nº> >Îê”≥^ã4ÁΩãNKÙ{ÿKüí0•Z~”è–1ç˜Á9ÖW/TG√rs>ÜÎ‚¬˚	¢⁄„çÚ“∆GŒ'dnà¯k»è˘û!E≤ËùS«ìÜ’qŒâTµd…‰h˝®îÑÎ–pÁ2˛¶‰FEÒó
*™áFˇë!‚©,sj◊>'Wbæ˚Ú|”¯≤ø—˘v˙}7˜4∏ã.±ÔŒ	ŸÈíh5Sõæö¶xôÌƒU<7·uÖLÛ::ÄŒÄ#ŸûCˆ·9Ör‚3P_íIõJÓ5Áˆ÷™≤+Biç@ô*‰.¥⁄Y¸«˝ˇ˜ˇ¸'r‚|ˆ&söñîPI6üÉJfÖ\Li17B€˙ƒÄM5ı£ëdQΩÇ©–9Ö5kV|M∑¥‘≠…2”-ÜË‰åπÂñˆøqsV…cBó/BMk…•y¡Qµ<Ì‰√ôÖ≤µc∞Pñaq≤üô=ú˙ ∂wßcl~; ◊î]ØÆ≥¥¬ZÈ‡ÿ<	$˝0ú:`·0îK' ﬂ#–»Ω ∂ß;Ë!aTY
6Yii⁄†ï‡êAß P——Óvo⁄œnHo•áÜrÇIÛB9hÒ∏ªŸq}ÔçQ£ØmÔM¿™•ÈÊ•¨ü-^úΩèË” Ï8m9±Àµë≈œ-q±Ñù}Ï¯íπ<oähã∫£	˚YˆHÛ‘ø≠T*⁄Cå`lÔ⁄êy^ºŸ>›∆ﬂ
ı8Dá)´¡ßÌº´iöh+.pÜ^ñuµJµˆN€∆nôÄ/<Dº‹:ÖØH™eÌÊÛ™Œ≠e›)/–%j}sâsW§ÏŸ›Jw»’¯jóª≠CÁ-Ãc|âG9—7vTÕÑ*Ê%spç%&•P†˚∂5˛U„Äﬂ%ùr9ÁÇJjö?‘DfÊDY±π ŸÙå.R%YL›vUQs©ˆ‰hÆöÎ7WUç€:eâ
`Oï˛»	Qπj Ÿ'?Ñ)◊_:†“0/¢:/
KnŸÊîÉƒœ≠©—≈ªEQ·A‰çÂe‹„gƒë≤3'âd≥<÷´oè"”«e#”Lê¶z‘†∂ÿïë¢%”U‹R.Ω®zP®:Ø»*Î≤∏a &6páåb†˝—R=V˝çŸ<òçÂeîœë7>Û˚to÷LMt¶ACAı-]4·^≤yßºwñ<—z˚ñ–~©Òîg®@_=lg4Ô,RÚ∏dc¨ùﬂTS5›m<W-ÙÆi‹˜u64ê R¨°√+6Â-Pbü≤”§òç,—ë µˆ¡£„g)0$'Ótn$GıáGÑ—∫"US6-˚C8 ê3Â9ìôÀÎpüÛ‘è\O£ÜÓÚá<bM‹›‹$G‘Vó0øh‰–ÚÕ,MŸ˝Ï!82•AÄ'ƒsS€ ÁÃ´|r∆ﬁ ∂xhÑVX‡è)\`Ü]∆©Â·8∂ûè>x:∫<„1{xÿû >É¶ıJY4òÆˆ)ï'~‡Æï»µÉ¥çN†¡:Ω=Å)3‹j/ôâ¯Ãü!|zÌÖ.øXÈ√lî~–H^LÈÛe2_ñŒtæG¯<ñZÖ’Q&⁄ª"≈U~n,˙˚:!fë§e›”ñQòw6’TËÆ(iƒXâX P◊gûZö1ÚgWåi”Û!ÆíŸ°ß"N!•ê“ﬂäâ^Iæ loq∑‰)H^^õ\ùÎ”ÃπA¸¥ä≠$}ˇeÅ∑•¡µJ]õ6ÚGƒ◊“)#í˙Ω˝∞–õÓ±;Ô)Ç } [IãØ-Ö>Â"™dÁrí„ãËTs‰~
¸i*^q'[s9ñ=Z+J< ä
`°Ú ¿–Õ3õBÖ1ZgãA	‰?ÎÈFôì'Kä¶vÕobÎJ]‹cïìÎ' äG%›‚bJ«Ÿ
4#“§gá†Ú∆eËiÂ&~zéFvÏæ@é—¯`Ívñ,üÈÍõÇÆíã˜9*∏µµG~È¥·0˝M÷2j'‘5äAñÉ∂Úodﬁ2´I,“3∫ey‚+Ú·ÿ˙7≠D˛çÂÏ€(P≈˘∫-L∂ñ÷…ü≤ﬁ_ÜBBne∏üÄ¥Y‚AYŸu¥%…ﬂdµ¨õu3!wOŒés-ˆÿ¶nóﬂÅ'nS¬õ˛;ëÏ£Üt»ébKÌUQ‹ÎFæJjwÉª¯ õ¢ùyC#Na6ßÛâx˝“:ÖC[ HΩ®î…ÉIC!*x–á∑ﬂ‹¡¢êè‡ˆ˘†w˜öÆÙ~Üâz¸ˆæD˛Lg¶/Q^S”{Á◊aO≈üânâ‘))Óëm	T+@pÍmfÅˇW8˚∆ù¬ç∆%ıY`%ed≤˜Œp‚Óâ5T√R≤z⁄•ÃÅ˝˚};Œ≥XU˚9qó;›i˝¿≈s~¶%∏’.,oy˚ñØÒ:Êk·ÇÜÔ“DÑ°xBXÊ)DVÄ√d.»1ù	Œix¢•+Û˚ú–¯LY&+à´›/’⁄·ööÎKñgÈ≈ Z˛Ç ‹¿ VÄù˚Û€eı}ıﬁÆ}•8MMÚóGˆ4Cπ?ØÓñ⁄{ñ>Øp∫ È’¬‘Îf˛Ód7 õÙ
pÄπ3çar$,`≤Cﬂe»‡êd„€€@ü)Ø√˝õù¸êπJT«¬`ï–Ã$Ô)!C¨[m™	-;ƒ¿ùÉº?}ZΩRU£¿Ö	2±´àûe:n¶túÇ˝äı˛Ω≤mS¥≥ymπzÜyëíT‰¥úµ≤w≥…»˜Áe’+◊j◊¢æXuÉ7ùiﬂ+õÿ“2Uª!’è‘≈êz£ÍdÎ23oK{(Ô6GÚ&:”ÆwßjüpÍÒ∆©»ùÛL/T‘K	Ãÿﬁ#ÁçnóÙ›ü»aÎ∏ıÜöΩFÁM*uâ&`ú√‰k5°£Ìyk»¬¿ã„îã∏ªÁ8+äszÎ.Ë≤3i/õ#ëÎn√MóiàDÅÌ2Xû_˝K÷ÉhÜCÇu∏LÜ•ÙE90ªæÎa¡àyËﬂÖd‡~Ú˙ÿ ˚“ˇºß@‚$∑Z¸£P◊èé€˜fB⁄á§ÃG˘›ÈöYƒ∂uïWπÄƒ≥çâı‚µì\ê+\KneX°”ı÷√¶Ô_ºÿ¡òiÏûyg:dˆŒwë!äzã·ãYyR∏ER±÷,˛vF»4Öé{jÑ°'ÀÀ–‡⁄≈m·N=‡§YdF.bª$∫àÛµ˘%ÂtuX÷ò}	πí´r∫&Ã¬ßÌn¯PK2+P°L0|π…N…ΩvJ»¢t–t¬)C.∫ák¶k_n≤)”¶µ>⁄¢6& "”¢*3ë8•ÌC≥ì¥‚ÏÓˆ5óóõùœì™Î^h·M€-‡ó¡äÛ˜†\h}FcŸ
U÷’™É™HFÛV[÷ÆKc®)Iæ%åÔá¶ïÂ˛R•¸π?ˆ¬ók@‘˛ºï‘/lx«>A€A)√O jª+6
5µˇ“Ö‚»„yE^‚ün∞%∞˝jjTŒ‘õ†gﬁ¥¥y@ˆ»ÀÓÃ	>é—q-.ÿ<∏%l`≈403äZJçvfÎ#¯≤	Î≤çhêa…tí`Á‚Ù|˘u¯ü0A≠
ƒîóK¿7£•÷…lÑ÷SbÛÜXØf8á+∆¥çwI'ﬁÌÓ¬ŒVJo@©Û©–uB—8eÎTßK“Â%U"_ìO¢wñ”„SÌç€T@Ó√Ñ”TM=≠œ€µÚC¯W‘‘9m˚5|]%¶®ê™náÛ≥∫˙Œû––1ª∫}⁄<;iüæ!®π7h∆uWVÿü≈∞qﬂÒ
ò¿J™ªrÅºsæ7rY◊ÀF(C7ˆg/Ø⁄kHúQK‚s“ƒ‰‘k7‰ÔZ1|‚«ÖJà¶,`ﬁ4ÊÇF*Ül^M_ p"É∫€Ñ˝Ql2à“Af“+h«:ëcÈVi±ô§~íÙ…⁄	).j^Ç8…1|ÌìZ7 FòZLŒ∞0…Y‚©Ù%Ö´‚0ï(Ô4T±X)H¶ébx”Hœ©FJS@Ω$®jföBf¬öñQ+≥˝/
ÈT—h~ÿx®äòT}ªeﬂQœf√Ç
‰a7c √‚9¿ÈÛ˝≥[U]T\)ªlÏm∞Ü ©/	B‚DÀ—.›™—\§¶ò6œµ Uï˙9%ﬂ¿g˛4ƒﬁØ˛Ãù±i"É&Ç.&ÿI|66ƒ˝6®^ôUˆSJpQBYmäA€H≈WÆ;∏ƒm◊gc‹q´hTä%ï
ìJoÁª®Z»Äl·ˆ∆rT¬òÛqü¸˛|¨¶ÜMkÏ‚üØÌAŸ8ÂkXF«ﬁ…1NE¶Ç_•|`⁄é ÂΩ‹ÀLÃÄ∆KÎ0ÜWÃú¢¥Ω|nÜ\÷äJ0K‡åT¶ƒ
è8∏£/lUT„¡≤ÓGgÀ7Ë´Í⁄*õ~?À<p˚»§ÓmôkÒ"†U—Jı"èÜH-π8≈\E1w’ó]ÎCˆæ´d Åbı¬ò&[«öA'Á«≠^ãúwŒŒéH∑ŸiµN…—Y'Ql%e·iEªÖw˝ÃD˛ÿeEñV“o{ô€(.Ø:E¯)®∆}KòD¿&ÙØ∞ñc˙R$ﬁÑl»w±sÈçAÍ„8—ùZºtFÆçˆ“ƒ:*v≠T£¥Ù±&JO˚’Âµsìn^ÃsrÕ¯Ìü^Ï8€óªÔòÎÛv≤™È_‹¿ªZêüÁ}Ò.ÔííâÌ){ ´∏€Å˚í∂æ˝V&ïM.xüúVë∫πÙ?kÑÈOhêãŒØ·â’49ºŸ>h‘ˆìØJ¿D~◊µLÖπŸâ;dˇÁ$ëW˛ûïJÃ:ŸyûtÉ∑+2F˙…§i»ïÀ©I•—q„1q?œXbÍ±¿üÈyﬂC
Ñ˝¿„MﬂA›"i`eWÿì\Ö–óZyHGM±≤˘õ#´≠ï»jÎLV]w|\˝ìÁ^c´»Ìè¶ÿÓôRï<l‚¶è	ñ*¶%åá–3–ŒØöÅ˜˚&≠ÌïHk˚LZT§y,íèÕiHÇ˘îÄ4∆ú(?ı…%Ë (9AÁ•
35<iˆprÇ)¸úiÚm%2˘Pa∑–*n‘´2–a€òÎ}·&„ùöÓ¿–7f®⁄mP2÷[Ó)ªùé]û{≈#CR¶o‘ <l]·œ#‹É €®÷	ﬂ¯cía‡∫”µát–ZΩ#?Úaxcﬂ¿Ò˛¬3‡/nD˙∞#Ê ∑,¢◊˙Fñ‘OtﬁÇ ﬂ*+»∆’âüöh⁄⁄µª+*ú∏Y°È^†∂,T…—üê€'˙Üí{Q]Üª-õ’å*“+Ω…êÑA_zƒ-q∆ıXÅuí fw>oå6∂üë÷.ïg4Ñ˙óÖ31ço*∑E
\0ù7@g_±_ö˙‚ê!Ì«Zè<?œRv¢^P*ÆD_Rü<•‚¨h¥ò$‡<Ç]*é-!%ìÓ¶@=µî—ø%˝;ı∫Ëµóé:ìÃ!h
ÄJDZ&÷¨Æ≠°§œ∫Í∏¥ùù›˙S∂Ù%4µ˛ô“+Ù`”A¿K™®êÒÑ|\PO7V^ ¬}	”‘wM‘∂ZµWs^Fs(Y.uËMÊcΩ6√	3Á÷Ÿ˙]3≤ø‚3$x2Ëqøo<t7ˇΩ~kÓcÕ 6|ŸOöF„˜UÂmıù)≠óV%Ù∞û9K6µìË…Ê$a6éÄÁß‡#‘|˘T¸)]Å}ê≠òLìTÇè75=Œ_ÎUÖ´Œ ”BöóbΩ9»’A#DwŸEÁÿ>~=»ÁŒ%ÌòÄÅÇ0ÏçjÏñ©h†!Úóôcôd≤,†O3ƒÊ
S% ‰E ¬L„ëõgí ”$=Ê∏d¥Ó¿\Ä'Ómñ¨õ·ûö–û¢·IØ‚{ÜÖ{¶ö)∏mmv}GôV∞n@ö»?ÄÇÈÏ1Ü~˛˘Ûd¸√<∫⁄]	ﬂ|õÜ˚•QÕˆ67ØØØ+◊€?ÇQgî@ÛD£˝Rm´Z"#•€~i˛FçÙµˇyøT%Uø8x´º/¡2J˚•∑µ]Ω™}øÂÄZ óÔñ6^Œ0/@ù>Å˚‘Í£›Íßù∑™ü¿∑Í®^˝¥≈øÌév‰/œ˘È÷;ﬂ◊Îœ_‡=ÈP>≥'É ±ΩøÀV=˛ç√ÿëÓQ´^æÿ≠±|€¡{V∞åO¯›‘YÏ–ÜxiX{x8“"}¯}¯Œ˜%F®WŒƒ√ÅÒFàÊˇÅJ≥“s˛ÌöèéB∑ôÅûù∂^n‚3^‚*|∞ıÜRU√ôÀ‘®-†‹†C„3+Aóóÿõ™(¿C&6Î©Ç‡í§´õ¬ˆ?X≠}'≠ÊËÛO£◊j—‰"ç∞∞Oö⁄ÍˆTÙß˝m⁄ﬂ}/ËÉ—áÔœ·D4v‡_∞Ükª“uœ∑ü?ø“lºZ=µÛƒiŸù'°µÊÅWo≠o•8ÃŒ.Ÿ©éw….©=ﬂ®=/∞•∑„Ë „wøD)3u¯Ø å„„ÏÖ(⁄%ÒÇù ûÔ„ﬂ+ºÄñ‘M¯‹’ŒsƒL˜º—lëN´yˆóVÁ◊'¶L·«üIï–Â]GW´·â)‹IËoW…VÑ˘∏Ü“ˇ”vd˙_∂Î≤Xø™øp´óy"Yú•…≤é±ç:∆Iü˚iß^¸b+o◊ÈVÆ◊W€ äXÁè<8l∑a∑ü∂ÒÉ»vÊç=øÉ)Y3]iø%aÕ¡îUU(˙z€%ÖNƒ∂±ì‚àX6È’¯`D°ı}w§∫*0l—^∆%ãh’Ô7]uôœe›¢Ùú-{ìﬁÀP<äâ≈0aõ\∫‚X,πÃük] 0)p?(¿äè»ﬁ⁄Ãëm<íG|∂¶éπ—oö‰Ÿï"‚V+˘ìÚ’w’√˘Z•A…≠Ÿ6Á÷X ÕÉ¯ÒX§±9ˆÁÉJ•bÑ6≤ ëî•óÛ®¶O≤GçR®˛ˆ¨ÈŒ9Ï/®N[øàX±◊{‰ı≈ÒO‰‚Ù¯¨˘i¸£u»£¬ö?∂ö?∑ª==÷ºËtZß=rÿPäç¸Îã)ÇDçÒòÖÜn<óæ.∑ﬂ\˙tSõπRXÔ7$Ï2x¿á-´kr°S ÑîLà"B’¡ê¨Éã}¡≥B§∆¡b
:SüLÊ„»€Ì^tÎy∞á	l¥¿sYˇ∂ó®åMáI÷÷Å¡uÏp%EEŸ`µŸ–Yé®Ûá™E˛pœK√ò78⁄∏~oÑ+U–WK”‰a iD/<ˆ1l ø=√Ø"^4êé¡2:˛5–XKÍ«U≥x©6ü1]:Rm™&¥π≤<kYLkÑ∆}{GD—ÒÒòÑÀ£BCÆÀù„C4¸ÒóW´ãV\ÿ$ˆ‰9›;t/«] ﬂFÿ>{mÅÏ^s¨4zŸì√ÁGg§Í'Ìq˚KÊY:Û—>¿äY∑⁄Œè∏yÄ?¥ú˛à=FoÛ˜`s
ÉÜy–Wå‘F}°Y Cù(˛˛˜‘ôa’H¢§^.ò|‘Ó: À⁄N7:4v;vkãrà8‡a¡	¶>˚¿è±:¸,»x|ï˜beËHWöá£dàVÅFJ“ö-”>5¯\œ-ŸÑL<eO≥3∂™™cÈ÷:!GµLºÈ∆ıFó Wb/)õœQ‹ñW"”`VEÓ°—;ûüÖ9Òßæ*¡ƒ„ÎÙ '#'"t(fùn6J∑‰ˇ·‚—oè|ã≥¢ˆó°#4j◊⁄jπfwø"ﬁtLZ»∑gœÃ"DÊ$Ü)ìn%å¸ò(3á%üfS∞˘eEL”]ÇI¢æZP|ÿkÌeƒòÀzÑÍ∂èÕ§u·†∫ÿ∑5µ-Ìó–iY£]@÷ÊªDcÑ‡Ã∞¸S⁄!p'éá±¶)f÷Å¥B”¿Yd€,—$,—i* Õ¿E◊r0êáÖÕ
BcIO∫∏˜™{#@à,ñ€:∂ÇH“∂(‹û∆;J‹ ≥ä÷âÿ{ÑÆ‘:/ìZ*ë€∞˚	7œ—‹‰Ê0¸;†≠2Ñ}˚L«k4«¯ì5òûé∑a”_¸‡#U≈,*™çÏ≤g©TJGdøÎπWxQ%Æö[ª|ùø∆l6^p ⁄håÛ7ﬂ}‡iMéß5è[ç9Ô¥œ:ÌﬁØ‰Ë∏ÒF”Ï›§¡y‡a-¸≈í¯Yˆ⁄\-{Iç^E¯eû˚Ö`4Ó%“P34qx(›f¸≈Äs8C∏ß¡w¨6√‘Ä∞@—§”váÛ1º;zWÙl…}6˝+∏≥pà'|lI|åœ°˜˜Ø${ê≈œEœ˙ÚÓˇÉh≥ı]kö	d˚j@∂á!Ø'ÙM≥ƒPÙÌÙõ=ƒÿq}Ì†[Æ‰˘"ÿõçùZ 8ÀÀ<!q_â{Pµ˙1 ∫å˚≈ÈÃ¶ÊV˜0X]æz_≤õfOÏÏoLŒ ;à≥æ
tŒHl_B˜,iËNIyG5Ä¥K”÷# wµÎùë◊çÊO«goñ|√¯≤ûˇffÏóÔ≤◊ÊÇwŸK
¡avDº∞ ‡Q‡ªza¯ÓƒˇD√.©¨É1‚÷$±q—»ù$áˇ6wÁ.3W*§7r±‹
6Í¡fRòd?`Ö^i?)¸âÄπ" ıC–$—Ïû=7r.Ô¸ì7rÅΩˇ{GıÍVTOÇoøZ@oŸÕEÍ.Â≠˛GÈñﬁ"èÄæΩ÷. ˆï oKìÃ¢¶Yªﬂ¢V/å®â(∂W‰C7∞w"lâK`ùãèxD¬W‰fì_j3N ¶Ö'ÄÌÀl´™Æ˜äú’e‰åÈáõﬁTåÎ7çöômº/âöYiÔ˜¢Y5Ôb¯ﬁª∞W´’çj˛W É;¡q†]≤oR´Û´Ä÷å˘Â°µÂçÈæ÷Ö^]s∞A`:,ézÑ†∏•v)É€(ƒàØ¸ïÕ˝ÌZ.πOÙÎD-˝ar¯J∏_|aA–/>iƒØ¸  ?Qà6˝&Në}Hj±ÇÌqeé¯WWÀi—=ö∞J@xkÓÚƒR,OË›z˜∏ËÓº'ËÓkÇÓR+ÚÑ€=·v‰	∑˚:qª˙∑”Hé/⁄•πf.bó:˝	Æ{ÇÎ~ˇp]∆:{¬Í‚Wx¨Nßgxö<öpL∆™ºâ•∏áÇŒ%ZX(°!8*tkÕ±E/Ø¿Dé˝b/lOÅEl∏œ–@˝
™àπˇºév|_TiˇwÅ
ÍHÍ7õ+ª,(5Â||X–2˘â	Ú4ﬁC	Úﬁˆ?∑6;ç”üHØ}“:nüjÅ¿Û8d€±@Â⁄Ñ∞Ãp†rIFËpDêóç£p`rM h‡€Zï)ÙJBãt'û¶”jœôQ‡.Æk«4–â¸Î8œ˝€‹ôÖ πˆ¬¢}â*1r'Èvjø∏DÑ—z√)ø<Ú`ëX$!≥ﬁ µu≤µN∂Å«Æ·Ω…ƒx∞7.π« Jüêqµ>‹≤m66X∞‡A¨, J8aüUï‡˙–BZåq¨{+,ÚZãçîY~7ãº,ï π_≈º'µ¢ ∏’¨ùlÈã)Lˆ\ÀI†»÷ˆÃˆ„∫$W.e˝{sg˘∂∑™Mk™»ã•.¿ßI
X‚Ñ´…˙™?Íj‰fıUÛ^QvJùµ3¨ïx9ˆPÜùÅTÁëb‰ ¬ËôÊa∫
Àö≤§Ùﬁôq~9⁄»§UT.;Î‰2 †B°‘Ë8xsÃyh@«⁄¯|vUv@vhÌA~ıkÎ’ó¶´Q+Ö'c¸>Ï:x∏˚≤&4.¯yÁ^_∞Q3ûõππˆT˛õ√ò
Pë3vQé;ÅØBèÍ LÕÙ£J^éÚ¶Ê¨ç3eù√»æ^».É{$˜coky«lù]¸p≈ 8$†·Ñ¸ˆkáwªß5Q_Û)`olzà‘∞Ò√ı∂Âê¢§˜qvK^KÖeKZ°DÚçπµX<ˇ∆30Î“ÂPÍªäË&Áµ	⁄±πùRc„vÜ‚/ÈÚ∫°!˚Ï—ß%ﬁØù™j∏+V±b7ø®f:¬äœÌ˝≤ËÅE¬öZ
¨’ PÍÓîÖIZ…Ë¨ÏtK„≤1\õh5¬iŸó≈æc(ß*¢’¢å‚.—XLUO2£°ÿ´”“ÍÇ@c0s%÷ú|n∏¬∑—·Xô'⁄o*ç‚DåË‡¶öh'∏¡E«sn-Cå¥=#h◊ÿ¥òiÚÚ∆ØYh^à¶vy˙cd^Ïb-˙]Ëg]”<ÈWU˝†0l¿´è.ˆπâyòÆbº˘˛◊u∫xuâ˚RÜúbv2SÀ≠tØ∫Nbõà3¡p¢Ë™…onŸπºg" ˇLjwX#}•˙U&*ı.+ØW”—ıÍJÛñ’ès¶ÁˇÂ_Ô0%¶È¥\gÎcîØg-âdPí.è·dè∑â…Z‰≤ÖcdŒk+?˛‰ÛXE—)+j2ê¨h∂Gµ≠ÕÛx_BŸ˛œYÕìEdÛk±y’nÍ\}¶k`”O2ªÑˇ˛®˜^®&ﬂ]ZØpG`jöÀoﬂÂ#ΩáúÁ5-g1–ï∫U∂*¶x©XST2W†´LKËB‡¨`^Èïá“n/á“v∞≤]qØÕ*‘¿å
ã’Ô†Xx© 6ø≈¥6I÷«€5ı•±y˝ÚÌ°:5ß&¥W •ﬂÒ‡˘—iíœö§€˙˘¢u⁄lë◊Ì„√VG≈ÕÉ˝æ„r∞yˆ“<‘<{Ö	4oúöLﬁÎπ7|≈ò9µDh\µT@Ûô€«÷CÌ6CÁiÀ\`Á}g‹ß]ü±OMQ‡;î†ÙÒbùÙG{ÊÍ]¯#Äß√@∂;ÉçÃi›”çΩNÒÒÅ;˚=Æû◊™¶Gõ‰`[öPxãîŒ4!ı˙c@Íw
ƒ∏`ŒõáÃÅA¶ÛN.w3z0¿º1 ¶ÍOÚˇ¬˘]äóD¿∆ﬁÿ V¡≠7¯M‚‡e'ÈJQ≠ÓÅ˝∏¶¡ƒ”'<:nù‹?@ﬁêgaî¸Î«»ghê•rz® >_˙{C«0ŒEªQö7yÄ,A’∏ÔD~†sÎ„ëPR!ú)à*Åí⁄Í&àÖ&äQ£ã4!A'Èz[÷UgÎnI•Ò‰x3JÂ»ﬁ¶ëi°ÈR€¿¥Qñ^˙«˚∑íer‡ﬂõ„„ë‹"§Ω°≤_L„ˆè≈¸ :ß∫,Ó‡∞–:g>|s3pØú˘8:î#Î?‰√ß 8¸√zËS~W˛Ñ˙ì?·Ó˛*`c,^ò+†cŒß†;πÓÄvƒ∞œE}Óuÿ Û:-ìf$ß∏ÎAÏ!´„A´‘ØÏ{XXﬁ≥Ätp6CÓÓëä«u“•òŒèàº|K€˙Ö9Ñ0K•.‘©nõ/ÅΩlgRπ^jˆÑ!iÏ≈Í]B8ˆD_ËbPÔΩJV2>M£≤—Ó˚Ç6ÿÈd˘Ün‘»\WéÛ£Ë≠5|%≈X)ÂÒ≥œ∞Lsß”Lr“a˘R8óS4¡…üGÁ–r~HµrÍ),ªÔè˝ ÃÍ°4Dv‰#Æ∫_r+√
9ÒZ˚˙ÔoŸb…≠ZíÁdxÇˇ¡¡Ñ0®ÃmßŸı©“Ñ≤πÚ˙Ïø{&◊Cã≤≠âŸ%∆lƒú¥C‘µ∂EäTÒ1¯îBŸÇ1°ä´Úâ‘D¶_3ëj“Ût™Êc–πƒò`ââù~ƒ o#]∞LhiËL† )L<ZÂ¶h6±’ç†2`ëÃW)˜ïR"sˇÅî”+PFZåØ+´	•U¨xÓg]ì˚RÊg|,/ÔSCZt"mE8dTßö
R«7O<+a‰Œe6˘•Zù4sHØIt#ïì&≠‘¢!¯öØ+ÍÉv4câ9—%Ω+4 ¨z‡§™b\9õÑjÜ«A1ÛkƒókqØYïå5¨QÉy˚NUÀ¶Nç-Â≈∏µzïˆßÓux∞≤=¬ˇ¿T≈Ã‡º¡˘∞ﬁsÉeeÍ_ó◊n?dsØß÷À™'Á´©8@KŸª–Ÿ€K/ÇTìA[éü≤G8$£K
XûTW–›∏Ê'w¸⁄µü=L˙é˜™ö/j\¡
'◊–Ø∆K–è ∆*˛¶S®ô,Bú(rÅ±`æiTâø∞tQ>∞'˝Ä¬ùÙCO•»Lˆ'Êmr	ì¸Õ∑ïJÖF∏.—S6p}ÍáÅ3Ï˘Nï?tYÇ&JÈØ~^˙F£‘‚Äø”SÕw∑%Z≤ù˝(ÿS¯Ï√:1Á*—CòÅ5ü®ß)¡CIä≈ ”ÖÖdí$$d8d‚F‰o¥û|úÆI#rù±2í:•^°F‚D<Ú8aDô@ë|∞D†õóÑxüÔ©CC&LEX`9z±\€∫U•[ì7ı≈Êåë§‰ã ?”`n}Nyñ©¢Ì◊02˘∫-«–Ÿb*&ÜÆ°!–
£[r/§vC≤Ï˙∏&ûÓ~‚Á^<R¯§®>˜G'{BôYG	°åÖ2 È}/!UJøóC€t0ÙÍÎbc>HT∑âOœ~˘2¶/Ìqﬂ+vﬂ·àÖVÌA£˘∫ˇGå1wÌÓÇÿ⁄#oŒŒﬁ∑H≥q‹:=lt»œÌÊO§˚Îi3”}€Å8Aw1Ì/Éòπ2/1sÅ)ÒçÔAπÁì6LÒê©æ˜Ö∏4®ü-yVÔ’`º∆jeERÓö·E\(ûû∆ˆ`7r¢π©•¡¯Æ{¢º-YT_ƒ∆yõú˚A‰åµÓçÂ≠ÅìnÜ}g‹†JsœˇK¢sJfﬁ`ˆô≤‡,µ¥õM„¡Vﬁ-]≥Ñ≤º&.Yí—‰≥∑™q¶ﬁWa6R◊‚G†N≥RòÕén•Ùﬁ∆{~˚òt‚wO¥ö¢¡ìÑú]]!YÙ≈ToN>ìG&Êêu¡å∫îÉìß~0q∆V=?ø¢_©j?âàPÕ
´L‚Ä~;•3ºêp˜EëF]˘?¡!ÔÔÃxè¶!–{¥k¶≈p≠fÑÆLΩ–Qó,ó®^¯ñÒÿß≥j≠Ú«Tís†bº¢ı	¶,ìëÅü¥´.√ºs“cîÃÓ:r{U¡˚‘Se}üU™ñ%·zää!I!aŒº4ä)K√∆≥ì©S;ÓU‡Ü£Êµ0LÎ∑©h±‘ÿÎu^c2N™bœ⁄`o¯N^m7•—?ÅP'1tE—ﬂo“ä`Ç	Ü†ó0àßt˚!c&Î)—/eK)("&ì≠å‡>i¿ˇe√¶tO}°Ò¯€Û˛(µDµO#‰»ç˙#¬jÃΩ◊îE§Y´∑#–ﬁ4pÃÚâ‚PÙpÏGaEˇ^˙6’˚‘!¸ß/¬¬—1Ü7S4ˆâ+ËπÇ–©;ËD“rÜRc0«}Ÿ}éËæÌ±Î_…∂=ü_é1«à[cËŒ«q≈~˝&âã¸á˘<√∏⁄øb›Ô÷ûÆ”¬ôqı%%2A…Jÿz*@ öÂ%v£695í
›·/^4*óﬁ¿¸î÷ò7üÉ(qÉ¿tgF˛±ÌM ªÚZ≈õˆ«ÛÅñKK_pÂx§™/ñœ‚ÂEﬂa¡5Ë˜D«N~ØUÒ—,^6?Í&[E1i4é}Ttz›≥úUK\j—^MULÃÏÓ{’.s·h¸ÑnÙ&m@îß†j-”≠ã æ3t+¨’nXsπÑ”Ûï˜Óî
/}f˙º6ïjHÄjKÜJ„ãßæúAF˜ ®ﬂ&X.ñ+≠òØÄÍ#◊˘¥X≠Xt°Xéòñ%˘Gèmg˙eShAñ/ßFß‰∆Ëó•K'≥ç·ûÀ≤AÎ°¨5n±9©„•†·yÁºX¸„˚_”KâáÕC (UJ>ŒP–uwÌ¿åùùy4RC÷!eÓ 8‹BR-c±FÉiVÕ:©¢J#§‘3ﬂæÌç_˜Oëê¡ŸBhÑwÖüE\ñöKÎx	TT»Q©Ü'hì Ëˇ|<Ö ∑≠5øX0%Ö”@Cì	∞Ç™ê™5@Ø¶O®fV…≥∫‘≥ûìñä4ÇàA5ÿê∆lúM„“√∏’ú`ëpØãŒ1i”P≥ú‡dLÏ6’|èÛø≥1»˘M*ñƒúÛﬁH+/£¢Ó≈˙@≈oYà◊j¬ıEÑYL<
ii(Ê<?!Ó kΩøè5ÿ¬πìK F*ä 4÷Wï‚¸v.3V=ù.ê5`¥@|£k˜r ≠œãΩÄYÄq·Oá!>òrx,PÄ›öÎÎË¥0‡hT¬h$∏Ê◊LåÛ:E—,‹€‹oT“ô¿–ˇ¯ÿ&ùÜWa–ﬂØT*∫Û¿›æLTb./m‡d¡Ü⁄ûRÙqF≠iE.+¢H¢NHµ»‘Îº≥Ò~åKÎƒ|3åNÍ.B∏E◊ç∞°(≤Õ±?îEQˇÏÿˆË+Í{ä‰©~ºÃ–í¡ IîÛ
aÀRGëU¢ñÅœö&¬T—ñ'ûü^»ˆ∞O…§√ØD=ñª≠F>ÿ≥’pK-˝Écäi\íë´êR¸ãHÓçm
M º$¢b≈-uÉ•m
SÍw§A†#c[&hbµêc≠	˝Pe–
{ÌŸ«NX@ß{º cK5á¡0Ú„¸RY©⁄ÿÿ⁄#ßgΩ÷Î≥≥üéOH˚¥◊:>nø°§ögßß≠fÔ,SBÍ‘è‹Kﬂˇx<Y.vCπŒπ!Û.N • NLNjOf`ÚÄZäa»ÃË6˚_yB~ö˙◊cw0tÖã‹œ/BuÛAˇA]RáNQ7â–j†•"Ä&⁄ÖC
f∞S>y˛ÿçDƒê9ÑüW◊e$ﬂ- Tz>B⁄5BîÁÃºˆbá0P≈>_L´Vˇ^÷	Æ∑µX^Fó¸e‰ÅﬁÀ‘ﬂÔB"≠ı¿wC2ı#2S’ËÅ˚…˚0J≤ŒJ'År˘T◊YêK˙B¥Å.™±rÛí)≈àqîÖ`Ù˜:ﬂ«ÚKŒ•É}»ß‡•ì@gùÜºjy√/˛,Ú&`5hì^∞’ß$ÑªˆAK¡∑A?y Ü9 RA={{>ÑÅ—|SÜäå‹Ä∂9˜@’th22k3ƒÜ* îä¬pfv¡¿äÅ]ÚàÄL·êB9Å4eR
˘<N≥Ó∫¡AvÔ°√iØU.πüëã Á0Egıéîb!•Lc« ŸÓ+d⁄˝rˆêÚ¸;S˘Eiî§xYçÇ¡úÇÛTuË¡ÅCQAÕ}“<Oë∑Ï‡ñj´˜Q´Â®{˝ˇ˝˜˚_§E_…=Ÿ"π¢ÙÅh»õ¸ÅhàøÏoüÜ˛7a9t˚|(™ä…Ï—ºÀÓ2∂LÍÎ H‰drI√*›©–NÇ]&ÑŒóbAÂ d∞fL|¥¡jﬂ¿YQÈëµm”ZtÏäíµù¸∂…™
¡m)û§ubœ@r fì-¸≤q8≥“¡ÕêOê§ßr±]^√JHÅ´ÛÉÎ
0≥ùsEÈ˝F ¬¶Œ'oàItï˛ÿõ]˙N0®\0A=òŒ≤mRäyç9kÏ≥πIzÓdF|Ï,»Œ˝ÀÑöŸÏN◊bÄ†ÂÕ<`ÚI¸fœ@øc
FK8îÖRÊM%YcÖÊÅ\3ç·Z(<(•Ï'0?,ÖI:ª
eàÇl÷j}∂|gßYJQqS4é»ü-Ñ/©fÂ£Áàe‘Ïπ+¥U L$fÖbŒˆe˘≠mèº[ïŒ•ﬁ¶0~Ëèú z]mÏ˛`∆≈xﬂ’ °ÂãŒq•∏¨≥ÀøÀÉÔeéıRÍ?ÿC©?GHéﬂ†≈ ∫r…1ÌLºÆ2
‹+∏o9	3Ù"ÿˆ0ΩnπÑo7ˆùAiù|¿∏*ÿq·˚dgΩg€Ù˝7ÈË%BâG~È®v:hÇA8(„”m£Ô„öñ›ñ≈e‰ﬁv9Êñ√∞‚Ñ„î]HÂ1≥Ëœ∫ò·_º¯/5…¡¯£∂&5˝$kò›'|‚^ƒΩ˘™‰q∞¯º#o¨ÀbX&zÓ~=õ:tÂﬁ4Oiy9Üä¯øíÊ»âHxQ0gÈÁÅ7¡ÔÛ¿üÃ"£Óy/êí!u$¬7!∂±<i|)≥ìyJ•`ò˘åmÃ‘ÆÖKÜsƒüªÅ-ÍO&à~≥za
–UÔŒ‡ÖôÌ¯<µo,Ä∏¶¯I›0QTÁ*4l9Ì|ï⁄dÑ©ÍÒ´OI˘{ÃtÅ!˝ÿùúuf„R6lË”ÏT»ÿîV»9àléÑÜ´√ßö≈Ø·•a õªÅÁ¬Uó,<0pÎ…‹'Óoå\MƒÒÑ–√SA€ƒÎòç¢Ú
ÑEÚÅÖ!«ßkŒﬂ Èe>+ÄíÂ¶HŸ/©ΩxZ∂Ù≤ôTå{Î2ßõqN7£úNkí<`$•ƒè%åÖ])öí±ıB¬íÚX‰ÙÆÃ˚óÜ÷CK≈PÆ>ibú	”Ä=#I yé‰3¢ßbDò¡† àë;û6MsÃÛ√g“ ~õa4gÕ±ßrÜ˚¨Was`L%è˙ßUªhO?ê©ﬂ|Ú˙∞s˚BÊ1CÑBÜÄqaËZ(îÌá”‚Ä˝êyaZ3U∂r°b’E˘WnuºL®–∑™mˇ ˇ©˛∞WFd1!§JfUú»ø(Wö¯A‡_òà∂1 çÍïyNõeÜÚΩ:¿û`o,pÖhR›{§Á˜¬‘Ò˙sv=k∂j£ê≤ﬁÓ¥ØdHmπhòDI◊ÏkÃ∫AÙ≠Z’≈CJ”,√¥œLã*Ñ¶‚§J=+≈Ê â]*ë‡Í˛Àøêg:≤´ Oüî54£¶°Æﬁxπ»_	WmüØ1Ú7[ñ¢û±4±P˙È◊W˘6¥Ñ}âYyn∞%KÛöNˆ4TRoLùÒ‚Ô¯‰NZ…Ü›¶àÊ6¶™€¶A„>bp∫5?‘G˚ò“„AÓEó¯—:∫rÑ’ëË'Ÿ–µ˚OΩí˙å€…<¥TÆÓK ΩM…P˜ëu_IPö(À,Î≠›í≥*£˛V±ù¯Ù¢A<|Ó˛@aq<RQ_§ˆkë∞∞£=ZµÁ«ŒŸi˚üΩˆŸ)9l7ﬁúûu{Ìf˛⁄ÌµN0B¨{v‹í‚>^zŒpÍÉÈá0^∞∫‹t<f¨µ0ßÒ–ç`sÓﬂ(¨Â|“ß≤¥9˘ÇgÍ]L∆Ã'T Ä•l∏˝õ‘WqV¢îHSıfèºæ8:juHØ}“"õ§◊Ë˛D∫ΩFßG:gΩˆiãt[«≠&ùE)êÓŸ≥À˘’ïtE=⁄VØH(ùˆJ€ºΩŒûÆŒèÉcgí¯TQ¥~•Hqo
åx@ˇ˝ªÔOﬂ∏v√∂“‚&wVË”3V§=•`Ö~tQW–t2 ‚d;–⁄VóÖc¯ù>Q^áê6)‡¿UÄ]s‚{µöî¬‡ÈR>⁄¸©%í‡Ô'ˆOn:'ûÆV/ft‰¢öÊN4/G;y=áRqì∆:P¨EP“ÉHCDqW¢—éﬁÕ_§tû5œ´PiıªbZ9aåëÅ⁄√ˆm=Ñêî7~P!ø¯s∏!ˆ{)6v‡G`›”DJÍ¶Fã√˘Mh˚≈u¥·gÅﬂw·Órz%‹Çu¨$kŸàê≥;æz•’0u8sÒ†ñh¶pÚöJ´§Ÿx>Qá“õôöájù¯êZiÓì;ﬁ‰¸ãó÷ı1”ìÜ\∞òÕÈ|rÈÂºS◊»©>J6≥6iÂˆäGÅœU)Õ ◊A1•,©¬.˙¸•QµJíƒ˝O]ÍßM˛j÷ı∞t”@ZkD5DìB{öw4XcÖzéÈ8∏˛˙Îç]2Çˇ´=ß“b¬6â≈:‰iƒÉ•çRZ⁄ÏN£€!yYÀC,›‚îºWd‹r]ßTMmz’k¿¡7$£xk;π‚	ñL™ñö):\∞”Y!3?‡µ…9Sµ<ÿ⁄V ¸ìVk‰û¥ÏKÊ:•KçáFz…eà¥Óª·çÇ›ñì§Â·[*g•‡ód·Ï¢"úû˘3p«∑ˇñ¬&2¸[ië˙iGÉB˛˘∑4Qô≠ñûƒb¸[ö›ﬂˇ~@ˇfªÒAÿ˜πFTΩﬁá||›y‰~qÆ-«±,CJ˜≈µÈ¨?”ﬁÆàVY∏á"∫L«¥Ô-îA‚§¯TÒP+?-ÿ+f¢≠’rQ•Ënäç »oÃGÂª=2#’.ÛùòhQ™2∂Na1&*œm.}yéÒ‡Is˘}ΩÒxÉW∆3zälå¿∆sÔ»U≈;ZŸ*›l¨cü†~∑[ö∑v?z3ŒEY’•KwË1ƒÄÔP∆;ıØÕEM”g˛°({M9Wñ£≥%8,õXÌòö|-U‘˚¬RPü¡!EÄJÊ∫±◊Ly uF(πPhî°£
~ÚBñ$ø˘É∫rd‰Ø®K}¥Q+¿ƒV©%«hÑCgÀ“\˙ê‚$‘ûkˆa˙æhu•sR$ﬁQ9·_\qõ¸¨¶˙ÀnUÓ¨W	/°r
ˇ…Çzı?”¢¨¥ÕèÚ{k‡aÏ?≠=‡‰´ú’≈(∞Z
8¿∑ éËVz5ÓC¡¿|Û˜ècn©¸2π]$nûy⁄qN'‹—&.’ò¢x ∏î≥ßwì˛È≈é≥}π˚Nu2Ä¢›œD√™êîoD¿õh¡lN:d{BW∑4[jƒ∞Ã⁄A¯IîŸñ …ÿ
¯’”ÕÁUfÛ¬ k§‰_&}˜Brﬁß∞°bÂœ§1êS˜Z◊åœ‡r¢LY÷sGﬂ+#„{€ME{§ ;Ôl≠ìÑ&ULWnçÖaû˙d∞ò:ØüÙÕì¸1d·FSù„"æ#÷Êﬁâ„§ißæ¿u&4^6pg.∞‘ØŒ{‡at`∂Ã•~˙¬Ä˙¶fãH§›ﬁ O§ùWWBÿú≤Ãø—-ß√Ÿ¯ÄÍÎGw±/nXÒ∑¶Û,e÷Û©
àm	M¥À·Òpyª?E®U∏≠|/ÛØÖù´ÙΩKÒcØR£ó4æwnüÂÿ⁄ë@lè≥º#~‚ë—(¸WÇÕ`ì–[“≈∆ª∂Å—Òª}ãÀ˙º(È.fôî|Èd+ò|‹J˘≥Û¿ü9CÍπ0Â*&ππöP£¸Îr≤ΩrÔ`P—¨Wä≥âè≠H[“ -#UΩÙ∞FF&@πX"_∂‘@N⁄öÇ√(‚Yœƒá+ã¢πûMæu&≥8ûF≠{€Ï[ÊÂ?;3~Tµa≤4ö$µA1«å4≥O2ZÎñ3¡à“9´l	˘C%û”††ﬁu¢WŸíO:;éH4ïéöÈÊS€€„q%r+D¯äI7Ë’IÔ≥ùórü˝∞kw8ü¡Qò‘{Xª¥;T«2ã¶ £á_ƒ¯ÖÔc%ãT?àO~‡Öt1PYEê´,§\à3SB”∞à,Pª˛(KH_ı>÷Ø8·hÎ˛V–Ó˝≥˝hr*•4-ÑyRÑÊeÒôÛgõNbµú§ÏC4E√≠
Uz§ÃŒ¿¿∑–|∂Ò ©˙ö£ÍPÀoh¥9ƒ«î˙t¸ˆO5wÎ≈ˆÂª|êÉBçÅüÇ¥E],÷ó]C‘t>Ì¥lßL>!7aƒ£$IˇA∫f∞%˝¡k–äu¢&µõëJ‘Cœ∞
÷)ã⁄i(5≤Ï[◊Z˚B“ﬁ2¢bˆ9q ‰ò˙◊≤38:ËB”ï√)Ûo≤fπÉuˇÆ3^£{–jù
Á‹Ó¿Z¨å©â#è„«∑™Y'‡ÚÕv˘ÆºÃ¬∏¥˘Y
`åFGä`6]•bﬂ¶Û?ì…∞ûõÃM'êÛú9™Ê8oä{_‘¯?˛„&Ø)$‚ìc/,ﬁ¨ßR†ˆâ-“/„µ‘ÉnÆ≤:ò‚∆Wò0Ü≈c¬ö 6r‚‹ínWÎ;Æòúò≠œ®‡Jñ
¡I–v°72Ïvê¯rÏ\∫c9∑p>ı0√„è7ÒÌAÍ±/7È%ö[9aƒ∆§ô:û~${+ßôˆE‡yC‚a›ïô<Û8πúö˘Î‰◊˝8^ê-©hh?ëù˙>l2Ág4KÛ
˛<vEmQ C`À]Î÷
•–§c«Y&§-qF€5Ö`FÖøcÿy‰zèìé√´L]fÀ$√‰‘≈êˆÍ≤h`&∏vªy@Nú°◊«@0ìRõ~@ ÃÔT•ª1A+√ãÕ†)Æ o≈{»IÀΩö°ﬂI™»2Ì&e?∫a?.›ÿiÃŒùÖºÁÕh1`$Ω.j/¿∂[3l1C«*j`›hsLEOPÚ¡“»˜Áê§
*H‚Ù
m›0m#ëK}âXdfºãbÆÒåC[˜úù8%Ö˝òbÚäáﬂxa√K?´ÖjÊB∞˚@(ä	—»C´‰_2j~π¡h”õ“BJTóë€H5€FUï{Ó∂V˜‹•‹òVa€e[LàÃûÑ†≠®qO¶O•ˆ:òÎ6kùNµ¡©	nlŸfÙÓIÒ=ˆ2›§Áõy~ü<éâŒ5Ö’m<O√1mﬁ!^ıìø–'˚‰-p=yﬁŸú6Úµoa˛ﬂ±¬m‡˘∂U{Bæë≈Mdq!˘R=âç.–êŸ 5ûÂŒeJzPâK/0„'EÖ/öSX†Ú∞;ZöŒ∏Ïcé˛œ√oÛ%~≤Q1©úÓ'<éˇVÆº1ÏÖr˘=Ï]z∂G‹«kò,µykyçZãu‹b:˙OIÖ%Å¬≤Íy9ˇm’ä‹…Âñ±+ä©ér$◊√-Nl.˙c∑mh™'>1Gä±?À…K≤•˚`L:÷$ÜöœùVÊO9Nl÷Ágü˜˚±ùô‚>µ:fiòwf^ﬁœÉ—÷Yü≈«˜YTíÉ B.ùuD∫ï•†·˘éˇh.5ØûÓVI [6ÑMó$d∂2ôˇ«`lﬁìπchH¯7-≤é* v\èëe¯∆˜Á:ëW{O∏/nﬂÂggrÖ!	hâ„÷√iôéñäzë:öv.∑ßXåhìµªBìe)≥Ëæ◊œ“…≤ÚLÑÈ»Ñ;öFÔ[O.¿îﬂU2≥æâelàJàõJ êØ%ó{’≈_fµyø§´ ªõ±ƒ®á2Ñç±ß+zY¢—§]	¯öÇù=Ò¥–SRÚôˆÚZè(~tÜg.ûúíN ¨ÎÚ 1n!Æ¢3Ä]}<€ñµ“ÿºû#úv··Z7¬ká@ fÇ˙	ËˇöVˆ’πåÌ6≤O2Â·ﬂE”Œ±ëäXH≈„2ô™·ﬁ–õ:cë˝€´!òO”A9¿õx	$-u, ÄwE  Õ◊¨ è!ËJπ∆Ï‰òÙ+8+„kπ,’≥súëÒÈ≈]íÏcRëåZñlπÚ‘3{‡YΩöÂÔXE∞p?7ãåY2Ñ=Ü∂y@≤AnÖ“jk?ÊF]*t»å≈ÄQ˝èòÛß,’‹∂˘X‹V%s◊-Á	’ì«ôqR.Ÿ.Pü«åi©Ì‚I¬9ˇ„⁄ô“Êá@MgÍ“nüvwVW_pm õ ûWlOÉie/æGÏ
˚ËU&∑Nê˛Å∫ßU]cüª∞†eô–“lh%FdfEƒÿÃi96u/aï_åAI-‘ódOjî%2®tÁ“‹…dÒÆ“^}˘‘€∏÷Ë˜{XpıË∏›ÏëN´{v|Å5Eªrı’&oi—¡~ÛòQ≈è-/ù»ŸøëøI•@ëË˜oË?…QT]˛N©èS√I∫£…5ºÎÜ‘˛çr¿V≥¥)ç-]¨TWÜuw˝Á'ç7Ì&9l¸J∫Õ[á«≠NWÌ]NùÌáŒBõƒ,róë%›Í
–J7ÈEú0>ü:ÚÒÊ Z$ÖtŸ4ﬂ‹‘EM “Aã%°ê¿aK§û!hﬁŸ´‰8¥mƒ‘ΩS≠ßn¯üMLhc&#"&3ìzï·û⁄˝\=ﬁ⁄!-æ9Ã7¡i˘yÓãÙÜ—«úƒgkB ,-òŸGŒ;¢ÎKÚ∂ºÃgl›O$¸€‹$ø£üõ«ú{ü]t?áÔ∫ÇÕô◊C8Ôû	≈I°nZ˝∆‡ò$ñ~wπóA‚Ó∆…k˚h’íõJïkzk  œ_ö9ö¸ˆ∆≤˛íCl–L4øµ=°tD”ÂE^·Ñb4à@Ëñâ€Î•¨⁄¨îXñâÔVÍ{‰Ù¨◊Í??Î∂{gù_˘o
´¬JËa«ù˘≈.ƒóò+.HŸÈô1K eh≤ñW,rÀ¿ŒêG¿F¬}b)|\í #+xu&N+›':—@"Z_‰Äæ®º†&zë,≤ÆE,ãi◊≈-∏ÿ–àﬁÒ0æaœπ˘aÃxØ'Å{‰uß—>Ì¬“üê÷i [IùÆÁÎ¿¡÷r@µ+À´‰™ƒJ–õ‰)ºf˚Ñ◊Õe|7–BÊ„(ß0@∂î˜õ™Nù `JÖö{¢+-∞πâUÄQ=j√úûu»aÎÙW“>Ìµ:Gçf+L.ê°;˚ﬁ ≈CåZ≠±¬@°8E>x„Nº©Gh˜öiÇÒ®»\≤å‘n∂àTÈÄwqÎ3õçÅ;’¬Èè[YÍR ¨B1ÒD3Sqªì éd=AÁ⁄BØÄaµlp®¶ÿmΩpdÉi‰@u(π™5£iîËá¡µü!®Î!¡Ä1,ë˚7'ˆ]±*zﬂlXp⁄„ï_—£@=ºÑÙM€H‘´-˘¡å$5 ˜l>nΩ¢˝/u{’÷©©÷29^!±FæÖ‹¡öà≠#õVÓx+`Î–@Ê“è6ö‡¯<˝∑r”	!yÌ.HI £®.≤´çQƒ∞ƒT†¢aˆÙS@c
g9AÖÒå‡ç8úE∂R#)#‡ã~◊–∂Ñ»/tuE‡&ônGÚg&Ñ=!ÒU¶/—€j•∫-RSølWÖÈmı˝ŒÏÛ˚⁄¸'^:Â⁄Ûı⁄n}Ω∂ıb/_{ßiÅ$ˆ“-ïôµ˙ª†S´—9Ïπ1Êç6E2¸fØàb”¨?á.Ü”£•ª%Ô≠¡÷Œ‘È!æÿêª(Â=I¸C©YO%4≤é•ìK^°Ëüh<‰üIÌ∂H∫°≠2•R&Ü®:-∑’òEqK5ﬂú‰C›Ã¿6 fæ)’≥H&U‹9≈∫èñŸI∫Ω$¸˜R©N{Ómfgà;àhG€Âöﬁ`ÈœMÍm`∏±†F-®¡m¯”DT∞DéÒwñÜkë0©±›ØA2rËUﬂä{¨(]≠â◊ÊÙπFﬁ¥eR ÙÉ4¶˙H˚√æSUΩ´Öz Âd…ròbÉatC[Œº"æ_nIô˛ù$~ "öã-í±úÀÈ0O,û37A¸ﬁ	-kgvÓMÔyù¨+%øs1^û7ã÷Ãr|úEàk®µ<µ[zé¡ˆo‡[‰»Vz˜ã´?‚lcÉ»Ù<¯ú·†múJ^^Y—∑√k/Íè(˚Ï“ûÈÆ»∫Ωhﬂß-R∫Ã:7≈ÚS0¥O|R±ª<lWß¸ÁÑÔ∆º,v7ó˚‘˘\†Êô6‡7ΩØÍg†-“¢k…LÚ¬ÆV≈2…QóñSòTïÈπ.Æûv8pd<Ã±0√t©TX©ˆ≥ùHÕ¶~Ú§<:›¥ôáMM¯6.a≈yT]	±Ôxˇ#ôYÖi·Oø◊ÌKÌß˝õ3œVŸ¿‘:IÌﬁ8x‰w∫uˇ)Uöã…ﬁM0m˙„˘@4¬/|∞J]˙?fu¢êºﬂ6'^<.†ûÑKÛËlVDÕ„l¡î[˙B˛lIm∫ª MxıËQ¯•±˜‚Ã"Bùû]”Ã&Ò6lyF¡Âô]6G∫„Gªn≈Î ƒÒÓ˚€ëb‡y’˜πêe Ææ™»c∂$˛íÛ2ïYM+é·®û˚É¸∞.«ä|´´„±R‰Ÿ≈æ77±µ^˚Ù¸¢'ı°Ó5^w≥w’&Äm“s.πìƒ◊w‰3Xâ)n?ì⁄Æò=@»†È„)L.nŸ<ıfπ†·ïõüƒûmòëri6ÜØ∂`RÏf/hÑˆ-∑≈ûàÌº˘ê‰m⁄Ä ´mÿäj≠†o®ıŒ”˘Ï’„Rû, [¯ÑŸÖW≤ä`¨Ïê)√ªÙl˜ıcE›¬§UòK?àpó§(Á¯˙§„_ÎKå—+ã»é/CÌSA…Oo¯h(>ô¥? ’´·x[64A<¬„PbíYU>HIÿR _Ä]¡$¢2	&Ê0∞I"îìáÓï3GDT\`iq<Ï‘üÉÆ≥—sfõ¸O∫·ö»&WÕ/bv>*úg$ôÃK‹x·â3ù;cqD
 -≥Ik≤¡_î‡ã≤7ƒ.'Töc	`kÈ(ü”/ÜêóaÓı<r√5£˜ XÔè/âu‡ñÚ≈ûΩjè`µS⁄cÿfêÚ Ëõ“√B%5ÿtdô^EDıYo⁄ÛÁ˝≠ú_∞ΩÉn¶ ´ˆ…!lñ
¸ô◊_ÛÒä2∆êp|$Ÿv‹´
œ*&/	òpˆ§E¸y·‘∆˙´q|˚¯ +ócê⁄ãœ1–<ˆƒâFïâÛπ\[gQr`pî±ºu0t£
•#ö°º]ÕœE:Lì£∑_Ñﬁßq&◊∫ú|ëÂ'€˜¬˘WZ«¡V"øa≈¢ÚZﬁPúOnw¬Ω∫.çπ{~sÏœÂ¢lâ=:Êƒ'¸Xß~πÚò…'[õs€‚è7˙ùÙ∂ó¯ºd¸ÔK3
cW≥‰ûø+>Q ±∑∆&¨aù‘û¯Ç~ÚV‰a¥¿àB1¬n‰N‹=^oîáÔÔw∞Èø£-Mø≥¬Ó∂V_Z_';Ôs¯˜{¯˜E˛®mUﬂ±¿F–Ö¬"ç|öÃ¢Òö€8	øcﬂóõÏT´K€Í”fLÕ»≠%ÊsUËû3$M‡'CîJ¶F?≤Ç¨Ié¬©éD4∂5q+*„íLåÈ92Ê4caVÏ˚˜ß≠_ﬁø/b»	¶iFÓµ(›xEò≤rÂ}ÛÛ∑oâãÕ≠ñ´˙EıZj¿⁄˜æ´“˙[ÊrÇ+1R.—^õb{%[+ü›ÙŸ…o-	_ódâpEÃÒÔ˙ﬂªÚ¬ÃäcãfJ™“¡ü	´`ÑôXS⁄ùµR©‰è*·¡∆S$æ°#ÀºØL¯≥“Ñø‰ñYónÁÂƒ3Æq∫Ú‚jS {,-p§yWfò™41q∆y^2|5µˇ”˜RYIﬁΩW›Àl\?πãCˇzZ∏â§`˙∞;(ØˇéfëóœÈÒ„“˙y∞|3Á7†ƒÛl&”’§+rèºi»	Ÿ»ã©-2≥L–LuœõÄ‚¬öP”ˆÛ9ﬁÿj]ó·cË≈{^∆AˆyÌÏÂO^∏&ÃÄ}I
D:=¬¬ÂÔâ˚—2wR8JÆîª2}¯%aJ$∆˜ıj^hN^‘}˝aàG.Ùúª∑ãÑÃŸ#}ç€3øñjÆ’”Ù«``¯¨˝«µz‰ë|UVè4ÆØﬂÚë{WÎG∫’√Z@ÚÉÓ√
 Ã¡ì%d∞ÑR[Æà5$]¿"º¨A‰èÉ˛>†ˇ˝cD*Ö˛ûå"Y†¨lI7π„(}ø'I˘Ïô1ˇaç§‘$<JÍÁ∑m(≠§*dÓ¶·0Oì¸˘ÌL∆4øH2K85˚lníÛ„F˚îtŒ~!ÁçN∑’—èfπ≤L,QY{•\c:
mªx⁄ˆ;21ßo‡áÈ07ﬁlÏ≤Rê·|8ƒ≤Ü˛4$e⁄à
èÁÇg^obt„ZÖ¥∞D|'Û–I4râ3õ}ípÇµ3¶N4ú1Élü;Có˘¢å÷~7≈(J¬™l–ÇëI#¯3NµÖ?Aù…Œa≈H∆Úç–ÿ∆Ÿ⁄∂ô¢E¨‚1ô,»≠„_á9F1±’≈L2*^¥dút∏.\oiü…>∫Jö’^Ï©:“Â3O\óKt"Z–ÀÂ=Å|BOØ’¯˘G.ñÎ äôÅ<Ù‹êVå⁄™¢£ôûxËÜﬁp
√C¥
hDd«˚Ë—ﬂ,&Ò/†70(†:8jcsrå≥Iæ—◊„¥$Ñ≠⁄^)ØÌö°™g≤@Ê!eKu‚f◊’Î,®∏‹SO¨Õ¥ì€PB|§>i™÷ñ'M>ñÕ§+ıi<;Æ‰W8ƒÄ˚–∏⁄ˆp∫„Êx/ê)oZ'Ì”69mt:ç^˚/-.Z»Qªul(Ãıõ0Á¿ÿ‡∞√QEáƒaÓqô`Çkæ¿sfÏÏ9PA0ÔÉÅ/ÓƒÒ∆ ¶XVsùÑî6˚#ÿ¸ 9B.aÖ«Ü#H™≥"3XúòußfOÄ ]Ï©
Çh:;ÅT‚û¶fŸƒÃ(t
qvzË|oCüçíH¯{/Ò≠&]NÂÀW.m0ÍÄD–FPÛ∏úá2p†AL¸ Ùég‰»¬à¥…îäü|8 Ñ√ Y˚†⁄†lŸÆäpÏ¶ãíg¬{™;î»…ã=8•qR!hÌ£X©’@NÒ!Ù˝´+◊eb®ì?í‰ê^o‰NI˚;‡æóÆh–Bü—˜.=u‚c£ó+z–uÇÒÇ8WX›ßù¶·ù¿@Ae«O˜ƒ≈Æ+äSg¸ˇ  ˇˇÏ}YoIíÊ_ÒJ‘÷$QºI©UlQÖ‰!â”ºñ§J›≠J¡Ã`få23r"í¢≤Ÿ≥«Àb1ÿÌÃÏ†ÅöY†—Ï<Ó√bˆ«‘ÿ˙	kÊGÑﬂ·ëLQRµ‚AbF∏{x∏õõõôõ}÷ü†LD÷±è«§Ü±»“éÅZùOÜm÷U|[áÌ§„88íX≥Î˝Ìè%©— ø5Õ)£≈9®(ZZh®±Q*\ J´g„Ì$k#g+t'ô=E∏B¥˘ı*
OÛH®JØûeÀæ«´’îWhD∑€Í&ërß/æ´`rÖÈTl˛3~Ã`„{SœRZíBíµ<]ıS€öÉm&=_w'='.Ùtóu~ïÖkπgŒ÷°Ü2åw
äxÎîŒ €å≈±Jûàü)d5[Z2#xZ-§0•=C`{Á—” @√&—w‡?3πCXB‘„,~ìƒW§ÈÔv§uI—◊45Tﬁ∂'‚}Ä.€(¡ñ1Êü–X^‘˙-îd'»zŸNÅc„ÆØNççkô<Í;~é†∏¿ﬂ‹∞∏¥_Ù<ú!ﬂ*;≤2ÈåNïYhë‘±<˝ﬁ ı◊Àıf÷6St÷ÿets7—ï(≠˙Í¬5EŒ'µZäØ5÷° ºˆS∆ï®ËLÖ%F~A…Î%Î"4•ûËU¶òå!ö)–@»@√î¿Æá!<vˆª≤¨ÉÒ¬¶ØƒKbpÍ(ﬁæÃ7¥¥zˆdª‚R¥#J,t‹¶œÓx,˜U⁄0Za'îXLV√·Oöﬂ≥°Ì%‰≥ÕMŒx*“8ö ^ÂÀÂ$I¢8VôMJ~VqLcu•ÿøÊû@ûpc'…Iû3„{å¶‰˙≤üñﬂl’sÇS%,πï∏0‹»LXÏÀû:ú∏dø:P¡â1˘D4Å“Fö‚g,ò˚^$~Ô	ôQÉ∂è…ÏCŸø7n=®À¨M?πjGÌ≠Iæü∂_Ço˙eÔpÎêqåV_ ¡@±37
\á]Äöû˚`K∞¿ç8≈Ì‰"aG}’ÀP‘€û¥˚Ò^ÖKTπÿBê©-&Õ;_l¢ü–Ù·}àDÃô≥«·ˇ”õ˝<è~\õ…æ¿!?Fì—Le˘Ó˚Éﬁ 
 ˆV¢üí-óhíSseMåäewqÈﬁ£aÈ≠-~â<πåÛqÄ˜Cç≈P±–´°ƒÃˇ¥,ó≤”Û¥„‘n>Æ=∆ô’R©ÎEVg†N Õx±-c?Dï‰ˆÅ7ÅÜF»!B
Mä◊l∞l»põﬂ?ÑyŸ®ˆ•4¨π/æ‡Û≥´Øovà¶≈t≤V<Y5ûSÙ}SÌH•7´_´
r˜•˚˚ÿU∏ô0«˜^Ù	`Aé'™I‰z>•†vGªIç¯ÕöªâQÙcﬂQ“æ}Gë«†ÊÆMÚ]%ÌOª´»A0¨•)v˘6’Ωó›EÌœßÊ#⁄a>ÆæÛç∆Û(H!™>WçVΩçu¬∆ïûü¡ö‚t]d¬µ¶ììS h·O∑?Õ°Œ§ÁÈ[Ø%ñAﬂ6tä‡ßÿfÁ>[)(ˇä˜l£)]9]—Iç⁄8„≤_üÏg2ÖÒ suÄ,T˛9◊î–bfi{ÀLΩ8?ïπz´¢ﬁÙ€&'s;™óËù˚xyÄﬁK“€∏√7PZ:â9‹GÏ!£∆Ñ∫”ËMElPÌ‹;jéÆY•“©Ù[µ°»e˜aπåÍç£Ö5◊Ãrºî≤ó“NT,Ò“;·vZá≠'ªdªu∂˚‰Ëdo˜îÌ¥ˆ%¨ùÎºó^D√®o*±Í…˛PL_(u-…èFÒpÛOπÂY≈ÈOÛXZ4ßñóY`››xB4B©ÊoJ*ø\¬f≈´ﬁ5kùƒ®Èµ‘ªf≠ÿÓ«F-ınYk…>≥≠=r≤ª›⁄ﬂ€¬–´£Cr|rÙ‰§u@ûÏÓ¬≠£˚Tgi7ã‹/VZxHß∂\ bfm5o b⁄DÀ“ ütΩ≤%‡JÓæÖ0Ñ⁄√ù§9çC/∂óÔ≤PtÇ1Z∫ë:∆›ë`∞é„©söë£SX§[ ıé2ê≤`ùÇ0Rz(ïãN€MÆ_	ÎÜd€ ü_™áúd=…’î$Ó-7¥,Á“ütπb⁄ú≥tTÊ†¬ Ô≠HœôaœAÂv≥÷ùBÌ∞∫óu1aî0hz*fıÅ∑5Ê~ÍúS\≤•∫9áYÁ”os“»ê«.∑∂\5]ΩÁÃ8Rˆﬁ¬¬≈æIRXåTjß—N—yûˆ/1è˛<Oa¯‚)“AÒ#C≠≥¯’[x±äõØ◊ïö∂u¿õ√Ü›\5kÍ°M˙ﬁÚ√wø˚/§≈3.ãÔ◊∂€ÆD&v"ÈÛ5eHDÙ’5ˇg@ﬂˇ·_êÒ·"è4ØW@TÔä	|ñ€S¯Ÿƒ¡Ø+F€¿ßpôèM=\˚â‹Â+Ma∑182ãGiû–p\L–ë`SÏzQU
ü∞{¶£<„Áb¬ûä.R√.a… Ω»•3ô=Ù+:+ﬁc`àqÎ2b®)•w∆C´ËVç" ˝~Fa{ù2±¬9{ª€®\π€´◊^7ŒûF£q“F.À–’∏C°W“/¨€"…5ˆ£öl—¿˘UÚp∞5¢âSÛˇZÿ:=ˆñgç≥ö˝Îû¯MÙˇ…≤–y^,ª¸Ì
0©o≥Óy‘\Y˚j˛´’˘’ı˚ÛÀã+˜Ê^V%^+_Vd;ñ_t/ÏEÁkÑÖ∑Ú£ıùB‚∫£·≥ä±Ôbö%ØVp_…aè:ûiÑ5,.\e—(ÿÁ£$Q?æ◊◊Ám∑”c•¸·ª?˝k¡cN‚6é⁄Ñ1ì•p˝Ùä˜F8 ªÏwîXhqw«—[;ãgébµ‚AE„—˘e“G≥õ?ﬁÿ[r≤V+"ø}ªâ˚åSí?‰ÂE;,ü‹xƒvˇ∑˙ìïXçñ»˚æBgI‚†AÃ}®8>—È∫vt_ƒù‰r†kJ úÏÏ>n=€?˚vÎŸ…·—≥≥oè˜[áã ∂≥d‰v6u`-yÄ∂püúÄ2ü¥IHJ•$«Vy≠…R4*Âœ…¨„I.ˆH≤i€∞ë≈ƒa‹Œ‚1P¢ìù8^Ùåâ∑Ó6q◊à†2∑{ﬁzUlTùçØ:õ=^AaT∑ﬁÙ} Hyï”Ì)∂◊≥rw∏ﬂ„u'{>{QÂæ_¿Ïˆ˛Úo∑ˇ„ÂFÒúÓΩ3Y¿÷˙åÂ%"hùtº#çö)„@ïÅø åN–<ºêõÔ—#Mı„Ù$'Êº}ò¶ÄËõ%Ê^Å∏L_˚…Ï™¿üCY-∑êP<‚x1ß£„,E]ñ»/!∑‹Chdz≥§¨zµw@û`ï%…"¨	u'Ç¬7∂≥¸≤›éÛ|÷xÆ+åƒ7Ëòe_ßd2⁄/≤º◊#¬X‹:˛ÊÄUÁë⁄00ì=E£8/lÙùxå@j∑ÉÉ≈6˝Ñ<CP·;"wÙ∂k≥ì«Ê´VìIzIÚK˛«Ucá†1} œÍO`(Ò†â4>óynÉ\dÈ Îd“®gq7…«Ÿ‰ÎWAÆ{Ñ∑çTˇö£©.[√ÜóıÉ§@qMªn˛VKwÃx¸XUgÒ˜mV;<,gÓvÎÑµvÎïR±YW=˛ÙNºÆı¡ó8‘âÌkŸ‰ã”~Æ TG÷à√)«Âäcúñ»^{ï_véGØ≈! KÕ„¬•>}”V¨+˘∆
`ei√Æ≤£Ä«˜]Ú8Õ‰D.Ùp4•<†iá¶BôK±eÍ9Û°Ö7I7∑äﬂ6&çLπ¨Lœn6öä;rˇ‘¥@x‘z„h⁄°µ ´BRêÓÈnè\Ÿ‰dË;çõÎh›µ@jÎ,n{ÂtÁ/—‡˙lÉ£æ9]‹∑°©t‚BNXk-Wl˙Ê©®Õú‰p¯Ws™æÚ˝˛éPü∫¢“Ãπ¬gº‚;é+kLH"±Õä<⁄ÂÑd@Ω'Jr©ÉvÂ≥]eπ·^ﬂ±¨œÃ–/◊Pïje¡“ΩzØ…‚‚b…ıÊôl≤°8êõÍîÈ¥C©*=*ÏtûÃ–c∑^n%¯W#ƒ{tVù⁄Í=˝q/êéz≤Ñl]”&dß}™ó¡ò#Ü”86ˇnHúÍÛ≥•pI¸Ë¸’ÁRG fDcºø\ ≠s){4YXı`&kK·IıÊÕ·T_/FfÊ´¢*«‰v:ÄÕd\¯áôê…≤µÛLÆRwqW¿H@î£CöÒ.RU–≈˛%lk.]∫HÛZ"UíüÛã7ˆc‚π‚I”(xp~Õ~3@œyræ◊yà⁄ó‰€óYF≠|ŒœzIŒ≤ãn
xÛ“∑î
ÂÿºoqU≠I√ƒPE°9Tt≠:˘ëí¡@ÿﬁÊ%ºhP,≠} ¬N|∞°Œñã®áa<†M"¬œòƒJdp≠û[ln<zm"€ÕÀ€6 éÄªÈÂ˝ Èz∏÷π∫Î°ÅﬂC˜∆‡™<Ÿ‡≈l≥[ƒëqå∆∞q≤b≤´v“3v°ÏYìa&EvÒ}\Yø¶o∏Ô
÷≠x%ÂF°Ø,⁄†`òVìë‰î-–ºMNYS∂±´¨…€î-¯:hE@ΩM="®túŒX{S
ÿ°Z'5∂ˆû˜&–ŒUo2e˝-‡
tCŒAbÜñŒãﬂãï&√fcû4Ê¬â6®\•Mõ]¶e{•<4œıC≈¬x-{ïOò©2a„¬∞®’ŒΩ¡M;È0¶ñ¨É¥úØA\aG>ºÏªgôë·ÌòÀxõƒçd b.¡ˇÑ∏™‘oÿ˚6‰˛T®5Â5Cßº¶£tÂàE2ß·≠5_¸≠|©'-∞j∆ËI@GhvÆaØTf≠‰’Çâ8HÃCæà´b5Vy9ò≤Ã®–≤\ê˚˝Æ$+BÛz†–„wõ_tË(ö´å¡ó/…ÊZE2é2ƒMhe}!êõÀ6÷ñÁÇ__”ÿ"_Ü‰SÀÚ"_ñ¯B·Sú-V »WŸÿdò/Ô”Ôœ”üuM; 0Ñq¡ Œ.5Ñq… „ê|Ó“[x‡5ïWœz´á œ”-ZıÆ◊ì˜U‚[ßœP≤⁄…™.HæÁeD5}©üÚiUU\Í™Bçr∫EÖ5IÛ˚¯ª;ﬂë®¸qÓH®π⁄ëﬁ≈⁄	4¡¢Ã|¿R§∞‡L∑jã¥ÕuöæÛŒoaÄ˙8∞0ö}Zƒ?íêπeLµñò≤\8‹π^V€ÈCæﬁ≥b6Ösâ2üñê„
ﬂk¨¥⁄ÎÃÿ¥$ó€∞‘ïñ%ÒÖÏºÇûÃ€ìîÖØæ©◊ûÎ‘b ı7Û’WcõﬁÌEéª_µ≠«3\{a+Ô.‘ÛﬁdöÖtúO⁄w⁄M`∂»ŸJäœü˛‚é◊û÷}|ÎÁ™7˘¥n>⁄u£úN≥Çívñ ^[Ìt0àÄÆGÖò⁄Ë.íc<E=è∫˘<ŸAør≥Pmk&ÀK=Ãæ’B£∏kfB°≈|‘O∆Õ∆|céz|¡MÏ,¸' „≈iÁVöˆ„(¸Xˇ=ÆÔÚÃC|˜ßÂmøñwê8j&Æ∑6eã{ÁÓÆöÀ%ÛÁ¢x˜rNãbáã¯≥!JˆI2é˙I;–Ÿmú•√Ó£kÓÙÇÓaÏŒπ>+´7.ë€Um¯‡4úm˚œè)zißCÚq4ÏD¸F}~îÓâ»ØÅSÌ.*:p_	Q?ìdáÅçï{ÀÀçyoQ~‡—8>zæ{Bû=;©®¿Ã∫çÔˇÒü+
ñÊ£∆˝e¥øUî…å†¸UöΩÆ(Õ’Í∆…Â∏◊èÛú<M∫=≤{që¥ìxÿûö≈õ1ò™é ZBcˆœ6Ωªy$Ësî√œ~º@3ã√OöwéÍf„›iaM∂{C-ó⁄òk üËêAú/VºüJYﬁxD√Iˇıeí≈9IÚ¥O[$O®ÉûÛ∏AVVI Å IécóNròö!CoÄ~µY÷,Å^	¯AO^—!y[x—8C∑‚Ù‚Ç”që<6G˜∞≠∏õa¯†„HqΩwôÙ;tLËãáÃ«æ›œ¢Û~‹xÈy≥wÔ	ˆ≤nûÛ∆"zÈ›ΩÇÍ«àáÂQÁ\ƒ}L L˜6ÙÒ•˜l ‰˝ÆÀçƒ¡8]ßß∂‚TÌ¯OŒqˇ2ó\äp«y?O:„ﬁÊı∫Q~|*¯±ïLÁ‘…ÊÇˇÇÛv3◊,!Ø≈E„;äº#:<clÓA⁄πÑ≠§˝Sçó]ìPû
$ú"‹’‰§’v30ø√8]8œ(êÇ†Óœˇ&âJl¢•5 ôtatôç˙Ö«øâü¥Z‡'ΩÌ7ºXD$X§i(ñMÑê·!èv>Ç›?TºuPÀ)(?ØÅµ:]S¢(¢a2¿Ø]ˆÛ∏aó›ûˆÓ :W†ÒJ±h·7pXr∞FÁ¨—9‹%ê$è5>·æÇ€È¬q“Où Øû}eëPT°Òh?ì'tò ø§M;4O˜ê,Ó≈√˜øt∫lO'tÒèq;¿X¯w`ÿ	aSBxIΩ¡˛9^Ùåæ}ΩªÑƒzÅ¡,ﬁ+j˜»qñÇ¶ó–Èn0[[ÛÓ„⁄Y./
Q˚]ÜXz√*Cœûâº.ﬂ™Iªñä ˇ‡ÏG≤73™∞BnoX¿<>Õ∆®§-Dów ¸#˘M$ÏñrKû5Ò/l{÷ÅΩ(ÄmÈ„DÑ< ^aím=RjI
·˚Ü@´)XX“^8Ú@¶‚ñµ¶ ΩÂG„.SIwGÆiÙÁI•›ƒ…7˝	q˛›ü˛âîáh∑=jÕME†U¢±Ì…„(ü˘¢ÈπôA|éiOjö≥ßdÜj∞‰X≠JŸÎÉNåZg3Ùp`\ésRç©ÓBˇIÑ˛6ßld:⁄ìdKóßƒM«¨ ∆wù◊£q†oñ#u‹Ç~ù¿∫C¥µ◊®≤è≤¥ù¡d%CfÌ@G)¥Áœì˝8ï›aí˜Ê…EÇˇc˘ø¬‹ †&]–∑PZ@PhÏc%hgŒFÀÉΩ£EÑ1Âﬁö2@∏À‚x∏pˇí¯M<§ˆ
&êŒcº~DÜó¿¿(ˇË≈—õ	…J7í
É–ò‡|Hv9Ñ…Œù]±çˇíZôÀ§ZLóÔß]™Nëe7L¶4≤&¡~÷jHõ"=X.tºï[DÒ[4]±◊4)¶Æ~‡Ù√˝4Ç+BÑñ≠zR>a]◊ºP—?ùÅfÛ$9˘Ø/c‹eO`R°≥NNÊEErßˆE˚€&ü∆˚gù'4Ö‡\Uñ‘2Êûñø±(Mƒ4¸“åÎlT’iºæˇÌøëkË„- j›9Y´/,≠Z‹#˛h)˘¨˘a|Âfﬂ”≥{ŸòÜ:…€ÖıÄå~‚})êS2F QYÇp#f9˛Ù(ÒM^“R˝ O-Z¢VÀ@ÿÁ“CO¨‹√p>`∑ó pòKÿUvEëº[∞B;y'≠:`˝<«pæè±X™;]ÄπÒ¥Fu˚j5∏”\ÜÕAq±Õ˚!ièû∆YJˆ:xR2ûê≠∑d“‹IrÿØ'9“%ã…‰§Õ∂ÒAõ|;üHåT ÿ†.Ω§ØSÃ•£Ö˚§“Ù©⁄=—ËY"‘[+íÕ”ª%Î}.¿3«ÈhaôàÙ[£ÖDD¡fkuÂ†qN˘æ›∆yÄŒtU–Nî´ÀÊ&£nØaDêŒ©òpÁ™–ù¢ ¨Ïº6KÔ[∆ƒÕL+ —à“ÍµØ-Î‘!ï]s˙2LŒ/|N¨|-[¨c,…lF:\SBÈk#ïıå¡^W‹∆uª•FnG˝®Ê ∫5›ﬁ™±ñ`ÕÁ¶“i	|˝©òT0¿,Ç≤H◊x‰ ÑáKΩUküFÅæ!^ÀªﬂƒËRÖÀáCÿe&†˘j¢Xˇû˘—¥´xå∆«ÕjøvÇﬂäÛaPRª¯ñ∑,∂Cî{A≥t5ÄÖçkÎNàµ:0Xı·Ø∏π¡ßså¿ñ}›¬ú…|†ÒË,ÌDìø»ãÉ!1òUXQˆ~H⁄çdk˜¬íA†9N"¯
úhËÓ¢êË‹,±„Ë˛Üπ5Ê§…n‚h¿®G›¯Êﬂπle∑@ë6ßªG91◊:Ù3Ö3Î“ÕàéGΩc˛~üÌTÓöËî,5q°©ú!ì$]H›MT›E∏aAØ[h>ûÙÅÔ_ì+<Ùﬂ Ø>7ßÁïœ^}òFÛÅÖe∞≥~k}ãå™Yi÷y2ó>L€q4å˚uOˇ+—≤)º»ÄŸîıP)´ù“≠ç˛ù•W’p|Î%ß9Ã7ΩÏ&§ôÁ5}ûfØÈ+—∞‘ˆ»0ˇ∑9)˘®ÊRÈ Û_3ìjﬂ7ìjó%îq/…IƒÖÈp≠ È$Y‹””Ìq Ú_pΩIãg‘ =7}
¿£kvræ˝jän¯cÆtÛ¥)‘æ=ﬁ∏Ì4Ìπ? `ˆÖ[¥"í∞ªÆÃ#¨>Û»Êi⁄Kà™-ùäπsz1êzL+0´;¬Ñ∞¯ò8«ÂÕe≠:n4Óı”aŸ-≥»¿~U´Ω "2Ω5~ªVS¬™Æ∑%ÓªS
_NÜ\Zæ¬ë‡vŒíS /·ÖŒú˘Yäﬁ_õ⁄¨R{lÓõ?ﬁ3˜…a“Ÿ†ﬂıømê/	ÆÑ≈azÙ˘%i–[0)ã∞ßu“JÁÈ)Ã”∞€\ª?∑ò_û√íiÆŒìı9∑[%wW}ı√w˙áÔ˚_øˇø˝ˇÁoÅ{‰}ì,–LÓÂnΩ7àºf}ÔD/‡ú9zZ,‹tÛ&&õûE5Ãoó4çπÚÊc‹‚A2ƒÎñ·ôª˘$ﬂáYäaÑibw¡BN´,9L«qNeÉ\—J~5¸’P˙⁄£œøb—´ﬁƒ7≤£,I≥d<¡qP»óy##ÉÁâWàY§\œXy8eˇ µy\mKágs«ΩIéüc{q±Z±‡IÒ°A6À„±Á˝@πQöc´•À/4$ˇd«48Ou7–)O˘Ë©á7q$.*x≈∑Á·+Ë+!k®ËãØ¨NMŒ¢7shı|·rKæ!QN]…kr.d≠
ﬂgÜ8kÀÇµzŸ^ÈÍåÕt¶ÊYè‘¨#(&ûñi˙˝ì—…πêå* F `åõØNô˜2J˘“G”~8óÌSo4ˇ\ëÅÄ~â[ä°BÃÁ◊2ãª˘Ïï=èMPÌÄÎ‚DG=∏—s÷óoupì…Á6•ﬂ»¨Nphßò¿€Rç*œt¨¢Ì6ºße/kÊUM≈O)Gù°¶:¶VÏ:ÇpÎC¬˙$æ ëvÄ±_0Ëì∏<jä“tZ“;ëV=†UÈuYûÅè¥(óﬁï∑4∑
iNÎ7Ì6¸˛9˘M$#´CÁ•}7æ”ßóÁÉdÃ›•aS)ñU;¶ã¬P ‚sòºı∏RªG=Ç¯=y˚ãú‰"√‘8IWQ°>~’E_ï~gÖÁY&ÒöJ4ó⁄âΩè/öÍûP÷˜9(Ñ{§›3<“j¯£1Ê∞‚t6T¢¬ôˇJE‘ëK¯‰≠ù£Ôdö!ÛyèD†¥Ed¿O*Òî‰¸ˇ<ÜoâIˇ»—È©Â0Ë˘g5ﬂër•˙F⁄7;‰7ø!ü9ËÜ«WO`„ºJf‡SR´ùsEá ∑«™m∏}®Ã˜”€dµ¬Îå©◊ÒÑ≥ÎGTfÅ˛•V8õÛG˚øLﬂ@W+0∑E∑aho—a◊i¥€mÿÌ¨pﬁ[{S~Ú•¸∏|)Ììˇº)ˇ<})Qø:Œ‚7I|Ö«Á∏ÛÇzOªGLºÍ≈Cÿâ©õU/ÇqäY¡àv\ä;qßHD∫P•”€Uc≠ñQÀKkÀ“Êàãu•<Q˜g€úM2◊©èù$Ø˝‹È˚?¸ë∆é|gTˆ92úT≤e∆d}¶f6◊}s∂X˛!/ê·‚íÎG
caõ¶≥5ﬂr⁄FcPﬂ≥UƒKy;ú!ìí%`D≠A3ã7tqGÜ•£¥G∂’T∏˚¯sh⁄1añ-Z£À”«˙rŸÑ^≥dfÑˇxì⁄5€)R±˝›ﬂˇûõXøCKﬁÓe¿˛≈IÄ:Ï!@üG-Í≥º∫‘W⁄@e÷MØ9çﬁƒ≠¸0æ‚\%,ΩfÉ*á†ã¨5ˆÕí7)PÔ¯ cEGPø÷A€‡4¢H‡Âßíˇ˛	é⁄Ó|¡„s]Õr¶òt=ª `Ãx⁄ôiÊÖ-îÚ¥∞[?y≥‚pÅûÕd˝˛?íb¿J˚Ÿm∑àZè,‚Y∞=ìº¯	:ãÈ«˛,:∑ep∑◊n_oY¶R9I)
Æ~ıÂ˙ÖMícárË∫Pd∫h¥`Ó9Lπ±©]Á„Ïp±¨Zû7˙*ñáôeÕ≥ÚÄ”WU∏5îÛ;ﬁj>™®É'\d?$c¸D£⁄K™Éå£søgií3ﬂ¢84–Û<®ªòtÍ˚óz˘
’qXÀÀdêàÖ[eüõ¨U˛B+æ—¥√ù,≤X:}Úîsdn£âúŒè˘Í¬k‹ﬁÁå!i¡·Ïºä©v.D¥ÁõÁiû∞r1Ô¶DëÛS√°G¯¬»7¯ôîW/≠t˝;á∆µ¬”+C‹›«W⁄nuOyﬂ}€˚‹sæœ˛Ó4%"e3áö⁄f+´≥g∏´Á©0q¡–åﬁv'v˜ÅàóùW:æOÎ*7;Gπ€∏…Õ÷Inf.r3têõ⁄=Œ·bÇ]”·T˚$Ud	7¨7¿´WQP?8R@ÔuÒlè‚sòä”£A4∆uƒ‡
∏˜'N§T|á;“”)˜ŸùGl£ á«‚a»Ë†“cu%√ΩŒ[s;</3∂¿ôT9˝ﬁL…B˛8≈Cƒ%6vf⁄≥Ω	Oª@ã€†&qÍôú≥ùrõ”(}òøP	˜%àyä/¢V£+KKd;Í∑/ëÆhçÍ≈hıˆÙ]ÚZYﬁÚ&ça≈∂Åå±zÈÚ∆íØ~± t*∂9Ó4t˝Ö4ôtàÆì|ËÖìÖØ6˚aIü[º¯‹y9–’(AbLN/ª›8ßÜ`GWI^Ÿ (ÏÕÛo€ÄÔp°ej_“Jƒw4£dQjƒïÀÛdÂ•¯™¸(√^Ò‚Uî|˚˘ı≈Õ´‚£@ŒXv¨Ô2ay+P‹¥é0
Ï˙Ù£9˚3≠√0&ÊgAÂUóœ_ ou≤@*ÌKSÜ»ƒ≈`Ÿ∫ÆGπ‰`4V{¡îø©ê@πÎî∑î&©.ﬂ≥Àtºh±_P—®=¨•îØóÓ◊m3HÍ6ÂÓµ0πª*˜r©?ÔÅß≈i`£‹w4î?¢jWîa6B›§ ':|∞…≤_^^Í∑ùcXPæ~MôﬂÚº–· Q‘∫«ÁRéjZÛjñÖú>ï¡+Ã¥F˝zÆ™≤ESX…$kÉ‚A ∂¢N◊+ÎÌ√ı´+DË·?“…H•*ânÈ≤X:Ñ|~]¨ªÛÓçÚì“∂3J˙4∆o¸ñÿ‚¶/Ç1§Yßø`	ŒH2ºHÎé°⁄6s≥D@PZu«ﬁ⁄é¶,aÍÖm†ÒàœFê‹TùV∫:@Õ>Ó8ﬁ°àní¬Ü
Ø∞=∂¯î¿O¶´≈âÓÜ‰9YË¥iY≈Î£u’u;<£ù»pf0î±îùD<c<¿0˙Û%1¿›ç!ü˜•!`›,]≤ŸóQrï
á7‰˚?¸.dlß±"EßAƒàusÄ7Ü¿D∆t*∆ŸÂU-3ºî˚´©Ò¿Z*_≈rv¬å»ﬂ⁄[˜∑X9˛ÛR⁄!X8'ÙÀcX'ÖxJ›W@3xì¡ﬂ˛’∆EπÉ‚ÌªT7ı—L"NV0‚J.ŒÁIåF’ˆWM›÷Õ™Ëru
…Î·6õîg#·ãvüFêlOv“´°ÚÏñõwïKBç!Ö1Q}j1Êm°e€Ÿú˘Ωº◊åC°GÁ&DräP¬ı-·˘≤∏øÇãY
XÒ∆◊ÀW•åszyéç˘?›Ú]2Ù8r®tì¢)O<ΩòfFAı ˜Ûû∑»ÏÓ˘∏Ç;¯0’s	Ω´[)Û«1æ;|XIë†Èyo≤QÌãœƒP◊€~^5ÛÊT%≤qú¢é'›!5aâ|b”“Z-"Ûƒ”TÇEXúˆ*ø¸‘=9Œ¶»îW9ˆ!ÚHÖ?—äºØÕµn#e¶m‹-E`/55¢˘opg¡˘¯ÑÌç∂JcV?˚¨È2å~Ω»åó!Iﬂ*ljÊà‰ˆ6ËEhöcÕ>¡¸|Œ“n∑πõ“G2ãÌ4IîÌûÌíTöE6fìOEE≈æßŸ-J•‘kÎSØbÉkî¶¿UBN∞EÃΩ{UÊ3ıÚaﬁ¿[¥{øVªÅBœG.K.¶∫πP.‰3ÓUÔíÌìµ∑¨–ÆÑæ≈mPTØ0]–jÄZ'=)äMŸ¨V€°
´S°>)k‚ùì˛´Jkó.ºöÇÍ$·±4≈«
œ˘
÷›Ò∫.ô;H≈ÈﬂR8äí™kΩZÏ/Ø‡$Ó¥∞√ !≈Û⁄PöÓö ˝d/å{@Õ›û¢Ü/9º‰©◊<t4A¯'Ôl⁄a›ÖOeòùÖïúˆ 1¡ù‡≥∆€BÂ›÷û@=ÂÆûµ≠ÌP∑õµYPb”p7¯ÄÄ(nj•V™»≤TH◊™©ß>≤%ìdKÑÇzä–4¬øéß[i¶àK(˙RøVã‘„îEo/∞¥[“¡˝ÏÏ’öA5‘∆\È_^ö¿,B5Z≤#˜©	c/exv+LÕ’˚6Wö∫ô¢´©∆ì*9wJ^çië‹˜¬ùÊÀ+–¿2,%Í"ãÛe¶ú·˚ˇ¸oÑﬂmÑ\u»Ñ∏Bsï˝Q˜Õ≈áM€lû|Ic®Eÿä˛Òí<
›FŒ˘¯∑ŒÄëﬂkF˘*¬Öµö∫ô·¥Ω¢ÉÍ™˛):ª%ZjiµÜ:©Ï»+.$˘5Õq¸'ñ7W:lã+Lãõ-ª	≥‹T`hEgìQDø§#˜∫≈{ÓÙ"F◊ﬂÁ«Å–⁄¨12ı“ìËWëÆ§¯˛ΩZ‚ÔDËÃv´	R(¬∆}6i⁄éÂÉÛNÌ¿è&l9{øWÁÏ¶Qﬁ<«Q“O3ñ$~¬RØ±ÿÖç†	©<¡Î˙Ö∫c”åÏÈpeûXÔØ≤ ¨f˘d^ÍÚw~€	∏G*™Ì?ã'dì0◊R•πõW!∆gá]ªtZ/	≥e◊¥f◊≤gsã∂˙ë¡u=÷ÌVb±mãÔ6ph&ÓÈ;Söπ}ÜnIxòﬁ⁄Mtı~…¶·/Mm˜û“ÚML˚Ñq≈iò_Ìt£†∏–ñ"íÒjØ1°6p+¯ákü~}®BıÌ¬ Õ´¥vKGÎul™µåüÔ–Í]”Ó˝,ﬂ∑ ÅYø=ˆÔ{∑∞◊'ÇrW≠3Ω·∂Zƒ$jT[ƒCÊ Ô-Oô*d¨)Ä±Ï·|∑N÷Ú`· VQè¥≤6in]&}vQáó∞ñ@FnS<¯}»Br•ãÚ«˛Üªâ˚µì;ˆ≠ﬂ{´l/°<gΩò¸%®;CP
gÈÄl¡ﬂÈ%:›5˙<m∫D√á'lËA~j†@zR‹ÂÛ8~›ü<FV™Bçz4*—¢ÁKE5ZÒ
Ztp°ªïRyÅ‹ªªkùùëÛøE8àımu!Ω ä3∑•Za„ë<ÿ’˚E®áøfñ-çêçóÓŸ2´3“F«Ö -íÆ¥<WCè˙›{Ì&)aˆ›xëÚœEˇQOåõ€62*—m`âÃ‰æec ≥áKi'Íãü%∏$Óâ≠√÷ì]≤}¥øﬂ⁄::iùùúíÉ£ù÷æ¥˜]ÁΩÙÍ F›x;ÌE§¿ö“L;V|h)Aﬂ\î`N◊õÆÊ ˛£π"Õc)X‘^•IsH_Œ(bìSFyﬂ¿’ﬁ¥@m•€Ú;6Ø€ˆ^2+J´”9åØ‰^	î0Ûâ^˜$Ÿ€ÍöOÙ∫;1∆’ÿÍöOD›%/<ﬁﬂ˝9imüÌ}≥w∂∑Î%É«¿@)¸h±ù‘"UÑ†ñ£µŒ;"ÖÂ%õ◊éé S.ul¢É¸ƒN∂∫Ê;1ÿÍöO*àaßu÷"œ['ªOèûùÓ⁄â`'Gœ£,Ó•ó∞Ìh≥Ôúi•V’+Öçπ•Nõ,DäR•~H’ÀSΩ˛∂/î‹“0Àyœs£uY1˜ó¶±^
™#R\Zz'&M≠∞ -\ì8◊Uä—9ó"◊ùRå˝H{<A€ÏëÆIõ¡Ÿ üEÁÕ¢
Ác«RÑ≈sÅoh	Du{Z®å"·∏fvKsõGGÎ>ˆaü˘Ñõ•ãµ∆∆ΩïE…–~éiˆ¡–™xÆùP<oÑy¢){¢7LI
(T=sœµ˜Û≠æ@Ü¨[‰±?OÅbà9{1ñ2⁄˜Xñ⁄nÒ	Féÿ™î/-ŸOﬂ1”UÔëòÉIñu¥ YIYGã©°»NÇ±"0ºË˝ÿF˝…8iÎ«√*„=û5ïπ¿Dñ√Œá
À«@gE_Ôê‘écË+⁄⁄N˘ÀYnx Aheó?—ZÉ%N¥Ó√'∂≤≥wHm;‚•ÑiÅT&ııô5hf÷è[düpáÑ˜q“èœ†	{ "£∆|≥<?áÿo≤èR'$„Ê5˝îB¥‚dÕG·#"i”f$+ }Ø∑‚'˜ﬁÙ^ñ0iÜÆ= €±_L6=≥ÅD[{\$ß"8Æ
U¸F¥
YŒﬁ0J^Ö¨Uß]yÔ∂7-6Xæø÷i\·’ˆ÷Œ ´Ωy{]J’%QCUÃ
K[o·∆$ÎOØµÙ©„˝÷!Ÿ>ŸEK'7n4üÔnëÁG'?;=nmÔŒÈ∆é÷ŒÙv£%ç6lÒ0´ñüÒk
y∂Ÿ¯5PÏÚÚÀí´hˆôØq€àŸ,7ê¸T-À‘DL≈‘\±?{íB›F√˛!≥ú∑—qï€qÓ,≥õeiÊ|zÁó˝±:~cyp“0#ˇ^Ú<˘uîuÏ∆û~∑Ü≠Áﬁ,m=«”Ù$Ω™∞ÔhgÑÎb”Ÿ”ãïy≤:O÷Ê…∫û¥fœrÖ0¯6{·Nh@`Œ#4qNŸ√:.Öœ"i>ÀÃ◊f=?a•(·Êò„#NlßˇfÁAÑ·ô–ì094D ê!üe÷Ú∫+Z=p¢‚ÉË∞Ÿ=≠ôoïdNëºÈ$;QG?Ä∞x‘èˇ…’]ﬁ8r˜f≈Ëç9!ı–›æ°Ö õx ‘í!Y Ã√e¿∫ X¯.‹pYø:=€=∆T‰fv°zŒ∂iåÄÍä∆Æ5X1%/'nºqF=Ö7Ö%∂M¶(ûÿ¥ïE‡k πÅ¥IÌBK7‘◊€…E¬|eåÅ≥I°V ùU’±Mì≤Õﬁ<ÔEË™Õ∞√yh≤yLzL˜"¥!t±áìÙícÊ/ Ëæ6zjÊ>ƒ>XÛÛÃ¬Q±kZßH#J⁄e„EhπèiSñìﬂt¯≥xÇ‡ZE.ﬁ/æé¥|có∆R./ÊΩ‰bå^€G˙xqî≈oÄÓƒÓΩW3|«gÂßÚ¸∑s∫ÿ∞≤¸z  tç{ò'åRL;Iæ ‘[»ìÕ€ôºŒÊWÓ∆Ûñ%w±£gÛ§5˝Ò,K»œb†åÉHÂ8ãGÛ†WΩ˝ın*"¢ŒÍ‡.^û±˘+∫ ”À1uó¥%-±ÓJËw…+ÔkºrE…%ÇﬁÛ∞a2Ìäıö¥¿oó¨wˇ˛ÒÉaÄaÆÂ8£–¥Ieº∏–ÚuÕÊAW"Æ1dzl*èX/O#‰îøÂ.ük“•∆ﬂ˝Ìpë\√ñ≈j¸Èü»WÀ…(ˆö¡H¢AG≠?˛ΩãÇ]5˛Òì_"·≠í›!¢“‘∞∞	òì EÃù-gñV_∏,s/£ıÌ.4~ÅØ¿ÑG*#‚]vπÕ˜ ÀûF#P¨õç>⁄,\L…ë‰HMÒΩ ≤s…r§îŒ3ª2∫21∂lLü~9Kƒ&≥ÍÃï€F”Óå‰ô w(ûÈ®dqS≤9$Ÿd£’
Ÿhı„êçV¶tÎMîÙ£Û§üå'w'=-spŸÓ±LÒõI∏	l=óh'â®ó—Ãëç$=ö.ëı¯ú$Å<ï‰!¬QÇÓ1-;l°"5·h’ëö®˘·]JM3ì∞Ø¶òƒ(_-ãY	Ö÷f*
›ßoü'_ÒˇW]Ã@ ˘$ÿ0¡ÜrÅÁ…∞ì^}êíç‹øöíÕ˜ˇ¯œH@ú|]2∆oë∫*
˝˛è@zO)È9J¸Ó?ÅZºM*d†øˇ&^√í9Z›∆)lÅ?qÜ2åO‚ÃG%Œ¨Uà3ká8≥∂»Ã: L(ê∑_…“wÚM+Cπ$Ü£·ÑY{†gâ‘≥y“I‚1ö¶Ä.†$®6püQoí”ú‡Ì≤Á≥3˛H√QGöëœK*ÖÀ>˛ó∏V0s⁄òÅ“Õ<‹L@:cxm2O."ñìÚäÚ˙y°¯ıbåµß∞Ïµ≥≥p¨,2qHíÄ4«¢  wÔÚ∏uÎ[:˛¯ﬂ»c ≥∏C(Ï≥”ºÒd4î=Fû_pRÙCû¬6Fv“Qî3˚°S‹¯_‰óqñíÌË‚"Ü“?íΩ_f®`%˙?Öü≈ønÊ…Á¢SØÄº?	
5Ö/? QaΩBT†ß©Úaj∏Ë∞N∏˜À⁄∆í-Ó/û∞Sñ‡òyö¡ÌËäí'9⁄yÔ<≈ —–“ÆAÉEª›,Ççfzú.d‰"KõÊH)oíHA∆&Pí;)X*é”«ºi™–j©‘X]'çÏ—ÔàTÇÓ;ºÏ,?Ã°Œÿz-”◊b~9¿”ΩEulÕŒ
<¡›ÆF3›í&å
¶Tãõôynú|˚√1ˆÄøëNÅO⁄˝8ø!œƒ¬ÓX?‹;nﬁ∑	∆+E.ëíIjÅÆˆ q«<“5|´ˇM_Ÿ¬KG∂ûM≈ÓëUl|aUë&e¨§{˙4
_ Ô2c‘‚Zaœ∆1l˝‹„ra˛*%Ÿ¢Í-DiS„ŸºèÏ≥¬sa¨ÑÇª◊“{–_F#œX∂'—nÜr_fÈÙ]]Ó⁄Áì∫C£Ò™?As'J˙Ã#"ek‹£âóËØÍ≤ÿ≠/˜‘’˜KÄj˚Ëe_¶;1BÇ0øè˙Èd DAøıÉCiŒO»	áEâ-# ¶¿‘ î˘£√√≈r∏2·µM0®|"E¨î+”¸Î /%ˆlË^>‰^U YK∂!b®äØûßŸÉÃ¨7à/Ôâ&∂.¸ÜΩÍø˜¢∫Û˝ÚlJ”[$¸ıÁ‘—ÕjÿyM}(‘ì¬€,Düçì{}/Àp=(~˚·®EÃ©£f!Xa%8<cd FIe6ø:≤≤¿ô÷`SÍ}£ø";ãœñæ30—-∫¯˛∑ˇ3º0Eë‘Ò›º∆;≤&ÕfŒ˜#Bƒç[OpXËÙeËQ LÁ›wß:àãèr‘âF„ ¸ù’C~≠pB3Á∫)pI∞¡Œ‹úU’|07S@ôç>f+ÌL<˚á¸›ﬁ6+Ér]î5÷06ıÑ)£Sjfßeà∂™h.3÷t¬ìŸ$[FU6íöêqexôE’ûŒéPÙdgIöA%48fC·Ú<Å=∑;YÛOlÿÚ ^êgJ}õç√◊¨ŒúÀ9.£Ï}†¢^;,£r°oÏ' '◊#P)◊ÎÌ”##Ø≠•ãTé'C‰ß>J≈W~QúÛ3Ì§bÄ´âGﬂ&YpÕxû‰âº
¡;πõÖÿuá®ˆÃ8jWÌãYï∏\≈K´f¬Àe$ Ô0§|ä4ªùdÌ~Ï»Î`Ho‰∏“¶†Ω©ñLOüØÛq∞ Ã_Ájœläºd‘_∏W∞!ñ)û%‹æ˚˝øä=kÉ‡◊≥#ˆ1’âê´ø◊f‹Ä˜±£a7¨û(v«8Qªf9ò1ß⁄§π,Õ2§‘ÿç6ÊÈ—„4≈=˝0zìt#KJ∫céxÿ·¯hÏë¢ÙPD%^l•<¶¢w≤É´ŸÑ%Í«¶∂†AÕaíó2ÆML» \5ËèlP†)Ë8ÿ¥a*sÎêæ,«°˙˜Z,Ä\íﬂG≥A)…Éîø’⁄˛ôAƒ÷(µ)Ú∂P¶Â™N rQ√é¨ï∞%kEl°…ZOÄ≤V“çZ¨Ã.É¬ÙÂ›à¬–&tzŸnnÔÓk\L–Ñs	?¥9•Õj¡ZrX‹/∫S€¬$mëhv[Í„”l[é•É´RäÜyÜ€:·g}_ ¨œ‹´X·:MßIüB$ª/ßÿêAﬂ$-À	µã9j∂ŸºuR‡©N’åÛp˜Ág˜<°"îÃ>ß‚úæú”.õ2ı'Ô"9ŸT!˘%ÈÌ4«Ÿ•çáÆGvÉ·¥gÈ3Ñ'∆B$ø˘	]fÓW†MV}Ö¥îË+§Ö‚nFÚˆT[ìvﬁ®≠«ÇØéÉ-F»…’™ÉDä!Ä6ÏÜ≈“Àq”ÁM∆gå'y√S3Ò˜v: ˛–√CÒ71€µ]nÒ96˜;ºäæ∫
Ëa-V
√7‹‚c™ KtÔAîÚî}Æ€ŸÓ<Å›¯œçiò‘i∞'<¶|≤{∏{“:€;|"2ÃÚ;ª_«»1;∑µkSîπ˝=´ú9É\9KÈ@ °∏|Ÿ2∆WßàÂä56˝ì-LX∂û£‚ŒyÖUﬂ~~ΩÎbqò^5Án^π÷"G—Ÿêx7Â®‹Z∞∞—‹GË”õQú´€-ªê5»-˘^:à["ÿpC‚ÍÓ*◊ÿ0∑ßj0v„Ràª¯Â®SßxFÁrCÒ tæq9‚"d/GÏ=KOASäõ/‰Ÿü'∞äd\_W∂Aª§æ.∆k91ûù5L`nßå¢Ò)•‹ZüRÃ≠˘)≈*µ?•¥OªcóÊLù_∂€qÓ€mÛd—	ÌfﬁÀU~‘´∆È•.dõ® Rnu™RW-Áãö59m}≥KŒé»7≠g˚g&C∂k™Ù—á≈´«ò.˜túQâjºü∂£>2∏ÉÚÜ”ø`Ù‘Uåû’l*úDqã*]¢ö!¸´™õ ¸BÔ•ÍΩ`ƒ¨›Ór»"7äØˆ≥y÷úè≥á,)˛ˆÌeﬁ
,ËI!ŸNéì~j
eW?mo”≠±5ËÒàß2Ö√Ñë}q∫Ω∑{∏Ωã˛oªœNé∂ˆéˆèû¸‚ÂØÜü_è´˙ØÜøæ8~˙ãSVµùgª˚ —≤Vﬂ≈A‘’Ùà"å+rw=fÓ°ƒQOwıL0∫Nv”l«aÛ<-  Ä§ËN·.ô‰@ÛØ
äµ“«k8/^ŒâS∂*gDûèìé˚E-ø˙º<Ω!ﬂˇˆ˜‰EqÚπ~Ú“3rÊp8ãﬁÃÈÄ˚“/†òy†∆·Ä∏ŸSı∞3ÌlPKÿêdñ‚NM|„:F˛$Ä:GÂì záË'Ò∞∏>V;ÇCPTÚË2C¬ŒÓÒ˛Óì°B°~ﬂ8Øù&ÓŒﬁYlÕv¥€I∆Hˆo7pCF^ÈÉ.¡ÄQMí{Îˇı¬ˇKMÈëuï°øuŸKìt"‰@ªX°p}‚ÉTL⁄]}+an(0›.¥›ıY°Ìz\öL¸öæpv≥•Ç3AÉbÈÀg£$ëxåí6¸ôÆë”KÌÃã›YÖ$∞¶ñ&’ì/ç]KVœ
Ô$eN5'∏Fû–; R‡•‚~eanVípÖü,¨Ñ—µbìNCLÿ
 åz§aáÀÈÒÉõZÓÕ	ıŒ'Wëjg3Àö†|á”mπı·ry;„iı«=Ñ˝¿3w…˚€uh¸†Ë=wøP˙C]~œ‹^ÕŒ@JÙd[ıdõ$¿å√4≠‹¶*`∞®Ã¶BL5¸öøÊ±>®\/=¡ÍÔ÷“™ò@7ÑtI¡ƒ›Vjc0ÌõNóaáÒŸ}∑Yﬁ:2ß-ÅY.+À0¸ÆB•·≤±F=ú%)
—!3"6Ë◊—;ÃÆàg§Æäíy
?@≤9¬`1a“&åaW⁄'OìÖÓ≈KWô2t	ﬁ∫ÙûJ,=W•“¬*ŸTÌvßB≠∞"«{4Â(%#nSï⁄_.ì4®÷t.3nÀú$˝“i{≥ﬁù  `ª0‹ÂôM -¢qπ˛0˛K“ÍtË™´°Jqk∞fu’	Xc·ã>HÌÀci|A¥?40ã)GX:‰ôxÒïÛ»Õ?cÄ∫ëΩNÈë]~í]\Üª¥Fq≤ÉœHœ8;∑f≤}{ì.sÜÿΩtô'Òí€yÅ3Ûíu#ˇëƒ◊H aWóaW¡k<Ee4|·vF¿üÖ¿_ø˙‹"}ÈÏ-Ä0∑‚ˇ«K¡§æ7‘òÅõñ£é3g∂§jCã◊áF©ÉOÑ™\ïÑzµ∞™y+`(ôRO i‘˘áW5™^Å»~xYIœEvãIˆÉfÛ€“ ˛'ümn≤=ÌIIëà•í£&Ë=å—± 9ÏÚ°ùeQﬁì£›Ñ‰dO›Aº}°ıNZqÏ1(¿Ô√‚íRó?1K•ÈUæyΩzn*kj)e≠y4ÃÉ% ~˛Éök}Î∆/≥?®ØiXçÿy‹]à&ÙñUÓæ]‰ªë
;ÿ+ä{è˜ÿ˙8É–4g›∆|C˙1àS|WcKìî£ÂÚæQ`ÖLõ±∫z‘1ò(]‚˛É≤üUyG)x1ÈPßy©ˇxÎkÂÉ6»»ÂÎ`∫àHØı{ám(Ÿ‚UÀ°¢>·ø?ã∞`›y]u€ÃÕ£k˙wùç˛óàù›˝›≥›2[Ú—·„ΩìÉ÷Ÿﬁë≈C¢˜c1£{ù@àœ>S´MÁÅ>ÏJ3å¢,Æ¥XÃú‹L◊Ü;˜_∞bhYNu¬¿åò»)ø‰\ECÙL&ù∏»‚$Ã…ÁÃ´æ]ıæ&g¯0¢–*§as'Á1‚OáÒ¢F8:@l¯Fj±f¬”¶ô]éõ€"òÊHC˛î˝ÅkîÂÅ∫§∫ÙÏÚÖπàW∏‰€ŸäÜsˆÈ∏8’NÔTÛÔ∫|öÛ¸ﬁwœíüÏmﬂÂúŸÀë>ÈßÁQüuo;^$Ÿ@Â√¸EÛ7l2ˆ-ä—„-OΩÉÁöU‘UY¶Àê∫≤ª˝Ï‰dÔ	Û∫3z~√$`LJ	Ó>£ËU≠ÏÓÆQ⁄◊”É÷aÎ….9=ﬁ=‹¡én∑ŒvüùÏÌû⁄ù¢a‘çOaWC≠kõ˘ﬂ'qÆoÑébÍGäÌ—◊∞ÔSO=ı∏`v#Ω∑∞Mæïï˜˝“{Œü/ÇÓ{:2Lß∑:≠áìÕkÁ#ΩˆI<‡j¿˛ToÉ±´˚SâblkT'ùo‡ˇ£ì ∫˘˛K3?—2°√ã◊#^È”
KI(F_R`%,4¬¯)D≠l{ÊßµæÌôç2J¬8˝≈ÈŸÓ9›=√êÈS≤s“zæ{¢Sƒi<∆˝3/‹å%Jœv≤Ë*Œ§=$∫˜6ØÒ_y≥tMÏæi∑€èœz1 ∂“µˆ—Oê±>˚K~äå‘õgy#"˝êÀt€QøE˜ı≥Ù5íßvC.t¯D/nﬁ”jÏÂ¯¸t2l#^‡õòV—oju`√ÉúÎo≤‹óké`Øxí¶0P¢‡ÊµyOyOßì4A1mg),ΩÀºŒıHô#YBBﬂqÈß\éë„Ó€QöçˇÚÙËPhy«,Ω7–KówîYé≤ŒV˜tüd\Q˘)ócFÇmµ¥Â¶ŸˆS4d∫⁄§•¥JYÊÓ–Ì·`ne¯«0fl»˙¿|œ3gæ«˙˜<·Yné„ïˆe⁄M˚75ùè\Ô‹I2ñN}kq€ˇ^©∂Á°˛Ó#ñÚÙ ˆk6\∂ªˆ7õu›œ‰˙4ëRDÒß˘Ü˝≤îv√l´†XÂß´Mçæ˜]uXcáÈ6B ã∂˘OW€EiÀMe“o„òÌ=%îüz≈∑H?Ïmi_˝‘^õ)æA˙aoS˚⁄ßˆÚ>ç«L(”|`îHS6ÃÓÅ1µ÷“iöû=0¶Û¿Z∫ü^qbærPÚïB∆z)®'ïázØ“µïÜ6$¢ΩÚPÏïAÆ∂“$zúƒ˝/´˛÷vÁ≠∞qKµÍbd[Ù∏Ü◊∞‹‘ﬁqf´føo{&Ä9 y x£ˆ¿ÒV£∫˚ôÌÌßóÁ¯üˆj˘Æ„ΩjE«€ÈÜkaÌÅ„ΩFu˜3ÂÌQ˛önA®;úé'}Tç{˙;-ï¨∑….∆˝≠ÓN4·‘nhÔ8÷ã3˘È]«Ó™º’C‘ï∑ÏØí´X^fØŒ∂õ”¥ü∞u≥;‰8séÆ…“Ç‹G!GO∂∫ f(ﬂÛæø®Áxµ—ÜC5ﬂzˆ¯1h\€œNœéˆ~	⁄u∞≠Àã†IÍù¸:÷p~ÍèuLV«ı¬Úá⁄uqΩÜ°Ü£ˆ%≤¬ò∞’0ÛÆÆ˝X+≤aeK∂ˆWüƒQN•MÌéÛï¢ÇÂ¶˝4Qº¸z√Ÿ>/nﬁ≥∑ŒS’ÀÌÛ[Œ7UlwÌoŸÁÓÚÚkƒ=Á{ J÷€ˆ7ùFÉÿˆ6˘æÛçjeÁ#˚õ∑fÜ¸⁄‚¶ÛùR5˚}SqmçF˝âæ@
{êÌ·4*5ûmQ„A2¶ñLıw%õyºø˚sr÷:˝ô›æ-ú◊C´4HDÂ.‚∂i¸ñNµ6¸\eW-l9Öªõzø¶ë1Náx{F_,úóÂàãÇgJEìŒOÔ¶±S∞k≈UkJF}ñmå‹êMö=>é(ÒMíç/£˛ﬁ≈aw‚NS{á≠q^Ñl*/°cÏ˘Xx`Ho˝ö∞xª1EÿêÍA¢ú∞Øﬁ ∫Zâä—7gÄø:πj©ê√∂;YSí'TP·Êßˇ  ˇˇ Pn¥∏