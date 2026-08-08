import { AppState, Student, DiagnostikErhebung, GradeData } from '../types';

export interface ConsistencyIssue {
  id: string;
  type: 
    | 'orphaned_grades' 
    | 'orphaned_diagnostics' 
    | 'orphaned_mitarbeit' 
    | 'orphaned_verhalten' 
    | 'duplicate_id' 
    | 'duplicate_name' 
    | 'orphaned_checklist' 
    | 'orphaned_klassenkasse' 
    | 'orphaned_sitzplan'
    | 'typo_name_discrepancy'
    | 'format_name_discrepancy';
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  affectedId: string;
  details?: string;
  module: 'schueler' | 'noten' | 'diagnostik' | 'mitarbeit' | 'verhalten' | 'other';
  fixable: boolean;
  suggestedAction?: {
    type: 'rename' | 'merge';
    suggestedValue?: string;
    targetId?: string;
  };
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  let i, j, alen = a.length, blen = b.length, cost;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  for (i = 0; i <= alen; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= blen; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= alen; i++) {
    for (j = 1; j <= blen; j++) {
      cost = (a[i - 1] === b[j - 1]) ? 0 : 1;
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + cost
      );
    }
  }
  return tmp[alen][blen];
}

export function capitalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return '';
      return word.split('-').map(part => {
        if (part.length === 0) return '';
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }).join('-');
    })
    .join(' ');
}

/**
 * Scans the entire AppState for data consistency errors across modules.
 */
