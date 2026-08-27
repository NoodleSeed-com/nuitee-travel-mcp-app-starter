'use client';

import { MeshGradient } from '@paper-design/shaders-react';

const atmosphere = {
  colors: ['#FAFAFA', '#E5E5E5', '#FFFFFF', '#F5F5F5', '#D4D4D4', '#FAFAFA'],
  distortion: 0.42,
  scale: 1.18,
  speed: 0.12,
  swirl: 0.12,
} as const;

export default function WorkspaceAtmosphereCanvas() {
  return (
    <div
      className="workspace-atmosphere__canvas"
      data-atmosphere-canvas=""
    >
      <MeshGradient
        colors={[...atmosphere.colors]}
        distortion={atmosphere.distortion}
        fit="cover"
        grainMixer={0}
        grainOverlay={0}
        height="100%"
        maxPixelCount={750_000}
        minPixelRatio={1}
        scale={atmosphere.scale}
        speed={atmosphere.speed}
        swirl={atmosphere.swirl}
        width="100%"
      />
    </div>
  );
}
