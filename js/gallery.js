// 청동 전시실 — 11주차 과제 프로토타입 (D조 · 반가워 사유)
//
// 과제: 교수님이 소개한 전시 작품을 스터디해 팀 작품에 적용하기. 두 방에 두 갈래를 적용했다.
//   1방 「울리는 조각」  — Henry Moore Institute 《Beyond the Visual》의 아론 맥피크 《Rings》:
//       종 청동 고리를 두드리면 울리고, 손을 얹으면 멎고, 오래 쥐면 체온으로 데워진다.
//       → 사유의 다섯 조각을 크기가 다른 청동 고리로 매달았다. 큰 고리일수록 낮고 길게 운다.
//   2방 「보이지 않는 깊이」 — documenta의 발터 드 마리아 《수직 대지의 킬로미터》(보이는 것은 지름 5 cm
//       단면뿐)와 로렌스 아부 함단(소리의 크기와 메아리로 공간을 읽는 방법만 빌림):
//       → 화면은 거의 어둡고 손끝 아래 작은 원만 보인다. 귀와 손끝으로 사유의 '속'(중공 주조,
//         속틀을 붙든 쇠못, 다시 부어 고친 자리)을 찾는다.
// 해설은 8주차에 녹음해 둔 사유의 목소리(Gemini TTS · Leda)를 그대로 다시 쓴다. 새로 쓴 세 문장은
// 아직 녹음이 없어서 자막으로만 보인다(기기 음성으로 읽으면 목소리가 달라지므로 읽지 않는다).
//
// 이야기와의 연결: 시련 모드에서는 여섯째 시련 '저승' 앞에서 흙손 영감이 이 전시실로 데려온다(galIntro).
// 사유를 만나기 전이라 사유는 말하지 않고, 영감이 이끌며 판독문은 '해설'로 글로만 보인다. 두 방을 마쳐야
// 저승으로 내려간다. 기존 이야기에서는 다섯 조각을 모두 감별하면 사유가 초대한다. 시작 화면에서 바로
// 들어간 전시실은 이야기 밖의 전시라 사유가 그대로 말한다.
//
// 진동은 Vibration API(주로 Android)에서만 울리고 세기는 바꿀 수 없어 길이로만 표현한다.
// 진동이 없는 기기에서는 같은 패턴을 화면의 맥박 막대로 보여 준다. 향과 온도는 화면이 전할 수 없어
// 온도는 색으로 바꿔 보이고, 향은 글로만 적는다.
import { $, $$, esc, state, save, log, announce, vibrate, canVibrate, hooks, stopBgm, toggleBgm, speak, speakGuide, hasRecording, hush, data, asset } from './core.js';
import { voiceKey } from './lines.js';
import * as music from './music.js';
import { pretestDone } from './trials-rules.js';
import { povStage } from './story.js';
import { LINES, NEW_LINES, INVITE } from './gallery-lines.js';
export { LINES, NEW_LINES, INVITE };

const SAYU_IMG = asset('assets/character/sayu-reference-web.png');
const GUIDE_IMG = asset('assets/character/halabeoji.webp');
const TG = () => data.trials.gallery;
/** 시련 모드의 이야기 안에서 들어왔는가 (저승 앞, 흙손 영감과 함께) */
const trialPath = () => state.route === 'trials' && state.galFrom === 'galIntro';
/** 사유를 만나기 전이라 영감이 이끈다 */
const elder = () => trialPath() && !state.trials.met;

export const isRecorded = (text, who = 'sayu') => !!data.voice?.lines?.[who]?.[voiceKey(text)];

/* ---------- 방 정의 ---------- */
export const ROOMS = [null,
  { n: 1, title: '울리는 조각', en: 'Rings of Bronze — after Aaron McPeake',
    src: '헨리 무어 연구소 《Beyond the Visual》 · 아론 맥피크 《Rings》',
    narr: '사유의 다섯 조각을 크기가 다른 청동 고리로 매달았다. 두드리면 울리고, 손을 얹으면 소리가 멎고, 오래 쥐면 차가운 청동이 손의 온기로 데워진다.',
    gesture: '두드리기(탭) · 손 얹기(길게 누르기)',
    sound: '종과 징 사이의 울림 — 큰 고리일수록 낮고 길게 운다. 울리는 고리에 손을 얹으면 곧 멎는다',
    vib: [320, 50, 144, 50, 64], vibLabel: '고리 크기만큼 길게, 점점 짧아지는 떨림 (가장 큰 고리)',
    other: '온도는 색으로 — 손을 얹은 시간만큼 푸른 녹빛에서 금빛으로. 향은 화면이 전할 수 없어 글로만 — 손의 기름과 만난 청동의 쇠 냄새.',
    ec: { who: '다감각 통합 · Williams & Bargh · Merleau-Ponty', title: '감각은 따로 일하지 않는다',
      body: '맥피크는 시각·청각·촉각이 따로 떨어진 것이 아니라 함께 일한다고 말한다. 같은 두드림이 귀에는 높낮이로, 손에는 떨림의 길이로, 눈에는 흔들림으로 한꺼번에 온다. 울리는 고리에 손을 얹으면 짧은 떨림이 손끝으로 되돌아오고 울림이 멎는다 — 고리를 만지는 순간 손도 고리에 만져진다(가역성). 오래 쥘수록 데워지는 청동은 "따뜻함 = 다정함"이라는 몸의 은유를 깨운다.' } },
  { n: 2, title: '보이지 않는 깊이', en: 'The Invisible Depth — after De Maria & Abu Hamdan',
    src: 'documenta 6 · 발터 드 마리아 《수직 대지의 킬로미터》 / 로렌스 아부 함단의 청각 작업(방법만)',
    narr: '사유의 속은 눈으로 볼 수 없다. 화면은 어둡고 손끝 아래 작은 원 하나만 보인다. 소리가 나는 쪽 귀와 떨림의 빠르기를 따라가 속이 빈 몸, 속틀을 붙든 쇠못, 다시 부어 고친 자리를 찾는다.',
    gesture: '화면을 더듬기 · 멈춰서 길게 누르면 파기 (방향키 + Enter도 됨)',
    sound: '목표가 있는 쪽 귀에서 "똑-" 소리. 가까울수록 빠르고 높고 커지며, 메아리가 짧아진다',
    vib: [60, 140, 60, 140, 60, 140, 60], vibLabel: '가까울수록 촘촘해지는 떨림 (가까울 때)',
    other: '눈 감기: 땅과 파문, 옆 패널의 단서 글과 진동 막대를 모두 끄고, 소리와 진동만으로 찾는다.',
    ec: { who: '예측 부호화 · 메를로퐁티 · Clark & Chalmers · 비시각 인지', title: '보지 않아도 공간은 몸에 그려진다',
      body: '눈을 감으면 뇌는 귀와 손끝으로 들어오는 단서로 "어디쯤"을 예측하고, 손을 옮길 때마다 그 예측을 고친다. 떨림이 빨라지고 메아리가 짧아지는 쪽으로 손이 먼저 움직인다. 이때 휴대폰은 메를로퐁티가 말한 시각장애인의 지팡이처럼 손의 연장이 되어(확장된 마음) 보이지 않는 속을 더듬는다. 드 마리아의 1 km 막대처럼 보이는 것은 손끝 아래 작은 원 하나뿐이다.' } }
];

