import { getEnv } from "@/lib/env";

/**
 * Génère un audio TTS. En dry-run / sans TTS, retourne un buffer vide
 * (l'envoi WhatsApp sera aussi en dry-run).
 * Branchez ici edge-tts, Google TTS, etc. en production.
 */
export async function synthesizeSpeech(text: string, locale = "fr"): Promise<Buffer> {
  const env = getEnv();
  if (!env.ttsEnabled || env.whatsappDryRun) {
    console.log(`[TTS dry-run] locale=${locale} text="${text.slice(0, 80)}..."`);
    return Buffer.from(`TTS_PLACEHOLDER:${text}`);
  }

  // Placeholder production : à remplacer par un vrai fournisseur TTS
  // Exemple d'intégration : appeler une API HTTP et retourner le binaire audio.
  throw new Error(
    "TTS_ENABLED=true mais aucun fournisseur TTS n'est branché. Configurez src/lib/tts.ts",
  );
}
