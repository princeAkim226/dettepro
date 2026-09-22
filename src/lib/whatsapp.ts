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

type WaSendResult =
  | { ok: true; dryRun: boolean; via: "template" | "text" }
  | { ok: false; error: string };

async function postWhatsAppMessage(payload: Record<string, unknown>): Promise<WaSendResult> {
  const env = getEnv();
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
        ...payload,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: formatWhatsAppError(await res.text()) };
    }
    const via = (payload.type === "template" ? "template" : "text") as
      | "template"
      | "text";
    return { ok: true, dryRun: false, via };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error:
        msg === "fetch failed"
          ? "Impossible de joindre WhatsApp (réseau). Réessaie dans quelques secondes."
          : msg,
    };
  }
}

/** Texte libre — ne marche hors session que si le destinataire a écrit récemment. */
export async function sendWhatsAppText(toPhone: string, body: string): Promise<WaSendResult> {
  const env = getEnv();
  if (env.whatsappDryRun || !env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(`[WA dry-run] TEXT → ${toPhone}: ${body}`);
    return { ok: true, dryRun: true, via: "text" };
  }

  return postWhatsAppMessage({
    to: toPhone.replace(/^\+/, ""),
    type: "text",
    text: { body },
  });
}

/**
 * Notif one-way via template utilitaire Meta (catégorie UTILITY).
 * Le client n'a pas besoin de répondre — comme un SMS opérateur.
 */
export async function sendWhatsAppTemplate(
  toPhone: string,
  bodyParam: string,
): Promise<WaSendResult> {
  const env = getEnv();
  if (env.whatsappDryRun || !env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(
      `[WA dry-run] TEMPLATE ${env.whatsappTemplateName} → ${toPhone}: ${bodyParam}`,
    );
    return { ok: true, dryRun: true, via: "template" };
  }

  if (!env.whatsappTemplateName) {
    return { ok: false, error: "Aucun template WhatsApp configuré." };
  }

  return postWhatsAppMessage({
    to: toPhone.replace(/^\+/, ""),
    type: "template",
    template: {
      name: env.whatsappTemplateName,
      language: { code: env.whatsappTemplateLang },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: bodyParam.slice(0, 1024) }],
        },
      ],
    },
  });
}

/**
 * Rappel texte : priorise le template utilitaire (notif),
 * sinon retombe sur texte libre (tests / fenêtre 24h).
 */
export async function sendWhatsAppReminderText(
  toPhone: string,
  body: string,
): Promise<WaSendResult> {
  const env = getEnv();
  if (env.whatsappTemplateName) {
    const tpl = await sendWhatsAppTemplate(toPhone, body);
    if (tpl.ok) return tpl;
    console.warn(`[WA] template failed, fallback text: ${tpl.error}`);
    const text = await sendWhatsAppText(toPhone, body);
    if (text.ok) return text;
    return {
      ok: false,
      error: `Template: ${tpl.error} | Texte: ${text.error}`,
    };
  }
  return sendWhatsAppText(toPhone, body);
}

export async function sendWhatsAppAudio(
  toPhone: string,
  audioBuffer: Buffer,
  opts?: { filename?: string; contentType?: string },
) {
  const env = getEnv();
  const filename = opts?.filename ?? "rappel.mp3";
  const contentType = opts?.contentType ?? "audio/mpeg";

  if (env.whatsappDryRun || !env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(`[WA dry-run] AUDIO → ${toPhone} (${audioBuffer.length} bytes)`);
    return { ok: true as const, dryRun: true };
  }

  if (
    !env.ttsEnabled ||
    audioBuffer.length < 100 ||
    audioBuffer.toString("utf8", 0, 20).startsWith("TTS_PLACEHOLDER")
  ) {
    return {
      ok: false as const,
      error: "Rappel vocal non disponible pour le moment (texte uniquement).",
    };
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: contentType }),
    filename,
  );
  form.append("type", contentType);

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
