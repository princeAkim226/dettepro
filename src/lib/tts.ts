import { Readable } from "stream";
import { MsEdgeTTS, OUTPUT_FORMAT, ProsodyOptions } from "msedge-tts";
import { getEnv } from "@/lib/env";

export type SpeechAudio = {
  buffer: Buffer;
  contentType: "audio/mpeg";
  filename: string;
};

async function readableToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function pickVoice(locale: string): string {
  // Voix neurales FR (Microsoft). Mooré/dioula → FR pour l'instant.
  switch (locale) {
    case "mos":
    case "dyu":
    case "fr":
    default:
      return "fr-FR-DeniseNeural";
  }
}

/**
 * Synthèse vocale naturelle (Microsoft Edge neural TTS — gratuit, sans clé API).
 */
export async function synthesizeSpeech(
  text: string,
  locale = "fr",
): Promise<SpeechAudio> {
  const env = getEnv();
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 500);

  if (!env.ttsEnabled || env.whatsappDryRun) {
    console.log(`[TTS dry-run] locale=${locale} text="${clean.slice(0, 80)}..."`);
    return {
      buffer: Buffer.from(`TTS_PLACEHOLDER:${clean}`),
      contentType: "audio/mpeg",
      filename: "rappel.mp3",
    };
  }

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(
      pickVoice(locale),
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    );

    const prosody = new ProsodyOptions();
    // Un peu plus lent = plus naturel / moins « robot pressé »
    prosody.rate = 0.92;
    prosody.pitch = "+0Hz";

    const { audioStream } = tts.toStream(clean, prosody);
    const buffer = await readableToBuffer(audioStream);

    if (buffer.length < 200) {
      throw new Error("Audio TTS vide ou trop court");
    }

    return {
      buffer,
      contentType: "audio/mpeg",
      filename: "rappel.mp3",
    };
  } finally {
    try {
      tts.close();
    } catch {
      /* ignore */
    }
  }
}
