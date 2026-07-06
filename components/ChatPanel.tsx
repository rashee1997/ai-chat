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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
        return <FileText size={18} className="text-slate-500" />;
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
    <div className="flex flex-col h-full bg-[#f9f9f8] relative border-r border-[#ececec]" id="chat-panel-root">
      {/* Scrollable Messages container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text" ref={scrollRef} id="chat-messages-container">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="h-full flex flex-col justify-center items-center max-w-lg mx-auto text-center space-y-8 py-12 select-none">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm border border-[#ececec] text-slate-800">
              <Sparkles size={26} className="text-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-3">
              <h1 className="font-sans font-bold text-2xl text-[#1a1a1a] tracking-tight leading-none">
                Claude Artifact Studio
              </h1>
              <p className="text-xs text-[#8e8e8e] leading-relaxed max-w-sm">
                Generate and edit stunning interactive codebases, spreadsheets, PowerPoint presentations, vector images, and diagram charts instantly.
              </p>
            </div>

            {/* Quick Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-4">
              {STARTER_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleStarterClick(prompt.text)}
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-[#fcfcfc] border border-[#ececec] hover:border-[#dcdcdc] rounded-xl text-xs text-left text-slate-700 font-medium transition-all shadow-sm group cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <span className="p-1.5 bg-[#f3f4f6] rounded-lg flex-shrink-0">{prompt.icon}</span>
                    <span className="text-[#374151] truncate">{prompt.text}</span>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <span className="text-[9px] bg-[#f3f4f6] text-[#8e8e8e] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider group-hover:bg-[#ececec]">
                      {prompt.type.split(" ")[0]}
                    </span>
                    <ArrowRight size={10} className="text-[#8e8e8e] group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Stream */
          <div className="space-y-6 max-w-3xl mx-auto" id="messages-list">
            {messages.map((message) => {
              const isUser = message.role === "user";
              
              // Parse the message to see if there is an artifact contained
              const { conversationalText, artifact } = parseMessageContent(message.content);

              return (
                <div
                  key={message.id}
                  className={`flex space-x-4 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar */}
                  {!isUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#6d28d9] text-white flex items-center justify-center font-bold text-xs select-none shadow-sm">
                      AI
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className={`max-w-[85%] space-y-2 ${isUser ? "text-right" : "text-left"}`}>
                    {/* Username indicator */}
                    <div className="text-[10px] text-[#8e8e8e] font-semibold uppercase tracking-wider select-none">
                      {isUser ? "You" : "Claude Assistant"}
                    </div>

                    {/* Conversational bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? "bg-[#1a1a1a] text-white font-medium shadow-sm text-left inline-block"
                          : "bg-white text-[#374151] border border-[#ececec] shadow-sm text-left block"
                      }`}
                    >
                      {/* Render conversational paragraphs */}
                      {conversationalText ? (
                        <div className="whitespace-pre-wrap">
                          {conversationalText}
                        </div>
                      ) : (
                        !isUser && artifact && (
                          <div className="text-[#8e8e8e] italic text-xs flex items-center space-x-1.5">
                            <Loader2 size={12} className="animate-spin text-indigo-600" />
                            <span>Generating artifact workspace...</span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Inline Artifact Badge (If found) */}
                    {artifact && (
                      <div
                        onClick={() => onSelectArtifact(artifact)}
                        className={`p-3 bg-white border rounded-xl flex items-center justify-between cursor-pointer shadow-sm transition-all duration-200 text-left ${
                          activeArtifactId === artifact.id
                            ? "border-[#6d28d9] ring-1 ring-[#6d28d9]/20"
                            : "border-[#ececec] hover:border-[#dcdcdc]"
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
                            <div className="text-xs font-semibold text-[#1a1a1a] truncate tracking-tight">
                              {artifact.title}
                            </div>
                            <div className="text-[10px] text-[#8e8e8e] font-medium">
                              {getArtifactTypeName(artifact.type)} • {artifact.isComplete ? "Click to open view" : "In progress..."}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 bg-[#f9f9f8] hover:bg-[#ececeb] rounded-lg border border-[#e0e0e0] text-[#374151] transition-colors flex-shrink-0">
                          {artifact.isComplete ? (
                            <>
                              <span>View</span>
                              <ArrowRight size={10} className="text-[#8e8e8e]" />
                            </>
                          ) : (
                            <div className="flex items-center space-x-1 text-[#6d28d9]">
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e0e0e0] text-[#555] flex items-center justify-center font-bold text-xs select-none shadow-sm">
                      U
                    </div>
                  )}
                </div>
              );
            })}

            {/* Streaming Message Indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex space-x-4 items-start animate-pulse">
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#6d28d9] text-white flex items-center justify-center font-bold text-xs select-none shadow-sm">
                  AI
                </div>
                <div className="space-y-2 w-full">
                  <div className="text-[10px] text-[#8e8e8e] font-semibold uppercase tracking-wider select-none">
                    Claude Assistant
                  </div>
                  <div className="px-4 py-3 bg-white border border-[#ececec] rounded-2xl shadow-sm max-w-sm flex items-center space-x-2">
                    <Loader2 size={14} className="animate-spin text-slate-500" />
                    <span className="text-xs text-slate-500 font-medium">Drafting workspace...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input panel block */}
      <div className="p-6 bg-white border-t border-[#ececec]" id="chat-input-container">
        <form onSubmit={handleLocalSubmit} className="max-w-2xl mx-auto relative" id="chat-input-form">
          
          {/* File Upload Attachment Preview Strip */}
          {attachedFile && (
            <div className="flex items-center space-x-2 p-2 bg-[#f9f9f8] border border-[#ececec] rounded-xl mb-2 max-w-xs relative animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-sm">
              {attachedFile.type.startsWith("image/") ? (
                <img src={attachedFile.content} className="w-9 h-9 object-cover rounded-lg border border-[#ececec]" />
              ) : (
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></div>
              )}
              <div className="flex-1 min-w-0 pr-6">
                <div className="text-xs font-bold text-slate-800 truncate">{attachedFile.name}</div>
                <div className="text-[9px] text-[#8e8e8e] uppercase font-semibold">
                  {attachedFile.type.split("/")[1] || "document"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="absolute top-1 right-1 p-1 text-slate-400 hover:text-slate-600 hover:bg-[#ececec] rounded-full cursor-pointer"
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
              className="absolute left-3 bottom-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-[#f3f4f6] transition-colors rounded-xl cursor-pointer"
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
              className="w-full p-4 pl-12 pr-12 bg-white border border-[#e0e0e0] rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm resize-none focus:border-blue-500 min-h-[44px] h-[52px] max-h-[140px] overflow-y-auto transition-all"
              rows={1}
              disabled={isLoading}
              id="chat-textarea"
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedFile)}
              className="absolute right-3 bottom-3 p-2 bg-[#1a1a1a] hover:bg-[#333] text-white disabled:opacity-40 disabled:hover:bg-[#1a1a1a] transition-all rounded-xl cursor-pointer shadow-sm animate-in zoom-in-50"
              id="send-message-btn"
            >
              <Send size={14} />
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] text-[#8e8e8e] mt-3 select-none">
          Artifacts let you dynamically preview documents, presentations, spreadsheets, flowcharts, and SVG vectors directly.
        </p>
      </div>
    </div>
  );
}
