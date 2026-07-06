"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, HelpCircle, Layers, SidebarClose, Info, RefreshCw } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import ArtifactPanel from "@/components/ArtifactPanel";
import { Message, Artifact } from "@/lib/types";
import { parseMessageContent } from "@/lib/parser";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Track currently selected artifact and its active layout view
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);

  // Parse chat stream for artifacts on-the-fly
  const handleChatStream = async (chatHistory: Message[]) => {
    setIsLoading(true);
    
    // Create placeholder assistant message
    const assistantMessageId = "assistant-" + Date.now();
    const newAssistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newAssistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) {
        throw new Error("HTTP error! status: " + response.status);
      }

      if (!response.body) {
        throw new Error("No response body available for streaming.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        accumulatedText += chunkText;

        // Update assistant message with current chunk text
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg
          )
        );

        // Parse accumulated text for any artifacts
        const { artifact } = parseMessageContent(accumulatedText);
        if (artifact) {
          setActiveArtifact(artifact);
          setIsArtifactPanelOpen(true);
        }
      }

      // Mark the active artifact as complete when the stream has ended
      setMessages((prev) => {
        const finalMsg = prev.find((m) => m.id === assistantMessageId);
        if (finalMsg) {
          const { artifact } = parseMessageContent(finalMsg.content);
          if (artifact) {
            setActiveArtifact({ ...artifact, isComplete: true });
          }
        }
        return prev;
      });

    } catch (err: any) {
      console.error("Streaming error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "⚠️ Sorry, there was an issue processing your request: " + err.message }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput("");

    // Start stream
    handleChatStream(updatedHistory);
  };

  // Callback to handle changes inside the active artifact (code/JSON updates)
  const handleArtifactContentChange = (newContent: string) => {
    if (!activeArtifact) return;
    
    // Update local state
    const updatedArtifact = { ...activeArtifact, content: newContent };
    setActiveArtifact(updatedArtifact);

    // Update the message in our conversation log that spawned this artifact so context stays in sync!
    setMessages((prev) => {
      return prev.map((msg) => {
        const { artifact } = parseMessageContent(msg.content);
        if (artifact && artifact.id === activeArtifact.id) {
          // Re-wrap updated content back into tags
          const startTag = `<artifact type="${artifact.type}" id="${artifact.id}" title="${artifact.title}">`;
          const endTag = `</artifact>`;
          const parsed = parseMessageContent(msg.content);
          
          const newContentWithTags = `${parsed.conversationalText}\n\n${startTag}\n${newContent}\n${endTag}`;
          return {
            ...msg,
            content: newContentWithTags,
          };
        }
        return msg;
      });
    });
  };

  const handleSelectArtifact = (artifact: Artifact) => {
    setActiveArtifact(artifact);
    setIsArtifactPanelOpen(true);
  };

  const handleResetChat = () => {
    setMessages([]);
    setActiveArtifact(null);
    setIsArtifactPanelOpen(false);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fdfdfd] text-[#1a1a1a] overflow-hidden" id="app-root-viewport">
      {/* Universal Top Nav */}
      <header className="bg-white border-b border-[#ececec] px-6 py-3.5 flex items-center justify-between shadow-sm z-15 select-none" id="main-header">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#6d28d9] text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-[#1a1a1a] text-sm tracking-tight leading-none">
              Claude Artifact Studio
            </span>
            <span className="text-[10px] text-[#8e8e8e] font-semibold tracking-wider font-mono mt-0.5 uppercase">
              Professional Plan Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleResetChat}
            className="flex items-center space-x-1.5 text-xs text-[#555] hover:text-[#1a1a1a] bg-white hover:bg-[#f9f9f8] border border-[#e0e0e0] px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Reset active sandbox"
          >
            <RefreshCw size={13} className="text-[#8e8e8e]" />
            <span>Reset Workspace</span>
          </button>
        </div>
      </header>

      {/* Split Main Screen Panel */}
      <div className="flex-1 flex overflow-hidden relative" id="split-screen-container">
        {/* Left Column: Chat panel */}
        <div
          className={`h-full transition-all duration-300 ${
            isArtifactPanelOpen ? "w-full lg:w-[42%]" : "w-full"
          }`}
          id="chat-column-wrapper"
        >
          <ChatPanel
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onSelectArtifact={handleSelectArtifact}
            activeArtifactId={activeArtifact?.id}
          />
        </div>

        {/* Right Column: Artifact panel (Slid-in screen) */}
        {isArtifactPanelOpen && activeArtifact && (
          <div
            className="absolute lg:static top-0 right-0 w-full lg:w-[58%] h-full z-20 lg:z-auto shadow-2xl lg:shadow-none animate-in fade-in slide-in-from-right duration-200"
            id="artifact-column-wrapper"
          >
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => setIsArtifactPanelOpen(false)}
              onContentChange={handleArtifactContentChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
