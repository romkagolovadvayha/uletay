import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BackButtonProps } from './BackButton.types';

const css = `
.uletay-back {
  appearance:none; box-sizing:border-box; display:flex; align-items:center; justify-content:center;
  flex:0 0 44px; width:44px; height:44px; margin:0; padding:0; border-radius:50%;
  border:1px solid rgba(255,255,255,.18); color:#F5F5F7;
  background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,0) 60%),rgba(38,38,42,.82);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.16),0 3px 12px rgba(0,0,0,.18);
  -webkit-backdrop-filter:blur(24px) saturate(150%); backdrop-filter:blur(24px) saturate(150%);
  cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent;
  transition:background-color 140ms ease,border-color 140ms ease,transform 180ms cubic-bezier(.2,.8,.2,1);
}
.uletay-back svg { display:block; width:24px; height:24px; pointer-events:none; }
@media (hover:hover) { .uletay-back:hover { background-color:rgba(64,64,69,.9); border-color:rgba(255,255,255,.28); } }
.uletay-back:active { transform:scale(.94); background-color:rgba(82,82,88,.92); }
.uletay-back:focus-visible { outline:2px solid #C7C7CC; outline-offset:3px; }
@media (prefers-reduced-motion:reduce) { .uletay-back { transition:none; } .uletay-back:active { transform:none; } }
@media (prefers-reduced-transparency:reduce),(prefers-contrast:more) {
  .uletay-back { background:#2C2C2E; border-color:#68686C; -webkit-backdrop-filter:none; backdrop-filter:none; }
}
@media (forced-colors:active) { .uletay-back { background:ButtonFace; color:ButtonText; border-color:ButtonText; box-shadow:none; } }
`;

export function BackButton({ onPress, style, accessibilityHint }: BackButtonProps) {
  return <View style={[style, styles.frame]}>
    <style>{css}</style>
    <button type="button" className="uletay-back" aria-label="Назад" title={accessibilityHint ?? 'Назад'} onClick={onPress}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="m14.5 5.5-6.5 6.5 6.5 6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  </View>;
}

const styles = StyleSheet.create({
  frame: {
    width:44, height:44, minWidth:44, minHeight:44, flexGrow:0, flexShrink:0,
    paddingHorizontal:0, paddingVertical:0, borderWidth:0, borderRadius:0, backgroundColor:'transparent',
  },
});
