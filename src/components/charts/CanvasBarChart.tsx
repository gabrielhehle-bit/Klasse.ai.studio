import React, { useRef, useEffect } from 'react';

interface CanvasBarProps {
  data: number[] | { value: number; color?: string }[];
  labels?: string[];
  height?: number;
  width?: number | string;
  color?: string;
  highlightIndex?: number;
  highlightColor?: string;
}

export const CanvasBarChart: React.FC<CanvasBarProps> = ({ 
  data, 
  labels,
  height = 40,
  width = '100%',
  color = '#cbd5e1',
  highlightIndex = -1,
  highlightColor = '#10b981'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Handle High-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only resize if different
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    if (!data || data.length === 0) return;
    
    const isObjectData = typeof data[0] === 'object';
    const numData = isObjectData 
      ? (data as { value: number; color?: string }[]).map(d => d.value)
      : (data as number[]);
      
    const maxVal = Math.max(...numData, 1);
    const minVal = 0;
    const padding = 2;
    
    const barSpacing = Math.max(2, (rect.width * 0.1) / numData.length);
    const totalSpacing = barSpacing * (numData.length - 1);
    const barWidth = (rect.width - totalSpacing - (padding * 2)) / numData.length;
    
    // Draw bars
    numData.forEach((val, i) => {
      const normalizedVal = (val - minVal) / (maxVal - minVal);
      const barHeight = Math.max(2, normalizedVal * (rect.height - padding * 2));
      
      const x = padding + i * (barWidth + barSpacing);
      const y = rect.height - padding - barHeight;
      
      const isHighlighted = highlightIndex === i;
      let barColor = isHighlighted ? highlightColor : color;
      
      if (isObjectData && (data as any)[i].color) {
         barColor = (data as any)[i].color;
      }
      
      ctx.fillStyle = barColor;
      
      // Draw rounded rect bar
      const radius = Math.min(barWidth / 2, 4);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.lineTo(x, y + barHeight);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    });
    
  }, [data, height, color, highlightIndex, highlightColor]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width, height, display: 'block' }} 
      title={labels ? labels.join(', ') : ''}
    />
  );
};

