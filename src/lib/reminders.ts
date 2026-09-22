import { formatFcfa } from "@/lib/money";

const DEFAULT_TEMPLATES: Record<string, string> = {
  fr: "Bonjour {name}, vous devez {amount} à {shop}. Merci de régulariser. — DettePro",
  dyu: "I ni ce {name}, i ka {amount} san {shop} ma. Aw ni ce. — DettePro",
  mos: "Ne yɩɩnga {name}, fo tara {amount} ne {shop}. Bark' a wʋm. — DettePro",
};

export function buildReminderMessage(opts: {
  locale: string;
  customerName: string;
  amount: number;
  shopName: string;
  template?: string | null;
}) {
  const base =
    opts.template?.trim() ||
    DEFAULT_TEMPLATES[opts.locale] ||
    DEFAULT_TEMPLATES.fr;
  return base
    .replaceAll("{name}", opts.customerName)
    .replaceAll("{amount}", formatFcfa(opts.amount))
    .replaceAll("{shop}", opts.shopName);
}

export function isReminderDue(settings: {
  frequencyType: string;
  everyNDays: number | null;
  weeklyDay: number;
  hour: number;
  minute: number;
  lastRunAt: Date | null;
}, now = new Date()) {
  // Africa/Ouagadougou = UTC+0 toute l'année
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const day = now.getUTCDay();

  if (hour !== settings.hour || minute !== settings.minute) return false;

  if (settings.lastRunAt) {
    const diffMs = now.getTime() - settings.lastRunAt.getTime();
    if (diffMs < 50_000) return false; // anti double-fire dans la même minute
  }

  if (settings.frequencyType === "daily") return true;

  if (settings.frequencyType === "weekly") {
    return day === settings.weeklyDay;
  }

  if (settings.frequencyType === "every_n_days") {
    const n = settings.everyNDays && settings.everyNDays > 0 ? settings.everyNDays : 3;
    if (!settings.lastRunAt) return true;
    const days = (now.getTime() - settings.lastRunAt.getTime()) / (1000 * 60 * 60 * 24);
    return days >= n - 0.001;
  }

  return false;
}
