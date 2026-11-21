// 감각 단서 — 발굴 격자를 눈이 아니라 소리와 진동으로도 읽게 하는 크로스모달 시그니파이어.
// 격자는 45° 돌린 아이소메트릭이라, 행·열이 아니라 '화면에 보이는 자리'를 소리에 맞춘다(손끝이 움직이는 방향 = 소리가 변하는 방향).
//   화면 위↔아래(행+열) → 음높이. 위쪽 블록일수록 높다. 발굴장 BGM과 같은 계면조(라·도·레·미·솔)라 단서가 음악처럼 들린다.
//   화면 왼쪽↔오른쪽(열−행) → 좌우 위치(스테레오). 왼쪽 블록은 왼쪽 귀에서 난다.
//   남은 흙     → 소리의 밝기와 진동 길이. 흙이 두꺼울수록 둔탁하고 길게, 바닥은 맑은 "팅".
// 붓질·쇳물·거푸집 소리는 걸러 낸 잡음 알갱이로 합성한다(ASMR). 음원 파일은 쓰지 않는다.
// 진동은 웹 진동을 지원하는 기기(주로 Android)에서만 나고, 그 밖의 기기에서는 같은 정보를 소리가 전한다.
import { state, vibrate } from './core.js';
import { getContext, pluckSfx } from './music.js';

// 계면조 두 옥타브 남짓 — 화면 맨 위 블록(라5)에서 맨 아래 블록(라3)까지
const PITCH = [880.0, 783.99, 659.25, 587.33, 523.25, 440.0, 392.0, 329.63, 293.66, 261.63, 220.0];

const audio = () => (state.sfx ? getContext() : null);
/** 화면 높이(행+열)를 음높이로 — 위가 높다 */
function pitchOf(row, col, rows, cols) {
  const span = Math.max(1, rows + cols - 2);
  return PITCH[Math.round(((row + col) / span) * (PITCH.length - 1))];
}
/** 화면 가로 자리(열−행)를 좌우로 — 왼쪽이 왼쪽 귀 */
function panOf(row, col, rows, cols) {
  const span = Math.max(1, Math.max(rows, cols) - 1);
  return ((col - row) / span) * 0.8;
}

/* ---------- 잡음 알갱이 ---------- */
let noiseBuf = null;
function noise(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = c.sampleRate;
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function out(c, node, pan) {
  if (c.createStereoPanner && pan) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p);
    p.connect(c.destination);
  } else node.connect(c.destination);
}

function grain(c, { when, dur, freq, q = 0.8, gain, pan = 0, type = 'bandpass' }) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + Math.min(0.015, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(f).connect(g);
  out(c, g, pan);
  src.start(when, Math.random() * 0.5, dur + 0.05);
}

function thump(c, when, freq, gain, dur, pan = 0) {
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  out(c, g, pan);
  osc.start(when); osc.stop(when + dur + 0.05);
}

/* ---------- 발굴 격자 ---------- */

/** 칸 하나를 짚었을 때(손끝으로 끌거나 방향키로 옮길 때) — 위치와 남은 흙 */
export function cell({ row, col, rows, cols, left }) {
  vibrate(left ? [6 + left * 6] : [5]);
  const c = audio();
  if (!c) return;
  const pan = panOf(row, col, rows, cols);
  pluckSfx(pitchOf(row, col, rows, cols), {
    pan, gain: left ? 0.15 : 0.2,
    seconds: left ? 0.5 : 1.1,
    brightness: left ? 0.62 - left * 0.14 : 0.88
  });
  if (left) grain(c, { when: c.currentTime, dur: 0.06 + left * 0.03, freq: 240, q: 0.7, gain: 0.03 + left * 0.02, pan, type: 'lowpass' });
}

/** 숫자 칸 — 칸의 음 다음에, 둘레에 묻힌 조각 수만큼 한 옥타브 위에서 두드린다 */
export function clue({ n, row, col, rows, cols }) {
  vibrate(n ? Array.from({ length: n * 2 - 1 }, (_, i) => (i % 2 ? 110 : 28)) : [8]);
  const c = audio();
  if (!c) return;
  const pan = panOf(row, col, rows, cols), base = pitchOf(row, col, rows, cols);
  pluckSfx(base, { pan, gain: 0.18, seconds: 1.0, brightness: 0.85 });
  for (let k = 0; k < n; k++) {
    pluckSfx(base * 2, { pan, gain: 0.12, seconds: 0.35, brightness: 0.9, when: c.currentTime + 0.32 + k * 0.17 });
  }
  if (!n) grain(c, { when: c.currentTime + 0.3, dur: 0.25, freq: 600, q: 0.5, gain: 0.025, pan, type: 'lowpass' });
}

