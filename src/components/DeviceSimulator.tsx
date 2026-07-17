import React, { useState, useEffect } from "react";
import { Smartphone, Laptop, Tablet, Moon, Sun, RefreshCw, Wifi, Battery } from "lucide-react";

interface DeviceSimulatorProps {
  isIos: boolean;
  setIsIos: (val: boolean) => void;
  children: React.ReactNode;
  darkMode: boolean;
}

export function DeviceSimulator({ isIos, setIsIos, children, darkMode }: DeviceSimulatorProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 420,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
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

  // Determine available vertical and horizontal space for the chassis
  // Leaving 96px for padding and the selector bar
  const marginOffset = 96;
  const maxChassisHeight = Math.min(windowSize.height - marginOffset, 800);
  const maxChassisWidth = Math.min(windowSize.width - 32, 400);

  // Target aspect ratio for high fidelity screen emulations
  const targetRatio = 9 / 19.5;

  let chassisHeight = maxChassisHeight;
  let chassisWidth = chassisHeight * targetRatio;

  // Scale down if calculated width exceeds horizontal space constraints
  if (chassisWidth > maxChassisWidth) {
    chassisWidth = maxChassisWidth;
    chassisHeight = chassisWidth / targetRatio;
  }

  // Ensure minimum dimensions so usability isn't completely compromised on super small frames
  chassisHeight = Math.max(chassisHeight, 320);
  chassisWidth = Math.max(chassisWidth, 320 * targetRatio);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none overflow-hidden p-3 relative">
      {/* Device Toggle Selector Bar */}
      <div className="flex gap-2.5 p-1 bg-slate-900/40 border border-white/5 backdrop-blur-md rounded-2xl mb-3 w-[260px] justify-between relative z-10 shrink-0">
        <button
          onClick={() => setIsIos(true)}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${
            isIos
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
           iOS / iPhone
        </button>
        <button
          onClick={() => setIsIos(false)}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${
            !isIos
              ? "bg-emerald-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🤖 Android / Pixel
        </button>
      </div>

      {/* Simulator Core Chassis */}
      <div
        style={{
          width: `${Math.round(chassisWidth)}px`,
          height: `${Math.round(chassisHeight)}px`,
        }}
        className={`relative rounded-[48px] border-[10px] flex flex-col overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] transition-all shrink-0 ${
          isIos
            ? "border-slate-800 ring-4 ring-slate-800/40 shadow-indigo-950/20"
            : "border-zinc-800 ring-4 ring-zinc-800/40 shadow-emerald-950/20"
        } ${darkMode ? "bg-slate-950" : "bg-gray-100"}`}
      >
        {/* Dynamic Island (iOS) or Central Punch Hole (Android) */}
        {isIos ? (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-slate-950 rounded-full z-[500] border border-white/5 shadow-inner flex items-center justify-between px-3.5 select-none pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950 border border-blue-500/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          </div>
        ) : (
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-slate-950 rounded-full z-[500] border border-white/5 shadow-inner flex items-center justify-center pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-950" />
          </div>
        )}

        {/* Device Speaker Line (iOS only at actual bezel rim, simulation here) */}
        {isIos && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-800 rounded-full z-[500] opacity-40" />
        )}

        {/* Simulated Mobile OS Status Bar */}
        <div
          className={`h-11 shrink-0 px-6 pt-2 select-none flex items-center justify-between z-[490] ${
            darkMode ? "text-slate-400" : "text-gray-600"
          }`}
        >
          {/* Time Placement */}
          <div className="text-[11px] font-black tracking-tighter mt-1">{currentTime}</div>
          
          {/* Status Icons */}
          <div className="flex items-center gap-1.5">
            <Wifi size={12} className="opacity-85" />
            <span className="text-[9px] font-bold tracking-tight opacity-80 uppercase">5G</span>
            <Battery size={14} className="opacity-90 ml-0.5" />
          </div>
        </div>

        {/* Simulated Screen Inner Frame */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          {children}
        </div>

        {/* Simulated Virtual Navigation Indicator Bars */}
        <div className="absolute bottom-1 w-full h-6 flex justify-center items-center z-[500] pointer-events-none">
          {isIos ? (
            <div className={`w-36 h-1 rounded-full ${darkMode ? "bg-white/45" : "bg-black/45"}`} />
          ) : (
            <div className={`w-4 h-4 rounded-full border-[1.5px] ${darkMode ? "border-white/35" : "border-black/35"}`} />
          )}
        </div>
      </div>
    </div>
  );
}
