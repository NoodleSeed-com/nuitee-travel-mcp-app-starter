import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { TravelZeroState } from '../src/components/travel-zero-state';
import {
  landingDestinations,
  landingEditorialFeature,
} from '../src/lib/landing-content';
import { siteConfig } from '../src/lib/site-config';

afterEach(() => {
  cleanup();
});

describe('travel assistant zero state', () => {
  it('uses the Wayfare identity with the expanded travel experience', () => {
    expect(siteConfig.brand).toMatchObject({
      name: 'Wayfare',
      tagline: 'Travel, planned around you.',
    });
  });

  it('renders the approved hero copy without mounting developer chrome', () => {
    const { container } = render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Plan your whole trip',
    })).toBeVisible();
    expect(screen.getByText(
      'Flights, stays, and rewards—brought together in one conversation.',
    )).toBeVisible();
    expect(screen.getAllByRole('form', { name: 'Plan a trip' })).toHaveLength(1);
    expect(screen.getAllByText(siteConfig.brand.name)).toHaveLength(2);
    expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'For developers' }))
      .toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: 'For developers' })) {
      expect(link).toHaveAttribute('href', siteConfig.website.developerPath);
    }
    expect(screen.queryByText('A new way to find your flight')).not.toBeInTheDocument();
    expect(screen.getByText(
      'Built on Noodle Seed · Powered by Nuitee',
    )).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit trip request' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .toHaveAttribute('id', 'travel-prompt');
    expect(screen.queryByText('No trip started')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-atmosphere')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' }))
      .toHaveAttribute('href', '#travel-canvas');
    expect(screen.getByRole('region', {
      name: 'Plan your whole trip',
    })).not.toHaveAttribute('id', 'travel-canvas');
    expect(container.querySelector('main#travel-canvas')).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('uses the Wayfare hero with only two starter prompts', () => {
    const { container } = render(
      <TravelZeroState inputRef={createRef()} onStart={vi.fn()} />,
    );

    expect(container.querySelector('.travel-hero img[alt=""]')).toHaveAttribute(
      'src',
      expect.stringContaining('wayfare-hybrid-hero-v2'),
    );
    expect(within(screen.getByRole('list', { name: 'Suggested trips' }))
      .getAllByRole('button')).toHaveLength(2);
  });

  it('turns the hero image into a non-interactive conversation-to-trip story', () => {
    const { container } = render(
      <TravelZeroState inputRef={createRef()} onStart={vi.fn()} />,
    );

    const story = screen.getByRole('group', {
      name: 'One conversation for the whole trip',
    });
    expect(within(story).getByText('Your trip, brought together')).toBeVisible();
    expect(within(story).getByText('Flights, stays, and rewards. One plan.'))
      .toBeVisible();
    expect(within(story).getByText('Your departure')).toBeVisible();
    expect(within(story).getByText('Your next destination')).toBeVisible();
    expect(within(story).getByText(
      'Plan a complete trip for two next week.',
    )).toBeVisible();
    expect(within(story).getByText('Wayfare understands')).toBeVisible();
    const sequence = within(story).getByRole('list', {
      name: 'Build your trip with Wayfare',
    });
    expect(within(sequence).getByText('Flight')).toBeVisible();
    expect(within(sequence).getByText('Stay')).toBeVisible();
    expect(within(sequence).getByText('Rewards review')).toBeVisible();
    expect(story.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]',
    )).toHaveLength(0);
    expect(container.querySelector('.travel-hero__media-frame img[alt=""]'))
      .toHaveAttribute('src', expect.stringContaining('wayfare-hybrid-hero-v2'));
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .toHaveAttribute(
        'placeholder',
        'Your departure to somewhere warm for two, next week',
      );
  });

  it('uses the derived local airport in pre-search route examples', () => {
    render(
      <TravelZeroState
        defaults={{
          origin: { iata: 'ISB', city: 'Islamabad', country: 'PK' },
          currency: 'PKR',
          source: 'browser-geolocation',
        }}
        inputRef={createRef()}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('Islamabad (ISB)')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .toHaveAttribute(
        'placeholder',
        'Islamabad to somewhere warm for two, next week',
      );
  });

  it('submits a configured prompt through the same first-message callback', () => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={createRef()} onStart={onStart} />);

    const suggestedTrips = screen.getByRole('list', { name: 'Suggested trips' });
    expect(within(suggestedTrips).getAllByRole('button')).toHaveLength(2);
    fireEvent.click(within(suggestedTrips).getByRole('button', {
      name: siteConfig.prompts[0],
    }));

    expect(onStart).toHaveBeenCalledWith(siteConfig.prompts[0]);
  });

  it('assigns the shared Plan a trip input ref to the travel prompt textarea', () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<TravelZeroState inputRef={inputRef} onStart={vi.fn()} />);

    expect(inputRef.current).toBe(
      screen.getByRole('textbox', { name: 'Ask the travel assistant' }),
    );
    expect(inputRef.current).toHaveAttribute('id', 'travel-prompt');
  });

  it('places the three trip entry points directly after the hero', () => {
    render(<TravelZeroState inputRef={createRef()} onStart={vi.fn()} />);

    expect(screen.getByRole('region', {
      name: 'Start with flights, stays, or rewards',
    })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Places to start' }))
      .toHaveAttribute('id', 'places-to-start');
  });

  it('keeps editorial landing content in main and the single footer after main', () => {
    const { container } = render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Places to start' }))
      .toBeVisible();
    expect(screen.getAllByRole('button', { name: /Plan a trip to/u }))
      .toHaveLength(3);
    const capabilityList = screen.getByRole('list', {
      name: 'Start with flights, stays, or rewards',
    });
    expect(capabilityList).toBeVisible();
    expect(within(capabilityList).getByText('Search flights')).toBeVisible();
    expect(within(capabilityList).getByText('Compare stays')).toBeVisible();
    expect(within(capabilityList).getByText('Explore rewards')).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 2,
      name: 'One conversation, every part of the trip.',
    })).toBeVisible();
    expect(screen.queryByText('Travel inspiration')).not.toBeInTheDocument();
    expect(screen.getByText('Built on Noodle Seed · Powered by Nuitee'))
      .toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    const main = container.querySelector<HTMLElement>('main#travel-canvas');
    expect(main).not.toBeNull();
    const landing = main!.querySelector('.travel-landing');
    expect(landing).not.toBeNull();
    const orderedRegions = [
      '.travel-hero',
      '.travel-capabilities',
      '.destination-inspiration',
      '.travel-editorial',
    ].map((selector) => landing!.querySelector(selector));
    expect(orderedRegions.every((region, index) => (
      landing!.children.item(index) === region
    ))).toBe(true);
    expect(landing!.children).toHaveLength(orderedRegions.length);

    const contentinfoLandmarks = screen.getAllByRole('contentinfo');
    expect(contentinfoLandmarks).toHaveLength(1);
    expect(within(main!).queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(main!.nextElementSibling).toBe(contentinfoLandmarks[0]);
  });

  it('starts each supported intent through the same conversation callback', () => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={{ current: null }} onStart={onStart} />);

    const intents = screen.getByRole('region', {
      name: 'Start with flights, stays, or rewards',
    });
    for (const [label, prompt] of [
      ['Search flights', siteConfig.prompts[0]],
      ['Compare stays', siteConfig.prompts[1]],
      ['Explore rewards', siteConfig.prompts[2]],
    ] as const) {
      fireEvent.click(within(intents).getByRole('button', { name: label }));
      expect(onStart).toHaveBeenLastCalledWith(prompt);
    }
    expect(onStart).toHaveBeenCalledTimes(3);
  });

  it('keeps the complete landing and sibling footer copy concise', () => {
    const { container } = render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    const main = container.querySelector<HTMLElement>('main#travel-canvas');
    const footer = main?.nextElementSibling;
    expect(main).not.toBeNull();
    expect(footer).toHaveClass('travel-footer');

    const countedCopy = container.ownerDocument.createElement('div');
    countedCopy.append(main!.cloneNode(true), footer!.cloneNode(true));
    for (const excluded of countedCopy.querySelectorAll(
      '.travel-starter-prompts, .travel-footer nav, .travel-footer__attribution',
    )) {
      excluded.remove();
    }
    expect(countedCopy).toHaveTextContent(siteConfig.brand.tagline);
    expect(countedCopy).toHaveTextContent(
      'No account is required to plan a trip.',
    );
    expect(footer).toHaveTextContent(
      siteConfig.disclosure.persistent,
    );
    expect(within(main!).queryByText(siteConfig.disclosure.persistent))
      .not.toBeInTheDocument();
    const words = (countedCopy.textContent ?? '').trim().split(/\s+/);

    expect(words.length).toBeLessThanOrEqual(150);
  });

  it('advertises half-width tablet destination images for every equal card', () => {
    const { container } = render(
      <TravelZeroState inputRef={{ current: null }} onStart={vi.fn()} />,
    );
    const images = container.querySelectorAll<HTMLImageElement>(
      '.destination-card img',
    );

    expect(images).toHaveLength(3);
    for (const image of images) {
      expect(image).toHaveAttribute(
        'sizes',
        '(max-width: 767px) 82vw, (max-width: 1023px) 50vw, 33vw',
      );
    }
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
    render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    const footer = screen.getByRole('contentinfo');

    expect(within(footer).getByRole('link', { name: 'For developers' }))
      .toHaveAttribute('href', siteConfig.website.developerPath);
    expect(within(footer).getByRole('link', { name: 'Support' }))
      .toHaveAttribute('href', siteConfig.website.supportPath);
    expect(within(footer).queryByRole('link', { name: 'Privacy' }))
      .not.toBeInTheDocument();
    expect(within(footer).queryByRole('link', { name: 'Terms' }))
      .not.toBeInTheDocument();
    expect(screen.getByText('Privacy').parentElement)
      .toHaveTextContent('PrivacyNot configured');
    expect(screen.getByText('Terms').parentElement)
      .toHaveTextContent('TermsNot configured');
  });

  it('submits a typed prompt on Enter', () => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={createRef()} onStart={onStart} />);
    const composer = screen.getByRole('textbox', { name: 'Ask the travel assistant' });

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
    const composer = screen.getByRole('textbox', { name: 'Ask the travel assistant' });

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
