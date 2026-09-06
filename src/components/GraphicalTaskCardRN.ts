/**
 * GraphicalTaskCardRN.ts
 * 
 * Mobile Focus Page Component in React Native (TypeScript & StyleSheet.create)
 * Replicating the multi-card layout seen in the Focus Page design specifications.
 * 
 * CORE DATA CONSOLIDATION:
 * This component consumes the canonical data sources used across the app:
 * 1. Collaborators: Sourced from canonical 'task_collaborators_v1' and task.collaborator / attendees.
 * 2. Locations: Sourced from canonical 'taskpass_favorite_locations_v1' and task.location.
 * Any update directly reflects across both visual and text-only modes without duplicate data paths.
 */

export const graphicalTaskCardRNCode = `import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ============================================================================
// Types & Canonical Data Structures
// ============================================================================

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface GraphicalTaskCardRNProps {
  // Task Core
  id?: string;
  title: string;
  priority?: 'high' | 'medium' | 'normal' | 'low';
  durationMinutes?: number;
  isCompleted?: boolean;
  
  // Canonical Data: Collaborators
  // Unified with text mode (source: task_collaborators_v1)
  collaborator?: string;
  allCollaborators?: string[];
  onSelectCollaborator?: (collaboratorName: string) => void;
  onAddCollaborator?: (collaboratorName: string) => void;

  // Subtasks with dynamic interaction
  subtasks?: SubtaskItem[];
  onToggleSubtask?: (subtaskId: string) => void;
  onAddSubtask?: (title: string) => void;

  // Canonical Data: Locations
  // Unified with text mode (source: taskpass_favorite_locations_v1)
  location?: string;
  favoriteLocations?: string[];
  onSelectLocation?: (location: string) => void;
  onAddFavoriteLocation?: (location: string) => void;

  // Duration adjustments
  onUpdateDuration?: (minutes: number) => void;

  // Primary Actions
  onToggleComplete?: () => void;
  onDeleteTask?: () => void;
  onEditTask?: () => void;
  onAddTask?: () => void;
  onBrainstorm?: () => void;
  onRoutine?: () => void;
  onNotesAndAI?: () => void;
  onNavigateTab?: (tabName: 'TASKPASS' | 'TASKS' | 'FOCUS' | 'TIMELINE') => void;
}

const { width } = Dimensions.get('window');

// ============================================================================
// Main React Native Component
// ============================================================================

export const GraphicalTaskCardRN: React.FC<GraphicalTaskCardRNProps> = ({
  title = 'See Odyssey Movie',
  priority = 'normal',
  durationMinutes = 240,
  isCompleted = false,
  
  // Canonical Collaborators
  collaborator = '',
  allCollaborators = ['Sarah', 'Alex', 'Mom', 'John'],
  onSelectCollaborator,
  onAddCollaborator,

  // Subtasks
  subtasks: initialSubtasks = [
    { id: 'st1', title: 'Buy tickets on IMAX app', completed: true },
    { id: 'st2', title: 'Reserve seats in row F', completed: false },
    { id: 'st3', title: 'Check showtime confirmation', completed: false },
  ],
  onToggleSubtask,
  onAddSubtask,

  // Canonical Locations
  location = 'Emagine Novi',
  favoriteLocations = ['Office HQ', 'State Library', 'Powerhouse Gym', 'Emagine Novi', 'Philz Coffee'],
  onSelectLocation,
  onAddFavoriteLocation,

  // Duration controls
  onUpdateDuration,

  // Actions
  onToggleComplete,
  onDeleteTask,
  onEditTask,
  onAddTask,
  onBrainstorm,
  onRoutine,
  onNotesAndAI,
  onNavigateTab,
}) => {
  // --------------------------------------------------------------------------
  // 1. Duration State & Stepper
  // --------------------------------------------------------------------------
  const [currentDuration, setCurrentDuration] = useState<number>(durationMinutes);
  
  useEffect(() => {
    setCurrentDuration(durationMinutes);
  }, [durationMinutes]);

  const handleStepDuration = (delta: number) => {
    const nextVal = Math.max(5, currentDuration + delta);
    setCurrentDuration(nextVal);
    if (onUpdateDuration) {
      onUpdateDuration(nextVal);
    }
  };

  // --------------------------------------------------------------------------
  // 2. Subtasks State & Dynamic Counting
  // --------------------------------------------------------------------------
  const [localSubtasks, setLocalSubtasks] = useState<SubtaskItem[]>(initialSubtasks);
  const [showAllSubtasks, setShowAllSubtasks] = useState<boolean>(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState<boolean>(false);

  useEffect(() => {
    setLocalSubtasks(initialSubtasks);
  }, [initialSubtasks]);

  const completedCount = useMemo(() => {
    return localSubtasks.filter((s) => s.completed).length;
  }, [localSubtasks]);

  const totalCount = localSubtasks.length;

  const handleToggleSubtask = (subtaskId: string) => {
    if (onToggleSubtask) {
      onToggleSubtask(subtaskId);
    } else {
      setLocalSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s))
      );
    }
  };

  const handleApplyPreset = (presetName: string) => {
    let newItems: SubtaskItem[] = [];
    if (presetName === 'Planning') {
      newItems = [
        { id: \`st_\${Date.now()}_1\`, title: 'Define scope and goals', completed: false },
        { id: \`st_\${Date.now()}_2\`, title: 'List materials and resources', completed: false },
        { id: \`st_\${Date.now()}_3\`, title: 'Verify schedule & time', completed: false },
      ];
    } else if (presetName === 'Execution') {
      newItems = [
        { id: \`st_\${Date.now()}_1\`, title: 'Initial setup & launch', completed: false },
        { id: \`st_\${Date.now()}_2\`, title: 'Core milestone execution', completed: false },
        { id: \`st_\${Date.now()}_3\`, title: 'Quality check & verification', completed: false },
      ];
    }
    setLocalSubtasks((prev) => [...prev, ...newItems]);
    setShowPresetsMenu(false);
  };

  // --------------------------------------------------------------------------
  // 3. Canonical Collaborator Selection
  // --------------------------------------------------------------------------
  const [showCollabPicker, setShowCollabPicker] = useState<boolean>(false);
  const [newCollabInput, setNewCollabInput] = useState<string>('');

  const handlePickCollaborator = (name: string) => {
    if (onSelectCollaborator) {
      onSelectCollaborator(name);
    }
    setShowCollabPicker(false);
  };

  const handleAddNewCollaborator = () => {
    const trimmed = newCollabInput.trim();
    if (trimmed) {
      if (onAddCollaborator) {
        onAddCollaborator(trimmed);
      }
      if (onSelectCollaborator) {
        onSelectCollaborator(trimmed);
      }
      setNewCollabInput('');
      setShowCollabPicker(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. Canonical Location Selection
  // --------------------------------------------------------------------------
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [newLocationInput, setNewLocationInput] = useState<string>('');

  const handlePickLocation = (loc: string) => {
    if (onSelectLocation) {
      onSelectLocation(loc);
    }
    setShowLocationPicker(false);
  };

  const handleAddNewLocation = () => {
    const trimmed = newLocationInput.trim();
    if (trimmed) {
      if (onAddFavoriteLocation) {
        onAddFavoriteLocation(trimmed);
      }
      if (onSelectLocation) {
        onSelectLocation(trimmed);
      }
      setNewLocationInput('');
      setShowLocationPicker(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. SVG Ring Geometry for Duration
  // --------------------------------------------------------------------------
  const ringSize = 82;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Visual fill representation (approx 75% sweep)
  const strokeDashoffset = circumference * 0.25;

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP HEADER ROW: Priority Pull-down & Profile Avatar */}
        <View style={styles.topHeaderRow}>
          <TouchableOpacity style={styles.priorityPill} activeOpacity={0.8}>
            <Text style={styles.priorityPillText}>PRIORITY: {priority.toUpperCase()}</Text>
            <Text style={styles.priorityChevron}>▾</Text>
          </TouchableOpacity>

          <View style={styles.avatarPlaceholderCircle}>
            <Text style={styles.avatarPlaceholderInitials}>👤</Text>
          </View>
        </View>

        {/* TASK TITLE ROW: Large Checkbox Circle & Bold Serif Heading */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={[styles.checkboxCircle, isCompleted && styles.checkboxCircleCompleted]}
            onPress={onToggleComplete}
            activeOpacity={0.7}
          >
            {isCompleted ? <Text style={styles.checkmarkIcon}>✓</Text> : null}
          </TouchableOpacity>
          <Text style={[styles.taskTitleText, isCompleted && styles.taskTitleCompleted]}>
            {title}
          </Text>
        </View>

        {/* ROW 1: DURATION CARD (LEFT) & COLLABORATOR CARD (RIGHT) */}
        <View style={styles.rowTwoCols}>
          {/* Card 1: DURATION */}
          <View style={[styles.cardBase, styles.durationCard]}>
            <Text style={styles.cardHeaderTitle}>DURATION</Text>

            {/* Circular Progress Ring */}
            <View style={styles.ringCenterContainer}>
              <Svg width={ringSize} height={ringSize}>
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="#E5DCB8"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="#2D6A4F"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={\`\${ringSize / 2}, \${ringSize / 2}\`}
                />
              </Svg>
              <View style={styles.ringCenterTextWrapper}>
                <Text style={styles.ringCenterDurationText}>{currentDuration}m</Text>
              </View>
            </View>

            {/* Bottom Row: Label and Stepper */}
            <View style={styles.durationFooterRow}>
              <Text style={styles.durationSessionSubtitle}>
                {currentDuration} min session
              </Text>
              <View style={styles.stepperPill}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleStepDuration(-5)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepperSymbol}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>5m</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleStepDuration(5)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepperSymbol}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card 2: COLLABORATOR */}
          <TouchableOpacity
            style={[styles.cardBase, styles.collaboratorCard]}
            onPress={() => setShowCollabPicker(true)}
            activeOpacity={0.9}
          >
            <View style={styles.collabTopHeader}>
              <View style={styles.collabAvatarIconCircle}>
                <Text style={styles.collabAvatarIcon}>👥</Text>
              </View>
              <TouchableOpacity
                style={styles.assignPillBtn}
                onPress={() => setShowCollabPicker(true)}
              >
                <Text style={styles.assignPillText}>
                  {collaborator ? 'CHANGE' : 'ASSIGN'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.collabBody}>
              <Text style={styles.cardHeaderTitle}>COLLABORATOR</Text>
              {collaborator ? (
                <>
                  <Text style={styles.collabAssignedName} numberOfLines={1}>
                    {collaborator}
                  </Text>
                  <Text style={styles.collabTapHint}>(TAP TO CHANGE)</Text>
                </>
              ) : (
                <>
                  <Text style={styles.collabUnassignedText}>No Collaborator Assigned</Text>
                  <Text style={styles.collabTapHint}>(TAP TO ASSIGN)</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ROW 2: SUBTASKS FULL-WIDTH CARD */}
        <View style={[styles.cardBase, styles.subtasksCard]}>
          {/* Header Row: Title with count badge & Presets dropdown */}
          <View style={styles.subtasksHeaderRow}>
            <View style={styles.subtasksTitleBadgeGroup}>
              <Text style={styles.cardHeaderTitle}>SUBTASKS</Text>
              <View style={styles.countPillBadge}>
                <Text style={styles.countPillText}>
                  {completedCount}/{totalCount}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.presetsPillBtn}
              onPress={() => setShowPresetsMenu(!showPresetsMenu)}
              activeOpacity={0.8}
            >
              <Text style={styles.presetsPillText}>PRESETS</Text>
              <Text style={styles.presetsChevron}>▾</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.completedSubtitleText}>
            {completedCount}/{totalCount} completed
          </Text>

          {/* Subtask Checkboxes */}
          <View style={styles.subtaskListContainer}>
            {localSubtasks
              .slice(0, showAllSubtasks ? localSubtasks.length : 2)
              .map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.subtaskItemRow}
                  onPress={() => handleToggleSubtask(item.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.subtaskCheckbox,
                      item.completed && styles.subtaskCheckboxCompleted,
                    ]}
                  >
                    {item.completed ? (
                      <Text style={styles.subtaskCheckmarkText}>✓</Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.subtaskTitleText,
                      item.completed && styles.subtaskTitleCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}

            {/* View More / Expand Toggle */}
            {localSubtasks.length > 2 && (
              <TouchableOpacity
                onPress={() => setShowAllSubtasks(!showAllSubtasks)}
                style={styles.viewMoreBtn}
              >
                <Text style={styles.viewMoreText}>
                  {showAllSubtasks
                    ? '▲ Hide extra subtasks'
                    : \`+\${localSubtasks.length - 2} more (tap to view)\`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Presets Pull-down Drawer */}
          {showPresetsMenu && (
            <View style={styles.presetsDropdownWrapper}>
              <Text style={styles.dropdownHeading}>APPLY SUBTASK PRESET</Text>
              <TouchableOpacity
                style={styles.presetOptionBtn}
                onPress={() => handleApplyPreset('Planning')}
              >
                <Text style={styles.presetOptionTitle}>• Planning & Discovery (3 steps)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetOptionBtn}
                onPress={() => handleApplyPreset('Execution')}
              >
                <Text style={styles.presetOptionTitle}>• Execution & Verification (3 steps)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ROW 3: LOCATION FULL-WIDTH CARD */}
        <TouchableOpacity
          style={[styles.cardBase, styles.locationCard]}
          onPress={() => setShowLocationPicker(true)}
          activeOpacity={0.95}
        >
          {/* Top Overlays */}
          <View style={styles.locationOverlayTop}>
            <View style={styles.locationBadge}>
              <Text style={styles.locationBadgeText}>LOCATION</Text>
            </View>
            <TouchableOpacity
              style={styles.locationEditPill}
              onPress={() => setShowLocationPicker(true)}
            >
              <Text style={styles.locationEditText}>EDIT</Text>
              <Text style={styles.locationEditChevron}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* Styled Map Canvas / Pin Simulation */}
          <View style={styles.mapCanvasSimulation}>
            <View style={styles.mapPinContainer}>
              <Text style={styles.mapPinIcon}>📍</Text>
              <View style={styles.mapPinCallout}>
                <Text style={styles.mapPinCalloutText} numberOfLines={1}>
                  {location || 'Add location...'}
                </Text>
              </View>
            </View>
            {/* Google Watermark Simulation */}
            <Text style={styles.googleWatermark}>Google</Text>
          </View>
        </TouchableOpacity>

        {/* ROW 4: 2x2 ACTION CARDS (ADD TASK, BRAINSTORM, ROUTINE, NOTES & AI) */}
        <View style={styles.actionGridContainer}>
          {/* Card 1: ADD TASK (Deep emerald green) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardAddTask]}
            onPress={onAddTask}
            activeOpacity={0.85}
          >
            <View style={styles.actionCardTopRow}>
              <View style={styles.actionIconCircleGreen}>
                <Text style={styles.actionIconWhitePlus}>+</Text>
              </View>
              <View style={styles.actionDropdownPillGreen}>
                <Text style={styles.actionDropdownTextGreen}>Templates ▾</Text>
              </View>
            </View>
            <Text style={styles.actionCardTitleWhite}>ADD TASK</Text>
            <Text style={styles.actionCardSubtitleGreen}>New schedule item</Text>
          </TouchableOpacity>

          {/* Card 2: BRAINSTORM (Warm cream) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardCream]}
            onPress={onBrainstorm}
            activeOpacity={0.85}
          >
            <View style={styles.actionCardTopRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#EDE9FE' }]}>
                <Text style={styles.actionEmojiIcon}>🧠</Text>
              </View>
              <View style={styles.actionDropdownPill}>
                <Text style={styles.actionDropdownText}>Modes ▾</Text>
              </View>
            </View>
            <Text style={styles.actionCardTitleDark}>BRAINSTORM</Text>
            <Text style={styles.actionCardSubtitleMuted}>Multi-item entry</Text>
          </TouchableOpacity>

          {/* Card 3: ROUTINE (Warm cream) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardCream]}
            onPress={onRoutine}
            activeOpacity={0.85}
          >
            <View style={styles.actionCardTopRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.actionEmojiIcon}>☕</Text>
              </View>
              <View style={styles.actionDropdownPill}>
                <Text style={styles.actionDropdownText}>Presets ▾</Text>
              </View>
            </View>
            <Text style={styles.actionCardTitleDark}>ROUTINE</Text>
            <Text style={styles.actionCardSubtitleMuted}>Preset sequences</Text>
          </TouchableOpacity>

          {/* Card 4: NOTES & AI (Warm cream) */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardCream]}
            onPress={onNotesAndAI}
            activeOpacity={0.85}
          >
            <View style={styles.actionCardTopRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.actionEmojiIcon}>📄</Text>
              </View>
              <View style={styles.actionDropdownPill}>
                <Text style={styles.actionDropdownText}>Templates ▾</Text>
              </View>
            </View>
            <Text style={styles.actionCardTitleDark}>NOTES & AI</Text>
            <Text style={styles.actionCardSubtitleMuted}>Capture thoughts</Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM ACTION BAR: ✓ COMPLETED, TRASH, EDIT */}
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.completedLargeBtn}
            onPress={onToggleComplete}
            activeOpacity={0.85}
          >
            <Text style={styles.completedLargeBtnText}>✓ COMPLETED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconRoundBtnPink}
            onPress={onDeleteTask}
            activeOpacity={0.8}
          >
            <Text style={styles.trashIconText}>🗑️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconRoundBtnCream}
            onPress={onEditTask}
            activeOpacity={0.8}
          >
            <Text style={styles.editIconText}>✏️</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BOTTOM TAB NAVIGATION BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => onNavigateTab && onNavigateTab('TASKPASS')}
        >
          <Text style={styles.tabBarLabel}>TASKPASS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => onNavigateTab && onNavigateTab('TASKS')}
        >
          <Text style={styles.tabBarLabel}>TASKS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBarItem, styles.tabBarActiveFocusPill]}>
          <Text style={styles.tabBarActiveFocusText}>FOCUS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => onNavigateTab && onNavigateTab('TIMELINE')}
        >
          <Text style={styles.tabBarLabel}>TIMELINE</Text>
        </TouchableOpacity>
      </View>

      {/* CANONICAL COLLABORATOR PICKER MODAL */}
      {showCollabPicker && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Select Collaborator</Text>
              <TouchableOpacity onPress={() => setShowCollabPicker(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubheadingText}>
              Canonical Collaborators ({allCollaborators.length})
            </Text>

            <ScrollView style={styles.modalListScroll}>
              <TouchableOpacity
                style={styles.modalListItem}
                onPress={() => handlePickCollaborator('')}
              >
                <Text style={styles.modalListItemText}>None (Unassign)</Text>
              </TouchableOpacity>
              {allCollaborators.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.modalListItem,
                    collaborator === c && styles.modalListItemActive,
                  ]}
                  onPress={() => handlePickCollaborator(c)}
                >
                  <Text
                    style={[
                      styles.modalListItemText,
                      collaborator === c && styles.modalListItemTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                  {collaborator === c ? <Text style={styles.modalCheckmark}>✓</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quick Add Custom Collaborator */}
            <View style={styles.modalAddRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="Add new collaborator..."
                placeholderTextColor="#9CA3AF"
                value={newCollabInput}
                onChangeText={setNewCollabInput}
              />
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={handleAddNewCollaborator}
              >
                <Text style={styles.modalAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* CANONICAL LOCATION PICKER MODAL */}
      {showLocationPicker && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubheadingText}>
              Canonical Saved Locations ({favoriteLocations.length})
            </Text>

            <ScrollView style={styles.modalListScroll}>
              {favoriteLocations.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.modalListItem,
                    location === loc && styles.modalListItemActive,
                  ]}
                  onPress={() => handlePickLocation(loc)}
                >
                  <Text
                    style={[
                      styles.modalListItemText,
                      location === loc && styles.modalListItemTextActive,
                    ]}
                  >
                    📍 {loc}
                  </Text>
                  {location === loc ? <Text style={styles.modalCheckmark}>✓</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Quick Add Custom Location */}
            <View style={styles.modalAddRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter custom location..."
                placeholderTextColor="#9CA3AF"
                value={newLocationInput}
                onChangeText={setNewLocationInput}
              />
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={handleAddNewLocation}
              >
                <Text style={styles.modalAddBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// Styles (Sheet Matching image.jpeg)
// ============================================================================

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FAF5EB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 24,
  },

  // Top Header Row
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#EADDC7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#594B3E',
    letterSpacing: 0.5,
  },
  priorityChevron: {
    fontSize: 10,
    color: '#594B3E',
    marginLeft: 4,
  },
  avatarPlaceholderCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EADDC7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderInitials: {
    fontSize: 14,
  },

  // Task Title Row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  checkboxCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#A25F37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5EB',
  },
  checkboxCircleCompleted: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  taskTitleText: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#1F1A16',
    letterSpacing: -0.5,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8C7A6B',
  },

  // Reusable Card Base
  cardBase: {
    backgroundColor: '#F4EEDF',
    borderWidth: 1,
    borderColor: '#EADDC7',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#3D312A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1F1A16',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Two-Columns Layout (Duration + Collaborator)
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  durationCard: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  ringCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  ringCenterTextWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterDurationText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F1A16',
  },
  durationFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  durationSessionSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A6B5C',
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#EADDC7',
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  stepperBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stepperSymbol: {
    fontSize: 12,
    fontWeight: '900',
    color: '#594B3E',
  },
  stepperValue: {
    fontSize: 10,
    fontWeight: '900',
    color: '#594B3E',
    marginHorizontal: 2,
  },

  // Collaborator Card
  collaboratorCard: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  collabTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collabAvatarIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EADDC7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collabAvatarIcon: {
    fontSize: 13,
  },
  assignPillBtn: {
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#EADDC7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  assignPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#594B3E',
    letterSpacing: 0.5,
  },
  collabBody: {
    marginTop: 8,
  },
  collabAssignedName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1F1A16',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  collabUnassignedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F1A16',
    marginTop: 4,
  },
  collabTapHint: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#7A6B5C',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Subtasks Card
  subtasksCard: {
    marginBottom: 12,
  },
  subtasksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtasksTitleBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countPillBadge: {
    backgroundColor: '#EADDC7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#594B3E',
  },
  presetsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#EADDC7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  presetsPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#594B3E',
    letterSpacing: 0.5,
  },
  presetsChevron: {
    fontSize: 9,
    color: '#594B3E',
    marginLeft: 3,
  },
  completedSubtitleText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7A6B5C',
    marginTop: 3,
    marginBottom: 8,
  },
  subtaskListContainer: {
    gap: 8,
  },
  subtaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskCheckbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#C4B4A0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskCheckboxCompleted: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  subtaskCheckmarkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  subtaskTitleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F1A16',
  },
  subtaskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8C7A6B',
  },
  viewMoreBtn: {
    paddingTop: 4,
  },
  viewMoreText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2D6A4F',
  },
  presetsDropdownWrapper: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EADDC7',
    gap: 6,
  },
  dropdownHeading: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7A6B5C',
    letterSpacing: 0.5,
  },
  presetOptionBtn: {
    paddingVertical: 4,
  },
  presetOptionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F1A16',
  },

  // Location Card
  locationCard: {
    padding: 0,
    overflow: 'hidden',
    height: 130,
    position: 'relative',
    marginBottom: 12,
  },
  locationOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  locationBadge: {
    backgroundColor: 'rgba(250, 243, 224, 0.95)',
    borderWidth: 1,
    borderColor: '#EADDC7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  locationBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#1F1A16',
    letterSpacing: 0.8,
  },
  locationEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 243, 224, 0.95)',
    borderWidth: 1,
    borderColor: '#EADDC7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  locationEditText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#594B3E',
    letterSpacing: 0.5,
  },
  locationEditChevron: {
    fontSize: 9,
    color: '#594B3E',
    marginLeft: 3,
  },
  mapCanvasSimulation: {
    flex: 1,
    backgroundColor: '#E8DFD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinContainer: {
    alignItems: 'center',
  },
  mapPinIcon: {
    fontSize: 26,
  },
  mapPinCallout: {
    backgroundColor: 'rgba(250, 243, 224, 0.9)',
    borderWidth: 1,
    borderColor: '#EADDC7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  mapPinCalloutText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1F1A16',
  },
  googleWatermark: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(60, 50, 40, 0.4)',
  },

  // 2x2 Action Cards Grid
  actionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    width: (width - 42) / 2,
    borderRadius: 16,
    padding: 10,
    minHeight: 72,
    maxHeight: 76,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  actionCardAddTask: {
    backgroundColor: '#2D6A4F',
    borderColor: '#245841',
  },
  actionCardCream: {
    backgroundColor: '#F4EEDF',
    borderColor: '#EADDC7',
  },
  actionCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  actionIconCircleGreen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWhitePlus: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  actionDropdownPillGreen: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  actionDropdownTextGreen: {
    color: '#E8F5E9',
    fontSize: 8.5,
    fontWeight: '800',
  },
  actionCardTitleWhite: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  actionCardSubtitleGreen: {
    fontSize: 9,
    color: '#B7D5C5',
    marginTop: 1,
  },
  actionIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmojiIcon: {
    fontSize: 11,
  },
  actionDropdownPill: {
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#EADDC7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  actionDropdownText: {
    color: '#7A6B5C',
    fontSize: 8.5,
    fontWeight: '800',
  },
  actionCardTitleDark: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1F1A16',
    letterSpacing: 0.6,
  },
  actionCardSubtitleMuted: {
    fontSize: 9,
    color: '#7A6B5C',
    marginTop: 1,
  },

  // Bottom Action Bar
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  completedLargeBtn: {
    flex: 1,
    backgroundColor: '#2D6A4F',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  completedLargeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  iconRoundBtnPink: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEECEB',
    borderWidth: 1,
    borderColor: '#F5C2C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIconText: {
    fontSize: 16,
  },
  iconRoundBtnCream: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4EEDF',
    borderWidth: 1,
    borderColor: '#EADDC7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconText: {
    fontSize: 16,
  },

  // Bottom Tab Navigation Bar
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FAF5EB',
    borderTopWidth: 1,
    borderTopColor: '#EADDC7',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tabBarItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7A6B5C',
    letterSpacing: 0.8,
  },
  tabBarActiveFocusPill: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 16,
  },
  tabBarActiveFocusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  // Modal Styles
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF2DF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EADDC7',
    padding: 16,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1F1A16',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#7A6B5C',
    padding: 4,
  },
  modalSubheadingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7A6B5C',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  modalListScroll: {
    maxHeight: 200,
    marginBottom: 12,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#EADDC7',
    marginBottom: 6,
  },
  modalListItemActive: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  modalListItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F1A16',
  },
  modalListItemTextActive: {
    color: '#FFFFFF',
  },
  modalCheckmark: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  modalAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInput: {
    flex: 1,
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: '#C4B4A0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1F1A16',
  },
  modalAddBtn: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
});

export default GraphicalTaskCardRN;
`;
