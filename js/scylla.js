// 시련 5 · 스킬라와 카립디스(2026-11-11). 물살에 밀리는 배를 가운데로 몰아 좁은 물목 셋을 지난다.
// 왼쪽 기슭은 머리 여섯 괴물 스킬라(노 하나를 앗아 감), 오른쪽은 소용돌이 카립디스(그 물목 처음으로).
// 계산은 trials-rules.js(scyllaStep · currentAt · scyllaSide)에 두고, 여기서는 화면 · 입력 · 소리 · 진동만 다룬다.
import { $, $$, esc, state, data, log, announce, save, sfx, shake, hooks, asset, speakGuide } from './core.js';
import * as sense from './sense.js';
import { NARROWS, NARROW_MS, OARS, scyllaStep, scyllaSide, fill, ensureTrials } from './trials-rules.js';

const T = () => data.trials;
const U = () => T().scyllaUI;
const sc = () => ensureTrials(state.trials).scylla;
const TICK = 50;

let timer = 0, run = null, pad = 0, pausedUntil = 0, lastSide = 'center', lastBuzz = 0, onKey = null;
const keys = { left: false, right: false };

/** 장면을 떠날 때: 항해를 멈추고 소리를 끈다(물목 안의 진행은 저장하지 않아 다시 오면 그 물목 처음부터) */
export function leave() {
  clearInterval(timer);
  timer = 0; run = null; pad = 0; keys.left = keys.right = false; lastSide = 'center';
  if (onKey) { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); onKey = null; }
  sense.straitStop();
}

const sailing = () => run !== null;
const narrowText = s => fill(U().narrow, { n: Math.min(s.narrow + 1, NARROWS), total: NARROWS });
const oarsHTML = s => `<span class="oars" role="img" aria-label="${esc(fill(U().oars, { n: s.oars, total: OARS }))}">${
  Array.from({ length: OARS }, (_, i) => `<i class="${i < s.oars ? 'on' : ''}"></i>`).join('')}</span>`;
const narrowDots = s => `<span class="narrow-dots" aria-hidden="true">${Array.from({ length: NARROWS }, (_, i) => `<i class="${i < s.narrow ? 'on' : ''}"></i>`).join('')}</span>`;

function doneView() {
  return `
    <section class="trials-stage scylla-stage">
      <header class="scene-head"><div class="eyebrow">${esc(U().eyebrow)}</div><h1>${esc(U().doneTitle)}</h1></header>
      <section class="hub-sayu trials-guide">
        <img src="${asset('assets/character/halabeoji.webp')}" alt="${esc(T().board.guideAlt)}">
        <div><span class="fiction-label">창작 캐릭터 대사</span><b>${esc(T().board.guideName)}</b><p class="fiction">“${esc(U().lesson)}”</p></div>
      </section>
      <div class="actions"><button class="btn primary" id="straitDone">${esc(U().doneButton)}</button></div>
    </section>`;
}

export function view() {
  const s = sc();
  if (s.narrow >= NARROWS) return doneView();
  return `
    <section class="trials-stage scylla-stage">
      <header class="scene-head"><div class="eyebrow">${esc(U().eyebrow)} · <span id="straitNarrow">${esc(narrowText(s))}</span></div><h1>${esc(U().title)}</h1><p>${esc(U().lead)}</p></header>
      <p class="dig-coach"><span class="fiction-label">흙손 영감</span>${esc(T().trials.scylla.guide)}</p>
      <div class="strait-meta" id="straitMeta">${narrowDots(s)}${oarsHTML(s)}</div>
      <div class="strait" id="strait" data-side="center" style="--x:0;--dl:0;--dr:0">
        <div class="strait-bank left" role="img" aria-label="${esc(U().scyllaAlt)}"><span aria-hidden="true">🐍🐍🐍</span></div>
        <div class="strait-water" id="straitPad" role="application" tabindex="0" aria-label="${esc(U().padLabel)}">
          <i class="strait-mid" aria-hidden="true"></i>
          <span class="strait-ship" aria-hidden="true">⛵</span>
        </div>
        <div class="strait-bank right" role="img" aria-label="${esc(U().charybdisAlt)}"><span class="whirl" aria-hidden="true">🌀</span></div>
      </div>
      <div class="strait-time" aria-hidden="true"><i id="straitTime"></i></div>
      <div class="strait-controls">
        <button type="button" class="btn secondary steer" data-steer="-1">${esc(U().left)}</button>
        <button type="button" class="btn primary" id="straitStart">${esc(U().start)}</button>
        <button type="button" class="btn secondary steer" data-steer="1">${esc(U().right)}</button>
      </div>
      <p class="hold-status" id="straitStatus" role="status"></p>
      <div class="actions">
        <label class="hold-mode"><input type="checkbox" id="straitSlow" ${s.slow ? 'checked' : ''}> ${esc(U().slow)}</label>
        <button class="btn secondary" id="backHub">${esc(T().board.back)}</button>
      </div>
    </section>`;
}

function status(msg, speakIt = true) {
  const el = $('#straitStatus');
  if (el) el.textContent = msg;
  if (speakIt) announce(msg);
}

