import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WayfareMark } from '../src/components/wayfare-mark';

afterEach(cleanup);

describe('Wayfare Wayline mark', () => {
  it('renders the approved journey path with two endpoints', () => {
    const { container } = render(<WayfareMark />);
    const mark = container.querySelector('[data-wayfare-mark="true"]');
    const path = mark?.querySelector('path');
    const circles = mark?.querySelectorAll('circle');

    expect(mark).toHaveAttribute('viewBox', '0 0 64 64');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(path).toHaveAttribute(
      'd',
      'M7 18C14 18 15.5 46 24 46C32.5 46 31 22 39 22C47 22 46 42 53 42C57.5 42 58.5 35.5 59 30',
    );
    expect(path).toHaveAttribute('stroke', 'currentColor');
    expect(path).toHaveAttribute('stroke-width', '6');
    expect(circles).toHaveLength(2);
    expect(circles?.[0]).toHaveAttribute('cx', '7');
    expect(circles?.[0]).toHaveAttribute('cy', '18');
    expect(circles?.[0]).toHaveAttribute('r', '4.2');
    expect(circles?.[1]).toHaveAttribute('cx', '59');
    expect(circles?.[1]).toHaveAttribute('cy', '30');
    expect(circles?.[1]).toHaveAttribute('r', '4.2');
  });

  it('keeps the exact geometry for the static liquid fallback', () => {
    const { container } = render(<WayfareMark staticGradient />);
    const mark = container.querySelector('[data-wayfare-mark="true"]');
    const path = mark?.querySelector('path');
    const circles = mark?.querySelectorAll('circle');
    const gradient = mark?.querySelector('linearGradient');

    expect(mark).toHaveAttribute('data-wayfare-gradient', 'static');
    expect(gradient).not.toBeNull();
    expect(gradient?.querySelectorAll('stop')).toHaveLength(3);
    expect(path?.getAttribute('stroke')).toMatch(/^url\(#.+\)$/u);
    expect(circles?.[0].getAttribute('fill')).toBe(path?.getAttribute('stroke'));
    expect(circles?.[1].getAttribute('fill')).toBe(path?.getAttribute('stroke'));
  });
});
