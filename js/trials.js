// 「사유자의 시련」 전용 장면. 장면마다 view()/bind() 한 쌍을 views, binds에 등록한다.
import { $, $$, esc, state, data, log, announce, save, sfx, shake, speak, speakRival, speakGuide, hooks, allArtifactIds, asset } from './core.js';
import { povStage } from './story.js';
import * as sense from './sense.js';
import * as myth from './myth.js';
import * as scylla from './scylla.js';
import * as reach from './reach.js';
import * as ending from './ending.js';
import { filmHTML, bindFilm } from './film.js';
import {
  TRIAL_ORDER, AFTER_VERDICT, GRID,
  trialDone, trialOpen, nearness, underworldTarget, beatsAt, bodyRecord, fill, galleryReady, ensureTrials
} from './trials-rules.js';

const T = () => data.trials;
const total = () => allArtifactIds().length;
const SAYU = asset('assets/character/sayu-reference-web.png');
const RIVAL = asset('Tae.png');
const GUIDE = asset('assets/character/halabeoji.webp');

export const views = {};
export const binds = {};
export const MUSIC = {
  trialIntro: 'trialIntro', hub: 'trialDig', dig: 'trialDig', study: 'trialSea', reconstruct: 'trialCave',
  cast: 'cast', verdict: 'rivalIntro', scylla: 'trialSea', underworld: 'trialDeep', galIntro: 'trialDeep', offer: 'rivalIntro',
  meet: 'talk', result: 'complete', ending: 'garden', garden: 'garden', talk: 'talk', complete: 'complete'
};
export const STEPS = ['start', 'pretest', 'first', 'second', 'meet', 'end'];
export const LABELS = { start: '출발', pretest: '사전 질문', first: '네 시련', second: '두 시련', meet: '만남', end: '귀환' };
export const NO_HUD = ['trialIntro', 'verdict', 'scylla', 'underworld', 'offer', 'meet', 'result', 'ending', 'garden', 'talk'];

export function stepIndex() {
  const s = state.scene;
  if (s === 'trialIntro') return 0;
  if (s === 'pretest') return 1;
  if (s === 'meet' || s === 'result' || s === 'ending' || s === 'garden' || s === 'talk') return 4;
  if (s === 'complete') return 5;
  if (s === 'scylla' || s === 'underworld' || s === 'offer') return 3;
  return state.trials.verdictSeen ? 3 : 2;
}

let leaveHook = null;
/** 장면을 떠날 때 타이머를 모두 멈춘다 */
export function leave() { if (leaveHook) { leaveHook(); leaveHook = null; } myth.leave(); scylla.leave(); reach.leave(); ending.leave(); }

export function isPov() {
  const t = state.trials;
  if (state.scene === 'trialIntro') return POV_STEPS.includes(t.introStep);
  if (state.scene === 'verdict') return true;
  if (state.scene === 'offer') return t.offerStep !== 2;
  if (state.scene === 'meet') return t.meetStep !== 3;
  return false;
}

export function objective() {
  const cur = TRIAL_ORDER.find(id => !trialDone(state, id, total()));
  if (cur === 'underworld' && trialOpen(state, cur, total()) && !galleryReady(state.trials)) return T().gallery.objective;
  return cur ? T().trials[cur].name : T().board.allDone;
}

/* ---------- 프롤로그: 여덟 장면 ----------
   0 밤의 정원(나는 턱을 괸 청동상) · 1 유리장의 사유 · 2 유태양 등장 · 3 도전 · 4 녹 쓸기
   5 흙손 영감 등장 · 6 시련의 까닭 · 7 목표 카드 → 사전 질문 */
export const PROLOGUE_LAST = 7;
const POV_STEPS = [2, 3, 5, 6];
const skipBtn = () => `<button class="btn secondary" id="introSkip">${esc(T().prologue.skip)}</button>`;

