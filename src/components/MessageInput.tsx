'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onStop?: () => void;
}

export default function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  isStreaming = false,
  onStop,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) {
      onStop?.();
      return;
    }
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex w-full items-end gap-2 rounded-2xl border border-white/10 bg-[#0d131f]/90 p-2 shadow-2xl transition-all focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/20"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-gray-100 placeholder-white/25 outline-none disabled:opacity-50"
      />

      <div className="flex shrink-0 items-center gap-1.5 pb-1 pr-1">
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 transition-all hover:bg-red-500/30 active:scale-95 shadow-sm"
            title="Stop generation"
          >
            <Square size={16} className="fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:brightness-100"
            title="Send message"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </form>
  );
}
