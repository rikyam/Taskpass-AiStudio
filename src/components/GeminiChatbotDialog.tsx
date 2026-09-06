import React, { useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Layers,
  ChevronDown,
  User,
  MapPin,
  Mic,
  MicOff,
  Send,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export interface ChatbotSuggestion {
  type: "collaborator" | "location";
  value: string;
  originalQuery?: string;
}

export interface ChatbotMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
  actionsExecuted?: string[];
  suggestions?: ChatbotSuggestion[];
}

export interface GeminiChatbotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  chatbotMessages: ChatbotMessage[];
  setChatbotMessages: React.Dispatch<React.SetStateAction<ChatbotMessage[]>>;
  chatbotInput: string;
  setChatbotInput: (val: string) => void;
  isChatbotLoading: boolean;
  chatbotVoiceError: string | null;
  isChatbotVoiceListening: boolean;
  startChatbotVoiceCapture: () => void;
  stopChatbotVoiceCapture: () => void;
  handleSendChatbotMessage: (customText?: string) => void;
  handleAddChatbotMessageToNotes: (text?: string) => void;
  handleSelectChatSuggestion: (sug: ChatbotSuggestion, msgId: string) => void;
  chatbotPreSelectedCollab: string;
  setChatbotPreSelectedCollab: (c: string) => void;
  chatbotPreSelectedLocation: string;
  setChatbotPreSelectedLocation: (l: string) => void;
  collaborators: string[];
  favoriteLocations: string[];
  triggerHaptic?: (type?: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
}