function rustView() {
  const P = T().prologue;
  return `
    <section class="trials-stage">
      <header class="scene-head"><div class="eyebrow">${esc(P.sceneLabel)}</div><h1>${esc(P.rustTitle)}</h1><p>${esc(P.rustHint)}</p></header>
      <div class="rust-grid" role="group" aria-label="${esc(P.rustTitle)}">
        ${Array.from({ length: 6 }, (_, i) => `<button class="rust-cell" data-rust="${i}" aria-label="녹 ${i + 1}"></button>`).join('')}
      </div>
    </section>`;
}

/** 이야기 글 장면 — 멀리 보이는 유리장(near: 가까운 정도)과 서술 */
function narrationView(near, text, button) {
  const P = T().prologue;
  return `
    <section class="trials-night prologue-beat" aria-label="${esc(P.sceneLabel)}">
      <div class="far-glass" style="--near:${near}"><img src="${SAYU}" alt="${esc(P.glassAlt)}"></div>
      <p class="trials-narration">${esc(text)}</p>
      <div class="actions"><button class="btn primary" id="introNext">${esc(button)}</button>${skipBtn()}</div>
    </section>`;
}

function goalView() {
  const P = T().prologue;
  return `
    <section class="trials-stage prologue-goal">
      <header class="scene-head"><div class="eyebrow">${esc(P.goalEyebrow)}</div><h1>${esc(P.goalTitle)}</h1></header>
      <ol class="goal-list">${P.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ol>
      <section class="hub-sayu trials-guide">
        <img src="${GUIDE}" alt="${esc(P.guideAlt)}">
        <div><span class="fiction-label">창작 캐릭터 대사</span><b>${esc(T().board.guideName)}</b><p class="fiction">“${esc(P.guide)}”</p></div>
      </section>
      <p class="pov-hint">${esc(P.thought)}</p>
      <div class="actions"><button class="btn primary" id="introNext">${esc(P.guideButton)}</button></div>
    </section>`;
}

/** 상황 설명 영상: 프롤로그 첫 장면 앞에서 한 번(건너뛸 수 있음) */
const filmFirst = () => !!T().prologue.film && state.trials.introStep === 0 && !state.trials.filmSeen;
function filmView() {
  const F = T().prologue.film;
  return `
    <section class="trials-stage prologue-film">
      <header class="scene-head"><div class="eyebrow">${esc(F.eyebrow)}</div><h1>${esc(F.title)}</h1><p>${esc(F.note)}</p></header>
      ${filmHTML(F)}
      <div class="actions"><button class="btn secondary" id="filmSkip">${esc(F.skip)}</button></div>
    </section>`;
}

function trialIntroView() {
  const P = T().prologue, s = state.trials.introStep;
  if (filmFirst()) return filmView();
  const rival = (line, hint, button) => povStage({
    name: '유태양', img: RIVAL, alt: P.rivalAlt, line, cls: 'rival-pov', alert: P.rivalAlert,
    controls: `<p class="pov-hint">${esc(hint)}</p><button class="btn danger pov-continue" id="introNext">${esc(button)}</button>${skipBtn()}`
  });
  const guide = (line, button) => povStage({
    name: '흙손 영감', img: GUIDE, alt: P.guideAlt, line,
    controls: `<button class="btn primary pov-continue" id="introNext">${esc(button)}</button>${skipBtn()}`
  });
  switch (s) {
    case 0: return narrationView(0.1, P.opening, P.openButton);
    case 1: return narrationView(0.45, P.glass, P.glassButton);
    case 2: return rival(P.rivalArrive, P.arrive, P.rivalArriveButton);
    case 3: return rival(P.rival, P.challenge, P.rivalButton);
    case 4: return rustView();
    case 5: return guide(P.guideIntro, P.guideIntroButton);
    case 6: return guide(P.guidePurpose, P.guidePurposeButton);
    default: return goalView();
  }
}

