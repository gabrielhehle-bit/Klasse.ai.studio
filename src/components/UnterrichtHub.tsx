import React from 'react';
import { useApp } from '../context/AppContext';

/** Compatibility for older lazy imports: no duplicate Unterricht landing page. */
export default function UnterrichtHub() {
  const { setPage } = useApp();
  React.useEffect(() => { setPage('cockpit'); }, [setPage]);
  return null;
}