export const GeminiChatbotDialog: React.FC<GeminiChatbotDialogProps> = ({
  isOpen,
  onClose,
  isDark,
  chatbotMessages,
  setChatbotMessages,
  chatbotInput,
  setChatbotInput,
  isChatbotLoading,
  chatbotVoiceError,
  isChatbotVoiceListening,
  startChatbotVoiceCapture,
  stopChatbotVoiceCapture,
  handleSendChatbotMessage,
  handleAddChatbotMessageToNotes,
  handleSelectChatSuggestion,
  chatbotPreSelectedCollab,
  setChatbotPreSelectedCollab,
  chatbotPreSelectedLocation,
  setChatbotPreSelectedLocation,
  collaborators,
  favoriteLocations,
  triggerHaptic = () => {},
}) => {
  const chatbotScrollRef = useRef<HTMLDivElement | null>(null);
  const chatbotInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (chatbotScrollRef.current) {
      chatbotScrollRef.current.scrollTop = chatbotScrollRef.current.scrollHeight;
    }
  }, [chatbotMessages, isChatbotLoading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        chatbotInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[508] bg-black/50 backdrop-blur-xs"
        onClick={() => {
          stopChatbotVoiceCapture();
          onClose();
        }}
      />
      <div
        id="gemini-chatbot-bubble-dialog"
        className={`fixed bottom-20 right-3 xs:bottom-24 xs:right-6 w-[340px] xs:w-[380px] sm:w-[410px] max-w-[calc(100vw-24px)] max-h-[82vh] rounded-[24px] border p-0 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(168,85,247,0.25)] z-[510] animate-fadeIn flex flex-col text-left backdrop-blur-2xl overflow-hidden ${
          isDark
            ? "bg-slate-950/95 border-purple-500/35 text-white"
            : "bg-white/95 border-purple-300 text-slate-900 shadow-2xl"
        }`}
      >
        {/* Bubble decorative tail pointing to floating trigger */}
        <div
          className={`absolute -bottom-2 right-6 w-4 h-4 rotate-45 border-r border-b ${
            isDark
              ? "bg-slate-950 border-purple-500/35"
              : "bg-white border-purple-300"
          }`}
        />

        {/* Top Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.4)] animate-pulse">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
                Gemini Assistant
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Workspace Intelligence Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setChatbotMessages([
                  {
                    id: "welcome",
                    role: "model",
                    text: "Hi! Ask me to analyze your schedule, add tasks (e.g. add task 'Title' at 3pm), or complete/delete tasks by title.",
                    timestamp: new Date(),
                  },
                ]);
                triggerHaptic("light");
              }}
              className="px-2 py-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-[8.5px] font-bold uppercase tracking-wider border border-white/5"
              title="Reset Conversation"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                stopChatbotVoiceCapture();
                onClose();
                triggerHaptic("light");
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-[9px] font-black uppercase tracking-wider border border-white/10 shadow-xs"
              title="Close Chatbot Panel"
            >
              <X size={12} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Dialog Box with Blinking Cursor & Pool Menu Pre-selector */}
        <div className="p-3 bg-slate-900/40 border-b border-white/10 shrink-0 space-y-2">
          {/* Pre-selection from Pool of Menu Values before sending */}
          <div className="flex flex-wrap items-center gap-1.5 text-left pb-1 border-b border-white/5">
            <span className="text-[8px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1">
              <Layers size={10} /> Pre-select before sending:
            </span>

            {/* Collaborator Selector */}
            <div className="relative">
              <select
                value={chatbotPreSelectedCollab}
                onChange={(e) => {
                  setChatbotPreSelectedCollab(e.target.value);
                  triggerHaptic("light");
                }}
                className={`px-2 py-0.5 pr-5 rounded-lg text-[9.5px] font-bold border outline-none appearance-none cursor-pointer ${
                  chatbotPreSelectedCollab
                    ? "bg-indigo-600/30 border-indigo-400 text-indigo-200"
                    : "bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <option value="">👤 No Collaborator</option>
                {collaborators
                  .filter((c) => c && c.toLowerCase() !== "none")
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <ChevronDown
                size={10}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              />
            </div>

            {/* Location Selector */}
            <div className="relative">
              <select
                value={chatbotPreSelectedLocation}
                onChange={(e) => {
                  setChatbotPreSelectedLocation(e.target.value);
                  triggerHaptic("light");
                }}
                className={`px-2 py-0.5 pr-5 rounded-lg text-[9.5px] font-bold border outline-none appearance-none cursor-pointer ${
                  chatbotPreSelectedLocation
                    ? "bg-rose-600/30 border-rose-400 text-rose-200"
                    : "bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <option value="">📍 No Location</option>
                {favoriteLocations
                  .filter((loc) => loc && loc.toLowerCase() !== "none")
                  .map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
              </select>
              <ChevronDown
                size={10}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              />
            </div>

            {/* Active Selection Chips */}
            {(chatbotPreSelectedCollab || chatbotPreSelectedLocation) && (
              <div className="flex items-center gap-1 ml-auto">
                {chatbotPreSelectedCollab && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[8.5px] font-bold">
                    <User size={8} /> {chatbotPreSelectedCollab}
                    <button
                      type="button"
                      onClick={() => setChatbotPreSelectedCollab("")}
                      className="hover:text-white ml-0.5"
                    >
                      <X size={8} />
                    </button>
                  </span>
                )}
                {chatbotPreSelectedLocation && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[8.5px] font-bold">
                    <MapPin size={8} /> {chatbotPreSelectedLocation}
                    <button
                      type="button"
                      onClick={() => setChatbotPreSelectedLocation("")}
                      className="hover:text-white ml-0.5"
                    >
                      <X size={8} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
          {chatbotVoiceError && (
            <div className="px-1 pb-2 text-[8.5px] text-rose-400 font-bold uppercase tracking-wider text-center">
              {chatbotVoiceError}
            </div>
          )}
          {isChatbotVoiceListening && (
            <div className="px-1 pb-2 text-[9px] text-indigo-400 font-black uppercase tracking-wider animate-pulse text-center">
              🎤 Listening to voice query... Speak now!
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatbotMessage();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              ref={chatbotInputRef}
              type="text"
              value={chatbotInput}
              onChange={(e) => setChatbotInput(e.target.value)}
              placeholder={
                isChatbotLoading
                  ? "Gemini is analyzing..."
                  : "Ask Gemini or type: complete 'Task' | delete 'Task'..."
              }
              disabled={isChatbotLoading}
              autoFocus
              className="flex-1 bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition-all font-sans"
            />

            {/* Voice input button */}
            <button
              type="button"
              onClick={isChatbotVoiceListening ? stopChatbotVoiceCapture : startChatbotVoiceCapture}
              disabled={isChatbotLoading}
              className={`w-8 h-8 border rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-35 ${
                isChatbotVoiceListening
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                  : "bg-slate-950 border-white/10 text-indigo-400 hover:text-indigo-300"
              }`}
              title={isChatbotVoiceListening ? "Stop listening" : "Ask by Voice"}
            >
              {isChatbotVoiceListening ? <MicOff size={13} /> : <Mic size={13} />}
            </button>

            {/* Submit send button */}
            <button
              type="submit"
              disabled={isChatbotLoading || !chatbotInput.trim()}
              className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-indigo-600 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-35 disabled:pointer-events-none shadow-md shadow-purple-500/20"
              title="Send Query"
            >
              <Send size={13} />
            </button>
          </form>

          {/* Quick Action: Add Last Result to Notes */}
          <div className="pt-1 flex items-center">
            <button
              type="button"
              onClick={() => handleAddChatbotMessageToNotes()}
              disabled={!chatbotMessages.some((m) => m.role === "model")}
              className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between gap-1.5 cursor-pointer active:scale-98 ${
                chatbotMessages.some((m) => m.role === "model")
                  ? "bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-purple-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 hover:text-white border border-purple-400/40 shadow-xs"
                  : "bg-slate-950/40 border border-white/5 text-slate-600 cursor-not-allowed opacity-40"
              }`}
              title="Convert and format the last AI chatbot response into clean bullet points and save directly to Notes Repository"
            >
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-purple-400 shrink-0" />
                <span>Add Last Result to Notes</span>
              </div>
              <span className="text-[7.5px] font-mono px-1.5 py-0.2 rounded-md bg-purple-950/80 text-purple-300 border border-purple-400/30 shrink-0">
                • Bullet Points
              </span>
            </button>
          </div>
        </div>

        {/* Two Suggestions for Queries as Shortcut Instant Press Hyperlinks */}
        <div className="px-3.5 py-2.5 bg-slate-950 border-b border-white/5 shrink-0 flex flex-col gap-1.5 text-left">
          <span className="text-[7.5px] font-black uppercase text-purple-300/80 tracking-wider">
            Suggested Shortcut Queries
          </span>
          <a
            href="#query-schedule-analysis"
            id="gemini-chatbot-suggestion-1"
            onClick={(e) => {
              e.preventDefault();
              triggerHaptic("light");
              handleSendChatbotMessage("Analyze today's schedule for conflicts and optimal flow");
            }}
            className="text-[11px] font-medium text-indigo-400 hover:text-indigo-200 active:text-purple-300 underline underline-offset-2 decoration-indigo-400/40 hover:decoration-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer text-left group"
          >
            <Sparkles
              size={11}
              className="text-purple-400 shrink-0 group-hover:scale-110 transition-transform"
            />
            <span className="truncate">"Analyze today's schedule for conflicts & flow"</span>
          </a>
          <a
            href="#query-top-priorities"
            id="gemini-chatbot-suggestion-2"
            onClick={(e) => {
              e.preventDefault();
              triggerHaptic("light");
              handleSendChatbotMessage(
                "What are my highest priority tasks and open time gaps today?"
              );
            }}
            className="text-[11px] font-medium text-indigo-400 hover:text-indigo-200 active:text-purple-300 underline underline-offset-2 decoration-indigo-400/40 hover:decoration-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer text-left group"
          >
            <Sparkles
              size={11}
              className="text-pink-400 shrink-0 group-hover:scale-110 transition-transform"
            />
            <span className="truncate">"What are my top priority tasks & open gaps today?"</span>
          </a>
        </div>

        {/* Scrollable Conversation Output Area */}
        <div
          ref={chatbotScrollRef}
          className="flex-1 p-3.5 overflow-y-auto space-y-3 max-h-[260px] min-h-[120px] text-left"
        >
          {chatbotMessages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1 max-w-[90%] ${
                  isUser ? "self-end items-end ml-auto" : "self-start items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-[11px] leading-relaxed select-text ${
                    isUser
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-xs shadow-md border border-indigo-450/10 text-right"
                      : "bg-slate-900/85 border border-white/10 text-slate-100 rounded-tl-xs text-left"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Action button inside AI response bubble to save to notes */}
                  {!isUser && msg.text && (
                    <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddChatbotMessageToNotes(msg.text)}
                        className="text-[9px] font-bold text-purple-300 hover:text-purple-100 flex items-center gap-1 cursor-pointer py-0.5 px-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all active:scale-95"
                        title="Save this AI response formatted as bullet points in Notes Repository"
                      >
                        <FileText size={10} />
                        <span>Add to Notes as Bullets</span>
                      </button>
                    </div>
                  )}

                  {/* Interactive "Did you mean..." selectable suggestions */}
                  {(() => {
                    let suggestionsToRender = msg.suggestions ? [...msg.suggestions] : [];
                    if (
                      suggestionsToRender.length === 0 &&
                      msg.role === "model" &&
                      /did you mean/i.test(msg.text)
                    ) {
                      const qMatches = msg.text.match(/"([^"]+)"|'([^']+)'/g);
                      if (qMatches) {
                        qMatches.forEach((rawQ) => {
                          const clean = rawQ.replace(/^["']|["']$/g, "").trim();
                          if (collaborators.includes(clean)) {
                            suggestionsToRender.push({
                              type: "collaborator",
                              value: clean,
                              originalQuery: "",
                            });
                          } else if (favoriteLocations.includes(clean)) {
                            suggestionsToRender.push({
                              type: "location",
                              value: clean,
                              originalQuery: "",
                            });
                          }
                        });
                      }
                      collaborators.forEach((col) => {
                        if (
                          col &&
                          new RegExp(
                            "\\b" + col.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b",
                            "i"
                          ).test(msg.text)
                        ) {
                          if (
                            !suggestionsToRender.some(
                              (s) => s.value.toLowerCase() === col.toLowerCase()
                            )
                          ) {
                            suggestionsToRender.push({
                              type: "collaborator",
                              value: col,
                              originalQuery: "",
                            });
                          }
                        }
                      });
                      favoriteLocations.forEach((loc) => {
                        if (
                          loc &&
                          new RegExp(
                            "\\b" + loc.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b",
                            "i"
                          ).test(msg.text)
                        ) {
                          if (
                            !suggestionsToRender.some(
                              (s) => s.value.toLowerCase() === loc.toLowerCase()
                            )
                          ) {
                            suggestionsToRender.push({
                              type: "location",
                              value: loc,
                              originalQuery: "",
                            });
                          }
                        }
                      });
                    }

                    if (suggestionsToRender.length === 0) return null;

                    return (
                      <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5 text-left">
                        <div className="flex items-center gap-1 text-[8.5px] font-black uppercase text-amber-300 tracking-wider">
                          <Sparkles size={10} className="text-amber-400" />
                          <span>Click to select choice for notes:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestionsToRender.map((sug, sIdx) => {
                            const isCollab = sug.type === "collaborator";
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleSelectChatSuggestion(sug, msg.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500/25 to-orange-500/25 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-400/50 text-amber-200 hover:text-white"
                                title={`Select ${sug.value} (${sug.type}) and link to Note & Schedule`}
                              >
                                {isCollab ? (
                                  <User size={11} className="text-indigo-300 shrink-0" />
                                ) : (
                                  <MapPin size={11} className="text-rose-300 shrink-0" />
                                )}
                                <span>{sug.value}</span>
                                <span className="text-[7.5px] uppercase font-mono px-1 py-0.2 rounded bg-black/40 text-amber-300">
                                  {isCollab ? "Collaborator" : "Location"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Executed actions sub-list */}
                  {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-white/10 space-y-1 text-left">
                      <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
                        Actions Executed:
                      </span>
                      {msg.actionsExecuted.map((act, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400"
                        >
                          <CheckCircle2 size={9} className="shrink-0" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[7px] font-semibold text-slate-500 uppercase tracking-wide">
                  {msg.role === "user" ? "You" : "Gemini"} •{" "}
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}

          {/* Thinking loader */}
          {isChatbotLoading && (
            <div className="flex flex-col space-y-1 max-w-[90%] self-start items-start animate-pulse">
              <div className="p-3 bg-slate-900/60 border border-white/10 text-slate-300 rounded-2xl rounded-tl-xs flex items-center gap-2 text-left">
                <Loader2 size={12} className="animate-spin text-purple-400" />
                <span className="text-[10px] font-medium tracking-wide">
                  Analyzing schedule...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Retract / Close Footer */}
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-t border-white/10 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 pl-0.5">
            <Sparkles size={12} className="text-purple-400" />
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
              Gemini Chatbot
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopChatbotVoiceCapture();
              onClose();
              triggerHaptic("light");
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer shadow-sm"
            title="Close Chatbot Panel"
          >
            <ChevronDown size={13} className="text-purple-400" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </>
  );
};
