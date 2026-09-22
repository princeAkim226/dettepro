import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { guardAccess } from "@/lib/guards";
import { ReminderSettingsForm } from "@/components/Forms";

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
    </div>
  );
}