/* ---------- 1방: 고리 ---------- */
// d = 전시용 고리 지름 설계값(cm, 맥피크의 9~75 cm 범위에 맞춤). 크기 → 음높이 · 울림 길이 · 진동 길이.
export const RINGS = [
  // pores: 맥피크 — "크기가 큰 작품일수록 다공성이 더 두드러진다"
  { id: 'leg', d: 75, f: 196.0, note: 'G3', decay: 4.6, vib: 320, pores: 7 },
  { id: 'robe', d: 54, f: 261.63, note: 'C4', decay: 3.8, vib: 240, pores: 5 },
  { id: 'face', d: 36, f: 349.23, note: 'F4', decay: 3.0, vib: 160, pores: 3 },
  { id: 'crown', d: 22, f: 466.16, note: 'B♭4', decay: 2.2, vib: 100, pores: 1 },
  { id: 'hand', d: 10, f: 622.25, note: 'E♭5', decay: 1.5, vib: 60, pores: 0 }
];
export const ringVib = r => [r.vib, 50, Math.round(r.vib * 0.45), 50, Math.round(r.vib * 0.2)];
const PX_CM = 2.7, GAP = 26, AXIS_Y = 232, BEAM_Y = 34, W = 760, H = 460;
const LAYOUT = (() => {
  const total = RINGS.reduce((s, r) => s + r.d * PX_CM, 0) + GAP * (RINGS.length - 1);
  let x = (W - total) / 2;
  return Object.fromEntries(RINGS.map(r => {
    const dpx = r.d * PX_CM, cx = x + dpx / 2;
    x += dpx + GAP;
    return [r.id, { cx, cy: AXIS_Y, dpx, pan: +((cx / W - 0.5) * 1.6).toFixed(2) }];
  }));
})();
const HOLD_MS = 300;          // 이보다 오래 누르면 '손 얹기'
const WARM_IN = 4000;         // 손을 얹고 4초면 완전히 데워진다(실제보다 빠르게 압축)
const WARM_OUT = 9000;        // 손을 떼면 9초에 걸쳐 식는다
const WARM_GOAL = 0.6;
const COOL = [104, 128, 118], GOLD = [214, 160, 72];
export const mix = w => `rgb(${COOL.map((c, i) => Math.round(c + (GOLD[i] - c) * w)).join(',')})`;

/* ---------- 2방: 보이지 않는 속 ---------- */
export const TARGETS = [
  { id: 'hollow', x: 0.70, y: 0.34, name: '속이 빈 몸', sub: '중공식 주조' },
  { id: 'pins', x: 0.24, y: 0.66, name: '속틀을 붙든 쇠못', sub: '감마선으로만 보이는 못' },
  { id: 'repair', x: 0.53, y: 0.80, name: '다시 부어 고친 자리', sub: '성분이 다른 흔적' }
];
const ASPECT = W / H;         // 화면 가로 거리를 세로와 같은 척도로
const FIND_R = 0.075;
const DIG_MS = 800;
// 하는 법(2026-11-11): 사용자가 Enter를 써야 하는 줄 몰랐다 — 방마다 손가락·키보드 조작을 위에 적는다
const HOWTO = {
  1: '손가락: 고리를 짧게 누르면 울리고, 길게 누르면 손을 얹어 소리를 멎게 하고 데웁니다. 키보드: Tab으로 고리를 고르고 Enter로 울립니다.',
  2: '손가락: 어두운 땅을 천천히 더듬다가, 떨림이 가장 빨라지는 곳에서 멈추고 0.8초 누르고 있으면 팝니다. 키보드: 바로 방향키로 움직이고 Enter로 팝니다.'
};
// 2방: 땅에 포커스가 없어도 방향키·Enter가 듣게 한다(찾을 때마다 땅을 새로 그려 포커스가 사라지던 문제)
let roomKeys = null;
const roomKeysOff = () => { if (roomKeys) { window.removeEventListener('keydown', roomKeys); roomKeys = null; } };
/** 손끝(x, y)에서 목표까지의 단서. 거리는 0(바로 위)~1(아주 멂). */
export function cue(x, y, t) {
  const dx = (t.x - x) * ASPECT, dy = t.y - y, d = Math.hypot(dx, dy);
  const dist = Math.min(1, d / 1.2);
  return {
    d, dist,
    pan: Math.max(-1, Math.min(1, (t.x - x) * 2.5)),          // 목표가 오른쪽이면 오른쪽 귀
    interval: Math.round(140 + 760 * dist),                    // 똑- 간격(ms): 가까울수록 촘촘
    freq: Math.round(330 * (2 - dist)),                        // 가까울수록 높게 (330~660 Hz)
    echo: Math.round(40 + 300 * dist),                         // 메아리 지연(ms): 가까울수록 짧게
    vib: Math.round(12 + 48 * (1 - dist)),                     // 진동 길이(ms): 가까울수록 길게
    gain: +(0.12 + 0.3 * (1 - dist)).toFixed(3)                // 소리 크기: 가까울수록 크게 (0.12~0.42)
  };
}

