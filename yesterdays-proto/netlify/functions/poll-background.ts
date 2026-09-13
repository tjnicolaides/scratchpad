import type { Config } from "@netlify/functions";
import { runPoll } from "../../lib/poller";

// Scheduled ingest. Netlify reads the exported `config.schedule` (cron) — every
// 2 minutes here. Keep it modest; polling is the skeleton's ingest, replaced by
// a Jetstream subscription (a long-lived worker) once you want open contribution.
export default async () => {
  const summary = await runPoll();
  console.log("[poll-background]", JSON.stringify(summary));
};

export const config: Config = {
  schedule: "*/2 * * * *",
};
