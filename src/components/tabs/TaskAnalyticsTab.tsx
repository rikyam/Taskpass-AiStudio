import React from 'react';
import { Task } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

export interface TaskAnalyticsTabProps {
  tasks: Task[];
  categories: string[];
  isDark: boolean;
}

export const TaskAnalyticsTab: React.FC<TaskAnalyticsTabProps> = ({
  tasks,
  categories,
  isDark
}) => {
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className={`p-2.5 rounded-xl border text-xs font-mono shadow-lg ${isDark ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <p className="font-bold mb-1 text-indigo-400">{label}</p>
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}: <strong>{entry.value}</strong></span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };
    // Aggregate tasks by Category and Priority
    const allCats = Array.from(new Set([
      ...categories,
      ...tasks.map(t => t.category?.trim()).filter(Boolean) as string[]
    ])).sort();

    const chartData = allCats.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      return {
        category: cat,
        High: catTasks.filter(t => t.priority === "high").length,
        Medium: catTasks.filter(t => t.priority === "medium").length,
        Low: catTasks.filter(t => t.priority === "low").length,
        None: catTasks.filter(t => !t.priority || t.priority === "none").length,
        total: catTasks.length
      };
    });

    // Also handle uncategorized tasks
    const uncategorizedTasks = tasks.filter(t => !t.category);
    if (uncategorizedTasks.length > 0) {
      chartData.push({
        category: "Uncategorized",
        High: uncategorizedTasks.filter(t => t.priority === "high").length,
        Medium: uncategorizedTasks.filter(t => t.priority === "medium").length,
        Low: uncategorizedTasks.filter(t => t.priority === "low").length,
        None: uncategorizedTasks.filter(t => !t.priority || t.priority === "none").length,
        total: uncategorizedTasks.length
      });
    }

    // Aggregate by priority for a summary Pie Chart
    const highCount = tasks.filter(t => t.priority === "high").length;
    const mediumCount = tasks.filter(t => t.priority === "medium").length;
    const lowCount = tasks.filter(t => t.priority === "low").length;
    const noneCount = tasks.filter(t => !t.priority || t.priority === "none").length;

    const priorityPieData = [
      { name: "High", value: highCount, color: "#f43f5e" },
      { name: "Medium", value: mediumCount, color: "#f59e0b" },
      { name: "Low", value: lowCount, color: "#10b981" },
      { name: "None", value: noneCount, color: "#64748b" }
    ].filter(p => p.value > 0);

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Active Tasks</p>
            <p className="text-3xl font-black text-indigo-400 mt-1">{tasks.filter(t => !t.completed).length}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">High Priority</p>
            <p className="text-3xl font-black text-rose-550 mt-1">{highCount}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Medium Priority</p>
            <p className="text-3xl font-black text-amber-500 mt-1">{mediumCount}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Completed Tasks</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">{tasks.filter(t => t.completed).length}</p>
          </div>
        </div>

        {/* Recharts Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Category & Priority Bar Chart */}
          <div className={`col-span-1 lg:col-span-2 p-5 rounded-3xl border flex flex-col ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="mb-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Tasks by Category & Priority</h3>
              <p className="text-[9px] text-slate-450 uppercase tracking-widest font-mono">Distribution Matrix</p>
            </div>
            <div className="w-full h-80 min-h-[300px] text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff10" : "#00000010"} vertical={false} />
                  <XAxis dataKey="category" stroke={isDark ? "#94a3b8" : "#475569"} tickLine={false} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#475569"} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "#ffffff05" : "#00000005" }} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="High" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Medium" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Low" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="None" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Pie Chart */}
          <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Priority Composition</h3>
              <p className="text-[9px] text-slate-450 uppercase tracking-widest font-mono">Composition breakdown</p>
            </div>
            {priorityPieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono py-12 uppercase">
                No tasks to analyze
              </div>
            ) : (
              <div className="relative w-full h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {priorityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-indigo-400">{tasks.length}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-black">Total Tasks</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2 text-left">
              {priorityPieData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate opacity-75">{item.name}:</span>
                  <span className="font-black">{item.value} ({Math.round(item.value / tasks.length * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

export default TaskAnalyticsTab;
