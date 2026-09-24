'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Brain,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  summary?: string;
  is_shared: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface SidebarProps {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onOpenMemory: () => void;
  refreshTrigger?: number;
}

export default function Sidebar({
  activeConversationId,
  onSelect,
  onNewChat,
  onOpenMemory,
  refreshTrigger = 0,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { apiFetch } = useApi();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/conversations/?search=${encodeURIComponent(search)}`);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [apiFetch, search]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations, refreshTrigger]);

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await apiFetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
      );
      setEditingId(null);
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        onNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-white/5 bg-[#070b14] transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Collapse toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-gray-900 text-white/50 hover:bg-violet-600 hover:text-white transition-all shadow-md"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Top Header & New Chat */}
      <div className="p-3 border-b border-white/5">
        <button
          onClick={onNewChat}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 font-medium text-white shadow-lg shadow-violet-600/20 transition-all hover:brightness-110 active:scale-[0.98] ${
            isCollapsed ? 'p-2.5' : ''
          }`}
          title="New Chat"
        >
          <Plus size={18} />
          {!isCollapsed && <span className="text-sm">New Chat</span>}
        </button>

        {!isCollapsed && (
          <div className="relative mt-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-xs text-white placeholder-white/25 outline-none transition-colors focus:border-violet-500/50"
            />
          </div>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          !isCollapsed && (
            <div className="px-3 py-8 text-center text-xs text-white/30">
              No conversations found
            </div>
          )
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = conv.id === editingId;

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`group relative flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all ${
                  isActive
                    ? 'bg-violet-600/20 text-white border border-violet-500/30'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                title={conv.title}
              >
                <MessageSquare
                  size={16}
                  className={`shrink-0 ${
                    isActive ? 'text-violet-400' : 'text-white/40 group-hover:text-white/70'
                  }`}
                />

                {!isCollapsed && (
                  <>
                    {isEditing ? (
                      <div
                        className="flex flex-1 items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="w-full rounded-md border border-violet-500/50 bg-black/50 px-2 py-0.5 text-xs text-white outline-none"
                        />
                        <button
                          onClick={(e) => handleSaveRename(conv.id, e)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-1 text-white/40 hover:text-white/70"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-xs font-medium">
                          {conv.title}
                        </span>

                        {/* Actions (visible on hover or active) */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleStartRename(conv, e)}
                            className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                            title="Rename chat"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeletingId(conv.id);
                            }}
                            className="rounded p-1 text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Delete chat"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Delete confirmation popup */}
                {isDeletingId === conv.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full z-30 mt-1 flex items-center gap-2 rounded-lg border border-red-500/30 bg-gray-900 p-2 shadow-xl backdrop-blur-md"
                  >
                    <span className="text-xs text-white/80">Delete?</span>
                    <button
                      onClick={(e) => handleDelete(conv.id, e)}
                      className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-500"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setIsDeletingId(null)}
                      className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-white/60 hover:text-white"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Memory Manager Button */}
      <div className="p-2 border-t border-white/5">
        <button
          onClick={onOpenMemory}
          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-violet-300/80 transition-all hover:bg-violet-600/10 hover:text-violet-200 border border-violet-500/20 ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Memory Manager"
        >
          <Brain size={16} className="text-violet-400 shrink-0" />
          {!isCollapsed && <span>AI Memories</span>}
        </button>
      </div>

      {/* User profile & Logout */}
      {user && (
        <div className="border-t border-white/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="truncate text-xs font-semibold text-white/90">
                  {user.name}
                </div>
                <div className="truncate text-[10px] text-white/40">
                  {user.email}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
