export const reactNativeCode = `/**
 * @license
 * TaskPass Unified React Native Mobile Application Codebase
 * Optimized for iOS and Android using Expo, React Native Reanimated & Gesture Handler
 * Architecture: Clean 4-Tab Navigation Shell + Central Elevated FAB + Unified Design Tokens
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

// Lucide Icons for React Native
import {
  CheckSquare,
  Calendar,
  Clock,
  Zap,
  Settings,
  Plus,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Car,
  MapPin,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

// ============================================
// DESIGN TOKENS & THEME CONSTANTS
// ============================================
export const THEME = {
  bgDark: '#0D0E15',
  cardBg: '#161824',
  cardBorder: '#25283A',
  cardElevated: '#1D2032',
  primaryAccent: '#6C5CE7',
  primaryAccentLight: '#8172F0',
  primaryAccentMuted: 'rgba(108, 92, 231, 0.15)',
  successAccent: '#00B894',
  successAccentMuted: 'rgba(0, 184, 148, 0.15)',
  warningAccent: '#FDCB6E',
  warningAccentMuted: 'rgba(253, 203, 110, 0.15)',
  dangerAccent: '#FF7675',
  dangerAccentMuted: 'rgba(255, 118, 117, 0.15)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A5B5',
  textMuted: '#5F6474',
  radiusCard: 16,
  radiusPill: 24,
  paddingStandard: 16,
  timelineIncrement: 15,
};

// Layout Helper
function getLayoutConfig(width: number, height: number) {
  const isTablet = width >= 768;
  const isLandscape = width > height;
  const hourHeight = isTablet ? 110 : isLandscape ? 90 : 130;
  const scaleFont = (base: number) => {
    if (isTablet) return Math.round(base * 1.15);
    if (isLandscape) return Math.round(base * 0.9);
    return base;
  };
  return { isTablet, isLandscape, hourHeight, scaleFont };
}

// Category Colors Map
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Work: { bg: 'rgba(108, 92, 231, 0.14)', text: '#A29BFE', border: 'rgba(108, 92, 231, 0.3)' },
  DeepWork: { bg: 'rgba(9, 132, 227, 0.14)', text: '#74B9FF', border: 'rgba(9, 132, 227, 0.3)' },
  Health: { bg: 'rgba(0, 184, 148, 0.14)', text: '#55EFC4', border: 'rgba(0, 184, 148, 0.3)' },
  Meeting: { bg: 'rgba(253, 203, 110, 0.14)', text: '#FFEAA7', border: 'rgba(253, 203, 110, 0.3)' },
  Personal: { bg: 'rgba(232, 67, 147, 0.14)', text: '#FD79A8', border: 'rgba(232, 67, 147, 0.3)' },
};

export interface TaskItem {
  id: string;
  title: string;
  category?: string;
  date: string;
  time: string;
  duration: string;
  completed: boolean;
  isLocked?: boolean;
  location?: string;
  notes?: string;
  focusNotes?: string;
  scienceNote?: string;
  adaptation?: string;
  travelBefore?: number;
  travelAfter?: number;
  subtasks?: Array<{ id: string; title: string; completed?: boolean; scienceNote?: string }>;
}

// ============================================
// STANDARDIZED UNIFIED TASK CARD COMPONENT
// ============================================
interface StandardTaskCardProps {
  task: TaskItem;
  onToggleComplete: (id: string) => void;
  onPressCard: (task: TaskItem) => void;
  onOpenMenu: (task: TaskItem) => void;
  onStartFocus?: (task: TaskItem) => void;
  onDropTimeline?: (newTime: string) => void;
  isTimelineView?: boolean;
  hapticEnabled?: boolean;
}

export function StandardTaskCard({
  task,
  onToggleComplete,
  onPressCard,
  onOpenMenu,
  onDropTimeline,
  isTimelineView = false,
  hapticEnabled = true,
}: StandardTaskCardProps) {
  const { width, height } = useWindowDimensions();
  const { hourHeight } = getLayoutConfig(width, height);

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const scale = useSharedValue(1);
  const [dragPreviewTime, setDragPreviewTime] = useState<string | null>(null);

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS !== 'web' && hapticEnabled) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(type === 'heavy' ? 40 : 25);
      } else {
        Vibration.vibrate(type === 'heavy' ? [0, 40] : [0, 20]);
      }
    }
  };

  const updateDragPreview = (offsetY: number) => {
    const deltaMins = Math.round((offsetY / hourHeight) * 60);
    const initialMins = parseTimeToMinutes(task.time);
    let finalMins = initialMins + deltaMins;
    finalMins = Math.max(0, Math.min(1440, Math.round(finalMins / THEME.timelineIncrement) * THEME.timelineIncrement));
    setDragPreviewTime(formatTime(minutesToTimeString(finalMins)));
  };

  const handleDragEnd = (offsetY: number) => {
    const deltaMins = Math.round((offsetY / hourHeight) * 60);
    const initialMins = parseTimeToMinutes(task.time);
    let finalMins = initialMins + deltaMins;
    finalMins = Math.max(0, Math.min(1440, Math.round(finalMins / THEME.timelineIncrement) * THEME.timelineIncrement));
    triggerHaptic('medium');
    if (onDropTimeline) {
      onDropTimeline(minutesToTimeString(finalMins));
    }
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(isTimelineView ? 300 : 500)
    .onStart(() => {
      scale.value = withSpring(1.03, { damping: 14, stiffness: 240 });
      runOnJS(triggerHaptic)('light');
    })
    .onUpdate((event) => {
      if (isTimelineView) {
        translationY.value = event.translationY;
        runOnJS(updateDragPreview)(event.translationY);
      } else {
        translationX.value = Math.max(-80, Math.min(80, event.translationX));
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 14, stiffness: 240 });
      if (isTimelineView) {
        runOnJS(handleDragEnd)(translationY.value);
        runOnJS(setDragPreviewTime)(null);
        translationY.value = withSpring(0, { damping: 14 });
      } else {
        if (translationX.value > 50) {
          runOnJS(onToggleComplete)(task.id);
          runOnJS(triggerHaptic)('heavy');
        }
        translationX.value = withSpring(0, { damping: 14 });
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

  const catStyle = CATEGORY_COLORS[task.category || 'Work'] || CATEGORY_COLORS.Work;
  const formattedStartTime = formatTime(task.time);
  const durationMins = parseDurationToMinutes(task.duration);
  const endTimeStr = formatTime(minutesToTimeString(parseTimeToMinutes(task.time) + durationMins));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.taskCard,
          task.completed && styles.taskCardCompleted,
          dragPreviewTime ? styles.taskCardDragging : null,
          animatedStyle,
        ]}
      >
        {dragPreviewTime && (
          <View style={styles.dragPreviewBadge}>
            <Clock size={11} color="#FFFFFF" />
            <Text style={styles.dragPreviewBadgeText}>Drop at {dragPreviewTime}</Text>
          </View>
        )}

        <View style={styles.taskCardMainRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic('light');
              onToggleComplete(task.id);
            }}
            style={[
              styles.checkboxContainer,
              task.completed && styles.checkboxCompleted,
            ]}
          >
            {task.completed && <Check size={13} color="#FFFFFF" strokeWidth={3.5} />}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPressCard(task)}
            style={styles.taskCardContent}
          >
            <Text
              style={[
                styles.taskTitle,
                task.completed && styles.taskTitleCompleted,
              ]}
              numberOfLines={isTimelineView ? 1 : 2}
            >
              {task.title}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.timePill}>
                <Clock size={11} color={THEME.primaryAccentLight} />
                <Text style={styles.timePillText}>
                  {formattedStartTime} – {endTimeStr} ({task.duration})
                </Text>
              </View>

              <View style={[styles.categoryTag, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
                <Text style={[styles.categoryTagText, { color: catStyle.text }]}>
                  {task.category || 'General'}
                </Text>
              </View>

              {(task.travelBefore || 0) > 0 && (
                <View style={styles.bufferBadge}>
                  <Car size={10} color="#00B894" />
                  <Text style={styles.bufferBadgeText}>{task.travelBefore}m Pre</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => {
              triggerHaptic('light');
              onOpenMenu(task);
            }}
            style={styles.overflowMenuBtn}
          >
            <MoreVertical size={18} color={THEME.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================
// MAIN 4-TAB APPLICATION SHELL
// ============================================
export default function App() {
  const { width, height } = useWindowDimensions();
  const { isTablet, hourHeight, scaleFont } = getLayoutConfig(width, height);

  const [activeTab, setActiveTab] = useState<'tasks' | 'timeline' | 'focus' | 'settings'>('tasks');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [taskFilterSegment, setTaskFilterSegment] = useState<'active' | 'backlog' | 'done'>('active');
  const [timelineZoom, setTimelineZoom] = useState<'normal' | 'compact' | 'magnified'>('normal');

  const [selectedTaskForMenu, setSelectedTaskForMenu] = useState<TaskItem | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAIPlanCreatorOpen, setIsAIPlanCreatorOpen] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  const [focusActiveTaskId, setFocusActiveTaskId] = useState<string | null>('task_1');
  const [focusRemainingSeconds, setFocusRemainingSeconds] = useState(25 * 60);
  const [isFocusTimerRunning, setIsFocusTimerRunning] = useState(false);
  const [isNotesAccordionOpen, setIsNotesAccordionOpen] = useState(true);

  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 'task_1',
      title: 'Review Q3 Engineering Backlog & Roadmaps',
      category: 'DeepWork',
      date: getLocalDateString(),
      time: '09:00',
      duration: '45m',
      completed: false,
      isLocked: true,
      location: 'Conference Room Alpha',
      notes: 'Finalize sprint prioritization and unblock infra dependencies.',
      focusNotes: 'Zero-distraction sprint. Turn on Do Not Disturb; review top 5 critical PRs.',
      scienceNote: 'Leverages morning Cortisol Awakening Response (CAR) for high-density analytical reasoning.',
      adaptation: 'Ultradian Deep Work Peak',
      travelBefore: 10,
      subtasks: [
        { id: 'st_1', title: 'Audit core latency blockers', completed: true },
        { id: 'st_2', title: 'Approve API schema revisions', completed: false },
      ]
    },
    {
      id: 'task_2',
      title: 'Design System & Mobile Tokens Sync',
      category: 'Work',
      date: getLocalDateString(),
      time: '11:00',
      duration: '60m',
      completed: false,
      isLocked: false,
      location: 'Design Studio',
      notes: 'Harmonize padding tokens and card radius across platforms.',
      focusNotes: 'Inspect contrast ratios on 16px cards and 24px pills.',
      scienceNote: 'High visual acuity block during mid-morning dopamine plateau.',
      adaptation: 'Visual Refinement',
      travelBefore: 15,
    },
    {
      id: 'task_3',
      title: 'Cardio & Zone 2 Recovery Session',
      category: 'Health',
      date: getLocalDateString(),
      time: '14:30',
      duration: '45m',
      completed: false,
      location: 'Fitness Center',
      notes: 'Maintain heart rate between 130-140 bpm.',
      focusNotes: 'Steady aerobic endurance; boost BDNF synthesis and mitochondrial biogenesis.',
      scienceNote: 'Aerobic exercise releases BDNF, enhancing synaptic plasticity for afternoon coding.',
      adaptation: 'Mitochondrial Density',
      travelBefore: 10,
      travelAfter: 15,
    },
    {
      id: 'task_4',
      title: 'Production Deploy Checklist & Release Notes',
      category: 'DeepWork',
      date: getLocalDateString(),
      time: '16:30',
      duration: '30m',
      completed: true,
      location: 'Remote Workstation',
      notes: 'Verify canary health metrics before signing off.',
    },
    {
      id: 'task_5',
      title: 'Async Client Architecture Check-in',
      category: 'Meeting',
      date: getLocalDateString(),
      time: '17:30',
      duration: '30m',
      completed: false,
      notes: 'Prepare slide deck overview of system performance improvements.',
    }
  ]);

  useEffect(() => {
    let interval: any = null;
    if (isFocusTimerRunning && focusRemainingSeconds > 0) {
      interval = setInterval(() => {
        setFocusRemainingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (focusRemainingSeconds === 0 && isFocusTimerRunning) {
      setIsFocusTimerRunning(false);
      if (Platform.OS !== 'web' && hapticEnabled) {
        Vibration.vibrate([0, 100, 50, 100]);
      }
    }
    return () => clearInterval(interval);
  }, [isFocusTimerRunning, focusRemainingSeconds, hapticEnabled]);

  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(yyyy + '-' + mm + '-' + dd);
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDropTimeline = (taskId: string, newTime: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, time: newTime } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTaskForMenu(null);
  };

  const handleSaveTask = (savedTask: TaskItem) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
      }
      return [savedTask, ...prev];
    });
    setEditingTask(null);
    setIsCreateModalOpen(false);
  };

  const dateFilteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesDate = t.date === selectedDate;
      if (!matchesDate) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.location && t.location.toLowerCase().includes(q))
      );
    });
  }, [tasks, selectedDate, searchQuery]);

  const segmentFilteredTasks = useMemo(() => {
    if (taskFilterSegment === 'active') {
      return dateFilteredTasks.filter((t) => !t.completed);
    }
    if (taskFilterSegment === 'done') {
      return dateFilteredTasks.filter((t) => t.completed);
    }
    return dateFilteredTasks.filter((t) => !t.time || t.duration === 'Floating');
  }, [dateFilteredTasks, taskFilterSegment]);

  const activeFocusTask = useMemo(() => {
    return tasks.find((t) => t.id === focusActiveTaskId) || tasks[0] || null;
  }, [tasks, focusActiveTaskId]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: THEME.bgDark }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bgDark} />

        {/* 1. UNIFIED STICKY CONSOLIDATED HEADER */}
        <View style={styles.consolidatedHeader}>
          <View style={styles.dateSwitcherContainer}>
            <TouchableOpacity
              onPress={() => handleShiftDate(-1)}
              style={styles.dateArrowBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={16} color={THEME.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedDate(getLocalDateString())}
              style={styles.dateDisplayPill}
            >
              <Calendar size={13} color={THEME.primaryAccentLight} />
              <Text style={styles.dateDisplayText}>
                {formatDateHeader(selectedDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleShiftDate(1)}
              style={styles.dateArrowBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronRight size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => setIsSearchOpen((prev) => !prev)}
              style={[styles.headerIconBtn, isSearchOpen && styles.headerIconBtnActive]}
            >
              <Search size={18} color={isSearchOpen ? THEME.primaryAccentLight : THEME.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('settings')}
              style={[styles.headerIconBtn, activeTab === 'settings' && styles.headerIconBtnActive]}
            >
              <Settings size={18} color={activeTab === 'settings' ? THEME.primaryAccentLight : THEME.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {isSearchOpen && (
          <View style={styles.searchBarWrapper}>
            <Search size={14} color={THEME.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Filter tasks by keyword or category..."
              placeholderTextColor={THEME.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              autoFocus
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={THEME.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 2. SCREEN ROUTER */}
        <View style={styles.screenContent}>
          {activeTab === 'tasks' && (
            <TasksScreenView
              tasks={segmentFilteredTasks}
              totalActiveCount={dateFilteredTasks.filter((t) => !t.completed).length}
              totalBacklogCount={dateFilteredTasks.filter((t) => !t.time).length}
              totalDoneCount={dateFilteredTasks.filter((t) => t.completed).length}
              filterSegment={taskFilterSegment}
              onSelectSegment={setTaskFilterSegment}
              onToggleComplete={handleToggleComplete}
              onPressCard={(task) => setEditingTask(task)}
              onOpenMenu={(task) => setSelectedTaskForMenu(task)}
              hapticEnabled={hapticEnabled}
              onOpenAIPlan={() => setIsAIPlanCreatorOpen(true)}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineScreenView
              tasks={dateFilteredTasks}
              hourHeight={
                timelineZoom === 'compact' ? 90 : timelineZoom === 'magnified' ? 170 : hourHeight
              }
              zoom={timelineZoom}
              onChangeZoom={setTimelineZoom}
              onToggleComplete={handleToggleComplete}
              onPressCard={(task) => setEditingTask(task)}
              onOpenMenu={(task) => setSelectedTaskForMenu(task)}
              onDropTimeline={handleDropTimeline}
              hapticEnabled={hapticEnabled}
            />
          )}

          {activeTab === 'focus' && (
            <FocusScreenView
              activeTask={activeFocusTask}
              allTasks={dateFilteredTasks}
              onSelectActiveTask={(task) => {
                setFocusActiveTaskId(task.id);
                setFocusRemainingSeconds(parseDurationToMinutes(task.duration) * 60);
                setIsFocusTimerRunning(false);
              }}
              remainingSeconds={focusRemainingSeconds}
              isRunning={isFocusTimerRunning}
              onTogglePlay={() => setIsFocusTimerRunning((prev) => !prev)}
              onAdjustTimer={(mins) => {
                setFocusRemainingSeconds((prev) => Math.max(60, prev + mins * 60));
              }}
              onResetTimer={() => {
                setIsFocusTimerRunning(false);
                if (activeFocusTask) {
                  setFocusRemainingSeconds(parseDurationToMinutes(activeFocusTask.duration) * 60);
                } else {
                  setFocusRemainingSeconds(25 * 60);
                }
              }}
              onCompleteTask={() => {
                if (activeFocusTask) {
                  handleToggleComplete(activeFocusTask.id);
                  setIsFocusTimerRunning(false);
                }
              }}
              isAccordionOpen={isNotesAccordionOpen}
              onToggleAccordion={() => setIsNotesAccordionOpen((prev) => !prev)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsScreenView
              hapticEnabled={hapticEnabled}
              onToggleHaptic={() => setHapticEnabled((prev) => !prev)}
              onOpenAIPlan={() => setIsAIPlanCreatorOpen(true)}
              totalTasksCount={tasks.length}
            />
          )}
        </View>

        {/* 3. CONSOLIDATED 4-TAB BOTTOM NAVIGATION & ELEVATED FAB */}
        <View style={styles.bottomNavContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('tasks')}
            style={styles.navTabBtn}
          >
            <CheckSquare
              size={20}
              color={activeTab === 'tasks' ? THEME.primaryAccentLight : THEME.textMuted}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'tasks' && styles.navTabLabelActive,
              ]}
            >
              Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('timeline')}
            style={styles.navTabBtn}
          >
            <Clock
              size={20}
              color={activeTab === 'timeline' ? THEME.primaryAccentLight : THEME.textMuted}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'timeline' && styles.navTabLabelActive,
              ]}
            >
              Timeline
            </Text>
          </TouchableOpacity>

          <View style={styles.fabDockWrapper}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setEditingTask(null);
                setIsCreateModalOpen(true);
              }}
              style={styles.elevatedFab}
            >
              <Plus size={26} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('focus')}
            style={styles.navTabBtn}
          >
            <Zap
              size={20}
              color={activeTab === 'focus' ? THEME.primaryAccentLight : THEME.textMuted}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'focus' && styles.navTabLabelActive,
              ]}
            >
              Focus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('settings')}
            style={styles.navTabBtn}
          >
            <Settings
              size={20}
              color={activeTab === 'settings' ? THEME.primaryAccentLight : THEME.textMuted}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'settings' && styles.navTabLabelActive,
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. MODALS & SHEETS */}
        {(isCreateModalOpen || editingTask) && (
          <TaskFormModal
            visible={isCreateModalOpen || editingTask !== null}
            initialTask={editingTask}
            selectedDate={selectedDate}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingTask(null);
            }}
            onSave={handleSaveTask}
          />
        )}

        {selectedTaskForMenu && (
          <TaskContextMenuSheet
            visible={selectedTaskForMenu !== null}
            task={selectedTaskForMenu}
            onClose={() => setSelectedTaskForMenu(null)}
            onEdit={() => {
              const t = selectedTaskForMenu;
              setSelectedTaskForMenu(null);
              setEditingTask(t);
            }}
            onStartFocus={() => {
              setFocusActiveTaskId(selectedTaskForMenu.id);
              setFocusRemainingSeconds(parseDurationToMinutes(selectedTaskForMenu.duration) * 60);
              setSelectedTaskForMenu(null);
              setActiveTab('focus');
            }}
            onToggleLock={() => {
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === selectedTaskForMenu.id ? { ...t, isLocked: !t.isLocked } : t
                )
              );
              setSelectedTaskForMenu(null);
            }}
            onDelete={() => handleDeleteTask(selectedTaskForMenu.id)}
          />
        )}

        <AIPlanCreatorModal
          visible={isAIPlanCreatorOpen}
          onClose={() => setIsAIPlanCreatorOpen(false)}
          onPlanGenerated={(generatedTasks) => {
            setTasks((prev) => [...prev, ...generatedTasks]);
            setIsAIPlanCreatorOpen(false);
          }}
          scaleFont={scaleFont}
          isTablet={isTablet}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ============================================
// SUB-SCREEN 1: TASKS SCREEN VIEW
// ============================================
interface TasksScreenProps {
  tasks: TaskItem[];
  totalActiveCount: number;
  totalBacklogCount: number;
  totalDoneCount: number;
  filterSegment: 'active' | 'backlog' | 'done';
  onSelectSegment: (segment: 'active' | 'backlog' | 'done') => void;
  onToggleComplete: (id: string) => void;
  onPressCard: (task: TaskItem) => void;
  onOpenMenu: (task: TaskItem) => void;
  hapticEnabled?: boolean;
  onOpenAIPlan: () => void;
}

function TasksScreenView({
  tasks,
  totalActiveCount,
  totalBacklogCount,
  totalDoneCount,
  filterSegment,
  onSelectSegment,
  onToggleComplete,
  onPressCard,
  onOpenMenu,
  hapticEnabled,
  onOpenAIPlan,
}: TasksScreenProps) {
  return (
    <View style={styles.screenInnerContainer}>
      <View style={styles.segmentControlBar}>
        <TouchableOpacity
          onPress={() => onSelectSegment('active')}
          style={[styles.segmentBtn, filterSegment === 'active' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentBtnText, filterSegment === 'active' && styles.segmentBtnTextActive]}>
            Active ({totalActiveCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectSegment('backlog')}
          style={[styles.segmentBtn, filterSegment === 'backlog' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentBtnText, filterSegment === 'backlog' && styles.segmentBtnTextActive]}>
            Saved ({totalBacklogCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSelectSegment('done')}
          style={[styles.segmentBtn, filterSegment === 'done' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentBtnText, filterSegment === 'done' && styles.segmentBtnTextActive]}>
            Done ({totalDoneCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.screenScroller}
        contentContainerStyle={styles.listContentPadding}
        showsVerticalScrollIndicator={false}
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckSquare size={36} color={THEME.textMuted} />
            <Text style={styles.emptyTitle}>
              {filterSegment === 'done'
                ? 'No finished tasks yet'
                : filterSegment === 'backlog'
                ? 'Saved queue is clear'
                : 'No active tasks scheduled'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Tap the (+) button below to create your next high-impact objective.
            </Text>
            <TouchableOpacity onPress={onOpenAIPlan} style={styles.emptyPlanBtn}>
              <Sparkles size={14} color="#00B894" />
              <Text style={styles.emptyPlanBtnText}>Generate with AI Plan Wizard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tasks.map((task) => (
            <StandardTaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onPressCard={onPressCard}
              onOpenMenu={onOpenMenu}
              isTimelineView={false}
              hapticEnabled={hapticEnabled}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// SUB-SCREEN 2: TIMELINE SCREEN VIEW
// ============================================
interface TimelineScreenProps {
  tasks: TaskItem[];
  hourHeight: number;
  zoom: 'normal' | 'compact' | 'magnified';
  onChangeZoom: (z: 'normal' | 'compact' | 'magnified') => void;
  onToggleComplete: (id: string) => void;
  onPressCard: (task: TaskItem) => void;
  onOpenMenu: (task: TaskItem) => void;
  onDropTimeline: (taskId: string, newTime: string) => void;
  hapticEnabled?: boolean;
}

function TimelineScreenView({
  tasks,
  hourHeight,
  zoom,
  onChangeZoom,
  onToggleComplete,
  onPressCard,
  onOpenMenu,
  onDropTimeline,
  hapticEnabled,
}: TimelineScreenProps) {
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentTop = (currentMins / 60) * hourHeight;

  return (
    <View style={styles.screenInnerContainer}>
      <View style={styles.timelineSubHeader}>
        <Text style={styles.timelineSubHeaderTitle}>24-Hour Schedule</Text>
        <View style={styles.zoomPillRow}>
          {(['compact', 'normal', 'magnified'] as const).map((z) => (
            <TouchableOpacity
              key={z}
              onPress={() => onChangeZoom(z)}
              style={[styles.zoomPill, zoom === z && styles.zoomPillActive]}
            >
              <Text style={[styles.zoomPillText, zoom === z && styles.zoomPillTextActive]}>
                {z === 'compact' ? 'Compact' : z === 'magnified' ? 'Detail' : 'Standard'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.screenScroller}
        contentContainerStyle={{ height: 24 * hourHeight + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {hours.map((hour) => (
          <View key={hour} style={[styles.timelineHourRow, { height: hourHeight }]}>
            <Text style={styles.timelineHourLabel}>
              {hour === 0 ? '12 AM' : hour < 12 ? (hour + ' AM') : hour === 12 ? '12 PM' : ((hour - 12) + ' PM')}
            </Text>
            <View style={styles.timelineHourRule} />
          </View>
        ))}

        <View style={[styles.currentTimeIndicator, { top: currentTop }]}>
          <View style={styles.currentTimeDot} />
          <View style={styles.currentTimeLine} />
        </View>

        {tasks.map((task) => {
          const startMins = parseTimeToMinutes(task.time);
          const durationMins = parseDurationToMinutes(task.duration);
          const cardTop = (startMins / 60) * hourHeight;
          const cardHeight = Math.max((durationMins / 60) * hourHeight, 52);
          const travelBefore = task.travelBefore || 0;
          const travelAfter = task.travelAfter || 0;

          return (
            <View key={task.id} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
              {travelBefore > 0 && (
                <View
                  style={[
                    styles.travelBufferBlock,
                    {
                      top: ((startMins - travelBefore) / 60) * hourHeight,
                      height: (travelBefore / 60) * hourHeight,
                    },
                  ]}
                >
                  <Car size={10} color="#00B894" />
                  <Text style={styles.travelBufferText}>Pre-Buffer ({travelBefore}m)</Text>
                </View>
              )}

              <View
                style={[
                  styles.timelineTaskContainer,
                  { top: cardTop, height: cardHeight },
                ]}
              >
                <StandardTaskCard
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onPressCard={onPressCard}
                  onOpenMenu={onOpenMenu}
                  onDropTimeline={(newTime) => onDropTimeline(task.id, newTime)}
                  isTimelineView={true}
                  hapticEnabled={hapticEnabled}
                />
              </View>

              {travelAfter > 0 && (
                <View
                  style={[
                    styles.travelBufferBlock,
                    {
                      top: ((startMins + durationMins) / 60) * hourHeight,
                      height: (travelAfter / 60) * hourHeight,
                    },
                  ]}
                >
                  <Car size={10} color="#6C5CE7" />
                  <Text style={styles.travelBufferText}>Post-Buffer ({travelAfter}m)</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ============================================
// SUB-SCREEN 3: FOCUS SCREEN VIEW
// ============================================
interface FocusScreenProps {
  activeTask: TaskItem | null;
  allTasks: TaskItem[];
  onSelectActiveTask: (task: TaskItem) => void;
  remainingSeconds: number;
  isRunning: boolean;
  onTogglePlay: () => void;
  onAdjustTimer: (minutes: number) => void;
  onResetTimer: () => void;
  onCompleteTask: () => void;
  isAccordionOpen: boolean;
  onToggleAccordion: () => void;
}

function FocusScreenView({
  activeTask,
  remainingSeconds,
  isRunning,
  onTogglePlay,
  onAdjustTimer,
  onResetTimer,
  onCompleteTask,
  isAccordionOpen,
  onToggleAccordion,
}: FocusScreenProps) {
  const formatTimerDigits = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  };

  return (
    <ScrollView
      style={styles.screenScroller}
      contentContainerStyle={styles.focusContentPadding}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.focusHeroCard}>
        <View style={styles.focusHeroHeaderRow}>
          <View style={styles.focusLivePill}>
            <View style={[styles.livePulseDot, isRunning && styles.livePulseDotActive]} />
            <Text style={styles.focusLivePillText}>
              {isRunning ? 'DEEP WORK IN PROGRESS' : 'READY TO FOCUS'}
            </Text>
          </View>

          {activeTask?.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{activeTask.category}</Text>
            </View>
          )}
        </View>

        <Text style={styles.focusHeroTitle}>
          {activeTask ? activeTask.title : 'No Task Selected for Focus'}
        </Text>
        {activeTask?.location && (
          <View style={styles.focusHeroMeta}>
            <MapPin size={12} color={THEME.textSecondary} />
            <Text style={styles.focusHeroMetaText}>{activeTask.location}</Text>
          </View>
        )}
      </View>

      <View style={styles.timerWheelContainer}>
        <View style={styles.timerWheelOuter}>
          <View style={styles.timerWheelInner}>
            <Text style={styles.timerDigitsText}>
              {formatTimerDigits(remainingSeconds)}
            </Text>
            <Text style={styles.timerSubLabel}>REMAINING</Text>
          </View>
        </View>
      </View>

      <View style={styles.presetPillsRow}>
        <TouchableOpacity
          onPress={() => onAdjustTimer(5)}
          style={styles.presetPillBtn}
        >
          <Text style={styles.presetPillBtnText}>+5m</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAdjustTimer(15)}
          style={styles.presetPillBtn}
        >
          <Text style={styles.presetPillBtnText}>+15m</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAdjustTimer(30)}
          style={styles.presetPillBtn}
        >
          <Text style={styles.presetPillBtnText}>+30m</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onResetTimer}
          style={[styles.presetPillBtn, { borderColor: THEME.cardBorder }]}
        >
          <RotateCcw size={12} color={THEME.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.focusActionsContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onTogglePlay}
          style={[styles.primaryFocusCta, isRunning && styles.primaryFocusCtaRunning]}
        >
          {isRunning ? (
            <>
              <Pause size={20} color="#FFFFFF" />
              <Text style={styles.primaryFocusCtaText}>PAUSE FOCUS</Text>
            </>
          ) : (
            <>
              <Play size={20} color="#FFFFFF" />
              <Text style={styles.primaryFocusCtaText}>START FOCUS</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCompleteTask}
          style={styles.completeFocusBtn}
        >
          <Check size={18} color="#00B894" strokeWidth={3} />
          <Text style={styles.completeFocusBtnText}>Complete Task</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.accordionContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleAccordion}
          style={styles.accordionHeader}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color={THEME.primaryAccentLight} />
            <Text style={styles.accordionHeaderTitle}>Notes & Science Narrative</Text>
          </View>
          {isAccordionOpen ? (
            <ChevronUp size={18} color={THEME.textSecondary} />
          ) : (
            <ChevronDown size={18} color={THEME.textSecondary} />
          )}
        </TouchableOpacity>

        {isAccordionOpen && (
          <View style={styles.accordionBody}>
            {activeTask?.focusNotes && (
              <View style={styles.narrativeSection}>
                <Text style={styles.narrativeSectionLabel}>Focus Protocol</Text>
                <Text style={styles.narrativeText}>{activeTask.focusNotes}</Text>
              </View>
            )}

            {activeTask?.scienceNote && (
              <View style={styles.narrativeSection}>
                <Text style={[styles.narrativeSectionLabel, { color: '#74B9FF' }]}>Neurobiology & Strategy</Text>
                <Text style={styles.narrativeText}>{activeTask.scienceNote}</Text>
              </View>
            )}

            {activeTask?.subtasks && activeTask.subtasks.length > 0 && (
              <View style={styles.narrativeSection}>
                <Text style={styles.narrativeSectionLabel}>Subtasks</Text>
                {activeTask.subtasks.map((st) => (
                  <View key={st.id} style={styles.subtaskRow}>
                    <View style={styles.subtaskBullet} />
                    <Text style={styles.subtaskTitle}>{st.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================
// SUB-SCREEN 4: SETTINGS SCREEN VIEW
// ============================================
interface SettingsScreenProps {
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
  onOpenAIPlan: () => void;
  totalTasksCount: number;
}

function SettingsScreenView({
  hapticEnabled,
  onToggleHaptic,
  onOpenAIPlan,
  totalTasksCount,
}: SettingsScreenProps) {
  return (
    <ScrollView
      style={styles.screenScroller}
      contentContainerStyle={styles.settingsContentPadding}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.settingsSectionTitle}>PREFERENCES & TACTILE ENGINE</Text>

      <View style={styles.settingCard}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>Tactile Haptic Feedback</Text>
          <Text style={styles.settingSubtitle}>
            Vibrate softly on task snaps, completion, and slider touches.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onToggleHaptic}
          style={[styles.toggleBtn, hapticEnabled ? styles.toggleBtnActive : styles.toggleBtnInactive]}
        >
          <Text style={[styles.toggleBtnText, hapticEnabled ? styles.toggleBtnTextActive : styles.toggleBtnTextInactive]}>
            {hapticEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingCard}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>AI Protocol Plan Wizard</Text>
          <Text style={styles.settingSubtitle}>
            Generate structured multi-hour ultradian schedules based on goals.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onOpenAIPlan}
          style={styles.actionPillBtn}
        >
          <Sparkles size={14} color="#FFFFFF" />
          <Text style={styles.actionPillBtnText}>Launch Wizard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusSummaryBox}>
        <Text style={styles.statusSummaryLabel}>APPLICATION SPECS</Text>
        <Text style={styles.statusSummaryText}>Active Workspace Tasks: {totalTasksCount}</Text>
        <Text style={styles.statusSummaryText}>Design System: Unified 16px Card & 24px Pill Architecture</Text>
        <Text style={styles.statusSummaryText}>Engine: React Native Reanimated v3 + Gesture Handler</Text>
      </View>
    </ScrollView>
  );
}

// ============================================
// MODAL: TASK CREATION & EDIT MODAL
// ============================================
interface TaskFormModalProps {
  visible: boolean;
  initialTask: TaskItem | null;
  selectedDate: string;
  onClose: () => void;
  onSave: (task: TaskItem) => void;
}

function TaskFormModal({ visible, initialTask, selectedDate, onClose, onSave }: TaskFormModalProps) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [category, setCategory] = useState(initialTask?.category || 'DeepWork');
  const [time, setTime] = useState(initialTask?.time || '09:00');
  const [duration, setDuration] = useState(initialTask?.duration || '45m');
  const [location, setLocation] = useState(initialTask?.location || '');
  const [travelBefore, setTravelBefore] = useState(String(initialTask?.travelBefore || '0'));
  const [notes, setNotes] = useState(initialTask?.notes || '');

  const categories = ['DeepWork', 'Work', 'Health', 'Meeting', 'Personal'];

  const handleSave = () => {
    if (!title.trim()) return;
    const taskObj: TaskItem = {
      id: initialTask?.id || 'task_' + Date.now(),
      title: title.trim(),
      category,
      date: initialTask?.date || selectedDate,
      time,
      duration,
      location: location.trim() || undefined,
      travelBefore: parseInt(travelBefore) || 0,
      notes: notes.trim() || undefined,
      completed: initialTask?.completed || false,
      isLocked: initialTask?.isLocked || false,
    };
    onSave(taskObj);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeaderTitle}>
              {initialTask ? 'Edit Task' : 'Create New Task'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={20} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>TASK TITLE</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. Audit API Schema & Latency"
              placeholderTextColor={THEME.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={styles.modalCategoryRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.modalCategoryChip,
                    category === cat && styles.modalCategoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalCategoryChipText,
                      category === cat && styles.modalCategoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalSplitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>START TIME</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="09:00"
                  placeholderTextColor={THEME.textMuted}
                  value={time}
                  onChangeText={setTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>DURATION</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="45m"
                  placeholderTextColor={THEME.textMuted}
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            </View>

            <View style={styles.modalSplitRow}>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.inputLabel}>LOCATION</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Studio 4"
                  placeholderTextColor={THEME.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>PRE-BUFFER (M)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="10"
                  keyboardType="numeric"
                  placeholderTextColor={THEME.textMuted}
                  value={travelBefore}
                  onChangeText={setTravelBefore}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>FOCUS NOTES</Text>
            <TextInput
              style={[styles.modalTextInput, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="Important reminders or sub-steps..."
              placeholderTextColor={THEME.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </ScrollView>

          <View style={styles.modalFooterRow}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.modalSaveBtn}>
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.modalSaveBtnText}>Save Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// CONTEXT MENU BOTTOM SHEET
// ============================================
interface TaskContextMenuSheetProps {
  visible: boolean;
  task: TaskItem;
  onClose: () => void;
  onEdit: () => void;
  onStartFocus: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

function TaskContextMenuSheet({
  visible,
  task,
  onClose,
  onEdit,
  onStartFocus,
  onDelete,
}: TaskContextMenuSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.sheetOverlay}>
        <View style={styles.sheetCard}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.sheetSub}>
              {formatTime(task.time)} • {task.duration}
            </Text>
          </View>

          <TouchableOpacity onPress={onStartFocus} style={styles.sheetActionBtn}>
            <Zap size={18} color={THEME.primaryAccentLight} />
            <Text style={styles.sheetActionText}>Launch Focus Session</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onEdit} style={styles.sheetActionBtn}>
            <Edit3 size={18} color={THEME.textSecondary} />
            <Text style={styles.sheetActionText}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDelete}
            style={[styles.sheetActionBtn, { borderBottomWidth: 0 }]}
          >
            <Trash2 size={18} color={THEME.dangerAccent} />
            <Text style={[styles.sheetActionText, { color: THEME.dangerAccent }]}>
              Delete Task
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================
// MODAL: AI PLAN CREATOR WIZARD
// ============================================
interface AIPlanCreatorProps {
  visible: boolean;
  onClose: () => void;
  onPlanGenerated: (newTasks: TaskItem[]) => void;
  scaleFont: (base: number) => number;
  isTablet?: boolean;
}

export function AIPlanCreatorModal({
  visible,
  onClose,
  onPlanGenerated,
}: AIPlanCreatorProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [goal, setGoal] = useState('');
  const [timeAvailable, setTimeAvailable] = useState('120');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<TaskItem[]>([]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const mins = parseInt(timeAvailable) || 120;
      const blocks = Math.max(2, Math.min(4, Math.ceil(mins / 60)));
      const perBlock = Math.round(mins / blocks);

      const items: TaskItem[] = [];
      for (let i = 0; i < blocks; i++) {
        const startH = 9 + i;
        const blockName = i === 0 ? 'Foundation & Priming' : i === 1 ? 'Execution Sprint' : 'Review & Synthesis';
        items.push({
          id: 'ai_' + Date.now() + '_' + i,
          title: 'Block ' + (i + 1) + ': ' + blockName + ' - ' + (goal || 'Core Objective'),
          category: 'DeepWork',
          date: getLocalDateString(),
          time: String(startH).padStart(2, '0') + ':00',
          duration: perBlock + 'm',
          completed: false,
          location: 'Focus Station',
          focusNotes: 'Ultradian execution block ' + (i + 1) + '. Zero context-switching.',
          scienceNote: 'Maintains sustained norepinephrine and prefrontal cortex engagement.',
          travelBefore: i > 0 ? 5 : 0,
        });
      }
      setGeneratedTasks(items);
      setIsGenerating(false);
      setStep(4);
    }, 600);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#00B894" />
              <Text style={styles.modalHeaderTitle}>AI Plan Wizard</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={20} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          {step === 1 && (
            <View style={{ gap: 12, marginVertical: 12 }}>
              <Text style={styles.inputLabel}>1. WHAT IS YOUR PRIMARY GOAL?</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Build Redux Architecture, Tempo Run, Sprint Planning"
                placeholderTextColor={THEME.textMuted}
                value={goal}
                onChangeText={setGoal}
              />
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: 12, marginVertical: 12 }}>
              <Text style={styles.inputLabel}>2. TOTAL MINUTES AVAILABLE</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="120"
                keyboardType="numeric"
                placeholderTextColor={THEME.textMuted}
                value={timeAvailable}
                onChangeText={setTimeAvailable}
              />
            </View>
          )}

          {step === 4 && (
            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {generatedTasks.map((t) => (
                <View key={t.id} style={styles.generatedTaskItem}>
                  <Text style={styles.generatedTaskTitle}>{t.title}</Text>
                  <Text style={styles.generatedTaskMeta}>
                    {t.time} • {t.duration}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalFooterRow}>
            {step > 1 && step < 4 && (
              <TouchableOpacity
                onPress={() => setStep((prev) => (prev - 1) as any)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 2 && (
              <TouchableOpacity onPress={() => setStep(2)} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveBtnText}>Next Step</Text>
              </TouchableOpacity>
            )}

            {step === 2 && (
              <TouchableOpacity
                onPress={handleGenerate}
                style={[styles.modalSaveBtn, { backgroundColor: '#00B894' }]}
              >
                <Text style={styles.modalSaveBtnText}>
                  {isGenerating ? 'Generating...' : 'Generate Plan'}
                </Text>
              </TouchableOpacity>
            )}

            {step === 4 && (
              <TouchableOpacity
                onPress={() => onPlanGenerated(generatedTasks)}
                style={[styles.modalSaveBtn, { backgroundColor: '#00B894' }]}
              >
                <Text style={styles.modalSaveBtnText}>Deploy Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// COMMON TIME & FORMATTING HELPERS
// ============================================
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function parseDurationToMinutes(durationStr: string | number): number {
  if (!durationStr && durationStr !== 0) return 30;
  if (typeof durationStr === 'number') return isNaN(durationStr) ? 30 : Math.floor(durationStr);
  const normalized = String(durationStr).toLowerCase();
  let totalMinutes = 0;
  try {
    const hourMatch = normalized.match(/(\\d+(?:\\.\\d+)?)\\s*(h|hour|hr)/);
    if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60;
    const minMatch = normalized.match(/(\\d+(?:\\.\\d+)?)\\s*(m|min)/);
    if (minMatch) totalMinutes += parseFloat(minMatch[1]);
    if (totalMinutes === 0 && !isNaN(parseFloat(normalized))) totalMinutes = parseFloat(normalized);
  } catch {
    return 30;
  }
  return Math.floor(Number(totalMinutes)) || 30;
}

function minutesToTimeString(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function formatTime(timeVal: string): string {
  if (!timeVal) return '';
  const [h, m] = timeVal.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHr = h % 12 || 12;
  return displayHr + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

function getLocalDateString(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDateHeader(dateStr: string): string {
  if (!dateStr) return 'Today';
  const todayStr = getLocalDateString();
  if (dateStr === todayStr) return 'Today, ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return dateStr;
}

// ============================================
// STYLESHEET WITH UNIFIED DESIGN TOKENS
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bgDark,
  },

  // Consolidated Sticky Header
  consolidatedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.paddingStandard,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardBorder,
    backgroundColor: THEME.bgDark,
  },
  dateSwitcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateArrowBtn: {
    padding: 6,
    borderRadius: THEME.radiusPill,
    backgroundColor: THEME.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radiusPill,
  },
  dateDisplayText: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.radiusPill,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnActive: {
    borderColor: THEME.primaryAccent,
    backgroundColor: THEME.primaryAccentMuted,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginHorizontal: THEME.paddingStandard,
    marginTop: 8,
    borderRadius: THEME.radiusCard,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: THEME.textPrimary,
    fontSize: 13,
    padding: 0,
  },

  screenContent: {
    flex: 1,
  },
  screenInnerContainer: {
    flex: 1,
  },
  screenScroller: {
    flex: 1,
  },
  listContentPadding: {
    padding: THEME.paddingStandard,
    gap: 12,
  },

  // Standardized Task Card
  taskCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: THEME.radiusCard,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  taskCardCompleted: {
    opacity: 0.55,
    backgroundColor: '#11131C',
  },
  taskCardDragging: {
    borderColor: THEME.primaryAccent,
    backgroundColor: THEME.primaryAccentMuted,
  },
  taskCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxContainer: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: THEME.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: THEME.successAccent,
    borderColor: THEME.successAccent,
  },
  taskCardContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: 0.2,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: THEME.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primaryAccentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radiusPill,
  },
  timePillText: {
    color: THEME.primaryAccentLight,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radiusPill,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bufferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.successAccentMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radiusPill,
  },
  bufferBadgeText: {
    color: THEME.successAccent,
    fontSize: 10,
    fontWeight: '700',
  },
  overflowMenuBtn: {
    padding: 6,
  },
  dragPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primaryAccent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radiusPill,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  dragPreviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // Segment Bar
  segmentControlBar: {
    flexDirection: 'row',
    marginHorizontal: THEME.paddingStandard,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: THEME.cardBg,
    borderRadius: THEME.radiusPill,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.radiusPill,
  },
  segmentBtnActive: {
    backgroundColor: THEME.primaryAccent,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },

  // Timeline Sub-Header & Grid
  timelineSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.paddingStandard,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardBorder,
  },
  timelineSubHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  zoomPillRow: {
    flexDirection: 'row',
    gap: 4,
  },
  zoomPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radiusPill,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  zoomPillActive: {
    backgroundColor: THEME.primaryAccentMuted,
    borderColor: THEME.primaryAccent,
  },
  zoomPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  zoomPillTextActive: {
    color: THEME.primaryAccentLight,
  },
  timelineHourRow: {
    flexDirection: 'row',
    paddingLeft: THEME.paddingStandard,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(37, 40, 58, 0.4)',
  },
  timelineHourLabel: {
    width: 48,
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    paddingTop: 6,
  },
  timelineHourRule: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: THEME.cardBorder,
    marginTop: 14,
    opacity: 0.3,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 48,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.dangerAccent,
  },
  currentTimeLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: THEME.dangerAccent,
    opacity: 0.8,
  },
  timelineTaskContainer: {
    position: 'absolute',
    left: 64,
    right: 16,
    justifyContent: 'center',
  },
  travelBufferBlock: {
    position: 'absolute',
    left: 64,
    right: 16,
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.successAccent,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  travelBufferText: {
    color: THEME.successAccent,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // Focus View Styling
  focusContentPadding: {
    padding: THEME.paddingStandard,
    gap: 16,
  },
  focusHeroCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: THEME.radiusCard,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 16,
    gap: 8,
  },
  focusHeroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primaryAccentMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radiusPill,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.textMuted,
  },
  livePulseDotActive: {
    backgroundColor: THEME.successAccent,
  },
  focusLivePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primaryAccentLight,
    letterSpacing: 0.5,
  },
  focusHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  focusHeroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusHeroMetaText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  timerWheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  timerWheelOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    borderColor: THEME.primaryAccentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11131F',
    shadowColor: THEME.primaryAccent,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
  timerWheelInner: {
    alignItems: 'center',
  },
  timerDigitsText: {
    fontSize: 40,
    fontWeight: '900',
    color: THEME.textPrimary,
    letterSpacing: 1,
  },
  timerSubLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primaryAccentLight,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  presetPillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  presetPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radiusPill,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillBtnText: {
    color: THEME.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  focusActionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  primaryFocusCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primaryAccent,
    borderRadius: THEME.radiusPill,
    paddingVertical: 14,
    shadowColor: THEME.primaryAccent,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  primaryFocusCtaRunning: {
    backgroundColor: '#5847D0',
  },
  primaryFocusCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completeFocusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.successAccent,
    borderRadius: THEME.radiusPill,
    paddingVertical: 12,
  },
  completeFocusBtnText: {
    color: THEME.successAccent,
    fontSize: 13,
    fontWeight: '800',
  },
  accordionContainer: {
    backgroundColor: THEME.cardBg,
    borderRadius: THEME.radiusCard,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  accordionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.cardBorder,
    paddingTop: 10,
  },
  narrativeSection: {
    gap: 4,
  },
  narrativeSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primaryAccentLight,
    textTransform: 'uppercase',
  },
  narrativeText: {
    fontSize: 12,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  subtaskBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.primaryAccentLight,
  },
  subtaskTitle: {
    fontSize: 12,
    color: THEME.textPrimary,
  },

  // Settings Screen Styling
  settingsContentPadding: {
    padding: THEME.paddingStandard,
    gap: 14,
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.cardBg,
    borderRadius: THEME.radiusCard,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  settingSubtitle: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radiusPill,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: THEME.successAccentMuted,
    borderColor: THEME.successAccent,
  },
  toggleBtnInactive: {
    backgroundColor: THEME.dangerAccentMuted,
    borderColor: THEME.dangerAccent,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  toggleBtnTextActive: {
    color: THEME.successAccent,
  },
  toggleBtnTextInactive: {
    color: THEME.dangerAccent,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primaryAccent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radiusPill,
  },
  actionPillBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  statusSummaryBox: {
    backgroundColor: THEME.cardElevated,
    borderRadius: THEME.radiusCard,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    gap: 4,
    marginTop: 10,
  },
  statusSummaryLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.primaryAccentLight,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusSummaryText: {
    fontSize: 11,
    color: THEME.textSecondary,
  },

  // 4-Tab Bottom Navigation & FAB
  bottomNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    backgroundColor: THEME.bgDark,
    borderTopWidth: 1,
    borderTopColor: THEME.cardBorder,
    paddingHorizontal: 8,
  },
  navTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  navTabLabelActive: {
    color: THEME.primaryAccentLight,
  },
  fabDockWrapper: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevatedFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: THEME.primaryAccent,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: THEME.bgDark,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: THEME.cardBg,
    borderRadius: THEME.radiusCard,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 20,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardBorder,
    paddingBottom: 10,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.primaryAccentLight,
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  modalTextInput: {
    backgroundColor: THEME.bgDark,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.textPrimary,
    fontSize: 13,
  },
  modalCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalCategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radiusPill,
    backgroundColor: THEME.bgDark,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  modalCategoryChipActive: {
    backgroundColor: THEME.primaryAccentMuted,
    borderColor: THEME.primaryAccent,
  },
  modalCategoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  modalCategoryChipTextActive: {
    color: THEME.primaryAccentLight,
  },
  modalSplitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.cardBorder,
    paddingTop: 14,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelBtnText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primaryAccent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radiusPill,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Sheet Context Menu Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: THEME.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 20,
    gap: 4,
  },
  sheetHeader: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardBorder,
    paddingBottom: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  sheetSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  sheetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(37, 40, 58, 0.5)',
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.successAccentMuted,
    borderWidth: 1,
    borderColor: THEME.successAccent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radiusPill,
    marginTop: 8,
  },
  emptyPlanBtnText: {
    color: THEME.successAccent,
    fontSize: 12,
    fontWeight: '800',
  },

  // Generated Plan Preview
  generatedTaskItem: {
    backgroundColor: THEME.bgDark,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 8,
  },
  generatedTaskTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  generatedTaskMeta: {
    fontSize: 10,
    color: THEME.primaryAccentLight,
    marginTop: 2,
  }
});
`;
