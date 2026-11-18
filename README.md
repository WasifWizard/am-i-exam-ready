# Am I exam-ready? — A1 German readiness check

A 15-question mock check for learners finishing A1 German who are deciding whether to book the Goethe or ÖSD exam. It returns a readiness score, a score per skill, a rough study range to reach the passing mark, and the 2–3 things to practise first. An optional, collapsed card then matches the result to their **exam slot**: keep the date, book it, move it, or follow a study plan up to it.

**Live app:** *add your link here*
**No backend, no build step:** plain HTML, CSS and JavaScript.

## Who it's for and why it exists

**Learner:** a professional in India (or another developing country) who has finished A1 German and is about to book a Goethe or ÖSD exam. Their next step abroad depends on passing.
**Problem:** they book without knowing if they are ready. A fail costs the exam fee and weeks.
**What the learner gets:** a clear "ready / not yet" with a reason, and the 2–3 things to do next.
**Why plain HTML:** no build, no backend, no login. It loads fast on a cheap phone and a slow connection, and a learner can use it in under 8 minutes without signing up.

## How I'd measure it

|Metric|What it tells us|Target|
|-|-|-|
|**North star: pass rate of learners told "likely ready"**|Is "ready" true?|Set after a baseline from real learners|
|Guardrail: learners told "ready" who then fail|Are we costing people their fee?|As close to 0 as possible; review every case|
|Completion rate (started → saw result)|Is the check short and clear enough?|Set after a baseline|
|Next action after the result (plan / practice / book / move slot)|Does the result change behaviour?|Set after a baseline|
|Retakes within 14 days among "not ready" learners|Does the result start a learning loop?|Set after a baseline|

I have no baseline yet, so I do not invent targets.

**The app doubles as research.** Before the check it asks (optionally) how ready the learner feels; after the result it asks one tap: lower, about right, or higher than expected. Together with real exam outcomes (backlog item 1) these let us test the score against both what learners believe and what actually happens.

## What each result leads to (and where Globio fits)

