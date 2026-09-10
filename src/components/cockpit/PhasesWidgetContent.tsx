import React from 'react';
import { PhasesWidget, PhasesWidgetProps } from './widgets/PhasesWidget';

export const PhasesWidgetContent: React.FC<PhasesWidgetProps> = (props) => {
  return <PhasesWidget {...props} />;
};

export default PhasesWidgetContent;
