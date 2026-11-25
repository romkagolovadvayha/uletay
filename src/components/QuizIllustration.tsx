import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { quizArtwork } from '../data/quizArtwork';
import { quizColors as c, quizStyles as s } from '../theme/quiz';

const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

export function QuizIllustration({ art, revealed, caption, active = true, celebrate = false }: { art: number; revealed: boolean; caption: string; active?: boolean; celebrate?: boolean }) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const reveal = useSharedValue(revealed ? 1 : 0);
  const float = useSharedValue(0);
  useEffect(() => {
    reveal.set(withTiming(revealed ? 1 : 0, { duration: reduced ? 0 : 420, easing: easeOut }));
  }, [art, reduced, reveal, revealed]);
  useEffect(() => {
    if (active && !reduced) float.set(withRepeat(withSequence(withTiming(-5, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })), -1));
    else { cancelAnimation(float); float.set(0); }
    return () => cancelAnimation(float);
  }, [active, float, reduced]);
  const silhouette = useAnimatedStyle(() => ({ opacity: 1 - reveal.get() }));
  const color = useAnimatedStyle(() => ({ opacity: reveal.get(), transform: [{ translateY: (1 - reveal.get()) * 28 }, { scale: 0.94 + reveal.get() * 0.06 }] }));
  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }] }));
  return <View style={s.artStage} accessibilityLabel={revealed ? caption : 'Загадочный силуэт. Иллюстрация раскроется после ответа.'} accessible>
    <View style={s.artRing} />
    <View style={s.artHalo} />
    <Animated.View style={[s.artFrame, floating]} accessible={false}>
      <Animated.View style={[s.artImage, silhouette]}>
        <Image source={quizArtwork[art]} style={s.artImage} contentFit="contain" tintColor={c.silhouette} transition={0} accessible={false} onError={() => setFailed(true)} />
      </Animated.View>
      <Animated.View style={[s.artImage, color]}>
        <Image source={failed ? quizArtwork[51] : quizArtwork[art]} style={s.artImage} contentFit="contain" transition={0} accessible={false} />
      </Animated.View>
      {!revealed && <Text style={s.questionMark}>?</Text>}
    </Animated.View>
    {celebrate && !reduced && Array.from({ length: 18 }, (_, i) => <Animated.View key={i} pointerEvents="none" style={[s.confetti, {
      left: `${8 + ((i * 37) % 85)}%`, top: `${5 + ((i * 17) % 70)}%`, backgroundColor: i % 2 ? c.gold : c.success,
      animationName: { from: { opacity: 0, transform: [{ translateY: -45 }, { rotate: '0deg' }] }, '20%': { opacity: 1 }, to: { opacity: 0, transform: [{ translateY: 100 }, { rotate: '180deg' }] } },
      animationDuration: 1600, animationDelay: i * 45, animationIterationCount: 2,
    }]} />)}
  </View>;
}
