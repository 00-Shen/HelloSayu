// 게임 속 영상(2026-11-19). 영상은 tools/make_videos.py가 만들고 --publish로 video/에 둔다.
// 오리지널은 기본판, 시각장애인판은 화면 해설판(srcAd)을 쓴다.
//  - 상황 설명 영상: 시련을 시작하면 프롤로그 앞에서 한 번(건너뛸 수 있음). 글과 경로는 data/trials.json의 prologue.film
//  - 작품 소개 영상: 시작 화면에 두고, 원할 때만 본다(저절로 재생하지 않음). data/trials.json의 overview
import { $, esc, log, asset, hush } from './core.js';
import { duck } from './music.js';

/** 자막이 달린 영상 태그.
 *  speech(대사만 남긴 자막)가 있으면 그것을 기본으로 켜고, [음악] · [게임 소리]까지 담은 원래 자막은
 *  영상의 자막 메뉴에서 고르는 두 번째 자막(소리 설명 포함)으로 둔다(2026-11-20, 청각장애 관람자는 메뉴에서 고른다) */
function videoTag({ src, caps, speech = '', label, poster = '', cls }) {
  const tracks = speech
    ? `<track kind="subtitles" srclang="ko" label="한국어" src="${asset(speech)}" default>
        <track kind="captions" srclang="ko" label="한국어 (소리 설명 포함)" src="${asset(caps)}">`
    : `<track kind="captions" srclang="ko" label="한국어" src="${asset(caps)}" default>`;
  return `<video class="${cls}" src="${asset(src)}" controls playsinline preload="${poster ? 'metadata' : 'auto'}"${poster ? ` poster="${asset(poster)}"` : ''} aria-label="${esc(label)}">
        ${tracks}
      </video>`;
}

/** 재생/멈춤 단추(시각장애인판): 누르면 재생하거나 멈추고, 글이 지금 할 수 있는 일로 바뀐다 */
export function bindPlayButton(v, btn, F) {
  if (!btn) return;
  const label = () => { btn.textContent = v.paused ? F.play : F.pause; };
  btn.addEventListener('click', () => { (v.paused ? v.play?.() : v.pause?.())?.catch?.(() => {}); });
  v.addEventListener('play', label);
  v.addEventListener('pause', label);
  label();
}

/** 화면 해설 대본: 접어 둔 목록. 오리지널(기본판 영상)에서 영상이 화면으로만 전하는 것을 글로 읽게 한다(WCAG 1.2.3, 2026-11-19).
 *  시각장애인판은 해설이 영상 소리에 들어 있으므로 넣지 않는다 */
const scriptOpen = {};   // 다시 그려도 펼친 상태를 지킨다(설정을 바꾸면 시작 화면을 통째로 다시 그린다)
const adScriptHTML = (F, key) => (F.adScript?.length ? `<details class="ad-script" data-script="${key}"${scriptOpen[key] ? ' open' : ''}>
      <summary id="adScript-${key}">${esc(F.adScriptLabel)}</summary>
      <ol>${F.adScript.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>` : '');
function bindScript(key) {
  const d = document.querySelector(`details[data-script="${key}"]`);
  if (d) d.addEventListener('toggle', () => { scriptOpen[key] = d.open; });
}

/* ---------- 상황 설명 영상 ---------- */
/** 영상 자리(자막 포함). described면 화면 해설판 */
export function filmHTML(F, described = false) {
  return `<div class="film-wrap"><figure class="film">
      ${videoTag({ src: described ? F.srcAd : F.src, caps: described ? F.captionsAd : F.captions, speech: described ? '' : F.captionsSpeech, label: F.label, cls: 'film-video' })}
    </figure>${described ? '' : adScriptHTML(F, 'film')}</div>`;
}

