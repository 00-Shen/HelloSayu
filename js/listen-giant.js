// 시각장애인판 · 첫째 시련 「외눈 거인의 동굴」(2026-11-12).
// 신화: 거인의 눈은 하나뿐이라 그 눈이 돌아간 사이에 움직이고, 이름을 물으면 '아무도 아니다'라고 답한다.
// 오리지널은 화면의 눈으로 때를 알렸다. 여기서는 소리가 먼저다 — 다가오는 발소리(곧 돌아봄), 그르렁대는 숨소리(보고 있음),
// 멀어지는 발소리와 종소리(돌아섰음). 바뀔 때 말로도 한 번 알린다. 거인의 박자는 오리지널과 같은 gazeAt을 쓴다.
// v2(2026-11-21): 한 페이지 5개 이하 — 들머리(신화 · 하는 법 듣고 시작하기 · 건너뛰기) → 하는 법 쪽 → 동굴.
// 동굴에서는 조각 단추 셋과 자리 단추 다섯 대신, 조각은 관 → 손 → 다리 차례로 저절로 손에 들고
// '다음 자리 듣기'(누를 때마다 빈 자리를 높이에 맞춘 음으로 알림)와 '붙이기' 두 단추로 한다. 상태 글 하나가 거인 · 조각 · 남은 수를 함께 말한다.
import { $, $$, esc, state, data, log, save, hooks, sfx } from './core.js';
import * as sense from './sense.js';
import { pluckSfx } from './music.js';
import { gazeAt, fill } from './trials-rules.js';
import { PIECES, SETTLED, ZONES, placeOutcome, giantTodo, cycleNext, cycleFix, firstLoose, piecesLeft } from './listen-rules.js';
import { LD, V2, tell, head, howtoPage, bindSampleCycle, skipHTML, bindSkip } from './listen.js';

const G = () => LD().giant;
const TG = () => data.trials.giant;
const lg = () => state.listen.giant;
const zoneOf = () => Object.fromEntries(data.artifacts.artifacts.map(a => [a.id, a.zone]));

let timer = 0, t0 = null, phase = null;
const gaze = () => gazeAt(state.startedAt || 1, performance.now() - t0, lg().slow);
const watching = () => t0 !== null && gaze().watching;
const phaseText = k => (k === 'watch' ? TG().watching : k ? TG()[k] : '');

/** 장면을 떠날 때: 거인의 박자를 처음으로 돌리고 숨소리를 멈춘다 */
export function leave() {
  clearInterval(timer);
  timer = 0; t0 = null; phase = null;
  sense.giantGlareStop();
}

const artOf = id => data.artifacts.artifacts.find(a => a.id === id);
const usedZones = () => { const z = zoneOf(); return new Set([...SETTLED.map(id => z[id]), ...Object.values(lg().placed)]); };

const openZone = z => !usedZones().has(z);
const zoneIdx = () => { const g = lg(); g.zone = cycleFix(ZONES, g.zone || 0, openZone); return g.zone; };
const ZONE_PITCH = { 'crown-zone': 784, 'face-zone': 659.25, 'hand-zone': 587.33, 'robe-zone': 523.25, 'leg-zone': 392 };   // 위쪽 자리일수록 높은 음
function statusText() {
  const g = lg(), n = piecesLeft(g), W = V2().giant;
  if (!n) return W.statusDone;
  return fill(W.status, { gaze: phaseText(phase) || '', name: G().pieces[g.picked || firstLoose(g)].name, n }).trim();
}
/** 본게임 '폴리페모스의 벽'의 상: 반가사유상 사진 위 자리 표시(마우스 · 터치용). v2: 낭독기에서는 통째로 뺀다 */
function statueHTML() {
  const used = usedZones();
  return `<section class="statue-stage listen-statue" aria-hidden="true">
    <img src="${data.artifacts.work.image}" alt="">
    ${data.artifacts.zones.map(z => `<button type="button" class="zone ${used.has(z.id) ? 'correct' : ''}" data-mark="${z.id}" tabindex="-1"
      style="left:${z.x}%;top:${z.y}%" ${used.has(z.id) ? 'disabled' : ''}>${esc(G().zones[z.id])}</button>`).join('')}
  </section>`;
}
/** 본게임과 같은 거인의 눈 띠(보고 있으면 붉게). 눈 그림은 낭독기에서 빼고, 상태 글 하나만 읽힌다 */
const stripHTML = () => `<section class="giant-strip" data-gaze="${phase || 'away'}">
  <div class="giant-eye" aria-hidden="true"><i></i></div>
  <p class="giant-status status" id="giantStatus">${esc(statusText())}</p></section>`;

