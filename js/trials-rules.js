// 「사유자의 시련」의 순서, 잠금, 몸의 기록을 계산한다. DOM을 쓰지 않아 node로 시험할 수 있다.
export const TRIAL_ORDER = ['dig', 'study', 'reconstruct', 'cast', 'scylla', 'underworld'];
export const AFTER_VERDICT = ['scylla', 'underworld'];
export const BREATH_MS = 2500;
export const BREATHS = 3;
export const GRID = 5;
/** 신화 카드와 신화 규칙이 붙는 시련(2026-11-11). 시련 1·6은 그대로 둔다. */
export const MYTH_TRIALS = ['study', 'reconstruct', 'cast', 'scylla'];
export const ROPES = 3;

export function freshTrials() {
  return {
    introStep: 0, filmSeen: false, verdictSeen: false, tapMode: false,
    galStarted: false, galleryDone: false,   // 저승 앞 청동 전시실(11주차)
    mythSeen: {},
    siren: { ropes: ROPES, falls: 0, retied: 0 },
    giant: { caught: 0, slow: false },
    scylla: freshScylla(),
    bridged: {},   // 시련판에서 흙손 영감이 다음 정박지를 소개한 시련
    marked: {},    // 시련판에서 '새 흔적' 창을 보여 준 시련
    underworld: { round: 0, misses: 0, moved: 0, sinceMove: 0, assist: false },
    offerStep: 0, offerErased: 0, offerDone: false,
    met: false, meetStep: 0, breaths: 0, meetDone: false,   // breaths: 만남의 '닿을 듯 멈추기'에서 마친 회차(예전 호흡 횟수 자리)
    reach: { touches: 0, slow: false }
  };
}

export function trialDone(state, id, total = 5) {
  switch (id) {
    case 'dig': return new Set(state.found).size >= total;
    case 'study': return state.codex.length >= total;
    case 'reconstruct': return Object.keys(state.reconstruction).length >= total;
    case 'cast': return !!state.cast?.done && (state.cast.grade === 'A' || state.cast.grade === 'B');
    case 'scylla': return (state.trials.scylla?.narrow || 0) >= NARROWS;
    case 'underworld': return state.trials.underworld.round >= 3;
    default: return false;
  }
}

export function trialOpen(state, id, total = 5) {
  const i = TRIAL_ORDER.indexOf(id);
  if (i < 0) return false;
  if (AFTER_VERDICT.includes(id) && !state.trials.verdictSeen) return false;
  return i === 0 || trialDone(state, TRIAL_ORDER[i - 1], total);
}

const FIRST_FOUR = TRIAL_ORDER.slice(0, 4);
export const firstFourDone = (state, total = 5) => FIRST_FOUR.every(id => trialDone(state, id, total));
export const allTrialsDone = (state, total = 5) => TRIAL_ORDER.every(id => trialDone(state, id, total));
/** 저승에 내려갈 준비가 되었는가: 청동 전시실 두 방을 마쳤거나, 예전 저장에서 이미 저승을 시작했다. */
export const galleryReady = t => !!t.galleryDone || (t.underworld?.round || 0) > 0;
/** 사전 질문에 답했는가. 답하기 전에는 시련판(허브)에 들어갈 수 없다. */
export const pretestDone = state => Object.keys(state.preAnswers || {}).length > 0;

