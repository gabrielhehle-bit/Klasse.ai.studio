import React from 'react';
import { SoundsWidget } from './widgets/SoundsWidget';

export interface SoundsWidgetContentProps {
  widget: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
  playSound?: (soundId: string) => void;
}

export const SoundsWidgetContent: React.FC<SoundsWidgetContentProps> = (props) => {
  return <SoundsWidget {...props} />;
};

export default SoundsWidgetContent;
