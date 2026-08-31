import type { Handler } from "@netlify/functions";
import { runPoll } from "../../lib/poller";

// GET /.netlify/functions/poll — manual trigger, handy during dev so you don't
// have to wait for the scheduled run. Same logic as poll-background.
export const handler: Handler = async () => {
  const summary = await runPoll();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(summary),
  };
};
