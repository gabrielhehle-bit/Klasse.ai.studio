import { Jimp } from 'jimp';
import * as fs from 'fs';
import * as path from 'path';

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

function getLogoSdf(nx: number, ny: number): number {
  // Brush radius is 4.5
  // Letter L: (33, 30) -> (33, 70) -> (47, 70)
  const d_L1 = distanceToSegment(nx, ny, 33, 30, 33, 70);
  const d_L2 = distanceToSegment(nx, ny, 33, 70, 47, 70);
  
  // Letter M: (53, 70) -> (53, 30) -> (65, 55) -> (77, 30) -> (77, 70)
  const d_M1 = distanceToSegment(nx, ny, 53, 70, 53, 30);
  const d_M2 = distanceToSegment(nx, ny, 53, 30, 65, 55);
  const d_M3 = distanceToSegment(nx, ny, 65, 55, 77, 30);
  const d_M4 = distanceToSegment(nx, ny, 77, 30, 77, 70);

  const min_L = Math.min(d_L1, d_L2);
  const min_M = Math.min(d_M1, d_M2, d_M3, d_M4);
  
  return Math.min(min_L, min_M);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function rgbaToInt(r: number, g: number, b: number, a: number): number {
  return r * 0x1000000 + g * 0x10000 + b * 0x100 + a;
}

async function generateIcon(size: number, isMaskable: boolean, filename: string) {
  const image = new Jimp({ width: size, height: size });
  const greenRGB = { r: 16, g: 185, b: 129 }; // #10b981
  const whiteRGB = { r: 255, g: 255, b: 255 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Coordinate space normalized to 100x100
      const nx = (x / size) * 100;
      const ny = (y / size) * 100;

      const distFromCenter = Math.sqrt((nx - 50) ** 2 + (ny - 50) ** 2);
      
      let bgAlpha = 0;
      if (isMaskable) {
        // Maskable icon fills the entire square
        bgAlpha = 1.0;
      } else {
        // Regular icon has a circular background of radius 48
        // We use anti-aliasing on the circle edge
        const pxRadius = 48;
        const edgeSoftness = 100 / size; // 1 pixel softness in normalizer coords
        bgAlpha = clamp((pxRadius - distFromCenter) / edgeSoftness + 0.5, 0, 1);
      }

      // Calculate logo SDF
      const logoDist = getLogoSdf(nx, ny);
      const brushRadius = 4.5;
      const strokeSoftness = 100 / size; // 1 pixel softness
      const logoAlpha = clamp((brushRadius - logoDist) / strokeSoftness + 0.5, 0, 1);

      // Blend the background
      let r = 0, g = 0, b = 0, a = 0;
      if (bgAlpha > 0) {
        // Base background is green
        r = greenRGB.r;
        g = greenRGB.g;
        b = greenRGB.b;
        a = Math.round(bgAlpha * 255);

        // Blend logo on top of background
        if (logoAlpha > 0) {
          r = Math.round((1 - logoAlpha) * r + logoAlpha * whiteRGB.r);
          g = Math.round((1 - logoAlpha) * g + logoAlpha * whiteRGB.g);
          b = Math.round((1 - logoAlpha) * b + logoAlpha * whiteRGB.b);
          // Alpha remains fully opaque or slightly higher
          a = Math.max(a, Math.round(logoAlpha * 255));
        }
      }

      image.setPixelColor(rgbaToInt(r, g, b, a), x, y);
    }
  }

  const outputPath = path.join(publicDir, filename);
  await image.write(outputPath as any);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  try {
    console.log('Generating PWA icons...');
    await generateIcon(192, false, 'pwa-192.png');
    await generateIcon(512, false, 'pwa-512.png');
    await generateIcon(512, true, 'pwa-512-maskable.png');
    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