/** 다 보거나 건너뛰면 onDone(how). #filmPlay가 있으면 재생/멈춤 단추로 쓴다(시각장애인판). */
let lastFilm = null;   // 지난번에 묶은 상황 설명 영상(다시 그리면 보던 자리에서 잇는다)
export function bindFilm(F, onDone, { autoplay = false } = {}) {
  const v = $('.film-video');
  if (!v) return;
  const old = lastFilm;
  lastFilm = v;
  let carry = null;
  if (old && old !== v && !old.isConnected && old.getAttribute('src') === v.getAttribute('src')) {
    carry = { t: old.currentTime || 0, playing: !old.paused };
    old.pause?.();
  }
  bindScript('film');
  let done = false;
  const finish = how => {
    if (done) return;
    done = true;
    v.pause?.();
    if (low) { low = false; duck(false); }
    log('film_done', { how, at: Math.round(v.currentTime || 0) });
    onDone(how);
  };
  // 영상이 나오는 동안에는 대사와 BGM이 겹치지 않게: 재생하면 목소리를 멈추고 BGM을 낮추며, 멈추거나 끝나면 되돌린다
  let low = false;
  const unduck = () => { if (low) { low = false; duck(false); } };
  v.addEventListener('play', () => { if (!v.isConnected) return; hush(); if (!low) { low = true; duck(true); } });
  v.addEventListener('pause', () => { if (v.isConnected) unduck(); });
  v.addEventListener('ended', () => {
    if (!v.isConnected) return;
    unduck();
    // 화면 해설 대본을 펼쳐 읽는 중이면 넘기지 않고 '건너뛰기'(다음) 단추로 초점만 옮긴다
    const d = document.querySelector('details[data-script="film"]');
    if (d && (d.open || d.contains(document.activeElement))) { $('#filmSkip')?.focus(); return; }
    finish('ended');
  });
  $('#filmSkip')?.addEventListener('click', () => finish('skip'));
  bindPlayButton(v, $('#filmPlay'), F);
  log('film_view', { src: v.getAttribute('src') ? 'set' : 'none' });
  if (carry) {
    if (carry.t > 0) { try { v.currentTime = carry.t; } catch { /* 아직 길이를 모르면 처음부터 */ } }
    if (carry.playing) v.play?.().catch(() => {});
  } else if (autoplay) v.play?.().catch(() => {});
}

/* ---------- 작품 소개 영상(시작 화면) ---------- */
/** 영상과 아래 설명 한 줄. described면 화면 해설판(설명은 시각장애인판이 따로 쓴다) */
export function overviewHTML(O, described = false) {
  const tag = videoTag({
    src: described ? O.srcAd : O.src, caps: described ? O.captionsAd : O.captions, speech: described ? '' : O.captionsSpeech,
    poster: described ? O.posterAd : O.poster, label: O.label, cls: 'overview-video'
  });
  if (described) return `<figure class="film overview-film">${tag}</figure>`;
  return `<div class="overview-film"><figure class="film">
      ${tag}
      <figcaption><b>${esc(O.title)}</b> · ${esc(O.note)}</figcaption>
    </figure>${adScriptHTML(O, 'overview')}</div>`;
}

// 시작 화면은 설정을 바꿀 때마다 통째로 다시 그린다(innerHTML). 그때 떼어 낸 옛 영상은 브라우저가 조금 뒤에야 멈추고
// 'pause'도 늦게 보낸다. 그래서 다시 그릴 때 옛 영상을 직접 보고(재생 중이었는지, 어디까지 봤는지) 그 자리에서 멈춘 뒤 새 영상에서 잇는다.
// 떼어 낸 영상이 늦게 보내는 이벤트는 모두 무시한다(새 영상이 낮춘 BGM을 도로 올리지 않게).
let last = null;      // 지난번에 묶은 소개 영상 요소
let ducked = false;   // 소개 영상이 BGM을 낮춰 두었는가(다른 목소리가 낮춘 것과 구별)
const release = () => { if (ducked) { ducked = false; duck(false); } };

/** 소개 영상을 바로 멈춘다(목소리 시험처럼 사유가 다른 말을 하기 직전에). BGM 낮춤도 지금 푼다 */
export function stopOverview() {
  const v = $('.overview-video');
  if (v && !v.paused) v.pause();
  release();
}

/** 작품 소개 영상: 재생하면 사유의 말과 겹치지 않게 다른 목소리를 멈추고 BGM을 낮춘다. #overviewPlay가 있으면 재생/멈춤 단추 */
export function bindOverview(O) {
  const v = $('.overview-video');
  if (!v) return;
  bindScript('overview');
  const old = last;
  last = v;
  let resumed = false;   // 다시 그려 이어 재생한 것은 사용자가 누른 재생으로 기록하지 않는다
  if (old && old !== v && !old.isConnected && old.getAttribute('src') === v.getAttribute('src')) {
    const playing = !old.paused, t = old.currentTime || 0;
    if (playing) { old.pause(); release(); }
    v.muted = old.muted; v.volume = old.volume;   // 소리 끔 · 음량도 그대로
    ducked = false;
    if (t > 0) { try { v.currentTime = t; } catch { /* 아직 길이를 모르면 처음부터 */ } }
    if (playing) { resumed = true; v.play?.().catch(() => { resumed = false; }); }
  }
  v.addEventListener('play', () => {
    if (!v.isConnected) return;
    hush();        // 목소리 시험이나 대사가 흐르고 있었다면 멈춘다
    duck(true);
    ducked = true;
    if (resumed) { resumed = false; return; }
    log('overview_play', { at: Math.round(v.currentTime || 0) });
  });
  v.addEventListener('pause', () => { if (v.isConnected && !v.ended) release(); });
  v.addEventListener('ended', () => {
    if (!v.isConnected) return;
    release();
    log('overview_done', { how: 'ended' });
  });
  bindPlayButton(v, $('#overviewPlay'), O);
}
