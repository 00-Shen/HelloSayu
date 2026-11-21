// 시각장애인판 「반가워, 사유 · 소리로 만나는 판」(2026-11-12)의 공용 조각과 짧은 장면들.
// 원칙: 모든 조작은 단추 한 번. 녹음된 대사만 소리로 내고 나머지 글은 화면 낭독기가 읽는다. 상태 알림은 바뀔 때만 한 번.
// v2(2026-11-21, 교수 피드백): ① 한 페이지에 낭독기가 머무는 곳(제목·글·그림·단추)을 5개 이하로 ② 모든 장면에 '다음 단계로 건너뛰기'.
//   - 위치('여덟 장 중 셋째')는 제목 안으로, 장면마다 읽던 '적용한 작품'은 하는 법 글과 '작품 소개' 쪽으로 옮겼다.
//   - 그림과 1인칭 무대는 눈으로 보는 사람에게 그대로 두고, 낭독기에는 그 장면의 글을 한 문단으로 읽힌다(aria-hidden + sr-only).
//   - '대사 듣기'와 '목소리 멈추기'를 한 단추로: 다시 누르면 멈춘다(Esc도 그대로).
//   - 하는 법은 시련 앞의 따로 한 쪽: 글 한 문단 + '소리 들어 보기'(누를 때마다 다음 소리) + 시작 단추.
// v2.1(2026-11-21 밤, 실기기 시험 뒤): 처음 화면은 큰 '소리로 시작'(읽어 주기) · '화면 낭독기로 하기' · '보면서 하기' · '장 고르기 · 설정'.
//   - 읽어 주기: 장면에 들어오면 낭독기가 읽을 글(제목 → 문단)을 그대로 기기 음성으로 읽고, 녹음 대사는 녹음으로(pageParts).
//     알림(tell)도 소리로. 글자를 누르면 다시 읽는다. 낭독기와 겹치므로 '화면 낭독기로 하기'를 고르면 꺼진다(설정에서도 끄고 켠다).
//   - 화면: 장면 끝의 단추 줄은 화면 아래에 붙고(주 단추는 첫 화면 안), 그림은 작게(css/listen.css v2.1).
import { $, $$, esc, state, data, log, announce, save, hooks, speak, speakRival, speakGuide, hasRecording, hush, asset, isSpeaking, sayParts } from './core.js';
import { filmHTML, bindFilm, overviewHTML, bindOverview, stopOverview } from './film.js';
import { povStage } from './story.js';
import { pluckSfx } from './music.js';
import { LISTEN_SCENES, lineText, shouldTell, CHAPTERS, skipPlan, markSkipped, resetChapter, markUnplayedBefore, setEasy } from './listen-rules.js';
import { fill } from './trials-rules.js';
import * as reach from './reach.js';
import * as sense from './sense.js';

export const LD = () => data.listen;
export const V2 = () => data.listen.v2;
export const text = line => lineText(line, data.trials);

/* ---------- 알림 ---------- */
let last = null;
/** 최근 알림 기록(시험이 저절로 나온 알림의 빈도를 본다). force: 누른 것에 대한 답 */
export const tellLog = [];
/** 낭독기 알림. 같은 말은 1.5초 안에 되풀이하지 않는다. force: 사용자가 방금 누른 것에 대한 답이라 늘 말한다.
 *  v2.1: 읽어 주기(소리로 시작)면 기기 음성으로도 바로 말한다(읽던 것은 끊는다). sound=false면 글 알림만 */
export function tell(t, force = false, sound = true) {
  const now = performance.now();
  if (!t || (!force && !shouldTell(last, t, now))) return;
  last = { text: t, at: now };
  tellLog.push({ at: now, text: t, force });
  if (tellLog.length > 300) tellLog.shift();
  announce(t);
  if (sound && reading()) sayParts(narrParts(t));
}

/* ---------- v2.1 소리로 시작 · 읽어 주기 ---------- */
/** 읽어 주기가 켜져 있는가('소리로 시작'을 골랐거나 설정에서 켰다) */
export const reading = () => !!state.listen?.autoVoice;
/** 긴 글은 문장으로 나눠 읽는다(한 번에 길게 읽히면 끊기는 기기가 있고, 누르면 그 자리에서 멈추기 쉽다) */
export const narrParts = t => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).filter(Boolean).map(x => ({ who: 'narr', text: x }));
/** 녹음 대사를 글 안에 표시한다: 낭독기는 글을 읽고, 읽어 주기는 이 자리를 녹음(없으면 해설 목소리)으로 */
export const lineSpan = line => `<span data-line="${esc(line.who)}" data-text="${esc(text(line))}">“${esc(text(line))}”</span>`;
/** 장면에서 화면 낭독기가 읽을 글을 그대로 차례로 모은다: 제목 → 문단들(가려진 것 · 단추 안은 빼고).
 *  data-line은 녹음 대사, data-narr="skip"(적용한 작품 · '창작 캐릭터 대사' 표시)은 읽어 주기에서 건너뛴다 */
