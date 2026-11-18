// UI layer. Depends on questions.js, scoring.js and track.js.

const app = document.getElementById("app");
const srStatus = document.getElementById("sr-status");
function announce(msg) { if (srStatus) srStatus.textContent = msg; }

const state = {
  index: 0,
  answers: {}, // question id -> index in the ORIGINAL options array
  order: {},   // question id -> shuffled list of original option indices
  slotDate: null, // "YYYY-MM-DD": booked exam date, or the earliest slot the learner can get
  attempt: 0,     // how many times the learner has started the check in this session
  selfRating: null, // optional 1-5: how ready the learner FELT before the check
};

// Bands from the scoring rules. `level` is the step on the 4-step journey.
const BANDS = {
  LONG: {
    level: 1, name: "Starting out", cls: "notyet",
    title: "More than a week of learning before you book",
    text: "Taking an early slot now would put your exam fee at real risk. Use the plan below, and pick a slot that gives you enough time.",
  },
  WEEK: {
    level: 2, name: "Building", cls: "building",
    title: "About a week of focused study before you book",
    text: "You understand part of what's tested, but not reliably yet. About a week of focused study should get you over the line.",
  },
  QUICK: {
    level: 3, name: "Nearly there", cls: "almost",
    title: "Close: a few days of revision should get you there",
    text: "You're just below the passing mark. A few days of revision on your weakest topics should be enough.",
  },
  PASS_THIN: {
    level: 3, name: "Nearly there", cls: "almost",
    title: "Close to the passing line: confirm before you book",
    text: "You're around the passing mark, but a 15-question check can swing by about 13 points either way, and it doesn't test listening or speaking. Work on your top gaps, then do a full timed mock before you book.",
  },
  READY: {
    level: 4, name: "Likely ready", cls: "ready",
    title: "You look ready on what this check covers",
    text: "You're comfortably above the passing mark here. This check doesn't test listening or speaking, so do one full timed mock (all four parts) before you book, and in the last week.",
  },
};

const LEVEL_ORDER = ["LONG", "WEEK", "QUICK", "READY"];

// Public, free resources. Deep links should be curated and checked by a human before launch.
const RESOURCES = [
  { label: "DW Learn German: free A1 course", url: "https://learngerman.dw.com" },
  { label: "Goethe-Institut: exam information and practice", url: "https://www.goethe.de" },
];

// Where each result should lead next. These are Globio's own pages (hypothesis: close to the
// line -> test yourself on a full mock; far from it -> learn first). Set a url to null to hide.
const NEXT_STEP = {
  mock: {
    url: "https://www.globio.ai/german-mock-test/",
    label: "Try a full Goethe A1 mock test on Globio",
    note: "A full mock covers reading, listening, writing and speaking, the parts this check can't test.",
  },
  course: {
    url: "https://www.globio.ai/learn-german/german-a1/",
    label: "See Globio's German A1 course",
    note: "A structured plan with AI practice and Goethe-format mock tests, if you need more than a quick revision.",
  },
};
const NEXT_STEP_FOR_BAND = { READY: "mock", PASS_THIN: "mock", QUICK: "mock", WEEK: "course", LONG: "course" };

const SELF_LABELS = ["Not at all", "A little", "Somewhat", "Mostly", "Very ready"];

function searchUrl(kind, label) {
  const q = encodeURIComponent("A1 German " + label);
  return kind === "video"
    ? `https://www.youtube.com/results?search_query=${q}`
    : `https://www.google.com/search?q=${q}`;
}

// Study estimate as a RANGE, because 3.5 points/day is an untested assumption:
// "about 2-3 days", "about 8-12 days", "about 2-3 weeks", "4+ weeks".
function approx(d) {
  if (d >= THRESHOLDS.maxDays) return "4+ weeks";
  const hi = Math.ceil(d * 1.5);
  if (hi <= 20) return d === hi ? `about ${d} day${d === 1 ? "" : "s"}` : `about ${d}–${hi} days`;
  const lo = Math.round(d / 7);
  const hiW = Math.round(hi / 7);
  return lo === hiW ? `about ${lo} week${lo === 1 ? "" : "s"}` : `about ${lo}–${hiW} weeks`;
}

