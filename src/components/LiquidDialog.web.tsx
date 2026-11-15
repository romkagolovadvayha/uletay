import React, { useId, useLayoutEffect, useRef } from 'react';
import { LIQUID_OVERLAY_CSS } from '../theme/liquidOverlays.web';
import type { LiquidDialogProps, LiquidSelectProps } from './LiquidDialog.types';

function focusSelectOption(option: HTMLElement) {
  option.focus({ preventScroll: true });
  const body = option.closest<HTMLElement>('.liquid-dialog__body');
  if (!body) return;
  // Scroll only the list, never the dialog or the page behind it. The opening
  // scale animation must not affect these untransformed layout measurements.
  const padding = 8;
  const top = option.offsetTop;
  const bottom = top + option.offsetHeight;
  if (top < body.scrollTop + padding) body.scrollTop = Math.max(0, top - padding);
  else if (bottom > body.scrollTop + body.clientHeight - padding) {
    body.scrollTop = bottom - body.clientHeight + padding;
  }
}

export function LiquidCloseIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
}

export function LiquidDialog({ open, onClose, title, description, children, actions, variant = 'alert', anchorId, id }: LiquidDialogProps) {
  const generatedId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = `${id ?? generatedId}-title`;
  const descriptionId = `${id ?? generatedId}-description`;

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    if (!open) {
      if (!panel.open) return;
      panel.dataset.closing = 'true';
      const timer = window.setTimeout(() => panel.close(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
      return () => window.clearTimeout(timer);
    }

    const trigger = anchorId ? document.getElementById(anchorId) : document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    panel.dataset.closing = 'false';
    panel.showModal();
    panel.scrollTop = 0;
    const scrollBody = panel.querySelector<HTMLElement>('.liquid-dialog__body');
    if (scrollBody && variant === 'popover') scrollBody.scrollTop = 0;

    const position = () => {
      if (variant !== 'popover') return;
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      const anchor = trigger instanceof HTMLElement ? trigger.getBoundingClientRect() : null;
      panel.style.maxHeight = `${Math.min(440, height - 24)}px`;
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      const left = Math.max(offsetLeft + 12, Math.min(anchor ? anchor.right - panelWidth : (width - panelWidth) / 2, offsetLeft + width - panelWidth - 12));
      const below = (anchor?.bottom ?? offsetTop + 12) + 8;
      const above = (anchor?.top ?? below) - panelHeight - 8;
      const top = Math.max(offsetTop + 12, Math.min(below + panelHeight <= offsetTop + height - 12 ? below : above, offsetTop + height - panelHeight - 12));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.transformOrigin = anchor ? `${Math.max(0, Math.min(panelWidth, anchor.left + anchor.width / 2 - left))}px ${Math.max(0, Math.min(panelHeight, anchor.top + anchor.height / 2 - top))}px` : 'center';
    };
    position();
    const selected = panel.querySelector<HTMLElement>('[aria-selected="true"]')
      ?? panel.querySelector<HTMLElement>('[role="option"]');
    if (selected) {
      focusSelectOption(selected);
      panel.scrollTop = 0;
    }
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      document.documentElement.style.overflow = previousOverflow;
      // The browser restores focus when close() runs, including on Escape.
    };
  }, [open, variant, anchorId]);

  useLayoutEffect(() => {
    const panel = dialog.current;
    return () => panel?.close();
  }, []);

  return <>
    <style>{LIQUID_OVERLAY_CSS}</style>
    <dialog ref={dialog} id={id} className="liquid-dialog" data-variant={variant}
      aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onPointerDown={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      {variant !== 'alert' ? <header className="liquid-dialog__header">
        <h2 className="liquid-dialog__title" id={titleId}>{title}</h2>
        {variant === 'sheet' ? <button type="button" className="liquid-dialog__close" aria-label="Закрыть окно" onClick={onClose}><LiquidCloseIcon /></button> : null}
      </header> : null}
      <div className="liquid-dialog__body">
        {variant === 'alert' ? <h2 className="liquid-dialog__title" id={titleId}>{title}</h2> : null}
        {description ? <p className="liquid-dialog__description" id={descriptionId}>{description}</p> : null}
        {children ? <div className="liquid-dialog__content">{children}</div> : null}
      </div>
      {actions?.length ? <div className="liquid-dialog__actions">
        {actions.map(action => <button type="button" key={action.label} className="liquid-dialog__action" data-tone={action.tone ?? 'secondary'} disabled={action.disabled} onClick={action.onPress}>{action.label}</button>)}
      </div> : null}
    </dialog>
  </>;
}

export function LiquidSelect({ open, onClose, title, anchorId, id, value, options, onChange }: LiquidSelectProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <LiquidDialog open={open} onClose={onClose} title={title} anchorId={anchorId} id={id} variant="popover">
    <div role="listbox" aria-label={title} className="liquid-select" onKeyDown={event => {
      const index = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % options.length : event.key === 'ArrowUp' ? (index - 1 + options.length) % options.length : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      const option = buttons.current[next];
      if (option) focusSelectOption(option);
    }}>
      {options.map((option, index) => <button key={option.id} ref={element => { buttons.current[index] = element; }}
        type="button" role="option" aria-selected={option.id === value} tabIndex={option.id === value || (index === 0 && !options.some(item => item.id === value)) ? 0 : -1}
        className="liquid-select__option" onClick={() => { onChange(option.id); onClose(); }}>
        <span>{option.label}</span>
        {option.id === value ? <svg className="liquid-select__check" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
      </button>)}
    </div>
  </LiquidDialog>;
}