export function pageParts() {
  const sc = $('#scene');
  if (!sc) return [];
  const parts = [];
  const h = sc.querySelector('h1');
  if (h) { const c = h.cloneNode(true); c.querySelectorAll('.pos, .sr-only').forEach(x => x.remove()); parts.push(...narrParts(c.textContent)); }
  let buf = '';
  const flush = () => { parts.push(...narrParts(buf)); buf = ''; };
  const walk = node => {
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) { buf += ch.textContent; continue; }
      if (ch.nodeType !== 1 || ch.dataset.narr === 'skip' || ch.getAttribute('aria-hidden') === 'true') continue;
      if (ch.dataset.line) { flush(); parts.push({ who: ch.dataset.line, text: ch.dataset.text }); continue; }
      walk(ch);
    }
  };
  sc.querySelectorAll('p').forEach(p => {
    if (p.closest('[aria-hidden="true"], button, [data-narr="skip"]')) return;
    walk(p); flush();
  });
  return parts;
}
let readTimer = 0;
/** 장면에 들어오면(또는 장면 안의 화면이 바뀌면) 글을 읽어 준다. 지금 읽는 것(예: '건너뛰었습니다')이 있으면 그 뒤에 이어서 */
export function readPage(delay = 600) {
  clearTimeout(readTimer); readTimer = 0;
  if (!reading()) return;
  if (!delay) { sayParts(pageParts()); return; }
  readTimer = setTimeout(() => sayParts(pageParts(), { append: true }), delay);
}
/** 알림 다음에 녹음 대사(영감의 해설 등)를 이어서. 읽어 주기가 아니면 알림만(낭독기가 읽는다) */
export function tellThen(msg, line) {
  tell(msg, true, false);
  if (reading()) sayParts([...narrParts(msg), ...(line ? [{ who: line.who, text: text(line) }] : [])]);
}

/* ---------- 대사 ---------- */
const SAY = { sayu: speak, rival: speakRival, guide: speakGuide };
let voiceTimer = 0;
/** 녹음된 대사를 재생한다. 장면이 열릴 때는 낭독기가 제목을 먼저 읽게 1.5초 기다린다. 녹음이 없으면 소리를 내지 않는다.
 *  delay가 있는 호출은 '저절로' 트는 것이다. 녹음 목소리 저절로 듣기(state.listen.autoVoice)를 켠 사람에게만 튼다.
 *  '대사 듣기' 단추는 delay 0으로 불러 늘 튼다(WCAG 1.4.2 · KWCAG 5.4.2: 소리가 저절로 나지 않게, 2026-11-19) */
export function voice(line, delay = 1500) {
  clearTimeout(voiceTimer);
  // v2.1: 장면에 들어올 때 저절로 나는 소리는 readPage(글 + 녹음 대사)가 맡는다. 여기서는 '대사 듣기'(delay 0)만
  if (delay > 0) return;
  const lines = (Array.isArray(line) ? line : [line]).filter(Boolean);   // 같은 인물의 대사 여러 줄은 이어서 읽는다
  if (!lines.length) return;
  const who = lines[0].who, ts = lines.map(text).filter(t => hasRecording(who, t));
  if (!ts.length) return;
  voiceTimer = setTimeout(() => SAY[who](ts.length === 1 ? ts[0] : ts), delay);
}
/** 녹음 목소리를 멈춘다: 지금 나는 소리와, 곧 나올 예정이던 대사(예약)까지. Esc · '대사 듣기' 다시 누르기 · 저절로 듣기 끄기 */
export function stopVoice() { clearTimeout(voiceTimer); voiceTimer = 0; clearTimeout(readTimer); readTimer = 0; hush(); }
/** 장면 안의 '목소리 멈추기' 단추(v2에서는 쓰지 않지만 남은 화면을 위해 둔다) */
export function bindHush() { $$('[data-hush]').forEach(h => { h.onclick = () => { stopVoice(); tell(LD().common.hushed, true); }; }); }
/** 대사 한 줄(글)과, 녹음이 있으면 '대사 듣기' 단추 */
export function quoteHTML(line) {
  const t = text(line), rec = hasRecording(line.who, t);
  return `<blockquote class="line"><p><b>${esc(LD().names[line.who])}</b>“${esc(t)}”</p>${rec ? voiceButtons() : ''}</blockquote>`;
}
/** v2: '대사 듣기' 하나. 소리가 나는 중에 다시 누르면 멈춘다 */
const voiceButtons = () => `<button type="button" class="btn small" data-key="replay" data-replay>${esc(reading() ? V2().readAgain : V2().listen)}</button>`;
/** v2.1: 읽어 주기에서는 '다시 듣기' — 장면 글 전체를 처음부터 */
export function bindReplay(line) {
  const b = $('[data-replay]');
  if (b) b.onclick = () => { if (isSpeaking()) { stopVoice(); tell(V2().listenStop, true, false); } else if (reading()) readPage(0); else voice(line, 0); };
  bindHush();
}
/** 두 번 눌러야 실행되는 단추(저장을 지우거나 점수를 0으로 만드는 것). 첫 누름에 단추 글이 바뀌고, 다시 누르면 실행.
 *  시간 제한은 두지 않는다(WCAG 2.2.1) — 다른 곳으로 초점을 옮기면 취소 */
