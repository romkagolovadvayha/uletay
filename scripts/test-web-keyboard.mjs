import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the adapter without loading the native React Native runtime in Node.
const source = readFileSync(new URL('../src/utils/webKeyboardActivation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, require: () => ({ Platform: { OS: 'web' } }) });
const { webKeyboardActivationProps } = exports;

function fixture(tag, role, disabled = false) {
  let calls = 0;
  const attrs = new Map(role ? [['role', role]] : []);
  const element = {
    tagName: tag.toUpperCase(),
    getAttribute: (key) => attrs.get(key) ?? null,
    setAttribute: (key, value) => attrs.set(key, value),
    removeAttribute: (key) => attrs.delete(key),
  };
  const handlers = webKeyboardActivationProps(() => calls++, disabled);
  const event = (key, extra = {}) => ({
    nativeEvent: { key, ...extra }, currentTarget: element, target: element,
    prevented: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() {},
  });
  return { element, handlers, event, calls: () => calls };
}

for (const role of ['tab', 'radio', 'checkbox', 'switch', 'menuitem']) {
  const f = fixture('div', role);
  const down = f.event(' ');
  f.handlers.onKeyDown(down);
  f.handlers.onKeyDown(f.event(' ', { repeat: true }));
  assert.equal(down.prevented, true, `${role}: Space must not scroll`);
  assert.equal(f.calls(), 0, `${role}: activate on release`);
  assert.equal(f.element.getAttribute('data-keyboard-pressed'), 'true');
  f.handlers.onKeyUp(f.event(' '));
  f.handlers.onKeyUp(f.event(' '));
  assert.equal(f.calls(), 1, `${role}: one activation per press`);
  assert.equal(f.element.getAttribute('data-keyboard-pressed'), null);
}

for (const [tag, role, key] of [['button', 'button', 'Enter'], ['button', 'button', ' '], ['div', 'tab', 'Enter'], ['div', 'button', 'Enter']]) {
  const f = fixture(tag, role);
  const down = f.event(key);
  f.handlers.onKeyDown(down);
  f.handlers.onKeyUp(f.event(key));
  assert.equal(down.prevented, false, 'Keep browser / RN Web keyboard activation');
  assert.equal(f.calls(), 0, 'Do not duplicate native activation');
}

const canceled = fixture('div', 'tab');
canceled.handlers.onKeyDown(canceled.event(' '));
canceled.handlers.onBlur({ currentTarget: canceled.element });
canceled.handlers.onKeyUp(canceled.event(' '));
assert.equal(canceled.calls(), 0, 'Blurring cancels a held key');

const nested = fixture('div', 'tab');
nested.handlers.onKeyDown({ ...nested.event(' '), target: {} });
nested.handlers.onKeyUp(nested.event(' '));
assert.equal(nested.calls(), 0, 'A child control must not activate its parent');
for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
  nested.handlers.onKeyDown(nested.event(' ', { [modifier]: true }));
  nested.handlers.onKeyUp(nested.event(' '));
}
assert.equal(nested.calls(), 0, 'Keep modified keyboard shortcuts');
assert.equal(Object.keys(fixture('div', 'tab', true).handlers).length, 0, 'Disabled controls have no adapter');

console.log('web keyboard: Space, Enter, repeat, cancellation, nesting, shortcuts and disabled controls passed');
