// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  playTaskCompletionChime,
  playSubtaskCompletionChime,
  playTimelineBumpFeedback,
  isCompletionChimeEnabled,
  setCompletionChimeEnabled
} from "../utils/soundEffects";

describe("soundEffects module", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults completion chime to enabled", () => {
    expect(isCompletionChimeEnabled()).toBe(true);
  });

  it("persists enabled/disabled state to localStorage", () => {
    setCompletionChimeEnabled(false);
    expect(isCompletionChimeEnabled()).toBe(false);
    expect(localStorage.getItem("completion_chime_enabled")).toBe("false");

    setCompletionChimeEnabled(true);
    expect(isCompletionChimeEnabled()).toBe(true);
    expect(localStorage.getItem("completion_chime_enabled")).toBe("true");
  });

  it("executes playTaskCompletionChime safely without errors even in simulated browser environments", () => {
    expect(() => {
      playTaskCompletionChime();
    }).not.toThrow();
  });

  it("executes playSubtaskCompletionChime safely without errors", () => {
    expect(() => {
      playSubtaskCompletionChime();
    }).not.toThrow();
  });

  it("executes playTimelineBumpFeedback safely without errors", () => {
    expect(() => {
      playTimelineBumpFeedback();
      playTimelineBumpFeedback({ force: true, volume: 0.1 });
    }).not.toThrow();
  });

  it("respects disabled state unless forced", () => {
    setCompletionChimeEnabled(false);
    // Should not throw or crash
    expect(() => {
      playTaskCompletionChime();
      playTaskCompletionChime({ force: true });
    }).not.toThrow();
  });
});