let confirmAC = new AbortController();   // 장면을 떠나면 확인 단추가 단 장면 전체의 듣기를 거둔다
export function confirmTwice(btn, confirmLabel, ask, action) {
  if (!btn) return;
  const label = btn.textContent;
  let armedAt = 0;
  const cancel = () => { if (armedAt) { armedAt = 0; btn.textContent = label; } };
  btn.addEventListener('keydown', e => { if (e.repeat) e.preventDefault(); if (e.key === 'Tab') cancel(); });
  btn.addEventListener('blur', cancel);
  // 휴대폰 낭독기는 쓸어 넘겨도 DOM 초점이 그대로일 때가 있다 — 다른 것을 누르면 취소
  document.getElementById('scene')?.addEventListener('click', e => { if (!btn.contains(e.target)) cancel(); }, { capture: true, signal: confirmAC.signal });
  btn.onclick = () => {
    if (armedAt) {
      if (performance.now() - armedAt < 700) return;   // 더블클릭 한 번이 확인을 건너뛰지 않게
      action(); return;
    }
    armedAt = performance.now();
    btn.textContent = confirmLabel;
    tell(ask, true);
  };
}
/** 처음부터 다시 하기는 저장을 지우므로 한 번 더 묻는다(WCAG 3.3.4) */
export function confirmRestart(btn) { confirmTwice(btn, LD().common.restartConfirm, LD().common.restartAsk, () => hooks.restart()); }
/** 장면을 떠날 때 */
export function leave() { clearTimeout(voiceTimer); voiceTimer = 0; clearTimeout(readTimer); readTimer = 0; last = null; stopOverview(); confirmAC.abort(); confirmAC = new AbortController(); }

/* ---------- 틀 ---------- */
/** v2: 장면마다 읽던 '적용한 작품'은 하는 법 글과 '작품 소개' 쪽으로 옮겼다 */
export const creditHTML = () => '';
/** v2: 위치는 제목 안으로 */
export const posHTML = () => '';
/** 장면 제목: 눈에는 '(3/8)', 낭독기에는 '여덟 장 중 셋째'를 제목 안에서 함께 읽는다(머무는 곳 하나) */
export function head(title) {
  const P = LD().position, i = Math.max(0, LISTEN_SCENES.indexOf(state.scene));
  return `<h1>${esc(title)} <span class="pos" aria-hidden="true">(${esc(fill(V2().pos, { n: i + 1 }))})</span><span class="sr-only">, ${esc(fill(P.template, { nth: P.nth[i], name: '' }).replace(/ · $/, ''))}</span></h1>`;
}
/** 예전 하는 법(목표 → 조작 → 소리의 뜻 → 틀리면). v2 화면에서는 쓰지 않는다 */
export function howtoHTML(h, extra = '') {
  const C = LD().common;
  return `<section class="howto" aria-labelledby="howtoTitle">
    <h2 id="howtoTitle">${esc(C.howto)}</h2>
    <h3>${esc(C.goal)}</h3><p>${esc(h.goal)}</p>
    <h3>${esc(C.controls)}</h3>
    <ul><li>${esc(C.pc)}: ${esc(h.pc)}</li><li>${esc(C.phone)}: ${esc(h.phone)}</li></ul>
    <h3>${esc(C.sounds)}</h3>
    <ul class="samples">${h.sounds.map(s => `<li>${esc(s.text)} <button type="button" class="btn small" data-key="sample-${s.id}" data-sample="${s.id}">${esc(C.sample)}<span class="sr-only">: ${esc(s.text.split(': ')[0])}</span></button></li>`).join('')}</ul>
    <h3>${esc(C.fail)}</h3><p>${esc(h.fail)}</p>
    ${extra}
  </section>`;
}
export function bindSamples(play) { $$('[data-sample]').forEach(b => { b.onclick = () => play(b.dataset.sample); }); }

