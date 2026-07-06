"use client";

import React, { useState } from "react";
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
    <aside className="w-64 border-r border-[#ececec] bg-[#f9f9f8] h-full flex flex-col select-none" id="app-sidebar">
      {/* Top Section: App Title & Model Selection */}
      <div className="p-4 border-b border-[#ececec] flex flex-col space-y-3" id="sidebar-header">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-[#6d28d9] text-white shadow-sm">
            <Sparkles size={14} />
          </div>
          <span className="font-sans font-bold text-sm text-[#1a1a1a] tracking-tight">
            Artifact Studio
          </span>
        </div>

        {/* Dynamic Model Dropdown */}
        <div className="relative" id="model-dropdown-container">
          <label className="text-[10px] text-[#8e8e8e] uppercase font-bold tracking-wider block mb-1">
            Active Intelligence
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full bg-white hover:bg-[#f3f4f6] border border-[#e0e0e0] rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-[#1a1a1a] appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-all shadow-sm"
              id="model-selector-dropdown"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Super Fast)</option>
              <option value="gemini-3.5-pro">Gemini 3.5 Pro (Ultra Smart)</option>
              <option value="antigravity-preview-05-2026">Antigravity Agent (Code & Sandbox)</option>
              <option value="deep-research-preview-04-2026">Deep Research Agent (Smart Web Engine)</option>
              <option value="deep-research-max-preview-04-2026">Deep Research Max Agent (Exhaustive Search)</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-[#8e8e8e] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Action Buttons: New Chat */}
      <div className="p-3" id="sidebar-action-container">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center space-x-2 p-2.5 bg-white hover:bg-[#f3f4f6] border border-[#e0e0e0] hover:border-[#d0d0d0] text-xs font-bold text-[#1a1a1a] rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          id="new-chat-btn"
        >
          <Plus size={14} className="text-[#6d28d9]" />
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
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#e0e0e0] focus:border-[#c0c0c0] rounded-xl text-xs focus:outline-none transition-all shadow-sm placeholder-[#999]"
          id="conversation-search"
        />
        <Search size={12} className="absolute left-5.5 top-2.5 text-[#8e8e8e]" />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-5 top-2 text-[#8e8e8e] hover:text-[#1a1a1a]"
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
              <Star size={10} className="text-amber-500 fill-amber-500" />
              <span className="text-[10px] text-[#8e8e8e] uppercase font-bold tracking-wider">
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
            <div className="flex items-center space-x-1 px-2 mb-1 pt-2 border-t border-[#ececec]/60">
              <Clock size={10} className="text-[#8e8e8e]" />
              <span className="text-[10px] text-[#8e8e8e] uppercase font-bold tracking-wider">
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
              <div className="p-4 text-center text-[11px] text-[#8e8e8e] italic select-none">
                No chats found
              </div>
            )
          )}
        </div>
      </div>
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
          className="flex items-center space-x-1 p-1 bg-white border border-blue-500 rounded-lg mx-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 text-xs bg-transparent focus:outline-none px-1 py-0.5 text-[#1a1a1a]"
            autoFocus
          />
          <button type="submit" className="text-emerald-600 hover:bg-[#ececec] p-1 rounded">
            <Check size={11} />
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="text-red-500 hover:bg-[#ececec] p-1 rounded"
          >
            <X size={11} />
          </button>
        </form>
      );
    }

    if (isConfirmingDelete) {
      return (
        <div
          className="flex items-center justify-between p-1.5 bg-red-50 border border-red-200 text-[10px] font-semibold text-red-700 rounded-lg mx-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Delete thread?</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => confirmDelete(conv.id, e)}
              className="bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 font-bold"
            >
              Yes
            </button>
            <button
              onClick={cancelDelete}
              className="bg-white border border-red-200 px-2 py-0.5 rounded hover:bg-[#ececec] text-[#333] font-bold"
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
            ? "bg-white text-[#1a1a1a] shadow-sm border border-[#ececec] font-semibold"
            : "text-[#555] hover:bg-[#ececec]/60 hover:text-[#1a1a1a] border border-transparent"
        }`}
        title={conv.title}
      >
        <div className="flex items-center space-x-2 overflow-hidden w-full pr-12">
          <MessageSquare size={13} className={`flex-shrink-0 ${isActive ? "text-[#6d28d9]" : "text-[#8e8e8e]"}`} />
          <span className="truncate pr-2">{conv.title}</span>
        </div>

        {/* Action icons, only visible on item hover */}
        <div className="absolute right-1.5 top-1.5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-[#f9f9f8] group-hover:from-white/10 pl-4 py-0.5">
          <button
            onClick={(e) => togglePin(conv, e)}
            className="p-1 rounded text-[#8e8e8e] hover:text-amber-500 hover:bg-[#ececec] transition-colors"
            title={conv.pinned ? "Unpin thread" : "Pin thread"}
          >
            <Pin size={11} className={conv.pinned ? "fill-amber-500 text-amber-500" : ""} />
          </button>
          <button
            onClick={(e) => startRename(conv, e)}
            className="p-1 rounded text-[#8e8e8e] hover:text-[#1a1a1a] hover:bg-[#ececec] transition-colors"
            title="Rename thread"
          >
            <Edit2 size={11} />
          </button>
          <button
            onClick={(e) => handleDeleteClick(conv.id, e)}
            className="p-1 rounded text-[#8e8e8e] hover:text-red-500 hover:bg-[#ececec] transition-colors"
            title="Delete thread"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  }
}
