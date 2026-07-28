import { NextRequest, NextResponse } from "next/server";
import { createCertificate } from "@/lib/server/certificates";
import { requireSessionIdentity } from "@/lib/server/session";

export const runtime = "nodejs";

interface CertBody {
  wpm?: number;
  accuracy?: number;
  mode?: string;
}

export async function POST(req: NextRequest) {
  try {
    const identity = await requireSessionIdentity();
    const body = (await req.json()) as CertBody;

    const wpm = Number(body.wpm);
    const accuracy = Number(body.accuracy);
    const mode = typeof body.mode === "string" ? body.mode : "words";

    if (!Number.isFinite(wpm) || !Number.isFinite(accuracy)) {
      return NextResponse.json(
        { error: "wpm and accuracy are required." },
        { status: 400 }
      );
    }

    if (wpm < 60 || accuracy < 90) {
      return NextResponse.json(
        { error: "Certificates require at least 60 WPM and 90% accuracy." },
        { status: 400 }
      );
    }

    const cert = await createCertificate({
      wpm,
      accuracy,
      mode,
      username: identity.username,
      userId: identity.userId,
    });

    return NextResponse.json({ id: cert.id, url: cert.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create certificate.";
    const status = /Unauthorized/.test(message)
      ? 401
      : /Missing MONGODB_URI/.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
