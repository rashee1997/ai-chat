import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";
import { parseMessageContent } from "@/lib/parser";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let job = await db.getJob(id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Lazy reconciliation: if job is not in a terminal state, fetch its status from Gemini Interactions API
    if (["queued", "in_progress", "requires_action"].includes(job.status)) {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        try {
          const interaction = await ai.interactions.get(job.geminiInteractionId);

          if (interaction.status === "completed") {
            let fullOutput = "";
            if (interaction.steps) {
              for (const step of interaction.steps) {
                if (step.type === "model_output") {
                  const textContent = step.content?.find((c: any) => c.type === "text") as any;
                  if (textContent && textContent.text) {
                    fullOutput += textContent.text;
                  }
                }
              }
            }

            if (!fullOutput && interaction.output_text) {
              fullOutput = interaction.output_text;
            }

            const messageId = job.messageId || `assistant-${Date.now()}`;
            await db.saveMessage(job.conversationId, {
              id: messageId,
              role: "assistant",
              content: fullOutput,
            });

            const { artifact } = parseMessageContent(fullOutput);
            if (artifact) {
              await db.saveArtifactVersion(artifact.id, {
                content: artifact.content,
                type: artifact.type,
                title: artifact.title,
              });
            }

            const updatedJob = await db.updateJob(job.id, {
              status: "completed",
              messageId,
              resultJson: JSON.stringify({ text: fullOutput }),
            });

            if (updatedJob) job = updatedJob;
          } else if (interaction.status === "failed") {
            const errorMessage =
              (interaction as any).error?.message || "Interaction failed during remote agent execution.";

            const messageId = job.messageId || `assistant-${Date.now()}`;
            await db.saveMessage(job.conversationId, {
              id: messageId,
              role: "assistant",
              content: `⚠️ Background task failed: ${errorMessage}`,
            });

            const updatedJob = await db.updateJob(job.id, {
              status: "failed",
              errorMessage,
            });

            if (updatedJob) job = updatedJob;
          } else if (interaction.status === "requires_action") {
            const actionPayload = (interaction as any).requires_action || null;
            const updatedJob = await db.updateJob(job.id, {
              status: "requires_action",
              resultJson: actionPayload ? JSON.stringify(actionPayload) : undefined,
            });

            if (updatedJob) job = updatedJob;
          }
        } catch (err) {
          console.error("Lazy reconciliation failed for job:", job.id, err);
        }
      }
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("GET Job Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { input } = await req.json();

    const job = await db.getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Reconstruct webhook URI for the callback
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const finalProtocol =
      host.includes("localhost") || host.includes("127.0.0.1") ? protocol : "https";
    const baseUrl = `${finalProtocol}://${host}`;
    const webhookUri = `${baseUrl}/api/webhooks/gemini`;

    // Fetch the previous interaction to get the environment_id
    const previousInteraction = await ai.interactions.get(job.geminiInteractionId);

    // Create a new child interaction continuing the conversation
    const nextInteraction = await ai.interactions.create({
      agent: job.agentType,
      input,
      previous_interaction_id: job.geminiInteractionId,
      environment: previousInteraction.environment_id || "remote",
      background: true,
      webhook_config: {
        uris: [webhookUri],
      },
    });

    // Update the local database job status back to in_progress with the new interaction ID
    const updatedJob = await db.updateJob(job.id, {
      geminiInteractionId: nextInteraction.id,
      status: "in_progress",
    });

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error: any) {
    console.error("POST Job Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while resuming the job" },
      { status: 500 }
    );
  }
}
