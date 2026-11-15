import React, { useLayoutEffect, useRef } from 'react';
import { colors } from '../theme/colors.web';
import type { FilterTabsProps } from './FilterTabs';

const CSS = `
.filter-tabs{box-sizing:border-box;min-width:0;max-width:100%;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
.filter-tabs__scroll{overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain;padding-block:3px}
.filter-tabs__scroll::-webkit-scrollbar{display:none}
.filter-tabs__track{position:relative;isolation:isolate;display:flex;align-items:stretch;gap:8px;width:max-content;max-width:none;margin-inline:auto;padding-inline:3px}
.filter-tabs__choice{display:flex;align-items:center;justify-content:center;flex:0 0 auto;gap:4px;min-height:44px;box-sizing:border-box;padding:10px 16px;border:1px solid ${colors.border};border-radius:999px;background:${colors.surfaceMuted};color:${colors.textSecondary};font:500 15px/20px -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;white-space:nowrap;cursor:pointer;transition:background-color 160ms ease-out,border-color 160ms ease-out,color 160ms ease-out,transform 120ms ease-out;-webkit-tap-highlight-color:transparent}
.filter-tabs__choice[data-active="true"]{background:rgba(68,68,74,.94);border-color:rgba(255,255,255,.2);color:${colors.text};box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 2px 5px rgba(0,0,0,.15)}
.filter-tabs__choice:active{transform:scale(.98);background:rgba(85,85,92,.94)}
.filter-tabs__choice:focus-visible{outline:2px solid rgba(245,245,247,.7);outline-offset:1px}
.filter-tabs__caption,.filter-tabs__detail{display:block;font-size:12px;line-height:16px;font-weight:500}
.filter-tabs__detail{color:${colors.textSecondary}}
.filter-tabs[data-layout="dates"] .filter-tabs__track{box-sizing:border-box;width:100%;gap:6px}
.filter-tabs[data-layout="dates"] .filter-tabs__choice{flex:1 1 0;min-width:0;min-height:76px;padding:9px 3px;border-radius:18px;flex-direction:column;gap:1px}
.filter-tabs[data-layout="dates"] .filter-tabs__label{font-size:22px;line-height:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.filter-tabs[data-layout="dates"] .filter-tabs__choice[data-active="true"]{background:${colors.liveSurface};border-color:${colors.live};color:${colors.text}}
.filter-tabs[data-layout="dates"] .filter-tabs__choice[data-active="true"] .filter-tabs__detail{color:${colors.text}}
.filter-tabs[data-surface="true"] .filter-tabs__choice{background:rgba(36,36,40,.94)}
.filter-tabs[data-surface="true"] .filter-tabs__choice[data-active="true"]{background:rgba(68,68,74,.96)}
@media(hover:hover) and (pointer:fine){.filter-tabs__choice:hover{background:rgba(52,52,58,.96);border-color:rgba(255,255,255,.16);color:${colors.text}}.filter-tabs__choice[data-active="true"]:hover{background:rgba(78,78,85,.96)}}
@media(hover:hover) and (pointer:fine){.filter-tabs[data-layout="dates"] .filter-tabs__choice[data-active="true"]:hover{background:#D53630}}
.filter-tabs[data-layout="dates"] .filter-tabs__choice[data-active="true"]:active{background:#B52621}
@media(prefers-reduced-motion:reduce){.filter-tabs__choice{transition:none!important}.filter-tabs__choice:active{transform:none}}
@media(prefers-reduced-transparency:reduce){.filter-tabs__choice{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:#242426!important}.filter-tabs__choice[data-active="true"]{background:#44444A!important}.filter-tabs[data-layout="dates"] .filter-tabs__choice[data-active="true"]{background:${colors.liveSurface}!important}}
@media(prefers-contrast:more){.filter-tabs__choice{border-color:#8A8A94;color:${colors.text}}.filter-tabs__choice[data-active="true"]{border-color:${colors.text}}}
@media(forced-colors:active){.filter-tabs__choice,.filter-tabs[data-layout="dates"] .filter-tabs__choice[data-active="true"]{background:Canvas!important;color:CanvasText;border-color:ButtonText;box-shadow:none}.filter-tabs__choice[data-active="true"]{outline:2px solid Highlight;outline-offset:-3px}}
`;

export function FilterTabs<T extends string>({ items, value, onChange, label, layout = 'row', role = 'tablist', inset = 0, surface = false }: FilterTabsProps<T>) {
  const scroll = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<T, HTMLButtonElement>());

  useLayoutEffect(() => {
    const selected = buttons.current.get(value);
    const viewport = scroll.current;
    if (!selected || !viewport) return;
    const selectedRect = selected.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    if (selectedRect.left < viewportRect.left || selectedRect.right > viewportRect.right) {
      viewport.scrollTo({
        left: viewport.scrollLeft + selectedRect.left - viewportRect.left - (viewport.clientWidth - selectedRect.width) / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  }, [value, items]);

  const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    buttons.current.get(items[next].id)?.focus({ preventScroll: true });
    onChange(items[next].id);
  };

  return <div className="filter-tabs" data-layout={layout} data-surface={surface} style={{ paddingInline: inset }}>
    <style>{CSS}</style>
    <div className="filter-tabs__scroll" ref={scroll}>
      <div className="filter-tabs__track" role={role} aria-label={label} aria-orientation="horizontal">
        {items.map((item, index) => <button key={item.id} type="button" ref={button => {
          if (button) buttons.current.set(item.id, button); else buttons.current.delete(item.id);
        }} className="filter-tabs__choice" data-active={item.id === value}
        role={role === 'radiogroup' ? 'radio' : 'tab'} aria-label={item.accessibilityLabel}
        aria-selected={role === 'tablist' ? item.id === value : undefined}
        aria-checked={role === 'radiogroup' ? item.id === value : undefined}
        tabIndex={item.id === value ? 0 : -1} onKeyDown={event => keyDown(event, index)} onClick={() => onChange(item.id)}>
          <span className="filter-tabs__label">{item.label}</span>
          {item.caption ? <span className="filter-tabs__caption">{item.caption}</span> : null}
          {item.detail ? <span className="filter-tabs__detail">{item.detail}</span> : null}
        </button>)}
      </div>
    </div>
  </div>;
}
