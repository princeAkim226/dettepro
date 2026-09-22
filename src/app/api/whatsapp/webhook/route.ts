import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

/**
 * Webhook Meta WhatsApp — obligatoire pour passer en production.
 * GET  = vérification Meta (challenge)
 * POST = accusés de réception / statuts (on ignore le contenu, on répond 200)
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
  try {
    // Accusé rapide — Meta exige < 20s. On ne traite pas les replies pour l'instant.
    await req.json().catch(() => null);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
