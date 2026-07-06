import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = ["completed", "failed", "cancelled"];

// This used to subscribe to an in-memory EventEmitter (lib/pubsub.ts) that
// the webhook route published to directly. That only works when the
// webhook POST and this SSE connection happen to land in the same process —
// on Vercel (or any multi-instance deployment) they're almost always
// different serverless instances with no shared memory, so the update
// would simply never arrive. Polling the database directly is slower
// (up to POLL_INTERVAL_MS latency) but correct regardless of how many
// instances are involved, since the database is the one thing every
// instance actually shares.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const conversationId = searchParams.get("conversationId");

  if (!jobId && !conversationId) {
    return new Response(JSON.stringify({ error: "Missing jobId or conversationId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "connected" })}\n\n`));

      let closed = false;
      let lastSnapshot: string | null = null;
      let pollTimer: ReturnType<typeof setTimeout> | undefined;
      let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearTimeout(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const poll = async () => {
        if (closed) return;
        try {
          let job = jobId ? await db.getJob(jobId) : undefined;
          if (!job && conversationId) {
            const jobs = await db.getJobsForConversation(conversationId);
            job =
              jobs.find((j) => !TERMINAL_STATUSES.includes(j.status)) ||
              jobs[jobs.length - 1];
          }

          if (job) {
            const snapshot = JSON.stringify(job);
            if (snapshot !== lastSnapshot) {
              lastSnapshot = snapshot;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ event: "job_updated", data: job })}\n\n`)
              );
            }
            if (TERMINAL_STATUSES.includes(job.status)) {
              cleanup();
              return;
            }
          }
        } catch (err) {
          console.error("Job stream poll error:", err);
        }

        if (!closed) {
          pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      };

      // Keepalive so intermediary proxies/load balancers don't drop an
      // idle-looking connection while we're between polls.
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "ping" })}\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);

      poll();

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