function rustBind() {
  const grid = $('.rust-grid');
  const left = () => $$('[data-rust]:not(.clean)').length;
  const scrape = el => {
    if (!el || el.classList.contains('clean')) return;
    el.classList.add('clean');
    el.disabled = true;
    sense.grit();
    log('rust_scrape', { left: left() });
    announce(fill(T().prologue.rustLeft, { n: left() }));
    if (!left()) {
      state.trials.introStep = 5;
      save();
      setTimeout(() => hooks.render(), 260);
    }
  };
  $$('[data-rust]').forEach(b => { b.onclick = () => scrape(b); });
  let down = false;
  grid.addEventListener('pointerdown', () => { down = true; });
  grid.addEventListener('pointermove', e => {
    if (!down && e.pointerType === 'mouse') return;
    scrape(document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-rust]'));
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) grid.addEventListener(ev, () => { down = false; });
}

function trialIntroBind() {
  const s = state.trials.introStep, P = T().prologue;
  if (filmFirst()) {
    bindFilm(P.film, () => { state.trials.filmSeen = true; save(); hooks.render(); }, { autoplay: true });
    return;
  }
  if (s === 2) { sfx('rival'); speakRival(P.rivalArrive); }
  if (s === 3) speakRival(P.rival);
  if (s === 4) { rustBind(); return; }
  if (s === 5) speakGuide(P.guideIntro);
  if (s === 6) speakGuide(P.guidePurpose);
  if (s >= PROLOGUE_LAST) speakGuide(P.guide);
  $('#introNext')?.addEventListener('click', () => {
    if (s >= PROLOGUE_LAST) { log('trial_prologue_done'); hooks.go('pretest'); return; }
    state.trials.introStep = s + 1;
    save();
    hooks.render();
  });
  $('#introSkip')?.addEventListener('click', () => {
    log('trial_prologue_skip', { from: s });
    state.trials.introStep = PROLOGUE_LAST;
    save();
    hooks.render();
  });
}

Object.assign(views, { trialIntro: trialIntroView });
Object.assign(binds, { trialIntro: trialIntroBind });

/* ---------- 시련판 ---------- */
function card(id) {
  const t = T().trials[id], B = T().board;
  const done = trialDone(state, id, total()), open = trialOpen(state, id, total());
  // 저승 앞: 흙손 영감이 먼저 청동 전시실로 데려간다
  const prep = id === 'underworld' && open && !done && !galleryReady(state.trials);
  return `<button class="hub-card voyage-stop ${done ? 'done' : ''} ${open ? '' : 'locked'}" data-trial="${id}" ${open ? '' : 'disabled'}>
    <span class="hub-icon" aria-hidden="true">${t.icon}</span>
    <span class="hub-body">
      <span class="voyage-place">${TRIAL_ORDER.indexOf(id) + 1} · ${esc(t.stop)}</span>
      <b>${esc(t.name)}</b>
      <small>${esc(B.rivalPrefix)}: “${esc(t.rival)}”</small>
      <span class="hub-status">${esc(done ? B.statusDone : prep ? T().gallery.boardStatus : open ? t.place : B.statusLocked)}</span>
    </span>
  </button>`;
}

/** 목표 띠: 왜 시련을 하는가, 지금까지 몸에 새긴 사유의 흔적 */
function goalStrip(shown) {
  const B = T().board, done = shown.filter(id => trialDone(state, id, total()));
  const marks = done.map(id => { const it = T().record.items[id]; return `<li><b>${esc(it.scar)}</b><small>${esc(it.mirror)}</small></li>`; }).join('');
  return `
    <section class="trials-goal" aria-label="${esc(B.goalTitle)}">
      <div class="goal-why"><span class="eyebrow">${esc(B.goalTitle)}</span><p>${esc(B.goal)}</p></div>
      <div class="goal-marks"><b>${esc(fill(B.marks, { n: done.length, total: shown.length }))}</b>
        ${done.length ? `<ul>${marks}</ul>` : `<p class="muted">${esc(B.marksNone)}</p>`}</div>
    </section>`;
}

/** 시련을 마치고 돌아오면 그 시련이 남긴 흔적과 사유의 같은 자리 흠을 보여 준다 */
function markHTML(id) {
  const it = T().record.items[id], B = T().board;
  return `
    <div class="mark-new">
      <div class="eyebrow">${esc(B.markEyebrow)} · ${esc(T().trials[id].stop)}</div>
      <h2>${esc(it.scar)}</h2>
      <p class="mark-mirror">${esc(it.mirror)}</p>
      <p>${esc(B.markLine)}</p>
    </div>`;
}

export function boardView() {
  const B = T().board;
  const shown = TRIAL_ORDER.filter(id => !AFTER_VERDICT.includes(id) || state.trials.verdictSeen);
  const cur = TRIAL_ORDER.find(id => !trialDone(state, id, total()));
  return `
    <header class="scene-head"><div class="eyebrow">${esc(B.eyebrow)}</div><h1>${esc(B.title)}</h1><p>${esc(B.lead)}</p></header>
    ${goalStrip(shown)}
    <section class="hub-sayu trials-guide">
      <img src="${GUIDE}" alt="${esc(B.guideAlt)}">
      <div><span class="fiction-label">창작 캐릭터 대사</span><b>${esc(B.guideName)}</b><p class="fiction">“${esc(cur ? T().trials[cur].bridge || T().trials[cur].guide : B.doneLine)}”</p></div>
      <div class="far-glass" style="--near:${nearness(state, total()).toFixed(2)}"><img src="${SAYU}" alt="${esc(B.glassAlt)}"></div>
    </section>
    <div class="hub-grid voyage-map" role="list" aria-label="${esc(B.voyage || '항해 지도')}">${shown.map(card).join('')}</div>`;
}

export function boardBind() {
  // 새 정박지가 열리면 흙손 영감이 한 번 소개한다(녹음이 있을 때만 소리)
  const t = ensureTrials(state.trials), cur = TRIAL_ORDER.find(id => !trialDone(state, id, total()));
  const bridge = cur && T().trials[cur].bridge;
  if (bridge && !t.bridged[cur]) { t.bridged[cur] = true; save(); speakGuide(bridge); }
  // 새로 마친 시련이 있으면 그 흔적을 보여 준다(여럿이면 가장 늦은 것 하나만)
  const fresh = TRIAL_ORDER.filter(id => trialDone(state, id, total()) && !t.marked[id]);
  if (fresh.length) {
    fresh.forEach(id => { t.marked[id] = true; });
    save();
    const id = fresh[fresh.length - 1];
    log('trial_mark', { trial: id });
    hooks.modal(markHTML(id));
  }
  $$('[data-trial]').forEach(b => b.onclick = () => {
    const id = b.dataset.trial;
    log('trial_enter', { trial: id });
    if (id !== 'underworld') speakRival(T().trials[id].rival);   // 저승 대사는 저승에 들어설 때(전시실을 거친 뒤) 말한다
    hooks.go(id);
  });
}

/* ---------- 무효 선언 ---------- */
const verdictLine = () => (state.cast?.grade === 'A' ? T().verdict.gradeA : T().verdict.gradeB);

function verdictView() {
  const V = T().verdict;
  return povStage({
    name: '유태양', img: RIVAL, alt: V.alt, line: verdictLine(), cls: 'rival-pov', alert: V.alert,
    controls: `<button class="btn danger pov-continue" id="verdictNext">${esc(V.button)}</button>`
  });
}

function verdictBind() {
  sfx('rival');
  sense.wallHit();
  speakRival(verdictLine());
  $('#verdictNext').onclick = () => {
    state.trials.verdictSeen = true;
    log('trial_verdict', { grade: state.cast?.grade });
    save();
    hooks.go('hub');
  };
}

Object.assign(views, { verdict: verdictView });
Object.assign(binds, { verdict: verdictBind });

/* ---------- 시련 5: 스킬라와 카립디스 (js/scylla.js) ---------- */
const roundDots = (done, n) => `<div class="hold-rounds" role="img" aria-label="${done}/${n}">${Array.from({ length: n }, (_, i) => `<span class="${i < done ? 'on' : ''}"></span>`).join('')}</div>`;

Object.assign(views, { scylla: scylla.view });
Object.assign(binds, { scylla: scylla.bind });

/* ---------- 시련 6: 저승 ---------- */
const underTarget = () => { const u = state.trials.underworld; return underworldTarget(state.startedAt, u.round, u.moved); };
/** 진동만으로는 가장 가까운 칸을 가려내기 어려워, 소리가 꺼져 있으면 화면 표시를 켠다 */
const underForced = () => !state.sfx;

function underworldView() {
  const U = T().underworld, u = state.trials.underworld, forced = underForced();
  const cells = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    cells.push(`<button class="under-cell" data-under="${r}-${c}" aria-label="${r + 1}행 ${c + 1}열" tabindex="${r === 0 && c === 0 ? 0 : -1}"></button>`);
  }
  return `
    <section class="trials-stage under-stage ${u.assist || forced ? 'assist' : ''}">
      <header class="scene-head"><div class="eyebrow">${esc(U.eyebrow)} · ${esc(U.heads[Math.min(u.round, 2)])}</div><h1>${esc(U.title)}</h1><p>${esc(U.lead)}</p></header>
      <p class="dig-coach"><span class="fiction-label">흙손 영감</span>${esc(T().trials.underworld.guide)}</p>
      <div class="gal-howto" role="note"><b>하는 법</b><p>${esc(U.howto)}</p><p class="gal-why">${esc(U.why)}</p></div>
      ${roundDots(u.round, 3)}
      <div class="under-grid" role="group" aria-label="${esc(U.gridLabel)}">${cells.join('')}</div>
      <div id="underPulse" class="under-pulse" aria-hidden="true"></div>
      <p class="hold-status" id="underStatus" role="status"></p>
      <div class="actions">
        <label class="hold-mode"><input type="checkbox" id="underAssist" ${u.assist || forced ? 'checked' : ''} ${forced ? 'disabled' : ''}> ${esc(U.assistLabel)}</label>
        <button class="btn secondary" id="backHub">${esc(T().board.back)}</button>
      </div>
    </section>`;
}

