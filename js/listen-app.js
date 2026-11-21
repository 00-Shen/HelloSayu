// 시각장애인판 「반가워, 사유 · 소리로 만나는 판」의 시작 파일(2026-11-12).
// 오리지널의 app.js 대신 이 파일이 데이터를 읽고 장면을 넘긴다. 장면을 바꾸면 제목(h1)에 초점을 옮겨 낭독기가 제목부터 읽는다.
import { $, esc, state, setState, data, freshState, load, save, wipe, log, hush, hooks, isSpeaking } from './core.js';
import { LISTEN_SCENES, freshListen, ensureListen } from './listen-rules.js';
import * as L from './listen.js';
import * as giant from './listen-giant.js';
import * as gallery from './listen-gallery.js';
import * as reach from './reach.js';
import * as end from './listen-end.js';

const views = { listenStart: L.startView, listenPrologue: L.prologueView, listenGiant: giant.view, listenGallery: gallery.view,
  listenOffer: end.offerView, listenMeet: L.meetView, listenResult: end.resultView, listenEnd: end.endView };
const binds = { listenStart: L.startBind, listenPrologue: L.prologueBind, listenGiant: giant.bind, listenGallery: gallery.bind,
  listenOffer: end.offerBind, listenMeet: L.meetBind, listenResult: end.resultBind, listenEnd: end.endBind };
const leaves = [L.leave, giant.leave, gallery.leave, reach.leave, end.leave];

function fresh() {
  const s = freshState();
  s.route = 'listen';
  s.scene = 'listenStart';
  s.trials.tapMode = true;      // 휴대폰 낭독기에서 길게 누르기는 제스처와 부딪힌다 — 눌러서 켜고 끄기
  s.trials.reach.slow = true;   // 두 번 탭이 조금 늦게 들어가므로 움직임을 절반으로
  s.listen = freshListen();
  return s;
}

function focusTitle() {
  const h = $('#scene h1');
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}

/** 장면을 다시 그린다. 초점은 같은 data-key 요소로 되돌리고, 없거나 비활성이면 제목으로.
 *  v2.1 읽어 주기: 장면에 새로 들어왔거나(go) 장면 안에서 화면이 바뀌면(단추 구성이 달라지면) 글을 읽어 준다.
 *  같은 화면을 다시 그리는 것(조각을 붙인 뒤 등)은 읽지 않는다 — 그때는 알림(tell)이 소리로 나온다 */
let lastShape = '';
function render(enter = false) {
  const keep = document.activeElement?.closest?.('#scene [data-key]')?.dataset.key || null;
  // 초점이 있는 요소를 지우기 전에 초점부터 푼다 — 그대로 지우면 Firefox에서 Tab이 두 단추 사이만 오가는 일이 있었다
  if ($('#scene').contains(document.activeElement)) document.activeElement.blur();
  $('#scene').innerHTML = (views[state.scene] || views.listenStart)();
  binds[state.scene]?.();
  const el = keep ? $(`#scene [data-key="${CSS.escape(keep)}"]`) : null;
  if (el && !el.disabled) el.focus({ preventScroll: true });
  else if (!$('#scene').contains(document.activeElement) || keep) focusTitle();
  save();
  const shape = state.scene + '|' + [...document.querySelectorAll('#scene button[id], #scene a[id]')].map(b => b.id).join(',');
  if (enter === true || shape !== lastShape) L.readPage();
  lastShape = shape;
}

function go(name) {
  if (!LISTEN_SCENES.includes(name)) return;
  leaves.forEach(f => f());
  hush();
  state.scene = name;
  log('scene_enter', { target: name });
  document.activeElement?.blur?.();
  render(true);
  window.scrollTo(0, 0);
}

function restart() {
  leaves.forEach(f => f());
  hush();
  wipe();
  setState(fresh());
  go('listenStart');
}

// Esc는 언제든 녹음 목소리를 멈춘다(WCAG 1.4.2). 영상은 영상 자체의 재생/멈춤 단추로 다룬다
document.addEventListener('keydown', e => { if (e.key === 'Escape') L.stopVoice(); });
// v2.1 읽어 주기: 글자(제목 · 문단)를 누르면 그 장면을 처음부터 다시 읽는다. 읽는 중에 누르면 멈춘다
document.addEventListener('click', e => {
  if (!L.reading() || !e.target.closest?.('#scene h1, #scene p') || e.target.closest('button, a, input, video')) return;
  if (isSpeaking()) L.stopVoice(); else L.readPage(0);
});

hooks.render = render;
hooks.go = go;
hooks.restart = restart;
hooks.modal = () => {};
hooks.closeModal = () => {};

const need = p => fetch(p).then(r => { if (!r.ok) throw new Error(`${p} (${r.status})`); return r.json(); });
Promise.all([
  need('data/listen.json'), need('data/trials.json'), need('data/artifacts.json'),
  fetch('data/voice.json').then(r => (r.ok ? r.json() : null)).catch(() => null),   // 없으면 녹음 없이 글로만
  need('data/score.json')   // 점수와 엔딩(2026-11-18)
]).then(([l, t, a, v, sc]) => {
  data.listen = l; data.trials = t; data.artifacts = a; data.voice = v; data.score = sc;
  setState(fresh());
  load();   // 이 판의 저장 키(sayu-listen-v1)만 읽는다
  if (state.route !== 'listen' || !LISTEN_SCENES.includes(state.scene)) setState(fresh());
  state.listen = ensureListen(state.listen);
  // 다시 열면 시작 화면의 '이어서 하기'로 — 소리는 첫 누름 뒤에야 나기 때문
  if (state.scene !== 'listenStart') { state.listen.resume = state.scene; state.scene = 'listenStart'; }
  render();
  focusTitle();
}).catch(err => {
  $('#scene').innerHTML = `<h1>시작하지 못했습니다</h1><p>Chrome, Edge, Firefox 최신판으로 index.html을 다시 열어 보세요.</p><p>${esc(err.message)}</p>`;
  focusTitle();
});
