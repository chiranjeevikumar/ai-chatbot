'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Trash2, Plus, X, Sparkles, Tag, AlertTriangle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface Memory {
  id: string;
  user_id: string;
  memory: string;
  category: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

interface MemoryManagerProps {
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  profession: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preference: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  learning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  technical: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  general: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function MemoryManager({ onClose }: MemoryManagerProps) {
  const { apiFetch } = useApi();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMemory, setNewMemory] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/memories/');
      setMemories(data.memories || []);
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = await apiFetch('/api/memories/', {
        method: 'POST',
        body: JSON.stringify({
          memory: newMemory.trim(),
          category: newCategory,
          importance: 5,
        }),
      });
      if (data.memory) {
        setMemories((prev) => [data.memory, ...prev]);
        setNewMemory('');
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await apiFetch('/api/memories/', {
        method: 'DELETE',
        body: JSON.stringify({ memory_id: id }),
      });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await apiFetch('/api/memories/', {
        method: 'DELETE',
        body: JSON.stringify({ clear_all: true }),
      });
      setMemories([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0b101b] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20">
              <Brain size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Long-Term Memory</h2>
              <p className="text-xs text-white/50">
                Facts and preferences the AI remembers across your conversations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add Memory Form */}
        <div className="border-b border-white/5 bg-white/3 p-4">
          <form onSubmit={handleAddMemory} className="flex flex-col gap-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Teach AI something (e.g. 'I work with Python and React' or 'I prefer concise code')"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/50"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white/80 outline-none focus:border-violet-500/50"
              >
                <option value="general">General</option>
                <option value="profession">Profession</option>
                <option value="preference">Preference</option>
                <option value="technical">Technical</option>
                <option value="learning">Learning</option>
              </select>
              <button
                type="submit"
                disabled={!newMemory.trim() || isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:brightness-110 disabled:opacity-40"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-white/30">
              <Sparkles size={11} className="text-violet-400" />
              The AI also automatically remembers important details mentioned in your chats.
            </p>
          </form>
        </div>

        {/* Memories List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : memories.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Brain size={32} className="mb-2 text-white/20" />
              <div className="text-sm font-medium text-white/70">No memories stored yet</div>
              <p className="mt-1 max-w-xs text-xs text-white/35">
                As you chat, the AI will remember details about you. You can also add them manually above.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {memories.map((m) => {
                const colorClass =
                  CATEGORY_COLORS[m.category] || CATEGORY_COLORS.general;

                return (
                  <div
                    key={m.id}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/3 p-3 transition-colors hover:border-violet-500/20 hover:bg-white/5"
                  >
                    <div className="flex flex-1 items-start gap-2.5">
                      <span
                        className={`mt-0.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${colorClass}`}
                      >
                        <Tag size={10} />
                        {m.category}
                      </span>
                      <div>
                        <p className="text-xs text-white/90 leading-relaxed">{m.memory}</p>
                        <span className="mt-1 block text-[10px] text-white/30">
                          {new Date(m.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      className="rounded p-1 text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete memory"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {memories.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-white/2 px-6 py-3">
            <span className="text-xs text-white/40">
              {memories.length} {memories.length === 1 ? 'memory' : 'memories'} saved
            </span>

            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle size={13} /> Clear all?
                </span>
                <button
                  onClick={handleClearAll}
                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                >
                  Yes, clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-red-400/80 hover:text-red-300 transition-colors"
              >
                Clear all memories
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
