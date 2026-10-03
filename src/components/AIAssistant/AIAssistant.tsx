'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FAQItem, MENU_CATEGORIES } from './knowledgeBase';
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
  className = '',
  initialOpen = false,
}: AIAssistantProps) {
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
      {/* Floating Trigger Button */}
      <button
        type="button"
        data-tour="ai-assistant-btn"
        aria-label="Buka Asisten AI SIPJAM"
        title="Tanya Asisten AI SIPJAM"
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-5 right-5 z-[45] w-14 h-14 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white shadow-xl shadow-emerald-900/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
      >
        <i className="fa-solid fa-robot text-2xl text-amber-300 drop-shadow group-hover:rotate-12 transition-transform duration-300"></i>

        {/* Hover tooltip for desktop */}
        <span className="hidden sm:block absolute right-16 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          🤖 Bantuan AI SIPJAM
        </span>
      </button>

      {/* Expandable Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Panel Asisten AI SIPJAM"
          className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[75vh] h-[480px] z-[45] flex flex-col bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-emerald-950 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-emerald-700/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-amber-300 border border-amber-300/30">
                <i className="fa-solid fa-robot text-sm"></i>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                  Asisten AI SIPJAM
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-200 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>100% Offline FAQ</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={initChat}
                title="Mulai ulang percakapan"
                aria-label="Mulai ulang percakapan"
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-emerald-200 hover:text-white flex items-center justify-center transition-colors text-xs"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup asisten"
                aria-label="Tutup asisten"
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-emerald-200 hover:text-white flex items-center justify-center transition-colors text-sm"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-gray-50/60 dark:bg-gray-950/40 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Bubble Container */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-800 rounded-bl-none'
                  }`}
                >
                  {/* Category Pill for AI Answers */}
                  {msg.category && (
                    <div className="mb-1.5 flex items-center gap-1">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        📁 {msg.category}
                      </span>
                    </div>
                  )}

                  {/* Matched Question Title */}
                  {msg.matchedQuestion && (
                    <p className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 mb-1 border-b border-gray-100 dark:border-gray-800 pb-1">
                      {msg.matchedQuestion}
                    </p>
                  )}

                  {/* Message Body */}
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  <span
                    className={`block mt-1 text-[9px] text-right ${
                      msg.sender === 'user' ? 'text-emerald-200' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>

                {/* Secondary Matches */}
                {msg.secondaryMatches && msg.secondaryMatches.length > 0 && (
                  <div className="mt-2 pl-1 max-w-[90%] space-y-1">
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                      Topik Terkait Lainnya:
                    </p>
                    {msg.secondaryMatches.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSuggestionClick(item.question)}
                        className="text-left w-full block px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-800 hover:border-emerald-400 dark:hover:border-emerald-500 text-emerald-800 dark:text-emerald-300 text-[11px] transition-colors shadow-2xs"
                      >
                        <i className="fa-solid fa-arrow-turn-down-right mr-1.5 text-emerald-500 text-[9px]"></i>
                        {item.question}
                      </button>
                    ))}
                  </div>
                )}

                {/* Category Chips for Fallback */}
                {msg.availableCategories && msg.availableCategories.length > 0 && (
                  <div className="mt-2 pl-1 max-w-[95%]">
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Kategori Pilihan:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {msg.availableCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryClick(cat)}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 pl-1 max-w-[95%] space-y-1">
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <i className="fa-solid fa-lightbulb text-amber-500 text-[10px]"></i>
                      Rekomendasi Pertanyaan:
                    </p>
                    {msg.suggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSuggestionClick(s.question)}
                        className="text-left w-full block px-2.5 py-1.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-[11px] transition-all hover:translate-x-0.5"
                      >
                        <i className="fa-solid fa-circle-question mr-1.5 text-emerald-600 dark:text-emerald-400 text-[10px]"></i>
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
          <div className="p-2.5 bg-white dark:bg-[#1e1e1e] border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pertanyaan seputar SIPJAM..."
              aria-label="Ketik pertanyaan"
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              aria-label="Kirim pertanyaan"
              className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95 shadow"
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
