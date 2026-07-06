"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, FileText, Presentation, Table, Play, Terminal, ArrowRight, User, Loader2 } from "lucide-react";
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
    text: "Generate a Q3 Sales & Growth spreadsheet ledger",
    icon: <Table size={14} className="text-emerald-600" />,
    type: "Spreadsheet",
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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleStarterClick = (promptText: string) => {
    onInputChange(promptText);
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
      default:
        return <FileText size={18} className="text-slate-500" />;
    }
  };

  const getArtifactBadgeColors = (type: string, isActive: boolean) => {
    if (isActive) {
      return "bg-slate-100 border-slate-300 ring-1 ring-slate-400";
    }
    switch (type) {
      case "html":
        return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300";
      case "word":
        return "bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300";
      case "ppt":
        return "bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-300";
      case "excel":
        return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300";
      default:
        return "bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300";
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
              <h1 className="font-display text-2xl font-extrabold text-[#1a1a1a] tracking-tight leading-none">
                Claude Artifact Studio
              </h1>
              <p className="text-xs text-[#8e8e8e] leading-relaxed max-w-sm">
                Generate high-fidelity web prototypes, presentations, spreadsheets, and word papers seamlessly with real-time editing and downloads.
              </p>
            </div>

            {/* Quick Starters */}
            <div className="grid grid-cols-1 gap-2.5 w-full pt-4">
              {STARTER_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleStarterClick(prompt.text)}
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-[#fcfcfc] border border-[#ececec] hover:border-[#dcdcdc] rounded-xl text-xs text-left text-slate-700 font-medium transition-all shadow-sm group hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="p-1.5 bg-[#f3f4f6] rounded-lg">{prompt.icon}</span>
                    <span className="text-[#374151]">{prompt.text}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] bg-[#f3f4f6] text-[#8e8e8e] px-2 py-0.5 rounded font-mono uppercase tracking-wider group-hover:bg-[#ececec]">
                      {prompt.type}
                    </span>
                    <ArrowRight size={12} className="text-[#8e8e8e] group-hover:translate-x-1 transition-transform" />
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#6d28d9] text-white flex items-center justify-center font-bold text-xs select-none">
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
                          <div className="text-[#8e8e8e] italic text-xs">
                            Generating artifact data...
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
                            ? "border-blue-500 ring-1 ring-blue-500/20"
                            : "border-[#ececec] hover:border-[#dcdcdc]"
                        }`}
                        id={`chat-artifact-badge-${artifact.id}`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            artifact.type === "html" ? "bg-emerald-50 text-emerald-600" :
                            artifact.type === "word" ? "bg-blue-50 text-blue-600" :
                            artifact.type === "ppt" ? "bg-orange-50 text-orange-600" :
                            "bg-green-50 text-green-600"
                          }`}>
                            {getArtifactIcon(artifact.type)}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-semibold text-[#1a1a1a] truncate tracking-tight">
                              {artifact.title}
                            </div>
                            <div className="text-[10px] text-[#8e8e8e] font-medium">
                              {artifact.isComplete ? "Click to view artifact" : "In progress..."}
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
                            <div className="flex items-center space-x-1 text-blue-600">
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e0e0e0] text-[#555] flex items-center justify-center font-bold text-xs select-none">
                      U
                    </div>
                  )}
                </div>
              );
            })}

            {/* Streaming Message Indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex space-x-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#6d28d9] text-white flex items-center justify-center font-bold text-xs select-none">
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
        <form onSubmit={onSubmit} className="max-w-2xl mx-auto relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder="Ask me to create a document, analyze code, or design a slide..."
            className="w-full p-4 pr-12 bg-white border border-[#e0e0e0] rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm resize-none focus:border-blue-500 min-h-[44px] h-[52px] max-h-[140px] overflow-y-auto transition-all"
            rows={1}
            disabled={isLoading}
            id="chat-textarea"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 bottom-3 p-2 bg-[#1a1a1a] hover:bg-[#333] text-white disabled:opacity-40 disabled:hover:bg-[#1a1a1a] transition-all rounded-xl cursor-pointer shadow-sm"
            id="send-message-btn"
          >
            <Send size={14} />
          </button>
        </form>

        <p className="text-center text-[10px] text-[#8e8e8e] mt-3 select-none">
          Artifacts help me display complex visual content and code alongside our chat.
        </p>
      </div>
    </div>
  );
}
