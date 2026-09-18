import React, { memo, useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Check,
  Edit3,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Plus,
  ChevronDown,
  Trash2,
  CheckCircle2,
  CalendarDays,
  Save,
  Clock,
  MapPin,
  Users,
  Car,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "../store";
import { cleanDisplayText, cleanCollaboratorText, cleanLocationText } from "./InteractiveAppHelpers";
import { parseDurationToMinutes } from "../utils/timeHelpers";

export interface FullActiveWindowNarrativeViewProps {
  task: any;
  currentFocusTarget: any;
  currentFocus: any;
  allTasks: any[];
  focusQueueTasks: any[];
  currentIndex: number;
  totalCount: number;
  isStarted: boolean;
  remainingSecs: number;
  dispMin: number;
  dispSec: number;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onToggleComplete: () => void;
  onPrevTask: () => void;
  onNextTask: () => void;
  onEditTask: () => void;
  onCloseNarrativeMode: () => void;
  triggerHaptic?: (type: string) => void;
  favoriteLocations?: string[];
  collaborators?: string[];
  isSpeaking?: boolean;
  handleSpeechToggle?: (task: any, customText?: string) => void;
  backgroundColor?: string;
  onUpdateTask?: (updatedFields: Record<string, any>) => void;
  onAddCollaborator?: (name: string) => void;
  onAddFavoriteLocation?: (location: string) => void;

  // Date navigation controls
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onToday?: () => void;
}

export interface GrammarConnectors {
  leadIn: string;
  timeSeparator: string;
  actionConnector: string;
  locationConnector: string;
  collaboratorConnector: string;
  transitConnector: string;
  priorityConnector: string;
  prioritySuffix: string;
  fullSentence?: string;
  grammarNotes?: string;
}

export const computeInitialConnectors = (
  title: string,
  location: string,
  collaborator: string,
  transitText: string,
  hasPriority: boolean
): GrammarConnectors => {
  const tLower = title.toLowerCase().trim();
  const locLower = location.toLowerCase().trim();
  const titleHasWith = tLower.includes("with ") || tLower.includes("w/ ");

  // 1. Action connector
  let actionConnector = " you will ";
  if (/^(lunch|dinner|breakfast|brunch|coffee|snack|tea|meal)\b/i.test(tLower)) {
    actionConnector = " you will have ";
  } else if (/^(meeting|sync|1:1|one-on-one|standup|interview|demo|presentation|review|webinar|call)\b/i.test(tLower)) {
    actionConnector = " you have a ";
  } else if (/^(dentist|doctor|physio|therapy|chiro|haircut|massage|appointment)\b/i.test(tLower)) {
    actionConnector = " you have your ";
  } else if (/^(gym|workout|zone 2|run|walk|swim|ride|cardio|yoga|pilates|stretch)\b/i.test(tLower)) {
    actionConnector = " you will do your ";
  } else if (/^(flight|commute|drive|transit|train|travel)\b/i.test(tLower)) {
    actionConnector = " you have your ";
  }

  // 2. Location connector
  let locationConnector = "";
  if (location && location.trim()) {
    if (/\b(zoom|meet|teams|webex|slack|discord|facetime|phone|call|skype)\b/i.test(locLower)) {
      locationConnector = " on ";
    } else if (/^(home|remote|headquarters|hq|campus|online)$/i.test(locLower)) {
      locationConnector = locLower === "online" ? " " : " at ";
    } else if (/\b(office|airport|park|beach|library|gym|station|studio|cafe|restaurant|hotel)\b/i.test(locLower) && !/^the\b/i.test(locLower)) {
      locationConnector = " at the ";
    } else if (/\b(san francisco|new york|chicago|london|paris|seattle|austin|la|tokyo)\b/i.test(locLower)) {
      locationConnector = " in ";
    } else {
      locationConnector = " at ";
    }
  }

  // 3. Collaborator connector
  let collaboratorConnector = "";
  if (collaborator && collaborator.trim()) {
    collaboratorConnector = titleHasWith ? " alongside " : " with ";
  }

  // 4. Transit connector
  let transitConnector = "";
  if (transitText && transitText.trim()) {
    transitConnector = transitText.includes("before") ? " allowing " : " with ";
  }

  // 5. Priority connector & suffix
  let priorityConnector = "";
  let prioritySuffix = "";
  if (hasPriority) {
    priorityConnector = " marked as ";
    prioritySuffix = " priority";
  }

  return {
    leadIn: "From ",
    timeSeparator: " to ",
    actionConnector,
    locationConnector,
    collaboratorConnector,
    transitConnector,
    priorityConnector,
    prioritySuffix,
    grammarNotes: "Grammatically optimized prepositions, verbs, and conjunctions."
  };
};

// Client-side instant memory cache for narrative grammar adjustments
const clientNarrativeGrammarCache = new Map<string, GrammarConnectors>();

export const FullActiveWindowNarrativeView: React.FC<FullActiveWindowNarrativeViewProps> = memo(({
  task,
  currentFocusTarget,
  currentFocus,
  allTasks,
  focusQueueTasks,
  currentIndex,
  totalCount,
  isStarted,
  remainingSecs,
  dispMin,
  dispSec,
  onStartTimer,
  onPauseTimer,
  onToggleComplete,
  onPrevTask,
  onNextTask,
  onEditTask,
  onCloseNarrativeMode,
  triggerHaptic,
  favoriteLocations = ["Office", "Home", "Conference Room", "Coffee Shop"],
  collaborators = ["Team", "Sarah", "Alex", "Client"],
  isSpeaking = false,
  handleSpeechToggle,
  backgroundColor = "#EAD7B0",
  onUpdateTask,
  onAddCollaborator,
  onAddFavoriteLocation,
  selectedDate,
  onSelectDate,
  onPrevDay,
  onNextDay,
  onToday,
}) => {
  const graphicsNarrativeFontSize = useAppStore((state) => state.graphicsNarrativeFontSize) || 60;
  const graphicsNarrativePillFontSize = useAppStore((state) => state.graphicsNarrativePillFontSize) || 12;
  const graphicsNarrativeAiGrammar = useAppStore((state) => state.graphicsNarrativeAiGrammar) ?? true;
  const setGraphicsNarrativeAiGrammar = useAppStore((state) => state.setGraphicsNarrativeAiGrammar);

  const formattedNarrativeDate = useMemo(() => {
    if (!selectedDate) return "Today";
    try {
      const parts = selectedDate.split("-").map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      // ignore
    }
    return selectedDate;
  }, [selectedDate]);

  // Active dropdown state: 'collaborator' | 'location' | 'transit' | 'priority' | 'time' | 'title' | null
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Local edit inputs for screen-centered modal window
  const [editTimeInput, setEditTimeInput] = useState<string>("09:00");
  const [editDurationInput, setEditDurationInput] = useState<number>(45);
  const [editTitleInput, setEditTitleInput] = useState<string>("");
  const [customLocationInput, setCustomLocationInput] = useState<string>("");
  const [showCustomLocationField, setShowCustomLocationField] = useState(false);
  const [customCollabInput, setCustomCollabInput] = useState<string>("");
  const [showCustomCollabField, setShowCustomCollabField] = useState(false);

  // AI Grammar state for reading active narrative window text and adjusting non-variable language
  const [aiConnectors, setAiConnectors] = useState<GrammarConnectors | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const lastPolishedKeyRef = useRef<string>("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const target = currentFocusTarget || task || {};

  // Extract task attributes
  const rawTitle = target.title || "Untitled Task";
  const title = cleanDisplayText(rawTitle) || "Untitled Task";

  const startTime = target.computedTime || target.time || "06:00";
  const duration = target.duration || "45 min";

  // Calculate start and end time in 12h format
  const [hStr, mStr] = startTime.split(":");
  const startMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);
  const durMins = parseDurationToMinutes(duration) || 45;
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

  // Attributes
  const locationRaw = target.location || "";
  const location = cleanLocationText(locationRaw);

  const collabRaw = target.attendees || target.collaborator || "";
  const collaborator = cleanCollaboratorText(collabRaw);

  const tBefore = target.travelBefore || 0;
  const tAfter = target.travelAfter || 0;
  const hasTransit = tBefore > 0 || tAfter > 0;

  let transitText = "";
  if (tBefore > 0 && tAfter > 0) {
    transitText = `${tBefore}m transit before & ${tAfter}m after`;
  } else if (tBefore > 0) {
    transitText = `${tBefore}m transit before`;
  } else if (tAfter > 0) {
    transitText = `${tAfter}m transit after`;
  }

  const priorityRaw = target.priority || "none";
  const priority = (priorityRaw || "none").toLowerCase();
  const hasPriority = priority && priority !== "none";
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

  // Trigger AI Grammar reading and non-variable connector adaptation
  useEffect(() => {
    if (!graphicsNarrativeAiGrammar) {
      setAiConnectors(null);
      return;
    }

    const currentKey = `${title}|${startTimeStr}|${endTimeStr}|${location}|${collaborator}|${transitText}|${priority}`;
    if (lastPolishedKeyRef.current === currentKey) return;
    lastPolishedKeyRef.current = currentKey;

    // Instant check: if already cached client-side, restore immediately with 0ms delay
    if (clientNarrativeGrammarCache.has(currentKey)) {
      const cached = clientNarrativeGrammarCache.get(currentKey)!;
      setAiConnectors(cached);
      setIsPolishing(false);
      return;
    }

    // 1. Instant local linguistic heuristics for immediate zero-latency feedback (0ms)
    const immediate = computeInitialConnectors(
      title,
      location,
      collaborator,
      transitText,
      hasPriority
    );
    setAiConnectors(immediate);

    const rawSentence = `From ${startTimeStr} to ${endTimeStr} you will ${title}${location ? ` at ${location}` : ""}${collaborator ? ` with ${collaborator}` : ""}${hasTransit ? ` with ${transitText}` : ""}${hasPriority ? ` as ${priorityLabel} priority` : ""}`;

    // 2. Asynchronous AI refinement via Gemini with 100ms debounce
    let isMounted = true;
    const debounceTimer = setTimeout(() => {
      setIsPolishing(true);
      fetch("/api/adjust-narrative-grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startTime: startTimeStr,
          endTime: endTimeStr,
          location,
          collaborator,
          transitText,
          priority: hasPriority ? priorityLabel : "",
          rawSentence
        })
      })
        .then((res) => res.json())
        .then((json) => {
          if (isMounted && json && json.success && json.data) {
            clientNarrativeGrammarCache.set(currentKey, json.data);
            setAiConnectors(json.data);
          }
        })
        .catch((err) => {
          console.warn("AI narrative grammar polish error:", err);
        })
        .finally(() => {
          if (isMounted) setIsPolishing(false);
        });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [
    graphicsNarrativeAiGrammar,
    title,
    startTimeStr,
    endTimeStr,
    location,
    collaborator,
    hasTransit,
    transitText,
    hasPriority,
    priorityLabel,
    priority
  ]);

  // Active grammatical connectors (either AI-polished or static scaffolding)
  const connectors: GrammarConnectors = (graphicsNarrativeAiGrammar && aiConnectors)
    ? aiConnectors
    : {
        leadIn: "From ",
        timeSeparator: " to ",
        actionConnector: " you will ",
        locationConnector: " at ",
        collaboratorConnector: " with ",
        transitConnector: " with ",
        priorityConnector: " as ",
        prioritySuffix: " priority",
      };

  const assembledSentence = connectors.fullSentence || (
    `${connectors.leadIn}${startTimeStr}${connectors.timeSeparator}${endTimeStr}${connectors.actionConnector}${title}` +
    (location ? `${connectors.locationConnector || " at "}${location}` : "") +
    (collaborator ? `${connectors.collaboratorConnector || " with "}${collaborator}` : "") +
    (hasTransit ? `${connectors.transitConnector || " with "}${transitText}` : "") +
    (hasPriority ? `${connectors.priorityConnector || " as "}${priorityLabel}${connectors.prioritySuffix !== undefined ? connectors.prioritySuffix : " priority"}` : "")
  );

  // Helper to trigger task updates
  const handleUpdate = (fields: Record<string, any>) => {
    if (onUpdateTask) {
      onUpdateTask(fields);
    }
    if (triggerHaptic) triggerHaptic("medium");
    setActiveDropdown(null);
  };

  const toggleDropdown = (name: string) => {
    if (triggerHaptic) triggerHaptic("light");
    setActiveDropdown(prev => {
      const next = prev === name ? null : name;
      if (next === "time") {
        setEditTimeInput(startTime);
        setEditDurationInput(durMins);
      } else if (next === "title") {
        setEditTitleInput(title);
      } else if (next === "location") {
        setShowCustomLocationField(false);
        setCustomLocationInput("");
      } else if (next === "collaborator") {
        setShowCustomCollabField(false);
        setCustomCollabInput("");
      }
      return next;
    });
  };

  // Safe collaborators list with defaults
  const effectiveCollaborators = Array.from(
    new Set([...collaborators, "Team", "Sarah", "Alex", "Client"].filter(Boolean))
  );

  // Safe locations list with defaults
  const effectiveLocations = Array.from(
    new Set([...favoriteLocations, "Office", "Home", "Conference Room", "Coffee Shop"].filter(Boolean))
  );

  // Centered screen modal renderer for editing narrative data variables
  const renderPulldownWindowModal = () => {
    if (!activeDropdown) return null;

    return createPortal(
      <div
        id="narrative-pulldown-modal-backdrop"
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150 text-left"
        onClick={() => setActiveDropdown(null)}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) {
            setActiveDropdown(null);
          }
        }}
      >
        <div
          id="narrative-pulldown-modal-window"
          data-pulldown-window="true"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col bg-[#FFF2DF] text-[#1F1A16] border-2 border-[#EADDC7] rounded-3xl p-5 shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 duration-150 relative text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EADDC7]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FAF3E0] border border-[#EADDC7] flex items-center justify-center shrink-0">
                {activeDropdown === "time" && <Clock size={16} className="text-[#1E6B40]" />}
                {activeDropdown === "title" && <Edit3 size={16} className="text-[#1E6B40]" />}
                {activeDropdown === "location" && <MapPin size={16} className="text-[#DE771B]" />}
                {activeDropdown === "collaborator" && <Users size={16} className="text-[#7B24C7]" />}
                {activeDropdown === "transit" && <Car size={16} className="text-[#2272EB]" />}
                {activeDropdown === "priority" && <AlertCircle size={16} className="text-[#C82A2A]" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#2D2319] truncate">
                  {activeDropdown === "time" && "Adjust Start Time & Duration"}
                  {activeDropdown === "title" && "Edit Task Title & Action"}
                  {activeDropdown === "location" && "Select Location"}
                  {activeDropdown === "collaborator" && "Assign Collaborator"}
                  {activeDropdown === "transit" && "Select Transit Time"}
                  {activeDropdown === "priority" && "Select Priority Level"}
                </h3>
                <p className="text-[10px] text-[#7A6B5C] font-semibold truncate">
                  {title || "Task Details"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveDropdown(null)}
              className="p-1.5 rounded-xl hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#1F1A16] transition-colors cursor-pointer shrink-0"
              title="Close window"
              aria-label="Close window"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Modal Body with Scrollbar */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {/* 1. Time (Start Time & Duration) */}
            {activeDropdown === "time" && (
              <div className="space-y-3.5">
                {/* Start Time Section */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#FAF3E0] border border-[#EADDC7]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B5A4B]">
                      Start Time
                    </label>
                    <span className="text-xs font-mono font-black text-[#1E6B40] bg-white px-2.5 py-0.5 rounded-full border border-[#EADDC7]">
                      {formatMins12(
                        ((parseInt(editTimeInput.split(":")[0], 10) || 0) * 60 +
                          (parseInt(editTimeInput.split(":")[1], 10) || 0)) %
                          1440
                      )}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={editTimeInput}
                    onChange={(e) => setEditTimeInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#C4B4A0] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#1E6B40]"
                  />
                </div>

                {/* Quick Hour Presets */}
                <div className="space-y-1">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-0.5">
                    Quick Hour Presets
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["07:00", "08:00", "09:00", "10:30", "12:00", "14:00", "16:00", "18:00"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditTimeInput(t)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-mono font-extrabold border transition-all cursor-pointer text-center ${
                          editTimeInput === t
                            ? "bg-[#1E6B40] text-white border-[#1E6B40] shadow-xs"
                            : "bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border-[#EADDC7]"
                        }`}
                      >
                        {formatMins12(
                          ((parseInt(t.split(":")[0], 10) || 0) * 60 +
                            (parseInt(t.split(":")[1], 10) || 0)) %
                            1440
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Section */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-[#FAF3E0] border border-[#EADDC7]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B5A4B]">
                      Task Duration
                    </label>
                    <span className="text-xs font-mono font-black text-[#1E6B40] bg-white px-2.5 py-0.5 rounded-full border border-[#EADDC7]">
                      {editDurationInput} min ({Math.floor(editDurationInput / 60) > 0 ? `${Math.floor(editDurationInput / 60)}h ` : ""}{editDurationInput % 60 > 0 ? `${editDurationInput % 60}m` : (Math.floor(editDurationInput / 60) > 0 ? "" : "0m")})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[15, 30, 45, 60, 90, 120, 180, 240].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setEditDurationInput(mins)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer text-center ${
                          editDurationInput === mins
                            ? "bg-[#1E6B40] text-white border-[#1E6B40] shadow-xs"
                            : "bg-white hover:bg-[#F2E5D0] text-[#594B3E] border-[#EADDC7]"
                        }`}
                      >
                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleUpdate({
                      time: editTimeInput,
                      computedTime: editTimeInput,
                      duration: `${editDurationInput} min`,
                    });
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#1E6B40] text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#165331] shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Save Start Time & Duration</span>
                </button>
              </div>
            )}

            {/* 2. Title / Action */}
            {activeDropdown === "title" && (
              <div className="space-y-3">
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#FAF3E0] border border-[#EADDC7]">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B5A4B]">
                    Task Action & Title
                  </label>
                  <input
                    type="text"
                    value={editTitleInput}
                    onChange={(e) => setEditTitleInput(e.target.value)}
                    placeholder="e.g. Design User Interface"
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#C4B4A0] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#1E6B40]"
                  />
                </div>

                {/* Quick Action Verb Chips */}
                <div className="space-y-1">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-0.5">
                    Quick Action Verbs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Meeting with", "Review", "Work on", "Draft", "Workout", "Call", "Lunch", "Study", "Debug"].map(
                      (verb) => (
                        <button
                          key={verb}
                          type="button"
                          onClick={() => {
                            const existing = editTitleInput.trim();
                            if (!existing) {
                              setEditTitleInput(verb);
                            } else if (!existing.startsWith(verb)) {
                              setEditTitleInput(`${verb} ${existing}`);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] border border-[#EADDC7] transition-colors cursor-pointer"
                        >
                          +{verb}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (editTitleInput.trim()) {
                        handleUpdate({ title: editTitleInput.trim() });
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#1E6B40] text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#165331] shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Save Title</span>
                  </button>

                  {onEditTask && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null);
                        onEditTask();
                      }}
                      className="w-full py-2 rounded-xl bg-[#FAF3E0] hover:bg-[#EADDC7] text-[#594B3E] text-xs font-bold border border-[#EADDC7] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit3 size={13} />
                      <span>Open Full Task Edit Form</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. Location */}
            {activeDropdown === "location" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Choose Location
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                  {effectiveLocations.map((loc) => {
                    const isSel = location === loc;
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => handleUpdate({ location: loc })}
                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                          isSel
                            ? "bg-[#DE771B] text-white border-[#C86612] shadow-xs"
                            : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#2C241D] border-[#EADDC7]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className={isSel ? "text-white" : "text-[#DE771B]"} />
                          <span className="truncate">{loc}</span>
                        </div>
                        {isSel && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Location section */}
                {showCustomLocationField ? (
                  <div className="space-y-1.5 p-2.5 rounded-2xl bg-[#FAF3E0] border border-[#DE771B]/50 mt-2">
                    <input
                      type="text"
                      value={customLocationInput}
                      onChange={(e) => setCustomLocationInput(e.target.value)}
                      placeholder="Enter custom location name..."
                      autoFocus
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-[#C4B4A0] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#DE771B]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customLocationInput.trim()) {
                          const trimmed = customLocationInput.trim();
                          if (onAddFavoriteLocation) onAddFavoriteLocation(trimmed);
                          handleUpdate({ location: trimmed });
                        }
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (customLocationInput.trim()) {
                            const trimmed = customLocationInput.trim();
                            if (onAddFavoriteLocation) onAddFavoriteLocation(trimmed);
                            handleUpdate({ location: trimmed });
                          }
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-[#DE771B] text-white text-[11px] font-black uppercase cursor-pointer hover:bg-[#C86612] transition-colors"
                      >
                        Add & Select
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomLocationField(false)}
                        className="px-3 py-1.5 rounded-xl bg-white text-[#7A6B5C] text-[11px] font-bold border border-[#EADDC7] hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomLocationField(true)}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-[#DE771B] hover:bg-amber-100 flex items-center gap-2 cursor-pointer mt-1 border border-dashed border-[#DE771B]/50"
                  >
                    <Plus size={14} />
                    <span>+ Add Custom Location...</span>
                  </button>
                )}

                {Boolean(location && location.trim()) && (
                  <button
                    type="button"
                    onClick={() => handleUpdate({ location: "" })}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center gap-2 cursor-pointer mt-1 border border-rose-200"
                  >
                    <Trash2 size={13} />
                    <span>Remove Location from Narrative</span>
                  </button>
                )}
              </div>
            )}

            {/* 4. Collaborator */}
            {activeDropdown === "collaborator" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Choose Collaborator
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                  {effectiveCollaborators.map((c) => {
                    const isSel = collaborator === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdate({ collaborator: c, attendees: c })}
                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                          isSel
                            ? "bg-[#7B24C7] text-white border-[#6A1BB0] shadow-xs"
                            : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#2C241D] border-[#EADDC7]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users size={14} className={isSel ? "text-white" : "text-[#7B24C7]"} />
                          <span className="truncate">{c}</span>
                        </div>
                        {isSel && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Collaborator section */}
                {showCustomCollabField ? (
                  <div className="space-y-1.5 p-2.5 rounded-2xl bg-[#FAF3E0] border border-[#7B24C7]/50 mt-2">
                    <input
                      type="text"
                      value={customCollabInput}
                      onChange={(e) => setCustomCollabInput(e.target.value)}
                      placeholder="Enter collaborator name..."
                      autoFocus
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-[#C4B4A0] bg-white text-[#2D2319] focus:outline-none focus:ring-2 focus:ring-[#7B24C7]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customCollabInput.trim()) {
                          const trimmed = customCollabInput.trim();
                          if (onAddCollaborator) onAddCollaborator(trimmed);
                          handleUpdate({ collaborator: trimmed, attendees: trimmed });
                        }
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (customCollabInput.trim()) {
                            const trimmed = customCollabInput.trim();
                            if (onAddCollaborator) onAddCollaborator(trimmed);
                            handleUpdate({ collaborator: trimmed, attendees: trimmed });
                          }
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-[#7B24C7] text-white text-[11px] font-black uppercase cursor-pointer hover:bg-[#6A1BB0] transition-colors"
                      >
                        Add & Select
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomCollabField(false)}
                        className="px-3 py-1.5 rounded-xl bg-white text-[#7A6B5C] text-[11px] font-bold border border-[#EADDC7] hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomCollabField(true)}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-[#7B24C7] hover:bg-purple-100 flex items-center gap-2 cursor-pointer mt-1 border border-dashed border-[#7B24C7]/50"
                  >
                    <Plus size={14} />
                    <span>+ Add Custom Collaborator...</span>
                  </button>
                )}

                {Boolean(collaborator && collaborator.trim()) && (
                  <button
                    type="button"
                    onClick={() => handleUpdate({ collaborator: "", attendees: "" })}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center gap-2 cursor-pointer mt-1 border border-rose-200"
                  >
                    <Trash2 size={13} />
                    <span>Remove Collaborator from Narrative</span>
                  </button>
                )}
              </div>
            )}

            {/* 5. Transit Time */}
            {activeDropdown === "transit" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Select Transit Buffer
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                  {[
                    { label: "15 min before & after", b: 15, a: 15 },
                    { label: "30 min before & after", b: 30, a: 30 },
                    { label: "45 min before & after", b: 45, a: 45 },
                    { label: "60 min before & after", b: 60, a: 60 },
                    { label: "15 min before only", b: 15, a: 0 },
                    { label: "30 min before only", b: 30, a: 0 },
                    { label: "15 min after only", b: 0, a: 15 },
                    { label: "30 min after only", b: 0, a: 30 },
                  ].map((item) => {
                    const isSel = tBefore === item.b && tAfter === item.a;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleUpdate({ travelBefore: item.b, travelAfter: item.a })}
                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                          isSel
                            ? "bg-[#2272EB] text-white border-[#1A5EC4] shadow-xs"
                            : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#2C241D] border-[#EADDC7]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Car size={14} className={isSel ? "text-white" : "text-[#2272EB]"} />
                          <span>{item.label}</span>
                        </div>
                        {isSel && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>

                {hasTransit && (
                  <button
                    type="button"
                    onClick={() => handleUpdate({ travelBefore: 0, travelAfter: 0 })}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center gap-2 cursor-pointer mt-1 border border-rose-200"
                  >
                    <Trash2 size={13} />
                    <span>Remove Transit from Narrative</span>
                  </button>
                )}
              </div>
            )}

            {/* 6. Priority */}
            {activeDropdown === "priority" && (
              <div className="space-y-2">
                <div className="text-[9.5px] font-black uppercase tracking-wider text-[#8C7A6B] px-1 pb-1 border-b border-[#EADDC7]/60">
                  Select Priority Level
                </div>
                <div className="space-y-1.5">
                  {[
                    { id: "high", label: "High Priority", color: "bg-rose-500", activeBg: "bg-rose-600", activeBorder: "border-rose-700" },
                    { id: "medium", label: "Medium Priority", color: "bg-amber-500", activeBg: "bg-amber-600", activeBorder: "border-amber-700" },
                    { id: "low", label: "Low Priority", color: "bg-emerald-500", activeBg: "bg-emerald-600", activeBorder: "border-emerald-700" },
                  ].map((p) => {
                    const isSel = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdate({ priority: p.id })}
                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                          isSel
                            ? `${p.activeBg} text-white ${p.activeBorder} shadow-xs`
                            : "bg-[#FAF3E0] hover:bg-[#F2E5D0] text-[#2C241D] border-[#EADDC7]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${p.color} border-2 border-white/60 shrink-0`} />
                          <span>{p.label}</span>
                        </div>
                        {isSel && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>

                {hasPriority && (
                  <button
                    type="button"
                    onClick={() => handleUpdate({ priority: "none" })}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center gap-2 cursor-pointer mt-1 border border-rose-200"
                  >
                    <Trash2 size={13} />
                    <span>Remove Priority from Narrative</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div
      id="full-active-window-ai-narrative-screen"
      className="w-full flex-1 min-h-[calc(100vh-60px)] flex flex-col justify-start relative select-text overflow-y-auto font-sans pb-36 sm:pb-44"
      style={{ backgroundColor: backgroundColor || "#EAD7B0" }}
    >
      {/* Top Banner / Subtle Header on the Plain Screen */}
      <div className="w-full max-w-5xl mx-auto px-6 pt-4 sm:pt-5 pb-2 flex items-center justify-between z-20 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C3B2B] text-white text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-xs">
            <Sparkles size={13} className="text-amber-400" />
            <span>FULL ACTIVE WINDOW AI NARRATIVE</span>
          </span>
          <span className="text-xs font-bold text-[#7A664D] hidden sm:inline">
            Task {currentIndex + 1} of {totalCount}
          </span>
          {/* AI Grammar Toggle Badge */}
          <button
            type="button"
            id="narrative-ai-grammar-toggle-btn"
            onClick={() => {
              if (triggerHaptic) triggerHaptic("light");
              setGraphicsNarrativeAiGrammar(!graphicsNarrativeAiGrammar);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all border cursor-pointer select-none ${
              graphicsNarrativeAiGrammar
                ? "bg-[#2D6A4F]/15 text-[#1C3B2B] border-[#2D6A4F]/40 hover:bg-[#2D6A4F]/25 shadow-2xs"
                : "bg-black/5 text-[#7A664D] border-black/10 hover:bg-black/10"
            }`}
            title={graphicsNarrativeAiGrammar ? "AI Grammar active: reading active window and adapting non-variable connectors. Click for static scaffolding." : "AI Grammar paused. Click to enable AI Grammar Polish."}
          >
            <Sparkles size={11} className={graphicsNarrativeAiGrammar ? (isPolishing ? "text-amber-500 animate-spin" : "text-amber-600") : "opacity-40"} />
            <span>{graphicsNarrativeAiGrammar ? (isPolishing ? "Polishing..." : "AI Grammar: On") : "AI Grammar: Off"}</span>
          </button>
        </div>

        {/* Date Selector with day advance and reverse buttons */}
        {selectedDate && (
          <div className="flex items-center bg-[#FAF3E0]/90 border border-[#EADDC7] rounded-xl px-1 py-0.5 shadow-2xs">
            {onPrevDay && (
              <button
                type="button"
                id="narrative-date-prev-btn"
                onClick={() => {
                  if (triggerHaptic) triggerHaptic("light");
                  onPrevDay();
                }}
                className="p-1 rounded-lg hover:bg-[#EADDC7]/70 text-[#3D312A] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="Previous Day"
                aria-label="Previous Day"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
            )}

            <div className="relative flex items-center gap-1.5 px-2 py-0.5 text-center cursor-pointer group select-none">
              <CalendarDays size={13} className="text-[#8C7A6B] shrink-0 group-hover:text-[#3D312A] transition-colors" />
              <span className="text-[11px] sm:text-xs font-black text-[#3D312A] whitespace-nowrap">
                {formattedNarrativeDate}
              </span>
              {onSelectDate && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      if (triggerHaptic) triggerHaptic("light");
                      onSelectDate(e.target.value);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Click to select date"
                />
              )}
            </div>

            {onNextDay && (
              <button
                type="button"
                id="narrative-date-next-btn"
                onClick={() => {
                  if (triggerHaptic) triggerHaptic("light");
                  onNextDay();
                }}
                className="p-1 rounded-lg hover:bg-[#EADDC7]/70 text-[#3D312A] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="Next Day"
                aria-label="Next Day"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          id="narrative-top-close-btn"
          onClick={() => {
            if (triggerHaptic) triggerHaptic("light");
            onCloseNarrativeMode();
          }}
          className="p-2 rounded-full hover:bg-black/10 text-[#4A3B32] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          title="Return to standard Focus Task Card"
          aria-label="Return to Focus Task Card"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Main Content Area - Narrative Text and Pill Buttons moved up above floating plus sign */}
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 md:px-14 pt-2 sm:pt-3 flex flex-col items-start transition-all duration-300">
        <div className="w-full text-left">
          <div
            id="full-active-window-narrative-text"
            className="leading-[1.18] font-sans font-normal tracking-tight text-[#1A1815] break-words select-text transition-all duration-300 block text-left"
            style={{
              fontSize: typeof window !== "undefined" && window.innerWidth < 640
                ? `${Math.min(graphicsNarrativeFontSize, 36)}pt`
                : `${graphicsNarrativeFontSize}pt`,
              lineHeight: 1.18
            }}
          >
            {/* From START_TIME to END_TIME you will */}
            <span>{connectors.leadIn}</span>
            <span
              onClick={() => toggleDropdown("time")}
              className="text-[#1E6B40] font-semibold underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer hover:opacity-85 transition-opacity"
              title="Click to adjust start time & duration"
            >
              {startTimeStr}
            </span>
            <span>{connectors.timeSeparator}</span>
            <span
              onClick={() => toggleDropdown("time")}
              className="text-[#1E6B40] font-semibold underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer hover:opacity-85 transition-opacity"
              title="Click to adjust start time & duration"
            >
              {endTimeStr}
            </span>
            <span>{connectors.actionConnector}</span>

            {/* TITLE */}
            <span
              onClick={() => toggleDropdown("title")}
              className="text-[#1E6B40] font-semibold underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer hover:opacity-85 transition-opacity"
              title="Click to edit task title"
            >
              {title}
            </span>

            {/* LOCATION (if present in narrative) */}
            {location && (
              <>
                <span>{connectors.locationConnector || " at "}</span>
                <span
                  onClick={() => toggleDropdown("location")}
                  className="text-[#1E6B40] font-semibold underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer hover:opacity-85 transition-opacity"
                  title="Click to edit or remove location"
                >
                  {location}
                </span>
              </>
            )}

            {/* COLLABORATOR (if present in narrative) */}
            {collaborator && (
              <>
                <span>{connectors.collaboratorConnector || " with "}</span>
                <span
                  onClick={() => toggleDropdown("collaborator")}
                  className="text-[#1E6B40] font-semibold underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer hover:opacity-85 transition-opacity"
                  title="Click to edit or remove collaborator"
                >
                  {collaborator}
                </span>
              </>
            )}

            {/* TRANSIT TIME (if present in narrative) */}
            {hasTransit && (
              <>
                <span>{connectors.transitConnector || " with "}</span>
                <span
                  onClick={() => toggleDropdown("transit")}
                  className="text-[#1E6B40] font-semibold underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer hover:opacity-85 transition-opacity"
                  title="Click to edit or remove transit time"
                >
                  {transitText}
                </span>
              </>
            )}

            {/* PRIORITY (if present in narrative) */}
            {hasPriority && (
              <>
                <span>{connectors.priorityConnector || " as "}</span>
                <span
                  onClick={() => toggleDropdown("priority")}
                  className="text-[#1E6B40] font-semibold underline decoration-[#1E6B40] underline-offset-8 sm:underline-offset-[12px] decoration-2 cursor-pointer hover:opacity-85 transition-opacity"
                  title="Click to edit or remove priority"
                >
                  {priorityLabel}{connectors.prioritySuffix !== undefined ? connectors.prioritySuffix : " priority"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Task Data Pill Buttons: Exactly 2 rows below narrative live text, with no enclosing box */}
        <div
          id="narrative-pill-buttons-container"
          className="w-full relative z-20 bg-transparent border-0 p-0 shadow-none"
          style={{
            marginTop: typeof window !== "undefined" && window.innerWidth < 640
              ? `calc(2 * 1.18 * ${Math.min(graphicsNarrativeFontSize, 36)}pt)`
              : `calc(2 * 1.18 * ${graphicsNarrativeFontSize}pt)`
          }}
        >
          {/* Pill Buttons Row: Only blank data elements are shown in choices, completely unboxed */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 relative bg-transparent border-0 p-0 shadow-none" ref={dropdownRef}>
            {/* 1. Location Pill Button (Orange) - only shown when location is blank */}
            {(!location || !location.trim()) && (
              <button
                type="button"
                id="narrative-pill-location"
                onClick={() => toggleDropdown("location")}
                style={{ fontSize: `${Math.round(graphicsNarrativePillFontSize * 0.85)}pt` }}
                className="text-white font-bold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-xs flex items-center gap-1 cursor-pointer select-none transition-all active:scale-95 bg-[#DE771B] hover:bg-[#C86612]"
                title="Add Location to narrative"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>+ Location</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${activeDropdown === "location" ? "rotate-180" : ""}`} />
              </button>
            )}

            {/* 2. Collaborator Pill Button (Purple) - only shown when collaborator is blank */}
            {(!collaborator || !collaborator.trim()) && (
              <button
                type="button"
                id="narrative-pill-collaborator"
                onClick={() => toggleDropdown("collaborator")}
                style={{ fontSize: `${Math.round(graphicsNarrativePillFontSize * 0.85)}pt` }}
                className="text-white font-bold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-xs flex items-center gap-1 cursor-pointer select-none transition-all active:scale-95 bg-[#7B24C7] hover:bg-[#6A1BB0]"
                title="Add Collaborator to narrative"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>+ Collaborator</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${activeDropdown === "collaborator" ? "rotate-180" : ""}`} />
              </button>
            )}

            {/* 3. Transit Time Pill Button (Blue) - only shown when transit is blank */}
            {!hasTransit && (
              <button
                type="button"
                id="narrative-pill-transit"
                onClick={() => toggleDropdown("transit")}
                style={{ fontSize: `${Math.round(graphicsNarrativePillFontSize * 0.85)}pt` }}
                className="text-white font-bold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-xs flex items-center gap-1 cursor-pointer select-none transition-all active:scale-95 bg-[#2272EB] hover:bg-[#1A5EC4]"
                title="Add Transit Time to narrative"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>+ Transit Time</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${activeDropdown === "transit" ? "rotate-180" : ""}`} />
              </button>
            )}

            {/* 4. Priority Pill Button (Red) - only shown when priority is blank */}
            {!hasPriority && (
              <button
                type="button"
                id="narrative-pill-priority"
                onClick={() => toggleDropdown("priority")}
                style={{ fontSize: `${Math.round(graphicsNarrativePillFontSize * 0.85)}pt` }}
                className="text-white font-bold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-xs flex items-center gap-1 cursor-pointer select-none transition-all active:scale-95 bg-[#C82A2A] hover:bg-[#B02020]"
                title="Add Priority to narrative"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>+ Priority</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${activeDropdown === "priority" ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {/* Function buttons converted into icons directly below task data pills */}
          <div
            id="narrative-action-buttons-row"
            className="flex items-center gap-2 pt-4 overflow-x-auto no-scrollbar flex-nowrap"
            aria-label="Active window actions"
          >
            {/* Focus Card Return Icon Button */}
            <button
              type="button"
              id="narrative-pill-focus-card-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("light");
                onCloseNarrativeMode();
              }}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-[#1C3B2B] hover:bg-[#2D6A4F] text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all border border-white/15 shrink-0"
              title="Return to standard Focus Task Card"
              aria-label="Return to standard Focus Task Card"
            >
              <LayoutGrid size={15} strokeWidth={2.2} />
            </button>

            {/* Prev Task Icon Button */}
            <button
              type="button"
              id="narrative-pill-prev-task-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("light");
                onPrevTask();
              }}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-[#2C241E]/85 hover:bg-[#1C3B2B] text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all border border-white/10 shrink-0"
              title="Previous task"
              aria-label="Previous task"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>

            {/* Timer Start/Pause Icon Button */}
            <button
              type="button"
              id="narrative-pill-timer-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("medium");
                if (isStarted) {
                  onPauseTimer();
                } else {
                  onStartTimer();
                }
              }}
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all shrink-0 ${
                isStarted
                  ? "bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/40"
                  : "bg-emerald-700 hover:bg-emerald-600 border border-emerald-400/30"
              }`}
              title={isStarted ? `Pause focus timer (${dispMin}:${dispSec < 10 ? `0${dispSec}` : dispSec})` : `Start focus timer (${dispMin}:${dispSec < 10 ? `0${dispSec}` : dispSec})`}
              aria-label={isStarted ? "Pause timer" : "Start timer"}
            >
              {isStarted ? <Pause size={14} strokeWidth={2.5} /> : <Play size={14} strokeWidth={2.5} fill="currentColor" />}
            </button>

            {/* Done / Complete Icon Button */}
            <button
              type="button"
              id="narrative-pill-complete-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("medium");
                onToggleComplete();
              }}
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all shrink-0 ${
                currentFocus.completed
                  ? "bg-emerald-700 hover:bg-emerald-600 border border-emerald-400/30"
                  : "bg-[#1C3B2B] hover:bg-[#2D6A4F] border border-white/15"
              }`}
              title={currentFocus.completed ? "Task Completed (Click to mark incomplete)" : "Mark Task Complete"}
              aria-label={currentFocus.completed ? "Mark incomplete" : "Mark complete"}
            >
              <Check size={16} strokeWidth={2.5} />
            </button>

            {/* Next Task Icon Button */}
            <button
              type="button"
              id="narrative-pill-next-task-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("light");
                onNextTask();
              }}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-[#2C241E]/85 hover:bg-[#1C3B2B] text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all border border-white/10 shrink-0"
              title="Next task"
              aria-label="Next task"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>

            {/* Audio Speech Narration Icon Button */}
            {handleSpeechToggle && (
              <button
                type="button"
                id="narrative-pill-speech-btn"
                onClick={() => {
                  if (triggerHaptic) triggerHaptic("light");
                  handleSpeechToggle(currentFocus, assembledSentence);
                }}
                className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all border border-white/10 shrink-0 ${
                  isSpeaking ? "bg-purple-600 hover:bg-purple-500 ring-2 ring-purple-400" : "bg-[#2C241E]/85 hover:bg-[#1C3B2B]"
                }`}
                title={isSpeaking ? "Stop narrative reading" : "Read narrative aloud"}
                aria-label={isSpeaking ? "Stop reading" : "Read narrative"}
              >
                {isSpeaking ? <VolumeX size={15} strokeWidth={2.2} /> : <Volume2 size={15} strokeWidth={2.2} />}
              </button>
            )}

            {/* Edit Task Details Icon Button */}
            <button
              type="button"
              id="narrative-pill-edit-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("light");
                onEditTask();
              }}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-[#2C241E]/85 hover:bg-[#1C3B2B] text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all border border-white/10 shrink-0"
              title="Edit task details"
              aria-label="Edit task details"
            >
              <Edit3 size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      {/* Centered Modal Window for Pulldown Choices when touching narrative variables or pills */}
      {typeof document !== "undefined" && renderPulldownWindowModal()}

      {/* Screen Border Navigation Arrows (Fixed at Left & Right Screen Edges to Advance/Reverse Focus Card) */}
      {typeof document !== "undefined" && createPortal(
        <>
          {onPrevTask && (
            <button
              type="button"
              id="narrative-screen-prev-arrow-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("light");
                onPrevTask();
              }}
              className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[600] p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 hover:scale-110 shadow-xl backdrop-blur-md select-none bg-[#FAF3E0]/95 hover:bg-white text-[#3D312A] hover:text-[#1C3B2B] border-2 border-[#D8C7AF] hover:border-[#1C3B2B]/40 shadow-[0_4px_16px_rgba(45,35,25,0.22)] group"
              title="Previous Task (Card Backward)"
              aria-label="Previous Task (Card Backward)"
            >
              <ChevronLeft size={24} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}

          {onNextTask && (
            <button
              type="button"
              id="narrative-screen-next-arrow-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic("light");
                onNextTask();
              }}
              className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[600] p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 hover:scale-110 shadow-xl backdrop-blur-md select-none bg-[#FAF3E0]/95 hover:bg-white text-[#3D312A] hover:text-[#1C3B2B] border-2 border-[#D8C7AF] hover:border-[#1C3B2B]/40 shadow-[0_4px_16px_rgba(45,35,25,0.22)] group"
              title="Next Task (Card Forward)"
              aria-label="Next Task (Card Forward)"
            >
              <ChevronRight size={24} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </>,
        document.body
      )}
    </div>
  );
});

FullActiveWindowNarrativeView.displayName = "FullActiveWindowNarrativeView";
