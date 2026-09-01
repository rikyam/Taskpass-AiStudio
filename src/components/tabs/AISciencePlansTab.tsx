import React from 'react';
import { Brain, Search, Plus, Sparkles, Zap, Edit3, Download, FileCode, Trash2, ChevronUp, ChevronDown, Check, RotateCcw, Utensils } from 'lucide-react';
import { getLocalDateString } from '../InteractiveAppHelpers';

export interface AISciencePlansTabProps {
  savedAiPlans: any[];
  planSearchQuery: string;
  setPlanSearchQuery: (val: string) => void;
  setAiPlanStep: (step: number) => void;
  setAiPlanGoal: (val: string) => void;
  setAiPlanTime: (val: string) => void;
  setAiPlanConstraints: (val: string) => void;
  setAiPlanError: (val: string) => void;
  setAiPlanResult: (val: any) => void;
  setShowAIPlanCreatorModal: (open: boolean) => void;
  getSampleAIPlans: () => any[];
  saveAiPlansToStore: (plans: any[]) => void;
  expandedPlanId: string | null;
  setExpandedPlanId: (id: string | null) => void;
  setTasks?: React.Dispatch<React.SetStateAction<any[]>>;
  showDragToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
  triggerHaptic: (type: string) => void;
  setEditingPlan: (plan: any) => void;
  setShowEditPlanModal: (open: boolean) => void;
  exportAIPlanPDF: (plan: any) => void;
  exportBackupJSON: (data: any, filename: string) => void;
  setDeletingPlanId: (id: string | null) => void;
  isDark?: boolean;
}

