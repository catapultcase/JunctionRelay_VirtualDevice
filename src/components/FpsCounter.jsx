import { useEffect, useState, useRef } from 'react';

export function FpsCounter({ visible, position = 'top-left' }) {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lastFrameTimeRef = useRef(performance.now());
  const rafIdRef = useRef();

  useEffect(() => {
    if (!visible) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      return;
    }

    const calculateFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      
      frameCountRef.current++;

      // Update FPS every second
      if (now >= lastTimeRef.current + 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        setFrameTime(Math.round(delta * 100) / 100);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(calculateFps);
    };

    rafIdRef.current = requestAnimationFrame(calculateFps);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [visible]);

  if (!visible) return null;

  // Calculate position styles based on position prop
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: '#00ff00',
      padding: '8px 12px',
      borderRadius: 4,
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      zIndex: 999999,
      pointerEvents: 'none',
      userSelect: 'none',
      border: '1px solid rgba(0, 255, 0, 0.3)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
      minWidth: 80,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: 10, left: 10 };
      case 'top-right':
        return { ...baseStyles, top: 10, right: 10 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 10, left: 10 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 10, right: 10 };
      case 'center':
        return {
          ...baseStyles,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      default:
        return { ...baseStyles, top: 10, left: 10 };
    }
  };

  return (
    <div style={getPositionStyles()}>
      <div style={{ marginBottom: 2 }}>
        FPS: <span style={{ color: fps < 30 ? '#ff4444' : fps < 50 ? '#ffaa00' : '#00ff00' }}>
          {fps}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#88ff88' }}>
        {frameTime.toFixed(2)}ms
      </div>
    </div>
  );
}