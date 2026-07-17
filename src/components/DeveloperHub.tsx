import React, { useState } from "react";
import { Copy, Check, Terminal, FileCode, CheckSquare, Info, Smartphone, ExternalLink, Zap } from "lucide-react";
import { reactNativeCode } from "./TaskPassRNCode";

interface DeveloperHubProps {
  darkMode: boolean;
}

export function DeveloperHub({ darkMode }: DeveloperHubProps) {
  const [activeTab, setActiveTab] = useState<"code" | "expo" | "specs">("code");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reactNativeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`h-full flex flex-col rounded-[32px] border overflow-hidden shadow-2xl ${
      darkMode ? "bg-slate-900 border-white/5 text-slate-100" : "bg-white border-gray-200 text-gray-800"
    }`}>
      {/* Panel Tab Bar */}
      <div className={`flex shrink-0 p-2.5 border-b gap-1 bg-slate-950/45 ${
        darkMode ? "border-white/5" : "border-gray-200"
      }`}>
        <button
          onClick={() => setActiveTab("code")}
          className={`flex-1 py-3 px-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "code"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileCode size={14} /> Unified Code
        </button>
        <button
          onClick={() => setActiveTab("expo")}
          className={`flex-1 py-3 px-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "expo"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Terminal size={14} /> Expo Guide
        </button>
        <button
          onClick={() => setActiveTab("specs")}
          className={`flex-1 py-3 px-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === "specs"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Info size={14} /> Gestures Specification
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
        {activeTab === "code" && (
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">ReactNativeApp.tsx</h3>
                <p className="text-[11px] opacity-65 mt-0.5">Copy this codebase straight to your Expo entry point</p>
              </div>
              <button
                onClick={copyToClipboard}
                className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-indigo-600/15 shrink-0"
              >
                {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Code"}
              </button>
            </div>

            {/* Simulated Code Editor Window */}
            <div className={`flex-1 rounded-2xl border flex flex-col overflow-hidden w-full ${
              darkMode ? "bg-slate-950/80 border-white/5" : "bg-gray-50 border-gray-200"
            }`}>
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950/40">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-mono opacity-50">TypeScript Source</span>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-[10.5px] leading-relaxed select-text select-all">
                <pre className="text-slate-300 whitespace-pre">
                  {reactNativeCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === "expo" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Launch Mobile Blueprint</h3>
              <p className="text-xs opacity-65 mt-1">Boot this unified React Native Taskpass build on your device in under 5 minutes.</p>
            </div>

            {/* Expo Commands Checklist */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 self-start shrink-0"><Terminal size={16}/></div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">1. Initialize Clean Sandbox</h4>
                  <p className="text-[11px] opacity-75 mt-0.5">Generate a new Expo mobile skeleton with Native TypeScript support:</p>
                  <div className="mt-2.5 px-3 py-2.5 rounded-xl bg-slate-950 font-mono text-[10.5px] text-emerald-400 flex items-center justify-between border border-white/5">
                    <code>npx create-expo-app@latest TaskPassMobile --template blank-typescript</code>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 self-start shrink-0"><Terminal size={16}/></div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">2. Install Touch & Gesture Libraries</h4>
                  <p className="text-[11px] opacity-75 mt-0.5">Move into directory and install necessary touch trackers and graphics engines:</p>
                  <div className="mt-2.5 px-3 py-2.5 rounded-xl bg-slate-950 font-mono text-[10.5px] text-emerald-400 flex items-center justify-between border border-white/5">
                    <code>npx expo install react-native-gesture-handler react-native-reanimated lucide-react-native</code>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 self-start shrink-0"><ExternalLink size={16}/></div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">3. Drop Unified Code & Run</h4>
                  <p className="text-[11px] opacity-75 mt-0.5">Replace <code className="text-pink-400 bg-black/30 px-1 py-0.5 rounded text-[10px]">App.tsx</code> contents with Code view blueprint and turn on the engine:</p>
                  <div className="mt-2.5 px-3 py-2.5 rounded-xl bg-slate-950 font-mono text-[10.5px] text-emerald-400 flex items-center justify-between border border-white/5">
                    <code>npx expo start</code>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? "bg-slate-950/40 border-white/5" : "bg-gray-50 border-gray-200"}`}>
               <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">Developer Notice</p>
               <p className="text-[11px] opacity-75 leading-relaxed">
                 To register gestures on Android, ensure <strong className="text-white">GestureHandlerRootView</strong> wraps the root app wrapper layout (this is pre-wired in our exporter source).
               </p>
            </div>
          </div>
        )}

        {activeTab === "specs" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Mobile Gesture Architecture</h3>
              <p className="text-xs opacity-65 mt-1">Understanding the unified iOS & Android touch responder engine.</p>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Zap size={14} className="text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">Seamless snaps dynamics</h4>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  The mobile workspace binds absolute time indices to vertical screen regions. During drag translation:
                </p>
                <ul className="list-disc pl-4 mt-2 text-[10.5px] opacity-70 space-y-1.5 leading-relaxed">
                  <li><strong>Active Responders</strong>: The timeline uses dual-layered touch listeners detecting pan distances during touch moves.</li>
                  <li><strong>Tactile Snapping</strong>: A snap matrix maps coordinates onto hourly blocks with <code className="text-emerald-400 px-1 font-mono">15m / 30m</code> increments, emitting subtle haptic responses upon snap grid crossings.</li>
                  <li><strong>Unlinked Routines</strong>: Shifting unlinked group tasks shifts descendants sequentially in order to prevent overlap.</li>
                </ul>
              </div>

              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Smartphone size={14} className="text-indigo-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">Haptics & Vibration Engine</h4>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  To achieve seamless physical feedback:
                </p>
                <ul className="list-disc pl-4 mt-2 text-[10.5px] opacity-70 space-y-1.5 leading-relaxed">
                  <li><strong>Vibration.vibrate(40)</strong> occurs instantly upon lock drops.</li>
                  <li>Smooth scroll inertia slows down during active drags near viewport edges, offering predictable scrolling bounds.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
