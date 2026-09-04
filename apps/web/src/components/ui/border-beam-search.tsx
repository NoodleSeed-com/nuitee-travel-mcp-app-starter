'use client';

import { BorderBeam as PackageBorderBeam } from 'border-beam';
import type {
  BorderBeamColorVariant,
  BorderBeamProps,
  BorderBeamSize,
  BorderBeamTheme,
} from 'border-beam';
import { forwardRef } from 'react';

export type {
  BorderBeamColorVariant,
  BorderBeamProps,
  BorderBeamSize,
  BorderBeamTheme,
};

/**
 * Light-only adapter around BorderBeam. Wayfare deliberately does not inherit
 * the operating system's color scheme, so `auto` resolves to the approved
 * light treatment without a server/client hydration branch.
 */
export const BorderBeam = forwardRef<HTMLDivElement, BorderBeamProps>(
  function BorderBeam({ theme = 'light', ...props }, ref) {
    return (
      <PackageBorderBeam
        {...props}
        ref={ref}
        theme={theme === 'auto' ? 'light' : theme}
      />
    );
  },
);

export default BorderBeam;
