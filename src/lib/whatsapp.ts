import { getEnv } from "@/lib/env";

/** Transforme les erreurs brutes Meta en message lisible. */
export function formatWhatsAppError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; code?: number; error_user_msg?: string };
    };
    const code = parsed.error?.code;
    const msg = parsed.error?.error_user_msg || parsed.error?.message || raw;
    if (code === 190) {
      return "Token WhatsApp expiré. Régénère un token dans Meta (Étape 1) et mets-le à jour dans Coolify.";
    }
    if (code === 131030 || code === 133010) {
      return "Ce numéro n'est pas autorisé en test. Ajoute-le comme destinataire dans Meta.";
    }
    return msg;
  } catch {
    return raw.slice(0, 180);
  }
}

export async function sendWhatsAppText(toPhone: string, body: string) {
  const env = getEnv();
  if (env.whatsappDryRun || !env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(`[WA dry-run] TEXT → ${toPhone}: ${body}`);
    return { ok: true as const, dryRun: true };
  }

  const url = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;
  try {
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
      const err = formatWhatsAppError(await res.text());
      return { ok: false as const, error: err };
    }
    return { ok: true as const, dryRun: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error:
        msg === "fetch failed"
          ? "Impossible de joindre WhatsApp (réseau). Réessaie dans quelques secondes."
          : msg,
    };
  }
}

export async function sendWhatsAppAudio(toPhone: string, audioBuffer: Buffer, filename = "rappel.ogg") {
  const env = getEnv();
  if (env.whatsappDryRun || !env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(`[WA dry-run] AUDIO → ${toPhone} (${audioBuffer.length} bytes)`);
    return { ok: true as const, dryRun: true };
  }

  // Sans vrai TTS, ne pas uploader un faux fichier (Meta → error #100 octet-stream)
  if (!env.ttsEnabled || audioBuffer.length < 100 || audioBuffer.toString("utf8", 0, 20).startsWith("TTS_PLACEHOLDER")) {
    return {
      ok: false as const,
      error: "Rappel vocal non disponible pour le moment (texte uniquement).",
    };
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: "audio/ogg" }),
    filename,
  );
  form.append("type", "audio/ogg");

  const uploadUrl = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/media`;
  try {
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.whatsappToken}` },
      body: form,
    });

    if (!uploadRes.ok) {
      return { ok: false as const, error: formatWhatsAppError(await uploadRes.text()) };
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
      return { ok: false as const, error: formatWhatsAppError(await msgRes.text()) };
    }
    return { ok: true as const, dryRun: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false as const,
      error:
        msg === "fetch failed"
          ? "Impossible de joindre WhatsApp (réseau). Réessaie dans quelques secondes."
          : msg,
    };
  }
}
