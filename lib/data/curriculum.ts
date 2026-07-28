import type { Finger } from "./keyboard";

export type ExerciseType = "copy" | "guided-key" | "word-reveal" | "metronome" | "blind";

export interface LessonExercise {
  type: ExerciseType;
  content: string | string[];
  bpm?: number;
  targetWpm?: number;
  targetAccuracy?: number;
  instructions?: string;
}

export interface Lesson {
  id: string;
  phase: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  targetKeys: string[];
  targetFingers: Finger[];
  targetWpm: number;
  targetAccuracy: number;
  exercises: LessonExercise[];
  unlocksAfter: string | null;
  estimatedMinutes: number;
}

export const PHASE_META: Record<
  1 | 2 | 3 | 4,
  { title: string; subtitle: string }
> = {
  1: { title: "Foundation", subtitle: "Build finger placement from the home row out" },
  2: { title: "Accuracy", subtitle: "Clean form first — 95%+ before speed" },
  3: { title: "Speed", subtitle: "Metronome pacing and endurance" },
  4: { title: "Real-world", subtitle: "Email, chat, code, and terminal typing" },
};

export const CURRICULUM: Lesson[] = [
  // ── Phase 1 — Foundation ──────────────────────────────────────────────────
  {
    id: "f-01",
    phase: 1,
    title: "Left home row",
    description: "Both hands aren't needed yet. Just left — a s d f.",
    targetKeys: ["a", "s", "d", "f"],
    targetFingers: ["left-pinky", "left-ring", "left-middle", "left-index"],
    targetWpm: 15,
    targetAccuracy: 90,
    unlocksAfter: null,
    estimatedMinutes: 5,
    exercises: [
      {
        type: "guided-key",
        content: ["a", "s", "d", "f"],
        instructions: "Press the highlighted key. Keep fingers on home row.",
      },
      {
        type: "copy",
        content: "aaa sss ddd fff asdf asdf asdf",
        instructions: "Type the sequence. Don't look at the keyboard.",
      },
      {
        type: "word-reveal",
        content: ["sad", "dad", "fad", "add", "ads", "sass", "dada", "fads"],
      },
      {
        type: "copy",
        content: "a sad dad; as a fad; add a sad dad",
      },
    ],
  },
  {
    id: "f-02",
    phase: 1,
    title: "Right home row",
    description: "Mirror of f-01 — j k l ;",
    targetKeys: ["j", "k", "l", ";"],
    targetFingers: ["right-index", "right-middle", "right-ring", "right-pinky"],
    targetWpm: 15,
    targetAccuracy: 90,
    unlocksAfter: "f-01",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "guided-key",
        content: ["j", "k", "l", ";"],
        instructions: "Right hand only. Index on j.",
      },
      {
        type: "copy",
        content: "jjj kkk lll ;;; jkl; jkl; jkl;",
      },
      {
        type: "word-reveal",
        content: ["kill", "jill", "likk", "lull", "jkl;", "lljk"],
      },
      {
        type: "copy",
        content: "jill; kill; a lull; jkl; jkl;",
      },
    ],
  },
  {
    id: "f-03",
    phase: 1,
    title: "Both home rows",
    description: "First time using both hands together on asdf jkl;",
    targetKeys: ["a", "s", "d", "f", "j", "k", "l", ";"],
    targetFingers: [
      "left-pinky",
      "left-ring",
      "left-middle",
      "left-index",
      "right-index",
      "right-middle",
      "right-ring",
      "right-pinky",
    ],
    targetWpm: 18,
    targetAccuracy: 90,
    unlocksAfter: "f-02",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "guided-key",
        content: ["a", "s", "d", "f", "j", "k", "l", ";"],
      },
      {
        type: "copy",
        content: "asdf jkl; asdf jkl; fjdk slal; asdf jkl;",
      },
      {
        type: "word-reveal",
        content: ["flask", "salad", "falls", "asks", "lad", "jak", "all", "sad"],
      },
      {
        type: "copy",
        content: "a sad dad; all fall; a flask; ask dad; fall as a lad",
      },
    ],
  },
  {
    id: "f-04",
    phase: 1,
    title: "Left top row",
    description: "Reach up with left hand only — q w e r",
    targetKeys: ["q", "w", "e", "r"],
    targetFingers: ["left-pinky", "left-ring", "left-middle", "left-index"],
    targetWpm: 18,
    targetAccuracy: 88,
    unlocksAfter: "f-03",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "guided-key",
        content: ["q", "w", "e", "r"],
        instructions: "Return to home row after each key.",
      },
      {
        type: "copy",
        content: "qqq www eee rrr qwer qwer qwer",
      },
      {
        type: "word-reveal",
        content: ["were", "weer", "ewer", "raw", "war", "err", "we", "re"],
      },
      {
        type: "copy",
        content: "we were rare; wear a red ware; we err",
      },
    ],
  },
  {
    id: "f-05",
    phase: 1,
    title: "Right top row",
    description: "Reach up with right hand only — u i o p",
    targetKeys: ["u", "i", "o", "p"],
    targetFingers: ["right-index", "right-middle", "right-ring", "right-pinky"],
    targetWpm: 18,
    targetAccuracy: 88,
    unlocksAfter: "f-04",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "guided-key",
        content: ["u", "i", "o", "p"],
      },
      {
        type: "copy",
        content: "uuu iii ooo ppp uiop uiop uiop",
      },
      {
        type: "word-reveal",
        content: ["pop", "pip", "pup", "oil", "upo", "poi", "iou", "oup"],
      },
      {
        type: "copy",
        content: "pop up; oil oil; you pout; ioup ioup",
      },
    ],
  },
  {
    id: "f-06",
    phase: 1,
    title: "Top row combined",
    description: "Full top row, both hands — qwertyuiop",
    targetKeys: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    targetFingers: [
      "left-pinky",
      "left-ring",
      "left-middle",
      "left-index",
      "right-index",
      "right-middle",
      "right-ring",
      "right-pinky",
    ],
    targetWpm: 20,
    targetAccuracy: 88,
    unlocksAfter: "f-05",
    estimatedMinutes: 7,
    exercises: [
      {
        type: "guided-key",
        content: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      },
      {
        type: "copy",
        content: "qwerty uiop typewriter power quit true",
      },
      {
        type: "word-reveal",
        content: ["quite", "true", "power", "write", "your", "poetry", "type", "query"],
      },
      {
        type: "copy",
        content: "you type very well; write every word quite true; keep power up",
      },
    ],
  },
  {
    id: "f-07",
    phase: 1,
    title: "Left bottom row",
    description: "Reach down with left hand — z x c v",
    targetKeys: ["z", "x", "c", "v"],
    targetFingers: ["left-pinky", "left-ring", "left-middle", "left-index"],
    targetWpm: 18,
    targetAccuracy: 88,
    unlocksAfter: "f-06",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "guided-key",
        content: ["z", "x", "c", "v"],
      },
      {
        type: "copy",
        content: "zzz xxx ccc vvv zxcv zxcv zxcv",
      },
      {
        type: "word-reveal",
        content: ["cave", "vex", "czar", "vac", "viz", "cox", "vox", "cxx"],
      },
      {
        type: "copy",
        content: "cave vex; zinc box; vac czar; fix cave",
      },
    ],
  },
  {
    id: "f-08",
    phase: 1,
    title: "Right bottom row",
    description: "Reach down with right hand — n m , .",
    targetKeys: ["n", "m", ",", "."],
    targetFingers: ["right-index", "right-middle", "right-ring"],
    targetWpm: 18,
    targetAccuracy: 88,
    unlocksAfter: "f-07",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "guided-key",
        content: ["n", "m", ",", "."],
      },
      {
        type: "copy",
        content: "nnn mmm ,,, ... nm,. nm,. nm,.",
      },
      {
        type: "word-reveal",
        content: ["man", "nam", "mmm", "nmm", "m.n", "n,m"],
      },
      {
        type: "copy",
        content: "man, nam. mm, nn. man nam, man.",
      },
    ],
  },
  {
    id: "f-09",
    phase: 1,
    title: "Full alphabet",
    description: "Every letter, all rows. First complete test.",
    targetKeys: "abcdefghijklmnopqrstuvwxyz".split(""),
    targetFingers: [
      "left-pinky",
      "left-ring",
      "left-middle",
      "left-index",
      "right-index",
      "right-middle",
      "right-ring",
      "right-pinky",
    ],
    targetWpm: 22,
    targetAccuracy: 88,
    unlocksAfter: "f-08",
    estimatedMinutes: 8,
    exercises: [
      {
        type: "copy",
        content: "the quick brown fox jumps over the lazy dog",
        instructions: "Classic pangram — every letter once.",
      },
      {
        type: "word-reveal",
        content: [
          "pack",
          "my",
          "box",
          "with",
          "five",
          "dozen",
          "liquor",
          "jugs",
        ],
      },
      {
        type: "copy",
        content:
          "how vexingly quick daft zebras jump. pack my box with five dozen liquor jugs.",
      },
    ],
  },
  {
    id: "f-10",
    phase: 1,
    title: "Shift + capitals",
    description: "Introduces pinky shift. Both left and right shift.",
    targetKeys: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    targetFingers: ["left-pinky", "right-pinky"],
    targetWpm: 20,
    targetAccuracy: 88,
    unlocksAfter: "f-09",
    estimatedMinutes: 7,
    exercises: [
      {
        type: "guided-key",
        content: ["A", "S", "D", "F", "J", "K", "L"],
        instructions: "Hold Shift with the opposite pinky.",
      },
      {
        type: "copy",
        content: "The Quick Brown Fox. Hello World. Type Faster Now.",
      },
      {
        type: "word-reveal",
        content: ["Hello", "World", "Type", "Fast", "Learn", "Shift", "Caps", "Done"],
      },
      {
        type: "copy",
        content:
          "Always Start Sentences With A Capital. Use Shift, Not Caps Lock.",
      },
    ],
  },

  // ── Phase 2 — Accuracy ────────────────────────────────────────────────────
  {
    id: "a-01",
    phase: 2,
    title: "Common digraphs",
    description: "th he in er an re on at — the pairs that make English.",
    targetKeys: ["t", "h", "e", "i", "n", "r", "a", "o"],
    targetFingers: [
      "left-index",
      "left-middle",
      "right-index",
      "right-middle",
    ],
    targetWpm: 18,
    targetAccuracy: 95,
    unlocksAfter: "f-10",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "copy",
        content: "th th he he in in er er an an re re on on at at",
        instructions: "Slow and clean. Accuracy over speed.",
      },
      {
        type: "word-reveal",
        content: ["the", "her", "then", "there", "and", "are", "one", "into"],
      },
      {
        type: "blind",
        content: "then there are the ones that enter and remain here",
        instructions: "Blind typing — trust your fingers.",
      },
    ],
  },
  {
    id: "a-02",
    phase: 2,
    title: "Common trigraphs",
    description: "the and ing ion ent for her — three-letter building blocks.",
    targetKeys: ["t", "h", "e", "a", "n", "d", "i", "g", "o"],
    targetFingers: [
      "left-index",
      "left-middle",
      "right-index",
      "right-middle",
    ],
    targetWpm: 18,
    targetAccuracy: 95,
    unlocksAfter: "a-01",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "copy",
        content: "the and ing ion ent for her the and ing ion ent for her",
      },
      {
        type: "word-reveal",
        content: ["the", "and", "ing", "ion", "ent", "for", "her", "thing"],
      },
      {
        type: "blind",
        content: "the thing for her and the nation went into action then",
      },
    ],
  },
  {
    id: "a-03",
    phase: 2,
    title: "Short common words",
    description: "the be to of and a in is it — highest-frequency English.",
    targetKeys: ["t", "h", "e", "b", "o", "f", "a", "n", "d", "i", "s"],
    targetFingers: [
      "left-index",
      "left-middle",
      "right-index",
      "right-middle",
    ],
    targetWpm: 20,
    targetAccuracy: 95,
    unlocksAfter: "a-02",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "word-reveal",
        content: ["the", "be", "to", "of", "and", "a", "in", "is", "it", "for"],
      },
      {
        type: "copy",
        content: "it is to be of the and in a for it is to be of the and",
      },
      {
        type: "blind",
        content: "it is for the best to be in and of it as it is",
      },
    ],
  },
  {
    id: "a-04",
    phase: 2,
    title: "Numbers row",
    description: "1 2 3 4 5 6 7 8 9 0 — numbers slow everyone down.",
    targetKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    targetFingers: [
      "left-pinky",
      "left-ring",
      "left-middle",
      "left-index",
      "right-index",
      "right-middle",
      "right-ring",
      "right-pinky",
    ],
    targetWpm: 15,
    targetAccuracy: 95,
    unlocksAfter: "a-03",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "guided-key",
        content: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      },
      {
        type: "copy",
        content: "1234 5678 90 123 456 789 012 135 246 780",
      },
      {
        type: "copy",
        content: "call 1800 234 5678 now or try 42 99 100 2024",
      },
    ],
  },
  {
    id: "a-05",
    phase: 2,
    title: "Number + word combos",
    description: "Realistic sequences: 42 items, 3rd, 2024, v2.0",
    targetKeys: ["1", "2", "3", "4", "5", "0", ".", "v"],
    targetFingers: ["left-index", "right-index", "left-pinky", "right-pinky"],
    targetWpm: 18,
    targetAccuracy: 95,
    unlocksAfter: "a-04",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "copy",
        content: "42 items 3rd place v2.0 build 2024 release 1.5.0",
      },
      {
        type: "word-reveal",
        content: ["42", "items", "3rd", "2024", "v2.0", "99%", "1st", "v1.0"],
      },
      {
        type: "blind",
        content: "order 42 items at $19.99 each for the 3rd quarter of 2024",
      },
    ],
  },
  {
    id: "a-06",
    phase: 2,
    title: "Punctuation basics",
    description: ". , ; : ! ? in natural sentence context.",
    targetKeys: [".", ",", ";", ":", "!", "?"],
    targetFingers: ["right-middle", "right-ring", "right-pinky"],
    targetWpm: 18,
    targetAccuracy: 95,
    unlocksAfter: "a-05",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "copy",
        content: "hello, world! how are you? wait; then go. yes: now!",
      },
      {
        type: "word-reveal",
        content: ["hello,", "world!", "how?", "wait;", "yes:", "now.", "ok!", "why?"],
      },
      {
        type: "blind",
        content: "yes, it's true. don't worry; be happy. ready? go!",
      },
    ],
  },
  {
    id: "a-07",
    phase: 2,
    title: "Apostrophes + quotes",
    description: "it's don't \"hello\" 'world' — contraction and quote practice.",
    targetKeys: ["'", '"'],
    targetFingers: ["right-pinky"],
    targetWpm: 18,
    targetAccuracy: 95,
    unlocksAfter: "a-06",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "copy",
        content: "it's don't won't can't she's he's they're we've",
      },
      {
        type: "word-reveal",
        content: ["it's", "don't", "won't", "can't", '"hello"', "'world'", "she's", "he's"],
      },
      {
        type: "blind",
        content: "she said: \"wait!\" and left. it's true — don't worry.",
      },
    ],
  },
  {
    id: "a-08",
    phase: 2,
    title: "Brackets + symbols",
    description: "( ) [ ] { } < > — essential for code typing.",
    targetKeys: ["(", ")", "[", "]", "{", "}", "<", ">"],
    targetFingers: ["right-pinky", "left-pinky"],
    targetWpm: 15,
    targetAccuracy: 95,
    unlocksAfter: "a-07",
    estimatedMinutes: 7,
    exercises: [
      {
        type: "guided-key",
        content: ["(", ")", "[", "]", "{", "}"],
        instructions: "Shift for ( ) { } < >. Practice the pinky stretch.",
      },
      {
        type: "copy",
        content: "fn(x) { return [1, 2, 3]; } if (a < b) { ok(); }",
      },
      {
        type: "blind",
        content: "const arr = [1, 2, 3]; const obj = { a: 1 }; if (x > 0) {}",
      },
    ],
  },

  // ── Phase 3 — Speed ───────────────────────────────────────────────────────
  {
    id: "s-01",
    phase: 3,
    title: "Paced home row",
    description: "Muscle memory at a consistent 60 BPM pace.",
    targetKeys: ["a", "s", "d", "f", "j", "k", "l", ";"],
    targetFingers: [
      "left-pinky",
      "left-ring",
      "left-middle",
      "left-index",
      "right-index",
      "right-middle",
      "right-ring",
      "right-pinky",
    ],
    targetWpm: 30,
    targetAccuracy: 92,
    unlocksAfter: "a-08",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "metronome",
        content: "asdf jkl; asdf jkl; fall ask dad flask salad falls",
        bpm: 60,
        instructions: "Type one character per beat. Stay on the pulse.",
      },
      {
        type: "copy",
        content: "a sad dad asks all lads; fall as a flask falls",
        targetWpm: 30,
      },
      {
        type: "metronome",
        content: "asdf jkl; flask salad falls asks dad all fall",
        bpm: 60,
      },
    ],
  },
  {
    id: "s-02",
    phase: 3,
    title: "Paced common words",
    description: "Rhythm across word boundaries at 70 BPM.",
    targetKeys: ["t", "h", "e", "a", "n", "d", "i", "s"],
    targetFingers: ["left-index", "right-index", "left-middle", "right-middle"],
    targetWpm: 35,
    targetAccuracy: 92,
    unlocksAfter: "s-01",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "metronome",
        content: "the and for that with have this from they were",
        bpm: 70,
      },
      {
        type: "word-reveal",
        content: [
          "the",
          "and",
          "for",
          "that",
          "with",
          "have",
          "this",
          "from",
          "they",
          "were",
        ],
      },
      {
        type: "metronome",
        content: "they have this and that from the time they were here",
        bpm: 70,
      },
    ],
  },
  {
    id: "s-03",
    phase: 3,
    title: "Paced sentences",
    description: "Sustaining pace through punctuation at 80 BPM.",
    targetKeys: [".", ",", "a", "e", "t", "h"],
    targetFingers: ["right-middle", "right-ring", "left-index", "left-middle"],
    targetWpm: 40,
    targetAccuracy: 90,
    unlocksAfter: "s-02",
    estimatedMinutes: 7,
    exercises: [
      {
        type: "metronome",
        content:
          "type to the beat. stay calm, stay steady. keep going; you can do this.",
        bpm: 80,
      },
      {
        type: "copy",
        content:
          "accuracy first, then speed. practice daily. rest when needed, then return.",
      },
      {
        type: "metronome",
        content:
          "one sentence at a time. breathe. hit the beat. finish strong.",
        bpm: 80,
      },
    ],
  },
  {
    id: "s-04",
    phase: 3,
    title: "Burst training",
    description: "Short max-effort intervals at 100 BPM.",
    targetKeys: "abcdefghijklmnopqrstuvwxyz".split(""),
    targetFingers: [
      "left-index",
      "right-index",
      "left-middle",
      "right-middle",
    ],
    targetWpm: 50,
    targetAccuracy: 88,
    unlocksAfter: "s-03",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "metronome",
        content: "fast burst now go go go type hard push push push",
        bpm: 100,
        instructions: "10-second burst feel — stay accurate at high BPM.",
      },
      {
        type: "copy",
        content: "sprint through these words as fast as you can without missing",
        targetWpm: 50,
      },
      {
        type: "metronome",
        content: "again faster tighter cleaner sharper better stronger",
        bpm: 100,
      },
    ],
  },
  {
    id: "s-05",
    phase: 3,
    title: "Long-form endurance",
    description: "Maintain consistency over a longer 70 BPM passage.",
    targetKeys: "etaoinshrdlucmfwypvbgkjqxz".split(""),
    targetFingers: [
      "left-index",
      "right-index",
      "left-middle",
      "right-middle",
    ],
    targetWpm: 40,
    targetAccuracy: 90,
    unlocksAfter: "s-04",
    estimatedMinutes: 10,
    exercises: [
      {
        type: "metronome",
        content:
          "endurance means holding a steady pace for minutes at a time. do not rush ahead of the beat. do not fall behind. find the rhythm and stay with it through every word and every space until the passage ends.",
        bpm: 70,
        instructions: "Long passage — keep form through the whole piece.",
      },
      {
        type: "copy",
        content:
          "consistency beats intensity. type every day. rest your hands. return tomorrow stronger than today. the goal is not a single peak score; it is a reliable floor you can always clear.",
      },
    ],
  },
  {
    id: "s-06",
    phase: 3,
    title: "Weak key targeting",
    description: "Personalized drill for your weakest keys from analytics.",
    targetKeys: ["a", "s", "e", "r", "t"],
    targetFingers: ["left-pinky", "left-ring", "left-middle", "left-index"],
    targetWpm: 35,
    targetAccuracy: 92,
    unlocksAfter: "s-05",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "guided-key",
        content: ["a", "s", "e", "r", "t"],
        instructions: "These keys will be replaced with your weakest from analytics when available.",
      },
      {
        type: "copy",
        content: "assert assert assert easier easier rest rest treat treat",
      },
      {
        type: "metronome",
        content: "assert easier treat rest stare rates tears stear",
        bpm: 70,
      },
    ],
  },
  {
    id: "s-07",
    phase: 3,
    title: "Speed test baseline",
    description: "Free test — measure improvement from Phase 1 entry.",
    targetKeys: "abcdefghijklmnopqrstuvwxyz".split(""),
    targetFingers: [
      "left-index",
      "right-index",
      "left-middle",
      "right-middle",
    ],
    targetWpm: 45,
    targetAccuracy: 90,
    unlocksAfter: "s-06",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "copy",
        content:
          "this baseline measures how far you have come. type naturally at your best sustainable pace. accuracy still matters — clean speed is real speed.",
        instructions: "No metronome. Just you and the text.",
      },
      {
        type: "copy",
        content:
          "the expert in anything was once a beginner. keep practicing and the numbers will follow.",
      },
      {
        type: "blind",
        content:
          "trust the muscle memory you have built. finish strong and check your score.",
      },
    ],
  },

  // ── Phase 4 — Real-world ──────────────────────────────────────────────────
  {
    id: "r-01",
    phase: 4,
    title: "Email writing",
    description: "Natural prose like a work email.",
    targetKeys: "etaoinshrdlu".split(""),
    targetFingers: ["left-index", "right-index", "left-middle", "right-middle"],
    targetWpm: 40,
    targetAccuracy: 92,
    unlocksAfter: "s-07",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "copy",
        content:
          "Hi team, just a heads up that the meeting has moved to Thursday at 2pm. Please review the attached notes before then. Thanks!",
      },
      {
        type: "copy",
        content:
          "Following up on yesterday's sync — can you send the latest figures by end of day? Happy to jump on a quick call if helpful.",
      },
      {
        type: "blind",
        content:
          "Best regards, looking forward to your thoughts. Let me know if anything is unclear.",
      },
    ],
  },
  {
    id: "r-02",
    phase: 4,
    title: "Slack / chat",
    description: "Short messages, emoji-free, casual punctuation.",
    targetKeys: ["?", "!", ".", ","],
    targetFingers: ["right-pinky", "right-ring", "right-middle"],
    targetWpm: 45,
    targetAccuracy: 90,
    unlocksAfter: "r-01",
    estimatedMinutes: 5,
    exercises: [
      {
        type: "word-reveal",
        content: [
          "lgtm",
          "ship",
          "it",
          "on",
          "it",
          "blocked",
          "need",
          "review",
          "pushed",
          "fix",
        ],
      },
      {
        type: "copy",
        content:
          "hey — quick question. is the deploy still blocked? i pushed the fix. can you take a look when you have a sec?",
      },
      {
        type: "copy",
        content:
          "all good on my end. lgtm. merging now. ping me if anything breaks in staging.",
      },
    ],
  },
  {
    id: "r-03",
    phase: 4,
    title: "Code identifiers",
    description: "camelCase snake_case SCREAMING_SNAKE kebab-case .tsx .env",
    targetKeys: ["_", "-", ".", "A", "S"],
    targetFingers: ["right-pinky", "left-pinky", "right-index"],
    targetWpm: 35,
    targetAccuracy: 92,
    unlocksAfter: "r-02",
    estimatedMinutes: 7,
    exercises: [
      {
        type: "word-reveal",
        content: [
          "camelCase",
          "snake_case",
          "SCREAMING_SNAKE",
          "kebab-case",
          "useState",
          "getUserById",
          ".tsx",
          ".env",
        ],
      },
      {
        type: "copy",
        content:
          "const userId = getUserById(id); const MAX_RETRY = 3; import App from './App.tsx';",
      },
      {
        type: "blind",
        content:
          "export function useLocalStorage(key: string) { return [value, setValue]; }",
      },
    ],
  },
  {
    id: "r-04",
    phase: 4,
    title: "Terminal commands",
    description: "git, npm, cd, ls — everyday shell muscle memory.",
    targetKeys: ["-", "/", ".", '"'],
    targetFingers: ["right-pinky", "left-pinky", "right-index"],
    targetWpm: 35,
    targetAccuracy: 92,
    unlocksAfter: "r-03",
    estimatedMinutes: 6,
    exercises: [
      {
        type: "copy",
        content: 'git commit -m "fix" && npm install && cd ../ && ls -la',
      },
      {
        type: "word-reveal",
        content: [
          "git",
          "status",
          "npm",
          "install",
          "cd",
          "../",
          "ls",
          "-la",
          "mkdir",
          "touch",
        ],
      },
      {
        type: "blind",
        content: "git push origin HEAD && npm run build && npm test -- --watch",
      },
    ],
  },
  {
    id: "r-05",
    phase: 4,
    title: "Full simulation",
    description: "Mixed content: prose → code → numbers → punctuation.",
    targetKeys: "abcdefghijklmnopqrstuvwxyz0123456789.,;:!?'\"()[]{}".split(""),
    targetFingers: [
      "left-pinky",
      "left-ring",
      "left-middle",
      "left-index",
      "right-index",
      "right-middle",
      "right-ring",
      "right-pinky",
    ],
    targetWpm: 50,
    targetAccuracy: 90,
    unlocksAfter: "r-04",
    estimatedMinutes: 10,
    exercises: [
      {
        type: "copy",
        content:
          "Hi team — v2.1 ships Friday. Run npm install && npm test. If tests fail, check .env for API_KEY. Reply with status by 5pm.",
      },
      {
        type: "copy",
        content:
          "const score = wpm * (accuracy / 100); // target: 50+ wpm at 90%+. Don't forget: it's \"done\" when CI is green.",
      },
      {
        type: "blind",
        content:
          "You made it. Thirty lessons. Keep practicing — the floor you built here is yours to raise.",
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return CURRICULUM.find((l) => l.id === id);
}

export function getPhaseLessons(phase: 1 | 2 | 3 | 4): Lesson[] {
  return CURRICULUM.filter((l) => l.phase === phase);
}

export function getNextLesson(id: string): Lesson | undefined {
  const idx = CURRICULUM.findIndex((l) => l.id === id);
  if (idx === -1 || idx >= CURRICULUM.length - 1) return undefined;
  return CURRICULUM[idx + 1];
}

export function isLessonPassed(
  lesson: Lesson,
  progress: { bestWpm: number; bestAccuracy: number } | undefined
): boolean {
  if (!progress) return false;
  return progress.bestWpm >= lesson.targetWpm && progress.bestAccuracy >= lesson.targetAccuracy;
}

export function isLessonUnlocked(
  lesson: Lesson,
  lessonProgress: Record<string, { bestWpm: number; bestAccuracy: number }>
): boolean {
  if (!lesson.unlocksAfter) return true;
  const prev = getLesson(lesson.unlocksAfter);
  if (!prev) return true;
  return isLessonPassed(prev, lessonProgress[prev.id]);
}

export function getStarRating(
  wpm: number,
  targetWpm: number,
  passed: boolean
): 0 | 1 | 2 | 3 {
  if (!passed) return 0;
  if (wpm >= targetWpm * 1.3) return 3;
  if (wpm >= targetWpm * 1.1) return 2;
  return 1;
}
