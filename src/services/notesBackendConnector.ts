/**
 * Notes & Interaction Tracker Backend Connector
 * Robust Firestore integration with offline cache fallback, real-time listeners,
 * defensive error handling, and transaction-safe task conversion.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocFromServer,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Task } from "../types";

export type NoteStatus = 'recent' | 'pending_followup' | 'needs_task' | 'archived';

export interface InteractionNote {
  id: string;
  userId?: string;
  contactId?: string;
  locationId?: string;
  timestamp: string; // ISO 8601 string
  rawText: string;
  body: string;
  title?: string;
  tags: string[];
  status: NoteStatus;
  convertedTaskId?: string;
  followUpDate?: string;
  reminderTime?: string;
  reminderNotes?: string;
  reminderCompleted?: boolean;
  createdAt: number;
  updatedAt?: number;
  project?: string;
  collaborator?: string;
  location?: string;
  associatedTaskId?: string;
  associatedRoutineId?: string;
}

export interface InteractionContact {
  id: string;
  userId?: string;
  name: string;
  givenName?: string;
  familyName?: string;
  speedDialIndex: number | null; // 0 to 5, or null
  avatarUrl?: string;
  title?: string;
  organization?: string;
  phone?: string;
  email?: string;
  address?: string;
  isLocation?: boolean;
}

export interface InteractionLocation {
  id: string;
  userId?: string;
  name: string;
  type: 'in-person' | 'phone' | 'virtual' | 'office';
  addressOrUri?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  return errInfo;
}

// Default Seed Locations
export const DEFAULT_LOCATIONS: InteractionLocation[] = [
  { id: 'loc-virtual', name: 'Google Meet / Virtual', type: 'virtual' },
  { id: 'loc-office-hq', name: 'HQ Conf Room 4A', type: 'office' },
  { id: 'loc-phone', name: 'Direct Phone Call', type: 'phone' },
  { id: 'loc-coffee', name: 'Blue Bottle Cafe', type: 'in-person' },
];

// Helper to strip non-serializable fields before Firestore write
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const copy: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      copy[key] = value;
    }
  }
  return copy;
}

/**
 * Validates connection to Firestore server per skill specification
 */
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline, using local persistent cache.");
    }
    return false;
  }
}

/**
 * Save or update an interaction note in Firestore with optimistic local storage
 */
export async function saveInteractionNoteToCloud(
  note: InteractionNote,
  userId?: string
): Promise<void> {
  const currentUid = userId || auth?.currentUser?.uid || "anonymous_user";
  const noteDoc: InteractionNote = {
    ...note,
    userId: currentUid,
    updatedAt: Date.now(),
  };

  if (db && auth?.currentUser) {
    try {
      await setDoc(doc(db, "notes", note.id), cleanForFirestore(noteDoc));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notes/${note.id}`);
    }
  }

  // Also persist to backend Express API server connector
  try {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteDoc })
    });
  } catch (apiErr) {
    // Graceful offline fallback
    console.warn("Backend notes API connector fallback:", apiErr);
  }
}

/**
 * Delete an interaction note from Firestore and backend server
 */
export async function deleteInteractionNoteFromCloud(
  noteId: string,
  userId?: string
): Promise<void> {
  if (db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, "notes", noteId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notes/${noteId}`);
    }
  }

  try {
    await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE"
    });
  } catch (apiErr) {
    console.warn("Backend notes API delete connector fallback:", apiErr);
  }
}

/**
 * Atomic Note-to-Task Conversion:
 * Creates the new Task with source noteId, anchors it as Flexible or Locked,
 * and updates the Note status to 'needs_task' and links convertedTaskId.
 */
