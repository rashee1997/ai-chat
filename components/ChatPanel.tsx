"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { parseMessageContent } from "@/lib/parser";
import StreamingMarkdown from "@/components/StreamingMarkdown";

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
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: string } | null>(null);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing pill visibility to the scroll DOM update above
      setShowNewMessagePill(false);
    } else {
      setShowNewMessagePill(true);
    }
  }, [messages, isLoading, isPinnedToBottom]);

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

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "html":
        return <Play size={18} className="text-emerald-500" />;
      case "word":
        return <FileText size={18} className="text-blue-500" />;
      case "ppt":
        return <Presentation size={18} className="text-orange-500" />;
      case "excel":
        return <Table size={18} className="text-emerald-600" />;
      case "svg":
        return <ImageIcon size={18} className="text-purple-500" />;
      case "mermaid":
        return <GitBranch size={18} className="text-indigo-500" />;
      default:
        return <FileText size={18} className="text-on-surface-muted" />;
    }
  };

  const getArtifactTypeName = (type: string) => {
    switch (type) {
      case "html":
        return "Interactive Web App";
      case "word":
        return "Microsoft Word Document";
      case "ppt":
        return "PowerPoint Presentation";
      case "excel":
        return "Excel Spreadsheet Ledger";
      case "svg":
        return "SVG Vector Graphic";
      case "mermaid":
        return "Mermaid Graphic Diagram";
      default:
        return "Artifact Document";
    }
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
          <div className="space-y-6 max-w-3xl mx-auto" id="messages-list">
            {messages.map((message, idx) => {
              const isUser = message.role === "user";
              const isLastMessage = idx === messages.length - 1;
              const isStreamingThisMessage = isLoading && isLastMessage && !isUser;

              // Parse the message to see if there is an artifact contained
              const { conversationalText, artifact } = parseMessageContent(message.content);

              return (
                <div
                  key={message.id}
                  className={`flex space-x-4 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar */}
                  {!isUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-on-primary flex items-center justify-center font-bold text-xs select-none shadow-sm">
                      AI
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className={`max-w-[85%] space-y-2 ${isUser ? "text-right" : "text-left"}`}>
                    {/* Username indicator */}
                    <div className="text-[10px] text-on-surface-muted font-semibold uppercase tracking-wider select-none">
                      {isUser ? "You" : "Claude Assistant"}
                    </div>

                    {/* Conversational bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? "bg-on-surface text-surface font-medium shadow-sm text-left inline-block"
                          : "bg-surface-raised text-on-surface border border-border shadow-sm text-left block"
                      }`}
                    >
                      {/* Render conversational paragraphs: plain text for the user
                          (typed, not streamed, so no incomplete-markdown risk),
                          streaming-safe markdown for the assistant. */}
                      {conversationalText ? (
                        isUser ? (
                          <div className="whitespace-pre-wrap">{conversationalText}</div>
                        ) : (
                          <StreamingMarkdown content={conversationalText} isStreaming={isStreamingThisMessage} />
                        )
                      ) : (
                        !isUser && artifact && (
                          <div className="text-on-surface-muted italic text-xs flex items-center space-x-1.5">
                            <Loader2 size={12} className="animate-spin text-primary" />
                            <span>Generating artifact workspace...</span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Inline Artifact Badge (If found) */}
                    {artifact && (
                      <div
                        onClick={() => onSelectArtifact(artifact)}
                        className={`p-3 bg-surface-raised border rounded-xl flex items-center justify-between cursor-pointer shadow-sm transition-all duration-200 text-left ${
                          activeArtifactId === artifact.id
                            ? "border-primary ring-1 ring-primary/20"
                            : "border-border hover:border-on-surface-muted/40"
                        }`}
                        id={`chat-artifact-badge-${artifact.id}`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            artifact.type === "html" ? "bg-emerald-50 text-emerald-600" :
                            artifact.type === "word" ? "bg-blue-50 text-blue-600" :
                            artifact.type === "ppt" ? "bg-orange-50 text-orange-600" :
                            artifact.type === "svg" ? "bg-purple-50 text-purple-600" :
                            artifact.type === "mermaid" ? "bg-indigo-50 text-indigo-600" :
                            "bg-green-50 text-green-600"
                          }`}>
                            {getArtifactIcon(artifact.type)}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-semibold text-on-surface truncate tracking-tight">
                              {artifact.title}
                            </div>
                            <div className="text-[10px] text-on-surface-muted font-medium">
                              {getArtifactTypeName(artifact.type)} • {artifact.isComplete ? "Click to open view" : "In progress..."}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 bg-surface hover:bg-surface-sunken rounded-lg border border-border text-on-surface transition-colors flex-shrink-0">
                          {artifact.isComplete ? (
                            <>
                              <span>View</span>
                              <ArrowRight size={10} className="text-on-surface-muted" />
                            </>
                          ) : (
                            <div className="flex items-center space-x-1 text-primary">
                              <Loader2 size={10} className="animate-spin" />
                              <span className="text-[10px]">Streaming</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-border text-on-surface-muted flex items-center justify-center font-bold text-xs select-none shadow-sm">
                      U
                    </div>
                  )}
                </div>
              );
            })}

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
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleLocalSubmit(e);
                }
              }}
              placeholder="Ask me to create a document, code an SVG diagram, or design flowcharts..."
              className="w-full p-4 pl-12 pr-12 bg-surface-raised border border-border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none focus:border-primary min-h-[44px] h-[52px] max-h-[140px] overflow-y-auto transition-all"
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
