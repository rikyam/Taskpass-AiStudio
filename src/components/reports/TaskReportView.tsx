import React, { useState } from 'react';
import { Task } from '../../types';
import { jsPDF } from 'jspdf';
import { Download, Eye, EyeOff, Lock, Unlock, Flag, Tag, User, MapPin, CheckSquare, SlidersHorizontal, CalendarRange, CheckCircle2, Check, Save } from 'lucide-react';
import { getPriorityWeight, formatTime, parseDurationToMinutes, getDynamicTitleClass, getGoogleMapsDirectionsUrl, getLocalDateString } from '../InteractiveAppHelpers';

export interface TaskReportViewProps {
  tasks: Task[];
  categories: string[];
  collaborators: string[];
  locations?: string[];
  spendings?: any[];
  contacts?: any[];
  isDark: boolean;
  deckSearchQuery?: string;
  taskMatchesSearch?: (task: Task, query: string) => boolean;
  saveWorkspace: (tasks: Task[]) => void;
  instantiateVirtualIfNeeded: (id: string) => { updatedTasks: Task[]; realTaskId: string };
  triggerHaptic: (type: string) => void;
  triggerEditForm: (task: Task, field?: string) => void;
  handleToggleComplete: (taskId: string) => void;
  requestToggleLock: (task: Task) => void;
}

