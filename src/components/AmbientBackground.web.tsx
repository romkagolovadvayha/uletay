import React from 'react';
import { AMBIENT_BACKGROUND_CSS } from '../theme/ambientBackground';

export function AmbientBackground() {
  return <>
    <style>{AMBIENT_BACKGROUND_CSS}</style>
    <div className="uletay-ambient-background" aria-hidden="true" />
  </>;
}
