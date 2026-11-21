// 만남 · 닿을 듯 멈추기(2026-11-12). 예전의 '세 번 숨쉬기'를 바꾼 미니게임이다.
// 사유의 말 "누르면 괴로움이 되고, 떼면 무관심이 돼. 닿을 듯 멈춘 그 자리가 사유야"를 그대로 조작으로 옮겼다.
// 누르고 있으면 내 손이 사유의 손 쪽으로 다가가고, 떼면 물러난다. 빛나는 틈에 손을 머물게 하면 한 회차, 모두 세 회차.
// 계산은 trials-rules.js(reachStep · reachZone)에 두고, 여기서는 화면 · 입력 · 소리 · 진동만 다룬다.
import { $, esc, state, data, log, save, hooks } from './core.js';
import * as sense from './sense.js';
import { REACH_ROUNDS, REACH_GAP, REACH_TOUCH, REACH_HOLD_MS, freshReach, reachStep, ensureTrials } from './trials-rules.js';

// 시각장애인판에서는 같은 조작을 쓰되, 글은 그 판의 것(소리로 설명한 틈)을 쓴다
const listen = () => state.route === 'listen';
const M = () => (listen() ? data.listen.meet : data.trials.meet);
const TICK = 50;

let timer = 0, r = null, pressed = false, last = 0, lastZone = '', lastPulse = 0, onKey = null, onBlur = null, lastShimmer = 0, heldMark = 0;

const tr = () => ensureTrials(state.trials);
const gapLo = () => REACH_GAP[Math.min(tr().breaths, REACH_ROUNDS - 1)];

/** 장면을 떠날 때: 손을 거두고 소리를 끈다(회차 안의 진행은 저장하지 않는다) */
export function leave() {
  clearInterval(timer);
  timer = 0; r = null; pressed = false; lastZone = '';
  if (onKey) { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); onKey = null; }
  if (onBlur) { window.removeEventListener('blur', onBlur); onBlur = null; }
  sense.reachStop();
}

// 회차 점: 무엇을 세는지 대체 글에 적는다(WCAG 1.1.1)
// v2(2026-11-21): 시각장애인판의 '한 페이지 5개 이하' 화면(compact)에서는 회차 점과 막대 그림을 낭독기에서 빼고, 상태 글 하나로 읽힌다
let compact = false;
const dots = done => `<div class="hold-rounds" ${compact ? 'aria-hidden="true"' : 'role="img"'} aria-label="${esc((M().roundsLabel || '{n}/{total}').replace('{n}', done).replace('{total}', REACH_ROUNDS))}">${
  Array.from({ length: REACH_ROUNDS }, (_, i) => `<span class="${i < done ? 'on' : ''}"></span>`).join('')}</div>`;

/** 만남 장면의 조작 부분(사유의 1인칭 화면 아래에 들어간다) */
export function view(opts = {}) {
  const t = tr(), m = M();
  compact = !!opts.compact;
  return `
    ${compact ? '' : `<p class="reach-lead">${esc(m.reachLead)}</p>`}
    <div class="reach" id="reach" data-x="0" data-zone="far" data-lo="${gapLo()}" style="--x:0;--lo:${gapLo()};--hi:${REACH_TOUCH};--held:0">
      <div class="reach-track" ${compact ? 'aria-hidden="true"' : `role="img" aria-label="${esc(m.padLabel)}"`}>
        <span class="reach-gap" aria-hidden="true"></span>
        <span class="reach-touch" aria-hidden="true"></span>
        <span class="reach-hand me" aria-hidden="true">✋</span>
        <span class="reach-hand her" aria-hidden="true">✋</span>
      </div>
      <div class="reach-held" aria-hidden="true"><i></i></div>
    </div>
    ${dots(t.breaths)}
    <button class="hold-btn reach-btn" id="reachBtn" type="button" data-key="reachBtn"><span>${esc(t.tapMode ? m.tapStart : m.press)}</span></button>
    <p class="hold-status" id="reachStatus" role="status">${compact ? esc(m.zones.far) : ''}</p>
    ${compact ? '' : `<div class="reach-opts">
      <label class="hold-mode"><input type="checkbox" id="tapMode" data-key="tapMode" ${t.tapMode ? 'checked' : ''}> ${esc(m.tapLabel)}</label>
      <label class="hold-mode"><input type="checkbox" id="reachSlow" data-key="reachSlow" ${t.reach.slow ? 'checked' : ''}> ${esc(m.slow)}</label>
    </div>`}`;
}

