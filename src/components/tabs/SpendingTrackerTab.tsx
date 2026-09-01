import React, { useState, useRef } from 'react';
import { Camera, ChevronDown, ChevronRight, Sparkles, Plus, Trash, DollarSign } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { FastInput } from '../FastInput';
import SpendingTrendsTab from './SpendingTrendsTab';

export interface SpendingTrackerTabProps {
  spendings: any[];
  spendingFilterCategory: string;
  setSpendingFilterCategory: (cat: string) => void;
  spendingFilterVendor: string;
  setSpendingFilterVendor: (vendor: string) => void;
  spendingFilterDateMode: 'all' | 'week' | 'month' | 'range';
  setSpendingFilterDateMode: (mode: 'all' | 'week' | 'month' | 'range') => void;
  spendingFilterStartDate: string;
  setSpendingFilterStartDate: (date: string) => void;
  spendingFilterEndDate: string;
  setSpendingFilterEndDate: (date: string) => void;
  spendingCategories: string[];
  spendingVendors: string[];
  spendingAmount: string;
  setSpendingAmount: (amt: string) => void;
  spendingVendor: string;
  setSpendingVendor: (vendor: string) => void;
  spendingCategory: string;
  setSpendingCategory: (cat: string) => void;
  spendingDate: string;
  setSpendingDate: (date: string) => void;
  spendingNotes: string;
  setSpendingNotes: (notes: string) => void;
  spendingReceipt: string | null;
  setSpendingReceipt: (receipt: string | null) => void;
  saveSpendings: (spendings: any[]) => void;
  triggerHaptic: (type: string) => void;
  spendingViewSubTab: 'log' | 'analytics' | 'trends';
  setSpendingViewSubTab: (tab: 'log' | 'analytics' | 'trends') => void;
  spendingQuickFilterPeriod: 'all' | 'week' | 'month' | 'custom';
  setSpendingQuickFilterPeriod: (period: 'all' | 'week' | 'month' | 'custom') => void;
  setShowSpendingCategoryManagerModal: (show: boolean) => void;
  setShowSpendingVendorManagerModal: (show: boolean) => void;
  setShowAiAutofillModal: (show: boolean) => void;
  trendViewType: 'category' | 'vendor';
  setTrendViewType: (val: 'category' | 'vendor') => void;
  isDark: boolean;
}