export const AISciencePlansTab: React.FC<AISciencePlansTabProps> = ({
  savedAiPlans,
  planSearchQuery,
  setPlanSearchQuery,
  setAiPlanStep,
  setAiPlanGoal,
  setAiPlanTime,
  setAiPlanConstraints,
  setAiPlanError,
  setAiPlanResult,
  setShowAIPlanCreatorModal,
  getSampleAIPlans,
  saveAiPlansToStore,
  expandedPlanId,
  setExpandedPlanId,
  setTasks,
  showDragToast,
  triggerHaptic,
  setEditingPlan,
  setShowEditPlanModal,
  exportAIPlanPDF,
  exportBackupJSON,
  setDeletingPlanId,
  isDark = false
}) => {
    const filteredPlans = savedAiPlans.filter(p => {
      if (!planSearchQuery.trim()) return true;
      const q = planSearchQuery.toLowerCase();
      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.goal || "").toLowerCase().includes(q) ||
        (p.constraints || "").toLowerCase().includes(q) ||
        (p.result?.summary?.scheduleType || "").toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-5 text-left">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                AI Science Plan Repository & Vault
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Save, edit, download as PDF, and deploy science-backed neuro-cognitive master plans.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search saved plans..."
                value={planSearchQuery}
                onChange={(e) => setPlanSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-950/80 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              {planSearchQuery && (
                <button
                  onClick={() => setPlanSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setAiPlanStep(1);
                setAiPlanGoal("");
                setAiPlanTime("");
                setAiPlanConstraints("");
                setAiPlanError("");
                setAiPlanResult(null);
                setShowAIPlanCreatorModal(true);
                triggerHaptic("light");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40 shrink-0"
            >
              <Sparkles size={13} />
              <span>Generate New Plan</span>
            </button>
          </div>
        </div>

        {/* Saved Plans List */}
        {savedAiPlans.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3 bg-slate-950/30">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Brain size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                No Science Plans Saved Yet
              </h4>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Generate your first custom neuro-cognitive protocol with ultradian focus blocks, fasting windows, and caffeine/macronutrient strategies.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setAiPlanStep(1);
                  setShowAIPlanCreatorModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Sparkles size={14} />
                <span>Create AI Plan Now</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const samples = getSampleAIPlans();
                  saveAiPlansToStore(samples);
                  triggerHaptic("success");
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Load Sample Plans</span>
              </button>
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-6 rounded-2xl border border-white/5 text-center text-xs text-slate-400">
            No saved plans matching "{planSearchQuery}".
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map((plan) => {
              const isExpanded = expandedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isDark ? "bg-slate-900/80 border-white/10" : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-100">{plan.title || "Science AI Plan"}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {plan.result?.summary?.scheduleType || "Science Plan"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-1 font-medium">
                          🎯 Goal: {plan.goal}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (plan.result?.tasks) {
                              const todayStr = getLocalDateString();
                              const newTasksList = plan.result.tasks.map((p, idx) => ({
                                id: `plan_task_${Date.now()}_${idx}`,
                                title: p.title,
                                date: todayStr,
                                time: p.time,
                                duration: p.duration,
                                collaborator: "Neuro Co-Pilot",
                                location: p.location || "Workspace",
                                notes: `[SCIENCE & NEUROBIOLOGY]\n${p.scienceNote}\n\n[PHYSIOLOGY & FUELING]\n${plan.result.summary.macronutrientStrategy}\nFasting: ${plan.result.summary.fastingProtocol}`,
                                category: "AI Plan",
                                completed: false,
                                isLocked: false,
                                subtasks: (p.subtasks || []).map((st) => ({
                                  id: st.id,
                                  title: `${st.title} — [Science: ${st.scienceNote}]`,
                                  completed: false
                                }))
                              }));
                              if (setTasks) {
                                setTasks((prev: any) => [...prev, ...newTasksList]);
                              }
                              triggerHaptic("success");
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                          title="Deploy all tasks in this plan to active workspace"
                        >
                          <Check size={12} />
                          <span className="hidden xs:inline">Deploy</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlan(JSON.parse(JSON.stringify(plan)));
                            setShowEditPlanModal(true);
                            triggerHaptic("light");
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs cursor-pointer transition-colors"
                          title="Edit Plan"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            exportAIPlanPDF(plan);
                            triggerHaptic("success");
                          }}
                          className="p-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs cursor-pointer transition-colors"
                          title="Download PDF Report"
                        >
                          <Download size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            exportBackupJSON(plan, `${(plan.title || "AI_Plan").replace(/[^a-z0-9]/gi, '_')}_ai_plan.json`);
                          }}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-white/10 text-xs cursor-pointer transition-colors"
                          title="Download JSON File"
                        >
                          <FileCode size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingPlanId(plan.id);
                          }}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs cursor-pointer transition-colors"
                          title="Delete Plan"
                        >
                          <Trash2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs cursor-pointer transition-colors ml-1"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Protocol Quick Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px]">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center gap-1.5">
                        <Utensils size={12} className="text-amber-400 shrink-0" />
                        <span className="text-slate-300 truncate">{plan.result?.summary?.fastingProtocol || "Standard Fasting"}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center gap-1.5">
                        <Zap size={12} className="text-cyan-400 shrink-0" />
                        <span className="text-slate-300 truncate">{plan.result?.summary?.neuroProtocol || "Standard Neuro Protocol"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Plan Details */}
                  {isExpanded && (
                    <div className="p-3.5 border-t border-white/10 bg-slate-950/50 space-y-3">
                      <p className="text-[11px] text-slate-300 leading-relaxed italic bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20">
                        🔬 {plan.result?.summary?.scienceOverview}
                      </p>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Step-by-Step Execution Plan ({plan.result?.tasks?.length || 0} Steps)
                        </span>

                        {plan.result?.tasks?.map((t, tIdx) => (
                          <div key={tIdx} className="p-2.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                              <span>{t.title}</span>
                              <span className="text-emerald-400 font-mono text-[11px]">{t.time} ({t.duration})</span>
                            </div>

                            <p className="text-[10px] text-indigo-300 leading-snug">
                              🧠 {t.scienceNote}
                            </p>

                            {t.subtasks && t.subtasks.length > 0 && (
                              <div className="pl-3 border-l-2 border-emerald-500/40 space-y-1 pt-1">
                                {t.subtasks.map((st, sIdx) => (
                                  <div key={sIdx} className="text-[10px]">
                                    <span className="font-bold text-slate-200">• {st.title}</span>
                                    <p className="text-[9.5px] text-slate-400 italic pl-3">
                                      Note: {st.scienceNote}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

export default AISciencePlansTab;