/** 힌트 단계 — 묻힌 조각에 가까우면 심장처럼 두근거린다. 정확한 칸이 아니라 근처만 알려 준다. */
export function heartbeat(beats, { row, col, rows, cols }) {
  if (!beats) return;
  vibrate(beats > 1 ? [40, 90, 40] : [30]);
  const c = audio();
  if (!c) return;
  const pan = panOf(row, col, rows, cols), t = c.currentTime + 0.12;
  for (let k = 0; k < beats; k++) thump(c, t + k * 0.2, 92, 0.24, 0.18, pan);
}

/** 붓질 — 잡음 알갱이를 잇달아 터뜨린 "사각사각". 흙이 두꺼울수록 밑에 깔린 "퍽"이 묵직하다 */
export function brush({ row, col, rows, cols, left }) {
  const d = 6 + left * 5;
  vibrate([d, 26, d, 26, d]);
  const c = audio();
  if (!c) return;
  const pan = panOf(row, col, rows, cols), t = c.currentTime;
  for (let k = 0; k < 4; k++) {
    grain(c, {
      when: t + k * 0.055 + Math.random() * 0.015,
      dur: 0.07 + Math.random() * 0.05,
      freq: 2600 + Math.random() * 2200, q: 0.8,
      gain: 0.05 + Math.random() * 0.03,
      pan: pan + (Math.random() - 0.5) * 0.2
    });
  }
  grain(c, { when: t, dur: 0.12 + left * 0.04, freq: 220, q: 0.6, gain: 0.04 + left * 0.025, pan, type: 'lowpass' });
}

/** 바닥이 드러났을 때 — 맑은 "팅" */
export function floor({ row, col, rows, cols }) {
  const c = audio();
  if (!c) return;
  pluckSfx(pitchOf(row, col, rows, cols), { pan: panOf(row, col, rows, cols), gain: 0.22, seconds: 1.2, brightness: 0.9 });
}

/* ---------- 주조 ---------- */

