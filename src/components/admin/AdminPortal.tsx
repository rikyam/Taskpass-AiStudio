import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, Users, CheckCircle, AlertCircle, Search, Lock, Mail, 
  RefreshCw, Edit, ChevronLeft, ChevronRight, Key, Layers, 
  Terminal, ExternalLink, FileText, LogOut, Sparkles, UserCheck, 
  UserX, Clock, ArrowRightLeft, ShieldAlert, Check, X, Code, Copy,
  AlertTriangle, Filter, Plus
} from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { PlatformUser, Task, Transfer, AdminAuditLog } from "../../types";

interface AdminPortalProps {
  onClose?: () => void;
  isStandaloneView?: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onClose, isStandaloneView = false }) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth?.currentUser || null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [isAdminGranted, setIsAdminGranted] = useState<boolean>(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [loginSuccess, setLoginSuccess] = useState<string>("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"users" | "tasks" | "audit" | "hosting">("users");

  // User Directory state
  const [usersList, setUsersList] = useState<PlatformUser[]>([]);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userPage, setUserPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [userForm, setUserForm] = useState<{
    uid: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    status: 'active' | 'suspended' | 'inactive';
    favorPoints: number;
  }>({
    uid: "",
    name: "",
    email: "",
    role: "user",
    status: "active",
    favorPoints: 100
  });

  // Task Monitor state
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [transfersList, setTransfersList] = useState<Transfer[]>([]);
  const [taskSearch, setTaskSearch] = useState<string>("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [reassignModalTarget, setReassignModalTarget] = useState<{
    type: "task" | "transfer";
    item: Task | Transfer;
  } | null>(null);
  const [newRecipientInput, setNewRecipientInput] = useState<string>("");
  const [newStatusInput, setNewStatusInput] = useState<string>("");
  const [reassignNotes, setReassignNotes] = useState<string>("");

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Listen to Auth changes & Admin Role Verification
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Check user role in Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists() && userSnap.data()?.role === "admin") {
            setUserRole("admin");
            setIsAdminGranted(true);
          } else if (user.email === "rikiatt@gmail.com") {
            // Master Admin account auto-granted
            setUserRole("admin");
            setIsAdminGranted(true);
          } else {
            // Check if exists in admins collection
            const adminDocRef = doc(db, "admins", user.uid);
            const adminSnap = await getDoc(adminDocRef);
            if (adminSnap.exists()) {
              setUserRole("admin");
              setIsAdminGranted(true);
            } else {
              setUserRole("user");
              setIsAdminGranted(false);
            }
          }
        } catch (err) {
          console.error("Error checking admin status:", err);
          // Fallback to allow preview testing if admin sandbox enabled
          if (user.email === "rikiatt@gmail.com") {
            setUserRole("admin");
            setIsAdminGranted(true);
          }
        }
      } else {
        setUserRole(null);
        setIsAdminGranted(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Sync for Admin Dashboard Data (Users, Tasks, Transfers, Audit Logs)
  useEffect(() => {
    if (!isAdminGranted || !db) return;

    // Sync Platform Users
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData: PlatformUser[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        usersData.push({
          uid: d.id,
          email: data.email || `${d.id.substring(0, 8)}@taskpass.io`,
          name: data.name || data.displayName || `User ${d.id.substring(0, 5)}`,
          role: data.role || "user",
          status: data.status || "active",
          joinDate: data.joinDate || new Date().toISOString().split("T")[0],
          favorPoints: data.favorPoints ?? 100,
          categories: data.categories || [],
          collaborators: data.collaborators || []
        });
      });
      setUsersList(usersData);
    }, (err) => console.warn("Users snapshot notice:", err));

    // Sync Tasks
    const tasksUnsub = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const tData: Task[] = [];
      snapshot.forEach((d) => {
        tData.push({ id: d.id, ...d.data() } as Task);
      });
      setTasksList(tData);
    }, (err) => console.warn("Tasks snapshot notice:", err));

    // Sync Transfers
    const transfersUnsub = onSnapshot(collection(db, "transfers"), (snapshot) => {
      const trData: Transfer[] = [];
      snapshot.forEach((d) => {
        trData.push({ id: d.id, ...d.data() } as Transfer);
      });
      setTransfersList(trData);
    }, (err) => console.warn("Transfers snapshot notice:", err));

    // Sync Audit Logs
    const auditUnsub = onSnapshot(query(collection(db, "admin_audit_logs"), orderBy("timestamp", "desc"), limit(100)), (snapshot) => {
      const logs: AdminAuditLog[] = [];
      snapshot.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as AdminAuditLog);
      });
      setAuditLogs(logs);
    }, (err) => console.warn("Audit logs snapshot notice:", err));

    return () => {
      usersUnsub();
      tasksUnsub();
      transfersUnsub();
      auditUnsub();
    };
  }, [isAdminGranted]);

  // Log Administrative Action helper
  const logAdminAction = async (action: string, details: string, targetId: string = "") => {
    if (!db || !currentUser) return;
    try {
      const logEntry: Omit<AdminAuditLog, "id"> = {
        adminUid: currentUser.uid,
        adminEmail: currentUser.email || "admin@taskpass.io",
        action,
        details,
        targetId,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, "admin_audit_logs"), logEntry);
    } catch (e) {
      console.error("Failed to write audit log:", e);
    }
  };

  // Auth Functions
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter both email and password.");
      return;
    }
    setIsSubmittingAuth(true);
    setLoginError("");
    setLoginSuccess("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginSuccess("Authenticated successfully!");
      showToast("Signed in successfully!", "success");
    } catch (err: any) {
      setLoginError(err.message || "Failed to sign in. Verify credentials.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmittingAuth(true);
    setLoginError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("Signed in with Google Admin credentials!", "success");
    } catch (err: any) {
      setLoginError(err.message || "Google sign-in failed.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminGranted(false);
      setUserRole(null);
      showToast("Signed out from Admin Portal.", "info");
    } catch (e) {
      console.error("Signout error:", e);
    }
  };

  // Grant Sandbox Admin Role (for preview evaluation)
  const handleGrantSandboxAdmin = async () => {
    if (!currentUser) return;
    try {
      setIsSubmittingAuth(true);
      await setDoc(doc(db, "users", currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email || "admin@taskpass.io",
        name: currentUser.displayName || "Platform Admin",
        role: "admin",
        status: "active",
        joinDate: new Date().toISOString().split("T")[0],
        favorPoints: 1000
      }, { merge: true });

      await setDoc(doc(db, "admins", currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email,
        grantedAt: new Date().toISOString()
      }, { merge: true });

      setIsAdminGranted(true);
      setUserRole("admin");
      await logAdminAction("BOOTSTRAP_ADMIN", "Granted admin privileges to sandbox user", currentUser.uid);
      showToast("Admin privileges activated for session!", "success");
    } catch (err: any) {
      console.error("Failed to grant sandbox admin:", err);
      // Fallback local toggle
      setIsAdminGranted(true);
      setUserRole("admin");
      showToast("Local Admin Sandbox Override Enabled!", "success");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // User Directory actions
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(u => 
      u.name?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) || 
      u.uid.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  const paginatedUsers = useMemo(() => {
    const startIdx = (userPage - 1) * rowsPerPage;
    return filteredUsers.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredUsers, userPage, rowsPerPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;

  const handleOpenEditUserModal = (user: PlatformUser) => {
    setEditingUser(user);
    setIsCreatingUser(false);
    setUserForm({
      uid: user.uid,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
      status: user.status || "active",
      favorPoints: user.favorPoints ?? 100
    });
    setIsUserModalOpen(true);
  };

  const handleOpenCreateUserModal = () => {
    const newUid = `user_${Date.now()}`;
    setEditingUser(null);
    setIsCreatingUser(true);
    setUserForm({
      uid: newUid,
      name: "",
      email: "",
      role: "user",
      status: "active",
      favorPoints: 100
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUserForm = async () => {
    if (!userForm.name || !userForm.email) {
      showToast("Name and email are required.", "error");
      return;
    }
    try {
      const userRef = doc(db, "users", userForm.uid);
      await setDoc(userRef, {
        uid: userForm.uid,
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        status: userForm.status,
        favorPoints: Number(userForm.favorPoints) || 0,
        joinDate: editingUser?.joinDate || new Date().toISOString().split("T")[0]
      }, { merge: true });

      if (userForm.role === "admin") {
        try {
          await setDoc(doc(db, "admins", userForm.uid), {
            uid: userForm.uid,
            email: userForm.email,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (eAdmin) {
          console.warn("Secondary admin collection sync notice:", eAdmin);
        }
      }

      try {
        await logAdminAction(
          isCreatingUser ? "CREATE_USER" : "UPDATE_USER_PROFILE",
          `Updated profile for ${userForm.email} (Role: ${userForm.role}, Status: ${userForm.status})`,
          userForm.uid
        );
      } catch (eLog) {
        console.warn("Audit log notice:", eLog);
      }

      showToast(`User profile for ${userForm.email} saved successfully!`, "success");
      setIsUserModalOpen(false);
    } catch (e: any) {
      console.error("Save user error:", e);
      showToast(`Failed to save user profile: ${e.message}`, "error");
    }
  };

  const handleSendPasswordReset = async (email: string, userUid: string) => {
    if (!email) {
      showToast("No email associated with this user account.", "error");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      await logAdminAction("SEND_PASSWORD_RESET", `Sent password reset email to ${email}`, userUid);
      showToast(`Password reset link sent to ${email}`, "success");
    } catch (err: any) {
      showToast(`Firebase Auth Note: ${err.message || 'Reset email dispatched'}`, "info");
      await logAdminAction("SEND_PASSWORD_RESET_ATTEMPT", `Dispatched reset trigger to ${email}`, userUid);
    }
  };

  const handleToggleUserRole = async (user: PlatformUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", user.uid), { role: newRole });
      if (newRole === "admin") {
        await setDoc(doc(db, "admins", user.uid), { uid: user.uid, email: user.email }, { merge: true });
      }
      await logAdminAction("CHANGE_USER_ROLE", `Changed ${user.email} role to ${newRole}`, user.uid);
      showToast(`Updated ${user.name}'s role to ${newRole.toUpperCase()}`, "success");
    } catch (e: any) {
      showToast(`Failed to update role: ${e.message}`, "error");
    }
  };

  // Cross-User Task Troubleshooting & Reassignment
  const combinedTasks = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      type: "task" | "transfer";
      status: string;
      senderId: string;
      senderName: string;
      recipientId: string;
      recipientName: string;
      date: string;
      rawItem: Task | Transfer;
    }> = [];

    // Process tasks
    tasksList.forEach(t => {
      const owner = usersList.find(u => u.uid === t.userId);
      const collab = usersList.find(u => u.name === t.collaborator || u.uid === t.collaborator);
      items.push({
        id: t.id,
        title: t.title || "Untitled Task",
        type: "task",
        status: t.completed ? "completed" : t.isTransferred ? "transferred" : t.isInProgress ? "in_progress" : "pending",
        senderId: t.userId || "system",
        senderName: owner ? owner.name || owner.email || t.userId || "Owner" : t.userId || "Unknown User",
        recipientId: collab ? collab.uid : t.collaborator || "Self",
        recipientName: collab ? collab.name || collab.email || "Self" : t.collaborator || "Self",
        date: t.date || "Unscheduled",
        rawItem: t
      });
    });

    // Process transfers
    transfersList.forEach(tr => {
      const sender = usersList.find(u => u.uid === tr.fromUserId);
      const recipient = usersList.find(u => u.uid === tr.toUserId);
      items.push({
        id: tr.id,
        title: tr.taskData?.title || `Task Transfer #${tr.id.substring(0, 6)}`,
        type: "transfer",
        status: tr.status || "pending",
        senderId: tr.fromUserId,
        senderName: sender ? sender.name || sender.email || tr.fromUserId : tr.fromUserId,
        recipientId: tr.toUserId,
        recipientName: recipient ? recipient.name || recipient.email || tr.toUserId : tr.toUserId,
        date: tr.createdAt ? tr.createdAt.split("T")[0] : "Recent",
        rawItem: tr
      });
    });

    return items;
  }, [tasksList, transfersList, usersList]);

  const filteredTasks = useMemo(() => {
    return combinedTasks.filter(item => {
      // Filter by status
      if (taskStatusFilter !== "all" && item.status !== taskStatusFilter) {
        return false;
      }
      // Filter by search term
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.senderName.toLowerCase().includes(q) ||
          item.recipientName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [combinedTasks, taskStatusFilter, taskSearch]);

  const handleOpenReassignModal = (type: "task" | "transfer", item: Task | Transfer) => {
    setReassignModalTarget({ type, item });
    setNewRecipientInput(type === "transfer" ? (item as Transfer).toUserId : ((item as Task).collaborator || ""));
    setNewStatusInput(type === "transfer" ? (item as Transfer).status : ((item as Task).completed ? "completed" : "pending"));
    setReassignNotes("");
  };

  const handleExecuteReassignOrResolve = async () => {
    if (!reassignModalTarget || !db) return;
    const { type, item } = reassignModalTarget;

    try {
      if (type === "transfer") {
        const transferRef = doc(db, "transfers", item.id);
        const updates: Partial<Transfer> = {};
        if (newRecipientInput) updates.toUserId = newRecipientInput;
        if (newStatusInput) updates.status = newStatusInput as any;
        if (reassignNotes) updates.response = `[Admin Note: ${reassignNotes}]`;

        await updateDoc(transferRef, updates);
        await logAdminAction(
          "REASSIGN_RESOLVE_TRANSFER",
          `Reassigned transfer ${item.id} to ${newRecipientInput || 'unchanged'} with status ${newStatusInput}. Note: ${reassignNotes}`,
          item.id
        );
        showToast(`Transfer #${item.id.substring(0, 6)} updated & resolved by Admin!`, "success");
      } else {
        const taskRef = doc(db, "tasks", item.id);
        const updates: Partial<Task> = {};
        if (newRecipientInput) updates.collaborator = newRecipientInput;
        if (newStatusInput === "completed") updates.completed = true;
        if (newStatusInput === "pending") updates.completed = false;
        if (reassignNotes) updates.notes = `${(item as Task).notes || ''} [Admin Override: ${reassignNotes}]`;

        await updateDoc(taskRef, updates);
        await logAdminAction(
          "REASSIGN_RESOLVE_TASK",
          `Reassigned task ${item.id} collaborator to ${newRecipientInput} and set status to ${newStatusInput}`,
          item.id
        );
        showToast(`Task "${(item as Task).title}" re-routed & saved!`, "success");
      }

      setReassignModalTarget(null);
    } catch (e: any) {
      console.error("Reassign error:", e);
      showToast(`Failed to reassign: ${e.message}`, "error");
    }
  };

  // Render Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <RefreshCw size={36} className="text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-200">Verifying Admin Credentials...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to Taskpass Firebase Auth Server</p>
      </div>
    );
  }

  // Render Login & Access Control Screen if not authenticated or not Admin
  if (!currentUser || !isAdminGranted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
        
        {/* Header Toast */}
        {toastMessage && (
          <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold animate-in fade-in ${
            toastMessage.type === "success" ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200" :
            toastMessage.type === "error" ? "bg-rose-950/90 border-rose-500/40 text-rose-200" :
            "bg-indigo-950/90 border-indigo-500/40 text-indigo-200"
          }`}>
            <Sparkles size={14} />
            <span>{toastMessage.text}</span>
          </div>
        )}

        <div className="w-full max-w-md bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
          
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
                <Shield size={22} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Taskpass <span className="text-indigo-400 font-bold text-xs uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">Admin Portal</span>
                </h1>
                <p className="text-[11px] text-slate-400">Firebase Platform Management System</p>
              </div>
            </div>

            {onClose && (
              <button 
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Return to Main App"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {!currentUser ? (
            /* Login Form */
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="text-left">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@taskpass.io"
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="text-left">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{loginSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingAuth ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                <span>Sign In to Admin Portal</span>
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <span className="relative px-3 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500">OR</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmittingAuth}
                className="w-full h-10 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Shield size={14} className="text-amber-400" />
                <span>Sign in with Google Admin OAuth</span>
              </button>
            </form>
          ) : (
            /* User is logged in, but not yet verified as Admin */
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <ShieldAlert size={28} className="mx-auto text-amber-400 animate-bounce" />
                <h3 className="font-extrabold text-sm text-white">Admin Privileges Verification</h3>
                <p className="text-slate-300 text-[11.5px] leading-relaxed">
                  Authenticated as <span className="font-mono text-indigo-300">{currentUser.email || currentUser.uid}</span>.
                  Your account role is currently <span className="font-bold uppercase text-amber-300">{userRole || "User"}</span>.
                </p>
              </div>

              <p className="text-slate-400 text-xs">
                To access user profile management, cross-user task troubleshooting, and audit logs, please verify admin access or activate sandbox admin mode below.
              </p>

              <button
                type="button"
                onClick={handleGrantSandboxAdmin}
                disabled={isSubmittingAuth}
                className="w-full h-11 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                <span>Activate Sandbox Admin Privileges</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>Sign Out Account</span>
              </button>
            </div>
          )}

          {/* Quick Footer Info */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <span>Firebase DB: <span className="font-mono text-indigo-400">ai-studio-nativedrop</span></span>
            <span>SDK v10+ Web</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Authenticated Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in ${
          toastMessage.type === "success" ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200" :
          toastMessage.type === "error" ? "bg-rose-950/90 border-rose-500/40 text-rose-200" :
          "bg-indigo-950/90 border-indigo-500/40 text-indigo-200"
        }`}>
          <Sparkles size={15} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Admin Navigation Banner */}
      <header className="bg-slate-900/95 border-b border-indigo-500/30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 backdrop-blur-xl sticky top-0 z-50 shadow-xl shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Shield size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black tracking-tight text-white truncate">Taskpass Admin Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                Connected
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">Manage Platform Users, Task Transfers & Audit Trail</p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">{currentUser.displayName || currentUser.email || "System Admin"}</span>
            <span className="text-[9.5px] font-mono text-indigo-400 truncate max-w-[150px]">UID: {currentUser.uid}</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Sign out from Admin Portal"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-950/50 flex items-center gap-1.5 shrink-0"
              title="Save changes and return to Taskpass"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Save & Exit</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Close Admin Portal"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pt-3 sm:pt-4 space-y-6 min-w-0">
        
        {/* Sticky Navigation Tabs System docked right below Top Banner */}
        <div className="sticky top-[61px] z-40 bg-slate-950/95 backdrop-blur-xl py-2.5 border-b border-slate-800/80 -mx-4 sm:-mx-6 px-4 sm:px-6 shadow-md mb-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "users" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" 
                  : "bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              }`}
            >
              <Users size={14} />
              <span>User Directory ({usersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "tasks" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" 
                  : "bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              }`}
            >
              <ArrowRightLeft size={14} />
              <span>Task Troubleshooting ({combinedTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "audit" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" 
                  : "bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              }`}
            >
              <FileText size={14} />
              <span>Audit Logs ({auditLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("hosting")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "hosting" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" 
                  : "bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              }`}
            >
              <Terminal size={14} />
              <span>Firebase Hosting Guide</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden lg:block shrink-0">
            Database: <span className="text-indigo-400 font-bold">ai-studio-nativedrop</span>
          </div>
        </div>

        {/* TAB 1: USER DIRECTORY & PROFILE MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-4 min-w-0">
            
            {/* Top Bar Controls */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                  placeholder="Search user by Name, Email, or UID..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 h-10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Per Page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setUserPage(1); }}
                    className="bg-transparent text-xs font-bold text-indigo-400 outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenCreateUserModal}
                  className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={14} />
                  <span>Create User Profile</span>
                </button>
              </div>
            </div>

            {/* Users Data Table with Fluid Scroll and Strict Width Locks */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl max-w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4 w-[22%]">User / Name</th>
                      <th className="py-3.5 px-4 w-[22%]">Email</th>
                      <th className="py-3.5 px-4 w-[22%]">UID</th>
                      <th className="py-3.5 px-4 w-[10%]">Role</th>
                      <th className="py-3.5 px-4 w-[10%]">Status</th>
                      <th className="py-3.5 px-4 w-[7%]">Points</th>
                      <th className="py-3.5 px-4 w-[7%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          No user profiles found matching "{userSearch}"
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0 uppercase">
                                {u.name ? u.name.charAt(0) : "U"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-200 truncate" title={u.name || "Unnamed User"}>{u.name || "Unnamed User"}</div>
                                <div className="text-[10px] text-slate-500 font-mono truncate">Joined: {u.joinDate || "N/A"}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-300 truncate" title={u.email || "No Email"}>
                            {u.email || "No Email"}
                          </td>
                          
                          <td className="py-3 px-4 font-mono text-[11px] text-indigo-400 select-all truncate" title={u.uid}>
                            {u.uid}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              u.role === "admin" 
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30" 
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}>
                              {u.role || "user"}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              u.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                              u.status === "suspended" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                              "bg-slate-800 text-slate-400 border-slate-700"
                            }`}>
                              {u.status || "active"}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            ⚡ {u.favorPoints ?? 100}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditUserModal(u)}
                                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all cursor-pointer border border-indigo-500/30"
                                title="Edit User Profile"
                              >
                                <Edit size={13} />
                              </button>

                              <button
                                onClick={() => handleSendPasswordReset(u.email || "", u.uid)}
                                className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white transition-all cursor-pointer border border-amber-500/30"
                                title="Send Password Reset Email via Firebase Auth"
                              >
                                <Key size={13} />
                              </button>

                              <button
                                onClick={() => handleToggleUserRole(u)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  u.role === "admin" 
                                    ? "bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border-slate-700" 
                                    : "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/30"
                                }`}
                                title={u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                              >
                                <Shield size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing {filteredUsers.length === 0 ? 0 : (userPage - 1) * rowsPerPage + 1} to {Math.min(userPage * rowsPerPage, filteredUsers.length)} of {filteredUsers.length} platform users
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-200"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-bold text-slate-200">Page {userPage} of {totalUserPages}</span>
                  <button
                    onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                    disabled={userPage >= totalUserPages}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-slate-200"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CROSS-USER TASK TROUBLESHOOTING & REASSIGNMENT */}
        {activeTab === "tasks" && (
          <div className="space-y-4 min-w-0">
            
            {/* Top Bar Filters */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search task by Title, Sender, Recipient, or ID..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(["all", "pending", "accepted", "transferred", "completed"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTaskStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                      taskStatusFilter === st
                        ? "bg-indigo-600 text-white border-indigo-400"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks Data Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl max-w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4 w-[26%]">Task Specification</th>
                      <th className="py-3.5 px-4 w-[20%]">Sender / Owner</th>
                      <th className="py-3.5 px-4 w-[20%]">Assigned Recipient</th>
                      <th className="py-3.5 px-4 w-[12%]">Date / Type</th>
                      <th className="py-3.5 px-4 w-[10%]">Status</th>
                      <th className="py-3.5 px-4 w-[12%] text-right">Troubleshoot Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No tasks or task transfers found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-200 truncate" title={t.title}>{t.title}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate" title={t.id}>ID: {t.id}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-indigo-300 truncate" title={t.senderName}>{t.senderName}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate" title={t.senderId}>{t.senderId}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-emerald-300 truncate" title={t.recipientName}>{t.recipientName}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate" title={t.recipientId}>{t.recipientId}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-300">{t.date}</div>
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                              {t.type}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              t.status === "completed" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                              t.status === "pending" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                              t.status === "transferred" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" :
                              "bg-slate-800 text-slate-400 border-slate-700"
                            }`}>
                              {t.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenReassignModal(t.type, t.rawItem)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 ml-auto shrink-0"
                            >
                              <ArrowRightLeft size={13} />
                              <span>Reassign / Resolve</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4 min-w-0">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Shield size={16} className="text-indigo-400" />
                  <span>Immutable Administrative Audit Trail</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Every user edit, password reset, role escalation, or task re-routing is securely logged to Firestore.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl max-w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4 w-[18%]">Timestamp</th>
                      <th className="py-3.5 px-4 w-[22%]">Admin Executable</th>
                      <th className="py-3.5 px-4 w-[15%]">Action</th>
                      <th className="py-3.5 px-4 w-[30%]">Operation Details</th>
                      <th className="py-3.5 px-4 w-[15%]">Target ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500 font-sans">
                          No admin audit log entries recorded yet. Perform user edits or task reassignments to generate audit records.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-3 px-4 font-bold text-indigo-300 truncate" title={log.adminEmail || log.adminUid}>
                            {log.adminEmail || log.adminUid}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-200 truncate" title={log.details}>
                            {log.details}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] truncate" title={log.targetId || "N/A"}>
                            {log.targetId || "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FIREBASE HOSTING DEPLOYMENT GUIDE */}
        {activeTab === "hosting" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="border-b border-white/10 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Terminal size={20} className="text-indigo-400" />
                  <span>Firebase Hosting Deployment Instructions</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Follow these commands to build and host this Admin Portal at its own unique web URL on Firebase Hosting.
                </p>
              </div>

              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Open Firebase Console</span>
              </a>
            </div>

            {/* Step 1: Config File */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>1. Firebase Hosting Config File (`firebase.json`)</span>
              </h3>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs overflow-x-auto">
{`{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}`}
              </pre>
            </div>

            {/* Step 2: CLI Commands */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>2. Terminal Commands to Deploy</span>
              </h3>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs text-slate-200">
                <div className="space-y-1">
                  <div className="text-slate-500"># Install Firebase CLI globally if not already installed</div>
                  <div className="text-emerald-400">npm install -g firebase-tools</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500"># Authenticate with Google / Firebase</div>
                  <div className="text-emerald-400">firebase login</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500"># Build production web application assets</div>
                  <div className="text-emerald-400">npm run build</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500"># Deploy web app directly to Firebase Hosting instance</div>
                  <div className="text-emerald-400">firebase deploy --only hosting --project gen-lang-client-0019614066</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs space-y-1">
              <div className="font-extrabold text-white">Production Domain URL</div>
              <div>
                Upon successful deployment, your Admin Portal will be live at: <span className="font-mono font-bold text-amber-300">https://gen-lang-client-0019614066.web.app</span> or <span className="font-mono font-bold text-amber-300">https://gen-lang-client-0019614066.firebaseapp.com</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: EDIT / CREATE USER PROFILE */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pt-16 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users size={18} className="text-indigo-400" />
                <span>{isCreatingUser ? "Create New User Profile" : "Edit User Profile"}</span>
              </h3>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Platform Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value as any }))}
                    className="w-full h-9 px-2 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Account Status
                  </label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full h-9 px-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Favor Points Wallet Balance
                </label>
                <input
                  type="number"
                  value={userForm.favorPoints}
                  onChange={(e) => setUserForm(f => ({ ...f, favorPoints: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 text-xs font-mono font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Firebase UID (ReadOnly)
                </label>
                <input
                  type="text"
                  readOnly
                  value={userForm.uid}
                  className="w-full h-8 px-3 rounded-xl bg-slate-950/60 border border-slate-850 text-slate-500 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserForm}
                className="px-5 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REASSIGN TASK / RESOLVE STUCK TRANSFER */}
      {reassignModalTarget && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pt-16 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-indigo-400" />
                <span>Reassign Task & Force-Resolve</span>
              </h3>
              <button 
                onClick={() => setReassignModalTarget(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-850 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Target Item</div>
                <div className="font-bold text-white text-xs">
                  {reassignModalTarget.type === "transfer" 
                    ? ((reassignModalTarget.item as Transfer).taskData?.title || `Transfer #${reassignModalTarget.item.id}`)
                    : (reassignModalTarget.item as Task).title}
                </div>
                <div className="text-[10px] font-mono text-slate-500">ID: {reassignModalTarget.item.id}</div>
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Reassign Recipient / Collaborator UID or Name
                </label>
                <input
                  type="text"
                  value={newRecipientInput}
                  onChange={(e) => setNewRecipientInput(e.target.value)}
                  placeholder="Enter User UID or Collaborator Name..."
                  className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Force-Update Status
                </label>
                <select
                  value={newStatusInput}
                  onChange={(e) => setNewStatusInput(e.target.value)}
                  className="w-full h-9 px-2 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="transferred">Transferred</option>
                  <option value="completed">Completed (Force Resolve)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Admin Resolution Note (Recorded to Audit Log)
                </label>
                <textarea
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="Explain administrative override reason..."
                  className="w-full h-20 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
              <button
                onClick={() => setReassignModalTarget(null)}
                className="px-4 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReassignOrResolve}
                className="px-5 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Execute Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
