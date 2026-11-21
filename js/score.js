// 점수와 엔딩(2026-11-18). 솜씨 100 + 마음 100 = 200점이고, 합계와 '제안을 처음부터 거절했는가'로 엔딩이 셋으로 갈린다.
// 배점은 data/score.json에 있고, 여기서는 게임이 이미 남기는 기록(실수 횟수, 저장값)을 읽어 계산만 한다.
// DOM을 쓰지 않아 node로 시험한다(tests/score.test.mjs). 오리지널판과 시각장애인판이 같은 함수를 쓴다.
import { bodyRecord, fill } from './trials-rules.js';

export const EDITIONS = ['original', 'listen'];
export const ENDINGS = ['best', 'good', 'normal'];
export const STARS = { best: 3, good: 2, normal: 1 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sum = rows => rows.reduce((s, r) => s + r.points, 0);

/** 만점에서 실수마다 뺀다. 0점 아래로는 내려가지 않는다 */
export function rowPoints(rule, counts = {}) {
  if (counts?.skipped) return 0;   // v2(2026-11-21): '다음 단계로 건너뛰기'로 넘긴 시련은 0점
  const minus = Object.entries(rule.minus || {}).reduce((s, [k, p]) => s + p * (counts[k] || 0), 0);
  return clamp(rule.max - minus, 0, rule.max);
}

/** 오리지널 1방에서 가장 따뜻하게 데운 정도. 전시실을 '다시 하기'로 비워도 기록(gal_hand_off)에 남은 값을 쓴다 */
function warmOriginal(state) {
  const logged = (state.logs || []).filter(l => l.action === 'gal_hand_off' && typeof l.warm === 'number').map(l => l.warm);
  return Math.max(0, state.gal?.maxWarm || 0, ...logged);
}

/** 솜씨 칸마다 센 실수 */
export function skillCounts(edition, state) {
  if (edition === 'listen') {
    const l = state.listen || {};
    const sk = id => (l.skipped || []).includes(id);
    return { giant: { caught: l.giant?.caught || 0, wrong: l.giant?.wrong || 0, skipped: sk('giant') }, room2: { misses: l.gal?.misses || 0, skipped: sk('room2') } };
  }
  return bodyRecord(state);
}

/** 마음 칸마다 센 것: 제안에서 흠을 지운 횟수, 만남에서 손이 닿은 횟수, 1방에서 데운 정도(0~1) */
export function heartCounts(edition, state) {
  const t = state.trials || {};
  const sk = id => edition === 'listen' && (state.listen?.skipped || []).includes(id);
  return {
    offer: { erased: t.offerErased || 0, skipped: sk('offer') },
    reach: { touches: t.reach?.touches || 0, skipped: sk('meet') },
    warm: { warm: edition === 'listen' ? (state.listen?.gal?.maxWarm || 0) : warmOriginal(state) }
  };
}

export function heartPoints(id, rule, c = {}) {
  if (c.skipped) return 0;   // v2: 장 고르기로 지나친 제안, 건너뛴 만남
  if (id === 'offer') return c.erased ? rule.erased : rule.max;
  if (id === 'warm') return c.warm >= rule.full ? rule.max : c.warm > 0 ? rule.partial : 0;
  return rowPoints(rule, c);
}

/** 최고: 합계가 넉넉하고 제안을 처음부터 거절함 · 좋음: 합계가 good.min 이상 · 보통: 그 밖(셋 다 행복한 엔딩) */
export function endingOf(total, refusedFirst, E) {
  if (total >= E.best.min && (!E.best.refusedFirst || refusedFirst)) return 'best';
  if (total >= E.good.min) return 'good';
  return 'normal';
}

/** 판(edition)의 만점: 솜씨와 마음 칸 만점의 합 */
export function maxOf(cfg, edition) {
  const m = rules => Object.values(rules).reduce((s, r) => s + r.max, 0);
  return { skill: m(cfg.skill[edition]), heart: m(cfg.heart) };
}

/** 게임을 마친 순간의 점수. 결과는 state.result에 저장되어 점수 화면과 완수 카드가 쓴다 */
export function computeScore({ edition, state, cfg, at = Date.now() }) {
  if (!EDITIONS.includes(edition)) throw new Error(`알 수 없는 판: ${edition}`);
  const sc = skillCounts(edition, state), hc = heartCounts(edition, state);
  // v2(2026-11-22) 소리로 만나는 판의 '짧게 하기': 청동 전시실이 없으므로 남은 칸으로 솜씨 100 · 마음 100(data/score.json listenShort)
  const short = edition === 'listen' && !!state.listen?.short && !!cfg.listenShort;
  const skillRules = short ? cfg.listenShort.skill : cfg.skill[edition], heartRules = short ? cfg.listenShort.heart : cfg.heart;
  const skill = Object.entries(skillRules).map(([id, rule]) => ({ id, counts: sc[id] || {}, points: rowPoints(rule, sc[id]), max: rule.max }));
  const heart = Object.entries(heartRules).map(([id, rule]) => ({ id, counts: hc[id] || {}, points: heartPoints(id, rule, hc[id]), max: rule.max }));
  const m = rules => Object.values(rules).reduce((s, r) => s + r.max, 0);
  const max = { skill: m(skillRules), heart: m(heartRules) };
  const total = sum(skill) + sum(heart);
  const refusedFirst = !(state.trials?.offerErased);
  const ending = endingOf(total, refusedFirst, cfg.endings);
  return {
    edition, short, at, skill, heart,
    skillPoints: sum(skill), heartPoints: sum(heart), skillMax: max.skill, heartMax: max.heart,
    total, max: max.skill + max.heart, refusedFirst, ending, stars: STARS[ending]
  };
}

/* ---------- 글 ---------- */
/** 칸 하나의 내역 글(예: "빼앗긴 조각 2번") */
export function rowDetail(row, T) {
  const t = T.rows[row.id] || {};
  if (row.counts?.skipped && T.skippedDetail) return T.skippedDetail;
  if (row.id === 'offer') return row.counts.erased ? fill(t.detailErased, row.counts) : t.detail;
  if (row.id === 'warm') return row.points >= row.max ? t.detail : row.counts.warm > 0 ? t.detailPartial : t.detailNone;
  return fill(t.detail || '', row.counts);
}
export const rowLabel = (row, T) => T.rows[row.id]?.label || row.id;

/** 더 좋은 엔딩으로 가는 조건(최고 엔딩이면 칭찬) */
export function nextHint(result, cfg) {
  const T = cfg.text.next;
  if (result.ending === 'best') return T.best;
  if (result.ending === 'good') return fill(T.good, { min: cfg.endings.best.min });
  return fill(T.normal, { min: cfg.endings.good.min });
}

/** 낭독기가 한 번에 읽는 요약: "합계 200점 중 152점, 별 세 개 중 3개, 최고 엔딩 「앞으로도 쭉」" */
export function spokenSummary(result, cfg) {
  const T = cfg.text, E = cfg.endings_text[result.ending];
  return `${fill(T.totalSpoken, { n: result.total, max: result.max })}, ${fill(T.starsSpoken, { n: result.stars })}, ${E.name} 「${E.title}」.`;
}

export const starText = n => '★'.repeat(n) + '☆'.repeat(3 - n);
