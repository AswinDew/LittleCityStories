import { describe, it, expect } from 'vitest';
import { PointerIntent } from '../src/world/PointerIntent';

const pointer = (changes = {}) => ({ pointerId: 1, button: 0, clientX: 10, clientY: 10,
  altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, isPrimary: true, ...changes });
describe('construction pointer intent', () => {
  it('reads inherited PointerEvent properties rather than relying on enumerable fields', () => {
    const intent = new PointerIntent();
    const nativeLike = Object.create(pointer());
    intent.start(nativeLike);
    expect(intent.finish(nativeLike, true)).toBe(true);
  });
  it('requires a matching primary pointerdown on the playfield', () => {
    const intent = new PointerIntent();
    expect(intent.finish(pointer(), true)).toBe(false);
    intent.start(pointer()); expect(intent.finish(pointer(), true)).toBe(true);
    expect(intent.finish(pointer(), true)).toBe(false);
    intent.start(pointer()); expect(intent.finish(pointer({ pointerId: 2 }), true)).toBe(false);
  });
  it.each([{ button: 1 }, { button: 2 }, { shiftKey: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { isPrimary: false }])('rejects %o', changes => {
    const intent = new PointerIntent(); intent.start(pointer(changes)); expect(intent.finish(pointer(changes), true)).toBe(false);
  });
  it('latches drag beyond 4 CSS pixels even if it returns to the original point', () => {
    const intent = new PointerIntent(); intent.start(pointer());
    intent.move(pointer({ clientX: 16 })); intent.move(pointer());
    expect(intent.finish(pointer(), true)).toBe(false);
    intent.start(pointer()); intent.move(pointer({ clientX: 14 }));
    expect(intent.finish(pointer({ clientX: 14 }), true)).toBe(true);
  });
  it('rejects canceled, HUD-ending, modified-up and invalid starting targets', () => {
    const intent = new PointerIntent();
    intent.start(pointer()); intent.cancel(); expect(intent.finish(pointer(), true)).toBe(false);
    intent.start(pointer()); expect(intent.finish(pointer(), false)).toBe(false);
    intent.start(pointer()); expect(intent.finish(pointer({ altKey: true }), true)).toBe(false);
    intent.start(pointer(), false); expect(intent.finish(pointer(), true)).toBe(false);
  });
});
