import type { HTMLAttributes, ReactNode } from 'react';

interface TextShimmerProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
}

export function TextShimmer({
  children,
  className,
  ...props
}: Readonly<TextShimmerProps>) {
  return (
    <span
      className={['text-shimmer', className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
