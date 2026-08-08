import React, { useRef, useEffect } from 'react';

interface CanvasLiquidAuraProps {
  color?: string;
  energy?: number; // 0 to 100
  width?: number | string;
  height?: number | string;
}

export const CanvasLiquidAura: React.FC<CanvasLiquidAuraProps> = ({ 
  color = '#8b5cf6', 
  energy = 50,
  width = '100%',
  height = '100%' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Setup high-dpi canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    
    let animationFrameId: number;
    let time = Math.random() * 100;
    
    // Parse color for rgb
    let r = 139, g = 92, b = 246; // default purple
    if (color.startsWith('#')) {
       // if we have a hex, we can parse it roughly or just let canvas handle it.
       // we will use globalAlpha for transparency so we can just use the color string.
    }

    const draw = () => {
      time += 0.01 + (energy / 100) * 0.04; // faster when high energy
      
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const baseRadius = Math.min(rect.width, rect.height) * 0.35;
      
      // We will draw a few pulsating, rotating blobs to form an aura
      ctx.globalCompositeOperation = 'screen';
      
      for(let i=0; i<3; i++) {
        const angleOffset = (Math.PI * 2 / 3) * i + time;
        const wobble = Math.sin(time * 2 + i) * (baseRadius * 0.15 * (energy/50));
        
        const x = centerX + Math.cos(angleOffset) * (baseRadius * 0.2);
        const y = centerY + Math.sin(angleOffset) * (baseRadius * 0.2);
        const radius = baseRadius + wobble;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        // fade out the color based on i
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.globalAlpha = 0.4 + (energy / 200);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw some fast moving small particles
      const particleCount = Math.floor(energy / 10);
      for(let j=0; j<particleCount; j++) {
         const pTime = time * 3 + j;
         const pAngle = pTime * (1 + j*0.1);
         const pDist = baseRadius * 1.2 + Math.sin(pTime * 2) * 10;
         const px = centerX + Math.cos(pAngle) * pDist;
         const py = centerY + Math.sin(pAngle) * pDist;
         
         ctx.globalAlpha = 0.8;
         ctx.fillStyle = color;
         ctx.beginPath();
         ctx.arc(px, py, 2, 0, Math.PI*2);
         ctx.fill();
      }
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, energy]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width, height, position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: -1 }} 
    />
  );
};