function paint(zone) {
  const el = $('#reach');
  if (!el || !r) return;
  el.style.setProperty('--x', r.x.toFixed(3));
  el.style.setProperty('--held', (r.held / REACH_HOLD_MS).toFixed(3));
  el.dataset.x = r.x.toFixed(3);
  el.dataset.zone = zone;
  if (zone !== lastZone) {
    lastZone = zone;
    $('#reachStatus').textContent = M().zones[zone];
  }
}

function tick() {
  const now = performance.now(), dt = Math.min(200, now - last);
  last = now;
  const t = tr();
  const out = reachStep(r, { pressed, dt, round: t.breaths, slow: t.reach.slow });
  r = out.r;
  sense.reachSet(r.x);
  if (out.zone === 'gap' && now - lastPulse > 500) { lastPulse = now; sense.reachPulse(); }
  if (listen() && out.zone === 'gap' && now - lastShimmer > 220) { lastShimmer = now; sense.reachShimmer(); }
  const held = r.held / REACH_HOLD_MS;
  if (held < 0.25) heldMark = 0;
  else if (out.zone === 'gap' && lastZone === 'gap' && !out.event && !heldMark && held >= 0.5) {
    heldMark = 1;   // 절반에서 한 번만 글로(더 잦으면 낭독기가 회차가 끝난 뒤에 읽는다). 나머지는 떨림 소리로
    $('#reachStatus').textContent = M().heldHalf;
  }
  if (out.event === 'touch') {
    heldMark = 0;
    t.reach.touches++;
    log('meet_reach_touch', { round: t.breaths, touches: t.reach.touches });
    save();
    sense.reachTouch();
    lastZone = '';
    paint('touch');
    return;
  }
  if (out.event === 'round') {
    heldMark = 0;
    sense.converge(t.breaths);   // 회차마다 두 소리가 가운데로 모이고, 마지막에 화음이 된다
    t.breaths++;
    log('meet_reach_round', { round: t.breaths, touches: t.reach.touches });
    if (t.breaths >= REACH_ROUNDS) {
      leave();
      sense.nearTouch();
      t.meetStep = 2;
      save();
      hooks.render();
      return;
    }
    save();
    const el = $('#reach');
    el.style.setProperty('--lo', gapLo());
    el.dataset.lo = gapLo();
    el.nextElementSibling.outerHTML = dots(t.breaths);
    lastZone = '';
    paint('far');
    $('#reachStatus').textContent = compact ? `${M().round} ${t.breaths}/${REACH_ROUNDS}` : M().round;   // v2: 회차 점을 낭독기에서 뺐으므로 글에 횟수를
    return;
  }
  paint(out.zone);
}

export function bind() {
  leave();
  const t = tr(), btn = $('#reachBtn');
  r = freshReach();
  pressed = false;
  last = performance.now();
  const down = () => { pressed = true; btn.classList.add('pressing'); if (listen()) btn.setAttribute('aria-pressed', 'true'); };
  const up = () => { pressed = false; btn.classList.remove('pressing'); if (listen()) btn.setAttribute('aria-pressed', 'false'); };
  if (listen()) btn.setAttribute('aria-pressed', 'false');   // 켜고 끄기 단추라는 것과 지금 상태를 낭독기가 읽는다
  btn.addEventListener('pointerdown', e => {
    if (t.tapMode || e.button) return;
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch { /* 이미 끝난 포인터 */ }
    down();
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, () => { if (!t.tapMode) up(); });
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('click', () => { if (t.tapMode) (pressed ? up : down)(); });
  // 키보드: Space를 누르고 있으면 다가간다(단추에 포커스가 없어도 듣는다)
  onKey = e => {
    if (e.code !== 'Space' || e.target?.matches?.('input, textarea')) return;
    e.preventDefault();
    if (t.tapMode) { if (e.type === 'keydown' && !e.repeat) (pressed ? up : down)(); return; }
    if (e.type === 'keydown') down(); else up();
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  onBlur = () => { if (!t.tapMode) up(); };
  window.addEventListener('blur', onBlur);
  if ($('#tapMode')) $('#tapMode').onchange = e => {
    t.tapMode = e.target.checked; save();
    up();   // 방식을 바꾸면 손을 놓는다(켜 둔 채 누르고 있기로 바뀌면 손이 저절로 다가가지 않게)
    btn.querySelector('span').textContent = t.tapMode ? M().tapStart : M().press;
  };
  if ($('#reachSlow')) $('#reachSlow').onchange = e => { t.reach.slow = e.target.checked; save(); };
  sense.reachStart();
  paint('far');
  timer = setInterval(tick, TICK);
  if (!listen()) requestAnimationFrame(() => requestAnimationFrame(() => btn.focus({ preventScroll: true })));
}
