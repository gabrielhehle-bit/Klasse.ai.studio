import React from 'react';
import type { ClassMascotKind, ClassMascotMood } from '../../lib/classMascot';

interface Props {
  kind: ClassMascotKind;
  mood: ClassMascotMood;
  name: string;
  animationEnabled?: boolean;
  reactionActive?: boolean;
  reactionTick?: number;
}

/** Original, self-contained SVG designs. No third-party character assets or network requests. */
export default function ClassMascotArtwork({ kind, mood, name, animationEnabled = false, reactionActive = false, reactionTick = 0 }: Props) {
  const colors = {
    otter: { fur: '#B87346', light: '#F4D3A2', inner: '#D58D8A', blush: '#D88677' },
    dog: { fur: '#C68B52', light: '#F6E1BD', inner: '#C67E76', blush: '#D78B78' },
    cat: { fur: '#87949D', light: '#E8EDF0', inner: '#DDA7B5', blush: '#D7A0A8' },
    // Elio has his own warm-stone skin, tapered leaf ears, tousled hair and teal school vest.
    // Not a licensed character likeness; all shapes and wardrobe are original to KLASSIO.
    elf: { fur: '#BDB9A2', light: '#E5DBC3', inner: '#D7A69C', blush: '#C99589' },
  }[kind];
  const asleep = mood === 'sleepy';
  // Mood changes the actual silhouette, not only a facial expression.
  const posture = asleep ? 'rest' : mood === 'proud' ? 'celebrate' : mood === 'calm' ? 'settle' : 'sit';
  const poseTransform = asleep
    ? kind === 'cat' ? 'translate(0 38) rotate(-15 90 110) scale(1 .76)' : 'translate(0 34) rotate(-7 90 110) scale(1 .79)'
    : mood === 'proud' ? 'translate(0 -6)' : mood === 'calm' ? 'translate(0 4)' : undefined;
  const relaxed = mood === 'calm';
  const eyes = asleep || relaxed
    ? <g stroke="#344044" strokeWidth="3.5" fill="none" strokeLinecap="round">
        <path d="M61 91 Q69 96 77 91"/><path d="M103 91 Q111 96 119 91"/>
      </g>
    : <g className={animationEnabled ? 'class-mascot-eye-blink class-mascot-gaze' : undefined}>
        <ellipse cx="69" cy="90" rx={kind === 'elf' ? 10 : 6.5} ry={kind === 'elf' ? 13 : 9} fill="#25353B" />
        <ellipse cx="111" cy="90" rx={kind === 'elf' ? 10 : 6.5} ry={kind === 'elf' ? 13 : 9} fill="#25353B" />
        <ellipse cx="71" cy="86.5" rx={kind === 'elf' ? 3.2 : 2} ry={kind === 'elf' ? 3.7 : 2.6} fill="#FFFFFF" />
        <ellipse cx="113" cy="86.5" rx={kind === 'elf' ? 3.2 : 2} ry={kind === 'elf' ? 3.7 : 2.6} fill="#FFFFFF" />
      </g>;

  return (
    <svg viewBox="0 0 180 182" data-mascot-kind={kind} role="img" aria-label={`${name}, ${kind === 'elf' ? 'ein kleiner Hauself' : kind === 'otter' ? 'ein Otter' : kind === 'dog' ? 'ein Hund' : 'eine Katze'}, ${mood === 'happy' ? 'fröhlich' : mood === 'proud' ? 'stolz' : mood === 'calm' ? 'ruhig' : 'schläfrig'}`}
      className={`class-mascot-painted-artwork mx-auto block h-auto max-h-[280px] w-full max-w-[280px] drop-shadow-sm ${animationEnabled ? 'class-mascot-idle' : ''}`}>
      <defs>
        <radialGradient id={`mascot-fur-${kind}`} cx="40%" cy="28%" r="80%">
          <stop offset="0%" stopColor={colors.light} stopOpacity=".78"/>
          <stop offset="45%" stopColor={colors.fur}/>
          <stop offset="100%" stopColor={colors.fur}/>
        </radialGradient>
      </defs>
      <ellipse cx="90" cy="167" rx={asleep ? 62 : 46} ry={asleep ? 6 : 5} fill="#475569" opacity=".16" pointerEvents="none"/>
      {/* The persistent cockpit anchor never moves. Only the painted silhouette changes. */}
      <g data-mascot-posture={posture} className={`class-mascot-pose class-mascot-pose-${posture}`} transform={poseTransform}>
      {/* Restart the brief reaction on consecutive taps, without moving the widget itself. */}
      <g key={reactionTick} className={reactionActive ? `class-mascot-react class-mascot-react-${kind}` : undefined}>
      {mood === 'proud' && <g fill="#F7C84B"><path d="M28 42l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/><path d="M148 37l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></g>}
      {kind === 'otter' && <>
        <path className={reactionActive ? 'class-mascot-tail-reaction' : animationEnabled ? 'class-mascot-tail-sway' : undefined} d="M51 142Q21 137 19 153Q28 167 57 155" fill="#9D623B" stroke="#74472F" strokeWidth="2.5"/>
        <ellipse cx="90" cy={asleep ? 145 : 136} rx={asleep ? 48 : 38} ry={asleep ? 22 : 32} fill={`url(#mascot-fur-${kind})`}/>
        <ellipse cx="90" cy={asleep ? 151 : 143} rx={asleep ? 33 : 24} ry={asleep ? 14 : 21} fill={colors.light}/>
        <path d="M75 123Q90 113 105 123" stroke="#FFF2D5" strokeWidth="2.5" fill="none" opacity=".75"/>
        <circle cx="40" cy="61" r="15" fill={colors.fur}/><circle cx="40" cy="61" r="9" fill={colors.inner}/>
        <circle cx="140" cy="61" r="15" fill={colors.fur}/><circle cx="140" cy="61" r="9" fill={colors.inner}/>
        <ellipse cx="90" cy="88" rx="55" ry="54" fill={`url(#mascot-fur-${kind})`}/>
        <ellipse cx="90" cy="108" rx="36" ry="27" fill={colors.light}/>
        <path d="M47 107l-11 2m11 2-12 8m98-12 11 2m-11 2 12 8" stroke="#74472F" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".72"/>
        <path d="M62 129Q65 124 71 124M109 124Q115 124 118 129" stroke="#9D623B" strokeWidth="5" strokeLinecap="round" fill="none"/>
        <ellipse cx="58" cy="152" rx="14" ry="8" fill={colors.fur}/>
        <g className={reactionActive ? 'class-mascot-otter-wave' : undefined}>
          <ellipse cx="122" cy="152" rx="14" ry="8" fill={colors.fur}/>
        </g>
      </>}
      {kind === 'dog' && <>
        <path className={reactionActive ? 'class-mascot-tail-reaction' : animationEnabled ? 'class-mascot-tail-sway' : undefined} d="M127 140Q165 112 162 145" stroke="#A66A3D" strokeWidth="11" fill="none" strokeLinecap="round"/>
        <ellipse cx="90" cy={asleep ? 145 : 136} rx={asleep ? 48 : 38} ry={asleep ? 21 : 30} fill={`url(#mascot-fur-${kind})`}/>
        <ellipse cx="90" cy={asleep ? 152 : 140} rx={asleep ? 34 : 22} ry={asleep ? 14 : 23} fill={colors.light}/>
        <path d="M46 55Q16 47 18 87Q21 119 42 105L56 76Z" fill="#91643D" stroke="#68432D" strokeWidth="2.5"/>
        <path d="M134 55Q164 47 162 87Q159 119 138 105L124 76Z" fill="#91643D" stroke="#68432D" strokeWidth="2.5"/>
        <ellipse cx="90" cy="87" rx="53" ry="53" fill={`url(#mascot-fur-${kind})`}/>
        <path d="M49 83Q45 70 53 62M131 83Q135 70 127 62" stroke="#8A5A38" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".67"/>
        <ellipse cx="58" cy="83" rx="9" ry="15" fill="#F0D0A6" opacity=".72"/>
        <path d="M89 42Q108 43 113 63Q93 73 83 63Z" fill="#F3DFC0"/>
        <ellipse cx="90" cy="108" rx="31" ry="24" fill={colors.light}/>
        <ellipse cx="59" cy="153" rx="13" ry="8" fill={colors.fur}/><ellipse cx="121" cy="153" rx="13" ry="8" fill={colors.fur}/>
      </>}
      {kind === 'cat' && <>
        <path className={reactionActive ? 'class-mascot-tail-reaction' : animationEnabled ? 'class-mascot-tail-sway' : undefined} d="M124 149Q167 162 155 128" fill="none" stroke="#64747F" strokeWidth="13" strokeLinecap="round"/>
        <ellipse cx="90" cy={asleep ? 145 : 136} rx={asleep ? 49 : 37} ry={asleep ? 20 : 31} fill={`url(#mascot-fur-${kind})`}/>
        <ellipse cx="90" cy={asleep ? 152 : 140} rx={asleep ? 30 : 22} ry={asleep ? 13 : 22} fill={colors.light}/>
        <path d="M43 76L38 23Q55 28 72 49Z" fill={colors.fur} stroke="#687780" strokeWidth="2"/>
        <path d="M137 76L142 23Q125 28 108 49Z" fill={colors.fur} stroke="#687780" strokeWidth="2"/>
        <path d="M48 67L45 38Q58 45 66 53Z" fill={colors.inner}/>
        <path d="M132 67L135 38Q122 45 114 53Z" fill={colors.inner}/>
        <ellipse cx="90" cy="89" rx="51" ry="52" fill={`url(#mascot-fur-${kind})`}/>
        <path d="M67 44l-10 19m33-22v18m23-15 10 19" stroke="#6D7982" strokeWidth="4" strokeLinecap="round" opacity=".65"/>
        <path d="M45 104l-12-3m13 12-13 4m101-13 12-3m-13 12 13 4" stroke="#64747F" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <ellipse cx="90" cy="106" rx="31" ry="23" fill={colors.light}/>
        <path d="M43 81l-11-3 M137 81l11-3" stroke="#64747F" strokeWidth="2.5" strokeLinecap="round"/>
        <ellipse cx="59" cy="152" rx="13" ry="8" fill={colors.fur}/><ellipse cx="121" cy="152" rx="13" ry="8" fill={colors.fur}/>
      </>}
      {kind === 'elf' && <>
        {/* Elio: original woodland-school helper with tapered leaf ears, warm-stone skin,
            tousled hair, a teal vest and a book-shaped brooch; not a licensed character likeness. */}
        <path d={asleep ? 'M52 135Q30 138 35 155L62 162H118L145 154Q148 140 128 135Z' : 'M59 120Q40 129 44 153L62 162H118L136 152Q139 127 121 120Z'} fill="#287A78"/>
        <path d="M69 123L90 153 111 123" fill="#F7E3A5"/>
        <path d="M45 145Q31 141 29 155" fill="none" stroke={colors.fur} strokeWidth="11" strokeLinecap="round"/>
        <path d="M135 145Q149 141 151 155" fill="none" stroke={colors.fur} strokeWidth="11" strokeLinecap="round"/>
        <path d="M51 80Q26 57 8 65Q17 96 52 103Z" fill={colors.fur} stroke="#688D73" strokeWidth="2.5"/>
        <path d="M129 80Q154 57 172 65Q163 96 128 103Z" fill={colors.fur} stroke="#688D73" strokeWidth="2.5"/>
        <path d="M44 85Q28 74 18 74Q29 91 45 91Z" fill={colors.inner}/>
        <path d="M136 85Q152 74 162 74Q151 91 135 91Z" fill={colors.inner}/>
        <ellipse cx="90" cy="87" rx="45" ry="55" fill={`url(#mascot-fur-${kind})`}/>
        <path d="M49 91Q44 80 48 71M131 91Q136 80 132 71" stroke="#918F79" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".5"/>
        <path d="M48 62Q51 37 74 33L66 54Q88 30 116 42L123 54Q132 62 133 78Q113 64 90 65Q63 66 48 80Z" fill="#596B65"/>
        <path d="M61 70Q68 64 77 67M103 67Q112 64 119 70" stroke="#52655E" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <ellipse cx="90" cy="108" rx="29" ry="22" fill={colors.light}/>
        <rect x="82" y="145" width="16" height="12" rx="3" fill="#FFE8A2"/>
        <path d="M85 148l5 2 5-2v6l-5 2-5-2z" fill="#287A78"/>
      </>}
      {mood === 'proud' && <g fill="none" stroke="#67574E" strokeWidth="2.5" strokeLinecap="round" opacity=".75"><path d="M58 71q10-8 21-2"/><path d="M101 69q11-6 21 2"/></g>}
      {eyes}
      <ellipse cx="55" cy="104" rx="7" ry="4" fill={colors.blush} opacity=".45"/>
      <ellipse cx="125" cy="104" rx="7" ry="4" fill={colors.blush} opacity=".45"/>
      {kind === 'elf'
        ? <path d="M90 101q-4 8-2 13q2 3 6 0" fill="none" stroke="#8A806E" strokeWidth="2.2" strokeLinecap="round"/>
        : <path d={kind === 'cat' ? 'M86 108l4 4 4-4z' : 'M85 108q5-6 10 0q-5 8-10 0'} fill="#4D3B37"/>}
      {asleep ? <path d="M82 120q8 5 16 0" fill="none" stroke="#604B49" strokeWidth="2.2" strokeLinecap="round" /> :
        <path d="M81 118q9 11 18 0" fill="none" stroke="#604B49" strokeWidth="2.5" strokeLinecap="round" />}
      {mood === 'sleepy' && <text x="134" y="40" fill="#64748B" fontSize="14" fontWeight="800" aria-hidden="true">Zz</text>}
      </g>
      </g>
    </svg>
  );
}
