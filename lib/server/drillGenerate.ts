import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

export interface DrillRequest {
  weakKeys: string[];
  slowBigrams: string[];
  currentWpm: number;
  mode: "words" | "sentences" | "code";
}

export type DrillProvider = "groq" | "gemini";
type ProviderPreference = "auto" | DrillProvider;

async function withTimeout<T>(action: Promise<T>, timeout = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${timeout}ms`)), timeout);
  });

  try {
    return await Promise.race([action, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildPrompt(data: DrillRequest): string {
  const { weakKeys, slowBigrams, currentWpm, mode } = data;

  const keyList = weakKeys.join(", ") || "general keys";
  const bigramList = slowBigrams.join(", ") || "general transitions";

  const modeInstructions = {
    words:
      "Return EXACTLY 35 lowercase words separated by single spaces. No punctuation.",
    sentences:
      "Return EXACTLY 3 natural English sentences with proper punctuation.",
    code:
      "Return a clean 15-line TypeScript snippet. No markdown, no explanations.",
  };

  return `
Generate a typing practice drill.

User:
- WPM: ${currentWpm}
- Weak keys: ${keyList}
- Slow transitions: ${bigramList}

Mode: ${mode}

Rules:
- ${modeInstructions[mode]}
- Use weak keys and transitions frequently.
- Keep output natural and readable.
- DO NOT include explanations or formatting.
- DO NOT include markdown or backticks.

Output:
`.trim();
}

async function generateWithGroq(prompt: string, apiKey: string): Promise<string> {
  const client = new Groq({ apiKey });
  const completion = await withTimeout(
    client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a precise typing drill generator. You MUST strictly follow instructions and output clean text only.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.4,
      top_p: 0.9,
    })
  );

  return completion.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await withTimeout(
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.4,
        topP: 0.9,
      },
    })
  );

  return result.response.text().trim();
}

function sanitizeDrillText(raw: string): string {
  if (!raw) return "";

  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[`*_>#-]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function resolveDrillProviderConfig() {
  const groqKey = env.GROQ_API_KEY.trim();
  const geminiKey = env.GEMINI_API_KEY.trim();
  const envPref = env.DRILL_PROVIDER.trim().toLowerCase();
  const preferred: ProviderPreference =
    envPref === "groq" || envPref === "gemini" ? envPref : "auto";

  const available: Record<DrillProvider, boolean> = {
    groq: Boolean(groqKey),
    gemini: Boolean(geminiKey),
  };

  const order: DrillProvider[] =
    preferred === "groq"
      ? ["groq", "gemini"]
      : preferred === "gemini"
        ? ["gemini", "groq"]
        : ["groq", "gemini"];

  return { groqKey, geminiKey, preferred, available, order };
}

export function validateDrillRequest(body: unknown): DrillRequest | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Partial<DrillRequest>;
  const modeCandidate = candidate.mode;
  if (
    modeCandidate !== "words" &&
    modeCandidate !== "sentences" &&
    modeCandidate !== "code"
  ) {
    return null;
  }
  if (!Array.isArray(candidate.weakKeys) || !Array.isArray(candidate.slowBigrams)) {
    return null;
  }

  return {
    weakKeys: candidate.weakKeys.map((k) => String(k).slice(0, 3)).slice(0, 10),
    slowBigrams: candidate.slowBigrams.map((b) => String(b).slice(0, 4)).slice(0, 10),
    currentWpm: Number.isFinite(Number(candidate.currentWpm))
      ? Number(candidate.currentWpm)
      : 0,
    mode: modeCandidate,
  };
}

export async function generateDrill(parsed: DrillRequest): Promise<{
  drill: string;
  provider: DrillProvider;
  fallbackUsed: boolean;
  providersAvailable: Record<DrillProvider, boolean>;
  preferredProvider: ProviderPreference;
}> {
  const config = resolveDrillProviderConfig();

  if (!config.available.groq && !config.available.gemini) {
    throw new Error("No LLM API key configured. Set GROQ_API_KEY or GEMINI_API_KEY.");
  }

  const prompt = buildPrompt(parsed);
  let drillText = "";
  let providerUsed: DrillProvider | null = null;
  const failures: string[] = [];

  for (const provider of config.order) {
    if (!config.available[provider]) continue;
    try {
      if (provider === "groq") {
        drillText = await generateWithGroq(prompt, config.groqKey);
      } else {
        drillText = await generateWithGemini(prompt, config.geminiKey);
      }
      providerUsed = provider;
      break;
    } catch (e) {
      failures.push(`${provider} failed`);
      console.error(`Drill generation with ${provider} failed:`, e);
    }
  }

  drillText = sanitizeDrillText(drillText);

  if (!drillText || !providerUsed) {
    const failureSummary = failures.length ? ` (${failures.join(", ")})` : "";
    throw new Error(`Failed to generate drill${failureSummary}.`);
  }

  return {
    drill: drillText,
    provider: providerUsed,
    fallbackUsed:
      config.preferred !== "auto" && providerUsed !== config.preferred,
    providersAvailable: config.available,
    preferredProvider: config.preferred,
  };
}
