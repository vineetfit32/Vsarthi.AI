// src/components/AskVSarthiChatbot.jsx
// VSarthi.AI — Real AI Healthcare Chatbot
// Frontend → Backend → Groq AI → Validated Response → Frontend
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { apiClient } from '../services/apiClient.js';
import {
  MessageSquare, X, Send, Bot, User, Sparkles,
  AlertCircle, ArrowRight, RotateCcw, Trash2,
  HeartPulse, ShieldCheck, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';

const WELCOME_MESSAGE = {
  id: 'm_welcome',
  role: 'assistant',
  text: `Namaste! I'm VSarthi, your hospital assistant. I can explain medical terms, help with prescription questions, or guide you to the right healthcare specialist.

⚠️ I'm an AI assistant, not a doctor. For medical emergencies, call 112 immediately.`,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  chips: [
    '📋 How do I read my prescription?',
    '🩺 Which doctor should I see?',
    '💊 What does this medicine do?',
    '🆘 I need staff help',
  ],
};

export default function AskVSarthiChatbot() {
  const { state } = useApp();
  const { patient, session } = state;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const [staffAlerted, setStaffAlerted] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // null | 'available' | 'unavailable'
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Check AI status when first opened
  useEffect(() => {
    if (isOpen && aiStatus === null) {
      apiClient.getChatStatus()
        .then(res => setAiStatus(res.available ? 'available' : 'unavailable'))
        .catch(() => setAiStatus('unavailable'));
    }
  }, [isOpen, aiStatus]);

  // Build conversation history for context
  const getConversationHistory = useCallback(() => {
    return messages
      .filter(m => m.id !== 'm_welcome' && !m.isError)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
  }, [messages]);

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...msg,
    }]);
  }, []);

  const handleSendMessage = useCallback(async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    // Clear any previous retry state
    setLastFailedMessage(null);
    setInputText('');
    setIsSending(true);
    setIsTyping(true);

    // Add user message immediately
    addMessage({ role: 'user', text });

    // Check for staff alert keywords client-side too
    const isStaffAlert = /staff|nurse|help|emergency|urgent|assistance/i.test(text);

    try {
      const response = await apiClient.sendChatMessage(
        text,
        getConversationHistory(),
        session?.sessionToken || null,
      );

      setIsTyping(false);
      setIsSending(false);

      if (response.isEmergencyFlag || isStaffAlert) {
        setStaffAlerted(true);
      }

      addMessage({
        role: 'assistant',
        text: response.reply,
        isEmergency: response.isEmergencyFlag,
      });

    } catch (err) {
      setIsTyping(false);
      setIsSending(false);

      const isNetwork = err.isNetwork || err.isTimeout;
      const errorText = isNetwork
        ? 'Unable to connect to the assistant. Please check your internet connection and try again.'
        : err.message || 'Something went wrong. Please try again.';

      addMessage({
        role: 'assistant',
        text: errorText,
        isError: true,
        retryText: text,
      });

      setLastFailedMessage(text);
    }
  }, [inputText, isSending, addMessage, getConversationHistory, session]);

  const handleRetry = useCallback(() => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    }
  }, [lastFailedMessage, handleSendMessage]);

  const handleClearConversation = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setLastFailedMessage(null);
    setStaffAlerted(false);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-teal-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 border-2 border-white/40"
            aria-label="Ask VSarthi AI Assistant"
          >
            <div className="relative">
              <Bot size={22} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-teal-700 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-teal-700" />
            </div>
            <span className="hidden sm:inline font-bold text-sm tracking-wide">Ask VSarthi</span>
            <span className="bg-teal-800/80 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold hidden md:inline">
              AI Assistant
            </span>
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-50 w-full sm:w-[420px] bg-white sm:rounded-3xl shadow-2xl border border-teal-100 flex flex-col overflow-hidden max-h-[100dvh] sm:max-h-[85vh] h-[100dvh] sm:h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-4 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Bot size={22} className="text-teal-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">VSarthi AI Assistant</h3>
                  <span className={clsx(
                    'w-2 h-2 rounded-full',
                    aiStatus === 'available' ? 'bg-emerald-400' :
                    aiStatus === 'unavailable' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                  )} />
                </div>
                <p className="text-[11px] text-teal-200">
                  {aiStatus === 'available' ? 'AI-powered healthcare assistant' :
                   aiStatus === 'unavailable' ? 'Limited mode — AI not configured' :
                   'Connecting…'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearConversation}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] rounded-lg transition-all flex items-center gap-1"
                title="Clear conversation"
              >
                <Trash2 size={11} /> Clear
              </button>
              <button
                onClick={() => handleSendMessage('I need assistance from hospital staff')}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-sm ml-1"
                title="Alert hospital staff"
              >
                <AlertCircle size={12} /> Staff
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all ml-1"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Staff Alert Banner */}
          {staffAlerted && (
            <div className="bg-amber-100 text-amber-900 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-between font-semibold flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <HeartPulse size={14} className="text-amber-700 animate-pulse" />
                OPD staff has been notified. Please remain at the reception desk.
              </span>
              <button onClick={() => setStaffAlerted(false)} className="text-amber-700 hover:text-amber-950 text-[10px] underline font-bold">
                Dismiss
              </button>
            </div>
          )}

          {/* AI Unavailable Banner */}
          {aiStatus === 'unavailable' && (
            <div className="bg-blue-50 text-blue-800 border-b border-blue-200 px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0">
              <AlertTriangle size={14} className="text-blue-600 flex-shrink-0" />
              <span>AI assistant not configured. Please contact hospital staff for assistance.</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={clsx('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}
              >
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <Bot size={12} className="text-teal-600" />
                    <span className="text-[10px] text-slate-400 font-medium">VSarthi</span>
                  </div>
                )}

                <div className={clsx(
                  'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                  m.role === 'user'
                    ? 'bg-teal-700 text-white rounded-br-none'
                    : m.isEmergency
                    ? 'bg-red-50 border-2 border-red-300 text-red-900 rounded-bl-none'
                    : m.isError
                    ? 'bg-orange-50 border border-orange-200 text-orange-900 rounded-bl-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                )}>
                  {m.isEmergency && (
                    <div className="flex items-center gap-1.5 mb-2 font-bold text-red-700 text-xs">
                      <AlertCircle size={14} /> Emergency guidance provided
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span className={clsx(
                    'text-[10px] block text-right mt-1.5',
                    m.role === 'user' ? 'text-teal-200' : 'text-slate-400'
                  )}>
                    {m.time}
                  </span>
                </div>

                {/* Retry button for error messages */}
                {m.isError && m.retryText && (
                  <button
                    onClick={handleRetry}
                    className="mt-1.5 ml-1 text-xs font-semibold text-orange-700 hover:text-orange-900 flex items-center gap-1 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200 transition-all"
                  >
                    <RotateCcw size={11} /> Retry
                  </button>
                )}

                {/* Quick Reply Chips */}
                {m.chips && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.chips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(chip)}
                        disabled={isSending}
                        className="text-[11px] bg-white border border-teal-200 text-teal-800 hover:bg-teal-50 disabled:opacity-50 px-2.5 py-1 rounded-full font-medium transition-all shadow-sm"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 pl-2">
                <Bot size={14} className="text-teal-600" />
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-teal-700 italic">VSarthi is thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border-t border-amber-100 px-4 py-1.5 flex items-center gap-1.5 flex-shrink-0">
            <ShieldCheck size={11} className="text-amber-600 flex-shrink-0" />
            <p className="text-[10px] text-amber-700">
              AI assistant only. Not a substitute for professional medical advice. For emergencies, call <strong>112</strong>.
            </p>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-100 flex-shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-center gap-2"
            >
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about symptoms, medicines, or the hospital process…"
                rows={1}
                className="flex-1 bg-slate-100/80 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-2xl px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 resize-none overflow-hidden"
                style={{ minHeight: '42px', maxHeight: '120px' }}
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-10 h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all flex-shrink-0 shadow-md shadow-teal-500/20"
                aria-label="Send message"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
