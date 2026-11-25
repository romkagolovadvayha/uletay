import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { festivalNavigation } from '../../shared/navigation-bar';
import { DeferredIonicons } from '../components/DeferredIonicons';
import { MotionPressable } from '../components/MotionPressable';
import { QuizFrame, QuizFrameArt, type QuizFrameTone } from '../components/QuizFrame';
import { QuizIllustration } from '../components/QuizIllustration';
import { QuizMagicBurst } from '../components/QuizMagicBurst';
import { quizArtwork } from '../data/quizArtwork';
import { useIsTablet } from '../hooks/useIsTablet';
import type { MoreStackParamList } from '../navigation/types';
import { quizColors as c, quizStyles as s } from '../theme/quiz';
import { createQuizGame, currentQuizQuestion, EMPTY_QUIZ_STATS, finishQuizStats, isQuizAnswerCorrect, parseQuizStats, QUIZ_AUTO_ADVANCE_MS, QUIZ_POINTS, QUIZ_STORAGE_KEY, quizReducer, type Lifeline, type QuizAction, type QuizGame, type QuizStats } from '../utils/uletayQuiz';

const letters = ['A', 'B', 'C', 'D'];
const Icon = ({ name, size = 18, color = c.gold }: { name: React.ComponentProps<typeof DeferredIonicons>['name']; size?: number; color?: string }) => <DeferredIonicons name={name} size={size} color={color} />;

function StartButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <MotionPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.primary}>
    <QuizFrameArt tone="gold" /><Text style={s.primaryText}>{label}</Text>
  </MotionPressable>;
}

