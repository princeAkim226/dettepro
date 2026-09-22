import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { trialEndFromNow } from "@/lib/subscription";

const schema = z.object({
  phone: z.string().min(8),
  shopName: z.string().min(2),
  locale: z.enum(["fr", "dyu", "mos"]),
  name: z.string().min(2),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const phone = normalizePhone(body.data.phone);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: body.data.name,
      phone,
      shopName: body.data.shopName,
      locale: body.data.locale,
      trialEndsAt: trialEndFromNow(),
      role: "SHOPKEEPER",
    },
  });

  await prisma.reminderSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
