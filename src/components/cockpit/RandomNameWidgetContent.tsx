import React from 'react';
import { AppState, CockpitWidgetConfig } from '../../types';
import { RandomNameWidget } from './widgets/RandomNameWidget';

export interface RandomNameWidgetProps {
  widget: CockpitWidgetConfig;
  app: AppState;
  currentIsLight: boolean;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
}

export const RandomNameWidgetContent: React.FC<RandomNameWidgetProps> = ({
  widget,
  app,
  currentIsLight,
  onUpdate,
}) => {
  return (
    <RandomNameWidget
      widget={widget}
      app={app}
      currentIsLight={currentIsLight}
      onUpdate={onUpdate}
    />
  );
};

export default RandomNameWidgetContent;
