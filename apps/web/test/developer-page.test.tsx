import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { starterConfig } from '../../../starter.config';
import DevelopersPage from '../app/developers/page';

afterEach(cleanup);

describe('developer guide page', () => {
  it('leads with the ordered guest-first setup and bounded travel outcome', () => {
    render(<DevelopersPage />);

    expect(screen.getByRole('heading', {
      name: 'Guest-first setup',
    })).toBeVisible();
    expect(screen.getByText('pnpm install')).toBeVisible();
    expect(screen.getByText('pnpm dev:web')).toBeVisible();
    expect(screen.getByText('pnpm agent:check')).toBeVisible();
    expect(screen.getByText(
      'NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID',
    )).toBeVisible();
    expect(screen.getByText(/Search → Select → Verify/)).toBeVisible();
    expect(screen.getByText(/does not book/i)).toBeVisible();
  });

  it('presents OAuth as optional guidance without a fake login control', () => {
    render(<DevelopersPage />);

    expect(screen.getByRole('heading', { name: 'Optional OAuth' })).toBeVisible();
    expect(screen.getByText('docs/oauth.md')).toBeVisible();
    expect(screen.queryByRole('button', {
      name: /log in|sign in/i,
    })).not.toBeInTheDocument();
  });

  it('renders configured help links and omits unconfigured privacy links', () => {
    render(<DevelopersPage />);

    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      starterConfig.website.supportPath,
    );
    expect(starterConfig.website.privacyUrl).toBeNull();
    expect(screen.queryByRole('link', { name: 'Privacy' })).not.toBeInTheDocument();
  });
});