export async function convertNoteToTaskInCloud(
  note: InteractionNote,
  taskParams: {
    title: string;
    dueDate: string;
    isLocked: boolean;
    duration?: string;
    priority?: 'high' | 'medium' | 'low';
    location?: string;
    collaborator?: string;
  },
  userId?: string
): Promise<Task> {
  const currentUid = userId || auth?.currentUser?.uid || "anonymous_user";
  const newTaskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Format times
  const timePart = taskParams.dueDate.includes(" ")
    ? taskParams.dueDate.split(" ")[1]
    : "10:00";
  const datePart = taskParams.dueDate.includes(" ")
    ? taskParams.dueDate.split(" ")[0]
    : taskParams.dueDate;

  const newTask: Task = {
    id: newTaskId,
    userId: currentUid,
    noteId: note.id,
    title: taskParams.title,
    date: datePart,
    time: timePart,
    computedTime: timePart,
    duration: taskParams.duration || "45 min",
    isLocked: taskParams.isLocked,
    isFlexible: !taskParams.isLocked,
    completed: false,
    priority: taskParams.priority || "medium",
    location: taskParams.location || note.location || "Office",
    collaborator: taskParams.collaborator || note.collaborator || undefined,
  };

  const updatedNote: InteractionNote = {
    ...note,
    convertedTaskId: newTaskId,
    status: 'needs_task',
    updatedAt: Date.now(),
  };

  if (db && auth?.currentUser) {
    try {
      const batch = writeBatch(db);
      const taskRef = doc(db, "tasks", newTaskId);
      const noteRef = doc(db, "notes", note.id);

      batch.set(taskRef, cleanForFirestore(newTask));
      batch.set(noteRef, cleanForFirestore(updatedNote), { merge: true });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tasks/${newTaskId}`);
    }
  }

  // Also call backend server connector
  try {
    await fetch("/api/notes/convert-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId: note.id,
        title: taskParams.title,
        dueDate: taskParams.dueDate,
        isLocked: taskParams.isLocked,
        duration: taskParams.duration,
        priority: taskParams.priority,
        location: taskParams.location,
        collaborator: taskParams.collaborator
      })
    });
  } catch (apiErr) {
    console.warn("Backend convert-task API connector fallback:", apiErr);
  }

  return newTask;
}

/**
 * Assign or swap Speed Dial Contact (0 through 5) in Firestore and backend
 */
export async function assignSpeedDialContactInCloud(
  contactId: string,
  slotIndex: number | null,
  allContacts: InteractionContact[],
  userId?: string
): Promise<InteractionContact[]> {
  const currentUid = userId || auth?.currentUser?.uid || "anonymous_user";

  const updatedContacts = allContacts.map((c) => {
    // If another contact was in this slot, remove it
    if (slotIndex !== null && c.speedDialIndex === slotIndex && c.id !== contactId) {
      return { ...c, speedDialIndex: null };
    }
    // Target contact
    if (c.id === contactId) {
      return { ...c, speedDialIndex: slotIndex };
    }
    return c;
  });

  if (db && auth?.currentUser) {
    try {
      const batch = writeBatch(db);
      updatedContacts.forEach((c) => {
        const ref = doc(db, "contacts", c.id);
        batch.set(ref, cleanForFirestore({ ...c, userId: currentUid }), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `contacts/${contactId}`);
    }
  }

  // Also notify server backend connector
  try {
    await fetch("/api/contacts/speed-dial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIndex, contactId })
    });
  } catch (apiErr) {
    console.warn("Backend speed dial API connector fallback:", apiErr);
  }

  return updatedContacts;
}

/**
 * Save custom Location to Firestore and backend
 */
export async function saveLocationToCloud(
  location: InteractionLocation,
  userId?: string
): Promise<void> {
  const currentUid = userId || auth?.currentUser?.uid || "anonymous_user";
  if (db && auth?.currentUser) {
    try {
      await setDoc(doc(db, "locations", location.id), cleanForFirestore({ ...location, userId: currentUid }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `locations/${location.id}`);
    }
  }

  try {
    await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location })
    });
  } catch (apiErr) {
    console.warn("Backend location API connector fallback:", apiErr);
  }
}

/**
 * Synthesize Interaction Intelligence using backend Gemini / deterministic engine
 */
export async function fetchInteractionIntelligence(params: {
  mode: 'prep' | 'followup';
  contact?: InteractionContact;
  notes?: InteractionNote[];
  tasks?: Task[];
}): Promise<string> {
  try {
    const res = await fetch("/api/notes/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.synthesis) {
        return data.synthesis;
      }
    }
  } catch (err) {
    console.warn("Intelligence API fetch failed, falling back to local synthesis:", err);
  }

  // Local fallback
  const contactName = params.contact?.name || "Collaborator";
  if (params.mode === "prep") {
    return `### 📋 Pre-Interaction Dossier: ${contactName}
**Organization**: ${params.contact?.organization || "Partner"} | **Role**: ${params.contact?.title || "Partner"}

#### 1. Historical Notes (${(params.notes || []).length} on record)
${(params.notes || []).slice(0, 5).map((n) => `- **${n.timestamp ? n.timestamp.split("T")[0] : 'Recent'}**: ${n.body || n.rawText || n.title}`).join("\n") || "- No historical notes recorded yet."}

#### 2. Open Action Items & Tasks (${(params.tasks || []).length})
${(params.tasks || []).map((t) => `- [ ] **${t.title}** (${t.isLocked ? '🔒 Locked' : '🌊 Flexible'} - ${t.date || 'TBD'})`).join("\n") || "- All action items currently completed."}

#### 3. Strategic Recommendations
- Verify key milestones and confirm next deliverables.
- Review pending approvals before closing session.`;
  } else {
    return `### 🎯 Follow-up Tracker & Action Audit
- **Analyzed Notes**: ${(params.notes || []).length} items
- **Active Tasks**: ${(params.tasks || []).length} tasks

#### 1. Unconverted Action Items
${(params.notes || []).filter((n) => n.status === "needs_task" || n.status === "pending_followup").map((n) => `- **${n.title || n.body?.substring(0, 40)}**: Awaiting task conversion or scheduled reminder.`).join("\n") || "- No orphaned commitments found."}

#### 2. Schedule Risk Review
- ${(params.tasks || []).filter((t) => t.isFlexible && !t.completed).length} flexible tasks in floating backlog.
- ${(params.tasks || []).filter((t) => t.isLocked && !t.completed).length} locked tasks with hard deadlines.`;
  }
}
