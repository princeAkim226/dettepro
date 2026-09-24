import { NextRequest, NextResponse } from "next/server";
import {
  activateFromSaspaySuccess,
  type SaspayWebhookEnvelope,
  verifySaspaySignature,
} from "@/lib/saspay";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");
  const eventHeader = req.headers.get("x-webhook-event");

  if (!getEnv().saspayWebhookSecret) {
    console.error("[saspay] SASPAY_WEBHOOK_SECRET manquant");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });
  }

  if (!verifySaspaySignature(rawBody, signature, timestamp)) {
    console.warn("[saspay] signature/timestamp invalide");
    return NextResponse.json({ error: "Signature invalide" }, { status: 403 });
  }

  let payload: SaspayWebhookEnvelope;
  try {
    payload = JSON.parse(rawBody) as SaspayWebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const event = payload.event || eventHeader || "";
  console.log(`[saspay] event=${event} id=${payload.data?.id} ref=${payload.data?.reference}`);

  if (event === "webhook.test") {
    return NextResponse.json({ ok: true, test: true });
  }

  if (event === "transaction.success") {
    const result = await activateFromSaspaySuccess(payload.data || {});
    if (!result.ok) {
      // 200 pour éviter les retries infinis sur mismatch téléphone ;
      // on logue pour traitement manuel.
      console.error("[saspay] activation refusée:", result.error);
      return NextResponse.json({ ok: false, error: result.error });
    }
    console.log(
      `[saspay] abo activé user=${result.userId} duplicate=${result.duplicate === true}`,
    );
    return NextResponse.json({ ok: true, userId: result.userId });
  }

  return NextResponse.json({ ok: true, ignored: event });
}