export function view() {
  const g = lg(), W = V2().giant;
  if (!g.started) {
    return howtoPage({ name: G().title, lead: data.trials.myth.reconstruct.story, body: W.howtoBody, credit: G().credit, sounds: G().howto.sounds, goLabel: G().begin });
  }
  if (PIECES.every(id => g.placed[id])) {
    // v2.1: 단추 줄을 장면 맨 끝으로 꺼내 화면 아래에 붙인다(조각상 아래에 있으면 작은 휴대폰에서 첫 화면 밖, 2026-11-21 360x740 검사)
    return `${head(G().title)}<div class="recon-layout listen-recon">${statueHTML()}</div>
      <p>${esc(g.escaped ? TG().escaped : TG().who)}</p>
      <div class="row">${g.escaped
        ? `<button type="button" class="btn primary" id="giantOut" data-key="out">${esc(TG().out)}</button>`
        : `<button type="button" class="btn primary" id="nobody" data-key="nobody">${esc(TG().nobody)}</button>`}</div>`;
  }
  const zone = G().zones[ZONES[zoneIdx()]];
  return `${head(G().title)}${stripHTML()}
    <div class="recon-layout listen-recon">${statueHTML()}</div>
    <div class="row">
      <button type="button" class="btn" id="zoneNext" data-key="zoneNext">${esc(fill(W.zone, { zone }))}</button>
      <button type="button" class="btn primary" id="placeBtn" data-key="place">${esc(fill(W.place, { zone }))}</button>
      ${skipHTML()}</div>`;
}

function tickGaze() {
  const r = gaze(), k = r.watching ? 'watch' : r.warn ? 'warn' : 'away';
  if (k === phase) return;
  phase = k;
  if (k === 'warn') sense.giantStep();
  if (k === 'watch') sense.giantGlareStart(); else sense.giantGlareStop();
  if (k === 'away') sense.giantAway();
  const st = $('#giantStatus');
  if (st) st.textContent = statusText();
  const strip = $('.giant-strip');
  if (strip) strip.dataset.gaze = k;
  tell(phaseText(k));
}

function pickPiece(id) {
  const g = lg();
  g.picked = id;
  log('piece_selected', { artifact_id: id });
  save();
  $$('[data-piece]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.piece === id)));
  const P = G().pieces[id];
  tell(fill(G().picked, { name: P.name, touch: P.touch }), true);
}

function place(zone) {
  const g = lg(), piece = g.picked;
  const out = placeOutcome({ piece, zone, watching: watching(), zoneOf: zoneOf() });
  log('listen_place', { piece, zone, out });
  if (out === 'none') { tell(G().noPiece, true); return; }
  if (out === 'settled') return;
  if (out === 'caught') { g.caught++; sense.wallHit(); tell(TG().caught, true); save(); return; }
  if (out === 'wrong') { g.wrong++; sfx('wrong'); tell(G().hints[piece], true); save(); return; }
  g.placed[piece] = zone;
  g.picked = firstLoose(g);
  sfx('correct');
  save();
  const n = PIECES.filter(id => !g.placed[id]).length;
  hooks.render();
  if (!n) { tell(TG().who, true); $('#nobody')?.focus({ preventScroll: true }); return; }
  // 다음 조각은 저절로 손에 든다 — 붙인 결과와 새 조각의 촉감을 한 문장으로(WCAG 4.1.3)
  const P = G().pieces[lg().picked];
  tell(`${fill(G().placed, { name: G().pieces[piece].name, zone: G().zones[zone], n })} ${fill(G().picked, { name: P.name, touch: P.touch })}`, true);
}

const SAMPLE = { away: () => sense.giantAway(), step: () => sense.giantStep(), glare: () => sense.giantGlareSample(), caught: () => sense.wallHit() };

function nowText() {
  const g = lg(), todo = giantTodo(g);
  const name = g.picked ? G().pieces[g.picked].name : '';
  return `${fill(G().now[todo.key], { n: todo.n, name })} ${todo.key === 'pick' || todo.key === 'place' ? phaseText(phase) : ''}`.trim();
}

export function bind() {
  const g = lg();
  clearInterval(timer);
  timer = 0;
  bindSkip();
  if (!g.started) {
    bindSampleCycle(G().howto.sounds, id => SAMPLE[id]?.());
    $('#howtoGo').onclick = () => { g.started = true; g.picked = firstLoose(g); log('listen_giant_start', { slow: g.slow }); save(); hooks.go('listenGiant'); };
    return;
  }
  if (PIECES.every(id => g.placed[id])) {
    sense.giantGlareStop();   // 다 붙였으면 거인은 더 보지 않는다
    $('#nobody')?.addEventListener('click', () => {
      g.escaped = true;
      log('giant_nobody');
      sense.giantStep();
      save();
      hooks.render();
      $('#giantOut')?.focus({ preventScroll: true });
      tell(TG().escaped, true);
    });
    $('#giantOut')?.addEventListener('click', () => hooks.go('listenGallery'));
    return;
  }
  if (!g.picked) g.picked = firstLoose(g);
  $('#zoneNext').onclick = () => {
    g.zone = cycleNext(ZONES, zoneIdx(), openZone);
    save();
    const z = ZONES[g.zone], zone = G().zones[z], W = V2().giant;
    pluckSfx(ZONE_PITCH[z] || 523.25, { gain: 0.3, seconds: 0.6 });
    $('#zoneNext').textContent = fill(W.zone, { zone });
    $('#placeBtn').textContent = fill(W.place, { zone });
    tell(fill(W.zoneSaid, { zone }), true);
  };
  $('#placeBtn').onclick = () => place(ZONES[zoneIdx()]);
  $$('[data-mark]').forEach(b => { b.onclick = () => place(b.dataset.mark); });   // 그림 속 자리 표시(마우스·터치)
  if (t0 === null) t0 = performance.now();   // 같은 장면 안에서 다시 그려도 거인의 박자는 이어진다
  timer = setInterval(tickGaze, 100);
  tickGaze();
}