function underworldBind() {
  const U = T().underworld, u = state.trials.underworld, grid = $('.under-grid');
  if (!u.rivalSaid) { u.rivalSaid = true; save(); speakRival(T().trials.underworld.rival); }
  const at = el => el.dataset.under.split('-').map(Number);
  const cue = el => {
    const [row, col] = at(el), beats = beatsAt({ row, col }, underTarget());
    sense.spot({ row, col, rows: GRID, cols: GRID, beats });
    const pulse = $('#underPulse');
    pulse.dataset.beats = String(beats);
    pulse.textContent = U.levels[beats];
    if ($('.under-stage').classList.contains('assist')) announce(`${row + 1}행 ${col + 1}열, ${U.levels[beats]}`);
  };
  const pick = el => {
    const [row, col] = at(el), t = underTarget();
    if (row === t.row && col === t.col) {
      u.round++;
      log('underworld_found', { round: u.round });
      sfx('found');
      save();
      if (u.round >= 3) { hooks.go('hub'); return; }
      hooks.render();
      $('#underStatus').textContent = U.found;
      $('[data-under="0-0"]')?.focus({ preventScroll: true });
      return;
    }
    u.misses++;
    u.sinceMove++;
    log('underworld_miss', { round: u.round, misses: u.misses });
    sense.wallHit();
    shake();
    let msg = U.miss;
    if (u.sinceMove >= 3) { u.sinceMove = 0; u.moved++; msg = U.moved; }
    $('#underStatus').textContent = msg;
    announce(msg);
    save();
  };

  let suppress = false, down = false, last = null;
  grid.addEventListener('pointerdown', () => { down = true; suppress = false; last = null; });
  grid.addEventListener('pointermove', e => {
    if (!down && e.pointerType !== 'mouse') return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-under]');
    if (!el || el === last) return;
    if (down && last) suppress = true;
    last = el;
    cue(el);
  });
  for (const ev of ['pointerup', 'pointercancel']) grid.addEventListener(ev, () => { down = false; });

  $$('[data-under]').forEach(b => {
    b.onclick = () => { if (suppress) { suppress = false; return; } pick(b); };
    b.onfocus = () => cue(b);
    b.onkeydown = e => {
      const map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (!map[e.key]) return;
      e.preventDefault();
      const [r, c] = at(b), nr = r + map[e.key][0], nc = c + map[e.key][1];
      $(`[data-under="${nr}-${nc}"]`)?.focus();
    };
  });
  $('#underAssist').onchange = e => { u.assist = e.target.checked; save(); hooks.render(); };
  $('#backHub').onclick = () => hooks.go('hub');
  // 키보드: 들어오자마자 첫 칸에서 시작하고, 포커스가 칸 밖에 있어도 방향키를 누르면 칸으로 돌아온다
  // 장면에 들어올 때 앱이 다음 프레임에 장면 전체로 포커스를 옮기므로, 그 뒤에 칸으로 가져온다
  requestAnimationFrame(() => requestAnimationFrame(() => { if (state.scene === 'underworld' && !grid.contains(document.activeElement)) $('[data-under="2-2"]')?.focus({ preventScroll: true }); }));
  leave();
  const onKey = e => {
    if (!/^Arrow/.test(e.key) || e.target.closest?.('.under-grid, input')) return;
    e.preventDefault();
    $('[data-under="2-2"]')?.focus({ preventScroll: true });
  };
  window.addEventListener('keydown', onKey);
  leaveHook = () => window.removeEventListener('keydown', onKey);
}

