// 시각장애인판 · 둘째 시련 「청동 전시실」(2026-11-12). 흙손 영감이 이끈다(사유는 아직 말하지 않는다).
// 1방 '울리는 조각': 고리 다섯을 두드려 크기를 소리로 듣고, 하나에 손을 얹어 데운다. 길게 누르기 대신 '손 얹기'를 켜고 끈다.
// 2방 '보이지 않는 깊이': 7×5 칸의 어둠을 방향 단추로 한 칸씩 옮기며, 오리지널 2방과 같은 '똑' 단서(방향 = 귀, 가까움 = 빠르기·높이)로 흔적 둘을 찾는다.
// 소리는 오리지널 gallery.js의 것을 그대로 빌려 쓴다.
import { $, $$, esc, state, log, save, hooks, vibrate, speakGuide, hasRecording, hush } from './core.js';
import { pluckSfx } from './music.js';
import { RINGS, ROOMS, ringVib, cue, strikeSound, stopRing, ping, chime, lowThud, stopAll, ringsHTML, mix } from './gallery.js';
import { LINES } from './gallery-lines.js';
import { fill } from './trials-rules.js';
import { TRACES, moveCell, sameCell, cellXY, nearLevel, nextTrace, warmStep, WARM_GOAL, WARM_FULL, room1Done, galTodo, DIR_ORDER } from './listen-rules.js';
import { LD, V2, IMG, text, tell, voice, bindReplay, bindHush, head, howtoPage, bindSampleCycle, skipHTML, bindSkip, cardHTML, replayHTML } from './listen.js';
// v2(2026-11-21): 한 페이지 5개 이하. 1방은 고리 다섯 × 단추 셋(15개) 대신 '다음 고리' 한 단추로 고리를 바꾸고 '두드리기' · '손 얹기'.
// 2방은 방향 단추 넷 대신 '방향 바꾸기'와 '한 칸 가기'(PC는 방향키도 그대로). 들머리와 하는 법은 따로 한 쪽씩.

const GL = () => LD().gal;
const g = () => state.listen.gal;
const ringName = id => GL().rings[id];

let warmTimer = 0, warmLast = 0, pingTimer = 0, quiet = false, keys = null;
export const pinging = () => !!pingTimer;

function stopPing() { clearTimeout(pingTimer); pingTimer = 0; }
/** 장면을 떠날 때: 손을 거두고 소리와 타이머를 모두 멈춘다 */
export function leave() {
  clearInterval(warmTimer); warmTimer = 0;
  stopPing();
  quiet = false;
  if (keys) { window.removeEventListener('keydown', keys); keys = null; }
  if (state.listen?.gal) state.listen.gal.hand = null;
  stopAll();
}

