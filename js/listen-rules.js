// 시각장애인판 「반가워, 사유 · 소리로 만나는 판」(2026-11-12)의 화면 없는 규칙.
// DOM을 쓰지 않아 node 단위 시험(tests/listen.test.mjs)이 바로 읽는다.
// 2026-11-18: 만남 앞에 유태양의 마지막 제안(listenOffer), 만남 뒤에 점수 확인(listenResult)을 넣었다. 끝(listenEnd)은 점수에 따른 엔딩이다
export const LISTEN_SCENES = ['listenStart', 'listenPrologue', 'listenGiant', 'listenGallery', 'listenOffer', 'listenMeet', 'listenResult', 'listenEnd'];

/* ---------- 첫째 시련 · 외눈 거인의 동굴 ---------- */
export const PIECES = ['crown', 'hand', 'leg'];     // 제자리를 잃은 조각 셋
export const SETTLED = ['face', 'robe'];            // 이미 제자리에 붙어 있는 조각
export const ZONES = ['crown-zone', 'face-zone', 'hand-zone', 'robe-zone', 'leg-zone'];

/* ---------- 둘째 시련 · 청동 전시실 ---------- */
export const RING_COUNT = 5;
export const WARM_IN = 4000;    // 손을 얹고 4초면 다 데워진다(오리지널 1방과 같다)
export const WARM_OUT = 9000;   // 손을 떼면 9초에 걸쳐 식는다
export const WARM_GOAL = 0.6;
export const WARM_FULL = 0.95;   // 끝까지 데움(마음 점수 만점, data/score.json warm.full과 같다)
export const GRID = { cols: 7, rows: 5 };      // 2방: 단추로 한 칸씩 옮기는 어둠
export const START_CELL = { col: 3, row: 2 };
export const TRACES = [{ id: 'hollow', col: 5, row: 1 }, { id: 'repair', col: 2, row: 4 }];
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/* ---------- 알림과 들어 보기 ---------- */
export const REPEAT_MS = 1500;
/** 하는 법의 '들어 보기' 단추 — 화면 모듈이 이 id로 소리를 낸다 */
export const SAMPLES = {
  giant: ['away', 'step', 'glare', 'caught'],
  room1: ['big', 'small', 'damp'],
  room2: ['far', 'near', 'left', 'miss', 'found', 'edge'],
  meet: ['far', 'gap', 'touch']
};

export function freshListen() {
  return {
    page: 0, filmSeen: false, resume: null, doneAt: null, meetStarted: false,
    // v2(2026-11-21, 교수 피드백 '한 페이지 5개 이하' · '다음 단계로 바로 점프'): 시작 화면의 작은 쪽, 장 고르기 쪽, 하는 법 쪽, 건너뛴 시련
    startView: 'main', chapterPage: 1, sample: 0, skipped: [],
    easy: true,   // 쉬운 모드(설정): 거인 · 만남의 손이 천천히, 2방 거리를 말로도. 초·중·고 시각장애 학생이 주 대상이라 처음엔 켜 둔다
    howto: { giant: false, room1: false, room2: false, meet: false },
    autoVoice: false,   // 녹음 대사를 장면에 들어올 때 저절로 틀지 않는다(낭독기와 겹치지 않게, WCAG 1.4.2 · KWCAG 5.4.2). 시작 화면에서 켤 수 있다
    giant: { started: false, slow: true, picked: null, placed: {}, caught: 0, wrong: 0, escaped: false, zone: 0 },
    gal: {
      room: 1, begun1: false, begun2: false,
      struck: [], warm: {}, maxWarm: 0, hand: null, damped: 0, done1: false,
      cell: { ...START_CELL }, found: [], digs: 0, misses: 0, speakNear: true,
      ring: 0, dir: 0, heard: []
    }
  };
}
/** 예전 저장에 없는 칸을 채운다 */
export function ensureListen(l) {
  const f = freshListen();
  if (!l || typeof l !== 'object') return f;
  return { ...f, ...l, giant: { ...f.giant, ...(l.giant || {}) }, gal: { ...f.gal, ...(l.gal || {}) }, howto: { ...f.howto, ...(l.howto || {}) } };
}

