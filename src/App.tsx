import { useEffect, useRef } from 'react';
import { useStore, encodeToHash, decodeFromHash, type Mode } from './store';
import { TabBar } from './components/TabBar';
import { Sidebar } from './components/Sidebar';
import { CanvasMount, type CanvasHandle } from './components/CanvasMount';
import { ChevronIcon } from './components/Icons';

const MODE_BY_KEY: Record<string, Mode> = {
  '1': 'flow',
  '2': 'life',
  '3': 'pulse',
  '4': 'particles',
};

export default function App() {
  const fullscreen = useStore((s) => s.fullscreen);
  const sidebarHidden = useStore((s) => s.sidebarHidden);
  const setMode = useStore((s) => s.setMode);
  const setFullscreen = useStore((s) => s.setFullscreen);
  const setSidebarHidden = useStore((s) => s.setSidebarHidden);
  const applyConfig = useStore((s) => s.applyConfig);
  const canvasRef = useRef<CanvasHandle>(null);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (MODE_BY_KEY[key]) {
        setMode(MODE_BY_KEY[key]);
        e.preventDefault();
      } else if (key === 'f') {
        setFullscreen(!useStore.getState().fullscreen);
        e.preventDefault();
      } else if (key === 'h') {
        setSidebarHidden(!useStore.getState().sidebarHidden);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMode, setFullscreen, setSidebarHidden]);

  // Listen for hash changes (e.g. user pastes a shared URL).
  useEffect(() => {
    const onHash = () => {
      const parsed = decodeFromHash(window.location.hash);
      if (parsed) applyConfig(parsed);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [applyConfig]);

  // Debounced URL sync on state changes.
  useEffect(() => {
    let timer: number | undefined;
    const unsub = useStore.subscribe((state) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const hash = encodeToHash(state);
        const cur = window.location.hash;
        if (cur !== hash) window.history.replaceState(null, '', hash);
      }, 250) as unknown as number;
    });
    return () => {
      if (timer) window.clearTimeout(timer);
      unsub();
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#121212] text-white overflow-hidden">
      <TabBar getCanvas={() => canvasRef.current?.getCanvas() ?? null} />
      <div className="flex-1 flex relative overflow-hidden">
        {!fullscreen && !sidebarHidden && (
          <div className="w-[260px] flex-shrink-0 relative">
            <Sidebar />
            <button
              onClick={() => setSidebarHidden(true)}
              title="Collapse sidebar (H)"
              className="absolute top-3 -right-3 z-30 w-6 h-6 flex items-center justify-center rounded-full bg-[#0d0d0d] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 shadow"
            >
              <ChevronIcon size={10} className="rotate-90" />
            </button>
          </div>
        )}
        {!fullscreen && sidebarHidden && (
          <button
            onClick={() => setSidebarHidden(false)}
            title="Show sidebar (H)"
            className="absolute top-3 left-3 z-30 w-6 h-6 flex items-center justify-center rounded-full bg-[#0d0d0d] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 shadow"
          >
            <ChevronIcon size={10} className="-rotate-90" />
          </button>
        )}
        <div className="flex-1 relative">
          <CanvasMount ref={canvasRef} />
        </div>
        {fullscreen && !sidebarHidden && (
          <div className="absolute top-3 left-3 bottom-3 w-[260px] z-20 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d0d]/95 backdrop-blur-sm shadow-2xl">
            <Sidebar />
          </div>
        )}
      </div>
    </div>
  );
}
