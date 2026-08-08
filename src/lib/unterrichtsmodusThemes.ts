import { UnterrichtsmodusThemeId, UnterrichtsmodusHintergrundId } from '../types';

export interface UnterrichtsmodusTheme {
  id: UnterrichtsmodusThemeId;
  label: string;
  description: string;
  font: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    accentSoft: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    surface: string;
    buttonText: string;
  };
}

export const UNTERRICHTSMODUS_THEMES: Record<UnterrichtsmodusThemeId, UnterrichtsmodusTheme> = {
  classic_light: {
    id: 'classic_light',
    label: 'Classic Light',
    description: 'Moderne, helle Optik',
    font: "'Inter', sans-serif",
    colors: {
      background: '#f1f5f9',
      foreground: '#ffffff',
      accent: '#3b82f6',
      accentSoft: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.2)',
      textPrimary: '#0f172a',
      textSecondary: '#1e293b',
      textMuted: '#475569',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  },
  deep_dark: {
    id: 'deep_dark',
    label: 'Deep Dark',
    description: 'Elegantes, tiefes Dunkel',
    font: "'Outfit', sans-serif",
    colors: {
      background: '#09090b',
      foreground: '#18181b',
      accent: '#ff8800',
      accentSoft: 'rgba(255, 136, 0, 0.15)',
      border: 'rgba(255, 255, 255, 0.15)',
      textPrimary: '#fafafa',
      textSecondary: '#e4e4e7',
      textMuted: '#a1a1aa',
      surface: '#18181b',
      buttonText: '#09090b',
    }
  },
  soft_sage: {
    id: 'soft_sage',
    label: 'Soft Sage',
    description: 'Beruhigendes Salbeigrün',
    font: "'Quicksand', sans-serif",
    colors: {
      background: '#dcfce7',
      foreground: '#ffffff',
      accent: '#16a34a',
      accentSoft: 'rgba(22, 163, 74, 0.15)',
      border: 'rgba(22, 163, 74, 0.3)',
      textPrimary: '#14532d',
      textSecondary: '#166534',
      textMuted: '#22c55e',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  },
  ocean_breeze: {
    id: 'ocean_breeze',
    label: 'Ocean Breeze',
    description: 'Frisches Ozeanblau',
    font: "'Lexend', sans-serif",
    colors: {
      background: '#dbeafe',
      foreground: '#ffffff',
      accent: '#2563eb',
      accentSoft: 'rgba(37, 99, 235, 0.15)',
      border: 'rgba(37, 99, 235, 0.3)',
      textPrimary: '#1e3a8a',
      textSecondary: '#1e40af',
      textMuted: '#3b82f6',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  },
  warm_sand: {
    id: 'warm_sand',
    label: 'Warm Sand',
    description: 'Gemütliche Sandtöne',
    font: "'Source Serif 4', serif",
    colors: {
      background: '#ffedd5',
      foreground: '#ffffff',
      accent: '#ea580c',
      accentSoft: 'rgba(234, 88, 12, 0.15)',
      border: 'rgba(234, 88, 12, 0.3)',
      textPrimary: '#7c2d12',
      textSecondary: '#9a3412',
      textMuted: '#f97316',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  },
  lavender_field: {
    id: 'lavender_field',
    label: 'Lavender Field',
    description: 'Lila Blütenzauber',
    font: "'DM Sans', sans-serif",
    colors: {
      background: '#f3e8ff',
      foreground: '#ffffff',
      accent: '#9333ea',
      accentSoft: 'rgba(147, 51, 234, 0.15)',
      border: 'rgba(147, 51, 234, 0.3)',
      textPrimary: '#581c87',
      textSecondary: '#6b21a8',
      textMuted: '#a855f7',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  },
  cozy_mint: {
    id: 'cozy_mint',
    label: 'Cozy Mint',
    description: 'Kühles Minzgrün',
    font: "'Lexend', sans-serif",
    colors: {
      background: '#ccfbf1',
      foreground: '#ffffff',
      accent: '#0d9488',
      accentSoft: 'rgba(13, 148, 136, 0.15)',
      border: 'rgba(13, 148, 136, 0.3)',
      textPrimary: '#134e4a',
      textSecondary: '#115e59',
      textMuted: '#14b8a6',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  },
  sakura_dream: {
    id: 'sakura_dream',
    label: 'Sakura Dream',
    description: 'Zartes Kirschblüten-Pink',
    font: "'Outfit', sans-serif",
    colors: {
      background: '#fce7f3',
      foreground: '#ffffff',
      accent: '#db2777',
      accentSoft: 'rgba(219, 39, 119, 0.15)',
      border: 'rgba(219, 39, 119, 0.3)',
      textPrimary: '#831843',
      textSecondary: '#9d174d',
      textMuted: '#ec4899',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  },
  candy: {
    id: 'candy',
    label: 'Candy Party',
    description: 'Buntes Geburtstagsdesign',
    font: "'Fredoka', sans-serif",
    colors: {
      background: '#fdf4ff',
      foreground: 'rgba(255, 255, 255, 0.98)',
      accent: '#ec4899', /* pink-500 */
      accentSoft: '#fbcfe8', 
      border: '#f472b6', /* pink-400 */
      textPrimary: '#831843', /* pink-900 */
      textSecondary: '#be185d', /* pink-700 */
      textMuted: '#db2777', /* pink-600 */
      surface: 'rgba(255, 255, 255, 0.95)',
      buttonText: '#ffffff',
    }
  },
  custom_theme: {
    id: 'custom_theme',
    label: 'Eigene Farbe',
    description: 'Dein ganz persönliches Design',
    font: "'DM Sans', sans-serif",
    colors: {
      background: '#f3f4f6',
      foreground: '#ffffff',
      accent: '#14b8a6',
      accentSoft: 'rgba(20, 184, 166, 0.1)',
      border: 'rgba(0,0,0,0.1)',
      textPrimary: '#171717',
      textSecondary: '#404040',
      textMuted: '#595959',
      surface: '#ffffff',
      buttonText: '#ffffff',
    }
  }
};

export const UNTERRICHTSMODUS_HINTERGRUENDE: Record<UnterrichtsmodusHintergrundId, { label: string; style: any }> = {
  kein: { label: 'Kein', style: {} },
  candy: {
    label: 'Candy Party',
    style: {
      backgroundImage: `repeating-conic-gradient(from 0deg, #ff9a9e 0deg 30deg, #fecfef 30deg 60deg, #a18cd1 60deg 90deg, #fbc2eb 90deg 120deg, #8fd3f4 120deg 150deg, #84fab0 150deg 180deg, #fccb90 180deg 210deg, #d57eeb 210deg 240deg, #fddb92 240deg 270deg, #d1fdff 270deg 300deg, #f68084 300deg 330deg, #fcf4ba 330deg 360deg)`,
      backgroundSize: '100% 100%'
    }
  },
  sterne: { 
    label: 'Sterne', 
    style: { 
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l2 10 10 2-10 2-2 10-2-10-10-2 10-2z' fill='%23f59e0b' fill-opacity='0.5'/%3E%3C/svg%3E")`,
      backgroundSize: '80px 80px',
      backgroundRepeat: 'repeat'
    } 
  },
  tafel: { 
    label: 'Tafel', 
    style: { 
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat'
    } 
  },
  wolken: { 
    label: 'Wolken', 
    style: { 
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 80c0-20 20-30 40-20 10-20 40-20 50 0 20-10 40 0 40 20 20 10 20 40 0 50-10 20-40 20-50 0-10 20-40 20-40-20-20-10-40 0-40-20-20-10-20-40 0-50z' fill='%233b82f6' fill-opacity='0.2'/%3E%3C/svg%3E")`,
      backgroundSize: '150px 150px',
      backgroundRepeat: 'repeat'
    } 
  },
  wald: { 
    label: 'Wald', 
    style: { 
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10l15 30h-30l15-30zM50 40l20 40h-40l20-40z' fill='%2315803d' fill-opacity='0.2'/%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px',
      backgroundRepeat: 'repeat'
    } 
  },
  papier: { 
    label: 'Papier', 
    style: { 
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='5'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23paper)' opacity='0.2'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat'
    } 
  },
  eigenes: { label: 'Eigenes', style: {} }
};
