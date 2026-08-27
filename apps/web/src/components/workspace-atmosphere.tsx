'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const AnimatedWorkspaceAtmosphere = dynamic(
  () => import('./workspace-atmosphere-canvas'),
  { loading: () => null, ssr: false },
);

const motionPreferenceQuery = '(prefers-reduced-motion: no-preference)';

export function WorkspaceAtmosphere() {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const motionPreference = window.matchMedia(motionPreferenceQuery);
    const updateAnimationPreference = () => {
      setShouldAnimate(motionPreference.matches);
    };

    updateAnimationPreference();
    motionPreference.addEventListener('change', updateAnimationPreference);
    return () => {
      motionPreference.removeEventListener('change', updateAnimationPreference);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="workspace-atmosphere"
      data-testid="workspace-atmosphere"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="workspace-atmosphere__fallback"
        data-atmosphere-fallback=""
      />
      {shouldAnimate ? <AnimatedWorkspaceAtmosphere /> : null}
    </div>
  );
}
