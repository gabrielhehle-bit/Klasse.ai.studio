import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MUSIC_STUDIO_MODES, normalizeMusicStudioMode } from '../components/cockpit/widgets/MusicSoundsStudio';

const board = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const studio = readFileSync('src/components/cockpit/widgets/MusicSoundsStudio.tsx', 'utf8');
const sounds = readFileSync('src/components/cockpit/widgets/SoundsWidget.tsx', 'utf8');

test('Widget 20: five usable musical activities in one new-entry studio; invalid legacy setting is safe', () => {
  assert.deepEqual(MUSIC_STUDIO_MODES.map(mode => mode.id),
    ['signals', 'piano', 'rhythm', 'tonetrainer', 'ambient']);
  assert.equal(normalizeMusicStudioMode(null), 'signals');
  assert.equal(normalizeMusicStudioMode('obsolete-mode'), 'signals');
  assert.equal(normalizeMusicStudioMode('ambient'), 'ambient');
  for (const renderer of ['SoundsWidget', 'PianoWidgetContent', 'RhythmWidgetContent',
    'TonetrainerWidgetContent', 'SoundmachineWidgetContent']) {
    assert.ok(studio.includes('<' + renderer + ' '), 'Missing music activity ' + renderer);
  }
});

test('Widget 20: title gear opens real music configuration; preserve legacy music layout entries', () => {
  const entry = board.indexOf('case "sounds":', board.indexOf('showSettingsButton={'));
  assert.ok(entry > 0);
  const section = board.slice(entry, entry + 750);
  assert.match(section, /<MusicSoundsStudio/);
  assert.match(section, /showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(section, /onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/);
  const headerGear = board.slice(board.indexOf('showSettingsButton={'), board.indexOf('].includes(widget.type)}', board.indexOf('showSettingsButton={')));
  assert.match(headerGear, /"sounds"/);
  for (const type of ['sounds', 'soundmachine', 'piano', 'rhythm', 'tonetrainer']) {
    assert.ok(board.includes('case "' + type + '"'), 'Legacy music widget lost: ' + type);
  }
  assert.match(board, /w\.type === "sounds" && updates\.settings/);
});

test('Widget 20: volume configuration behind header gear and sound stops on mode change and unmount', () => {
  assert.match(studio, /showSettings && \(/);
  assert.match(studio, /aria-label="Musik-Widget-Einstellungen"/);
  assert.match(studio, /classroomSoundEngine\.stopAll\(\)/);
  assert.match(studio, /showVolumeControls=\{false\}/);
  assert.match(sounds, /showVolumeControls && <div/);
  assert.match(sounds, /return \(\) => \{\s*classroomSoundEngine\.stopAll\(\)/);
  assert.match(sounds, /if \(!classroomSoundEngine\.play\(soundId, volume\)\)/);
});