/* ---------- 상태 ---------- */
function freshGal(room = 1) {
  return { room, start: Date.now(), snap: false, done: [], struck: [], warm: {}, maxWarm: 0, damped: 0,
    found: [], cursor: { x: 0.5, y: 0.5 }, blind: false, digs: 0, misses: 0 };
}
/** 보고서 캡처용 시연 상태(#gallery/<방>/snap). 실제 사용 기록이 아니라 화면 구성을 보이기 위한 예시값이다. */
function snapGal(room) {
  const g = freshGal(room);
  g.snap = true;
  if (room === 1) { g.struck = ['leg', 'robe', 'face']; g.warm = { robe: 0.85, face: 0.3 }; g.maxWarm = 0.85; g.damped = 1; g.sel = 'robe'; }
  if (room === 2) { g.done = [1]; g.struck = RINGS.map(r => r.id); g.maxWarm = 0.9; g.found = ['hollow']; g.cursor = { x: 0.33, y: 0.6 }; g.digs = 2; g.misses = 1; }
  return g;
}
const gal = () => (state.gal ||= freshGal());

/** #gallery, #gallery/2, #gallery/1/snap 으로 바로 들어간다(시연·캡처용). */
export function fromHash() {
  const m = /^#gallery(?:\/([12]))?(?:\/(snap))?$/.exec(location.hash || '');
  if (!m) return false;
  const room = +(m[1] || 1);
  state.gal = m[2] ? snapGal(room) : freshGal(room);
  if (state.scene !== 'gallery') state.galFrom = state.scene;
  state.scene = 'gallery';
  return true;
}

/** 나갈 곳: 들어온 장면. 기록이 없으면(예전 저장) 사전 질문을 마쳤을 때만 캠프·시련판으로 간다. */
export function backTo() {
  const from = state.galFrom;
  if (from === 'galIntro') return state.route === 'trials' && state.trials.galleryDone ? 'underworld' : 'hub';
  if (from && from !== 'gallery') return from;
  return pretestDone(state) ? 'hub' : 'intro';
}
function backLabel() {
  const to = backTo();
  if (to === 'intro') return '시작 화면으로 돌아가기';
  if (to === 'garden') return '정원으로 돌아가기';
  if (to === 'underworld') return TG().down;
  if (to === 'hub') return state.route === 'trials' ? '시련의 길로 돌아가기' : '캠프로 돌아가기';
  return '돌아가기';
}

/* ---------- 소리 ---------- */
let bus = null, timers = [], ringing = {}, raf = 0, holds = {}, listening = false, bgmWasOn = false;
const ac = () => (state.sfx ? music.getContext() : null);
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
function out() {
  const c = ac(); if (!c) return null;
  if (!bus) { bus = c.createGain(); bus.gain.value = 0.9; bus.connect(c.destination); }
  return bus;
}
function panner(c, v) {
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = v; return p; }
  return c.createGain();
}
// 종 청동의 부분음(험·프라임·단3도·5도·노미널 …) — 정수배가 아니어서 종과 징 사이의 소리가 난다
const PARTIALS = [[0.5, 0.30], [1, 0.55], [1.19, 0.40], [1.5, 0.22], [2, 0.32], [2.52, 0.14], [3.0, 0.08]];
export function strikeSound(r) {
  const b = out(); if (!b) return;
  const c = b.context, t = c.currentTime, L = LAYOUT[r.id];
  stopRing(r.id, 0.02);
  const g = c.createGain(), p = panner(c, L.pan);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.42, t + 0.006);
  g.connect(p).connect(b);
  const oscs = PARTIALS.map(([k, a], i) => {
    const o = c.createOscillator(), og = c.createGain(), T = r.decay / (1 + 0.55 * i);
    o.type = 'sine';
    o.frequency.value = r.f * k;
    og.gain.setValueAtTime(a, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + T);
    o.connect(og).connect(g);
    o.start(t); o.stop(t + T + 0.05);
    return o;
  });
  // 추가 부딪히는 순간의 짧은 금속성 잡음
  const len = Math.floor(c.sampleRate * 0.04), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = c.createBufferSource(), bp = c.createBiquadFilter(), sg = c.createGain();
  s.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.4; sg.gain.value = 0.35;
  s.connect(bp).connect(sg).connect(g); s.start(t);
  ringing[r.id] = { g, oscs, until: t + r.decay };
}
/** 울리는 고리를 멈춘다. 실제로 울리고 있었으면 true. */
export function stopRing(id, seconds = 0.12) {
  const v = ringing[id];
  if (!v) return false;
  delete ringing[id];
  const c = v.g.context, t = c.currentTime;
  if (t >= v.until) return false;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(Math.max(0.0001, v.g.gain.value), t);
  v.g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  v.oscs.forEach(o => { try { o.stop(t + seconds + 0.03); } catch {} });
  return true;
}
export function ping(cueNow) {
  const b = out(); if (!b) return;
  const c = b.context, t = c.currentTime;
  const tone = (when, gain) => {
    const o = c.createOscillator(), g = c.createGain(), p = panner(c, cueNow.pan);
    o.type = 'sine'; o.frequency.value = cueNow.freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    o.connect(g).connect(p).connect(b);
    o.start(when); o.stop(when + 0.1);
  };
  tone(t, cueNow.gain);
  tone(t + cueNow.echo / 1000, cueNow.gain * (0.55 - 0.3 * cueNow.dist));   // 메아리
}
export function chime() {
  [523.25, 659.25, 783.99].forEach((f, i) => music.pluckSfx(f, { gain: 0.22, when: i * 0.12, seconds: 1.6 }));
}
export function lowThud() {
  const b = out(); if (!b) return;
  const c = b.context, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.25);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(b); o.start(t); o.stop(t + 0.32);
}
export function stopAll() {
  timers.forEach(id => clearTimeout(id));
  timers = [];
  Object.keys(ringing).forEach(id => stopRing(id, 0.2));
  if (raf) cancelAnimationFrame(raf);
  raf = 0; holds = {}; listening = false;
  if (bus) { const b = bus; bus = null; setTimeout(() => { try { b.disconnect(); } catch {} }, 400); }
  if (canVibrate()) { try { navigator.vibrate(0); } catch {} }
}