Object.assign(views, { underworld: underworldView });
Object.assign(binds, { underworld: underworldBind });

/* ---------- 마지막 제안 ---------- */
function offerView() {
  const O = T().offer, s = state.trials.offerStep;
  if (s === 2) {
    return `
      <section class="trials-night">
        <div class="far-glass" style="--near:.5"><img src="${SAYU}" alt="${esc(O.glassAlt)}"></div>
        <p class="trials-narration">${esc(O.erased)}</p>
        <div class="actions"><button class="btn primary" id="offerBack">${esc(O.back)}</button></div>
      </section>`;
  }
  if (s === 0) {
    return povStage({
      name: '유태양', img: RIVAL, alt: O.alt, line: O.first, cls: 'rival-pov',
      controls: `<p class="pov-hint">${esc(O.thought)}</p><button class="btn danger pov-continue" id="offerNext">${esc(O.firstButton)}</button>`
    });
  }
  return povStage({
    name: '유태양', img: RIVAL, alt: O.alt, line: O.answer, cls: 'rival-pov',
    controls: `<div class="pov-choices"><button class="choice" id="offerErase">${esc(O.erase)}</button><button class="choice" id="offerKeep">${esc(O.keep)}</button></div>`
  });
}

function offerBind() {
  const O = T().offer, t = state.trials;
  if (t.offerStep === 0) {
    speakRival(O.first);
    $('#offerNext').onclick = () => { t.offerStep = 1; save(); hooks.render(); };
  } else if (t.offerStep === 1) {
    speakRival(O.answer);
    $('#offerErase').onclick = () => { t.offerStep = 2; t.offerErased++; log('offer_erase', { times: t.offerErased }); save(); hooks.render(); };
    $('#offerKeep').onclick = () => { t.offerDone = true; log('offer_refused'); save(); hooks.go('meet'); };
  } else {
    $('#offerBack').onclick = () => { t.offerStep = 1; save(); hooks.render(); };
  }
}

