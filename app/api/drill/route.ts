import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface DrillRequest {
  weakKeys: string[];
  slowBigrams: string[];
  currentWpm: number;
  mode: "words" | "sentences" | "code";
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

function buildPrompt(data: DrillRequest): string {
  const { weakKeys, slowBigrams, currentWpm, mode } = data;

  const keyList = weakKeys.length > 0 ? weakKeys.join(", ") : "general keys";
  const bigramList =
    slowBigrams.length > 0 ? slowBigrams.join(", ") : "general bigrams";

  const modeInstructions: Record<DrillRequest["mode"], string> = {
    words:
      "Generate a sequence of 30–40 space-separated lowercase words (no punctuation). Each word should heavily use the weak keys listed.",
    sentences:
      "Generate 3–4 natural English sentences (with punctuation) that heavily feature the weak keys and bigrams listed.",
    code:
      "Generate a short realistic code snippet (15–20 lines, Python or TypeScript) that naturally uses the weak keys and bigrams listed.",
  };

  return `You are a typing coach AI. Generate a custom typing drill for a user.

User stats:
- Current average WPM: ${currentWpm}
- Weakest keys (lowest accuracy): ${keyList}
- Slowest bigrams (slowest consecutive-key transitions): ${bigramList}

Drill mode: ${mode}
${modeInstructions[mode]}

IMPORTANT:
- Return ONLY the drill text itself — no explanation, no preamble, no markdown fences.
- Focus heavily on the weak keys and bigrams so the user gets targeted practice.
- Keep it natural and readable (not gibberish).`;
}

async function generateWithGroq(
  prompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateWithGemini(
  prompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""
  );
}

export async function POST(req: NextRequest) {
  try {
    const body: DrillRequest = await req.json();

    const groqKey = process.env.GROQ_API_KEY ?? "";
    const geminiKey = process.env.GEMINI_API_KEY ?? "";

    if (!groqKey && !geminiKey) {
      return NextResponse.json(
        { error: "No LLM API key configured. Set GROQ_API_KEY or GEMINI_API_KEY." },
        { status: 503 }
      );
    }

    const prompt = buildPrompt(body);
    let drillText = "";

    // Try Groq first (faster, free tier), fall back to Gemini
    if (groqKey) {
      try {
        drillText = await generateWithGroq(prompt, groqKey);
      } catch (e) {
        console.error("Groq failed, falling back to Gemini:", e);
        if (geminiKey) {
          drillText = await generateWithGemini(prompt, geminiKey);
        } else {
          throw e;
        }
      }
    } else if (geminiKey) {
      drillText = await generateWithGemini(prompt, geminiKey);
    }

    if (!drillText) {
      return NextResponse.json({ error: "Empty response from LLM" }, { status: 500 });
    }

    return NextResponse.json({ drill: drillText });
  } catch (err) {
    console.error("Drill generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate drill" },
      { status: 500 }
    );
  }
}
