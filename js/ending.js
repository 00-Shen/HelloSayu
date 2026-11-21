// 점수 확인과 엔딩(2026-11-18) — 오리지널판. 만남(유태양 퇴장) → 점수 확인(result) → 엔딩(ending) → 벚꽃 정원.
// 점수 계산은 js/score.js, 배점과 글은 data/score.json. 엔딩 영상(endings_text.*.video)이 생기면 그림 대신 영상을 띄운다.
import { $, esc, state, data, log, save, speak, hooks, asset, announce } from './core.js';
import * as sense from './sense.js';
import { computeScore, rowDetail, rowLabel, nextHint, starText, spokenSummary } from './score.js';
import { fill } from './trials-rules.js';

const C = () => data.score;
const SAYU = asset('assets/character/sayu-reference-web.png');
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
export function leave() { timers.forEach(clearTimeout); timers = []; }

/** 게임을 마친 순간의 점수를 저장한다(완수 카드도 이 값을 쓴다) */
export function finish(edition) {
  const r = computeScore({ edition, state, cfg: C() });
  state.result = r;
  log('score_result', { edition, total: r.total, skill: r.skillPoints, heart: r.heartPoints, ending: r.ending, stars: r.stars });
  save();
  return r;
}
/** 저장된 점수(예전 저장처럼 없으면 지금 계산) */
export const result = edition => (state.result?.edition === edition ? state.result : finish(edition));

/** 별 수만큼 한 음씩 올라가는 종소리와 진동 */
export function ringStars(n, delay = 500) {
  for (let i = 0; i < n; i++) later(() => sense.star(i), delay + i * 650);
}

/** 엔딩 영상이 있으면 영상(자막 포함), 없으면 null. described면 화면 해설판(videoAd)을 먼저 쓴다(시각장애인판) */
export function videoHTML(E, cls = 'ending-video', described = false) {
  const src = (described && E.videoAd) || E.video;
  if (!src) return null;
  const caps = (described && E.captionsAd) || E.captions;
  const track = caps ? `<track kind="captions" srclang="ko" label="한국어" src="${asset(caps)}" default>` : '';
  // 영상의 이름(WCAG 1.1.1 · 4.1.2): 어느 엔딩인지, 화면 해설판인지
  const label = `${E.name} 영상${described && E.videoAd ? ' (화면 해설판)' : ''}`;
  return `<video class="${cls}" src="${asset(src)}" controls playsinline preload="auto" aria-label="${esc(label)}">${track}</video>`;
}

/* ---------- 점수 확인 ---------- */
function rowsHTML(rows, T) {
  return `<ul class="score-rows">${rows.map(r => `<li class="${r.points >= r.max ? 'full' : ''}">
    <span class="score-label"><b>${esc(rowLabel(r, T))}</b><small>${esc(rowDetail(r, T))}</small></span>
    <span class="score-pt">${esc(fill(T.points, { n: r.points, max: r.max }))}</span></li>`).join('')}</ul>`;
}

function resultView() {
  const r = result('original'), T = C().text, E = C().endings_text[r.ending];
  return `
    <section class="trials-stage score-stage ending-${r.ending}">
      <header class="scene-head"><div class="eyebrow">${esc(T.eyebrow)}</div><h1>${esc(T.title)}</h1><p>${esc(T.lead)}</p></header>
      <div class="score-cols">
        <section class="score-col" aria-label="${esc(T.skill)}"><h2>${esc(T.skill)} <span>${esc(fill(T.points, { n: r.skillPoints, max: r.skillMax }))}</span></h2>${rowsHTML(r.skill, T)}</section>
        <section class="score-col" aria-label="${esc(T.heart)}"><h2>${esc(T.heart)} <span>${esc(fill(T.points, { n: r.heartPoints, max: r.heartMax }))}</span></h2>${rowsHTML(r.heart, T)}</section>
      </div>
      <div class="score-total">
        <p class="score-sum">${esc(fill(T.total, { n: r.total, max: r.max }))}</p>
        <p class="score-stars" role="img" aria-label="${esc(fill(T.starsSpoken, { n: r.stars }))}">${starText(r.stars)}</p>
        <p class="score-ending"><span class="eyebrow">${esc(T.endingIs)}</span><b>${esc(E.name)} · ${esc(E.title)}</b></p>
        <p class="score-next">${esc(nextHint(r, C()))}</p>
      </div>
      <div class="actions">
        <button class="btn primary" id="toEnding">${esc(T.toEnding)}</button>
        <button class="btn secondary" id="scoreAgain">${esc(T.again)}</button>
      </div>
    </section>`;
}

function resultBind() {
  const r = result('original');
  leave();
  ringStars(r.stars);
  later(() => announce(spokenSummary(r, C())), 400);
  $('#toEnding').onclick = () => hooks.go('ending');
  $('#scoreAgain').onclick = () => hooks.restart?.();
}

/* ---------- 엔딩 ---------- */
function endingView() {
  const r = result('original'), T = C().text, E = C().endings_text[r.ending];
  const petals = Array.from({ length: r.stars * 8 }, (_, i) => `<i class="petal" style="--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%;--d:${5 + ((i * 13) % 6)}s;--s:-${(i * 29) % 5}s"></i>`).join('');
  return `
    <section class="garden-stage ending-stage ending-${r.ending}">
      <div class="garden-petals" aria-hidden="true">${petals}</div>
      ${videoHTML(E) || `<img class="garden-sayu" src="${SAYU}" alt="${esc(data.trials.garden.alt)}">`}
      <div class="garden-bottom">
        <div class="eyebrow"><span aria-hidden="true">${starText(r.stars)}</span> ${esc(E.name)}</div>
        <h1 class="ending-title">${esc(E.title)}</h1>
        <p class="ending-narration">${esc(E.narration)}</p>
        <span class="fiction-label">창작 캐릭터 대사</span>
        <p class="fiction garden-line">“${esc(E.line)}”</p>
        <div class="actions">
          <button class="btn primary" id="toGarden">${esc(T.toGarden)}</button>
          <button class="btn secondary" id="toResult">${esc(T.toResult)}</button>
        </div>
      </div>
    </section>`;
}

function endingBind() {
  const r = result('original'), E = C().endings_text[r.ending];
  leave();
  log('ending_view', { ending: r.ending, video: !!E.video });
  const v = $('.ending-video');
  if (v) v.play?.().catch(() => {});   // 영상에 사유의 목소리가 들어 있다
  else later(() => speak(E.line), 600);
  sense.gardenBeat();
  $('#toGarden').onclick = () => hooks.go('garden');
  $('#toResult').onclick = () => hooks.go('result');
}

export const views = { result: resultView, ending: endingView };
export const binds = { result: resultBind, ending: endingBind };
