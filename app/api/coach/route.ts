import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireSessionIdentity } from "@/lib/server/session";
import { computeWeakKeyStats, getCollections } from "@/lib/server/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

interface DayPlan {
  day: number;
  focus: string;
  drill: string;
  durationMin: number;
}

interface CoachPlan {
  level: "beginner" | "intermediate" | "advanced";
  weaknesses: string[];
  summary: string;
  days: DayPlan[];
  source: "llm" | "rules";
}

function diagnoseLevel(avgWpm: number, sessions: number): CoachPlan["level"] {
  if (avgWpm >= 80 && sessions >= 20) return "advanced";
  if (avgWpm >= 45 || sessions >= 10) return "intermediate";
  return "beginner";
}

function ruleBasedPlan(
  weakKeys: { key: string; accuracy: number; avgLatency: number }[],
  level: CoachPlan["level"],
  sessionsCompleted: number
): CoachPlan {
  const keys = weakKeys.slice(0, 5).map((k) => k.key);
  const weaknesses: string[] = [];

  if (keys.length) {
    weaknesses.push(`Weak keys: ${keys.join(", ").toUpperCase()}`);
  } else {
    weaknesses.push("Limited key data — focus on consistency drills");
  }

  const slow = weakKeys.filter((k) => k.avgLatency > 220).slice(0, 3);
  if (slow.length) {
    weaknesses.push(
      `Slow keys (latency): ${slow.map((k) => k.key.toUpperCase()).join(", ")}`
    );
  }

  const lowAcc = weakKeys.filter((k) => k.accuracy < 88).slice(0, 3);
  if (lowAcc.length) {
    weaknesses.push(
      `Accuracy dips on: ${lowAcc.map((k) => k.key.toUpperCase()).join(", ")}`
    );
  }

  while (weaknesses.length < 3) {
    weaknesses.push(
      sessionsCompleted < 10
        ? "Build a daily habit with short sessions"
        : "Hold cadence under fatigue in longer passages"
    );
  }

  const focusKeys = keys.length ? keys : ["a", "s", "d", "f", "j", "k", "l", ";"];
  const days: DayPlan[] = [
    {
      day: 1,
      focus: `Accuracy on ${focusKeys.slice(0, 3).join(", ").toUpperCase()}`,
      drill: "35-word accuracy drill emphasizing weak keys at 90%+ accuracy",
      durationMin: 10,
    },
    {
      day: 2,
      focus: "Home-row rhythm",
      drill: "Alternating hand words; keep even inter-key intervals",
      durationMin: 10,
    },
    {
      day: 3,
      focus: `Speed bursts on ${focusKeys.slice(0, 2).join(", ").toUpperCase() || "common digraphs"}`,
      drill: "3×1-minute speed bursts, then cool-down accuracy pass",
      durationMin: 10,
    },
    {
      day: 4,
      focus: "Bigram smoothing",
      drill: "Sentence mode targeting slow transitions from your heatmap",
      durationMin: 10,
    },
    {
      day: 5,
      focus: "Endurance control",
      drill: "One quote / paragraph; prioritize consistency over peak WPM",
      durationMin: 12,
    },
    {
      day: 6,
      focus: "Mixed weak-key sentences",
      drill: "AI or custom drill packing all top weak keys into natural text",
      durationMin: 10,
    },
    {
      day: 7,
      focus: `${level} checkpoint`,
      drill: "Timed test + review weak keys; note WPM/accuracy deltas vs day 1",
      durationMin: 12,
    },
  ];

  return {
    level,
    weaknesses: weaknesses.slice(0, 3),
    summary: `Based on ${sessionsCompleted} sessions, you're ${level}. This 7-day plan targets your top failure modes with short daily drills.`,
    days,
    source: "rules",
  };
}

async function maybeEnrichWithLlm(plan: CoachPlan): Promise<CoachPlan> {
  const groqKey = env.GROQ_API_KEY.trim();
  const geminiKey = env.GEMINI_API_KEY.trim();
  if (!groqKey && !geminiKey) return plan;

  const prompt = `You are a typing coach. Given this diagnosis JSON, rewrite ONLY the "summary" (2 sentences) and each day's "focus" + "drill" to be more specific and motivating. Keep the same structure and day count. Return pure JSON matching { summary, days: [{ day, focus, drill, durationMin }] }.

Input:
${JSON.stringify({
  level: plan.level,
  weaknesses: plan.weaknesses,
  days: plan.days,
})}`;

  try {
    let text = "";
    if (groqKey) {
      const client = new Groq({ apiKey: groqKey });
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        max_tokens: 700,
        temperature: 0.4,
      });
      text = completion.choices?.[0]?.message?.content?.trim() ?? "";
    } else if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      text = result.response.text().trim();
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return plan;
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      days?: DayPlan[];
    };

    return {
      ...plan,
      summary: typeof parsed.summary === "string" ? parsed.summary : plan.summary,
      days:
        Array.isArray(parsed.days) && parsed.days.length === 7
          ? parsed.days.map((d, i) => ({
              day: i + 1,
              focus: String(d.focus ?? plan.days[i].focus),
              drill: String(d.drill ?? plan.days[i].drill),
              durationMin: Number(d.durationMin) || plan.days[i].durationMin,
            }))
          : plan.days,
      source: "llm",
    };
  } catch (e) {
    console.error("Coach LLM enrich failed:", e);
    return plan;
  }
}

export async function GET() {
  try {
    const identity = await requireSessionIdentity();
    const { userStats, leaderboard } = await getCollections();

    const stats = await userStats.findOne({ userId: identity.userId });
    if (!stats || stats.sessionsCompleted < 5) {
      return NextResponse.json(
        {
          error: "Need at least 5 sessions before the coach can diagnose you.",
          sessionsCompleted: stats?.sessionsCompleted ?? 0,
          required: 5,
        },
        { status: 400 }
      );
    }

    const weakKeys = computeWeakKeyStats(stats.keyStats ?? {}, 8);
    const lb = await leaderboard.findOne({ userId: identity.userId });
    const avgWpm = lb?.avgWpm ?? 0;
    const level = diagnoseLevel(avgWpm, stats.sessionsCompleted);

    let plan = ruleBasedPlan(weakKeys, level, stats.sessionsCompleted);
    plan = await maybeEnrichWithLlm(plan);

    return NextResponse.json({
      plan,
      meta: {
        sessionsCompleted: stats.sessionsCompleted,
        avgWpm,
        weakKeys: weakKeys.slice(0, 5).map((k) => ({
          key: k.key,
          accuracy: k.accuracy,
          avgLatency: k.avgLatency,
        })),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build coach plan.";
    const status = /Unauthorized/.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
