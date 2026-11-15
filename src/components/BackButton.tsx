import React from 'react';
import { MotionPressable } from './MotionPressable';
import type { BackButtonProps } from './BackButton.types';

export function BackButton(props: BackButtonProps) {
  return <MotionPressable {...props} accessibilityRole="button" accessibilityLabel="Назад" />;
}
