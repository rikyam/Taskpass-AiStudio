import React, { memo, useState, useRef, FormEvent, ChangeEvent } from "react";
import { useAppStore } from "../store";
import { Modal } from "./InteractiveAppHelpers";
import {
  Cloud,
  Layout,
  Clock,
  Download,
  Zap,
  ChevronUp,
  ChevronDown,
  User,
  Sparkles,
  Mail,
  Lock,
  Loader2,
  Key,
  UserPlus,
  SlidersHorizontal,
  Palette,
  Eye,
  Sliders,
  FolderClosed,
  Upload,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";

interface SettingsDrawerProps {
  auth: any; // Firebase Auth instance
  isDark: boolean;
  toggleTheme: () => void;
  isOnline: boolean;
  currentUser: any; // Firebase User or null
  gcalAccessToken: string | null;
  setGcalAccessToken: (token: string | null) => void;
  setIsGcalSyncActive: (active: boolean) => void;
  setContactsAccessToken: (token: string | null) => void;
  pullGoogleContacts: (token: string) => Promise<any>;
  saveSystemSettingsToCloud: (settings: any) => void;
  triggerHaptic: (type: string) => void;
  handleExportJSON: () => void;
  handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Reinstated Card Opacity, Color Choices & Underlighting Controls
  cardBgOpacity?: number;
  updateCardBgOpacity?: (val: number) => void;
  cardBgHue?: number;
  updateCardBgHue?: (val: number) => void;
  underlightingBrightness?: number;
  updateUnderlightingBrightness?: (val: number) => void;
  cardGradientPercent?: number;
  updateCardGradientPercent?: (val: number) => void;
  cardGradientDirection?: "left" | "right";
  updateCardGradientDirection?: (val: "left" | "right") => void;
  cardOutlineThickness?: number;
  updateCardOutlineThickness?: (val: number) => void;

  lockedHue?: number;
  updateLockedHue?: (val: number) => void;
  lockedOpacity?: number;
  updateLockedOpacity?: (val: number) => void;
  lockedNoColor?: boolean;
  updateLockedNoColor?: (val: boolean) => void;

  highHue?: number;
  updateHighHue?: (val: number) => void;
  highOpacity?: number;
  updateHighOpacity?: (val: number) => void;
  highNoColor?: boolean;
  updateHighNoColor?: (val: boolean) => void;

  medHue?: number;
  updateMedHue?: (val: number) => void;
  medOpacity?: number;
  updateMedOpacity?: (val: number) => void;
  medNoColor?: boolean;
  updateMedNoColor?: (val: boolean) => void;

  lowHue?: number;
  updateLowHue?: (val: number) => void;
  lowOpacity?: number;
  updateLowOpacity?: (val: number) => void;
  lowNoColor?: boolean;
  updateLowNoColor?: (val: boolean) => void;

  dataFieldColor?: string;
  setDataFieldColor?: (color: string) => void;

  timelineBorderColor?: string;
  setTimelineBorderColor?: (color: string) => void;
  timelineHourMarkerColor?: string;
  setTimelineHourMarkerColor?: (color: string) => void;
  timelineSublineColor?: string;
  setTimelineSublineColor?: (color: string) => void;
  timelineCardBorderColor?: string;
  setTimelineCardBorderColor?: (color: string) => void;

  taskCardGlassStyle?: string;
  setTaskCardGlassStyle?: (style: string) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = memo(({
  auth,
  isDark,
  toggleTheme,
  isOnline,
  currentUser,
  gcalAccessToken,
  setGcalAccessToken,
  setIsGcalSyncActive,
  setContactsAccessToken,
  pullGoogleContacts,
  saveSystemSettingsToCloud,
  triggerHaptic,
  handleExportJSON,
  handleImportJSON,

  dataFieldColor = "#39ff14",
  setDataFieldColor = () => {},

  timelineBorderColor = "#38bdf8",
  setTimelineBorderColor = () => {},
  timelineHourMarkerColor = "#818cf8",
  setTimelineHourMarkerColor = () => {},
  timelineSublineColor = "rgba(255,255,255,0.12)",
  setTimelineSublineColor = () => {},
  timelineCardBorderColor = "rgba(255,255,255,0.15)",
  setTimelineCardBorderColor = () => {},

  taskCardGlassStyle = "translucent",
  setTaskCardGlassStyle = () => {},

  cardBgOpacity = 0.45,
  updateCardBgOpacity = () => {},
  cardBgHue = 222,
  updateCardBgHue = () => {},
  underlightingBrightness = 1.0,
  updateUnderlightingBrightness = () => {},
  cardGradientPercent = 0,
  updateCardGradientPercent = () => {},
  cardGradientDirection = "right",
  updateCardGradientDirection = () => {},
  cardOutlineThickness = 1,
  updateCardOutlineThickness = () => {},

  lockedHue = 0,
  updateLockedHue = () => {},
  lockedOpacity = 0.22,
  updateLockedOpacity = () => {},
  lockedNoColor = false,
  updateLockedNoColor = () => {},

  highHue = 38,
  updateHighHue = () => {},
  highOpacity = 0.17,
  updateHighOpacity = () => {},
  highNoColor = false,
  updateHighNoColor = () => {},

  medHue = 45,
  updateMedHue = () => {},
  medOpacity = 0.25,
  updateMedOpacity = () => {},
  medNoColor = false,
  updateMedNoColor = () => {},

  lowHue = 217,
  updateLowHue = () => {},
  lowOpacity = 0.18,
  updateLowOpacity = () => {},
  lowNoColor = false,
  updateLowNoColor = () => {}
}) => {
  // 1. Consume Zustand Settings Slice selectively using precise selectors
  const showSettingsModal = useAppStore((state) => state.showSettingsModal);
  const setShowSettingsModal = useAppStore((state) => state.setShowSettingsModal);
  const settingsCategory = useAppStore((state) => state.settingsCategory);
  const setSettingsCategory = useAppStore((state) => state.setSettingsCategory);
  const expandedSettingId = useAppStore((state) => state.expandedSettingId);
  const setExpandedSettingId = useAppStore((state) => state.setExpandedSettingId);
  const fontSizeScale = useAppStore((state) => state.fontSizeScale);
  const setFontSizeScale = useAppStore((state) => state.setFontSizeScale);
  const dayPlannerFont = useAppStore((state) => state.dayPlannerFont);
  const setDayPlannerFont = useAppStore((state) => state.setDayPlannerFont);
  const dayStartHour = useAppStore((state) => state.dayStartHour);
  const setDayStartHour = useAppStore((state) => state.setDayStartHour);
  const defaultDuration = useAppStore((state) => state.defaultDuration);
  const setDefaultDuration = useAppStore((state) => state.setDefaultDuration);
  const defaultTaskFormMode = useAppStore((state) => state.defaultTaskFormMode);
  const setDefaultTaskFormMode = useAppStore((state) => state.setDefaultTaskFormMode);
  const activeTemplateId = useAppStore((state) => state.activeTemplateId);
  const setTemplate = useAppStore((state) => state.setTemplate);
  const taskCardAnimationMs = useAppStore((state) => state.taskCardAnimationMs);
  const setTaskCardAnimationMs = useAppStore((state) => state.setTaskCardAnimationMs);
  const timelineColumns = useAppStore((state) => state.timelineColumns);
  const setTimelineColumns = useAppStore((state) => state.setTimelineColumns);

  // 2. Transient Authentication States (Isolated inside SettingsDrawer)
  const [authTab, setAuthTab] = useState<"google" | "signin" | "signup">("signin");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authActionLoading, setAuthActionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Styled helper classes matching master system form classes
  const uniformLabelClass = "text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 select-none";
  const uniformInputClass = `w-full h-10 px-3.5 rounded-xl font-bold text-[16px] md:text-xs outline-none border transition-all ${
    isDark 
      ? "bg-slate-955 border-white/5 text-white placeholder-slate-500 focus:border-indigo-500 hover:bg-slate-900/40" 
      : "bg-white border-slate-200 text-slate-800 placeholder-slate-455 focus:border-indigo-500 hover:bg-slate-50/50"
  }`;

  // Firebase email login helper
  const handleLocalEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Auth service is not initialized.");
      return;
    }
    if (!emailInput || !passwordInput) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setAuthActionLoading(true);

    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      setAuthSuccess("Successfully logged in!");
      setEmailInput("");
      setPasswordInput("");
      setAuthTab("signin");
    } catch (err: any) {
      console.error("Sign In Error:", err);
      let friendlyMessage = "Error signing in. Verify email or password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-email") {
        friendlyMessage = "Invalid email or password. Please try again.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Firebase email register/sign up helper
  const handleLocalEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Auth service is not initialized.");
      return;
    }
    if (!emailInput || !passwordInput || !nameInput) {
      setAuthError("Please fill in all registration fields.");
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setAuthActionLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      await updateProfile(userCredential.user, {
        displayName: nameInput
      });
      setAuthSuccess(`Account created! Welcome ${nameInput}.`);
      setEmailInput("");
      setPasswordInput("");
      setNameInput("");
      setAuthTab("signin");
    } catch (err: any) {
      console.error("Sign Up Error:", err);
      let friendlyMessage = "Failed to create account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "This email address is already registered.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "The password is too weak.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthActionLoading(false);
    }
  };

  return (
    <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="System Settings">
      <div className={`space-y-4 text-left ${isDark ? "text-slate-100" : "text-slate-800"}`}>
        
        {/* Settings Category Navigation Tabs */}
        <div className={`flex gap-1 overflow-x-auto pb-1 border-b ${isDark ? "border-white/10" : "border-slate-200"}`}>
          {([
            { id: "auth", label: "Cloud & Sync", icon: <Cloud size={13} /> },
            { id: "display", label: "Layout & Theme", icon: <Layout size={13} /> },
            { id: "time", label: "Time & Rules", icon: <Clock size={13} /> },
            { id: "backups", label: "Manual Backups", icon: <Download size={13} /> }
          ] as const).map((tab) => {
            const isActive = settingsCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSettingsCategory(tab.id);
                  if (tab.id === "auth") setExpandedSettingId("cloud_status");
                  else if (tab.id === "display") setExpandedSettingId("visual_theme");
                  else if (tab.id === "time") setExpandedSettingId("default_duration_sec");
                  else if (tab.id === "backups") setExpandedSettingId("file_backups");
                }}
                className={`px-3 py-2 flex items-center gap-1.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all select-none shrink-0 border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md font-extrabold"
                    : isDark
                      ? "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-100 border-transparent"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Category Pages */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">

          {/* TAB 1: CLOUD & SYNC */}
          {settingsCategory === "auth" && (
            <div className="space-y-3">
              {/* 1.1 Cloud Connection Status indicator */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "cloud_status" ? null : "cloud_status")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Zap size={14} className="text-amber-400 animate-pulse" />
                    <span>Cloud Integration Dashboard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-rose-500"}`} />
                    {expandedSettingId === "cloud_status" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </div>
                </button>
                {expandedSettingId === "cloud_status" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-3.5 text-xs font-semibold`}>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Network Connection:</span>
                      <span className={`flex items-center gap-1.5 font-bold uppercase text-[9px] px-2 py-0.5 rounded ${
                        isOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {isOnline ? "Active Links" : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Firebase Cloud Database Stream:</span>
                      <span className={`flex items-center gap-1 font-bold uppercase text-[9px] px-2 py-0.5 rounded ${
                        currentUser ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-slate-500/10 text-slate-400 border border-white/5"
                      }`}>
                        {currentUser ? "Durable DB Stream Activated" : "Standalone Profile Only"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Google Calendar Sync Bridge:</span>
                      <span className={`flex items-center gap-1 font-bold uppercase text-[9px] px-2 py-0.5 rounded ${
                        gcalAccessToken ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border border-white/5"
                      }`}>
                        {gcalAccessToken ? "Connected & Verified" : "Disconnected"}
                      </span>
                    </div>
                    <p className="text-[9.5px] opacity-60 font-medium leading-relaxed mt-2 pt-2 border-t border-white/5">
                      Your real-time workspace indices and scheduled visual blocks are backed up on Google Cloud Firestore and optionally duplicated to external Google Calendars instantly.
                    </p>
                  </div>
                )}
              </div>

              {/* 1.2 Firebase Profile Authentication */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "firebase_auth" ? null : "firebase_auth")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User size={14} className="text-indigo-400" />
                    <span>Firebase Cloud Sync Account</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {currentUser ? "Synced" : "Offline Profile"}
                    </span>
                    {expandedSettingId === "firebase_auth" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </div>
                </button>
                {expandedSettingId === "firebase_auth" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-4`}>
                    {currentUser ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} alt="User Avatar" className="w-8 h-8 rounded-lg object-cover border border-white/10" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black uppercase text-white shrink-0 shadow-sm">
                              {currentUser.displayName?.slice(0, 2) || currentUser.email?.slice(0, 2) || "U"}
                            </div>
                          )}
                          <div className="text-left min-w-0">
                            <h4 className="text-xs font-black uppercase tracking-wide truncate max-w-[200px]">
                              {currentUser.displayName || "Personal Cloud Vault"}
                            </h4>
                            <p className="text-[9px] text-slate-400 leading-normal font-mono truncate max-w-[200px]">
                              {currentUser.email || "Real-time sync active"}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900/60 border border-white/5 rounded-xl text-[9px] font-semibold text-slate-400 space-y-2">
                          <div className="flex items-center justify-between">
                            <span>Device ID:</span>
                            <span className="font-mono text-slate-200 select-all font-bold">{currentUser.uid.slice(0, 10)}...</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Sync Provider:</span>
                            <span className="font-bold uppercase text-[8px] tracking-wider text-indigo-400">
                              {currentUser.providerData?.[0]?.providerId === "google.com" ? "Google GSuite" : "Direct Email Vault"}
                            </span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            if (confirm("Disconnect and clear all secure real-time sync indices?")) {
                              signOut(auth);
                              setGcalAccessToken(null);
                              setShowSettingsModal(false);
                            }
                          }}
                          className="w-full py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-500 font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          Disconnect Sync Link
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[10px] text-slate-400 leading-normal font-medium">
                          Link your profile with real-time cloud sync. This synchronizes your checklist tasks and timeline calendar streams securely across devices.
                        </p>
                        
                        {/* Login Buttons & Form */}
                        <div className="flex p-0.5 rounded-xl bg-slate-900 border border-white/5 select-none text-center">
                          <button
                            type="button"
                            onClick={() => { setAuthTab("google"); setAuthError(null); setAuthSuccess(null); }}
                            className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${authTab === "google" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                          >
                            Google
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAuthTab("signin"); setAuthError(null); setAuthSuccess(null); }}
                            className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${authTab === "signin" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                          >
                            Log In
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAuthTab("signup"); setAuthError(null); setAuthSuccess(null); }}
                            className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${authTab === "signup" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                          >
                            Register
                          </button>
                        </div>

                        {authError && (
                          <div className="p-2.5 bg-rose-500/5 text-rose-400 text-[9.5px] font-bold rounded-xl border border-rose-500/10 flex items-center gap-2 leading-relaxed text-left">
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{authError}</span>
                          </div>
                        )}

                        {authSuccess && (
                          <div className="p-2.5 bg-emerald-500/5 text-emerald-400 text-[9.5px] font-bold rounded-xl border border-emerald-500/10 flex items-center gap-2 leading-relaxed text-left">
                            <CheckCircle2 size={12} className="shrink-0" />
                            <span>{authSuccess}</span>
                          </div>
                        )}

                        {authTab === "google" && (
                          <button
                            type="button"
                            disabled={authActionLoading}
                            onClick={async () => {
                              if (!auth) return;
                              setAuthError(null);
                              setAuthSuccess(null);
                              setAuthActionLoading(true);
                              try {
                                const provider = new GoogleAuthProvider();
                                provider.addScope("https://www.googleapis.com/auth/calendar.events");
                                provider.addScope("https://www.googleapis.com/auth/calendar");
                                provider.addScope("https://www.googleapis.com/auth/contacts");
                                const result = await signInWithPopup(auth, provider);
                                const credential = GoogleAuthProvider.credentialFromResult(result);
                                const token = credential?.accessToken;
                                if (token) {
                                  setGcalAccessToken(token);
                                  localStorage.setItem("gcal_sync_enabled", "true");
                                  setIsGcalSyncActive(true);
                                  setContactsAccessToken(token);
                                  localStorage.setItem("contacts_access_token", token);
                                  localStorage.setItem("contacts_sync_enabled", "true");
                                  pullGoogleContacts(token).catch(e => console.error("Auto contacts sync failed:", e));
                                }
                                setAuthSuccess(`Connected as ${result.user.displayName || result.user.email}`);
                              } catch (err: any) {
                                if (err?.code === "auth/cancelled-popup-request" || err?.code === "auth/popup-closed-by-user" || err?.code === "auth/popup-blocked") {
                                  setAuthError("Sign-in request was cancelled or closed.");
                                } else {
                                  console.error("Login failed:", err);
                                  setAuthError(err.message || "Failed to sign in with Google.");
                                }
                              } finally {
                                setAuthActionLoading(false);
                              }
                            }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all text-center flex items-center justify-center gap-2 active:scale-95 shadow-lg select-none cursor-pointer"
                          >
                            <Sparkles size={11} className="text-amber-400 animate-pulse" />
                            <span>Continue with Google Account</span>
                          </button>
                        )}

                        {/* Email Sign In Form */}
                        {authTab === "signin" && (
                          <form onSubmit={handleLocalEmailSignIn} className="space-y-3 text-left">
                            <div>
                              <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-slate-400">
                                  <Mail size={12} />
                                </span>
                                <input
                                  type="email"
                                  required
                                  placeholder="name@domain.com"
                                  value={emailInput}
                                  onChange={(e) => setEmailInput(e.target.value)}
                                  disabled={authActionLoading}
                                  className={`w-full pl-9 pr-3 py-2 bg-slate-950/60 border ${isDark ? "border-white/10 text-white" : "border-slate-300 text-slate-900"} rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">Password</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-slate-400">
                                  <Lock size={12} />
                                </span>
                                <input
                                  type="password"
                                  required
                                  placeholder="••••••••"
                                  value={passwordInput}
                                  onChange={(e) => setPasswordInput(e.target.value)}
                                  disabled={authActionLoading}
                                  className={`w-full pl-9 pr-3 py-2 bg-slate-955/60 border ${isDark ? "border-white/10 text-white" : "border-slate-300 text-slate-900"} rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500`}
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={authActionLoading}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                            >
                              {authActionLoading ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />}
                              <span>Sign In to Cloud Vault</span>
                            </button>
                          </form>
                        )}

                        {/* Email Sign Up / Register Form */}
                        {authTab === "signup" && (
                          <form onSubmit={handleLocalEmailSignUp} className="space-y-3 text-left">
                            <div>
                              <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-slate-400">
                                  <User size={12} />
                                </span>
                                <input
                                  type="text"
                                  required
                                  placeholder="Your Name"
                                  value={nameInput}
                                  onChange={(e) => setNameInput(e.target.value)}
                                  disabled={authActionLoading}
                                  className={`w-full pl-9 pr-3 py-2 bg-slate-955/60 border ${isDark ? "border-white/10 text-white" : "border-slate-300 text-slate-900"} rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-slate-400">
                                  <Mail size={12} />
                                </span>
                                <input
                                  type="email"
                                  required
                                  placeholder="name@domain.com"
                                  value={emailInput}
                                  onChange={(e) => setEmailInput(e.target.value)}
                                  disabled={authActionLoading}
                                  className={`w-full pl-9 pr-3 py-2 bg-slate-955/60 border ${isDark ? "border-white/10 text-white" : "border-slate-300 text-slate-900"} rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1">Password</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-2.5 text-slate-400">
                                  <Lock size={12} />
                                </span>
                                <input
                                  type="password"
                                  required
                                  placeholder="Minimum 6 characters"
                                  value={passwordInput}
                                  onChange={(e) => setPasswordInput(e.target.value)}
                                  disabled={authActionLoading}
                                  className={`w-full pl-9 pr-3 py-2 bg-slate-955/60 border ${isDark ? "border-white/10 text-white" : "border-slate-300 text-slate-900"} rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500`}
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={authActionLoading}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                            >
                              {authActionLoading ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
                              <span>Register Vault Account</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LAYOUT & THEME */}
          {settingsCategory === "display" && (
            <div className="space-y-3">
              {/* 2.1 Theme Settings card */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "visual_theme" ? null : "visual_theme")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layout size={14} className="text-indigo-400" />
                    <span>Workspace Visual Theme</span>
                  </div>
                  {expandedSettingId === "visual_theme" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </button>
                {expandedSettingId === "visual_theme" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Dark Mode Contrast:</span>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`px-3 py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                          isDark 
                            ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-sm" 
                            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isDark ? "Dark Theme Enabled" : "Light Theme Enabled"}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-xs font-bold text-slate-400">Interface Typography:</span>
                      <div className="flex p-0.5 rounded-xl bg-slate-900 border border-white/5">
                        {(["Standard", "Handwriting"] as const).map((font) => (
                          <button
                            key={font}
                            type="button"
                            onClick={() => {
                              setDayPlannerFont(font);
                              localStorage.setItem("day_planner_font", font);
                              triggerHaptic("medium");
                            }}
                            className={`px-3 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg transition-all select-none ${
                              dayPlannerFont === font ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {font}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-xs font-bold text-slate-400">Timeline Panel View:</span>
                      <div className="flex p-0.5 rounded-xl bg-slate-900 border border-white/5">
                        {[
                          { cols: 1, label: "1 Column View" },
                          { cols: 2, label: "2 Column View" }
                        ].map((option) => (
                          <button
                            key={option.cols}
                            type="button"
                            onClick={() => {
                              setTimelineColumns(option.cols as 1 | 2);
                              triggerHaptic("medium");
                            }}
                            className={`px-3 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg transition-all select-none cursor-pointer ${
                              timelineColumns === option.cols ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Pull Down Choices & Narrative Color:</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full border border-white/20 shadow-inner" 
                            style={{ backgroundColor: dataFieldColor }}
                          />
                          <input 
                            type="color" 
                            value={dataFieldColor} 
                            onChange={(e) => {
                              setDataFieldColor(e.target.value);
                              triggerHaptic("light");
                            }}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
                            title="Custom Color Picker"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { name: "Fluorescent Green", color: "#39ff14" },
                          { name: "Indigo", color: "#818cf8" },
                          { name: "Sky", color: "#38bdf8" },
                          { name: "Emerald", color: "#34d399" },
                          { name: "Amber", color: "#fbbf24" },
                          { name: "Rose", color: "#f43f5e" },
                          { name: "Purple", color: "#c084fc" },
                          { name: "White", color: "#ffffff" }
                        ].map((swatch) => (
                          <button
                            key={swatch.color}
                            type="button"
                            onClick={() => {
                              setDataFieldColor(swatch.color);
                              triggerHaptic("medium");
                            }}
                            className={`px-2 py-1 text-[9px] font-bold rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                              dataFieldColor.toLowerCase() === swatch.color.toLowerCase()
                                ? "border-white bg-white/20 text-white shadow-sm"
                                : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: swatch.color }} />
                            {swatch.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Grid Colors Customization */}
                    <div className="border-t border-white/5 pt-3 space-y-2.5">
                      <div className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Palette size={13} />
                        <span>Timeline & Task Card Colors</span>
                      </div>

                      {/* 1. Timeline Outer Border */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Timeline Outer Border:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: timelineBorderColor }} />
                          <input 
                            type="color" 
                            value={timelineBorderColor.startsWith('#') ? timelineBorderColor : '#38bdf8'} 
                            onChange={(e) => { setTimelineBorderColor(e.target.value); triggerHaptic("light"); }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                          />
                        </div>
                      </div>

                      {/* 2. Hourly Markers Color */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Hourly Markers Color:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: timelineHourMarkerColor }} />
                          <input 
                            type="color" 
                            value={timelineHourMarkerColor.startsWith('#') ? timelineHourMarkerColor : '#818cf8'} 
                            onChange={(e) => { setTimelineHourMarkerColor(e.target.value); triggerHaptic("light"); }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                          />
                        </div>
                      </div>

                      {/* 3. Sub-line / Gridlines Color */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">15m & 30m Grid Lines:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: timelineSublineColor }} />
                          <input 
                            type="color" 
                            value={timelineSublineColor.startsWith('#') ? timelineSublineColor : '#38bdf8'} 
                            onChange={(e) => { setTimelineSublineColor(e.target.value); triggerHaptic("light"); }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                          />
                        </div>
                      </div>

                      {/* 4. Task Card Border Color */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Task Card Border Color:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: timelineCardBorderColor }} />
                          <input 
                            type="color" 
                            value={timelineCardBorderColor.startsWith('#') ? timelineCardBorderColor : '#818cf8'} 
                            onChange={(e) => { setTimelineCardBorderColor(e.target.value); triggerHaptic("light"); }}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Glass-Like Task Card Background Styles Choice */}
                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Glass-Like Card Background:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "translucent", label: "Translucent Slate", desc: "Balanced dark glass" },
                          { id: "frosted", label: "Frosted Light", desc: "High blur white frost" },
                          { id: "clear", label: "Crystal Clear", desc: "Ultra-minimal sheer" },
                          { id: "emerald-glass", label: "Emerald Glass", desc: "Luminous green tint" },
                          { id: "sapphire-glass", label: "Sapphire Glass", desc: "Deep indigo glow" },
                          { id: "tinted-violet", label: "Violet Glass", desc: "Neon purple aura" },
                          { id: "obsidian", label: "Obsidian Mirror", desc: "Deep dark glass" },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setTaskCardGlassStyle(preset.id);
                              triggerHaptic("medium");
                            }}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              taskCardGlassStyle === preset.id
                                ? "bg-indigo-600/30 border-indigo-400 text-white shadow-md ring-1 ring-indigo-400/50"
                                : "bg-slate-900/60 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            <div className="text-[10px] font-extrabold">{preset.label}</div>
                            <div className="text-[8px] text-slate-400">{preset.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Task Card Shuffle / Reorder Slide Animation Speed */}
                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <SlidersHorizontal size={13} className="text-indigo-400" />
                          <span className="text-xs font-bold text-slate-300">Task Card Shuffle Speed:</span>
                        </div>
                        <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 rounded-lg">
                          {taskCardAnimationMs} ms
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Fast</span>
                        <input
                          type="range"
                          min={100}
                          max={2000}
                          step={50}
                          value={taskCardAnimationMs}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setTaskCardAnimationMs(val);
                            triggerHaptic("light");
                          }}
                          className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Slow</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { label: "Fast (200ms)", val: 200 },
                          { label: "Normal (400ms)", val: 400 },
                          { label: "Smooth (600ms)", val: 600 },
                          { label: "Slow Slide (1000ms)", val: 1000 },
                          { label: "Ultra Slow (1500ms)", val: 1500 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => {
                              setTaskCardAnimationMs(preset.val);
                              triggerHaptic("medium");
                            }}
                            className={`px-2 py-1 text-[8.5px] font-bold rounded-lg border transition-all cursor-pointer ${
                              taskCardAnimationMs === preset.val
                                ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                                : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9.5px] text-slate-400 leading-tight">
                        Controls the duration (in milliseconds) of the sliding movement when task panel cards reorder and shuffle into new positions.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 2.1.5 Productivity Engine Presets card */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "ux_templates" ? null : "ux_templates")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Productivity Engine Presets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      {activeTemplateId === 'deep-work-matrix' ? "Deep Work Active" : activeTemplateId}
                    </span>
                    {expandedSettingId === "ux_templates" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </div>
                </button>
                {expandedSettingId === "ux_templates" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-3`}>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Select an orchestration preset. These pre-configure panel placement, grid layouts, animation rates, typography scale, and background accent values:
                    </p>
                    <div className="space-y-2">
                      {([
                        {
                          id: 'deep-work-matrix',
                          name: 'Deep Work Matrix',
                          desc: 'High-intensity monochrome focus engine. Minimal micro-animations (0.1s), compact spacing, slate dark accents, simplified cards.',
                          badge: 'Recommended',
                          color: 'border-slate-500'
                        },
                        {
                          id: 'dashboard-heavy',
                          name: 'Dashboard Heavy',
                          desc: 'Standard multi-panel visual grid. Classic indigo curves, standard spacing, full data density, and live activities.',
                          badge: 'Default',
                          color: 'border-indigo-500'
                        },
                        {
                          id: 'minimalist-focus',
                          name: 'Minimalist Focus',
                          desc: 'Quiet, slow-breathing spatial workspace. High spacing, quiet dotted background, emerald accents, and glassmorphism levels.',
                          badge: 'Calm',
                          color: 'border-emerald-500'
                        },
                        {
                          id: 'cinematic-dark',
                          name: 'Cinematic Dark',
                          desc: 'Rich glowing high-contrast dark space. Vibrant rose accent lights, organic motion sweeps, and deep atmospheric blur.',
                          badge: 'Atmospheric',
                          color: 'border-rose-500'
                        },
                        {
                          id: 'high-density-compact',
                          name: 'High Density Compact',
                          desc: 'Data-rich report matrix. Amber accents, tiny typography scale, ultra-tight grid spacing, and live micro-minimaps.',
                          badge: 'Compact',
                          color: 'border-amber-500'
                        }
                      ] as const).map((tmpl) => {
                        const isSelected = activeTemplateId === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => {
                              setTemplate(tmpl.id);
                              if (tmpl.id === 'deep-work-matrix') {
                                updateCardBgOpacity(0.20);
                                updateUnderlightingBrightness(0.2);
                                updateCardOutlineThickness(1);
                                updateLockedNoColor(true);
                                updateHighNoColor(true);
                                updateMedNoColor(true);
                                updateLowNoColor(true);
                              } else if (tmpl.id === 'dashboard-heavy') {
                                updateCardBgOpacity(0.45);
                                updateUnderlightingBrightness(1.0);
                                updateCardOutlineThickness(1.5);
                                updateCardGradientPercent(15);
                                updateLockedNoColor(false);
                                updateHighNoColor(false);
                                updateMedNoColor(false);
                                updateLowNoColor(false);
                              } else if (tmpl.id === 'minimalist-focus') {
                                updateCardBgOpacity(0.35);
                                updateUnderlightingBrightness(0.6);
                                updateCardOutlineThickness(1);
                                updateCardGradientPercent(5);
                                updateLockedNoColor(false);
                                updateHighNoColor(false);
                                updateMedNoColor(false);
                                updateLowNoColor(false);
                              } else if (tmpl.id === 'cinematic-dark') {
                                updateCardBgOpacity(0.60);
                                updateUnderlightingBrightness(1.6);
                                updateCardOutlineThickness(2);
                                updateCardGradientPercent(35);
                                updateLockedNoColor(false);
                                updateHighNoColor(false);
                                updateMedNoColor(false);
                                updateLowNoColor(false);
                              } else if (tmpl.id === 'high-density-compact') {
                                updateCardBgOpacity(0.30);
                                updateUnderlightingBrightness(0.5);
                                updateCardOutlineThickness(1);
                                updateCardGradientPercent(10);
                                updateLockedNoColor(false);
                                updateHighNoColor(false);
                                updateMedNoColor(false);
                                updateLowNoColor(false);
                              }
                              triggerHaptic("heavy");
                            }}
                            className={`w-full p-3.5 rounded-xl border text-left transition-all duration-300 relative flex flex-col gap-1 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                              isSelected
                                ? `bg-slate-900/80 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]`
                                : isDark
                                  ? 'bg-slate-955/30 border-white/5 hover:border-white/10'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-xs font-black uppercase tracking-wide ${isSelected ? 'text-indigo-400' : isDark ? 'text-white' : 'text-slate-800'}`}>
                                {tmpl.name}
                              </span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white shadow-sm' 
                                  : isDark 
                                    ? 'bg-white/5 text-slate-400' 
                                    : 'bg-slate-100 text-slate-500'
                              }`}>
                                {tmpl.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold leading-normal select-none">
                              {tmpl.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2.1.8 Card Opacity & Color Choice Customization */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "card_styling" ? null : "card_styling")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Palette size={14} className="text-violet-400" />
                    <span>Card Opacity & Color Customization</span>
                  </div>
                  {expandedSettingId === "card_styling" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </button>
                {expandedSettingId === "card_styling" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-5 text-xs`}>
                    {/* Global Card Background Opacity & Hue */}
                    <div className="space-y-3 pb-3 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <label className={uniformLabelClass}>Card Background Opacity</label>
                        <span className="font-mono text-[10px] text-indigo-400 font-bold">{Math.round(cardBgOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={cardBgOpacity}
                        onChange={(e) => updateCardBgOpacity(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <label className={uniformLabelClass}>Card Background Color Palette</label>
                        <span className="font-mono text-[10px] text-indigo-400 font-bold">{cardBgHue}°</span>
                      </div>
                      {/* Color Palette Swatches for Card Background Hue */}
                      <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-white/5">
                        {[
                          { name: "Crimson", hue: 350, bg: "#f43f5e" },
                          { name: "Red", hue: 0, bg: "#ef4444" },
                          { name: "Coral", hue: 15, bg: "#ff6b4a" },
                          { name: "Amber", hue: 35, bg: "#f59e0b" },
                          { name: "Gold", hue: 50, bg: "#eab308" },
                          { name: "Emerald", hue: 140, bg: "#10b981" },
                          { name: "Teal", hue: 175, bg: "#14b8a6" },
                          { name: "Sky", hue: 200, bg: "#0ea5e9" },
                          { name: "Royal", hue: 225, bg: "#2563eb" },
                          { name: "Indigo", hue: 250, bg: "#6366f1" },
                          { name: "Violet", hue: 280, bg: "#a855f7" },
                          { name: "Fuchsia", hue: 310, bg: "#d946ef" },
                          { name: "Rose", hue: 335, bg: "#f43f5e" },
                          { name: "Slate", hue: 215, bg: "#64748b" },
                        ].map((swatch) => {
                          const isSelected = Math.abs(cardBgHue - swatch.hue) < 12 || (swatch.hue === 0 && cardBgHue > 350);
                          return (
                            <button
                              key={`bg-${swatch.name}-${swatch.hue}`}
                              type="button"
                              onClick={() => updateCardBgHue?.(swatch.hue)}
                              className={`group relative flex flex-col items-center justify-center p-1 rounded-lg transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-500/30 ring-2 ring-indigo-400 border-indigo-300 scale-105 z-10 shadow-md"
                                  : "hover:bg-white/10 border border-transparent"
                              }`}
                              title={`${swatch.name} (${swatch.hue}°)`}
                            >
                              <div
                                className="w-4 h-4 rounded-full border border-white/20 shadow-inner group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: swatch.bg }}
                              />
                              <span className="text-[7.5px] font-bold text-slate-300 mt-0.5 truncate max-w-[34px]">
                                {swatch.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className={uniformLabelClass}>Underlighting Glow Brightness</label>
                        <span className="font-mono text-[10px] text-amber-400 font-bold">{underlightingBrightness.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={underlightingBrightness}
                        onChange={(e) => updateUnderlightingBrightness(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <label className={uniformLabelClass}>Card Outline Thickness</label>
                        <span className="font-mono text-[10px] text-sky-400 font-bold">{cardOutlineThickness}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={cardOutlineThickness}
                        onChange={(e) => updateCardOutlineThickness(parseInt(e.target.value, 10))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <label className={uniformLabelClass}>Card Gradient Percentage</label>
                        <span className="font-mono text-[10px] text-purple-400 font-bold">{cardGradientPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={cardGradientPercent}
                        onChange={(e) => updateCardGradientPercent(parseInt(e.target.value, 10))}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    {/* Card Color Choices & Toggles by Card Type */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Card Category Specific Color Choices
                      </span>

                      {/* Palette Preset Definition */}
                      {(() => {
                        const PALETTE_PRESETS = [
                          { name: "Crimson", hue: 350, bg: "#f43f5e" },
                          { name: "Red", hue: 0, bg: "#ef4444" },
                          { name: "Coral", hue: 15, bg: "#ff6b4a" },
                          { name: "Amber", hue: 35, bg: "#f59e0b" },
                          { name: "Gold", hue: 50, bg: "#eab308" },
                          { name: "Emerald", hue: 140, bg: "#10b981" },
                          { name: "Teal", hue: 175, bg: "#14b8a6" },
                          { name: "Sky", hue: 200, bg: "#0ea5e9" },
                          { name: "Royal", hue: 225, bg: "#2563eb" },
                          { name: "Indigo", hue: 250, bg: "#6366f1" },
                          { name: "Violet", hue: 280, bg: "#a855f7" },
                          { name: "Fuchsia", hue: 310, bg: "#d946ef" },
                          { name: "Rose", hue: 335, bg: "#f43f5e" },
                          { name: "Slate", hue: 215, bg: "#64748b" },
                        ];

                        return (
                          <>
                            {/* Locked / Appointment Cards */}
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${lockedHue}, 80%, 55%)` }} />
                                  <span className="font-extrabold text-[11px] text-rose-400">Appointment / Locked Cards</span>
                                </div>
                                <label className="flex items-center gap-1.5 text-[9px] text-slate-400 cursor-pointer font-bold select-none">
                                  <input
                                    type="checkbox"
                                    checked={lockedNoColor}
                                    onChange={(e) => updateLockedNoColor(e.target.checked)}
                                    className="rounded accent-rose-500"
                                  />
                                  Monochrome
                                </label>
                              </div>
                              {!lockedNoColor && (
                                <div className="space-y-2.5 pt-1">
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                                    Color Palette Selection
                                  </span>
                                  <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-white/5">
                                    {PALETTE_PRESETS.map((swatch) => {
                                      const isSelected = Math.abs(lockedHue - swatch.hue) < 12 || (swatch.hue === 0 && lockedHue > 350);
                                      return (
                                        <button
                                          key={`locked-${swatch.name}-${swatch.hue}`}
                                          type="button"
                                          onClick={() => updateLockedHue(swatch.hue)}
                                          className={`group relative flex flex-col items-center justify-center p-1 rounded-lg transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-rose-500/30 ring-2 ring-rose-400 border-rose-300 scale-105 z-10 shadow-md"
                                              : "hover:bg-white/10 border border-transparent"
                                          }`}
                                          title={`${swatch.name} (${swatch.hue}°)`}
                                        >
                                          <div
                                            className="w-4 h-4 rounded-full border border-white/20 shadow-inner group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: swatch.bg }}
                                          />
                                          <span className="text-[7.5px] font-bold text-slate-300 mt-0.5 truncate max-w-[34px]">
                                            {swatch.name}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex justify-between text-[9px] text-slate-400 pt-1">
                                    <span>Opacity ({Math.round(lockedOpacity * 100)}%)</span>
                                    <span>Hue Fine-Tune ({lockedHue}°)</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.05"
                                    max="1.0"
                                    step="0.05"
                                    value={lockedOpacity}
                                    onChange={(e) => updateLockedOpacity(parseFloat(e.target.value))}
                                    className="w-full accent-rose-500 cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>

                            {/* High Priority Cards */}
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${highHue}, 80%, 55%)` }} />
                                  <span className="font-extrabold text-[11px] text-amber-400">High Priority Cards</span>
                                </div>
                                <label className="flex items-center gap-1.5 text-[9px] text-slate-400 cursor-pointer font-bold select-none">
                                  <input
                                    type="checkbox"
                                    checked={highNoColor}
                                    onChange={(e) => updateHighNoColor(e.target.checked)}
                                    className="rounded accent-amber-500"
                                  />
                                  Monochrome
                                </label>
                              </div>
                              {!highNoColor && (
                                <div className="space-y-2.5 pt-1">
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                                    Color Palette Selection
                                  </span>
                                  <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-white/5">
                                    {PALETTE_PRESETS.map((swatch) => {
                                      const isSelected = Math.abs(highHue - swatch.hue) < 12 || (swatch.hue === 0 && highHue > 350);
                                      return (
                                        <button
                                          key={`high-${swatch.name}-${swatch.hue}`}
                                          type="button"
                                          onClick={() => updateHighHue(swatch.hue)}
                                          className={`group relative flex flex-col items-center justify-center p-1 rounded-lg transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-amber-500/30 ring-2 ring-amber-400 border-amber-300 scale-105 z-10 shadow-md"
                                              : "hover:bg-white/10 border border-transparent"
                                          }`}
                                          title={`${swatch.name} (${swatch.hue}°)`}
                                        >
                                          <div
                                            className="w-4 h-4 rounded-full border border-white/20 shadow-inner group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: swatch.bg }}
                                          />
                                          <span className="text-[7.5px] font-bold text-slate-300 mt-0.5 truncate max-w-[34px]">
                                            {swatch.name}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex justify-between text-[9px] text-slate-400 pt-1">
                                    <span>Opacity ({Math.round(highOpacity * 100)}%)</span>
                                    <span>Hue Fine-Tune ({highHue}°)</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.05"
                                    max="1.0"
                                    step="0.05"
                                    value={highOpacity}
                                    onChange={(e) => updateHighOpacity(parseFloat(e.target.value))}
                                    className="w-full accent-amber-500 cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Medium Priority Cards */}
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${medHue}, 80%, 55%)` }} />
                                  <span className="font-extrabold text-[11px] text-yellow-400">Medium Priority Cards</span>
                                </div>
                                <label className="flex items-center gap-1.5 text-[9px] text-slate-400 cursor-pointer font-bold select-none">
                                  <input
                                    type="checkbox"
                                    checked={medNoColor}
                                    onChange={(e) => updateMedNoColor(e.target.checked)}
                                    className="rounded accent-yellow-500"
                                  />
                                  Monochrome
                                </label>
                              </div>
                              {!medNoColor && (
                                <div className="space-y-2.5 pt-1">
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                                    Color Palette Selection
                                  </span>
                                  <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-white/5">
                                    {PALETTE_PRESETS.map((swatch) => {
                                      const isSelected = Math.abs(medHue - swatch.hue) < 12 || (swatch.hue === 0 && medHue > 350);
                                      return (
                                        <button
                                          key={`med-${swatch.name}-${swatch.hue}`}
                                          type="button"
                                          onClick={() => updateMedHue(swatch.hue)}
                                          className={`group relative flex flex-col items-center justify-center p-1 rounded-lg transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-yellow-500/30 ring-2 ring-yellow-400 border-yellow-300 scale-105 z-10 shadow-md"
                                              : "hover:bg-white/10 border border-transparent"
                                          }`}
                                          title={`${swatch.name} (${swatch.hue}°)`}
                                        >
                                          <div
                                            className="w-4 h-4 rounded-full border border-white/20 shadow-inner group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: swatch.bg }}
                                          />
                                          <span className="text-[7.5px] font-bold text-slate-300 mt-0.5 truncate max-w-[34px]">
                                            {swatch.name}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex justify-between text-[9px] text-slate-400 pt-1">
                                    <span>Opacity ({Math.round(medOpacity * 100)}%)</span>
                                    <span>Hue Fine-Tune ({medHue}°)</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.05"
                                    max="1.0"
                                    step="0.05"
                                    value={medOpacity}
                                    onChange={(e) => updateMedOpacity(parseFloat(e.target.value))}
                                    className="w-full accent-yellow-500 cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Low Priority Cards */}
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${lowHue}, 80%, 55%)` }} />
                                  <span className="font-extrabold text-[11px] text-sky-400">Low Priority Cards</span>
                                </div>
                                <label className="flex items-center gap-1.5 text-[9px] text-slate-400 cursor-pointer font-bold select-none">
                                  <input
                                    type="checkbox"
                                    checked={lowNoColor}
                                    onChange={(e) => updateLowNoColor(e.target.checked)}
                                    className="rounded accent-sky-500"
                                  />
                                  Monochrome
                                </label>
                              </div>
                              {!lowNoColor && (
                                <div className="space-y-2.5 pt-1">
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                                    Color Palette Selection
                                  </span>
                                  <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-white/5">
                                    {PALETTE_PRESETS.map((swatch) => {
                                      const isSelected = Math.abs(lowHue - swatch.hue) < 12 || (swatch.hue === 0 && lowHue > 350);
                                      return (
                                        <button
                                          key={`low-${swatch.name}-${swatch.hue}`}
                                          type="button"
                                          onClick={() => updateLowHue(swatch.hue)}
                                          className={`group relative flex flex-col items-center justify-center p-1 rounded-lg transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-sky-500/30 ring-2 ring-sky-400 border-sky-300 scale-105 z-10 shadow-md"
                                              : "hover:bg-white/10 border border-transparent"
                                          }`}
                                          title={`${swatch.name} (${swatch.hue}°)`}
                                        >
                                          <div
                                            className="w-4 h-4 rounded-full border border-white/20 shadow-inner group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: swatch.bg }}
                                          />
                                          <span className="text-[7.5px] font-bold text-slate-300 mt-0.5 truncate max-w-[34px]">
                                            {swatch.name}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex justify-between text-[9px] text-slate-400 pt-1">
                                    <span>Opacity ({Math.round(lowOpacity * 100)}%)</span>
                                    <span>Hue Fine-Tune ({lowHue}°)</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.05"
                                    max="1.0"
                                    step="0.05"
                                    value={lowOpacity}
                                    onChange={(e) => updateLowOpacity(parseFloat(e.target.value))}
                                    className="w-full accent-sky-500 cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* 2.2 Text Size Settings card */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "text_scale" ? null : "text_scale")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal size={14} className="text-indigo-400" />
                    <span>Scale & Spacing Settings</span>
                  </div>
                  {expandedSettingId === "text_scale" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </button>
                {expandedSettingId === "text_scale" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Application Font Scale:</span>
                      <div className="flex p-0.5 rounded-xl bg-slate-900 border border-white/5">
                        {([
                          { id: "normal", label: "Normal" },
                          { id: "readable", label: "Readable (+10%)" },
                          { id: "large", label: "Large (+20%)" }
                        ] as const).map((sz) => {
                          const isActive = fontSizeScale === sz.id;
                          return (
                            <button
                              key={sz.id}
                              type="button"
                              onClick={() => {
                                setFontSizeScale(sz.id);
                                localStorage.setItem("font_size_scale", sz.id);
                                saveSystemSettingsToCloud({ fontSizeScale: sz.id });
                                triggerHaptic("medium");
                              }}
                              className={`px-3 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg transition-all select-none ${
                                isActive ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                              }`}
                            >
                              {sz.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TIME & RULES */}
          {settingsCategory === "time" && (
            <div className="space-y-3">
              {/* 3.1 Rules & Durations Settings */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "default_duration_sec" ? null : "default_duration_sec")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock size={14} className="text-amber-400" />
                    <span>Rules & Day Scheduling Start</span>
                  </div>
                  {expandedSettingId === "default_duration_sec" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </button>
                {expandedSettingId === "default_duration_sec" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-4`}>
                    {/* Day Start Hour */}
                    <div className="space-y-1">
                      <label className={uniformLabelClass}>Day Start Hours (Local Time)</label>
                      <input
                        type="time"
                        value={dayStartHour}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDayStartHour(val);
                          localStorage.setItem("day_start_hour", val);
                          saveSystemSettingsToCloud({ dayStartHour: val });
                          triggerHaptic("medium");
                        }}
                        className={uniformInputClass}
                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                      />
                      <p className="text-[9px] opacity-60">The hourly offset when your interactive visual timeline restarts schedule calculation.</p>
                    </div>

                    {/* Default Task Duration */}
                    <div className="space-y-1 pt-3 border-t border-white/5">
                      <label className={uniformLabelClass}>Default Task Duration Preset</label>
                      <select
                        value={defaultDuration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setDefaultDuration(val);
                          localStorage.setItem("default_duration", val.toString());
                          saveSystemSettingsToCloud({ defaultDuration: val });
                          triggerHaptic("medium");
                        }}
                        className={uniformInputClass}
                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                      >
                        {[15, 30, 45, 60, 75, 90, 105, 120].map((mins) => (
                          <option key={mins} value={mins}>{mins} minutes</option>
                        ))}
                      </select>
                      <p className="text-[9px] opacity-60">Default duration applied when planning and mapping tasks with unspecified length.</p>
                    </div>

                    {/* Default Entry Form Mode */}
                    <div className="space-y-1 pt-3 border-t border-white/5">
                      <label className={uniformLabelClass}>Default Task Entry Form</label>
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {(["basic", "standard", "narrative"] as const).map((m) => {
                          const isSel = defaultTaskFormMode === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setDefaultTaskFormMode(m);
                                triggerHaptic("medium");
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer text-center ${
                                isSel
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                                  : isDark
                                    ? "bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {m === "basic" ? "Basic" : m === "standard" ? "Standard" : "Narrative"}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] opacity-60">Default layout when opening the task creation and edit dialog.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MANUAL BACKUPS */}
          {settingsCategory === "backups" && (
            <div className="space-y-3">
              {/* 4.1 JSON Import & Export */}
              <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                isDark ? "border-white/5 bg-slate-955/40" : "border-slate-200 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => setExpandedSettingId(expandedSettingId === "file_backups" ? null : "file_backups")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors font-black text-xs uppercase tracking-wider ${
                    isDark ? "hover:bg-slate-900/60 text-slate-100" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FolderClosed size={14} className="text-indigo-400" />
                    <span>Manual JSON Data file backup</span>
                  </div>
                  {expandedSettingId === "file_backups" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </button>
                {expandedSettingId === "file_backups" && (
                  <div className={`p-4 border-t ${isDark ? "border-white/5 bg-slate-955/85" : "border-slate-100 bg-slate-50/50"} space-y-3`}>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className={`py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                          isDark
                            ? "bg-slate-955 hover:bg-slate-900 border-white/5 text-white"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm"
                        }`}
                      >
                        <Download size={12} />
                        Export Backup
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                          isDark
                            ? "bg-slate-955 hover:bg-slate-900 border-white/5 text-white"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm"
                        }`}
                      >
                        <Upload size={12} />
                        Import Backup
                      </button>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportJSON}
                        accept=".json"
                        className="hidden"
                      />
                    </div>
                    <p className="text-[9.5px] opacity-60">Restore your complete workspace index instantly from a saved manual backup file.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
});

SettingsDrawer.displayName = "SettingsDrawer";
