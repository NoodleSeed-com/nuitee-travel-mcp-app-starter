import { Children, useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.js';

/** Add touch navigation to the existing single-active-card carousels. */
export function useHorizontalSwipe(move: (direction: number) => void) {
  const start = useRef<{ id: number; x: number; y: number } | undefined>(undefined);
  return {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      start.current = touch ? { id: touch.identifier, x: touch.clientX, y: touch.clientY } : undefined;
    },
    onTouchCancel() { start.current = undefined; },
    onTouchEnd(event: TouchEvent) {
      const origin = start.current;
      start.current = undefined;
      const touch = Array.from(event.changedTouches).find(item => item.identifier === origin?.id);
      if (!origin || !touch) return;
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
    },
  };
}

/** Native horizontal scrolling leaves vertical gestures to the conversation. */
export function CardCarousel({ children, label, itemName = 'card', className = '' }: {
  readonly children: ReactNode;
  readonly label: string;
  readonly itemName?: string;
  readonly className?: string;
}) {
  const items = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState({ first: true, last: true });
  const update = () => {
    const el = track.current;
    if (el) setPosition({ first: el.scrollLeft <= 3, last: el.scrollLeft + el.clientWidth >= el.scrollWidth - 3 });
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    const resize = new ResizeObserver(update);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    return () => resize.disconnect();
  }, [items.length]);
  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    const origin = el.getBoundingClientRect().left;
    const offsets = [...el.children].map(child => child.getBoundingClientRect().left - origin + el.scrollLeft);
    const target = direction > 0
      ? offsets.find(offset => offset > el.scrollLeft + 2) ?? el.scrollWidth
      : offsets.reverse().find(offset => offset < el.scrollLeft - 2) ?? 0;
    el.scrollTo({ left: target, behavior: 'instant' });
  };
  return <section className="cc-card-carousel" aria-label={label} aria-roledescription="carousel">
    <div id={id} className={`cc-card-carousel-track ${className}`} ref={track} role="list" tabIndex={0}
      onScroll={update} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
        }
        if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault(); track.current?.scrollTo({ left: event.key === 'Home' ? 0 : track.current.scrollWidth, behavior: 'instant' });
        }
      }}>
      {items.map((child, index) => <div className="cc-card-carousel-item" role="listitem" key={index}>{child}</div>)}
    </div>
    {items.length > 1 ? <div className="cc-card-carousel-nav">
      <span>{items.length} {itemName}{items.length === 1 ? '' : 's'}</span>
      <button type="button" aria-label={`Previous ${itemName}`} aria-controls={id} disabled={position.first} onClick={() => move(-1)}><ChevronLeftIcon /></button>
      <button type="button" aria-label={`Next ${itemName}`} aria-controls={id} disabled={position.last} onClick={() => move(1)}><ChevronRightIcon /></button>
    </div> : null}
  </section>;
}