// "today", "tomorrow", "in 5 days" (so we never print "in 0 days" or "in -8 days")
function examIn(S) {
  if (S === 0) return "today";
  if (S === 1) return "tomorrow";
  return `in ${S} days`;
}

function fmtDate(d) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function dateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

function fmtIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return fmtDate(new Date(y, m - 1, d));
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  [].concat(children).forEach((c) => c && node.appendChild(c));
  return node;
}

/* ---------------- Start ---------------- */

function selfRatingField() {
  const chips = SELF_LABELS.map((label, i) =>
    el("button", {
      type: "button", class: "chip", "aria-pressed": "false", text: label,
      onclick: () => {
        state.selfRating = state.selfRating === i + 1 ? null : i + 1;
        chips.forEach((c, j) => {
          c.setAttribute("aria-pressed", String(state.selfRating === j + 1));
          c.classList.toggle("on", state.selfRating === j + 1);
        });
      },
    })
  );
  return el("fieldset", { class: "self" }, [
    el("legend", { text: "Optional: how ready do you feel for the exam right now?" }),
    el("div", { class: "chips" }, chips),
  ]);
}

function renderStart() {
  state.selfRating = null;
  app.replaceChildren(
    el("section", { class: "card" }, [
      el("p", { class: "eyebrow", text: "A1 German · Goethe / ÖSD" }),
      el("h1", { text: "Am I exam-ready?" }),
      el("p", {
        class: "lead",
        text: "A short mock check: 15 questions on vocabulary, grammar, and reading and replying. You'll see how ready you look, how it breaks down by skill, a rough study range, and what to practise first.",
      }),
      el("ul", { class: "meta" }, [
        el("li", { text: "⏱ About 8 minutes" }),
        el("li", { text: "📵 No dictionary, no translator" }),
        el("li", { text: "🔒 Anonymous: no name or email. Your score may be used to improve the check." }),
      ]),
      selfRatingField(),
      el("button", { class: "btn primary", text: "Start the check", onclick: startQuiz }),
    ])
  );
}

function startQuiz() {
  state.index = 0;
  state.answers = {};
  state.order = {};
  state.slotDate = null;
  state.attempt += 1;
  QUESTIONS.forEach((q) => {
    state.order[q.id] = shuffle(q.options.map((_, i) => i));
  });
  trackEvent("check_started", { attempt: state.attempt });
  renderQuestion();
}

/* ---------------- Question ---------------- */

function renderQuestion() {
  const q = QUESTIONS[state.index];
  const total = QUESTIONS.length;
  announce(`Question ${state.index + 1} of ${total}`);
  window.scrollTo(0, 0);
  const selected = state.answers[q.id];

  const options = state.order[q.id].map((origIdx) => {
    const id = `${q.id}-${origIdx}`;
    const input = el("input", { type: "radio", name: q.id, id, value: String(origIdx) });
    if (selected === origIdx) input.checked = true;
    input.addEventListener("change", () => {
      state.answers[q.id] = origIdx;
      next.disabled = false;
    });
    return el("label", { class: "option", for: id }, [
      input,
      el("span", { text: q.options[origIdx] }),
    ]);
  });

  const next = el("button", {
    class: "btn primary",
    text: state.index === total - 1 ? "See my result" : "Next",
    onclick: () => {
      if (state.index === total - 1) renderResults();
      else {
        state.index++;
        renderQuestion();
      }
    },
  });
  next.disabled = selected === undefined;

  const back = el("button", {
    class: "btn ghost",
    text: "Back",
    onclick: () => {
      state.index--;
      renderQuestion();
    },
  });
  if (state.index === 0) back.style.visibility = "hidden";

  app.replaceChildren(
    el("section", { class: "card" }, [
      el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(state.index + 1) }, [
        el("div", { class: "progress-fill", style: `width:${((state.index + 1) / total) * 100}%` }),
      ]),
      el("p", { class: "eyebrow", text: `${SKILLS[q.skill].label} · Question ${state.index + 1} of ${total}` }),
      q.passage ? el("blockquote", { class: "passage", text: q.passage }) : null,
      el("h2", { text: q.prompt }),
      el("div", { class: "options", role: "radiogroup" }, options),
      el("div", { class: "nav" }, [back, next]),
    ])
  );
}

