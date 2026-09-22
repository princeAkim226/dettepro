import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";

const env = getEnv();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.authSecret,
  baseURL: env.betterAuthUrl,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: true },
      shopName: { type: "string", required: false, input: true },
      locale: { type: "string", required: false, defaultValue: "fr", input: true },
      role: { type: "string", required: false, defaultValue: "SHOPKEEPER", input: false },
      trialEndsAt: { type: "date", required: false, input: false },
    },
  },
});

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopName: string;
  locale: string;
  role: string;
  trialEndsAt: Date | string;
};