/* ---------- 진동 + 화면 맥박 (진동이 없는 기기에서도 같은 사건이 보이게) ---------- */
function buzz(pattern) {
  vibrate(pattern);
  const bars = $('#galVib');
  if (!bars) return;
  let t = 0;
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) {
      later(() => bars.classList.add('buzz'), t);
      later(() => bars.classList.remove('buzz'), t + Math.max(60, ms));
    }
    t += ms;
  });
}
function vibBars(pattern) {
  const total = pattern.reduce((s, v) => s + v, 0);
  let x = 0;
  const bars = pattern.map((ms, i) => {
    const w = ms / total * 100, r = i % 2 === 0 ? `<rect x="${x.toFixed(2)}" y="2" width="${w.toFixed(2)}" height="20" rx="2"/>` : '';
    x += w; return r;
  }).join('');
  return `<svg id="galVib" class="ody-vib" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="23" x2="100" y2="23"/>${bars}</svg>`;
}

/* ---------- 자막 + 녹음된 목소리 ---------- */
function guide(text, who = '사유') {
  const cap = $('#galCap');
  const sayu = who === '사유', voiceOf = sayu ? 'sayu' : who === data.trials.board.guideName ? 'guide' : null;
  const rec = !!voiceOf && isRecorded(text, voiceOf);
  if (cap) {
    cap.dataset.who = who === '안내' ? 'guide' : 'sayu';
    cap.innerHTML = `<b>${esc(who)}</b> ${esc(text)}${voiceOf && !rec ? ' <small>(녹음 준비 중 · 자막)</small>' : ''}`;
  }
  if (rec && state.audio !== false) (sayu ? speak : speakGuide)(text);
  announce(text);
  return rec;
}
/** 판독문·속 해설을 읽는 이: 시련 길에서 사유를 만나기 전에는 흙손 영감이 대신 읽는다 */
const describe = text => guide(text, elder() ? data.trials.board.guideName : '사유');
/** 방의 처음과 끝 말: 시련 길에서는 흙손 영감, 그 밖에는 사유 */
const narrate = key => (elder()
  ? guide(TG().lines[key], data.trials.board.guideName)
  : guide(key === 'end1' ? LINES.end1 : NEW_LINES[key]));

/* ---------- 그림 ---------- */
const art = id => data.artifacts?.artifacts?.find(a => a.id === id) || { name: id, icon: '·', brief: '' };
function poresSVG(r) {
  const out = [];
  for (let k = 0; k < r.pores; k++) {
    const a = (k * 137.5 + 40) * Math.PI / 180, rad = 44 + ((k * 7) % 5) - 2;
    out.push(`<circle class="pore" cx="${(50 + rad * Math.cos(a)).toFixed(1)}" cy="${(50 + rad * Math.sin(a)).toFixed(1)}" r="${(1.1 + (k % 3) * 0.5).toFixed(1)}"/>`);
  }
  return out.join('');
}
export function ringsHTML(g) {
  const beamL = LAYOUT[RINGS[0].id].cx - LAYOUT[RINGS[0].id].dpx / 2 - 14;
  const beamR = LAYOUT[RINGS[RINGS.length - 1].id].cx + LAYOUT[RINGS[RINGS.length - 1].id].dpx / 2 + 14;
  const beam = `<div class="gal-beam" style="left:${(beamL / W * 100).toFixed(2)}%;width:${((beamR - beamL) / W * 100).toFixed(2)}%;top:${(BEAM_Y / H * 100).toFixed(2)}%"></div>`;
  const rings = RINGS.map(r => {
    const L = LAYOUT[r.id], a = art(r.id), w = g.warm[r.id] || 0;
    const top = L.cy - L.dpx / 2;
    const cord = `<i class="gal-cord" style="left:${(L.cx / W * 100).toFixed(2)}%;top:${(BEAM_Y / H * 100).toFixed(2)}%;height:${((top - BEAM_Y) / H * 100).toFixed(2)}%"></i>`;
    const sw = Math.max(9, 15 - r.d / 12);
    return `${cord}<button type="button" class="gal-ring${g.struck.includes(r.id) ? ' struck' : ''}${g.sel === r.id ? ' sel' : ''}" data-ring="${r.id}"
      style="left:${((L.cx - L.dpx / 2) / W * 100).toFixed(2)}%;top:${(top / H * 100).toFixed(2)}%;width:${(L.dpx / W * 100).toFixed(2)}%;--ring:${mix(w)}"
      aria-label="${esc(a.name)} 고리 · 지름 ${r.d}cm · ${r.note}. 탭하면 울리고, 길게 누르면 손을 얹습니다">
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="band" cx="50" cy="50" r="${(50 - sw / 2 - 1).toFixed(1)}" stroke-width="${sw.toFixed(1)}"/>${poresSVG(r)}</svg>
      <span class="gal-icon" aria-hidden="true">${esc(a.icon)}</span></button>`;
  }).join('');
  return `<div class="gal-hall">${beam}${rings}
    <p class="gal-plate">사유의 다섯 조각 — 큰 고리가 왼쪽, 작은 고리가 오른쪽 (맥피크의 원뿔을 옆으로 눕힌 배치)</p></div>`;
}
function fieldHTML(g) {
  const c = TARGETS.find(t => !g.found.includes(t.id));
  const cu = c ? cue(g.cursor.x, g.cursor.y, c) : null;
  const marks = TARGETS.filter(t => g.found.includes(t.id)).map(t =>
    `<span class="gal-mark" style="left:${t.x * 100}%;top:${t.y * 100}%"><i></i>${esc(t.name)}</span>`).join('');
  const pulses = cu && g.snap ? [0, 1, 2].map(k => `<i class="gal-pulse still" style="--k:${k}"></i>`).join('') : '<i class="gal-pulse"></i>';
  return `<div class="gal-field${g.blind ? ' blind' : ''}" id="galField" tabindex="0" role="application"
      aria-label="보이지 않는 속을 더듬는 땅. 방향키로 움직이고 Enter로 팝니다."
      style="--cx:${(g.cursor.x * 100).toFixed(1)}%;--cy:${(g.cursor.y * 100).toFixed(1)}%"
      data-pan="${cu ? cu.pan.toFixed(2) : ''}" data-dist="${cu ? cu.dist.toFixed(3) : ''}" data-interval="${cu ? cu.interval : ''}" data-gain="${cu ? cu.gain : ''}">
      <div class="gal-hole">${pulses}</div>${marks}
      ${g.blind ? '<p class="gal-blindnote">화면 꺼짐 — 소리와 떨림으로 찾으세요</p>' : ''}
    </div>`;
}
function readout(g) {
  const c = TARGETS.find(t => !g.found.includes(t.id));
  if (!c) return '<p class="ody-hint">세 가지를 모두 찾았습니다.</p>';
  if (g.blind) return '<p class="ody-hint" id="galRead">눈 감기 중 — 단서 글을 숨겼습니다. 소리가 나는 쪽과 떨림의 빠르기로 찾으세요.</p>';
  const cu = cue(g.cursor.x, g.cursor.y, c);
  const side = cu.pan < -0.15 ? '◀ 왼쪽 귀' : cu.pan > 0.15 ? '오른쪽 귀 ▶' : '가운데 (양쪽 귀)';
  return `<dl class="gal-read" id="galRead">
    <dt>소리가 나는 쪽</dt><dd>${side}</dd>
    <dt>가까운 정도</dt><dd><span class="gal-bar"><i style="width:${Math.round((1 - cu.dist) * 100)}%"></i></span></dd>
    <dt>떨림 간격</dt><dd>${cu.interval} ms · 메아리 ${cu.echo} ms</dd></dl>`;
}

