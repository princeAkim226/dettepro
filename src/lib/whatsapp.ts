import { getEnv } from "@/lib/env";

export async function sendWhatsAppText(toPhone: string, body: string) {
  const env = getEnv();
  if (env.whatsappDryRun || !env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(`[WA dry-run] TEXT → ${toPhone}: ${body}`);
    return { ok: true as const, dryRun: true };
  }

  const url = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone.replace(/^\+/, ""),
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false as const, error: err };
  }
  return { ok: true as const, dryRun: false };
}

export async function sendWhatsAppAudio(toPhone: string, audioBuffer: Buffer, filename = "rappel.ogg") {
  const env = getEnv();
  if (env.whatsappDryRun || !env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(`[WA dry-run] AUDIO → ${toPhone} (${audioBuffer.length} bytes)`);
    return { ok: true as const, dryRun: true };
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  form.append("type", "audio/ogg");

  const uploadUrl = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/media`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.whatsappToken}` },
    body: form,
  });

  if (!uploadRes.ok) {
    return { ok: false as const, error: await uploadRes.text() };
  }

  const { id: mediaId } = (await uploadRes.json()) as { id: string };
  const msgUrl = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;
  const msgRes = await fetch(msgUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone.replace(/^\+/, ""),
      type: "audio",
      audio: { id: mediaId },
    }),
  });

  if (!msgRes.ok) {
    return { ok: false as const, error: await msgRes.text() };
  }
  return { ok: true as const, dryRun: false };
}
