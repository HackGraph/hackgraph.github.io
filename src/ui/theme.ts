import type { Difficulty } from '../data/schema';

export const difficultyMeta: Record<Difficulty, { label: string; dots: number }> = {
  easy: { label: 'Easy', dots: 1 },
  medium: { label: 'Medium', dots: 2 },
  hard: { label: 'Hard', dots: 3 },
};
