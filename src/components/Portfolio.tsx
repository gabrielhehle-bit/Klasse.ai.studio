import React, { Suspense } from 'react';
const Statistics = React.lazy(() => import('./Statistics'));

export default function Portfolio() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400 font-medium font-sans animate-pulse">Lade Diagnoseprofile...</div>}>
      <Statistics initialTab="profiles" />
    </Suspense>
  );
}
