import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImmersiveExplorePage } from '../src/components/experience/immersive-explore-page';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
}));

const readyRuntime = {
  status: 'ready' as const,
  embedId: 'pub_experience_test',
  serviceUrl: 'https://assistant.example.com',
};

beforeEach(() => {
  navigation.push.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('alternative full-bleed planning page', () => {
  it('switches the five core experiences without opening a session and reuses their exact masters', () => {
    const { container } = render(<ImmersiveExplorePage runtime={readyRuntime} />);

    expect(screen.getByTestId('immersive-explore-page')).toHaveAttribute(
      'data-layout',
      'full-bleed',
    );
    expect(screen.getByRole('heading', { name: 'Plan your whole trip' }))
      .toBeVisible();
    const modes = screen.getByRole('tablist', { name: 'Choose a planning view' });
    expect(within(modes).getAllByRole('tab')).toHaveLength(5);
    expect(within(modes).getByRole('tab', { name: 'Explore' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector(
      'img[src*="wayfare-explore-windows-v2"]',
    )).toHaveAttribute('alt', '');
    expect(screen.getAllByTestId('immersive-destination-preview')).toHaveLength(3);
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .toBeVisible();

    for (const [label, heading, image] of [
      ['Flights', 'Choose your horizon', 'wayfare-cockpit-v2'],
      ['Stays', 'Wake up somewhere new', 'wayfare-stay-v1'],
      ['Flight + Stay', 'From takeoff to check-in', 'wayfare-flight-stay-v1'],
      ['Insurance', 'Compare with confidence', 'wayfare-insurance-v1'],
    ] as const) {
      fireEvent.click(within(modes).getByRole('tab', { name: label }));
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      expect(container.querySelector('section[data-image-state] img[alt=""]')).toHaveAttribute(
        'src',
        expect.stringContaining(image),
      );
      expect(navigation.push).not.toHaveBeenCalled();
    }
  });

  it('hands the prompt to the separate chat route without putting it in the URL', () => {
    render(<ImmersiveExplorePage runtime={readyRuntime} />);

    fireEvent.change(screen.getAllByRole('combobox', { name: 'Currency' })[0]!, {
      target: { value: 'CAD' },
    });

    fireEvent.change(screen.getByRole('textbox', {
      name: 'Ask the travel assistant',
    }), {
      target: { value: 'Toronto to Lisbon next week for two adults' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Plan with Explore' }));

    expect(navigation.push).toHaveBeenCalledWith('/experience/chat');
    expect(navigation.push.mock.calls[0]?.[0]).not.toContain('Toronto');
    expect(sessionStorage.getItem('wayfare:experience-prompt')).toBe(
      'Toronto to Lisbon next week for two adults',
    );
    expect(sessionStorage.getItem('wayfare:experience-currency')).toBe('CAD');
  });

  it('opens the compact navigation with reachable actions', () => {
    render(<ImmersiveExplorePage runtime={readyRuntime} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('button', { name: 'Close menu' }))
      .toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', {
      name: 'Alternative experience navigation',
    }).className).toContain('navigationOpen');
    expect(screen.getByRole('link', { name: 'For developers' })).toBeVisible();
  });

  it('fails closed when the public Assistant runtime is not configured', () => {
    render(<ImmersiveExplorePage runtime={{
      status: 'setup-required',
      message: 'Assistant setup is required.',
    }} />);

    fireEvent.change(screen.getByRole('textbox', {
      name: 'Ask the travel assistant',
    }), { target: { value: 'Plan a trip' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Plan with Explore' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Assistant setup is required.',
    );
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
