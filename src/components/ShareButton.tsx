'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, X, Globe, Lock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  summary?: string;
  is_shared: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
}

interface ShareButtonProps {
  conversation: Conversation;
  onUpdated: (conv: Conversation) => void;
}

export default function ShareButton({ conversation, onUpdated }: ShareButtonProps) {
  const { apiFetch } = useApi();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' && conversation.share_token
      ? `${window.location.origin}/share/${conversation.share_token}`
      : '';

  const handleToggleShare = async () => {
    setIsLoading(true);
    try {
      const nextShared = !conversation.is_shared;
      const data = await apiFetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_shared: nextShared }),
      });
      onUpdated(data.conversation);
    } catch (err) {
      console.error('Failed to toggle share state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white"
        title="Share conversation"
      >
        <Share2 size={13} className="text-violet-400" />
        <span>Share</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d131f] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                  <Share2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Share Conversation</h3>
                  <p className="text-xs text-white/40 truncate max-w-[260px]">
                    {conversation.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex items-center gap-2.5">
                  {conversation.is_shared ? (
                    <Globe size={18} className="text-emerald-400" />
                  ) : (
                    <Lock size={18} className="text-white/40" />
                  )}
                  <div>
                    <div className="text-xs font-medium text-white">
                      {conversation.is_shared ? 'Public link is active' : 'Sharing is disabled'}
                    </div>
                    <div className="text-[11px] text-white/40">
                      {conversation.is_shared
                        ? 'Anyone with the link can view this chat'
                        : 'Only you can view this chat'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleShare}
                  disabled={isLoading}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    conversation.is_shared
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-600/20'
                  }`}
                >
                  {isLoading
                    ? 'Updating...'
                    : conversation.is_shared
                    ? 'Disable Link'
                    : 'Create Link'}
                </button>
              </div>

              {conversation.is_shared && shareUrl && (
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/40">
                    Public Shareable Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex shrink-0 items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 text-right">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <span>Preview shared page</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
