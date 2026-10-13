import React from 'react';
import { CockpitWidgetConfig } from '../../types';
import { TimerWidget } from './widgets/TimerWidget';
import { TimeToolsStudio } from './widgets/TimeToolsStudio';

export interface TimerWidgetContentProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight: boolean;
  showSettings?: boolean;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
}

export const TimerWidgetContent: React.FC<TimerWidgetContentProps> = (props) => {
  return <TimeToolsStudio {...props} />;
};

export { TimerWidget };
