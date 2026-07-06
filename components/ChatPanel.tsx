"use client";

import React, { useState, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Send,
  Sparkles,
  FileText,
  Presentation,
  Table,
  Play,
  ArrowRight,
  Loader2,
  Paperclip,
  X,
  Image as ImageIcon,
  GitBranch,
} from "lucide-react";
import { Message, Artifact } from "@/lib/types";
import MessageRow from "@/components/MessageRow";

// Conversations shorter than this render as a plain list — virtualization only
// earns its complexity once history is long enough for it to matter.
const VIRTUALIZE_THRESHOLD = 30;

interface ChatPanelProps {
  messages: Message[];
  input: string;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onSelectArtifact: (artifact: Artifact) => void;
  activeArtifactId?: string;
}

const STARTER_PROMPTS = [
  {
    text: "Create a scientific calculator web app",
    icon: <Play size={14} className="text-emerald-500" />,
    type: "Web App",
  },
  {
    text: "Draft a Q3 Marketing Strategy Plan",
    icon: <FileText size={14} className="text-blue-500" />,
    type: "Word Doc",
  },
  {
    text: "Create a startup venture pitch deck",
    icon: <Presentation size={14} className="text-orange-500" />,
    type: "Presentation",
  },
  {
    text: "Generate a sales & growth spreadsheet ledger",
    icon: <Table size={14} className="text-emerald-600" />,
    type: "Spreadsheet",
  },
  {
    text: "Design a modern geometric logo in SVG",
    icon: <ImageIcon size={14} className="text-purple-500" />,
    type: "SVG Vector",
  },
  {
    text: "Draw a system database architecture flowchart",
    icon: <GitBranch size={14} className="text-indigo-500" />,
    type: "Mermaid Chart",
  },
];