export function scanDataConsistency(app: AppState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const students = app.schueler || [];
  const studentIds = new Set(students.map(s => s.id));
  const studentNames = students.map(s => `${(s.vorname || '').trim().toLowerCase()} ${(s.nachname || '').trim().toLowerCase()}`);

  // 1. Check for Duplicate Student IDs
  const seenIds = new Set<string>();
  students.forEach(s => {
    if (seenIds.has(s.id)) {
      issues.push({
        id: `dup-id-${s.id}`,
        type: 'duplicate_id',
        severity: 'error',
        title: 'Duplizierte Schüler-ID',
        description: `Der Schüler "${s.vorname} ${s.nachname}" teilt sich die ID (${s.id}) mit einem anderen Eintrag. Dies führt zu Datenüberschreibungen.`,
        affectedId: s.id,
        module: 'schueler',
        fixable: true
      });
    }
    seenIds.add(s.id);
  });

  // 2. Check for Duplicate Student Names
  const duplicateNamesChecked = new Set<string>();
  students.forEach((s, idx) => {
    const fullName = `${(s.vorname || '').trim()} ${(s.nachname || '').trim()}`;
    const key = fullName.toLowerCase();
    if (studentNames.filter(n => n === key).length > 1 && !duplicateNamesChecked.has(key)) {
      duplicateNamesChecked.add(key);
      issues.push({
        id: `dup-name-${s.id}`,
        type: 'duplicate_name',
        severity: 'warning',
        title: 'Namensgleichheit im Schülerstamm',
        description: `Es wurden mehrere Schüler mit dem Namen "${fullName}" gefunden. Bitte überprüfe die Unterscheidbarkeit in Noteneinträgen.`,
        affectedId: s.id,
        module: 'schueler',
        fixable: false
      });
    }
  });

  // 3. Check for Orphaned Grades in app.noten
  if (app.noten) {
    Object.keys(app.noten).forEach(sid => {
      if (!studentIds.has(sid)) {
        // Only report if there is actual grade records saved
        const hasRecords = JSON.stringify(app.noten[sid]).length > 20; 
        if (hasRecords) {
          issues.push({
            id: `orph-noten-${sid}`,
            type: 'orphaned_grades',
            severity: 'warning',
            title: 'Verwaiste Noteneinträge',
            description: `In der Notenmappe existieren Leistungsaufzeichnungen für einen Schüler mit der ID "${sid}", der nicht mehr in der Schülerliste existiert.`,
            affectedId: sid,
            details: `Leistungsdatensatz: ${JSON.stringify(app.noten[sid]).substring(0, 100)}...`,
            module: 'noten',
            fixable: true
          });
        }
      }
    });
  }

  // 4. Check for Orphaned Diagnostics in app.diagnostikErhebungen
  if (app.diagnostikErhebungen) {
    const orphanedDiagnosticsMap = new Map<string, number>();
    app.diagnostikErhebungen.forEach(e => {
      if (e.schuelerId && !studentIds.has(e.schuelerId)) {
        orphanedDiagnosticsMap.set(e.schuelerId, (orphanedDiagnosticsMap.get(e.schuelerId) || 0) + 1);
      }
    });
    orphanedDiagnosticsMap.forEach((count, sid) => {
      issues.push({
        id: `orph-diagnostik-${sid}`,
        type: 'orphaned_diagnostics',
        severity: 'warning',
        title: 'Verwaiste Diagnose-Daten',
        description: `Es existieren ${count} diagnostische Testergebnisse (Lernforschritte/Meilensteine) für einen Schüler mit der ID "${sid}", der nicht mehr gelistet ist.`,
        affectedId: sid,
        details: `${count} Erhebung(en) betroffen`,
        module: 'diagnostik',
        fixable: true
      });
    });
  }

  // 5. Check for Orphaned Mitarbeit
  if (app.mitarbeit) {
    Object.keys(app.mitarbeit).forEach(sid => {
      if (!studentIds.has(sid)) {
        const hasRecords = JSON.stringify(app.mitarbeit[sid]).length > 15;
        if (hasRecords) {
          issues.push({
            id: `orph-mitarbeit-${sid}`,
            type: 'orphaned_mitarbeit',
            severity: 'warning',
            title: 'Verwaiste Mitarbeit-Einträge',
            description: `Es sind Mitarbeit-Dokumentationen (Notenmappe) unter der nicht existenten Schüler-ID "${sid}" verzeichnet.`,
            affectedId: sid,
            details: `Mitarbeitsdatensatz: ${JSON.stringify(app.mitarbeit[sid]).substring(0, 80)}...`,
            module: 'mitarbeit',
            fixable: true
          });
        }
      }
    });
  }

  // 6. Check for Orphaned Behavior (Verhalten / Warnkarten)
  if (app.verhalten) {
    Object.keys(app.verhalten).forEach(sid => {
      if (!studentIds.has(sid)) {
        issues.push({
          id: `orph-verhalten-${sid}`,
          type: 'orphaned_verhalten',
          severity: 'info',
          title: 'Verwaister Verhaltens-Status',
          description: `Es existiert ein Verhaltensampel/Zählerpunkt-Eintrag für Schüler-ID "${sid}", der gelöscht wurde.`,
          affectedId: sid,
          module: 'verhalten',
          fixable: true
        });
      }
    });
  }

  // 7. Check for Orphaned Seating Plan Entries
  if (app.sitzplan_schueler) {
    Object.keys(app.sitzplan_schueler).forEach(sid => {
      if (!studentIds.has(sid)) {
        issues.push({
          id: `orph-sitzplan-${sid}`,
          type: 'orphaned_sitzplan',
          severity: 'info',
          title: 'Veraltete Sitzplatz-Position',
          description: `Es sind Sitzplan-Koordinaten für einen gelöschten Schüler mit der ID "${sid}" reserviert.`,
          affectedId: sid,
          module: 'other',
          fixable: true
        });
      }
    });
  }

  // 8. Check for Orphaned Checklist Entries
  if (app.checklisten) {
    const affectedChecklists: string[] = [];
    app.checklisten.forEach(list => {
      if (list.eintraege) {
        Object.keys(list.eintraege).forEach(sid => {
          if (!studentIds.has(sid) && !affectedChecklists.includes(list.titel)) {
            affectedChecklists.push(list.titel);
          }
        });
      }
    });
    if (affectedChecklists.length > 0) {
      issues.push({
        id: `orph-checklisten-general`,
        type: 'orphaned_checklist',
        severity: 'info',
        title: 'Verwaiste Einträge in Checklisten',
        description: `Einige Checklisten (${affectedChecklists.join(', ')}) enthalten Statusdaten für nicht mehr existierende Schüler.`,
        affectedId: 'general',
        module: 'other',
        fixable: true
      });
    }
  }

  // 9. Check for Orphaned Cassier / Geldsammlungen entries
  if (app.klassenkasse && app.klassenkasse.sammlungen) {
    let affectedSammlungenCount = 0;
    app.klassenkasse.sammlungen.forEach(sammlung => {
      if (sammlung.status) {
        Object.keys(sammlung.status).forEach(sid => {
          if (!studentIds.has(sid)) {
            affectedSammlungenCount++;
          }
        });
      }
    });
    if (affectedSammlungenCount > 0) {
      issues.push({
        id: `orph-kasse-general`,
        type: 'orphaned_klassenkasse',
        severity: 'info',
        title: 'Verwaister Kassenkassen-Zahlungsstatus',
        description: `Es wurden veraltete Geldsammlungs-Zahlungsinformationen für Schüler gefunden, die nicht mehr in der Klasse sind.`,
        affectedId: 'general',
        module: 'other',
        fixable: true
      });
    }
  }

  // 10. Check for name spelling typos / similarities (typo_name_discrepancy)
  for (let i = 0; i < students.length; i++) {
    for (let j = i + 1; j < students.length; j++) {
      const s1 = students[i];
      const s2 = students[j];
      const name1 = `${s1.vorname} ${s1.nachname}`;
      const name2 = `${s2.vorname} ${s2.nachname}`;
      
      const clean1 = name1.toLowerCase().replace(/\s+/g, '');
      const clean2 = name2.toLowerCase().replace(/\s+/g, '');
      
      const dist = getLevenshteinDistance(clean1, clean2);
      // If names are highly similar but not exactly identical
      if (dist > 0 && dist <= 2 && Math.max(clean1.length, clean2.length) > 3) {
        issues.push({
          id: `typo-name-${s1.id}-${s2.id}`,
          type: 'typo_name_discrepancy',
          severity: 'warning',
          title: 'Möglicher Namens-Tippfehler',
          description: `Die Schüler "${name1}" (ID: ${s1.id}) und "${name2}" (ID: ${s2.id}) haben extrem ähnliche Schreibweisen. Liegt hier ein Tippfehler oder eine doppelte Registrierung vor?`,
          affectedId: s1.id,
          details: `Ähnlich zu: ${name2} (Korrekturvorschlag: Zusammenführen)`,
          module: 'schueler',
          fixable: true,
          suggestedAction: {
            type: 'merge',
            targetId: s2.id
          }
        });
      }
    }
  }

  // 11. Check for student name formatting issues (format_name_discrepancy) (e.g., incorrect capitalization or multiple spaces)
  students.forEach(s => {
    const rawVorname = s.vorname || '';
    const rawNachname = s.nachname || '';
    
    const formattedVorname = capitalizeName(rawVorname);
    const formattedNachname = capitalizeName(rawNachname);
    
    if (rawVorname !== formattedVorname || rawNachname !== formattedNachname) {
      const currentFull = `${rawVorname} ${rawNachname}`;
      const suggestedFull = `${formattedVorname} ${formattedNachname}`;
      issues.push({
        id: `format-name-${s.id}`,
        type: 'format_name_discrepancy',
        severity: 'info',
        title: 'Format-Abweichung im Schülernamen',
        description: `Der Name "${currentFull}" (ID: ${s.id}) weicht von der Standardschreibweise ab.`,
        affectedId: s.id,
        details: `Auto-Fix Vorschlag: "${suggestedFull}"`,
        module: 'schueler',
        fixable: true,
        suggestedAction: {
          type: 'rename',
          suggestedValue: suggestedFull
        }
      });
    }
  });

  return issues;
}

