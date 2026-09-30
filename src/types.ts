export interface Compensation {
  type: 'favor' | 'money';
  amount: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  time?: string;
  duration?: string;
  location?: string;
  category?: string;
  collaborator?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface Task {
  id: string;
  userId?: string;
  noteId?: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  isLocked: boolean;
  isOpenPlaceholder?: boolean;
  completed: boolean;
  location?: string;
  attendees?: string;
  travelBefore?: number;
  travelAfter?: number;
  order?: number;
  phone?: string;
  notes?: string;
  groupId?: string;
  isUnlinked?: boolean;
  originalDuration?: string;
  originalTravelBefore?: number;
  originalTravelAfter?: number;
  originalTime?: string;
  originalDate?: string;
  originalIsLocked?: boolean;
  travelBeforeCompleted?: boolean;
  travelAfterCompleted?: boolean;
  beforeBufferPurpose?: string;
  afterBufferPurpose?: string;
  travelBeforeLocation?: string;
  travelAfterLocation?: string;
  travelBeforeSameLocation?: boolean;
  travelAfterSameLocation?: boolean;
  transferId?: string;
  compensation?: Compensation;
  isTransferred?: boolean;
  computedTime?: string;
  isFlexible?: boolean;
  isOverflow?: boolean;
  isInProgress?: boolean;
  gcalEventId?: string;
  isAllDay?: boolean;
  repeatConfig?: string;
  isRecurring?: boolean;
  recurringParentId?: string;
  recurrenceExclusions?: string[];
  recurrenceUntil?: string;
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'special_day_of_month' | 'none';
  recurrenceWeeklyDays?: number[];
  recurrenceWeeklyInterval?: number;
  recurrenceSpecialOccurrence?: 'First' | 'Second' | 'Third' | 'Fourth';
  recurrenceSpecialWeekday?: number;
  sequenceLocked?: boolean;
  groupName?: string;
  reminderTime?: string;
  priority?: 'low' | 'medium' | 'high' | 'none';
  helpfulLinks?: string;
  hyperlink?: string;
  category?: string;
  collaborator?: string;
  subtasks?: Subtask[];
  accumulatedElapsedMs?: number;
  focusStartedAt?: number;
  priorLockedTime?: string;
  isBuffer?: boolean;
  parentTaskId?: string;
  bufferType?: 'before' | 'after';
  isVirtual?: boolean;
  relativeToId?: string;
  interactions?: Interaction[];
  lastModified?: number;
  gcalUpdated?: string;
}

export interface Interaction {
  id: string;
  type: string; // e.g., 'Email', 'Phone Call', 'Text Message' etc.
  direction: "sent" | "received";
  dateTime: string; // ISO or localized string
  description: string;
  notes: string;
}

export interface Routine {
  id: string;
  userId?: string;
  name: string;
  tasks: Array<{
    title: string;
    duration: string;
    travelBefore?: number;
    travelAfter?: number;
    location?: string;
    attendees?: string;
    repeatConfig?: string;
  }>;
}

export interface Transfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  taskData: Task;
  compensation: Compensation;
  senderNotes?: string;
  status: 'pending' | 'accepted' | 'declined' | 'info_needed' | 'review' | 'completed';
  createdAt: string;
  acceptedAt?: string;
  proof?: {
    notes?: string;
    photoUrl?: string;
    submittedAt: string;
  };
  response?: string;
  isUnread?: boolean;
}

export interface PlatformUser {
  uid: string;
  email?: string;
  name?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended' | 'inactive';
  joinDate?: string;
  favorPoints?: number;
  categories?: string[];
  collaborators?: string[];
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail?: string;
  action: string;
  details: string;
  targetId?: string;
  timestamp: string;
}

export interface Wallet {
  favorPoints: number;
}

export interface AppContact {
  id: string;
  userId?: string;
  resourceName?: string;
  etag?: string;
  name?: string;
  givenName: string;
  familyName: string;
  speedDialIndex?: number | null;
  avatarUrl?: string;
  title?: string;
  email?: string;
  phone?: string;
  organization?: string;
  address?: string;
  isLocation?: boolean;
}



export interface AppNote {
  id: string;
  userId?: string;
  title: string;
  rawText: string;
  body?: string;
  contactId?: string;
  locationId?: string;
  timestamp?: string;
  tags?: string[];
  status?: 'recent' | 'pending_followup' | 'needs_task' | 'archived';
  convertedTaskId?: string;
  followUpDate?: string;
  reminderTime?: string;
  reminderNotes?: string;
  reminderCompleted?: boolean;
  project?: string;
  collaborator?: string;
  location?: string;
  vendor?: string;
  time?: string;
  associatedTaskId?: string;
  associatedRoutineId?: string;
  createdAt: number;
  updatedAt?: number;
  source?: 'chatbot' | 'manual' | 'focus';
}
