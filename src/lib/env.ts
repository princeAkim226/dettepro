const REQUIRED = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function assertRequiredEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(
      `Démarrage refusé — variables manquantes : ${missing.join(", ")}`,
    );
    process.exit(1);
  }
}

export function getEnv() {
  return {
    databaseUrl: process.env.DATABASE_URL!,
    authSecret: process.env.AUTH_SECRET!,
    betterAuthUrl: process.env.BETTER_AUTH_URL!,
    appUrl: process.env.NEXT_PUBLIC_APP_URL!,
    adminPhone: process.env.ADMIN_PHONE ?? "70000000",
    adminPassword: process.env.ADMIN_PASSWORD ?? "",
    adminName: process.env.ADMIN_NAME ?? "Admin DettePro",
    paymentOrange: process.env.PAYMENT_ORANGE_MONEY ?? "À configurer",
    paymentWave: process.env.PAYMENT_WAVE ?? "À configurer",
    paymentMoov: process.env.PAYMENT_MOOV ?? "À configurer",
    paymentLink:
      process.env.PAYMENT_LINK ?? "https://link.saspay.me/qxmnaayn608",
    whatsappDryRun: process.env.WHATSAPP_DRY_RUN !== "false",
    whatsappToken: process.env.WHATSAPP_TOKEN ?? "",
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    whatsappApiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
    // Template utilitaire = notif one-way (comme SMS opérateur), sans conversation
    whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "dettepro_rappel",
    whatsappTemplateLang: process.env.WHATSAPP_TEMPLATE_LANG ?? "fr",
    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    ttsEnabled: process.env.TTS_ENABLED === "true",
    subscriptionAmount: 2000,
    trialDays: 7,
  };
}