function howtoHTML(g) {
  const why = trialPath() && TG().why ? `<p class="gal-why">${esc(TG().why)}</p>` : '';
  return `<div class="gal-howto" role="note"><b>하는 법</b><p>${esc(HOWTO[g.room])}</p>${why}</div>`;
}

function taskHTML(g) {
  return howtoHTML(g) + taskBody(g);
}

function taskBody(g) {
  if (g.room === 1) {
    const sel = RINGS.find(r => r.id === g.sel);
    const list = RINGS.map(r => `<li><button type="button" class="chip-btn${g.struck.includes(r.id) ? ' on' : ''}" data-strike="${r.id}">${esc(art(r.id).icon)} ${esc(art(r.id).name)} · ${r.note}</button></li>`).join('');
    const done = g.struck.length === RINGS.length && g.maxWarm >= WARM_GOAL;
    return `<h3>두드린 고리 ${g.struck.length}/${RINGS.length} · 데운 청동 ${g.maxWarm >= WARM_GOAL ? '✓' : `${Math.round(g.maxWarm / WARM_GOAL * 100)}%`}</h3>
      <ul class="gal-list">${list}</ul>
      ${sel ? `<div class="gal-sel"><b>${esc(art(sel.id).name)}</b> <small>지름 ${sel.d} cm(설계) · ${sel.note} ${sel.f} Hz · 울림 ${sel.decay}초 · 진동 ${sel.vib} ms</small>
        <p>${esc(art(sel.id).brief)}</p>
        <div class="ody-actions"><button type="button" class="btn secondary" id="galListen">🎧 말로 그린 모습 듣기</button>
        <button type="button" class="btn secondary" id="galHand" aria-pressed="${!!holds[sel.id]}">✋ ${holds[sel.id] ? '손 떼기' : '손 얹기'}</button></div></div>`
        : '<p class="ody-hint">고리를 탭해 울려 보고, 하나는 길게 눌러 손의 온기로 데워 보세요.</p>'}
      ${done ? `<button type="button" class="btn primary ody-next" data-gal-go="2">2방 보이지 않는 깊이로 →</button>` : ''}`;
  }
  const n = g.found.length;
  return `<h3>찾은 속 ${n}/${TARGETS.length}${g.snap ? ' <small>(시연용 예시값)</small>' : ''}</h3>
    <ul class="ody-list">${TARGETS.map(t => g.found.includes(t.id) ? `<li><b>${esc(t.name)}</b> → ${esc(t.sub)}</li>` : '').join('') || '<li class="muted">아직 찾은 것이 없습니다.</li>'}</ul>
    ${readout(g)}
    <label class="ody-switch"><input type="checkbox" id="galBlind" ${g.blind ? 'checked' : ''}> 눈 감기 — 땅과 단서 글을 끄고 소리와 진동만으로</label>
    <div class="ody-actions">${n < TARGETS.length ? '<button type="button" class="btn secondary" id="galDig">여기 파기 (Enter)</button>' : ''}
      ${n === TARGETS.length ? '<button type="button" class="btn secondary" id="galAgain">처음부터 다시</button><button type="button" class="btn primary" id="galCamp">' + backLabel() + '</button>' : ''}</div>`;
}