/** v2 시련의 첫 쪽(들머리와 하는 법을 한 쪽에): 제목 · 글 한 문단(이야기 → 대사 → 하는 법 → 적용한 작품) · 들어 보기 · 시작 · 건너뛰기.
 *  그림(인물 카드나 무대)은 눈으로 보는 사람에게 그대로 두고, 낭독기에는 문단 하나로 읽힌다 */
export function howtoPage({ name, lead = '', line = null, visual = '', body, credit, sounds, goLabel }) {
  const W = V2().howto, list = sampleList(sounds, line), i = (state.listen.sample || 0) % list.length;
  const said = line ? `${esc(LD().names[line.who])}${fictionTag()}: ${lineSpan(line)}` : '';
  return `${head(fill(W.title, { name }))}
    ${visual ? `<div aria-hidden="true">${visual}</div>` : ''}
    <p>${lead || said ? `<span class="${visual ? 'sr-only' : ''}">${[lead ? esc(lead) : '', said].filter(Boolean).join(' ')} </span>` : ''}${esc(body)} <span data-narr="skip">${esc(fill(W.credit, { credit }))}</span></p>
    <div class="row"><button type="button" class="btn" id="sampleBtn" data-key="sample">${esc(fill(W.sample, { i: i + 1, n: list.length }))}</button>
      <button type="button" class="btn primary" id="howtoGo" data-key="howtoGo">${esc(goLabel)}</button>${skipHTML()}</div>`;
}
/** 들어 보기 목록: 녹음된 대사가 있으면 그것이 첫째, 그다음 시련의 소리들 */
function sampleList(sounds, line) {
  const rec = line && hasRecording(line.who, text(line));
  return [...(rec ? [{ id: '__line', text: fill(V2().howto.lineSample, { who: LD().names[line.who] }), line }] : []), ...sounds];
}
/** '들어 보기'를 누를 때마다 다음 소리(와 그 뜻). 대사는 녹음 목소리로 */
export function bindSampleCycle(sounds, play, line = null) {
  const b = $('#sampleBtn');
  if (!b) return;
  const list = sampleList(sounds, line);
  b.onclick = () => {
    const l = state.listen, i = (l.sample || 0) % list.length, s = list[i];
    if (s.id === '__line') voice(s.line, 0);
    else { stopVoice(); play(s.id); tell(s.text, true); }
    l.sample = (i + 1) % list.length;
    b.textContent = fill(V2().howto.sample, { i: l.sample + 1, n: list.length });
  };
}

/* ---------- 다음 단계로 건너뛰기 ---------- */
export const skipHTML = () => `<button type="button" class="btn skip-btn" id="skipBtn" data-key="skip">${esc(V2().skip)}</button>`;
/** 이야기·영상은 한 번 누르면 바로, 시련은 0점이 되므로 한 번 더 눌러 확인 */
export function bindSkip() {
  const b = $('#skipBtn');
  if (!b) return;
  const l = state.listen, t = state.trials;
  const film = state.scene === 'listenPrologue' && filmFirst();
  const plan = film ? { to: 'prologue', trial: null } : skipPlan(state.scene, l, t);
  if (!plan) { b.hidden = true; return; }
  const run = () => {
    stopVoice();
    markSkipped(l, plan.trial);
    log('listen_skip', { from: state.scene, to: plan.to, trial: plan.trial });
    const C = V2().chapters.names;
    let name = '';
    if (plan.to === 'prologue') { l.filmSeen = true; name = LD().prologue.pages[0].title; save(); hooks.go('listenPrologue'); }
    else if (plan.to === 'room2') { l.gal.room = 2; l.gal.begun1 = true; name = LD().gal.room2.title; save(); hooks.go('listenGallery'); }
    else if (plan.to === 'choose') { t.offerStep = 1; name = LD().offer.title; save(); hooks.go('listenOffer'); }
    else if (plan.to === 'listenResult') { l.meetStarted = true; t.met = true; t.meetStep = 2; name = data.score.text.title; save(); hooks.go('listenResult'); }
    else { if (plan.to === 'listenGiant') l.filmSeen = true; name = C[plan.to] || ''; save(); hooks.go(plan.to); }
    tell(fill(V2().skipped, { to: name }), true);
  };
  if (plan.trial) confirmTwice(b, V2().skipConfirm, V2().skipAsk, run);
  else b.onclick = run;
}