function paint() {
  const s = sc(), box = $('#strait');
  if (!box || !run) return;
  const { side, danger } = scyllaSide(run.x);
  box.style.setProperty('--x', run.x.toFixed(3));
  box.style.setProperty('--dl', side === 'left' ? danger.toFixed(2) : '0');
  box.style.setProperty('--dr', side === 'right' ? danger.toFixed(2) : '0');
  box.dataset.side = side;
  box.dataset.x = run.x.toFixed(3);   // 자동 시험이 배의 자리를 읽는다
  const bar = $('#straitTime');
  if (bar) bar.style.width = `${Math.min(100, run.elapsed / NARROW_MS[Math.min(s.narrow, NARROWS - 1)] * 100).toFixed(1)}%`;
  const meta = $('#straitMeta');
  if (meta) meta.innerHTML = narrowDots(s) + oarsHTML(s);
  const n = $('#straitNarrow');
  if (n) n.textContent = narrowText(s);
}

function tick() {
  if (!run) return;
  const now = performance.now();
  if (now < pausedUntil) return;
  const rudder = keys.left || keys.right ? (keys.right ? 1 : 0) - (keys.left ? 1 : 0) : pad;
  const r = scyllaStep(sc(), run, { rudder, dt: TICK, seed: state.startedAt || 1 });
  state.trials.scylla = r.s;
  run = r.run;
  const { side, danger } = scyllaSide(run.x);
  sense.straitSet(run.x);
  // 가장자리에 가까울수록 진동이 촘촘해진다(왼쪽은 짧고 날카롭게, 오른쪽은 길고 둔하게)
  if (danger > 0 && now - lastBuzz > 650 - 450 * danger) { lastBuzz = now; sense.straitBuzz(side, danger); }
  if (side !== lastSide && !r.event) { lastSide = side; status(U().sides[side], side !== 'center'); }
  paint();
  if (!r.event) return;
  lastSide = 'center';
  if (r.event === 'scylla') {
    log('scylla_bite', { narrow: r.s.narrow, oars: r.s.oars, restocked: !!r.restocked });
    sense.straitBite(); shake();
    status(r.restocked ? U().restock : U().bite);
    pausedUntil = now + 700;
  } else if (r.event === 'charybdis') {
    log('scylla_swallowed', { narrow: r.s.narrow });
    sense.straitSwallow(); shake();
    status(U().swallow);
    pausedUntil = now + 900;
  } else if (r.event === 'narrow') {
    log('scylla_narrow', { narrow: r.s.narrow });
    sfx('correct');
    status(U().passed);
    pausedUntil = now + 1200;
  } else if (r.event === 'done') {
    log('scylla_done', { bites: r.s.bites, swallowed: r.s.swallowed });
    sfx('grade');
    save();
    leave();
    hooks.render();
    speakGuide(U().lesson);   // 시련을 마친 순간 한 번만 영감의 가르침(녹음이 있을 때만)
    $('#straitDone')?.focus({ preventScroll: true });
    return;
  }
  save();
  paint();
}

function start() {
  if (sailing() || sc().narrow >= NARROWS) return;
  run = { x: 0, elapsed: 0 };
  lastSide = 'center';
  log('scylla_start', { narrow: sc().narrow, slow: sc().slow });
  const b = $('#straitStart');
  if (b) b.hidden = true;
  sense.straitStart();
  clearInterval(timer);
  timer = setInterval(tick, TICK);
  paint();
  $('#straitPad')?.focus({ preventScroll: true });
}

export function bind() {
  const s = sc();
  if (s.narrow >= NARROWS) {
    $('#straitDone')?.addEventListener('click', () => hooks.go('hub'));
    return;
  }
  leave();
  // 키보드: ←→를 누르고 있는 동안 키를 꺾는다. 출항 전에는 Enter·Space나 화살표로 출항한다(포커스가 어디 있든)
  onKey = e => {
    const dir = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right' }[e.key];
    const down = e.type === 'keydown';
    if (dir) {
      e.preventDefault();
      keys[dir] = down;
      if (down && !sailing()) start();
      return;
    }
    if (down && !sailing() && (e.key === 'Enter' || e.key === ' ') && !e.target.closest?.('button, input, a, label')) { e.preventDefault(); start(); }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  // 손가락: 물 위의 왼쪽 · 오른쪽을 누르고 있으면 그만큼 키를 꺾는다
  const water = $('#straitPad');
  const fromPointer = e => {
    const r = water.getBoundingClientRect();
    pad = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 3));
  };
  water.addEventListener('pointerdown', e => { e.preventDefault(); try { water.setPointerCapture(e.pointerId); } catch {} if (!sailing()) start(); fromPointer(e); });
  water.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') fromPointer(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) water.addEventListener(ev, () => { pad = 0; });
  water.addEventListener('contextmenu', e => e.preventDefault());

  // 단추: 누르고 있는 동안 그쪽으로
  $$('[data-steer]').forEach(b => {
    const dir = Number(b.dataset.steer);
    b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch {} if (!sailing()) start(); pad = dir; });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { pad = 0; });
    b.addEventListener('contextmenu', e => e.preventDefault());
  });

  $('#straitStart').onclick = start;
  $('#straitSlow').onchange = e => { sc().slow = e.target.checked; log('scylla_slow', { on: e.target.checked }); save(); };
  $('#backHub').onclick = () => hooks.go('hub');
}
