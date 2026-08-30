import React, { useState } from "react";
import { Edit3, Trash2, Check, X } from "lucide-react";
import { Modal } from "../InteractiveAppHelpers";

interface ManageFlexActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  uniformInputClass: string;
  flexActivities: string[];
  handleAddNewFlexActivity: (customVal?: string) => void;
  handleRenameFlexActivity: (oldVal: string, newVal: string) => void;
  handleDeleteFlexActivity: (val: string) => void;
}

export const ManageFlexActivitiesModal: React.FC<ManageFlexActivitiesModalProps> = ({
  isOpen,
  onClose,
  isDark,
  uniformInputClass,
  flexActivities,
  handleAddNewFlexActivity,
  handleRenameFlexActivity,
  handleDeleteFlexActivity,
}) => {
  const [newFlexActivityVal, setNewFlexActivityVal] = useState("");
  const [editingFlexActivityKey, setEditingFlexActivityKey] = useState<string | null>(null);
  const [editingFlexActivityValue, setEditingFlexActivityValue] = useState("");
  const [deletingFlexActivityKey, setDeletingFlexActivityKey] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setEditingFlexActivityKey(null);
    setDeletingFlexActivityKey(null);
    setNewFlexActivityVal("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Manage Flex Activities">
      <div className={`space-y-4 text-left ${isDark ? "text-slate-100" : "text-slate-800"}`}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New Flex Activity Name..."
            className={uniformInputClass}
            value={newFlexActivityVal}
            onChange={(e) => setNewFlexActivityVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newFlexActivityVal.trim()) {
                  handleAddNewFlexActivity(newFlexActivityVal.trim());
                  setNewFlexActivityVal("");
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (newFlexActivityVal.trim()) {
                handleAddNewFlexActivity(newFlexActivityVal.trim());
                setNewFlexActivityVal("");
              }
            }}
            className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
          >
            Add
          </button>
        </div>

        <div className={`border rounded-2xl overflow-hidden divide-y ${isDark ? "border-white/5 divide-white/5 bg-slate-950/20" : "border-slate-200 divide-slate-200 bg-slate-50"}`}>
          {flexActivities.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">No flex activities added yet.</p>
          ) : (
            flexActivities.map((act) => {
              const isEditing = editingFlexActivityKey === act;
              const isDeleting = deletingFlexActivityKey === act;

              return (
                <div key={act} className="flex items-center justify-between p-3 gap-2 min-h-[48px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 select-none" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingFlexActivityValue}
                        onChange={(e) => setEditingFlexActivityValue(e.target.value)}
                        className={`flex-1 h-8 px-2.5 rounded-lg font-bold text-xs outline-none border transition-all ${
                          isDark 
                            ? "bg-slate-950 border-white/10 text-white focus:border-indigo-500" 
                            : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (editingFlexActivityValue.trim() && editingFlexActivityValue.trim() !== act) {
                              handleRenameFlexActivity(act, editingFlexActivityValue.trim());
                            }
                            setEditingFlexActivityKey(null);
                          } else if (e.key === "Escape") {
                            setEditingFlexActivityKey(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingFlexActivityValue.trim() && editingFlexActivityValue.trim() !== act) {
                            handleRenameFlexActivity(act, editingFlexActivityValue.trim());
                          }
                          setEditingFlexActivityKey(null);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Save Changes"
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFlexActivityKey(null)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                          isDark ? "bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800" : "bg-white border-slate-200 text-slate-550 hover:text-slate-850 hover:bg-slate-100"
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
                            handleDeleteFlexActivity(act);
                            setDeletingFlexActivityKey(null);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingFlexActivityKey(null)}
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
                      <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{act}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFlexActivityKey(act);
                            setEditingFlexActivityValue(act);
                            setDeletingFlexActivityKey(null);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-550 hover:text-slate-800"}`}
                          title="Edit Activity Name"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingFlexActivityKey(act);
                            setEditingFlexActivityKey(null);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-455 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Activity"
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