export const SpendingTrackerTab: React.FC<SpendingTrackerTabProps> = ({
  spendings,
  spendingFilterCategory,
  setSpendingFilterCategory,
  spendingFilterVendor,
  setSpendingFilterVendor,
  spendingFilterDateMode,
  setSpendingFilterDateMode,
  spendingFilterStartDate,
  setSpendingFilterStartDate,
  spendingFilterEndDate,
  setSpendingFilterEndDate,
  spendingCategories,
  spendingVendors,
  spendingAmount,
  setSpendingAmount,
  spendingVendor,
  setSpendingVendor,
  spendingCategory,
  setSpendingCategory,
  spendingDate,
  setSpendingDate,
  spendingNotes,
  setSpendingNotes,
  spendingReceipt,
  setSpendingReceipt,
  saveSpendings,
  triggerHaptic,
  spendingViewSubTab,
  setSpendingViewSubTab,
  spendingQuickFilterPeriod,
  setSpendingQuickFilterPeriod,
  setShowSpendingCategoryManagerModal,
  setShowSpendingVendorManagerModal,
  setShowAiAutofillModal,
  trendViewType,
  setTrendViewType,
  isDark
}) => {

  const [aiParsedReceipt, setAiParsedReceipt] = useState<any>(null);
  const [showManageSpendingVendors, setShowManageSpendingVendors] = useState<boolean>(false);
  const [showManageSpendingCategories, setShowManageSpendingCategories] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);
  const [spendingActiveTab, setSpendingActiveTab] = useState<string>('all');
  const [ledgerGroupBy, setLedgerGroupBy] = useState<string>('none');
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Record<string, boolean>>({});
  const [activeReceiptPreview, setActiveReceiptPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      triggerHaptic("light");
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      alert("Could not access the camera. Please upload an image file instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    triggerHaptic("light");
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setSpendingReceipt(dataUrl);
        stopCamera();
        handleScanReceipt(dataUrl);
      }
    }
  };

  const handleScanReceipt = async (base64Image: string) => {
    if (!base64Image) return;
    setIsScanningReceipt(true);
    triggerHaptic("medium");
    try {
      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        setAiParsedReceipt(resData.data);
        triggerHaptic("success");
      } else {
        alert(resData.error || "Failed to scan receipt image.");
        triggerHaptic("heavy");
      }
    } catch (error: any) {
      console.error("Receipt parsing error:", error);
      alert("Error scanning receipt: " + (error.message || error));
      triggerHaptic("heavy");
    } finally {
      setIsScanningReceipt(false);
    }
  };

    // Filter spending data
    const filteredSpendings = spendings.filter(item => {
      // Category filter
      if (spendingFilterCategory !== "All" && item.category !== spendingFilterCategory) return false;
      // Vendor filter
      if (spendingFilterVendor !== "All" && item.vendor !== spendingFilterVendor) return false;
      // Date filter
      if (spendingFilterDateMode === "week") {
        const itemDateObj = new Date(item.date);
        const today = new Date();
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (itemDateObj < oneWeekAgo) return false;
      } else if (spendingFilterDateMode === "month") {
        const itemDateObj = new Date(item.date);
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        if (itemDateObj < oneMonthAgo) return false;
      } else if (spendingFilterDateMode === "range") {
        if (item.date < spendingFilterStartDate || item.date > spendingFilterEndDate) return false;
      }
      return true;
    });

    // Calculate stats
    const totalSpent = filteredSpendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const avgSpent = filteredSpendings.length > 0 ? (totalSpent / filteredSpendings.length) : 0;

    // Chart data for spending by category
    const spendingByCategoryData = spendingCategories.map(cat => {
      const amount = spendings
        .filter(s => s.category === cat)
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      return { name: cat, value: Number(amount.toFixed(2)) };
    }).filter(c => c.value > 0);

    const colors = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#14b8a6"];

    const handleAddSpending = (e: React.FormEvent) => {
      e.preventDefault();
      if (!spendingAmount || isNaN(Number(spendingAmount)) || Number(spendingAmount) <= 0) {
        alert("Please enter a valid numeric amount.");
        return;
      }
      const newSpending = {
        id: "spend_" + Date.now(),
        amount: Number(spendingAmount),
        vendor: spendingVendor,
        category: spendingCategory,
        date: spendingDate,
        notes: spendingNotes.trim() || undefined,
        receiptPhoto: spendingReceipt || undefined,
        createdAt: Date.now()
      };
      saveSpendings([newSpending, ...spendings]);

      // Reset Form
      setSpendingAmount("");
      setSpendingNotes("");
      setSpendingReceipt(null);
      triggerHaptic("success");
    };

    // Helper to format date as mm-dd-yy
    const formatDateToMMDDYY = (dateStr: string) => {
      if (!dateStr) return "";
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const yyyy = parts[0];
        const mm = parts[1];
        const dd = parts[2];
        const yy = yyyy.length === 4 ? yyyy.substring(2) : yyyy;
        return `${mm}-${dd}-${yy}`;
      }
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const yy = String(d.getFullYear()).slice(-2);
          return `${mm}-${dd}-${yy}`;
        }
      } catch (e) {}
      return dateStr;
    };

    // Grouping calculations for the ledger tab
    const groupedSpendings = (() => {
      const groups: Record<string, any[]> = {};
      filteredSpendings.forEach(item => {
        let key = "Other";
        if (ledgerGroupBy === "date") {
          key = item.date || "Unknown Date";
        } else if (ledgerGroupBy === "vendor") {
          key = item.vendor || "Unknown Vendor";
        } else if (ledgerGroupBy === "category") {
          key = item.category || "Uncategorized";
        }
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
      });
      return groups;
    })();

    const sortedGroupKeys = (() => {
      const keys = Object.keys(groupedSpendings);
      if (ledgerGroupBy === "date") {
        // Sort dates descending
        return keys.sort((a, b) => b.localeCompare(a));
      } else {
        // Sort alphabetically
        return keys.sort((a, b) => a.localeCompare(b));
      }
    })();

    const toggleRowExpansion = (id: string) => {
      setExpandedLedgerRows(prev => ({
        ...prev,
        [id]: !prev[id]
      }));
    };

    return (
      <div className="space-y-6">
        {/* Sub-tabs Navigation */}
        <div className="flex border-b border-white/5 pb-2 mb-4 gap-6">
          <button
            type="button"
            onClick={() => setSpendingActiveTab("entry")}
            className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
              spendingActiveTab === "entry" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            New Expense & Analytics
            {spendingActiveTab === "entry" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSpendingActiveTab("ledger")}
            className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
              spendingActiveTab === "ledger" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Expense Ledger ({filteredSpendings.length})
            {spendingActiveTab === "ledger" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSpendingActiveTab("trends")}
            className={`pb-2 px-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
              spendingActiveTab === "trends" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Trends Summary
            {spendingActiveTab === "trends" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {spendingActiveTab === "entry" ? (
          /* ADD NEW EXPENSE ENTRY & ANALYTICS TAB */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Container */}
              {aiParsedReceipt ? (
                /* AI PARSED RECEIPT REVIEW FORM */
                <div className={`p-5 rounded-3xl border space-y-4 text-left ${isDark ? "bg-slate-900/20 border-indigo-500/30" : "bg-indigo-50/40 border-indigo-200/60 shadow-xs"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Review Parsed Receipt</h3>
                      </div>
                      <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">Verify and edit Gemini AI&apos;s extraction</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAiParsedReceipt(null);
                        setSpendingReceipt(null);
                      }}
                      className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>

                  {/* Thumbnail Reference */}
                  {spendingReceipt && (
                    <div className={`flex items-center gap-2.5 p-2 rounded-2xl border ${isDark ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"}`}>
                      <img
                        src={spendingReceipt}
                        alt="Receipt thumbnail"
                        className="w-12 h-12 rounded-lg object-cover border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">Receipt Reference Image</p>
                        <p className="text-[9px] text-slate-455 truncate">Active multimodal document context</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3.5 text-left">
                    {/* Vendor & Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Vendor</label>
                        <input
                          type="text"
                          required
                          value={aiParsedReceipt.vendor || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, vendor: e.target.value })}
                          className={`w-full h-10 px-3 rounded-xl text-xs border outline-none transition-all ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date</label>
                        <input
                          type="date"
                          required
                          value={aiParsedReceipt.date || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, date: e.target.value })}
                          className={`w-full h-10 px-3 rounded-xl font-mono text-xs border outline-none transition-all ${
                            isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark] focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Category & Receipt Number */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Category</label>
                        <select
                          value={spendingCategory}
                          onChange={(e) => setSpendingCategory(e.target.value)}
                          className={`w-full h-10 px-2 rounded-xl text-xs border outline-none transition-all cursor-pointer ${
                            isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{ colorScheme: isDark ? "dark" : "light" }}
                        >
                          {spendingCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Receipt #</label>
                        <input
                          type="text"
                          placeholder="N/A"
                          value={aiParsedReceipt.receiptNumber || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, receiptNumber: e.target.value })}
                          className={`w-full h-10 px-3 rounded-xl text-xs border outline-none transition-all ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Line Items List */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Line Items</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...(aiParsedReceipt.items || [])];
                            newItems.push({ name: "New Item", cost: 0 });
                            setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                          }}
                          className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>
                      <div className={`max-h-28 overflow-y-auto space-y-2 border p-2 rounded-xl ${isDark ? "border-white/5 bg-slate-950/20" : "border-slate-100 bg-slate-50/50"}`}>
                        {aiParsedReceipt.items && aiParsedReceipt.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              required
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...aiParsedReceipt.items];
                                newItems[idx].name = e.target.value;
                                setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                              }}
                              placeholder="Item Name"
                              className={`flex-1 h-8 px-2 rounded-lg text-[10.5px] border outline-none ${
                                isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                              }`}
                            />
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={item.cost || ""}
                              onChange={(e) => {
                                const newItems = [...aiParsedReceipt.items];
                                newItems[idx].cost = Number(e.target.value) || 0;
                                setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                              }}
                              placeholder="0.00"
                              className={`w-16 h-8 px-2 rounded-lg font-mono text-[10.5px] border outline-none text-right ${
                                      isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = aiParsedReceipt.items.filter((_: any, i: number) => i !== idx);
                                setAiParsedReceipt({ ...aiParsedReceipt, items: newItems });
                              }}
                              className="text-rose-500 hover:text-rose-400 text-xs px-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {(!aiParsedReceipt.items || aiParsedReceipt.items.length === 0) && (
                          <p className="text-[10px] text-slate-500 italic p-2 text-center">No line items parsed.</p>
                        )}
                      </div>
                    </div>

                    {/* Financial Subtotals */}
                    <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Subtotal ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={aiParsedReceipt.subtotal || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, subtotal: Number(e.target.value) || 0 })}
                          className={`w-full h-8 px-2 rounded-lg font-mono text-xs border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Tax ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={aiParsedReceipt.tax || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, tax: Number(e.target.value) || 0 })}
                          className={`w-full h-8 px-2 rounded-lg font-mono text-xs border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Tip ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={aiParsedReceipt.tip || ""}
                          onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, tip: Number(e.target.value) || 0 })}
                          className={`w-full h-8 px-2 rounded-lg font-mono text-xs border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-850 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Total Charge */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-indigo-400 tracking-wider block mb-1">Total Charge ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={aiParsedReceipt.totalCharge || ""}
                        onChange={(e) => setAiParsedReceipt({ ...aiParsedReceipt, totalCharge: Number(e.target.value) || 0 })}
                        className={`w-full max-w-[180px] h-10 px-3 rounded-xl font-mono text-sm border outline-none transition-all ${
                          isDark ? "bg-indigo-950/25 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-805"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAiParsedReceipt(null);
                        setSpendingReceipt(null);
                        triggerHaptic("medium");
                      }}
                      className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black uppercase text-xs tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const itemsSummary = aiParsedReceipt.items && aiParsedReceipt.items.length > 0
                          ? "Items:\n" + aiParsedReceipt.items.map((it: any) => `- ${it.name}: $${Number(it.cost).toFixed(2)}`).join("\n") + "\n\n"
                          : "";
                        const financialSummary = `Subtotal: $${Number(aiParsedReceipt.subtotal || 0).toFixed(2)}\nTax: $${Number(aiParsedReceipt.tax || 0).toFixed(2)}\nTip: $${Number(aiParsedReceipt.tip || 0).toFixed(2)}\nTotal Charge: $${Number(aiParsedReceipt.totalCharge || 0).toFixed(2)}\nReceipt #: ${aiParsedReceipt.receiptNumber || "N/A"}`;
                        
                        const newSpending = {
                          id: "spend_" + Date.now(),
                          amount: Number(aiParsedReceipt.totalCharge) || 0,
                          vendor: aiParsedReceipt.vendor || "Unknown Vendor",
                          category: spendingCategory,
                          date: aiParsedReceipt.date || spendingDate,
                          notes: (itemsSummary + financialSummary).trim(),
                          receiptPhoto: spendingReceipt || undefined,
                          createdAt: Date.now()
                        };
                        saveSpendings([newSpending, ...spendings]);
                        
                        // Clear form and reset
                        setAiParsedReceipt(null);
                        setSpendingAmount("");
                        setSpendingNotes("");
                        setSpendingReceipt(null);
                        triggerHaptic("success");
                      }}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md active:scale-95"
                    >
                      Accept & Save
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddSpending} className={`p-5 rounded-3xl border space-y-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Add New Expense</h3>
                    <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">Record real-time transactions</p>
                  </div>

                  <div className="space-y-3.5 text-left">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Amount ($)</label>
                      <FastInput
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={spendingAmount}
                        onChange={(val) => setSpendingAmount(val)}
                        className={`w-full max-w-[180px] h-10 px-3 rounded-xl font-mono text-sm border outline-none transition-all ${
                          isDark ? "bg-slate-955 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Vendor</label>
                          <button
                            type="button"
                            onClick={() => setShowManageSpendingVendors(true)}
                            className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <select
                          value={spendingVendor}
                          onChange={(e) => setSpendingVendor(e.target.value)}
                          className={`w-full h-10 px-2 rounded-xl text-xs border outline-none transition-all cursor-pointer ${
                            isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{ colorScheme: isDark ? "dark" : "light" }}
                        >
                          {spendingVendors.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Category</label>
                          <button
                            type="button"
                            onClick={() => setShowManageSpendingCategories(true)}
                            className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <select
                          value={spendingCategory}
                          onChange={(e) => setSpendingCategory(e.target.value)}
                          className={`w-full h-10 px-2 rounded-xl text-xs border outline-none transition-all cursor-pointer ${
                            isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{ colorScheme: isDark ? "dark" : "light" }}
                        >
                          {spendingCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={spendingDate}
                        onChange={(e) => setSpendingDate(e.target.value)}
                        className={`w-full h-10 px-3 rounded-xl font-mono text-xs border outline-none transition-all ${
                          isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Notes (Optional)</label>
                      <FastInput
                        type="text"
                        placeholder="Payment description..."
                        value={spendingNotes}
                        onChange={(val) => setSpendingNotes(val)}
                        className={`w-full h-10 px-3 rounded-xl text-xs border outline-none transition-all ${
                          isDark ? "bg-slate-955 border-white/10 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">Receipt Attachment</label>
                      <div className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-all ${
                        isCameraOpen
                          ? "h-64 border-indigo-500/50 bg-slate-950/90"
                          : spendingReceipt
                            ? "h-24 border-emerald-500/50 bg-emerald-500/5"
                            : isDark
                              ? "border-white/10 bg-slate-950/40 hover:border-indigo-500/40 h-24"
                              : "border-slate-200 bg-slate-50 hover:border-indigo-500/40 h-24"
                      }`}>
                        {isCameraOpen ? (
                          <div className="relative w-full h-full flex flex-col items-center justify-between">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="w-full h-[180px] object-cover rounded-xl bg-black border border-white/5"
                            />
                            <div className="flex gap-2 w-full justify-center mt-2 z-20">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[9.5px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
                              >
                                📸 Capture Receipt
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                              >
                                ❌ Cancel
                              </button>
                            </div>
                          </div>
                        ) : spendingReceipt ? (
                          <div className="flex items-center gap-3 w-full">
                            <img
                              src={spendingReceipt}
                              alt="Receipt Thumbnail"
                              className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[9px] font-black uppercase text-emerald-400">Photo Attached</p>
                              <div className="flex items-center gap-2 mt-1">
                                {isScanningReceipt ? (
                                  <span className="text-[9.5px] font-black uppercase text-indigo-400 animate-pulse">
                                    Scanning...
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleScanReceipt(spendingReceipt)}
                                    className="text-[9.5px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                                  >
                                    Scan with AI ✨
                                  </button>
                                )}
                                <span className="text-slate-600 text-xs">•</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSpendingReceipt(null);
                                    setAiParsedReceipt(null);
                                  }}
                                  disabled={isScanningReceipt}
                                  className="text-[9.5px] font-black uppercase text-rose-500 hover:text-rose-400 cursor-pointer disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 w-full h-full relative">
                            <Camera size={18} className="text-indigo-400 mb-0.5" />
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Drag & drop or Click to Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    setSpendingReceipt(base64);
                                    handleScanReceipt(base64);
                                  };
                                  r.readAsDataURL(file);
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full max-w-[150px] h-[1px] bg-slate-500/10 my-1 z-20" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startCamera();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[8.5px] font-black uppercase tracking-widest z-20 transition-all active:scale-95 shadow-md cursor-pointer"
                            >
                              Use Live Camera 📸
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>Record Transaction</span>
                  </button>
                </form>
              )}

              {/* Dashboard Analytics & Filters */}
              <div className="col-span-1 lg:col-span-2 space-y-6 flex flex-col justify-between">
                {/* Quick Filters */}
                <div className={`p-4 rounded-3xl border flex flex-wrap items-center gap-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Filter Vendor</label>
                    <select
                      value={spendingFilterVendor}
                      onChange={(e) => setSpendingFilterVendor(e.target.value)}
                      className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                        isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                    >
                      <option value="All">All Vendors</option>
                      {spendingVendors.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Filter Category</label>
                    <select
                      value={spendingFilterCategory}
                      onChange={(e) => setSpendingFilterCategory(e.target.value)}
                      className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                        isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                    >
                      <option value="All">All Categories</option>
                      {spendingCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date Range Preset</label>
                    <select
                      value={spendingFilterDateMode}
                      onChange={(e) => setSpendingFilterDateMode(e.target.value as any)}
                      className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                        isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                    >
                      <option value="all">All Dates</option>
                      <option value="week">Past 7 Days</option>
                      <option value="month">Past 30 Days</option>
                      <option value="range">Custom Range</option>
                    </select>
                  </div>

                  {spendingFilterDateMode === "range" && (
                    <div className="w-full flex gap-3 mt-1.5">
                      <div className="flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={spendingFilterStartDate}
                          onChange={(e) => setSpendingFilterStartDate(e.target.value)}
                          className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={spendingFilterEndDate}
                          onChange={(e) => setSpendingFilterEndDate(e.target.value)}
                          className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                            isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Statistics Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Filtered Spent</p>
                    <p className="text-2xl font-black text-rose-500 mt-1">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${isDark ? "bg-slate-900/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Average Transaction</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">${avgSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* Category Breakdown Chart */}
                <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Expense Breakdown by Category</h3>
                    <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">Relative spending ratios</p>
                  </div>
                  {spendingByCategoryData.length === 0 ? (
                    <div className="py-12 flex items-center justify-center text-xs text-slate-500 font-mono uppercase">
                      No transactions recorded
                    </div>
                  ) : (
                    <div className="relative w-full h-52 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={spendingByCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {spendingByCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${value}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-rose-500">${totalSpent.toFixed(0)}</span>
                        <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-black">Filtered Total</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center mt-2 max-h-24 overflow-y-auto">
                    {spendingByCategoryData.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-[9.5px] font-semibold bg-white/5 px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                        <span className="truncate opacity-75">{item.name}:</span>
                        <span className="font-black">${item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : spendingActiveTab === "ledger" ? (
          /* EXPENSE LEDGER TAB WITH GROUPING & COLLAPSIBILITY */
          <div className="space-y-6 text-left">
            {/* Quick Filters */}
            <div className={`p-4 rounded-3xl border flex flex-wrap items-center gap-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
              <div className="flex-1 min-w-[140px]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Filter Vendor</label>
                  <button
                    type="button"
                    onClick={() => setShowManageSpendingVendors(true)}
                    className="text-[8.5px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Edit List
                  </button>
                </div>
                <select
                  value={spendingFilterVendor}
                  onChange={(e) => setSpendingFilterVendor(e.target.value)}
                  className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="All">All Vendors</option>
                  {spendingVendors.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Filter Category</label>
                  <button
                    type="button"
                    onClick={() => setShowManageSpendingCategories(true)}
                    className="text-[8.5px] font-black uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Edit List
                  </button>
                </div>
                <select
                  value={spendingFilterCategory}
                  onChange={(e) => setSpendingFilterCategory(e.target.value)}
                  className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="All">All Categories</option>
                  {spendingCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Date Range Preset</label>
                <select
                  value={spendingFilterDateMode}
                  onChange={(e) => setSpendingFilterDateMode(e.target.value as any)}
                  className={`w-full h-9 px-2 rounded-lg text-[10.5px] font-black uppercase border outline-none cursor-pointer ${
                    isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                >
                  <option value="all">All Dates</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                  <option value="range">Custom Range</option>
                </select>
              </div>

              {spendingFilterDateMode === "range" && (
                <div className="w-full flex gap-3 mt-1.5">
                  <div className="flex-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Start Date</label>
                    <input
                      type="date"
                      value={spendingFilterStartDate}
                      onChange={(e) => setSpendingFilterStartDate(e.target.value)}
                      className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                        isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">End Date</label>
                    <input
                      type="date"
                      value={spendingFilterEndDate}
                      onChange={(e) => setSpendingFilterEndDate(e.target.value)}
                      className={`w-full h-9 px-3 rounded-lg text-[10px] font-mono border outline-none ${
                        isDark ? "bg-slate-950 border-white/10 text-white [color-scheme:dark]" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grouping Selectors & Statistics */}
            <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-4 text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Group Rows By:</span>
                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 gap-1">
                  {(["date", "vendor", "category"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLedgerGroupBy(mode)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        ledgerGroupBy === mode
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-500 block">Total Cost</span>
                    <span className="font-mono text-sm font-black text-rose-500">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-500 block">Transaction Count</span>
                    <span className="font-mono text-sm font-black text-indigo-400">{filteredSpendings.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* List Table Container */}
            <div className={`p-5 rounded-3xl border flex flex-col text-left ${isDark ? "bg-slate-900/20 border-white/5" : "bg-white border-slate-200 shadow-xs"}`}>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">Ledger Records</h3>
                <p className="text-[9px] text-slate-455 uppercase tracking-widest font-mono">
                  Grouped by {ledgerGroupBy} ({filteredSpendings.length} records matched)
                </p>
              </div>

              {filteredSpendings.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono uppercase tracking-wider border border-dashed border-white/5 rounded-2xl mt-4">
                  No matching transactions found
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 font-black uppercase text-[8.5px] tracking-wider">
                        <th className="py-2 text-center w-8"></th>
                        <th className="py-2 text-left">Date</th>
                        <th className="py-2 text-left">Vendor</th>
                        <th className="py-2 text-left">Category</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold">
                      {sortedGroupKeys.map((groupKey) => {
                        const items = groupedSpendings[groupKey] || [];
                        const groupSum = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                        const displayedGroupKey = ledgerGroupBy === "date" ? formatDateToMMDDYY(groupKey) : groupKey;

                        return (
                          <React.Fragment key={groupKey}>
                            {/* Group Header Row */}
                            <tr className={`${isDark ? "bg-indigo-950/20" : "bg-slate-100/60"} border-t border-b border-white/5`}>
                              <td colSpan={5} className="py-2.5 px-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">
                                      {displayedGroupKey}
                                    </span>
                                    <span className="text-[9px] text-slate-455 font-mono">
                                      ({items.length} {items.length === 1 ? "transaction" : "transactions"})
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[8px] uppercase font-black text-slate-500 mr-1.5">Group Total:</span>
                                    <span className="font-mono text-[11px] font-black text-rose-500">
                                      ${groupSum.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {/* Group Member Rows */}
                            {items.map((item) => {
                              const isExpanded = !!expandedLedgerRows[item.id];
                              return (
                                <React.Fragment key={item.id}>
                                  <tr
                                    onClick={() => toggleRowExpansion(item.id)}
                                    className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${
                                      isExpanded ? (isDark ? "bg-indigo-950/5" : "bg-indigo-50/20") : ""
                                    }`}
                                  >
                                    <td className="py-3 text-center">
                                      <button
                                        type="button"
                                        className="text-slate-400 hover:text-slate-200"
                                      >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </button>
                                    </td>
                                    <td className="py-3 font-mono text-[10px] text-slate-400">
                                      {formatDateToMMDDYY(item.date)}
                                    </td>
                                    <td className="py-3 font-black text-indigo-300">{item.vendor}</td>
                                    <td className="py-3">
                                      <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                                        {item.category}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right font-mono font-black text-rose-450 text-sm">
                                      ${Number(item.amount).toFixed(2)}
                                    </td>
                                  </tr>

                                  {/* Collapsible details pane row */}
                                  {isExpanded && (
                                    <tr className={isDark ? "bg-slate-950/40" : "bg-slate-50/50"}>
                                      <td></td>
                                      <td colSpan={4} className="p-4 text-left border-t border-b border-white/5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                          <div className="space-y-3">
                                            <div>
                                              <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Description / Notes</span>
                                              <p className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"} bg-black/10 p-2 rounded-xl border border-white/5`}>
                                                {item.notes || "No additional notes provided for this transaction."}
                                              </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                              <div>
                                                <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block">Recorded At</span>
                                                <span className="font-mono text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                                              </div>
                                              <div>
                                                <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block">ID</span>
                                                <span className="font-mono text-[9px] text-slate-500">{item.id}</span>
                                              </div>
                                            </div>

                                            <div className="pt-2">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (confirm("Delete this transaction?")) {
                                                    saveSpendings(spendings.filter(s => s.id !== item.id));
                                                    triggerHaptic("medium");
                                                  }
                                                }}
                                                className="px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all font-black uppercase text-[9px] tracking-wider cursor-pointer inline-flex items-center gap-1"
                                              >
                                                <Trash size={10} />
                                                <span>Delete Record</span>
                                              </button>
                                            </div>
                                          </div>

                                          <div>
                                            <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">Receipt Image</span>
                                            {item.receiptPhoto ? (
                                              <div className="relative group w-48 h-32 rounded-xl overflow-hidden border border-white/10 shadow-md">
                                                <img
                                                  src={item.receiptPhoto}
                                                  alt="Receipt Preview"
                                                  className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveReceiptPreview(item.receiptPhoto);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-indigo-600 text-white rounded text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                                  >
                                                    View Full Image
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="h-32 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] text-slate-500 italic">
                                                No receipt attached
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SpendingTrendsTab
                spendings={spendings}
                spendingCategories={spendingCategories}
                spendingVendors={spendingVendors}
                trendViewType={trendViewType}
                setTrendViewType={setTrendViewType}
                triggerHaptic={triggerHaptic}
                isDark={isDark}
              />
        )}
      </div>
    );
  };

export default SpendingTrackerTab;