/* ---------- 화면 ---------- */
// 데운 정도는 색(그림)만이 아니라 글로도: 없음 · 반쯤 · 끝까지(WCAG 1.1.1 · 1.4.1)
const warmWord = w => (w >= WARM_FULL ? GL().room1.warmFullDone : w >= WARM_GOAL ? GL().room1.warmDone : GL().room1.warmYet);
const status1 = () => fill(GL().room1.status, { n: g().struck.length, warm: warmWord(g().maxWarm) });
const curRing = () => RINGS[((g().ring || 0) % RINGS.length + RINGS.length) % RINGS.length];
const ringLabel = () => { const r = curRing(); return fill(V2().room1.ring, { name: ringName(r.id), size: fill(GL().room1.size, { d: r.d }), n: g().struck.length, warm: warmWord(g().maxWarm) }); };
function refresh1() {
  const s = g(), r = curRing(), W = V2().room1, name = ringName(r.id);
  const set = (sel, t) => { const el = $(sel); if (el && el.textContent !== t) el.textContent = t; };
  set('#ringNext', ringLabel());
  set('#strikeBtn', fill(W.strike, { name }));
  set('#handBtn', fill(W.hand, { name }));
  $('#handBtn')?.setAttribute('aria-pressed', String(s.hand === r.id));
}
function room1HTML() {
  const s = g(), R = GL().room1, W = V2().room1;
  if (s.done1) return `${cardHTML(R.end)}<div class="row">${replayHTML(R.end)}<button type="button" class="btn primary" id="toRoom2" data-key="toRoom2">${esc(R.next)}</button></div>`;
  const r = curRing(), name = ringName(r.id);
  return `<div class="ody-stage gal-stage listen-stage" aria-hidden="true">${ringsHTML(s)}</div>
    <div class="row">
      <button type="button" class="btn" id="ringNext" data-key="ringNext">${esc(ringLabel())}</button>
      <button type="button" class="btn primary" id="strikeBtn" data-key="strike">${esc(fill(W.strike, { name }))}</button>
      <button type="button" class="btn" id="handBtn" data-key="hand" aria-pressed="${s.hand === r.id}">${esc(fill(W.hand, { name }))}</button>
      ${skipHTML()}</div>`;
}
function fieldHTML() {
  const s = g(), p = cellXY(s.cell);
  const marks = TRACES.filter(t => s.found.includes(t.id)).map(t => {
    const q = cellXY(t);
    return `<span class="gal-mark" style="left:${(q.x * 100).toFixed(1)}%;top:${(q.y * 100).toFixed(1)}%"><i></i>${esc(GL().room2.names[t.id])}</span>`;
  }).join('');
  return `<div class="ody-stage gal-stage listen-stage" aria-hidden="true"><div class="gal-field" id="galField" style="--cx:${(p.x * 100).toFixed(1)}%;--cy:${(p.y * 100).toFixed(1)}%">
    <div class="gal-hole"><i class="gal-pulse"></i></div>${marks}</div></div>`;
}
const curDir = () => DIR_ORDER[((g().dir || 0) % 4 + 4) % 4];
function room2HTML() {
  const s = g(), R = GL().room2, W = V2().room2, done = !nextTrace(s.found);
  if (done) return `${fieldHTML()}<p>${esc(R.end)}</p><div class="row"><button type="button" class="btn primary" id="toMeet" data-key="toMeet">${esc(R.next)}</button></div>`;
  const dn = W.dirNames[curDir()];
  return `${fieldHTML()}<div class="row">
      <button type="button" class="btn" id="dirNext" data-key="dirNext">${esc(fill(W.dir, { dir: dn }))}</button>
      <button type="button" class="btn primary" id="stepBtn" data-key="step">${esc(fill(W.step, { dir: dn }))}</button>
      <button type="button" class="btn" id="digBtn" data-key="dig">${esc(fill(W.dig, { n: s.found.length, total: TRACES.length }))}</button>
      ${skipHTML()}</div>`;
}
const roomKey = () => (g().room === 1 ? 'room1' : 'room2');
export function view() {
  const s = g(), R = s.room === 1 ? GL().room1 : GL().room2, begun = s.room === 1 ? s.begun1 : s.begun2, title = `${GL().title} · ${R.title}`;
  if (!begun) {
    const visual = `<section class="hub-sayu trials-guide listen-card"><img src="${IMG[R.intro.who]}" alt=""><div><span class="fiction-label">창작 캐릭터 대사</span> <b>${esc(LD().names[R.intro.who])}</b><p class="fiction">“${esc(text(R.intro))}”</p></div></section>`;
    return howtoPage({ name: title, lead: s.room === 1 ? GL().entry : '', line: R.intro, visual, body: V2()[roomKey()].howtoBody, credit: ROOMS[s.room].src, sounds: R.howto.sounds, goLabel: GL().begin });
  }
  return `${head(title)}${s.room === 1 ? room1HTML() : room2HTML()}`;
}

