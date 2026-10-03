export { AIAssistant, getAIAssistantGreeting, default } from './AIAssistant';
export type { AIAssistantProps } from './AIAssistant';

export {
  FAQ_ITEMS,
  MENU_CATEGORIES
} from './knowledgeBase';
export type {
  FAQItem,
  MenuCategoryMeta,
  UserRole
} from './knowledgeBase';

export {
  tokenize,
  normalizeQuery,
  calculateMatchScore,
  findBestAnswers,
  getContextSuggestions,
  getFallbackResponse,
  getCategoryByView,
  MIN_MATCH_SCORE_THRESHOLD
} from './faqMatcher';
export type {
  ScoredFAQItem,
  FallbackResponse
} from './faqMatcher';