/**
 * Repairs a specific consistency issue by deleting it or migrating it to an active student's ID.
 */
export function resolveConsistencyIssue(
  app: AppState,
  issue: ConsistencyIssue,
  action: 'delete' | 'migrate' | 'rename',
  targetStudentId?: string
): AppState {
  const updated = { ...app };
  const targetId = targetStudentId || '';

  // Ensure deep copies of relevant fields to prevent mutations
  if (updated.noten) updated.noten = JSON.parse(JSON.stringify(updated.noten));
  if (updated.mitarbeit) updated.mitarbeit = JSON.parse(JSON.stringify(updated.mitarbeit));
  if (updated.verhalten) updated.verhalten = { ...updated.verhalten };
  if (updated.diagnostikErhebungen) updated.diagnostikErhebungen = [...updated.diagnostikErhebungen];
  if (updated.sitzplan_schueler) updated.sitzplan_schueler = { ...updated.sitzplan_schueler };
  if (updated.checklisten) updated.checklisten = JSON.parse(JSON.stringify(updated.checklisten));
  if (updated.klassenkasse && updated.klassenkasse.sammlungen) {
    updated.klassenkasse = {
      ...updated.klassenkasse,
      sammlungen: JSON.parse(JSON.stringify(updated.klassenkasse.sammlungen))
    };
  }

  const sourceId = issue.affectedId;

  if (action === 'delete') {
    // 1. Delete Grades
    if (updated.noten && updated.noten[sourceId]) {
      delete updated.noten[sourceId];
    }
    // 2. Delete Mitarbeit
    if (updated.mitarbeit && updated.mitarbeit[sourceId]) {
      delete updated.mitarbeit[sourceId];
    }
    // 3. Delete Verhalten
    if (updated.verhalten && updated.verhalten[sourceId] !== undefined) {
      delete updated.verhalten[sourceId];
    }
    // 4. Delete Diagnostics
    if (updated.diagnostikErhebungen) {
      updated.diagnostikErhebungen = updated.diagnostikErhebungen.filter(e => e.schuelerId !== sourceId);
    }
    // 5. Delete Seating Position
    if (updated.sitzplan_schueler && updated.sitzplan_schueler[sourceId]) {
      delete updated.sitzplan_schueler[sourceId];
    }
    // 6. Delete Checklist state
    if (updated.checklisten) {
      updated.checklisten.forEach(list => {
        if (list.eintraege && list.eintraege[sourceId]) {
          delete list.eintraege[sourceId];
        }
      });
    }
    // 7. Delete Cashier lists
    if (updated.klassenkasse && updated.klassenkasse.sammlungen) {
      updated.klassenkasse.sammlungen.forEach(s => {
        if (s.status && s.status[sourceId]) {
          delete s.status[sourceId];
        }
      });
    }
  } else if (action === 'migrate' && targetId) {
    // 1. Migrate Grades
    if (updated.noten && updated.noten[sourceId]) {
      const sourceGrades = updated.noten[sourceId];
      const targetGrades = updated.noten[targetId] || {};
      
      // Merge subject maps and semesters carefully
      Object.keys(sourceGrades).forEach(subject => {
        if (!targetGrades[subject]) {
          targetGrades[subject] = sourceGrades[subject];
        } else {
          // Merge semester records
          Object.keys(sourceGrades[subject]).forEach(semester => {
            if (!targetGrades[subject][semester]) {
              targetGrades[subject][semester] = sourceGrades[subject][semester];
            } else {
              // Shallow merge grade categories (sa, lzk, wp, etc.)
              targetGrades[subject][semester] = {
                ...targetGrades[subject][semester],
                ...sourceGrades[subject][semester]
              };
            }
          });
        }
      });
      updated.noten[targetId] = targetGrades;
      delete updated.noten[sourceId];
    }

    // 2. Migrate Mitarbeit
    if (updated.mitarbeit && updated.mitarbeit[sourceId]) {
      const sourceMitarbeit = updated.mitarbeit[sourceId];
      const targetMitarbeit = updated.mitarbeit[targetId] || {};
      updated.mitarbeit[targetId] = { ...targetMitarbeit, ...sourceMitarbeit };
      delete updated.mitarbeit[sourceId];
    }

    // 3. Migrate Verhalten
    if (updated.verhalten && updated.verhalten[sourceId] !== undefined) {
      updated.verhalten[targetId] = updated.verhalten[sourceId];
      delete updated.verhalten[sourceId];
    }

    // 4. Migrate Diagnostics
    if (updated.diagnostikErhebungen) {
      updated.diagnostikErhebungen = updated.diagnostikErhebungen.map(e => {
        if (e.schuelerId === sourceId) {
          return { ...e, schuelerId: targetId };
        }
        return e;
      });
    }

    // 5. Migrate Seating Position
    if (updated.sitzplan_schueler && updated.sitzplan_schueler[sourceId]) {
      updated.sitzplan_schueler[targetId] = updated.sitzplan_schueler[sourceId];
      delete updated.sitzplan_schueler[sourceId];
    }

    // 6. Migrate Checklists
    if (updated.checklisten) {
      updated.checklisten.forEach(list => {
        if (list.eintraege && list.eintraege[sourceId]) {
          list.eintraege[targetId] = { ...(list.eintraege[targetId] || {}), ...list.eintraege[sourceId] };
          delete list.eintraege[sourceId];
        }
      });
    }

    // 7. Migrate Cashier Payment status
    if (updated.klassenkasse && updated.klassenkasse.sammlungen) {
      updated.klassenkasse.sammlungen.forEach(s => {
        if (s.status && s.status[sourceId]) {
          s.status[targetId] = s.status[sourceId];
          delete s.status[sourceId];
        }
      });
    }

    // 8. Delete source student from the roster
    if (updated.schueler) {
      updated.schueler = updated.schueler.filter(s => s.id !== sourceId);
    }
    if (updated.classes) {
      updated.classes = updated.classes.map(c => {
        if (c.schueler) {
          return {
            ...c,
            schueler: c.schueler.filter((s: any) => s.id !== sourceId)
          };
        }
        return c;
      });
    }
  } else if (action === 'rename' && issue.suggestedAction?.suggestedValue) {
    const val = issue.suggestedAction.suggestedValue;
    const parts = val.split(' ');
    const vorname = parts[0] || '';
    const nachname = parts.slice(1).join(' ') || '';

    if (updated.schueler) {
      updated.schueler = updated.schueler.map(s => {
        if (s.id === sourceId) {
          return { ...s, vorname, nachname };
        }
        return s;
      });
    }

    if (updated.classes) {
      updated.classes = updated.classes.map(c => {
        if (c.schueler) {
          return {
            ...c,
            schueler: c.schueler.map((s: any) => {
              if (s.id === sourceId) {
                return { ...s, vorname, nachname };
              }
              return s;
            })
          };
        }
        return c;
      });
    }
  }

  return updated;
}

