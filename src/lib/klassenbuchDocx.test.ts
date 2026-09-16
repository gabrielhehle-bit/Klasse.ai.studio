import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildKlassenbuchDocumentXml, createKlassenbuchDocxBytes } from './klassenbuchDocx';

test('Klassenbuch DOCX: erzeugt ein echtes OOXML-Paket mit Word-Dokument', async () => {
  const bytes = await createKlassenbuchDocxBytes({
    title: 'Klassenbuch · Test',
    className: '1a',
    schoolYear: '2026/27',
    teacherName: 'Lehrkraft',
    sections: [{
      title: 'KW 38',
      subtitle: 'Schulwoche 2',
      categories: {
        'Deutsch - Lesen': ['Lautlesen & üben'],
        'Mathematik - Operationen': ['Plus und Minus'],
      },
    }],
  });

  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);

  const zip = await JSZip.loadAsync(bytes);
  for (const required of [
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml',
    'word/_rels/document.xml.rels',
    'word/styles.xml',
  ]) {
    assert.ok(zip.file(required), `DOCX-Bestandteil fehlt: ${required}`);
  }

  const documentXml = await zip.file('word/document.xml')!.async('string');
  assert.match(documentXml, /Klassenbuch · Test/);
  assert.match(documentXml, /Deutsch - Lesen/);
  assert.match(documentXml, /Lautlesen &amp; üben/);
  assert.match(documentXml, /Mathematik - Operationen/);
});

test('Klassenbuch DOCX: XML maskiert benutzerdefinierten Text', () => {
  const xml = buildKlassenbuchDocumentXml({
    title: 'A & B <Test>',
    sections: [{ title: 'KW 1', categories: { 'Fach': ['<Inhalt> & "Text"'] } }],
  });
  assert.match(xml, /A &amp; B &lt;Test&gt;/);
  assert.match(xml, /&lt;Inhalt&gt; &amp; &quot;Text&quot;/);
});