/* ---------- 만남 ---------- */
function recordView() {
  const R = T().record, rec = bodyRecord(state);
  return `
    <section class="trials-stage">
      <header class="scene-head"><div class="eyebrow">${esc(R.eyebrow)}</div><h1>${esc(R.title)}</h1></header>
      <div class="record-list">${TRIAL_ORDER.map(id => {
        const it = R.items[id];
        return `<div class="record-row"><b>${esc(it.scar)}</b><span>${esc(it.mirror)}</span><small>${esc(fill(it.count, rec[id]))}</small></div>`;
      }).join('')}</div>
      <div class="actions"><button class="btn primary" id="meetNext">${esc(R.next)}</button></div>
    </section>`;
}

function meetView() {
  const M = T().meet, t = state.trials, s = t.meetStep;
  const sayu = (line, controls) => povStage({ name: '사유', img: SAYU, alt: M.alt, line, chapter: M.chapter, controls });
  if (s === 0) return sayu(M.first, `<button class="btn primary pov-continue" id="meetNext">${esc(M.reach)}</button>`);
  if (s === 1) return sayu(M.first, `${reach.view()}${M.credit ? `<p class="eyebrow reach-credit">적용한 작품 · ${esc(M.credit)}</p>` : ''}`);   // 닿을 듯 멈추기(js/reach.js)
  if (s === 2) return sayu(M.gap, `<button class="btn primary pov-continue" id="meetNext">${esc(M.next)}</button>`);
  if (s === 3) return recordView();
  return povStage({
    name: '유태양', img: RIVAL, alt: M.rivalAlt, line: M.rivalExit, cls: 'rival-pov',
    controls: `<button class="btn primary pov-continue" id="meetNext">${esc(M.exitButton)}</button>`
  });
}