/**
 * Automagically runs cleanup across all active structures to fully resolve orphaned items
 */
export function autoCleanAllOrphanedData(app: AppState): AppState {
  let updated = { ...app };
  const studentIds = new Set((updated.schueler || []).map(s => s.id));

  // Clean grades (app.noten)
  if (updated.noten) {
    updated.noten = JSON.parse(JSON.stringify(updated.noten));
    Object.keys(updated.noten).forEach(sid => {
      if (!studentIds.has(sid)) delete updated.noten[sid];
    });
  }

  // Clean mitarbeit
  if (updated.mitarbeit) {
    updated.mitarbeit = JSON.parse(JSON.stringify(updated.mitarbeit));
    Object.keys(updated.mitarbeit).forEach(sid => {
      if (!studentIds.has(sid)) delete updated.mitarbeit[sid];
    });
  }

  // Clean verhalten
  if (updated.verhalten) {
    updated.verhalten = { ...updated.verhalten };
    Object.keys(updated.verhalten).forEach(sid => {
      if (!studentIds.has(sid)) delete updated.verhalten[sid];
    });
  }

  // Clean diagnostik
  if (updated.diagnostikErhebungen) {
    updated.diagnostikErhebungen = updated.diagnostikErhebungen.filter(e => e.schuelerId && studentIds.has(e.schuelerId));
  }

  // Clean sitzplan
  if (updated.sitzplan_schueler) {
    updated.sitzplan_schueler = { ...updated.sitzplan_schueler };
    Object.keys(updated.sitzplan_schueler).forEach(sid => {
      if (!studentIds.has(sid)) delete updated.sitzplan_schueler[sid];
    });
  }

  // Clean checklisten
  if (updated.checklisten) {
    updated.checklisten = JSON.parse(JSON.stringify(updated.checklisten));
    updated.checklisten.forEach(list => {
      if (list.eintraege) {
        Object.keys(list.eintraege).forEach(sid => {
          if (!studentIds.has(sid)) delete list.eintraege[sid];
        });
      }
    });
  }

  // Clean klassenkasse
  if (updated.klassenkasse && updated.klassenkasse.sammlungen) {
    updated.klassenkasse = {
      ...updated.klassenkasse,
      sammlungen: JSON.parse(JSON.stringify(updated.klassenkasse.sammlungen))
    };
    updated.klassenkasse.sammlungen.forEach(sammlung => {
      if (sammlung.status) {
        Object.keys(sammlung.status).forEach(sid => {
          if (!studentIds.has(sid)) delete sammlung.status[sid];
        });
      }
    });
  }

  return updated;
}
