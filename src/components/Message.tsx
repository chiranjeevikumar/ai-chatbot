'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThumbsUp, ThumbsDown, Copy, Check, Sparkles, User } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

interface MessageProps {
  message: {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    feedback?: 'like' | 'dislike' | null;
  };
  isStreaming?: boolean;
  streamContent?: string;
}

export default function MessageItem({
  message,
  isStreaming = false,
  streamContent,
}: MessageProps) {
  const { apiFetch } = useApi();
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(
    message.feedback || null
  );
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState<string | null>(null);

  const displayContent = isStreaming && streamContent !== undefined ? streamContent : message.content;
  const isUser = message.role === 'user';

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleCopyCode = async (codeText: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCodeCopied(blockId);
      setTimeout(() => setCodeCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleFeedback = async (type: 'like' | 'dislike') => {
    if (message.id.startsWith('temp-') || message.id.startsWith('streaming-')) return;

    try {
      if (feedback === type) {
        // Toggle off
        await apiFetch('/api/feedback/', {
          method: 'DELETE',
          body: JSON.stringify({ message_id: message.id }),
        });
        setFeedback(null);
      } else {
        await apiFetch('/api/feedback/', {
          method: 'POST',
          body: JSON.stringify({ message_id: message.id, feedback: type }),
        });
        setFeedback(type);
      }
    } catch (err) {
      console.error('Failed to set feedback:', err);
    }
  };

  if (message.role === 'system') return null;

  return (
    <div
      className={`group mx-auto flex max-w-3xl px-4 py-4 transition-colors ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div className={`flex w-full gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl text-xs font-semibold shadow-md ${
            isUser
              ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white'
              : 'border border-violet-500/20 bg-gradient-to-tr from-violet-500/10 to-indigo-500/10 text-violet-300'
          }`}
        >
          {isUser ? <User size={15} /> : <Sparkles size={15} className="text-violet-400" />}
        </div>

        {/* Message Content Container */}
        <div
          className={`flex max-w-[85%] flex-col ${
            isUser ? 'items-end' : 'items-start'
          }`}
        >
          <div
            className={`relative rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
              isUser
                ? 'rounded-tr-none bg-gradient-to-r from-violet-600 to-indigo-600 text-white selection:bg-violet-800'
                : 'rounded-tl-none border border-white/5 bg-[#111827]/70 text-gray-100 backdrop-blur-md'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{displayContent}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre({ children }) {
                      return <div className="not-prose my-3">{children}</div>;
                    },
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeText = String(children).replace(/\n$/, '');
                      const isInline = !match && !codeText.includes('\n');

                      if (isInline) {
                        return (
                          <code
                            className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[12px] text-violet-300 border border-violet-500/20"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }

                      const blockId = `code-${Math.random().toString(36).substring(2, 9)}`;

                      return (
                        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#070b14] text-gray-200">
                          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-3 py-1.5 text-xs text-white/50">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-violet-400">
                              {match ? match[1] : 'code'}
                            </span>
                            <button
                              onClick={() => handleCopyCode(codeText, blockId)}
                              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              {codeCopied === blockId ? (
                                <>
                                  <Check size={12} className="text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="overflow-x-auto p-4 font-mono text-xs leading-5">
                            <code>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                  }}
                >
                  {displayContent}
                </ReactMarkdown>

                {/* Cursor animation while streaming */}
                {isStreaming && (
                  <span className="inline-block h-4 w-1.5 animate-pulse bg-violet-400 ml-1 rounded-sm align-middle" />
                )}
              </div>
            )}
          </div>

          {/* Action bar (Timestamp, Copy, Feedback) */}
          <div
            className={`mt-1.5 flex items-center gap-2 text-[11px] text-white/30 ${
              isUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <span>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Actions for Assistant messages */}
            {!isUser && !isStreaming && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopyMessage}
                  className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
                  title="Copy message"
                >
                  {copied ? (
                    <Check size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>

                <button
                  onClick={() => handleFeedback('like')}
                  className={`rounded p-1 transition-colors ${
                    feedback === 'like'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-white/40 hover:bg-white/5 hover:text-white'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp size={13} />
                </button>

                <button
                  onClick={() => handleFeedback('dislike')}
                  className={`rounded p-1 transition-colors ${
                    feedback === 'dislike'
                      ? 'text-rose-400 bg-rose-500/10'
                      : 'text-white/40 hover:bg-white/5 hover:text-white'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
