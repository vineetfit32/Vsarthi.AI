// src/components/AskVSarthiChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { aiService } from '../services/aiService.js';
import {
  MessageSquare, X, Send, Bot, User, Sparkles,
  AlertCircle, ArrowRight, Clock, ShieldCheck, HeartPulse
} from 'lucide-react';
import clsx from 'clsx';

export default function AskVSarthiChatbot() {
  const { state, actions } = useApp();
  const { currentStep, patient, interview } = state;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'm_welcome',
      sender: 'vsarthi',
      text: `Namaste${patient?.name ? `, ${patient.name}` : ''}! I am VSarthi, your hospital assistant. You can ask me questions about your intake, privacy, or even type your symptoms directly here!`,
      time: 'Just now',
      chips: [
        '⏱️ How long will this take?',
        '🛡️ Is my data safe?',
        '🆘 I need help from staff',
      ],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [staffAlerted, setStaffAlerted] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg = {
      id: `m_${Date.now()}_u`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await aiService.answerPatientQuery({
        message: text,
        currentStep,
        patient,
        answers: interview.answers,
      });

      setIsTyping(false);

      if (response.alertRaised) {
        setStaffAlerted(true);
      }

      // If the chat recognized symptoms, synchronize them into AppContext interview.answers!
      if (response.intakeUpdate) {
        if (response.intakeUpdate.chiefComplaint) {
          actions.setAnswer('chiefComplaint', response.intakeUpdate.chiefComplaint);
        }
      }

      const botMsg = {
        id: `m_${Date.now()}_b`,
        sender: 'vsarthi',
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: response.suggestedActions,
        isAlert: response.alertRaised,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}_err`,
          sender: 'vsarthi',
          text: `I apologize for the brief pause. Our clinical reception staff is always on standby if you require immediate help.`,
          time: 'Now',
        },
      ]);
    }
  };

  const handleActionClick = (action) => {
    if (action.step) {
      actions.setStep(action.step);
      setIsOpen(false);
    } else if (action.view) {
      actions.setView(action.view);
      setIsOpen(false);
    } else if (action.query) {
      handleSendMessage(action.query);
    }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-teal-500/25 transition-all duration-200 transform hover:scale-105 active:scale-95 border-2 border-white/40"
            aria-label="Ask VSarthi Assistant"
          >
            <div className="relative">
              <Bot size={22} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-teal-700 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-teal-700" />
            </div>
            <span className="hidden sm:inline font-bold text-sm tracking-wide">Ask VSarthi</span>
            <span className="bg-teal-800/80 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold hidden md:inline">
              OPD Assistant
            </span>
          </button>
        )}
      </div>

      {/* Chat Window Dialog */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-full max-w-[380px] sm:max-w-[420px] bg-white rounded-3xl shadow-2xl border border-teal-100 flex flex-col overflow-hidden animate-slideUp max-h-[85vh] h-[560px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Bot size={22} className="text-teal-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">Ask VSarthi</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[11px] text-teal-200">
                  Hospital Reception Companion • Dual-mode
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSendMessage('I need assistance from hospital staff')}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-sm mr-1"
                title="Raise staff alert"
              >
                <AlertCircle size={12} /> Staff
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Staff Notification Alert Banner */}
          {staffAlerted && (
            <div className="bg-amber-100 text-amber-900 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <HeartPulse size={14} className="text-amber-700 animate-pulse" />
                OPD Staff has been alerted to your session.
              </span>
              <button
                onClick={() => setStaffAlerted(false)}
                className="text-amber-700 hover:text-amber-950 text-[10px] underline font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={clsx(
                  'flex flex-col',
                  m.sender === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm',
                    m.sender === 'user'
                      ? 'bg-teal-700 text-white rounded-br-none'
                      : m.isAlert
                      ? 'bg-amber-50 border border-amber-300 text-amber-900 rounded-bl-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  )}
                >
                  <p>{m.text}</p>
                  <span
                    className={clsx(
                      'text-[10px] block text-right mt-1',
                      m.sender === 'user' ? 'text-teal-200' : 'text-slate-400'
                    )}
                  >
                    {m.time}
                  </span>
                </div>

                {/* Quick Reply Chips */}
                {m.chips && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.chips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(chip)}
                        className="text-[11px] bg-white border border-teal-200 text-teal-800 hover:bg-teal-50 px-2.5 py-1 rounded-full font-medium transition-all shadow-2xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggested Action Buttons */}
                {m.actions && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleActionClick(act)}
                        className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs"
                      >
                        {act.label} <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                <Bot size={14} className="text-teal-600 animate-bounce" />
                <span className="italic font-medium text-teal-700">VSarthi is typing…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask a question or type your symptoms…"
                className="flex-1 bg-slate-100/80 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white flex items-center justify-center transition-all flex-shrink-0 shadow-md shadow-teal-500/20"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
