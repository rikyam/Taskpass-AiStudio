import React from "react";
import { RefreshCw, CalendarRange, CalendarPlus } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  gcalAccessToken: string | null;
  setGcalAccessToken: (token: string | null) => void;
  selectedDate: string;
  isGcalLoading: boolean;
  handlePullGcalEvents: () => void;
  handlePushLocalTasks: () => void;
  gcalStatusMsg: string | null;
  setGcalStatusMsg: (msg: string | null) => void;
  setIsGcalSyncActive: (active: boolean) => void;
  handleLinkGcal: () => void;
  complementaryCalendarUrl: string;
  setComplementaryCalendarUrl: (url: string) => void;
  saveSystemSettingsToCloud: (settings: any) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  gcalAccessToken,
  setGcalAccessToken,
  selectedDate,
  isGcalLoading,
  handlePullGcalEvents,
  handlePushLocalTasks,
  gcalStatusMsg,
  setGcalStatusMsg,
  setIsGcalSyncActive,
  handleLinkGcal,
  complementaryCalendarUrl,
  setComplementaryCalendarUrl,
  saveSystemSettingsToCloud,
  triggerHaptic,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Calendar Integration"
    >
      <div className="space-y-4 text-left">
        <div className="flex items-center justify-between p-3.5 bg-slate-950/30 rounded-2xl border border-white/5">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Auth Status</span>
            <span className="text-[11px] font-black uppercase tracking-wide text-white mt-1">Google API Portal</span>
          </div>
          <div>
            {gcalAccessToken ? (
              <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md animate-pulse">
                Connected
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase bg-slate-500/10 text-slate-400 border border-white/5">
                Offline
              </span>
            )}
          </div>
        </div>

        {gcalAccessToken ? (
          <div className="space-y-3.5">
            <p className="text-[10px] text-slate-400 leading-normal font-semibold">
              Your credentials are active. Bulk alignment is ready for <strong>{selectedDate}</strong>. Select synchronization direction below:
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={isGcalLoading}
                onClick={handlePullGcalEvents}
                className="p-3.5 bg-slate-950/35 border border-white/5 hover:border-indigo-505/30 hover:bg-indigo-950/5 text-indigo-400 hover:text-indigo-350 rounded-xl text-left transition-all flex items-start gap-3 cursor-pointer group"
              >
                <RefreshCw size={15} className={`text-indigo-455 mt-0.5 shrink-0 group-hover:rotate-180 transition-transform duration-500 ${isGcalLoading ? "animate-spin" : ""}`} />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-black uppercase tracking-wider leading-none">Pull All Events</p>
                  <p className="text-[9px] text-slate-450 leading-normal font-semibold mt-1 leading-tight">
                    Fetch Google sessions for {selectedDate}, preserving task flexibility while importing calendar appointments as fixed slots.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={isGcalLoading}
                onClick={handlePushLocalTasks}
                className="p-3.5 bg-slate-950/35 border border-white/5 hover:border-indigo-505/30 hover:bg-indigo-950/5 text-indigo-400 hover:text-indigo-350 rounded-xl text-left transition-all flex items-start gap-3 cursor-pointer group"
              >
                <CalendarRange size={15} className="text-indigo-455 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-black uppercase tracking-wider leading-none">Push All Tasks</p>
                  <p className="text-[9px] text-slate-450 leading-normal font-semibold mt-1 leading-tight">
                    Publish all current local schedules for {selectedDate} as event blocks in your Google Calendar.
                  </p>
                </div>
              </button>
            </div>

            {gcalStatusMsg && (
              <div className={`p-3 rounded-xl text-[9.5px] leading-relaxed font-semibold border ${
                gcalStatusMsg.startsWith("GCal") || gcalStatusMsg.startsWith("Sync error") || gcalStatusMsg.toLowerCase().includes("error") || gcalStatusMsg.toLowerCase().includes("failed")
                  ? "bg-rose-500/5 text-rose-400 border-rose-500/10" 
                  : "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
              }`}>
                {gcalStatusMsg}
              </div>
            )}

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setGcalAccessToken(null);
                  localStorage.removeItem("gcal_sync_enabled");
                  setIsGcalSyncActive(false);
                  setGcalStatusMsg("Google Calendar reference terminated.");
                  triggerHaptic("heavy");
                }}
                className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-350 tracking-wider hover:underline transition-colors cursor-pointer"
              >
                Unlink Calendar Account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
              Link with your Google account credentials to immediately pull real-world appointments and push daily timeline schedules back and forth.
            </p>
            
            <button
              type="button"
              onClick={handleLinkGcal}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CalendarPlus size={13} />
              <span>Link Google Calendar</span>
            </button>

            {gcalStatusMsg && (
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl text-[9.5px] leading-relaxed font-semibold text-slate-400 text-center">
                {gcalStatusMsg}
              </div>
            )}
          </div>
        )}

        {/* Section: Read-Only Complementary Calendar URL Input */}
        <div className="pt-3 border-t border-white/5 space-y-2.5">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500">Read-Only Complementary Calendar</span>
          <div className="bg-slate-950/30 border border-white/5 p-3 rounded-2xl space-y-2">
            <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed">
              Provide a public calendar embed link (e.g. Google Calendar public embed URL or any shared calendar webpage) to view it alongside your list.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., https://calendar.google.com/calendar/embed?src=..."
                value={complementaryCalendarUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setComplementaryCalendarUrl(val);
                  localStorage.setItem("complementary_calendar_url", val);
                  saveSystemSettingsToCloud({ complementaryCalendarUrl: val });
                }}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {complementaryCalendarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setComplementaryCalendarUrl("");
                    localStorage.setItem("complementary_calendar_url", "");
                    saveSystemSettingsToCloud({ complementaryCalendarUrl: "" });
                  }}
                  className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-950/40 border border-white/5 text-slate-400 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer"
          >
            Close Hub
          </button>
        </div>
      </div>
    </Modal>
  );
};
