// 15 A1-level questions: 4 vocabulary, 4 grammar, 7 reading & replying.
// Every reading item has its own passage, so the 7 reading items are independent.
//
// DESIGN DECISION: "ready" at A1 means the learner can UNDERSTAND German and REPLY
// sensibly, even if grammar and vocabulary are not perfect. So the comprehension skill
// ("Reading & replying") carries 60% of the score; grammar and vocabulary 20% each.
// Reading & replying includes "read the situation, pick the right reply" items.
//
// Each question has:
//   skill  - which skill it belongs to
//   topic  - key into TOPICS (used to pick what to practise)
//   weight - 1 = core A1, 2 = trickier A1 (the kind of item learners actually fail on)
//   answer - index of the correct option in `options`
//   why    - one-line explanation shown when the learner misses it

const SKILLS = {
  vocabulary: { label: "Vocabulary", weight: 0.2 },
  grammar: { label: "Grammar", weight: 0.2 },
  reading: { label: "Reading & replying", weight: 0.6 },
};

const TOPICS = {
  transport: {
    label: "Everyday places & transport words",
    tip: "Make flashcards for places in town (Bahnhof, Apotheke, Bäckerei, Haltestelle). Aim for 30 words, then use them in 5 short sentences.",
  },
  time: {
    label: "Telling the time",
    tip: "Practise the informal clock: Viertel nach, halb, Viertel vor. 'Halb vier' is 3:30, not 4:30. Say the time out loud 10 times a day.",
  },
  numbers: {
    label: "Numbers (esp. 13–100)",
    tip: "German says numbers 'backwards' (einundzwanzig = one-and-twenty). Drill pairs like 17/70 and 16/60 until you can hear the difference.",
  },
  restaurant: {
    label: "Phrases for shops & restaurants",
    tip: "Learn 10 fixed phrases (Die Rechnung, bitte / Ich möchte … / Was kostet …?). Role-play ordering food with a friend or a tutor.",
  },
  conjugation: {
    label: "Verb endings (ich, du, er/sie)",
    tip: "Write out kommen, wohnen, heißen, machen for ich/du/er/wir/ihr/sie. Then fill in 20 gap sentences until the endings feel automatic.",
  },
  accusative: {
    label: "Articles in the accusative (ein / einen)",
    tip: "Only masculine words change: ein → einen. Test the rule on 'Ich habe ___ Bruder / Hund / Tisch' and compare with feminine and neuter.",
  },
  wordorder: {
    label: "Word order (verb in position 2)",
    tip: "The conjugated verb is always in position 2. 'Morgen fahre ich…' not 'Morgen ich fahre…'. Rewrite 10 sentences by starting each with a time word.",
  },
  negation: {
    label: "Negation (nicht vs kein)",
    tip: "Use 'kein' to negate a noun with ein/no article (Ich habe keine Zeit); use 'nicht' for verbs and adjectives. Make 10 pairs of positive/negative sentences.",
  },
  notices: {
    label: "Reading signs & notices",
    tip: "Practise with real A1 material: opening hours, course notices, shop signs. Underline days, times and numbers first, then read the question.",
  },
  messages: {
    label: "Reading short personal messages",
    tip: "Read short emails/WhatsApp texts (Goethe A1 sample papers). For each, find WHO, WHAT and WHEN before looking at the answer options.",
  },
  replying: {
    label: "Replying in everyday situations",
    tip: "Practise short dialogues: greetings, tickets, ordering. For each, first decide what is being asked (who / what / where / when), then pick the reply that answers exactly that.",
  },
};

