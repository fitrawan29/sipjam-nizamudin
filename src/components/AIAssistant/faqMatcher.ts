/**
 * FAQ Matcher for SIPJAM Offline AI Assistant
 * Provides tokenization, normalization, multi-signal scoring with context boosting,
 * context suggestions, and friendly fallback responses.
 * 100% offline pure TypeScript implementation.
 */

import { FAQ_ITEMS, FAQItem, MENU_CATEGORIES, MenuCategoryMeta } from './knowledgeBase';

export interface ScoredFAQItem extends FAQItem {
  score: number;
  item: FAQItem;
}

export interface FallbackResponse {
  message: string;
  categories: string[];
  suggestions: FAQItem[];
}

/**
 * Normalizes text and splits into distinct alphanumeric tokens.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  // Lowercase and strip punctuation/symbols, keeping letters and digits
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!cleaned) return [];

  // Split and filter tokens with length >= 2
  const tokens = cleaned.split(' ').filter(t => t.length >= 2);
  return Array.from(new Set(tokens));
}

/**
 * Normalizes query string for phrase matching.
 */
export function normalizeQuery(query: string): string {
  return (query || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates matching score between a user query and an FAQ item.
 * Scoring signals:
 * - Exact phrase match in question or query: +50 pts
 * - Keyword exact phrase match: +25 pts per keyword
 * - Keyword token match: +15 pts per keyword
 * - Question token match: +12 pts per matched token
 * - Answer token match: +3 pts per matched token
 * - Context boost: +15 pts if currentView matches item.relatedViews
 */
export function calculateMatchScore(
  item: FAQItem,
  query: string,
  currentView?: string
): number {
  const normQuery = normalizeQuery(query);
  if (!normQuery) return 0;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  let score = 0;
  const normQuestion = normalizeQuery(item.question);
  const questionTokens = new Set(tokenize(item.question));
  const answerTokens = new Set(tokenize(item.answer));

  // 1. Exact phrase match
  if (normQuestion.includes(normQuery) || (normQuery.length >= 10 && normQuery.includes(normQuestion))) {
    score += 50;
  }

  // 2. Keyword matching
  for (const kw of item.keywords) {
    const normKw = normalizeQuery(kw);
    if (!normKw) continue;

    // Full keyword phrase present in query
    if (normQuery.includes(normKw)) {
      score += 25;
    } else {
      // Check token overlap
      const kwTokens = tokenize(kw);
      const matches = kwTokens.filter(t => queryTokens.includes(t));
      if (matches.length > 0) {
        score += 15 * (matches.length / kwTokens.length);
      }
    }
  }

  // 3. Question token matches
  for (const token of queryTokens) {
    if (questionTokens.has(token)) {
      score += 12;
    }
  }

  // 4. Answer token matches (lower weight)
  for (const token of queryTokens) {
    if (answerTokens.has(token)) {
      score += 3;
    }
  }

  // 5. Context-aware boost (+15 points when active view matches)
  if (currentView && item.relatedViews && item.relatedViews.includes(currentView)) {
    score += 15;
  }

  return Math.round(score);
}

/**
 * Minimum score threshold to consider an FAQ item as a valid answer.
 */
export const MIN_MATCH_SCORE_THRESHOLD = 18;

/**
 * Searches the static knowledge base for the best matching FAQ items.
 * Returns empty array if no item meets the score threshold.
 */
export function findBestAnswers(
  query: string,
  currentView?: string,
  limit: number = 3
): ScoredFAQItem[] {
  const norm = normalizeQuery(query);
  if (!norm) return [];

  const scored: ScoredFAQItem[] = FAQ_ITEMS.map(item => {
    const score = calculateMatchScore(item, query, currentView);
    return {
      ...item,
      score,
      item
    };
  });

  const matching = scored
    .filter(res => res.score >= MIN_MATCH_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  return matching.slice(0, limit);
}

/**
 * Returns context-aware suggestion questions for the currently active page.
 */
export function getContextSuggestions(
  currentView?: string,
  limit: number = 4
): FAQItem[] {
  let suggestions: FAQItem[] = [];

  if (currentView) {
    suggestions = FAQ_ITEMS.filter(item => item.relatedViews.includes(currentView));
  }

  // If active view has fewer items than limit, add general/popular items
  if (suggestions.length < limit) {
    const fallbackItems = FAQ_ITEMS.filter(
      item => item.relatedViews.includes('view-home') && !suggestions.some(s => s.id === item.id)
    );
    suggestions = [...suggestions, ...fallbackItems];
  }

  return suggestions.slice(0, limit);
}

/**
 * Generates a friendly Indonesian fallback response when no FAQ matches the query.
 */
export function getFallbackResponse(
  query: string,
  currentView?: string
): FallbackResponse {
  const trimmed = (query || '').trim();
  const queryDisplay = trimmed ? `"${trimmed}"` : 'pertanyaan Anda';

  const message = `Maaf, saya belum menemukan jawaban yang sesuai untuk ${queryDisplay}. Silakan pilih topik menu di bawah ini atau coba ketik kata kunci yang lebih spesifik seperti "presensi", "jurnal", "piket", atau "nilai".`;

  const categories = MENU_CATEGORIES.map(c => c.name);
  const suggestions = getContextSuggestions(currentView, 4);

  return {
    message,
    categories,
    suggestions
  };
}

/**
 * Helper to get category metadata by viewId or category name.
 */
export function getCategoryByView(viewId: string): MenuCategoryMeta | undefined {
  return MENU_CATEGORIES.find(c => c.viewId === viewId);
}