export function view() {
  const g = gal(), R = ROOMS[g.room];
  // 시련 길에서는 차례대로: 1방을 마쳐야 2방이 열린다
  const locked = n => n === 2 && g.room !== 2 && trialPath() && !room1Done(g);
  const rail = ROOMS.slice(1).map(x => `<li><button type="button" data-gal-go="${x.n}" class="${x.n === g.room ? 'now' : g.done.includes(x.n) ? 'done' : ''}" ${x.n === g.room ? 'aria-current="step"' : ''}${locked(x.n) ? ` disabled title="${esc(TG().room2Locked)}"` : ''}>${x.n}방 ${esc(x.title)}</button></li>`).join('');
  return `<section class="ody gal" data-room="${g.room}">
    <header class="ody-head scene-head">
      <div>
        <div class="eyebrow">청동 전시실 · ${esc(R.en.split(' — ')[0])}</div>
        <h1>${g.room}방. ${esc(R.title)}</h1>
        <p>${esc(R.narr)}</p>
      </div>
      <ol class="ody-rail" aria-label="두 방">${rail}</ol>
    </header>
    <div class="ody-grid">
      <div class="gal-main">
        <div class="ody-stage gal-stage" id="galStage">${g.room === 1 ? ringsHTML(g) : fieldHTML(g)}</div>
        <p class="gal-cap" id="galCap" aria-hidden="true"></p>
        <div class="actions gal-exit"><button type="button" class="btn secondary" id="galBack">← ${backLabel()}</button></div>
      </div>
      <aside class="ody-side">
        <section class="ody-card ody-sense" aria-label="지금 몸이 받는 감각">
          <div class="eyebrow">적용한 작품 · ${esc(R.src)}</div>
          <dl>
            <dt>몸짓</dt><dd>${esc(R.gesture)}</dd>
            <dt>소리</dt><dd>${esc(R.sound)}</dd>
            <dt>진동</dt><dd>${vibBars(R.vib)}<small>${esc(R.vibLabel)} · [${R.vib.join(', ')}] ms</small></dd>
            <dt>그 밖</dt><dd>${esc(R.other)}</dd>
          </dl>
          <div class="ody-toggles">
            <button type="button" class="chip-btn" data-gal-toggle="sfx" aria-pressed="${state.sfx}">${state.sfx ? '소리 켬' : '소리 끔'}</button>
            <button type="button" class="chip-btn" data-gal-toggle="haptics" aria-pressed="${state.haptics}">${state.haptics ? '진동 켬' : '진동 끔'}</button>
            ${canVibrate() ? '' : '<small>이 기기는 웹 진동이 없어, 진동을 위 막대의 맥박으로 보여 줍니다.</small>'}
          </div>
        </section>
        <section class="ody-card ody-ec">
          <div class="eyebrow">체화된 인지 · ${esc(R.ec.who)}</div>
          <h3>${esc(R.ec.title)}</h3>
          <p>${esc(R.ec.body)}</p>
        </section>
        <section class="ody-card ody-task" id="galTask" aria-live="polite">${taskHTML(g)}</section>
      </aside>
    </div>
  </section>`;
}

/* ---------- 조작 ---------- */
function refreshTask() {
  const t = $('#galTask'); if (t) t.innerHTML = taskHTML(gal());
  const back = $('#galBack'); if (back) back.textContent = '← ' + backLabel();
  bindTask(); save();
}
function goRoom(n) {
  const g = gal();
  if (!g.done.includes(g.room) && roomComplete(g)) g.done.push(g.room);
  g.room = n;
  log('gal_room', { room: n });
  stopAll(); hush();
  hooks.render();
  $('#scene')?.scrollTo?.(0, 0);
}
const room1Done = g => g.struck.length === RINGS.length && g.maxWarm >= WARM_GOAL;
function roomComplete(g) {
  return g.room === 1 ? g.struck.length === RINGS.length && g.maxWarm >= WARM_GOAL : g.found.length === TARGETS.length;
}
function bindTask() {
  const g = gal();
  $$('[data-gal-go]').forEach(b => b.onclick = () => goRoom(+b.dataset.galGo));
  $$('[data-strike]').forEach(b => b.onclick = () => strike(b.dataset.strike));
  $('#galListen')?.addEventListener('click', () => { const id = gal().sel; if (id) { log('gal_guide', { id, recorded: describe(LINES[id]) }); } });
  $('#galHand')?.addEventListener('click', () => { const id = gal().sel; if (!id) return; holds[id] ? handOff(id) : handOn(id); refreshTask(); });
  // 다시 그리면 bind()가 소리를 모두 거두므로, 눈 감기를 켜고 끄는 순간에도 '똑'이 끊기지 않게 다시 듣기 시작한다.
  $('#galBlind')?.addEventListener('change', e => { g.blind = e.target.checked; log('gal_blind', { on: g.blind }); hooks.render(); startListening(); });
  $('#galDig')?.addEventListener('click', () => dig());
  $('#galAgain')?.addEventListener('click', () => { state.gal = freshGal(1); stopAll(); hooks.render(); });
  $('#galCamp')?.addEventListener('click', () => hooks.go(backTo()));
  const back = $('#galBack');   // 과제 카드 밖에 있어 다시 그려지지 않으므로, 겹쳐 묶이지 않게 onclick으로 둔다
  if (back) back.onclick = () => hooks.go(backTo());
}

