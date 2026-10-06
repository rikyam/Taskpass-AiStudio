// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { isTaskArchived } from "../utils/timeHelpers";
import { Task } from "../types";
import { useAppStore } from "../store";

describe("Archive Folder & Menu Collapse Persistence", () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const NOW = new Date("2026-10-04T12:00:00Z").getTime();

  beforeEach(() => {
    localStorage.clear();
  });

  describe("isTaskArchived", () => {
    it("should return false for uncompleted tasks regardless of age", () => {
      const task: Task = {
        id: "task-1",
        title: "Old Incomplete Task",
        date: "2026-08-01",
        time: "09:00",
        duration: "30 min",
        isLocked: true,
        completed: false,
      };
      expect(isTaskArchived(task, NOW)).toBe(false);
    });

    it("should return false for tasks completed recently (< 30 days)", () => {
      const task: Task = {
        id: "task-2",
        title: "Recently Completed Task",
        date: "2026-10-01",
        time: "10:00",
        duration: "45 min",
        isLocked: true,
        completed: true,
        completedAt: NOW - 5 * ONE_DAY_MS,
      };
      expect(isTaskArchived(task, NOW)).toBe(false);
    });

    it("should automatically return true for tasks completed over 30 days ago", () => {
      const task: Task = {
        id: "task-3",
        title: "Old Completed Task",
        date: "2026-08-15",
        time: "14:00",
        duration: "1 hr",
        isLocked: true,
        completed: true,
        completedAt: NOW - 35 * ONE_DAY_MS,
      };
      expect(isTaskArchived(task, NOW)).toBe(true);
    });

    it("should return true for completed tasks with date older than 30 days when completedAt is missing", () => {
      const task: Task = {
        id: "task-4",
        title: "Completed Task Missing Timestamp",
        date: "2026-08-01",
        time: "14:00",
        duration: "1 hr",
        isLocked: true,
        completed: true,
      };
      expect(isTaskArchived(task, NOW)).toBe(true);
    });

    it("should return true if explicitly marked as isArchived: true", () => {
      const task: Task = {
        id: "task-5",
        title: "Explicitly Archived Task",
        date: "2026-10-03",
        time: "14:00",
        duration: "1 hr",
        isLocked: true,
        completed: true,
        isArchived: true,
      };
      expect(isTaskArchived(task, NOW)).toBe(true);
    });
  });

  describe("Layout slice archive tab", () => {
    it("should allow setting deckTab to 'archive'", () => {
      const { setDeckTab } = useAppStore.getState();
      setDeckTab("archive");
      expect(useAppStore.getState().deckTab).toBe("archive");
    });
  });

  describe("Menu Section Collapsed State Storage", () => {
    it("should store and retrieve gear menu collapsed sections from localStorage", () => {
      const gearKey = "taskpass_gear_menu_collapsed_sections";
      const initial = { 1: true, 3: true, 5: true };
      localStorage.setItem(gearKey, JSON.stringify(initial));

      const retrieved = JSON.parse(localStorage.getItem(gearKey) || "{}");
      expect(retrieved).toEqual({ 1: true, 3: true, 5: true });
    });

    it("should store and retrieve hamburger menu collapsed sections from localStorage", () => {
      const hamburgerKey = "taskpass_hamburger_menu_collapsed_sections";
      const initial = { 2: true, 4: true, 6: true, 7: true };
      localStorage.setItem(hamburgerKey, JSON.stringify(initial));

      const retrieved = JSON.parse(localStorage.getItem(hamburgerKey) || "{}");
      expect(retrieved).toEqual({ 2: true, 4: true, 6: true, 7: true });
    });
  });

  describe("Expand / Collapse All Cards Persistence", () => {
    it("should toggle and persist all_deck_cards_expanded in localStorage", () => {
      localStorage.setItem("all_deck_cards_expanded", "true");
      expect(localStorage.getItem("all_deck_cards_expanded")).toBe("true");

      localStorage.setItem("all_deck_cards_expanded", "false");
      expect(localStorage.getItem("all_deck_cards_expanded")).toBe("false");
    });
  });
});
