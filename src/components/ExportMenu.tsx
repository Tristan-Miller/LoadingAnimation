import { useEffect, useRef, useState } from 'react';
import { ChevronIcon, DownloadIcon, RecordDotIcon } from './Icons';
import { useStore } from '../store';
import { buildEmbedHtml } from '../embed/template';

interface Props {
  getCanvas: () => HTMLCanvasElement | null;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const t = Math.floor(ms / 100) % 10;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${t}`;
}

export function ExportMenu({ getCanvas }: Props) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recStart, setRecStart] = useState(0);
  const [tick, setTick] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const savePng = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `veed-lab-${Date.now()}.png`);
    }, 'image/png');
    setOpen(false);
  };

  const startRecording = (autoStopMs?: number) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const stream = canvas.captureStream(60);
    // Try MP4 first (Safari + recent Chrome support it); fall back to WebM.
    const mimeCandidates = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const isMp4 = mimeType.startsWith('video/mp4');
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      downloadBlob(blob, `veed-lab-${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`);
      chunksRef.current = [];
    };
    rec.start();
    recorderRef.current = rec;
    setRecStart(performance.now());
    setRecording(true);
    if (autoStopMs && autoStopMs > 0) {
      window.setTimeout(() => {
        if (recorderRef.current === rec && rec.state !== 'inactive') {
          rec.stop();
          recorderRef.current = null;
          setRecording(false);
        }
      }, autoStopMs);
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const toggleRecord = () => {
    if (recording) stopRecording();
    else startRecording();
    setOpen(false);
  };

  const exportThreeCycleClip = () => {
    if (recording) return;
    const cfg = useStore.getState();
    const cycleMs = Math.max(800, cfg.rhythm.breathPeriod) + Math.max(0, cfg.rhythm.restMs);
    // Add a tiny tail so the third pulse fully resolves to rest before the file ends.
    const duration = cycleMs * 3 + 120;
    startRecording(duration);
    setOpen(false);
  };

  const exportCode = () => {
    const cfg = useStore.getState();
    const html = buildEmbedHtml(cfg);
    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, `veed-loader-${Date.now()}.html`);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        toggleRecord();
      }
      if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        savePng();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const elapsed = recording ? performance.now() - recStart : 0;

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      {recording && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-mono">
          <RecordDotIcon size={8} className="animate-pulse" />
          {fmtTime(elapsed)}
          <span className="sr-only">{tick}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition flex items-center gap-1"
        title="Export"
      >
        <DownloadIcon size={16} />
        <ChevronIcon size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-[#1a1a1a] border border-white/10 rounded shadow-xl py-1 min-w-[200px] text-sm">
          <button
            onClick={savePng}
            className="w-full px-3 py-1.5 text-left hover:bg-white/5 transition"
          >
            Save PNG
          </button>
          <button
            onClick={exportThreeCycleClip}
            disabled={recording}
            className="w-full px-3 py-1.5 text-left hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export 3-cycle clip
          </button>
          <button
            onClick={toggleRecord}
            className="w-full px-3 py-1.5 text-left hover:bg-white/5 transition flex items-center gap-2"
          >
            {recording ? (
              <>
                <RecordDotIcon size={8} /> Stop recording
              </>
            ) : (
              'Record (free length)'
            )}
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={exportCode}
            className="w-full px-3 py-1.5 text-left hover:bg-white/5 transition"
          >
            Export code (.html)
          </button>
        </div>
      )}
    </div>
  );
}
