import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Navigation, 
  CloudSun, 
  Sparkles, 
  Loader2,
  Sun,
  CloudRain,
  Cloud,
  CloudSnow,
  CloudLightning,
  Check,
  Plus,
  Trash2,
  ListTodo,
  ExternalLink,
  ArrowUpRight,
  X,
  RefreshCw,
  User,
  AlertTriangle,
  Compass,
  FileText,
  FileSpreadsheet,
  Link,
  Copy
} from "lucide-react";

interface FocusTarget {
  id: string;
  title: string;
  location?: string;
  notes?: string;
  collaborator?: string;
  attendees?: string;
  category?: string;
  groupId?: string;
  beforeBufferPurpose?: string;
  afterBufferPurpose?: string;
  travelBefore?: number;
  travelAfter?: number;
}

interface TaskSolutionProps {
  currentFocus: any;
  currentFocusTarget: FocusTarget;
  currentFocusIndex: number;
  focusQueueTasks: any[];
  isDark: boolean;
  notes: any[];
  onPassTask: () => void;
  onUpdateSubtasks: (taskId: string, newSubtasks: any[]) => void;
  onConvertToTask?: (taskId: string, subId: string) => void;
  tasks?: any[]; // Passed from main App tasks list
  defaultWeatherLocation?: string;
  onUpdateBufferPurpose?: (taskId: string, bufferType: "before" | "after", purpose: string) => void;
}

const LOADING_STEPS = [
  "Analyzing task workspace parameters...",
  "Searching biography & background of collaborators...",
  "Analyzing workspace histories for associated tasks...",
  "Scanning notes for Google Drive document references...",
  "Formulating solutions, risks, and steps via Gemini..."
];

