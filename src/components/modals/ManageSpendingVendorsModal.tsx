import React, { useState } from "react";
import { Edit3, Trash2, Check, X } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";

interface ManageSpendingVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  uniformInputClass: string;
  spendingVendors: string[];
  handleAddSpendingVendor: (customVal?: string) => void;
  handleRenameSpendingVendor: (oldVal: string, newVal: string) => void;
  handleDeleteSpendingVendor: (val: string) => void;
}

export const ManageSpendingVendorsModal: React.FC<ManageSpendingVendorsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  uniformInputClass,
  spendingVendors,
  handleAddSpendingVendor,
  handleRenameSpendingVendor,
  handleDeleteSpendingVendor,
}) => {
  const [newSpendingVendorVal, setNewSpendingVendorVal] = useState("");
  const [editingSpendingVendorKey, setEditingSpendingVendorKey] = useState<string | null>(null);
  const [editingSpendingVendorValue, setEditingSpendingVendorValue] = useState("");
  const [deletingSpendingVendorKey, setDeletingSpendingVendorKey] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setEditingSpendingVendorKey(null);
    setDeletingSpendingVendorKey(null);
    setNewSpendingVendorVal("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Manage Spending Vendors">
      <div className={`space-y-4 text-left ${isDark ? "text-slate-100" : "text-slate-800"}`}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New Vendor Name..."
            className={uniformInputClass}
            value={newSpendingVendorVal}
            onChange={(e) => setNewSpendingVendorVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newSpendingVendorVal.trim()) {
                  handleAddSpendingVendor(newSpendingVendorVal.trim());
                  setNewSpendingVendorVal("");
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (newSpendingVendorVal.trim()) {
                handleAddSpendingVendor(newSpendingVendorVal.trim());
                setNewSpendingVendorVal("");
              }
            }}
            className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
          >
            Add
          </button>
        </div>

        <div className={`border rounded-2xl overflow-hidden divide-y ${isDark ? "border-white/5 divide-white/5 bg-slate-950/20" : "border-slate-200 divide-slate-200 bg-slate-50"}`}>
          {spendingVendors.length === 0 ? (
            <p className="p-4 text-center text-xs font-medium text-slate-400">No vendors added yet.</p>
          ) : (
            spendingVendors.map((vendor) => {
              const isEditing = editingSpendingVendorKey === vendor;
              const isDeleting = deletingSpendingVendorKey === vendor;

              return (
                <div key={vendor} className="p-3 flex items-center justify-between gap-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingSpendingVendorValue}
                        onChange={(e) => setEditingSpendingVendorValue(e.target.value)}
                        className={`flex-1 h-8 px-2.5 rounded-lg font-bold text-xs outline-none border transition-all ${
                          isDark 
                            ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (editingSpendingVendorValue.trim() && editingSpendingVendorValue.trim() !== vendor) {
                              handleRenameSpendingVendor(vendor, editingSpendingVendorValue.trim());
                            }
                            setEditingSpendingVendorKey(null);
                          } else if (e.key === "Escape") {
                            setEditingSpendingVendorKey(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingSpendingVendorValue.trim() && editingSpendingVendorValue.trim() !== vendor) {
                            handleRenameSpendingVendor(vendor, editingSpendingVendorValue.trim());
                          }
                          setEditingSpendingVendorKey(null);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Save Changes"
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSpendingVendorKey(null)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                          isDark ? "bg-slate-900 border-white/5 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-550 hover:text-slate-800"
                        }`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex items-center justify-between flex-1 gap-2 select-none">
                      <span className="text-xs font-bold text-rose-455 shrink-0">Confirm Delete? All expenses will default to 'Other'.</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteSpendingVendor(vendor);
                            setDeletingSpendingVendorKey(null);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSpendingVendorKey(null)}
                          className="px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider cursor-pointer text-slate-405"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{vendor}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSpendingVendorKey(vendor);
                            setEditingSpendingVendorValue(vendor);
                            setDeletingSpendingVendorKey(null);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-550 hover:text-slate-800"}`}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingSpendingVendorKey(vendor);
                            setEditingSpendingVendorKey(null);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-455 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
