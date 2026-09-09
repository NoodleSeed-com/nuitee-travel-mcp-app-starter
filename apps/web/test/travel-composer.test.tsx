import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TravelComposer } from '../src/components/travel-composer';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Wayfare travel composer motion', () => {
  it('keeps the loading circle clickable and restores the down-arrow without changing the control', () => {
    const jump = vi.fn();
    const { rerender } = render(<TravelComposer onSubmit={vi.fn()} onJumpToLatest={jump} jumpToLatestPending />);
    const button = screen.getByRole('button', { name: 'Jump to latest message' });
    expect(button).toHaveAttribute('data-loading', 'true');
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(jump).toHaveBeenCalledOnce();
    rerender(<TravelComposer onSubmit={vi.fn()} onJumpToLatest={jump} />);
    expect(screen.getByRole('button', { name: 'Jump to latest message' })).toBe(button);
    expect(button).toHaveAttribute('data-loading', 'false');
  });

  it('keeps one usable form inside the branded bottom beam', () => {
    const onSubmit = vi.fn();

    const view = render(
      <TravelComposer
        formLabel="Plan a trip"
        onSubmit={onSubmit}
        variant="hero"
      />,
    );

    const form = screen.getByRole('form', { name: 'Plan a trip' });
    const beam = form.closest('[data-wayfare-composer-beam="true"]');

    expect(beam).not.toBeNull();
    expect(view.container.querySelectorAll('form')).toHaveLength(1);

    fireEvent.change(screen.getByRole('textbox', {
      name: 'Ask the travel assistant',
    }), { target: { value: 'Tokyo in spring' } });
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledWith('Tokyo in spring');
  });

  it('activates the beam only for agent work', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <TravelComposer formLabel="Plan a trip" onSubmit={onSubmit} />,
    );

    const wrapper = screen.getByRole('form', { name: 'Plan a trip' })
      .closest('[data-wayfare-composer-beam="true"]');
    const beam = wrapper?.querySelector('[data-beam]');
    const input = screen.getByRole('textbox', {
      name: 'Ask the travel assistant',
    });

    expect(wrapper).toHaveAttribute('data-composer-state', 'idle');
    expect(beam).not.toHaveAttribute('data-active');
    fireEvent.focus(input);
    expect(wrapper).toHaveAttribute('data-composer-state', 'focused');
    expect(beam).not.toHaveAttribute('data-active');
    fireEvent.blur(input);
    expect(wrapper).toHaveAttribute('data-composer-state', 'idle');
    expect(beam).not.toHaveAttribute('data-active');

    rerender(
      <TravelComposer busy formLabel="Plan a trip" onSubmit={onSubmit} />,
    );
    expect(wrapper).toHaveAttribute('data-composer-state', 'busy');
    expect(beam).toHaveAttribute('data-active');
  });

  it('uses a static action-needed state for composer errors', () => {
    render(
      <TravelComposer error formLabel="Plan a trip" onSubmit={vi.fn()} />,
    );

    expect(screen.getByRole('form', { name: 'Plan a trip' })
      .closest('[data-wayfare-composer-beam="true"]'))
      .toHaveAttribute('data-composer-state', 'error');
  });

  it('types rotating trip prompts only while the hero composer is idle', () => {
    vi.useFakeTimers();
    const { container } = render(
      <TravelComposer
        animatedPlaceholders={['Tokyo in spring', 'A weekend in New York']}
        formLabel="Plan a trip"
        onSubmit={vi.fn()}
        variant="hero"
      />,
    );

    const input = screen.getByRole('textbox', {
      name: 'Ask the travel assistant',
    });
    const typewriter = container.querySelector('[data-typewriter-prompts]');

    expect(input).not.toHaveAttribute('placeholder');
    expect(typewriter).toHaveAttribute('aria-hidden', 'true');
    expect(typewriter).toHaveTextContent('T');
    act(() => vi.advanceTimersByTime(120));
    expect(typewriter?.textContent).toMatch(/^Tok/);

    fireEvent.focus(input);
    expect(typewriter).toHaveAttribute('hidden');
    fireEvent.change(input, { target: { value: 'Lisbon in October' } });
    fireEvent.blur(input);
    expect(typewriter).toHaveAttribute('hidden');
  });

  it('shows one complete prompt without animation when motion is reduced', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const { container } = render(
      <TravelComposer
        animatedPlaceholders={['Tokyo in spring', 'A weekend in New York']}
        formLabel="Plan a trip"
        onSubmit={vi.fn()}
        variant="hero"
      />,
    );

    expect(container.querySelector('[data-typewriter-prompts]'))
      .toHaveTextContent('Tokyo in spring');
  });
});
