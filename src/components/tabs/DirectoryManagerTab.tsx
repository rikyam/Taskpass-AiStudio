import React from 'react';
import { Users, Store, MapPin, Plus, Check, X, Edit3, Trash2, BookOpen } from 'lucide-react';

export interface DirectoryManagerTabProps {
  directorySubTab: 'collaborator' | 'vendor' | 'location';
  setDirectorySubTab: (tab: 'collaborator' | 'vendor' | 'location') => void;
  collaborators: string[];
  spendingVendors: string[];
  favoriteLocations: string[];
  newEntityName: string;
  setNewEntityName: (name: string) => void;
  handleAddNewCollaborator: (name: string) => void;
  handleAddSpendingVendor: (vendor: string) => void;
  handleAddLocation: (loc: string) => void;
  handleRenameCollaborator: (oldVal: string, newVal: string) => void;
  handleRenameSpendingVendor: (oldVal: string, newVal: string) => void;
  handleRenameLocation: (oldVal: string, newVal: string) => void;
  handleDeleteCollaborator: (name: string) => void;
  handleDeleteSpendingVendor: (name: string) => void;
  setFavoriteLocations: (locs: string[]) => void;
  saveSystemSettingsToCloud: (settings: any) => void;
  entityNotes: Record<string, string>;
  saveEntityNotes: (notes: Record<string, string>) => void;
  editingEntityKey: string | null;
  setEditingEntityKey: (key: string | null) => void;
  editingEntityValue: string;
  setEditingEntityValue: (val: string) => void;
  deletingEntityKey: string | null;
  setDeletingEntityKey: (key: string | null) => void;
  handleAddTimestampedNoteForEntity: (type: 'collaborator' | 'vendor' | 'location', name: string) => void;
  triggerHaptic: (type: string) => void;
  isDark: boolean;
}

