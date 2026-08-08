import React, { useRef, useEffect } from 'react';

interface CanvasSparklineProps {
  data: number[];
  height?: number;
  width?: number | string;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

export const CanvasSparkline: React.FC<CanvasSparklineProps> = ({ 
  data, 
  height = 40,
  width = '100%',
  color = '#3b82f6',
  fillOpacity = 0.1,
  strokeWidth = 2
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Handle High-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    if (!data || data.length < 2) return;
    
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal === minVal ? 1 : maxVal - minVal;
    
    // Convert hex to rgb for fill
    let r = 59, g = 130, b = 246; // default blue
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length === 3) {
        r = parseInt(hex[0]+hex[0], 16);
        g = parseInt(hex[1]+hex[1], 16);
        b = parseInt(hex[2]+hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0,2), 16);
        g = parseInt(hex.substring(2,4), 16);
        b = parseInt(hex.substring(4,6), 16);
      }
    }
    
    const xStep = rect.width / (data.length - 1);
    
    // Draw fill area
    ctx.beginPath();
    ctx.moveTo(0, rect.height);
    
    data.forEach((val, i) => {
      const normalizedVal = (val - minVal) / range;
      const y = rect.height - (normalizedVal * (rect.height - strokeWidth * 2)) - strokeWidth;
      const x = i * xStep;
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(rect.width, rect.height);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillOpacity})`;
    ctx.fill();
    
    // Draw stroke line
    ctx.beginPath();
    data.forEach((val, i) => {
      const normalizedVal = (val - minVal) / range;
      const y = rect.height - (normalizedVal * (rect.height - strokeWidth * 2)) - strokeWidth;
      const x = i * xStep;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Simple smoothing
        const prevVal = data[i - 1];
        const prevNormalizedVal = (prevVal - minVal) / range;
        const prevY = rect.height - (prevNormalizedVal * (rect.height - strokeWidth * 2)) - strokeWidth;
        const prevX = (i - 1) * xStep;
        
        const cp1x = prevX + (xStep / 2);
        const cp1y = prevY;
        const cp2x = prevX + (xStep / 2);
        const cp2y = y;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      }
    });
    
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Draw dot on last point
    const lastVal = data[data.length - 1];
    const lastNormalizedVal = (lastVal - minVal) / range;
    const lastY = rect.height - (lastNormalizedVal * (rect.height - strokeWidth * 2)) - strokeWidth;
    const lastX = rect.width;
    
    ctx.beginPath();
    ctx.arc(lastX, lastY, Math.max(strokeWidth * 1.5, 3), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
  }, [data, height, color, fillOpacity, strokeWidth]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width, height, display: 'block' }} 
    />
  );
};
