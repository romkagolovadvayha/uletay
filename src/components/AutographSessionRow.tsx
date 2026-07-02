import React from 'react';
import { AutographSession } from '../types';
import { EventScheduleRow } from './EventScheduleRow';

type Props = {
  session: AutographSession;
  isLive?: boolean;
  isUpcoming?: boolean;
  soonCountdown?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
};

export function AutographSessionRow({
  session,
  isLive,
  isUpcoming,
  soonCountdown,
  isFavorite,
  onToggleFavorite,
  onPress,
}: Props) {
  return (
    <EventScheduleRow
      time={session.startTime}
      stageId={session.stageId}
      artist={session.artist}
      isLive={isLive}
      isUpcoming={isUpcoming}
      soonCountdown={soonCountdown}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      onPress={onPress}
    />
  );
}
