import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import SimplePortfolioView from './SimplePortfolioView';
import { mergeLegacyPortfolioEntries, type LegacyPortfolioMap } from '../lib/portfolioMigration';
import {
  loadEncryptedStorageItem,
  removeStorageItem,
  saveEncryptedStorageItem,
  STORAGE_KEYS,
} from '../lib/secureStorageService';
import { getActiveVaultKey } from '../lib/vaultStorage';

/** Only the presentation is simplified; historical encrypted portfolio items
 * and the existing legacy-to-student migration remain untouched. */
export default function Portfolio() {
  const { app, setApp } = useApp();

  useEffect(() => {
    let cancelled = false;

    const migrateLegacyPortfolios = async () => {
      const activeStudentIds = new Set((app.schueler || []).map(student => student.id));

      const rootLegacy = (app as any).portfolioEntries as LegacyPortfolioMap | undefined;
      if (rootLegacy && typeof rootLegacy === 'object') {
        const hasActiveEntries = Object.keys(rootLegacy).some(studentId =>
          activeStudentIds.has(studentId) && Array.isArray(rootLegacy[studentId]) && rootLegacy[studentId].length > 0
        );
        if (hasActiveEntries) {
          setApp(prev => {
            const currentLegacy = ((prev as any).portfolioEntries || {}) as LegacyPortfolioMap;
            const migrated = mergeLegacyPortfolioEntries(prev.schueler || [], currentLegacy);
            const next: any = { ...prev, schueler: migrated.students };
            if (Object.keys(migrated.remaining).length > 0) next.portfolioEntries = migrated.remaining;
            else delete next.portfolioEntries;
            return next;
          });
        }
      }

      const vaultKey = getActiveVaultKey();
      if (!vaultKey) return;

      const cached = await loadEncryptedStorageItem<LegacyPortfolioMap>(
        STORAGE_KEYS.PORTFOLIO_ENTRIES,
        vaultKey,
      );
      if (cancelled || !cached || typeof cached !== 'object') return;

      const hasActiveCachedEntries = Object.keys(cached).some(studentId =>
        activeStudentIds.has(studentId) && Array.isArray(cached[studentId]) && cached[studentId].length > 0
      );
      if (!hasActiveCachedEntries) return;

      const preview = mergeLegacyPortfolioEntries(app.schueler || [], cached);
      setApp(prev => ({
        ...prev,
        schueler: mergeLegacyPortfolioEntries(prev.schueler || [], cached).students,
      }));

      if (vaultKey && Object.keys(preview.remaining).length > 0) {
        await saveEncryptedStorageItem(STORAGE_KEYS.PORTFOLIO_ENTRIES, preview.remaining, vaultKey);
      } else if (Object.keys(preview.remaining).length === 0) {
        removeStorageItem(STORAGE_KEYS.PORTFOLIO_ENTRIES);
      }
    };

    void migrateLegacyPortfolios();
    return () => {
      cancelled = true;
    };
  }, [app.activeClassId, setApp]);

  return <SimplePortfolioView />;
}
