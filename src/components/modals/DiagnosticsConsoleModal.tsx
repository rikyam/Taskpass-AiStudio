import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";

export interface SyncErrorDetail {
  source: string;
  error: string;
  reason: string;
  suggestions: string[];
}

interface DiagnosticsConsoleModalProps {
  syncErrorDetail: SyncErrorDetail | null;
  onClose: () => void;
  onManageGCal?: () => void;
  triggerHaptic?: (type?: string) => void;
}

export const DiagnosticsConsoleModal: React.FC<DiagnosticsConsoleModalProps> = ({
  syncErrorDetail,
  onClose,
  onManageGCal,
  triggerHaptic,
}) => {
  if (!syncErrorDetail) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Sync Diagnostic Console"
    >
      <div className="space-y-4 text-left animate-in fade-in zoom-in duration-300">
        {/* Context Panel */}
        <div className="p-4 bg-slate-950/45 rounded-2xl border border-rose-500/10 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="min-w-0">
            <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 leading-none">
              Sync Pipeline Failure
            </span>
            <h4 className="text-[11px] font-black text-slate-100 uppercase tracking-wide mt-1 truncate">
              {syncErrorDetail.source}
            </h4>
            <p className="text-[10px] text-rose-350 leading-relaxed font-semibold mt-1.5 p-2 bg-rose-950/20 rounded-lg border border-rose-500/10 max-h-[140px] overflow-y-auto no-scrollbar font-mono break-all text-xs opacity-90 select-text select-all">
              {syncErrorDetail.error}
            </p>
          </div>
        </div>

        {/* Reason Box */}
        <div className="p-4 bg-slate-950/25 rounded-2xl border border-white/5 space-y-1.5">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">
            Diagnostic Interpretation
          </span>
          <p className="text-xs text-slate-200 font-bold leading-normal mt-1">
            {syncErrorDetail.reason}
          </p>
        </div>

        {/* Troubleshooting List */}
        <div className="space-y-2">
          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">
            Possible Reasons & Remedies
          </span>
          <div className="space-y-2">
            {syncErrorDetail.suggestions.map((sug, sIndex) => {
              const numberLabel = sIndex + 1;
              return (
                <div key={sIndex} className="p-3 bg-slate-905 border border-white/5 rounded-xl flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0">
                    {numberLabel}
                  </div>
                  <p className="text-[10px] text-slate-350 leading-relaxed font-bold">{sug}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex gap-2">
          {syncErrorDetail.source.toLowerCase().includes("calendar") && (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onManageGCal) onManageGCal();
                if (triggerHaptic) triggerHaptic("medium");
              }}
              className="flex-1 py-3 text-center bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all h-10 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
            >
              <RefreshCw size={13} />
              <span>Manage GCal</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (triggerHaptic) triggerHaptic("light");
            }}
            className="flex-1 py-3 bg-slate-950/40 border border-white/5 text-slate-400 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all h-10 flex items-center justify-center cursor-pointer"
          >
            Close Console
          </button>
        </div>
      </div>
    </Modal>
  );
};
