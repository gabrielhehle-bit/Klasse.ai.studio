import React from 'react';
import { FractionVisualizer, FractionVisualizerProps } from './widgets/FractionVisualizer';

export const FractionVisualizerContent: React.FC<FractionVisualizerProps> = (props) => {
  return <FractionVisualizer {...props} />;
};

export default FractionVisualizerContent;
