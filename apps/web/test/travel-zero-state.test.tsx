import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { TravelZeroState } from '../src/components/travel-zero-state';
import { siteConfig } from '../src/lib/site-config';

afterEach(() => {
  cleanup();
});

describe('travel assistant zero state', () => {
  it('uses the Wayfare identity with the expanded travel experience', () => {
    expect(siteConfig.brand).toMatchObject({
      name: 'Wayfare',
      tagline: 'One conversation. The whole journey.',
    });
  });

  it('renders the agent-led hero without mounting developer chrome', () => {
    const { container } = render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Tell us the trip you have in mind',
    })).toBeVisible();
    expect(screen.queryByText('Your journey starts here')).not.toBeInTheDocument();
    expect(screen.queryByText(/Describe the journey once/)).not.toBeInTheDocument();
    expect(screen.queryByText(/For example:/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('form', { name: 'Plan a trip' })).toHaveLength(1);
    expect(screen.getAllByText(siteConfig.brand.name)).toHaveLength(2);
    expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'For developers' }))
      .toHaveLength(1);
    for (const link of screen.getAllByRole('link', { name: 'For developers' })) {
      expect(link).toHaveAttribute('href', siteConfig.website.developerPath);
    }
    const partners = screen.getByRole('complementary', {
      name: 'Technology partners',
    });
    expect(within(partners).getByText('Built on')).toBeVisible();
    expect(within(partners).getByRole('img', { name: 'Noodle Seed' }))
      .toBeVisible();
    expect(within(partners).getByText('Powered by')).toBeVisible();
    expect(within(partners).getByRole('img', { name: 'Nuitée' }))
      .toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit trip request' }))
      .toBeDisabled();
    expect(screen.queryByText('Plan my trip')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .toHaveAttribute('id', 'travel-prompt');
    expect(screen.queryByText('No trip started')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-atmosphere')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' }))
      .toHaveAttribute('href', '#travel-canvas');
    expect(screen.getByRole('region', {
      name: 'Tell us the trip you have in mind',
    })).not.toHaveAttribute('id', 'travel-canvas');
    expect(container.querySelector('main#travel-canvas')).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('renders one starting action with passive supporting content', () => {
    const onStart = vi.fn();
    const { container } = render(
      <TravelZeroState inputRef={createRef()} onStart={onStart} />,
    );

    expect(screen.getAllByRole('form', { name: 'Plan a trip' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Submit trip request' }))
      .toBeDisabled();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Suggested trips' }))
      .not.toBeInTheDocument();
    const capabilities = screen.getByRole('region', {
      name: 'Wayfare capabilities',
    });
    expect(within(capabilities).getAllByRole('listitem')).toHaveLength(6);
    expect(within(capabilities).getByText('Flights')).toBeVisible();
    expect(within(capabilities).getByText(
      'Search and compare one-way or return fares.',
    )).toBeVisible();
    expect(within(capabilities).getByText('Hotels')).toBeVisible();
    expect(within(capabilities).getByText(
      'Find stays, rooms, rates, and cancellation terms.',
    )).toBeVisible();
    expect(within(capabilities).getByText('Experiences')).toBeVisible();
    expect(within(capabilities).getByText(
      'Add curated activities around your itinerary.',
    )).toBeVisible();
    expect(within(capabilities).getByText('Loyalty')).toBeVisible();
    expect(within(capabilities).getByText(
      'Review points and preview redemptions.',
    )).toBeVisible();
    expect(within(capabilities).getByText('Vouchers')).toBeVisible();
    expect(within(capabilities).getByText(
      'Find and apply eligible trip value.',
    )).toBeVisible();
    expect(within(capabilities).getByText('Booking & trip care')).toBeVisible();
    expect(within(capabilities).getByText(
      'Review, confirm, change, or cancel conversationally.',
    )).toBeVisible();
    expect(within(capabilities).getByText(
      'Live flight results come from the connected provider. The starter’s other capabilities use clearly labeled Wayfare demo data.',
    )).toBeVisible();
    expect(within(capabilities).queryByRole('button')).not.toBeInTheDocument();
    expect(within(capabilities).queryByRole('link')).not.toBeInTheDocument();
    const liquidIcons = capabilities.querySelectorAll(
      '[data-wayfare-liquid-icon="true"]',
    );
    expect(liquidIcons).toHaveLength(6);
    for (const liquidIcon of liquidIcons) {
      expect(liquidIcon.querySelector('canvas')).not.toBeNull();
      expect(liquidIcon.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }

    const inspiration = screen.getByRole('region', {
      name: 'Where the journey could take you',
    });
    expect(within(inspiration).getAllByRole('listitem')).toHaveLength(5);
    expect(within(inspiration).queryByRole('button')).not.toBeInTheDocument();

    const editorial = screen.getByRole('region', {
      name: 'One conversation, every part of the trip.',
    });
    const liquidMark = editorial.querySelector('[data-wayfare-liquid="true"]');
    expect(liquidMark).not.toBeNull();
    expect(liquidMark?.querySelector('canvas')).not.toBeNull();
    expect(liquidMark?.querySelector('[data-wayfare-mark="true"]')).not.toBeNull();
    expect(editorial.querySelector('[data-wayfare-gradient="animated"]')).toBeNull();
    expect(within(editorial).queryByRole('button')).not.toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('layers the outside view behind the fixed cabin and single composer', () => {
    const { container } = render(
      <TravelZeroState inputRef={createRef()} onStart={vi.fn()} />,
    );

    expect(container.querySelector('.travel-hero__view')).toHaveAttribute(
      'src',
      expect.stringContaining('wayfare-window-view-v1'),
    );
    expect(container.querySelector('.travel-hero__cabin')).toHaveAttribute(
      'src',
      expect.stringContaining('wayfare-cabin-frame-v1'),
    );
  });

  it('uses a generic prompt even when a coarse country default is available', () => {
    const { rerender } = render(
      <TravelZeroState inputRef={createRef()} onStart={vi.fn()} />,
    );
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .not.toHaveAttribute('placeholder');
    expect(document.querySelector('[data-typewriter-prompts]'))
      .toHaveAttribute('data-typewriter-prompts', expect.stringContaining('Tokyo'));

    rerender(
      <TravelZeroState
        defaults={{
          currency: 'PKR',
          marketCountry: 'PK',
          source: 'ip-country',
        }}
        inputRef={createRef()}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .not.toHaveAttribute('placeholder');
    expect(document.querySelector('[data-typewriter-prompts]'))
      .toHaveAttribute(
        'data-typewriter-prompts',
        expect.stringContaining('Tokyo in spring'),
      );
  });

  it.each([
    'A long weekend somewhere warm in October.',
    'Find a hotel near the Louvre.',
    'Plan a family trip from Toronto to Rome during spring break.',
    'I already have flights to Lisbon. Help with the rest.',
  ])('submits the natural-language intent unchanged: %s', (prompt) => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={createRef()} onStart={onStart} />);

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Ask the travel assistant' }),
      { target: { value: prompt } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit trip request' }));

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(prompt);
  });

  it('assigns the shared Plan a trip input ref to the travel prompt textarea', () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<TravelZeroState inputRef={inputRef} onStart={vi.fn()} />);

    expect(inputRef.current).toBe(
      screen.getByRole('textbox', { name: 'Ask the travel assistant' }),
    );
    expect(inputRef.current).toHaveAttribute('id', 'travel-prompt');
  });

  it('keeps passive landing content in main and the single footer after main', () => {
    const { container } = render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );

    expect(screen.getByRole('heading', {
      level: 2,
      name: 'Where the journey could take you',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 2,
      name: 'One conversation, every part of the trip.',
    })).toBeVisible();
    expect(screen.queryByText('Travel inspiration')).not.toBeInTheDocument();
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

  it('keeps destination image delivery responsive without making it actionable', () => {
    const { container } = render(
      <TravelZeroState inputRef={{ current: null }} onStart={vi.fn()} />,
    );
    const images = container.querySelectorAll<HTMLImageElement>(
      '.destination-card img',
    );

    expect(images).toHaveLength(5);
    for (const image of images) {
      expect(image).toHaveAttribute(
        'sizes',
        '(max-width: 767px) 78vw, (max-width: 1023px) 42vw, 22vw',
      );
    }
    expect(container.querySelectorAll('.destination-card button')).toHaveLength(0);
  });

  it('renders a professional footer without internal setup or planning notes', () => {
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
    expect(within(footer).getByRole('link', { name: 'Privacy' }))
      .toHaveAttribute('href', '/privacy');
    expect(within(footer).getByRole('link', { name: 'Terms' }))
      .toHaveAttribute('href', '/terms');
    expect(within(footer).queryByText('Not configured')).not.toBeInTheDocument();
    expect(within(footer).queryByText('Guest session')).not.toBeInTheDocument();
    expect(within(footer).queryByText('Planning note')).not.toBeInTheDocument();
    expect(within(footer).queryByText(siteConfig.disclosure.persistent))
      .not.toBeInTheDocument();
    expect(footer.querySelector('[data-wayfare-mark="true"]')).not.toBeNull();
    expect(within(footer).getByText(/© \d{4} Wayfare/u)).toBeVisible();
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