/* ---------- 본게임 그림 (화면은 본게임 그대로, 2026-11-12) ---------- */
export const IMG = { sayu: asset('assets/character/sayu-reference-web.png'), rival: asset('Tae.png'), guide: asset('assets/character/halabeoji.webp') };
const ALT = () => ({ sayu: data.trials.meet.alt, rival: data.trials.prologue.rivalAlt, guide: data.trials.prologue.guideAlt });
const fiction = '창작 캐릭터 대사';
/** 낭독기가 읽는 한 문단: 앞 글(lead) + 인물(창작 캐릭터 대사): “대사” */
const fictionTag = () => `<span data-narr="skip">(${fiction})</span>`;
/** leadHTML: 앞 글을 이미 HTML로 만든 경우(프롤로그의 인용 대사에 data-line이 있다) */
export const srLineHTML = (line, lead = '', tail = '', leadHTML = null) => `${leadHTML ?? (lead ? esc(lead) : '')}${leadHTML || lead ? ' ' : ''}${esc(LD().names[line.who])}${fictionTag()}: ${lineSpan(line)}${tail ? ` ${esc(tail)}` : ''}`;
/** 본게임의 1인칭 장면(그림 위에 이름과 대사). v2: 무대는 눈으로만, 낭독기에는 lead와 대사를 한 문단으로 */
export function stageHTML(line, chapter = '', lead = '', tail = '', leadHTML = null) {
  const who = line.who;
  const stage = povStage({ name: LD().names[who], img: IMG[who], alt: '', line: text(line), chapter, cls: `listen-pov${who === 'rival' ? ' rival-pov' : ''}`, controls: '' })
    .replace(' aria-live="polite"', '');
  return `${lead ? `<p aria-hidden="true">${esc(lead)}</p>` : ''}<div aria-hidden="true">${stage}</div>${tail ? `<p aria-hidden="true">${esc(tail)}</p>` : ''}<p class="sr-only">${srLineHTML(line, lead, tail, leadHTML)}</p>`;
}
/** 본게임의 인물 카드(동그란 얼굴 + 이름 + 대사). v2: 낭독기에는 한 문단 */
export function cardHTML(line, lead = '', leadHTML = null) {
  const who = line.who;
  return `${lead ? `<p aria-hidden="true">${esc(lead)}</p>` : ''}<section class="hub-sayu trials-guide listen-card" aria-hidden="true"><img src="${IMG[who]}" alt="">
    <div><span class="fiction-label">${fiction}</span> <b>${esc(LD().names[who])}</b><p class="fiction">“${esc(text(line))}”</p></div></section>
    <p class="sr-only">${srLineHTML(line, lead, '', leadHTML)}</p>`;
}
/** 녹음이 있으면 '대사 듣기' 단추 */
export const replayHTML = line => (line && hasRecording(line.who, text(line)) ? voiceButtons() : '');
export const nowBtn = () => `<button type="button" class="btn" id="nowBtn" data-key="now">${esc(LD().common.now)}</button>`;
export function bindNow(fn) { const b = $('#nowBtn'); if (b) b.onclick = () => tell(fn(), true); }

