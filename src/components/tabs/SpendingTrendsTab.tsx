import React from 'react';
import { TrendingUp, Layers, Store, DollarSign, ArrowUpRight, ArrowDownRight, Calendar, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export interface SpendingTrendsTabProps {
  spendings: any[];
  spendingCategories: string[];
  spendingVendors: string[];
  trendViewType: 'category' | 'vendor';
  setTrendViewType: (val: 'category' | 'vendor') => void;
  triggerHaptic: (type: string) => void;
  isDark: boolean;
  handleSyncAllExpensesToGCal?: () => void;
  gcalStatusMsg?: string | null;
}

export const SpendingTrendsTab: React.FC<SpendingTrendsTabProps> = ({
  spendings,
  spendingCategories,
  spendingVendors,
  trendViewType,
  setTrendViewType,
  triggerHaptic,
  isDark,
  handleSyncAllExpensesToGCal,
  gcalStatusMsg
}) => {
    // Helper to get month key (YYYY-MM)
    const getYearMonth = (dateStr: string) => {
      if (!dateStr || dateStr.length < 7) return "Unknown";
      return dateStr.substring(0, 7);
    };

    const formatYearMonth = (ymStr: string) => {
      if (!ymStr || ymStr === "Unknown") return ymStr;
      const [year, month] = ymStr.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIndex = parseInt(month, 10) - 1;
      if (mIndex >= 0 && mIndex < 12) {
        return `${monthNames[mIndex]} ${year}`;
      }
      return ymStr;
    };

    // Calculate unique months sorted chronologically
    const uniqueMonths = Array.from(new Set(spendings.map(s => getYearMonth(s.date))))
      .filter(m => m !== "Unknown")
      .sort();

    // Compute line chart data
    const chartData = uniqueMonths.map(mKey => {
      const monthSpendings = spendings.filter(s => getYearMonth(s.date) === mKey);
      const dataPoint: any = {
        monthKey: mKey,
        monthDisplay: formatYearMonth(mKey),
        Total: Number(monthSpendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0).toFixed(2))
      };

      if (trendViewType === "category") {
        spendingCategories.forEach(cat => {
          const amount = monthSpendings
            .filter(s => s.category === cat)
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          dataPoint[cat] = Number(amount.toFixed(2));
        });
      } else {
        spendingVendors.forEach(v => {
          const amount = monthSpendings
            .filter(s => s.vendor === v)
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          dataPoint[v] = Number(amount.toFixed(2));
        });
      }

      return dataPoint;
    });

    // Active lines (only those that have spending in any month, to avoid legend clutter)
    const activeKeys = trendViewType === "category" 
      ? spendingCategories.filter(cat => spendings.some(s => s.category === cat))
      : spendingVendors.filter(v => spendings.some(s => s.vendor === v));

    const totalAllTime = spendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const averageMonthly = uniqueMonths.length > 0 ? (totalAllTime / uniqueMonths.length) : 0;

    // Find top spending category/vendor of all time
    let topEntityName = "None";
    let topEntityAmount = 0;
    const entityTotals: Record<string, number> = {};
    spendings.forEach(s => {
      const key = trendViewType === "category" ? s.category : s.vendor;
      entityTotals[key] = (entityTotals[key] || 0) + (Number(s.amount) || 0);
    });
    Object.entries(entityTotals).forEach(([name, amt]) => {
      if (amt > topEntityAmount) {
        topEntityAmount = amt;
        topEntityName = name;
      }
    });

    const colors = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#14b8a6", "#22c55e", "#a855f7", "#3b82f6", "#eab308"];

    return (
      <div className="space-y-6 text-left">
        {/* Header Summary & Google Calendar Sync */}
        <div className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Monthly Spending Trends</h3>
            <p className="text-[10px] text-slate-455 uppercase tracking-widest font-mono">Analyze categories and vendors over time</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Type Toggle */}
            <div className={`p-0.5 rounded-xl border flex items-center ${isDark ? "bg-slate-950 border-white/5" : "bg-slate-100 border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setTrendViewType("category")}
                className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  trendViewType === "category"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-250"
                }`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setTrendViewType("vendor")}
                className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  trendViewType === "vendor"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-250"
                }`}
              >
                By Vendor
              </button>
            </div>

            {/* Google Sync button for Expenses */}
            <button
              type="button"
              onClick={handleSyncAllExpensesToGCal}
              className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              title="Sync expenses with Google Calendar"
            >
              <RefreshCw size={11} className={gcalStatusMsg?.includes("Syncing") ? "animate-spin" : ""} />
              <span>Google Calendar Sync</span>
            </button>
          </div>
        </div>

        {/* High Level Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-3xl border ${isDark ? "bg-slate-900/15 border-white/5" : "bg-white border-slate-200 shadow-2xs"}`}>
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">All-Time Spending</span>
            <div className="text-xl font-black text-white mt-1 font-mono">${totalAllTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-[8.5px] text-slate-500 mt-1 uppercase tracking-widest font-mono">Over {uniqueMonths.length || 1} months</p>
          </div>
          <div className={`p-4 rounded-3xl border ${isDark ? "bg-slate-900/15 border-white/5" : "bg-white border-slate-200 shadow-2xs"}`}>
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Average Monthly Burn</span>
            <div className="text-xl font-black text-indigo-400 mt-1 font-mono">${averageMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-[8.5px] text-slate-500 mt-1 uppercase tracking-widest font-mono">Calculated average</p>
          </div>
          <div className={`p-4 rounded-3xl border ${isDark ? "bg-slate-900/15 border-white/5" : "bg-white border-slate-200 shadow-2xs"}`}>
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Top {trendViewType === "category" ? "Category" : "Vendor"}</span>
            <div className="text-xl font-black text-rose-400 mt-1 truncate">{topEntityName}</div>
            <p className="text-[8.5px] text-slate-500 mt-1 uppercase tracking-widest font-mono">Spent: ${topEntityAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Recharts Line Chart for spending trends */}
        <div className={`p-5 rounded-3xl border ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className="mb-4">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Monthly Spending Curve</h4>
            <p className="text-[8.5px] text-slate-550 uppercase tracking-widest font-mono">Continuous spend vector graph</p>
          </div>

          {uniqueMonths.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 font-mono uppercase">
              Add spending entries to render the trends graph.
            </div>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff08" : "#00000008"} />
                  <XAxis 
                    dataKey="monthDisplay" 
                    stroke={isDark ? "#ffffff35" : "#00000035"} 
                    style={{ fontSize: "9px", fontFamily: "monospace" }} 
                  />
                  <YAxis 
                    stroke={isDark ? "#ffffff35" : "#00000035"} 
                    style={{ fontSize: "9px", fontFamily: "monospace" }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? "#020617" : "#ffffff", 
                      borderRadius: "12px", 
                      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
                      fontSize: "10.5px"
                    }}
                    labelStyle={{ fontWeight: "bold", color: "#6366f1", marginBottom: "4px" }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: "9.5px", marginTop: "10px" }} 
                  />
                  
                  {/* Highlighted Total spending line */}
                  <Line 
                    type="monotone" 
                    dataKey="Total" 
                    stroke="#818cf8" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />

                  {/* Individual categories / vendors lines */}
                  {activeKeys.map((key, idx) => (
                    <Line 
                      key={key} 
                      type="monotone" 
                      dataKey={key} 
                      stroke={colors[idx % colors.length]} 
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Month by Month Breakdown Table */}
        <div className={`p-5 rounded-3xl border overflow-hidden ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className="mb-4">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Monthly Breakdown Log</h4>
            <p className="text-[8.5px] text-slate-550 uppercase tracking-widest font-mono">Detailed financial values grid</p>
          </div>

          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono uppercase">
              No breakdown logs available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Total Spent</th>
                    {activeKeys.slice(0, 4).map(key => (
                      <th key={key} className="py-2.5 px-3">{key}</th>
                    ))}
                    {activeKeys.length > 4 && (
                      <th className="py-2.5 px-3">Other Keys</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice().reverse().map(data => {
                    // Sum up the rest of active keys if more than 4
                    let otherSum = 0;
                    if (activeKeys.length > 4) {
                      activeKeys.slice(4).forEach(k => {
                        otherSum += data[k] || 0;
                      });
                    }

                    return (
                      <tr key={data.monthKey} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors text-xs font-medium">
                        <td className="py-2.5 px-3 font-bold text-white">{data.monthDisplay}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">${data.Total.toFixed(2)}</td>
                        {activeKeys.slice(0, 4).map(key => (
                          <td key={key} className="py-2.5 px-3 font-mono text-slate-300">
                            {data[key] ? `$${data[key].toFixed(2)}` : "-"}
                          </td>
                        ))}
                        {activeKeys.length > 4 && (
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {otherSum > 0 ? `$${otherSum.toFixed(2)}` : "-"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

export default SpendingTrendsTab;
