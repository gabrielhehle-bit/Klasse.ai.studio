import React from 'react';
import { useApp } from '../context/AppContext';
import { LernwoerterStudioWidget } from './cockpit/widgets/LernwoerterStudioWidget';

export default function LernwoerterWidget({ isFullscreen }: { isFullscreen?: boolean }) {
  const { app, setApp } = useApp();
  return (
    <div className="w-full h-full overflow-hidden">
      <LernwoerterStudioWidget
        isFullscreen={isFullscreen}
        app={app}
        setApp={setApp}
        defaultMode="cards"
      />
    </div>
  );
}
