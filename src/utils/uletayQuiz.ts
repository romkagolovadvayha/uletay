import { ULETAY_QUIZ_QUESTIONS, type QuizQuestion } from '../data/uletayQuiz';

export const QUIZ_LENGTH = 12;
export const QUIZ_AUTO_ADVANCE_MS = 2600;
export const QUIZ_POINTS = [100, 200, 300, 1_000, 2_000, 4_000, 8_000, 16_000, 24_000, 40_000, 64_000, 100_000] as const;
export const QUIZ_STORAGE_KEY = 'uletay:quiz:v1';
export type QuizSlot = { id: string; order: number[] };
export type QuizStatus = 'playing' | 'checking' | 'revealed' | 'won' | 'lost' | 'banked';
export type Lifeline = 'fifty' | 'clue' | 'swap';
export type QuizGame = {
  deck: QuizSlot[];
  index: number;
  correct: number;
  selected: number | null;
  status: QuizStatus;
  hidden: number[];
  clueShown: boolean;
  used: Record<Lifeline, boolean>;
  seen: string[];
};
export type QuizStats = { played: number; wins: number; best: number; discovered: string[] };
export const EMPTY_QUIZ_STATS: QuizStats = { played: 0, wins: 0, best: 0, discovered: [] };
export const questionById = new Map(ULETAY_QUIZ_QUESTIONS.map(question => [question.id, question]));

export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.max(0, Math.min(0.999999999, random())) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function slot(question: QuizQuestion, random = Math.random): QuizSlot {
  return { id: question.id, order: shuffled([0, 1, 2, 3], random) };
}

export function createQuizGame(recent: readonly string[] = [], random = Math.random): QuizGame {
  const recentSet = new Set(recent);
  const deck = ([1, 2, 3] as const).flatMap(difficulty => {
    const pool = shuffled(ULETAY_QUIZ_QUESTIONS.filter(question => question.difficulty === difficulty), random);
    // Prefer fresh questions, still shuffle both sets. Four per difficulty.
    return [...pool.filter(question => !recentSet.has(question.id)), ...pool.filter(question => recentSet.has(question.id))]
      .slice(0, 4).map(question => slot(question, random));
  });
  return { deck, index: 0, correct: 0, selected: null, status: 'playing', hidden: [], clueShown: false, used: { fifty: false, clue: false, swap: false }, seen: [deck[0].id] };
}

export function currentQuizQuestion(game: QuizGame) {
  return questionById.get(game.deck[game.index].id)!;
}

export function isQuizAnswerCorrect(game: QuizGame) {
  return game.selected !== null && game.deck[game.index].order[game.selected] === 0;
}

export function quizPoints(game: QuizGame) {
  if (game.status === 'lost') {
    return game.correct >= 8 ? QUIZ_POINTS[7] : game.correct >= 4 ? QUIZ_POINTS[3] : 0;
  }
  return game.correct > 0 ? QUIZ_POINTS[game.correct - 1] : 0;
}

export type QuizAction =
  | { type: 'answer'; index: number }
  | { type: 'select'; index: number }
  | { type: 'confirm' }
  | { type: 'reveal' }
  | { type: 'next' }
  | { type: 'bank' }
  | { type: 'lifeline'; name: Lifeline; random?: () => number };

export function quizReducer(game: QuizGame, action: QuizAction): QuizGame {
  switch (action.type) {
    case 'answer': {
      if (game.status !== 'playing' || !Number.isInteger(action.index) || action.index < 0 || action.index > 3 || game.hidden.includes(action.index)) return game;
      return { ...game, selected: action.index, status: 'checking' };
    }
    case 'select':
      return game.status === 'playing' && Number.isInteger(action.index) && action.index >= 0 && action.index < 4 && !game.hidden.includes(action.index)
        ? { ...game, selected: action.index } : game;
    case 'confirm':
      return game.status === 'playing' && game.selected !== null ? { ...game, status: 'checking' } : game;
    case 'reveal':
      return game.status === 'checking' ? { ...game, status: 'revealed', correct: game.correct + (isQuizAnswerCorrect(game) ? 1 : 0) } : game;
    case 'next': {
      if (game.status !== 'revealed') return game;
      if (!isQuizAnswerCorrect(game)) return { ...game, status: 'lost' };
      if (game.index === QUIZ_LENGTH - 1) return { ...game, status: 'won' };
      const index = game.index + 1;
      return { ...game, index, status: 'playing', selected: null, hidden: [], clueShown: false, seen: [...game.seen, game.deck[index].id] };
    }
    case 'bank':
      return game.status === 'playing' ? { ...game, status: 'banked' } : game;
    case 'lifeline': {
      if (game.status !== 'playing' || game.used[action.name]) return game;
      const used = { ...game.used, [action.name]: true };
      if (action.name === 'clue') return { ...game, used, clueShown: true };
      if (action.name === 'fifty') {
        const wrong = game.deck[game.index].order.map((answer, index) => ({ answer, index })).filter(answer => answer.answer !== 0);
        const hidden = shuffled(wrong, action.random).slice(0, 2).map(answer => answer.index);
        return { ...game, used, hidden, selected: game.selected !== null && hidden.includes(game.selected) ? null : game.selected };
      }
      const excluded = new Set([...game.deck.map(item => item.id), ...game.seen]);
      const replacement = shuffled(ULETAY_QUIZ_QUESTIONS.filter(question => question.difficulty === currentQuizQuestion(game).difficulty && !excluded.has(question.id)), action.random)[0];
      if (!replacement) return game;
      const deck = [...game.deck];
      deck[game.index] = slot(replacement, action.random);
      return { ...game, deck, used, selected: null, hidden: [], clueShown: false, seen: [...game.seen, replacement.id] };
    }
  }
}

export function finishQuizStats(stats: QuizStats, game: QuizGame): QuizStats {
  return { played: stats.played + 1, wins: stats.wins + (game.status === 'won' ? 1 : 0), best: Math.max(stats.best, quizPoints(game)), discovered: [...new Set([...stats.discovered, ...game.seen])] };
}

export function parseQuizStats(raw: string | null): QuizStats {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || !Number.isInteger(value.played) || value.played < 0 || !Number.isInteger(value.wins) || value.wins < 0 || value.wins > value.played || !Number.isInteger(value.best) || value.best < 0 || value.best > QUIZ_POINTS[11] || !Array.isArray(value.discovered)) return { ...EMPTY_QUIZ_STATS };
    return { played: value.played, wins: value.wins, best: value.best, discovered: [...new Set<string>(value.discovered.filter((id: unknown): id is string => typeof id === 'string' && questionById.has(id)))] };
  } catch { return { ...EMPTY_QUIZ_STATS }; }
}
