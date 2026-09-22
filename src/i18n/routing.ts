import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "dyu", "mos"],
  defaultLocale: "fr",
});

export type AppLocale = (typeof routing.locales)[number];
