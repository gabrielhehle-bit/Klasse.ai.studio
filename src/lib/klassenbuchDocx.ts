import JSZip from 'jszip';

export type KlassenbuchDocxSection = {
  title: string;
  subtitle?: string;
  categories: Record<string, string[]>;
};

export type KlassenbuchDocxOptions = {
  title: string;
  className?: string;
  schoolYear?: string;
  teacherName?: string;
  sections: KlassenbuchDocxSection[];
};

const escapeXml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const paragraph = (
  text: string,
  options: { bold?: boolean; size?: number; center?: boolean; pageBreakBefore?: boolean } = {},
): string => {
  const pPr = [
    options.center ? '<w:jc w:val="center"/>' : '',
    options.pageBreakBefore ? '<w:pageBreakBefore/>' : '',
  ].join('');
  const rPr = [
    options.bold ? '<w:b/>' : '',
    options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : '',
  ].join('');
  return `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
};

const bullet = (text: string): string =>
  `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr><w:r><w:t xml:space="preserve">• ${escapeXml(text)}</w:t></w:r></w:p>`;

export function buildKlassenbuchDocumentXml(options: KlassenbuchDocxOptions): string {
  const meta = [
    options.className,
    options.schoolYear ? `Schuljahr ${options.schoolYear}` : '',
    options.teacherName,
  ].filter(Boolean).join(' · ');

  const body: string[] = [
    paragraph(options.title, { bold: true, size: 34, center: true }),
    meta ? paragraph(meta, { size: 20, center: true }) : '',
  ];

  options.sections.forEach((section, sectionIndex) => {
    body.push(paragraph(section.title, {
      bold: true,
      size: 28,
      pageBreakBefore: sectionIndex > 0,
    }));
    if (section.subtitle) body.push(paragraph(section.subtitle, { size: 18 }));

    const populated = Object.entries(section.categories).filter(([, entries]) => entries.length > 0);
    if (populated.length === 0) {
      body.push(paragraph('Keine Einträge.'));
      return;
    }

    for (const [category, entries] of populated) {
      body.push(paragraph(category, { bold: true, size: 22 }));
      entries.forEach(entry => body.push(bullet(entry)));
    }
  });

  body.push(
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>',
  );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}</w:body></w:document>`;
}

function buildKlassenbuchZip(options: KlassenbuchDocxOptions): JSZip {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const word = zip.folder('word');
  word?.file('document.xml', buildKlassenbuchDocumentXml(options));
  word?.folder('_rels')?.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  word?.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:lang w:val="de-AT"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

  return zip;
}

export async function createKlassenbuchDocxBytes(options: KlassenbuchDocxOptions): Promise<Uint8Array> {
  return buildKlassenbuchZip(options).generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export async function createKlassenbuchDocxBlob(options: KlassenbuchDocxOptions): Promise<Blob> {
  const bytes = await createKlassenbuchDocxBytes(options);
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function downloadKlassenbuchDocx(
  filename: string,
  options: KlassenbuchDocxOptions,
): Promise<void> {
  const blob = await createKlassenbuchDocxBlob(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.toLowerCase().endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
