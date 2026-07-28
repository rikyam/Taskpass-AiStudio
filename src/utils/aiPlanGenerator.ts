import { getLocalDateString } from "./timeHelpers";

export interface ScienceSubtask {
  id: string;
  title: string;
  scienceNote: string;
  completed: boolean;
}

export interface ScienceTask {
  id: string;
  title: string;
  time: string;
  duration: string;
  focusNotes: string;
  scienceNote: string;
  subtasks: ScienceSubtask[];
  adaptation: string;
  location: string;
}

export interface AIPlanSummary {
  scheduleType: string;
  totalDurationStr: string;
  ultradianCycles: number;
  fastingProtocol: string;
  macronutrientStrategy: string;
  neuroProtocol: string;
  scienceOverview: string;
}

export interface AIPlanGeneratedResult {
  summary: AIPlanSummary;
  tasks: ScienceTask[];
}

export function generateComprehensiveAIPlan(
  goal: string,
  timeInput: string,
  constraints: string
): AIPlanGeneratedResult {
  const parsedGoal = goal.trim() || "High-Leverage Execution";
  const rawTime = timeInput.trim().toLowerCase();
  const extraNotes = constraints.trim();

  // 1. Analyze Time Input (Hourly vs Multi-Day)
  let isMultiDay = false;
  let totalMinutes = 120;
  let daysCount = 1;

  if (
    rawTime.includes("day") ||
    rawTime.includes("d ") ||
    rawTime.endsWith("d") ||
    rawTime.includes("week") ||
    rawTime.includes("wk")
  ) {
    isMultiDay = true;
    const match = rawTime.match(/(\d+)\s*(day|d|week|wk)/);
    if (match) {
      const num = parseInt(match[1]) || 1;
      if (match[2].startsWith("w")) {
        daysCount = num * 7;
      } else {
        daysCount = num;
      }
    } else {
      daysCount = 2;
    }
  } else {
    if (rawTime.includes("hour") || rawTime.includes("hr") || rawTime.includes("h")) {
      const match = rawTime.match(/(\d+(\.\d+)?)\s*(hour|hr|h)/);
      if (match) {
        const hrs = parseFloat(match[1]) || 2;
        totalMinutes = Math.round(hrs * 60);
      } else {
        totalMinutes = 240;
      }
    } else {
      const match = rawTime.match(/(\d+)/);
      if (match) {
        totalMinutes = parseInt(match[1]) || 90;
      } else {
        totalMinutes = 120;
      }
    }
    if (totalMinutes > 720) {
      isMultiDay = true;
      daysCount = Math.ceil(totalMinutes / 480);
    }
  }

  // 2. Health, Diet & Neurobiology Preferences
  const lowerConstraints = extraNotes.toLowerCase();
  const hasKeto = lowerConstraints.includes("keto") || lowerConstraints.includes("fast");
  const hasCaffeineFree = lowerConstraints.includes("no caffeine") || lowerConstraints.includes("caffeine free");

  const fastingProtocol = hasKeto
    ? "18:6 Ketogenic Fasting Window (BHB Ketone Substrate Utilization)"
    : "16:8 Intermittent Fasting (Cortisol-Gated Autophagy & BDNF Elevation)";

  const macronutrientStrategy = hasKeto
    ? "High-Fat / Mod-Protein (70% Healthy Fats, 25% Protein, <5% Net Carbs) for steady neuronal ketone energy"
    : "Low-GI Complex Fueling: 35g+ Protein, Omega-3 Fatty Acids, Avocado/MCTs, Zero Simple Sugars";

  const neuroProtocol = hasCaffeineFree
    ? "Cold-Water Face Immersion + Physiological Sighs (Adenosine Clearance without Caffeine)"
    : "Delayed Caffeine Protocol (90m Post-Wake + L-Theanine 2:1 Ratio for Smooth Prefrontal Focus)";

  const ultradianCycles = isMultiDay ? daysCount * 3 : Math.max(1, Math.round(totalMinutes / 90));

  const summary: AIPlanSummary = {
    scheduleType: isMultiDay
      ? `Multi-Day Master Blueprint (${daysCount} Days)`
      : `Hourly Ultradian Protocol (${Math.round((totalMinutes / 60) * 10) / 10} Hours)`,
    totalDurationStr: isMultiDay ? `${daysCount} Days` : `${totalMinutes} Minutes`,
    ultradianCycles,
    fastingProtocol,
    macronutrientStrategy,
    neuroProtocol,
    scienceOverview: `Analyzed ${isMultiDay ? daysCount + " days" : totalMinutes + " minutes"} time window for '${parsedGoal}'. Structured into ${ultradianCycles} 90-min ultradian cognitive cycles aligned with circadian cortisol response, dopamine baseline management, and glycemic stabilization.`
  };

  const tasks: ScienceTask[] = [];

  if (!isMultiDay) {
    // Generate Step-by-Step Hourly Intra-Day Plan
    const totalBlocks = Math.max(3, Math.min(8, Math.ceil(totalMinutes / 60)));
    const minsPerBlock = Math.round(totalMinutes / totalBlocks);

    for (let b = 0; b < totalBlocks; b++) {
      const startMin = b * minsPerBlock;
      const startHourNum = 8 + Math.floor(startMin / 60);
      const remMins = startMin % 60;
      const timeStr = `${startHourNum < 10 ? "0" + startHourNum : startHourNum}:${remMins < 10 ? "0" + remMins : remMins}`;

      if (b === 0) {
        tasks.push({
          id: `ai_task_${Date.now()}_${b}`,
          title: `Hour 1: Cortisol Priming & High-Leverage Focus Block - ${parsedGoal}`,
          time: timeStr,
          duration: `${minsPerBlock} min`,
          focusNotes: "Circadian light exposure, electrolyte hydration, and initial 90-min ultradian focus peak.",
          scienceNote: "NEUROBIOLOGY: Capitalizes on peak morning cortisol awakening response (CAR) and high baseline dopamine. Prefrontal cortex working memory is unburdened by decision fatigue. Fasted state maintains high BDNF (Brain-Derived Neurotrophic Factor) and norepinephrine.",
          location: "Primary Focus Hub",
          adaptation: "Circadian Light Anchor + Fasted Deep Focus",
          subtasks: [
            {
              id: `st_1_1_${Date.now()}`,
              title: "10-Min Bright Sunlight Exposure (10,000+ Lux) & 500ml Electrolyte Water",
              scienceNote: "Photons stimulate retinal ganglion cells to signal the suprachiasmatic nucleus (SCN), setting the master clock and boosting cortisol. 500mg Sodium restores Na+/K+ ATPase neuronal action potential firing.",
              completed: false
            },
            {
              id: `st_1_2_${Date.now()}`,
              title: "Define Single Micro-Deliverable & Clear Visual Field",
              scienceNote: "Eliminating visual field clutter reduces visual cortex distractibility and conserves working memory in the prefrontal cortex.",
              completed: false
            },
            {
              id: `st_1_3_${Date.now()}`,
              title: "45-Min Zero-Distraction Deep Focus Sprint 1",
              scienceNote: "Ultradian focus cycle initiation. Zero context switching prevents 'attentional residue' that degrades cognitive throughput by up to 40%.",
              completed: false
            },
            {
              id: `st_1_4_${Date.now()}`,
              title: "5-Min Vagal Sigh Recovery (Double Inhale, Slow Exhale)",
              scienceNote: "Triggers vagus nerve slowing of heart rate (respiratory sinus arrhythmia), rapidly reducing sympathetic overdrive.",
              completed: false
            }
          ]
        });
      } else if (b === 1) {
        tasks.push({
          id: `ai_task_${Date.now()}_${b}`,
          title: `Hour 2: Execution Engine & Catecholamine Peak - ${parsedGoal}`,
          time: timeStr,
          duration: `${minsPerBlock} min`,
          focusNotes: "Core task execution with strategic caffeine + L-theanine buffer and glycemic balance.",
          scienceNote: "PHYSIOLOGY: Norepinephrine and epinephrine peak during intense problem solving. Introducing low-GI macronutrients (35g protein + healthy fats) prevents insulin spikes and postprandial somnolence (food coma).",
          location: "Deep Work Hub",
          adaptation: "Caffeine/Theanine Synergy + Low-GI Fuel",
          subtasks: [
            {
              id: `st_2_1_${Date.now()}`,
              title: hasCaffeineFree
                ? "Cold-Water Face Immersion (Mammalian Dive Reflex)"
                : "Caffeine (100mg) + L-Theanine (200mg) Protocol",
              scienceNote: hasCaffeineFree
                ? "Activates trigeminal nerve to slow heart rate and boost alertness naturally."
                : "L-Theanine increases alpha brain waves (8-12Hz) for calm alertness while caffeine blocks adenosine A1/A2A receptors.",
              completed: false
            },
            {
              id: `st_2_2_${Date.now()}`,
              title: "50-Min High-Density Execution Sprint 2",
              scienceNote: "Second ultradian phase. Striatal dopamine reinforces task progress via intrinsic effort-reward pathways.",
              completed: false
            },
            {
              id: `st_2_3_${Date.now()}`,
              title: "Low-GI Nutrient Meal / Break-Fast (35g Protein + Fats)",
              scienceNote: "Proteins supply L-Tyrosine (dopamine precursor) and essential amino acids without spiking blood glucose.",
              completed: false
            }
          ]
        });
      } else if (b === 2) {
        tasks.push({
          id: `ai_task_${Date.now()}_${b}`,
          title: `Hour 3: Neural Reset & Iterative Synthesis - ${parsedGoal}`,
          time: timeStr,
          duration: `${minsPerBlock} min`,
          focusNotes: "10-15 min Non-Sleep Deep Rest (NSDR) reset followed by iterative synthesis.",
          scienceNote: "NEUROBIOLOGY: After 180 mins of cognitive output, prefrontal glucose and acetylcholine reserves deplete. A 15-minute NSDR / Yoga Nidra protocol restores striatal dopamine reserves by 65% and enhances memory consolidation.",
          location: "Recovery & Synthesis Hub",
          adaptation: "NSDR Vagal Reset + Memory Consolidation",
          subtasks: [
            {
              id: `st_3_1_${Date.now()}`,
              title: "15-Min NSDR / Guided Vagal Reset Protocol",
              scienceNote: "Puts brain into theta wave state (4-8Hz), accelerating synaptic plasticity and resetting cognitive fatigue.",
              completed: false
            },
            {
              id: `st_3_2_${Date.now()}`,
              title: "40-Min Iterative Quality & Sub-task Refinement",
              scienceNote: "Refreshed prefrontal cortex evaluates edge cases, code quality, or structural accuracy with restored error-detection precision.",
              completed: false
            },
            {
              id: `st_3_3_${Date.now()}`,
              title: "5-Min Panoramic Optic Flow Walk",
              scienceNote: "Unfocused visual gaze disengages the amygdala threat-detection circuit and relaxes ciliary eye muscles.",
              completed: false
            }
          ]
        });
      } else {
        tasks.push({
          id: `ai_task_${Date.now()}_${b}`,
          title: `Hour ${b + 1}: Final Integration & Deployment - ${parsedGoal}`,
          time: timeStr,
          duration: `${minsPerBlock} min`,
          focusNotes: "Verification, deployment to production/workspace, and cognitive offloading.",
          scienceNote: "PRODUCTIVITY SCIENCE: Closing open loops offloads working memory to prevent the Zeigarnik effect (intrusive thoughts about unfinished tasks). Dopamine completion reward consolidates motor/cognitive neural pathways.",
          location: "Deployment Station",
          adaptation: "Zeigarnik Loop Closure + Dopamine Completion",
          subtasks: [
            {
              id: `st_4_1_${Date.now()}`,
              title: "Final Verification against Initial Parameters",
              scienceNote: "Systematic checklist verification triggers dopamine completion spikes that solidify learning.",
              completed: false
            },
            {
              id: `st_4_2_${Date.now()}`,
              title: "Deploy Deliverable to Workspace & Log Outcomes",
              scienceNote: "Externalizing completion status signals prefrontal cortex that the active goal state is closed.",
              completed: false
            },
            {
              id: `st_4_3_${Date.now()}`,
              title: "Nutrient & Hydration Re-feed (Magnesium + Water)",
              scienceNote: "Magnesium glycinate supports parasympathetic nervous system recovery and cellular ATP synthesis.",
              completed: false
            }
          ]
        });
      }
    }
  } else {
    // Generate Step-by-Step Multi-Day Blueprint
    for (let d = 1; d <= Math.min(7, daysCount); d++) {
      if (d === 1) {
        tasks.push({
          id: `ai_task_${Date.now()}_d${d}`,
          title: `Day 1: Architecture, Fasted Focus & Cortisol Anchor - ${parsedGoal}`,
          time: "08:00",
          duration: "1 Day",
          focusNotes: "Fasted morning ultradian cycle, foundational setup, and high-leverage decision making.",
          scienceNote: `DAY 1 NEURO-STRATEGY: Establishes baseline neural momentum for '${parsedGoal}'. Capitalizes on initial motivation spikes (elevated baseline dopamine) and circadian light anchoring.`,
          location: "Strategic Command",
          adaptation: "Circadian Light Anchor + Core Architecture",
          subtasks: [
            {
              id: `std_1_1_${Date.now()}`,
              title: "08:00 AM - Circadian Light Exposure & 500ml Electrolyte Water",
              scienceNote: "10,000 lux sunlight triggers cortisol awakening response and sets SCN master clock.",
              completed: false
            },
            {
              id: `std_1_2_${Date.now()}`,
              title: "08:30 AM - 90-Min Ultradian Block 1: Architecture & Scope",
              scienceNote: "Prefrontal cortex at maximum capacity. Fasted state elevates BDNF and mental clarity.",
              completed: false
            },
            {
              id: `std_1_3_${Date.now()}`,
              title: "11:00 AM - Low-GI High-Protein Break-Fast (35g Protein)",
              scienceNote: "Supplies L-Tyrosine for dopamine synthesis without blood sugar volatile swings.",
              completed: false
            },
            {
              id: `std_1_4_${Date.now()}`,
              title: "02:00 PM - 90-Min Ultradian Block 2: Deep Build Sprint",
              scienceNote: "Execution phase backed by caffeine + L-theanine buffer and strategic hydration.",
              completed: false
            }
          ]
        });
      } else if (d === 2) {
        tasks.push({
          id: `ai_task_${Date.now()}_d${d}`,
          title: `Day 2: Execution Engine, Glycogen Re-feed & Subtask Velocity - ${parsedGoal}`,
          time: "08:00",
          duration: "1 Day",
          focusNotes: "Deep execution density, complex problem solving, and targeted glycogen replenishment.",
          scienceNote: `DAY 2 NEURO-STRATEGY: Leverages sleep-dependent memory consolidation from Night 1. Motor and cognitive circuits are primed for higher execution velocity.`,
          location: "Execution Engine",
          adaptation: "Sleep Consolidation Gain + High Velocity Build",
          subtasks: [
            {
              id: `std_2_1_${Date.now()}`,
              title: "08:00 AM - Fasted Deep Sprint: Core Implementation",
              scienceNote: "Highest difficulty tasks tackled first when neural energy is fresh.",
              completed: false
            },
            {
              id: `std_2_2_${Date.now()}`,
              title: "11:30 AM - Strategic Carb Backloading (Complex Carbs + Leucine)",
              scienceNote: "Replenishes muscle & liver glycogen to fuel afternoon cognitive endurance.",
              completed: false
            },
            {
              id: `std_2_3_${Date.now()}`,
              title: "01:30 PM - Refinement & Cross-Validation Sprint",
              scienceNote: "Systematic testing and edge case resolution with restored prefrontal error detection.",
              completed: false
            }
          ]
        });
      } else {
        tasks.push({
          id: `ai_task_${Date.now()}_d${d}`,
          title: `Day ${d}: Polishing, Deployment & Vagal Recovery - ${parsedGoal}`,
          time: "08:00",
          duration: "1 Day",
          focusNotes: "Final integration, automated checks, deployment, and parasympathetic recovery.",
          scienceNote: `DAY ${d} NEURO-STRATEGY: Closing all open loops. Transitioning from intense sympathetic focus to parasympathetic recovery ensures long-term neuroplastic retention and prevents burnout.`,
          location: "Deployment Station",
          adaptation: "Zeigarnik Closure + Parasympathetic Reset",
          subtasks: [
            {
              id: `std_${d}_1_${Date.now()}`,
              title: "09:00 AM - Final Integration & Quality Assurance",
              scienceNote: "Verifies deliverables against initial specification with zero open defects.",
              completed: false
            },
            {
              id: `std_${d}_2_${Date.now()}`,
              title: "11:00 AM - Deploy to Production / Workspace",
              scienceNote: "Triggers final dopamine reward pathway, reinforcing self-efficacy and goal completion.",
              completed: false
            },
            {
              id: `std_${d}_3_${Date.now()}`,
              title: "02:00 PM - Retrospective, Vagal Recovery & Magnesium Supplementation",
              scienceNote: "Active recovery and magnesium glycinate support sleep architecture and neural restoration.",
              completed: false
            }
          ]
        });
      }
    }
  }

  return { summary, tasks };
}
