import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { TravelZeroState } from '../src/components/travel-zero-state';

afterEach(() => {
  cleanup();
});

describe('travel assistant zero state', () => {
  it('renders the approved hero copy without mounting developer chrome', () => {
    const { container } = render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Where will you go next?',
    })).toBeVisible();
    expect(screen.getByText(
      'Tell us the trip. We’ll find the flights and verify the fare.',
    )).toBeVisible();
    expect(screen.getAllByText(starterConfig.brand.name)).toHaveLength(1);
    expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'For developers' }))
      .toHaveAttribute('href', starterConfig.website.developerPath);
    expect(screen.queryByText('A new way to find your flight')).not.toBeInTheDocument();
    expect(screen.queryByText(
      'Built on Noodle Seed · Powered by Nuitee',
    )).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find flights' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Ask about a flight' }))
      .toHaveAttribute('id', 'travel-prompt');
    expect(container.querySelector('img[alt=""]')).toHaveAttribute(
      'src',
      expect.stringContaining('conversation-hero-v1'),
    );
    expect(screen.queryByText('No trip started')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-atmosphere')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' }))
      .toHaveAttribute('href', '#travel-canvas');
    expect(screen.getByRole('region', {
      name: 'Where will you go next?',
    })).not.toHaveAttribute('id', 'travel-canvas');
    expect(container.querySelector('main#travel-canvas')).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('submits a configured prompt through the same first-message callback', () => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={createRef()} onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', {
      name: starterConfig.prompts[0],
    }));

    expect(onStart).toHaveBeenCalledWith(starterConfig.prompts[0]);
  });

  it('submits a typed prompt on Enter', () => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={createRef()} onStart={onStart} />);
    const composer = screen.getByRole('textbox', { name: 'Ask about a flight' });

    fireEvent.change(composer, { target: { value: 'JFK to Lisbon next month' } });
    const continueDefault = fireEvent.keyDown(composer, {
      key: 'Enter',
      shiftKey: false,
    });

    expect(continueDefault).toBe(false);
    expect(onStart).toHaveBeenCalledWith('JFK to Lisbon next month');
  });

  it('keeps Shift+Enter available for a multiline prompt', () => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={createRef()} onStart={onStart} />);
    const composer = screen.getByRole('textbox', { name: 'Ask about a flight' });

    fireEvent.change(composer, { target: { value: 'JFK to Lisbon' } });
    const continueDefault = fireEvent.keyDown(composer, {
      key: 'Enter',
      shiftKey: true,
    });
    fireEvent.change(composer, {
      target: { value: 'JFK to Lisbon\nAvoid overnight connections' },
    });

    expect(continueDefault).toBe(true);
    expect(composer).toHaveValue(
      'JFK to Lisbon\nAvoid overnight connections',
    );
    expect(onStart).not.toHaveBeenCalled();
  });
});