/** 장면 이동의 유일한 관문. 들어갈 수 없는 장면을 요청하면 지금 있어야 할 장면을 돌려준다. */
export function resolveScene(state, scene, total = 5) {
  if (state.route !== 'trials') return scene;
  const t = state.trials;
  const home = () => resolveScene(state, 'hub', total);
  switch (scene) {
    case 'intro': case 'trialIntro': case 'pretest': return scene;
    case 'gallery': return scene;   // 11주차 청동 전시실 — 시련과 따로 언제든 들어갈 수 있는 전시 모드
  }
  // 프롤로그와 사전 질문을 건너뛰고 시련판·시련으로 오지 못하게 한다 (예: 시작 화면 → 청동 전시실 → 나가기)
  if (!pretestDone(state)) return t.introStep > 0 ? 'trialIntro' : 'intro';
  switch (scene) {
    case 'hub':
      if (t.meetDone) return 'garden';
      if (t.offerDone) return 'meet';
      if (allTrialsDone(state, total)) return 'offer';
      if (firstFourDone(state, total) && !t.verdictSeen) return 'verdict';
      return 'hub';
    case 'verdict': return firstFourDone(state, total) && !t.verdictSeen ? scene : home();
    case 'offer': return allTrialsDone(state, total) && !t.offerDone ? scene : home();
    case 'meet': return t.offerDone && !t.meetDone ? scene : home();
    case 'result': case 'ending': case 'garden': case 'talk': case 'complete': return t.meetDone ? scene : home();
    // 저승은 눈이 소용없는 곳이라, 흙손 영감이 먼저 청동 전시실에서 귀와 손으로 읽는 법을 익히게 한다
    case 'galIntro': return !trialOpen(state, 'underworld', total) ? home() : galleryReady(t) ? 'underworld' : scene;
    case 'underworld': return !trialOpen(state, 'underworld', total) ? home() : galleryReady(t) ? scene : 'galIntro';
    default: return trialOpen(state, scene, total) ? scene : home();
  }
}

/** 시련판의 먼 유리장 크기(0~1). 무효 선언을 받으면 다시 멀어진다. */
export function nearness(state, total = 5) {
  const done = TRIAL_ORDER.filter(id => trialDone(state, id, total)).length;
  if (!state.trials.verdictSeen) return (Math.min(done, 4) / 4) * 0.8;
  return 0.25 + (Math.max(0, done - 4) / 2) * 0.75;
}

function mix(seed, a, b) {
  let h = (seed ^ Math.imul(a, 2654435761) ^ Math.imul(b, 40503)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const ZONES = [[0, 1], [2, 2], [3, 4]]; // 왼쪽, 가운데, 오른쪽 머리

export function underworldTarget(seed, round, moved) {
  const [lo, hi] = ZONES[round];
  const h = mix(seed >>> 0, round + 1, moved + 1);
  const t = { row: h % GRID, col: lo + ((h >>> 8) % (hi - lo + 1)) };
  if (moved > 0) {
    const prev = underworldTarget(seed, round, moved - 1);
    if (prev.row === t.row && prev.col === t.col) t.row = (t.row + 1) % GRID;
  }
  return t;
}

export function beatsAt(cell, target) {
  const d = Math.max(Math.abs(cell.row - target.row), Math.abs(cell.col - target.col));
  return d === 0 ? 3 : d === 1 ? 2 : d === 2 ? 1 : 0;
}

export function bodyRecord(state) {
  const count = (action, pred = () => true) => state.logs.filter(l => l.action === action && pred(l)).length;
  const repairs = state.cast?.repairs || [];
  return {
    dig: { stolen: count('rival_stole'), rests: count('focus_rest') },
    study: { wrong: count('reading_judgement', l => !l.correct) + count('siren_follow') },
    reconstruct: { bounced: count('reconstruction_attempt', l => !l.correct), caught: count('giant_caught') },
    cast: { repairs: repairs.filter(r => r !== 'keep').length, recast: count('casting_restart') },
    scylla: { bites: state.trials.scylla?.bites || 0, swallowed: state.trials.scylla?.swallowed || 0 },
    underworld: { misses: state.trials.underworld.misses }
  };
}

export const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? 0));

/** 예전 저장의 시련 상태에 새 칸을 채운다(제자리에서 고친다) */
export function ensureTrials(t) {
  t.mythSeen ||= {};
  t.siren ||= { ropes: ROPES, falls: 0, retied: 0 };
  t.giant ||= { caught: 0, slow: false };
  if (!t.scylla) {
    t.scylla = freshScylla();
    // 시련 5가 아틀라스(하늘 떠받치기)였던 저장: 그 시련을 마쳤다면 새 시련 5도 마친 것으로 둔다
    if ((t.atlas?.round || 0) >= 3 && t.atlas.tricked !== false) t.scylla.narrow = NARROWS;
  }
  t.bridged ||= {};
  t.marked ||= {};
  t.reach ||= { touches: 0, slow: false };
  return t;
}

/* ---------- 시련 2 · 사이렌의 노래 ---------- */
const hashKey = key => { let h = 2166136261; for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };

