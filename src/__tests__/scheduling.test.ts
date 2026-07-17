import { describe, it, expect } from "vitest";
import { scheduleDynamicTasks } from "../components/InteractiveApp";
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
        time: "09:00", // Would overlap if both started at 9
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "medium"
      }
    ];

    // Day starts at 9:00 AM (540 mins)
    const scheduled = scheduleDynamicTasks(mockTasks, false, 540, 540);
    
    // Both should be scheduled
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
    
    // task-1 is locked at 9:00 but has 15 mins travelBefore buffer, meaning 8:45 to 9:00 is occupied.
    // Dur is 45 min, so task-1 goes until 09:45.
    // If we try to schedule task-2 starting at 8:30 with 30 min duration:
    // It's 8:30 to 9:00, which conflicts with task-1's buffer starting at 8:45.
    // Thus, task-2 should be scheduled after task-1 finishes, which is 09:45 (or before 8:45 if the gap was big enough, here 15 mins gap isn't enough for 30 min task).
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
});
