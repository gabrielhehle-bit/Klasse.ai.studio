import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiClassContext, validateAiImagePrivacy, validateAiServerImageRequest } from './aiPrivacy';

test('AI image payload requires explicit privacy confirmation', () => {
  const image = { data: 'base64', mimeType: 'image/jpeg' };
  assert.match(validateAiImagePrivacy(image, false) || '', /Bildanalyse blockiert/);
  assert.equal(validateAiImagePrivacy(image, true), null);
  assert.equal(validateAiImagePrivacy(undefined, false), null);
});

test('AI class context contains useful class facts but no student names', () => {
  const context = buildAiClassContext({
    stufe: 3,
    bundesland: 'VBG',
    currentKW: 38,
    schueler: [
      { id: 's1', vorname: 'Geheimkind', nachname: 'Privat' },
      { id: 's2', vorname: 'NochEinName', nachname: 'Privat' },
    ] as any,
    wochenplanung: {
      38: {
        Montag: {
          0: { fach: 'Deutsch', thema: 'Wörtliche Rede' },
          1: { fach: 'Mathematik', thema: 'Einmaleins' },
        },
      },
    },
  } as any);

  assert.match(context, /Schulstufe: 3/);
  assert.match(context, /Klassengröße: 2/);
  assert.match(context, /Deutsch/);
  assert.match(context, /Wörtliche Rede/);
  assert.doesNotMatch(context, /Geheimkind|NochEinName|Privat/);
});


test('AI server rejects unconfirmed, unsupported and invalid image requests', () => {
  const jpeg = { data: 'base64', mimeType: 'image/jpeg' };
  assert.match(validateAiServerImageRequest('askAI', jpeg, false) || '', /Datenschutzbestätigung fehlt/);
  assert.match(validateAiServerImageRequest('generateContent', jpeg, true) || '', /nicht zulässig/);
  assert.match(
    validateAiServerImageRequest('askAI', { data: 'base64', mimeType: 'application/pdf' }, true) || '',
    /Ungültiges Bildformat/,
  );
  assert.equal(validateAiServerImageRequest('askAI', jpeg, true), null);
  assert.equal(validateAiServerImageRequest('askAI', undefined, false), null);
});
