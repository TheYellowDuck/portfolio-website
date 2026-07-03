// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/engine';
import { museumMap, TILE_SIZE } from '@/game/tilemap';
import { COLORS } from '@/styles/theme';
import { PressButton } from "@/components/PressButton";

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 2.0;

export default function MapSnapshot() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef      = useRef<{ startMouse: { x: number; y: number }; startPan: { x: number; y: number } } | null>(null);
  const engineRef    = useRef<GameEngine | null>(null);

  const [status, setStatus]       = useState<'loading' | 'ready' | 'error'>('loading');
  const [isDragging, setIsDragging] = useState(false);
  const [view, setView]           = useState({ zoom: 0.3, panX: 0, panY: 0 });

  // Sprite loading — engine renders into the real canvas once ready
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dummy = document.createElement('canvas');
    dummy.width = 1;
    dummy.height = 1;
    const engine = new GameEngine(dummy, String(Date.now()));
    engineRef.current = engine;
    engine.onReady = () => {
      try {
        engine.renderFull(canvas);
        const { width: cw, height: ch } = containerRef.current!.getBoundingClientRect();
        const zoom = 0.3;
        setView({
          zoom,
          panX: (cw - canvas.width  * zoom) / 2,
          panY: (ch - canvas.height * zoom) / 2,
        });
        setStatus('ready');
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };
    return () => { engine.stop(); engineRef.current = null; };
  }, []);

  // Wheel zoom — must be non-passive to call preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Pinch-to-zoom (trackpad) or ctrl+scroll (mouse)
        const rect   = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setView(v => {
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom * factor));
          return {
            zoom: newZoom,
            panX: mouseX - (mouseX - v.panX) * (newZoom / v.zoom),
            panY: mouseY - (mouseY - v.panY) * (newZoom / v.zoom),
          };
        });
      } else {
        // Two-finger scroll → pan
        setView(v => ({ ...v, panX: v.panX - e.deltaX, panY: v.panY - e.deltaY }));
      }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Global mouse-move / mouse-up for drag-pan (tracks outside container)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startMouse.x;
      const dy = e.clientY - dragRef.current.startMouse.y;
      setView(v => ({
        ...v,
        panX: dragRef.current!.startPan.x + dx,
        panY: dragRef.current!.startPan.y + dy,
      }));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      startMouse: { x: e.clientX, y: e.clientY },
      startPan:   { x: view.panX, y: view.panY },
    };
    setIsDragging(true);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    engine.renderFull(canvas);
    const link = document.createElement('a');
    link.download = 'museum-map.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: COLORS.CANVAS_BG }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: COLORS.FLOOR, fontFamily: 'monospace', fontSize: 14 }}>
          Museum Map — {museumMap[0].length} × {museumMap.length} tiles @ {TILE_SIZE}px
        </span>
        {status === 'loading' && <span style={{ color: '#888', fontFamily: 'monospace', fontSize: 13 }}>Loading sprites…</span>}
        {status === 'error'   && <span style={{ color: '#e87', fontFamily: 'monospace', fontSize: 13 }}>Render error — check console</span>}
        {status === 'ready'   && (
          <PressButton
            onClick={handleDownload}
            style={{ padding: '5px 14px', background: COLORS.SAGE, color: COLORS.CANVAS_BG, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 }}
          >
            Download PNG
          </PressButton>
        )}
        <span style={{ marginLeft: 'auto', color: '#555', fontFamily: 'monospace', fontSize: 12 }}>
          {Math.round(view.zoom * 100)}% · scroll to zoom · drag to pan
        </span>
      </div>

      {/* Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            imageRendering: 'pixelated',
            transformOrigin: '0 0',
            transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  );
}
