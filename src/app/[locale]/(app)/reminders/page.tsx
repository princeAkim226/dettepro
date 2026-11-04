import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { guardAccess } from "@/lib/guards";
import { ReminderSettingsForm } from "@/components/Forms";
import { ReminderHistory } from "@/components/ReminderHistory";

export default async function RemindersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await guardAccess(locale);
  const t = await getTranslations("reminders");

  const settings = await prisma.reminderSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  const logs = await prisma.reminderLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { customer: { select: { name: true } } },
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("title")}</h1>
      <ReminderSettingsForm
        initial={{
          enabled: settings.enabled,
          channel: settings.channel,
          frequencyType: settings.frequencyType,
          everyNDays: settings.everyNDays,
          weeklyDay: settings.weeklyDay,
          hour: settings.hour,
          minute: settings.minute,
          messageTemplate: settings.messageTemplate,
        }}
      />
      <div style={{ marginTop: "2rem" }}>
        <ReminderHistory logs={logs} />
      </div>
    </div>
  );
}
