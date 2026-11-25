import React, { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop, Line } from 'react-native-svg';
import { quizColors as c } from '../theme/quiz';

export type QuizFrameTone = 'idle' | 'gold' | 'correct' | 'wrong';

/** Drawn game-show frames with transparent pointed corners, at any resolution. */
export function QuizFrameArt({ tone = 'idle', question = false }: { tone?: QuizFrameTone; question?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gold = tone === 'gold';
  const edge = tone === 'correct' ? c.success : tone === 'wrong' ? c.danger : c.gold;
  const face = tone === 'correct' ? c.successDeep : tone === 'wrong' ? c.dangerDeep : c.card;
  const tip = question ? 44 : 56;
  const outline = `${tip},2 ${1000-tip},2 997,50 ${1000-tip},98 ${tip},98 3,50`;
  const inset = `${tip+5},7 ${995-tip},7 983,50 ${995-tip},93 ${tip+5},93 17,50`;
  return <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1000 100" preserveAspectRatio="none" pointerEvents="none" accessible={false}>
    <Defs>
      <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={c.goldDim} /><Stop offset=".25" stopColor={edge} /><Stop offset=".5" stopColor={c.goldLight} /><Stop offset=".75" stopColor={edge} /><Stop offset="1" stopColor={c.goldDim} /></LinearGradient>
      <LinearGradient id={`${id}face`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={gold ? c.goldLight : face} /><Stop offset=".5" stopColor={gold ? c.gold : c.inset} /><Stop offset="1" stopColor={gold ? c.gold : face} /></LinearGradient>
    </Defs>
    <Polygon points={outline} fill={`url(#${id}face)`} stroke={`url(#${id}rim)`} strokeWidth={gold || tone !== 'idle' ? 2 : 1.2} vectorEffect="non-scaling-stroke" />
    <Polygon points={inset} fill="none" stroke={gold ? c.goldDim : edge} strokeOpacity={gold ? 0.6 : 0.2} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
    <Line x1={tip+20} y1="2" x2="370" y2="2" stroke={c.goldLight} strokeWidth="1.5" strokeOpacity=".8" vectorEffect="non-scaling-stroke" />
    <Line x1="630" y1="98" x2={980-tip} y2="98" stroke={edge} strokeWidth="1.5" strokeOpacity=".65" vectorEffect="non-scaling-stroke" />
  </Svg>;
}

export function QuizFrame({ children, style, tone = 'idle' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: QuizFrameTone }) {
  return <View style={style}><QuizFrameArt tone={tone} question />{children}</View>;
}
