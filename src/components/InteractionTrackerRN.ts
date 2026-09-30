/**
 * Interaction Tracker Mobile Architecture Code Exporter
 * Consolidated exportable source code for React Native Developer Hub
 */

export const interactionTrackerRNCode = `/**
 * Interaction Tracker — React Native Production Module
 * Complete Architecture: Speed Dial Quick-Log Bar, Ratchet Swiper (Gesture Handler + Reanimated),
 * Note-to-Task Conversion (Flexible vs Locked), and Interaction Intelligence Screen.
 *
 * Dependencies:
 *   npx expo install react-native-gesture-handler react-native-reanimated zustand
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Image,
  Dimensions,
  Platform,
  Clipboard,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { create } from 'zustand';

// ==========================================
// 1. DATA CONTRACTS & TYPES
// ==========================================

export interface Contact {
  id: string;
  name: string;
  speedDialIndex: number | null; // 0 through 5, or null if unassigned
  avatarUrl?: string;
  title: string;
  organization: string;
  phone?: string;
  email?: string;
}

export type LocationType = 'in-person' | 'phone' | 'virtual' | 'office';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  addressOrUri?: string;
}

export type NoteStatus = 'recent' | 'pending_followup' | 'needs_task' | 'archived';

export interface InteractionNote {
  id: string;
  contactId: string;
  locationId: string;
  timestamp: string; // ISO 8601
  body: string;
  tags: string[];
  status: NoteStatus;
  convertedTaskId?: string;
  followUpDate?: string;
}

export interface Task {
  id: string;
  noteId?: string; // Link to source InteractionNote
  title: string;
  dueDate: string;
  isLocked: boolean; // true = hard appointment calendar lock; false = flexible floating backlog
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export type GroupByOption = 'none' | 'contact' | 'location' | 'date';
export type SortOption = 'timestamp_desc' | 'timestamp_asc' | 'title' | 'urgency';

// ==========================================
// 2. LIGHTWEIGHT STATE STORE (ZUSTAND)
// ==========================================

export interface InteractionState {
  contacts: Contact[];
  locations: Location[];
  notes: InteractionNote[];
  tasks: Task[];
  activeSort: SortOption;
  activeGroupBy: GroupByOption;
  assignSpeedDial: (slotIndex: number, contactId: string | null) => void;
  createNote: (note: Omit<InteractionNote, 'id' | 'timestamp'>) => InteractionNote;
  updateNote: (id: string, updates: Partial<InteractionNote>) => void;
  deleteNote: (id: string) => void;
  changeNoteStatus: (noteId: string, status: NoteStatus) => void;
  convertNoteToTask: (
    noteId: string,
    params: { title: string; dueDate: string; isLocked: boolean; priority?: 'high' | 'medium' | 'low' }
  ) => Task;
  toggleTaskComplete: (taskId: string) => void;
  setSort: (sort: SortOption) => void;
  setGroupBy: (groupBy: GroupByOption) => void;
}

export const useInteractionStore = create<InteractionState>((set, get) => ({
  contacts: [
    {
      id: 'c-1',
      name: 'Elena Rostova',
      speedDialIndex: 0,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      title: 'Lead Architect',
      organization: 'Apex Engineering',
      phone: '+1 (555) 234-5678',
      email: 'elena@apex.io',
    },
    {
      id: 'c-2',
      name: 'Marcus Vance',
      speedDialIndex: 1,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      title: 'VP of Product',
      organization: 'HyperScale',
      phone: '+1 (555) 345-6789',
      email: 'marcus@hyperscale.com',
    },
    {
      id: 'c-3',
      name: 'Aisha Al-Mansoor',
      speedDialIndex: 2,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      title: 'Principal Designer',
      organization: 'Studio Forma',
      phone: '+1 (555) 456-7890',
      email: 'aisha@forma.design',
    },
    {
      id: 'c-4',
      name: 'David Chen',
      speedDialIndex: 3,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      title: 'Chief Medical Officer',
      organization: 'HealthSync Labs',
      phone: '+1 (555) 567-8901',
      email: 'dchen@healthsync.org',
    },
    {
      id: 'c-5',
      name: 'Devon Miller',
      speedDialIndex: 4,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      title: 'Founding Partner',
      organization: 'Venture Ridge',
      phone: '+1 (555) 678-9012',
      email: 'devon@ventureridge.vc',
    },
    {
      id: 'c-6',
      name: 'Maya Lin',
      speedDialIndex: 5,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      title: 'Infrastructure Strategist',
      organization: 'CloudBase',
      phone: '+1 (555) 789-0123',
      email: 'maya@cloudbase.io',
    },
  ],
  locations: [
    { id: 'loc-1', name: 'Virtual (Meet)', type: 'virtual' },
    { id: 'loc-2', name: 'HQ 4th Fl Room', type: 'office' },
    { id: 'loc-3', name: 'Phone Call', type: 'phone' },
    { id: 'loc-4', name: 'Blue Bottle', type: 'in-person' },
  ],
  notes: [
    {
      id: 'note-1',
      contactId: 'c-1',
      locationId: 'loc-2',
      timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      body: 'Reviewed microservice migration. Need performance benchmark before Thursday signoff.',
      tags: ['migration', 'latency'],
      status: 'recent',
    },
    {
      id: 'note-2',
      contactId: 'c-2',
      locationId: 'loc-1',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      body: 'Prioritizing offline-first sync. Follow up with release schedule by Monday.',
      tags: ['roadmap', 'sync'],
      status: 'pending_followup',
      followUpDate: '2026-10-05',
    },
    {
      id: 'note-3',
      contactId: 'c-3',
      locationId: 'loc-4',
      timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
      body: 'Finalized mobile micro-toolbar tokens and gesture thresholds.',
      tags: ['design-system'],
      status: 'needs_task',
    },
  ],
  tasks: [],
  activeSort: 'timestamp_desc',
  activeGroupBy: 'none',

  assignSpeedDial: (slotIndex, contactId) => {
    set((state) => ({
      contacts: state.contacts.map((c) => {
        if (c.speedDialIndex === slotIndex) return { ...c, speedDialIndex: null };
        if (c.id === contactId) return { ...c, speedDialIndex: slotIndex };
        return c;
      }),
    }));
  },

  createNote: (noteData) => {
    const newNote: InteractionNote = {
      ...noteData,
      id: \`note_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ notes: [newNote, ...state.notes] }));
    return newNote;
  },

  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
  },

  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      tasks: state.tasks.filter((t) => t.noteId !== id),
    }));
  },

  changeNoteStatus: (noteId, status) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, status } : n)),
    }));
  },

  convertNoteToTask: (noteId, params) => {
    const newTaskId = \`task_\${Date.now()}\`;
    const newTask: Task = {
      id: newTaskId,
      noteId,
      title: params.title,
      dueDate: params.dueDate,
      isLocked: params.isLocked,
      completed: false,
      priority: params.priority || 'medium',
    };
    set((state) => ({
      tasks: [newTask, ...state.tasks],
      notes: state.notes.map((n) =>
        n.id === noteId ? { ...n, convertedTaskId: newTaskId, status: 'needs_task' } : n
      ),
    }));
    return newTask;
  },

  toggleTaskComplete: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    }));
  },

  setSort: (activeSort) => set({ activeSort }),
  setGroupBy: (activeGroupBy) => set({ activeGroupBy }),
}));

// ==========================================
// 3. SPEED DIAL QUICK-LOG BAR
// ==========================================

export const SpeedDialQuickLogBar: React.FC<{ onNoteCreated?: (id: string) => void }> = ({
  onNoteCreated,
}) => {
  const contacts = useInteractionStore((s) => s.contacts);
  const locations = useInteractionStore((s) => s.locations);
  const assignSpeedDial = useInteractionStore((s) => s.assignSpeedDial);
  const createNote = useInteractionStore((s) => s.createNote);

  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [locationId, setLocationId] = useState<string>(locations[0]?.id || 'loc-1');
  const [body, setBody] = useState<string>('');
  const [showLocPicker, setShowLocPicker] = useState<boolean>(false);

  const slots = [0, 1, 2, 3, 4, 5];

  const handleSave = () => {
    if (!activeContact || !body.trim()) return;
    const note = createNote({
      contactId: activeContact.id,
      locationId,
      body: body.trim(),
      tags: ['quick-log'],
      status: 'recent',
    });
    setActiveContact(null);
    setBody('');
    if (onNoteCreated) onNoteCreated(note.id);
  };

  return (
    <View style={styles.dock}>
      <View style={styles.dockHeader}>
        <Text style={styles.dockTitle}>SPEED DIAL LOG</Text>
        <Text style={styles.dockSub}>Tap to log • Long-press to assign</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotsRow}>
        {slots.map((idx) => {
          const contact = contacts.find((c) => c.speedDialIndex === idx);
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.slot, !contact && { opacity: 0.6 }]}
              onPress={() => (contact ? setActiveContact(contact) : setPickerSlot(idx))}
              onLongPress={() => setPickerSlot(idx)}
              delayLongPress={350}
            >
              <View style={[styles.slotBadge, { backgroundColor: contact ? '#2563EB' : '#475569' }]}>
                <Text style={styles.badgeText}>{idx + 1}</Text>
              </View>
              <View style={styles.slotAvatar}>
                {contact?.avatarUrl ? (
                  <Image source={{ uri: contact.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {contact ? contact.name.slice(0, 2).toUpperCase() : '+'}
                  </Text>
                )}
              </View>
              <Text style={styles.slotName} numberOfLines={1}>
                {contact ? contact.name.split(' ')[0] : 'Assign'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Quick Assign Sheet */}
      <Modal visible={pickerSlot !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setPickerSlot(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetHeader}>Assign Slot #{pickerSlot !== null ? pickerSlot + 1 : ''}</Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {contacts.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.contactRow}
                  onPress={() => {
                    if (pickerSlot !== null) {
                      assignSpeedDial(pickerSlot, c.speedDialIndex === pickerSlot ? null : c.id);
                      setPickerSlot(null);
                    }
                  }}
                >
                  <Text style={styles.contactRowName}>{c.name}</Text>
                  <Text style={styles.contactRowStatus}>
                    {c.speedDialIndex === pickerSlot ? 'Remove' : 'Select'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Inline Quick Capture Sheet */}
      <Modal visible={activeContact !== null} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.captureSheet}>
            <View style={styles.captureHeader}>
              <View>
                <Text style={styles.capturePre}>QUICK INTERACTION</Text>
                <Text style={styles.captureName}>{activeContact?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.locationBadge}
                onPress={() => setShowLocPicker(!showLocPicker)}
              >
                <Text style={styles.locBadgeText}>📍 {locations.find((l) => l.id === locationId)?.name || 'Meeting'} ▾</Text>
              </TouchableOpacity>
            </View>

            {showLocPicker && (
              <View style={styles.locDropdown}>
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={styles.locOption}
                    onPress={() => {
                      setLocationId(loc.id);
                      setShowLocPicker(false);
                    }}
                  >
                    <Text style={styles.locOptionText}>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={styles.bodyInput}
              multiline
              numberOfLines={4}
              placeholder="What was discussed? Decisions, action items..."
              placeholderTextColor="#64748B"
              value={body}
              onChangeText={setBody}
              autoFocus
            />

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveContact(null)}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !body.trim() && { opacity: 0.5 }]}
                disabled={!body.trim()}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>Save Interaction</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ==========================================
// 4. NOTE-TO-TASK CONVERSION MODAL
// ==========================================

export const NoteToTaskModal: React.FC<{
  visible: boolean;
  note: InteractionNote | null;
  onClose: () => void;
}> = ({ visible, note, onClose }) => {
  const convertNoteToTask = useInteractionStore((s) => s.convertNoteToTask);
  const contacts = useInteractionStore((s) => s.contacts);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    if (note) {
      const firstLine = note.body.split(/[.\\n]/)[0].trim();
      const contact = contacts.find((c) => c.id === note.contactId);
      setTitle(firstLine || \`Follow up with \${contact?.name || 'contact'}\`);
      setDueDate('Tomorrow 10:00 AM');
    }
  }, [note, contacts]);

  if (!note) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetHeader}>Convert to Calendar / Backlog Task</Text>

          <Text style={styles.label}>ACTION TITLE</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />

          <Text style={styles.label}>CALENDAR ANCHOR MODE</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isLocked && styles.toggleBtnActive]}
              onPress={() => setIsLocked(false)}
            >
              <Text style={styles.toggleIcon}>🌊</Text>
              <Text style={styles.toggleTitle}>Flexible Task</Text>
              <Text style={styles.toggleSub}>Dynamic floating backlog task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, isLocked && styles.toggleBtnActiveLocked]}
              onPress={() => setIsLocked(true)}
            >
              <Text style={styles.toggleIcon}>🔒</Text>
              <Text style={styles.toggleTitle}>Locked Task</Text>
              <Text style={styles.toggleSub}>Strict immutable clock deadline</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>DUE DATE / TIME</Text>
          <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                convertNoteToTask(note.id, { title, dueDate, isLocked });
                onClose();
              }}
            >
              <Text style={styles.saveBtnText}>
                {isLocked ? 'Anchor Locked 🔒' : 'Schedule Flexible ⚡'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 5. RATCHET NOTES SWIPER
// ==========================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = [
  { key: 'recent', label: 'Recent', icon: '⚡' },
  { key: 'pending_followup', label: 'Follow-up', icon: '⏳' },
  { key: 'needs_task', label: 'Needs Task', icon: '📌' },
  { key: 'archived', label: 'Archived', icon: '📦' },
] as const;

export const RatchetNotesSwiper: React.FC = () => {
  const notes = useInteractionStore((s) => s.notes);
  const contacts = useInteractionStore((s) => s.contacts);
  const locations = useInteractionStore((s) => s.locations);
  const activeSort = useInteractionStore((s) => s.activeSort);
  const setSort = useInteractionStore((s) => s.setSort);
  const deleteNote = useInteractionStore((s) => s.deleteNote);

  const [colIdx, setColIdx] = useState<number>(0);
  const [selectedNote, setSelectedNote] = useState<InteractionNote | null>(null);

  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = -colIdx * SCREEN_WIDTH + e.translationX;
    })
    .onEnd((e) => {
      let next = colIdx;
      if (e.translationX < -60 && colIdx < COLUMNS.length - 1) next += 1;
      else if (e.translationX > 60 && colIdx > 0) next -= 1;

      translateX.value = withSpring(-next * SCREEN_WIDTH, { damping: 20, stiffness: 180 });
      runOnJS(setColIdx)(next);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1120' }}>
      {/* Tab Row */}
      <View style={styles.tabRow}>
        {COLUMNS.map((col, idx) => (
          <TouchableOpacity
            key={col.key}
            style={[styles.tab, colIdx === idx && styles.tabActive]}
            onPress={() => {
              setColIdx(idx);
              translateX.value = withSpring(-idx * SCREEN_WIDTH);
            }}
          >
            <Text style={[styles.tabText, colIdx === idx && styles.tabTextActive]}>
              {col.icon} {col.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fluid Swipable Ratchet Body */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flexDirection: 'row', width: SCREEN_WIDTH * 4 }, animatedStyle]}>
          {COLUMNS.map((col) => {
            const list = notes.filter((n) => n.status === col.key);
            return (
              <View key={col.key} style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 10, gap: 8 }}>
                  {list.map((note) => {
                    const contact = contacts.find((c) => c.id === note.contactId);
                    const loc = locations.find((l) => l.id === note.locationId);
                    return (
                      <View key={note.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardContact}>{contact?.name || 'Contact'}</Text>
                          <Text style={styles.cardLoc}>📍 {loc?.name.split(' ')[0]}</Text>
                        </View>
                        <Text style={styles.cardBody}>{note.body}</Text>
                        <View style={styles.cardFooter}>
                          <TouchableOpacity
                            style={styles.convertChip}
                            onPress={() => setSelectedNote(note)}
                          >
                            <Text style={styles.convertChipText}>
                              {note.convertedTaskId ? '✓ Task Linked' : '⚡ To Task'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteNote(note.id)}>
                            <Text style={{ color: '#EF4444', fontSize: 12 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </Animated.View>
      </GestureDetector>

      <NoteToTaskModal
        visible={selectedNote !== null}
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </View>
  );
};

// ==========================================
// 6. INTERACTION REPORTING & INTELLIGENCE
// ==========================================

export const InteractionIntelligenceScreen: React.FC = () => {
  const contacts = useInteractionStore((s) => s.contacts);
  const notes = useInteractionStore((s) => s.notes);
  const tasks = useInteractionStore((s) => s.tasks);
  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || '');
  const [copied, setCopied] = useState<boolean>(false);

  const contact = contacts.find((c) => c.id === selectedContactId) || contacts[0];
  const contactNotes = notes.filter((n) => n.contactId === contact?.id);
  const contactTasks = tasks.filter((t) => contactNotes.some((n) => n.id === t.noteId));

  const copyDigest = () => {
    const lines = [
      \`# DOSSIER: \${contact?.name.toUpperCase()}\`,
      \`Role: \${contact?.title} @ \${contact?.organization}\`,
      '',
      '## Prior Interactions:',
      ...contactNotes.map((n, i) => \`\${i + 1}. [\${new Date(n.timestamp).toLocaleDateString()}] \${n.body}\`),
      '',
      '## Tasks:',
      ...contactTasks.map((t) => \`- [\${t.isLocked ? 'Locked' : 'Flexible'}] \${t.title} (Due: \${t.dueDate})\`),
    ];
    Clipboard.setString(lines.join('\\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0B1120', padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>Pre-Meeting Dossier</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={copyDigest}>
          <Text style={styles.saveBtnText}>{copied ? '✓ Copied' : '📋 Copy Digest'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {contacts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, c.id === contact?.id && { backgroundColor: '#2563EB' }]}
            onPress={() => setSelectedContactId(c.id)}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {contact && (
        <View style={styles.card}>
          <Text style={{ color: '#F8FAFC', fontSize: 14, fontWeight: '700' }}>{contact.name}</Text>
          <Text style={{ color: '#38BDF8', fontSize: 11 }}>{contact.title} • {contact.organization}</Text>
        </View>
      )}

      <Text style={[styles.label, { marginTop: 12 }]}>HISTORY ({contactNotes.length})</Text>
      {contactNotes.map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={{ color: '#94A3B8', fontSize: 9 }}>{new Date(n.timestamp).toLocaleString()}</Text>
          <Text style={{ color: '#E2E8F0', fontSize: 12, marginTop: 4 }}>{n.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

// ==========================================
// 7. STYLESHEET
// ==========================================

const styles = StyleSheet.create({
  dock: { backgroundColor: '#0F172A', padding: 10, borderBottomWidth: 1, borderColor: '#1E293B' },
  dockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dockTitle: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  dockSub: { fontSize: 9, color: '#475569' },
  slotsRow: { flexDirection: 'row', gap: 10 },
  slot: { alignItems: 'center', width: 50 },
  slotBadge: { position: 'absolute', top: -2, right: 2, zIndex: 1, width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  slotAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  slotName: { color: '#CBD5E1', fontSize: 10, marginTop: 4, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderTopWidth: 1, borderColor: '#334155' },
  sheetHeader: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#334155' },
  contactRowName: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  contactRowStatus: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  captureSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  captureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  capturePre: { color: '#38BDF8', fontSize: 9, fontWeight: '800' },
  captureName: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  locationBadge: { backgroundColor: '#0F172A', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  locBadgeText: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  locDropdown: { backgroundColor: '#0F172A', borderRadius: 8, padding: 6, marginBottom: 8 },
  locOption: { paddingVertical: 6, paddingHorizontal: 8 },
  locOptionText: { color: '#F8FAFC', fontSize: 12 },
  bodyInput: { backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#F8FAFC', padding: 10, fontSize: 13, minHeight: 80, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#334155' },
  cancelBtnText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#2563EB' },
  saveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  label: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#0F172A', borderRadius: 8, borderWidth: 1, borderColor: '#334155', color: '#F8FAFC', padding: 8, fontSize: 13 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1.5, borderColor: '#334155', padding: 8 },
  toggleBtnActive: { borderColor: '#0284C7', backgroundColor: '#0C4A6E40' },
  toggleBtnActiveLocked: { borderColor: '#10B981', backgroundColor: '#064E3B40' },
  toggleIcon: { fontSize: 14, marginBottom: 2 },
  toggleTitle: { color: '#F8FAFC', fontSize: 11, fontWeight: '700' },
  toggleSub: { color: '#64748B', fontSize: 9 },
  tabRow: { flexDirection: 'row', backgroundColor: '#0F172A', borderBottomWidth: 1, borderColor: '#1E293B' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: '#2563EB' },
  tabText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#F8FAFC' },
  card: { backgroundColor: '#1E293B', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardContact: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  cardLoc: { color: '#38BDF8', fontSize: 10 },
  cardBody: { color: '#E2E8F0', fontSize: 11, lineHeight: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: '#334155' },
  convertChip: { backgroundColor: '#2563EB', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6 },
  convertChipText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  chip: { backgroundColor: '#1E293B', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginRight: 6, borderWidth: 1, borderColor: '#334155' },
});
`;