/* ---------- 시작(작은 쪽 넷: 처음 · 장 고르기 · 소리 확인 · 작품 소개) ---------- */
const ear = side => pluckSfx(side < 0 ? 392 : 523.25, { pan: side, gain: 0.35, seconds: 1.2 });
const sub = v => { state.listen.startView = v; save(); hooks.go('listenStart'); };
export function startView() {
  const l = state.listen, W = V2(), T = W.start;
  if (l.startView === 'menu') return menuView();
  if (l.startView === 'chapters') return chaptersView();
  if (l.startView === 'settings') return settingsView();
  if (l.startView === 'about') return aboutView();
  // v2.1: QR로 들어오면 이 화면. 큰 '소리로 시작'(읽어 주기) · 낭독기 · 보면서 · 선생님용(장 고르기 · 설정) — 정거장 5개
  // v2.1d: VoiceOver를 켠 채 '소리로 시작'을 고르면 기기 음성과 낭독기가 겹쳐 읽었다(USER iPhone 녹화 22:57) — 낭독기만 듣는 안내를 단추 이름 안에
  return `<h1>${esc(LD().title)}</h1>
    <div class="listen-hero-box" aria-hidden="true"><img class="listen-hero" src="${IMG.sayu}" alt=""></div>
    <div class="start-choices">
      <button type="button" class="btn primary start-read" id="beginRead" data-key="beginRead">${esc(l.resume ? T.readResume : T.read)}<span class="sr-only">. ${esc(T.readSrHint)}</span><span class="sub">${esc(T.readSub)}</span></button>
      <button type="button" class="btn" id="beginSr" data-key="beginSr">${esc(l.resume ? T.srResume : T.sr)}</button>
      <a class="btn" id="look" data-key="look" href="${esc(T.lookHref)}">${esc(T.look)}</a>
      <button type="button" class="btn small" id="toMenu" data-key="toMenu">${esc(T.menu)}</button>
    </div>`;
}
/** 선생님 · 도우미용: 장 고르기 · 설정 · 작품 소개 */
function menuView() {
  const W = V2();
  return `<h1>${esc(W.menu.title)}</h1>
    <div class="row"><button type="button" class="btn" id="toChapters" data-key="toChapters">${esc(W.start.chapters)}</button>
      <button type="button" class="btn" id="toSettings" data-key="toSettings">${esc(W.start.settings)}</button>
      <button type="button" class="btn" id="toAbout" data-key="toAbout">${esc(W.menu.about)}</button>
      <button type="button" class="btn" id="home" data-key="home">${esc(W.chapters.home)}</button></div>`;
}
function chaptersView() {
  const W = V2().chapters, p = state.listen.chapterPage === 2 ? 2 : 1;
  const btns = CHAPTERS[p - 1].map(sc => `<button type="button" class="btn" data-key="ch-${sc}" data-chapter="${sc}">${esc(W.names[sc])}</button>`).join('');
  return `<h1>${esc(fill(W.title, { p }))}</h1>
    <div class="row">${btns}${p === 1
      ? `<button type="button" class="btn" id="chMore" data-key="chMore">${esc(W.more)}</button>`
      : `<button type="button" class="btn" id="toAbout" data-key="toAbout">${esc(W.about)}</button><button type="button" class="btn" id="chHome" data-key="chHome">${esc(W.home)}</button>`}</div>`;
}
function settingsView() {
  const S = LD().start, W = V2().settings, on = state.listen.autoVoice;
  return `<h1>${esc(W.title)}</h1>
    <div class="row"><button type="button" class="btn" id="ears" data-key="ears">${esc(W.ears)}</button>
      <button type="button" class="btn" id="autoVoice" data-key="autoVoice" aria-pressed="${on ? 'true' : 'false'}">${esc(W.autoRead)}<span aria-hidden="true"> · ${esc(on ? S.autoVoiceOn : S.autoVoiceOff)}</span></button>
      <button type="button" class="btn" id="easy" data-key="easy" aria-pressed="${state.listen.easy ? 'true' : 'false'}">${esc(W.easy)}<span aria-hidden="true"> · ${esc(state.listen.easy ? W.easyOn : W.easyOff)}</span></button>
      <button type="button" class="btn" id="home" data-key="home">${esc(V2().chapters.home)}</button></div>`;
}
/** 작품 소개 영상(화면 해설판)과, 장면마다 읽던 '적용한 작품'을 한 문단으로 */
function aboutView() {
  const O = data.trials.overview, L = LD(), W = V2().about;
  const credits = fill(W.credits, { start: L.start.credit, giant: L.giant.credit, room1: W.room1, room2: W.room2, meet: L.meet.credit });
  return `<h1>${esc(W.title)}</h1>
    ${O ? `${overviewHTML(O, true)}<div class="row"><button type="button" class="btn" id="overviewPlay" data-key="overviewPlay">${esc(O.play)}</button></div>` : ''}
    <p>${esc(credits)}</p>
    <div class="row"><button type="button" class="btn" id="home" data-key="home">${esc(V2().chapters.home)}</button></div>`;
}
export function startBind() {
  const S = LD().start, l = state.listen, v = l.startView;
  $('#home')?.addEventListener('click', () => sub('main'));
  if (v === 'chapters') {
    $$('[data-chapter]').forEach(b => {
      b.onclick = () => {
        const sc = b.dataset.chapter, i = LISTEN_SCENES.indexOf(sc);
        // 고른 장과 그 뒤의 장을 처음 상태로(앞의 장 기록은 그대로)
        LISTEN_SCENES.slice(i).forEach(x => resetChapter(l, state.trials, x));
        markUnplayedBefore(l, state.trials, sc);   // 앞 장에서 마치지 않은 시련은 0점(건너뛴 것과 같다)
        l.doneAt = null; l.resume = null; l.startView = 'main'; l.chapterPage = 1;
        if (sc === 'listenPrologue') l.filmSeen = false;
        log('listen_chapter', { to: sc });
        save();
        hooks.go(sc);
        tell(fill(V2().chapters.went, { name: V2().chapters.names[sc] }), true);
      };
    });
    $('#chMore')?.addEventListener('click', () => { l.chapterPage = 2; save(); hooks.go('listenStart'); });
    $('#chHome')?.addEventListener('click', () => { l.chapterPage = 1; sub('main'); });
    $('#toAbout')?.addEventListener('click', () => { l.chapterPage = 1; sub('about'); });
    return;
  }
  if (v === 'settings') {
    $('#ears').onclick = () => { ear(-1); setTimeout(() => ear(1), 900); tell(V2().settings.earsSaid, true); };
    $('#autoVoice').onclick = e => {
      const on = l.autoVoice = !l.autoVoice, W = V2().settings;
      if (!on) stopVoice();
      e.currentTarget.setAttribute('aria-pressed', String(on));
      e.currentTarget.querySelector('span').textContent = ` · ${on ? S.autoVoiceOn : S.autoVoiceOff}`;
      log('listen_auto_voice', { on }); save();
      tell(on ? W.autoReadSaidOn : W.autoReadSaidOff, true);
    };
    $('#easy').onclick = e => {
      const W = V2().settings, on = !l.easy;
      setEasy(l, state.trials, on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
      e.currentTarget.querySelector('span').textContent = ` · ${on ? W.easyOn : W.easyOff}`;
      log('listen_easy', { on }); save();
      tell(on ? W.easySaidOn : W.easySaidOff, true);
    };
    return;
  }
  if (v === 'about') { if (data.trials.overview) bindOverview(data.trials.overview); return; }
  if (v === 'menu') {
    $('#toChapters').onclick = () => { l.chapterPage = 1; sub('chapters'); };
    $('#toSettings').onclick = () => sub('settings');
    $('#toAbout').onclick = () => sub('about');
    return;
  }
  // 소리로 시작: 읽어 주기를 켜고, 이 누름 안에서 첫 안내를 말한다(iOS는 사람이 누른 순간에만 기기 음성을 연다)
  const begin = read => () => {
    l.autoVoice = read;
    const to = l.resume || 'listenPrologue';
    log(l.resume ? 'listen_resume' : 'listen_begin', { to, read });
    l.resume = null; save();
    hooks.go(to);
    if (read) sayParts(narrParts(V2().start.welcome));
  };
  $('#beginRead').onclick = begin(true);
  $('#beginSr').onclick = begin(false);
  $('#look')?.addEventListener('click', () => log('listen_look'));
  $('#toMenu').onclick = () => sub('menu');
}

/* ---------- 프롤로그 ---------- */
const pages = () => LD().prologue.pages;
const page = () => pages()[Math.min(state.listen.page, pages().length - 1)];
/** 상황 설명 영상(화면 해설판): 프롤로그 첫 쪽 앞에서 한 번. 재생 단추로 시작하고 다 들으면 프롤로그로 넘어간다 */
const filmFirst = () => !!data.trials.prologue.film && state.listen.page === 0 && !state.listen.filmSeen;
function filmView() {
  const F = data.trials.prologue.film;
  return `${head(F.title)}
    <p>${esc(F.noteAd)}</p>
    ${filmHTML(F, true)}
    <div class="row"><button type="button" class="btn primary big" id="filmPlay" data-key="filmPlay">${esc(F.play)}</button>
      ${skipHTML()}</div>`;
}
/** 프롤로그 한 쪽의 글(글 문단 + 인용)을 한 줄로 */
const parasText = pg => (pg.paras || []).map(p => (p.who ? `${p.who}: “${text(p)}”` : text(p))).join(' ');
/** 같은 글의 HTML: 인용 대사(인물 이름이 붙은 문단)는 녹음 자리로 표시한다 */
const WHO = () => Object.fromEntries(Object.entries(LD().names).map(([k, v]) => [v, k]));
const parasHTML = pg => (pg.paras || []).map(p => (p.who && WHO()[p.who] ? `${esc(p.who)}: ${lineSpan({ ...p, who: WHO()[p.who] })}` : esc(p.who ? `${p.who}: “${text(p)}”` : text(p)))).join(' ');
export function prologueView() {
  if (filmFirst()) return filmView();
  const P = LD().prologue, TP = data.trials.prologue, i = Math.min(state.listen.page, pages().length - 1), pg = page(), end = i === pages().length - 1, art = pg.art || {};
  const lead = parasText(pg), leadHTML = parasHTML(pg);
  // 본게임 프롤로그와 같은 그림: 멀리 보이는 유리장 속 사유 / 인물의 1인칭 장면 / 영감의 목표 카드. 낭독기에는 글 한 문단
  let body;
  if (art.kind === 'glass') body = `<div class="trials-night listen-night" aria-hidden="true"><div class="far-glass" style="--near:${art.near}"><img src="${IMG.sayu}" alt=""></div></div><p>${leadHTML}</p>`;
  else if (art.kind === 'pov' && pg.voice) body = stageHTML(pg.voice, '', lead, '', leadHTML);
  else if (art.kind === 'card') body = cardHTML(art.line, lead, leadHTML);
  else body = `<p>${leadHTML}</p>`;
  // v2.1: 제목에는 장 위치 '(2/8)' 하나만. 프롤로그 안의 쪽 수는 '다음' 단추에(계수 둘이 겹쳐 헷갈리던 것)
  const W = V2().prologue, nt = { n: i + 1, total: pages().length };
  const count = end ? '' : `<span aria-hidden="true"> · ${esc(fill(W.page, nt))}</span><span class="sr-only">, ${esc(fill(W.pageSr, nt))}</span>`;
  return `${head(pg.title)}
    ${body}
    <div class="row"><button type="button" class="btn primary" id="next" data-key="next">${esc(end ? P.toTrial : LD().common.next)}${count}</button>
      ${replayHTML(pg.voice)}${skipHTML()}</div>`;
}
export function prologueBind() {
  bindSkip();
  if (filmFirst()) {
    bindFilm(data.trials.prologue.film, () => { hush(); state.listen.filmSeen = true; save(); hooks.go('listenPrologue'); });
    return;
  }
  const pg = page();
  const said = pg.lead ? [pg.lead, pg.voice] : pg.voice;   // 앞선 대사(lead)가 있으면 이어서
  voice(said);
  bindReplay(said);
  $('#next').onclick = () => {
    hush();
    if (state.listen.page >= pages().length - 1) { hooks.go('listenGiant'); return; }
    state.listen.page++;
    save();
    hooks.go('listenPrologue');
  };
}

/* ---------- 사유 만남 · 닿을 듯 멈추기 ---------- */
// 조작과 계산은 오리지널 만남(reach.js)과 같다. 이 판에서는 눌러서 켜고 끄기와 느린 손이 기본이고,
// 틈에 들면 떨리는 소리가 나며(reach.js의 listen 갈래), 글은 data.listen.meet을 쓴다.
export function meetView() {
  const M = LD().meet, t = state.trials, l = state.listen, chapter = data.trials.meet.chapter;
  if (!l.meetStarted) {
    const visual = povStage({ name: LD().names.sayu, img: IMG.sayu, alt: '', line: text(M.first), chapter, cls: 'listen-pov', controls: '' }).replace(' aria-live="polite"', '');
    return howtoPage({ name: M.title, lead: M.entry, line: M.first, visual, body: V2().meet.howtoBody, credit: M.credit, sounds: M.howto.sounds, goLabel: M.begin });
  }
  // v2.1: 다가가기 쪽의 무대는 그림 띠만(사유의 첫 말은 앞 쪽에서 들었다) — 큰 둥근 단추가 작은 휴대폰(360×640)에서도 첫 화면 안에
  if (t.meetStep < 2) return `${head(M.title)}<div aria-hidden="true" class="meet-strip">${stageHTML(M.first, chapter)}</div>${reach.view({ compact: true })}<div class="row">${skipHTML()}</div>`;
  return `${head(M.title)}${stageHTML(M.gap, chapter, M.after)}
    <div class="row">${replayHTML(M.gap)}<button type="button" class="btn primary" id="toEnd" data-key="toEnd">${esc(M.next)}</button></div>`;
}
export function meetBind() {
  const M = LD().meet, t = state.trials, l = state.listen;
  if (!l.meetStarted) {
    voice(M.first);
    bindSkip();
    bindSampleCycle(M.howto.sounds, id => sense.reachSample(id), M.first);
    $('#howtoGo').onclick = () => {
      hush();
      l.meetStarted = true;
      t.met = true;          // 이제부터 사유가 말한다
      t.meetStep = 1;
      log('listen_meet_start');
      save();
      hooks.go('listenMeet');
    };
    return;
  }
  if (t.meetStep < 2) {
    reach.bind();
    bindSkip();
    return;
  }
  voice(M.gap, 600);
  bindReplay(M.gap);
  $('#toEnd').onclick = () => { hush(); hooks.go('listenResult'); };   // 점수 확인 → 엔딩
}

/* ---------- 끝 ---------- */
// 점수 확인과 엔딩(listenResult · listenEnd), 만남 앞의 제안(listenOffer)은 js/listen-end.js(2026-11-18)
