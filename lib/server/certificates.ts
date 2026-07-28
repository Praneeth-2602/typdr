import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { getMongoDb } from "@/lib/server/db";

export interface CertificatePayload {
  wpm: number;
  accuracy: number;
  mode: string;
  username: string;
  userId: string;
  issuedAt: string; // ISO
}

export interface CertificateDocument {
  id: string;
  payload: CertificatePayload;
  signature: string;
  createdAt: Date;
}

function signingSecret(): string {
  return env.CERT_SIGNING_SECRET || env.NEXTAUTH_SECRET || "typdr-dev-cert-secret";
}

function canonicalPayload(payload: CertificatePayload): string {
  return JSON.stringify({
    wpm: payload.wpm,
    accuracy: payload.accuracy,
    mode: payload.mode,
    username: payload.username,
    userId: payload.userId,
    issuedAt: payload.issuedAt,
  });
}

export function signCertificatePayload(payload: CertificatePayload): string {
  return createHmac("sha256", signingSecret())
    .update(canonicalPayload(payload))
    .digest("hex");
}

export function verifyCertificateSignature(
  payload: CertificatePayload,
  signature: string
): boolean {
  const expected = signCertificatePayload(payload);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function newCertId(): string {
  return randomBytes(12).toString("hex");
}

export async function createCertificate(input: {
  wpm: number;
  accuracy: number;
  mode: string;
  username: string;
  userId: string;
}): Promise<{ id: string; url: string; payload: CertificatePayload }> {
  const payload: CertificatePayload = {
    wpm: Math.round(input.wpm),
    accuracy: Math.round(input.accuracy * 10) / 10,
    mode: String(input.mode).slice(0, 32),
    username: input.username.slice(0, 40),
    userId: input.userId,
    issuedAt: new Date().toISOString(),
  };

  const signature = signCertificatePayload(payload);
  const id = newCertId();

  const db = await getMongoDb();
  const certs = db.collection<CertificateDocument>("certificates");
  await certs.createIndex({ id: 1 }, { unique: true });
  await certs.insertOne({
    id,
    payload,
    signature,
    createdAt: new Date(),
  });

  return {
    id,
    url: `/cert/${id}`,
    payload,
  };
}

export async function getVerifiedCertificate(
  id: string
): Promise<{ payload: CertificatePayload; verified: boolean } | null> {
  const db = await getMongoDb();
  const certs = db.collection<CertificateDocument>("certificates");
  const doc = await certs.findOne({ id }, { projection: { _id: 0 } });
  if (!doc) return null;

  const verified = verifyCertificateSignature(doc.payload, doc.signature);
  return { payload: doc.payload, verified };
}