/* ---------- 1방 ---------- */
function strike(id) {
  const s = g(), r = RINGS.find(x => x.id === id);
  strikeSound(r);
  if (s.hand === id) stopRing(id, 0.15);   // 손을 얹은 채 두드리면 탁 하고 바로 멎는다
  vibrate(ringVib(r));
  const el = $(`.gal-ring[data-ring="${id}"]`);
  if (el) { el.classList.remove('ringing'); void el.offsetWidth; el.style.setProperty('--decay', `${r.decay}s`); el.classList.add('ringing', 'struck'); }
  const first = !s.struck.includes(id);
  if (first) s.struck.push(id);
  log('gal_strike', { id, f: r.f, d: r.d });
  save();
  refresh1();
  if (!first) return;
  // 두드린 진행을 알린다(WCAG 4.1.3). 다섯째면 다음 할 일, 방을 마치면 마침 알림 하나로
  if (!check1()) tell(s.struck.length >= RINGS.length ? GL().room1.allStruck : status1(), true);
}
function handToggle(id) {
  const s = g();
  if (s.hand === id) {
    s.hand = null;
    log('gal_hand_off', { id, warm: +(s.warm[id] || 0).toFixed(2) });
  } else {
    if (stopRing(id, 0.12)) { s.damped++; tell(GL().room1.damped, true); }
    vibrate([25]);
    s.hand = id;
    log('gal_hand', { id });
    startWarm();
  }
  refresh1();
  $$('.gal-ring').forEach(el => { el.classList.toggle('held', el.dataset.ring === s.hand); if (el.dataset.ring === s.hand) el.classList.remove('ringing'); });
  save();
}
function startWarm() {
  if (warmTimer) return;
  warmLast = performance.now();
  warmTimer = setInterval(() => {
    const s = g(), now = performance.now(), dt = now - warmLast;
    warmLast = now;
    let any = false, msg = '';
    for (const r of RINGS) {
      const w0 = s.warm[r.id] || 0, w = warmStep(w0, s.hand === r.id, dt);
      s.warm[r.id] = w;
      if (w !== w0) $(`.gal-ring[data-ring="${r.id}"]`)?.style.setProperty('--ring', mix(w));
      if (w > 0) any = true;
      if (w0 < WARM_GOAL && w >= WARM_GOAL && s.maxWarm < WARM_GOAL) msg = fill(GL().room1.warm, { name: ringName(r.id) });
      if (w0 < WARM_FULL && w >= WARM_FULL && s.maxWarm < WARM_FULL) msg = fill(GL().room1.warmFull, { name: ringName(r.id) });
      if (w > s.maxWarm) s.maxWarm = w;
    }
    refresh1();   // 같은 글은 다시 쓰지 않는다
    if (!any && !s.hand) { clearInterval(warmTimer); warmTimer = 0; }
    if (msg) save();   // 반쯤·끝까지 데운 순간은 저장해 둔다(손을 얹은 채 떠나도 점수가 남게)
    // 같은 순간의 알림 둘(따뜻해짐 + 방 마침)은 한 문장으로 — 따로 보내면 앞의 것이 덮인다(WCAG 4.1.3)
    if (!check1(msg) && msg) tell(msg, true);
  }, 100);
}
/** 1방을 마쳤으면 마침 알림을 하고 true. prefix는 같은 순간에 알릴 앞 문장 */
function check1(prefix = '') {
  const s = g();
  if (s.done1 || !room1Done(s)) return false;
  s.done1 = true;
  log('gal_room_done', { room: 1, damped: s.damped });
  save();
  hooks.render();
  voice(GL().room1.end, 600);
  tell([prefix, GL().room1.doneTell].filter(Boolean).join(' '), true);
  return true;
}
function describe(id) {
  const t = LINES[id];
  const d = $('#galDesc'); if (d) d.textContent = t;
  if (hasRecording('guide', t)) speakGuide(t); else tell(t, true);
}

/* ---------- 2방 ---------- */
function loop() {
  const s = g(), t = nextTrace(s.found);
  if (quiet || !t || state.scene !== 'listenGallery' || s.room !== 2 || !s.begun2) { pingTimer = 0; return; }
  const p = cellXY(s.cell), c = cue(p.x, p.y, cellXY(t));
  ping(c);
  vibrate([c.vib]);
  const pl = $('#galField .gal-pulse');
  if (pl) { pl.classList.remove('go'); void pl.offsetWidth; pl.style.setProperty('--life', `${Math.min(900, c.interval)}ms`); pl.classList.add('go'); }
  pingTimer = setTimeout(loop, c.interval);
}
function restartPing() { stopPing(); loop(); }
function edgeSound() { vibrate([15]); pluckSfx(1500, { gain: 0.1, seconds: 0.08 }); }
function move(dir) {
  const s = g(), next = moveCell(s.cell, dir);
  if (sameCell(next, s.cell)) { edgeSound(); tell(GL().room2.edge, true); return; }
  s.cell = next;
  save();
  const f = $('#galField'), p = cellXY(s.cell);
  if (f) { f.style.setProperty('--cx', `${(p.x * 100).toFixed(1)}%`); f.style.setProperty('--cy', `${(p.y * 100).toFixed(1)}%`); }
  quiet = false;
  restartPing();
  const t = nextTrace(s.found);
  if (s.speakNear && t) tell(GL().room2.levels[nearLevel(s.cell, t)], true);
}
function dig() {
  const s = g(), t = nextTrace(s.found);
  if (!t) return;
  s.digs++;
  if (!sameCell(s.cell, t)) {
    s.misses++;
    log('gal_miss', { cell: s.cell });
    lowThud();
    vibrate([70]);
    tell(GL().room2.miss, true);
    save();
    return;
  }
  s.found.push(t.id);
  log('gal_found', { id: t.id, digs: s.digs, misses: s.misses });
  chime();
  vibrate([60, 80, 60, 80, 200]);
  quiet = true;   // 해설을 읽는 동안 똑 소리는 쉰다. 다시 옮기면 들린다
  stopPing();
  if (!nextTrace(s.found)) log('gal_room_done', { room: 2, digs: s.digs, misses: s.misses });
  save();
  hooks.render();
  const d = $('#galDesc'); if (d) d.textContent = LINES[t.id];
  // 녹음 목소리를 저절로 듣기로 한 사람에게만 녹음으로 읽고, 아니면 해설 전체를 글로 알린다(낭독기가 읽는다)
  if (state.listen.autoVoice && hasRecording('guide', LINES[t.id])) { tell(GL().room2.found[t.id], true); voice({ who: 'guide', text: LINES[t.id] }); }
  else tell(`${GL().room2.found[t.id]} ${LINES[t.id]}`, true);
}