/* ---------------- Results ---------------- */

function levelTrack(currentLevel) {
  return el(
    "ol",
    { class: "track", "aria-label": "Your level journey" },
    LEVEL_ORDER.map((key) => {
      const b = BANDS[key];
      const cls = "step" + (b.level < currentLevel ? " done" : "") + (b.level === currentLevel ? " current" : "");
      return el("li", { class: cls }, [
        el("span", { class: "dot", text: b.level < currentLevel ? "✓" : String(b.level) }),
        el("span", { class: "lbl", text: b.name }),
      ]);
    })
  );
}

function planCard(r) {
  const titles = {
    LONG: "Your learning plan", WEEK: "Your learning plan",
    QUICK: "Your quick revision", PASS_THIN: "Practise these before you book", READY: "Keep these sharp",
  };
  const list = r.practise; // always 2-3 items (see computeReadiness)
  // Learners who only need a short revision don't need new lessons; those who need
  // a week or more get free public resources.
  const showResources = r.band === "WEEK" || r.band === "LONG";

  const items = list.length
    ? list.map((p, i) =>
        el("li", { class: "practice-item" }, [
          el("span", { class: "num", text: String(i + 1) }),
          el("div", {}, [
            el("strong", { text: p.label }),
            el("span", { class: "tag", text: SKILLS[p.skill].label }),
            p.kind === "review" ? el("span", { class: "tag soft", text: "Double-check: you got this right, but it's a tricky one" }) : null,
            el("p", { text: p.tip }),
          ]),
        ])
      )
    : [
        el("li", { class: "practice-item" }, [
          el("span", { class: "num", text: "✓" }),
          el("div", {}, [
            el("strong", { text: "No gaps found in this check" }),
            el("p", { text: "Now test what this check doesn't cover: do a full timed mock exam including listening, writing and speaking." }),
          ]),
        ]),
      ];

  const kids = [
    el("h2", { text: titles[r.band] }),
    r.band === "QUICK"
      ? el("p", { class: "legend", text: `Spend ${approx(r.days)} revising these topics. No new course needed.` })
      : null,
    el("ol", { class: "practice" }, items),
    r.missed.length === 0
      ? el("p", { class: "legend", text: "You got everything right, so these are the trickiest topics to double-check. Then do a full timed mock including listening, writing and speaking." })
      : null,
  ];

  if (showResources) {
    kids.push(
      el("div", { class: "resources" }, [
        el("h3", { text: "Free resources to learn from" }),
        el("ul", {}, [
          ...RESOURCES.map((x) =>
            el("li", {}, [el("a", { href: x.url, target: "_blank", rel: "noopener", text: x.label })])
          ),
          ...list.map((p) =>
            el("li", {}, [
              el("span", { text: `${p.label}: ` }),
              el("a", { href: searchUrl("video", p.label), target: "_blank", rel: "noopener", text: "videos" }),
              el("span", { text: " · " }),
              el("a", { href: searchUrl("web", p.label), target: "_blank", rel: "noopener", text: "articles" }),
            ])
          ),
        ]),
      ])
    );
  }
  const stepKey = NEXT_STEP_FOR_BAND[r.band];
  const step = NEXT_STEP[stepKey];
  if (step && step.url) {
    kids.push(
      el("div", { class: "next-step" }, [
        el("p", { class: "legend", text: step.note }),
        el("div", { class: "cta-row" }, [
          el("a", {
            class: "btn primary link", href: step.url, target: "_blank", rel: "noopener", text: step.label,
            onclick: () => trackEvent("cta_next_step", { band: r.band, target: stepKey }),
          }),
        ]),
      ])
    );
  }
  return el("section", { class: "card" }, kids);
}

// One line comparing how the learner FELT before the check with what the check shows.
function selfNote(r) {
  const f = state.selfRating;
  if (f == null) return null;
  if (f >= 4 && r.band !== "READY")
    return el("p", { class: "legend", text: "You said you felt ready. Feeling ready and being ready can differ, so look at the gaps below before you book." });
  if (f <= 2 && r.band === "READY")
    return el("p", { class: "legend", text: "You felt unsure, but you did well here. A full timed mock will show if that holds across all four exam parts." });
  return null;
}

