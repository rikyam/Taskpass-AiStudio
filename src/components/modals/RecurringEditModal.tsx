import React from "react";
import { Modal } from "../InteractiveAppHelpers";

export interface RecurringEditModalState {
  isOpen: boolean;
  title?: string;
  description: string;
  onConfirm: (scope: "this" | "forward" | "all") => void;
}

interface RecurringEditModalProps {
  modalState: RecurringEditModalState | null;
  onClose: () => void;
}

export const RecurringEditModal: React.FC<RecurringEditModalProps> = ({
  modalState,
  onClose,
}) => {
  if (!modalState || !modalState.isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={modalState.title || "Edit Repeating Task"}
      zIndex="z-[9999]"
    >
      <div className="space-y-4 text-left p-1">
        <p className="text-xs font-medium text-slate-200 leading-relaxed">
          {modalState.description}
        </p>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              modalState.onConfirm("this");
              onClose();
            }}
            className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-indigo-300">
                This instance only
              </div>
              <div className="text-[10px] text-slate-400">
                Apply edits only to this date
              </div>
            </div>
            <span className="text-xs text-indigo-400 font-black">Apply</span>
          </button>

          <button
            type="button"
            onClick={() => {
              modalState.onConfirm("forward");
              onClose();
            }}
            className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-indigo-300">
                This and following instances
              </div>
              <div className="text-[10px] text-slate-400">
                Apply edits to this date and all future dates
              </div>
            </div>
            <span className="text-xs text-indigo-400 font-black">Apply</span>
          </button>

          <button
            type="button"
            onClick={() => {
              modalState.onConfirm("all");
              onClose();
            }}
            className="w-full p-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-indigo-200">
                All repeating instances
              </div>
              <div className="text-[10px] text-indigo-300/80">
                Apply changes to the entire repeating series
              </div>
            </div>
            <span className="text-xs text-indigo-400 font-black">Apply All</span>
          </button>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