export function UletayQuizScreen({ navigation }: NativeStackScreenProps<MoreStackParamList, 'UletayQuiz'>) {
  const window = useWindowDimensions();
  const [bounds, setBounds] = useState<{ width: number; height: number } | null>(null);
  const width = bounds?.width ?? window.width;
  const height = bounds?.height ?? window.height;
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const menuSpace = isTablet ? 0 : festivalNavigation.height + 20;
  const usableHeight = height - menuSpace - insets.top - insets.bottom;
  const small = usableHeight < 700;
  const tiny = usableHeight < 640;
  const split = width >= 900 || (width > height * 1.25 && height < 600);
  const compactLandscape = split && usableHeight < 400;
  const backgroundId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const [game, setGame] = useState<QuizGame | null>(null);
  const [stats, setStats] = useState<QuizStats>(EMPTY_QUIZ_STATS);
  const recorded = useRef(false);
  const questionHeading = useRef<Text>(null);
  const finished = !!game && ['won', 'lost', 'banked'].includes(game.status);
  const revealed = game?.status === 'revealed';
  const correct = !!game && isQuizAnswerCorrect(game);
  const question = game ? currentQuizQuestion(game) : null;
  const roundKey = game && !finished ? `${game.index}:${game.deck[game.index].id}` : null;
  const questionHeight = compactLandscape ? 80 : tiny ? 100 : small ? 114 : 130;
  const answerHeight = compactLandscape ? 48 : tiny ? 56 : small ? 64 : 76;

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(QUIZ_STORAGE_KEY).then(raw => { if (mounted) setStats(parseQuizStats(raw)); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const act = useCallback((action: QuizAction) => setGame(previous => previous ? quizReducer(previous, action) : previous), []);
  const answer = useCallback((index: number) => act({ type: 'answer', index }), [act]);
  const start = () => {
    recorded.current = false;
    const next = createQuizGame(stats.discovered);
    setGame(next);
    // Warm every illustration in this set; image loading never interrupts a reveal.
    const uris = next.deck.map(slot => Asset.fromModule(quizArtwork[Number(slot.id.slice(-2))]).uri);
    void Image.prefetch(uris).catch(() => {});
  };

  useEffect(() => {
    if (!game || game.status !== 'checking' || !focused) return;
    const timer = setTimeout(() => act({ type: 'reveal' }), reduced ? 80 : 620);
    return () => clearTimeout(timer);
  }, [act, focused, game, reduced]);

  useEffect(() => {
    if (!game || game.status !== 'revealed' || !focused) return;
    const timer = setTimeout(() => act({ type: 'next' }), QUIZ_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [act, focused, game]);

  useEffect(() => {
    if (!revealed || !focused || Platform.OS !== 'ios') return;
    void Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [correct, focused, revealed]);

  useEffect(() => {
    if (!game || !finished || recorded.current) return;
    recorded.current = true;
    const next = finishQuizStats(stats, game);
    setStats(next);
    void AsyncStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, [finished, game, stats]);

  useEffect(() => {
    if (!focused || Platform.OS !== 'web' || !game || finished) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '') || target?.isContentEditable || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (/^[1-4]$/.test(event.key) && game.status === 'playing') { event.preventDefault(); answer(Number(event.key) - 1); }
    };
    globalThis.window.addEventListener('keydown', onKey);
    return () => globalThis.window.removeEventListener('keydown', onKey);
  }, [answer, finished, focused, game]);

  useEffect(() => {
    if (!roundKey || !focused || Platform.OS !== 'web') return;
    const element = questionHeading.current as unknown as HTMLElement | null;
    element?.setAttribute?.('tabindex', '-1');
    element?.focus?.({ preventScroll: true });
  }, [roundKey, focused]);

  const leave = () => navigation.getParent()?.navigate('HomeTab');
  const hint = (name: Lifeline) => act({ type: 'lifeline', name });
  const status = revealed ? correct ? game?.index === 11 ? '12 из 12. Ты победил!' : 'Верно!' : `Верный ответ: ${question?.answers[0]}` : null;

  return <View nativeID="uletay-quiz" style={s.root} onLayout={event => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setBounds(previous => previous && Math.abs(previous.width - nextWidth) < 1 && Math.abs(previous.height - nextHeight) < 1 ? previous : { width: nextWidth, height: nextHeight });
  }}>
    <Svg style={s.background} width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" pointerEvents="none" accessible={false}>
      <Defs>
        <LinearGradient id={`${backgroundId}base`} x1="0%" y1="0%" x2="15%" y2="100%"><Stop offset="0" stopColor={c.backgroundTop} /><Stop offset=".55" stopColor={c.backgroundMid} /><Stop offset="1" stopColor={c.backgroundBottom} /></LinearGradient>
        <RadialGradient id={`${backgroundId}glow`} cx="80%" cy="0%" rx="90%" ry="65%"><Stop offset="0" stopColor={c.backgroundGlow} stopOpacity=".9" /><Stop offset="1" stopColor={c.backgroundGlow} stopOpacity="0" /></RadialGradient>
      </Defs>
      <Rect width="1000" height="1000" fill={`url(#${backgroundId}base)`} /><Rect width="1000" height="1000" fill={`url(#${backgroundId}glow)`} />
      <Path d="M0 330L500 100 1000 330M0 680L500 900 1000 680" stroke={c.gold} strokeOpacity=".035" strokeWidth="1" fill="none" />
      {Array.from({ length: 24 }, (_, i) => <Circle key={i} cx={((i * 173) % 970) + 15} cy={((i * 293) % 970) + 15} r={i % 3 ? 1 : 1.8} fill={c.gold} opacity={i % 2 ? 0.14 : 0.07} />)}
    </Svg>
    <View style={[s.shell, small && s.shellSmall, { paddingTop: Math.max(insets.top, small ? 4 : 8), paddingBottom: menuSpace + Math.max(insets.bottom, small ? 6 : 12) }]}>
      <View style={[s.header, small && s.headerSmall]}>
        <MotionPressable accessibilityRole="button" accessibilityLabel="Закрыть игру" onPress={leave} style={s.close}><Icon name="close-outline" size={23} color={c.muted} /></MotionPressable>
        {game ? <Text style={s.brand}>Знаток Улетай</Text> : <View style={s.headerSpacer} />}
        <Text style={s.round}>{game && !finished ? `${game.index + 1} / 12` : ''}</Text>
      </View>

      {!game ? <View style={s.welcome}>
        <View style={s.welcomeGroup}>
          <Text accessibilityRole="header" style={[s.welcomeTitle, small && s.welcomeTitleSmall]}>Знаток{ '\n' }<Text style={s.welcomeAccent}>Улетай</Text></Text>
          <Text style={s.welcomeText}>Квиз о музыке, группах и истории фестиваля. Ответь на 12 вопросов и стань знатоком Улетай.</Text>
          <StartButton label="Начать" onPress={start} />
        </View>
      </View> : finished ? <View style={[s.intro, split && s.introSplit]}>
        <View style={[s.artArea, { width: '100%', maxWidth: split ? 420 : 350 }]}><QuizIllustration key="result" art={game.status === 'won' ? 51 : currentQuizQuestion(game).art} revealed caption={game.status === 'won' ? 'Трофей знатока' : currentQuizQuestion(game).reveal} active={focused} celebrate={game.status === 'won'} /></View>
        <View style={s.endControls}><Text accessibilityRole="header" style={s.endTitle}>{game.status === 'won' ? 'Ты знаток Улетай!' : 'Сыграем ещё?'}</Text><Text style={s.endText}>{game.correct} из 12</Text><StartButton label="Начать заново" onPress={start} /></View>
      </View> : question && <>
        <View style={s.progress} accessibilityLabel={`Вопрос ${game.index + 1} из 12`}>{QUIZ_POINTS.map((_, i) => <View key={i} style={[s.progressTick, i < game.correct && s.progressDone, i === game.index && s.progressCurrent]} />)}</View>
        <View style={[s.body, split && s.bodySplit]}>
          <View style={[s.artArea, split && s.artAreaSplit]}>
            <QuizIllustration key={question.id} art={question.art} revealed={revealed} caption={question.reveal} active={focused} />
            {revealed && correct && <QuizMagicBurst key={`magic-${question.id}`} />}
            {game.clueShown && !revealed && <View style={s.clue} accessibilityLiveRegion="polite"><Text style={s.clueText}>{question.hint}</Text></View>}
          </View>
          <View style={[s.board, split && s.boardSplit]}>
            <QuizFrame tone={revealed ? correct ? 'correct' : 'wrong' : 'idle'} style={[s.frame, { height: questionHeight }]}>
              {revealed ? <View accessibilityLiveRegion="polite"><Text style={[s.feedback, !correct && s.feedbackWrong]} numberOfLines={2}>{status}</Text><Text style={[s.fact, compactLandscape && s.factCompact]} numberOfLines={compactLandscape ? 3 : 4} adjustsFontSizeToFit minimumFontScale={0.8}>{question.explanation}</Text></View> : <Text ref={questionHeading} accessibilityRole="header" style={[s.question, small && s.questionSmall]} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.8}>{question.question}</Text>}
            </QuizFrame>
            <View style={s.answersGrid}>{game.deck[game.index].order.map((original, i) => {
              const hidden = game.hidden.includes(i) && !revealed;
              const right = revealed && original === 0;
              const wrong = revealed && game.selected === i && original !== 0;
              const gold = !revealed && game.selected === i;
              const tone: QuizFrameTone = right ? 'correct' : wrong ? 'wrong' : gold ? 'gold' : 'idle';
              return <MotionPressable key={i} testID={`quiz-answer-${i}`} accessibilityRole="button" accessibilityLabel={`${letters[i]}: ${hidden ? 'Вариант исключён' : question.answers[original]}`} accessibilityState={{ disabled: game.status !== 'playing' || hidden }} disabled={game.status !== 'playing' || hidden} onPress={() => answer(i)} style={[s.answer, s.answerGrid, { height: answerHeight, opacity: hidden ? 0.3 : 1 }]}>
                <QuizFrameArt tone={tone} />
                <View style={s.answerInner}><Text style={[s.answerLetter, gold && s.answerOnGold]}>{letters[i]}</Text><Text style={[s.answerText, width < 360 && s.answerTextSmall, gold && s.answerOnGold]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{hidden ? '—' : question.answers[original]}</Text></View>
              </MotionPressable>;
            })}</View>
            <View style={s.bottom}>
              {revealed ? <View style={s.autoProgress} accessibilityLabel="Следующий вопрос откроется автоматически"><View style={s.autoTrack}><Animated.View style={[s.autoFill, !reduced && { animationName: { from: { transform: [{ scaleX: 0 }] }, to: { transform: [{ scaleX: 1 }] } }, animationDuration: QUIZ_AUTO_ADVANCE_MS, animationTimingFunction: 'linear', animationFillMode: 'forwards' }]} /></View></View> : <>
                <MotionPressable accessibilityRole="button" accessibilityLabel="50 на 50: убрать два неверных ответа" disabled={game.used.fifty || game.status !== 'playing'} onPress={() => hint('fifty')} style={[s.tool, game.used.fifty && s.toolUsed]}><Text style={s.toolText}>50:50</Text></MotionPressable>
                <MotionPressable accessibilityRole="button" accessibilityLabel="Наводка: показать подсказку к вопросу" disabled={game.used.clue || game.status !== 'playing'} onPress={() => hint('clue')} style={[s.tool, game.used.clue && s.toolUsed]}><Icon name="bulb-outline" size={16} /><Text style={s.toolText}>Наводка</Text></MotionPressable>
                <MotionPressable accessibilityRole="button" accessibilityLabel="Замена: получить другой вопрос" disabled={game.used.swap || game.status !== 'playing'} onPress={() => hint('swap')} style={[s.tool, game.used.swap && s.toolUsed]}><Icon name="shuffle-outline" size={16} /><Text style={s.toolText}>Замена</Text></MotionPressable>
              </>}
            </View>
          </View>
        </View>
      </>}
    </View>
  </View>;
}
