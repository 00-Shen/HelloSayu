// 시각장애인판의 마지막 세 장면(2026-11-18): 유태양의 마지막 제안(listenOffer) → 만남 → 점수 확인(listenResult) → 엔딩(listenEnd).
// 제안은 오리지널과 같은 글과 녹음(trials.json offer)을 쓰고, 고른 것은 오리지널과 같은 칸(state.trials.offerErased)에 남아 마음 점수가 된다.
// 점수는 js/score.js, 엔딩 글은 data/score.json. 고를 때 · 별마다 · 엔딩에서 소리와 진동을 함께 낸다.
import { $, esc, state, data, log, save, hooks, hush, sfx } from './core.js';
import { fill } from './trials-rules.js';
import { rowDetail, rowLabel, nextHint, starText, spokenSummary } from './score.js';
import { result, ringStars, videoHTML, leave as endingLeave } from './ending.js';
import * as sense from './sense.js';
import { LD, V2, IMG, tell, voice, bindReplay, head, stageHTML, replayHTML, confirmRestart, stopVoice, skipHTML, bindSkip, srLineHTML, reading } from './listen.js';
// v2(2026-11-21): 한 페이지 5개 이하. 제안의 하는 법은 대사 문단 끝으로, 점수 확인은 요약 한 문단 + '점수 자세히 듣기' 쪽으로,
// 엔딩은 이야기 한 문단 + 영상 재생(영상이 있으면 영상 속 목소리) + 다시 하기 · 점수 다시 보기.
import { bindPlayButton } from './film.js';

const C = () => data.score;
let beat = 0;
export function leave() { clearInterval(beat); beat = 0; endingLeave(); }

/* ---------- 마지막 제안 ---------- */
export function offerView() {
  const O = LD().offer, TO = data.trials.offer, t = state.trials, W = V2().offer, h = head(O.title);
  if (t.offerStep === 2) {
    return `${h}<div class="trials-night listen-night" aria-hidden="true"><div class="far-glass" style="--near:.5"><img src="${IMG.sayu}" alt=""></div></div>
      <p>${esc(TO.erased)} ${esc(O.erasedHint)}</p>
      <div class="row"><button type="button" class="btn primary" id="offerBack" data-key="offerBack">${esc(TO.back)}</button></div>`;
  }
  if (t.offerStep === 0) {
    return `${h}${stageHTML(O.first, '', W.entry, W.thought)}
      <div class="row">${replayHTML(O.first)}<button type="button" class="btn primary" id="offerNext" data-key="offerNext">${esc(TO.firstButton)}</button>${skipHTML()}</div>`;
  }
  // v2.1: 고르기는 화면의 위 · 아래 두 칸(누를 곳이 크고, 말로 '위쪽은 지운다 · 아래쪽은 이대로 간다'를 알려 준다).
  // 무대 그림은 빼고 짧은 물음만 보인다 — 두 칸이 첫 화면 안에 들어오게. 낭독기 · 읽어 주기는 대사와 설명 한 문단
  return `${h}
    <p class="offer-short" aria-hidden="true">${esc(W.short)}</p>
    <p class="sr-only">${srLineHTML(O.answer, '', W.choose)}</p>
    <div class="row offer-replay">${replayHTML(O.answer)}</div>
    <div class="choice-halves"><button type="button" class="btn half" id="offerErase" data-key="erase">${esc(TO.erase)}</button>
      <button type="button" class="btn half primary" id="offerKeep" data-key="keep">${esc(TO.keep)}</button></div>`;
}

export function offerBind() {
  const O = LD().offer, t = state.trials;
  if (t.offerStep === 0) {
    voice(O.first);
    bindReplay(O.first);
    bindSkip();
    $('#offerNext').onclick = () => { hush(); t.offerStep = 1; save(); hooks.go('listenOffer'); };
  } else if (t.offerStep === 1) {
    voice(O.answer, 900);
    bindReplay(O.answer);
    $('#offerErase').onclick = () => {
      hush();
      sfx('rival');   // 낮게 내려앉는 소리와 긴 진동: 흠이 지워진다
      t.offerStep = 2; t.offerErased++;
      log('offer_erase', { times: t.offerErased });
      save();
      hooks.go('listenOffer');
    };
    $('#offerKeep').onclick = () => {
      hush();
      sfx('found');   // 올라가는 소리와 다섯 번 진동: 흠을 안고 간다
      t.offerDone = true;
      log('offer_refused', { erased: t.offerErased });
      save();
      hooks.go('listenMeet');
    };
  } else {
    $('#offerBack').onclick = () => { t.offerStep = 1; save(); hooks.go('listenOffer'); };
  }
}

/* ---------- 점수 확인 ---------- */
// 칸마다 한 문장으로 이어 한 문단에(낭독기가 머무는 곳 하나)
const rowsText = (rows, T) => rows.map(row => `${rowLabel(row, T)} ${fill(T.pointsSpoken, { n: row.points, max: row.max })}(${rowDetail(row, T)})`).join(', ');
let detail = false;   // '점수 자세히 듣기' 쪽을 보고 있는가(장면 안의 쪽, 저장하지 않는다)

