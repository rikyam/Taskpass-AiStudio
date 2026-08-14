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
  const [draggingTimeStr, setDraggingTimeStr] = useState<string | null>(null);

  const triggerHapticFeedback = () => {
    if (Platform.OS !== 'web' && hapticEnabled !== false) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(40);
      } else {
        Vibration.vibrate([0, 35]);
      }
    }
  };

  const updatePreviewTime = (offsetY: number) => {
    const deltaMins = Math.round((offsetY / hourHeight) * 60);
    const initialMins = parseTimeToMinutes(task.computedTime || task.time);
    let finalMins = initialMins + deltaMins;
    finalMins = Math.max(0, Math.min(1440, Math.round(finalMins / TIMELINE_INCREMENT) * TIMELINE_INCREMENT));
    setDraggingTimeStr(formatTime(minutesToTimeString(finalMins)));
  };

  const handleJSCallback = (offsetY: number) => {
    // Convert Y offset to timeline minutes and snap to TIMELINE_INCREMENT
    const deltaMins = Math.round((offsetY / hourHeight) * 60);
    const initialMins = parseTimeToMinutes(task.computedTime || task.time);
    let finalMins = initialMins + deltaMins;
    finalMins = Math.max(0, Math.min(1440, Math.round(finalMins / TIMELINE_INCREMENT) * TIMELINE_INCREMENT));
    
    triggerHapticFeedback();
    onDrop(minutesToTimeString(finalMins));
  };

  // Long-press (~500ms) gesture activation with Pan
  const gesture = Gesture.Pan()
    .activateAfterLongPress(500)
    .onStart(() => {
      scale.value = withSpring(1.06, { damping: 12, stiffness: 225 });
      runOnJS(triggerHapticFeedback)();
    })
    .onUpdate((event) => {
      translationY.value = event.translationY;
      if (!isLocked) {
        translationX.value = event.translationX;
      }
      runOnJS(updatePreviewTime)(event.translationY);
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 225 });
      runOnJS(handleJSCallback)(translationY.value);
      runOnJS(setDraggingTimeStr)(null);
      translationX.value = withSpring(0, { damping: 12, stiffness: 225 });
      translationY.value = withSpring(0, { damping: 12, stiffness: 225 });
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
      <Animated.View style={[styles.card, { backgroundColor: cardBackground, borderColor: draggingTimeStr ? '#818cf8' : '#334155' }, animatedStyle]}>
        {draggingTimeStr && (
          <View style={styles.dragPreviewBadge}>
            <Clock size={11} color="#818cf8" />
            <Text style={styles.dragPreviewBadgeText}>Drop at {draggingTimeStr}</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <TouchableOpacity onPress={onComplete} style={styles.checkBox}>
            {task.completed && <Check size={14} color="#10b981" strokeWidth={3} />}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.taskTitle, task.completed && styles.completedText]} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.taskTime}>
              {formatTime(task.computedTime || task.time)} - {task.duration || '15 min'}
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

        {(task.travelBefore > 0 || task.travelAfter > 0) && (
          <View style={styles.travelRow}>
            {task.travelBefore > 0 && (
              <View style={styles.travelBadge}>
                <Car size={10} color="#38bdf8" />
                <Text style={styles.travelBadgeText}>{task.travelBefore}m Before</Text>
              </View>
            )}
            {task.travelAfter > 0 && (
              <View style={styles.travelBadge}>
                <Car size={10} color="#38bdf8" />
                <Text style={styles.travelBadgeText}>{task.travelAfter}m After</Text>
              </View>
            )}
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
  const [showAIPlanCreator, setShowAIPlanCreator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTaskDrop = (taskId: string, newTime: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, time: newTime };
      }
      return t;
    }));
  };

  const handlePlanGenerated = (newTasks: any[]) => {
    setTasks(prev => [...prev, ...newTasks]);
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
            {/* AI Plan Creator Quick Trigger */}
            <TouchableOpacity 
              onPress={() => setShowAIPlanCreator(true)} 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: '#10b981',
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
              }}
            >
              <Sparkles size={scaleFont(14)} color="#10b981" />
              <Text style={{ color: '#34d399', fontSize: scaleFont(10), fontWeight: '900', letterSpacing: 0.5 }}>AI PLAN</Text>
            </TouchableOpacity>

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

              {/* AI Plan Creator Row */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { fontSize: scaleFont(14) }]}>AI Plan Creator</Text>
                  <Text style={styles.settingDesc}>Step-by-step interactive training & lifestyle plan wizard</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setShowSettings(false);
                    setShowAIPlanCreator(true);
                  }}
                  style={[styles.toggleBtn, styles.toggleBtnActive, { backgroundColor: '#10b981', borderColor: '#059669', minWidth: 90 }]}
                >
                  <Text style={[styles.toggleBtnText, { color: '#ffffff' }]}>BUILD PLAN</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSettings(false)}>
                <Text style={[styles.closeModalBtnText, { fontSize: scaleFont(12) }]}>Apply Config</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* AI Plan Creator Interactive Wizard Modal */}
        <AIPlanCreatorModal
          visible={showAIPlanCreator}
          onClose={() => setShowAIPlanCreator(false)}
          onPlanGenerated={handlePlanGenerated}
          scaleFont={scaleFont}
          isTablet={isTablet}
        />

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

