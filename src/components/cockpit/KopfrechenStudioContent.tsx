import React from 'react';
import { KopfrechenStudio, KopfrechenStudioProps } from './widgets/KopfrechenStudio';

export const KopfrechenStudioContent: React.FC<KopfrechenStudioProps> = (props) => {
  return <KopfrechenStudio {...props} />;
};

export default KopfrechenStudioContent;
