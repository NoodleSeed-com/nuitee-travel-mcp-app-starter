import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { TravelZeroState } from '../src/components/travel-zero-state';

const originalDialogShowModal = HTMLDialogElement.prototype.showModal;
const originalDialogClose = HTMLDialogElement.prototype.close;
let showModal: ReturnType<typeof vi.fn>;

beforeEach(() => {
  showModal = vi.fn(function showModalPolyfill(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModal,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});

afterEach(() => {
  cleanup();
  if (originalDialogShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: originalDialogShowModal,
    });
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  }
  if (originalDialogClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: originalDialogClose,
    });
  } else {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  }
});

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
    expect(screen.getByText(starterConfig.brand.assistantName)).toBeVisible();
    expect(screen.getByRole('textbox', {
      name: 'Ask about a flight',
    })).toBeVisible();
    expect(screen.getByText('No trip started')).toBeVisible();
    expect(screen.getByText('Guest session')).toBeVisible();
    expect(screen.queryByText(/conversation history/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' }))
      .toHaveAttribute('href', '#travel-canvas');
    expect(screen.getByRole('region', {
      name: 'Where would you like to go?',
    })).toHaveAttribute('id', 'travel-canvas');
    expect(document.querySelector('.route-assistant-mark'))
      .not.toBeInTheDocument();
    const atmosphere = screen.getByTestId('workspace-atmosphere');
    expect(atmosphere).toHaveAttribute('aria-hidden', 'true');
    expect(atmosphere).toHaveStyle({ pointerEvents: 'none' });
    expect(atmosphere.querySelector('[data-atmosphere-fallback]'))
      .toBeInTheDocument();
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
    expect(screen.queryByRole('group', { name: 'Theme' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /System|Light|Dark/ }))
      .not.toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeVisible();
    expect(screen.getByText('Terms')).toBeVisible();
    expect(screen.getAllByText('Not configured')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Terms' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      starterConfig.website.supportPath,
    );
    expect(screen.getByRole('button', { name: 'Clear conversation' }))
      .toBeVisible();
  });

  it('links configured Terms in settings without inventing a fallback URL', () => {
    const website = starterConfig.website as {
      termsUrl: string | null;
    };
    const originalTermsUrl = website.termsUrl;
    website.termsUrl = 'https://travel.example.co/terms';
    try {
      render(
        <TravelAssistantPage
          runtime={{ status: 'setup-required', message: 'setup' }}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

      expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
        'href',
        'https://travel.example.co/terms',
      );
    } finally {
      website.termsUrl = originalTermsUrl;
    }
  });

  it('contains modal focus, closes on Escape, and restores the trigger', () => {
    render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'setup' }}
      />,
    );
    const background = screen.getByRole('main').parentElement;
    const trigger = screen.getByRole('button', { name: 'Settings' });
    trigger.focus();

    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const close = screen.getByRole('button', { name: 'Close settings' });
    const clear = screen.getByRole('button', { name: 'Clear conversation' });
    expect(dialog).toBeInstanceOf(HTMLDialogElement);
    expect(showModal).toHaveBeenCalledOnce();
    expect(background).toHaveAttribute('inert');
    expect(close).toHaveFocus();

    clear.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(clear).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Settings' }))
      .not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(background).not.toHaveAttribute('inert');
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