export default function ChatPanel({
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  onSelectArtifact,
  activeArtifactId,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: string } | null>(null);

  const TEXTAREA_MAX_HEIGHT = 140;

  // Auto-grow the composer with content up to a max height, then let it
  // scroll internally instead of pushing the rest of the layout around.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [input]);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

  // Pin to bottom only while the user is already at the bottom; if they've
  // scrolled up to read history, don't yank them back down — surface a
  // "New message" pill instead.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isPinnedToBottom) {
      el.scrollTop = el.scrollHeight;
      setShowNewMessagePill(false);
    } else {
      setShowNewMessagePill(true);
    }
  }, [messages, isLoading, isPinnedToBottom]);

  // Once a conversation is long enough, virtualize the settled history so we
  // don't keep hundreds of message DOM nodes mounted. The actively-streaming
  // tail message is always excluded and rendered in full underneath — its
  // height changes on every token, which would otherwise fight the
  // virtualizer's measured offsets.
  const lastMessage = messages[messages.length - 1];
  const isStreamingTail = isLoading && !!lastMessage && lastMessage.role === "assistant";
  const shouldVirtualize = messages.length > VIRTUALIZE_THRESHOLD;
  const virtualizedCount = shouldVirtualize ? (isStreamingTail ? messages.length - 1 : messages.length) : 0;

  const rowVirtualizer = useVirtualizer({
    count: virtualizedCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 160,
    overscan: 6,
  });

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 96;
    setIsPinnedToBottom(atBottom);
    if (atBottom) setShowNewMessagePill(false);
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setIsPinnedToBottom(true);
    setShowNewMessagePill(false);
  };

  const handleStarterClick = (promptText: string) => {
    onInputChange(promptText);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file);
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          content: reader.result as string,
          type: file.type,
        });
      };
    } else {
      // Treat as plain text, CSV, markdown, etc.
      reader.readAsText(file);
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          content: reader.result as string,
          type: file.type || "text/plain",
        });
      };
    }

    // Reset input to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    let finalPrompt = input;
    if (attachedFile) {
      if (attachedFile.type.startsWith("image/")) {
        finalPrompt += `\n\n[Attached Reference Image: ${attachedFile.name}]\n(Note: I have attached an image for your reference.)`;
      } else {
        finalPrompt += `\n\n[Attached Data/Code: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
      }
    }

    onInputChange(finalPrompt);
    setAttachedFile(null);

    // Let state batch updates complete before submitting
    setTimeout(() => {
      onSubmit(e);
    }, 10);
  };

  return (
    <div className="flex flex-col h-full bg-surface relative border-r border-border" id="chat-panel-root">
      {/* Scrollable Messages container */}
      <div className="flex-1 relative overflow-hidden">
      <div
        className="h-full overflow-y-auto p-6 space-y-6 select-text"
        ref={scrollRef}
        onScroll={handleScroll}
        id="chat-messages-container"
      >
        {messages.length === 0 ? (
          /* Empty state */
          <div className="h-full flex flex-col justify-center items-center max-w-lg mx-auto text-center space-y-8 py-12 select-none">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-raised shadow-sm border border-border text-on-surface">
              <Sparkles size={26} className="text-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-3">
              <h1 className="font-sans font-bold text-2xl text-on-surface tracking-tight leading-none">
                Claude Artifact Studio
              </h1>
              <p className="text-xs text-on-surface-muted leading-relaxed max-w-sm">
                Generate and edit stunning interactive codebases, spreadsheets, PowerPoint presentations, vector images, and diagram charts instantly.
              </p>
            </div>

            {/* Quick Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-4">
              {STARTER_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleStarterClick(prompt.text)}
                  className="flex items-center justify-between p-3.5 bg-surface-raised hover:bg-surface-sunken border border-border hover:border-on-surface-muted/40 rounded-xl text-xs text-left text-on-surface font-medium transition-all shadow-sm group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <span className="p-1.5 bg-surface-sunken rounded-lg flex-shrink-0">{prompt.icon}</span>
                    <span className="text-on-surface truncate">{prompt.text}</span>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <span className="text-[9px] bg-surface-sunken text-on-surface-muted px-1.5 py-0.5 rounded font-mono uppercase tracking-wider group-hover:bg-surface-sunken/70">
                      {prompt.type.split(" ")[0]}
                    </span>
                    <ArrowRight size={10} className="text-on-surface-muted group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Stream */
          <div className="max-w-3xl mx-auto" id="messages-list">
            {shouldVirtualize ? (
              <>
                <div style={{ height: rowVirtualizer.getTotalSize(), width: "100%", position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const message = messages[virtualRow.index];
                    return (
                      <div
                        key={message.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className="pb-6"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <MessageRow
                          message={message}
                          isStreaming={false}
                          onSelectArtifact={onSelectArtifact}
                          activeArtifactId={activeArtifactId}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* The actively-streaming tail message is excluded from the
                    virtualizer above and always rendered here in full. */}
                {isStreamingTail && (
                  <MessageRow
                    message={lastMessage}
                    isStreaming
                    onSelectArtifact={onSelectArtifact}
                    activeArtifactId={activeArtifactId}
                  />
                )}
              </>
            ) : (
              <div className="space-y-6">
                {messages.map((message, idx) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    isStreaming={isLoading && idx === messages.length - 1 && message.role === "assistant"}
                    onSelectArtifact={onSelectArtifact}
                    activeArtifactId={activeArtifactId}
                  />
                ))}
              </div>
            )}

            {/* Streaming Message Indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex space-x-4 items-start animate-pulse">
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-on-primary flex items-center justify-center font-bold text-xs select-none shadow-sm">
                  AI
                </div>
                <div className="space-y-2 w-full">
                  <div className="text-[10px] text-on-surface-muted font-semibold uppercase tracking-wider select-none">
                    Claude Assistant
                  </div>
                  <div className="px-4 py-3 bg-surface-raised border border-border rounded-2xl shadow-sm max-w-sm flex items-center space-x-2">
                    <Loader2 size={14} className="animate-spin text-on-surface-muted" />
                    <span className="text-xs text-on-surface-muted font-medium">Drafting workspace...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewMessagePill && (
        <button
          onClick={jumpToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-on-surface text-surface text-xs font-semibold rounded-full shadow-[var(--shadow-md)] cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span>New message</span>
          <span aria-hidden="true">↓</span>
        </button>
      )}
      </div>

      {/* Input panel block */}
      <div className="p-6 bg-surface-raised border-t border-border" id="chat-input-container">
        <form onSubmit={handleLocalSubmit} className="max-w-2xl mx-auto relative" id="chat-input-form">
          
          {/* File Upload Attachment Preview Strip */}
          {attachedFile && (
            <div className="flex items-center space-x-2 p-2 bg-surface border border-border rounded-xl mb-2 max-w-xs relative animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-sm">
              {attachedFile.type.startsWith("image/") ? (
                <img src={attachedFile.content} className="w-9 h-9 object-cover rounded-lg border border-border" />
              ) : (
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></div>
              )}
              <div className="flex-1 min-w-0 pr-6">
                <div className="text-xs font-bold text-on-surface truncate">{attachedFile.name}</div>
                <div className="text-[9px] text-on-surface-muted uppercase font-semibold">
                  {attachedFile.type.split("/")[1] || "document"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="absolute top-1 right-1 p-1 text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="relative flex items-center">
            {/* Hidden native input for multi-modal attachments */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,text/*,.csv,.json,.pdf,.xml"
            />

            {/* Paperclip upload trigger */}
            <button
              type="button"
              onClick={handleFileUploadClick}
              disabled={isLoading}
              className="absolute left-3 bottom-3 p-2 text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken transition-colors rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Attach File / Document (CSV, Image, PDF, Code)"
            >
              <Paperclip size={16} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleLocalSubmit(e);
                }
              }}
              placeholder="Ask me to create a document, code an SVG diagram, or design flowcharts..."
              className="w-full p-4 pl-12 pr-12 bg-surface-raised border border-border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none focus:border-primary min-h-[44px] max-h-[140px] overflow-y-auto transition-all"
              rows={1}
              disabled={isLoading}
              id="chat-textarea"
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedFile)}
              className="absolute right-3 bottom-3 p-2 bg-on-surface hover:opacity-90 text-surface disabled:opacity-40 transition-all rounded-xl cursor-pointer shadow-sm animate-in zoom-in-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              id="send-message-btn"
            >
              <Send size={14} />
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] text-on-surface-muted mt-3 select-none">
          Artifacts let you dynamically preview documents, presentations, spreadsheets, flowcharts, and SVG vectors directly.
        </p>
      </div>
    </div>
  );
}
