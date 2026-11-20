import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FestivalIcon } from './FestivalIcon.web';

type BurstOrigin = { id: number; x: number; y: number };

export function FavoriteParticles({ origin }: { origin: BurstOrigin }) {
  const layerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    // The top layer also clears clipping and stacking contexts inside dialog sheets.
    // Older browsers still get an unclipped, fixed-position portal on document.body.
    if (typeof layer.showPopover === 'function') {
      layer.showPopover();
      return () => layer.hidePopover();
    }
    layer.removeAttribute('popover');
  }, []);

  return createPortal(
    <span
      ref={layerRef}
      popover="manual"
      className="fest-particles fest-favorite-burst-layer"
      aria-hidden="true"
      style={{ left: origin.x, top: origin.y }}
    >
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          style={{
            '--hx': `${(i - 3) * 16}px`,
            '--hy': `${-45 - Math.sin((i / 6) * Math.PI) * 35}px`,
            '--hr': `${(i - 3) * 16}deg`,
            animationDelay: `${i * 22}ms`,
          } as React.CSSProperties}
        >
          <FestivalIcon name={i % 3 === 0 ? 'spark' : 'heart'} size={i % 2 === 0 ? 12 : 16} filled />
        </span>
      ))}
    </span>,
    document.body,
  );
}

export function FavoriteBurst({ isFavorite, onToggleFavorite, size = 24, label, caption }: {
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  size?: number;
  label?: string;
  caption?: string;
}) {
  const [burst, setBurst] = useState<BurstOrigin | null>(null);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <button
      type="button"
      className={`${caption ? 'fest-button' : 'fest-icon'} fest-favorite`}
      data-wide={!!caption}
      aria-pressed={!!isFavorite}
      aria-label={`${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}${label ? `: ${label}` : ''}`}
      data-burst={burst !== null}
      onClick={event => {
        event.stopPropagation();
        if (!onToggleFavorite) return;
        if (timer.current) clearTimeout(timer.current);

        if (!isFavorite && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const heart = event.currentTarget.querySelector('svg') ?? event.currentTarget;
          const rect = heart.getBoundingClientRect();
          setBurst({ id: ++sequence.current, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          // Include the stagger of the last particle (750 + 6 * 22 ms).
          timer.current = setTimeout(() => setBurst(null), 900);
        } else {
          setBurst(null);
        }
        onToggleFavorite();
      }}
    >
      <FestivalIcon name="heart" size={size} filled={isFavorite} />
      {caption ? <span style={{ whiteSpace: 'normal' }}>{caption}</span> : null}
      {burst ? <FavoriteParticles key={burst.id} origin={burst} /> : null}
    </button>
  );
}
