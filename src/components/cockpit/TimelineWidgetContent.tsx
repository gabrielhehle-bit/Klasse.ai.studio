import React from 'react';
import { TimelineWidget, TimelineWidgetProps } from './widgets/TimelineWidget';

export interface TimelineWidgetContentProps extends TimelineWidgetProps {}

/**
 * TimelineWidgetContent: F-UI Standard-konformer Tages-Zeitstrahl für Cockpit & Smartboard
 * Delegiert an das isolierte TimelineWidget-Modul.
 */
export const TimelineWidgetContent: React.FC<TimelineWidgetContentProps> = (props) => {
  return <TimelineWidget {...props} />;
};

export default TimelineWidgetContent;
