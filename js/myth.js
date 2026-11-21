// 시련 2~5의 신화 층(2026-11-11). 시련 모드에서만 쓴다.
// 신화 카드, 사이렌의 노래(시련 2), 거인의 눈(시련 3), 히드라의 머리(시련 4)를 그린다.
// 규칙 계산은 trials-rules.js의 순수 함수에 두고, 여기서는 화면 · 소리 · 기록만 다룬다.
import { $, esc, state, data, log, announce, save, shake, hooks, speakSiren, allArtifactIds, asset } from './core.js';
import * as sense from './sense.js';
import { MYTH_TRIALS, ROPES, ensureTrials, sirenPick, fallForSong, gazeAt, fill } from './trials-rules.js';

const T = () => data.trials;
const on = () => state.route === 'trials';
const tr = () => ensureTrials(state.trials);
const GUIDE = asset('assets/character/halabeoji.webp');

/** 장면을 떠날 때: 거인의 박자와 사이렌의 노래를 멈춘다 */
export function leave() {
  clearInterval(gazeTimer);
  gazeTimer = 0; gazeT0 = null; lastGaze = null;
  sense.sirenStop();
}

/* ---------- 신화 카드 ---------- */
/** 시련 2~5에 처음 들어가면 그 시련의 신화부터 보여 준다 */
export const covers = () => on() && MYTH_TRIALS.includes(state.scene) && !tr().mythSeen[state.scene];
export const hasAgain = () => on() && MYTH_TRIALS.includes(state.scene) && !covers();

export function cardView() {
  const id = state.scene, M = T().myth, m = M[id], t = T().trials[id];
  return `
    <section class="myth-card" aria-labelledby="mythTitle">
      <header class="scene-head"><div class="eyebrow">${esc(M.label)} · ${esc(t.stop)}</div><h1 id="mythTitle">${esc(m.title)}</h1></header>
      <div class="myth-body">
        <img class="myth-guide" src="${GUIDE}" alt="${esc(T().board.guideAlt)}">
        <div class="myth-text">
          <p class="myth-story">${esc(m.story)}</p>
          <p class="myth-rule"><b>${esc(M.ruleLabel)}</b>${esc(m.rule)}</p>
          <p class="myth-flaw"><b>${esc(M.flawLabel)}</b>${esc(m.flaw)}</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn primary" id="mythGo">${esc(m.go)}</button>
        <button class="btn secondary" id="backHub">${esc(T().board.back)}</button>
      </div>
    </section>`;
}

export function cardBind() {
  const id = state.scene;
  $('#mythGo').onclick = () => { tr().mythSeen[id] = true; log('myth_read', { trial: id }); save(); hooks.render(); };
  $('#backHub').onclick = () => hooks.go('hub');
}

export const againBar = () => `<div class="myth-again"><button class="btn secondary" id="mythAgain">📜 ${esc(T().myth.again)}</button></div>`;
export function againBind() {
  const b = $('#mythAgain');
  if (b) b.onclick = () => { tr().mythSeen[state.scene] = false; log('myth_again', { trial: state.scene }); save(); hooks.render(); };
}

/* ---------- 시련 2 · 사이렌의 노래 ---------- */
const U = () => T().sirenUI;
export const sirenOn = () => on() && state.scene === 'study';

/** 해협: 배가 바위(감별할 조각)를 하나씩 지나가고, 돛대의 밧줄이 몇 개 남았는지 */
export function strait() {
  if (!sirenOn()) return '';
  const s = tr().siren, total = allArtifactIds().length, n = state.codex.length;
  const voyage = fill(U().voyage, { n, total }), ropes = fill(U().ropes, { n: s.ropes });
  return `
    <section class="siren-strait" aria-label="${esc(U().strait)}">
      <div class="siren-sea" style="--p:${(n / Math.max(1, total)).toFixed(3)}" role="img" aria-label="${esc(voyage)}">
        ${Array.from({ length: total }, (_, i) => `<i class="rock ${i < n ? 'past' : ''}"></i>`).join('')}
        <span class="ship" aria-hidden="true">⛵</span>
      </div>
      <div class="siren-meta">
        <span>${esc(voyage)}</span>
        <span class="ropes" role="img" aria-label="${esc(ropes)}">${Array.from({ length: ROPES }, (_, i) => `<i class="${i < s.ropes ? 'on' : ''}"></i>`).join('')}</span>
      </div>
      <p class="siren-refrain"><span class="fiction-label">${esc(U().sings)}</span>“${esc(T().siren)}”</p>
    </section>`;
}

