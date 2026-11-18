// Run with: node scoring.test.js
const assert = require("assert");
const { SKILLS, TOPICS, QUESTIONS } = require("./questions.js");
const { computeReadiness, daysNeeded, bandFor, levelSegment, daysUntil, planTimeline } = require("./scoring.js");

// Helper: answer everything correctly except the ids in `wrong`.
function answersWithWrong(wrong = []) {
  const a = {};
  QUESTIONS.forEach((q) => {
    a[q.id] = wrong.includes(q.id) ? (q.answer + 1) % q.options.length : q.answer;
  });
  return a;
}
const run = (wrong) => computeReadiness(answersWithWrong(wrong), QUESTIONS, SKILLS, TOPICS);
const idsOf = (skill) => QUESTIONS.filter((q) => q.skill === skill).map((q) => q.id);

// ---- Data sanity ----
assert.strictEqual(QUESTIONS.length, 15);
assert.deepStrictEqual([idsOf("vocabulary").length, idsOf("grammar").length, idsOf("reading").length], [4, 4, 7]);
assert.ok(Math.abs(Object.values(SKILLS).reduce((s, k) => s + k.weight, 0) - 1) < 1e-9, "weights sum to 1");
// Every reading item has its own passage (independent items, not two questions on one text)
const passages = QUESTIONS.filter((q) => q.passage).map((q) => q.passage);
assert.strictEqual(new Set(passages).size, passages.length, "duplicate passage");
QUESTIONS.forEach((q) => {
  assert.ok(q.answer >= 0 && q.answer < q.options.length, `bad answer idx ${q.id}`);
  assert.ok(TOPICS[q.topic], `unknown topic ${q.topic}`);
  assert.ok(q.why && q.why.length > 10, `missing why ${q.id}`);
  assert.ok(SKILLS[q.skill], `unknown skill ${q.skill}`);
});

// ---- Days of study needed: my own target bands (an assumption, not from Globio) ----
assert.strictEqual(daysNeeded(60), 0);
assert.strictEqual(daysNeeded(100), 0);
assert.strictEqual(daysNeeded(59), 2);  // minimum 2 days
assert.strictEqual(daysNeeded(54), 2);
assert.strictEqual(daysNeeded(50), 3);  // 10 points short -> 2-3 days
assert.strictEqual(daysNeeded(49), 4);  // 11 short -> a few more days
assert.strictEqual(daysNeeded(36), 7);  // 24 short -> up to a week
assert.strictEqual(daysNeeded(35), 8);  // 25 short -> MORE than a week
assert.strictEqual(daysNeeded(0), 18);
// Monotonic: lower score never needs fewer days
for (let s = 100; s > 0; s--) assert.ok(daysNeeded(s - 1) >= daysNeeded(s));

// ---- Band boundaries ----
assert.deepStrictEqual(
  [100, 75, 74, 70, 60, 59, 50, 49, 36, 35, 0].map(bandFor),
  ["READY", "READY", "PASS_THIN", "PASS_THIN", "PASS_THIN", "QUICK", "QUICK", "WEEK", "WEEK", "LONG", "LONG"]
);
// Band and days agree with the product rules
assert.ok(daysNeeded(50) <= 3 && bandFor(50) === "QUICK");
assert.ok(daysNeeded(35) > 7 && bandFor(35) === "LONG");

// ---- Internal level segment (never shown to learner) ----
assert.deepStrictEqual([29, 30, 89, 90].map(levelSegment), ["below_a1", "a1", "a1", "possible_a2"]);

// ---- daysUntil ----
const now = new Date(2026, 10, 18, 15, 0); // 18 Nov 2026, 3pm local
assert.strictEqual(daysUntil("2026-11-18", now), 0);
assert.strictEqual(daysUntil("2026-11-19", now), 1);
assert.strictEqual(daysUntil("2026-11-25", now), 7);
assert.strictEqual(daysUntil("2026-12-18", now), 30);

// ---- Slot timeline ----
assert.deepStrictEqual(planTimeline(0, null), { status: "BOOK_NOW" });
assert.deepStrictEqual(planTimeline(0, 5), { status: "KEEP_DATE" });
assert.deepStrictEqual(planTimeline(0, -3), { status: "PAST" });  // past dates never produce "in -3 days"
assert.deepStrictEqual(planTimeline(5, -1), { status: "PAST" });
assert.strictEqual(planTimeline(3, null).status, "CHOOSE_SLOT");
assert.deepStrictEqual(planTimeline(3, 3), { status: "ON_TRACK", buffer: 0 });
assert.deepStrictEqual(planTimeline(3, 10), { status: "ON_TRACK", buffer: 7 });
assert.deepStrictEqual(planTimeline(3, 1), { status: "TOO_SOON", short: 2, earliestDays: 3 });
assert.deepStrictEqual(planTimeline(8, 0), { status: "TOO_SOON", short: 8, earliestDays: 8 });

