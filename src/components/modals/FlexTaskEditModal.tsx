import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Clock, 
  MapPin, 
  Check, 
  X, 
  Sparkles, 
  Layers, 
  ChevronDown, 
  Car, 
  Navigation,
  Tag,
  User,
  FileText,
  Trash2
} from "lucide-react";
import { Task } from "../../types";
import { DURATION_HOURS_0_TO_23, FIVE_MIN_INCREMENTS, QUARTER_MINUTES } from "../TimePickBox";

interface FlexTaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSaveTask: (updatedTask: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
  availableCategories?: string[];
  availableCollaborators?: string[];
  availableLocations?: string[];
  flexActivities?: string[];
  triggerHaptic?: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

export const FlexTaskEditModal: React.FC<FlexTaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  onSaveTask,
  onDeleteTask,
  availableCategories = ["Work", "Personal", "Errand"],
  availableCollaborators = [],
  availableLocations = [],
  flexActivities = ["Preparation", "Driving", "Walking", "Transit", "Setup", "Wind down", "Coffee Break"],
  triggerHaptic = () => {},
}) => {
  if (!isOpen || !task) return null;

  // Basic task info
  const [title, setTitle] = useState(task.title || "");
  const [category, setCategory] = useState(task.category || "General");
  const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">((task.priority as any) || "none");
  const [location, setLocation] = useState(task.location || "no location");
  const [notes, setNotes] = useState(task.notes || "");
  const [attendees, setAttendees] = useState(task.attendees || task.collaborator || "");

  // Main task duration state
  const parseMins = (durStr?: string) => {
    if (!durStr) return 30;
    const match = durStr.match(/(\d+)\s*h(?:our)?s?/i);
    const mMatch = durStr.match(/(\d+)\s*m(?:in)?s?/i);
    let total = 0;
    if (match) total += parseInt(match[1], 10) * 60;
    if (mMatch) total += parseInt(mMatch[1], 10);
    if (!match && !mMatch) {
      const num = parseInt(durStr, 10);
      if (!isNaN(num)) total = num;
    }
    return total > 0 ? total : 30;
  };

  const initialTotalMins = parseMins(task.duration);
  const [durationHours, setDurationHours] = useState(Math.floor(initialTotalMins / 60));
  const [durationMinutes, setDurationMinutes] = useState(initialTotalMins % 60);

  // Pre-Task Travel & Buffer state
  const [preMinutes, setPreMinutes] = useState(task.travelBefore || 0);
  const [preHours, setPreHours] = useState(Math.floor((task.travelBefore || 0) / 60));
  const [preMinsOnly, setPreMinsOnly] = useState((task.travelBefore || 0) % 60);
  const [prePurpose, setPrePurpose] = useState(task.beforeBufferPurpose || "Preparation");
  const [preSameLocation, setPreSameLocation] = useState(task.travelBeforeSameLocation !== false);
  const [preLocation, setPreLocation] = useState(task.travelBeforeLocation || "");
  const [showPrePicker, setShowPrePicker] = useState(false);

  // Post-Task Travel & Buffer state
  const [postMinutes, setPostMinutes] = useState(task.travelAfter || 0);
  const [postHours, setPostHours] = useState(Math.floor((task.travelAfter || 0) / 60));
  const [postMinsOnly, setPostMinsOnly] = useState((task.travelAfter || 0) % 60);
  const [postPurpose, setPostPurpose] = useState(task.afterBufferPurpose || "Wrap-up");
  const [postSameLocation, setPostSameLocation] = useState(task.travelAfterSameLocation !== false);
  const [postLocation, setPostLocation] = useState(task.travelAfterLocation || "");
  const [showPostPicker, setShowPostPicker] = useState(false);

  // Tab switcher inside edit window
  const [activeSection, setActiveSection] = useState<"general" | "duration" | "travel">("general");

  const totalMainMins = durationHours * 60 + durationMinutes;

  const handleSave = () => {
    triggerHaptic("success");
    const durString = durationHours > 0 ? `${durationHours}h ${durationMinutes}m` : `${durationMinutes} min`;
    const finalPreMins = preHours * 60 + preMinsOnly;
    const finalPostMins = postHours * 60 + postMinsOnly;

    onSaveTask({
      id: task.id,
      title: title.trim() || "Untitled Task",
      category,
      priority,
      location: location.trim() || "no location",
      notes: notes.trim(),
      attendees: attendees.trim(),
      duration: durString,
      isFlexible: true,
      travelBefore: finalPreMins,
      beforeBufferPurpose: prePurpose,
      travelBeforeSameLocation: preSameLocation,
      travelBeforeLocation: preSameLocation ? (location.trim() || "") : preLocation.trim(),
      travelAfter: finalPostMins,
      afterBufferPurpose: postPurpose,
      travelAfterSameLocation: postSameLocation,
      travelAfterLocation: postSameLocation ? (location.trim() || "") : postLocation.trim(),
    });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99990] cursor-pointer"
      />

      {/* Main Flex Task Card Edit Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="fixed inset-x-3 top-[5%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-lg w-full max-h-[90vh] bg-slate-900 border border-teal-500/30 rounded-[28px] p-5 z-[99991] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col text-slate-100 font-sans overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-teal-300 bg-teal-950/80 border border-teal-500/40 px-2.5 py-1 rounded-full">
              <Sparkles size={11} className="text-teal-400" />
              Flex Time Task
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {totalMainMins}m
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 py-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveSection("general");
              triggerHaptic("light");
            }}
            className={`py-1.5 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
              activeSection === "general"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-slate-950/50 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection("duration");
              triggerHaptic("light");
            }}
            className={`py-1.5 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
              activeSection === "duration"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-950/50 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            Duration ({totalMainMins}m)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection("travel");
              triggerHaptic("light");
            }}
            className={`py-1.5 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
              activeSection === "travel"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-950/50 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            Pre/Post Travel ({preHours * 60 + preMinsOnly + postHours * 60 + postMinsOnly}m)
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4 py-1">
          {activeSection === "general" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* Task Title */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task name..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:outline-none focus:border-teal-400 text-sm font-bold text-white placeholder-slate-500"
                />
              </div>

              {/* Main Task Location */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-teal-400" />
                    Main Task Location
                  </span>
                  {location && location.trim().toLowerCase() !== "no location" && (
                    <button
                      type="button"
                      onClick={() => setLocation("no location")}
                      className="text-[9px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  )}
                </label>

                {availableLocations.length > 0 && (
                  <div className="relative mb-1.5">
                    <select
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        triggerHaptic("selection");
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-teal-400 appearance-none pr-8 cursor-pointer"
                    >
                      <option value="no location">no location (Default)</option>
                      {availableLocations.map((loc) => (
                        <option key={loc} value={loc} className="bg-slate-900 text-white">
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                )}

                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="no location"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 focus:outline-none focus:border-teal-400 text-xs font-bold text-white placeholder-slate-500"
                />
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      triggerHaptic("selection");
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-teal-400 cursor-pointer"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/70 rounded-xl border border-slate-700">
                    {(["none", "low", "medium", "high"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPriority(p);
                          triggerHaptic("selection");
                        }}
                        className={`py-1.5 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer text-center ${
                          priority === p
                            ? p === "high"
                              ? "bg-rose-600 text-white shadow-sm"
                              : p === "medium"
                              ? "bg-amber-600 text-white shadow-sm"
                              : p === "low"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-700 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Attendees & Notes */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                  Collaborator / Attendees
                </label>
                <input
                  type="text"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  placeholder="Names or contacts..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 focus:outline-none focus:border-teal-400 text-xs font-bold text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add details, links, or instructions..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 focus:outline-none focus:border-teal-400 text-xs font-medium text-white placeholder-slate-500 resize-none"
                />
              </div>
            </div>
          )}

          {activeSection === "duration" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                    Task Duration
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {durationHours > 0 ? `${durationHours}h ` : ""}{durationMinutes}m ({totalMainMins} min)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-500/30">
                  Pick Below
                </span>
              </div>

              {/* Hours Pick Boxes (0-23) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Hours (0 - 23)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-indigo-400">
                    {durationHours}h
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 max-h-[120px] overflow-y-auto p-1 bg-slate-950/80 rounded-xl border border-white/5 custom-scrollbar">
                  {DURATION_HOURS_0_TO_23.map((h) => {
                    const isSelected = durationHours === h;
                    return (
                      <button
                        key={`flex-dur-h-${h}`}
                        type="button"
                        onClick={() => {
                          setDurationHours(h);
                          triggerHaptic("selection");
                        }}
                        className={`py-1.5 px-0.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/50"
                            : "bg-slate-950/80 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-950/30"
                        }`}
                      >
                        {h}h
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Pick Boxes (0-60 in 5m) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Minutes (0 - 60 in 5m)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {durationMinutes}m
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/5">
                  {FIVE_MIN_INCREMENTS.map((m) => {
                    const isSelected = durationMinutes === m;
                    const isQuarter = QUARTER_MINUTES.includes(m);
                    return (
                      <button
                        key={`flex-dur-m-${m}`}
                        type="button"
                        onClick={() => {
                          setDurationMinutes(m);
                          triggerHaptic("selection");
                        }}
                        className={`relative py-1.5 px-0.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400/50"
                            : isQuarter
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 shadow-[0_0_6px_rgba(16,185,129,0.15)] font-black"
                            : "bg-slate-950/80 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60"
                        }`}
                      >
                        <span>{m}m</span>
                        {isQuarter && !isSelected && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === "travel" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* PRE-TASK BUFFER & TRAVEL */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Navigation size={13} className="text-indigo-400" />
                    Pre-Task Travel & Buffer
                  </span>
                  <span className="text-xs font-mono font-black text-indigo-300">
                    {preHours > 0 ? `${preHours}h ` : ""}{preMinsOnly}m ({preHours * 60 + preMinsOnly}m)
                  </span>
                </div>

                {/* Pre Activity Type tags */}
                <div className="flex flex-wrap gap-1">
                  {["Preparation", "Driving", "Walking", "Transit", "Travel", "Setup"].map((act) => (
                    <button
                      key={`pre-act-${act}`}
                      type="button"
                      onClick={() => {
                        setPrePurpose(act);
                        triggerHaptic("light");
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        prePurpose.toLowerCase() === act.toLowerCase()
                          ? "bg-indigo-600 text-white border-indigo-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {act}
                    </button>
                  ))}
                </div>

                {/* Pre Destination Location Section */}
                <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-300">
                      Same destination as main task?
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setPreSameLocation(true);
                          triggerHaptic("selection");
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase cursor-pointer ${
                          preSameLocation ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreSameLocation(false);
                          triggerHaptic("selection");
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase cursor-pointer ${
                          !preSameLocation ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {preSameLocation ? (
                    <div className="text-[10px] text-slate-400 italic">
                      Destination: <span className="text-teal-300 not-italic font-semibold">{location || "(Same as main task)"}</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Pre-Task Destination Location:
                      </label>
                      {availableLocations.length > 0 && (
                        <div className="relative">
                          <select
                            value={preLocation}
                            onChange={(e) => {
                              setPreLocation(e.target.value);
                              triggerHaptic("selection");
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-teal-400 appearance-none pr-7 cursor-pointer"
                          >
                            <option value="">-- Choose destination --</option>
                            {availableLocations.map((loc) => (
                              <option key={loc} value={loc} className="bg-slate-900 text-white">
                                {loc}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                        </div>
                      )}
                      <input
                        type="text"
                        value={preLocation}
                        onChange={(e) => setPreLocation(e.target.value)}
                        placeholder="Type pre-task destination..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:outline-none focus:border-teal-400 text-xs font-bold text-white placeholder-slate-500"
                      />
                    </div>
                  )}
                </div>

                {/* Pre Duration Pick Boxes */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                      Pre-Task Duration (Hours & Minutes)
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 5, 10, 15, 30].map((m) => (
                        <button
                          key={`pre-quick-${m}`}
                          type="button"
                          onClick={() => {
                            setPreHours(0);
                            setPreMinsOnly(m);
                            triggerHaptic("selection");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            preHours === 0 && preMinsOnly === m
                              ? "bg-indigo-600 text-white border-indigo-400"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/5">
                    {FIVE_MIN_INCREMENTS.map((m) => {
                      const isSelected = preHours === 0 && preMinsOnly === m;
                      const isQuarter = QUARTER_MINUTES.includes(m);
                      return (
                        <button
                          key={`pre-min-${m}`}
                          type="button"
                          onClick={() => {
                            setPreHours(0);
                            setPreMinsOnly(m);
                            triggerHaptic("selection");
                          }}
                          className={`relative py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                              : isQuarter
                              ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                        >
                          {m}m
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* POST-TASK BUFFER & TRAVEL */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Navigation size={13} className="text-emerald-400" />
                    Post-Task Travel & Buffer
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-300">
                    {postHours > 0 ? `${postHours}h ` : ""}{postMinsOnly}m ({postHours * 60 + postMinsOnly}m)
                  </span>
                </div>

                {/* Post Activity Type tags */}
                <div className="flex flex-wrap gap-1">
                  {["Wrap-up", "Driving", "Walking", "Transit", "Travel", "Coffee Break", "Wind down"].map((act) => (
                    <button
                      key={`post-act-${act}`}
                      type="button"
                      onClick={() => {
                        setPostPurpose(act);
                        triggerHaptic("light");
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        postPurpose.toLowerCase() === act.toLowerCase()
                          ? "bg-emerald-600 text-white border-emerald-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {act}
                    </button>
                  ))}
                </div>

                {/* Post Destination Location Section */}
                <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-300">
                      Same destination as main task?
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setPostSameLocation(true);
                          triggerHaptic("selection");
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase cursor-pointer ${
                          postSameLocation ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPostSameLocation(false);
                          triggerHaptic("selection");
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase cursor-pointer ${
                          !postSameLocation ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {postSameLocation ? (
                    <div className="text-[10px] text-slate-400 italic">
                      Destination: <span className="text-teal-300 not-italic font-semibold">{location || "(Same as main task)"}</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Post-Task Destination Location:
                      </label>
                      {availableLocations.length > 0 && (
                        <div className="relative">
                          <select
                            value={postLocation}
                            onChange={(e) => {
                              setPostLocation(e.target.value);
                              triggerHaptic("selection");
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-teal-400 appearance-none pr-7 cursor-pointer"
                          >
                            <option value="">-- Choose destination --</option>
                            {availableLocations.map((loc) => (
                              <option key={loc} value={loc} className="bg-slate-900 text-white">
                                {loc}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                        </div>
                      )}
                      <input
                        type="text"
                        value={postLocation}
                        onChange={(e) => setPostLocation(e.target.value)}
                        placeholder="Type post-task destination..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:outline-none focus:border-teal-400 text-xs font-bold text-white placeholder-slate-500"
                      />
                    </div>
                  )}
                </div>

                {/* Post Duration Pick Boxes */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                      Post-Task Duration (Hours & Minutes)
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 5, 10, 15, 30].map((m) => (
                        <button
                          key={`post-quick-${m}`}
                          type="button"
                          onClick={() => {
                            setPostHours(0);
                            setPostMinsOnly(m);
                            triggerHaptic("selection");
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            postHours === 0 && postMinsOnly === m
                              ? "bg-emerald-600 text-white border-emerald-400"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/5">
                    {FIVE_MIN_INCREMENTS.map((m) => {
                      const isSelected = postHours === 0 && postMinsOnly === m;
                      const isQuarter = QUARTER_MINUTES.includes(m);
                      return (
                        <button
                          key={`post-min-${m}`}
                          type="button"
                          onClick={() => {
                            setPostHours(0);
                            setPostMinsOnly(m);
                            triggerHaptic("selection");
                          }}
                          className={`relative py-1 px-0.5 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer active:scale-95 text-center ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                              : isQuarter
                              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                        >
                          {m}m
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
          {onDeleteTask ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                onDeleteTask(task.id);
                onClose();
              }}
              className="py-2 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-glow cursor-pointer"
            >
              <Check size={14} strokeWidth={3} />
              <span>Save Flex Task</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};
