import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { TravelZeroState } from '../src/components/travel-zero-state';
import {
  landingDestinations,
  landingEditorialFeature,
} from '../src/lib/landing-content';

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
    expect(screen.getAllByText(starterConfig.brand.name)).toHaveLength(2);
    expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'For developers' }))
      .toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: 'For developers' })) {
      expect(link).toHaveAttribute('href', starterConfig.website.developerPath);
    }
    expect(screen.queryByText('A new way to find your flight')).not.toBeInTheDocument();
    expect(screen.getByText(
      'Built on Noodle Seed · Powered by Nuitee',
    )).toBeVisible();
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

  it('links the hero discovery cue to the destination section', () => {
    render(<TravelZeroState inputRef={createRef()} onStart={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Explore destinations' }))
      .toHaveAttribute('href', '#places-to-start');
    expect(screen.getByRole('region', { name: 'Places to start' }))
      .toHaveAttribute('id', 'places-to-start');
  });

  it('renders a concise airline editorial landing structure', () => {
    render(<TravelZeroState inputRef={{ current: null }} onStart={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Places to start' }))
      .toBeVisible();
    expect(screen.getByText('Search live flights')).toBeVisible();
    expect(screen.getByText('Compare your options')).toBeVisible();
    expect(screen.getByText('Verify the fare')).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 2,
      name: 'A few words can take you somewhere new.',
    })).toBeVisible();
    expect(screen.getByText('Built on Noodle Seed · Powered by Nuitee'))
      .toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it.each(landingDestinations)(
    'starts the $name destination prompt through onStart',
    ({ name, prompt }) => {
      const onStart = vi.fn();
      render(<TravelZeroState inputRef={{ current: null }} onStart={onStart} />);

      fireEvent.click(screen.getByRole('button', {
        name: `Plan a trip to ${name}`,
      }));

      expect(onStart).toHaveBeenCalledOnce();
      expect(onStart).toHaveBeenCalledWith(prompt);
    },
  );

  it('starts the flexible editorial prompt through onStart', () => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={{ current: null }} onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', {
      name: landingEditorialFeature.action,
    }));

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(landingEditorialFeature.prompt);
  });

  it('renders developer and support links with legal fallbacks', () => {
    render(<TravelZeroState inputRef={{ current: null }} onStart={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'For developers' }))
      .toHaveAttribute('href', starterConfig.website.developerPath);
    expect(screen.getByRole('link', { name: 'Support' }))
      .toHaveAttribute('href', starterConfig.website.supportPath);
    expect(screen.queryByRole('link', { name: 'Privacy' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Terms' }))
      .not.toBeInTheDocument();
    expect(screen.getByText('Privacy').parentElement)
      .toHaveTextContent('PrivacyNot configured');
    expect(screen.getByText('Terms').parentElement)
      .toHaveTextContent('TermsNot configured');
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
