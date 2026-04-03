// ─────────────────────────────────────────────────────────────────────────────
// corpus.ts  v3
//
// Changes from v2:
//  - COMMON_WORDS expanded from ~200 to 400+ entries (more variety, less repetition)
//  - generateWordTest: punctuation now randomised (not fixed every 7/15 words)
//  - QUOTES expanded from 10 to 25 entries
//  - CODE_SNIPPETS expanded from 5 to 12 entries, added Go, Rust, SQL, Bash
//  - Added PANGRAMS array for warm-up tests (every letter of the alphabet)
//  - Added getDailyChallenge(): deterministic text seeded from today's date
// ─────────────────────────────────────────────────────────────────────────────

export const COMMON_WORDS = [
  // Core top-200
  "the","be","to","of","and","a","in","that","have","it","for","not","on","with",
  "he","as","you","do","at","this","but","his","by","from","they","we","say","her",
  "she","or","an","will","my","one","all","would","there","their","what","so","up",
  "out","if","about","who","get","which","go","me","when","make","can","like","time",
  "no","just","him","know","take","people","into","year","your","good","some","could",
  "them","see","other","than","then","now","look","only","come","its","over","think",
  "also","back","after","use","two","how","our","work","first","well","way","even",
  "new","want","because","any","these","give","day","most","us","great","between",
  "need","large","often","hand","high","place","hold","found","without","again",
  "home","around","another","came","here","did","may","each","had","should","being",
  "long","where","those","always","never","every","must","right","still","own","too",
  "tell","does","set","three","air","play","small","end","put","read","port","spell",
  "add","land","big","such","follow","act","why","ask","men","change","went","light",
  "kind","off","house","picture","try","animal","point","mother","world","near",
  "build","self","earth","father","very","write","seem","next","form","study","learn",
  "plant","cover","food","sun","four","state","keep","eye","last","let","thought",
  "city","tree","cross","farm","hard","start","might","story","saw","far","sea",
  // Extended set (200+)
  "run","stop","move","live","help","turn","start","show","hear","play","give",
  "open","close","bring","feel","hold","keep","let","put","seem","tell","ask",
  "leave","call","keep","run","win","lose","try","use","need","find","want",
  "buy","sell","pay","send","meet","lead","read","grow","fall","cut","drive",
  "fly","ride","sit","stand","walk","jump","pull","push","reach","break","catch",
  "throw","kick","hit","beat","join","share","save","spend","build","destroy",
  "love","hate","fear","hope","trust","doubt","believe","wonder","remember","forget",
  "understand","explain","describe","compare","discuss","argue","suggest","recommend",
  "decide","choose","prefer","agree","disagree","refuse","accept","reject","allow",
  "prevent","cause","result","require","involve","include","contain","consist",
  "depend","relate","connect","separate","combine","divide","increase","decrease",
  "improve","reduce","solve","create","design","develop","test","review","check",
  "measure","count","calculate","estimate","analyse","identify","confirm","prove",
  "show","hide","reveal","discover","explore","investigate","research","study",
  "teach","learn","train","practice","prepare","plan","organise","manage","control",
  "lead","follow","support","challenge","question","answer","respond","react",
  "change","adjust","adapt","fix","repair","replace","update","upgrade","install",
  "launch","deploy","release","publish","share","send","receive","collect","store",
  "access","search","filter","sort","group","list","display","view","open","close",
  "start","stop","pause","resume","cancel","confirm","submit","reset","refresh",
  "load","save","export","import","upload","download","backup","restore","delete",
  "copy","paste","move","rename","merge","split","compress","extract","encrypt",
  "secure","protect","monitor","alert","log","report","track","measure","analyse",
  "fast","slow","quick","short","long","wide","narrow","deep","shallow","heavy",
  "light","strong","weak","hard","soft","sharp","smooth","rough","clean","dirty",
  "fresh","old","new","young","early","late","first","last","next","previous",
  "simple","complex","clear","vague","correct","wrong","true","false","real","fake",
  "safe","dangerous","easy","difficult","possible","impossible","necessary","optional",
  "important","minor","major","basic","advanced","general","specific","global","local",
];

