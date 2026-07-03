import React from 'react';
import { AutographSession } from '../types';
import { formatTimeRange } from '../utils/scheduleHelpers';
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
      variant="autograph"
      time={formatTimeRange(session.startTime, session.endTime)}
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