/** 이 문제에서 사이렌이 노래하는 보기(늘 틀린 것) */
export const lureIndex = (a, toolId) => {
  const r = a.readings[toolId];
  return sirenPick(`${a.id}:${toolId}`, r.answer, r.choices.length);
};

/** 도구를 쓰기 전: 사이렌은 판독 없이도 답을 노래한다 */
export function lureBlock(a, toolId) {
  if (!sirenOn()) return '';
  const r = a.readings[toolId];
  return `
    <div class="siren-lure">
      <span class="eyebrow">${esc(U().sings)}</span>
      <p>“${esc(r.choices[lureIndex(a, toolId)])}” — ${esc(U().lure)}</p>
      <button class="btn secondary siren-follow" data-follow="${toolId}">${esc(U().follow)}</button>
      <p class="reading-status" id="lure-${toolId}" role="status"></p>
    </div>`;
}

/** 판독 뒤의 보기 중 사이렌의 것에는 속삭임을 붙인다 */
export const lureWhisper = () => `<small class="siren-whisper">${esc(U().lure)}</small>`;

/** 노래에 넘어갔다: 눈앞이 흐려지고 밧줄이 풀린다. before는 판독하기 전에 노래를 따른 경우 */
export function fall(aId, toolId, { before = false } = {}) {
  const t = tr(), r = fallForSong(t.siren);
  t.siren = r.siren;
  log(before ? 'siren_follow' : 'siren_fall', { artifact_id: aId, tool_id: toolId, ropes: r.siren.ropes, retied: r.retied });
  const sc = $('#scene');
  if (sc) {
    sc.classList.add('siren-blur');
    setTimeout(() => sc.classList.remove('siren-blur'), 1800);
  }
  const box = $('.siren-strait');
  if (box) box.outerHTML = strait();
  sense.wobble();
  sense.sirenSong(1);
  speakSiren(U().lure);
  const msg = r.retied ? U().retied : U().fell;
  announce(msg);
  save();
  return msg;
}

/** 아직 판독하지 않은 도구가 있으면 노래가 들리고, 남은 것이 적을수록 멀어진다 */
export function songFor(aId) {
  if (!sirenOn() || !aId) { sense.sirenStop(); return; }
  const left = data.artifacts.tools.filter(t => !state.readings[aId]?.[t.id]?.resolved).length;
  if (left) sense.sirenSong(0.2 + 0.25 * left); else sense.sirenStop();
}

/* ---------- 시련 3 · 폴리페모스의 벽 ---------- */
const G = () => T().giant;
export const giantOn = () => on() && state.scene === 'reconstruct';
let gazeT0 = null, gazeTimer = 0, lastGaze = null;
const gaze = () => gazeAt(state.startedAt || 1, performance.now() - (gazeT0 ?? performance.now()), !!tr().giant.slow);
const gazeKey = g => (g.watching ? 'watch' : g.warn ? 'warn' : 'away');
const gazeText = k => G()[k === 'watch' ? 'watching' : k];

/** 거인이 지금 이쪽을 보고 있는가 — 보고 있을 때 놓은 조각은 튕겨 나온다 */
export const giantWatching = () => giantOn() && gazeT0 !== null && gaze().watching;