export const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Life is what happens when you are busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.", author: "Albert Einstein" },
  { text: "Not everything that is faced can be changed, but nothing can be changed until it is faced.", author: "James Baldwin" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "Whether you think you can or you think you cannot, you are right.", author: "Henry Ford" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Code is like humor. When you have to explain it, it is bad.", author: "Cory House" },
  { text: "Fix the cause, not the symptom.", author: "Steve Maguire" },
  { text: "Optimism is an occupational hazard of programming. Feedback is the treatment.", author: "Kent Beck" },
  { text: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.", author: "Edsger Dijkstra" },
  { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { text: "Do not wait to strike till the iron is hot, but make it hot by striking.", author: "William Butler Yeats" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "A ship in harbour is safe, but that is not what ships are built for.", author: "John A. Shedd" },
];

export const CODE_SNIPPETS = [
  {
    language: "python",
    label: "Python — binary search",
    text: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
  },
  {
    language: "typescript",
    label: "TypeScript — debounce",
    text: `function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
  },
  {
    language: "javascript",
    label: "JavaScript — fetch with retry",
    text: `async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}`,
  },
  {
    language: "python",
    label: "Python — LRU cache",
    text: `from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print([fibonacci(i) for i in range(10)])`,
  },
  {
    language: "typescript",
    label: "TypeScript — deep clone",
    text: `function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(
      ([k, v]) => [k, deepClone(v)]
    )
  ) as T;
}`,
  },
  {
    language: "go",
    label: "Go — concurrent worker pool",
    text: `func workerPool(jobs <-chan int, results chan<- int, n int) {
    var wg sync.WaitGroup
    for i := 0; i < n; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := range jobs {
                results <- j * j
            }
        }()
    }
    wg.Wait()
    close(results)
}`,
  },
  {
    language: "rust",
    label: "Rust — iterator chain",
    text: `fn top_words(text: &str, n: usize) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    let mut pairs: Vec<_> = counts.into_iter().collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1));
    pairs.into_iter().take(n).collect()
}`,
  },
  {
    language: "sql",
    label: "SQL — window function",
    text: `SELECT
    user_id,
    session_date,
    wpm,
    AVG(wpm) OVER (
        PARTITION BY user_id
        ORDER BY session_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_avg_wpm,
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY wpm DESC
    ) AS wpm_rank
FROM typing_sessions
ORDER BY user_id, session_date;`,
  },
  {
    language: "bash",
    label: "Bash — safe deploy script",
    text: `#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/var/www/app"
BACKUP_DIR="/var/backups/app-$(date +%Y%m%d-%H%M%S)"

echo "Backing up current build..."
cp -r "$DEPLOY_DIR" "$BACKUP_DIR"

echo "Pulling latest changes..."
git -C "$DEPLOY_DIR" pull origin main

echo "Installing dependencies..."
npm ci --prefix "$DEPLOY_DIR"

echo "Building..."
npm run build --prefix "$DEPLOY_DIR"

echo "Restarting service..."
systemctl restart myapp

echo "Deploy complete."`,
  },
  {
    language: "typescript",
    label: "TypeScript — event emitter",
    text: `class EventEmitter<T extends Record<string, unknown>> {
  private listeners: { [K in keyof T]?: ((data: T[K]) => void)[] } = {};

  on<K extends keyof T>(event: K, fn: (data: T[K]) => void) {
    (this.listeners[event] ??= []).push(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof T>(event: K, fn: (data: T[K]) => void) {
    this.listeners[event] = this.listeners[event]?.filter(l => l !== fn);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.listeners[event]?.forEach(fn => fn(data));
  }
}`,
  },
  {
    language: "python",
    label: "Python — async rate limiter",
    text: `import asyncio
import time

class RateLimiter:
    def __init__(self, rate: int, per: float = 1.0):
        self.rate = rate
        self.per = per
        self._tokens = rate
        self._last = time.monotonic()

    async def acquire(self):
        now = time.monotonic()
        elapsed = now - self._last
        self._tokens += elapsed * (self.rate / self.per)
        self._tokens = min(self._tokens, self.rate)
        self._last = now
        if self._tokens < 1:
            await asyncio.sleep((1 - self._tokens) * self.per / self.rate)
            self._tokens = 0
        else:
            self._tokens -= 1`,
  },
  {
    language: "javascript",
    label: "JavaScript — virtual scroll",
    text: `function VirtualList({ items, itemHeight, visibleCount }) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  return (
    <div style={{ height: visibleCount * itemHeight, overflowY: "auto" }}
         onScroll={e => setScrollTop(e.target.scrollTop)}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: \`translateY(\${offsetY}px)\` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>{item}</div>
          ))}
        </div>
      </div>
    </div>
  );
}`,
  },
];

export const PANGRAMS = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "how vexingly quick daft zebras jump",
  "the five boxing wizards jump quickly",
  "sphinx of black quartz, judge my vow",
  "two driven jocks help fax my big quiz",
  "five quacking zephyrs jolt my wax bed",
  "the jay, pig, fox, zebra and my wolves quack",
];