export const TaskReportView: React.FC<TaskReportViewProps> = ({
  tasks,
  categories,
  collaborators,
  locations = [],
  spendings = [],
  contacts = [],
  isDark,
  deckSearchQuery = '',
  taskMatchesSearch,
  saveWorkspace,
  instantiateVirtualIfNeeded,
  triggerHaptic,
  triggerEditForm,
  handleToggleComplete,
  requestToggleLock
}) => {
  const [reportDateMode, setReportDateMode] = useState<"all" | "single" | "range" | "none">("all");
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const favoriteLocations = locations || [];
  const notes: any[] = [];
  const [reportSingleDate, setReportSingleDate] = useState<string>("");
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [reportCollaboratorMode, setReportCollaboratorMode] = useState<"all" | "single" | "multiple" | "none">("all");
  const [reportSelectedCollaborators, setReportSelectedCollaborators] = useState<string[]>([]);
  const [reportLocationMode, setReportLocationMode] = useState<"all" | "single" | "multiple" | "none">("all");
  const [reportSelectedLocations, setReportSelectedLocations] = useState<string[]>([]);
  const [reportGroupByDate, setReportGroupByDate] = useState<boolean>(false);
  const [reportGroupByCollaborator, setReportGroupByCollaborator] = useState<boolean>(false);
  const [reportGroupByLocation, setReportGroupByLocation] = useState<boolean>(false);
  const [reportFiltersCollapsed, setReportFiltersCollapsed] = useState<boolean>(false);
  const [reportSortBy, setReportSortBy] = useState<"date" | "title" | "priority">("date");
  const [reportSortBy1, setReportSortBy1] = useState<"date" | "title" | "priority" | "category" | "collaborator" | "duration">("date");
  const [reportSortBy2, setReportSortBy2] = useState<"date" | "title" | "priority" | "category" | "collaborator" | "duration">("priority");
  const [reportSortBy3, setReportSortBy3] = useState<"date" | "title" | "priority" | "category" | "collaborator" | "duration">("title");
  const [reportIncludeCompleted, setReportIncludeCompleted] = useState<boolean>(true);
  const [reportInlineEdit, setReportInlineEdit] = useState<{ taskId: string; field?: string; value?: string; type?: string } | null>(null);
  const [prioritySelectTask, setPrioritySelectTask] = useState<Task | null>(null);
  const [focusCardDetailMode, setFocusCardDetailMode] = useState<"simple" | "expanded">("expanded");

  const formatReportDate = (dtStr: string) => {
    if (!dtStr) return "(None)";
    try {
      const parts = dtStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      }
    } catch (e) {}
    return dtStr;
  };
  const defaultTaskMatchesSearch = (t: Task, q: string) => {
    if (!q) return true;
    const lowerQ = q.toLowerCase();
    return Boolean(
      (t.title && t.title.toLowerCase().includes(lowerQ)) ||
      (t.location && t.location.toLowerCase().includes(lowerQ)) ||
      (t.notes && t.notes.toLowerCase().includes(lowerQ)) ||
      (t.attendees && t.attendees.toLowerCase().includes(lowerQ)) ||
      (t.phone && t.phone.toLowerCase().includes(lowerQ)) ||
      (t.groupName && t.groupName.toLowerCase().includes(lowerQ)) ||
      (t.category && t.category.toLowerCase().includes(lowerQ)) ||
      (t.collaborator && t.collaborator.toLowerCase().includes(lowerQ))
    );
  };
  const isMatch = taskMatchesSearch || defaultTaskMatchesSearch;

  const getFilteredReportTasks = (isCompleted: boolean) => {
    return tasks.filter(task => {
      if (task.completed !== isCompleted) return false;

      // Filter search bar keyword matching in real-time (keywords, categories, collaborators, location, etc.)
      if (deckSearchQuery.trim()) {
        if (!isMatch(task, deckSearchQuery.trim())) return false;
      }

      // Date Filter: none | single | range
      if (reportDateMode === "single") {
        if (task.date !== reportSingleDate) return false;
      } else if (reportDateMode === "range") {
        if (!task.date || task.date < reportStartDate || task.date > reportEndDate) return false;
      }

      // Collaborator Filter: all | single | multiple | none
      if (reportCollaboratorMode === "none") {
        if (task.collaborator && task.collaborator !== "None") return false;
      } else if (reportCollaboratorMode === "single") {
        const sel = reportSelectedCollaborators[0];
        if (sel && task.collaborator !== sel) return false;
      } else if (reportCollaboratorMode === "multiple") {
        if (reportSelectedCollaborators.length > 0 && !reportSelectedCollaborators.includes(task.collaborator || "")) return false;
      }

      // Category Filter (was Location Filter)
      if (reportLocationMode === "none") {
        if (task.category && task.category.trim() !== "") return false;
      } else if (reportLocationMode === "single") {
        const sel = reportSelectedLocations[0];
        if (sel && task.category !== sel) return false;
      } else if (reportLocationMode === "multiple") {
        if (reportSelectedLocations.length > 0 && !reportSelectedLocations.includes(task.category || "")) return false;
      }

      return true;
    });
  };

  const compareTasksByKey = (a: Task, b: Task, key: "date" | "title" | "priority" | "category" | "collaborator" | "duration") => {
    if (key === "date") {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.time || "";
      const timeB = b.time || "";
      return timeA.localeCompare(timeB);
    }
    if (key === "priority") {
      const weightA = getPriorityWeight(a.priority);
      const weightB = getPriorityWeight(b.priority);
      return weightA - weightB;
    }
    if (key === "title") {
      return (a.title || "").localeCompare(b.title || "");
    }
    if (key === "category") {
      return (a.category || "").localeCompare(b.category || "");
    }
    if (key === "collaborator") {
      const colA = a.collaborator && a.collaborator !== "None" ? a.collaborator : "";
      const colB = b.collaborator && b.collaborator !== "None" ? b.collaborator : "";
      return colA.localeCompare(colB);
    }
    if (key === "duration") {
      const durA = parseFloat(a.duration || "0") || 0;
      const durB = parseFloat(b.duration || "0") || 0;
      return durA - durB;
    }
    return 0;
  };

  const sortReportTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      // Level 1: Primary sorting
      const res1 = compareTasksByKey(a, b, reportSortBy1);
      if (res1 !== 0) return res1;

      // Level 2: Secondary sorting
      const res2 = compareTasksByKey(a, b, reportSortBy2);
      if (res2 !== 0) return res2;

      // Level 3: Tertiary sorting
      return compareTasksByKey(a, b, reportSortBy3);
    });
  };

  const groupReportTasks = (taskList: Task[]) => {
    const sortedList = sortReportTasks(taskList);
    const hasGrouping = reportGroupByDate || reportGroupByCollaborator || reportGroupByLocation;
    if (!hasGrouping) {
      return [{ label: "", tasks: sortedList }];
    }

    const groups: { [key: string]: { label: string; tasks: Task[] } } = {};
    sortedList.forEach(task => {
      const parts: string[] = [];
      const labels: string[] = [];

      if (reportGroupByDate) {
        labels.push(task.date ? formatReportDate(task.date) : "(None)");
        parts.push(task.date || "");
      }
      if (reportGroupByCollaborator) {
        const col = task.collaborator && task.collaborator !== "None" ? task.collaborator : "";
        labels.push(col ? col : "(None)");
        parts.push(col);
      }
      if (reportGroupByLocation) {
        const cat = task.category || "";
        labels.push(cat ? cat : "(None)");
        parts.push(cat);
      }

      const key = parts.join("||") || "un-grouped";
      const label = labels.join(" • ") || "(None)";

      if (!groups[key]) {
        groups[key] = { label, tasks: [] };
      }
      groups[key].tasks.push(task);
    });

    return Object.values(groups);
  };

  const handleReportTaskTitleClick = (task: Task) => {
    triggerHaptic("medium");
    triggerEditForm(task);
  };

  const handleExportCSV = (isExcel = false) => {
    const incTasks = getFilteredReportTasks(false);
    const compTasks = getFilteredReportTasks(true);
    const allFiltered = [...incTasks, ...compTasks];

    // Section 1: Tasks (with subtasks, notes, interactions and contacts mapped)
    const taskHeaders = ["Title", "Date", "Duration (mins)", "Location", "Collaborator / Contact", "Priority", "Completed", "Subtasks", "Notes", "Interactions"];
    const taskRows = allFiltered.map(t => {
      const subtasksStr = (t.subtasks || []).map(st => `${st.completed ? "[✓]" : "[ ]"} ${st.title}`).join("; ");
      const interactionsStr = (t.interactions || []).map(i => `[${i.dateTime}] ${i.direction.toUpperCase()} ${i.type}: ${i.description}`).join("; ");
      return [
        t.title || "",
        t.date || "",
        t.duration ? String(Math.round(Number(t.duration) / 60)) : "",
        t.location || "",
        t.collaborator && t.collaborator !== "None" ? t.collaborator : (t.attendees || ""),
        t.priority || "low",
        t.completed ? "Yes" : "No",
        subtasksStr,
        t.notes || "",
        interactionsStr
      ];
    });

    let csvContent = "--- TASKS ---\n" + taskHeaders.join(",") + "\n" + taskRows.map(r => r.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(",")).join("\n");

    // Section 2: Expenses / Spendings
    const expenseHeaders = ["Amount", "Category", "Vendor", "Date", "Notes"];
    const expenseRows = spendings.map(s => [
      String(s.amount),
      s.category || "",
      s.vendor || "",
      s.date || "",
      s.notes || ""
    ]);
    csvContent += "\n\n--- EXPENSES / SPENDINGS ---\n" + expenseHeaders.join(",") + "\n" + expenseRows.map(r => r.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(",")).join("\n");

    // Section 3: Contacts Directory
    const contactHeaders = ["Given Name", "Family Name", "Email", "Phone", "Organization", "Address", "Type"];
    const contactRows = contacts.map(c => [
      c.givenName || "",
      c.familyName || "",
      c.email || "",
      c.phone || "",
      c.organization || "",
      c.address || "",
      c.isLocation ? "Location" : "Person"
    ]);
    csvContent += "\n\n--- CONTACTS & DIRECTORY ---\n" + contactHeaders.join(",") + "\n" + contactRows.map(r => r.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(",")).join("\n");

    // Section 4: Favorite Locations
    csvContent += "\n\n--- FAVORITE LOCATIONS ---\n" + favoriteLocations.map(l => `"${l.replace(/"/g, '""')}"`).join("\n");

    // Section 5: General Notes
    const noteHeaders = ["Title", "Content", "Date Created"];
    const noteRows = notes.map(n => [
      n.title || "",
      n.content || "",
      n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""
    ]);
    csvContent += "\n\n--- GENERAL NOTES ---\n" + noteHeaders.join(",") + "\n" + noteRows.map(r => r.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", isExcel ? "workspace_report_excel.csv" : "workspace_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerHaptic("success");
  };

  const handleExportExcel = () => {
    const incTasks = getFilteredReportTasks(false);
    const compTasks = getFilteredReportTasks(true);
    const allFiltered = [...incTasks, ...compTasks];

    // Section 1: Tasks (with subtasks, notes, interactions and contacts mapped)
    const taskHeaders = ["Title", "Date", "Duration (mins)", "Location", "Collaborator / Contact", "Priority", "Completed", "Subtasks", "Notes", "Interactions"];
    const taskRows = allFiltered.map(t => {
      const subtasksStr = (t.subtasks || []).map(st => `${st.completed ? "[✓]" : "[ ]"} ${st.title}`).join("; ");
      const interactionsStr = (t.interactions || []).map(i => `[${i.dateTime}] ${i.direction.toUpperCase()} ${i.type}: ${i.description}`).join("; ");
      return [
        t.title || "",
        t.date || "",
        t.duration ? String(Math.round(Number(t.duration) / 60)) : "",
        t.location || "",
        t.collaborator && t.collaborator !== "None" ? t.collaborator : (t.attendees || ""),
        t.priority || "low",
        t.completed ? "Yes" : "No",
        subtasksStr,
        t.notes || "",
        interactionsStr
      ];
    });

    let tsvContent = "--- TASKS ---\n" + taskHeaders.join("\t") + "\n" + taskRows.map(r => r.map(val => (val || "").replace(/\t/g, " ")).join("\t")).join("\n");

    // Section 2: Expenses / Spendings
    const expenseHeaders = ["Amount", "Category", "Vendor", "Date", "Notes"];
    const expenseRows = spendings.map(s => [
      String(s.amount),
      s.category || "",
      s.vendor || "",
      s.date || "",
      s.notes || ""
    ]);
    tsvContent += "\n\n--- EXPENSES / SPENDINGS ---\n" + expenseHeaders.join("\t") + "\n" + expenseRows.map(r => r.map(val => (val || "").replace(/\t/g, " ")).join("\t")).join("\n");

    // Section 3: Contacts Directory
    const contactHeaders = ["Given Name", "Family Name", "Email", "Phone", "Organization", "Address", "Type"];
    const contactRows = contacts.map(c => [
      c.givenName || "",
      c.familyName || "",
      c.email || "",
      c.phone || "",
      c.organization || "",
      c.address || "",
      c.isLocation ? "Location" : "Person"
    ]);
    tsvContent += "\n\n--- CONTACTS & DIRECTORY ---\n" + contactHeaders.join("\t") + "\n" + contactRows.map(r => r.map(val => (val || "").replace(/\t/g, " ")).join("\t")).join("\n");

    // Section 4: Favorite Locations
    tsvContent += "\n\n--- FAVORITE LOCATIONS ---\n" + favoriteLocations.map(l => l.replace(/\t/g, " ")).join("\n");

    // Section 5: General Notes
    const noteHeaders = ["Title", "Content", "Date Created"];
    const noteRows = notes.map(n => [
      n.title || "",
      n.content || "",
      n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""
    ]);
    tsvContent += "\n\n--- GENERAL NOTES ---\n" + noteHeaders.join("\t") + "\n" + noteRows.map(r => r.map(val => (val || "").replace(/\t/g, " ")).join("\t")).join("\n");

    const blob = new Blob([tsvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "workspace_report.xls");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerHaptic("success");
  };

  const exportWorkspacePDF = (
    incGroups: any[],
    compGroups: any[],
    filterHeader: string,
    onSuccess?: () => void
  ) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Task Workspace Report", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(filterHeader, 14, 22);

    let y = 30;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Incomplete Tasks", 14, y);
    y += 8;

    incGroups.forEach(grp => {
      if (grp.label) {
        doc.setFontSize(10);
        doc.setTextColor(70);
        doc.text(grp.label, 14, y);
        y += 6;
      }
      grp.tasks.forEach((t: Task) => {
        doc.setFontSize(9);
        doc.setTextColor(20);
        doc.text(`- ${t.title || "Untitled"} (${t.date || "No date"}, ${t.priority || "none"})`, 18, y);
        y += 5;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
      });
    });

    if (compGroups.length > 0) {
      y += 6;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Completed Tasks", 14, y);
      y += 8;

      compGroups.forEach(grp => {
        grp.tasks.forEach((t: Task) => {
          doc.setFontSize(9);
          doc.setTextColor(80);
          doc.text(`[x] ${t.title || "Untitled"} (${t.date || "No date"})`, 18, y);
          y += 5;
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
        });
      });
    }

    doc.save("workspace_report.pdf");
    if (onSuccess) onSuccess();
  };

  const handleExportPDF = () => {
    try {
      const incTasks = getFilteredReportTasks(false);
      const compTasks = getFilteredReportTasks(true);

      const incTasksGrouped = groupReportTasks(incTasks);
      const compTasksGrouped = groupReportTasks(compTasks);

      const dateText = reportDateMode === "none" ? "(None)" : reportDateMode === "single" ? reportSingleDate : `${reportStartDate} to ${reportEndDate}`;
      const colText = reportCollaboratorMode === "all" ? "(None)" : reportCollaboratorMode === "none" ? "None Assigned" : reportSelectedCollaborators.join(", ");
      const locText = reportLocationMode === "all" ? "(None)" : reportLocationMode === "none" ? "None Assigned" : reportSelectedLocations.join(", ");
      const filtersAppliedText = `Filters applied -> Date: ${dateText}  |  Collaborators: ${colText}  |  Locations: ${locText}`;

      exportWorkspacePDF(
        incTasksGrouped,
        compTasksGrouped,
        filtersAppliedText,
        () => triggerHaptic("success")
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  // Main Report Render
    // Inline helper functions to make pull-down changes in real-time
    const formatToMMDDYY = (dateStr: string | undefined | null) => {
      if (!dateStr) return "No Date";
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const yyyy = parts[0];
        const mm = parts[1];
        const dd = parts[2];
        const yy = yyyy.slice(-2);
        return `${mm}-${dd}-${yy}`;
      }
      return dateStr;
    };

    const handleUpdateTaskDate = (taskId: string, newDate: string) => {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      const updated = updatedTasks.map(t => {
        if (t.id === realTaskId) {
          return { ...t, date: newDate };
        }
        return t;
      });
      saveWorkspace(updated);
      triggerHaptic("medium");
    };

    const handleUpdateTaskCollaborator = (taskId: string, newCol: string) => {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      const updated = updatedTasks.map(t => {
        if (t.id === realTaskId) {
          return { ...t, collaborator: newCol === "None" ? "" : newCol };
        }
        return t;
      });
      saveWorkspace(updated);
      triggerHaptic("medium");
    };

    const handleUpdateTaskCategory = (taskId: string, newCat: string) => {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      const updated = updatedTasks.map(t => {
        if (t.id === realTaskId) {
          return { ...t, category: newCat === "None" ? undefined : newCat };
        }
        return t;
      });
      saveWorkspace(updated);
      triggerHaptic("medium");
    };

    const handleUpdateTaskTime = (taskId: string, newTime: string) => {
      const { updatedTasks, realTaskId } = instantiateVirtualIfNeeded(taskId);
      const updated = updatedTasks.map(t => {
        if (t.id === realTaskId) {
          return { ...t, time: newTime || undefined };
        }
        return t;
      });
      saveWorkspace(updated);
      triggerHaptic("medium");
    };

    const incTasks = getFilteredReportTasks(false);
    const compTasks = getFilteredReportTasks(true);

    const groupedIncomplete = groupReportTasks(incTasks);
    const groupedCompleted = groupReportTasks(compTasks);

    const allAvailableCategories = Array.from(new Set([
      ...categories,
      ...tasks.map(t => t.category?.trim()).filter(Boolean) as string[]
    ])).sort();

    return (
      <div className={`p-4 rounded-3xl border flex flex-col gap-6 font-sans max-w-full overflow-x-hidden ${isDark ? "bg-[#090d16] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800 shadow-sm"}`}>
        {/* Header Title with Export Bar */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/5 relative">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-400">Task Report Panel</h2>
            <p className="text-[9px] text-slate-450 uppercase tracking-widest font-mono">Workspace Analytics & Export Mode</p>
          </div>
          
          <div className="flex items-center gap-2 relative z-40">
            {/* Collapse / Expand Filters Toggle */}
            <button
              onClick={() => {
                setReportFiltersCollapsed(!reportFiltersCollapsed);
                triggerHaptic("light");
              }}
              className={`px-2.5 py-1.5 text-[9.5px] font-black uppercase rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                reportFiltersCollapsed
                  ? isDark 
                    ? "bg-indigo-950/30 border-indigo-500/25 text-indigo-400 hover:text-indigo-300" 
                    : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  : isDark 
                    ? "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white" 
                    : "bg-slate-100 border-slate-200 text-slate-650 hover:text-slate-800"
              }`}
              title={reportFiltersCollapsed ? "Show Filters Panel" : "Collapse Filters Panel"}
            >
              {reportFiltersCollapsed ? (
                <>
                  <Eye size={11} strokeWidth={2.5} className="shrink-0" />
                  <span>Show Filters</span>
                </>
              ) : (
                <>
                  <EyeOff size={11} strokeWidth={2.5} className="shrink-0" />
                  <span>Hide Filters</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === "export" ? null : "export");
                triggerHaptic("light");
              }}
              className={`p-2 rounded-xl border transition-all shadow-md cursor-pointer flex items-center justify-center ${
                activeFilterDropdown === "export"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : isDark 
                    ? "bg-slate-900 border-white/10 text-indigo-400 hover:bg-slate-850 hover:text-indigo-300" 
                    : "bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              }`}
              title="Save / Export Report Options"
            >
              <Save size={13} strokeWidth={2.5} />
            </button>

            {activeFilterDropdown === "export" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveFilterDropdown(null)} />
                <div className={`absolute right-0 mt-2 w-48 rounded-2xl border p-2.5 z-50 flex flex-col gap-1 shadow-2xl animate-fadeIn ${
                  isDark ? "bg-slate-950 opacity-100 border-white/10 text-slate-200" : "bg-white opacity-100 border-slate-200 text-slate-800"
                }`}>
                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 px-2 pb-1.5 border-b border-white/5 mb-1 block font-mono">Download Formats</span>
                  
                  <button
                    onClick={() => {
                      handleExportCSV(false);
                      setActiveFilterDropdown(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-left transition-all ${
                      isDark ? "hover:bg-slate-900 text-slate-300 hover:text-white" : "hover:bg-slate-50 text-slate-705"
                    }`}
                  >
                    <Download size={12} className="text-sky-450 shrink-0" />
                    <span>Export as CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      handleExportExcel();
                      setActiveFilterDropdown(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-left transition-all ${
                      isDark ? "hover:bg-slate-900 text-slate-300 hover:text-white" : "hover:bg-slate-50 text-slate-705"
                    }`}
                  >
                    <Download size={12} className="text-emerald-450 shrink-0" />
                    <span>Export as Excel</span>
                  </button>

                  <button
                    onClick={() => {
                      handleExportPDF();
                      setActiveFilterDropdown(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-left transition-all ${
                      isDark ? "hover:bg-slate-900 text-slate-300 hover:text-white" : "hover:bg-slate-50 text-slate-705"
                    }`}
                  >
                    <Download size={12} className="text-rose-455 shrink-0" />
                    <span>Export as PDF</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dropdown Menus in One SINGLE Row below the heading as requested */}
        {!reportFiltersCollapsed && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-2.5 rounded-2xl bg-slate-900/40 border border-white/5 z-30 relative text-left">
          
          {/* 1. DATE FILTER DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === "date" ? null : "date");
                triggerHaptic("light");
              }}
              className={`w-full px-2.5 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer ${
                activeFilterDropdown === "date"
                  ? "border-indigo-505 bg-indigo-950/45 text-indigo-300 shadow-md"
                  : isDark 
                    ? "bg-slate-950/50 border-white/10 text-slate-200 hover:border-slate-500" 
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <CalendarRange size={13} className="text-indigo-400 shrink-0" />
                <span className="truncate">
                  {reportDateMode === "none" && "Date: Any"}
                  {reportDateMode === "single" && `${formatReportDate(reportSingleDate)}`}
                  {reportDateMode === "range" && `${formatReportDate(reportStartDate)}-${formatReportDate(reportEndDate)}`}
                </span>
              </span>
              <span className="text-[9px] opacity-70">▼</span>
            </button>

            {activeFilterDropdown === "date" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveFilterDropdown(null)} />
                <div className={`absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 mt-2 p-4 rounded-2xl border w-64 sm:w-72 z-50 flex flex-col gap-3 shadow-2xl animate-fadeIn ${
                  isDark ? "bg-[#090d16] opacity-100 border-white/10 text-slate-200" : "bg-white opacity-100 border-slate-200 text-slate-800"
                }`}>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">Select Date Mode</h4>
                  <div className="flex flex-col gap-1.5">
                    {(["none", "single", "range"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          setReportDateMode(mode);
                          triggerHaptic("light");
                        }}
                        className={`py-2 px-3 text-[10px] text-left font-black uppercase rounded-xl border transition-all cursor-pointer ${
                          reportDateMode === mode
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-white/5 text-slate-400 bg-slate-900/40 hover:bg-slate-900/60"
                        }`}
                      >
                        {mode === "none" ? "● All Dates" : mode === "single" ? "● Single Day" : "● Date Range"}
                      </button>
                    ))}
                  </div>

                  {reportDateMode === "single" && (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-500">Pick Day</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReportSingleDate(getLocalDateString(new Date()));
                            triggerHaptic("light");
                          }}
                          className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Today
                        </button>
                      </div>
                      <input
                        type="date"
                        value={reportSingleDate}
                        onChange={(e) => setReportSingleDate(e.target.value)}
                        className={`p-2 rounded-xl border text-xs font-mono w-full ${
                          isDark ? "bg-slate-900 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>
                  )}

                  {reportDateMode === "range" && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-500">Date Range</span>
                        <button
                          type="button"
                          onClick={() => {
                            const todayStr = getLocalDateString(new Date());
                            setReportStartDate(todayStr);
                            setReportEndDate(todayStr);
                            triggerHaptic("light");
                          }}
                          className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Set Today
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase text-slate-500">From</span>
                          <input
                            type="date"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className={`p-2 rounded-xl border text-[10px] font-mono [color-scheme:dark] w-full ${
                              isDark ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                            }`}
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase text-slate-500">To</span>
                          <input
                            type="date"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                            className={`p-2 rounded-xl border text-[10px] font-mono [color-scheme:dark] w-full ${
                              isDark ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveFilterDropdown(null)}
                    className="mt-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] rounded-xl tracking-wider transition-colors cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 2. COLLABORATOR FILTER DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === "collaborator" ? null : "collaborator");
                triggerHaptic("light");
              }}
              className={`w-full px-2.5 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer ${
                activeFilterDropdown === "collaborator"
                  ? "border-indigo-505 bg-indigo-950/45 text-indigo-300 shadow-md"
                  : isDark 
                    ? "bg-slate-950/50 border-white/10 text-slate-200 hover:border-slate-500" 
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <User size={13} className="text-indigo-400 shrink-0" />
                <span className="truncate">
                  {reportCollaboratorMode === "all" && "Col: All"}
                  {reportCollaboratorMode === "none" && "Col: None"}
                  {reportCollaboratorMode === "single" && `Col: ${reportSelectedCollaborators[0] || "None"}`}
                  {reportCollaboratorMode === "multiple" && `Col: ${reportSelectedCollaborators.length}`}
                </span>
              </span>
              <span className="text-[9px] opacity-70">▼</span>
            </button>

            {activeFilterDropdown === "collaborator" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveFilterDropdown(null)} />
                <div className={`absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 mt-2 p-4 rounded-2xl border w-64 sm:w-72 z-50 flex flex-col gap-3 shadow-2xl animate-fadeIn ${
                  isDark ? "bg-[#090d16] opacity-100 border-white/10 text-slate-200" : "bg-white opacity-100 border-slate-200 text-slate-800"
                }`}>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">Select Collaborator Mode</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["all", "single", "multiple", "none"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          setReportCollaboratorMode(mode);
                          setReportSelectedCollaborators([]);
                          triggerHaptic("light");
                        }}
                        className={`py-2 text-[9px] font-black uppercase rounded-xl border transition-all cursor-pointer text-center ${
                          reportCollaboratorMode === mode
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-white/5 text-slate-400 bg-slate-900/40 hover:bg-slate-900/60"
                        }`}
                      >
                        {mode === "all" ? "All" : mode === "single" ? "1 Col" : mode === "multiple" ? "Multi" : "None"}
                      </button>
                    ))}
                  </div>

                  {reportCollaboratorMode === "single" && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[9px] font-black uppercase text-slate-500">Choose Active Member</span>
                      <select
                        value={reportSelectedCollaborators[0] || ""}
                        onChange={(e) => setReportSelectedCollaborators([e.target.value])}
                        className={`p-2 rounded-xl border text-xs font-mono w-full ${
                          isDark ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value="">-- Choose Col --</option>
                        {collaborators.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {reportCollaboratorMode === "multiple" && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[9px] font-black uppercase text-slate-500">Toggle Multi-Selection</span>
                      <div className={`p-2 rounded-xl border text-xs h-28 overflow-y-auto ${
                        isDark ? "bg-slate-905 border-white/10" : "bg-white border-slate-200"
                      }`}>
                        {collaborators.map(c => {
                          const checked = reportSelectedCollaborators.includes(c);
                          return (
                            <label key={c} className="flex items-center gap-1.5 px-1 py-1 hover:bg-white/5 cursor-pointer text-[10px]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setReportSelectedCollaborators(prev =>
                                    checked ? prev.filter(x => x !== c) : [...prev, c]
                                  );
                                }}
                                className="rounded"
                              />
                              <span>{c}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveFilterDropdown(null)}
                    className="mt-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] rounded-xl tracking-wider transition-colors cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 3. CATEGORY FILTER DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === "location" ? null : "location");
                triggerHaptic("light");
              }}
              className={`w-full px-2.5 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer ${
                activeFilterDropdown === "location"
                  ? "border-indigo-505 bg-indigo-950/45 text-indigo-300 shadow-md"
                  : isDark 
                    ? "bg-slate-950/50 border-white/10 text-slate-200 hover:border-slate-500" 
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Tag size={13} className="text-indigo-400 shrink-0" />
                <span className="truncate">
                  {reportLocationMode === "all" && "Cat: All"}
                  {reportLocationMode === "none" && "Cat: None"}
                  {reportLocationMode === "single" && `Cat: ${reportSelectedLocations[0] || "None"}`}
                  {reportLocationMode === "multiple" && `Cat: ${reportSelectedLocations.length}`}
                </span>
              </span>
              <span className="text-[9px] opacity-70">▼</span>
            </button>

            {activeFilterDropdown === "location" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveFilterDropdown(null)} />
                <div className={`absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:right-0 md:left-auto mt-2 p-4 rounded-2xl border w-64 sm:w-72 z-50 flex flex-col gap-3 shadow-2xl animate-fadeIn ${
                  isDark ? "bg-[#090d16] opacity-100 border-white/10 text-slate-200" : "bg-white opacity-100 border-slate-200 text-slate-800"
                }`}>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">Select Category Mode</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["all", "single", "multiple", "none"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          setReportLocationMode(mode);
                          setReportSelectedLocations([]);
                          triggerHaptic("light");
                        }}
                        className={`py-2 text-[9px] font-black uppercase rounded-xl border transition-all cursor-pointer text-center ${
                          reportLocationMode === mode
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-white/5 text-slate-400 bg-slate-900/40 hover:bg-slate-900/60"
                        }`}
                      >
                        {mode === "all" ? "All" : mode === "single" ? "1 Cat" : mode === "multiple" ? "Multi" : "None"}
                      </button>
                    ))}
                  </div>

                  {reportLocationMode === "single" && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[9px] font-black uppercase text-slate-500">Choose Active Category</span>
                      <select
                        value={reportSelectedLocations[0] || ""}
                        onChange={(e) => setReportSelectedLocations([e.target.value])}
                        className={`p-2 rounded-xl border text-xs font-mono w-full ${
                          isDark ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value="">-- Choose Category --</option>
                        {allAvailableCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {reportLocationMode === "multiple" && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[9px] font-black uppercase text-slate-500">Toggle Multi-Selection</span>
                      <div className={`p-2 rounded-xl border text-xs h-28 overflow-y-auto ${
                        isDark ? "bg-slate-905 border-white/10" : "bg-white border-slate-200"
                      }`}>
                        {allAvailableCategories.length === 0 ? (
                          <p className="text-[9px] text-slate-500 italic p-1">No categories tracked yet</p>
                        ) : (
                          allAvailableCategories.map(c => {
                            const checked = reportSelectedLocations.includes(c);
                            return (
                              <label key={c} className="flex items-center gap-1.5 px-1 py-1 hover:bg-white/5 cursor-pointer text-[10px]">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setReportSelectedLocations(prev =>
                                      checked ? prev.filter(x => x !== c) : [...prev, c]
                                    );
                                  }}
                                  className="rounded"
                                />
                                <span>{c}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveFilterDropdown(null)}
                    className="mt-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] rounded-xl tracking-wider transition-colors cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 4. GROUP BY FILTER DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === "groupby" ? null : "groupby");
                triggerHaptic("light");
              }}
              className={`w-full px-2.5 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-wider flex items-center justify-between gap-1 transition-all cursor-pointer ${
                activeFilterDropdown === "groupby"
                  ? "border-indigo-505 bg-indigo-950/45 text-indigo-300 shadow-md"
                  : isDark 
                    ? "bg-slate-950/50 border-white/10 text-slate-200 hover:border-slate-500" 
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <SlidersHorizontal size={13} className="text-indigo-400 shrink-0" />
                <span className="truncate">
                  Group: {[
                    reportGroupByDate ? "Date" : null,
                    reportGroupByCollaborator ? "Col" : null,
                    reportGroupByLocation ? "Cat" : null
                  ].filter(Boolean).join(",") || "None"}
                </span>
              </span>
              <span className="text-[9px] opacity-70">▼</span>
            </button>

            {activeFilterDropdown === "groupby" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveFilterDropdown(null)} />
                <div className={`absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:right-0 md:left-auto mt-2 p-4 rounded-2xl border w-64 sm:w-72 z-50 flex flex-col gap-3 shadow-2xl animate-fadeIn ${
                  isDark ? "bg-[#090d16] opacity-100 border-white/10 text-slate-200" : "bg-white opacity-100 border-slate-200 text-slate-800"
                }`}>
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">Group Results By</h4>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">Toggle categories to cluster checklists</p>
                  
                  <div className="flex flex-col gap-2.5">
                    <label className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      isDark ? "bg-slate-900/60 border-white/5 hover:bg-slate-900" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    }`}>
                      <input
                        type="checkbox"
                        checked={reportGroupByDate}
                        onChange={() => { setReportGroupByDate(!reportGroupByDate); triggerHaptic("light"); }}
                        className="accent-indigo-505 rounded w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[10px] font-black uppercase">Date Grouping</span>
                    </label>

                    <label className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      isDark ? "bg-slate-900/60 border-white/5 hover:bg-slate-900" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    }`}>
                      <input
                        type="checkbox"
                        checked={reportGroupByCollaborator}
                        onChange={() => { setReportGroupByCollaborator(!reportGroupByCollaborator); triggerHaptic("light"); }}
                        className="accent-indigo-505 rounded w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[10px] font-black uppercase">Collaborator Grouping</span>
                    </label>

                    <label className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      isDark ? "bg-slate-900/60 border-white/5 hover:bg-slate-900" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    }`}>
                      <input
                        type="checkbox"
                        checked={reportGroupByLocation}
                        onChange={() => { setReportGroupByLocation(!reportGroupByLocation); triggerHaptic("light"); }}
                        className="accent-indigo-505 rounded w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[10px] font-black uppercase">Category Grouping</span>
                    </label>
                  </div>

                  <button
                    onClick={() => setActiveFilterDropdown(null)}
                    className="mt-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] rounded-xl tracking-wider transition-colors cursor-pointer"
                  >
                    Apply Grouping
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Results Sort Bar & Options Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1.5 border-b border-white/5 -mt-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal size={12} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Sort Hierarchy:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Level 1: Primary Sort */}
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono text-slate-400 uppercase">1st:</span>
                <select
                  value={reportSortBy1}
                  onChange={(e) => {
                    setReportSortBy1(e.target.value as any);
                    triggerHaptic("light");
                  }}
                  className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg border cursor-pointer outline-none transition-all ${
                    isDark 
                      ? "bg-slate-900 border-white/10 text-indigo-400 hover:text-indigo-300" 
                      : "bg-slate-100 border-slate-200 text-indigo-700 hover:bg-slate-150"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="date" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Date & Time</option>
                  <option value="priority" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Priority</option>
                  <option value="title" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Title</option>
                  <option value="category" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Category</option>
                  <option value="collaborator" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Collaborator</option>
                  <option value="duration" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Duration</option>
                </select>
              </div>

              {/* Level 2: Secondary Sort */}
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono text-slate-400 uppercase">2nd:</span>
                <select
                  value={reportSortBy2}
                  onChange={(e) => {
                    setReportSortBy2(e.target.value as any);
                    triggerHaptic("light");
                  }}
                  className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg border cursor-pointer outline-none transition-all ${
                    isDark 
                      ? "bg-slate-900 border-white/10 text-indigo-400 hover:text-indigo-300" 
                      : "bg-slate-100 border-slate-200 text-indigo-700 hover:bg-slate-150"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="date" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Date & Time</option>
                  <option value="priority" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Priority</option>
                  <option value="title" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Title</option>
                  <option value="category" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Category</option>
                  <option value="collaborator" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Collaborator</option>
                  <option value="duration" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Duration</option>
                </select>
              </div>

              {/* Level 3: Tertiary Sort */}
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono text-slate-400 uppercase">3rd:</span>
                <select
                  value={reportSortBy3}
                  onChange={(e) => {
                    setReportSortBy3(e.target.value as any);
                    triggerHaptic("light");
                  }}
                  className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg border cursor-pointer outline-none transition-all ${
                    isDark 
                      ? "bg-slate-900 border-white/10 text-indigo-400 hover:text-indigo-300" 
                      : "bg-slate-100 border-slate-200 text-indigo-700 hover:bg-slate-150"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="date" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Date & Time</option>
                  <option value="priority" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Priority</option>
                  <option value="title" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Title</option>
                  <option value="category" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Category</option>
                  <option value="collaborator" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Collaborator</option>
                  <option value="duration" className={isDark ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>Duration</option>
                </select>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-450 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reportIncludeCompleted}
              onChange={(e) => {
                setReportIncludeCompleted(e.target.checked);
                triggerHaptic("light");
              }}
              className="w-3.5 h-3.5 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer bg-slate-900"
            />
            <span>Include Completed</span>
          </label>
        </div>
          </>
        )}

        {/* TOP SECTION: INCOMPLETE TASKS */}
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-2 pb-1.5 border-b border-indigo-550/10">
            <CheckSquare size={13} className="text-amber-455 shrink-0" />
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-amber-455">Incomplete Task Entries ({incTasks.length})</h3>
          </div>

          {groupedIncomplete.length === 0 || (groupedIncomplete.length === 1 && groupedIncomplete[0].tasks.length === 0) ? (
            <div className="py-8 bg-slate-900/10 border border-dashed border-white/5 rounded-2xl text-center text-slate-500 text-[10px] uppercase tracking-wider font-mono">
              No matching incomplete tasks
            </div>
          ) : (
            <div className="space-y-4">
              {groupedIncomplete.map((grp, idx) => {
                if (grp.tasks.length === 0) return null;
                return (
                  <div key={grp.label || "un-grouped" + idx} className="space-y-1.5">
                    {grp.label && (
                      <h4 className="text-[9.5px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/20 px-2.5 py-1 rounded-md inline-block font-mono">
                        {grp.label}
                      </h4>
                    )}
                    <div className="grid grid-cols-1 gap-2 pl-1">
                      {grp.tasks.map(task => {
                        const isSimple = focusCardDetailMode === "simple";
                        return (
                          <div
                            key={task.id}
                            className={`relative flex ${isSimple ? "flex-row items-center justify-between gap-2 p-2 px-3" : "flex-col gap-1 p-2 px-3"} rounded-xl border transition-all hover:bg-slate-900/40 text-left ${
                              isDark ? "bg-slate-900/15 border-white/5" : "bg-slate-50 border-slate-100 shadow-xs"
                            }`}
                          >
                            {isSimple ? (
                              <>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {/* Status Checkbox */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleComplete(task.id);
                                      triggerHaptic("medium");
                                    }}
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                      task.completed 
                                        ? "bg-emerald-500 border-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.3)]" 
                                        : isDark 
                                          ? "border-slate-700 hover:border-slate-500 bg-slate-950/40" 
                                          : "border-slate-300 hover:border-slate-400 bg-white"
                                    }`}
                                    title={task.completed ? "Mark incomplete" : "Mark completed"}
                                  >
                                    {task.completed && <Check size={10} strokeWidth={3.5} className="text-white" />}
                                  </button>

                                  {/* Title Hyperlink */}
                                  <button
                                    onClick={() => handleReportTaskTitleClick(task)}
                                    className={`font-black ${getDynamicTitleClass(task.title, "report")} uppercase tracking-wide truncate text-left hover:text-indigo-400 cursor-pointer flex-1 min-w-0 ${
                                      task.completed ? "line-through text-slate-400" : "text-slate-100"
                                    }`}
                                  >
                                    {task.title || "Untitled Task"}
                                  </button>
                                </div>

                                {/* Actions: Status Flag & Lock/Unlock Toggle */}
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {/* Status Flag */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPrioritySelectTask(task);
                                    }}
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm occasional-orange-glow ${
                                      task.priority === "high"
                                        ? "bg-orange-500/15 border-orange-400/50 hover:bg-orange-500/25 text-orange-400"
                                        : task.priority === "medium"
                                          ? "bg-amber-500/15 border-amber-400/50 hover:bg-amber-500/25 text-amber-400"
                                          : task.priority === "low"
                                            ? "bg-sky-505/15 border-sky-400/50 hover:bg-sky-505/25 text-sky-450"
                                            : "bg-slate-900/30 border-white/10 text-slate-500 hover:text-white"
                                    }`}
                                    title={`Priority: ${task.priority || "none"} (Click to change)`}
                                  >
                                    {task.priority === "high" ? (
                                      <Flag size={11} className="text-orange-405 fill-orange-400/30" />
                                    ) : task.priority === "medium" ? (
                                      <Flag size={11} className="text-amber-400 fill-amber-400/30" />
                                    ) : task.priority === "low" ? (
                                      <Flag size={11} className="text-sky-455 fill-sky-400/30" />
                                    ) : (
                                      <Flag size={11} className="text-slate-500" />
                                    )}
                                  </button>

                                  {/* Lock/Unlock Toggle */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestToggleLock(task);
                                    }}
                                    className="w-6 h-6 rounded-lg border border-white/10 bg-slate-900/30 text-slate-400 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                    title={task.isLocked ? "Unlock Task" : "Lock Task"}
                                  >
                                    {task.isLocked ? <Lock size={11} strokeWidth={2.5} /> : <Unlock size={11} strokeWidth={2.5} />}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Row 1: Status & Title & Priority */}
                                <div className="flex items-center gap-2 min-w-0">
                            {/* Status Checkbox */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(task.id);
                                triggerHaptic("medium");
                              }}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                task.completed 
                                  ? "bg-emerald-500 border-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.3)]" 
                                  : isDark 
                                    ? "border-slate-700 hover:border-slate-500 bg-slate-950/40" 
                                    : "border-slate-300 hover:border-slate-400 bg-white"
                              }`}
                              title={task.completed ? "Mark incomplete" : "Mark completed"}
                            >
                              {task.completed && <Check size={10} strokeWidth={3.5} className="text-white" />}
                            </button>

                            {/* Title Hyperlink */}
                            <button
                              onClick={() => handleReportTaskTitleClick(task)}
                              className={`font-black ${getDynamicTitleClass(task.title, "report")} uppercase tracking-wide truncate text-left hover:text-indigo-400 cursor-pointer flex-1 min-w-0 ${
                                task.completed ? "line-through text-slate-400" : "text-slate-100"
                              }`}
                            >
                              {task.title || "Untitled Task"}
                            </button>

                            {/* Directions MapPin Link */}
                            {task.location && task.location.toString().trim() !== "0" && (
                              <a
                                href={getGoogleMapsDirectionsUrl(task.location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 p-1 bg-rose-550/10 text-rose-400 border border-rose-500/15 rounded-md hover:bg-rose-500/20 cursor-pointer transition-colors flex items-center justify-center"
                                title={`Open directions to "${task.location}" in Google Maps`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MapPin size={9} className="text-rose-400" />
                              </a>
                            )}

                            {/* Priority badge */}
                            {task.priority && (
                              <span className={`shrink-0 text-[7px] font-black uppercase px-1 py-0.5 rounded-xs ${
                                task.priority === "high" 
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/15" 
                                  : task.priority === "medium"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                                    : "bg-slate-500/10 text-slate-400 border border-slate-500/15"
                              }`}>
                                {task.priority}
                              </span>
                            )}
                          </div>

                          {/* Row 2: Date & Collaborator & Category Hyperlinks */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] font-mono text-slate-400 select-none">
                            {/* Date Hyperlink */}
                            <div className="relative inline-block">
                              <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px] mr-1">Date:</span>
                              <button
                                onClick={() => {
                                  triggerHaptic("light");
                                  setReportInlineEdit(reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "date" ? null : { taskId: task.id, type: "date" });
                                }}
                                className={`underline decoration-dotted underline-offset-2 hover:text-indigo-400 font-bold cursor-pointer ${
                                  task.date ? (isDark ? "text-slate-200" : "text-slate-700") : "text-slate-500 italic"
                                }`}
                              >
                                {formatToMMDDYY(task.date)}
                              </button>

                              {/* Inline Date Edit Popover */}
                              {reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "date" && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setReportInlineEdit(null)} />
                                  <div className={`absolute left-0 mt-1 p-2 rounded-xl border shadow-xl z-50 w-44 flex flex-col gap-1.5 ${
                                    isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
                                  }`}>
                                    <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider pb-1 border-b border-white/5 px-1">
                                      Edit Date
                                    </div>
                                    <input
                                      type="date"
                                      value={task.date || ""}
                                      onChange={(e) => {
                                        handleUpdateTaskDate(task.id, e.target.value);
                                      }}
                                      className={`w-full px-2 py-1 rounded-lg border text-[11px] font-mono outline-none cursor-pointer [color-scheme:dark] ${
                                        isDark 
                                          ? "bg-slate-900 border-white/10 text-slate-200" 
                                          : "bg-white border-slate-200 text-slate-700"
                                      }`}
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          handleUpdateTaskDate(task.id, getLocalDateString(new Date()));
                                          setReportInlineEdit(null);
                                        }}
                                        className="flex-1 py-1 text-[9px] font-bold uppercase bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg cursor-pointer text-center"
                                      >
                                        Today
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleUpdateTaskDate(task.id, "");
                                          setReportInlineEdit(null);
                                        }}
                                        className="flex-1 py-1 text-[9px] font-bold uppercase bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg cursor-pointer text-center"
                                      >
                                        Clear
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => setReportInlineEdit(null)}
                                      className="py-1 text-[9px] font-bold uppercase bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer text-center"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            <span className="text-slate-600 text-[8px]">•</span>

                            {/* Collaborator Hyperlink */}
                            <div className="relative inline-block">
                              <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px] mr-1">Col:</span>
                              <button
                                onClick={() => {
                                  triggerHaptic("light");
                                  setReportInlineEdit(reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "collaborator" ? null : { taskId: task.id, type: "collaborator" });
                                }}
                                className={`underline decoration-dotted underline-offset-2 hover:text-indigo-400 font-bold cursor-pointer ${
                                  task.collaborator && task.collaborator !== "None" ? (isDark ? "text-slate-200" : "text-slate-700") : "text-slate-500 italic"
                                }`}
                              >
                                {task.collaborator && task.collaborator !== "None" ? task.collaborator : "Unassigned"}
                              </button>

                              {/* Inline Collaborator Edit Popover */}
                              {reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "collaborator" && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setReportInlineEdit(null)} />
                                  <div className={`absolute left-0 mt-1 p-2 rounded-xl border shadow-xl z-50 w-44 flex flex-col gap-1 max-h-48 overflow-y-auto ${
                                    isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
                                  }`}>
                                    <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider pb-1 border-b border-white/5 mb-1 px-1 sticky top-0 bg-inherit">
                                      Assign Collaborator
                                    </div>
                                    <button
                                      onClick={() => {
                                        handleUpdateTaskCollaborator(task.id, "None");
                                        setReportInlineEdit(null);
                                      }}
                                      className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                        !task.collaborator || task.collaborator === "None"
                                          ? "bg-indigo-600 text-white"
                                          : isDark
                                            ? "hover:bg-slate-900 text-slate-300"
                                            : "hover:bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      Unassigned
                                    </button>
                                    {collaborators.map(c => (
                                      <button
                                        key={c}
                                        onClick={() => {
                                          handleUpdateTaskCollaborator(task.id, c);
                                          setReportInlineEdit(null);
                                        }}
                                        className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                          task.collaborator === c
                                            ? "bg-indigo-600 text-white"
                                            : isDark
                                              ? "hover:bg-slate-900 text-slate-300"
                                              : "hover:bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        {c}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>

                            <span className="text-slate-600 text-[8px]">•</span>

                            {/* Category Hyperlink */}
                            <div className="relative inline-block">
                              <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px] mr-1">Cat:</span>
                              <button
                                onClick={() => {
                                  triggerHaptic("light");
                                  setReportInlineEdit(reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "category" ? null : { taskId: task.id, type: "category" });
                                }}
                                className={`underline decoration-dotted underline-offset-2 hover:text-indigo-400 font-bold cursor-pointer ${
                                  task.category && task.category !== "None" ? (isDark ? "text-slate-200" : "text-slate-700") : "text-slate-500 italic"
                                }`}
                              >
                                {task.category && task.category !== "None" ? task.category : "No Category"}
                              </button>

                              {/* Inline Category Edit Popover */}
                              {reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "category" && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setReportInlineEdit(null)} />
                                  <div className={`absolute left-0 mt-1 p-2 rounded-xl border shadow-xl z-50 w-44 flex flex-col gap-1 max-h-48 overflow-y-auto ${
                                    isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
                                  }`}>
                                    <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider pb-1 border-b border-white/5 mb-1 px-1 sticky top-0 bg-inherit">
                                      Select Category
                                    </div>
                                    <button
                                      onClick={() => {
                                        handleUpdateTaskCategory(task.id, "None");
                                        setReportInlineEdit(null);
                                      }}
                                      className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                        !task.category || task.category === "None"
                                          ? "bg-indigo-600 text-white"
                                          : isDark
                                            ? "hover:bg-slate-900 text-slate-300"
                                            : "hover:bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      No Category
                                    </button>
                                    {categories.map(cat => (
                                      <button
                                        key={cat}
                                        onClick={() => {
                                          handleUpdateTaskCategory(task.id, cat);
                                          setReportInlineEdit(null);
                                        }}
                                        className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                          task.category === cat
                                            ? "bg-indigo-600 text-white"
                                            : isDark
                                              ? "hover:bg-slate-900 text-slate-300"
                                              : "hover:bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: COMPLETED TASKS */}
        {reportIncludeCompleted && (
          <div className="space-y-3 text-left mt-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-indigo-550/10">
              <CheckCircle2 size={13} className="text-emerald-450 shrink-0" />
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-450">Completed Task Entries ({compTasks.length})</h3>
            </div>

            {groupedCompleted.length === 0 || (groupedCompleted.length === 1 && groupedCompleted[0].tasks.length === 0) ? (
              <div className="py-8 bg-slate-900/10 border border-dashed border-white/5 rounded-2xl text-center text-slate-500 text-[10px] uppercase tracking-wider font-mono">
                No matching completed tasks
              </div>
            ) : (
              <div className="space-y-4">
                {groupedCompleted.map((grp, idx) => {
                  if (grp.tasks.length === 0) return null;
                  return (
                    <div key={grp.label || "un-grouped" + idx} className="space-y-1.5">
                      {grp.label && (
                        <h4 className="text-[9.5px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/20 px-2.5 py-1 rounded-md inline-block font-mono">
                          {grp.label}
                        </h4>
                      )}
                      <div className="grid grid-cols-1 gap-2 pl-1">
                        {grp.tasks.map(task => {
                          const isSimple = focusCardDetailMode === "simple";
                          return (
                            <div
                              key={task.id}
                              className={`relative flex ${isSimple ? "flex-row items-center justify-between gap-2 p-2 px-3" : "flex-col gap-1 p-2 px-3"} rounded-xl border transition-all hover:bg-slate-900/40 text-left opacity-80 ${
                                isDark ? "bg-slate-900/15 border-white/5" : "bg-slate-50 border-slate-100 shadow-xs"
                              }`}
                            >
                              {isSimple ? (
                                <>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {/* Status Checkbox */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleComplete(task.id);
                                        triggerHaptic("medium");
                                      }}
                                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                        task.completed 
                                          ? "bg-emerald-500 border-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.3)]" 
                                          : isDark 
                                            ? "border-slate-700 hover:border-slate-500 bg-slate-950/40" 
                                            : "border-slate-300 hover:border-slate-400 bg-white"
                                      }`}
                                      title={task.completed ? "Mark incomplete" : "Mark completed"}
                                    >
                                      {task.completed && <Check size={10} strokeWidth={3.5} className="text-white" />}
                                    </button>

                                    {/* Title Hyperlink */}
                                    <button
                                      onClick={() => handleReportTaskTitleClick(task)}
                                      className={`font-black ${getDynamicTitleClass(task.title, "report")} uppercase tracking-wide truncate text-left hover:text-indigo-400 cursor-pointer flex-1 min-w-0 ${
                                        task.completed ? "line-through text-slate-400" : "text-slate-100"
                                      }`}
                                    >
                                      {task.title || "Untitled Task"}
                                    </button>
                                  </div>

                                  {/* Actions: Status Flag & Lock/Unlock Toggle */}
                                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {/* Status Flag */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPrioritySelectTask(task);
                                      }}
                                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm occasional-orange-glow ${
                                        task.priority === "high"
                                          ? "bg-orange-500/15 border-orange-400/50 hover:bg-orange-500/25 text-orange-400"
                                          : task.priority === "medium"
                                            ? "bg-amber-500/15 border-amber-400/50 hover:bg-amber-500/25 text-amber-400"
                                            : task.priority === "low"
                                              ? "bg-sky-505/15 border-sky-400/50 hover:bg-sky-505/25 text-sky-450"
                                              : "bg-slate-900/30 border-white/10 text-slate-500 hover:text-white"
                                      }`}
                                      title={`Priority: ${task.priority || "none"} (Click to change)`}
                                    >
                                      {task.priority === "high" ? (
                                        <Flag size={11} className="text-orange-405 fill-orange-400/30" />
                                      ) : task.priority === "medium" ? (
                                        <Flag size={11} className="text-amber-400 fill-amber-400/30" />
                                      ) : task.priority === "low" ? (
                                        <Flag size={11} className="text-sky-455 fill-sky-400/30" />
                                      ) : (
                                        <Flag size={11} className="text-slate-500" />
                                      )}
                                    </button>

                                    {/* Lock/Unlock Toggle */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        requestToggleLock(task);
                                      }}
                                      className="w-6 h-6 rounded-lg border border-white/10 bg-slate-900/30 text-slate-400 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
                                      title={task.isLocked ? "Unlock Task" : "Lock Task"}
                                    >
                                      {task.isLocked ? <Lock size={11} strokeWidth={2.5} /> : <Unlock size={11} strokeWidth={2.5} />}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Row 1: Status & Title & Priority */}
                                  <div className="flex items-center gap-2 min-w-0">
                              {/* Status Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleComplete(task.id);
                                  triggerHaptic("medium");
                                }}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                  task.completed 
                                    ? "bg-emerald-500 border-emerald-500 shadow-[0_2px_6px_rgba(16,185,129,0.3)]" 
                                    : isDark 
                                      ? "border-slate-700 hover:border-slate-500 bg-slate-950/40" 
                                      : "border-slate-300 hover:border-slate-400 bg-white"
                                }`}
                                title={task.completed ? "Mark incomplete" : "Mark completed"}
                              >
                                {task.completed && <Check size={10} strokeWidth={3.5} className="text-white" />}
                              </button>

                              {/* Title Hyperlink */}
                              <button
                                onClick={() => handleReportTaskTitleClick(task)}
                                className={`font-black ${getDynamicTitleClass(task.title, "report")} uppercase tracking-wide truncate text-left hover:text-indigo-400 cursor-pointer flex-1 min-w-0 ${
                                  task.completed ? "line-through text-slate-400" : "text-slate-100"
                                }`}
                              >
                                {task.title || "Untitled Task"}
                              </button>

                              {/* Directions MapPin Link */}
                              {task.location && task.location.toString().trim() !== "0" && (
                                <a
                                  href={getGoogleMapsDirectionsUrl(task.location)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 p-1 bg-rose-550/10 text-rose-400 border border-rose-500/15 rounded-md hover:bg-rose-500/20 cursor-pointer transition-colors flex items-center justify-center"
                                  title={`Open directions to "${task.location}" in Google Maps`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MapPin size={9} className="text-rose-400" />
                                </a>
                              )}

                              {/* Priority badge */}
                              {task.priority && (
                                <span className={`shrink-0 text-[7px] font-black uppercase px-1 py-0.5 rounded-xs ${
                                  task.priority === "high" 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/15" 
                                    : task.priority === "medium"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                                      : "bg-slate-500/10 text-slate-400 border border-slate-500/15"
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                            </div>

                            {/* Row 2: Date & Collaborator & Category Hyperlinks */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] font-mono text-slate-400 select-none">
                              {/* Date Hyperlink */}
                              <div className="relative inline-block">
                                <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px] mr-1">Date:</span>
                                <button
                                  onClick={() => {
                                    triggerHaptic("light");
                                    setReportInlineEdit(reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "date" ? null : { taskId: task.id, type: "date" });
                                  }}
                                  className={`underline decoration-dotted underline-offset-2 hover:text-indigo-400 font-bold cursor-pointer ${
                                    task.date ? (isDark ? "text-slate-200" : "text-slate-700") : "text-slate-500 italic"
                                  }`}
                                >
                                  {formatToMMDDYY(task.date)}
                                </button>

                                {/* Inline Date Edit Popover */}
                                {reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "date" && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setReportInlineEdit(null)} />
                                    <div className={`absolute left-0 mt-1 p-2 rounded-xl border shadow-xl z-50 w-44 flex flex-col gap-1.5 ${
                                      isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
                                    }`}>
                                      <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider pb-1 border-b border-white/5 px-1">
                                        Edit Date
                                      </div>
                                      <input
                                        type="date"
                                        value={task.date || ""}
                                        onChange={(e) => {
                                          handleUpdateTaskDate(task.id, e.target.value);
                                        }}
                                        className={`w-full px-2 py-1 rounded-lg border text-[11px] font-mono outline-none cursor-pointer [color-scheme:dark] ${
                                          isDark 
                                            ? "bg-slate-900 border-white/10 text-slate-200" 
                                            : "bg-white border-slate-200 text-slate-700"
                                        }`}
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => {
                                            handleUpdateTaskDate(task.id, getLocalDateString(new Date()));
                                            setReportInlineEdit(null);
                                          }}
                                          className="flex-1 py-1 text-[9px] font-bold uppercase bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg cursor-pointer text-center"
                                        >
                                          Today
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleUpdateTaskDate(task.id, "");
                                            setReportInlineEdit(null);
                                          }}
                                          className="flex-1 py-1 text-[9px] font-bold uppercase bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg cursor-pointer text-center"
                                        >
                                          Clear
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => setReportInlineEdit(null)}
                                        className="py-1 text-[9px] font-bold uppercase bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer text-center"
                                      >
                                        Done
                                      </button>
                                    </div>
                                  </>
                                )}
                           </div>

                              <span className="text-slate-600 text-[8px]">•</span>

                              {/* Collaborator Hyperlink */}
                              <div className="relative inline-block">
                                <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px] mr-1">Col:</span>
                                <button
                                  onClick={() => {
                                    triggerHaptic("light");
                                    setReportInlineEdit(reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "collaborator" ? null : { taskId: task.id, type: "collaborator" });
                                  }}
                                  className={`underline decoration-dotted underline-offset-2 hover:text-indigo-400 font-bold cursor-pointer ${
                                    task.collaborator && task.collaborator !== "None" ? (isDark ? "text-slate-200" : "text-slate-700") : "text-slate-500 italic"
                                  }`}
                                >
                                  {task.collaborator && task.collaborator !== "None" ? task.collaborator : "Unassigned"}
                                </button>

                                {/* Inline Collaborator Edit Popover */}
                                {reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "collaborator" && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setReportInlineEdit(null)} />
                                    <div className={`absolute left-0 mt-1 p-2 rounded-xl border shadow-xl z-50 w-44 flex flex-col gap-1 max-h-48 overflow-y-auto ${
                                      isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
                                    }`}>
                                      <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider pb-1 border-b border-white/5 mb-1 px-1 sticky top-0 bg-inherit">
                                        Assign Collaborator
                                      </div>
                                      <button
                                        onClick={() => {
                                          handleUpdateTaskCollaborator(task.id, "None");
                                          setReportInlineEdit(null);
                                        }}
                                        className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                          !task.collaborator || task.collaborator === "None"
                                            ? "bg-indigo-600 text-white"
                                            : isDark
                                              ? "hover:bg-slate-900 text-slate-300"
                                              : "hover:bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        Unassigned
                                      </button>
                                      {collaborators.map(c => (
                                        <button
                                          key={c}
                                          onClick={() => {
                                            handleUpdateTaskCollaborator(task.id, c);
                                            setReportInlineEdit(null);
                                          }}
                                          className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                            task.collaborator === c
                                              ? "bg-indigo-600 text-white"
                                              : isDark
                                                ? "hover:bg-slate-900 text-slate-300"
                                                : "hover:bg-slate-100 text-slate-700"
                                          }`}
                                        >
                                          {c}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              <span className="text-slate-600 text-[8px]">•</span>

                              {/* Category Hyperlink */}
                              <div className="relative inline-block">
                                <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px] mr-1">Cat:</span>
                                <button
                                  onClick={() => {
                                    triggerHaptic("light");
                                    setReportInlineEdit(reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "category" ? null : { taskId: task.id, type: "category" });
                                  }}
                                  className={`underline decoration-dotted underline-offset-2 hover:text-indigo-400 font-bold cursor-pointer ${
                                    task.category && task.category !== "None" ? (isDark ? "text-slate-200" : "text-slate-700") : "text-slate-500 italic"
                                  }`}
                                >
                                  {task.category && task.category !== "None" ? task.category : "No Category"}
                                </button>

                                {/* Inline Category Edit Popover */}
                                {reportInlineEdit?.taskId === task.id && reportInlineEdit?.type === "category" && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setReportInlineEdit(null)} />
                                    <div className={`absolute left-0 mt-1 p-2 rounded-xl border shadow-xl z-50 w-44 flex flex-col gap-1 max-h-48 overflow-y-auto ${
                                      isDark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
                                    }`}>
                                      <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider pb-1 border-b border-white/5 mb-1 px-1 sticky top-0 bg-inherit">
                                        Select Category
                                      </div>
                                      <button
                                        onClick={() => {
                                          handleUpdateTaskCategory(task.id, "None");
                                          setReportInlineEdit(null);
                                        }}
                                        className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                          !task.category || task.category === "None"
                                            ? "bg-indigo-600 text-white"
                                            : isDark
                                              ? "hover:bg-slate-900 text-slate-300"
                                              : "hover:bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        No Category
                                      </button>
                                      {categories.map(cat => (
                                        <button
                                          key={cat}
                                          onClick={() => {
                                            handleUpdateTaskCategory(task.id, cat);
                                            setReportInlineEdit(null);
                                          }}
                                          className={`text-left px-2 py-1 text-[11px] font-medium rounded-lg cursor-pointer ${
                                            task.category === cat
                                              ? "bg-indigo-600 text-white"
                                              : isDark
                                                ? "hover:bg-slate-900 text-slate-300"
                                                : "hover:bg-slate-100 text-slate-700"
                                          }`}
                                        >
                                          {cat}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  
};

export default TaskReportView;
