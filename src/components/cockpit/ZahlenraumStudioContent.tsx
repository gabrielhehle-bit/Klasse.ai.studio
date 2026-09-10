import React from 'react';
import { ZahlenraumStudio, ZahlenraumStudioProps } from './widgets/ZahlenraumStudio';

export const ZahlenraumStudioContent: React.FC<ZahlenraumStudioProps> = (props) => {
  return <ZahlenraumStudio {...props} />;
};

export default ZahlenraumStudioContent;