function TimelineScrollView({ tasks, onDrop, onEdit, hapticEnabled, hourHeight, onSlotTap }: any) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentTop = (currentMins / 60) * hourHeight;

  return (
    <ScrollView style={styles.scroller} contentContainerStyle={{ height: 24 * hourHeight + 60 }}>
      {hours.map(hour => (
        <TouchableOpacity 
          key={hour} 
          activeOpacity={0.8}
          onPress={() => onSlotTap && onSlotTap(writeTimeString(hour, 0))}
          style={[styles.hourBlock, { height: hourHeight }]}
        >
          <Text style={styles.hourLabel}>
            {hour === 0 ? '12 AM' : hour <= 12 ? \`\${hour} AM\` : \`\${hour - 12} PM\`}
          </Text>
          <View style={styles.hourLine} />
        </TouchableOpacity>
      ))}

      {/* Red Current Time Line Indicator */}
      <View style={[styles.currentTimeIndicator, { top: currentTop }]}>
        <View style={styles.currentTimeDot} />
        <View style={styles.currentTimeLine} />
      </View>

      {/* Floating Task Cards positioned absolutely by computed start times */}
      {tasks.map((task: any) => {
        const startMins = parseTimeToMinutes(task.computedTime || task.time);
        const durationMins = parseDurationToMinutes(task.duration);
        const cardTop = (startMins / 60) * hourHeight;
        const cardHeight = (durationMins / 60) * hourHeight;

        const travelBeforeMins = Number(task.travelBefore) || 0;
        const travelAfterMins = Number(task.travelAfter) || 0;

        return (
          <View key={task.id} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            {/* Travel Before Overlay */}
            {travelBeforeMins > 0 && (
              <View 
                style={[
                  styles.travelBlockOverlay, 
                  { 
                    top: ((startMins - travelBeforeMins) / 60) * hourHeight, 
                    height: (travelBeforeMins / 60) * hourHeight 
                  }
                ]}
              >
                <Car size={10} color="#38bdf8" />
                <Text style={styles.travelBlockText}>Travel ({travelBeforeMins}m)</Text>
              </View>
            )}

            {/* Task Card Container */}
            <View 
              style={[
                styles.timelineCardContainer, 
                { top: cardTop, height: Math.max(cardHeight, 60) }
              ]}
            >
              <PanDragTaskCard
                task={task}
                onDrop={(newTime) => onDrop(task.id, newTime)}
                onEdit={onEdit}
                onComplete={() => {}}
                hapticEnabled={hapticEnabled}
              />
            </View>

            {/* Travel After Overlay */}
            {travelAfterMins > 0 && (
              <View 
                style={[
                  styles.travelBlockOverlay, 
                  { 
                    top: ((startMins + durationMins) / 60) * hourHeight, 
                    height: (travelAfterMins / 60) * hourHeight 
                  }
                ]}
              >
                <Car size={10} color="#38bdf8" />
                <Text style={styles.travelBlockText}>Travel ({travelAfterMins}m)</Text>
              </View>
            )}
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
// AI PLAN CREATOR WIZARD COMPONENT
// ============================================

export interface AIPlanCreatorProps {
  visible: boolean;
  onClose: () => void;
  onPlanGenerated: (newTasks: any[]) => void;
  scaleFont: (base: number) => number;
  isTablet?: boolean;
}

export function AIPlanCreatorModal({
  visible,
  onClose,
  onPlanGenerated,
  scaleFont,
  isTablet,
}: AIPlanCreatorProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [goal, setGoal] = useState('');
  const [timeAvailable, setTimeAvailable] = useState('');
  const [constraints, setConstraints] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any[] | null>(null);

  const resetForm = () => {
    setStep(1);
    setGoal('');
    setTimeAvailable('');
    setConstraints('');
    setErrorMsg('');
    setIsGenerating(false);
    setGeneratedPlan(null);
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!goal.trim()) {
        setErrorMsg('Primary task or training goal is required.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!timeAvailable.trim()) {
        setErrorMsg('Available time is required.');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setErrorMsg('');

    setTimeout(() => {
      const parsedGoal = goal.trim() || 'High-Leverage Task';
      const rawTime = timeAvailable.trim().toLowerCase();
      const extraNotes = constraints.trim();

      // Time Parsing
      let isMultiDay = false;
      let totalMinutes = 120;
      let daysCount = 1;

      if (rawTime.includes('day') || rawTime.includes('d') || rawTime.includes('week') || rawTime.includes('wk')) {
        isMultiDay = true;
        const match = rawTime.match(/(\d+)\s*(day|d|week|wk)/);
        if (match) {
          const num = parseInt(match[1]) || 1;
          daysCount = match[2].startsWith('w') ? num * 7 : num;
        } else {
          daysCount = 2;
        }
      } else {
        const match = rawTime.match(/(\d+)/);
        if (match) {
          totalMinutes = rawTime.includes('hour') || rawTime.includes('hr') || rawTime.includes('h')
            ? parseInt(match[1]) * 60
            : parseInt(match[1]);
        }
        if (totalMinutes > 720) {
          isMultiDay = true;
          daysCount = Math.ceil(totalMinutes / 480);
        }
      }

      const ultradianCycles = isMultiDay ? daysCount * 3 : Math.max(1, Math.round(totalMinutes / 90));
      const hasKeto = extraNotes.toLowerCase().includes('keto') || extraNotes.toLowerCase().includes('fast');

      const fastingProtocol = hasKeto
        ? '18:6 Ketogenic Fasting Window'
        : '16:8 Intermittent Fasting (BDNF Elevation)';
      const macroStrategy = 'Low-GI Complex Fueling: 35g Protein + Healthy Fats (No Glucose Spike)';
      const neuroProtocol = 'Delayed Caffeine (90m Post-Wake) + L-Theanine 2:1 Ratio';

      const tasks: any[] = [];

      if (!isMultiDay) {
        const totalBlocks = Math.max(3, Math.min(6, Math.ceil(totalMinutes / 60)));
        const minsPerBlock = Math.round(totalMinutes / totalBlocks);

        for (let b = 0; b < totalBlocks; b++) {
          const startMin = b * minsPerBlock;
          const startHourNum = 8 + Math.floor(startMin / 60);
          const remMins = startMin % 60;
          const timeStr = (startHourNum < 10 ? '0' + startHourNum : startHourNum) + ':' + (remMins < 10 ? '0' + remMins : remMins);

          tasks.push({
            id: 'ai_task_' + Date.now() + '_' + b,
            title: 'Hour ' + (b + 1) + ': ' + (b === 0 ? 'Cortisol Activation & Priming' : b === 1 ? 'Execution & Catecholamine Peak' : 'Neural Reset & Integration') + ' - ' + parsedGoal,
            date: getLocalDateString(),
            time: timeStr,
            duration: minsPerBlock + ' min',
            isLocked: b === 1,
            completed: false,
            location: b === 0 ? 'Focus Hub' : 'Execution Station',
            focusNotes: b === 0
              ? 'Morning light exposure + 500mg Sodium hydration + 45-min deep focus sprint.'
              : 'Low-GI protein break-fast + 50-min high-density ultradian execution block.',
            adaptation: b === 0 ? 'Circadian Cortisol Anchor' : 'Ultradian Deep Work Peak',
            scienceNote: b === 0
              ? 'NEUROBIOLOGY: Capitalizes on morning Cortisol Awakening Response (CAR). 10,000 lux light sets circadian oscillator; sodium restores neuronal action potentials.'
              : 'PHYSIOLOGY: Epinephrine/norepinephrine peak. 35g protein supplies L-Tyrosine for dopamine synthesis without blood sugar crashes.',
            subtasks: [
              {
                id: 'st_' + b + '_1',
                title: '10-Min Sunlight Exposure & 500ml Electrolyte Hydration',
                scienceNote: 'Resets suprachiasmatic nucleus clock and boosts baseline dopamine.'
              },
              {
                id: 'st_' + b + '_2',
                title: '45-Min Zero-Distraction Focus Sprint',
                scienceNote: 'Avoids context switching; preserves prefrontal cortex working memory.'
              },
              {
                id: 'st_' + b + '_3',
                title: '5-Min Vagal Sigh Recovery (Double Inhale, Slow Exhale)',
                scienceNote: 'Triggers vagus nerve to slow heart rate and lower sympathetic overdrive.'
              }
            ]
          });
        }
      } else {
        for (let d = 1; d <= Math.min(5, daysCount); d++) {
          tasks.push({
            id: 'ai_task_' + Date.now() + '_d' + d,
            title: 'Day ' + d + ': ' + (d === 1 ? 'Architecture & Cortisol Alignment' : d === 2 ? 'High Velocity Execution' : 'Polishing & Deployment') + ' - ' + parsedGoal,
            date: getLocalDateString(),
            time: '08:00',
            duration: '1 Day',
            isLocked: false,
            completed: false,
            location: 'Master Workspace',
            focusNotes: 'Fasted ultradian focus blocks + strategic macro fueling for Day ' + d + '.',
            adaptation: 'Day ' + d + ' Neuro-Protocol',
            scienceNote: 'DAY ' + d + ' STRATEGY: Leverages sleep-dependent memory consolidation. Establishes dopamine momentum and closes open cognitive loops.',
            subtasks: [
              {
                id: 'std_' + d + '_1',
                title: '08:00 AM - Morning Sunlight & Fasted Focus Sprint',
                scienceNote: 'BDNF and norepinephrine elevated in 16:8 fasted state.'
              },
              {
                id: 'std_' + d + '_2',
                title: '11:30 AM - Low-GI High-Protein Re-Feed (35g Protein)',
                scienceNote: 'Restores amino acids and L-Tyrosine for sustained dopamine.'
              },
              {
                id: 'std_' + d + '_3',
                title: '02:00 PM - Refinement & Vagal Recovery',
                scienceNote: '15-min NSDR resets prefrontal cortex fatigue.'
              }
            ]
          });
        }
      }

      setGeneratedPlan({
        summary: {
          scheduleType: isMultiDay ? ('Multi-Day Blueprint (' + daysCount + ' Days)') : ('Hourly Protocol (' + totalMinutes + ' Mins)'),
          ultradianCycles,
          fastingProtocol,
          macroStrategy,
          neuroProtocol
        },
        tasks
      } as any);
      setIsGenerating(false);
      setStep(4);
    }, 800);
  };

  const handleDeploy = () => {
    if (generatedPlan) {
      const taskList = (generatedPlan as any).tasks || generatedPlan;
      onPlanGenerated(taskList);
      resetForm();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.aiPlanModalContent, isTablet && { maxWidth: 500, padding: 26 }]}>
          {/* Header */}
          <View style={styles.aiPlanHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#10b981" />
              <Text style={[styles.aiPlanTitle, { fontSize: scaleFont(15) }]}>AI PLAN CREATOR</Text>
            </View>
            <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressStep,
                  step >= s ? styles.progressStepActive : styles.progressStepInactive,
                ]}
              >
                <Text
                  style={[
                    styles.progressText,
                    step >= s ? styles.progressTextActive : styles.progressTextInactive,
                  ]}
                >
                  {s === 4 ? 'PLAN' : 'STEP ' + s}
                </Text>
              </View>
            ))}
          </View>

          {/* Step 1: Goal Specification */}
          {step === 1 && (
            <View style={styles.wizardStepContainer}>
              <Text style={styles.stepPromptLabel}>1. Primary Task / Goal Specification</Text>
              <Text style={styles.stepQuestion}>
                What is the specific task or training goal you need to complete?
              </Text>
              <TextInput
                style={styles.wizardTextInput}
                value={goal}
                onChangeText={setGoal}
                placeholder="e.g. 10km Tempo Run, Apex Tri Keto Meal Prep, Dev Sprint"
                placeholderTextColor="#64748b"
                multiline
              />
            </View>
          )}

          {/* Step 2: Time Availability */}
          {step === 2 && (
            <View style={styles.wizardStepContainer}>
              <Text style={styles.stepPromptLabel}>2. Time Availability</Text>
              <Text style={styles.stepQuestion}>
                How much total time (in minutes or hours) do you have available to complete this?
              </Text>
              <TextInput
                style={styles.wizardTextInputSingle}
                value={timeAvailable}
                onChangeText={setTimeAvailable}
                placeholder="e.g. 60 min, 90 min, 2 hours"
                placeholderTextColor="#64748b"
              />
            </View>
          )}

          {/* Step 3: Special Instructions & Constraints */}
          {step === 3 && (
            <View style={styles.wizardStepContainer}>
              <Text style={styles.stepPromptLabel}>3. Special Instructions & Constraints</Text>
              <Text style={styles.stepQuestion}>
                Are there any special instructions, dietary preferences, or physical constraints?
              </Text>
              <TextInput
                style={styles.wizardTextInputArea}
                value={constraints}
                onChangeText={setConstraints}
                placeholder="e.g., Joint protection, low-impact only, fasting window, Zone 2 heart rate target"
                placeholderTextColor="#64748b"
                multiline
              />
            </View>
          )}

          {/* Step 4: Generated Plan Review */}
          {step === 4 && generatedPlan && (
            <ScrollView style={{ maxHeight: 290 }} contentContainerStyle={{ gap: 10 }}>
              {(generatedPlan as any).summary && (
                <View style={[styles.planBanner, { flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color="#34d399" />
                    <Text style={styles.planBannerTitle}>{(generatedPlan as any).summary.scheduleType}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 15 }}>
                    🧪 {(generatedPlan as any).summary.fastingProtocol} • {(generatedPlan as any).summary.ultradianCycles} Ultradian Cycles
                  </Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                    ⚡ {(generatedPlan as any).summary.neuroProtocol}
                  </Text>
                </View>
              )}

              {(((generatedPlan as any).tasks || generatedPlan) as any[]).map((pTask: any) => (
                <View key={pTask.id} style={styles.planCardItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.planCardTitle}>{pTask.title}</Text>
                    <Text style={styles.planCardDuration}>{pTask.duration}</Text>
                  </View>
                  <Text style={styles.planCardNotes}>{pTask.focusNotes}</Text>

                  {pTask.scienceNote && (
                    <Text style={{ fontSize: 10, color: '#a5b4fc', marginTop: 4, fontStyle: 'italic' }}>
                      🔬 Science: {pTask.scienceNote}
                    </Text>
                  )}

                  {pTask.subtasks && pTask.subtasks.length > 0 && (
                    <View style={{ marginTop: 6, gap: 4, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: '#10b981' }}>
                      {pTask.subtasks.map((st: any, sIdx: number) => (
                        <View key={sIdx}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#e2e8f0' }}>• {st.title}</Text>
                          <Text style={{ fontSize: 9, color: '#64748b' }}>  └ {st.scienceNote}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.planCardBadge}>
                    <Text style={styles.planCardBadgeText}>Adaptation: {pTask.adaptation}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Error Message */}
          {errorMsg !== '' && (
            <Text style={styles.wizardErrorText}>{errorMsg}</Text>
          )}

          {/* Footer Actions */}
          <View style={styles.wizardFooter}>
            {step > 1 && step < 4 && (
              <TouchableOpacity style={styles.wizardBackBtn} onPress={handleBack}>
                <ChevronLeft size={16} color="#94a3b8" />
                <Text style={styles.wizardBackBtnText}>BACK</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.wizardCancelBtn} onPress={() => { resetForm(); onClose(); }}>
              <Text style={styles.wizardCancelBtnText}>CANCEL</Text>
            </TouchableOpacity>

            {step < 3 && (
              <TouchableOpacity style={styles.wizardNextBtn} onPress={handleNext}>
                <Text style={styles.wizardNextBtnText}>NEXT</Text>
                <ChevronRight size={16} color="#ffffff" />
              </TouchableOpacity>
            )}

            {step === 3 && (
              <TouchableOpacity style={styles.wizardSubmitBtn} onPress={handleGenerate} disabled={isGenerating}>
                <Sparkles size={14} color="#ffffff" />
                <Text style={styles.wizardSubmitBtnText}>
                  {isGenerating ? 'GENERATING...' : 'GENERATE PLAN'}
                </Text>
              </TouchableOpacity>
            )}

            {step === 4 && (
              <TouchableOpacity style={styles.wizardDeployBtn} onPress={handleDeploy}>
                <Check size={16} color="#ffffff" />
                <Text style={styles.wizardDeployBtnText}>DEPLOY TO WORKSPACE</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// COMMON UTILS
// ============================================

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function parseDurationToMinutes(durationStr: string | number): number {
  if (!durationStr && durationStr !== 0) return 15;
  if (typeof durationStr === 'number') return isNaN(durationStr) ? 15 : Math.floor(durationStr);
  const normalized = String(durationStr).toLowerCase();
  let totalMinutes = 0;
  try {
    const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(h|hour|hr)/);
    if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60;
    const minMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(m|min)/);
    if (minMatch) totalMinutes += parseFloat(minMatch[1]);
    if (totalMinutes === 0 && !isNaN(parseFloat(normalized))) totalMinutes = parseFloat(normalized);
  } catch { return 15; }
  return Math.floor(Number(totalMinutes)) || 15;
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
  dragPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312e81',
    borderColor: '#818cf8',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  dragPreviewBadgeText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  travelRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  travelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  travelBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  travelBlockOverlay: {
    position: 'absolute',
    left: 76,
    right: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
    zIndex: 0,
  },
  travelBlockText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 48,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
    marginRight: -2,
  },
  currentTimeLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#f43f5e',
    opacity: 0.8,
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
  },

  // AI Plan Creator Wizard Styles
  aiPlanModalContent: {
    width: '90%',
    maxWidth: 460,
    backgroundColor: '#0c1322',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  aiPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 16,
  },
  aiPlanTitle: {
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 1,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  progressStep: {
    flex: 1,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressStepActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  progressStepInactive: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  progressText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  progressTextActive: {
    color: '#34d399',
  },
  progressTextInactive: {
    color: '#475569',
  },
  wizardStepContainer: {
    marginBottom: 16,
  },
  stepPromptLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  stepQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
    lineHeight: 18,
  },
  wizardTextInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  wizardTextInputSingle: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    height: 48,
  },
  wizardTextInputArea: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  wizardErrorText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
  },
  wizardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  wizardBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  wizardBackBtnText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
  },
  wizardCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wizardCancelBtnText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
  },
  wizardNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10b981',
    gap: 4,
  },
  wizardNextBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  wizardSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#059669',
    gap: 6,
  },
  wizardSubmitBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  wizardDeployBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10b981',
    gap: 6,
  },
  wizardDeployBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 8,
  },
  planBannerTitle: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 12,
  },
  planCardItem: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  planCardTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  planCardDuration: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '900',
  },
  planCardNotes: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  planCardBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planCardBadgeText: {
    color: '#818cf8',
    fontSize: 9,
    fontWeight: '800',
  }
});
`;