export function giantStrip(done) {
  if (!giantOn()) return '';
  const k = done ? 'away' : gazeT0 === null ? 'away' : gazeKey(gaze());
  return `
    <section class="giant-strip" data-gaze="${done ? 'gone' : k}">
      <div class="giant-eye" role="img" aria-label="${esc(G().eyeAlt)}"><i></i></div>
      <p class="giant-status" id="giantStatus" role="status">${done ? '' : esc(gazeText(k))}</p>
      ${done ? '' : `<label class="hold-mode"><input type="checkbox" id="giantSlow" ${tr().giant.slow ? 'checked' : ''}> ${esc(G().slow)}</label>`}
    </section>`;
}

export function giantBind(done) {
  clearInterval(gazeTimer);
  gazeTimer = 0;
  if (!giantOn() || done) { gazeT0 = null; return; }   // 다 놓았으면 거인은 더 보지 않는다
  if (gazeT0 === null) gazeT0 = performance.now();
  const tick = () => {
    const k = gazeKey(gaze());
    if (k === lastGaze) return;
    lastGaze = k;
    const strip = $('.giant-strip');
    if (strip) strip.dataset.gaze = k;
    const st = $('#giantStatus');
    if (st) st.textContent = gazeText(k);
    if (k === 'warn') sense.giantStep();
  };
  lastGaze = null;
  tick();
  gazeTimer = setInterval(tick, 100);
  const slow = $('#giantSlow');
  if (slow) slow.onchange = e => {
    tr().giant.slow = e.target.checked;
    log('giant_slow', { on: e.target.checked });
    gazeT0 = performance.now();   // 박자를 돌아선 때부터 다시
    save();
    lastGaze = null;
    tick();
  };
}

/** 눈에 띄었다: 조각이 튕겨 나온다(놓이지 않는다) */
export function caught(el, aId) {
  const g = tr().giant;
  g.caught++;
  log('giant_caught', { artifact_id: aId, caught: g.caught });
  sense.wallHit();
  shake();
  if (el) { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 450); }
  const box = $('#hintBox');
  if (box) box.textContent = G().caught;
  announce(G().caught);
  save();
}

/** 다섯을 다 놓으면 거인이 이름을 묻는다 — '아무도 아니다' */
export function escapeBlock() {
  if (!giantOn()) return '';
  if (tr().giant.escaped) {
    return `<div class="giant-who done"><p>${esc(G().escaped)}</p><button class="btn primary" id="giantOut">${esc(G().out)}</button></div>`;
  }
  return `<div class="giant-who"><p>${esc(G().who)}</p><button class="btn primary" id="nobodyBtn">${esc(G().nobody)}</button></div>`;
}

export function escapeBind() {
  const b = $('#nobodyBtn');
  if (b) b.onclick = () => {
    tr().giant.escaped = true;
    log('giant_nobody');
    sense.giantStep();
    save();
    hooks.render();
    announce(G().escaped);
    $('#giantOut')?.focus({ preventScroll: true });
  };
  const out = $('#giantOut');
  if (out) out.onclick = () => hooks.go('hub');
}

/* ---------- 시련 4 · 히드라 ---------- */
const H = () => T().hydraUI;
export const hydraOn = () => on() && state.scene === 'cast';

/** 결함 = 머리. 하나는 죽지 않는 머리로 표시한다 */
export function hydraHeads(n) {
  const label = fill(H().heads, { n });
  return `
    <div class="hydra-row" role="img" aria-label="${esc(label)}">
      ${Array.from({ length: n }, (_, i) => `<i class="hydra-head ${i === 0 ? 'immortal' : ''}" title="${esc(i === 0 ? H().immortalHead : H().head)}"></i>`).join('')}
    </div>
    <p class="hydra-count">${esc(label)}</p>`;
}

export const hydraTag = id => (id === 'recast' ? H().sword : id === 'insert' ? H().fire : H().rock);
export const hydraMessage = r => (r.immortal ? H().immortal : r.regrew ? H().regrew : H().sealed);
