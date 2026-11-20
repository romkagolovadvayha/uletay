import React, { useLayoutEffect, useRef } from 'react';
import { LiquidCloseIcon } from '../LiquidDialog.web';
import { LIQUID_OVERLAY_CSS } from '../../theme/liquidOverlays.web';

type Props = {
  visible: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  onHeightChange?: (height: number) => void;
};

/** A nonmodal sheet: map gestures stay available around it. */
export function MapPoiPopup({ visible, children, onClose, showCloseButton = true, onHeightChange }: Props) {
  const panel = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const onHeightRef = useRef(onHeightChange);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    onHeightRef.current = onHeightChange;
  }, [onClose, onHeightChange]);

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element || !visible) return;
    const previous = document.activeElement;
    element.focus({ preventScroll: true });
    const measure = () => onHeightRef.current?.(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        onCloseRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      if (element.contains(document.activeElement) && previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [visible]);

  return <>
    <style>{LIQUID_OVERLAY_CSS}</style>
    <section id="festival-map-popup" ref={panel} className="liquid-map-sheet" data-visible={visible} role="dialog" aria-label="Информация на карте"
      aria-modal="false" aria-hidden={!visible} inert={!visible} tabIndex={-1}>
      <div className="liquid-map-sheet__handle" aria-hidden="true" />
      {onClose && showCloseButton ? <button type="button" className="liquid-dialog__close liquid-map-sheet__close" aria-label="Закрыть карточку" onClick={onClose}><LiquidCloseIcon /></button> : null}
      <div className="liquid-map-sheet__body">{children}</div>
    </section>
  </>;
}