function meetBind() {
  const M = T().meet, t = state.trials;
  if (!t.met) { t.met = true; log('trial_met', { erased: t.offerErased }); save(); }
  const s = t.meetStep;
  if (s === 0) speak(M.first);
  if (s === 2) speak(M.gap);
  if (s === 4) speakRival(M.rivalExit);
  if (s === 1) {
    leave();
    reach.bind();
    leaveHook = reach.leave;
    return;
  }
  $('#meetNext').onclick = () => {
    if (s >= 4) { t.meetDone = true; log('trial_meet_done'); ending.finish('original'); hooks.go('result'); return; }   // 점수 확인 → 엔딩 → 정원
    t.meetStep = s + 1;
    save();
    hooks.render();
  };
}

/* ---------- 벚꽃 정원 ---------- */
function gardenView() {
  const G = T().garden;
  const petals = Array.from({ length: 14 }, (_, i) => `<i class="petal" style="--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%;--d:${5 + ((i * 13) % 6)}s;--s:-${(i * 29) % 5}s"></i>`).join('');
  return `
    <section class="garden-stage">
      <div class="garden-petals" aria-hidden="true">${petals}</div>
      <img class="garden-sayu" src="${SAYU}" alt="${esc(G.alt)}">
      <div class="garden-bottom">
        <div class="eyebrow">${esc(G.eyebrow)}</div>
        <span class="fiction-label">창작 캐릭터 대사</span>
        <p class="fiction garden-line" aria-live="polite">“${esc(G.line)}”</p>
        <div class="actions">
          <button class="btn secondary" id="toTalk">${esc(G.stories)}</button>
          <button class="btn primary" id="toPost">${esc(G.post)}</button>
          <button class="btn secondary" id="toGallery">🔔 청동 전시실 (11주차)</button>
          <button class="btn secondary" id="toResult">${esc(data.score.text.replayResult)}</button>
        </div>
      </div>
    </section>`;
}

function gardenBind() {
  speak(T().garden.line);
  leave();
  let beats = 0;
  sense.gardenBeat();
  const timer = setInterval(() => {
    if (++beats >= 40) { clearInterval(timer); return; }
    sense.gardenBeat();
  }, 1000);
  leaveHook = () => clearInterval(timer);
  $('#toTalk').onclick = () => { state.activeTalk = null; state.talkFeedback = null; hooks.go('talk'); };
  $('#toPost').onclick = () => hooks.go('complete');
  $('#toGallery').onclick = () => hooks.go('gallery');   // 시련을 마친 사유자가 사유의 조각을 손과 귀로 만나러 간다
  $('#toResult').onclick = () => hooks.go('result');
}

Object.assign(views, { offer: offerView, meet: meetView, garden: gardenView, ...ending.views });
Object.assign(binds, { offer: offerBind, meet: meetBind, garden: gardenBind, ...ending.binds });