/** 사이렌이 노래할 보기: 늘 틀린 것이고, 같은 문제(조각:도구)면 늘 같다 */
export function sirenPick(key, answer, n) {
  const wrong = Array.from({ length: n }, (_, i) => i).filter(i => i !== answer);
  return wrong[mix(hashKey(key), n, answer + 1) % wrong.length];
}

/** 노래에 넘어감: 밧줄 하나가 풀린다. 다 풀리면 흙손 영감이 다시 묶어 준다(진행은 막지 않는다) */
export function fallForSong(siren) {
  const falls = siren.falls + 1, ropes = siren.ropes - 1;
  if (ropes > 0) return { siren: { ...siren, ropes, falls }, retied: false };
  return { siren: { ...siren, ropes: ROPES, falls, retied: siren.retied + 1 }, retied: true };
}

/* ---------- 시련 3 · 폴리페모스의 벽 ---------- */
/** 거인의 눈: 돌아선 시간과 보는 시간(ms)의 범위, 돌아보기 전 발소리로 알리는 시간 */
export const GAZE = { away: [3000, 5000], watch: [1800, 3000], warn: 1200 };

/** 장면에 들어온 뒤 ms가 지났을 때 거인이 보고 있는가. 돌아선 채로 시작하고 길이는 씨앗에 따라 고르지 않다. */
export function gazeAt(seed, ms, slow = false) {
  const span = ([lo, hi], h) => lo + (h % (hi - lo + 1));
  let t = 0;
  for (let i = 0; ; i++) {
    const away = span(GAZE.away, mix(seed >>> 0, i + 1, 11)) * (slow ? 2 : 1);
    if (ms < t + away) { const until = t + away - ms; return { watching: false, until, warn: until <= GAZE.warn }; }
    t += away;
    const watch = span(GAZE.watch, mix(seed >>> 0, i + 1, 23));
    if (ms < t + watch) return { watching: true, until: t + watch - ms, warn: false };
    t += watch;
  }
}

/* ---------- 시련 4 · 히드라 ---------- */
/**
 * 수리 한 번의 결과. cut: 없애는 머리 수, regrow: 벤 자리에서 다시 돋는 머리 수.
 * 마지막 머리 하나는 죽지 않는다 — 결함이 한 번 생기면 하나는 끝까지 남아 기록이 된다.
 */
export function hydraRepair(defects, { cut, regrow }) {
  if (defects <= 0) return { defects: 0, regrew: 0, immortal: false };
  const immortal = defects - cut < 1;
  return { defects: Math.max(1, defects - cut) + regrow, regrew: regrow, immortal };
}

/* ---------- 시련 5 · 스킬라와 카립디스 ---------- */
// 배의 자리 x: -1(왼쪽 기슭, 스킬라) … 0(가운데) … 1(오른쪽 기슭, 카립디스). 물목 셋을 차례로 지난다.
export const NARROWS = 3;
export const NARROW_MS = [9000, 10000, 11000];   // 물목마다 걸리는 시간(가운데를 지키는 동안)
export const OARS = 6;                           // 스킬라의 머리 여섯 — 기슭에 닿을 때마다 노 하나
export const STEER = 0.9;                        // 키를 끝까지 꺾었을 때 1초에 옮겨 가는 거리

export function freshScylla() { return { narrow: 0, oars: OARS, bites: 0, swallowed: 0, slow: false }; }

/** 물살이 배를 옆으로 미는 세기(1초에). 물목과 씨앗마다 다르고 고르지 않다. 느린 물살은 절반. */
export function currentAt(seed, narrow, ms, slow = false) {
  const t = ms / 1000, n = Math.min(narrow, NARROWS - 1);
  const ph = k => (mix(seed >>> 0, n + 1, k) % 6283) / 1000;
  const wave = 0.42 * Math.sin(t * 0.8 + ph(31)) + 0.24 * Math.sin(t * 1.9 + ph(47)) + 0.14 * Math.sin(t * 3.3 + ph(59));
  return wave * [0.62, 0.72, 0.82][n] * (slow ? 0.5 : 1);
}

/**
 * 한 걸음 나아간다. s: 저장하는 상태, run: 물목 안의 진행 { x, elapsed }(저장하지 않는다),
 * rudder: 키(-1 왼쪽 … 1 오른쪽), dt: ms. 돌려주는 event: 'scylla' | 'charybdis' | 'narrow' | 'done' | null
 */
