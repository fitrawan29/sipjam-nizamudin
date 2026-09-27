export { OnboardingTutorial } from './OnboardingTutorial';
export type { OnboardingTutorialProps } from './OnboardingTutorial';

export type { TourStep } from './tutorialSteps';

export {
  STORAGE_KEY_GURU,
  STORAGE_KEY_ADMIN,
  GURU_STEPS,
  ADMIN_STEPS,
  normalizeRole,
  getStepsForRole,
  isTutorialCompleted,
  shouldShowTutorial,
  setTutorialCompleted,
  resetTutorial,
} from './tutorialSteps';
