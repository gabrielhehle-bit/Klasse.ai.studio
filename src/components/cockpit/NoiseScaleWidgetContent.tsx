import React from 'react';
import { NoiseScaleWidget } from './widgets/NoiseScaleWidget';

export interface NoiseScaleWidgetContentProps {
  widget: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
}

export const NoiseScaleWidgetContent: React.FC<NoiseScaleWidgetContentProps> = (props) => {
  return <NoiseScaleWidget {...props} />;
};

export default NoiseScaleWidgetContent;
