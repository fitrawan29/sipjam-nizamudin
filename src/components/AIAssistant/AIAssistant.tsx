'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { FAQItem } from './knowledgeBase';
import {
  findBestAnswers,
  getContextSuggestions,
  getFallbackResponse,
  ScoredFAQItem
} from './faqMatcher';

export interface AIAssistantProps {
  currentView?: string;
  userRole?: string;
  userName?: string;
  user?: {
    nama?: string;
    role?: string;
    [key: string]: any;
  } | null;
  className?: string;
  initialOpen?: boolean;
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export function getAIAssistantGreeting(
  role?: string,
  name?: string,
  user?: { nama?: string; role?: string; [key: string]: any } | null
): string {
  const normalizedRole = (role || user?.role || '').toLowerCase().trim();
  const isTeacher = normalizedRole !== 'admin' && normalizedRole !== 'superadmin';
  const effectiveName = name || (user?.nama ? user.nama.split(' ')[0] : undefined);
  const displayName = effectiveName ? `Bapak/Ibu ${effectiveName}` : (isTeacher ? 'Bapak/Ibu Guru' : 'Admin');
  return `Halo, ${displayName}! 👋 Saya Asisten AI SIPJAM siap membantu Anda memahami dan menggunakan seluruh fitur aplikasi (presensi, jurnal, piket, nilai, dll). Sistem ini 100% offline & cepat.`;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  category?: string;
  matchedQuestion?: string;
  suggestions?: FAQItem[];
  availableCategories?: string[];
  secondaryMatches?: ScoredFAQItem[];
}

export function AIAssistant({
  currentView = 'view-home',
  userRole,
  userName,
  user,
  className: _className = '',
  initialOpen = false,
  visible: propVisible,
  onVisibilityChange,
}: AIAssistantProps) {
  const [internalVisible, setInternalVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('sipjam_ai_assistant_visible') !== 'false';
    } catch {
      return true;
    }
  });

  const isVisible = propVisible !== undefined ? propVisible : internalVisible;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome-init',
        sender: 'assistant',
        text: getAIAssistantGreeting(userRole, userName, user),
        time: '',
        suggestions: getContextSuggestions(currentView, 3)
      }
    ];
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleVisibility = (newVal: boolean) => {
    setInternalVisible(newVal);
    try {
      localStorage.setItem('sipjam_ai_assistant_visible', String(newVal));
    } catch {}
    if (onVisibilityChange) onVisibilityChange(newVal);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sipjam:ai_assistant_visibility', { detail: { visible: newVal } }));
    }
    if (!newVal) {
      setIsOpen(false);
      try {
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 3500,
          timerProgressBar: true,
          icon: 'info',
          title: 'Tombol Asisten AI Disembunyikan',
          text: 'Aktifkan kembali melalui menu Sidebar atau Pengaturan Akun.'
        });
      } catch {}
    }
  };

  useEffect(() => {
    const handleVisEvent = (e: any) => {
      const v = e?.detail?.visible;
      if (typeof v === 'boolean') {
        setInternalVisible(v);
        if (onVisibilityChange) onVisibilityChange(v);
      }
    };
    window.addEventListener('sipjam:ai_assistant_visibility', handleVisEvent);
    return () => window.removeEventListener('sipjam:ai_assistant_visibility', handleVisEvent);
  }, [onVisibilityChange]);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (!isVisible) {
          handleToggleVisibility(true);
          setIsOpen(true);
        } else {
          setIsOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isVisible]);

  // Initialize or reset chat
  const initChat = () => {
    const suggestions = getContextSuggestions(currentView, 3);
    const welcomeMsg: ChatMessage = {
      id: 'welcome-' + Date.now(),
      sender: 'assistant',
      text: getAIAssistantGreeting(userRole, userName, user),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      suggestions
    };
    setMessages([welcomeMsg]);
  };

  useEffect(() => {
    initChat();
  }, [currentView, userRole, userName, user?.nama]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();

      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isOpen, messages]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: query,
      time: timeStr
    };

    // Calculate AI Response offline
    const bestMatches = findBestAnswers(query, currentView, 3);

    let assistantMsg: ChatMessage;

    if (bestMatches.length > 0) {
      const primary = bestMatches[0];
      const secondaries = bestMatches.slice(1);

      assistantMsg = {
        id: 'assistant-' + Date.now(),
        sender: 'assistant',
        category: primary.category,
        matchedQuestion: primary.question,
        text: primary.answer,
        time: timeStr,
        secondaryMatches: secondaries.length > 0 ? secondaries : undefined,
        suggestions: getContextSuggestions(currentView, 2)
      };
    } else {
      const fallback = getFallbackResponse(query, currentView);
      assistantMsg = {
        id: 'assistant-' + Date.now(),
        sender: 'assistant',
        text: fallback.message,
        time: timeStr,
        suggestions: fallback.suggestions,
        availableCategories: fallback.categories.slice(0, 6)
      };
    }

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputText('');
  };

  const handleSuggestionClick = (question: string) => {
    handleSendMessage(question);
  };

  const handleCategoryClick = (catName: string) => {
    handleSendMessage(`Jelaskan menu ${catName}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Button Container */}
      {isVisible && (
        <div className="fixed bottom-5 right-5 z-[45] flex items-center group/ai-btn no-print print:hidden">
          {/* Quick dismiss/hide button accessible on touch & hover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleVisibility(false);
            }}
            title="Sembunyikan tombol asisten"
            aria-label="Sembunyikan tombol asisten"
            className="neu-btn absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[11px] transition-all opacity-90 sm:opacity-0 sm:group-hover/ai-btn:opacity-100 focus:opacity-100 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <button
            type="button"
            data-tour="ai-assistant-btn"
            aria-label="Buka Asisten AI SIPJAM"
            title="Tanya Asisten AI SIPJAM"
            onClick={() => setIsOpen(prev => !prev)}
            className="neu-btn neu-btn-primary w-14 h-14 rounded-full flex items-center justify-center group"
          >
            <i className="fa-solid fa-robot text-2xl text-amber-300 group-hover:rotate-12 transition-transform duration-300"></i>

            {/* Hover tooltip for desktop */}
            <span className="neu-card-sm hidden sm:block absolute right-16 px-3 py-1.5 text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              🤖 Bantuan AI SIPJAM
            </span>
          </button>
        </div>
      )}

      {/* Expandable Chat Panel */}
      {isVisible && isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panel Asisten AI SIPJAM"
          className="neu-card fixed bottom-22 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[calc(100dvh-7.5rem)] h-[480px] z-[45] flex flex-col rounded-3xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 no-print print:hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F766E] to-[#115E59] text-white px-4 py-3 flex items-center justify-between border-b border-white/15">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-amber-300 border border-white/25 shrink-0">
                <i className="fa-solid fa-robot text-sm"></i>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5 truncate">
                  Asisten AI SIPJAM
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-teal-100 font-medium">
                  <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse"></span>
                  <span>100% Offline FAQ</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={initChat}
                title="Mulai ulang percakapan"
                aria-label="Mulai ulang percakapan"
                className="w-9 h-9 rounded-xl hover:bg-white/15 text-teal-100 hover:text-white flex items-center justify-center transition-colors text-xs cursor-pointer"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
              <button
                type="button"
                onClick={() => handleToggleVisibility(false)}
                title="Sembunyikan tombol asisten"
                aria-label="Sembunyikan tombol asisten"
                className="w-9 h-9 rounded-xl hover:bg-white/15 text-teal-100 hover:text-white flex items-center justify-center transition-colors text-xs cursor-pointer"
              >
                <i className="fa-solid fa-eye-slash"></i>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup asisten"
                aria-label="Tutup asisten"
                className="w-9 h-9 rounded-xl hover:bg-white/15 text-teal-100 hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#E6ECF2] dark:bg-[#1F242D] text-xs custom-scroll">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Bubble Container */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 ${
                    msg.sender === 'user'
                      ? 'neu-card-primary rounded-br-none'
                      : 'neu-card-sm text-[#0F172A] dark:text-[#F1F5F9] rounded-bl-none'
                  }`}
                >
                  {/* Category Pill for AI Answers */}
                  {msg.category && (
                    <div className="mb-1.5 flex items-center gap-1">
                      <span className="neu-inset inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#0F766E] dark:text-teal-300">
                        📁 {msg.category}
                      </span>
                    </div>
                  )}

                  {/* Matched Question Title */}
                  {msg.matchedQuestion && (
                    <p className="font-bold text-xs text-[#0F766E] dark:text-teal-300 mb-1 border-b border-slate-300/60 dark:border-slate-700/60 pb-1">
                      {msg.matchedQuestion}
                    </p>
                  )}

                  {/* Message Body */}
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  <span
                    className={`block mt-1 text-[9px] text-right ${
                      msg.sender === 'user' ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>

                {/* Secondary Matches */}
                {msg.secondaryMatches && msg.secondaryMatches.length > 0 && (
                  <div className="mt-2 pl-1 max-w-[90%] space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      Topik Terkait Lainnya:
                    </p>
                    {msg.secondaryMatches.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSuggestionClick(item.question)}
                        className="neu-btn text-left w-full justify-start px-3 py-2 min-h-[40px] rounded-xl text-[#0F766E] dark:text-teal-300 text-[11px]"
                      >
                        <i className="fa-solid fa-arrow-turn-down-right mr-1.5 text-[9px]"></i>
                        {item.question}
                      </button>
                    ))}
                  </div>
                )}

                {/* Category Chips for Fallback */}
                {msg.availableCategories && msg.availableCategories.length > 0 && (
                  <div className="mt-2 pl-1 max-w-[95%]">
                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Kategori Pilihan:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.availableCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryClick(cat)}
                          className="neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-[10px] font-semibold text-[#0F766E] dark:text-teal-300"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 pl-1 max-w-[95%] space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <i className="fa-solid fa-lightbulb text-amber-500 text-[10px]"></i>
                      Rekomendasi Pertanyaan:
                    </p>
                    {msg.suggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSuggestionClick(s.question)}
                        className="neu-btn text-left w-full justify-start px-3 py-2 min-h-[40px] rounded-xl text-[#0F766E] dark:text-teal-300 text-[11px]"
                      >
                        <i className="fa-solid fa-circle-question mr-1.5 text-[10px]"></i>
                        {s.question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-[#E6ECF2] dark:bg-[#1F242D] border-t border-slate-300/60 dark:border-slate-700/60 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pertanyaan seputar SIPJAM..."
              aria-label="Ketik pertanyaan"
              className="neu-input flex-1 text-xs rounded-xl px-3 py-2.5 min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              aria-label="Kirim pertanyaan"
              className="neu-btn neu-btn-primary w-11 h-11 rounded-xl disabled:opacity-40 flex items-center justify-center shrink-0"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
export default AIAssistant;
