import { jsPDF } from "jspdf";
import { Task, Routine } from "../types";
import { SavedAIPlan } from "./aiPlanGenerator";

export interface PDFGroup {
  label: string;
  tasks: Task[];
}

/**
 * Pure function to trigger JSON file download in browser environments.
 */
export function exportBackupJSON(backupObj: any, filename: string): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
  if (typeof window !== "undefined") {
    const downloadAnchor = window.document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    window.document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

/**
 * Pure function to validate and parse backup JSON text.
 */
export function parseBackupJSON(jsonStr: string): any {
  const data = JSON.parse(jsonStr);
  if (data && data.version === "taskpass_v1") {
    return data;
  }
  throw new Error("Invalid backup JSON format!");
}

/**
 * Pure PDF export for notes repository dispatch summaries.
 */
export function exportNotesPDF(
  grouped: { [key: string]: any[] },
  notesGroupBy: string,
  notesSearchQuery: string,
  totalNotesCount: number,
  tasks: Task[],
  routines: Routine[]
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  const groupKeys = Object.keys(grouped).sort();

  // Design layout configurations
  const pageHeight = 841.89;
  const pageWidth = 595.28;
  const leftMargin = 40;
  const rightMargin = 40;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let y = 50;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = 50;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(leftMargin, 30, pageWidth - rightMargin, 30);
      
      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("TaskPass Notes Repository Dispatch Summary (Continued)", leftMargin, 24);
    }
  };

  // 1. Draw PDF Header block
  doc.setFillColor(79, 70, 229);
  doc.rect(leftMargin, y, contentWidth, 40, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("TASKPASS NOTES REPOSITORY SUMMARY", leftMargin + 15, y + 24);
  y += 55;

  // 2. Metadata block
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  
  doc.text(`Generated On: ${new Date().toLocaleString()}`, leftMargin, y);
  doc.text(`Grouping Filter: ${notesGroupBy.toUpperCase()}`, leftMargin + 250, y);
  y += 15;
  doc.text(`Total Exported Notes: ${totalNotesCount}`, leftMargin, y);
  if (notesSearchQuery.trim()) {
    doc.text(`Search Keyword: "${notesSearchQuery}"`, leftMargin + 250, y);
  }
  y += 18;

  doc.setDrawColor(199, 210, 254);
  doc.setLineWidth(1.5);
  doc.line(leftMargin, y, pageWidth - rightMargin, y);
  y += 20;

  // 3. Render Notes loop
  if (totalNotesCount === 0) {
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("No notes found matching the selected filters.", leftMargin, y);
  } else {
    groupKeys.forEach(groupKey => {
      const notesInGroup = grouped[groupKey];
      
      checkPageBreak(35);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229);
      doc.text(`${groupKey.toUpperCase()} (${notesInGroup.length} items)`, leftMargin, y);
      y += 12;
      
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(1);
      doc.line(leftMargin, y, pageWidth - rightMargin, y);
      y += 10;

      notesInGroup.forEach((note) => {
        const rawText = note.rawText || "";
        const splitLines = doc.splitTextToSize(rawText, contentWidth - 20) as string[];
        const noteTextHeight = splitLines.length * 15;

        let badges: string[] = [];
        if (note.project && note.project !== "General") badges.push(`Proj: ${note.project}`);
        if (note.collaborator && note.collaborator !== "None") badges.push(`With: ${note.collaborator}`);
        if (note.location) badges.push(`Loc: ${note.location}`);
        if (note.time) badges.push(`Time: ${note.time}`);
        
        let linkedTaskName = "";
        if (note.associatedTaskId) {
          const lt = tasks.find(t => t.id === note.associatedTaskId);
          if (lt) linkedTaskName = `Linked Task: ${lt.title}`;
        }
        let linkedRoutineName = "";
        if (note.associatedRoutineId) {
          const lr = routines.find(r => r.id === note.associatedRoutineId);
          if (lr) linkedRoutineName = `Routine: ${lr.name}`;
        }

        const hasBadges = badges.length > 0 || linkedTaskName || linkedRoutineName;
        const totalNoteBlockHeight = noteTextHeight + (hasBadges ? 28 : 10) + 12;

        checkPageBreak(totalNoteBlockHeight + 10);

        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.8);
        doc.roundedRect(leftMargin, y, contentWidth, totalNoteBlockHeight, 4, 4, "F");
        doc.roundedRect(leftMargin, y, contentWidth, totalNoteBlockHeight, 4, 4, "D");

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);

        let textY = y + 14;
        splitLines.forEach(lineText => {
          doc.text(lineText, leftMargin + 10, textY);
          textY += 15;
        });

        if (hasBadges) {
          textY += 3;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          
          let labelParts: string[] = [];
          if (badges.length > 0) {
            labelParts.push(badges.join(" | "));
          }
          if (linkedTaskName) {
            labelParts.push(linkedTaskName);
          }
          if (linkedRoutineName) {
            labelParts.push(linkedRoutineName);
          }

          doc.text(labelParts.join(" • "), leftMargin + 10, textY);
        }

        doc.setFont("Helvetica", "oblique");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        const timeStr = new Date(note.createdAt).toLocaleDateString() + " " + new Date(note.createdAt).toLocaleTimeString();
        doc.text(timeStr, leftMargin + contentWidth - doc.getTextWidth(timeStr) - 10, textY);

        y += totalNoteBlockHeight + 12;
      });

      y += 8;
    });
  }

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 20, { align: "center" });
  }

  doc.save(`TaskPass_Notes_${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Pure PDF export for workspace task reports.
 */
export function exportWorkspacePDF(
  incTasksGrouped: PDFGroup[],
  compTasksGrouped: PDFGroup[],
  filtersAppliedText: string,
  triggerSuccessHaptic?: () => void
): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text("WORKSPACE TASK REPORT", 14, y);
  y += 10;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(filtersAppliedText, 14, y);
  y += 12;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 10;

  const renderTasksInPdf = (title: string, groups: PDFGroup[]) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, y);
    y += 8;

    const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0);

    if (totalTasks === 0) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("No tasks match these filters.", 14, y);
      y += 12;
      return;
    }

    groups.forEach(group => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (group.label) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(79, 70, 229);
        doc.text(group.label, 14, y);
        y += 6;
      }

      group.tasks.forEach(task => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        
        const statusBox = task.completed ? "[X]" : "[ ]";
        const taskTitle = task.title || "Untitled Task";
        const collaboratorVal = task.collaborator && task.collaborator !== "None" ? task.collaborator : "";
        const locationVal = task.location || "";
        
        let desc = `${statusBox} ${taskTitle}`;
        const secondaryParts = [];
        if (collaboratorVal) secondaryParts.push(collaboratorVal);
        if (locationVal) secondaryParts.push(locationVal);
        if (task.date) secondaryParts.push(task.date);
        
        if (secondaryParts.length > 0) {
          desc += `  (${secondaryParts.join(" | ")})`;
        }

        const maxChars = 85;
        if (desc.length > maxChars) {
          desc = desc.substring(0, maxChars) + "...";
        }

        doc.text(desc, 18, y);
        y += 6.5;
      });

      y += 4;
    });

    y += 6;
  };

  renderTasksInPdf("INCOMPLETE TASKS", incTasksGrouped);
  renderTasksInPdf("COMPLETED TASKS", compTasksGrouped);

  doc.save("workspace_task_report.pdf");
  if (triggerSuccessHaptic) {
    triggerSuccessHaptic();
  }
}

/**
 * Pure PDF export for Science-Backed AI Plans.
 */
export function exportAIPlanPDF(plan: SavedAIPlan): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  const pageHeight = 841.89;
  const pageWidth = 595.28;
  const leftMargin = 40;
  const rightMargin = 40;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let y = 45;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 45) {
      doc.addPage();
      y = 45;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(leftMargin, 30, pageWidth - rightMargin, 30);
      
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Science-Backed Neuro-Cognitive Plan (Continued)", leftMargin, 24);
    }
  };

  // Header Banner
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(leftMargin, y, contentWidth, 42, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("SCIENCE-BACKED NEURO-COGNITIVE PLAN", leftMargin + 15, y + 26);
  y += 58;

  // Title & Metadata
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(plan.title || "Neuro-Cognitive Master Plan", leftMargin, y);
  y += 18;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Created: ${new Date(plan.createdAt).toLocaleString()}  |  Time Window: ${plan.timeAvailable || 'Adaptive'}`, leftMargin, y);
  y += 14;
  if (plan.constraints) {
    doc.text(`Constraints/Preferences: ${plan.constraints}`, leftMargin, y);
    y += 14;
  }

  y += 10;
  checkPageBreak(80);

  // Summary Card Block
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, y, contentWidth, 75, 6, 6, "FD");

  let sumY = y + 16;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text(`SCHEDULE: ${plan.result?.summary?.scheduleType || 'Ultradian Schedule'} (${plan.result?.summary?.ultradianCycles || 1} Cycles)`, leftMargin + 12, sumY);
  sumY += 14;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Fasting Protocol: ${plan.result?.summary?.fastingProtocol || 'Standard'}`, leftMargin + 12, sumY);
  sumY += 12;
  doc.text(`Fueling Strategy: ${plan.result?.summary?.macronutrientStrategy || 'Balanced'}`, leftMargin + 12, sumY);
  sumY += 12;
  doc.text(`Neuro Protocol: ${plan.result?.summary?.neuroProtocol || 'Standard'}`, leftMargin + 12, sumY);

  y += 90;

  // Overview
  if (plan.result?.summary?.scienceOverview) {
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const overviewLines = doc.splitTextToSize(plan.result.summary.scienceOverview, contentWidth);
    doc.text(overviewLines, leftMargin, y);
    y += overviewLines.length * 11 + 15;
  }

  // Task Breakdown Section
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text("DEPLOYMENT STEPS & NEUROBIOLOGY RATIONALE", leftMargin, y);
  y += 15;

  if (plan.result?.tasks) {
    plan.result.tasks.forEach((task, tIdx) => {
      checkPageBreak(90);

      // Task Header Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(leftMargin, y, contentWidth, 24, 4, 4, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${tIdx + 1}. ${task.title} (${task.time} • ${task.duration})`, leftMargin + 10, y + 15);
      y += 32;

      // Science Note
      if (task.scienceNote) {
        checkPageBreak(30);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(79, 70, 229);
        doc.text("Science & Physiology:", leftMargin + 10, y);
        y += 11;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const sciLines = doc.splitTextToSize(task.scienceNote, contentWidth - 20);
        doc.text(sciLines, leftMargin + 10, y);
        y += sciLines.length * 10.5 + 8;
      }

      // Subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach((st) => {
          checkPageBreak(25);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(`• ${st.title}`, leftMargin + 15, y);
          y += 10;

          if (st.scienceNote) {
            doc.setFont("Helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            const stSciLines = doc.splitTextToSize(`  Note: ${st.scienceNote}`, contentWidth - 30);
            doc.text(stSciLines, leftMargin + 20, y);
            y += stSciLines.length * 9.5 + 4;
          }
        });
        y += 6;
      }

      y += 10;
    });
  }

  doc.save(`${(plan.title || "AI_Plan").replace(/[^a-z0-9]/gi, "_")}_ScienceReport.pdf`);
}
