// Pure scoring logic — no DOM access, so it can be unit-tested in Node.
//
// HOW "READY" IS DEFINED
// 1. Skill score = weighted % correct within that skill (harder items count double).
// 2. Overall = Reading & replying 60% + Grammar 20% + Vocabulary 20%.
//    At A1, "ready" means you can understand German and reply sensibly even if grammar
//    and vocabulary aren't perfect, so comprehension carries most of the weight.
// 3. PASS MARK = 60, the real exam's pass mark. It is the line for "needs study" vs "near the
//    line". We only say "likely ready" at 75 (THRESHOLDS.comfortable), see step 5.
// 4. Days of study needed = gap to the pass mark / 3.5 points per day, minimum 2 days.
//    This reproduces my own target bands (my assumption, not from Globio): 10 points short -> 2-3 days,
//    25 points short -> more than a week. 3.5 points/day is an ASSUMPTION to validate.
// 5. Bands:
//      READY      75+            likely ready on what this check covers
//      PASS_THIN  60-74          near the line: confirm with a full mock before booking
//      QUICK      50-59 (gap<=10)  2-3 days of revision
//      WEEK       36-49 (gap<=24)  4-7 days of study
//      LONG       <=35  (gap>=25)  8+ days of learning
//    WHY 75, NOT 70: a simulated learner with fixed knowledge scores with a standard
//    deviation of about 12-14 points on this 15-question check (see THRESHOLDS.noise).
//    A false "book now" costs the learner the exam fee; a false "wait" costs a few days.
//    So "likely ready" needs roughly one standard deviation of margin above the pass mark.
//    The check also does not test listening, writing or speaking.
// 6. Exam-slot timeline: compares days needed with days until the learner's slot.
// 7. Level segment (internal only, never shown to the learner): below_a1 / a1 / possible_a2.

const THRESHOLDS = {
  pass: 60,
  comfortable: 75, // pass mark + about one standard deviation of retake noise
  noise: 13,       // typical retake swing in points (simulated SD, 15 questions, ability 40-80%)
  pointsPerDay: 3.5,
  minDays: 2,
  maxDays: 28,
  belowA1: 30,
  possibleA2: 90,
};

function daysNeeded(overall) {
  const gap = THRESHOLDS.pass - overall;
  if (gap <= 0) return 0;
  const days = Math.ceil(gap / THRESHOLDS.pointsPerDay);
  return Math.min(THRESHOLDS.maxDays, Math.max(THRESHOLDS.minDays, days));
}

function bandFor(overall) {
  if (overall >= THRESHOLDS.comfortable) return "READY";
  if (overall >= THRESHOLDS.pass) return "PASS_THIN";
  const gap = THRESHOLDS.pass - overall;
  if (gap <= 10) return "QUICK";
  if (gap <= 24) return "WEEK";
  return "LONG";
}

function levelSegment(overall) {
  if (overall < THRESHOLDS.belowA1) return "below_a1";
  if (overall >= THRESHOLDS.possibleA2) return "possible_a2";
  return "a1";
}

// Whole days from today to an ISO date ("YYYY-MM-DD"), using local calendar days.
function daysUntil(isoDate, now = new Date()) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

// Compares study days needed with days until the learner's exam slot.
// daysUntilExam = null when the learner has no date yet.
function planTimeline(needed, daysUntilExam) {
  if (daysUntilExam != null && daysUntilExam < 0) return { status: "PAST" };
  if (needed === 0) {
    return { status: daysUntilExam == null ? "BOOK_NOW" : "KEEP_DATE" };
  }
  if (daysUntilExam == null) return { status: "CHOOSE_SLOT", earliestDays: needed };
  if (daysUntilExam >= needed) return { status: "ON_TRACK", buffer: daysUntilExam - needed };
  return { status: "TOO_SOON", short: needed - daysUntilExam, earliestDays: needed };
}

function computeReadiness(answers, questions, skills, topics) {
  const skillStats = {};
  Object.keys(skills).forEach((k) => (skillStats[k] = { earned: 0, total: 0 }));
  const topicLoss = {}; // topic -> lost weighted points
  const missed = [];

  questions.forEach((q) => {
    const isCorrect = answers[q.id] === q.answer;
    skillStats[q.skill].total += q.weight;
    if (isCorrect) {
      skillStats[q.skill].earned += q.weight;
    } else {
      topicLoss[q.topic] = (topicLoss[q.topic] || 0) + q.weight;
      missed.push(q);
    }
  });

  const skillScores = {};
  const skillCounts = {}; // skill -> { correct, total } (number of questions)
  Object.keys(skills).forEach((k) => (skillCounts[k] = { correct: 0, total: 0 }));
  questions.forEach((q) => {
    skillCounts[q.skill].total += 1;
    if (answers[q.id] === q.answer) skillCounts[q.skill].correct += 1;
  });
  let overall = 0;
  Object.keys(skills).forEach((k) => {
    const s = skillStats[k];
    skillScores[k] = s.total ? Math.round((s.earned / s.total) * 100) : 0;
    overall += skillScores[k] * skills[k].weight;
  });
  overall = Math.round(overall);

  const weakest = Object.keys(skillScores).reduce((a, b) =>
    skillScores[a] <= skillScores[b] ? a : b
  );

  const days = daysNeeded(overall);
  const band = bandFor(overall);
  const pointsToGo = Math.max(0, THRESHOLDS.pass - overall);
  const segment = levelSegment(overall);

  // Practise list: topics where the learner lost the most points (max 3).
  // Ties are broken in favour of the topic's skill that scored lowest.
  const topicSkill = {};
  questions.forEach((q) => (topicSkill[q.topic] = q.skill));
  const toItem = (t, kind, lost) => ({
    topic: t,
    skill: topicSkill[t],
    label: topics[t].label,
    tip: topics[t].tip,
    lost,
    kind, // "gap" = points lost here, "review" = nothing lost, padded in to keep the list at 2+
  });
  const practise = Object.keys(topicLoss)
    .sort(
      (a, b) =>
        topicLoss[b] - topicLoss[a] ||
        skillScores[topicSkill[a]] - skillScores[topicSkill[b]]
    )
    .slice(0, 3)
    .map((t) => toItem(t, "gap", topicLoss[t]));

  // The brief asks for 2-3 things to practise. If the learner lost points on fewer than
  // two topics, pad with the trickiest topics they answered correctly (a correct answer
  // on a 4-option question can be a guess, so these are worth a second look).
  if (practise.length < 2) {
    const have = new Set(practise.map((p) => p.topic));
    const hardest = {}; // topic -> max weight
    questions.forEach((q) => (hardest[q.topic] = Math.max(hardest[q.topic] || 0, q.weight)));
    Object.keys(hardest)
      .filter((t) => !have.has(t))
      .sort((a, b) => hardest[b] - hardest[a] || skillScores[topicSkill[a]] - skillScores[topicSkill[b]])
      .slice(0, 2 - practise.length)
      .forEach((t) => practise.push(toItem(t, "review", 0)));
  }

  const low = Math.max(0, overall - THRESHOLDS.noise);
  const high = Math.min(100, overall + THRESHOLDS.noise);

  return { overall, low, high, skillScores, skillCounts, weakest, days, band, pointsToGo, segment, practise, missed };
}

if (typeof module !== "undefined") {
  module.exports = { computeReadiness, daysNeeded, bandFor, levelSegment, daysUntil, planTimeline, THRESHOLDS };
}
