"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, PanelLeftClose, PanelLeft, Info } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import ArtifactPanel from "@/components/ArtifactPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { Message, Artifact } from "@/lib/types";
import { parseMessageContent } from "@/lib/parser";
import { DBConversation } from "@/lib/db";

export default function Home() {
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");

  // Track currently selected artifact and panel states
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [requiresActionJobId, setRequiresActionJobId] = useState<string | null>(null);

  // Track Background Managed Agent Jobs in real-time (SSE + Polling Fallback)
  const trackBackgroundJob = (jobId: string, assistantMessageId: string) => {
    setIsLoading(true);
    let eventSource: EventSource | null = null;
    let isTerminated = false;
    let pollInterval: NodeJS.Timeout | null = null;

    const cleanup = () => {
      isTerminated = true;
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setRequiresActionJobId((prev) => (prev === jobId ? null : prev));
      setIsLoading(false);
    };

    const handleJobUpdate = (data: any) => {
      if (isTerminated) return;

      console.info("Job status update received:", jobId, data);

      if (data.status === "completed") {
        const fullOutput = data.result || (data.resultJson ? JSON.parse(data.resultJson).text : "");
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: fullOutput } : msg
          )
        );

        const { artifact } = parseMessageContent(fullOutput);
        if (artifact) {
          setActiveArtifact({ ...artifact, isComplete: true });
          setIsArtifactPanelOpen(true);
        }

        cleanup();
      } else if (data.status === "failed") {
        const errMessage = data.errorMessage || "Remote agent task failed.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: `⚠️ Background task failed: ${errMessage}` }
              : msg
          )
        );
        cleanup();
      } else if (data.status === "requires_action") {
        let actionPayload = data.actionRequired || (data.resultJson ? JSON.parse(data.resultJson) : null);
        if (typeof actionPayload === "string") {
          try {
            actionPayload = JSON.parse(actionPayload);
          } catch (e) {}
        }
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `⚙️ **Action Required**: The remote agent requires your approval or input to proceed.\n\nType: \`${actionPayload?.type || "collaborative_research_checkpoint"}\`\nDescription: \`${actionPayload?.description || "Awaiting research plan confirmation."}\`\n\n*(Type your response below to resume the job)*`,
                }
              : msg
          )
        );
        setRequiresActionJobId(jobId);
        setIsLoading(false);
      } else {
        setRequiresActionJobId((prev) => (prev === jobId ? null : prev));
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `⚙️ [Background Agent: ${data.status || "Executing"}] Running remote operations... please stand by.`,
                }
              : msg
          )
        );
      }
    };

    try {
      eventSource = new EventSource(`/api/jobs/stream?jobId=${jobId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "job_updated" && payload.data) {
            handleJobUpdate(payload.data);
          }
        } catch (e) {
          console.error("Failed to parse SSE payload", e);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("SSE stream closed or error, starting fallback HTTP polling.");
        if (eventSource) {
          eventSource.close();
        }
        startPolling();
      };
    } catch (e) {
      console.warn("Failed to initiate EventSource, starting polling fallback.", e);
      startPolling();
    }

    function startPolling() {
      if (isTerminated) return;
      if (pollInterval) clearInterval(pollInterval);

      pollInterval = setInterval(async () => {
        if (isTerminated) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        try {
          const res = await fetch(`/api/jobs/${jobId}`);
          if (res.ok) {
            const data = await res.json();
            const job = data.job;
            if (job) {
              handleJobUpdate(job);
              if (["completed", "failed"].includes(job.status)) {
                cleanup();
              }
            }
          }
        } catch (e) {
          console.error("Failed to poll job status:", e);
        }
      }, 4000);
    }
  };

  // 1. Fetch conversations on initial mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          const list: DBConversation[] = data.conversations || [];
          setConversations(list);

          // If there are conversations, select the first one; otherwise create a new one!
          if (list.length > 0) {
            handleSelectConversation(list[0].id);
          } else {
            handleCreateConversation();
          }
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    };

    fetchConversations();
  }, []);

  // Cmd/Ctrl+K: open the sidebar (if collapsed) and focus conversation search.
  // Escape: close the mobile sidebar drawer (a no-op on desktop/when already closed).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSidebarOpen(true);
        requestAnimationFrame(() => {
          document.getElementById("conversation-search")?.focus();
        });
      } else if (e.key === "Escape" && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // The sidebar defaults to open for the persistent desktop column, but below
  // `lg` it renders as an overlay drawer — correct that on mount so a phone
  // doesn't load with the drawer already covering the screen.
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  // 2. Select conversation and fetch its messages
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setIsLoading(true);
    setMessages([]);
    setActiveArtifact(null);
    setIsArtifactPanelOpen(false);
    setRequiresActionJobId(null);

    try {
      const res = await fetch(`/api/conversations?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        // Convert dates from ISO string to Date objects
        const loadedMessages = (data.messages || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(loadedMessages);

        if (data.conversation) {
          setSelectedModel(data.conversation.model || "gemini-3.5-flash");
        }

        // Auto-detect the last artifact in this conversation to restore layout preview state
        let foundArtifact = null;
        for (let i = loadedMessages.length - 1; i >= 0; i--) {
          const { artifact } = parseMessageContent(loadedMessages[i].content);
          if (artifact) {
            foundArtifact = artifact;
            break;
          }
        }

        if (foundArtifact) {
          setActiveArtifact({ ...foundArtifact, isComplete: true });
          setIsArtifactPanelOpen(true);
        }

        // Auto-reconnect to any active background jobs for this conversation
        try {
          const jobsRes = await fetch(`/api/jobs?conversationId=${id}`);
          if (jobsRes.ok) {
            const jobsData = await jobsRes.json();
            const jobs = jobsData.jobs || [];
            const activeJobs = jobs.filter((j: any) =>
              ["queued", "in_progress", "requires_action"].includes(j.status)
            );
            for (const activeJob of activeJobs) {
              if (activeJob.messageId) {
                trackBackgroundJob(activeJob.id, activeJob.messageId);
              }
            }
          }
        } catch (jobErr) {
          console.error("Failed to restore background jobs:", jobErr);
        }
      }
    } catch (err) {
      console.error("Failed to load conversation details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Create a brand new conversation
  const handleCreateConversation = async () => {
    const id = `chat-${Date.now()}`;
    const defaultTitle = "New Chat";

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          id,
          title: defaultTitle,
          model: selectedModel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newConv = data.conversation;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(id);
        setMessages([]);
        setActiveArtifact(null);
        setIsArtifactPanelOpen(false);
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  // 4. Update conversation parameters (title, pin, model)
  const handleUpdateConversation = async (id: string, updates: { title?: string; pinned?: boolean; model?: string }) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id,
          ...updates,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.conversation;

        setConversations((prev) =>
          prev
            .map((c) => (c.id === id ? updated : c))
            .sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
        );

        if (updates.model) {
          setSelectedModel(updates.model);
        }
      }
    } catch (err) {
      console.error("Failed to update conversation:", err);
    }
  };

  // 5. Delete a conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id,
        }),
      });

      if (res.ok) {
        const remaining = conversations.filter((c) => c.id !== id);
        setConversations(remaining);

        if (activeConversationId === id) {
          if (remaining.length > 0) {
            handleSelectConversation(remaining[0].id);
          } else {
            handleCreateConversation();
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // 6. Handle streaming Chat response
  const handleChatStream = async (chatHistory: Message[]) => {
    if (!activeConversationId) return;
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
        body: JSON.stringify({
          messages: chatHistory,
          conversationId: activeConversationId,
          model: selectedModel,
        }),
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

        // Check if a background agent job was initiated
        const jobStartedMatch = accumulatedText.match(/\[agent_job_started:\s*([^\]]+)\]/);
        if (jobStartedMatch) {
          const jobId = jobStartedMatch[1];
          trackBackgroundJob(jobId, assistantMessageId);
          break;
        }

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

      // Reload conversations to sync sidebar updatedAt field and order
      const resConv = await fetch("/api/conversations");
      if (resConv.ok) {
        const data = await resConv.json();
        setConversations(data.conversations || []);
      }

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

  // 7. Submit user message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeConversationId) return;

    const userMessage: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput("");

    // Auto-update conversation title if it is currently a placeholder
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    if (activeConv && activeConv.title === "New Chat") {
      const draftTitle = input.trim().substring(0, 32) + (input.trim().length > 32 ? "..." : "");
      handleUpdateConversation(activeConversationId, { title: draftTitle });
    }

    if (requiresActionJobId) {
      setIsLoading(true);

      // Save user message to database manually
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveMessage",
          conversationId: activeConversationId,
          message: userMessage,
        }),
      });

      try {
        // Resume the remote agent job
        const res = await fetch(`/api/jobs/${requiresActionJobId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: userMessage.content }),
        });

        if (res.ok) {
          setRequiresActionJobId(null);
        } else {
          console.error("Failed to resume job:", res.statusText);
        }
      } catch (err) {
        console.error("Error resuming job:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Start stream
    handleChatStream(updatedHistory);
  };

  // 8. Callback to handle changes inside the active artifact (code/JSON updates)
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

  const handleClearWorkspace = async () => {
    if (confirm("Are you sure you want to clear all conversations and history?")) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear" }),
        });
        if (res.ok) {
          setConversations([]);
          setActiveConversationId(null);
          setMessages([]);
          setActiveArtifact(null);
          setIsArtifactPanelOpen(false);
          handleCreateConversation();
        }
      } catch (err) {
        console.error("Failed to clear data:", err);
      }
    }
  };

  // Below the `lg` breakpoint the sidebar is an overlay drawer, not a
  // persistent column, so picking a conversation should close it again.
  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-surface text-on-surface overflow-hidden" id="app-root-viewport">
      {/* 1. Left Sidebar Panels — persistent column at lg: and up, an
          off-canvas overlay drawer with backdrop below that. */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-40 lg:static lg:z-auto">
            <Sidebar
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={(id) => {
                handleSelectConversation(id);
                closeSidebarOnMobile();
              }}
              onCreate={() => {
                handleCreateConversation();
                closeSidebarOnMobile();
              }}
              onUpdate={handleUpdateConversation}
              onDelete={handleDeleteConversation}
              selectedModel={selectedModel}
              onModelChange={(model) => {
                setSelectedModel(model);
                if (activeConversationId) {
                  handleUpdateConversation(activeConversationId, { model });
                }
              }}
            />
          </div>
        </>
      )}

      {/* 2. Main Content Layout Area */}
      <div className="flex-1 flex flex-col min-w-0" id="main-layout-container">
        {/* Universal Top Navigation Header */}
        <header className="bg-surface-raised border-b border-border px-6 py-3.5 flex items-center justify-between shadow-[var(--shadow-sm)] z-15 select-none" id="main-header">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-surface-sunken rounded-lg border border-border text-on-surface-muted hover:text-on-surface cursor-pointer transition-colors shadow-[var(--shadow-sm)] mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
            </button>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-on-surface text-sm tracking-tight leading-none flex items-center space-x-1.5">
                <span>Claude Artifact Studio</span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold border border-primary/20">
                  V2 ACTIVE
                </span>
              </span>
              <span className="text-[10px] text-on-surface-muted font-semibold tracking-wider font-mono mt-0.5 uppercase">
                Professional Plan Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={handleClearWorkspace}
              className="flex items-center space-x-1.5 text-xs text-danger hover:text-white hover:bg-danger bg-surface-raised border border-danger/30 hover:border-danger px-3 py-1.5 rounded-lg shadow-[var(--shadow-sm)] transition-all cursor-pointer font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Wipe database completely"
            >
              <RefreshCw size={13} />
              <span>Wipe Studio DB</span>
            </button>
          </div>
        </header>

        {/* Split Main Screen Content Panel */}
        <div className="flex-1 flex overflow-hidden relative" id="split-screen-container">
          {/* Left Column: Chat panel. `@container` lets children (ChatPanel) use
              @container queries keyed to this column's own width, since it
              resizes independently of the viewport whenever the artifact
              panel opens/closes. */}
          <div
            className={`h-full transition-all duration-300 @container/chat ${
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
              className="absolute lg:static top-0 right-0 w-full lg:w-[58%] h-full z-20 lg:z-auto shadow-2xl lg:shadow-none animate-in fade-in slide-in-from-right duration-200 @container/artifact"
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
    </div>
  );
}
