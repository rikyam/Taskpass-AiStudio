import React, { useState } from "react";
import { Edit3, Trash2, Check, X } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  uniformInputClass: string;
  categories: string[];
  handleAddNewCategory: (customVal?: string) => void;
  handleRenameCategory: (oldVal: string, newVal: string) => void;
  handleDeleteCategory: (val: string) => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  isDark,
  uniformInputClass,
  categories,
  handleAddNewCategory,
  handleRenameCategory,
  handleDeleteCategory,
}) => {
  const [newCategoryVal, setNewCategoryVal] = useState("");
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [deletingCategoryKey, setDeletingCategoryKey] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setEditingCategoryKey(null);
    setDeletingCategoryKey(null);
    setNewCategoryVal("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Manage Categories">
      <div className={`space-y-4 text-left ${isDark ? "text-slate-100" : "text-slate-800"}`}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New Category Name..."
            className={uniformInputClass}
            value={newCategoryVal}
            onChange={(e) => setNewCategoryVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newCategoryVal.trim()) {
                  handleAddNewCategory(newCategoryVal.trim());
                  setNewCategoryVal("");
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (newCategoryVal.trim()) {
                handleAddNewCategory(newCategoryVal.trim());
                setNewCategoryVal("");
              }
            }}
            className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
          >
            Add
          </button>
        </div>

        <div className={`border rounded-2xl overflow-hidden divide-y ${isDark ? "border-white/5 divide-white/5 bg-slate-950/20" : "border-slate-200 divide-slate-200 bg-slate-50"}`}>
          {categories.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">No categories custom configured yet.</p>
          ) : (
            categories.map((cat) => {
              const isEditing = editingCategoryKey === cat;
              const isDeleting = deletingCategoryKey === cat;

              return (
                <div key={cat} className="flex items-center justify-between p-3 gap-2 min-h-[48px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 select-none" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingCategoryValue}
                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                        className={`flex-1 h-8 px-2.5 rounded-lg font-bold text-xs outline-none border transition-all ${
                          isDark 
                            ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (editingCategoryValue.trim() && editingCategoryValue.trim() !== cat) {
                              handleRenameCategory(cat, editingCategoryValue.trim());
                            }
                            setEditingCategoryKey(null);
                          } else if (e.key === "Escape") {
                            setEditingCategoryKey(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingCategoryValue.trim() && editingCategoryValue.trim() !== cat) {
                            handleRenameCategory(cat, editingCategoryValue.trim());
                          }
                          setEditingCategoryKey(null);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Save Changes"
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryKey(null)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                          isDark ? "bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800" : "bg-white border-slate-200 text-slate-550 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex items-center justify-between flex-1 gap-2 select-none" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs font-bold text-rose-400 shrink-0">Confirm Deletion?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteCategory(cat);
                            setDeletingCategoryKey(null);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategoryKey(null)}
                          className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                            isDark ? "bg-slate-800 border-white/5 text-slate-350 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:text-slate-850"
                          }`}
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
                            setEditingCategoryKey(cat);
                            setEditingCategoryValue(cat);
                            setDeletingCategoryKey(null);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-550 hover:text-slate-800"}`}
                          title="Edit Category Name"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingCategoryKey(cat);
                            setEditingCategoryKey(null);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-455 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Category"
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