export const TaskSolutionView: React.FC<TaskSolutionProps> = ({
  currentFocus,
  currentFocusTarget,
  currentFocusIndex,
  focusQueueTasks,
  isDark,
  notes,
  onPassTask,
  onUpdateSubtasks,
  onConvertToTask,
  tasks = [],
  defaultWeatherLocation = "",
  onUpdateBufferPurpose
}) => {
  // Weather state
  const [weather, setWeather] = useState<{ temp: string; climate: string; description: string; wind: string; humidity: string } | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Executive Synthesis State
  const [summaryText, setSummaryText] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorText, setErrorText] = useState("");
  const [copied, setCopied] = useState(false);

  // Subtask local states
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const weatherLocation = currentFocusTarget?.location || defaultWeatherLocation || "";
  const isUsingDefaultWeatherLocation = !currentFocusTarget?.location && !!defaultWeatherLocation;
  const nextTask = focusQueueTasks[currentFocusIndex + 1] || null;
  const subtasksList = currentFocus?.subtasks || [];
  const aiSubtasksEnabled = localStorage.getItem("ai_subtasks_enabled") !== "false";

  // Helper for Cache in localStorage
  const getCachedSummary = (taskId: string): string | null => {
    try {
      const raw = localStorage.getItem("taskpass_ai_summaries_cache");
      if (!raw) return null;
      const cache = JSON.parse(raw);
      return cache[taskId] || null;
    } catch {
      return null;
    }
  };

  const setCachedSummary = (taskId: string, text: string) => {
    try {
      const raw = localStorage.getItem("taskpass_ai_summaries_cache");
      const cache = raw ? JSON.parse(raw) : {};
      cache[taskId] = text;
      localStorage.setItem("taskpass_ai_summaries_cache", JSON.stringify(cache));
    } catch {}
  };

  // Extract Related Tasks & Collaborators Context
  const collaborator = currentFocusTarget?.collaborator?.trim();

  // Tasks with same collaborator
  const otherCollaboratorTasks = useMemo(() => {
    if (!collaborator || !tasks.length) return [];
    return tasks
      .filter(t => t.id !== currentFocusTarget.id && t.collaborator?.trim().toLowerCase() === collaborator.toLowerCase())
      .map(t => ({ title: t.title, notes: t.notes || "" }));
  }, [collaborator, tasks, currentFocusTarget.id]);

  // Semantically related tasks in workspace
  const relatedTasksNotes = useMemo(() => {
    if (!tasks.length) return [];
    
    // Keyword parsing for semantic match
    const keywords = currentFocusTarget.title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !["with", "this", "that", "from", "your", "task", "project", "meet", "meeting", "call"].includes(w));

    const isMatch = (t: any) => {
      if (t.id === currentFocusTarget.id) return false;
      if (t.groupId && currentFocusTarget.groupId && t.groupId === currentFocusTarget.groupId) return true;
      if (t.category && currentFocusTarget.category && t.category === currentFocusTarget.category && t.category !== "none") return true;
      
      const titleLower = t.title.toLowerCase();
      return keywords.some(k => titleLower.includes(k));
    };

    return tasks
      .filter(isMatch)
      .map(t => ({
        title: t.title,
        notes: t.notes || "",
        category: t.category || ""
      }));
  }, [tasks, currentFocusTarget]);

  // Parse Google Drive links from current & related tasks
  const driveLinks = useMemo(() => {
    const links: { title: string; url: string }[] = [];
    const linkRegex = /(https?:\/\/(?:docs|drive|sheets|slides)\.google\.com\/[^\s)"]+)/gi;

    // Check current notes
    if (currentFocusTarget.notes) {
      const matches = currentFocusTarget.notes.match(linkRegex);
      if (matches) {
        matches.forEach(url => links.push({ title: "Primary Document Link", url }));
      }
    }

    // Check related tasks notes
    relatedTasksNotes.forEach(rt => {
      if (rt.notes) {
        const matches = rt.notes.match(linkRegex);
        if (matches) {
          matches.forEach(url => links.push({ title: `Drive attachment from "${rt.title}"`, url }));
        }
      }
    });

    // Deduplicate
    const seen = new Set<string>();
    return links.filter(l => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });
  }, [currentFocusTarget.notes, relatedTasksNotes]);

  // Synthesis trigger function
  const triggerSynthesis = async (force = false) => {
    const cached = getCachedSummary(currentFocusTarget.id);
    if (cached && !force) {
      setSummaryText(cached);
      setErrorText("");
      return;
    }

    setIsSynthesizing(true);
    setLoadingStep(0);
    setErrorText("");

    // Interval to cycle loading tips
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length);
    }, 2500);

    try {
      const response = await fetch("/api/synthesize-solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: currentFocusTarget.title,
          taskDescription: currentFocusTarget.notes,
          collaborator: collaborator || "",
          otherCollaboratorTasks,
          relatedTasksNotes,
          subtasks: subtasksList.map((s: any) => s.title)
        })
      });

      const data = await response.json();
      if (data.success && data.markdown) {
        setSummaryText(data.markdown);
        setCachedSummary(currentFocusTarget.id, data.markdown);
      } else {
        setErrorText(data.error || "Failed to compile intelligence briefing. Please try again.");
      }
    } catch (err) {
      setErrorText("A network connection issue occurred while syncing workspace intelligence.");
    } finally {
      clearInterval(interval);
      setIsSynthesizing(false);
    }
  };

  // Fetch Weather & trigger synthesis on mount or currentFocusTarget changes
  useEffect(() => {
    triggerSynthesis(false);

    if (!weatherLocation) {
      setWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setIsWeatherLoading(true);
      try {
        const response = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: weatherLocation })
        });
        const data = await response.json();
        if (data.success) {
          setWeather({
            temp: data.temp || "68",
            climate: data.climate || "Sunny",
            description: data.description || "Mild climate with fine visibility",
            wind: data.wind || "5 mph",
            humidity: data.humidity || "45%"
          });
        }
      } catch (err) {
        // Silent recovery
      } finally {
        setIsWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [currentFocusTarget.id, weatherLocation]);

  // Weather Icon Matcher
  const getWeatherIcon = (climateStr: string) => {
    const c = climateStr.toLowerCase();
    if (c.includes("sun") || c.includes("clear")) return <Sun className="w-5 h-5 text-amber-400 animate-pulse" />;
    if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return <CloudRain className="w-5 h-5 text-sky-400" />;
    if (c.includes("cloud") || c.includes("overcast")) return <Cloud className="w-5 h-5 text-indigo-300" />;
    if (c.includes("snow") || c.includes("freeze")) return <CloudSnow className="w-5 h-5 text-blue-300" />;
    if (c.includes("storm") || c.includes("lightning") || c.includes("thunder")) return <CloudLightning className="w-5 h-5 text-yellow-400 animate-bounce" />;
    return <Sun className="w-5 h-5 text-amber-400" />;
  };

  // Subtask Actions
  const toggleSubtask = (subId: string) => {
    const updated = subtasksList.map((sub: any) => {
      if (sub.id === subId) {
        return { ...sub, completed: !sub.completed };
      }
      return sub;
    });
    onUpdateSubtasks(currentFocus.id, updated);
  };

  const editSubtaskTitle = (subId: string, newTitle: string) => {
    const updated = subtasksList.map((sub: any) => {
      if (sub.id === subId) {
        return { ...sub, title: newTitle };
      }
      return sub;
    });
    onUpdateSubtasks(currentFocus.id, updated);
  };

  const deleteSubtask = (subId: string) => {
    const updated = subtasksList.filter((sub: any) => sub.id !== subId);
    onUpdateSubtasks(currentFocus.id, updated);
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newSub = {
      id: "sub_" + Math.random().toString(36).substr(2, 9),
      title: newSubtaskText.trim(),
      completed: false
    };
    const updated = [...subtasksList, newSub];
    onUpdateSubtasks(currentFocus.id, updated);
    setNewSubtaskText("");

    setTimeout(() => {
      const addInput = document.getElementById(`focus-add-subtask-input-${currentFocus.id}`);
      if (addInput) addInput.focus();
    }, 50);
  };

  const cardClass = `p-3 rounded-2xl border flex flex-col justify-between overflow-hidden relative transition-all duration-200 text-left ${
    isDark 
      ? "bg-slate-900/40 border-slate-800/80 text-white hover:bg-slate-900/50 hover:border-slate-800" 
      : "bg-white/60 border-slate-200 text-slate-900 hover:bg-white/80 hover:border-slate-300"
  }`;

  const completedCount = subtasksList.filter((s: any) => s.completed).length;

  return (
    <div className="flex flex-col space-y-2.5 pb-4 select-text scroll-smooth h-auto">
      
      {currentFocus.isBuffer && onUpdateBufferPurpose && (
        <div className={`p-3 rounded-2xl select-none text-left border ${
          isDark 
            ? "bg-slate-950/40 border-white/5 text-slate-300" 
            : "bg-slate-50/50 border-slate-200 text-slate-700"
        }`}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2 text-indigo-400">
            Touch to select Activity Type:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Driving", "Walking", "Transit", "Preparation", "Coffee Break", "Setup", "Wind down"].map(act => {
              const currentPurpose = currentFocus.bufferType === "before"
                ? (currentFocusTarget.beforeBufferPurpose || "Preparation")
                : (currentFocusTarget.afterBufferPurpose || "Wind down");
              const isActive = currentPurpose.toLowerCase() === act.toLowerCase();
              return (
                <button
                  key={act}
                  type="button"
                  onClick={() => {
                    onUpdateBufferPurpose(currentFocusTarget.id, currentFocus.bufferType as "before" | "after", act);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 border-indigo-505 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : isDark
                        ? "bg-slate-900/60 border-white/5 text-slate-300 hover:text-white hover:bg-slate-800"
                        : "bg-white border-slate-200 text-slate-750 hover:bg-slate-50"
                  }`}
                >
                  {act}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CARD 1: SYNTHESIZED AI EXECUTIVE SUMMARY BRIEFING */}
      <div className={cardClass}>
        <div className="flex flex-col space-y-3">
          
          {/* Header Action Row */}
          <div className="flex items-center justify-between border-b border-indigo-500/15 pb-2 select-none">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">A.I. Executive Briefing</span>
            </div>
            
            <div className="flex items-center gap-2">
              {!isSynthesizing && summaryText && (
                <span className={`text-[8px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5 rounded ${
                  isDark ? "bg-slate-950/50 text-slate-400 border border-white/5" : "bg-slate-100 text-slate-650"
                }`}>
                  Synced Offline
                </span>
              )}
              {!isSynthesizing && summaryText && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(summaryText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all select-none cursor-pointer border ${
                    copied
                      ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                      : isDark
                        ? "bg-slate-850/40 hover:bg-slate-800/60 text-slate-300 border-white/5 active:scale-97"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 active:scale-97"
                  }`}
                  title="Copy executive briefing to clipboard"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? "Copied!" : "Copy Briefing"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => triggerSynthesis(true)}
                disabled={isSynthesizing}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all select-none cursor-pointer border ${
                  isDark
                    ? "bg-indigo-650/15 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/20 active:scale-97 disabled:opacity-40"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200 active:scale-97 disabled:opacity-40"
                }`}
                title="Regenerate intelligence briefing"
              >
                <RefreshCw className={`w-3 h-3 ${isSynthesizing ? "animate-spin" : ""}`} />
                <span>Sync Intelligence</span>
              </button>
            </div>
          </div>

          {/* Core Content Area */}
          {isSynthesizing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
                  Compiling Executive Briefing...
                </p>
                <p className="text-[9.5px] text-slate-500 italic max-w-[280px]">
                  {LOADING_STEPS[loadingStep]}
                </p>
              </div>
            </div>
          ) : errorText ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-2 text-center">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
              <p className="text-[10.5px] font-bold text-rose-400">{errorText}</p>
              <button
                type="button"
                onClick={() => triggerSynthesis(true)}
                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
              >
                Retry Syncer
              </button>
            </div>
          ) : summaryText ? (
            <div className="prose prose-sm max-w-none text-left select-text">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => (
                    <h1 
                      className={`text-[10.5px] font-black tracking-wider mt-5 mb-2.5 uppercase border-l-2 pl-2 flex items-center gap-1.5 ${
                        isDark ? "text-indigo-400 border-indigo-500" : "text-indigo-650 border-indigo-600"
                      }`} 
                      {...props} 
                    />
                  ),
                  h2: ({node, ...props}) => (
                    <h2 
                      className={`text-[10px] font-black mt-4 mb-2 uppercase ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`} 
                      {...props} 
                    />
                  ),
                  h3: ({node, ...props}) => (
                    <h3 
                      className={`text-[9.5px] font-extrabold mt-3 mb-1.5 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`} 
                      {...props} 
                    />
                  ),
                  p: ({node, ...props}) => (
                    <p 
                      className={`text-[10.5px] leading-relaxed mb-3 ${
                        isDark ? "text-slate-300" : "text-slate-650"
                      }`} 
                      {...props} 
                    />
                  ),
                  ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-3.5 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-3.5 space-y-1" {...props} />,
                  li: ({node, ...props}) => (
                    <li 
                      className={`text-[10.5px] leading-relaxed ${
                        isDark ? "text-slate-300" : "text-slate-650"
                      }`} 
                      {...props} 
                    />
                  ),
                  strong: ({node, ...props}) => (
                    <strong 
                      className={`font-black ${
                        isDark ? "text-white" : "text-slate-900"
                      }`} 
                      {...props} 
                    />
                  ),
                  code: ({node, ...props}) => (
                    <code 
                      className={`font-mono text-[9.5px] px-1 py-0.5 rounded border ${
                        isDark 
                          ? "bg-slate-950/80 text-teal-400 border-white/5" 
                          : "bg-slate-100 text-teal-700 border-slate-200"
                      }`} 
                      {...props} 
                    />
                  )
                }}
              >
                {summaryText}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">
                No active briefing compiled. Click Sync above to generate.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* CARD 2: REFERENCE GOOGLE DRIVE FILES PANEL */}
      {driveLinks.length > 0 && (
        <div className={cardClass}>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-400 border-b border-indigo-500/10 pb-1.5 mb-1 select-none">
              <Link className="w-3.5 h-3.5" />
              <span className="text-[9.5px] font-black uppercase tracking-wider">Reference Google Drive Resources</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {driveLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all text-left group cursor-pointer ${
                    isDark 
                      ? "bg-slate-955/30 border-white/5 hover:bg-slate-950/60 hover:border-indigo-500/20" 
                      : "bg-slate-50 border-slate-205 hover:bg-white hover:border-indigo-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                      {link.url.includes("sheet") ? (
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className={`text-[9.5px] font-black truncate ${isDark ? "text-slate-105" : "text-slate-900"}`}>
                        {link.title}
                      </p>
                      <p className="text-[7.5px] text-indigo-400 font-mono truncate max-w-[140px]">
                        {link.url}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0 ml-1.5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CARD 3: WEATHER & UPCOMING DESTINATION COMPACT GRID */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        
        {/* PANEL A: UPCOMING CHRONO DESTINATION */}
        <div className={cardClass}>
          <div className="flex flex-col h-full justify-between min-h-0">
            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-1 mb-1 select-none shrink-0">
              <div className="flex items-center gap-1.5 text-indigo-400">
                <Navigation className="w-3.5 h-3.5" />
                <span className="text-[9.5px] font-black uppercase tracking-wider">Next Destination</span>
              </div>
              {nextTask && nextTask.location && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(weatherLocation)}&destination=${encodeURIComponent(nextTask.location)}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="px-1.5 py-0.5 bg-indigo-650 hover:bg-indigo-600 transition-all text-white font-black text-[7.5px] uppercase tracking-wider rounded-md flex items-center gap-0.5 cursor-pointer shadow-sm active:scale-98"
                  title="View Route"
                >
                  <Compass className="w-2.5 h-2.5" />
                  <span>Route</span>
                </a>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-center min-h-0 pt-0.5">
              {nextTask ? (
                <div className="space-y-0.5 text-left min-h-0">
                  <p className="text-[7.5px] text-slate-450 font-bold uppercase tracking-wider">Next chronologically:</p>
                  <h4 className="font-extrabold text-[12px] line-clamp-1 leading-snug">{nextTask.title}</h4>
                  {nextTask.location ? (
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      <span className="text-[8.5px] font-bold text-indigo-400 bg-indigo-500/5 px-1 rounded border border-indigo-500/10 max-w-full truncate">
                        📍 {nextTask.location}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[8px] text-slate-500 italic">No location registered.</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-1">
                  <p className="text-[9px] font-bold text-slate-455 uppercase tracking-widest">No upcoming tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL B: LIVE ENVIRONMENT WEATHER */}
        <div className={cardClass}>
          <div className="flex flex-col h-full justify-between min-h-0">
            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-1 mb-1 select-none shrink-0">
              <div className="flex items-center gap-1.5 text-indigo-400">
                <CloudSun className="w-3.5 h-3.5" />
                <span className="text-[9.5px] font-black uppercase tracking-wider">Live Weather</span>
              </div>
              {weatherLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setWeather(null);
                    const forceFetch = async () => {
                      setIsWeatherLoading(true);
                      try {
                        const res = await fetch("/api/weather", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ location: weatherLocation })
                        });
                        const d = await res.json();
                        if (d.success) {
                          setWeather({
                            temp: d.temp || "68",
                            climate: d.climate || "Sunny",
                            description: d.description || "Stable settings",
                            wind: d.wind || "6 mph",
                            humidity: d.humidity || "40%"
                          });
                        }
                      } catch {}
                      setIsWeatherLoading(false);
                    };
                    forceFetch();
                  }}
                  className="text-[7.5px] font-black text-indigo-400 hover:text-white uppercase transition-all bg-indigo-500/5 hover:bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/10 cursor-pointer"
                >
                  Sync
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-0 pt-0.5">
              {weatherLocation ? (
                isWeatherLoading ? (
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                    <span className="text-[9.5px] text-slate-450">Syncing...</span>
                  </div>
                ) : weather ? (
                  <div className="flex items-center justify-between bg-slate-950/15 p-1 rounded-lg border border-white/5 min-h-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[15px] font-black font-mono leading-none">{weather.temp}°</span>
                        <span className="text-[8px] font-black text-rose-455 uppercase truncate max-w-[55px]">{weather.climate}</span>
                      </div>
                      <p className="text-[8.5px] text-slate-400 truncate mt-0.5 leading-none">
                        {weatherLocation} {isUsingDefaultWeatherLocation && <span className="text-[7.5px] text-amber-500 italic font-bold">(Default)</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-center shrink-0 ml-1.5">
                      {getWeatherIcon(weather.climate)}
                      <span className="text-[7px] text-slate-455 font-mono mt-0.5">{weather.wind} | {weather.humidity}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-[8px] text-slate-500 italic">No telemetry downloaded</p>
                  </div>
                )
              ) : (
                <div className="text-center flex flex-col items-center justify-center py-1 gap-1">
                  <p className="text-[8px] text-slate-500 italic leading-snug">Attach location on Page 1</p>
                  <p className="text-[7.5px] text-indigo-400 font-medium">Or set Default in Gear Menu</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CARD 4: INTERACTIVE CHECKLIST & SUBTASK MANAGER */}
      {aiSubtasksEnabled && (
        <div className={cardClass}>
          <div className="flex flex-col min-h-0">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-indigo-500/10 pb-1.5 mb-1.5 select-none shrink-0">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <ListTodo className="w-3.5 h-3.5" />
              <span className="text-[9.5px] font-black uppercase tracking-wider">Subtasks & Checklist</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setShowBulk(!showBulk)}
                className="text-[8.5px] font-black text-[#2DD4BF] hover:underline flex items-center gap-1 cursor-pointer select-none"
              >
                {showBulk ? "✕ Close Bulk" : "📝 Bulk Entry"}
              </button>
              
              {subtasksList.length > 0 && !showBulk && (
                <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] font-black uppercase ${
                  completedCount === subtasksList.length
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                }`}>
                  {completedCount} / {subtasksList.length} Done
                </span>
              )}
            </div>
          </div>

          {/* Subtask Main Form/Lists */}
          {showBulk ? (
            <div className="flex flex-col space-y-2 mt-1">
              <textarea
                autoFocus
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Enter subtasks (one per line)...\nPress Enter to go to next row"}
                rows={3}
                className="w-full p-2.5 text-[10px] font-bold rounded-lg border bg-slate-950/60 border-white/10 text-white placeholder-slate-600 outline-none focus:border-indigo-500 resize-none font-sans"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const lines = bulkText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
                    const parsedSubs = lines.map(line => ({
                      id: "sub_" + Math.random().toString(36).substr(2, 9),
                      title: line,
                      completed: false
                    }));
                    const updated = [...subtasksList, ...parsedSubs];
                    onUpdateSubtasks(currentFocus.id, updated);
                    setBulkText("");
                    setShowBulk(false);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 text-slate-950 font-black text-[9.5px] uppercase tracking-wider transition-all cursor-pointer text-center active:scale-[0.98]"
                >
                  Insert Subtasks
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulk(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Checklist list */}
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar pr-0.5">
                {subtasksList.length > 0 ? (
                  subtasksList.map((sub: any, index: number) => (
                    <div 
                      key={sub.id || index} 
                      className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border transition-all ${
                        sub.completed 
                          ? isDark
                            ? "bg-emerald-950/5 border-emerald-500/10 hover:bg-emerald-950/10"
                            : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50"
                          : isDark
                            ? "bg-slate-955/30 border-white/5 hover:bg-slate-900/30"
                            : "bg-white border-slate-205 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSubtask(sub.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            sub.completed 
                              ? "bg-emerald-500 border-emerald-500" 
                              : isDark
                                ? "bg-slate-900 border-white/20 hover:border-indigo-400"
                                : "bg-white border-slate-300 hover:border-indigo-500"
                          }`}
                        >
                          {sub.completed && <Check size={10} strokeWidth={4} className="text-slate-955" />}
                        </button>

                        <input
                          id={`focus-subtask-input-${currentFocus.id}-${index}`}
                          type="text"
                          value={sub.title}
                          onChange={(e) => editSubtaskTitle(sub.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const nextInput = document.getElementById(`focus-subtask-input-${currentFocus.id}-${index + 1}`) || document.getElementById(`focus-add-subtask-input-${currentFocus.id}`);
                              if (nextInput) {
                                (nextInput as HTMLInputElement).focus();
                              }
                            }
                          }}
                          className={`text-[10px] font-bold bg-transparent border-none outline-none focus:outline-none focus:ring-0 w-full py-0 px-1 leading-tight ${
                            sub.completed 
                              ? "line-through text-slate-500 opacity-60" 
                              : isDark 
                                ? "text-slate-200 focus:text-white" 
                                : "text-slate-800 focus:text-black"
                          }`}
                          placeholder="Subtask name..."
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {(() => {
                          const matchedUrls = sub.title?.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi);
                          if (!matchedUrls) return null;
                          const url = matchedUrls[0];
                          const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-emerald-500/10 rounded text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                              title="Open link in browser"
                            >
                              <ExternalLink size={11} strokeWidth={2.5} />
                            </a>
                          );
                        })()}
                        {onConvertToTask && (
                          <button
                            type="button"
                            onClick={() => onConvertToTask(currentFocus.id, sub.id)}
                            className="p-1 hover:bg-indigo-500/10 rounded text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 cursor-pointer"
                            title="Convert to parent task"
                          >
                            <ArrowUpRight size={11} strokeWidth={2.5} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteSubtask(sub.id)}
                          className="p-1 hover:bg-rose-500/10 rounded text-slate-500 hover:text-rose-455 transition-colors shrink-0 cursor-pointer"
                          title="Delete subtask"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center space-y-1">
                    <ListTodo className="w-5 h-5 text-slate-600 opacity-40" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No subtasks yet</p>
                  </div>
                )}
              </div>

              {/* Quick Input Add */}
              <div className="pt-2 border-t border-indigo-500/10 mt-1.5 flex gap-1">
                <input
                  id={`focus-add-subtask-input-${currentFocus.id}`}
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask(); 
                    } 
                  }}
                  placeholder="Add quick subtask..."
                  className={`flex-1 px-2.5 py-1 text-[9.5px] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark 
                      ? "bg-slate-950/50 border border-white/5 text-white placeholder-slate-500" 
                      : "bg-slate-50 border border-slate-205 text-slate-900 placeholder-slate-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-2 bg-indigo-600 hover:bg-indigo-555 text-white rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                  title="Add subtask"
                >
                  <Plus size={12} strokeWidth={3} />
                </button>
              </div>
            </>
          )}

        </div>
      </div>
      )}

    </div>
  );
};