|Result|Next step for the learner|Business hook (Globio pages I found on globio.ai)|
|-|-|-|
|Likely ready (75+)|One full timed mock, then book|[Globio German mock test](https://www.globio.ai/german-mock-test/): Goethe A1–B1, all four parts|
|Close to the line (60–74)|Practice list, a full mock, then book|Same mock test|
|Quick revision (50–59)|Revise 2–3 days, then test yourself|Same mock test, as a progress check|
|About a week / More than a week|Practice list and plan, then retake|[Globio German A1 course](https://www.globio.ai/learn-german/german-a1/)|

The practice-plan card on the results page now ends with a Globio next step by band (`NEXT\_STEP` in `app.js`); the mapping is my hypothesis and `cta\_next\_step` records which one was clicked. The book buttons still go to the exam providers, because that is the learner's real next action. I did not read the full terms of any Globio plan or offer.

**Why the cautious cut-off is also a Globio business decision:** the A1 course page advertises an exam pass guarantee (a refund if the learner does not pass, per that page). A false "likely ready" then costs the learner the fee and costs Globio a refund. Globio's mock test covers Goethe only, so the ÖSD part of this check is general exam advice, not a Globio product. In a real version the "not ready" paths would continue inside Globio.

## What the app records

Events are anonymous and, in this demo, only logged to the browser console (`track.js`). Each exists to answer one question.

|Event|Question it answers|
|-|-|
|`check\_started` (`attempt`)|How many learners start, and how many retake?|
|`check\_completed.self\_rating` (1–5, optional, asked before the check)|How big is the gap between how ready learners **feel** and what the check shows? I expect "feels ready, scores low" to be the learners we most need to reach.|
|`result\_feedback` (lower / right / higher than expected)|One-tap subjective check: does the score match how the learner expected to do?|
|`cta\_next\_step` (`band`, `target`: mock or course)|Do learners continue into Globio's mock test or course, and which result sends the most?|
|`check\_completed` (`attempt`, score, skills, band, days, level segment, practice topics)|Who finishes, how ready are they, and are they really A1?|
|`slot\_set`, `slot\_invalid\_past`|Do learners know their exam date, and is the date field clear?|
|`cta\_follow\_plan`, `cta\_book`|Do learners study first or go straight to booking?|
|`cta\_move\_slot`, `cta\_keep\_risky\_date`, `cta\_risk\_confirmed`|When we say "too soon", do they listen?|

## Version 2 backlog, in priority order

1. **Calibrate against real exam results:** ask 20+ learners to take the check before their exam and share the outcome. Move the cut-offs to match.
2. **A listening mini-check:** the biggest gap between this check and the real exam.
3. **More items per topic, and alternate versions of each question:** most practice topics rest on one question, and retakes can be memorised.
4. **A "not sure" option:** to cut lucky guesses (this needs its own noise measurement).
5. **A tighter handoff to Globio**: pre-filling the learner's level and weakest skill, and a real event endpoint instead of the console.

**Deliberately not built:** accounts, email capture and adaptive testing. The exam-slot planner is built but collapsed and marked optional, because it rests on the most untested assumption (the study rate) and is not part of the core job. They add friction or build time before we know the score is right.

## Product decisions

|Decision|What I chose|Why|
|-|-|-|
|What does "ready" mean at A1?|The learner can **understand German and reply sensibly**, even if grammar and vocabulary aren't perfect|Comprehension matters more than perfect accuracy at this level|
|Score weights|Reading \& replying **60%**, Grammar 20%, Vocabulary 20%|Follows from the line above|
|Passing mark vs "ready"|Pass mark is **60** (the real exam's pass mark). "Likely ready" needs **75**|A false "book now" costs the learner the exam fee and their trust; a false "wait" costs a few days. In simulation the score on this check has a standard deviation of about 13 points for a learner with fixed knowledge, so "ready" needs about one SD of margin above 60|
|Study time|Gap to 60 ÷ 3.5 points per day (min. 2 days): **10 points short → 2–3 days; 25+ short → more than a week**|One rule instead of fixed buckets, so there are no gaps between bands|
|Quick fix vs real learning|Learners 1–10 points short get a **revision plan only**. Those further short get a learning plan with **free public resources** (videos, articles)|A short gap needs revision, not a new course|
|Booking|Based on **exam-slot availability**. The learner enters their booked or earliest slot and the app compares it with the days of study needed|The right advice depends on time available|
|Slot too soon|Suggest a later slot. If the learner keeps the risky date, they must **confirm they may fail and lose the fee**|Respects their choice, but makes the risk explicit|
|Keeping learners engaged|A 4-step level journey, a "points to the passing mark" bar, a dated timeline (study → retake → exam)|Learners who aren't ready yet can keep working toward their booked date|
|"Are they really A1?"|**Not shown to the learner.** Flagged internally as `level\_segment`|So the team knows who our real customers are|

### Why there is a "near the line" band

A score of 60 is not a safe pass: the check is only 15 questions and doesn't test listening or speaking. In a simulation, a learner whose knowledge is fixed at 50% lands on 60 or more about 60% of the time. So scores of **60–74 are "close to the passing line: confirm before you book"** (practice list, then a full timed mock). Only **75+ is "likely ready on what this check covers"**. Results also show a retake range (score ±13). Set `THRESHOLDS.comfortable` equal to `THRESHOLDS.pass` in `scoring.js` to remove this band.

### Assumptions that still need validating

* **3.5 points gained per day of study.** I chose it so that 10 points short means 2–3 days and 25+ short means more than a week. It is my own assumption, not data from Globio, and it is untested. That is why the study estimate is shown as a range, labelled a starting assumption. It's probably optimistic for large gaps, and a first thing to check with real learners.
* **The ±13 noise and the 75 cut-off** come from simulating learners with fixed knowledge (guessing at 25% on what they don't know). They are not measured on real learners yet.
* **Band and segment cut-offs** (below 30 and 90+ for the internal segment) are starting points. A near-perfect score can't truly confirm someone is above A1.
* Exam-slot availability is **entered by the learner**. A real product would read it from the exam centre's booking system.

## How the score works

1. **Skill score** = weighted % correct in the skill. Trickier A1 items count double.
2. **Overall** = Reading \& replying × 0.6 + Grammar × 0.2 + Vocabulary × 0.2.
3. **Days needed** = ⌈(60 − overall) ÷ 3.5⌉, minimum 2, 0 if already at 60+.
4. **Bands:** 75+ Likely ready · 60–74 Close to the line (confirm with a full mock) · 50–59 Quick revision (2–3 days) · 36–49 About a week (4–7 days) · 35 or below More than a week (8+ days).
5. **Slot timeline:** compares days needed with days until the learner's slot → *book now / keep date / choose a slot / on track / too soon*.

**Practise list:** each question is tagged with a topic. Topics are ranked by weighted points lost (ties go to the weaker skill) and the top 3 are shown with a concrete tip. The list is always 2–3 items: if the learner lost points on fewer than two topics, it is padded with the trickiest topics they got right, labelled "double-check".

**Skills** are shown as questions correct ("3 of 4 correct"), not percentages, because 4 questions can't support a precise percentage. Each missed question shows a one-line "why".

## Privacy and tracking

The learner is told the check is anonymous (no name or email). `track.js` builds anonymous events (score, band, days needed, level segment, practice topics, slot date offset, button clicks). In this demo nothing leaves the browser; events are only logged to the console. Set `TRACKING\_ENDPOINT` in `track.js` to send them to a backend.

## Files

|File|Purpose|
|-|-|
|`index.html`|Page shell|
|`style.css`|Styling (mobile-first)|
|`questions.js`|Questions, skill weights, topic labels and practice tips. Edit this to change content|
|`scoring.js`|Pure scoring, days-needed, bands and slot-timeline logic, no DOM, so it's testable|
|`track.js`|Anonymous analytics hook|
|`app.js`|UI: start, question and results screens; slot, timeline, confirm and booking views|
|`scoring.test.js`|Unit tests: `node scoring.test.js`|

## Limitations

* Covers vocabulary, grammar, and reading \& replying only. Listening, writing and speaking are also part of the real exam; the results page says so.
* "Replying" is tested by choosing the best reply from options, which tests recognition, not producing German.
* Each reading item has its own passage (no two questions on one text), but the new harder items have not been checked against official Goethe/ÖSD A1 sample papers or by a German teacher.
* Most practice topics rest on a single question, so one lucky guess or one slip can change the list. This is the main thing the next version should fix with more items per topic.
* The question bank is small and fixed (options are shuffled each attempt), so retakes can be memorised. The results page says so on a retake, and `check\_completed` records the attempt number so retake scores can be analysed separately. It should be reviewed by a German teacher against official Goethe/ÖSD A1 sample papers.
* Learning resources are general links plus search links for each topic. They should be replaced with curated links. Booking buttons link to the Goethe-Institut and ÖSD home pages.

## How this was built

The product decisions above are mine. I built the implementation with AI assistance (Claude) and verified it with unit tests and a click-through test of the main flows.

