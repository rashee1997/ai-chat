import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhook } from "@/lib/signature";
import { pubsub } from "@/lib/pubsub";
import { GoogleGenAI } from "@google/genai";
import { parseMessageContent } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookId = req.headers.get("webhook-id") || req.headers.get("x-webhook-id");
    const webhookTimestamp = req.headers.get("webhook-timestamp") || req.headers.get("x-webhook-timestamp");
    const webhookSignature = req.headers.get("webhook-signature") || req.headers.get("x-webhook-signature") || req.headers.get("signature");

    // 1. Verify Signature
    const isValid = await verifyWebhook(rawBody, webhookSignature, webhookId, webhookTimestamp);
    if (!isValid) {
      console.warn("Webhook Signature Verification Failed", { webhookId, webhookSignature });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // 2. Extract key event metadata
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const finalWebhookId = webhookId || `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const eventType = payload.event_type || payload.eventType || "unknown";

    // 3. Idempotency Check
    const existingEvent = db.getWebhookEvent(finalWebhookId);
    if (existingEvent) {
      console.info("Duplicate Webhook Event Ignored:", finalWebhookId);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // Save event
    db.createWebhookEvent(finalWebhookId, eventType, rawBody);

    // 4. Return 200 OK immediately and process asynchronously (non-blocking)
    processWebhookEvent(eventType, payload, finalWebhookId).catch((err) => {
      console.error("Async Webhook Processing Error:", err);
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function processWebhookEvent(eventType: string, payload: any, webhookId: string) {
  const interactionId = payload.interaction?.id || payload.interactionId;
  if (!interactionId) {
    console.warn("No interaction ID found in webhook payload:", payload);
    db.updateWebhookEvent(webhookId, { processedAt: new Date().toISOString() });
    return;
  }

  // Find corresponding job by geminiInteractionId
  const job = db.getJobByInteractionId(interactionId);
  if (!job) {
    console.warn("No RemoteAgentJob found for interaction ID:", interactionId);
    db.updateWebhookEvent(webhookId, { processedAt: new Date().toISOString() });
    return;
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  try {
    if (eventType === "interaction.completed" || payload.interaction?.status === "completed") {
      console.info(`Processing completed interaction: ${interactionId} for Job ${job.id}`);

      // Fetch full interaction to get all steps & outputs
      const interaction = await ai.interactions.get(interactionId);

      // Extract full output text from all model_output steps (as instructed in gemini-interactions-api skill)
      let fullOutput = "";
      if (interaction.steps) {
        for (const step of interaction.steps) {
          if (step.type === "model_output") {
            const textContent = step.content?.find((c: any) => c.type === "text");
            if (textContent && textContent.text) {
              fullOutput += textContent.text;
            }
          }
        }
      }

      if (!fullOutput && interaction.output_text) {
        fullOutput = interaction.output_text;
      }

      // Save assistant message in conversation
      const messageId = job.messageId || `assistant-${Date.now()}`;
      db.saveMessage(job.conversationId, {
        id: messageId,
        role: "assistant",
        content: fullOutput,
      });

      // Save any artifacts parsed
      const { artifact } = parseMessageContent(fullOutput);
      if (artifact) {
        db.saveArtifactVersion(artifact.id, {
          content: artifact.content,
          type: artifact.type,
          title: artifact.title,
        });
      }

      // Update Job status in DB
      db.updateJob(job.id, {
        status: "completed",
        messageId,
        resultJson: JSON.stringify({ text: fullOutput }),
      });

      // Notify clients
      pubsub.publish(job.id, {
        jobId: job.id,
        conversationId: job.conversationId,
        status: "completed",
        messageId,
        result: fullOutput,
      });

    } else if (eventType === "interaction.failed" || payload.interaction?.status === "failed") {
      const errorMessage = payload.interaction?.error?.message || "Interaction failed during remote agent execution.";
      console.warn(`Processing failed interaction: ${interactionId} for Job ${job.id}. Error: ${errorMessage}`);

      db.updateJob(job.id, {
        status: "failed",
        errorMessage,
      });

      // Save a failure message in conversation so user knows what went wrong
      const messageId = job.messageId || `assistant-${Date.now()}`;
      db.saveMessage(job.conversationId, {
        id: messageId,
        role: "assistant",
        content: `⚠️ Background task failed: ${errorMessage}`,
      });

      pubsub.publish(job.id, {
        jobId: job.id,
        conversationId: job.conversationId,
        status: "failed",
        messageId,
        errorMessage,
      });

    } else if (eventType === "interaction.requires_action" || payload.interaction?.status === "requires_action") {
      console.info(`Processing requires_action interaction: ${interactionId} for Job ${job.id}`);

      const actionPayload = payload.interaction?.requires_action || null;

      db.updateJob(job.id, {
        status: "requires_action",
        resultJson: actionPayload ? JSON.stringify(actionPayload) : undefined,
      });

      pubsub.publish(job.id, {
        jobId: job.id,
        conversationId: job.conversationId,
        status: "requires_action",
        actionRequired: actionPayload,
      });
    }

    db.updateWebhookEvent(webhookId, { processedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error(`Error processing webhook event for Job ${job.id}:`, err);
    db.updateJob(job.id, {
      status: "failed",
      errorMessage: `Error processing webhook callback: ${err.message}`,
    });

    pubsub.publish(job.id, {
      jobId: job.id,
      conversationId: job.conversationId,
      status: "failed",
      errorMessage: err.message,
    });
  }
}
