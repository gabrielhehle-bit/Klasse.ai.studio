import React from 'react';
import { AppState, CockpitWidgetConfig } from '../../types';
import { RandomSelectionStudio } from './widgets/RandomSelectionStudio';

export interface RandomNameWidgetProps {
  widget: CockpitWidgetConfig;
  app: AppState;
  currentIsLight: boolean;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const RandomNameWidgetContent: React.FC<RandomNameWidgetProps> = ({
  widget,
  app,
  currentIsLight,
  onUpdate, showSettings, onCloseSettings,
}) => {
  return (
    <RandomSelectionStudio
      widget={widget}
      app={app}
      currentIsLight={currentIsLight}
      onUpdate={onUpdate}
      showSettings={showSettings}
      onCloseSettings={onCloseSettings}
    />
  );
};

export default RandomNameWidgetContent;
