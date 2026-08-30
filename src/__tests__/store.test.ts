import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../store";

describe("AppState (Zustand) Store", () => {
  beforeEach(() => {
    // Reset state before each test
    const { resetDragState, setViewMode, setDeckTab, setDeckSearchQuery, setSelectedTaskForTap } = useAppStore.getState();
    resetDragState();
    setViewMode("deck");
    setDeckTab("active");
    setDeckSearchQuery("");
    setSelectedTaskForTap(null);
  });

  it("should have correct initial state defaults", () => {
    const state = useAppStore.getState();
    expect(state.draggedTaskId).toBeNull();
    expect(state.dragOverTime).toBeNull();
    expect(state.timelineDragId).toBeNull();
    expect(state.viewMode).toBe("deck");
    expect(state.deckTab).toBe("active");
    expect(state.deckSearchQuery).toBe("");
    expect(state.selectedTaskForTap).toBeNull();
  });

  it("should update dragged Task Id correctly", () => {
    const { setDraggedTaskId } = useAppStore.getState();
    setDraggedTaskId("task-abc-123");
    
    expect(useAppStore.getState().draggedTaskId).toBe("task-abc-123");
  });

  it("should update and cycle view mode", () => {
    const { setViewMode } = useAppStore.getState();
    
    setViewMode("timeline");
    expect(useAppStore.getState().viewMode).toBe("timeline");
    setViewMode("focus");
    expect(useAppStore.getState().viewMode).toBe("focus");
  });

  it("should update deck search queries and selected tab categories", () => {
    const { setDeckSearchQuery, setDeckTab } = useAppStore.getState();
    
    setDeckSearchQuery("Mobile Development Review");
    expect(useAppStore.getState().deckSearchQuery).toBe("Mobile Development Review");
    setDeckTab("backlog");
    expect(useAppStore.getState().deckTab).toBe("backlog");
  });

  it("should reset all drag and drop related state attributes together with resetDragState", () => {
    const store = useAppStore.getState();
    
    // Set dummy dirty drag states
    store.setDraggedTaskId("dummy-id");
    store.setDragOverTime("11:30");
    store.setTimelineDragId("timeline-id");
    store.setTimelineDragY(120);
    store.setTimelineDragOffset(15);
    store.setTimelineDragWidth(250);
    store.setTimelineDragLeft(50);

    // Verify they are set
    let activeState = useAppStore.getState();
    expect(activeState.draggedTaskId).toBe("dummy-id");
    expect(activeState.dragOverTime).toBe("11:30");
    expect(activeState.timelineDragId).toBe("timeline-id");
    expect(activeState.timelineDragY).toBe(120);

    // Reset drag states
    activeState.resetDragState();

    // Verify completely clean
    const postResetState = useAppStore.getState();
    expect(postResetState.draggedTaskId).toBeNull();
    expect(postResetState.dragOverTime).toBeNull();
    expect(postResetState.timelineDragId).toBeNull();
    expect(postResetState.timelineDragY).toBe(0);
    expect(postResetState.timelineDragOffset).toBe(0);
    expect(postResetState.timelineDragWidth).toBe(0);
    expect(postResetState.timelineDragLeft).toBe(0);
  });

  it("should toggle enableTimeStretch state and persist to store", () => {
    const { setEnableTimeStretch } = useAppStore.getState();
    expect(useAppStore.getState().enableTimeStretch).toBe(true);
    setEnableTimeStretch(false);
    expect(useAppStore.getState().enableTimeStretch).toBe(false);
    setEnableTimeStretch(true);
    expect(useAppStore.getState().enableTimeStretch).toBe(true);
  });
});