export const DirectoryManagerTab: React.FC<DirectoryManagerTabProps> = ({
  directorySubTab,
  setDirectorySubTab,
  collaborators,
  spendingVendors,
  favoriteLocations,
  newEntityName,
  setNewEntityName,
  handleAddNewCollaborator,
  handleAddSpendingVendor,
  handleAddLocation,
  handleRenameCollaborator,
  handleRenameSpendingVendor,
  handleRenameLocation,
  handleDeleteCollaborator,
  handleDeleteSpendingVendor,
  setFavoriteLocations,
  saveSystemSettingsToCloud,
  entityNotes,
  saveEntityNotes,
  editingEntityKey,
  setEditingEntityKey,
  editingEntityValue,
  setEditingEntityValue,
  deletingEntityKey,
  setDeletingEntityKey,
  handleAddTimestampedNoteForEntity,
  triggerHaptic,
  isDark
}) => {
    // Current list based on directorySubTab
    let list: string[] = [];
    if (directorySubTab === "collaborator") {
      list = collaborators;
    } else if (directorySubTab === "vendor") {
      list = spendingVendors;
    } else if (directorySubTab === "location") {
      list = favoriteLocations;
    }

    const handleAddEntity = (e: React.FormEvent) => {
      e.preventDefault();
      const val = newEntityName.trim();
      if (!val) return;

      if (directorySubTab === "collaborator") {
        if (!collaborators.includes(val)) {
          handleAddNewCollaborator(val);
        }
      } else if (directorySubTab === "vendor") {
        if (!spendingVendors.includes(val)) {
          handleAddSpendingVendor(val);
        }
      } else if (directorySubTab === "location") {
        if (!favoriteLocations.includes(val)) {
          handleAddLocation(val);
        }
      }
      setNewEntityName("");
      triggerHaptic("medium");
    };

    const handleRenameEntity = (oldVal: string, newVal: string) => {
      const val = newVal.trim();
      if (!val || oldVal === val) {
        setEditingEntityKey(null);
        return;
      }

      if (directorySubTab === "collaborator") {
        handleRenameCollaborator(oldVal, val);
        // Rename key in notes
        const oldNoteKey = `collaborator:${oldVal}`;
        const newNoteKey = `collaborator:${val}`;
        if (entityNotes[oldNoteKey]) {
          const updatedNotes = { ...entityNotes };
          updatedNotes[newNoteKey] = updatedNotes[oldNoteKey];
          delete updatedNotes[oldNoteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "vendor") {
        handleRenameSpendingVendor(oldVal, val);
        // Rename key in notes
        const oldNoteKey = `vendor:${oldVal}`;
        const newNoteKey = `vendor:${val}`;
        if (entityNotes[oldNoteKey]) {
          const updatedNotes = { ...entityNotes };
          updatedNotes[newNoteKey] = updatedNotes[oldNoteKey];
          delete updatedNotes[oldNoteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "location") {
        handleRenameLocation(oldVal, val);
        // Rename key in notes
        const oldNoteKey = `location:${oldVal}`;
        const newNoteKey = `location:${val}`;
        if (entityNotes[oldNoteKey]) {
          const updatedNotes = { ...entityNotes };
          updatedNotes[newNoteKey] = updatedNotes[oldNoteKey];
          delete updatedNotes[oldNoteKey];
          saveEntityNotes(updatedNotes);
        }
      }

      setEditingEntityKey(null);
      triggerHaptic("success");
    };

    const handleDeleteEntity = (val: string) => {
      if (directorySubTab === "collaborator") {
        handleDeleteCollaborator(val);
        const noteKey = `collaborator:${val}`;
        if (entityNotes[noteKey]) {
          const updatedNotes = { ...entityNotes };
          delete updatedNotes[noteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "vendor") {
        handleDeleteSpendingVendor(val);
        const noteKey = `vendor:${val}`;
        if (entityNotes[noteKey]) {
          const updatedNotes = { ...entityNotes };
          delete updatedNotes[noteKey];
          saveEntityNotes(updatedNotes);
        }
      } else if (directorySubTab === "location") {
        const updatedLocs = favoriteLocations.filter(l => l !== val);
        setFavoriteLocations(updatedLocs);
        localStorage.setItem("taskpass_favorite_locations_v1", JSON.stringify(updatedLocs));
        saveSystemSettingsToCloud({ favoriteLocations: updatedLocs });

        const noteKey = `location:${val}`;
        if (entityNotes[noteKey]) {
          const updatedNotes = { ...entityNotes };
          delete updatedNotes[noteKey];
          saveEntityNotes(updatedNotes);
        }
      }

      setDeletingEntityKey(null);
      triggerHaptic("medium");
    };

    return (
      <div className="space-y-6">
        {/* Subtabs Selector */}
        <div className="flex bg-slate-950/40 p-1 border border-white/5 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => { setDirectorySubTab("collaborator"); triggerHaptic("light"); setNewEntityName(""); setEditingEntityKey(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              directorySubTab === "collaborator" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users size={14} />
            Contacts / Collab
          </button>
          <button
            type="button"
            onClick={() => { setDirectorySubTab("vendor"); triggerHaptic("light"); setNewEntityName(""); setEditingEntityKey(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              directorySubTab === "vendor" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Store size={14} />
            Spending Vendors
          </button>
          <button
            type="button"
            onClick={() => { setDirectorySubTab("location"); triggerHaptic("light"); setNewEntityName(""); setEditingEntityKey(null); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              directorySubTab === "location" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MapPin size={14} />
            Favorite Locations
          </button>
        </div>

        {/* Add New Entity Form */}
        <form onSubmit={handleAddEntity} className="flex gap-2">
          <input
            type="text"
            required
            placeholder={
              directorySubTab === "collaborator"
                ? "Register a new collaborator / contact..."
                : directorySubTab === "vendor"
                ? "Register a new spending vendor..."
                : "Register a new favorite location..."
            }
            className={`flex-1 text-xs font-semibold p-3 rounded-xl border outline-none ${
              isDark 
                ? "bg-slate-950/60 border-white/10 text-slate-100 focus:border-indigo-500/50 placeholder-slate-500" 
                : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500/50 placeholder-slate-400"
            }`}
            value={newEntityName}
            onChange={(e) => setNewEntityName(e.target.value)}
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-550 active:scale-95 text-white px-5 py-3 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1 font-sans uppercase tracking-wider shrink-0"
          >
            <Plus size={14} strokeWidth={3} />
            Add Entry
          </button>
        </form>

        {/* Directory List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {list.map((item) => {
            const noteKey = `${directorySubTab}:${item}`;
            const currentNote = entityNotes[noteKey] || "";
            const isEditing = editingEntityKey === item;
            const isConfirmingDelete = deletingEntityKey === item;

            return (
              <div
                key={item}
                className={`p-3.5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isDark
                    ? "bg-slate-900/90 border-white/5 hover:border-indigo-500/10"
                    : "bg-slate-50 border-slate-200 hover:border-indigo-550/10"
                }`}
              >
                {/* Left side: Edit Input or Name */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2 max-w-full">
                      <input
                        type="text"
                        className={`flex-1 text-xs font-bold p-1.5 rounded-lg border outline-none ${
                          isDark ? "bg-slate-950 text-white border-white/10" : "bg-white text-slate-900 border-slate-200"
                        }`}
                        value={editingEntityValue}
                        onChange={(e) => setEditingEntityValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameEntity(item, editingEntityValue);
                          } else if (e.key === "Escape") {
                            setEditingEntityKey(null);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameEntity(item, editingEntityValue)}
                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-lg transition-all"
                        title="Save Name"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingEntityKey(null)}
                        className="p-1.5 bg-slate-850 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-indigo-400 uppercase tracking-wide shrink-0">
                        {directorySubTab === "collaborator" ? "Collab:" : directorySubTab === "vendor" ? "Vendor:" : "Location:"}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-100 truncate flex-1 select-all animate-fade-in" title={item}>
                        {item}
                      </h4>
                    </div>
                  )}

                  {/* Quick Notes Input field */}
                  <div className="mt-2.5">
                    <textarea
                      placeholder="Add an inline quick note or reminder for this contact..."
                      className={`w-full text-[11px] font-semibold p-2 rounded-xl border outline-none transition-all resize-none ${
                        isDark
                          ? "bg-slate-950/40 border-white/5 text-slate-200 placeholder-slate-600 focus:border-indigo-500/30"
                          : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500/30"
                      }`}
                      rows={1}
                      value={currentNote}
                      onChange={(e) => {
                        const updated = { ...entityNotes, [noteKey]: e.target.value };
                        saveEntityNotes(updated);
                      }}
                    />
                  </div>
                </div>

                {/* Right side: Action Controls */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 border-t border-white/5 md:border-0 pt-2 md:pt-0">
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1 bg-rose-500/10 p-1 rounded-xl border border-rose-500/25">
                      <span className="text-[9px] font-black uppercase text-rose-455 px-1.5 py-0.5">Are you sure?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntity(item)}
                        className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntityKey(null)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* One Press Log Note */}
                      <button
                        type="button"
                        onClick={() => handleAddTimestampedNoteForEntity(directorySubTab, item)}
                        className="px-2.5 py-1.5 bg-indigo-505/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-indigo-500/15 cursor-pointer"
                        title="Create a new timestamped log entry in Notes depository"
                      >
                        <Plus size={10} strokeWidth={3} />
                        <span>Log Note</span>
                      </button>

                      {/* Rename Button */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntityKey(item);
                            setEditingEntityValue(item);
                            setDeletingEntityKey(null);
                            triggerHaptic("light");
                          }}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Rename Entry"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingEntityKey(item);
                          setEditingEntityKey(null);
                          triggerHaptic("medium");
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-455 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {list.length === 0 && (
            <div className="text-center py-8 bg-slate-900/10 rounded-2xl border border-dashed border-white/5">
              <BookOpen className="text-slate-600 mx-auto mb-2 opacity-50" size={24} />
              <p className="text-xs text-slate-455 font-bold italic">No entries registered in this list yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

export default DirectoryManagerTab;
