import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Task } from "../../types";

interface PriorityBottomSheetProps {
  task: Task | null;
  onClose: () => void;
  onSelectPriority: (task: Task, priority: "high" | "medium" | "low" | undefined) => void;
}

export const PriorityBottomSheet: React.FC<PriorityBottomSheetProps> = ({
  task,
  onClose,
  onSelectPriority,
}) => {
  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000]"
          />

          {/* Bottom Drawer Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-slate-850/80 rounded-t-[32px] p-6 pb-8 z-[2001] shadow-[0_-15px_40px_rgba(0,0,0,0.65)] font-sans"
          >
            {/* Drag grab bar indicator */}
            <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto mb-5" />

            <div className="text-center mb-5">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Update Task Priority
              </span>
              <h3 className="text-sm font-black text-slate-100 mt-2.5 line-clamp-2 px-4 leading-relaxed">
                "{task.title}"
              </h3>
            </div>

            <div className="space-y-3">
              {/* HIGH PRIORITY */}
              <button
                type="button"
                onClick={() => onSelectPriority(task, "high")}
                className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                  task.priority === "high"
                    ? "bg-orange-500/15 border-orange-500/50 text-orange-400 font-extrabold shadow-[0_0_15px_rgba(249,115,22,0.15)] scale-[1.02]"
                    : "bg-slate-850/40 border-white/5 text-slate-350 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                  <span className="text-xs tracking-wide uppercase font-bold">High Priority</span>
                </div>
                <div className="text-[10px] font-black uppercase text-orange-500/75 border border-orange-500/30 px-2 py-0.5 rounded-md">
                  High
                </div>
              </button>

              {/* MED PRIORITY */}
              <button
                type="button"
                onClick={() => onSelectPriority(task, "medium")}
                className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                  task.priority === "medium"
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-400 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.02]"
                    : "bg-slate-850/40 border-white/5 text-slate-350 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <span className="text-xs tracking-wide uppercase font-bold">Med Priority</span>
                </div>
                <div className="text-[10px] font-black uppercase text-amber-500/75 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Medium
                </div>
              </button>

              {/* LOW PRIORITY */}
              <button
                type="button"
                onClick={() => onSelectPriority(task, "low")}
                className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                  task.priority === "low"
                    ? "bg-blue-500/15 border-blue-500/50 text-blue-400 font-extrabold shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]"
                    : "bg-slate-850/40 border-white/5 text-slate-350 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <span className="text-xs tracking-wide uppercase font-bold">Low Priority</span>
                </div>
                <div className="text-[10px] font-black uppercase text-blue-500/75 border border-blue-500/30 px-2 py-0.5 rounded-md">
                  Low
                </div>
              </button>

              {/* NONE PRIORITY */}
              <button
                type="button"
                onClick={() => onSelectPriority(task, undefined)}
                className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                  !task.priority || task.priority === "none"
                    ? "bg-slate-700/40 border-slate-500/50 text-slate-200 font-extrabold shadow-[0_0_15px_rgba(148,163,184,0.1)] scale-[1.02]"
                    : "bg-slate-850/40 border-white/5 text-slate-350 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-xs tracking-wide uppercase font-bold">No Priority</span>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-400/75 border border-slate-700 px-2 py-0.5 rounded-md">
                  None
                </div>
              </button>
            </div>

            {/* CANCEL ACTION */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-6 py-4 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl font-bold uppercase text-[11px] tracking-wider transition-colors border border-white/5 cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
