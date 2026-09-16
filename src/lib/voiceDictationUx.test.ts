import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const voiceNote = fs.readFileSync('src/components/VoiceNote.tsx', 'utf8');
const server = fs.readFileSync('server.ts', 'utf8');

test('Diktieren bevorzugt lokale Spracherkennung und behält Browser-Fallback', () => {
  assert.match(voiceNote, /processLocally/);
  assert.match(voiceNote, /SpeechRecognition\.available/);
  assert.match(voiceNote, /SpeechRecognition\.install/);
  assert.match(voiceNote, /SPEECH_LANGUAGES = \['de-AT', 'de-DE'\]/);
  assert.match(voiceNote, /recognition\.continuous = false/);
  assert.match(voiceNote, /wantsRecordingRef/);
});

test('Diktieren behandelt network und Mikrofonfehler verständlich und bleibt erneut startbar', () => {
  assert.match(voiceNote, /case 'network'/);
  assert.match(voiceNote, /Online-Spracherkennung des Browsers ist gerade nicht erreichbar/);
  assert.match(voiceNote, /case 'not-allowed'/);
  assert.match(voiceNote, /getUserMedia\(\{ audio: true \}\)/);
  assert.doesNotMatch(voiceNote, /if \(error\) return;/);
  assert.match(voiceNote, /Du kannst unten direkt erneut versuchen/);
});

test('Server erlaubt On-Device-Spracherkennung nur für die eigene Origin', () => {
  assert.match(server, /on-device-speech-recognition=\(self\)/);
  assert.match(server, /microphone=\(self\)/);
});