/* ---------- 들어 보기 ---------- */
const later = (fn, ms) => setTimeout(fn, ms);
const SAMPLE1 = {
  big: () => strikeSound(RINGS[0]),
  small: () => strikeSound(RINGS[RINGS.length - 1]),
  damp: () => { strikeSound(RINGS[1]); later(() => stopRing(RINGS[1].id, 0.12), 700); }
};
const pings = (c, n) => { for (let k = 0; k < n; k++) later(() => ping(c), k * c.interval); };
const SAMPLE2 = {
  far: () => pings(cue(0.1, 0.5, { x: 0.9, y: 0.5 }), 2),
  near: () => pings(cue(0.5, 0.5, { x: 0.52, y: 0.5 }), 6),
  left: () => pings(cue(0.6, 0.5, { x: 0.25, y: 0.5 }), 3),
  miss: () => lowThud(),
  found: () => chime(),
  edge: () => edgeSound()
};

/** 1방: 다음 고리로. 처음 만나는 고리는 영감이 그 자리의 흔적을 말해 준다(예전 '모습 듣기') */
function nextRing() {
  const s = g();
  s.ring = ((s.ring || 0) + 1) % RINGS.length;
  save();
  refresh1();
  const r = curRing(), first = !s.heard.includes(r.id);
  if (first) s.heard.push(r.id);
  const said = fill(V2().room1.ringSaid, { name: ringName(r.id), size: fill(GL().room1.size, { d: r.d }) });
  if (first && LINES[r.id]) {
    if (state.listen.autoVoice && hasRecording('guide', LINES[r.id])) { tell(said, true); speakGuide(LINES[r.id]); }
    else tell(`${said} ${LINES[r.id]}`, true);
  } else tell(said, true);
}
/** 2방: 방향 바꾸기 */
function nextDir() {
  const s = g(), W = V2().room2;
  s.dir = ((s.dir || 0) + 1) % 4;
  save();
  const dn = W.dirNames[curDir()];
  $('#dirNext').textContent = fill(W.dir, { dir: dn });
  $('#stepBtn').textContent = fill(W.step, { dir: dn });
  tell(fill(W.dirSaid, { dir: dn }), true);
}

export function bind() {
  const s = g(), R = s.room === 1 ? GL().room1 : GL().room2, begun = s.room === 1 ? s.begun1 : s.begun2;
  clearInterval(warmTimer); warmTimer = 0;
  if (keys) { window.removeEventListener('keydown', keys); keys = null; }
  bindHush();
  bindSkip();
  if (!begun) {
    voice(R.intro);
    bindSampleCycle(R.howto.sounds, id => (s.room === 1 ? SAMPLE1 : SAMPLE2)[id]?.(), R.intro);
    $('#howtoGo').onclick = () => {
      hush();
      s[s.room === 1 ? 'begun1' : 'begun2'] = true;
      log('listen_room_start', { room: s.room });
      save();
      hooks.go('listenGallery');
    };
    return;
  }
  if (s.room === 1) {
    if (s.done1) {
      bindReplay(GL().room1.end);
      $('#toRoom2')?.addEventListener('click', () => { s.room = 2; save(); hooks.go('listenGallery'); });
      if (s.hand) startWarm();   // 손을 얹은 채 마쳤으면 끝까지 데워지도록 그대로 둔다
      return;
    }
    $('#ringNext').onclick = nextRing;
    $('#strikeBtn').onclick = () => strike(curRing().id);
    $('#handBtn').onclick = () => handToggle(curRing().id);
    $$('.gal-ring').forEach(el => { el.tabIndex = -1; el.classList.toggle('held', el.dataset.ring === s.hand); el.onclick = () => strike(el.dataset.ring); });
    if (s.hand || Object.values(s.warm).some(w => w > 0)) startWarm();
    return;
  }
  $('#dirNext')?.addEventListener('click', nextDir);
  $('#stepBtn')?.addEventListener('click', () => move(curDir()));
  $('#digBtn')?.addEventListener('click', dig);
  $('#toMeet')?.addEventListener('click', () => hooks.go('listenOffer'));   // 사유에게 가는 길목에서 유태양의 마지막 제안
  // 낭독기를 끄고 하는 사람: 방향키로 옮기고, 단추가 아닌 곳에서 Enter로 판다
  keys = e => {
    if (e.target.closest?.('input, textarea, select')) return;
    const d = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
    if (d && nextTrace(s.found)) { e.preventDefault(); move(d); return; }
    if (e.key === 'Enter' && !e.target.closest?.('button, a, label')) { e.preventDefault(); dig(); }
  };
  window.addEventListener('keydown', keys);
  if (nextTrace(s.found)) restartPing();
}
