import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useStore, type Mode } from '../store';
import { BaseSketch } from '../sketches/base';
import { FlowSketch } from '../sketches/flow';
import { LifeSketch } from '../sketches/life';
import { PulseSketch } from '../sketches/pulse';
import { ParticlesSketch } from '../sketches/particles';

const SKETCH_BY_MODE: Record<Mode, new () => BaseSketch> = {
  flow: FlowSketch,
  life: LifeSketch,
  pulse: PulseSketch,
  particles: ParticlesSketch,
};

const BACKDROP_SRC = `${import.meta.env.BASE_URL}veed-loading-bg.png`;
const FALLBACK_ASPECT = 16 / 9;
const FALLBACK_NATURAL_WIDTH = 1920;

export interface CanvasHandle {
  getCanvas(): HTMLCanvasElement | null;
}

export const CanvasMount = forwardRef<CanvasHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<BaseSketch | null>(null);

  const activeMode = useStore((s) => s.activeMode);
  const fullscreen = useStore((s) => s.fullscreen);
  const targetFps = useStore((s) => s.performance.targetFps);
  const backdrop = useStore((s) => s.backdrop);

  const [imgAspect, setImgAspect] = useState<number>(FALLBACK_ASPECT);
  const [imgNaturalWidth, setImgNaturalWidth] = useState<number>(FALLBACK_NATURAL_WIDTH);
  const [imgNaturalHeight, setImgNaturalHeight] = useState<number>(
    Math.round(FALLBACK_NATURAL_WIDTH / FALLBACK_ASPECT),
  );
  const [imgLoaded, setImgLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    getCanvas: () => sketchRef.current?.getCanvas() ?? null,
  }));

  // Create / destroy sketch when mode changes.
  useEffect(() => {
    if (!innerRef.current) return;
    const SketchClass = SKETCH_BY_MODE[activeMode];
    const sketch = new SketchClass();
    sketch.mount(innerRef.current);
    sketchRef.current = sketch;
    return () => {
      sketch.unmount();
      sketchRef.current = null;
    };
  }, [activeMode]);

  // Track parent size and resize canvas when fullscreen/contained switches.
  useEffect(() => {
    if (!innerRef.current) return;
    const el = innerRef.current;
    const resize = () => {
      if (!sketchRef.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) sketchRef.current.resize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    return () => ro.disconnect();
  }, [activeMode, fullscreen, backdrop.scale]);

  // Update target framerate live.
  useEffect(() => {
    sketchRef.current?.setTargetFps(targetFps);
  }, [targetFps]);

  if (fullscreen) {
    return (
      <div ref={containerRef} className="absolute inset-0 flex items-stretch">
        <div ref={innerRef} className="flex-1 relative" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-6">
      <div
        className="relative bg-white shadow-2xl overflow-hidden rounded-sm"
        style={{
          aspectRatio: String(imgAspect),
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
        }}
      >
        <img
          src={BACKDROP_SRC}
          alt=""
          ref={(img) => {
            if (img && img.complete && img.naturalWidth > 0) {
              setImgAspect(img.naturalWidth / img.naturalHeight);
              setImgNaturalWidth(img.naturalWidth);
              setImgNaturalHeight(img.naturalHeight);
              setImgLoaded(true);
            }
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setImgAspect(img.naturalWidth / img.naturalHeight);
              setImgNaturalWidth(img.naturalWidth);
              setImgNaturalHeight(img.naturalHeight);
            }
            setImgLoaded(true);
          }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-black/40 text-xs">
            Add <code className="mx-1 px-1 bg-black/10 rounded">public/veed-loading-bg.png</code> to see the backdrop
          </div>
        )}
        <div
          ref={innerRef}
          className="absolute overflow-hidden"
          style={{
            left: '50%',
            top: `${backdrop.yPct}%`,
            width: `${(backdrop.scale / imgNaturalWidth) * 100}%`,
            height: `${(backdrop.scale / imgNaturalHeight) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
    </div>
  );
});
CanvasMount.displayName = 'CanvasMount';
