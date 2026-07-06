import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";
import { parseMessageContent } from "@/lib/parser";
import { pubsub } from "@/lib/pubsub";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let job = db.getJob(id);

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

            const messageId = job.messageId || `assistant-${Date.now()}`;
            db.saveMessage(job.conversationId, {
              id: messageId,
              role: "assistant",
              content: fullOutput,
            });

            const { artifact } = parseMessageContent(fullOutput);
            if (artifact) {
              db.saveArtifactVersion(artifact.id, {
                content: artifact.content,
                type: artifact.type,
                title: artifact.title,
              });
            }

            const updatedJob = db.updateJob(job.id, {
              status: "completed",
              messageId,
              resultJson: JSON.stringify({ text: fullOutput }),
            });

            if (updatedJob) {
              job = updatedJob;
              pubsub.publish(job.id, {
                jobId: job.id,
                conversationId: job.conversationId,
                status: "completed",
                messageId,
                result: fullOutput,
              });
            }
          } else if (interaction.status === "failed") {
            const errorMessage =
              interaction.error?.message || "Interaction failed during remote agent execution.";

            const messageId = job.messageId || `assistant-${Date.now()}`;
            db.saveMessage(job.conversationId, {
              id: messageId,
              role: "assistant",
              content: `⚠️ Background task failed: ${errorMessage}`,
            });

            const updatedJob = db.updateJob(job.id, {
              status: "failed",
              errorMessage,
            });

            if (updatedJob) {
              job = updatedJob;
              pubsub.publish(job.id, {
                jobId: job.id,
                conversationId: job.conversationId,
                status: "failed",
                messageId,
                errorMessage,
              });
            }
          } else if (interaction.status === "requires_action") {
            const actionPayload = interaction.requires_action || null;
            const updatedJob = db.updateJob(job.id, {
              status: "requires_action",
              resultJson: actionPayload ? JSON.stringify(actionPayload) : undefined,
            });

            if (updatedJob) {
              job = updatedJob;
              pubsub.publish(job.id, {
                jobId: job.id,
                conversationId: job.conversationId,
                status: "requires_action",
                actionRequired: actionPayload,
              });
            }
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

    const job = db.getJob(id);
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

    // Resume the background interaction
    await ai.interactions.resume(job.geminiInteractionId, { input });

    // Update the local database job status back to in_progress
    const updatedJob = db.updateJob(job.id, {
      status: "in_progress",
    });

    if (updatedJob) {
      pubsub.publish(job.id, {
        jobId: job.id,
        conversationId: job.conversationId,
        status: "in_progress",
      });
    }

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error: any) {
    console.error("POST Job Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while resuming the job" },
      { status: 500 }
    );
  }
}
