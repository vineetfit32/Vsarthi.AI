import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { t } from '../data/languages.js';
import { buildQuestionSequence, SECTION_LABELS, SECTIONS } from '../data/questions.js';
import { checkRedFlags } from '../data/redFlags.js';
import { useSpeech } from '../hooks/useSpeech.js';
import {
  Mic, MicOff, Volume2, VolumeX, ChevronRight, ChevronLeft,
  AlertTriangle, Leaf, SkipForward, Settings
} from 'lucide-react';
import StepHeader from '../components/StepHeader.jsx';
import clsx from 'clsx';

export default function InterviewScreen() {
  const { state, actions } = useApp();
  const { language, interview, ayushMode, ttsEnabled } = state;
  const T = (key) => t(language, key);

  const { answers, questionIndex, questions, isComplete, redFlag, chatHistory } = interview;

  const chatEndRef = useRef(null);
  const textInputRef = useRef(null);

  const { isListening, transcript, interimText, speakText, stopSpeak, isSpeaking,
          startListening, stopListening, sttSupported, clearTranscript } = useSpeech({
    lang: language, ttsEnabled,
  });

  const [textInput, setTextInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [scaleValue, setScaleValue] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize questions on mount
  useEffect(() => {
    if (!questions.length) {
      const qs = buildQuestionSequence([], ayushMode);
      actions.initInterview(qs);
      // Add initial assistant message
      actions.addChatMessage({
        id: Date.now(),
        role: 'assistant',
        text: language === 'hi'
          ? 'नमस्ते! मैं आपका स्वास्थ्य साथी हूं। आइए शुरू करते हैं।'
          : 'Hello! I\'m your health assistant. Let\'s get started with a few questions.',
        time: new Date(),
      });
    }
  }, []);

  // Rebuild questions when AYUSH mode changes (only if no answers yet)
  useEffect(() => {
    if (answers.chiefComplaint) {
      const qs = buildQuestionSequence(answers.chiefComplaint, ayushMode);
      actions.setInterviewQuestions(qs);
    }
  }, [ayushMode]);

  const currentQ = questions[questionIndex];

  // Auto-speak question when it changes
  useEffect(() => {
    if (currentQ && ttsEnabled && chatHistory.length > 0) {
      const text = currentQ.text[language] || currentQ.text.en;
      speakText(text);
    }
    // Reset input state
    setTextInput('');
    setSelectedOptions([]);
    setScaleValue(5);
    clearTranscript();
  }, [questionIndex]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Apply transcript to text input
  useEffect(() => {
    if (transcript) {
      setTextInput(transcript);
    }
  }, [transcript]);

  const submitAnswer = useCallback((value) => {
    if (!currentQ) return;

    const displayValue = formatAnswerDisplay(currentQ, value, language);

    // Add user message to chat
    actions.addChatMessage({
      id: Date.now(),
      role: 'user',
      text: displayValue,
      time: new Date(),
    });

    // Save answer
    actions.setAnswer(currentQ.key, value);

    // Rebuild questions if chief complaint was just answered
    if (currentQ.key === 'chiefComplaint') {
      const complaints = Array.isArray(value) ? value : [value];
      const newQs = buildQuestionSequence(complaints, ayushMode);
      actions.setInterviewQuestions(newQs);
    }

    // Check red flags
    const updatedAnswers = { ...answers, [currentQ.key]: value };
    const flag = checkRedFlags(updatedAnswers);
    if (flag) {
      actions.setRedFlag(flag);
    }

    // Move to next question or complete
    const nextQ = findNextQuestion(questions, questionIndex, updatedAnswers);
    if (nextQ === null) {
      actions.completeInterview();
      actions.addChatMessage({
        id: Date.now() + 1,
        role: 'assistant',
        text: language === 'hi'
          ? 'बहुत अच्छे! प्रश्नावली पूरी हो गई। अब अपने दस्तावेज़ अपलोड करें।'
          : 'Excellent! Interview complete. You can now upload your medical documents.',
        time: new Date(),
      });
      setTimeout(() => actions.setStep('documents'), 2000);
    } else {
      actions.setQuestionIndex(nextQ);
      // Add assistant message for next question
      const nextQuestion = questions[nextQ];
      if (nextQuestion) {
        actions.addChatMessage({
          id: Date.now() + 1,
          role: 'assistant',
          text: nextQuestion.text[language] || nextQuestion.text.en,
          time: new Date(),
        });
      }
    }
    clearTranscript();
    setTextInput('');
    setSelectedOptions([]);
  }, [currentQ, questions, questionIndex, answers, language, ayushMode]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript && currentQ?.type === 'text') {
        // auto-submit text if voice was being used for text input
      }
    } else {
      startListening();
    }
  };

  const handleVoiceSubmitForChoice = useCallback(() => {
    if (!transcript || !currentQ) return;
    // Try to match transcript to an option
    const lower = transcript.toLowerCase();
    if (currentQ.options) {
      const match = currentQ.options.find(opt => {
        const label = (opt.label[language] || opt.label.en || '').toLowerCase();
        return lower.includes(label) || label.includes(lower.slice(0, 10));
      });
      if (match) {
        if (currentQ.type === 'multiselect') {
          submitAnswer([match.value]);
        } else {
          submitAnswer(match.value);
        }
        return;
      }
    }
    // For text questions, just submit the transcript
    if (currentQ.type === 'text' && transcript) {
      submitAnswer(transcript);
    }
  }, [transcript, currentQ, language, submitAnswer]);

  if (!currentQ && !isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading interview…</p>
        </div>
      </div>
    );
  }

  const progress = questions.length ? Math.round((questionIndex / questions.length) * 100) : 0;
  const sectionLabel = currentQ ? SECTION_LABELS[currentQ.section] : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <StepHeader currentStep="interview" language={language} />

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {sectionLabel && (
                <>
                  <span className="text-lg">{sectionLabel.icon}</span>
                  <span className="text-sm font-semibold text-primary-600">
                    {sectionLabel[language] || sectionLabel.en}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* AYUSH toggle */}
              <button
                onClick={actions.toggleAyush}
                className={clsx(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all',
                  ayushMode
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                )}
              >
                <Leaf size={12} />
                {ayushMode ? T('ayushModeOn') : T('ayushMode')}
              </button>
              {/* TTS toggle */}
              <button onClick={actions.toggleTTS} className="btn-ghost p-1.5" title="Toggle read aloud">
                {ttsEnabled ? <Volume2 size={16} className="text-primary-500" /> : <VolumeX size={16} className="text-slate-400" />}
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{questionIndex} of {questions.length} questions</p>
        </div>
      </div>

      {/* Red flag banner */}
      {redFlag && (
        <div className="bg-red-600 text-white px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="font-bold text-lg">{T('redFlagTitle')}</p>
                <p className="text-red-100 text-sm mt-1">{T('redFlagSub')}</p>
                <p className="text-red-200 text-sm mt-1 font-medium">{redFlag.message[language] || redFlag.message.en}</p>
              </div>
            </div>
            <button
              onClick={() => actions.setRedFlag(null)}
              className="mt-3 text-sm underline text-red-200 hover:text-white"
            >
              {T('continueAnyway')}
            </button>
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {chatHistory.map((msg) => (
            <ChatBubble key={msg.id} message={msg} language={language} />
          ))}

          {/* Typing indicator while mic is active */}
          {isListening && (
            <div className="flex items-end gap-2 justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-100">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      {currentQ && !isComplete && (
        <div className="bg-white border-t border-slate-100 p-4 max-w-2xl mx-auto w-full">

          {/* Current question display (sticky) */}
          <div className="bg-primary-50 rounded-2xl p-4 mb-4">
            <p className="text-primary-800 font-semibold text-base leading-relaxed">
              {currentQ.text[language] || currentQ.text.en}
            </p>
            {isSpeaking && (
              <button onClick={stopSpeak} className="text-xs text-primary-500 mt-1 flex items-center gap-1">
                <VolumeX size={12} /> Stop reading
              </button>
            )}
          </div>

          {/* Choice buttons */}
          {(currentQ.type === 'choice' || currentQ.type === 'multiselect') && (
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
              {currentQ.options?.map((opt) => {
                const isSelected = currentQ.type === 'multiselect'
                  ? selectedOptions.includes(opt.value)
                  : selectedOptions[0] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (currentQ.type === 'multiselect') {
                        setSelectedOptions(prev =>
                          prev.includes(opt.value)
                            ? prev.filter(v => v !== opt.value)
                            : [...prev, opt.value]
                        );
                      } else {
                        // Single choice — submit immediately
                        submitAnswer(opt.value);
                      }
                    }}
                    className={clsx('btn-choice', isSelected && 'selected')}
                  >
                    {currentQ.type === 'multiselect' && (
                      <span className={clsx(
                        'inline-flex w-5 h-5 rounded border-2 mr-3 flex-shrink-0 items-center justify-center',
                        isSelected ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
                      )}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </span>
                    )}
                    {opt.label[language] || opt.label.en}
                  </button>
                );
              })}
              {currentQ.type === 'multiselect' && selectedOptions.length > 0 && (
                <button
                  onClick={() => submitAnswer(selectedOptions)}
                  className="btn-primary w-full mt-2"
                >
                  <ChevronRight size={18} /> {T('next')} ({selectedOptions.length} selected)
                </button>
              )}
            </div>
          )}

          {/* Scale input */}
          {currentQ.type === 'scale' && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>0 — None</span>
                <span>10 — Worst</span>
              </div>
              <input
                type="range"
                min={currentQ.min ?? 0}
                max={currentQ.max ?? 10}
                step={1}
                value={scaleValue}
                onChange={e => setScaleValue(Number(e.target.value))}
                className="w-full accent-primary-600 h-3 cursor-pointer"
              />
              <div className="text-center mt-3">
                <span className={clsx(
                  'text-4xl font-black',
                  scaleValue <= 3 ? 'text-emerald-500' : scaleValue <= 6 ? 'text-amber-500' : 'text-red-500'
                )}>
                  {scaleValue}
                </span>
                <span className="text-slate-400 text-sm"> / 10</span>
              </div>
              <button
                onClick={() => submitAnswer(scaleValue)}
                className="btn-primary w-full mt-3"
              >
                <ChevronRight size={18} /> {T('next')}
              </button>
            </div>
          )}

          {/* Text input */}
          {currentQ.type === 'text' && (
            <div className="mb-4">
              <textarea
                ref={textInputRef}
                rows={3}
                value={interimText ? `${textInput} ${interimText}` : textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={isListening ? T('speaking') : T('typeAnswer')}
                className="input-field resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => textInput.trim() && submitAnswer(textInput.trim())}
                  disabled={!textInput.trim()}
                  className="btn-primary flex-1"
                >
                  <ChevronRight size={18} /> {T('next')}
                </button>
                <button onClick={() => submitAnswer('')} className="btn-ghost text-slate-500">
                  <SkipForward size={16} /> {T('skipQuestion')}
                </button>
              </div>
            </div>
          )}

          {/* Bottom row: mic + skip */}
          <div className="flex items-center justify-between mt-1">
            {/* Skip */}
            <button
              onClick={() => submitAnswer('')}
              className="btn-ghost text-slate-400 text-sm"
            >
              <SkipForward size={14} /> Skip
            </button>

            {/* Mic button */}
            <div className="flex items-center gap-3">
              {!sttSupported && (
                <p className="text-xs text-slate-400">Voice not supported in this browser</p>
              )}
              {sttSupported && (
                <div className="relative">
                  <button
                    onClick={handleMicToggle}
                    className={clsx(
                      'relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all font-bold',
                      isListening
                        ? 'bg-red-500 text-white mic-active'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    )}
                    aria-label={isListening ? 'Stop listening' : T('tapToSpeak')}
                  >
                    {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>
                </div>
              )}
              {/* Submit voice for choice questions */}
              {isListening && transcript && (currentQ.type === 'choice' || currentQ.type === 'multiselect') && (
                <button onClick={handleVoiceSubmitForChoice} className="btn-primary py-2 px-4 text-sm">
                  Use: "{transcript.slice(0, 20)}…"
                </button>
              )}
            </div>

            {/* Back */}
            {questionIndex > 0 && (
              <button
                onClick={() => actions.setQuestionIndex(Math.max(0, questionIndex - 1))}
                className="btn-ghost text-slate-400 text-sm"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────
function ChatBubble({ message, language }) {
  const isAssistant = message.role === 'assistant';
  return (
    <div className={clsx('flex items-end gap-2', isAssistant ? 'justify-start' : 'justify-end')}>
      {isAssistant && (
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
          <span className="text-primary-600 text-sm font-bold">AI</span>
        </div>
      )}
      <div className={clsx(
        'max-w-xs sm:max-w-sm rounded-2xl px-4 py-3 shadow-sm',
        isAssistant
          ? 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
          : 'bg-primary-600 text-white rounded-br-sm'
      )}>
        <p className="text-base leading-relaxed">{message.text}</p>
        <p className={clsx('text-xs mt-1', isAssistant ? 'text-slate-400' : 'text-primary-200')}>
          {new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAnswerDisplay(question, value, language) {
  if (!question?.options) {
    if (typeof value === 'number') return `${value} / 10`;
    return String(value || '(skipped)');
  }
  const values = Array.isArray(value) ? value : [value];
  return values.map(v => {
    const opt = question.options.find(o => o.value === v);
    return opt?.label?.[language] || opt?.label?.en || v;
  }).join(', ') || '(skipped)';
}

function findNextQuestion(questions, currentIndex, answers) {
  let next = currentIndex + 1;
  while (next < questions.length) {
    const q = questions[next];
    // Check conditional rendering
    if (q.conditionalOn) {
      const { key, value } = q.conditionalOn;
      if (answers[key] !== value) {
        next++;
        continue;
      }
    }
    return next;
  }
  return null; // No more questions
}
