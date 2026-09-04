'use client';

import {
  useId,
  useRef,
  type ElementType,
  type SVGProps,
} from 'react';
import { useWayfareLiquidShader } from './wayfare-liquid-mark';

interface WayfareLiquidIconProps {
  readonly icon: ElementType<SVGProps<SVGSVGElement>>;
}

export function WayfareLiquidIcon({
  icon: Icon,
}: Readonly<WayfareLiquidIconProps>): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useWayfareLiquidShader(canvasRef);
  const maskId = `wayfare-capability-mask-${useId().replaceAll(':', '')}`;
  const maskReference = `url(#${maskId})`;

  return (
    <span
      aria-hidden="true"
      className="wayfare-liquid-icon"
      data-renderer={renderer}
      data-wayfare-liquid-icon="true"
    >
      <svg className="wayfare-liquid-icon__defs" focusable="false">
        <defs>
          <mask
            height="24"
            id={maskId}
            maskUnits="userSpaceOnUse"
            width="24"
            x="0"
            y="0"
          >
            <Icon color="white" height="24" strokeWidth="2.4" width="24" />
          </mask>
        </defs>
      </svg>
      <canvas
        className="wayfare-liquid-icon__canvas"
        ref={canvasRef}
        style={{
          maskImage: maskReference,
          WebkitMaskImage: maskReference,
        }}
      />
      <Icon className="wayfare-liquid-icon__fallback" />
    </span>
  );
}
