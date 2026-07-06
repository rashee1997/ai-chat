"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  MessageSquare,
  Check,
  X,
  Sparkles,
  ChevronDown,
  Clock,
  Archive,
  Star,
} from "lucide-react";
import { DBConversation } from "@/lib/db";

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_WIDTH_STORAGE_KEY = "sidebar-width";

interface SidebarProps {
  conversations: DBConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onUpdate: (id: string, updates: { title?: string; pinned?: boolean; model?: string }) => void;
  onDelete: (id: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  selectedModel,
  onModelChange,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const isResizing = useRef(false);

  // Restore a remembered width (desktop-only resizing; see the drag handle below).
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (!Number.isNaN(parsed)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a value persisted outside React (localStorage)
      setWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed)));
    }
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isResizing.current) return;
      setWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX)));
    };
    const handlePointerUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(w));
        return w;
      });
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleResizeStart = () => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter((c) => c.pinned);
  const regularConversations = filteredConversations.filter((c) => !c.pinned);

  const startRename = (conv: DBConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onUpdate(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const togglePin = (conv: DBConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(conv.id, { pinned: !conv.pinned });
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
    setConfirmDeleteId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <aside
      style={{ width, maxWidth: "100vw" }}
      className="relative flex-shrink-0 border-r border-border bg-surface-sunken h-full flex flex-col select-none"
      id="app-sidebar"
    >
      {/* App Title — fixed to the same height as the main app header so the
          border line between sidebar and content runs continuously instead
          of stepping, which is what made the sidebar read as a separate,
          disconnected panel rather than part of one layout. */}
      <div className="h-14 flex-shrink-0 px-3 border-b border-border flex items-center" id="sidebar-header">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-primary text-on-primary shadow-sm">
            <Sparkles size={14} />
          </div>
          <span className="font-sans font-bold text-sm text-on-surface tracking-tight">
            Artifact Studio
          </span>
        </div>
      </div>

      {/* Model Selection */}
      <div className="p-3 border-b border-border" id="model-dropdown-container">
        <label className="text-[10px] text-on-surface-muted uppercase font-bold tracking-wider block mb-1">
          Active Intelligence
        </label>
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full bg-surface-raised hover:bg-surface-sunken border border-border rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all shadow-sm"
            id="model-selector-dropdown"
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (Super Fast)</option>
            <option value="gemini-3.5-pro">Gemini 3.5 Pro (Ultra Smart)</option>
            <option value="antigravity-preview-05-2026">Antigravity Agent (Code & Sandbox)</option>
            <option value="deep-research-preview-04-2026">Deep Research Agent (Smart Web Engine)</option>
            <option value="deep-research-max-preview-04-2026">Deep Research Max Agent (Exhaustive Search)</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-on-surface-muted pointer-events-none" />
        </div>
      </div>

      {/* Action Buttons: New Chat */}
      <div className="p-3" id="sidebar-action-container">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center space-x-2 p-2.5 bg-surface-raised hover:bg-surface-sunken border border-border hover:border-on-surface-muted/40 text-xs font-bold text-on-surface rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          id="new-chat-btn"
        >
          <Plus size={14} className="text-primary" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-3 pb-2 relative" id="sidebar-search-container">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats..."
          className="w-full pl-8 pr-3 py-1.5 bg-surface-raised border border-border focus:border-on-surface-muted/40 rounded-xl text-xs focus:outline-none transition-all shadow-sm placeholder-on-surface-muted"
          id="conversation-search"
        />
        <Search size={12} className="absolute left-5.5 top-2.5 text-on-surface-muted" />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-5 top-2 text-on-surface-muted hover:text-on-surface"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2" id="sidebar-threads-scroll">
        {/* Pinned Chats */}
        {pinnedConversations.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center space-x-1 px-2 mb-1">
              <Star size={10} className="text-warning fill-warning" />
              <span className="text-[10px] text-on-surface-muted uppercase font-bold tracking-wider">
                Pinned
              </span>
            </div>
            {pinnedConversations.map((conv) => (
              <div key={conv.id} className="relative group">
                {renderItem(conv)}
              </div>
            ))}
          </div>
        )}

        {/* Regular Chats */}
        <div className="space-y-1">
          {pinnedConversations.length > 0 && regularConversations.length > 0 && (
            <div className="flex items-center space-x-1 px-2 mb-1 pt-2 border-t border-border/60">
              <Clock size={10} className="text-on-surface-muted" />
              <span className="text-[10px] text-on-surface-muted uppercase font-bold tracking-wider">
                Recent Chats
              </span>
            </div>
          )}
          {regularConversations.length > 0 ? (
            regularConversations.map((conv) => (
              <div key={conv.id} className="relative group">
                {renderItem(conv)}
              </div>
            ))
          ) : (
            filteredConversations.length === 0 && (
              <div className="p-4 text-center text-[11px] text-on-surface-muted italic select-none">
                No chats found
              </div>
            )
          )}
        </div>
      </div>

      {/* Desktop-only drag handle to resize the sidebar; width is remembered
          per session via localStorage. */}
      <div
        onPointerDown={handleResizeStart}
        className="hidden lg:block absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10 touch-none"
        title="Drag to resize sidebar"
      />
    </aside>
  );

  function renderItem(conv: DBConversation) {
    const isActive = activeId === conv.id;
    const isEditing = editingId === conv.id;
    const isConfirmingDelete = confirmDeleteId === conv.id;

    if (isEditing) {
      return (
        <form
          onSubmit={(e) => saveRename(conv.id, e)}
          className="flex items-center space-x-1 p-1 bg-surface-raised border border-primary rounded-lg mx-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 text-xs bg-transparent focus:outline-none px-1 py-0.5 text-on-surface"
            autoFocus
          />
          <button type="submit" className="text-emerald-600 hover:bg-surface-sunken p-1 rounded">
            <Check size={11} />
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="text-danger hover:bg-surface-sunken p-1 rounded"
          >
            <X size={11} />
          </button>
        </form>
      );
    }

    if (isConfirmingDelete) {
      return (
        <div
          className="flex items-center justify-between p-1.5 bg-danger-surface border border-danger/30 text-[10px] font-semibold text-danger rounded-lg mx-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Delete thread?</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => confirmDelete(conv.id, e)}
              className="bg-danger text-on-primary px-2 py-0.5 rounded hover:bg-danger/90 font-bold"
            >
              Yes
            </button>
            <button
              onClick={cancelDelete}
              className="bg-surface-raised border border-danger/30 px-2 py-0.5 rounded hover:bg-surface-sunken text-on-surface font-bold"
            >
              No
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => onSelect(conv.id)}
        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all mx-1 relative group ${
          isActive
            ? "bg-surface-raised text-on-surface shadow-sm border border-border font-semibold"
            : "text-on-surface-muted hover:bg-surface-sunken/60 hover:text-on-surface border border-transparent"
        }`}
        title={conv.title}
      >
        <div className="flex items-center space-x-2 overflow-hidden w-full pr-12">
          <MessageSquare size={13} className={`flex-shrink-0 ${isActive ? "text-primary" : "text-on-surface-muted"}`} />
          <span className="truncate pr-2">{conv.title}</span>
        </div>

        {/* Action icons, only visible on item hover */}
        <div className="absolute right-1.5 top-1.5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-surface-sunken group-hover:from-surface-raised/10 pl-4 py-0.5">
          <button
            onClick={(e) => togglePin(conv, e)}
            className="p-1 rounded text-on-surface-muted hover:text-warning hover:bg-surface-sunken transition-colors"
            title={conv.pinned ? "Unpin thread" : "Pin thread"}
          >
            <Pin size={11} className={conv.pinned ? "fill-warning text-warning" : ""} />
          </button>
          <button
            onClick={(e) => startRename(conv, e)}
            className="p-1 rounded text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken transition-colors"
            title="Rename thread"
          >
            <Edit2 size={11} />
          </button>
          <button
            onClick={(e) => handleDeleteClick(conv.id, e)}
            className="p-1 rounded text-on-surface-muted hover:text-danger hover:bg-surface-sunken transition-colors"
            title="Delete thread"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  }
}
