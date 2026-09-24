'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import Sidebar from '@/components/Sidebar';
import MessageItem from '@/components/Message';
import MessageInput from '@/components/MessageInput';
import ShareButton from '@/components/ShareButton';
import MemoryManager from '@/components/MemoryManager';
import { Sparkles } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  feedback?: 'like' | 'dislike' | null;
}

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

const STARTERS = [
  'What is Retrieval-Augmented Generation (RAG)?',
  'Explain the difference between supervised and unsupervised learning.',
  'Write a Python function to reverse a linked list.',
  'What are the best practices for prompt engineering?',
];

export default function ChatPage() {
  const { user, isLoading } = useAuth();
  const { apiFetch, streamFetch } = useApi();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    setMessages([]);
    try {
      const data = await apiFetch(`/api/conversations/${convId}/messages`);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [apiFetch]);

  const loadConvDetail = useCallback(async (convId: string) => {
    try {
      const data = await apiFetch(`/api/conversations/${convId}`);
      setActiveConv(data.conversation);
    } catch (err) {
      console.error('Load conv error:', err);
    }
  }, [apiFetch]);

  const handleSelectConversation = useCallback(async (id: string) => {
    setActiveConvId(id);
    await Promise.all([loadMessages(id), loadConvDetail(id)]);
  }, [loadMessages, loadConvDetail]);

  const handleNewChat = useCallback(async () => {
    try {
      const data = await apiFetch('/api/conversations/', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const newConv = data.conversation;
      setActiveConvId(newConv.id);
      setActiveConv(newConv);
      setMessages([]);
      setSidebarRefresh((n) => n + 1);
    } catch (err) {
      console.error('New chat error:', err);
    }
  }, [apiFetch]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeConvId || isStreaming) return;

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    const tempAiMsg: Message = {
      id: `streaming-${Date.now()}`,
      conversation_id: activeConvId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAiMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    abortRef.current = new AbortController();
    let fullContent = '';
    let finalUserMsgId = tempUserMsg.id;
    let finalAiMsgId = tempAiMsg.id;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ conversation_id: activeConvId, message: text }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Retain the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(trimmed.slice(6));
            if (evt.type === 'chunk' && evt.content) {
              fullContent += evt.content;
              setStreamingContent(fullContent);
            } else if (evt.type === 'title' && evt.title) {
              setActiveConv((prev) => prev ? { ...prev, title: evt.title } : null);
              setSidebarRefresh((n) => n + 1);
            } else if (evt.type === 'done') {
              finalUserMsgId = evt.userMessageId || finalUserMsgId;
              finalAiMsgId = evt.messageId || finalAiMsgId;
              if (evt.title) {
                setActiveConv((prev) => prev ? { ...prev, title: evt.title } : null);
                setSidebarRefresh((n) => n + 1);
              }
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Stream error:', err);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === tempUserMsg.id) return { ...m, id: finalUserMsgId };
          if (m.id === tempAiMsg.id) return { ...m, id: finalAiMsgId, content: fullContent };
          return m;
        })
      );
      setSidebarRefresh((n) => n + 1);
    }
  }, [activeConvId, isStreaming]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar
        activeConversationId={activeConvId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onOpenMemory={() => setShowMemory(true)}
        refreshTrigger={sidebarRefresh}
      />

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        {activeConv && (
          <header className="flex items-center justify-between border-b border-white/5 px-6 py-3 glass">
            <h2 className="truncate text-sm font-medium text-white/70">{activeConv.title}</h2>
            <ShareButton
              conversation={activeConv}
              onUpdated={(updated) => setActiveConv(updated)}
            />
          </header>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4">
          {!activeConvId ? (
            // Empty state
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20">
                <Sparkles size={28} className="text-violet-400" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">How can I help you today?</h2>
              <p className="mb-8 max-w-sm text-sm text-white/40">
                Start a new chat or select a previous conversation from the sidebar.
              </p>
              <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={async () => {
                      await handleNewChat();
                      // slight delay to let state settle
                      setTimeout(() => handleSend(s), 300);
                    }}
                    className="rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-left text-xs text-white/50 transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-white/70"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isStreamingThis =
                  isStreaming && i === messages.length - 1 && msg.role === 'assistant';
                return (
                  <div key={msg.id} className="message-enter">
                    <MessageItem
                      message={msg}
                      isStreaming={isStreamingThis}
                      streamContent={isStreamingThis ? streamingContent : undefined}
                    />
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/5 px-4 py-4 glass">
          <div className="mx-auto max-w-3xl">
            {!activeConvId ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <MessageInput
                    onSend={async (text) => {
                      await handleNewChat();
                      setTimeout(() => handleSend(text), 300);
                    }}
                    disabled={false}
                    placeholder="Ask me anything to start a new chat..."
                  />
                </div>
              </div>
            ) : (
              <MessageInput
                onSend={handleSend}
                disabled={isLoadingMessages}
                isStreaming={isStreaming}
                onStop={handleStop}
              />
            )}
            <p className="mt-2 text-center text-xs text-white/15">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>

      {showMemory && <MemoryManager onClose={() => setShowMemory(false)} />}
    </div>
  );
}
