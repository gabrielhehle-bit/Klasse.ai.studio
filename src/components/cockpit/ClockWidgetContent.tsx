import React from 'react';
import { ClockWidget, ClockWidgetProps } from './widgets/ClockWidget';

export interface ClockWidgetContentProps extends ClockWidgetProps {}

/**
 * ClockWidgetContent: F-UI Standard-konformes Uhrzeit- & Datums-Widget (F11)
 * Delegiert an das isolierte ClockWidget-Modul.
 */
export const ClockWidgetContent: React.FC<ClockWidgetContentProps> = (props) => {
  return <ClockWidget {...props} />;
};

export default ClockWidgetContent;
