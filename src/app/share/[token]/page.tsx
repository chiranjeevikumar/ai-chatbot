'use client';

import React, { useState, useEffect, use } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Share2, Sparkles, MessageSquare } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  created_at: string;
}

export default function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    fetch(`${API}/api/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setConversation(data.conversation);
        setMessages(data.messages);
      })
      .catch(() => setError('This shared conversation is unavailable or the link has expired.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummary('');
    try {
      const res = await fetch(`${API}/api/share/${token}/summarize`, { method: 'POST' });
      const data = await res.json();
      setSummary(data.summary || 'Could not generate summary.');
    } catch {
      setSummary('Failed to generate summary. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
          <MessageSquare size={28} className="text-red-400" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-white">Link Unavailable</h1>
        <p className="max-w-sm text-sm text-white/50">{error}</p>
      </div>
    );
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={14} className="text-violet-400" />
            <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">Shared Conversation</span>
          </div>
          <h1 className="text-xl font-bold text-white">{conversation?.title}</h1>
          {conversation?.summary && (
            <p className="mt-2 text-sm text-white/50">{conversation.summary}</p>
          )}
          <p className="mt-2 text-xs text-white/25">
            {visibleMessages.length} messages · {conversation && new Date(conversation.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Summarize button */}
        <div className="mb-6 flex gap-3">
          <button
            id="summarize-btn"
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-white/80 disabled:opacity-50"
          >
            {isSummarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isSummarizing ? 'Summarizing...' : 'Summarize this conversation'}
          </button>
        </div>

        {/* Summary panel */}
        {summary && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/3 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles size={14} className="text-violet-400" />
              Conversation Summary
            </h2>
            <div className="prose prose-invert prose-sm max-w-none text-white/70">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          {visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                  AI
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-violet-500/80 text-white'
                    : 'rounded-tl-sm bg-white/5 text-white/85'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
                <p className="mt-1.5 text-xs opacity-30">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <a
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500"
          >
            <Sparkles size={15} />
            Start your own AI chat
          </a>
        </div>
      </div>
    </div>
  );
}
