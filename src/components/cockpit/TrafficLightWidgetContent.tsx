import React from 'react';
import { TrafficLightWidget, TrafficLightWidgetProps } from './widgets/TrafficLightWidget';

export const TrafficLightWidgetContent: React.FC<TrafficLightWidgetProps> = (props) => {
  return <TrafficLightWidget {...props} />;
};

export default TrafficLightWidgetContent;
