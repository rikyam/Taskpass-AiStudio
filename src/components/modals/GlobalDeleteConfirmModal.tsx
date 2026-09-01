import React from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";

export interface DeleteConfirmationState {
  isOpen: boolean;
  title: string;
  description: string;
  isRecurring?: boolean;
  isRecurringTask?: boolean;
  onConfirm: () => void;
  onConfirmRecurring?: (scope: "this" | "forward" | "all") => void;
  isSequenceChoice?: boolean;
  onConfirmSequenceChoice?: (applyToAll: boolean) => void;
  confirmText?: string;
  cancelText?: string;
}

interface GlobalDeleteConfirmModalProps {
  modalState: DeleteConfirmationState | null;
  onClose: () => void;
}

export const GlobalDeleteConfirmModal: React.FC<GlobalDeleteConfirmModalProps> = ({
  modalState,
  onClose,
}) => {
  if (!modalState || !modalState.isOpen) return null;

  const isRecurring = modalState.isRecurring || modalState.isRecurringTask;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={modalState.title || "Confirmation"}
      zIndex="z-[9999]"
    >
      <div className="space-y-4 text-left p-1">
        <p className="text-xs font-medium text-slate-200 leading-relaxed">
          {modalState.description}
        </p>

        {modalState.isSequenceChoice && modalState.onConfirmSequenceChoice ? (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                modalState.onConfirmSequenceChoice!(true);
                onClose();
              }}
              className="w-full p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-indigo-200 group-hover:text-white">
                  All Tasks in Sequence Block
                </div>
                <div className="text-[10px] text-indigo-300/70">
                  Apply action together across the entire sequence
                </div>
              </div>
              <span className="text-xs text-indigo-400 font-black">All Tasks</span>
            </button>

            <button
              type="button"
              onClick={() => {
                modalState.onConfirmSequenceChoice!(false);
                onClose();
              }}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-slate-400 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-slate-100 group-hover:text-white">
                  Only This Specific Task
                </div>
                <div className="text-[10px] text-slate-400">
                  Apply action exclusively to this task item
                </div>
              </div>
              <span className="text-xs text-slate-400 font-black">Only This</span>
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
        ) : isRecurring ? (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (modalState.onConfirmRecurring) {
                  modalState.onConfirmRecurring("this");
                } else {
                  modalState.onConfirm();
                }
                onClose();
              }}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-rose-500/40 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
                  This instance only
                </div>
                <div className="text-[10px] text-slate-400">
                  Delete only for this scheduled date
                </div>
              </div>
              <span className="text-xs text-rose-400 font-black">Delete</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (modalState.onConfirmRecurring) {
                  modalState.onConfirmRecurring("forward");
                } else {
                  modalState.onConfirm();
                }
                onClose();
              }}
              className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-rose-500/40 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
                  This and following instances
                </div>
                <div className="text-[10px] text-slate-400">
                  Delete starting from this date forward
                </div>
              </div>
              <span className="text-xs text-rose-400 font-black">Delete</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (modalState.onConfirmRecurring) {
                  modalState.onConfirmRecurring("all");
                } else {
                  modalState.onConfirm();
                }
                onClose();
              }}
              className="w-full p-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-rose-200">
                  All repeating instances
                </div>
                <div className="text-[10px] text-rose-300/80">
                  Delete entire repeating series everywhere
                </div>
              </div>
              <span className="text-xs text-rose-400 font-black">Delete All</span>
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
        ) : (
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              {modalState.cancelText || "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => {
                modalState.onConfirm();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-rose-900/30 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{modalState.confirmText || "Delete Permanently"}</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
