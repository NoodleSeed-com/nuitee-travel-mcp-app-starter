'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { WayfareMark } from './wayfare-mark';

interface WayfareLiquidMarkProps {
  readonly className?: string;
}

const vertexShaderSource = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;

  float random(vec2 point) {
    return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    return mix(
      mix(random(cell), random(cell + vec2(1.0, 0.0)), local.x),
      mix(random(cell + vec2(0.0, 1.0)), random(cell + vec2(1.0, 1.0)), local.x),
      local.y
    );
  }

  float flowingNoise(vec2 point) {
    float value = 0.0;
    float amplitude = 0.55;
    mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);

    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * noise(point);
      point = turn * point * 1.92 + 0.17;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 field = vec2(uv.x * aspect, uv.y);
    float time = u_time * 0.12;

    vec2 drift = vec2(
      flowingNoise(field * 2.2 + vec2(time, -time * 0.34)),
      flowingNoise(field * 2.0 + vec2(-time * 0.48, time * 0.72))
    );
    vec2 liquid = field + (drift - 0.5) * 0.72;
    float current = flowingNoise(liquid * 2.85 + vec2(time * 0.38, -time * 0.26));
    float reflection = sin((liquid.x + liquid.y * 0.52 + current * 0.7) * 7.2 - time * 2.0);

    vec3 deepBlue = vec3(0.10, 0.34, 0.62);
    vec3 skyBlue = vec3(0.40, 0.80, 1.00);
    vec3 violet = vec3(0.52, 0.38, 0.82);
    vec3 sunset = vec3(0.86, 0.48, 0.34);

    vec3 color = mix(deepBlue, skyBlue, smoothstep(0.18, 0.82, current));
    color = mix(color, violet, smoothstep(0.28, 0.94, drift.y) * 0.56);
    color = mix(color, sunset, smoothstep(0.70, 0.98, reflection) * 0.34);
    color += 0.08 * smoothstep(0.52, 1.0, reflection);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createLiquidProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function useWayfareLiquidShader(
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  const [renderer, setRenderer] = useState<'fallback' | 'webgl'>('fallback');

  useEffect(() => {
    const canvas = canvasRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!canvas || reduceMotion.matches || !window.WebGLRenderingContext) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    });
    if (!gl) return;

    const program = createLiquidProgram(gl);
    const buffer = gl.createBuffer();
    if (!program || !buffer) {
      if (program) gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      return;
    }

    const position = gl.getAttribLocation(program, 'a_position');
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const time = gl.getUniformLocation(program, 'u_time');
    if (position < 0 || !resolution || !time) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    let frame = 0;
    let visible = true;
    let disposed = false;
    const startedAt = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const requestFrame = () => {
      if (
        frame
        || disposed
        || !visible
        || document.hidden
        || reduceMotion.matches
      ) return;
      frame = window.requestAnimationFrame(render);
    };

    const render = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || reduceMotion.matches) return;
      resize();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - startedAt) / 1_000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      setRenderer('webgl');
      requestFrame();
    };

    const handleVisibility = () => requestFrame();
    const handleMotion = () => {
      if (reduceMotion.matches) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        setRenderer('fallback');
        return;
      }
      requestFrame();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      setRenderer('fallback');
    };

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? true;
          if (!visible && frame) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          }
          requestFrame();
        }, { rootMargin: '80px' })
      : null;

    observer?.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibility);
    reduceMotion.addEventListener('change', handleMotion);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    requestFrame();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      reduceMotion.removeEventListener('change', handleMotion);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [canvasRef]);

  return renderer;
}

export function WayfareLiquidMark({
  className,
}: Readonly<WayfareLiquidMarkProps>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useWayfareLiquidShader(canvasRef);

  return (
    <span
      aria-hidden="true"
      className={className}
      data-renderer={renderer}
      data-wayfare-liquid="true"
    >
      <WayfareMark className="wayfare-liquid-mark__fallback" staticGradient />
      <canvas className="wayfare-liquid-mark__canvas" ref={canvasRef} />
    </span>
  );
}
