import React, { useState } from "react";
import { Edit3, Trash2, Check, X } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";

interface ManageSpendingCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  uniformInputClass: string;
  spendingCategories: string[];
  handleAddSpendingCategory: (customVal?: string) => void;
  handleRenameSpendingCategory: (oldVal: string, newVal: string) => void;
  handleDeleteSpendingCategory: (val: string) => void;
}

export const ManageSpendingCategoriesModal: React.FC<ManageSpendingCategoriesModalProps> = ({
  isOpen,
  onClose,
  isDark,
  uniformInputClass,
  spendingCategories,
  handleAddSpendingCategory,
  handleRenameSpendingCategory,
  handleDeleteSpendingCategory,
}) => {
  const [newSpendingCategoryVal, setNewSpendingCategoryVal] = useState("");
  const [editingSpendingCategoryKey, setEditingSpendingCategoryKey] = useState<string | null>(null);
  const [editingSpendingCategoryValue, setEditingSpendingCategoryValue] = useState("");
  const [deletingSpendingCategoryKey, setDeletingSpendingCategoryKey] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setEditingSpendingCategoryKey(null);
    setDeletingSpendingCategoryKey(null);
    setNewSpendingCategoryVal("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Manage Spending Categories">
      <div className={`space-y-4 text-left ${isDark ? "text-slate-100" : "text-slate-800"}`}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New Category Name..."
            className={uniformInputClass}
            value={newSpendingCategoryVal}
            onChange={(e) => setNewSpendingCategoryVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newSpendingCategoryVal.trim()) {
                  handleAddSpendingCategory(newSpendingCategoryVal.trim());
                  setNewSpendingCategoryVal("");
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (newSpendingCategoryVal.trim()) {
                handleAddSpendingCategory(newSpendingCategoryVal.trim());
                setNewSpendingCategoryVal("");
              }
            }}
            className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
          >
            Add
          </button>
        </div>

        <div className={`border rounded-2xl overflow-hidden divide-y ${isDark ? "border-white/5 divide-white/5 bg-slate-950/20" : "border-slate-200 divide-slate-200 bg-slate-50"}`}>
          {spendingCategories.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">No categories added yet.</p>
          ) : (
            spendingCategories.map((cat) => {
              const isEditing = editingSpendingCategoryKey === cat;
              const isDeleting = deletingSpendingCategoryKey === cat;

              return (
                <div key={cat} className="flex items-center justify-between p-3 gap-2 min-h-[48px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 select-none">
                      <input
                        type="text"
                        value={editingSpendingCategoryValue}
                        onChange={(e) => setEditingSpendingCategoryValue(e.target.value)}
                        className={`flex-1 h-8 px-2.5 rounded-lg font-bold text-xs outline-none border transition-all ${
                          isDark 
                            ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (editingSpendingCategoryValue.trim() && editingSpendingCategoryValue.trim() !== cat) {
                              handleRenameSpendingCategory(cat, editingSpendingCategoryValue.trim());
                            }
                            setEditingSpendingCategoryKey(null);
                          } else if (e.key === "Escape") {
                            setEditingSpendingCategoryKey(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingSpendingCategoryValue.trim() && editingSpendingCategoryValue.trim() !== cat) {
                            handleRenameSpendingCategory(cat, editingSpendingCategoryValue.trim());
                          }
                          setEditingSpendingCategoryKey(null);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Save Changes"
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSpendingCategoryKey(null)}
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
                            handleDeleteSpendingCategory(cat);
                            setDeletingSpendingCategoryKey(null);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSpendingCategoryKey(null)}
                          className="px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider cursor-pointer text-slate-405"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{cat}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSpendingCategoryKey(cat);
                            setEditingSpendingCategoryValue(cat);
                            setDeletingSpendingCategoryKey(null);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-550 hover:text-slate-800"}`}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingSpendingCategoryKey(cat);
                            setEditingSpendingCategoryKey(null);
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