// One-tap check on the score itself. Feeds the validation question: does the score match reality?
function feedbackCard(r) {
  const box = el("section", { class: "card" });
  const ask = [
    el("h2", { text: "Does this result feel right?" }),
    el("p", { class: "lead", text: "One tap helps us check whether the score is right. It stays anonymous." }),
    el("div", { class: "chips" }, [
      ["lower", "Lower than I expected"], ["right", "About what I expected"], ["higher", "Higher than I expected"],
    ].map(([key, label]) =>
      el("button", {
        type: "button", class: "chip", text: label,
        onclick: () => {
          trackEvent("result_feedback", { answer: key, band: r.band, overall: r.overall, self_rating: state.selfRating });
          box.replaceChildren(el("p", { class: "lead", text: "Thanks. That helps us check whether the score is right." }));
        },
      })
    )),
  ];
  box.replaceChildren(...ask);
  return box;
}

function renderResults() {
  const r = computeReadiness(state.answers, QUESTIONS, SKILLS, TOPICS);
  announce(`Your result is ready. Score ${r.overall} out of 100.`);
  const b = BANDS[r.band];
  trackResult(r, state.attempt, { self_rating: state.selfRating });

  const progress = Math.min(100, Math.round((r.overall / THRESHOLDS.pass) * 100));

  const verdictCard = el("section", { class: `card verdict ${b.cls}` }, [
    el("p", { class: "eyebrow", text: "Your readiness" }),
    el("div", { class: "score" }, [
      el("span", { class: "score-num", text: String(r.overall) }),
      el("span", { class: "score-of", text: "/ 100" }),
    ]),
    el("h1", { text: b.title }),
    el("p", { class: "lead", text: b.text }),
    selfNote(r),
    state.attempt > 1
      ? el("p", { class: "legend retake", text: "You've seen these questions before, so part of a higher score may be memory. Use it to track progress, and do a full timed mock before you book." })
      : null,
    el("p", { class: "legend", text: `On a retake, expect roughly ${r.low}–${r.high}. This is a 15-question check, so treat the score as a guide, not a prediction.` }),
    r.days > 0 ? el("p", { class: "weeks", text: `Rough study estimate: ${approx(r.days)} (a starting assumption, not a promise)` }) : null,
    levelTrack(b.level),
    el("div", { class: "unlock" }, [
      el("div", { class: "bar" }, [
        el("div", { class: `bar-fill ${r.band === "READY" ? "strong" : "ok"}`, style: `width:${progress}%` }),
      ]),
      el("p", {
        class: "legend",
        text: r.days === 0
          ? (r.band === "READY" ? "You're comfortably above the passing mark (60)." : "You're at or just above the passing mark (60), with little margin.")
          : `${r.pointsToGo} point${r.pointsToGo === 1 ? "" : "s"} to the passing mark (60).`,
      }),
    ]),
  ]);

  const bars = Object.keys(SKILLS).map((k) => {
    const s = r.skillScores[k];
    const c = r.skillCounts[k];
    const level = s >= 70 ? "strong" : s >= 60 ? "ok" : "weak";
    return el("div", { class: "skill" }, [
      el("div", { class: "skill-head" }, [
        el("span", { text: `${SKILLS[k].label} ` }, [el("small", { class: "w", text: `counts for ${Math.round(SKILLS[k].weight * 100)}%` })]),
        el("strong", { text: `${c.correct} of ${c.total} correct` }),
      ]),
      el("div", { class: "bar" }, [
        el("div", { class: `bar-fill ${level}`, style: `width:${s}%` }),
        el("div", { class: "bar-mark", title: "Passing mark (60%)" }),
      ]),
    ]);
  });

  const slotBox = el("details", { class: "card slot", id: "cta" });
  renderSlot(slotBox, r, "main");

  const review = r.missed.length
    ? el("details", { class: "review" }, [
        el("summary", { text: `Review the ${r.missed.length} question${r.missed.length > 1 ? "s" : ""} you missed` }),
        ...r.missed.map((q) =>
          el("div", { class: "missed" }, [
            q.passage ? el("blockquote", { class: "passage small", text: q.passage }) : null,
            el("p", { class: "q", text: q.prompt }),
            el("p", { class: "yours", text: `Your answer: ${state.answers[q.id] === undefined ? "—" : q.options[state.answers[q.id]]}` }),
            el("p", { class: "right", text: `Correct answer: ${q.options[q.answer]}` }),
            el("p", { class: "why", text: `Why: ${q.why}` }),
          ])
        ),
      ])
    : null;

  app.replaceChildren(
    verdictCard,
    el("section", { class: "card" }, [
      el("h2", { text: "By skill" }),
      ...bars,
      el("p", { class: "legend", text: "The vertical line marks 60%, the passing mark. Reading and replying counts most, because at A1 understanding and answering is what matters first." }),
    ]),
    planCard(r),
    slotBox,
    review,
    feedbackCard(r),
    el("section", { class: "card note" }, [
      el("p", {
        text: "This is an estimate from 15 questions. It doesn't test listening, writing or speaking, which are also part of the real exam. The study-time estimate assumes about 3.5 points gained per day of focused study, a starting assumption to refine with real learner data. The ±13 range is the typical swing we measured by simulating learners with fixed knowledge, not a result from real learners yet.",
      }),
      el("button", { class: "btn ghost", text: "Retake the check", onclick: () => { state.selfRating = null; startQuiz(); } }),
    ])
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// The exam-slot card. Compares the days of study needed with the days until the
// learner's slot (booked, or the earliest they can get) and advises what to do.
// Views: main | plan (timeline) | confirm (risky date) | book (links).
function renderSlot(box, r, view) {
  const S = state.slotDate ? daysUntil(state.slotDate, new Date()) : null;
  const t = planTimeline(r.days, S);
  const go = (v) => renderSlot(box, r, v);
  const advice = (title, text) => el("div", { class: "advice" }, [el("strong", { text: title }), el("p", { text })]);
  const btn = (text, cls, fn) => el("button", { class: `btn ${cls}`, text, onclick: fn });
  const kids = [];

  if (view === "main" || view === "main-past") {
    const dateInput = el("input", { type: "date", id: "slot-date", min: todayIso() });
    if (state.slotDate) dateInput.value = state.slotDate;
    dateInput.addEventListener("change", () => {
      if (dateInput.value && daysUntil(dateInput.value, new Date()) < 0) {
        state.slotDate = null;
        trackEvent("slot_invalid_past");
        go("main-past");
        return;
      }
      state.slotDate = dateInput.value || null;
      const s2 = state.slotDate ? daysUntil(state.slotDate, new Date()) : null;
      trackEvent("slot_set", { days_until_exam: s2, days_needed: r.days, band: r.band });
      go("main");
    });

    kids.push(
      el("h2", { text: "Match this to your exam slot" }),
      el("p", { class: "lead", text: "Enter your booked exam date, or the earliest slot you can get." }),
      el("div", { class: "date-row" }, [
        el("label", { for: "slot-date", text: "Exam date" }),
        dateInput,
      ]),
      view === "main-past"
        ? el("p", { class: "error", role: "alert", text: "That date has already passed. Pick today or a later date." })
        : null
    );

    const buttons = [];
    if (t.status === "BOOK_NOW") {
      kids.push(r.band === "PASS_THIN"
        ? advice("You're near the passing line", "Book a slot at least a week out, so you have time for a full timed mock first. Enter its date above and we'll check the timing.")
        : advice("You look ready on this check", "Book the earliest slot you can get. Enter its date above and we'll check the timing."));
      buttons.push(btn("Book my exam", "primary", () => { trackEvent("cta_book", { band: r.band }); go("book"); }));
    } else if (t.status === "KEEP_DATE") {
      kids.push(r.band === "PASS_THIN"
        ? advice(`Your exam is ${examIn(S)}`, "You're near the passing line. Keep your date, but use the days before it for the practice list above and one full timed mock.")
        : advice(`Your exam is ${examIn(S)}`, "You look ready on this check. Keep your date, and do one full timed mock before it."));
      buttons.push(btn("Manage my booking", "primary", () => go("book")));
    } else if (t.status === "CHOOSE_SLOT") {
      kids.push(advice(
        `You need ${approx(r.days)} of study`,
        `Book a slot on or after ${dateIn(r.days)}. You can book now and keep studying until then. Enter the date above and we'll check it.`
      ));
      buttons.push(
        btn("Follow my plan", "primary", () => { trackEvent("cta_follow_plan", { band: r.band }); go("plan"); }),
        btn("Book a slot", "ghost", () => { trackEvent("cta_book", { band: r.band }); go("book"); })
      );
    } else if (t.status === "ON_TRACK") {
      kids.push(advice(
        `Your exam is ${examIn(S)}: enough time`,
        `You need ${approx(r.days)}, so you have ${t.buffer} day${t.buffer === 1 ? "" : "s"} to spare. Follow your plan, then retake this check around ${dateIn(r.days)} to see your progress.`
      ));
      buttons.push(
        btn("Follow my plan", "primary", () => { trackEvent("cta_follow_plan", { band: r.band }); go("plan"); }),
        btn("Manage my booking", "ghost", () => go("book"))
      );
    } else if (t.status === "TOO_SOON") {
      kids.push(advice(
        `Your exam is ${examIn(S)}, but you may need ${approx(r.days)}`,
        `That's ${t.short} day${t.short === 1 ? "" : "s"} too soon. Move your exam to ${dateIn(r.days)} or later.`
      ));
      buttons.push(
        btn("Move to a later slot", "primary", () => { trackEvent("cta_move_slot", { band: r.band }); go("book"); }),
        btn("Keep this date anyway", "ghost", () => { trackEvent("cta_keep_risky_date", { band: r.band }); go("confirm"); })
      );
    }
    kids.push(el("div", { class: "cta-row" }, buttons));
  }

  if (view === "plan") {
    const first = r.practise.length ? r.practise[0].label : "a full timed mock exam";
    const steps = [[ "Today", `Start with: ${first}` ]];
    if (r.days > 0) steps.push([dateIn(r.days), "Retake this check. Aim for 60 or more."]);
    if (state.slotDate) steps.push([fmtIso(state.slotDate), "Your exam"]);
    kids.push(
      el("h2", { text: "Your timeline" }),
      el("ol", { class: "timeline" }, steps.map(([when, what]) =>
        el("li", {}, [el("strong", { text: when }), el("span", { text: what })])
      )),
      btn("Back", "ghost", () => go("main"))
    );
  }

  if (view === "confirm") {
    const check = el("input", { type: "checkbox", id: "confirm-risk" });
    const cont = btn("Continue", "primary", () => { trackEvent("cta_risk_confirmed", { band: r.band }); go("book"); });
    cont.disabled = true;
    check.addEventListener("change", () => (cont.disabled = !check.checked));
    kids.push(
      el("h2", { text: "Before you keep this date" }),
      el("p", { class: "lead", text: `Your result suggests you need ${approx(r.days)}, but your exam is ${examIn(S)}. Taking it on this date risks failing and losing the exam fee.` }),
      el("label", { class: "confirm", for: "confirm-risk" }, [check, el("span", { text: "I understand I may fail and lose the exam fee." })]),
      el("div", { class: "cta-row" }, [btn("Back", "ghost", () => go("main")), cont])
    );
  }

  if (view === "book") {
    kids.push(
      el("h2", { text: "Book or manage your exam" }),
      el("p", { class: "lead", text: "Choose your exam provider and book on their site." }),
      S != null && S >= 0
        ? el("p", { class: "weeks", text: `Reminder: your exam is ${examIn(S)}.` })
        : null,
      el("div", { class: "cta-row" }, [
        el("a", { class: "btn primary link", href: "https://www.goethe.de", target: "_blank", rel: "noopener", text: "Goethe-Institut" }),
        el("a", { class: "btn ghost link", href: "https://www.oesd.at", target: "_blank", rel: "noopener", text: "ÖSD" }),
      ]),
      btn("Back", "ghost", () => go("main"))
    );
  }

  box.replaceChildren(el("summary", { text: "Planning your exam date? (optional)" }), ...kids.filter(Boolean));
}

renderStart();
