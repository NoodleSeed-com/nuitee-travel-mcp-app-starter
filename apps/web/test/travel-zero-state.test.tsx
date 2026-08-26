import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { TravelZeroState } from '../src/components/travel-zero-state';

afterEach(cleanup);

describe('travel assistant zero state', () => {
  it('renders the assistant as the product without fake trip history', () => {
    render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    expect(screen.getByRole('heading', {
      name: 'Where would you like to go?',
    })).toBeVisible();
    expect(screen.getByRole('textbox', {
      name: 'Ask about a flight',
    })).toBeVisible();
    expect(screen.getByText('No trip started')).toBeVisible();
    expect(screen.getByText('Guest session')).toBeVisible();
    expect(screen.queryByText(/conversation history/i)).not.toBeInTheDocument();
  });

  it('submits a configured prompt through the same first-message callback', () => {
    const onStart = vi.fn();
    render(<TravelZeroState onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', {
      name: starterConfig.prompts[0],
    }));

    expect(onStart).toHaveBeenCalledWith(starterConfig.prompts[0]);
  });

  it('opens accessible settings without presenting the guest status as a control', () => {
    render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Guest session' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Guest session' }))
      .not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toBeVisible();
    expect(screen.getByRole('group', { name: 'Theme' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByText('Privacy')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      starterConfig.website.supportPath,
    );
    expect(screen.getByRole('button', { name: 'Clear conversation' }))
      .toBeVisible();
  });

  it('submits a typed prompt on Enter', () => {
    const onStart = vi.fn();
    render(<TravelZeroState onStart={onStart} />);
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
    render(<TravelZeroState onStart={onStart} />);
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
