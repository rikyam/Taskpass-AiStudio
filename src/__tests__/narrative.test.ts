import { describe, it, expect } from "vitest";
import { buildNarrativeText } from "../components/InteractiveApp";
import { Task } from "../types";

describe("Narrative Generation Engine", () => {
  it("should generate standard schedule narrative text for basic tasks", () => {
    const currentFocus: Task = {
      id: "task-1",
      title: "Review Q3 Mobile Frameworks",
      date: "2024-06-18",
      time: "09:00",
      duration: "45 min",
      isLocked: true,
      completed: false,
      priority: "high"
    };

    const text = buildNarrativeText(currentFocus, [currentFocus], [currentFocus]);
    expect(text).toContain("You are currently working on Review Q3 Mobile Frameworks");
    expect(text).toContain("scheduled to start at 9:00 AM");
    expect(text).toContain("for a duration of 45 min");
    expect(text).toContain("The priority of this task is set to high");
  });

  it("should append location details when task has a location specified", () => {
    const currentFocus: Task = {
      id: "task-1",
      title: "Review Q3 Mobile Frameworks",
      date: "2024-06-18",
      time: "09:00",
      duration: "45 min",
      isLocked: true,
      completed: false,
      location: "San Francisco HQ"
    };

    const text = buildNarrativeText(currentFocus, [currentFocus], [currentFocus]);
    expect(text).toContain("This activity takes place at San Francisco HQ.");
  });

  it("should handles travel buffers with locations beautifully", () => {
    const currentFocus: Task = {
      id: "task-1",
      title: "Review Q3 Mobile Frameworks",
      date: "2024-06-18",
      time: "09:00",
      duration: "45 min",
      isLocked: true,
      completed: false,
      location: "San Francisco HQ",
      travelBefore: 15
    };

    const text = buildNarrativeText(currentFocus, [currentFocus], [currentFocus]);
    expect(text).toContain("takes place at San Francisco HQ, and you have 15 minutes of buffer time to get there.");
  });

  it("should state buffer preparation without locations if no location specified", () => {
    const currentFocus: Task = {
      id: "task-1",
      title: "Review Q3 Mobile Frameworks",
      date: "2024-06-18",
      time: "09:00",
      duration: "45 min",
      isLocked: true,
      completed: false,
      travelBefore: 10
    };

    const text = buildNarrativeText(currentFocus, [currentFocus], [currentFocus]);
    expect(text).toContain("You have 10 minutes of buffer time to prepare.");
  });

  it("should explain transition with buffers and free times when moving to next tasks", () => {
    const currentFocus: Task = {
      id: "task-1",
      title: "Task One",
      date: "2024-06-18",
      time: "09:00",
      duration: "30 min",
      isLocked: true,
      completed: false,
    };

    const nextTask: Task = {
      id: "task-2",
      title: "Task Two",
      date: "2024-06-18",
      time: "10:30", // 9:00 + 30 min = 9:30. There's 60 min gap!
      duration: "30 min",
      isLocked: true,
      completed: false,
      travelBefore: 10
    };

    // intermediate buffers from queue simulation
    const bufferItem: any = {
      id: "task-2_before",
      parentTaskId: "task-2",
      isBuffer: true,
      bufferType: "before",
      duration: "10 min",
      time: "10:20"
    };

    const focusQueue = [currentFocus, bufferItem, nextTask];
    const tasks = [currentFocus, nextTask];

    const text = buildNarrativeText(currentFocus, tasks, focusQueue);
    expect(text).toContain("Afterward, you will transition to Task Two scheduled at 10:30 AM");
    // Free time calculation: nextTotalStart (10:30 - 10 min buffer = 10:20, in mins: 620) 
    // minus currTotalEnd (9:00 + 30 min = 9:30, in mins: 570) = 50 minutes of free time.
    expect(text).toContain("with 10 minutes of buffer time in between and 50 min of free time");
  });
});