/** 조각을 자리에 놓으려 할 때의 결과 */
export function placeOutcome({ piece, zone, watching, zoneOf }) {
  if (!piece) return 'none';
  if (SETTLED.some(id => zoneOf[id] === zone)) return 'settled';
  if (watching) return 'caught';
  return zoneOf[piece] === zone ? 'placed' : 'wrong';
}
export const piecesLeft = g => PIECES.filter(id => !g.placed[id]).length;
export function giantTodo(g) {
  const n = piecesLeft(g);
  if (!g.started) return { key: 'start', n };
  if (n) return { key: g.picked ? 'place' : 'pick', n };
  return { key: g.escaped ? 'out' : 'who', n: 0 };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function moveCell(cell, dir) {
  const [dx, dy] = DIRS[dir];
  return { col: clamp(cell.col + dx, 0, GRID.cols - 1), row: clamp(cell.row + dy, 0, GRID.rows - 1) };
}
export const sameCell = (a, b) => a.col === b.col && a.row === b.row;
/** 칸의 가운데를 0~1 좌표로 — 오리지널 2방의 소리 단서(gallery.js cue)에 그대로 넣는다 */
export const cellXY = c => ({ x: (c.col + 0.5) / GRID.cols, y: (c.row + 0.5) / GRID.rows });
/** 0 멀다 · 1 조금 가깝다 · 2 가깝다 · 3 바로 여기 (가로·세로·대각 모두 한 걸음으로 센다) */
export function nearLevel(cell, target) {
  const s = Math.max(Math.abs(cell.col - target.col), Math.abs(cell.row - target.row));
  return s === 0 ? 3 : s === 1 ? 2 : s === 2 ? 1 : 0;
}
export const nextTrace = found => TRACES.find(t => !found.includes(t.id)) || null;

export const warmStep = (w, held, dt) => (held ? Math.min(1, w + dt / WARM_IN) : Math.max(0, w - dt / WARM_OUT));
export const room1Done = g => g.struck.length >= RING_COUNT && g.maxWarm >= WARM_GOAL;
export function galTodo(g) {
  if (g.room === 1) {
    if (!g.begun1) return { key: 'begin1' };
    const n = RING_COUNT - g.struck.length;
    if (n > 0) return { key: 'strike', n };
    return g.maxWarm < WARM_GOAL ? { key: 'warm' } : { key: 'next1' };
  }
  if (!g.begun2) return { key: 'begin2' };
  const n = TRACES.length - g.found.length;
  return n ? { key: 'find', n } : { key: 'next2' };
}

/* ---------- 글 ---------- */
/** "prologue.guideIntro"처럼 점으로 이은 자리의 값을 꺼낸다 */
export const pick = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
/** 대사 한 줄: from(녹음이 있는 trials.json의 자리)이 있으면 그 글, 없으면 text */
export const lineText = (line, trials) => (line.from ? pick(trials, line.from) : line.text);
export const shouldTell = (last, text, now) => !(last && last.text === text && now - last.at < REPEAT_MS);

/* ---------- v2(2026-11-21): 한 페이지 5개 이하 · 다음 단계로 바로 점프 ---------- */
/** 고르기를 단추 여러 개 대신 '한 단추로 차례로 넘기기'로 한다. ok를 지나는 다음 칸의 번호(없으면 -1) */
export function cycleNext(list, cur, ok = () => true) {
  for (let k = 1; k <= list.length; k++) {
    const i = (((cur + k) % list.length) + list.length) % list.length;
    if (ok(list[i], i)) return i;
  }
  return -1;
}
/** ok를 지나는 칸이 cur이면 그대로, 아니면 다음 칸 */
export const cycleFix = (list, cur, ok = () => true) => (cur >= 0 && cur < list.length && ok(list[cur], cur) ? cur : cycleNext(list, cur, ok));
/** 거인 동굴: 손에 드는 조각은 아직 붙이지 않은 것 가운데 첫째(관 → 손 → 다리) */
export const firstLoose = g => PIECES.find(id => !g.placed[id]) || null;
/** 2방 방향 단추가 넘기는 차례 */
export const DIR_ORDER = ['right', 'down', 'left', 'up'];
/** 장 고르기에 나오는 장(점수 확인과 엔딩은 끝까지 해야 나온다). 쪽마다 셋 이하 */
export const CHAPTERS = [['listenPrologue', 'listenGiant', 'listenGallery'], ['listenOffer', 'listenMeet']];

/** 시련을 다 마쳤는가(건너뛰기·장 고르기가 마치지 않은 시련을 0점으로 표시할 때 쓴다) */
export const TRIAL_DONE = {
  giant: l => !!l.giant.escaped,
  room1: l => !!l.gal.done1,
  room2: l => !nextTrace(l.gal.found),
  offer: (l, t) => !!t.offerDone || (t.offerStep || 0) >= 2,
  meet: (l, t) => (t.meetStep || 0) >= 2
};
/** 시련이 있는 장면(장 고르기로 그 뒤의 장으로 뛰면, 마치지 않은 앞 시련은 건너뛴 것으로 센다) */
export const TRIAL_SCENE = { giant: 'listenGiant', room1: 'listenGallery', room2: 'listenGallery', offer: 'listenOffer', meet: 'listenMeet' };
/** '다음 단계로 건너뛰기'의 갈 곳: 장면과 그 안의 단계로 정한다. trial이면 그 시련을 건너뛴 것으로 센다(점수 0).
 *  시련을 시작하기 전(들머리 · 하는 법)에 건너뛰어도 마치지 않았으므로 0점이다 */
export function skipPlan(scene, l, t) {
  const open = id => (TRIAL_DONE[id](l, t) ? null : id);
  if (scene === 'listenPrologue') return { to: 'listenGiant', trial: null };
  if (scene === 'listenGiant') return { to: 'listenGallery', trial: open('giant') };
  if (scene === 'listenGallery') {
    if (l.gal.room === 1) return { to: 'room2', trial: open('room1') };
    return { to: 'listenOffer', trial: open('room2') };
  }
  if (scene === 'listenOffer') return { to: 'choose', trial: null };   // 제안은 고르기(엔딩을 가르는 선택)로 바로 간다. 고르기는 건너뛰지 않는다
  if (scene === 'listenMeet') return { to: 'listenResult', trial: open('meet') };
  return null;
}
/** v2.3(2026-11-22, USER '건너뛰어도 끝난 것처럼 소리가 나고 다음 관으로'): 건너뛴 시련을 흙손 영감이 대신 마친 상태로 만든다.
 *  그러면 그 장면을 다시 그릴 때 시련의 끝 쪽(마지막 말 · 소리)이 그대로 나온다. 점수는 그 시련의 기본 점수(data/score.json listenFloor).
 *  거인: 남은 조각을 제자리에, '아무도 아니' 뒤(빠져나옴) · 1방: 마침 · 2방: 흔적 둘 · 만남: 닿을 듯 멈춘 뒤 */
export function finishBySkip(trial, l, t, zoneOf) {
  if (trial === 'giant') {
    const g = l.giant;
    g.started = true; g.picked = null; g.escaped = true;
    PIECES.forEach(id => { if (!g.placed[id]) g.placed[id] = zoneOf[id]; });
  } else if (trial === 'room1') {
    Object.assign(l.gal, { room: 1, begun1: true, done1: true, hand: null });
  } else if (trial === 'room2') {
    Object.assign(l.gal, { room: 2, begun1: true, begun2: true, found: TRACES.map(x => x.id) });
  } else if (trial === 'meet') {
    l.meetStarted = true; t.met = true; t.meetStep = 2;
  }
}
/** 시련을 건너뛰면 그 시련 칸은 기본 점수만 받도록 표시한다(v2.3 전에는 0점) */
export function markSkipped(l, trial) {
  if (trial && !l.skipped.includes(trial)) l.skipped.push(trial);
}
/** 쉬운 모드를 켜고 끈다: 거인의 박자, 만남의 손 빠르기, 2방의 거리 말하기를 함께 */
export function setEasy(l, t, on) { l.easy = on; l.giant.slow = on; l.gal.speakNear = on; if (t.reach) t.reach.slow = on; }
/** 장 고르기로 scene에 들어갈 때: 그 앞 장의 마치지 않은 시련을 건너뛴 것으로 표시 */
export function markUnplayedBefore(l, t, scene) {
  const at = LISTEN_SCENES.indexOf(scene);
  Object.entries(TRIAL_SCENE).forEach(([id, sc]) => { if (LISTEN_SCENES.indexOf(sc) < at && !TRIAL_DONE[id](l, t)) markSkipped(l, id); });
}
/** 장 고르기로 들어갈 때 그 장을 처음 상태로 돌린다(다른 장의 기록과 '느린' 설정은 그대로) */
export function resetChapter(l, t, scene) {
  const f = freshListen();
  const drop = id => { l.skipped = l.skipped.filter(x => x !== id); };
  if (scene === 'listenPrologue') { l.page = 0; }
  if (scene === 'listenGiant') { l.giant = { ...f.giant, slow: l.giant.slow }; l.howto.giant = false; drop('giant'); }
  if (scene === 'listenGallery') { l.gal = { ...f.gal, speakNear: l.gal.speakNear }; l.howto.room1 = false; l.howto.room2 = false; drop('room1'); drop('room2'); }
  if (scene === 'listenOffer') { t.offerStep = 0; t.offerDone = false; t.offerErased = 0; drop('offer'); }
  if (scene === 'listenMeet') { l.meetStarted = false; l.howto.meet = false; t.meetStep = 0; t.breaths = 0; t.meetDone = false; if (t.reach) t.reach.touches = 0; drop('meet'); }
}
