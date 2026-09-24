import { prisma } from "@/lib/prisma";
import { customerBalance } from "@/lib/money";
import { buildReminderMessage, isReminderDue } from "@/lib/reminders";
import { sendWhatsAppAudio, sendWhatsAppReminderText } from "@/lib/whatsapp";
import { synthesizeSpeech } from "@/lib/tts";
import { normalizePhone } from "@/lib/phone";
import { getAccessStatus } from "@/lib/subscription";
import { getEnv } from "@/lib/env";

function resolveChannels(channel: string): Array<"text" | "voice"> {
  const env = getEnv();
  const voiceOk = env.ttsEnabled && !env.whatsappDryRun;
  if (channel === "voice") return voiceOk ? ["voice"] : ["text"];
  if (channel === "text") return ["text"];
  return voiceOk ? ["text", "voice"] : ["text"];
}

export async function runReminderTick(now = new Date()) {
  const settingsList = await prisma.reminderSettings.findMany({
    where: { enabled: true },
    include: { user: true },
  });

  let sent = 0;

  for (const settings of settingsList) {
    if (!isReminderDue(settings, now)) continue;

    const access = await getAccessStatus(settings.userId);
    if (!access.ok) continue;

    const customers = await prisma.customer.findMany({
      where: { userId: settings.userId },
      include: { debts: true, payments: true },
    });

    for (const customer of customers) {
      if (!customer.phone) continue;
      const balance = customerBalance(customer.debts, customer.payments);
      if (balance <= 0) continue;

      const message = buildReminderMessage({
        locale: settings.user.locale,
        customerName: customer.name,
        amount: balance,
        shopName: settings.user.shopName,
        template: settings.messageTemplate,
      });

      const phone = normalizePhone(customer.phone);
      const channels = resolveChannels(settings.channel);

      for (const channel of channels) {
        try {
          if (channel === "text") {
            const res = await sendWhatsAppReminderText(phone, message);
            await prisma.reminderLog.create({
              data: {
                customerId: customer.id,
                userId: settings.userId,
                channel: "text",
                status: res.ok ? "sent" : "failed",
                message,
                error: res.ok ? null : res.error,
              },
            });
            if (res.ok) sent++;
          } else {
            const audio = await synthesizeSpeech(message, settings.user.locale);
            const res = await sendWhatsAppAudio(phone, audio.buffer, {
              filename: audio.filename,
              contentType: audio.contentType,
            });
            await prisma.reminderLog.create({
              data: {
                customerId: customer.id,
                userId: settings.userId,
                channel: "voice",
                status: res.ok ? "sent" : "failed",
                message,
                error: res.ok ? null : res.error,
              },
            });
            if (res.ok) sent++;
          }
        } catch (e) {
          await prisma.reminderLog.create({
            data: {
              customerId: customer.id,
              userId: settings.userId,
              channel,
              status: "failed",
              message,
              error: e instanceof Error ? e.message : String(e),
            },
          });
        }
      }
    }

    await prisma.reminderSettings.update({
      where: { id: settings.id },
      data: { lastRunAt: now },
    });
  }

  return { sent };
}

export async function sendReminderNow(opts: {
  userId: string;
  customerId: string;
  channel?: "text" | "voice" | "both";
}) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: opts.userId } });
  const customer = await prisma.customer.findFirstOrThrow({
    where: { id: opts.customerId, userId: opts.userId },
    include: { debts: true, payments: true },
  });
  if (!customer.phone) throw new Error("Client sans numéro WhatsApp");

  const settings = await prisma.reminderSettings.findUnique({
    where: { userId: opts.userId },
  });

  const balance = customerBalance(customer.debts, customer.payments);
  if (balance <= 0) throw new Error("Ce client n'a pas de dette");

  const message = buildReminderMessage({
    locale: user.locale,
    customerName: customer.name,
    amount: balance,
    shopName: user.shopName,
    template: settings?.messageTemplate,
  });

  // Texte + vocal si TTS activé
  const channel = opts.channel ?? (getEnv().ttsEnabled ? "both" : "text");
  const phone = normalizePhone(customer.phone);
  const channels = resolveChannels(channel);

  let dryRun = false;
  for (const ch of channels) {
    if (ch === "text") {
      const res = await sendWhatsAppReminderText(phone, message);
      if (res.ok && res.dryRun) dryRun = true;
      await prisma.reminderLog.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          channel: "text",
          status: res.ok ? "sent" : "failed",
          message,
          error: res.ok ? null : res.error,
        },
      });
      if (!res.ok) throw new Error(res.error);
    } else {
      const audio = await synthesizeSpeech(message, user.locale);
      const res = await sendWhatsAppAudio(phone, audio.buffer, {
        filename: audio.filename,
        contentType: audio.contentType,
      });
      if (res.ok && res.dryRun) dryRun = true;
      await prisma.reminderLog.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          channel: "voice",
          status: res.ok ? "sent" : "failed",
          message,
          error: res.ok ? null : res.error,
        },
      });
      // Vocal en bonus : on ne fait pas échouer le rappel si le texte a déjà marché
      if (!res.ok) {
        console.error("[remind-now] voice failed:", res.error);
      }
    }
  }

  return { message, dryRun, phone };
}
