import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ULETAY_QUIZ_QUESTIONS as questions } from '../src/data/uletayQuiz';
import { createQuizGame, currentQuizQuestion, EMPTY_QUIZ_STATS, finishQuizStats, isQuizAnswerCorrect, parseQuizStats, QUIZ_POINTS, quizPoints, quizReducer, type QuizGame } from '../src/utils/uletayQuiz';

assert.equal(questions.length, 50);
assert.equal(new Set(questions.map(q => q.id)).size, 50);
assert.equal(new Set(questions.map(q => q.art)).size, 50);
for (const question of questions) {
  assert.equal(question.answers.length, 4);
  assert.equal(new Set(question.answers).size, 4, question.id);
  assert.ok(question.explanation && question.hint && question.reveal);
  assert.ok(new URL(question.source.url).protocol === 'https:');
  assert.ok(existsSync(`assets/quiz/${String(question.art).padStart(2, '0')}.webp`));
}
const seed = JSON.parse(readFileSync('cms/seed/content.json', 'utf8'));
const archiveChecks: [number, number, string][] = [[3,2007,'КАЛИНОВ МОСТ'],[4,2008,'ВОСКРЕСЕНИЕ'],[5,2009,'КРЕМАТОРИЙ'],[6,2010,'ЧИЖ & CO'],[7,2011,'УНДЕРВУД'],[8,2012,'КНЯZZ'],[9,2013,'БРАТЬЯ ГРИМ'],[10,2014,'ПИКНИК'],[11,2015,'АРИЯ'],[12,2016,'МЕЛЬНИЦА'],[13,2017,'ДДТ'],[14,2018,'NOIZE MC'],[15,2019,'КИС-КИС'],[17,2022,'СПЛИН'],[18,2023,'RADIO TAPOK'],[19,2024,'КИНО'],[20,2025,'ГАРИК СУКАЧЁВ'],[21,2026,'БРАВО']];
for (const [art, year, name] of archiveChecks) assert.ok(seed.headliners.find((h: { name: string; years: number[] }) => h.name === name)?.years.includes(year), `Question ${art}: ${name}, ${year}`);

const decks = new Set<string>();
for (let sample = 0; sample < 300; sample++) {
  const game = createQuizGame();
  assert.equal(game.deck.length, 12);
  assert.equal(new Set(game.deck.map(q => q.id)).size, 12);
  game.deck.forEach((slot, i) => {
    assert.deepEqual([...slot.order].sort(), [0,1,2,3]);
    assert.equal(questions.find(q => q.id === slot.id)!.difficulty, Math.floor(i / 4) + 1);
  });
  decks.add(game.deck.map(q => q.id).join(','));
}
assert.ok(decks.size > 290, 'New games must actually vary.');
let game = createQuizGame();
assert.equal(quizReducer(game, { type: 'confirm' }), game, 'Cannot confirm before selecting.');
assert.equal(quizReducer(game, { type: 'select', index: 9 }), game);
const initialQuestion = currentQuizQuestion(game).id;
game = quizReducer(game, { type: 'lifeline', name: 'fifty' });
assert.equal(game.hidden.length, 2);
assert.ok(game.hidden.every(i => game.deck[game.index].order[i] !== 0));
assert.equal(quizReducer(game, { type: 'lifeline', name: 'fifty' }), game);
assert.equal(quizReducer(game, { type: 'select', index: game.hidden[0] }), game);
game = quizReducer(game, { type: 'lifeline', name: 'clue' });
assert.ok(game.clueShown);
game = quizReducer(game, { type: 'lifeline', name: 'swap' });
assert.notEqual(currentQuizQuestion(game).id, initialQuestion);
assert.equal(new Set(game.deck.map(q => q.id)).size, 12);
assert.equal(game.hidden.length, 0);
assert.ok(!game.clueShown && game.used.clue && game.used.fifty && game.used.swap);

function answer(game: QuizGame, correct = true): QuizGame {
  const index = game.deck[game.index].order.findIndex(value => correct ? value === 0 : value !== 0);
  let next = quizReducer(game, { type: 'answer', index });
  assert.equal(next.status, 'checking');
  assert.equal(quizReducer(next, { type: 'answer', index: (index + 1) % 4 }), next, 'One tap locks the answer; a second tap cannot change it.');
  assert.equal(quizReducer(next, { type: 'select', index: (index + 1) % 4 }), next, 'Confirmed choice is locked.');
  next = quizReducer(next, { type: 'reveal' });
  assert.equal(isQuizAnswerCorrect(next), correct);
  assert.equal(quizReducer(next, { type: 'reveal' }), next, 'A duplicate reveal must not award points.');
  return quizReducer(next, { type: 'next' });
}
for (let i = 0; i < 12; i++) game = answer(game);
assert.equal(game.status, 'won');
assert.equal(game.correct, 12);
assert.equal(quizPoints(game), 100000);
assert.equal(quizReducer(game, { type: 'lifeline', name: 'swap' }), game);
for (const count of [0,3,4,7,8,11]) {
  let loss = createQuizGame();
  for (let i=0; i<count; i++) loss = answer(loss);
  loss = answer(loss, false);
  assert.equal(loss.status, 'lost');
  assert.equal(loss.correct, count);
  assert.equal(quizPoints(loss), count >= 8 ? QUIZ_POINTS[7] : count >= 4 ? QUIZ_POINTS[3] : 0);
}
let bank = answer(createQuizGame());
bank = quizReducer(bank, { type: 'bank' });
assert.equal(quizPoints(bank), 100);
const stats = finishQuizStats(EMPTY_QUIZ_STATS, game);
assert.equal(stats.wins, 1);
assert.equal(stats.played, 1);
assert.equal(stats.best, 100000);
assert.equal(stats.discovered.length, 13, 'Swapped and answered questions are both discovered.');
assert.deepEqual(parseQuizStats(JSON.stringify(stats)), stats);
for (const raw of ['bad', 'null', '{}', '{"played":-1}', '{"played":1,"wins":5,"best":0,"discovered":[]}']) assert.deepEqual(parseQuizStats(raw), EMPTY_QUIZ_STATS);
const fresh = createQuizGame(createQuizGame().deck.map(q => q.id));
assert.equal(fresh.deck.length, 12);
console.log('PASS: 50 sourced questions, archive years, artwork, random unique rounds, difficulty, all lifelines, 12-step win, checkpoint losses, cash out, stats and invalid storage.');
