import React from 'react';
import { NoiseMeterWidget } from './widgets/NoiseMeterWidget';

export interface NoiseMeterWidgetContentProps {
  widget: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const NoiseMeterWidgetContent: React.FC<NoiseMeterWidgetContentProps> = (props) => {
  return <NoiseMeterWidget {...props} />;
};

export default NoiseMeterWidgetContent;
