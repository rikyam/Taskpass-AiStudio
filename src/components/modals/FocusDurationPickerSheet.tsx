import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface FocusDurationPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hours: number;
  setHours: (hours: number) => void;
  minutes: number;
  setMinutes: (minutes: number) => void;
  onConfirm: () => void;
}

export const FocusDurationPickerSheet: React.FC<FocusDurationPickerSheetProps> = ({
  isOpen,
  onClose,
  hours,
  setHours,
  minutes,
  setMinutes,
  onConfirm,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
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

            <div className="text-center mb-6">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Adjust Focus Duration
              </span>
              <h3 className="text-sm font-black text-slate-100 mt-2.5 leading-relaxed">
                Select Hour and Minute Picker
              </h3>
            </div>

            {/* Picker Selection Grid */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-white/5 flex items-center justify-center gap-4">
              {/* Hour Select */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Hours</span>
                <select
                  value={hours}
                  onChange={(e) => setHours(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-center bg-slate-900 border border-white/10 rounded-xl p-3 font-black text-sm text-indigo-400 cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ colorScheme: "dark" }}
                >
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <option key={idx} value={idx} className="bg-slate-900 text-white text-sm">
                      {idx} hour{idx !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-500 font-bold text-lg pt-4 shrink-0">:</span>

              {/* Minute Select */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Minutes</span>
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-center bg-slate-900 border border-white/10 rounded-xl p-3 font-black text-sm text-indigo-400 cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ colorScheme: "dark" }}
                >
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const minsVal = idx * 5;
                    return (
                      <option key={minsVal} value={minsVal} className="bg-slate-900 text-white text-sm">
                        {minsVal} min{minsVal !== 1 ? 's' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Total Duration Label */}
            <div className="text-center mt-5 mb-2">
              <span className="text-xs text-slate-400 font-medium">Selected: </span>
              <span className="text-sm font-extrabold text-indigo-400">
                {hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`}
              </span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="py-4 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl font-bold uppercase text-[11px] tracking-wider transition-colors border border-white/5 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase text-[11px] tracking-wider transition-colors cursor-pointer text-center"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
