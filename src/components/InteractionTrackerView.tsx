/**
 * Interaction Tracker & Multi-Column Ratchet Notes View
 * Complete production-ready implementation of the mobile/desktop interaction tracker.
 * Features:
 * 1. Speed Dial Quick-Log Bar (6 assignable contact slots, tap-to-log, long-press assign, one-touch location badge)
 * 2. Multi-Column Swipable Ratchet Swiper (Recent Log, Pending Follow-up, Needs Task, Archived)
 * 3. Compact Multi-Criteria Filter Bar (Sort by Newest/Oldest/Urgency/Title, Group by Contact/Location/Date)
 * 4. Note-to-Task Conversion Micro-Modal (Flexible vs. Locked toggle, auto-populated title, linked back via noteId)
 * 5. Interaction Reporting & Intelligence Dossier (Pre-meeting prep mode, follow-up tracker scanners, copy digest)
 * 6. Cloud Firestore Synchronized with notesBackendConnector
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Users,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  Waves,
  Zap,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  Phone,
  Video,
  Building,
  ArrowRight,
  Archive,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Check,
  Bell,
  BellRing,
  BellOff,
  X,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Task, AppContact } from "../types";
import { getLocalDateString } from "../utils/timeHelpers";
import {
  InteractionNote,
  InteractionContact,
  InteractionLocation,
  DEFAULT_LOCATIONS,
  saveInteractionNoteToCloud,
  deleteInteractionNoteFromCloud,
  convertNoteToTaskInCloud,
  assignSpeedDialContactInCloud,
  saveLocationToCloud,
} from "../services/notesBackendConnector";

interface InteractionTrackerViewProps {
  notes: InteractionNote[];
  onSaveNotes: (updatedNotes: InteractionNote[]) => void;
  tasks: Task[];
  onAddTask: (task: Task) => void;
  contacts: AppContact[];
  onSaveContacts?: (contacts: AppContact[]) => void;
  onDeleteContact?: (contactId: string) => void;
  isDark: boolean;
  triggerHaptic?: (style?: "light" | "medium" | "heavy") => void;
  onClose?: () => void;
}

const COLUMNS = [
  { key: "recent", label: "Recent Log", icon: Zap, badgeColor: "bg-blue-500", textColor: "text-blue-400" },
  { key: "pending_followup", label: "Follow-up", icon: Clock, badgeColor: "bg-amber-500", textColor: "text-amber-400" },
  { key: "needs_task", label: "Needs Task", icon: AlertCircle, badgeColor: "bg-pink-500", textColor: "text-pink-400" },
  { key: "archived", label: "Archived", icon: Archive, badgeColor: "bg-slate-500", textColor: "text-slate-400" },
] as const;

export const InteractionTrackerView: React.FC<InteractionTrackerViewProps> = ({
  notes,
  onSaveNotes,
  tasks,
  onAddTask,
  contacts,
  onSaveContacts,
  onDeleteContact,
  isDark,
  triggerHaptic = () => {},
  onClose,
}) => {
  // Navigation View State: "swiper" | "intelligence" | "contacts"
  const [activeScreen, setActiveScreen] = useState<"swiper" | "intelligence" | "contacts">("swiper");

  // Speed Dial Slot Assignment state
  const [assigningSlotIndex, setAssigningSlotIndex] = useState<number | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [newCollabNameInput, setNewCollabNameInput] = useState("");

  // Contact Management State (Edit / Delete / Interaction Counts)
  const [editingContact, setEditingContact] = useState<InteractionContact | null>(null);
  const [editContactName, setEditContactName] = useState("");
  const [editContactTitle, setEditContactTitle] = useState("");
  const [editContactOrg, setEditContactOrg] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactSpeedDial, setEditContactSpeedDial] = useState<number | null>(null);
  const [contactToDelete, setContactToDelete] = useState<InteractionContact | null>(null);
  const [contactDirectorySearch, setContactDirectorySearch] = useState<string>("");

  // Quick Capture Modal State
  const [activeCaptureContact, setActiveCaptureContact] = useState<InteractionContact | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("loc-virtual");
  const [quickNoteBody, setQuickNoteBody] = useState("");
  const [quickTags, setQuickTags] = useState<string[]>(["meeting"]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Active Ratchet Swiper Column (0 to 3)
  const [activeColIndex, setActiveColIndex] = useState<number>(0);

  // Filter & Sort State
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "urgency" | "title">("newest");
  const [groupByOption, setGroupByOption] = useState<"none" | "contact" | "location" | "date">("none");
  const [searchQuery, setSearchQuery] = useState("");

  // Note-to-Task Conversion Modal State
  const [convertingNote, setConvertingNote] = useState<InteractionNote | null>(null);
  const [conversionTitle, setConversionTitle] = useState("");
  const [conversionDueDate, setConversionDueDate] = useState("");
  const [conversionIsLocked, setConversionIsLocked] = useState(false);
  const [conversionPriority, setConversionPriority] = useState<"high" | "medium" | "low">("medium");

  // Intelligence Screen Mode: "prep" | "followup"
  const [intelMode, setIntelMode] = useState<"prep" | "followup">("prep");
  const [selectedIntelContactId, setSelectedIntelContactId] = useState<string>("");
  const [copiedDigest, setCopiedDigest] = useState(false);

  // Inline Note Edit State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Speed Dial Edit Mode & Long-Press Progress State
  const [editSlotsMode, setEditSlotsMode] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const suppressClickUntilRef = useRef<number>(0);
  const pointerStartPosRef = useRef<{ [key: number]: { x: number; y: number } }>({});
  const holdIntervalRef = useRef<{ [key: number]: any }>({});

  // Set Reminder Modal State
  const [reminderModalNote, setReminderModalNote] = useState<InteractionNote | null>(null);
  const [reminderDatetime, setReminderDatetime] = useState<string>("");
  const [reminderNotesText, setReminderNotesText] = useState<string>("");
  const [alsoCreateTaskWithReminder, setAlsoCreateTaskWithReminder] = useState<boolean>(false);
  const [onlyShowRemindersFilter, setOnlyShowRemindersFilter] = useState<boolean>(false);

  // Quick Capture Modal Reminder State
  const [quickReminderEnabled, setQuickReminderEnabled] = useState<boolean>(false);
  const [quickReminderDatetime, setQuickReminderDatetime] = useState<string>("");
  const [quickReminderNote, setQuickReminderNote] = useState<string>("");

  // Map contacts into normalized local state to ensure instantaneous reactive updates
  const [localContacts, setLocalContacts] = useState<InteractionContact[]>(() => {
    let savedSlots: Record<string, string> = {};
    try {
      const stored = localStorage.getItem("taskpass_speed_dial_slots");
      if (stored) savedSlots = JSON.parse(stored);
    } catch {}

    return contacts.map((c, idx) => {
      let sIndex = c.speedDialIndex;
      if (sIndex === undefined) {
        const slotEntry = Object.entries(savedSlots).find(([_, id]) => id === c.id);
        if (slotEntry) {
          sIndex = Number(slotEntry[0]);
        } else if (Object.keys(savedSlots).length === 0) {
          sIndex = idx < 6 ? idx : null;
        } else {
          sIndex = null;
        }
      }
      return {
        id: c.id,
        name: c.name || `${c.givenName || ''} ${c.familyName || ''}`.trim() || `Contact ${idx + 1}`,
        givenName: c.givenName,
        familyName: c.familyName,
        speedDialIndex: sIndex !== undefined ? sIndex : null,
        avatarUrl: c.avatarUrl,
        title: c.title || (c.organization ? `Associate at ${c.organization}` : "Collaborator"),
        organization: c.organization || "Direct Partner",
        phone: c.phone,
        email: c.email,
        address: c.address,
        isLocation: c.isLocation,
      };
    });
  });

  // Sync if parent contacts array changes while preserving local speed dial index assignments
  useEffect(() => {
    if (contacts && contacts.length > 0) {
      setLocalContacts((prev) => {
        const slotMap = new Map<string, number | null>();
        prev.forEach((p) => {
          if (p.speedDialIndex !== null && p.speedDialIndex !== undefined) {
            slotMap.set(p.id, p.speedDialIndex);
          }
        });
        return contacts.map((c, idx) => {
          const slot = slotMap.has(c.id) ? slotMap.get(c.id) : (c.speedDialIndex !== undefined ? c.speedDialIndex : (idx < 6 && slotMap.size === 0 ? idx : null));
          return {
            id: c.id,
            name: c.name || `${c.givenName || ''} ${c.familyName || ''}`.trim() || `Contact ${idx + 1}`,
            givenName: c.givenName,
            familyName: c.familyName,
            speedDialIndex: slot ?? null,
            avatarUrl: c.avatarUrl,
            title: c.title || (c.organization ? `Associate at ${c.organization}` : "Collaborator"),
            organization: c.organization || "Direct Partner",
            phone: c.phone,
            email: c.email,
            address: c.address,
            isLocation: c.isLocation,
          };
        });
      });
    }
  }, [contacts]);

  const normalizedContacts = localContacts;

  // Set initial selected intel contact
  useEffect(() => {
    if (!selectedIntelContactId && normalizedContacts.length > 0) {
      setSelectedIntelContactId(normalizedContacts[0].id);
    }
  }, [normalizedContacts, selectedIntelContactId]);

  const contactsMap = useMemo(() => {
    const map = new Map<string, InteractionContact>();
    normalizedContacts.forEach((c) => map.set(c.id, c));
    return map;
  }, [normalizedContacts]);

  // Default / Available Locations
  const locations: InteractionLocation[] = DEFAULT_LOCATIONS;
  const locationsMap = useMemo(() => {
    const map = new Map<string, InteractionLocation>();
    locations.forEach((l) => map.set(l.id, l));
    return map;
  }, [locations]);

  // 6 Speed Dial Slots (0 through 5)
  const speedDialSlots = [0, 1, 2, 3, 4, 5];

  const getContactForSlot = (index: number) => {
    return normalizedContacts.find((c) => c.speedDialIndex === index);
  };

  // Robust Long-Press, Visual Progress & Pointer Event Architecture
  const longPressTimerRef = useRef<{ [key: number]: any }>({});
  const [holdingSlotIndex, setHoldingSlotIndex] = useState<number | null>(null);

  const startLongPress = (slotIdx: number, clientX?: number, clientY?: number) => {
    if (clientX !== undefined && clientY !== undefined) {
      pointerStartPosRef.current[slotIdx] = { x: clientX, y: clientY };
    }
    setHoldingSlotIndex(slotIdx);
    setHoldProgress(0);

    if (longPressTimerRef.current[slotIdx]) {
      clearTimeout(longPressTimerRef.current[slotIdx]);
    }
    if (holdIntervalRef.current[slotIdx]) {
      clearInterval(holdIntervalRef.current[slotIdx]);
    }

    const startTime = Date.now();
    const duration = 350; // Snappy 350ms hold to reassign

    holdIntervalRef.current[slotIdx] = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(progress);
    }, 20);

    longPressTimerRef.current[slotIdx] = setTimeout(() => {
      if (holdIntervalRef.current[slotIdx]) {
        clearInterval(holdIntervalRef.current[slotIdx]);
        delete holdIntervalRef.current[slotIdx];
      }
      setHoldingSlotIndex(null);
      setHoldProgress(0);
      triggerHaptic("heavy");
      suppressClickUntilRef.current = Date.now() + 600;
      setAssignSearchQuery("");
      setAssigningSlotIndex(slotIdx);
    }, duration);
  };

  const cancelLongPress = (slotIdx: number) => {
    setHoldingSlotIndex(null);
    setHoldProgress(0);
    if (longPressTimerRef.current[slotIdx]) {
      clearTimeout(longPressTimerRef.current[slotIdx]);
      delete longPressTimerRef.current[slotIdx];
    }
    if (holdIntervalRef.current[slotIdx]) {
      clearInterval(holdIntervalRef.current[slotIdx]);
      delete holdIntervalRef.current[slotIdx];
    }
  };

  const handlePointerMove = (slotIdx: number, clientX: number, clientY: number) => {
    if (holdingSlotIndex !== slotIdx) return;
    const start = pointerStartPosRef.current[slotIdx];
    if (start) {
      const dx = clientX - start.x;
      const dy = clientY - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 12) {
        cancelLongPress(slotIdx);
      }
    }
  };

  const handleSlotClick = (slotIdx: number, e: React.MouseEvent) => {
    if (Date.now() < suppressClickUntilRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (editSlotsMode) {
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic("medium");
      setAssignSearchQuery("");
      setAssigningSlotIndex(slotIdx);
      return;
    }
    handleSlotPress(slotIdx);
  };

  // Speed Dial Tap & Long-Press Handlers
  const handleSlotPress = (index: number) => {
    const contact = getContactForSlot(index);
    if (contact) {
      triggerHaptic("medium");
      setActiveCaptureContact(contact);
      setSelectedLocationId("loc-virtual");
      setQuickNoteBody("");
      setQuickTags(["meeting"]);
      setQuickReminderEnabled(false);
      setQuickReminderDatetime("");
      setQuickReminderNote("");
    } else {
      triggerHaptic("light");
      setAssignSearchQuery("");
      setAssigningSlotIndex(index);
    }
  };

  const handleSlotLongPress = (index: number) => {
    triggerHaptic("heavy");
    setAssignSearchQuery("");
    setAssigningSlotIndex(index);
  };

  // Save Quick Note
  const handleSaveQuickNote = async () => {
    if (!activeCaptureContact || !quickNoteBody.trim()) return;
    triggerHaptic("medium");

    const newNoteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newNote: InteractionNote = {
      id: newNoteId,
      contactId: activeCaptureContact.id,
      locationId: selectedLocationId,
      timestamp: new Date().toISOString(),
      rawText: quickNoteBody.trim(),
      body: quickNoteBody.trim(),
      title: quickNoteBody.trim().split(/[.\n]/)[0].substring(0, 60),
      tags: quickTags.length > 0 ? quickTags : ["quick-log"],
      status: "recent",
      createdAt: Date.now(),
      collaborator: activeCaptureContact.name,
      location: locationsMap.get(selectedLocationId)?.name || "Meeting",
      reminderTime: quickReminderEnabled && quickReminderDatetime ? quickReminderDatetime : undefined,
      reminderNotes: quickReminderEnabled && quickReminderNote.trim() ? quickReminderNote.trim() : undefined,
      reminderCompleted: false,
    };

    const updated = [newNote, ...notes];
    onSaveNotes(updated);
    saveInteractionNoteToCloud(newNote);

    setActiveCaptureContact(null);
    setQuickNoteBody("");
    setQuickTags([]);
    setQuickReminderEnabled(false);
    setQuickReminderDatetime("");
    setQuickReminderNote("");
  };

  // Reminder System Handlers
  const handleOpenSetReminder = (note: InteractionNote) => {
    triggerHaptic("light");
    setReminderModalNote(note);
    if (note.reminderTime) {
      setReminderDatetime(note.reminderTime);
    } else {
      const d = new Date(Date.now() + 60 * 60 * 1000); // 1 hour ahead
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setReminderDatetime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    }
    setReminderNotesText(note.reminderNotes || "");
    setAlsoCreateTaskWithReminder(false);
  };

  const handleSaveReminder = () => {
    if (!reminderModalNote || !reminderDatetime) return;
    triggerHaptic("medium");

    const updated = notes.map((n) => {
      if (n.id === reminderModalNote.id) {
        return {
          ...n,
          reminderTime: reminderDatetime,
          reminderNotes: reminderNotesText.trim() || undefined,
          reminderCompleted: false,
          updatedAt: Date.now(),
        };
      }
      return n;
    });

    onSaveNotes(updated);
    const updatedNote = updated.find((n) => n.id === reminderModalNote.id);
    if (updatedNote) {
      saveInteractionNoteToCloud(updatedNote);
    }

    if (alsoCreateTaskWithReminder) {
      const taskDate = reminderDatetime.split("T")[0] || getLocalDateString();
      const taskTime = reminderDatetime.split("T")[1]?.substring(0, 5) || "09:00";
      const newTask: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Follow up: ${reminderModalNote.collaborator || "Contact"} - ${reminderModalNote.title || reminderModalNote.body.substring(0, 30)}`,
        date: taskDate,
        time: taskTime,
        duration: "30 min",
        isLocked: true,
        completed: false,
        collaborator: reminderModalNote.collaborator,
        location: reminderModalNote.location || "Office",
        reminderTime: reminderDatetime,
        notes: `Follow-up on interaction: ${reminderNotesText || reminderModalNote.body}`,
      };
      onAddTask(newTask);
    }

    setReminderModalNote(null);
    setReminderDatetime("");
    setReminderNotesText("");
    setAlsoCreateTaskWithReminder(false);
  };

  const handleClearReminder = (noteId: string) => {
    triggerHaptic("light");
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          reminderTime: undefined,
          reminderNotes: undefined,
          reminderCompleted: undefined,
          updatedAt: Date.now(),
        };
      }
      return n;
    });
    onSaveNotes(updated);
    const updatedNote = updated.find((n) => n.id === noteId);
    if (updatedNote) {
      saveInteractionNoteToCloud(updatedNote);
    }
    setReminderModalNote(null);
  };

  const handleToggleReminderCompleted = (noteId: string) => {
    triggerHaptic("medium");
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          reminderCompleted: !n.reminderCompleted,
          updatedAt: Date.now(),
        };
      }
      return n;
    });
    onSaveNotes(updated);
    const updatedNote = updated.find((n) => n.id === noteId);
    if (updatedNote) {
      saveInteractionNoteToCloud(updatedNote);
    }
  };

  const formatReminderDisplay = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      if (isToday) return `Today at ${timeStr}`;
      if (isTomorrow) return `Tomorrow at ${timeStr}`;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch {
      return isoStr;
    }
  };

  // Assign or Reassign Speed Dial Slot
  const handleAssignSpeedDial = async (slotIndex: number, contactId: string | null) => {
    triggerHaptic("medium");

    const updated = localContacts.map((c) => {
      // If another contact was assigned to this slot, unassign them
      if (slotIndex !== null && c.speedDialIndex === slotIndex && c.id !== contactId) {
        return { ...c, speedDialIndex: null };
      }
      // Target contact gets this slot
      if (c.id === contactId) {
        return { ...c, speedDialIndex: slotIndex };
      }
      return c;
    });

    setLocalContacts(updated);
    setAssigningSlotIndex(null);

    // Save to localStorage for instant local persistence
    try {
      const slotMap: Record<number, string> = {};
      updated.forEach((c) => {
        if (c.speedDialIndex !== null && c.speedDialIndex !== undefined) {
          slotMap[c.speedDialIndex] = c.id;
        }
      });
      localStorage.setItem("taskpass_speed_dial_slots", JSON.stringify(slotMap));
    } catch {}

    if (onSaveContacts) {
      onSaveContacts(updated as AppContact[]);
    }

    try {
      await assignSpeedDialContactInCloud(contactId || "", slotIndex, updated);
    } catch (err) {
      console.warn("Speed dial assign sync fallback:", err);
    }
  };

  // Contact interaction & task counters
  const getContactInteractionCount = (contactId: string, contactName?: string) => {
    const cleanName = (contactName || "").trim().toLowerCase();
    return notes.filter((n) => {
      if (n.contactId && n.contactId === contactId) return true;
      if (cleanName && n.collaborator && n.collaborator.trim().toLowerCase() === cleanName) return true;
      return false;
    }).length;
  };

  const getContactTaskCount = (contactName?: string) => {
    const cleanName = (contactName || "").trim().toLowerCase();
    if (!cleanName) return 0;
    return tasks.filter((t) => t.collaborator && t.collaborator.trim().toLowerCase() === cleanName).length;
  };

  const persistSpeedDialSlots = (contactsList: InteractionContact[]) => {
    try {
      const slotMap: Record<number, string> = {};
      contactsList.forEach((c) => {
        if (c.speedDialIndex !== null && c.speedDialIndex !== undefined) {
          slotMap[c.speedDialIndex] = c.id;
        }
      });
      localStorage.setItem("taskpass_speed_dial_slots", JSON.stringify(slotMap));
    } catch {}
  };

  const handleOpenEditContact = (contact: InteractionContact) => {
    triggerHaptic("light");
    setEditingContact(contact);
    setEditContactName(contact.name);
    setEditContactTitle(contact.title || "");
    setEditContactOrg(contact.organization || "");
    setEditContactPhone(contact.phone || "");
    setEditContactEmail(contact.email || "");
    setEditContactSpeedDial(contact.speedDialIndex ?? null);
  };

  const handleOpenCreateContact = () => {
    triggerHaptic("light");
    const newContact: InteractionContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: "",
      speedDialIndex: null,
      title: "",
      organization: "",
    };
    setEditingContact(newContact);
    setEditContactName("");
    setEditContactTitle("");
    setEditContactOrg("");
    setEditContactPhone("");
    setEditContactEmail("");
    setEditContactSpeedDial(null);
  };

  const handleSaveEditedContact = () => {
    if (!editingContact || !editContactName.trim()) return;
    triggerHaptic("success");

    const trimmedName = editContactName.trim();
    const updatedContact: InteractionContact = {
      ...editingContact,
      name: trimmedName,
      givenName: trimmedName.split(" ")[0] || trimmedName,
      familyName: trimmedName.split(" ").slice(1).join(" ") || "",
      title: editContactTitle.trim() || undefined,
      organization: editContactOrg.trim() || undefined,
      phone: editContactPhone.trim() || undefined,
      email: editContactEmail.trim() || undefined,
      speedDialIndex: editContactSpeedDial,
    };

    const isNew = !localContacts.some((c) => c.id === editingContact.id);
    let updatedLocal: InteractionContact[];
    if (isNew) {
      updatedLocal = [...localContacts, updatedContact];
    } else {
      updatedLocal = localContacts.map((c) => {
        if (c.id === editingContact.id) {
          return updatedContact;
        }
        if (editContactSpeedDial !== null && editContactSpeedDial !== undefined && c.speedDialIndex === editContactSpeedDial) {
          return { ...c, speedDialIndex: null };
        }
        return c;
      });
    }

    setLocalContacts(updatedLocal);
    persistSpeedDialSlots(updatedLocal);

    // If existing contact name changed, update associated notes so history doesn't break
    if (!isNew && editingContact.name.trim().toLowerCase() !== trimmedName.toLowerCase()) {
      const oldName = editingContact.name.trim().toLowerCase();
      const updatedNotes = notes.map((n) => {
        if (n.contactId === editingContact.id || (n.collaborator && n.collaborator.trim().toLowerCase() === oldName)) {
          return { ...n, collaborator: trimmedName, contactId: editingContact.id, updatedAt: Date.now() };
        }
        return n;
      });
      onSaveNotes(updatedNotes);
    }

    const updatedAppContacts: AppContact[] = updatedLocal.map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.name,
      givenName: c.givenName || c.name.split(" ")[0],
      familyName: c.familyName || "",
      speedDialIndex: c.speedDialIndex,
      title: c.title,
      organization: c.organization,
      phone: c.phone,
      email: c.email,
      avatarUrl: c.avatarUrl,
      isLocation: c.isLocation,
    }));

    if (onSaveContacts) {
      onSaveContacts(updatedAppContacts);
    }
    localStorage.setItem("taskpass_contacts_v1", JSON.stringify(updatedAppContacts));
    setEditingContact(null);
  };

  const handleConfirmDeleteContact = () => {
    if (!contactToDelete) return;
    triggerHaptic("heavy");
    const targetId = contactToDelete.id;

    const updatedLocal = localContacts.filter((c) => c.id !== targetId);
    setLocalContacts(updatedLocal);
    persistSpeedDialSlots(updatedLocal);

    const updatedAppContacts: AppContact[] = updatedLocal.map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.name,
      givenName: c.givenName || c.name.split(" ")[0],
      familyName: c.familyName || "",
      speedDialIndex: c.speedDialIndex,
      title: c.title,
      organization: c.organization,
      phone: c.phone,
      email: c.email,
      avatarUrl: c.avatarUrl,
      isLocation: c.isLocation,
    }));

    if (onSaveContacts) {
      onSaveContacts(updatedAppContacts);
    }
    localStorage.setItem("taskpass_contacts_v1", JSON.stringify(updatedAppContacts));

    if (onDeleteContact) {
      onDeleteContact(targetId);
    }

    if (editingContact?.id === targetId) {
      setEditingContact(null);
    }
    setContactToDelete(null);
  };

  // Quick-create contact and assign to current slot
  const handleCreateAndAssignContact = (slotIndex: number) => {
    const trimmed = newCollabNameInput.trim();
    if (!trimmed) return;
    triggerHaptic("medium");

    const newContactId = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newContact: InteractionContact = {
      id: newContactId,
      name: trimmed,
      givenName: trimmed.split(" ")[0] || trimmed,
      familyName: trimmed.split(" ").slice(1).join(" ") || "",
      speedDialIndex: slotIndex,
      title: "Collaborator",
      organization: "Direct Partner"
    };

    const updated = [
      ...localContacts.map((c) => c.speedDialIndex === slotIndex ? { ...c, speedDialIndex: null } : c),
      newContact
    ];

    setLocalContacts(updated);
    setNewCollabNameInput("");
    setAssigningSlotIndex(null);

    if (onSaveContacts) {
      onSaveContacts(updated as AppContact[]);
    }
  };

  // Note CRUD Actions
  const handleDeleteNote = (noteId: string) => {
    triggerHaptic("heavy");
    const updated = notes.filter((n) => n.id !== noteId);
    onSaveNotes(updated);
    deleteInteractionNoteFromCloud(noteId);
  };

  const handleStatusChange = (noteId: string, status: InteractionNote["status"]) => {
    triggerHaptic("light");
    const updated = notes.map((n) => (n.id === noteId ? { ...n, status, updatedAt: Date.now() } : n));
    onSaveNotes(updated);
    const target = updated.find((n) => n.id === noteId);
    if (target) saveInteractionNoteToCloud(target);
  };

  const handleSaveEdit = (noteId: string) => {
    if (!editText.trim()) return;
    triggerHaptic("medium");
    const updated = notes.map((n) =>
      n.id === noteId
        ? { ...n, body: editText.trim(), rawText: editText.trim(), updatedAt: Date.now() }
        : n
    );
    onSaveNotes(updated);
    const target = updated.find((n) => n.id === noteId);
    if (target) saveInteractionNoteToCloud(target);
    setEditingNoteId(null);
  };

  // Open Conversion Modal
  const handleOpenConvert = (note: InteractionNote) => {
    triggerHaptic("medium");
    const contact = contactsMap.get(note.contactId || "");
    const firstSentence = (note.body || note.rawText || "").split(/[.\n]/)[0].trim();
    const cleanTitle = firstSentence.length > 0
      ? (firstSentence.length > 55 ? `${firstSentence.substring(0, 52)}...` : firstSentence)
      : `Follow up with ${contact?.name || "contact"}`;

    setConvertingNote(note);
    setConversionTitle(cleanTitle);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setConversionDueDate(`${yyyy}-${mm}-${dd} 10:00`);
    setConversionIsLocked(false);
    setConversionPriority("medium");
  };

  // Execute Note-to-Task Conversion
  const handleExecuteConvert = async () => {
    if (!convertingNote || !conversionTitle.trim()) return;
    triggerHaptic("heavy");

    const newTask = await convertNoteToTaskInCloud(convertingNote, {
      title: conversionTitle.trim(),
      dueDate: conversionDueDate,
      isLocked: conversionIsLocked,
      priority: conversionPriority,
      collaborator: contactsMap.get(convertingNote.contactId || "")?.name,
      location: locationsMap.get(convertingNote.locationId || "")?.name,
    });

    onAddTask(newTask);

    // Update local notes state
    const updated = notes.map((n) =>
      n.id === convertingNote.id
        ? { ...n, convertedTaskId: newTask.id, status: "needs_task" as const, updatedAt: Date.now() }
        : n
    );
    onSaveNotes(updated);
    setConvertingNote(null);
  };

  // Sort and Filter Notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => {
        const contact = contactsMap.get(n.contactId || "");
        return (
          (n.body && n.body.toLowerCase().includes(q)) ||
          (n.rawText && n.rawText.toLowerCase().includes(q)) ||
          (contact && contact.name.toLowerCase().includes(q)) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q))) ||
          (n.reminderNotes && n.reminderNotes.toLowerCase().includes(q))
        );
      });
    }

    // Filter to only notes with active or scheduled reminders
    if (onlyShowRemindersFilter) {
      result = result.filter((n) => Boolean(n.reminderTime));
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === "newest") {
        return (b.createdAt || new Date(b.timestamp).getTime()) - (a.createdAt || new Date(a.timestamp).getTime());
      }
      if (sortOption === "oldest") {
        return (a.createdAt || new Date(a.timestamp).getTime()) - (b.createdAt || new Date(b.timestamp).getTime());
      }
      if (sortOption === "title") {
        const nameA = contactsMap.get(a.contactId || "")?.name || a.body || "";
        const nameB = contactsMap.get(b.contactId || "")?.name || b.body || "";
        return nameA.localeCompare(nameB);
      }
      if (sortOption === "urgency") {
        const score = (n: InteractionNote) =>
          n.status === "needs_task" ? 3 : n.status === "pending_followup" ? 2 : 1;
        return score(b) - score(a);
      }
      return 0;
    });

    return result;
  }, [notes, searchQuery, sortOption, contactsMap, onlyShowRemindersFilter]);

  // Intelligence Dossier Data
  const selectedContact = contactsMap.get(selectedIntelContactId) || normalizedContacts[0];
  const dossierNotes = useMemo(() => {
    if (!selectedContact) return [];
    return notes
      .filter((n) => n.contactId === selectedContact.id)
      .sort((a, b) => (b.createdAt || new Date(b.timestamp).getTime()) - (a.createdAt || new Date(a.timestamp).getTime()));
  }, [notes, selectedContact]);

  const dossierTasks = useMemo(() => {
    if (!selectedContact) return [];
    const noteIds = new Set(dossierNotes.map((n) => n.id));
    return tasks.filter((t) => (t.noteId && noteIds.has(t.noteId)) || t.collaborator === selectedContact.name);
  }, [tasks, dossierNotes, selectedContact]);

  // Clipboard Digest Exporter
  const handleCopyDigest = () => {
    triggerHaptic("medium");
    let text = "";
    if (intelMode === "prep") {
      if (!selectedContact) return;
      const lines = [
        `# PRE-MEETING EXECUTIVE DOSSIER: ${selectedContact.name.toUpperCase()}`,
        `Role: ${selectedContact.title} | Org: ${selectedContact.organization}`,
        `Contact Info: ${selectedContact.phone || "N/A"} | ${selectedContact.email || "N/A"}`,
        "",
        `## Prior Interactions (${dossierNotes.length}):`,
      ];
      dossierNotes.forEach((n, idx) => {
        const dateStr = new Date(n.timestamp || n.createdAt).toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const loc = locationsMap.get(n.locationId || "")?.name || n.location || "Meeting";
        lines.push(`${idx + 1}. [${dateStr} @ ${loc}]`);
        lines.push(`   "${n.body || n.rawText}"`);
        if (n.tags && n.tags.length > 0) {
          lines.push(`   Tags: ${n.tags.map((t) => `#${t}`).join(", ")}`);
        }
      });
      if (dossierTasks.length > 0) {
        lines.push("");
        lines.push(`## Associated Action Items (${dossierTasks.length}):`);
        dossierTasks.forEach((t) => {
          const status = t.completed ? "✓ DONE" : "○ OPEN";
          const type = t.isLocked ? "[Locked Calendar Anchor]" : "[Flexible Backlog]";
          lines.push(`- ${status} ${t.title} (${type}, Due: ${t.time || t.date})`);
        });
      }
      text = lines.join("\n");
    } else {
      const unconverted = notes.filter((n) => !n.convertedTaskId && n.status !== "archived");
      const pendingFollowups = notes.filter((n) => n.status === "pending_followup");
      const lines = [
        `# INTERACTION INTELLIGENCE: FOLLOW-UP TRACKER DIGEST`,
        `Generated: ${new Date().toLocaleString()}`,
        "",
        `## 1. Unconverted Action Items (${unconverted.length})`,
      ];
      unconverted.forEach((n, i) => {
        const contact = contactsMap.get(n.contactId || "");
        lines.push(`${i + 1}. ${contact?.name || "Contact"}: "${(n.body || n.rawText).substring(0, 90)}..."`);
      });
      lines.push("");
      lines.push(`## 2. Pending Follow-up Commitments (${pendingFollowups.length})`);
      pendingFollowups.forEach((n, i) => {
        const contact = contactsMap.get(n.contactId || "");
        lines.push(`${i + 1}. ${contact?.name || "Contact"} (Target Date: ${n.followUpDate || "Unscheduled"})`);
      });
      text = lines.join("\n");
    }

    navigator.clipboard.writeText(text);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2000);
  };

  const formatTimestamp = (isoOrTs: string | number) => {
    try {
      const d = typeof isoOrTs === "number" ? new Date(isoOrTs) : new Date(isoOrTs);
      const now = new Date();
      const diffHours = (now.getTime() - d.getTime()) / (1000 * 3600);
      if (diffHours < 24 && now.getDate() === d.getDate()) {
        return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return String(isoOrTs);
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? "bg-[#0B1120] text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      {/* 1. TOP HEADER & SCREEN SWITCHER */}
      <div className={`shrink-0 px-4 py-2.5 border-b flex items-center justify-between gap-3 ${isDark ? "bg-slate-900/90 border-white/10" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap size={16} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider">Interaction Tracker</h2>
            <p className="text-[10px] opacity-60">Speed Dial • Ratchet Swiper • Intelligence Dossier</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className={`p-1 rounded-xl border flex items-center gap-1 ${isDark ? "bg-slate-950 border-white/10" : "bg-slate-100 border-slate-200"}`}>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveScreen("swiper");
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScreen === "swiper"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Notes Swiper
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveScreen("intelligence");
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeScreen === "intelligence"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Intelligence Dossier
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. COMPACT SPEED DIAL QUICK-LOG BAR (6 SLOTS: 0 - 5) */}
      <div className={`shrink-0 px-4 py-2 border-b select-none ${isDark ? "bg-slate-900/60 border-white/5" : "bg-slate-100 border-slate-200"}`}>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">SPEED DIAL QUICK-LOG</span>
            <span className="hidden sm:inline text-[8.5px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Hold slot to reassign
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditSlotsMode(!editSlotsMode);
              triggerHaptic("light");
            }}
            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
              editSlotsMode
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse font-black"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title="Toggle quick reassignment mode for all speed dial slots"
          >
            <Edit2 size={9} />
            <span>{editSlotsMode ? "Done Reassigning" : "Reassign Slots"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
          {speedDialSlots.map((slotIdx) => {
            const contact = getContactForSlot(slotIdx);
            const isAssigned = !!contact;
            const isHolding = holdingSlotIndex === slotIdx;

            return (
              <div
                key={`slot-${slotIdx}`}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                  startLongPress(slotIdx, e.clientX, e.clientY);
                }}
                onPointerUp={() => cancelLongPress(slotIdx)}
                onPointerLeave={() => cancelLongPress(slotIdx)}
                onPointerCancel={() => cancelLongPress(slotIdx)}
                onPointerMove={(e) => handlePointerMove(slotIdx, e.clientX, e.clientY)}
                onClick={(e) => handleSlotClick(slotIdx, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelLongPress(slotIdx);
                  triggerHaptic("heavy");
                  setAssignSearchQuery("");
                  setAssigningSlotIndex(slotIdx);
                }}
                className={`relative flex flex-col items-center gap-1 w-14 shrink-0 group cursor-pointer transition-transform select-none touch-none ${
                  isHolding ? "scale-90" : "active:scale-95"
                } ${isAssigned ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                title={isAssigned ? `${contact.name} (Slot ${slotIdx + 1}) • Tap to log • Long-press or click ✎ to reassign` : `Slot ${slotIdx + 1}: Tap or hold to assign collaborator`}
              >
                {/* Slot Number Badge */}
                <span className={`absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full text-[8.5px] font-black flex items-center justify-center text-white transition-all ${
                  isHolding ? "bg-amber-500 scale-110" : editSlotsMode ? "bg-amber-600 animate-pulse" : isAssigned ? "bg-blue-600 shadow-xs" : "bg-slate-600"
                }`}>
                  {slotIdx + 1}
                </span>

                {/* Avatar / Circle with hold progress indicator */}
                <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all relative ${
                  isHolding
                    ? "border-amber-400 ring-2 ring-amber-400/50 bg-amber-950/40"
                    : editSlotsMode
                    ? "border-amber-400 border-dashed bg-amber-500/10 ring-2 ring-amber-400/30"
                    : isAssigned
                    ? "border-blue-500/80 bg-blue-950/40 shadow-sm shadow-blue-500/20 group-hover:border-blue-400"
                    : "border-dashed border-slate-600 bg-slate-800/40 text-slate-500 group-hover:border-slate-400"
                }`}>
                  {/* Circular hold progress ring when pressing and holding */}
                  {isHolding && (
                    <svg className="absolute inset-0 w-11 h-11 -rotate-90 pointer-events-none z-20">
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="3.5"
                        strokeDasharray={113.1}
                        strokeDashoffset={113.1 - (113.1 * holdProgress) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-75"
                      />
                    </svg>
                  )}

                  {isAssigned && contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                  ) : isAssigned ? (
                    <span className="text-xs font-black text-blue-300">
                      {contact.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                  ) : (
                    <Plus size={16} />
                  )}
                </div>

                {/* Direct Reassign Pencil Button - ALWAYS clearly accessible */}
                {isAssigned && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("medium");
                      setAssignSearchQuery("");
                      setAssigningSlotIndex(slotIdx);
                    }}
                    className={`absolute bottom-4 -right-1 z-20 w-4.5 h-4.5 rounded-full border border-white/20 flex items-center justify-center text-[9px] shadow-sm transition-all cursor-pointer hover:scale-115 ${
                      editSlotsMode
                        ? "bg-amber-500 text-slate-950 font-black animate-bounce"
                        : "bg-slate-900 text-slate-300 hover:text-white hover:bg-emerald-600"
                    }`}
                    title={`Reassign Slot #${slotIdx + 1}`}
                    aria-label={`Reassign Slot #${slotIdx + 1}`}
                  >
                    <Edit2 size={8.5} />
                  </button>
                )}

                {/* Contact Name / Label */}
                <span className={`text-[10px] font-bold truncate w-full text-center ${editSlotsMode ? "text-amber-300 font-black" : "text-slate-300"}`}>
                  {isAssigned ? contact.name.split(" ")[0] : "Assign"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SCREEN CONTENT */}
      {activeScreen === "swiper" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* COMPACT MULTI-CRITERIA FILTERING & SEARCH BAR */}
          <div className={`shrink-0 px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200"}`}>
            {/* Search Input */}
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search interactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border outline-hidden transition-all ${
                  isDark ? "bg-slate-950/80 border-white/10 text-white placeholder-slate-500" : "bg-slate-100 border-slate-200 text-slate-800"
                }`}
              />
            </div>

            {/* Filter & Sort Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setOnlyShowRemindersFilter(!onlyShowRemindersFilter);
                }}
                className={`py-0.5 px-2.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlyShowRemindersFilter
                    ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                    : isDark
                    ? "bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/20"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
                title="Filter to interactions with reminders"
              >
                <Bell size={10} className={onlyShowRemindersFilter ? "text-slate-950 fill-current" : "text-amber-400"} />
                <span>Reminders ({notes.filter((n) => !!n.reminderTime).length})</span>
              </button>

              <span className="text-[9px] font-bold text-slate-500 uppercase">Sort:</span>
              {(["newest", "oldest", "urgency", "title"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    triggerHaptic("light");
                    setSortOption(opt);
                  }}
                  className={`py-0.5 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    sortOption === opt
                      ? "bg-blue-600 text-white"
                      : isDark ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* RATCHET SWIPER COLUMN HEADER BAR */}
          <div className={`shrink-0 flex border-b ${isDark ? "bg-slate-950 border-white/10" : "bg-slate-100 border-slate-200"}`}>
            {COLUMNS.map((col, idx) => {
              const isActive = idx === activeColIndex;
              const count = filteredNotes.filter((n) => n.status === col.key).length;
              const Icon = col.icon;

              return (
                <button
                  key={col.key}
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveColIndex(idx);
                  }}
                  className={`flex-1 py-2 px-2 flex items-center justify-center gap-1.5 transition-all relative cursor-pointer ${
                    isActive ? (isDark ? "bg-slate-900" : "bg-white") : "hover:bg-white/5 opacity-75"
                  }`}
                >
                  <Icon size={12} className={col.textColor} />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? (isDark ? "text-white" : "text-slate-900") : "text-slate-400"}`}>
                    {col.label}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black text-white ${col.badgeColor}`}>
                    {count}
                  </span>
                  {isActive && (
                    <div className={`absolute bottom-0 left-2 right-2 h-0.5 ${col.badgeColor} rounded-full`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* COLUMN CARDS VIEWPORT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {(() => {
              const activeCol = COLUMNS[activeColIndex];
              const colNotes = filteredNotes.filter((n) => n.status === activeCol.key);

              if (colNotes.length === 0) {
                return (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                    <p className="text-xs font-bold uppercase tracking-wider">No notes in {activeCol.label}</p>
                    <p className="text-[10px] mt-1">Tap an assigned contact slot above to quick-log an interaction.</p>
                  </div>
                );
              }

              return colNotes.map((note) => {
                const contact = contactsMap.get(note.contactId || "");
                const location = locationsMap.get(note.locationId || "");
                const isEditing = editingNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isDark ? "bg-slate-900/90 border-white/10 hover:border-blue-500/40" : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    {/* Card Header: Contact Badge, Location, Timestamp */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                          {contact ? contact.name.slice(0, 2).toUpperCase() : "CT"}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold leading-tight text-white">{contact?.name || "Direct Note"}</h4>
                          <p className="text-[9.5px] text-slate-400">{contact?.title} • {contact?.organization}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-0.5">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          📍 {location?.name || note.location || "Office"}
                        </span>
                        <span className="text-[8.5px] text-slate-500">{formatTimestamp(note.timestamp || note.createdAt)}</span>
                      </div>
                    </div>

                    {/* Note Body */}
                    {isEditing ? (
                      <div className="space-y-2 my-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className={`w-full p-2 text-xs rounded-xl border outline-hidden ${
                            isDark ? "bg-slate-950 border-blue-500 text-white" : "bg-slate-50 border-blue-500 text-slate-900"
                          }`}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(note.id)}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-slate-200 my-1.5">{note.body || note.rawText}</p>
                    )}

                    {/* Reminder Badge / Banner */}
                    {note.reminderTime && (() => {
                      const isOverdue = !note.reminderCompleted && new Date(note.reminderTime).getTime() < Date.now();
                      const isDone = note.reminderCompleted;

                      return (
                        <div className={`mt-2 mb-1.5 p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                          isDone
                            ? "bg-slate-950/60 border-slate-800 text-slate-400"
                            : isOverdue
                            ? "bg-red-500/10 border-red-500/30 text-red-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        }`}>
                          <div
                            className="flex items-center gap-1.5 min-w-0 cursor-pointer flex-1"
                            onClick={() => handleOpenSetReminder(note)}
                            title="Click to edit reminder"
                          >
                            {isDone ? (
                              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                            ) : isOverdue ? (
                              <AlertTriangle size={13} className="text-red-400 shrink-0 animate-pulse" />
                            ) : (
                              <BellRing size={13} className="text-amber-400 shrink-0 animate-pulse" />
                            )}
                            <div className="truncate">
                              <span className="font-bold">
                                {isDone ? "Reminder completed:" : isOverdue ? "Overdue follow-up:" : "Follow-up reminder:"}
                              </span>{" "}
                              <span className="font-mono text-[11px] underline underline-offset-2">
                                {formatReminderDisplay(note.reminderTime)}
                              </span>
                              {note.reminderNotes && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                                  "{note.reminderNotes}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isDone ? (
                              <button
                                type="button"
                                onClick={() => handleToggleReminderCompleted(note.id)}
                                className="px-2 py-0.5 rounded-lg text-[9.5px] font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                                title="Mark reminder completed"
                              >
                                ✓ Done
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleReminderCompleted(note.id)}
                                className="px-2 py-0.5 rounded-lg text-[9.5px] font-bold bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                                title="Reactivate reminder"
                              >
                                Reopen
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleClearReminder(note.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                              title="Clear reminder"
                            >
                              <BellOff size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tags & Action Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {note.tags?.map((tag) => (
                          <span key={tag} className="text-[9px] font-bold text-blue-400">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Set Reminder Action Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenSetReminder(note)}
                          title={note.reminderTime ? "Edit follow-up reminder" : "Set follow-up reminder"}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            note.reminderTime
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                              : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10"
                          }`}
                        >
                          <Bell size={10} className={note.reminderTime ? "text-amber-400 fill-amber-400/20" : "text-slate-400"} />
                          <span>{note.reminderTime ? "Reminder" : "Remind"}</span>
                        </button>

                        {/* Note-to-Task Conversion Action */}
                        <button
                          onClick={() => handleOpenConvert(note)}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            note.convertedTaskId
                              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                          }`}
                        >
                          <Zap size={10} />
                          <span>{note.convertedTaskId ? "Task Linked ✓" : "To Task ⚡"}</span>
                        </button>

                        {/* Status Transition buttons */}
                        {activeCol.key !== "archived" ? (
                          <button
                            onClick={() => handleStatusChange(note.id, "archived")}
                            title="Archive Note"
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          >
                            <Archive size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(note.id, "recent")}
                            title="Restore Note"
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          >
                            ↩️
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditText(note.body || note.rawText);
                          }}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded-lg hover:bg-white/10 text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        /* 4. INTERACTION REPORTING & INTELLIGENCE DOSSIER SCREEN */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Intelligence Action Bar */}
          <div className={`shrink-0 px-4 py-2 border-b flex items-center justify-between gap-3 ${isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setIntelMode("prep");
                }}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  intelMode === "prep" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                🎯 Pre-Meeting Dossier
              </button>
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setIntelMode("followup");
                }}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  intelMode === "followup" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                ⚡ Follow-Up Tracker
              </button>
            </div>

            <button
              onClick={handleCopyDigest}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedDigest ? "bg-emerald-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30"
              }`}
            >
              {copiedDigest ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedDigest ? "Copied Digest!" : "Copy Digest"}</span>
            </button>
          </div>

          {/* Dossier Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {intelMode === "prep" ? (
              <>
                {/* Contact Selector Carousel */}
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                    SELECT DOSSIER CONTACT:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {normalizedContacts.map((c) => {
                      const isSelected = c.id === selectedContact?.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            triggerHaptic("light");
                            setSelectedIntelContactId(c.id);
                          }}
                          className={`flex items-center gap-2 py-1 px-2.5 rounded-full border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 border-blue-500 text-white shadow-xs"
                              : "bg-slate-900 border-white/10 text-slate-300 hover:border-white/20"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px]">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Hero Summary */}
                {selectedContact && (
                  <div className={`p-4 rounded-3xl border ${isDark ? "bg-slate-900/90 border-white/10" : "bg-white border-slate-200"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-sm font-black text-indigo-300">
                        {selectedContact.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{selectedContact.name}</h3>
                        <p className="text-xs text-blue-400">{selectedContact.title} • {selectedContact.organization}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{selectedContact.phone || "No phone"} | {selectedContact.email || "No email"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center">
                      <div className="p-2 rounded-xl bg-slate-950/50">
                        <span className="block text-base font-black text-white">{dossierNotes.length}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Interactions</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/50">
                        <span className="block text-base font-black text-white">{dossierTasks.filter((t) => !t.completed).length}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Open Tasks</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/50">
                        <span className="block text-base font-black text-white">{dossierNotes.filter((n) => n.status === "pending_followup").length}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Follow-ups</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chronological Prior Notes Feed */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">CHRONOLOGICAL HISTORY</h4>
                  {dossierNotes.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-white/5 rounded-2xl text-xs text-slate-500">
                      No prior interaction logs found for this contact.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossierNotes.map((n) => (
                        <div key={n.id} className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>{new Date(n.timestamp || n.createdAt).toLocaleString()}</span>
                            <span className="text-blue-400">📍 {locationsMap.get(n.locationId || "")?.name || n.location || "Meeting"}</span>
                          </div>
                          <p className="text-xs text-slate-200">{n.body || n.rawText}</p>
                          {n.reminderTime && (
                            <div className="text-[10px] text-amber-300 flex items-center gap-1 font-mono pt-1 border-t border-white/5">
                              <Bell size={11} className="text-amber-400" />
                              <span>Reminder: {formatReminderDisplay(n.reminderTime)}</span>
                              {n.reminderNotes && <span className="text-slate-400 truncate font-sans">({n.reminderNotes})</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Follow-Up Tracker Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30">
                    <span className="text-2xl font-black text-amber-400">
                      {notes.filter((n) => !n.convertedTaskId && n.status !== "archived").length}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1">Unconverted Notes</h4>
                    <p className="text-[9.5px] text-slate-400 leading-tight">Missing calendar tasks</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-pink-500/30">
                    <span className="text-2xl font-black text-pink-400">
                      {notes.filter((n) => n.status === "pending_followup").length}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1">Pending Follow-ups</h4>
                    <p className="text-[9.5px] text-slate-400 leading-tight">Awaiting commitments</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/30">
                    <span className="text-2xl font-black text-emerald-400">
                      {notes.filter((n) => Boolean(n.reminderTime) && !n.reminderCompleted).length}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1">Active Reminders</h4>
                    <p className="text-[9.5px] text-slate-400 leading-tight">Scheduled alerts</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">UNCONVERTED RECENT LOGS</h4>
                  <div className="space-y-2">
                    {notes
                      .filter((n) => !n.convertedTaskId && n.status !== "archived")
                      .slice(0, 6)
                      .map((n) => {
                        const contact = contactsMap.get(n.contactId || "");
                        return (
                          <div key={n.id} className="p-3 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-between gap-3">
                            <div>
                              <h5 className="text-xs font-bold text-blue-400">{contact?.name || "Direct Note"}</h5>
                              <p className="text-xs text-slate-300 line-clamp-1">{n.body || n.rawText}</p>
                            </div>
                            <button
                              onClick={() => handleOpenConvert(n)}
                              className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                            >
                              Convert ⚡
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. LIGHTWEIGHT QUICK-CAPTURE MODAL */}
      {activeCaptureContact && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">QUICK INTERACTION LOG</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-base font-bold text-white">{activeCaptureContact.name}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const slot = activeCaptureContact.speedDialIndex ?? 0;
                      setActiveCaptureContact(null);
                      setAssignSearchQuery("");
                      setAssigningSlotIndex(slot);
                      triggerHaptic("medium");
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                    title="Reassign this speed dial slot to another contact"
                  >
                    (Reassign Slot)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">{activeCaptureContact.title} • {activeCaptureContact.organization}</p>
              </div>

              {/* Minimal One-Touch Location Selector Badge */}
              <div className="relative">
                <button
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="py-1 px-2.5 rounded-xl border border-white/10 bg-slate-950 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <span>📍 {locationsMap.get(selectedLocationId)?.name.split(" ")[0]}</span>
                  <ChevronDown size={12} />
                </button>

                {showLocationPicker && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-950 border border-white/10 rounded-xl p-1 shadow-2xl z-50 space-y-0.5">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          setSelectedLocationId(loc.id);
                          setShowLocationPicker(false);
                        }}
                        className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
                      >
                        <span>{loc.type === "virtual" ? "💻" : loc.type === "phone" ? "📞" : "🏢"}</span>
                        <span>{loc.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="What was discussed? Decisions, action items, next steps..."
              value={quickNoteBody}
              onChange={(e) => setQuickNoteBody(e.target.value)}
              className="w-full p-3 rounded-2xl border border-white/10 bg-slate-950 text-xs text-white placeholder-slate-500 outline-hidden focus:border-blue-500"
              autoFocus
            />

            {/* Quick Tag Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["meeting", "sync", "architecture", "deal", "action-item"].map((t) => {
                const isSelected = quickTags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setQuickTags(isSelected ? quickTags.filter((x) => x !== t) : [...quickTags, t]);
                    }}
                    className={`py-0.5 px-2 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                      isSelected ? "bg-blue-600/30 border-blue-500 text-blue-300" : "bg-slate-950 border-white/10 text-slate-400"
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>

            {/* Inline Quick Reminder Toggle & Picker */}
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bell size={13} className={quickReminderEnabled ? "text-amber-400" : "text-slate-400"} />
                  <span className="text-xs font-bold text-slate-200">Set Follow-up Reminder</span>
                </div>
                <input
                  type="checkbox"
                  checked={quickReminderEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setQuickReminderEnabled(checked);
                    if (checked && !quickReminderDatetime) {
                      const d = new Date(Date.now() + 60 * 60 * 1000);
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      const hh = String(d.getHours()).padStart(2, '0');
                      const min = String(d.getMinutes()).padStart(2, '0');
                      setQuickReminderDatetime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
              </div>

              {quickReminderEnabled && (
                <div className="space-y-2 pt-1 border-t border-white/5 animate-in fade-in duration-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "+15m", getMs: () => Date.now() + 15 * 60 * 1000 },
                      { label: "+1h", getMs: () => Date.now() + 60 * 60 * 1000 },
                      { label: "+3h", getMs: () => Date.now() + 3 * 60 * 60 * 1000 },
                      {
                        label: "Tomorrow 9am",
                        getMs: () => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          d.setHours(9, 0, 0, 0);
                          return d.getTime();
                        },
                      },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          const d = new Date(chip.getMs());
                          const yyyy = d.getFullYear();
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const dd = String(d.getDate()).padStart(2, '0');
                          const hh = String(d.getHours()).padStart(2, '0');
                          const min = String(d.getMinutes()).padStart(2, '0');
                          setQuickReminderDatetime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
                        }}
                        className="px-2 py-0.5 rounded-lg text-[9.5px] font-bold bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="datetime-local"
                    value={quickReminderDatetime}
                    onChange={(e) => setQuickReminderDatetime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-white/10 bg-slate-900 text-white font-mono outline-hidden focus:border-amber-400"
                  />
                  <input
                    type="text"
                    placeholder="Reminder topic / next action..."
                    value={quickReminderNote}
                    onChange={(e) => setQuickReminderNote(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-500 outline-hidden focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setActiveCaptureContact(null)}
                className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleSaveQuickNote}
                disabled={!quickNoteBody.trim()}
                className={`py-1.5 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                  quickNoteBody.trim() ? "bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20" : "bg-blue-600/40 opacity-50"
                }`}
              >
                Save Interaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. NOTE-TO-TASK CONVERSION MODAL (FLEXIBLE VS LOCKED) */}
      {convertingNote && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-3.5">
            <div>
              <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">CONVERT NOTE TO TASK</span>
              <h3 className="text-base font-bold text-white mt-0.5">Schedule Action Item</h3>
            </div>

            {/* Action Title */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Task Action Title</label>
              <input
                type="text"
                value={conversionTitle}
                onChange={(e) => setConversionTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950 text-xs text-white outline-hidden focus:border-blue-500"
              />
            </div>

            {/* DUAL MODE TOGGLE: FLEXIBLE VS LOCKED */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Calendar Anchor Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConversionIsLocked(false)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    !conversionIsLocked
                      ? "border-sky-500 bg-sky-950/40 text-white shadow-sm"
                      : "border-white/10 bg-slate-950 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold text-xs text-sky-400">
                    <Waves size={14} />
                    <span>Flexible Task</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-tight">Cascades dynamically in backlog to greedily fill schedule gaps.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setConversionIsLocked(true)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    conversionIsLocked
                      ? "border-emerald-500 bg-emerald-950/40 text-white shadow-sm"
                      : "border-white/10 bg-slate-950 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold text-xs text-emerald-400">
                    <Lock size={14} />
                    <span>Locked Task</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-tight">Enforces a strict immutable clock deadline synced with calendar.</p>
                </button>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {conversionIsLocked ? "Exact Appointment Time (YYYY-MM-DD HH:MM)" : "Target Completion Date (YYYY-MM-DD)"}
              </label>
              <input
                type="text"
                value={conversionDueDate}
                onChange={(e) => setConversionDueDate(e.target.value)}
                placeholder="2026-09-30 10:00"
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-950 text-xs text-white outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Priority</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((p) => {
                  const isActive = conversionPriority === p;
                  const color = p === "high" ? "text-rose-400 border-rose-500/40" : p === "medium" ? "text-amber-400 border-amber-500/40" : "text-emerald-400 border-emerald-500/40";
                  return (
                    <button
                      key={p}
                      onClick={() => setConversionPriority(p)}
                      className={`flex-1 py-1 px-2 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        isActive ? `bg-white/10 ${color}` : "border-white/10 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setConvertingNote(null)}
                className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConvert}
                className="py-1.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {conversionIsLocked ? "Anchor Locked Task 🔒" : "Schedule Flexible Task ⚡"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. QUICK-ASSIGN SPEED DIAL PICKER MODAL */}
      {assigningSlotIndex !== null && (() => {
        const currentContactInSlot = normalizedContacts.find((c) => c.speedDialIndex === assigningSlotIndex);
        const filteredAssignContacts = normalizedContacts.filter((c) => {
          if (!assignSearchQuery.trim()) return true;
          const q = assignSearchQuery.toLowerCase();
          return c.name.toLowerCase().includes(q) || (c.organization && c.organization.toLowerCase().includes(q)) || (c.title && c.title.toLowerCase().includes(q));
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">SPEED DIAL ASSIGNMENT</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">Assign Slot #{assigningSlotIndex + 1}</h3>
                  <p className="text-[10px] text-slate-400">Tap a collaborator to assign or reassign this slot</p>
                </div>
                <button
                  onClick={() => setAssigningSlotIndex(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Current Assignment Status & Clear Option */}
              {currentContactInSlot ? (
                <div className="p-2.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-[10px] font-black text-blue-300 shrink-0">
                      {currentContactInSlot.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-blue-300 font-bold block uppercase tracking-wider">Current Slot #{assigningSlotIndex + 1}</span>
                      <span className="text-xs font-bold text-white truncate block">{currentContactInSlot.name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAssignSpeedDial(assigningSlotIndex, null)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer shrink-0"
                    title="Clear collaborator from this slot"
                  >
                    Clear Slot
                  </button>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 text-[10px] text-slate-400 text-center">
                  Slot #{assigningSlotIndex + 1} is currently unassigned.
                </div>
              )}

              {/* Search Filter Input */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search collaborators..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick Add Custom Collaborator Field */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="+ Add new collaborator..."
                  value={newCollabNameInput}
                  onChange={(e) => setNewCollabNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateAndAssignContact(assigningSlotIndex);
                  }}
                  className="flex-1 px-2.5 py-1 text-xs rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleCreateAndAssignContact(assigningSlotIndex)}
                  disabled={!newCollabNameInput.trim()}
                  className="px-3 py-1 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer transition-all shrink-0"
                >
                  + Add
                </button>
              </div>

              {/* Collaborator List */}
              <div className="max-h-56 overflow-y-auto space-y-1 py-0.5 pr-1">
                {filteredAssignContacts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No matching collaborators found.
                  </div>
                ) : (
                  filteredAssignContacts.map((c) => {
                    const isCurrent = c.speedDialIndex === assigningSlotIndex;
                    const otherSlot = c.speedDialIndex !== null && c.speedDialIndex !== undefined && c.speedDialIndex !== assigningSlotIndex ? c.speedDialIndex : null;

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleAssignSpeedDial(assigningSlotIndex, isCurrent ? null : c.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isCurrent
                            ? "bg-blue-600/25 border-blue-500 text-white shadow-xs"
                            : "bg-slate-950/70 border-white/5 hover:border-white/20 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isCurrent ? "bg-blue-500 text-white" : "bg-indigo-600/30 text-indigo-300"
                          }`}>
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold leading-tight truncate">{c.name}</h4>
                            <p className="text-[9px] text-slate-500 truncate">
                              {c.title || "Collaborator"} {c.organization ? `• ${c.organization}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {otherSlot !== null && (
                            <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
                              Slot #{otherSlot + 1}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            isCurrent
                              ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/40"
                              : "bg-blue-600/30 text-blue-300 hover:bg-blue-600/50"
                          }`}>
                            {isCurrent ? "Unassign" : "Assign"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setAssigningSlotIndex(null)}
                  className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. SET REMINDER MODAL FOR TRACKED INTERACTIONS */}
      {reminderModalNote && (
        <div className="fixed inset-0 z-[600] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BellRing size={16} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Set Follow-up Reminder</h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-[260px]">
                    {reminderModalNote.collaborator || "Interaction"} • {reminderModalNote.title || reminderModalNote.body.substring(0, 30)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReminderModalNote(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Quick Time Presets
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "+15 Mins", getMs: () => Date.now() + 15 * 60 * 1000 },
                  { label: "+1 Hour", getMs: () => Date.now() + 60 * 60 * 1000 },
                  { label: "+3 Hours", getMs: () => Date.now() + 3 * 60 * 60 * 1000 },
                  {
                    label: "Tomorrow 9 AM",
                    getMs: () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(9, 0, 0, 0);
                      return d.getTime();
                    },
                  },
                  {
                    label: "In 2 Days (9 AM)",
                    getMs: () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      d.setHours(9, 0, 0, 0);
                      return d.getTime();
                    },
                  },
                  {
                    label: "Next Mon 9 AM",
                    getMs: () => {
                      const d = new Date();
                      const day = d.getDay();
                      const diff = day === 0 ? 1 : 8 - day;
                      d.setDate(d.getDate() + diff);
                      d.setHours(9, 0, 0, 0);
                      return d.getTime();
                    },
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      const targetDate = new Date(preset.getMs());
                      const yyyy = targetDate.getFullYear();
                      const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
                      const dd = String(targetDate.getDate()).padStart(2, "0");
                      const hh = String(targetDate.getHours()).padStart(2, "0");
                      const min = String(targetDate.getMinutes()).padStart(2, "0");
                      setReminderDatetime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
                    }}
                    className="py-1.5 px-2 rounded-xl text-[10.5px] font-bold border border-white/10 bg-slate-950/70 hover:bg-amber-500/20 hover:border-amber-500/40 text-slate-200 hover:text-amber-300 transition-all cursor-pointer text-center"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time Picker */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Exact Date & Time
              </label>
              <input
                type="datetime-local"
                value={reminderDatetime}
                onChange={(e) => setReminderDatetime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-white/15 bg-slate-950 text-white outline-hidden focus:border-amber-400 font-mono"
              />
            </div>

            {/* Reminder Topic / Note */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Reminder Note / Action Topic (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Call to finalize quote, verify payment status..."
                value={reminderNotesText}
                onChange={(e) => setReminderNotesText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-white/15 bg-slate-950 text-white placeholder-slate-500 outline-hidden focus:border-amber-400"
              />
            </div>

            {/* Sync as Calendar Task Option */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Sync as Calendar Task</p>
                <p className="text-[10px] text-slate-400">Also schedule a locked task at this reminder time</p>
              </div>
              <input
                type="checkbox"
                checked={alsoCreateTaskWithReminder}
                onChange={(e) => setAlsoCreateTaskWithReminder(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              {reminderModalNote.reminderTime ? (
                <button
                  type="button"
                  onClick={() => handleClearReminder(reminderModalNote.id)}
                  className="py-1.5 px-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <BellOff size={13} />
                  <span>Remove</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReminderModalNote(null)}
                  className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!reminderDatetime}
                  onClick={handleSaveReminder}
                  className={`py-1.5 px-4 rounded-xl text-xs font-bold text-slate-950 flex items-center gap-1.5 cursor-pointer transition-all ${
                    reminderDatetime
                      ? "bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 font-black"
                      : "bg-amber-400/40 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <Check size={14} />
                  <span>Save Reminder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
