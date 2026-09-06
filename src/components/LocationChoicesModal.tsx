import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  X,
  Navigation,
  ExternalLink,
  Check,
  Building,
  Home,
  Search,
  Pencil,
} from "lucide-react";
import { openGoogleMapsNavigation, getGoogleMapsDirectionsUrl } from "./InteractiveAppHelpers";
import {
  getStoredHomeLocation,
  setStoredHomeLocation,
  getStoredWorkLocation,
  setStoredWorkLocation,
} from "../utils/locationStorage";

interface LocationChoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: string;
  onSelectLocation: (location: string) => void;
  favoriteLocations?: string[];
  onAddFavoriteLocation?: (location: string) => void;
}

export const LocationChoicesModal: React.FC<LocationChoicesModalProps> = ({
  isOpen,
  onClose,
  currentLocation = "San Francisco, CA",
  onSelectLocation,
  favoriteLocations = [],
  onAddFavoriteLocation,
}) => {
  const [customInput, setCustomInput] = useState(currentLocation);
  const [selectedAddress, setSelectedAddress] = useState(currentLocation);

  // Home & Work locations from storage
  const [homeLocation, setHomeLocation] = useState<string>(getStoredHomeLocation);
  const [workLocation, setWorkLocation] = useState<string>(getStoredWorkLocation);
  const [isEditingHome, setIsEditingHome] = useState(false);
  const [editHomeText, setEditHomeText] = useState("");
  const [isEditingWork, setIsEditingWork] = useState(false);
  const [editWorkText, setEditWorkText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCustomInput(currentLocation || "");
      setSelectedAddress(currentLocation || "San Francisco, CA");
      setHomeLocation(getStoredHomeLocation());
      setWorkLocation(getStoredWorkLocation());
      setIsEditingHome(false);
      setIsEditingWork(false);
    }
  }, [isOpen, currentLocation]);

  useEffect(() => {
    const handleUpdate = () => {
      setHomeLocation(getStoredHomeLocation());
      setWorkLocation(getStoredWorkLocation());
    };
    window.addEventListener("taskpass_locations_updated", handleUpdate);
    return () => {
      window.removeEventListener("taskpass_locations_updated", handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customInput.trim();
    if (clean) {
      if (onAddFavoriteLocation) {
        onAddFavoriteLocation(clean);
      }
      onSelectLocation(clean);
      setSelectedAddress(clean);
      onClose();
    }
  };

  const handlePickAddress = (addr: string) => {
    const clean = addr.trim();
    if (!clean) return;
    setSelectedAddress(clean);
    setCustomInput(clean);
    if (onAddFavoriteLocation) {
      onAddFavoriteLocation(clean);
    }
    onSelectLocation(clean);
    onClose();
  };

  const handleSaveHome = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editHomeText.trim();
    if (trimmed) {
      setStoredHomeLocation(trimmed);
      setHomeLocation(trimmed);
    }
    setIsEditingHome(false);
  };

  const handleSaveWork = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editWorkText.trim();
    if (trimmed) {
      setStoredWorkLocation(trimmed);
      setWorkLocation(trimmed);
    }
    setIsEditingWork(false);
  };

  const directionsUrl =
    getGoogleMapsDirectionsUrl(selectedAddress) ||
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedAddress)}&travelmode=driving`;

  const isHomeSelected =
    (selectedAddress || "").toLowerCase() === homeLocation.toLowerCase() ||
    (currentLocation || "").toLowerCase() === homeLocation.toLowerCase();

  const isWorkSelected =
    (selectedAddress || "").toLowerCase() === workLocation.toLowerCase() ||
    (currentLocation || "").toLowerCase() === workLocation.toLowerCase();

  // Filter out Home and Work from other saved locations if identical
  const otherSavedLocations = favoriteLocations.filter(
    (loc) =>
      loc.toLowerCase() !== homeLocation.toLowerCase() &&
      loc.toLowerCase() !== workLocation.toLowerCase()
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        {/* Backdrop click dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg max-h-[90vh] bg-[#FFF2DF] rounded-[24px] border border-[#EADDC7] shadow-2xl flex flex-col overflow-hidden text-[#3D312A] z-10"
        >
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#EADDC7] bg-[#FFF9F0] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#F5DEC7] text-[#A25F37] flex items-center justify-center shadow-xs shrink-0">
                <MapPin size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#2D2319] leading-tight">
                  Choose Destination
                </h3>
                <p className="text-[10px] sm:text-[11px] text-[#7A6B5C]">
                  Select destination or enter custom street address
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#2D2319] transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
            {/* Custom Search / Address Input */}
            <form onSubmit={handleApplyCustom} className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8C7A6B]">
                Custom Destination / Address
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A6B]" />
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter street, city, landmark, or postal code..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold rounded-2xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] placeholder:text-[#9E8E7D] focus:outline-none focus:ring-2 focus:ring-[#A25F37]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customInput.trim()}
                  className="px-4 py-2 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Live Map Preview (Full Color Google Map) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8C7A6B]">
                  Live Map View
                </span>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-[#2D6A4F] hover:underline flex items-center gap-0.5"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative h-40 sm:h-48 w-full rounded-2xl overflow-hidden border border-[#EADDC7] shadow-xs">
                <iframe
                  key={selectedAddress || customInput}
                  title={`Google Map preview for ${selectedAddress || customInput}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedAddress || customInput || "San Francisco, CA")}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 pointer-events-auto"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Editable Home and Work at the top of the destination list */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8C7A6B]">
                Primary Locations (Editable)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Home Location Card */}
                <div
                  className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                    isHomeSelected
                      ? "bg-[#FAF3E0] border-[#2D6A4F] ring-1 ring-[#2D6A4F] shadow-xs"
                      : "bg-[#FFF9F0] border-[#EADDC7] hover:border-[#D8C7AF]"
                  }`}
                >
                  {isEditingHome ? (
                    <form onSubmit={handleSaveHome} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1">
                          <Home size={12} />
                          <span>Edit Home Address</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingHome(false)}
                          className="p-1 text-[#8C7A6B] hover:text-[#2D2319]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={editHomeText}
                        onChange={(e) => setEditHomeText(e.target.value)}
                        placeholder="Enter home street address..."
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                      />
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingHome(false)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-[#6B5A4B] bg-[#EADDC7]/60 hover:bg-[#EADDC7]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-[#2D6A4F] text-white hover:bg-[#1B4332]"
                        >
                          Save Home
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => handlePickAddress(homeLocation)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        title="Click to select Home as location"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#2D6A4F] flex items-center justify-center shrink-0 border border-emerald-200">
                          <Home size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-[#2D2319]">Home</span>
                            {isHomeSelected && (
                              <span className="px-1.5 py-0.2 rounded-full text-[8px] font-extrabold bg-[#2D6A4F] text-white">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-[#7A6B5C] truncate mt-0.5">
                            {homeLocation || "Set Home address..."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditHomeText(homeLocation === "Home" ? "" : homeLocation);
                          setIsEditingHome(true);
                        }}
                        className="p-2 rounded-xl hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#2D2319] transition-colors cursor-pointer shrink-0"
                        title="Edit Home Address"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Work Location Card */}
                <div
                  className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                    isWorkSelected
                      ? "bg-[#FAF3E0] border-[#2D6A4F] ring-1 ring-[#2D6A4F] shadow-xs"
                      : "bg-[#FFF9F0] border-[#EADDC7] hover:border-[#D8C7AF]"
                  }`}
                >
                  {isEditingWork ? (
                    <form onSubmit={handleSaveWork} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#3A86FF] flex items-center gap-1">
                          <Building size={12} />
                          <span>Edit Work Address</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingWork(false)}
                          className="p-1 text-[#8C7A6B] hover:text-[#2D2319]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={editWorkText}
                        onChange={(e) => setEditWorkText(e.target.value)}
                        placeholder="Enter work street address..."
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-[#C4B4A0] bg-[#FAF3E0] text-[#2D2319] focus:outline-none focus:ring-1 focus:ring-[#3A86FF]"
                      />
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingWork(false)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-[#6B5A4B] bg-[#EADDC7]/60 hover:bg-[#EADDC7]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-[#2D6A4F] text-white hover:bg-[#1B4332]"
                        >
                          Save Work
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => handlePickAddress(workLocation)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        title="Click to select Work as location"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-[#3A86FF] flex items-center justify-center shrink-0 border border-blue-200">
                          <Building size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-[#2D2319]">Work</span>
                            {isWorkSelected && (
                              <span className="px-1.5 py-0.2 rounded-full text-[8px] font-extrabold bg-[#2D6A4F] text-white">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-[#7A6B5C] truncate mt-0.5">
                            {workLocation || "Set Work address..."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditWorkText(workLocation === "Work" ? "" : workLocation);
                          setIsEditingWork(true);
                        }}
                        className="p-2 rounded-xl hover:bg-[#EADDC7] text-[#7A6B5C] hover:text-[#2D2319] transition-colors cursor-pointer shrink-0"
                        title="Edit Work Address"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Canonical Saved Locations (from user's custom saved items) */}
            {otherSavedLocations.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8C7A6B]">
                  Other Saved Locations ({otherSavedLocations.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {otherSavedLocations.map((loc) => {
                    const isSelected =
                      (selectedAddress || "").toLowerCase() === loc.toLowerCase() ||
                      (currentLocation || "").toLowerCase() === loc.toLowerCase();
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => handlePickAddress(loc)}
                        className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs"
                            : "bg-[#FFF9F0] border-[#EADDC7] text-[#2D2319] hover:bg-[#FAF3E0]"
                        }`}
                      >
                        <MapPin size={11} className={isSelected ? "text-white" : "text-[#A25F37]"} />
                        <span>{loc}</span>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[#EADDC7] bg-[#FFF9F0] flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                openGoogleMapsNavigation(selectedAddress || customInput || currentLocation);
                onClose();
              }}
              className="py-2 px-4 rounded-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Navigation size={13} className="fill-current text-white" />
              <span>Launch Driving Directions</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-full bg-[#FAF3E0] hover:bg-[#EADDC7] border border-[#EADDC7] text-[#594B3E] text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