/* 1방 */
function setRingVisual(id) {
  const el = $(`[data-ring="${id}"]`);
  if (el) el.style.setProperty('--ring', mix(gal().warm[id] || 0));
}
function strike(id) {
  const g = gal(), r = RINGS.find(x => x.id === id);
  if (!r) return;
  strikeSound(r);
  buzz(ringVib(r));
  if (!g.struck.includes(id)) g.struck.push(id);
  g.sel = id;
  log('gal_strike', { id, f: r.f, d: r.d, vib: r.vib, decay: r.decay });
  const el = $(`[data-ring="${id}"]`);
  if (el) { el.classList.remove('ringing'); void el.offsetWidth; el.style.setProperty('--decay', `${r.decay}s`); el.classList.add('ringing', 'struck'); }
  refreshTask();
  checkRoom1();
}
function handOn(id) {
  const g = gal();
  const wasRinging = stopRing(id, 0.12);
  if (wasRinging) { g.damped++; if (canVibrate() && state.haptics) { try { navigator.vibrate(0); } catch {} } $(`[data-ring="${id}"]`)?.classList.remove('ringing'); }
  vibrate([25]);
  holds[id] = performance.now();
  g.sel = id;
  $(`[data-ring="${id}"]`)?.classList.add('held');
  log('gal_hand', { id, damped: wasRinging });
  tickWarm();
}
function handOff(id) {
  delete holds[id];
  $(`[data-ring="${id}"]`)?.classList.remove('held');
  log('gal_hand_off', { id, warm: +(gal().warm[id] || 0).toFixed(2) });
  save();
  tickWarm();
  checkRoom1();
}
let lastFrame = 0;
function tickWarm() {
  if (raf) return;
  lastFrame = performance.now();
  const step = now => {
    const g = gal(), dt = now - lastFrame;
    lastFrame = now;
    let active = false;
    RINGS.forEach(r => {
      const w0 = g.warm[r.id] || 0;
      const w = holds[r.id] ? Math.min(1, w0 + dt / WARM_IN) : Math.max(0, w0 - dt / WARM_OUT);
      if (w !== w0) { g.warm[r.id] = w; setRingVisual(r.id); }
      if (holds[r.id] || w > 0) active = true;
      if (w > g.maxWarm) g.maxWarm = w;
    });
    const h3 = $('#galTask h3');
    if (h3 && Object.keys(holds).length) h3.textContent = `두드린 고리 ${g.struck.length}/${RINGS.length} · 데운 청동 ${g.maxWarm >= WARM_GOAL ? '✓' : `${Math.round(g.maxWarm / WARM_GOAL * 100)}%`}`;
    if (Object.keys(holds).length && g.maxWarm >= WARM_GOAL) checkRoom1();
    raf = active ? requestAnimationFrame(step) : 0;
  };
  raf = requestAnimationFrame(step);
}
function checkRoom1() {
  const g = gal();
  if (g.room !== 1 || g.end1 || g.struck.length < RINGS.length || g.maxWarm < WARM_GOAL) return;
  g.end1 = true;
  if (!g.done.includes(1)) g.done.push(1);
  log('gal_room_done', { room: 1, damped: g.damped });
  later(() => { narrate('end1'); refreshTask(); }, 600);
}
function bindRoom1() {
  const g = gal();
  $$('[data-ring]').forEach(el => {
    const id = el.dataset.ring;
    let downAt = 0, timer = 0, isHand = false;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch {}
      downAt = performance.now(); isHand = false;
      timer = setTimeout(() => { isHand = true; handOn(id); refreshTask(); }, HOLD_MS);
    });
    const up = () => {
      if (!downAt) return;
      clearTimeout(timer);
      downAt = 0;
      if (isHand) { handOff(id); refreshTask(); } else strike(id);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', e => { if (e.detail === 0) strike(id); });   // 키보드 Enter/Space
    el.addEventListener('contextmenu', e => e.preventDefault());
    if (g.warm[id]) setRingVisual(id);
  });
  if (g.snap) {
    $('[data-ring="robe"]')?.classList.add('held');
    $('[data-ring="face"]')?.classList.add('ringing', 'still');
    const cap = $('#galCap');
    if (cap) cap.innerHTML = `<b>사유</b> ${esc(LINES.robe)}`;
    return;
  }
  later(() => narrate(g.end1 ? 'end1' : 'intro1'), 400);
  if (Object.values(g.warm).some(w => w > 0)) tickWarm();
}

/* 2방 */
const currentTarget = () => TARGETS.find(t => !gal().found.includes(t.id));
function moveTo(x, y) {
  const g = gal();
  g.cursor = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  const f = $('#galField');
  if (!f) return;
  f.style.setProperty('--cx', `${(g.cursor.x * 100).toFixed(1)}%`);
  f.style.setProperty('--cy', `${(g.cursor.y * 100).toFixed(1)}%`);
  const t = currentTarget();
  if (t) {
    const cu = cue(g.cursor.x, g.cursor.y, t);
    f.dataset.pan = cu.pan.toFixed(2); f.dataset.dist = cu.dist.toFixed(3); f.dataset.interval = cu.interval; f.dataset.gain = cu.gain;
    const r = $('#galRead');
    if (r) r.outerHTML = readout(g);
  }
  startListening();
}
function startListening() {
  if (listening || gal().snap) return;
  listening = true;
  const tick = () => {
    const g = gal(), t = currentTarget();
    if (!listening || g.room !== 2 || !t) { listening = false; return; }
    const cu = cue(g.cursor.x, g.cursor.y, t);
    ping(cu);
    // 진동 + 진동이 없는 기기에서는 옆 패널 막대가 같은 순간 깜빡인다.
    // 눈 감기 중에는 막대가 거리를 눈으로 알려 주지 않도록 진동만 보낸다.
    if (g.blind) vibrate([cu.vib]); else buzz([cu.vib]);
    const p = $('#galField .gal-pulse');
    if (p) { p.classList.remove('go'); void p.offsetWidth; p.style.setProperty('--life', `${Math.min(900, cu.interval)}ms`); p.classList.add('go'); }
    later(tick, cu.interval);
  };
  tick();
}
function dig() {
  const g = gal(), t = currentTarget();
  if (!t) return;
  g.digs++;
  const cu = cue(g.cursor.x, g.cursor.y, t);
  if (cu.d <= FIND_R) {
    g.found.push(t.id);
    log('gal_found', { id: t.id, digs: g.digs, misses: g.misses });
    chime();
    buzz([60, 80, 60, 80, 200]);
    describe(LINES[t.id]);
    if (g.found.length === TARGETS.length) {
      if (!g.done.includes(2)) g.done.push(2);
      log('gal_room_done', { room: 2, digs: g.digs, misses: g.misses });
      listening = false;
      // 시련 길에서는 두 방을 마치면 저승으로 내려갈 수 있다
      if (trialPath() && room1Done(g)) { state.trials.galleryDone = true; log('trial_gallery_done', { digs: g.digs, misses: g.misses }); }
      const who = elder() ? 'guide' : 'sayu', clip = data.voice?.lines?.[who]?.[voiceKey(LINES[t.id])];
      const clipMs = state.audio !== false && hasRecording(who, LINES[t.id]) && Array.isArray(clip) ? (clip[2] - clip[1]) * 1000 : 0;
      const wait = Math.max(12000, clipMs + 1500);   // 마지막 해설 녹음을 끝까지 들은 뒤 끝말
      g.end2At = Date.now() + wait;
      later(() => narrate('end2'), wait);
    }
    const f = $('#galField'), had = !!f && document.activeElement === f;
    if (f) f.outerHTML = fieldHTML(g);
    bindField();
    if (had) $('#galField')?.focus({ preventScroll: true });
    refreshTask();
  } else {
    g.misses++;
    log('gal_miss', { dist: +cu.dist.toFixed(3) });
    lowThud();
    buzz([70]);
    const cap = $('#galCap');
    if (cap) { cap.dataset.who = 'guide'; cap.innerHTML = '<b>안내</b> 여기는 아니에요. 떨림이 더 빨라지는 쪽으로 손을 옮겨 보세요.'; }
    announce('여기는 아니에요. 떨림이 더 빨라지는 쪽으로 손을 옮겨 보세요.');
    save();
  }
}
function bindField() {
  const f = $('#galField');
  if (!f) return;
  const g = gal();
  let still = 0, sx = 0, sy = 0, down = false;
  const pos = e => { const r = f.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  const arm = (x, y) => { clearTimeout(still); sx = x; sy = y; still = setTimeout(() => { if (down) dig(); }, DIG_MS); };
  f.addEventListener('pointerdown', e => {
    e.preventDefault(); down = true;
    try { f.setPointerCapture(e.pointerId); } catch {}
    const [x, y] = pos(e); moveTo(x, y); arm(e.clientX, e.clientY);
  });
  f.addEventListener('pointermove', e => {
    const [x, y] = pos(e); moveTo(x, y);
    if (down && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) arm(e.clientX, e.clientY);
  });
  const up = () => { down = false; clearTimeout(still); };
  f.addEventListener('pointerup', up);
  f.addEventListener('pointercancel', up);
  f.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-0.03, 0], ArrowRight: [0.03, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04] }[e.key];
    if (k) { e.preventDefault(); moveTo(g.cursor.x + k[0], g.cursor.y + k[1]); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dig(); }
  });
}
function bindRoom2() {
  const g = gal();
  bindField();
  if (!g.snap && g.found.length < TARGETS.length) {
    const field = () => $('#galField');
    field()?.focus({ preventScroll: true });
    // 장면에 막 들어온 경우 앱이 다음 프레임에 장면 전체로 포커스를 옮긴다 — 그 뒤에 땅으로 가져온다
    requestAnimationFrame(() => requestAnimationFrame(() => { if (state.scene === 'gallery' && gal().room === 2 && !field()?.contains(document.activeElement)) field()?.focus({ preventScroll: true }); }));
    roomKeys = e => {
      if (e.target.closest?.('#galField, input, textarea, select')) return;   // 땅은 스스로 받는다
      const k = { ArrowLeft: [-0.03, 0], ArrowRight: [0.03, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04] }[e.key];
      if (k) { e.preventDefault(); $('#galField')?.focus({ preventScroll: true }); moveTo(g.cursor.x + k[0], g.cursor.y + k[1]); return; }
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest?.('button, a, label')) { e.preventDefault(); dig(); }
    };
    window.addEventListener('keydown', roomKeys);
  }
  if (g.snap) {
    const cap = $('#galCap');
    if (cap) cap.innerHTML = `<b>사유</b> ${esc(LINES.hollow)}`;   // 시연 화면: '속이 빈 몸'을 막 찾았을 때 나오는 녹음된 해설
    return;
  }
  const done2 = g.found.length === TARGETS.length;
  // 셋을 다 찾고 끝말을 기다리는 중에 다시 그려도(눈 감기 · 소리 칩 등) 마지막 해설을 끊지 않게 남은 시간만큼 기다린다
  later(() => narrate(done2 ? 'end2' : 'intro2'), done2 ? Math.max(400, (g.end2At || 0) - Date.now()) : 400);
}

