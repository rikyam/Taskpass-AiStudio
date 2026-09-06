/**
 * Helper utility for managing editable Home and Work locations across the application.
 */

export const getStoredHomeLocation = (): string => {
  if (typeof window === "undefined") return "Home";
  try {
    return localStorage.getItem("taskpass_home_location_v1") || "Home";
  } catch {
    return "Home";
  }
};

export const setStoredHomeLocation = (loc: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("taskpass_home_location_v1", loc);
    window.dispatchEvent(new Event("taskpass_locations_updated"));
  } catch (err) {
    console.error("Error setting home location:", err);
  }
};

export const getStoredWorkLocation = (): string => {
  if (typeof window === "undefined") return "Work";
  try {
    return localStorage.getItem("taskpass_work_location_v1") || "Work";
  } catch {
    return "Work";
  }
};

export const setStoredWorkLocation = (loc: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("taskpass_work_location_v1", loc);
    window.dispatchEvent(new Event("taskpass_locations_updated"));
  } catch (err) {
    console.error("Error setting work location:", err);
  }
};
