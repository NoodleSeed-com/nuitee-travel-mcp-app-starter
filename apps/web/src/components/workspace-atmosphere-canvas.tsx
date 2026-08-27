'use client';

import { MeshGradient } from '@paper-design/shaders-react';

const atmosphere = {
  colors: ['#FAFAFA', '#D4D4D4', '#FFFFFF', '#F5F5F5', '#A3A3A3', '#E5E5E5'],
  distortion: 0.7,
  scale: 1.18,
  speed: 0.32,
  swirl: 0.24,
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