export function scyllaStep(s, run, { rudder, dt, seed }) {
  const r = Math.max(-1, Math.min(1, rudder || 0));
  const x = run.x + (currentAt(seed, s.narrow, run.elapsed, s.slow) + r * STEER) * dt / 1000;
  const elapsed = run.elapsed + dt;
  if (x <= -1) {   // 스킬라가 노 하나를 앗아 간다. 물목은 계속 간다
    const restocked = s.oars <= 1;
    return { s: { ...s, oars: restocked ? OARS : s.oars - 1, bites: s.bites + 1 }, run: { x: 0, elapsed }, event: 'scylla', restocked };
  }
  if (x >= 1) return { s: { ...s, swallowed: s.swallowed + 1 }, run: { x: 0, elapsed: 0 }, event: 'charybdis' };   // 그 물목 처음으로
  if (elapsed >= NARROW_MS[s.narrow]) {
    const narrow = s.narrow + 1;
    return { s: { ...s, narrow }, run: { x: 0, elapsed: 0 }, event: narrow >= NARROWS ? 'done' : 'narrow' };
  }
  return { s, run: { x, elapsed }, event: null };
}

/** 배가 어느 쪽으로 치우쳤고 얼마나 위험한가(0~1) — 소리, 진동, 화면 안내가 함께 쓴다 */
export function scyllaSide(x) {
  const side = x < -0.35 ? 'left' : x > 0.35 ? 'right' : 'center';
  return { side, danger: side === 'center' ? 0 : Math.min(1, (Math.abs(x) - 0.35) / 0.65) };
}

/* ---------- 만남 · 닿을 듯 멈추기 (2026-11-12, 호흡을 바꾼 미니게임) ---------- */
// 사유의 말 "누르면 괴로움이 되고, 떼면 무관심이 돼. 닿을 듯 멈춘 그 자리가 사유야"를 그대로 규칙으로 옮긴다.
// 누르고 있으면 내 손이 사유의 손 쪽으로 다가가고, 떼면 물러난다. 손 자리 x는 0(멀다)~1(닿음).
// 빛나는 틈에 머문 시간이 차면 한 회차를 마친다. 닿으면 움찔 물러나 머문 시간이 처음부터. 틈 밖에서는 천천히 식는다.
export const REACH_ROUNDS = 3;
export const REACH_HOLD_MS = 2500;
export const REACH_TOUCH = 0.92;
export const REACH_GAP = [0.62, 0.7, 0.78];        // 회차마다 틈이 시작되는 자리(갈수록 좁아진다). 끝은 REACH_TOUCH
export const REACH_SPEED = { push: 0.3, drift: 0.2 };   // 초당 움직이는 거리
const REACH_RECOIL = 0.4;                              // 닿았을 때 물러나는 자리

export function freshReach() { return { x: 0, held: 0, touches: 0 }; }

/** 손이 멀리 있는가(무관심), 틈에 있는가, 닿았는가(괴로움) */
export function reachZone(x, round) {
  if (x >= REACH_TOUCH) return 'touch';
  return x >= REACH_GAP[Math.min(round, REACH_ROUNDS - 1)] ? 'gap' : 'far';
}

/** 한 틱: 누르고 있는가(pressed), 지난 시간(dt ms), 몇 번째 회차인가(round), 느린 손(slow) */
export function reachStep(r, { pressed, dt, round, slow = false }) {
  const k = slow ? 0.5 : 1;
  const x = Math.max(0, Math.min(1, r.x + (pressed ? REACH_SPEED.push : -REACH_SPEED.drift) * k * dt / 1000));
  const zone = reachZone(x, round);
  if (zone === 'touch') return { r: { x: REACH_RECOIL, held: 0, touches: r.touches + 1 }, zone, event: 'touch' };
  if (zone === 'gap') {
    const held = r.held + dt;
    if (held >= REACH_HOLD_MS) return { r: { x: 0, held: 0, touches: r.touches }, zone, event: 'round' };
    return { r: { x, held, touches: r.touches }, zone, event: null };
  }
  return { r: { x, held: Math.max(0, r.held - dt * 0.5), touches: r.touches }, zone, event: null };
}
