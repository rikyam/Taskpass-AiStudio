import React from "react";
import { Link as LinkIcon, Save } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";
import { Task } from "../../types";

interface SaveSequenceTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  saveSequenceName: string;
  setSaveSequenceName: (name: string) => void;
  saveSequenceGroupId: string | null;
  tasks: Task[];
  timeToMinutes: (timeStr: string) => number;
  handleConfirmSaveSequence: () => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "selection") => void;
  uniformLabelClass: string;
  uniformInputClass: string;
}

export const SaveSequenceTemplateModal: React.FC<SaveSequenceTemplateModalProps> = ({
  isOpen,
  onClose,
  saveSequenceName,
  setSaveSequenceName,
  saveSequenceGroupId,
  tasks,
  timeToMinutes,
  handleConfirmSaveSequence,
  triggerHaptic,
  uniformLabelClass,
  uniformInputClass,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Sequence to Saved Template">
      <div className="space-y-4 text-left">
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          You are converting this active ad-hoc sequence block into a saved routine template. This makes it permanently reusable and deployable at any time.
        </p>

        <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <label className={uniformLabelClass}>Template Title / Name</label>
          <input
            type="text"
            value={saveSequenceName}
            onChange={(e) => setSaveSequenceName(e.target.value)}
            placeholder="e.g. Morning Focus Ritual"
            className={uniformInputClass}
            autoFocus
          />
        </div>

        {saveSequenceGroupId && (
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5 space-y-2">
            <span className="text-[9.5px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
              <LinkIcon size={10} className="text-indigo-400" />
              Sequence Steps Preview ({tasks.filter(t => t.groupId === saveSequenceGroupId && !t.isUnlinked).length})
            </span>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {tasks
                .filter(t => t.groupId === saveSequenceGroupId && !t.isUnlinked)
                .sort((a, b) => {
                  if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                  }
                  return timeToMinutes(a.computedTime || a.time) - timeToMinutes(b.computedTime || b.time);
                })
                .map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.02] last:border-0 font-medium">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-indigo-950/80 text-[9px] font-mono font-bold text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/10">
                        {idx + 1}
                      </span>
                      <span className="text-slate-100 truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-500/5 shrink-0">
                      {t.duration || "30 min"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              triggerHaptic("light");
            }}
            className="flex-1 h-10 rounded-xl border border-white/5 bg-slate-900 text-slate-400 font-extrabold uppercase text-[10px] sm:text-[10.5px] tracking-wider hover:bg-slate-805 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSaveSequence}
            disabled={!saveSequenceName.trim()}
            className="flex-1 h-10 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-extrabold uppercase text-[10px] sm:text-[10.5px] tracking-wider border-b-[2.5px] border-emerald-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Save size={11} strokeWidth={3} />
            <span>Save Routine</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
