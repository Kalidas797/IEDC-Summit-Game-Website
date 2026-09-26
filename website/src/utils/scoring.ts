import type { QuestionsPerGameSettingsData } from '../../../shared/types';

export function calculateTimeBasedScore(
  elapsedMs: number,
  settings: QuestionsPerGameSettingsData,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  
  const questionTimeLimitMs = (settings.questionTimeLimit || 10) * 1000;
  const maxScore = settings.maxScorePerQuestion || 100;

  if (elapsedMs >= questionTimeLimitMs) {
    return 0; // Timeout
  }

  if (settings.timeBasedScoringEnabled === false) {
    return maxScore; // Fixed scoring
  }

  // Linear decay formula
  const remainingMs = questionTimeLimitMs - elapsedMs;
  let score = maxScore * (remainingMs / questionTimeLimitMs);
  
  // Clamp between 0 and maxScore
  score = Math.max(0, Math.min(maxScore, score));
  
  return Math.round(score);
}