// ---- End-to-end scoring ----
let r = run([]);
assert.strictEqual(r.overall, 100);
assert.strictEqual(r.band, "READY");
assert.strictEqual(r.days, 0);
assert.strictEqual(r.segment, "possible_a2");
assert.strictEqual(r.practise.length, 2);               // brief asks for 2-3 things, even at 100
assert.ok(r.practise.every((p) => p.kind === "review")); // padded with trickiest topics, labelled as double-checks
assert.deepStrictEqual([r.low, r.high], [87, 100]);     // retake range, clamped to 0-100
assert.deepStrictEqual(r.skillCounts, { vocabulary: { correct: 4, total: 4 }, grammar: { correct: 4, total: 4 }, reading: { correct: 7, total: 7 } });

r = run(QUESTIONS.map((q) => q.id));
assert.strictEqual(r.overall, 0);
assert.strictEqual(r.band, "LONG");
assert.strictEqual(r.days, 18);
assert.strictEqual(r.segment, "below_a1");
assert.strictEqual(r.practise.length, 3);

r = computeReadiness({}, QUESTIONS, SKILLS, TOPICS); // unanswered counts as wrong
assert.strictEqual(r.overall, 0);

// One miss -> still 2 practice items (1 real gap + 1 double-check)
r = run(["v1"]);
assert.strictEqual(r.practise.length, 2);
assert.deepStrictEqual(r.practise.map((p) => p.kind), ["gap", "review"]);
assert.deepStrictEqual(r.skillCounts.vocabulary, { correct: 3, total: 4 });
// Practice list is always 2-3 long, whatever the answers
for (let i = 0; i < 500; i++) {
  const a = {};
  QUESTIONS.forEach((q) => (a[q.id] = Math.floor(Math.random() * 4)));
  const n = computeReadiness(a, QUESTIONS, SKILLS, TOPICS).practise.length;
  assert.ok(n >= 2 && n <= 3, `practise length ${n}`);
}

// One easy vocab miss -> 96, READY
r = run(["v1"]);
assert.strictEqual(r.skillScores.vocabulary, 80);
assert.strictEqual(r.overall, 96);
assert.strictEqual(r.band, "READY");

// Comprehension matters most: one heavy reading miss costs more than a light vocab miss
assert.ok(100 - run(["r5"]).overall > 100 - run(["v1"]).overall);

// Perfect comprehension but all vocab + grammar wrong -> exactly 60 -> near the line, not "ready"
r = run([...idsOf("vocabulary"), ...idsOf("grammar")]);
assert.strictEqual(r.overall, 60);
assert.strictEqual(r.band, "PASS_THIN");
assert.deepStrictEqual([r.low, r.high], [47, 73]);
assert.strictEqual(r.days, 0);

// QUICK: vocab + grammar + r6 wrong -> 55 -> 5 short -> 2 days
r = run([...idsOf("vocabulary"), ...idsOf("grammar"), "r6"]);
assert.strictEqual(r.overall, 55);
assert.strictEqual(r.band, "QUICK");
assert.strictEqual(r.days, 2);

// WEEK: vocab + grammar + r5 wrong -> 49 -> 11 short -> 4 days
r = run([...idsOf("vocabulary"), ...idsOf("grammar"), "r5"]);
assert.strictEqual(r.overall, 49);
assert.strictEqual(r.band, "WEEK");
assert.strictEqual(r.days, 4);

// LONG: only r5, r6, r7 right -> 27 -> 33 short -> 10 days (more than a week)
r = run([...idsOf("vocabulary"), ...idsOf("grammar"), "r1", "r2", "r3", "r4"]);
assert.strictEqual(r.overall, 27);
assert.strictEqual(r.band, "LONG");
assert.strictEqual(r.days, 10);

// Practice list ranks by lost points
r = run(["g2", "g4", "v1"]);
assert.deepStrictEqual(r.practise.map((p) => p.topic).slice(0, 2).sort(), ["accusative", "negation"]);
assert.strictEqual(r.practise[2].topic, "transport");
r = run(["v1", "v2", "g1", "g2", "r1", "r5", "r6"]);
assert.ok(r.practise.length <= 3);

console.log("All scoring tests passed ✔");
