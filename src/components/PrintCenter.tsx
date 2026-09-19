  function handleDownloadKlassenbuchPdf() {
    const weeks = getKbWeeksToRender();
    const teacherName = [app?.anrede, app?.vorname, app?.nachname]
      .filter(Boolean)
      .join(' ')
      || app?.lehrerName
      || app?.lehrerProfil?.name
      || '';

    const pdfWeeks = weeks.map((kw) => {
      const dates = kwToDates(kw);
      const dateRange = `${dates.monday.toLocaleDateString('de-AT')} – ${dates.friday.toLocaleDateString('de-AT')}`;
      const categories = compileKlassenbuchData(kw);

      if (!kbIncludeOccurrences) {
        // Hiding appointments may not erase lessons with an unknown subject.
        categories['Besondere Vorkommnisse'] = categories['Besondere Vorkommnisse']
          .filter(entry => !entry.includes(' · Termin: '));
      }

      return {
        kw,
        sw: dates.sw,
        dateRange,
        categories,
        absentees: getAbsenteesForWeek(kw),
        notes: kbCustomNotesValue.trim() || undefined,
      };
    });

    const safeClass = String(app?.klassenbezeichnung || 'Klasse')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Klasse';
    const rangeLabel = kbMode === 'single'
      ? `KW_${kbKW}`
      : kbMode === 'all'
        ? 'Gesamt'
        : `KW_${kbStartKW}_bis_${kbEndKW}`;

    downloadKlassenbuchPdf(
      `Klassio_Klassenbuch_${safeClass}_${rangeLabel}.pdf`,
      {
        className: app?.klassenbezeichnung || '',
        schoolYear: app?.schuljahr || '',
        teacherName,
        weeks: pdfWeeks,
        includeAbsentees: kbIncludeAbsentees,
        includeOccurrences: kbIncludeOccurrences,
        signatures: kbSignatures,
      },
    );
  }

  function renderSingleKlassenbuchPage(targetKW: number) {
    const pageKbData = compileKlassenbuchData(targetKW);
    const pageAbsenteesList = getAbsenteesForWeek(targetKW);
    const pageDates = kwToDates(targetKW);

    const monStr = `${pageDates.monday.getDate()}.${pageDates.monday.getMonth() + 1}.`;
    const friStr = `${pageDates.friday.getDate()}.${pageDates.friday.getMonth() + 1}.${pageDates.friday.getFullYear()}`;
    const kbHeaderDateStr = `(${monStr}-${friStr})`;

    const printableCategories = Object.entries(pageKbData).filter(([category]) =>
      kbIncludeOccurrences || category !== 'Besondere Vorkommnisse'
    );

    const classTeacherName = [app?.anrede, app?.vorname, app?.nachname]
      .filter(Boolean)
      .join(' ')
      || app?.lehrerName
      || app?.lehrerProfil?.name
      || '';

    return (
      <div className="space-y-2.5 print:space-y-2 font-sans">
        <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-1.5">
          <div>
            <p className="text-[0.5625rem] font-black uppercase tracking-[0.16em] text-slate-400">KLASSENBUCH</p>
            <p className="text-[0.8125rem] font-black leading-tight text-slate-900">
              {app?.klassenbezeichnung || 'Klasse'}
            </p>
          </div>
          <div className="text-right text-[0.5625rem] font-semibold leading-tight text-slate-500">
            {app?.schuljahr && <div>Schuljahr {app.schuljahr}</div>}
            {classTeacherName && <div>{classTeacherName}</div>}
          </div>
        </div>

        {/* A4-Wochenblatt */}
        <table className="w-full border-collapse border-2 border-slate-900 text-black">
          <thead>
            <tr>
              <th colSpan={2} className="bg-slate-900 border-b-2 border-slate-900 p-3 text-center text-[0.875rem] font-black tracking-wide text-white uppercase">
                {pageDates.sw}. Schulwoche {kbHeaderDateStr}
              </th>
            </tr>
            <tr className="bg-slate-100 border-b border-slate-400">
              <th className="w-[34%] border-r border-slate-400 px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider text-slate-600">
                Fach / Unterbereich
              </th>
              <th className="px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider text-slate-600">
                Unterricht / Inhalt
              </th>
            </tr>
          </thead>
          <tbody>
            {printableCategories.map(([category, entries]) => {
              const parsedCategory = splitKlassenbuchCategoryKey(category);
              return (
                <tr key={category} className="avoid-break border-b border-slate-300 last:border-b-0">
                  <td className="border-r border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-800">
                    <span className="block text-[0.65625rem] font-black leading-tight">
                      {parsedCategory.subject}
                    </span>
                    {parsedCategory.subarea && (
                      <span className="mt-0.5 block text-[0.5625rem] font-bold leading-tight text-slate-500">
                        {parsedCategory.subarea}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-[0.65625rem] font-semibold leading-snug text-slate-800 whitespace-pre-wrap">
                    {entries.length > 0 ? entries.join(' · ') : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Absences / Fehlstunden section */}
        {kbIncludeAbsentees && (
          <div className="space-y-1 pt-1.5 avoid-break">
            <h4 className="text-[0.71875rem] font-black uppercase tracking-wider text-zinc-500 border-b border-[#000000]/10 pb-0.5 flex items-center gap-1.5">
              <Clock size={12} className="text-zinc-500" />
              <span>Erfasste Fehlstunden & Abwesenheiten</span>
            </h4>
            {pageAbsenteesList.length > 0 ? (
              <div className="border border-zinc-300 bg-zinc-50 divide-y divide-zinc-200">
                {pageAbsenteesList.map((abs, idx) => (
                  <div key={idx} className="px-2.5 py-1 flex justify-between items-center gap-3 text-[0.625rem] font-semibold">
                    <span className="text-zinc-900 font-bold">{abs.name}</span>
                    <span className="text-zinc-600 text-right">{abs.info}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-[0.6875rem] leading-tight italic py-1 px-1">Keine Fehlstunden in dieser Woche erfasst.</p>
            )}
          </div>
        )}

        {/* Special Vorkommnisse text block */}
        {kbIncludeOccurrences && kbCustomNotesValue.trim() && (
          <div className="space-y-1 pt-1.5 avoid-break">
            <h4 className="text-[0.65625rem] font-black uppercase tracking-wider text-zinc-500 border-b border-[#000000]/10 pb-0.5">Pädagogische Zusatznotizen & Ereignisse</h4>
            <div className="border border-zinc-300 p-2 bg-zinc-50 text-[0.625rem] font-semibold text-zinc-700 whitespace-pre-wrap leading-snug">
              {kbCustomNotesValue}
            </div>
          </div>
        )}

        {/* Signatures sections */}
        {kbSignatures.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 avoid-break text-center">
            {kbSignatures.map(sigName => (
              <div key={sigName} className="space-y-1 inline-block">
                <div className="border-b border-black w-32 mx-auto pb-3"></div>
                <span className="text-[0.5625rem] uppercase font-black tracking-widest text-[#000000]/50">{sigName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 8. TEMPLATE PREVIEW RENDER SWITCHBOARDERS
  function renderPreviewTemplate() {
    switch (activeTemplate) {
      
      // A. SCHUELERLISTE
      case 'schuelerliste':
        return (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between items-baseline">
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || 'Schülerliste & Stammdaten'}</h3>
              <span className="text-[0.625rem] font-bold text-zinc-500">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung} • Gesamt: {processedStudentsList.length} Kinder</span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5pt] border-black text-left">
                  <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider w-10 text-zinc-600">Nr.</th>
                  <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-650">Name, Vorname</th>
                  {slShowBirthday && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-28">Geboren am</th>}
                  {slShowGender && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Geschl.</th>}
                  {slShowReligion && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-24">Rel.</th>}
                  {slShowLevel && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-20">Stufe</th>}
                  {slShowBesuchsjahr && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Besuchsj.</th>}
                  {slShowDaZ && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-16">DaZ</th>}
                  {slShowErstsprache && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Erstsprache</th>}
                  {slShowZweitsprache && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Zweitsprache</th>}
                  {slShowNationality && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Staatsb.</th>}
                  {slShowAddress && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Adresse</th>}
                  {slShowPhoneMother && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Tel. Mutter</th>}
                  {slShowPhoneFather && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Tel. Vater</th>}
                  {slShowEmailParents && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">E-Mail Eltern</th>}
                  {slShowSvNummer && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">SV-Nr.</th>}
                  {slShowIkmNummer && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">IKM-Nr.</th>}
                  {slShowGroups && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Gruppen</th>}
                  {slShowFehlstunden && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-28">Fehlstunden</th>}
                  {slShowNotes && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-left min-w-[12rem] max-w-[20rem]">
                      Besondere Hinweise
                    </th>
                  )}
                  {slShowAllergies && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-left min-w-[12rem] max-w-[20rem]">
                      Allergien & Unverträglichkeiten
                    </th>
                  )}
                  {slShowFotoFreigabe && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-center min-w-[10rem]">
                      Foto-Freigabe
                    </th>
                  )}
                  {slCustomCols.slice(0, slCustomColsCount).map((cn, ci) => (
                    <th key={ci} className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider border-l border-zinc-300 text-center text-zinc-500">{cn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedStudentsList.map((st, sidx) => {
                  const formatAddress = () => {
                    const parts = [
                      st.anschrift,
                      st.plz && st.ort ? `${st.plz} ${st.ort}` : st.plz || st.ort
                    ].filter(Boolean);
                    return parts.length > 0 ? parts.join(', ') : '—';
                  };

                  return (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                      <td className="py-2 px-2 font-bold text-zinc-400 text-[0.6875rem]">{sidx + 1}</td>
                      <td className="py-2 px-2 font-black text-black text-[0.71875rem] max-w-[12rem] text-wrap leading-tight break-words" title={`${st.nachname}, ${st.vorname}`}>{st.nachname}, {st.vorname}</td>
                      {slShowBirthday && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.geburtstag || st.geburtsdatum || '—'}</td>}
                      {slShowGender && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] uppercase">{st.geschlecht || '—'}</td>}
                      {slShowReligion && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.religion || 'o.B.'}</td>}
                      {slShowLevel && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{app?.stufe || st.besuchsjahr || '—'}. Schulj.</td>}
                      {slShowBesuchsjahr && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.besuchsjahr ? `${st.besuchsjahr}. BJ` : '—'}</td>}
                      {slShowDaZ && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.daz ? 'Ja' : 'Nein'}</td>}
                      {slShowErstsprache && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.erstsprache || '—'}</td>}
                      {slShowZweitsprache && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.zweitsprache || '—'}</td>}
                      {slShowNationality && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.staatsbuergerschaft || '—'}</td>}
                      {slShowAddress && <td className="py-2 px-2 font-semibold text-zinc-500 text-[0.65625rem] max-w-[14rem] text-wrap leading-tight break-words" title={formatAddress()}>{formatAddress()}</td>}
                      {slShowPhoneMother && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.telefon_mutter || '—'}>{st.telefon_mutter || '—'}</td>}
                      {slShowPhoneFather && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.telefon_vater || '—'}>{st.telefon_vater || '—'}</td>}
                      {slShowEmailParents && <td className="py-2 px-2 font-semibold text-zinc-500 text-[0.65625rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.email_eltern || '—'}>{st.email_eltern || '—'}</td>}
                      {slShowSvNummer && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.sv_nummer || '—'}</td>}
                      {slShowIkmNummer && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.ikmNummer || '—'}</td>}
                      {slShowGroups && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.gruppen?.join(', ') || '—'}>{st.gruppen?.join(', ') || '—'}</td>}
                      {slShowFehlstunden && (
                        <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">
                          {(() => {
                            const fs = getStudentFehlstunden(st.id);
                            return `${fs.total} Std. (${fs.excused} e / ${fs.unexcused} u)`;
                          })()}
                        </td>
                      )}
                      {slShowNotes && (
                        <td className="py-2 px-2 font-medium text-zinc-700 text-[0.6875rem] max-w-[20rem] text-wrap leading-tight break-words whitespace-pre-line" title={st.notiz || ''}>
                          {st.notiz && st.notiz.trim() ? (
                            <span>{st.notiz.trim()}</span>
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {slShowAllergies && (
                        <td className="py-2 px-2 font-medium text-zinc-700 text-[0.6875rem] max-w-[20rem] text-wrap leading-tight break-words whitespace-pre-line" title={st.allergien || ''}>
                          {st.allergien && st.allergien.trim() ? (
                            <span>{st.allergien.trim()}</span>
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {slShowFotoFreigabe && (
                        <td className="py-2 px-2 font-semibold text-center text-[0.6875rem] max-w-[12rem] text-wrap leading-tight break-words">
                          {st.fotoFreigabe === 'erlaubt' && (
                            <span className="text-emerald-700 font-bold">Foto: erlaubt</span>
                          )}
                          {st.fotoFreigabe === 'nur_homepage' && (
                            <span className="text-amber-800 font-bold">Foto: nur Schulhomepage</span>
                          )}
                          {st.fotoFreigabe === 'nicht_erlaubt' && (
                            <span className="text-rose-700 font-bold">Foto: nicht erlaubt</span>
                          )}
                          {!st.fotoFreigabe && (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {Array.from({ length: slCustomColsCount }).map((_, cidx) => (
                        <td key={cidx} className="border-l border-zinc-300 py-2 px-2"></td>
                      ))}
                    </tr>
                  );
                })}
                {processedStudentsList.length === 0 && (
                  <tr>
                    <td colSpan={25} className="py-8 text-center font-bold text-zinc-400">Keine Schülerergebnisse gemappt. Bitte fügen Sie Schüler hinzu.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      // B. CHECKLISTE
      case 'checkliste': {
        const abbreviateHeader = (title: string, maxLength: number = 10): string => {
          if (!title) return '';
          let t = title.trim();
          if (t.length <= maxLength) return t;

          const replacements: Record<string, string> = {
            'lernzielkontrolle': 'LZK',
            'schularbeit': 'SA',
            'wochenplan': 'WOPL',
            'hausübung': 'HÜ',
            'hausübungen': 'HÜ',
            'mitarbeit': 'MA',
            'mitarbeiter': 'MA',
            'mittelwert': 'Ø',
            'durchschnitt': 'Ø',
            'notenspiegel': 'Noten',
            'schwerpunkt': 'SP'
          };

          let lower = t.toLowerCase();
          for (const [key, value] of Object.entries(replacements)) {
            if (lower.includes(key)) {
              t = t.replace(new RegExp(key, 'gi'), value);
              lower = t.toLowerCase();
            }
          }

          if (t.length <= maxLength) return t;

          // Split words and abbreviate individual long words
          const words = t.split(' ');
          const shortenedWords = words.map(word => {
            if (word.length > 7 && !word.includes('.') && !word.match(/^\d/)) {
              return word.substring(0, 5) + '.';
            }
            return word;
          });

          const result = shortenedWords.join(' ');
          if (result.length > maxLength) {
            return result.substring(0, maxLength - 1) + '…';
          }
          return result;
        };

        let colsToRender: { id: string; title: string; type: string; idx?: number }[] = [];
        if (clSyncMode === 'notenmappe') {
          const cfg = getFachCfg(app, clSelectedSubject);
          const colCounts = app.notenMeta?.[clSelectedSubject]?.colCounts || { lzk: 4, wp: 4, obj: 4 };

          // Schularbeiten (SA)
          if (cfg.sa) {
            const saCount = cfg.saCount || 2;
            for (let i = 0; i < saCount; i++) {
              colsToRender.push({
                id: `sa-${i}`,
                title: `${getNotenLabel(app, clSelectedSubject, 'sa', 'SA')} ${i + 1}`,
                type: 'sa',
                idx: i
              });
            }
          }
          // Lernzielkontrollen (LZK)
          if (cfg.lzk) {
            const count = colCounts.lzk || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.lzk?.[i] || `${getNotenLabel(app, clSelectedSubject, 'lzk', 'LZK')} ${i + 1}`;
              colsToRender.push({
                id: `lzk-${i}`,
                title: label,
                type: 'lzk',
                idx: i
              });
            }
          }
          // Wochenplan (WP)
          if (cfg.wp) {
            const count = colCounts.wp || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.wp?.[i] || `${getNotenLabel(app, clSelectedSubject, 'wp', 'WOPL')} ${i + 1}`;
              colsToRender.push({
                id: `wp-${i}`,
                title: label,
                type: 'wp',
                idx: i
              });
            }
          }
          // Kunstobjekt / Werkstück (OBJ)
          if (cfg.obj) {
            const count = colCounts.obj || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.obj?.[i] || `${getNotenLabel(app, clSelectedSubject, 'obj', 'Objekt')} ${i + 1}`;
              colsToRender.push({
                id: `obj-${i}`,
                title: label,
                type: 'obj',
                idx: i
              });
            }
          }
          // Hausübungen Average/Punkte
          if (cfg.hue) {
            colsToRender.push({
              id: 'hue',
              title: getNotenLabel(app, clSelectedSubject, 'hue', 'HÜ'),
              type: 'hue'
            });
          }
          // Mitarbeit / Points
          if (cfg.g.mi > 0) {
            colsToRender.push({
              id: 'mi',
              title: getNotenLabel(app, clSelectedSubject, 'mi', 'Mitarbeit'),
              type: 'mi'
            });
          }
          // Computed Average Grade (Mittelwert)
          colsToRender.push({
            id: 'average',
            title: 'Ø Note',
            type: 'average'
          });
        } else {
          colsToRender = clCols.map(c => ({ id: c.id, title: c.title, type: 'blank' }));
        }

        const effectiveTitle = clSyncMode === 'notenmappe' 
          ? `Notenspiegel: ${clSelectedSubject}` 
          : clTitle;

        return (
          <div className="space-y-3 print:space-y-2.5">
            <div className="border-b-2 border-black pb-1.5 flex justify-between items-end">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || effectiveTitle}</h3>
                <p className="text-[0.59375rem] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 animate-fade-in">
                  Klassenliste {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • SJ {app?.schuljahr}
                </p>
              </div>
              <div className="flex gap-4 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 pb-1">
                <span>Datum: __________________</span>
              </div>
            </div>

            <div className="w-full ">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b-[1.5pt] border-black text-left font-semibold">
                    {clShowNumbers && <th className="py-2 px-1.5 text-[0.5625rem] font-black uppercase tracking-wider text-zinc-650 w-10 text-center">Nr.</th>}
                    <th className="py-2 px-2 text-[0.5625rem] font-black uppercase tracking-wider border-r-[1.5pt] border-black text-zinc-700 w-44">Name des Kindes</th>
                    {colsToRender.map((col) => (
                      <th key={col.id} title={col.title} className="py-2 px-1 text-[0.53125rem] md:text-[0.5625rem] font-black uppercase tracking-wider text-center border-r border-zinc-200 text-zinc-650 last:border-r-0 text-wrap leading-tight break-words">
                        {abbreviateHeader(col.title, 8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, i) => (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/20">
                      {clShowNumbers && <td className="py-1.5 px-1 font-bold text-zinc-400 text-center text-[0.65625rem]">{i + 1}</td>}
                      <td className="py-1.5 px-2 font-black text-zinc-850 border-r-[1.5pt] border-zinc-400 text-[0.6875rem] text-wrap leading-tight break-words" title={`${st.nachname} ${st.vorname}`}>{st.nachname} {st.vorname}</td>
                      {colsToRender.map(col => {
                        let val = '';
                        if (clSyncMode === 'notenmappe') {
                          const nd: any = app.noten?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0 };
                          if (col.type === 'sa' && col.idx !== undefined) {
                            val = String(nd.sa?.[col.idx] ?? '-');
                          } else if (col.type === 'lzk' && col.idx !== undefined) {
                            val = String(nd.lzk?.[col.idx] ?? '-');
                          } else if (col.type === 'wp' && col.idx !== undefined) {
                            val = String(nd.wp?.[col.idx] ?? '-');
                          } else if (col.type === 'obj' && col.idx !== undefined) {
                            val = String(nd.aufgaben?.[col.idx] ?? '-');
                          } else if (col.type === 'hue') {
                            val = String(nd.hue ?? 0);
                          } else if (col.type === 'mi') {
                            val = String(app.mitarbeit?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || 0);
                          } else if (col.type === 'average') {
                            const computed = berechne(app, st.id, clSelectedSubject, clSelectedSemester);
                            val = computed !== null ? computed.toFixed(1) : '-';
                          }
                        }
                        return (
                          <td key={col.id} className="border-r border-zinc-250 py-1.5 px-1 text-center last:border-r-0 text-[0.625rem] md:text-[0.65625rem]">
                            {clSyncMode === 'notenmappe' ? (
                              <span className={col.type === 'average' ? "font-black text-indigo-700 bg-indigo-50/70 px-1 py-0.5 rounded border border-indigo-200 text-[0.625rem]" : "font-bold text-zinc-800"}>
                                {val}
                              </span>
                            ) : (
                              <div className="w-3.5 h-3.5 mx-auto border border-zinc-300 rounded-sm"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* Average calculations row if enabled */}
                  {clShowAverageRow && (
                    <tr className="border-t-2 border-zinc-400 bg-zinc-50/80 font-black">
                      <td colSpan={clShowNumbers ? 2 : 1} className="py-2 px-2 border-r-[1.5pt] border-zinc-400 text-[0.5625rem] text-zinc-700 tracking-wide uppercase font-black font-semibold">
                        Ø-Durchschnitt / Erfüllt %
                      </td>
                      {colsToRender.map(col => {
                        let colAvgStr = '______';
                        if (clSyncMode === 'notenmappe') {
                          const vals: number[] = [];
                          students.forEach(st => {
                            const nd: any = app.noten?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0 };
                            if (col.type === 'sa' && col.idx !== undefined) {
                              const n = nd.sa?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'lzk' && col.idx !== undefined) {
                              const n = nd.lzk?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'wp' && col.idx !== undefined) {
                              const n = nd.wp?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'obj' && col.idx !== undefined) {
                              const n = nd.aufgaben?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'hue') {
                              const n = nd.hue;
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'mi') {
                              const n = app.mitarbeit?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'average') {
                              const n = berechne(app, st.id, clSelectedSubject, clSelectedSemester);
                              if (n !== null) vals.push(n);
                            }
                          });
                          if (vals.length > 0) {
                            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                            colAvgStr = mean.toFixed(2);
                          } else {
                            colAvgStr = '-';
                          }
                        }
                        return (
                          <td key={col.id} className="border-r border-zinc-250 py-2 px-1 text-center text-zinc-750 font-black last:border-r-0 text-[0.625rem]">
                            {colAvgStr}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // B2. ZEUGNIS NOTENLISTE
      case 'zeugnis_noten': {
        const titleText = znSemester === '1'
          ? 'Semester-Notenspiegel · 1. Semester'
          : 'Semester-Notenspiegel · 2. Semester';
        
        return (
          <div className="space-y-4 print:space-y-2.5">
            <div className="border-b-2 border-black pb-1.5 flex justify-between items-end">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || titleText}</h3>
                <p className="text-[0.59375rem] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Klassenliste {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • SJ {app?.schuljahr} • Semester: {znSemester}. Halbjahr
                </p>
              </div>
              <div className="flex gap-4 text-[0.625rem] font-black uppercase tracking-wider text-zinc-550 pb-1 no-print">
                <span className="text-amber-600 font-extrabold">⚠️ Orange umrandet = Manuell überschrieben</span>
                <span className="text-emerald-600 font-extrabold">✓ Grün umrandet = Berechnet (Live-Sync)</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b-[1.5pt] border-black text-left font-semibold bg-zinc-50/50">
                    {clShowNumbers && (
                      <th className="py-2 px-1 text-[0.5625rem] font-black uppercase tracking-wider text-zinc-650 w-8 text-center">
                        Nr.
                      </th>
                    )}
                    <th className="py-2 px-2 text-[0.5625rem] font-black uppercase tracking-wider border-r-[1.5pt] border-black text-zinc-700 w-44">
                      Schüler:in
                    </th>
                    {znSelectedSubjects.map(f => {
                      const isFachActive = !app.faecher || app.faecher.includes(f);
                      return (
                        <th 
                          key={f} 
                          className={`py-2 px-1 text-[0.53125rem] font-black uppercase tracking-wider text-center border-r border-zinc-200 text-zinc-650 text-wrap leading-tight break-words`}
                        >
                          <div>{f}</div>
                          {!isFachActive && (
                            <div className="text-[0.4375rem] lowercase text-zinc-400 font-bold no-print tracking-normal">inaktiv</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, sidx) => (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/20">
                      {clShowNumbers && (
                        <td className="py-1 px-1 font-bold text-zinc-400 text-center text-[0.65625rem]">
                          {sidx + 1}
                        </td>
                      )}
                      <td 
                        className="py-1 px-2 font-black text-zinc-850 border-r-[1.5pt] border-zinc-400 text-[0.6875rem] text-wrap leading-tight break-words"
                        title={`${st.nachname} ${st.vorname}`}
                      >
                        {st.nachname} {st.vorname}
                      </td>
                      {znSelectedSubjects.map(f => {
                        const isFachActive = !app.faecher || app.faecher.includes(f);
                        const nd: any = app.noten?.[st.id]?.[f]?.[znSemester] || {};
                        const mode = getAssessmentMode(app, f);
                        const manualGrade = nd.endnote || '';
                        const calculatedNum = isFachActive ? berechne(app, st.id, f, znSemester) : null;
                        const hasManual = mode === 'grades' && !!nd.endnote;
                        const displayValue = mode === 'grades'
                          ? (hasManual ? String(manualGrade) : calculatedNum !== null ? Number(calculatedNum).toFixed(1) : '')
                          : calculatedNum !== null
                            ? `${Math.round(Number(calculatedNum))}%`
                            : '';

                        return (
                          <td
                            key={f}
                            className="border-r border-zinc-200 py-1 px-1 text-center last:border-r-0 text-[0.625rem]"
                          >
                            <div className="flex items-center justify-center">
                              {mode === 'grades' ? (
                                <>
                                  <select
                                    value={hasManual ? String(manualGrade) : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setApp(prev => {
                                        const currentNoten = prev.noten || {};
                                        const sidData = currentNoten[st.id] || {};
                                        const fachData = sidData[f] || {};
                                        const semData = fachData[znSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };

                                        return {
                                          ...prev,
                                          noten: {
                                            ...currentNoten,
                                            [st.id]: {
                                              ...sidData,
                                              [f]: {
                                                ...fachData,
                                                [znSemester]: {
                                                  ...semData,
                                                  endnote: val
                                                }
                                              }
                                            }
                                          }
                                        };
                                      });
                                    }}
                                    className={`no-print w-full max-w-[50px] bg-white border rounded-lg py-0.5 px-0.5 text-center font-bold text-[0.6875rem] outline-none transition-all cursor-pointer ${
                                      hasManual
                                        ? 'border-amber-400 text-amber-700 bg-amber-50/20 focus:ring-1 focus:ring-amber-400'
                                        : calculatedNum !== null
                                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-400'
                                          : 'border-slate-200 text-slate-400 hover:border-slate-300 focus:ring-1 focus:ring-slate-300'
                                    }`}
                                  >
                                    <option value="">–</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                    <option value="SPF">SPF</option>
                                    <option value="ESPF">ESPF</option>
                                  </select>
                                  <span className="hidden print:inline font-bold text-zinc-900 text-[0.7125rem]">
                                    {displayValue || '—'}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-zinc-700 text-[0.6875rem]">
                                  {displayValue || '—'}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-dashed border-zinc-200 flex justify-between items-center text-[0.5625rem] text-zinc-400 font-bold uppercase tracking-wider">
              <span>* SPF/ESPF = Sonderpädagogischer Förderbedarf / Erhöhter sonderpädagogischer Förderbedarf</span>
              <span>Druckdatum: {new Date().toLocaleDateString('de-AT')} • Erstellt mit Klassio</span>
            </div>
          </div>
        );
      }

      // C. WOCHENPLAN
      case 'wochenplan':
        const daysWp = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        const subInfoList = [1, 2, 3, 4, 5, 6, 7, 8];
        const lessonsData = (app?.wochenplanung || {})[wpKW] || {};

        return (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between items-baseline">
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || `Unterrichts-Wochenplan`}</h3>
              <span className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest bg-zinc-150 px-2 py-0.5 rounded">
                KW {wpKW} • SW {selectedWpDates.sw} ({selectedWpDates.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {selectedWpDates.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
              </span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5pt] border-black bg-zinc-50">
                  <th className="py-3 px-2 text-center text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 w-16">Std.</th>
                  {daysWp.map(d => (
                    <th key={d} className="py-3 px-2 text-left text-[0.6875rem] font-black uppercase tracking-wider border-l border-zinc-300 text-black">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subInfoList.map(h => {
                  return (
                    <tr key={h} className="border-b border-zinc-200 min-h-[50px]">
                      {/* Hour cell */}
                      <td className="py-3 px-2 text-center border-r-[1.5pt] border-black bg-zinc-50/50">
                        <div className="font-black text-black">{h}.</div>
                        {wpShowTimes && app?.stundenZeiten?.[h] && (
                          <div className="text-[0.5rem] font-bold text-zinc-400 mt-1">{app.stundenZeiten[h]}</div>
                        )}
                      </td>

                      {/* Content cells */}
                      {daysWp.map(d => {
                        const cellItem = lessonsData[d]?.[h - 1];
                        // Fallback to stammplan if empty
                        const stammplanFach = app?.stammplan?.[d]?.[h];
                        
                        let displayFach = cellItem?.fach || stammplanFach || '';
                        let displayThema = cellItem?.thema || '';

                        const isExcludedEvent = (cellItem && (
                          cellItem.type === 'sa' || 
                          cellItem.type === 'test' || 
                          cellItem.type === 'lzk' || 
                          cellItem.type === 'event' || 
                          cellItem.type === 'spielefest' || 
                          cellItem.type === 'konferenz' || 
                          cellItem.type === 'gespraech' || 
                          cellItem.type === 'sonstiges'
                        )) || /^sachunterricht$|^su$/i.test(displayFach);

                        if (isExcludedEvent) {
                          displayFach = '';
                          displayThema = '';
                        }
                        
                        const isEmpty = !displayFach && !displayThema;

                        return (
                          <td 
                            key={d} 
                            className={`p-2.5 border-l border-zinc-300 align-top text-left w-1/5 ${
                              isEmpty && !wpInkSaver ? 'bg-zinc-50/30' : ''
                            }`}
                          >
                            {displayFach && (
                              <div className="font-black text-black leading-tight mb-1 text-[0.71875rem]">
                                {displayFach}
                              </div>
                            )}
                            {!wpShowSubjectOnly && displayThema && (
                              <div className="font-semibold text-zinc-600 text-[0.65625rem] leading-snug">
                                {displayThema}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Custom Notes handwriting block if enabled */}
            {wpShowEmptyNotesBox && (
              <div className="border border-zinc-450 p-4 rounded-2xl space-y-2 mt-4 avoid-break h-24">
                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-zinc-400 block pb-1 border-b border-zinc-200">Wochenkommentare & Hausübungsnotizen des Klassenlehrers:</span>
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="border-r border-zinc-350 pr-4"></div>
                  <div></div>
                </div>
              </div>
            )}
          </div>
        );

      // D. KLASSENBUCH WOCHENBERICHT
      case 'klassenbuch': {
        const weeks = getKbWeeksToRender();
        return (
          <div className="space-y-12">
            {weeks.map((kw, idx) => (
              <div key={kw} className={idx > 0 ? "page-break pt-8" : ""}>
                {renderSingleKlassenbuchPage(kw)}
              </div>
            ))}
          </div>
        );
      }

      // E. JAHRESPLANUNG
      case 'jahresplanung': {
        const jahresplanValues = app?.jahresplanung || {};
        const yearlySubjects = sortYearlySubjects(app?.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);
        const subjectsCols = jpSubjectFilter === 'all'
          ? yearlySubjects
          : yearlySubjects.filter(sub => sub.id === jpSubjectFilter || sub.label === jpSubjectFilter);

        // Generate actual sequence of school weeks (similar to YearlyPlan.tsx)
        const startYearVal = getStartYear(app?.schuljahr);
        const startKW = getSchulstartKW(app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
        const endYear = startYearVal + 1;
        const startMonday = kwToMonday(startKW, startYearVal);
        const weeksList: Array<{ sw: number, kw: number, year: number, monday: Date }> = [];
        let currentMonday = new Date(startMonday);
        let swIndex = 1;
        while (currentMonday.getFullYear() < endYear || (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)) {
          const kw = getKW(currentMonday);
          const thursday = new Date(currentMonday);
          thursday.setDate(thursday.getDate() + 3);
          const isoYear = thursday.getFullYear();
          weeksList.push({ sw: swIndex, kw: kw, year: isoYear, monday: new Date(currentMonday) });
          currentMonday.setDate(currentMonday.getDate() + 7);
          swIndex++;
        }

        const getPayload = (planData: any, subId: string, subLabel: string) => {
          if (!planData) return null;
          let cell = planData[subId];
          if (!cell) {
            const keys = Object.keys(planData);
            const foundKey = keys.find(k => 
              k.toLowerCase() === subId.toLowerCase() || 
              k.toLowerCase() === subLabel.toLowerCase()
            );
            if (foundKey) {
              cell = planData[foundKey];
            }
          }
          if (!cell) return null;
          if (typeof cell === 'string') {
            return { thema: cell, buch: '', type: 'standard', items: [] };
          }
          return {
            thema: cell.thema || '',
            buch: cell.buch || '',
            type: cell.type || 'standard',
            items: cell.items || []
          };
        };

        // Calculate progress/coverage statistics for each subject in subjectsCols
        const subjectProgressMap = new Map<string, number>();
        subjectsCols.forEach(s => {
          let plannedCount = 0;
          let totalTeachingWeeks = 0;
          weeksList.forEach(w => {
            const holiday = isHoliday(w.monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
            if (!isSevereHoliday) {
              totalTeachingWeeks++;
              const val = getPayload(jahresplanValues[w.kw], s.id, s.label);
              if (val && (val.thema || val.items?.length > 0)) {
                plannedCount++;
              }
            }
          });
          const progress = totalTeachingWeeks === 0 ? 0 : Math.round((plannedCount / totalTeachingWeeks) * 100);
          subjectProgressMap.set(s.id, progress);
        });

        const renderMatrixRows = () => {
          let lastMonth = '';
          const rows: React.ReactNode[] = [];

          weeksList.forEach(({ sw, kw, year, monday }) => {
            const planDataForKw = jahresplanValues[kw] || {};
            const holidayInfo = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holidayInfo && (holidayInfo.includes('ferien') || holidayInfo.includes('Schluss') || holidayInfo.includes('Beginn'));
            const monthName = monday.toLocaleDateString('de-DE', { month: 'long' });

            // If we hide holidays and it's a severe holiday, skip rendering
            if (!jpShowHolidays && isSevereHoliday) {
              return;
            }

            if (jpGroupByMonth && monthName !== lastMonth) {
              lastMonth = monthName;
              rows.push(
                <tr key={`month-sep-${kw}`} className="bg-slate-100 text-left font-black text-slate-800 tracking-wider text-[0.5625rem] uppercase avoid-break print:bg-slate-100">
                  <td colSpan={subjectsCols.length + 1} className="py-1.5 px-2 border border-zinc-300 font-extrabold text-slate-800">
                    📅 {monthName}
                  </td>
                </tr>
              );
            }

            if (holidayInfo) {
              rows.push(
                <tr key={`holiday-${kw}`} className="bg-zinc-50 border-b border-zinc-200 align-middle avoid-break select-none opacity-75">
                  <td className="py-1 px-1 border border-zinc-300 bg-zinc-100/30 text-center select-none font-bold min-w-[70px]">
                    <span className="font-extrabold text-black text-[0.5625rem]">KW {kw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block font-bold leading-none mt-0.5">SW {sw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block leading-none mt-0.5">
                      {monday.getDate()}.${monday.getMonth() + 1}.
                    </span>
                  </td>
                  <td colSpan={subjectsCols.length} className="py-1.5 px-2 bg-zinc-50 border border-zinc-300 text-center font-bold text-slate-500 italic text-[0.5625rem] uppercase tracking-wider">
                    🏝️ {holidayInfo}
                  </td>
                </tr>
              );
            } else {
              // Gather Termin-Pins from cellData types (if jpShowPins is active)
              const weekExams = Object.entries(planDataForKw).filter(([subId, cellData]: any) => cellData?.type && cellData.type !== 'standard');

              rows.push(
                <tr key={kw} className="border-b border-zinc-200 even:bg-zinc-50/10 align-top avoid-break">
                  <td className="py-1 px-1 border border-zinc-300 bg-zinc-50/60 text-center select-none min-w-[70px]">
                    <span className="font-extrabold text-black text-[0.5625rem]">KW {kw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block font-bold leading-none mt-0.5">SW {sw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block leading-none mt-0.5 font-medium">
                      {monday.getDate()}.${monday.getMonth() + 1}.
                    </span>

                    {/* Termin-Pins */}
                    {jpShowPins && weekExams.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5 items-center max-w-[65px] mx-auto">
                        {weekExams.map(([subId, cellData]: any, idx) => (
                          <div 
                            key={idx} 
                            className={`text-[0.45rem] font-black px-1 py-0.5 rounded leading-none border flex items-center gap-0.5 ${
                              cellData.type === 'sa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                              cellData.type === 'test' || cellData.type === 'lzk' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                            title={`${cellData.type === 'sa' ? 'Schularbeit' : cellData.type === 'test' ? 'Test/LZK' : 'Schul-Termin'}: ${cellData.thema}`}
                          >
                            <span>📌</span>
                            <span>{cellData.type === 'sa' ? 'SA' : cellData.type === 'test' ? 'T' : 'FIX'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {subjectsCols.map(sub => {
                    const content = getPayload(planDataForKw, sub.id, sub.label);
                    return (
                      <td key={sub.id} className="py-1 px-1.5 border border-zinc-300 whitespace-pre-wrap leading-tight">
                        {content && (content.thema || (content.items && content.items.length > 0)) ? (
                          <div className="space-y-1">
                            {content.items && content.items.length > 0 ? (
                              <div className="space-y-1.5">
                                {content.items.map((it: any) => (
                                  <div key={it.id} className="leading-tight border-b border-stone-100 last:border-0 pb-1 last:pb-0">
                                    {it.subCategory && (
                                      <span className="text-[0.45rem] font-black uppercase text-blue-600 block mb-0.5">{it.subCategory.replace('Deutsch ', '')}</span>
                                    )}
                                    <div className="text-[0.5625rem] font-bold text-zinc-900 leading-tight">
                                      {it.thema}
                                    </div>
                                    {it.buch && (
                                      <span className="text-[0.5rem] text-stone-500 italic">📖 {it.buch}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div className="text-[0.5625rem] font-bold text-zinc-900 leading-tight">
                                  {content.thema}
                                </div>
                                {content.buch && (
                                  <div className="text-[0.5rem] font-medium text-indigo-700 leading-tight">
                                    📖 {content.buch}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-300/30 text-[0.5rem] select-none">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            }
          });
          return rows;
        };

        const renderListRows = () => {
          let lastMonth = '';
          const itemsArr: React.ReactNode[] = [];

          weeksList.forEach(({ sw, kw, year, monday }) => {
            const pl = jahresplanValues[kw] || {};
            const holidayInfo = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holidayInfo && (holidayInfo.includes('ferien') || holidayInfo.includes('Schluss') || holidayInfo.includes('Beginn'));
            const monthName = monday.toLocaleDateString('de-DE', { month: 'long' });

            if (!jpShowHolidays && isSevereHoliday) {
              return;
            }

            const hasAnyContent = subjectsCols.some(sub => {
              const c = getPayload(pl, sub.id, sub.label);
              return c && (c.thema || (c.items && c.items.length > 0));
            });

            if (!hasAnyContent && !holidayInfo) return;

            if (jpGroupByMonth && monthName !== lastMonth) {
              lastMonth = monthName;
              itemsArr.push(
                <div key={`month-header-${kw}`} className="py-1 px-2.5 bg-slate-100 rounded-lg text-[0.5625rem] font-black uppercase text-indigo-950 tracking-wider avoid-break border-l-4 border-indigo-500 mt-3 first:mt-0">
                  📅 {monthName}
                </div>
              );
            }

            if (holidayInfo) {
              itemsArr.push(
                <div key={`holiday-item-${kw}`} className="py-1.5 border-b border-zinc-200 flex gap-4 text-[0.5625rem] avoid-break text-zinc-400 select-none items-center">
                  <div className="w-24 shrink-0 font-extrabold text-black">
                    KW {kw} <span className="text-[0.46875rem] text-zinc-400 font-bold block">SW {sw} ({monday.getDate()}.${monday.getMonth() + 1}.)</span>
                  </div>
                  <div className="flex-1 font-bold italic uppercase tracking-wider text-emerald-800 text-[0.5625rem]">
                    🏝️ {holidayInfo}
                  </div>
                </div>
              );
            } else {
              // Gather Termin-Pins
              const weekExams = Object.entries(pl).filter(([subId, cellData]: any) => cellData?.type && cellData.type !== 'standard');

              itemsArr.push(
                <div key={kw} className="py-1.5 border-b border-zinc-150 flex gap-4 text-[0.59375rem] avoid-break items-start">
                  <div className="w-24 shrink-0 font-extrabold text-black mt-0.5">
                    KW {kw} <span className="text-[0.46875rem] text-zinc-400 font-bold block">SW {sw} ({monday.getDate()}.${monday.getMonth() + 1}.)</span>
                    
                    {/* Termin-Pins list style */}
                    {jpShowPins && weekExams.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5 max-w-[80px]">
                        {weekExams.map(([subId, cellData]: any, idx) => (
                          <span 
                            key={idx} 
                            className={`text-[0.45rem] font-black px-1 py-0.5 rounded leading-none border flex items-center gap-0.5 ${
                              cellData.type === 'sa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                              cellData.type === 'test' || cellData.type === 'lzk' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            <span>📌</span> {cellData.type === 'sa' ? 'SA' : cellData.type === 'test' ? 'T' : 'FIX'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {subjectsCols.map(sub => {
                      const content = getPayload(pl, sub.id, sub.label);
                      if (!content || (!content.thema && (!content.items || content.items.length === 0))) return null;
                      return (
                        <div key={sub.id} className="text-[0.5625rem] border-l-2 pl-1.5" style={{ borderColor: sub.color || '#CBD5E1' }}>
                          <span className="font-extrabold text-zinc-400 text-[0.46875rem] uppercase block leading-none mb-0.5">{sub.label}</span>
                          
                          {content.items && content.items.length > 0 ? (
                            <div className="space-y-1">
                              {content.items.map((it: any) => (
                                <div key={it.id} className="leading-tight border-b border-stone-100 last:border-0 pb-0.5 last:pb-0">
                                  {it.subCategory && (
                                    <span className="text-[0.45rem] text-blue-600 font-bold block">{it.subCategory.replace('Deutsch ', '')}</span>
                                  )}
                                  <span className="font-bold text-zinc-800">{it.thema}</span>
                                  {it.buch && <span className="text-[0.46875rem] text-zinc-500 italic block">📖 {it.buch}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-zinc-800 leading-tight">{content.thema}</span>
                              {content.buch && <span className="text-[0.46875rem] text-zinc-500 block leading-tight mt-0.5">📖 {content.buch}</span>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          });
          return itemsArr;
        };

        const renderBentoGrid = () => {
          const MONATE = [
            { name: 'September', num: 8 },
            { name: 'Oktober', num: 9 },
            { name: 'November', num: 10 },
            { name: 'Dezember', num: 11 },
            { name: 'Jänner', num: 0 },
            { name: 'Februar', num: 1 },
            { name: 'März', num: 2 },
            { name: 'April', num: 3 },
            { name: 'Mai', num: 4 },
            { name: 'Juni', num: 5 },
            { name: 'Juli', num: 6 },
          ];

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {MONATE.map(m => {
                const monthWeeks = weeksList.filter(({ kw, year, monday }) => {
                  return monday.getMonth() === m.num;
                });
                if (monthWeeks.length === 0) return null;

                const items: Array<{
                  type: 'holiday' | 'sa' | 'test' | 'lzk' | 'event' | 'spielefest' | 'konferenz' | 'gespraech' | 'sonstiges' | 'standard';
                  label: string;
                  details?: string;
                  subjectLabel?: string;
                  colorClass?: string;
                  kw: number;
                  sw: number;
                }> = [];

                monthWeeks.forEach(({ sw, kw, year, monday }) => {
                  const holiday = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
                  const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
                  
                  if (holiday) {
                    if (jpShowHolidays) {
                      if (!items.some(it => it.type === 'holiday' && it.label === holiday)) {
                        items.push({
                          type: 'holiday',
                          label: holiday,
                          kw,
                          sw
                        });
                      }
                    }
                    if (isSevereHoliday) {
                      return; // skip planning items on severe holidays
                    }
                  }

                  const plannedWeek = jahresplanValues[kw] || {};
                  subjectsCols.forEach(s => {
                    const data = getPayload(plannedWeek, s.id, s.label);
                    if (data && (data.thema || (data.items && data.items.length > 0))) {
                      if (data.items && data.items.length > 0) {
                        data.items.forEach((it: any) => {
                          items.push({
                            type: (it.type as any) || 'standard',
                            label: it.thema,
                            details: it.buch,
                            subjectLabel: s.label,
                            colorClass: s.color,
                            kw,
                            sw
                          });
                        });
                      } else {
                        items.push({
                          type: (data.type as any) || 'standard',
                          label: data.thema,
                          details: data.buch,
                          subjectLabel: s.label,
                          colorClass: s.color,
                          kw,
                          sw
                        });
                      }
                    }
                  });
                });

                return (
                  <div key={m.name} className="bg-white border border-zinc-300 rounded-2xl p-4 shadow-sm flex flex-col min-h-[220px] avoid-break">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-3 shrink-0">
                      <span className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        📅 {m.name}
                      </span>
                      <span className="text-[0.5625rem] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
                        SW {monthWeeks[0]?.sw || 0} - {monthWeeks[monthWeeks.length - 1]?.sw || 0}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-stone-400 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                        <span className="text-[0.5625rem] font-black uppercase tracking-wider text-stone-400">Keine Themen geplant</span>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
                        {items.map((item, idx) => {
                          const isHolidayType = item.type === 'holiday';
                          const isSA = item.type === 'sa';
                          const isTest = item.type === 'test' || item.type === 'lzk';

                          let badgeColor = 'bg-stone-50 text-stone-850 border-zinc-200';
                          if (isHolidayType) badgeColor = 'bg-emerald-50 text-emerald-850 font-bold border-emerald-100';
                          else if (isSA) badgeColor = 'bg-rose-50 border-rose-200 text-rose-850 font-bold';
                          else if (isTest) badgeColor = 'bg-amber-50 border-amber-200 text-amber-850 font-bold';

                          return (
                            <div key={idx} className={`p-2 rounded-xl border text-[0.625rem] shadow-3xs flex flex-col gap-0.5 ${badgeColor}`}>
                              <div className="flex items-start justify-between gap-2 leading-none">
                                <span className="font-black text-[0.45rem] uppercase tracking-wider bg-white/60 px-1 rounded border border-black/5 shrink-0">
                                  SW {item.sw} / KW {item.kw}
                                </span>
                                {item.subjectLabel && (
                                  <span className="text-[0.5rem] font-black uppercase tracking-wider text-right opacity-85 shrink-0">
                                    {item.subjectLabel}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold leading-tight mt-0.5">
                                {item.label}
                              </div>
                              {item.details && (
                                <div className="text-[0.5rem] opacity-75 italic mt-0.5">
                                  📖 {item.details}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="space-y-4 text-slate-800">
            <div className="border-b border-zinc-400 pb-1 flex justify-between items-baseline avoid-break">
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-wider text-zinc-900">{customHeaderTitle || `Jahres-Curriculumsplanung`}</h3>
              <span className="text-[0.5625rem] font-bold text-zinc-500 uppercase">
                Schuljahr {app?.schuljahr} • {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • LP: {app?.nachname || ''}
              </span>
            </div>

            {jpDisplayMode === 'matrix' ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse table-fixed min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-400 bg-zinc-50 text-left avoid-break">
                      <th className="py-1.5 px-1 border border-zinc-300 text-[0.53125rem] font-black uppercase tracking-wider text-zinc-650 w-[75px]">KW / SW</th>
                      {subjectsCols.map(sub => {
                        const progress = subjectProgressMap.get(sub.id) || 0;
                        return (
                          <th key={sub.id} className="py-1.5 px-1.5 border border-zinc-300 text-[0.53125rem] font-black uppercase tracking-wider text-zinc-650">
                            <div>{sub.label}</div>
                            {/* Fachbezogener Fortschritts- & Abdeckungsbalken */}
                            {jpShowProgressBars && (
                              <div className="mt-1 max-w-[100px]">
                                <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden flex border border-zinc-300/30">
                                  <div className="bg-emerald-600 h-full" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="text-[0.45rem] font-bold text-zinc-400 mt-0.5 uppercase tracking-wide">
                                  Abdeckung {progress}%
                                </div>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {renderMatrixRows()}
                  </tbody>
                </table>
              </div>
            ) : jpDisplayMode === 'bento' ? (
              <div className="space-y-2">
                <span className="text-[0.5625rem] font-extrabold text-zinc-400 uppercase tracking-wider pb-0.5 border-b border-zinc-200 block">Monatliches bento-curriculum</span>
                {renderBentoGrid()}
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[0.5625rem] font-extrabold text-zinc-400 uppercase tracking-wider pb-0.5 border-b border-zinc-200 block">Chronologisches Syllabusverzeichnis</span>
                <div className="space-y-1">
                  {renderListRows()}
                </div>
              </div>
            )}
          </div>
        );
      }

      // F. KEL PORTFOLIO DOSSIER (Single mode)
      case 'kel':
        const defaultStudent = students.find(s => s.id === kelSelectedStudentId) || students[0];
        if (!defaultStudent) {
          return (
            <div className="py-12 text-center text-zinc-400 font-bold">
              Keine Schüler erfasst. Tragen Sie Schüler in Ihre Schülerverwaltung ein, um das KEL-Dossier zu nutzen.
            </div>
          );
        }
        return renderSingleKelPortfolio(defaultStudent);

      // G. STUNDENPLAN
      case 'stundenplan':
        const daysAll = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        const hoursList = [1, 2, 3, 4, 5, 6, 7, 8];

        return (
          <div className="space-y-4">
            <div className="border-b-[2pt] border-black pb-2 text-center">
              <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest text-[#000000]">{customHeaderTitle || 'Klassen-Stundenplan'}</h3>
              <p className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest mt-1 animate-fade-in">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • Schuljahr: {app?.schuljahr}</p>
            </div>

            <table className="w-full border-collapse text-center table-fixed h-auto">
              <thead>
                <tr className="border-b-[2pt] border-black bg-zinc-50">
                  <th className="py-2.5 px-1 text-[0.6875rem] font-black uppercase tracking-wider text-zinc-650 w-20">Std.</th>
                  {daysAll.map(d => (
                    <th key={d} className="py-2.5 px-1 text-[0.75rem] font-black uppercase tracking-widest text-black border-l border-zinc-250">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hoursList.map(h => {
                  return (
                    <tr key={h} className="border-b border-zinc-200">
                      {/* Hour heading */}
                      <td className="py-2.5 px-1 bg-zinc-50/50 border-r-[1.5pt] border-black">
                        <div className="text-[0.71875rem] font-black text-black leading-tight">{h}. Std.</div>
                        {spShowTimes && app?.stundenZeiten?.[h] && (
                          <div className="text-[0.53125rem] font-bold text-zinc-450 mt-0.5 leading-none">{app.stundenZeiten[h]}</div>
                        )}
                      </td>

                      {/* Monday - Friday lessons */}
                      {daysAll.map(d => {
                        const fachName = app?.stammplan?.[d]?.[h];
                        
                        return (
                          <td key={d} className="py-2 px-1 border-l border-zinc-250 align-middle">
                            {fachName ? (
                              <div className="space-y-0.5">
                                <span className="text-[0.71875rem] font-black text-black leading-none block break-words">{fachName}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-300 font-bold italic text-[0.59375rem]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'eltern_diagnostik': {
        const targetSt = students.find(s => s.id === diagSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleElternDiagnostik(targetSt);
      }

      case 'schuelerprofil': {
        const targetSt = students.find(s => s.id === profSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleStudentProfile(targetSt);
      }

      case 'kel_presentation': {
        const targetSt = students.find(s => s.id === kpSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleKelPresentation(targetSt);
      }

      case 'sitzplan':
        return renderSeatingPlanView();

      case 'uebergabemappe':
        return renderUebergabemappeView();

      case 'pdf_export':
        return renderPdfExportView();

      case 'lob_druckkarte':
        return renderLobDruckkarteView();

      case 'fehlstunden':
        return renderFehlstundenView();

      case 'kassenuebersicht':
        return renderKassenuebersichtView();

      case 'smart_tools':
        return renderSmartToolsView();

      default:
        return null;
    }
  }

  function getStudentFehlstundenBySemester(studentId: string) {
    const attendanceData = app?.anwesenheit?.[studentId] || {};
    let excusedSem1 = 0;
    let unexcusedSem1 = 0;
    let excusedSem2 = 0;
    let unexcusedSem2 = 0;

    Object.entries(attendanceData).forEach(([dateStr, dayData]: [string, any]) => {
      if (!dayData) return;
      const sem = getSemester(dateStr);

      const statuses = typeof dayData === 'object' ? Object.values(dayData) : [dayData];

      statuses.forEach(status => {
        if (!status) return;
        const sStr = String(status).toLowerCase();
        if (sStr === 'e') {
          if (sem === 1) excusedSem1++;
          else excusedSem2++;
        } else if (sStr === 'u' || sStr === 'f') {
          if (sem === 1) unexcusedSem1++;
          else unexcusedSem2++;
        }
      });
    });

    return {
      sem1: { excused: excusedSem1, unexcused: unexcusedSem1, total: excusedSem1 + unexcusedSem1 },
      sem2: { excused: excusedSem2, unexcused: unexcusedSem2, total: excusedSem2 + unexcusedSem2 },
      total: { 
        excused: excusedSem1 + excusedSem2, 
        unexcused: unexcusedSem1 + unexcusedSem2, 
        total: excusedSem1 + excusedSem2 + unexcusedSem1 + unexcusedSem2 
      }
    };
  };

  function renderFehlstundenView() {
    const totalAbsStats = students.reduce((acc, st) => {
      const stats = getStudentFehlstundenBySemester(st.id);
      acc.exc1 += stats.sem1.excused;
      acc.unexc1 += stats.sem1.unexcused;
      acc.exc2 += stats.sem2.excused;
      acc.unexc2 += stats.sem2.unexcused;
      acc.totalExc += stats.total.excused;
      acc.totalUnexc += stats.total.unexcused;
      return acc;
    }, { exc1: 0, unexc1: 0, exc2: 0, unexc2: 0, totalExc: 0, totalUnexc: 0 });

    const classTotalHours = totalAbsStats.totalExc + totalAbsStats.totalUnexc;
    const classAvgHours = students.length > 0 ? (classTotalHours / students.length).toFixed(1) : '0.0';

    return (
      <div className="space-y-6 text-slate-800">
        <div className="border-b-2 border-black pb-3 flex justify-between items-end">
          <div className="text-left">
            <h3 className="text-[1.25rem] leading-none font-black uppercase tracking-wider">{customHeaderTitle || 'Fehlstunden-Übersicht'}</h3>
            <p className="text-[0.6875rem] font-bold text-zinc-500 mt-1">Auswertung nach Semestern und Gesamtjahr</p>
          </div>
          <div className="text-right">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-zinc-500 block">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung}</span>
            <span className="text-[0.5625rem] font-bold text-zinc-400">Generiert am: {new Date().toLocaleDateString('de-DE')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 border border-zinc-200 p-4 rounded-2xl bg-zinc-50/50">
          <div className="text-center p-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Gesamte Fehlstunden</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">{classTotalHours} Std.</span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">({totalAbsStats.totalExc} entschuldigt / {totalAbsStats.totalUnexc} unentschuldigt)</span>
          </div>
          <div className="text-center p-2 border-x border-zinc-200">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Ø pro Schüler/in</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">{classAvgHours} Std.</span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">Durchschnittlicher Ausfall</span>
          </div>
          <div className="text-center p-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Entschuldigungsquote</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">
              {classTotalHours > 0 ? `${((totalAbsStats.totalExc / classTotalHours) * 100).toFixed(0)}%` : '100%'}
            </span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">Anteil entschuldigter Stunden</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <th className="py-3 px-3 text-left w-10">Nr.</th>
                <th className="py-3 px-3 text-left min-w-[12rem]">Schüler/in</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-indigo-50/10" colSpan={3}>1. Semester</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-emerald-50/10" colSpan={3}>2. Semester</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-amber-50/10" colSpan={3}>Gesamtjahr</th>
                <th className="py-3 px-3 text-center border-l border-zinc-100">Status</th>
              </tr>
              <tr className="bg-zinc-50/30 text-[0.5625rem] font-bold text-zinc-400 border-b border-zinc-100">
                <th></th>
                <th></th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-slate-800 w-12 text-center font-mono">Ges.</th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-slate-800 w-12 text-center font-mono">Ges.</th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-zinc-800 w-12 text-center font-mono">Ges.</th>
                <th className="border-l border-zinc-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {students.map((st, idx) => {
                const stats = getStudentFehlstundenBySemester(st.id);
                const hasUnexcused = stats.total.unexcused > 0;
                const hasAbsences = stats.total.total > 0;

                return (
                  <tr key={st.id} className="hover:bg-zinc-50/50 transition-colors text-[0.8125rem]">
                    <td className="py-2.5 px-3 font-bold text-zinc-400 text-left">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-extrabold text-zinc-900 text-left">
                      {st.nachname} <span className="text-zinc-500 font-semibold">{st.vorname}</span>
                    </td>
                    
                    {/* Sem 1 */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono">{stats.sem1.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.sem1.unexcused > 0 ? 'text-rose-500 bg-rose-50/30' : 'text-zinc-400'}`}>{stats.sem1.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-indigo-50/10">{stats.sem1.total}</td>
                    
                    {/* Sem 2 */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono">{stats.sem2.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.sem2.unexcused > 0 ? 'text-rose-500 bg-rose-50/30' : 'text-zinc-400'}`}>{stats.sem2.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-emerald-50/10">{stats.sem2.total}</td>
                    
                    {/* Total */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono bg-amber-50/5">{stats.total.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.total.unexcused > 0 ? 'text-rose-500 bg-rose-50/50' : 'text-zinc-400'}`}>{stats.total.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-amber-50/10">{stats.total.total}</td>
                    
                    {/* Status badge */}
                    <td className="py-2.5 px-3 border-l border-zinc-200 text-center text-[0.625rem] font-bold">
                      {!hasAbsences ? (
                        <span className="text-zinc-400">Keine</span>
                      ) : hasUnexcused ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100">Offene Belege</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">Erledigt</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="text-[0.625rem] text-zinc-400 font-medium italic text-left">
          * Aufteilung: 1. Semester umfasst die Monate September bis Jänner. 2. Semester umfasst Februar bis August.
        </div>
      </div>
    );
  }

  function renderKassenuebersichtView() {
    const { rows, openingBalance, totalIncome, totalExpense, closingBalance, hasRows } = koReportData;
    const classNameStr = `${app?.stufe || ''}${app?.stufe ? '. Klasse ' : 'Klasse '}${app?.klassenbezeichnung || app?.klasse || ''}`.trim();
    const formatEur = (v: number) => (Number(v) || 0).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });

    return (
      <div className="space-y-6 text-slate-900 font-sans">
        {/* Kopfbereich: Dokument-Header */}
        <div className="border-b-2 border-black pb-3 flex justify-between items-end gap-4">
          <div className="text-left">
            <h3 className="text-[1.25rem] leading-tight font-black uppercase tracking-wider text-black">
              {customHeaderTitle || 'Kassenübersicht – Einnahmen & Ausgaben'}
            </h3>
            <div className="text-[0.75rem] font-bold text-zinc-600 mt-1 flex items-center gap-2 flex-wrap">
              <span><strong>Klasse:</strong> {classNameStr || 'Klassenkasse'}</span>
              <span>•</span>
              <span><strong>Zeitraum:</strong> {koDateRange.periodLabel}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-zinc-500 block">
              Schuljahr {app?.schuljahr || getCurrentSchuljahr()}
            </span>
            <span className="text-[0.625rem] font-bold text-zinc-400">
              Gedruckt am {new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Kompakte Finanz-Kennzahlen Box */}
        {koShowKpiBanner && (
          <div className="grid grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="p-1">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">Anfangsbestand</span>
              <span className="text-[1rem] font-black text-slate-800 font-mono block mt-0.5">{formatEur(openingBalance)}</span>
            </div>
            <div className="p-1 border-l border-slate-200">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-700 block">Einnahmen</span>
              <span className="text-[1rem] font-black text-emerald-700 font-mono block mt-0.5">+{formatEur(totalIncome)}</span>
            </div>
            <div className="p-1 border-l border-slate-200">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-rose-700 block">Ausgaben</span>
              <span className="text-[1rem] font-black text-rose-700 font-mono block mt-0.5">-{formatEur(totalExpense)}</span>
            </div>
            <div className="p-1 border-l border-slate-200 bg-white rounded-lg border border-slate-200/80 shadow-3xs">
              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-indigo-900 block">Endsaldo</span>
              <span className={`text-[1.0625rem] font-black font-mono block mt-0.5 ${closingBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatEur(closingBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Haupttabelle */}
        <table className="w-full border-collapse text-left text-[0.75rem]">
          <thead>
            <tr className="border-b-[1.5pt] border-black bg-slate-100/70 text-black font-black uppercase text-[0.625rem] tracking-wider">
              <th className="py-2.5 px-2.5 w-24 text-left">Datum</th>
              <th className="py-2.5 px-2 text-left">Beschreibung</th>
              <th className="py-2.5 px-2 w-28 text-left">Kategorie</th>
              <th className="py-2.5 px-2.5 w-24 text-right">Einnahme</th>
              <th className="py-2.5 px-2.5 w-24 text-right">Ausgabe</th>
              <th className="py-2.5 px-2.5 w-28 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Anfangsbestand Zeile falls nicht 0 */}
            {openingBalance !== 0 && (
              <tr className="bg-slate-50/60 text-slate-600 italic">
                <td className="py-2 px-2.5 font-medium whitespace-nowrap text-slate-400">
                  {new Date(koDateRange.startDateStr).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td className="py-2 px-2 font-bold text-slate-700" colSpan={2}>
                  Anfangsbestand / Vortrag vor {koDateRange.periodLabel}
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-slate-400">—</td>
                <td className="py-2 px-2.5 text-right font-mono text-slate-400">—</td>
                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                  {formatEur(openingBalance)}
                </td>
              </tr>
            )}

            {!hasRows ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-[0.875rem] italic">
                  Keine Buchungen im ausgewählten Zeitraum.
                </td>
              </tr>
            ) : (
              rows.map((tx, idx) => {
                const isEven = idx % 2 === 0;
                const formattedDate = tx.datum
                  ? new Date(tx.datum).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—';
                const katLabel = tx.kategorie === 'ausgabe'
                  ? 'Ausgabe'
                  : tx.kategorie === 'sammlung'
                  ? 'Geldsammlung'
                  : tx.kategorie === 'sonstiges'
                  ? 'Sonstiges'
                  : tx.kategorie || (tx.isPlus ? 'Einnahme' : 'Ausgabe');

                return (
                  <tr
                    key={tx.id || idx}
                    className={`break-inside-avoid ${isEven ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-100/50 transition-colors`}
                  >
                    <td className="py-2 px-2.5 font-medium whitespace-nowrap text-slate-700 align-top">
                      {formattedDate}
                    </td>
                    <td className="py-2 px-2 font-bold text-slate-900 align-top leading-snug break-words">
                      {tx.titel}
                    </td>
                    <td className="py-2 px-2 text-slate-600 align-top text-[0.6875rem]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-medium">
                        {katLabel}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 align-top whitespace-nowrap">
                      {tx.einnahme !== null ? formatEur(tx.einnahme) : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 align-top whitespace-nowrap">
                      {tx.ausgabe !== null ? formatEur(tx.ausgabe) : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 align-top whitespace-nowrap">
                      {formatEur(tx.saldo)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-[1.5pt] border-black bg-slate-100 font-bold text-slate-900">
              <td colSpan={3} className="py-2.5 px-2.5 uppercase text-[0.6875rem] font-black tracking-wider">
                Summen im Zeitraum
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                {formatEur(totalIncome)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-rose-800 whitespace-nowrap">
                {formatEur(totalExpense)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-black whitespace-nowrap">
                {formatEur(closingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Zusammenfassungs-Kasten */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/80 space-y-2 break-inside-avoid">
          <div className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
            Zusammenfassung Kassenstand
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[0.8125rem]">
            <div>
              <span className="text-slate-600 font-medium">Einnahmen gesamt:</span>{' '}
              <strong className="font-mono text-emerald-700">{formatEur(totalIncome)}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">Ausgaben gesamt:</span>{' '}
              <strong className="font-mono text-rose-700">{formatEur(totalExpense)}</strong>
            </div>
            <div>
              <span className="text-slate-900 font-black">Endsaldo:</span>{' '}
              <strong className="font-mono text-slate-950 text-[0.9375rem]">{formatEur(closingBalance)}</strong>
            </div>
          </div>
        </div>

        {/* Unterschriftenzeilen */}
        {koShowSignatures && (
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-[0.75rem] break-inside-avoid">
            <div className="space-y-8">
              <p className="text-slate-500 text-[0.6875rem]">
                Ort, Datum: _________________________________
              </p>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-800">{app?.anrede ? `${app.anrede} ` : ''}{app?.nachname || 'Klassenlehrer:in'}</p>
                <p className="text-[0.625rem] text-slate-500 uppercase tracking-wider font-semibold">Klassenleitung</p>
              </div>
            </div>
            <div className="space-y-8">
              <p className="text-slate-500 text-[0.6875rem] text-transparent select-none">
                .
              </p>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-800">Rechnungsprüfung / Schulleitung</p>
                <p className="text-[0.625rem] text-slate-500 uppercase tracking-wider font-semibold">Geprüft &amp; Übernommen</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSmartToolsView() {
    switch (activeSmartTool) {
      case 'tischschilder': {
        let list = students;
        if (stTischStudentId !== 'all') {
          list = students.filter(s => s.id === stTischStudentId);
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            {list.map(st => {
              // Design specific styles
              let themeBg = 'bg-emerald-50 text-emerald-900 border-emerald-400';
              let themeEmoji = '🦖🦕🌴';
              let themeDesc = 'Dino-Crew';
              
              if (stTischStyle === 'space') {
                themeBg = 'bg-indigo-950 text-indigo-100 border-indigo-700';
                themeEmoji = '🚀🪐⭐️';
                themeDesc = 'Weltraum-Forscher';
              } else if (stTischStyle === 'ocean') {
                themeBg = 'bg-sky-50 text-sky-900 border-sky-400';
                themeEmoji = '🐬🐳🐙';
                themeDesc = 'Meeres-Entdecker';
              } else if (stTischStyle === 'minimal') {
                themeBg = 'bg-stone-50 text-stone-900 border-stone-400';
                themeEmoji = '✨🎓✨';
                themeDesc = 'Schul-Klasse';
              }

              return (
                <div key={st.id} className="avoid-break p-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-left">
                  <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block mb-2 select-none">
                    🖨️ A4 Querformat · Faltbares Tischschild ({themeDesc})
                  </span>
                  
                  {/* Foldable Tent Card Visual Representation */}
                  <div className={`w-full aspect-[297/210] border-2 border-dashed rounded-2xl p-4 flex flex-col justify-between ${themeBg}`}>
                    {/* Back Side (Inverted Name for other students/teachers to see when looking at the desk) */}
                    <div className="text-center rotate-180 border-b border-dashed border-current/20 pb-4">
                      <span className="text-[0.5625rem] font-black uppercase tracking-widest opacity-60">Faltkante • Rückseite</span>
                      <h4 className="text-[1.75rem] leading-none font-extrabold tracking-tight mt-1 capitalize">
                        {st.vorname}
                      </h4>
                    </div>

                    {/* Front Side (For the child to see, or for desk labeling) */}
                    <div className="space-y-4 pt-4 text-center">
                      <div className="text-xs font-bold tracking-widest uppercase opacity-75 flex justify-center gap-2">
                        <span>{themeEmoji.substring(0,2)}</span>
                        <span>{app?.stufe || st.besuchsjahr}. Klasse</span>
                        <span>{themeEmoji.substring(2,4)}</span>
                      </div>
                      
                      <h3 className="text-[2.25rem] leading-none font-black tracking-tight uppercase">
                        {st.vorname} {st.nachname}
                      </h3>

                      {/* Educational Helper Line (ABC and 1-20) if enabled */}
                      {stTischShowHelper && (
                        <div className="mt-4 p-2 bg-white/80 rounded-xl border border-current/10 text-stone-800 space-y-1 text-left font-mono">
                          <div className="text-[0.53125rem] leading-none font-black text-center border-b border-stone-200 pb-1 flex justify-between">
                            <span>A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</span>
                          </div>
                          <div className="text-[0.53125rem] leading-none font-black text-center flex justify-between pt-0.5">
                            <span>1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      case 'urkunden': {
        let list = students;
        if (stUrkundeStudentId !== 'all') {
          list = students.filter(s => s.id === stUrkundeStudentId);
        }

        return (
          <div className="space-y-8 p-2 text-left">
            {list.map(st => (
              <div key={st.id} className="avoid-break bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto">
                <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block mb-4 select-none">
                  🖨️ A4 Hochformat · Motivations-Urkunde
                </span>

                {/* Diploma Content Frame */}
                <div className="aspect-[210/297] border-[10px] border-double border-indigo-900 bg-[#fffdfa] p-10 flex flex-col justify-between text-slate-900 text-center relative rounded-xl shadow-inner" style={{ fontFamily: 'Georgia, serif' }}>
                  <div className="absolute inset-2 border border-indigo-900/10 rounded pointer-events-none" />

                  {/* Top Emblem */}
                  <div className="space-y-2 pt-4">
                    <span className="text-5xl block">🏅</span>
                    <h1 className="text-3xl font-black uppercase tracking-widest text-indigo-950 mt-4 leading-none">
                      {stUrkundeTitle}
                    </h1>
                    <div className="h-0.5 w-24 bg-indigo-900 mx-auto mt-3" />
                  </div>

                  {/* Body Text */}
                  <div className="space-y-6 flex-1 flex flex-col justify-center py-8">
                    <p className="text-stone-500 font-sans font-bold uppercase tracking-widest text-xs">
                      Diese Auszeichnung wird feierlich verliehen an:
                    </p>
                    <h2 className="text-4xl font-black underline decoration-amber-400 decoration-wavy underline-offset-8 text-slate-950 capitalize py-2">
                      {st.vorname} {st.nachname}
                    </h2>
                    <p className="text-lg leading-relaxed text-slate-800 italic px-6 max-w-lg mx-auto">
                      „{stUrkundeText}“
                    </p>
                  </div>

                  {/* Footer & Signatures */}
                  <div className="border-t border-indigo-900/15 pt-6 pb-4">
                    <div className="grid grid-cols-2 gap-8 text-stone-600 font-sans font-bold text-[0.75rem]">
                      <div className="space-y-6">
                        <div className="border-b border-dashed border-stone-300 pb-1 font-mono text-slate-900">
                          {stUrkundeDate}
                        </div>
                        <span className="uppercase text-[0.625rem] text-stone-400 tracking-wider">Ausstellungsdatum</span>
                      </div>
                      <div className="space-y-6">
                        <div className="border-b border-dashed border-stone-300 pb-1 font-serif text-indigo-950 italic">
                          {app.lehrerName || 'Die Klassenlehrkraft'}
                        </div>
                        <span className="uppercase text-[0.625rem] text-stone-400 tracking-wider">Klassenlehrer/in</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'joker': {
        return (
          <div className="space-y-8 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Gutschein-Coupons (Dashed cut borders)
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {students.map((st, idx) => (
                <div key={st.id} className="avoid-break bg-[#faf8f5] border-2 border-dashed border-amber-600 rounded-3xl p-6 relative flex flex-col justify-between aspect-[148/105] text-left shadow-sm">
                  {/* Coupon Ticket Header */}
                  <div className="flex justify-between items-start border-b border-amber-200 pb-3">
                    <div>
                      <span className="text-[0.5625rem] bg-amber-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">GUTSCHEIN</span>
                      <h3 className="text-[1.125rem] leading-normal font-black text-amber-900 mt-1">{stJokerTitle}</h3>
                    </div>
                    <span className="text-3xl">🎟️</span>
                  </div>

                  {/* Coupon Core */}
                  <div className="flex-1 py-4">
                    <p className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-wider">
                      Ausgestellt für: <span className="text-slate-900 underline capitalize">{st.vorname} {st.nachname}</span>
                    </p>
                    <p className="text-[0.75rem] leading-snug font-medium text-slate-700 italic mt-2">
                      „{stJokerText}“
                    </p>
                  </div>

                  {/* Footer Stub & Signature line */}
                  <div className="border-t border-dashed border-amber-200 pt-3 flex justify-between items-end text-[0.625rem] font-bold text-amber-850">
                    <span>Gültig im laufenden Schuljahr</span>
                    <div className="text-right">
                      <div className="border-b border-amber-400/50 w-24 pb-1 italic font-serif text-slate-800">
                        {app.lehrerName || 'Lehrkraft'}
                      </div>
                      <span className="text-[0.5rem] text-stone-400 uppercase block mt-0.5">Unterschrift</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'pocket': {
        const sorted = [...students].sort((a, b) => a.nachname.localeCompare(b.nachname));

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-[0.5625rem] bg-rose-650 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">NOTFALL-KIT</span>
              <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 mt-2">Taschen-Klassenliste (Foldable Pocket Booklet)</h2>
              <p className="text-[0.6875rem] font-bold text-slate-500 mt-1">
                Faltanleitung: Drucken Sie diese Seite auf A4 aus. Falten Sie sie einmal der Länge nach, dann zweimal quer. So erhalten Sie ein perfektes Mini-Klassentelefonbuch für Ihre Geldtasche!
              </p>
            </div>

            {/* Foldable Pocket A4 Frame Mockup */}
            <div className="border-4 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 border-t-2 border-dashed border-slate-300" />
                <div className="h-full w-0.5 border-l-2 border-dashed border-slate-300" />
              </div>

              {/* Booklet Header */}
              <div className="flex justify-between items-baseline mb-4 text-slate-900 border-b border-slate-900/10 pb-1 font-black uppercase text-[0.59375rem] tracking-widest">
                <span>🎒 Notfall-Klassenliste</span>
                <span>Klasse: {app?.stufe}.Klasse ({app?.schuljahr})</span>
              </div>

              {/* Tiny Grid list */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.5625rem] text-slate-800 leading-tight">
                {sorted.map((st, idx) => (
                  <div key={st.id} className="border-b border-slate-200 pb-1.5 flex flex-col justify-between">
                    <div className="flex justify-between font-black text-slate-950">
                      <span>{idx + 1}. {st.nachname} {st.vorname}</span>
                      <span className="text-stone-400 font-mono text-[0.5rem]">{st.geburtstag || 'k.A.'}</span>
                    </div>
                    <div className="flex justify-between text-[0.5rem] text-stone-500 mt-0.5">
                      <span className="truncate">👩 {st.telefon_mutter || 'Keine Nummer'}</span>
                      <span className="truncate">👨 {st.telefon_vater || 'Keine Nummer'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra fold markers */}
              <div className="text-[0.5rem] text-slate-400 font-bold uppercase tracking-widest text-center mt-6 select-none">
                ✂️ Faltlinien (Zweimal falten) • Passt perfekt in jeden Geldbeutel
              </div>
            </div>
          </div>
        );
      }

      case 'labels': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Große Klassenzimmer-Ordnungsbox-Labels (6 pro Blatt)
            </span>

            <div className="grid grid-cols-2 gap-4">
              {stLabels.map((lbl, idx) => (
                <div key={idx} className="avoid-break bg-white border-4 border-slate-900 rounded-3xl p-6 text-center flex flex-col justify-center items-center shadow-md aspect-[120/75] group transition-all hover:scale-[1.01]">
                  {/* Label Title with prominent typography */}
                  <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {lbl}
                  </h3>
                  <div className="w-12 h-1 bg-slate-900 mt-4 rounded-full" />
                  <span className="text-[0.5rem] font-black uppercase tracking-wider text-slate-400 mt-2 select-none">Klassenzimmer-Beschriftung</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'ids': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Namenskarten (85 × 54 mm)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {students.map(st => (
                <div key={st.id} className="avoid-break w-full max-w-[340px] aspect-[85/54] bg-slate-950 text-white rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden shadow-md border border-slate-800">
                  {/* Decorative background circle */}
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-650 rounded-full opacity-10 pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-2">
                    <div>
                      <h4 className="text-[0.5625rem] font-black tracking-wider uppercase text-indigo-400 truncate max-w-[150px]">
                        {stSchoolName}
                      </h4>
                      <span className="text-[0.5rem] font-bold text-slate-400 block mt-0.5 leading-none">NAMENSKARTE · KEIN AMTLICHER AUSWEIS</span>
                    </div>
                    <span className="text-[0.5625rem] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded tracking-wide font-mono">
                      {app?.schuljahr}
                    </span>
                  </div>

                  {/* Card Core: Photo placeholder + Details */}
                  <div className="flex-1 py-2 flex gap-3 items-center">
                    {/* Photo Slot */}
                    <div className="w-12 h-16 bg-slate-900 border border-white/10 rounded flex flex-col items-center justify-center text-slate-500 shrink-0 select-none">
                      <span className="text-xs">👤</span>
                      <span className="text-[0.375rem] font-bold mt-1 uppercase text-slate-600 tracking-wider">FOTO</span>
                    </div>

                    {/* Details list */}
                    <div className="flex-1 text-[0.5625rem] space-y-0.5 min-w-0">
                      <div>
                        <span className="text-[0.45rem] uppercase text-slate-500 block">Name des Schülers / der Schülerin</span>
                        <strong className="text-white text-[0.6875rem] font-black leading-none truncate block capitalize">{st.nachname}, {st.vorname}</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5">
                        <div>
                          <span className="text-[0.45rem] uppercase text-slate-500 block">Schulstufe</span>
                          <span className="font-bold text-indigo-300 block">{app?.stufe || st.besuchsjahr}. Klasse</span>
                        </div>
                        <div>
                          <span className="text-[0.45rem] uppercase text-slate-500 block">Geburtsdatum</span>
                          <span className="font-bold text-slate-300 block">{st.geburtstag || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class Seal watermark overlay */}
                  <div className="absolute bottom-1 right-2 w-10 h-10 border border-indigo-450/25 rounded-full flex items-center justify-center font-black text-[0.3125rem] text-indigo-450/45 rotate-12 uppercase pointer-events-none">
                    SEAL-VS
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'birthday': {
        const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const emojis = ['❄️', '⛄', '🌱', '🌸', '🌼', '☀️', '🏖️', '🍦', '🍂', '🍁', '🪵', '🎄'];
        
        // Group students by birth month
        const group: Record<number, any[]> = {};
        students.forEach(s => {
          if (s.geburtstag) {
            // format standard is DD.MM.YYYY
            const parts = s.geburtstag.split('.');
            if (parts.length >= 2) {
              const month = parseInt(parts[1], 10) - 1; // 0-indexed
              if (month >= 0 && month < 12) {
                if (!group[month]) group[month] = [];
                group[month].push(s);
              }
            }
          }
        });

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-4xl mx-auto space-y-6 text-left">
            <div className="border-b-[2pt] border-slate-900 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[0.5625rem] bg-indigo-900 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">KLASSEN-WALLPAPER</span>
                <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-2">Klassen-Geburtstagskalender 📅</h2>
                <p className="text-[0.6875rem] font-bold text-slate-500 mt-0.5">A4 Querformat Poster für die Klassenzimmerwand</p>
              </div>
              <span className="text-[0.625rem] font-bold text-slate-400">Klasse: {app?.stufe}.Klasse</span>
            </div>

            {/* Poster Grid of months */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {months.map((m, idx) => {
                const birthdayKids = group[idx] || [];
                return (
                  <div key={m} className={`border p-3.5 rounded-2xl bg-slate-50 flex flex-col justify-between min-h-24 transition-all hover:bg-slate-100 ${birthdayKids.length > 0 ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-150'}`}>
                    <div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[0.6875rem] font-black text-slate-800 uppercase tracking-wider">{m}</span>
                        <span className="text-xs">{emojis[idx]}</span>
                      </div>
                      
                      <div className="space-y-1 mt-2">
                        {birthdayKids.length > 0 ? (
                          birthdayKids.map(k => {
                            const bday = k.geburtstag.split('.')[0];
                            return (
                              <div key={k.id} className="text-[0.6875rem] font-bold text-slate-700 truncate capitalize flex justify-between">
                                <span>🎉 {k.vorname}</span>
                                <span className="font-mono text-indigo-600 text-[0.625rem]">({bday}.)</span>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-[0.5625rem] text-slate-400 italic block">Keine Geburtstage</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'jobs': {
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b-[2pt] border-slate-900 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[0.5625rem] bg-indigo-900 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">KLASSENDIENSTE</span>
                <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-2">Klassendienste-Poster 🧹</h2>
                <p className="text-[0.6875rem] font-bold text-slate-500 mt-0.5">Wer hilft heute im Klassenzimmer mit?</p>
              </div>
              <span className="text-[0.625rem] font-bold text-slate-400">Klasse {app?.stufe}.Klasse</span>
            </div>

            {/* Poster content */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stJobs).map(([job, studId]) => {
                const targetStudent = students.find(s => s.id === studId);
                return (
                  <div key={job} className={`border-2 p-5 rounded-3xl text-center transition-all ${targetStudent ? 'border-emerald-500 bg-emerald-50/10 shadow-3xs' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
                    <span className="text-3xl block mb-2">{job.split(' ').pop()}</span>
                    <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-550">{job.replace(/\s\S+$/, '')}</h4>
                    
                    <div className="mt-3">
                      {targetStudent ? (
                        <span className="text-[1.125rem] leading-normal font-black text-emerald-900 capitalize block underline decoration-emerald-400 decoration-2 underline-offset-4">
                          ✨ {targetStudent.vorname} {targetStudent.nachname}
                        </span>
                      ) : (
                        <span className="text-[0.6875rem] text-slate-400 italic block font-bold">
                          — Noch unbesetzt —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'meeting': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Sprechtag-Terminkärtchen (Dashed cut lines)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map(st => {
                const timeAllocated = stMeetingTimes[st.id] || '_________________';
                return (
                  <div key={st.id} className="avoid-break bg-[#fcfdfd] border-2 border-dashed border-sky-400 rounded-3xl p-5 relative flex flex-col justify-between shadow-2xs aspect-[130/80] text-left">
                    {/* Header */}
                    <div className="border-b border-sky-100 pb-2.5 flex justify-between items-start">
                      <div>
                        <span className="text-[0.5rem] bg-sky-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">ERINNERUNG</span>
                        <h4 className="text-[0.875rem] leading-snug font-black text-sky-900 mt-1">Elternsprechtag-Termin</h4>
                      </div>
                      <span className="text-2xl">💬</span>
                    </div>

                    {/* Content Details */}
                    <div className="py-3 text-[0.6875rem] font-bold text-slate-600 space-y-1">
                      <p>Schüler/in: <strong className="text-slate-900 capitalize">{st.vorname} {st.nachname}</strong></p>
                      <p>Datum: <strong className="text-slate-900">{stMeetingDate}</strong></p>
                      <p>Uhrzeit: <strong className="text-indigo-600 text-[0.8125rem] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block font-black mt-0.5">{timeAllocated} Uhr</strong></p>
                      <p>Raum: <strong className="text-slate-900">{stMeetingRoom}</strong></p>
                    </div>

                    {/* Mitzubringen note */}
                    {stMeetingDocs && (
                      <div className="text-[0.5625rem] bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-slate-500 font-bold leading-normal">
                        📝 Bitte mitbringen: {stMeetingDocs}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'queue': {
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-black">
                  🖨️
                </div>
                <div>
                  <h2 className="text-[1.25rem] leading-normal font-black text-slate-900">Druck-Warteschlange (Bulk Multi-Page Layout)</h2>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sammelauftrag für alle {students.length} Kinder</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-[0.75rem] leading-tight font-semibold text-slate-700">
              <p className="leading-relaxed font-bold">
                Hier können Sie ein gebündeltes PDF drucken, das für alle Kinder nacheinander mehrere verschiedene Dokumente in einem Rutsch zusammenstellt. Ideal, um am Jahresende Zeit und Papier zu sparen!
              </p>

              <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 space-y-2.5">
                <h4 className="text-[0.6875rem] font-black uppercase tracking-wider text-emerald-800">Paketinhalt für dieses Jahr:</h4>
                <div className="space-y-1.5 font-bold text-emerald-950">
                  <div className="flex gap-2"><span>•</span> <span>1x Klassen-Tischschilder ({stTischStyle === 'dino' ? '🦖 Dino' : stTischStyle === 'space' ? '🚀 Space' : stTischStyle === 'ocean' ? '🐬 Ocean' : '✨ Minimal'})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Schul-Urkunde ({stUrkundeTitle})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Hausübungs- &amp; Joker-Gutschein ({stJokerTitle})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Taschen-Emergency-Klassenliste</span></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-4">
                <span className="text-[0.5625rem] text-slate-400 block font-bold leading-none">Status: Bereit für den A4-Druck</span>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[0.6875rem] tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🖨️</span>
                  <span>Jetzt Sammeldruck starten</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  function renderLobDruckkarteView() {
    let toRender = students;
    if (lobStudentMode === 'single') {
      toRender = students.filter(s => s.id === lobSelectedStudentId);
    }

    const tpl = COMPLIMENT_TEMPLATES.find(t => t.id === lobSelectedTemplate) || COMPLIMENT_TEMPLATES[0];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {toRender.map((st, idx) => (
          <div key={`${st.id}-${idx}`} className="avoid-break mb-8">
            <div 
              id={`printable-compliment-card-${st.id}`}
              className="w-[148mm] h-[105mm] bg-[#fffcf5] border-[6px] border-double border-amber-600 p-8 rounded-lg shadow-md flex flex-col justify-between text-slate-900 relative mx-auto"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', transform: 'scale(0.8)', transformOrigin: 'top center' }}
            >
              {/* Frame lines decoration */}
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-amber-700/25 pointer-events-none rounded" />
              
              <div className="text-center space-y-2 mt-4">
                <span className="text-4xl block">{tpl.emoji}</span>
                <h3 className="text-amber-800 text-[1.125rem] leading-normal font-black uppercase tracking-widest leading-none mt-2">
                  Lob-Dusche & Anerkennung
                </h3>
                <p className="text-[0.625rem] font-sans font-bold text-stone-400 mt-2">EIN HERZLICHES DANKE FÜR DEINE PÄDAGOGISCHE LEISTUNG</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-[0.75rem] leading-tight text-stone-500 italic mt-2 leading-none">Gewidmet an:</p>
                <h4 className="text-[1.5rem] leading-normal font-serif font-black underline decoration-amber-300 py-2 text-slate-900 capitalize mt-2 mb-2">
                  {st.vorname} {st.nachname}
                </h4>
                <p className="text-[0.875rem] leading-snug text-slate-800 tracking-tight leading-relaxed italic px-4 max-w-sm mt-3">
                  „{lobCustomText || tpl.complimentText}“
                </p>
              </div>

              <div className="flex justify-between items-center px-4 pt-4 border-t border-amber-200/40 text-[0.6875rem] font-sans font-bold text-amber-900 mb-2">
                <span>Von: <span className="underline italic">{lobSender}</span></span>
                <span>Ein gutes Herz verändert die Welt ❤️</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- H. NEW HIGH-FIDELITY RENDERERS ---

  function renderSingleElternDiagnostik(st: any) {
    const tests = app?.diagnostikTests || [];
    const erhebungen = [...(app?.diagnostikErhebungen || [])]
      .filter((e: any) => e.schuelerId === st.id)
      .sort((a, b) => b.datum.localeCompare(a.datum));
      
    // wir gruppen nach testId
    const byTest: Record<string, any[]> = {};
    erhebungen.forEach(e => {
        if (!byTest[e.testId]) byTest[e.testId] = [];
        byTest[e.testId].push(e);
    });

    return (
      <div className="space-y-6 pt-4 text-[0.6875rem] print-dossier-body">
        {/* Main Cover Panel */}
        <div className="flex border-b-2 border-slate-900 pb-2 mb-4 justify-between items-end">
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 uppercase tracking-widest">
              Lern- &amp; Entwicklungsbericht
            </h2>
            <p className="text-[0.875rem] leading-snug text-slate-500 font-bold mt-1">Für {st.vorname} {st.nachname}</p>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-slate-500 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Klasse • SJ {app?.schuljahr}</span>
            <span className="block mt-0.5">Bericht erstellt am: {new Date().toLocaleDateString('de-AT')}</span>
          </div>
        </div>

        {erhebungen.length === 0 ? (
           <p className="text-slate-400 font-bold italic text-center py-6">Noch keine Diagnostik-Daten für {st.vorname} erfasst.</p>
        ) : (
           <div className="space-y-8">
             {Object.entries(byTest).map(([testId, testErhebungen]) => {
                const testMeta = tests.find(t => t.id === testId);
                const isLive = testId.startsWith('live-');
                // The most recent result is the first one
                const latest = testErhebungen[0];
                return (
                  <div key={testId} className="border border-slate-200 rounded-2xl  pb-4 break-inside-avoid">
                     <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div>
                          <h3 className="font-black text-slate-800 text-[0.875rem] leading-snug">{testMeta?.name || 'Test'}</h3>
                          <p className="text-[0.625rem] text-slate-500">{testMeta?.kurzbeschreibung}</p>
                        </div>
                        {isLive && <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[0.5rem] font-black uppercase tracking-widest">1:1 Live-Diagnose</span>}
                     </div>

                     <div className="p-4 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center gap-3">
                              <div className={`text-[1.5rem] leading-normal font-black tabular-nums ${isDiagnosticAlert(latest) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                 {latest.ergebniswert}
                              </div>
                              <div className="text-[0.625rem] uppercase font-bold text-slate-400">Aktueller Stand<br/>({latest.datum})</div>
                           </div>

                           {diagShowComments && latest.kommentar && (
                             <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[0.5625rem] font-black uppercase text-slate-400 mb-1 block">Beobachtungen &amp; Notizen:</span>
                                <div className="text-[0.75rem] leading-tight text-slate-700 italic preserve-whitespace">{latest.kommentar.replace('Lehrperson-Notiz:','')}</div>
                             </div>
                           )}
                           
                           {/* Show meta data details if available */}
                           {latest.meta?.answers && (
                             <div className="mt-3 space-y-1">
                                <p className="text-[0.5625rem] font-black uppercase text-slate-400">Detail-Auswertung:</p>
                                <div className="grid grid-cols-2 gap-1 text-[0.625rem] text-slate-600">
                                   {latest.meta.type === 'zehneruebergang' ? (
                                      Object.entries(latest.meta.answers).slice(0,4).map(([k,v]:any) => (
                                         <div key={k} className="bg-slate-50 p-1.5 rounded border border-slate-100"><span className="font-bold">{k}:</span> {v}</div>
                                      ))
                                   ) : latest.meta.type === 'sozialemotional' || latest.meta.type === 'feinmotorik' ? (
                                      Object.entries(latest.meta.answers).slice(0,4).map(([k,v]:any) => (
                                         <div key={k} className="bg-slate-50 p-1.5 rounded border border-slate-100"><span className="font-bold">{k}:</span> <span className={v==='Auffällig'?'text-rose-600':'text-emerald-600'}>{v}</span></div>
                                      ))
                                   ) : null}
                                </div>
                             </div>
                           )}
                        </div>

                        {/* Chart Area if multiple measurements and settings enabled */}
                        {diagShowCharts && testErhebungen.length > 1 && (
                           <div className="flex-1 pl-4 h-32 flex flex-col justify-end relative">
                              <span className="text-[0.5625rem] font-black uppercase text-slate-400 absolute top-0 left-4 hide-on-print">Entwicklungsverlauf</span>
                              <div className="flex items-end gap-2 h-20 w-full mt-4 border-b border-slate-200 pb-1">
                                {testErhebungen.slice().reverse().map((measurement, idx) => {
                                   const maxVal = Math.max(...testErhebungen.map((m:any) => m.ergebniswert)) || 100;
                                   const heightPct = Math.min(100, Math.max(5, (measurement.ergebniswert / maxVal) * 100));
                                   return (
                                     <div key={idx} className="flex flex-col items-center flex-1 justify-end h-full relative group">
                                        <div className={`w-full rounded-t-sm transition-all ${isDiagnosticAlert(measurement) ? 'bg-amber-300' : 'bg-indigo-300'}`} style={{ height: `${heightPct}%` }} />
                                        <span className="text-[0.5rem] mt-1 text-slate-400 font-bold text-wrap leading-tight break-words max-w-full">{measurement.datum.substring(0,5)}</span>
                                        <span className="absolute -top-4 text-[0.5625rem] font-black text-slate-600 text-wrap leading-tight break-words max-w-full">{measurement.ergebniswert}</span>
                                     </div>
                                   )
                                })}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
                );
             })}
           </div>
        )}
      </div>
    );
  }

  function renderSingleStudentProfile(st: any) {
    // 1. Fetch Grades Summary
    const grades = getStudentGradesSummary(st.id);

    // 2. Fetch KEL & Reflexion
    const kelRow = getKelDataForStudent(st.id);
    const CRITERION_DICT: Record<string, string> = {
      'zuzuhoeren': 'Zuhören & Verstehen',
      'lesen': 'Lesefreude & Technik',
      'rechnen': 'Mathematisches Denken',
      'konzentration': 'Ausdauer & Fokus',
      'regeln': 'Regeln & Vereinbarungen',
      'de_hoeren_gespraeche': 'D-Hören/Sprechen: Unterrichtsbeiträge',
      'de_hoeren_standardsprache': 'D-Hören/Sprechen: Aussprache/Vortrag',
      'de_hoeren_zuhoeren': 'D-Hören/Sprechen: Zuhör-Kompetenz',
      'de_lesen_fliessend': 'D-Lesen: Flüssig lesen',
      'de_lesen_verstaendnis': 'D-Lesen: Leseverständnis',
      'de_lesen_info_verarbeit': 'D-Lesen: Textverständnis',
      'de_rechtschreiben_richtig': 'D-Rechtschreiben: Abschreiben',
      'de_rechtschreiben_lernwoerter': 'D-Rechtschreiben: Lernwörter',
      'de_rechtschreiben_wortfamilie': 'D-Rechtschreiben: Grammatik',
      'de_verfassen_planen': 'D-Verfassen: Textentwurf',
      'ma_zahlen_zahlenraum': 'M-Arithmetik: Zahlenraum',
      'ma_zahlen_stellenwert': 'M-Arithmetik: Stellenwert',
      'ma_rechnen_addition': 'M-Rechnen: Addition',
      'ma_rechnen_subtraktion': 'M-Rechnen: Subtraktion',
      'ma_rechnen_multiplikation': 'M-Rechnen: Malreihen',
      'ma_rechnen_division': 'M-Rechnen: Division',
      'ma_rechnen_sachaufgaben': 'M-Rechnen: Sachaufgaben',
      'ma_groessen_umwandeln': 'M-Größen: Maßeinheiten',
      'ma_raum_figuren': 'M-Geometrie: Figuren',
      'su_interesse': 'Sachunterricht: Eigeninteresse',
      'su_wiedergabe': 'Sachunterricht: Erklärung',
      'al_mitarbeit': 'Verhalten: Mitarbeit',
      'al_konzentration': 'Verhalten: Fokus/Ausdauer',
      'al_ordnung': 'Verhalten: Ordnung/Heftführung',
      'al_selbststaendigkeit': 'Verhalten: Selbstständigkeit',
      'al_hausuebungen': 'Verhalten: Hausübungen'
    };

    // 3. Fetch Klassenkasse Payments
    const sammlungen = app.klassenkasse?.sammlungen || [];
    const studentPayments = sammlungen.map((s: any) => {
      const status = s.status?.[st.id] || 'offen';
      const amount = s.betraege?.[st.id] || s.betrag || 0;
      return { id: s.id, titel: s.titel, datum: s.erstelltAm, status, amount };
    }).filter((p: any) => p.amount > 0);
    const totalPaid = studentPayments.filter((p: any) => p.status === 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
    const totalOpen = studentPayments.filter((p: any) => p.status !== 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
    const totalAmount = totalPaid + totalOpen;
    const progressPercent = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    // 4. MIKA-D status
    const mikaDStatus = st.foerderprofil?.mikaDStatus || 'nicht erhoben';
    const mikaDDatum = st.foerderprofil?.mikaDDatum || '';
    const MIKA_STAGES = [
      { id: '3', label: 'AO - Stufe 3', desc: 'Außerordentlich (geringe Kenntnisse)', border: 'border-rose-300', text: 'text-rose-800 bg-rose-50' },
      { id: '2', label: 'AO - Stufe 2', desc: 'Außerordentlich (mäßige Kenntnisse)', border: 'border-amber-300', text: 'text-amber-800 bg-amber-50' },
      { id: '1', label: 'AO - Stufe 1', desc: 'Außerordentlich (fortgeschritten)', border: 'border-indigo-300', text: 'text-indigo-800 bg-indigo-50' },
      { id: 'ordentlich', label: 'Ordentlich', desc: 'Ausreichende Deutschkenntnisse', border: 'border-emerald-300', text: 'text-emerald-800 bg-emerald-50' },
      { id: 'nicht erhoben', label: 'Nicht erhoben', desc: 'Derzeit keine MIKA-D Daten erfasst', border: 'border-slate-200', text: 'text-slate-500 bg-slate-50' },
    ];
    const mikaCurrent = MIKA_STAGES.find(ms => ms.id === mikaDStatus) || MIKA_STAGES[4];

    // 5. Attendance Calculation
    const attendanceData = app.anwesenheit?.[st.id] || {};
    let excusedHours = 0;
    let unexcusedHours = 0;
    Object.values(attendanceData).forEach((dayData: any) => {
      Object.values(dayData).forEach(status => {
        if (status === 'e') excusedHours++;
        else if (status === 'u' || status === 'f') unexcusedHours++;
      });
    });

    // 6. Behavior logs & Status
    const behaviorStages = app.behavior_stages || [
      { id: '1', label: 'Herausragend', icon: '🌟', color: 'text-amber-500 bg-amber-50 border-amber-200' },
      { id: '2', label: 'Sehr positiv', icon: '😊', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
      { id: '3', label: 'Normal / Neutral', icon: '😐', color: 'text-slate-500 bg-slate-50 border-slate-200' },
      { id: '4', label: 'Ermahnung', icon: '⚠️', color: 'text-orange-500 bg-orange-50 border-orange-200' },
      { id: '5', label: 'Kritisch', icon: '❌', color: 'text-rose-500 bg-rose-50 border-rose-200' }
    ];
    const currentStatusId = app.behavior_status?.[st.id] || app.behavior_default_stage_id || '3';
    const currentStage = behaviorStages.find((bs: any) => bs.id === currentStatusId) || behaviorStages[2];

    const studentNotes = (app.notizen || [])
      .filter((n: any) => n.schuelerId === st.id)
      .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    // 7. KI-Portfolio summary
    const cachedKiSummary = app.kiPortfolioSummaries?.[st.id] || '';

    // 8. Stars rendering helper
    const renderStars = (val?: number) => {
      if (val === undefined || val === null) return '—';
      const filled = '★'.repeat(Math.min(4, Math.max(0, val)));
      const empty = '☆'.repeat(Math.max(0, 4 - val));
      return `${filled}${empty}`;
    };

    return (
      <div className="text-left space-y-12 leading-relaxed text-black print:text-black">
        
        {/* ==================== PAGE 1: DECKBLATT, STAMMDATEN & FINANZEN ==================== */}
        <div className="page-break space-y-8 pb-8 bg-white">
          {/* Header */}
          <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
            <div>
              <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">SCHÜLERDOSSIER - LEHRERMAPPE</span>
              <h2 className="text-[1.625rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                Dossier: {st.nachname} {st.vorname}
              </h2>
            </div>
            <div className="text-right text-[0.6875rem] font-bold text-slate-500 leading-tight">
              <span>Stufe: {app?.stufe || st.besuchsjahr || '—'} • SJ {app?.schuljahr?.trim() || 'nicht angegeben'}</span>
              <span className="block mt-1 font-semibold text-slate-450">Erstellt: {new Date().toLocaleDateString('de-AT')}</span>
            </div>
          </div>

          {/* General Stammdaten */}
          {profShowStammdaten && (
            <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
              <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <User size={12} className="text-indigo-600" />
                I. Allgemeine Stammdaten &amp; Schülerdetails
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-[0.75rem] leading-tight text-slate-700 leading-normal font-semibold">
                <div><strong>Vorname:</strong> {st.vorname}</div>
                <div><strong>Nachname:</strong> {st.nachname}</div>
                <div><strong>Geburtstag:</strong> {st.geburtstag ? new Date(st.geburtstag).toLocaleDateString('de-AT') : '—'}</div>
                <div><strong>Religion / Bekenntnis:</strong> {st.religion || '—'}</div>
                <div><strong>Staatsbürgerschaft:</strong> {st.staatsbuergerschaft || '—'}</div>
                <div><strong>Besuchsjahr:</strong> {st.besuchsjahr ? `${st.besuchsjahr}. Schuljahr` : '—'}</div>
                <div><strong>Schulstufe:</strong> {app?.stufe || st.besuchsjahr}. Schulstufe</div>
                <div><strong>Klassencode:</strong> {app?.klassenbezeichnung || '—'}</div>
                <div><strong>DaZ (Deutsch als Zweitsprache):</strong> {st.daz ? 'Ja' : 'Nein'}</div>
                <div><strong>Sonderpäd. Förderbedarf (SPF):</strong> {st.spf ? 'Ja' : 'Nein'}</div>
                <div><strong>Leistungsniveau:</strong> {st.niveau || '—'}</div>
              </div>

              {profShowContacts && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block flex items-center gap-1.5">
                  <MapPin size={12} className="text-indigo-600" />
                  Wohnanschrift &amp; Kontakte der Erziehungsberechtigten
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight text-slate-700 font-semibold">
                  <div className="space-y-1">
                    <div><strong>Anschrift:</strong> {st.anschrift || '—'}</div>
                    <div><strong>PLZ / Ort:</strong> {st.plz ? `${st.plz} ${st.ort || ''}` : '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <div><strong>Telefon Mutter:</strong> {st.telefon_mutter || '—'}</div>
                    <div><strong>Telefon Vater:</strong> {st.telefon_vater || '—'}</div>
                    <div><strong>E-Mail Eltern:</strong> {st.email_eltern || '—'}</div>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Klassenkasse & Finanzen */}
          {profShowFinanzen && (
            <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
              <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Banknote size={12} className="text-cyan-600" />
                II. Klassenkasse &amp; Geldsammlungs-Beiträge
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-slate-400">Kontostand (Gesamt)</span>
                  <span className="text-[1.125rem] leading-normal font-black text-slate-800">{totalAmount.toFixed(2)} €</span>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-emerald-600">Bezahlt</span>
                  <span className="text-[1.125rem] leading-normal font-black text-emerald-800">{totalPaid.toFixed(2)} €</span>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-rose-600">Offen / Ausstehend</span>
                  <span className="text-[1.125rem] leading-normal font-black text-rose-800">{totalOpen.toFixed(2)} €</span>
                </div>
              </div>

              {studentPayments.length > 0 ? (
                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-400 uppercase tracking-wider font-black">
                        <th className="py-2">Titel der Sammlung</th>
                        <th className="py-2 text-right">Soll-Betrag</th>
                        <th className="py-2 text-right">Erhalten am</th>
                        <th className="py-2 text-right">Zahlungsstatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                          <td className="py-2 font-bold text-slate-800">{p.titel}</td>
                          <td className="py-2 text-right tabular-nums">{p.amount.toFixed(2)} €</td>
                          <td className="py-2 text-right text-slate-400">{p.datum || '—'}</td>
                          <td className={`py-2 text-right font-black uppercase text-[0.59375rem] ${p.status === 'bezahlt' ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {p.status === 'bezahlt' ? '● BEZAHLT' : '○ OFFEN'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-[0.75rem] leading-tight italic">Keine eingetragenen Finanzforderungen oder Geldsammlungen vorhanden.</p>
              )}
            </div>
          )}
        </div>


        {/* ==================== PAGE 2: NOTENVERLAUF & MIKA-D ==================== */}
        {(profShowLeistungen || profShowMikaD) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - BEREICH LEISTUNGEN &amp; SPRACHSTAND</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Leistungsbilanz &amp; MIKA-D: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>SJ {app?.schuljahr?.trim() || 'nicht angegeben'}</span>
              </div>
            </div>

            {/* Grades Table */}
            {profShowLeistungen && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Award size={12} className="text-indigo-600" />
                  III. Notengitter &amp; Semester-Leistungen
                </span>

                <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-[0.59375rem] text-slate-500 uppercase tracking-widest font-black">
                      <th className="py-2.5">Pflichtgegenstand</th>
                      <th className="py-2.5 text-center">1. Semester</th>
                      <th className="py-2.5 text-center">2. Semester</th>
                      <th className="py-2.5 text-right">Beurteilungsart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.length > 0 ? (
                      grades.map((gr, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                          <td className="py-2.5 font-bold text-slate-900">{gr.subject}</td>
                          <td className="py-2.5 text-center text-slate-600 font-semibold">{gr.semester1}</td>
                          <td className="py-2.5 text-center text-slate-600 font-semibold">{gr.semester2}</td>
                          <td className="py-2.5 text-right text-slate-500 font-black uppercase text-[0.59375rem]">
                            {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte → Prozentstand'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-medium italic">
                          Keine Fachleistungen oder Noten in der Notenmappe eingetragen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MIKA-D Section */}
            {profShowMikaD && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <GraduationCap size={12} className="text-indigo-600" />
                  IV. MIKA-D Sprachstandserhebung (Deutsch als Zweitsprache)
                </span>

                <div className={`p-4 rounded-xl border ${mikaCurrent.border} ${mikaCurrent.text} flex items-start gap-4`}>
                  <div className="w-10 h-10 rounded-lg bg-white shadow-3xs flex items-center justify-center text-[1.25rem] shrink-0 font-bold border border-slate-100">
                    🗣️
                  </div>
                  <div className="space-y-1">
                    <p className="text-[0.5625rem] uppercase font-black tracking-widest text-slate-400">Eingestufter Statuswert</p>
                    <h4 className="text-[1.125rem] leading-normal font-black tracking-tight">{mikaCurrent.label}</h4>
                    <p className="text-[0.75rem] leading-tight font-medium opacity-90">{mikaCurrent.desc}</p>
                    {mikaDDatum && (
                      <p className="text-[0.625rem] font-semibold opacity-60 pt-1 flex items-center gap-1 uppercase tracking-wider">
                        <Calendar size={10} /> Letzte Erhebung am: {new Date(mikaDDatum).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 3: VERHALTENSBEOBACHTUNGEN, PRÄSENZ & SELBSTREFLEXION ==================== */}
        {(profShowVerhalten || profShowKELReflexion) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - BEREICH VERHALTEN &amp; PRÄSENZ</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Verhaltensbeobachtung &amp; Selbstreflexion: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Schulstufe: {app?.stufe || st.besuchsjahr}.Klasse</span>
              </div>
            </div>

            {/* Behavior & Attendance */}
            {profShowVerhalten && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-indigo-600" />
                  V. Sozialverhalten &amp; Präsenzerfassung
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal">🧭</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-slate-400 leading-none mb-1">Verhaltensampel</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{currentStage.icon} {currentStage.label}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal text-emerald-500">✓</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-emerald-600 leading-none mb-1">Fehlstunden (Entschuldigt)</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{excusedHours} Stunden</p>
                    </div>
                  </div>
                  <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal text-rose-500">⚠️</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-rose-600 leading-none mb-1">Fehlstunden (Unentschuldigt)</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{unexcusedHours} Stunden</p>
                    </div>
                  </div>
                </div>

                {/* Latest 5 observation notes */}
                <div className="pt-2 space-y-2.5">
                  <span className="text-[0.59375rem] font-black uppercase text-slate-450 tracking-wider block">Jüngste Beobachtungsnotizen &amp; Logeinträge (Kompakt)</span>
                  {studentNotes.length > 0 ? (
                    <div className="space-y-2">
                      {studentNotes.slice(0, 5).map((n: any, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start text-[0.75rem] leading-tight text-slate-700 leading-relaxed font-semibold">
                          <div className="space-y-0.5">
                            <span className="text-[0.5625rem] uppercase font-black text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.5">
                              {n.kategorie || 'Beobachtung'}
                            </span>
                            <p className="text-slate-800 font-bold mt-1">{n.inhalt || n.text}</p>
                          </div>
                          <span className="text-[0.625rem] font-bold text-slate-400 whitespace-nowrap ml-4">
                            {n.timestamp ? new Date(n.timestamp).toLocaleDateString('de-DE') : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-450 text-[0.75rem] leading-tight italic">Es sind keine Verhaltens- oder Beobachtungsnotizen für dieses Semester vorhanden.</p>
                  )}
                </div>
              </div>
            )}

            {/* KEL Selbstreflexion Grid */}
            {profShowKELReflexion && kelRow && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Heart size={12} className="text-rose-600" />
                  VI. KEL-Selbstreflexionskatalog (Direkter Vergleich)
                </span>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[0.75rem] leading-tight text-slate-700 font-semibold leading-relaxed">
                    <strong>Vereinbarungen aus dem KEL-Gespräch (vom {kelRow.datum || '—'}):</strong> <br />
                    {kelRow.vereinbarungen || 'Keine spezifischen schriftlichen Zielvereinbarungen getroffen.'}
                  </p>
                </div>

                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                        <th className="py-2">Pädagogische Reflexionskriterien</th>
                        <th className="py-2 text-center">Selbsteinschätzung Kind</th>
                        <th className="py-2 text-center">Einschätzung Lehrperson</th>
                        <th className="py-2 text-right">Kind-Kommentar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(CRITERION_DICT).map((key, idx) => {
                        const kidVal = kelRow.selbsteinschaetzungKind?.[key];
                        const teachVal = kelRow.einschaetzungLehrperson?.[key];
                        if (!kidVal && !teachVal) return null;

                        return (
                          <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                            <td className="py-2 font-bold text-slate-900">{CRITERION_DICT[key] || key}</td>
                            <td className="py-2 text-center text-amber-500 font-extrabold text-[0.8125rem]">
                              {renderStars(kidVal?.wert)}
                            </td>
                            <td className="py-2 text-center text-indigo-600 font-extrabold text-[0.8125rem]">
                              {renderStars(teachVal?.wert)}
                            </td>
                            <td className="py-2 text-right text-slate-500 text-[0.6875rem] italic text-wrap max-w-xs break-words">
                              {kidVal?.kommentar || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 4: PORTFOLIO & PÄDAGOGISCHE DIAGNOSTIK ==================== */}
        {(profShowDiagnostik || profShowFoerderprofil || profShowKIPortfolio) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - DIAGNOSTIK &amp; FÖRDERUNGSBILANZ</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Pädagogische Diagnostik &amp; Förderplan: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Klassencode: {app?.klassenbezeichnung || '—'}</span>
              </div>
            </div>

            {/* Diagnostik Erhebungen */}
            {profShowDiagnostik && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Scale size={12} className="text-indigo-600" />
                  VII. Standardisierte Erhebungen &amp; 1:1 Live-Protokolle
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight font-semibold leading-normal">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[0.5625rem] uppercase font-black text-slate-400 mb-1">Zusätzliche strukturierte Profildaten:</p>
                    <p className="text-slate-800 font-extrabold text-[0.875rem] leading-snug">
                      {Object.values(app.oberauData?.[st.id]?.evaluationData || {}).filter((value) => value !== null && value !== undefined).length} dokumentierte Werte
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[0.5625rem] uppercase font-black text-slate-400 mb-1">Pädagogische Zusatzbemerkung:</p>
                    <p className="text-slate-600 text-[0.6875rem] italic leading-tight">
                      {st.foerderprofil?.zusatzinfo || app.oberauData?.[st.id]?.remarks || 'Keine zusätzliche Bemerkung hinterlegt.'}
                    </p>
                  </div>
                </div>

                {/* Diagnostics table */}
                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                        <th className="py-2">Testverfahren</th>
                        <th className="py-2 text-center">Ergebnis / Werte</th>
                        <th className="py-2 text-right">Datum</th>
                        <th className="py-2 text-right">Durchgeführt von</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === st.id).length > 0 ? (
                        (app.diagnostikErhebungen || [])
                          .filter((e: any) => e.schuelerId === st.id)
                          .map((e: any, idx) => {
                            const test = (app.diagnostikTests || []).find((t: any) => t.id === e.testId);
                            const testName = test ? test.name : (e.testId || 'Unbekannter Test');
                            return (
                              <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                                <td className="py-2">
                                  <span className="font-bold text-slate-900">{testName}</span>
                                  {isDiagnosticAlert(e) && (
                                    <span className="ml-2 text-[0.5625rem] bg-rose-100 text-rose-800 px-1 rounded font-black uppercase">
                                      ⚠️ Bedarf erkannt
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-center font-mono text-slate-800">
                                  Wert: {e.ergebniswert} {e.rohwert ? `(Rohwert: ${e.rohwert})` : ''}
                                </td>
                                <td className="py-2 text-right text-slate-400">{e.datum || '—'}</td>
                                <td className="py-2 text-right text-slate-500 text-[0.6875rem]">{e.durchgefuehrtVon || 'Lehrkraft'}</td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                            Keine spezifischen standardisierten Testergebnisse oder 1:1 Protokolle hinterlegt.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Förderprofil & Förderziele */}
            {profShowFoerderprofil && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  VIII. Pädagogisches Förderprofil &amp; Zielvereinbarungen
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight font-semibold">
                  <div className="space-y-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-emerald-700 block uppercase text-[0.5625rem] mb-1">Individuelle Stärken:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {(st.foerderprofil?.staerken || []).length > 0 ? (
                        (st.foerderprofil.staerken || []).map((stg: string, idx: number) => <li key={idx}>{stg}</li>)
                      ) : (
                        <li className="italic text-slate-400">Keine Stärken explizit erfasst.</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-rose-700 block uppercase text-[0.5625rem] mb-1">Erhöhter Förderbedarf:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {(st.foerderprofil?.foerderbedarfBereiche || []).length > 0 ? (
                        (st.foerderprofil.foerderbedarfBereiche || []).map((fb: string, idx: number) => <li key={idx}>{fb}</li>)
                      ) : (
                        <li className="italic text-slate-400">Kein spezifischer Förderbedarf erfasst.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Förderziele */}
                {st.foerderprofil?.foerderziele && st.foerderprofil.foerderziele.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[0.59375rem] font-black uppercase text-slate-450 tracking-wider block mb-2">Festgelegte Förderplan-Ziele &amp; Fortschritt</span>
                    <table className="w-full border-collapse text-[0.725rem] leading-tight text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                          <th className="py-2">Bereich / Fach</th>
                          <th className="py-2">Konkretes Förderziel</th>
                          <th className="py-2 text-center">Zieltermin</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {st.foerderprofil.foerderziele.map((fz: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-b-0 text-slate-700 font-semibold">
                            <td className="py-2 font-bold text-slate-900">{fz.bereich}</td>
                            <td className="py-2">{fz.ziel} {fz.notiz ? `(${fz.notiz})` : ''}</td>
                            <td className="py-2 text-center text-slate-400 font-mono">
                              {fz.zielDatum ? new Date(fz.zielDatum).toLocaleDateString('de-DE') : '—'}
                            </td>
                            <td className="py-2 text-right font-black uppercase text-[0.59375rem] text-indigo-600">
                              {fz.status || 'In Arbeit'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 5: KI-PORTFOLIO ENTWICKLUNGSBERICHT ==================== */}
        {profShowKIPortfolio && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - KI-ENTWICKLUNGSBERICHT</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Entwicklungs-Zusammenfassung: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Gespeicherter KI-Entwurf · fachlich prüfen</span>
              </div>
            </div>

            {/* KI Content */}
            <div className="border border-slate-300 p-6 md:p-8 rounded-[1.5rem] bg-slate-50 shadow-inner">
              {cachedKiSummary ? (
                <div className="markdown-body text-[0.78125rem] text-slate-800 font-semibold space-y-4">
                  <Markdown>{cachedKiSummary}</Markdown>
                </div>
              ) : (
                <div className="space-y-3 text-center py-6 text-slate-400">
                  <div className="text-[1.5rem] leading-normal">🤖</div>
                  <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-500">
                    Bericht wurde noch nicht generiert
                  </h4>
                  <p className="text-[0.6875rem] font-medium max-w-md mx-auto leading-relaxed">
                    Hinweis: Der ganzheitliche KI-Entwicklungsbericht wurde für {st.vorname} noch nicht erstellt. 
                    Wechseln Sie im Cockpit direkt in das <strong>Schülerdossier &gt; Portfolio-Einträge</strong>, 
                    wählen Sie den Tab <strong>KI-Portfolio</strong> und klicken Sie auf <strong>"Generieren"</strong>. 
                    Sobald das Modell die Schülerdaten bündelt, wird der fertige Bericht automatisch hier vollwertig ausgegeben.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ==================== OFFICIAL DOSSIER SIGNATURE FOOTER ==================== */}
        <div className="avoid-break bg-white pt-8 mt-4 border-t border-slate-300">
          <div className="grid grid-cols-2 gap-12 text-center">
            <div className="space-y-12">
              <div className="h-10 border-b border-dashed border-slate-300" />
              <p className="text-[0.5625rem] text-slate-450 font-black uppercase tracking-widest leading-none">
                Unterschrift der Erziehungsberechtigten
              </p>
            </div>
            <div className="space-y-12">
              <div className="h-10 border-b border-dashed border-slate-300" />
              <p className="text-[0.5625rem] text-slate-450 font-black uppercase tracking-widest leading-none">
                Handzeichen der Klassenlehrkraft
              </p>
            </div>
          </div>
          <div className="pt-8 text-center text-[0.5rem] text-slate-300 font-bold uppercase tracking-widest">
            Vertraulich behandeln • Empfängerkreis und Inhalt vor Weitergabe prüfen
          </div>
        </div>

      </div>
    );
  }

  function renderSingleKelPresentation(st: any) {
    const kelRow = getKelDataForStudent(st.id);
    const grades = getStudentGradesSummary(st.id);
    const selfEval = kelRow?.selbsteinschaetzungKind || {};
    const teacherEval = kelRow?.einschaetzungLehrperson || {};

    const dimensions = [
      { key: 'zuhoeren', label: 'Zuhören & Verstehen' },
      { key: 'lesen', label: 'Lesefreude' },
      { key: 'rechnen', label: 'Sicheres Rechnen' },
      { key: 'ausdauer', label: 'Ausdauer & Fokus' },
      { key: 'regeln', label: 'Regeln einhalten' },
    ];

    return (
      <div className="space-y-6 text-left page-break">
        {/* Banner */}
        <div className="border-b-[2pt] border-slate-900 pb-2 flex justify-between items-end avoid-break">
          <div>
            <span className="text-[0.5625rem] bg-slate-900 text-white font-black tracking-widest px-2 py-0.5 rounded uppercase">KEL-PRÄSENTATION</span>
            <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight mt-1">
              Kinder-Eltern-Lehrpersonen Gespräch: {st.vorname} {st.nachname}
            </h2>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-slate-500 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Klasse • SJ {app?.schuljahr}</span>
            <span className="block mt-0.5">Mappe erstellt am: {new Date().toLocaleDateString('de-AT')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-normal">
          {/* Bento Col 1: Performance */}
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-indigo-700 tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 leading-none select-none">
              📊 Leistungs-Übersicht &amp; Klassenstand
            </h4>
            
            <table className="w-full border-collapse text-[0.75rem] leading-tight text-left leading-normal font-bold">
              <thead>
                <tr className="border-b border-slate-300 text-[0.625rem] text-slate-500 uppercase tracking-widest leading-none">
                  <th className="py-2.5">Fachgebiet</th>
                  <th className="py-2.5 text-center">Aktueller dokumentierter Stand</th>
                  <th className="py-2.5 text-right font-medium">Beurteilungsart</th>
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? (
                  grades.map((gr, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2.5 text-slate-800 font-extrabold">{gr.subject}</td>
                      <td className="py-2.5 text-center">
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-black px-2.5 py-0.5 rounded text-[0.6875rem]">
                          {gr.currentDisplay}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 text-[0.625rem] uppercase font-bold">
                        {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400 font-bold italic">Keine Leistungsdaten vorhanden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bento Col 2: Stärken und Auszeichnungen */}
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-amber-600 tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 leading-none select-none">
              ⭐ Stärkenprofil &amp; Leitstern
            </h4>
            <div className="bg-white p-4 rounded-xl border border-slate-205 text-[0.75rem] leading-tight italic font-semibold text-slate-600 leading-relaxed relative">
              <span className="text-[1.875rem] leading-tight text-indigo-200 absolute right-3 bottom-0 leading-none select-none">“</span>
              <p className="z-10 relative">
                {kelRow?.notiz || st.notiz || 'Keine pädagogische Stärkennotiz hinterlegt.'}
              </p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[0.5625rem] uppercase font-black text-slate-400 tracking-wider">Verliehene Badges / Auszeichnungen:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(st.badges && st.badges.length > 0) ? (
                  st.badges.map((b: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[0.625rem] font-black">
                      <span>{b.icon}</span> <span>{b.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[0.625rem] font-bold uppercase border border-slate-200">
                     🌟 Hilfsbereiter Teamplayer
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation section compared */}
        {kpShowSelfAssessment && (
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-slate-700 tracking-wider border-b border-slate-200 pb-1 leading-none select-none">
              🤝 Selbst- und Fremdeinschätzung im Kompetenzgitter (1 = Entwicklungspotenzial, 4 = Ausgezeichnet)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 leading-normal">
              {dimensions.map(dim => {
                const sVal = Number(selfEval[dim.key]?.wert || 3);
                const tVal = Number(teacherEval[dim.key]?.wert || 3);

                return (
                  <div key={dim.key} className="space-y-1 text-[0.75rem] leading-tight font-bold text-slate-800 leading-none">
                    <div className="flex justify-between items-center text-[0.6875rem]">
                      <span>{dim.label}</span>
                      <div className="flex gap-2 text-[0.5625rem] font-black uppercase tracking-wide">
                        <span className="text-emerald-600">Kind: {sVal}</span>
                        <span className="text-indigo-600">Lehrer: {tVal}</span>
                      </div>
                    </div>
                    {/* Visual compare tracks */}
                    <div className="h-6 w-full bg-slate-200 rounded-lg relative ">
                      {/* Kind bar (top half) */}
                      <div className="absolute top-0 left-0 h-3 bg-emerald-500/75 rounded-t-lg transition-all" style={{ width: `${(sVal / 4) * 100}%` }}></div>
                      {/* Lehrer bar (bottom half) */}
                      <div className="absolute bottom-0 left-0 h-3 bg-indigo-600/75 rounded-b-lg transition-all" style={{ width: `${(tVal / 4) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goals protocol placeholders */}
        <div className="border border-slate-300 p-5 rounded-2xl bg-white space-y-3 font-bold">
          <h4 className="text-[0.625rem] font-black uppercase text-slate-700 tracking-wide border-b border-slate-150 pb-1 leading-none select-none">
            🎯 Ziele &amp; Vereinbarungen des KEL-Gesprächs
          </h4>
          <div className="grid grid-cols-3 gap-6 text-[0.625rem] text-slate-400 leading-relaxed uppercase tracking-wider">
            <div className="space-y-1">
              <span>Meine persönlichen Lernziele (Kind):</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
            <div className="space-y-1">
              <span>So unterstützen mich meine Eltern:</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
            <div className="space-y-1">
              <span>Unterstützung durch die Schule:</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="grid grid-cols-3 gap-12 pt-8 text-center uppercase tracking-widest font-black text-slate-400 text-[0.5625rem] leading-none">
          <div className="border-t border-slate-400 pt-2">
            Schülerin / Schüler
          </div>
          <div className="border-t border-slate-400 pt-2">
            Erziehungsberechtigte:r
          </div>
          <div className="border-t border-slate-400 pt-2">
            Klassenlehrkraft
          </div>
        </div>
      </div>
    );
  }

  function renderSeatingPlanView() {
    const placedStudents = students.filter(s => app.sitzplan_schueler?.[s.id]);
    const seats = placedStudents.map(s => app.sitzplan_schueler[s.id]);
    const objs = app.sitzplan_objekte || [];
    
    // Scale and offsets calculation to fit in 100% width A4 page
    let scale = 0.65;
    let offsetX = 30;
    let offsetY = 35;
    
    if (seats.length > 0 || objs.length > 0) {
      const minX = Math.min(...seats.map(s => s.x), ...objs.map(o => o.x), 50);
      const maxX = Math.max(...seats.map(s => s.x + 110), ...objs.map(o => o.x + (o.w || 120)), 950);
      const minY = Math.min(...seats.map(s => s.y), ...objs.map(o => o.y), 50);
      const maxY = Math.max(...seats.map(s => s.y + 70), ...objs.map(o => o.y + (o.h || 60)), 550);
      
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      
      const containerW = 920; // Expanded to fit A4 landscape print box
      const containerH = 460;
      
      const scaleX = contentWidth > 0 ? (containerW / contentWidth) : 1;
      const scaleY = contentHeight > 0 ? (containerH / contentHeight) : 1;
      scale = Math.min(scaleX, scaleY, 0.95);
      
      offsetX = (containerW - (contentWidth * scale)) / 2 - minX * scale;
      offsetY = (containerH - (contentHeight * scale)) / 2 - minY * scale;
    }

    return (
      <div className="space-y-4 text-left">
        {/* Header */}
        <div className="border-b-[2pt] border-slate-900 pb-2 text-center">
          <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest text-slate-900 leading-none">{customHeaderTitle || 'LEHRERCOCKPIT - Sitzplan'}</h3>
          <p className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest mt-1.5 leading-none">
            Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • Schuljahr: {app?.schuljahr} • Plätze: {placedStudents.length} Schüler platziert
          </p>
        </div>

        {/* Scaled plan viewport */}
        <div className="relative w-full border-[1.5pt] border-slate-300 bg-slate-50/50 rounded-2xl select-none overflow-hidden print:border-black print:bg-transparent" style={{ height: '540px' }}>
          
          {/* Board Indicators */}
          {spBoardPosition === 'top' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-1.5 px-12 rounded-b-xl border border-t-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black">
              ▲ Tafel / Vorne ▲
            </div>
          )}
          {spBoardPosition === 'bottom' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-1.5 px-12 rounded-t-xl border border-b-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black">
              ▼ Tafel / Vorne ▼
            </div>
          )}
          {spBoardPosition === 'left' && (
            <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-12 px-1.5 rounded-r-xl border border-l-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ◀ Tafel / Vorne ◀
            </div>
          )}
          {spBoardPosition === 'right' && (
            <div className="absolute top-1/2 right-0 -translate-y-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-12 px-1.5 rounded-l-xl border border-r-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black flex items-center justify-center" style={{ writingMode: 'vertical-rl' }}>
              ▶ Tafel / Vorne ▶
            </div>
          )}

          <div className="absolute inset-0">
            {/* ROOM OBJECTS */}
            {objs.map((o: any, idx: number) => {
              const xPos = o.x * scale + offsetX;
              const yPos = o.y * scale + offsetY;
              const wVal = (o.w || 120) * scale;
              const hVal = (o.h || 60) * scale;

              // Type translation for labeling
              let label = 'Möbel';
              let icon = '📦';
              if (o.type === 'teacher_desk') { label = 'Lehrertisch'; icon = '💼'; }
              else if (o.type === 'blackboard') { label = 'Tafel'; icon = '📋'; }
              else if (o.type === 'door') { label = 'Tür'; icon = '🚪'; }
              else if (o.type === 'window') { label = 'Fenster'; icon = '🖼️'; }

              return (
                <div 
                  key={`obj-${idx}`}
                  className="absolute bg-slate-200 text-slate-700 border-2 border-slate-300 rounded-xl flex flex-col items-center justify-center font-bold text-center text-[0.625rem] leading-tight"
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos}px`,
                    width: `${wVal}px`,
                    height: `${hVal}px`,
                    backgroundColor: o.type === 'teacher_desk' ? '#f1f5f9' : undefined,
                    borderColor: o.type === 'teacher_desk' ? '#94a3b8' : undefined,
                  }}
                >
                  <span className="text-[0.875rem] leading-snug">{icon}</span>
                  <span className="uppercase text-[0.5rem] tracking-wider mt-0.5">{label}</span>
                </div>
              );
            })}

            {/* STUDENTS DESKS */}
            {placedStudents.map(s => {
              const sPos = app.sitzplan_schueler[s.id] || { x: 0, y: 0 };
              const xPos = sPos.x * scale + offsetX;
              const yPos = sPos.y * scale + offsetY;
              const wVal = 110 * scale;
              const hVal = 70 * scale;

              const grades = getStudentGradesSummary(s.id);
              let subtitle = '';
              if (spShowStudentNotes && grades.length > 0) {
                const nonNulls = grades.filter(g => g.average !== null);
                if (nonNulls.length > 0) {
                  const avg = nonNulls.reduce((acc, curr) => acc + (curr.average || 0), 0) / nonNulls.length;
                  subtitle = `Ø ${avg.toFixed(1)}`;
                }
              } else if (spShowStudentDaZ) {
                subtitle = s.zweitsprache ? 'DaZ' : '—';
              } else {
                subtitle = s.geschlecht === 'w' ? 'Mädchen' : 'Knaben';
              }

              return (
                <div 
                  key={`seat-${s.id}`}
                  className={`absolute bg-white rounded-2xl border-2 shadow-3xs flex flex-col items-center justify-center text-center p-1 ${s.geschlecht === 'w' ? 'border-rose-300 bg-rose-50/15' : 'border-sky-300 bg-sky-50/15'}`}
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos}px`,
                    width: `${wVal}px`,
                    height: `${hVal}px`,
                  }}
                >
                  <div className="font-extrabold text-[#000000] text-[0.6875rem] text-wrap leading-tight break-words w-full">
                    {spShowChairsOnly ? 'Frei' : `${s.vorname} ${s.nachname[0]}.`}
                  </div>
                  {!spShowChairsOnly && subtitle && (
                    <div className="text-[0.5rem] font-black text-slate-500 uppercase tracking-wide mt-1.5 leading-none select-none">
                      {subtitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderPdfExportView() {
    const targetSt = students.find(s => s.id === pdfStudentId) || students[0];
    if (!targetSt) return null;
    
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <FileText size={40} />
        </div>
        <h2 className="text-[1.25rem] leading-normal font-black text-slate-800 mb-2 mt-2">PDF erstellen und prüfen</h2>
        <p className="text-[0.875rem] leading-snug font-bold text-slate-500 mb-6 text-center max-w-sm">
          Die Datei wird lokal im Browser erzeugt. Sie ist eine pädagogische Arbeitsübersicht und kein amtliches Dokument.
        </p>
        
        <button
          onClick={async () => {
             const erhebungen = (app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === targetSt.id);
             
             // Dynamic import to split chunk
             const pdfEngine = await import('../lib/pdfEngine');
             if (pdfFormType === 'foerder_uebersicht') {
               await pdfEngine.generateFoerderUebersicht(targetSt, erhebungen);
             }
          }}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-4 rounded-2xl font-black shadow-lg"
        >
          <FileText size={20} />
          {pdfFormType === 'foerder_uebersicht' ? 'Förderübersicht als PDF' : 'PDF exportieren'}
        </button>
      </div>
    );
  }

  function renderUebergabemappeView() {
    const pages: React.ReactNode[] = [];
    const sortedStudents = [...students].sort((a, b) => a.nachname.localeCompare(b.nachname));

    const getGermanWeekday = () => {
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const currentDayName = days[new Date().getDay()];
      if (currentDayName === 'Sonntag' || currentDayName === 'Samstag') return 'Montag';
      return currentDayName;
    };
    const currentWeekday = getGermanWeekday();

    // Cover Page (Page 1)
    if (umShowCoverPage) {
      pages.push(
        <div key="um-cover" className="space-y-8 flex flex-col justify-between p-10 bg-white border border-slate-200 rounded-3xl text-left page-break" style={{ minHeight: '270mm' }}>
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b-[2pt] border-slate-900 pb-4">
              <div>
                <span className="text-[0.59375rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-1 rounded">UEBERGABEMAPPE</span>
                <h1 className="text-[1.875rem] leading-tight font-black text-slate-900 mt-2">Klassen-Übergabemappe</h1>
                <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest mt-0.5">Dokumentation für Vertretungskräfte &amp; Supplierungen</p>
              </div>
              <div className="text-right text-[0.75rem] leading-tight font-bold leading-tight">
                <p className="text-indigo-600 font-black tracking-widest">STUFE: {app?.stufe}.KLASSE</p>
                <p className="text-slate-500">SCHULJAHR: {app?.schuljahr}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Schulklasse / Raum</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{app.klassenbezeichnung || '—'} / {app.selectedRoom || 'Klassenraum'}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Erstellt von Lehrkraft</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{app.lehrerName || app.lehrerProfil?.name || 'Inhaber:in'}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Datum der Ausfertigung</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{new Date().toLocaleDateString('de-AT')}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Anzahl Schüler</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{students.length} Kinder ({students.filter(s => s.geschlecht === 'm').length} K, {students.filter(s => s.geschlecht === 'w').length} M)</p>
              </div>
              {umVertretungsZeitraum && (
                <div className="col-span-2 border-t border-slate-200/60 pt-3">
                  <p className="text-[0.53125rem] font-black uppercase tracking-widest text-rose-500 leading-none mb-1">🤒 Geplanter Vertretungs-Zeitraum (bei Krankheit)</p>
                  <p className="font-black text-rose-700 text-[0.9375rem] leading-snug leading-none">{umVertretungsZeitraum}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">📋 Inhalt dieses Ordners:</h4>
              <div className="space-y-1.5 text-[0.75rem] leading-tight font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Organisiertes Deckblatt &amp; Notfallnummern
                </div>
                {umShowTagesplaene && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Aktueller Tageskatalog &amp; Ablaufbeschreibungen
                  </div>
                )}
                {umShowKlassenliste && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Komplette Schüler-Besonderheitsliste (Gesundheit, DaZ, SPF)
                  </div>
                )}
                {umShowSitzplan && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> LEHRERCOCKPIT-Sitzplan &  Layout
                  </div>
                )}
                {umShowFeedback && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Feedback-Bogen für Supplierstunden
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-rose-200 bg-rose-50/10 p-5 rounded-2xl space-y-3 mt-6">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 select-none">
                🚨 DRINGLICHE NOTFALL-NUMMERN &amp; ABSPRACHEN
              </h4>
              <div className="grid grid-cols-2 gap-4 text-[0.75rem] leading-tight font-bold leading-normal">
                <div>
                  <label className="text-[0.53125rem] font-black uppercase text-rose-500 tracking-wider block mb-0.5">Schulleitung / Direktion</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umSchulleitung}</p>
                </div>
                <div>
                  <label className="text-[0.53125rem] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Kanzlei / Sekretariat</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umSekretariat}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-[0.53125rem] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Ansprechperson Nachbarklasse</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umNachbarKlasse}</p>
                </div>
                {umKrankheitNotes && (
                  <div className="col-span-2 border-t border-rose-250 pt-3">
                    <label className="text-[0.53125rem] font-black uppercase text-rose-600 tracking-wider block mb-1">🤒 Spezielle Anweisungen für die Krankheitsvertretung:</label>
                    <p className="text-rose-950 text-[0.75rem] font-semibold whitespace-pre-wrap leading-relaxed bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">{umKrankheitNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center text-[0.5625rem] text-slate-400 font-bold select-none uppercase tracking-widest leading-relaxed">
            Vertraulich behandeln • Nur an berechtigte Empfänger:innen weitergeben
          </div>
        </div>
      );
    }

    // Tagespläne (Page 2)
    if (umShowTagesplaene) {
      pages.push(
        <div key="um-schedule" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2 flex justify-between items-end">
            <div>
              <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded uppercase">Tagesvertretung</span>
              <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Stundeneinteilung &amp; Lehrstoffe</h1>
            </div>
            <div className="text-right text-[0.75rem] leading-tight font-black">
              Klasse {app.klassenbezeichnung || '—'}
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[0.75rem] leading-tight text-left leading-normal">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-indigo-200 select-none">
                <th className="border border-slate-300 p-2.5 text-center w-12">Std</th>
                <th className="border border-slate-300 p-2.5 text-center w-24">Uhrzeit</th>
                <th className="border border-slate-300 p-2.5 w-32">Unterrichtsfach</th>
                <th className="border border-slate-300 p-2.5">Lehr- &amp; Übungsstoffe / Übungsanleitung</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map(h => {
                const hourTimes = app?.stundenZeiten?.[h] || '--:--';
                return (
                  <tr key={h} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2.5 text-center font-black">{h}</td>
                    <td className="border border-slate-200 p-2.5 text-center text-[0.6875rem] font-semibold text-slate-500">{hourTimes}</td>
                    <td className="border border-slate-200 p-2.5 font-bold uppercase text-indigo-700 tracking-wider">
                      {app?.stammplan?.[currentWeekday]?.[h] || 'Klassenstunde'}
                    </td>
                    <td className="border border-slate-200 p-2.5 text-slate-600 font-semibold whitespace-pre-wrap leading-relaxed">
                      {app.vertretungHinweise || 'Individuelles Lernen, Bucharbeit oder Übungszettel laut Wochenplanung durchführen.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Klassenliste mit Besonderheiten (Page 3)
    if (umShowKlassenliste) {
      pages.push(
        <div key="um-students" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2">
            <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-sans">Klassenliste</span>
            <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Kinderverzeichnis &amp; Päd. Orientierungshilfe</h1>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[0.75rem] leading-tight text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-300 select-none">
                <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                <th className="border border-slate-300 p-2.5 w-44">Name des Kindes</th>
                <th className="border border-slate-300 p-2.5 w-16 text-center">Geschl.</th>
                <th className="border border-slate-300 p-2.5">Besonderheiten / Päd. Hinweise / DaZ-Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((st, i) => (
                <tr key={st.id} className="border-b border-slate-200 even:bg-slate-50/40">
                  <td className="border border-slate-200 p-2 text-center font-bold text-slate-400">{i + 1}</td>
                  <td className="border border-slate-200 p-2 font-black text-slate-800">{st.nachname} {st.vorname}</td>
                  <td className="border border-slate-200 p-2 text-center font-semibold text-slate-500 uppercase">{st.geschlecht}</td>
                  <td className="border border-slate-200 p-2 text-[0.6875rem] font-semibold text-slate-600 leading-normal">
                    {st.notiz || (st.zweitsprache ? `Fremdsprache: ${st.zweitsprache}` : 'Keine gesundheitlichen oder päd. Einschränkungen gemeldet.')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Seating Plan page (Page 4)
    if (umShowSitzplan) {
      pages.push(
        <div key="um-seating" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          {renderSeatingPlanView()}
        </div>
      );
    }

    // Feedback forms page (Page 5)
    if (umShowFeedback) {
      pages.push(
        <div key="um-feedback" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2">
            <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded block w-fit uppercase">QUALITÄTSSICHERUNG</span>
            <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Supplier-Feedback &amp; Tagesbericht</h1>
            <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest mt-0.5">Bitte der Stammlehrperson ausgefüllt auf das Pult legen</p>
          </div>

          <div className="space-y-6 text-slate-700 font-semibold text-[0.75rem] leading-tight mt-4 leading-normal">
            <p className="leading-relaxed">
              Vielen Dank für Ihre Vertretung! Bitte füllen Sie diesen Bogen kurz aus, damit die Stammlehrkraft unmittelbar über die Ereignisse und den Lernfortschritt informiert ist.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">1. Lehrstoff: Was wurde heute im Detail erfolgreich erarbeitet?</span>
                <div className="h-20 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">2. Verhalten &amp; Dynamik: Wie war die Arbeitsstimmung? Gab es besondere Vorkommnisse?</span>
                <div className="h-20 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">3. Hausübung aufgetragen?</span>
                  <div className="flex gap-4 items-center pt-1.5">
                    <span className="inline-block w-4 h-4 border border-slate-300 rounded bg-white"></span><span>Nein</span>
                    <span className="inline-block w-4 h-4 border border-slate-300 rounded bg-white ml-4"></span><span>Ja, Seite/Übung: __________________</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">4. Fehlende Kinder heute:</span>
                  <div className="h-10 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-16 mt-6">
              <div className="border-t border-slate-400 text-center pt-2 text-[0.625rem] text-slate-450 uppercase tracking-widest font-black leading-none">
                Datum &amp; Schulstempel
              </div>
              <div className="border-t border-slate-400 text-center pt-2 text-[0.625rem] text-slate-450 uppercase tracking-widest font-black leading-none">
                Handzeichen der Vertretungskraft
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-10">
        {pages}
      </div>
    );
  }

  // Helper method to draw a single Student Portfolio Dossier page
  function renderSingleKelPortfolio(st: any) {
    const kelRow = getKelDataForStudent(st.id);
    const gradings = getStudentGradesSummary(st.id);

    return (
      <div key={st.id} className="space-y-6 text-left page-break">
        
        {/* Banner header of dossier child */}
        <div className="border-b-2 border-black pb-3 flex justify-between items-end avoid-break">
          <div>
            <span className="text-[0.5625rem] font-black bg-zinc-900 text-white px-2 py-0.5 rounded-[4px] uppercase tracking-wider">SCHÜLER-DOSSIER UND PORTFOLIO</span>
            <h2 className="text-[1.5rem] leading-normal font-black text-black tracking-tight mt-1">
              Dossier: {st.nachname} {st.vorname}
            </h2>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-zinc-550 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Schulstufe • SJ {app?.schuljahr}</span>
            <span className="block mt-1 font-semibold">Geboren am: {st.geburtstag || 'k.A.'}</span>
          </div>
        </div>

        {/* Master details section info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 avoid-break">
          {/* Stammblatt */}
          <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block border-b border-zinc-150 pb-0.5">I. Schüler-Stammdaten</span>
            <div className="grid grid-cols-2 gap-2 text-[0.71875rem] font-semibold text-zinc-700 leading-normal">
              <div><strong>Geschlecht:</strong> {st.geschlecht === 'm' ? 'Männlich' : 'Weiblich'}</div>
              <div><strong>Religion:</strong> {st.religion || 'o.B.'}</div>
              <div><strong>Staat:</strong> {st.staatsbuergerschaft || 'Österreich'}</div>
              <div><strong>Zweitsprache:</strong> {st.zweitsprache || 'keine'}</div>
              <div className="col-span-2 text-zinc-600 font-bold italic mt-2 text-[0.65625rem]">
                Gesichert im schulinternen, passwort-geschützten Datenspeicher
              </div>
            </div>
          </div>

          {/* Absences / Attendance if checked */}
          {kelShowAbsences && (
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-2">
              <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block border-b border-zinc-150 pb-0.5">II. Fehlzeiten aus Präsenzbuch</span>
              <div className="text-[0.71875rem] leading-relaxed">
                <p className="text-zinc-600 font-medium">Laufende Fehlstundenauswertung für {st.vorname}:</p>
                <div className="flex gap-6 mt-2">
                  {(() => {
                    const fs = getStudentFehlstunden(st.id);
                    const justifiedPercent = fs.total > 0 ? Math.round((fs.excused / fs.total) * 100) : 100;
                    return (
                      <>
                        <div className="text-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/50 flex-1">
                          <span className="text-[1.25rem] leading-normal font-black text-black">
                            {fs.total}
                          </span>
                          <span className="text-[0.53125rem] font-black uppercase text-zinc-400 block mt-1">Fehlstunden ({fs.excused}e / {fs.unexcused}u)</span>
                        </div>
                        <div className="text-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/50 flex-1">
                          <span className="text-[1.25rem] leading-normal font-black text-black">{justifiedPercent}%</span>
                          <span className="text-[0.53125rem] font-black uppercase text-zinc-400 block mt-1">Gerechtfertigt</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grades summary matrix */}
        {kelShowGrades && gradings.length > 0 && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">III. Leistungsüberblick (dokumentierte Semesterstände)</h3>
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white">
              <table className="w-full">
                <thead>
                  <tr className="text-left font-black text-[0.59375rem] text-zinc-400 uppercase border-b border-zinc-200 pb-1">
                    <th className="pb-1">Pflichtgegenstand / Fach</th>
                    <th className="pb-1 text-center w-56">Aktueller Stand</th>
                    <th className="pb-1 text-right w-44">Beurteilungsart</th>
                  </tr>
                </thead>
                <tbody>
                  {gradings.map((gr, gx) => (
                    <tr key={gx} className="border-b border-zinc-150 last:border-0 py-2.5">
                      <td className="py-2.5 font-black text-black">{gr.subject}</td>
                      <td className="py-2.5 text-center font-black text-zinc-800 text-[0.75rem] leading-snug">
                        {gr.currentDisplay}
                      </td>
                      <td className="py-2.5 text-right text-zinc-500 text-[0.6875rem] font-bold uppercase">
                        {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KEL specific comparative assessments */}
        {kelShowSelfAssessment && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">IV. Selbst- & Fremdeinschätzungsabgleich (Aus KEL-Vorbereitung)</h3>
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-3 text-[0.6875rem] font-semibold text-zinc-700 leading-relaxed">
              <div className="grid grid-cols-1 gap-3">
                {STANDARD_KEL_BEREICHE.map(field => {
                  const dbKind = kelRow?.selbsteinschaetzungKind?.[field.id];
                  const dbLehr = kelRow?.einschaetzungLehrperson?.[field.id];
                  
                  if (!dbKind?.kommentar && !dbLehr?.kommentar) return null;
                  return (
                    <div key={field.id} className="border-b border-zinc-150 last:border-0 pb-3 last:pb-0 space-y-2">
                      <span className="font-black text-black text-[0.71875rem] tracking-tight">{field.label} ({field.kategorie}):</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[0.53125rem] font-black uppercase text-indigo-700 tracking-wider block">Kind</span>
                          <p className="italic text-zinc-650 font-bold">{dbKind?.kommentar || 'Keine Anmerkung'}</p>
                        </div>
                        <div className="space-y-1 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[0.53125rem] font-black uppercase text-emerald-700 tracking-wider block">Lehrperson</span>
                          <p className="italic text-zinc-650 font-bold">{dbLehr?.kommentar || 'Keine Anmerkung'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!kelRow || !STANDARD_KEL_BEREICHE.some(f => kelRow.selbsteinschaetzungKind?.[f.id]?.kommentar || kelRow.einschaetzungLehrperson?.[f.id]?.kommentar)) && (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center">
                    <span className="text-[0.625rem] font-black uppercase tracking-wider text-zinc-500">Noch keine Einschätzungen erfasst</span>
                    <p className="mt-1 text-[0.6875rem] font-medium text-zinc-500">Für dieses Kind liegen noch keine KEL-Kommentare vor.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KEL Portfolio entries & achievements contract if checked */}
        {kelShowPortfolio && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">V. Erarbeitete Zielvereinbarung & Meilensteine</h3>
            <div className="border border-zinc-450 p-4 rounded-[20px] bg-zinc-50 text-[0.71875rem] space-y-3 font-semibold leading-relaxed">
              {kelRow?.vereinbarungen ? (
                <div className="whitespace-pre-wrap text-zinc-800 font-bold bg-white p-3.5 rounded-xl border border-zinc-250 leading-relaxed">
                  {kelRow.vereinbarungen}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start py-1 border-b border-zinc-200 pb-1.5">
                    <span className="w-5 h-5 bg-zinc-800 text-white rounded flex items-center justify-center font-black text-[0.5625rem] shrink-0">1</span>
                    <div>
                      <span className="font-black text-black">Kompetenzziel:</span> Einteilen von Malreihen (ZR 100) fehlerfrei anwenden.
                      <span className="text-[0.5625rem] text-zinc-400 block font-bold uppercase mt-0.5">Woran erkennbar: Wöchentliche LZK-Hefteintragung</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start py-1 border-b border-zinc-200/60 pb-1.5 last:border-0">
                    <span className="w-5 h-5 bg-zinc-800 text-white rounded flex items-center justify-center font-black text-[0.5625rem] shrink-0">2</span>
                    <div>
                      <span className="font-black text-black">Sozialkompetenz:</span> Konstruktives Mitwirken im Morgenkreis ohne Nebengespräche.
                      <span className="text-[0.5625rem] text-zinc-400 block font-bold uppercase mt-0.5">Woran erkennbar: Selbsterhobene Emoji-Tracker-Sticker</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature contract area block */}
        <div className="pt-12 avoid-break font-black text-center text-zinc-500 text-[0.625rem] grid grid-cols-3 gap-4">
          {kelSignatures.map(sig => (
            <div key={sig} className="space-y-1 leading-normal">
              <div className="border-b border-black w-40 mx-auto pb-7"></div>
              <span className="uppercase tracking-widest text-zinc-400">{sig}</span>
            </div>
          ))}
        </div>

      </div>
    );
  }
}

// Compact clock icon component fallback as we import custom ones
function ClockIconFallback({ size = 16 }: { size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
  async function handleDownloadKlassenbuchDocx() {
    const weeks = getKbWeeksToRender();
    const selected = weeks.map(kw => {
      const dates = kwToDates(kw);
      return {
        title: `KW ${kw} · ${dates.monday.toLocaleDateString('de-AT')} – ${dates.friday.toLocaleDateString('de-AT')}`,
        subtitle: dates.sw ? `Schulwoche ${dates.sw}` : undefined,
        categories: compileKlassenbuchData(kw),
      };
    });
    const name = [app?.anrede, app?.vorname, app?.nachname].filter(Boolean).join(' ')
      || app?.lehrerName || app?.lehrerProfil?.name || '';
    const safeClass = String(app?.klassenbezeichnung || 'Klasse').replace(/[^a-zA-Z0-9_-]+/g, '_');
    await downloadKlassenbuchDocx(`Klassio_Klassenbuch_${safeClass}_KW_${weeks[0] || kbKW}.docx`, {
      title: `Klassenbuch · ${app?.schuljahr || ''}`,
      className: app?.klassenbezeichnung || '',
      schoolYear: app?.schuljahr || '',
      teacherName: name,
      sections: selected,
    });
  }

  function handleDownloadKlassenbuchPdf() {
    const weeks = getKbWeeksToRender();
    const teacherName = [app?.anrede, app?.vorname, app?.nachname]
      .filter(Boolean)
      .join(' ')
      || app?.lehrerName
      || app?.lehrerProfil?.name
      || '';

    const pdfWeeks = weeks.map((kw) => {
      const dates = kwToDates(kw);
      const dateRange = `${dates.monday.toLocaleDateString('de-AT')} – ${dates.friday.toLocaleDateString('de-AT')}`;
      const categories = compileKlassenbuchData(kw);

      if (!kbIncludeOccurrences) {
        // Hiding appointments may not erase lessons with an unknown subject.
        categories['Besondere Vorkommnisse'] = categories['Besondere Vorkommnisse']
          .filter(entry => !entry.includes(' · Termin: '));
      }

      return {
        kw,
        sw: dates.sw,
        dateRange,
        categories,
        absentees: getAbsenteesForWeek(kw),
        notes: kbCustomNotesValue.trim() || undefined,
      };
    });

    const safeClass = String(app?.klassenbezeichnung || 'Klasse')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Klasse';
    const rangeLabel = kbMode === 'single'
      ? `KW_${kbKW}`
      : kbMode === 'all'
        ? 'Gesamt'
        : `KW_${kbStartKW}_bis_${kbEndKW}`;

    downloadKlassenbuchPdf(
      `Klassio_Klassenbuch_${safeClass}_${rangeLabel}.pdf`,
      {
        className: app?.klassenbezeichnung || '',
        schoolYear: app?.schuljahr || '',
        teacherName,
        weeks: pdfWeeks,
        includeAbsentees: kbIncludeAbsentees,
        includeOccurrences: kbIncludeOccurrences,
        signatures: kbSignatures,
      },
    );
  }

  function renderSingleKlassenbuchPage(targetKW: number) {
    const pageKbData = compileKlassenbuchData(targetKW);
    const pageAbsenteesList = getAbsenteesForWeek(targetKW);
    const pageDates = kwToDates(targetKW);

    const monStr = `${pageDates.monday.getDate()}.${pageDates.monday.getMonth() + 1}.`;
    const friStr = `${pageDates.friday.getDate()}.${pageDates.friday.getMonth() + 1}.${pageDates.friday.getFullYear()}`;
    const kbHeaderDateStr = `(${monStr}-${friStr})`;

    const printableCategories = Object.entries(pageKbData).filter(([category]) =>
      kbIncludeOccurrences || category !== 'Besondere Vorkommnisse'
    );

    const classTeacherName = [app?.anrede, app?.vorname, app?.nachname]
      .filter(Boolean)
      .join(' ')
      || app?.lehrerName
      || app?.lehrerProfil?.name
      || '';

    return (
      <div className="space-y-2.5 print:space-y-2 font-sans">
        <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-1.5">
          <div>
            <p className="text-[0.5625rem] font-black uppercase tracking-[0.16em] text-slate-400">KLASSENBUCH</p>
            <p className="text-[0.8125rem] font-black leading-tight text-slate-900">
              {app?.klassenbezeichnung || 'Klasse'}
            </p>
          </div>
          <div className="text-right text-[0.5625rem] font-semibold leading-tight text-slate-500">
            {app?.schuljahr && <div>Schuljahr {app.schuljahr}</div>}
            {classTeacherName && <div>{classTeacherName}</div>}
          </div>
        </div>

        {/* A4-Wochenblatt */}
        <table className="w-full border-collapse border-2 border-slate-900 text-black">
          <thead>
            <tr>
              <th colSpan={2} className="bg-slate-900 border-b-2 border-slate-900 p-3 text-center text-[0.875rem] font-black tracking-wide text-white uppercase">
                {pageDates.sw}. Schulwoche {kbHeaderDateStr}
              </th>
            </tr>
            <tr className="bg-slate-100 border-b border-slate-400">
              <th className="w-[34%] border-r border-slate-400 px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider text-slate-600">
                Fach / Unterbereich
              </th>
              <th className="px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider text-slate-600">
                Unterricht / Inhalt
              </th>
            </tr>
          </thead>
          <tbody>
            {printableCategories.map(([category, entries]) => {
              const parsedCategory = splitKlassenbuchCategoryKey(category);
              return (
                <tr key={category} className="avoid-break border-b border-slate-300 last:border-b-0">
                  <td className="border-r border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-800">
                    <span className="block text-[0.65625rem] font-black leading-tight">
                      {parsedCategory.subject}
                    </span>
                    {parsedCategory.subarea && (
                      <span className="mt-0.5 block text-[0.5625rem] font-bold leading-tight text-slate-500">
                        {parsedCategory.subarea}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-[0.65625rem] font-semibold leading-snug text-slate-800 whitespace-pre-wrap">
                    {entries.length > 0 ? entries.join(' · ') : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Absences / Fehlstunden section */}
        {kbIncludeAbsentees && (
          <div className="space-y-1 pt-1.5 avoid-break">
            <h4 className="text-[0.71875rem] font-black uppercase tracking-wider text-zinc-500 border-b border-[#000000]/10 pb-0.5 flex items-center gap-1.5">
              <Clock size={12} className="text-zinc-500" />
              <span>Erfasste Fehlstunden & Abwesenheiten</span>
            </h4>
            {pageAbsenteesList.length > 0 ? (
              <div className="border border-zinc-300 bg-zinc-50 divide-y divide-zinc-200">
                {pageAbsenteesList.map((abs, idx) => (
                  <div key={idx} className="px-2.5 py-1 flex justify-between items-center gap-3 text-[0.625rem] font-semibold">
                    <span className="text-zinc-900 font-bold">{abs.name}</span>
                    <span className="text-zinc-600 text-right">{abs.info}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 text-[0.6875rem] leading-tight italic py-1 px-1">Keine Fehlstunden in dieser Woche erfasst.</p>
            )}
          </div>
        )}

        {/* Special Vorkommnisse text block */}
        {kbIncludeOccurrences && kbCustomNotesValue.trim() && (
          <div className="space-y-1 pt-1.5 avoid-break">
            <h4 className="text-[0.65625rem] font-black uppercase tracking-wider text-zinc-500 border-b border-[#000000]/10 pb-0.5">Pädagogische Zusatznotizen & Ereignisse</h4>
            <div className="border border-zinc-300 p-2 bg-zinc-50 text-[0.625rem] font-semibold text-zinc-700 whitespace-pre-wrap leading-snug">
              {kbCustomNotesValue}
            </div>
          </div>
        )}

        {/* Signatures sections */}
        {kbSignatures.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 avoid-break text-center">
            {kbSignatures.map(sigName => (
              <div key={sigName} className="space-y-1 inline-block">
                <div className="border-b border-black w-32 mx-auto pb-3"></div>
                <span className="text-[0.5625rem] uppercase font-black tracking-widest text-[#000000]/50">{sigName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 8. TEMPLATE PREVIEW RENDER SWITCHBOARDERS
  function renderPreviewTemplate() {
    switch (activeTemplate) {
      
      // A. SCHUELERLISTE
      case 'schuelerliste':
        return (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between items-baseline">
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || 'Schülerliste & Stammdaten'}</h3>
              <span className="text-[0.625rem] font-bold text-zinc-500">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung} • Gesamt: {processedStudentsList.length} Kinder</span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5pt] border-black text-left">
                  <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider w-10 text-zinc-600">Nr.</th>
                  <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-650">Name, Vorname</th>
                  {slShowBirthday && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-28">Geboren am</th>}
                  {slShowGender && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Geschl.</th>}
                  {slShowReligion && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-24">Rel.</th>}
                  {slShowLevel && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-20">Stufe</th>}
                  {slShowBesuchsjahr && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Besuchsj.</th>}
                  {slShowDaZ && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-16">DaZ</th>}
                  {slShowErstsprache && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Erstsprache</th>}
                  {slShowZweitsprache && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Zweitsprache</th>}
                  {slShowNationality && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Staatsb.</th>}
                  {slShowAddress && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Adresse</th>}
                  {slShowPhoneMother && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Tel. Mutter</th>}
                  {slShowPhoneFather && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Tel. Vater</th>}
                  {slShowEmailParents && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">E-Mail Eltern</th>}
                  {slShowSvNummer && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">SV-Nr.</th>}
                  {slShowIkmNummer && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">IKM-Nr.</th>}
                  {slShowGroups && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center">Gruppen</th>}
                  {slShowFehlstunden && <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 text-center w-28">Fehlstunden</th>}
                  {slShowNotes && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-left min-w-[12rem] max-w-[20rem]">
                      Besondere Hinweise
                    </th>
                  )}
                  {slShowAllergies && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-left min-w-[12rem] max-w-[20rem]">
                      Allergien & Unverträglichkeiten
                    </th>
                  )}
                  {slShowFotoFreigabe && (
                    <th className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 text-center min-w-[10rem]">
                      Foto-Freigabe
                    </th>
                  )}
                  {slCustomCols.slice(0, slCustomColsCount).map((cn, ci) => (
                    <th key={ci} className="py-2.5 px-2 text-[0.625rem] font-black uppercase tracking-wider border-l border-zinc-300 text-center text-zinc-500">{cn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedStudentsList.map((st, sidx) => {
                  const formatAddress = () => {
                    const parts = [
                      st.anschrift,
                      st.plz && st.ort ? `${st.plz} ${st.ort}` : st.plz || st.ort
                    ].filter(Boolean);
                    return parts.length > 0 ? parts.join(', ') : '—';
                  };

                  return (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/50">
                      <td className="py-2 px-2 font-bold text-zinc-400 text-[0.6875rem]">{sidx + 1}</td>
                      <td className="py-2 px-2 font-black text-black text-[0.71875rem] max-w-[12rem] text-wrap leading-tight break-words" title={`${st.nachname}, ${st.vorname}`}>{st.nachname}, {st.vorname}</td>
                      {slShowBirthday && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.geburtstag || st.geburtsdatum || '—'}</td>}
                      {slShowGender && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] uppercase">{st.geschlecht || '—'}</td>}
                      {slShowReligion && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.religion || 'o.B.'}</td>}
                      {slShowLevel && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{app?.stufe || st.besuchsjahr || '—'}. Schulj.</td>}
                      {slShowBesuchsjahr && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.besuchsjahr ? `${st.besuchsjahr}. BJ` : '—'}</td>}
                      {slShowDaZ && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.daz ? 'Ja' : 'Nein'}</td>}
                      {slShowErstsprache && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.erstsprache || '—'}</td>}
                      {slShowZweitsprache && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.zweitsprache || '—'}</td>}
                      {slShowNationality && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.staatsbuergerschaft || '—'}</td>}
                      {slShowAddress && <td className="py-2 px-2 font-semibold text-zinc-500 text-[0.65625rem] max-w-[14rem] text-wrap leading-tight break-words" title={formatAddress()}>{formatAddress()}</td>}
                      {slShowPhoneMother && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.telefon_mutter || '—'}>{st.telefon_mutter || '—'}</td>}
                      {slShowPhoneFather && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.telefon_vater || '—'}>{st.telefon_vater || '—'}</td>}
                      {slShowEmailParents && <td className="py-2 px-2 font-semibold text-zinc-500 text-[0.65625rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.email_eltern || '—'}>{st.email_eltern || '—'}</td>}
                      {slShowSvNummer && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.sv_nummer || '—'}</td>}
                      {slShowIkmNummer && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">{st.ikmNummer || '—'}</td>}
                      {slShowGroups && <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem] max-w-[10rem] text-wrap leading-tight break-words" title={st.gruppen?.join(', ') || '—'}>{st.gruppen?.join(', ') || '—'}</td>}
                      {slShowFehlstunden && (
                        <td className="py-2 px-2 font-semibold text-zinc-500 text-center text-[0.6875rem]">
                          {(() => {
                            const fs = getStudentFehlstunden(st.id);
                            return `${fs.total} Std. (${fs.excused} e / ${fs.unexcused} u)`;
                          })()}
                        </td>
                      )}
                      {slShowNotes && (
                        <td className="py-2 px-2 font-medium text-zinc-700 text-[0.6875rem] max-w-[20rem] text-wrap leading-tight break-words whitespace-pre-line" title={st.notiz || ''}>
                          {st.notiz && st.notiz.trim() ? (
                            <span>{st.notiz.trim()}</span>
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {slShowAllergies && (
                        <td className="py-2 px-2 font-medium text-zinc-700 text-[0.6875rem] max-w-[20rem] text-wrap leading-tight break-words whitespace-pre-line" title={st.allergien || ''}>
                          {st.allergien && st.allergien.trim() ? (
                            <span>{st.allergien.trim()}</span>
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {slShowFotoFreigabe && (
                        <td className="py-2 px-2 font-semibold text-center text-[0.6875rem] max-w-[12rem] text-wrap leading-tight break-words">
                          {st.fotoFreigabe === 'erlaubt' && (
                            <span className="text-emerald-700 font-bold">Foto: erlaubt</span>
                          )}
                          {st.fotoFreigabe === 'nur_homepage' && (
                            <span className="text-amber-800 font-bold">Foto: nur Schulhomepage</span>
                          )}
                          {st.fotoFreigabe === 'nicht_erlaubt' && (
                            <span className="text-rose-700 font-bold">Foto: nicht erlaubt</span>
                          )}
                          {!st.fotoFreigabe && (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                      )}
                      {Array.from({ length: slCustomColsCount }).map((_, cidx) => (
                        <td key={cidx} className="border-l border-zinc-300 py-2 px-2"></td>
                      ))}
                    </tr>
                  );
                })}
                {processedStudentsList.length === 0 && (
                  <tr>
                    <td colSpan={25} className="py-8 text-center font-bold text-zinc-400">Keine Schülerergebnisse gemappt. Bitte fügen Sie Schüler hinzu.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      // B. CHECKLISTE
      case 'checkliste': {
        const abbreviateHeader = (title: string, maxLength: number = 10): string => {
          if (!title) return '';
          let t = title.trim();
          if (t.length <= maxLength) return t;

          const replacements: Record<string, string> = {
            'lernzielkontrolle': 'LZK',
            'schularbeit': 'SA',
            'wochenplan': 'WOPL',
            'hausübung': 'HÜ',
            'hausübungen': 'HÜ',
            'mitarbeit': 'MA',
            'mitarbeiter': 'MA',
            'mittelwert': 'Ø',
            'durchschnitt': 'Ø',
            'notenspiegel': 'Noten',
            'schwerpunkt': 'SP'
          };

          let lower = t.toLowerCase();
          for (const [key, value] of Object.entries(replacements)) {
            if (lower.includes(key)) {
              t = t.replace(new RegExp(key, 'gi'), value);
              lower = t.toLowerCase();
            }
          }

          if (t.length <= maxLength) return t;

          // Split words and abbreviate individual long words
          const words = t.split(' ');
          const shortenedWords = words.map(word => {
            if (word.length > 7 && !word.includes('.') && !word.match(/^\d/)) {
              return word.substring(0, 5) + '.';
            }
            return word;
          });

          const result = shortenedWords.join(' ');
          if (result.length > maxLength) {
            return result.substring(0, maxLength - 1) + '…';
          }
          return result;
        };

        let colsToRender: { id: string; title: string; type: string; idx?: number }[] = [];
        if (clSyncMode === 'notenmappe') {
          const cfg = getFachCfg(app, clSelectedSubject);
          const colCounts = app.notenMeta?.[clSelectedSubject]?.colCounts || { lzk: 4, wp: 4, obj: 4 };

          // Schularbeiten (SA)
          if (cfg.sa) {
            const saCount = cfg.saCount || 2;
            for (let i = 0; i < saCount; i++) {
              colsToRender.push({
                id: `sa-${i}`,
                title: `${getNotenLabel(app, clSelectedSubject, 'sa', 'SA')} ${i + 1}`,
                type: 'sa',
                idx: i
              });
            }
          }
          // Lernzielkontrollen (LZK)
          if (cfg.lzk) {
            const count = colCounts.lzk || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.lzk?.[i] || `${getNotenLabel(app, clSelectedSubject, 'lzk', 'LZK')} ${i + 1}`;
              colsToRender.push({
                id: `lzk-${i}`,
                title: label,
                type: 'lzk',
                idx: i
              });
            }
          }
          // Wochenplan (WP)
          if (cfg.wp) {
            const count = colCounts.wp || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.wp?.[i] || `${getNotenLabel(app, clSelectedSubject, 'wp', 'WOPL')} ${i + 1}`;
              colsToRender.push({
                id: `wp-${i}`,
                title: label,
                type: 'wp',
                idx: i
              });
            }
          }
          // Kunstobjekt / Werkstück (OBJ)
          if (cfg.obj) {
            const count = colCounts.obj || 4;
            for (let i = 0; i < count; i++) {
              const label = app.notenMeta?.[clSelectedSubject]?.colLabels?.obj?.[i] || `${getNotenLabel(app, clSelectedSubject, 'obj', 'Objekt')} ${i + 1}`;
              colsToRender.push({
                id: `obj-${i}`,
                title: label,
                type: 'obj',
                idx: i
              });
            }
          }
          // Hausübungen Average/Punkte
          if (cfg.hue) {
            colsToRender.push({
              id: 'hue',
              title: getNotenLabel(app, clSelectedSubject, 'hue', 'HÜ'),
              type: 'hue'
            });
          }
          // Mitarbeit / Points
          if (cfg.g.mi > 0) {
            colsToRender.push({
              id: 'mi',
              title: getNotenLabel(app, clSelectedSubject, 'mi', 'Mitarbeit'),
              type: 'mi'
            });
          }
          // Computed Average Grade (Mittelwert)
          colsToRender.push({
            id: 'average',
            title: 'Ø Note',
            type: 'average'
          });
        } else {
          colsToRender = clCols.map(c => ({ id: c.id, title: c.title, type: 'blank' }));
        }

        const effectiveTitle = clSyncMode === 'notenmappe' 
          ? `Notenspiegel: ${clSelectedSubject}` 
          : clTitle;

        return (
          <div className="space-y-3 print:space-y-2.5">
            <div className="border-b-2 border-black pb-1.5 flex justify-between items-end">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || effectiveTitle}</h3>
                <p className="text-[0.59375rem] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 animate-fade-in">
                  Klassenliste {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • SJ {app?.schuljahr}
                </p>
              </div>
              <div className="flex gap-4 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 pb-1">
                <span>Datum: __________________</span>
              </div>
            </div>

            <div className="w-full ">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b-[1.5pt] border-black text-left font-semibold">
                    {clShowNumbers && <th className="py-2 px-1.5 text-[0.5625rem] font-black uppercase tracking-wider text-zinc-650 w-10 text-center">Nr.</th>}
                    <th className="py-2 px-2 text-[0.5625rem] font-black uppercase tracking-wider border-r-[1.5pt] border-black text-zinc-700 w-44">Name des Kindes</th>
                    {colsToRender.map((col) => (
                      <th key={col.id} title={col.title} className="py-2 px-1 text-[0.53125rem] md:text-[0.5625rem] font-black uppercase tracking-wider text-center border-r border-zinc-200 text-zinc-650 last:border-r-0 text-wrap leading-tight break-words">
                        {abbreviateHeader(col.title, 8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, i) => (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/20">
                      {clShowNumbers && <td className="py-1.5 px-1 font-bold text-zinc-400 text-center text-[0.65625rem]">{i + 1}</td>}
                      <td className="py-1.5 px-2 font-black text-zinc-850 border-r-[1.5pt] border-zinc-400 text-[0.6875rem] text-wrap leading-tight break-words" title={`${st.nachname} ${st.vorname}`}>{st.nachname} {st.vorname}</td>
                      {colsToRender.map(col => {
                        let val = '';
                        if (clSyncMode === 'notenmappe') {
                          const nd: any = app.noten?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0 };
                          if (col.type === 'sa' && col.idx !== undefined) {
                            val = String(nd.sa?.[col.idx] ?? '-');
                          } else if (col.type === 'lzk' && col.idx !== undefined) {
                            val = String(nd.lzk?.[col.idx] ?? '-');
                          } else if (col.type === 'wp' && col.idx !== undefined) {
                            val = String(nd.wp?.[col.idx] ?? '-');
                          } else if (col.type === 'obj' && col.idx !== undefined) {
                            val = String(nd.aufgaben?.[col.idx] ?? '-');
                          } else if (col.type === 'hue') {
                            val = String(nd.hue ?? 0);
                          } else if (col.type === 'mi') {
                            val = String(app.mitarbeit?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || 0);
                          } else if (col.type === 'average') {
                            const computed = berechne(app, st.id, clSelectedSubject, clSelectedSemester);
                            val = computed !== null ? computed.toFixed(1) : '-';
                          }
                        }
                        return (
                          <td key={col.id} className="border-r border-zinc-250 py-1.5 px-1 text-center last:border-r-0 text-[0.625rem] md:text-[0.65625rem]">
                            {clSyncMode === 'notenmappe' ? (
                              <span className={col.type === 'average' ? "font-black text-indigo-700 bg-indigo-50/70 px-1 py-0.5 rounded border border-indigo-200 text-[0.625rem]" : "font-bold text-zinc-800"}>
                                {val}
                              </span>
                            ) : (
                              <div className="w-3.5 h-3.5 mx-auto border border-zinc-300 rounded-sm"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* Average calculations row if enabled */}
                  {clShowAverageRow && (
                    <tr className="border-t-2 border-zinc-400 bg-zinc-50/80 font-black">
                      <td colSpan={clShowNumbers ? 2 : 1} className="py-2 px-2 border-r-[1.5pt] border-zinc-400 text-[0.5625rem] text-zinc-700 tracking-wide uppercase font-black font-semibold">
                        Ø-Durchschnitt / Erfüllt %
                      </td>
                      {colsToRender.map(col => {
                        let colAvgStr = '______';
                        if (clSyncMode === 'notenmappe') {
                          const vals: number[] = [];
                          students.forEach(st => {
                            const nd: any = app.noten?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0 };
                            if (col.type === 'sa' && col.idx !== undefined) {
                              const n = nd.sa?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'lzk' && col.idx !== undefined) {
                              const n = nd.lzk?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'wp' && col.idx !== undefined) {
                              const n = nd.wp?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'obj' && col.idx !== undefined) {
                              const n = nd.aufgaben?.[col.idx];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'hue') {
                              const n = nd.hue;
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'mi') {
                              const n = app.mitarbeit?.[st.id]?.[clSelectedSubject]?.[clSelectedSemester];
                              if (typeof n === 'number') vals.push(n);
                            } else if (col.type === 'average') {
                              const n = berechne(app, st.id, clSelectedSubject, clSelectedSemester);
                              if (n !== null) vals.push(n);
                            }
                          });
                          if (vals.length > 0) {
                            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                            colAvgStr = mean.toFixed(2);
                          } else {
                            colAvgStr = '-';
                          }
                        }
                        return (
                          <td key={col.id} className="border-r border-zinc-250 py-2 px-1 text-center text-zinc-750 font-black last:border-r-0 text-[0.625rem]">
                            {colAvgStr}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // B2. ZEUGNIS NOTENLISTE
      case 'zeugnis_noten': {
        const titleText = znSemester === '1'
          ? 'Semester-Notenspiegel · 1. Semester'
          : 'Semester-Notenspiegel · 2. Semester';
        
        return (
          <div className="space-y-4 print:space-y-2.5">
            <div className="border-b-2 border-black pb-1.5 flex justify-between items-end">
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || titleText}</h3>
                <p className="text-[0.59375rem] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Klassenliste {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • SJ {app?.schuljahr} • Semester: {znSemester}. Halbjahr
                </p>
              </div>
              <div className="flex gap-4 text-[0.625rem] font-black uppercase tracking-wider text-zinc-550 pb-1 no-print">
                <span className="text-amber-600 font-extrabold">⚠️ Orange umrandet = Manuell überschrieben</span>
                <span className="text-emerald-600 font-extrabold">✓ Grün umrandet = Berechnet (Live-Sync)</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b-[1.5pt] border-black text-left font-semibold bg-zinc-50/50">
                    {clShowNumbers && (
                      <th className="py-2 px-1 text-[0.5625rem] font-black uppercase tracking-wider text-zinc-650 w-8 text-center">
                        Nr.
                      </th>
                    )}
                    <th className="py-2 px-2 text-[0.5625rem] font-black uppercase tracking-wider border-r-[1.5pt] border-black text-zinc-700 w-44">
                      Schüler:in
                    </th>
                    {znSelectedSubjects.map(f => {
                      const isFachActive = !app.faecher || app.faecher.includes(f);
                      return (
                        <th 
                          key={f} 
                          className={`py-2 px-1 text-[0.53125rem] font-black uppercase tracking-wider text-center border-r border-zinc-200 text-zinc-650 text-wrap leading-tight break-words`}
                        >
                          <div>{f}</div>
                          {!isFachActive && (
                            <div className="text-[0.4375rem] lowercase text-zinc-400 font-bold no-print tracking-normal">inaktiv</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, sidx) => (
                    <tr key={st.id} className="border-b border-zinc-200 even:bg-zinc-50/20">
                      {clShowNumbers && (
                        <td className="py-1 px-1 font-bold text-zinc-400 text-center text-[0.65625rem]">
                          {sidx + 1}
                        </td>
                      )}
                      <td 
                        className="py-1 px-2 font-black text-zinc-850 border-r-[1.5pt] border-zinc-400 text-[0.6875rem] text-wrap leading-tight break-words"
                        title={`${st.nachname} ${st.vorname}`}
                      >
                        {st.nachname} {st.vorname}
                      </td>
                      {znSelectedSubjects.map(f => {
                        const isFachActive = !app.faecher || app.faecher.includes(f);
                        const nd: any = app.noten?.[st.id]?.[f]?.[znSemester] || {};
                        const mode = getAssessmentMode(app, f);
                        const manualGrade = nd.endnote || '';
                        const calculatedNum = isFachActive ? berechne(app, st.id, f, znSemester) : null;
                        const hasManual = mode === 'grades' && !!nd.endnote;
                        const displayValue = mode === 'grades'
                          ? (hasManual ? String(manualGrade) : calculatedNum !== null ? Number(calculatedNum).toFixed(1) : '')
                          : calculatedNum !== null
                            ? `${Math.round(Number(calculatedNum))}%`
                            : '';

                        return (
                          <td
                            key={f}
                            className="border-r border-zinc-200 py-1 px-1 text-center last:border-r-0 text-[0.625rem]"
                          >
                            <div className="flex items-center justify-center">
                              {mode === 'grades' ? (
                                <>
                                  <select
                                    value={hasManual ? String(manualGrade) : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setApp(prev => {
                                        const currentNoten = prev.noten || {};
                                        const sidData = currentNoten[st.id] || {};
                                        const fachData = sidData[f] || {};
                                        const semData = fachData[znSemester] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };

                                        return {
                                          ...prev,
                                          noten: {
                                            ...currentNoten,
                                            [st.id]: {
                                              ...sidData,
                                              [f]: {
                                                ...fachData,
                                                [znSemester]: {
                                                  ...semData,
                                                  endnote: val
                                                }
                                              }
                                            }
                                          }
                                        };
                                      });
                                    }}
                                    className={`no-print w-full max-w-[50px] bg-white border rounded-lg py-0.5 px-0.5 text-center font-bold text-[0.6875rem] outline-none transition-all cursor-pointer ${
                                      hasManual
                                        ? 'border-amber-400 text-amber-700 bg-amber-50/20 focus:ring-1 focus:ring-amber-400'
                                        : calculatedNum !== null
                                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-400'
                                          : 'border-slate-200 text-slate-400 hover:border-slate-300 focus:ring-1 focus:ring-slate-300'
                                    }`}
                                  >
                                    <option value="">–</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                    <option value="SPF">SPF</option>
                                    <option value="ESPF">ESPF</option>
                                  </select>
                                  <span className="hidden print:inline font-bold text-zinc-900 text-[0.7125rem]">
                                    {displayValue || '—'}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-zinc-700 text-[0.6875rem]">
                                  {displayValue || '—'}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-dashed border-zinc-200 flex justify-between items-center text-[0.5625rem] text-zinc-400 font-bold uppercase tracking-wider">
              <span>* SPF/ESPF = Sonderpädagogischer Förderbedarf / Erhöhter sonderpädagogischer Förderbedarf</span>
              <span>Druckdatum: {new Date().toLocaleDateString('de-AT')} • Erstellt mit Klassio</span>
            </div>
          </div>
        );
      }

      // C. WOCHENPLAN
      case 'wochenplan':
        const daysWp = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        const subInfoList = [1, 2, 3, 4, 5, 6, 7, 8];
        const lessonsData = (app?.wochenplanung || {})[wpKW] || {};

        return (
          <div className="space-y-4">
            <div className="border-b-2 border-black pb-2 flex justify-between items-baseline">
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider">{customHeaderTitle || `Unterrichts-Wochenplan`}</h3>
              <span className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest bg-zinc-150 px-2 py-0.5 rounded">
                KW {wpKW} • SW {selectedWpDates.sw} ({selectedWpDates.monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - {selectedWpDates.friday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
              </span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[1.5pt] border-black bg-zinc-50">
                  <th className="py-3 px-2 text-center text-[0.625rem] font-black uppercase tracking-wider text-zinc-600 w-16">Std.</th>
                  {daysWp.map(d => (
                    <th key={d} className="py-3 px-2 text-left text-[0.6875rem] font-black uppercase tracking-wider border-l border-zinc-300 text-black">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subInfoList.map(h => {
                  return (
                    <tr key={h} className="border-b border-zinc-200 min-h-[50px]">
                      {/* Hour cell */}
                      <td className="py-3 px-2 text-center border-r-[1.5pt] border-black bg-zinc-50/50">
                        <div className="font-black text-black">{h}.</div>
                        {wpShowTimes && app?.stundenZeiten?.[h] && (
                          <div className="text-[0.5rem] font-bold text-zinc-400 mt-1">{app.stundenZeiten[h]}</div>
                        )}
                      </td>

                      {/* Content cells */}
                      {daysWp.map(d => {
                        const cellItem = lessonsData[d]?.[h - 1];
                        // Fallback to stammplan if empty
                        const stammplanFach = app?.stammplan?.[d]?.[h];
                        
                        let displayFach = cellItem?.fach || stammplanFach || '';
                        let displayThema = cellItem?.thema || '';

                        const isExcludedEvent = (cellItem && (
                          cellItem.type === 'sa' || 
                          cellItem.type === 'test' || 
                          cellItem.type === 'lzk' || 
                          cellItem.type === 'event' || 
                          cellItem.type === 'spielefest' || 
                          cellItem.type === 'konferenz' || 
                          cellItem.type === 'gespraech' || 
                          cellItem.type === 'sonstiges'
                        )) || /^sachunterricht$|^su$/i.test(displayFach);

                        if (isExcludedEvent) {
                          displayFach = '';
                          displayThema = '';
                        }
                        
                        const isEmpty = !displayFach && !displayThema;

                        return (
                          <td 
                            key={d} 
                            className={`p-2.5 border-l border-zinc-300 align-top text-left w-1/5 ${
                              isEmpty && !wpInkSaver ? 'bg-zinc-50/30' : ''
                            }`}
                          >
                            {displayFach && (
                              <div className="font-black text-black leading-tight mb-1 text-[0.71875rem]">
                                {displayFach}
                              </div>
                            )}
                            {!wpShowSubjectOnly && displayThema && (
                              <div className="font-semibold text-zinc-600 text-[0.65625rem] leading-snug">
                                {displayThema}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Custom Notes handwriting block if enabled */}
            {wpShowEmptyNotesBox && (
              <div className="border border-zinc-450 p-4 rounded-2xl space-y-2 mt-4 avoid-break h-24">
                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-zinc-400 block pb-1 border-b border-zinc-200">Wochenkommentare & Hausübungsnotizen des Klassenlehrers:</span>
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="border-r border-zinc-350 pr-4"></div>
                  <div></div>
                </div>
              </div>
            )}
          </div>
        );

      // D. KLASSENBUCH WOCHENBERICHT
      case 'klassenbuch': {
        const weeks = getKbWeeksToRender();
        return (
          <div className="space-y-12">
            {weeks.map((kw, idx) => (
              <div key={kw} className={idx > 0 ? "page-break pt-8" : ""}>
                {renderSingleKlassenbuchPage(kw)}
              </div>
            ))}
          </div>
        );
      }

      // E. JAHRESPLANUNG
      case 'jahresplanung': {
        const jahresplanValues = app?.jahresplanung || {};
        const yearlySubjects = sortYearlySubjects(app?.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);
        const subjectsCols = jpSubjectFilter === 'all'
          ? yearlySubjects
          : yearlySubjects.filter(sub => sub.id === jpSubjectFilter || sub.label === jpSubjectFilter);

        // Generate actual sequence of school weeks (similar to YearlyPlan.tsx)
        const startYearVal = getStartYear(app?.schuljahr);
        const startKW = getSchulstartKW(app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
        const endYear = startYearVal + 1;
        const startMonday = kwToMonday(startKW, startYearVal);
        const weeksList: Array<{ sw: number, kw: number, year: number, monday: Date }> = [];
        let currentMonday = new Date(startMonday);
        let swIndex = 1;
        while (currentMonday.getFullYear() < endYear || (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)) {
          const kw = getKW(currentMonday);
          const thursday = new Date(currentMonday);
          thursday.setDate(thursday.getDate() + 3);
          const isoYear = thursday.getFullYear();
          weeksList.push({ sw: swIndex, kw: kw, year: isoYear, monday: new Date(currentMonday) });
          currentMonday.setDate(currentMonday.getDate() + 7);
          swIndex++;
        }

        const getPayload = (planData: any, subId: string, subLabel: string) => {
          if (!planData) return null;
          let cell = planData[subId];
          if (!cell) {
            const keys = Object.keys(planData);
            const foundKey = keys.find(k => 
              k.toLowerCase() === subId.toLowerCase() || 
              k.toLowerCase() === subLabel.toLowerCase()
            );
            if (foundKey) {
              cell = planData[foundKey];
            }
          }
          if (!cell) return null;
          if (typeof cell === 'string') {
            return { thema: cell, buch: '', type: 'standard', items: [] };
          }
          return {
            thema: cell.thema || '',
            buch: cell.buch || '',
            type: cell.type || 'standard',
            items: cell.items || []
          };
        };

        // Calculate progress/coverage statistics for each subject in subjectsCols
        const subjectProgressMap = new Map<string, number>();
        subjectsCols.forEach(s => {
          let plannedCount = 0;
          let totalTeachingWeeks = 0;
          weeksList.forEach(w => {
            const holiday = isHoliday(w.monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
            if (!isSevereHoliday) {
              totalTeachingWeeks++;
              const val = getPayload(jahresplanValues[w.kw], s.id, s.label);
              if (val && (val.thema || val.items?.length > 0)) {
                plannedCount++;
              }
            }
          });
          const progress = totalTeachingWeeks === 0 ? 0 : Math.round((plannedCount / totalTeachingWeeks) * 100);
          subjectProgressMap.set(s.id, progress);
        });

        const renderMatrixRows = () => {
          let lastMonth = '';
          const rows: React.ReactNode[] = [];

          weeksList.forEach(({ sw, kw, year, monday }) => {
            const planDataForKw = jahresplanValues[kw] || {};
            const holidayInfo = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holidayInfo && (holidayInfo.includes('ferien') || holidayInfo.includes('Schluss') || holidayInfo.includes('Beginn'));
            const monthName = monday.toLocaleDateString('de-DE', { month: 'long' });

            // If we hide holidays and it's a severe holiday, skip rendering
            if (!jpShowHolidays && isSevereHoliday) {
              return;
            }

            if (jpGroupByMonth && monthName !== lastMonth) {
              lastMonth = monthName;
              rows.push(
                <tr key={`month-sep-${kw}`} className="bg-slate-100 text-left font-black text-slate-800 tracking-wider text-[0.5625rem] uppercase avoid-break print:bg-slate-100">
                  <td colSpan={subjectsCols.length + 1} className="py-1.5 px-2 border border-zinc-300 font-extrabold text-slate-800">
                    📅 {monthName}
                  </td>
                </tr>
              );
            }

            if (holidayInfo) {
              rows.push(
                <tr key={`holiday-${kw}`} className="bg-zinc-50 border-b border-zinc-200 align-middle avoid-break select-none opacity-75">
                  <td className="py-1 px-1 border border-zinc-300 bg-zinc-100/30 text-center select-none font-bold min-w-[70px]">
                    <span className="font-extrabold text-black text-[0.5625rem]">KW {kw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block font-bold leading-none mt-0.5">SW {sw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block leading-none mt-0.5">
                      {monday.getDate()}.${monday.getMonth() + 1}.
                    </span>
                  </td>
                  <td colSpan={subjectsCols.length} className="py-1.5 px-2 bg-zinc-50 border border-zinc-300 text-center font-bold text-slate-500 italic text-[0.5625rem] uppercase tracking-wider">
                    🏝️ {holidayInfo}
                  </td>
                </tr>
              );
            } else {
              // Gather Termin-Pins from cellData types (if jpShowPins is active)
              const weekExams = Object.entries(planDataForKw).filter(([subId, cellData]: any) => cellData?.type && cellData.type !== 'standard');

              rows.push(
                <tr key={kw} className="border-b border-zinc-200 even:bg-zinc-50/10 align-top avoid-break">
                  <td className="py-1 px-1 border border-zinc-300 bg-zinc-50/60 text-center select-none min-w-[70px]">
                    <span className="font-extrabold text-black text-[0.5625rem]">KW {kw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block font-bold leading-none mt-0.5">SW {sw}</span>
                    <span className="text-[0.46875rem] text-zinc-400 block leading-none mt-0.5 font-medium">
                      {monday.getDate()}.${monday.getMonth() + 1}.
                    </span>

                    {/* Termin-Pins */}
                    {jpShowPins && weekExams.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5 items-center max-w-[65px] mx-auto">
                        {weekExams.map(([subId, cellData]: any, idx) => (
                          <div 
                            key={idx} 
                            className={`text-[0.45rem] font-black px-1 py-0.5 rounded leading-none border flex items-center gap-0.5 ${
                              cellData.type === 'sa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                              cellData.type === 'test' || cellData.type === 'lzk' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                            title={`${cellData.type === 'sa' ? 'Schularbeit' : cellData.type === 'test' ? 'Test/LZK' : 'Schul-Termin'}: ${cellData.thema}`}
                          >
                            <span>📌</span>
                            <span>{cellData.type === 'sa' ? 'SA' : cellData.type === 'test' ? 'T' : 'FIX'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {subjectsCols.map(sub => {
                    const content = getPayload(planDataForKw, sub.id, sub.label);
                    return (
                      <td key={sub.id} className="py-1 px-1.5 border border-zinc-300 whitespace-pre-wrap leading-tight">
                        {content && (content.thema || (content.items && content.items.length > 0)) ? (
                          <div className="space-y-1">
                            {content.items && content.items.length > 0 ? (
                              <div className="space-y-1.5">
                                {content.items.map((it: any) => (
                                  <div key={it.id} className="leading-tight border-b border-stone-100 last:border-0 pb-1 last:pb-0">
                                    {it.subCategory && (
                                      <span className="text-[0.45rem] font-black uppercase text-blue-600 block mb-0.5">{it.subCategory.replace('Deutsch ', '')}</span>
                                    )}
                                    <div className="text-[0.5625rem] font-bold text-zinc-900 leading-tight">
                                      {it.thema}
                                    </div>
                                    {it.buch && (
                                      <span className="text-[0.5rem] text-stone-500 italic">📖 {it.buch}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <div className="text-[0.5625rem] font-bold text-zinc-900 leading-tight">
                                  {content.thema}
                                </div>
                                {content.buch && (
                                  <div className="text-[0.5rem] font-medium text-indigo-700 leading-tight">
                                    📖 {content.buch}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-300/30 text-[0.5rem] select-none">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            }
          });
          return rows;
        };

        const renderListRows = () => {
          let lastMonth = '';
          const itemsArr: React.ReactNode[] = [];

          weeksList.forEach(({ sw, kw, year, monday }) => {
            const pl = jahresplanValues[kw] || {};
            const holidayInfo = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
            const isSevereHoliday = holidayInfo && (holidayInfo.includes('ferien') || holidayInfo.includes('Schluss') || holidayInfo.includes('Beginn'));
            const monthName = monday.toLocaleDateString('de-DE', { month: 'long' });

            if (!jpShowHolidays && isSevereHoliday) {
              return;
            }

            const hasAnyContent = subjectsCols.some(sub => {
              const c = getPayload(pl, sub.id, sub.label);
              return c && (c.thema || (c.items && c.items.length > 0));
            });

            if (!hasAnyContent && !holidayInfo) return;

            if (jpGroupByMonth && monthName !== lastMonth) {
              lastMonth = monthName;
              itemsArr.push(
                <div key={`month-header-${kw}`} className="py-1 px-2.5 bg-slate-100 rounded-lg text-[0.5625rem] font-black uppercase text-indigo-950 tracking-wider avoid-break border-l-4 border-indigo-500 mt-3 first:mt-0">
                  📅 {monthName}
                </div>
              );
            }

            if (holidayInfo) {
              itemsArr.push(
                <div key={`holiday-item-${kw}`} className="py-1.5 border-b border-zinc-200 flex gap-4 text-[0.5625rem] avoid-break text-zinc-400 select-none items-center">
                  <div className="w-24 shrink-0 font-extrabold text-black">
                    KW {kw} <span className="text-[0.46875rem] text-zinc-400 font-bold block">SW {sw} ({monday.getDate()}.${monday.getMonth() + 1}.)</span>
                  </div>
                  <div className="flex-1 font-bold italic uppercase tracking-wider text-emerald-800 text-[0.5625rem]">
                    🏝️ {holidayInfo}
                  </div>
                </div>
              );
            } else {
              // Gather Termin-Pins
              const weekExams = Object.entries(pl).filter(([subId, cellData]: any) => cellData?.type && cellData.type !== 'standard');

              itemsArr.push(
                <div key={kw} className="py-1.5 border-b border-zinc-150 flex gap-4 text-[0.59375rem] avoid-break items-start">
                  <div className="w-24 shrink-0 font-extrabold text-black mt-0.5">
                    KW {kw} <span className="text-[0.46875rem] text-zinc-400 font-bold block">SW {sw} ({monday.getDate()}.${monday.getMonth() + 1}.)</span>
                    
                    {/* Termin-Pins list style */}
                    {jpShowPins && weekExams.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5 max-w-[80px]">
                        {weekExams.map(([subId, cellData]: any, idx) => (
                          <span 
                            key={idx} 
                            className={`text-[0.45rem] font-black px-1 py-0.5 rounded leading-none border flex items-center gap-0.5 ${
                              cellData.type === 'sa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                              cellData.type === 'test' || cellData.type === 'lzk' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            <span>📌</span> {cellData.type === 'sa' ? 'SA' : cellData.type === 'test' ? 'T' : 'FIX'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {subjectsCols.map(sub => {
                      const content = getPayload(pl, sub.id, sub.label);
                      if (!content || (!content.thema && (!content.items || content.items.length === 0))) return null;
                      return (
                        <div key={sub.id} className="text-[0.5625rem] border-l-2 pl-1.5" style={{ borderColor: sub.color || '#CBD5E1' }}>
                          <span className="font-extrabold text-zinc-400 text-[0.46875rem] uppercase block leading-none mb-0.5">{sub.label}</span>
                          
                          {content.items && content.items.length > 0 ? (
                            <div className="space-y-1">
                              {content.items.map((it: any) => (
                                <div key={it.id} className="leading-tight border-b border-stone-100 last:border-0 pb-0.5 last:pb-0">
                                  {it.subCategory && (
                                    <span className="text-[0.45rem] text-blue-600 font-bold block">{it.subCategory.replace('Deutsch ', '')}</span>
                                  )}
                                  <span className="font-bold text-zinc-800">{it.thema}</span>
                                  {it.buch && <span className="text-[0.46875rem] text-zinc-500 italic block">📖 {it.buch}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-zinc-800 leading-tight">{content.thema}</span>
                              {content.buch && <span className="text-[0.46875rem] text-zinc-500 block leading-tight mt-0.5">📖 {content.buch}</span>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          });
          return itemsArr;
        };

        const renderBentoGrid = () => {
          const MONATE = [
            { name: 'September', num: 8 },
            { name: 'Oktober', num: 9 },
            { name: 'November', num: 10 },
            { name: 'Dezember', num: 11 },
            { name: 'Jänner', num: 0 },
            { name: 'Februar', num: 1 },
            { name: 'März', num: 2 },
            { name: 'April', num: 3 },
            { name: 'Mai', num: 4 },
            { name: 'Juni', num: 5 },
            { name: 'Juli', num: 6 },
          ];

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              {MONATE.map(m => {
                const monthWeeks = weeksList.filter(({ kw, year, monday }) => {
                  return monday.getMonth() === m.num;
                });
                if (monthWeeks.length === 0) return null;

                const items: Array<{
                  type: 'holiday' | 'sa' | 'test' | 'lzk' | 'event' | 'spielefest' | 'konferenz' | 'gespraech' | 'sonstiges' | 'standard';
                  label: string;
                  details?: string;
                  subjectLabel?: string;
                  colorClass?: string;
                  kw: number;
                  sw: number;
                }> = [];

                monthWeeks.forEach(({ sw, kw, year, monday }) => {
                  const holiday = isHoliday(monday, app?.calendarSettings?.disabledHolidays || [], app?.bundesland || 'VBG');
                  const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
                  
                  if (holiday) {
                    if (jpShowHolidays) {
                      if (!items.some(it => it.type === 'holiday' && it.label === holiday)) {
                        items.push({
                          type: 'holiday',
                          label: holiday,
                          kw,
                          sw
                        });
                      }
                    }
                    if (isSevereHoliday) {
                      return; // skip planning items on severe holidays
                    }
                  }

                  const plannedWeek = jahresplanValues[kw] || {};
                  subjectsCols.forEach(s => {
                    const data = getPayload(plannedWeek, s.id, s.label);
                    if (data && (data.thema || (data.items && data.items.length > 0))) {
                      if (data.items && data.items.length > 0) {
                        data.items.forEach((it: any) => {
                          items.push({
                            type: (it.type as any) || 'standard',
                            label: it.thema,
                            details: it.buch,
                            subjectLabel: s.label,
                            colorClass: s.color,
                            kw,
                            sw
                          });
                        });
                      } else {
                        items.push({
                          type: (data.type as any) || 'standard',
                          label: data.thema,
                          details: data.buch,
                          subjectLabel: s.label,
                          colorClass: s.color,
                          kw,
                          sw
                        });
                      }
                    }
                  });
                });

                return (
                  <div key={m.name} className="bg-white border border-zinc-300 rounded-2xl p-4 shadow-sm flex flex-col min-h-[220px] avoid-break">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-3 shrink-0">
                      <span className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        📅 {m.name}
                      </span>
                      <span className="text-[0.5625rem] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
                        SW {monthWeeks[0]?.sw || 0} - {monthWeeks[monthWeeks.length - 1]?.sw || 0}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-stone-400 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                        <span className="text-[0.5625rem] font-black uppercase tracking-wider text-stone-400">Keine Themen geplant</span>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
                        {items.map((item, idx) => {
                          const isHolidayType = item.type === 'holiday';
                          const isSA = item.type === 'sa';
                          const isTest = item.type === 'test' || item.type === 'lzk';

                          let badgeColor = 'bg-stone-50 text-stone-850 border-zinc-200';
                          if (isHolidayType) badgeColor = 'bg-emerald-50 text-emerald-850 font-bold border-emerald-100';
                          else if (isSA) badgeColor = 'bg-rose-50 border-rose-200 text-rose-850 font-bold';
                          else if (isTest) badgeColor = 'bg-amber-50 border-amber-200 text-amber-850 font-bold';

                          return (
                            <div key={idx} className={`p-2 rounded-xl border text-[0.625rem] shadow-3xs flex flex-col gap-0.5 ${badgeColor}`}>
                              <div className="flex items-start justify-between gap-2 leading-none">
                                <span className="font-black text-[0.45rem] uppercase tracking-wider bg-white/60 px-1 rounded border border-black/5 shrink-0">
                                  SW {item.sw} / KW {item.kw}
                                </span>
                                {item.subjectLabel && (
                                  <span className="text-[0.5rem] font-black uppercase tracking-wider text-right opacity-85 shrink-0">
                                    {item.subjectLabel}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold leading-tight mt-0.5">
                                {item.label}
                              </div>
                              {item.details && (
                                <div className="text-[0.5rem] opacity-75 italic mt-0.5">
                                  📖 {item.details}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="space-y-4 text-slate-800">
            <div className="border-b border-zinc-400 pb-1 flex justify-between items-baseline avoid-break">
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-wider text-zinc-900">{customHeaderTitle || `Jahres-Curriculumsplanung`}</h3>
              <span className="text-[0.5625rem] font-bold text-zinc-500 uppercase">
                Schuljahr {app?.schuljahr} • {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • LP: {app?.nachname || ''}
              </span>
            </div>

            {jpDisplayMode === 'matrix' ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse table-fixed min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-400 bg-zinc-50 text-left avoid-break">
                      <th className="py-1.5 px-1 border border-zinc-300 text-[0.53125rem] font-black uppercase tracking-wider text-zinc-650 w-[75px]">KW / SW</th>
                      {subjectsCols.map(sub => {
                        const progress = subjectProgressMap.get(sub.id) || 0;
                        return (
                          <th key={sub.id} className="py-1.5 px-1.5 border border-zinc-300 text-[0.53125rem] font-black uppercase tracking-wider text-zinc-650">
                            <div>{sub.label}</div>
                            {/* Fachbezogener Fortschritts- & Abdeckungsbalken */}
                            {jpShowProgressBars && (
                              <div className="mt-1 max-w-[100px]">
                                <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden flex border border-zinc-300/30">
                                  <div className="bg-emerald-600 h-full" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="text-[0.45rem] font-bold text-zinc-400 mt-0.5 uppercase tracking-wide">
                                  Abdeckung {progress}%
                                </div>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {renderMatrixRows()}
                  </tbody>
                </table>
              </div>
            ) : jpDisplayMode === 'bento' ? (
              <div className="space-y-2">
                <span className="text-[0.5625rem] font-extrabold text-zinc-400 uppercase tracking-wider pb-0.5 border-b border-zinc-200 block">Monatliches bento-curriculum</span>
                {renderBentoGrid()}
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[0.5625rem] font-extrabold text-zinc-400 uppercase tracking-wider pb-0.5 border-b border-zinc-200 block">Chronologisches Syllabusverzeichnis</span>
                <div className="space-y-1">
                  {renderListRows()}
                </div>
              </div>
            )}
          </div>
        );
      }

      // F. KEL PORTFOLIO DOSSIER (Single mode)
      case 'kel':
        const defaultStudent = students.find(s => s.id === kelSelectedStudentId) || students[0];
        if (!defaultStudent) {
          return (
            <div className="py-12 text-center text-zinc-400 font-bold">
              Keine Schüler erfasst. Tragen Sie Schüler in Ihre Schülerverwaltung ein, um das KEL-Dossier zu nutzen.
            </div>
          );
        }
        return renderSingleKelPortfolio(defaultStudent);

      // G. STUNDENPLAN
      case 'stundenplan':
        const daysAll = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        const hoursList = [1, 2, 3, 4, 5, 6, 7, 8];

        return (
          <div className="space-y-4">
            <div className="border-b-[2pt] border-black pb-2 text-center">
              <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest text-[#000000]">{customHeaderTitle || 'Klassen-Stundenplan'}</h3>
              <p className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest mt-1 animate-fade-in">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • Schuljahr: {app?.schuljahr}</p>
            </div>

            <table className="w-full border-collapse text-center table-fixed h-auto">
              <thead>
                <tr className="border-b-[2pt] border-black bg-zinc-50">
                  <th className="py-2.5 px-1 text-[0.6875rem] font-black uppercase tracking-wider text-zinc-650 w-20">Std.</th>
                  {daysAll.map(d => (
                    <th key={d} className="py-2.5 px-1 text-[0.75rem] font-black uppercase tracking-widest text-black border-l border-zinc-250">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hoursList.map(h => {
                  return (
                    <tr key={h} className="border-b border-zinc-200">
                      {/* Hour heading */}
                      <td className="py-2.5 px-1 bg-zinc-50/50 border-r-[1.5pt] border-black">
                        <div className="text-[0.71875rem] font-black text-black leading-tight">{h}. Std.</div>
                        {spShowTimes && app?.stundenZeiten?.[h] && (
                          <div className="text-[0.53125rem] font-bold text-zinc-450 mt-0.5 leading-none">{app.stundenZeiten[h]}</div>
                        )}
                      </td>

                      {/* Monday - Friday lessons */}
                      {daysAll.map(d => {
                        const fachName = app?.stammplan?.[d]?.[h];
                        
                        return (
                          <td key={d} className="py-2 px-1 border-l border-zinc-250 align-middle">
                            {fachName ? (
                              <div className="space-y-0.5">
                                <span className="text-[0.71875rem] font-black text-black leading-none block break-words">{fachName}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-300 font-bold italic text-[0.59375rem]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'eltern_diagnostik': {
        const targetSt = students.find(s => s.id === diagSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleElternDiagnostik(targetSt);
      }

      case 'schuelerprofil': {
        const targetSt = students.find(s => s.id === profSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleStudentProfile(targetSt);
      }

      case 'kel_presentation': {
        const targetSt = students.find(s => s.id === kpSelectedStudentId) || students[0];
        if (!targetSt) {
          return <div className="text-center py-6 text-slate-400 font-bold">Keine Schüler vorhanden.</div>;
        }
        return renderSingleKelPresentation(targetSt);
      }

      case 'sitzplan':
        return renderSeatingPlanView();

      case 'uebergabemappe':
        return renderUebergabemappeView();

      case 'pdf_export':
        return renderPdfExportView();

      case 'lob_druckkarte':
        return renderLobDruckkarteView();

      case 'fehlstunden':
        return renderFehlstundenView();

      case 'kassenuebersicht':
        return renderKassenuebersichtView();

      case 'smart_tools':
        return renderSmartToolsView();

      default:
        return null;
    }
  }

  function getStudentFehlstundenBySemester(studentId: string) {
    const attendanceData = app?.anwesenheit?.[studentId] || {};
    let excusedSem1 = 0;
    let unexcusedSem1 = 0;
    let excusedSem2 = 0;
    let unexcusedSem2 = 0;

    Object.entries(attendanceData).forEach(([dateStr, dayData]: [string, any]) => {
      if (!dayData) return;
      const sem = getSemester(dateStr);

      const statuses = typeof dayData === 'object' ? Object.values(dayData) : [dayData];

      statuses.forEach(status => {
        if (!status) return;
        const sStr = String(status).toLowerCase();
        if (sStr === 'e') {
          if (sem === 1) excusedSem1++;
          else excusedSem2++;
        } else if (sStr === 'u' || sStr === 'f') {
          if (sem === 1) unexcusedSem1++;
          else unexcusedSem2++;
        }
      });
    });

    return {
      sem1: { excused: excusedSem1, unexcused: unexcusedSem1, total: excusedSem1 + unexcusedSem1 },
      sem2: { excused: excusedSem2, unexcused: unexcusedSem2, total: excusedSem2 + unexcusedSem2 },
      total: { 
        excused: excusedSem1 + excusedSem2, 
        unexcused: unexcusedSem1 + unexcusedSem2, 
        total: excusedSem1 + excusedSem2 + unexcusedSem1 + unexcusedSem2 
      }
    };
  };

  function renderFehlstundenView() {
    const totalAbsStats = students.reduce((acc, st) => {
      const stats = getStudentFehlstundenBySemester(st.id);
      acc.exc1 += stats.sem1.excused;
      acc.unexc1 += stats.sem1.unexcused;
      acc.exc2 += stats.sem2.excused;
      acc.unexc2 += stats.sem2.unexcused;
      acc.totalExc += stats.total.excused;
      acc.totalUnexc += stats.total.unexcused;
      return acc;
    }, { exc1: 0, unexc1: 0, exc2: 0, unexc2: 0, totalExc: 0, totalUnexc: 0 });

    const classTotalHours = totalAbsStats.totalExc + totalAbsStats.totalUnexc;
    const classAvgHours = students.length > 0 ? (classTotalHours / students.length).toFixed(1) : '0.0';

    return (
      <div className="space-y-6 text-slate-800">
        <div className="border-b-2 border-black pb-3 flex justify-between items-end">
          <div className="text-left">
            <h3 className="text-[1.25rem] leading-none font-black uppercase tracking-wider">{customHeaderTitle || 'Fehlstunden-Übersicht'}</h3>
            <p className="text-[0.6875rem] font-bold text-zinc-500 mt-1">Auswertung nach Semestern und Gesamtjahr</p>
          </div>
          <div className="text-right">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-zinc-500 block">Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung}</span>
            <span className="text-[0.5625rem] font-bold text-zinc-400">Generiert am: {new Date().toLocaleDateString('de-DE')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 border border-zinc-200 p-4 rounded-2xl bg-zinc-50/50">
          <div className="text-center p-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Gesamte Fehlstunden</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">{classTotalHours} Std.</span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">({totalAbsStats.totalExc} entschuldigt / {totalAbsStats.totalUnexc} unentschuldigt)</span>
          </div>
          <div className="text-center p-2 border-x border-zinc-200">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Ø pro Schüler/in</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">{classAvgHours} Std.</span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">Durchschnittlicher Ausfall</span>
          </div>
          <div className="text-center p-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block">Entschuldigungsquote</span>
            <span className="text-[1.5rem] font-black leading-none mt-1 block">
              {classTotalHours > 0 ? `${((totalAbsStats.totalExc / classTotalHours) * 100).toFixed(0)}%` : '100%'}
            </span>
            <span className="text-[0.55rem] text-zinc-400 font-bold mt-1 block">Anteil entschuldigter Stunden</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[0.625rem] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <th className="py-3 px-3 text-left w-10">Nr.</th>
                <th className="py-3 px-3 text-left min-w-[12rem]">Schüler/in</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-indigo-50/10" colSpan={3}>1. Semester</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-emerald-50/10" colSpan={3}>2. Semester</th>
                <th className="py-3 px-2 text-center border-l border-zinc-100 bg-amber-50/10" colSpan={3}>Gesamtjahr</th>
                <th className="py-3 px-3 text-center border-l border-zinc-100">Status</th>
              </tr>
              <tr className="bg-zinc-50/30 text-[0.5625rem] font-bold text-zinc-400 border-b border-zinc-100">
                <th></th>
                <th></th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-slate-800 w-12 text-center font-mono">Ges.</th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-slate-800 w-12 text-center font-mono">Ges.</th>
                <th className="py-1.5 px-1 border-l border-zinc-100 text-emerald-600 w-12 text-center font-mono">Ent.</th>
                <th className="py-1.5 px-1 text-rose-500 w-12 text-center font-mono">Une.</th>
                <th className="py-1.5 px-1 font-black text-zinc-800 w-12 text-center font-mono">Ges.</th>
                <th className="border-l border-zinc-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {students.map((st, idx) => {
                const stats = getStudentFehlstundenBySemester(st.id);
                const hasUnexcused = stats.total.unexcused > 0;
                const hasAbsences = stats.total.total > 0;

                return (
                  <tr key={st.id} className="hover:bg-zinc-50/50 transition-colors text-[0.8125rem]">
                    <td className="py-2.5 px-3 font-bold text-zinc-400 text-left">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-extrabold text-zinc-900 text-left">
                      {st.nachname} <span className="text-zinc-500 font-semibold">{st.vorname}</span>
                    </td>
                    
                    {/* Sem 1 */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono">{stats.sem1.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.sem1.unexcused > 0 ? 'text-rose-500 bg-rose-50/30' : 'text-zinc-400'}`}>{stats.sem1.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-indigo-50/10">{stats.sem1.total}</td>
                    
                    {/* Sem 2 */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono">{stats.sem2.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.sem2.unexcused > 0 ? 'text-rose-500 bg-rose-50/30' : 'text-zinc-400'}`}>{stats.sem2.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-emerald-50/10">{stats.sem2.total}</td>
                    
                    {/* Total */}
                    <td className="py-2.5 px-1 border-l border-zinc-200 text-center font-semibold text-emerald-600 font-mono bg-amber-50/5">{stats.total.excused}</td>
                    <td className={`py-2.5 px-1 text-center font-bold font-mono ${stats.total.unexcused > 0 ? 'text-rose-500 bg-rose-50/50' : 'text-zinc-400'}`}>{stats.total.unexcused}</td>
                    <td className="py-2.5 px-1 text-center font-black text-zinc-800 font-mono bg-amber-50/10">{stats.total.total}</td>
                    
                    {/* Status badge */}
                    <td className="py-2.5 px-3 border-l border-zinc-200 text-center text-[0.625rem] font-bold">
                      {!hasAbsences ? (
                        <span className="text-zinc-400">Keine</span>
                      ) : hasUnexcused ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100">Offene Belege</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">Erledigt</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="text-[0.625rem] text-zinc-400 font-medium italic text-left">
          * Aufteilung: 1. Semester umfasst die Monate September bis Jänner. 2. Semester umfasst Februar bis August.
        </div>
      </div>
    );
  }

  function renderKassenuebersichtView() {
    const { rows, openingBalance, totalIncome, totalExpense, closingBalance, hasRows } = koReportData;
    const classNameStr = `${app?.stufe || ''}${app?.stufe ? '. Klasse ' : 'Klasse '}${app?.klassenbezeichnung || app?.klasse || ''}`.trim();
    const formatEur = (v: number) => (Number(v) || 0).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });

    return (
      <div className="space-y-6 text-slate-900 font-sans">
        {/* Kopfbereich: Dokument-Header */}
        <div className="border-b-2 border-black pb-3 flex justify-between items-end gap-4">
          <div className="text-left">
            <h3 className="text-[1.25rem] leading-tight font-black uppercase tracking-wider text-black">
              {customHeaderTitle || 'Kassenübersicht – Einnahmen & Ausgaben'}
            </h3>
            <div className="text-[0.75rem] font-bold text-zinc-600 mt-1 flex items-center gap-2 flex-wrap">
              <span><strong>Klasse:</strong> {classNameStr || 'Klassenkasse'}</span>
              <span>•</span>
              <span><strong>Zeitraum:</strong> {koDateRange.periodLabel}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-zinc-500 block">
              Schuljahr {app?.schuljahr || getCurrentSchuljahr()}
            </span>
            <span className="text-[0.625rem] font-bold text-zinc-400">
              Gedruckt am {new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Kompakte Finanz-Kennzahlen Box */}
        {koShowKpiBanner && (
          <div className="grid grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="p-1">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">Anfangsbestand</span>
              <span className="text-[1rem] font-black text-slate-800 font-mono block mt-0.5">{formatEur(openingBalance)}</span>
            </div>
            <div className="p-1 border-l border-slate-200">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-700 block">Einnahmen</span>
              <span className="text-[1rem] font-black text-emerald-700 font-mono block mt-0.5">+{formatEur(totalIncome)}</span>
            </div>
            <div className="p-1 border-l border-slate-200">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-rose-700 block">Ausgaben</span>
              <span className="text-[1rem] font-black text-rose-700 font-mono block mt-0.5">-{formatEur(totalExpense)}</span>
            </div>
            <div className="p-1 border-l border-slate-200 bg-white rounded-lg border border-slate-200/80 shadow-3xs">
              <span className="text-[0.5625rem] font-black uppercase tracking-wider text-indigo-900 block">Endsaldo</span>
              <span className={`text-[1.0625rem] font-black font-mono block mt-0.5 ${closingBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatEur(closingBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Haupttabelle */}
        <table className="w-full border-collapse text-left text-[0.75rem]">
          <thead>
            <tr className="border-b-[1.5pt] border-black bg-slate-100/70 text-black font-black uppercase text-[0.625rem] tracking-wider">
              <th className="py-2.5 px-2.5 w-24 text-left">Datum</th>
              <th className="py-2.5 px-2 text-left">Beschreibung</th>
              <th className="py-2.5 px-2 w-28 text-left">Kategorie</th>
              <th className="py-2.5 px-2.5 w-24 text-right">Einnahme</th>
              <th className="py-2.5 px-2.5 w-24 text-right">Ausgabe</th>
              <th className="py-2.5 px-2.5 w-28 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Anfangsbestand Zeile falls nicht 0 */}
            {openingBalance !== 0 && (
              <tr className="bg-slate-50/60 text-slate-600 italic">
                <td className="py-2 px-2.5 font-medium whitespace-nowrap text-slate-400">
                  {new Date(koDateRange.startDateStr).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td className="py-2 px-2 font-bold text-slate-700" colSpan={2}>
                  Anfangsbestand / Vortrag vor {koDateRange.periodLabel}
                </td>
                <td className="py-2 px-2.5 text-right font-mono text-slate-400">—</td>
                <td className="py-2 px-2.5 text-right font-mono text-slate-400">—</td>
                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                  {formatEur(openingBalance)}
                </td>
              </tr>
            )}

            {!hasRows ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-[0.875rem] italic">
                  Keine Buchungen im ausgewählten Zeitraum.
                </td>
              </tr>
            ) : (
              rows.map((tx, idx) => {
                const isEven = idx % 2 === 0;
                const formattedDate = tx.datum
                  ? new Date(tx.datum).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—';
                const katLabel = tx.kategorie === 'ausgabe'
                  ? 'Ausgabe'
                  : tx.kategorie === 'sammlung'
                  ? 'Geldsammlung'
                  : tx.kategorie === 'sonstiges'
                  ? 'Sonstiges'
                  : tx.kategorie || (tx.isPlus ? 'Einnahme' : 'Ausgabe');

                return (
                  <tr
                    key={tx.id || idx}
                    className={`break-inside-avoid ${isEven ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-100/50 transition-colors`}
                  >
                    <td className="py-2 px-2.5 font-medium whitespace-nowrap text-slate-700 align-top">
                      {formattedDate}
                    </td>
                    <td className="py-2 px-2 font-bold text-slate-900 align-top leading-snug break-words">
                      {tx.titel}
                    </td>
                    <td className="py-2 px-2 text-slate-600 align-top text-[0.6875rem]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-medium">
                        {katLabel}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 align-top whitespace-nowrap">
                      {tx.einnahme !== null ? formatEur(tx.einnahme) : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 align-top whitespace-nowrap">
                      {tx.ausgabe !== null ? formatEur(tx.ausgabe) : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 align-top whitespace-nowrap">
                      {formatEur(tx.saldo)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-[1.5pt] border-black bg-slate-100 font-bold text-slate-900">
              <td colSpan={3} className="py-2.5 px-2.5 uppercase text-[0.6875rem] font-black tracking-wider">
                Summen im Zeitraum
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                {formatEur(totalIncome)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-rose-800 whitespace-nowrap">
                {formatEur(totalExpense)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-black text-black whitespace-nowrap">
                {formatEur(closingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Zusammenfassungs-Kasten */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/80 space-y-2 break-inside-avoid">
          <div className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
            Zusammenfassung Kassenstand
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[0.8125rem]">
            <div>
              <span className="text-slate-600 font-medium">Einnahmen gesamt:</span>{' '}
              <strong className="font-mono text-emerald-700">{formatEur(totalIncome)}</strong>
            </div>
            <div>
              <span className="text-slate-600 font-medium">Ausgaben gesamt:</span>{' '}
              <strong className="font-mono text-rose-700">{formatEur(totalExpense)}</strong>
            </div>
            <div>
              <span className="text-slate-900 font-black">Endsaldo:</span>{' '}
              <strong className="font-mono text-slate-950 text-[0.9375rem]">{formatEur(closingBalance)}</strong>
            </div>
          </div>
        </div>

        {/* Unterschriftenzeilen */}
        {koShowSignatures && (
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-[0.75rem] break-inside-avoid">
            <div className="space-y-8">
              <p className="text-slate-500 text-[0.6875rem]">
                Ort, Datum: _________________________________
              </p>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-800">{app?.anrede ? `${app.anrede} ` : ''}{app?.nachname || 'Klassenlehrer:in'}</p>
                <p className="text-[0.625rem] text-slate-500 uppercase tracking-wider font-semibold">Klassenleitung</p>
              </div>
            </div>
            <div className="space-y-8">
              <p className="text-slate-500 text-[0.6875rem] text-transparent select-none">
                .
              </p>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-bold text-slate-800">Rechnungsprüfung / Schulleitung</p>
                <p className="text-[0.625rem] text-slate-500 uppercase tracking-wider font-semibold">Geprüft &amp; Übernommen</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSmartToolsView() {
    switch (activeSmartTool) {
      case 'tischschilder': {
        let list = students;
        if (stTischStudentId !== 'all') {
          list = students.filter(s => s.id === stTischStudentId);
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            {list.map(st => {
              // Design specific styles
              let themeBg = 'bg-emerald-50 text-emerald-900 border-emerald-400';
              let themeEmoji = '🦖🦕🌴';
              let themeDesc = 'Dino-Crew';
              
              if (stTischStyle === 'space') {
                themeBg = 'bg-indigo-950 text-indigo-100 border-indigo-700';
                themeEmoji = '🚀🪐⭐️';
                themeDesc = 'Weltraum-Forscher';
              } else if (stTischStyle === 'ocean') {
                themeBg = 'bg-sky-50 text-sky-900 border-sky-400';
                themeEmoji = '🐬🐳🐙';
                themeDesc = 'Meeres-Entdecker';
              } else if (stTischStyle === 'minimal') {
                themeBg = 'bg-stone-50 text-stone-900 border-stone-400';
                themeEmoji = '✨🎓✨';
                themeDesc = 'Schul-Klasse';
              }

              return (
                <div key={st.id} className="avoid-break p-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-left">
                  <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block mb-2 select-none">
                    🖨️ A4 Querformat · Faltbares Tischschild ({themeDesc})
                  </span>
                  
                  {/* Foldable Tent Card Visual Representation */}
                  <div className={`w-full aspect-[297/210] border-2 border-dashed rounded-2xl p-4 flex flex-col justify-between ${themeBg}`}>
                    {/* Back Side (Inverted Name for other students/teachers to see when looking at the desk) */}
                    <div className="text-center rotate-180 border-b border-dashed border-current/20 pb-4">
                      <span className="text-[0.5625rem] font-black uppercase tracking-widest opacity-60">Faltkante • Rückseite</span>
                      <h4 className="text-[1.75rem] leading-none font-extrabold tracking-tight mt-1 capitalize">
                        {st.vorname}
                      </h4>
                    </div>

                    {/* Front Side (For the child to see, or for desk labeling) */}
                    <div className="space-y-4 pt-4 text-center">
                      <div className="text-xs font-bold tracking-widest uppercase opacity-75 flex justify-center gap-2">
                        <span>{themeEmoji.substring(0,2)}</span>
                        <span>{app?.stufe || st.besuchsjahr}. Klasse</span>
                        <span>{themeEmoji.substring(2,4)}</span>
                      </div>
                      
                      <h3 className="text-[2.25rem] leading-none font-black tracking-tight uppercase">
                        {st.vorname} {st.nachname}
                      </h3>

                      {/* Educational Helper Line (ABC and 1-20) if enabled */}
                      {stTischShowHelper && (
                        <div className="mt-4 p-2 bg-white/80 rounded-xl border border-current/10 text-stone-800 space-y-1 text-left font-mono">
                          <div className="text-[0.53125rem] leading-none font-black text-center border-b border-stone-200 pb-1 flex justify-between">
                            <span>A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</span>
                          </div>
                          <div className="text-[0.53125rem] leading-none font-black text-center flex justify-between pt-0.5">
                            <span>1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      case 'urkunden': {
        let list = students;
        if (stUrkundeStudentId !== 'all') {
          list = students.filter(s => s.id === stUrkundeStudentId);
        }

        return (
          <div className="space-y-8 p-2 text-left">
            {list.map(st => (
              <div key={st.id} className="avoid-break bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto">
                <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block mb-4 select-none">
                  🖨️ A4 Hochformat · Motivations-Urkunde
                </span>

                {/* Diploma Content Frame */}
                <div className="aspect-[210/297] border-[10px] border-double border-indigo-900 bg-[#fffdfa] p-10 flex flex-col justify-between text-slate-900 text-center relative rounded-xl shadow-inner" style={{ fontFamily: 'Georgia, serif' }}>
                  <div className="absolute inset-2 border border-indigo-900/10 rounded pointer-events-none" />

                  {/* Top Emblem */}
                  <div className="space-y-2 pt-4">
                    <span className="text-5xl block">🏅</span>
                    <h1 className="text-3xl font-black uppercase tracking-widest text-indigo-950 mt-4 leading-none">
                      {stUrkundeTitle}
                    </h1>
                    <div className="h-0.5 w-24 bg-indigo-900 mx-auto mt-3" />
                  </div>

                  {/* Body Text */}
                  <div className="space-y-6 flex-1 flex flex-col justify-center py-8">
                    <p className="text-stone-500 font-sans font-bold uppercase tracking-widest text-xs">
                      Diese Auszeichnung wird feierlich verliehen an:
                    </p>
                    <h2 className="text-4xl font-black underline decoration-amber-400 decoration-wavy underline-offset-8 text-slate-950 capitalize py-2">
                      {st.vorname} {st.nachname}
                    </h2>
                    <p className="text-lg leading-relaxed text-slate-800 italic px-6 max-w-lg mx-auto">
                      „{stUrkundeText}“
                    </p>
                  </div>

                  {/* Footer & Signatures */}
                  <div className="border-t border-indigo-900/15 pt-6 pb-4">
                    <div className="grid grid-cols-2 gap-8 text-stone-600 font-sans font-bold text-[0.75rem]">
                      <div className="space-y-6">
                        <div className="border-b border-dashed border-stone-300 pb-1 font-mono text-slate-900">
                          {stUrkundeDate}
                        </div>
                        <span className="uppercase text-[0.625rem] text-stone-400 tracking-wider">Ausstellungsdatum</span>
                      </div>
                      <div className="space-y-6">
                        <div className="border-b border-dashed border-stone-300 pb-1 font-serif text-indigo-950 italic">
                          {app.lehrerName || 'Die Klassenlehrkraft'}
                        </div>
                        <span className="uppercase text-[0.625rem] text-stone-400 tracking-wider">Klassenlehrer/in</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'joker': {
        return (
          <div className="space-y-8 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Gutschein-Coupons (Dashed cut borders)
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {students.map((st, idx) => (
                <div key={st.id} className="avoid-break bg-[#faf8f5] border-2 border-dashed border-amber-600 rounded-3xl p-6 relative flex flex-col justify-between aspect-[148/105] text-left shadow-sm">
                  {/* Coupon Ticket Header */}
                  <div className="flex justify-between items-start border-b border-amber-200 pb-3">
                    <div>
                      <span className="text-[0.5625rem] bg-amber-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">GUTSCHEIN</span>
                      <h3 className="text-[1.125rem] leading-normal font-black text-amber-900 mt-1">{stJokerTitle}</h3>
                    </div>
                    <span className="text-3xl">🎟️</span>
                  </div>

                  {/* Coupon Core */}
                  <div className="flex-1 py-4">
                    <p className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-wider">
                      Ausgestellt für: <span className="text-slate-900 underline capitalize">{st.vorname} {st.nachname}</span>
                    </p>
                    <p className="text-[0.75rem] leading-snug font-medium text-slate-700 italic mt-2">
                      „{stJokerText}“
                    </p>
                  </div>

                  {/* Footer Stub & Signature line */}
                  <div className="border-t border-dashed border-amber-200 pt-3 flex justify-between items-end text-[0.625rem] font-bold text-amber-850">
                    <span>Gültig im laufenden Schuljahr</span>
                    <div className="text-right">
                      <div className="border-b border-amber-400/50 w-24 pb-1 italic font-serif text-slate-800">
                        {app.lehrerName || 'Lehrkraft'}
                      </div>
                      <span className="text-[0.5rem] text-stone-400 uppercase block mt-0.5">Unterschrift</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'pocket': {
        const sorted = [...students].sort((a, b) => a.nachname.localeCompare(b.nachname));

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-[0.5625rem] bg-rose-650 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">NOTFALL-KIT</span>
              <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 mt-2">Taschen-Klassenliste (Foldable Pocket Booklet)</h2>
              <p className="text-[0.6875rem] font-bold text-slate-500 mt-1">
                Faltanleitung: Drucken Sie diese Seite auf A4 aus. Falten Sie sie einmal der Länge nach, dann zweimal quer. So erhalten Sie ein perfektes Mini-Klassentelefonbuch für Ihre Geldtasche!
              </p>
            </div>

            {/* Foldable Pocket A4 Frame Mockup */}
            <div className="border-4 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 border-t-2 border-dashed border-slate-300" />
                <div className="h-full w-0.5 border-l-2 border-dashed border-slate-300" />
              </div>

              {/* Booklet Header */}
              <div className="flex justify-between items-baseline mb-4 text-slate-900 border-b border-slate-900/10 pb-1 font-black uppercase text-[0.59375rem] tracking-widest">
                <span>🎒 Notfall-Klassenliste</span>
                <span>Klasse: {app?.stufe}.Klasse ({app?.schuljahr})</span>
              </div>

              {/* Tiny Grid list */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.5625rem] text-slate-800 leading-tight">
                {sorted.map((st, idx) => (
                  <div key={st.id} className="border-b border-slate-200 pb-1.5 flex flex-col justify-between">
                    <div className="flex justify-between font-black text-slate-950">
                      <span>{idx + 1}. {st.nachname} {st.vorname}</span>
                      <span className="text-stone-400 font-mono text-[0.5rem]">{st.geburtstag || 'k.A.'}</span>
                    </div>
                    <div className="flex justify-between text-[0.5rem] text-stone-500 mt-0.5">
                      <span className="truncate">👩 {st.telefon_mutter || 'Keine Nummer'}</span>
                      <span className="truncate">👨 {st.telefon_vater || 'Keine Nummer'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra fold markers */}
              <div className="text-[0.5rem] text-slate-400 font-bold uppercase tracking-widest text-center mt-6 select-none">
                ✂️ Faltlinien (Zweimal falten) • Passt perfekt in jeden Geldbeutel
              </div>
            </div>
          </div>
        );
      }

      case 'labels': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Große Klassenzimmer-Ordnungsbox-Labels (6 pro Blatt)
            </span>

            <div className="grid grid-cols-2 gap-4">
              {stLabels.map((lbl, idx) => (
                <div key={idx} className="avoid-break bg-white border-4 border-slate-900 rounded-3xl p-6 text-center flex flex-col justify-center items-center shadow-md aspect-[120/75] group transition-all hover:scale-[1.01]">
                  {/* Label Title with prominent typography */}
                  <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {lbl}
                  </h3>
                  <div className="w-12 h-1 bg-slate-900 mt-4 rounded-full" />
                  <span className="text-[0.5rem] font-black uppercase tracking-wider text-slate-400 mt-2 select-none">Klassenzimmer-Beschriftung</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'ids': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Namenskarten (85 × 54 mm)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {students.map(st => (
                <div key={st.id} className="avoid-break w-full max-w-[340px] aspect-[85/54] bg-slate-950 text-white rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden shadow-md border border-slate-800">
                  {/* Decorative background circle */}
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-650 rounded-full opacity-10 pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-2">
                    <div>
                      <h4 className="text-[0.5625rem] font-black tracking-wider uppercase text-indigo-400 truncate max-w-[150px]">
                        {stSchoolName}
                      </h4>
                      <span className="text-[0.5rem] font-bold text-slate-400 block mt-0.5 leading-none">NAMENSKARTE · KEIN AMTLICHER AUSWEIS</span>
                    </div>
                    <span className="text-[0.5625rem] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded tracking-wide font-mono">
                      {app?.schuljahr}
                    </span>
                  </div>

                  {/* Card Core: Photo placeholder + Details */}
                  <div className="flex-1 py-2 flex gap-3 items-center">
                    {/* Photo Slot */}
                    <div className="w-12 h-16 bg-slate-900 border border-white/10 rounded flex flex-col items-center justify-center text-slate-500 shrink-0 select-none">
                      <span className="text-xs">👤</span>
                      <span className="text-[0.375rem] font-bold mt-1 uppercase text-slate-600 tracking-wider">FOTO</span>
                    </div>

                    {/* Details list */}
                    <div className="flex-1 text-[0.5625rem] space-y-0.5 min-w-0">
                      <div>
                        <span className="text-[0.45rem] uppercase text-slate-500 block">Name des Schülers / der Schülerin</span>
                        <strong className="text-white text-[0.6875rem] font-black leading-none truncate block capitalize">{st.nachname}, {st.vorname}</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5">
                        <div>
                          <span className="text-[0.45rem] uppercase text-slate-500 block">Schulstufe</span>
                          <span className="font-bold text-indigo-300 block">{app?.stufe || st.besuchsjahr}. Klasse</span>
                        </div>
                        <div>
                          <span className="text-[0.45rem] uppercase text-slate-500 block">Geburtsdatum</span>
                          <span className="font-bold text-slate-300 block">{st.geburtstag || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class Seal watermark overlay */}
                  <div className="absolute bottom-1 right-2 w-10 h-10 border border-indigo-450/25 rounded-full flex items-center justify-center font-black text-[0.3125rem] text-indigo-450/45 rotate-12 uppercase pointer-events-none">
                    SEAL-VS
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'birthday': {
        const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const emojis = ['❄️', '⛄', '🌱', '🌸', '🌼', '☀️', '🏖️', '🍦', '🍂', '🍁', '🪵', '🎄'];
        
        // Group students by birth month
        const group: Record<number, any[]> = {};
        students.forEach(s => {
          if (s.geburtstag) {
            // format standard is DD.MM.YYYY
            const parts = s.geburtstag.split('.');
            if (parts.length >= 2) {
              const month = parseInt(parts[1], 10) - 1; // 0-indexed
              if (month >= 0 && month < 12) {
                if (!group[month]) group[month] = [];
                group[month].push(s);
              }
            }
          }
        });

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-4xl mx-auto space-y-6 text-left">
            <div className="border-b-[2pt] border-slate-900 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[0.5625rem] bg-indigo-900 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">KLASSEN-WALLPAPER</span>
                <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-2">Klassen-Geburtstagskalender 📅</h2>
                <p className="text-[0.6875rem] font-bold text-slate-500 mt-0.5">A4 Querformat Poster für die Klassenzimmerwand</p>
              </div>
              <span className="text-[0.625rem] font-bold text-slate-400">Klasse: {app?.stufe}.Klasse</span>
            </div>

            {/* Poster Grid of months */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {months.map((m, idx) => {
                const birthdayKids = group[idx] || [];
                return (
                  <div key={m} className={`border p-3.5 rounded-2xl bg-slate-50 flex flex-col justify-between min-h-24 transition-all hover:bg-slate-100 ${birthdayKids.length > 0 ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-150'}`}>
                    <div>
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <span className="text-[0.6875rem] font-black text-slate-800 uppercase tracking-wider">{m}</span>
                        <span className="text-xs">{emojis[idx]}</span>
                      </div>
                      
                      <div className="space-y-1 mt-2">
                        {birthdayKids.length > 0 ? (
                          birthdayKids.map(k => {
                            const bday = k.geburtstag.split('.')[0];
                            return (
                              <div key={k.id} className="text-[0.6875rem] font-bold text-slate-700 truncate capitalize flex justify-between">
                                <span>🎉 {k.vorname}</span>
                                <span className="font-mono text-indigo-600 text-[0.625rem]">({bday}.)</span>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-[0.5625rem] text-slate-400 italic block">Keine Geburtstage</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'jobs': {
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b-[2pt] border-slate-900 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[0.5625rem] bg-indigo-900 text-white font-black px-2.5 py-1 rounded uppercase tracking-wider">KLASSENDIENSTE</span>
                <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-2">Klassendienste-Poster 🧹</h2>
                <p className="text-[0.6875rem] font-bold text-slate-500 mt-0.5">Wer hilft heute im Klassenzimmer mit?</p>
              </div>
              <span className="text-[0.625rem] font-bold text-slate-400">Klasse {app?.stufe}.Klasse</span>
            </div>

            {/* Poster content */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stJobs).map(([job, studId]) => {
                const targetStudent = students.find(s => s.id === studId);
                return (
                  <div key={job} className={`border-2 p-5 rounded-3xl text-center transition-all ${targetStudent ? 'border-emerald-500 bg-emerald-50/10 shadow-3xs' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
                    <span className="text-3xl block mb-2">{job.split(' ').pop()}</span>
                    <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-550">{job.replace(/\s\S+$/, '')}</h4>
                    
                    <div className="mt-3">
                      {targetStudent ? (
                        <span className="text-[1.125rem] leading-normal font-black text-emerald-900 capitalize block underline decoration-emerald-400 decoration-2 underline-offset-4">
                          ✨ {targetStudent.vorname} {targetStudent.nachname}
                        </span>
                      ) : (
                        <span className="text-[0.6875rem] text-slate-400 italic block font-bold">
                          — Noch unbesetzt —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'meeting': {
        return (
          <div className="space-y-6 p-2 text-left">
            <span className="text-[0.5625rem] font-bold text-slate-400 uppercase block select-none">
              🖨️ A4 Hochformat · Sprechtag-Terminkärtchen (Dashed cut lines)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map(st => {
                const timeAllocated = stMeetingTimes[st.id] || '_________________';
                return (
                  <div key={st.id} className="avoid-break bg-[#fcfdfd] border-2 border-dashed border-sky-400 rounded-3xl p-5 relative flex flex-col justify-between shadow-2xs aspect-[130/80] text-left">
                    {/* Header */}
                    <div className="border-b border-sky-100 pb-2.5 flex justify-between items-start">
                      <div>
                        <span className="text-[0.5rem] bg-sky-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">ERINNERUNG</span>
                        <h4 className="text-[0.875rem] leading-snug font-black text-sky-900 mt-1">Elternsprechtag-Termin</h4>
                      </div>
                      <span className="text-2xl">💬</span>
                    </div>

                    {/* Content Details */}
                    <div className="py-3 text-[0.6875rem] font-bold text-slate-600 space-y-1">
                      <p>Schüler/in: <strong className="text-slate-900 capitalize">{st.vorname} {st.nachname}</strong></p>
                      <p>Datum: <strong className="text-slate-900">{stMeetingDate}</strong></p>
                      <p>Uhrzeit: <strong className="text-indigo-600 text-[0.8125rem] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block font-black mt-0.5">{timeAllocated} Uhr</strong></p>
                      <p>Raum: <strong className="text-slate-900">{stMeetingRoom}</strong></p>
                    </div>

                    {/* Mitzubringen note */}
                    {stMeetingDocs && (
                      <div className="text-[0.5625rem] bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-slate-500 font-bold leading-normal">
                        📝 Bitte mitbringen: {stMeetingDocs}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'queue': {
        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-black">
                  🖨️
                </div>
                <div>
                  <h2 className="text-[1.25rem] leading-normal font-black text-slate-900">Druck-Warteschlange (Bulk Multi-Page Layout)</h2>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sammelauftrag für alle {students.length} Kinder</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-[0.75rem] leading-tight font-semibold text-slate-700">
              <p className="leading-relaxed font-bold">
                Hier können Sie ein gebündeltes PDF drucken, das für alle Kinder nacheinander mehrere verschiedene Dokumente in einem Rutsch zusammenstellt. Ideal, um am Jahresende Zeit und Papier zu sparen!
              </p>

              <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 space-y-2.5">
                <h4 className="text-[0.6875rem] font-black uppercase tracking-wider text-emerald-800">Paketinhalt für dieses Jahr:</h4>
                <div className="space-y-1.5 font-bold text-emerald-950">
                  <div className="flex gap-2"><span>•</span> <span>1x Klassen-Tischschilder ({stTischStyle === 'dino' ? '🦖 Dino' : stTischStyle === 'space' ? '🚀 Space' : stTischStyle === 'ocean' ? '🐬 Ocean' : '✨ Minimal'})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Schul-Urkunde ({stUrkundeTitle})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Hausübungs- &amp; Joker-Gutschein ({stJokerTitle})</span></div>
                  <div className="flex gap-2"><span>•</span> <span>1x Taschen-Emergency-Klassenliste</span></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-4">
                <span className="text-[0.5625rem] text-slate-400 block font-bold leading-none">Status: Bereit für den A4-Druck</span>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[0.6875rem] tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🖨️</span>
                  <span>Jetzt Sammeldruck starten</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  function renderLobDruckkarteView() {
    let toRender = students;
    if (lobStudentMode === 'single') {
      toRender = students.filter(s => s.id === lobSelectedStudentId);
    }

    const tpl = COMPLIMENT_TEMPLATES.find(t => t.id === lobSelectedTemplate) || COMPLIMENT_TEMPLATES[0];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {toRender.map((st, idx) => (
          <div key={`${st.id}-${idx}`} className="avoid-break mb-8">
            <div 
              id={`printable-compliment-card-${st.id}`}
              className="w-[148mm] h-[105mm] bg-[#fffcf5] border-[6px] border-double border-amber-600 p-8 rounded-lg shadow-md flex flex-col justify-between text-slate-900 relative mx-auto"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', transform: 'scale(0.8)', transformOrigin: 'top center' }}
            >
              {/* Frame lines decoration */}
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-amber-700/25 pointer-events-none rounded" />
              
              <div className="text-center space-y-2 mt-4">
                <span className="text-4xl block">{tpl.emoji}</span>
                <h3 className="text-amber-800 text-[1.125rem] leading-normal font-black uppercase tracking-widest leading-none mt-2">
                  Lob-Dusche & Anerkennung
                </h3>
                <p className="text-[0.625rem] font-sans font-bold text-stone-400 mt-2">EIN HERZLICHES DANKE FÜR DEINE PÄDAGOGISCHE LEISTUNG</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-[0.75rem] leading-tight text-stone-500 italic mt-2 leading-none">Gewidmet an:</p>
                <h4 className="text-[1.5rem] leading-normal font-serif font-black underline decoration-amber-300 py-2 text-slate-900 capitalize mt-2 mb-2">
                  {st.vorname} {st.nachname}
                </h4>
                <p className="text-[0.875rem] leading-snug text-slate-800 tracking-tight leading-relaxed italic px-4 max-w-sm mt-3">
                  „{lobCustomText || tpl.complimentText}“
                </p>
              </div>

              <div className="flex justify-between items-center px-4 pt-4 border-t border-amber-200/40 text-[0.6875rem] font-sans font-bold text-amber-900 mb-2">
                <span>Von: <span className="underline italic">{lobSender}</span></span>
                <span>Ein gutes Herz verändert die Welt ❤️</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- H. NEW HIGH-FIDELITY RENDERERS ---

  function renderSingleElternDiagnostik(st: any) {
    const tests = app?.diagnostikTests || [];
    const erhebungen = [...(app?.diagnostikErhebungen || [])]
      .filter((e: any) => e.schuelerId === st.id)
      .sort((a, b) => b.datum.localeCompare(a.datum));
      
    // wir gruppen nach testId
    const byTest: Record<string, any[]> = {};
    erhebungen.forEach(e => {
        if (!byTest[e.testId]) byTest[e.testId] = [];
        byTest[e.testId].push(e);
    });

    return (
      <div className="space-y-6 pt-4 text-[0.6875rem] print-dossier-body">
        {/* Main Cover Panel */}
        <div className="flex border-b-2 border-slate-900 pb-2 mb-4 justify-between items-end">
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 uppercase tracking-widest">
              Lern- &amp; Entwicklungsbericht
            </h2>
            <p className="text-[0.875rem] leading-snug text-slate-500 font-bold mt-1">Für {st.vorname} {st.nachname}</p>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-slate-500 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Klasse • SJ {app?.schuljahr}</span>
            <span className="block mt-0.5">Bericht erstellt am: {new Date().toLocaleDateString('de-AT')}</span>
          </div>
        </div>

        {erhebungen.length === 0 ? (
           <p className="text-slate-400 font-bold italic text-center py-6">Noch keine Diagnostik-Daten für {st.vorname} erfasst.</p>
        ) : (
           <div className="space-y-8">
             {Object.entries(byTest).map(([testId, testErhebungen]) => {
                const testMeta = tests.find(t => t.id === testId);
                const isLive = testId.startsWith('live-');
                // The most recent result is the first one
                const latest = testErhebungen[0];
                return (
                  <div key={testId} className="border border-slate-200 rounded-2xl  pb-4 break-inside-avoid">
                     <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div>
                          <h3 className="font-black text-slate-800 text-[0.875rem] leading-snug">{testMeta?.name || 'Test'}</h3>
                          <p className="text-[0.625rem] text-slate-500">{testMeta?.kurzbeschreibung}</p>
                        </div>
                        {isLive && <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[0.5rem] font-black uppercase tracking-widest">1:1 Live-Diagnose</span>}
                     </div>

                     <div className="p-4 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center gap-3">
                              <div className={`text-[1.5rem] leading-normal font-black tabular-nums ${isDiagnosticAlert(latest) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                 {latest.ergebniswert}
                              </div>
                              <div className="text-[0.625rem] uppercase font-bold text-slate-400">Aktueller Stand<br/>({latest.datum})</div>
                           </div>

                           {diagShowComments && latest.kommentar && (
                             <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[0.5625rem] font-black uppercase text-slate-400 mb-1 block">Beobachtungen &amp; Notizen:</span>
                                <div className="text-[0.75rem] leading-tight text-slate-700 italic preserve-whitespace">{latest.kommentar.replace('Lehrperson-Notiz:','')}</div>
                             </div>
                           )}
                           
                           {/* Show meta data details if available */}
                           {latest.meta?.answers && (
                             <div className="mt-3 space-y-1">
                                <p className="text-[0.5625rem] font-black uppercase text-slate-400">Detail-Auswertung:</p>
                                <div className="grid grid-cols-2 gap-1 text-[0.625rem] text-slate-600">
                                   {latest.meta.type === 'zehneruebergang' ? (
                                      Object.entries(latest.meta.answers).slice(0,4).map(([k,v]:any) => (
                                         <div key={k} className="bg-slate-50 p-1.5 rounded border border-slate-100"><span className="font-bold">{k}:</span> {v}</div>
                                      ))
                                   ) : latest.meta.type === 'sozialemotional' || latest.meta.type === 'feinmotorik' ? (
                                      Object.entries(latest.meta.answers).slice(0,4).map(([k,v]:any) => (
                                         <div key={k} className="bg-slate-50 p-1.5 rounded border border-slate-100"><span className="font-bold">{k}:</span> <span className={v==='Auffällig'?'text-rose-600':'text-emerald-600'}>{v}</span></div>
                                      ))
                                   ) : null}
                                </div>
                             </div>
                           )}
                        </div>

                        {/* Chart Area if multiple measurements and settings enabled */}
                        {diagShowCharts && testErhebungen.length > 1 && (
                           <div className="flex-1 pl-4 h-32 flex flex-col justify-end relative">
                              <span className="text-[0.5625rem] font-black uppercase text-slate-400 absolute top-0 left-4 hide-on-print">Entwicklungsverlauf</span>
                              <div className="flex items-end gap-2 h-20 w-full mt-4 border-b border-slate-200 pb-1">
                                {testErhebungen.slice().reverse().map((measurement, idx) => {
                                   const maxVal = Math.max(...testErhebungen.map((m:any) => m.ergebniswert)) || 100;
                                   const heightPct = Math.min(100, Math.max(5, (measurement.ergebniswert / maxVal) * 100));
                                   return (
                                     <div key={idx} className="flex flex-col items-center flex-1 justify-end h-full relative group">
                                        <div className={`w-full rounded-t-sm transition-all ${isDiagnosticAlert(measurement) ? 'bg-amber-300' : 'bg-indigo-300'}`} style={{ height: `${heightPct}%` }} />
                                        <span className="text-[0.5rem] mt-1 text-slate-400 font-bold text-wrap leading-tight break-words max-w-full">{measurement.datum.substring(0,5)}</span>
                                        <span className="absolute -top-4 text-[0.5625rem] font-black text-slate-600 text-wrap leading-tight break-words max-w-full">{measurement.ergebniswert}</span>
                                     </div>
                                   )
                                })}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
                );
             })}
           </div>
        )}
      </div>
    );
  }

  function renderSingleStudentProfile(st: any) {
    // 1. Fetch Grades Summary
    const grades = getStudentGradesSummary(st.id);

    // 2. Fetch KEL & Reflexion
    const kelRow = getKelDataForStudent(st.id);
    const CRITERION_DICT: Record<string, string> = {
      'zuzuhoeren': 'Zuhören & Verstehen',
      'lesen': 'Lesefreude & Technik',
      'rechnen': 'Mathematisches Denken',
      'konzentration': 'Ausdauer & Fokus',
      'regeln': 'Regeln & Vereinbarungen',
      'de_hoeren_gespraeche': 'D-Hören/Sprechen: Unterrichtsbeiträge',
      'de_hoeren_standardsprache': 'D-Hören/Sprechen: Aussprache/Vortrag',
      'de_hoeren_zuhoeren': 'D-Hören/Sprechen: Zuhör-Kompetenz',
      'de_lesen_fliessend': 'D-Lesen: Flüssig lesen',
      'de_lesen_verstaendnis': 'D-Lesen: Leseverständnis',
      'de_lesen_info_verarbeit': 'D-Lesen: Textverständnis',
      'de_rechtschreiben_richtig': 'D-Rechtschreiben: Abschreiben',
      'de_rechtschreiben_lernwoerter': 'D-Rechtschreiben: Lernwörter',
      'de_rechtschreiben_wortfamilie': 'D-Rechtschreiben: Grammatik',
      'de_verfassen_planen': 'D-Verfassen: Textentwurf',
      'ma_zahlen_zahlenraum': 'M-Arithmetik: Zahlenraum',
      'ma_zahlen_stellenwert': 'M-Arithmetik: Stellenwert',
      'ma_rechnen_addition': 'M-Rechnen: Addition',
      'ma_rechnen_subtraktion': 'M-Rechnen: Subtraktion',
      'ma_rechnen_multiplikation': 'M-Rechnen: Malreihen',
      'ma_rechnen_division': 'M-Rechnen: Division',
      'ma_rechnen_sachaufgaben': 'M-Rechnen: Sachaufgaben',
      'ma_groessen_umwandeln': 'M-Größen: Maßeinheiten',
      'ma_raum_figuren': 'M-Geometrie: Figuren',
      'su_interesse': 'Sachunterricht: Eigeninteresse',
      'su_wiedergabe': 'Sachunterricht: Erklärung',
      'al_mitarbeit': 'Verhalten: Mitarbeit',
      'al_konzentration': 'Verhalten: Fokus/Ausdauer',
      'al_ordnung': 'Verhalten: Ordnung/Heftführung',
      'al_selbststaendigkeit': 'Verhalten: Selbstständigkeit',
      'al_hausuebungen': 'Verhalten: Hausübungen'
    };

    // 3. Fetch Klassenkasse Payments
    const sammlungen = app.klassenkasse?.sammlungen || [];
    const studentPayments = sammlungen.map((s: any) => {
      const status = s.status?.[st.id] || 'offen';
      const amount = s.betraege?.[st.id] || s.betrag || 0;
      return { id: s.id, titel: s.titel, datum: s.erstelltAm, status, amount };
    }).filter((p: any) => p.amount > 0);
    const totalPaid = studentPayments.filter((p: any) => p.status === 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
    const totalOpen = studentPayments.filter((p: any) => p.status !== 'bezahlt').reduce((a: number, b: any) => a + b.amount, 0);
    const totalAmount = totalPaid + totalOpen;
    const progressPercent = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    // 4. MIKA-D status
    const mikaDStatus = st.foerderprofil?.mikaDStatus || 'nicht erhoben';
    const mikaDDatum = st.foerderprofil?.mikaDDatum || '';
    const MIKA_STAGES = [
      { id: '3', label: 'AO - Stufe 3', desc: 'Außerordentlich (geringe Kenntnisse)', border: 'border-rose-300', text: 'text-rose-800 bg-rose-50' },
      { id: '2', label: 'AO - Stufe 2', desc: 'Außerordentlich (mäßige Kenntnisse)', border: 'border-amber-300', text: 'text-amber-800 bg-amber-50' },
      { id: '1', label: 'AO - Stufe 1', desc: 'Außerordentlich (fortgeschritten)', border: 'border-indigo-300', text: 'text-indigo-800 bg-indigo-50' },
      { id: 'ordentlich', label: 'Ordentlich', desc: 'Ausreichende Deutschkenntnisse', border: 'border-emerald-300', text: 'text-emerald-800 bg-emerald-50' },
      { id: 'nicht erhoben', label: 'Nicht erhoben', desc: 'Derzeit keine MIKA-D Daten erfasst', border: 'border-slate-200', text: 'text-slate-500 bg-slate-50' },
    ];
    const mikaCurrent = MIKA_STAGES.find(ms => ms.id === mikaDStatus) || MIKA_STAGES[4];

    // 5. Attendance Calculation
    const attendanceData = app.anwesenheit?.[st.id] || {};
    let excusedHours = 0;
    let unexcusedHours = 0;
    Object.values(attendanceData).forEach((dayData: any) => {
      Object.values(dayData).forEach(status => {
        if (status === 'e') excusedHours++;
        else if (status === 'u' || status === 'f') unexcusedHours++;
      });
    });

    // 6. Behavior logs & Status
    const behaviorStages = app.behavior_stages || [
      { id: '1', label: 'Herausragend', icon: '🌟', color: 'text-amber-500 bg-amber-50 border-amber-200' },
      { id: '2', label: 'Sehr positiv', icon: '😊', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
      { id: '3', label: 'Normal / Neutral', icon: '😐', color: 'text-slate-500 bg-slate-50 border-slate-200' },
      { id: '4', label: 'Ermahnung', icon: '⚠️', color: 'text-orange-500 bg-orange-50 border-orange-200' },
      { id: '5', label: 'Kritisch', icon: '❌', color: 'text-rose-500 bg-rose-50 border-rose-200' }
    ];
    const currentStatusId = app.behavior_status?.[st.id] || app.behavior_default_stage_id || '3';
    const currentStage = behaviorStages.find((bs: any) => bs.id === currentStatusId) || behaviorStages[2];

    const studentNotes = (app.notizen || [])
      .filter((n: any) => n.schuelerId === st.id)
      .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    // 7. KI-Portfolio summary
    const cachedKiSummary = app.kiPortfolioSummaries?.[st.id] || '';

    // 8. Stars rendering helper
    const renderStars = (val?: number) => {
      if (val === undefined || val === null) return '—';
      const filled = '★'.repeat(Math.min(4, Math.max(0, val)));
      const empty = '☆'.repeat(Math.max(0, 4 - val));
      return `${filled}${empty}`;
    };

    return (
      <div className="text-left space-y-12 leading-relaxed text-black print:text-black">
        
        {/* ==================== PAGE 1: DECKBLATT, STAMMDATEN & FINANZEN ==================== */}
        <div className="page-break space-y-8 pb-8 bg-white">
          {/* Header */}
          <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
            <div>
              <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">SCHÜLERDOSSIER - LEHRERMAPPE</span>
              <h2 className="text-[1.625rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                Dossier: {st.nachname} {st.vorname}
              </h2>
            </div>
            <div className="text-right text-[0.6875rem] font-bold text-slate-500 leading-tight">
              <span>Stufe: {app?.stufe || st.besuchsjahr || '—'} • SJ {app?.schuljahr?.trim() || 'nicht angegeben'}</span>
              <span className="block mt-1 font-semibold text-slate-450">Erstellt: {new Date().toLocaleDateString('de-AT')}</span>
            </div>
          </div>

          {/* General Stammdaten */}
          {profShowStammdaten && (
            <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
              <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <User size={12} className="text-indigo-600" />
                I. Allgemeine Stammdaten &amp; Schülerdetails
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-6 text-[0.75rem] leading-tight text-slate-700 leading-normal font-semibold">
                <div><strong>Vorname:</strong> {st.vorname}</div>
                <div><strong>Nachname:</strong> {st.nachname}</div>
                <div><strong>Geburtstag:</strong> {st.geburtstag ? new Date(st.geburtstag).toLocaleDateString('de-AT') : '—'}</div>
                <div><strong>Religion / Bekenntnis:</strong> {st.religion || '—'}</div>
                <div><strong>Staatsbürgerschaft:</strong> {st.staatsbuergerschaft || '—'}</div>
                <div><strong>Besuchsjahr:</strong> {st.besuchsjahr ? `${st.besuchsjahr}. Schuljahr` : '—'}</div>
                <div><strong>Schulstufe:</strong> {app?.stufe || st.besuchsjahr}. Schulstufe</div>
                <div><strong>Klassencode:</strong> {app?.klassenbezeichnung || '—'}</div>
                <div><strong>DaZ (Deutsch als Zweitsprache):</strong> {st.daz ? 'Ja' : 'Nein'}</div>
                <div><strong>Sonderpäd. Förderbedarf (SPF):</strong> {st.spf ? 'Ja' : 'Nein'}</div>
                <div><strong>Leistungsniveau:</strong> {st.niveau || '—'}</div>
              </div>

              {profShowContacts && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block flex items-center gap-1.5">
                  <MapPin size={12} className="text-indigo-600" />
                  Wohnanschrift &amp; Kontakte der Erziehungsberechtigten
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight text-slate-700 font-semibold">
                  <div className="space-y-1">
                    <div><strong>Anschrift:</strong> {st.anschrift || '—'}</div>
                    <div><strong>PLZ / Ort:</strong> {st.plz ? `${st.plz} ${st.ort || ''}` : '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <div><strong>Telefon Mutter:</strong> {st.telefon_mutter || '—'}</div>
                    <div><strong>Telefon Vater:</strong> {st.telefon_vater || '—'}</div>
                    <div><strong>E-Mail Eltern:</strong> {st.email_eltern || '—'}</div>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Klassenkasse & Finanzen */}
          {profShowFinanzen && (
            <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
              <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Banknote size={12} className="text-cyan-600" />
                II. Klassenkasse &amp; Geldsammlungs-Beiträge
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-slate-400">Kontostand (Gesamt)</span>
                  <span className="text-[1.125rem] leading-normal font-black text-slate-800">{totalAmount.toFixed(2)} €</span>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-emerald-600">Bezahlt</span>
                  <span className="text-[1.125rem] leading-normal font-black text-emerald-800">{totalPaid.toFixed(2)} €</span>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl flex flex-col justify-between">
                  <span className="text-[0.5625rem] font-bold uppercase text-rose-600">Offen / Ausstehend</span>
                  <span className="text-[1.125rem] leading-normal font-black text-rose-800">{totalOpen.toFixed(2)} €</span>
                </div>
              </div>

              {studentPayments.length > 0 ? (
                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-400 uppercase tracking-wider font-black">
                        <th className="py-2">Titel der Sammlung</th>
                        <th className="py-2 text-right">Soll-Betrag</th>
                        <th className="py-2 text-right">Erhalten am</th>
                        <th className="py-2 text-right">Zahlungsstatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                          <td className="py-2 font-bold text-slate-800">{p.titel}</td>
                          <td className="py-2 text-right tabular-nums">{p.amount.toFixed(2)} €</td>
                          <td className="py-2 text-right text-slate-400">{p.datum || '—'}</td>
                          <td className={`py-2 text-right font-black uppercase text-[0.59375rem] ${p.status === 'bezahlt' ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {p.status === 'bezahlt' ? '● BEZAHLT' : '○ OFFEN'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-[0.75rem] leading-tight italic">Keine eingetragenen Finanzforderungen oder Geldsammlungen vorhanden.</p>
              )}
            </div>
          )}
        </div>


        {/* ==================== PAGE 2: NOTENVERLAUF & MIKA-D ==================== */}
        {(profShowLeistungen || profShowMikaD) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - BEREICH LEISTUNGEN &amp; SPRACHSTAND</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Leistungsbilanz &amp; MIKA-D: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>SJ {app?.schuljahr?.trim() || 'nicht angegeben'}</span>
              </div>
            </div>

            {/* Grades Table */}
            {profShowLeistungen && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Award size={12} className="text-indigo-600" />
                  III. Notengitter &amp; Semester-Leistungen
                </span>

                <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-[0.59375rem] text-slate-500 uppercase tracking-widest font-black">
                      <th className="py-2.5">Pflichtgegenstand</th>
                      <th className="py-2.5 text-center">1. Semester</th>
                      <th className="py-2.5 text-center">2. Semester</th>
                      <th className="py-2.5 text-right">Beurteilungsart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.length > 0 ? (
                      grades.map((gr, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                          <td className="py-2.5 font-bold text-slate-900">{gr.subject}</td>
                          <td className="py-2.5 text-center text-slate-600 font-semibold">{gr.semester1}</td>
                          <td className="py-2.5 text-center text-slate-600 font-semibold">{gr.semester2}</td>
                          <td className="py-2.5 text-right text-slate-500 font-black uppercase text-[0.59375rem]">
                            {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte → Prozentstand'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-medium italic">
                          Keine Fachleistungen oder Noten in der Notenmappe eingetragen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* MIKA-D Section */}
            {profShowMikaD && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <GraduationCap size={12} className="text-indigo-600" />
                  IV. MIKA-D Sprachstandserhebung (Deutsch als Zweitsprache)
                </span>

                <div className={`p-4 rounded-xl border ${mikaCurrent.border} ${mikaCurrent.text} flex items-start gap-4`}>
                  <div className="w-10 h-10 rounded-lg bg-white shadow-3xs flex items-center justify-center text-[1.25rem] shrink-0 font-bold border border-slate-100">
                    🗣️
                  </div>
                  <div className="space-y-1">
                    <p className="text-[0.5625rem] uppercase font-black tracking-widest text-slate-400">Eingestufter Statuswert</p>
                    <h4 className="text-[1.125rem] leading-normal font-black tracking-tight">{mikaCurrent.label}</h4>
                    <p className="text-[0.75rem] leading-tight font-medium opacity-90">{mikaCurrent.desc}</p>
                    {mikaDDatum && (
                      <p className="text-[0.625rem] font-semibold opacity-60 pt-1 flex items-center gap-1 uppercase tracking-wider">
                        <Calendar size={10} /> Letzte Erhebung am: {new Date(mikaDDatum).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 3: VERHALTENSBEOBACHTUNGEN, PRÄSENZ & SELBSTREFLEXION ==================== */}
        {(profShowVerhalten || profShowKELReflexion) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - BEREICH VERHALTEN &amp; PRÄSENZ</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Verhaltensbeobachtung &amp; Selbstreflexion: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Schulstufe: {app?.stufe || st.besuchsjahr}.Klasse</span>
              </div>
            </div>

            {/* Behavior & Attendance */}
            {profShowVerhalten && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-indigo-600" />
                  V. Sozialverhalten &amp; Präsenzerfassung
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal">🧭</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-slate-400 leading-none mb-1">Verhaltensampel</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{currentStage.icon} {currentStage.label}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal text-emerald-500">✓</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-emerald-600 leading-none mb-1">Fehlstunden (Entschuldigt)</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{excusedHours} Stunden</p>
                    </div>
                  </div>
                  <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl flex items-center gap-3">
                    <div className="text-[1.25rem] leading-normal text-rose-500">⚠️</div>
                    <div>
                      <p className="text-[0.5625rem] font-bold uppercase text-rose-600 leading-none mb-1">Fehlstunden (Unentschuldigt)</p>
                      <p className="text-[0.875rem] leading-snug font-extrabold text-slate-800">{unexcusedHours} Stunden</p>
                    </div>
                  </div>
                </div>

                {/* Latest 5 observation notes */}
                <div className="pt-2 space-y-2.5">
                  <span className="text-[0.59375rem] font-black uppercase text-slate-450 tracking-wider block">Jüngste Beobachtungsnotizen &amp; Logeinträge (Kompakt)</span>
                  {studentNotes.length > 0 ? (
                    <div className="space-y-2">
                      {studentNotes.slice(0, 5).map((n: any, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start text-[0.75rem] leading-tight text-slate-700 leading-relaxed font-semibold">
                          <div className="space-y-0.5">
                            <span className="text-[0.5625rem] uppercase font-black text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.5">
                              {n.kategorie || 'Beobachtung'}
                            </span>
                            <p className="text-slate-800 font-bold mt-1">{n.inhalt || n.text}</p>
                          </div>
                          <span className="text-[0.625rem] font-bold text-slate-400 whitespace-nowrap ml-4">
                            {n.timestamp ? new Date(n.timestamp).toLocaleDateString('de-DE') : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-450 text-[0.75rem] leading-tight italic">Es sind keine Verhaltens- oder Beobachtungsnotizen für dieses Semester vorhanden.</p>
                  )}
                </div>
              </div>
            )}

            {/* KEL Selbstreflexion Grid */}
            {profShowKELReflexion && kelRow && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Heart size={12} className="text-rose-600" />
                  VI. KEL-Selbstreflexionskatalog (Direkter Vergleich)
                </span>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[0.75rem] leading-tight text-slate-700 font-semibold leading-relaxed">
                    <strong>Vereinbarungen aus dem KEL-Gespräch (vom {kelRow.datum || '—'}):</strong> <br />
                    {kelRow.vereinbarungen || 'Keine spezifischen schriftlichen Zielvereinbarungen getroffen.'}
                  </p>
                </div>

                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                        <th className="py-2">Pädagogische Reflexionskriterien</th>
                        <th className="py-2 text-center">Selbsteinschätzung Kind</th>
                        <th className="py-2 text-center">Einschätzung Lehrperson</th>
                        <th className="py-2 text-right">Kind-Kommentar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(CRITERION_DICT).map((key, idx) => {
                        const kidVal = kelRow.selbsteinschaetzungKind?.[key];
                        const teachVal = kelRow.einschaetzungLehrperson?.[key];
                        if (!kidVal && !teachVal) return null;

                        return (
                          <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                            <td className="py-2 font-bold text-slate-900">{CRITERION_DICT[key] || key}</td>
                            <td className="py-2 text-center text-amber-500 font-extrabold text-[0.8125rem]">
                              {renderStars(kidVal?.wert)}
                            </td>
                            <td className="py-2 text-center text-indigo-600 font-extrabold text-[0.8125rem]">
                              {renderStars(teachVal?.wert)}
                            </td>
                            <td className="py-2 text-right text-slate-500 text-[0.6875rem] italic text-wrap max-w-xs break-words">
                              {kidVal?.kommentar || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 4: PORTFOLIO & PÄDAGOGISCHE DIAGNOSTIK ==================== */}
        {(profShowDiagnostik || profShowFoerderprofil || profShowKIPortfolio) && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - DIAGNOSTIK &amp; FÖRDERUNGSBILANZ</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Pädagogische Diagnostik &amp; Förderplan: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Klassencode: {app?.klassenbezeichnung || '—'}</span>
              </div>
            </div>

            {/* Diagnostik Erhebungen */}
            {profShowDiagnostik && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Scale size={12} className="text-indigo-600" />
                  VII. Standardisierte Erhebungen &amp; 1:1 Live-Protokolle
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight font-semibold leading-normal">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[0.5625rem] uppercase font-black text-slate-400 mb-1">Zusätzliche strukturierte Profildaten:</p>
                    <p className="text-slate-800 font-extrabold text-[0.875rem] leading-snug">
                      {Object.values(app.oberauData?.[st.id]?.evaluationData || {}).filter((value) => value !== null && value !== undefined).length} dokumentierte Werte
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[0.5625rem] uppercase font-black text-slate-400 mb-1">Pädagogische Zusatzbemerkung:</p>
                    <p className="text-slate-600 text-[0.6875rem] italic leading-tight">
                      {st.foerderprofil?.zusatzinfo || app.oberauData?.[st.id]?.remarks || 'Keine zusätzliche Bemerkung hinterlegt.'}
                    </p>
                  </div>
                </div>

                {/* Diagnostics table */}
                <div className="pt-2">
                  <table className="w-full border-collapse text-[0.75rem] leading-tight text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                        <th className="py-2">Testverfahren</th>
                        <th className="py-2 text-center">Ergebnis / Werte</th>
                        <th className="py-2 text-right">Datum</th>
                        <th className="py-2 text-right">Durchgeführt von</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === st.id).length > 0 ? (
                        (app.diagnostikErhebungen || [])
                          .filter((e: any) => e.schuelerId === st.id)
                          .map((e: any, idx) => {
                            const test = (app.diagnostikTests || []).find((t: any) => t.id === e.testId);
                            const testName = test ? test.name : (e.testId || 'Unbekannter Test');
                            return (
                              <tr key={idx} className="border-b border-slate-100 last:border-b-0 font-semibold text-slate-700">
                                <td className="py-2">
                                  <span className="font-bold text-slate-900">{testName}</span>
                                  {isDiagnosticAlert(e) && (
                                    <span className="ml-2 text-[0.5625rem] bg-rose-100 text-rose-800 px-1 rounded font-black uppercase">
                                      ⚠️ Bedarf erkannt
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-center font-mono text-slate-800">
                                  Wert: {e.ergebniswert} {e.rohwert ? `(Rohwert: ${e.rohwert})` : ''}
                                </td>
                                <td className="py-2 text-right text-slate-400">{e.datum || '—'}</td>
                                <td className="py-2 text-right text-slate-500 text-[0.6875rem]">{e.durchgefuehrtVon || 'Lehrkraft'}</td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                            Keine spezifischen standardisierten Testergebnisse oder 1:1 Protokolle hinterlegt.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Förderprofil & Förderziele */}
            {profShowFoerderprofil && (
              <div className="border border-slate-300 p-5 rounded-[1.5rem] bg-white space-y-4 avoid-break shadow-3xs">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  VIII. Pädagogisches Förderprofil &amp; Zielvereinbarungen
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[0.75rem] leading-tight font-semibold">
                  <div className="space-y-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-emerald-700 block uppercase text-[0.5625rem] mb-1">Individuelle Stärken:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {(st.foerderprofil?.staerken || []).length > 0 ? (
                        (st.foerderprofil.staerken || []).map((stg: string, idx: number) => <li key={idx}>{stg}</li>)
                      ) : (
                        <li className="italic text-slate-400">Keine Stärken explizit erfasst.</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-rose-700 block uppercase text-[0.5625rem] mb-1">Erhöhter Förderbedarf:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      {(st.foerderprofil?.foerderbedarfBereiche || []).length > 0 ? (
                        (st.foerderprofil.foerderbedarfBereiche || []).map((fb: string, idx: number) => <li key={idx}>{fb}</li>)
                      ) : (
                        <li className="italic text-slate-400">Kein spezifischer Förderbedarf erfasst.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Förderziele */}
                {st.foerderprofil?.foerderziele && st.foerderprofil.foerderziele.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[0.59375rem] font-black uppercase text-slate-450 tracking-wider block mb-2">Festgelegte Förderplan-Ziele &amp; Fortschritt</span>
                    <table className="w-full border-collapse text-[0.725rem] leading-tight text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-[0.5625rem] text-slate-500 uppercase tracking-widest font-black">
                          <th className="py-2">Bereich / Fach</th>
                          <th className="py-2">Konkretes Förderziel</th>
                          <th className="py-2 text-center">Zieltermin</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {st.foerderprofil.foerderziele.map((fz: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-b-0 text-slate-700 font-semibold">
                            <td className="py-2 font-bold text-slate-900">{fz.bereich}</td>
                            <td className="py-2">{fz.ziel} {fz.notiz ? `(${fz.notiz})` : ''}</td>
                            <td className="py-2 text-center text-slate-400 font-mono">
                              {fz.zielDatum ? new Date(fz.zielDatum).toLocaleDateString('de-DE') : '—'}
                            </td>
                            <td className="py-2 text-right font-black uppercase text-[0.59375rem] text-indigo-600">
                              {fz.status || 'In Arbeit'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {/* ==================== PAGE 5: KI-PORTFOLIO ENTWICKLUNGSBERICHT ==================== */}
        {profShowKIPortfolio && (
          <div className="page-break space-y-8 pb-8 bg-white">
            {/* Header */}
            <div className="border-b-[2.5pt] border-slate-900 pb-3.5 flex justify-between items-end avoid-break">
              <div>
                <span className="text-[0.625rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-0.5 rounded uppercase">DOSSIER - KI-ENTWICKLUNGSBERICHT</span>
                <h2 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-1 tracking-tight">
                  Entwicklungs-Zusammenfassung: {st.vorname} {st.nachname}
                </h2>
              </div>
              <div className="text-right text-[0.625rem] font-bold text-slate-400">
                <span>Gespeicherter KI-Entwurf · fachlich prüfen</span>
              </div>
            </div>

            {/* KI Content */}
            <div className="border border-slate-300 p-6 md:p-8 rounded-[1.5rem] bg-slate-50 shadow-inner">
              {cachedKiSummary ? (
                <div className="markdown-body text-[0.78125rem] text-slate-800 font-semibold space-y-4">
                  <Markdown>{cachedKiSummary}</Markdown>
                </div>
              ) : (
                <div className="space-y-3 text-center py-6 text-slate-400">
                  <div className="text-[1.5rem] leading-normal">🤖</div>
                  <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-500">
                    Bericht wurde noch nicht generiert
                  </h4>
                  <p className="text-[0.6875rem] font-medium max-w-md mx-auto leading-relaxed">
                    Hinweis: Der ganzheitliche KI-Entwicklungsbericht wurde für {st.vorname} noch nicht erstellt. 
                    Wechseln Sie im Cockpit direkt in das <strong>Schülerdossier &gt; Portfolio-Einträge</strong>, 
                    wählen Sie den Tab <strong>KI-Portfolio</strong> und klicken Sie auf <strong>"Generieren"</strong>. 
                    Sobald das Modell die Schülerdaten bündelt, wird der fertige Bericht automatisch hier vollwertig ausgegeben.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ==================== OFFICIAL DOSSIER SIGNATURE FOOTER ==================== */}
        <div className="avoid-break bg-white pt-8 mt-4 border-t border-slate-300">
          <div className="grid grid-cols-2 gap-12 text-center">
            <div className="space-y-12">
              <div className="h-10 border-b border-dashed border-slate-300" />
              <p className="text-[0.5625rem] text-slate-450 font-black uppercase tracking-widest leading-none">
                Unterschrift der Erziehungsberechtigten
              </p>
            </div>
            <div className="space-y-12">
              <div className="h-10 border-b border-dashed border-slate-300" />
              <p className="text-[0.5625rem] text-slate-450 font-black uppercase tracking-widest leading-none">
                Handzeichen der Klassenlehrkraft
              </p>
            </div>
          </div>
          <div className="pt-8 text-center text-[0.5rem] text-slate-300 font-bold uppercase tracking-widest">
            Vertraulich behandeln • Empfängerkreis und Inhalt vor Weitergabe prüfen
          </div>
        </div>

      </div>
    );
  }

  function renderSingleKelPresentation(st: any) {
    const kelRow = getKelDataForStudent(st.id);
    const grades = getStudentGradesSummary(st.id);
    const selfEval = kelRow?.selbsteinschaetzungKind || {};
    const teacherEval = kelRow?.einschaetzungLehrperson || {};

    const dimensions = [
      { key: 'zuhoeren', label: 'Zuhören & Verstehen' },
      { key: 'lesen', label: 'Lesefreude' },
      { key: 'rechnen', label: 'Sicheres Rechnen' },
      { key: 'ausdauer', label: 'Ausdauer & Fokus' },
      { key: 'regeln', label: 'Regeln einhalten' },
    ];

    return (
      <div className="space-y-6 text-left page-break">
        {/* Banner */}
        <div className="border-b-[2pt] border-slate-900 pb-2 flex justify-between items-end avoid-break">
          <div>
            <span className="text-[0.5625rem] bg-slate-900 text-white font-black tracking-widest px-2 py-0.5 rounded uppercase">KEL-PRÄSENTATION</span>
            <h2 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight mt-1">
              Kinder-Eltern-Lehrpersonen Gespräch: {st.vorname} {st.nachname}
            </h2>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-slate-500 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Klasse • SJ {app?.schuljahr}</span>
            <span className="block mt-0.5">Mappe erstellt am: {new Date().toLocaleDateString('de-AT')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-normal">
          {/* Bento Col 1: Performance */}
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-indigo-700 tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 leading-none select-none">
              📊 Leistungs-Übersicht &amp; Klassenstand
            </h4>
            
            <table className="w-full border-collapse text-[0.75rem] leading-tight text-left leading-normal font-bold">
              <thead>
                <tr className="border-b border-slate-300 text-[0.625rem] text-slate-500 uppercase tracking-widest leading-none">
                  <th className="py-2.5">Fachgebiet</th>
                  <th className="py-2.5 text-center">Aktueller dokumentierter Stand</th>
                  <th className="py-2.5 text-right font-medium">Beurteilungsart</th>
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? (
                  grades.map((gr, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2.5 text-slate-800 font-extrabold">{gr.subject}</td>
                      <td className="py-2.5 text-center">
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-black px-2.5 py-0.5 rounded text-[0.6875rem]">
                          {gr.currentDisplay}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400 text-[0.625rem] uppercase font-bold">
                        {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400 font-bold italic">Keine Leistungsdaten vorhanden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bento Col 2: Stärken und Auszeichnungen */}
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-amber-600 tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 leading-none select-none">
              ⭐ Stärkenprofil &amp; Leitstern
            </h4>
            <div className="bg-white p-4 rounded-xl border border-slate-205 text-[0.75rem] leading-tight italic font-semibold text-slate-600 leading-relaxed relative">
              <span className="text-[1.875rem] leading-tight text-indigo-200 absolute right-3 bottom-0 leading-none select-none">“</span>
              <p className="z-10 relative">
                {kelRow?.notiz || st.notiz || 'Keine pädagogische Stärkennotiz hinterlegt.'}
              </p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[0.5625rem] uppercase font-black text-slate-400 tracking-wider">Verliehene Badges / Auszeichnungen:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(st.badges && st.badges.length > 0) ? (
                  st.badges.map((b: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[0.625rem] font-black">
                      <span>{b.icon}</span> <span>{b.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[0.625rem] font-bold uppercase border border-slate-200">
                     🌟 Hilfsbereiter Teamplayer
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation section compared */}
        {kpShowSelfAssessment && (
          <div className="border border-slate-300 p-5 rounded-2xl bg-slate-50/20 space-y-4 font-bold">
            <h4 className="text-[0.625rem] font-black uppercase text-slate-700 tracking-wider border-b border-slate-200 pb-1 leading-none select-none">
              🤝 Selbst- und Fremdeinschätzung im Kompetenzgitter (1 = Entwicklungspotenzial, 4 = Ausgezeichnet)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 leading-normal">
              {dimensions.map(dim => {
                const sVal = Number(selfEval[dim.key]?.wert || 3);
                const tVal = Number(teacherEval[dim.key]?.wert || 3);

                return (
                  <div key={dim.key} className="space-y-1 text-[0.75rem] leading-tight font-bold text-slate-800 leading-none">
                    <div className="flex justify-between items-center text-[0.6875rem]">
                      <span>{dim.label}</span>
                      <div className="flex gap-2 text-[0.5625rem] font-black uppercase tracking-wide">
                        <span className="text-emerald-600">Kind: {sVal}</span>
                        <span className="text-indigo-600">Lehrer: {tVal}</span>
                      </div>
                    </div>
                    {/* Visual compare tracks */}
                    <div className="h-6 w-full bg-slate-200 rounded-lg relative ">
                      {/* Kind bar (top half) */}
                      <div className="absolute top-0 left-0 h-3 bg-emerald-500/75 rounded-t-lg transition-all" style={{ width: `${(sVal / 4) * 100}%` }}></div>
                      {/* Lehrer bar (bottom half) */}
                      <div className="absolute bottom-0 left-0 h-3 bg-indigo-600/75 rounded-b-lg transition-all" style={{ width: `${(tVal / 4) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goals protocol placeholders */}
        <div className="border border-slate-300 p-5 rounded-2xl bg-white space-y-3 font-bold">
          <h4 className="text-[0.625rem] font-black uppercase text-slate-700 tracking-wide border-b border-slate-150 pb-1 leading-none select-none">
            🎯 Ziele &amp; Vereinbarungen des KEL-Gesprächs
          </h4>
          <div className="grid grid-cols-3 gap-6 text-[0.625rem] text-slate-400 leading-relaxed uppercase tracking-wider">
            <div className="space-y-1">
              <span>Meine persönlichen Lernziele (Kind):</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
            <div className="space-y-1">
              <span>So unterstützen mich meine Eltern:</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
            <div className="space-y-1">
              <span>Unterstützung durch die Schule:</span>
              <div className="h-20 border border-slate-250 rounded-xl bg-slate-50/10"></div>
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="grid grid-cols-3 gap-12 pt-8 text-center uppercase tracking-widest font-black text-slate-400 text-[0.5625rem] leading-none">
          <div className="border-t border-slate-400 pt-2">
            Schülerin / Schüler
          </div>
          <div className="border-t border-slate-400 pt-2">
            Erziehungsberechtigte:r
          </div>
          <div className="border-t border-slate-400 pt-2">
            Klassenlehrkraft
          </div>
        </div>
      </div>
    );
  }

  function renderSeatingPlanView() {
    const placedStudents = students.filter(s => app.sitzplan_schueler?.[s.id]);
    const seats = placedStudents.map(s => app.sitzplan_schueler[s.id]);
    const objs = app.sitzplan_objekte || [];
    
    // Scale and offsets calculation to fit in 100% width A4 page
    let scale = 0.65;
    let offsetX = 30;
    let offsetY = 35;
    
    if (seats.length > 0 || objs.length > 0) {
      const minX = Math.min(...seats.map(s => s.x), ...objs.map(o => o.x), 50);
      const maxX = Math.max(...seats.map(s => s.x + 110), ...objs.map(o => o.x + (o.w || 120)), 950);
      const minY = Math.min(...seats.map(s => s.y), ...objs.map(o => o.y), 50);
      const maxY = Math.max(...seats.map(s => s.y + 70), ...objs.map(o => o.y + (o.h || 60)), 550);
      
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      
      const containerW = 920; // Expanded to fit A4 landscape print box
      const containerH = 460;
      
      const scaleX = contentWidth > 0 ? (containerW / contentWidth) : 1;
      const scaleY = contentHeight > 0 ? (containerH / contentHeight) : 1;
      scale = Math.min(scaleX, scaleY, 0.95);
      
      offsetX = (containerW - (contentWidth * scale)) / 2 - minX * scale;
      offsetY = (containerH - (contentHeight * scale)) / 2 - minY * scale;
    }

    return (
      <div className="space-y-4 text-left">
        {/* Header */}
        <div className="border-b-[2pt] border-slate-900 pb-2 text-center">
          <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest text-slate-900 leading-none">{customHeaderTitle || 'LEHRERCOCKPIT - Sitzplan'}</h3>
          <p className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest mt-1.5 leading-none">
            Klasse: {app?.stufe}.Klasse {app?.klassenbezeichnung || ''} • Lehrperson: {app?.anrede ? `${app.anrede} ` : ''}{app.nachname || ''} • Schuljahr: {app?.schuljahr} • Plätze: {placedStudents.length} Schüler platziert
          </p>
        </div>

        {/* Scaled plan viewport */}
        <div className="relative w-full border-[1.5pt] border-slate-300 bg-slate-50/50 rounded-2xl select-none overflow-hidden print:border-black print:bg-transparent" style={{ height: '540px' }}>
          
          {/* Board Indicators */}
          {spBoardPosition === 'top' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-1.5 px-12 rounded-b-xl border border-t-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black">
              ▲ Tafel / Vorne ▲
            </div>
          )}
          {spBoardPosition === 'bottom' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-1.5 px-12 rounded-t-xl border border-b-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black">
              ▼ Tafel / Vorne ▼
            </div>
          )}
          {spBoardPosition === 'left' && (
            <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-12 px-1.5 rounded-r-xl border border-l-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ◀ Tafel / Vorne ◀
            </div>
          )}
          {spBoardPosition === 'right' && (
            <div className="absolute top-1/2 right-0 -translate-y-1/2 bg-slate-200 text-slate-600 text-[0.625rem] font-black uppercase tracking-[0.2em] py-12 px-1.5 rounded-l-xl border border-r-0 border-slate-300 text-center z-10 print:border-black print:bg-white print:text-black flex items-center justify-center" style={{ writingMode: 'vertical-rl' }}>
              ▶ Tafel / Vorne ▶
            </div>
          )}

          <div className="absolute inset-0">
            {/* ROOM OBJECTS */}
            {objs.map((o: any, idx: number) => {
              const xPos = o.x * scale + offsetX;
              const yPos = o.y * scale + offsetY;
              const wVal = (o.w || 120) * scale;
              const hVal = (o.h || 60) * scale;

              // Type translation for labeling
              let label = 'Möbel';
              let icon = '📦';
              if (o.type === 'teacher_desk') { label = 'Lehrertisch'; icon = '💼'; }
              else if (o.type === 'blackboard') { label = 'Tafel'; icon = '📋'; }
              else if (o.type === 'door') { label = 'Tür'; icon = '🚪'; }
              else if (o.type === 'window') { label = 'Fenster'; icon = '🖼️'; }

              return (
                <div 
                  key={`obj-${idx}`}
                  className="absolute bg-slate-200 text-slate-700 border-2 border-slate-300 rounded-xl flex flex-col items-center justify-center font-bold text-center text-[0.625rem] leading-tight"
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos}px`,
                    width: `${wVal}px`,
                    height: `${hVal}px`,
                    backgroundColor: o.type === 'teacher_desk' ? '#f1f5f9' : undefined,
                    borderColor: o.type === 'teacher_desk' ? '#94a3b8' : undefined,
                  }}
                >
                  <span className="text-[0.875rem] leading-snug">{icon}</span>
                  <span className="uppercase text-[0.5rem] tracking-wider mt-0.5">{label}</span>
                </div>
              );
            })}

            {/* STUDENTS DESKS */}
            {placedStudents.map(s => {
              const sPos = app.sitzplan_schueler[s.id] || { x: 0, y: 0 };
              const xPos = sPos.x * scale + offsetX;
              const yPos = sPos.y * scale + offsetY;
              const wVal = 110 * scale;
              const hVal = 70 * scale;

              const grades = getStudentGradesSummary(s.id);
              let subtitle = '';
              if (spShowStudentNotes && grades.length > 0) {
                const nonNulls = grades.filter(g => g.average !== null);
                if (nonNulls.length > 0) {
                  const avg = nonNulls.reduce((acc, curr) => acc + (curr.average || 0), 0) / nonNulls.length;
                  subtitle = `Ø ${avg.toFixed(1)}`;
                }
              } else if (spShowStudentDaZ) {
                subtitle = s.zweitsprache ? 'DaZ' : '—';
              } else {
                subtitle = s.geschlecht === 'w' ? 'Mädchen' : 'Knaben';
              }

              return (
                <div 
                  key={`seat-${s.id}`}
                  className={`absolute bg-white rounded-2xl border-2 shadow-3xs flex flex-col items-center justify-center text-center p-1 ${s.geschlecht === 'w' ? 'border-rose-300 bg-rose-50/15' : 'border-sky-300 bg-sky-50/15'}`}
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos}px`,
                    width: `${wVal}px`,
                    height: `${hVal}px`,
                  }}
                >
                  <div className="font-extrabold text-[#000000] text-[0.6875rem] text-wrap leading-tight break-words w-full">
                    {spShowChairsOnly ? 'Frei' : `${s.vorname} ${s.nachname[0]}.`}
                  </div>
                  {!spShowChairsOnly && subtitle && (
                    <div className="text-[0.5rem] font-black text-slate-500 uppercase tracking-wide mt-1.5 leading-none select-none">
                      {subtitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderPdfExportView() {
    const targetSt = students.find(s => s.id === pdfStudentId) || students[0];
    if (!targetSt) return null;
    
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <FileText size={40} />
        </div>
        <h2 className="text-[1.25rem] leading-normal font-black text-slate-800 mb-2 mt-2">PDF erstellen und prüfen</h2>
        <p className="text-[0.875rem] leading-snug font-bold text-slate-500 mb-6 text-center max-w-sm">
          Die Datei wird lokal im Browser erzeugt. Sie ist eine pädagogische Arbeitsübersicht und kein amtliches Dokument.
        </p>
        
        <button
          onClick={async () => {
             const erhebungen = (app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === targetSt.id);
             
             // Dynamic import to split chunk
             const pdfEngine = await import('../lib/pdfEngine');
             if (pdfFormType === 'foerder_uebersicht') {
               await pdfEngine.generateFoerderUebersicht(targetSt, erhebungen);
             }
          }}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-4 rounded-2xl font-black shadow-lg"
        >
          <FileText size={20} />
          {pdfFormType === 'foerder_uebersicht' ? 'Förderübersicht als PDF' : 'PDF exportieren'}
        </button>
      </div>
    );
  }

  function renderUebergabemappeView() {
    const pages: React.ReactNode[] = [];
    const sortedStudents = [...students].sort((a, b) => a.nachname.localeCompare(b.nachname));

    const getGermanWeekday = () => {
      const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const currentDayName = days[new Date().getDay()];
      if (currentDayName === 'Sonntag' || currentDayName === 'Samstag') return 'Montag';
      return currentDayName;
    };
    const currentWeekday = getGermanWeekday();

    // Cover Page (Page 1)
    if (umShowCoverPage) {
      pages.push(
        <div key="um-cover" className="space-y-8 flex flex-col justify-between p-10 bg-white border border-slate-200 rounded-3xl text-left page-break" style={{ minHeight: '270mm' }}>
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b-[2pt] border-slate-900 pb-4">
              <div>
                <span className="text-[0.59375rem] bg-slate-900 text-white font-black tracking-widest px-2.5 py-1 rounded">UEBERGABEMAPPE</span>
                <h1 className="text-[1.875rem] leading-tight font-black text-slate-900 mt-2">Klassen-Übergabemappe</h1>
                <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest mt-0.5">Dokumentation für Vertretungskräfte &amp; Supplierungen</p>
              </div>
              <div className="text-right text-[0.75rem] leading-tight font-bold leading-tight">
                <p className="text-indigo-600 font-black tracking-widest">STUFE: {app?.stufe}.KLASSE</p>
                <p className="text-slate-500">SCHULJAHR: {app?.schuljahr}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Schulklasse / Raum</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{app.klassenbezeichnung || '—'} / {app.selectedRoom || 'Klassenraum'}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Erstellt von Lehrkraft</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{app.lehrerName || app.lehrerProfil?.name || 'Inhaber:in'}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Datum der Ausfertigung</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{new Date().toLocaleDateString('de-AT')}</p>
              </div>
              <div>
                <p className="text-[0.53125rem] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Anzahl Schüler</p>
                <p className="font-extrabold text-slate-800 text-[0.875rem] leading-snug leading-none">{students.length} Kinder ({students.filter(s => s.geschlecht === 'm').length} K, {students.filter(s => s.geschlecht === 'w').length} M)</p>
              </div>
              {umVertretungsZeitraum && (
                <div className="col-span-2 border-t border-slate-200/60 pt-3">
                  <p className="text-[0.53125rem] font-black uppercase tracking-widest text-rose-500 leading-none mb-1">🤒 Geplanter Vertretungs-Zeitraum (bei Krankheit)</p>
                  <p className="font-black text-rose-700 text-[0.9375rem] leading-snug leading-none">{umVertretungsZeitraum}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">📋 Inhalt dieses Ordners:</h4>
              <div className="space-y-1.5 text-[0.75rem] leading-tight font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Organisiertes Deckblatt &amp; Notfallnummern
                </div>
                {umShowTagesplaene && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Aktueller Tageskatalog &amp; Ablaufbeschreibungen
                  </div>
                )}
                {umShowKlassenliste && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Komplette Schüler-Besonderheitsliste (Gesundheit, DaZ, SPF)
                  </div>
                )}
                {umShowSitzplan && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> LEHRERCOCKPIT-Sitzplan &  Layout
                  </div>
                )}
                {umShowFeedback && (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-extrabold text-[0.875rem] leading-snug">✔</span> Feedback-Bogen für Supplierstunden
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-rose-200 bg-rose-50/10 p-5 rounded-2xl space-y-3 mt-6">
              <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 select-none">
                🚨 DRINGLICHE NOTFALL-NUMMERN &amp; ABSPRACHEN
              </h4>
              <div className="grid grid-cols-2 gap-4 text-[0.75rem] leading-tight font-bold leading-normal">
                <div>
                  <label className="text-[0.53125rem] font-black uppercase text-rose-500 tracking-wider block mb-0.5">Schulleitung / Direktion</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umSchulleitung}</p>
                </div>
                <div>
                  <label className="text-[0.53125rem] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Kanzlei / Sekretariat</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umSekretariat}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-[0.53125rem] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Ansprechperson Nachbarklasse</label>
                  <p className="text-slate-850 text-[0.6875rem] text-wrap leading-tight break-words">{umNachbarKlasse}</p>
                </div>
                {umKrankheitNotes && (
                  <div className="col-span-2 border-t border-rose-250 pt-3">
                    <label className="text-[0.53125rem] font-black uppercase text-rose-600 tracking-wider block mb-1">🤒 Spezielle Anweisungen für die Krankheitsvertretung:</label>
                    <p className="text-rose-950 text-[0.75rem] font-semibold whitespace-pre-wrap leading-relaxed bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">{umKrankheitNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center text-[0.5625rem] text-slate-400 font-bold select-none uppercase tracking-widest leading-relaxed">
            Vertraulich behandeln • Nur an berechtigte Empfänger:innen weitergeben
          </div>
        </div>
      );
    }

    // Tagespläne (Page 2)
    if (umShowTagesplaene) {
      pages.push(
        <div key="um-schedule" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2 flex justify-between items-end">
            <div>
              <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded uppercase">Tagesvertretung</span>
              <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Stundeneinteilung &amp; Lehrstoffe</h1>
            </div>
            <div className="text-right text-[0.75rem] leading-tight font-black">
              Klasse {app.klassenbezeichnung || '—'}
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[0.75rem] leading-tight text-left leading-normal">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-indigo-200 select-none">
                <th className="border border-slate-300 p-2.5 text-center w-12">Std</th>
                <th className="border border-slate-300 p-2.5 text-center w-24">Uhrzeit</th>
                <th className="border border-slate-300 p-2.5 w-32">Unterrichtsfach</th>
                <th className="border border-slate-300 p-2.5">Lehr- &amp; Übungsstoffe / Übungsanleitung</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map(h => {
                const hourTimes = app?.stundenZeiten?.[h] || '--:--';
                return (
                  <tr key={h} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2.5 text-center font-black">{h}</td>
                    <td className="border border-slate-200 p-2.5 text-center text-[0.6875rem] font-semibold text-slate-500">{hourTimes}</td>
                    <td className="border border-slate-200 p-2.5 font-bold uppercase text-indigo-700 tracking-wider">
                      {app?.stammplan?.[currentWeekday]?.[h] || 'Klassenstunde'}
                    </td>
                    <td className="border border-slate-200 p-2.5 text-slate-600 font-semibold whitespace-pre-wrap leading-relaxed">
                      {app.vertretungHinweise || 'Individuelles Lernen, Bucharbeit oder Übungszettel laut Wochenplanung durchführen.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Klassenliste mit Besonderheiten (Page 3)
    if (umShowKlassenliste) {
      pages.push(
        <div key="um-students" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2">
            <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-sans">Klassenliste</span>
            <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Kinderverzeichnis &amp; Päd. Orientierungshilfe</h1>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[0.75rem] leading-tight text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-300 select-none">
                <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                <th className="border border-slate-300 p-2.5 w-44">Name des Kindes</th>
                <th className="border border-slate-300 p-2.5 w-16 text-center">Geschl.</th>
                <th className="border border-slate-300 p-2.5">Besonderheiten / Päd. Hinweise / DaZ-Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((st, i) => (
                <tr key={st.id} className="border-b border-slate-200 even:bg-slate-50/40">
                  <td className="border border-slate-200 p-2 text-center font-bold text-slate-400">{i + 1}</td>
                  <td className="border border-slate-200 p-2 font-black text-slate-800">{st.nachname} {st.vorname}</td>
                  <td className="border border-slate-200 p-2 text-center font-semibold text-slate-500 uppercase">{st.geschlecht}</td>
                  <td className="border border-slate-200 p-2 text-[0.6875rem] font-semibold text-slate-600 leading-normal">
                    {st.notiz || (st.zweitsprache ? `Fremdsprache: ${st.zweitsprache}` : 'Keine gesundheitlichen oder päd. Einschränkungen gemeldet.')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Seating Plan page (Page 4)
    if (umShowSitzplan) {
      pages.push(
        <div key="um-seating" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          {renderSeatingPlanView()}
        </div>
      );
    }

    // Feedback forms page (Page 5)
    if (umShowFeedback) {
      pages.push(
        <div key="um-feedback" className="space-y-6 text-left p-10 bg-white border border-slate-200 rounded-3xl page-break">
          <div className="border-b-[2pt] border-slate-900 pb-2">
            <span className="text-[0.5625rem] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded block w-fit uppercase">QUALITÄTSSICHERUNG</span>
            <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 mt-1">Supplier-Feedback &amp; Tagesbericht</h1>
            <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest mt-0.5">Bitte der Stammlehrperson ausgefüllt auf das Pult legen</p>
          </div>

          <div className="space-y-6 text-slate-700 font-semibold text-[0.75rem] leading-tight mt-4 leading-normal">
            <p className="leading-relaxed">
              Vielen Dank für Ihre Vertretung! Bitte füllen Sie diesen Bogen kurz aus, damit die Stammlehrkraft unmittelbar über die Ereignisse und den Lernfortschritt informiert ist.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">1. Lehrstoff: Was wurde heute im Detail erfolgreich erarbeitet?</span>
                <div className="h-20 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">2. Verhalten &amp; Dynamik: Wie war die Arbeitsstimmung? Gab es besondere Vorkommnisse?</span>
                <div className="h-20 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">3. Hausübung aufgetragen?</span>
                  <div className="flex gap-4 items-center pt-1.5">
                    <span className="inline-block w-4 h-4 border border-slate-300 rounded bg-white"></span><span>Nein</span>
                    <span className="inline-block w-4 h-4 border border-slate-300 rounded bg-white ml-4"></span><span>Ja, Seite/Übung: __________________</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">4. Fehlende Kinder heute:</span>
                  <div className="h-10 w-full border border-slate-300 rounded-xl bg-slate-50/10"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-16 mt-6">
              <div className="border-t border-slate-400 text-center pt-2 text-[0.625rem] text-slate-450 uppercase tracking-widest font-black leading-none">
                Datum &amp; Schulstempel
              </div>
              <div className="border-t border-slate-400 text-center pt-2 text-[0.625rem] text-slate-450 uppercase tracking-widest font-black leading-none">
                Handzeichen der Vertretungskraft
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-10">
        {pages}
      </div>
    );
  }

  // Helper method to draw a single Student Portfolio Dossier page
  function renderSingleKelPortfolio(st: any) {
    const kelRow = getKelDataForStudent(st.id);
    const gradings = getStudentGradesSummary(st.id);

    return (
      <div key={st.id} className="space-y-6 text-left page-break">
        
        {/* Banner header of dossier child */}
        <div className="border-b-2 border-black pb-3 flex justify-between items-end avoid-break">
          <div>
            <span className="text-[0.5625rem] font-black bg-zinc-900 text-white px-2 py-0.5 rounded-[4px] uppercase tracking-wider">SCHÜLER-DOSSIER UND PORTFOLIO</span>
            <h2 className="text-[1.5rem] leading-normal font-black text-black tracking-tight mt-1">
              Dossier: {st.nachname} {st.vorname}
            </h2>
          </div>
          <div className="text-right text-[0.625rem] font-bold text-zinc-550 leading-tight">
            <span>Stufe: {app?.stufe || st.besuchsjahr}.Schulstufe • SJ {app?.schuljahr}</span>
            <span className="block mt-1 font-semibold">Geboren am: {st.geburtstag || 'k.A.'}</span>
          </div>
        </div>

        {/* Master details section info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 avoid-break">
          {/* Stammblatt */}
          <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-2">
            <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block border-b border-zinc-150 pb-0.5">I. Schüler-Stammdaten</span>
            <div className="grid grid-cols-2 gap-2 text-[0.71875rem] font-semibold text-zinc-700 leading-normal">
              <div><strong>Geschlecht:</strong> {st.geschlecht === 'm' ? 'Männlich' : 'Weiblich'}</div>
              <div><strong>Religion:</strong> {st.religion || 'o.B.'}</div>
              <div><strong>Staat:</strong> {st.staatsbuergerschaft || 'Österreich'}</div>
              <div><strong>Zweitsprache:</strong> {st.zweitsprache || 'keine'}</div>
              <div className="col-span-2 text-zinc-600 font-bold italic mt-2 text-[0.65625rem]">
                Gesichert im schulinternen, passwort-geschützten Datenspeicher
              </div>
            </div>
          </div>

          {/* Absences / Attendance if checked */}
          {kelShowAbsences && (
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-2">
              <span className="text-[0.5625rem] font-black uppercase text-zinc-400 tracking-wider block border-b border-zinc-150 pb-0.5">II. Fehlzeiten aus Präsenzbuch</span>
              <div className="text-[0.71875rem] leading-relaxed">
                <p className="text-zinc-600 font-medium">Laufende Fehlstundenauswertung für {st.vorname}:</p>
                <div className="flex gap-6 mt-2">
                  {(() => {
                    const fs = getStudentFehlstunden(st.id);
                    const justifiedPercent = fs.total > 0 ? Math.round((fs.excused / fs.total) * 100) : 100;
                    return (
                      <>
                        <div className="text-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/50 flex-1">
                          <span className="text-[1.25rem] leading-normal font-black text-black">
                            {fs.total}
                          </span>
                          <span className="text-[0.53125rem] font-black uppercase text-zinc-400 block mt-1">Fehlstunden ({fs.excused}e / {fs.unexcused}u)</span>
                        </div>
                        <div className="text-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/50 flex-1">
                          <span className="text-[1.25rem] leading-normal font-black text-black">{justifiedPercent}%</span>
                          <span className="text-[0.53125rem] font-black uppercase text-zinc-400 block mt-1">Gerechtfertigt</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grades summary matrix */}
        {kelShowGrades && gradings.length > 0 && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">III. Leistungsüberblick (dokumentierte Semesterstände)</h3>
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white">
              <table className="w-full">
                <thead>
                  <tr className="text-left font-black text-[0.59375rem] text-zinc-400 uppercase border-b border-zinc-200 pb-1">
                    <th className="pb-1">Pflichtgegenstand / Fach</th>
                    <th className="pb-1 text-center w-56">Aktueller Stand</th>
                    <th className="pb-1 text-right w-44">Beurteilungsart</th>
                  </tr>
                </thead>
                <tbody>
                  {gradings.map((gr, gx) => (
                    <tr key={gx} className="border-b border-zinc-150 last:border-0 py-2.5">
                      <td className="py-2.5 font-black text-black">{gr.subject}</td>
                      <td className="py-2.5 text-center font-black text-zinc-800 text-[0.75rem] leading-snug">
                        {gr.currentDisplay}
                      </td>
                      <td className="py-2.5 text-right text-zinc-500 text-[0.6875rem] font-bold uppercase">
                        {gr.mode === 'grades' ? 'Noten' : gr.mode === 'percent' ? 'Prozent' : 'Punkte'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KEL specific comparative assessments */}
        {kelShowSelfAssessment && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">IV. Selbst- & Fremdeinschätzungsabgleich (Aus KEL-Vorbereitung)</h3>
            <div className="border border-zinc-450 p-4 rounded-2xl bg-white space-y-3 text-[0.6875rem] font-semibold text-zinc-700 leading-relaxed">
              <div className="grid grid-cols-1 gap-3">
                {STANDARD_KEL_BEREICHE.map(field => {
                  const dbKind = kelRow?.selbsteinschaetzungKind?.[field.id];
                  const dbLehr = kelRow?.einschaetzungLehrperson?.[field.id];
                  
                  if (!dbKind?.kommentar && !dbLehr?.kommentar) return null;
                  return (
                    <div key={field.id} className="border-b border-zinc-150 last:border-0 pb-3 last:pb-0 space-y-2">
                      <span className="font-black text-black text-[0.71875rem] tracking-tight">{field.label} ({field.kategorie}):</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-[0.53125rem] font-black uppercase text-indigo-700 tracking-wider block">Kind</span>
                          <p className="italic text-zinc-650 font-bold">{dbKind?.kommentar || 'Keine Anmerkung'}</p>
                        </div>
                        <div className="space-y-1 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[0.53125rem] font-black uppercase text-emerald-700 tracking-wider block">Lehrperson</span>
                          <p className="italic text-zinc-650 font-bold">{dbLehr?.kommentar || 'Keine Anmerkung'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!kelRow || !STANDARD_KEL_BEREICHE.some(f => kelRow.selbsteinschaetzungKind?.[f.id]?.kommentar || kelRow.einschaetzungLehrperson?.[f.id]?.kommentar)) && (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center">
                    <span className="text-[0.625rem] font-black uppercase tracking-wider text-zinc-500">Noch keine Einschätzungen erfasst</span>
                    <p className="mt-1 text-[0.6875rem] font-medium text-zinc-500">Für dieses Kind liegen noch keine KEL-Kommentare vor.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KEL Portfolio entries & achievements contract if checked */}
        {kelShowPortfolio && (
          <div className="space-y-2.5 avoid-break pt-2">
            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wide text-zinc-500">V. Erarbeitete Zielvereinbarung & Meilensteine</h3>
            <div className="border border-zinc-450 p-4 rounded-[20px] bg-zinc-50 text-[0.71875rem] space-y-3 font-semibold leading-relaxed">
              {kelRow?.vereinbarungen ? (
                <div className="whitespace-pre-wrap text-zinc-800 font-bold bg-white p-3.5 rounded-xl border border-zinc-250 leading-relaxed">
                  {kelRow.vereinbarungen}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start py-1 border-b border-zinc-200 pb-1.5">
                    <span className="w-5 h-5 bg-zinc-800 text-white rounded flex items-center justify-center font-black text-[0.5625rem] shrink-0">1</span>
                    <div>
                      <span className="font-black text-black">Kompetenzziel:</span> Einteilen von Malreihen (ZR 100) fehlerfrei anwenden.
                      <span className="text-[0.5625rem] text-zinc-400 block font-bold uppercase mt-0.5">Woran erkennbar: Wöchentliche LZK-Hefteintragung</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start py-1 border-b border-zinc-200/60 pb-1.5 last:border-0">
                    <span className="w-5 h-5 bg-zinc-800 text-white rounded flex items-center justify-center font-black text-[0.5625rem] shrink-0">2</span>
                    <div>
                      <span className="font-black text-black">Sozialkompetenz:</span> Konstruktives Mitwirken im Morgenkreis ohne Nebengespräche.
                      <span className="text-[0.5625rem] text-zinc-400 block font-bold uppercase mt-0.5">Woran erkennbar: Selbsterhobene Emoji-Tracker-Sticker</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature contract area block */}
        <div className="pt-12 avoid-break font-black text-center text-zinc-500 text-[0.625rem] grid grid-cols-3 gap-4">
          {kelSignatures.map(sig => (
            <div key={sig} className="space-y-1 leading-normal">
              <div className="border-b border-black w-40 mx-auto pb-7"></div>
              <span className="uppercase tracking-widest text-zinc-400">{sig}</span>
            </div>
          ))}
        </div>

      </div>
    );
  }
}

// Compact clock icon component fallback as we import custom ones
function ClockIconFallback({ size = 16 }: { size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
