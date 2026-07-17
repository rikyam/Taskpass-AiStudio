import { describe, expect, it, beforeEach } from "vitest";
import { useAppStore } from "../store";

describe("Drag and Drop Interaction Testing", () => {
  beforeEach(() => {
    useAppStore.getState().resetDragState();
  });

  it("should capture dragStart correctly by storing the active task ID", () => {
    const store = useAppStore.getState();
    expect(store.draggedTaskId).toBeNull();

    // User starts dragging "task-xyz"
    store.setDraggedTaskId("task-xyz");
    expect(useAppStore.getState().draggedTaskId).toBe("task-xyz");
  });

  it("should update the dragOverTime when hovering over a specific agenda timeline slot", () => {
    const store = useAppStore.getState();
    expect(store.dragOverTime).toBeNull();

    // User hovers drag target over 10:15
    store.setDragOverTime("10:15");
    expect(useAppStore.getState().dragOverTime).toBe("10:15");
  });

  it("should update timeline vertical drag states for precise timeline resizing/sliding", () => {
    const store = useAppStore.getState();
    
    store.setTimelineDragId("task-timeline-idx");
    store.setTimelineDragY(140);
    store.setTimelineDragOffset(20);
    store.setTimelineDragWidth(320);
    store.setTimelineDragLeft(12);

    const state = useAppStore.getState();
    expect(state.timelineDragId).toBe("task-timeline-idx");
    expect(state.timelineDragY).toBe(140);
    expect(state.timelineDragOffset).toBe(20);
    expect(state.timelineDragWidth).toBe(320);
    expect(state.timelineDragLeft).toBe(12);
  });

  it("should completely clear drag identifiers and hover points upon interaction completion (dragEnd or drop)", () => {
    const store = useAppStore.getState();
    
    // Setup busy drag indicators
    store.setDraggedTaskId("active-task-id");
    store.setDragOverTime("14:30");
    store.setTimelineDragId("some-drag-id");

    expect(useAppStore.getState().draggedTaskId).toBe("active-task-id");
    expect(useAppStore.getState().dragOverTime).toBe("14:30");

    // Complete drag drop (resets indicators)
    store.resetDragState();

    const clearedState = useAppStore.getState();
    expect(clearedState.draggedTaskId).toBeNull();
    expect(clearedState.dragOverTime).toBeNull();
    expect(clearedState.timelineDragId).toBeNull();
  });
});
