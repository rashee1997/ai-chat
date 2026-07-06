import { Artifact } from "./types";

export interface ParsedMessage {
  conversationalText: string;
  artifact: Artifact | null;
}

export function parseMessageContent(text: string): ParsedMessage {
  const artifactStartRegex = /<artifact\s+type="([^"]+)"\s+id="([^"]+)"\s+title="([^"]+)">/;
  const startMatch = text.match(artifactStartRegex);

  if (!startMatch) {
    return {
      conversationalText: text,
      artifact: null,
    };
  }

  const type = startMatch[1] as "html" | "word" | "ppt" | "excel" | "svg" | "mermaid";
  const id = startMatch[2];
  const title = startMatch[3];
  
  const startIndex = startMatch.index!;
  const fullStartTag = startMatch[0];
  const contentStartIndex = startIndex + fullStartTag.length;

  const endTag = "</artifact>";
  const endIndex = text.indexOf(endTag, contentStartIndex);

  let content = "";
  let isComplete = false;
  let conversationalText = text.substring(0, startIndex);

  if (endIndex !== -1) {
    content = text.substring(contentStartIndex, endIndex);
    isComplete = true;
    conversationalText += text.substring(endIndex + endTag.length);
  } else {
    content = text.substring(contentStartIndex);
    isComplete = false;
  }

  return {
    conversationalText: conversationalText.trim(),
    artifact: {
      id,
      type,
      title,
      content,
      isComplete,
    },
  };
}

export type BackgroundJobStatus =
  | { kind: "running"; status: string }
  | { kind: "requires_action"; actionType: string; description: string }
  | { kind: "failed"; error: string };

// Detects the plain-text status conventions app/page.tsx writes into
// message.content while a remote background agent job is in flight (see
// trackBackgroundJob), so the UI can render a dedicated calm status card
// instead of falling through to the generic markdown bubble.
export function parseBackgroundJobStatus(text: string): BackgroundJobStatus | null {
  const trimmed = text.trim();

  const runningMatch = trimmed.match(
    /^⚙️ \[Background Agent: ([^\]]+)\] Running remote operations\.\.\. please stand by\.$/
  );
  if (runningMatch) {
    return { kind: "running", status: runningMatch[1] };
  }

  if (trimmed.startsWith("⚙️ **Action Required**")) {
    const typeMatch = trimmed.match(/Type:\s*`([^`]*)`/);
    const descMatch = trimmed.match(/Description:\s*`([^`]*)`/);
    return {
      kind: "requires_action",
      actionType: typeMatch?.[1] || "collaborative_research_checkpoint",
      description: descMatch?.[1] || "Awaiting confirmation.",
    };
  }

  const failedMatch = trimmed.match(/^⚠️ Background task failed:\s*([\s\S]+)$/);
  if (failedMatch) {
    return { kind: "failed", error: failedMatch[1] };
  }

  return null;
}
