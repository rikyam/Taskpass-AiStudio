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
    // Task 2 cascades forward to 23:30
    // Task 3 cascades forward after Task 2
    const scheduled = scheduleDynamicTasks(mockTasks, true, 1350, 480);

    const s1 = scheduled.find(t => t.id === "task-now-1")!;
    const s2 = scheduled.find(t => t.id === "task-now-2")!;
    const s3 = scheduled.find(t => t.id === "task-overflow-candidate")!;

    expect(s1.computedTime).toBe("22:30");
    expect(s2.computedTime).toBe("23:30");
    expect(s3.computedTime).toBe("24:30");
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

  it("should schedule flexible tasks starting at current time before 10am and move dynamically as current time changes", () => {
    const mockTasks: Task[] = [
      {
        id: "task-high",
        title: "Morning Standup",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "high",
        order: 1
      },
      {
        id: "task-med",
        title: "Design Review",
        date: "2024-06-18",
        time: "",
        duration: "45 min",
        isLocked: false,
        completed: false,
        priority: "medium",
        order: 2
      }
    ];

    // Case A: Day start is 07:30 AM (450 mins), current time is 07:00 AM (420 mins)
    // Flexible tasks MUST respect day start hour (07:30 AM)
    const scheduled730 = scheduleDynamicTasks(mockTasks, true, 420, 450);
    const sHigh730 = scheduled730.find(t => t.id === "task-high")!;
    const sMed730 = scheduled730.find(t => t.id === "task-med")!;
    expect(sHigh730.computedTime).toBe("07:30");
    expect(sMed730.computedTime).toBe("08:00");

    // Case B: Time advances past day start to 08:15 AM (495 mins) with day start 07:30 AM
    // Flexible tasks move dynamically with current time
    const scheduled815 = scheduleDynamicTasks(mockTasks, true, 495, 450);
    const sHigh815 = scheduled815.find(t => t.id === "task-high")!;
    const sMed815 = scheduled815.find(t => t.id === "task-med")!;
    expect(sHigh815.computedTime).toBe("08:15");
    expect(sMed815.computedTime).toBe("08:45");

    // Case C: Time advances to 09:30 AM (570 mins)
    const scheduled930 = scheduleDynamicTasks(mockTasks, true, 570, 450);
    const sHigh930 = scheduled930.find(t => t.id === "task-high")!;
    const sMed930 = scheduled930.find(t => t.id === "task-med")!;
    expect(sHigh930.computedTime).toBe("09:30");
    expect(sMed930.computedTime).toBe("10:00");
  });

  it("should cascade flexible tasks forward from dayStartMinutes on other dates or starting at current time on Today", () => {
    const mockTasks: Task[] = [
      {
        id: "locked-morning",
        title: "Morning Workshop",
        date: "2024-06-18",
        time: "08:00",
        duration: "120 min", // 08:00 to 10:00 blocked
        isLocked: true,
        completed: false,
        priority: "high"
      },
      {
        id: "task-flex-1",
        title: "Midday Work",
        date: "2024-06-18",
        time: "",
        duration: "60 min",
        isLocked: false,
        completed: false,
        priority: "high",
        order: 1
      }
    ];

    // On non-today date: Task cascades forward after morning locked task starting at 10:00
    const scheduledOtherDay = scheduleDynamicTasks(mockTasks, false, 0, 480);
    const flexOther = scheduledOtherDay.find(t => t.id === "task-flex-1")!;
    expect(flexOther.computedTime).toBe("10:00");

    // On Today at 14:00 (840 mins): Task starts at current time 14:00 and cascades forward
    const scheduledToday = scheduleDynamicTasks(mockTasks, true, 840, 480);
    const flexToday = scheduledToday.find(t => t.id === "task-flex-1")!;
    expect(flexToday.computedTime).toBe("14:00");
  });

  it("should keep locked tasks fixed in time and ripple cascading flexible tasks around them chronologically", () => {
    const mockTasks: Task[] = [
      {
        id: "locked-meeting-1",
        title: "Team Standup",
        date: "2024-06-18",
        time: "10:00",
        duration: "60 min", // 10:00 - 11:00
        isLocked: true,
        completed: false,
        priority: "high"
      },
      {
        id: "locked-meeting-2",
        title: "Client Presentation",
        date: "2024-06-18",
        time: "13:00",
        duration: "60 min", // 13:00 - 14:00
        isLocked: true,
        completed: false,
        priority: "high"
      },
      {
        id: "flex-task-1",
        title: "Urgent Hotfix",
        date: "2024-06-18",
        time: "",
        duration: "30 min", // 09:00 - 09:30 (fits before 10:00 meeting)
        isLocked: false,
        completed: false,
        priority: "high",
        order: 1
      },
      {
        id: "flex-task-2",
        title: "Feature Architecture Review",
        date: "2024-06-18",
        time: "",
        duration: "45 min", // starts at 09:30, cannot fit before 10:00! Ripples around to 11:00 (11:00 - 11:45)
        isLocked: false,
        completed: false,
        priority: "high",
        order: 2
      },
      {
        id: "flex-task-3",
        title: "Documentation Update",
        date: "2024-06-18",
        time: "",
        duration: "30 min", // 11:45 - 12:15 (fits between 11:45 and 13:00 meeting)
        isLocked: false,
        completed: false,
        priority: "medium",
        order: 3
      },
      {
        id: "flex-task-4",
        title: "Deep Work Sprint",
        date: "2024-06-18",
        time: "",
        duration: "60 min", // starts at 12:15, only 45m before 13:00! Ripples around to 14:00 (14:00 - 15:00)
        isLocked: false,
        completed: false,
        priority: "low",
        order: 4
      }
    ];

    // Current time is 09:00 (540 mins), day start 08:00 (480 mins)
    const scheduled = scheduleDynamicTasks(mockTasks, true, 540, 480);

    const sLocked1 = scheduled.find(t => t.id === "locked-meeting-1")!;
    const sLocked2 = scheduled.find(t => t.id === "locked-meeting-2")!;
    const sFlex1 = scheduled.find(t => t.id === "flex-task-1")!;
    const sFlex2 = scheduled.find(t => t.id === "flex-task-2")!;
    const sFlex3 = scheduled.find(t => t.id === "flex-task-3")!;
    const sFlex4 = scheduled.find(t => t.id === "flex-task-4")!;

    // 1. Locked tasks MUST remain locked at their exact designated times
    expect(sLocked1.computedTime).toBe("10:00");
    expect(sLocked2.computedTime).toBe("13:00");

    // 2. Flexible tasks ripple seamlessly around the locked tasks:
    expect(sFlex1.computedTime).toBe("09:00"); // Fits in 09:00 - 09:30
    expect(sFlex2.computedTime).toBe("11:00"); // 45m does not fit in 09:30-10:00 gap, ripples around 10:00 meeting to 11:00
    expect(sFlex3.computedTime).toBe("09:30"); // 30m greedily fills the 09:30 - 10:00 empty gap before 10:00 meeting!
    expect(sFlex4.computedTime).toBe("11:45"); // 60m fits in 11:45 - 12:45 before 13:00 meeting

    // 3. The unified list is returned in chronological order on the timeline
    expect(scheduled.map(t => t.id)).toEqual([
      "flex-task-1",
      "flex-task-3",
      "locked-meeting-1",
      "flex-task-2",
      "flex-task-4",
      "locked-meeting-2"
    ]);
  });

  it("should strictly schedule flexible tasks starting at current time and cascade forward on Today", () => {
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Task 1",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "high",
        order: 1
      },
      {
        id: "task-2",
        title: "Task 2",
        date: "2024-06-18",
        time: "",
        duration: "30 min",
        isLocked: false,
        completed: false,
        priority: "medium",
        order: 2
      },
      {
        id: "locked-midday",
        title: "Team Lunch",
        date: "2024-06-18",
        time: "12:00",
        duration: "60 min",
        isLocked: true,
        completed: false,
        priority: "high"
      }
    ];

    // Current time is 11:15 AM (675 mins), day starts at 08:00 AM (480 mins)
    const scheduled = scheduleDynamicTasks(mockTasks, true, 675, 480);

    const s1 = scheduled.find(t => t.id === "task-1")!;
    const s2 = scheduled.find(t => t.id === "task-2")!;
    const sLocked = scheduled.find(t => t.id === "locked-midday")!;

    // Locked task stays at 12:00
    expect(sLocked.computedTime).toBe("12:00");

    // Flexible tasks MUST schedule starting at current time (11:15), NOT at dayStart (08:00)
    expect(s1.computedTime).toBe("11:15"); // 11:15 - 11:45 (fits before 12:00 lunch)
    expect(s2.computedTime).toBe("13:00"); // 30m cannot fit in 11:45-12:00 (15m gap), ripples around lunch to 13:00
  });

  it("should support snapIncrement = 0 (turn snap off for flexible tasks)", () => {
    const mockTasks: Task[] = [
      {
        id: "locked-1",
        title: "Exact Locked Meeting",
        date: "2024-06-18",
        time: "09:03",
        duration: "17 min", // ends at 09:20
        isLocked: true,
        completed: false
      },
      {
        id: "flex-1",
        title: "Flexible Task 1",
        date: "2024-06-18",
        time: "",
        duration: "23 min",
        isLocked: false,
        completed: false,
        order: 1
      },
      {
        id: "flex-2",
        title: "Flexible Task 2",
        date: "2024-06-18",
        time: "",
        duration: "15 min",
        isLocked: false,
        completed: false,
        order: 2
      }
    ];

    // Day starts at 09:00, snapIncrement = 0 (snap off / exact minute)
    const scheduled = scheduleDynamicTasks(mockTasks, false, 0, 540, 0);

    const sLocked = scheduled.find(t => t.id === "locked-1")!;
    const s1 = scheduled.find(t => t.id === "flex-1")!;
    const s2 = scheduled.find(t => t.id === "flex-2")!;

    expect(sLocked.computedTime).toBe("09:03");
    // Flex 1 cannot fit in 09:00 - 09:03 (only 3 min), so it schedules immediately after locked-1 at 09:20 without rounding to 5-min intervals
    expect(s1.computedTime).toBe("09:20");
    // Flex 2 schedules right after flex-1 (09:20 + 23m = 09:43) without rounding to 09:45
    expect(s2.computedTime).toBe("09:43");
  });

  it("should adjust flexible task placement when day start hour changes", () => {
    const mockTasks: Task[] = [
      {
        id: "flex-1",
        title: "Morning Routine Task",
        date: "2024-06-18",
        time: "",
        duration: "60 min",
        isLocked: false,
        completed: false
      }
    ];

    // Day starts at 07:00 AM (420 mins)
    const scheduled7am = scheduleDynamicTasks(mockTasks, false, 0, 420, 5);
    expect(scheduled7am[0].computedTime).toBe("07:00");

    // User changes Day Start Hour to 09:30 AM (570 mins)
    const scheduled930am = scheduleDynamicTasks(mockTasks, false, 0, 570, 5);
    expect(scheduled930am[0].computedTime).toBe("09:30");

    // User changes Day Start Hour to 11:00 AM (660 mins)
    const scheduled11am = scheduleDynamicTasks(mockTasks, false, 0, 660, 5);
    expect(scheduled11am[0].computedTime).toBe("11:00");
  });

  it("should allow tasks to cascade past 11:59 PM into late-night overflow up to 6:00 AM", () => {
    const mockTasks: Task[] = [
      {
        id: "locked-night",
        title: "Late Night Event",
        date: "2024-06-18",
        time: "23:00",
        duration: "90 min", // 23:00 to 00:30 (1380 to 1470)
        isLocked: true,
        completed: false
      },
      {
        id: "flex-late",
        title: "After-Hours Wrap Up",
        date: "2024-06-18",
        time: "",
        duration: "60 min",
        isLocked: false,
        completed: false
      }
    ];

    // Starts at 23:00 (1380)
    const scheduled = scheduleDynamicTasks(mockTasks, false, 0, 1380, 5);
    const sLocked = scheduled.find(t => t.id === "locked-night")!;
    const sFlex = scheduled.find(t => t.id === "flex-late")!;

    expect(sLocked.computedTime).toBe("23:00");
    // Flex task schedules immediately after locked night task ends at 00:30 (+1d = 24:30)
    expect(sFlex.computedTime).toBe("24:30");
  });
});
