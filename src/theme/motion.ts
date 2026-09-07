/* ds-allow-hardcode:start -- Central motion token definitions. */
export const motion = {
  pressScale: 0.97,
  pressDurationMs: 120,
  pressBezier: [0.23, 1, 0.32, 1],
  pressTransitionCss: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1)',
  selectionDurationMs: 160,
  selectionTransitionCss:
    'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms cubic-bezier(0.23, 1, 0.32, 1), color 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
  mapCameraDurationMs: 280,
} as const;
/* ds-allow-hardcode:end */
