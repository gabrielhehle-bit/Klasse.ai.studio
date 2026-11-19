import React from 'react';
import { TimerWidget, type TimerWidgetProps } from './widgets/TimerWidget';
import { TimeToolsStudio } from './widgets/TimeToolsStudio';

export type TimerWidgetContentProps = TimerWidgetProps;

export const TimerWidgetContent: React.FC<TimerWidgetContentProps> = (props) => {
  return <TimeToolsStudio {...props} />;
};

export { TimerWidget };
