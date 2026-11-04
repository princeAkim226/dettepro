import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { applyMetaStatuses, isValidMetaSignature } from "@/lib/reminder-status";

/**
 * Webhook Meta WhatsApp — obligatoire pour passer en production.
 * GET  = vérification Meta (challenge)
 * POST = statuts de livraison (les réponses des clients sont ignorées)
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const expected = getEnv().whatsappVerifyToken;

  if (mode === "subscribe" && token && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const secret = getEnv().whatsappAppSecret;
  if (!secret) {
    console.warn("[whatsapp-webhook] WHATSAPP_APP_SECRET absent : statuts ignorés");
    return NextResponse.json({ ok: true });
  }

  const rawBody = await req.text();
  if (!isValidMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  await applyMetaStatuses(payload);
  return NextResponse.json({ ok: true });
}
