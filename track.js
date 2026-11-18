// Product-analytics hook. In this demo nothing leaves the browser: events are only
// logged to the console. To go live, set TRACKING_ENDPOINT to a URL that accepts POST.
//
// Events are anonymous: no name, no email, no free text. They exist so the team can
// see which learners are real A1 learners (our customers) vs well below / above A1,
// and how people use the result (follow the plan vs book directly).

const TRACKING_ENDPOINT = null; // e.g. "https://example.com/api/events"

const SESSION_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

function trackEvent(name, props = {}) {
  const event = { event: name, session: SESSION_ID, ts: new Date().toISOString(), ...props };
  if (TRACKING_ENDPOINT && typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(TRACKING_ENDPOINT, JSON.stringify(event));
  } else if (typeof console !== "undefined") {
    console.info("[track]", event);
  }
  return event;
}

function trackResult(result, attempt = 1, extra = {}) {
  return trackEvent("check_completed", {
    ...extra, // e.g. self_rating: how ready the learner felt before the check (1-5 or null)
    attempt, // >1 means a retake in the same session (scores may be inflated by memory)
    overall: result.overall,
    skills: result.skillScores,
    band: result.band,
    days_needed: result.days,
    level_segment: result.segment, // below_a1 | a1 | possible_a2 (internal only)
    practise_topics: result.practise.map((p) => p.topic),
  });
}

if (typeof module !== "undefined") {
  module.exports = { trackEvent, trackResult };
}
