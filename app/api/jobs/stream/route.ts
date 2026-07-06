import { NextRequest } from "next/server";
import { pubsub } from "@/lib/pubsub";

export const runtime = "nodejs";

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
      // Send connection established event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "connected" })}\n\n`));

      let unsubscribeJob: (() => void) | undefined;
      let unsubscribeConversation: (() => void) | undefined;

      // Keepalive heartbeat every 15s to prevent connection drop
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "ping" })}\n\n`));
        } catch (e) {
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeatInterval);
        if (unsubscribeJob) unsubscribeJob();
        if (unsubscribeConversation) unsubscribeConversation();
        try {
          controller.close();
        } catch (e) {}
      };

      if (jobId) {
        unsubscribeJob = pubsub.subscribe(jobId, (data) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "job_updated", data })}\n\n`));
          } catch (e) {
            cleanup();
          }
        });
      }

      if (conversationId) {
        unsubscribeConversation = pubsub.subscribeConversation(conversationId, (data) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "job_updated", data })}\n\n`));
          } catch (e) {
            cleanup();
          }
        });
      }

      req.signal.addEventListener("abort", () => {
        cleanup();
      });
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
