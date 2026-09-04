import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { starterConfig } from '../../../starter.config';
import DevelopersPage from '../app/developers/page';

afterEach(cleanup);

describe('developer guide page', () => {
  it('uses the Wayfare route mark in the developer header', () => {
    render(<DevelopersPage />);

    const home = screen.getByRole('link', { name: 'Wayfare' });
    expect(home.querySelector('[data-wayfare-mark="true"]')).not.toBeNull();
  });

  it('leads with the ordered private-demo setup and bounded travel outcome', () => {
    render(<DevelopersPage />);

    expect(screen.getByRole('heading', {
      name: 'One integration, three travel views',
    })).toBeVisible();
    expect(screen.getByText('pnpm install')).toBeVisible();
    expect(screen.getByText('pnpm dev:web')).toBeVisible();
    expect(screen.getByText('pnpm agent:check:partner')).toBeVisible();
    expect(screen.getByText(
      'NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID',
    )).toBeVisible();
    expect(screen.getByText(/Search → Compare → Verify/)).toBeVisible();
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

  it('renders configured help and legal links', () => {
    render(<DevelopersPage />);

    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      starterConfig.website.supportPath,
    );
    expect(screen.getByRole('link', { name: 'Privacy' }))
      .toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms' }))
      .toHaveAttribute('href', '/terms');
  });
});
