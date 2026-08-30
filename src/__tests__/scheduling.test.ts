import { describe, it, expect } from "vitest";
import { scheduleDynamicTasks } from "../components/InteractiveApp";
import { calculateGreedyCascadeSchedule } from "../components/InteractiveAppHelpers";
import { Task } from "../types";

describe("Scheduling Engine Tests", () => {
  it("should return empty list if there are no tasks provided", () => {
    const scheduled = scheduleDynamicTasks([], false, 0, 480);
    expect(scheduled).toEqual([]);
  });

  it("should schedule a locked task at its exact declared time", () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Review Q3 Mobile Frameworks",
        date: "2024-06-18",
        time: "09:00",
        duration: "45 min",
        isLocked: true,
        completed: false,
        priority: "high"
      }
    ];

    const scheduled = scheduleDynamicTasks(mockTasks, false, 540, 540); // Day starts at 9:00 AM (540 mins)
    expect(scheduled.length).toBe(1);
    expect(scheduled[0].computedTime).toBe("09:00");
  });

  it("should schedule a flexible task around a locked task to avoid overlaps", () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Review Q3 Mobile Frameworks",
        date: "2024-06-18",
        time: "09:00",
        duration: "45 min",
        isLocked: true,
        completed: false,
        priority: "high"
      },
      {
        id: "task-2",
        title: "Submit Daily Simulator feedback",
        date: "2024-06-18",
        time: "09:00",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "medium"
      }
    ];

    // Day starts at 9:00 AM (540 mins)
    const scheduled = scheduleDynamicTasks(mockTasks, false, 540, 540);
    
    expect(scheduled.length).toBe(2);
    
    const s1 = scheduled.find(t => t.id === "task-1")!;
    const s2 = scheduled.find(t => t.id === "task-2")!;
    
    expect(s1.computedTime).toBe("09:00");
    // Since task-1 is locked at 09:00 and lasts 45 minutes, task-2 should be pushed to 09:45
    expect(s2.computedTime).toBe("09:45");
  });

  it("should respect travelBefore buffer times on locked tasks and push flexible tasks further back", () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Review Q3 Mobile Frameworks",
        date: "2024-06-18",
        time: "09:00",
        duration: "45 min",
        isLocked: true,
        travelBefore: 15, // buffer of 15 min starts at 8:45
        completed: false,
        priority: "high"
      },
      {
        id: "task-2",
        title: "Submit Daily Simulator feedback",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "low"
      }
    ];

    // Day starts at 8:30 AM (510 mins)
    const scheduled = scheduleDynamicTasks(mockTasks, false, 510, 510);
    
    const s1 = scheduled.find(t => t.id === "task-1")!;
    const s2 = scheduled.find(t => t.id === "task-2")!;
    
    expect(s1.computedTime).toBe("09:00");
    expect(s2.computedTime).toBe("09:45");
  });

  it("should order flexible scheduling by priority (high priority gets earlier spots)", () => {
    const mockTasks: Task[] = [
      {
        id: "task-low",
        title: "Low Priority Task",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "low"
      },
      {
        id: "task-high",
        title: "High Priority Task",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "high"
      }
    ];

    // Day starts at 9:00 AM (540 mins)
    const scheduled = scheduleDynamicTasks(mockTasks, false, 540, 540);
    
    const sHigh = scheduled.find(t => t.id === "task-high")!;
    const sLow = scheduled.find(t => t.id === "task-low")!;
    
    // High priority gets 9:00 AM
    expect(sHigh.computedTime).toBe("09:00");
    // Low priority gets scheduled after 30 min high-priority task, i.e., 9:30 AM
    expect(sLow.computedTime).toBe("09:30");
  });

  it("should greedily pack flexible tasks upwards into empty spaces when a task is dragged", () => {
    const mockTasks: Task[] = [
      {
        id: "dragged-task",
        title: "Newly Dragged Flexible Task",
        date: "2024-06-18",
        time: "09:00",
        duration: "60 min",
        isLocked: false,
        completed: false,
        priority: "high"
      },
      {
        id: "other-task-1",
        title: "Other Flexible Task 1",
        date: "2024-06-18",
        time: "10:00",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "medium"
      }
    ];

    // Dragged task is moved to 14:00 (2:00 PM)
    // Day starts at 9:00 AM (540 mins)
    const result = calculateGreedyCascadeSchedule(
      "dragged-task",
      "14:00",
      "2024-06-18",
      mockTasks,
      24,
      100,
      540 // dayStartMinutes = 9:00 AM
    );

    const draggedPlacement = result.placements["dragged-task"];
    const otherPlacement = result.placements["other-task-1"];

    // Dragged task is placed at 14:00
    expect(draggedPlacement.prospectiveTimeStr).toBe("14:00");
    // Other task greedily moves upwards to 09:00 to fill the newly opened space
    expect(otherPlacement.prospectiveTimeStr).toBe("09:00");
  });

  it("should cascade flexible tasks downwards when dragged into a collision with existing cards", () => {
    const mockTasks: Task[] = [
      {
        id: "dragged-task",
        title: "Dragged Task",
        date: "2024-06-18",
        time: "14:00",
        duration: "60 min",
        isLocked: false,
        completed: false,
        priority: "medium"
      },
      {
        id: "existing-task",
        title: "Existing Task",
        date: "2024-06-18",
        time: "10:00",
        duration: "60 min",
        isLocked: false,
        completed: false,
        priority: "high",
        order: 1
      }
    ];

    // Drag dragged-task right to 09:00 AM (540 mins)
    const result = calculateGreedyCascadeSchedule(
      "dragged-task",
      "09:00",
      "2024-06-18",
      mockTasks,
      24,
      100,
      540
    );

    const pDragged = result.placements["dragged-task"];
    const pExisting = result.placements["existing-task"];

    expect(pDragged.prospectiveTimeStr).toBe("09:00");
    // Existing task starts at 10:00 immediately following the 60min dragged task
    expect(pExisting.prospectiveTimeStr).toBe("10:00");
  });

  it("should schedule flexible tasks starting at current time and greedy fill empty space above if evening is full", () => {
    const mockTasks: Task[] = [
      {
        id: "task-now-1",
        title: "Evening Sprint 1",
        date: "2024-06-18",
        time: "",
        duration: "60 min",
        isLocked: false,
        completed: false,
        priority: "high",
        order: 1
      },
      {
        id: "task-now-2",
        title: "Evening Sprint 2",
        date: "2024-06-18",
        time: "",
        duration: "60 min",
        isLocked: false,
        completed: false,
        priority: "high",
        order: 2
      },
      {
        id: "task-overflow-candidate",
        title: "Task that would exceed midnight if only seeking downwards",
        date: "2024-06-18",
        time: "",
        duration: "60 min",
        isLocked: false,
        completed: false,
        priority: "medium",
        order: 3
      }
    ];

    // Current time is 22:30 (1350 mins), day starts at 08:00 (480 mins)
    // Task 1 gets 22:30 (1350 - 1410)
    // Task 2 cannot fit between 23:30 and 24:00 (needs 60 min, only 30 min left), so it greedy fills space above at 08:00
    // Task 3 greedy fills space above at 09:00
    const scheduled = scheduleDynamicTasks(mockTasks, true, 1350, 480);

    const s1 = scheduled.find(t => t.id === "task-now-1")!;
    const s2 = scheduled.find(t => t.id === "task-now-2")!;
    const s3 = scheduled.find(t => t.id === "task-overflow-candidate")!;

    expect(s1.computedTime).toBe("22:30");
    expect(s2.computedTime).toBe("08:00");
    expect(s3.computedTime).toBe("09:00");
  });

  it("should cascade downwards starting at current time according to priority and arrangement", () => {
    const mockTasks: Task[] = [
      {
        id: "task-med",
        title: "Medium Priority Task 1",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "medium",
        order: 2
      },
      {
        id: "task-high",
        title: "High Priority Task 1",
        date: "2024-06-18",
        time: "",
        duration: "45 min",
        isLocked: false,
        completed: false,
        priority: "high",
        order: 1
      },
      {
        id: "task-low",
        title: "Low Priority Task 1",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "low",
        order: 3
      }
    ];

    // Current time is 14:00 (840 mins), day start 08:00 (480 mins)
    const scheduled = scheduleDynamicTasks(mockTasks, true, 840, 480);

    const sHigh = scheduled.find(t => t.id === "task-high")!;
    const sMed = scheduled.find(t => t.id === "task-med")!;
    const sLow = scheduled.find(t => t.id === "task-low")!;

    expect(sHigh.computedTime).toBe("14:00");
    expect(sMed.computedTime).toBe("14:45");
    expect(sLow.computedTime).toBe("15:15");
  });
});
