import React, { useState, useEffect } from "react";
import { Smartphone, Laptop, Tablet, Moon, Sun, RefreshCw, Wifi, Battery, Maximize2, Minimize2, Monitor } from "lucide-react";

interface DeviceSimulatorProps {
  isIos: boolean;
  setIsIos: (val: boolean) => void;
  children: React.ReactNode;
  darkMode: boolean;
}

export type SimulatorWidthMode = "phone" | "wide" | "expanded" | "full";

export function DeviceSimulator({ isIos, setIsIos, children, darkMode }: DeviceSimulatorProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [widthMode, setWidthMode] = useState<SimulatorWidthMode>(() => {
    const saved = localStorage.getItem("simulator_width_mode");
    return (saved as SimulatorWidthMode) || "wide";
  });
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 600,
    height: typeof window !== "undefined" ? window.innerHeight : 840,
  });

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      setCurrentTime(`${displayHours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSetWidthMode = (mode: SimulatorWidthMode) => {
    setWidthMode(mode);
    localStorage.setItem("simulator_width_mode", mode);
  };

  // Determine available vertical and horizontal space for the chassis
  const marginOffset = 84;
  const maxChassisHeight = Math.max(480, Math.min(windowSize.height - marginOffset, 920));
  const availableWidth = Math.max(340, windowSize.width - 24);

  let targetWidth = 460;
  if (widthMode === "phone") {
    targetWidth = 430;
  } else if (widthMode === "wide") {
    targetWidth = 560;
  } else if (widthMode === "expanded") {
    targetWidth = 760;
  } else if (widthMode === "full") {
    targetWidth = availableWidth;
  }

  const chassisWidth = Math.min(targetWidth, availableWidth);
  const chassisHeight = maxChassisHeight;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none overflow-hidden p-2 sm:p-3 relative">
      {/* Device & Usability Width Selector Bar */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-2xl mb-2.5 max-w-full justify-between relative z-10 shrink-0 shadow-lg">
        {/* OS Platform Selector */}
        <div className="flex gap-1 bg-slate-950/60 p-0.5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setIsIos(true)}
            className={`px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              isIos
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            title="Switch to iOS / iPhone frame"
          >
             iOS
          </button>
          <button
            type="button"
            onClick={() => setIsIos(false)}
            className={`px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              !isIos
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
            title="Switch to Android / Pixel frame"
          >
            🤖 Android
          </button>
        </div>

        {/* Usability Width Segmented Selector */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => handleSetWidthMode("phone")}
            className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              widthMode === "phone"
                ? "bg-indigo-600/90 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Standard Mobile Width (430px)"
          >
            <Smartphone size={11} />
            <span className="hidden sm:inline">Phone</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetWidthMode("wide")}
            className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              widthMode === "wide"
                ? "bg-indigo-600/90 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Wide Mobile / Pro Max Width (560px)"
          >
            <Tablet size={11} />
            <span className="hidden sm:inline">Wide</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetWidthMode("expanded")}
            className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              widthMode === "expanded"
                ? "bg-indigo-600/90 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Expanded Canvas / Tablet Mode (760px)"
          >
            <Monitor size={11} />
            <span className="hidden sm:inline">Expanded</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetWidthMode("full")}
            className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              widthMode === "full"
                ? "bg-indigo-600/90 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Full Available Window Width"
          >
            <Maximize2 size={11} />
            <span className="hidden sm:inline">Full</span>
          </button>
        </div>
      </div>

      {/* Simulator Core Chassis */}
      <div
        style={{
          width: `${Math.round(chassisWidth)}px`,
          height: `${Math.round(chassisHeight)}px`,
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={`relative rounded-[36px] sm:rounded-[44px] border-[8px] sm:border-[10px] flex flex-col overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] shrink-0 ${
          isIos
            ? "border-slate-800 ring-4 ring-slate-800/40 shadow-indigo-950/20"
            : "border-zinc-800 ring-4 ring-zinc-800/40 shadow-emerald-950/20"
        } ${darkMode ? "bg-slate-950" : "bg-gray-100"}`}
      >
        {/* Dynamic Island (iOS) or Central Punch Hole (Android) */}
        {isIos ? (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-full z-[500] border border-white/5 shadow-inner flex items-center justify-between px-3.5 select-none pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950 border border-blue-500/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          </div>
        ) : (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-950 rounded-full z-[500] border border-white/5 shadow-inner flex items-center justify-center pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-950" />
          </div>
        )}

        {/* Device Speaker Line (iOS only at actual bezel rim) */}
        {isIos && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-slate-800 rounded-full z-[500] opacity-40" />
        )}

        {/* Simulated Mobile OS Status Bar */}
        <div
          className={`h-9 shrink-0 px-5 pt-1.5 select-none flex items-center justify-between z-[490] ${
            darkMode ? "text-slate-400" : "text-gray-600"
          }`}
        >
          {/* Time Placement */}
          <div className="text-[11px] font-black tracking-tighter">{currentTime}</div>
          
          {/* Status Icons */}
          <div className="flex items-center gap-1.5">
            <Wifi size={12} className="opacity-85" />
            <span className="text-[9px] font-bold tracking-tight opacity-80 uppercase font-mono">5G</span>
            <Battery size={14} className="opacity-90 ml-0.5" />
          </div>
        </div>

        {/* Simulated Screen Inner Frame */}
        <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Simulated Virtual Navigation Indicator Bars */}
        <div className="absolute bottom-1 w-full h-4 flex justify-center items-center z-[500] pointer-events-none">
          {isIos ? (
            <div className={`w-32 h-1 rounded-full ${darkMode ? "bg-white/45" : "bg-black/45"}`} />
          ) : (
            <div className={`w-3.5 h-3.5 rounded-full border-[1.5px] ${darkMode ? "border-white/35" : "border-black/35"}`} />
          )}
        </div>
      </div>
    </div>
  );
}