const QUESTIONS = [
  // ---------- VOCABULARY (4) ----------
  {
    id: "v1", skill: "vocabulary", topic: "transport", weight: 1,
    why: "halten = to stop and die Stelle = the place, so die Haltestelle is a bus or tram stop.",
    prompt: "What does “die Haltestelle” mean?",
    options: ["Bus or tram stop", "Ticket machine", "Shopping street", "Train station"],
    answer: 0,
  },
  {
    id: "v2", skill: "vocabulary", topic: "time", weight: 1,
    why: "Viertel nach drei = a quarter past three = 3:15. “Viertel vor drei” would be 2:45.",
    prompt: "“Es ist Viertel nach drei.” What time is it?",
    options: ["2:45", "3:15", "3:45", "4:15"],
    answer: 1,
  },
  {
    id: "v3", skill: "vocabulary", topic: "numbers", weight: 1,
    why: "siebzig = 70. siebzehn is 17: -zehn is the “teens” ending, -zig is the “tens” ending.",
    prompt: "Which number is “siebzig”?",
    options: ["17", "27", "70", "77"],
    answer: 2,
  },
  {
    id: "v4", skill: "vocabulary", topic: "restaurant", weight: 2,
    why: "Die Rechnung = the bill. The menu is die Speisekarte.",
    prompt: "In a restaurant you say: “Die Rechnung, bitte!” What do you want?",
    options: ["The menu", "The bill", "Some water", "A table for two"],
    answer: 1,
  },

  // ---------- GRAMMAR (4) ----------
  {
    id: "g1", skill: "grammar", topic: "conjugation", weight: 1,
    why: "With ich the verb ends in -e: ich komme. -st goes with du, -t with er/sie/es, -en with wir/sie.",
    prompt: "Ich ___ aus Indien.",
    options: ["kommst", "kommt", "komme", "kommen"],
    answer: 2,
  },
  {
    id: "g2", skill: "grammar", topic: "accusative", weight: 2,
    why: "Bruder is masculine and is the thing you have (the object), so ein becomes einen in the accusative.",
    prompt: "Ich habe ___ Bruder.",
    options: ["ein", "einen", "eine", "einem"],
    answer: 1,
  },
  {
    id: "g3", skill: "grammar", topic: "wordorder", weight: 2,
    why: "In a main clause the conjugated verb sits in position 2. After “Morgen” comes the verb: Morgen fahre ich …",
    prompt: "Which sentence is correct?",
    options: [
      "Morgen ich fahre nach Berlin.",
      "Morgen fahre ich nach Berlin.",
      "Ich morgen fahre nach Berlin.",
      "Fahre morgen ich nach Berlin.",
    ],
    answer: 1,
  },
  {
    id: "g4", skill: "grammar", topic: "negation", weight: 2,
    why: "Zeit is feminine and has no article here, so you negate it with kein-: keine Zeit. nicht negates verbs and adjectives.",
    prompt: "Ich habe heute ___ Zeit.",
    options: ["nicht", "kein", "keine", "keinen"],
    answer: 2,
  },

  // ---------- READING & REPLYING (7) ----------
  {
    id: "r1", skill: "reading", topic: "notices", weight: 1,
    why: "The line “Sonntag: geschlossen” gives it away. geschlossen = closed.",
    passage:
      "Bäckerei Müller\nÖffnungszeiten:\nMo–Fr: 7:00–18:00 Uhr\nSamstag: 7:00–13:00 Uhr\nSonntag: geschlossen",
    prompt: "When can you buy bread on Sunday?",
    options: [
      "From 7:00",
      "Until 13:00",
      "You can't – it is closed",
      "Until 18:00",
    ],
    answer: 2,
  },
  {
    id: "r2", skill: "reading", topic: "replying", weight: 2,
    why: "Anna asks if you have time on Saturday. “Ja, gern.” says yes, and “Wo treffen wir uns?” asks where to meet. The other replies answer different questions.",
    passage: "Anna schreibt Ihnen:\n„Hast du am Samstag Zeit? Wir gehen um 15 Uhr ins Kino.“",
    prompt: "Which is the best reply?",
    options: [
      "Ja, gern. Wo treffen wir uns?",
      "Danke, gut. Und dir?",
      "Ich komme aus Indien.",
      "Nein, ich habe einen Bruder.",
    ],
    answer: 0,
  },
  {
    id: "r3", skill: "reading", topic: "messages", weight: 1,
    why: "“einen Termin beim Arzt” = an appointment at the doctor’s. He says it is at 9 Uhr and he is not home tomorrow.",
    passage:
      "Hallo Anna,\nich bin morgen leider nicht zu Hause. Ich habe um 9 Uhr einen Termin beim Arzt. Danach muss ich einkaufen. Kommst du am Freitag um 18 Uhr zum Abendessen?\nLiebe Grüße, Tom",
    prompt: "What does Tom do tomorrow morning?",
    options: [
      "He goes to the doctor",
      "He cooks dinner",
      "He visits Anna",
      "He goes to work",
    ],
    answer: 0,
  },
  {
    id: "r4", skill: "reading", topic: "notices", weight: 2,
    why: "“Heute: 10 Minuten später” means the train leaves 10 minutes later than usual. Gleis 6 is the platform, and the train goes to Hamburg.",
    passage: "Bahnhof Hannover\nIC 2045 nach Hamburg\nAbfahrt: 14:35 Uhr, Gleis 6\nHeute: 10 Minuten später",
    prompt: "What is different today?",
    options: [
      "The train leaves 10 minutes later",
      "The train goes to Hannover",
      "The train leaves from another city",
      "The train leaves at 10:00",
    ],
    answer: 0,
  },
  {
    id: "r5", skill: "reading", topic: "notices", weight: 2,
    why: "“Bitte bringen Sie Ihren Ausweis mit” = please bring your ID card (der Ausweis).",
    passage:
      "Deutschkurs A1\nDer Kurs beginnt am 3. Mai und findet dienstags und donnerstags von 18:30 bis 20:00 Uhr statt.\nBitte bringen Sie Ihren Ausweis mit.",
    prompt: "What must participants bring to the course?",
    options: ["A dictionary", "Their ID card", "A pencil", "The course fee"],
    answer: 1,
  },
  {
    id: "r6", skill: "reading", topic: "replying", weight: 1,
    why: "“Wie geht es Ihnen?” asks how you are. “Danke, gut. Und Ihnen?” answers it and asks the same back, politely.",
    passage: "Ein Nachbar sagt zu Ihnen:\n„Guten Tag! Wie geht es Ihnen?“",
    prompt: "Which is the best reply?",
    options: [
      "Ich bin 25 Jahre alt.",
      "Danke, gut. Und Ihnen?",
      "Ich komme aus Indien.",
      "Ja, bitte.",
    ],
    answer: 1,
  },
  {
    id: "r7", skill: "reading", topic: "replying", weight: 2,
    why: "“Wohin” asks where to, so the reply names a place: Nach München. “Um acht Uhr” would answer “Wann?”.",
    passage: "Am Bahnhof. Die Frau am Schalter fragt:\n„Wohin möchten Sie fahren?“",
    prompt: "Which is the best reply?",
    options: [
      "Um acht Uhr.",
      "Nach München, bitte.",
      "Ich habe keinen Hund.",
      "Das ist mein Bruder.",
    ],
    answer: 1,
  },
];

if (typeof module !== "undefined") {
  module.exports = { SKILLS, TOPICS, QUESTIONS };
}