export function bind() {
  const g = gal();
  roomKeysOff();
  stopAll();
  if (state.bgm) { bgmWasOn = true; stopBgm(); }
  $$('[data-gal-toggle]').forEach(b => b.onclick = () => {
    const k = b.dataset.galToggle;
    state[k] = !state[k];
    log('gal_toggle', { [k]: state[k] });
    hooks.render();
  });
  bindTask();
  (g.room === 1 ? bindRoom1 : bindRoom2)();
}

/** 전시실을 떠날 때: 소리·타이머·진동·목소리를 모두 거둔다. */
export function leave() {
  roomKeysOff();
  stopAll(); hush();
  if (bgmWasOn) { bgmWasOn = false; if (!state.bgmOff) toggleBgm(true); }
}

/* ---------- 이야기 속 입구 (galIntro) ---------- */
/** 시련 모드: 저승 앞에서 흙손 영감이 데려간다. 기존 이야기: 다섯 조각을 감별하면 사유가 초대한다. */
export function introView() {
  if (state.route === 'trials') {
    const G = TG();
    return povStage({
      name: data.trials.board.guideName, img: GUIDE_IMG, alt: G.guideAlt, line: G.line, chapter: G.chapter,
      controls: `<p class="pov-hint">${esc(G.thought)}</p>
        <div class="pov-actions"><button class="btn primary pov-continue" id="galIntroGo">${esc(G.enter)}</button>
        <button class="btn secondary" id="galIntroBack">${esc(G.back)}</button></div>`
    });
  }
  return povStage({
    name: '사유', img: SAYU_IMG, alt: INVITE.alt, line: INVITE.line, chapter: INVITE.chapter,
    controls: `<div class="pov-actions"><button class="btn primary pov-continue" id="galIntroGo">${esc(INVITE.enter)}</button>
      <button class="btn secondary" id="galIntroBack">${esc(INVITE.later)}</button></div>`
  });
}
export function introBind() {
  if (state.route === 'trials') speakGuide(TG().line);
  else if (hasRecording('sayu', INVITE.line)) speak(INVITE.line);   // 녹음이 없으면 기기 음성으로 읽지 않는다
  $('#galIntroGo').onclick = () => {
    if (state.route === 'trials') {
      // 시작 화면에서 해 본 기록이 있어도 시련 길의 전시실은 처음부터. 도중에 나갔다 오면 이어서 한다
      if (!state.trials.galStarted) { state.trials.galStarted = true; state.gal = freshGal(1); }
    } else {
      state.galInvited = true;
    }
    log('gal_intro_enter', { route: state.route });
    save();
    hooks.go('gallery');
  };
  $('#galIntroBack').onclick = () => hooks.go('hub');
}

/** 허브 카드 상태 문구 */
export function hubStatus() {
  const g = state.gal;
  if (!g) return '두 방 · 약 5분 · 소리와 진동을 켜고 들어가세요';
  return `${g.room}방 ${ROOMS[g.room].title} · 마친 방 ${g.done.length}/2`;
}
