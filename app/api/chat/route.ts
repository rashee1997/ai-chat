import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You are a highly advanced AI Assistant like Claude.ai, with the unique ability to create interactive "Artifacts" for complex coding, design, and documentation tasks.

An artifact is a self-contained, high-quality, and visually stunning piece of work (like a single-page web app/HTML prototype, a professional Word document, a multi-slide PowerPoint presentation, or an Excel spreadsheet dashboard).

When the user asks you to create a webpage, script, presentation, document, or spreadsheet, you MUST wrap it inside an <artifact> tag.
Only use artifacts for substantial creations. Standard explanations or short summaries do not need to be wrapped in artifacts.

CRITICAL RULES FOR ARTIFACTS:
1. Wrap the entire artifact in an XML-style tag: <artifact type="TYPE" id="ID" title="TITLE">CONTENT</artifact>
2. The "type" attribute must be one of: "html", "word", "ppt", "excel"
3. Provide a unique, hyphenated "id" (e.g., "scientific-calculator", "q3-marketing-plan").
4. Provide a short, user-friendly "title" (e.g., "Scientific Calculator", "Q3 Marketing Strategy").
5. The content inside the tag must follow the precise format for each type:

- TYPE "html":
  Must contain a single, complete, fully functional HTML page including inline CSS (or Tailwind script) and JavaScript. It should be fully responsive and beautiful.
  Example structure:
  <artifact type="html" id="interactive-dashboard" title="Analytics Dashboard">
  <!DOCTYPE html>
  <html>
  <head>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
  </head>
  <body class="bg-slate-50 text-slate-800 p-6">
    ... content and interactive JS ...
  </body>
  </html>
  </artifact>

- TYPE "word":
  Must contain a single JSON object describing a multi-section document. Do NOT wrap this JSON in markdown code blocks. Just write the JSON.
  JSON Schema:
  {
    "title": "Document Title",
    "subtitle": "Document Subtitle or Executive Summary",
    "sections": [
      {
        "heading": "Section Heading",
        "paragraphs": [
          "Paragraph 1 text containing detailed explanations...",
          "Paragraph 2 text..."
        ]
      }
    ]
  }
  Example structure:
  <artifact type="word" id="marketing-strategy" title="Marketing Strategy Plan">
  {
    "title": "Global Marketing Strategy Q3",
    "subtitle": "Accelerating developer adoption and scaling organic growth",
    "sections": [
      {
        "heading": "1. Executive Summary",
        "paragraphs": [
          "Our Q3 initiative centers around a multi-channel acquisition campaign targeting cloud engineers and developers. By focusing on high-fidelity visual assets, we aim to lift user sign-ups by 25%.",
          "Key themes include simplicity, power, and developer experience."
        ]
      }
    ]
  }
  </artifact>

- TYPE "ppt":
  Must contain a single JSON object describing a PowerPoint slide deck. Do NOT wrap this JSON in markdown code blocks. Just write the JSON.
  JSON Schema:
  {
    "theme": { "bg": "hex_color", "text": "hex_color", "accent": "hex_color" },
    "slides": [
      {
        "title": "Slide Title",
        "bullets": [
          "Bullet point 1",
          "Bullet point 2"
        ]
      }
    ]
  }
  Example structure:
  <artifact type="ppt" id="pitch-deck" title="Startup Pitch Deck">
  {
    "theme": { "bg": "#0f172a", "text": "#ffffff", "accent": "#38bdf8" },
    "slides": [
      {
        "title": "The Problem",
        "bullets": [
          "Document generation is manual, sluggish, and boring.",
          "Visual models lack real-time document output integrations.",
          "Users cannot edit slides or spreadsheets interactively."
        ]
      },
      {
        "title": "Our Solution",
        "bullets": [
          "Claude Artifact Studio lets users generate real PowerPoint, Word, and Excel files.",
          "Provides a rich, interactive, edit-in-place playground.",
          "One-click binary exports directly to the client."
        ]
      }
    ]
  }
  </artifact>

