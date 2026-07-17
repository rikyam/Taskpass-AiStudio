export const reactNativeCode = `/**
 * @license
 * TaskPass Unified React Native Mobile Application Codebase
 * Optimized for iOS and Android using Expo & Reanimated v3
 * Features: Complete dynamic responsive layouts for phone landscape/portrait and tablets.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Vibration,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { 
  GestureHandlerRootView, 
  Gesture, 
  GestureDetector, 
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

// Icon Set - Replaced with Lucide icons (install lucide-react-native)
import {
  Sparkles, Calendar, Clock, Users, Trash2, Edit3, Plus, X, Check,
  ChevronLeft, ChevronRight, Layout, Zap, RotateCcw, Coffee, Car,
  Save, Maximize2, Settings, MapPin, Search, Phone, Send, ShoppingBag
} from 'lucide-react-native';

const TIMELINE_INCREMENT = 15;

// Sizing Helpers according to layout profiles
function getLayoutConfig(width: number, height: number) {
  const isTablet = width >= 768;
  const isLandscape = width > height;
  const isWide = isTablet || (isLandscape && width > 550);
  
  // Dynamic Hour Block Height
  const hourHeight = isTablet ? 120 : isLandscape ? 100 : 160;
  
  // Font Size Scalers
  const scaleFont = (base: number) => {
    if (isTablet) return Math.round(base * 1.2);
    if (isLandscape) return Math.round(base * 0.9);
    return base;
  };

  return { isTablet, isLandscape, isWide, hourHeight, scaleFont };
}

// ============================================
// REANIMATED GESTURE-CONTROLLED MOBILE CARD
// ============================================

interface TaskCardProps {
  task: any;
  onDrop: (timeStr: string) => void;
  onEdit: (task: any) => void;
  onComplete: () => void;
  hapticEnabled?: boolean;
}

export function PanDragTaskCard({ task, onDrop, onEdit, onComplete, hapticEnabled }: TaskCardProps) {
  const { width, height } = useWindowDimensions();
  const { hourHeight } = getLayoutConfig(width, height);
  const isLocked = task.isLocked;
  
  const translationY = useSharedValue(0);
  const translationX = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleJSCallback = (offsetY: number) => {
    // Convert Y offset to timeline minutes and snap to TIMELINE_INCREMENT
    const deltaMins = Math.round((offsetY / hourHeight) * 60);
    const initialMins = parseTimeToMinutes(task.computedTime || task.time);
    let finalMins = initialMins + deltaMins;
    finalMins = Math.max(0, Math.min(1440, Math.round(finalMins / TIMELINE_INCREMENT) * TIMELINE_INCREMENT));
    
    if (Platform.OS !== 'web' && hapticEnabled !== false) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(40);
      } else {
        Vibration.vibrate([0, 30]);
      }
    }
    onDrop(minutesToTimeString(finalMins));
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.04);
    })
    .onUpdate((event) => {
      if (isLocked) {
        translationY.value = event.translationY;
      } else {
        translationX.value = event.translationX;
        translationY.value = event.translationY;
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      if (isLocked) {
        runOnJS(handleJSCallback)(translationY.value);
        translationY.value = withSpring(0);
      } else {
        translationX.value = withSpring(0);
        translationY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
    zIndex: scale.value > 1 ? 999 : 1,
  }));

  const cardBackground = task.completed 
    ? '#1e293b' 
    : task.isLocked 
      ? '#2d1a22' 
      : '#0f172a';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, { backgroundColor: cardBackground }, animatedStyle]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity onPress={onComplete} style={styles.checkBox}>
            {task.completed && <Check size={14} color="#10b981" strokeWidth={3} />}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.taskTitle, task.completed && styles.completedText]} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.taskTime}>
              {formatTime(task.computedTime || task.time)} - {task.duration}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(task)} style={styles.editBtn}>
            <Edit3 size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {task.location && (
          <View style={styles.metaRow}>
            <MapPin size={12} color="#f43f5e" />
            <Text style={styles.metaText} numberOfLines={1}>{task.location}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================
// MAIN UNIFIED TASKPASS APP ENTRY
// ============================================

export default function App() {
  const { width, height } = useWindowDimensions();
  const { isTablet, isLandscape, isWide, hourHeight, scaleFont } = getLayoutConfig(width, height);

  const [tasks, setTasks] = useState([
    {
      id: 'task_1',
      title: 'Review Q3 Engineering Backlog',
      date: getLocalDateString(),
      time: '09:00',
      duration: '45 min',
      isLocked: true,
      completed: false,
      location: 'Conference Room Alpha',
    },
    {
      id: 'task_2',
      title: 'Design Team Creative Sync',
      date: getLocalDateString(),
      time: '11:00',
      duration: '60 min',
      isLocked: false,
      completed: false,
      location: 'Design studio',
    },
    {
      id: 'task_3',
      title: 'Product Strategy Review',
      date: getLocalDateString(),
      time: '14:00',
      duration: '90 min',
      isLocked: true,
      completed: false,
      location: 'HQ Executive Room',
    },
    {
      id: 'task_4',
      title: 'Prepare Deploy Notes',
      date: getLocalDateString(),
      time: '16:00',
      duration: '30 min',
      isLocked: false,
      completed: true,
      location: 'Remote Workstation',
    }
  ]);

  const [viewMode, setViewMode] = useState<'deck' | 'timeline' | 'focus'>('deck');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTaskDrop = (taskId: string, newTime: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, time: newTime };
      }
      return t;
    }));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesDate = t.date === selectedDate;
      if (!matchesDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.location && t.location.toLowerCase().includes(q))
      );
    });
  }, [tasks, selectedDate, searchQuery]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        
        {/* Header Block with responsive scale */}
        <View style={[styles.header, isTablet && { paddingHorizontal: 32, paddingVertical: 18 }]}>
          <Text style={[styles.logo, { fontSize: scaleFont(20) }]}>TaskPass</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isTablet ? 16 : 10 }}>
            {/* Real-time Search Box integrated into Header on larger screens */}
            {isWide && (
              <View style={styles.headerSearchContainer}>
                <Search size={14} color="#64748b" />
                <TextInput
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#475569"
                  style={styles.headerSearchInput}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={12} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.dateSelector}>
              <Text style={[styles.dateText, { fontSize: scaleFont(11) }]}>{selectedDate}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsHeaderBtn}>
              <Settings size={scaleFont(18)} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Small/Portrait screen Search Input */}
        {!isWide && (
          <View style={styles.mobileSearchWrapper}>
            <Search size={14} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search tasks by title..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#475569"
              style={styles.mobileSearchInput}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* View Selection Bar - Becomes action hubs on wide screens */}
        {!isWide && (
          <View style={styles.tabBar}>
            {(['deck', 'timeline', 'focus'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, viewMode === tab && styles.activeTab]}
                onPress={() => setViewMode(tab)}
              >
                <Text style={[styles.tabLabel, viewMode === tab && styles.activeTabLabel, { fontSize: scaleFont(10) }]}>
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Dynamic Display Area using Adaptive Grid Layouts */}
        <View style={styles.content}>
          {isWide ? (
            /* Multi-Column Desktop/Tablet split view */
            <View style={styles.wideGrid}>
              <View style={styles.leftPane}>
                <View style={styles.paneHeader}>
                  <Text style={styles.paneTitle}>Task Index</Text>
                </View>
                <FlatDeckView 
                  tasks={filteredTasks} 
                  onEdit={() => {}} 
                  onComplete={(id: string) => setTasks(prev => prev.map(t => t.id === id ? {...t, completed: !t.completed} : t))} 
                  hapticEnabled={hapticEnabled}
                />
              </View>
              <View style={styles.rightPane}>
                <View style={styles.paneHeader}>
                  <Text style={styles.paneTitle}>Scheduler Timeline</Text>
                </View>
                <TimelineScrollView 
                  tasks={filteredTasks} 
                  onDrop={handleTaskDrop}
                  onEdit={() => {}}
                  hapticEnabled={hapticEnabled}
                  hourHeight={hourHeight}
                />
              </View>
            </View>
          ) : (
            /* Traditional Single Viewport layout (Phone Portrait) */
            viewMode === 'deck' ? (
              <FlatDeckView 
                tasks={filteredTasks} 
                onEdit={() => {}} 
                onComplete={(id: string) => setTasks(prev => prev.map(t => t.id === id ? {...t, completed: !t.completed} : t))} 
                hapticEnabled={hapticEnabled}
              />
            ) : viewMode === 'timeline' ? (
              <TimelineScrollView 
                tasks={filteredTasks} 
                onDrop={handleTaskDrop}
                onEdit={() => {}}
                hapticEnabled={hapticEnabled}
                hourHeight={hourHeight}
              />
            ) : (
              <InteractiveFocusScroll tasks={filteredTasks} />
            )
          )}
        </View>

        {/* Settings Modal - Responsive Overlay Container */}
        <Modal
          visible={showSettings}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.settingsModalContent, isTablet && { maxWidth: 440, padding: 28 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(16) }]}>System Configuration</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { fontSize: scaleFont(14) }]}>Tactile Haptics</Text>
                  <Text style={styles.settingDesc}>Emit vibration feedback upon cross-snaps crossings on grid</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    const nextVal = !hapticEnabled;
                    setHapticEnabled(nextVal);
                    if (nextVal && Platform.OS !== 'web') {
                      Vibration.vibrate(40);
                    }
                  }}
                  style={[styles.toggleBtn, hapticEnabled ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                >
                  <Text style={[styles.toggleBtnText, hapticEnabled ? styles.toggleBtnTextActive : styles.toggleBtnTextInactive]}>
                    {hapticEnabled ? "ACTIVE" : "DISABLED"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSettings(false)}>
                <Text style={[styles.closeModalBtnText, { fontSize: scaleFont(12) }]}>Apply Config</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Floating Action Trigger Button */}
        <TouchableOpacity style={styles.fab}>
          <Plus size={isWide ? 28 : 24} color="#ffffff" strokeWidth={3} />
        </TouchableOpacity>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ============================================
// SECONDARY FLAT VIEW COMPONENTS
// ============================================

function FlatDeckView({ tasks, onEdit, onComplete, hapticEnabled }: any) {
  return (
    <ScrollView style={styles.scroller} contentContainerStyle={styles.scrollPadding}>
      {tasks.length === 0 ? (
        <Text style={styles.emptyPrompt}>No matching checklist items.</Text>
      ) : (
        tasks.map((task: any) => (
          <PanDragTaskCard
            key={task.id}
            task={task}
            onDrop={() => {}}
            onEdit={onEdit}
            onComplete={() => onComplete(task.id)}
            hapticEnabled={hapticEnabled}
          />
        ))
      )}
    </ScrollView>
  );
}

function TimelineScrollView({ tasks, onDrop, onEdit, hapticEnabled, hourHeight }: any) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <ScrollView style={styles.scroller} contentContainerStyle={{ height: 24 * hourHeight + 30 }}>
      {hours.map(hour => (
        <View key={hour} style={[styles.hourBlock, { height: hourHeight }]}>
          <Text style={styles.hourLabel}>
            {hour === 0 ? '12 AM' : hour <= 12 ? \`\${hour} AM\` : \`\${hour - 12} PM\`}
          </Text>
          <View style={styles.hourLine} />
        </View>
      ))}

      {/* Floating Task Cards positioned absolutely by computed start times */}
      {tasks.map((task: any) => {
        const startMins = parseTimeToMinutes(task.time);
        const durationMins = 45; // Simulated duration
        const cardTop = (startMins / 60) * hourHeight;
        const cardHeight = (durationMins / 60) * hourHeight;

        return (
          <View 
            key={task.id} 
            style={[styles.timelineCardContainer, { top: cardTop, height: Math.max(cardHeight, 60) }]}
          >
            <PanDragTaskCard
              task={task}
              onDrop={(newTime) => onDrop(task.id, newTime)}
              onEdit={onEdit}
              onComplete={() => {}}
              hapticEnabled={hapticEnabled}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

function InteractiveFocusScroll({ tasks }: any) {
  return (
    <View style={styles.focusContainer}>
       <Text style={styles.focusLabel}>ACTIVE FOCUS FOCUS MODE</Text>
       <Text style={styles.focusSub}>Swipe and complete dynamic items sequentially.</Text>
    </View>
  );
}

// ============================================
// COMMON UTILS
// ============================================

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeString(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
}

function writeTimeString(h: number, m: number): string {
  return \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
}

function getLocalDateString(): string {
  const d = new Date();
  return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
}

function formatTime(timeVal: string): string {
  if (!timeVal) return '';
  const [h, m] = timeVal.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHr = h % 12 || 12;
  return \`\${displayHr}:\${String(m).padStart(2, '0')} \${ampm}\`;
}

// ============================================
// CLEAN MOBILE STYLE SHEET WITH FLEX RESPONDERS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logo: {
    fontWeight: '900',
    color: '#818cf8',
    letterSpacing: -1,
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b/40',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    width: 200,
  },
  headerSearchInput: {
    color: '#ffffff',
    fontSize: 12,
    flex: 1,
    marginLeft: 6,
    padding: 0,
  },
  mobileSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  mobileSearchInput: {
    color: '#ffffff',
    fontSize: 13,
    flex: 1,
    padding: 0,
  },
  dateSelector: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateText: {
    color: '#94a3b8',
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  activeTab: {
    backgroundColor: '#4f46e5',
  },
  tabLabel: {
    color: '#64748b',
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeTabLabel: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scroller: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.35,
  },
  taskTime: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: '600',
    marginTop: 2,
  },
  editBtn: {
    padding: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  hourBlock: {
    paddingLeft: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
  },
  hourLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
    width: 50,
  },
  hourLine: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    opacity: 0.25,
    marginTop: 14,
  },
  timelineCardContainer: {
    position: 'absolute',
    left: 76,
    right: 16,
    justifyContent: 'center',
  },
  emptyPrompt: {
    color: '#475569',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    paddingVertical: 80,
    letterSpacing: 2,
  },
  focusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  focusLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#818cf8',
    letterSpacing: 2,
  },
  focusSub: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  settingsHeaderBtn: {
    padding: 6,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsModalContent: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 15,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 14,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  toggleBtnInactive: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: '#f43f5e',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  toggleBtnTextActive: {
    color: '#10b981',
  },
  toggleBtnTextInactive: {
    color: '#f43f5e',
  },
  closeModalBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  
  // Wide layouts flex containers
  wideGrid: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#090d16',
  },
  leftPane: {
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    backgroundColor: '#0c1322',
  },
  rightPane: {
    flex: 2,
    backgroundColor: '#090d16',
  },
  paneHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a/60',
  },
  paneTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
`;