export const LESSONS = [
  {
    id: "home-row",
    title: "Home Row Keys",
    desc: "Master the foundation — ASDF JKL;",
    level: 1,
    targetWpm: 20,
    targetAccuracy: 90,
    fingers: ["left-pinky","left-ring","left-middle","left-index","right-index","right-middle","right-ring","right-pinky"],
    highlightKeys: ["a","s","d","f","j","k","l",";"],
    texts: [
      "aaa sss ddd fff jjj kkk lll",
      "asdf jkl; asdf jkl;",
      "dad fad sad lad jak ask fall",
      "a sad dad; all fall; a flask",
    ],
  },
  {
    id: "top-row",
    title: "Top Row — QWERTY",
    desc: "Reach up with the right fingers",
    level: 2,
    targetWpm: 25,
    targetAccuracy: 88,
    fingers: [],
    highlightKeys: ["q","w","e","r","t","y","u","i","o","p"],
    texts: [
      "wet quit true very power",
      "quite true your poetry",
      "write every word quite well",
      "you type very well; keep it up",
    ],
  },
  {
    id: "bottom-row",
    title: "Bottom Row — ZXCV",
    desc: "Stretch down without losing your home row",
    level: 3,
    targetWpm: 25,
    targetAccuracy: 88,
    fingers: [],
    highlightKeys: ["z","x","c","v","b","n","m"],
    texts: [
      "zinc mix cab vex",
      "zinc box cave verb maze",
      "move zinc box to the cave",
      "can brave men fix vexing boxes",
    ],
  },
  {
    id: "numbers",
    title: "Number Row",
    desc: "Numbers slow everyone down — fix that",
    level: 4,
    targetWpm: 20,
    targetAccuracy: 85,
    fingers: [],
    highlightKeys: ["1","2","3","4","5","6","7","8","9","0"],
    texts: [
      "1234 5678 90",
      "123 456 789 012",
      "call 1800 234 5678 now",
      "order 42 items at $19.99 each",
    ],
  },
  {
    id: "punctuation",
    title: "Punctuation & Symbols",
    desc: "Commas, periods, brackets — real typing",
    level: 5,
    targetWpm: 22,
    targetAccuracy: 85,
    fingers: [],
    highlightKeys: [".","," ,";" ,":" ,"!" ,"?" ,"'" ,'"'],
    texts: [
      "hello, world! how are you?",
      "she said: 'wait!' and left.",
      "items: milk, eggs, bread, and butter.",
      "yes, it's true. don't worry; be happy.",
    ],
  },
];

/** Seeded pseudo-random number (deterministic for same seed) */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Daily challenge: same text for everyone on the same calendar day.
 * Uses a seeded RNG so the text is deterministic per day.
 */
export function getDailyChallenge(): { text: string; label: string } {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const rand = seededRand(seed);

  const pool = [...QUOTES, ...PANGRAMS.map((p) => ({ text: p, author: "Classic" }))];
  const pick = pool[Math.floor(rand() * pool.length)];
  return {
    text: "text" in pick ? pick.text : String(pick),
    label: `Daily challenge — ${today.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}`,
  };
}

/**
 * Generate a random word test.
 * v3 change: punctuation placement is randomised (not fixed every 7/15 words).
 */
export function generateWordTest(count = 40): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)]);
  }
  return words
    .map((w, i) => {
      if (i === 0) return w;
      const r = Math.random();
      if (r < 0.06) return w + ",";      // ~6% comma
      if (r < 0.09) return w + ".";      // ~3% period
      if (r < 0.10) return w + "!";      // ~1% exclamation
      if (r < 0.11) return w + "?";      // ~1% question
      return w;
    })
    .join(" ");
}
