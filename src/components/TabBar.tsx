import { useState } from 'react';
import { useStore, encodeToHash, type Mode } from '../store';
import { ExportMenu } from './ExportMenu';
import { ShareIcon } from './Icons';

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'flow', label: 'Flow' },
  { id: 'life', label: 'Life' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'particles', label: 'Particles' },
];

interface Props {
  getCanvas: () => HTMLCanvasElement | null;
}

export function TabBar({ getCanvas }: Props) {
  const activeMode = useStore((s) => s.activeMode);
  const setMode = useStore((s) => s.setMode);

  const [copied, setCopied] = useState(false);

  const copyShareLink = () => {
    const state = useStore.getState();
    const hash = encodeToHash(state);
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.history.replaceState(null, '', hash);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div className="h-12 flex items-center px-4 gap-2 border-b border-white/5 bg-[#0d0d0d] z-30 relative">
      <div className="flex items-center gap-2 mr-4">
        <div className="text-accent text-base font-bold tracking-tight" style={{ color: '#96FF1A' }}>
          VEED
        </div>
        <div className="text-white/40 text-[11px] uppercase tracking-widest">Lab</div>
      </div>

      <div className="flex items-center gap-1">
        {MODES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={
              'px-3 py-1.5 text-xs rounded transition relative ' +
              (activeMode === m.id
                ? 'text-black font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/5')
            }
            style={
              activeMode === m.id ? { background: '#96FF1A' } : undefined
            }
            title={`${m.label} (${i + 1})`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={copyShareLink}
        className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition flex items-center gap-1.5 text-[11px]"
        title="Copy share link"
      >
        <ShareIcon size={14} />
        {copied && <span className="text-accent" style={{ color: '#96FF1A' }}>Copied!</span>}
      </button>

      <ExportMenu getCanvas={getCanvas} />
    </div>
  );
}
