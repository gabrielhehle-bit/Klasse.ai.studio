import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validClassroomQuiz, validClassroomRiddle } from './classroomQuizRiddle';
import { migrateLegacyWortSatzWidgetSettings, initializeTaskItems,
  DEFAULT_COMPOUND_TASKS, DEFAULT_SENTENCE_TASKS } from './wortSatzWerkstattAlgorithm';
import { migrateLegacyWidgetSettings } from './lernwoerterStudioAlgorithm';

const vocab = readFileSync('src/components/cockpit/widgets/LernwoerterStudioWidget.tsx','utf8');
const workshop = readFileSync('src/components/cockpit/widgets/WortSatzWerkstattWidget.tsx','utf8');
const content = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx','utf8');
const board = readFileSync('src/components/Unterrichtsmodus.tsx','utf8');

test('14 Lernwörter: preserve class word lists, highlights and focus-safe controls', () => {
  const restored = migrateLegacyWidgetSettings('vocabulary', {
    words: ['Apfel', 'Buch']
  });
  assert.deepEqual(restored.words.map(w => w.text), ['Apfel','Buch']);
  assert.match(vocab, /const classWidgetKey = String\(app\?\.activeClassId/);
  assert.match(vocab, /setState\(loaded\)/);
  assert.match(vocab, /previousWordsRef\.current = JSON\.stringify/);
  assert.match(vocab, /nextWordsKey !== previousWordsRef\.current/);
  assert.match(vocab, /containerRef\.current\.contains\(document\.activeElement\)/);
  assert.match(vocab, /showManageModal \|\|/);
  assert.match(vocab, /tabIndex=\{0\}/);
});

test('15 Wörter & Sätze: retain old task fields, reject impossible letter combinations and reset correct mode', () => {
  const loaded = migrateLegacyWortSatzWidgetSettings('wordbuilder', {});
  assert.ok(loaded.wordTasks.length > 0);
  assert.ok(initializeTaskItems('compound', DEFAULT_COMPOUND_TASKS[0]).length >= 2);
  assert.ok(initializeTaskItems('sentence', DEFAULT_SENTENCE_TASKS[0]).length >= 2);
  assert.match(workshop, /\.\.\.\(widget\?\.settings \|\| \{\}\)/);
  assert.match(workshop, /loadedWidgetKey\.current/);
  assert.match(workshop, /parts\.join\(''\)\.normalize\('NFC'\)/);
  assert.match(workshop, /DEFAULT_COMPOUND_TASKS\[0\]/);
  assert.match(workshop, /DEFAULT_SENTENCE_TASKS\[0\]/);
  assert.match(workshop, /containerRef\.current\.contains\(document\.activeElement\)/);
  assert.match(workshop, /role="dialog" aria-modal="true" aria-label="Wörter und Sätze bearbeiten"/);
  assert.match(workshop, /document\.body/);
  assert.match(workshop, /role="alert"/);
});

test('16 Quiz & Rätsel: validate model output before displaying it to children', () => {
  const valid = validClassroomQuiz({ t: 'Natur', q: 'Welche Zahl?', o: ['1','2','3','4'], a: 1 });
  assert.equal(valid?.a, 1);
  for (const candidate of [
    {q:'',o:['1','2','3','4'],a:1},
    {q:'Wie?',o:['1','2','3'],a:0},
    {q:'Wie?',o:['1','1','2','3'],a:0},
    {q:'Wie?',o:['1','2','3','4'],a:11},
    {q:'Wie?',o:['1','2','3','4'],a:'2'},
    {q:'Wie?',o:['1','2','3','4'],a:2.5},
  ]) assert.equal(validClassroomQuiz(candidate), null);
  assert.deepEqual(validClassroomRiddle({q:'Was ist das?',a:'Die Sonne',emoji:'☀️'}),
    {q:'Was ist das?',a:'Die Sonne',emoji:'☀️'});
  assert.equal(validClassroomRiddle({q:'',a:'Antwort'}), null);
});

test('16 Quiz & Rätsel: one group keeps both lesson modes, older AI-quiz remains usable', () => {
  assert.match(content, /quizRiddlePanel: panel/);
  assert.match(content, /<AIQuizWidgetContent widget=\{widget\} onUpdate=\{onUpdate\}/);
  assert.match(content, /<ClassroomRiddleGame widget=\{widget\} onUpdate=\{onUpdate\}/);
  assert.match(content, /validClassroomQuiz\(candidate\)/);
  assert.match(content, /validClassroomRiddle\(candidate\)/);
  assert.match(content, /classroomQuiz: valid, quizDifficulty:/);
  assert.match(content, /classroomRiddle: valid/);
  assert.match(board, /case "riddle":[\s\S]*?<RiddleWidgetContent[\s\S]*?onUpdate=/);
  assert.match(board, /case "aiquiz":[\s\S]*?<AIQuizWidgetContent[\s\S]*?onUpdate=/);
});
