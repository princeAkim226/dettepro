import "dotenv/config";
import { assertRequiredEnv } from "../src/lib/env";
import { runReminderTick } from "../src/lib/reminder-runner";

assertRequiredEnv();

const INTERVAL_MS = 60_000;

async function tick() {
  try {
    const result = await runReminderTick();
    if (result.sent > 0) {
      console.log(`[reminders] ${result.sent} envoi(s) à ${new Date().toISOString()}`);
    }
  } catch (e) {
    console.error("[reminders] erreur", e);
  }
}

console.log("[reminders] worker démarré — tick chaque minute (Africa/Ouagadougou = UTC)");
void tick();
setInterval(tick, INTERVAL_MS);