- TYPE "excel":
  Must contain a single JSON object describing an Excel spreadsheet. Do NOT wrap this JSON in markdown code blocks. Just write the JSON.
  JSON Schema:
  {
    "sheets": [
      {
        "name": "Sheet Name",
        "headers": ["Column 1", "Column 2"],
        "rows": [
          ["Row 1 Cell 1", "Row 1 Cell 2"],
          ["Row 2 Cell 1", "Row 2 Cell 2"]
        ]
      }
    ]
  }
  Example structure:
  <artifact type="excel" id="sales-forecast" title="Q3 Sales Forecast">
  {
    "sheets": [
      {
        "name": "Sales Forecast",
        "headers": ["Region", "Q1 Sales", "Q2 Sales", "Forecasted Growth"],
        "rows": [
          ["North America", "$120,000", "$145,000", "20.8%"],
          ["Europe", "$95,000", "$102,000", "7.3%"],
          ["Asia Pacific", "$80,000", "$94,000", "17.5%"]
        ]
      }
    ]
  }
  </artifact>

Always write engaging and descriptive messages in the chat explaining what you are creating. Then output the <artifact> tag.
You can update existing artifacts by outputting an artifact with the SAME id but updated content.
Avoid any markdown formatting around the JSON inside the word, ppt, and excel artifacts; output only raw JSON inside the XML tags so it is perfectly parseable.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId, model = "gemini-3.5-flash" } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Persist user's message in local DB if conversationId is provided
    if (conversationId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        db.saveMessage(conversationId, {
          id: lastMsg.id || `user-${Date.now()}`,
          role: "user",
          content: lastMsg.content,
        });
      }
    }

    // Check if the selected model is a managed agent
    const agentModels = [
      "antigravity-preview-05-2026",
      "deep-research-preview-04-2026",
      "deep-research-max-preview-04-2026",
    ];
    const isAgent = agentModels.includes(model);

    if (isAgent) {
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const finalProtocol =
        host.includes("localhost") || host.includes("127.0.0.1") ? protocol : "https";
      const baseUrl = `${finalProtocol}://${host}`;
      const webhookUri = `${baseUrl}/api/webhooks/gemini`;

      const lastMsg = messages[messages.length - 1];
      const userPrompt = lastMsg?.content || "";

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Create a background interaction using the remote environment
      const initialInteraction = await ai.interactions.create({
        agent: model,
        input: userPrompt,
        environment: "remote",
        background: true,
        config: {
          webhookConfig: {
            uris: [webhookUri],
          },
        },
      });

      // Create a remote agent job in our local DB
      const job = db.createJob(
        conversationId,
        "default-user",
        model,
        initialInteraction.id,
        userPrompt.substring(0, 120)
      );

      // Create initial assistant message and link message ID to the job
      const assistantMessageId = `assistant-${Date.now()}`;
      const initialAssistantContent = `⚙️ [agent_job_started: ${job.id}] Remote background agent task initiated. Please wait while the ${
        model === "antigravity-preview-05-2026" ? "Antigravity" : "Deep Research"
      } agent executes the task...`;

      db.updateJob(job.id, { messageId: assistantMessageId });
      db.saveMessage(conversationId, {
        id: assistantMessageId,
        role: "assistant",
        content: initialAssistantContent,
      });

      // Stream the response back so the UI gets it instantly
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(initialAssistantContent));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Structure history for Gemini API
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Choose the actual active model (fallback to gemini-3.5-flash)
    const activeModel = model === "gemini-3.5-pro" ? "gemini-3.5-pro" : "gemini-3.5-flash";

    const responseStream = await ai.models.generateContentStream({
      model: activeModel,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedText = "";
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              accumulatedText += chunk.text;
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }

          // Persist generated response in local DB upon complete generation
          if (conversationId && accumulatedText) {
            db.saveMessage(conversationId, {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: accumulatedText,
            });
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("API Chat Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
