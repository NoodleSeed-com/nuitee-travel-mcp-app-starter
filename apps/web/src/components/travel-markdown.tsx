'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function safeMessageHref(
  href: string | undefined,
): string | undefined {
  if (!href) return undefined;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

interface TravelMarkdownProps {
  readonly children: string;
}

export function TravelMarkdown({ children }: Readonly<TravelMarkdownProps>) {
  return (
    <ReactMarkdown
      components={{
        a({ children: linkChildren, href }) {
          const safeHref = safeMessageHref(href);
          if (!safeHref) return <span>{linkChildren}</span>;
          const external = safeHref.startsWith('https:');
          return (
            <a
              href={safeHref}
              rel={external ? 'noreferrer noopener' : undefined}
              target={external ? '_blank' : undefined}
            >
              {linkChildren}
            </a>
          );
        },
      }}
      remarkPlugins={[remarkGfm]}
    >
      {children}
    </ReactMarkdown>
  );
}
