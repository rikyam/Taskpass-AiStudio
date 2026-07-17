import { describe, it, expect } from "vitest";
import { 
  timeToMinutes, 
  minutesToTimeString, 
  parseDurationToMinutes, 
  formatDuration, 
  formatTime, 
  getPriorityWeight 
} from "../components/InteractiveApp";

describe("Time Utilities", () => {
  describe("timeToMinutes", () => {
    it("should parse standard HH:MM time into total minutes", () => {
      expect(timeToMinutes("09:00")).toBe(540);
      expect(timeToMinutes("12:30")).toBe(750);
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("23:59")).toBe(1439);
    });

    it("should gracefully handle null, undefined, or empty values", () => {
      expect(timeToMinutes(null)).toBe(0);
      expect(timeToMinutes(undefined)).toBe(0);
      expect(timeToMinutes("")).toBe(0);
    });

    it("should handle single digit parts", () => {
      expect(timeToMinutes("9:5")).toBe(545);
    });
  });

  describe("minutesToTimeString", () => {
    it("should format minutes back to HH:MM time string", () => {
      expect(minutesToTimeString(540)).toBe("09:00");
      expect(minutesToTimeString(750)).toBe("12:30");
      expect(minutesToTimeString(0)).toBe("00:00");
    });

    it("should wrap around/normalize negative numbers successfully", () => {
      expect(minutesToTimeString(-10)).toBe("23:50");
      expect(minutesToTimeString(-60)).toBe("23:00");
    });
  });

  describe("parseDurationToMinutes", () => {
    it("should parse minutes string correctly", () => {
      expect(parseDurationToMinutes("15 min")).toBe(15);
      expect(parseDurationToMinutes("45 minutes")).toBe(45);
      expect(parseDurationToMinutes("5 m")).toBe(5);
    });

    it("should parse hours string correctly", () => {
      expect(parseDurationToMinutes("1 hour")).toBe(60);
      expect(parseDurationToMinutes("2 hours")).toBe(120);
      expect(parseDurationToMinutes("1 hr")).toBe(60);
    });

    it("should parse complex mixture of hours and minutes correctly", () => {
      expect(parseDurationToMinutes("1 hour 30 min")).toBe(90);
      expect(parseDurationToMinutes("2 hr 15 m")).toBe(135);
    });

    it("should parse float durations correctly", () => {
      expect(parseDurationToMinutes("1.5 hours")).toBe(90);
    });

    it("should return fallback values for invalid strings", () => {
      expect(parseDurationToMinutes("invalid")).toBe(15);
      expect(parseDurationToMinutes("")).toBe(15);
      expect(parseDurationToMinutes(null)).toBe(15);
    });
  });

  describe("formatDuration", () => {
    it("should format standard minutes simple names", () => {
      expect(formatDuration("15 min")).toBe("15 MIN");
      expect(formatDuration("45 min")).toBe("45 MIN");
    });

    it("should format hour values cleanly", () => {
      expect(formatDuration("60 min")).toBe("1 HR");
      expect(formatDuration("90 min")).toBe("1h 30m");
      expect(formatDuration("120 min")).toBe("2 HR");
    });
  });

  describe("formatTime", () => {
    it("should format 24-hour HH:MM strings into AM/PM", () => {
      expect(formatTime("09:00")).toBe("9:00 AM");
      expect(formatTime("12:00")).toBe("12:00 PM");
      expect(formatTime("13:15")).toBe("1:15 PM");
      expect(formatTime("00:05")).toBe("12:05 AM");
      expect(formatTime("12:45")).toBe("12:45 PM");
    });

    it("should return empty string if invalid", () => {
      expect(formatTime("")).toBe("");
      expect(formatTime(null as any)).toBe("");
    });
  });

  describe("getPriorityWeight", () => {
    it("should assign highest weight to locked items", () => {
      expect(getPriorityWeight("low", true)).toBe(0);
      expect(getPriorityWeight("high", true)).toBe(0);
    });

    it("should maps values correctly", () => {
      expect(getPriorityWeight("high", false)).toBe(1);
      expect(getPriorityWeight("medium", false)).toBe(2);
      expect(getPriorityWeight("low", false)).toBe(3);
      expect(getPriorityWeight("none", false)).toBe(4);
    });

    it("should default to 3", () => {
      expect(getPriorityWeight(undefined, false)).toBe(3);
    });
  });
});