/** 쇳물 — 길게 끓는 "치익"과 잔 기포 */
export function sizzle() {
  vibrate([60, 40, 60, 40, 120]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  grain(c, { when: t, dur: 1.1, freq: 3800, q: 0.4, gain: 0.07, type: 'highpass' });
  for (let k = 0; k < 7; k++) {
    grain(c, { when: t + 0.1 + Math.random() * 0.9, dur: 0.03, freq: 1800 + Math.random() * 2400, q: 2, gain: 0.05, pan: (Math.random() - 0.5) * 0.8 });
  }
}

/** 거푸집 깨기 — 짧은 "쩍"과 낮은 울림 */
export function crack() {
  vibrate([20, 30, 90]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  grain(c, { when: t, dur: 0.07, freq: 1300, q: 1.2, gain: 0.16 });
  grain(c, { when: t + 0.05, dur: 0.18, freq: 500, q: 0.8, gain: 0.08 });
  thump(c, t, 70, 0.22, 0.35);
}

/* ---------- 조우 · 체화 ---------- */

/** 조우 — 사유가 먼저 숨을 쉰다. 플레이어는 아무것도 하지 않아도 되는 수동 단계 */
export function breath() {
  vibrate([18, 700, 18, 700, 18]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  for (let k = 0; k < 3; k++) grain(c, { when: t + k * 0.72, dur: 0.55, freq: 520, q: 0.5, gain: 0.035, type: 'lowpass' });
}

/**
 * 쓰다듬기 — 초당 1~10cm(약 40~380px)의 느린 손길에 가장 따뜻하게 반응한다.
 * C-구심성 섬유가 반기는 속도를 빌린 것이지만, 손끝은 그 섬유가 적은 곳이므로
 * "정서적 접촉을 흉내 낸 수동 단계"로만 쓴다.
 */
let lastStroke = 0;
export function stroke(pxPerSec) {
  const now = performance.now();
  if (now - lastStroke < 140) return false;
  lastStroke = now;
  const slow = pxPerSec >= 38 && pxPerSec <= 380;
  vibrate(slow ? [10] : [4]);
  const c = audio();
  if (c) {
    grain(c, slow
      ? { when: c.currentTime, dur: 0.32, freq: 700, q: 0.5, gain: 0.05, type: 'lowpass' }
      : { when: c.currentTime, dur: 0.12, freq: 2200, q: 0.5, gain: 0.018 });
  }
  return slow;
}

/** 닿을 듯 말 듯 — 거의 느껴지지 않을 만큼 약한 세 번의 떨림 */
export function nearTouch() {
  vibrate([4, 160, 4, 160, 4, 500, 3]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  for (let k = 0; k < 3; k++) pluckSfx(1318.5, { gain: 0.05, seconds: 0.6, brightness: 0.3, when: t + k * 0.16 });
  grain(c, { when: t + 0.55, dur: 0.6, freq: 900, q: 0.4, gain: 0.02, type: 'lowpass' });
}

/* ---------- 사유자의 시련 ---------- */

/** 녹을 쓸어낼 때 — 불협화음의 거친 마찰음과 둔탁하게 끊어지는 진동 */
export function grit() {
  vibrate([50, 80, 30, 170, 70]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  thump(c, t, 58.27, 0.16, 0.34);
  thump(c, t + 0.02, 55, 0.16, 0.34);
  for (let k = 0; k < 3; k++) grain(c, { when: t + k * 0.07, dur: 0.1, freq: 320 + Math.random() * 180, q: 1.4, gain: 0.07 });
}

/** 사이렌 — 낮은 음의 주파수가 미세하게 흔들리고, 진동은 불규칙하게 떨린다 */
export function wobble() {
  vibrate([30, 90, 20, 160, 45, 70, 25]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime, osc = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 110;
  lfo.frequency.value = 0.7;
  depth.gain.value = 3.2;
  lfo.connect(depth).connect(osc.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  osc.connect(g).connect(c.destination);
  osc.start(t); lfo.start(t);
  osc.stop(t + 2.3); lfo.stop(t + 2.3);
}

/** 괴물의 압박 — 간격이 고르지 않은 저주파 타격 ‘쿵- 쿵-’ */
export function wallHit() {
  vibrate([200, 140, 70, 360, 240]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  thump(c, t, 62, 0.34, 0.5);
  thump(c, t + 0.34, 52, 0.26, 0.42);
  thump(c, t + 0.94, 66, 0.36, 0.6);
}

/** 버티기 — level 0(가벼움)~1(무거움). 누를수록 저음이 낮아지고 진동이 길어진다 */
export function strain(level) {
  vibrate([Math.round(30 + level * 170)]);
  const c = audio();
  if (!c) return;
  thump(c, c.currentTime, 110 - level * 60, 0.1 + level * 0.2, 0.3);
}

/** 저승의 칸 — 위아래는 음높이, 좌우는 소리 방향, 가까우면 두근거림(beats 회) */
export function spot({ row, col, rows, cols, beats = 0 }) {
  vibrate(beats ? (beats > 2 ? [40, 90, 40, 90, 120] : beats > 1 ? [40, 90, 40] : [30]) : [6]);
  const c = audio();
  if (!c) return;
  const pan = ((col / Math.max(1, cols - 1)) * 2 - 1) * 0.8;
  const pitch = PITCH[Math.round((row / Math.max(1, rows - 1)) * (PITCH.length - 1))];
  pluckSfx(pitch, { pan, gain: 0.18, seconds: 0.7, brightness: 0.7 });
  const t = c.currentTime + 0.14;
  for (let k = 0; k < beats; k++) thump(c, t + k * 0.2, 92, 0.24, 0.18, pan);
}

/** 만남(닿을 듯 멈추기) — 틈을 지킬 때마다 왼쪽의 낮은 소리와 오른쪽의 높은 소리가 가운데로 모이고, 세 번째에 화음이 된다 */
export function converge(breath) {
  vibrate([30, 170, 30, 170, 30, 170, 30, 170]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime, pan = [0.9, 0.5, 0][Math.min(breath, 2)];
  const tone = (freq, p) => {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    osc.connect(g);
    out(c, g, p);
    osc.start(t);
    osc.stop(t + 2.5);
  };
  tone(196, -pan);
  tone(293.66, pan);
  if (breath >= 2) tone(246.94, 0);
}

/** 정원 — 편안한 심장박동(1초에 한 번) */
export function gardenBeat() {
  vibrate([60, 140, 60]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  thump(c, t, 70, 0.16, 0.16);
  thump(c, t + 0.2, 62, 0.12, 0.18);
}

/** 점수 화면의 별 하나(2026-11-18) — 별마다 한 음씩 올라가는 종소리와 또렷한 진동. 소리를 꺼도 진동은 난다 */
export function star(i) {
  vibrate([120, 60, 40]);
  if (!audio()) return;
  const f = [523.25, 659.25, 783.99][Math.max(0, Math.min(i, 2))];
  pluckSfx(f, { gain: 0.34, seconds: 1.8, brightness: 0.85 });
  pluckSfx(f * 2, { gain: 0.12, seconds: 1.3, brightness: 0.95 });
}

/* ---------- 신화 규칙 (2026-11-11) ---------- */

// 사이렌의 노래 — 높은 두 목소리가 3도로 어긋나며 느리게 미끄러지고, 음높이가 크게 떨린다(주파수 흔들림).
// level 0~1: 문제가 열려 있는 동안 가까워지고, 넘어가면 크게 들린다. 끝내면 멀어진다.
const SIREN_NOTES = [659.25, 587.33, 523.25, 587.33, 783.99, 659.25, 523.25, 440.0];
let siren = null;
export function sirenSong(level = 0.5) {
  const c = audio();
  if (!c) { sirenStop(); return; }
  const gainOf = l => 0.012 + Math.max(0, Math.min(1, l)) * 0.06;
  if (siren) { siren.master.gain.setTargetAtTime(gainOf(level), c.currentTime, 0.6); return; }
  const master = c.createGain();
  master.gain.value = 0.0001;
  master.gain.setTargetAtTime(gainOf(level), c.currentTime, 0.8);
  master.connect(c.destination);
  const voices = [[1, -0.45], [1.26, 0.45]].map(([ratio, pan]) => {
    const osc = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = SIREN_NOTES[0] * ratio;
    lfo.frequency.value = ratio > 1 ? 4.7 : 5.6;
    depth.gain.value = 9 * ratio;
    lfo.connect(depth).connect(osc.frequency);
    g.gain.value = 0.5;
    osc.connect(g);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(master); } else g.connect(master);
    osc.start(); lfo.start();
    return { osc, lfo, ratio };
  });
  let i = 0;
  const timer = setInterval(() => {
    i = (i + 1) % SIREN_NOTES.length;
    for (const v of voices) v.osc.frequency.setTargetAtTime(SIREN_NOTES[(i + (v.ratio > 1 ? 2 : 0)) % SIREN_NOTES.length], c.currentTime, 0.35);
  }, 1300);
  siren = { master, voices, timer };
}
export function sirenStop() {
  if (!siren) return;
  const s = siren, c = audio() || s.master.context;
  siren = null;
  clearInterval(s.timer);
  try {
    s.master.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
    for (const v of s.voices) { v.osc.stop(c.currentTime + 1.2); v.lfo.stop(c.currentTime + 1.2); }
  } catch { /* 이미 멈춘 소리 */ }
}

/** 거인의 발소리 — 고르지 않은 간격의 무거운 '쿵 … 쿵', 거인이 돌아보기 직전에 낸다 */
export function giantStep() {
  vibrate([140, 420, 200]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  thump(c, t, 46, 0.34, 0.5);
  thump(c, t + 0.52 + Math.random() * 0.25, 41, 0.32, 0.55);
}

/* ---------- 시련 5 · 스킬라와 카립디스 ---------- */
// 왼쪽 귀: 스킬라 — 날카로운 쇳소리(높은 대역 잡음 + 떨리는 높은 음). 오른쪽 귀: 카립디스 — 낮은 우르릉(낮은 대역 잡음 + 저음).
// 가운데: 양쪽 귀에 고요한 낮은 음. 배가 치우칠수록 그쪽 소리가 커지고 가운데 음은 작아진다.
let strait = null;
export function straitStart() {
  const c = audio();
  if (!c || strait) return;
  const t = c.currentTime;
  const loop = () => { const s = c.createBufferSource(); s.buffer = noise(c); s.loop = true; return s; };
  const side = (pan, build) => {
    const g = c.createGain();
    g.gain.value = 0.0001;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(c.destination); } else g.connect(c.destination);
    const nodes = build(g);
    return { g, nodes };
  };
  const left = side(-0.95, g => {
    const n = loop(), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 4;
    const osc = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), og = c.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 1180; lfo.frequency.value = 9; depth.gain.value = 60; og.gain.value = 0.18;
    lfo.connect(depth).connect(osc.frequency);
    n.connect(f).connect(g); osc.connect(og).connect(g);
    n.start(t); osc.start(t); lfo.start(t);
    return [n, osc, lfo];
  });
  const right = side(0.95, g => {
    const n = loop(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = 46;
    const og = c.createGain(); og.gain.value = 0.6;
    n.connect(f).connect(g); osc.connect(og).connect(g);
    n.start(t); osc.start(t);
    return [n, osc];
  });
  const mid = c.createOscillator(), mg = c.createGain();
  mid.type = 'sine'; mid.frequency.value = 220; mg.gain.value = 0.0001;
  mid.connect(mg).connect(c.destination);
  mid.start(t);
  strait = { left, right, mid, mg };
  straitSet(0);
}
export function straitSet(x) {
  const c = audio();
  if (!c || !strait) return;
  const t = c.currentTime, l = Math.max(0, -x), r = Math.max(0, x);
  strait.left.g.gain.setTargetAtTime(0.0001 + l * l * 0.16, t, 0.08);
  strait.right.g.gain.setTargetAtTime(0.0001 + r * r * 0.32, t, 0.08);
  strait.mg.gain.setTargetAtTime(0.0001 + (1 - Math.min(1, Math.abs(x))) ** 2 * 0.035, t, 0.15);
}
export function straitStop() {
  if (!strait) return;
  const s = strait, c = s.mg.context, t = c.currentTime;
  strait = null;
  try {
    for (const g of [s.left.g, s.right.g, s.mg]) g.gain.setTargetAtTime(0.0001, t, 0.1);
    for (const n of [...s.left.nodes, ...s.right.nodes, s.mid]) n.stop(t + 0.6);
  } catch { /* 이미 멈춘 소리 */ }
}
/** 치우칠수록 촘촘한 진동 — 왼쪽(스킬라)은 짧고 날카롭게, 오른쪽(소용돌이)은 길고 둔하게 */
export function straitBuzz(side, danger) {
  vibrate(side === 'left' ? [Math.round(15 + danger * 25), 30, Math.round(15 + danger * 25)] : [Math.round(60 + danger * 140)]);
}
/** 스킬라가 노를 앗아 감 — 갈라지는 높은 타격 */
export function straitBite() {
  vibrate([40, 30, 40, 30, 120]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  for (let k = 0; k < 3; k++) grain(c, { when: t + k * 0.06, dur: 0.12, freq: 3200 - k * 500, q: 3, gain: 0.16, pan: -0.8 });
  thump(c, t, 180, 0.2, 0.25, -0.6);
}
/** 소용돌이에 끌려감 — 길게 가라앉는 저음 */
export function straitSwallow() {
  vibrate([400, 100, 300]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  thump(c, t, 90, 0.34, 1.4, 0.7);
  grain(c, { when: t, dur: 1.3, freq: 140, q: 0.7, gain: 0.22, pan: 0.7, type: 'lowpass' });
}

/* ---------- 만남 · 닿을 듯 멈추기 (2026-11-12) ---------- */
// 내 손의 소리(G3, 왼쪽)는 다가갈수록 커지며 가운데로 오고, 사유의 소리(D4, 오른쪽)는 작게 기다린다.
// 멀면 내 소리가 거의 들리지 않고(무관심), 틈에서는 두 소리가 가까이 겹친다. 닿으면 반음 어긋난 거친 소리(괴로움).
let reachSound = null;
export function reachStart() {
  const c = audio();
  if (!c || reachSound) return;
  const voice = (freq, pan, gain) => {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = gain;
    let p = null;
    if (c.createStereoPanner) { p = c.createStereoPanner(); p.pan.value = pan; osc.connect(g).connect(p).connect(c.destination); } else osc.connect(g).connect(c.destination);
    osc.start();
    return { osc, g, p };
  };
  reachSound = { me: voice(196, -0.9, 0.0001), her: voice(293.66, 0.9, 0.03) };
}
export function reachSet(x) {
  const c = audio();
  if (!c || !reachSound) return;
  const t = c.currentTime, { me } = reachSound;
  me.g.gain.setTargetAtTime(0.0001 + x * x * 0.1, t, 0.08);
  if (me.p) me.p.pan.setTargetAtTime(-0.9 * (1 - x), t, 0.08);
}
export function reachStop() {
  if (!reachSound) return;
  const s = reachSound, c = s.me.osc.context, t = c.currentTime;
  reachSound = null;
  try {
    for (const v of [s.me, s.her]) { v.g.gain.setTargetAtTime(0.0001, t, 0.15); v.osc.stop(t + 0.8); }
  } catch { /* 이미 멈춘 소리 */ }
}
/** 틈에 머무는 동안 — 거의 느껴지지 않는 짧은 떨림(닿을 듯 말 듯) */
export function reachPulse() { vibrate([4]); }
/** 닿았다 — 반음 어긋난 거친 소리와 긴 진동, 손이 움찔 물러난다 */
export function reachTouch() {
  vibrate([120, 40, 160]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  for (const f of [196, 207.65]) {
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    out(c, g, 0);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.6);
  }
  grain(c, { when: t, dur: 0.35, freq: 1800, q: 1.2, gain: 0.05 });
}

/* ---------- 시각장애인판 (소리로 만나는 판, 2026-11-12) ---------- */
// 눈 대신 귀로 때를 맞추도록, 오리지널에서는 화면이 전하던 거인의 눈과 만남의 틈을 소리로 낸다.

/** 거인이 보고 있는 동안: 낮게 그르렁대는 숨소리(낮은 대역 잡음과 55 Hz 저음을 숨 쉬듯 0.6 Hz로 부풀렸다 줄인다) */
let glare = null;
export function giantGlareStart() {
  const c = audio();
  if (!c || glare) return;
  const t = c.currentTime;
  const n = c.createBufferSource(); n.buffer = noise(c); n.loop = true;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
  const breath = c.createGain(); breath.gain.value = 0.5;
  const lfo = c.createOscillator(), depth = c.createGain();
  lfo.frequency.value = 0.6; depth.gain.value = 0.5;
  lfo.connect(depth).connect(breath.gain);
  const low = c.createOscillator(), lowG = c.createGain();
  low.type = 'sine'; low.frequency.value = 55; lowG.gain.value = 0.5;
  const g = c.createGain(); g.gain.value = 0.0001;
  n.connect(f).connect(breath);
  low.connect(lowG).connect(breath);
  breath.connect(g).connect(c.destination);
  g.gain.setTargetAtTime(0.16, t, 0.15);
  n.start(t); lfo.start(t); low.start(t);
  glare = { g, nodes: [n, lfo, low] };
  vibrate([60, 200, 60]);
}
export function giantGlareStop() {
  if (!glare) return;
  const s = glare, t = s.g.context.currentTime;
  glare = null;
  try {
    s.g.gain.setTargetAtTime(0.0001, t, 0.12);
    s.nodes.forEach(x => x.stop(t + 0.6));
  } catch { /* 이미 멈춘 소리 */ }
}
/** 하는 법의 '들어 보기': 숨소리를 2.5초만 */
export function giantGlareSample() { giantGlareStart(); setTimeout(giantGlareStop, 2500); }
/** 거인이 돌아섰다: 점점 작아지며 오른쪽으로 멀어지는 발소리 셋과 작은 종 하나 */
export function giantAway() {
  vibrate([30]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  thump(c, t, 48, 0.26, 0.45, 0.2);
  thump(c, t + 0.45, 46, 0.14, 0.4, 0.5);
  thump(c, t + 0.85, 44, 0.07, 0.35, 0.8);
  pluckSfx(1046.5, { gain: 0.16, when: t + 1.2, seconds: 1.4 });
}

/** 만남: 틈에 머무는 동안 가운데서 잘게 떨리는 소리(진동이 없는 기기에서도 틈을 귀로 안다) */
export let shimmers = 0;
export function reachShimmer() {
  shimmers++;
  vibrate([4]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime, osc = c.createOscillator(), g = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(g);
  out(c, g, 0);
  osc.start(t);
  osc.stop(t + 0.1);
}
/** 하는 법의 '들어 보기' — far: 멀 때, gap: 틈, touch: 닿았을 때 */
export function reachSample(kind) {
  if (kind === 'touch') { reachTouch(); return; }
  reachStart();
  if (kind === 'far') { reachSet(0.3); setTimeout(reachStop, 1500); return; }
  reachSet(0.8);
  for (let k = 0; k < 8; k++) setTimeout(reachShimmer, 200 + k * 220);
  setTimeout(reachStop, 2200);
}

/** 계속 나는 소리가 남아 있는가(장면을 떠날 때 멈췄는지 시험이 본다) */
export const loops = () => ({ glare: !!glare, reach: !!reachSound, strait: !!strait });
