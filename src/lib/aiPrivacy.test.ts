import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiClassContext,
  buildAiLearningGoalContext,
  getAiChatHistory,
  getAiChatHistoryKey,
  MAX_AI_IMAGE_BYTES,
  validateAiImagePrivacy,
  validateAiServerImageRequest,
} from './aiPrivacy';

test('AI image payload requires explicit privacy confirmation', () => {
  const image = { data: 'YmFzZTY0', mimeType: 'image/jpeg' };
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

test('AI learning-goal context is aggregate-only and never contains student names', () => {
  const context = buildAiLearningGoalContext({
    lernzielTracker: {
      Deutsch: {
        l1: { text: 'Sicher vorlesen', abgehakt: true, abgehaktAm: null, kw: 38 },
        l2: { text: 'Wörtliche Rede', abgehakt: false, abgehaktAm: null, kw: 38 },
      },
    },
    studentLernzielBewertungen: {
      s1: { l1: 1, l2: 2 },
      s2: { l1: 1, l2: 3 },
    },
  } as any);

  assert.match(context, /Sicher vorlesen/);
  assert.match(context, /Wörtliche Rede/);
  assert.match(context, /Bewertungen gesamt: 4/);
  assert.match(context, /voll erreicht: 2/);
  assert.match(context, /teilweise erreicht: 1/);
  assert.match(context, /minimal erreicht: 1/);
  assert.doesNotMatch(context, /s1|s2|vorname|nachname/i);
});

test('AI chat history keys are class-local with safe single-class legacy fallback', () => {
  const aiChats = {
    'ki-helfer': ['legacy'],
    'class-a::ki-helfer': ['a1'],
    'class-b::ki-helfer': ['b1'],
  };

  assert.equal(getAiChatHistoryKey('class-a', 'ki-helfer'), 'class-a::ki-helfer');
  assert.deepEqual(getAiChatHistory(aiChats, 'class-a', 'ki-helfer', 2), ['a1']);
  assert.deepEqual(getAiChatHistory(aiChats, 'class-b', 'ki-helfer', 2), ['b1']);
  assert.deepEqual(getAiChatHistory({ 'ki-helfer': ['legacy'] }, 'class-a', 'ki-helfer', 2), []);
  assert.deepEqual(getAiChatHistory({ 'ki-helfer': ['legacy'] }, 'class-a', 'ki-helfer', 1), ['legacy']);
});

test('AI server rejects unconfirmed, unsupported, invalid and oversized image requests', () => {
  const jpeg = { data: 'YmFzZTY0', mimeType: 'image/jpeg' };
  assert.match(validateAiServerImageRequest('askAI', jpeg, false) || '', /Datenschutzbestätigung fehlt/);
  assert.match(validateAiServerImageRequest('generateContent', jpeg, true) || '', /nicht zulässig/);
  assert.match(
    validateAiServerImageRequest('askAI', { data: 'YmFzZTY0', mimeType: 'application/pdf' }, true) || '',
    /Ungültiges Bildformat/,
  );
  assert.match(
    validateAiServerImageRequest('askAI', { data: '', mimeType: 'image/jpeg' }, true) || '',
    /Ungültiges Bildformat/,
  );

  const oversizedBase64 = 'A'.repeat(Math.ceil(((MAX_AI_IMAGE_BYTES + 1) * 4) / 3));
  assert.match(
    validateAiServerImageRequest('askAI', { data: oversizedBase64, mimeType: 'image/jpeg' }, true) || '',
    /Bild zu groß/,
  );

  assert.equal(validateAiServerImageRequest('askAI', jpeg, true), null);
  assert.equal(validateAiServerImageRequest('askAI', undefined, false), null);
});