export function resultView() {
  const r = result('listen'), T = C().text, E = C().endings_text[r.ending], W = V2().result;
  if (detail) {
    return `${head(W.detailTitle)}
      <p>${esc(T.skill)} ${esc(fill(T.pointsSpoken, { n: r.skillPoints, max: r.skillMax }))}: ${esc(rowsText(r.skill, T))}.</p>
      <p>${esc(T.heart)} ${esc(fill(T.pointsSpoken, { n: r.heartPoints, max: r.heartMax }))}: ${esc(rowsText(r.heart, T))}. ${esc(T.lead)}</p>
      <div class="row"><button type="button" class="btn primary" id="detailBack" data-key="detailBack">${esc(W.back)}</button></div>`;
  }
  return `${head(T.title)}
    <p class="status">${esc(fill(T.totalSpoken, { n: r.total, max: r.max }))} · <span aria-hidden="true">${starText(r.stars)}</span><span class="sr-only">${esc(fill(T.starsSpoken, { n: r.stars }))}</span>.
      ${esc(T.endingIs)}: <b>${esc(E.name)} 「${esc(E.title)}」</b>. ${esc(nextHint(r, C()))}</p>
    <div class="row"><button type="button" class="btn primary" id="toEnding" data-key="toEnding">${esc(T.toEnding)}</button>
      <button type="button" class="btn" id="toDetail" data-key="toDetail">${esc(W.detail)}</button>
      <button type="button" class="btn" id="scoreAgain" data-key="scoreAgain">${esc(T.again)}</button></div>`;
}

export function resultBind() {
  const r = result('listen');
  leave();
  if (detail) {
    $('#detailBack').onclick = () => { detail = false; hooks.render(); $('#toDetail')?.focus({ preventScroll: true }); };
    return;
  }
  ringStars(r.stars, 1500);   // 낭독기가 제목을 읽은 뒤, 별 수만큼 종소리와 진동
  // 읽어 주기에서는 장면 글(점수 문단)을 이미 읽으므로 요약은 글 알림으로만
  setTimeout(() => { if (state.scene === 'listenResult' && !detail) tell(spokenSummary(r, C()), true, !reading()); }, 1500 + r.stars * 650 + 300);
  $('#toEnding').onclick = () => { hush(); hooks.go('listenEnd'); };
  $('#toDetail').onclick = () => { hush(); detail = true; hooks.render(); $('h1')?.focus?.({ preventScroll: true }); };
  confirmRestart($('#scoreAgain'));
}

/* ---------- 엔딩 ---------- */
export function endView() {
  const r = result('listen'), T = C().text, E = C().endings_text[r.ending], LE = LD().end, line = { who: 'sayu', text: E.line };
  // 영상(화면 해설판)은 '영상 재생' 단추로 다룬다: 영상 자체는 눈으로 보는 사람에게 두고, 낭독기 차례에서는 뺀다
  const video = (videoHTML(E, 'ending-video listen-video', true) || '').replace('<video ', '<video tabindex="-1" aria-hidden="true" ');
  const lead = `${fill(T.starsSpoken, { n: r.stars })} · ${fill(T.total, { n: r.total, max: r.max })}. ${E.narration}`;
  return `${head(`${E.name} · ${E.title}`)}
    ${video}
    ${stageHTML(line, data.trials.garden.eyebrow, lead, `${state.listen?.short ? LD().short.endSummary : LE.summary} ${LE.thanks}`)}
    <div class="row">${video ? `<button type="button" class="btn" id="endPlay" data-key="endPlay">${esc(data.trials.prologue.film.play)}</button>` : replayHTML(line)}
      <button type="button" class="btn primary" id="again" data-key="again">${esc(LE.again)}</button>
      <button type="button" class="btn" id="toResult" data-key="toResult">${esc(T.toResult)}</button></div>`;
}

export function endBind() {
  const r = result('listen'), E = C().endings_text[r.ending], line = { who: 'sayu', text: E.line };
  leave();
  if (!state.listen.doneAt) {
    state.listen.doneAt = Date.now();
    log('listen_done', { ms: state.listen.doneAt - state.startedAt, caught: state.listen.giant.caught, touches: state.trials.reach.touches, total: r.total, ending: r.ending });
    save();
  }
  if (!$('.ending-video')) voice(line);   // 영상이 있으면 영상 속 목소리로 듣는다
  else {
    const v = $('.ending-video');
    bindPlayButton(v, $('#endPlay'), data.trials.prologue.film);   // 다른 두 영상과 같은 '영상 재생' 단추
    v.addEventListener('play', () => { if (v.isConnected) stopVoice(); });   // 영상과 녹음 대사가 겹치지 않게
    $('[data-replay]')?.addEventListener('click', () => v.pause());
  }
  bindReplay(line);
  // 편안한 심장박동(진동과 낮은 북소리)을 별 수의 두 배만큼
  let n = 0;
  sense.gardenBeat();
  beat = setInterval(() => { if (++n >= r.stars * 2 || state.scene !== 'listenEnd') { clearInterval(beat); return; } sense.gardenBeat(); }, 1100);
  confirmRestart($('#again'));
  $('#toResult').onclick = () => { hush(); detail = false; hooks.go('listenResult'); };
}

