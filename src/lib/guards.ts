import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getAccessStatus } from "@/lib/subscription";

export async function guardAccess(locale: string) {
  const user = await requireUser();
  const access = await getAccessStatus(user.id);
  if (!access.ok && user.role !== "ADMIN") {
    redirect(`/${locale}/billing`);
  }
  return user;
}
