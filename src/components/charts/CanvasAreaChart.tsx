import React, { useRef, useEffect } from 'react';

interface CanvasAreaProps {
  data: number[];
  height?: number;
  width?: number | string;
  color?: string;
  fillColor?: string;
}

export const CanvasAreaChart: React.FC<CanvasAreaProps> = ({ 
  data, 
  height = 100,
  width = '100%',
  color = '#3b82f6',
  fillColor = 'rgba(59, 130, 246, 0.1)'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only resize if needed
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    if (!data || data.length < 2) return;
    
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    
    const xStep = rect.width / (data.length - 1);
    
    ctx.beginPath();
    ctx.moveTo(0, rect.height);
    
    data.forEach((val, i) => {
      const normalizedVal = (val - minVal) / range;
      const y = rect.height - (normalizedVal * (rect.height - 4)) - 2;
      const x = i * xStep;
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(rect.width, rect.height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    ctx.beginPath();
    data.forEach((val, i) => {
      const normalizedVal = (val - minVal) / range;
      const y = rect.height - (normalizedVal * (rect.height - 4)) - 2;
      const x = i * xStep;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data, height, color, fillColor]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width, height, display: 'block' }} 
    />
  );
};
