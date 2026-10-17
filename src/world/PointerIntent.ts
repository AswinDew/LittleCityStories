export interface PointerSample {
  pointerId: number; button: number; clientX: number; clientY: number;
  altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; isPrimary: boolean;
}
const allowed = (event: PointerSample) => event.button === 0 && event.isPrimary &&
  !event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey;

/** A click is a complete primary gesture on the playfield, with at most 4px travel. */
export class PointerIntent {
  private startPoint: PointerSample | null = null;
  private distance = 0;
  private lastX = 0;
  private lastY = 0;
  start(event: PointerSample, validTarget = true): void {
    this.cancel();
    if (!validTarget || !allowed(event)) return;
    this.startPoint = { pointerId: event.pointerId, button: event.button, clientX: event.clientX, clientY: event.clientY,
      altKey: event.altKey, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, isPrimary: event.isPrimary };
    this.lastX = event.clientX; this.lastY = event.clientY;
  }
  move(event: Pick<PointerSample, 'pointerId' | 'clientX' | 'clientY'>): void {
    if (!this.startPoint || event.pointerId !== this.startPoint.pointerId) return;
    this.distance += Math.hypot(event.clientX - this.lastX, event.clientY - this.lastY);
    this.lastX = event.clientX; this.lastY = event.clientY;
  }
  finish(event: PointerSample, validTarget: boolean): boolean {
    this.move(event);
    const click = !!this.startPoint && this.startPoint.pointerId === event.pointerId && allowed(event) && validTarget && this.distance <= 4;
    this.cancel(); return click;
  }
  cancel(): void { this.startPoint = null; this.distance = 0; }
}
